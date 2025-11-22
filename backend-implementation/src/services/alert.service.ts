/**
 * Alert Service
 * Handles alert generation, evaluation, and persistence
 */

import { Db, ObjectId } from 'mongodb';
import Redis from 'ioredis';
import { Logger } from 'pino';

export interface Alert {
  _id?: string;
  sensor_id: string;
  gateway_id?: string;
  type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  value: number;
  threshold: number;
  message: string;
  detected_at: Date;
  resolved_at?: Date | null;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  acknowledged: boolean;
  acknowledged_at?: Date | null;
  acknowledged_by?: string | null;
  escalation_level: number;
  webhook_sent: boolean;
  webhook_response?: string | null;
}

export interface TrendAnalysis {
  direction: 'increasing' | 'decreasing' | 'stable';
  avgChange: number;
  volatility: number;
}

export interface SensorReading {
  sensor_id: string;
  water_level_cm: number;
  rain_accumulated_mm: number;
  flow_rate_lmin: number;
  temperature_c: number;
  humidity_percent: number;
  battery_percent: number;
  rssi?: number;
  snr?: number;
}

export class AlertService {
  constructor(
    private db: Db,
    private redis: Redis,
    private logger?: Logger
  ) {}

  /**
   * Main alert evaluation function
   * Called for each incoming sensor reading
   */
  async evaluateAndCreateAlerts(
    reading: SensorReading,
    sensorConfig: any
  ): Promise<Alert[]> {
    const alerts: Alert[] = [];

    if (!sensorConfig?.thresholds) {
      return alerts;
    }

    // Get recent readings for trend analysis (last 30 minutes)
    const recentReadings = await this.getRecentReadings(
      reading.sensor_id,
      30 * 60 * 1000
    );

    // Evaluate water level
    const waterLevelAlert = await this.evaluateWaterLevel(
      reading,
      sensorConfig.thresholds,
      recentReadings
    );
    if (waterLevelAlert) alerts.push(waterLevelAlert);

    // Evaluate rainfall
    const rainfallAlert = await this.evaluateRainfall(
      reading,
      sensorConfig.thresholds
    );
    if (rainfallAlert) alerts.push(rainfallAlert);

    // Evaluate flow
    const flowAlert = await this.evaluateFlow(
      reading,
      sensorConfig.thresholds,
      recentReadings
    );
    if (flowAlert) alerts.push(flowAlert);

    // Store alerts
    if (alerts.length > 0) {
      await this.storeAlerts(alerts);
    }

    return alerts;
  }

  /**
   * Evaluate water level against thresholds
   */
  private async evaluateWaterLevel(
    reading: SensorReading,
    thresholds: any,
    recentReadings: any[]
  ): Promise<Alert | null> {
    const level = reading.water_level_cm;
    const criticalThreshold = thresholds.water_level_critical_cm;
    const warningThreshold = thresholds.water_level_warning_cm;

    // Check critical
    if (level > criticalThreshold) {
      const deduped = await this.shouldCreateAlert(
        'WATER_LEVEL_CRITICAL',
        reading.sensor_id
      );

      if (deduped) {
        return {
          sensor_id: reading.sensor_id,
          type: 'WATER_LEVEL_CRITICAL',
          severity: 'CRITICAL',
          value: level,
          threshold: criticalThreshold,
          message: `Critical water level: ${level}cm (threshold: ${criticalThreshold}cm)`,
          detected_at: new Date(),
          status: 'ACTIVE',
          acknowledged: false,
          escalation_level: 0,
          webhook_sent: false,
        };
      }
    }

    // Check warning with trend
    if (level > warningThreshold && level <= criticalThreshold) {
      const trend = await this.analyzeTrend(
        recentReadings.map((r) => r.water_level_cm || 0)
      );

      if (trend.direction === 'increasing' && trend.avgChange > 2) {
        const deduped = await this.shouldCreateAlert(
          'WATER_LEVEL_HIGH',
          reading.sensor_id
        );

        if (deduped) {
          return {
            sensor_id: reading.sensor_id,
            type: 'WATER_LEVEL_HIGH',
            severity: 'WARNING',
            value: level,
            threshold: warningThreshold,
            message: `Water level HIGH and RISING: ${level}cm (trend: +${trend.avgChange.toFixed(
              1
            )}cm/reading)`,
            detected_at: new Date(),
            status: 'ACTIVE',
            acknowledged: false,
            escalation_level: 0,
            webhook_sent: false,
          };
        }
      }
    }

    return null;
  }

  /**
   * Evaluate rainfall intensity
   */
  private async evaluateRainfall(
    reading: SensorReading,
    thresholds: any
  ): Promise<Alert | null> {
    const rain = reading.rain_accumulated_mm;
    const threshold = thresholds.rainfall_heavy_mm;

    if (rain > threshold) {
      const deduped = await this.shouldCreateAlert(
        'RAINFALL_HEAVY',
        reading.sensor_id
      );

      if (deduped) {
        return {
          sensor_id: reading.sensor_id,
          type: 'RAINFALL_HEAVY',
          severity: 'WARNING',
          value: rain,
          threshold,
          message: `Heavy rainfall: ${rain}mm (threshold: ${threshold}mm)`,
          detected_at: new Date(),
          status: 'ACTIVE',
          acknowledged: false,
          escalation_level: 0,
          webhook_sent: false,
        };
      }
    }

    return null;
  }

  /**
   * Evaluate flow rate
   */
  private async evaluateFlow(
    reading: SensorReading,
    thresholds: any,
    recentReadings: any[]
  ): Promise<Alert | null> {
    const flow = reading.flow_rate_lmin;
    const threshold = thresholds.flow_excessive_lmin;

    if (flow > threshold) {
      const trend = await this.analyzeTrend(
        recentReadings.map((r) => r.flow_rate_lmin || 0)
      );

      if (trend.direction === 'increasing' || flow > threshold * 1.2) {
        const deduped = await this.shouldCreateAlert(
          'FLOW_EXCESSIVE',
          reading.sensor_id
        );

        if (deduped) {
          return {
            sensor_id: reading.sensor_id,
            type: 'FLOW_EXCESSIVE',
            severity: 'WARNING',
            value: flow,
            threshold,
            message: `Excessive flow: ${flow}L/min (threshold: ${threshold}L/min)`,
            detected_at: new Date(),
            status: 'ACTIVE',
            acknowledged: false,
            escalation_level: 0,
            webhook_sent: false,
          };
        }
      }
    }

    return null;
  }

  /**
   * Deduplication check: Prevent duplicate alerts within 5 minute window
   */
  private async shouldCreateAlert(
    alertType: string,
    sensorId: string
  ): Promise<boolean> {
    const dedupeKey = `alert:${alertType}:${sensorId}`;

    try {
      const existing = await this.redis.get(dedupeKey);

      if (existing) {
        return false;
      }

      // Store in Redis with 5 min expiry
      await this.redis.setex(dedupeKey, 300, JSON.stringify({
        createdAt: new Date().toISOString(),
      }));

      return true;
    } catch (error) {
      // If Redis fails, allow alert (fail open)
      return true;
    }
  }

  /**
   * Trend analysis using sliding window
   */
  private async analyzeTrend(values: number[]): Promise<TrendAnalysis> {
    if (values.length < 2) {
      return { direction: 'stable', avgChange: 0, volatility: 0 };
    }

    const changes: number[] = [];
    for (let i = 1; i < values.length; i++) {
      changes.push(values[i] - values[i - 1]);
    }

    const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
    const variance =
      changes.reduce((a, val) => a + Math.pow(val - avgChange, 2), 0) /
      changes.length;
    const volatility = Math.sqrt(variance);

    let direction: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (avgChange > 0.5) direction = 'increasing';
    if (avgChange < -0.5) direction = 'decreasing';

    return { direction, avgChange, volatility };
  }

  /**
   * Get recent readings for trend analysis
   */
  private async getRecentReadings(
    sensorId: string,
    timeWindowMs: number
  ): Promise<any[]> {
    const cutoffTime = new Date(Date.now() - timeWindowMs);

    return this.db
      .collection('sensor_readings')
      .find({
        'metadata.sensor_id': sensorId,
        timestamp: { $gte: cutoffTime },
      })
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();
  }

  /**
   * Store alerts in MongoDB
   */
  private async storeAlerts(alerts: Alert[]): Promise<void> {
    const collection = this.db.collection('alerts');

    for (const alert of alerts) {
      try {
        // Convert alert to insertable format without _id
        const alertToInsert = { ...alert };
        delete alertToInsert._id;
        await collection.insertOne(alertToInsert as any);

        this.logger?.info({
          message: 'Alert created',
          type: alert.type,
          sensor_id: alert.sensor_id,
          severity: alert.severity,
        });
      } catch (error) {
        this.logger?.error('Error storing alert:', error);
      }
    }
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(
    alertId: string,
    userId: string
  ): Promise<void> {
    await this.db.collection('alerts').updateOne(
      { _id: new ObjectId(alertId) },
      {
        $set: {
          acknowledged: true,
          status: 'ACKNOWLEDGED',
          acknowledged_at: new Date(),
          acknowledged_by: userId,
        },
      }
    );
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string): Promise<void> {
    await this.db.collection('alerts').updateOne(
      { _id: new ObjectId(alertId) },
      {
        $set: {
          status: 'RESOLVED',
          resolved_at: new Date(),
        },
      }
    );
  }
}
