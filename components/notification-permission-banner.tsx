'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useNotifications } from '@/hooks/use-notifications'

const BellIcon = () => (
  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
  </svg>
)

const XIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

export function NotificationPermissionBanner() {
  const { permission, isSupported, requestPermission } = useNotifications()
  const [isDismissed, setIsDismissed] = useState(false)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Check if banner was previously dismissed
    const dismissed = localStorage.getItem('notification-banner-dismissed')
    setIsDismissed(dismissed === 'true')
    setShowBanner(true)
  }, [])

  const handleEnable = async () => {
    const result = await requestPermission()
    if (result === 'granted') {
      setIsDismissed(true)
      localStorage.setItem('notification-banner-dismissed', 'true')
    }
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    localStorage.setItem('notification-banner-dismissed', 'true')
  }

  if (!showBanner || !isSupported || permission === 'granted' || isDismissed) {
    return null
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 p-4 bg-blue-50 border-blue-200 shadow-xl max-w-sm animate-in slide-in-from-bottom-5">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          <div className="p-2 bg-blue-100 rounded-lg">
            <BellIcon />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-blue-900 text-sm mb-1">Activa las notificaciones</h3>
          <p className="text-xs text-blue-700 mb-3 leading-relaxed">
            Recibe alertas instantáneas cuando se detecten situaciones de peligro o alerta de inundación.
          </p>
          <div className="flex space-x-2">
            <Button
              size="sm"
              onClick={handleEnable}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 h-auto"
            >
              Activar notificaciones
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 h-auto"
            >
              Ahora no
            </Button>
          </div>
        </div>
        <button onClick={handleDismiss} className="flex-shrink-0 text-blue-400 hover:text-blue-600">
          <XIcon />
        </button>
      </div>
    </Card>
  )
}
