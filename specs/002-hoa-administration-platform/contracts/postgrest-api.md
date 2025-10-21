# PostgREST API Contracts

## Overview

This document defines the auto-generated PostgREST API endpoints for the Admin Dashboard. All endpoints are prefixed with the Supabase project URL: `https://{project-ref}.supabase.co/rest/v1/`

**Authentication**: All requests require `Authorization: Bearer {jwt_token}` header with admin_head or admin_officer role.

**Headers**:
```
Authorization: Bearer {jwt_token}
apikey: {anon_key}
Content-Type: application/json
Prefer: return=representation
```

---

## Households

### List Households
```http
GET /households?select=*,residence(*),household_head:household_members!household_head_id(*)&deleted_at=is.null
```

**Query Parameters**:
- `status=eq.active` - Filter by status
- `residence_id=eq.{uuid}` - Filter by residence
- `order=created_at.desc` - Sort order
- `limit=50&offset=0` - Pagination

**Response** (200):
```json
[
  {
    "id": "uuid",
    "tenant_id": "uuid",
    "residence_id": "uuid",
    "household_head_id": "uuid",
    "move_in_date": "2025-01-15",
    "move_out_date": null,
    "status": "active",
    "contact_email": "john@example.com",
    "contact_phone": "+1-555-0100",
    "notes": "",
    "created_at": "2025-01-15T10:00:00Z",
    "updated_at": "2025-01-15T10:00:00Z",
    "residence": {
      "id": "uuid",
      "unit_number": "A-101",
      "type": "apartment"
    },
    "household_head": {
      "id": "uuid",
      "first_name": "John",
      "last_name": "Doe"
    }
  }
]
```

### Get Household with Members
```http
GET /households?id=eq.{household_id}&select=*,members:household_members(*),residence(*)
```

### Create Household
```http
POST /households
```

**Request Body**:
```json
{
  "residence_id": "uuid",
  "move_in_date": "2025-01-15",
  "contact_email": "john@example.com",
  "contact_phone": "+1-555-0100",
  "status": "active"
}
```

**Response** (201): Created household object

### Update Household
```http
PATCH /households?id=eq.{household_id}
```

**Request Body** (set move-out date - admin_head only):
```json
{
  "move_out_date": "2025-06-30",
  "status": "moved_out",
  "updated_at": "2025-01-15T10:00:00Z"
}
```

### Soft Delete Household
```http
PATCH /households?id=eq.{household_id}
```

**Request Body** (admin_head only):
```json
{
  "deleted_at": "2025-01-15T10:00:00Z"
}
```

---

## Household Members

### List Members by Household
```http
GET /household_members?household_id=eq.{household_id}&select=*
```

**Response** (200):
```json
[
  {
    "id": "uuid",
    "tenant_id": "uuid",
    "household_id": "uuid",
    "user_id": null,
    "first_name": "John",
    "last_name": "Doe",
    "relationship_to_head": "self",
    "date_of_birth": "1985-03-15",
    "contact_email": "john@example.com",
    "contact_phone": "+1-555-0100",
    "member_type": "resident",
    "photo_url": "photos/tenant-id/members/member-id.jpg",
    "status": "active",
    "created_at": "2025-01-15T10:00:00Z",
    "updated_at": "2025-01-15T10:00:00Z"
  }
]
```

### Create Member
```http
POST /household_members
```

**Request Body**:
```json
{
  "household_id": "uuid",
  "first_name": "Jane",
  "last_name": "Doe",
  "relationship_to_head": "spouse",
  "date_of_birth": "1987-08-22",
  "contact_email": "jane@example.com",
  "contact_phone": "+1-555-0101",
  "member_type": "resident",
  "status": "active"
}
```

### Upload Member Photo

Use Supabase Storage upload (not PostgREST):

```typescript
const { data, error } = await supabase.storage
  .from('photos')
  .upload(`${tenantId}/members/${memberId}.jpg`, file, {
    contentType: 'image/jpeg',
    upsert: true
  })

// Then update member record
await supabase
  .from('household_members')
  .update({ photo_url: data.path })
  .eq('id', memberId)
```

### Link Member to User Account
```http
PATCH /household_members?id=eq.{member_id}
```

**Request Body** (admin_head only):
```json
{
  "user_id": "uuid"
}
```

---

## Vehicle Stickers

### List Sticker Requests (Queue)
```http
GET /vehicle_stickers?select=*,household(*,residence(*)),member:household_members!member_id(*)&deleted_at=is.null&order=created_at.asc
```

**Filter by Status**:
```http
GET /vehicle_stickers?status=eq.requested&deleted_at=is.null
GET /vehicle_stickers?status=in.(requested,approved)&deleted_at=is.null
```

**Response** (200):
```json
[
  {
    "id": "uuid",
    "tenant_id": "uuid",
    "household_id": "uuid",
    "member_id": "uuid",
    "vehicle_plate": "ABC-1234",
    "vehicle_make": "Toyota",
    "vehicle_model": "Camry",
    "vehicle_color": "Silver",
    "rfid_code": "RFID-12345",
    "or_cr_document_url": "documents/tenant-id/or_cr/sticker-id.pdf",
    "status": "requested",
    "expiry_date": null,
    "created_at": "2025-01-15T10:00:00Z",
    "household": {
      "id": "uuid",
      "residence": {
        "unit_number": "A-101"
      }
    },
    "member": {
      "first_name": "John",
      "last_name": "Doe"
    }
  }
]
```

### Approve Sticker (Single)
```http
PATCH /vehicle_stickers?id=eq.{sticker_id}
```

**Request Body**:
```json
{
  "status": "approved",
  "expiry_date": "2026-01-15",
  "approved_by": "current_user_id",
  "approved_at": "2025-01-15T10:00:00Z"
}
```

### Bulk Approve Stickers

Use RPC function instead:

```http
POST /rpc/approve_sticker_bulk
```

**Request Body**:
```json
{
  "p_sticker_ids": ["uuid1", "uuid2", "uuid3"],
  "p_expiry_date": "2026-01-15"
}
```

**Response** (200):
```json
{
  "success": true,
  "approved_count": 3
}
```

### Reject Sticker
```http
PATCH /vehicle_stickers?id=eq.{sticker_id}
```

**Request Body**:
```json
{
  "status": "rejected",
  "rejection_reason": "Invalid OR/CR document"
}
```

### Revoke Sticker

Use RPC function (admin_head only):

```http
POST /rpc/revoke_sticker
```

**Request Body**:
```json
{
  "p_sticker_id": "uuid",
  "p_reason": "Vehicle sold"
}
```

### Get Expiring Stickers
```http
GET /vehicle_stickers?status=eq.expiring&deleted_at=is.null&order=expiry_date.asc
```

---

## Construction Permits

### List Permits
```http
GET /construction_permits?select=*,household(*,residence(*))&deleted_at=is.null&order=created_at.desc
```

**Filter by Status**:
```http
GET /construction_permits?status=eq.pending&deleted_at=is.null
GET /construction_permits?status=in.(approved,in_progress)&deleted_at=is.null
```

**Response** (200):
```json
[
  {
    "id": "uuid",
    "tenant_id": "uuid",
    "household_id": "uuid",
    "project_description": "Kitchen renovation",
    "project_start_date": "2025-02-01",
    "project_end_date": "2025-03-15",
    "contractor_name": "ABC Construction",
    "contractor_contact": "+1-555-0200",
    "contractor_license": "LIC-12345",
    "estimated_worker_count": 5,
    "road_fee_amount": 500.00,
    "road_fee_paid": false,
    "status": "pending",
    "created_at": "2025-01-15T10:00:00Z",
    "household": {
      "residence": {
        "unit_number": "A-101"
      }
    }
  }
]
```

### Approve Permit (admin_head only)
```http
PATCH /construction_permits?id=eq.{permit_id}
```

**Request Body**:
```json
{
  "status": "approved",
  "road_fee_amount": 500.00,
  "approved_by": "current_user_id",
  "approved_at": "2025-01-15T10:00:00Z"
}
```

### Reject Permit (admin_head only)
```http
PATCH /construction_permits?id=eq.{permit_id}
```

**Request Body**:
```json
{
  "status": "rejected",
  "rejection_reason": "Incomplete contractor documentation"
}
```

### Mark Permit In Progress
```http
PATCH /construction_permits?id=eq.{permit_id}
```

**Request Body**:
```json
{
  "status": "in_progress"
}
```

### Mark Permit Completed (admin_head only)
```http
PATCH /construction_permits?id=eq.{permit_id}
```

**Request Body**:
```json
{
  "status": "completed"
}
```

---

## Association Fees

### List Fees
```http
GET /association_fees?select=*,household(*,residence(*))&order=due_date.desc
```

**Filter by Status**:
```http
GET /association_fees?payment_status=eq.unpaid
GET /association_fees?payment_status=eq.overdue&order=due_date.asc
```

**Filter by Household**:
```http
GET /association_fees?household_id=eq.{household_id}&order=due_date.desc
```

**Response** (200):
```json
[
  {
    "id": "uuid",
    "tenant_id": "uuid",
    "household_id": "uuid",
    "fee_type": "monthly",
    "amount": 250.00,
    "due_date": "2025-01-31",
    "payment_status": "unpaid",
    "paid_amount": 0.00,
    "payment_date": null,
    "payment_method": null,
    "receipt_url": null,
    "created_at": "2025-01-01T08:00:00Z",
    "household": {
      "residence": {
        "unit_number": "A-101"
      }
    }
  }
]
```

### Create Fee (admin_head only)
```http
POST /association_fees
```

**Request Body**:
```json
{
  "household_id": "uuid",
  "fee_type": "monthly",
  "amount": 250.00,
  "due_date": "2025-01-31"
}
```

### Record Payment

Use RPC function:

```http
POST /rpc/record_fee_payment
```

**Request Body**:
```json
{
  "p_fee_id": "uuid",
  "p_amount": 250.00,
  "p_payment_date": "2025-01-20",
  "p_payment_method": "bank_transfer"
}
```

**Response** (200):
```json
{
  "success": true,
  "new_status": "paid",
  "total_paid": 250.00
}
```

### Waive Fee (admin_head only)
```http
PATCH /association_fees?id=eq.{fee_id}
```

**Request Body**:
```json
{
  "payment_status": "waived",
  "waiver_reason": "Community service contribution",
  "waived_by": "current_user_id",
  "waived_at": "2025-01-20T10:00:00Z"
}
```

### Get Overdue Fees
```http
GET /association_fees?payment_status=eq.overdue&select=*,household(*,residence(*))&order=due_date.asc
```

---

## Announcements

### List Announcements
```http
GET /announcements?select=*,created_by_user:created_by(email)&order=created_at.desc
```

**Filter by Status**:
```http
GET /announcements?status=eq.published&order=publication_date.desc
GET /announcements?status=eq.draft
```

**Response** (200):
```json
[
  {
    "id": "uuid",
    "tenant_id": "uuid",
    "created_by": "uuid",
    "announcement_type": "general",
    "title": "Community Pool Maintenance",
    "content": "The pool will be closed for maintenance...",
    "target_audience": "all",
    "status": "published",
    "publication_date": "2025-01-20T08:00:00Z",
    "expiry_date": "2025-02-20T08:00:00Z",
    "view_count": 150,
    "click_count": 25,
    "attachment_urls": ["documents/tenant-id/announcements/announcement-id/flyer.pdf"],
    "published_at": "2025-01-20T08:00:00Z",
    "created_at": "2025-01-19T15:00:00Z"
  }
]
```

### Create Announcement
```http
POST /announcements
```

**Request Body**:
```json
{
  "announcement_type": "general",
  "title": "Community Pool Maintenance",
  "content": "The pool will be closed...",
  "target_audience": "households",
  "status": "draft"
}
```

### Schedule Announcement
```http
PATCH /announcements?id=eq.{announcement_id}
```

**Request Body**:
```json
{
  "status": "scheduled",
  "publication_date": "2025-01-25T08:00:00Z",
  "expiry_date": "2025-02-25T08:00:00Z"
}
```

### Publish Immediately (admin_head for urgent)
```http
PATCH /announcements?id=eq.{announcement_id}
```

**Request Body**:
```json
{
  "status": "published",
  "published_at": "2025-01-20T10:00:00Z"
}
```

### Increment Analytics

Handled by Edge Function middleware or realtime triggers.

---

## Gate Entries (Read-Only)

### List Recent Entries
```http
GET /gate_entries?select=*,gate(*),household(*,residence(*))&order=entry_timestamp.desc&limit=100
```

**Filter by Date Range**:
```http
GET /gate_entries?entry_timestamp=gte.2025-01-01T00:00:00Z&entry_timestamp=lte.2025-01-31T23:59:59Z&order=entry_timestamp.desc
```

**Filter by Gate**:
```http
GET /gate_entries?gate_id=eq.{gate_id}&order=entry_timestamp.desc
```

**Response** (200):
```json
[
  {
    "id": "uuid",
    "tenant_id": "uuid",
    "gate_id": "uuid",
    "entry_timestamp": "2025-01-20T14:30:00Z",
    "entry_type": "vehicle",
    "vehicle_plate": "ABC-1234",
    "sticker_id": "uuid",
    "household_id": "uuid",
    "security_officer_id": "uuid",
    "notes": "",
    "gate": {
      "gate_name": "North Entrance"
    },
    "household": {
      "residence": {
        "unit_number": "A-101"
      }
    }
  }
]
```

### Realtime Subscription (Gate Monitoring)

```typescript
const subscription = supabase
  .channel('gate-monitoring')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'gate_entries',
    filter: `tenant_id=eq.${tenantId}`
  }, (payload) => {
    console.log('New entry:', payload.new)
  })
  .subscribe()
```

---

## Incident Reports (Read-Only, Update Resolution)

### List Incidents
```http
GET /incident_reports?select=*,reported_by_user:reported_by(email),household(*,residence(*))&order=incident_timestamp.desc
```

**Filter by Status**:
```http
GET /incident_reports?resolution_status=eq.open&order=incident_timestamp.desc
```

**Response** (200):
```json
[
  {
    "id": "uuid",
    "tenant_id": "uuid",
    "reported_by": "uuid",
    "incident_timestamp": "2025-01-20T22:15:00Z",
    "incident_type": "suspicious_activity",
    "location": "North Entrance",
    "gate_id": "uuid",
    "household_id": null,
    "description": "Unidentified individual loitering near gate...",
    "resolution_status": "open",
    "resolution_notes": null,
    "attachment_urls": ["photos/tenant-id/incidents/incident-id/photo1.jpg"],
    "created_at": "2025-01-20T22:20:00Z"
  }
]
```

### Update Resolution
```http
PATCH /incident_reports?id=eq.{incident_id}
```

**Request Body**:
```json
{
  "resolution_status": "resolved",
  "resolution_notes": "Security patrol dispatched, area secured",
  "resolved_by": "current_user_id",
  "resolved_at": "2025-01-20T23:00:00Z"
}
```

---

## Analytics Views

### Household Stats
```http
GET /household_stats?tenant_id=eq.{tenant_id}
```

**Response** (200):
```json
{
  "tenant_id": "uuid",
  "active_households": 450,
  "inactive_households": 10,
  "moved_out_households": 40,
  "total_residences": 500,
  "vacant_residences": 50,
  "occupancy_rate": 90.00
}
```

### Sticker Dashboard
```http
GET /sticker_dashboard?tenant_id=eq.{tenant_id}
```

### Fee Summary
```http
GET /fee_summary?tenant_id=eq.{tenant_id}
```

### Permit Queue
```http
GET /permit_queue?tenant_id=eq.{tenant_id}&status=in.(pending,approved,in_progress)
```

### Gate Activity
```http
GET /gate_activity?tenant_id=eq.{tenant_id}&entry_date=gte.2025-01-01&entry_date=lte.2025-01-31
```

---

## Audit Logs (admin_head only)

### List Audit Logs
```http
GET /audit_logs?select=*,user:user_id(email)&order=created_at.desc&limit=100
```

**Filter by User**:
```http
GET /audit_logs?user_id=eq.{user_id}&order=created_at.desc
```

**Filter by Action**:
```http
GET /audit_logs?action=ilike.%approve%&order=created_at.desc
```

**Response** (200):
```json
[
  {
    "id": "uuid",
    "tenant_id": "uuid",
    "user_id": "uuid",
    "action": "approve_sticker",
    "entity_type": "vehicle_sticker",
    "entity_id": "uuid",
    "changes": {
      "status": "approved",
      "expiry_date": "2026-01-20"
    },
    "ip_address": "192.168.1.100",
    "user_agent": "Mozilla/5.0...",
    "created_at": "2025-01-20T10:00:00Z",
    "user": {
      "email": "admin@example.com"
    }
  }
]
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `PGRST116` | No rows affected (optimistic lock failure, record not found) |
| `23505` | Unique constraint violation (duplicate plate, RFID, etc.) |
| `23503` | Foreign key constraint violation (household doesn't exist) |
| `23514` | Check constraint violation (invalid status transition) |
| `42501` | Insufficient privileges (RLS policy denial) |
| `PGRST301` | Invalid JWT token |

---

## Common Patterns

### Pagination
```http
GET /households?limit=50&offset=0  # Page 1
GET /households?limit=50&offset=50 # Page 2
```

### Filtering
```http
GET /vehicle_stickers?status=in.(requested,approved)&deleted_at=is.null
GET /association_fees?due_date=gte.2025-01-01&due_date=lte.2025-12-31
```

### Sorting
```http
GET /households?order=created_at.desc
GET /association_fees?order=due_date.asc,amount.desc
```

### Counting
```http
GET /households?select=count&status=eq.active
```

### Joins (Foreign Keys)
```http
GET /households?select=*,residence(*),members:household_members(*)
GET /vehicle_stickers?select=*,household(*,residence(*))
```
