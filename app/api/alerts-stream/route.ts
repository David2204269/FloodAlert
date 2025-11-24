// Server-Sent Events (SSE) endpoint for real-time alerts
// Fetches dynamic data from the database and sends alerts based on sensor readings

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const sendAlerts = async () => {
        try {
          // Fetch sensor data from the API
          const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/sensores`, {
            cache: 'no-store'
          })
          const result = await response.json()

          if (result.ok && result.data && result.data.length > 0) {
            const alerts = []

            // Process each sensor reading to generate alerts
            for (const lectura of result.data) {
              const nivel = lectura.nivel_m || 0
              const caudal = lectura.caudal_l_s || 0

              // Determine risk level based on sensor values
              let level = "normal"
              let message = ""

              if (nivel > 5 || caudal > 150) {
                level = "danger"
                message = `Alto riesgo de inundación detectado - Nivel: ${(nivel * 100).toFixed(1)} cm, Caudal: ${caudal.toFixed(0)} L/s`
              } else if (nivel > 3 || caudal > 100) {
                level = "warning"
                message = `Nivel de agua incrementando - Nivel: ${(nivel * 100).toFixed(1)} cm, Caudal: ${caudal.toFixed(0)} L/s`
              } else {
                level = "normal"
                message = `Niveles normales - Nivel: ${(nivel * 100).toFixed(1)} cm, Caudal: ${caudal.toFixed(0)} L/s`
              }

              // Only send warning and danger alerts
              if (level !== "normal") {
                alerts.push({
                  level,
                  message,
                  location: "Estación Rivex",
                  timestamp: new Date().toLocaleString('es-ES', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  }),
                  sensorData: {
                    waterLevel: nivel * 100, // Convert to cm
                    flowRate: caudal,
                    temperature: parseFloat(lectura.temperatura_c) || 0,
                    humidity: lectura.humedad_pct || 0,
                    precipitation: lectura.lluvia_mm || 0
                  }
                })
              }
            }

            // Send alerts if any exist
            if (alerts.length > 0) {
              // Send the most recent alert (first in the array since API returns DESC order)
              const data = `data: ${JSON.stringify(alerts[0])}\n\n`
              controller.enqueue(encoder.encode(data))
            } else {
              // Send a status update if no alerts
              const statusData = `data: ${JSON.stringify({
                level: "info",
                message: "Sistema funcionando normalmente - Sin alertas activas",
                location: "Estación Rivex",
                timestamp: new Date().toLocaleString('es-ES', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              })}\n\n`
              controller.enqueue(encoder.encode(statusData))
            }
          }
        } catch (error) {
          console.error('Error fetching sensor data for alerts:', error)
        }
      }

      // Send initial alerts
      await sendAlerts()

      // Send alerts every 10 seconds
      const interval = setInterval(sendAlerts, 10000)

      // Clean up on close
      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
