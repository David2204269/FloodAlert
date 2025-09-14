"use client"

interface SensorData {
  id: string
  name: string
  waterLevel: number
  flowRate: number
  soilMoisture: number
  riskLevel: "normal" | "alert" | "danger"
}

interface SensorChartProps {
  type: "waterLevel" | "flowRate" | "soilMoisture"
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
    default:
      return ""
  }
}

const getColors = () => ["#22c55e", "#eab308", "#f97316", "#ef4444", "#3b82f6"]

export function SensorChart({ type, sensors }: SensorChartProps) {
  const colors = getColors()
  const unit = getUnit(type)

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

  return (
    <div className="h-64 bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg p-4 border">
      <div className="h-full relative">
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
                  strokeWidth="2"
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
                      r="3"
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
        <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-sm">
          <div className="space-y-1">
            {sensors.map((sensor, index) => (
              <div key={sensor.id} className="flex items-center space-x-2 text-xs">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[index % colors.length] }}></div>
                <span className="text-slate-700 font-medium">{sensor.name}</span>
                <span className="text-slate-500">
                  {sensor[type].toFixed(1)} {unit}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Y-axis label */}
        <div className="absolute left-1 top-1/2 transform -rotate-90 -translate-y-1/2 text-xs text-slate-600 font-medium">
          {unit}
        </div>

        {/* X-axis labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-xs text-slate-600">
          <span>24h ago</span>
          <span>12h ago</span>
          <span>Now</span>
        </div>
      </div>
    </div>
  )
}
