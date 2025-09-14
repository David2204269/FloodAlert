"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useState } from "react"

export interface Alert {
  id: string
  type: "normal" | "alert" | "danger"
  message: string
  timestamp: string
  location: string
}

interface AlertPanelProps {
  alerts: Alert[]
}

const CheckCircleIcon = () => (
  <svg className="h-4 w-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
      clipRule="evenodd"
    />
  </svg>
)

const AlertTriangleIcon = () => (
  <svg className="h-4 w-4 text-secondary" fill="currentColor" viewBox="0 0 20 20">
    <path
      fillRule="evenodd"
      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
      clipRule="evenodd"
    />
  </svg>
)

const XCircleIcon = () => (
  <svg className="h-4 w-4 text-accent" fill="currentColor" viewBox="0 0 20 20">
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
      clipRule="evenodd"
    />
  </svg>
)

const ClockIcon = () => (
  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
      clipRule="evenodd"
    />
  </svg>
)

const EyeIcon = () => (
  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
)

const getAlertIcon = (type: string) => {
  switch (type) {
    case "normal":
      return <CheckCircleIcon />
    case "alert":
      return <AlertTriangleIcon />
    case "danger":
      return <XCircleIcon />
    default:
      return <ClockIcon />
  }
}

const getAlertColor = (type: string) => {
  switch (type) {
    case "normal":
      return "bg-primary/10 border-primary/20"
    case "alert":
      return "bg-secondary/10 border-secondary/20"
    case "danger":
      return "bg-accent/10 border-accent/20"
    default:
      return "bg-muted/10 border-muted/20"
  }
}

export function AlertPanel({ alerts }: AlertPanelProps) {
  // Generate more historical alerts for demonstration
  const allAlerts = [
    ...alerts,
    {
      id: "3",
      type: "normal" as const,
      message: "✅ Nivel de agua normalizado en Río Principal",
      timestamp: "1 hour ago",
      location: "Sensor A",
    },
    {
      id: "4",
      type: "alert" as const,
      message: "🟡 Incremento gradual en humedad del suelo",
      timestamp: "2 hours ago",
      location: "Sensor B",
    },
    {
      id: "5",
      type: "danger" as const,
      message: "🔴 Caudal crítico detectado - Evacuación recomendada",
      timestamp: "3 hours ago",
      location: "Sensor C",
    },
    {
      id: "6",
      type: "normal" as const,
      message: "✅ Sistema de sensores funcionando correctamente",
      timestamp: "4 hours ago",
      location: "Todos los sensores",
    },
  ]

  const [selectedAlert, setSelectedAlert] = useState<string | null>(null)

  const handleEmergencyContact = (service: string) => {
    const emergencyNumbers = {
      bomberos: "tel:119",
      policia: "tel:123",
      cruzroja: "tel:132",
    }

    const emergencyApps = {
      bomberos: "https://wa.me/119",
      policia: "https://wa.me/123",
      cruzroja: "https://wa.me/132",
    }

    // Try to open the phone app first
    if (emergencyNumbers[service as keyof typeof emergencyNumbers]) {
      window.location.href = emergencyNumbers[service as keyof typeof emergencyNumbers]
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3 md:pb-4">
        <CardTitle className="flex items-center space-x-2 text-base md:text-lg">
          <ClockIcon />
          <span className="hidden sm:inline">Historial de Alertas</span>
          <span className="sm:hidden">Alertas</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 md:p-6">
        <div className="space-y-3 md:space-y-4">
          {allAlerts.map((alert) => (
            <div key={alert.id} className={`p-3 md:p-4 rounded-lg border ${getAlertColor(alert.type)}`}>
              <div className="flex items-start space-x-2 md:space-x-3">
                <div className="flex-shrink-0 mt-0.5">{getAlertIcon(alert.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-pretty leading-relaxed">{alert.message}</p>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-2 space-y-2 sm:space-y-0">
                    <Badge variant="outline" className="text-xs w-fit">
                      {alert.location}
                    </Badge>
                    <div className="flex items-center justify-between sm:justify-end space-x-2">
                      <span className="text-xs text-muted-foreground">{alert.timestamp}</span>
                      {(alert.type === "alert" || alert.type === "danger") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedAlert(selectedAlert === alert.id ? null : alert.id)}
                          className="text-xs px-2 py-1 h-auto flex-shrink-0"
                        >
                          <EyeIcon />
                          <span className="ml-1 hidden sm:inline">Ver detalles</span>
                          <span className="ml-1 sm:hidden">Ver</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {selectedAlert === alert.id && (
                    <div className="mt-3 pt-3 border-t border-slate-200 bg-slate-50 rounded-lg p-2 md:p-3">
                      <h4 className="font-semibold text-xs md:text-sm mb-2">Detalles de la Alerta</h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex flex-col sm:flex-row sm:justify-between space-y-1 sm:space-y-0">
                          <span className="font-medium">ID de Alerta:</span>
                          <span className="text-slate-600">{alert.id}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between space-y-1 sm:space-y-0">
                          <span className="font-medium">Nivel de Riesgo:</span>
                          <Badge
                            className={`text-xs w-fit ${
                              alert.type === "danger"
                                ? "!bg-red-600 !text-white"
                                : alert.type === "alert"
                                  ? "!bg-yellow-600 !text-white"
                                  : "!bg-green-600 !text-white"
                            }`}
                          >
                            {alert.type.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between space-y-1 sm:space-y-0">
                          <span className="font-medium">Ubicación:</span>
                          <span className="text-slate-600">{alert.location}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between space-y-1 sm:space-y-0">
                          <span className="font-medium">Hora exacta:</span>
                          <span className="text-slate-600">{alert.timestamp}</span>
                        </div>
                        {alert.type === "danger" && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                            <p className="text-red-800 font-medium text-xs leading-relaxed mb-3">
                              ⚠️ Acción requerida: Contactar servicios de emergencia y considerar evacuación del área.
                            </p>
                            <div className="space-y-2">
                              <p className="text-red-700 font-semibold text-xs mb-2">Contactar Emergencias:</p>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleEmergencyContact("bomberos")}
                                  className="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 h-auto flex items-center justify-center space-x-1"
                                >
                                  <span>🚒</span>
                                  <span>Bomberos 119</span>
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleEmergencyContact("policia")}
                                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 h-auto flex items-center justify-center space-x-1"
                                >
                                  <span>👮</span>
                                  <span>Policía 123</span>
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleEmergencyContact("cruzroja")}
                                  className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 h-auto flex items-center justify-center space-x-1"
                                >
                                  <span>🏥</span>
                                  <span>Cruz Roja 132</span>
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                        {alert.type === "alert" && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                            <p className="text-yellow-800 font-medium text-xs leading-relaxed mb-3">
                              📋 Recomendación: Monitorear de cerca y preparar medidas preventivas.
                            </p>
                            <div className="space-y-2">
                              <p className="text-yellow-700 font-semibold text-xs mb-2">Contactos de Emergencia:</p>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleEmergencyContact("bomberos")}
                                  className="bg-orange-600 hover:bg-orange-700 text-white text-xs px-2 py-1 h-auto flex items-center justify-center space-x-1"
                                >
                                  <span>🚒</span>
                                  <span>Bomberos 119</span>
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleEmergencyContact("policia")}
                                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 h-auto flex items-center justify-center space-x-1"
                                >
                                  <span>👮</span>
                                  <span>Policía 123</span>
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleEmergencyContact("cruzroja")}
                                  className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 h-auto flex items-center justify-center space-x-1"
                                >
                                  <span>🏥</span>
                                  <span>Cruz Roja 132</span>
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
