# Village Tech Platform Dashboard

The superadmin dashboard for managing the Village Tech multi-tenant platform.

## Features

### ✅ Community Management
- Create and configure residential communities
- Upload community logos
- Configure regional settings (timezone, currency, language)
- Suspend, reactivate, or soft delete communities
- Status filtering and search

### ✅ Residence Management
- Add residences individually or via CSV bulk import
- Define unit numbering schemes
- Validate and report CSV import errors
- Search and filter residences by type

### ✅ Gate Configuration
- Configure gates with GPS coordinates
- Set operating hours (including midnight-spanning)
- Visualize gates on Mapbox interactive map
- Support multiple gate types (vehicle, pedestrian, service, delivery)
- Map and list view toggle

### ✅ Admin User Management
- Create admin_head and admin_officer users
- Reset passwords with temporary credentials
- Deactivate and reactivate accounts
- Email duplicate prevention

### ✅ Platform Analytics
- Real-time platform statistics dashboard
- Subscription breakdown with pie charts
- Community growth time-series charts
- CSV report generation
- 5-minute cache for optimal performance

## Tech Stack

- **Frontend**: React 18 + TypeScript 5.3 + Vite 5
- **Backend**: Supabase (PostgreSQL + PostgREST + Edge Functions)
- **State Management**: Zustand + TanStack Query
- **Forms**: React Hook Form + Zod
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Maps**: Mapbox GL JS
- **Icons**: Heroicons

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Supabase CLI installed
- Mapbox access token (for gate maps)

### Installation

1. Install dependencies:
```bash
cd apps/platform-dashboard
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:
```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_token_here
```

3. Start Supabase locally:
```bash
cd ../../supabase
supabase start
```

4. Run database migrations:
```bash
supabase db reset
```

5. Start the development server:
```bash
cd ../apps/platform-dashboard
npm run dev
```

The app will be available at `http://localhost:5173`

## Project Structure

```
src/
├── components/
│   ├── features/       # Feature-specific components
│   │   ├── analytics/  # Analytics dashboard components
│   │   ├── communities/# Community management components
│   │   ├── gates/      # Gate configuration components
│   │   ├── residences/ # Residence management components
│   │   └── admin-users/# Admin user management components
│   ├── layout/         # Layout components (Header, Sidebar, Container)
│   └── ui/             # Reusable UI components (Button, Input, etc.)
├── hooks/              # Custom React hooks
│   ├── useAnalytics.ts # Analytics queries
│   ├── useCommunities.ts# Community mutations
│   ├── useGates.ts     # Gate mutations
│   ├── useResidences.ts# Residence mutations
│   └── useAdminUsers.ts# Admin user mutations
├── lib/                # Utilities and configuration
│   ├── supabase.ts     # Supabase client
│   ├── query.ts        # TanStack Query config
│   ├── validations/    # Zod schemas
│   ├── storage.ts      # File storage utilities
│   ├── csvParser.ts    # CSV parsing logic
│   └── csvExport.ts    # CSV export utilities
├── pages/              # Page components
├── stores/             # Zustand stores
├── types/              # TypeScript types
└── router.tsx          # React Router configuration
```

## Key Features Implementation

### Multi-Tenant Architecture
- Row-Level Security (RLS) policies enforce tenant isolation
- JWT claims include `tenant_id` for data scoping
- Superadmin role bypasses tenant restrictions

### Form Validation
- Zod schemas for type-safe validation
- React Hook Form for form state management
- Real-time error display

### CSV Import
- Client-side CSV parsing and validation
- Row-by-row error reporting with line numbers
- Duplicate detection and validation
- Bulk insert with transaction handling

### Audit Logging
- All superadmin actions logged
- Before/after state tracking
- Entity type and action type categorization

### Real-Time Updates
- TanStack Query for server state management
- 5-minute stale time for analytics
- Optimistic updates for mutations

## Building for Production

```bash
npm run build
```

The build output will be in `dist/` directory.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `VITE_MAPBOX_ACCESS_TOKEN` | Mapbox API token for maps | Yes |

## Database

The platform uses Supabase PostgreSQL with the following main tables:

- `communities` - Residential communities (tenants)
- `subscription_plans` - Billing plans
- `residences` - Housing units within communities
- `gates` - Access points with GPS coordinates
- `admin_users` - Community administrators
- `audit_logs` - Superadmin action tracking

See `supabase/migrations/` for complete schema.

## Edge Functions

Located in `supabase/functions/`:

- `create-community-admin` - Creates admin users with credentials
- `reset-admin-password` - Resets passwords for admin users

## Contributing

This is a private project. For questions or issues, contact the development team.

## License

Proprietary - All rights reserved
