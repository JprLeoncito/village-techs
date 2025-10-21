import { stickerSyncService } from '../stickerSyncService';
import networkStatus from '../../lib/networkStatus';
import syncQueueService from '../syncQueue';
import database from '../../database';
import { supabase } from '../../lib/supabase';

// Mock dependencies
jest.mock('../../lib/networkStatus');
jest.mock('../syncQueue');
jest.mock('../../database');
jest.mock('../../lib/supabase');

describe('StickerSyncService', () => {
  const mockStickerData = {
    vehiclePlate: 'ABC 123',
    make: 'Toyota',
    model: 'Camry',
    color: 'Silver',
    vehicleType: 'Car',
    householdMemberId: 'member-123',
    documentUrl: 'https://storage.example.com/or-cr.pdf',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Offline Request Queueing', () => {
    it('should queue sticker request when offline', async () => {
      // Mock offline status
      (networkStatus.isConnected as jest.Mock).mockReturnValue(false);
      (syncQueueService.addToQueue as jest.Mock).mockResolvedValue({
        id: 'queue-item-123',
        synced: false,
      });

      const result = await stickerSyncService.queueStickerRequest(mockStickerData);

      expect(syncQueueService.addToQueue).toHaveBeenCalledWith({
        entityType: 'sticker',
        entityId: expect.any(String),
        action: 'create',
        payload: mockStickerData,
        priority: 2, // Normal priority
      });

      expect(result).toEqual({
        success: true,
        queued: true,
        queueId: 'queue-item-123',
      });
    });

    it('should store sticker locally when offline', async () => {
      (networkStatus.isConnected as jest.Mock).mockReturnValue(false);

      const mockWrite = jest.fn().mockResolvedValue({
        id: 'local-sticker-123',
      });
      (database.write as jest.Mock).mockImplementation(callback =>
        callback({ create: mockWrite })
      );

      await stickerSyncService.queueStickerRequest(mockStickerData);

      expect(database.write).toHaveBeenCalled();
      expect(mockWrite).toHaveBeenCalled();
    });

    it('should handle multiple offline requests', async () => {
      (networkStatus.isConnected as jest.Mock).mockReturnValue(false);

      const requests = [
        { ...mockStickerData, vehiclePlate: 'ABC 123' },
        { ...mockStickerData, vehiclePlate: 'XYZ 456' },
        { ...mockStickerData, vehiclePlate: 'DEF 789' },
      ];

      for (const request of requests) {
        await stickerSyncService.queueStickerRequest(request);
      }

      expect(syncQueueService.addToQueue).toHaveBeenCalledTimes(3);
    });
  });

  describe('Online Sync', () => {
    it('should sync immediately when online', async () => {
      (networkStatus.isConnected as jest.Mock).mockReturnValue(true);

      const mockSupabaseResponse = {
        data: { id: 'sticker-123', status: 'pending' },
        error: null,
      };
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue(mockSupabaseResponse),
      });

      const result = await stickerSyncService.queueStickerRequest(mockStickerData);

      expect(supabase.from).toHaveBeenCalledWith('vehicle_stickers');
      expect(result).toEqual({
        success: true,
        queued: false,
        stickerId: 'sticker-123',
      });
    });

    it('should sync queued items when coming online', async () => {
      // Start offline
      (networkStatus.isConnected as jest.Mock).mockReturnValue(false);

      await stickerSyncService.queueStickerRequest(mockStickerData);

      // Come online
      (networkStatus.isConnected as jest.Mock).mockReturnValue(true);

      const mockQueuedItems = [
        {
          id: 'queue-1',
          entityType: 'sticker',
          payload: mockStickerData,
        },
      ];

      const mockSyncQueue = {
        query: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            fetch: jest.fn().mockResolvedValue(mockQueuedItems),
          }),
        }),
      };

      (database.get as jest.Mock).mockReturnValue(mockSyncQueue);

      await stickerSyncService.syncPendingRequests();

      expect(mockSyncQueue.query).toHaveBeenCalled();
      expect(supabase.from).toHaveBeenCalledWith('vehicle_stickers');
    });

    it('should handle sync failures and retry', async () => {
      (networkStatus.isConnected as jest.Mock).mockReturnValue(true);

      // First attempt fails
      const mockError = { message: 'Network error' };
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue({ data: null, error: mockError }),
      });

      const result = await stickerSyncService.queueStickerRequest(mockStickerData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');

      // Should queue for retry
      expect(syncQueueService.addToQueue).toHaveBeenCalled();
    });
  });

  describe('Conflict Resolution', () => {
    it('should handle duplicate plate conflicts', async () => {
      (networkStatus.isConnected as jest.Mock).mockReturnValue(true);

      const duplicateError = {
        code: '23505',
        message: 'duplicate key value violates unique constraint',
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue({ data: null, error: duplicateError }),
      });

      const result = await stickerSyncService.queueStickerRequest(mockStickerData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already registered');
    });

    it('should merge updates when syncing', async () => {
      const localSticker = {
        id: 'local-123',
        vehiclePlate: 'ABC 123',
        status: 'pending',
        locallyModified: true,
        updatedAt: new Date('2024-01-01'),
      };

      const serverSticker = {
        id: 'local-123',
        vehiclePlate: 'ABC 123',
        status: 'approved',
        updatedAt: new Date('2024-01-02'),
      };

      const merged = await stickerSyncService.resolveConflict(
        localSticker,
        serverSticker
      );

      // Server wins for status (authoritative)
      expect(merged.status).toBe('approved');
      // Keep local modifications for non-conflicting fields
      expect(merged.locallyModified).toBe(true);
    });
  });

  describe('Batch Sync Operations', () => {
    it('should batch sync multiple stickers efficiently', async () => {
      const stickers = Array.from({ length: 10 }, (_, i) => ({
        ...mockStickerData,
        vehiclePlate: `ABC ${i}`,
      }));

      (networkStatus.isConnected as jest.Mock).mockReturnValue(true);
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue({ data: stickers, error: null }),
      });

      await stickerSyncService.batchSync(stickers);

      // Should batch insert instead of individual calls
      expect(supabase.from).toHaveBeenCalledTimes(1);
    });

    it('should handle partial batch failures', async () => {
      const stickers = [
        { ...mockStickerData, vehiclePlate: 'ABC 1' },
        { ...mockStickerData, vehiclePlate: 'ABC 2' }, // This will fail
        { ...mockStickerData, vehiclePlate: 'ABC 3' },
      ];

      (networkStatus.isConnected as jest.Mock).mockReturnValue(true);

      // Mock partial success
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockImplementation((data) => {
          if (Array.isArray(data)) {
            const successful = data.filter(s => s.vehiclePlate !== 'ABC 2');
            return Promise.resolve({ data: successful, error: null });
          }
          return Promise.resolve({ data, error: null });
        }),
      });

      const result = await stickerSyncService.batchSync(stickers);

      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
    });
  });

  describe('Priority Queue Management', () => {
    it('should prioritize renewal requests', async () => {
      (networkStatus.isConnected as jest.Mock).mockReturnValue(false);

      const renewalRequest = {
        ...mockStickerData,
        isRenewal: true,
        expiringStickerId: 'old-sticker-123',
      };

      await stickerSyncService.queueStickerRequest(renewalRequest);

      expect(syncQueueService.addToQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 1, // High priority for renewals
        })
      );
    });

    it('should process high priority items first', async () => {
      const queue = [
        { priority: 2, id: 'normal-1' },
        { priority: 1, id: 'high-1' },
        { priority: 3, id: 'low-1' },
        { priority: 1, id: 'high-2' },
      ];

      const processed = await stickerSyncService.processQueue(queue);

      expect(processed.map(p => p.id)).toEqual([
        'high-1',
        'high-2',
        'normal-1',
        'low-1',
      ]);
    });
  });

  describe('Error Recovery', () => {
    it('should implement exponential backoff for retries', async () => {
      const retryDelays: number[] = [];

      jest.spyOn(global, 'setTimeout').mockImplementation((fn, delay) => {
        retryDelays.push(delay as number);
        fn();
        return {} as NodeJS.Timeout;
      });

      await stickerSyncService.retryWithBackoff(
        async () => { throw new Error('Network error'); },
        3
      );

      expect(retryDelays).toEqual([1000, 2000, 4000]); // Exponential backoff
    });

    it('should eventually give up after max retries', async () => {
      let attempts = 0;

      const result = await stickerSyncService.retryWithBackoff(
        async () => {
          attempts++;
          throw new Error('Persistent error');
        },
        3
      );

      expect(attempts).toBe(3);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Max retries exceeded');
    });
  });

  describe('Cache Management', () => {
    it('should cache active stickers locally', async () => {
      const activeStickers = [
        { id: '1', vehiclePlate: 'ABC 123', status: 'active' },
        { id: '2', vehiclePlate: 'XYZ 456', status: 'active' },
      ];

      await stickerSyncService.cacheActiveStickers(activeStickers);

      const cached = await stickerSyncService.getCachedStickers();
      expect(cached).toEqual(activeStickers);
    });

    it('should invalidate cache on updates', async () => {
      await stickerSyncService.cacheActiveStickers([
        { id: '1', vehiclePlate: 'ABC 123', status: 'active' },
      ]);

      await stickerSyncService.updateSticker('1', { status: 'expired' });

      const cached = await stickerSyncService.getCachedStickers();
      expect(cached.find(s => s.id === '1')?.status).toBe('expired');
    });
  });

  describe('Network State Handling', () => {
    it('should handle intermittent connectivity', async () => {
      const connectivityStates = [true, false, true, false, true];
      let stateIndex = 0;

      (networkStatus.isConnected as jest.Mock).mockImplementation(() => {
        return connectivityStates[stateIndex++ % connectivityStates.length];
      });

      const requests = Array.from({ length: 5 }, (_, i) => ({
        ...mockStickerData,
        vehiclePlate: `ABC ${i}`,
      }));

      for (const request of requests) {
        await stickerSyncService.queueStickerRequest(request);
      }

      // Some should sync immediately (when online)
      // Others should be queued (when offline)
      const syncedCount = connectivityStates.filter(state => state).length;
      expect(supabase.from).toHaveBeenCalledTimes(syncedCount);
    });
  });
});