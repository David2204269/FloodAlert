/**
 * API REST - GET, POST, DELETE en /api/sensores
 * 
 * POST: Recibe datos del sensor TTGO/Arduino, valida e inserta en Supabase
 * GET: Retorna todas las lecturas ordenadas por fecha DESC
 * DELETE: Elimina todas las lecturas de la tabla
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/lib/supabase';
import { Lectura } from '@/src/models/Lectura';
import { validateSensorData, ValidationError } from '@/src/utils/validateSensorData';

const TABLE_NAME = 'lecturas';

/**
 * POST - Insertar nueva lectura de sensor
 * Recibe JSON del dispositivo TTGO/Arduino y lo guarda en Supabase
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar datos
    const validatedData = validateSensorData(body);

    // Insertar en Supabase (created_at se genera automáticamente)
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([validatedData])
      .select()
      .single();

    if (error) {
      console.error('Error al insertar en Supabase:', error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        data,
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
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al consultar Supabase:', error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: data || [],
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
 * Borra todos los registros de la tabla lecturas
 */
export async function DELETE() {
  try {
    const { error, count } = await supabase
      .from(TABLE_NAME)
      .delete()
      .neq('id', 0); // Elimina todos los registros (condición siempre verdadera)

    if (error) {
      console.error('Error al eliminar en Supabase:', error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        deletedCount: count || 0,
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
