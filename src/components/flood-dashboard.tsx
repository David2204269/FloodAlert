"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FloodMap } from "./flood-map"
import { SensorChart } from "./sensor-chart"
import { AlertPanel } from "./alert-panel"
import type { Alert } from "./alert-panel"

interface SensorData {
  id: string
  name: string
  location: { lat: number; lng: number }
  waterLevel: number
  flowRate: number
  soilMoisture: number
  riskLevel: "normal" | "alert" | "danger"
  lastUpdate: string
}

const INITIAL_SENSOR_DATA: SensorData[] = [
  {
    id: "1",
    name: "Río Principal - Sensor A",
    location: { lat: 40.7128, lng: -74.006 },
    waterLevel: 45,
    flowRate: 120,
    soilMoisture: 65,
    riskLevel: "normal",
    lastUpdate: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Zona Urbana - Sensor B",
    location: { lat: 40.7589, lng: -73.9851 },
    waterLevel: 78,
    flowRate: 180,
    soilMoisture: 85,
    riskLevel: "alert",
    lastUpdate: new Date().toISOString(),
  },
  {
    id: "3",
    name: "Área Industrial - Sensor C",
    location: { lat: 40.6892, lng: -74.0445 },
    waterLevel: 95,
    flowRate: 250,
    soilMoisture: 92,
    riskLevel: "danger",
    lastUpdate: new Date().toISOString(),
  },
]

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
  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
  </svg>
)

const WavesIcon = () => (
  <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M2 6s1.5-2 5-2 5 2 5 2 1.5-2 5-2v6s-1.5 2-5 2-5-2-5-2-1.5 2-5 2-5-2-5-2V6z"></path>
  </svg>
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
      className={`cursor-pointer transition-all duration-200 mb-3 ${
        isSelected
          ? "border-2 border-blue-500 shadow-lg scale-[1.02]"
          : "border border-slate-200 shadow-sm hover:shadow-md"
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-semibold text-sm text-slate-800 leading-tight">{sensor.name}</h3>
          <Badge className={getRiskColor(sensor.riskLevel)} variant="default">
            {getRiskIcon(sensor.riskLevel)}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs mb-2">
          <div className="flex items-center gap-1 text-blue-600">
            <DropletsIcon />
            <span className="font-medium">{sensor.waterLevel.toFixed(1)} cm</span>
          </div>
          <div className="flex items-center gap-1 text-green-600">
            <ActivityIcon />
            <span className="font-medium">{sensor.flowRate.toFixed(0)} L/s</span>
          </div>
          <div className="flex items-center gap-1 text-orange-600 col-span-2">
            <ThermometerIcon />
            <span className="font-medium">{sensor.soilMoisture.toFixed(0)}% humedad</span>
          </div>
        </div>

        <div className="text-xs text-slate-500 pt-2 border-t border-slate-100">
          {new Date(sensor.lastUpdate).toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  )
}

export function FloodDashboard() {
  const [sensors, setSensors] = useState<SensorData[]>(INITIAL_SENSOR_DATA)
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: "1",
      type: "danger",
      message: "⚠️ Alto riesgo de inundación en Área Industrial",
      timestamp: new Date().toISOString(),
      location: "Sensor C",
    },
    {
      id: "2",
      type: "alert",
      message: "🟡 Nivel de agua elevado en Zona Urbana",
      timestamp: new Date(Date.now() - 5 * 60000).toISOString(), // 5 minutes ago
      location: "Sensor B",
    },
  ])

  const [showNotifications, setShowNotifications] = useState(false)

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications)
  }

  useEffect(() => {
    let counter = 0;
    const interval = setInterval(() => {
      counter++;
      setSensors((prev) =>
        prev.map((sensor) => ({
          ...sensor,
          waterLevel: Math.max(0, sensor.waterLevel + Math.sin(counter * 0.1) * 2),
          flowRate: Math.max(0, sensor.flowRate + Math.sin(counter * 0.1) * 5),
          soilMoisture: Math.max(0, Math.min(100, sensor.soilMoisture + Math.sin(counter * 0.1) * 2)),
          lastUpdate: new Date().toISOString(),
        })),
      )
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const dangerSensors = sensors.filter((s) => s.riskLevel === "danger").length
  const alertSensors = sensors.filter((s) => s.riskLevel === "alert").length
  const normalSensors = sensors.filter((s) => s.riskLevel === "normal").length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <header className="border-b bg-white/80 backdrop-blur-md shadow-sm">
        <div className="flex h-16 md:h-20 items-center justify-between px-4 md:px-8">
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="p-1.5 md:p-2 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl shadow-lg">
              <WavesIcon />
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
              <Button
                variant="outline"
                size="sm"
                className="shadow-sm bg-transparent hidden sm:flex"
                onClick={handleNotificationClick}
              >
                <BellIcon />
                <span className="ml-2 hidden md:inline">Alertas ({alerts.length})</span>
                <span className="ml-2 md:hidden">({alerts.length})</span>
                {alerts.length > 0 && (
                  <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse"></div>
                )}
              </Button>
              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-slate-200 z-50 max-h-96 overflow-y-auto">
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
      {showNotifications && <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)}></div>}
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
                    <Badge className="bg-green-600 text-white shadow-sm text-sm">{normalSensors}</Badge>
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
                      <span className="font-semibold text-yellow-800 text-sm md:text-base">Alerta</span>
                    </div>
                    <Badge className="bg-yellow-600 text-white shadow-sm text-sm">{alertSensors}</Badge>
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
                      <span className="font-semibold text-red-800 text-sm md:text-base">Peligro</span>
                    </div>
                    <Badge className="bg-red-600 text-white shadow-sm text-sm">{dangerSensors}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          <div>
            <h2 className="text-base md:text-lg font-bold mb-3 md:mb-4 text-slate-800">Sensores Activos</h2>
            <div>
              {sensors.map((sensor) => (
                <SensorCard
                  key={sensor.id}
                  sensor={sensor}
                  isSelected={selectedSensor === sensor.id}
                  onClick={() => {
                    setSelectedSensor(sensor.id)
                    setIsMobileSidebarOpen(false)
                  }}
                />
              ))}
            </div>
          </div>
        </aside>
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <Tabs defaultValue="map" className="space-y-4 md:space-y-6">
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
                  <FloodMap sensors={sensors} selectedSensor={selectedSensor} onSensorSelect={setSelectedSensor} />
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
                    <SensorChart type="waterLevel" sensors={sensors} />
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
                    <SensorChart type="flowRate" sensors={sensors} />
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
                    <SensorChart type="soilMoisture" sensors={sensors} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3 md:pb-4">
                    <CardTitle className="text-base md:text-lg">Resumen de Riesgos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 md:space-y-4">
                      <div className="flex items-center justify-between p-2 md:p-3 rounded-lg bg-primary/10">
                        <span className="font-medium text-sm md:text-base">Sensores Normales</span>
                        <span className="text-xl md:text-2xl font-bold text-primary">{normalSensors}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 md:p-3 rounded-lg bg-secondary/10">
                        <span className="font-medium text-sm md:text-base">En Alerta</span>
                        <span className="text-xl md:text-2xl font-bold text-secondary">{alertSensors}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 md:p-3 rounded-lg bg-accent/10">
                        <span className="font-medium text-sm md:text-base">En Peligro</span>
                        <span className="text-xl md:text-2xl font-bold text-accent">{dangerSensors}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            <TabsContent value="alerts">
              <AlertPanel alerts={alerts} />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}
