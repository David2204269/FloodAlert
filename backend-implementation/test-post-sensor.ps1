# Script de prueba para el endpoint POST /api/v1/data/sensor
# Uso: .\test-post-sensor.ps1
# Lee automáticamente la API key del archivo .env

param(
    [string]$BaseUrl = "http://localhost:3001",
    [string]$SensorId = "SENSOR_001",
    [string]$GatewayId = "GATEWAY_001"
)

# Cargar variables de entorno desde .env o .env.example
$envFile = Join-Path $PSScriptRoot ".env"
$envExampleFile = Join-Path $PSScriptRoot ".env.example"

# Si .env no existe, intentar usar .env.example
if (-not (Test-Path $envFile)) {
    if (Test-Path $envExampleFile) {
        Write-Host "ℹ️  Archivo .env no encontrado. Usando .env.example" -ForegroundColor Yellow
        $envFile = $envExampleFile
    } else {
        Write-Host "⚠️  Archivos .env y .env.example no encontrados. Usando valores por defecto." -ForegroundColor Yellow
    }
}

if (Test-Path $envFile) {
    Write-Host "📄 Leyendo variables de entorno desde: $envFile" -ForegroundColor Gray
    Get-Content $envFile | ForEach-Object {
        # Ignorar líneas vacías y comentarios
        if ($_ -and $_ -notmatch '^\s*#' -and $_ -match '^\s*([^=]+?)\s*=\s*(.*?)\s*$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            # Remover comillas si las hay
            if ($value.StartsWith('"') -and $value.EndsWith('"')) {
                $value = $value.Trim('"')
            }
            if ($value.StartsWith("'") -and $value.EndsWith("'")) {
                $value = $value.Trim("'")
            }
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
            if ($key -eq "API_KEY_SECRET") {
                Write-Host "   ✓ API_KEY_SECRET encontrada" -ForegroundColor Green
            }
        }
    }
} else {
    Write-Host "⚠️  No se encontró el archivo .env en: $envFile" -ForegroundColor Yellow
}

# Obtener API key del entorno
$ApiKey = $env:API_KEY_SECRET
if (-not $ApiKey -or $ApiKey -eq "") {
    $ApiKey = "sk_flood_alert_2024_secure_key"
    Write-Host "⚠️  API_KEY_SECRET no encontrada en .env. Usando valor por defecto." -ForegroundColor Yellow
    Write-Host "   💡 Asegúrate de que tu archivo .env contenga: API_KEY_SECRET=tu_clave_aqui" -ForegroundColor Gray
} else {
    Write-Host "✅ API Key cargada desde .env" -ForegroundColor Green
}

Write-Host ""
Write-Host "🧪 Probando endpoint POST /api/v1/data/sensor" -ForegroundColor Cyan
if ($ApiKey) {
    $keyPreview = if ($ApiKey.Length -gt 20) { $ApiKey.Substring(0, 20) + "..." } else { $ApiKey }
    Write-Host "   Usando API Key: $keyPreview" -ForegroundColor Gray
}
Write-Host ""

# URL del endpoint
$url = "$BaseUrl/api/v1/data/sensor"

# Headers
$headers = @{
    "Authorization" = "Bearer $ApiKey"
    "Content-Type" = "application/json"
}

# Timestamp actual (en segundos)
$timestamp = [Math]::Floor([decimal](Get-Date -UFormat %s))

# Body con formato TTGO
$body = @{
    sensor_id = $SensorId
    gateway_id = $GatewayId
    timestamp = $timestamp
    temperatura_c = 25.5
    humedad_pct = 65.0
    caudal_l_s = 2.5
    lluvia_mm = 10.2
    nivel_m = 0.45
    rssi = -95
    snr = 7.5
} | ConvertTo-Json

Write-Host "📤 Enviando petición POST a: $url" -ForegroundColor Yellow
Write-Host "📋 Body:" -ForegroundColor Yellow
Write-Host $body -ForegroundColor Gray
Write-Host ""

try {
    # Realizar la petición POST
    $response = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body -ErrorAction Stop
    
    Write-Host "✅ Respuesta exitosa:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10 | Write-Host -ForegroundColor Green
    
    if ($response.ok) {
        Write-Host ""
        Write-Host "🎉 Datos registrados correctamente!" -ForegroundColor Green
        Write-Host "   Reading ID: $($response.reading_id)" -ForegroundColor Cyan
        Write-Host "   Received at: $($response.received_at)" -ForegroundColor Cyan
    }
    
} catch {
    Write-Host "❌ Error al realizar la petición:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host ""
        Write-Host "Detalles del error:" -ForegroundColor Yellow
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "💡 Verifica que:" -ForegroundColor Yellow
    Write-Host "   1. El servidor esté corriendo (npm run dev)" -ForegroundColor Gray
    Write-Host "   2. La API_KEY_SECRET sea correcta" -ForegroundColor Gray
    Write-Host "   3. La URL sea correcta: $BaseUrl" -ForegroundColor Gray
    exit 1
}

Write-Host ""
Write-Host "✨ Prueba completada" -ForegroundColor Cyan
