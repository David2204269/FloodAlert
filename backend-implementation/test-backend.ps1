#!/usr/bin/env pwsh

# Script de Pruebas para Backend de Flood Alert System
# Uso: .\test-backend.ps1

$serverUrl = "http://localhost:3001"
$apiKey = "sk_dev_replace_with_secure_key"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Flood Alert System - Backend Tests" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Test 1: Verificar que el servidor esté corriendo
Write-Host "`n[1] Verificando conexión al servidor..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$serverUrl/api/v1/health" -Method GET -ErrorAction SilentlyContinue
    Write-Host "✓ Servidor running en $serverUrl" -ForegroundColor Green
} catch {
    Write-Host "✗ No se puede conectar a $serverUrl" -ForegroundColor Red
    Write-Host "  Por favor, inicia el backend con: npm run dev" -ForegroundColor Magenta
    exit 1
}

# Test 2: Registrar Gateway
Write-Host "`n[2] Registrando Gateway..." -ForegroundColor Yellow
$gatewayPayload = @{
    gateway_id = "GATEWAY_001"
    name = "Gateway Buenos Aires"
    location = @{
        lat = -34.6037
        lng = -58.3816
    }
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$serverUrl/api/v1/data/gateway/register" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $apiKey"
            "Content-Type" = "application/json"
        } `
        -Body $gatewayPayload `
        -ErrorAction SilentlyContinue
    
    if ($response.StatusCode -eq 201) {
        Write-Host "✓ Gateway registrado exitosamente" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠ Error al registrar gateway (puede ya existir)" -ForegroundColor Yellow
}

# Test 3: Enviar lectura de sensor WiFi HTTP
Write-Host "`n[3] Enviando lectura de sensor WiFi..." -ForegroundColor Yellow
$timestamp = [Math]::Floor([DateTime]::UtcNow.Subtract([DateTime]::UnixEpoch).TotalMilliseconds)

$sensorPayload = @{
    sensor_id = "SENSOR_001"
    gateway_id = "GATEWAY_001"
    timestamp = $timestamp
    water_level_cm = 45.5
    rain_accumulated_mm = 10.2
    flow_rate_lmin = 250
    temperature_c = 25.5
    humidity_percent = 65
    battery_percent = 85
    rssi = -95
    snr = 7.5
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$serverUrl/api/v1/data/sensor" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $apiKey"
            "Content-Type" = "application/json"
            "X-Idempotency-Key" = "test-$(Get-Random)"
        } `
        -Body $sensorPayload `
        -ErrorAction SilentlyContinue
    
    $responseData = $response.Content | ConvertFrom-Json
    if ($response.StatusCode -eq 201) {
        Write-Host "✓ Lectura enviada exitosamente" -ForegroundColor Green
        Write-Host "  Reading ID: $($responseData.reading_id)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "✗ Error enviando lectura:" -ForegroundColor Red
    Write-Host "  $_" -ForegroundColor Red
}

# Test 4: Obtener estado actual del sensor
Write-Host "`n[4] Obteniendo estado actual del sensor..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$serverUrl/api/v1/data/status/SENSOR_001" `
        -Method GET `
        -ErrorAction SilentlyContinue
    
    $responseData = $response.Content | ConvertFrom-Json
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ Estado del sensor obtenido" -ForegroundColor Green
        Write-Host "  Nivel de agua: $($responseData.data.water_level_cm) cm" -ForegroundColor Cyan
        Write-Host "  Temperatura: $($responseData.data.temperature_c) °C" -ForegroundColor Cyan
        Write-Host "  Humedad: $($responseData.data.humidity_percent) %" -ForegroundColor Cyan
    }
} catch {
    Write-Host "⚠ No hay datos disponibles para el sensor" -ForegroundColor Yellow
}

# Test 5: Obtener histórico de 24 horas
Write-Host "`n[5] Obteniendo histórico (últimas 24 horas)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$serverUrl/api/v1/data/history/SENSOR_001?hours=24&limit=10" `
        -Method GET `
        -ErrorAction SilentlyContinue
    
    $responseData = $response.Content | ConvertFrom-Json
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ Histórico obtenido" -ForegroundColor Green
        Write-Host "  Total de registros: $($responseData.count)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "⚠ No hay datos históricos disponibles" -ForegroundColor Yellow
}

# Test 6: Obtener gateways activos
Write-Host "`n[6] Listando gateways activos..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$serverUrl/api/v1/data/gateways" `
        -Method GET `
        -ErrorAction SilentlyContinue
    
    $responseData = $response.Content | ConvertFrom-Json
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ Gateways listados" -ForegroundColor Green
        Write-Host "  Total de gateways: $($responseData.count)" -ForegroundColor Cyan
        foreach ($gateway in $responseData.gateways) {
            Write-Host "  - $($gateway.gateway_id): $($gateway.status)" -ForegroundColor Cyan
        }
    }
} catch {
    Write-Host "⚠ Error listando gateways" -ForegroundColor Yellow
}

# Test 7: Obtener estadísticas de sensor
Write-Host "`n[7] Obteniendo estadísticas del sensor..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$serverUrl/api/v1/data/stats/SENSOR_001?hours=24" `
        -Method GET `
        -ErrorAction SilentlyContinue
    
    $responseData = $response.Content | ConvertFrom-Json
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ Estadísticas obtenidas" -ForegroundColor Green
        Write-Host "  Promedio nivel: $($responseData.stats.avg_water_level) cm" -ForegroundColor Cyan
        Write-Host "  Máximo nivel: $($responseData.stats.max_water_level) cm" -ForegroundColor Cyan
        Write-Host "  Total de lluvia: $($responseData.stats.total_rain) mm" -ForegroundColor Cyan
    }
} catch {
    Write-Host "⚠ No hay estadísticas disponibles" -ForegroundColor Yellow
}

# Test 8: Simular múltiples lecturas para prueba de carga
Write-Host "`n[8] Prueba de carga: enviando 5 lecturas..." -ForegroundColor Yellow
for ($i = 1; $i -le 5; $i++) {
    $timestamp = [Math]::Floor([DateTime]::UtcNow.Subtract([DateTime]::UnixEpoch).TotalMilliseconds)
    $waterLevel = 40 + (Get-Random -Minimum 0 -Maximum 20)
    
    $payload = @{
        sensor_id = "SENSOR_001"
        gateway_id = "GATEWAY_001"
        timestamp = $timestamp
        water_level_cm = $waterLevel
        rain_accumulated_mm = [Math]::Round([System.Random]::new().NextDouble() * 50, 2)
        flow_rate_lmin = Get-Random -Minimum 100 -Maximum 500
        temperature_c = 20 + [Math]::Round([System.Random]::new().NextDouble() * 10, 1)
        humidity_percent = Get-Random -Minimum 50 -Maximum 90
        battery_percent = Get-Random -Minimum 70 -Maximum 100
        rssi = Get-Random -Minimum -120 -Maximum -80
    } | ConvertTo-Json
    
    try {
        $response = Invoke-WebRequest -Uri "$serverUrl/api/v1/data/sensor" `
            -Method POST `
            -Headers @{
                "Authorization" = "Bearer $apiKey"
                "Content-Type" = "application/json"
                "X-Idempotency-Key" = "load-test-$i-$(Get-Random)"
            } `
            -Body $payload `
            -ErrorAction SilentlyContinue
        
        if ($response.StatusCode -eq 201) {
            Write-Host "  ✓ Lectura $i enviada (nivel: $waterLevel cm)" -ForegroundColor Green
        }
    } catch {
        Write-Host "  ✗ Error en lectura $i" -ForegroundColor Red
    }
    
    Start-Sleep -Milliseconds 100
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Pruebas completadas" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nPróximos pasos:" -ForegroundColor Yellow
Write-Host "1. Verificar conexión a MongoDB Atlas en .env" -ForegroundColor Cyan
Write-Host "2. Revisar logs del backend para errores" -ForegroundColor Cyan
Write-Host "3. Probar frontend en http://localhost:3000" -ForegroundColor Cyan
Write-Host "4. Verificar WebSocket en tiempo real" -ForegroundColor Cyan
