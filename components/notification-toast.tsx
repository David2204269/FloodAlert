"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface NotificationToastProps {
  id: string
  level: "warning" | "danger" | "critical"
  message: string
  sensorId: string
  timestamp: string
  onClose: (id: string) => void
}

const XIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const AlertIcon = () => (
  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
    <path
      fillRule="evenodd"
      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
      clipRule="evenodd"
    />
  </svg>
)

const getNotificationStyles = (level: string) => {
  switch (level) {
    case "warning":
      return {
        bg: "bg-yellow-50 border-yellow-200",
        icon: "text-yellow-600",
        badge: "bg-yellow-600",
        text: "text-yellow-900",
      }
    case "danger":
      return {
        bg: "bg-orange-50 border-orange-200",
        icon: "text-orange-600",
        badge: "bg-orange-600",
        text: "text-orange-900",
      }
    case "critical":
      return {
        bg: "bg-red-50 border-red-200",
        icon: "text-red-600",
        badge: "bg-red-600",
        text: "text-red-900",
      }
    default:
      return {
        bg: "bg-blue-50 border-blue-200",
        icon: "text-blue-600",
        badge: "bg-blue-600",
        text: "text-blue-900",
      }
  }
}

export function NotificationToast({ id, level, message, sensorId, timestamp, onClose }: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const styles = getNotificationStyles(level)

  useEffect(() => {
    // Fade in animation
    requestAnimationFrame(() => {
      setIsVisible(true)
    })

    // Auto-dismiss for non-critical alerts
    if (level !== "critical") {
      const timer = setTimeout(() => {
        handleClose()
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [level])

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => {
      onClose(id)
    }, 300)
  }

  return (
    <div
      className={`
        ${styles.bg} border-2 rounded-lg shadow-lg p-4 mb-3 
        transition-all duration-300 ease-in-out
        ${isVisible && !isExiting ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full"}
        max-w-sm w-full
      `}
    >
      <div className="flex items-start space-x-3">
        <div className={`flex-shrink-0 ${styles.icon}`}>
          <AlertIcon />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <Badge className={`${styles.badge} text-white text-xs`}>{level.toUpperCase()}</Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-white/50"
              onClick={handleClose}
            >
              <XIcon />
            </Button>
          </div>
          <p className={`text-sm font-medium ${styles.text} leading-relaxed mb-2`}>{message}</p>
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>Sensor: {sensorId}</span>
            <span>{timestamp}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
