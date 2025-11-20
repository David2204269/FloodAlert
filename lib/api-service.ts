/**
 * Servicio de API para comunicación con el backend
 * Maneja obtención de sensores, lecturas y alertas
 */

import { Lectura, Sensor, Alerta, EstadisticasSensor, ApiResponse } from "@/src/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

/**
 * Obtener todas las lecturas de sensores
 */
export async function obtenerLecturas(): Promise<Lectura[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/sensores`, {
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
 * Obtener sensores configurados (será un endpoint que implementaremos)
 * Por ahora retorna sensores mock con datos de las lecturas
 */
export async function obtenerSensores(): Promise<Sensor[]> {
  try {
    const lecturas = await obtenerLecturas();

    // Generar sensores mock basados en lecturas
    // En producción, habría un endpoint específico para esto
    const sensoresMap = new Map<string, Sensor>();

    const sensoresDefault: Sensor[] = [
      {
        id: "sensor-1",
        nombre: "Estación Río Principal",
        descripcion: "Sensor de nivel en río principal",
        ubicacion: {
          latitud: 10.3521,
          longitud: -75.4727,
          zona: "Centro",
          provincia: "Atlántico",
        },
        tipo: "NIVEL_AGUA",
        estado: "ACTIVO",
        umbralAlerta: {
          lluviaMax: 500,
          nivelCrítico: "CRÍTICO",
          flujoMax: 250,
        },
      },
      {
        id: "sensor-2",
        nombre: "Pluviómetro Zona Norte",
        descripcion: "Sensor de lluvia acumulada",
        ubicacion: {
          latitud: 10.4521,
          longitud: -75.4727,
          zona: "Norte",
          provincia: "Atlántico",
        },
        tipo: "PLUVIÓMETRO",
        estado: "ACTIVO",
        umbralAlerta: {
          lluviaMax: 400,
          nivelCrítico: "ALTO",
          flujoMax: 200,
        },
      },
      {
        id: "sensor-3",
        nombre: "Estación Híbrida Sur",
        descripcion: "Sensor multifunción",
        ubicacion: {
          latitud: 10.2521,
          longitud: -75.4727,
          zona: "Sur",
          provincia: "Atlántico",
        },
        tipo: "HÍBRIDO",
        estado: "ACTIVO",
        umbralAlerta: {
          lluviaMax: 450,
          nivelCrítico: "ALTO",
          flujoMax: 200,
        },
      },
    ];

    // Asignar última lectura a cada sensor
    sensoresDefault.forEach((sensor) => {
      const ultimaLectura = lecturas
        .filter((l) => l.sensorId === sensor.id)
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))[0];

      if (ultimaLectura) {
        sensor.ultimaLectura = ultimaLectura;
        sensor.ultimaActualizacion = new Date(ultimaLectura.timestamp * 1000);
      }
    });

    return sensoresDefault;
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
