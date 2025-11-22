# TTGO WiFi → Backend → MongoDB Atlas

## ✅ Estado del Sistema

**Backend**: ✓ Ejecutándose en puerto 3001  
**MongoDB**: ✓ Conectado a MongoDB Atlas (cluster0)  
**WebSocket**: ✓ Listo en puerto 3001  
**Frontend**: ✓ Preparado para recibir actualizaciones en tiempo real

---

## Formato de Datos TTGO

El TTGO envía JSON con este formato:

```json
{
  "timestamp": 8,
  "temperatura_c": "26.62",
  "humedad_pct": 0,
  "caudal_l_s": 0,
  "lluvia_mm": 0,
  "nivel_m": 0,
  "seq": 1
}
```

**Mapeo de campos**:
- `temperatura_c` → Temperatura en °C
- `humedad_pct` → Humedad en porcentaje
- `caudal_l_s` → Caudal en litros por segundo
- `lluvia_mm` → Lluvia acumulada en mm
- `nivel_m` → Nivel de agua en metros
- `seq` → Número de secuencia
- `timestamp` → Tiempo en segundos desde arranque

---

## Endpoint HTTP para TTGO

**URL**: `http://<IP_BACKEND>:3001/api/v1/data/sensor`

**Método**: `POST`

**Headers**:
```
Authorization: Bearer sk_dev_replace_with_secure_key
Content-Type: application/json
```

**Ejemplo de envío desde Arduino/PlatformIO**:

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "YOUR_SSID";
const char* password = "YOUR_PASSWORD";
const char* serverUrl = "http://192.168.1.100:3001/api/v1/data/sensor";
const char* apiKey = "sk_dev_replace_with_secure_key";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\nWiFi connected!");
}

unsigned long lastSend = 0;
const unsigned long SEND_INTERVAL = 60000; // Cada 60 segundos

void loop() {
  if (millis() - lastSend >= SEND_INTERVAL) {
    sendToBackend();
    lastSend = millis();
  }
}

void sendToBackend() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  HTTPClient http;
  
  // Crear JSON
  StaticJsonDocument<512> doc;
  doc["timestamp"] = (unsigned long)(millis() / 1000);
  doc["temperatura_c"] = readTemperature();    // Tu función
  doc["humedad_pct"] = readHumidity();          // Tu función
  doc["caudal_l_s"] = readFlowRate();           // Tu función
  doc["lluvia_mm"] = readRainfall();            // Tu función
  doc["nivel_m"] = readWaterLevel();            // Tu función
  doc["seq"] = readSequence();                  // Tu función
  
  String payload;
  serializeJson(doc, payload);
  
  // Enviar POST
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + apiKey);
  
  int httpCode = http.POST(payload);
  
  if (httpCode == 201) {
    Serial.println("✓ Datos enviados correctamente");
    String response = http.getString();
    Serial.println(response);
  } else {
    Serial.printf("✗ Error HTTP: %d\n", httpCode);
  }
  
  http.end();
}
```

---

## Verificar que está funcionando

### Desde PowerShell:

```powershell
# Enviar datos de prueba
$payload = '{"timestamp":8,"temperatura_c":"26.62","humedad_pct":0,"caudal_l_s":0,"lluvia_mm":0,"nivel_m":0,"seq":1}'

Invoke-WebRequest -Uri "http://localhost:3001/api/v1/data/sensor" `
  -Method POST `
  -Headers @{"Authorization"="Bearer sk_dev_replace_with_secure_key";"Content-Type"="application/json"} `
  -Body $payload
```

### Ver datos en MongoDB:

1. Ir a [MongoDB Atlas Console](https://cloud.mongodb.com)
2. Cluster → Collections → flood_alert → sensor_readings
3. Ver documentos insertados

### Ver en dashboard (tiempo real):

1. Abrir `http://localhost:3000`
2. Los datos aparecerán automáticamente vía WebSocket

---

## Configuración MongoDB Atlas

**Credenciales**:
- **Usuario**: FloodAlertDB
- **Contraseña**: Admin123
- **Cluster**: cluster0.xmb1cvz.mongodb.net
- **Base de datos**: flood_alert (se crea automáticamente)

**Collections**:
- `sensor_readings` → Todas las lecturas del TTGO
- `gateways` → Información de gateways
- `alerts` → Alertas generadas
- `sensors` → Configuración de sensores

**Connection String**:
```
mongodb+srv://FloodAlertDB:Admin123@cluster0.xmb1cvz.mongodb.net/?appName=Cluster0
```

---

## Backend - Comandos Útiles

```bash
# Compilar
npm run build

# Ejecutar
node dist/index.js

# Ver logs en tiempo real
node dist/index.js 2>&1 | Tee-Object -FilePath "backend.log"
```

---

## Endpoints Disponibles

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/v1/data/sensor` | Enviar lectura TTGO |
| GET | `/api/v1/data/status/:sensor_id` | Estado actual |
| GET | `/api/v1/data/history/:sensor_id?hours=24` | Histórico |
| GET | `/api/v1/data/gateways` | Listar gateways |
| GET | `/api/v1/data/stats/:sensor_id` | Estadísticas |
| POST | `/api/v1/data/gateway/register` | Registrar gateway |
| GET | `/api/v1/health` | Estado del backend |

---

## Troubleshooting

### "Cannot connect to MongoDB"
- Verificar que MongoDB Atlas IP whitelist incluya tu IP o `0.0.0.0/0`
- Verificar credenciales en MONGODB_URI
- Revisar logs del backend

### "API Key invalid"
- El header `Authorization: Bearer sk_dev_replace_with_secure_key` debe ser exacto
- Cambiar en `.env` si lo deseas

### "WebSocket not connecting"
- Verificar que el backend esté en puerto 3001
- Ver DevTools → Network → WS
- Revisar CORS_ORIGINS en `.env`

---

## Siguientes Pasos

1. ✅ Actualiza Arduino/PlatformIO del TTGO con el código anterior
2. ✅ Configura SSID y contraseña WiFi
3. ✅ Configura IP del backend (si no es localhost)
4. ✅ Carga el firmware en TTGO
5. ✅ Verifica que datos llegan a MongoDB
6. ✅ Abre dashboard en `http://localhost:3000`
7. ✅ Verifica actualizaciones en tiempo real

---

**Última actualización**: 22 de Noviembre 2025
**Estado**: ✅ Sistema completo operativo
