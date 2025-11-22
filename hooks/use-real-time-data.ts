/**
 * Hook para conexión WebSocket en tiempo real
 * Conecta al backend y recibe actualizaciones en vivo
 */

"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";

interface WebSocketReadingUpdate {
  data: {
    sensor_id: string;
    gateway_id?: string;
    timestamp: number | string | Date;
    
    // Formato TTGO (nuevo)
    temperatura_c?: number;
    humedad_pct?: number;
    caudal_l_s?: number;
    lluvia_mm?: number;
    nivel_m?: number;
    seq?: number;
    
    // Formato legacy (compatibilidad)
    water_level_cm?: number;
    rain_accumulated_mm?: number;
    flow_rate_lmin?: number;
    temperature_c?: number;
    humidity_percent?: number;
    battery_percent?: number;
    rssi?: number;
    snr?: number;
    signal_quality?: "excellent" | "good" | "fair" | "poor";
  };
  received_at: string;
  reading_id: string;
}

interface UseRealTimeSensorDataOptions {
  serverUrl?: string;
  autoConnect?: boolean;
  subscribeToSensors?: string[];
}

export function useRealTimeSensorData(options: UseRealTimeSensorDataOptions = {}) {
  const {
    serverUrl = typeof window !== "undefined" 
      ? `${window.location.protocol}//${window.location.hostname}:3001`
      : "http://localhost:3001",
    autoConnect = true,
    subscribeToSensors = [],
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const isConnectingRef = useRef(false);
  const [isConnected, setIsConnected] = useState(false);
  const [latestReading, setLatestReading] = useState<WebSocketReadingUpdate | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const subscribeToSensorsRef = useRef<string[]>(subscribeToSensors);

  // Actualizar referencia cuando cambian los sensores
  useEffect(() => {
    subscribeToSensorsRef.current = subscribeToSensors;
  }, [subscribeToSensors]);

  /**
   * Conectar al servidor WebSocket
   */
  const connect = useCallback(() => {
    // Prevenir múltiples conexiones simultáneas
    if (socketRef.current?.connected || isConnectingRef.current) {
      return;
    }

    isConnectingRef.current = true;

    try {
      // Si ya existe un socket, desconectarlo primero
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      const socket = io(serverUrl, {
        reconnection: true,
        reconnectionDelay: 2000, // Aumentado para evitar bucles
        reconnectionDelayMax: 10000,
        reconnectionAttempts: 3, // Reducido para evitar bucles infinitos
        transports: ["websocket", "polling"],
        timeout: 5000,
      });

      socket.on("connect", () => {
        console.log("✓ WebSocket connected:", socket.id);
        setIsConnected(true);
        setConnectionError(null);
        isConnectingRef.current = false;

        // Suscribirse a sensores después de conectar
        subscribeToSensorsRef.current.forEach((sensorId) => {
          socket.emit("subscribe:sensor", sensorId);
        });
      });

      socket.on("disconnect", (reason) => {
        console.log("✗ WebSocket disconnected:", reason);
        setIsConnected(false);
        isConnectingRef.current = false;
        
        // No reconectar automáticamente si fue desconexión manual
        if (reason === "io client disconnect") {
          socketRef.current = null;
        }
      });

      socket.on("connect_error", (error: any) => {
        console.error("WebSocket connection error:", error.message);
        setConnectionError(error.message || "Connection failed");
        isConnectingRef.current = false;
        
        // Deshabilitar reconexión automática después de varios intentos
        if (socket.recovered === false) {
          console.warn("WebSocket: Deshabilitando reconexión automática después de múltiples fallos");
        }
      });

      // Evento: Actualización de lectura para sensor específico
      socket.on("reading:update", (data: WebSocketReadingUpdate) => {
        console.log("📊 Reading update:", data);
        setLatestReading(data);
      });

      // Evento: Dato de sensor (broadcast a todos)
      socket.on("sensor:data", (data: any) => {
        console.log("📡 Sensor data event:", data);
      });

      socketRef.current = socket;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to create WebSocket:", errorMessage);
      setConnectionError(errorMessage);
      isConnectingRef.current = false;
    }
  }, [serverUrl]); // Solo serverUrl como dependencia

  /**
   * Desconectar
   */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  /**
   * Suscribirse a un sensor
   */
  const subscribeSensor = useCallback((sensorId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("subscribe:sensor", sensorId);
      console.log(`✓ Subscribed to sensor: ${sensorId}`);
    } else {
      console.warn("Not connected to WebSocket");
    }
  }, []);

  /**
   * Desuscribirse de un sensor
   */
  const unsubscribeSensor = useCallback((sensorId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("unsubscribe:sensor", sensorId);
      console.log(`✗ Unsubscribed from sensor: ${sensorId}`);
    }
  }, []);

  /**
   * Enviar evento personalizado
   */
  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  // Auto-conectar al montar (solo una vez)
  useEffect(() => {
    if (!autoConnect) {
      return;
    }

    // Solo conectar si no hay una conexión existente
    if (!socketRef.current && !isConnectingRef.current) {
      connect();
    }

    return () => {
      // Limpiar conexión al desmontar
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
        isConnectingRef.current = false;
      }
    };
  }, []); // Solo ejecutar una vez al montar

  return {
    isConnected,
    latestReading,
    connectionError,
    connect,
    disconnect,
    subscribeSensor,
    unsubscribeSensor,
    emit,
    socket: socketRef.current,
  };
}

/**
 * Hook para mantener historial de lecturas en tiempo real
 */
export function useRealTimeReadingHistory(sensorId?: string) {
  const [readings, setReadings] = useState<WebSocketReadingUpdate[]>([]);
  const [maxReadings, setMaxReadings] = useState(100);

  const { subscribeSensor, unsubscribeSensor, latestReading } = useRealTimeSensorData({
    subscribeToSensors: sensorId ? [sensorId] : [],
  });

  // Agregar lectura al historial cuando llega una nueva
  useEffect(() => {
    if (latestReading) {
      setReadings((prev) => {
        const updated = [latestReading, ...prev];
        // Limitar a maxReadings
        return updated.slice(0, maxReadings);
      });
    }
  }, [latestReading, maxReadings]);

  return {
    readings,
    subscribeSensor,
    unsubscribeSensor,
    clearReadings: () => setReadings([]),
    setMaxReadings,
  };
}
