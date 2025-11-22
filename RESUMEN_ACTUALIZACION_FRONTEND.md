# 📊 Resumen: Actualización del Frontend para Datos TTGO

## ✅ Cambios Realizados

### 1. Nuevo Módulo de Mapeo de Datos (`lib/data-mapper.ts`)

Se creó un módulo centralizado para mapear datos del formato TTGO al formato del frontend:

- **`mapearTTGOALectura()`**: Convierte datos del formato TTGO (temperatura_c, humedad_pct, caudal_l_s, lluvia_mm, nivel_m) al formato Lectura del frontend
- **`mapearBackendALectura()`**: Convierte datos del backend MongoDB al formato Lectura
- **`calcularNivelFlotador()`**: Calcula el nivel de riesgo basado en el nivel de agua en metros

### 2. Actualización del Hook de WebSocket (`hooks/use-real-time-data.ts`)

- Actualizado para aceptar datos en formato TTGO (nuevo) y formato legacy
- Soporta ambos formatos para compatibilidad

### 3. Actualización del Hook de Sensores (`hooks/use-sensor-data.ts`)

- Integrado con el mapeo de datos TTGO
- Convierte automáticamente los datos recibidos por WebSocket al formato correcto
- Actualiza sensores y lecturas en tiempo real

### 4. Actualización del Servicio API (`lib/api-service.ts`)

- **URL del backend actualizada**: Ahora apunta a `http://localhost:3001/api/v1`
- **`obtenerLecturas()`**: Obtiene lecturas del nuevo backend
- **`obtenerSensores()`**: Crea sensores dinámicamente basados en los gateways y lecturas del backend
- **`calcularEstadisticas()`**: Actualizado para usar ambos formatos de datos

### 5. Actualización de Componentes

#### `components/flood-dashboard.tsx`
- Mapeo mejorado de datos del sensor
- Soporte para ambos formatos (TTGO y legacy)
- Visualización correcta de:
  - Nivel de agua en metros
  - Caudal en L/min
  - Temperatura, humedad, lluvia

#### `components/flood-dashboard-improved.tsx`
- Actualizado para mostrar datos del formato TTGO
- Agregado campo de nivel de agua
- Soporte para valores opcionales con fallbacks

## 🔄 Mapeo de Campos

### Formato TTGO → Frontend

| TTGO (Nuevo) | Legacy | Frontend | Conversión |
|--------------|--------|----------|------------|
| `temperatura_c` | `temperature_c` | `temperatura_c` | Directo |
| `humedad_pct` | `humidity_percent` | `humedad_ao` | Directo |
| `caudal_l_s` | `flow_rate_lmin` | `flujo_lmin` | `caudal_l_s * 60` |
| `lluvia_mm` | `rain_accumulated_mm` | `lluvia_ao` | Directo |
| `nivel_m` | `water_level_cm` | `water_level_cm` | `nivel_m * 100` |
| - | - | `nivel_flotador` | Calculado desde `nivel_m` |

### Cálculo de Nivel de Riesgo

```typescript
nivel_m >= 0.8 → "CRÍTICO"
nivel_m >= 0.5 → "ALTO"
nivel_m >= 0.2 → "NORMAL"
nivel_m < 0.2  → "BAJO"
```

## 📡 Flujo de Datos

```
TTGO Gateway
    ↓
POST /api/v1/data/sensor
    ↓
Backend (Express)
    ↓
MongoDB Atlas
    ↓
WebSocket Event
    ↓
Frontend (use-real-time-data)
    ↓
Mapeo (data-mapper)
    ↓
Hook (use-sensor-data)
    ↓
Componentes (Dashboard)
```

## 🎯 Endpoints del Backend Utilizados

1. **`GET /api/v1/data/gateways`** - Obtener lista de gateways
2. **`GET /api/v1/data/gateway/:gateway_id`** - Obtener lecturas de un gateway
3. **`GET /api/v1/data/status/:sensor_id`** - Obtener última lectura de un sensor
4. **`GET /api/v1/data/history/:sensor_id`** - Obtener historial de lecturas
5. **WebSocket: `reading:update`** - Actualizaciones en tiempo real

## 🔍 Verificación

Para verificar que todo funciona:

1. **Inicia el backend:**
   ```powershell
   cd backend-implementation
   npm run dev
   ```

2. **Inicia el frontend:**
   ```powershell
   npm run dev
   ```

3. **Envía datos desde el TTGO** o usa el script de prueba:
   ```powershell
   .\test-post-sensor-simple.ps1
   ```

4. **Verifica en el frontend:**
   - Los datos deberían aparecer en tiempo real
   - Los valores deberían mostrarse correctamente
   - El nivel de riesgo debería calcularse automáticamente

## 📝 Notas Importantes

- El frontend ahora soporta **ambos formatos** (TTGO nuevo y legacy) para compatibilidad
- Los datos se mapean automáticamente cuando llegan por WebSocket
- Si un campo no existe en un formato, se usa el del otro formato como fallback
- El cálculo de `nivel_flotador` se hace automáticamente desde `nivel_m`

## 🐛 Solución de Problemas

### Los datos no aparecen en el frontend
- Verifica que el backend esté corriendo en `http://localhost:3001`
- Verifica la consola del navegador para errores
- Verifica que el WebSocket esté conectado

### Los valores se muestran como 0
- Verifica que el TTGO esté enviando datos correctamente
- Verifica que los campos en el payload coincidan con el formato esperado
- Revisa los logs del backend para ver qué datos se están recibiendo

### El nivel de riesgo no se calcula correctamente
- Verifica que `nivel_m` esté presente en los datos
- Revisa la función `calcularNivelFlotador()` en `lib/data-mapper.ts`

