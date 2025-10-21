# Implementation Plan: HOA Administration Platform

**Branch**: `002-hoa-administration-platform` | **Date**: 2025-10-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-hoa-administration-platform/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

The HOA Administration Platform is an admin dashboard web application for managing households, members, vehicle stickers, construction permits, association fees, announcements, and security monitoring within gated communities. The platform uses React 18 with TypeScript for the frontend, Supabase (PostgreSQL + PostgREST + Realtime + Edge Functions) for the backend, and implements multi-tenant architecture with row-level security. Key features include household onboarding, sticker lifecycle management, fee collection tracking, permit approval workflows, community announcements, real-time gate monitoring, and comprehensive analytics. The system serves community admins (admin_head and admin_officer roles) and must support up to 500 households per community with real-time updates for security operations.

## Technical Context

**Language/Version**: TypeScript 5.3+ (strict mode)

**Primary Dependencies**:
- **Frontend**: React 18+, Vite 5+, TanStack Query v5, Zustand 4+, React Router v6, Tailwind CSS 3+, shadcn/ui, React Hook Form, Zod
- **Backend**: Supabase (PostgREST, PostgreSQL 15+, Realtime, Auth, Storage, Edge Functions)
- **Real-time**: Supabase Realtime (WebSocket subscriptions for gate monitoring)
- **PDF Generation**: [NEEDS CLARIFICATION: jsPDF vs Puppeteer for PDF receipts and reports]
- **CSV Export**: [NEEDS CLARIFICATION: CSV generation approach - client-side vs Edge Function]
- **File Upload**: Supabase Storage with RLS (member photos, OR/CR documents, permit attachments)

**Storage**: PostgreSQL 15+ (Supabase) with multi-tenant row-level security

**Testing**: Vitest (unit), Playwright (E2E), pgTAP (RLS policies), Deno test (Edge Functions)

**Target Platform**: Modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+) - Desktop primary, tablet functional

**Project Type**: Web application (frontend + Supabase backend)

**Performance Goals**:
- Admin dashboard page load: <2 seconds on 4G
- PostgREST queries: <200ms P95
- Gate entry log updates: <5 seconds real-time latency
- Bulk sticker approval (50 items): <15 seconds
- Report generation (1 year data): <10 seconds
- Payment recording with receipt: <30 seconds

**Constraints**:
- Support 500 households with 2000 residents per community without degradation
- Real-time gate monitoring requires <100ms Realtime message latency
- PDF receipt generation must be <2 seconds
- CSV export must handle up to 10,000 records
- File uploads limited to 5MB (OR/CR documents), 2MB (member photos)
- Optimistic UI updates for better UX on slow connections

**Scale/Scope**:
- 7 major feature areas (households, stickers, fees, permits, announcements, security, analytics)
- 14 primary screens (dashboard, household list/detail, sticker queue, fee management, etc.)
- 72 functional requirements across all modules
- Multi-tenant with tenant_id scoping on all operations
- Role-based access (admin_head, admin_officer) with permission differences

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Supabase-First Architecture** | ✅ PASS | Using PostgREST for CRUD, Realtime for gate monitoring, Storage for files, Edge Functions for PDF/CSV generation |
| **II. Row Level Security (RLS)** | ✅ PASS | All tables (households, members, stickers, permits, fees, announcements, gate_entries) will have RLS policies with tenant_id filtering and admin role checks |
| **III. Multi-Tenancy by Design** | ✅ PASS | All tables include tenant_id, RLS policies enforce tenant isolation, admin JWT contains tenant_id claim |
| **IV. Database-Driven Design** | ✅ PASS | Will use UUID PKs, created_at/updated_at with triggers, CHECK constraints for status enums, soft deletes (deleted_at), views for analytics |
| **V. Explicit State Machines** | ✅ PASS | Multiple state machines: sticker (requested→approved→active→expiring→expired/rejected/revoked), permit (pending→approved→in_progress→completed/rejected), fee (unpaid→paid/overdue/waived/partial), household (active→inactive→moved_out) |
| **VI. Real-Time by Default** | ✅ PASS | Gate entry monitoring uses Supabase Realtime subscriptions filtered by tenant_id, incident alerts broadcast to security personnel |
| **VII. Test-First for Security** | ✅ PASS | Will write RLS policy tests verifying tenant isolation (admin A cannot see admin B's households), role-based access (household members cannot approve permits) |
| **VIII. Performance Accountability** | ✅ PASS | Defined performance benchmarks in Technical Context, will use pagination (50 records default), indexed queries, select specific columns |
| **IX. Observability** | ✅ PASS | Will log admin actions in audit_logs table, user-friendly error messages, structured error responses from Edge Functions |
| **X. Secure by Default** | ✅ PASS | Will use anon key in frontend, service_role only in Edge Functions with JWT validation, secrets in Supabase Vault, HTTPS enforced |
| **XI. Documentation as Code** | ✅ PASS | Will document database schema with SQL comments, JSDoc for Edge Functions, API contracts in contracts/, quickstart guide |
| **XII. Simplicity and Pragmatism** | ✅ PASS | Using Supabase built-in features (no custom backend), direct PostgREST queries, simple state management with Zustand |

**Overall**: ✅ **PASS** - All 12 core principles satisfied. No violations requiring justification.

**Clarifications Needed** (to be resolved in Phase 0 research):
1. PDF generation approach (jsPDF client-side vs Puppeteer server-side)
2. CSV export approach (client-side generation vs Edge Function)
3. Permission differences between admin_head and admin_officer roles (from FR-068)

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
village-tech/
├── apps/
│   └── admin-dashboard/                 # Admin Dashboard (Feature 002)
│       ├── src/
│       │   ├── components/
│       │   │   ├── ui/                  # shadcn/ui base components
│       │   │   ├── forms/               # Reusable form components
│       │   │   ├── tables/              # Data table components
│       │   │   ├── layouts/             # Shell, Sidebar, Header
│       │   │   └── features/            # Feature-specific components
│       │   │       ├── households/      # Household list, detail, forms
│       │   │       ├── members/         # Member registration, photo upload
│       │   │       ├── stickers/        # Sticker queue, approval, revoke
│       │   │       ├── permits/         # Permit review, approval
│       │   │       ├── fees/            # Fee management, payment recording
│       │   │       ├── announcements/   # Create, schedule, publish
│       │   │       ├── security/        # Gate monitoring, incidents
│       │   │       └── analytics/       # Dashboard charts, reports
│       │   ├── lib/
│       │   │   ├── supabase.ts          # Supabase client initialization
│       │   │   ├── hooks/               # Custom React hooks
│       │   │   │   ├── useHouseholds.ts
│       │   │   │   ├── useStickers.ts
│       │   │   │   ├── useFees.ts
│       │   │   │   ├── usePermits.ts
│       │   │   │   ├── useRealtime.ts   # Realtime subscriptions
│       │   │   │   └── useAuth.ts       # Authentication
│       │   │   └── utils/               # Helpers, validators, formatters
│       │   ├── stores/                  # Zustand stores
│       │   │   ├── authStore.ts         # User session, tenant_id
│       │   │   ├── uiStore.ts           # Sidebar, theme
│       │   │   └── filterStore.ts       # Table filters, search
│       │   ├── types/
│       │   │   ├── database.types.ts    # Auto-generated from Supabase
│       │   │   ├── household.types.ts   # Business logic types
│       │   │   ├── sticker.types.ts
│       │   │   ├── permit.types.ts
│       │   │   ├── fee.types.ts
│       │   │   └── api.types.ts         # API responses
│       │   ├── routes/                  # React Router routes
│       │   │   ├── DashboardRoute.tsx
│       │   │   ├── HouseholdsRoute.tsx
│       │   │   ├── StickersRoute.tsx
│       │   │   ├── PermitsRoute.tsx
│       │   │   ├── FeesRoute.tsx
│       │   │   ├── AnnouncementsRoute.tsx
│       │   │   ├── SecurityRoute.tsx
│       │   │   └── AnalyticsRoute.tsx
│       │   ├── App.tsx
│       │   ├── main.tsx
│       │   └── vite-env.d.ts
│       ├── tests/
│       │   ├── e2e/                     # Playwright E2E tests
│       │   │   ├── household-onboarding.spec.ts
│       │   │   ├── sticker-approval.spec.ts
│       │   │   ├── fee-payment.spec.ts
│       │   │   └── permit-workflow.spec.ts
│       │   └── unit/                    # Vitest unit tests
│       │       ├── hooks/
│       │       ├── stores/
│       │       └── utils/
│       ├── .env.local                   # Local environment variables
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       └── playwright.config.ts
│
├── supabase/
│   ├── functions/
│   │   ├── generate-receipt/            # PDF receipt generation
│   │   ├── export-csv/                  # CSV export for reports
│   │   ├── send-reminder/               # Fee/sticker reminders
│   │   ├── process-announcement/        # Publish announcements
│   │   └── _shared/                     # Shared utilities
│   ├── migrations/
│   │   ├── 20250109000001_admin_schema.sql  # Tables for Feature 002
│   │   └── 20250109000002_admin_rls.sql     # RLS policies
│   ├── seed/
│   │   └── 002_admin_seed.sql           # Test data for development
│   ├── tests/
│   │   ├── rls/
│   │   │   ├── test_household_rls.sql
│   │   │   ├── test_sticker_rls.sql
│   │   │   ├── test_fee_rls.sql
│   │   │   └── test_permit_rls.sql
│   │   └── functions/
│   │       ├── generate-receipt.test.ts
│   │       └── export-csv.test.ts
│   └── config.toml
│
└── specs/
    └── 002-hoa-administration-platform/
        ├── spec.md
        ├── plan.md                      # This file
        ├── research.md                  # Phase 0 (to be generated)
        ├── data-model.md                # Phase 1 (to be generated)
        ├── quickstart.md                # Phase 1 (to be generated)
        ├── contracts/                   # Phase 1 (to be generated)
        │   ├── postgrest-api.md
        │   └── edge-functions.md
        └── tasks.md                     # Phase 2 (generated by /speckit.tasks)
```

**Structure Decision**: Using monorepo structure with `apps/admin-dashboard/` for the Admin Dashboard web application. This aligns with Feature 001 (Platform Dashboard in `apps/platform-dashboard/`) and allows future features to coexist (Residence App, Security App). The `supabase/` directory is shared across all applications, with migrations and Edge Functions organized by feature. Frontend uses feature-based component organization for better scalability.

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

No violations detected. All complexity justified by constitutional principles.

---

## Implementation Phases

### Phase 0: Research & Technology Decisions

**Objective**: Resolve all `NEEDS CLARIFICATION` items from Technical Context through research and document technology decisions.

**Research Tasks**:
1. **PDF Generation Approach**: Compare jsPDF (client-side) vs Puppeteer (Edge Function) for fee receipts and analytics reports
2. **CSV Export Strategy**: Evaluate client-side CSV generation vs Edge Function streaming for large datasets (10k+ records)
3. **Admin Role Permissions**: Define specific permission differences between admin_head and admin_officer roles (FR-068)

**Output**: `research.md` documenting all decisions with rationale, alternatives considered, and implementation guidance.

---

### Phase 1: Design & Contracts

**Prerequisites**: Phase 0 complete (research.md exists)

**Objective**: Define database schema, API contracts, and setup quickstart guide.

#### 1.1 Data Model (`data-model.md`)

Extract entities from spec and design complete database schema:

**Tables to Define**:
- `households` - residence occupancy with move-in/out dates, status
- `household_members` - individuals with photos, relationship, member type
- `vehicle_stickers` - sticker lifecycle with RFID, plate, OR/CR docs, status
- `construction_permits` - permit workflow with project details, road fees, status
- `association_fees` - fee tracking with payment status, receipts
- `announcements` - community communications with targeting, scheduling, analytics
- `gate_entries` - access logs from gate hardware integration
- `incident_reports` - security events from officer mobile app
- `audit_logs` - admin action tracking

**Schema Requirements**:
- All tables have `tenant_id UUID` for multi-tenancy
- UUID primary keys via `gen_random_uuid()`
- `created_at` and `updated_at` with auto-update triggers
- CHECK constraints for status enums (explicit state machines)
- Indexes on `tenant_id`, foreign keys, frequently queried columns
- Soft deletes (`deleted_at`) for households, stickers, permits
- UNIQUE constraints (e.g., `UNIQUE(tenant_id, vehicle_plate)` for stickers)
- Foreign keys with `ON DELETE` policies
- JSONB columns for flexible data (regional_settings, analytics)

**RLS Policies**:
- Admin full access: `(auth.jwt() ->> 'role') IN ('admin_head', 'admin_officer') AND tenant_id::TEXT = (auth.jwt() ->> 'tenant_id')`
- Superadmin bypass: `(auth.jwt() ->> 'role') = 'superadmin'`
- Role-based differentiation: admin_head has additional permissions (TBD from research)

**Views**:
- `household_stats` - occupancy metrics, active/inactive counts
- `sticker_dashboard` - sticker status distribution, expiring counts
- `fee_summary` - collection rates, overdue amounts by household
- `permit_queue` - pending/active permits with project details
- `gate_activity` - entry patterns, volume by gate/time

**RPC Functions**:
- `approve_sticker_bulk(sticker_ids UUID[], expiry_date DATE)` - bulk approval
- `record_fee_payment(fee_id UUID, amount DECIMAL, payment_date DATE, method TEXT)` - payment with receipt generation trigger
- `revoke_sticker(sticker_id UUID, reason TEXT)` - revoke with audit log

**State Machines**:
- Household: `active → inactive → moved_out`
- Sticker: `requested → approved → active → expiring → expired → renewed` OR `requested → rejected` OR `active → revoked`
- Permit: `pending → approved → in_progress → completed` OR `pending → rejected`
- Fee: `unpaid → paid` OR `unpaid → overdue → paid` OR `unpaid → waived` OR `unpaid → partial → paid`
- Announcement: `draft → scheduled → published → expired → archived`

#### 1.2 API Contracts (`contracts/`)

**PostgREST API** (`contracts/postgrest-api.md`):
- CRUD endpoints for all tables with query patterns
- Filtering, ordering, pagination examples
- Join patterns (e.g., `households?select=*,residence(*),members(*)`)
- Error codes and responses

**Edge Functions** (`contracts/edge-functions.md`):
- `POST /generate-receipt` - PDF receipt for fee payment
- `POST /export-csv` - CSV export for reports (households, stickers, fees, permits)
- `POST /send-reminder` - Email/notification for fee/sticker reminders
- `POST /process-announcement` - Publish announcement with targeting logic

**Realtime Subscriptions** (include in postgrest-api.md):
- `gate_entries` channel filtered by `tenant_id` for monitoring dashboard
- `incident_reports` broadcast channel for security alerts

#### 1.3 Quickstart Guide (`quickstart.md`)

Step-by-step setup instructions:
1. Prerequisites (Node.js, Supabase CLI)
2. Clone repository and install dependencies
3. Supabase local development setup (`supabase start`)
4. Run migrations for Feature 002 schema
5. Seed test data (households, stickers, fees)
6. Create admin user with admin_head role
7. Start frontend dev server
8. Access admin dashboard and verify features
9. Deploy Edge Functions locally
10. Troubleshooting guide

#### 1.4 Agent Context Update

Run: `.specify/scripts/powershell/update-agent-context.ps1 -AgentType claude`

---

### Phase 2: Task Generation

**Objective**: Generate actionable task list for implementation (separate `/speckit.tasks` command).

**Out of Scope for This Command**: Task generation happens after planning is complete.

---

## Implementation Order (for tasks.md generation)

**Week 1-2: Foundation**
1. Database schema migration (households, members, stickers, permits, fees, announcements)
2. RLS policies with automated tests
3. Supabase client setup and authentication
4. Basic layout components (Shell, Sidebar, Header)

**Week 3-4: Core Features (P1)**
5. Household management (list, create, detail, move-out)
6. Member registration (add member, photo upload, linking to user account)
7. Sticker queue (view requests, approve/reject, bulk actions, revoke)
8. Fee management (create fees, record payment, receipt generation, overdue dashboard)

**Week 5-6: Secondary Features (P2)**
9. Construction permit workflow (review, approve, track status, road fees)
10. Announcements (create, schedule, publish, attachments, analytics)
11. Security monitoring (real-time gate logs, incident reports, officer status)

**Week 7: Analytics & Refinement (P3)**
12. Dashboard with charts (occupancy, stickers, fees, gate activity, permits)
13. Report generation (CSV export, PDF reports)
14. Performance optimization (pagination, caching, indexes)
15. E2E testing for critical workflows

---

## Next Steps

1. ✅ Complete Phase 0: Generate `research.md` with technology decisions
2. ✅ Complete Phase 1: Generate `data-model.md`, `contracts/`, `quickstart.md`
3. ✅ Run agent context update script
4. ⏭️ Proceed to `/speckit.tasks` for Phase 2 task generation
5. ⏭️ Begin implementation following task order

---

**Status**: Phase 0 and Phase 1 planning complete. Ready for task generation (`/speckit.tasks`).