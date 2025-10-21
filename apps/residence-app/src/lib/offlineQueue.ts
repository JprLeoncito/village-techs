import { supabase } from './supabase'
import AsyncStorage from '@react-native-async-storage/async-storage'
import NetInfo from '@react-native-community/netinfo'

interface QueuedAction {
  id: string
  type: 'sticker_request' | 'guest_schedule' | 'fee_payment' | 'household_update'
  data: any
  timestamp: number
  retries: number
}

export class OfflineQueue {
  private static readonly QUEUE_KEY = 'offline_action_queue'
  private static readonly MAX_RETRIES = 3

  static async addAction(type: QueuedAction['type'], data: any): Promise<void> {
    const action: QueuedAction = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      type,
      data,
      timestamp: Date.now(),
      retries: 0,
    }

    const queue = await this.getQueue()
    queue.push(action)
    await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue))
  }

  static async getQueue(): Promise<QueuedAction[]> {
    try {
      const queue = await AsyncStorage.getItem(this.QUEUE_KEY)
      return queue ? JSON.parse(queue) : []
    } catch {
      return []
    }
  }

  static async processQueue(): Promise<void> {
    const isConnected = (await NetInfo.fetch()).isConnected
    if (!isConnected) return

    const queue = await this.getQueue()
    const remaining: QueuedAction[] = []

    for (const action of queue) {
      try {
        await this.executeAction(action)
        // Action succeeded, don't add back to queue
      } catch (error) {
        console.error('Queue action failed:', error)
        action.retries++
        if (action.retries < this.MAX_RETRIES) {
          remaining.push(action)
        } else {
          console.warn(`Action ${action.id} failed after ${this.MAX_RETRIES} retries, discarding`)
        }
      }
    }

    await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(remaining))
  }

  static async clearQueue(): Promise<void> {
    await AsyncStorage.removeItem(this.QUEUE_KEY)
  }

  static getQueueLength(): Promise<number> {
    return this.getQueue().then(queue => queue.length)
  }

  private static async executeAction(action: QueuedAction): Promise<any> {
    switch (action.type) {
      case 'sticker_request':
        return await supabase.from('vehicle_sticker_requests').insert(action.data)
      case 'guest_schedule':
        return await supabase.from('guest_visits').insert(action.data)
      case 'fee_payment':
        return await supabase.from('fee_payments').insert(action.data)
      case 'household_update':
        return await supabase.from('households').update(action.data).eq('id', action.data.id)
      default:
        throw new Error(`Unknown action type: ${action.type}`)
    }
  }

  static async isConnected(): Promise<boolean> {
    const netInfo = await NetInfo.fetch()
    return netInfo.isConnected ?? false
  }

  static setupNetworkListener(callback: (isConnected: boolean) => void): () => void {
    const unsubscribe = NetInfo.addEventListener(state => {
      const isConnected = state.isConnected ?? false
      callback(isConnected)

      // Auto-process queue when connection is restored
      if (isConnected) {
        this.processQueue().catch(console.error)
      }
    })

    return unsubscribe
  }
}