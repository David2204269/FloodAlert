"use client"

import { useEffect, useRef, useState, memo } from "react"

interface Sensor {
  id: string
  name: string
  location: { lat: number; lng: number }
  waterLevel: number
  flowRate: number
  soilMoisture: number
  temperature: number
  precipitation: number
  riskLevel: "normal" | "alert" | "danger"
}

interface FloodMapProps {
  sensors: Sensor[]
  selectedSensor: string | null
  onSensorSelect: (sensorId: string) => void
}

export const FloodMap = memo(function FloodMap({ sensors, selectedSensor, onSensorSelect }: FloodMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isScriptLoaded, setIsScriptLoaded] = useState(false)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<Map<string, { marker: any; infoWindow: any }>>(new Map())
  const initializedRef = useRef(false)

  // Cargar el script de Google Maps (solo una vez)
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "AIzaSyAGBwVw8JH6eg585Q1Ig-_93dK0SGdcrDU";

    console.log("[v0] Google Maps API Key exists:", !!apiKey)
    console.log("[v0] API Key length:", apiKey?.length || 0)

    if (!apiKey) {
      console.log("[v0] ERROR: No API key found")
      setError(
        "Falta la clave de API de Google Maps. Por favor, añade NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en las variables de entorno.",
      )
      setIsLoading(false)
      return
    }

    if (window.google && window.google.maps) {
      console.log("[v0] Google Maps already loaded")
      setIsScriptLoaded(true)
      return
    }

    const existingScript = document.getElementById("google-maps-script")
    if (existingScript) {
      console.log("[v0] Script tag already exists, waiting for load")
      existingScript.addEventListener("load", () => setIsScriptLoaded(true))
      return
    }

    console.log("[v0] Creating new script tag")
    const script = document.createElement("script")
    script.id = "google-maps-script"
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`
    script.async = true
    script.defer = true
    script.onload = () => {
      console.log("[v0] Google Maps script loaded successfully")
      setIsScriptLoaded(true)
    }
    script.onerror = () => {
      console.log("[v0] ERROR: Failed to load Google Maps script")
      setError("Error al cargar Google Maps. Verifica tu clave de API.")
      setIsLoading(false)
    }
    document.body.appendChild(script)
    console.log("[v0] Script tag appended to body")
  }, [])

  // Inicializar el mapa solo una vez
  useEffect(() => {
    if (!isScriptLoaded || initializedRef.current) {
      return
    }

    if (!mapRef.current) {
      console.log("[v0] mapRef.current is null, waiting for next render...")
      return
    }

    if (!window.google || !window.google.maps) {
      console.log("[v0] ERROR: Google Maps API not available")
      setError("Google Maps API no está disponible")
      setIsLoading(false)
      return
    }

    console.log("[v0] Initializing map instance (once)...")

    try {
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: 7.3455068294302075, lng: -73.90576254797632 },
        zoom: 12,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
      })

      console.log("[v0] Map instance created successfully")
      mapInstanceRef.current = map
      initializedRef.current = true
      setIsLoading(false)
      setError(null)
    } catch (err) {
      console.log("[v0] ERROR during map initialization:", err)
      setError("Error al inicializar el mapa")
      setIsLoading(false)
    }
  }, [isScriptLoaded])

  // Actualizar marcadores cuando cambien los datos de sensores
  useEffect(() => {
    if (!mapInstanceRef.current || !initializedRef.current) {
      return
    }

    const map = mapInstanceRef.current
    console.log("[v0] Updating markers for", sensors.length, "sensors")

    // Obtener IDs actuales de sensores
    const currentSensorIds = new Set(sensors.map(s => s.id))

    // Remover marcadores de sensores que ya no existen
    markersRef.current.forEach((markerData, sensorId) => {
      if (!currentSensorIds.has(sensorId)) {
        markerData.marker.setMap(null)
        markersRef.current.delete(sensorId)
      }
    })

    // Actualizar o crear marcadores
    sensors.forEach((sensor) => {
      const color = sensor.riskLevel === "danger" ? "#ef4444" : sensor.riskLevel === "alert" ? "#eab308" : "#22c55e"
      const existingMarkerData = markersRef.current.get(sensor.id)

      if (existingMarkerData) {
        // Actualizar marcador existente
        existingMarkerData.marker.setIcon({
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: color,
          fillOpacity: 0.9,
          strokeColor: "#ffffff",
          strokeWeight: 2,
          scale: selectedSensor === sensor.id ? 12 : 10,
        })

        // Actualizar animación
        existingMarkerData.marker.setAnimation(
          sensor.riskLevel === "danger" ? window.google.maps.Animation.BOUNCE : null
        )

        // Actualizar contenido del InfoWindow
        existingMarkerData.infoWindow.setContent(`
          <div style="font-family: system-ui, sans-serif; padding: 8px; min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1e293b;">Estación</h3>
            <div style="font-size: 14px; color: #475569; line-height: 1.6;">
              <div style="margin: 4px 0;">💧 Nivel: <strong>${sensor.waterLevel.toFixed(1)} cm</strong></div>
              <div style="margin: 4px 0;">🌊 Caudal: <strong>${sensor.flowRate.toFixed(0)} L/s</strong></div>
              <div style="margin: 4px 0;">🌱 Humedad: <strong>${sensor.soilMoisture.toFixed(0)}%</strong></div>
              <div style="margin: 4px 0;">🌡️ Temperatura: <strong>${sensor.temperature.toFixed(1)}°C</strong></div>
              <div style="margin: 4px 0;">🌧️ Precipitación: <strong>${sensor.precipitation.toFixed(1)} mm</strong></div>
              <div style="margin: 8px 0 0 0; padding-top: 8px; border-top: 1px solid #e2e8f0;">
                <span style="display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; background: ${color}; color: white;">
                  ${sensor.riskLevel === "danger" ? "PELIGRO" : sensor.riskLevel === "alert" ? "ALERTA" : "NORMAL"}
                </span>
              </div>
            </div>
          </div>
        `)
      } else {
        // Crear nuevo marcador
        const marker = new window.google.maps.Marker({
          position: sensor.location,
          map,
          title: sensor.name,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            fillColor: color,
            fillOpacity: 0.9,
            strokeColor: "#ffffff",
            strokeWeight: 2,
            scale: selectedSensor === sensor.id ? 12 : 10,
          },
          animation: sensor.riskLevel === "danger" ? window.google.maps.Animation.BOUNCE : null,
        })

        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="font-family: system-ui, sans-serif; padding: 8px; min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1e293b;">Estación</h3>
              <div style="font-size: 14px; color: #475569; line-height: 1.6;">
                <div style="margin: 4px 0;">💧 Nivel: <strong>${sensor.waterLevel.toFixed(1)} cm</strong></div>
                <div style="margin: 4px 0;">🌊 Caudal: <strong>${sensor.flowRate.toFixed(0)} L/s</strong></div>
                <div style="margin: 4px 0;">🌱 Humedad: <strong>${sensor.soilMoisture.toFixed(0)}%</strong></div>
                <div style="margin: 4px 0;">🌡️ Temperatura: <strong>${sensor.temperature.toFixed(1)}°C</strong></div>
                <div style="margin: 4px 0;">🌧️ Precipitación: <strong>${sensor.precipitation.toFixed(1)} mm</strong></div>
                <div style="margin: 8px 0 0 0; padding-top: 8px; border-top: 1px solid #e2e8f0;">
                  <span style="display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; background: ${color}; color: white;">
                    ${sensor.riskLevel === "danger" ? "PELIGRO" : sensor.riskLevel === "alert" ? "ALERTA" : "NORMAL"}
                  </span>
                </div>
              </div>
            </div>
          `,
        })

        marker.addListener("click", () => {
          onSensorSelect(sensor.id)
          infoWindow.open(map, marker)
        })

        markersRef.current.set(sensor.id, { marker, infoWindow })
      }
    })

    console.log("[v0] Markers updated successfully")
  }, [sensors, selectedSensor, onSensorSelect])

  // Manejar sensor seleccionado (centrar y abrir InfoWindow)
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedSensor) {
      return
    }

    const markerData = markersRef.current.get(selectedSensor)
    if (markerData) {
      const map = mapInstanceRef.current
      markerData.infoWindow.open(map, markerData.marker)
      
      // Opcional: centrar en el sensor seleccionado
      // map.setCenter(markerData.marker.getPosition())
      // map.setZoom(14)
    }
  }, [selectedSensor])

  return (
    <div className="relative w-full h-[70vh]">
      {/* Map container - always rendered so ref can attach */}
      <div ref={mapRef} className="w-full h-full rounded-xl shadow-lg border border-slate-200" />

      {/* Loading overlay */}
      {isLoading && !error && (
        <div className="absolute inset-0 rounded-xl bg-slate-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <div className="text-slate-600 font-medium">Cargando mapa...</div>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center">
          <div className="text-center p-8">
            <div className="text-red-600 text-lg font-semibold mb-2">Error al cargar el mapa</div>
            <div className="text-red-500 text-sm">{error}</div>
            <div className="mt-4 text-xs text-red-400">
              Verifica que la variable NEXT_PUBLIC_GOOGLE_MAPS_API_KEY esté configurada correctamente
            </div>
          </div>
        </div>
      )}
    </div>
  )

})