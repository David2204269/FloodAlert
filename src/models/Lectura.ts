/**
 * Modelo de Lectura de Sensores
 * Define la interfaz y el esquema para documentos en la colección "lecturas"
 */

import { ObjectId } from "mongodb";

export interface Lectura {
  _id?: ObjectId;
  lluvia_ao: number;
  humedad_ao: number;
  nivel_flotador: string;
  flujo_lmin: number;
  temperatura_c: number;
  timestamp: number;      // Timestamp enviado desde TTGO (milisegundos o segundos)
  createdAt?: Date;       // Creado automáticamente en el backend
}

export type LecturaInput = Omit<Lectura, '_id' | 'createdAt'>;
