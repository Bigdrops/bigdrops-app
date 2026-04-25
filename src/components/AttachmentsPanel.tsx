import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Paperclip, Plus, Trash2 } from 'lucide-react'

const SUGGESTED_LABELS = [
  'Technical Specification',
  'Warranty Terms',
  'Load Test Report',
  'Company Profile',
  'Service Checklist',
  'Site Photo Gallery',
  'Tax Certificate (TIN)',
  'Custom',
]

interface Attachment {
  label: string
  customLabel: string
  url: string
  _isCustom: boolean
  _uiKey?: string
}

const emptyAttachment = (): Attachment => ({ label: '', customLabel: '', url: '', _isCustom: false })

const fieldClassName = 'h-10 rounded-lg border-zinc-300 bg-background px-3 text-sm text-zinc-900'

interface AttachmentsPanelProps {
  attachments?: Attachment[]
  onChange: (attachments: Attachment[]) => void
}

export default function AttachmentsPanel({ attachments = [], onChange }: AttachmentsPanelProps) {

  const addRow = () => onChange([...attachments, emptyAttachment()])

  const removeRow = (idx: number) => onChange(attachments.filter((_, i) => i !== idx))

  const updateRow = (idx: number, field: keyof Attachment, value: string) => {
    onChange(attachments.map((att, i) => {
      if (i !== idx) return att
      if (field === 'label') {
        const isCustom = value === 'Custom'
        return { ...att, label: isCustom ? '' : value, _isCustom: isCustom, customLabel: '' }
      }
      if (field === 'customLabel') return { ...att, label: value, customLabel: value }
      return { ...att, [field]: value }
    }))
  }

  return (
    <div>
      {attachments.length > 0 && (
        <div className="mb-2.5 space-y-2.5">
          {attachments.map((att, idx) => (
            <div key={idx} className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3">
              <span className="mt-2 shrink-0 text-zinc-500" aria-hidden="true">
                <Paperclip className="h-4 w-4" />
              </span>
              <div className="flex flex-1 flex-col gap-1.5">
                <Select
                  value={att._isCustom ? 'Custom' : (att.label || '__none__')}
                  onValueChange={(value) => updateRow(idx, 'label', value === '__none__' ? '' : value)}
                >
                  <SelectTrigger className={fieldClassName}>
                    <SelectValue placeholder="— Select label —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Select label —</SelectItem>
                    {SUGGESTED_LABELS.map(l => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {att._isCustom && (
                  <Input
                    className={fieldClassName}
                    placeholder="Type your custom label..."
                    value={att.customLabel || ''}
                    onChange={e => updateRow(idx, 'customLabel', e.target.value)}
                  />
                )}

                <Input
                  className={fieldClassName}
                  placeholder="Paste link (Google Drive, Dropbox, etc.)"
                  value={att.url || ''}
                  onChange={e => updateRow(idx, 'url', e.target.value)}
                />

                {att.url && (
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-indigo-500 no-underline hover:underline"
                  >
                    ↗ Preview link
                  </a>
                )}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mt-1 h-10 w-10 shrink-0 rounded-lg text-red-700 hover:bg-red-50 hover:text-red-700"
                onClick={() => removeRow(idx)}
                aria-label={`Remove attachment ${idx + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={addRow}
        className="h-10 w-full rounded-lg border-dashed border-zinc-300 text-sm font-medium text-zinc-500 hover:bg-zinc-50"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        <span>Add Supporting Document</span>
      </Button>

      {attachments.length > 0 && (
        <div className="mt-2 text-center text-[11px] text-zinc-400">
          These appear as clickable links at the bottom of the PDF under "Supporting Documents"
        </div>
      )}
    </div>
  )
}
