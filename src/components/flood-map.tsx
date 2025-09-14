"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useState } from "react"

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

interface FloodMapProps {
  sensors: SensorData[]
  selectedSensor: string | null
  onSensorSelect?: (sensorId: string) => void
}

const MapPinIcon = () => (
  <svg className="h-6 w-6 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
    <path
      fillRule="evenodd"
      d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
      clipRule="evenodd"
    />
  </svg>
)

const DropletsIcon = () => (
  <svg className="h-3 w-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 2s-4 4.5-4 8a4 4 0 008 0c0-3.5-4-8-4-8z" clipRule="evenodd" />
  </svg>
)

const ActivityIcon = () => (
  <svg className="h-3 w-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"></polyline>
  </svg>
)

const ThermometerIcon = () => (
  <svg className="h-3 w-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"></path>
  </svg>
)

const ZoomInIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="8"></circle>
    <path d="m21 21-4.35-4.35"></path>
    <line x1="8" y1="11" x2="14" y2="11"></line>
    <line x1="11" y1="8" x2="11" y2="14"></line>
  </svg>
)

const ZoomOutIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="8"></circle>
    <path d="m21 21-4.35-4.35"></path>
    <line x1="8" y1="11" x2="14" y2="11"></line>
  </svg>
)

const LayersIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <polygon points="12,2 2,7 12,12 22,7 12,2"></polygon>
    <polyline points="2,17 12,22 22,17"></polyline>
    <polyline points="2,12 12,17 22,12"></polyline>
  </svg>
)

const getRiskColor = (level: string) => {
  switch (level) {
    case "normal":
      return "bg-green-600"
    case "alert":
      return "bg-yellow-600"
    case "danger":
      return "bg-red-600"
    default:
      return "bg-slate-600"
  }
}

const getBadgeRiskColor = (level: string) => {
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

export function FloodMap({ sensors, selectedSensor, onSensorSelect }: FloodMapProps) {
  const [zoomLevel, setZoomLevel] = useState(1)
  const [showLayers, setShowLayers] = useState(true)
  const [mapView, setMapView] = useState<"satellite" | "terrain" | "hybrid">("hybrid")

  const handleSensorClick = (sensorId: string) => {
    if (onSensorSelect) {
      onSensorSelect(sensorId)
    }
  }

  return (
    <div className="relative h-[300px] sm:h-[400px] md:h-[500px] lg:h-[600px] bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 rounded-xl overflow-hidden border shadow-2xl">
      <div className="absolute inset-0" style={{ transform: `scale(${zoomLevel})` }}>
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 via-blue-900/30 to-slate-900/40"></div>

        <svg viewBox="0 0 500 400" className="w-full h-full absolute inset-0 opacity-30">
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgb(148 163 184)" strokeWidth="0.5" opacity="0.3" />
            </pattern>
            <linearGradient id="riverGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgb(59 130 246)" stopOpacity="0.8" />
              <stop offset="50%" stopColor="rgb(147 197 253)" stopOpacity="0.6" />
              <stop offset="100%" stopColor="rgb(59 130 246)" stopOpacity="0.8" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          <path
            d="M50 200 Q150 120 280 180 Q350 220 450 160"
            stroke="url(#riverGradient)"
            strokeWidth="12"
            fill="none"
            className="drop-shadow-lg"
          />
          <path
            d="M100 80 Q200 100 320 140 Q380 160 420 120"
            stroke="url(#riverGradient)"
            strokeWidth="8"
            fill="none"
            opacity="0.7"
          />
          <path
            d="M80 300 Q180 280 250 320 Q320 340 400 300"
            stroke="url(#riverGradient)"
            strokeWidth="6"
            fill="none"
            opacity="0.5"
          />

          <g opacity="0.4">
            <rect x="180" y="120" width="140" height="100" fill="rgb(156 163 175)" rx="8" className="drop-shadow-md" />
            <rect x="190" y="130" width="30" height="20" fill="rgb(75 85 99)" rx="2" />
            <rect x="230" y="130" width="25" height="20" fill="rgb(75 85 99)" rx="2" />
            <rect x="270" y="130" width="35" height="20" fill="rgb(75 85 99)" rx="2" />
            <rect x="190" y="160" width="40" height="25" fill="rgb(75 85 99)" rx="2" />
            <rect x="250" y="160" width="30" height="25" fill="rgb(75 85 99)" rx="2" />
          </g>

          <g opacity="0.4">
            <rect x="100" y="240" width="160" height="80" fill="rgb(156 163 175)" rx="8" className="drop-shadow-md" />
            <rect x="110" y="250" width="35" height="15" fill="rgb(75 85 99)" rx="2" />
            <rect x="155" y="250" width="30" height="15" fill="rgb(75 85 99)" rx="2" />
            <rect x="200" y="250" width="40" height="15" fill="rgb(75 85 99)" rx="2" />
          </g>

          <circle cx="380" cy="100" r="50" fill="rgb(34 197 94)" opacity="0.3" className="drop-shadow-sm" />
          <circle cx="100" cy="100" r="35" fill="rgb(34 197 94)" opacity="0.3" className="drop-shadow-sm" />
          <circle cx="350" cy="300" r="40" fill="rgb(34 197 94)" opacity="0.3" className="drop-shadow-sm" />

          <ellipse
            cx="200"
            cy="150"
            rx="80"
            ry="40"
            fill="none"
            stroke="rgb(148 163 184)"
            strokeWidth="1"
            opacity="0.2"
          />
          <ellipse
            cx="300"
            cy="250"
            rx="60"
            ry="30"
            fill="none"
            stroke="rgb(148 163 184)"
            strokeWidth="1"
            opacity="0.2"
          />
        </svg>
      </div>

      {sensors.map((sensor, index) => {
        const positions = [
          { left: "25%", top: "35%" },
          { left: "45%", top: "55%" },
          { left: "65%", top: "25%" },
        ]
        const position = positions[index] || { left: "50%", top: "50%" }

        return (
          <div
            key={sensor.id}
            className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 hover:scale-110 ${
              selectedSensor === sensor.id ? "scale-125 z-30" : "z-20"
            }`}
            style={position}
            onClick={() => handleSensorClick(sensor.id)}
          >
            <div className="group relative">
              <div className="absolute inset-0 rounded-full animate-ping opacity-20">
                <div
                  className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full ${getRiskColor(sensor.riskLevel)}`}
                ></div>
              </div>
              <div className="absolute inset-0 rounded-full animate-ping opacity-40 animation-delay-150">
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full ${getRiskColor(sensor.riskLevel)} m-2`}
                ></div>
              </div>

              <div
                className={`relative ${getRiskColor(sensor.riskLevel)} rounded-full p-2 sm:p-3 md:p-4 shadow-2xl border-2 border-white/20 backdrop-blur-sm hover:shadow-3xl transition-all duration-200`}
              >
                <MapPinIcon />

                <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-white rounded-full flex items-center justify-center">
                  <div
                    className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                      sensor.riskLevel === "danger"
                        ? "bg-red-500"
                        : sensor.riskLevel === "alert"
                          ? "bg-yellow-500"
                          : "bg-green-500"
                    }`}
                  ></div>
                </div>
              </div>

              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                <div className="bg-slate-800 text-white text-xs rounded-lg px-2 sm:px-3 py-1 sm:py-2 whitespace-nowrap shadow-xl border border-slate-600">
                  <div className="font-semibold text-white text-xs sm:text-sm">{sensor.name}</div>
                  <div className="text-xs text-slate-200 hidden sm:block">Clic para ver detalles</div>
                </div>
              </div>
            </div>

            {selectedSensor === sensor.id && (
              <Card className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 sm:mt-4 w-40 sm:w-48 md:w-52 z-40 shadow-2xl border border-slate-200 bg-white">
                <div className="p-2 sm:p-3">
                  <div className="flex items-center justify-between mb-1 sm:mb-2">
                    <h3 className="font-bold text-xs sm:text-sm text-slate-800 truncate pr-2">{sensor.name}</h3>
                    <Badge
                      className={`${getBadgeRiskColor(sensor.riskLevel)} shadow-lg text-xs px-1 py-0 flex-shrink-0`}
                    >
                      <span className="hidden sm:inline">{sensor.riskLevel.toUpperCase()}</span>
                      <span className="sm:hidden">{sensor.riskLevel.charAt(0).toUpperCase()}</span>
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 gap-1 sm:gap-2 mb-1 sm:mb-2">
                    <div className="bg-blue-50 rounded-md p-1.5 sm:p-2 border border-blue-100">
                      <div className="flex items-center space-x-1 mb-1">
                        <DropletsIcon />
                        <span className="text-xs font-medium text-blue-800">
                          <span className="hidden sm:inline">Nivel de agua</span>
                          <span className="sm:hidden">Nivel</span>
                        </span>
                      </div>
                      <span className="text-sm sm:text-lg font-bold text-blue-900">
                        {sensor.waterLevel.toFixed(1)} cm
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1">
                      <div className="bg-green-50 rounded-md p-1 sm:p-1.5 border border-green-100">
                        <div className="flex items-center space-x-1 mb-1">
                          <ActivityIcon />
                          <span className="text-xs font-medium text-green-800">
                            <span className="hidden sm:inline">Caudal</span>
                            <span className="sm:hidden">C</span>
                          </span>
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-green-900">
                          {sensor.flowRate.toFixed(0)} L/s
                        </span>
                      </div>

                      <div className="bg-orange-50 rounded-md p-1 sm:p-1.5 border border-orange-100">
                        <div className="flex items-center space-x-1 mb-1">
                          <ThermometerIcon />
                          <span className="text-xs font-medium text-orange-800">
                            <span className="hidden sm:inline">Humedad</span>
                            <span className="sm:hidden">H</span>
                          </span>
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-orange-900">
                          {sensor.soilMoisture.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 pt-1 sm:pt-1.5 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-xs truncate">
                      <span className="hidden sm:inline">Actualizado: {sensor.lastUpdate}</span>
                      <span className="sm:hidden">{sensor.lastUpdate}</span>
                    </span>
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-slate-600 text-xs hidden sm:inline">En línea</span>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )
      })}

      <div className="absolute top-2 sm:top-4 right-2 sm:right-4 flex flex-col space-y-1 sm:space-y-2">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg p-1 sm:p-2 shadow-lg">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.2))}
            className="w-6 h-6 sm:w-8 sm:h-8 p-0"
          >
            <ZoomInIcon />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.2))}
            className="w-6 h-6 sm:w-8 sm:h-8 p-0"
          >
            <ZoomOutIcon />
          </Button>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-lg p-1 sm:p-2 shadow-lg">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLayers(!showLayers)}
            className="w-6 h-6 sm:w-8 sm:h-8 p-0"
          >
            <LayersIcon />
          </Button>
        </div>
      </div>

      <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 bg-white/95 backdrop-blur-md rounded-xl p-2 sm:p-4 shadow-2xl border border-white/20">
        <h4 className="font-bold text-xs sm:text-sm mb-2 sm:mb-3 text-slate-800">
          <span className="hidden sm:inline">Niveles de Riesgo</span>
          <span className="sm:hidden">Riesgo</span>
        </h4>
        <div className="space-y-1 sm:space-y-2">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-600 rounded-full shadow-sm"></div>
            <span className="text-xs sm:text-sm font-medium text-slate-700">Normal</span>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-yellow-600 rounded-full shadow-sm"></div>
            <span className="text-xs sm:text-sm font-medium text-slate-700">Alerta</span>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-600 rounded-full shadow-sm"></div>
            <span className="text-xs sm:text-sm font-medium text-slate-700">Peligro</span>
          </div>
        </div>

        <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-slate-200">
          <div className="flex items-center space-x-2 text-xs text-slate-600">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="hidden sm:inline">Actualización en tiempo real</span>
            <span className="sm:hidden">Tiempo real</span>
          </div>
        </div>
      </div>

      <div className="absolute top-2 sm:top-4 left-2 sm:left-4 bg-white/95 backdrop-blur-sm rounded-lg p-1 sm:p-2 shadow-lg border border-white/20">
        <div className="flex space-x-1">
          {(["satellite", "terrain", "hybrid"] as const).map((view) => (
            <Button
              key={view}
              variant={mapView === view ? "default" : "ghost"}
              size="sm"
              onClick={() => setMapView(view)}
              className="text-xs px-2 sm:px-3 py-1 sm:py-2 h-auto font-medium"
              title={view === "satellite" ? "Vista Satélite" : view === "terrain" ? "Vista Terreno" : "Vista Híbrida"}
            >
              {view === "satellite" ? "🛰️" : view === "terrain" ? "🗻" : "🌍"}
            </Button>
          ))}
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none">
        {mapView === "satellite" && (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800/20 via-blue-900/10 to-slate-900/20 rounded-xl"></div>
        )}
        {mapView === "terrain" && (
          <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 via-amber-900/10 to-slate-900/20 rounded-xl"></div>
        )}
        {mapView === "hybrid" && (
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 via-blue-900/30 to-slate-900/40 rounded-xl"></div>
        )}
      </div>
    </div>
  )
}
