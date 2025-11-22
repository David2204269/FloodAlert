# Deployment & Implementation Guide

## Quick Start - Local Development

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Git

### Setup (5 minutes)

```bash
# 1. Clone and setup
git clone <your-repo-url>
cd flood-alert-system-6/backend-implementation

# 2. Install dependencies
npm install

# 3. Start services (MongoDB, Redis, Backend)
docker-compose up -d

# 4. Run database migrations
npm run db:migrate

# 5. Start development server
npm run dev

# Server should be running on http://localhost:3001
# Check health: curl http://localhost:3001/api/v1/health
```

### Verify Installation

```bash
# Terminal 1: Start backend
npm run dev
# Output should show: ✓ Connected to MongoDB, ✓ Connected to Redis

# Terminal 2: Test the API
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

# Expected response (201 Created):
# {
#   "ok": true,
#   "received_at": "2025-11-22T10:30:00.000Z",
#   "reading_id": "507f1f77bcf86cd799439011"
# }
```

---

## Production Deployment

### 1. Staging Environment (AWS/Heroku)

#### Option A: Heroku (Simplest)

```bash
# 1. Install Heroku CLI
brew tap heroku/brew && brew install heroku

# 2. Login and create app
heroku login
heroku create flood-alert-backend-staging

# 3. Add MongoDB Atlas addon
heroku addons:create mongolab:sandbox

# 4. Add Redis addon
heroku addons:create heroku-redis:premium-0

# 5. Set environment variables
heroku config:set NODE_ENV=production
heroku config:set API_KEY_SECRET=sk_prod_your_secure_key_here
heroku config:set LOG_LEVEL=info

# 6. Deploy
git push heroku main

# 7. Monitor
heroku logs --tail
```

#### Option B: Docker + AWS ECS

```bash
# 1. Build Docker image
docker build -t flood-alert-backend:latest .
docker tag flood-alert-backend:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/flood-alert-backend:latest

# 2. Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/flood-alert-backend:latest

# 3. Create ECS task definition (via AWS Console or CLI)
# 4. Create ECS service with load balancer
# 5. Configure RDS (Aurora) for MongoDB or use MongoDB Atlas
# 6. Configure ElastiCache for Redis
```

### 2. Database Setup (MongoDB Atlas)

```bash
# 1. Create cluster at https://cloud.mongodb.com
# 2. Create database user
#    - User: flood_alert_user
#    - Password: (strong generated password)

# 3. Get connection string:
# mongodb+srv://flood_alert_user:PASSWORD@cluster.mongodb.net/flood_alert?retryWrites=true&w=majority

# 4. Update .env:
export MONGODB_URI="mongodb+srv://flood_alert_user:PASSWORD@cluster.mongodb.net/flood_alert"

# 5. Run migrations
npm run db:migrate

# 6. Verify indexes were created in MongoDB Atlas console
```

### 3. Redis Setup (Redis Cloud / AWS ElastiCache)

```bash
# Option A: Redis Cloud (Managed)
# 1. Sign up at https://redis.com/cloud
# 2. Create free database
# 3. Get connection URL
# 4. Update .env:
export REDIS_URL="redis://:password@host:port"

# Option B: AWS ElastiCache
# 1. Create Redis cluster in AWS Console
# 2. Configure security groups to allow backend access
# 3. Get endpoint URL
# 4. Update .env with endpoint
```

### 4. Environment Variables (Production)

```bash
# .env.production
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/flood_alert
REDIS_URL=redis://default:password@redis-cloud:port
API_KEY_SECRET=sk_prod_min_32_character_key_required_12345
ADMIN_KEY=admin_prod_super_secret_key
CORS_ORIGINS=https://yourapp.com,https://www.yourapp.com
LOG_LEVEL=info
ENABLE_WEBHOOKS=true
WEBHOOK_SECRET=webhook_signing_secret
```

### 5. CI/CD Setup (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker image
        run: docker build -t flood-alert-backend:${{ github.sha }} .
      
      - name: Push to ECR
        run: |
          aws ecr get-login-password | docker login --username AWS --password-stdin ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.us-east-1.amazonaws.com
          docker push ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.us-east-1.amazonaws.com/flood-alert-backend:${{ github.sha }}
      
      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster production \
            --service flood-alert-backend \
            --force-new-deployment
      
      - name: Notify Slack
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Deployment ${{ job.status }}'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

---

## Monitoring & Alerts

### 1. Application Monitoring (DataDog / NewRelic)

```bash
# Install monitoring agent
npm install @datadog/browser-rum

# Configure in index.ts
import { datadogRum } from '@datadog/browser-rum';

datadogRum.init({
  applicationId: 'YOUR_APP_ID',
  clientToken: 'YOUR_CLIENT_TOKEN',
  site: 'datadoghq.com',
  service: 'flood-alert-backend',
  env: 'production',
  sessionSampleRate: 100,
  trackUserInteractions: true,
  defaultPrivacyLevel: 'mask-user-input'
});
```

### 2. Database Monitoring

```javascript
// MongoDB Atlas monitoring
// Dashboard → Alerts → Create Alert
// Conditions:
// - Replication lag > 5 seconds
// - Connection pool > 80%
// - Memory usage > 80%
// - CPU usage > 70%

// Redis monitoring
// Via Redis Cloud console:
// - Memory usage > 80%
// - Eviction rate > 0
// - Latency > 10ms
```

### 3. Uptime Monitoring

```bash
# Using Uptime Robot or similar
# Monitor endpoints:
GET /api/v1/health              → Should return 200
GET /api/v1/health/ready        → Should return 200
GET /api/v1/config/sensors      → Should return 200
```

---

## Security Hardening Checklist

- [ ] Enable HTTPS/TLS (use Let's Encrypt)
- [ ] Set up API key rotation (30-day cycle)
- [ ] Enable database encryption at rest
- [ ] Configure VPC with security groups
- [ ] Set up WAF (AWS WAF / CloudFlare)
- [ ] Enable request signing (HMAC)
- [ ] Configure DDoS protection
- [ ] Set up audit logging
- [ ] Regular security scans (SNYK / Trivy)
- [ ] Backup strategy (daily automated backups)

---

## Troubleshooting

### Backend won't start
```bash
# Check logs
docker-compose logs backend

# Verify MongoDB connection
npm run db:migrate

# Check if port 3001 is available
lsof -i :3001
```

### High memory usage
```bash
# Check MongoDB index performance
db.sensor_readings.stats()

# Implement data archival
db.sensor_readings.deleteMany({
  timestamp: { $lt: new Date(Date.now() - 90*24*60*60*1000) }
})
```

### Slow queries
```bash
# Enable MongoDB profiling
db.setProfilingLevel(1, { slowms: 100 })
db.system.profile.find().limit(5).pretty()
```

---

## Disaster Recovery Plan

### Backup Strategy
```bash
# Daily automated backups (MongoDB Atlas handles this)
# Keep 30 days of daily backups
# Weekly snapshots for 3 months
# Monthly snapshots for 1 year
```

### Recovery Procedure
1. Verify backup integrity
2. Restore to staging first
3. Test all endpoints
4. Verify data completeness
5. Switch DNS to restored environment
6. Monitor for 24 hours

---

## Scaling Recommendations

### Horizontal Scaling
```bash
# Use load balancer (AWS ALB / CloudFlare)
# Run 3-5 backend instances
# Auto-scaling based on:
# - CPU > 70%
# - Memory > 80%
# - Requests > 1000/sec
```

### Database Scaling
```bash
# MongoDB Atlas:
# - Cluster tier: M20+ for production
# - Sharding by sensor_id for >100GB data
# - Read replicas for high traffic

# Redis:
# - Cluster mode for redundancy
# - Replication across zones
```

### Cost Optimization
```
Backend:     $40-100/month  (m5.large EC2 or Heroku)
MongoDB:     $50-200/month  (M10-M20 Atlas)
Redis:       $10-30/month   (Redis Cloud)
CDN/WAF:     $20-100/month  (CloudFlare)
Total:       $120-430/month
```

---

## Performance Benchmarks

### Expected Performance
- Request latency: <100ms (p99)
- Data ingestion throughput: 1000 requests/sec
- Alert generation: <1sec after reading received
- WebSocket broadcast: <500ms to all clients
- Database query: <50ms (indexed)

### Load Testing Script
```bash
# Using Apache Bench
ab -n 10000 -c 100 -H "Authorization: Bearer sk_test_key" \
   -p payload.json http://localhost:3001/api/v1/data/ingest

# Using K6
k6 run load-test.js
```

---

## Runbook for Common Issues

### Issue: Duplicate Readings in Database
**Symptoms**: Same sensor reading appears multiple times
**Root Cause**: Gateway retried without idempotency key
**Solution**:
```bash
# Check for duplicates
db.sensor_readings.aggregate([
  { $group: { _id: "$metadata.sensor_id", count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
])

# Remove duplicates (keep latest)
db.sensor_readings.deleteMany({
  _id: { $in: [duplicate_ids] }
})
```

### Issue: Alerts Not Being Generated
**Symptoms**: Readings are ingested but no alerts created
**Root Cause**: Sensor configuration missing or deduplication blocking
**Solution**:
```bash
# Verify sensor config exists
db.sensors.findOne({ sensor_id: "SENSOR_001" })

# Check alert dedup cache
redis-cli keys "alert:*" | head -20

# Manually clear dedup cache if needed
redis-cli DEL "alert:WATER_LEVEL_CRITICAL:SENSOR_001"
```

### Issue: High MongoDB Write Latency
**Symptoms**: Slow data ingestion, timeout errors
**Root Cause**: Write concern too strict, replication issues
**Solution**:
```bash
# Check replication status
db.adminCommand({ replSetStatus: 1 })

# Adjust write concern (if needed)
db.sensor_readings.updateOne({}, {}, { writeConcern: { w: 1, j: false } })

# Check indexes
db.sensor_readings.getIndexes()
```

---

## Next Steps

1. **Set up CI/CD**: Connect GitHub → Auto-deploy on push
2. **Configure Monitoring**: Set up alerts for errors & latency
3. **Load Test**: Run performance tests with 1000 concurrent devices
4. **Security Audit**: Penetration testing before production
5. **Documentation**: Keep deployment docs updated

