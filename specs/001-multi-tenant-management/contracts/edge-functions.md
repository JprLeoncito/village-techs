# Edge Function API Contracts

## Overview

This document defines the custom Edge Function endpoints for the Platform Dashboard. All endpoints are prefixed with: `https://{project-ref}.supabase.co/functions/v1/`

**Authentication**: All requests require `Authorization: Bearer {jwt_token}` header with superadmin role.

**Base Headers**:
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

---

## CSV Import Processing

### Process CSV Import
```http
POST /process-csv-import
```

**Purpose**: Processes CSV file uploads for bulk residence creation with real-time progress updates via Server-Sent Events (SSE).

**Headers**:
```
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data
Accept: text/event-stream
```

**Request Body** (multipart/form-data):
```
file: residences.csv (max 10MB)
tenant_id: uuid
```

**CSV Format**:
```csv
unit_number,type,square_footage,bedrooms,bathrooms,owner_name,owner_email,owner_phone
A-101,apartment,1200,2,2,John Doe,john@example.com,+1-555-0100
A-102,apartment,1400,3,2,Jane Smith,jane@example.com,+1-555-0200
```

**Response** (200 - SSE Stream):
```
event: progress
data: {"processed": 10, "total": 100, "percentage": 10, "status": "processing"}

event: progress
data: {"processed": 50, "total": 100, "percentage": 50, "status": "processing"}

event: error
data: {"row": 25, "error": "Duplicate unit number: A-125", "unit_number": "A-125"}

event: complete
data: {"total": 100, "successful": 98, "failed": 2, "errors": [{"row": 25, "error": "Duplicate unit number"}]}
```

**Error Response** (400):
```json
{
  "error": "Invalid file format",
  "message": "CSV file must contain required columns: unit_number, type, owner_name"
}
```

**Error Response** (413):
```json
{
  "error": "File too large",
  "message": "CSV file must be less than 10MB"
}
```

**Implementation Notes**:
- Validates CSV headers against required columns
- Validates each row against residence schema (using Zod)
- Uses batch inserts (100 rows at a time)
- Sends progress updates every 10 rows processed
- Handles duplicate unit_number conflicts gracefully
- Returns detailed error report for failed rows

---

## Admin Credentials Management

### Send Admin Credentials
```http
POST /send-admin-credentials
```

**Purpose**: Creates auth user account, assigns admin role, and sends credentials email.

**Request Body**:
```json
{
  "tenant_id": "uuid",
  "email": "admin@example.com",
  "first_name": "Jane",
  "last_name": "Smith",
  "phone_number": "+1-555-0200",
  "role": "community_admin"
}
```

**Response** (200):
```json
{
  "success": true,
  "user_id": "uuid",
  "admin_user_id": "uuid",
  "email_sent": true,
  "temporary_password": "Abc123!@#Xyz"
}
```

**Error Response** (409):
```json
{
  "error": "User already exists",
  "message": "Email admin@example.com is already registered"
}
```

**Error Response** (500):
```json
{
  "error": "Email delivery failed",
  "message": "SMTP connection timeout. User created but email not sent.",
  "user_id": "uuid",
  "temporary_password": "Abc123!@#Xyz"
}
```

**Implementation Notes**:
- Generates secure random password (12 chars, uppercase, lowercase, numbers, symbols)
- Creates auth.users record via Supabase Auth Admin API
- Inserts admin_users record with tenant_id
- Sends email via Resend or SendGrid with login instructions
- Email template includes: login URL, temporary password, password reset link
- Marks password as expired to force reset on first login

**Email Template**:
```
Subject: Your Sunset Hills HOA Admin Account

Hi Jane,

Your administrator account has been created for Sunset Hills HOA.

Login URL: https://platform.villagetech.com/login
Email: admin@example.com
Temporary Password: Abc123!@#Xyz

Please log in and reset your password immediately.

Questions? Reply to this email or contact support@villagetech.com.
```

---

## Report Generation

### Generate Platform Report
```http
POST /generate-platform-report
```

**Purpose**: Generates analytics reports in PDF, Excel, or CSV format for superadmin.

**Request Body**:
```json
{
  "report_type": "community_summary",
  "format": "pdf",
  "filters": {
    "status": "active",
    "state": "CA",
    "date_range": {
      "start": "2025-01-01",
      "end": "2025-01-31"
    }
  },
  "include_charts": true
}
```

**Report Types**:
- `community_summary` - Overview of all communities
- `residence_inventory` - Detailed residence listings
- `admin_activity` - Admin user actions and audit log
- `subscription_revenue` - Billing and revenue analysis

**Response** (200):
```json
{
  "success": true,
  "report_id": "uuid",
  "format": "pdf",
  "file_url": "https://{project-ref}.supabase.co/storage/v1/object/public/reports/report-uuid.pdf",
  "file_size_bytes": 245678,
  "generated_at": "2025-01-15T10:30:00Z",
  "expires_at": "2025-01-16T10:30:00Z"
}
```

**Error Response** (400):
```json
{
  "error": "Invalid report type",
  "message": "report_type must be one of: community_summary, residence_inventory, admin_activity, subscription_revenue"
}
```

**Implementation Notes**:
- PDF generation via jsPDF (client-side) or Puppeteer (server-side if charts needed)
- Excel generation via exceljs
- CSV generation via pg COPY or csv-stringify
- Files stored in Supabase Storage bucket `reports/` with 24-hour expiration
- Charts rendered using Chart.js or D3.js (if include_charts=true)
- Async processing for large reports (>1000 rows), returns job_id for polling

**PDF Report Structure**:
1. Header: Logo, title, date range, generated timestamp
2. Executive Summary: Key metrics (total communities, active/suspended, revenue)
3. Data Tables: Paginated tables with filters applied
4. Charts: Bar charts (communities by state), line charts (growth trends)
5. Footer: Page numbers, report ID

---

## Coordinate Validation

### Validate Coordinates
```http
POST /validate-coordinates
```

**Purpose**: Validates GPS coordinates are within reasonable bounds and not in invalid locations (ocean, Antarctica, etc.).

**Request Body**:
```json
{
  "latitude": 34.0522,
  "longitude": -118.2437,
  "address": "123 Main St, Los Angeles, CA 90001"
}
```

**Response** (200):
```json
{
  "valid": true,
  "latitude": 34.0522,
  "longitude": -118.2437,
  "geocoded_address": "123 Main St, Los Angeles, CA 90001, USA",
  "confidence": "high",
  "warnings": []
}
```

**Response** (200 - Invalid Coordinates):
```json
{
  "valid": false,
  "latitude": 0.0,
  "longitude": 0.0,
  "error": "Coordinates appear to be in the ocean (Null Island)",
  "suggestions": [
    {
      "address": "123 Main St, Los Angeles, CA 90001, USA",
      "latitude": 34.0522,
      "longitude": -118.2437,
      "confidence": "high"
    }
  ]
}
```

**Error Response** (400):
```json
{
  "error": "Invalid coordinates",
  "message": "Latitude must be between -90 and 90, Longitude must be between -180 and 180"
}
```

**Implementation Notes**:
- Validates latitude range: -90 to 90
- Validates longitude range: -180 to 180
- Checks against known invalid locations:
  - (0, 0) "Null Island" in the ocean
  - Antarctica (latitude < -60)
  - Open ocean using reverse geocoding
- Uses Mapbox Geocoding API for reverse geocoding
- Returns geocoded address for verification
- Suggests corrected coordinates if address provided and coordinates invalid

**Validation Rules**:
```typescript
const isValidCoordinate = (lat: number, lng: number) => {
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  if (lat === 0 && lng === 0) return false; // Null Island
  if (lat < -60) return false; // Antarctica
  return true;
};
```

---

## Rate Limiting

All Edge Functions are rate-limited to prevent abuse:

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/process-csv-import` | 10 requests | 1 hour |
| `/send-admin-credentials` | 50 requests | 1 hour |
| `/generate-platform-report` | 100 requests | 1 hour |
| `/validate-coordinates` | 500 requests | 1 hour |

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
- `403` - Forbidden (insufficient permissions)
- `409` - Conflict (duplicate resource)
- `413` - Payload Too Large (file size exceeded)
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error

---

## Testing Endpoints

Example using curl:

```bash
# CSV Import with SSE
curl -N -H "Authorization: Bearer $JWT_TOKEN" \
  -F "file=@residences.csv" \
  -F "tenant_id=123e4567-e89b-12d3-a456-426614174000" \
  https://project-ref.supabase.co/functions/v1/process-csv-import

# Send Admin Credentials
curl -X POST \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "uuid",
    "email": "admin@example.com",
    "first_name": "Jane",
    "last_name": "Smith",
    "role": "community_admin"
  }' \
  https://project-ref.supabase.co/functions/v1/send-admin-credentials

# Generate Report
curl -X POST \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "report_type": "community_summary",
    "format": "pdf",
    "filters": {"status": "active"}
  }' \
  https://project-ref.supabase.co/functions/v1/generate-platform-report

# Validate Coordinates
curl -X POST \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 34.0522,
    "longitude": -118.2437,
    "address": "123 Main St, Los Angeles, CA 90001"
  }' \
  https://project-ref.supabase.co/functions/v1/validate-coordinates
```
