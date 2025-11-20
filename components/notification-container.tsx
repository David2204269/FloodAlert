"use client"

import { useState, useEffect } from "react"
import { NotificationToast } from "./notification-toast"

interface Notification {
  id: string
  level: "warning" | "danger" | "critical"
  message: string
  sensorId: string
  timestamp: string
}

export function NotificationContainer() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectToAlertStream = () => {
      try {
        eventSource = new EventSource("/api/alerts-stream")

        eventSource.onopen = () => {
          console.log("[Alerts] Connected to stream")
          setIsConnected(true)
        }

        eventSource.onmessage = (event) => {
          try {
            const alert = JSON.parse(event.data)
            
            // Ignore system messages
            if (alert.type === 'connected' || alert.message?.includes('keep-alive')) {
              console.log("[Alerts] System message:", alert.message)
              return
            }

            const newNotification: Notification = {
              id: `${Date.now()}-${Math.random()}`,
              level: alert.level || "warning",
              message: alert.message || "Nueva alerta del sistema",
              sensorId: alert.sensorId || "unknown",
              timestamp: alert.timestamp || new Date().toLocaleTimeString(),
            }
            
            console.log("[Alerts] New alert received:", newNotification)
            setNotifications((prev) => [newNotification, ...prev].slice(0, 10))
          } catch (error) {
            console.warn("Error parsing alert message (might be keep-alive):", error)
          }
        }

        eventSource.onerror = (error) => {
          console.error("[Alerts] EventSource error:", error)
          setIsConnected(false)
          
          if (eventSource) {
            eventSource.close()
            eventSource = null
          }

          // Attempt to reconnect after 5 seconds
          reconnectTimeout = setTimeout(() => {
            console.log("[Alerts] Attempting to reconnect...")
            connectToAlertStream()
          }, 5000)
        }
      } catch (error) {
        console.error("[Alerts] Error creating EventSource:", error)
        setIsConnected(false)
        
        // Retry connection after delay
        reconnectTimeout = setTimeout(connectToAlertStream, 5000)
      }
    }

    connectToAlertStream()

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
      if (eventSource) {
        eventSource.close()
      }
      setIsConnected(false)
    }
  }, [])

  const handleCloseNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  return (
    <div className="fixed top-[160px] right-6 z-[999999999] pointer-events-none">
      <div className="pointer-events-auto space-y-3 max-w-sm w-[calc(100vw-2rem)] md:w-full">
        {notifications.map((notification) => (
          <NotificationToast
            key={notification.id}
            id={notification.id}
            level={notification.level}
            message={notification.message}
            sensorId={notification.sensorId}
            timestamp={notification.timestamp}
            onClose={handleCloseNotification}
          />
        ))}
      </div>
    </div>
  )
}
