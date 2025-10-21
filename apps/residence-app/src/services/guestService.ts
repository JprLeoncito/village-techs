import { supabase } from '../lib/supabase';

/**
 * Helper function to convert a local Date to a string that preserves the local date
 * This prevents timezone conversion issues when saving to database
 */
const localDateToISOString = (date: Date): string => {
  // Create a new date object at midnight local time
  const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  // Format as YYYY-MM-DDT00:00:00.000Z to preserve the local date
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, '0');
  const day = String(localDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}T00:00:00.000Z`;
};

export interface GuestFormData {
  guestName: string;
  guestPhone: string;
  vehiclePlate?: string;
  purpose: string;
  visitType: 'day-trip' | 'multi-day';
  arrivalDate: Date;
  departureDate?: Date;
}

export interface GuestResult {
  success: boolean;
  guestId?: string;
  passId?: string;
  qrCode?: string;
  error?: string;
  data?: any;
}

export interface Guest {
  id: string;
  household_id: string;
  guest_name: string;
  guest_phone: string;
  vehicle_plate?: string;
  purpose: string;
  visit_type: 'day_trip' | 'multi_day';
  arrival_date: string;
  departure_date?: string;
  pass_id: string;
  status: 'scheduled' | 'checked_in' | 'checked_out' | 'cancelled' | 'expired';
  created_at: string;
  updated_at?: string;
  cancelled_at?: string;
  checked_in_at?: string;
  checked_out_at?: string;
  expired_at?: string;
}

/**
 * UI Guest Status display types
 */
export type UIGuestStatus = 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'CANCELLED';

/**
 * Status mapping result with display information
 */
export interface UIGuestStatusInfo {
  status: UIGuestStatus;
  color: string;
  priority: number; // For sorting (1=highest priority)
}

class GuestService {
  /**
   * Convert database status to UI display status with proper date-based logic
   * This is the single source of truth for UI guest status display
   */
  getUIGuestStatus(guest: Guest): UIGuestStatusInfo {
    const now = new Date();
    // Create timezone-aware date boundaries
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    // Parse arrival date properly - our localDateToISOString saves dates at midnight UTC
    const arrivalDate = new Date(guest.arrival_date);
    // Adjust arrival date to local timezone for comparison
    const localArrivalDate = new Date(arrivalDate.getFullYear(), arrivalDate.getMonth(), arrivalDate.getDate());

    const departureDate = guest.departure_date ? new Date(guest.departure_date) : null;

    switch (guest.status) {
      case 'checked_in':
        return {
          status: 'ACTIVE',
          color: '#10b981',
          priority: 1
        };

      case 'cancelled':
        return {
          status: 'CANCELLED',
          color: '#ef4444',
          priority: 4
        };

      case 'checked_out':
        return {
          status: 'EXPIRED',
          color: '#6b7280',
          priority: 4
        };

      case 'expired':
        return {
          status: 'EXPIRED',
          color: '#6b7280',
          priority: 4
        };

      case 'scheduled':
        // For scheduled guests, determine UI status based on dates
        if (now < localArrivalDate) {
          // Future guests are SCHEDULED
          return {
            status: 'SCHEDULED',
            color: '#3b82f6',
            priority: 2
          };
        } else if (now >= todayStart && now < todayEnd) {
          // Today's scheduled guests (whose time has arrived) are considered ACTIVE
          return {
            status: 'ACTIVE',
            color: '#10b981',
            priority: 1
          };
        } else {
          // Past scheduled guests who weren't checked in are EXPIRED
          return {
            status: 'EXPIRED',
            color: '#6b7280',
            priority: 4
          };
        };

      default:
        return {
          status: 'SCHEDULED',
          color: '#3b82f6',
          priority: 2
        };
    }
  }

  /**
   * Get all guests for a household
   */
  async getGuests(householdId: string, filter?: 'scheduled' | 'history' | 'expired'): Promise<Guest[]> {
    try {
      let query = supabase
        .from('scheduled_guests')
        .select('*')
        .eq('household_id', householdId);

      // Apply filter if specified
      if (filter === 'scheduled') {
        query = query.in('status', ['scheduled', 'checked_in']);
      } else if (filter === 'history') {
        query = query.in('status', ['checked_out', 'cancelled', 'expired']);
      } else if (filter === 'expired') {
        query = query.in('status', ['expired']);
      }

      const { data, error } = await query.order('arrival_date', { ascending: true });

      if (error) {
        console.error('Error fetching guests:', error);
        return [];
      }

      console.log('DEBUG: getGuests returning', data?.length || 0, 'guests for filter:', filter, 'household:', householdId);

      // DEBUG: Also check what ALL guests look like for this household
      if (!filter) {
        const { data: allGuests, error: allError } = await supabase
          .from('scheduled_guests')
          .select('id, guest_name, status, arrival_date, departure_date')
          .eq('household_id', householdId)
          .limit(5);

        if (!allError && allGuests) {
          console.log('DEBUG: Sample of ALL guests in household:', allGuests);
        }
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get guests:', error);
      return [];
    }
  }

  /**
   * Get a specific guest by ID
   */
  async getGuest(guestId: string): Promise<Guest | null> {
    try {
      const { data, error } = await supabase
        .from('scheduled_guests')
        .select('*')
        .eq('id', guestId)
        .single();

      if (error) {
        console.error('Error fetching guest:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to get guest:', error);
      return null;
    }
  }

  /**
   * Update expired guest statuses
   * This function should be called periodically to update guest statuses based on date/time
   */
  async updateExpiredGuests(): Promise<void> {
    try {
      // TEMPORARILY DISABLED FOR DEBUGGING
      console.log('DEBUG: updateExpiredGuests DISABLED for debugging');
      return;

      const now = new Date();
      // Create timezone-aware date boundaries
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      console.log('DEBUG: updateExpiredGuests running at:', now.toISOString());

      // Get current guests for update
      const { data: allGuests, error: fetchError } = await supabase
        .from('scheduled_guests')
        .select('id, status, arrival_date, departure_date')
        .in('status', ['scheduled', 'checked_in'])
        .order('arrival_date', { ascending: false });

      if (fetchError) {
        console.error('Error fetching guests for expiry check:', fetchError);
        return;
      }
      console.log('DEBUG: Found', allGuests?.length || 0, 'guests to check for expiry');

      // Find expired guests and mark them as checked_out
      // A guest is expired if:
      // 1. For day_trip: end of arrival day has passed
      // 2. For multi_day: departure date has passed
      const { data: expiredGuests, error: expiredFetchError } = await supabase
        .from('scheduled_guests')
        .select('id, arrival_date, departure_date, visit_type, status')
        .in('status', ['scheduled', 'checked_in']);

      if (expiredFetchError) {
        console.error('Error fetching guests for expiry check:', expiredFetchError);
        return;
      }

      const expiredGuestIds: string[] = [];

      if (expiredGuests) {
        for (const guest of expiredGuests) {
          const arrivalDate = new Date(guest.arrival_date);
          const departureDate = guest.departure_date ? new Date(guest.departure_date) : null;

          let isExpired = false;
          let expiryReason = '';

          if (guest.visit_type === 'day_trip') {
            // Day trip guests expire at the end of their scheduled day
            // So if arrival was Oct 18, they expire on Oct 19 at 00:00 (midnight after Oct 18)
            const expiryDate = new Date(arrivalDate.getFullYear(), arrivalDate.getMonth(), arrivalDate.getDate() + 1);
            isExpired = now >= expiryDate;
            expiryReason = `Day trip: now(${now.toISOString()}) >= expiryDate(${expiryDate.toISOString()})`;
          } else if (guest.visit_type === 'multi_day' && departureDate) {
            // Multi-day guests expire the day after departure
            const expiryDate = new Date(departureDate.getFullYear(), departureDate.getMonth(), departureDate.getDate() + 1);
            isExpired = now >= expiryDate;
            expiryReason = `Multi-day: now(${now.toISOString()}) >= expiryDate(${expiryDate.toISOString()})`;
          }

          // Guest expiry check performed
          if (isExpired) {
            console.log(`DEBUG: Guest ${guest.id} (${guest.guest_name}) marked as expired: ${expiryReason}`);
            expiredGuestIds.push(guest.id);
          }
        }
      }

      // Update expired guests to expired status (for guests who missed their visit)
      if (expiredGuestIds.length > 0) {
        // Marking guests as expired
        const nowISO = now.toISOString();

        const { error: updateError } = await supabase
          .from('scheduled_guests')
          .update({
            status: 'expired',
            expired_at: nowISO,
            updated_at: nowISO
          })
          .in('id', expiredGuestIds);

        if (updateError) {
          console.error('Error updating expired guests:', updateError);
        }
        // Successfully updated expired guests
        if (expiredGuestIds.length > 0) {
          console.log('DEBUG: Updated guests to expired status:', expiredGuestIds);
        }
      }
      // Guest status update completed
    } catch (error) {
      console.error('Failed to update guest statuses:', error);
    }
  }

  /**
   * Schedule a new guest
   */
  async scheduleGuest(householdId: string, guestData: GuestFormData): Promise<GuestResult> {
    try {
      // Generate pass ID
      const passId = this.generatePassId();

      // First get the tenant_id from the household
      const { data: household, error: householdError } = await supabase
        .from('households')
        .select('tenant_id')
        .eq('id', householdId)
        .single();

      if (householdError || !household) {
        console.error('Error fetching household tenant_id:', householdError);
        return {
          success: false,
          error: 'Failed to get household information. Please try again.'
        };
      }

      const guestRecord = {
        tenant_id: household.tenant_id,
        household_id: householdId,
        guest_name: guestData.guestName,
        guest_phone: guestData.guestPhone,
        vehicle_plate: guestData.vehiclePlate,
        purpose: guestData.purpose,
        visit_type: guestData.visitType === 'day-trip' ? 'day_trip' : 'multi_day',
        arrival_date: localDateToISOString(guestData.arrivalDate),
        departure_date: guestData.departureDate ? localDateToISOString(guestData.departureDate) : null,
        pass_id: passId,
        status: 'scheduled' as const,
      };

      const { data, error } = await supabase
        .from('scheduled_guests')
        .insert(guestRecord)
        .select()
        .single();

      if (error) {
        console.error('Error creating guest:', error);
        return { success: false, error: error.message };
      }

      return {
        success: true,
        guestId: data.id,
        passId: data.pass_id,
        data,
      };
    } catch (error) {
      console.error('Failed to schedule guest:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to schedule guest',
      };
    }
  }

  /**
   * Update guest information
   */
  async updateGuest(guestId: string, updates: Partial<Guest>): Promise<GuestResult> {
    try {
      const { data, error } = await supabase
        .from('scheduled_guests')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', guestId)
        .select()
        .single();

      if (error) {
        console.error('Error updating guest:', error);
        return { success: false, error: error.message };
      }

      return {
        success: true,
        guestId: data.id,
        data,
      };
    } catch (error) {
      console.error('Failed to update guest:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update guest',
      };
    }
  }

  /**
   * Cancel a guest visit
   */
  async cancelGuest(guestId: string): Promise<GuestResult> {
    return this.updateGuest(guestId, {
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    });
  }

  /**
   * Check in a guest
   */
  async checkInGuest(guestId: string): Promise<GuestResult> {
    return this.updateGuest(guestId, {
      status: 'checked_in',
      checked_in_at: new Date().toISOString(),
    });
  }

  /**
   * Check out a guest
   */
  async checkOutGuest(guestId: string): Promise<GuestResult> {
    return this.updateGuest(guestId, {
      status: 'checked_out',
      checked_out_at: new Date().toISOString(),
    });
  }

  /**
   * Edit guest information
   */
  async editGuest(guestId: string, guestData: GuestFormData): Promise<GuestResult> {
    try {
      const updates: Partial<Guest> = {
        guest_name: guestData.guestName,
        guest_phone: guestData.guestPhone,
        vehicle_plate: guestData.vehiclePlate,
        purpose: guestData.purpose,
        visit_type: guestData.visitType === 'day-trip' ? 'day_trip' : 'multi_day',
        arrival_date: localDateToISOString(guestData.arrivalDate),
        departure_date: guestData.departureDate ? localDateToISOString(guestData.departureDate) : null,
      };

      return this.updateGuest(guestId, updates);
    } catch (error) {
      console.error('Failed to edit guest:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to edit guest',
      };
    }
  }

  /**
   * Get guest QR code data
   */
  async getGuestQRCode(guestId: string): Promise<GuestResult> {
    try {
      const guest = await this.getGuest(guestId);

      if (!guest) {
        return {
          success: false,
          error: 'Guest not found',
        };
      }

      // Generate QR code data as JSON string
      const qrCodeData = JSON.stringify({
        type: 'guest_access',
        pass_id: guest.pass_id,
        guest_name: guest.guest_name,
        guest_phone: guest.guest_phone,
        purpose: guest.purpose,
        arrival_date: guest.arrival_date,
        departure_date: guest.departure_date,
        household_id: guest.household_id,
        timestamp: Date.now()
      });

      return {
        success: true,
        qrCode: qrCodeData,
        data: guest,
      };
    } catch (error) {
      console.error('Failed to get guest QR code:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate QR code',
      };
    }
  }

  /**
   * Generate a unique pass ID
   */
  private generatePassId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `GP-${timestamp}-${random}`.toUpperCase();
  }
}

// Export singleton instance
export const guestService = new GuestService();
export default guestService;