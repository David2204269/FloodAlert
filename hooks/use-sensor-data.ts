/**
 * Hook personalizado para manejar estado de sensores, lecturas y alertas
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

const POLLING_INTERVAL = 60000; // 1 minuto

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

  /**
   * Cargar datos del backend
   */
  const cargarDatos = useCallback(async () => {
    try {
      const [sensores, lecturas] = await Promise.all([
        obtenerSensores(),
        obtenerLecturas(),
      ]);

      if (!isMountedRef.current) return;

      // Calcular estadísticas para cada sensor
      const estadisticas = sensores.map((sensor) =>
        calcularEstadisticas(sensor.id, sensor.nombre, lecturas, "24h")
      );

      // Evaluar alertas basadas en última lectura de cada sensor
      const alertasGeneradas: Alerta[] = [];
      sensores.forEach((sensor) => {
        const ultimaLectura = sensor.ultimaLectura;
        if (ultimaLectura) {
          const alerta = evaluarAlerta(ultimaLectura, sensor, lecturas);
          if (alerta) {
            alertasGeneradas.push(alerta);
          }
        }
      });

      // Deduplicar alertas
      const alertasUnicas = deduplicarAlertas(alertasGeneradas);

      setState({
        sensores,
        lecturas,
        alertas: alertasUnicas,
        estadisticas,
        loading: false,
        ultimaActualizacion: new Date(),
      });
    } catch (error) {
      console.error("Error cargando datos:", error);
      if (isMountedRef.current) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: "Error cargando datos del servidor",
        }));
      }
    }
  }, []);

  /**
   * Efecto: cargar datos inicialmente y configurar polling
   */
  useEffect(() => {
    cargarDatos();

    // Configurar polling
    pollingRef.current = setInterval(cargarDatos, POLLING_INTERVAL);

    return () => {
      isMountedRef.current = false;
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [cargarDatos]);

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
