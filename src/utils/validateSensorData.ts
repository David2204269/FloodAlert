/**
 * Validación de datos de sensores
 * Verifica que los campos recibidos desde TTGO/Arduino tengan los tipos correctos
 */

import { LecturaInput } from '../models/Lectura';

export class ValidationError extends Error {
  constructor(public field: string, message: string) {
    super(`${field}: ${message}`);
    this.name = 'ValidationError';
  }
}

/**
 * Valida que los datos del sensor cumplan con los tipos esperados
 * @param data - Datos recibidos desde Arduino/TTGO
 * @throws {ValidationError} Si hay campos faltantes o tipos incorrectos
 */
export function validateSensorData(data: unknown): LecturaInput {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('payload', 'Debe ser un objeto JSON válido');
  }

  const obj = data as Record<string, unknown>;

  // Validar temperatura_c (puede venir como string o número)
  if (typeof obj.temperatura_c !== 'string' && typeof obj.temperatura_c !== 'number') {
    throw new ValidationError('temperatura_c', 'Debe ser una cadena de texto o número');
  }
  const temperatura_c = typeof obj.temperatura_c === 'number' 
    ? obj.temperatura_c.toFixed(2) 
    : obj.temperatura_c;

  // Validar humedad_pct
  if (typeof obj.humedad_pct !== 'number') {
    throw new ValidationError('humedad_pct', 'Debe ser un número');
  }

  // Validar caudal_l_s
  if (typeof obj.caudal_l_s !== 'number') {
    throw new ValidationError('caudal_l_s', 'Debe ser un número');
  }

  // Validar lluvia_mm
  if (typeof obj.lluvia_mm !== 'number') {
    throw new ValidationError('lluvia_mm', 'Debe ser un número');
  }

  // Validar nivel_m
  if (typeof obj.nivel_m !== 'number') {
    throw new ValidationError('nivel_m', 'Debe ser un número');
  }

  // Validar seq
  if (typeof obj.seq !== 'number') {
    throw new ValidationError('seq', 'Debe ser un número');
  }

  // Validar timestamp
  if (typeof obj.timestamp !== 'number') {
    throw new ValidationError('timestamp', 'Debe ser un número (segundos)');
  }

  return {
    temperatura_c,
    humedad_pct: obj.humedad_pct,
    caudal_l_s: obj.caudal_l_s,
    lluvia_mm: obj.lluvia_mm,
    nivel_m: obj.nivel_m,
    seq: obj.seq,
    timestamp: obj.timestamp,
  };
}
