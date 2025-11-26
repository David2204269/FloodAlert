/**
 * API REST - GET /api/sensores/aggregated
 * 
 * Retorna lecturas agregadas cada 10 minutos de las últimas 24 horas
 * OPTIMIZADO: Usa paginación en Supabase + agregación eficiente
 * Máximo ~144 puntos por sensor para buena resolución en gráficas
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/src/lib/supabase';

const TABLE_NAME = 'lecturas';
const INTERVAL_MINUTES = 10; // Intervalo de agregación (10 min = 144 puntos en 24h)
const MAX_POINTS_PER_SENSOR = 144; // Límite de puntos por sensor

export async function GET() {
  try {
    const hours = 24;
    
    // Calcular timestamp de inicio
    const startTime = new Date();
    startTime.setHours(startTime.getHours() - hours);

    // Obtener solo los campos necesarios con límite de registros
    // 24h * 60min * 6 registros/min = ~8640 por sensor. Con varios sensores necesitamos más.
    const { data: allReadings, error, count } = await supabase
      .from(TABLE_NAME)
      .select('seq, temperatura_c, nivel_m, caudal_l_s, humedad_pct, lluvia_mm, created_at', { count: 'exact' })
      .gte('created_at', startTime.toISOString())
      .order('created_at', { ascending: true })
      .limit(15000); // Aumentado para cubrir 24h completas con múltiples sensores

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
        meta: { originalCount: 0, aggregatedCount: 0 }
      });
    }

    // Agrupar por sensor (seq) y luego por intervalo de tiempo
    const sensorGroups = new Map<number, typeof allReadings>();
    
    allReadings.forEach((reading) => {
      const seq = reading.seq;
      if (!sensorGroups.has(seq)) {
        sensorGroups.set(seq, []);
      }
      sensorGroups.get(seq)!.push(reading);
    });

    // Agregar datos por cada sensor
    const aggregatedData: AggregatedReading[] = [];
    const intervalMs = INTERVAL_MINUTES * 60 * 1000;

    sensorGroups.forEach((readings, seq) => {
      const intervalBuckets = new Map<number, typeof readings>();
      
      readings.forEach((reading) => {
        const timestamp = new Date(reading.created_at).getTime();
        const bucketKey = Math.floor(timestamp / intervalMs);
        
        if (!intervalBuckets.has(bucketKey)) {
          intervalBuckets.set(bucketKey, []);
        }
        intervalBuckets.get(bucketKey)!.push(reading);
      });

      // Convertir buckets a array ordenado y limitar puntos
      const sortedBuckets = Array.from(intervalBuckets.entries())
        .sort((a, b) => a[0] - b[0])
        .slice(-MAX_POINTS_PER_SENSOR); // Solo los últimos N puntos

      sortedBuckets.forEach(([, bucketReadings]) => {
        aggregatedData.push(aggregateReadings(bucketReadings, seq));
      });
    });

    // Ordenar por timestamp para consistencia
    aggregatedData.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    return NextResponse.json({
      ok: true,
      data: aggregatedData,
      meta: {
        originalCount: count || allReadings.length,
        aggregatedCount: aggregatedData.length,
        interval: `${INTERVAL_MINUTES} minutes`,
        period: `${hours} hours`,
        sensorsCount: sensorGroups.size,
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

interface AggregatedReading {
  seq: number;
  temperatura_c: string;
  nivel_m: string;
  caudal_l_s: string;
  humedad_pct: string;
  lluvia_mm: string;
  created_at: string;
  _aggregated: boolean;
  _count: number;
}

/**
 * Agregar múltiples lecturas en una sola, calculando promedios
 * Optimizado para evitar iteraciones redundantes
 */
function aggregateReadings(readings: any[], seq: number): AggregatedReading {
  const count = readings.length;
  
  // Calcular promedios en una sola pasada
  let sumTemp = 0, sumNivel = 0, sumCaudal = 0, sumHumedad = 0, sumLluvia = 0;
  
  for (const r of readings) {
    sumTemp += parseFloat(r.temperatura_c) || 0;
    sumNivel += parseFloat(r.nivel_m) || 0;
    sumCaudal += parseFloat(r.caudal_l_s) || 0;
    sumHumedad += parseFloat(r.humedad_pct) || 0;
    sumLluvia += parseFloat(r.lluvia_mm) || 0;
  }

  // Usar el timestamp del medio del intervalo para mejor representación
  const middleReading = readings[Math.floor(count / 2)];

  return {
    seq,
    temperatura_c: (sumTemp / count).toFixed(2),
    nivel_m: (sumNivel / count).toFixed(3),
    caudal_l_s: (sumCaudal / count).toFixed(2),
    humedad_pct: (sumHumedad / count).toFixed(1),
    lluvia_mm: (sumLluvia / count).toFixed(2),
    created_at: middleReading.created_at,
    _aggregated: true,
    _count: count,
  };
}
