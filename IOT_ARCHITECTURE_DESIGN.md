# IoT-Ready Flood Alert System - Architecture Design & Migration Guide

**Project**: Flood Alert System with TTGO ESP32 LoRa Sensor  
**Current State**: Next.js monolith (frontend + lightweight API)  
**Target State**: Scalable IoT architecture with separated ingestion layer  
**Date**: November 2025

---

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Communication Flow](#communication-flow)
3. [Migration Strategy](#migration-strategy)
4. [Implementation Details](#implementation-details)
5. [Deployment Guide](#deployment-guide)
6. [Security Considerations](#security-considerations)
7. [Future Enhancements](#future-enhancements)

---

## System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SENSOR LAYER                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  TTGO ESP32 Sensor Node       TTGO ESP32 Gateway (WiFi + LoRa)              │
│  ├─ Measures:                 ├─ Receives LoRa packets from sensors         │
│  │  ├─ Water level (float)    ├─ Parses & validates data                    │
│  │  ├─ Rain (analog)          ├─ HTTP POST or MQTT PUBLISH to backend      │
│  │  ├─ Flow rate              └─ Retries with exponential backoff           │
│  │  ├─ Humidity               Rate: Every 5-30 mins (configurable)          │
│  │  └─ Temperature            Payload: ~50-100 bytes (LoRa limit: 250B)     │
│  └─ Sends LoRa packets                                                       │
│     (unacknowledged, fire-and-forget)                                        │
│                                                                               │
└────────────────────────────────────────────────────────────────────────────┬─┘
                                     │
                                     │ HTTP POST / MQTT PUBLISH
                                     │
┌────────────────────────────────────────────────────────────────────────────┴─┐
│                      INGESTION LAYER (Standalone)                            │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │ Express.js IoT Backend (Node.js)                               │        │
│  │ ├─ /api/v1/data/ingest    [POST]  ← Receives sensor data       │        │
│  │ ├─ /api/v1/health         [GET]   ← Health check               │        │
│  │ ├─ /api/v1/config         [GET]   ← Sensor thresholds          │        │
│  │ └─ WebSocket Server       [WS://] ← Real-time alerts to UI     │        │
│  │                                                                  │        │
│  │ Features:                                                       │        │
│  │ ├─ Input validation & sanitization                             │        │
│  │ ├─ Rate limiting (per device ID)                               │        │
│  │ ├─ Deduplication (timestamp-based)                             │        │
│  │ ├─ Auto-retry logic for MongoDB writes                         │        │
│  │ └─ Health monitoring & logging                                 │        │
│  └─────────────────────────────────────────────────────────────────┘        │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │ Alert Processing Engine                                         │        │
│  │ ├─ Real-time threshold evaluation                               │        │
│  │ ├─ Trend analysis (sliding window: 30 mins)                    │        │
│  │ ├─ Alert deduplication (same alert within 5 mins = skip)       │        │
│  │ ├─ Escalation rules (INFO → WARNING → CRITICAL)                │        │
│  │ └─ Webhook triggers (if configured)                            │        │
│  └─────────────────────────────────────────────────────────────────┘        │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
         (Data writes)         (Real-time)              (Config)
              │                   (WebSocket)              │
              ▼                      │                      ▼
┌──────────────────────────┐  ┌────────────────┐  ┌──────────────────────┐
│   MongoDB Atlas          │  │  Redis Cache   │  │  Config Database     │
│   (Time-series)          │  │  (Optional)    │  │  (Sensor thresholds) │
│                          │  │  ├─ Current    │  │                      │
│ Collections:             │  │  │  reading    │  │  Stores per-sensor:  │
│ ├─ sensor_readings       │  │  ├─ Alert      │  │ ├─ Thresholds       │
│ ├─ alerts                │  │  │  state      │  │ ├─ Intervals        │
│ ├─ sensors               │  │  └─ Metrics    │  │ └─ Enabled state    │
│ └─ alert_history         │  └────────────────┘  └──────────────────────┘
└──────────────────────────┘
              │
              └──────────────────────────┬───────────────────────┐
                                         │                       │
                              ┌──────────────────────┐    ┌─────────────┐
                              │  Next.js Frontend    │    │   External  │
                              │  (Dashboard UI)      │    │  Webhooks   │
                              │                      │    │  (e.g., SMS)│
                              │ ├─ Real-time data    │    └─────────────┘
                              │ ├─ Alert list        │
                              │ ├─ Map integration   │
                              │ ├─ Historical graphs │
                              │ └─ WebSocket conn.   │
                              └──────────────────────┘
```

### Architecture Principles

| Principle | Implementation |
|-----------|---|
| **Separation of Concerns** | Ingestion layer ≠ Frontend (can scale independently) |
| **Real-time Processing** | Alerts generated within <1 second of sensor packet |
| **Fault Tolerance** | Device-side retries + backend idempotency keys |
| **Scalability** | Horizontal scaling via container orchestration |
| **Data Durability** | MongoDB transactions for critical operations |
| **Security** | API keys, rate limiting, request validation, TLS |
| **Observability** | Structured logging (JSON), metrics, alerting |

---

## Communication Flow

### Scenario 1: Normal Operation (Happy Path)

```
Time    Component              Event
────────────────────────────────────────────────────────────────
T+0     TTGO Sensor            Reads sensors every 10 mins
        └─ Level: 85cm, Rain: 2.5mm, Flow: 120 L/min

T+1     LoRa TX                Encodes 50-byte LoRa packet
        └─ Payload: {id, lvl, rain, flow, temp, ts}

T+2     TTGO Gateway           Receives LoRa packet (within ~10km)
        └─ Decodes & validates

T+3     Gateway (HTTP POST)    Sends to: https://backend.io/api/v1/data/ingest
        └─ Headers: Authorization: Bearer <API_KEY>
           Content-Type: application/json
           X-Idempotency-Key: uuid-ts-combination

T+4     Express Backend        Receives & validates payload
        ├─ Checks API key ✓
        ├─ Validates data types ✓
        ├─ Checks rate limit (max 20 requests/min) ✓
        ├─ Checks for duplicates (recent timestamps) ✓
        └─ Status 200 OK + {id, received_at}

T+5     MongoDB Write          Inserts document with indexes:
        ├─ sensor_id (hash)
        ├─ received_at (range, TTL: 90 days)
        └─ status ("NORMAL")

T+6     Alert Evaluation       Engine evaluates against thresholds:
        ├─ Rain: 2.5mm < 10mm (OK)
        ├─ Level: 85cm < 120cm critical (OK)
        ├─ Flow: 120 L/min < 200 (OK)
        └─ Trend: 3 consecutive readings < threshold (OK)
        Result: NO ALERT

T+7     WebSocket Broadcast    Sends to Next.js dashboard:
        └─ {sensor_id, status: "NORMAL", latest_reading: {...}}

T+8     Next.js Frontend       Updates real-time card:
        └─ Displays: ✓ Agua Normal (85cm)
```

### Scenario 2: Alert Triggered (High Water Level)

```
Time    Component              Event
────────────────────────────────────────────────────────────────
T+0     TTGO Sensor            Level: 125cm (CRITICAL)
T+3     Express Backend        Receives & validates
T+5     MongoDB Write          Inserts reading
T+6     Alert Engine           
        ├─ Current: 125cm > 120cm (critical threshold) ✓
        ├─ Trend: Check last 30 mins of readings
        │  └─ 125cm, 122cm, 120cm, 118cm (increasing!)
        ├─ No alert in last 5 mins for this type ✓
        └─ GENERATE ALERT
        
        Alert Document:
        {
          _id: ObjectId(...),
          sensor_id: "SENSOR_001",
          type: "WATER_LEVEL_CRITICAL",
          severity: "CRITICAL",
          value: 125,
          threshold: 120,
          message: "Critical water level at [Sensor Name]",
          detected_at: ISOString,
          status: "ACTIVE",
          acknowledged: false,
          escalation_level: 0
        }

T+6.5   Notification Layer
        ├─ Emit WebSocket to dashboard (real-time)
        ├─ Store in Redis (alert state)
        ├─ Trigger webhooks (if configured):
        │  ├─ SMS API: Send alert to authorized users
        │  ├─ Email notification
        │  └─ Third-party service (e.g., Slack)
        └─ Log event for audit trail

T+7     Next.js Dashboard      
        ├─ Receives WebSocket message
        ├─ Plays notification sound
        ├─ Highlights sensor card in RED
        ├─ Shows alert banner at top
        └─ Stores in local state for history
```

### Scenario 3: Gateway Failure & Retry

```
Time    Component              Event
────────────────────────────────────────────────────────────────
T+0     TTGO Sensor            Prepares packet
T+2     Gateway                Attempts HTTP POST #1
        └─ Network error (no internet) ❌

T+5     Gateway                Retry #2 (exponential backoff: 1s wait)
        └─ Timeout ❌

T+12    Gateway                Retry #3 (exponential backoff: 2s wait)
        └─ Timeout ❌

T+24    Gateway                Retry #4 (exponential backoff: 4s wait)
        └─ HTTP 200 OK ✓
        └─ Stores local timestamp to prevent duplicates

T+25    Express Backend        Receives packet
        ├─ Checks idempotency key: seen before?
        │  └─ X-Idempotency-Key: SENSOR_001_ts1234567890 (in Redis cache)
        ├─ If YES: Return 200 OK (idempotent) + cached response
        ├─ If NO: Process normally
        └─ Status 200 OK
```

---

## Migration Strategy

### Phase 1: Preparation (Week 1)
**Objective**: Set up new infrastructure without touching Next.js

**Tasks**:
1. Create Express backend repository (separate from Next.js)
2. Set up MongoDB time-series collection
3. Create TypeScript models & types
4. Set up Docker & Docker Compose for local development
5. Create test suite with sample sensor data
6. Document API contracts & LoRa payload format

**Outcome**: 
- Express server running locally on port 3001
- MongoDB schema ready
- API endpoints tested with Postman/cURL

---

### Phase 2: Ingestion Layer (Week 2)
**Objective**: Build Express backend with data validation & persistence

**Tasks**:
1. Implement data ingestion endpoint (`POST /api/v1/data/ingest`)
2. Add input validation using `zod` or `joi`
3. Implement rate limiting (using `express-rate-limit`)
4. Add MongoDB write operations with error handling
5. Implement idempotency checking (Redis)
6. Add structured logging (using `winston` or `pino`)
7. Create health check endpoint
8. Deploy to staging environment (if possible)

**Code**: See [Implementation Details](#implementation-details)

---

### Phase 3: Alert Engine (Week 3)
**Objective**: Real-time alert generation with threshold evaluation

**Tasks**:
1. Implement alert evaluation logic
2. Add trend analysis (sliding window)
3. Implement alert deduplication
4. Add alert escalation rules
5. Create alert storage in MongoDB
6. Implement webhook triggers
7. Add testing with mock sensor data

**Outcome**: 
- Alerts generated within <1s
- No duplicate alerts within 5 min window
- Escalation working as designed

---

### Phase 4: Real-time Communication (Week 4)
**Objective**: WebSocket integration for live dashboard updates

**Tasks**:
1. Implement WebSocket server in Express (`socket.io` or `ws`)
2. Create connection authentication
3. Implement room-based broadcasting (per sensor)
4. Add message deduplication
5. Integrate with Next.js frontend (add `socket.io-client`)
6. Test real-time updates with multiple connections

---

### Phase 5: Production Hardening (Week 5)
**Objective**: Security, monitoring, and deployment readiness

**Tasks**:
1. Implement API key management (rotate, revoke)
2. Add request signing (HMAC-SHA256 for gateway)
3. Implement DDoS protection (CloudFlare or similar)
4. Set up application monitoring (APM)
5. Create database backups strategy
6. Document runbook for incident response
7. Stress test with load simulation
8. Create deployment automation (CI/CD)

---

### Phase 6: Cutover (Week 6)
**Objective**: Gradual migration from Next.js API to Express backend

**Tasks**:
1. Redirect 10% of traffic to Express (canary deployment)
2. Monitor for errors & latency
3. Increase to 50% (if stable)
4. Monitor for 24 hours
5. Migrate to 100%
6. Disable old Next.js endpoints (keep as fallback)
7. Full testing on production-like data

---

## Implementation Details

### 1. TTGO Sensor Code (Arduino/PlatformIO)

```cpp
// file: src/main.cpp
// TTGO ESP32 Sensor Node with LoRa
// Sends sensor data via LoRa every 10 minutes

#include <Arduino.h>
#include <SPI.h>
#include <LoRa.h>
#include <DHT.h>

// LoRa Pins (TTGO ESP32)
#define LORA_SCK 5
#define LORA_MOSI 27
#define LORA_MISO 19
#define LORA_CS 18
#define LORA_RST 14
#define LORA_IRQ 26

// Sensor Pins
#define DHT_PIN 25
#define WATER_LEVEL_PIN 34      // ADC0 - Analog (0-4096)
#define RAIN_GAUGE_PIN 35       // ADC1 - Analog (0-4096)
#define FLOW_METER_PIN 13       // Digital pulse count

// Configuration
#define LORA_FREQUENCY 915E6     // 915 MHz (change for your region)
#define LORA_BANDWIDTH 125000    // 125 kHz
#define LORA_SPREADING_FACTOR 12 // 7-12 (higher = longer range, lower speed)
#define LORA_CODING_RATE 5       // 5-8

#define SENSOR_READ_INTERVAL 600000   // 10 minutes
#define SENSOR_ID 1                   // Unique ID for this sensor

DHT dht(DHT_PIN, DHT22);
volatile int flowPulseCount = 0;

struct SensorData {
  uint8_t sensor_id;           // 1 byte
  int16_t water_level;         // 2 bytes (cm, 0-500)
  uint16_t rain_accumulated;   // 2 bytes (mm*10, 0-6553.5mm)
  uint16_t flow_rate;          // 2 bytes (L/min*10, 0-6553.5)
  int16_t temperature;         // 2 bytes (°C*100, -32.67 to +32.67)
  uint8_t humidity;            // 1 byte (%, 0-100)
  uint32_t timestamp;          // 4 bytes (seconds since epoch)
  uint8_t battery_level;       // 1 byte (%, 0-100)
  // Total: 15 bytes (well under 250 byte LoRa limit)
};

void IRAM_ATTR flowMeterISR() {
  flowPulseCount++;
}

void setupLoRa() {
  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_CS);
  
  if (!LoRa.begin(LORA_FREQUENCY)) {
    Serial.println("LoRa init failed!");
    while (1);
  }

  LoRa.setSignalBandwidth(LORA_BANDWIDTH);
  LoRa.setSpreadingFactor(LORA_SPREADING_FACTOR);
  LoRa.setCodingRate4(LORA_CODING_RATE);
  LoRa.enableCrc();
  
  Serial.println("LoRa initialized");
}

void setupSensors() {
  dht.begin();
  pinMode(FLOW_METER_PIN, INPUT_PULLUP);
  attachInterrupt(FLOW_METER_PIN, flowMeterISR, FALLING);
  Serial.println("Sensors initialized");
}

SensorData readSensors() {
  SensorData data;
  data.sensor_id = SENSOR_ID;
  
  // Read DHT22 (temp + humidity)
  float temp = dht.readTemperature();
  float humidity = dht.readHumidity();
  
  if (!isnan(temp) && !isnan(humidity)) {
    data.temperature = (int16_t)(temp * 100);
    data.humidity = (uint8_t)humidity;
  }
  
  // Read water level (0-4096 ADC → 0-200cm)
  int adc = analogRead(WATER_LEVEL_PIN);
  data.water_level = (int16_t)((adc / 4096.0) * 200);
  
  // Read rain gauge (0-4096 ADC → 0-500mm accumulated)
  adc = analogRead(RAIN_GAUGE_PIN);
  data.rain_accumulated = (uint16_t)((adc / 4096.0) * 5000); // *10 for precision
  
  // Calculate flow rate from pulse count
  // Assuming 1 pulse = 1 L (calibrate for your sensor)
  data.flow_rate = (uint16_t)(flowPulseCount * 10); // *10 for precision
  flowPulseCount = 0;
  
  // Timestamp
  data.timestamp = (uint32_t)(millis() / 1000);
  
  // Battery (simulated)
  data.battery_level = 85;
  
  return data;
}

void sendLoRaPacket(SensorData& data) {
  LoRa.beginPacket();
  
  // Send raw bytes
  LoRa.write((uint8_t*)&data, sizeof(data));
  
  LoRa.endPacket();
  Serial.printf("Packet sent: ID=%d, Level=%dcm, Rain=%dmm, Flow=%dL/min\n",
    data.sensor_id, data.water_level, data.rain_accumulated / 10, data.flow_rate / 10);
}

unsigned long lastSendTime = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  setupLoRa();
  setupSensors();
  
  Serial.println("TTGO Sensor Node started");
}

void loop() {
  unsigned long now = millis();
  
  if (now - lastSendTime >= SENSOR_READ_INTERVAL) {
    lastSendTime = now;
    
    SensorData data = readSensors();
    sendLoRaPacket(data);
    
    // Power down for 9.9 minutes (deep sleep)
    // esp_sleep_enable_timer_wakeup(590 * 1000000); // 590 seconds
    // esp_deep_sleep_start();
  }
}
```

---

### 2. TTGO Gateway Code (Arduino/PlatformIO)

```cpp
// file: src/gateway.cpp
// TTGO ESP32 Gateway: Receives LoRa & forwards via HTTP/MQTT

#include <Arduino.h>
#include <SPI.h>
#include <LoRa.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi & Backend Configuration
#define SSID "your_wifi_ssid"
#define PASSWORD "your_wifi_password"
#define BACKEND_URL "https://backend.yourapp.io/api/v1/data/ingest"
#define API_KEY "sk_your_api_key_here"
#define GATEWAY_ID "GATEWAY_001"

// LoRa Pins (same as sensor)
#define LORA_SCK 5
#define LORA_MOSI 27
#define LORA_MISO 19
#define LORA_CS 18
#define LORA_RST 14
#define LORA_IRQ 26

// Retry configuration
#define MAX_RETRIES 5
#define INITIAL_RETRY_DELAY 1000  // 1 second
#define MAX_RETRY_DELAY 32000     // 32 seconds

struct SensorData {
  uint8_t sensor_id;
  int16_t water_level;
  uint16_t rain_accumulated;
  uint16_t flow_rate;
  int16_t temperature;
  uint8_t humidity;
  uint32_t timestamp;
  uint8_t battery_level;
};

void setupLoRa() {
  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_CS);
  
  if (!LoRa.begin(915E6)) {
    Serial.println("LoRa init failed!");
    while (1);
  }
  
  LoRa.setSignalBandwidth(125000);
  LoRa.setSpreadingFactor(12);
  LoRa.setCodingRate4(5);
  LoRa.enableCrc();
  
  Serial.println("LoRa receiver ready");
}

void setupWiFi() {
  Serial.printf("Connecting to WiFi: %s\n", SSID);
  WiFi.begin(SSID, PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\nWiFi connected. IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\nFailed to connect to WiFi");
  }
}

bool sendToBackend(SensorData& data) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected");
    return false;
  }
  
  HTTPClient http;
  http.setConnectTimeout(5000);
  http.setTimeout(10000);
  
  // Create JSON payload
  DynamicJsonDocument doc(256);
  doc["sensor_id"] = String(data.sensor_id);
  doc["water_level_cm"] = data.water_level;
  doc["rain_accumulated_mm"] = data.rain_accumulated / 10.0;
  doc["flow_rate_lmin"] = data.flow_rate / 10.0;
  doc["temperature_c"] = data.temperature / 100.0;
  doc["humidity_percent"] = data.humidity;
  doc["timestamp"] = data.timestamp;
  doc["battery_percent"] = data.battery_level;
  doc["gateway_id"] = GATEWAY_ID;
  
  String payload;
  serializeJson(doc, payload);
  
  Serial.printf("Sending payload: %s\n", payload.c_str());
  
  // Set headers
  http.begin(BACKEND_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + API_KEY);
  http.addHeader("X-Idempotency-Key", 
    String("SENSOR_") + data.sensor_id + "_" + data.timestamp);
  
  int httpResponseCode = http.POST(payload);
  
  if (httpResponseCode > 0) {
    Serial.printf("HTTP Response code: %d\n", httpResponseCode);
    if (httpResponseCode == 200 || httpResponseCode == 201) {
      String response = http.getString();
      Serial.printf("Response: %s\n", response.c_str());
      http.end();
      return true;
    }
  } else {
    Serial.printf("Error on sending POST: %s\n", http.errorToString(httpResponseCode).c_str());
  }
  
  http.end();
  return false;
}

bool sendWithRetry(SensorData& data) {
  int delayMs = INITIAL_RETRY_DELAY;
  
  for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    Serial.printf("Send attempt %d/%d\n", attempt, MAX_RETRIES);
    
    if (sendToBackend(data)) {
      Serial.println("✓ Data sent successfully");
      return true;
    }
    
    if (attempt < MAX_RETRIES) {
      Serial.printf("Retrying in %dms...\n", delayMs);
      delay(delayMs);
      delayMs = min(delayMs * 2, MAX_RETRY_DELAY); // Exponential backoff
    }
  }
  
  Serial.println("✗ Failed to send after all retries");
  return false;
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  setupLoRa();
  setupWiFi();
  
  Serial.println("Gateway initialized");
}

void loop() {
  int packetSize = LoRa.parsePacket();
  
  if (packetSize == sizeof(SensorData)) {
    Serial.println("Packet received");
    
    // Read LoRa packet
    SensorData data;
    uint8_t* buffer = (uint8_t*)&data;
    
    for (int i = 0; i < packetSize; i++) {
      buffer[i] = LoRa.read();
    }
    
    Serial.printf("RSSI: %d, SNR: %.2f\n", LoRa.packetRssi(), LoRa.packetSnr());
    
    // Send to backend with retry logic
    sendWithRetry(data);
    
  } else if (packetSize > 0) {
    Serial.printf("Unexpected packet size: %d (expected %d)\n", 
      packetSize, (int)sizeof(SensorData));
    while (LoRa.available()) {
      LoRa.read();
    }
  }
}
```

---

### 3. Express Backend - Data Ingestion Layer

See the implementation code files created in the workspace.

---

### 4. MongoDB Schema & Models

```typescript
// MongoDB Time-Series Collection Schema

// 1. Sensor Readings (Time-Series optimized)
db.createCollection("sensor_readings", {
  timeseries: {
    timeField: "timestamp",
    metaField: "metadata",
    granularity: "minutes"  // Or "hours" if data is less frequent
  }
})

// Documents inserted will look like:
{
  _id: ObjectId(...),
  timestamp: ISODate("2025-11-22T10:30:00Z"),
  metadata: {
    sensor_id: "SENSOR_001",
    gateway_id: "GATEWAY_001",
    location: { lat: -34.123, lng: -58.456 }
  },
  water_level_cm: 85,
  rain_accumulated_mm: 2.5,
  flow_rate_lmin: 120,
  temperature_c: 22.3,
  humidity_percent: 65,
  battery_percent: 85,
  rssi: -95,  // Signal strength
  snr: 7.5    // Signal-to-noise ratio
}

// 2. Alerts Collection
db.createCollection("alerts", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["sensor_id", "type", "severity", "detected_at"],
      properties: {
        _id: { bsonType: "objectId" },
        sensor_id: { bsonType: "string" },
        gateway_id: { bsonType: "string" },
        type: { 
          enum: ["WATER_LEVEL_HIGH", "WATER_LEVEL_CRITICAL", 
                 "RAINFALL_HEAVY", "FLOW_EXCESSIVE", "TEMPERATURE_ANOMALY"]
        },
        severity: { 
          enum: ["INFO", "WARNING", "CRITICAL"]
        },
        value: { bsonType: "number" },
        threshold: { bsonType: "number" },
        message: { bsonType: "string" },
        detected_at: { bsonType: "date" },
        resolved_at: { bsonType: ["date", "null"] },
        status: { 
          enum: ["ACTIVE", "ACKNOWLEDGED", "RESOLVED"]
        },
        acknowledged: { bsonType: "bool" },
        acknowledged_at: { bsonType: ["date", "null"] },
        acknowledged_by: { bsonType: ["string", "null"] },
        escalation_level: { bsonType: "int" },
        webhook_sent: { bsonType: "bool" },
        webhook_response: { bsonType: ["string", "null"] }
      }
    }
  }
})

// Indexes for optimal performance:
db.sensor_readings.createIndex({ "metadata.sensor_id": 1, "timestamp": -1 })
db.sensor_readings.createIndex({ "timestamp": -1 })
db.sensor_readings.createIndex({ "metadata.gateway_id": 1 })

db.alerts.createIndex({ "sensor_id": 1, "detected_at": -1 })
db.alerts.createIndex({ "status": 1, "detected_at": -1 })
db.alerts.createIndex({ "detected_at": 1 }, { expireAfterSeconds: 7776000 }) // 90 days TTL

// 3. Sensor Configuration
db.createCollection("sensors", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["sensor_id", "name"],
      properties: {
        _id: { bsonType: "objectId" },
        sensor_id: { bsonType: "string", pattern: "^SENSOR_[0-9]{3}$" },
        name: { bsonType: "string" },
        description: { bsonType: "string" },
        enabled: { bsonType: "bool" },
        location: {
          bsonType: "object",
          properties: {
            latitude: { bsonType: "number" },
            longitude: { bsonType: "number" },
            zone_name: { bsonType: "string" },
            province: { bsonType: "string" }
          }
        },
        thresholds: {
          bsonType: "object",
          properties: {
            water_level_warning_cm: { bsonType: "number" },
            water_level_critical_cm: { bsonType: "number" },
            rainfall_heavy_mm: { bsonType: "number" },
            flow_excessive_lmin: { bsonType: "number" },
            temperature_min_c: { bsonType: "number" },
            temperature_max_c: { bsonType: "number" }
          }
        },
        read_interval_seconds: { bsonType: "int" },
        created_at: { bsonType: "date" },
        updated_at: { bsonType: "date" }
      }
    }
  }
})

db.sensors.createIndex({ "sensor_id": 1 }, { unique: true })
db.sensors.createIndex({ "enabled": 1 })
```

---

### 5. Alert Evaluation & Processing Logic

```typescript
// file: backend/src/services/alertService.ts

import { MongoClient, Db } from 'mongodb';
import { SensorReading, Alert, AlertType, AlertSeverity } from '../types';
import Redis from 'ioredis';

interface AlertThresholds {
  water_level_warning_cm: number;
  water_level_critical_cm: number;
  rainfall_heavy_mm: number;
  flow_excessive_lmin: number;
  temperature_min_c: number;
  temperature_max_c: number;
}

interface TrendAnalysis {
  direction: 'increasing' | 'decreasing' | 'stable';
  avgChange: number;
  volatility: number;
}

export class AlertService {
  constructor(
    private db: Db,
    private redis: Redis
  ) {}

  /**
   * Main alert evaluation function
   * Called for each incoming sensor reading
   */
  async evaluateAndCreateAlerts(
    reading: SensorReading,
    sensorConfig: { thresholds: AlertThresholds }
  ): Promise<Alert[]> {
    const alerts: Alert[] = [];

    // 1. Get recent readings for trend analysis (last 30 minutes)
    const recentReadings = await this.getRecentReadings(
      reading.metadata.sensor_id,
      30 * 60 * 1000
    );

    // 2. Evaluate each metric
    const waterLevelAlert = await this.evaluateWaterLevel(
      reading,
      sensorConfig.thresholds,
      recentReadings
    );
    if (waterLevelAlert) alerts.push(waterLevelAlert);

    const rainfallAlert = await this.evaluateRainfall(
      reading,
      sensorConfig.thresholds
    );
    if (rainfallAlert) alerts.push(rainfallAlert);

    const flowAlert = await this.evaluateFlow(
      reading,
      sensorConfig.thresholds,
      recentReadings
    );
    if (flowAlert) alerts.push(flowAlert);

    const tempAlert = await this.evaluateTemperature(
      reading,
      sensorConfig.thresholds
    );
    if (tempAlert) alerts.push(tempAlert);

    // 3. Store alerts in MongoDB
    if (alerts.length > 0) {
      await this.storeAlerts(alerts, reading);
    }

    return alerts;
  }

  /**
   * Evaluate water level against thresholds
   * Uses trend analysis to detect rapid increases
   */
  private async evaluateWaterLevel(
    reading: SensorReading,
    thresholds: AlertThresholds,
    recentReadings: SensorReading[]
  ): Promise<Alert | null> {
    const level = reading.water_level_cm;
    const criticalThreshold = thresholds.water_level_critical_cm;
    const warningThreshold = thresholds.water_level_warning_cm;

    // Check if critical threshold exceeded
    if (level > criticalThreshold) {
      const alert = this.createAlert(
        reading,
        'WATER_LEVEL_CRITICAL',
        'CRITICAL',
        `Water level CRITICAL: ${level}cm (threshold: ${criticalThreshold}cm)`,
        level,
        criticalThreshold
      );
      
      // Check deduplication
      if (await this.shouldCreateAlert('WATER_LEVEL_CRITICAL', reading.metadata.sensor_id)) {
        return alert;
      }
    }

    // Check if warning threshold exceeded
    if (level > warningThreshold && level <= criticalThreshold) {
      // Analyze trend
      const trend = await this.analyzeTrend(recentReadings.map(r => r.water_level_cm));
      
      // Only alert if level is rising (potential danger)
      if (trend.direction === 'increasing' && trend.avgChange > 2) { // 2cm per reading
        const alert = this.createAlert(
          reading,
          'WATER_LEVEL_HIGH',
          'WARNING',
          `Water level HIGH and RISING: ${level}cm (trend: +${trend.avgChange.toFixed(1)}cm/reading)`,
          level,
          warningThreshold
        );
        
        if (await this.shouldCreateAlert('WATER_LEVEL_HIGH', reading.metadata.sensor_id)) {
          return alert;
        }
      }
    }

    return null;
  }

  /**
   * Evaluate rainfall intensity
   */
  private async evaluateRainfall(
    reading: SensorReading,
    thresholds: AlertThresholds
  ): Promise<Alert | null> {
    const rain = reading.rain_accumulated_mm;
    const threshold = thresholds.rainfall_heavy_mm;

    if (rain > threshold) {
      const alert = this.createAlert(
        reading,
        'RAINFALL_HEAVY',
        'WARNING',
        `Heavy rainfall detected: ${rain}mm (threshold: ${threshold}mm)`,
        rain,
        threshold
      );

      if (await this.shouldCreateAlert('RAINFALL_HEAVY', reading.metadata.sensor_id)) {
        return alert;
      }
    }

    return null;
  }

  /**
   * Evaluate flow rate
   */
  private async evaluateFlow(
    reading: SensorReading,
    thresholds: AlertThresholds,
    recentReadings: SensorReading[]
  ): Promise<Alert | null> {
    const flow = reading.flow_rate_lmin;
    const threshold = thresholds.flow_excessive_lmin;

    if (flow > threshold) {
      const trend = await this.analyzeTrend(recentReadings.map(r => r.flow_rate_lmin));
      
      // Only alert if flow is increasing
      if (trend.direction === 'increasing' || flow > threshold * 1.2) {
        const alert = this.createAlert(
          reading,
          'FLOW_EXCESSIVE',
          'WARNING',
          `Excessive flow detected: ${flow}L/min (threshold: ${threshold}L/min)`,
          flow,
          threshold
        );

        if (await this.shouldCreateAlert('FLOW_EXCESSIVE', reading.metadata.sensor_id)) {
          return alert;
        }
      }
    }

    return null;
  }

  /**
   * Evaluate temperature anomalies
   */
  private async evaluateTemperature(
    reading: SensorReading,
    thresholds: AlertThresholds
  ): Promise<Alert | null> {
    const temp = reading.temperature_c;

    if (temp < thresholds.temperature_min_c || temp > thresholds.temperature_max_c) {
      const severity = Math.abs(temp - 25) > 10 ? 'WARNING' : 'INFO';
      
      const alert = this.createAlert(
        reading,
        'TEMPERATURE_ANOMALY',
        severity,
        `Temperature anomaly: ${temp}°C`,
        temp,
        temp < thresholds.temperature_min_c 
          ? thresholds.temperature_min_c 
          : thresholds.temperature_max_c
      );

      if (await this.shouldCreateAlert('TEMPERATURE_ANOMALY', reading.metadata.sensor_id)) {
        return alert;
      }
    }

    return null;
  }

  /**
   * Deduplication check: Prevent duplicate alerts within 5 minute window
   */
  private async shouldCreateAlert(
    alertType: AlertType,
    sensorId: string
  ): Promise<boolean> {
    const dedupeKey = `alert:${alertType}:${sensorId}`;
    
    // Check if alert exists in Redis (5 min expiry)
    const existing = await this.redis.get(dedupeKey);
    
    if (existing) {
      return false; // Skip duplicate
    }

    // Store alert in Redis with 5 min expiry
    await this.redis.setex(dedupeKey, 300, JSON.stringify({
      createdAt: new Date().toISOString(),
      count: 1
    }));

    return true;
  }

  /**
   * Trend analysis using sliding window
   * Evaluates last 6 readings (typically 1 hour of data)
   */
  private async analyzeTrend(values: number[]): Promise<TrendAnalysis> {
    if (values.length < 2) {
      return { direction: 'stable', avgChange: 0, volatility: 0 };
    }

    const changes: number[] = [];
    for (let i = 1; i < values.length; i++) {
      changes.push(values[i] - values[i - 1]);
    }

    const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
    const variance = changes.reduce((a, val) => a + Math.pow(val - avgChange, 2), 0) / changes.length;
    const volatility = Math.sqrt(variance);

    let direction: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (avgChange > 0.5) direction = 'increasing';
    if (avgChange < -0.5) direction = 'decreasing';

    return { direction, avgChange, volatility };
  }

  /**
   * Get recent readings for trend analysis
   */
  private async getRecentReadings(
    sensorId: string,
    timeWindowMs: number
  ): Promise<SensorReading[]> {
    const cutoffTime = new Date(Date.now() - timeWindowMs);

    return this.db
      .collection<SensorReading>('sensor_readings')
      .find({
        'metadata.sensor_id': sensorId,
        timestamp: { $gte: cutoffTime }
      })
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();
  }

  /**
   * Create alert document
   */
  private createAlert(
    reading: SensorReading,
    type: AlertType,
    severity: AlertSeverity,
    message: string,
    value: number,
    threshold: number
  ): Alert {
    return {
      sensor_id: reading.metadata.sensor_id,
      gateway_id: reading.metadata.gateway_id,
      type,
      severity,
      value,
      threshold,
      message,
      detected_at: new Date(),
      resolved_at: null,
      status: 'ACTIVE',
      acknowledged: false,
      acknowledged_at: null,
      acknowledged_by: null,
      escalation_level: 0,
      webhook_sent: false,
      webhook_response: null
    };
  }

  /**
   * Store alerts in MongoDB
   */
  private async storeAlerts(
    alerts: Alert[],
    reading: SensorReading
  ): Promise<void> {
    const collection = this.db.collection<Alert>('alerts');
    
    for (const alert of alerts) {
      try {
        const result = await collection.insertOne(alert);
        
        // Trigger webhooks asynchronously
        this.triggerWebhooks(alert, reading).catch(err => {
          console.error('Webhook trigger error:', err);
        });
      } catch (error) {
        console.error('Error storing alert:', error);
      }
    }
  }

  /**
   * Trigger external webhooks (SMS, email, Slack, etc.)
   */
  private async triggerWebhooks(alert: Alert, reading: SensorReading): Promise<void> {
    // Implementation depends on your webhook system
    // Could call SMS API, Slack, email service, etc.
  }
}
```

---

## Deployment Guide

### Local Development

```bash
# 1. Clone repositories
git clone <express-backend-repo>
git clone <next-frontend-repo>

# 2. Setup backend
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB connection string & API keys

# 3. Setup MongoDB locally (Docker)
docker-compose up -d mongodb
npm run db:migrate

# 4. Start backend
npm run dev  # Runs on http://localhost:3001

# 5. Start frontend
cd ../frontend
npm install
npm run dev  # Runs on http://localhost:3000
```

### Staging/Production Deployment

```bash
# Using Docker & Docker Compose

# 1. Backend dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3001
CMD ["node", "dist/index.js"]

# 2. Docker Compose
version: '3.8'
services:
  mongodb:
    image: mongo:latest
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
    volumes:
      - mongodb_data:/data/db
    ports:
      - "27017:27017"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      NODE_ENV: production
      MONGODB_URI: mongodb://admin:password@mongodb:27017/flood_alert?authSource=admin
      REDIS_URL: redis://redis:6379
      API_KEY_SECRET: ${API_KEY_SECRET}
      WEBHOOK_SECRET: ${WEBHOOK_SECRET}
    depends_on:
      - mongodb
      - redis
    restart: unless-stopped

volumes:
  mongodb_data:

# 3. Deploy to Heroku/Railway/Render
# Just push the Docker image and connect your MongoDB Atlas

# 4. Environment variables (production)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/flood_alert
REDIS_URL=redis://red... (or use AWS ElastiCache)
API_KEY_SECRET=sk_live_...
NODE_ENV=production
LOG_LEVEL=info
```

---

## Security Considerations

### 1. API Authentication & Authorization

```typescript
// Implement API key rotation & revocation
interface ApiKey {
  _id: ObjectId;
  key: string; // Hash with bcrypt
  gateway_id: string;
  name: string;
  created_at: Date;
  expires_at?: Date;
  revoked: boolean;
  last_used_at?: Date;
  rate_limit: {
    requests_per_minute: number;
    requests_per_hour: number;
  }
}

// Middleware for API authentication
export async function authenticateApiKey(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing API key' });
  }

  const apiKey = authHeader.substring(7);
  
  // Validate against database
  const keyDoc = await db.collection('api_keys').findOne({
    key: hashKey(apiKey),
    revoked: false
  });

  if (!keyDoc || (keyDoc.expires_at && keyDoc.expires_at < new Date())) {
    return res.status(403).json({ error: 'Invalid or expired API key' });
  }

  // Attach to request
  req.userId = keyDoc.gateway_id;
  
  // Update last_used_at
  db.collection('api_keys').updateOne(
    { _id: keyDoc._id },
    { $set: { last_used_at: new Date() } }
  ).catch(console.error);

  next();
}
```

### 2. Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute per IP
  keyGenerator: (req) => req.userId || req.ip, // Use gateway ID if available
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: req.rateLimit.resetTime
    });
  },
  skip: (req) => req.method === 'GET' // Don't limit reads
});

app.post('/api/v1/data/ingest', apiLimiter, ingestDataHandler);
```

### 3. Data Validation & Sanitization

```typescript
import { z } from 'zod';

const SensorReadingSchema = z.object({
  sensor_id: z.string().regex(/^SENSOR_\d{3}$/),
  water_level_cm: z.number().min(0).max(500),
  rain_accumulated_mm: z.number().min(0).max(10000),
  flow_rate_lmin: z.number().min(0).max(10000),
  temperature_c: z.number().min(-50).max(60),
  humidity_percent: z.number().min(0).max(100),
  timestamp: z.number().int().positive(),
  battery_percent: z.number().min(0).max(100)
});

// Use in handler
try {
  const validated = SensorReadingSchema.parse(req.body);
  // Process validated data
} catch (error: ZodError) {
  return res.status(400).json({
    error: 'Invalid sensor data',
    details: error.errors
  });
}
```

### 4. Request Signing (Optional - Extra Security)

```typescript
// Gateway signs request with HMAC-SHA256
import crypto from 'crypto';

// In gateway (Arduino):
function signRequest(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

// In backend:
export function verifyRequestSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSig)
  );
}
```

### 5. TLS/HTTPS

```typescript
// Always use HTTPS in production
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('/etc/ssl/private/key.pem'),
  cert: fs.readFileSync('/etc/ssl/certs/cert.pem')
};

https.createServer(options, app).listen(443);
```

---

## Future Enhancements

### 1. Migration to LoRaWAN + TTN

**When**: Once gateway hardware upgrades or TTN coverage available

**Benefits**:
- Official LoRaWAN gateway infrastructure
- Built-in device management
- Multi-gateway redundancy
- Encrypted uplinks

**Integration**:
```
TTN Application → TTN Webhook → Your Backend (/api/v1/data/ingest)
```

**TTN payload decoder** (JavaScript):
```javascript
function Decoder(bytes, port) {
  var data = {};
  
  data.sensor_id = bytes[0];
  data.water_level = (bytes[1] << 8 | bytes[2]) / 100;
  data.rain = (bytes[3] << 8 | bytes[4]) / 100;
  data.flow = (bytes[5] << 8 | bytes[6]) / 100;
  data.temperature = (bytes[7] << 8 | bytes[8]) / 100;
  data.humidity = bytes[9];
  data.battery = bytes[10];
  
  return data;
}
```

### 2. MQTT Broker Integration

**When**: Multiple gateways in different regions

**Setup**:
```bash
# Using Mosquitto (local) or EMQX Cloud (managed)

# Gateway publishes to:
/flood-alert/sensor/SENSOR_001/data

# Backend subscribes and consumes
mqtt://backend-server:1883/flood-alert/+/data

# Benefits:
# - Decoupling producer/consumer
# - Message queuing (if backend down)
# - Easy horizontal scaling
# - Built-in persistence
```

### 3. Machine Learning for Predictive Alerts

**Trend**:
```
Current: Reactive alerts (threshold breach)
Future: Predictive alerts (likely flooding in 2 hours)
```

**Implementation**:
- Time-series forecasting (ARIMA, Prophet, LSTM)
- Anomaly detection (Isolation Forest)
- Pattern recognition (similar historical events)

### 4. Multi-Region Failover

```
Primary Region (us-east-1)
  ├─ MongoDB Master
  └─ Gateway A

Secondary Region (us-west-1)
  ├─ MongoDB Replica
  └─ Gateway B (standby)

Auto-failover on primary failure
```

### 5. Mobile Notifications

```typescript
// Firebase Cloud Messaging (FCM)
import admin from 'firebase-admin';

async function sendPushNotification(alert: Alert) {
  const userTokens = await db.collection('user_tokens')
    .find({ sensor_ids: alert.sensor_id })
    .toArray();

  for (const { fcm_token } of userTokens) {
    await admin.messaging().send({
      token: fcm_token,
      notification: {
        title: '⚠️ Flood Alert!',
        body: alert.message
      },
      data: {
        alert_id: alert._id?.toString() || '',
        severity: alert.severity
      }
    });
  }
}
```

---

## Implementation Roadmap

| Phase | Duration | Key Deliverables | Success Metrics |
|-------|----------|------------------|-----------------|
| **Phase 1: Setup** | 1 week | Express repo, MongoDB schema, Docker setup | Backend runs locally |
| **Phase 2: Ingestion** | 1 week | Data endpoint, validation, error handling | Accepts 100 req/min with <100ms latency |
| **Phase 3: Alerts** | 1 week | Alert engine, trend analysis, deduplication | Generates correct alerts, <1s latency |
| **Phase 4: Real-time** | 1 week | WebSocket server, frontend integration | Dashboard updates <500ms after sensor read |
| **Phase 5: Hardening** | 1 week | Security, monitoring, backup strategy | Passes security audit, 99.5% uptime test |
| **Phase 6: Cutover** | 1 week | Canary deployment, monitoring, rollback plan | Zero-downtime migration, <1% error rate |

---

## Support & Troubleshooting

### Common Issues

**Issue**: Gateway cannot reach backend
- **Cause**: WiFi issues, DNS resolution, firewall
- **Solution**: Add retry logic with exponential backoff (implemented in code above)

**Issue**: Duplicate readings in database
- **Cause**: Gateway retries without idempotency checking
- **Solution**: Use `X-Idempotency-Key` header (implemented)

**Issue**: Alerts firing too frequently
- **Cause**: Threshold too low, no deduplication
- **Solution**: Adjust thresholds, implement 5-min alert deduplication window (implemented)

**Issue**: Database growing too fast
- **Cause**: No data retention policy
- **Solution**: Implement TTL indexes (90-day retention shown in schema)

---

## Contact & Questions

For implementation questions, refer to specific code sections in this document or create a separate technical runbook.

**Next Steps**:
1. Review this architecture with your team
2. Set up Express backend repository
3. Configure MongoDB Atlas for production
4. Build and test TTGO gateway code
5. Deploy backend to staging environment

