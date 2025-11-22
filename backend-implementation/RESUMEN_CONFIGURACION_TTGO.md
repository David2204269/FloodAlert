# 📡 Resumen: Configuración TTGO → Backend

## ✅ Estado Actual

- **Backend**: ✓ Corriendo en `http://192.168.1.7:3001`
- **MongoDB Atlas**: ✓ Conectado
- **API Endpoint**: ✓ `POST /api/v1/data/sensor` funcionando
- **API Key**: `sk_flood_alert_2024_secure_key` (verificar en `.env`)

## 🔧 Configuración del TTGO

### 1. Valores a Configurar en el Código

Abre `TTGO_GATEWAY_CODE.ino` y actualiza:

```cpp
// WiFi
const char* WIFI_SSID = "TU_SSID_AQUI";
const char* WIFI_PASSWORD = "TU_PASSWORD_AQUI";

// Backend (ya configurado con tu IP)
const char* BACKEND_URL = "http://192.168.1.7:3001/api/v1/data/sensor";

// API Key (verifica que coincida con tu .env)
const char* API_KEY = "sk_flood_alert_2024_secure_key";

// IDs
const char* SENSOR_ID = "SENSOR_001";
const char* GATEWAY_ID = "GATEWAY_001";
```

### 2. Verificar API Key

Asegúrate de que la API key en el código del TTGO sea **exactamente igual** a la de tu `.env`:

**En `.env`:**
```env
API_KEY_SECRET=sk_flood_alert_2024_secure_key
```

**En el código TTGO:**
```cpp
const char* API_KEY = "sk_flood_alert_2024_secure_key";
```

## 📋 Checklist de Configuración

- [ ] Código del TTGO actualizado con:
  - [ ] SSID y contraseña WiFi
  - [ ] URL del backend: `http://192.168.1.7:3001/api/v1/data/sensor`
  - [ ] API Key correcta
  - [ ] Sensor ID y Gateway ID configurados
- [ ] Librería ArduinoJson instalada
- [ ] Código cargado en el TTGO
- [ ] Serial Monitor abierto (115200 baud)
- [ ] Backend corriendo (`npm run dev`)

## 🧪 Prueba Rápida

1. **Inicia el backend:**
   ```powershell
   cd backend-implementation
   npm run dev
   ```

2. **Carga el código en el TTGO**

3. **Abre Serial Monitor** y deberías ver:
   ```
   [WiFi] ✓ Conectado!
   [TTGO] ✓ Datos enviados exitosamente!
   ```

4. **Verifica en el backend** que recibas los datos

5. **Verifica en MongoDB Atlas** que los datos se guarden

## 🔍 Verificar que Funciona

### Desde el Backend (logs):
Deberías ver en la consola del backend:
```
WiFi data received from TTGO
Reading ingested successfully
```

### Desde MongoDB Atlas:
1. Conecta a tu cluster
2. Navega a `flood_alert` → `sensor_readings`
3. Deberías ver documentos nuevos cada 60 segundos

### Desde el Serial Monitor del TTGO:
```
[TTGO] Código de respuesta: 201
[TTGO] ✓ Datos enviados exitosamente!
[TTGO] Reading ID: 69223c475fa8e5fe420a6701
```

## 🐛 Problemas Comunes

### "WiFi no conectado"
- Verifica SSID y contraseña
- Asegúrate de que el WiFi sea 2.4 GHz

### "HTTP Error: -1"
- Verifica que el backend esté corriendo
- Verifica la IP: `192.168.1.7:3001`
- Prueba desde navegador: `http://192.168.1.7:3001/api/v1/health`

### "HTTP 401" o "403"
- Verifica que la API key sea exactamente igual en ambos lados
- Reinicia el backend después de cambiar el `.env`

## 📚 Archivos Creados

1. **`TTGO_GATEWAY_CODE.ino`** - Código completo para el TTGO
2. **`CONFIGURAR_TTGO.md`** - Guía detallada de configuración
3. **`RESUMEN_CONFIGURACION_TTGO.md`** - Este archivo

## 🚀 Siguiente Paso

Una vez que el TTGO esté enviando datos correctamente:

1. **Implementa las funciones reales de lectura de sensores**
2. **Ajusta el intervalo de envío según tus necesidades**
3. **Monitorea los datos en el dashboard del frontend**

