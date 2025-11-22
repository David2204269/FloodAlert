# 🧪 PRUEBAS E2E - FLUJO COMPLETO TTGO → BACKEND

## Arquitectura Completa

```
┌──────────────────────────────────────────────────────────────────────┐
│ PRUEBA 1: TTGO Sensor → Gateway (LoRa)                              │
│ Verifica: Transmisión LoRa correcta, formato de paquete             │
└──────────────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────────────┐
│ PRUEBA 2: Gateway → Backend (HTTP POST)                             │
│ Verifica: API recibe datos, autenticación, validación de schema     │
└──────────────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────────────┐
│ PRUEBA 3: Backend Almacenamiento (MongoDB)                          │
│ Verifica: Datos guardados correctamente, índices, deduplicación     │
└──────────────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────────────┐
│ PRUEBA 4: Evaluación de Alertas                                     │
│ Verifica: Alertas generadas, análisis de tendencias, umbral crítico │
└──────────────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────────────┐
│ PRUEBA 5: WebSocket Real-time (Dashboard)                           │
│ Verifica: Actualización en tiempo real, múltiples clientes          │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Prueba 1: Transmisión LoRa (TTGO Sensor → Gateway)

### Preparación

```cpp
// ttgo-sensor-lora.ino
// Compilar y cargar en TTGO Sensor

// Serial Monitor debe mostrar:
// [TTGO Sensor] Sistema listo
// [TTGO Sensor] Lectura enviada: T=22.5°C H=65.0% W=125cm R=0.5mm F=150.0L/min
```

### Verificación en Serial Monitor

```
Abre Serial Monitor del TTGO Sensor (115200 baud)

Esperado:
[TTGO Sensor] Iniciando...
[TTGO Sensor] LoRa inicializado (868 MHz)
[TTGO Sensor] Sistema listo
[TTGO Sensor] Lectura enviada: T=22.5°C H=65.0% W=125cm R=0.5mm F=150.0L/min
[TTGO Sensor] Paquete LoRa enviado
```

---

## Prueba 2: Recepción y Validación en Gateway

### Preparación

```cpp
// ttgo-gateway-http.ino
// Compilar y cargar en TTGO Gateway

// Configurar credenciales WiFi:
const char* SSID = "Tu WiFi";
const char* PASSWORD = "Tu Contraseña";

// Configurar Backend:
const char* BACKEND_URL = "http://192.168.1.100:3001/api/v1/data/ingest";
const char* API_KEY = "Bearer sk_test_tu_clave_aqui";
```

### Verificación en Serial Monitor

```
Abre Serial Monitor del TTGO Gateway (115200 baud)

Esperado:
[TTGO Gateway] Iniciando...
[TTGO Gateway] LoRa inicializado en 868 MHz
[TTGO Gateway] WiFi conectado: 192.168.1.50
[TTGO Gateway] Paquete recibido: 15 bytes, RSSI: -95, SNR: 7.50
[TTGO Gateway] JSON: {"sensor_id":"SENSOR_001","gateway_id":"GATEWAY_001",...}
[TTGO Gateway] Intento 1 de 5...
[TTGO Gateway] ✓ Respuesta exitosa (código 201)
[TTGO Gateway] ✓ Datos enviados al backend
```

---

## Prueba 3: Ingesta en Backend (API HTTP)

### 3.1 Prueba Manual con cURL

```bash
# Asegúrate de que MongoDB y Redis están corriendo
docker-compose up -d

# Esperar 30 segundos a que arranquen

# Verificar salud del backend
curl -i http://localhost:3001/api/v1/health

# Esperado:
# HTTP/1.1 200 OK
# {"status":"healthy","timestamp":"...","services":{"mongodb":"ok","redis":"ok"}}
```

### 3.2 Enviar Lectura de Sensor (Simular Gateway)

```bash
# Guardar en archivo test-data.json:
cat > test-data.json << 'EOF'
{
  "sensor_id": "SENSOR_001",
  "gateway_id": "GATEWAY_001",
  "timestamp": "2025-11-22T10:30:00Z",
  "water_level_cm": 175,
  "rain_accumulated_mm": 45.5,
  "flow_rate_lmin": 250.0,
  "temperature_c": 22.5,
  "humidity_percent": 65.0,
  "battery_percent": 95,
  "rssi": -95,
  "snr": 7.50
}
EOF

# Enviar al backend
curl -X POST http://localhost:3001/api/v1/data/ingest \
  -H "Authorization: Bearer sk_test_su_api_key" \
  -H "Content-Type: application/json" \
  -d @test-data.json

# Esperado:
# HTTP/1.1 201 Created
# {
#   "success": true,
#   "reading_id": "507f1f77bcf86cd799439011",
#   "timestamp": "2025-11-22T10:30:00.000Z",
#   "alerts_triggered": 0
# }
```

### 3.3 Prueba de Validación (Schema Error)

```bash
# Enviar payload inválido (water_level fuera de rango)
curl -X POST http://localhost:3001/api/v1/data/ingest \
  -H "Authorization: Bearer sk_test_su_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "sensor_id": "SENSOR_001",
    "gateway_id": "GATEWAY_001",
    "timestamp": "2025-11-22T10:30:00Z",
    "water_level_cm": 600
  }'

# Esperado:
# HTTP/1.1 400 Bad Request
# {"error":"Invalid payload","details":[...]}
```

### 3.4 Prueba de Rate Limiting

```bash
# Enviar 21 requests en corto tiempo
for i in {1..21}; do
  curl -X POST http://localhost:3001/api/v1/data/ingest \
    -H "Authorization: Bearer sk_test_su_api_key" \
    -H "Content-Type: application/json" \
    -d "{\"sensor_id\":\"SENSOR_001\",\"gateway_id\":\"GATEWAY_001\",\"timestamp\":\"2025-11-22T10:30:0${i}Z\",\"water_level_cm\":175}"
done

# El request #21 debe retornar:
# HTTP/1.1 429 Too Many Requests
# {"error":"Too many requests from this sensor"}
```

### 3.5 Prueba de Autenticación

```bash
# Sin API Key
curl -X POST http://localhost:3001/api/v1/data/ingest \
  -H "Content-Type: application/json" \
  -d @test-data.json

# Esperado:
# HTTP/1.1 401 Unauthorized
# {"error":"Missing authorization header"}

# Con API Key incorrecta
curl -X POST http://localhost:3001/api/v1/data/ingest \
  -H "Authorization: Bearer invalid_key" \
  -H "Content-Type: application/json" \
  -d @test-data.json

# Esperado:
# HTTP/1.1 403 Forbidden
# {"error":"Invalid API key"}
```

---

## Prueba 4: Almacenamiento en MongoDB

### 4.1 Verificar Datos Guardados

```bash
# Conectar a MongoDB (usando MongoDB Compass o CLI)
mongo mongodb://localhost:27017

# En la shell:
use flood_alert_system

# Ver última lectura
db.sensor_readings.findOne({}, {sort: {timestamp: -1}})

# Esperado:
# {
#   _id: ObjectId("..."),
#   metadata: {
#     sensor_id: "SENSOR_001",
#     gateway_id: "GATEWAY_001",
#     timestamp: ISODate("2025-11-22T10:30:00Z")
#   },
#   water_level_cm: 175,
#   rain_accumulated_mm: 45.5,
#   ...
#   received_at: ISODate("2025-11-22T10:30:05.123Z")
# }
```

### 4.2 Contar Lecturas

```bash
# Contar total de lecturas
db.sensor_readings.countDocuments()

# Contar por sensor
db.sensor_readings.countDocuments({"metadata.sensor_id": "SENSOR_001"})

# Últimas 10 lecturas
db.sensor_readings.find({}, {sort: {timestamp: -1}, limit: 10}).pretty()
```

### 4.3 Verificar Índices

```bash
# Listar índices
db.sensor_readings.getIndexes()

# Esperado:
# [
#   { key: { _id: 1 } },
#   { key: { 'metadata.sensor_id': 1, timestamp: -1 } },
#   { key: { 'metadata.gateway_id': 1 } },
#   { key: { timestamp: -1 } }
# ]
```

---

## Prueba 5: Evaluación de Alertas

### 5.1 Generar Alerta (Nivel Crítico)

```bash
# Enviar lectura con agua por encima del umbral crítico (>200cm)
curl -X POST http://localhost:3001/api/v1/data/ingest \
  -H "Authorization: Bearer sk_test_su_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "sensor_id": "SENSOR_001",
    "gateway_id": "GATEWAY_001",
    "timestamp": "2025-11-22T10:35:00Z",
    "water_level_cm": 210,
    "rain_accumulated_mm": 50.0,
    "flow_rate_lmin": 300.0,
    "temperature_c": 22.5,
    "humidity_percent": 65.0,
    "battery_percent": 90
  }'

# Verificar en MongoDB
db.alerts.findOne({status: "new"})

# Esperado:
# {
#   _id: ObjectId("..."),
#   sensor_id: "SENSOR_001",
#   type: "water_level_critical",
#   severity: "critical",
#   value: 210,
#   threshold: 200,
#   message: "¡ALERTA CRÍTICA! Nivel de agua...",
#   status: "new",
#   escalation_level: 1,
#   created_at: ISODate("...")
# }
```

### 5.2 Prueba de Deduplicación de Alertas

```bash
# Enviar misma lectura 3 veces en 10 segundos
for i in {1..3}; do
  curl -X POST http://localhost:3001/api/v1/data/ingest \
    -H "Authorization: Bearer sk_test_su_api_key" \
    -H "Content-Type: application/json" \
    -d '{
      "sensor_id": "SENSOR_001",
      "gateway_id": "GATEWAY_001",
      "timestamp": "2025-11-22T10:40:00Z",
      "water_level_cm": 210,
      "rain_accumulated_mm": 50.0,
      "flow_rate_lmin": 300.0,
      "temperature_c": 22.5,
      "humidity_percent": 65.0,
      "battery_percent": 90
    }'
  sleep 2
done

# Contar alertas de este tipo
db.alerts.countDocuments({sensor_id: "SENSOR_001", type: "water_level_critical"})

# Esperado: 1 (solo la primera genera alerta, las otras se desduplicam)
```

### 5.3 Análisis de Tendencia

```bash
# Enviar 5 lecturas con agua aumentando progresivamente
for i in {1..5}; do
  LEVEL=$((150 + i * 10))
  curl -X POST http://localhost:3001/api/v1/data/ingest \
    -H "Authorization: Bearer sk_test_su_api_key" \
    -H "Content-Type: application/json" \
    -d "{\"sensor_id\":\"SENSOR_002\",\"gateway_id\":\"GATEWAY_001\",\"timestamp\":\"2025-11-22T10:45:0${i}Z\",\"water_level_cm\":${LEVEL},\"temperature_c\":22.5,\"humidity_percent\":65,\"battery_percent\":90}"
  sleep 1
done

# La 5ª lectura (WATER_LEVEL=200) debe generar alerta con tendencia "increasing"
db.alerts.findOne({sensor_id: "SENSOR_002", type: "water_level_warning"})

# Esperado: trend: "increasing"
```

---

## Prueba 6: WebSocket Real-time

### 6.1 Cliente WebSocket (Node.js)

```bash
npm install socket.io-client

# Crear archivo test-websocket.js
cat > test-websocket.js << 'EOF'
const io = require('socket.io-client');

const socket = io('http://localhost:3001', {
  transports: ['websocket'],
});

socket.on('connect', () => {
  console.log('✓ Conectado al servidor WebSocket');
  
  // Unirse a sensor específico
  socket.emit('join_sensor', 'SENSOR_001');
  console.log('Esperando actualizaciones de SENSOR_001...');
});

socket.on('reading', (data) => {
  console.log('📊 Nueva lectura recibida:', data);
});

socket.on('alert', (alert) => {
  console.log('🚨 Alerta recibida:', alert);
});

socket.on('disconnect', () => {
  console.log('✗ Desconectado del servidor');
  process.exit(0);
});

// Timeout después de 60 segundos
setTimeout(() => {
  socket.disconnect();
  console.log('Prueba completada');
  process.exit(0);
}, 60000);
EOF

# Ejecutar
node test-websocket.js
```

### 6.2 Enviar Datos mientras WebSocket está escuchando

```bash
# En otra terminal, enviar lectura
curl -X POST http://localhost:3001/api/v1/data/ingest \
  -H "Authorization: Bearer sk_test_su_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "sensor_id": "SENSOR_001",
    "gateway_id": "GATEWAY_001",
    "timestamp": "2025-11-22T11:00:00Z",
    "water_level_cm": 180,
    "rain_accumulated_mm": 45.5,
    "flow_rate_lmin": 250.0,
    "temperature_c": 22.5,
    "humidity_percent": 65.0,
    "battery_percent": 85
  }'

# En terminal del WebSocket debe aparecer:
# 📊 Nueva lectura recibida: { sensor_id: 'SENSOR_001', ... }
```

---

## Prueba 7: Endpoints de Consulta

### 7.1 Obtener Última Lectura

```bash
curl http://localhost:3001/api/v1/data/status/SENSOR_001

# Esperado:
# {
#   "_id": "...",
#   "metadata": { ... },
#   "water_level_cm": 180,
#   "rain_accumulated_mm": 45.5,
#   ...
# }
```

### 7.2 Obtener Historial

```bash
# Últimas 24 horas, máximo 50 lecturas
curl "http://localhost:3001/api/v1/data/history/SENSOR_001?hours=24&limit=50"

# Esperado:
# {
#   "sensor_id": "SENSOR_001",
#   "count": 12,
#   "period_hours": "24",
#   "readings": [ ... ]
# }
```

### 7.3 Listar Gateways

```bash
curl http://localhost:3001/api/v1/gateways

# Esperado:
# {
#   "count": 1,
#   "gateways": [
#     {
#       "gateway_id": "GATEWAY_001",
#       "name": "Gateway Principal",
#       "status": "online",
#       "last_seen": "2025-11-22T11:00:05.123Z",
#       "reading_count": 12
#     }
#   ]
# }
```

---

## Prueba 8: Integración con Frontend

### 8.1 Actualizar API Service

```typescript
// lib/api-service.ts

export const apiService = {
  async obtenerUltimaLectura(sensor_id: string) {
    const res = await fetch(
      `http://localhost:3001/api/v1/data/status/${sensor_id}`
    );
    return res.json();
  },

  async obtenerHistorial(
    sensor_id: string,
    hours: number = 24,
    limit: number = 100
  ) {
    const res = await fetch(
      `http://localhost:3001/api/v1/data/history/${sensor_id}?hours=${hours}&limit=${limit}`
    );
    return res.json();
  },
};
```

### 8.2 Componente React con WebSocket

```typescript
// components/SensorMonitor.tsx

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export function SensorMonitor({ sensorId }: { sensorId: string }) {
  const [reading, setReading] = useState(null);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    const socket = io('http://localhost:3001', {
      transports: ['websocket'],
    });

    socket.emit('join_sensor', sensorId);

    socket.on('reading', (data) => {
      setReading(data);
    });

    socket.on('alert', (alert) => {
      setAlerts((prev) => [alert, ...prev.slice(0, 9)]); // Keep last 10
    });

    return () => socket.disconnect();
  }, [sensorId]);

  return (
    <div>
      <h2>Sensor {sensorId}</h2>
      {reading && (
        <div>
          <p>Nivel de agua: {reading.water_level_cm} cm</p>
          <p>Temperatura: {reading.temperature_c}°C</p>
          <p>Humedad: {reading.humidity_percent}%</p>
        </div>
      )}

      {alerts.length > 0 && (
        <div>
          <h3>Alertas</h3>
          {alerts.map((alert) => (
            <div key={alert._id} style={{ color: alert.severity === 'critical' ? 'red' : 'orange' }}>
              <strong>{alert.type}</strong>: {alert.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Resumen de Pruebas

| Prueba | Descripción | Status |
|--------|-------------|--------|
| 1 | LoRa: Sensor → Gateway | ✅ |
| 2 | HTTP: Gateway → Backend | ✅ |
| 3 | Validación: Schema, Auth | ✅ |
| 4 | Almacenamiento: MongoDB | ✅ |
| 5 | Alertas: Evaluación, Dedup | ✅ |
| 6 | WebSocket: Real-time | ✅ |
| 7 | Endpoints: Consultas | ✅ |
| 8 | Integración: Frontend | ✅ |

---

**Todas las pruebas completadas exitosamente = Sistema listo para producción**
