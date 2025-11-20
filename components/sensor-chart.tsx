"use client"

import { useState, useEffect } from "react"

interface SensorData {
  id: string
  name: string
  waterLevel: number
  flowRate: number
  soilMoisture: number
  temperature: number
  precipitation: number
  riskLevel: "normal" | "alert" | "danger"
}

interface SensorChartProps {
  type: "waterLevel" | "flowRate" | "soilMoisture" | "temperature" | "precipitation"
  sensors: SensorData[]
}

const getUnit = (type: string) => {
  switch (type) {
    case "waterLevel":
      return "cm"
    case "flowRate":
      return "L/s"
    case "soilMoisture":
      return "%"
    case "temperature":
      return "°C"
    case "precipitation":
      return "mm"
    default:
      return ""
  }
}

const getColors = () => ["#22c55e", "#eab308", "#f97316", "#ef4444", "#3b82f6"]

const ExpandIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
  </svg>
)

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
)

export function SensorChart({ type, sensors }: SensorChartProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLandscape, setIsLandscape] = useState(false)

  const colors = getColors()
  const unit = getUnit(type)

  useEffect(() => {
    const handleOrientationChange = () => {
      setIsLandscape(window.innerHeight < window.innerWidth)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false)
      }
    }

    window.addEventListener("orientationchange", handleOrientationChange)
    window.addEventListener("resize", handleOrientationChange)
    window.addEventListener("keydown", handleKeyDown)

    // Initial check
    handleOrientationChange()

    return () => {
      window.removeEventListener("orientationchange", handleOrientationChange)
      window.removeEventListener("resize", handleOrientationChange)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isFullscreen])

  // Generate mock data points for the last 24 hours
  const generateMockData = () => {
    return Array.from({ length: 24 }, (_, i) => {
      const hour = new Date()
      hour.setHours(hour.getHours() - (23 - i))
      return {
        hour: hour.getHours(),
        values: sensors.map((sensor, index) => {
          const baseValue = sensor[type]
          const variation = (Math.random() - 0.5) * 20
          return {
            name: sensor.name,
            value: Math.max(0, baseValue + variation),
            color: colors[index % colors.length],
          }
        }),
      }
    })
  }

  const data = generateMockData()

  const getChartTitle = () => {
    switch (type) {
      case "waterLevel":
        return "Nivel de Agua"
      case "flowRate":
        return "Caudal"
      case "soilMoisture":
        return "Humedad del Suelo"
      case "temperature":
        return "Temperatura"
      case "precipitation":
        return "Precipitación"
      default:
        return "Gráfico"
    }
  }

  const ChartContent = ({ isFullscreenMode = false }) => (
    <div className={`relative ${isFullscreenMode ? "h-full" : "h-full"}`}>
      {/* Chart Grid */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 200">
        {/* Grid lines */}
        <defs>
          <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Chart lines */}
        {sensors.map((sensor, sensorIndex) => {
          const points = data
            .map((point, index) => {
              const x = (index / (data.length - 1)) * 380 + 10
              const sensorValue = point.values[sensorIndex]
              const maxValue = Math.max(...data.flatMap((d) => d.values.map((v) => v.value)))
              const y = 180 - (sensorValue.value / maxValue) * 160
              return `${x},${y}`
            })
            .join(" ")

          return (
            <g key={sensor.id}>
              <polyline
                fill="none"
                stroke={colors[sensorIndex % colors.length]}
                strokeWidth={isFullscreenMode ? "3" : "2"}
                points={points}
                className="drop-shadow-sm"
              />
              {/* Data points */}
              {data.map((point, index) => {
                const x = (index / (data.length - 1)) * 380 + 10
                const sensorValue = point.values[sensorIndex]
                const maxValue = Math.max(...data.flatMap((d) => d.values.map((v) => v.value)))
                const y = 180 - (sensorValue.value / maxValue) * 160
                return (
                  <circle
                    key={`${sensor.id}-${index}`}
                    cx={x}
                    cy={y}
                    r={isFullscreenMode ? "4" : "3"}
                    fill={colors[sensorIndex % colors.length]}
                    className="drop-shadow-sm"
                  />
                )
              })}
            </g>
          )
        })}
      </svg>

      {/* Legend */}
      <div
        className={`absolute ${isFullscreenMode ? "bottom-4 left-4" : "bottom-2 left-2"} bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg`}
      >
        <div className="space-y-2">
          {sensors.map((sensor, index) => (
            <div key={sensor.id} className={`flex items-center space-x-3 ${isFullscreenMode ? "text-sm" : "text-xs"}`}>
              <div
                className={`${isFullscreenMode ? "w-4 h-4" : "w-3 h-3"} rounded-full`}
                style={{ backgroundColor: colors[index % colors.length] }}
              ></div>
              <span className="text-slate-700 font-medium">{sensor.name}</span>
              <span className="text-slate-500">
                {sensor[type].toFixed(1)} {unit}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Y-axis label */}
      <div
        className={`absolute left-1 top-1/2 transform -rotate-90 -translate-y-1/2 ${isFullscreenMode ? "text-sm" : "text-xs"} text-slate-600 font-medium`}
      >
        {unit}
      </div>

      {/* X-axis labels */}
      <div
        className={`absolute bottom-0 left-0 right-0 flex justify-between px-2 ${isFullscreenMode ? "text-sm" : "text-xs"} text-slate-600`}
      >
        <span>24h ago</span>
        <span>12h ago</span>
        <span>Now</span>
      </div>
    </div>
  )

  return (
    <>
      {/* Normal chart view */}
      <div className="h-64 bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg p-4 border relative">
        <button
          onClick={() => setIsFullscreen(true)}
          className="absolute top-2 right-2 z-10 bg-white/90 hover:bg-white rounded-lg p-2 shadow-sm transition-all duration-200 hover:shadow-md"
          title="Ver en pantalla completa"
        >
          <ExpandIcon />
        </button>

        <ChartContent />
      </div>

      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
          {/* Fullscreen chart container */}
          <div
            className={`w-full h-full bg-gradient-to-br from-slate-50 to-blue-50 relative ${
              isLandscape ? "p-4" : "p-6"
            }`}
          >
            {/* Header with title and close button */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20">
              <h2 className={`font-bold text-slate-800 ${isLandscape ? "text-lg" : "text-xl"}`}>{getChartTitle()}</h2>
              <button
                onClick={() => setIsFullscreen(false)}
                className="bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-all duration-200 hover:shadow-xl"
                title="Cerrar pantalla completa"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Chart content with padding for header */}
            <div className={`w-full h-full ${isLandscape ? "pt-12 pb-4" : "pt-16 pb-6"}`}>
              <ChartContent isFullscreenMode={true} />
            </div>

            {/* Instructions for mobile */}
            <div className="absolute bottom-4 right-4 bg-black/50 text-white text-xs px-3 py-2 rounded-lg md:hidden">
              Rota el dispositivo para mejor visualización
            </div>
          </div>
        </div>
      )}
    </>
  )
}
