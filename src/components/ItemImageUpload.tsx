import * as React from 'react'
import { useRef, useState } from 'react'
import { feedback } from '@/lib/feedback'
import { Button } from '@/components/ui/button'
import { ImagePlus, LoaderCircle } from 'lucide-react'
import { IMAGE_ACCEPT_ATTRIBUTE, isSupportedImageFile, getUnsupportedImageErrorMessage } from '@/lib/documentImageUploadPolicy'

const CLOUD_NAME = 'ddhqvv77g'
const UPLOAD_PRESET = 'ml_default'

interface ItemImageUploadProps {
  value: string | null | undefined
  onChange: (url: string | null) => void
}

interface CloudinaryResponse {
  secure_url: string
  [key: string]: any
}

export default function ItemImageUpload({ value, onChange }: ItemImageUploadProps) {
  const ref = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setValidationError(null)

    if (!isSupportedImageFile(file)) {
      setValidationError(getUnsupportedImageErrorMessage(file.name))
      return
    }

    const MAX_SIZE = 5 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      setValidationError('Image is too large. Use one under 5MB.')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', UPLOAD_PRESET)

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error('Upload failed')
      const data: CloudinaryResponse = await res.json()
      onChange(data.secure_url)
    } catch (e: any) {
      feedback.error('Upload failed', { description: e.message })
    }
    setUploading(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  if (value) {
    return (
      <div className="mt-1.5">
        <a href={value} target="_blank" rel="noreferrer">
          <img
            src={value}
            alt="Item"
            className="block h-14 w-14 cursor-pointer rounded-md border border-zinc-200 object-cover"
          />
        </a>
        <div className="mt-1 flex gap-2">
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            className="h-8 rounded-md px-2 text-xs text-slate-600" 
            onClick={() => ref.current?.click()}
          >
            Change
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            className="h-8 rounded-md px-2 text-xs text-red-700 hover:bg-red-50 hover:text-red-700" 
            onClick={() => onChange(null)}
          >
            Remove
          </Button>
        </div>
        {validationError && <div className="mt-1.5 text-[10px] font-medium text-red-600">{validationError}</div>}
        <input 
          ref={ref} 
          type="file" 
          accept={IMAGE_ACCEPT_ATTRIBUTE}
          className="hidden" 
          onChange={e => handleFile(e.target.files?.[0])} 
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-start">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        className={`mt-1.5 flex h-14 w-14 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md border-2 border-dashed text-center transition ${
          uploading ? 'border-zinc-300 bg-zinc-50 text-[10px] text-zinc-400' : 'border-zinc-300 bg-white text-zinc-400 hover:bg-zinc-50'
        }`}
        title="Add image"
        aria-label="Add image"
      >
        {uploading ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" />
            <div className="text-[9px] text-zinc-400">Uploading</div>
          </>
        ) : <ImagePlus className="h-5 w-5" />}
        <input 
          ref={ref} 
          type="file" 
          accept={IMAGE_ACCEPT_ATTRIBUTE}
          className="hidden" 
          onChange={e => handleFile(e.target.files?.[0])} 
        />
      </button>
      {validationError && <div className="mt-1.5 text-[10px] font-medium text-red-600">{validationError}</div>}
    </div>
  )
}
