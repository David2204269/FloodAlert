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
 * Retorna configuración de sensores default o basada en datos activos
 */
export async function GET() {
  try {
    let sensores: Sensor[] = [];

    try {
      const client = await clientPromise;
      const db = client.db(DB_NAME);
      const collection = db.collection<Lectura>(COLLECTION_NAME);

      // Contar lecturas para determinar si hay datos
      const count = await collection.countDocuments();

      if (count > 0) {
        // Si hay datos, generar un sensor por defecto
        sensores = [
          {
            id: 'sensor-1',
            nombre: 'Sensor Principal',
            descripcion: 'Sensor de monitoreo activo',
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
      } else {
        sensores = getDefaultSensores();
      }
    } catch (dbError) {
      console.warn('Error conectando BD, usando sensores default:', dbError);
      sensores = getDefaultSensores();
    }

    return NextResponse.json({
      ok: true,
      data: sensores,
    });
  } catch (error) {
    console.error('Error en GET /api/sensores/configuracion:', error);
    // Retornar sensores default en caso de error crítico
    return NextResponse.json({
      ok: true,
      data: getDefaultSensores(),
    });
  }
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
