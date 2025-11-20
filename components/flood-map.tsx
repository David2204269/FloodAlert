"use client"

import { useEffect, useRef, useState } from "react"

interface Sensor {
  id: string
  name: string
  location: { lat: number; lng: number }
  waterLevel: number
  flowRate: number
  soilMoisture: number
  riskLevel: "normal" | "alert" | "danger"
}

interface FloodMapProps {
  sensors: Sensor[]
  selectedSensor: string | null
  onSensorSelect: (sensorId: string) => void
}

export function FloodMap({ sensors, selectedSensor, onSensorSelect }: FloodMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isScriptLoaded, setIsScriptLoaded] = useState(false)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])

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

  useEffect(() => {
    if (!isScriptLoaded) {
      console.log("[v0] Script not loaded yet, waiting...")
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

    console.log("[v0] Initializing map...")
    console.log("[v0] mapRef.current exists:", !!mapRef.current)

    try {
      console.log("[v0] Creating map instance with", sensors.length, "sensors")
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

      markersRef.current.forEach((marker) => marker.setMap(null))
      markersRef.current = []

      const bounds = new window.google.maps.LatLngBounds()

      sensors.forEach((sensor) => {
        const color = sensor.riskLevel === "danger" ? "#ef4444" : sensor.riskLevel === "alert" ? "#eab308" : "#22c55e"

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
          animation: sensor.riskLevel === "danger" ? window.google.maps.Animation.BOUNCE : undefined,
        })

        markersRef.current.push(marker)
        bounds.extend(sensor.location)

        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="font-family: system-ui, sans-serif; padding: 8px; min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1e293b;">${sensor.name}</h3>
              <div style="font-size: 14px; color: #475569; line-height: 1.6;">
                <div style="margin: 4px 0;">💧 Nivel: <strong>${sensor.waterLevel.toFixed(1)} cm</strong></div>
                <div style="margin: 4px 0;">🌊 Caudal: <strong>${sensor.flowRate.toFixed(0)} L/s</strong></div>
                <div style="margin: 4px 0;">🌱 Humedad: <strong>${sensor.soilMoisture.toFixed(0)}%</strong></div>
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

        if (selectedSensor === sensor.id) {
          infoWindow.open(map, marker)
          map.setCenter({ lat: 7.3455068294302075, lng: -73.90576254797632 })
          map.setZoom(14)
        }
      })

      if (sensors.length > 1) {
        map.fitBounds(bounds)
      }

      console.log("[v0] Map initialized successfully with", markersRef.current.length, "markers")
      setIsLoading(false)
      setError(null)
    } catch (err) {
      console.log("[v0] ERROR during map initialization:", err)
      setError("Error al inicializar el mapa")
      setIsLoading(false)
    }
  }, [isScriptLoaded, sensors, selectedSensor, onSensorSelect])

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
}
