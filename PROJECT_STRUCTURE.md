# 📁 Estructura del Proyecto - Flood Alert System

## Directorio Limpio para Producción

```
flood-alert-system-6/
├── .env                          # Variables globales
├── .env.local                    # Variables locales (MONGODB_URI)
├── .gitignore                    # Archivos a ignorar en Git
├── .git/                         # Repositorio Git
├── .next/                        # Build de Next.js
├── node_modules/                # Dependencias
├── 
├── 📦 Archivos de Configuración
├── package.json                  # Dependencias del proyecto
├── package-lock.json             # Lock de versiones
├── tsconfig.json                 # Configuración TypeScript
├── next.config.mjs               # Configuración Next.js
├── postcss.config.mjs            # Configuración PostCSS
├── components.json               # Shadcn/ui config
├── next-env.d.ts                 # Types para Next.js
├── 
├── 📁 Carpetas Principales
├── app/                          # App Router de Next.js
│   ├── api/                      # Rutas API
│   │   ├── sensores/
│   │   │   ├── route.ts          # GET, POST, DELETE /api/sensores
│   │   │   └── [id]/
│   │   │       └── route.ts      # GET, DELETE /api/sensores/:id
│   │   └── alerts-stream/
│   │       └── route.ts          # WebSocket para alertas
│   ├── layout.tsx                # Layout raíz
│   ├── page.tsx                  # Página principal
│   ├── globals.css               # CSS global
│   └── segmentation/
│       └── page.tsx              # Página de segmentación
├── 
├── components/                   # Componentes React
│   ├── ui/                       # Componentes Shadcn/ui
│   ├── flood-dashboard.tsx       # Dashboard principal
│   ├── flood-map.tsx             # Mapa de inundación
│   ├── sensor-chart.tsx          # Gráficos de sensores
│   ├── alert-panel.tsx           # Panel de alertas
│   ├── notification-*.tsx        # Sistema de notificaciones
│   └── ...
├── 
├── hooks/                        # React Hooks personalizados
│   ├── use-notifications.ts      # Hook para notificaciones
│   ├── use-toast.ts              # Hook para toasts
│   └── use-mobile.ts             # Hook para responsive
├── 
├── lib/                          # Utilidades y librerías
│   ├── mongodb.ts                # Conexión a MongoDB
│   ├── notification-service.ts   # Servicio de notificaciones
│   ├── register-service-worker.ts
│   └── utils.ts                  # Utilidades generales
├── 
├── src/                          # Código fuente adicional
│   ├── lib/
│   │   └── mongodb.ts            # Conexión MongoDB (alternativo)
│   ├── models/
│   │   └── Lectura.ts            # Modelo de datos
│   └── utils/
│       └── validateSensorData.ts # Validación de datos
├── 
├── styles/                       # Estilos CSS
│   └── globals.css
├── 
├── public/                       # Archivos estáticos
│   ├── service-worker.js         # Service Worker para PWA
│   └── images/
└── 
```

## 🗑️ Archivos Eliminados

✅ Todos los archivos de test (test-*.*)
✅ Documentación de pruebas (POSTMAN_*, TESTING_GUIDE, etc.)
✅ Ejemplos de configuración (CONFIG_API.ts, TTGO_CLIENT_EXAMPLES.ts)
✅ Documentos de implementación innecesarios

## 📦 Estructura Limpia para Deploy

El proyecto está listo para:
- ✅ Deploy en Vercel
- ✅ Producción en servidor
- ✅ Integración con MongoDB
- ✅ PWA con Service Worker
- ✅ Notificaciones en tiempo real

## 🚀 Próximo Paso: Deploy en Vercel

```bash
git add .
git commit -m "Clean up test files and prepare for production"
git push origin main
```
