import { supabase, getUserHouseholdId } from '../lib/supabase';
import networkStatus from '../lib/networkStatus';

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id?: string;
  first_name: string;
  last_name: string;
  relationship_to_head: string;
  date_of_birth?: string;
  contact_email?: string;
  contact_phone?: string;
  photo_url?: string;
  member_type: 'resident' | 'beneficial_user';
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface CreateHouseholdMemberRequest {
  first_name: string;
  last_name: string;
  relationship_to_head: string;
  date_of_birth?: string;
  contact_email?: string;
  contact_phone?: string;
  photo_url?: string;
  member_type?: 'resident' | 'beneficial_user';
}

export interface UpdateHouseholdMemberRequest {
  first_name?: string;
  last_name?: string;
  relationship_to_head?: string;
  date_of_birth?: string;
  contact_email?: string;
  contact_phone?: string;
  photo_url?: string;
  member_type?: 'resident' | 'beneficial_user';
  status?: 'active' | 'inactive';
}

export interface HouseholdMemberFilter {
  member_type?: 'resident' | 'beneficial_user';
  status?: 'active' | 'inactive';
  relationship?: string;
}

class HouseholdMemberService {
  private offlineQueue: Array<{
    type: 'create' | 'update' | 'delete';
    data: any;
    timestamp: number;
  }> = [];

  async getHouseholdMembers(filter?: HouseholdMemberFilter): Promise<HouseholdMember[]> {
    try {
      const householdId = await getUserHouseholdId();
      if (!householdId) {
        throw new Error('No household ID found');
      }

      let query = supabase
        .from('household_members')
        .select('*')
        .eq('household_id', householdId)
        .order('created_at', { ascending: true });

      // Apply filters
      if (filter) {
        if (filter.member_type) {
          query = query.eq('member_type', filter.member_type);
        }
        if (filter.status) {
          query = query.eq('status', filter.status);
        }
        if (filter.relationship) {
          query = query.eq('relationship_to_head', filter.relationship);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching household members:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getHouseholdMembers:', error);
      throw error;
    }
  }

  async getHouseholdMember(memberId: string): Promise<HouseholdMember | null> {
    try {
      const { data, error } = await supabase
        .from('household_members')
        .select('*')
        .eq('id', memberId)
        .single();

      if (error) {
        console.error('Error fetching household member:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getHouseholdMember:', error);
      return null;
    }
  }

  async createHouseholdMember(memberData: CreateHouseholdMemberRequest): Promise<{ success: boolean; data?: HouseholdMember; error?: string }> {
    try {
      const householdId = await getUserHouseholdId();
      if (!householdId) {
        return { success: false, error: 'No household ID found' };
      }

      // Get current user to extract tenant information from metadata
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('Error getting user for tenant info:', userError);
        return { success: false, error: 'Failed to get user information for tenant' };
      }

      // Try to get tenant_id from user metadata first, then fall back to household_id
      let tenantId = user.user_metadata?.tenant_id;

      if (!tenantId) {
        // If no tenant_id in metadata, try to fetch from household (might not exist)
        const { data: householdData, error: householdError } = await supabase
          .from('households')
          .select('*')
          .eq('id', householdId)
          .maybeSingle();

        if (!householdError && householdData && householdData.tenant_id) {
          tenantId = householdData.tenant_id;
        }
      }

      if (!tenantId) {
        // As a last resort, use household_id (this might work if the database allows it)
        console.warn('No tenant_id found, using household_id as fallback');
        tenantId = householdId;
      }

      const memberToAdd = {
        ...memberData,
        household_id: householdId,
        member_type: memberData.member_type || 'resident',
        status: 'active' as const,
        tenant_id: tenantId,
      };

      // If offline, add to queue
      if (!networkStatus.isConnected()) {
        this.offlineQueue.push({
          type: 'create',
          data: memberToAdd,
          timestamp: Date.now(),
        });
        return { success: true, data: memberToAdd as HouseholdMember };
      }

      const { data, error } = await supabase
        .from('household_members')
        .insert(memberToAdd)
        .select()
        .single();

      if (error) {
        console.error('Error creating household member:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error in createHouseholdMember:', error);
      return { success: false, error: 'Failed to create household member' };
    }
  }

  async updateHouseholdMember(memberId: string, updateData: UpdateHouseholdMemberRequest): Promise<{ success: boolean; data?: HouseholdMember; error?: string }> {
    try {
      // If offline, add to queue
      if (!networkStatus.isConnected()) {
        this.offlineQueue.push({
          type: 'update',
          data: { id: memberId, ...updateData },
          timestamp: Date.now(),
        });
        return { success: true };
      }

      const updateDataToSend = { ...updateData };

      const { data, error } = await supabase
        .from('household_members')
        .update(updateDataToSend)
        .eq('id', memberId)
        .select()
        .single();

      if (error) {
        console.error('Error updating household member:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error in updateHouseholdMember:', error);
      return { success: false, error: 'Failed to update household member' };
    }
  }

  async deleteHouseholdMember(memberId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // If offline, add to queue
      if (!networkStatus.isConnected()) {
        this.offlineQueue.push({
          type: 'delete',
          data: { id: memberId },
          timestamp: Date.now(),
        });
        return { success: true };
      }

      const { error } = await supabase
        .from('household_members')
        .delete()
        .eq('id', memberId);

      if (error) {
        console.error('Error deleting household member:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in deleteHouseholdMember:', error);
      return { success: false, error: 'Failed to delete household member' };
    }
  }

  async getHouseholdStats(): Promise<{
    totalMembers: number;
    residents: number;
    beneficialUsers: number;
  }> {
    try {
      const members = await this.getHouseholdMembers({ status: 'active' });

      return {
        totalMembers: members.length,
        residents: members.filter(m => m.member_type === 'resident').length,
        beneficialUsers: members.filter(m => m.member_type === 'beneficial_user').length,
      };
    } catch (error) {
      console.error('Error in getHouseholdStats:', error);
      return {
        totalMembers: 0,
        residents: 0,
        beneficialUsers: 0,
      };
    }
  }

  // Process offline queue when back online
  async processOfflineQueue(): Promise<void> {
    if (!networkStatus.isConnected() || this.offlineQueue.length === 0) {
      return;
    }

    const queue = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const action of queue) {
      try {
        switch (action.type) {
          case 'create':
            await supabase.from('household_members').insert(action.data);
            break;
          case 'update':
            const { id, ...updateData } = action.data;
            await supabase.from('household_members').update(updateData).eq('id', id);
            break;
          case 'delete':
            await supabase.from('household_members').delete().eq('id', action.data.id);
            break;
        }
      } catch (error) {
        console.error('Error processing offline action:', error);
        // Re-add failed actions to the queue
        this.offlineQueue.push(action);
      }
    }
  }

  // Get offline queue count
  getOfflineQueueCount(): number {
    return this.offlineQueue.length;
  }
}

export const householdMemberService = new HouseholdMemberService();
export default householdMemberService;