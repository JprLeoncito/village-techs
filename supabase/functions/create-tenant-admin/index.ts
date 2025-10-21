import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateAdminRequest {
  tenant_id: string
  email: string
  first_name: string
  last_name: string
  role: 'admin_head' | 'admin_officer'
  phone?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify caller is superadmin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(jwt)

    if (authError || !user) {
      throw new Error('Unauthorized: Invalid token')
    }

    const role = user.user_metadata?.role
    if (role !== 'superadmin') {
      throw new Error('Forbidden: Only superadmins can create tenant admins')
    }

    // Parse request body
    const body: CreateAdminRequest = await req.json()
    const { tenant_id, email, first_name, last_name, role: adminRole, phone } = body

    // Validate required fields
    if (!tenant_id || !email || !adminRole || !first_name || !last_name) {
      throw new Error('Missing required fields: tenant_id, email, first_name, last_name, role')
    }

    // Validate role
    if (!['admin_head', 'admin_officer'].includes(adminRole)) {
      throw new Error('Invalid role. Must be admin_head or admin_officer')
    }

    // Verify tenant exists
    const { data: tenant, error: tenantError } = await supabaseClient
      .from('tenants')
      .select('id, name')
      .eq('id', tenant_id)
      .single()

    if (tenantError || !tenant) {
      throw new Error(`Tenant not found: ${tenant_id}`)
    }

    // Use default password for testing (in production, generate random password)
    const tempPassword = 'password123' // TODO: In production, use: crypto.randomUUID().substring(0, 12) + 'Aa1!'

    // Create Supabase Auth user
    const { data: authData, error: createError } = await supabaseClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      app_metadata: {
        tenant_id,
        role: adminRole
      },
      user_metadata: {
        first_name,
        last_name,
        phone: phone || null
      }
    })

    if (createError) {
      throw new Error(`Failed to create user: ${createError.message}`)
    }

    // Log the action
    await supabaseClient.rpc('log_audit', {
      p_action: 'create_tenant_admin',
      p_resource_type: 'user',
      p_resource_id: authData.user?.id,
      p_changes: {
        tenant_id,
        email,
        role: adminRole
      }
    })

    // TODO: Send welcome email via SendGrid/Twilio
    // await sendWelcomeEmail(email, first_name, tempPassword, tenant.name)

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          user_id: authData.user?.id,
          email,
          temporary_password: tempPassword, // In production, only send via email
          tenant_name: tenant.name,
          message: 'Admin user created successfully. Welcome email will be sent.'
        }
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 201
      }
    )

  } catch (error) {
    console.error('Error in create-tenant-admin:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
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

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/create-tenant-admin' \
    --header 'Authorization: Bearer YOUR_JWT_TOKEN' \
    --header 'Content-Type: application/json' \
    --data '{
      "tenant_id": "11111111-1111-1111-1111-111111111111",
      "email": "admin@test.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "admin_head"
    }'

*/
