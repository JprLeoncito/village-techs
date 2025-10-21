# Village Techs 🏘️

A comprehensive **Homeowners Association (HOA) Management Platform** designed to streamline residential community operations. This multi-tenant SaaS application provides an all-in-one solution for managing residential communities, their residents, facilities, and administrative operations.

## 🌟 Features

### Multi-Tenant Platform
- **Platform Dashboard**: Superadmin management for creating and configuring residential communities
- **Admin Dashboard**: HOA administration for household management, vehicle stickers, permits, and communications
- **Residence App**: Mobile application for residents to access community services
- **Sentinel App**: Security mobile application for gate operations and access control

### Core Capabilities
- 🔐 **Multi-tenant Architecture**: Secure isolation between residential communities
- 🏠 **Household Management**: Resident registration, member management, and occupancy tracking
- 🚗 **Vehicle Access Control**: RFID-enabled vehicle sticker system with approval workflows
- 🏗️ **Construction Permits**: Home improvement permit management with fee collection
- 💰 **Association Fee Management**: HOA dues tracking, payment processing, and receipt generation
- 📢 **Community Communications**: Targeted announcements and resident notifications
- 🛡️ **Security Operations**: Gate access monitoring, incident reporting, and security analytics
- 📊 **Analytics & Reporting**: Comprehensive dashboards and data insights

## 🏗️ Architecture

### Technology Stack

#### Backend & Database
- **PostgreSQL 15+** with **Supabase** (multi-tenant architecture)
- **Row-Level Security (RLS)** for complete tenant isolation
- **Edge Functions** for specialized operations
- **RPC Functions** for efficient database operations

#### Frontend Applications
- **Platform Dashboard**: React + Vite + TypeScript + Tailwind CSS
- **Admin Dashboard**: React + Vite + TypeScript + Radix UI + Tailwind CSS
- **Mobile Apps**: React Native + Expo + TypeScript + NativeWind

#### Key Technologies
- **TypeScript 5.3+** (strict mode across all applications)
- **React 18+** for web applications
- **React Native 0.81+** for mobile applications
- **Zustand** for state management
- **TanStack Query** for data fetching
- **React Hook Form + Zod** for form validation
- **Mapbox GL** for mapping functionality
- **Recharts** for data visualization

### Database Design
The system features a sophisticated multi-tenant database architecture with 15+ core tables:

- **Multi-tenancy**: Complete data isolation using Row-Level Security
- **Core entities**: Communities, residences, gates, households, members
- **Operations**: Vehicle stickers, construction permits, association fees, announcements
- **Security**: Gate entries, incident reports, audit logs
- **Analytics**: Materialized views for reporting and insights

## 📱 Applications

### 1. Platform Dashboard (Superadmin)
- Create and manage residential communities
- Configure subscription plans and infrastructure
- Monitor platform-wide analytics and health
- Manage tenant onboarding and support

### 2. Admin Dashboard (HOA Management)
- **Household Management**: Register residents, manage household members and beneficial users
- **Vehicle Stickers**: Approve/reject vehicle access requests, manage RFID codes
- **Association Fees**: Create fee records, track payments, generate receipts
- **Construction Permits**: Review home improvement requests, manage road fees
- **Announcements**: Community communication with targeted audiences
- **Security Monitoring**: Gate entry logs, incident reports, and analytics

### 3. Residence App (Resident Mobile)
- **Vehicle Sticker Requests**: Apply for access, track status, manage renewals
- **Guest Management**: Schedule visitors, generate QR passes, receive arrival notifications
- **Fee Payments**: Mobile payment processing, receipt access, payment history
- **Construction Permits**: Submit requests, pay fees, track project status
- **Delivery Notifications**: Package tracking and confirmation
- **Household Management**: Add members, manage beneficial users

### 4. Sentinel App (Security Mobile)
- **Gate Operations**: Manage entry/exit of residents, guests, deliveries, construction workers
- **Real-time Tracking**: Monitor individuals and vehicles passing through community gates
- **Incident Reporting**: Log and manage security events
- **Access Control**: RFID scanning, QR code validation, manual verification

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase CLI
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/village-techs.git
   cd village-techs
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase configuration
   ```

3. **Set up Supabase**
   ```bash
   supabase start
   supabase db reset
   ```

4. **Install dependencies**
   ```bash
   # Install dependencies for all apps
   npm run install:all
   ```

5. **Start development servers**
   ```bash
   # Start all applications in development mode
   npm run dev
   ```

### Environment Configuration
See `.env.example` for required environment variables:
- Supabase configuration (URL, keys, database URL)
- External services (payment gateways, email, SMS)
- Development settings

## ⚙️ Supabase Local Development Setup

### 1. Install Supabase CLI

```bash
# Using npm
npm install -g supabase

# Or using other package managers
# yarn global add supabase
# brew install supabase/tap/supabase
```

### 2. Initialize Supabase Project

```bash
# Start local Supabase services
supabase start

# This will start:
# - PostgreSQL database (port 54322)
# - Supabase API (port 54321)
# - Studio (port 54323) - Web interface
# - Storage API (port 54321)
# - Auth server (port 54321)
```

### 3. Database Setup

```bash
# Reset database with initial schema
supabase db reset

# Apply migrations
supabase db push

# Generate TypeScript types
supabase gen types typescript --local > types/supabase.ts
```

### 4. Local Supabase Services URLs

When running locally, Supabase provides these services:

| Service | URL | Description |
|---------|-----|-------------|
| API | `http://127.0.0.1:54321` | RESTful API and GraphQL |
| Studio | `http://127.0.0.1:54323` | Database management UI |
| Database | `postgresql://localhost:54322` | Direct database connection |
| Auth | `http://127.0.0.1:54321/auth/v1` | Authentication service |
| Storage | `http://127.0.0.1:54321/storage/v1` | File storage |

### 5. Environment Variables Configuration

Copy and configure your environment file:

```bash
cp .env.example .env
```

**Required Supabase Configuration:**
```env
# ===========================================
# SUPABASE CONFIGURATION
# ===========================================
# Get these values from: supabase start
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_KEY=your_supabase_service_key_here
SUPABASE_DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres

# Supabase Storage (S3-compatible)
SUPABASE_STORAGE_URL=http://127.0.0.1:54321/storage/v1/s3
S3_ACCESS_KEY=your_s3_access_key_here
S3_SECRET_KEY=your_s3_secret_key_here
S3_REGION=local

# ===========================================
# EXTERNAL SERVICES (Optional for development)
# ===========================================
# Payment Gateways - Add your keys when ready to implement payments
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
PAYMONGO_SECRET_KEY=
PAYMONGO_PUBLIC_KEY=

# Email Service - Add your API key when ready to send emails
SENDGRID_API_KEY=
FROM_EMAIL=noreply@villagetech.ph

# SMS Service - Add your credentials when ready to send SMS
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Monitoring - Add your DSN when ready to implement error tracking
SENTRY_DSN=

# ===========================================
# DEVELOPMENT CONFIGURATION
# ===========================================
NODE_ENV=development
```

**Getting Your Supabase Keys:**
1. Run `supabase start` in your project root
2. Copy the values from the terminal output:
   ```
   API URL: http://127.0.0.1:54321
   anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
3. Replace the placeholder values in your `.env` file

## 📱 Application Configuration

### Platform Dashboard (Superadmin)

**Location**: `apps/platform-dashboard`

**Configuration**:
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**Development Commands**:
```bash
cd apps/platform-dashboard
npm install
npm run dev          # Development server (http://localhost:5173)
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # ESLint check
npm run type-check   # TypeScript check
```

### Admin Dashboard (HOA Management)

**Location**: `apps/admin-dashboard`

**Configuration**:
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**Development Commands**:
```bash
cd apps/admin-dashboard
npm install
npm run dev          # Development server (http://localhost:5174)
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # ESLint check
npm run type-check   # TypeScript check
```

### Residence App (Resident Mobile)

**Location**: `apps/residence-app`

**Configuration**:
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**Development Commands**:
```bash
cd apps/residence-app
npm install
npx expo start         # Start Expo development server
npx expo start --android  # Start for Android
npx expo start --ios     # Start for iOS
npx expo start --web     # Start for web
```

**Mobile App Environment Variables**:
```bash
# For React Native/Expo apps
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
```

### Sentinel App (Security Mobile)

**Location**: `apps/sentinel-app`

**Configuration**:
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**Development Commands**:
```bash
cd apps/sentinel-app
npm install
npx expo start         # Start Expo development server
npx expo start --android  # Start for Android
npx expo start --ios     # Start for iOS
npx expo start --web     # Start for web
```

## 🔄 Development Workflow

### 1. Database Development

```bash
# Create new migration
supabase migration new add_new_feature

# Edit migration file in supabase/migrations/
# Apply changes
supabase db push

# Reset if needed
supabase db reset
```

### 2. TypeScript Types Generation

```bash
# Generate types for all apps
supabase gen types typescript --local > types/supabase.ts

# Copy to each app directory
cp types/supabase.ts apps/platform-dashboard/src/types/
cp types/supabase.ts apps/admin-dashboard/src/types/
cp types/supabase.ts apps/residence-app/src/types/
cp types/supabase.ts apps/sentinel-app/src/types/
```

### 3. Running All Applications

**Root Level Commands** (if configured in root package.json):
```bash
# Install all dependencies
npm run install:all

# Start all development servers
npm run dev:all

# Run tests across all apps
npm run test:all

# Lint all applications
npm run lint:all
```

**Manual Start (Individual)**:
```bash
# Terminal 1: Platform Dashboard
cd apps/platform-dashboard && npm run dev

# Terminal 2: Admin Dashboard
cd apps/admin-dashboard && npm run dev

# Terminal 3: Residence App
cd apps/residence-app && npx expo start

# Terminal 4: Sentinel App
cd apps/sentinel-app && npx expo start
```

### 4. Database Seeding

```bash
# Run seed scripts to populate initial data
supabase db seed

# Or use custom seed script
node scripts/seed-database.js
```

## 🌐 Local URLs Summary

| Application | Local URL | Port |
|-------------|-----------|------|
| Platform Dashboard | http://localhost:5173 | 5173 |
| Admin Dashboard | http://localhost:5174 | 5174 |
| Residence App (Web) | http://localhost:8081 | 8081 |
| Sentinel App (Web) | http://localhost:8082 | 8082 |
| Supabase Studio | http://localhost:54323 | 54323 |
| Supabase API | http://localhost:54321 | 54321 |

## 🛠️ Troubleshooting

### Common Issues

**1. Supabase fails to start:**
```bash
# Check Docker is running
docker --version

# Reset Supabase completely
supabase stop
supabase start
```

**2. Database connection issues:**
```bash
# Check database status
supabase status

# Verify database URL
echo $SUPABASE_DB_URL
```

**3. Port conflicts:**
```bash
# Check what's using ports
netstat -an | grep 54321
netstat -an | grep 5173

# Kill processes if needed
kill -9 <PID>
```

**4. Environment variables not working:**
```bash
# Verify .env file exists and is properly formatted
cat .env

# Restart development servers after changing .env
```

### Development Tips

- Use **Supabase Studio** (`http://localhost:54323`) for database management
- Check **supabase/logs/** for debugging information
- Run **`supabase test db`** to test database connections
- Use **`supabase db diff`** to see schema changes
- Always **restart servers** after changing environment variables

## 📊 Project Status

### Implementation Progress
- **Database Schema**: ✅ 100% Complete
- **Backend Infrastructure**: ✅ 100% Complete
- **Platform Dashboard**: 🟡 Infrastructure Complete
- **Admin Dashboard**: 🟡 15% Complete (Backend 100%, Frontend 0% features)
- **Residence App**: 🟡 Early Development
- **Sentinel App**: 🟡 Early Development

### Next Priorities
1. Complete admin dashboard frontend (households + stickers = MVP)
2. Implement resident mobile app core features
3. Build security app for gate operations
4. Add comprehensive testing frameworks
5. Implement automated processes and notifications

## 🏛️ Database Schema

The platform uses a comprehensive multi-tenant database architecture. Key tables include:

- **communities**: Residential community tenants
- **residences**: Individual housing units
- **households**: Resident occupancy records
- **vehicle_stickers**: Vehicle access authorization
- **construction_permits**: Home improvement permits
- **association_fees**: Financial management
- **announcements**: Community communications
- **gate_entries**: Security access logs

For complete ERD documentation, see `database-erd.md`.

## 🔐 Security Features

- **Multi-tenant isolation** using Row-Level Security (RLS)
- **Role-based access control** (superadmin, admin_head, admin_officer, household_head, etc.)
- **JWT authentication** integration
- **Comprehensive audit logging** of all administrative actions
- **Soft deletes** for data preservation
- **Input validation** and sanitization

## 🧪 Testing

```bash
# Run tests for all applications
npm test

# Run linting
npm run lint

# Type checking
npm run type-check
```

## 📚 Documentation

- **Database ERD**: `database-erd.md`
- **Feature Specifications**: `specs/` directory
- **Project Notes**: `village_tech_notes.md`
- **Development Guidelines**: `CLAUDE.md`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript strict mode conventions
- Use the established component patterns
- Write tests for new features
- Update documentation as needed


## 🆘 Support

For support and questions:
- Create an issue in this repository
- Check the documentation in the `docs/` directory
- Review the feature specifications in `specs/`

---

**Village Techs** - Modernizing HOA management for residential communities 🏘️

