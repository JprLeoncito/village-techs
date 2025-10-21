// This script will create the missing household member record and update user metadata
const { createClient } = require('@supabase/supabase-js');

// Use the service key for admin operations
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createHouseholdMember() {
  try {
    console.log('Creating household member record for jasper.leoncito@988labs.com...');

    // First, get the user ID from auth.users
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();

    if (userError) {
      console.error('Error listing users:', userError);
      return;
    }

    const targetUser = users.find(user => user.email === 'jasper.leoncito@988labs.com');

    if (!targetUser) {
      console.error('User not found in auth system');
      return;
    }

    console.log('Found user:', targetUser.id, targetUser.email);

    // Check if household member already exists
    const { data: existingMember } = await supabase
      .from('household_members')
      .select('*')
      .eq('user_id', targetUser.id)
      .maybeSingle();

    if (existingMember) {
      console.log('Household member already exists:', existingMember);
      return;
    }

    // Create household member record
    const householdId = '93c3b576-16de-4188-9e11-d980369bccd3'; // Existing household
    const tenantId = '821b03eb-3b83-4361-907f-63ddd87c3865';

    const { data: newMember, error: memberError } = await supabase
      .from('household_members')
      .insert({
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        household_id: householdId,
        user_id: targetUser.id,
        first_name: 'Jasper',
        last_name: 'Leoncito',
        relationship_to_head: 'self',
        contact_email: 'jasper.leoncito@988labs.com',
        member_type: 'resident',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (memberError) {
      console.error('Error creating household member:', memberError);
      return;
    }

    console.log('Created household member:', newMember);

    // Now update the user's metadata with household_id
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      targetUser.id,
      {
        user_metadata: {
          ...targetUser.user_metadata,
          household_id: householdId,
          first_name: 'Jasper',
          last_name: 'Leoncito'
        },
        app_metadata: {
          ...targetUser.app_metadata,
          household_id: householdId,
          tenant_id: tenantId,
          role: 'resident'
        }
      }
    );

    if (updateError) {
      console.error('Error updating user metadata:', updateError);
      return;
    }

    console.log('Successfully updated user metadata with household_id');
    console.log('✅ Household identification fixed!');

  } catch (error) {
    console.error('Error:', error);
  }
}

createHouseholdMember();