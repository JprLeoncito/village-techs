import { supabase } from '../lib/supabase';
import networkStatus from '../lib/networkStatus';
import { CacheService } from '../lib/cache';
import { OfflineQueue } from '../lib/offlineQueue';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Since there's no dedicated guest table in the schema, we'll work with gate_entries
// and create a comprehensive guest management service that can be extended

export interface GuestVisit {
  id: string;
  tenant_id: string;
  household_id: string;
  guest_name: string;
  guest_phone?: string;
  guest_email?: string;
  vehicle_plate?: string;
  purpose: string;
  visit_type: 'day_trip' | 'multi_day' | 'delivery' | 'service';
  expected_arrival: string;
  expected_departure?: string;
  actual_arrival?: string;
  actual_departure?: string;
  status: 'scheduled' | 'arrived' | 'departed' | 'cancelled' | 'no_show';
  pass_id: string;
  qr_code?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GateEntry {
  id: string;
  tenant_id: string;
  gate_id: string;
  entry_timestamp: string;
  entry_type: 'vehicle' | 'pedestrian' | 'delivery' | 'visitor';
  vehicle_plate?: string;
  sticker_id?: string;
  household_id?: string;
  security_officer_id?: string;
  notes?: string;
  created_at: string;
}

export interface GuestVisitRequest {
  guest_name: string;
  guest_phone?: string;
  guest_email?: string;
  vehicle_plate?: string;
  purpose: string;
  visit_type: GuestVisit['visit_type'];
  expected_arrival: string;
  expected_departure?: string;
  notes?: string;
}

export interface GuestVisitFilter {
  status?: GuestVisit['status'];
  visitType?: GuestVisit['visit_type'];
  dateRange?: {
    start: string;
    end: string;
  };
  search?: string;
  sortBy?: 'expected_arrival' | 'guest_name' | 'status' | 'created_at';
  sortOrder?: 'asc' | 'desc';
  upcomingOnly?: boolean;
}

export interface GuestStatistics {
  total: number;
  scheduled: number;
  arrived: number;
  departed: number;
  cancelled: number;
  noShow: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  byType: {
    day_trip: number;
    multi_day: number;
    delivery: number;
    service: number;
  };
}

export interface GuestServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

class GuestVisitorService {
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly GUEST_VISITS_STORAGE_KEY = 'guest_visits_data';

  /**
   * Schedule a new guest visit
   */
  async scheduleGuestVisit(householdId: string, requestData: GuestVisitRequest): Promise<GuestServiceResult<GuestVisit>> {
    try {
      if (!networkStatus.isConnected()) {
        // Queue for offline sync
        await OfflineQueue.addAction('guest_visit_schedule', {
          householdId,
          requestData,
        });
        return {
          success: true,
          data: {
            id: `offline_${Date.now()}`,
            household_id: householdId,
            ...requestData,
            status: 'scheduled',
            pass_id: this.generatePassId(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as GuestVisit,
        };
      }

      // Generate pass ID and QR code
      const passId = this.generatePassId();
      const qrCode = this.generateQRCode(passId);

      // Create guest record in the scheduled_guests table
      const guestRecord = {
        household_id: householdId,
        guest_name: requestData.guest_name,
        guest_phone: requestData.guest_phone,
        vehicle_plate: requestData.vehicle_plate,
        purpose: requestData.purpose,
        visit_type: requestData.visit_type,
        arrival_date: requestData.expected_arrival,
        departure_date: requestData.expected_departure,
        pass_id: passId,
        status: 'scheduled' as const,
        notes: requestData.notes,
      };

      const { data, error } = await supabase
        .from('scheduled_guests')
        .insert(guestRecord)
        .select()
        .single();

      if (error) {
        console.error('Error creating guest visit:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      // Convert to GuestVisit format
      const guestVisit: GuestVisit = {
        id: data.id,
        tenant_id: data.tenant_id,
        household_id: data.household_id,
        guest_name: data.guest_name,
        guest_phone: data.guest_phone,
        vehicle_plate: data.vehicle_plate,
        purpose: data.purpose,
        visit_type: data.visit_type,
        expected_arrival: data.arrival_date,
        expected_departure: data.departure_date,
        status: data.status as GuestVisit['status'],
        pass_id: data.pass_id,
        qr_code: qrCode,
        notes: data.notes,
        created_by: '', // Will be populated from auth context
        created_at: data.created_at,
        updated_at: data.updated_at,
        actual_arrival: data.checked_in_at,
        actual_departure: data.checked_out_at,
      };

      // Clear cache
      await this.clearCache(householdId);

      return {
        success: true,
        data: guestVisit,
      };
    } catch (error) {
      console.error('Failed to schedule guest visit:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to schedule guest visit',
      };
    }
  }

  /**
   * Get all guest visits for the household
   */
  async getGuestVisits(householdId: string, filter?: GuestVisitFilter): Promise<GuestVisit[]> {
    try {
      // Try cache first
      const cacheKey = `guest_visits_${householdId}_${JSON.stringify(filter)}`;
      const cachedVisits = await CacheService.getCachedData<GuestVisit[]>(cacheKey, householdId);
      if (cachedVisits) {
        return this.applyFilter(cachedVisits, filter);
      }

      // Get from database
      const { data, error } = await supabase
        .from('scheduled_guests')
        .select('*')
        .eq('household_id', householdId)
        .order('arrival_date', { ascending: true });

      if (error) {
        console.error('Error fetching guest visits:', error);
        // Fallback to local storage
        const localVisits = await this.getGuestVisitsLocally(householdId);
        return this.applyFilter(localVisits, filter);
      }

      // Convert to GuestVisit format
      const guestVisits: GuestVisit[] = (data || []).map(record => ({
        id: record.id,
        tenant_id: record.tenant_id,
        household_id: record.household_id,
        guest_name: record.guest_name,
        guest_phone: record.guest_phone,
        vehicle_plate: record.vehicle_plate,
        purpose: record.purpose,
        visit_type: record.visit_type,
        expected_arrival: record.arrival_date,
        expected_departure: record.departure_date,
        status: record.status as GuestVisit['status'],
        pass_id: record.pass_id,
        qr_code: this.generateQRCode(record.pass_id),
        notes: record.notes,
        created_by: '', // Would be populated from auth context
        created_at: record.created_at,
        updated_at: record.updated_at,
        actual_arrival: record.checked_in_at,
        actual_departure: record.checked_out_at,
      }));

      // Apply filters
      let filteredVisits = this.applyFilter(guestVisits, filter);

      // Cache the data
      await CacheService.setCachedData(cacheKey, householdId, filteredVisits);

      return filteredVisits;
    } catch (error) {
      console.error('Failed to get guest visits:', error);
      return [];
    }
  }

  /**
   * Get a specific guest visit by ID
   */
  async getGuestVisitById(visitId: string): Promise<GuestServiceResult<GuestVisit>> {
    try {
      const localVisits = await this.getGuestVisitsLocally('');
      const visit = localVisits.find(v => v.id === visitId);

      if (visit) {
        return { success: true, data: visit };
      }

      return { success: false, error: 'Guest visit not found' };
    } catch (error) {
      console.error('Failed to get guest visit:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get guest visit',
      };
    }
  }

  /**
   * Update guest visit
   */
  async updateGuestVisit(visitId: string, updates: Partial<GuestVisit>): Promise<GuestServiceResult<GuestVisit>> {
    try {
      const localVisits = await this.getGuestVisitsLocally('');
      const visitIndex = localVisits.findIndex(v => v.id === visitId);

      if (visitIndex === -1) {
        return { success: false, error: 'Guest visit not found' };
      }

      // Update the visit
      const updatedVisit = {
        ...localVisits[visitIndex],
        ...updates,
        updated_at: new Date().toISOString(),
      };

      localVisits[visitIndex] = updatedVisit;

      // Store updated visits
      await this.storeGuestVisitsLocally(localVisits);

      // Clear cache
      await this.clearCache(updatedVisit.household_id);
      await this.clearCacheForVisit(visitId);

      return { success: true, data: updatedVisit };
    } catch (error) {
      console.error('Failed to update guest visit:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update guest visit',
      };
    }
  }

  /**
   * Cancel guest visit
   */
  async cancelGuestVisit(visitId: string, reason?: string): Promise<GuestServiceResult<GuestVisit>> {
    try {
      const result = await this.updateGuestVisit(visitId, {
        status: 'cancelled',
        notes: reason ? `Cancelled: ${reason}` : undefined,
      });

      return result;
    } catch (error) {
      console.error('Failed to cancel guest visit:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel guest visit',
      };
    }
  }

  /**
   * Update guest status (for check-in/check-out functionality)
   */
  async updateGuestStatus(visitId: string, status: GuestVisit['status'], accessCode?: string): Promise<GuestServiceResult<GuestVisit>> {
    try {
      // Verify access code if provided
      if (accessCode) {
        const visit = await this.getGuestVisitById(visitId);
        if (!visit.success || visit.data?.pass_id !== accessCode) {
          return { success: false, error: 'Invalid access code' };
        }
      }

      const updates: Partial<GuestVisit> = {
        status,
        updated_at: new Date().toISOString(),
      };

      // Add timestamps based on status
      if (status === 'arrived') {
        updates.actual_arrival = new Date().toISOString();
      } else if (status === 'departed') {
        updates.actual_departure = new Date().toISOString();
      }

      const result = await this.updateGuestVisit(visitId, updates);
      return result;
    } catch (error) {
      console.error('Failed to update guest status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update guest status',
      };
    }
  }

  /**
   * Check in a guest
   */
  async checkInGuest(visitId: string, accessCode: string): Promise<GuestServiceResult<GuestVisit>> {
    return this.updateGuestStatus(visitId, 'arrived', accessCode);
  }

  /**
   * Check out a guest
   */
  async checkOutGuest(visitId: string): Promise<GuestServiceResult<GuestVisit>> {
    return this.updateGuestStatus(visitId, 'departed');
  }

  /**
   * Get QR code for a guest
   */
  async getGuestQRCode(visitId: string): Promise<GuestServiceResult<{ qrCode: string; passId: string }>> {
    try {
      const visit = await this.getGuestVisitById(visitId);

      if (!visit.success || !visit.data) {
        return { success: false, error: 'Guest visit not found' };
      }

      return {
        success: true,
        data: {
          qrCode: visit.data.qr_code || this.generateQRCode(visit.data.pass_id),
          passId: visit.data.pass_id,
        },
      };
    } catch (error) {
      console.error('Failed to get guest QR code:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get guest QR code',
      };
    }
  }

  /**
   * Get upcoming guest visits
   */
  async getUpcomingVisits(householdId: string): Promise<GuestVisit[]> {
    try {
      const now = new Date();
      const visits = await this.getGuestVisits(householdId);

      return visits.filter(visit => {
        if (visit.status !== 'scheduled') return false;

        const expectedArrival = new Date(visit.expected_arrival);
        return expectedArrival >= now;
      }).sort((a, b) =>
        new Date(a.expected_arrival).getTime() - new Date(b.expected_arrival).getTime()
      );
    } catch (error) {
      console.error('Failed to get upcoming visits:', error);
      return [];
    }
  }

  /**
   * Get active guest visits (arrived but not departed)
   */
  async getActiveVisits(householdId: string): Promise<GuestVisit[]> {
    try {
      const visits = await this.getGuestVisits(householdId);

      return visits.filter(visit => visit.status === 'arrived');
    } catch (error) {
      console.error('Failed to get active visits:', error);
      return [];
    }
  }

  /**
   * Get gate entries for the household
   */
  async getGateEntries(householdId: string, limit = 50): Promise<GateEntry[]> {
    try {
      if (!networkStatus.isConnected()) {
        return [];
      }

      const { data, error } = await supabase
        .from('gate_entries')
        .select('*')
        .eq('household_id', householdId)
        .order('entry_timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching gate entries:', error);
        return [];
      }

      return (data || []) as GateEntry[];
    } catch (error) {
      console.error('Failed to get gate entries:', error);
      return [];
    }
  }

  /**
   * Get guest visit statistics
   */
  async getGuestVisitStatistics(householdId: string): Promise<GuestStatistics> {
    try {
      const visits = await this.getGuestVisits(householdId);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeek = new Date(today);
      thisWeek.setDate(today.getDate() - today.getDay());
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const stats: GuestStatistics = {
        total: visits.length,
        scheduled: 0,
        arrived: 0,
        departed: 0,
        cancelled: 0,
        noShow: 0,
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
        byType: {
          day_trip: 0,
          multi_day: 0,
          delivery: 0,
          service: 0,
        },
      };

      visits.forEach(visit => {
        // Count by status
        switch (visit.status) {
          case 'scheduled':
            stats.scheduled++;
            break;
          case 'arrived':
            stats.arrived++;
            break;
          case 'departed':
            stats.departed++;
            break;
          case 'cancelled':
            stats.cancelled++;
            break;
          case 'no_show':
            stats.noShow++;
            break;
        }

        // Count by type
        stats.byType[visit.visit_type]++;

        // Count by time periods
        const expectedArrival = new Date(visit.expected_arrival);
        if (expectedArrival >= today) {
          stats.today++;
        }
        if (expectedArrival >= thisWeek) {
          stats.thisWeek++;
        }
        if (expectedArrival >= thisMonth) {
          stats.thisMonth++;
        }
      });

      return stats;
    } catch (error) {
      console.error('Failed to get guest visit statistics:', error);
      return {
        total: 0,
        scheduled: 0,
        arrived: 0,
        departed: 0,
        cancelled: 0,
        noShow: 0,
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
        byType: {
          day_trip: 0,
          multi_day: 0,
          delivery: 0,
          service: 0,
        },
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

  /**
   * Generate QR code (placeholder implementation)
   */
  private generateQRCode(passId: string): string {
    // In a real implementation, this would generate an actual QR code
    return `qr_${passId}_${Date.now()}`;
  }

  /**
   * Store guest visit locally
   */
  private async storeGuestVisitLocally(visit: GuestVisit): Promise<void> {
    try {
      const existingVisits = await this.getGuestVisitsLocally(visit.household_id);
      existingVisits.push(visit);
      await this.storeGuestVisitsLocally(existingVisits);
    } catch (error) {
      console.error('Failed to store guest visit locally:', error);
    }
  }

  /**
   * Store guest visits locally
   */
  private async storeGuestVisitsLocally(visits: GuestVisit[]): Promise<void> {
    try {
      const key = `${this.GUEST_VISITS_STORAGE_KEY}_all`;
      await AsyncStorage.setItem(key, JSON.stringify(visits));
    } catch (error) {
      console.error('Failed to store guest visits locally:', error);
    }
  }

  /**
   * Get guest visits from local storage
   */
  private async getGuestVisitsLocally(householdId: string): Promise<GuestVisit[]> {
    try {
      const key = `${this.GUEST_VISITS_STORAGE_KEY}_all`;
      const stored = await AsyncStorage.getItem(key);
      const allVisits = stored ? JSON.parse(stored) : [];

      if (householdId) {
        return allVisits.filter((visit: GuestVisit) => visit.household_id === householdId);
      }

      return allVisits;
    } catch (error) {
      console.error('Failed to get guest visits from local storage:', error);
      return [];
    }
  }

  /**
   * Apply filters to guest visits
   */
  private applyFilter(visits: GuestVisit[], filter?: GuestVisitFilter): GuestVisit[] {
    if (!filter) return visits;

    return visits.filter(visit => {
      if (filter.status && visit.status !== filter.status) return false;
      if (filter.visitType && visit.visit_type !== filter.visitType) return false;

      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        const matchesSearch =
          visit.guest_name.toLowerCase().includes(searchLower) ||
          (visit.guest_phone && visit.guest_phone.includes(searchLower)) ||
          (visit.vehicle_plate && visit.vehicle_plate.toLowerCase().includes(searchLower)) ||
          visit.purpose.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      if (filter.dateRange) {
        const expectedArrival = new Date(visit.expected_arrival);
        const startDate = new Date(filter.dateRange.start);
        const endDate = new Date(filter.dateRange.end);
        if (expectedArrival < startDate || expectedArrival > endDate) return false;
      }

      if (filter.upcomingOnly) {
        const now = new Date();
        const expectedArrival = new Date(visit.expected_arrival);
        if (expectedArrival < now || visit.status !== 'scheduled') return false;
      }

      return true;
    }).sort((a, b) => {
      const sortBy = filter?.sortBy || 'expected_arrival';
      const sortOrder = filter?.sortOrder || 'asc';

      let comparison = 0;

      switch (sortBy) {
        case 'expected_arrival':
          comparison = new Date(a.expected_arrival).getTime() - new Date(b.expected_arrival).getTime();
          break;
        case 'guest_name':
          comparison = a.guest_name.localeCompare(b.guest_name);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * Clear cache for a specific household
   */
  private async clearCache(householdId: string): Promise<void> {
    try {
      await CacheService.clearCache(`guest_visits_${householdId}`);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  /**
   * Subscribe to real-time guest updates
   */
  async subscribeToGuests(options: {
    householdId: string;
    onNewGuest: (guest: GuestVisit) => void;
    onGuestUpdated: (guest: GuestVisit) => void;
    onGuestDeleted: (guestId: string) => void;
  }): Promise<void> {
    try {
      // Since we're using local storage and don't have real-time database sync,
      // we'll implement a simple polling mechanism or event-based updates

      // For now, this is a placeholder that would connect to Supabase real-time
      // when a proper guest_visits table is available

      // Guest subscription setup for household

      // In a real implementation, you would:
      // 1. Set up Supabase real-time subscription to guest_visits table
      // 2. Listen for INSERT, UPDATE, DELETE events
      // 3. Call the appropriate callbacks when events occur

      // For now, we'll store the callbacks for potential manual updates
      this.subscriptionCallbacks = options;
    } catch (error) {
      console.error('Failed to setup guest subscription:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from guest updates
   */
  async unsubscribeFromGuests(): Promise<void> {
    try {
      this.subscriptionCallbacks = null;
      // Guest subscription cleared
    } catch (error) {
      console.error('Failed to clear guest subscription:', error);
    }
  }

  /**
   * Clear cache for a specific visit
   */
  private async clearCacheForVisit(visitId: string): Promise<void> {
    try {
      await CacheService.clearCache(`guest_visit_${visitId}`);
    } catch (error) {
      console.error('Failed to clear visit cache:', error);
    }
  }

  // Store subscription callbacks
  private subscriptionCallbacks: {
    householdId: string;
    onNewGuest: (guest: GuestVisit) => void;
    onGuestUpdated: (guest: GuestVisit) => void;
    onGuestDeleted: (guestId: string) => void;
  } | null = null;
}

// Export singleton instance
export const guestVisitorService = new GuestVisitorService();
export default guestVisitorService;