/**
 * WebSocket Service
 * Handles real-time communication with frontend dashboard
 */

export class WebSocketService {
  /**
   * Broadcast sensor reading to all subscribed clients
   */
  static broadcastSensorReading(
    io: any,
    sensorId: string,
    reading: any
  ): void {
    io.to(`sensor:${sensorId}`).emit('sensor:reading', {
      sensor_id: sensorId,
      reading,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast alert to all subscribed clients
   */
  static broadcastAlert(
    io: any,
    sensorId: string,
    alert: any
  ): void {
    io.to(`sensor:${sensorId}`).emit('alert:new', {
      alert,
      timestamp: new Date().toISOString(),
    });

    // Also broadcast to global alerts room
    io.to('alerts').emit('alert:new', {
      alert,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast alert acknowledgment
   */
  static broadcastAlertAcknowledged(
    io: any,
    alertId: string,
    userId: string
  ): void {
    io.emit('alert:acknowledged', {
      alert_id: alertId,
      acknowledged_by: userId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast alert resolution
   */
  static broadcastAlertResolved(
    io: any,
    alertId: string
  ): void {
    io.emit('alert:resolved', {
      alert_id: alertId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get current subscriptions statistics
   */
  static getStats(io: any): {
    connected: number;
    rooms: Map<string, Set<string>>;
  } {
    const rooms = new Map();

    // Count connected clients
    const connected = io.engine.clientsCount;

    // Get room info
    for (const [roomId, clients] of Object.entries(io.sockets.adapter.rooms)) {
      if (roomId.startsWith('sensor:') || roomId === 'alerts') {
        rooms.set(roomId, clients);
      }
    }

    return { connected, rooms };
  }
}
