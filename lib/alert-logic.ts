/**
 * Lógica para evaluar condiciones de alerta
 * Genera alertas basadas en umbrales definidos
 */

import { Lectura, Alerta, Sensor, SeveridadAlerta, NivelFlotador } from "@/src/types";

/**
 * Evalúa una lectura contra los umbrales de un sensor
 * Retorna alerta si se cumplen condiciones
 */
export function evaluarAlerta(
  lectura: Lectura,
  sensor: Sensor,
  lecturasAnteriores: Lectura[] = []
): Alerta | null {
  if (!sensor.umbralAlerta) return null;

  // Evaluar lluvia fuerte
  if (lectura.lluvia_ao > sensor.umbralAlerta.lluviaMax) {
    return generarAlerta(
      sensor,
      lectura,
      "LLUVIA_FUERTE",
      "WARNING",
      `Lluvia acumulada: ${lectura.lluvia_ao}mm (umbral: ${sensor.umbralAlerta.lluviaMax}mm)`
    );
  }

  // Evaluar nivel crítico
  if (lectura.nivel_flotador === "CRÍTICO") {
    return generarAlerta(
      sensor,
      lectura,
      "NIVEL_ALTO",
      "CRITICAL",
      `Nivel del agua crítico en ${sensor.nombre}`
    );
  }

  // Evaluar nivel alto
  if (lectura.nivel_flotador === "ALTO") {
    return generarAlerta(
      sensor,
      lectura,
      "NIVEL_ALTO",
      "WARNING",
      `Nivel del agua alto en ${sensor.nombre}`
    );
  }

  // Evaluar flujo alto
  if (lectura.flujo_lmin > sensor.umbralAlerta.flujoMax) {
    return generarAlerta(
      sensor,
      lectura,
      "FLUJO_ALTO",
      "WARNING",
      `Flujo alto: ${lectura.flujo_lmin}L/min (umbral: ${sensor.umbralAlerta.flujoMax}L/min)`
    );
  }

  // Evaluar tendencia de aumento (si hay datos anteriores)
  const tendencia = evaluarTendencia(lectura, lecturasAnteriores, sensor);
  if (tendencia) {
    return tendencia;
  }

  return null;
}

/**
 * Crear objeto Alerta
 */
function generarAlerta(
  sensor: Sensor,
  lectura: Lectura,
  tipo: "NIVEL_ALTO" | "LLUVIA_FUERTE" | "FLUJO_ALTO" | "PREDICCION",
  severidad: SeveridadAlerta,
  descripcion: string
): Alerta {
  return {
    sensorId: sensor.id,
    sensorNombre: sensor.nombre,
    severidad,
    tipo,
    titulo: `Alerta: ${sensor.nombre}`,
    descripcion,
    datos: {
      valor:
        tipo === "LLUVIA_FUERTE"
          ? lectura.lluvia_ao
          : tipo === "FLUJO_ALTO"
            ? lectura.flujo_lmin
            : 0,
      umbral:
        tipo === "LLUVIA_FUERTE"
          ? sensor.umbralAlerta?.lluviaMax || 0
          : tipo === "FLUJO_ALTO"
            ? sensor.umbralAlerta?.flujoMax || 0
            : 0,
      ubicacion: sensor.ubicacion,
    },
    timestamp: lectura.timestamp,
    createdAt: new Date(),
    resuelta: false,
  };
}

/**
 * Evalúa tendencia de aumento en lecturas
 */
function evaluarTendencia(
  lectura: Lectura,
  lecturasAnteriores: Lectura[],
  sensor: Sensor
): Alerta | null {
  if (lecturasAnteriores.length < 3) return null;

  // Obtener las últimas 3 lecturas del sensor
  const ultimasLecturas = lecturasAnteriores
    .filter((l) => l.sensorId === sensor.id)
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(0, 3);

  if (ultimasLecturas.length < 3) return null;

  // Evaluar si hay aumento consistente de lluvia
  const lluvias = ultimasLecturas.map((l) => l.lluvia_ao).reverse();
  if (
    lluvias[1] > lluvias[0] &&
    lluvias[2] > lluvias[1] &&
    lectura.lluvia_ao > (sensor.umbralAlerta?.lluviaMax || 0) * 0.7
  ) {
    return generarAlerta(
      sensor,
      lectura,
      "LLUVIA_FUERTE",
      "WARNING",
      `Tendencia de aumento de lluvia detectada en ${sensor.nombre}`
    );
  }

  return null;
}

/**
 * Deduplicar alertas recientes
 * Evita enviar alertas múltiples para el mismo evento
 */
export function deduplicarAlertas(alertas: Alerta[], ventanaMinutos = 60): Alerta[] {
  const ahora = Date.now() / 1000;
  const ventanaSegundos = ventanaMinutos * 60;
  const alertasUnicas = new Map<string, Alerta>();

  alertas.forEach((alerta) => {
    // Clave única: sensor + tipo de alerta
    const clave = `${alerta.sensorId}-${alerta.tipo}`;

    const alertaExistente = alertasUnicas.get(clave);

    if (!alertaExistente) {
      alertasUnicas.set(clave, alerta);
    } else if (
      alerta.timestamp - alertaExistente.timestamp >
      ventanaSegundos
    ) {
      // Si la nueva alerta es más reciente y está fuera de la ventana, reemplazar
      alertasUnicas.set(clave, alerta);
    }
  });

  return Array.from(alertasUnicas.values());
}

/**
 * Clasificar alertas por severidad
 */
export function clasificarPorSeveridad(alertas: Alerta[]): {
  critical: Alerta[];
  warning: Alerta[];
  info: Alerta[];
} {
  return {
    critical: alertas.filter((a) => a.severidad === "CRITICAL"),
    warning: alertas.filter((a) => a.severidad === "WARNING"),
    info: alertas.filter((a) => a.severidad === "INFO"),
  };
}

/**
 * Obtener alertas activas (no resueltas)
 */
export function obtenerAlertasActivas(alertas: Alerta[]): Alerta[] {
  return alertas.filter((a) => !a.resuelta);
}

/**
 * Calcular riesgo general basado en alertas
 */
export function calcularNivelRiesgo(alertas: Alerta[]): "BAJO" | "MEDIO" | "ALTO" | "CRÍTICO" {
  const alertasActivas = obtenerAlertasActivas(alertas);

  if (alertasActivas.length === 0) return "BAJO";

  const tienesCritical = alertasActivas.some((a) => a.severidad === "CRITICAL");
  const tieneWarning = alertasActivas.some((a) => a.severidad === "WARNING");

  if (tienesCritical) return "CRÍTICO";
  if (tieneWarning && alertasActivas.length >= 2) return "ALTO";
  if (tieneWarning) return "MEDIO";

  return "BAJO";
}
