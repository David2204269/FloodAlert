/**
 * Express Backend - Main Application Entry Point
 * IoT Data Ingestion & Alert Processing
 * 
 * Architecture:
 * TTGO Sensor (LoRa) → TTGO Gateway (LoRa + WiFi) → HTTP POST → This Backend
 */

// Load environment variables first
import 'dotenv/config';

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import { MongoClient, Db } from 'mongodb';
import Redis from 'ioredis';
import pino from 'pino';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Routes & Services
import { createDataIngestRouter } from './routes/data-ingest.routes.js';
import { createHealthRouter } from './routes/health.routes.js';
import { createConfigRouter } from './routes/config.routes.js';
import { AlertService } from './services/alert.service.js';
import { WebSocketService } from './services/websocket.service.js';

// Configuration
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
// MongoDB Atlas connection string
// Formato: mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/<database>?retryWrites=true&w=majority
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/flood_alert';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Validar que MONGODB_URI esté configurado si no es desarrollo local
if (!MONGODB_URI || (!MONGODB_URI.includes('mongodb+srv://') && !MONGODB_URI.includes('mongodb://localhost'))) {
  console.warn('⚠️  MONGODB_URI no está configurado correctamente. Usando conexión local por defecto.');
}

// Logger setup
const logger = pino({ level: LOG_LEVEL });

// Global state (will be dependency injected)
let db: Db;
let mongoClient: MongoClient;
let redis: Redis;
let alertService: AlertService;
let wsService: WebSocketService;

/**
 * Initialize MongoDB connection
 */
async function connectMongoDB(): Promise<void> {
  try {
    logger.info(`Conectando a MongoDB: ${MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);
    
    mongoClient = new MongoClient(MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 10000, // Aumentado para Atlas
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      // Opciones específicas para MongoDB Atlas
      retryWrites: true,
      w: 'majority',
    });

    await mongoClient.connect();
    
    // Obtener el nombre de la base de datos desde la URI o usar 'flood_alert' por defecto
    const dbName = MONGODB_URI.split('/').pop()?.split('?')[0] || 'flood_alert';
    db = mongoClient.db(dbName);
    
    // Verify connection
    await db.admin().ping();
    logger.info(`✓ Connected to MongoDB Atlas - Database: ${dbName}`);

    // Create indexes
    await createIndexes(db);
  } catch (error: any) {
    logger.error('✗ MongoDB connection failed:', error.message);
    logger.error('Verifica que:');
    logger.error('  1. MONGODB_URI esté configurado en el archivo .env');
    logger.error('  2. La IP de tu servidor esté en la whitelist de MongoDB Atlas');
    logger.error('  3. Las credenciales sean correctas');
    process.exit(1);
  }
}

/**
 * Create database indexes for optimal performance
 */
async function createIndexes(database: Db): Promise<void> {
  try {
    // Sensor readings indexes
    const sensorReadingsCollection = database.collection('sensor_readings');
    await sensorReadingsCollection.createIndex({ 'metadata.sensor_id': 1, 'timestamp': -1 });
    await sensorReadingsCollection.createIndex({ 'timestamp': -1 });
    await sensorReadingsCollection.createIndex({ 'metadata.gateway_id': 1 });

    // Alerts indexes
    const alertsCollection = database.collection('alerts');
    await alertsCollection.createIndex({ 'sensor_id': 1, 'detected_at': -1 });
    await alertsCollection.createIndex({ 'status': 1, 'detected_at': -1 });
    await alertsCollection.createIndex(
      { 'detected_at': 1 },
      { expireAfterSeconds: 7776000 } // 90 days TTL
    );

    // Sensors configuration indexes
    const sensorsCollection = database.collection('sensors');
    await sensorsCollection.createIndex({ 'sensor_id': 1 }, { unique: true });
    await sensorsCollection.createIndex({ 'enabled': 1 });

    logger.info('✓ Database indexes created');
  } catch (error) {
    logger.warn('⚠ Index creation warning:', error);
  }
}

/**
 * Initialize Redis connection
 */
async function connectRedis(): Promise<void> {
  try {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      connectTimeout: 3000,
      retryStrategy: (times) => {
        if (times > 3) return null; // Stop retrying after 3 attempts
        return Math.min(times * 50, 2000);
      },
    });

    redis.on('error', (err) => logger.debug('Redis error (non-blocking):', err));
    redis.on('connect', () => logger.info('✓ Connected to Redis'));

    // Test connection with timeout
    await Promise.race([
      redis.ping(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Redis ping timeout')), 3000)
      ),
    ]);
    logger.info('✓ Redis available for caching');
  } catch (error) {
    logger.warn('⚠ Redis not available, using in-memory cache for development');
    // Create a simple in-memory cache replacement
    const memoryCache = new Map();
    redis = {
      get: async (key: string) => memoryCache.get(key),
      set: async (key: string, value: any) => { memoryCache.set(key, value); return 'OK'; },
      setex: async (key: string, ttl: number, value: any) => {
        memoryCache.set(key, value);
        setTimeout(() => memoryCache.delete(key), ttl * 1000);
        return 'OK';
      },
      incr: async (key: string) => {
        const val = (memoryCache.get(key) || 0) + 1;
        memoryCache.set(key, val);
        return val;
      },
      expire: async (key: string, ttl: number) => 1,
      ttl: async (key: string) => -1,
      disconnect: () => {},
    } as any;
  }
}

/**
 * Create Express application
 */
function createApp(database: Db, cache: Redis): Express {
  const app = express();

  // Trust proxy (for getting real IP behind load balancer)
  app.set('trust proxy', 1);

  // Security middleware
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin: process.env.CORS_ORIGINS?.split(',') || [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key'],
    })
  );

  // Body parsing
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ limit: '10kb', extended: true }));

  // Data sanitization against MongoDB injection
  app.use(mongoSanitize());

  // Rate limiting
  const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute per IP
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === '/api/v1/health',
  });

  app.use('/api/', apiLimiter);

  // Request logging middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info({
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
      });
    });

    next();
  });

  // Routes
  app.use('/api/v1/health', createHealthRouter(database));
  app.use('/api/v1/data', createDataIngestRouter(database, cache, logger));
  app.use('/api/v1/config', createConfigRouter(database));

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not found',
      path: req.path,
    });
  });

  // Error handler
  app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error('Unhandled error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: NODE_ENV === 'development' ? error.message : undefined,
    });
  });

  return app;
}

/**
 * Main application bootstrap
 */
async function bootstrap(): Promise<void> {
  try {
    logger.info(`Starting Flood Alert Backend (${NODE_ENV})`);

    // Connect to databases
    await connectMongoDB();
    await connectRedis();

    // Initialize services
    alertService = new AlertService(db, redis);
    wsService = new WebSocketService();

    // Create Express app
    const app = createApp(db, redis);

    // Create HTTP server with WebSocket support
    const httpServer = http.createServer(app);
    const io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
        credentials: true,
      },
    });

    // WebSocket connection handler
    io.on('connection', (socket) => {
      logger.info(`WebSocket client connected: ${socket.id}`);

      socket.on('subscribe:sensor', (sensorId: string) => {
        socket.join(`sensor:${sensorId}`);
        logger.debug(`Client subscribed to sensor: ${sensorId}`);
      });

      socket.on('disconnect', () => {
        logger.debug(`WebSocket client disconnected: ${socket.id}`);
      });
    });

    // Attach io to app for use in routes
    app.locals.io = io;
    app.locals.alertService = alertService;

    // Start server
    httpServer.listen(PORT, () => {
      logger.info(`✓ Server running on port ${PORT}`);
      logger.info(`✓ Environment: ${NODE_ENV}`);
      logger.info(`✓ WebSocket server ready`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      
      httpServer.close(async () => {
        await mongoClient.close();
        redis.disconnect();
        logger.info('✓ Server shut down');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Bootstrap failed:', error);
    process.exit(1);
  }
}

// Start the application
bootstrap();

export { db, alertService, wsService };
