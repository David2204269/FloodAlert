# =========================================
# SCRIPT PARA INSERTAR DATOS EN LA BASE DE DATOS
# MongoDB Atlas + Next.js API
# =========================================

Write-Host "
╔════════════════════════════════════════════════════════════════╗
║          📤 INSERCIÓN DE REGISTRO DE SENSORES                 ║
║         Servidor: http://localhost:3000/api/sensores          ║
╚════════════════════════════════════════════════════════════════╝
" -ForegroundColor Magenta

# Esperar a que el servidor esté listo
Write-Host "`n⏳ Esperando a que el servidor esté listo..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# URL del endpoint
$url = "http://localhost:3000/api/sensores"

# Crear un timestamp en milisegundos (UNIX timestamp)
$timestamp = [long]([datetime]::UtcNow.Subtract([datetime]"1970-01-01")).TotalMilliseconds

# Registro de prueba
$sensorData = @{
    lluvia_ao = 350
    humedad_ao = 720
    nivel_flotador = "alto"
    flujo_lmin = 25.5
    temperatura_c = 27.3
    timestamp = $timestamp
}

# Convertir a JSON
$jsonBody = $sensorData | ConvertTo-Json

Write-Host "`n📋 DATOS A ENVIAR:" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host $jsonBody -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan

Write-Host "`n🔗 URL: $url" -ForegroundColor Yellow
Write-Host "📨 Método: POST" -ForegroundColor Yellow
Write-Host "📝 Content-Type: application/json" -ForegroundColor Yellow

Write-Host "`n⏳ Enviando solicitud..." -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest `
        -Uri $url `
        -Method POST `
        -Headers @{"Content-Type" = "application/json"} `
        -Body $jsonBody `
        -UseBasicParsing `
        -TimeoutSec 30
    
    Write-Host "`n✅ ¡ÉXITO! Registro insertado correctamente" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
    
    Write-Host "📊 Status Code: $($response.StatusCode)" -ForegroundColor Green
    
    # Parsear respuesta
    $responseData = $response.Content | ConvertFrom-Json
    
    Write-Host "`n📥 RESPUESTA DE LA API:" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    
    $responseData | ConvertTo-Json -Depth 10 | Write-Host
    
    Write-Host "`n✨ INFORMACIÓN DEL DOCUMENTO CREADO:" -ForegroundColor Green
    Write-Host "─────────────────────────────────────────────────────────────" -ForegroundColor Green
    Write-Host "   ID MongoDB: $($responseData.data._id)" -ForegroundColor Green
    Write-Host "   Lluvia (a.o): $($responseData.data.lluvia_ao)" -ForegroundColor Green
    Write-Host "   Humedad (a.o): $($responseData.data.humedad_ao)" -ForegroundColor Green
    Write-Host "   Nivel Flotador: $($responseData.data.nivel_flotador)" -ForegroundColor Green
    Write-Host "   Flujo (L/min): $($responseData.data.flujo_lmin)" -ForegroundColor Green
    Write-Host "   Temperatura (°C): $($responseData.data.temperatura_c)" -ForegroundColor Green
    Write-Host "   Timestamp: $($responseData.data.timestamp)" -ForegroundColor Green
    Write-Host "   Creado en: $($responseData.data.createdAt)" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
    
    Write-Host "`n✅ El registro ha sido almacenado exitosamente en MongoDB" -ForegroundColor Green
    Write-Host "   Puedes verificarlo en: MongoDB Atlas > Cluster0 > flood_alert > lecturas" -ForegroundColor Green
    
} catch {
    Write-Host "`n❌ ERROR AL ENVIAR LA SOLICITUD" -ForegroundColor Red
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Red
    Write-Host "Mensaje: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        Write-Host "Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        
        try {
            $errorContent = $_.Exception.Response.Content.ReadAsStream()
            $reader = New-Object System.IO.StreamReader($errorContent)
            $errorMessage = $reader.ReadToEnd()
            Write-Host "`nDetalles del error:" -ForegroundColor Red
            Write-Host $errorMessage -ForegroundColor Red
            $reader.Close()
        } catch {
            # Silent
        }
    }
    
    Write-Host "`n💡 SOLUCIÓN:" -ForegroundColor Yellow
    Write-Host "   1. Asegúrate de que el servidor Next.js esté corriendo:" -ForegroundColor Yellow
    Write-Host "      npm run dev" -ForegroundColor Yellow
    Write-Host "   2. Verifica que MongoDB Atlas esté accesible" -ForegroundColor Yellow
    Write-Host "   3. Comprueba que la conexión a internet sea estable" -ForegroundColor Yellow
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Red
    
    exit 1
}

Write-Host "`n✨ Prueba completada exitosamente" -ForegroundColor Green
