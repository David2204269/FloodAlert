"use client"

import { useState, useEffect, useMemo, useCallback, memo, useRef } from "react"

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

interface AggregatedReading {
  temperatura_c: string
  nivel_m: string
  caudal_l_s: string
  humedad_pct: string
  lluvia_mm: string
  created_at: string
  seq: number
}

interface SensorChartProps {
  type: "waterLevel" | "flowRate" | "soilMoisture" | "temperature" | "precipitation"
  sensors: SensorData[]
  isActive?: boolean
}

interface ChartPoint {
  hour: number
  timestamp: string
  values: Array<{
    name: string
    value: number
    color: string
  }>
}

interface TooltipData {
  x: number
  y: number
  timestamp: string
  sensorName: string
  value: number
  color: string
}

const COLORS = ["#22c55e", "#eab308", "#f97316", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899"]
const MAX_DISPLAY_POINTS = 100 // Máximo de puntos a mostrar para rendimiento (aumentado para más detalle)

const getUnit = (type: string) => {
  switch (type) {
    case "waterLevel": return "cm"
    case "flowRate": return "L/s"
    case "soilMoisture": return "%"
    case "temperature": return "°C"
    case "precipitation": return "mm"
    default: return ""
  }
}

const ExpandIcon = memo(() => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
  </svg>
))
ExpandIcon.displayName = 'ExpandIcon'

const CloseIcon = memo(() => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
))
CloseIcon.displayName = 'CloseIcon'

export function SensorChart({ type, sensors, isActive = false }: SensorChartProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLandscape, setIsLandscape] = useState(false)
  const [historicalData, setHistoricalData] = useState<AggregatedReading[]>([])
  const [isLoading, setIsLoading] = useState(false)

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

    handleOrientationChange()

    return () => {
      window.removeEventListener("orientationchange", handleOrientationChange)
      window.removeEventListener("resize", handleOrientationChange)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isFullscreen])

  // Cargar datos históricos solo cuando el componente está activo
  useEffect(() => {
    if (!isActive) return

    const fetchHistoricalData = async () => {
      setIsLoading(true)
      try {
        const response = await fetch('/api/sensores/aggregated')
        const result = await response.json()
        
        if (result.ok && result.data) {
          setHistoricalData(result.data)
          console.log(`[SensorChart] Datos cargados: ${result.data.length} puntos (original: ${result.meta?.originalCount})`)
        }
      } catch (error) {
        console.error('[SensorChart] Error al cargar datos:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchHistoricalData()
  }, [isActive])

  // Memoizar la generación de datos para evitar recálculos
  const chartData = useMemo<ChartPoint[]>(() => {
    if (historicalData.length === 0) {
      return Array.from({ length: 24 }, (_, i) => {
        const hour = new Date()
        hour.setHours(hour.getHours() - (23 - i))
        return {
          hour: hour.getHours(),
          timestamp: hour.toISOString(),
          values: sensors.slice(0, 5).map((sensor, index) => ({
            name: sensor.name,
            value: sensor[type],
            color: COLORS[index % COLORS.length],
          })),
        }
      })
    }

    // Agrupar datos por seq (sensor)
    const dataBySeq = new Map<number, AggregatedReading[]>()
    historicalData.forEach((reading: AggregatedReading) => {
      if (!dataBySeq.has(reading.seq)) {
        dataBySeq.set(reading.seq, [])
      }
      dataBySeq.get(reading.seq)!.push(reading)
    })

    // Obtener timestamps únicos y limitar cantidad
    const allTimestamps = [...new Set(historicalData.map((r: AggregatedReading) => r.created_at))].sort()
    
    // Reducir puntos si hay demasiados (downsample)
    let timestamps = allTimestamps
    if (allTimestamps.length > MAX_DISPLAY_POINTS) {
      const step = Math.ceil(allTimestamps.length / MAX_DISPLAY_POINTS)
      timestamps = allTimestamps.filter((_, i) => i % step === 0)
    }

    const seqEntries = Array.from(dataBySeq.entries()).slice(0, 7)

    return timestamps.map((timestamp: string) => {
      const date = new Date(timestamp)
      return {
        hour: date.getHours(),
        timestamp,
        values: seqEntries.map(([seq, readings], index) => {
          const reading = readings.find((r: AggregatedReading) => r.created_at === timestamp)
          
          let value = 0
          if (reading) {
            switch (type) {
              case "waterLevel":
                value = parseFloat(reading.nivel_m) * 100
                break
              case "flowRate":
                value = parseFloat(reading.caudal_l_s)
                break
              case "soilMoisture":
                value = parseFloat(reading.humedad_pct)
                break
              case "temperature":
                value = parseFloat(reading.temperatura_c)
                break
              case "precipitation":
                value = parseFloat(reading.lluvia_mm)
                break
            }
          }

          return {
            name: `Sensor ${seq}`,
            value: isNaN(value) ? 0 : value,
            color: COLORS[index % COLORS.length],
          }
        }),
      }
    })
  }, [historicalData, sensors, type])

  // Memoizar cálculos pesados del SVG
  const maxValue = useMemo(() => {
    if (chartData.length === 0) return 1
    return Math.max(...chartData.flatMap((d: ChartPoint) => d.values.map(v => v?.value || 0)), 1)
  }, [chartData])

  const getChartTitle = useCallback(() => {
    switch (type) {
      case "waterLevel": return "Nivel de Agua"
      case "flowRate": return "Caudal"
      case "soilMoisture": return "Humedad del Suelo"
      case "temperature": return "Temperatura"
      case "precipitation": return "Precipitación"
      default: return "Gráfico"
    }
  }, [type])

  // Solo mostrar puntos (círculos) si hay pocos datos para no saturar visualmente
  const showDataPoints = chartData.length <= 40

  // Calcular estadísticas (mínimo, máximo, tendencia)
  const stats = useMemo(() => {
    if (chartData.length === 0) return null
    
    // Obtener todos los valores de todos los sensores
    const allValues = chartData.flatMap(d => d.values.map(v => v?.value || 0)).filter(v => v > 0)
    
    if (allValues.length === 0) return null
    
    const min = Math.min(...allValues)
    const max = Math.max(...allValues)
    
    // Calcular tendencia comparando primera mitad vs segunda mitad
    const midPoint = Math.floor(chartData.length / 2)
    const firstHalfAvg = chartData.slice(0, midPoint).flatMap(d => d.values.map(v => v?.value || 0)).reduce((a, b) => a + b, 0) / (midPoint * (chartData[0]?.values.length || 1))
    const secondHalfAvg = chartData.slice(midPoint).flatMap(d => d.values.map(v => v?.value || 0)).reduce((a, b) => a + b, 0) / ((chartData.length - midPoint) * (chartData[0]?.values.length || 1))
    
    const diff = secondHalfAvg - firstHalfAvg
    const threshold = max * 0.05 // 5% del máximo como umbral de cambio significativo
    
    let trend: "up" | "down" | "stable" = "stable"
    if (diff > threshold) trend = "up"
    else if (diff < -threshold) trend = "down"
    
    return { min, max, trend }
  }, [chartData])

  const ChartContent = ({ isFullscreenMode = false }: { isFullscreenMode?: boolean }) => {
    const [tooltip, setTooltip] = useState<TooltipData | null>(null)
    const svgRef = useRef<SVGSVGElement>(null)

    const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current || chartData.length === 0) return
      
      const svg = svgRef.current
      const rect = svg.getBoundingClientRect()
      const mouseX = ((e.clientX - rect.left) / rect.width) * 400
      const mouseY = ((e.clientY - rect.top) / rect.height) * 200
      
      // Encontrar el punto más cercano
      let closestDistance = Infinity
      let closestPoint: TooltipData | null = null
      
      chartData.forEach((point, pointIndex) => {
        const x = (pointIndex / (chartData.length - 1)) * 380 + 10
        
        point.values.forEach((sensorValue) => {
          if (!sensorValue) return
          const y = 180 - ((sensorValue.value || 0) / maxValue) * 160
          
          const distance = Math.sqrt((mouseX - x) ** 2 + (mouseY - y) ** 2)
          
          if (distance < closestDistance && distance < 30) { // Solo si está cerca (30px)
            closestDistance = distance
            closestPoint = {
              x,
              y,
              timestamp: point.timestamp,
              sensorName: sensorValue.name,
              value: sensorValue.value,
              color: sensorValue.color
            }
          }
        })
      })
      
      setTooltip(closestPoint)
    }, [chartData, maxValue])

    const handleMouseLeave = useCallback(() => {
      setTooltip(null)
    }, [])
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-xs text-slate-600">Cargando datos históricos...</p>
          </div>
        </div>
      )
    }

    if (chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-sm text-slate-500">No hay datos disponibles</p>
        </div>
      )
    }

    return (
    <div className={`relative ${isFullscreenMode ? "h-full" : "h-full"}`}>
      <svg 
        ref={svgRef}
        className="absolute inset-0 w-full h-full cursor-crosshair" 
        viewBox="0 0 400 200"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <pattern id={`grid-${type}`} width="40" height="20" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#grid-${type})`} />

        {chartData[0]?.values.map((_, sensorIndex: number) => {
          const points = chartData
            .map((point: ChartPoint, index: number) => {
              const x = (index / (chartData.length - 1)) * 380 + 10
              const sensorValue = point.values[sensorIndex]
              if (!sensorValue) return null
              const y = 180 - ((sensorValue.value || 0) / maxValue) * 160
              return `${x},${y}`
            })
            .filter((p): p is string => p !== null)
            .join(" ")

          return (
            <g key={`sensor-${sensorIndex}`}>
              <polyline
                fill="none"
                stroke={COLORS[sensorIndex % COLORS.length]}
                strokeWidth={isFullscreenMode ? "3" : "2"}
                points={points}
                className="drop-shadow-sm"
              />
              {showDataPoints && chartData.map((point: ChartPoint, index: number) => {
                const x = (index / (chartData.length - 1)) * 380 + 10
                const sensorValue = point.values[sensorIndex]
                if (!sensorValue) return null
                const y = 180 - ((sensorValue.value || 0) / maxValue) * 160
                return (
                  <circle
                    key={`sensor-${sensorIndex}-${index}`}
                    cx={x}
                    cy={y}
                    r={isFullscreenMode ? "4" : "3"}
                    fill={COLORS[sensorIndex % COLORS.length]}
                    className="drop-shadow-sm"
                  />
                )
              })}
            </g>
          )
        })}

        {/* Tooltip indicator circle */}
        {tooltip && (
          <circle
            cx={tooltip.x}
            cy={tooltip.y}
            r={isFullscreenMode ? "6" : "5"}
            fill={tooltip.color}
            stroke="white"
            strokeWidth="2"
            className="drop-shadow-lg"
          />
        )}
      </svg>

      {/* Tooltip popup */}
      {tooltip && (
        <div 
          className="absolute z-20 bg-slate-800 text-white text-xs rounded-lg px-3 py-2 shadow-xl pointer-events-none"
          style={{
            left: `${(tooltip.x / 400) * 100}%`,
            top: `${(tooltip.y / 200) * 100}%`,
            transform: 'translate(-50%, -120%)'
          }}
        >
          <div className="font-semibold flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tooltip.color }}></div>
            {tooltip.sensorName}
          </div>
          <div className="text-slate-300 mt-0.5">
            {tooltip.value.toFixed(2)} {unit}
          </div>
          <div className="text-slate-400 text-[10px] mt-0.5">
            {new Date(tooltip.timestamp).toLocaleString('es-ES', { 
              day: '2-digit', 
              month: '2-digit', 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
          {/* Arrow */}
          <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
        </div>
      )}

      <div
        className={`absolute left-1 top-1/2 transform -rotate-90 -translate-y-1/2 ${isFullscreenMode ? "text-sm" : "text-xs"} text-slate-600 font-medium`}
      >
        {unit}
      </div>

      <div
        className={`absolute bottom-0 left-0 right-0 flex justify-between px-2 ${isFullscreenMode ? "text-sm" : "text-xs"} text-slate-600`}
      >
        <span>24h ago</span>
        <span>12h ago</span>
        <span>Now</span>
      </div>
    </div>
    )
  }

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

        <ChartContent isFullscreenMode={false} />
      </div>

      {/* Stats panel below chart */}
      {stats && (
        <div className="mt-2 flex items-center justify-between bg-white/80 rounded-lg px-3 py-2 border border-slate-200 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Mín:</span>
              <span className="font-semibold text-blue-600">{stats.min.toFixed(1)} {unit}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Máx:</span>
              <span className="font-semibold text-red-600">{stats.max.toFixed(1)} {unit}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Tendencia:</span>
            {stats.trend === "up" && (
              <span className="flex items-center gap-0.5 font-semibold text-red-600">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                Subiendo
              </span>
            )}
            {stats.trend === "down" && (
              <span className="flex items-center gap-0.5 font-semibold text-green-600">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                Bajando
              </span>
            )}
            {stats.trend === "stable" && (
              <span className="flex items-center gap-0.5 font-semibold text-slate-600">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
                </svg>
                Estable
              </span>
            )}
          </div>
        </div>
      )}

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
