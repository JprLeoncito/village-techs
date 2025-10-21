# PostgREST API Contracts

## Overview

This document defines the auto-generated PostgREST API endpoints for the Platform Dashboard. All endpoints are prefixed with the Supabase project URL: `https://{project-ref}.supabase.co/rest/v1/`

**Authentication**: All requests require `Authorization: Bearer {jwt_token}` header with superadmin role.

**Headers**:
```
Authorization: Bearer {jwt_token}
apikey: {anon_key}
Content-Type: application/json
Prefer: return=representation
```

---

## Communities

### List Communities
```http
GET /communities
```

**Query Parameters**:
- `select=*` - Columns to return
- `order=created_at.desc` - Sort order
- `limit=20` - Pagination limit
- `offset=0` - Pagination offset
- `status=eq.active` - Filter by status
- `name=ilike.*search*` - Search by name
- `location_state=eq.CA` - Filter by state

**Response** (200):
```json
[
  {
    "id": "uuid",
    "name": "Sunset Hills HOA",
    "location_address": "123 Main St, Los Angeles, CA 90001",
    "location_city": "Los Angeles",
    "location_state": "CA",
    "location_zipcode": "90001",
    "location_country": "USA",
    "total_residences": 150,
    "total_gates": 2,
    "status": "active",
    "subscription_plan_id": "uuid",
    "regional_settings": {
      "timezone": "America/Los_Angeles",
      "currency": "USD",
      "date_format": "MM/DD/YYYY"
    },
    "deleted_at": null,
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T10:30:00Z"
  }
]
```

### Get Community by ID
```http
GET /communities?id=eq.{community_id}&select=*
```

**Response** (200): Single community object

### Create Community
```http
POST /communities
```

**Request Body**:
```json
{
  "name": "Sunset Hills HOA",
  "location_address": "123 Main St, Los Angeles, CA 90001",
  "location_city": "Los Angeles",
  "location_state": "CA",
  "location_zipcode": "90001",
  "location_country": "USA",
  "total_residences": 150,
  "total_gates": 2,
  "status": "active",
  "subscription_plan_id": "uuid",
  "regional_settings": {
    "timezone": "America/Los_Angeles",
    "currency": "USD",
    "date_format": "MM/DD/YYYY"
  }
}
```

**Response** (201): Created community object

### Update Community
```http
PATCH /communities?id=eq.{community_id}
```

**Request Body** (partial update):
```json
{
  "name": "Updated Name",
  "status": "suspended",
  "updated_at": "2025-01-15T10:30:00Z"
}
```

**Response** (200): Updated community object

**Error** (409 - Optimistic Lock Conflict):
```json
{
  "code": "PGRST116",
  "message": "No rows updated. The resource may have been modified by another user."
}
```

### Soft Delete Community
```http
PATCH /communities?id=eq.{community_id}
```

**Request Body**:
```json
{
  "deleted_at": "2025-01-15T10:30:00Z"
}
```

**Response** (200): Updated community with deleted_at set

---

## Residences

### List Residences
```http
GET /residences?select=*,communities(name)&tenant_id=eq.{community_id}
```

**Query Parameters**:
- `unit_number=ilike.*search*` - Search by unit number
- `type=eq.single_family` - Filter by type (single_family, apartment, townhouse, condo)
- `order=unit_number.asc` - Sort order

**Response** (200):
```json
[
  {
    "id": "uuid",
    "tenant_id": "uuid",
    "unit_number": "A-101",
    "type": "apartment",
    "square_footage": 1200,
    "bedrooms": 2,
    "bathrooms": 2,
    "owner_name": "John Doe",
    "owner_email": "john@example.com",
    "owner_phone": "+1-555-0100",
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T10:30:00Z",
    "communities": {
      "name": "Sunset Hills HOA"
    }
  }
]
```

### Create Residence
```http
POST /residences
```

**Request Body**:
```json
{
  "tenant_id": "uuid",
  "unit_number": "A-101",
  "type": "apartment",
  "square_footage": 1200,
  "bedrooms": 2,
  "bathrooms": 2,
  "owner_name": "John Doe",
  "owner_email": "john@example.com",
  "owner_phone": "+1-555-0100"
}
```

**Response** (201): Created residence object

**Error** (409 - Duplicate Unit):
```json
{
  "code": "23505",
  "message": "duplicate key value violates unique constraint \"unique_unit_per_community\""
}
```

### Bulk Create Residences (CSV Import)
Use Edge Function `/process-csv-import` instead.

---

## Gates

### List Gates
```http
GET /gates?select=*,communities(name)&tenant_id=eq.{community_id}
```

**Response** (200):
```json
[
  {
    "id": "uuid",
    "tenant_id": "uuid",
    "gate_name": "North Entrance",
    "gate_code": "GATE-001",
    "location_latitude": 34.0522,
    "location_longitude": -118.2437,
    "status": "active",
    "operating_hours": {
      "monday": { "open": "06:00", "close": "22:00" },
      "tuesday": { "open": "06:00", "close": "22:00" },
      "24_7": false
    },
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T10:30:00Z",
    "communities": {
      "name": "Sunset Hills HOA"
    }
  }
]
```

### Create Gate
```http
POST /gates
```

**Request Body**:
```json
{
  "tenant_id": "uuid",
  "gate_name": "North Entrance",
  "gate_code": "GATE-001",
  "location_latitude": 34.0522,
  "location_longitude": -118.2437,
  "status": "active",
  "operating_hours": {
    "24_7": false,
    "monday": { "open": "06:00", "close": "22:00" }
  }
}
```

**Response** (201): Created gate object

### Update Gate
```http
PATCH /gates?id=eq.{gate_id}
```

---

## Admin Users

### List Admin Users
```http
GET /admin_users?select=*,communities(name),auth.users(email)&tenant_id=eq.{community_id}
```

**Response** (200):
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "tenant_id": "uuid",
    "role": "community_admin",
    "first_name": "Jane",
    "last_name": "Smith",
    "phone_number": "+1-555-0200",
    "status": "active",
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T10:30:00Z",
    "communities": {
      "name": "Sunset Hills HOA"
    }
  }
]
```

### Create Admin User
```http
POST /admin_users
```

**Request Body**:
```json
{
  "user_id": "uuid",
  "tenant_id": "uuid",
  "role": "community_admin",
  "first_name": "Jane",
  "last_name": "Smith",
  "phone_number": "+1-555-0200",
  "status": "active"
}
```

**Response** (201): Created admin user object

**Note**: User must already exist in `auth.users` table. Use Edge Function `/send-admin-credentials` to create auth user and send email.

---

## Subscription Plans

### List Subscription Plans
```http
GET /subscription_plans?select=*&order=price_monthly.asc
```

**Response** (200):
```json
[
  {
    "id": "uuid",
    "plan_name": "Basic",
    "description": "Up to 100 residences",
    "price_monthly": 299.00,
    "price_yearly": 2990.00,
    "max_residences": 100,
    "max_gates": 2,
    "features": ["community_management", "residence_tracking", "gate_management"],
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T10:30:00Z"
  }
]
```

---

## Audit Logs

### List Audit Logs
```http
GET /audit_logs?select=*&order=created_at.desc&limit=50
```

**Query Parameters**:
- `user_id=eq.{user_id}` - Filter by user
- `action=ilike.*create*` - Filter by action
- `entity_type=eq.community` - Filter by entity
- `created_at=gte.2025-01-01` - Filter by date range

**Response** (200):
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "action": "create_community",
    "entity_type": "community",
    "entity_id": "uuid",
    "changes": {
      "before": null,
      "after": {
        "name": "Sunset Hills HOA",
        "status": "active"
      }
    },
    "ip_address": "192.168.1.1",
    "user_agent": "Mozilla/5.0...",
    "created_at": "2025-01-15T10:30:00Z"
  }
]
```

---

## RPC Functions

### Suspend Community
```http
POST /rpc/suspend_community
```

**Request Body**:
```json
{
  "p_community_id": "uuid",
  "p_reason": "Payment overdue"
}
```

**Response** (200):
```json
{
  "success": true,
  "community_id": "uuid",
  "previous_status": "active",
  "new_status": "suspended"
}
```

### Reactivate Community
```http
POST /rpc/reactivate_community
```

**Request Body**:
```json
{
  "p_community_id": "uuid"
}
```

**Response** (200):
```json
{
  "success": true,
  "community_id": "uuid",
  "previous_status": "suspended",
  "new_status": "active"
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `PGRST116` | No rows affected (optimistic lock failure) |
| `23505` | Unique constraint violation |
| `23503` | Foreign key constraint violation |
| `42501` | Insufficient privileges (RLS policy) |
| `PGRST301` | Invalid JWT token |
