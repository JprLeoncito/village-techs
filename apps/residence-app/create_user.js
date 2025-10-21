// Create user jasper.leoncito@988labs.com with proper household metadata
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createUser() {
  try {
    console.log('Creating user jasper.leoncito@988labs.com...');

    // Create the user account with proper household metadata
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'jasper.leoncito@988labs.com',
      password: 'jasper31',
      email_confirm: true,
      user_metadata: {
        first_name: 'Jasper',
        last_name: 'Leoncito',
        household_id: '7014fb94-d9bf-494c-b4a4-2bf228b80f2b'
      },
      app_metadata: {
        household_id: '7014fb94-d9bf-494c-b4a4-2bf228b80f2b',
        tenant_id: 'b0edfe19-8dea-419a-8be1-7b78d80b378a',
        role: 'resident'
      }
    });

    if (error) {
      console.error('Error creating user:', error);
      return;
    }

    console.log('✅ User created successfully:', data.user?.id, data.user?.email);

    // Now create the household member record
    if (data.user?.id) {
      const { error: memberError } = await supabase
        .from('household_members')
        .insert({
          tenant_id: 'b0edfe19-8dea-419a-8be1-7b78d80b378a',
          household_id: '7014fb94-d9bf-494c-b4a4-2bf228b80f2b',
          user_id: data.user.id,
          first_name: 'Jasper',
          last_name: 'Leoncito',
          relationship_to_head: 'self',
          contact_email: 'jasper.leoncito@988labs.com',
          member_type: 'resident',
          status: 'active'
        });

      if (memberError) {
        console.error('Error creating household member:', memberError);
      } else {
        console.log('✅ Household member created successfully');
      }
    }

    console.log('🎉 User jasper.leoncito@988labs.com is now ready with household ID: 7014fb94-d9bf-494c-b4a4-2bf228b80f2b');

  } catch (error) {
    console.error('Error:', error);
  }
}

createUser();