# Resumen de Configuración - MongoDB Atlas y API POST

## ✅ Tareas Completadas

### 1. Conexión a MongoDB Atlas
- ✅ Configurado `dotenv` para cargar variables de entorno
- ✅ Mejorada la función `connectMongoDB()` con:
  - Timeouts aumentados para conexiones a Atlas
  - Mejor manejo de errores con mensajes informativos
  - Detección automática del nombre de la base de datos desde la URI
  - Validación de la URI de conexión

### 2. Endpoint POST para Registrar Datos
- ✅ Endpoint existente: `POST /api/v1/data/sensor`
- ✅ Autenticación mediante API Key (Bearer token)
- ✅ Validación de datos de entrada
- ✅ Soporte para formato TTGO y formato legacy
- ✅ Deduplicación de lecturas duplicadas
- ✅ Almacenamiento en MongoDB con timestamps correctos
- ✅ Emisión de eventos WebSocket para actualizaciones en tiempo real

### 3. Documentación y Scripts de Prueba
- ✅ Documentación completa en `CONFIGURACION_MONGODB_ATLAS.md`
- ✅ Script de prueba `test-mongodb-connection.js`
- ✅ Script agregado al package.json: `npm run test:mongodb`

## 📋 Pasos para Configurar

### Paso 1: Configurar Variables de Entorno

El proyecto incluye un archivo `.env.example` con la configuración predefinida. 

**Opción rápida (recomendada):**
```powershell
cd backend-implementation
.\crear-env.ps1
```

Esto copiará `.env.example` a `.env` automáticamente.

**O crea manualmente** un archivo `.env` en `backend-implementation/`:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/flood_alert?retryWrites=true&w=majority
API_KEY_SECRET=tu_clave_secreta_aqui
PORT=3001
NODE_ENV=development
LOG_LEVEL=info
REDIS_URL=redis://localhost:6379
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

### Paso 2: Configurar MongoDB Atlas

1. Agrega tu IP a la whitelist en MongoDB Atlas (Network Access)
2. Obtén tu connection string desde el panel de MongoDB Atlas
3. Reemplaza `<username>` y `<password>` en la URI

### Paso 3: Probar la Conexión

```bash
cd backend-implementation
npm run test:mongodb
```

### Paso 4: Iniciar el Servidor

```bash
npm run dev
```

## 🔌 Uso del Endpoint POST

### Endpoint: `POST /api/v1/data/sensor`

**Headers:**
```
Authorization: Bearer <API_KEY_SECRET>
Content-Type: application/json
```

**Ejemplo de petición (formato TTGO):**

**En Windows (PowerShell):**
```powershell
.\test-post-sensor.ps1 -ApiKey "tu_clave_secreta_aqui"
```

**En Linux/Mac (Bash):**
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

**Respuesta exitosa:**
```json
{
  "ok": true,
  "received_at": "2024-01-01T12:00:00.000Z",
  "reading_id": "65a1b2c3d4e5f6a7b8c9d0e1"
}
```

## 📝 Formato de Datos

El endpoint acepta dos formatos:

### Formato TTGO (nuevo)
- `temperatura_c`: Temperatura en °C
- `humedad_pct`: Humedad en porcentaje
- `caudal_l_s`: Caudal en L/s
- `lluvia_mm`: Lluvia en mm
- `nivel_m`: Nivel en metros

### Formato Legacy
- `water_level_cm`: Nivel de agua en cm
- `rain_accumulated_mm`: Lluvia acumulada en mm
- `flow_rate_lmin`: Caudal en L/min
- `temperature_c`: Temperatura en °C
- `humidity_percent`: Humedad en porcentaje
- `battery_percent`: Batería en porcentaje

## 🔍 Verificación

Para verificar que los datos se están guardando correctamente:

1. Conecta a MongoDB Atlas usando MongoDB Compass o el shell
2. Navega a la base de datos `flood_alert`
3. Revisa la colección `sensor_readings`
4. Deberías ver los documentos con la estructura:
   ```json
   {
     "_id": ObjectId("..."),
     "metadata": {
       "sensor_id": "SENSOR_001",
       "gateway_id": "GATEWAY_001",
       "timestamp": ISODate("...")
     },
     "temperatura_c": 25.5,
     "humedad_pct": 65.0,
     "received_at": ISODate("..."),
     "processing_timestamp": ISODate("...")
   }
   ```

## 🐛 Solución de Problemas

### Error: "MongoDB connection failed"
- Verifica que `MONGODB_URI` esté correctamente configurado
- Asegúrate de que tu IP esté en la whitelist de MongoDB Atlas
- Verifica que las credenciales sean correctas

### Error: "Invalid API key"
- Verifica que el header `Authorization: Bearer <API_KEY_SECRET>` esté presente
- Asegúrate de que `API_KEY_SECRET` en `.env` coincida con el token enviado

### Error: "Validation failed"
- Verifica que todos los campos requeridos estén presentes
- Asegúrate de que los valores estén dentro de los rangos permitidos
- Revisa el formato del timestamp (debe ser un número)

## 📚 Archivos Modificados

- `backend-implementation/src/index.ts`: Configuración de MongoDB Atlas
- `backend-implementation/src/services/gateway-data.service.ts`: Mejora en manejo de timestamps
- `backend-implementation/package.json`: Script de prueba agregado
- `backend-implementation/CONFIGURACION_MONGODB_ATLAS.md`: Documentación completa
- `backend-implementation/test-mongodb-connection.js`: Script de prueba
- `backend-implementation/RESUMEN_CONFIGURACION.md`: Este archivo

