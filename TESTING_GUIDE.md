# 🧪 TESTING - API REST Sensores

## ✅ Configuración Completada

La API está lista para usar. MongoDB Atlas está conectado correctamente:

```
mongodb+srv://FloodAlertDB:Admin123@cluster0.xmb1cvz.mongodb.net
Base de datos: flood_alert
Colección: lecturas
```

---

## 🚀 Inicio Rápido

### 1. Instalar dependencias
```bash
npm install
```

### 2. Ejecutar en desarrollo
```bash
npm run dev
```

El servidor estará disponible en: `http://localhost:3000`

---

## 📡 Pruebas de Endpoints

Abre PowerShell o Cmd y ejecuta estos comandos:

### ✅ 1. POST - Insertar lectura

```powershell
$headers = @{ 'Content-Type' = 'application/json' }
$body = @{
    lluvia_ao = 25.5
    humedad_ao = 65.0
    nivel_flotador = 'medio'
    flujo_lmin = 12.3
    temperatura_c = 28.5
    timestamp = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
} | ConvertTo-Json

Invoke-WebRequest -Uri 'http://localhost:3000/api/sensores' `
  -Method POST `
  -Headers $headers `
  -Body $body
```

**Respuesta esperada (201):**
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
    "timestamp": 1700000000000,
    "createdAt": "2025-11-19T12:30:45.123Z"
  }
}
```

---

### ✅ 2. GET - Obtener todas las lecturas

```powershell
Invoke-WebRequest -Uri 'http://localhost:3000/api/sensores' `
  -Method GET
```

**Respuesta esperada (200):**
```json
{
  "ok": true,
  "data": [
    { /* documentos */ }
  ]
}
```

---

### ✅ 3. GET - Obtener lectura por ID

```powershell
# Reemplaza con el ID real de una lectura
$id = "6733a5c8f7c3d9e4b2f1a0c9"

Invoke-WebRequest -Uri "http://localhost:3000/api/sensores/$id" `
  -Method GET
```

**Respuesta esperada (200):**
```json
{
  "ok": true,
  "data": { /* documento */ }
}
```

---

### ✅ 4. PATCH - Actualizar lectura

```powershell
$id = "6733a5c8f7c3d9e4b2f1a0c9"
$headers = @{ 'Content-Type' = 'application/json' }
$body = @{
    temperatura_c = 32.0
    nivel_flotador = 'alto'
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/sensores/$id" `
  -Method PATCH `
  -Headers $headers `
  -Body $body
```

**Respuesta esperada (200):**
```json
{
  "ok": true,
  "data": { /* documento actualizado */ }
}
```

---

### ✅ 5. DELETE - Eliminar por ID

```powershell
$id = "6733a5c8f7c3d9e4b2f1a0c9"

Invoke-WebRequest -Uri "http://localhost:3000/api/sensores/$id" `
  -Method DELETE
```

**Respuesta esperada (200):**
```json
{
  "ok": true,
  "data": { "deletedCount": 1 }
}
```

---

### ✅ 6. DELETE - Eliminar todas las lecturas

```powershell
Invoke-WebRequest -Uri 'http://localhost:3000/api/sensores' `
  -Method DELETE
```

**Respuesta esperada (200):**
```json
{
  "ok": true,
  "data": { "deletedCount": 5 }
}
```

---

## 🔴 Pruebas de Error

### ❌ ID Inválido

```powershell
Invoke-WebRequest -Uri 'http://localhost:3000/api/sensores/INVALID_ID' `
  -Method GET
```

**Respuesta esperada (400):**
```json
{
  "ok": false,
  "error": "ID inválido"
}
```

---

### ❌ Datos Inválidos en POST

```powershell
$headers = @{ 'Content-Type' = 'application/json' }
$body = @{
    lluvia_ao = "invalid"
    humedad_ao = 65.0
} | ConvertTo-Json

Invoke-WebRequest -Uri 'http://localhost:3000/api/sensores' `
  -Method POST `
  -Headers $headers `
  -Body $body
```

**Respuesta esperada (400):**
```json
{
  "ok": false,
  "error": "lluvia_ao: Debe ser un número"
}
```

---

## 🐍 Testing con Python

```python
import requests
import json
from datetime import datetime

BASE_URL = 'http://localhost:3000/api/sensores'

# POST - Crear lectura
data = {
    'lluvia_ao': 25.5,
    'humedad_ao': 65.0,
    'nivel_flotador': 'medio',
    'flujo_lmin': 12.3,
    'temperatura_c': 28.5,
    'timestamp': int(datetime.now().timestamp() * 1000)
}

response = requests.post(BASE_URL, json=data)
print(f"POST: {response.status_code}")
print(json.dumps(response.json(), indent=2))

# GET - Obtener todas
response = requests.get(BASE_URL)
print(f"\nGET: {response.status_code}")
print(f"Total lecturas: {len(response.json()['data'])}")

# Si hay al menos una lectura...
if response.json()['data']:
    doc_id = response.json()['data'][0]['_id']
    
    # GET por ID
    response = requests.get(f"{BASE_URL}/{doc_id}")
    print(f"\nGET by ID: {response.status_code}")
    
    # PATCH
    response = requests.patch(f"{BASE_URL}/{doc_id}", 
                             json={'temperatura_c': 35.0})
    print(f"PATCH: {response.status_code}")
    
    # DELETE
    response = requests.delete(f"{BASE_URL}/{doc_id}")
    print(f"DELETE: {response.status_code}")
```

---

## 📊 MongoDB Compass (GUI)

Si deseas ver los datos en tiempo real en MongoDB:

1. Descarga [MongoDB Compass](https://www.mongodb.com/products/compass)
2. Conecta con tu URI:
   ```
   mongodb+srv://FloodAlertDB:Admin123@cluster0.xmb1cvz.mongodb.net/?appName=Cluster0
   ```
3. Navega a `flood_alert` → `lecturas`

---

## ✨ Checklist Final

- [x] Conexión a MongoDB Atlas configurada
- [x] API REST completa (CRUD)
- [x] Validación de datos
- [x] Manejo de errores
- [x] TypeScript estricto
- [x] Respuestas estandarizadas
- [x] Documentación completada

---

**¡La API está lista para producción! 🚀**
