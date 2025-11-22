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
    gateway_id: string;
    timestamp: number;
    water_level_cm: number;
    rain_accumulated_mm: number;
    flow_rate_lmin: number;
    temperature_c: number;
    humidity_percent: number;
    battery_percent: number;
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
  const [isConnected, setIsConnected] = useState(false);
  const [latestReading, setLatestReading] = useState<WebSocketReadingUpdate | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  /**
   * Conectar al servidor WebSocket
   */
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    try {
      const socket = io(serverUrl, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        transports: ["websocket", "polling"],
      });

      socket.on("connect", () => {
        console.log("✓ WebSocket connected:", socket.id);
        setIsConnected(true);
        setConnectionError(null);

        // Suscribirse a sensores después de conectar
        subscribeToSensors.forEach((sensorId) => {
          socket.emit("subscribe:sensor", sensorId);
        });
      });

      socket.on("disconnect", () => {
        console.log("✗ WebSocket disconnected");
        setIsConnected(false);
      });

      socket.on("connect_error", (error: any) => {
        console.error("WebSocket connection error:", error);
        setConnectionError(error.message || "Connection failed");
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
    }
  }, [serverUrl, subscribeToSensors]);

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

  // Auto-conectar al montar
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      // Limpiar conexión al desmontar
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [autoConnect, connect]);

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
