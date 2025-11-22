# Configuración de MongoDB Atlas

Este documento explica cómo configurar la conexión a MongoDB Atlas para el backend.

## Pasos para Configurar MongoDB Atlas

### 1. Obtener la Connection String

1. Inicia sesión en [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Ve a tu cluster y haz clic en **"Connect"**
3. Selecciona **"Connect your application"**
4. Copia la connection string. Debería verse así:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### 2. Configurar Variables de Entorno

El proyecto incluye un archivo `.env.example` con la configuración predefinida. Puedes:

**Opción 1: Copiar .env.example a .env (Recomendado)**
```powershell
# En PowerShell, ejecuta:
.\crear-env.ps1
```

**Opción 2: Crear .env manualmente**

Crea un archivo `.env` en la carpeta `backend-implementation/` copiando desde `.env.example` o con el siguiente contenido:

```env
# MongoDB Atlas Connection
# Reemplaza <username> y <password> con tus credenciales
# Agrega el nombre de la base de datos después del host
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/flood_alert?retryWrites=true&w=majority

# Redis Connection (opcional, para desarrollo local)
REDIS_URL=redis://localhost:6379

# API Security
# Genera una clave secreta para autenticar las peticiones del gateway
API_KEY_SECRET=tu_clave_secreta_aqui

# Server Configuration
PORT=3001
NODE_ENV=development
LOG_LEVEL=info

# CORS Origins (separados por comas)
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

### 3. Configurar Network Access en MongoDB Atlas

1. Ve a **Network Access** en el panel de MongoDB Atlas
2. Haz clic en **"Add IP Address"**
3. Para desarrollo local, agrega `0.0.0.0/0` (permite todas las IPs) o tu IP específica
4. Para producción, agrega solo las IPs de tus servidores

### 4. Verificar la Conexión

Ejecuta el backend y verifica que la conexión sea exitosa:

```bash
cd backend-implementation
npm run dev
```

Deberías ver un mensaje como:
```
✓ Connected to MongoDB Atlas - Database: flood_alert
```

## Endpoint POST para Registrar Datos

El backend expone el siguiente endpoint para registrar datos de sensores:

### POST `/api/v1/data/sensor`

**Headers requeridos:**
```
Authorization: Bearer <API_KEY_SECRET>
Content-Type: application/json
```

**Body de ejemplo (formato TTGO):**
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
  "rssi": -95,
  "snr": 7.5
}
```

**Body de ejemplo (formato legacy):**
```json
{
  "sensor_id": "SENSOR_001",
  "gateway_id": "GATEWAY_001",
  "timestamp": 1700000000,
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

**Respuesta exitosa (201):**
```json
{
  "ok": true,
  "received_at": "2024-01-01T12:00:00.000Z",
  "reading_id": "65a1b2c3d4e5f6a7b8c9d0e1"
}
```

## Prueba de Conexión

Puedes usar el script `test-mongodb-connection.js` para probar la conexión:

```bash
npm run test:mongodb
```

## Prueba del Endpoint POST

### En Windows (PowerShell)

Usa los scripts de PowerShell incluidos:

```powershell
# Formato TTGO (nuevo)
.\test-post-sensor.ps1 -ApiKey "tu_clave_secreta_aqui"

# Formato legacy
.\test-post-sensor-legacy.ps1 -ApiKey "tu_clave_secreta_aqui"
```

### En Linux/Mac (Bash)

Usa curl:

```bash
curl -X POST http://localhost:3001/api/v1/data/sensor \
  -H "Authorization: Bearer tu_clave_secreta_aqui" \
  -H "Content-Type: application/json" \
  -d '{
    "sensor_id": "SENSOR_001",
    "gateway_id": "GATEWAY_001",
    "timestamp": 1700000000,
    "temperatura_c": 25.5,
    "humedad_pct": 65.0,
    "caudal_l_s": 2.5,
    "lluvia_mm": 10.2,
    "nivel_m": 0.45
  }'
```

