# Sentinel Security Mobile App

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Expo CLI: `npm install -g @expo/cli`
- Supabase project with database access
- Physical device (iOS/Android) or simulator

### Setup Instructions

#### 1. **Database Migration**
Since you already have an existing database schema, you only need to run the new migration:

```sql
-- In your Supabase SQL editor, run:
-- This adds the security-specific tables for the Sentinel app
```

Copy the contents of: `supabase/migrations/20251020000001_security_sentinel_tables.sql`

#### 2. **Environment Setup**
```bash
# Navigate to the app directory
cd apps/sentinel-app

# Copy environment template
cp .env.example .env

# Edit .env with your Supabase credentials:
```

Update these values in `.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

#### 3. **Install Dependencies**
```bash
# Install dependencies (use legacy peer deps for compatibility)
npm install --legacy-peer-deps
```

#### 4. **Run the App**
```bash
# Start the development server
npx expo start

# Then choose your platform:
# - Press 'i' for iOS simulator
# - Press 'a' for Android emulator
# - Scan QR code with Expo Go app for physical device
```

## 📱 App Features

### Core Functionality
- **Vehicle Entry Management**: RFID scanning and manual vehicle registration
- **Guest Verification**: Complete guest registration and tracking system
- **Delivery Tracking**: Package and delivery management with photo documentation
- **Real-time Monitoring**: Live status updates and notifications
- **Offline Support**: Sync queue for offline operations

### Security Features
- **Multi-tenant Architecture**: Row-level security for data isolation
- **Role-based Access**: Security officers, heads, and admins
- **Audit Trail**: Complete logging of all activities
- **Photo Documentation**: Visual proof for all operations
- **Authentication Integration**: Supabase Auth with JWT tokens

### Technical Stack
- **Frontend**: React Native 0.73+ with TypeScript
- **Backend**: Supabase (PostgreSQL + Realtime + Auth)
- **State Management**: React Context + Hooks
- **Navigation**: React Navigation with stack navigators
- **UI Components**: Custom component library with dark mode support
- **Bluetooth LE**: RFID scanner integration (iOS/Android native)

## 🗄️ Database Schema

The app uses your existing database with these key tables:

### Core Tables (Already Exist)
- `communities` - Tenant management
- `households` - Household and residence management
- `vehicle_stickers` - Vehicle registration and RFID codes
- `scheduled_guests` - Guest pre-registration
- `admin_users` - Security officer accounts

### New Security Tables (Added by Migration)
- `security_shifts` - Officer shift management
- `gate_entries` (enhanced) - Complete vehicle entry/exit logging
- `guest_access_logs` - Guest check-in/check-out tracking
- `deliveries` - Package and delivery management

## 🔧 Configuration

### Supabase Setup
1. **Enable Row Level Security** on all tables
2. **Configure JWT** extraction for tenant_id
3. **Set up Realtime** subscriptions for live updates
4. **Configure Storage** for photo uploads

### Security Officer Roles
Your existing `admin_users` table supports these roles:
- `admin_head` - Primary security administrator
- `admin_officer` - Regular security officers
- `superadmin` - System administrator

### Authentication
The app uses Supabase Auth with JWT tokens containing:
- `user_id` - The officer's user ID
- `tenant_id` - The community/organization ID
- `app_metadata.role` - Officer's role and permissions

## 📋 Required Permissions

### Supabase Database
- `SELECT`, `INSERT`, `UPDATE`, `DELETE` on all tables
- `EXECUTE` on all stored procedures
- Storage bucket access for photos

### Security Officers Need
- Read access to households, residents, stickers
- Write access to gate entries, guest logs, deliveries
- Access to their own shift information

## 🐛 Troubleshooting

### Common Issues

**Metro bundler issues:**
```bash
npx expo start -c
```

**Dependency conflicts:**
```bash
npm install --legacy-peer-deps
```

**Supabase connection issues:**
- Verify environment variables
- Check RLS policies
- Confirm JWT extraction logic

**RFID scanner not working:**
- Check Bluetooth permissions
- Verify device compatibility
- Test with different RFID readers

**Photos not uploading:**
- Check Storage bucket permissions
- Verify file size limits
- Test with smaller images

### Environment Variables Not Loading
- Ensure `.env` file is in the correct directory
- Restart the Metro bundler after changing variables
- Verify variables start with `EXPO_PUBLIC_`

## 📚 Development Notes

### File Structure
```
apps/sentinel-app/
├── src/
│   ├── components/     # Reusable UI components
│   ├── contexts/        # React contexts (Theme, Auth)
│   ├── lib/            # Utilities and services
│   ├── navigation/     # App navigation setup
│   ├── screens/        # App screens
│   └── services/       # API and business logic
├── database/
│   └── migrations/     # Database schema files
└── .env.example       # Environment template
```

### Key Patterns
- **Component-driven architecture** with reusable UI components
- **Context providers** for theme and authentication state
- **Service layer** for API calls and business logic
- **TypeScript strict mode** for type safety
- **Error boundaries** for graceful error handling

### API Integration
The app uses Supabase client directly with these patterns:
- **Real-time subscriptions** for live updates
- **RLS policies** for data security
- **Stored procedures** for complex operations
- **File uploads** via Supabase Storage

## 🚀 Deployment

### Expo Development Build
```bash
# Build for development
npx expo install --fix
npx expo run:ios     # or run:android
```

### Production Build
```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Configure build
eas build:configure

# Build for production
eas build --platform ios
eas build --platform android
```

## 📞 Support

For issues related to:
- **App functionality**: Check this README and troubleshoot section
- **Database issues**: Review Supabase logs and RLS policies
- **Supabase setup**: Consult Supabase documentation
- **RFID hardware**: Refer to device manufacturer documentation

## 📄 License

This project follows the same license as the main village-tech repository.