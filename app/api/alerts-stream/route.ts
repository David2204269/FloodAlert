// Example endpoint for Server-Sent Events (SSE)
// This is a placeholder that shows how your Python backend should send data

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const interval = setInterval(() => {
        const alerts = [
          {
            level: "warning",
            message: "Nivel de agua incrementando en Zona Norte",
            sensorId: "SENSOR-001",
            timestamp: new Date().toLocaleTimeString(),
          },
          {
            level: "danger",
            message: "Alto riesgo de inundación detectado",
            sensorId: "SENSOR-002",
            timestamp: new Date().toLocaleTimeString(),
          },
        ]
        
        const randomAlert = alerts[Math.floor(Math.random() * alerts.length)]
        const data = `data: ${JSON.stringify(randomAlert)}\n\n`
        controller.enqueue(encoder.encode(data))
      }, 10000)

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
