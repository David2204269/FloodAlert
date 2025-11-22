# WiFi HTTP API para TTGO Gateway

## Configuración TTGO (Firmware)

El TTGO Gateway debe estar configurado para enviar datos vía HTTP (WiFi) al backend.

### Requisitos TTGO:
1. **Conectividad WiFi**: SSID y contraseña configuradas
2. **IP del Backend**: Dirección IP y puerto del servidor Express
3. **API Key**: Clave de autenticación para el endpoint

### Ejemplo de Código Arduino/PlatformIO para TTGO:

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "YOUR_SSID";
const char* password = "YOUR_PASSWORD";
const char* serverUrl = "http://192.168.1.100:3001/api/v1/data/sensor";
const char* apiKey = "sk_dev_replace_with_secure_key"; // Same as API_KEY_SECRET in .env

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("WiFi connected");
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    sendSensorData();
  }
  
  delay(60000); // Send every 60 seconds
}

void sendSensorData() {
  HTTPClient http;
  
  // Create JSON payload
  StaticJsonDocument<512> doc;
  doc["sensor_id"] = "SENSOR_001";
  doc["gateway_id"] = "GATEWAY_001";
  doc["timestamp"] = millis();
  doc["water_level_cm"] = readWaterLevel();
  doc["rain_accumulated_mm"] = readRainfall();
  doc["flow_rate_lmin"] = readFlowRate();
  doc["temperature_c"] = readTemperature();
  doc["humidity_percent"] = readHumidity();
  doc["battery_percent"] = readBattery();
  doc["rssi"] = WiFi.RSSI(); // LoRa signal strength (if available)
  
  String payload;
  serializeJson(doc, payload);
  
  // Send HTTP POST
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + apiKey);
  http.addHeader("X-Idempotency-Key", String(millis()));
  
  int httpCode = http.POST(payload);
  
  if (httpCode > 0) {
    Serial.println("Response: " + http.getString());
  } else {
    Serial.println("HTTP Error: " + String(httpCode));
  }
  
  http.end();
}
```

---

## API Endpoints

### 1. POST `/api/v1/data/sensor` (Principal)

**Descripción**: Recibe datos de sensores via HTTP desde TTGO Gateway

**Headers requeridos**:
```
Authorization: Bearer <API_KEY_SECRET>
Content-Type: application/json
X-Idempotency-Key: <unique-request-id> (opcional)
```

**Payload JSON**:
```json
{
  "sensor_id": "SENSOR_001",
  "gateway_id": "GATEWAY_001",
  "timestamp": 1700000000000,
  "water_level_cm": 45.5,
  "rain_accumulated_mm": 10.2,
  "flow_rate_lmin": 250,
  "temperature_c": 25.5,
  "humidity_percent": 65,
  "battery_percent": 85,
  "rssi": -95,
  "snr": 7.5
}
```

**Response Success (201)**:
```json
{
  "ok": true,
  "received_at": "2024-11-22T15:30:45.123Z",
  "reading_id": "507f1f77bcf86cd799439011"
}
```

**Response Error (400)**:
```json
{
  "ok": false,
  "error": "Invalid water_level_cm: must be between 0 and 500",
  "code": "INGESTION_FAILED"
}
```

**Validaciones**:
- `sensor_id`: requerido, string
- `gateway_id`: requerido, string
- `timestamp`: requerido, número (millisegundos desde época)
- `water_level_cm`: 0-500 cm
- `rain_accumulated_mm`: 0-10000 mm
- `flow_rate_lmin`: 0-10000 L/min
- `temperature_c`: -50 a 60 °C
- `humidity_percent`: 0-100 %
- `battery_percent`: 0-100 %
- `rssi`: opcional, valor RSSI en dBm
- `snr`: opcional, relación señal-ruido

---

### 2. GET `/api/v1/data/status/:sensor_id`

**Descripción**: Obtiene el estado actual (lectura más reciente) de un sensor

**Parámetros**:
- `:sensor_id`: ID del sensor (e.g., `SENSOR_001`)

**Response (200)**:
```json
{
  "ok": true,
  "data": {
    "metadata": {
      "sensor_id": "SENSOR_001",
      "gateway_id": "GATEWAY_001"
    },
    "timestamp": "2024-11-22T15:30:45.123Z",
    "water_level_cm": 45.5,
    "rain_accumulated_mm": 10.2,
    "flow_rate_lmin": 250,
    "temperature_c": 25.5,
    "humidity_percent": 65,
    "battery_percent": 85,
    "rssi": -95,
    "signal_quality": "good",
    "received_at": "2024-11-22T15:30:45.123Z"
  }
}
```

---

### 3. GET `/api/v1/data/history/:sensor_id`

**Descripción**: Obtiene datos históricos de un sensor

**Parámetros Query**:
- `hours`: número de horas atrás (default: 24)
- `limit`: máximo de registros (default: 100)

**Ejemplo**: `/api/v1/data/history/SENSOR_001?hours=12&limit=50`

**Response (200)**:
```json
{
  "ok": true,
  "sensor_id": "SENSOR_001",
  "data": [
    {
      "metadata": { "sensor_id": "SENSOR_001", "gateway_id": "GATEWAY_001" },
      "timestamp": "2024-11-22T15:30:45.123Z",
      "water_level_cm": 45.5,
      ...
    },
    ...
  ],
  "count": 50
}
```

---

### 4. GET `/api/v1/data/gateway/:gateway_id`

**Descripción**: Obtiene todas las lecturas recientes de un gateway

**Parámetros**:
- `:gateway_id`: ID del gateway (e.g., `GATEWAY_001`)

**Response (200)**:
```json
{
  "ok": true,
  "gateway_id": "GATEWAY_001",
  "readings_count": 12,
  "data": [...]
}
```

---

### 5. GET `/api/v1/data/gateways`

**Descripción**: Lista todos los gateways registrados

**Response (200)**:
```json
{
  "ok": true,
  "gateways": [
    {
      "gateway_id": "GATEWAY_001",
      "name": "Gateway 001",
      "location": { "lat": -34.6037, "lng": -58.3816 },
      "status": "online",
      "last_seen": "2024-11-22T15:30:45.123Z",
      "registered_at": "2024-11-20T10:00:00.000Z",
      "reading_count": 150
    }
  ],
  "count": 1
}
```

---

### 6. GET `/api/v1/data/stats/:sensor_id`

**Descripción**: Obtiene estadísticas agregadas de un sensor

**Parámetros Query**:
- `hours`: número de horas atrás (default: 24)

**Response (200)**:
```json
{
  "ok": true,
  "sensor_id": "SENSOR_001",
  "hours": 24,
  "stats": {
    "count": 145,
    "avg_water_level": 42.3,
    "max_water_level": 65.5,
    "min_water_level": 15.2,
    "avg_temperature": 23.4,
    "avg_humidity": 62.1,
    "total_rain": 45.8,
    "max_flow": 450,
    "avg_battery": 78.5
  }
}
```

---

### 7. POST `/api/v1/data/gateway/register`

**Descripción**: Registra un nuevo gateway con metadatos

**Headers requeridos**:
```
Authorization: Bearer <API_KEY_SECRET>
Content-Type: application/json
```

**Payload**:
```json
{
  "gateway_id": "GATEWAY_001",
  "name": "Gateway Buenos Aires",
  "location": {
    "lat": -34.6037,
    "lng": -58.3816
  }
}
```

**Response (201)**:
```json
{
  "ok": true,
  "message": "Gateway registered successfully",
  "gateway_id": "GATEWAY_001"
}
```

---

### 8. GET `/api/v1/data/gateway/:gateway_id/info`

**Descripción**: Obtiene información detallada de un gateway

**Response (200)**:
```json
{
  "ok": true,
  "data": {
    "gateway_id": "GATEWAY_001",
    "name": "Gateway Buenos Aires",
    "location": { "lat": -34.6037, "lng": -58.3816 },
    "status": "online",
    "last_seen": "2024-11-22T15:30:45.123Z",
    "registered_at": "2024-11-20T10:00:00.000Z",
    "reading_count": 150,
    "updated_at": "2024-11-22T15:30:45.123Z"
  }
}
```

---

## WebSocket (Tiempo Real)

### Conexión:
```javascript
const socket = io('http://localhost:3001', {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5
});
```

### Eventos:

#### 1. Suscribirse a sensor específico:
```javascript
socket.emit('subscribe:sensor', 'SENSOR_001');
```

#### 2. Escuchar actualizaciones:
```javascript
socket.on('reading:update', (data) => {
  console.log('Nueva lectura:', data);
  // {
  //   data: { sensor_id, gateway_id, water_level_cm, ... },
  //   received_at: "2024-11-22T15:30:45.123Z",
  //   reading_id: "507f1f77bcf86cd799439011"
  // }
});

socket.on('sensor:data', (data) => {
  console.log('Evento global de sensor:', data);
});
```

---

## Autenticación

### API Key:
1. Definir en `.env`:
   ```
   API_KEY_SECRET=sk_dev_replace_with_secure_key
   ```

2. Incluir en headers:
   ```
   Authorization: Bearer sk_dev_replace_with_secure_key
   ```

### Idempotencia:
Para evitar duplicados, incluir header opcional:
```
X-Idempotency-Key: unique-request-identifier
```

---

## Códigos de Error

| Código | Status | Descripción |
|--------|--------|-------------|
| `MISSING_API_KEY` | 401 | Falta header `Authorization` |
| `INVALID_API_KEY` | 403 | API Key incorrecta |
| `VALIDATION_ERROR` | 400 | Datos inválidos en el payload |
| `INGESTION_FAILED` | 400 | Error al procesar la lectura |
| `RATE_LIMIT_EXCEEDED` | 429 | Demasiadas solicitudes |
| `INGEST_ERROR` | 500 | Error interno del servidor |

---

## Ejemplo cURL para Pruebas

### Enviar lectura:
```bash
curl -X POST http://localhost:3001/api/v1/data/sensor \
  -H "Authorization: Bearer sk_dev_replace_with_secure_key" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: test-123" \
  -d '{
    "sensor_id": "SENSOR_001",
    "gateway_id": "GATEWAY_001",
    "timestamp": '$(date +%s)'000,
    "water_level_cm": 45.5,
    "rain_accumulated_mm": 10.2,
    "flow_rate_lmin": 250,
    "temperature_c": 25.5,
    "humidity_percent": 65,
    "battery_percent": 85,
    "rssi": -95
  }'
```

### Obtener estado:
```bash
curl http://localhost:3001/api/v1/data/status/SENSOR_001
```

### Obtener histórico:
```bash
curl "http://localhost:3001/api/v1/data/history/SENSOR_001?hours=12&limit=50"
```

### Registrar gateway:
```bash
curl -X POST http://localhost:3001/api/v1/data/gateway/register \
  -H "Authorization: Bearer sk_dev_replace_with_secure_key" \
  -H "Content-Type: application/json" \
  -d '{
    "gateway_id": "GATEWAY_001",
    "name": "Gateway Buenos Aires",
    "location": { "lat": -34.6037, "lng": -58.3816 }
  }'
```

---

## Configuración MongoDB Atlas

1. Crear cluster en [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Obtener connection string: `mongodb+srv://user:pass@cluster.mongodb.net/dbname`
3. Actualizar en `.env`:
   ```
   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/flood_alert?retryWrites=true&w=majority
   ```
4. Whitelist IP del backend en MongoDB Atlas

---

## Ejecución Local

```bash
cd backend-implementation

# Instalar dependencias
npm install

# Configurar .env con MongoDB Atlas
# Actualizar MONGODB_URI en .env

# Modo desarrollo
npm run dev

# Build production
npm run build
npm start
```

El backend estará disponible en `http://localhost:3001`
