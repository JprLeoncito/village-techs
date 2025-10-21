# Vercel Deployment Guide for Village-Techs Apps

This guide provides step-by-step instructions for deploying all Village-Techs applications to Vercel.

## Overview of Applications

You have **4 applications** in the `apps/` directory:

1. **Admin Dashboard** (`apps/admin-dashboard`) - Vite + React SPA (✅ **Fully Configured**)
2. **Platform Dashboard** (`apps/platform-dashboard`) - Vite + React SPA (✅ **Fully Configured**)
3. **Residence App** (`apps/residence-app`) - React Native/Expo (✅ **Web Configured**)
4. **Sentinel App** (`apps/sentinel-app`) - React Native/Expo (⚠️ **Needs Configuration**)

### 📋 Configuration Status (Updated October 21, 2025)
- ✅ **Admin Dashboard**: Vercel-ready with optimized build configuration
- ✅ **Platform Dashboard**: Vercel-ready with optimized build configuration
- ✅ **Residence App**: Web deployment configured with Metro bundler
- ⚠️ **Sentinel App**: Still needs web deployment configuration

## 🚀 Quick Deployment Commands

**Ready to Deploy Now:**
```bash
# Admin Dashboard (✅ Ready)
cd apps/admin-dashboard && vercel --prod

# Platform Dashboard (✅ Ready)
cd apps/platform-dashboard && vercel --prod

# Residence App Web (✅ Ready)
cd apps/residence-app && npm run build:web && vercel --prod

# Sentinel App (⚠️ Configure first)
# See configuration steps below
```

## Pre-deployment Requirements

### 1. Vercel Account Setup
- Sign up at [vercel.com](https://vercel.com)
- Install Vercel CLI: `npm i -g vercel`
- Connect your Git repository

### 2. Environment Variables
You'll need these environment variables configured in Vercel:
```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# API Configuration
API_URL=your_api_endpoint_url
```

## Deployment Instructions by App

### 1. Admin Dashboard (✅ Fully Configured)

**Status**: Ready for deployment
**Framework**: Vite + React
**Build Output**: Static Site

**Current Configuration**:
- ✅ `vercel.json` configured and optimized
- ✅ `vite.config.ts` with production optimizations
- Port: 5174 (development)
- Build command: `npm run build`
- Output directory: `dist`
- Optimized chunk splitting for better performance

**Configuration Files Added/Updated**:
- `vercel.json` - Vercel deployment configuration
- `vite.config.ts` - Enhanced with production build optimizations

**Deployment Steps**:
1. Navigate to admin-dashboard directory:
   ```bash
   cd apps/admin-dashboard
   ```

2. Deploy to Vercel:
   ```bash
   vercel --prod
   ```

3. Set environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_URL`

### 2. Platform Dashboard (✅ Fully Configured)

**Status**: Ready for deployment
**Framework**: Vite + React
**Build Output**: Static Site

**Current Configuration**:
- ✅ `vercel.json` configured and optimized
- ✅ `vite.config.ts` with production optimizations
- Port: 5173 (development)
- Build command: `npm run build`
- Output directory: `dist`
- Optimized chunk splitting for better performance

**Configuration Files Added/Updated**:
- `vercel.json` - Vercel deployment configuration with environment variables
- `vite.config.ts` - Enhanced with production build optimizations and manual chunking

**Key Optimizations Applied**:
- Manual chunk splitting for vendor, router, supabase, and UI libraries
- Source maps enabled for debugging
- Optimized rollup configuration for better bundle sizes

**Deployment Steps**:
1. Navigate to platform-dashboard directory:
   ```bash
   cd apps/platform-dashboard
   ```

2. Deploy to Vercel:
   ```bash
   vercel --prod
   ```

3. Set environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_URL`

### 3. Residence App (✅ Web Configured)

**Status**: Ready for web deployment
**Framework**: Expo (React Native with web support)
**Build Output**: Static Site (Web)

**Current Configuration**:
- ✅ `vercel.json` configured for web deployment
- ✅ `app.json` updated with Metro bundler settings
- ✅ `package.json` includes `build:web` script
- Build command: `npm run build:web` (uses `expo export:web`)
- Output directory: `dist`

**Configuration Files Added/Updated**:
- `vercel.json` - Vercel deployment configuration for web
- `app.json` - Updated web section with Metro bundler and static output
- `package.json` - Added `build:web` script

**Web Configuration Applied**:
- Metro bundler for web builds
- Static output generation for optimal deployment
- Proper environment variable handling with `EXPO_PUBLIC_` prefix

**Deployment Steps**:
1. Navigate to residence-app directory:
   ```bash
   cd apps/residence-app
   ```

2. Build for web:
   ```bash
   npm run build:web
   ```

3. Deploy to Vercel:
   ```bash
   vercel --prod
   ```

4. Set environment variables in Vercel dashboard:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `EXPO_PUBLIC_API_URL`

### 4. Sentinel App (Expo Web)

**Status**: Needs web deployment configuration
**Framework**: Expo (React Native with web support)
**Build Output**: Static Site (Web)

**Setup Steps**:

1. Create `vercel.json` in `apps/sentinel-app/`:
```json
{
  "version": 2,
  "name": "village-tech-sentinel",
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "env": {
    "EXPO_PUBLIC_SUPABASE_URL": "@supabase-url",
    "EXPO_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key",
    "EXPO_PUBLIC_API_URL": "@api-url"
  },
  "installCommand": "npm install",
  "buildCommand": "npx expo export:web",
  "outputDirectory": "dist",
  "framework": null
}
```

2. Create or update `app.json` with web configuration:
```json
{
  "expo": {
    "name": "Sentinel App",
    "slug": "sentinel-app",
    "version": "1.0.0",
    "web": {
      "bundler": "metro",
      "output": "static",
      "favicon": "./assets/favicon.png"
    },
    "scheme": "village-sentinel"
  }
}
```

3. Add web build script to `package.json`:
```json
{
  "scripts": {
    "web": "expo start --web",
    "build:web": "expo export:web"
  }
}
```

4. Deploy:
```bash
cd apps/sentinel-app
npm run build:web
vercel --prod
```

## Monorepo Deployment Strategy

### Option 1: Individual Repositories (Recommended)
Convert each app to its own Git repository for independent deployments:
- `village-tech-admin`
- `village-tech-platform`
- `village-tech-residence`
- `village-tech-sentinel`

### Option 2: Single Repository with Multiple Projects
Keep monorepo structure and use Vercel's monorepo support:

1. Root `vercel.json`:
```json
{
  "version": 2,
  "buildCommand": "echo 'No build at root'",
  "installCommand": "echo 'No install at root'",
  "framework": null
}
```

2. Deploy individual apps:
```bash
# Admin Dashboard
vercel --prod apps/admin-dashboard

# Platform Dashboard
vercel --prod apps/platform-dashboard

# Residence App
vercel --prod apps/residence-app

# Sentinel App
vercel --prod apps/sentinel-app
```

## Environment Variables Setup

### Vercel Dashboard Configuration
For each project, configure these environment variables:

**✅ Admin Dashboard:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_URL`

**✅ Platform Dashboard:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_URL`

**✅ Residence App:**
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_API_URL`

**⚠️ Sentinel App (when configured):**
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_API_URL`

### Using Vercel CLI
```bash
# Set environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add VITE_API_URL
```

## Custom Domain Setup

1. Add custom domain in Vercel dashboard
2. Update DNS settings (CNAME record)
3. Configure SSL (automatic with Vercel)

## Deployment Checklist

Before deploying each app:

- [ ] Environment variables configured
- [ ] Build script works locally
- [ ] `vercel.json` properly configured
- [ ] Test in preview deployment
- [ ] Custom domains configured (if needed)
- [ ] SSL certificates active
- [ ] Analytics and monitoring set up

## Troubleshooting

### Common Issues

1. **Build Failures**:
   - Check `package.json` scripts
   - Verify dependencies are installed
   - Review build logs in Vercel

2. **Environment Variables**:
   - Ensure correct naming convention (`VITE_` for Vite, `EXPO_PUBLIC_` for Expo)
   - Check variables are set in correct environment (production/preview)

3. **Routing Issues**:
   - Verify `vercel.json` routes configuration
   - Check SPA fallback to `index.html`

4. **Expo Web Build Issues**:
   - Ensure `expo export:web` works locally
   - Check Metro bundler configuration
   - Verify web-specific dependencies

### Performance Optimization

1. **Enable Edge Functions** for API calls
2. **Configure Build Caching** in Vercel
3. **Optimize Images** with Next.js Image component
4. **Enable CDN** for static assets
5. **Set up Analytics** with Vercel Analytics

## Post-Deployment

1. **Monitor Performance** using Vercel Analytics
2. **Set up Alerts** for build failures
3. **Configure Backups** for database
4. **Test Critical User Flows**
5. **Update DNS** if using custom domains

## Cost Considerations

- **Hobby Tier**: Free for personal projects
- **Pro Tier**: $20/month for team collaboration
- **Enterprise**: Custom pricing

All 4 apps can be deployed on Vercel's free tier with limitations.

## 📝 Configuration Summary

### Files Created/Updated (October 21, 2025)

**Admin Dashboard (`apps/admin-dashboard/`):**
- ✅ Updated `vite.config.ts` - Added production build optimizations with manual chunking
- ✅ Existing `vercel.json` - Already properly configured

**Platform Dashboard (`apps/platform-dashboard/`):**
- ✅ Created `vercel.json` - Complete Vercel configuration with environment variables
- ✅ Updated `vite.config.ts` - Added production build optimizations and manual chunking

**Residence App (`apps/residence-app/`):**
- ✅ Created `vercel.json` - Web deployment configuration for Expo
- ✅ Updated `app.json` - Added Metro bundler and static output configuration
- ✅ Updated `package.json` - Added `build:web` script using `expo export:web`

**Sentinel App (`apps/sentinel-app/`):**
- ⚠️ Still needs configuration - Follow the steps in Section 4

### Production Optimizations Applied

**Vite Applications (Admin & Platform):**
- Manual chunk splitting for better caching and performance
- Source maps enabled for debugging
- Optimized rollup configuration
- Proper environment variable handling

**Expo Web Application (Residence):**
- Metro bundler configuration for web builds
- Static output generation
- Expo web export configuration
- Proper environment variable prefixing

---

*This guide covers deployment for all Village-Techs applications. 3 out of 4 apps are now fully configured for Vercel deployment. Update configurations as your applications evolve.*