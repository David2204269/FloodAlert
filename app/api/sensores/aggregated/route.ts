/**
 * API REST - GET /api/sensores/aggregated
 * 
 * Retorna lecturas agregadas cada 10 minutos de las últimas 24 horas
 * Optimizado para gráficas con muchos datos
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/lib/supabase';

const TABLE_NAME = 'lecturas';

export async function GET(request: NextRequest) {
  try {
    // Calcular timestamp de hace 24 horas
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // Obtener todas las lecturas de las últimas 24h ordenadas
    const { data: allReadings, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .gte('created_at', twentyFourHoursAgo.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error al obtener lecturas:', error);
      return NextResponse.json(
        { ok: false, error: 'Error al obtener lecturas' },
        { status: 500 }
      );
    }

    if (!allReadings || allReadings.length === 0) {
      return NextResponse.json({
        ok: true,
        data: [],
      });
    }

    // Agrupar por intervalos de 10 minutos
    const aggregatedData: any[] = [];
    const intervalMs = 10 * 60 * 1000; // 10 minutos en milisegundos
    
    let currentInterval: number | null = null;
    let intervalReadings: any[] = [];

    allReadings.forEach((reading) => {
      const timestamp = new Date(reading.created_at).getTime();
      const interval = Math.floor(timestamp / intervalMs);

      if (currentInterval === null) {
        currentInterval = interval;
      }

      if (interval === currentInterval) {
        // Misma ventana de 10 minutos
        intervalReadings.push(reading);
      } else {
        // Nueva ventana - procesar la anterior
        if (intervalReadings.length > 0) {
          aggregatedData.push(aggregateReadings(intervalReadings));
        }
        
        // Iniciar nueva ventana
        currentInterval = interval;
        intervalReadings = [reading];
      }
    });

    // Procesar último grupo
    if (intervalReadings.length > 0) {
      aggregatedData.push(aggregateReadings(intervalReadings));
    }

    return NextResponse.json({
      ok: true,
      data: aggregatedData,
      meta: {
        originalCount: allReadings.length,
        aggregatedCount: aggregatedData.length,
        interval: '10 minutes',
        period: '24 hours',
      },
    });
  } catch (error) {
    console.error('Error en GET /api/sensores/aggregated:', error);
    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * Agregar múltiples lecturas en una sola, calculando promedios
 */
function aggregateReadings(readings: any[]): any {
  const count = readings.length;
  
  // Usar la última lectura como base
  const lastReading = readings[readings.length - 1];
  
  // Calcular promedios
  const avg = {
    temperatura_c: readings.reduce((sum, r) => sum + (parseFloat(r.temperatura_c) || 0), 0) / count,
    nivel_m: readings.reduce((sum, r) => sum + (parseFloat(r.nivel_m) || 0), 0) / count,
    caudal_l_s: readings.reduce((sum, r) => sum + (parseFloat(r.caudal_l_s) || 0), 0) / count,
    humedad_pct: readings.reduce((sum, r) => sum + (parseFloat(r.humedad_pct) || 0), 0) / count,
    lluvia_mm: readings.reduce((sum, r) => sum + (parseFloat(r.lluvia_mm) || 0), 0) / count,
  };

  return {
    id: lastReading.id,
    seq: lastReading.seq,
    temperatura_c: avg.temperatura_c.toFixed(2),
    nivel_m: avg.nivel_m.toFixed(3),
    caudal_l_s: avg.caudal_l_s.toFixed(2),
    humedad_pct: avg.humedad_pct.toFixed(1),
    lluvia_mm: avg.lluvia_mm.toFixed(2),
    created_at: lastReading.created_at,
    // Metadatos adicionales
    _aggregated: true,
    _count: count,
  };
}
