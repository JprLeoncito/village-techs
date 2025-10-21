# Research: Multi-Tenant Management Platform Technology Decisions

**Feature**: 001-multi-tenant-management
**Date**: 2025-10-09
**Phase**: 0 (Research & Technology Selection)

## Overview

This document captures research findings and technology decisions for the Platform Dashboard (Superadmin) implementation. Each decision includes rationale, alternatives considered, and implementation guidance.

## 1. State Management: Zustand

**Decision**: Use Zustand for global state management

**Rationale**:
- **Simplicity**: Minimal boilerplate compared to Redux Toolkit (no actions, reducers, or dispatch)
- **Bundle Size**: ~1KB vs Redux Toolkit ~12KB (significant for web performance)
- **DevTools**: Supports Redux DevTools for debugging without Redux complexity
- **TypeScript**: Excellent TypeScript support with type inference
- **Supabase Integration**: Works seamlessly with TanStack Query for server state (Zustand for UI state only)
- **Learning Curve**: Team can be productive immediately without Redux patterns

**Alternatives Considered**:
- **Redux Toolkit**: More powerful but overkill for this app's state needs. Adds complexity for little benefit. Superadmin dashboard has limited global state (current user, sidebar open/closed, selected community filter).
- **Context + useReducer**: Built-in but lacks DevTools, requires custom implementation for persistence, and has performance issues with frequent updates.
- **Jotai/Recoil**: Atomic state management is elegant but newer/less mature. Zustand's store pattern is more familiar.

**Implementation Guidance**:
```typescript
// store/index.ts
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface AppState {
  user: User | null
  sidebarOpen: boolean
  selectedCommunityId: string | null
  setUser: (user: User | null) => void
  toggleSidebar: () => void
  setSelectedCommunity: (id: string | null) => void
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        sidebarOpen: true,
        selectedCommunityId: null,
        setUser: (user) => set({ user }),
        toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
        setSelectedCommunity: (id) => set({ selectedCommunityId: id }),
      }),
      { name: 'app-storage' }
    )
  )
)
```

**References**:
- [Zustand Documentation](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [Zustand vs Redux comparison](https://blog.logrocket.com/zustand-vs-redux/)

---

## 2. Map Provider: Mapbox GL JS

**Decision**: Use Mapbox GL JS for gate location visualization

**Rationale**:
- **Pricing**: Free tier includes 50,000 monthly map loads (sufficient for 100+ communities with moderate usage)
- **Features**: Custom marker styling, clustering, popup info windows, satellite/street view toggle
- **Performance**: WebGL rendering for smooth interaction with 20+ gate markers
- **React Integration**: `react-map-gl` wrapper provides clean React API
- **Geocoding**: Includes geocoding API for address → coordinates conversion
- **Customization**: Full control over map styling via Mapbox Studio

**Alternatives Considered**:
- **Google Maps**: More expensive ($7/1000 map loads after free tier), but more familiar UI and better POI data. Not needed for internal admin tool.
- **Leaflet + OpenStreetMap**: Free but lacks advanced features (clustering, 3D buildings). Requires more custom code for marker clustering.
- **Maplibre GL**: Open-source fork of Mapbox GL, free but less polished and no official geocoding service.

**Implementation Guidance**:
```typescript
// components/features/gates/GateMap.tsx
import Map, { Marker, Popup } from 'react-map-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

export function GateMap({ gates }: { gates: Gate[] }) {
  const [selectedGate, setSelectedGate] = useState<Gate | null>(null)

  return (
    <Map
      mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
      initialViewState={{
        longitude: gates[0]?.longitude || 0,
        latitude: gates[0]?.latitude || 0,
        zoom: 15
      }}
      style={{ width: '100%', height: '500px' }}
      mapStyle="mapbox://styles/mapbox/streets-v12"
    >
      {gates.map((gate) => (
        <Marker
          key={gate.id}
          longitude={gate.longitude}
          latitude={gate.latitude}
          onClick={() => setSelectedGate(gate)}
        >
          <div className="gate-marker">{gate.type === 'vehicle' ? '🚗' : '🚶'}</div>
        </Marker>
      ))}

      {selectedGate && (
        <Popup
          longitude={selectedGate.longitude}
          latitude={selectedGate.latitude}
          onClose={() => setSelectedGate(null)}
        >
          <div>
            <h3>{selectedGate.name}</h3>
            <p>Type: {selectedGate.type}</p>
            <p>Hours: {selectedGate.operating_hours}</p>
          </div>
        </Popup>
      )}
    </Map>
  )
}
```

**Setup Steps**:
1. Create Mapbox account at https://account.mapbox.com/
2. Get access token from dashboard
3. Add to `.env.local`: `VITE_MAPBOX_TOKEN=pk.xxx`
4. Install: `pnpm add mapbox-gl react-map-gl`
5. Store token in Supabase Secrets for Edge Functions if needed

**References**:
- [Mapbox GL JS Docs](https://docs.mapbox.com/mapbox-gl-js/guides/)
- [react-map-gl Documentation](https://visgl.github.io/react-map-gl/)

---

## 3. CSV Import Strategy: Edge Function Processing

**Decision**: Process CSV imports via Supabase Edge Function with streaming progress

**Rationale**:
- **File Size**: Client-side limited to browser memory. Edge Function handles 10MB files safely with Deno runtime.
- **Validation**: Complex validation (duplicate unit numbers, FK checks) requires database access. Edge Function has service_role access.
- **Progress**: Streaming responses via Server-Sent Events (SSE) provide real-time progress to UI.
- **Error Handling**: Detailed validation errors per row with rollback on failure.
- **Security**: No client-side exposure of service_role key. Validates tenant_id from superadmin JWT.

**Alternatives Considered**:
- **Client-side parsing (PapaParse)**: Fast for small files but fails on large imports. No database access for validation. Exposes all data in browser memory.
- **Direct SQL COPY**: Fastest but no per-row validation or progress feedback. All-or-nothing approach unsuitable for user-uploaded CSVs.
- **Background job (pg_cron)**: Asynchronous but no real-time progress. User must poll for completion.

**Implementation Guidance**:

```typescript
// supabase/functions/process-csv-import/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { parse } from 'https://deno.land/std@0.168.0/encoding/csv.ts'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { file_base64, community_id } = await req.json()
  const csvText = atob(file_base64)
  const rows = await parse(csvText, { skipFirstRow: true })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let imported = 0
      let failed = 0
      const errors: any[] = []

      for (const [index, row] of rows.entries()) {
        try {
          // Validate row
          if (!row.unit_number || !row.type) {
            throw new Error('Missing required fields')
          }

          // Check for duplicate unit_number
          const { data: existing } = await supabase
            .from('residences')
            .select('id')
            .eq('tenant_id', community_id)
            .eq('unit_number', row.unit_number)
            .single()

          if (existing) {
            throw new Error(`Duplicate unit number: ${row.unit_number}`)
          }

          // Insert residence
          await supabase.from('residences').insert({
            tenant_id: community_id,
            unit_number: row.unit_number,
            type: row.type,
            max_occupancy: parseInt(row.max_occupancy),
            lot_area: parseFloat(row.lot_area),
            floor_area: parseFloat(row.floor_area)
          })

          imported++
        } catch (error) {
          failed++
          errors.push({ row: index + 1, error: error.message })
        }

        // Send progress update
        const progress = {
          total: rows.length,
          imported,
          failed,
          current: index + 1
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(progress)}\n\n`))
      }

      // Send final result
      const result = {
        success: true,
        imported,
        failed,
        errors
      }
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(result)}\n\n`))
      controller.close()
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
})
```

```typescript
// Frontend: lib/api/csv-import.ts
export async function importCSV(file: File, communityId: string) {
  const base64 = await fileToBase64(file)

  const eventSource = new EventSource(
    `/functions/v1/process-csv-import?file_base64=${base64}&community_id=${communityId}`
  )

  return new Promise((resolve, reject) => {
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.success !== undefined) {
        eventSource.close()
        resolve(data)
      } else {
        // Progress update
        onProgress?.(data)
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
      reject(new Error('CSV import failed'))
    }
  })
}
```

**CSV Template Format**:
```csv
unit_number,type,max_occupancy,lot_area,floor_area
101,condo,4,0,120.5
102,condo,2,0,85.3
201,townhouse,6,150.0,180.0
```

**References**:
- [Deno CSV parsing](https://deno.land/std/encoding/csv.ts)
- [Server-Sent Events (SSE)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)

---

## 4. Concurrent Edit Handling: Optimistic Locking with updated_at

**Decision**: Use PostgreSQL `updated_at` timestamp for optimistic locking with conflict detection

**Rationale**:
- **Simplicity**: No additional version column needed. `updated_at` already exists per constitution.
- **User Experience**: Allows simultaneous editing with last-write-wins + conflict warning (vs blocking)
- **Constitution Compliant**: Spec says "optimistic locking acceptable" for rare concurrent edits
- **Implementation**: Compare `updated_at` on update. If mismatch, fetch fresh data and warn user.

**Alternatives Considered**:
- **Pessimistic Locking (SELECT FOR UPDATE)**: Blocks other users during edit session. Poor UX for web app where users leave tabs open. Requires connection pooling management.
- **Version Column**: Explicit `version` integer that increments. More obvious but redundant with `updated_at`. Adds complexity.
- **Advisory Locks**: PostgreSQL advisory locks complex to manage with connection pooling. Overkill for admin dashboard.

**Implementation Guidance**:

```typescript
// hooks/useCommunityUpdate.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useCommunityUpdate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data, lastUpdated }: UpdateParams) => {
      const { data: result, error } = await supabase
        .from('communities')
        .update(data)
        .eq('id', id)
        .eq('updated_at', lastUpdated) // Optimistic lock check
        .select()
        .single()

      if (error?.code === 'PGRST116') {
        // No rows updated = conflict
        throw new ConflictError('Community was modified by another user')
      }

      return result
    },
    onError: (error) => {
      if (error instanceof ConflictError) {
        // Fetch fresh data
        queryClient.invalidateQueries(['community', id])

        // Show user-friendly error
        toast.error('This community was modified by another user. Please review the latest changes.')
      }
    }
  })
}
```

```sql
-- Database: updated_at auto-update trigger (already per constitution)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_communities_updated_at
BEFORE UPDATE ON communities
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Conflict Resolution UI**:
- Display modal: "Another user modified this community. View changes?"
- Show diff of current form values vs fresh database values
- Options: "Discard my changes" or "Overwrite their changes" (with confirmation)

**References**:
- [Optimistic vs Pessimistic Locking](https://www.postgresql.org/docs/current/mvcc.html)
- [TanStack Query Optimistic Updates](https://tanstack.com/query/latest/docs/guides/optimistic-updates)

---

## 5. Report Generation: jsPDF for PDF, exceljs for Excel

**Decision**:
- **CSV**: Client-side generation (trivial with `Array.map().join()`)
- **PDF**: Server-side with jsPDF via Edge Function
- **Excel**: Server-side with exceljs via Edge Function (optional, nice-to-have)

**Rationale**:
- **CSV**: Simple format, client-side generation is instant. No server needed.
- **PDF**: Requires layout engine. jsPDF is lightweight (vs Puppeteer which needs Chrome binary). Edge Function can generate PDF from data query results.
- **Excel**: exceljs provides rich Excel features (formulas, styling). Edge Function can query database and generate .xlsx file.
- **Async Generation**: Large reports (1 year of data for 100 communities) run asynchronously. Generate signed URL for download.

**Alternatives Considered**:
- **Puppeteer/Playwright**: Full Chrome browser for PDF rendering. Overkill and slow (5-10s generation time). Large memory footprint incompatible with Edge Functions.
- **pdfmake**: Declarative PDF but larger bundle size and limited layout control vs jsPDF.
- **PDF libraries (pdfkit, pdf-lib)**: More complex APIs. jsPDF has React-like approach.

**Implementation Guidance**:

```typescript
// supabase/functions/generate-platform-report/index.ts
import { jsPDF } from 'https://esm.sh/jspdf@2.5.1'

serve(async (req) => {
  const { report_type, date_range, format } = await req.json()

  // Query analytics data
  const { data: communities } = await supabase
    .from('communities')
    .select('*')
    .gte('created_at', date_range.from)
    .lte('created_at', date_range.to)

  if (format === 'pdf') {
    const doc = new jsPDF()

    // Header
    doc.setFontSize(20)
    doc.text('Platform Analytics Report', 20, 20)
    doc.setFontSize(12)
    doc.text(`${date_range.from} - ${date_range.to}`, 20, 30)

    // Summary stats
    doc.text(`Total Communities: ${communities.length}`, 20, 50)
    doc.text(`Active: ${communities.filter(c => c.status === 'active').length}`, 20, 60)
    doc.text(`Suspended: ${communities.filter(c => c.status === 'suspended').length}`, 20, 70)

    // Table of communities
    let y = 90
    communities.forEach((community) => {
      doc.text(`${community.name} - ${community.status}`, 20, y)
      y += 10
    })

    // Save to storage
    const pdfBuffer = doc.output('arraybuffer')
    const fileName = `report-${Date.now()}.pdf`

    await supabase.storage
      .from('reports')
      .upload(fileName, pdfBuffer, { contentType: 'application/pdf' })

    const { data: { publicUrl } } = supabase.storage
      .from('reports')
      .getPublicUrl(fileName)

    return new Response(JSON.stringify({ download_url: publicUrl }))
  }

  // CSV format (simple)
  if (format === 'csv') {
    const csv = communities.map(c =>
      `${c.name},${c.status},${c.created_at}`
    ).join('\n')
    return new Response(csv, { headers: { 'Content-Type': 'text/csv' } })
  }
})
```

**Report Types**:
1. Platform Summary: Community counts, status distribution, growth trends
2. Community Details: List of all communities with key metrics
3. Admin Activity: Audit log of superadmin actions
4. Subscription Status: Billing and renewal tracking

**References**:
- [jsPDF Documentation](https://github.com/parallax/jsPDF)
- [exceljs Documentation](https://github.com/exceljs/exceljs)

---

## 6. Form Validation: React Hook Form + Zod

**Decision**: Use React Hook Form for form state + Zod for schema validation

**Rationale**:
- **Type Safety**: Zod schemas auto-generate TypeScript types. Single source of truth for validation logic.
- **Performance**: React Hook Form minimizes re-renders with uncontrolled inputs and optimized validation.
- **DX**: Clean API with `useForm` hook. Automatic error handling and field registration.
- **Async Validation**: Built-in support for async validation (email uniqueness check).
- **Reusable**: Zod schemas used in both frontend and Edge Functions for consistent validation.

**Alternatives Considered**:
- **Formik**: More popular but heavier bundle size. Less TypeScript-friendly than Zod integration.
- **Manual validation**: Error-prone and requires custom error state management. No type safety.
- **Yup**: Older validation library. Zod has better TypeScript support and is more modern.

**Implementation Guidance**:

```typescript
// lib/validations/community.ts
import { z } from 'zod'

export const communitySchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  location: z.string().min(1, 'Location is required'),
  contact_email: z.string().email('Invalid email address'),
  contact_phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number'),
  subscription_plan_id: z.string().uuid('Invalid plan ID'),
  timezone: z.string().min(1, 'Timezone is required'),
  currency: z.enum(['USD', 'PHP', 'EUR', 'GBP']),
  language: z.enum(['en', 'es', 'fr']),
  logo: z.instanceof(File)
    .refine((file) => file.size <= 2 * 1024 * 1024, 'Logo must be under 2MB')
    .refine(
      (file) => ['image/png', 'image/jpeg', 'image/svg+xml'].includes(file.type),
      'Logo must be PNG, JPG, or SVG'
    )
    .optional()
})

export type CommunityFormData = z.infer<typeof communitySchema>
```

```typescript
// components/forms/CommunityForm.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

export function CommunityForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<CommunityFormData>({
    resolver: zodResolver(communitySchema)
  })

  const onSubmit = async (data: CommunityFormData) => {
    // Upload logo if present
    let logo_url = null
    if (data.logo) {
      const { data: upload } = await supabase.storage
        .from('logos')
        .upload(`${crypto.randomUUID()}.${data.logo.name.split('.').pop()}`, data.logo)
      logo_url = upload?.path
    }

    // Create community
    await supabase.from('communities').insert({
      ...data,
      logo_url,
      regional_settings: {
        timezone: data.timezone,
        currency: data.currency,
        language: data.language
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name')} />
      {errors.name && <span className="error">{errors.name.message}</span>}

      <input {...register('contact_email')} />
      {errors.contact_email && <span className="error">{errors.contact_email.message}</span>}

      {/* ... other fields ... */}

      <button type="submit">Create Community</button>
    </form>
  )
}
```

**Async Email Uniqueness Validation**:
```typescript
const emailSchema = z.string().email().refine(async (email) => {
  const { data } = await supabase
    .from('admin_users')
    .select('id')
    .eq('email', email)
    .single()

  return !data // Return true if email is unique
}, {
  message: 'Email already exists'
})
```

**Reuse in Edge Functions**:
```typescript
// supabase/functions/create-community/index.ts
import { communitySchema } from '../../../apps/platform-dashboard/src/lib/validations/community.ts'

serve(async (req) => {
  const body = await req.json()

  // Validate with same schema
  const result = communitySchema.safeParse(body)
  if (!result.success) {
    return new Response(JSON.stringify({ errors: result.error.issues }), { status: 400 })
  }

  // Proceed with validated data
  const validData = result.data
  // ...
})
```

**References**:
- [React Hook Form Documentation](https://react-hook-form.com/)
- [Zod Documentation](https://zod.dev/)
- [React Hook Form + Zod Integration](https://react-hook-form.com/get-started#SchemaValidation)

---

## Summary of Technology Stack

| Category | Technology | Rationale |
|----------|-----------|-----------|
| State Management | Zustand | Minimal boilerplate, excellent TypeScript support, works with TanStack Query |
| Maps | Mapbox GL JS | Free tier sufficient, custom styling, WebGL performance |
| CSV Import | Edge Function (Deno) | Server-side validation, progress streaming, security |
| Concurrent Edits | Optimistic Locking (`updated_at`) | Simple, UX-friendly, constitution compliant |
| Reports | jsPDF (PDF), exceljs (Excel) | Lightweight, async generation, rich formatting |
| Form Validation | React Hook Form + Zod | Type-safe, performant, reusable schemas |

## Implementation Priority

1. **Phase 0 (Week 1)**: Setup Zustand, React Hook Form, Zod validation patterns
2. **Phase 1 (Week 2)**: Mapbox integration for gates
3. **Phase 2 (Week 3)**: CSV import Edge Function with progress
4. **Phase 3 (Week 4)**: Optimistic locking for concurrent edits
5. **Phase 4 (Week 5)**: Report generation Edge Functions

## Open Questions Resolved

- ✅ State management choice: Zustand selected
- ✅ Map provider: Mapbox selected
- ✅ CSV processing: Edge Function with SSE progress
- ✅ Concurrent edit strategy: Optimistic locking with `updated_at`
- ✅ Report formats: PDF (jsPDF), Excel (exceljs), CSV (client-side)
- ✅ Form validation: React Hook Form + Zod

**Next Phase**: Proceed to Phase 1 (Design & Contracts) to generate `data-model.md`, `contracts/`, and `quickstart.md`
