# Tasks: Security Gate Operations Mobile Application (Sentinel App)

**Input**: Design documents from `/specs/004-security-gate-operations/`
**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
- Mobile app structure: `apps/sentinel-app/src/`
- Shared backend: `supabase/` (from Features 001/002)

---

## Phase 1: Setup (Shared Infrastructure) ✅ COMPLETE

**Purpose**: Project initialization and Expo mobile app structure

- [X] T001 Create Expo TypeScript project at apps/sentinel-app/ using expo-template-blank-typescript
- [X] T002 Install Expo SDK 50+ dependencies (expo-location, expo-task-manager, expo-camera, expo-barcode-scanner, expo-notifications, expo-local-authentication, expo-image-picker) in apps/sentinel-app/package.json
- [X] T003 [P] Install WatermelonDB dependencies (@nozbe/watermelondb, @nozbe/with-observables, @react-native-async-storage/async-storage) in apps/sentinel-app/package.json
- [X] T004 [P] Install react-native-ble-plx for Bluetooth RFID reader integration in apps/sentinel-app/package.json
- [X] T005 [P] Install React Navigation dependencies (@react-navigation/native, @react-navigation/native-stack, @react-navigation/bottom-tabs, react-native-screens, react-native-safe-area-context) in apps/sentinel-app/package.json
- [X] T006 [P] Install NativeWind and Tailwind CSS dependencies (nativewind, tailwindcss@3.3.2) in apps/sentinel-app/package.json
- [X] T007 [P] Install Supabase client (@supabase/supabase-js v2) and utilities (date-fns, zustand, react-hook-form, zod) in apps/sentinel-app/package.json
- [X] T008 Configure tailwind.config.js with custom security theme colors (primary blue, danger red, success green, warning orange) in apps/sentinel-app/tailwind.config.js
- [X] T009 Configure babel.config.js with NativeWind and decorators plugin for WatermelonDB in apps/sentinel-app/babel.config.js
- [X] T010 Configure app.json with iOS/Android permissions (Bluetooth, Location, Camera, Push Notifications, Background Modes) in apps/sentinel-app/app.json
- [X] T011 Create .env.example with Supabase URL and anon key placeholders in apps/sentinel-app/.env.example
- [X] T012 Configure EAS Build (eas.json) with development, preview, and production profiles for iOS/Android in apps/sentinel-app/eas.json
- [X] T013 [P] Create TypeScript path aliases (@/components, @/screens, @/services, @/database, @/lib) in apps/sentinel-app/tsconfig.json

---

## Phase 2: Foundational (Blocking Prerequisites) ✅ COMPLETE

**Purpose**: Core Supabase-first infrastructure, RFID integration, real-time subscriptions that MUST be complete before ANY user story can be implemented

**⚠️ COMPLETED**: All foundational services implemented, ready for user story development

### Supabase Client and Authentication

- [X] T044 Initialize Supabase client with AsyncStorage persistence, autoRefreshToken, and detectSessionInUrl=false in apps/sentinel-app/src/lib/supabase.ts
- [X] T045 Create AuthContext with security officer login, logout, session persistence, and officer role verification (security_officer, security_head) in apps/sentinel-app/src/lib/AuthContext.tsx
- [X] T046 Implement useAuth hook exposing officer, loading, signIn, signOut, and isSecurityHead methods in apps/sentinel-app/src/lib/AuthContext.tsx

### RFID Reader Integration (Bluetooth)

- [X] T023 Create RFIDService class with BleManager from react-native-ble-plx in apps/sentinel-app/src/services/rfid/RFIDService.ts
- [X] T024 Implement RFID reader scanning (scanForRFIDReaders with UUIDs, 10-second scan window) in RFIDService.scanForRFIDReaders method
- [X] T025 Implement RFID reader connection (connectToRFIDReader, discoverServicesAndCharacteristics, monitorCharacteristicForService) in RFIDService.connectToRFIDReader method
- [X] T026 Implement RFID data parsing (base64 decode, hex conversion) and emit rfid:scanned event in RFIDService.parseRFIDData and onRFIDScanned methods
- [X] T027 Implement disconnect and cleanup logic in RFIDService.disconnect method
- [X] T028 Create useRFIDScanner React hook (state: rfidCode, isConnected; methods: scanForReaders, connectReader, disconnectReader) in apps/sentinel-app/src/services/rfid/RFIDService.ts

### Geolocation and Background Tracking

- [X] T029 Create LocationService class with expo-location and expo-task-manager in apps/sentinel-app/src/services/location/LocationService.ts
- [X] T030 Implement foreground and background location permission requests in LocationService.requestPermissions method
- [X] T031 Define background location task (BACKGROUND_LOCATION_TASK) with TaskManager.defineTask for shift tracking in LocationService
- [X] T032 Implement startShiftTracking method with foreground service notification (Android) and background updates (5-min interval, 50m distance) in LocationService.startShiftTracking method
- [X] T033 Implement stopShiftTracking to stop background location updates on clock-out in LocationService.stopShiftTracking method
- [X] T034 Implement verifyAtGate method with getCurrentPositionAsync and Haversine distance calculation (100m radius) in LocationService.verifyAtGate method
- [X] T035 Implement handleLocationUpdate to log shift coverage and emit location:outside-gate event if officer leaves gate area in LocationService.handleLocationUpdate method
- [X] T036 Create useGateVerification React hook (state: isAtGate, distance; method: verifyLocation) in apps/sentinel-app/src/services/location/LocationService.ts

### Offline Sync Queue with Priority

- [X] T037 Create SyncService class with priority-based sync queue (1=critical, 2=high, 3=normal) in apps/sentinel-app/src/services/sync/SyncService.ts
- [X] T038 Implement syncQueuedEntries method to process sync_queue items sorted by priority and created_at in SyncService.syncQueuedEntries method
- [X] T039 Implement syncItem method with entity type routing (gate_entry, delivery, incident) and Supabase insert operations in SyncService.syncItem method
- [X] T040 Implement queueEntry method to add items to sync_queue with priority (critical for incidents/perishable, high for deliveries, normal for entries) in SyncService.queueEntry method
- [X] T041 Implement isOnline check with lightweight Supabase query to detect network connectivity in SyncService.isOnline method
- [X] T042 Implement retry logic for failed sync attempts with exponential backoff and error logging in SyncService.syncItem method
- [X] T043 Implement conflict resolution strategy (server-wins) for sync conflicts in SyncService.syncItem method

### Supabase Client and Authentication

- [ ] T044 Initialize Supabase client with AsyncStorage persistence, autoRefreshToken, and detectSessionInUrl=false in apps/sentinel-app/src/lib/supabase.ts
- [ ] T045 Create AuthContext with security officer login, logout, session persistence, and officer role verification (security_officer, security_head) in apps/sentinel-app/src/lib/AuthContext.tsx
- [ ] T046 Implement useAuth hook exposing officer, loading, signIn, signOut, and isSecurityHead methods in apps/sentinel-app/src/lib/AuthContext.tsx

### Real-Time Subscriptions (Supabase Realtime)

- [X] T047 Create RealtimeService class to manage Supabase Realtime subscriptions in apps/sentinel-app/src/services/realtime/RealtimeService.ts
- [X] T048 Implement subscribeToGateEntries (filtered by gate_id) to receive live entry feed updates in RealtimeService.subscribeToGateEntries method
- [X] T049 Implement subscribeToBroadcastAlerts (filtered by community/tenant) to receive security_head broadcast notifications in RealtimeService.subscribeToBroadcastAlerts method
- [X] T050 Implement subscribeToIncidentAssignments (filtered by officer_id) to receive assigned incident notifications in RealtimeService.subscribeToIncidentAssignments method
- [X] T051 Implement unsubscribe and cleanup logic for all Realtime channels in RealtimeService.unsubscribeAll method

### Push Notifications

- [X] T052 Create NotificationService class with expo-notifications in apps/sentinel-app/src/services/notifications/NotificationService.ts
- [X] T053 Implement registerForPushNotifications with permission requests, Expo push token retrieval, and Android notification channel setup in NotificationService.registerForPushNotifications method
- [X] T054 Implement sendLocalNotification for immediate local notifications (broadcast alerts, incident assignments) in NotificationService.sendLocalNotification method
- [X] T055 Configure notification handler with shouldShowAlert, shouldPlaySound, shouldSetBadge in apps/sentinel-app/src/services/notifications/NotificationService.ts

### Navigation Structure

- [X] T056 Create AuthNavigator with Stack navigator (Login, GateSelection, ClockIn screens) in apps/sentinel-app/src/navigation/AuthNavigator.tsx
- [X] T057 Create MainNavigator with Bottom Tab navigator (Entry, Guests, Deliveries, Incidents, Monitoring tabs) in apps/sentinel-app/src/navigation/MainNavigator.tsx
- [X] T058 Create AppNavigator with conditional rendering (AuthNavigator if not authenticated, MainNavigator if authenticated) in apps/sentinel-app/src/navigation/AppNavigator.tsx
- [X] T059 [P] Create reusable UI components (Button, Card, Input, Badge, StatusIndicator) with NativeWind styling in apps/sentinel-app/src/components/ui/
- [X] T060 [P] Create shared components (Header, OfflineIndicator, SyncStatus) for global app UI in apps/sentinel-app/src/components/shared/

**Checkpoint**: ✅ Foundation ready - Supabase integration operational, RFID service working, real-time subscriptions configured, sync service with priority queue implemented, user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Process Resident and Vehicle Entry (Priority: P1) 🎯 MVP

**Goal**: Enable security officers to scan RFID stickers, view household information, verify sticker validity, log entry/exit events with photos, and maintain offline entry records

**Independent Test**: Scan RFID sticker → view household details and sticker status → log entry with entry type and photo → record exit → verify entries sync when online

### Implementation for User Story 1

- [ ] T061 [P] [US1] Create RFIDScanner component with device scanning, connection UI, and connection status indicator in apps/sentinel-app/src/components/rfid/RFIDScanner.tsx
- [ ] T062 [P] [US1] Create RFIDStatus component displaying current RFID scan result, household info, sticker status badge (active/expired) in apps/sentinel-app/src/components/rfid/RFIDStatus.tsx
- [ ] T063 [P] [US1] Create PhotoCapture component with expo-camera for entry photo capture (vehicle, driver) in apps/sentinel-app/src/components/camera/PhotoCapture.tsx
- [ ] T064 [P] [US1] Create EntryCard list component displaying recent entries with timestamp, entry type badge, vehicle plate, officer in apps/sentinel-app/src/components/lists/EntryCard.tsx
- [ ] T065 [US1] Create VehicleEntryScreen with RFID scan button, manual plate input fallback, household display, and sticker validation logic in apps/sentinel-app/src/screens/entry/VehicleEntryScreen.tsx
- [ ] T066 [US1] Implement RFID scan handler that queries local stickers collection by rfid_code and displays household info in VehicleEntryScreen
- [ ] T067 [US1] Implement sticker expiry validation logic (flag expired stickers, highlight expiring within 7 days) in VehicleEntryScreen
- [ ] T068 [US1] Implement manual vehicle plate input form with validation for RFID scan failures in VehicleEntryScreen
- [ ] T069 [US1] Create EntryLogScreen with entry type selector (resident, guest, delivery, construction, visitor), photo capture, notes input in apps/sentinel-app/src/screens/entry/EntryLogScreen.tsx
- [ ] T070 [US1] Implement logEntry method to create GateEntry record in local WatermelonDB with synced=false flag in EntryLogScreen
- [ ] T071 [US1] Implement queueEntrySync to add entry to sync_queue with priority=3 (normal) for background sync in EntryLogScreen
- [ ] T072 [US1] Implement duplicate entry prevention logic (check gate_entries for same vehicle_plate within 2-minute window) in EntryLogScreen
- [ ] T073 [US1] Implement entry photo upload to Supabase Storage with offline queueing if network unavailable in EntryLogScreen
- [ ] T074 [US1] Create ExitLogScreen with vehicle plate search, match to entry, and exit timestamp recording in apps/sentinel-app/src/screens/entry/ExitLogScreen.tsx
- [ ] T075 [US1] Implement linkExitToEntry logic to update GateEntry record with exit timestamp and direction='out' in ExitLogScreen
- [ ] T076 [US1] Implement entry list view with filters (today, entry type) and real-time updates from Realtime subscription in apps/sentinel-app/src/screens/entry/EntryListScreen.tsx
- [ ] T077 [US1] Add entry details modal with full household info, photos, entry/exit times, officer details in apps/sentinel-app/src/screens/entry/EntryDetailsModal.tsx
- [ ] T078 [US1] Implement allow/deny entry decision flow with required override reason for expired/rejected stickers in VehicleEntryScreen
- [ ] T079 [US1] Add sync status indicator showing queued entries count and last sync timestamp in Entry tab

**Checkpoint**: User Story 1 complete - officers can scan RFID stickers, verify residents, log entries/exits offline, and sync when online

---

## Phase 4: User Story 2 - Verify and Process Scheduled Guests (Priority: P1) 🎯 MVP

**Goal**: Enable security officers to view scheduled guest list, search for expected visitors, verify guest details with QR codes, mark arrivals, and notify households

**Independent Test**: View guest list → search by name/household → scan QR code → verify guest details → mark as arrived → household receives notification → record departure

### Implementation for User Story 2

- [ ] T080 [P] [US2] Create QRScanner component with expo-barcode-scanner, torch toggle, and scan area overlay in apps/sentinel-app/src/components/camera/QRScanner.tsx
- [ ] T081 [P] [US2] Create GuestCard list component displaying guest details (name, household, vehicle plate, expected arrival, visit type badge) in apps/sentinel-app/src/components/lists/GuestCard.tsx
- [ ] T082 [US2] Create GuestListScreen with scheduled guests for current date, sorted by expected arrival time in apps/sentinel-app/src/screens/guest/GuestListScreen.tsx
- [ ] T083 [US2] Implement guest list query from local scheduled_guests collection filtered by arrival_status='scheduled' and expected_arrival date in GuestListScreen
- [ ] T084 [US2] Implement guest search with filters (guest name, household name, phone number, vehicle plate) in GuestListScreen
- [ ] T085 [US2] Create GuestVerificationScreen with QR scanner, guest details display, and arrival confirmation button in apps/sentinel-app/src/screens/guest/GuestVerificationScreen.tsx
- [ ] T086 [US2] Implement QR code scan handler that queries scheduled_guests by qr_code and displays full guest details in GuestVerificationScreen
- [ ] T087 [US2] Implement guest arrival validation (check expected arrival time, flag early/late arrivals) in GuestVerificationScreen
- [ ] T088 [US2] Implement markGuestAsArrived method to update ScheduledGuest record with arrival_status='arrived' and arrived_at timestamp in GuestVerificationScreen
- [ ] T089 [US2] Implement household arrival notification via Supabase Edge Function (send push notification to resident app) with retry on failure in GuestVerificationScreen
- [ ] T090 [US2] Queue notification in sync_queue with priority=2 (high) if offline for delivery when online in GuestVerificationScreen
- [ ] T091 [US2] Create WalkInGuestScreen for unexpected guests with household search, call-to-confirm button, and manual guest entry form in apps/sentinel-app/src/screens/guest/WalkInGuestScreen.tsx
- [ ] T092 [US2] Implement household phone call initiation with React Native Linking API for walk-in guest confirmation in WalkInGuestScreen
- [ ] T093 [US2] Implement logWalkInVisitor method to create ScheduledGuest record with arrival_status='arrived' after household approval in WalkInGuestScreen
- [ ] T094 [US2] Create GuestDepartureScreen with guest search by name/household and departure recording in apps/sentinel-app/src/screens/guest/GuestDepartureScreen.tsx
- [ ] T095 [US2] Implement markGuestAsDeparted method to update ScheduledGuest record with departed_at timestamp in GuestDepartureScreen
- [ ] T096 [US2] Add guest history view showing all arrivals/departures for the day with status filters in GuestListScreen

**Checkpoint**: User Story 2 complete - officers can verify scheduled guests with QR codes, mark arrivals, notify households, and handle walk-in visitors

---

## Phase 5: User Story 3 - Log and Track Deliveries (Priority: P1) 🎯 MVP

**Goal**: Enable security officers to log package arrivals, capture delivery photos, mark perishable items, send household notifications, and track delivery handoffs

**Independent Test**: Log delivery with service name and tracking number → take package photo → mark as perishable → household receives notification → track handoff confirmation

### Implementation for User Story 3

- [ ] T097 [P] [US3] Create DeliveryCard list component displaying delivery details (service name, tracking number, household, perishable badge, pickup status) in apps/sentinel-app/src/components/lists/DeliveryCard.tsx
- [ ] T098 [US3] Create DeliveryLogScreen with delivery service input (LBC, JRS, Lalamove, etc.), tracking number, household search in apps/sentinel-app/src/screens/delivery/DeliveryLogScreen.tsx
- [ ] T099 [US3] Implement household search with autocomplete from local stickers/scheduled_guests collections in DeliveryLogScreen
- [ ] T100 [US3] Implement delivery photo capture with PhotoCapture component and upload to Supabase Storage in DeliveryLogScreen
- [ ] T101 [US3] Implement perishable checkbox with priority notification flag (food, medicine) in DeliveryLogScreen
- [ ] T102 [US3] Implement logDelivery method to create Delivery record in local WatermelonDB with pickup_status='pending' in DeliveryLogScreen
- [ ] T103 [US3] Implement household delivery notification via Supabase Edge Function (send push notification with delivery details and photo) in DeliveryLogScreen
- [ ] T104 [US3] Queue delivery notification in sync_queue with priority=1 (critical) if perishable, priority=2 (high) otherwise in DeliveryLogScreen
- [ ] T105 [US3] Implement immediate sync attempt for delivery notifications when online in DeliveryLogScreen
- [ ] T106 [US3] Create DeliveryListScreen showing all pending deliveries grouped by household with perishable items highlighted in apps/sentinel-app/src/screens/delivery/DeliveryListScreen.tsx
- [ ] T107 [US3] Implement delivery search and filters (household, service name, perishable only, date range) in DeliveryListScreen
- [ ] T108 [US3] Create DeliveryHandoffScreen with delivery details, pickup confirmation method (signature, household acknowledgment) in apps/sentinel-app/src/screens/delivery/DeliveryHandoffScreen.tsx
- [ ] T109 [US3] Implement markDeliveryPickedUp method to update Delivery record with pickup_status='received' and picked_up_at timestamp in DeliveryHandoffScreen
- [ ] T110 [US3] Implement delivery reminder notification logic (send reminder if not picked up within 24 hours) via background task in SyncService
- [ ] T111 [US3] Add delivery history view showing all deliveries with pickup status filters and export option in DeliveryListScreen

**Checkpoint**: User Story 3 complete - officers can log deliveries with photos, mark perishable items, notify households, and track handoffs

---

## Phase 6: User Story 4 - Verify Construction Workers and Permits (Priority: P2)

**Goal**: Enable security officers to view active construction permits, verify workers against permits, check validity, log worker entry/exit, track headcount, and report unauthorized activity

**Independent Test**: View active permits → verify worker against permit details → check permit dates and status → log worker entry with headcount → track exit → flag unauthorized activity

### Implementation for User Story 4

- [ ] T112 [P] [US4] Create PermitCard list component displaying permit details (household, contractor name, project description, dates, worker count, status badge) in apps/sentinel-app/src/components/lists/PermitCard.tsx
- [ ] T113 [US4] Create PermitListScreen showing active construction permits filtered by status='approved' and within date range in apps/sentinel-app/src/screens/construction/PermitListScreen.tsx
- [ ] T114 [US4] Implement permit search with filters (household, contractor name, residence number) in PermitListScreen
- [ ] T115 [US4] Create WorkerEntryScreen with permit selection, worker identity verification form, permit validity check in apps/sentinel-app/src/screens/construction/WorkerEntryScreen.tsx
- [ ] T116 [US4] Implement permit validity validation logic (status='approved', within start_date and end_date, current_worker_count < authorized_worker_count) in WorkerEntryScreen
- [ ] T117 [US4] Implement logWorkerEntry method to create GateEntry record with entry_type='construction' and increment permit.current_worker_count in WorkerEntryScreen
- [ ] T118 [US4] Implement worker headcount tracking with permit worker limit check and warning when limit exceeded in WorkerEntryScreen
- [ ] T119 [US4] Implement permit expiry check (deny entry if expired or not approved) with override option and reason in WorkerEntryScreen
- [ ] T120 [US4] Create WorkerExitScreen with worker search by permit/contractor and exit logging in apps/sentinel-app/src/screens/construction/WorkerExitScreen.tsx
- [ ] T121 [US4] Implement logWorkerExit method to update GateEntry with exit timestamp and decrement permit.current_worker_count in WorkerExitScreen
- [ ] T122 [US4] Add permit details view showing contractor info, dates, current headcount, worker entry/exit history in apps/sentinel-app/src/screens/construction/PermitDetailsScreen.tsx
- [ ] T123 [US4] Implement unauthorized construction reporting flow that creates security incident with type='security_breach' and notifies admin in PermitListScreen
- [ ] T124 [US4] Add worker count reconciliation logic to handle missed exits (manual headcount adjustment by security_head) in PermitDetailsScreen

**Checkpoint**: User Story 4 complete - officers can verify construction workers, log entry/exit, track headcount, and report unauthorized activity

---

## Phase 7: User Story 5 - Report and Track Security Incidents (Priority: P2)

**Goal**: Enable security officers to report security incidents with type, severity, location, description, supporting media, track status, view history, and receive assignments

**Independent Test**: Create incident report with type and severity → add location and description → upload photos/videos → incident submitted → relevant parties notified → track status → receive assignment

### Implementation for User Story 5

- [ ] T125 [P] [US5] Create IncidentCard list component displaying incident summary (type badge, severity badge, location, timestamp, status, assigned officer) in apps/sentinel-app/src/components/lists/IncidentCard.tsx
- [ ] T126 [US5] Create IncidentReportScreen with incident type selector (fire, medical, police, maintenance, disturbance, security_breach, other) in apps/sentinel-app/src/screens/incident/IncidentReportScreen.tsx
- [ ] T127 [US5] Implement severity level selector (low, medium, high, critical) with color-coded badges in IncidentReportScreen
- [ ] T128 [US5] Implement location input with options (gate, residence, common area) and GPS coordinates from expo-location in IncidentReportScreen
- [ ] T129 [US5] Implement incident description form with character limit and required field validation in IncidentReportScreen
- [ ] T130 [US5] Implement multi-photo/video upload with expo-image-picker, file size validation (max 20MB per file), and compression in IncidentReportScreen
- [ ] T131 [US5] Implement createIncident method to create Incident record in local WatermelonDB with synced=false and status='reported' in IncidentReportScreen
- [ ] T132 [US5] Queue incident in sync_queue with priority=1 (critical) if severity='critical', priority=2 (high) otherwise in IncidentReportScreen
- [ ] T133 [US5] Implement incident escalation logic to notify relevant parties (security_head, admins, emergency services for critical) via Supabase Edge Function in IncidentReportScreen
- [ ] T134 [US5] Implement immediate sync attempt for critical incidents when online in IncidentReportScreen
- [ ] T135 [US5] Create IncidentListScreen showing all incidents with filters (status, severity, type, date range) and search in apps/sentinel-app/src/screens/incident/IncidentListScreen.tsx
- [ ] T136 [US5] Implement incident history view with full details, media gallery, and status timeline in IncidentListScreen
- [ ] T137 [US5] Create IncidentDetailsScreen showing full incident report with media viewer, status updates, assignment details in apps/sentinel-app/src/screens/incident/IncidentDetailsScreen.tsx
- [ ] T138 [US5] Implement incident status update flow (investigating, resolved, closed) for assigned officers in IncidentDetailsScreen
- [ ] T139 [US5] Implement incident assignment notification receiver via Realtime subscription (subscribeToIncidentAssignments) with push notification in RealtimeService
- [ ] T140 [US5] Add resolution notes input for officers when updating incident status to resolved/closed in IncidentDetailsScreen
- [ ] T141 [US5] Implement incident media retry upload logic for failed uploads due to large file size in SyncService

**Checkpoint**: User Story 5 complete - officers can report incidents with media, track status, receive assignments, and escalate critical incidents

---

## Phase 8: User Story 6 - Monitor Real-Time Gate Activity (Priority: P2)

**Goal**: Enable security officers to view live gate entry feed, see recent entries, monitor officer assignments, receive broadcast alerts, and track shift hours

**Independent Test**: View live entry feed with last 50 entries → see officer assignments at gates → receive broadcast alert → check shift hours → updates appear within 5 seconds

### Implementation for User Story 6

- [ ] T142 [P] [US6] Create EntryFeedCard component displaying live entry with timestamp, entry type, vehicle/person, gate, officer badge in apps/sentinel-app/src/components/lists/EntryFeedCard.tsx
- [ ] T143 [US6] Create GateMonitoringScreen with live entry feed (last 50 entries) using Realtime subscription in apps/sentinel-app/src/screens/monitoring/GateMonitoringScreen.tsx
- [ ] T144 [US6] Implement subscribeToGateEntries real-time subscription filtered by current officer's gate_id in GateMonitoringScreen
- [ ] T145 [US6] Implement live entry feed auto-refresh logic to display new entries within 5 seconds of logging in GateMonitoringScreen
- [ ] T146 [US6] Implement multi-gate monitoring view (security_head only) showing activity across all community gates with entry counts in GateMonitoringScreen
- [ ] T147 [US6] Create OfficerAssignmentCard showing officer name, assigned gate, shift start time, shift status in apps/sentinel-app/src/components/lists/OfficerAssignmentCard.tsx
- [ ] T148 [US6] Implement officer assignments view (security_head only) showing which officers are on duty at each gate in GateMonitoringScreen
- [ ] T149 [US6] Create BroadcastAlertScreen (security_head only) with alert message input, severity selector, and send-to-all button in apps/sentinel-app/src/screens/monitoring/BroadcastAlertScreen.tsx
- [ ] T150 [US6] Implement sendBroadcastAlert method to create broadcast_alerts record and trigger push notifications to all on-duty officers in BroadcastAlertScreen
- [ ] T151 [US6] Implement broadcast alert receiver via Realtime subscription (subscribeToBroadcastAlerts) with immediate push notification and modal display in RealtimeService
- [ ] T152 [US6] Create ShiftTrackingWidget showing current shift duration, clock-in time, elapsed hours in apps/sentinel-app/src/components/monitoring/ShiftTrackingWidget.tsx
- [ ] T153 [US6] Implement shift clock-in/clock-out flow with timestamp recording and shift hours calculation in apps/sentinel-app/src/screens/auth/ClockInScreen.tsx
- [ ] T154 [US6] Implement shift tracking background service to update shift hours periodically and alert when shift exceeds expected duration in SyncService
- [ ] T155 [US6] Add entry count statistics (entries processed today, by entry type) in GateMonitoringScreen

**Checkpoint**: User Story 6 complete - officers can monitor live gate activity, receive broadcasts, track shifts, and security_heads can supervise all gates

---

## Phase 9: User Story 7 - Generate Security Reports (Priority: P3)

**Goal**: Enable security heads to generate shift reports, view entry statistics, export logs, and track incident trends for operational analysis

**Independent Test**: Generate shift report for date range → view entry statistics by type and gate → export logs to file → view incident trend analysis

### Implementation for User Story 7

- [ ] T156 [US7] Create ShiftReportScreen (security_head only) with date range selector, officer filter, and report generation in apps/sentinel-app/src/screens/monitoring/ShiftReportScreen.tsx
- [ ] T157 [US7] Implement generateShiftReport method to query gate_entries and incidents for date range, aggregate by officer in ShiftReportScreen
- [ ] T158 [US7] Implement shift report data structure showing entries/exits per officer, incident counts, shift hours, gate coverage in ShiftReportScreen
- [ ] T159 [US7] Create EntryStatisticsScreen (security_head only) showing entry breakdowns by type, gate, time patterns in apps/sentinel-app/src/screens/monitoring/EntryStatisticsScreen.tsx
- [ ] T160 [US7] Implement entry statistics queries with groupBy entry_type, gate_id, and hourly distribution charts in EntryStatisticsScreen
- [ ] T161 [US7] Create LogExportScreen (security_head only) with date range selector, format selector (CSV, PDF), and export button in apps/sentinel-app/src/screens/monitoring/LogExportScreen.tsx
- [ ] T162 [US7] Implement CSV export logic using Supabase Edge Function for large datasets (>1000 entries) with streaming in LogExportScreen
- [ ] T163 [US7] Implement PDF export logic using jsPDF (client-side) for small datasets (<100 entries) in LogExportScreen
- [ ] T164 [US7] Implement file download and sharing via expo-file-system and React Native Share API in LogExportScreen
- [ ] T165 [US7] Create IncidentTrendsScreen (security_head only) showing incident frequency by type, severity distribution, resolution times in apps/sentinel-app/src/screens/monitoring/IncidentTrendsScreen.tsx
- [ ] T166 [US7] Implement incident trend analysis queries with groupBy incident type, severity, and time-to-resolution calculations in IncidentTrendsScreen
- [ ] T167 [US7] Add simple visualization components (bar charts, pie charts) using react-native-chart-kit for statistics in EntryStatisticsScreen and IncidentTrendsScreen

**Checkpoint**: User Story 7 complete - security_heads can generate reports, view statistics, export logs, and analyze incident trends

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories, performance optimization, and production readiness

- [ ] T168 [P] Implement offline data cache refresh logic (refresh stickers, guests, permits every 4 hours when online) in SyncService
- [ ] T169 [P] Implement low-power mode configuration with battery optimization (reduce location updates, dim screen, disable animations) in apps/sentinel-app/src/services/battery/BatteryService.ts
- [ ] T170 [P] Add crash reporting and error logging with Expo Application Services (EAS) or Sentry integration in apps/sentinel-app/App.tsx
- [ ] T171 [P] Implement biometric authentication (Face ID, Touch ID, Fingerprint) with expo-local-authentication for app unlock in apps/sentinel-app/src/screens/auth/BiometricAuthScreen.tsx
- [ ] T172 Implement audit logging for all officer actions (entries, incidents, broadcasts) with officer_id and timestamp in all screens
- [ ] T173 Add performance monitoring for RFID scan timing (<15s target), sync timing (<10s target), incident submission (<30s target) in SyncService
- [ ] T174 Implement photo compression and optimization for uploads to reduce file size and upload time in PhotoCapture component
- [ ] T175 Add network quality indicator (4G, 3G, WiFi, Offline) in OfflineIndicator component
- [ ] T176 Implement sync conflict resolution UI to show conflicts and allow manual resolution in apps/sentinel-app/src/screens/settings/SyncConflictsScreen.tsx
- [ ] T177 Add RFID reader device management screen (paired devices, connection history, auto-reconnect) in apps/sentinel-app/src/screens/settings/RFIDSettingsScreen.tsx
- [ ] T178 Implement location permission troubleshooting guide for background tracking issues in apps/sentinel-app/src/screens/settings/LocationSettingsScreen.tsx
- [ ] T179 Add developer mode with debug tools (database inspector, sync queue viewer, Realtime connection status) in apps/sentinel-app/src/screens/settings/DeveloperScreen.tsx
- [ ] T180 [P] Create onboarding tutorial screens explaining RFID scanning, offline mode, shift tracking for new officers in apps/sentinel-app/src/screens/onboarding/
- [ ] T181 [P] Add accessibility improvements (font scaling, screen reader support, color contrast for badges) across all screens
- [ ] T182 Implement security hardening (secure storage for tokens, RFID data encryption in transit, prevent screenshots for sensitive screens) in supabase.ts and AuthContext
- [ ] T183 Add unit tests for critical services (RFIDService, SyncService, LocationService) using Jest in apps/sentinel-app/__tests__/services/
- [ ] T184 Create E2E test for complete entry logging flow (RFID scan → log entry → sync) using Detox in apps/sentinel-app/e2e/entry-logging.e2e.ts
- [ ] T185 Create E2E test for complete incident reporting flow (create incident → upload media → sync) using Detox in apps/sentinel-app/e2e/incident-reporting.e2e.ts
- [ ] T186 Test on physical iOS device with actual RFID reader, GPS, and camera for hardware integration validation
- [ ] T187 Test on physical Android device with actual RFID reader, GPS, and camera for hardware integration validation
- [ ] T188 Validate quickstart.md by following setup steps on clean environment and updating documentation
- [ ] T189 Create production build with EAS Build for iOS and Android app store submission
- [ ] T190 [P] Update README.md with Sentinel App overview, hardware requirements (RFID reader models), and setup instructions in apps/sentinel-app/README.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-9)**: All depend on Foundational phase completion
  - **US1 (Entry Processing - P1)**: MVP priority, start first after foundational
  - **US2 (Guest Verification - P1)**: MVP priority, can start in parallel with US1
  - **US3 (Delivery Tracking - P1)**: MVP priority, can start in parallel with US1/US2
  - **US4 (Construction Workers - P2)**: Can start after US1 (reuses entry logging), parallel with US5/US6
  - **US5 (Incident Reporting - P2)**: Independent, can start in parallel after foundational
  - **US6 (Real-Time Monitoring - P2)**: Depends on US1 (entry feed), can start after US1 complete
  - **US7 (Reports - P3)**: Depends on data from US1/US5, start after sufficient data collected
- **Polish (Phase 10)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1 - Entry Processing)**: Foundation only - No dependencies on other stories ✅ Start first
- **User Story 2 (P1 - Guest Verification)**: Foundation only - Independent ✅ Parallel with US1
- **User Story 3 (P1 - Delivery Tracking)**: Foundation only - Independent ✅ Parallel with US1/US2
- **User Story 4 (P2 - Construction Workers)**: Reuses GateEntry from US1 - Start after US1 or parallel if careful
- **User Story 5 (P2 - Incident Reporting)**: Foundation only - Independent ✅ Parallel with others
- **User Story 6 (P2 - Real-Time Monitoring)**: Requires entry data from US1 - Start after US1 MVP complete
- **User Story 7 (P3 - Reports)**: Requires data from US1/US5 - Start after data collection period

### Within Each User Story

- WatermelonDB models before screens (models are foundational, created in Phase 2)
- Services before UI components
- Core implementation before integration
- Offline queueing before sync logic
- Story complete before moving to next priority

### Parallel Opportunities

- **Phase 1 (Setup)**: All tasks T001-T013 can run in parallel (marked [P])
- **Phase 2 (Foundational)**:
  - WatermelonDB models (T015-T021) can run in parallel
  - UI components (T059-T060) can run in parallel after navigation setup
- **User Stories**:
  - US1, US2, US3 (all P1) can run in parallel after Phase 2 complete
  - US4, US5 (both P2) can run in parallel (if US1 complete for US4)
  - Component creation tasks within each story marked [P] can run in parallel
- **Phase 10 (Polish)**: Most polish tasks marked [P] can run in parallel

---

## Parallel Example: Foundational Phase

```bash
# Launch all WatermelonDB models together (after schema T014):
Task: "Create Sticker model in apps/sentinel-app/src/database/models/Sticker.ts"
Task: "Create GateEntry model in apps/sentinel-app/src/database/models/GateEntry.ts"
Task: "Create ScheduledGuest model in apps/sentinel-app/src/database/models/ScheduledGuest.ts"
Task: "Create Delivery model in apps/sentinel-app/src/database/models/Delivery.ts"
Task: "Create ConstructionPermit model in apps/sentinel-app/src/database/models/ConstructionPermit.ts"
Task: "Create Incident model in apps/sentinel-app/src/database/models/Incident.ts"
Task: "Create SyncQueue model in apps/sentinel-app/src/database/models/SyncQueue.ts"
```

## Parallel Example: User Story 1 (Entry Processing)

```bash
# Launch all component creation tasks together:
Task: "Create RFIDScanner component in apps/sentinel-app/src/components/rfid/RFIDScanner.tsx"
Task: "Create RFIDStatus component in apps/sentinel-app/src/components/rfid/RFIDStatus.tsx"
Task: "Create PhotoCapture component in apps/sentinel-app/src/components/camera/PhotoCapture.tsx"
Task: "Create EntryCard component in apps/sentinel-app/src/components/lists/EntryCard.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1, 2, 3 Only - P1 Stories)

1. Complete Phase 1: Setup (T001-T013)
2. Complete Phase 2: Foundational (T014-T060) - **CRITICAL** - blocks all stories
3. Complete Phase 3: User Story 1 - Entry Processing (T061-T079)
4. Complete Phase 4: User Story 2 - Guest Verification (T080-T096)
5. Complete Phase 5: User Story 3 - Delivery Tracking (T097-T111)
6. **STOP and VALIDATE**: Test MVP with actual RFID reader on physical device
7. Deploy MVP build to security officers for field testing

**MVP Scope**: Tasks T001-T111 (111 tasks) covering Setup + Foundational + P1 user stories for 4-6 week delivery timeline

**MVP Delivers**:
- ✅ RFID-based vehicle entry/exit logging with offline support
- ✅ Guest verification with QR scanning and household notifications
- ✅ Delivery tracking with photos and handoff confirmation
- ✅ Offline-first operation for 8-hour shifts without network
- ✅ Real-time sync when connectivity returns
- ✅ Basic gate security operations fully functional

### Incremental Delivery

1. **Foundation** (T001-T060) → Offline database + RFID + Realtime ready
2. **MVP** (T061-T111) → Add US1+US2+US3 → Test independently → Deploy (Core gate operations!)
3. **Enhanced** (T112-T124) → Add US4 (Construction Workers) → Test → Deploy
4. **Security** (T125-T141) → Add US5 (Incident Reporting) → Test → Deploy
5. **Monitoring** (T142-T155) → Add US6 (Real-Time Monitoring) → Test → Deploy
6. **Analytics** (T156-T167) → Add US7 (Reports for security_head) → Test → Deploy
7. **Polish** (T168-T190) → Performance, security, production readiness → App Store

### Parallel Team Strategy

With multiple developers after Foundational phase (T060) complete:

1. **Team completes Setup + Foundational together** (T001-T060)
2. **Once Foundational is done:**
   - Developer A: User Story 1 (Entry Processing - T061-T079)
   - Developer B: User Story 2 (Guest Verification - T080-T096)
   - Developer C: User Story 3 (Delivery Tracking - T097-T111)
3. Stories complete and integrate independently, then deploy MVP together

---

## Hardware Testing Requirements

**Critical**: The following features REQUIRE physical device testing with actual hardware:

1. **RFID Reader Integration** (US1):
   - Test with Bluetooth RFID readers (recommend specific models in production)
   - Verify BLE scanning, pairing, and data reception
   - Test scan accuracy and speed (<15s target)

2. **Geolocation** (All stories):
   - Test background location tracking during 8-hour shift
   - Verify geofencing accuracy (100m gate proximity)
   - Test battery consumption with location services

3. **Camera/QR Scanner** (US2, US3, US5):
   - Test QR scanning in daylight and low-light (night shift)
   - Test photo capture and upload for entries, deliveries, incidents
   - Verify file size limits and compression

4. **Push Notifications** (US2, US3, US5, US6):
   - Test notification delivery for broadcasts and assignments
   - Verify notification permissions and delivery timing

5. **Offline Mode** (All stories):
   - Test 8-hour offline operation with 500+ cached records
   - Verify sync queue prioritization and conflict resolution
   - Test sync performance on reconnection (<10s target)

**Recommended Test Devices**:
- iOS: iPhone 12+ (iOS 15+)
- Android: Samsung Galaxy S21+ (Android 11+)
- Bluetooth RFID readers with BLE support (UHF or HF RFID)

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story (US1-US7) for traceability
- Each user story should be independently completable and testable
- Offline-first architecture is critical - prioritize Phase 2 sync infrastructure
- RFID integration requires physical hardware testing - cannot be fully tested in simulator
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All P1 stories (US1, US2, US3) are MVP-critical for basic gate operations
- Security_head features (multi-gate monitoring, broadcasts, reports) are in US6 and US7

**Total Tasks**: 190 tasks
- Phase 1 (Setup): 13 tasks
- Phase 2 (Foundational): 47 tasks (BLOCKING - must complete first)
- Phase 3 (US1 - Entry Processing - P1 MVP): 19 tasks
- Phase 4 (US2 - Guest Verification - P1 MVP): 17 tasks
- Phase 5 (US3 - Delivery Tracking - P1 MVP): 15 tasks
- Phase 6 (US4 - Construction Workers - P2): 13 tasks
- Phase 7 (US5 - Incident Reporting - P2): 17 tasks
- Phase 8 (US6 - Real-Time Monitoring - P2): 14 tasks
- Phase 9 (US7 - Reports - P3): 12 tasks
- Phase 10 (Polish): 23 tasks

**Parallel Opportunities**: 67 tasks marked [P] can run in parallel within their respective phases
