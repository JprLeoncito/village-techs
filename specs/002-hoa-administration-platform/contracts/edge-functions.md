# Edge Function API Contracts

## Overview

This document defines custom Edge Function endpoints for the Admin Dashboard. All endpoints are prefixed with: `https://{project-ref}.supabase.co/functions/v1/`

**Authentication**: All requests require `Authorization: Bearer {jwt_token}` header with admin role.

**Base Headers**:
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

---

## Receipt Generation

### Generate Fee Receipt
```http
POST /generate-receipt
```

**Purpose**: Generate PDF receipt for fee payment (using jsPDF as determined in research.md).

**Request Body**:
```json
{
  "fee_id": "uuid",
  "household_id": "uuid"
}
```

**Response** (200):
```json
{
  "success": true,
  "receipt_url": "documents/tenant-id/receipts/receipt-fee-id.pdf",
  "receipt_number": "REC-2025-001234",
  "generated_at": "2025-01-20T10:00:00Z"
}
```

**Error Response** (404):
```json
{
  "error": "Fee not found",
  "message": "Fee record does not exist or is not paid"
}
```

**Implementation Notes**:
- Triggered automatically after `record_fee_payment` RPC function succeeds
- Generates PDF using jsPDF with fee details, household info, payment method
- Uploads PDF to Supabase Storage bucket `documents/{tenant_id}/receipts/`
- Updates `association_fees.receipt_url` with storage path
- Performance target: <2 seconds (SC-003: <30s for payment + receipt)

**Receipt Template**:
```
┌──────────────────────────────────────────┐
│       Village Tech HOA                   │
│       Payment Receipt                    │
├──────────────────────────────────────────┤
│ Receipt #: REC-2025-001234               │
│ Date: January 20, 2025                   │
│                                          │
│ Household: A-101                         │
│ Name: John Doe                           │
│                                          │
│ ┌────────────────────────────────────┐  │
│ │ Fee Type        │ Amount          │  │
│ ├────────────────────────────────────┤  │
│ │ Monthly Fee     │ $250.00         │  │
│ │ Total Paid      │ $250.00         │  │
│ └────────────────────────────────────┘  │
│                                          │
│ Payment Method: Bank Transfer            │
│ Payment Date: January 20, 2025           │
│ Processed by: Admin Name                 │
│                                          │
│ Thank you for your payment!              │
└──────────────────────────────────────────┘
```

---

## CSV Export

### Export Data to CSV
```http
POST /export-csv
```

**Purpose**: Export data to CSV for reports (streaming for large datasets as determined in research.md).

**Request Body**:
```json
{
  "table": "households",
  "columns": ["unit_number", "status", "move_in_date", "household_head_name"],
  "filters": {
    "status": "active"
  },
  "date_range": {
    "start": "2025-01-01",
    "end": "2025-01-31"
  }
}
```

**Supported Tables**:
- `households` - Household listings
- `vehicle_stickers` - Sticker records
- `association_fees` - Fee history
- `construction_permits` - Permit records
- `gate_entries` - Access logs (streaming required for >1000 rows)

**Response** (200):
```
Content-Type: text/csv
Content-Disposition: attachment; filename="households_export_20250120.csv"

unit_number,status,move_in_date,household_head_name
A-101,active,2024-05-15,John Doe
A-102,active,2024-06-20,Jane Smith
...
```

**Error Response** (400):
```json
{
  "error": "Invalid table",
  "message": "Table 'invalid_table' is not supported for export"
}
```

**Implementation Notes**:
- Uses client-side CSV generation for <1000 rows (papaparse)
- Uses Edge Function streaming for >1000 rows (batched queries)
- Applies RLS policies automatically (tenant_id filtering)
- Performance target: <10 seconds for 10,000 records
- Rate limit: 100 exports per hour per tenant

**Streaming Implementation** (for large datasets):

```typescript
// Edge Function
serve(async (req) => {
  const { table, columns, filters, dateRange } = await req.json()
  const tenantId = user.user_metadata.tenant_id

  const stream = new ReadableStream({
    async start(controller) {
      // Send CSV header
      controller.enqueue(`${columns.join(',')}\n`)

      let offset = 0
      const batchSize = 1000

      while (true) {
        const { data } = await supabase
          .from(table)
          .select(columns.join(','))
          .eq('tenant_id', tenantId)
          .range(offset, offset + batchSize - 1)

        if (!data || data.length === 0) break

        const csvRows = data.map(row =>
          columns.map(col => row[col]).join(',')
        ).join('\n') + '\n'

        controller.enqueue(csvRows)

        if (data.length < batchSize) break
        offset += batchSize
      }

      controller.close()
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${table}_export_${Date.now()}.csv"`
    }
  })
})
```

---

## Reminder Notifications

### Send Fee Reminder
```http
POST /send-reminder
```

**Purpose**: Send payment reminders via email/notification for overdue fees or expiring stickers.

**Request Body**:
```json
{
  "reminder_type": "fee_reminder",
  "household_ids": ["uuid1", "uuid2"],
  "message_template": "overdue_fee"
}
```

**Reminder Types**:
- `fee_reminder` - Overdue or upcoming fee payment
- `sticker_expiry` - Sticker expiring within 30 days

**Message Templates**:
- `overdue_fee` - Immediate payment required
- `upcoming_fee` - Fee due within 7 days
- `sticker_expiry_30` - Sticker expires in 30 days
- `sticker_expiry_7` - Sticker expires in 7 days

**Response** (200):
```json
{
  "success": true,
  "sent_count": 25,
  "failed_count": 0,
  "households_notified": ["uuid1", "uuid2"]
}
```

**Error Response** (500):
```json
{
  "error": "Email delivery failed",
  "message": "SMTP connection timeout",
  "details": {
    "sent": 20,
    "failed": 5,
    "failed_households": ["uuid3", "uuid4"]
  }
}
```

**Implementation Notes**:
- Sends emails via Resend or SendGrid
- Sends in-app notifications via Supabase Realtime broadcast
- Triggered manually by admin or automatically via pg_cron jobs
- Rate limit: 500 emails per hour per tenant
- Email template includes household name, fee/sticker details, payment link

**Email Template** (Fee Reminder):
```
Subject: Payment Reminder - HOA Fee Due

Dear [Household Head],

This is a reminder that your HOA fee is overdue:

Fee Type: Monthly Association Fee
Amount Due: $250.00
Original Due Date: January 31, 2025
Days Overdue: 5

Please submit payment at your earliest convenience to avoid late fees.

To make a payment, contact your community admin or use the resident portal.

Questions? Contact: admin@community.com

Thank you,
[Community Name] HOA
```

**Scheduled Triggers** (via pg_cron):
```sql
-- Daily at 9 AM: Send reminders for fees overdue >7 days
SELECT cron.schedule(
  'daily-overdue-fee-reminders',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project.supabase.co/functions/v1/send-reminder',
    body := jsonb_build_object(
      'reminder_type', 'fee_reminder',
      'message_template', 'overdue_fee'
    )
  );
  $$
);

-- Weekly on Monday: Send sticker expiry reminders
SELECT cron.schedule(
  'weekly-sticker-expiry-reminders',
  '0 9 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://project.supabase.co/functions/v1/send-reminder',
    body := jsonb_build_object(
      'reminder_type', 'sticker_expiry',
      'message_template', 'sticker_expiry_30'
    )
  );
  $$
);
```

---

## Announcement Processing

### Process Announcement Publication
```http
POST /process-announcement
```

**Purpose**: Publish announcement with target audience filtering and notification delivery.

**Request Body**:
```json
{
  "announcement_id": "uuid"
}
```

**Response** (200):
```json
{
  "success": true,
  "announcement_id": "uuid",
  "target_audience": "households",
  "recipients_count": 450,
  "notifications_sent": 450,
  "published_at": "2025-01-20T08:00:00Z"
}
```

**Error Response** (400):
```json
{
  "error": "Announcement not ready",
  "message": "Announcement status must be 'scheduled' or 'draft' to publish"
}
```

**Implementation Notes**:
- Triggered automatically via pg_cron when `publication_date <= NOW()`
- Can be triggered manually for immediate publication (admin_head only for urgent)
- Filters recipients based on `target_audience` field
- Sends in-app notifications via Supabase Realtime broadcast
- Sends email notifications to household contacts
- Updates `announcements.status` to `published` and sets `published_at`

**Recipient Filtering Logic**:
```typescript
async function getRecipients(announcementId: string, targetAudience: string) {
  const supabase = createClient(...)

  switch (targetAudience) {
    case 'all':
      // All users in tenant (households, security, admins)
      return await supabase
        .from('auth.users')
        .select('id, email')
        .eq('user_metadata->>tenant_id', tenantId)

    case 'households':
      // Only household members
      return await supabase
        .from('household_members')
        .select('user_id, contact_email')
        .eq('tenant_id', tenantId)
        .not('user_id', 'is', null)

    case 'security':
      // Security officers only
      return await supabase
        .from('auth.users')
        .select('id, email')
        .eq('user_metadata->>tenant_id', tenantId)
        .in('user_metadata->>role', ['security_head', 'security_officer'])

    case 'admins':
      // Admin users only
      return await supabase
        .from('auth.users')
        .select('id, email')
        .eq('user_metadata->>tenant_id', tenantId)
        .in('user_metadata->>role', ['admin_head', 'admin_officer'])

    default:
      throw new Error('Invalid target audience')
  }
}
```

**Realtime Broadcast** (for in-app notifications):
```typescript
// Send broadcast to target audience
await supabase
  .channel(`announcements-${tenantId}`)
  .send({
    type: 'broadcast',
    event: 'new_announcement',
    payload: {
      announcement_id: announcementId,
      title: announcement.title,
      type: announcement.announcement_type,
      urgent: announcement.announcement_type === 'urgent'
    }
  })
```

**Scheduled Trigger** (via pg_cron):
```sql
-- Every hour: Publish scheduled announcements
SELECT cron.schedule(
  'hourly-announcement-publish',
  '0 * * * *',
  $$
  WITH scheduled_announcements AS (
    SELECT id FROM announcements
    WHERE status = 'scheduled'
      AND publication_date <= NOW()
  )
  SELECT net.http_post(
    url := 'https://project.supabase.co/functions/v1/process-announcement',
    body := jsonb_build_object('announcement_id', id)
  )
  FROM scheduled_announcements;
  $$
);
```

---

## Analytics Report Generation

### Generate Analytics Report
```http
POST /generate-analytics-report
```

**Purpose**: Generate comprehensive PDF or Excel report for analytics dashboard (admin_head only).

**Request Body**:
```json
{
  "report_type": "monthly_summary",
  "format": "pdf",
  "date_range": {
    "start": "2025-01-01",
    "end": "2025-01-31"
  },
  "include_charts": true
}
```

**Report Types**:
- `monthly_summary` - Overview of all metrics (households, stickers, fees, permits, gates)
- `household_occupancy` - Detailed household and occupancy analysis
- `financial_summary` - Fee collection and revenue metrics
- `security_activity` - Gate entries and incident reports
- `permit_activity` - Construction permits and road fee collection

**Formats**:
- `pdf` - PDF document with charts
- `excel` - Excel workbook with multiple sheets
- `csv` - CSV files (one per metric, zipped)

**Response** (200):
```json
{
  "success": true,
  "report_id": "uuid",
  "format": "pdf",
  "file_url": "documents/tenant-id/reports/monthly_summary_2025-01.pdf",
  "file_size_bytes": 1245678,
  "generated_at": "2025-02-01T09:00:00Z",
  "expires_at": "2025-02-08T09:00:00Z"
}
```

**Error Response** (403):
```json
{
  "error": "Permission denied",
  "message": "Only admin_head can generate analytics reports"
}
```

**Implementation Notes**:
- PDF generation uses pdf-lib or Puppeteer (for complex charts)
- Excel generation uses exceljs
- Files stored in Supabase Storage with 7-day expiration
- Async processing for large reports (returns job_id for polling)
- Performance target: <15 seconds for PDF, <30 seconds for Excel
- Rate limit: 10 reports per day per tenant (admin_head only)

**Report Structure** (Monthly Summary PDF):
1. **Cover Page**: Community name, report period, generated date
2. **Executive Summary**: Key metrics (occupancy rate, collection rate, active permits)
3. **Household Metrics**: Active/inactive/moved-out counts, occupancy trends
4. **Sticker Analytics**: Approval rates, expiring count, status distribution (pie chart)
5. **Financial Summary**: Total billed, collected, outstanding, collection rate (bar chart)
6. **Permit Activity**: Pending/approved/completed counts, road fee collection
7. **Security Activity**: Gate entry volume by time (line chart), incident count
8. **Footer**: Page numbers, report ID

---

## Rate Limiting

All Edge Functions are rate-limited to prevent abuse:

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/generate-receipt` | 500 requests | 1 hour |
| `/export-csv` | 100 requests | 1 hour |
| `/send-reminder` | 500 emails | 1 hour |
| `/process-announcement` | 50 requests | 1 hour |
| `/generate-analytics-report` | 10 requests | 1 day |

**Rate Limit Response** (429):
```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again in 45 minutes.",
  "retry_after": 2700
}
```

---

## Error Handling

All Edge Functions follow consistent error response format:

```json
{
  "error": "error_code",
  "message": "Human-readable error description",
  "details": {
    "field": "validation error for specific field"
  }
}
```

**Common HTTP Status Codes**:
- `200` - Success
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid JWT)
- `403` - Forbidden (insufficient permissions, e.g., admin_officer trying admin_head action)
- `404` - Not Found (resource doesn't exist)
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error

---

## Testing Endpoints

Example using curl:

```bash
# Generate Receipt
curl -X POST \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fee_id": "uuid", "household_id": "uuid"}' \
  https://project-ref.supabase.co/functions/v1/generate-receipt

# Export CSV
curl -X POST \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"table": "households", "columns": ["unit_number", "status"]}' \
  https://project-ref.supabase.co/functions/v1/export-csv

# Send Reminder
curl -X POST \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reminder_type": "fee_reminder", "message_template": "overdue_fee"}' \
  https://project-ref.supabase.co/functions/v1/send-reminder

# Process Announcement
curl -X POST \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"announcement_id": "uuid"}' \
  https://project-ref.supabase.co/functions/v1/process-announcement

# Generate Analytics Report
curl -X POST \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "report_type": "monthly_summary",
    "format": "pdf",
    "date_range": {"start": "2025-01-01", "end": "2025-01-31"}
  }' \
  https://project-ref.supabase.co/functions/v1/generate-analytics-report
```
