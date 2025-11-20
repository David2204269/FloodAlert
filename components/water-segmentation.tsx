'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, Loader2, ImageIcon } from 'lucide-react'

export function WaterSegmentation() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [maskImage, setMaskImage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validar tipo de archivo
      if (!file.type.match(/image\/(png|jpeg|jpg)/)) {
        setError('Por favor sube una imagen PNG o JPG')
        return
      }
      
      setSelectedFile(file)
      setError(null)
      setMaskImage(null) // Limpiar máscara anterior
      
      // Crear vista previa
      const reader = new FileReader()
      reader.onload = (event) => {
        setPreviewImage(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    
    if (file) {
      if (!file.type.match(/image\/(png|jpeg|jpg)/)) {
        setError('Por favor sube una imagen PNG o JPG')
        return
      }
      
      setSelectedFile(file)
      setError(null)
      setMaskImage(null)
      
      const reader = new FileReader()
      reader.onload = (event) => {
        setPreviewImage(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleGenerateMask = async () => {
    if (!selectedFile) {
      setError('Por favor selecciona una imagen primero')
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      // Crear FormData para enviar la imagen
      const formData = new FormData()
      formData.append('image', selectedFile)
      
      // Enviar al endpoint /api/predict
      const response = await fetch('/api/predict', {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`)
      }
      
      const data = await response.json()
      
      // Convertir el base64 a imagen
      if (data.mask) {
        // Agregar prefijo data:image si no lo tiene
        const maskDataUrl = data.mask.startsWith('data:') 
          ? data.mask 
          : `data:image/png;base64,${data.mask}`
        setMaskImage(maskDataUrl)
      } else {
        throw new Error('No se recibió la máscara del servidor')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar la máscara')
      console.error('[v0] Error generating mask:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-blue-900 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ImageIcon className="h-6 w-6 text-blue-600" />
            </div>
            Generador de Máscara de Cuerpo de Agua
          </CardTitle>
          <CardDescription className="text-blue-700">
            Sube una imagen para identificar y segmentar cuerpos de agua
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Input de archivo con drag and drop */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="relative"
          >
            <label
              htmlFor="water-image-upload"
              className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer bg-white/80 hover:bg-blue-50 transition-all duration-200 hover:border-blue-400"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="h-12 w-12 text-blue-500 mb-3" />
                <p className="mb-2 text-sm text-blue-700 font-medium">
                  <span className="font-semibold">Haz clic para subir</span> o arrastra y suelta
                </p>
                <p className="text-xs text-blue-600">PNG o JPG (MAX. 10MB)</p>
              </div>
              <input
                id="water-image-upload"
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isLoading}
              />
            </label>
          </div>

          {/* Mensaje de error */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          {/* Vista previa de la imagen seleccionada */}
          {previewImage && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-700">Vista Previa</h3>
              <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-slate-100 border-2 border-slate-200">
                <img
                  src={previewImage || "/placeholder.svg"}
                  alt="Vista previa"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}

          {/* Botón para generar máscara */}
          {selectedFile && (
            <Button
              onClick={handleGenerateMask}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6 text-lg shadow-md"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generando Máscara...
                </>
              ) : (
                'Generar Máscara'
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Mostrar resultados: imagen original y máscara */}
      {maskImage && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Imagen Original */}
          <Card className="shadow-lg border-slate-200">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100">
              <CardTitle className="text-lg font-bold text-slate-800">
                Imagen Original
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                <img
                  src={previewImage || "/placeholder.svg"}
                  alt="Imagen original"
                  className="w-full h-full object-contain"
                />
              </div>
            </CardContent>
          </Card>

          {/* Máscara Generada */}
          <Card className="shadow-lg border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardHeader className="bg-gradient-to-r from-blue-100 to-cyan-100">
              <CardTitle className="text-lg font-bold text-blue-900 flex items-center gap-2">
                <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse"></div>
                Máscara Generada
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-white border-2 border-blue-300">
                <img
                  src={maskImage || "/placeholder.svg"}
                  alt="Máscara generada"
                  className="w-full h-full object-contain"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
