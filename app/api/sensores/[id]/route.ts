/**
 * API REST - GET, PATCH, DELETE en /api/sensores/[id]
 * 
 * GET: Obtiene una lectura específica por ID
 * PATCH: Actualiza campos individuales de una lectura
 * DELETE: Elimina una lectura específica por ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import clientPromise from '@/src/lib/mongodb';
import { Lectura } from '@/src/models/Lectura';

const DB_NAME = 'flood_alert';
const COLLECTION_NAME = 'lecturas';

/**
 * GET - Obtener una lectura por ID
 * Retorna un documento específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validar que sea un ObjectId válido
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { ok: false, error: 'ID inválido' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection<Lectura>(COLLECTION_NAME);

    const lectura = await collection.findOne({
      _id: new ObjectId(id),
    });

    if (!lectura) {
      return NextResponse.json(
        { ok: false, error: 'Lectura no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: lectura,
    });
  } catch (error) {
    console.error('Error en GET /api/sensores/[id]:', error);
    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Actualizar campos individuales de una lectura
 * Solo actualiza los campos enviados en el body
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validar que sea un ObjectId válido
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { ok: false, error: 'ID inválido' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validar que el body no esté vacío
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Body vacío. Proporciona al menos un campo a actualizar' },
        { status: 400 }
      );
    }

    // No permitir actualizar _id o createdAt
    delete body._id;
    delete body.createdAt;

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection<Lectura>(COLLECTION_NAME);

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: body },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json(
        { ok: false, error: 'Lectura no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { ok: false, error: 'JSON inválido' },
        { status: 400 }
      );
    }

    console.error('Error en PATCH /api/sensores/[id]:', error);
    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Eliminar una lectura específica por ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validar que sea un ObjectId válido
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { ok: false, error: 'ID inválido' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection<Lectura>(COLLECTION_NAME);

    const result = await collection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { ok: false, error: 'Lectura no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        deletedCount: result.deletedCount,
      },
    });
  } catch (error) {
    console.error('Error en DELETE /api/sensores/[id]:', error);
    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
