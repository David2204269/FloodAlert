# 🌊 FloodAlert – Sistema de Alerta Temprana de Inundaciones

FloodAlert es una aplicación web diseñada para visualizar, monitorear y emitir alertas tempranas de inundaciones en tiempo real.  
El proyecto integra un backend con endpoints de datos en **SSE (Server-Sent Events)** y un frontend en **Next.js 14** con arquitectura moderna basada en App Router.

---

## 📁 Estructura del Proyecto

La aplicación está organizada en carpetas funcionales que separan:

- Lógica de UI  
- Hooks del cliente  
- Servicios  
- Endpoints  
- Configuración  
- Assets estáticos  

A continuación se describe cada carpeta y su propósito.

---

## 📂 `app/`
Contiene toda la estructura principal del **Next.js App Router**:

- Páginas (`page.tsx`)
- Layouts globales
- Rutas del servidor
- Endpoints API (`app/api/**`)
- Implementación de **SSE** para enviar datos en tiempo real  
- Rutas de vistas como `/map`, `/dashboard`, etc.

Ejemplos:

- `app/api/stream/route.ts` → endpoint SSE funcional  
- `app/layout.tsx` → layout global  
- `app/page.tsx` → vista principal de la app  

---

## 📂 `components/`
Contiene todos los **componentes reutilizables de la interfaz**, tales como:

- Tarjetas de alerta  
- Indicadores de nivel de agua  
- Encabezados  
- Botones estilizados  
- Vista del mapa  
- Contenedores visuales  

Son componentes desacoplados y fáciles de mantener.

---

## 📂 `hooks/`
Incluye **hooks personalizados** con lógica específica del cliente:

Ejemplos típicos:

- `useFloodStream.ts`  
  - Conecta al backend mediante EventSource  
  - Escucha datos en tiempo real  
  - Maneja reconexión automática  
  - Expone el estado del stream al frontend  

- `useLoadingAnimation.ts`
  - Controla animaciones durante la carga de datos  

Estos hooks permiten que la lógica esté separada de la UI y sea reutilizable.

---

## 📂 `lib/`
Carpeta dedicada a **utilidades, helpers y servicios compartidos**.

Incluye:

- Transformación de datos
- Funciones matemáticas o geoespaciales
- Parseadores de respuestas
- Funciones de formateo de fechas/tiempos
- Tipos reutilizables en toda la aplicación
- Servicios que integran API externa con frontend interno

Este directorio contiene la lógica central que no pertenece ni a UI ni a hooks.

---

## 📂 `public/`
Directorio de archivos estáticos accesibles desde el navegador.

Incluye:

- Imágenes
- Logos
- Íconos del proyecto
- Archivos `.svg`
- Archivos de configuración si fuera una PWA

Todo lo que esté aquí es servido tal cual por el servidor.

---

## 📂 `src/`
Este directorio contiene la **lógica de negocio**:

- `services/` → funciones para llamar APIs reales (hidrología, sensores, etc.)
- `types/` → tipos e interfaces TypeScript para el dominio de inundaciones
- `utils/` → funciones auxiliares, cálculos, validaciones
- Conexión entre backend real y frontend (mapeo de datos)
- Configuraciones internas para manipular los datos de nivel de río

Esta capa es clave para la integración del flujo de datos hidrológicos.

---

## 📂 `styles/`
Almacena los estilos globales del proyecto.

Puede incluir:

- Estilos básicos
- Variables compartidas
- Resets y normalización
- Configuración usada por TailwindCSS

---

# 🚀 Ejecución del Proyecto

---
1. Instalar dependencias:
npm install

2. Ejecutar en modo desarrollo:
npm run dev

3. Abrir en el navegador:
http://localhost:3000

---

# 📄 Archivos raíz importantes

---

## **`package.json`**
Define:

- Dependencias del proyecto  
- Scripts (`dev`, `build`, `start`)  
- Versionado  
- Configuración general  


Ejemplo:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start"
}
