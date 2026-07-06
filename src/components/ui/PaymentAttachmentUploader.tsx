import { useRef, useState } from "react"
import { Plus, X, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { IMAGE_ACCEPT_ATTRIBUTE, isSupportedImageFile } from "@/lib/documentImageUploadPolicy"

interface PaymentAttachmentUploaderProps {
  files: File[]
  onFilesChanged: (files: File[]) => void
  maxSize?: number
  accept?: string
}

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024

export function PaymentAttachmentUploader({
  files,
  onFilesChanged,
  maxSize = DEFAULT_MAX_SIZE,
  accept = IMAGE_ACCEPT_ATTRIBUTE,
}: PaymentAttachmentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const validateAndAdd = (incoming: FileList | File[]) => {
    const newErrors: string[] = []
    const allowed = accept.split(",")
    const valid: File[] = []

    for (const file of Array.from(incoming)) {
      if (file.size > maxSize) {
        newErrors.push(`${file.name} exceeds 10 MB limit`)
        continue
      }
      const matchesType = allowed.some((t) => {
        const pattern = t.trim().replace("*", ".*")
        return file.type.match(pattern)
      })
      if (!matchesType) {
        newErrors.push(`${file.name} is not a supported file type`)
        continue
      }
      valid.push(file)
    }

    setErrors(newErrors)
    if (valid.length > 0) onFilesChanged([...files, ...valid])
  }

  const remove = (index: number) => onFilesChanged(files.filter((_, i) => i !== index))

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    validateAndAdd(e.dataTransfer.files)
  }

  return (
    <div className="space-y-2">
      <div className="text-[11px] font-bold uppercase tracking-widest text-bd-text-muted/70">
        Attachments
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragEnter={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex items-center gap-3 rounded-2xl border border-dashed p-3 transition-colors",
          isDragging
            ? "border-bd-focus-ring bg-bd-focus-ring/5"
            : "border-bd-border hover:border-bd-text-soft/50",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          className="sr-only"
          onChange={(e) => { if (e.target.files) validateAndAdd(e.target.files); e.target.value = "" }}
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex shrink-0 items-center gap-1.5 h-7 rounded-xl bg-bd-button-primary-bg text-bd-button-primary-text px-2.5 text-xs font-bold transition-all hover:bg-bd-button-primary-hover-bg"
        >
          <Plus size={14} />
          Add files
        </button>

        {files.length === 0 ? (
          <p className="text-xs text-bd-text-soft flex-1">Drop receipts here or click to browse</p>
        ) : (
          <div className="flex flex-1 items-center gap-2 overflow-x-auto">
            {files.map((file, i) => (
              <div key={`${file.name}-${i}`} className="group relative shrink-0">
                {file.type.startsWith("image/") ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="h-10 w-10 rounded-lg border border-bd-border object-cover"
                    title={file.name}
                  />
                ) : (
                  <div
                    className="h-10 w-10 rounded-lg border border-bd-border bg-bd-surface-muted flex items-center justify-center"
                    title={file.name}
                  >
                    <FileText size={16} className="text-bd-text-muted" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-bd-surface border border-bd-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                >
                  <X size={10} className="text-bd-text-soft" />
                </button>
              </div>
            ))}
          </div>
        )}

        {files.length > 0 && (
          <span className="text-[11px] text-bd-text-soft shrink-0">{files.length}</span>
        )}
      </div>

      {errors.length > 0 && (
        <div className="bg-bd-status-danger-bg border border-bd-status-danger-border rounded-xl px-3 py-2 text-xs text-bd-status-danger-text space-y-0.5">
          {errors.map((err, i) => <p key={i}>{err}</p>)}
        </div>
      )}
    </div>
  )
}
