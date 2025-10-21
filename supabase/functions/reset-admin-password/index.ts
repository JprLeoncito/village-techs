import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Verify the request is from an authenticated superadmin
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Check if user is superadmin
    const role = user.user_metadata?.role
    if (role !== 'superadmin') {
      throw new Error('Forbidden: Only superadmins can reset admin passwords')
    }

    // Parse request body
    const { user_id, email } = await req.json()

    if (!user_id || !email) {
      throw new Error('Missing required fields: user_id and email')
    }

    // Verify the user exists in admin_users table
    const { data: adminUser, error: adminUserError } = await supabaseClient
      .from('admin_users')
      .select('id, first_name, last_name, tenant_id')
      .eq('id', user_id)
      .single()

    if (adminUserError || !adminUser) {
      throw new Error('Admin user not found')
    }

    // Use default password for testing (in production, generate random password)
    const tempPassword = 'password123' // TODO: In production, use: crypto.randomUUID().substring(0, 12) + 'Aa1!'

    // Update the user's password in Supabase Auth
    const { error: updateError } = await supabaseClient.auth.admin.updateUserById(
      user_id,
      { password: tempPassword }
    )

    if (updateError) {
      throw new Error(`Failed to reset password: ${updateError.message}`)
    }

    // TODO: Send email with temporary password using Resend/SendGrid
    // For now, we'll return the password in the response
    // In production, this should ONLY be sent via email
    console.log(`Password reset for ${email}: ${tempPassword}`)

    return new Response(
      JSON.stringify({
        success: true,
        temporary_password: tempPassword,
        message: `Temporary password has been generated for ${email}. Please send it securely.`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
