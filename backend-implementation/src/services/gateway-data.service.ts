/**
 * Gateway Data Ingestion Service
 * Maneja datos del TTGO Gateway (LoRa + WiFi)
 * Valida, deduplica y almacena en MongoDB
 */

import { Db } from 'mongodb';
import Redis from 'ioredis';
import pino from 'pino';
import crypto from 'crypto';

const logger = pino();

interface GatewayReading {
  sensor_id?: string;
  gateway_id?: string;
  timestamp: number | Date; // TTGO envía timestamp en segundos
  
  // Formato TTGO (nuevo)
  temperatura_c?: number; // Temperatura en °C
  humedad_pct?: number; // Humedad en porcentaje
  caudal_l_s?: number; // Caudal en L/s
  lluvia_mm?: number; // Lluvia en mm
  nivel_m?: number; // Nivel en metros
  seq?: number; // Número de secuencia del TTGO
  
  // Formato legacy (antiguo)
  water_level_cm?: number;
  rain_accumulated_mm?: number;
  flow_rate_lmin?: number;
  temperature_c?: number;
  humidity_percent?: number;
  battery_percent?: number;
  
  rssi?: number; // Signal strength from LoRa
  snr?: number; // Signal-to-noise ratio
  signal_quality?: 'excellent' | 'good' | 'fair' | 'poor';
}

interface GatewayMetadata {
  gateway_id: string;
  gateway_name?: string;
  location?: {
    lat: number;
    lng: number;
  };
  lora_rssi?: number;
  lora_snr?: number;
}

export class GatewayDataService {
  constructor(
    private db: Db,
    private redis: Redis,
    private logger: any = logger
  ) {}

  /**
   * Procesa y almacena lectura del gateway
   * 1. Valida formato y rango de datos
   * 2. Detecta duplicados por idempotencia
   * 3. Almacena en MongoDB
   * 4. Actualiza estado del gateway
   * 5. Genera alertas si es necesario
   */
  async ingestGatewayReading(payload: any): Promise<{
    success: boolean;
    reading_id?: string;
    error?: string;
    timestamp?: Date;
  }> {
    try {
      // Validar estructura básica
      const validation = this.validatePayload(payload);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Extraer y normalizar datos
      const reading = this.normalizeReading(payload);

      // Verificar duplicados con idempotencia
      const duplicateCheck = await this.checkDuplicate(reading);
      if (duplicateCheck.isDuplicate) {
        this.logger.warn({
          msg: 'Duplicate reading detected',
          sensor_id: reading.sensor_id,
          timestamp: reading.timestamp,
          duplicateAge: duplicateCheck.ageSeconds,
        });
        return { success: false, error: 'Duplicate reading detected' };
      }

      // Almacenar en MongoDB
      const result = await this.db.collection('sensor_readings').insertOne({
        metadata: {
          sensor_id: reading.sensor_id,
          gateway_id: reading.gateway_id,
          timestamp: reading.timestamp,
        },
        ...reading,
        received_at: new Date(),
        processing_timestamp: new Date(),
      });

      // Registrar lectura en Redis para deduplicación (5 minutos)
      const timestampMs = typeof reading.timestamp === 'number' 
        ? reading.timestamp 
        : reading.timestamp.getTime();
      const dedupeKey = `reading:${reading.sensor_id}:${timestampMs}`;
      await this.redis.setex(dedupeKey, 300, JSON.stringify(reading));

      // Actualizar gateway (last_seen, status)
      if (reading.gateway_id) {
        await this.updateGatewayStatus(reading.gateway_id, {
          last_seen: new Date(),
          status: 'online',
          last_reading_count: (await this.getReadingCount(reading.gateway_id)) + 1,
        });
      }

      this.logger.info({
        msg: 'Reading ingested successfully',
        reading_id: result.insertedId,
        sensor_id: reading.sensor_id,
        gateway_id: reading.gateway_id,
      });

      return {
        success: true,
        reading_id: result.insertedId.toString(),
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Gateway data ingestion error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Valida estructura del payload (TTGO o formato legacy)
   */
  private validatePayload(payload: any): { valid: boolean; error?: string } {
    // Validar que al menos esté present el timestamp
    if (payload.timestamp === undefined || payload.timestamp === null) {
      return { valid: false, error: 'Missing required field: timestamp' };
    }

    // Validar campos TTGO (nuevo formato)
    const ttgoFields = {
      temperatura_c: { min: -50, max: 60 },
      humedad_pct: { min: 0, max: 100 },
      caudal_l_s: { min: 0, max: 10000 },
      lluvia_mm: { min: 0, max: 10000 },
      nivel_m: { min: -10, max: 100 },
    };

    // Validar campos legacy (formato antiguo)
    const legacyFields = {
      water_level_cm: { min: 0, max: 500 },
      rain_accumulated_mm: { min: 0, max: 10000 },
      flow_rate_lmin: { min: 0, max: 10000 },
      temperature_c: { min: -50, max: 60 },
      humidity_percent: { min: 0, max: 100 },
      battery_percent: { min: 0, max: 100 },
    };

    // Validar rangos si existen
    const allFields = { ...ttgoFields, ...legacyFields };
    for (const [field, range] of Object.entries(allFields)) {
      if (payload[field] !== undefined) {
        const value = parseFloat(payload[field]);
        if (isNaN(value) || value < range.min || value > range.max) {
          return {
            valid: false,
            error: `Invalid ${field}: must be between ${range.min} and ${range.max}`,
          };
        }
      }
    }

    return { valid: true };
  }

  /**
   * Normaliza lectura: convierte tipos, calcula calidad de señal, etc.
   * Soporta formato TTGO y formato legacy
   */
  private normalizeReading(payload: any): GatewayReading {
    // Detectar formato TTGO vs legacy
    const isTTGOFormat = payload.temperatura_c !== undefined || payload.humedad_pct !== undefined;
    
    let reading: GatewayReading;

    if (isTTGOFormat) {
      // Formato TTGO
      reading = {
        timestamp: payload.timestamp ? Number(payload.timestamp) : Date.now(),
        temperatura_c: parseFloat(payload.temperatura_c ?? 20),
        humedad_pct: parseFloat(payload.humedad_pct ?? 50),
        caudal_l_s: parseFloat(payload.caudal_l_s ?? 0),
        lluvia_mm: parseFloat(payload.lluvia_mm ?? 0),
        nivel_m: parseFloat(payload.nivel_m ?? 0),
        seq: payload.seq,
        // Agregar sensor_id y gateway_id si vienen en payload
        sensor_id: payload.sensor_id || 'TTGO_DEFAULT',
        gateway_id: payload.gateway_id || 'GATEWAY_DEFAULT',
        rssi: payload.rssi,
        snr: payload.snr,
      };
    } else {
      // Formato legacy
      reading = {
        timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
        temperature_c: payload.temperature_c ?? 20,
        humidity_percent: payload.humidity_percent ?? 50,
        water_level_cm: payload.water_level_cm ?? 0,
        rain_accumulated_mm: payload.rain_accumulated_mm ?? 0,
        flow_rate_lmin: payload.flow_rate_lmin ?? 0,
        battery_percent: payload.battery_percent ?? 100,
        sensor_id: payload.sensor_id || 'SENSOR_DEFAULT',
        gateway_id: payload.gateway_id || 'GATEWAY_DEFAULT',
        rssi: payload.rssi,
        snr: payload.snr,
      };
    }

    // Calcular calidad de señal LoRa
    if (reading.rssi !== undefined) {
      if (reading.rssi >= -80) {
        reading.signal_quality = 'excellent';
      } else if (reading.rssi >= -100) {
        reading.signal_quality = 'good';
      } else if (reading.rssi >= -120) {
        reading.signal_quality = 'fair';
      } else {
        reading.signal_quality = 'poor';
      }
    }

    return reading;
  }

  /**
   * Detecta duplicados basándose en sensor_id y timestamp
   */
  private async checkDuplicate(
    reading: GatewayReading
  ): Promise<{ isDuplicate: boolean; ageSeconds?: number }> {
    const timestampMs = typeof reading.timestamp === 'number' 
      ? reading.timestamp 
      : reading.timestamp.getTime();
    
    const dedupeKey = `reading:${reading.sensor_id}:${timestampMs}`;
    const cached = await this.redis.get(dedupeKey);

    if (cached) {
      const ttl = await this.redis.ttl(dedupeKey);
      return { isDuplicate: true, ageSeconds: 300 - ttl };
    }

    // También verificar en base de datos (últimos 5 minutos)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const existingReading = await this.db.collection('sensor_readings').findOne({
      'metadata.sensor_id': reading.sensor_id,
      timestamp: {
        $gte: fiveMinutesAgo,
        $lte: new Date(timestampMs + 1000), // 1 segundo de ventana
      },
    });

    return { isDuplicate: !!existingReading };
  }

  /**
   * Actualiza estado del gateway
   */
  private async updateGatewayStatus(
    gateway_id: string,
    updates: any
  ): Promise<void> {
    await this.db.collection('gateways').updateOne(
      { gateway_id },
      {
        $set: {
          gateway_id,
          ...updates,
          updated_at: new Date(),
        },
      },
      { upsert: true }
    );
  }

  /**
   * Obtiene cantidad de lecturas del gateway
   */
  private async getReadingCount(gateway_id: string): Promise<number> {
    return await this.db
      .collection('sensor_readings')
      .countDocuments({ 'metadata.gateway_id': gateway_id });
  }

  /**
   * Obtiene últimas N lecturas de un sensor
   */
  async getLatestReadings(
    sensor_id: string,
    limit: number = 10
  ): Promise<GatewayReading[]> {
    const readings = await this.db
      .collection('sensor_readings')
      .find({ 'metadata.sensor_id': sensor_id })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    return readings as any[] as GatewayReading[];
  }

  /**
   * Obtiene lecturas de un rango de tiempo
   */
  async getReadingsByTimeRange(
    sensor_id: string,
    startTime: Date,
    endTime: Date
  ): Promise<GatewayReading[]> {
    const readings = await this.db
      .collection('sensor_readings')
      .find({
        'metadata.sensor_id': sensor_id,
        timestamp: {
          $gte: startTime,
          $lte: endTime,
        },
      })
      .sort({ timestamp: 1 })
      .toArray();

    return readings as any[] as GatewayReading[];
  }

  /**
   * Obtiene estadísticas agregadas de un sensor
   */
  async getSensorStats(sensor_id: string, hoursBack: number = 24): Promise<any> {
    const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    const stats = await this.db
      .collection('sensor_readings')
      .aggregate([
        {
          $match: {
            'metadata.sensor_id': sensor_id,
            timestamp: { $gte: startTime },
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            avg_water_level: { $avg: '$water_level_cm' },
            max_water_level: { $max: '$water_level_cm' },
            min_water_level: { $min: '$water_level_cm' },
            avg_temperature: { $avg: '$temperature_c' },
            avg_humidity: { $avg: '$humidity_percent' },
            total_rain: { $sum: '$rain_accumulated_mm' },
            max_flow: { $max: '$flow_rate_lmin' },
            avg_battery: { $avg: '$battery_percent' },
          },
        },
      ])
      .toArray();

    return stats[0] || null;
  }

  /**
   * Registra un nuevo gateway
   */
  async registerGateway(gateway_id: string, metadata: GatewayMetadata): Promise<void> {
    await this.db.collection('gateways').updateOne(
      { gateway_id },
      {
        $set: {
          gateway_id,
          name: metadata.gateway_name || `Gateway ${gateway_id}`,
          location: metadata.location || { lat: 0, lng: 0 },
          status: 'online',
          registered_at: new Date(),
          last_seen: new Date(),
          reading_count: 0,
        },
      },
      { upsert: true }
    );

    this.logger.info({ msg: 'Gateway registered', gateway_id });
  }

  /**
   * Obtiene información del gateway
   */
  async getGatewayInfo(gateway_id: string): Promise<any> {
    const gateway = await this.db.collection('gateways').findOne({ gateway_id });
    return gateway;
  }

  /**
   * Lista todos los gateways registrados
   */
  async listGateways(): Promise<any[]> {
    const gateways = await this.db
      .collection('gateways')
      .find({})
      .sort({ last_seen: -1 })
      .toArray();

    return gateways;
  }
}
