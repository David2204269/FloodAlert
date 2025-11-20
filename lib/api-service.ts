/**
 * Servicio de API para comunicación con el backend
 * Maneja obtención de sensores, lecturas y alertas
 */

import { Lectura, Sensor, Alerta, EstadisticasSensor, ApiResponse } from "@/src/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
const FETCH_TIMEOUT = 10000; // 10 segundos

/**
 * Helper para fetch con timeout
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = FETCH_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Obtener todas las lecturas de sensores
 */
export async function obtenerLecturas(): Promise<Lectura[]> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/sensores`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: ApiResponse<Lectura[]> = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Error al obtener lecturas:", error);
    return [];
  }
}

/**
 * Obtener lectura específica por ID
 */
export async function obtenerLecturaPorId(id: string): Promise<Lectura | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/sensores/${id}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: ApiResponse<Lectura> = await response.json();
    return data.data || null;
  } catch (error) {
    console.error("Error al obtener lectura:", error);
    return null;
  }
}

/**
 * Registrar nueva lectura de sensor
 */
export async function registrarLectura(lectura: Lectura): Promise<Lectura | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/sensores`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lectura),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: ApiResponse<Lectura> = await response.json();
    return data.data || null;
  } catch (error) {
    console.error("Error al registrar lectura:", error);
    return null;
  }
}

/**
 * Obtener sensores configurados desde API
 */
export async function obtenerSensores(): Promise<Sensor[]> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/sensores/configuracion`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      console.warn(`API error: ${response.status}`);
      return [];
    }

    const data: ApiResponse<Sensor[]> = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Error al obtener sensores:", error);
    return [];
  }
}

/**
 * Calcular estadísticas de sensor
 */
export function calcularEstadisticas(
  sensorId: string,
  sensorNombre: string,
  lecturas: Lectura[],
  periodo: "1h" | "24h" | "7d" | "30d" = "24h"
): EstadisticasSensor {
  // Filtrar lecturas del sensor en el período
  const ahora = Date.now() / 1000;
  const periodosSegundos = {
    "1h": 3600,
    "24h": 86400,
    "7d": 604800,
    "30d": 2592000,
  };

  const lecturasFiltradas = lecturas.filter(
    (l) =>
      l.sensorId === sensorId &&
      l.timestamp > ahora - periodosSegundos[periodo]
  );

  const lluvia = {
    promedio:
      lecturasFiltradas.reduce((sum, l) => sum + l.lluvia_ao, 0) /
        lecturasFiltradas.length || 0,
    maximo: Math.max(...lecturasFiltradas.map((l) => l.lluvia_ao), 0),
    minimo: Math.min(...lecturasFiltradas.map((l) => l.lluvia_ao), 0),
  };

  const temperatura = {
    promedio:
      lecturasFiltradas.reduce((sum, l) => sum + l.temperatura_c, 0) /
        lecturasFiltradas.length || 0,
    maximo: Math.max(...lecturasFiltradas.map((l) => l.temperatura_c), 0),
    minimo: Math.min(...lecturasFiltradas.map((l) => l.temperatura_c), 0),
  };

  const flujo = {
    promedio:
      lecturasFiltradas.reduce((sum, l) => sum + l.flujo_lmin, 0) /
        lecturasFiltradas.length || 0,
    maximo: Math.max(...lecturasFiltradas.map((l) => l.flujo_lmin), 0),
    minimo: Math.min(...lecturasFiltradas.map((l) => l.flujo_lmin), 0),
  };

  const nivelesArray = lecturasFiltradas.map((l) => l.nivel_flotador);
  const nivelPromedio = nivelesArray[Math.floor(nivelesArray.length / 2)] || "NORMAL";

  return {
    sensorId,
    sensorNombre,
    periodo,
    lluvia,
    temperatura,
    nivel: {
      promedio: nivelPromedio,
      ultimas: nivelesArray.slice(-10),
    },
    flujo,
    alertasCount: lecturasFiltradas.filter((l) => l.nivel_flotador === "CRÍTICO").length,
  };
}
