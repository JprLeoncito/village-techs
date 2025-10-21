# Tasks: HOA Administration Platform (Admin Dashboard)

**Input**: Design documents from `/specs/002-hoa-administration-platform/`
**Prerequisites**: plan.md, spec.md (user stories), research.md (tech decisions), data-model.md (schema + RLS), contracts/ (API)

**Tests**: ✅ **EXPLICITLY REQUESTED** - User asked for "Include testing requirements" and "Reference database tables and RLS policies"

**Organization**: Tasks organized by user story to enable independent implementation and testing of each capability.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5, US6, US7)
- Include exact file paths and database table references

## Path Conventions
- **Web app structure**: `apps/admin-dashboard/` (frontend), `supabase/` (backend)
- Frontend: React + TypeScript + Vite
- Backend: Supabase (PostgreSQL + PostgREST + Edge Functions + Realtime)
- Tests: Vitest (unit), Playwright (E2E), pgTAP (RLS policies), Deno (Edge Functions)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency setup for Admin Dashboard

- [ ] **T001** Create admin dashboard project structure in `apps/admin-dashboard/`
- [ ] **T002** Initialize Vite React TypeScript project with dependencies (React 18, TypeScript 5.3, Vite 5)
- [ ] **T003** [P] Configure ESLint, Prettier, and TypeScript strict mode
- [ ] **T004** [P] Setup Tailwind CSS 3+ and shadcn/ui component library in `tailwind.config.js`
- [ ] **T005** [P] Install Zustand 4+ for state management in `src/store/`
- [ ] **T006** [P] Install TanStack Query v5 for server state in `src/lib/query.ts`
- [ ] **T007** [P] Install React Router v6 and configure routing in `src/router.tsx`
- [ ] **T008** [P] Install React Hook Form + Zod for form validation
- [ ] **T009** [P] Install jsPDF for client-side PDF generation (receipts per research.md)
- [ ] **T010** [P] Setup Vitest for unit testing in `vitest.config.ts`
- [ ] **T011** [P] Setup Playwright for E2E testing in `playwright.config.ts`

---

## Phase 2: Foundational (Blocking Prerequisites + RLS Testing)

**Purpose**: Core infrastructure and database schema with RLS policies that MUST be complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database Schema & RLS Policies

- [ ] **T012** Create Supabase migration file `supabase/migrations/20250115_hoa_admin_schema.sql` for Feature 002
- [ ] **T013** Implement `households` table schema with tenant_id, residence_id FK, status state machine (active/inactive/moved_out), unique residence constraint per data-model.md
- [ ] **T014** Implement `household_members` table schema with tenant_id, household_id FK, user_id (auth.users), member_type (resident/beneficial_user), photo_url, relationship constraints
- [ ] **T015** Implement `vehicle_stickers` table schema with tenant_id, household_id FK, status state machine (requested/approved/active/expiring/expired/rejected/revoked), unique plate/RFID constraints per FR-023
- [ ] **T016** Implement `construction_permits` table schema with tenant_id, household_id FK, status state machine (pending/approved/in_progress/completed/rejected), road_fee fields
- [ ] **T017** Implement `association_fees` table schema with tenant_id, household_id FK, status state machine (unpaid/paid/overdue/waived/partial), fee_type enum
- [ ] **T018** Implement `announcements` table schema with tenant_id, target_audience (all/households/security/admins), publish_at/expire_at scheduling, analytics fields
- [ ] **T019** Implement `gate_entries` table schema with tenant_id, gate_id FK, entry_type, timestamp for real-time monitoring (references Feature 004)
- [ ] **T020** Implement `incidents` table schema with tenant_id, severity, officer_id FK for security monitoring (references Feature 004)
- [ ] **T021** Implement `audit_logs` table schema with tenant_id, admin_id, action_type, entity tracking per FR-072

### RLS Policies & Views

- [ ] **T022** Create RLS policy for `households`: Admin can CRUD only within their tenant_id, household members can SELECT their own household
- [ ] **T023** Create RLS policy for `household_members`: Admin CRUD within tenant, members SELECT own record
- [ ] **T024** Create RLS policy for `vehicle_stickers`: Admin CRUD within tenant, members SELECT own stickers
- [ ] **T025** Create RLS policy for `construction_permits`: Admin CRUD within tenant, members SELECT own permits
- [ ] **T026** Create RLS policy for `association_fees`: Admin CRUD within tenant, members SELECT own fees
- [ ] **T027** Create RLS policy for `announcements`: Admin CRUD within tenant, target audience SELECT based on matching criteria
- [ ] **T028** Create RLS policy for `gate_entries`: Admin SELECT within tenant, security officers INSERT own entries
- [ ] **T029** Create RLS policy for `incidents`: Admin SELECT within tenant, security officers INSERT own incidents
- [ ] **T030** Create RLS policy for `audit_logs`: Admin SELECT own actions within tenant, superadmin SELECT all
- [ ] **T031** Create database view `household_stats` aggregating occupancy, move-in/out trends per tenant (for US7 analytics)
- [ ] **T032** Create database view `sticker_analytics` aggregating active/expiring/expired counts per tenant (for US7)
- [ ] **T033** Create database view `fee_collection_summary` aggregating payment status, overdue amounts per tenant (for US7)
- [ ] **T034** Create RPC function `approve_sticker_bulk(sticker_ids UUID[])` for bulk sticker approval (US2) with expiry_date logic
- [ ] **T035** Create RPC function `record_fee_payment(fee_id UUID, amount NUMERIC, payment_date DATE)` with status update logic (US3)
- [ ] **T036** Create RPC function `mark_fees_overdue()` cron job for auto-updating unpaid→overdue past due_date (US3)
- [ ] **T037** Create RPC function `update_sticker_expiry_status()` cron job for active→expiring (30 days before), expiring→expired (US2)

### RLS Policy Tests (pgTAP)

- [ ] **T038** [P] Write pgTAP test for `households` RLS: Admin A cannot SELECT/INSERT/UPDATE admin B's households in `supabase/tests/rls/test_households_rls.sql`
- [ ] **T039** [P] Write pgTAP test for `household_members` RLS: Members can only SELECT own record, cannot UPDATE/DELETE in `supabase/tests/rls/test_members_rls.sql`
- [ ] **T040** [P] Write pgTAP test for `vehicle_stickers` RLS: Tenant isolation verified, members cannot approve stickers in `supabase/tests/rls/test_stickers_rls.sql`
- [ ] **T041** [P] Write pgTAP test for `construction_permits` RLS: Admin CRUD within tenant only in `supabase/tests/rls/test_permits_rls.sql`
- [ ] **T042** [P] Write pgTAP test for `association_fees` RLS: Admin can waive fees, members cannot in `supabase/tests/rls/test_fees_rls.sql`
- [ ] **T043** [P] Write pgTAP test for `announcements` RLS: Target audience filtering works correctly in `supabase/tests/rls/test_announcements_rls.sql`
- [ ] **T044** Run all pgTAP RLS tests: `supabase test db` to verify tenant isolation and role-based access

### Frontend Foundation

- [ ] **T045** Setup Supabase client in `apps/admin-dashboard/src/lib/supabase.ts` with environment variables (URL, anon key)
- [ ] **T046** [P] Create auth guard HOC in `apps/admin-dashboard/src/components/auth/AuthGuard.tsx` verifying admin_head/admin_officer role from JWT
- [ ] **T047** [P] Create Zustand auth store in `apps/admin-dashboard/src/store/authStore.ts` for admin session with tenant_id extraction from JWT
- [ ] **T048** [P] Create base layout components in `apps/admin-dashboard/src/components/layout/` (DashboardLayout, Sidebar, Header, Breadcrumbs)
- [ ] **T049** [P] Setup protected routes in `apps/admin-dashboard/src/router.tsx` with role-based access (admin_head vs admin_officer per research.md permission matrix)
- [ ] **T050** [P] Create reusable UI components in `apps/admin-dashboard/src/components/ui/` using shadcn/ui (Button, Input, Modal, Table, Badge, Select, DatePicker, FileUpload)
- [ ] **T051** [P] Create error boundary in `apps/admin-dashboard/src/components/ErrorBoundary.tsx` with user-friendly error messages
- [ ] **T052** [P] Setup environment config in `apps/admin-dashboard/.env.local` (Supabase URL, anon key, service_role for Edge Functions)
- [ ] **T053** Run database migrations: `supabase db reset` and verify all tables + RLS policies created

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Onboard New Households and Members (Priority: P1) 🎯 MVP

**Goal**: Enable admin to register new households for vacant residences with household head designation and member registration (photos, user account linking).

**Independent Test**: View vacant residences, create household for residence with move-in date and head details, add 3 members (head, spouse, child) with photos and relationships, link head to user account, verify household appears in system and head can login.

**Database Tables**: `households`, `household_members` (both with RLS policies from T022-T023)

### Tests for User Story 1

**Contract Tests**: Verify PostgREST endpoints work correctly

- [ ] **T054** [P] [US1] Contract test for POST `/households` creates household with tenant_id, residence_id, validates unique residence constraint in `apps/admin-dashboard/src/tests/api/households.test.ts`
- [ ] **T055** [P] [US1] Contract test for POST `/household_members` creates member linked to household, validates relationship enum in `apps/admin-dashboard/src/tests/api/members.test.ts`
- [ ] **T056** [P] [US1] Contract test for PATCH `/households` updates household_head_id successfully in `apps/admin-dashboard/src/tests/api/households.test.ts`

**Integration Tests**: Verify user journey works end-to-end

- [ ] **T057** [US1] E2E test: Admin creates household → adds members → designates head → verifies household appears in list using Playwright in `apps/admin-dashboard/e2e/household-onboarding.spec.ts`

### Implementation for User Story 1

- [ ] **T058** [P] [US1] Create HouseholdForm component in `apps/admin-dashboard/src/components/features/households/HouseholdForm.tsx` with fields: residence selector (vacant only), move-in date, contact email/phone
- [ ] **T059** [P] [US1] Create MemberForm component in `apps/admin-dashboard/src/components/features/households/MemberForm.tsx` with fields: first/last name, relationship dropdown, DOB, contact info, member_type radio (resident/beneficial_user), photo upload (2MB limit)
- [ ] **T060** [P] [US1] Create ResidenceSelector component in `apps/admin-dashboard/src/components/features/households/ResidenceSelector.tsx` querying vacant residences from `residences` table joined with `households` WHERE status != 'active'
- [ ] **T061** [P] [US1] Create PhotoUpload component in `apps/admin-dashboard/src/components/features/households/PhotoUpload.tsx` uploading to Supabase Storage bucket `member-photos/{tenant_id}/{member_id}.jpg` with 2MB validation
- [ ] **T062** [US1] Implement create household mutation in `apps/admin-dashboard/src/hooks/useHouseholds.ts` calling POST `/households` with tenant_id from auth JWT, residence_id, move_in_date
- [ ] **T063** [US1] Implement create household member mutation in `apps/admin-dashboard/src/hooks/useHouseholdMembers.ts` calling POST `/household_members` with household_id, photo upload to Storage
- [ ] **T064** [US1] Implement update household head mutation in `apps/admin-dashboard/src/hooks/useHouseholds.ts` calling PATCH `/households` setting household_head_id to selected member_id
- [ ] **T065** [US1] Implement user account linking logic in `apps/admin-dashboard/src/hooks/useHouseholdMembers.ts` calling PATCH `/household_members` with user_id from auth.users (admin searches by email)
- [ ] **T066** [US1] Create HouseholdsPage in `apps/admin-dashboard/src/pages/households/HouseholdsPage.tsx` with table view (household, residence, head name, move-in date, status), filters (status, residence), add household action
- [ ] **T067** [US1] Create HouseholdDetailPage in `apps/admin-dashboard/src/pages/households/HouseholdDetailPage.tsx` showing household info, members list with photos, edit/add member actions, set head action
- [ ] **T068** [US1] Add form validation using react-hook-form + zod for household (move-in date, contact email format) and member fields (name required, valid DOB)
- [ ] **T069** [US1] Add move-out date logic in HouseholdDetailPage: PATCH `/households` with move_out_date, auto-updates status to 'moved_out' per state machine
- [ ] **T070** [US1] Implement constraint validation: Prevent household_head removal unless another member designated (alert with member selector modal)
- [ ] **T071** [US1] Add success/error toast notifications using sonner for household creation, member registration
- [ ] **T072** [US1] Implement audit logging for household/member CRUD actions calling INSERT `/audit_logs` with admin_id, action_type, entity details

**Checkpoint**: User Story 1 complete - Admin can fully onboard households with members and photos

---

## Phase 4: User Story 2 - Manage Vehicle Sticker Lifecycle (Priority: P1)

**Goal**: Enable admin to review sticker requests, approve/reject with expiry dates, bulk approve, revoke stickers, and manage renewal reminders.

**Independent Test**: View sticker queue with 10 requests in different statuses, review vehicle docs (OR/CR), approve 5 with 1-year expiry, bulk approve 3, reject 1 with reason, revoke 1 active sticker. Verify status changes reflect correctly and renewal reminders generated for expiring stickers.

**Database Tables**: `vehicle_stickers` (with RLS from T024), uses RPC `approve_sticker_bulk` from T034

### Tests for User Story 2

**Contract Tests**:

- [ ] **T073** [P] [US2] Contract test for GET `/vehicle_stickers` filtered by status enum, validates unique plate constraint in `apps/admin-dashboard/src/tests/api/stickers.test.ts`
- [ ] **T074** [P] [US2] Contract test for PATCH `/vehicle_stickers` approve action sets status='approved', expiry_date, approved_by in `apps/admin-dashboard/src/tests/api/stickers.test.ts`
- [ ] **T075** [P] [US2] Contract test for RPC `approve_sticker_bulk` approves multiple stickers with default 1-year expiry in `apps/admin-dashboard/src/tests/api/stickers.test.ts`

**Integration Tests**:

- [ ] **T076** [US2] E2E test: Admin views sticker queue → approves request → verifies status='approved' and expiry_date set using Playwright in `apps/admin-dashboard/e2e/sticker-approval.spec.ts`

### Implementation for User Story 2

- [ ] **T077** [P] [US2] Create StickerQueue component in `apps/admin-dashboard/src/components/features/stickers/StickerQueue.tsx` with tabs for each status (requested, approved, active, expiring, expired, rejected, revoked) per FR-015
- [ ] **T078** [P] [US2] Create StickerDetailModal component in `apps/admin-dashboard/src/components/features/stickers/StickerDetailModal.tsx` displaying vehicle plate, make/model/color, OR/CR document preview (Supabase Storage URL), RFID code, household info
- [ ] **T079** [P] [US2] Create StickerApprovalForm component in `apps/admin-dashboard/src/components/features/stickers/StickerApprovalForm.tsx` with expiry_date picker (default 1 year from today), approve/reject buttons
- [ ] **T080** [P] [US2] Create BulkApprovalButton component in `apps/admin-dashboard/src/components/features/stickers/BulkApprovalButton.tsx` with checkbox selection on queue table, bulk approve action
- [ ] **T081** [P] [US2] Create StickerRevocationModal component in `apps/admin-dashboard/src/components/features/stickers/StickerRevocationModal.tsx` with revocation_reason textarea (required per constraint)
- [ ] **T082** [US2] Implement approve sticker mutation in `apps/admin-dashboard/src/hooks/useStickers.ts` calling PATCH `/vehicle_stickers` with status='approved', expiry_date, approved_by=admin.id, approved_at=NOW()
- [ ] **T083** [US2] Implement reject sticker mutation in `apps/admin-dashboard/src/hooks/useStickers.ts` calling PATCH `/vehicle_stickers` with status='rejected', rejection_reason (required per constraint)
- [ ] **T084** [US2] Implement bulk approve mutation in `apps/admin-dashboard/src/hooks/useStickers.ts` calling RPC `approve_sticker_bulk(sticker_ids[])` with optimistic updates
- [ ] **T085** [US2] Implement revoke sticker mutation in `apps/admin-dashboard/src/hooks/useStickers.ts` calling PATCH `/vehicle_stickers` with status='revoked', revocation_reason, revoked_by=admin.id, revoked_at=NOW()
- [ ] **T086** [US2] Create StickersPage in `apps/admin-dashboard/src/pages/stickers/StickersPage.tsx` with sticker queue, filters (household, plate search, status), detail modal, approval form
- [ ] **T087** [US2] Add sticker expiry indicator in queue: Highlight stickers with expiry_date within 30 days (status='expiring' per cron job T037)
- [ ] **T088** [US2] Implement renewal reminder logic: Query `vehicle_stickers` WHERE status='expiring' and generate notification records (via Edge Function or Realtime trigger)
- [ ] **T089** [US2] Add duplicate plate validation: Check `vehicle_stickers` unique constraint, show error if plate exists within tenant
- [ ] **T090** [US2] Implement audit logging for all sticker actions (approve, reject, bulk approve, revoke) in `/audit_logs`

**Checkpoint**: User Story 2 complete - Admin can fully manage sticker lifecycle from request to expiry

---

## Phase 5: User Story 3 - Process Association Fee Payments (Priority: P1)

**Goal**: Enable admin to create fee records, record payments with receipts, track overdue fees, send reminders, and waive fees when needed.

**Independent Test**: Create monthly fees for 10 households with due date, record payment for 5 households (full amount), record partial payment for 2, verify receipts generated (PDF download), view overdue dashboard with 3 unpaid past due, send payment reminders, waive 1 fee with reason.

**Database Tables**: `association_fees` (with RLS from T026), uses RPC `record_fee_payment` from T035, cron `mark_fees_overdue` from T036

### Tests for User Story 3

**Contract Tests**:

- [ ] **T091** [P] [US3] Contract test for POST `/association_fees` creates fee for households, validates fee_type enum in `apps/admin-dashboard/src/tests/api/fees.test.ts`
- [ ] **T092** [P] [US3] Contract test for RPC `record_fee_payment` updates status to 'paid' when full amount, 'partial' when partial in `apps/admin-dashboard/src/tests/api/fees.test.ts`
- [ ] **T093** [P] [US3] Contract test for GET `/association_fees` filtered by status='overdue' returns past due_date fees in `apps/admin-dashboard/src/tests/api/fees.test.ts`

**Integration Tests**:

- [ ] **T094** [US3] E2E test: Admin creates fee → records payment → generates receipt PDF → verifies fee status='paid' using Playwright in `apps/admin-dashboard/e2e/fee-payment.spec.ts`

### Implementation for User Story 3

- [ ] **T095** [P] [US3] Create FeeForm component in `apps/admin-dashboard/src/components/features/fees/FeeForm.tsx` with fields: fee_type dropdown (monthly/quarterly/annual/special_assessment), amount, due_date, household selector (all or specific households)
- [ ] **T096** [P] [US3] Create PaymentRecordForm component in `apps/admin-dashboard/src/components/features/fees/PaymentRecordForm.tsx` with fields: amount paid, payment_date, payment_method (cash/check/bank_transfer/online), notes
- [ ] **T097** [P] [US3] Create ReceiptPDF component in `apps/admin-dashboard/src/components/features/fees/ReceiptPDF.tsx` using jsPDF to generate receipt with fee details, payment info, household name, community logo per research.md (client-side, <2 seconds per SC-003)
- [ ] **T098** [P] [US3] Create OverdueDashboard component in `apps/admin-dashboard/src/components/features/fees/OverdueDashboard.tsx` with table of households with overdue fees, total outstanding balance, send reminder action
- [ ] **T099** [P] [US3] Create FeeWaiverModal component in `apps/admin-dashboard/src/components/features/fees/FeeWaiverModal.tsx` with waiver_reason textarea (required)
- [ ] **T100** [US3] Implement create fee mutation in `apps/admin-dashboard/src/hooks/useFees.ts` calling POST `/association_fees` with tenant_id, fee_type, amount, due_date, status='unpaid', for each selected household_id
- [ ] **T101** [US3] Implement record payment mutation in `apps/admin-dashboard/src/hooks/useFees.ts` calling RPC `record_fee_payment(fee_id, amount, payment_date)` which updates status to 'paid' or 'partial' based on amount vs total
- [ ] **T102** [US3] Implement fee status auto-update: Trigger cron job RPC `mark_fees_overdue()` daily to update unpaid fees past due_date to status='overdue' (T036)
- [ ] **T103** [US3] Implement waive fee mutation in `apps/admin-dashboard/src/hooks/useFees.ts` calling PATCH `/association_fees` with status='waived', waiver_reason
- [ ] **T104** [US3] Implement payment reminder logic in `apps/admin-dashboard/src/hooks/useFees.ts`: Query overdue fees, send notifications to household members via Edge Function `send-payment-reminder`
- [ ] **T105** [US3] Create FeesPage in `apps/admin-dashboard/src/pages/fees/FeesPage.tsx` with tabs (all fees, unpaid, paid, overdue, waived), create fee action, overdue dashboard
- [ ] **T106** [US3] Create FeeDetailPage in `apps/admin-dashboard/src/pages/fees/FeeDetailPage.tsx` showing fee details, payment history, record payment form, generate receipt button
- [ ] **T107** [US3] Implement receipt generation: On payment record success, trigger ReceiptPDF component, auto-download PDF with filename `receipt-{fee_id}-{date}.pdf`
- [ ] **T108** [US3] Add double-payment prevention: Lock fee record during payment (use optimistic locking with updated_at check per FR-054)
- [ ] **T109** [US3] Implement audit logging for fee actions (create, record payment, waive) in `/audit_logs`

**Checkpoint**: User Story 3 complete - Admin can fully manage fee collection with receipts and reminders

---

## Phase 6: User Story 4 - Review and Approve Construction Permits (Priority: P2)

**Goal**: Enable admin to review permit requests, calculate road fees, approve/reject, track construction status from in-progress to completion.

**Independent Test**: View 5 permit requests with project details and contractor info, calculate road fees for 3 based on duration (formula: days * worker_count * rate), approve 2 permits, reject 1 with reason, mark 1 approved permit as in-progress, then mark it completed with final inspection notes.

**Database Tables**: `construction_permits` (with RLS from T025)

### Tests for User Story 4

**Contract Tests**:

- [ ] **T110** [P] [US4] Contract test for GET `/construction_permits` filtered by status, validates state machine transitions in `apps/admin-dashboard/src/tests/api/permits.test.ts`
- [ ] **T111** [P] [US4] Contract test for PATCH `/construction_permits` approve sets status='approved', road_fee, notifies household in `apps/admin-dashboard/src/tests/api/permits.test.ts`

**Integration Tests**:

- [ ] **T112** [US4] E2E test: Admin reviews permit → calculates road fee → approves → verifies household notification sent using Playwright in `apps/admin-dashboard/e2e/permit-approval.spec.ts`

### Implementation for User Story 4

- [ ] **T113** [P] [US4] Create PermitQueue component in `apps/admin-dashboard/src/components/features/permits/PermitQueue.tsx` with tabs for status (pending, approved, in_progress, completed, rejected)
- [ ] **T114** [P] [US4] Create PermitDetailModal component in `apps/admin-dashboard/src/components/features/permits/PermitDetailModal.tsx` displaying project_description, start_date, end_date, contractor_name/phone, estimated_worker_count, attachments (project plans from Storage)
- [ ] **T115** [P] [US4] Create RoadFeeCalculator component in `apps/admin-dashboard/src/components/features/permits/RoadFeeCalculator.tsx` with formula: duration_days * worker_count * fee_rate (configurable per community settings), editable result
- [ ] **T116** [P] [US4] Create PermitApprovalForm component in `apps/admin-dashboard/src/components/features/permits/PermitApprovalForm.tsx` with calculated road_fee display, approve/reject buttons
- [ ] **T117** [P] [US4] Create PermitStatusUpdate component in `apps/admin-dashboard/src/components/features/permits/PermitStatusUpdate.tsx` for marking in_progress (construction start) and completed (final inspection notes)
- [ ] **T118** [US4] Implement approve permit mutation in `apps/admin-dashboard/src/hooks/usePermits.ts` calling PATCH `/construction_permits` with status='approved', road_fee, approved_by=admin.id, triggers notification Edge Function
- [ ] **T119** [US4] Implement reject permit mutation in `apps/admin-dashboard/src/hooks/usePermits.ts` calling PATCH `/construction_permits` with status='rejected', rejection_reason
- [ ] **T120** [US4] Implement update permit status mutation in `apps/admin-dashboard/src/hooks/usePermits.ts` for in_progress and completed transitions with construction_start_date, completion_date, inspection_notes fields
- [ ] **T121** [US4] Create Edge Function `notify-permit-approval` in `supabase/functions/notify-permit-approval/index.ts` sending email/push notification to household with road_fee amount and payment instructions
- [ ] **T122** [US4] Create PermitsPage in `apps/admin-dashboard/src/pages/permits/PermitsPage.tsx` with permit queue, filters (status, household, date range), detail modal, approval form
- [ ] **T123** [US4] Add permit constraint validation: Prevent approval without road_fee amount (CHECK constraint per FR-034)
- [ ] **T124** [US4] Track road fee payment status: Link to `association_fees` table with fee_type='construction_road_fee', display payment status in permit detail
- [ ] **T125** [US4] Generate permit reports: Query construction_permits with date filters, export to CSV with project details, timeline, road_fee collection
- [ ] **T126** [US4] Implement audit logging for permit actions (approve, reject, status updates) in `/audit_logs`

**Checkpoint**: User Story 4 complete - Admin can manage construction permits from request to completion

---

## Phase 7: User Story 5 - Communicate via Announcements (Priority: P2)

**Goal**: Enable admin to create announcements with types, target audiences, scheduling, attachments, and track engagement analytics.

**Independent Test**: Create 3 announcements (1 urgent for all, 1 event for households, 1 maintenance for security), schedule 1 for future publish_at, attach PDF to 1, publish all, verify target audiences see only their announcements, check view count increments, verify expiry archives announcement.

**Database Tables**: `announcements` (with RLS from T027)

### Tests for User Story 5

**Contract Tests**:

- [ ] **T127** [P] [US5] Contract test for POST `/announcements` creates with target_audience, validates type enum in `apps/admin-dashboard/src/tests/api/announcements.test.ts`
- [ ] **T128** [P] [US5] Contract test for RLS: Households can only SELECT announcements WHERE target_audience IN ('all', 'households') in `supabase/tests/rls/test_announcements_rls.sql`

**Integration Tests**:

- [ ] **T129** [US5] E2E test: Admin creates urgent announcement → schedules publish → attaches file → verifies target audience receives using Playwright in `apps/admin-dashboard/e2e/announcement-creation.spec.ts`

### Implementation for User Story 5

- [ ] **T130** [P] [US5] Create AnnouncementForm component in `apps/admin-dashboard/src/components/features/announcements/AnnouncementForm.tsx` with fields: type dropdown (general/urgent/event/maintenance/fee_reminder/election), title, content (rich text editor), target_audience radio (all/households/security/admins), publish_at datetime, expire_at datetime (optional)
- [ ] **T131** [P] [US5] Create AnnouncementFileUpload component in `apps/admin-dashboard/src/components/features/announcements/AnnouncementFileUpload.tsx` uploading to Supabase Storage bucket `announcement-attachments/{tenant_id}/{announcement_id}/` with 5MB limit, multiple files
- [ ] **T132** [P] [US5] Create AnnouncementAnalytics component in `apps/admin-dashboard/src/components/features/announcements/AnnouncementAnalytics.tsx` displaying view_count, link_click_count from announcement record
- [ ] **T133** [US5] Implement create announcement mutation in `apps/admin-dashboard/src/hooks/useAnnouncements.ts` calling POST `/announcements` with tenant_id, type, title, content, target_audience, publish_at (default NOW or scheduled), status='draft' or 'published'
- [ ] **T134** [US5] Implement schedule announcement logic: If publish_at > NOW, keep status='draft', use Supabase cron job or Edge Function with pg_cron to update status='published' at publish_at time
- [ ] **T135** [US5] Implement announcement expiry logic: Cron job queries announcements WHERE expire_at < NOW AND status='published', updates status='archived', removes from audience view
- [ ] **T136** [US5] Implement file attachment upload: After announcement created, upload files to Storage, store URLs in announcement.attachments JSONB array
- [ ] **T137** [US5] Create AnnouncementsPage in `apps/admin-dashboard/src/pages/announcements/AnnouncementsPage.tsx` with table (title, type, target_audience, publish_at, status), create announcement action, filters (type, status, target_audience)
- [ ] **T138** [US5] Create AnnouncementDetailPage in `apps/admin-dashboard/src/pages/announcements/AnnouncementDetailPage.tsx` showing full content, attachments, analytics, edit/archive actions
- [ ] **T139** [US5] Implement target audience filtering: RLS policy ensures household users SELECT only announcements WHERE target_audience IN ('all', 'households'), security WHERE target_audience IN ('all', 'security')
- [ ] **T140** [US5] Track announcement analytics: Increment view_count on SELECT (trigger or application logic), track link clicks via URL tracking params
- [ ] **T141** [US5] Implement audit logging for announcement actions (create, publish, archive) in `/audit_logs`

**Checkpoint**: User Story 5 complete - Admin can broadcast announcements to targeted audiences with scheduling

---

## Phase 8: User Story 6 - Monitor Security and Gate Activity (Priority: P2)

**Goal**: Enable admin to view real-time gate entry logs, active security officers, incident reports, and generate usage analytics.

**Independent Test**: View gate monitoring dashboard with live entry feed (last 50 entries updating <5 seconds), check 3 active security officers with assigned gates and shift duration, read 2 incident reports with details, generate gate usage report for last 7 days showing peak times and entry patterns.

**Database Tables**: `gate_entries` (with RLS from T028), `incidents` (with RLS from T029), uses Supabase Realtime subscriptions

### Tests for User Story 6

**Contract Tests**:

- [ ] **T142** [P] [US6] Contract test for GET `/gate_entries` filtered by gate_id, date range, validates real-time subscription in `apps/admin-dashboard/src/tests/api/gate-entries.test.ts`
- [ ] **T143** [P] [US6] Contract test for GET `/incidents` filtered by severity, officer_id in `apps/admin-dashboard/src/tests/api/incidents.test.ts`

**Integration Tests**:

- [ ] **T144** [US6] E2E test: Admin views gate monitoring → new entry added → verifies real-time update appears in <5 seconds using Playwright in `apps/admin-dashboard/e2e/gate-monitoring.spec.ts`

### Implementation for User Story 6

- [ ] **T145** [P] [US6] Create GateMonitoringDashboard component in `apps/admin-dashboard/src/components/features/security/GateMonitoringDashboard.tsx` with live entry feed table (timestamp, gate, entry_type, vehicle/person, officer)
- [ ] **T146** [P] [US6] Create ActiveOfficersWidget component in `apps/admin-dashboard/src/components/features/security/ActiveOfficersWidget.tsx` querying security officers WHERE status='active', displaying assigned_gate, shift_start, shift_duration
- [ ] **T147** [P] [US6] Create IncidentReportsList component in `apps/admin-dashboard/src/components/features/security/IncidentReportsList.tsx` displaying incident type, severity, timestamp, officer, location, description
- [ ] **T148** [P] [US6] Create GateUsageChart component in `apps/admin-dashboard/src/components/features/security/GateUsageChart.tsx` using recharts for entry volume by gate, time-based patterns (hourly/daily)
- [ ] **T149** [US6] Implement real-time gate entry subscription in `apps/admin-dashboard/src/hooks/useGateEntries.ts` using Supabase Realtime: `supabase.channel('gate_entries').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gate_entries', filter: 'tenant_id=eq.{tenant_id}' }, callback)` with <5 second latency per FR-059
- [ ] **T150** [US6] Implement gate entries query in `apps/admin-dashboard/src/hooks/useGateEntries.ts` calling GET `/gate_entries` with filters (gate_id, date_range, entry_type), pagination (50 records), order by timestamp DESC
- [ ] **T151** [US6] Implement active officers query in `apps/admin-dashboard/src/hooks/useSecurityOfficers.ts` calling GET `/security_officers` (from Feature 004 schema) WHERE status='active', tenant_id match
- [ ] **T152** [US6] Implement incidents query in `apps/admin-dashboard/src/hooks/useIncidents.ts` calling GET `/incidents` with filters (severity, date_range, officer_id), order by timestamp DESC
- [ ] **T153** [US6] Create GateMonitoringPage in `apps/admin-dashboard/src/pages/security/GateMonitoringPage.tsx` with live feed, active officers, incident reports, usage chart, filters (gate, date, entry_type)
- [ ] **T154** [US6] Generate gate usage reports: Query gate_entries with date aggregation (GROUP BY gate_id, DATE_TRUNC('hour', timestamp)), export to CSV with entry counts, peak times, vehicle vs pedestrian distribution per FR-064
- [ ] **T155** [US6] Add incident detail modal: View full incident report with photos/videos from Storage, officer notes, status (reported/investigating/resolved/closed)
- [ ] **T156** [US6] Implement Realtime connection health monitoring: Display connection status indicator, auto-reconnect on disconnect

**Checkpoint**: User Story 6 complete - Admin has full security and gate monitoring visibility with real-time updates

---

## Phase 9: User Story 7 - Analyze Household and Community Metrics (Priority: P3)

**Goal**: Enable admin to view analytics dashboards with occupancy stats, sticker trends, payment reports, gate analytics, construction logs, and export data.

**Independent Test**: View household occupancy dashboard showing 450 active of 500 total (90% occupancy), sticker analytics showing 800 active with 50 expiring in 30 days, payment collection report showing 85% collection rate with $15,000 overdue, gate analytics showing peak hours 7-9 AM and 5-7 PM, construction activity showing 12 active permits. Export each report to CSV and PDF.

**Database Tables**: Uses views `household_stats` (T031), `sticker_analytics` (T032), `fee_collection_summary` (T033)

### Tests for User Story 7

**Contract Tests**:

- [ ] **T157** [P] [US7] Contract test for GET `/household_stats` view returns aggregated occupancy metrics in `apps/admin-dashboard/src/tests/api/analytics.test.ts`
- [ ] **T158** [P] [US7] Contract test for GET `/sticker_analytics` view returns active/expiring/expired counts in `apps/admin-dashboard/src/tests/api/analytics.test.ts`
- [ ] **T159** [P] [US7] Contract test for GET `/fee_collection_summary` view returns collection rate, overdue amounts in `apps/admin-dashboard/src/tests/api/analytics.test.ts`

**Integration Tests**:

- [ ] **T160** [US7] E2E test: Admin views analytics dashboard → generates report → exports to PDF → verifies download using Playwright in `apps/admin-dashboard/e2e/analytics-reports.spec.ts`

### Implementation for User Story 7

- [ ] **T161** [P] [US7] Create OccupancyStatsWidget component in `apps/admin-dashboard/src/components/features/analytics/OccupancyStatsWidget.tsx` querying `household_stats` view, displaying total households, active/inactive counts, vacancy rate, move-in/out trends chart
- [ ] **T162** [P] [US7] Create StickerAnalyticsWidget component in `apps/admin-dashboard/src/components/features/analytics/StickerAnalyticsWidget.tsx` querying `sticker_analytics` view, displaying active count, expiring count (30 days), approval rate, distribution by household chart
- [ ] **T163** [P] [US7] Create PaymentReportsWidget component in `apps/admin-dashboard/src/components/features/analytics/PaymentReportsWidget.tsx` querying `fee_collection_summary` view, displaying collection rate %, overdue total amount, payment trends chart (by month), outstanding balances table
- [ ] **T164** [P] [US7] Create GateAnalyticsWidget component in `apps/admin-dashboard/src/components/features/analytics/GateAnalyticsWidget.tsx` querying `gate_entries` aggregated by gate_id, hour, displaying entry volume chart, peak times, vehicle vs pedestrian distribution pie chart
- [ ] **T165** [P] [US7] Create ConstructionActivityWidget component in `apps/admin-dashboard/src/components/features/analytics/ConstructionActivityWidget.tsx` querying `construction_permits`, displaying active permits count, completed count, road_fee collection total, permit approval timeline chart
- [ ] **T166** [US7] Implement analytics queries in `apps/admin-dashboard/src/hooks/useAnalytics.ts`: Query all views with tenant_id filter, date_range params, use TanStack Query caching (5-minute staleTime)
- [ ] **T167** [US7] Create ReportExportButtons component in `apps/admin-dashboard/src/components/features/analytics/ReportExportButtons.tsx` with CSV export (client-side for <10,000 records per research.md) and PDF export (Edge Function for complex multi-page reports)
- [ ] **T168** [US7] Implement CSV export logic in `apps/admin-dashboard/src/lib/csvExport.ts`: Convert JSON data to CSV format, trigger download with filename `{report_type}-{tenant_name}-{date}.csv`
- [ ] **T169** [US7] Create Edge Function `generate-analytics-report` in `supabase/functions/generate-analytics-report/index.ts` for PDF reports using pdf-lib or react-pdf with charts, multi-page layout per research.md (for >10,000 records or complex reports)
- [ ] **T170** [US7] Create AnalyticsDashboardPage in `apps/admin-dashboard/src/pages/analytics/AnalyticsDashboardPage.tsx` with all analytics widgets, date range filter, export buttons, responsive grid layout
- [ ] **T171** [US7] Add data refresh button: Manual refresh analytics with loading state, auto-refresh every 5 minutes using TanStack Query refetch interval
- [ ] **T172** [US7] Implement report generation: On export button click, call Edge Function or client-side export based on data size (threshold: 10,000 records), show progress indicator
- [ ] **T173** [US7] Add analytics filters: Date range picker (last 7 days, 30 days, 90 days, custom), export date range selection

**Checkpoint**: User Story 7 complete - Admin has comprehensive analytics and reporting capabilities

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Production readiness, performance optimization, and user experience enhancements

- [ ] **T174** [P] Add loading skeletons across all pages using shadcn/ui Skeleton component
- [ ] **T175** [P] Implement global error handling with toast notifications for API errors, network failures
- [ ] **T176** [P] Add form validation helpers and error display in `apps/admin-dashboard/src/components/ui/FormField.tsx` for consistent UX
- [ ] **T177** [P] Optimize bundle size: Code-split routes with React.lazy, lazy load charts (recharts), tree-shake unused shadcn components
- [ ] **T178** [P] Add keyboard shortcuts: Cmd+K command palette, Esc to close modals, Tab navigation
- [ ] **T179** [P] Implement responsive design for tablet: Media queries, touch-friendly buttons, mobile-optimized tables
- [ ] **T180** [P] Add data table enhancements in `apps/admin-dashboard/src/components/ui/DataTable.tsx`: Pagination, sorting, column visibility toggle, row selection
- [ ] **T181** [P] Implement global search: Debounced search input with multi-entity results (households, stickers, fees, permits)
- [ ] **T182** [P] Add empty states: Custom empty state components for tables with no data, filters with no results
- [ ] **T183** [P] Create onboarding tour for first-time admins using react-joyride in `apps/admin-dashboard/src/components/OnboardingTour.tsx`
- [ ] **T184** [P] Add micro-interactions: Button loading spinners, success animations (checkmark), transitions with framer-motion
- [ ] **T185** [P] Implement role-based UI: Hide/disable features based on admin_head vs admin_officer permissions per research.md permission matrix (admin_head: create fees, approve permits; admin_officer: record payments, view reports)
- [ ] **T186** [P] Add data export to all tables: CSV download buttons with custom column selection
- [ ] **T187** Security audit: Review all RLS policies with pgTAP tests, validate input sanitization, check JWT validation in Edge Functions
- [ ] **T188** Performance optimization: Add database indexes for frequently queried columns (household_id, tenant_id, status), enable query result caching, optimize N+1 queries with joins
- [ ] **T189** Run E2E test suite: Execute all Playwright tests in CI/CD pipeline, verify critical user journeys pass
- [ ] **T190** Run quickstart validation: Follow `quickstart.md` setup steps end-to-end, update if needed
- [ ] **T191** Documentation updates: Update README with admin dashboard features, deployment guide, RLS policy documentation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup (Phase 1) - BLOCKS all user stories
- **User Stories (Phases 3-9)**: All depend on Foundational (Phase 2) completion
  - Recommended sequential order for single developer: US1 (P1) → US2 (P1) → US3 (P1) → US4 (P2) → US5 (P2) → US6 (P2) → US7 (P3)
  - Parallel execution possible with team: US1, US2, US3 can run simultaneously after Foundational
- **Polish (Phase 10)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1 - MVP)**: Can start after Foundational - No dependencies on other stories ✅ **START HERE**
- **User Story 2 (P1)**: Can start after Foundational - Requires households from US1 for testing sticker approval
- **User Story 3 (P1)**: Can start after Foundational - Requires households from US1 for fee assignment
- **User Story 4 (P2)**: Can start after Foundational - Requires households from US1 for permit association
- **User Story 5 (P2)**: Can start after Foundational - Requires households from US1 for announcement targeting
- **User Story 6 (P2)**: Can start after Foundational - Depends on Feature 004 (Security app) for gate_entries/incidents data
- **User Story 7 (P3)**: Can start after Foundational - Best with data from US1-US6 for realistic analytics

### RLS Policy Testing Dependencies

- **RLS Tests (T038-T044)**: Depend on database schema creation (T012-T021) and policy creation (T022-T030)
- **Run pgTAP (T044)**: Depends on all RLS test files written (T038-T043)

### Within Each User Story

- **Tests BEFORE Implementation**: Contract tests (API) → Integration tests (E2E) → Implementation → Checkpoint
- Models/schema before services (Phase 2 foundational)
- Services/hooks before UI components
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup)**: All tasks T001-T011 can run in parallel (marked [P])

**Phase 2 (Foundational)**:
- Database tables T013-T021 can run in parallel (different tables)
- RLS policies T022-T030 can run in parallel after tables
- Views and RPCs T031-T037 can run in parallel after tables
- RLS tests T038-T043 can all run in parallel (different test files)
- Frontend foundation T045-T052 can all run in parallel

**Within User Stories**:
- All components marked [P] can run in parallel (different files)
- All contract tests marked [P] can run in parallel (different test files)
- Example US1: T054, T055, T056 (3 contract tests) can run in parallel
- Example US1: T058, T059, T060, T061 (4 components) can run in parallel

**Cross-Story Parallelization** (if team capacity):
- After Foundational completes, US1 + US2 + US3 can start simultaneously (3 developers)
- US4 + US5 can start in parallel after US1 completes (for household test data)
- US6 depends on Feature 004 gate data, can run in parallel with US7

---

## Parallel Example: User Story 1 (Household Onboarding)

```bash
# After Foundational (Phase 2) completes, launch US1 in parallel:

# Tests in parallel:
Task: "Contract test POST /households in apps/admin-dashboard/src/tests/api/households.test.ts"
Task: "Contract test POST /household_members in apps/admin-dashboard/src/tests/api/members.test.ts"
Task: "Contract test PATCH /households in apps/admin-dashboard/src/tests/api/households.test.ts"

# Components in parallel:
Task: "Create HouseholdForm component in apps/admin-dashboard/src/components/features/households/HouseholdForm.tsx"
Task: "Create MemberForm component in apps/admin-dashboard/src/components/features/households/MemberForm.tsx"
Task: "Create ResidenceSelector in apps/admin-dashboard/src/components/features/households/ResidenceSelector.tsx"
Task: "Create PhotoUpload in apps/admin-dashboard/src/components/features/households/PhotoUpload.tsx"

# Then sequential (depend on above):
Task: "Implement create household mutation"
Task: "Create HouseholdsPage"
Task: "E2E test household onboarding"
```

**Result**: 3 tests + 4 components built in parallel, then integrated sequentially → US1 complete faster

---

## Parallel Example: Multiple User Stories with RLS Testing

```bash
# After Foundational (Phase 2) completes, assign to 4 developers:

Developer 1: Work on User Story 1 (Households) - Tasks T054-T072 + RLS tests
Developer 2: Work on User Story 2 (Stickers) - Tasks T073-T090 + RLS tests
Developer 3: Work on User Story 3 (Fees) - Tasks T091-T109 + RLS tests
Developer 4: Setup RLS policy tests in parallel - Tasks T038-T044

# All complete in parallel, then:
Developer 1: Work on User Story 4 (Permits) - Tasks T110-T126
Developer 2: Work on User Story 5 (Announcements) - Tasks T127-T141
Developer 3: Work on User Story 6 (Security Monitoring) - Tasks T142-T156
Developer 4: Work on User Story 7 (Analytics) - Tasks T157-T173

# Then all developers work on Polish (Phase 10)
```

**Result**: 7 user stories + RLS testing completed in ~4 sprint cycles vs 7+ sequential

---

## Implementation Strategy

### MVP Scope (Week 1-2) 🎯
**Goal**: Ship core HOA management with households and sticker approval
- Phase 1: Setup (T001-T011)
- Phase 2: Foundational + RLS Tests (T012-T053)
- Phase 3: User Story 1 - Households (T054-T072) ✅ **Ship households first**
- Phase 4: User Story 2 - Stickers (T073-T090) ✅ **Then add sticker approval**

**Outcome**: Admin can onboard households and approve vehicle stickers - core HOA operations functional

### Iteration 2 (Week 3-4)
**Goal**: Add financial management
- Phase 5: User Story 3 - Fee Payments (T091-T109)
- Phase 6: User Story 4 - Construction Permits (T110-T126)

**Outcome**: Full financial tracking with receipts and permit workflow

### Iteration 3 (Week 5-6)
**Goal**: Add communication and security monitoring
- Phase 7: User Story 5 - Announcements (T127-T141)
- Phase 8: User Story 6 - Security Monitoring (T142-T156)
- Phase 9: User Story 7 - Analytics (T157-T173)

**Outcome**: Complete admin dashboard with all capabilities

### Final Polish (Week 7)
- Phase 10: Polish & Production Readiness (T174-T191)

**Outcome**: Production-ready admin dashboard with optimized UX

### Recommended Execution Order (Single Developer)
1. **Start**: Setup + Foundational + RLS Tests (T001-T053) - 5-6 days
2. **MVP Part 1**: User Story 1 - Households (T054-T072) - 3-4 days → **SHIP HOUSEHOLDS** 🚀
3. **MVP Part 2**: User Story 2 - Stickers (T073-T090) - 3-4 days → **SHIP STICKER APPROVAL** 🚀
4. **Iteration 1**: User Story 3 - Fees (T091-T109) - 3-4 days
5. **Iteration 2**: User Story 4 - Permits (T110-T126) - 3-4 days
6. **Iteration 3**: User Story 5 - Announcements (T127-T141) - 2-3 days
7. **Iteration 4**: User Story 6 - Security (T142-T156) - 3-4 days
8. **Iteration 5**: User Story 7 - Analytics (T157-T173) - 3-4 days
9. **Final**: Polish (T174-T191) - 4-5 days

**Total**: ~7-8 weeks for single developer, ~4-5 weeks with team of 4

---

## Task Summary

- **Total Tasks**: **191 tasks**
- **Setup Tasks**: 11 (Phase 1)
- **Foundational Tasks**: 42 (Phase 2) ⚠️ BLOCKS all stories
  - Database schema: 10 tables (T013-T021)
  - RLS policies: 9 policies (T022-T030)
  - Views & RPCs: 7 (T031-T037)
  - RLS tests: 7 pgTAP tests (T038-T044)
  - Frontend foundation: 9 (T045-T053)
- **User Story Tasks**: 120 (Phases 3-9)
  - US1 (P1 - MVP): 19 tasks (T054-T072) - Households
  - US2 (P1 - MVP): 18 tasks (T073-T090) - Stickers
  - US3 (P1): 19 tasks (T091-T109) - Fees
  - US4 (P2): 17 tasks (T110-T126) - Permits
  - US5 (P2): 15 tasks (T127-T141) - Announcements
  - US6 (P2): 15 tasks (T142-T156) - Security Monitoring
  - US7 (P3): 17 tasks (T157-T173) - Analytics
- **Polish Tasks**: 18 (Phase 10)
- **Test Tasks**: 28 total
  - RLS tests (pgTAP): 7 (T038-T044)
  - Contract tests (API): 14 (distributed across user stories)
  - Integration tests (E2E): 7 (distributed across user stories)
- **Parallel Tasks**: 78 tasks marked [P] (41% can run in parallel)

### MVP Scope (Recommended First Shipment)
- **Phases**: 1 (Setup) + 2 (Foundational + RLS) + 3 (US1) + 4 (US2)
- **Tasks**: T001-T090 (90 tasks)
- **Effort**: ~2-3 weeks (single developer)
- **Value**: ✅ Core HOA operations - households onboarded + sticker approval functional

### By User Story Priority
- **P1 (Must Have)**: 56 tasks - US1 (Households), US2 (Stickers), US3 (Fees) ✅ **MVP Core**
- **P2 (Should Have)**: 47 tasks - US4 (Permits), US5 (Announcements), US6 (Security)
- **P3 (Nice to Have)**: 17 tasks - US7 (Analytics)
- **Infrastructure**: 53 tasks - Setup + Foundational (including RLS tests)
- **Polish**: 18 tasks - Cross-cutting improvements

### Testing Coverage
- **RLS Policy Tests**: 7 pgTAP tests ensuring tenant isolation and role-based access
- **Contract Tests**: 14 tests verifying PostgREST endpoints and RPC functions
- **Integration Tests**: 7 E2E Playwright tests covering critical user journeys
- **Total Test Coverage**: 28 tests across all layers (database, API, UI)

---

## Notes

- **RLS Testing**: ✅ Explicitly requested - comprehensive pgTAP tests for all tables with tenant isolation verification
- **Database References**: All tasks reference specific tables (households, vehicle_stickers, construction_permits, association_fees, announcements, gate_entries, incidents, audit_logs)
- **Edge Functions**: 3 total needed (notify-permit-approval, send-payment-reminder, generate-analytics-report)
- **External Services**: Supabase (database, auth, storage, realtime), Email service (Resend/SendGrid for notifications)
- **Tech Stack**: React 18 + TypeScript 5.3 + Vite 5 + Supabase + Zustand + TanStack Query + shadcn/ui + jsPDF
- **File Structure**: Web app structure with feature-based organization, shared components, comprehensive testing
- **Permission Matrix** (from research.md):
  - admin_head: Create fees, approve permits, waive fees, bulk approve stickers, manage announcements
  - admin_officer: Record payments, view reports, process sticker requests, update permit status
