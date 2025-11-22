/**
 * Servicio de API para comunicación con el backend
 * Maneja obtención de sensores, lecturas y alertas
 */

import { Lectura, Sensor, Alerta, EstadisticasSensor, ApiResponse } from "@/src/types";

// Backend API URL - apunta al backend Express en puerto 3001
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
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
 * Obtener todas las lecturas de sensores desde el nuevo backend
 * Versión simplificada para evitar bucles
 */
export async function obtenerLecturas(): Promise<Lectura[]> {
  try {
    const { mapearBackendALectura } = await import("@/lib/data-mapper");
    
    // Solo obtener lecturas de SENSOR_001 para evitar múltiples peticiones
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/data/history/SENSOR_001?hours=24&limit=50`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      },
      5000 // Timeout más corto
    );

    if (!response.ok) {
      console.warn(`API error al obtener lecturas: ${response.status}`);
      return [];
    }

    const data = await response.json();
    
    // Mapear datos del backend al formato Lectura
    if (data.ok && data.data && Array.isArray(data.data)) {
      return data.data.map((item: any) => mapearBackendALectura(item));
    }
    
    return [];
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
 * Obtener sensores configurados desde el nuevo backend
 * Versión simplificada que evita bucles infinitos
 */
export async function obtenerSensores(): Promise<Sensor[]> {
  try {
    const { mapearBackendALectura } = await import("@/lib/data-mapper");
    const sensores: Sensor[] = [];

    // Intentar obtener gateways primero (sin hacer múltiples peticiones)
    try {
      const gatewaysResponse = await fetchWithTimeout(`${API_BASE_URL}/data/gateways`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      }, 5000); // Timeout más corto

      if (gatewaysResponse.ok) {
        const gatewaysData = await gatewaysResponse.json();
        
        if (gatewaysData.ok && gatewaysData.gateways && gatewaysData.gateways.length > 0) {
          // Solo usar el primer gateway para evitar múltiples peticiones
          const gateway = gatewaysData.gateways[0];
          
          // Intentar obtener una lectura reciente del gateway (solo una petición)
          try {
            const gatewayResponse = await fetchWithTimeout(
              `${API_BASE_URL}/data/gateway/${gateway.gateway_id}?limit=10`,
              {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
              },
              5000
            );

            if (gatewayResponse.ok) {
              const gatewayData = await gatewayResponse.json();
              
              if (gatewayData.ok && gatewayData.data && Array.isArray(gatewayData.data)) {
                // Agrupar por sensor_id (solo de las lecturas que ya tenemos)
                const sensorMap = new Map<string, any>();
                
                gatewayData.data.forEach((reading: any) => {
                  const sensorId = reading.metadata?.sensor_id || reading.sensor_id;
                  if (sensorId && !sensorMap.has(sensorId)) {
                    sensorMap.set(sensorId, reading);
                  }
                });

                // Crear sensores desde las lecturas encontradas
                sensorMap.forEach((reading, sensorId) => {
                  const lectura = mapearBackendALectura(reading);
                  
                  sensores.push({
                    id: sensorId,
                    nombre: `Sensor ${sensorId}`,
                    descripcion: `Sensor conectado al gateway ${gateway.gateway_id}`,
                    ubicacion: {
                      latitud: gateway.location?.lat || -34.6037,
                      longitud: gateway.location?.lng || -58.3816,
                      zona: gateway.name || "Zona desconocida",
                    },
                    tipo: "HÍBRIDO",
                    estado: "ACTIVO",
                    ultimaLectura: lectura,
                    ultimaActualizacion: new Date(reading.received_at || reading.timestamp || Date.now()),
                  });
                });
              }
            }
          } catch (err) {
            console.warn("Error al obtener datos del gateway:", err);
          }
        }
      }
    } catch (err) {
      console.warn("Error al obtener gateways:", err);
    }

    // Si no hay sensores, crear uno por defecto basado en SENSOR_001 (solo una petición)
    if (sensores.length === 0) {
      try {
        const defaultResponse = await fetchWithTimeout(
          `${API_BASE_URL}/data/status/SENSOR_001`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
          },
          5000
        );

        if (defaultResponse.ok) {
          const defaultData = await defaultResponse.json();
          if (defaultData.ok && defaultData.data) {
            const lectura = mapearBackendALectura(defaultData.data);
            
            sensores.push({
              id: "SENSOR_001",
              nombre: "Sensor Principal",
              descripcion: "Sensor de monitoreo de inundaciones",
              ubicacion: {
                latitud: -34.6037,
                longitud: -58.3816,
                zona: "Buenos Aires",
              },
              tipo: "HÍBRIDO",
              estado: "ACTIVO",
              ultimaLectura: lectura,
              ultimaActualizacion: new Date(),
            });
          }
        }
      } catch (err) {
        // Si falla, crear un sensor vacío para que el frontend no se quede cargando
        console.warn("No se pudo obtener sensor por defecto, creando sensor vacío:", err);
        sensores.push({
          id: "SENSOR_001",
          nombre: "Sensor Principal",
          descripcion: "Esperando datos del sensor",
          ubicacion: {
            latitud: -34.6037,
            longitud: -58.3816,
            zona: "Buenos Aires",
          },
          tipo: "HÍBRIDO",
          estado: "ACTIVO",
        });
      }
    }

    return sensores;
  } catch (error) {
    console.error("Error al obtener sensores:", error);
    // Retornar un sensor vacío para evitar que el frontend se quede cargando
    return [{
      id: "SENSOR_001",
      nombre: "Sensor Principal",
      descripcion: "Error al cargar datos",
      ubicacion: {
        latitud: -34.6037,
        longitud: -58.3816,
        zona: "Buenos Aires",
      },
      tipo: "HÍBRIDO",
      estado: "INACTIVO",
    }];
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
      lecturasFiltradas.reduce((sum, l) => sum + (l.lluvia_ao || l.rain_accumulated_mm || 0), 0) /
        lecturasFiltradas.length || 0,
    maximo: Math.max(...lecturasFiltradas.map((l) => l.lluvia_ao || l.rain_accumulated_mm || 0), 0),
    minimo: Math.min(...lecturasFiltradas.map((l) => l.lluvia_ao || l.rain_accumulated_mm || 0), 0),
  };

  const temperatura = {
    promedio:
      lecturasFiltradas.reduce((sum, l) => sum + (l.temperatura_c || l.temperature_c || 0), 0) /
        lecturasFiltradas.length || 0,
    maximo: Math.max(...lecturasFiltradas.map((l) => l.temperatura_c || l.temperature_c || 0), 0),
    minimo: Math.min(...lecturasFiltradas.map((l) => l.temperatura_c || l.temperature_c || 0), 0),
  };

  const flujo = {
    promedio:
      lecturasFiltradas.reduce((sum, l) => sum + (l.flujo_lmin || l.flow_rate_lmin || 0), 0) /
        lecturasFiltradas.length || 0,
    maximo: Math.max(...lecturasFiltradas.map((l) => l.flujo_lmin || l.flow_rate_lmin || 0), 0),
    minimo: Math.min(...lecturasFiltradas.map((l) => l.flujo_lmin || l.flow_rate_lmin || 0), 0),
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
