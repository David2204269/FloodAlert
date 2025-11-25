'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, Loader2 } from 'lucide-react'

export function ImageSegmentation() {
  const [image, setImage] = useState<string | null>(null)
  const [mask, setMask] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.match(/image\/(png|jpeg|jpg)/)) {
        setError('Por favor sube una imagen PNG o JPG')
        return
      }
      
      // Clear previous results
      setMask(null)
      setError(null)
      
      // Read and display the image
      const reader = new FileReader()
      reader.onload = (event) => {
        setImage(event.target?.result as string)
      }
      reader.readAsDataURL(file)
      
      // Upload the image
      handleUpload(file)
    }
  }

  const handleUpload = async (file: File) => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Create FormData to send the image
      const formData = new FormData()
      formData.append('image', file)
      
      // Send to the API endpoint
      const response = await fetch('/api/predict', {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        throw new Error('Error al procesar la imagen')
      }
      
      const data = await response.json()
      
      // Set the mask from the response
      if (data.mask) {
        setMask(`data:image/png;base64,${data.mask}`)
      } else {
        throw new Error('No se recibió la máscara del servidor')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      console.error('[v0] Error uploading image:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Segmentación de Imágenes
          </h1>
          <p className="mt-2 text-muted-foreground">
            Sube una imagen para obtener la máscara segmentada
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Subir Imagen</CardTitle>
            <CardDescription>
              Selecciona una imagen PNG o JPG para procesar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <label
                htmlFor="file-upload"
                className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-card transition-colors hover:border-primary hover:bg-accent/10"
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="mt-2 text-sm text-muted-foreground">
                  Haz clic para seleccionar o arrastra una imagen
                </span>
                <input
                  id="file-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isLoading}
                />
              </label>

              {error && (
                <div className="w-full rounded-lg bg-destructive/10 p-4 text-destructive">
                  {error}
                </div>
              )}

              {isLoading && (
                <div className="flex items-center gap-2 text-primary">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Procesando imagen...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {(image || mask) && (
          <div className="grid gap-6 md:grid-cols-2">
            {image && (
              <Card>
                <CardHeader>
                  <CardTitle>Imagen Original</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
                    <img
                      src={image || "/placeholder.svg"}
                      alt="Imagen original"
                      className="h-full w-full object-contain"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {mask && (
              <Card>
                <CardHeader>
                  <CardTitle>Máscara Segmentada</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
                    <img
                      src={mask || "/placeholder.svg"}
                      alt="Máscara segmentada"
                      className="h-full w-full object-contain"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
