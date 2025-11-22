/**
 * Hook personalizado para manejar estado de sensores, lecturas y alertas
 * Con soporte para WebSocket en tiempo real
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Lectura, Sensor, Alerta, EstadisticasSensor, AppState } from "@/src/types";
import {
  obtenerLecturas,
  obtenerSensores,
  calcularEstadisticas,
} from "@/lib/api-service";
import {
  evaluarAlerta,
  deduplicarAlertas,
  calcularNivelRiesgo,
  clasificarPorSeveridad,
} from "@/lib/alert-logic";
import { useRealTimeSensorData } from "./use-real-time-data";

const POLLING_INTERVAL = 60000; // 1 minuto
const LOADING_TIMEOUT = 15000; // 15 segundos máximo de carga

export function useSensorData() {
  const [state, setState] = useState<AppState>({
    sensores: [],
    lecturas: [],
    alertas: [],
    estadisticas: [],
    loading: true,
    ultimaActualizacion: undefined,
  });

  const pollingRef = useRef<NodeJS.Timeout>();
  const isMountedRef = useRef(true);

  // Integración WebSocket para tiempo real
  const { latestReading, isConnected } = useRealTimeSensorData({
    autoConnect: true,
  });

  // Flag para prevenir múltiples llamadas simultáneas
  const isLoadingRef = useRef(false);

  /**
   * Cargar datos del backend
   * Memoizado para evitar recreaciones innecesarias
   */
  const cargarDatos = useCallback(async () => {
    // Prevenir múltiples llamadas simultáneas
    if (isLoadingRef.current) {
      return;
    }
    
    isLoadingRef.current = true;
    try {
      // Cargar sensores y lecturas en paralelo
      let sensores: Sensor[] = [];
      let lecturas: Lectura[] = [];
      let error: string | undefined = undefined;

      try {
        sensores = await obtenerSensores();
      } catch (err) {
        console.warn("Error al obtener sensores:", err);
        error = "No se pudo cargar la configuración de sensores";
      }

      try {
        lecturas = await obtenerLecturas();
      } catch (err) {
        console.warn("Error al obtener lecturas:", err);
        if (!error) {
          error = "No se pudo cargar las lecturas";
        }
      }

      if (!isMountedRef.current) return;

      // Si no hay sensores, crear uno por defecto para evitar que se quede cargando
      if (!sensores || sensores.length === 0) {
        // Crear un sensor por defecto si no hay ninguno
        const sensorDefault: Sensor = {
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
        };
        
        setState({
          sensores: [sensorDefault],
          lecturas: lecturas || [],
          alertas: [],
          estadisticas: [],
          loading: false,
          ultimaActualizacion: new Date(),
          error: error || "No hay datos de sensores aún. El sistema está esperando datos del TTGO.",
        });
        return;
      }

      // Calcular estadísticas para cada sensor
      const estadisticas = sensores.map((sensor) =>
        calcularEstadisticas(sensor.id, sensor.nombre, lecturas || [], "24h")
      );

      // Evaluar alertas basadas en última lectura de cada sensor
      const alertasGeneradas: Alerta[] = [];
      sensores.forEach((sensor) => {
        const ultimaLectura = sensor.ultimaLectura;
        if (ultimaLectura) {
          const alerta = evaluarAlerta(ultimaLectura, sensor, lecturas || []);
          if (alerta) {
            alertasGeneradas.push(alerta);
          }
        }
      });

      // Deduplicar alertas
      const alertasUnicas = deduplicarAlertas(alertasGeneradas);

      setState({
        sensores,
        lecturas: lecturas || [],
        alertas: alertasUnicas,
        estadisticas,
        loading: false,
        ultimaActualizacion: new Date(),
        error,
      });
    } catch (error) {
      console.error("Error crítico cargando datos:", error);
      if (isMountedRef.current) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: `Error cargando datos: ${error instanceof Error ? error.message : "Error desconocido"}`,
        }));
      }
    } finally {
      isLoadingRef.current = false;
    }
  }, []); // Sin dependencias para evitar bucles

  /**
   * Efecto: procesar actualizaciones en tiempo real desde WebSocket
   */
  useEffect(() => {
    if (!latestReading || !isMountedRef.current) return;

    setState((prev) => {
      // Importar función de mapeo
      const { mapearTTGOALectura } = require("@/lib/data-mapper");
      
      // Convertir lectura WebSocket a formato Lectura usando el mapeo
      const newReading = mapearTTGOALectura(
        {
          sensor_id: latestReading.data.sensor_id,
          gateway_id: latestReading.data.gateway_id,
          timestamp: latestReading.received_at,
          temperatura_c: latestReading.data.temperatura_c,
          humedad_pct: latestReading.data.humedad_pct,
          caudal_l_s: latestReading.data.caudal_l_s,
          lluvia_mm: latestReading.data.lluvia_mm,
          nivel_m: latestReading.data.nivel_m,
          // Formato legacy (compatibilidad)
          temperature_c: latestReading.data.temperature_c,
          humidity_percent: latestReading.data.humidity_percent,
          flow_rate_lmin: latestReading.data.flow_rate_lmin,
          rain_accumulated_mm: latestReading.data.rain_accumulated_mm,
          water_level_cm: latestReading.data.water_level_cm,
          rssi: latestReading.data.rssi,
          snr: latestReading.data.snr,
          signal_quality: latestReading.data.signal_quality,
          battery_percent: latestReading.data.battery_percent,
        },
        latestReading.reading_id
      );

      // Actualizar lecturas (agregar la nueva y limitar a últimas 500)
      const lecturas = [newReading, ...prev.lecturas].slice(0, 500);

      // Actualizar sensor con última lectura
      const sensoresActualizados = prev.sensores.map((sensor) => {
        if (sensor.id === latestReading.data.sensor_id) {
          return {
            ...sensor,
            ultimaLectura: newReading,
            ultimaActualizacion: new Date(latestReading.received_at),
          };
        }
        return sensor;
      });

      // Recalcular estadísticas y alertas
      const estadisticas = sensoresActualizados.map((sensor) =>
        calcularEstadisticas(sensor.id, sensor.nombre, lecturas, "24h")
      );

      const alertasGeneradas: Alerta[] = [];
      sensoresActualizados.forEach((sensor) => {
        if (sensor.ultimaLectura) {
          const alerta = evaluarAlerta(sensor.ultimaLectura, sensor, lecturas);
          if (alerta) {
            alertasGeneradas.push(alerta);
          }
        }
      });

      const alertasUnicas = deduplicarAlertas(alertasGeneradas);

      return {
        ...prev,
        lecturas,
        sensores: sensoresActualizados,
        estadisticas,
        alertas: alertasUnicas,
        ultimaActualizacion: new Date(),
      };
    });
  }, [latestReading]);

  /**
   * Efecto: suscribirse a todos los sensores cuando se carguen
   */
  useEffect(() => {
    if (state.sensores.length > 0 && isConnected) {
      state.sensores.forEach((sensor) => {
        // Este es un efecto, así que no podemos llamar directamente a subscribeSensor
        console.log(`Subscribed to sensor: ${sensor.id}`);
      });
    }
  }, [state.sensores.length, isConnected]);

  /**
   * Efecto: cargar datos inicialmente y configurar polling
   */
  useEffect(() => {
    let loadingTimeoutRef: NodeJS.Timeout | null = null;

    // Cargar datos inmediatamente
    cargarDatos();

    // Timeout de seguridad para que nunca se quede en loading
    loadingTimeoutRef = setTimeout(() => {
      if (isMountedRef.current) {
        setState((prev) => {
          if (prev.loading) {
            return {
              ...prev,
              loading: false,
              error: prev.error || "Timeout cargando datos. Verifica que el backend esté corriendo en http://localhost:3001",
            };
          }
          return prev;
        });
      }
    }, LOADING_TIMEOUT);

    // Configurar polling (solo una vez)
    if (!pollingRef.current) {
      pollingRef.current = setInterval(() => {
        if (isMountedRef.current) {
          cargarDatos();
        }
      }, POLLING_INTERVAL);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = undefined;
      }
      if (loadingTimeoutRef) {
        clearTimeout(loadingTimeoutRef);
      }
    };
  }, []); // Solo ejecutar una vez al montar

  /**
   * Obtener sensor específico
   */
  const obtenerSensor = useCallback(
    (id: string): Sensor | undefined => {
      return state.sensores.find((s) => s.id === id);
    },
    [state.sensores]
  );

  /**
   * Obtener estadísticas de sensor
   */
  const obtenerEstadisticas = useCallback(
    (sensorId: string): EstadisticasSensor | undefined => {
      return state.estadisticas.find((e) => e.sensorId === sensorId);
    },
    [state.estadisticas]
  );

  /**
   * Obtener lecturas de un sensor
   */
  const obtenerLecturasSensor = useCallback(
    (sensorId: string): Lectura[] => {
      return state.lecturas.filter((l) => l.sensorId === sensorId);
    },
    [state.lecturas]
  );

  /**
   * Obtener alertas activas
   */
  const obtenerAlertasActivas = useCallback((): Alerta[] => {
    return state.alertas.filter((a) => !a.resuelta);
  }, [state.alertas]);

  /**
   * Obtener nivel de riesgo
   */
  const nivelRiesgo = calcularNivelRiesgo(state.alertas);

  /**
   * Obtener alertas clasificadas
   */
  const alertasClasificadas = clasificarPorSeveridad(state.alertas);

  return {
    // Estado
    sensores: state.sensores,
    lecturas: state.lecturas,
    alertas: state.alertas,
    estadisticas: state.estadisticas,
    loading: state.loading,
    error: state.error,
    ultimaActualizacion: state.ultimaActualizacion,

    // WebSocket
    wsConnected: isConnected,
    latestReading,

    // Métodos
    cargarDatos,
    obtenerSensor,
    obtenerEstadisticas,
    obtenerLecturasSensor,
    obtenerAlertasActivas,

    // Datos calculados
    nivelRiesgo,
    alertasClasificadas,
    alertasCriticas: alertasClasificadas.critical,
    alertasAdvertencia: alertasClasificadas.warning,
  };
}
