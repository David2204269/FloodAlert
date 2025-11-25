"# Script de Verificacion de Requisitos para TWA" | Out-Null
"# Ejecutar en PowerShell: .\verificar-requisitos.ps1" | Out-Null

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Verificacion de Requisitos TWA" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$allOk = $true

# 1. Verificar Java (JDK)
Write-Host "[1/5] Verificando Java (JDK)..." -ForegroundColor Yellow
try {
    $javaVersion = java -version 2>&1 | Select-String "version" | Select-Object -First 1
    if ($javaVersion) {
        Write-Host "  [OK] Java instalado: $javaVersion" -ForegroundColor Green
    } else {
        Write-Host "  [MISSING] Java no encontrado" -ForegroundColor Red
        Write-Host "    Instala JDK 11+: https://www.oracle.com/java/technologies/downloads/" -ForegroundColor Yellow
        $allOk = $false
    }
} catch {
    Write-Host "  [MISSING] Java no encontrado en PATH" -ForegroundColor Red
    Write-Host "    Instala JDK 11+: https://www.oracle.com/java/technologies/downloads/" -ForegroundColor Yellow
    $allOk = $false
}

# 2. Verificar Node.js
Write-Host "`n[2/5] Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    if ($nodeVersion) {
        Write-Host "  [OK] Node.js instalado: $nodeVersion" -ForegroundColor Green
    } else {
        Write-Host "  [MISSING] Node.js no encontrado" -ForegroundColor Red
        Write-Host "    Instala desde: https://nodejs.org/" -ForegroundColor Yellow
        $allOk = $false
    }
} catch {
    Write-Host "  [MISSING] Node.js no encontrado en PATH" -ForegroundColor Red
    Write-Host "    Instala desde: https://nodejs.org/" -ForegroundColor Yellow
    $allOk = $false
}

# 3. Verificar npm
Write-Host "`n[3/5] Verificando npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    if ($npmVersion) {
        Write-Host "  [OK] npm instalado: v$npmVersion" -ForegroundColor Green
    } else {
        Write-Host "  [MISSING] npm no encontrado" -ForegroundColor Red
        $allOk = $false
    }
} catch {
    Write-Host "  [MISSING] npm no encontrado en PATH" -ForegroundColor Red
    $allOk = $false
}

# 4. Verificar Bubblewrap
Write-Host "`n[4/5] Verificando Bubblewrap CLI..." -ForegroundColor Yellow
try {
    $bubblewrapVersion = bubblewrap --version 2>&1
    if ($bubblewrapVersion) {
        Write-Host "  [OK] Bubblewrap instalado: $bubblewrapVersion" -ForegroundColor Green
    } else {
        Write-Host "  [MISSING] Bubblewrap no encontrado" -ForegroundColor Red
        Write-Host "    Instala con: npm install -g @bubblewrap/cli" -ForegroundColor Yellow
        $allOk = $false
    }
} catch {
    Write-Host "  [MISSING] Bubblewrap no encontrado" -ForegroundColor Red
    Write-Host "    Instala con: npm install -g @bubblewrap/cli" -ForegroundColor Yellow
    $allOk = $false
}

# 5. Verificar Android SDK (mediante variables de entorno o rutas comunes)
Write-Host "`n[5/5] Verificando Android SDK..." -ForegroundColor Yellow
$androidHome = $env:ANDROID_HOME
$sdkPath = $null

if ($androidHome) {
    $sdkPath = $androidHome
} else {
    # Buscar en ubicaciones comunes
    $commonPaths = @(
        "$env:LOCALAPPDATA\Android\Sdk",
        "$env:USERPROFILE\AppData\Local\Android\Sdk",
        "C:\Android\Sdk"
    )

    foreach ($path in $commonPaths) {
        if (Test-Path $path) {
            $sdkPath = $path
            break
        }
    }
}

if ($sdkPath) {
    Write-Host "  [OK] Android SDK encontrado en: $sdkPath" -ForegroundColor Green

    # Verificar platform-tools (adb)
    $adbPath = Join-Path $sdkPath "platform-tools\adb.exe"
    if (Test-Path $adbPath) {
        Write-Host "  [OK] Android Platform Tools (adb) disponible" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] Android Platform Tools no encontrado" -ForegroundColor Yellow
        Write-Host "    Instala desde Android Studio SDK Manager" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [MISSING] Android SDK no encontrado" -ForegroundColor Red
    Write-Host "    Instala Android Studio: https://developer.android.com/studio" -ForegroundColor Yellow
    Write-Host "    Luego configura ANDROID_HOME en variables de entorno" -ForegroundColor Yellow
    $allOk = $false
}

# 6. Verificar Android Studio (opcional pero recomendado)
Write-Host "`n[EXTRA] Verificando Android Studio..." -ForegroundColor Yellow
$studioPaths = @(
    "C:\Program Files\Android\Android Studio\bin\studio64.exe",
    "C:\Program Files (x86)\Android\Android Studio\bin\studio64.exe",
    "$env:LOCALAPPDATA\Programs\Android Studio\bin\studio64.exe"
)

$studioFound = $false
foreach ($path in $studioPaths) {
    if (Test-Path $path) {
        Write-Host "  [OK] Android Studio encontrado en: $path" -ForegroundColor Green
        $studioFound = $true
        break
    }
}

if (-not $studioFound) {
    Write-Host "  [WARN] Android Studio no encontrado en ubicaciones comunes" -ForegroundColor Yellow
    Write-Host "    Recomendado para editar el proyecto TWA" -ForegroundColor Yellow
}

# Resumen final
Write-Host "`n========================================" -ForegroundColor Cyan
if ($allOk) {
    Write-Host "  [OK] TODOS LOS REQUISITOS CUMPLIDOS" -ForegroundColor Green
    Write-Host "  Puedes continuar con la generacion del APK" -ForegroundColor Green
} else {
    Write-Host "  [MISSING] FALTAN ALGUNOS REQUISITOS" -ForegroundColor Red
    Write-Host "  Instala los componentes faltantes antes de continuar" -ForegroundColor Yellow
}
Write-Host "========================================`n" -ForegroundColor Cyan

# Información adicional
Write-Host "Próximos pasos:" -ForegroundColor Cyan
Write-Host "  1. Copiar assetlinks.json a public/.well-known/" -ForegroundColor White
Write-Host "  2. Desplegar en Vercel con: git push origin main" -ForegroundColor White
Write-Host "  3. Inicializar TWA con: bubblewrap init --manifest=twa-manifest.json" -ForegroundColor White
Write-Host "  4. Abrir proyecto en Android Studio desde: wpa/" -ForegroundColor White
Write-Host "  5. Build -> Build APK(s)" -ForegroundColor White
Write-Host "`nConsulta ANDROID_STUDIO_TWA.md para mas detalles`n" -ForegroundColor Cyan
