/**
 * Funciones de mapeo para convertir datos del formato TTGO al formato del frontend
 */

import { Lectura, NivelFlotador } from "@/src/types";

/**
 * Datos recibidos del TTGO (formato nuevo)
 */
export interface TTGOReading {
  sensor_id: string;
  gateway_id?: string;
  timestamp: number | string | Date;
  
  // Formato TTGO (nuevo)
  temperatura_c?: number;
  humedad_pct?: number;
  caudal_l_s?: number;
  lluvia_mm?: number;
  nivel_m?: number;
  seq?: number;
  
  // Formato legacy (compatibilidad)
  temperature_c?: number;
  humidity_percent?: number;
  flow_rate_lmin?: number;
  rain_accumulated_mm?: number;
  water_level_cm?: number;
  
  // Metadata
  rssi?: number;
  snr?: number;
  signal_quality?: "excellent" | "good" | "fair" | "poor";
  battery_percent?: number;
}

/**
 * Convierte nivel de agua en metros a nivel_flotador
 */
export function calcularNivelFlotador(nivel_m: number | undefined): NivelFlotador {
  if (nivel_m === undefined || nivel_m === null) {
    return "NORMAL";
  }
  
  // Convertir metros a cm para comparación
  const nivel_cm = nivel_m * 100;
  
  if (nivel_cm >= 80) {
    return "CRÍTICO";
  } else if (nivel_cm >= 50) {
    return "ALTO";
  } else if (nivel_cm >= 20) {
    return "NORMAL";
  } else {
    return "BAJO";
  }
}

/**
 * Mapea datos del formato TTGO al formato Lectura del frontend
 */
export function mapearTTGOALectura(ttgoData: TTGOReading, readingId?: string): Lectura {
  // Detectar formato (TTGO nuevo vs legacy)
  const isTTGOFormat = ttgoData.temperatura_c !== undefined || ttgoData.humedad_pct !== undefined;
  
  // Extraer valores según el formato
  const temperatura_c = isTTGOFormat 
    ? (ttgoData.temperatura_c ?? ttgoData.temperature_c ?? 0)
    : (ttgoData.temperature_c ?? 0);
  
  const humedad_pct = isTTGOFormat
    ? (ttgoData.humedad_pct ?? ttgoData.humidity_percent ?? 0)
    : (ttgoData.humidity_percent ?? 0);
  
  const caudal_l_s = isTTGOFormat
    ? (ttgoData.caudal_l_s ?? 0)
    : 0;
  
  const lluvia_mm = isTTGOFormat
    ? (ttgoData.lluvia_mm ?? 0)
    : (ttgoData.rain_accumulated_mm ?? 0);
  
  const nivel_m = isTTGOFormat
    ? (ttgoData.nivel_m ?? 0)
    : (ttgoData.water_level_cm ? ttgoData.water_level_cm / 100 : 0);
  
  // Convertir caudal de L/s a L/min
  const flujo_lmin = caudal_l_s * 60;
  
  // Convertir nivel de metros a cm
  const water_level_cm = nivel_m * 100;
  
  // Calcular nivel_flotador
  const nivel_flotador = calcularNivelFlotador(nivel_m);
  
  // Procesar timestamp
  let timestamp: number;
  if (typeof ttgoData.timestamp === 'string') {
    timestamp = new Date(ttgoData.timestamp).getTime() / 1000;
  } else if (ttgoData.timestamp instanceof Date) {
    timestamp = ttgoData.timestamp.getTime() / 1000;
  } else {
    // Si es número, asumir que está en segundos (si es muy grande, está en ms)
    timestamp = ttgoData.timestamp > 10000000000 
      ? ttgoData.timestamp / 1000 
      : ttgoData.timestamp;
  }
  
  return {
    id: readingId,
    sensorId: ttgoData.sensor_id,
    sensor_id: ttgoData.sensor_id,
    
    // Datos mapeados
    temperatura_c,
    temperature_c: temperatura_c,
    humedad_ao: humedad_pct,
    humidity_percent: humedad_pct,
    flujo_lmin,
    flow_rate_lmin: flujo_lmin,
    lluvia_ao: lluvia_mm,
    rain_accumulated_mm: lluvia_mm,
    nivelAgua: water_level_cm,
    water_level_cm,
    
    // Metadata
    nivel_flotador,
    gateway_id: ttgoData.gateway_id,
    rssi: ttgoData.rssi,
    snr: ttgoData.snr,
    signal_quality: ttgoData.signal_quality,
    battery_percent: ttgoData.battery_percent,
    
    timestamp,
    createdAt: new Date(timestamp * 1000),
  };
}

/**
 * Mapea datos del backend MongoDB al formato Lectura
 */
export function mapearBackendALectura(backendData: any): Lectura {
  // El backend puede devolver datos en formato TTGO o legacy
  const ttgoData: TTGOReading = {
    sensor_id: backendData.metadata?.sensor_id || backendData.sensor_id || "",
    gateway_id: backendData.metadata?.gateway_id || backendData.gateway_id,
    timestamp: backendData.timestamp || backendData.received_at || new Date(),
    
    // Formato TTGO
    temperatura_c: backendData.temperatura_c,
    humedad_pct: backendData.humedad_pct,
    caudal_l_s: backendData.caudal_l_s,
    lluvia_mm: backendData.lluvia_mm,
    nivel_m: backendData.nivel_m,
    
    // Formato legacy
    temperature_c: backendData.temperature_c,
    humidity_percent: backendData.humidity_percent,
    flow_rate_lmin: backendData.flow_rate_lmin,
    rain_accumulated_mm: backendData.rain_accumulated_mm,
    water_level_cm: backendData.water_level_cm,
    
    // Metadata
    rssi: backendData.rssi,
    snr: backendData.snr,
    signal_quality: backendData.signal_quality,
    battery_percent: backendData.battery_percent,
  };
  
  return mapearTTGOALectura(ttgoData, backendData._id?.toString() || backendData.reading_id);
}

