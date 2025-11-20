/**
 * Validación de datos de sensores
 * Verifica que los campos recibidos desde TTGO tengan los tipos correctos
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
 * @param data - Datos recibidos desde TTGO
 * @throws {ValidationError} Si hay campos faltantes o tipos incorrectos
 */
export function validateSensorData(data: unknown): LecturaInput {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('payload', 'Debe ser un objeto JSON válido');
  }

  const obj = data as Record<string, unknown>;

  // Validar lluvia_ao
  if (typeof obj.lluvia_ao !== 'number') {
    throw new ValidationError('lluvia_ao', 'Debe ser un número');
  }

  // Validar humedad_ao
  if (typeof obj.humedad_ao !== 'number') {
    throw new ValidationError('humedad_ao', 'Debe ser un número');
  }

  // Validar nivel_flotador
  if (typeof obj.nivel_flotador !== 'string') {
    throw new ValidationError('nivel_flotador', 'Debe ser una cadena de texto');
  }

  // Validar flujo_lmin
  if (typeof obj.flujo_lmin !== 'number') {
    throw new ValidationError('flujo_lmin', 'Debe ser un número');
  }

  // Validar temperatura_c
  if (typeof obj.temperatura_c !== 'number') {
    throw new ValidationError('temperatura_c', 'Debe ser un número');
  }

  // Validar timestamp
  if (typeof obj.timestamp !== 'number') {
    throw new ValidationError('timestamp', 'Debe ser un número (milisegundos)');
  }

  return {
    lluvia_ao: obj.lluvia_ao,
    humedad_ao: obj.humedad_ao,
    nivel_flotador: obj.nivel_flotador,
    flujo_lmin: obj.flujo_lmin,
    temperatura_c: obj.temperatura_c,
    timestamp: obj.timestamp,
  };
}
