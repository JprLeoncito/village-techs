const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkUserMetadata() {
  try {
    console.log('Checking user metadata for jasper.leoncito@988labs.com...');

    // Get user by email
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error('Error listing users:', error);
      return;
    }

    const targetUser = users.find(user => user.email === 'jasper.leoncito@988labs.com');

    if (!targetUser) {
      console.error('User not found');
      return;
    }

    console.log('=== USER METADATA DEBUG ===');
    console.log('User ID:', targetUser.id);
    console.log('Email:', targetUser.email);
    console.log('User Metadata:', targetUser.user_metadata);
    console.log('App Metadata:', targetUser.app_metadata);
    console.log('============================');

    // Also check household_members table
    const { data: memberData, error: memberError } = await supabase
      .from('household_members')
      .select('*')
      .eq('user_id', targetUser.id);

    if (memberError) {
      console.error('Error fetching household member:', memberError);
    } else {
      console.log('=== HOUSEHOLD MEMBER DATA ===');
      console.log('Member records:', memberData);
      console.log('==============================');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkUserMetadata();