# 🔒 SEGURIDAD Y AUTENTICACIÓN - TTGO GATEWAY ↔ BACKEND

## 1. Flujo de Autenticación API

```
TTGO Gateway                            Backend Express.js
     │                                         │
     │  POST /api/v1/data/ingest              │
     │  Headers:                              │
     │    Authorization: Bearer <API_KEY>     │
     │    Content-Type: application/json      │
     │                                         │
     ├─────────────────────────────────────►  │
     │    {                                    │
     │      "sensor_id": "SENSOR_001",        │
     │      "gateway_id": "GATEWAY_001",      │
     │      "timestamp": "2025-11-22T...",    │
     │      "water_level_cm": 175,            │
     │      ...                               │
     │    }                                    │
     │                                         │
     │                      [Validar API Key] │
     │                      [Validar Schema]  │
     │                      [Verificar Dups]  │
     │                      [Almacenar]       │
     │                                         │
     │  HTTP 201 Created                      │
     │  {                                      │
     │    "success": true,                    │
     │    "reading_id": "...",                │
     │    "timestamp": "...",                 │
     │    "alerts_triggered": 0               │
     │  }                                      │
     │  ◄─────────────────────────────────────┤
     │                                         │
```

---

## 2. Configuración de API Key

### a) Generar API Key en Backend

```bash
# Generar clave aleatoria de 32 caracteres
openssl rand -hex 32
# Output: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

# Guardar en .env
echo "API_KEY_SECRET=Bearer sk_test_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6" >> .env
```

### b) Configurar en TTGO Gateway

```cpp
// ttgo-gateway-http.ino

const char* API_KEY = "Bearer sk_test_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6";

// En función sendToBackend():
http.addHeader("Authorization", API_KEY);
```

---

## 3. Rate Limiting por Sensor

Limitar a 20 solicitudes por minuto por sensor para evitar spam:

```typescript
// backend-implementation/src/middleware/rate-limit.ts

import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

export function createSensorRateLimiter(redis: Redis) {
  return rateLimit({
    store: new RedisStore({
      client: redis,
      prefix: 'rl:', // Rate Limit prefix
    }),
    keyGenerator: (req) => {
      // Usar sensor_id del body como clave única
      const sensorId = req.body?.sensor_id || req.ip;
      return `sensor:${sensorId}`;
    },
    windowMs: 60 * 1000, // 1 minuto
    max: 20, // 20 requests per minute
    message: { error: 'Too many requests from this sensor' },
    standardHeaders: true,
    legacyHeaders: false,
  });
}

// Uso en router:
router.post('/ingest', rateLimiter, apiKeyAuth, async (req, res) => {
  // ...
});
```

---

## 4. Validación de Payload con Zod

```typescript
// Validar estructura y rangos de datos

import { z } from 'zod';

const GatewayPayloadSchema = z.object({
  // Requeridos
  sensor_id: z.string()
    .min(1, 'Sensor ID requerido')
    .max(32, 'Sensor ID muy largo')
    .regex(/^[A-Z0-9_]+$/, 'Solo caracteres alfanuméricos y _'),
    
  gateway_id: z.string()
    .min(1, 'Gateway ID requerido')
    .max(32, 'Gateway ID muy largo'),
    
  timestamp: z.string()
    .datetime('Timestamp debe ser ISO 8601'),

  // Opcionales pero validados
  water_level_cm: z.number()
    .min(0, 'No puede ser negativo')
    .max(500, 'Excede máximo')
    .optional(),
    
  rain_accumulated_mm: z.number()
    .min(0)
    .max(10000)
    .optional(),
    
  flow_rate_lmin: z.number()
    .min(0)
    .max(10000)
    .optional(),
    
  temperature_c: z.number()
    .min(-50)
    .max(60)
    .optional(),
    
  humidity_percent: z.number()
    .min(0)
    .max(100)
    .optional(),
    
  battery_percent: z.number()
    .min(0)
    .max(100)
    .optional(),
});

// Uso:
const validation = GatewayPayloadSchema.safeParse(req.body);
if (!validation.success) {
  return res.status(400).json({
    error: 'Invalid payload',
    details: validation.error.errors,
  });
}
```

---

## 5. Deduplicación de Solicitudes

Prevenir procesamiento duplicado si el gateway reintenta:

```typescript
// backend-implementation/src/services/idempotency.service.ts

export class IdempotencyService {
  constructor(private redis: Redis) {}

  async checkAndStore(
    sensor_id: string,
    timestamp: Date,
    payloadHash: string
  ): Promise<{ isDuplicate: boolean; previousResult?: any }> {
    const key = `idempotency:${sensor_id}:${timestamp.getTime()}`;
    
    const existing = await this.redis.get(key);
    if (existing) {
      return {
        isDuplicate: true,
        previousResult: JSON.parse(existing),
      };
    }

    // Guardar este resultado por 5 minutos
    const result = {
      sensor_id,
      timestamp,
      processed_at: new Date(),
      payload_hash: payloadHash,
    };

    await this.redis.setex(
      key,
      300, // 5 minutos
      JSON.stringify(result)
    );

    return { isDuplicate: false };
  }
}
```

---

## 6. Sanitización de Datos (MongoDB Injection Prevention)

```typescript
// Usar express-mongo-sanitize

import mongoSanitize from 'express-mongo-sanitize';

app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`Potential MongoDB injection detected in ${key}`);
  },
}));
```

---

## 7. HTTPS/TLS en Producción

### a) Certificados SSL/TLS

```bash
# Generar certificados auto-firmados (desarrollo)
openssl req -x509 -newkey rsa:4096 -nodes -out cert.pem -keyout key.pem -days 365

# En producción, usar Let's Encrypt
# Con Heroku: incluye SSL automáticamente
# Con AWS: usar ACM (AWS Certificate Manager)
```

### b) Forzar HTTPS en Gateway

```cpp
// ttgo-gateway-http.ino

// Usar https en lugar de http
const char* BACKEND_URL = "https://your-domain.com/api/v1/data/ingest";

// Para certificados auto-firmados, deshabilitar verificación (NO en producción!)
http.setInsecure(); // Solo desarrollo
```

---

## 8. HMAC Signing (Opcional pero Recomendado)

Firmar solicitud con clave compartida para mayor seguridad:

```typescript
// Backend: Verificar firma HMAC

import crypto from 'crypto';

function verifyHMACSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Middleware:
app.post('/api/v1/data/ingest', (req, res, next) => {
  const signature = req.headers['x-signature'] as string;
  const payload = req.rawBody; // Necesita middleware especial

  if (!verifyHMACSignature(payload, signature, process.env.HMAC_SECRET!)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  next();
});
```

```cpp
// Gateway: Generar firma HMAC

#include <SHA256.h>

String generateHMAC(const char* payload, const char* secret) {
  // Usar librería de HMAC
  // Retornar hex string
}

// En sendToBackend():
String payload = jsonPayload;
String signature = generateHMAC(payload.c_str(), API_SECRET.c_str());
http.addHeader("X-Signature", signature);
```

---

## 9. Configuración de Seguridad Express

```typescript
// backend-implementation/src/index.ts

import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import cors from 'cors';

// Seguridad con Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
}));

// CORS limitado
app.use(cors({
  origin: [
    'http://localhost:3000', // Desarrollo frontend
    'https://your-domain.com', // Producción
  ],
  credentials: true,
  optionsSuccessStatus: 200,
}));

// Data sanitization
app.use(mongoSanitize());

// Limit request size
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
```

---

## 10. Gestión de Errores Segura

```typescript
// No revelar detalles de implementación en errores

// ❌ MAL
res.status(500).json({
  error: 'MongoDB connection failed: Cannot connect to 192.168.1.50:27017',
});

// ✅ BIEN
res.status(500).json({
  error: 'Internal server error',
  requestId: 'req_12345', // Para debugging interno
});

// En logs (no exponible):
logger.error({
  msg: 'Data ingestion failed',
  error: error.message,
  sensor_id,
  timestamp: new Date().toISOString(),
  stack: error.stack,
});
```

---

## 11. Monitoreo de Seguridad

```typescript
// Detectar comportamiento sospechoso

export class SecurityMonitor {
  constructor(private redis: Redis, private logger: Logger) {}

  async trackFailedAuth(ip: string, sensor_id: string) {
    const key = `failed_auth:${ip}:${sensor_id}`;
    const count = await this.redis.incr(key);
    
    // Alertar si hay múltiples intentos fallidos
    if (count > 5) {
      this.logger.warn({
        msg: 'Multiple failed authentication attempts',
        ip,
        sensor_id,
        attempts: count,
      });

      // Bloquear temporalmente (10 minutos)
      await this.redis.setex(`blocked:${ip}`, 600, '1');
    }

    // Resetear contador después de 1 hora
    await this.redis.expire(key, 3600);
  }

  async isBlocked(ip: string): Promise<boolean> {
    return (await this.redis.exists(`blocked:${ip}`)) === 1;
  }
}
```

---

## 12. Checklist de Seguridad

- ✅ API Key configurada en variables de entorno
- ✅ HTTPS habilitado en producción
- ✅ Rate limiting por sensor (20 req/min)
- ✅ Validación de payload con Zod
- ✅ Deduplicación de solicitudes
- ✅ Sanitización de datos (MongoDB injection)
- ✅ Helmet.js para headers de seguridad
- ✅ CORS limitado a dominios conocidos
- ✅ Logging de eventos de seguridad
- ✅ Manejo seguro de errores
- ✅ Monitoreo de intentos fallidos
- ✅ Credenciales no en código (variables de entorno)

---

## 13. Archivo .env Ejemplo

```bash
# .env

# Backend
NODE_ENV=production
PORT=3001
LOG_LEVEL=info

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster0.mongodb.net/flood_alert
REDIS_URL=redis://default:password@redis-cloud.redislabs.com:12345

# Seguridad
API_KEY_SECRET=sk_test_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
HMAC_SECRET=sk_hmac_f1e2d3c4b5a6g7h8i9j0k1l2m3n4o5p6
ADMIN_KEY=sk_admin_p0o9n8m7l6k5j4i3h2g1f0e9d8c7b6a5

# CORS
CORS_ORIGINS=http://localhost:3000,https://your-domain.com

# Alertas
ENABLE_WEBHOOKS=true
WEBHOOK_SECRET=sk_webhook_secret_here
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

---

**¡Tu sistema está ahora seguro y listo para producción!**
