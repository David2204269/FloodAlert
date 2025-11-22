# Script de prueba simplificado para el endpoint POST /api/v1/data/sensor
param(
    [string]$BaseUrl = "http://localhost:3001",
    [string]$SensorId = "SENSOR_001",
    [string]$GatewayId = "GATEWAY_001"
)

# Cargar .env
$envFile = Join-Path $PSScriptRoot ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^=]+?)\s*=\s*(.*?)\s*$' -and $_ -notmatch '^\s*#') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

$ApiKey = $env:API_KEY_SECRET
if (-not $ApiKey) {
    $ApiKey = "sk_flood_alert_2024_secure_key"
}

Write-Host "Probando endpoint POST /api/v1/data/sensor" -ForegroundColor Cyan
Write-Host "API Key: $($ApiKey.Substring(0, [Math]::Min(20, $ApiKey.Length)))..." -ForegroundColor Gray

$url = "$BaseUrl/api/v1/data/sensor"
$headers = @{
    "Authorization" = "Bearer $ApiKey"
    "Content-Type" = "application/json"
}

$timestamp = [Math]::Floor([decimal](Get-Date -UFormat %s))
$body = @{
    sensor_id = $SensorId
    gateway_id = $GatewayId
    timestamp = $timestamp
    temperatura_c = 25.5
    humedad_pct = 65.0
    caudal_l_s = 2.5
    lluvia_mm = 10.2
    nivel_m = 0.45
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body -ErrorAction Stop
    Write-Host "Respuesta exitosa:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
    if ($response.ok) {
        Write-Host "Datos registrados! Reading ID: $($response.reading_id)" -ForegroundColor Green
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
}

