# Implementation Plan: Security Gate Operations Mobile Application

**Branch**: `004-security-gate-operations` | **Date**: 2025-10-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-security-gate-operations/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

The Security Gate Operations Mobile Application (Sentinel App) is a React Native + Expo mobile app for iOS and Android that enables security officers to manage gate entry/exit, verify residents/guests, process deliveries, verify construction workers, report incidents, and monitor security operations. The app integrates Bluetooth RFID readers for vehicle sticker scanning, implements offline-first architecture with WatermelonDB for reliable 8-hour shift operation without network dependency, uses expo-location for gate assignment verification and background geofencing, implements expo-barcode-scanner for guest QR code verification, supports real-time gate monitoring via Supabase Realtime subscriptions, captures entry photos and incident evidence via expo-camera, and sends push notifications for broadcast alerts and incident assignments. Key features include RFID-based resident verification, scheduled guest management with QR scanning, delivery logging with household notifications, construction permit verification with worker tracking, security incident reporting with severity escalation, real-time gate activity monitoring, and shift reporting for security heads. The system serves security_officer and security_head roles with offline sync queue that prioritizes critical items (incidents, perishable deliveries) and handles 500+ cached RFID records for offline verification.

## Technical Context

**Language/Version**: TypeScript 5.3+ (strict mode), React Native 0.73+

**Primary Dependencies**:
- **Framework**: Expo SDK 50+, React Native 0.73+
- **Navigation**: React Navigation v6 (Stack, Tab navigators)
- **Backend**: Supabase JS Client (@supabase/supabase-js v2), PostgREST, Supabase Realtime, Supabase Auth, Supabase Storage
- **Offline/State**: WatermelonDB (SQLite) for offline-first architecture (reused from Feature 003)
- **Bluetooth/RFID**: react-native-ble-plx for Bluetooth Low Energy RFID reader integration
- **Location**: expo-location with expo-task-manager for background geolocation and geofencing
- **Camera/QR**: expo-camera, expo-barcode-scanner for entry photos and guest QR verification
- **Notifications**: expo-notifications for broadcast alerts and incident assignments
- **Forms/Validation**: React Hook Form, Zod schemas
- **UI Components**: NativeWind (Tailwind CSS for React Native)
- **File Handling**: expo-file-system, expo-image-picker for incident evidence uploads

**Storage**:
- **Remote**: PostgreSQL 15+ (Supabase) via PostgREST
- **Local**: WatermelonDB (SQLite) for offline caching and sync queue

**Testing**: Jest (unit), Detox (E2E for iOS/Android), React Native Testing Library

**Target Platform**:
- iOS 13+ (iPhone, iPad)
- Android 8.0+ (API Level 26+)
- Physical devices required for hardware testing (RFID, Bluetooth, GPS, Camera)

**Project Type**: Mobile application (React Native + Expo)

**Performance Goals**:
- RFID scan → entry log: <15 seconds per vehicle
- Guest search and verification: <10 seconds
- Delivery log with photo: <30 seconds
- RFID scan success rate: >95% on first attempt
- Offline sync on reconnect: <10 seconds for queued entries
- Incident report with media: <30 seconds submission
- Live entry feed update: <5 seconds real-time
- App supports 8-hour shift without restart
- Low-power mode: 10+ hours active battery life

**Constraints**:
- Offline-first: Must work 8-hour shift without network (FR-078)
- Offline cache: 500+ RFID records for verification (SC-005)
- Sync priorities: Critical (incidents, perishable deliveries) → High (all deliveries, guests) → Normal (entries)
- Photo/video limits: 20MB per incident file
- Duplicate prevention: 2-minute window for same vehicle (FR-015)
- Background location: Geofencing for gate proximity verification
- Battery optimization: Balanced accuracy for location, minimal background usage

**Scale/Scope**:
- 7 major feature areas (entry/exit, guests, deliveries, permits, incidents, monitoring, reports)
- 20+ screens (entry logging, guest lists, delivery forms, incident reports, monitoring dashboard)
- 78 functional requirements
- Support 60 vehicles/hour throughput per officer (SC-012)
- Handle 500+ cached stickers, 50+ daily guests, 20+ gates per community

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Supabase-First Architecture** | ✅ PASS | Using Supabase JS Client for all backend operations (Auth, PostgREST, Realtime, Storage). No custom backend needed. |
| **II. Row Level Security (RLS)** | ✅ PASS | Backend tables use RLS policies (gate_entries, deliveries, incidents, etc.). Mobile app connects with security officer JWT containing officer_id/tenant_id for automatic filtering. |
| **III. Multi-Tenancy by Design** | ✅ PASS | All API calls filtered by tenant_id from officer JWT. Officers only see data for their assigned community (FR-071). |
| **IV. Database-Driven Design** | ✅ PASS | Mobile app is a consumer of existing database schema from Features 001/002. Reuses tables: gates, vehicle_stickers, households, scheduled_guests, construction_permits, deliveries. New tables: gate_entries, incidents, security_shifts. |
| **V. Explicit State Machines** | ✅ PASS | App respects state machines for incidents (reported→investigating→resolved→closed), deliveries (pending→picked_up), permits (approved only, verifies status). State transitions handled server-side. |
| **VI. Real-Time by Default** | ✅ PASS | Uses Supabase Realtime for live gate entry feed (FR-059), broadcast alerts (FR-057), incident assignments (FR-053). Subscriptions filtered by gate_id/community_id. |
| **VII. Test-First for Security** | ✅ PASS | Will test offline sync security (queued actions use authenticated JWT), RFID scanner integration, geolocation verification, incident escalation logic. E2E tests for critical flows (entry logging, incident reporting). |
| **VIII. Performance Accountability** | ✅ PASS | Defined performance targets in Technical Context. Offline-first architecture ensures 8-hour operation. RFID scan <15s, sync <10s. Low-power mode for battery life. |
| **IX. Observability** | ✅ PASS | Will log all officer actions for audit (FR-076), Expo crash reporting, sync queue status tracking, location verification logs, shift hour tracking. |
| **X. Secure by Default** | ✅ PASS | Uses Supabase anon key + officer JWT for API calls. Biometric auth with secure storage. No service_role key in mobile app. RFID codes encrypted in transit. |
| **XI. Documentation as Code** | ✅ PASS | Documented RFID integration, offline sync patterns, geolocation setup, QR scanning, background location in research.md and quickstart.md. |
| **XII. Simplicity and Pragmatism** | ✅ PASS | Using Expo managed workflow for simplicity. Reusing WatermelonDB architecture from Feature 003. Standard React Navigation patterns. |

**Overall**: ✅ **PASS** - All 12 core principles satisfied for mobile security context.

**Mobile-Specific Considerations**:
- Principle I-II: Mobile app is a **client** of existing Supabase backend from Features 001/002
- Principle III: Multi-tenancy enforced server-side via RLS; mobile app passes officer JWT automatically
- Principle VI: Realtime critical for security coordination (live feed, broadcast alerts, incident assignments)
- Principle X: Mobile apps use anon key + user auth tokens (never service_role), RFID data encrypted

**Hardware Integration Security**:
- RFID readers connect via Bluetooth (react-native-ble-plx), codes transmitted securely to backend
- Geolocation used for audit only (not enforcement), respects privacy with opt-in background tracking
- Camera permissions requested on-demand for entry photos and incident evidence

## Project Structure

### Documentation (this feature)

```
specs/004-security-gate-operations/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (COMPLETED)
├── quickstart.md        # Phase 1 output (COMPLETED)
└── spec.md              # Feature specification
```

**Note**: This mobile app does not have data-model.md or contracts/ since it consumes existing backend from Features 001/002. New tables (gate_entries, incidents, security_shifts) will be defined in Feature 002's data model.

### Source Code (repository root)

```
village-tech/
├── apps/
│   ├── residence-app/                    # Residence Mobile App (Feature 003)
│   └── sentinel-app/                     # Sentinel Mobile App (Feature 004) - THIS FEATURE
│       ├── app.json                      # Expo configuration
│       ├── App.tsx                       # Root component
│       ├── tailwind.config.js            # NativeWind config
│       ├── babel.config.js               # Babel + decorators for WatermelonDB
│       ├── eas.json                      # EAS Build configuration
│       ├── src/
│       │   ├── navigation/
│       │   │   ├── AppNavigator.tsx      # Root navigator (Stack)
│       │   │   ├── AuthNavigator.tsx     # Auth stack (Login, GateSelection)
│       │   │   └── MainNavigator.tsx     # Main tab navigator
│       │   ├── screens/
│       │   │   ├── auth/                 # Login, GateSelection, ClockIn
│       │   │   ├── entry/                # EntryLog, VehicleEntry, ExitLog
│       │   │   ├── guest/                # GuestList, GuestVerification, GuestDetail
│       │   │   ├── delivery/             # DeliveryLog, DeliveryDetails
│       │   │   ├── construction/         # PermitList, WorkerEntry, WorkerExit
│       │   │   ├── incident/             # IncidentReport, IncidentList, IncidentDetail
│       │   │   ├── monitoring/           # GateMonitoring, BroadcastAlert, ShiftReport
│       │   │   └── settings/             # Profile, RFIDSettings, LocationSettings
│       │   ├── components/
│       │   │   ├── ui/                   # Button, Card, Input, Badge, StatusIndicator
│       │   │   ├── rfid/                 # RFIDScanner, RFIDStatus, DeviceList
│       │   │   ├── camera/               # PhotoCapture, QRScanner
│       │   │   ├── lists/                # EntryCard, GuestCard, DeliveryCard, IncidentCard
│       │   │   └── shared/               # Header, OfflineIndicator, SyncStatus
│       │   ├── database/
│       │   │   ├── schema.ts             # WatermelonDB schema
│       │   │   ├── models/               # GateEntry, Sticker, Guest, Delivery, Permit, Incident, SyncQueue
│       │   │   └── index.ts              # Database initialization
│       │   ├── services/
│       │   │   ├── rfid/
│       │   │   │   └── RFIDService.ts    # Bluetooth RFID integration (react-native-ble-plx)
│       │   │   ├── location/
│       │   │   │   └── LocationService.ts # Geolocation + background tracking (expo-location)
│       │   │   ├── sync/
│       │   │   │   └── SyncService.ts    # Offline sync queue with priority
│       │   │   └── notifications/
│       │   │       └── NotificationService.ts # Push notifications (expo-notifications)
│       │   └── lib/
│       │       └── supabase.ts           # Supabase client init
│       └── assets/
└── supabase/
    └── migrations/                        # Shared Supabase schema (Features 001/002/003/004)
```

**Structure Decision**: Mobile application structure (Option 3 from template). Sentinel app is a standalone Expo mobile app in `apps/sentinel-app/` similar to `apps/residence-app/` from Feature 003. Both apps share the same Supabase backend defined in `supabase/` directory. Key architectural decisions:

1. **Reused Architecture**: Follows Feature 003's proven Expo + WatermelonDB + NativeWind pattern
2. **Hardware Integration**: New services for RFID (Bluetooth), geolocation (background tracking), QR scanning
3. **Offline-First**: WatermelonDB with priority-based sync queue (critical→high→normal)
4. **Feature-Based Screens**: Organized by security workflow (entry, guest, delivery, construction, incident, monitoring)
5. **Shared Backend**: Consumes existing Supabase tables + new security-specific tables (gate_entries, incidents)

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
