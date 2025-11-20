/**
 * API REST - GET, POST, DELETE en /api/sensores
 * 
 * POST: Recibe datos del sensor TTGO, valida e inserta en MongoDB
 * GET: Retorna todas las lecturas ordenadas por fecha DESC
 * DELETE: Elimina todas las lecturas de la colección
 */

import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/src/lib/mongodb';
import { Lectura } from '@/src/models/Lectura';
import { validateSensorData, ValidationError } from '@/src/utils/validateSensorData';

const DB_NAME = 'flood_alert';
const COLLECTION_NAME = 'lecturas';

/**
 * POST - Insertar nueva lectura de sensor
 * Recibe JSON del dispositivo TTGO y lo guarda en MongoDB
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar datos
    const validatedData = validateSensorData(body);

    // Conectar a MongoDB
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection<Lectura>(COLLECTION_NAME);

    // Insertar documento con timestamp automático
    const lecturaDocument: Lectura = {
      ...validatedData,
      createdAt: new Date(),
    };

    const result = await collection.insertOne(lecturaDocument);

    return NextResponse.json(
      {
        ok: true,
        data: {
          _id: result.insertedId,
          ...lecturaDocument,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 }
      );
    }

    console.error('Error en POST /api/sensores:', error);
    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * GET - Obtener todas las lecturas
 * Retorna todas las lecturas ordenadas por fecha descendente
 */
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection<Lectura>(COLLECTION_NAME);

    // Buscar todas las lecturas ordenadas por createdAt DESC
    const lecturas = await collection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      ok: true,
      data: lecturas,
    });
  } catch (error) {
    console.error('Error en GET /api/sensores:', error);
    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Eliminar todas las lecturas
 * Borra todos los documentos de la colección lecturas
 */
export async function DELETE() {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection<Lectura>(COLLECTION_NAME);

    const result = await collection.deleteMany({});

    return NextResponse.json({
      ok: true,
      data: {
        deletedCount: result.deletedCount,
      },
    });
  } catch (error) {
    console.error('Error en DELETE /api/sensores:', error);
    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
