'use client'

import { useEffect, useState, useCallback } from 'react'
import { notificationService } from '@/lib/notification-service'

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsSupported('Notification' in window)
      if ('Notification' in window) {
        setPermission(Notification.permission)
      }
    }
  }, [])

  const requestPermission = useCallback(async () => {
    const newPermission = await notificationService.requestPermission()
    setPermission(newPermission)
    return newPermission
  }, [])

  const sendNotification = useCallback(
    async (title: string, options?: NotificationOptions) => {
      if (permission !== 'granted') {
        const newPermission = await requestPermission()
        if (newPermission !== 'granted') {
          return false
        }
      }
      await notificationService.showNotification(title, options)
      return true
    },
    [permission, requestPermission]
  )

  return {
    permission,
    isSupported,
    requestPermission,
    sendNotification,
  }
}
