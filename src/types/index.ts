/**
 * Modelos de datos para el sistema de alertas de inundación
 */

// Tipo de nivel de agua
export type NivelFlotador = "BAJO" | "NORMAL" | "ALTO" | "CRÍTICO";

// Tipo de severidad de alerta
export type SeveridadAlerta = "INFO" | "WARNING" | "CRITICAL" | "RESOLVED";

// Tipo de origen de datos
export type OrigenDato = "SENSOR_IOT" | "ESTACION_OFICIAL" | "API_EXTERNA" | "PREDICCION";

/**
 * Lectura de sensor
 * Representa una medición puntual de un sensor
 */
export interface Lectura {
  id?: string;
  _id?: string;
  sensorId?: string;
  sensor_id?: string;
  
  // Datos de medición
  nivelAgua?: number;
  water_level_cm?: number; // En cm
  
  lluvia_ao?: number;
  rain_accumulated_mm?: number; // En mm
  
  caudal?: number;
  flow_rate_lmin?: number; // En L/min
  
  temperatura?: number;
  temperature_c?: number; // En °C
  
  humedad?: number;
  humidity_percent?: number; // En %
  
  bateria?: number;
  battery_percent?: number; // En %
  
  // Señal (opcional)
  rssi?: number; // LoRa signal strength
  snr?: number; // Signal-to-noise ratio
  signal_quality?: "excellent" | "good" | "fair" | "poor";
  
  // Metadata
  gateway_id?: string;
  humedad_ao?: number;
  flujo_lmin?: number;
  nivel_flotador?: NivelFlotador;
  
  timestamp?: number;
  createdAt?: Date;
}

/**
 * Configuración de sensor
 * Metadatos y ubicación del sensor
 */
export interface Sensor {
  id: string;
  nombre: string;
  descripcion?: string;
  ubicacion: {
    latitud: number;
    longitud: number;
    zona?: string;
    provincia?: string;
  };
  tipo: "NIVEL_AGUA" | "PLUVIÓMETRO" | "HÍBRIDO";
  estado: "ACTIVO" | "INACTIVO" | "MANTENIMIENTO";
  ultimaLectura?: Lectura;
  ultimaActualizacion?: Date;
  umbralAlerta?: {
    lluviaMax: number;
    nivelCrítico: NivelFlotador;
    flujoMax: number;
  };
}

/**
 * Alerta generada
 * Se genera cuando se cumplen condiciones de alerta
 */
export interface Alerta {
  _id?: string;
  sensorId: string;
  sensorNombre: string;
  severidad: SeveridadAlerta;
  tipo: "NIVEL_ALTO" | "LLUVIA_FUERTE" | "FLUJO_ALTO" | "PREDICCION";
  titulo: string;
  descripcion: string;
  datos: {
    valor: number;
    umbral: number;
    ubicacion: {
      latitud: number;
      longitud: number;
    };
  };
  timestamp: number;
  createdAt: Date;
  resuelta?: boolean;
  resolucionAt?: Date;
}

/**
 * Estadísticas agregadas
 * Para mostrar en el dashboard
 */
export interface EstadisticasSensor {
  sensorId: string;
  sensorNombre: string;
  periodo: "1h" | "24h" | "7d" | "30d";
  
  lluvia: {
    promedio: number;
    maximo: number;
    minimo: number;
  };
  
  temperatura: {
    promedio: number;
    maximo: number;
    minimo: number;
  };
  
  nivel: {
    promedio: string; // BAJO, NORMAL, ALTO, CRÍTICO
    ultimas: NivelFlotador[];
  };
  
  flujo: {
    promedio: number;
    maximo: number;
    minimo: number;
  };
  
  alertasCount: number;
  ultimaAlerta?: Alerta;
}

/**
 * Respuesta de la API
 */
export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Estado global de la aplicación
 */
export interface AppState {
  sensores: Sensor[];
  lecturas: Lectura[];
  alertas: Alerta[];
  estadisticas: EstadisticasSensor[];
  loading: boolean;
  error?: string;
  ultimaActualizacion?: Date;
}
