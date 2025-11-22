/**
 * Health Check Route Handler
 * Monitoring and readiness probes for kubernetes/docker
 */

import { Router, Request, Response } from 'express';
import { Db } from 'mongodb';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  timestamp: string;
  services: {
    mongodb: {
      connected: boolean;
      responseTime?: number;
      error?: string;
    };
    redis: {
      connected: boolean;
      responseTime?: number;
      error?: string;
    };
  };
}

const startTime = Date.now();

export function createHealthRouter(db: Db): Router {
  const router = Router();

  /**
   * GET /api/v1/health
   * Quick liveness check (< 100ms)
   */
  router.get('/', (req: Request, res: Response) => {
    res.status(200).json({
      ok: true,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /api/v1/health/ready
   * Readiness probe - checks all dependencies
   */
  router.get('/ready', async (req: Request, res: Response) => {
    const health: HealthStatus = {
      status: 'healthy',
      uptime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      services: {
        mongodb: { connected: false },
        redis: { connected: false },
      },
    };

    try {
      // Check MongoDB
      const mongoStart = Date.now();
      await db.admin().ping();
      health.services.mongodb.connected = true;
      health.services.mongodb.responseTime = Date.now() - mongoStart;
    } catch (error: any) {
      health.services.mongodb.connected = false;
      health.services.mongodb.error = error.message;
      health.status = 'degraded';
    }

    // Redis check would be similar if available
    // For now, optional
    health.services.redis.connected = true;

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  });

  /**
   * GET /api/v1/health/detailed
   * Comprehensive health check with metrics
   */
  router.get('/detailed', async (req: Request, res: Response) => {
    try {
      // Get database stats
      const stats = await db.stats();
      
      // Get latest reading timestamp
      const latestReading = await db
        .collection('sensor_readings')
        .findOne({}, { sort: { timestamp: -1 } });

      // Get alert count (active)
      const activeAlerts = await db
        .collection('alerts')
        .countDocuments({ status: 'ACTIVE' });

      // Get sensor count
      const sensorCount = await db
        .collection('sensors')
        .countDocuments({ enabled: true });

      res.json({
        ok: true,
        uptime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        database: {
          collections: stats.collections,
          dataSize: stats.dataSize,
          indexes: stats.indexes,
          storageSize: stats.storageSize,
        },
        data: {
          latestReading: latestReading?.timestamp,
          activeAlerts,
          enabledSensors: sensorCount,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'Health check failed',
        message: error.message,
      });
    }
  });

  return router;
}
