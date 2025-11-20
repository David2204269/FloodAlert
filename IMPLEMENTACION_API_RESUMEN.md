# 🎯 API REST Sensores - Resumen de Implementación

## ✅ Completado

Se ha creado una **API REST completa y funcional** para gestionar lecturas de sensores IoT en MongoDB, desplegable en Vercel.

---

## 📂 Archivos Creados

### 1. **Configuración & Conexión a BD**
- `src/lib/mongodb.ts` - Conexión singleton con MongoDB (usa `MONGODB_URI` de Vercel)

### 2. **Modelos**
- `src/models/Lectura.ts` - Interface TypeScript con 7 campos

### 3. **Validación**
- `src/utils/validateSensorData.ts` - Validación de tipos stricta

### 4. **Endpoints API**
- `app/api/sensores/route.ts`:
  - `POST` - Insertar lectura + validación
  - `GET` - Obtener todas (ordenadas DESC)
  - `DELETE` - Eliminar todas

- `app/api/sensores/[id]/route.ts`:
  - `GET` - Obtener por ID
  - `PATCH` - Actualizar campos individuales
  - `DELETE` - Eliminar por ID

### 5. **Documentación & Testing**
- `API_SENSORES_README.md` - Documentación completa con ejemplos cURL
- `TTGO_CLIENT_EXAMPLES.ts` - Ejemplos en Arduino, MicroPython, JS, Python
- `test-api.ts` - Script de testing automatizado

---

## 🚀 Inicio Rápido

### 1. Instalar dependencias
```bash
npm install mongodb
npm install --save-dev @types/mongodb
```

### 2. Configurar en Vercel
- La variable `MONGODB_URI` ya está configurada
- No requiere `.env` local

### 3. Ejecutar localmente
```bash
npm run dev
```

### 4. Probar endpoints
```bash
# POST - Crear lectura
curl -X POST http://localhost:3000/api/sensores \
  -H "Content-Type: application/json" \
  -d '{"lluvia_ao":25.5,"humedad_ao":65,"nivel_flotador":"medio","flujo_lmin":12.3,"temperatura_c":28.5,"timestamp":1700000000}'

# GET - Obtener todas
curl http://localhost:3000/api/sensores

# GET - Por ID
curl http://localhost:3000/api/sensores/{id}

# PATCH - Actualizar
curl -X PATCH http://localhost:3000/api/sensores/{id} \
  -H "Content-Type: application/json" \
  -d '{"temperatura_c":30}'

# DELETE - Eliminar
curl -X DELETE http://localhost:3000/api/sensores/{id}
```

---

## 📋 Estructura de la Base de Datos

**Colección:** `lecturas`
**Base de datos:** `flood_alert`

```json
{
  "_id": ObjectId,
  "lluvia_ao": number,
  "humedad_ao": number,
  "nivel_flotador": string,
  "flujo_lmin": number,
  "temperatura_c": number,
  "timestamp": number,
  "createdAt": Date
}
```

---

## 🔒 Características de Seguridad

✅ Validación de tipos stricta  
✅ Validación de ObjectIds  
✅ No se permite actualizar `_id` o `createdAt`  
✅ Respuestas de error controladas  
✅ Códigos HTTP estándar  
✅ TypeScript estricto  

---

## 📡 Endpoint TTGO Final

```
POST https://<tu-app>.vercel.app/api/sensores
```

Con payload JSON:
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

**Respuesta exitosa (201):**
```json
{
  "ok": true,
  "data": {
    "_id": "...",
    "lluvia_ao": 25.5,
    ...
    "createdAt": "2025-11-19T..."
  }
}
```

---

## 📦 Dependencias Instaladas

```
mongodb@^6.x
@types/mongodb@^6.x
```

---

## 🧪 Testing

Para probar toda la API automáticamente:

```bash
# Asegúrate que el servidor esté corriendo
npm run dev

# En otra terminal, ejecuta los tests
npx ts-node test-api.ts
```

Prueba 9 scenarios:
1. ✓ POST crear lectura
2. ✓ GET todas las lecturas
3. ✓ GET por ID
4. ✓ PATCH actualizar
5. ✓ POST segunda lectura
6. ✓ DELETE por ID
7. ✓ Error - ID inválido
8. ✓ Error - Validación fallida
9. ✓ GET conteo final

---

## 🎨 Respuestas Estandarizadas

Todas las respuestas siguen el formato:

**Éxito:**
```json
{
  "ok": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "ok": false,
  "error": "Descripción del error"
}
```

---

## 🚢 Deployment a Vercel

1. Push a GitHub
2. Vercel detecta automáticamente
3. Se usa `MONGODB_URI` del environment
4. ¡Listo! La API está en vivo

---

## 📞 Soporte

- **Documentación:** `API_SENSORES_README.md`
- **Ejemplos cliente:** `TTGO_CLIENT_EXAMPLES.ts`
- **Testing:** `test-api.ts`

---

**Creado:** 19 de Noviembre, 2025  
**Versión:** 1.0  
**Estado:** ✅ Producción
