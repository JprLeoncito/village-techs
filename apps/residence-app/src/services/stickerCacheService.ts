// TEMPORARY STUB - WatermelonDB not installed yet
// This provides basic mock functionality until the database is set up

export interface Sticker {
  id: string;
  remoteId: string;
  vehiclePlate: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleColor: string;
  vehicleType: string;
  status: string;
  expiryDate: Date;
  rejectionReason?: string;
  isRenewal: boolean;
  documentUrl: string;
  householdMemberId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StickerCacheResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface StickerStatus {
  active: number;
  expiring: number;
  expired: number;
  pending: number;
  rejected: number;
  total: number;
}

// Mock Observable implementation
class MockObservable<T> {
  constructor(private data: T) {}

  subscribe(callback: (value: T) => void) {
    callback(this.data);
    return { unsubscribe: () => {} };
  }
}

class StickerCacheService {
  /**
   * Get all stickers with observable updates
   */
  observeStickers(): MockObservable<Sticker[]> {
    return new MockObservable<Sticker[]>([]);
  }

  /**
   * Get stickers by status with observable updates
   */
  observeStickersByStatus(status: string): MockObservable<Sticker[]> {
    return new MockObservable<Sticker[]>([]);
  }

  /**
   * Get stickers for a specific household member
   */
  observeMemberStickers(memberId: string): MockObservable<Sticker[]> {
    return new MockObservable<Sticker[]>([]);
  }

  /**
   * Get expiring stickers (within 30 days)
   */
  observeExpiringStickers(): MockObservable<Sticker[]> {
    return new MockObservable<Sticker[]>([]);
  }

  /**
   * Get sticker statistics
   */
  async getStickerStats(): Promise<StickerStatus> {
    return {
      active: 0,
      expiring: 0,
      expired: 0,
      pending: 0,
      rejected: 0,
      total: 0,
    };
  }

  /**
   * Search stickers by plate number
   */
  async searchByPlateNumber(plateNumber: string): Promise<Sticker[]> {
    return [];
  }

  /**
   * Get recently issued stickers
   */
  observeRecentStickers(limit: number = 5): MockObservable<Sticker[]> {
    return new MockObservable<Sticker[]>([]);
  }

  /**
   * Cache sticker data from server
   */
  async cacheServerSticker(serverData: any): Promise<StickerCacheResult> {
    return { success: true };
  }

  /**
   * Bulk cache stickers from server
   */
  async bulkCacheStickers(serverStickers: any[]): Promise<StickerCacheResult> {
    return { success: true };
  }

  /**
   * Clear expired stickers from cache (older than 6 months)
   */
  async clearExpiredCache(): Promise<void> {
    // No-op for stub
  }

  /**
   * Get sticker by ID from cache
   */
  async getCachedSticker(stickerId: string): Promise<Sticker | null> {
    return null;
  }

  /**
   * Check if sticker needs renewal
   */
  needsRenewal(sticker: Sticker): boolean {
    return false;
  }

  /**
   * Get renewal eligibility
   */
  canRenew(sticker: Sticker): boolean {
    return false;
  }

  /**
   * Invalidate cache for a specific sticker
   */
  async invalidateSticker(stickerId: string): Promise<void> {
    // No-op for stub
  }

  /**
   * Observe sticker count by status
   */
  observeStickerCount(status?: string): MockObservable<number> {
    return new MockObservable<number>(0);
  }

  /**
   * Get vehicle types in use
   */
  async getVehicleTypes(): Promise<string[]> {
    return [];
  }

  /**
   * Export stickers data for reports
   */
  async exportStickersData(): Promise<any[]> {
    return [];
  }
}

// Create HOC stub for observing stickers
export const withStickerObservables = (component: any) => component;

// Export singleton instance
export const stickerCacheService = new StickerCacheService();
export default stickerCacheService;