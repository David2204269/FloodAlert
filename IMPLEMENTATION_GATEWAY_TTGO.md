# 🚀 IMPLEMENTACIÓN BACKEND - ARQUITECTURA TTGO SENSOR → GATEWAY → HTTP

## Visión General de la Arquitectura

```
┌─────────────────┐         LoRa (868 MHz)          ┌──────────────────┐
│  TTGO Sensor    │ ◄─────────────────────────────► │  TTGO Gateway    │
│  (DHT22, ADC)   │                                 │  (LoRa + WiFi)   │
│                 │                                 │                  │
│ - Water Level   │                                 │ - Recibe LoRa    │
│ - Rain Gauge    │                                 │ - Conecta WiFi   │
│ - Flow Meter    │                                 │ - HTTP POST      │
│ - Temperature   │                                 │ - Reintentos     │
└─────────────────┘                                 └──────────────────┘
                                                             │
                                                     HTTP POST (JSON)
                                                             │
                                                             ▼
                                                    ┌─────────────────┐
                                                    │  Tu Backend     │
                                                    │  (Express.js)   │
                                                    │                 │
                                                    │ POST /api/v1/   │
                                                    │ data/ingest     │
                                                    │                 │
                                                    │ MongoDB Storage │
                                                    │ Alert Service   │
                                                    │ WebSocket Real  │
                                                    │ Time Broadcast  │
                                                    └─────────────────┘
```

---

## Paso 1: Código del TTGO Sensor (Transmite LoRa)

**Archivo: `ttgo-sensor-lora.ino`**

```cpp
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <DHT.h>
#include <LoRa.h>
#include <SPI.h>

// Pin definitions
#define DHTPIN 32
#define DHT_TYPE DHT22
#define WATER_LEVEL_PIN 33
#define RAIN_GAUGE_PIN 35
#define FLOW_METER_PIN 34

// LoRa pins (TTGO T-Beam)
#define LORA_SCK 5
#define LORA_MISO 19
#define LORA_MOSI 27
#define LORA_SS 18
#define LORA_RST 14
#define LORA_DIO0 26

// Sensor objects
DHT dht(DHTPIN, DHT_TYPE);
uint32_t flowPulseCount = 0;

// Configuration
const char* SENSOR_ID = "SENSOR_001";
const char* GATEWAY_ID = "GATEWAY_001";
const long SEND_INTERVAL = 60000; // Send every 60 seconds
unsigned long lastSendTime = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n[TTGO Sensor] Iniciando...");
  
  // Initialize sensors
  dht.begin();
  
  // Initialize pins
  pinMode(WATER_LEVEL_PIN, INPUT);
  pinMode(RAIN_GAUGE_PIN, INPUT);
  pinMode(FLOW_METER_PIN, INPUT);
  
  // Setup flow meter interrupt
  attachInterrupt(digitalPinToInterrupt(FLOW_METER_PIN), countFlowPulse, RISING);
  
  // Initialize LoRa
  initLoRa();
  
  Serial.println("[TTGO Sensor] Sistema listo");
}

void loop() {
  if (millis() - lastSendTime > SEND_INTERVAL) {
    // Read all sensors
    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();
    int waterLevel = readWaterLevel();
    float rainfall = readRainfall();
    float flowRate = calculateFlowRate();
    
    // Create LoRa packet (15 bytes)
    uint8_t packet[15];
    createLoRaPacket(packet, temperature, humidity, waterLevel, rainfall, flowRate);
    
    // Send via LoRa
    sendLoRaPacket(packet);
    
    lastSendTime = millis();
    
    Serial.printf("[TTGO Sensor] Lectura enviada: T=%.1f°C H=%.1f%% W=%dcm R=%.1fmm F=%.1fL/min\n",
      temperature, humidity, waterLevel, rainfall, flowRate);
    
    // Deep sleep for power saving
    delay(100);
  }
}

void initLoRa() {
  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_SS);
  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);
  
  if (!LoRa.begin(868E6)) {
    Serial.println("ERROR: LoRa initialization failed!");
    while (1);
  }
  
  LoRa.setTxPower(14);
  LoRa.setSpreadingFactor(7);
  LoRa.setSignalBandwidth(125E3);
  LoRa.setCodingRate4(5);
  
  Serial.println("[TTGO Sensor] LoRa inicializado (868 MHz)");
}

int readWaterLevel() {
  int raw = analogRead(WATER_LEVEL_PIN); // 0-4095
  // Calibración: 0-500 cm
  return map(raw, 0, 4095, 0, 500);
}

float readRainfall() {
  int raw = analogRead(RAIN_GAUGE_PIN); // 0-4095
  // Calibración: 0-1000 mm
  return map(raw, 0, 4095, 0, 1000) / 10.0;
}

float calculateFlowRate() {
  // Flow meter: pulses to L/min
  // Typical: 450 pulses/L
  float flowRate = (flowPulseCount / 450.0) * 60.0; // Convert to L/min
  flowPulseCount = 0; // Reset counter
  return flowRate;
}

void countFlowPulse() {
  flowPulseCount++;
}

void createLoRaPacket(uint8_t* packet, float temp, float humidity, int waterLevel, 
                      float rainfall, float flowRate) {
  // Packet structure (15 bytes):
  // [0] Sensor ID high byte
  // [1] Sensor ID low byte
  // [2-3] Temperature (int16, 0.1°C resolution)
  // [4] Humidity (uint8, %)
  // [5-6] Water level (uint16, cm)
  // [7-8] Rainfall (uint16, 0.1mm resolution)
  // [9-10] Flow rate (uint16, 0.1 L/min resolution)
  // [11-14] Timestamp (uint32, seconds)
  
  uint16_t tempInt = (int16_t)(temp * 10); // 0.1°C resolution
  uint16_t rainfallInt = (uint16_t)(rainfall * 10);
  uint16_t flowRateInt = (uint16_t)(flowRate * 10);
  uint32_t timestamp = millis() / 1000;
  
  packet[0] = highByte(0x0001); // SENSOR_001 ID
  packet[1] = lowByte(0x0001);
  packet[2] = highByte(tempInt);
  packet[3] = lowByte(tempInt);
  packet[4] = (uint8_t)humidity;
  packet[5] = highByte(waterLevel);
  packet[6] = lowByte(waterLevel);
  packet[7] = highByte(rainfallInt);
  packet[8] = lowByte(rainfallInt);
  packet[9] = highByte(flowRateInt);
  packet[10] = lowByte(flowRateInt);
  packet[11] = (uint8_t)((timestamp >> 24) & 0xFF);
  packet[12] = (uint8_t)((timestamp >> 16) & 0xFF);
  packet[13] = (uint8_t)((timestamp >> 8) & 0xFF);
  packet[14] = (uint8_t)(timestamp & 0xFF);
}

void sendLoRaPacket(uint8_t* packet) {
  LoRa.beginPacket();
  for (int i = 0; i < 15; i++) {
    LoRa.write(packet[i]);
  }
  LoRa.endPacket();
  Serial.println("[TTGO Sensor] Paquete LoRa enviado");
}
```

---

## Paso 2: Código del TTGO Gateway (Recibe LoRa, Envía HTTP)

**Archivo: `ttgo-gateway-http.ino`**

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <LoRa.h>
#include <SPI.h>
#include <ArduinoJson.h>
#include <time.h>

// WiFi credentials
const char* SSID = "YOUR_SSID";
const char* PASSWORD = "YOUR_PASSWORD";

// Backend configuration
const char* BACKEND_URL = "http://192.168.1.100:3001/api/v1/data/ingest";
const char* API_KEY = "Bearer sk_test_your_api_key_here";

// LoRa pins
#define LORA_SCK 5
#define LORA_MISO 19
#define LORA_MOSI 27
#define LORA_SS 18
#define LORA_RST 14
#define LORA_DIO0 26

const char* GATEWAY_ID = "GATEWAY_001";
const int RETRY_ATTEMPTS = 5;
const int INITIAL_RETRY_DELAY = 1000; // 1 second

struct SensorData {
  uint16_t sensor_id;
  float temperature;
  float humidity;
  uint16_t water_level;
  float rainfall;
  float flow_rate;
  uint32_t timestamp;
  int rssi;
  int snr;
};

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n[TTGO Gateway] Iniciando...");
  
  // Initialize LoRa
  initLoRa();
  
  // Connect to WiFi
  connectToWiFi();
  
  // Set timezone
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  
  Serial.println("[TTGO Gateway] Sistema listo, esperando datos LoRa...");
}

void loop() {
  // Check for LoRa packets
  int packetSize = LoRa.parsePacket();
  
  if (packetSize) {
    Serial.printf("[TTGO Gateway] Paquete recibido: %d bytes, RSSI: %d, SNR: %.2f\n",
      packetSize, LoRa.packetRssi(), LoRa.packetSnr());
    
    // Read packet
    uint8_t packet[15];
    for (int i = 0; i < packetSize && i < 15; i++) {
      packet[i] = LoRa.read();
    }
    
    // Parse packet
    SensorData sensorData = parseLoRaPacket(packet, LoRa.packetRssi(), (int)LoRa.packetSnr());
    
    // Send to backend with retries
    bool success = sendToBackend(sensorData);
    
    if (success) {
      Serial.println("[TTGO Gateway] ✓ Datos enviados al backend");
    } else {
      Serial.println("[TTGO Gateway] ✗ Error al enviar datos al backend");
    }
  }
  
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[TTGO Gateway] Reconectando WiFi...");
    connectToWiFi();
  }
  
  delay(100);
}

void initLoRa() {
  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_SS);
  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);
  
  if (!LoRa.begin(868E6)) {
    Serial.println("ERROR: LoRa initialization failed!");
    while (1);
  }
  
  LoRa.setTxPower(14);
  LoRa.setSpreadingFactor(7);
  LoRa.setSignalBandwidth(125E3);
  LoRa.setCodingRate4(5);
  LoRa.enableCrc();
  
  Serial.println("[TTGO Gateway] LoRa inicializado en 868 MHz");
}

void connectToWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(SSID, PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[TTGO Gateway] WiFi conectado: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n[TTGO Gateway] ERROR: No se pudo conectar a WiFi");
  }
}

SensorData parseLoRaPacket(uint8_t* packet, int rssi, int snr) {
  SensorData data;
  
  // Parse packet (15 bytes)
  data.sensor_id = (packet[0] << 8) | packet[1];
  
  int16_t tempInt = (int16_t)((packet[2] << 8) | packet[3]);
  data.temperature = tempInt / 10.0;
  
  data.humidity = packet[4];
  
  data.water_level = (packet[5] << 8) | packet[6];
  
  uint16_t rainfallInt = (packet[7] << 8) | packet[8];
  data.rainfall = rainfallInt / 10.0;
  
  uint16_t flowRateInt = (packet[9] << 8) | packet[10];
  data.flow_rate = flowRateInt / 10.0;
  
  data.timestamp = ((uint32_t)packet[11] << 24) | ((uint32_t)packet[12] << 16) |
                   ((uint32_t)packet[13] << 8) | packet[14];
  
  data.rssi = rssi;
  data.snr = snr;
  
  return data;
}

bool sendToBackend(SensorData sensorData) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[TTGO Gateway] WiFi no conectado");
    return false;
  }
  
  HTTPClient http;
  http.setConnectTimeout(5000);
  http.setTimeout(10000);
  
  // Create JSON payload
  StaticJsonDocument<200> doc;
  doc["sensor_id"] = String("SENSOR_") + String(sensorData.sensor_id);
  doc["gateway_id"] = GATEWAY_ID;
  doc["timestamp"] = getFormattedTimestamp(sensorData.timestamp);
  doc["water_level_cm"] = sensorData.water_level;
  doc["rain_accumulated_mm"] = sensorData.rainfall;
  doc["flow_rate_lmin"] = sensorData.flow_rate;
  doc["temperature_c"] = sensorData.temperature;
  doc["humidity_percent"] = sensorData.humidity;
  doc["battery_percent"] = 85; // Read from ADC in real implementation
  doc["rssi"] = sensorData.rssi;
  doc["snr"] = sensorData.snr;
  
  String jsonPayload;
  serializeJson(doc, jsonPayload);
  
  Serial.printf("[TTGO Gateway] JSON: %s\n", jsonPayload.c_str());
  
  // Retry logic with exponential backoff
  int retryDelay = INITIAL_RETRY_DELAY;
  
  for (int attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    Serial.printf("[TTGO Gateway] Intento %d de %d...\n", attempt, RETRY_ATTEMPTS);
    
    http.begin(BACKEND_URL);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", API_KEY);
    
    int httpResponseCode = http.POST(jsonPayload);
    
    if (httpResponseCode == 201 || httpResponseCode == 200) {
      Serial.printf("[TTGO Gateway] ✓ Respuesta exitosa (código %d)\n", httpResponseCode);
      http.end();
      return true;
    }
    
    Serial.printf("[TTGO Gateway] ✗ Error en intento %d (código %d)\n", attempt, httpResponseCode);
    http.end();
    
    // Retry with exponential backoff
    if (attempt < RETRY_ATTEMPTS) {
      Serial.printf("[TTGO Gateway] Esperando %d ms antes del siguiente intento...\n", retryDelay);
      delay(retryDelay);
      retryDelay *= 2; // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    }
  }
  
  Serial.println("[TTGO Gateway] ✗ Falló después de " + String(RETRY_ATTEMPTS) + " intentos");
  return false;
}

String getFormattedTimestamp(uint32_t seconds) {
  time_t now = time(nullptr);
  struct tm timeinfo = *localtime(&now);
  
  char buffer[30];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return String(buffer);
}
```

---

## Paso 3: Endpoint Backend (Express.js)

**Ruta: `POST /api/v1/data/ingest`**

```typescript
// backend-implementation/src/routes/gateway-ingest.routes.ts

import { Router, Request, Response } from 'express';
import { Db } from 'mongodb';
import Redis from 'ioredis';
import { GatewayDataService } from '../services/gateway-data.service';
import { AlertService } from '../services/alert.service';
import { z } from 'zod';

// Validación con Zod
const GatewayPayloadSchema = z.object({
  sensor_id: z.string().min(1),
  gateway_id: z.string().min(1),
  timestamp: z.string().datetime(),
  water_level_cm: z.number().min(0).max(500).optional(),
  rain_accumulated_mm: z.number().min(0).max(10000).optional(),
  flow_rate_lmin: z.number().min(0).max(10000).optional(),
  temperature_c: z.number().min(-50).max(60).optional(),
  humidity_percent: z.number().min(0).max(100).optional(),
  battery_percent: z.number().min(0).max(100).optional(),
  rssi: z.number().optional(),
  snr: z.number().optional(),
});

export function createGatewayIngestRouter(db: Db, redis: Redis) {
  const router = Router();
  const gatewayDataService = new GatewayDataService(db, redis);
  const alertService = new AlertService(db, redis);

  // Middleware: API Key authentication
  const apiKeyAuth = (req: Request, res: Response, next: Function) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Missing authorization header' });
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || token !== process.env.API_KEY_SECRET) {
      return res.status(403).json({ error: 'Invalid API key' });
    }

    next();
  };

  /**
   * POST /api/v1/data/ingest
   * Receive sensor data from TTGO Gateway
   */
  router.post('/ingest', apiKeyAuth, async (req: Request, res: Response) => {
    try {
      // Validate payload
      const validation = GatewayPayloadSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Invalid payload',
          details: validation.error.errors,
        });
      }

      const payload = validation.data;

      // Ingest data
      const result = await gatewayDataService.ingestGatewayReading(payload);

      if (!result.success) {
        return res.status(409).json({ error: result.error });
      }

      // Evaluate alerts
      const alerts = await alertService.evaluateAndCreateAlerts(
        payload.sensor_id,
        payload
      );

      res.status(201).json({
        success: true,
        reading_id: result.reading_id,
        timestamp: result.timestamp,
        alerts_triggered: alerts.length,
      });
    } catch (error) {
      console.error('Ingest error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * GET /api/v1/data/status/:sensor_id
   */
  router.get('/status/:sensor_id', async (req: Request, res: Response) => {
    try {
      const readings = await gatewayDataService.getLatestReadings(
        req.params.sensor_id,
        1
      );

      if (readings.length === 0) {
        return res.status(404).json({ error: 'No readings found' });
      }

      res.json(readings[0]);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * GET /api/v1/data/history/:sensor_id
   */
  router.get('/history/:sensor_id', async (req: Request, res: Response) => {
    try {
      const { hours = '24', limit = '100' } = req.query;
      const startTime = new Date(Date.now() - parseInt(hours as string) * 60 * 60 * 1000);
      const endTime = new Date();

      const readings = await gatewayDataService.getReadingsByTimeRange(
        req.params.sensor_id,
        startTime,
        endTime
      );

      res.json({
        sensor_id: req.params.sensor_id,
        count: readings.length,
        period_hours: hours,
        readings: readings.slice(0, parseInt(limit as string)),
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
```

---

## Paso 4: Registrar Gateway en Backend

El gateway debe registrarse cuando se conecta por primera vez:

```typescript
// POST /api/v1/gateways/register
// Body:
{
  "gateway_id": "GATEWAY_001",
  "name": "Gateway Principal",
  "location": {
    "lat": -33.8688,
    "lng": -51.5493
  }
}

// Response:
{
  "success": true,
  "gateway_id": "GATEWAY_001",
  "message": "Gateway registered successfully"
}
```

---

## Paso 5: Integración con Next.js Frontend

```typescript
// lib/api-service.ts - Actualizado

import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const apiService = {
  // Obtener última lectura
  async obtenerUltimaLectura(sensor_id: string) {
    const res = await axios.get(`${API_BASE}/data/status/${sensor_id}`);
    return res.data;
  },

  // Obtener historial
  async obtenerHistorial(sensor_id: string, hours: number = 24, limit: number = 100) {
    const res = await axios.get(`${API_BASE}/data/history/${sensor_id}`, {
      params: { hours, limit },
    });
    return res.data;
  },

  // Obtener estadísticas
  async obtenerEstadisticas(sensor_id: string) {
    const res = await axios.get(`${API_BASE}/data/stats/${sensor_id}`);
    return res.data;
  },

  // Obtener alertas activas
  async obtenerAlertasActivas(sensor_id?: string) {
    const url = sensor_id
      ? `${API_BASE}/alerts/active?sensor_id=${sensor_id}`
      : `${API_BASE}/alerts/active`;
    const res = await axios.get(url);
    return res.data;
  },

  // Reconocer alerta
  async reconocerAlerta(alert_id: string) {
    const res = await axios.put(`${API_BASE}/alerts/${alert_id}/acknowledge`);
    return res.data;
  },
};
```

---

## Paso 6: WebSocket para Actualizaciones en Tiempo Real

```typescript
// Conexión en componente de React

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export function useSensorData(sensor_id: string) {
  const [reading, setReading] = useState(null);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const socket = io('http://localhost:3001', {
      transports: ['websocket'],
    });

    // Conectar al sensor
    socket.emit('join_sensor', sensor_id);

    // Escuchar nuevas lecturas
    socket.on('reading', (data) => {
      if (data.metadata.sensor_id === sensor_id) {
        setReading(data);
      }
    });

    // Escuchar alertas
    socket.on('alert', (alert) => {
      if (alert.sensor_id === sensor_id) {
        setAlerts((prev) => [alert, ...prev]);
      }
    });

    return () => socket.disconnect();
  }, [sensor_id]);

  return { reading, alerts };
}
```

---

## Próximos Pasos

1. ✅ **Código del TTGO Sensor** - Compilar y cargar en sensor
2. ✅ **Código del TTGO Gateway** - Compilar y cargar en gateway
3. ✅ **Backend Express.js** - Implementar rutas y servicios
4. ✅ **Base de Datos MongoDB** - Crear colecciones e índices
5. ✅ **Alertas en Tiempo Real** - Configurar reglas de alertas
6. ✅ **Integración Frontend** - Conectar dashboard con backend

---

**Documentación**: Ver `IOT_ARCHITECTURE_DESIGN.md` para más detalles
