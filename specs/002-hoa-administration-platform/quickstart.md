# Admin Dashboard Quickstart Guide

**Feature**: HOA Administration Platform (002)
**Last Updated**: 2025-10-09

---

## Prerequisites

Before starting, ensure you have:

- **Node.js** 20.x or later
- **npm** 10.x or later (or pnpm 9.x)
- **Git** 2.40+
- **Supabase CLI** 1.150.0+
- **Supabase Account** with a project created (or use local development)

### Install Supabase CLI
```bash
npm install -g supabase
```

### Verify Installations
```bash
node --version    # v20.x.x or higher
npm --version     # 10.x.x or higher
supabase --version # 1.150.0 or higher
```

---

## Step 1: Clone Repository

```bash
git clone https://github.com/your-org/village-tech.git
cd village-tech
git checkout 002-hoa-administration-platform
```

---

## Step 2: Set Up Supabase Project

### Initialize Supabase Locally (if not already done)
```bash
supabase init
supabase start
```

**Output**:
```
Started supabase local development setup.
API URL: http://localhost:54321
GraphQL URL: http://localhost:54321/graphql/v1
DB URL: postgresql://postgres:postgres@localhost:54322/postgres
Studio URL: http://localhost:54323
Inbucket URL: http://localhost:54324
JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Save these values** - you'll need them for environment variables.

### Link to Remote Project (Optional)
```bash
supabase link --project-ref your-project-ref
```

---

## Step 3: Run Database Migrations

Apply the database schema for Feature 002 (Admin Dashboard):

```bash
# Migrations are located in supabase/migrations/
# Pattern: 20250109000001_admin_schema.sql, etc.

# Reset database and apply all migrations
supabase db reset
```

**Migration Files** (in order):
1. `20250109000001_admin_schema.sql` - Tables (households, members, stickers, permits, fees, announcements, gate_entries, incidents, audit_logs)
2. `20250109000002_admin_rls.sql` - Row Level Security policies
3. `20250109000003_admin_views.sql` - Views (household_stats, sticker_dashboard, fee_summary, etc.)
4. `20250109000004_admin_functions.sql` - RPC functions (approve_sticker_bulk, record_fee_payment, revoke_sticker)
5. `20250109000005_admin_triggers.sql` - Auto-update triggers
6. `20250109000006_admin_cron.sql` - pg_cron scheduled jobs

### Verify Migration Success
```bash
# Open Supabase Studio
# http://localhost:54323

# Or check via psql
psql postgresql://postgres:postgres@localhost:54322/postgres
\dt public.*  -- List tables
\q
```

---

## Step 4: Seed Test Data

Load test data for development:

```bash
supabase db seed
```

**Seed File** (`supabase/seed/002_admin_seed.sql`):
```sql
-- Seed subscription plans (from Feature 001)
INSERT INTO subscription_plans (plan_name, price_monthly, max_residences, max_gates)
VALUES ('Basic', 299.00, 100, 2) ON CONFLICT DO NOTHING;

-- Seed test community
INSERT INTO communities (id, name, location_city, location_state, status, subscription_plan_id)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Sunset Hills HOA',
  'Los Angeles',
  'CA',
  'active',
  (SELECT id FROM subscription_plans WHERE plan_name = 'Basic' LIMIT 1)
) ON CONFLICT DO NOTHING;

-- Seed residences (from Feature 001)
INSERT INTO residences (tenant_id, unit_number, type, bedrooms, bathrooms)
SELECT
  '550e8400-e29b-41d4-a716-446655440000',
  'A-' || LPAD(s.n::TEXT, 3, '0'),
  'apartment',
  2,
  2
FROM generate_series(101, 150) AS s(n)
ON CONFLICT DO NOTHING;

-- Seed gates
INSERT INTO gates (tenant_id, gate_name, gate_code, status)
VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'North Entrance', 'GATE-NORTH', 'active'),
  ('550e8400-e29b-41d4-a716-446655440000', 'South Entrance', 'GATE-SOUTH', 'active')
ON CONFLICT DO NOTHING;

-- Seed test households (10 active households)
WITH test_residences AS (
  SELECT id, unit_number FROM residences
  WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000'
  LIMIT 10
)
INSERT INTO households (tenant_id, residence_id, move_in_date, status, contact_email, contact_phone)
SELECT
  '550e8400-e29b-41d4-a716-446655440000',
  id,
  CURRENT_DATE - INTERVAL '1 year' * (ROW_NUMBER() OVER ()),
  'active',
  'household' || ROW_NUMBER() OVER () || '@example.com',
  '+1-555-01' || LPAD((ROW_NUMBER() OVER ())::TEXT, 2, '0')
FROM test_residences
ON CONFLICT DO NOTHING;

-- Seed household members (household head for each household)
WITH test_households AS (
  SELECT id, contact_email FROM households
  WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000'
  LIMIT 10
)
INSERT INTO household_members (tenant_id, household_id, first_name, last_name, relationship_to_head, member_type, contact_email)
SELECT
  '550e8400-e29b-41d4-a716-446655440000',
  id,
  'John' || ROW_NUMBER() OVER (),
  'Doe',
  'self',
  'resident',
  contact_email
FROM test_households
ON CONFLICT DO NOTHING;

-- Update household_head_id
UPDATE households h
SET household_head_id = (
  SELECT id FROM household_members m
  WHERE m.household_id = h.id AND m.relationship_to_head = 'self'
  LIMIT 1
)
WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000';

-- Seed vehicle sticker requests (5 requested, 3 approved, 2 active)
WITH test_households AS (
  SELECT id FROM households
  WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000'
  LIMIT 10
)
INSERT INTO vehicle_stickers (tenant_id, household_id, vehicle_plate, vehicle_make, vehicle_model, status, expiry_date)
SELECT
  '550e8400-e29b-41d4-a716-446655440000',
  id,
  'ABC-' || LPAD((ROW_NUMBER() OVER ())::TEXT, 4, '0'),
  CASE (ROW_NUMBER() OVER ()) % 3
    WHEN 0 THEN 'Toyota'
    WHEN 1 THEN 'Honda'
    ELSE 'Nissan'
  END,
  'Sedan',
  CASE
    WHEN ROW_NUMBER() OVER () <= 5 THEN 'requested'
    WHEN ROW_NUMBER() OVER () <= 8 THEN 'approved'
    ELSE 'active'
  END,
  CASE
    WHEN ROW_NUMBER() OVER () > 5 THEN CURRENT_DATE + INTERVAL '1 year'
    ELSE NULL
  END
FROM test_households
ON CONFLICT DO NOTHING;

-- Seed association fees (5 unpaid, 3 paid, 2 overdue)
WITH test_households AS (
  SELECT id FROM households
  WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000'
  LIMIT 10
)
INSERT INTO association_fees (tenant_id, household_id, fee_type, amount, due_date, payment_status)
SELECT
  '550e8400-e29b-41d4-a716-446655440000',
  id,
  'monthly',
  250.00,
  CASE
    WHEN ROW_NUMBER() OVER () <= 5 THEN CURRENT_DATE + INTERVAL '7 days'  -- unpaid, upcoming
    WHEN ROW_NUMBER() OVER () <= 8 THEN CURRENT_DATE - INTERVAL '5 days'  -- paid recently
    ELSE CURRENT_DATE - INTERVAL '10 days'  -- overdue
  END,
  CASE
    WHEN ROW_NUMBER() OVER () <= 5 THEN 'unpaid'
    WHEN ROW_NUMBER() OVER () <= 8 THEN 'paid'
    ELSE 'overdue'
  END
FROM test_households
ON CONFLICT DO NOTHING;
```

---

## Step 5: Create Admin User

### Option 1: Via Supabase Studio
1. Open http://localhost:54323 (Supabase Studio)
2. Navigate to **Authentication** > **Users**
3. Click **Add User**
4. Email: `admin@example.com`
5. Password: `SecurePassword123!`
6. Click **Create User**
7. Navigate to **SQL Editor** and run:

```sql
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object(
  'role', 'admin_head',
  'tenant_id', '550e8400-e29b-41d4-a716-446655440000'
)
WHERE email = 'admin@example.com';
```

### Option 2: Via SQL (Recommended)
```bash
supabase db execute --sql "
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@example.com',
  crypt('SecurePassword123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{\"provider\":\"email\",\"providers\":[\"email\"]}',
  '{\"role\":\"admin_head\",\"tenant_id\":\"550e8400-e29b-41d4-a716-446655440000\"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
) ON CONFLICT (email) DO NOTHING;
"
```

### Create Admin Officer User (optional)
```sql
-- Same as above but with role: 'admin_officer'
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object(
  'role', 'admin_officer',
  'tenant_id', '550e8400-e29b-41d4-a716-446655440000'
)
WHERE email = 'officer@example.com';
```

---

## Step 6: Set Up Frontend Application

### Install Dependencies
```bash
cd apps/admin-dashboard
npm install
```

### Create Environment File
```bash
cp .env.example .env.local
```

**Edit `.env.local`**:
```bash
# Supabase Configuration
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Application Configuration
VITE_APP_NAME="Village Tech Admin Dashboard"
VITE_APP_ENV=development

# Feature Flags
VITE_ENABLE_REALTIME=true
VITE_ENABLE_PDF_GENERATION=true
VITE_ENABLE_CSV_EXPORT=true
```

### Start Development Server
```bash
npm run dev
```

**Output**:
```
VITE v5.0.0  ready in 500 ms

➜  Local:   http://localhost:5174/
➜  Network: use --host to expose
```

---

## Step 7: Access the Admin Dashboard

1. Navigate to http://localhost:5174
2. Click **Sign In**
3. Enter credentials:
   - Email: `admin@example.com`
   - Password: `SecurePassword123!`
4. You should be redirected to the Admin Dashboard

**Expected Dashboard Sections**:
- **Dashboard** (Analytics overview)
- **Households** (List with 10 test households)
- **Stickers** (Queue with 10 sticker requests)
- **Fees** (Management with 10 fee records)
- **Permits** (Review queue - empty initially)
- **Announcements** (Create/publish - empty initially)
- **Security** (Gate monitoring - requires gate hardware integration)
- **Analytics** (Reports and charts)

---

## Step 8: Deploy Edge Functions (Local Testing)

### Create Edge Function Directory Structure
```bash
cd ../../supabase/functions

# Edge Functions already exist in repo:
# - generate-receipt/
# - export-csv/
# - send-reminder/
# - process-announcement/
```

### Deploy Functions Locally
```bash
supabase functions serve
```

**Output**:
```
Serving functions on http://localhost:54321/functions/v1/
- generate-receipt
- export-csv
- send-reminder
- process-announcement
```

### Test Edge Function
```bash
# Generate receipt (requires valid fee_id from seed data)
curl -i --location --request POST 'http://localhost:54321/functions/v1/generate-receipt' \
  --header 'Authorization: Bearer YOUR_JWT_TOKEN' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "fee_id": "uuid-from-seed-data",
    "household_id": "uuid-from-seed-data"
  }'
```

---

## Step 9: Verify Features

### Test Household Management
1. Navigate to **Households**
2. Click **Create Household**
3. Select residence: "A-151" (vacant)
4. Set move-in date: Today
5. Enter contact info
6. Click **Save**
7. Verify household appears in list

### Test Member Registration
1. Open household detail (click on A-151)
2. Click **Add Member**
3. Fill in member details:
   - First Name: Jane
   - Last Name: Smith
   - Relationship: Spouse
   - Date of Birth: 1990-05-15
4. Upload photo (optional)
5. Click **Save**
6. Verify member appears in household

### Test Sticker Approval
1. Navigate to **Stickers**
2. View **Requested** tab (5 sticker requests)
3. Select first sticker request
4. Review vehicle plate, OR/CR document
5. Click **Approve** (default 1-year expiry)
6. Verify sticker moves to **Approved** tab

### Test Bulk Sticker Approval (admin_head only)
1. Select multiple requested stickers (checkbox)
2. Click **Bulk Approve**
3. Set expiry date: 1 year from today
4. Click **Confirm**
5. Verify all selected stickers approved

### Test Fee Payment Recording
1. Navigate to **Fees**
2. View **Unpaid** tab
3. Select fee record
4. Click **Record Payment**
5. Enter:
   - Amount: $250.00
   - Date: Today
   - Method: Bank Transfer
6. Click **Save**
7. Verify fee status changes to **Paid**
8. Click **Download Receipt** (PDF generated via Edge Function)

### Test Real-Time Gate Monitoring
1. Navigate to **Security** > **Gate Monitoring**
2. Open Supabase Studio in another tab
3. Navigate to **Table Editor** > **gate_entries**
4. Insert manual entry:
   ```sql
   INSERT INTO gate_entries (tenant_id, gate_id, entry_type, vehicle_plate)
   VALUES (
     '550e8400-e29b-41d4-a716-446655440000',
     (SELECT id FROM gates WHERE gate_code = 'GATE-NORTH' LIMIT 1),
     'vehicle',
     'ABC-0001'
   );
   ```
5. Verify entry appears in Admin Dashboard within 5 seconds (real-time)

---

## Step 10: Generate TypeScript Types (Optional)

Auto-generate TypeScript types from database schema:

```bash
cd apps/admin-dashboard
supabase gen types typescript --local > src/types/database.types.ts
```

**Usage in code**:
```typescript
import { Database } from '@/types/database.types'

type Household = Database['public']['Tables']['households']['Row']
type HouseholdInsert = Database['public']['Tables']['households']['Insert']
type HouseholdUpdate = Database['public']['Tables']['households']['Update']
```

---

## Troubleshooting

### Issue: "Invalid JWT" error

**Solution**: Ensure your `.env.local` has the correct `VITE_SUPABASE_ANON_KEY` from `supabase start` output.

### Issue: RLS policies blocking access

**Solution**: Verify admin role and tenant_id are set in user metadata:
```sql
SELECT
  email,
  raw_user_meta_data->>'role' AS role,
  raw_user_meta_data->>'tenant_id' AS tenant_id
FROM auth.users
WHERE email = 'admin@example.com';
```

Should return:
```
email               | role        | tenant_id
--------------------+-------------+--------------------------------------
admin@example.com   | admin_head  | 550e8400-e29b-41d4-a716-446655440000
```

### Issue: Edge Function not responding

**Solution**:
1. Check Edge Function is running: `supabase functions serve`
2. Check function logs: `supabase functions logs generate-receipt`
3. Verify JWT token is valid in Authorization header

### Issue: Real-time subscriptions not working

**Solution**:
1. Verify `VITE_ENABLE_REALTIME=true` in `.env.local`
2. Check Supabase Realtime is enabled (should be by default)
3. Verify subscription filter matches `tenant_id`:
   ```typescript
   filter: `tenant_id=eq.${tenantId}`
   ```

### Issue: No households visible after login

**Solution**:
1. Verify seed data loaded: `SELECT COUNT(*) FROM households;` (should be 10)
2. Check RLS policies: `SELECT * FROM households;` via Supabase Studio (logged in as admin)
3. Verify `tenant_id` matches between user and households

### Issue: Permission denied for admin_officer

**Solution**: Review permission matrix in [research.md](research.md). Some actions (bulk approve, revoke, waive fees) require admin_head role.

---

## Next Steps

1. ✅ Verify all 7 features work:
   - Household onboarding
   - Member registration
   - Sticker management
   - Fee collection
   - Permit workflow
   - Announcements
   - Security monitoring

2. Read the full specification: [`spec.md`](spec.md)

3. Review API contracts:
   - [PostgREST API](contracts/postgrest-api.md)
   - [Edge Functions](contracts/edge-functions.md)

4. Review database schema: [`data-model.md`](data-model.md)

5. Review technology decisions: [`research.md`](research.md)

6. Generate implementation tasks:
   ```bash
   /speckit.tasks
   ```

7. Begin implementation following task order in `tasks.md`

---

## Support

- **Documentation**: [Village Tech Docs](../../docs/)
- **API Reference**: [contracts/](contracts/)
- **Supabase Docs**: https://supabase.com/docs
- **Issues**: Create an issue in the GitHub repository

---

**Estimated Setup Time**: 45-60 minutes

**Last Updated**: 2025-10-09
