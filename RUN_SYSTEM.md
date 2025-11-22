# Guía de Ejecución: Sistema Completo de Flood Alert

## Arquitectura del Sistema

```
TTGO Gateway (WiFi + LoRa)
         ↓ (HTTP POST)
    Backend Express
         ↓ (WebSocket)
    Frontend Next.js
         ↓
  MongoDB Atlas
         ↓ (Real-time updates)
    Dashboard Live
```

---

## Requisitos Previos

- **Node.js**: v18+ instalado
- **MongoDB Atlas**: Cuenta activa con cluster
- **npm**: v9+ 
- **PowerShell** (Windows): v5.0+

---

## Paso 1: Configurar MongoDB Atlas

### 1.1 Crear Cluster
1. Ir a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Crear o usar un cluster existente
3. Seleccionar región cercana (ej: us-east-1)

### 1.2 Obtener Connection String
1. Cluster → Connect → Drivers
2. Copiar string: `mongodb+srv://username:password@cluster.mongodb.net/dbname`
3. Guardar para paso siguiente

### 1.3 Whitelist IP
1. Network Access → Add IP Address
2. Agregar IP del servidor o `0.0.0.0/0` (solo para desarrollo)

### 1.4 Crear Base de Datos (opcional)
Las colecciones se crean automáticamente

---

## Paso 2: Configurar Backend

### 2.1 Navegar a carpeta del backend
```powershell
cd backend-implementation
```

### 2.2 Actualizar `.env` con credenciales de MongoDB Atlas
```bash
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/flood_alert?retryWrites=true&w=majority
REDIS_URL=redis://localhost:6379
API_KEY_SECRET=sk_dev_replace_with_secure_key
PORT=3001
NODE_ENV=development
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

**Nota**: Si no tienes Redis local, el backend funcionará en memoria (desarrollo)

### 2.3 Instalar dependencias
```powershell
npm install
```

### 2.4 Verificar estructura de carpetas
```
backend-implementation/
├── src/
│   ├── index.ts          # Entry point principal
│   ├── routes/
│   │   ├── data-ingest.routes.ts    # ✓ Actualizado con endpoint /sensor
│   │   ├── health.routes.ts
│   │   └── config.routes.ts
│   └── services/
│       ├── gateway-data.service.ts  # ✓ Servicio WiFi
│       ├── alert.service.ts
│       └── websocket.service.ts
├── .env                  # ✓ Ya existe
├── package.json          # ✓ Ya contiene dependencias
└── WIFI_HTTP_API.md     # ✓ Documentación nuevo API
```

---

## Paso 3: Ejecutar Backend en Modo Desarrollo

### 3.1 Iniciar servidor
```powershell
npm run dev
```

**Salida esperada**:
```
✓ Connected to MongoDB
✓ Server running on port 3001
✓ Environment: development
✓ WebSocket server ready
```

### 3.2 Verificar salud del backend
```powershell
curl http://localhost:3001/api/v1/health
```

**Respuesta esperada**:
```json
{
  "ok": true,
  "status": "healthy",
  "timestamp": "2024-11-22T15:30:45.123Z"
}
```

---

## Paso 4: Ejecutar Pruebas del Backend

### 4.1 Desde otra terminal PowerShell:
```powershell
cd backend-implementation
.\test-backend.ps1
```

**Esto prueba**:
- ✓ Conexión al servidor
- ✓ Registro de gateway
- ✓ Envío de lecturas WiFi
- ✓ Obtención de estado
- ✓ Histórico de datos
- ✓ Listado de gateways
- ✓ Estadísticas
- ✓ Carga (5 lecturas)

### 4.2 Logs esperados
```
✓ Servidor running en http://localhost:3001
✓ Gateway registrado exitosamente
✓ Lectura enviada exitosamente
  Reading ID: 507f1f77bcf86cd799439011
✓ Estado del sensor obtenido
  Nivel de agua: 45.5 cm
  Temperatura: 25.5 °C
  Humedad: 65 %
```

---

## Paso 5: Configurar Frontend (Next.js)

### 5.1 Instalar dependencias
Desde raíz del proyecto:
```powershell
npm install
# o si tienes npm workspace:
npm install --workspaces
```

### 5.2 Instalar socket.io-client
```powershell
npm install socket.io-client
```

### 5.3 Verificar que exista `use-real-time-data.ts`
```
hooks/
├── use-real-time-data.ts     # ✓ WebSocket hook
├── use-sensor-data.ts        # ✓ Actualizado con WebSocket
├── use-notifications.ts
├── use-toast.ts
└── use-mobile.ts
```

---

## Paso 6: Ejecutar Frontend

### 6.1 Iniciar Next.js en desarrollo
```powershell
npm run dev
```

**Salida esperada**:
```
> ready - started server on 0.0.0.0:3000
```

### 6.2 Acceder al dashboard
- Abrir navegador: `http://localhost:3000`
- Ver actualizaciones en tiempo real desde WebSocket

---

## Paso 7: Simular TTGO Gateway WiFi

### 7.1 Opción A: Desde PowerShell local
```powershell
# Script para simular envíos periódicos
while ($true) {
    $timestamp = [Math]::Floor([DateTime]::UtcNow.Subtract([DateTime]::UnixEpoch).TotalMilliseconds)
    $level = 40 + (Get-Random -Minimum 0 -Maximum 20)
    
    $payload = @{
        sensor_id = "SENSOR_001"
        gateway_id = "GATEWAY_001"
        timestamp = $timestamp
        water_level_cm = $level
        rain_accumulated_mm = [Math]::Round([System.Random]::new().NextDouble() * 50, 2)
        flow_rate_lmin = Get-Random -Minimum 100 -Maximum 500
        temperature_c = 20 + [Math]::Round([System.Random]::new().NextDouble() * 10, 1)
        humidity_percent = Get-Random -Minimum 50 -Maximum 90
        battery_percent = Get-Random -Minimum 70 -Maximum 100
    } | ConvertTo-Json
    
    curl -X POST http://localhost:3001/api/v1/data/sensor `
        -H "Authorization: Bearer sk_dev_replace_with_secure_key" `
        -H "Content-Type: application/json" `
        -d $payload
    
    Write-Host "Lectura enviada: nivel=$level cm"
    Start-Sleep -Seconds 30
}
```

### 7.2 Opción B: Desde TTGO Hardware Real
1. Cargar firmware Arduino/PlatformIO en TTGO
2. Ver código ejemplo en `WIFI_HTTP_API.md`
3. Configurar SSID, contraseña, IP del backend

---

## Paso 8: Verificar Integración Completa

### 8.1 Checklist
- [ ] MongoDB Atlas conectado (ver logs del backend)
- [ ] Backend corriendo en puerto 3001
- [ ] Frontend corriendo en puerto 3000
- [ ] WebSocket conectado (abrir DevTools → Network → WS)
- [ ] Datos fluyen en tiempo real al dashboard

### 8.2 Verificar WebSocket
```javascript
// En DevTools Console
io('http://localhost:3001').on('reading:update', data => 
  console.log('Nueva lectura:', data)
);
```

---

## Troubleshooting

### Error: "Cannot find module 'socket.io-client'"
```powershell
npm install socket.io-client
```

### Error: "MongoDB connection failed"
1. Verificar MONGODB_URI en .env
2. Verificar que la IP esté en whitelist de MongoDB Atlas
3. Verificar credenciales (usuario:contraseña)

### Error: "CORS error"
1. Actualizar CORS_ORIGINS en .env
2. Incluir puerto del frontend (ej: http://localhost:3000)

### WebSocket no conecta
1. Verificar que backend esté corriendo
2. Verificar puerto 3001 accesible
3. Ver DevTools → Network → WS tab

### Datos no actualizarse en tiempo real
1. Verificar latestReading en use-real-time-data.ts
2. Revisar logs del backend para eventos WebSocket
3. Verificar que payload sea válido

---

## Endpoints Disponibles

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/v1/data/sensor` | Enviar lectura WiFi |
| GET | `/api/v1/data/status/:id` | Estado actual |
| GET | `/api/v1/data/history/:id` | Histórico 24h |
| GET | `/api/v1/data/gateways` | Listar gateways |
| GET | `/api/v1/data/stats/:id` | Estadísticas |
| WS | `/socket.io` | WebSocket real-time |

Ver documentación completa en `WIFI_HTTP_API.md`

---

## Estructura de Datos

### Payload WiFi HTTP (TTGO → Backend)
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
  "rssi": -95
}
```

### WebSocket Event (Backend → Frontend)
```json
{
  "data": { /* datos del sensor */ },
  "received_at": "2024-11-22T15:30:45.123Z",
  "reading_id": "507f1f77bcf86cd799439011"
}
```

---

## Base de Datos MongoDB (Collections)

### `sensor_readings`
```json
{
  "metadata": {
    "sensor_id": "SENSOR_001",
    "gateway_id": "GATEWAY_001"
  },
  "timestamp": "2024-11-22T15:30:45.123Z",
  "water_level_cm": 45.5,
  "temperature_c": 25.5,
  "received_at": "2024-11-22T15:30:45.123Z"
}
```

### `gateways`
```json
{
  "gateway_id": "GATEWAY_001",
  "name": "Gateway Buenos Aires",
  "location": { "lat": -34.6037, "lng": -58.3816 },
  "status": "online",
  "last_seen": "2024-11-22T15:30:45.123Z"
}
```

### `alerts`
```json
{
  "sensor_id": "SENSOR_001",
  "type": "WATER_LEVEL_CRITICAL",
  "severity": "CRITICAL",
  "value": 85.5,
  "threshold": 100,
  "detected_at": "2024-11-22T15:30:45.123Z",
  "status": "ACTIVE"
}
```

---

## Variables de Entorno Completas (.env)

```bash
# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/flood_alert?retryWrites=true&w=majority
REDIS_URL=redis://localhost:6379

# Server
PORT=3001
NODE_ENV=development
LOG_LEVEL=info

# Security
API_KEY_SECRET=sk_dev_replace_with_secure_key

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Features
FEATURE_REAL_TIME_ALERTS=true
FEATURE_DATA_AGGREGATION=true

# Alert Thresholds
ALERT_WATER_LEVEL_CRITICAL_CM=100
ALERT_RAINFALL_HEAVY_MM=50
```

---

## Próximos Pasos

1. ✓ Backend corriendo con WiFi HTTP
2. ✓ Frontend recibiendo datos en tiempo real
3. ✓ MongoDB Atlas almacenando lecturas
4. ⏭ Implementar autenticación avanzada
5. ⏭ Agregar predicciones con ML
6. ⏭ Deployment en producción
7. ⏭ Configurar HTTPS con certificados

---

## Soporte y Recursos

- **API Docs**: Ver `WIFI_HTTP_API.md`
- **Frontend Hooks**: Ver `hooks/use-real-time-data.ts`
- **Backend Service**: Ver `src/services/gateway-data.service.ts`
- **GitHub**: [flood-alert-system](https://github.com/David2204269/FloodAlert)

---

**Última actualización**: 22 de Noviembre 2024
