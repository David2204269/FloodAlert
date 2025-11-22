/**
 * Configuration Route Handler
 * Sensor thresholds and settings management
 */

import { Router, Request, Response } from 'express';
import { Db } from 'mongodb';

export function createConfigRouter(db: Db): Router {
  const router = Router();

  /**
   * GET /api/v1/config/sensors
   * Get all sensor configurations
   */
  router.get('/sensors', async (req: Request, res: Response) => {
    try {
      const sensors = await db
        .collection('sensors')
        .find({ enabled: true })
        .toArray();

      res.json({
        ok: true,
        data: sensors,
        count: sensors.length,
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'Failed to fetch sensor configs',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/v1/config/sensors/:sensor_id
   * Get specific sensor configuration
   */
  router.get('/sensors/:sensor_id', async (req: Request, res: Response) => {
    try {
      const { sensor_id } = req.params;

      const sensor = await db
        .collection('sensors')
        .findOne({ sensor_id });

      if (!sensor) {
        return res.status(404).json({
          error: 'Sensor not found',
          sensor_id,
        });
      }

      res.json({
        ok: true,
        data: sensor,
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'Failed to fetch sensor config',
        message: error.message,
      });
    }
  });

  /**
   * PUT /api/v1/config/sensors/:sensor_id
   * Update sensor configuration (admin only)
   */
  router.put('/sensors/:sensor_id', async (req: Request, res: Response) => {
    try {
      // In production, add authentication check here
      const adminKey = req.headers['x-admin-key'];
      if (adminKey !== process.env.ADMIN_KEY) {
        return res.status(401).json({
          error: 'Unauthorized',
        });
      }

      const { sensor_id } = req.params;
      const updates = req.body;

      const result = await db
        .collection('sensors')
        .findOneAndUpdate(
          { sensor_id },
          {
            $set: {
              ...updates,
              updated_at: new Date(),
            },
          },
          { returnDocument: 'after' }
        );

      if (!result?.value) {
        return res.status(404).json({
          error: 'Sensor not found',
          sensor_id,
        });
      }

      res.json({
        ok: true,
        data: result.value,
        message: 'Sensor configuration updated',
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'Failed to update sensor config',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/v1/config/thresholds/:sensor_id
   * Get alert thresholds for a sensor
   */
  router.get('/thresholds/:sensor_id', async (req: Request, res: Response) => {
    try {
      const { sensor_id } = req.params;

      const sensor = await db
        .collection('sensors')
        .findOne({ sensor_id }, { projection: { thresholds: 1 } });

      if (!sensor) {
        return res.status(404).json({
          error: 'Sensor not found',
          sensor_id,
        });
      }

      res.json({
        ok: true,
        sensor_id,
        thresholds: sensor.thresholds || {},
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'Failed to fetch thresholds',
        message: error.message,
      });
    }
  });

  return router;
}
