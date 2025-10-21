import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ApproveStickerRequest {
  sticker_id: string
  action: 'approve' | 'reject'
  expiry_date?: string
  rejection_reason?: string
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
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(jwt)

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const role = user.app_metadata?.role
    const tenant_id = user.app_metadata?.tenant_id

    if (!['admin_head', 'admin_officer'].includes(role)) {
      throw new Error('Forbidden: Only admins can approve stickers')
    }

    if (!tenant_id) {
      throw new Error('Invalid user: Missing tenant_id')
    }

    // Parse request
    const body: ApproveStickerRequest = await req.json()
    const { sticker_id, action, expiry_date, rejection_reason } = body

    if (!sticker_id || !action) {
      throw new Error('Missing required fields: sticker_id, action')
    }

    if (!['approve', 'reject'].includes(action)) {
      throw new Error('Invalid action. Must be approve or reject')
    }

    // Get sticker
    const { data: sticker, error: fetchError } = await supabaseClient
      .from('vehicle_stickers')
      .select('*')
      .eq('id', sticker_id)
      .eq('tenant_id', tenant_id)
      .single()

    if (fetchError || !sticker) {
      throw new Error('Sticker not found or access denied')
    }

    // Validate state transition
    if (sticker.status !== 'requested' && sticker.status !== 'pending') {
      throw new Error(`Cannot ${action} sticker with status: ${sticker.status}. Only requested or pending stickers can be approved/rejected.`)
    }

    // Prepare updates
    const newStatus = action === 'approve' ? 'active' : 'rejected'
    const updates: any = {
      status: newStatus,
      updated_at: new Date().toISOString()
    }

    if (action === 'approve') {
      if (!expiry_date) {
        throw new Error('Expiry date is required for approval')
      }

      // Generate QR code data for the active sticker
      const qrCodeData = {
        id: sticker_id,
        plate: sticker.vehicle_plate,
        expiry: expiry_date,
        household: sticker.household_id,
        v: 1, // Version for future compatibility
      }

      updates.expiry_date = expiry_date
      updates.approved_by = user.id
      updates.approved_at = new Date().toISOString()
      updates.rfid_code = JSON.stringify(qrCodeData)
    } else if (action === 'reject' && rejection_reason) {
      updates.rejection_reason = rejection_reason
    }

    // Update sticker
    const { error: updateError } = await supabaseClient
      .from('vehicle_stickers')
      .update(updates)
      .eq('id', sticker_id)
      .eq('tenant_id', tenant_id)

    if (updateError) {
      throw new Error(`Failed to update sticker: ${updateError.message}`)
    }

    // Log audit
    await supabaseClient.rpc('log_audit', {
      p_action: `sticker_${action}`,
      p_resource_type: 'sticker',
      p_resource_id: sticker_id,
      p_changes: {
        old_status: sticker.status,
        new_status: newStatus,
        approved_by: user.id
      }
    })

    // TODO: Send notification to household
    // await notifyHousehold(sticker.household_id, action, sticker)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sticker ${action}d successfully`,
        data: {
          sticker_id,
          new_status: newStatus,
          expiry_date: updates.expiry_date,
          approved_by: updates.approved_by,
          approved_at: updates.approved_at,
          rfid_code: updates.rfid_code
        }
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )

  } catch (error) {
    console.error('Error in approve-sticker:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: error.message.includes('Unauthorized') ? 401 :
                error.message.includes('Forbidden') ? 403 : 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start`
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/approve-sticker' \
    --header 'Authorization: Bearer YOUR_JWT_TOKEN' \
    --header 'Content-Type: application/json' \
    --data '{
      "sticker_id": "uuid-here",
      "action": "approve"
    }'

*/
