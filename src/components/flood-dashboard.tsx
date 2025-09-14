"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FloodMap } from "./flood-map"
import { SensorChart } from "./sensor-chart"
import { AlertPanel } from "./alert-panel"

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

const mockSensorData: SensorData[] = [
  {
    id: "1",
    name: "Río Principal - Sensor A",
    location: { lat: 40.7128, lng: -74.006 },
    waterLevel: 45,
    flowRate: 120,
    soilMoisture: 65,
    riskLevel: "normal",
    lastUpdate: "2 min ago",
  },
  {
    id: "2",
    name: "Zona Urbana - Sensor B",
    location: { lat: 40.7589, lng: -73.9851 },
    waterLevel: 78,
    flowRate: 180,
    soilMoisture: 85,
    riskLevel: "alert",
    lastUpdate: "1 min ago",
  },
  {
    id: "3",
    name: "Área Industrial - Sensor C",
    location: { lat: 40.6892, lng: -74.0445 },
    waterLevel: 95,
    flowRate: 250,
    soilMoisture: 92,
    riskLevel: "danger",
    lastUpdate: "30 sec ago",
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
      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
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
    <path d="M2 6s1.5-2 5-2 5 2 5 2 1.5-2 5-2 5 2 5 2v6s-1.5 2-5 2-5-2-5-2-1.5 2-5 2-5-2-5-2V6z"></path>
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
    <div
      onClick={onClick}
      style={{
        cursor: "pointer",
        transition: "all 0.2s",
        backgroundColor: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        padding: "16px",
        boxShadow: isSelected
          ? "0 0 0 2px #3b82f6, 0 10px 15px -3px rgba(0, 0, 0, 0.1)"
          : "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
        transform: isSelected ? "scale(1.02)" : "scale(1)",
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.transform = "scale(1.01)"
          e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.transform = "scale(1)"
          e.currentTarget.style.boxShadow = "0 1px 3px 0 rgba(0, 0, 0, 0.1)"
        }
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px" }}>
        <p
          className="sensor-name-text"
          style={{
            fontWeight: "600",
            fontSize: "14px",
            color: "#000000 !important",
            margin: "0",
            lineHeight: "1.25",
            backgroundColor: "transparent !important",
          }}
        >
          {sensor.name}
        </p>
        <Badge className={`${getRiskColor(sensor.riskLevel)} shadow-sm`}>{getRiskIcon(sensor.riskLevel)}</Badge>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#2563eb" }}>
          <DropletsIcon />
          <span style={{ fontWeight: "500" }}>{sensor.waterLevel.toFixed(1)} cm</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#16a34a" }}>
          <ActivityIcon />
          <span style={{ fontWeight: "500" }}>{sensor.flowRate.toFixed(0)} L/s</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#ea580c", gridColumn: "span 2" }}>
          <ThermometerIcon />
          <span style={{ fontWeight: "500" }}>{sensor.soilMoisture.toFixed(0)}% humedad</span>
        </div>
      </div>
      <div
        style={{
          fontSize: "12px",
          color: "#64748b",
          marginTop: "8px",
          paddingTop: "8px",
          borderTop: "1px solid #e2e8f0",
        }}
      >
        {sensor.lastUpdate}
      </div>
    </div>
  )
}

export function FloodDashboard() {
  const [sensors, setSensors] = useState<SensorData[]>(mockSensorData)
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null)
  const [alerts, setAlerts] = useState([
    {
      id: "1",
      type: "danger",
      message: "⚠️ Alto riesgo de inundación en Área Industrial",
      timestamp: "2 min ago",
      location: "Sensor C",
    },
    {
      id: "2",
      type: "alert",
      message: "🟡 Nivel de agua elevado en Zona Urbana",
      timestamp: "5 min ago",
      location: "Sensor B",
    },
  ])

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setSensors((prev) =>
        prev.map((sensor) => ({
          ...sensor,
          waterLevel: Math.max(0, sensor.waterLevel + (Math.random() - 0.5) * 5),
          flowRate: Math.max(0, sensor.flowRate + (Math.random() - 0.5) * 20),
          soilMoisture: Math.max(0, Math.min(100, sensor.soilMoisture + (Math.random() - 0.5) * 10)),
          lastUpdate: "Just now",
        })),
      )
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const dangerSensors = sensors.filter((s) => s.riskLevel === "danger").length
  const alertSensors = sensors.filter((s) => s.riskLevel === "alert").length
  const normalSensors = sensors.filter((s) => s.riskLevel === "normal").length

  return (
    <>
      <style jsx>{`
        .sensor-name-text {
          color: #000000 !important;
          background-color: transparent !important;
        }
        .sensor-name-text * {
          color: #000000 !important;
          background-color: transparent !important;
        }
      `}</style>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
        <header className="border-b bg-white/80 backdrop-blur-md shadow-sm">
          <div className="flex h-20 items-center justify-between px-8">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl shadow-lg">
                <WavesIcon />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-balance bg-gradient-to-r from-slate-800 to-blue-800 bg-clip-text text-transparent">
                  Sistema de Alerta de Inundaciones
                </h1>
                <p className="text-sm text-slate-600">Monitoreo en tiempo real</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" className="shadow-sm bg-transparent">
                <BellIcon />
                <span className="ml-2">Alertas ({alerts.length})</span>
              </Button>
              <div className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-full">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-700">Sistema activo</span>
              </div>
            </div>
          </div>
        </header>

        {dangerSensors > 0 && (
          <div className="m-6">
            <Alert className="border-red-200 bg-gradient-to-r from-red-50 to-orange-50 shadow-lg">
              <AlertTriangleIcon />
              <AlertDescription className="text-red-800 font-medium">
                <strong>¡ALERTA CRÍTICA!</strong> Se detectaron {dangerSensors} sensores en estado de peligro.
                <Button variant="link" className="p-0 h-auto ml-2 text-red-700 underline">
                  Ver detalles →
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        <div className="flex">
          <aside className="w-80 bg-white/60 backdrop-blur-sm border-r border-white/20 p-6 space-y-6">
            <div>
              <h2 className="text-lg font-bold mb-4 text-slate-800">Estado General</h2>
              <div className="grid gap-3">
                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <CheckCircleIcon />
                        </div>
                        <span className="font-semibold text-green-800">Normal</span>
                      </div>
                      <Badge className="bg-green-600 text-white shadow-sm">{normalSensors}</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                          <AlertTriangleIcon />
                        </div>
                        <span className="font-semibold text-yellow-800">Alerta</span>
                      </div>
                      <Badge className="bg-yellow-600 text-white shadow-sm">{alertSensors}</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                          <XCircleIcon />
                        </div>
                        <span className="font-semibold text-red-800">Peligro</span>
                      </div>
                      <Badge className="bg-red-600 text-white shadow-sm">{dangerSensors}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-bold mb-4 text-slate-800">Sensores Activos</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {sensors.map((sensor) => (
                  <SensorCard
                    key={sensor.id}
                    sensor={sensor}
                    isSelected={selectedSensor === sensor.id}
                    onClick={() => setSelectedSensor(sensor.id)}
                  />
                ))}
              </div>
            </div>
          </aside>

          <main className="flex-1 p-8">
            <Tabs defaultValue="map" className="space-y-6">
              <TabsList className="bg-white/80 backdrop-blur-sm shadow-sm">
                <TabsTrigger value="map" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                  Mapa Interactivo
                </TabsTrigger>
                <TabsTrigger value="charts" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                  Gráficos
                </TabsTrigger>
                <TabsTrigger value="alerts" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                  Historial de Alertas
                </TabsTrigger>
              </TabsList>

              <TabsContent value="map" className="space-y-6">
                <Card className="bg-white shadow-xl border border-slate-200">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <MapPinIcon />
                      </div>
                      <span className="text-xl font-bold text-slate-800">Mapa de Sensores en Tiempo Real</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FloodMap sensors={sensors} selectedSensor={selectedSensor} onSensorSelect={setSelectedSensor} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="charts" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <TrendingUpIcon />
                        <span>Nivel de Agua (últimas 24h)</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <SensorChart type="waterLevel" sensors={sensors} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <ActivityIcon />
                        <span>Caudal (últimas 24h)</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <SensorChart type="flowRate" sensors={sensors} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <ThermometerIcon />
                        <span>Humedad del Suelo (últimas 24h)</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <SensorChart type="soilMoisture" sensors={sensors} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Resumen de Riesgos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10">
                          <span className="font-medium">Sensores Normales</span>
                          <span className="text-2xl font-bold text-primary">{normalSensors}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/10">
                          <span className="font-medium">En Alerta</span>
                          <span className="text-2xl font-bold text-secondary">{alertSensors}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-accent/10">
                          <span className="font-medium">En Peligro</span>
                          <span className="text-2xl font-bold text-accent">{dangerSensors}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="alerts">
                {/* <AlertPanel alerts={alerts} /> */}
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    </>
  )
}
