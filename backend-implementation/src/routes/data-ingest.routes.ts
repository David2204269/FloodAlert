/**
 * Data Ingestion Route Handler
 * Receives sensor data from TTGO WiFi gateway via HTTP
 * 
 * Architecture:
 * TTGO Sensor → TTGO Gateway (LoRa + WiFi) → HTTP POST → This Endpoint → MongoDB Atlas
 */

import { Router, Request, Response, NextFunction } from 'express';
import { Db } from 'mongodb';
import Redis from 'ioredis';
import { Logger } from 'pino';
import { z } from 'zod';
import { GatewayDataService } from '../services/gateway-data.service.js';

// Extend Express Request to include custom properties
declare global {
  namespace Express {
    interface Request {
      idempotencyKey?: string;
      rateLimitCount?: number;
    }
  }
}

/**
 * Request validation schema
 * Matches the TTGO gateway payload structure
 */
const SensorDataSchema = z.object({
  sensor_id: z.string().regex(/^SENSOR_\d{3}$/),
  water_level_cm: z.number().min(0).max(500),
  rain_accumulated_mm: z.number().min(0).max(10000),
  flow_rate_lmin: z.number().min(0).max(10000),
  temperature_c: z.number().min(-50).max(60),
  humidity_percent: z.number().min(0).max(100),
  timestamp: z.number().int().positive(),
  battery_percent: z.number().min(0).max(100),
  gateway_id: z.string().optional(),
  rssi: z.number().optional(),
  snr: z.number().optional(),
});

type SensorData = z.infer<typeof SensorDataSchema>;

interface SensorReading extends SensorData {
  metadata: {
    sensor_id: string;
    gateway_id?: string;
  };
}

/**
 * API Key authentication middleware
 */
async function authenticateApiKey(
  req: Request,
  res: Response,
  next: NextFunction,
  db: Db
) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Missing API key',
      code: 'MISSING_API_KEY',
    });
  }

  const apiKey = authHeader.substring(7);

  try {
    // In production, validate against API keys collection
    // For now, check environment variable
    const validKey = process.env.API_KEY_SECRET;

    if (!validKey || apiKey !== validKey) {
      return res.status(403).json({
        error: 'Invalid API key',
        code: 'INVALID_API_KEY',
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      error: 'Authentication error',
      code: 'AUTH_ERROR',
    });
  }
}

/**
 * Idempotency check middleware
 * Prevents duplicate processing of the same request
 */
async function checkIdempotency(
  req: Request,
  res: Response,
  next: NextFunction,
  cache: Redis
) {
  const idempotencyKey = req.headers['x-idempotency-key'] as string;

  if (!idempotencyKey) {
    // Generate one if not provided
    req.idempotencyKey = `${Date.now()}-${Math.random()}`;
    return next();
  }

  try {
    // Check if we've processed this request before
    const cached = await cache.get(`idempotency:${idempotencyKey}`);

    if (cached) {
      // Return cached response
      const cachedData = JSON.parse(cached);
      return res.status(200).json(cachedData);
    }

    req.idempotencyKey = idempotencyKey;
    next();
  } catch (error) {
    // Continue without idempotency check if cache fails
    req.idempotencyKey = idempotencyKey;
    next();
  }
}

/**
 * Rate limiting per sensor
 */
async function rateLimitPerSensor(
  req: Request,
  res: Response,
  next: NextFunction,
  cache: Redis
) {
  const body = req.body;
  if (!body.sensor_id) {
    return next();
  }

  const sensorId = body.sensor_id;
  const rateKey = `rate:${sensorId}`;

  try {
    const count = await cache.incr(rateKey);

    if (count === 1) {
      // First request in this window, set expiry
      await cache.expire(rateKey, 60); // 60 second window
    }

    if (count > 20) {
      // Max 20 requests per minute per sensor
      return res.status(429).json({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 60,
      });
    }

    req.rateLimitCount = count;
    next();
  } catch (error) {
    // Continue without rate limiting if cache fails
    next();
  }
}

/**
 * Main data ingestion handler
 */
async function ingestData(
  req: Request,
  res: Response,
  db: Db,
  cache: Redis,
  logger: Logger
) {
  try {
    // Validate request body
    let validatedData: SensorData;
    try {
      validatedData = SensorDataSchema.parse(req.body);
    } catch (error: any) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.errors,
      });
    }

    // Check for duplicate recent readings
    const isDuplicate = await checkForDuplicate(
      validatedData,
      db,
      cache
    );

    if (isDuplicate) {
      logger.debug(
        `Duplicate reading from ${validatedData.sensor_id}, skipping`
      );
      
      return res.status(200).json({
        ok: true,
        message: 'Duplicate reading, skipped',
        received_at: new Date().toISOString(),
        deduplicated: true,
      });
    }

    // Create sensor reading document
    const reading: SensorReading = {
      ...validatedData,
      metadata: {
        sensor_id: validatedData.sensor_id,
        gateway_id: validatedData.gateway_id,
      },
    };

    // Insert into MongoDB
    const sensorsCollection = db.collection('sensor_readings');
    const insertResult = await sensorsCollection.insertOne({
      ...reading,
      timestamp: new Date(validatedData.timestamp * 1000),
      received_at: new Date(),
    });

    logger.info({
      message: 'Sensor reading ingested',
      sensor_id: validatedData.sensor_id,
      doc_id: insertResult.insertedId.toString(),
    });

    // Cache the reading for deduplication
    const dedupeKey = `reading:${validatedData.sensor_id}:${validatedData.timestamp}`;
    await cache.setex(dedupeKey, 300, JSON.stringify(validatedData)); // 5 min TTL

    // Evaluate alerts asynchronously
    evaluateAlerts(validatedData, db, logger)
      .catch(error => logger.error('Alert evaluation failed:', error));

    // Cache response for idempotency
    const response = {
      ok: true,
      received_at: new Date().toISOString(),
      reading_id: insertResult.insertedId.toString(),
    };

    if (req.idempotencyKey) {
      await cache.setex(
        `idempotency:${req.idempotencyKey}`,
        300,
        JSON.stringify(response)
      ).catch(() => {});
    }

    res.status(201).json(response);

  } catch (error: any) {
    logger.error('Data ingestion error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      code: 'INGEST_ERROR',
    });
  }
}

/**
 * Check for duplicate readings within 5 minute window
 * Prevents reprocessing the same sensor packet
 */
async function checkForDuplicate(
  data: SensorData,
  db: Db,
  cache: Redis
): Promise<boolean> {
  const dedupeKey = `reading:${data.sensor_id}:${data.timestamp}`;

  // Check Redis cache first (fast)
  try {
    const cached = await cache.get(dedupeKey);
    if (cached) {
      return true;
    }
  } catch (error) {
    // Continue to database check if cache fails
  }

  // Check MongoDB for recent readings (fallback)
  const sensorsCollection = db.collection('sensor_readings');
  const recentReading = await sensorsCollection.findOne({
    'metadata.sensor_id': data.sensor_id,
    timestamp: {
      $gt: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
    },
  });

  return !!recentReading;
}

/**
 * Evaluate alerts based on sensor reading
 * Runs asynchronously to not block response
 */
async function evaluateAlerts(
  data: SensorData,
  db: Db,
  logger: Logger
): Promise<void> {
  try {
    // Get sensor configuration
    const sensorsCollection = db.collection('sensors');
    const sensorConfig = await sensorsCollection.findOne({
      sensor_id: data.sensor_id,
    });

    if (!sensorConfig || !sensorConfig.enabled) {
      logger.debug(`Sensor ${data.sensor_id} not configured or disabled`);
      return;
    }

    // Check for alert conditions
    const alerts = [];

    // Water level critical check
    if (
      data.water_level_cm >
      sensorConfig.thresholds?.water_level_critical_cm
    ) {
      alerts.push({
        sensor_id: data.sensor_id,
        type: 'WATER_LEVEL_CRITICAL',
        severity: 'CRITICAL',
        value: data.water_level_cm,
        threshold: sensorConfig.thresholds.water_level_critical_cm,
        message: `Critical water level: ${data.water_level_cm}cm`,
        detected_at: new Date(),
        status: 'ACTIVE',
      });
    }

    // Rainfall heavy check
    if (
      data.rain_accumulated_mm >
      sensorConfig.thresholds?.rainfall_heavy_mm
    ) {
      alerts.push({
        sensor_id: data.sensor_id,
        type: 'RAINFALL_HEAVY',
        severity: 'WARNING',
        value: data.rain_accumulated_mm,
        threshold: sensorConfig.thresholds.rainfall_heavy_mm,
        message: `Heavy rainfall: ${data.rain_accumulated_mm}mm`,
        detected_at: new Date(),
        status: 'ACTIVE',
      });
    }

    // Store alerts
    if (alerts.length > 0) {
      const alertsCollection = db.collection('alerts');
      await alertsCollection.insertMany(alerts);
      logger.info(`Generated ${alerts.length} alerts for ${data.sensor_id}`);
    }

  } catch (error) {
    logger.error('Alert evaluation error:', error);
  }
}

/**
 * Create and configure the data ingest router
 */
export function createDataIngestRouter(
  db: Db,
  cache: Redis,
  logger: Logger
): Router {
  const router = Router();
  const gatewayService = new GatewayDataService(db, cache, logger);

  /**
   * POST /api/v1/data/sensor
   * Modern WiFi HTTP endpoint for TTGO Gateway
   * Receives sensor data directly via HTTP POST with JSON payload
   * 
   * Expected payload:
   * {
   *   "sensor_id": "SENSOR_001",
   *   "gateway_id": "GATEWAY_001",
   *   "timestamp": 1700000000000,
   *   "water_level_cm": 45.5,
   *   "rain_accumulated_mm": 10.2,
   *   "flow_rate_lmin": 250,
   *   "temperature_c": 25.5,
   *   "humidity_percent": 65,
   *   "battery_percent": 85,
   *   "rssi": -95,
   *   "snr": 7.5
   * }
   */
  router.post('/sensor', (req, res, next) => {
    authenticateApiKey(req, res, next, db);
  }, (req, res, next) => {
    checkIdempotency(req, res, next, cache);
  }, async (req, res) => {
    try {
      // Log incoming request
      logger.debug({
        msg: 'WiFi data received from TTGO',
        sensor_id: req.body.sensor_id,
        gateway_id: req.body.gateway_id,
        timestamp: req.body.timestamp,
      });

      // Use GatewayDataService to process the reading
      const result = await gatewayService.ingestGatewayReading(req.body);

      if (!result.success) {
        return res.status(400).json({
          ok: false,
          error: result.error,
          code: 'INGESTION_FAILED',
        });
      }

      // Emit WebSocket event for real-time updates
      const io = req.app?.locals?.io;
      if (io) {
        io.emit('sensor:data', {
          sensor_id: req.body.sensor_id,
          gateway_id: req.body.gateway_id,
          timestamp: result.timestamp,
          reading_id: result.reading_id,
        });

        // Also emit to specific sensor room
        io.to(`sensor:${req.body.sensor_id}`).emit('reading:update', {
          data: req.body,
          received_at: result.timestamp,
          reading_id: result.reading_id,
        });
      }

      res.status(201).json({
        ok: true,
        received_at: result.timestamp?.toISOString(),
        reading_id: result.reading_id,
      });

    } catch (error: any) {
      logger.error('WiFi data ingestion error:', error);
      res.status(500).json({
        ok: false,
        error: 'Internal server error',
        code: 'INGEST_ERROR',
      });
    }
  });

  /**
   * POST /api/v1/data/ingest
   * Legacy endpoint - Receives sensor data from TTGO gateway
   * Kept for backwards compatibility
   */
  router.post('/ingest', (req, res, next) => {
    authenticateApiKey(req, res, next, db);
  }, (req, res, next) => {
    checkIdempotency(req, res, next, cache);
  }, (req, res, next) => {
    rateLimitPerSensor(req, res, next, cache);
  }, (req, res) => {
    ingestData(req, res, db, cache, logger);
  });


  /**
   * GET /api/v1/data/status/:sensor_id
   * Get current sensor status - latest reading
   */
  router.get('/status/:sensor_id', async (req, res) => {
    try {
      const { sensor_id } = req.params;

      const reading = await db.collection('sensor_readings').findOne(
        { 'metadata.sensor_id': sensor_id },
        { sort: { timestamp: -1 } }
      );

      if (!reading) {
        return res.status(404).json({
          ok: false,
          error: 'No data found for sensor',
          sensor_id,
        });
      }

      res.json({
        ok: true,
        data: reading,
      });
    } catch (error) {
      logger.error('Status endpoint error:', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  });

  /**
   * GET /api/v1/data/history/:sensor_id
   * Get historical data for a sensor with time range filtering
   */
  router.get('/history/:sensor_id', async (req, res) => {
    try {
      const { sensor_id } = req.params;
      const { hours = 24, limit = 100 } = req.query;

      const cutoffTime = new Date(
        Date.now() - parseInt(hours as string) * 60 * 60 * 1000
      );

      const readings = await db
        .collection('sensor_readings')
        .find({
          'metadata.sensor_id': sensor_id,
          timestamp: { $gte: cutoffTime },
        })
        .sort({ timestamp: -1 })
        .limit(parseInt(limit as string))
        .toArray();

      res.json({
        ok: true,
        data: readings,
        count: readings.length,
        sensor_id,
      });
    } catch (error) {
      logger.error('History endpoint error:', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  });

  /**
   * GET /api/v1/data/gateway/:gateway_id
   * Get all sensors connected to a gateway
   */
  router.get('/gateway/:gateway_id', async (req, res) => {
    try {
      const { gateway_id } = req.params;

      const readings = await db
        .collection('sensor_readings')
        .find({ 'metadata.gateway_id': gateway_id })
        .sort({ timestamp: -1 })
        .limit(50)
        .toArray();

      res.json({
        ok: true,
        gateway_id,
        readings_count: readings.length,
        data: readings,
      });
    } catch (error) {
      logger.error('Gateway endpoint error:', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  });

  /**
   * GET /api/v1/data/gateways
   * List all active gateways
   */
  router.get('/gateways', async (req, res) => {
    try {
      const gateways = await gatewayService.listGateways();

      res.json({
        ok: true,
        gateways,
        count: gateways.length,
      });
    } catch (error) {
      logger.error('List gateways error:', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  });

  /**
   * GET /api/v1/data/stats/:sensor_id
   * Get aggregated statistics for a sensor
   */
  router.get('/stats/:sensor_id', async (req, res) => {
    try {
      const { sensor_id } = req.params;
      const { hours = 24 } = req.query;

      const stats = await gatewayService.getSensorStats(
        sensor_id,
        parseInt(hours as string)
      );

      if (!stats) {
        return res.status(404).json({
          ok: false,
          error: 'No statistics available',
          sensor_id,
        });
      }

      res.json({
        ok: true,
        sensor_id,
        hours: parseInt(hours as string),
        stats,
      });
    } catch (error) {
      logger.error('Stats endpoint error:', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  });

  /**
   * POST /api/v1/data/gateway/register
   * Register a new gateway with metadata
   */
  router.post('/gateway/register', (req, res, next) => {
    authenticateApiKey(req, res, next, db);
  }, async (req, res) => {
    try {
      const { gateway_id, name, location } = req.body;

      if (!gateway_id) {
        return res.status(400).json({
          ok: false,
          error: 'gateway_id is required',
        });
      }

      await gatewayService.registerGateway(gateway_id, {
        gateway_id,
        gateway_name: name,
        location,
      });

      res.status(201).json({
        ok: true,
        message: 'Gateway registered successfully',
        gateway_id,
      });
    } catch (error) {
      logger.error('Gateway registration error:', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  });

  /**
   * GET /api/v1/data/gateway/:gateway_id/info
   * Get detailed information about a specific gateway
   */
  router.get('/gateway/:gateway_id/info', async (req, res) => {
    try {
      const { gateway_id } = req.params;

      const gatewayInfo = await gatewayService.getGatewayInfo(gateway_id);

      if (!gatewayInfo) {
        return res.status(404).json({
          ok: false,
          error: 'Gateway not found',
          gateway_id,
        });
      }

      res.json({
        ok: true,
        data: gatewayInfo,
      });
    } catch (error) {
      logger.error('Gateway info error:', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  });

  return router;
}
