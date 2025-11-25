/**
 * Modelo de Lectura de Sensores
 * Define la interfaz y el esquema para documentos en la colección "lecturas"
 * Estructura actualizada según datos del Arduino/TTGO
 */

export interface Lectura {
  id?: number;            // ID autogenerado por Supabase
  temperatura_c: string;  // Temperatura en °C (string con decimales ej: "26.12")
  humedad_pct: number;    // Humedad en porcentaje
  caudal_l_s: number;     // Caudal en litros por segundo
  lluvia_mm: number;      // Lluvia en milímetros
  nivel_m: number;        // Nivel del agua en metros
  seq: number;            // Número de secuencia del paquete
  timestamp: number;      // Timestamp enviado desde TTGO (segundos)
  created_at?: string;    // Creado automáticamente por Supabase
}

export type LecturaInput = Omit<Lectura, 'id' | 'created_at'>;
