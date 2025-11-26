"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FloodMap } from "./flood-map"
import { SensorChart } from "./sensor-chart"
import { AlertPanel } from "./alert-panel"
import { WaterSegmentation } from "./water-segmentation"
import { useNotifications } from "@/hooks/use-notifications"

interface SensorData {
  id: string
  name: string
  location: { lat: number; lng: number }
  waterLevel: number
  flowRate: number
  soilMoisture: number
  temperature: number
  precipitation: number
  riskLevel: "normal" | "alert" | "danger"
  lastUpdate: string
  createdAt?: string
}

interface RiskCounts {
  normal: number
  alert: number
  danger: number
}

// Umbrales de alerta definidos
const THRESHOLDS = {
  waterLevel: { // en cm
    alert: 3,
    danger: 3, // Sensor solo lee 0 o 3, así que 3 = peligro directo
  },
  flowRate: { // en L/s
    alert: 1,
    danger: 2,
  },
  soilMoisture: { // en %
    alert: 60,
    danger: 90,
  },
  // Temperatura y precipitación: siempre normal
  temperature: {
    alert: Infinity,
    danger: Infinity,
  },
  precipitation: {
    alert: Infinity,
    danger: Infinity,
  },
}

/**
 * Determina el nivel de riesgo de una lectura basado en los umbrales
 */
function calculateRiskLevel(lectura: any): "normal" | "alert" | "danger" {
  const nivelCm = (parseFloat(lectura.nivel_m) || 0) * 100 // Convertir m a cm
  const caudal = parseFloat(lectura.caudal_l_s) || 0
  const humedad = parseFloat(lectura.humedad_pct) || 0

  // Verificar peligro primero (prioridad más alta)
  if (
    nivelCm >= THRESHOLDS.waterLevel.danger &&
    caudal >= THRESHOLDS.flowRate.danger &&
    humedad >= THRESHOLDS.soilMoisture.danger
  ) {
    return "danger"
  }

  // Verificar alerta
  if (
    nivelCm >= THRESHOLDS.waterLevel.alert &&
    caudal >= THRESHOLDS.flowRate.alert &&
    humedad >= THRESHOLDS.soilMoisture.alert
  ) {
    return "alert"
  }

  return "normal"
}

const CheckCircleIcon = () => (
  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
      clipRule="evenodd"
    />
  </svg>
)

const AlertTriangleIcon = () => (
  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
    <path
      fillRule="evenodd"
      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
      clipRule="evenodd"
    />
  </svg>
)

const XCircleIcon = () => (
  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zm8.707-7.293a1 1 0 00-1.414 1.414L10 10.586l-1.293 1.293a1 1 0 001.414 1.414L10 11.414l1.293-1.293a1 1 0 00-1.414-1.414z"
      clipRule="evenodd"
    />
  </svg>
)

const ActivityIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"></polyline>
  </svg>
)

const DropletsIcon = () => (
  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 2s-4 4.5-4 8a4 4 0 008 0c0-3.5-4-8-4-8z" clipRule="evenodd" />
  </svg>
)

const ThermometerIcon = () => (
  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"></path>
  </svg>
)

const BellIcon = () => (
  null
)

const MapPinIcon = () => (
  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
    <path
      fillRule="evenodd"
      d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
      clipRule="evenodd"
    />
  </svg>
)

const TrendingUpIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
    <polyline points="17 6 23 6 23 12"></polyline>
  </svg>
)

const CloudRainIcon = () => (
  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14M7 7v10M17 7v10" />
  </svg>
)

const getRiskColor = (level: string) => {
  switch (level) {
    case "normal":
      return "!bg-green-600 !text-white !border-green-600"
    case "alert":
      return "!bg-yellow-600 !text-white !border-yellow-600"
    case "danger":
      return "!bg-red-600 !text-white !border-red-600"
    default:
      return "!bg-slate-600 !text-white !border-slate-600"
  }
}

const getRiskIcon = (level: string) => {
  switch (level) {
    case "normal":
      return <CheckCircleIcon />
    case "alert":
      return <AlertTriangleIcon />
    case "danger":
      return <XCircleIcon />
    default:
      return <ActivityIcon />
  }
}

const SensorCard = ({
  sensor,
  isSelected,
  onClick,
}: {
  sensor: SensorData
  isSelected: boolean
  onClick: () => void
}) => {
  return (
    <Card
      className={`cursor-pointer transition-all duration-200 mb-3 sensor-name-override ${isSelected
        ? "border-2 border-blue-500 shadow-lg scale-[1.02]"
        : "border border-slate-200 shadow-sm hover:shadow-md"
        }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-semibold text-sm text-slate-800 leading-tight sensor-name-text">Estación</h3>
          <Badge className={getRiskColor(sensor.riskLevel)} variant="default">
            {getRiskIcon(sensor.riskLevel)}
          </Badge>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-1.5 text-blue-700">
              <DropletsIcon />
              <span className="font-medium">Nivel de agua</span>
            </div>
            <span className="font-bold text-blue-900">{sensor.waterLevel.toFixed(1)} cm</span>
          </div>

          <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
            <div className="flex items-center gap-1.5 text-green-700">
              <ActivityIcon />
              <span className="font-medium">Caudal</span>
            </div>
            <span className="font-bold text-green-900">{sensor.flowRate.toFixed(0)} L/s</span>
          </div>

          <div className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
            <div className="flex items-center gap-1.5 text-orange-700">
              <ThermometerIcon />
              <span className="font-medium">Humedad</span>
            </div>
            <span className="font-bold text-orange-900">{sensor.soilMoisture.toFixed(0)}%</span>
          </div>

          <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
            <div className="flex items-center gap-1.5 text-red-700">
              <ThermometerIcon />
              <span className="font-medium">Temperatura</span>
            </div>
            <span className="font-bold text-red-900">{sensor.temperature.toFixed(1)}°C</span>
          </div>

          <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg">
            <div className="flex items-center gap-1.5 text-purple-700">
              <CloudRainIcon />
              <span className="font-medium">Precipitación</span>
            </div>
            <span className="font-bold text-purple-900">{sensor.precipitation.toFixed(1)} mm</span>
          </div>
        </div>

        <div className="text-xs text-slate-500 pt-2 border-t border-slate-100 mt-2">{sensor.lastUpdate}</div>
      </CardContent>
    </Card>
  )
}

export function FloodDashboard() {
  const [sensors, setSensors] = useState<SensorData[]>([])
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("map")
  const [alerts, setAlerts] = useState<Array<{
    id: string
    type: "normal" | "alert" | "danger"
    message: string
    timestamp: string
    location: string
  }>>([])

  const [showNotifications, setShowNotifications] = useState(false)

  const { sendNotification, permission } = useNotifications()
  const previousAlertsRef = useRef<typeof alerts>([])

  // Estado para contadores de riesgo globales (basado en todas las lecturas)
  const [riskCounts, setRiskCounts] = useState<RiskCounts>({ normal: 0, alert: 0, danger: 0 })

  // Función para obtener datos de la API
  const fetchSensorData = async () => {
    try {
      const response = await fetch('/api/sensores')
      const result = await response.json()

      if (result.ok && result.data) {
        // Asegurar orden por fecha (descendente) para que la primera lectura sea la más reciente
        result.data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

        // Contar lecturas por nivel de riesgo
        const counts: RiskCounts = { normal: 0, alert: 0, danger: 0 }
        
        result.data.forEach((lectura: any) => {
          const risk = calculateRiskLevel(lectura)
          counts[risk]++
        })
        
        setRiskCounts(counts)

        // Transformar los datos de Supabase al formato del dashboard
        const transformedData: SensorData[] = result.data.map((lectura: any, index: number) => {
          const temp = parseFloat(lectura.temperatura_c) || 0
          const nivel = parseFloat(lectura.nivel_m) || 0
          const caudal = parseFloat(lectura.caudal_l_s) || 0

          // Usar la función de clasificación centralizada
          const riskLevel = calculateRiskLevel(lectura)

          return {
            id: lectura.id?.toString() || `sensor-${index}`,
            name: `Sensor ${lectura.seq || index + 1}`,
            location: { lat: 7.355329655761653, lng: -73.9032701646408 }, // Ubicación por defecto
            waterLevel: nivel * 100, // Convertir metros a cm
            flowRate: caudal,
            soilMoisture: lectura.humedad_pct || 0,
            temperature: temp,
            precipitation: lectura.lluvia_mm || 0,
            riskLevel,
            lastUpdate: lectura.created_at
              ? new Date(lectura.created_at).toLocaleString('es-ES')
              : 'Hace un momento',
            createdAt: lectura.created_at || undefined,
          }
        })

        setSensors(transformedData)
      }
    } catch (error) {
      console.error('Error al obtener datos de sensores:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Cargar datos al montar el componente
  useEffect(() => {
    fetchSensorData()

    // Actualizar cada 10 segundos
    const interval = setInterval(fetchSensorData, 10000)

    return () => clearInterval(interval)
  }, [])

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications)
  }

  const handleSensorSelect = (sensorId: string) => {
    if (selectedSensor === sensorId) {
      setSelectedSensor(null)
    } else {
      setSelectedSensor(sensorId)
    }
  }

  useEffect(() => {
    if (permission !== 'granted' || previousAlertsRef.current.length === 0) {
      previousAlertsRef.current = alerts
      return
    }

    const newAlerts = alerts.filter(
      (alert) =>
        (alert.type === 'danger' || alert.type === 'alert') &&
        !previousAlertsRef.current.some((prev) => prev.id === alert.id)
    )

    newAlerts.forEach((alert) => {
      const isDanger = alert.type === 'danger'
      sendNotification(
        isDanger ? '🚨 ALERTA DE PELIGRO' : '⚠️ ALERTA DE PRECAUCIÓN',
        {
          body: alert.message,
          tag: `alert-${alert.id}`,
          requireInteraction: isDanger,
        }
      )
    })

    previousAlertsRef.current = alerts
  }, [alerts, sendNotification, permission])

  useEffect(() => {
    sensors.forEach((sensor) => {
      if (sensor.riskLevel === 'danger' || sensor.riskLevel === 'alert') {
        const existingAlert = alerts.find(
          (alert) =>
            alert.id.includes(sensor.id) &&
            ((sensor.riskLevel === 'danger' && alert.type === 'danger') ||
              (sensor.riskLevel === 'alert' && alert.type === 'alert'))
        )

        if (!existingAlert) {
          const newAlert = {
            id: `sensor-${sensor.id}-${Date.now()}`,
            type: sensor.riskLevel as 'alert' | 'danger',
            message:
              sensor.riskLevel === 'danger'
                ? `Nivel crítico detectado - Nivel: ${sensor.waterLevel.toFixed(1)} cm, Caudal: ${sensor.flowRate.toFixed(0)} L/s`
                : `Nivel elevado detectado - Nivel: ${sensor.waterLevel.toFixed(1)} cm, Caudal: ${sensor.flowRate.toFixed(0)} L/s`,
            timestamp: new Date().toLocaleString('es-ES', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            }),
            location: 'Estación Rivex',
          }

          setAlerts((prev) => [newAlert, ...prev])
        }
      }
    })
  }, [sensors, alerts])

  // Contadores para el Estado General (basado en todas las lecturas)
  const normalCount = riskCounts.normal
  const alertCount = riskCounts.alert
  const dangerCount = riskCounts.danger

  // Contadores alternativos por sensor único (para referencia)
  const dangerSensors = sensors.filter((s) => s.riskLevel === "danger").length
  const alertSensors = sensors.filter((s) => s.riskLevel === "alert").length
  const normalSensors = sensors.filter((s) => s.riskLevel === "normal").length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <header className="border-b bg-white/80 backdrop-blur-md shadow-sm">
        <div className="flex h-16 md:h-20 items-center justify-between px-4 md:px-8">
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="flex items-center space-x-2">
              <img src="/images/rivex-logo.png" alt="Rivex Logo" className="h-8 w-8 object-contain md:h-16 md:w-16" />
            </div>
            <div>
              <h1 className="text-lg md:text-2xl font-bold text-balance bg-gradient-to-r from-slate-800 to-blue-800 bg-clip-text text-transparent">
                Sistema de Alerta de Inundaciones
              </h1>
              <p className="text-xs md:text-sm text-slate-600 hidden sm:block">Monitoreo en tiempo real</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 md:space-x-4">
            <Button
              variant="outline"
              size="sm"
              className="md:hidden shadow-sm bg-transparent"
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
            <div className="relative">

              {showNotifications && (
                <div className="fixed top-[90px] right-8 w-80 bg-white rounded-lg shadow-xl border border-slate-200 z-[99999] max-h-96 overflow-y-auto">
                  <div className="p-4 border-b border-slate-200">
                    <h3 className="font-semibold text-slate-800">Notificaciones Activas</h3>
                  </div>
                  <div className="p-2">
                    {alerts.length === 0 ? (
                      <div className="p-4 text-center text-slate-500 text-sm">No hay alertas activas</div>
                    ) : (
                      alerts.map((alert) => (
                        <div
                          key={alert.id}
                          className="p-3 hover:bg-slate-50 rounded-lg cursor-pointer border-b border-slate-100 last:border-b-0"
                        >
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 mt-0.5">
                              {alert.type === "danger" ? (
                                <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                              ) : (
                                <div className="h-2 w-2 bg-yellow-500 rounded-full"></div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800 leading-relaxed">{alert.message}</p>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-xs text-slate-500">{alert.location}</span>
                                <span className="text-xs text-slate-500">{alert.timestamp}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-3 border-t border-slate-200">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs bg-transparent"
                      onClick={() => {
                        setShowNotifications(false)
                        const alertsTab = document.querySelector('[value="alerts"]') as HTMLElement
                        if (alertsTab) alertsTab.click()
                      }}
                    >
                      Ver todas las alertas
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="hidden sm:flex items-center space-x-2 bg-green-50 px-2 md:px-3 py-1 md:py-2 rounded-full">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs md:text-sm font-medium text-green-700 hidden md:inline">Sistema activo</span>
              <span className="text-xs font-medium text-green-700 md:hidden">Activo</span>
            </div>
          </div>
        </div>
      </header>
      {showNotifications && <div className="fixed inset-0 z-[9998]" onClick={() => setShowNotifications(false)}></div>}
      <div className="flex relative">
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileSidebarOpen(false)} />
        )}
        <aside
          className={`
            ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}
            md:translate-x-0 fixed md:relative z-50 md:z-auto
            w-80 md:w-80 lg:w-96 bg-white/60 backdrop-blur-sm border-r border-white/20 
            p-4 md:p-6 space-y-4 md:space-y-6 transition-transform duration-300 ease-in-out
            h-screen md:h-auto overflow-y-auto
          `}
        >
          <div className="flex justify-between items-center md:hidden mb-4">
            <h2 className="text-lg font-bold text-slate-800">Panel de Control</h2>
            <Button variant="ghost" size="sm" onClick={() => setIsMobileSidebarOpen(false)} className="p-1">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
          <div>
            <h2 className="text-base md:text-lg font-bold mb-3 md:mb-4 text-slate-800">Estado General</h2>
            <p className="text-xs text-slate-500 mb-2">Clasificación de todas las lecturas</p>
            <div className="grid gap-2 md:gap-3">
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 md:space-x-3">
                      <div className="p-1.5 md:p-2 bg-green-100 rounded-lg">
                        <CheckCircleIcon />
                      </div>
                      <span className="font-semibold text-green-800 text-sm md:text-base">Normal</span>
                    </div>
                    <Badge className="bg-green-600 text-white shadow-sm text-sm">{normalCount}</Badge>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 md:space-x-3">
                      <div className="p-1.5 md:p-2 bg-yellow-100 rounded-lg">
                        <AlertTriangleIcon />
                      </div>
                      <div>
                        <span className="font-semibold text-yellow-800 text-sm md:text-base">Precaución</span>
                        <p className="text-[10px] text-yellow-600">Nivel≥3cm, Caudal≥1L/s, Hum≥60%</p>
                      </div>
                    </div>
                    <Badge className="bg-yellow-600 text-white shadow-sm text-sm">{alertCount}</Badge>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 md:space-x-3">
                      <div className="p-1.5 md:p-2 bg-red-100 rounded-lg">
                        <XCircleIcon />
                      </div>
                      <div>
                        <span className="font-semibold text-red-800 text-sm md:text-base">Crítico</span>
                        <p className="text-[10px] text-red-600">Nivel≥3cm, Caudal≥2L/s, Hum≥90%</p>
                      </div>
                    </div>
                    <Badge className="bg-red-600 text-white shadow-sm text-sm">{dangerCount}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          <div>
            <h2 className="text-base md:text-lg font-bold mb-3 md:mb-4 text-slate-800">Último Registro</h2>
            <div>
              {/* Mostrar solo el primer elemento (más reciente) ya que la API ordena por created_at DESC */}
              {sensors.length > 0 && (
                <SensorCard
                  key={sensors[0].id}
                  sensor={sensors[0]}
                  isSelected={selectedSensor === sensors[0].id}
                  onClick={() => {
                    handleSensorSelect(sensors[0].id)
                    setIsMobileSidebarOpen(false)
                  }}
                />
              )}
              {sensors.length === 0 && !isLoading && (
                <Card className="bg-white/80 border-slate-200">
                  <CardContent className="p-4 text-center text-slate-500">
                    No hay datos disponibles
                  </CardContent>
                </Card>
              )}
              {isLoading && (
                <Card className="bg-white/80 border-slate-200">
                  <CardContent className="p-4 text-center text-slate-500">
                    Cargando datos en tiempo real...
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </aside>
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <Tabs defaultValue="map" value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
            <TabsList className="bg-white/80 backdrop-blur-sm shadow-sm w-full md:w-auto">
              <TabsTrigger
                value="map"
                className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-xs md:text-sm"
              >
                <span className="hidden sm:inline">Mapa Interactivo</span>
                <span className="sm:hidden">Mapa</span>
              </TabsTrigger>
              <TabsTrigger
                value="charts"
                className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-xs md:text-sm"
              >
                <span className="hidden sm:inline">Gráficos</span>
                <span className="sm:hidden">Datos</span>
              </TabsTrigger>
              <TabsTrigger
                value="alerts"
                className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-xs md:text-sm"
              >
                <span className="hidden sm:inline">Historial de Alertas</span>
                <span className="sm:hidden">Alertas</span>
              </TabsTrigger>
              <TabsTrigger
                value="segmentation"
                className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-xs md:text-sm"
              >
                <span className="hidden sm:inline">Segmentación de Agua</span>
                <span className="sm:hidden">Segmentación</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="map" className="space-y-4 md:space-y-6">
              <Card className="bg-white shadow-xl border border-slate-200">
                <CardHeader className="pb-3 md:pb-4">
                  <CardTitle className="flex items-center space-x-2 md:space-x-3">
                    <div className="p-1.5 md:p-2 bg-blue-100 rounded-lg">
                      <MapPinIcon />
                    </div>
                    <span className="text-lg md:text-xl font-bold text-slate-800">
                      <span className="hidden md:inline">Mapa de Sensores en Tiempo Real</span>
                      <span className="md:hidden">Sensores en Tiempo Real</span>
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2 md:p-6">
                  <FloodMap sensors={sensors} selectedSensor={selectedSensor} onSensorSelect={handleSensorSelect} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="charts" className="space-y-4 md:space-y-6">
              <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
                <Card>
                  <CardHeader className="pb-3 md:pb-4">
                    <CardTitle className="flex items-center space-x-2 text-base md:text-lg">
                      <TrendingUpIcon />
                      <span className="hidden sm:inline">Nivel de Agua (últimas 24h)</span>
                      <span className="sm:hidden">Nivel de Agua</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SensorChart type="waterLevel" sensors={sensors} isActive={activeTab === "charts"} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3 md:pb-4">
                    <CardTitle className="flex items-center space-x-2 text-base md:text-lg">
                      <ActivityIcon />
                      <span className="hidden sm:inline">Caudal (últimas 24h)</span>
                      <span className="sm:hidden">Caudal</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SensorChart type="flowRate" sensors={sensors} isActive={activeTab === "charts"} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3 md:pb-4">
                    <CardTitle className="flex items-center space-x-2 text-base md:text-lg">
                      <ThermometerIcon />
                      <span className="hidden sm:inline">Humedad del Suelo (últimas 24h)</span>
                      <span className="sm:hidden">Humedad</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SensorChart type="soilMoisture" sensors={sensors} isActive={activeTab === "charts"} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3 md:pb-4">
                    <CardTitle className="flex items-center space-x-2 text-base md:text-lg">
                      <ThermometerIcon />
                      <span className="hidden sm:inline">Temperatura (últimas 24h)</span>
                      <span className="sm:hidden">Temperatura</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SensorChart type="temperature" sensors={sensors} isActive={activeTab === "charts"} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3 md:pb-4">
                    <CardTitle className="flex items-center space-x-2 text-base md:text-lg">
                      <CloudRainIcon />
                      <span className="hidden sm:inline">Precipitación (últimas 24h)</span>
                      <span className="sm:hidden">Precipitación</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SensorChart type="precipitation" sensors={sensors} isActive={activeTab === "charts"} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3 md:pb-4">
                    <CardTitle className="text-base md:text-lg">Resumen de Riesgos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 md:space-y-4">
                      <div className="flex items-center justify-between p-2 md:p-3 rounded-lg bg-green-50">
                        <span className="font-medium text-sm md:text-base text-green-800">Sensores Normales</span>
                        <span className="text-xl md:text-2xl font-bold text-green-600">{normalSensors}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 md:p-3 rounded-lg bg-yellow-50">
                        <span className="font-medium text-sm md:text-base text-yellow-800">Sensores en Alerta</span>
                        <span className="text-xl md:text-2xl font-bold text-yellow-600">{alertSensors}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 md:p-3 rounded-lg bg-red-50">
                        <span className="font-medium text-sm md:text-base text-red-800">Sensores en Peligro</span>
                        <span className="text-xl md:text-2xl font-bold text-red-600">{dangerSensors}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            <TabsContent value="alerts" className="space-y-4 md:space-y-6">
              <Card className="bg-white shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl">Historial de Alertas</CardTitle>
                </CardHeader>
                <CardContent>
                  <AlertPanel alerts={alerts} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="segmentation" className="space-y-4 md:space-y-6">
              <Card className="bg-white shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl">Segmentación de Agua</CardTitle>
                </CardHeader>
                <CardContent>
                  <WaterSegmentation />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}
