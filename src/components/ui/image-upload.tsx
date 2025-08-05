import * as React from "react"
import { Upload, X, Image as ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { uploadExerciseImage } from "@/lib/upload-image"
import { useState } from "react"
import { toast } from "sonner"

interface ImageUploadProps {
  value?: string
  onChange: (url: string) => void
  onRemove?: () => void
  className?: string
  disabled?: boolean
}

export function ImageUpload({ value, onChange, onRemove, className, disabled }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (disabled || isUploading) return

    try {
      setIsUploading(true)
      const url = await uploadExerciseImage(file)
      onChange(url)
      toast.success("Image uploaded successfully!")
    } catch (error) {
      console.error('Upload failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload image'
      toast.error(errorMessage)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={cn("space-y-4", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {value ? (
        <div className="relative group">
          <img
            src={value}
            alt="Exercise preview"
            className="w-full h-48 object-cover rounded-lg border"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
              target.parentElement!.innerHTML = '<div class="w-full h-48 bg-gray-100 flex items-center justify-center rounded-lg border"><ImageIcon class="h-8 w-8 text-gray-400" /></div>'
            }}
          />
          {onRemove && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={onRemove}
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            dragActive
              ? "border-primary bg-primary/5"
              : "border-gray-300 dark:border-gray-600",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              {isUploading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              ) : (
                <Upload className="h-6 w-6 text-gray-400" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {isUploading ? "Uploading..." : "Upload exercise image"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Drag and drop or click to select
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClick}
              disabled={disabled || isUploading}
            >
              Select Image
            </Button>
          </div>
        </div>
      )}
    </div>
  )
} 