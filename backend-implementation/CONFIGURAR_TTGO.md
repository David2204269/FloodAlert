# 📡 Configuración del TTGO Gateway

Esta guía te ayudará a configurar tu dispositivo TTGO para que envíe datos al backend.

## 📋 Requisitos Previos

1. ✅ Backend corriendo en `http://localhost:3001` (o tu IP
2. ✅ Archivo `.env` configurado con `API_KEY_SECRET`
3. ✅ Dispositivo TTGO (ESP32) con WiFi
4. ✅ Arduino IDE o PlatformIO instalado

## 🔧 Paso 1: Obtener la IP del Backend

Necesitas saber la IP de tu servidor donde corre el backend:

### Opción A: Backend en la misma red local

1. **En Windows (PowerShell):**
   ```powershell
   ipconfig
   ```
   Busca "IPv4 Address" (ejemplo: `192.168.1.100`)

2. **En Linux/Mac:**
   ```bash
   ifconfig
   # o
   ip addr
   ```

### Opción B: Backend en internet

Si tu backend está desplegado en internet (Vercel, Heroku, etc.), usa esa URL directamente.

## 🔑 Paso 2: Obtener la API Key

La API key está en tu archivo `.env`:

```env
API_KEY_SECRET=sk_flood_alert_2024_secure_key
```

**Importante:** Usa exactamente la misma clave en el código del TTGO.

## 📝 Paso 3: Configurar el Código del TTGO

1. **Abre el archivo `TTGO_GATEWAY_CODE.ino`**

2. **Actualiza estas variables:**

```cpp
// WiFi
const char* WIFI_SSID = "TU_SSID_AQUI";           // ← Tu SSID WiFi
const char* WIFI_PASSWORD = "TU_PASSWORD_AQUI";   // ← Tu contraseña WiFi

// Backend (actualiza con la IP de tu servidor)
const char* BACKEND_URL = "http://192.168.1.100:3001/api/v1/data/sensor";  // ← Tu IP

// API Key (debe coincidir con API_KEY_SECRET en .env)
const char* API_KEY = "sk_flood_alert_2024_secure_key";  // ← Tu API key

// IDs del dispositivo
const char* SENSOR_ID = "SENSOR_001";    // ← ID de tu sensor
const char* GATEWAY_ID = "GATEWAY_001";  // ← ID de tu gateway
```

## 📦 Paso 4: Instalar Librerías

En Arduino IDE:

1. Ve a **Sketch → Include Library → Manage Libraries**
2. Busca e instala:
   - **ArduinoJson** (por Benoit Blanchon) - versión 6.x o superior

## 🔌 Paso 5: Cargar el Código

1. Conecta tu TTGO al computador por USB
2. Selecciona la placa: **Tools → Board → ESP32 Dev Module** (o tu modelo específico)
3. Selecciona el puerto: **Tools → Port → COMx** (Windows) o `/dev/ttyUSBx` (Linux/Mac)
4. Haz clic en **Upload**

## ✅ Paso 6: Verificar Funcionamiento

1. **Abre el Serial Monitor** (Tools → Serial Monitor)
   - Velocidad: **115200 baud**

2. **Deberías ver:**
   ```
   ========================================
   TTGO Gateway - Flood Alert System
   ========================================
   
   [WiFi] Conectando a: TU_SSID_AQUI
   [WiFi] ✓ Conectado!
   [WiFi] IP: 192.168.1.50
   [WiFi] RSSI: -45 dBm
   
   [TTGO] Sistema listo. Enviando datos cada 60 segundos
   [TTGO] Backend URL: http://192.168.1.100:3001/api/v1/data/sensor
   ```

3. **Cada 60 segundos verás:**
   ```
   [TTGO] Preparando datos para enviar...
   [TTGO] Payload JSON:
   {"sensor_id":"SENSOR_001","gateway_id":"GATEWAY_001",...}
   [TTGO] Enviando POST a: http://192.168.1.100:3001/api/v1/data/sensor
   [TTGO] Código de respuesta: 201
   [TTGO] ✓ Datos enviados exitosamente!
   [TTGO] Reading ID: 69223c475fa8e5fe420a6701
   ```

## 🐛 Solución de Problemas

### Error: "WiFi no conectado"
- Verifica que el SSID y contraseña sean correctos
- Asegúrate de que el WiFi esté en 2.4 GHz (ESP32 no soporta 5 GHz)
- Verifica que el router esté funcionando

### Error: "HTTP Error: -1" o "Connection refused"
- Verifica que el backend esté corriendo (`npm run dev`)
- Verifica que la IP del backend sea correcta
- Si usas firewall, permite el puerto 3001
- Prueba acceder desde un navegador: `http://TU_IP:3001/api/v1/health`

### Error: "HTTP Response: 401" o "403"
- Verifica que la API_KEY en el código coincida con API_KEY_SECRET en `.env`
- Asegúrate de que el formato sea: `Authorization: Bearer <API_KEY>`

### Error: "HTTP Response: 400"
- Verifica que el formato JSON sea correcto
- Revisa que todos los campos requeridos estén presentes
- Verifica los logs del backend para más detalles

### El dispositivo no aparece en Serial Monitor
- Verifica que el puerto COM sea correcto
- Prueba otro cable USB
- Verifica que los drivers USB estén instalados

## 🔍 Verificar Datos en MongoDB

Para verificar que los datos se están guardando:

1. **Conecta a MongoDB Atlas**
2. **Navega a la base de datos `flood_alert`**
3. **Revisa la colección `sensor_readings`**
4. **Deberías ver documentos nuevos cada 60 segundos**

## 📊 Formato de Datos Enviados

El TTGO envía datos en formato JSON:

```json
{
  "sensor_id": "SENSOR_001",
  "gateway_id": "GATEWAY_001",
  "timestamp": 1700000000,
  "temperatura_c": 25.5,
  "humedad_pct": 65.0,
  "caudal_l_s": 2.5,
  "lluvia_mm": 10.2,
  "nivel_m": 0.45,
  "seq": 1,
  "rssi": -45
}
```

## 🔄 Próximos Pasos

1. **Implementar funciones reales de lectura de sensores:**
   - Reemplaza `readTemperature()`, `readHumidity()`, etc. con tu código real
   - Conecta tus sensores físicos (DHT22, ADC, etc.)

2. **Ajustar intervalo de envío:**
   - Cambia `SEND_INTERVAL` según tus necesidades
   - Considera el consumo de batería si es dispositivo móvil

3. **Agregar manejo de errores avanzado:**
   - Implementar cola de datos si falla el envío
   - Guardar datos en memoria flash si no hay WiFi

4. **Optimizar consumo:**
   - Usar deep sleep entre envíos
   - Reducir potencia de transmisión WiFi

## 📚 Referencias

- [Documentación ESP32](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/)
- [ArduinoJson Documentation](https://arduinojson.org/)
- [WiFi HTTP API Documentation](./WIFI_HTTP_API.md)

