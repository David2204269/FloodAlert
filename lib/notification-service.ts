export class NotificationService {
  private static instance: NotificationService
  private permission: NotificationPermission = 'default'

  private constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permission = Notification.permission
    }
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.log('[v0] Notifications not supported in this browser')
      return 'denied'
    }

    if (this.permission === 'granted') {
      return 'granted'
    }

    try {
      const permission = await Notification.requestPermission()
      this.permission = permission
      console.log('[v0] Notification permission:', permission)
      return permission
    } catch (error) {
      console.error('[v0] Error requesting notification permission:', error)
      return 'denied'
    }
  }

  async showNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (!('Notification' in window)) {
      console.log('[v0] Notifications not supported')
      return
    }

    if (this.permission !== 'granted') {
      const permission = await this.requestPermission()
      if (permission !== 'granted') {
        console.log('[v0] Notification permission denied')
        return
      }
    }

    try {
      // Check if service worker is available
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        // Use service worker for notifications
        const registration = await navigator.serviceWorker.ready
        await registration.showNotification(title, {
          badge: '/icon.svg',
          icon: '/images/rivex-logo.png',
          vibrate: [200, 100, 200],
          requireInteraction: true,
          ...options,
        })
      } else {
        // Fallback to regular notification
        new Notification(title, {
          badge: '/icon.svg',
          icon: '/images/rivex-logo.png',
          ...options,
        })
      }
      console.log('[v0] Notification shown:', title)
    } catch (error) {
      console.error('[v0] Error showing notification:', error)
    }
  }

  getPermission(): NotificationPermission {
    return this.permission
  }
}

export const notificationService = NotificationService.getInstance()
