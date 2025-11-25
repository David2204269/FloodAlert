/**
 * API REST - GET, PATCH, DELETE en /api/sensores/[id]
 * 
 * GET: Obtiene una lectura específica por ID
 * PATCH: Actualiza campos individuales de una lectura
 * DELETE: Elimina una lectura específica por ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/lib/supabase';
import { Lectura } from '@/src/models/Lectura';

const TABLE_NAME = 'lecturas';

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

    // Validar que sea un número válido
    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) {
      return NextResponse.json(
        { ok: false, error: 'ID inválido' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', idNum)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { ok: false, error: 'Lectura no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      data,
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

    // Validar que sea un número válido
    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) {
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

    // No permitir actualizar id o created_at
    delete body.id;
    delete body.created_at;

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(body)
      .eq('id', idNum)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { ok: false, error: 'Lectura no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      data,
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

    // Validar que sea un número válido
    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) {
      return NextResponse.json(
        { ok: false, error: 'ID inválido' },
        { status: 400 }
      );
    }

    const { error, count } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', idNum);

    if (error || count === 0) {
      return NextResponse.json(
        { ok: false, error: 'Lectura no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        deletedCount: count,
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
