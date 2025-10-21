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

    // Verify caller is superadmin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const jwt = authHeader.replace('Bearer ', '')
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(jwt)

    if (authError || !user) {
      throw new Error('Unauthorized: Invalid token')
    }

    // Check role from app_metadata (secure, not user-editable)
    const role = user.app_metadata?.role
    const userTenantId = user.app_metadata?.tenant_id

    // Allow both superadmin and admin_head to create admin users
    if (role !== 'superadmin' && role !== 'admin_head') {
      throw new Error('Forbidden: Only superadmins and admin heads can create community admins')
    }

    // Parse request
    const body: CreateAdminRequest = await req.json()
    const { tenant_id, community_id, email, first_name, last_name, role: adminRole, phone } = body

    // Support both parameter names for backwards compatibility
    const communityId = community_id || tenant_id

    // Validate required fields
    if (!communityId || !email || !adminRole || !first_name || !last_name) {
      throw new Error('Missing required fields')
    }

    // Validate role
    if (!['admin_head', 'admin_officer'].includes(adminRole)) {
      throw new Error('Invalid role. Must be admin_head or admin_officer')
    }

    // Additional validation for admin_head users
    if (role === 'admin_head') {
      // Admin heads can only create officers, not other admin heads
      if (adminRole === 'admin_head') {
        throw new Error('Admin heads can only create admin officers, not other admin heads')
      }

      // Admin heads can only create users for their own community
      if (userTenantId !== communityId) {
        throw new Error('Admin heads can only create users for their own community')
      }
    }

    // Verify community exists
    const { data: community, error: communityError } = await supabaseClient
      .from('communities')
      .select('id, name')
      .eq('id', communityId)
      .single()

    if (communityError || !community) {
      throw new Error(`Community not found: ${communityId}`)
    }

    // Check for duplicate email across all admin users
    // Note: Supabase Auth will also reject duplicate emails, but this provides a clearer message
    const { data: existingUser } = await supabaseClient.auth.admin.listUsers()

    if (existingUser?.users?.some(u => u.email?.toLowerCase() === email.toLowerCase())) {
      throw new Error(`Email address ${email} is already in use. Please use a different email.`)
    }

    // Use default password for testing (in production, generate random password)
    const tempPassword = 'password123' // TODO: In production, use: crypto.randomUUID().substring(0, 12) + 'Aa1!'

    // Create Supabase Auth user
    const { data: authData, error: createError } = await supabaseClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      app_metadata: {
        tenant_id: communityId,
        role: adminRole
      },
      user_metadata: {
        first_name,
        last_name,
        phone: phone || null,
      },
    })

    if (createError) {
      // Handle specific duplicate email error
      if (createError.message?.includes('duplicate') ||
          createError.message?.includes('already exists') ||
          createError.message?.includes('unique constraint') ||
          createError.message?.includes('user_already_exists')) {
        throw new Error('A user with this email address already exists')
      }
      throw new Error(`Failed to create user: ${createError.message}`)
    }

    // Create admin_users record
    const { data: adminUserData, error: adminError } = await supabaseClient
      .from('admin_users')
      .insert({
        id: authData.user!.id,
        tenant_id: communityId,
        role: adminRole,
        status: 'active',
        first_name,
        last_name,
        phone: phone || null,
      })
      .select()
      .single()

    if (adminError) {
      // Rollback: delete auth user
      await supabaseClient.auth.admin.deleteUser(authData.user!.id)
      throw new Error(`Failed to create admin record: ${adminError.message}`)
    }

    // Log the action in audit_logs
    await supabaseClient.from('audit_logs').insert({
      superadmin_id: user.id,
      action_type: 'create_admin',
      entity_type: 'admin_user',
      entity_id: authData.user!.id,
      changes: {
        tenant_id: communityId,
        email,
        role: adminRole,
      },
    })

    // TODO: Send welcome email via Resend/SendGrid
    // await sendWelcomeEmail(email, first_name, tempPassword, community.name)

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          email: email,
          id: adminUserData.id,
          first_name: adminUserData.first_name,
          last_name: adminUserData.last_name,
          role: adminUserData.role,
          temporary_password: tempPassword, // In production, only send via email
        },
        message: `Admin user created successfully for ${community.name}. Welcome email will be sent.`,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 201,
      }
    )
  } catch (error) {
    console.error('Error in create-community-admin:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
      }),
      {
        status: error.message.includes('Unauthorized')
          ? 401
          : error.message.includes('Forbidden')
          ? 403
          : 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  }
})
