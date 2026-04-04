import { useRef, useState } from 'react'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'

const CLOUD_NAME = 'ddhqvv77g'
const UPLOAD_PRESET = 'ml_default'

export default function ItemImageUpload({ value, onChange }) {
  const ref = useRef()
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleFile = async (file) => {
    if (!file) return
    setUploading(true)
    setProgress(0)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', UPLOAD_PRESET)

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      onChange(data.secure_url)
    } catch (e) {
      toast({ title: 'Upload failed', description: e.message, variant: 'destructive' })
    }
    setUploading(false)
    setProgress(0)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) handleFile(file)
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
          <Button type="button" variant="link" size="xs" className="h-auto p-0 text-[11px] text-indigo-500 no-underline hover:no-underline" onClick={() => ref.current.click()}>
            Change
          </Button>
          <Button type="button" variant="link" size="xs" className="h-auto p-0 text-[11px] text-red-700 no-underline hover:no-underline" onClick={() => onChange(null)}>
            Remove
          </Button>
        </div>
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
      </div>
    )
  }

  return (
    <div
      onClick={() => ref.current.click()}
      onDrop={handleDrop}
      onDragOver={e => e.preventDefault()}
      className={`mt-1.5 flex h-14 w-14 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md border-2 border-dashed text-center ${
        uploading ? 'border-zinc-300 bg-zinc-50 text-[10px] text-zinc-400' : 'border-zinc-300 bg-white text-xl text-zinc-400'
      }`}
      title="Add image"
    >
      {uploading ? (
        <>
          <div className="text-sm">⏳</div>
          <div className="text-[9px] text-zinc-400">Uploading</div>
        </>
      ) : '🖼'}
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
    </div>
  )
}
