# Residence App - Village Tech Mobile Application

This is the household management mobile application for Village Tech residents built with React Native and Expo.

## Features

- Vehicle sticker requests and tracking
- Guest scheduling and management
- Association fee viewing and payment
- Construction permit submissions
- Delivery notifications
- Community announcements
- Household member management
- Offline-first architecture

## Tech Stack

- **Framework**: React Native 0.73+ with Expo SDK 50+
- **Language**: TypeScript 5.3+ (strict mode)
- **Navigation**: React Navigation v6
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Offline Storage**: WatermelonDB
- **Forms**: React Hook Form + Zod validation
- **Payments**: Stripe, PayMongo, GCash
- **Testing**: Jest (unit), Detox (E2E)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI
- iOS Simulator (for Mac) or Android Emulator

### Installation

```bash
# Install dependencies
npm install

# Start the development server
npx expo start

# Run on iOS
npx expo run:ios

# Run on Android
npx expo run:android
```

## Project Structure

```
src/
├── components/    # Reusable UI components
│   ├── ui/       # Base UI components
│   ├── shared/   # Shared components
│   └── payment/  # Payment-specific components
├── contexts/     # React contexts (Auth, etc)
├── database/     # WatermelonDB models and schema
│   ├── models/   # Database models
│   └── migrations/
├── hooks/        # Custom React hooks
├── lib/          # External service integrations
├── navigation/   # Navigation structure
├── screens/      # App screens
├── services/     # Business logic and API calls
├── types/        # TypeScript type definitions
└── utils/        # Utility functions
```

## Environment Variables

Create a `.env` file in the root directory:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_key
```

## Development Status

- ✅ Specification completed
- ✅ Project initialized
- ✅ Core dependencies installed
- 🚧 Database schema setup (next)
- 🚧 Navigation structure (pending)
- 🚧 Authentication flow (pending)
- 🚧 User story implementations (pending)

## Testing

```bash
# Run unit tests
npm test

# Run E2E tests on iOS
npm run test:ios

# Run E2E tests on Android
npm run test:android
```

## Contributing

See the [tasks.md](../../specs/003-household-management-mobile/tasks.md) for the detailed implementation plan.