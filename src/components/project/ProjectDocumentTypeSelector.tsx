import * as React from 'react'
import { Wand2, ClipboardList, Receipt, PackageCheck, FileText } from 'lucide-react'

export type ProjectDocumentType = 'purchase_order' | 'receipt' | 'receiving_waybill' | 'other'

export const DOCUMENT_TYPE_CONFIG = {
  purchase_order: {
    label: 'Purchase Order',
    accent: 'border-l-blue-500',
    iconWrap: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
    icon: ClipboardList,
    description: 'Use the AI prompt, paste JSON, review, and save.',
  },
  receipt: {
    label: 'Receipt',
    accent: 'border-l-emerald-500',
    iconWrap: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
    icon: Receipt,
    description: 'Use the AI prompt, paste JSON, review, and save.',
  },
  receiving_waybill: {
    label: 'Receiving Waybill',
    accent: 'border-l-orange-500',
    iconWrap: 'bg-orange-50 text-orange-700 ring-1 ring-orange-100',
    icon: PackageCheck,
    description: 'Use the AI prompt, paste JSON, review, and save.',
  },
  other: {
    label: 'Other',
    accent: 'border-l-slate-500',
    iconWrap: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
    icon: FileText,
    description: 'Use the AI prompt, paste JSON, review, and save.',
  },
}

interface ProjectDocumentTypeSelectorProps {
  onSelect: (type: ProjectDocumentType) => void
  selectedType: ProjectDocumentType
}

export function ProjectDocumentTypeSelector({ onSelect, selectedType }: ProjectDocumentTypeSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="rounded-[24px] border-l-4 border-l-blue-500 border border-blue-100 bg-blue-50 p-4">
        <div className="text-sm font-semibold text-zinc-900">Step 1: Pick document type</div>
        <div className="mt-1 text-sm text-zinc-600">Choose the source document you want to add to this project.</div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(Object.keys(DOCUMENT_TYPE_CONFIG) as ProjectDocumentType[]).map((type) => {
          const option = DOCUMENT_TYPE_CONFIG[type]
          const Icon = option.icon
          const active = selectedType === type

          return (
            <button
              key={type}
              type="button"
              onClick={() => onSelect(type)}
              className={`rounded-[24px] border-l-4 border p-4 text-left shadow-sm transition h-full ${
                active ? `${option.accent} border-zinc-200 bg-white` : 'border-l-zinc-200 border-zinc-200 bg-zinc-50 hover:bg-white'
              }`}
            >
              <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-2xl ${option.iconWrap}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="text-sm font-semibold text-zinc-900">{option.label}</div>
              <div className="mt-1 text-[11px] text-zinc-500 leading-snug">{option.description}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
