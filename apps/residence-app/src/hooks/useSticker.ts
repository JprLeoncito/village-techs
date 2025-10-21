import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import stickerService, { StickerRequestData, StickerResult } from '../services/stickerService';
import stickerCacheService from '../services/stickerCacheService';
import stickerSyncService from '../services/stickerSyncService';
import stickerRealtimeService from '../services/stickerRealtimeService';
import networkStatus from '../lib/networkStatus';
import { Sticker } from '../database/models/Sticker';

/**
 * Custom hook for sticker operations
 */
export const useSticker = (stickerId?: string) => {
  const [sticker, setSticker] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (stickerId) {
      loadSticker();
    }
  }, [stickerId]);

  const loadSticker = async () => {
    if (!stickerId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await stickerService.getSticker(stickerId);
      setSticker(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sticker');
    } finally {
      setIsLoading(false);
    }
  };

  const createSticker = async (
    requestData: StickerRequestData,
    document?: any
  ): Promise<StickerResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await stickerService.createRequest(requestData, document);

      if (!result.success) {
        setError(result.error || 'Failed to create sticker');
      }

      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to create sticker';
      setError(error);
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  const renewSticker = async (existingStickerId: string): Promise<StickerResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await stickerService.requestRenewal(existingStickerId);

      if (!result.success) {
        setError(result.error || 'Failed to renew sticker');
      }

      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to renew sticker';
      setError(error);
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  const trackStatus = async (trackingId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await stickerService.trackStatus(trackingId);

      if (result.success) {
        return result.data;
      } else {
        setError(result.error || 'Failed to track status');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to track status');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const refresh = useCallback(() => {
    if (stickerId) {
      loadSticker();
    }
  }, [stickerId]);

  return {
    sticker,
    isLoading,
    error,
    createSticker,
    renewSticker,
    trackStatus,
    refresh,
  };
};

/**
 * Custom hook for sticker list operations
 */
export const useStickerList = (filter?: 'active' | 'expired' | 'expiring' | 'pending') => {
  const [stickers, setStickers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStickers();
  }, [filter]);

  const loadStickers = async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await stickerService.getStickers(filter);
      setStickers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stickers');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const refresh = useCallback(() => {
    loadStickers(true);
  }, [filter]);

  return {
    stickers,
    isLoading,
    isRefreshing,
    error,
    refresh,
  };
};

/**
 * Custom hook for sticker validation
 */
export const useStickerValidation = () => {
  const validatePlateNumber = (plate: string): { valid: boolean; error?: string } => {
    if (!plate || plate.trim().length === 0) {
      return { valid: false, error: 'Plate number is required' };
    }

    // Philippine plate number formats
    const plateRegex = /^[A-Z]{1,3}\s?\d{3,5}$|^[A-Z]{2}\s?\d{4}$/i;

    if (!plateRegex.test(plate.trim())) {
      return {
        valid: false,
        error: 'Invalid plate format. Use formats like: ABC 123, AB 1234'
      };
    }

    return { valid: true };
  };

  const validateVehicleInfo = (
    make: string,
    model: string,
    color: string,
    type: string
  ): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!make || make.trim().length < 2) {
      errors.push('Vehicle make must be at least 2 characters');
    }

    if (!model || model.trim().length < 2) {
      errors.push('Vehicle model must be at least 2 characters');
    }

    if (!color || color.trim().length < 3) {
      errors.push('Vehicle color must be at least 3 characters');
    }

    const validTypes = ['Car', 'SUV', 'Van', 'Motorcycle', 'Truck'];
    if (!type || !validTypes.includes(type)) {
      errors.push('Please select a valid vehicle type');
    }

    return { valid: errors.length === 0, errors };
  };

  const validateDocument = (
    document: any,
    maxSizeMB = 5
  ): { valid: boolean; error?: string } => {
    if (!document) {
      return { valid: false, error: 'Document is required' };
    }

    if (document.size) {
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (document.size > maxSizeBytes) {
        return {
          valid: false,
          error: `Document size must be less than ${maxSizeMB}MB`
        };
      }
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (document.type && !allowedTypes.includes(document.type)) {
      return {
        valid: false,
        error: 'Document must be JPG, PNG, or PDF format'
      };
    }

    return { valid: true };
  };

  const checkDuplicatePlate = async (
    plateNumber: string
  ): Promise<{ isDuplicate: boolean; error?: string }> => {
    try {
      const isDuplicate = await stickerService.checkDuplicatePlate(plateNumber);
      return { isDuplicate };
    } catch (err) {
      return {
        isDuplicate: false,
        error: err instanceof Error ? err.message : 'Failed to check duplicate'
      };
    }
  };

  const canRenew = (sticker: any): boolean => {
    if (!sticker) return false;
    return stickerCacheService.canRenew(sticker);
  };

  const needsRenewal = (sticker: any): boolean => {
    if (!sticker) return false;
    return stickerCacheService.needsRenewal(sticker);
  };

  return {
    validatePlateNumber,
    validateVehicleInfo,
    validateDocument,
    checkDuplicatePlate,
    canRenew,
    needsRenewal,
  };
};

/**
 * Custom hook for sticker sync operations
 */
export const useStickerSync = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    successful: number;
    failed: number;
    pending: number;
  }>({ successful: 0, failed: 0, pending: 0 });

  const syncPendingStickers = async () => {
    if (!networkStatus.isConnected()) {
      Alert.alert('No Internet', 'Please connect to the internet to sync your stickers');
      return false;
    }

    setIsSyncing(true);

    try {
      const result = await stickerSyncService.syncPendingRequests();

      setSyncStatus({
        successful: result.successful,
        failed: result.failed,
        pending: 0,
      });

      if (result.successful > 0) {
        Alert.alert(
          'Sync Complete',
          `Successfully synced ${result.successful} sticker${result.successful !== 1 ? 's' : ''}` +
          (result.failed > 0 ? `. ${result.failed} failed.` : ''),
          [{ text: 'OK' }]
        );
      }

      return true;
    } catch (err) {
      Alert.alert('Sync Failed', 'Failed to sync pending stickers. Please try again.');
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  const queueForSync = async (stickerData: any) => {
    try {
      const result = await stickerSyncService.queueStickerRequest(stickerData);

      if (result.success && result.queued) {
        setSyncStatus(prev => ({
          ...prev,
          pending: prev.pending + 1,
        }));
      }

      return result;
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to queue for sync'
      };
    }
  };

  return {
    isSyncing,
    syncStatus,
    syncPendingStickers,
    queueForSync,
  };
};

/**
 * Custom hook for sticker realtime updates
 */
export const useStickerRealtime = (stickerId?: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const initRealtime = async () => {
      await stickerRealtimeService.initialize({
        onStatusChange: (sticker) => {
          setLastUpdate(new Date());
        },
        onNewSticker: (sticker) => {
          setLastUpdate(new Date());
        },
      });

      setIsConnected(stickerRealtimeService.isConnected());
    };

    initRealtime();

    return () => {
      stickerRealtimeService.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!stickerId) return;

    let channel: any;

    const subscribeToSticker = async () => {
      channel = await stickerRealtimeService.subscribeToSticker(
        stickerId,
        (updatedSticker) => {
          setLastUpdate(new Date());
        }
      );
    };

    subscribeToSticker();

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [stickerId]);

  const reconnect = async () => {
    await stickerRealtimeService.initialize();
    setIsConnected(stickerRealtimeService.isConnected());
  };

  return {
    isConnected,
    lastUpdate,
    reconnect,
  };
};

/**
 * Custom hook for sticker statistics
 */
export const useStickerStats = () => {
  const [stats, setStats] = useState({
    active: 0,
    expiring: 0,
    expired: 0,
    pending: 0,
    rejected: 0,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);

    try {
      const stickerStats = await stickerCacheService.getStickerStats();
      setStats(stickerStats);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const refresh = useCallback(() => {
    loadStats();
  }, []);

  return {
    stats,
    isLoading,
    refresh,
  };
};

/**
 * Custom hook for network status
 */
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(networkStatus.isConnected());

  useEffect(() => {
    const listener = (connected: boolean) => {
      setIsOnline(connected);
    };

    networkStatus.addListener(listener);

    return () => {
      networkStatus.removeListener(listener);
    };
  }, []);

  return isOnline;
};