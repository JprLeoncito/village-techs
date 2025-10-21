# Technology Research & Decisions

**Feature**: HOA Administration Platform (002)
**Date**: 2025-10-09
**Purpose**: Resolve NEEDS CLARIFICATION items from Technical Context

---

## Research Task 1: PDF Generation Approach

### Decision: **jsPDF (Client-Side) for Receipts, Edge Function for Complex Reports**

### Context
The Admin Dashboard needs to generate two types of PDFs:
1. **Fee Receipts**: Simple, single-page documents with payment details (SC-003: <30 seconds)
2. **Analytics Reports**: Multi-page documents with charts and tables (performance goal: <10 seconds)

### Alternatives Considered

#### Option A: jsPDF (Client-Side)
**Pros**:
- Lightweight (65KB minified)
- Fast generation for simple documents (<500ms)
- No server load
- Works offline
- Easy integration with React components
- Compatible with existing charting libraries (Chart.js, Recharts)

**Cons**:
- Limited HTML/CSS rendering (manual layout required)
- Chart rendering requires manual canvas conversion
- Complex multi-page reports require more code
- Large datasets may block UI thread

#### Option B: Puppeteer (Edge Function - Server-Side)
**Pros**:
- Full HTML/CSS rendering
- Easy chart generation from existing components
- Handles complex layouts automatically
- Scalable for large reports

**Cons**:
- Heavy resource usage (150-300MB RAM per instance)
- Slower cold starts (2-5 seconds)
- Requires headless Chrome in Edge Function
- Limited by 10-second Edge Function timeout
- Increased infrastructure costs

#### Option C: pdfmake (Client-Side Alternative)
**Pros**:
- Declarative document definition
- Better layout control than jsPDF
- Supports tables, lists, headers/footers

**Cons**:
- Larger bundle size (120KB)
- Steeper learning curve
- Still requires manual chart conversion

### Rationale for Hybrid Approach

**For Fee Receipts** → **jsPDF**:
- Simple layout (header, payment details table, footer)
- Performance requirement: <30 seconds (easily achievable with <500ms generation)
- Frequent operation (multiple payments per day)
- Client-side generation reduces server load

**For Analytics Reports** → **Edge Function with react-pdf or PDF-lib**:
- Complex layouts with charts and multi-page tables
- Less frequent operation (weekly/monthly reports)
- Edge Function can pre-render charts server-side
- Can use Server-Side Events (SSE) for progress tracking on large reports
- Alternative: Generate HTML → convert to PDF using pdf-lib with HTML parsing

### Implementation Guidance

**Fee Receipt with jsPDF**:

```typescript
import jsPDF from 'jspdf'
import 'jspdf-autotable'

interface ReceiptData {
  receiptNumber: string
  household: { name: string; address: string }
  fees: Array<{ type: string; amount: number; dueDate: string }>
  payment: { amount: number; date: string; method: string }
  admin: { name: string }
}

export function generateFeeReceipt(data: ReceiptData): Blob {
  const doc = new jsPDF()

  // Header
  doc.setFontSize(20)
  doc.text('Village Tech HOA', 105, 20, { align: 'center' })
  doc.setFontSize(16)
  doc.text('Payment Receipt', 105, 30, { align: 'center' })

  // Receipt details
  doc.setFontSize(10)
  doc.text(`Receipt #: ${data.receiptNumber}`, 20, 45)
  doc.text(`Date: ${data.payment.date}`, 20, 52)
  doc.text(`Household: ${data.household.name}`, 20, 59)
  doc.text(`Address: ${data.household.address}`, 20, 66)

  // Fee table
  const tableData = data.fees.map(fee => [
    fee.type,
    fee.dueDate,
    `$${fee.amount.toFixed(2)}`
  ])

  ;(doc as any).autoTable({
    startY: 75,
    head: [['Fee Type', 'Due Date', 'Amount']],
    body: tableData,
    foot: [['Total Paid', '', `$${data.payment.amount.toFixed(2)}`]],
    theme: 'grid'
  })

  // Payment details
  const finalY = (doc as any).lastAutoTable.finalY + 10
  doc.text(`Payment Method: ${data.payment.method}`, 20, finalY)
  doc.text(`Processed by: ${data.admin.name}`, 20, finalY + 7)

  // Footer
  doc.setFontSize(8)
  doc.text('Thank you for your payment!', 105, 280, { align: 'center' })

  return doc.output('blob')
}

// Usage in React component
const handleGenerateReceipt = async () => {
  const blob = generateFeeReceipt(receiptData)
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')

  // Optionally upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('documents')
    .upload(`${tenantId}/receipts/receipt-${receiptNumber}.pdf`, blob)
}
```

**Analytics Report with Edge Function**:

```typescript
// Edge Function: supabase/functions/generate-report/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument, rgb } from 'https://esm.sh/pdf-lib@1.17.1'

serve(async (req) => {
  const { tenantId, reportType, dateRange } = await req.json()

  // Fetch data from database
  const supabase = createClient(...)
  const { data: households } = await supabase
    .from('households')
    .select('*')
    .eq('tenant_id', tenantId)

  // Generate PDF
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([600, 800])

  page.drawText('Household Occupancy Report', {
    x: 50,
    y: 750,
    size: 20,
    color: rgb(0, 0, 0),
  })

  // Add charts (converted from canvas or SVG)
  // Add tables with data

  const pdfBytes = await pdfDoc.save()

  // Upload to storage
  const fileName = `report-${reportType}-${Date.now()}.pdf`
  await supabase.storage
    .from('documents')
    .upload(`${tenantId}/reports/${fileName}`, pdfBytes)

  return new Response(JSON.stringify({
    success: true,
    fileUrl: `.../${fileName}`
  }))
})
```

### Performance Metrics
- jsPDF receipt generation: ~200-500ms (target: <30s ✅)
- Edge Function report: ~3-8 seconds (target: <10s ✅)

---

## Research Task 2: CSV Export Strategy

### Decision: **Client-Side CSV for Small Datasets (<1000 rows), Edge Function Streaming for Large Datasets (>1000 rows)**

### Context
Admins need to export data to CSV for:
- Household lists (up to 500 households)
- Sticker records (up to 2000 stickers per community)
- Fee history (up to 10,000 records per year)
- Gate entry logs (potentially >10,000 records)

Performance constraint: Must handle up to 10,000 records without timeout.

### Alternatives Considered

#### Option A: Client-Side CSV Generation
**Pros**:
- Simple implementation using papaparse or manual string building
- No server load
- Instant download
- Works offline

**Cons**:
- Large datasets (>10k rows) may freeze browser
- Memory consumption for large datasets
- Limited by browser memory (~2GB)

#### Option B: Edge Function with Full Response
**Pros**:
- Offloads processing from client
- Can query database directly without loading into memory
- Consistent performance regardless of client device

**Cons**:
- 10-second Edge Function timeout may be exceeded for very large datasets
- Network transfer time adds latency
- Requires server resources

#### Option C: Edge Function with Streaming (Server-Sent Events)
**Pros**:
- No timeout limitation (stream chunks as they're generated)
- Low memory footprint (stream directly from database)
- Progress tracking for user feedback
- Handles unlimited dataset size

**Cons**:
- More complex implementation
- Requires streaming-compatible client code

### Rationale for Hybrid Approach

**For Small Datasets (<1000 rows)** → **Client-Side with papaparse**:
- Most queries will be <1000 rows (households, stickers, permits)
- Instant download with no server load
- Simple implementation

**For Large Datasets (>1000 rows)** → **Edge Function with Streaming**:
- Fee history and gate logs can exceed 10k rows
- Streaming prevents timeout issues
- Progress UI provides better UX

### Implementation Guidance

**Client-Side CSV (Small Datasets)**:

```typescript
import Papa from 'papaparse'

export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; label: string }[]
) {
  // Filter and map columns if specified
  const csvData = columns
    ? data.map(row =>
        columns.reduce((acc, col) => ({
          ...acc,
          [col.label]: row[col.key]
        }), {})
      )
    : data

  const csv = Papa.unparse(csvData)

  // Trigger download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

// Usage
const households = await supabase
  .from('households')
  .select('unit_number, status, move_in_date, household_head_name')
  .eq('tenant_id', tenantId)

exportToCSV(households.data, 'households.csv', [
  { key: 'unit_number', label: 'Unit Number' },
  { key: 'status', label: 'Status' },
  { key: 'move_in_date', label: 'Move-In Date' },
  { key: 'household_head_name', label: 'Household Head' }
])
```

**Edge Function CSV Streaming (Large Datasets)**:

```typescript
// Edge Function: supabase/functions/export-csv/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { tenantId, table, dateRange } = await req.json()

  const supabase = createClient(...)

  // Stream response
  const stream = new ReadableStream({
    async start(controller) {
      // Send CSV header
      controller.enqueue('timestamp,gate,entry_type,vehicle\n')

      // Fetch in batches and stream
      let offset = 0
      const batchSize = 1000

      while (true) {
        const { data, error } = await supabase
          .from('gate_entries')
          .select('timestamp, gate_name, entry_type, vehicle_plate')
          .eq('tenant_id', tenantId)
          .gte('timestamp', dateRange.start)
          .lte('timestamp', dateRange.end)
          .range(offset, offset + batchSize - 1)

        if (error || !data || data.length === 0) break

        // Convert rows to CSV
        const csvRows = data.map(row =>
          `${row.timestamp},${row.gate_name},${row.entry_type},${row.vehicle_plate}`
        ).join('\n') + '\n'

        controller.enqueue(csvRows)

        if (data.length < batchSize) break
        offset += batchSize
      }

      controller.close()
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="gate_entries.csv"'
    }
  })
})
```

**Client-Side Streaming Consumer**:

```typescript
async function downloadLargeCSV(table: string, dateRange: { start: string; end: string }) {
  const response = await fetch('/functions/v1/export-csv', {
    method: 'POST',
    body: JSON.stringify({ tenantId, table, dateRange }),
    headers: { 'Authorization': `Bearer ${token}` }
  })

  const reader = response.body?.getReader()
  const chunks: Uint8Array[] = []

  while (true) {
    const { done, value } = await reader!.read()
    if (done) break
    chunks.push(value)
  }

  // Combine chunks and trigger download
  const blob = new Blob(chunks, { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${table}_export.csv`
  link.click()
}
```

### Performance Metrics
- Client-side CSV (500 rows): ~50-100ms
- Client-side CSV (1000 rows): ~150-300ms
- Streaming CSV (10,000 rows): ~5-8 seconds (no timeout issues)

---

## Research Task 3: Admin Role Permissions

### Decision: **admin_head Has Full Access, admin_officer Has Restricted Access to Critical Operations**

### Context
FR-068 requires distinguishing permission levels between `admin_head` and `admin_officer` roles. Both roles are HOA administrators but need different privilege levels for security and accountability.

### Permission Matrix

| Feature | admin_head | admin_officer | Rationale |
|---------|------------|---------------|-----------|
| **Household Management** | | | |
| View households | ✅ | ✅ | Both roles need visibility |
| Create household | ✅ | ✅ | Common onboarding task |
| Edit household | ✅ | ✅ | Common management task |
| Set move-out date | ✅ | ❌ | Critical status change, head only |
| Delete household | ✅ | ❌ | Destructive action |
| **Member Management** | | | |
| View members | ✅ | ✅ | Both roles need visibility |
| Add member | ✅ | ✅ | Common onboarding task |
| Edit member | ✅ | ✅ | Common management task |
| Upload photo | ✅ | ✅ | Routine task |
| Link to user account | ✅ | ❌ | Security-sensitive operation |
| Remove member | ✅ | ❌ | Requires head approval |
| **Sticker Management** | | | |
| View sticker requests | ✅ | ✅ | Both roles process requests |
| Approve sticker (single) | ✅ | ✅ | Common approval task |
| Bulk approve stickers | ✅ | ❌ | High-impact operation |
| Reject sticker | ✅ | ✅ | Common rejection task |
| Revoke active sticker | ✅ | ❌ | Critical security decision |
| Edit sticker expiry | ✅ | ❌ | Policy change |
| **Construction Permits** | | | |
| View permits | ✅ | ✅ | Both roles review permits |
| Review permit details | ✅ | ✅ | Both roles evaluate |
| Calculate road fees | ✅ | ❌ | Financial decision |
| Approve permit | ✅ | ❌ | Requires head authority |
| Reject permit | ✅ | ❌ | Requires head authority |
| Mark in_progress | ✅ | ✅ | Status tracking |
| Mark completed | ✅ | ❌ | Final approval |
| **Association Fees** | | | |
| View fees | ✅ | ✅ | Both roles track fees |
| Create fee records | ✅ | ❌ | Financial policy decision |
| Record payment | ✅ | ✅ | Common task |
| Generate receipt | ✅ | ✅ | Automatic after payment |
| Waive fee | ✅ | ❌ | Financial decision |
| Send reminders | ✅ | ✅ | Routine communication |
| **Announcements** | | | |
| View announcements | ✅ | ✅ | Both roles communicate |
| Create announcement | ✅ | ✅ | Both roles draft |
| Schedule publication | ✅ | ✅ | Both roles schedule |
| Publish immediately | ✅ | ❌ | Requires head approval for urgent |
| Edit published | ✅ | ❌ | Correction requires authority |
| Delete announcement | ✅ | ❌ | Destructive action |
| **Security Monitoring** | | | |
| View gate entries | ✅ | ✅ | Both roles monitor |
| View incident reports | ✅ | ✅ | Both roles review |
| View active officers | ✅ | ✅ | Both roles track |
| Export security logs | ✅ | ❌ | Sensitive data export |
| **Analytics & Reports** | | | |
| View dashboard | ✅ | ✅ | Both roles analyze |
| Generate CSV reports | ✅ | ❌ | Sensitive data export |
| Generate PDF reports | ✅ | ❌ | Sensitive data export |
| View occupancy stats | ✅ | ✅ | Operational metrics |
| View financial reports | ✅ | ❌ | Sensitive financial data |
| **System Administration** | | | |
| View audit logs | ✅ | ❌ | Accountability oversight |
| Manage admin users | ✅ | ❌ | User management |
| Configure community settings | ✅ | ❌ | Policy configuration |

### Implementation Guidance

**RLS Policy with Role Check**:

```sql
-- Example: Only admin_head can create fees
CREATE POLICY "admin_head_create_fees" ON association_fees
FOR INSERT
USING (
  (auth.jwt() ->> 'role') = 'admin_head'
  AND tenant_id::TEXT = (auth.jwt() ->> 'tenant_id')
);

-- Example: Both admin_head and admin_officer can view fees
CREATE POLICY "admin_view_fees" ON association_fees
FOR SELECT
USING (
  (auth.jwt() ->> 'role') IN ('admin_head', 'admin_officer', 'superadmin')
  AND (
    tenant_id::TEXT = (auth.jwt() ->> 'tenant_id')
    OR (auth.jwt() ->> 'role') = 'superadmin'
  )
);

-- Example: Both roles can record payments
CREATE POLICY "admin_record_payment" ON association_fees
FOR UPDATE
USING (
  (auth.jwt() ->> 'role') IN ('admin_head', 'admin_officer')
  AND tenant_id::TEXT = (auth.jwt() ->> 'tenant_id')
)
WITH CHECK (
  -- Prevent modifying fee amount, only allow payment fields
  OLD.amount = NEW.amount
  AND OLD.fee_type = NEW.fee_type
);
```

**Frontend Permission Check**:

```typescript
// lib/hooks/usePermissions.ts
import { useAuthStore } from '@/stores/authStore'

export function usePermissions() {
  const user = useAuthStore(state => state.user)
  const role = user?.user_metadata?.role

  return {
    canCreateFees: role === 'admin_head' || role === 'superadmin',
    canApprovePermits: role === 'admin_head' || role === 'superadmin',
    canBulkApproveStickers: role === 'admin_head' || role === 'superadmin',
    canRevokeStickers: role === 'admin_head' || role === 'superadmin',
    canWaiveFees: role === 'admin_head' || role === 'superadmin',
    canExportData: role === 'admin_head' || role === 'superadmin',
    canViewAuditLogs: role === 'admin_head' || role === 'superadmin',
    canRecordPayments: ['admin_head', 'admin_officer', 'superadmin'].includes(role),
    canViewDashboard: ['admin_head', 'admin_officer', 'superadmin'].includes(role),
  }
}

// Usage in component
function FeeManagementPage() {
  const { canCreateFees, canWaiveFees, canRecordPayments } = usePermissions()

  return (
    <div>
      {canCreateFees && (
        <Button onClick={openCreateFeeModal}>Create Fee</Button>
      )}
      {canRecordPayments && (
        <Button onClick={openPaymentModal}>Record Payment</Button>
      )}
      {canWaiveFees && (
        <Button onClick={handleWaiveFee}>Waive Fee</Button>
      )}
    </div>
  )
}
```

**Edge Function Permission Check**:

```typescript
// Reusable permission validator
function requirePermission(userRole: string, requiredRole: 'admin_head' | 'admin_officer') {
  const allowedRoles = requiredRole === 'admin_head'
    ? ['admin_head', 'superadmin']
    : ['admin_head', 'admin_officer', 'superadmin']

  if (!allowedRoles.includes(userRole)) {
    throw new Error('Insufficient permissions')
  }
}

// Example: Bulk approve stickers (admin_head only)
serve(async (req) => {
  const user = await supabase.auth.getUser(jwt)
  const role = user.data.user?.user_metadata?.role

  requirePermission(role, 'admin_head') // Throws if not admin_head or superadmin

  // Proceed with bulk approval
})
```

### Rationale

**admin_head** (Primary Administrator):
- Has full authority over financial decisions (fees, waivers, permit approvals)
- Can perform destructive operations (deletes, revocations)
- Has access to sensitive data exports and audit logs
- Typically 1-2 per community

**admin_officer** (Supporting Administrator):
- Handles routine operational tasks (payments, onboarding, sticker approvals)
- Cannot make policy or financial decisions
- Cannot export sensitive data or access audit logs
- Typically 2-5 per community

This separation ensures:
1. **Accountability**: Critical operations require head-level approval
2. **Security**: Sensitive data access is restricted
3. **Efficiency**: Officers handle day-to-day tasks without bottlenecks
4. **Audit Trail**: Clear distinction in audit logs between head and officer actions

---

## Summary

All `NEEDS CLARIFICATION` items resolved:

1. ✅ **PDF Generation**: Hybrid approach (jsPDF for receipts, Edge Function for reports)
2. ✅ **CSV Export**: Hybrid approach (client-side for <1000 rows, streaming for >1000 rows)
3. ✅ **Admin Permissions**: Defined permission matrix with admin_head having elevated privileges over admin_officer

**Next Step**: Proceed to Phase 1 (data-model.md, contracts/, quickstart.md).
