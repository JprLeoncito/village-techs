import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { HouseholdMember } from '../services/householdMemberService';

interface Residence {
  id: string;
  unit_number: string;
  type: string;
}

interface Household {
  id: string;
  name: string;
  address?: string;
  type: 'apartment' | 'house' | 'condo' | 'other';
  created_at: string;
  updated_at: string;
  residences?: Residence;
}

export const useHousehold = () => {
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHouseholdData();
  }, []);

  const loadHouseholdData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('Error getting user:', userError);
        setError('Failed to load user information');
        return;
      }

      console.log('=== Household Hook Debug ===');
      console.log('User email:', user.email);
      console.log('User metadata household_id:', user.user_metadata?.household_id);
      console.log('============================');

      let householdId: string | null = null;

      // PRIMARY METHOD: Find household member by email
      if (user.email) {
        console.log('Querying household_members for email:', user.email);
        const { data: memberData, error: memberError } = await supabase
          .from('household_members')
          .select('household_id, tenant_id, first_name, last_name')
          .eq('contact_email', user.email)
          .maybeSingle();

        if (memberError) {
          console.error('Error querying household_members:', memberError);
        } else if (memberData?.household_id) {
          householdId = memberData.household_id;
          console.log('✅ Found household member:');
          console.log('  Household ID:', householdId);
          console.log('  Member:', `${memberData.first_name} ${memberData.last_name}`);
        } else {
          console.log('No household member found for email:', user.email);
        }
      }

      // FALLBACK METHOD: Use user metadata
      if (!householdId) {
        console.log('Falling back to user metadata...');
        householdId = user.user_metadata?.household_id;
        console.log('Household ID from metadata:', householdId);
      }

      // TEMPORARY FALLBACK: For testing
      if (!householdId && user.email) {
        if (user.email === 'jasper.leoncito@988labs.com' || user.email === 'jasper.leoncito@98labs.com') {
          householdId = '2e344659-cecd-4705-996f-a31e2cd77a9c';  // Correct household ID from database
          console.log('Using temporary fallback household ID for jasper:', householdId);
        } else if (user.email === 'jasper.leoncito1@98labs.com') {
          householdId = 'e5a02540-45ea-4d30-9f0e-3be4eca12676';  // Alternative household ID
          console.log('Using temporary fallback household ID for jasper1:', householdId);
        } else if (user.email === 'resident@testcommunity.com') {
          householdId = 'fb65d0e0-52d2-46f1-945a-60e3572690b5';  // Correct household ID
          console.log('Using temporary fallback household ID for resident:', householdId);
        }
      }

      if (!householdId) {
        console.log('No household ID found - user not associated with household');
        setHousehold(null);
        setMembers([]);
        return;
      }

      // Load household data
      console.log('Loading household data for ID:', householdId);
      const { data: householdData, error: householdError } = await supabase
        .from('households')
        .select(`
          *,
          residences!inner(
            id,
            unit_number,
            type
          )
        `)
        .eq('id', householdId)
        .maybeSingle();

      if (householdError) {
        console.error('Error loading household:', householdError);
        setError('Failed to load household information');
        return;
      }

      console.log('Household data loaded:', householdData);

      // Load household members
      const { data: membersData, error: membersError } = await supabase
        .from('household_members')
        .select('*')
        .eq('household_id', householdId)
        .order('created_at', { ascending: true });

      if (membersError) {
        console.error('Error loading household members:', membersError);
        setError('Failed to load household members');
        return;
      }

      console.log('Household members loaded:', membersData?.length || 0);
      setHousehold(householdData);
      setMembers(membersData || []);
    } catch (err) {
      console.error('Unexpected error loading household data:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    loadHouseholdData();
  };

  const getPrimaryMember = (): HouseholdMember | null => {
    return members[0] || null;
  };

  const isMemberOfHousehold = (memberId: string): boolean => {
    return members.some(member => member.id === memberId);
  };

  const getMemberById = (memberId: string): HouseholdMember | null => {
    return members.find(member => member.id === memberId) || null;
  };

  return {
    household,
    members,
    loading,
    error,
    refresh,
    getPrimaryMember,
    isMemberOfHousehold,
    getMemberById,
  };
};