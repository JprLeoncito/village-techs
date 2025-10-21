import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform, Alert } from 'react-native';
import { useState } from 'react';

// Background location task name
const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_TASK';

export interface LocationCoordinate {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

export interface GateLocation {
  id: string;
  name: string;
  coordinates: LocationCoordinate;
  radius: number; // meters
}

// Geolocation and Background Tracking Service
export class LocationService {
  private isTracking = false;
  private locationListeners: ((location: LocationCoordinate) => void)[] = [];
  private gateLocationListeners: ((isAtGate: boolean, distance?: number) => void)[] = [];
  private currentLocation: LocationCoordinate | null = null;
  private watchSubscription: Location.LocationSubscription | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      // Define background location task
      this.defineBackgroundTask();
      console.log('Location Service initialized');
    } catch (error) {
      console.error('Failed to initialize Location Service:', error);
    }
  }

  private defineBackgroundTask() {
    TaskManager.defineTask(BACKGROUND_LOCATION_TASK, ({ data, error }) => {
      if (error) {
        console.error('Background location task error:', error);
        return;
      }

      if (data) {
        const { locations } = data as { locations: Location.LocationObject[] };
        if (locations.length > 0) {
          const location = this.formatLocationData(locations[0]);
          this.handleLocationUpdate(location);
        }
      }
    });
  }

  // Request location permissions
  async requestPermissions(): Promise<boolean> {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== Location.PermissionStatus.GRANTED) {
        Alert.alert(
          'Permission Required',
          'Location permission is required to verify officer gate assignment.',
          [{ text: 'OK' }]
        );
        return false;
      }

      // Request background permission for shift tracking
      if (Platform.OS === 'android') {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== Location.PermissionStatus.GRANTED) {
          console.warn('Background location permission not granted');
          // Still continue with foreground tracking
        }
      }

      return true;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  // Start shift tracking with background location
  async startShiftTracking(gateId?: string, gateCoordinates?: LocationCoordinate) {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Location permission not granted');
      }

      this.isTracking = true;
      console.log('Starting shift tracking...');

      // Start foreground location updates
      this.watchSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced, // Balanced accuracy for battery life
          timeInterval: 300000, // Update every 5 minutes (300,000 ms)
          distanceInterval: 50, // Or when moved 50 meters
        },
        (location) => {
          const formattedLocation = this.formatLocationData(location);
          this.handleLocationUpdate(formattedLocation);
        }
      );

      // Start background tracking (Android only for now)
      if (Platform.OS === 'android') {
        await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 300000, // 5 minutes
          distanceInterval: 50, // 50 meters
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: 'Sentinel Shift Tracking',
            notificationBody: 'Location is being tracked for shift coverage and safety.',
            notificationColor: '#3b82f6',
          },
        });
        console.log('Background location tracking started');
      }

      console.log('Shift tracking started successfully');
    } catch (error) {
      console.error('Error starting shift tracking:', error);
      this.isTracking = false;
      throw error;
    }
  }

  // Stop shift tracking
  async stopShiftTracking() {
    try {
      this.isTracking = false;

      // Stop foreground watching
      if (this.watchSubscription) {
        this.watchSubscription.remove();
        this.watchSubscription = null;
      }

      // Stop background task
      const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
      if (isTaskRegistered) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }

      console.log('Shift tracking stopped');
    } catch (error) {
      console.error('Error stopping shift tracking:', error);
    }
  }

  // Verify if officer is at assigned gate
  async verifyAtGate(gateLocation: GateLocation): Promise<{ isAtGate: boolean; distance?: number }> {
    try {
      const currentLocation = await this.getCurrentLocation();
      if (!currentLocation) {
        throw new Error('Unable to get current location');
      }

      const distance = this.calculateDistance(
        currentLocation,
        gateLocation.coordinates
      );

      const isAtGate = distance <= gateLocation.radius;

      // Notify listeners
      this.gateLocationListeners.forEach(listener =>
        listener(isAtGate, distance)
      );

      console.log(`Gate verification: ${distance.toFixed(2)}m away, within ${gateLocation.radius}m: ${isAtGate}`);

      return { isAtGate, distance };
    } catch (error) {
      console.error('Error verifying gate location:', error);
      throw error;
    }
  }

  // Get current location
  async getCurrentLocation(): Promise<LocationCoordinate | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const formattedLocation = this.formatLocationData(location);
      this.currentLocation = formattedLocation;

      return formattedLocation;
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  // Handle location updates
  private handleLocationUpdate(location: LocationCoordinate) {
    this.currentLocation = location;

    // Notify all listeners
    this.locationListeners.forEach(listener => listener(location));

    // Log for debugging (in production, this would go to your analytics)
    console.log('Location update:', {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      timestamp: new Date(location.timestamp).toISOString(),
    });
  }

  // Format location data consistently
  private formatLocationData(location: Location.LocationObject): LocationCoordinate {
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      altitude: location.coords.altitude,
      altitudeAccuracy: location.coords.altitudeAccuracy,
      heading: location.coords.heading,
      speed: location.coords.speed,
      timestamp: location.timestamp,
    };
  }

  // Calculate distance between two coordinates using Haversine formula
  private calculateDistance(
    point1: LocationCoordinate,
    point2: LocationCoordinate
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(point2.latitude - point1.latitude);
    const dLon = this.toRadians(point2.longitude - point1.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.latitude)) *
        Math.cos(this.toRadians(point2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in meters

    return distance;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Event listener management
  onLocationChanged(listener: (location: LocationCoordinate) => void) {
    this.locationListeners.push(listener);
    return () => {
      this.locationListeners = this.locationListeners.filter(l => l !== listener);
    };
  }

  onGateLocationChanged(listener: (isAtGate: boolean, distance?: number) => void) {
    this.gateLocationListeners.push(listener);
    return () => {
      this.gateLocationListeners = this.gateLocationListeners.filter(l => l !== listener);
    };
  }

  // Getters
  getIsTracking(): boolean {
    return this.isTracking;
  }

  getCurrentLocationData(): LocationCoordinate | null {
    return this.currentLocation;
  }

  // Cleanup
  cleanup() {
    this.stopShiftTracking();
    this.locationListeners = [];
    this.gateLocationListeners = [];
  }
}

// Create singleton instance
export const locationService = new LocationService();

// React hook for gate verification
export const useGateVerification = () => {
  const [isAtGate, setIsAtGate] = useState(false);
  const [distance, setDistance] = useState<number | undefined>();
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifyLocation = async (gateLocation: GateLocation) => {
    try {
      setIsVerifying(true);
      setError(null);

      const result = await locationService.verifyAtGate(gateLocation);
      setIsAtGate(result.isAtGate);
      setDistance(result.distance);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify gate location';
      setError(errorMessage);
      throw error;
    } finally {
      setIsVerifying(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setIsVerifying(true);
      setError(null);

      const location = await locationService.getCurrentLocation();
      return location;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get current location';
      setError(errorMessage);
      throw error;
    } finally {
      setIsVerifying(false);
    }
  };

  return {
    isAtGate,
    distance,
    isVerifying,
    error,
    verifyLocation,
    getCurrentLocation,
  };
};