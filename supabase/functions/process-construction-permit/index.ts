import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProcessPermitRequest {
  permit_id: string
  action: 'approve' | 'reject' | 'mark_paid' | 'mark_completed' | 'mark_in_progress'
  road_fee_amount?: number
  rejection_reason?: string
  payment_reference?: string
  payment_method?: string
  start_date?: string
  end_date?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify caller is admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing authorization header')

    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(jwt)

    if (authError || !user) throw new Error('Unauthorized')

    const role = user.app_metadata?.role
    const tenant_id = user.app_metadata?.tenant_id

    if (!['admin_head', 'admin_officer'].includes(role)) {
      throw new Error('Forbidden: Only admins can process permits')
    }

    if (!tenant_id) {
      throw new Error('Invalid user: Missing tenant_id')
    }

    // Parse request
    const body: ProcessPermitRequest = await req.json()
    const { permit_id, action, road_fee_amount, rejection_reason, payment_reference, payment_method, start_date, end_date } = body

    if (!permit_id || !action) {
      throw new Error('Missing required fields: permit_id, action')
    }

    // Get permit
    const { data: permit, error: fetchError } = await supabaseClient
      .from('construction_permits')
      .select('*')
      .eq('id', permit_id)
      .eq('tenant_id', tenant_id)
      .single()

    if (fetchError || !permit) {
      throw new Error('Permit not found')
    }

    // State machine validation and updates
    let updates: any = { updated_at: new Date().toISOString() }

    switch (action) {
      case 'approve':
        if (!['pending', 'submitted'].includes(permit.status)) {
          throw new Error(`Cannot approve permit with status: ${permit.status}`)
        }
        if (!road_fee_amount || road_fee_amount <= 0) {
          throw new Error('Road fee is required for approval')
        }
        updates.status = 'approved'
        updates.road_fee_amount = road_fee_amount
        updates.approved_by = user.id
        updates.approved_at = new Date().toISOString()
        if (start_date) {
          updates.project_start_date = start_date
        }
        break

      case 'reject':
        if (!['pending', 'submitted'].includes(permit.status)) {
          throw new Error(`Cannot reject permit with status: ${permit.status}`)
        }
        updates.status = 'rejected'
        updates.rejection_reason = rejection_reason || 'No reason provided'
        break

      case 'mark_in_progress':
        if (!['approved'].includes(permit.status)) {
          throw new Error(`Cannot mark as in progress. Permit must be approved first.`)
        }
        updates.status = 'in_progress'
        if (start_date) {
          updates.project_start_date = start_date
        }
        break

      case 'mark_paid':
        if (permit.status !== 'approved') {
          throw new Error(`Cannot mark as paid. Permit must be approved first.`)
        }
        updates.road_fee_paid = true
        updates.road_fee_paid_at = new Date().toISOString()
        if (payment_reference) {
          updates.payment_reference = payment_reference
        }
        if (payment_method) {
          updates.payment_method = payment_method
        }
        break

      case 'mark_completed':
        if (!['paid', 'in_progress'].includes(permit.status)) {
          throw new Error(`Cannot mark as completed. Permit must be paid or in progress.`)
        }
        updates.status = 'completed'
        if (end_date) {
          updates.project_end_date = end_date
        }
        break

      default:
        throw new Error(`Invalid action: ${action}`)
    }

    // Update permit
    const { error: updateError } = await supabaseClient
      .from('construction_permits')
      .update(updates)
      .eq('id', permit_id)
      .eq('tenant_id', tenant_id)

    if (updateError) {
      throw new Error(`Failed to update permit: ${updateError.message}`)
    }

    // Log audit
    await supabaseClient.rpc('log_audit', {
      p_action: `permit_${action}`,
      p_resource_type: 'construction_permit',
      p_resource_id: permit_id,
      p_changes: {
        old_status: permit.status,
        new_status: updates.status,
        action,
        performed_by: user.id
      }
    })

    // TODO: Notifications
    // if (action === 'approve') notify household with payment details
    // if (action === 'reject') notify household with reason
    // if (action === 'mark_paid') notify guard house to allow workers

    return new Response(
      JSON.stringify({
        success: true,
        message: `Permit ${action} processed successfully`,
        data: {
          permit_id,
          new_status: updates.status,
          ...updates
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in process-construction-permit:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: error.message.includes('Unauthorized') ? 401 :
                error.message.includes('Forbidden') ? 403 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start`
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/process-construction-permit' \
    --header 'Authorization: Bearer YOUR_JWT_TOKEN' \
    --header 'Content-Type: application/json' \
    --data '{
      "permit_id": "uuid-here",
      "action": "approve",
      "road_fee": 5000.00
    }'

*/
