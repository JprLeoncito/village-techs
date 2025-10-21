import NetInfo, { NetInfoState, NetInfoSubscription } from '@react-native-community/netinfo';

type NetworkStatusCallback = (isConnected: boolean, state: NetInfoState) => void;

class NetworkStatusService {
  private isOnline: boolean = true;
  private networkState: NetInfoState | null = null;
  private listeners: Set<NetworkStatusCallback> = new Set();
  private subscription: NetInfoSubscription | null = null;

  /**
   * Initialize network monitoring
   */
  async initialize() {
    // Get initial state
    const state = await NetInfo.fetch();
    this.handleNetworkChange(state);

    // Subscribe to network changes
    this.subscription = NetInfo.addEventListener(state => {
      this.handleNetworkChange(state);
    });

    return this.isOnline;
  }

  /**
   * Handle network state changes
   */
  private handleNetworkChange(state: NetInfoState) {
    const wasOnline = this.isOnline;
    this.isOnline = state.isConnected === true && state.isInternetReachable !== false;
    this.networkState = state;

    // Notify listeners if status changed
    if (wasOnline !== this.isOnline) {
      console.log(`Network status changed: ${this.isOnline ? 'ONLINE' : 'OFFLINE'}`);
      this.notifyListeners();
    }
  }

  /**
   * Add a listener for network status changes
   */
  addListener(callback: NetworkStatusCallback): () => void {
    this.listeners.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Remove a listener for network status changes
   */
  removeListener(callback: NetworkStatusCallback): void {
    this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of network status change
   */
  private notifyListeners() {
    this.listeners.forEach(callback => {
      if (this.networkState) {
        callback(this.isOnline, this.networkState);
      }
    });
  }

  /**
   * Get current online status
   */
  isConnected(): boolean {
    return this.isOnline;
  }

  /**
   * Get current network state
   */
  getNetworkState(): NetInfoState | null {
    return this.networkState;
  }

  /**
   * Get network type (wifi, cellular, none)
   */
  getNetworkType(): string {
    return this.networkState?.type || 'unknown';
  }

  /**
   * Check if on WiFi
   */
  isWifi(): boolean {
    return this.networkState?.type === 'wifi';
  }

  /**
   * Check if on cellular
   */
  isCellular(): boolean {
    return this.networkState?.type === 'cellular';
  }

  /**
   * Get connection quality (for cellular)
   */
  getConnectionQuality(): string {
    if (!this.isCellular() || !this.networkState) {
      return 'unknown';
    }

    const details = this.networkState.details as any;
    const effectiveType = details?.cellularGeneration;

    switch (effectiveType) {
      case '2g':
        return 'poor';
      case '3g':
        return 'fair';
      case '4g':
        return 'good';
      case '5g':
        return 'excellent';
      default:
        return 'unknown';
    }
  }

  /**
   * Check if connection is expensive (cellular data)
   */
  isExpensive(): boolean {
    if (!this.networkState) return false;

    const details = this.networkState.details as any;
    return this.isCellular() && !details?.isConnectionExpensive === false;
  }

  /**
   * Manually refresh network state
   */
  async refresh(): Promise<boolean> {
    const state = await NetInfo.fetch();
    this.handleNetworkChange(state);
    return this.isOnline;
  }

  /**
   * Wait for connection to be available
   */
  async waitForConnection(timeout: number = 30000): Promise<boolean> {
    if (this.isOnline) return true;

    return new Promise((resolve) => {
      const startTime = Date.now();

      const unsubscribe = this.addListener((isConnected) => {
        if (isConnected) {
          unsubscribe();
          resolve(true);
        } else if (Date.now() - startTime > timeout) {
          unsubscribe();
          resolve(false);
        }
      });

      // Check timeout
      setTimeout(() => {
        unsubscribe();
        resolve(this.isOnline);
      }, timeout);
    });
  }

  /**
   * Clean up subscriptions
   */
  cleanup() {
    if (this.subscription) {
      this.subscription();
      this.subscription = null;
    }
    this.listeners.clear();
  }
}

// Export singleton instance
export const networkStatus = new NetworkStatusService();
export default networkStatus;