import { supabase } from '../lib/supabase';
import { Q } from '@nozbe/watermelondb';
import database from '../database';
import { Guest } from '../database/models/Guest';
import networkStatus from '../lib/networkStatus';

export interface QRCodeData {
  guestId: string;
  householdId: string;
  passId: string;
  guestName: string;
  arrivalDate: string;
  departureDate?: string;
  vehiclePlate?: string;
  purpose: string;
  visitType: 'day-trip' | 'multi-day';
  timestamp: string;
  signature: string;
}

export interface QRCodeResult {
  success: boolean;
  qrCode?: string;
  passId?: string;
  error?: string;
}

class QRCodeService {
  /**
   * Generate a QR code for a guest pass
   */
  async generateGuestQRCode(guestId: string): Promise<QRCodeResult> {
    try {
      // Get guest details from local database
      const guestsCollection = database.get<Guest>('guests');
      const guest = await guestsCollection
        .query(Q.where('id', guestId))
        .fetch();

      if (guest.length === 0) {
        return { success: false, error: 'Guest not found' };
      }

      const guestData = guest[0];

      // Get household ID from auth context or guest data
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const householdId = user.user_metadata?.household_id;
      if (!householdId) {
        return { success: false, error: 'Household ID not found' };
      }

      // Generate unique pass ID if not exists
      const passId = guestData.passId || this.generatePassId();

      // Create QR code data
      const qrData: QRCodeData = {
        guestId: guestData.id,
        householdId,
        passId,
        guestName: guestData.guestName,
        arrivalDate: guestData.arrivalDate.toISOString(),
        departureDate: guestData.departureDate?.toISOString(),
        vehiclePlate: guestData.vehiclePlate,
        purpose: guestData.purpose,
        visitType: guestData.visitType,
        timestamp: new Date().toISOString(),
        signature: await this.generateSignature(guestData.id, householdId),
      };

      // Generate QR code string
      const qrString = JSON.stringify(qrData);

      // Update guest record with pass ID
      if (!guestData.passId) {
        await database.write(async () => {
          await guestData.update(guest => {
            guest.passId = passId;
            guest.qrCode = qrString;
          });
        });
      }

      // If online, sync to server
      if (networkStatus.isConnected()) {
        await this.syncQRCodeToServer(guestData.id, passId, qrString);
      }

      return {
        success: true,
        qrCode: qrString,
        passId,
      };
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate QR code',
      };
    }
  }

  /**
   * Validate QR code data
   */
  async validateQRCode(qrString: string): Promise<{ valid: boolean; data?: QRCodeData; error?: string }> {
    try {
      const data: QRCodeData = JSON.parse(qrString);

      // Validate required fields
      const requiredFields = ['guestId', 'householdId', 'passId', 'guestName', 'arrivalDate', 'purpose', 'visitType', 'timestamp', 'signature'];
      for (const field of requiredFields) {
        if (!data[field as keyof QRCodeData]) {
          return { valid: false, error: `Missing required field: ${field}` };
        }
      }

      // Validate timestamp (QR code should be valid within reasonable time)
      const qrTime = new Date(data.timestamp);
      const now = new Date();
      const hoursDiff = (now.getTime() - qrTime.getTime()) / (1000 * 60 * 60);

      if (hoursDiff > 24) {
        return { valid: false, error: 'QR code has expired (24 hours)' };
      }

      // Validate signature
      const expectedSignature = await this.generateSignature(data.guestId, data.householdId);
      if (data.signature !== expectedSignature) {
        return { valid: false, error: 'Invalid QR code signature' };
      }

      // Validate guest still exists and is active
      const guestsCollection = database.get<Guest>('guests');
      const guest = await guestsCollection
        .query(Q.where('id', data.guestId))
        .fetch();

      if (guest.length === 0) {
        return { valid: false, error: 'Guest not found' };
      }

      const guestData = guest[0];

      // Check if guest pass is still valid (not cancelled or expired)
      if (guestData.status === 'cancelled') {
        return { valid: false, error: 'Guest pass has been cancelled' };
      }

      // Check if within visit window
      const now = new Date();
      const arrival = new Date(data.arrivalDate);
      const departure = data.departureDate ? new Date(data.departureDate) : arrival;

      if (now < arrival) {
        return { valid: false, error: 'Guest pass not yet valid' };
      }

      if (now > departure) {
        return { valid: false, error: 'Guest pass has expired' };
      }

      return { valid: true, data };
    } catch (error) {
      console.error('Failed to validate QR code:', error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid QR code format',
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
   * Generate a simple signature for QR code validation
   */
  private async generateSignature(guestId: string, householdId: string): Promise<string> {
    // In production, use a proper cryptographic signature
    // For now, create a simple hash-based signature
    const payload = `${guestId}:${householdId}:${new Date().toDateString()}`;
    return btoa(payload).replace(/[^a-zA-Z0-9]/g, '').substr(0, 16);
  }

  /**
   * Sync QR code to server
   */
  private async syncQRCodeToServer(guestId: string, passId: string, qrCode: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('guest_qr_codes')
        .upsert({
          guest_id: guestId,
          pass_id: passId,
          qr_code: qrCode,
          generated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Failed to sync QR code to server:', error);
      }
    } catch (error) {
      console.error('Error syncing QR code:', error);
    }
  }

  /**
   * Get QR code for a guest
   */
  async getGuestQRCode(guestId: string): Promise<QRCodeResult> {
    try {
      const guestsCollection = database.get<Guest>('guests');
      const guest = await guestsCollection
        .query(Q.where('id', guestId))
        .fetch();

      if (guest.length === 0) {
        return { success: false, error: 'Guest not found' };
      }

      const guestData = guest[0];

      if (guestData.qrCode) {
        return {
          success: true,
          qrCode: guestData.qrCode,
          passId: guestData.passId,
        };
      }

      // Generate QR code if it doesn't exist
      return await this.generateGuestQRCode(guestId);
    } catch (error) {
      console.error('Failed to get QR code:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get QR code',
      };
    }
  }

  /**
   * Regenerate QR code (useful if pass was compromised)
   */
  async regenerateQRCode(guestId: string): Promise<QRCodeResult> {
    try {
      // Invalidate old QR code by updating timestamp
      const guestsCollection = database.get<Guest>('guests');
      const guest = await guestsCollection
        .query(Q.where('id', guestId))
        .fetch();

      if (guest.length === 0) {
        return { success: false, error: 'Guest not found' };
      }

      const guestData = guest[0];
      const newPassId = this.generatePassId();

      // Update guest record
      await database.write(async () => {
        await guestData.update(guest => {
          guest.passId = newPassId;
          guest.qrCode = ''; // Clear old QR code
        });
      });

      // Generate new QR code
      return await this.generateGuestQRCode(guestId);
    } catch (error) {
      console.error('Failed to regenerate QR code:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to regenerate QR code',
      };
    }
  }

  /**
   * Get QR code usage statistics
   */
  async getQRCodeStats(): Promise<{
    totalGenerated: number;
    activeToday: number;
    usedToday: number;
  }> {
    try {
      const guestsCollection = database.get<Guest>('guests');

      const totalGenerated = await guestsCollection
        .query(Q.where('qrCode', Q.notEq(null)))
        .fetch();

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const activeToday = await guestsCollection
        .query(
          Q.where('arrivalDate', Q.lte(tomorrow)),
          Q.where('departureDate', Q.gte(today)),
          Q.where('status', Q.notEq('cancelled'))
        )
        .fetch();

      // This would typically come from server logs
      const usedToday = 0; // Placeholder

      return {
        totalGenerated: totalGenerated.length,
        activeToday: activeToday.length,
        usedToday,
      };
    } catch (error) {
      console.error('Failed to get QR code stats:', error);
      return {
        totalGenerated: 0,
        activeToday: 0,
        usedToday: 0,
      };
    }
  }
}

// Export singleton instance
export const qrCodeService = new QRCodeService();
export default qrCodeService;