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

  useEffect(() => {
    const eventSource = new EventSource("/api/alerts-stream")

    eventSource.onmessage = (event) => {
      try {
        const alert = JSON.parse(event.data)
        const newNotification: Notification = {
          id: `${Date.now()}-${Math.random()}`,
          level: alert.level,
          message: alert.message,
          sensorId: alert.sensorId,
          timestamp: alert.timestamp || new Date().toLocaleTimeString(),
        }
        
        console.log("[v0] New alert received:", newNotification)
        
        setNotifications((prev) => [newNotification, ...prev])
      } catch (error) {
        console.error("Error parsing alert:", error)
      }
    }

    eventSource.onerror = (error) => {
      console.error("EventSource error:", error)
      eventSource.close()
    }

    return () => {
      eventSource.close()
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
