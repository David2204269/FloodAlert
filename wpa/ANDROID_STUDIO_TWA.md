# Guía: Convertir PWA a APK con Android Studio y TWA

## 📋 Resumen

Esta guía te llevará paso a paso para convertir la PWA de Rivex FloodAlert en una aplicación Android instalable (.apk) usando **Trusted Web Activity (TWA)** y **Android Studio**.

**Package Name:** `com.rivex.floodalert`  
**PWA URL:** https://floodalert-gtm2d48uh-truis117s-projects.vercel.app/  
**Tipo de Build:** Debug (sin firma digital para producción)

---

## ✅ Requisitos Previos

Asegúrate de tener instalado:

1. **JDK 11 o superior**
   ```powershell
   java -version
   ```

2. **Node.js y npm**
   ```powershell
   node --version
   npm --version
   ```

3. **Android Studio** (última versión)
   - Descarga desde: https://developer.android.com/studio

4. **Android SDK (a través de Android Studio)**
   - SDK Platform 33 (Android 13) o superior
   - Android SDK Build-Tools
   - Android SDK Platform-Tools
   - Android SDK Command-line Tools

5. **Bubblewrap CLI** (herramienta para generar proyectos TWA)
   ```powershell
   npm install -g @bubblewrap/cli
   bubblewrap --version
   ```

---

## 🚀 Paso 1: Verificar Requisitos

Ejecuta el script de verificación incluido:

```powershell
cd C:\Users\Truis\Desktop\FloodAlert\wpa
.\verificar-requisitos.ps1
```

Si falta algo, instálalo antes de continuar.

---

## 📦 Paso 2: Desplegar assetlinks.json en Vercel

Para que Android verifique tu PWA, debes publicar el archivo `assetlinks.json` en tu dominio.

### 2.1 Copiar assetlinks.json a public

```powershell
cd C:\Users\Truis\Desktop\FloodAlert

# Crear directorio .well-known si no existe
New-Item -ItemType Directory -Force -Path "public\.well-known"

# Copiar assetlinks.json
Copy-Item "wpa\assetlinks.json" "public\.well-known\assetlinks.json"
```

### 2.2 Verificar next.config.mjs

Asegúrate de que `next.config.mjs` tenga configurado el header para servir el archivo:

```javascript
async headers() {
  return [
    {
      source: '/.well-known/assetlinks.json',
      headers: [
        {
          key: 'Content-Type',
          value: 'application/json',
        },
      ],
    },
  ];
}
```

### 2.3 Desplegar en Vercel

```powershell
git add public\.well-known\assetlinks.json
git commit -m "Add assetlinks.json for TWA verification"
git push origin main
```

Espera a que Vercel complete el deployment (1-2 minutos).

### 2.4 Verificar que esté accesible

```powershell
Invoke-WebRequest -Uri "https://floodalert-gtm2d48uh-truis117s-projects.vercel.app/.well-known/assetlinks.json"
```

Deberías ver el contenido JSON del archivo.

---

## 🔧 Paso 3: Inicializar Proyecto TWA con Bubblewrap

```powershell
cd C:\Users\Truis\Desktop\FloodAlert\wpa

# Inicializar proyecto TWA usando el manifest existente
bubblewrap init --manifest=twa-manifest.json
```

Bubblewrap creará una carpeta con el proyecto Android completo. Esto puede tardar 1-2 minutos.

**Salida esperada:**
```
✔ Generating Android Project
✔ Done!
```

Estructura generada:
```
wpa/
├── app/
├── gradle/
├── build.gradle
├── gradlew
├── gradlew.bat
├── settings.gradle
└── twa-manifest.json
```

---

## 🏗️ Paso 4: Abrir Proyecto en Android Studio

### 4.1 Abrir Android Studio

1. Abre **Android Studio**
2. Click en **File → Open**
3. Navega a: `C:\Users\Truis\Desktop\FloodAlert\wpa`
4. Selecciona la carpeta `wpa` y click **OK**

### 4.2 Sincronizar Gradle (primera vez)

Android Studio detectará el proyecto Gradle y mostrará:

```
Gradle sync in progress...
```

Esto puede tardar 3-5 minutos la primera vez mientras descarga dependencias.

**Si aparecen errores:**
- Click en **File → Sync Project with Gradle Files**
- Si falta el SDK, Android Studio te ofrecerá instalarlo automáticamente

### 4.3 Verificar configuración del proyecto

Abre `app/build.gradle` y verifica:

```gradle
android {
    namespace = "com.rivex.floodalert"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.rivex.floodalert"
        minSdk = 23
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"
    }
}
```

---

## 📱 Paso 5: Generar APK Debug

### Opción A: Desde Android Studio (Recomendado)

1. En Android Studio, selecciona **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. Espera a que termine la compilación (2-5 minutos)
3. Cuando termine, aparecerá una notificación: **APK(s) generated successfully**
4. Click en **locate** para abrir la carpeta del APK

**Ubicación del APK:**
```
C:\Users\Truis\Desktop\FloodAlert\wpa\app\build\outputs\apk\debug\app-debug.apk
```

### Opción B: Desde Terminal (PowerShell)

```powershell
cd C:\Users\Truis\Desktop\FloodAlert\wpa

# Windows
.\gradlew.bat assembleDebug

# El APK estará en:
# app\build\outputs\apk\debug\app-debug.apk
```

---

## 📲 Paso 6: Instalar APK en Dispositivo Android

### 6.1 Habilitar Depuración USB en tu dispositivo

1. Ve a **Ajustes → Información del teléfono**
2. Toca 7 veces en **Número de compilación**
3. Vuelve a Ajustes y entra en **Opciones de desarrollador**
4. Activa **Depuración USB**

### 6.2 Conectar dispositivo y verificar

```powershell
# Asegúrate de tener Android SDK Platform-Tools en el PATH
# O navega a: C:\Users\TU_USUARIO\AppData\Local\Android\Sdk\platform-tools

adb devices
```

Deberías ver tu dispositivo listado:
```
List of devices attached
ABC123XYZ       device
```

### 6.3 Instalar APK

```powershell
cd C:\Users\Truis\Desktop\FloodAlert\wpa

adb install app\build\outputs\apk\debug\app-debug.apk
```

**Salida esperada:**
```
Performing Streamed Install
Success
```

### 6.4 Ejecutar la app

Busca el ícono **Rivex** en el launcher de tu dispositivo y ábrelo.

---

## 🔍 Troubleshooting Común

### Error: "Digital Asset Links verification failed"

**Causa:** El archivo `assetlinks.json` no está accesible públicamente o el SHA-256 no coincide.

**Solución:**
```powershell
# Verifica que el archivo esté público:
Invoke-WebRequest -Uri "https://floodalert-gtm2d48uh-truis117s-projects.vercel.app/.well-known/assetlinks.json"

# Para APK debug, el SHA-256 debe ser el predeterminado de Android:
# FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C
```

### Error: "SDK location not found"

**Causa:** Android Studio no encuentra el SDK.

**Solución:**
```powershell
# Crea local.properties en la carpeta wpa:
echo "sdk.dir=C:\\Users\\Truis\\AppData\\Local\\Android\\Sdk" > local.properties

# Ajusta la ruta según tu instalación de Android Studio
```

### Error: "Gradle sync failed"

**Causa:** Problemas de red o caché corrupto.

**Solución:**
```powershell
cd C:\Users\Truis\Desktop\FloodAlert\wpa

# Limpiar caché
.\gradlew.bat clean

# Intentar de nuevo
.\gradlew.bat assembleDebug --refresh-dependencies
```

### Error: "INSTALL_FAILED_UPDATE_INCOMPATIBLE"

**Causa:** Ya existe una versión de la app con firma diferente.

**Solución:**
```powershell
# Desinstalar versión anterior
adb uninstall com.rivex.floodalert

# Instalar de nuevo
adb install app\build\outputs\apk\debug\app-debug.apk
```

### La app abre el navegador en lugar de fullscreen

**Causa:** La verificación de Digital Asset Links falló.

**Solución:**
1. Asegúrate de que `assetlinks.json` esté desplegado correctamente
2. Espera 5-10 minutos para que los servidores de Google actualicen el caché
3. Desinstala y reinstala la app
4. En algunos casos, reinicia el dispositivo

---

## 🎨 Personalización Adicional

### Cambiar ícono de la app

1. Reemplaza los archivos en: `wpa/app/src/main/res/`
   - `mipmap-mdpi/ic_launcher.png` (48x48)
   - `mipmap-hdpi/ic_launcher.png` (72x72)
   - `mipmap-xhdpi/ic_launcher.png` (96x96)
   - `mipmap-xxhdpi/ic_launcher.png` (144x144)
   - `mipmap-xxxhdpi/ic_launcher.png` (192x192)

2. Puedes usar herramientas online para generar iconos Android:
   - https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html

### Cambiar colores del splash screen

Edita `wpa/app/src/main/res/values/colors.xml`:

```xml
<resources>
    <color name="colorPrimary">#1E293B</color>
    <color name="colorPrimaryDark">#0F172A</color>
    <color name="colorAccent">#3B82F6</color>
    <color name="backgroundColor">#0F172A</color>
</resources>
```

Reconstruye el APK después de los cambios:
```powershell
.\gradlew.bat assembleDebug
```

---

## 📊 Verificar Funcionalidades

Una vez instalada la app, verifica que funcione correctamente:

- ✅ **Notificaciones Push**: Otorga permisos cuando se soliciten
- ✅ **Geolocalización**: Para mostrar los sensores en el mapa
- ✅ **Conexión en tiempo real**: Los datos se actualizan cada 10 segundos
- ✅ **Gráficas interactivas**: Navega por las pestañas (Mapa, Gráficas, Segmentación)
- ✅ **Modo fullscreen**: La app no debe abrir Chrome, sino ejecutarse como nativa

---

## 📝 Notas Importantes

1. **APK Debug vs Release:**
   - Este APK es para **desarrollo y pruebas**
   - No está optimizado ni firmado para producción
   - No se puede publicar en Google Play Store
   - Usa el SHA-256 debug predeterminado de Android

2. **Actualizaciones de la PWA:**
   - Cuando actualices tu PWA en Vercel, los cambios se reflejarán automáticamente en la app
   - **No necesitas recompilar el APK** a menos que cambies:
     - Íconos de la app
     - Colores del tema
     - Nombre de la aplicación
     - Versión (versionCode/versionName)

3. **Dominio y assetlinks.json:**
   - Si cambias el dominio de Vercel, debes actualizar:
     - `twa-manifest.json` → campo `host`
     - `assetlinks.json` → desplegarlo en el nuevo dominio
     - Recompilar el APK

4. **Firma para producción (futuro):**
   - Si eventualmente quieres publicar en Google Play, necesitarás:
     - Generar un keystore de release con `keytool`
     - Extraer el SHA-256 fingerprint del keystore
     - Actualizar `assetlinks.json` con el nuevo fingerprint
     - Construir un APK/AAB firmado con `assembleRelease` o `bundleRelease`

---

## 🚀 Comandos Rápidos de Referencia

```powershell
# Verificar requisitos
cd wpa; .\verificar-requisitos.ps1

# Inicializar proyecto TWA
cd wpa; bubblewrap init --manifest=twa-manifest.json

# Construir APK debug
cd wpa; .\gradlew.bat assembleDebug

# Instalar en dispositivo
adb install wpa\app\build\outputs\apk\debug\app-debug.apk

# Ver logs de la app
adb logcat | Select-String "chromium"

# Desinstalar app
adb uninstall com.rivex.floodalert

# Limpiar y reconstruir
cd wpa; .\gradlew.bat clean assembleDebug
```

---

## 📚 Recursos Adicionales

- [Trusted Web Activity Documentation](https://developer.chrome.com/docs/android/trusted-web-activity/)
- [Bubblewrap GitHub](https://github.com/GoogleChromeLabs/bubblewrap)
- [Digital Asset Links](https://developers.google.com/digital-asset-links)
- [Android Studio User Guide](https://developer.android.com/studio/intro)

---

## ✅ Checklist Final

Antes de dar por terminado el proceso, verifica:

- [ ] JDK, Node.js, Android Studio, Android SDK instalados
- [ ] Bubblewrap CLI instalado globalmente
- [ ] `assetlinks.json` desplegado en Vercel y accesible públicamente
- [ ] Proyecto TWA inicializado con Bubblewrap
- [ ] Proyecto abierto en Android Studio sin errores de Gradle
- [ ] APK debug generado exitosamente
- [ ] APK instalado en dispositivo Android
- [ ] App funciona en modo fullscreen (no abre navegador)
- [ ] Todas las funcionalidades probadas (mapa, gráficas, notificaciones)

---

**¡Listo!** Ahora tienes una aplicación Android instalable que ejecuta tu PWA de forma nativa. Si tienes problemas, consulta la sección de Troubleshooting o revisa los logs de Android Studio.
