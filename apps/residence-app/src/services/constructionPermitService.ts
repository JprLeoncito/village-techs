import { supabase } from '../lib/supabase';

// Database interface matching the Supabase schema
export interface ConstructionPermit {
  id: string;
  tenant_id: string;
  household_id: string;
  project_description: string;
  project_start_date: string;
  project_end_date: string;
  contractor_name: string;
  contractor_contact?: string;
  contractor_license?: string;
  estimated_worker_count?: number;
  road_fee_amount?: number;
  road_fee_paid: boolean;
  road_fee_paid_at?: string;
  status: 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed';
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  notes?: string;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PermitRequest {
  project_description: string;
  project_start_date: string;
  project_end_date: string;
  contractor_name: string;
  contractor_contact?: string;
  contractor_license?: string;
  estimated_worker_count?: number;
  notes?: string;
  documents?: File[];
}

export interface PermitFilter {
  status?: ConstructionPermit['status'];
  search?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  sortBy?: 'created_at' | 'project_start_date' | 'project_end_date';
  sortOrder?: 'asc' | 'desc';
}

export interface PermitStatistics {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  in_progress: number;
  completed: number;
  totalRoadFees: number;
  paidRoadFees: number;
}

export interface PermitServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

class ConstructionPermitService {

  /**
   * Submit a new construction permit request
   */
  async submitPermitRequest(householdId: string, requestData: PermitRequest): Promise<PermitServiceResult<ConstructionPermit>> {
    try {

      // Upload documents if provided
      const uploadedDocuments = [];
      if (requestData.documents && requestData.documents.length > 0) {
        for (const doc of requestData.documents) {
          const uploadResult = await this.uploadDocument(doc, householdId);
          if (uploadResult.success && uploadResult.url) {
            uploadedDocuments.push(uploadResult.url);
          }
        }
      }

      // Get tenant_id from household
      const { data: householdData, error: householdError } = await supabase
        .from('households')
        .select('tenant_id')
        .eq('id', householdId)
        .single();

      if (householdError || !householdData) {
        console.error('Error fetching household data:', householdError);
        return { success: false, error: 'Household not found' };
      }

      // Create permit request in Supabase
      const { data, error } = await supabase
        .from('construction_permits')
        .insert({
          tenant_id: householdData.tenant_id,
          household_id: householdId,
          project_description: requestData.project_description,
          project_start_date: requestData.project_start_date,
          project_end_date: requestData.project_end_date,
          contractor_name: requestData.contractor_name,
          contractor_contact: requestData.contractor_contact,
          contractor_license: requestData.contractor_license,
          estimated_worker_count: requestData.estimated_worker_count,
          notes: requestData.notes,
          road_fee_paid: false,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating permit request:', error);
        return { success: false, error: error.message };
      }

      // Store document URLs in notes or a separate table if needed
      if (uploadedDocuments.length > 0) {
        await this.attachDocumentsToPermit(data.id, uploadedDocuments);
      }

      return {
        success: true,
        data: data as ConstructionPermit,
      };
    } catch (error) {
      console.error('Failed to submit permit request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit request',
      };
    }
  }

  /**
   * Get all permits for the current household
   */
  async getPermits(householdId: string, filter?: PermitFilter): Promise<ConstructionPermit[]> {
    try {
      console.log('🔍 Getting permits for household:', householdId);

      // Start with the simplest possible query
      console.log('🏗️ Building base query for household:', householdId);

      let query = supabase
        .from('construction_permits')
        .select('*')
        .eq('household_id', householdId)
        .is('deleted_at', null);

      // Apply basic filters first, then add complexity if needed
      if (filter?.status && filter.status !== 'all') {
        console.log('📋 Adding status filter:', filter.status);
        query = query.eq('status', filter.status);
      }

      // Apply sorting
      const sortBy = filter?.sortBy || 'created_at';
      const sortOrder = filter?.sortOrder || 'desc';
      console.log('📊 Adding sort:', sortBy, sortOrder);
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      console.log('🔍 Executing base query...');
      const { data, error } = await query;

      console.log('📊 Query result:', { data: data?.length || 0, error });

      if (error) {
        console.error('❌ Error fetching permits:', error);
        throw new Error(`Failed to fetch permits: ${error.message}`);
      }

      let permits = (data || []) as ConstructionPermit[];
      console.log('✅ Successfully fetched permits:', permits.length);

      // Apply search filter client-side if it's causing SQL issues
      if (filter?.search && permits.length > 0) {
        console.log('🔍 Applying client-side search filter:', filter.search);
        const searchLower = filter.search.toLowerCase();
        permits = permits.filter(permit =>
          permit.project_description?.toLowerCase().includes(searchLower) ||
          permit.contractor_name?.toLowerCase().includes(searchLower) ||
          permit.contractor_contact?.toLowerCase().includes(searchLower)
        );
        console.log('🔍 After search filter:', permits.length);
      }

      // Apply date range filter client-side if needed
      if (filter?.dateRange && permits.length > 0) {
        console.log('📅 Applying client-side date range filter:', filter.dateRange);
        permits = permits.filter(permit => {
          const startDate = new Date(permit.project_start_date);
          const endDate = new Date(permit.project_end_date);
          const filterStart = new Date(filter.dateRange.start);
          const filterEnd = new Date(filter.dateRange.end);
          return startDate >= filterStart && endDate <= filterEnd;
        });
        console.log('📅 After date range filter:', permits.length);
      }

      return permits;
    } catch (error) {
      console.error('💥 Failed to get permits:', error);
      // Don't throw for empty results - that's a valid case
      if (error instanceof Error && error.message.includes('Failed to fetch permits')) {
        throw error; // Re-throw actual database errors
      }
      // For other errors, return empty array to avoid infinite loading
      console.log('⚠️ Returning empty array due to error');
      return [];
    }
  }

  /**
   * Get a specific permit by ID
   */
  async getPermitById(permitId: string): Promise<PermitServiceResult<ConstructionPermit>> {
    try {
      const { data, error } = await supabase
        .from('construction_permits')
        .select('*')
        .eq('id', permitId)
        .is('deleted_at', null)
        .single();

      if (error) {
        console.error('Error fetching permit:', error);
        return { success: false, error: 'Permit not found' };
      }

      const permit = data as ConstructionPermit;

      return { success: true, data: permit };
    } catch (error) {
      console.error('Failed to get permit:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get permit',
      };
    }
  }

  /**
   * Update permit information
   */
  async updatePermit(permitId: string, updates: Partial<ConstructionPermit>): Promise<PermitServiceResult<ConstructionPermit>> {
    try {

      const { data, error } = await supabase
        .from('construction_permits')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', permitId)
        .select()
        .single();

      if (error) {
        console.error('Error updating permit:', error);
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: data as ConstructionPermit,
      };
    } catch (error) {
      console.error('Failed to update permit:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update permit',
      };
    }
  }

  /**
   * Cancel a permit request
   */
  async cancelPermitRequest(permitId: string, reason?: string): Promise<PermitServiceResult<ConstructionPermit>> {
    try {

      const { data, error } = await supabase
        .from('construction_permits')
        .update({
          status: 'rejected',
          rejection_reason: reason || 'Cancelled by resident',
          updated_at: new Date().toISOString(),
        })
        .eq('id', permitId)
        .eq('status', 'pending')
        .select()
        .single();

      if (error) {
        console.error('Error cancelling permit request:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data as ConstructionPermit };
    } catch (error) {
      console.error('Failed to cancel permit request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel request',
      };
    }
  }

  /**
   * Create road fee entry for approved permit
   */
  async createRoadFeeEntry(permitId: string, householdId: string, amount: number): Promise<PermitServiceResult> {
    try {

      // Create association fee entry for construction permit
      const { data: feeData, error: feeError } = await supabase
        .from('association_fees')
        .insert({
          household_id: householdId,
          fee_type: 'construction_road_fee',
          title: 'Construction Permit Road Fee',
          description: `Road fee for construction permit #${permitId}`,
          amount: amount,
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Due in 7 days
          payment_status: 'unpaid',
          recurring: false,
          metadata: {
            construction_permit_id: permitId,
            fee_type: 'construction_road_fee'
          }
        })
        .select()
        .single();

      if (feeError) {
        console.error('Error creating road fee entry:', feeError);
        return { success: false, error: feeError.message };
      }

      return { success: true, data: feeData };
    } catch (error) {
      console.error('Failed to create road fee entry:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create fee entry',
      };
    }
  }

  /**
   * Update permit status after fee payment
   */
  async updatePermitStatusAfterPayment(permitId: string): Promise<PermitServiceResult<ConstructionPermit>> {
    try {

      const { data, error } = await supabase
        .from('construction_permits')
        .update({
          status: 'in_progress',
          updated_at: new Date().toISOString(),
        })
        .eq('id', permitId)
        .eq('status', 'approved') // Only update if currently approved
        .select()
        .single();

      if (error) {
        console.error('Error updating permit status:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data as ConstructionPermit };
    } catch (error) {
      console.error('Failed to update permit status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update permit status',
      };
    }
  }

  /**
   * Pay road fee for a permit
   */
  async payRoadFee(permitId: string, amount: number, paymentMethod: string): Promise<PermitServiceResult<ConstructionPermit>> {
    try {

      // First update the construction permit
      const { data, error } = await supabase
        .from('construction_permits')
        .update({
          road_fee_amount: amount,
          road_fee_paid: true,
          road_fee_paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', permitId)
        .select()
        .single();

      if (error) {
        console.error('Error processing road fee payment:', error);
        return { success: false, error: error.message };
      }

      // Also update the corresponding association fee entry
      const { error: feeUpdateError } = await supabase
        .from('association_fees')
        .update({
          payment_status: 'paid',
          paid_amount: amount,
          payment_date: new Date().toISOString(),
          payment_method: paymentMethod,
        })
        .eq('metadata->>construction_permit_id', permitId);

      if (feeUpdateError) {
        console.error('Error updating association fee:', feeUpdateError);
        // Don't fail the whole operation if association fee update fails
        console.log('Road fee paid successfully, but association fee update failed');
      }

      return { success: true, data: data as ConstructionPermit };
    } catch (error) {
      console.error('Failed to process road fee payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process payment',
      };
    }
  }

  /**
   * Get permit statistics for the household
   */
  async getPermitStatistics(householdId: string): Promise<PermitStatistics> {
    try {
      const permits = await this.getPermits(householdId);

      const stats: PermitStatistics = {
        total: permits.length,
        pending: 0,
        approved: 0,
        rejected: 0,
        in_progress: 0,
        completed: 0,
        totalRoadFees: 0,
        paidRoadFees: 0,
      };

      permits.forEach(permit => {
        switch (permit.status) {
          case 'pending':
            stats.pending++;
            break;
          case 'approved':
            stats.approved++;
            break;
          case 'rejected':
            stats.rejected++;
            break;
          case 'in_progress':
            stats.in_progress++;
            break;
          case 'completed':
            stats.completed++;
            break;
        }

        if (permit.road_fee_amount) {
          stats.totalRoadFees += permit.road_fee_amount;
        }
        if (permit.road_fee_paid && permit.road_fee_amount) {
          stats.paidRoadFees += permit.road_fee_amount;
        }
      });

      return stats;
    } catch (error) {
      console.error('Failed to get permit statistics:', error);
      return {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        in_progress: 0,
        completed: 0,
        totalRoadFees: 0,
        paidRoadFees: 0,
      };
    }
  }

  /**
   * Upload document to Supabase storage
   */
  private async uploadDocument(file: File, householdId: string): Promise<PermitServiceResult & { url?: string }> {
    try {
      const fileName = `permit_${Date.now()}_${file.name}`;
      const filePath = `documents/${householdId}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('construction_documents')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (error) {
        console.error('Error uploading document:', error);
        return { success: false, error: error.message };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('construction_documents')
        .getPublicUrl(filePath);

      return {
        success: true,
        url: urlData.publicUrl,
      };
    } catch (error) {
      console.error('Failed to upload document:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload document',
      };
    }
  }

  /**
   * Attach documents to permit (store URLs in notes or separate table)
   */
  private async attachDocumentsToPermit(permitId: string, documentUrls: string[]): Promise<void> {
    try {
      // For now, store document URLs in notes as JSON
      // In a real implementation, you might have a separate permit_documents table
      const { data: permit } = await supabase
        .from('construction_permits')
        .select('notes')
        .eq('id', permitId)
        .single();

      let notes = permit?.notes || '';
      const documentsJson = JSON.stringify(documentUrls);

      if (notes) {
        notes += `\n\nDocuments: ${documentsJson}`;
      } else {
        notes = `Documents: ${documentsJson}`;
      }

      await supabase
        .from('construction_permits')
        .update({ notes })
        .eq('id', permitId);
    } catch (error) {
      console.error('Failed to attach documents to permit:', error);
    }
  }
}

// Export singleton instance
export const constructionPermitService = new ConstructionPermitService();
export default constructionPermitService;