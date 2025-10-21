# Tasks: Household Management Mobile Application (Residence App)

**Input**: Design documents from `/specs/003-household-management-mobile/`
**Prerequisites**: plan.md, spec.md (user stories), research.md (WatermelonDB, Stripe/PayMongo, NativeWind decisions), quickstart.md

**Tests**: ✅ **EXPLICITLY REQUESTED** - User asked for "Include testing on iOS and Android"

**Organization**: Tasks organized by user story to enable independent implementation and testing, with special focus on offline/online functionality and payment integration.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US8)
- **[iOS/Android]**: Platform-specific testing tasks
- Include exact file paths and offline/payment considerations

## Path Conventions
- **Mobile app structure**: `apps/residence-app/` (React Native + Expo)
- Backend: Supabase (shared from Features 001/002)
- Tests: Jest (unit), Detox (E2E), iOS Simulator, Android Emulator

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and Expo + React Native setup for Residence Mobile App

- [ ] **T001** Create residence mobile app project structure in `apps/residence-app/`
- [ ] **T002** Initialize Expo React Native TypeScript project with SDK 50+ using `npx create-expo-app residence-app --template expo-template-blank-typescript`
- [ ] **T003** [P] Configure TypeScript strict mode in `tsconfig.json`
- [ ] **T004** [P] Install React Navigation v6 dependencies: `@react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs`
- [ ] **T005** [P] Install Expo modules: `expo-camera expo-image-picker expo-notifications expo-local-authentication expo-barcode-scanner expo-file-system expo-document-picker`
- [ ] **T006** [P] Install WatermelonDB for offline storage: `@nozbe/watermelondb @nozbe/with-observables` per research.md decision
- [ ] **T007** [P] Install Supabase client: `@supabase/supabase-js` for backend integration
- [ ] **T008** [P] Install payment SDKs: Stripe React Native SDK `@stripe/stripe-react-native` per research.md
- [ ] **T009** [P] Install form handling: `react-hook-form zod` for validation
- [ ] **T010** [P] Install NativeWind for styling: `nativewind tailwindcss@3.3.2` per research.md decision
- [ ] **T011** [P] Install QR code library: `react-native-qrcode-svg` for guest passes
- [ ] **T012** [P] Configure Jest for unit testing in `jest.config.js`
- [ ] **T013** [P] Setup Detox for E2E testing on iOS/Android in `detox.config.js`

---

## Phase 2: Foundational (Blocking Prerequisites for Offline/Online Architecture)

**Purpose**: Core infrastructure with WatermelonDB offline storage, Supabase integration, auth, and payment setup

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### WatermelonDB Offline Database Setup

- [ ] **T014** Create WatermelonDB schema in `apps/residence-app/src/database/schema.ts` with tables: stickers, guests, fees, permits, deliveries, announcements, household_members, sync_queue per research.md
- [ ] **T015** Define WatermelonDB models in `apps/residence-app/src/database/models/`:
  - Sticker.ts (vehicle_plate, status, expiry_date, household_id)
  - Guest.ts (name, phone, vehicle_plate, arrival_time, status)
  - Fee.ts (amount, due_date, status, fee_type)
  - Permit.ts (construction_type, contractor_info, status, road_fee)
  - Delivery.ts (delivery_company, tracking_number, status, received_at)
  - Announcement.ts (title, content, type, publish_date)
  - HouseholdMember.ts (name, relationship, photo_url)
  - SyncQueueItem.ts (entity_type, action, payload, synced)
- [ ] **T016** Initialize WatermelonDB database in `apps/residence-app/src/database/index.ts` with SQLiteAdapter, JSI mode enabled for performance
- [ ] **T017** Create database migrations for schema versioning in `apps/residence-app/src/database/migrations/`
- [ ] **T018** Create sync manager in `apps/residence-app/src/database/syncManager.ts` using @nozbe/watermelondb/sync with Supabase sync adapter

### Supabase Backend Integration

- [ ] **T019** Setup Supabase client in `apps/residence-app/src/lib/supabase.ts` with environment variables (URL, anon key) and AsyncStorage for session persistence
- [ ] **T020** Configure Supabase Auth in `apps/residence-app/src/lib/auth.ts` with email/password and JWT handling
- [ ] **T021** Configure Supabase Storage in `apps/residence-app/src/lib/storage.ts` for photo/document uploads (member photos, OR/CR, permit plans, delivery photos)
- [ ] **T022** Configure Supabase Realtime subscriptions in `apps/residence-app/src/lib/realtime.ts` for sticker approvals, guest arrivals, delivery notifications

### Offline/Online Sync Infrastructure

- [ ] **T023** Create network status detector in `apps/residence-app/src/lib/networkStatus.ts` using NetInfo to track online/offline state
- [ ] **T024** Create sync queue service in `apps/residence-app/src/services/syncQueue.ts` to queue offline actions (sticker requests, guest scheduling, fee payments) with priority levels (payment=high, requests=normal)
- [ ] **T025** Implement sync conflict resolution in `apps/residence-app/src/services/syncResolver.ts` using server-wins strategy per research.md
- [ ] **T026** Create offline indicator component in `apps/residence-app/src/components/shared/OfflineIndicator.tsx` with sync status (syncing, synced, offline, errors)

### Payment Integration (Stripe + PayMongo/GCash)

- [ ] **T027** Setup Stripe provider in `apps/residence-app/src/lib/stripe.ts` with publishable key from env, initialize StripeProvider wrapper
- [ ] **T028** Create payment service in `apps/residence-app/src/services/payment.ts` with methods: initiateFeePayment(), initiatePermitPayment(), confirmPayment(), handlePaymentFailure()
- [ ] **T029** Implement Stripe React Native SDK integration: CardField component wrapper in `apps/residence-app/src/components/payment/StripeCardField.tsx`
- [ ] **T030** Implement PayMongo/GCash REST API integration in `apps/residence-app/src/services/paymongoService.ts` for PH-specific payments (GCash, GrabPay)
- [ ] **T031** Create payment method selector in `apps/residence-app/src/components/payment/PaymentMethodSelector.tsx` (Stripe card, PayMongo, GCash)

### Authentication & Navigation

- [ ] **T032** Create auth context in `apps/residence-app/src/contexts/AuthContext.tsx` with login, logout, session management, household_id extraction from JWT
- [ ] **T033** Implement biometric authentication in `apps/residence-app/src/lib/biometric.ts` using expo-local-authentication (Face ID, Touch ID, Fingerprint)
- [ ] **T034** Setup navigation structure in `apps/residence-app/src/navigation/AppNavigator.tsx` with authenticated/unauthenticated stacks
- [ ] **T035** Create tab navigator in `apps/residence-app/src/navigation/TabNavigator.tsx` with tabs: Dashboard, Stickers, Guests, Fees, More
- [ ] **T036** Create auth flow navigator in `apps/residence-app/src/navigation/AuthNavigator.tsx` with Login, Biometric screens

### UI Foundation & Push Notifications

- [ ] **T037** [P] Configure NativeWind (Tailwind) in `tailwind.config.js` with custom colors, spacing, typography
- [ ] **T038** [P] Create base UI components in `apps/residence-app/src/components/ui/`: Button, Card, Input, Badge, Avatar, LoadingSpinner, Modal
- [ ] **T039** [P] Setup Expo push notifications in `apps/residence-app/src/lib/pushNotifications.ts` with permission request, token registration, notification handlers
- [ ] **T040** [P] Create notification service in `apps/residence-app/src/services/notificationService.ts` to handle sticker approvals, guest arrivals, deliveries, urgent announcements per FR-074
- [ ] **T041** Configure app.json with required permissions: camera, photo library, notifications, biometric, file system (iOS Info.plist + Android permissions)
- [ ] **T042** Setup environment config in `apps/residence-app/.env` (Supabase URL/keys, Stripe publishable key, PayMongo API key)

**Checkpoint**: Foundation ready - offline DB, sync, auth, payments, navigation configured

---

## Phase 3: User Story 1 - Request and Track Vehicle Stickers (Priority: P1) 🎯 MVP

**Goal**: Enable household members to request vehicle stickers with documents, track approval status, view active stickers, and manage renewals - all with offline support.

**Independent Test**: Submit sticker request with vehicle details and OR/CR document upload while offline (queued), go online (syncs), track approval status, view active sticker with expiry date, request renewal when approaching expiry. Test on both iOS and Android simulators/devices.

**Offline Support**: Sticker requests queue when offline, sync on reconnect. Active stickers cached for offline viewing.

### Tests for User Story 1

**Unit Tests**:
- [ ] **T043** [P] [US1] [iOS/Android] Unit test for sticker request validation (vehicle plate format, required fields) in `apps/residence-app/src/components/stickers/__tests__/StickerRequestForm.test.tsx`
- [ ] **T044** [P] [US1] [iOS/Android] Unit test for sticker sync queue (offline request queueing, online sync) in `apps/residence-app/src/services/__tests__/stickerSyncService.test.ts`

**E2E Tests**:
- [ ] **T045** [US1] [iOS] E2E test: User requests sticker offline → goes online → sticker syncs → approval notification received using Detox in `apps/residence-app/e2e/sticker-request-ios.e2e.ts`
- [ ] **T046** [US1] [Android] E2E test: User requests sticker offline → goes online → sticker syncs → approval notification received using Detox in `apps/residence-app/e2e/sticker-request-android.e2e.ts`

### Implementation for User Story 1

- [ ] **T047** [P] [US1] Create StickerRequestForm component in `apps/residence-app/src/components/stickers/StickerRequestForm.tsx` with fields: household member/beneficial user selector, vehicle plate, make, model, color, type, OR/CR document upload (expo-document-picker, 5MB limit per FR-021)
- [ ] **T048** [P] [US1] Create StickerList component in `apps/residence-app/src/components/stickers/StickerList.tsx` displaying active stickers with vehicle details, assigned person, expiry date, expiry warning (30 days), renewal button
- [ ] **T049** [P] [US1] Create StickerStatusTracker component in `apps/residence-app/src/components/stickers/StickerStatusTracker.tsx` showing request status (requested, approved, rejected), rejection reason if denied, progress indicator
- [ ] **T050** [P] [US1] Create DocumentUploadComponent in `apps/residence-app/src/components/shared/DocumentUpload.tsx` for OR/CR upload with validation (format: JPG/PNG/PDF, size <5MB), preview, Supabase Storage upload
- [ ] **T051** [US1] Implement sticker request service in `apps/residence-app/src/services/stickerService.ts` with methods: createRequest(vehicleDetails, documents), trackStatus(stickerId), requestRenewal(stickerId)
- [ ] **T052** [US1] Implement offline sticker request queue in `apps/residence-app/src/services/stickerSyncService.ts`: Queue request when offline, sync to Supabase when online via POST `/vehicle_stickers`
- [ ] **T053** [US1] Implement sticker caching with WatermelonDB: Query `stickers` table for offline access, observe changes for real-time updates when synced
- [ ] **T054** [US1] Setup Realtime subscription for sticker approvals in `apps/residence-app/src/hooks/useStickerRealtime.ts`: Subscribe to `vehicle_stickers` WHERE household_id=user.household_id, trigger notification on status change
- [ ] **T055** [US1] Create StickersScreen in `apps/residence-app/src/screens/stickers/StickersScreen.tsx` with tabs: Active (list), Requests (status tracker), Request New (form)
- [ ] **T056** [US1] Implement expiry warning logic: Filter stickers WHERE expiry_date <= NOW() + 30 days, display badge and renewal CTA
- [ ] **T057** [US1] Implement renewal flow: Create new sticker request referencing old sticker_id, copy vehicle details, require new OR/CR upload
- [ ] **T058** [US1] Add validation: Prevent duplicate plate numbers via client-side check (query existing stickers) + server-side constraint (FR-027)
- [ ] **T059** [US1] Implement notification handling for sticker approval/rejection: Show toast, update local DB, navigate to sticker detail

**Checkpoint**: User Story 1 complete - Residents can request and track vehicle stickers offline/online

---

## Phase 4: User Story 2 - Schedule and Manage Guests (Priority: P1)

**Goal**: Enable household members to schedule guest visits with QR code generation, edit/cancel visits, and receive arrival notifications.

**Independent Test**: Schedule day-trip guest with details and vehicle plate while offline (queued), generate QR code, go online (syncs to security), receive arrival notification when guest enters. Test QR code generation on iOS and Android.

**Offline Support**: Guest scheduling queues when offline, QR codes generated locally and synced. Active guests cached for offline viewing.

### Tests for User Story 2

**Unit Tests**:
- [ ] **T060** [P] [US2] [iOS/Android] Unit test for guest scheduling validation (arrival time not in past, required fields) in `apps/residence-app/src/components/guests/__tests__/GuestScheduleForm.test.tsx`
- [ ] **T061** [P] [US2] [iOS/Android] Unit test for QR code generation (valid format, unique ID) in `apps/residence-app/src/services/__tests__/qrCodeService.test.ts`

**E2E Tests**:
- [ ] **T062** [US2] [iOS] E2E test: User schedules guest → QR code generated → guest arrives → arrival notification received using Detox in `apps/residence-app/e2e/guest-scheduling-ios.e2e.ts`
- [ ] **T063** [US2] [Android] E2E test: User schedules guest → QR code generated → guest arrives → arrival notification received using Detox in `apps/residence-app/e2e/guest-scheduling-android.e2e.ts`

### Implementation for User Story 2

- [ ] **T064** [P] [US2] Create GuestScheduleForm component in `apps/residence-app/src/components/guests/GuestScheduleForm.tsx` with fields: guest name, phone, vehicle plate, purpose, arrival/departure date-time pickers (validate arrival not in past per FR-037), visit type (day-trip/multi-day)
- [ ] **T065** [P] [US2] Create GuestList component in `apps/residence-app/src/components/guests/GuestList.tsx` displaying scheduled guests, arrival status, QR code display, edit/cancel actions
- [ ] **T066** [P] [US2] Create GuestQRCodeDisplay component in `apps/residence-app/src/components/guests/GuestQRCodeDisplay.tsx` using react-native-qrcode-svg to render QR with guest pass ID, household info, expiry
- [ ] **T067** [P] [US2] Create GuestArrivalNotification component in `apps/residence-app/src/components/guests/GuestArrivalNotification.tsx` showing guest name, arrival timestamp, confirmation button
- [ ] **T068** [US2] Implement guest service in `apps/residence-app/src/services/guestService.ts` with methods: scheduleGuest(details), editGuest(guestId, updates), cancelGuest(guestId), generateQRCode(guestId)
- [ ] **T069** [US2] Implement QR code generation in `apps/residence-app/src/services/qrCodeService.ts`: Generate unique guest pass ID, encode household_id + guest_id + expiry, create QR data string
- [ ] **T070** [US2] Implement offline guest scheduling queue: Store guest in WatermelonDB `guests` table, queue sync action, sync to Supabase `/scheduled_guests` when online
- [ ] **T071** [US2] Setup Realtime subscription for guest arrivals in `apps/residence-app/src/hooks/useGuestRealtime.ts`: Subscribe to `scheduled_guests` updates WHERE household_id, trigger notification on arrival_status change
- [ ] **T072** [US2] Create GuestsScreen in `apps/residence-app/src/screens/guests/GuestsScreen.tsx` with tabs: Scheduled (list with QR), Schedule New (form), History (past guests)
- [ ] **T073** [US2] Implement edit/cancel logic: PATCH `/scheduled_guests` for edits, soft delete for cancellation, notify security of changes via Realtime
- [ ] **T074** [US2] Handle multi-day guest passes: Set QR expiry to departure_date, validate date range on schedule
- [ ] **T075** [US2] Implement arrival notification handling: Listen for security confirmation, show toast + in-app notification, update guest status locally

**Checkpoint**: User Story 2 complete - Residents can schedule guests with QR codes and track arrivals

---

## Phase 5: User Story 3 - View and Pay Association Fees (Priority: P1)

**Goal**: Enable household heads to view fee statements, pay fees via Stripe/PayMongo/GCash, and download receipts.

**Independent Test**: View fee statements (monthly, quarterly, annual), check overdue fees, pay via Stripe card on iOS, pay via GCash on Android, download PDF receipt, verify offline fee viewing works. Test payment flows on both platforms.

**Offline Support**: Fee statements cached for offline viewing. Payments require online connection (retry queue for failed payments).

**Payment Integration**: Stripe React Native SDK for cards, PayMongo REST API for GCash/GrabPay.

### Tests for User Story 3

**Unit Tests**:
- [ ] **T076** [P] [US3] [iOS/Android] Unit test for payment amount validation (positive, 2 decimal places) in `apps/residence-app/src/components/fees/__tests__/FeePaymentForm.test.tsx`
- [ ] **T077** [P] [US3] [iOS/Android] Unit test for payment retry logic (failed payment queueing) in `apps/residence-app/src/services/__tests__/paymentService.test.ts`

**E2E Tests**:
- [ ] **T078** [US3] [iOS] E2E test: User pays fee via Stripe → payment succeeds → receipt generated → fee status updated using Detox in `apps/residence-app/e2e/fee-payment-stripe-ios.e2e.ts`
- [ ] **T079** [US3] [Android] E2E test: User pays fee via GCash → payment succeeds → receipt generated → fee status updated using Detox in `apps/residence-app/e2e/fee-payment-gcash-android.e2e.ts`

### Implementation for User Story 3

- [ ] **T080** [P] [US3] Create FeeList component in `apps/residence-app/src/components/fees/FeeList.tsx` displaying fees with type, amount, due date, status (unpaid/paid/overdue), overdue highlighting (red badge, late fee calc if applicable per FR-068)
- [ ] **T081** [P] [US3] Create FeePaymentForm component in `apps/residence-app/src/components/fees/FeePaymentForm.tsx` with payment method selector (Stripe, PayMongo, GCash), amount display, pay button
- [ ] **T082** [P] [US3] Create StripePaymentSheet component in `apps/residence-app/src/components/payment/StripePaymentSheet.tsx` using @stripe/stripe-react-native CardField and confirmPayment() method
- [ ] **T083** [P] [US3] Create PayMongoPaymentSheet component in `apps/residence-app/src/components/payment/PayMongoPaymentSheet.tsx` for GCash/GrabPay redirect flow (open WebView with payment URL)
- [ ] **T084** [P] [US3] Create ReceiptViewer component in `apps/residence-app/src/components/fees/ReceiptViewer.tsx` displaying payment details, fee breakdown, download PDF button (generate client-side or fetch from Supabase Storage)
- [ ] **T085** [US3] Implement fee service in `apps/residence-app/src/services/feeService.ts` with methods: getFees(household_id), payFee(fee_id, payment_method, payment_details), downloadReceipt(fee_id)
- [ ] **T086** [US3] Implement Stripe payment flow in payment service: initPaymentSheet() → presentPaymentSheet() → confirmPayment() → update fee status via RPC `record_fee_payment(fee_id, amount, payment_date)` from Feature 002
- [ ] **T087** [US3] Implement PayMongo/GCash payment flow: Create payment intent via Edge Function → get checkout URL → open WebView → handle redirect callback → confirm payment
- [ ] **T088** [US3] Implement payment failure handling: Retry queue for network failures, show user-friendly error messages (card declined, insufficient funds, timeout), retry button
- [ ] **T089** [US3] Implement fee caching with WatermelonDB: Sync fees from `/association_fees` WHERE household_id, cache locally, observe for Realtime updates
- [ ] **T090** [US3] Create FeesScreen in `apps/residence-app/src/screens/fees/FeesScreen.tsx` with tabs: Unpaid (with pay actions), Paid (with receipts), History (all fees)
- [ ] **T091** [US3] Implement PDF receipt generation: Use react-native-html-to-pdf or fetch pre-generated PDF from Supabase Storage (generated by admin on payment record per Feature 002)
- [ ] **T092** [US3] Add payment history view: Query paid fees with payment_date, amount, method, receipt download links

**Checkpoint**: User Story 3 complete - Household heads can pay fees via multiple payment gateways

---

## Phase 6: User Story 4 - Submit and Track Construction Permits (Priority: P2)

**Goal**: Enable household heads to submit construction permit requests with contractor details and plans, pay road fees via mobile payment, and track permit status.

**Independent Test**: Submit permit request with construction details, contractor info, upload plans (PDF 10MB), admin approves, pay road fee via Stripe on iOS/GCash on Android, track status (approved→paid→in_progress→completed). Test file upload on both platforms.

**Offline Support**: Permit requests queue when offline (including large plan PDFs). Payments require online connection.

**Payment Integration**: Same Stripe/PayMongo flow as fees, dedicated for road fee payments.

### Tests for User Story 4

**Unit Tests**:
- [ ] **T093** [P] [US4] [iOS/Android] Unit test for permit request validation (contractor info required, dates valid) in `apps/residence-app/src/components/permits/__tests__/PermitRequestForm.test.tsx`
- [ ] **T094** [P] [US4] [iOS/Android] Unit test for large file upload (10MB PDF, chunking) in `apps/residence-app/src/services/__tests__/fileUploadService.test.ts`

**E2E Tests**:
- [ ] **T095** [US4] [iOS] E2E test: User submits permit → uploads plan PDF → admin approves → pays road fee → permit status updates using Detox in `apps/residence-app/e2e/permit-submission-ios.e2e.ts`
- [ ] **T096** [US4] [Android] E2E test: User submits permit → uploads plan PDF → admin approves → pays road fee → permit status updates using Detox in `apps/residence-app/e2e/permit-submission-android.e2e.ts`

### Implementation for User Story 4

- [ ] **T097** [P] [US4] Create PermitRequestForm component in `apps/residence-app/src/components/permits/PermitRequestForm.tsx` with fields: construction type dropdown, description, start/end dates, contractor name/phone/email, estimated workers, plans upload (expo-document-picker, PDF/JPG/PNG, 10MB limit per FR-040)
- [ ] **T098** [P] [US4] Create PermitStatusTracker component in `apps/residence-app/src/components/permits/PermitStatusTracker.tsx` showing status progression (submitted→approved→rejected→paid→in_progress→completed), road fee display when approved
- [ ] **T099** [P] [US4] Create PermitRoadFeePayment component in `apps/residence-app/src/components/permits/PermitRoadFeePayment.tsx` with payment method selector (Stripe, PayMongo, GCash), road fee amount, pay button
- [ ] **T100** [P] [US4] Create PermitList component in `apps/residence-app/src/components/permits/PermitList.tsx` displaying permits with construction type, status, dates, contractor, road fee payment status
- [ ] **T101** [US4] Implement permit service in `apps/residence-app/src/services/permitService.ts` with methods: submitPermit(details, planFiles), payRoadFee(permit_id, payment_method), trackStatus(permit_id)
- [ ] **T102** [US4] Implement large file upload service in `apps/residence-app/src/services/fileUploadService.ts`: Chunked upload for PDFs >5MB to Supabase Storage, progress tracking, retry on failure
- [ ] **T103** [US4] Implement offline permit request queue: Store permit + plans in WatermelonDB, queue sync action (high priority for large files), sync to `/construction_permits` when online
- [ ] **T104** [US4] Implement road fee payment flow: Use same Stripe/PayMongo service as fees (T086-T087), call Edge Function to record payment, update permit status to 'paid'
- [ ] **T105** [US4] Setup Realtime subscription for permit approvals in `apps/residence-app/src/hooks/usePermitRealtime.ts`: Subscribe to `construction_permits` WHERE household_id, trigger notification on approval with road_fee amount
- [ ] **T106** [US4] Create PermitsScreen in `apps/residence-app/src/screens/permits/PermitsScreen.tsx` with tabs: Active (current permits), Submit New (form), History (past permits)
- [ ] **T107** [US4] Handle payment failures for road fees: Retry queue, error handling (same as fee payments T088), allow re-payment without re-submission

**Checkpoint**: User Story 4 complete - Household heads can submit permits and pay road fees via mobile

---

## Phase 7: User Story 5 - Receive and Manage Delivery Notifications (Priority: P2)

**Goal**: Enable household members to receive delivery notifications, confirm receipt with photos, and view delivery history.

**Independent Test**: Security logs delivery → push notification received on iOS/Android, view delivery details, upload received photo (2MB), confirm receipt, view history. Test camera integration on both platforms.

**Offline Support**: Delivery history cached for offline viewing. Receipt confirmation queues if offline.

### Tests for User Story 5

**Unit Tests**:
- [ ] **T108** [P] [US5] [iOS/Android] Unit test for delivery notification handling (push notification parsing) in `apps/residence-app/src/services/__tests__/notificationService.test.ts`
- [ ] **T109** [P] [US5] [iOS/Android] Unit test for photo upload validation (format, size 5MB) in `apps/residence-app/src/components/deliveries/__tests__/DeliveryPhotoUpload.test.tsx`

**E2E Tests**:
- [ ] **T110** [US5] [iOS] E2E test: Delivery notification → user views details → uploads photo → confirms receipt using Detox in `apps/residence-app/e2e/delivery-notification-ios.e2e.ts`
- [ ] **T111** [US5] [Android] E2E test: Delivery notification → user views details → uploads photo → confirms receipt using Detox in `apps/residence-app/e2e/delivery-notification-android.e2e.ts`

### Implementation for User Story 5

- [ ] **T112** [P] [US5] Create DeliveryNotificationCard component in `apps/residence-app/src/components/deliveries/DeliveryNotificationCard.tsx` displaying delivery company, tracking number (if available), arrival timestamp, confirm receipt button
- [ ] **T113** [P] [US5] Create DeliveryPhotoUpload component in `apps/residence-app/src/components/deliveries/DeliveryPhotoUpload.tsx` using expo-camera or expo-image-picker for photo capture (5MB limit per FR-053), preview, upload to Supabase Storage
- [ ] **T114** [P] [US5] Create DeliveryHistory component in `apps/residence-app/src/components/deliveries/DeliveryHistory.tsx` displaying past deliveries with dates, companies, received photos
- [ ] **T115** [US5] Implement delivery service in `apps/residence-app/src/services/deliveryService.ts` with methods: getDeliveries(household_id), confirmReceipt(delivery_id, photo), markReceived(delivery_id)
- [ ] **T116** [US5] Setup Realtime subscription for delivery arrivals in `apps/residence-app/src/hooks/useDeliveryRealtime.ts`: Subscribe to `deliveries` INSERT WHERE household_id, trigger push notification (FR-049)
- [ ] **T117** [US5] Implement delivery caching with WatermelonDB: Sync deliveries from `/deliveries` WHERE household_id, cache locally, observe for Realtime inserts
- [ ] **T118** [US5] Implement delivery confirmation queue: Queue receipt confirmation when offline (PATCH `/deliveries` with received_at, photo_url), sync when online
- [ ] **T119** [US5] Create DeliveriesScreen in `apps/residence-app/src/screens/deliveries/DeliveriesScreen.tsx` with tabs: Pending (awaiting confirmation), Received (with photos), History
- [ ] **T120** [US5] Implement 24-hour reminder logic: Query deliveries WHERE received_at IS NULL AND arrival_at < NOW() - 24 hours, send reminder push notification (FR-055)
- [ ] **T121** [US5] Handle camera permissions: Request camera permission with expo-camera, show permission denied message with settings link, allow photo picker as fallback

**Checkpoint**: User Story 5 complete - Residents receive and confirm delivery notifications with photos

---

## Phase 8: User Story 6 - Manage Household and Beneficial Users (Priority: P2)

**Goal**: Enable household heads to add/edit/remove household members and beneficial users with photos, designate primary contacts.

**Independent Test**: Add household member with photo (2MB) while offline (queued), add beneficial user, mark member as primary contact, edit member details, remove beneficial user (deactivates stickers). Test photo capture on iOS and Android.

**Offline Support**: Member add/edit actions queue when offline. Member list cached for offline viewing.

### Tests for User Story 6

**Unit Tests**:
- [ ] **T122** [P] [US6] [iOS/Android] Unit test for member validation (name required, valid DOB) in `apps/residence-app/src/components/household/__tests__/MemberForm.test.tsx`
- [ ] **T123** [P] [US6] [iOS/Android] Unit test for photo capture and validation (2MB limit, format) in `apps/residence-app/src/components/household/__tests__/MemberPhotoCapture.test.tsx`

**E2E Tests**:
- [ ] **T124** [US6] [iOS] E2E test: User adds member → captures photo → saves → member appears in list using Detox in `apps/residence-app/e2e/member-management-ios.e2e.ts`
- [ ] **T125** [US6] [Android] E2E test: User adds member → captures photo → saves → member appears in list using Detox in `apps/residence-app/e2e/member-management-android.e2e.ts`

### Implementation for User Story 6

- [ ] **T126** [P] [US6] Create HouseholdMemberForm component in `apps/residence-app/src/components/household/HouseholdMemberForm.tsx` with fields: first/last name, relationship dropdown (spouse, child, parent, sibling, other), DOB date picker, contact info, photo capture (expo-camera, 2MB limit per FR-012)
- [ ] **T127** [P] [US6] Create BeneficialUserForm component in `apps/residence-app/src/components/household/BeneficialUserForm.tsx` with fields: name, contact info, purpose (driver, helper, etc.), photo optional
- [ ] **T128** [P] [US6] Create MemberList component in `apps/residence-app/src/components/household/MemberList.tsx` displaying members with photos, relationship, primary contact indicator, edit/remove actions
- [ ] **T129** [P] [US6] Create MemberPhotoCapture component in `apps/residence-app/src/components/household/MemberPhotoCapture.tsx` using expo-camera for capture or expo-image-picker for gallery, validate 2MB limit, upload to Supabase Storage
- [ ] **T130** [US6] Implement household service in `apps/residence-app/src/services/householdService.ts` with methods: addMember(details, photo), editMember(member_id, updates), removeMember(member_id), addBeneficialUser(details), removeBeneficialUser(user_id), setPrimaryContact(member_id)
- [ ] **T131** [US6] Implement offline member management queue: Store member add/edit/remove in WatermelonDB, queue sync actions, sync to `/household_members` when online
- [ ] **T132** [US6] Implement member caching with WatermelonDB: Sync members from `/household_members` WHERE household_id, cache locally, observe for changes
- [ ] **T133** [US6] Create HouseholdScreen in `apps/residence-app/src/screens/household/HouseholdScreen.tsx` with sections: Members (list), Beneficial Users (list), Add Member (button), Household Info (residence, contact)
- [ ] **T134** [US6] Implement primary contact logic: PATCH `/household_members` with is_primary_contact=true for selected member, set others to false, update UI with badge
- [ ] **T135** [US6] Implement beneficial user removal with sticker deactivation: On remove, query associated stickers, update status to 'revoked' (FR-018), notify user of deactivated stickers
- [ ] **T136** [US6] Prevent household head self-removal: Validate member_id != household_head_id before removal, show error if attempting (edge case clarification)

**Checkpoint**: User Story 6 complete - Household heads can fully manage household composition

---

## Phase 9: User Story 7 - View Community Announcements (Priority: P3)

**Goal**: Enable household members to view announcements, filter by type, mark as read, and receive urgent notifications.

**Independent Test**: View announcements offline (cached), filter by type (urgent, event, maintenance), mark as read, receive urgent push notification on iOS/Android, download attachment.

**Offline Support**: Announcements cached for offline viewing. Attachments download when online.

### Tests for User Story 7

**Unit Tests**:
- [ ] **T137** [P] [US7] [iOS/Android] Unit test for announcement filtering (by type, unread status) in `apps/residence-app/src/components/announcements/__tests__/AnnouncementFilter.test.tsx`
- [ ] **T138** [P] [US7] [iOS/Android] Unit test for unread count calculation in `apps/residence-app/src/services/__tests__/announcementService.test.ts`

**E2E Tests**:
- [ ] **T139** [US7] [iOS] E2E test: Urgent announcement published → push notification → user views → marks as read using Detox in `apps/residence-app/e2e/announcements-ios.e2e.ts`
- [ ] **T140** [US7] [Android] E2E test: Urgent announcement published → push notification → user views → marks as read using Detox in `apps/residence-app/e2e/announcements-android.e2e.ts`

### Implementation for User Story 7

- [ ] **T141** [P] [US7] Create AnnouncementList component in `apps/residence-app/src/components/announcements/AnnouncementList.tsx` displaying announcements with title, type, date, unread indicator (badge), attachment icons
- [ ] **T142** [P] [US7] Create AnnouncementFilter component in `apps/residence-app/src/components/announcements/AnnouncementFilter.tsx` with type checkboxes (general, urgent, event, maintenance, fee_reminder, election), unread toggle
- [ ] **T143** [P] [US7] Create AnnouncementDetail component in `apps/residence-app/src/components/announcements/AnnouncementDetail.tsx` displaying full content, attachments (download button), published date, auto-mark-as-read on view
- [ ] **T144** [US7] Implement announcement service in `apps/residence-app/src/services/announcementService.ts` with methods: getAnnouncements(household_id), markAsRead(announcement_id), downloadAttachment(url)
- [ ] **T145** [US7] Setup Realtime subscription for urgent announcements in `apps/residence-app/src/hooks/useAnnouncementRealtime.ts`: Subscribe to `announcements` WHERE type='urgent' AND target_audience IN ('all', 'households'), trigger push notification (FR-059)
- [ ] **T146** [US7] Implement announcement caching with WatermelonDB: Sync announcements from `/announcements` WHERE target_audience IN ('all', 'households') AND tenant_id, cache locally, observe for Realtime inserts
- [ ] **T147** [US7] Create AnnouncementsScreen in `apps/residence-app/src/screens/announcements/AnnouncementsScreen.tsx` with filter at top, scrollable list, unread count badge
- [ ] **T148** [US7] Implement mark-as-read logic: On announcement view, increment view_count via PATCH `/announcements`, update local DB read_status, decrease unread count badge
- [ ] **T149** [US7] Implement attachment download: Fetch from Supabase Storage URL, save to device using expo-file-system, open with native viewer (PDF, images)

**Checkpoint**: User Story 7 complete - Residents stay informed via announcements

---

## Phase 10: User Story 8 - Manage Profile and Settings (Priority: P3)

**Goal**: Enable household heads to update profile, change password, configure notification preferences, and enable biometric authentication.

**Independent Test**: Update profile info offline (syncs), change password (requires online), configure notification preferences (push, email, SMS), enable Face ID on iOS/Fingerprint on Android.

**Offline Support**: Profile edits queue when offline. Password change and biometric setup require online connection.

### Tests for User Story 8

**Unit Tests**:
- [ ] **T150** [P] [US8] [iOS/Android] Unit test for password validation (requirements: 8+ chars, uppercase, number) in `apps/residence-app/src/components/settings/__tests__/ChangePasswordForm.test.tsx`
- [ ] **T151** [P] [US8] [iOS/Android] Unit test for biometric auth flow (enrollment, verification) in `apps/residence-app/src/lib/__tests__/biometric.test.ts`

**E2E Tests**:
- [ ] **T152** [US8] [iOS] E2E test: User enables Face ID → logs out → logs in with Face ID using Detox in `apps/residence-app/e2e/biometric-auth-ios.e2e.ts`
- [ ] **T153** [US8] [Android] E2E test: User enables Fingerprint → logs out → logs in with Fingerprint using Detox in `apps/residence-app/e2e/biometric-auth-android.e2e.ts`

### Implementation for User Story 8

- [ ] **T154** [P] [US8] Create ProfileEditForm component in `apps/residence-app/src/components/settings/ProfileEditForm.tsx` with fields: name, contact email/phone, save button
- [ ] **T155** [P] [US8] Create ChangePasswordForm component in `apps/residence-app/src/components/settings/ChangePasswordForm.tsx` with fields: current password, new password, confirm password, validation (8+ chars, uppercase, number)
- [ ] **T156** [P] [US8] Create NotificationSettings component in `apps/residence-app/src/components/settings/NotificationSettings.tsx` with toggles per feature: stickers (push/email/SMS), guests, fees, announcements, deliveries (FR-075)
- [ ] **T157** [P] [US8] Create BiometricSetup component in `apps/residence-app/src/components/settings/BiometricSetup.tsx` with enable/disable toggle, device capability check (expo-local-authentication.hasHardwareAsync()), enrollment prompt
- [ ] **T158** [P] [US8] Create HouseholdInfoViewer component in `apps/residence-app/src/components/settings/HouseholdInfoViewer.tsx` displaying residence number, household members count, active stickers count, subscription status (read-only)
- [ ] **T159** [US8] Implement profile service in `apps/residence-app/src/services/profileService.ts` with methods: updateProfile(updates), changePassword(currentPwd, newPwd), updateNotificationPrefs(prefs), enableBiometric(), disableBiometric()
- [ ] **T160** [US8] Implement offline profile update queue: Store profile updates in WatermelonDB, queue sync action, sync to `/household_members` (PATCH) when online
- [ ] **T161** [US8] Implement password change flow: Validate current password via Supabase Auth, update password, invalidate sessions except current, require online
- [ ] **T162** [US8] Implement biometric enrollment: Check device support, prompt user with expo-local-authentication.authenticateAsync(), store biometric preference in expo-secure-store, enable biometric login
- [ ] **T163** [US8] Implement notification preference persistence: Store in WatermelonDB user_preferences table, sync to Supabase, respect prefs when showing notifications (filter by enabled categories)
- [ ] **T164** [US8] Create SettingsScreen in `apps/residence-app/src/screens/settings/SettingsScreen.tsx` with sections: Profile, Security (password, biometric), Notifications, Household Info, Logout
- [ ] **T165** [US8] Implement biometric login flow: On app start, check if biometric enabled AND device supports, prompt Face ID/Touch ID/Fingerprint, authenticate, auto-login on success

**Checkpoint**: User Story 8 complete - Residents can personalize profile and security settings

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Production readiness, performance optimization, offline/online polish, payment error handling

- [ ] **T166** [P] Add loading skeletons for all screens using NativeWind skeleton components
- [ ] **T167** [P] Implement global error boundary with user-friendly error screens and retry actions
- [ ] **T168** [P] Add form validation helpers and error display with zod error messages
- [ ] **T169** [P] Optimize bundle size: Code-split routes with React.lazy (if using React Navigation dynamic imports), lazy load WatermelonDB models
- [ ] **T170** [P] Add haptic feedback for button presses using expo-haptics (iOS/Android)
- [ ] **T171** [P] Implement smooth animations for screen transitions using react-native-reanimated
- [ ] **T172** [P] Add pull-to-refresh on all list screens (stickers, guests, fees, deliveries, announcements) with sync trigger
- [ ] **T173** [P] Implement global search: Combine stickers, guests, fees, permits searches with debounced input
- [ ] **T174** [P] Add empty states: Custom illustrations for no stickers, no guests, no fees, etc.
- [ ] **T175** [P] Create onboarding tour for first-time users using react-native-onboarding-swiper
- [ ] **T176** [P] Add micro-interactions: Success animations (checkmark), loading spinners, swipe gestures
- [ ] **T177** [P] Implement deep linking for push notifications (tap notification → navigate to sticker/guest/fee detail)
- [ ] **T178** [P] Add image compression for photo uploads using expo-image-manipulator (reduce 2MB photos to <500KB before upload)
- [ ] **T179** Implement comprehensive offline sync monitoring: Sync status dashboard showing queued items count, last sync time, sync errors with retry all button
- [ ] **T180** Implement payment error recovery: Detect abandoned payments (initiated but not confirmed), allow resume or retry, prevent double-payment
- [ ] **T181** Add network quality indicator: Show 4G/3G/2G/WiFi icon, warn on slow connection before large uploads (permit plans)
- [ ] **T182** Implement app update checker: Check for OTA updates using expo-updates, prompt user to update when available
- [ ] **T183** Security audit: Review Supabase RLS policies from mobile perspective, validate JWT storage (expo-secure-store), check payment tokenization
- [ ] **T184** Performance optimization: Add FlatList optimizations (getItemLayout, removeClippedSubviews), optimize re-renders with React.memo, profile with Flipper
- [ ] **T185** iOS-specific: Test on iPhone SE (small screen), iPad (tablet layout), test Face ID enrollment and login
- [ ] **T186** Android-specific: Test on various screen sizes (5" to 7"), test Fingerprint enrollment, test back button navigation
- [ ] **T187** Run E2E test suite on both platforms: Execute all Detox tests (14 E2E tests) on iOS Simulator + Android Emulator
- [ ] **T188** Run unit test suite: Execute all Jest tests (14 unit tests) with coverage report (target 80%+ coverage)
- [ ] **T189** Test payment integrations in sandbox mode: Stripe test cards, PayMongo test mode, GCash simulator
- [ ] **T190** Test offline scenarios: Airplane mode during sticker request, guest scheduling, fee payment (validate queue behavior)
- [ ] **T191** Test push notifications: Sticker approval, guest arrival, delivery, urgent announcement on iOS and Android physical devices
- [ ] **T192** Run quickstart validation: Follow quickstart.md setup steps, verify Expo dev build, test on physical devices
- [ ] **T193** Documentation updates: Update README with resident app features, add offline architecture diagram, payment flow documentation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup (Phase 1) - BLOCKS all user stories
- **User Stories (Phases 3-10)**: All depend on Foundational (Phase 2) completion
  - Recommended sequential order for single developer: US1 (P1) → US2 (P1) → US3 (P1) → US4 (P2) → US5 (P2) → US6 (P2) → US7 (P3) → US8 (P3)
  - Parallel execution possible with team: US1, US2, US3 can run simultaneously after Foundational
- **Polish (Phase 11)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1 - MVP)**: Can start after Foundational - No dependencies on other stories ✅ **START HERE**
- **User Story 2 (P1)**: Can start after Foundational - No dependencies (independent guest scheduling)
- **User Story 3 (P1)**: Can start after Foundational - Depends on payment service from Foundational (T027-T031)
- **User Story 4 (P2)**: Can start after US3 - Shares payment flow with fees
- **User Story 5 (P2)**: Can start after Foundational - No dependencies (delivery notifications)
- **User Story 6 (P2)**: Can start after Foundational - No dependencies (household management)
- **User Story 7 (P3)**: Can start after Foundational - No dependencies (announcements)
- **User Story 8 (P3)**: Can start after Foundational - No dependencies (profile/settings)

### Mobile-Specific Dependencies

- **WatermelonDB Setup (T014-T018)**: Required before any offline storage (US1-US8 all depend on this)
- **Payment Integration (T027-T031)**: Required before US3 (fees) and US4 (permits)
- **Push Notifications (T039-T040)**: Required before US1 (sticker approval), US2 (guest arrival), US5 (delivery), US7 (urgent announcements)
- **Camera Integration (T041)**: Required before US1 (OR/CR upload), US5 (delivery photo), US6 (member photo)

### Offline/Online Sync Dependencies

- **Network Status (T023)**: Required for all offline-capable user stories (US1, US2, US4, US5, US6, US8)
- **Sync Queue (T024)**: Required for all queued actions (sticker requests, guest scheduling, permit submission, profile updates)
- **Sync Manager (T018)**: Required for WatermelonDB ↔ Supabase bidirectional sync

### Platform Testing Dependencies

- **iOS Tests**: Require iOS Simulator or physical iPhone, Xcode Command Line Tools, Detox iOS setup
- **Android Tests**: Require Android Emulator or physical Android device, Android Studio, Detox Android setup
- **Both Platforms**: All E2E tests (T045-T046, T062-T063, T078-T079, T095-T096, T110-T111, T124-T125, T139-T140, T152-T153) must pass on BOTH iOS and Android

### Within Each User Story

- **Tests BEFORE Implementation**: Unit tests → E2E tests (iOS + Android) → Implementation → Checkpoint
- Offline/Online components in parallel (different files)
- Shared services before screen-specific logic
- Core implementation before platform-specific polish

### Parallel Opportunities

**Phase 1 (Setup)**: All tasks T001-T013 can run in parallel (marked [P])

**Phase 2 (Foundational)**:
- WatermelonDB models T015 (8 models) can all run in parallel
- Supabase services T019-T022 can run in parallel
- Payment services T027-T031 can run in parallel
- UI components T038 can run in parallel
- Notification service T039-T040 can run in parallel

**Within User Stories**:
- All components marked [P] can run in parallel (different files)
- All unit tests marked [P] can run in parallel
- iOS and Android E2E tests can run in parallel on separate machines
- Example US1: T047, T048, T049, T050 (4 components) + T043, T044 (2 unit tests) can all run in parallel

**Cross-Story Parallelization** (if team capacity):
- After Foundational completes, US1 + US2 + US6 can start simultaneously (3 developers)
- US3 + US4 share payment logic, better sequential or shared developer
- US5 + US7 + US8 are independent, can run in parallel

---

## Parallel Example: User Story 1 (Vehicle Stickers)

```bash
# After Foundational (Phase 2) completes, launch US1 in parallel:

# Tests in parallel:
Task: "[iOS/Android] Unit test sticker request validation"
Task: "[iOS/Android] Unit test sticker sync queue"
Task: "[iOS] E2E test sticker request offline → online sync"
Task: "[Android] E2E test sticker request offline → online sync"

# Components in parallel:
Task: "Create StickerRequestForm component"
Task: "Create StickerList component"
Task: "Create StickerStatusTracker component"
Task: "Create DocumentUploadComponent"

# Then sequential (depend on above):
Task: "Implement sticker request service with offline queue"
Task: "Setup Realtime subscription for approvals"
Task: "Create StickersScreen"
```

**Result**: 4 tests + 4 components built in parallel, then integrated sequentially → US1 complete faster

---

## Parallel Example: Multiple User Stories with Platform Testing

```bash
# After Foundational (Phase 2) completes, assign to 4 developers:

Developer 1: Work on User Story 1 (Stickers) - Tasks T043-T059 + iOS/Android tests
Developer 2: Work on User Story 2 (Guests) - Tasks T060-T075 + iOS/Android tests
Developer 3: Work on User Story 3 (Fees + Payments) - Tasks T076-T092 + iOS/Android tests
Developer 4: Setup Offline Sync Monitoring and Payment Services - Tasks T023-T026, T027-T031

# All complete in parallel, then:
Developer 1: Work on User Story 4 (Permits) - Tasks T093-T107
Developer 2: Work on User Story 5 (Deliveries) - Tasks T108-T121
Developer 3: Work on User Story 6 (Household) - Tasks T122-T136
Developer 4: Work on User Story 7 (Announcements) - Tasks T137-T149

# Then all developers work on User Story 8 + Polish
```

**Result**: 8 user stories + platform tests completed in ~5 sprint cycles vs 8+ sequential

---

## Implementation Strategy

### MVP Scope (Week 1-3) 🎯
**Goal**: Ship core mobile functionality with offline support and payment
- Phase 1: Setup (T001-T013)
- Phase 2: Foundational with Offline DB + Payments (T014-T042)
- Phase 3: User Story 1 - Stickers (T043-T059) ✅ **Ship stickers offline/online**
- Phase 4: User Story 2 - Guests (T060-T075) ✅ **Add guest scheduling with QR**
- Phase 5: User Story 3 - Fees + Payments (T076-T092) ✅ **Enable mobile payments**

**Outcome**: Residents can request stickers, schedule guests, pay fees - all core access and financial features functional on iOS and Android

### Iteration 2 (Week 4-5)
**Goal**: Add construction and delivery management
- Phase 6: User Story 4 - Permits (T093-T107)
- Phase 7: User Story 5 - Deliveries (T108-T121)

**Outcome**: Permit submissions with road fee payments and delivery tracking

### Iteration 3 (Week 6-7)
**Goal**: Add household management and communication
- Phase 8: User Story 6 - Household (T122-T136)
- Phase 9: User Story 7 - Announcements (T137-T149)
- Phase 10: User Story 8 - Profile/Settings (T150-T165)

**Outcome**: Full household control, community communication, and personalization

### Final Polish (Week 8-9)
- Phase 11: Polish, Performance, Platform Testing (T166-T193)

**Outcome**: Production-ready mobile app for iOS and Android with polished UX

### Recommended Execution Order (Single Developer)
1. **Start**: Setup + Foundational + Offline DB + Payments (T001-T042) - 7-8 days
2. **MVP Part 1**: User Story 1 - Stickers (T043-T059) - 3-4 days → **SHIP STICKERS** 🚀
3. **MVP Part 2**: User Story 2 - Guests (T060-T075) - 3-4 days → **SHIP GUESTS** 🚀
4. **MVP Part 3**: User Story 3 - Fees (T076-T092) - 4-5 days → **SHIP PAYMENTS** 🚀
5. **Iteration 1**: User Story 4 - Permits (T093-T107) - 3-4 days
6. **Iteration 2**: User Story 5 - Deliveries (T108-T121) - 2-3 days
7. **Iteration 3**: User Story 6 - Household (T122-T136) - 3-4 days
8. **Iteration 4**: User Story 7 - Announcements (T137-T149) - 2-3 days
9. **Iteration 5**: User Story 8 - Settings (T150-T165) - 2-3 days
10. **Final**: Polish + Platform Testing (T166-T193) - 5-7 days

**Total**: ~8-9 weeks for single developer, ~5-6 weeks with team of 4

---

## Task Summary

- **Total Tasks**: **193 tasks**
- **Setup Tasks**: 13 (Phase 1)
- **Foundational Tasks**: 29 (Phase 2) ⚠️ BLOCKS all stories
  - WatermelonDB setup: 5 (T014-T018)
  - Supabase integration: 4 (T019-T022)
  - Offline/Online sync: 4 (T023-T026)
  - Payment integration: 5 (T027-T031)
  - Auth & Navigation: 5 (T032-T036)
  - UI & Notifications: 6 (T037-T042)
- **User Story Tasks**: 123 (Phases 3-10)
  - US1 (P1 - MVP): 17 tasks (T043-T059) - Stickers + 4 tests (2 unit, 2 E2E iOS/Android)
  - US2 (P1 - MVP): 16 tasks (T060-T075) - Guests + 4 tests
  - US3 (P1 - MVP): 17 tasks (T076-T092) - Fees + 4 tests (includes payment integration)
  - US4 (P2): 15 tasks (T093-T107) - Permits + 4 tests
  - US5 (P2): 14 tasks (T108-T121) - Deliveries + 4 tests
  - US6 (P2): 15 tasks (T122-T136) - Household + 4 tests
  - US7 (P3): 13 tasks (T137-T149) - Announcements + 4 tests
  - US8 (P3): 16 tasks (T150-T165) - Settings + 4 tests
- **Polish Tasks**: 28 (Phase 11)
- **Test Tasks**: 32 total
  - Unit tests: 16 (2 per user story, iOS/Android compatible)
  - E2E tests: 16 (2 per user story: 1 iOS, 1 Android)
- **Parallel Tasks**: 89 tasks marked [P] (46% can run in parallel)

### MVP Scope (Recommended First Shipment)
- **Phases**: 1 (Setup) + 2 (Foundational) + 3 (US1) + 4 (US2) + 5 (US3)
- **Tasks**: T001-T092 (92 tasks)
- **Effort**: ~3-4 weeks (single developer)
- **Value**: ✅ Core mobile operations - stickers, guests, payments all functional on iOS and Android with offline support

### By User Story Priority
- **P1 (Must Have)**: 50 tasks - US1 (Stickers), US2 (Guests), US3 (Fees) ✅ **MVP Core**
- **P2 (Should Have)**: 44 tasks - US4 (Permits), US5 (Deliveries), US6 (Household)
- **P3 (Nice to Have)**: 29 tasks - US7 (Announcements), US8 (Settings)
- **Infrastructure**: 42 tasks - Setup + Foundational (offline DB, payments, auth)
- **Polish**: 28 tasks - Platform testing, performance, UX enhancements

### Offline/Online Coverage
- **Offline-capable features**: Stickers (US1), Guests (US2), Permits (US4), Deliveries (US5), Household (US6), Announcements (US7), Settings (US8)
- **Online-required features**: Payments (US3, US4), Password change (US8), Biometric enrollment (US8)
- **Sync queue priorities**: High (payments, permit road fees), Normal (sticker requests, guest scheduling, member updates)

### Payment Integration Coverage
- **Stripe**: Integrated for cards (iOS and Android) via @stripe/stripe-react-native
- **PayMongo/GCash**: Integrated for PH payments via REST API + WebView redirect
- **Payment flows**: Fee payments (US3), Permit road fees (US4)
- **Error handling**: Retry queue, user-friendly messages, abandoned payment recovery

### Platform Testing Coverage
- **iOS Tests**: 8 E2E tests (Detox) covering all user stories, Face ID testing
- **Android Tests**: 8 E2E tests (Detox) covering all user stories, Fingerprint testing
- **Unit Tests**: 16 tests (Jest) compatible with both platforms
- **Platform-specific**: Camera (iOS/Android), Biometric (Face ID vs Fingerprint), Payment UI

---

## Notes

- **Offline-First Architecture**: ✅ Fully implemented with WatermelonDB for local storage, sync queue for offline actions, network status detection
- **Payment Integration**: ✅ Dual payment gateway support (Stripe for cards, PayMongo/GCash for PH) with comprehensive error handling
- **Platform Testing**: ✅ Explicit iOS and Android testing tasks (16 E2E tests total, 8 per platform)
- **Mobile-Specific**: Camera integration (photo capture, document upload), push notifications, biometric auth, QR code generation
- **Tech Stack**: React Native 0.73+ + Expo SDK 50+ + WatermelonDB + Supabase + Stripe + NativeWind
- **File Structure**: Mobile app structure with feature-based organization, offline database, payment services, comprehensive testing
