/**
 * Componente de Dashboard mejorado con datos reales de la API
 * Integra sensores, alertas y estadísticas desde el backend
 */

"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSensorData } from "@/hooks/use-sensor-data"
import { Sensor, Lectura, NivelFlotador } from "@/src/types"

// Iconos
const DropletsIcon = () => (
  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 2s-4 4.5-4 8a4 4 0 008 0c0-3.5-4-8-4-8z" clipRule="evenodd" />
  </svg>
)

const ThermometerIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"></path>
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

const CloudRainIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14M7 7v10M17 7v10" />
  </svg>
)

const MapPinIcon = () => (
  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
    <path
      fillRule="evenodd"
      d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
      clipRule="evenodd"
    />
  </svg>
)

/**
 * Tarjeta de sensor con datos en tiempo real
 */
function SensorCard({ sensor, lectura, isSelected, onClick }: {
  sensor: Sensor
  lectura?: Lectura
  isSelected: boolean
  onClick: () => void
}) {
  if (!lectura) {
    return (
      <Card className="opacity-50 cursor-not-allowed">
        <CardContent className="p-4">
          <div className="text-center text-sm text-slate-500">
            {sensor.nombre}
            <div className="text-xs mt-1">Sin datos recientes</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const riskColor =
    lectura.nivel_flotador === "CRÍTICO"
      ? "bg-red-500"
      : lectura.nivel_flotador === "ALTO"
        ? "bg-yellow-500"
        : "bg-green-500"

  return (
    <Card
      className={`cursor-pointer transition-all ${
        isSelected ? "border-2 border-blue-500 shadow-lg" : "hover:shadow-md"
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-sm">{sensor.nombre}</h3>
            <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
              <MapPinIcon />
              {sensor.ubicacion.zona || "Zona desconocida"}
            </div>
          </div>
          <Badge className={`${riskColor} text-white`}>
            {lectura.nivel_flotador}
          </Badge>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between p-2 bg-blue-50 rounded">
            <span className="flex items-center gap-1">
              <DropletsIcon /> Lluvia
            </span>
            <span className="font-bold">{lectura.lluvia_ao.toFixed(1)} mm</span>
          </div>

          <div className="flex justify-between p-2 bg-orange-50 rounded">
            <span className="flex items-center gap-1">
              <ThermometerIcon /> Humedad
            </span>
            <span className="font-bold">{lectura.humedad_ao.toFixed(0)}%</span>
          </div>

          <div className="flex justify-between p-2 bg-green-50 rounded">
            <span className="flex items-center gap-1">
              <CloudRainIcon /> Flujo
            </span>
            <span className="font-bold">{lectura.flujo_lmin.toFixed(1)} L/min</span>
          </div>

          <div className="flex justify-between p-2 bg-red-50 rounded">
            <span className="flex items-center gap-1">
              <ThermometerIcon /> Temp
            </span>
            <span className="font-bold">{lectura.temperatura_c.toFixed(1)}°C</span>
          </div>
        </div>

        <div className="text-xs text-slate-500 pt-2 border-t mt-2">
          {new Date(lectura.timestamp * 1000).toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Tarjeta de alerta
 */
function AlertaCard({ alerta }: { alerta: any }) {
  return (
    <Card className={`border-l-4 ${
      alerta.severidad === "CRITICAL"
        ? "border-l-red-500 bg-red-50"
        : alerta.severidad === "WARNING"
          ? "border-l-yellow-500 bg-yellow-50"
          : "border-l-blue-500 bg-blue-50"
    }`}>
      <CardContent className="p-3">
        <div className="flex gap-2">
          <AlertTriangleIcon />
          <div className="flex-1">
            <h4 className="font-semibold text-sm">{alerta.sensorNombre}</h4>
            <p className="text-xs text-slate-600 mt-1">{alerta.descripcion}</p>
            <div className="text-xs text-slate-500 mt-2">
              {new Date(alerta.timestamp * 1000).toLocaleString()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Dashboard principal
 */
export function FloodDashboardImproved() {
  const {
    sensores,
    lecturas,
    alertas,
    estadisticas,
    loading,
    error,
    nivelRiesgo,
    ultimaActualizacion,
    alertasCriticas,
    alertasAdvertencia,
  } = useSensorData()

  const [selectedSensorId, setSelectedSensorId] = useState<string | null>(null)

  const selectedSensor = selectedSensorId
    ? sensores.find((s) => s.id === selectedSensorId)
    : sensores[0]

  const selectedLectura = selectedSensor?.ultimaLectura
  const selectedStats = selectedSensor ? estadisticas.find((e) => e.sensorId === selectedSensor.id) : null

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Cargando datos del sistema...</p>
        </div>
      </div>
    )
  }

  if (!sensores || sensores.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Sistema de Alerta de Inundaciones
          </h1>
        </div>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-4">⚙️</div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Sin sensores configurados
            </h2>
            <p className="text-slate-600 mb-4">
              {error || "No hay sensores activos en el sistema. Por favor, registre un sensor primero."}
            </p>
            <p className="text-sm text-slate-500 mt-4">
              Los sensores aparecerán automáticamente cuando envíen datos a través de la API.
            </p>
          </CardContent>
        </Card>

        {lecturas && lecturas.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-4">Datos Recientes</h2>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-slate-600">
                  Se han registrado {lecturas.length} lecturas en el sistema.
                  {ultimaActualizacion && (
                    <div className="mt-2">
                      Última actualización: {ultimaActualizacion.toLocaleString()}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Sistema de Alerta de Inundaciones
        </h1>
        <p className="text-slate-600">
          Último dato: {ultimaActualizacion?.toLocaleTimeString()}
        </p>
      </div>

      {/* Nivel de Riesgo General */}
      <Card className="mb-6 border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Nivel de Riesgo General</span>
            <Badge
              className={`${
                nivelRiesgo === "CRÍTICO"
                  ? "bg-red-500"
                  : nivelRiesgo === "ALTO"
                    ? "bg-orange-500"
                    : nivelRiesgo === "MEDIO"
                      ? "bg-yellow-500"
                      : "bg-green-500"
              } text-white`}
            >
              {nivelRiesgo}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">{alertasCriticas.length}</div>
              <div className="text-xs text-slate-600">Alertas Críticas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-500">{alertasAdvertencia.length}</div>
              <div className="text-xs text-slate-600">Advertencias</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{sensores.length}</div>
              <div className="text-xs text-slate-600">Sensores Activos</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar de sensores */}
        <div className="lg:col-span-1">
          <h2 className="text-lg font-semibold mb-4">Sensores</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {sensores.map((sensor) => (
              <SensorCard
                key={sensor.id}
                sensor={sensor}
                lectura={sensor.ultimaLectura}
                isSelected={selectedSensorId === sensor.id}
                onClick={() => setSelectedSensorId(sensor.id)}
              />
            ))}
          </div>
        </div>

        {/* Contenido principal */}
        <div className="lg:col-span-3 space-y-6">
          {/* Detalles del sensor seleccionado */}
          {selectedSensor && selectedLectura && (
            <Card>
              <CardHeader>
                <CardTitle>{selectedSensor.nombre}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded">
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedLectura.lluvia_ao.toFixed(1)}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">Lluvia (mm)</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded">
                    <div className="text-2xl font-bold text-orange-600">
                      {selectedLectura.humedad_ao.toFixed(0)}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">Humedad (%)</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded">
                    <div className="text-2xl font-bold text-green-600">
                      {selectedLectura.flujo_lmin.toFixed(1)}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">Flujo (L/min)</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded">
                    <div className="text-2xl font-bold text-red-600">
                      {selectedLectura.temperatura_c.toFixed(1)}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">Temp (°C)</div>
                  </div>
                </div>

                {selectedStats && (
                  <div className="mt-6 pt-6 border-t">
                    <h3 className="font-semibold mb-4">Estadísticas 24h</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-xs text-slate-600">Lluvia Máx</div>
                        <div className="font-bold text-blue-600">
                          {selectedStats.lluvia.maximo.toFixed(1)} mm
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-600">Temp Máx</div>
                        <div className="font-bold text-red-600">
                          {selectedStats.temperatura.maximo.toFixed(1)}°C
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-600">Flujo Máx</div>
                        <div className="font-bold text-green-600">
                          {selectedStats.flujo.maximo.toFixed(1)} L/min
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-600">Alertas</div>
                        <div className="font-bold text-orange-600">
                          {selectedStats.alertasCount}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Alertas activas */}
          {alertas.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Alertas Activas</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {alertas.map((alerta, idx) => (
                  <AlertaCard key={idx} alerta={alerta} />
                ))}
              </div>
            </div>
          )}

          {alertas.length === 0 && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-6 text-center">
                <div className="text-2xl mb-2">✅</div>
                <p className="text-slate-600">No hay alertas activas</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
