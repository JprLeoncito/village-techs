// This script will fix the user metadata by adding the missing household_id
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

// Use the local Supabase URL since we're working with local instance
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseAnonKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixUserMetadata() {
  try {
    console.log('Attempting to fix user metadata...');

    // First, let's check the household_members table structure
    const { data: allMembers, error: allError } = await supabase
      .from('household_members')
      .select('*')
      .limit(10);

    if (allError) {
      console.error('Error fetching household members:', allError);
      return;
    }

    console.log('Found household members:', allMembers.length);
    if (allMembers.length > 0) {
      console.log('Sample household member structure:', Object.keys(allMembers[0]));
      console.log('Sample household member:', allMembers[0]);
    }

    // Let's also check users table structure
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'jasper.leoncito@988labs.com')
      .limit(1);

    if (userError) {
      console.error('Error fetching users:', userError);
    } else {
      console.log('Found users:', userData.length);
      if (userData.length > 0) {
        console.log('Sample user:', userData[0]);
      }
    }

    // Let's try to find a household member with contact_email field
    const { data: memberData, error: memberError } = await supabase
      .from('household_members')
      .select('*')
      .eq('contact_email', 'jasper.leoncito@988labs.com')
      .limit(1);

    if (memberError) {
      console.error('Error finding household member:', memberError);
      return;
    }

    if (!memberData || memberData.length === 0) {
      console.log('No household member found for email jasper.leoncito@988labs.com');

      // Let's check if there are any household members at all
      const { data: allMembers, error: allError } = await supabase
        .from('household_members')
        .select('*')
        .limit(5);

      if (allError) {
        console.error('Error fetching all household members:', allError);
      } else {
        console.log('Found household members:', allMembers.length);
        if (allMembers.length > 0) {
          console.log('Sample household member:', allMembers[0]);
        }
      }
      return;
    }

    if (!memberData || memberData.length === 0) {
      console.log('No household member found for email jasper.leoncito@988labs.com');

      // Let's use an existing household for testing
      const existingHouseholdId = '93c3b576-16de-4188-9e11-d980369bccd3'; // From the sample household member
      const tenantId = '821b03eb-3b83-4361-907f-63ddd87c3865';

      console.log(`\n=== CREATING HOUSEHOLD MEMBER RECORD ===`);
      console.log(`Creating household member record for jasper.leoncito@988labs.com`);
      console.log(`Using existing household_id: ${existingHouseholdId}`);

      // For now, we'll provide a manual solution since we don't have admin access
      console.log('\n=== MANUAL FIX REQUIRED ===');
      console.log('The user account needs to be updated manually. Here are the steps:');
      console.log('1. Create a household member record:');
      console.log(`   INSERT INTO household_members (id, tenant_id, household_id, user_id, first_name, last_name, relationship_to_head, member_type, status, contact_email, created_at, updated_at)`);
      console.log(`   VALUES (uuid(), '${tenantId}', '${existingHouseholdId}', '[USER_ID]', 'Jasper', 'Leoncito', 'self', 'resident', 'active', 'jasper.leoncito@988labs.com', NOW(), NOW());`);
      console.log('\n2. Update the user metadata in auth.users:');
      console.log(`   UPDATE auth.users SET user_metadata = jsonb_set(user_metadata, '{household_id}', '"${existingHouseholdId}"'), app_metadata = jsonb_set(app_metadata, '{household_id}', '"${existingHouseholdId}"') WHERE email = 'jasper.leoncito@988labs.com';`);

      console.log('\n=== SIMPLE SOLUTION FOR NOW ===');
      console.log('Easier approach: Go to the admin dashboard and:');
      console.log('1. Create a new household member for Jasper Leoncito');
      console.log('2. Link it to the existing household');
      console.log('3. Create a new user account with proper metadata');

      return;
    }

    console.log('Found household member data:', memberData[0]);
    const householdId = memberData[0].household_id;
    console.log('This user should have household_id:', householdId);

  } catch (error) {
    console.error('Error:', error);
  }
}

fixUserMetadata();