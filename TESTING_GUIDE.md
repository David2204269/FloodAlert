# Testing Guide & API Examples

## API Testing with cURL

### 1. Health Check

```bash
# Liveness check
curl -X GET http://localhost:3001/api/v1/health
# Response: 200 { "ok": true, "timestamp": "..." }

# Readiness check
curl -X GET http://localhost:3001/api/v1/health/ready
# Response: 200 { "status": "healthy", "services": { ... } }

# Detailed health check
curl -X GET http://localhost:3001/api/v1/health/detailed
# Response: 200 with database stats, alerts count, sensors count
```

### 2. Data Ingestion

```bash
# Normal sensor reading
curl -X POST http://localhost:3001/api/v1/data/ingest \
  -H "Authorization: Bearer sk_dev_local_key_12345" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: SENSOR_001_ts1234567890" \
  -d '{
    "sensor_id": "SENSOR_001",
    "water_level_cm": 85,
    "rain_accumulated_mm": 2.5,
    "flow_rate_lmin": 120,
    "temperature_c": 22.3,
    "humidity_percent": 65,
    "timestamp": '$(date +%s)',
    "battery_percent": 85,
    "gateway_id": "GATEWAY_001",
    "rssi": -95,
    "snr": 7.5
  }'

# Response:
# {
#   "ok": true,
#   "received_at": "2025-11-22T10:30:00.000Z",
#   "reading_id": "507f1f77bcf86cd799439011"
# }
```

### 3. Critical Water Level Alert

```bash
# Trigger alert (water level critical)
curl -X POST http://localhost:3001/api/v1/data/ingest \
  -H "Authorization: Bearer sk_dev_local_key_12345" \
  -H "Content-Type: application/json" \
  -d '{
    "sensor_id": "SENSOR_001",
    "water_level_cm": 150,
    "rain_accumulated_mm": 25,
    "flow_rate_lmin": 450,
    "temperature_c": 24,
    "humidity_percent": 70,
    "timestamp": '$(date +%s)',
    "battery_percent": 75,
    "gateway_id": "GATEWAY_001"
  }'

# Verify alert was created:
curl -X GET http://localhost:3001/api/v1/health/detailed \
  -H "Authorization: Bearer sk_dev_local_key_12345"
# Check activeAlerts count increased
```

### 4. Get Sensor Status

```bash
# Get latest reading for a sensor
curl -X GET "http://localhost:3001/api/v1/data/status/SENSOR_001" \
  -H "Authorization: Bearer sk_dev_local_key_12345"

# Response:
# {
#   "ok": true,
#   "data": {
#     "timestamp": "2025-11-22T10:30:00.000Z",
#     "metadata": { "sensor_id": "SENSOR_001" },
#     "water_level_cm": 85,
#     "rain_accumulated_mm": 2.5,
#     "flow_rate_lmin": 120,
#     "temperature_c": 22.3,
#     "humidity_percent": 65,
#     "battery_percent": 85
#   }
# }
```

### 5. Get Historical Data

```bash
# Get last 24 hours of data
curl -X GET "http://localhost:3001/api/v1/data/history/SENSOR_001?hours=24&limit=100" \
  -H "Authorization: Bearer sk_dev_local_key_12345"

# Response: Array of readings
```

### 6. Get Sensor Configuration

```bash
# Get all sensors
curl -X GET http://localhost:3001/api/v1/config/sensors \
  -H "Authorization: Bearer sk_dev_local_key_12345"

# Get specific sensor config
curl -X GET http://localhost:3001/api/v1/config/sensors/SENSOR_001 \
  -H "Authorization: Bearer sk_dev_local_key_12345"

# Get thresholds for a sensor
curl -X GET http://localhost:3001/api/v1/config/thresholds/SENSOR_001 \
  -H "Authorization: Bearer sk_dev_local_key_12345"
```

### 7. Update Sensor Configuration (Admin)

```bash
# Update thresholds
curl -X PUT http://localhost:3001/api/v1/config/sensors/SENSOR_001 \
  -H "Authorization: Bearer sk_dev_local_key_12345" \
  -H "X-Admin-Key: admin_dev_key" \
  -H "Content-Type: application/json" \
  -d '{
    "thresholds": {
      "water_level_warning_cm": 100,
      "water_level_critical_cm": 130,
      "rainfall_heavy_mm": 15,
      "flow_excessive_lmin": 250,
      "temperature_min_c": -5,
      "temperature_max_c": 45
    },
    "read_interval_seconds": 300
  }'
```

---

## Load Testing Script (K6)

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

const API_KEY = 'sk_dev_local_key_12345';
const BASE_URL = 'http://localhost:3001';

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp-up to 100 users
    { duration: '5m', target: 100 },   // Stay at 100 users
    { duration: '2m', target: 200 },   // Ramp-up to 200
    { duration: '5m', target: 200 },   // Stay at 200
    { duration: '2m', target: 0 },     // Ramp-down to 0
  ],
  thresholds: {
    http_req_duration: ['p(99)<500'],   // 99% of requests < 500ms
    http_req_failed: ['<1%'],           // <1% failure rate
  },
};

export default function () {
  const sensorId = `SENSOR_${Math.floor(__VU % 10).toString().padStart(3, '0')}`;
  
  const payload = {
    sensor_id: sensorId,
    water_level_cm: Math.random() * 150,
    rain_accumulated_mm: Math.random() * 50,
    flow_rate_lmin: Math.random() * 500,
    temperature_c: 15 + Math.random() * 20,
    humidity_percent: 30 + Math.random() * 70,
    timestamp: Math.floor(Date.now() / 1000),
    battery_percent: 50 + Math.random() * 50,
    gateway_id: 'GATEWAY_001'
  };

  const headers = {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
    'X-Idempotency-Key': `${sensorId}_${Date.now()}`
  };

  const res = http.post(
    `${BASE_URL}/api/v1/data/ingest`,
    JSON.stringify(payload),
    { headers }
  );

  check(res, {
    'status is 201': (r) => r.status === 201,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'has reading_id': (r) => JSON.parse(r.body).reading_id !== undefined,
  });

  sleep(1);
}
```

**Run the load test:**
```bash
k6 run load-test.js
```

---

## MongoDB Testing Queries

```javascript
// Check total readings
db.sensor_readings.countDocuments()

// Get readings for a specific sensor
db.sensor_readings.find({ 'metadata.sensor_id': 'SENSOR_001' }).count()

// Get latest readings per sensor
db.sensor_readings.aggregate([
  { $sort: { timestamp: -1 } },
  { $group: {
    _id: '$metadata.sensor_id',
    latest: { $first: '$$ROOT' }
  } }
])

// Get readings in a time window
db.sensor_readings.find({
  timestamp: {
    $gte: ISODate('2025-11-22T00:00:00Z'),
    $lt: ISODate('2025-11-23T00:00:00Z')
  }
}).count()

// Get active alerts
db.alerts.find({ status: 'ACTIVE' }).pretty()

// Get alerts by sensor
db.alerts.find({ sensor_id: 'SENSOR_001' }).sort({ detected_at: -1 })

// Get alert statistics
db.alerts.aggregate([
  { $group: {
    _id: { type: '$type', severity: '$severity' },
    count: { $sum: 1 }
  } }
])

// Check database size
db.stats()

// Verify indexes
db.sensor_readings.getIndexes()
db.alerts.getIndexes()
db.sensors.getIndexes()
```

---

## WebSocket Testing (Node.js Client)

```javascript
// websocket-test.js
const io = require('socket.io-client');

const socket = io('http://localhost:3001', {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5
});

socket.on('connect', () => {
  console.log('✓ Connected to WebSocket server');
  
  // Subscribe to sensor readings
  socket.emit('subscribe:sensor', 'SENSOR_001');
  console.log('Subscribed to SENSOR_001');
});

socket.on('sensor:reading', (data) => {
  console.log('📊 New reading:', data);
});

socket.on('alert:new', (alert) => {
  console.log('🚨 New alert:', alert);
});

socket.on('alert:acknowledged', (data) => {
  console.log('✓ Alert acknowledged:', data);
});

socket.on('disconnect', () => {
  console.log('✗ Disconnected from server');
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
});

// Keep connection alive
setTimeout(() => {
  socket.disconnect();
}, 60000); // 1 minute
```

**Run:**
```bash
node websocket-test.js
```

---

## Integration Test Suite (Jest)

```typescript
// src/routes/__tests__/data-ingest.test.ts
import { MongoClient, Db } from 'mongodb';
import Redis from 'ioredis';
import request from 'supertest';
import { createApp } from '../../index';

describe('Data Ingestion Endpoint', () => {
  let app: Express;
  let db: Db;
  let redis: Redis;
  let mongoClient: MongoClient;

  beforeAll(async () => {
    // Connect to test database
    mongoClient = new MongoClient('mongodb://localhost:27017/flood_alert_test');
    await mongoClient.connect();
    db = mongoClient.db();
    redis = new Redis({ host: 'localhost', port: 6379, db: 1 });
    app = createApp(db, redis);
  });

  afterAll(async () => {
    await mongoClient.close();
    redis.disconnect();
  });

  beforeEach(async () => {
    // Clear collections
    await db.collection('sensor_readings').deleteMany({});
    await db.collection('alerts').deleteMany({});
  });

  it('should ingest valid sensor data', async () => {
    const response = await request(app)
      .post('/api/v1/data/ingest')
      .set('Authorization', 'Bearer sk_dev_local_key_12345')
      .send({
        sensor_id: 'SENSOR_001',
        water_level_cm: 85,
        rain_accumulated_mm: 2.5,
        flow_rate_lmin: 120,
        temperature_c: 22.3,
        humidity_percent: 65,
        timestamp: Math.floor(Date.now() / 1000),
        battery_percent: 85,
      });

    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
    expect(response.body.reading_id).toBeDefined();
  });

  it('should reject missing API key', async () => {
    const response = await request(app)
      .post('/api/v1/data/ingest')
      .send({
        sensor_id: 'SENSOR_001',
        water_level_cm: 85,
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Missing API key');
  });

  it('should reject invalid sensor data', async () => {
    const response = await request(app)
      .post('/api/v1/data/ingest')
      .set('Authorization', 'Bearer sk_dev_local_key_12345')
      .send({
        sensor_id: 'INVALID_001', // Wrong format
        water_level_cm: 'not_a_number',
      });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
  });

  it('should generate critical water level alert', async () => {
    const response = await request(app)
      .post('/api/v1/data/ingest')
      .set('Authorization', 'Bearer sk_dev_local_key_12345')
      .send({
        sensor_id: 'SENSOR_001',
        water_level_cm: 150, // Critical level
        rain_accumulated_mm: 2.5,
        flow_rate_lmin: 120,
        temperature_c: 22.3,
        humidity_percent: 65,
        timestamp: Math.floor(Date.now() / 1000),
        battery_percent: 85,
      });

    expect(response.status).toBe(201);

    // Wait for alert processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check alerts collection
    const alerts = await db.collection('alerts').find({}).toArray();
    expect(alerts.length).toBeGreaterThan(0);
  });

  it('should handle duplicate requests (idempotency)', async () => {
    const payload = {
      sensor_id: 'SENSOR_001',
      water_level_cm: 85,
      rain_accumulated_mm: 2.5,
      flow_rate_lmin: 120,
      temperature_c: 22.3,
      humidity_percent: 65,
      timestamp: Math.floor(Date.now() / 1000),
      battery_percent: 85,
    };

    const idempotencyKey = 'TEST_KEY_123';

    // First request
    const response1 = await request(app)
      .post('/api/v1/data/ingest')
      .set('Authorization', 'Bearer sk_dev_local_key_12345')
      .set('X-Idempotency-Key', idempotencyKey)
      .send(payload);

    expect(response1.status).toBe(201);

    // Duplicate request (should return same response)
    const response2 = await request(app)
      .post('/api/v1/data/ingest')
      .set('Authorization', 'Bearer sk_dev_local_key_12345')
      .set('X-Idempotency-Key', idempotencyKey)
      .send(payload);

    expect(response2.status).toBe(200);
    expect(response2.body.deduplicated).toBe(true);
  });

  it('should enforce rate limiting', async () => {
    const payload = {
      sensor_id: 'SENSOR_001',
      water_level_cm: 85,
      rain_accumulated_mm: 2.5,
      flow_rate_lmin: 120,
      temperature_c: 22.3,
      humidity_percent: 65,
      timestamp: Math.floor(Date.now() / 1000),
      battery_percent: 85,
    };

    // Send 21 requests (limit is 20/min)
    for (let i = 0; i < 21; i++) {
      const response = await request(app)
        .post('/api/v1/data/ingest')
        .set('Authorization', 'Bearer sk_dev_local_key_12345')
        .send(payload);

      if (i < 20) {
        expect(response.status).toBe(201);
      } else {
        expect(response.status).toBe(429);
        expect(response.body.code).toBe('RATE_LIMIT_EXCEEDED');
      }
    }
  });
});
```

**Run tests:**
```bash
npm test
npm test -- --watch
```

---

## Performance Testing Results (Example)

```
Load Test Summary (1000 concurrent requests):
═════════════════════════════════════════════════════════════

✓ Total Requests:       10,000
✓ Successful:           9,950 (99.5%)
✓ Failed:               50 (0.5%)

Response Time:
├─ Minimum:             25ms
├─ Average:             87ms
├─ Maximum:             2,145ms
├─ P50 (Median):        65ms
├─ P95:                 245ms
└─ P99:                 512ms

Throughput:
├─ Requests/sec:        833
└─ Data/sec:            2.4 MB/s

Database Metrics:
├─ Write Latency:       15-45ms
├─ Query Latency:       8-25ms
└─ Connection Pool:     92/100 (92%)

Memory Usage:
├─ Node.js:             185 MB
├─ MongoDB:             312 MB
└─ Redis:               42 MB

Conclusion: ✓ PASSED - Backend can handle 833 req/sec with <500ms p99 latency
```

