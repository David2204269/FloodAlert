# 🌊 Flood Alert System - IoT Architecture Migration

**Complete production-ready solution for TTGO ESP32 LoRa flood alert system**

> Transforming a Next.js monolith into a scalable, IoT-ready architecture with separated data ingestion, real-time alerts, and WebSocket communication.

---

## 📖 Where to Start

### 🎯 For Quick Overview (10 minutes)
**→ Read**: `IMPLEMENTATION_SUMMARY.md`
- Architecture at a glance
- Key deliverables
- Quick start guide
- Implementation checklist

### 🏗️ For Detailed Architecture (30 minutes)
**→ Read**: `IOT_ARCHITECTURE_DESIGN.md`
- Complete system architecture diagram
- Communication flow (3 detailed scenarios)
- TTGO sensor code (Arduino)
- TTGO gateway code (Arduino)
- Express backend implementation
- MongoDB schema & models
- Alert evaluation logic
- Security considerations
- Future enhancements (LoRaWAN, MQTT)

### 🚀 For Deployment (1-2 hours)
**→ Read**: `DEPLOYMENT_GUIDE.md`
- Local development setup (5 minutes)
- Production deployment options
- Database configuration (MongoDB Atlas)
- Cache setup (Redis Cloud)
- CI/CD pipeline
- Monitoring & alerting
- Security hardening
- Scaling recommendations
- Troubleshooting runbook

### 🧪 For Testing (1 hour)
**→ Read**: `TESTING_GUIDE.md`
- API testing with cURL (with examples)
- Load testing (K6 script included)
- MongoDB query examples
- WebSocket testing
- Jest integration tests
- Performance benchmarks

---

## 📁 Project Structure

```
flood-alert-system-6/
│
├── 📄 README.md                          (This file)
├── 📄 IMPLEMENTATION_SUMMARY.md          ⭐ START HERE
├── 📄 IOT_ARCHITECTURE_DESIGN.md         (85 KB comprehensive guide)
├── 📄 DEPLOYMENT_GUIDE.md                (Production deployment)
├── 📄 TESTING_GUIDE.md                   (Testing & QA)
│
├── 📁 backend-implementation/            (NEW - Express backend)
│   ├── 📄 package.json                   (Dependencies)
│   ├── 📄 tsconfig.json                  (TypeScript config)
│   ├── 📄 Dockerfile                     (Container image)
│   ├── 📄 docker-compose.yml             (Local dev environment)
│   ├── 📄 .env.example                   (Config template)
│   │
│   └── 📁 src/
│       ├── 📄 index.ts                   (Main app entry)
│       ├── 📁 routes/
│       │   ├── data-ingest.routes.ts    (Sensor data API)
│       │   ├── health.routes.ts         (Health checks)
│       │   └── config.routes.ts         (Configuration API)
│       └── 📁 services/
│           ├── alert.service.ts         (Alert engine)
│           └── websocket.service.ts     (Real-time updates)
│
├── 📁 app/                               (Existing Next.js)
├── 📁 components/                        (Existing React)
├── 📁 lib/                               (Existing utilities)
└── 📁 src/                               (Existing models/types)
```

---

## 🚀 Quick Start (5 Minutes)

### 1. Local Development

```bash
# Navigate to backend
cd backend-implementation

# Install dependencies
npm install

# Start services (MongoDB, Redis, Backend)
docker-compose up -d

# Verify services are running
docker-compose ps

# Run database setup
npm run db:migrate

# Start backend in development mode
npm run dev
```

**Expected output:**
```
✓ Connected to MongoDB
✓ Connected to Redis
✓ Server running on port 3001
✓ WebSocket server ready
```

### 2. Test the API

```bash
# Send a sensor reading
curl -X POST http://localhost:3001/api/v1/data/ingest \
  -H "Authorization: Bearer sk_dev_local_key_12345" \
  -H "Content-Type: application/json" \
  -d '{
    "sensor_id": "SENSOR_001",
    "water_level_cm": 85,
    "rain_accumulated_mm": 2.5,
    "flow_rate_lmin": 120,
    "temperature_c": 22.3,
    "humidity_percent": 65,
    "timestamp": '$(date +%s)',
    "battery_percent": 85
  }'
```

**Expected response (201 Created):**
```json
{
  "ok": true,
  "received_at": "2025-11-22T10:30:00.000Z",
  "reading_id": "507f1f77bcf86cd799439011"
}
```

### 3. Check Health

```bash
# Quick health check
curl http://localhost:3001/api/v1/health
# Response: { "ok": true, "timestamp": "..." }

# Full health check
curl http://localhost:3001/api/v1/health/ready
# Response: { "status": "healthy", "services": { ... } }
```

---

## 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ SENSOR LAYER                                                    │
│                                                                  │
│ TTGO ESP32 + LoRa        TTGO ESP32 + WiFi                      │
│  • Water level            • Receives LoRa packets               │
│  • Rain gauge             • Parses & validates                  │
│  • Flow meter             • HTTP POST to backend (with retries) │
│  • Temperature            • Rate: Every 5-30 mins              │
│  • Humidity               • Payload: ~50 bytes                 │
└─────────────────────────────────────────────────────────────────┘
                                 │
                         HTTP POST / MQTT
                                 │
┌─────────────────────────────────────────────────────────────────┐
│ INGESTION LAYER (Express.js)                                    │
│                                                                  │
│ ✓ Validate & sanitize input          (Zod schemas)             │
│ ✓ Authenticate API key                (Bearer tokens)          │
│ ✓ Rate limiting                       (20 req/min per sensor)   │
│ ✓ Deduplication                       (Idempotency keys)        │
│ ✓ MongoDB persistence                 (Time-series optimized)   │
│ ✓ Real-time alert evaluation          (<1 sec)                 │
│ ✓ WebSocket broadcasting              (<500ms)                 │
│ ✓ Webhook triggers                    (SMS, Email, Slack)      │
└─────────────────────────────────────────────────────────────────┘
         ↓                        ↓                    ↓
    [MongoDB]            [Redis Cache]          [WebSocket]
    (Readings)           (Alert State)           (Live Dashboard)
```

---

## 🔑 Key Features

### Data Ingestion
- ✅ RESTful API (`POST /api/v1/data/ingest`)
- ✅ Automatic validation (Zod schema)
- ✅ Rate limiting (20 req/min per sensor)
- ✅ Deduplication (idempotency keys)
- ✅ Error handling & retries

### Alert Processing
- ✅ Real-time threshold evaluation (<1 second)
- ✅ Trend analysis (30-min sliding window)
- ✅ Alert deduplication (5-min window)
- ✅ Severity-based escalation
- ✅ Webhook triggers (SMS, Email)

### Real-time Communication
- ✅ WebSocket server (Socket.io)
- ✅ Room-based broadcasting
- ✅ Per-sensor subscriptions
- ✅ Low-latency updates (<500ms)

### Data Persistence
- ✅ MongoDB time-series collection
- ✅ Automatic indexes
- ✅ TTL cleanup (90 days)
- ✅ Query optimization

### Security
- ✅ API key authentication
- ✅ Request validation
- ✅ Rate limiting
- ✅ Data sanitization
- ✅ HTTPS/TLS ready
- ✅ Structured logging

---

## 🧪 Testing

### Quick API Test
```bash
# See TESTING_GUIDE.md for complete testing procedures

# Health check
curl http://localhost:3001/api/v1/health

# Get sensor status
curl -H "Authorization: Bearer sk_dev_local_key_12345" \
  http://localhost:3001/api/v1/data/status/SENSOR_001

# Get history (24 hours)
curl -H "Authorization: Bearer sk_dev_local_key_12345" \
  "http://localhost:3001/api/v1/data/history/SENSOR_001?hours=24"
```

### Load Testing
```bash
# Install k6 (load testing tool)
brew install k6

# Run load test (see TESTING_GUIDE.md)
k6 run load-test.js

# Expected: 833 req/sec with <500ms p99 latency
```

### Unit Tests
```bash
npm test
npm test -- --watch
```

---

## 📊 Performance Expectations

| Metric | Target | Expected |
|--------|--------|----------|
| Request Latency (p99) | <500ms | <100ms |
| Data Throughput | 1000 req/sec | 833 req/sec |
| Alert Generation | <1 sec | <1 sec |
| WebSocket Broadcast | <500ms | <500ms |
| Uptime | 99.9% | 99.5%+ |
| Memory Usage | <300MB | ~200MB |

See `TESTING_GUIDE.md` for complete benchmarks.

---

## 🚀 Production Deployment

### Heroku (Recommended for MVP)
```bash
heroku create flood-alert-backend
heroku addons:create mongolab:sandbox
heroku addons:create heroku-redis:premium-0
git push heroku main
```

### AWS ECS (Recommended for scale)
```bash
# See DEPLOYMENT_GUIDE.md for detailed steps
# Requires: ECR, ECS, RDS/MongoDB Atlas, ElastiCache/Redis Cloud
```

### Docker Compose (Development/Staging)
```bash
docker-compose up -d
```

---

## 🔐 Security Checklist

- [ ] Environment variables configured (.env file)
- [ ] API key secret set to strong value
- [ ] HTTPS/TLS enabled (production)
- [ ] Rate limiting configured
- [ ] Database encryption enabled
- [ ] Backups configured
- [ ] Monitoring & alerts set up
- [ ] Security audit completed

See `DEPLOYMENT_GUIDE.md` for complete security hardening guide.

---

## 📈 Scaling

### Horizontal Scaling
- Load balancer (AWS ALB / CloudFlare)
- 3-5 backend instances
- Auto-scaling policies

### Database Scaling
- MongoDB Atlas (M20+ tier)
- Sharding by sensor_id
- Read replicas

### Cache Scaling
- Redis cluster mode
- Replication across zones

See `DEPLOYMENT_GUIDE.md` for cost estimates and detailed recommendations.

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check logs
docker-compose logs backend

# Verify MongoDB connection
npm run db:migrate
```

### Slow performance
```bash
# Check indexes
# MongoDB Atlas → Collections → Indexes

# Check connection pool
# Backend logs should show: "Connection pool: 8/10"
```

### High memory usage
```bash
# Enable MongoDB profiling for slow queries
# See DEPLOYMENT_GUIDE.md for commands
```

See `DEPLOYMENT_GUIDE.md` for complete troubleshooting guide.

---

## 📚 Documentation Index

| Document | Purpose | Read Time |
|----------|---------|-----------|
| **IMPLEMENTATION_SUMMARY.md** | Overview & checklist | 10 min |
| **IOT_ARCHITECTURE_DESIGN.md** | Detailed architecture | 30 min |
| **DEPLOYMENT_GUIDE.md** | Production deployment | 1 hour |
| **TESTING_GUIDE.md** | Testing procedures | 1 hour |

---

## 🎯 Implementation Roadmap

### Phase 1: Setup (Week 1)
- [ ] Review architecture
- [ ] Set up backend repository
- [ ] Configure MongoDB Atlas
- [ ] Set up Redis
- [ ] Run local tests

### Phase 2: Ingestion (Week 2)
- [ ] Test data endpoint
- [ ] Verify validation
- [ ] Test rate limiting
- [ ] Check deduplication

### Phase 3: Alerts (Week 3)
- [ ] Test alert generation
- [ ] Verify deduplication
- [ ] Test trend analysis
- [ ] Check thresholds

### Phase 4: Real-time (Week 4)
- [ ] Test WebSocket
- [ ] Frontend integration
- [ ] Load testing
- [ ] Dashboard updates

### Phase 5: Security (Week 5)
- [ ] Security audit
- [ ] Penetration testing
- [ ] Monitoring setup
- [ ] Runbook creation

### Phase 6: Deployment (Week 6)
- [ ] Staging deployment
- [ ] Smoke tests
- [ ] Canary deployment
- [ ] Production rollout

---

## 💡 Key Design Decisions

| Decision | Rationale | Alternative |
|----------|-----------|------------|
| **Separate Backend** | Scales independently, cleaner architecture | Keep in Next.js |
| **MongoDB Time-Series** | Optimized for time-based queries | Traditional collection |
| **Redis for Cache** | Fast deduplication & alert state | MongoDB only |
| **WebSocket for Real-time** | Low-latency (<500ms), persistent connection | Polling (inefficient) |
| **Zod for Validation** | Type-safe schema validation | Manual validation |
| **Express for Backend** | Lightweight, mature, excellent ecosystem | Fastify, Deno |

---

## 🛠️ Technology Stack

- **Backend**: Express.js + TypeScript
- **Database**: MongoDB Atlas (time-series)
- **Cache**: Redis Cloud
- **Real-time**: Socket.io (WebSocket)
- **Validation**: Zod
- **Logging**: Pino (JSON logs)
- **Container**: Docker + Docker Compose
- **Testing**: Jest + K6
- **Deployment**: Heroku / AWS ECS

---

## 📞 Support Resources

### Documentation
- 📄 Full architecture: `IOT_ARCHITECTURE_DESIGN.md`
- 📄 Deployment guide: `DEPLOYMENT_GUIDE.md`
- 📄 Testing guide: `TESTING_GUIDE.md`
- 📄 Summary checklist: `IMPLEMENTATION_SUMMARY.md`

### External Resources
- **MongoDB**: https://www.mongodb.com/docs/
- **Express**: https://expressjs.com/
- **Socket.io**: https://socket.io/docs/
- **Arduino**: https://www.arduino.cc/reference/

---

## ✅ Quick Checklist

Before going to production:

- [ ] Local testing completed (docker-compose)
- [ ] All endpoints tested with cURL
- [ ] Load testing passed (see TESTING_GUIDE.md)
- [ ] Security audit completed
- [ ] Monitoring configured
- [ ] Backup strategy in place
- [ ] Runbooks created
- [ ] Team trained on procedures
- [ ] Canary deployment plan created
- [ ] Rollback procedure documented

---

## 📄 License

This implementation is provided as a reference architecture for your flood alert system project.

---

## 👥 Contributing

When modifying code:
1. Follow TypeScript/Node.js best practices
2. Add tests for new features
3. Update documentation
4. Run linting: `npm run lint`
5. Test locally: `npm test`

---

**Last Updated**: November 22, 2025

**Status**: ✅ All deliverables complete - Ready for implementation

**Next Step**: Read `IMPLEMENTATION_SUMMARY.md` (10 minutes)

