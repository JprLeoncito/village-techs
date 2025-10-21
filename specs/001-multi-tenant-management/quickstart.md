# Platform Dashboard Quickstart Guide

## Prerequisites

Before starting, ensure you have:

- **Node.js** 20.x or later
- **npm** 10.x or later (or pnpm 9.x)
- **Git** 2.40+
- **Supabase CLI** 1.150.0+
- **Supabase Account** with a project created

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
```

---

## Step 2: Set Up Supabase Project

### Initialize Supabase Locally
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
If you have a Supabase cloud project:
```bash
supabase link --project-ref your-project-ref
```

---

## Step 3: Run Database Migrations

Apply the database schema for Feature 001 (Multi-Tenant Management):

```bash
# Create migration file
supabase migration new multi_tenant_management

# Copy schema from data-model.md to the migration file
# Location: supabase/migrations/{timestamp}_multi_tenant_management.sql
```

**Migration File** (`supabase/migrations/20250115000000_multi_tenant_management.sql`):

```sql
-- See specs/001-multi-tenant-management/data-model.md for full schema

-- Create subscription_plans table (reference data)
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name TEXT NOT NULL UNIQUE,
  description TEXT,
  price_monthly DECIMAL(10,2) NOT NULL,
  price_yearly DECIMAL(10,2) NOT NULL,
  max_residences INTEGER NOT NULL,
  max_gates INTEGER NOT NULL,
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create communities table
CREATE TABLE communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location_address TEXT NOT NULL,
  location_city TEXT NOT NULL,
  location_state TEXT NOT NULL,
  location_zipcode TEXT NOT NULL,
  location_country TEXT DEFAULT 'USA',
  total_residences INTEGER DEFAULT 0 CHECK (total_residences >= 0),
  total_gates INTEGER DEFAULT 0 CHECK (total_gates >= 0),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  subscription_plan_id UUID REFERENCES subscription_plans(id),
  regional_settings JSONB DEFAULT '{}'::jsonb,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create residences table
CREATE TABLE residences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES communities(id),
  unit_number TEXT NOT NULL,
  type TEXT CHECK (type IN ('single_family', 'apartment', 'townhouse', 'condo')),
  square_footage INTEGER CHECK (square_footage > 0),
  bedrooms INTEGER CHECK (bedrooms >= 0),
  bathrooms DECIMAL(3,1) CHECK (bathrooms >= 0),
  owner_name TEXT,
  owner_email TEXT,
  owner_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_unit_per_community UNIQUE (tenant_id, unit_number)
);

-- Create gates table
CREATE TABLE gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES communities(id),
  gate_name TEXT NOT NULL,
  gate_code TEXT NOT NULL,
  location_latitude DECIMAL(10,8),
  location_longitude DECIMAL(11,8),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  operating_hours JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_gate_code_per_community UNIQUE (tenant_id, gate_code)
);

-- Create admin_users table
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  tenant_id UUID NOT NULL REFERENCES communities(id),
  role TEXT DEFAULT 'community_admin' CHECK (role IN ('community_admin', 'security_manager', 'billing_admin')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone_number TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_user_per_tenant UNIQUE (user_id, tenant_id)
);

-- Create audit_logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  changes JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_communities_updated_at BEFORE UPDATE ON communities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_residences_updated_at BEFORE UPDATE ON residences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gates_updated_at BEFORE UPDATE ON gates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies for superadmin
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE residences ENABLE ROW LEVEL SECURITY;
ALTER TABLE gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "superadmin_full_access" ON communities FOR ALL
  USING ((auth.jwt() ->> 'role') = 'superadmin');

CREATE POLICY "superadmin_full_access" ON residences FOR ALL
  USING ((auth.jwt() ->> 'role') = 'superadmin');

CREATE POLICY "superadmin_full_access" ON gates FOR ALL
  USING ((auth.jwt() ->> 'role') = 'superadmin');

CREATE POLICY "superadmin_full_access" ON admin_users FOR ALL
  USING ((auth.jwt() ->> 'role') = 'superadmin');

CREATE POLICY "superadmin_full_access" ON audit_logs FOR ALL
  USING ((auth.jwt() ->> 'role') = 'superadmin');

-- Create views
CREATE VIEW community_stats AS
SELECT
  c.id,
  c.name,
  c.status,
  COUNT(DISTINCT r.id) AS residence_count,
  COUNT(DISTINCT g.id) AS gate_count,
  COUNT(DISTINCT au.id) AS admin_count
FROM communities c
LEFT JOIN residences r ON r.tenant_id = c.id
LEFT JOIN gates g ON g.tenant_id = c.id
LEFT JOIN admin_users au ON au.tenant_id = c.id
WHERE c.deleted_at IS NULL
GROUP BY c.id;

-- Create RPC functions
CREATE OR REPLACE FUNCTION suspend_community(p_community_id UUID, p_reason TEXT)
RETURNS JSONB AS $$
DECLARE
  v_previous_status TEXT;
BEGIN
  SELECT status INTO v_previous_status FROM communities WHERE id = p_community_id;

  UPDATE communities SET status = 'suspended', updated_at = now()
  WHERE id = p_community_id AND status = 'active';

  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes)
  VALUES (
    auth.uid(),
    'suspend_community',
    'community',
    p_community_id,
    jsonb_build_object('reason', p_reason, 'previous_status', v_previous_status)
  );

  RETURN jsonb_build_object(
    'success', true,
    'community_id', p_community_id,
    'previous_status', v_previous_status,
    'new_status', 'suspended'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION reactivate_community(p_community_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_previous_status TEXT;
BEGIN
  SELECT status INTO v_previous_status FROM communities WHERE id = p_community_id;

  UPDATE communities SET status = 'active', updated_at = now()
  WHERE id = p_community_id AND status = 'suspended';

  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes)
  VALUES (
    auth.uid(),
    'reactivate_community',
    'community',
    p_community_id,
    jsonb_build_object('previous_status', v_previous_status)
  );

  RETURN jsonb_build_object(
    'success', true,
    'community_id', p_community_id,
    'previous_status', v_previous_status,
    'new_status', 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Apply Migration
```bash
supabase db reset  # Applies all migrations
```

### Seed Data (Optional)
```bash
# Create seed file: supabase/seed/001_subscription_plans.sql
supabase db seed
```

**Seed Example** (`supabase/seed/001_subscription_plans.sql`):
```sql
INSERT INTO subscription_plans (plan_name, description, price_monthly, price_yearly, max_residences, max_gates, features)
VALUES
  ('Basic', 'Up to 100 residences', 299.00, 2990.00, 100, 2, '["community_management", "residence_tracking", "gate_management"]'::jsonb),
  ('Professional', 'Up to 500 residences', 599.00, 5990.00, 500, 5, '["community_management", "residence_tracking", "gate_management", "analytics", "reporting"]'::jsonb),
  ('Enterprise', 'Unlimited residences', 1299.00, 12990.00, -1, -1, '["community_management", "residence_tracking", "gate_management", "analytics", "reporting", "api_access", "dedicated_support"]'::jsonb);
```

---

## Step 4: Set Up Frontend Application

### Install Dependencies
```bash
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
VITE_APP_NAME="Village Tech Platform"
VITE_APP_ENV=development

# Mapbox (for gate locations)
VITE_MAPBOX_ACCESS_TOKEN=pk.your_mapbox_token_here

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_REPORTS=true
```

### Start Development Server
```bash
npm run dev
```

**Output**:
```
VITE v5.0.0  ready in 500 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

---

## Step 5: Create Superadmin User

### Option 1: Via Supabase Studio
1. Open http://localhost:54323 (Supabase Studio)
2. Navigate to **Authentication** > **Users**
3. Click **Add User**
4. Email: `superadmin@example.com`
5. Password: `SecurePassword123!`
6. Click **Create User**
7. Navigate to **SQL Editor** and run:

```sql
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "superadmin"}'::jsonb
WHERE email = 'superadmin@example.com';
```

### Option 2: Via Supabase CLI
```bash
supabase db execute --sql "
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data)
VALUES (
  gen_random_uuid(),
  'superadmin@example.com',
  crypt('SecurePassword123!', gen_salt('bf')),
  now(),
  '{\"role\": \"superadmin\"}'::jsonb
);
"
```

---

## Step 6: Access the Application

1. Navigate to http://localhost:5173
2. Click **Sign In**
3. Enter credentials:
   - Email: `superadmin@example.com`
   - Password: `SecurePassword123!`
4. You should be redirected to the Platform Dashboard

---

## Step 7: Deploy Edge Functions (Optional)

If testing CSV import or report generation:

### Create Edge Function
```bash
supabase functions new process-csv-import
```

### Deploy Function
```bash
supabase functions deploy process-csv-import
```

### Test Function
```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/process-csv-import' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --form 'file=@"./test-data/residences.csv"' \
  --form 'tenant_id="uuid-here"'
```

---

## Project Structure

After setup, your project structure should look like:

```
village-tech/
├── apps/
│   └── platform-dashboard/
│       ├── src/
│       │   ├── components/
│       │   │   ├── ui/              # shadcn/ui components
│       │   │   ├── forms/           # Form components
│       │   │   ├── tables/          # Data tables
│       │   │   ├── layouts/         # Layout components
│       │   │   └── features/        # Feature-specific components
│       │   │       ├── communities/
│       │   │       ├── residences/
│       │   │       ├── gates/
│       │   │       └── admin-users/
│       │   ├── lib/
│       │   │   ├── supabase.ts      # Supabase client
│       │   │   ├── hooks/           # Custom hooks
│       │   │   └── utils/           # Utilities
│       │   ├── stores/              # Zustand stores
│       │   ├── types/               # TypeScript types
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── .env.local
│       ├── package.json
│       └── vite.config.ts
├── supabase/
│   ├── functions/
│   │   ├── process-csv-import/
│   │   ├── send-admin-credentials/
│   │   └── generate-platform-report/
│   ├── migrations/
│   │   └── 20250115000000_multi_tenant_management.sql
│   ├── seed/
│   │   └── 001_subscription_plans.sql
│   └── config.toml
├── specs/
│   └── 001-multi-tenant-management/
│       ├── spec.md
│       ├── plan.md
│       ├── research.md
│       ├── data-model.md
│       ├── quickstart.md
│       └── contracts/
│           ├── postgrest-api.md
│           └── edge-functions.md
└── package.json
```

---

## Common Tasks

### Reset Database
```bash
supabase db reset
```

### View Database in Studio
```bash
# Open http://localhost:54323
```

### Generate TypeScript Types from Database
```bash
supabase gen types typescript --local > apps/platform-dashboard/src/types/database.types.ts
```

### Run Tests
```bash
npm run test
```

### Build for Production
```bash
npm run build
```

---

## Troubleshooting

### Issue: "Invalid JWT" error

**Solution**: Ensure your `.env.local` has the correct `VITE_SUPABASE_ANON_KEY` from `supabase start` output.

### Issue: RLS policies blocking access

**Solution**: Verify superadmin role is set in user metadata:
```sql
SELECT raw_app_meta_data FROM auth.users WHERE email = 'superadmin@example.com';
```

Should return: `{"role": "superadmin"}`

### Issue: CSV import failing

**Solution**:
1. Check file size < 10MB
2. Verify CSV headers match expected format
3. Check Edge Function logs: `supabase functions logs process-csv-import`

### Issue: Mapbox not rendering

**Solution**: Get a free Mapbox token at https://www.mapbox.com/ and add to `.env.local`:
```bash
VITE_MAPBOX_ACCESS_TOKEN=pk.your_actual_token_here
```

---

## Next Steps

1. ✅ Verify all 5 core features work:
   - Community CRUD
   - Residence setup
   - Gate management
   - Admin user management
   - Analytics dashboard

2. Read the full specification: [`specs/001-multi-tenant-management/spec.md`](specs/001-multi-tenant-management/spec.md)

3. Review API contracts:
   - [PostgREST API](specs/001-multi-tenant-management/contracts/postgrest-api.md)
   - [Edge Functions](specs/001-multi-tenant-management/contracts/edge-functions.md)

4. Generate implementation tasks:
   ```bash
   /speckit.tasks
   ```

5. Begin implementation following task order in `tasks.md`

---

## Support

- **Documentation**: [Village Tech Docs](docs/)
- **API Reference**: [contracts/](specs/001-multi-tenant-management/contracts/)
- **Supabase Docs**: https://supabase.com/docs
- **Issues**: Create an issue in the GitHub repository

---

**Estimated Setup Time**: 30-45 minutes

**Last Updated**: 2025-01-15
