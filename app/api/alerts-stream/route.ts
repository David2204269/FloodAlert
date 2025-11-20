// Server-Sent Events (SSE) endpoint for real-time alerts
// Streams alerts to connected clients

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Check if client supports EventSource
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  };

  try {
    const encoder = new TextEncoder();
    let isConnectionClosed = false;

    // Monitor connection closure
    request.signal.addEventListener('abort', () => {
      isConnectionClosed = true;
    });

    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection message
        const initialMessage = `data: ${JSON.stringify({
          type: 'connected',
          message: 'Connected to alert stream',
          timestamp: new Date().toISOString(),
        })}\n\n`;

        controller.enqueue(encoder.encode(initialMessage));

        // Simulate alert streaming - replace with real MongoDB queries later
        const keepAliveInterval = setInterval(() => {
          if (isConnectionClosed) {
            clearInterval(keepAliveInterval);
            controller.close();
            return;
          }

          // Send keep-alive heartbeat every 30 seconds
          const keepAlive = `: keep-alive ${new Date().toISOString()}\n\n`;
          controller.enqueue(encoder.encode(keepAlive));
        }, 30000);

        // Cleanup on close
        request.signal.addEventListener('abort', () => {
          clearInterval(keepAliveInterval);
          controller.close();
        });
      },
    });

    return new Response(stream, { headers });
  } catch (error) {
    console.error('Error in alert stream:', error);
    
    return new Response(
      `data: ${JSON.stringify({
        error: 'Stream error',
        message: error instanceof Error ? error.message : 'Unknown error',
      })}\n\n`,
      { headers }
    );
  }
}
