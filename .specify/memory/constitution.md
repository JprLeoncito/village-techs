<!--
Sync Impact Report
==================
Version change: N/A → 1.0.0 (Initial constitution)
Modified principles: N/A (initial creation)
Added sections:
  - Core Principles (12 principles)
  - Architecture Standards
  - Development Workflow Standards
  - Governance
Templates requiring updates:
  ✅ plan-template.md (reviewed - constitution check section aligns)
  ✅ spec-template.md (reviewed - user story requirements align)
  ✅ tasks-template.md (reviewed - task categorization aligns)
Follow-up TODOs: None
-->

# Village Tech Constitution

## Core Principles

### I. Supabase-First Architecture

**MUST**: All backend functionality MUST leverage Supabase built-in features before considering custom implementations.

**MUST**: Use database-driven API via PostgREST (auto-generated from PostgreSQL schema) as the primary data access layer.

**MUST**: Edge Functions (Deno/TypeScript) are reserved ONLY for complex business logic, payment processing, external integrations, and workflows that cannot be expressed in SQL.

**MUST**: Frontend applications MUST connect directly to the database using @supabase/supabase-js client.

**Rationale**: Supabase provides enterprise-grade infrastructure (authentication, real-time, storage, functions) that eliminates the need for custom backend services. This reduces maintenance burden, improves security, and accelerates development.

### II. Row Level Security (RLS) as Primary Security Mechanism

**MUST**: RLS policies are MANDATORY on ALL tenant-scoped tables before production deployment.

**MUST**: RLS policies MUST enforce tenant isolation at the database level—no backend middleware for tenant filtering.

**MUST**: Every tenant-scoped table MUST have a `tenant_id UUID` column with appropriate RLS policies.

**MUST**: All RLS policies MUST be tested with automated tests verifying tenant isolation (user A cannot access user B's data).

**MUST**: JWT tokens from Supabase Auth MUST contain `tenant_id` claim, extracted via `auth.jwt()` PostgreSQL function.

**MUST**: Superadmin role bypasses tenant filtering via explicit RLS policy conditions.

**MUST**: NEVER trust client-provided `tenant_id`—always extract from authenticated JWT token.

**Rationale**: RLS is the ONLY security layer protecting multi-tenant data. Without rigorous RLS testing and enforcement, tenant data leakage is inevitable. Database-level security cannot be bypassed by application bugs.

### III. Multi-Tenancy by Design

**MUST**: Every database table, storage bucket, and business logic operation MUST be designed with multi-tenancy from the start.

**MUST**: Use standardized tenant isolation policy pattern:
```sql
CREATE POLICY "tenant_isolation_policy"
ON table_name FOR ALL
USING (
    tenant_id::TEXT = (auth.jwt() ->> 'tenant_id')
    OR (auth.jwt() ->> 'role') = 'superadmin'
);
```

**MUST**: Edge Functions MUST validate `tenant_id` from JWT and filter all queries by tenant.

**MUST**: Storage bucket policies MUST mirror table RLS policies with tenant-based folder organization (`documents/{tenant_id}/...`).

**MUST**: Test tenant isolation BEFORE merging any code that touches multi-tenant data.

**Rationale**: Multi-tenant data isolation failures are catastrophic security incidents. Designing for multi-tenancy from the start prevents expensive refactoring and data breaches.

### IV. Database-Driven Design

**MUST**: Use PostgreSQL features extensively: triggers, functions, views, constraints, JSONB, foreign keys.

**MUST**: Every table MUST include:
  - UUID primary key via `gen_random_uuid()`
  - `created_at TIMESTAMPTZ DEFAULT NOW()`
  - `updated_at TIMESTAMPTZ DEFAULT NOW()` with auto-update trigger
  - Appropriate indexes on `tenant_id`, foreign keys, frequently queried columns

**MUST**: Implement data integrity via database constraints (CHECK, UNIQUE, NOT NULL) rather than application code.

**MUST**: Use PostgreSQL functions for reusable complex logic.

**MUST**: Create views for complex read-heavy queries to improve performance and maintainability.

**MUST**: Use soft deletes (`deleted_at TIMESTAMPTZ`) for critical data.

**Rationale**: The database is the single source of truth. Leveraging PostgreSQL's advanced features ensures data integrity, performance, and consistency across all applications (web, mobile, Edge Functions).

### V. Explicit State Machines

**MUST**: All workflows with multiple states (stickers, permits, incidents) MUST define explicit state machines.

**MUST**: Valid states MUST be enforced via CHECK constraints at the database level.

**MUST**: State transitions MUST be validated via database triggers or Edge Functions.

**MUST**: State history MUST be preserved in audit tables for compliance.

**MUST**: Invalid state transitions MUST raise clear, user-friendly error messages.

**Example state machine** (Sticker lifecycle):
- States: `requested → approved → active → expiring → expired → renewed` OR `requested → rejected`
- CHECK constraint: `CHECK (status IN ('requested', 'approved', 'active', 'expiring', 'expired', 'renewed', 'rejected', 'revoked'))`
- Trigger validates transitions: `requested` can only transition to `approved` or `rejected`

**Rationale**: Implicit state management leads to invalid data states, business logic errors, and poor user experience. Explicit state machines with database enforcement prevent data corruption and enable clear audit trails.

### VI. Real-Time by Default for Critical Operations

**MUST**: Use Supabase Realtime for live updates in these scenarios:
  - Gate entry monitoring (security guards see entries immediately)
  - Incident alerts (broadcast to all security personnel)
  - Guest arrival notifications (notify household)
  - Delivery status updates (notify household when delivery arrives)

**MUST**: Filter Realtime subscriptions by `tenant_id` to reduce noise and improve performance.

**MUST**: Implement reconnection logic for network interruptions.

**MUST**: Unsubscribe from channels when components unmount to prevent memory leaks.

**SHOULD**: Use Realtime broadcast for user-to-user messaging and presence tracking.

**Rationale**: Real-time updates eliminate manual refreshes, improve operational efficiency for security staff, and enhance user experience for residents. Supabase Realtime provides WebSocket infrastructure without custom implementation.

### VII. Test-First for Security-Critical Components

**MUST**: Write and verify FAILING tests BEFORE implementing RLS policies, tenant isolation, authentication, and payment processing.

**MUST**: RLS policy tests MUST verify:
  - Tenant A cannot read/write tenant B's data
  - Users without authentication cannot access protected resources
  - Superadmin can access all tenant data
  - Role-based access (household cannot approve permits)

**MUST**: Use pgTAP or custom SQL test scripts for automated RLS testing.

**MUST**: Edge Function tests MUST include unit tests (Deno test framework) and integration tests with test database.

**MUST**: E2E tests (Playwright) are REQUIRED for critical user workflows: authentication, payment, permit approval, gate entry.

**Rationale**: Security bugs and tenant isolation failures are not acceptable. Test-first development for security-critical components ensures defects are caught before production deployment.

### VIII. Performance Accountability

**MUST**: Target performance benchmarks:
  - PostgREST API queries: <200ms for standard queries
  - Edge Functions: <500ms execution time (max 10 seconds)
  - Frontend page load: <2 seconds on 4G connection
  - Real-time message delivery: <100ms latency

**MUST**: Use `EXPLAIN ANALYZE` to profile slow queries and optimize with appropriate indexes.

**MUST**: Implement pagination for ALL list endpoints (default 50, max 100 records).

**MUST**: Optimize RLS policies to avoid full table scans (add indexes on `tenant_id` and filter columns).

**MUST**: Use `.select('specific,columns')` instead of `.select('*')` to reduce payload size.

**MUST**: Monitor database connection count and query performance via Supabase Dashboard.

**SHOULD**: Cache frequently accessed static data (tenant settings, gate lists) in frontend state management.

**Rationale**: Poor performance degrades user experience and increases infrastructure costs. Proactive performance optimization prevents scalability issues as tenant count grows.

### IX. Observability and Error Transparency

**MUST**: Log all critical operations: authentication failures, payment attempts, state transitions, RLS policy violations, Edge Function errors.

**MUST**: Use consistent error response format across all Edge Functions:
```json
{
  "success": false,
  "error": {
    "code": "STICKER_NOT_FOUND",
    "message": "User-friendly error message",
    "details": { "sticker_id": "uuid-here" }
  }
}
```

**MUST**: User-facing error messages MUST be friendly and actionable—NEVER expose stack traces, SQL errors, or internal details.

**MUST**: Log detailed errors server-side (Edge Functions, database logs) for debugging.

**MUST**: Monitor key metrics:
  - Database: connection count, query latency, slow queries
  - Edge Functions: invocation count, error rate, execution time
  - Realtime: active connections, message throughput
  - Authentication: active users, failed login attempts

**MUST**: Set up alerts for critical thresholds (database connections >80%, Edge Function error rate >5%, API P95 >1 second).

**Rationale**: Without observability, debugging production issues is impossible. Structured logging and monitoring enable rapid incident response and continuous improvement.

### X. Secure by Default

**MUST**: Use Supabase `anon` key in ALL client-side code (web and mobile)—NEVER expose `service_role` key.

**MUST**: Use `service_role` key ONLY in Edge Functions with proper JWT validation.

**MUST**: Enable HTTPS/TLS for all API endpoints (enforced automatically by Supabase).

**MUST**: Implement API rate limiting (configured in Supabase Dashboard).

**MUST**: Validate all user inputs (client-side and server-side) to prevent SQL injection and XSS.

**MUST**: Use parameterized queries (handled automatically by PostgREST and Supabase client).

**MUST**: Implement Content Security Policy headers to prevent XSS attacks.

**MUST**: Store sensitive credentials (payment gateway keys, API keys) in Supabase Secrets—NEVER commit to Git.

**MUST**: Enable database SSL connections in production.

**MUST**: Conduct regular security audits of RLS policies and Edge Functions.

**Rationale**: Security breaches destroy user trust and have legal/financial consequences. Defense-in-depth with RLS, rate limiting, input validation, and secret management minimizes attack surface.

### XI. Documentation as Code

**MUST**: Document all database tables, columns, relationships, and RLS policies with SQL comments.

**MUST**: Use JSDoc comments for all Edge Functions with parameter descriptions and return types.

**MUST**: Maintain Architecture Decision Records (ADRs) for major technical decisions.

**MUST**: Keep deployment guide, troubleshooting guide, and user guides in `/docs` directory.

**MUST**: Auto-generate API documentation from PostgREST schema (use Swagger/OpenAPI tools).

**MUST**: Document Edge Function endpoints with example requests/responses.

**SHOULD**: Use dbdocs.io or SchemaSpy for database schema visualization.

**Rationale**: Undocumented code is unmaintainable. Documentation enables onboarding, reduces tribal knowledge, and facilitates long-term maintenance.

### XII. Simplicity and Pragmatism

**MUST**: Prefer simple, direct solutions over clever abstractions.

**MUST**: Use Supabase built-in features before building custom solutions.

**MUST**: Avoid premature optimization—optimize only when performance issues are measured.

**MUST**: Follow YAGNI (You Aren't Gonna Need It)—don't build features for hypothetical future requirements.

**MUST**: Challenge complexity—document justification when simpler alternatives are rejected.

**SHOULD**: Refactor when code becomes hard to understand or change.

**Rationale**: Complexity is the enemy of maintainability. Simple code is easier to understand, test, debug, and modify. Supabase provides powerful primitives—use them.

## Architecture Standards

### PostgREST API Usage Patterns

**MUST** use Supabase JavaScript client (`@supabase/supabase-js`) for all database operations.

**Standard operations**:
- CRUD: `.select()`, `.insert()`, `.update()`, `.delete()`
- Joins: `.select('*, household(*), residence(*)')`
- Filtering: `.eq('status', 'active')`, `.gt('amount', 100)`, `.in('type', ['A', 'B'])`
- Ordering: `.order('created_at', { ascending: false })`
- Pagination: `.range(0, 49)` (returns 50 records)
- Count: `.select('*', { count: 'exact', head: true })`

**Realtime subscriptions**:
```typescript
const subscription = supabase
  .channel('channel-name')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'gate_entries',
    filter: `tenant_id=eq.${tenantId}`
  }, handler)
  .subscribe()
```

### Edge Function Structure Template

**MUST** follow this structure for all Edge Functions:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const authHeader = req.headers.get('Authorization')!
    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error } = await supabase.auth.getUser(jwt)

    if (error || !user) throw new Error('Unauthorized')

    const tenant_id = user.user_metadata.tenant_id
    const role = user.user_metadata.role

    if (!tenant_id && role !== 'superadmin') {
      throw new Error('Forbidden')
    }

    // Business logic here - ALWAYS filter by tenant_id

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

### User Roles Hierarchy

**Defined roles** (stored in `auth.users.raw_user_meta_data.role`):
- `superadmin`: Platform administrator (no tenant_id, full access)
- `admin_head`: Primary HOA administrator
- `admin_officer`: Supporting HOA administrator
- `household_head`: Primary household contact
- `household_member`: Household resident
- `beneficial_user`: Non-resident with vehicle access
- `security_head`: Security team leader
- `security_officer`: Gate guard

### Storage Bucket Structure

**Standard bucket organization**:
- `tenant-logos` (public): Community logos
- `documents` (private, RLS): Construction permits, OR/CR documents
- `photos` (private, RLS): Resident photos, vehicle photos
- `cctv-footage` (private, RLS): Short-term retention (7-30 days)

**File path convention**: `{bucket}/{tenant_id}/{category}/{filename}`

Example: `documents/550e8400-e29b-41d4-a716-446655440000/permits/permit-2025-001.pdf`

### Background Jobs with pg_cron

**Common scheduled tasks**:
- Daily (8 AM): Sticker expiry reminders, association fee reminders
- Hourly: Payment reconciliation checks
- Weekly: Generate and email reports to admins
- Monthly: Archive old gate entry logs
- Periodic: Cleanup expired guest lists, old CCTV footage

**Example pg_cron job**:
```sql
SELECT cron.schedule(
  'daily-sticker-expiry-reminder',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project.supabase.co/functions/v1/send-expiry-reminders',
    headers := '{"Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'::jsonb
  );
  $$
);
```

## Development Workflow Standards

### Git Workflow

**Branch structure**:
- `main`: Production-ready code
- `staging`: Pre-production testing
- `feature/*`: Feature development
- `bugfix/*`: Bug fixes
- `hotfix/*`: Emergency production fixes

**Conventional commits** (REQUIRED):
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `test:` Test additions/changes
- `chore:` Maintenance tasks

### Development Process

1. Create feature branch from `main`
2. Develop feature locally with Supabase local development
3. Write tests (RLS, Edge Functions, Frontend) and verify they FAIL
4. Implement feature and verify tests PASS
5. Create pull request with description
6. Code review (minimum 1 approval required)
7. CI/CD runs automated tests
8. Merge to `staging` for QA testing
9. Deploy to production after QA approval

### Code Quality Requirements

**MUST**:
- TypeScript strict mode enabled for all client code
- ESLint + Prettier configured and passing
- No TypeScript `any` types without explicit justification
- All Edge Functions have JSDoc documentation
- All database schema changes reviewed by team
- Comprehensive RLS policy testing before merge

### Testing Strategy

**Mandatory tests**:
1. **RLS Policy Tests** (SQL): Verify tenant isolation, role-based access, superadmin bypass
2. **Edge Function Tests** (Deno): Unit tests and integration tests with test database
3. **E2E Tests** (Playwright): Critical workflows (auth, payment, permit approval, gate entry)

**Optional tests** (when specified):
- Frontend unit tests (Vitest + React Testing Library)
- Load tests (k6 or Artillery)
- Security penetration tests

**Test execution**:
```bash
# RLS tests
psql $DATABASE_URL -f supabase/tests/test_rls.sql

# Edge Function tests
deno test supabase/functions/*/test.ts

# E2E tests
npx playwright test
```

### Deployment Checklist

**MUST complete before production deployment**:
1. Test migrations locally: `supabase db reset`
2. Push migrations: `supabase db push`
3. Deploy Edge Functions: `supabase functions deploy`
4. Deploy frontends: Vercel/Netlify
5. Build mobile apps: EAS Build
6. Run smoke tests on production
7. Monitor for errors in Supabase Dashboard

**Rollback procedure**:
1. Revert frontend deployment (Vercel rollback)
2. Revert database migrations if needed
3. Redeploy previous Edge Function versions
4. Notify users if downtime occurred

### Mobile App Best Practices

**MUST** (React Native + Expo):
- Use `@supabase/supabase-js` for backend integration
- Implement offline-first architecture for Sentinel app
- Use AsyncStorage for local caching
- Implement sync queue for offline operations
- Optimistic UI updates for better UX
- Push notifications via Expo + Edge Functions
- Biometric authentication via Expo SecureStore
- QR code scanning for resident verification

## Governance

### Amendment Procedure

1. **Proposal**: Document proposed amendment with rationale and impact analysis
2. **Review**: Team discussion and feedback (minimum 3 days)
3. **Approval**: Unanimous approval required for Core Principles changes
4. **Version Bump**: Increment version per semantic versioning rules
5. **Propagation**: Update dependent templates and documentation
6. **Migration**: Create migration plan if existing code affected

### Versioning Policy

**Version format**: MAJOR.MINOR.PATCH

- **MAJOR**: Backward incompatible governance/principle removals or redefinitions
- **MINOR**: New principle/section added or materially expanded guidance
- **PATCH**: Clarifications, wording, typo fixes, non-semantic refinements

### Compliance Requirements

**MUST**:
- All pull requests MUST verify compliance with Core Principles
- Architecture Decision Records (ADRs) MUST justify any principle deviations
- Quarterly constitution compliance audits
- New team members MUST review constitution during onboarding

### Enforcement

**Code reviews MUST verify**:
- RLS policies present on all tenant-scoped tables
- Edge Functions validate `tenant_id` from JWT
- No `service_role` key in client code
- Tests exist for security-critical components
- Performance benchmarks met
- Documentation complete

**Automated checks** (CI/CD):
- TypeScript strict mode enabled
- ESLint/Prettier passing
- RLS policy tests passing
- Edge Function tests passing
- E2E tests passing for critical workflows

### Critical Reminders

**NEVER**:
1. Trust client-provided `tenant_id` (use JWT)
2. Expose `service_role` key to clients
3. Deploy tenant-scoped tables without RLS policies
4. Skip RLS policy testing
5. Use `any` types without justification
6. Commit secrets to Git
7. Deploy without running test suite
8. Merge without code review
9. Optimize prematurely without measurements
10. Add complexity without documented justification

**ALWAYS**:
1. RLS is your ONLY security layer—test exhaustively
2. Include `tenant_id` in all RLS policies
3. Validate `tenant_id` from JWT in Edge Functions
4. Use database constraints for data integrity
5. Document RLS policies with clear comments
6. Monitor database performance regularly
7. Keep Supabase CLI and dependencies updated
8. Prioritize: Security > Data Integrity > Performance > Developer Experience

---

**Version**: 1.0.0 | **Ratified**: 2025-10-09 | **Last Amended**: 2025-10-09
