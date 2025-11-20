"""# API REST - Sensores Flood Alert System

## 📋 Estructura de la API

API Rest completa para gestionar lecturas de sensores IoT (TTGO) en MongoDB.

### Rutas implementadas:

- `POST /api/sensores` - Insertar nueva lectura
- `GET /api/sensores` - Obtener todas las lecturas
- `DELETE /api/sensores` - Eliminar todas las lecturas
- `GET /api/sensores/[id]` - Obtener lectura por ID
- `PATCH /api/sensores/[id]` - Actualizar lectura por ID
- `DELETE /api/sensores/[id]` - Eliminar lectura por ID

---

## 📁 Estructura de archivos

```
src/
├── lib/
│   └── mongodb.ts          # Conexión a MongoDB (clientPromise)
├── models/
│   └── Lectura.ts          # Interface TypeScript del modelo
└── utils/
    └── validateSensorData.ts  # Validación de datos

app/api/sensores/
├── route.ts                # GET, POST, DELETE de colección
└── [id]/
    └── route.ts            # GET, PATCH, DELETE de documento individual
```

---

## 📊 Esquema de datos - Colección `lecturas`

```json
{
  "_id": "ObjectId",           // ID automático de MongoDB
  "lluvia_ao": 25.5,           // Nivel de lluvia analógico
  "humedad_ao": 65.0,          // Humedad relativa
  "nivel_flotador": "alto",    // Estado del flotador (bajo|medio|alto)
  "flujo_lmin": 12.3,          // Flujo en litros/minuto
  "temperatura_c": 28.5,       // Temperatura en Celsius
  "timestamp": 1700000000,     // Timestamp enviado desde TTGO
  "createdAt": "2025-11-19T10:30:00.000Z"  // Creado automáticamente
}
```

---

## 🔌 Ejemplos de uso

### 1. POST - Insertar lectura (desde TTGO)

**URL:**
```
POST https://<tu-app>.vercel.app/api/sensores
```

**Body (JSON):**
```json
{
  "lluvia_ao": 25.5,
  "humedad_ao": 65.0,
  "nivel_flotador": "medio",
  "flujo_lmin": 12.3,
  "temperatura_c": 28.5,
  "timestamp": 1700000000
}
```

**Respuesta (201 Created):**
```json
{
  "ok": true,
  "data": {
    "_id": "6733a5c8f7c3d9e4b2f1a0c9",
    "lluvia_ao": 25.5,
    "humedad_ao": 65.0,
    "nivel_flotador": "medio",
    "flujo_lmin": 12.3,
    "temperatura_c": 28.5,
    "timestamp": 1700000000,
    "createdAt": "2025-11-19T10:30:00.000Z"
  }
}
```

---

### 2. GET - Obtener todas las lecturas

**URL:**
```
GET https://<tu-app>.vercel.app/api/sensores
```

**Respuesta (200 OK):**
```json
{
  "ok": true,
  "data": [
    {
      "_id": "6733a5c8f7c3d9e4b2f1a0c9",
      "lluvia_ao": 25.5,
      "humedad_ao": 65.0,
      "nivel_flotador": "medio",
      "flujo_lmin": 12.3,
      "temperatura_c": 28.5,
      "timestamp": 1700000000,
      "createdAt": "2025-11-19T10:30:00.000Z"
    },
    ...más registros
  ]
}
```

---

### 3. GET - Obtener una lectura por ID

**URL:**
```
GET https://<tu-app>.vercel.app/api/sensores/6733a5c8f7c3d9e4b2f1a0c9
```

**Respuesta (200 OK):**
```json
{
  "ok": true,
  "data": {
    "_id": "6733a5c8f7c3d9e4b2f1a0c9",
    "lluvia_ao": 25.5,
    "humedad_ao": 65.0,
    "nivel_flotador": "medio",
    "flujo_lmin": 12.3,
    "temperatura_c": 28.5,
    "timestamp": 1700000000,
    "createdAt": "2025-11-19T10:30:00.000Z"
  }
}
```

**Error (404 Not Found):**
```json
{
  "ok": false,
  "error": "Lectura no encontrada"
}
```

---

### 4. PATCH - Actualizar lectura por ID

**URL:**
```
PATCH https://<tu-app>.vercel.app/api/sensores/6733a5c8f7c3d9e4b2f1a0c9
```

**Body (solo los campos a actualizar):**
```json
{
  "temperatura_c": 30.0,
  "nivel_flotador": "alto"
}
```

**Respuesta (200 OK):**
```json
{
  "ok": true,
  "data": {
    "_id": "6733a5c8f7c3d9e4b2f1a0c9",
    "lluvia_ao": 25.5,
    "humedad_ao": 65.0,
    "nivel_flotador": "alto",
    "flujo_lmin": 12.3,
    "temperatura_c": 30.0,
    "timestamp": 1700000000,
    "createdAt": "2025-11-19T10:30:00.000Z"
  }
}
```

---

### 5. DELETE - Eliminar una lectura por ID

**URL:**
```
DELETE https://<tu-app>.vercel.app/api/sensores/6733a5c8f7c3d9e4b2f1a0c9
```

**Respuesta (200 OK):**
```json
{
  "ok": true,
  "data": {
    "deletedCount": 1
  }
}
```

---

### 6. DELETE - Eliminar todas las lecturas

**URL:**
```
DELETE https://<tu-app>.vercel.app/api/sensores
```

**Respuesta (200 OK):**
```json
{
  "ok": true,
  "data": {
    "deletedCount": 45
  }
}
```

---

## 🧪 Testing con cURL

### Insertar lectura
```bash
curl -X POST https://<tu-app>.vercel.app/api/sensores \\
  -H "Content-Type: application/json" \\
  -d '{
    "lluvia_ao": 25.5,
    "humedad_ao": 65.0,
    "nivel_flotador": "medio",
    "flujo_lmin": 12.3,
    "temperatura_c": 28.5,
    "timestamp": 1700000000
  }'
```

### Obtener todas
```bash
curl https://<tu-app>.vercel.app/api/sensores
```

### Obtener por ID
```bash
curl https://<tu-app>.vercel.app/api/sensores/6733a5c8f7c3d9e4b2f1a0c9
```

### Actualizar
```bash
curl -X PATCH https://<tu-app>.vercel.app/api/sensores/6733a5c8f7c3d9e4b2f1a0c9 \\
  -H "Content-Type: application/json" \\
  -d '{
    "temperatura_c": 32.0
  }'
```

### Eliminar
```bash
curl -X DELETE https://<tu-app>.vercel.app/api/sensores/6733a5c8f7c3d9e4b2f1a0c9
```

---

## ✅ Validaciones implementadas

### Validación en POST:
- `lluvia_ao`: Debe ser número
- `humedad_ao`: Debe ser número
- `nivel_flotador`: Debe ser string
- `flujo_lmin`: Debe ser número
- `temperatura_c`: Debe ser número
- `timestamp`: Debe ser número

### Códigos HTTP:
- **201**: Lectura insertada exitosamente
- **200**: Operación GET/PATCH/DELETE exitosa
- **400**: Datos inválidos o ID inválido
- **404**: Lectura no encontrada
- **500**: Error interno del servidor

---

## 🔐 Notas de seguridad

- Los endpoints están protegidos por validación de tipos
- Se valida que los ObjectIds sean válidos antes de hacer consultas
- No se permiten actualizaciones a `_id` o `createdAt`
- Las respuestas de error no exponen detalles internos

---

## 📦 Dependencias requeridas

```bash
npm install mongodb
npm install --save-dev @types/mongodb
```

---

## 🚀 Deployment

La base de datos se conecta automáticamente usando `process.env.MONGODB_URI` en Vercel.

No requiere configuración adicional de `.env` en el repositorio.

"""