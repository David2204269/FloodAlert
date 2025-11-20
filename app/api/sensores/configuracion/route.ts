/**
 * API REST - GET /api/sensores/configuracion
 * 
 * Retorna la configuración de sensores instalados
 * Genera configuración basada en sensores activos en la base de datos
 */

import { NextResponse } from 'next/server';
import clientPromise from '@/src/lib/mongodb';
import { Lectura } from '@/src/models/Lectura';
import { Sensor } from '@/src/types';

const DB_NAME = 'flood_alert';
const COLLECTION_NAME = 'lecturas';

/**
 * GET - Obtener configuración de sensores
 * Analiza las lecturas para determinar qué sensores están activos
 * y retorna su configuración
 */
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection<Lectura>(COLLECTION_NAME);

    // Obtener últimas lecturas para determinar sensores activos
    const lecturas = await collection
      .find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    if (lecturas.length === 0) {
      // Si no hay lecturas, retornar sensores default
      return NextResponse.json({
        ok: true,
        data: getDefaultSensores(),
      });
    }

    // Extraer sensores únicos por sensorId
    const sensorIds = new Set<string>();
    const sensoresMap = new Map<string, Lectura>();

    lecturas.forEach((lectura) => {
      if (lectura.sensorId && !sensorIds.has(lectura.sensorId)) {
        sensorIds.add(lectura.sensorId);
        sensoresMap.set(lectura.sensorId, lectura);
      }
    });

    // Si no hay sensores identificados, usar defaults
    if (sensoresMap.size === 0) {
      return NextResponse.json({
        ok: true,
        data: getDefaultSensores(),
      });
    }

    // Mapear sensores activos a configuración
    const sensores: Sensor[] = Array.from(sensoresMap.entries()).map(
      ([sensorId, ultimaLectura], index) => ({
        id: sensorId,
        nombre: `Sensor ${index + 1}`,
        descripcion: `Sensor activo en la base de datos`,
        ubicacion: {
          latitud: 10.3521 + index * 0.1,
          longitud: -75.4727 + index * 0.1,
          zona: `Zona ${index + 1}`,
          provincia: 'Atlántico',
        },
        tipo: determineTipoSensor(ultimaLectura),
        estado: 'ACTIVO',
        umbralAlerta: {
          lluviaMax: 500,
          nivelCrítico: 'CRÍTICO',
          flujoMax: 250,
        },
        ultimaLectura: ultimaLectura,
        ultimaActualizacion: new Date(
          (ultimaLectura.timestamp || 0) * 1000
        ),
      })
    );

    return NextResponse.json({
      ok: true,
      data: sensores.length > 0 ? sensores : getDefaultSensores(),
    });
  } catch (error) {
    console.error('Error en GET /api/sensores/configuracion:', error);
    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * Determinar tipo de sensor basado en datos disponibles
 */
function determineTipoSensor(lectura: Lectura): string {
  if (lectura.nivel_flotador) return 'NIVEL_AGUA';
  if (lectura.flujo_lmin) return 'FLUJO';
  if (lectura.lluvia_ao) return 'PLUVIÓMETRO';
  return 'HÍBRIDO';
}

/**
 * Sensores por defecto si no hay datos
 */
function getDefaultSensores(): Sensor[] {
  return [
    {
      id: 'sensor-default-1',
      nombre: 'Sensor Principal',
      descripcion: 'Sensor de monitoreo',
      ubicacion: {
        latitud: 10.3521,
        longitud: -75.4727,
        zona: 'Centro',
        provincia: 'Atlántico',
      },
      tipo: 'HÍBRIDO',
      estado: 'ACTIVO',
      umbralAlerta: {
        lluviaMax: 500,
        nivelCrítico: 'CRÍTICO',
        flujoMax: 250,
      },
    },
  ];
}
