# Village Tech - HOA Management Platform Database ERD

## Overview
This is a comprehensive Entity Relationship Diagram (ERD) for the Village Tech HOA Management Platform - a multi-tenant system designed to manage residential communities, their residents, facilities, and administrative operations.

## Database Architecture

The system follows a **multi-tenant architecture** where:
- **Tenants** = Residential Communities
- **Row-Level Security (RLS)** ensures data isolation between communities
- **Cascade Deletes** maintain data integrity
- **Soft Deletes** preserve historical data where needed

## Mermaid ERD Diagram

```mermaid
erDiagram
    subscription_plans {
        uuid id PK
        string name
        string description
        float price_monthly
        int max_residences
        int max_gates
        int max_admins
        json features
        datetime created_at
        datetime updated_at
    }

    communities {
        uuid id PK
        uuid subscription_plan_id FK
        string name
        string location
        string contact_email
        string contact_phone
        json regional_settings
        string logo_url
        string status
        datetime deleted_at
        datetime created_at
        datetime updated_at
    }

    residences {
        uuid id PK
        uuid tenant_id FK
        string unit_number
        string type
        int max_occupancy
        float lot_area
        float floor_area
        datetime created_at
        datetime updated_at
    }

    gates {
        uuid id PK
        uuid tenant_id FK
        string name
        string type
        string description
        json operating_hours
        float latitude
        float longitude
        bool is_active
        json hardware_settings
        datetime created_at
        datetime updated_at
    }

    admin_users {
        uuid id PK
        uuid tenant_id FK
        string role
        string status
        string first_name
        string last_name
        string phone
        datetime created_at
        datetime updated_at
    }

    audit_logs {
        uuid id PK
        uuid superadmin_id FK
        string action_type
        string entity_type
        uuid entity_id
        json changes
        string ip_address
        string user_agent
        datetime created_at
    }

    pending_users {
        uuid id PK
        uuid auth_user_id FK
        uuid reviewed_by FK
        string email
        string first_name
        string last_name
        string phone
        string status
        json registration_data
        string admin_notes
        datetime reviewed_at
        datetime created_at
        datetime updated_at
    }

    households {
        uuid id PK
        uuid tenant_id FK
        uuid residence_id FK
        uuid household_head_id FK
        date move_in_date
        date move_out_date
        string status
        string contact_email
        string contact_phone
        string notes
        datetime deleted_at
        datetime created_at
        datetime updated_at
    }

    household_members {
        uuid id PK
        uuid tenant_id FK
        uuid household_id FK
        uuid user_id FK
        string first_name
        string last_name
        string relationship_to_head
        date date_of_birth
        string contact_email
        string contact_phone
        string member_type
        string photo_url
        string status
        datetime created_at
        datetime updated_at
    }

    vehicle_stickers {
        uuid id PK
        uuid tenant_id FK
        uuid household_id FK
        uuid member_id FK
        uuid approved_by FK
        uuid revoked_by FK
        string vehicle_plate
        string vehicle_make
        string vehicle_model
        string vehicle_color
        string rfid_code
        string or_cr_document_url
        string status
        date expiry_date
        datetime approved_at
        string approval_notes
        datetime revoked_at
        string revocation_reason
        datetime deleted_at
        datetime created_at
        datetime updated_at
    }

    construction_permits {
        uuid id PK
        uuid tenant_id FK
        uuid household_id FK
        uuid approved_by FK
        string project_description
        date project_start_date
        date project_end_date
        string contractor_name
        string contractor_contact
        string contractor_license
        int estimated_worker_count
        float road_fee_amount
        bool road_fee_paid
        datetime road_fee_paid_at
        string status
        datetime approved_at
        string approval_notes
        datetime rejected_at
        string rejection_reason
        datetime deleted_at
        datetime created_at
        datetime updated_at
    }

    association_fees {
        uuid id PK
        uuid tenant_id FK
        uuid household_id FK
        uuid waived_by FK
        uuid recorded_by FK
        string fee_type
        float amount
        date due_date
        string payment_status
        float paid_amount
        datetime payment_date
        string payment_method
        string receipt_url
        string waiver_reason
        datetime waived_at
        string notes
        datetime created_at
        datetime updated_at
    }

    announcements {
        uuid id PK
        uuid tenant_id FK
        uuid created_by FK
        string announcement_type
        string title
        string content
        string target_audience
        string status
        datetime publication_date
        datetime expiry_date
        int view_count
        int click_count
        json attachment_urls
        datetime published_at
        datetime archived_at
        datetime created_at
        datetime updated_at
    }

    gate_entries {
        uuid id PK
        uuid tenant_id FK
        uuid gate_id FK
        uuid sticker_id FK
        uuid household_id FK
        uuid security_officer_id FK
        datetime entry_timestamp
        string entry_type
        string vehicle_plate
        string notes
        datetime created_at
    }

    incident_reports {
        uuid id PK
        uuid tenant_id FK
        uuid reported_by FK
        uuid resolved_by FK
        uuid gate_id FK
        uuid household_id FK
        datetime incident_timestamp
        string incident_type
        string location
        string description
        string resolution_status
        string resolution_notes
        json attachment_urls
        datetime resolved_at
        datetime created_at
        datetime updated_at
    }

    auth_users {
        uuid id PK
        string email
        string encrypted_password
        bool email_confirmed
        string phone
        datetime created_at
        datetime updated_at
    }

    subscription_plans ||--o{ communities : "has"
    communities ||--o{ residences : "contains"
    communities ||--o{ gates : "has"
    communities ||--o{ admin_users : "employs"
    communities ||--o{ households : "manages"
    communities ||--o{ announcements : "publishes"
    communities ||--o{ incident_reports : "reports"
    communities ||--o{ gate_entries : "logs"
    communities ||--o{ construction_permits : "permits"
    communities ||--o{ association_fees : "charges"
    communities ||--o{ vehicle_stickers : "authorizes"
    communities ||--o{ pending_users : "reviews"

    residences ||--o{ households : "occupies"

    households ||--o{ household_members : "contains"
    households ||--o{ vehicle_stickers : "owns"
    households ||--o{ construction_permits : "requests"
    households ||--o{ association_fees : "pays"
    households ||--o{ gate_entries : "generates"

    household_members ||--o{ vehicle_stickers : "assigned"
    household_members ||--o{ gate_entries : "uses"

    gates ||--o{ gate_entries : "logs"
    gates ||--o{ incident_reports : "location"

    admin_users ||--o{ audit_logs : "performs"
    admin_users ||--o{ announcements : "creates"
    admin_users ||--o{ incident_reports : "reports"
    admin_users ||--o{ pending_users : "reviews"
    admin_users ||--o{ construction_permits : "approves"
    admin_users ||--o{ association_fees : "manages"
    admin_users ||--o{ vehicle_stickers : "approves"
    admin_users ||--o{ gate_entries : "guards"

    vehicle_stickers ||--o{ gate_entries : "scans"

    auth_users ||--o{ admin_users : "extends"
    auth_users ||--o{ household_members : "links"
    auth_users ||--o{ audit_logs : "superadmin"
    auth_users ||--o{ pending_users : "pending"
    auth_users ||--o{ vehicle_stickers : "approves"
    auth_users ||--o{ construction_permits : "approves"
    auth_users ||--o{ association_fees : "manages"
    auth_users ||--o{ gate_entries : "guards"
```

## Table Descriptions

### Core Platform Tables

#### 1. **subscription_plans**
Defines available subscription tiers for communities with limits on residences, gates, and admin users.

#### 2. **communities**
Main tenant entity representing residential communities/ HOAs with multi-tenancy support.

#### 3. **admin_users**
Community administrators with roles: superadmin, admin_head, admin_officer.

#### 4. **audit_logs**
Comprehensive audit trail of all administrative actions across the platform.

### Community Infrastructure

#### 5. **residences**
Individual housing units within communities (apartments, houses, condos, etc.).

#### 6. **gates**
Community access points with GPS coordinates and operating hours.

### Household Management

#### 7. **households**
Occupancy records linking households to specific residences with contact information.

#### 8. **household_members**
Individual residents with relationship types and contact details.

#### 9. **vehicle_stickers**
Vehicle authorization system with RFID integration and document management.

### Operations Management

#### 10. **construction_permits**
Home improvement permit system with contractor management and fee tracking.

#### 11. **association_fees**
HOA dues management with payment tracking and waiver support. Features enhanced payment processing with proper tenant isolation through household relationships, comprehensive debugging, and JWT-based authentication integration.

#### 12. **announcements**
Community communication system with targeted audiences and scheduling.

#### 13. **gate_entries**
Access control logs for security monitoring and reporting.

#### 14. **incident_reports**
Security incident management with resolution tracking.

#### 15. **pending_users**
Registration queue for new users awaiting admin approval.

## Key Features

### Multi-Tenancy
- Row-Level Security (RLS) on all tables
- Tenant isolation via `tenant_id` foreign keys
- Cascade deletes maintain data integrity

### Data Integrity
- Unique constraints on critical fields
- Foreign key relationships with proper cascading
- Soft deletes for historical preservation

### Security
- Integration with Supabase Auth system
- Role-based access control
- Comprehensive audit logging
- Pending user approval workflow

### Performance
- Optimized indexes on frequently queried fields
- Materialized views for analytics
- Efficient relationship patterns

## Database Views & Functions

### Analytics Views
- `household_stats` - Occupancy metrics
- `sticker_dashboard` - Vehicle sticker statistics
- `fee_summary` - Financial reporting
- `community_stats` - Platform overview

### RPC Functions

#### Community Management
- `suspend_community(community_id)` - Suspend a community
- `reactivate_community(community_id)` - Reactivate a suspended community
- `soft_delete_community(community_id)` - Soft delete a community

#### Payment Processing
- `record_fee_payment(fee_id, amount, payment_date, payment_method)` - Record association fee payments with proper tenant isolation through household relationship

#### Bulk Operations
- `approve_sticker_bulk(sticker_ids, expiry_date)` - Bulk approve vehicle stickers
- `revoke_sticker(sticker_id, reason)` - Revoke vehicle stickers

#### Security Operations
- User management and access control
- Audit trail maintenance

### Recent Database Enhancements (2025-10-17)

#### Fixed Association Fees Payment System
- **Enhanced RPC Function**: Updated `record_fee_payment` with proper household-tenant relationship JOIN logic
- **Fixed RLS Policies**: Updated Row Level Security policies to use household-tenant relationship instead of direct tenant_id comparison
- **JWT Token Handling**: Fixed tenant_id extraction from JWT `app_metadata` field
- **Enhanced Debugging**: Added comprehensive error reporting and debugging information

#### Applied Migrations
- `20251017000003_fix_record_fee_payment_household_join.sql` - Fixed RPC function with household-tenant JOIN logic
- `20251017000004_fix_association_fees_rls_policy.sql` - Updated RLS policies for proper household relationship
- `20251017000005_force_recreate_record_fee_payment.sql` - Force recreated RPC function with enhanced debugging
- `20251017000006_fix_jwt_tenant_extraction.sql` - Fixed JWT tenant_id extraction from app_metadata

#### Security Improvements
- **Proper Tenant Isolation**: Association fees now properly isolated through household relationships
- **Enhanced Error Messages**: Detailed debugging information for troubleshooting payment issues
- **Improved Authentication**: Correct JWT token parsing for tenant identification

#### Database Consistency
- **Relationship Integrity**: All tenant-based operations now use proper household-tenant relationships
- **Data Validation**: Enhanced validation for payment processing and fee management
- **Audit Compliance**: Comprehensive logging of all payment operations

This ERD represents a complete, production-ready HOA management system designed for scalability, security, and comprehensive community administration. The recent updates ensure proper tenant isolation and enhanced payment processing capabilities.