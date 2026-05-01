import { lazy, Suspense } from 'react'
import type { ReactNode } from 'react'

import { Link2, NotebookText, Plus, Save, Signature, Trash2 } from 'lucide-react'

import SignatoryPicker from '@/components/SignatoryPicker'
import { Input } from '@/components/ui/input'
import {
  CollapseCard,
  fieldCls,
  pageCardCls,
  type LinkAttachment,
} from './mobileFormPrimitives'

const RichTextEditor = lazy(() => import('@/components/RichTextEditor'))

function EditorLoadingState() {
  return (
    <div className="rounded-2xl border border-zinc-300 bg-white px-4 py-10 text-center text-sm text-zinc-500 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      Loading editor...
    </div>
  )
}

interface InvoiceTextFields {
  notes?: string | null
  terms?: string | null
}

interface MobileInvoiceNotesTermsSectionProps {
  notesTitle: string
  setNotesTitle: (value: string) => void
  termsTitle: string
  setTermsTitle: (value: string) => void
  invoice: InvoiceTextFields
  updateInvoice: (field: string, value: string) => void
  open: boolean
  onToggle: () => void
}

export function MobileInvoiceNotesTermsSection({
  invoice,
  updateInvoice,
  open,
  onToggle,
}: MobileInvoiceNotesTermsSectionProps) {
  return (
    <CollapseCard
      icon={NotebookText}
      iconTone={{ bg: '#f5f3ff', fg: '#7c3aed' }}
      title="Notes & Terms"
      open={open}
      onToggle={onToggle}
      sectionColor="#7c3aed"
    >
      <div className="space-y-4">
        <div>
          <div className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#94a3b8]">Notes</div>
          <Suspense fallback={<EditorLoadingState />}>
            <RichTextEditor
              value={invoice.notes || ''}
              onChange={(value: string) => updateInvoice('notes', value)}
              placeholder="Notes..."
            />
          </Suspense>
        </div>

        <div>
          <div className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#94a3b8]">Terms</div>
          <Suspense fallback={<EditorLoadingState />}>
            <RichTextEditor
              value={invoice.terms || ''}
              onChange={(value: string) => updateInvoice('terms', value)}
              placeholder="Terms..."
            />
          </Suspense>
        </div>
      </div>
    </CollapseCard>
  )
}

interface SignatoryOption {
  id: string
  name: string
  role?: string | null
  signature_url?: string | null
  signatureUrl?: string | null
}

interface MobileInvoiceSignatorySectionProps {
  signatoryId: string | null
  onSignatoryChange: (value: string | null) => void
  signatories: SignatoryOption[]
  afterSignatorySlot?: ReactNode
  open: boolean
  onToggle: () => void
}

export function MobileInvoiceSignatorySection({
  signatoryId,
  onSignatoryChange,
  signatories,
  afterSignatorySlot,
  open,
  onToggle,
}: MobileInvoiceSignatorySectionProps) {
  return (
    <CollapseCard
      icon={Signature}
      iconTone={{ bg: '#eff6ff', fg: '#2563eb' }}
      title="Signatory"
      open={open}
      onToggle={onToggle}
      sectionColor="#2563eb"
    >
      <div className="space-y-4">
        <SignatoryPicker
          value={signatoryId}
          onChange={onSignatoryChange}
          signatories={signatories.map((s) => ({
            id: s.id,
            name: s.name,
            role: s.role,
            signatureUrl: s.signature_url || s.signatureUrl,
          }))}
        />
        {afterSignatorySlot ? afterSignatorySlot : null}
      </div>
    </CollapseCard>
  )
}

interface MobileInvoiceReferenceLinksSectionProps {
  referenceLinks: LinkAttachment[]
  updateReferenceLink: (index: number, field: 'label' | 'url', value: string) => void
  removeReferenceLink: (index: number) => void
  addReferenceLink: () => void
  open: boolean
  onToggle: () => void
}

export function MobileInvoiceReferenceLinksSection({
  referenceLinks,
  updateReferenceLink,
  removeReferenceLink,
  addReferenceLink,
  open,
  onToggle,
}: MobileInvoiceReferenceLinksSectionProps) {
  return (
    <CollapseCard
      icon={Link2}
      iconTone={{ bg: '#f0fdf4', fg: '#059669' }}
      title="Reference Links"
      open={open}
      onToggle={onToggle}
      sectionColor="#059669"
    >
      <div className="space-y-2">
        {referenceLinks.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-[#bbf7d0] bg-[#f0fdf4] px-4 py-5 text-[13px] text-[#15803d]">
            No reference links yet.
          </div>
        ) : (
          referenceLinks.map((link, index) => (
            <div key={link._uiKey || index} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)_42px] items-center gap-2 max-[520px]:grid-cols-1">
              <Input
                value={link.label}
                onChange={(event) => updateReferenceLink(index, 'label', event.target.value)}
                placeholder="Link label"
                className={fieldCls}
              />
              <Input
                value={link.url}
                onChange={(event) => updateReferenceLink(index, 'url', event.target.value)}
                placeholder="https://..."
                className={fieldCls}
              />
              <button
                type="button"
                onClick={() => removeReferenceLink(index)}
                className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc] text-[#94a3b8]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}

        <button
          type="button"
          onClick={addReferenceLink}
          className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-[14px] border-2 border-dashed border-[#e2e8f0] bg-[#f8fafc] text-[13px] font-bold text-[#64748b]"
        >
          <Plus className="h-4 w-4" />
          Add link
        </button>
      </div>
    </CollapseCard>
  )
}

interface MobileInvoiceFooterActionsProps {
  onCancel: () => void
  onSaveDraft: () => void
  onSaveSent: () => void
  onFloatingSave: () => void
  saving: boolean
  primaryLabel: string
}

export function MobileInvoiceFooterActions({
  onCancel,
  onSaveDraft,
  onSaveSent,
  onFloatingSave,
  saving,
  primaryLabel,
}: MobileInvoiceFooterActionsProps) {
  return (
    <>
      <div className="px-3 pb-5 pt-3 sm:px-4">
        <div className="mx-auto max-w-3xl">
          <div className={`${pageCardCls} p-2`}>
            <div className="grid grid-cols-[1fr_1fr_1.35fr] gap-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={saving}
                className="h-[52px] rounded-[14px] border-[1.5px] border-[#e2e8f0] bg-white text-[14px] font-bold text-[#475569] disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSaveDraft}
                disabled={saving}
                className="h-[52px] rounded-[14px] border-[1.5px] border-[#e2e8f0] bg-[#f8fafc] text-[14px] font-bold text-[#475569] disabled:opacity-60"
              >
                Draft
              </button>
              <button
                type="button"
                onClick={onSaveSent}
                disabled={saving}
                className="h-[52px] rounded-[14px] border-0 bg-[#0f172a] text-[15px] font-extrabold text-white shadow-[0_4px_18px_rgba(15,23,42,0.22)] disabled:opacity-60"
              >
                {saving ? 'Saving…' : primaryLabel}
              </button>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onFloatingSave}
        disabled={saving}
        className="fixed bottom-[92px] right-4 z-[60] flex h-[52px] w-[52px] items-center justify-center rounded-[16px] bg-[#0f172a] text-white shadow-[0_8px_24px_rgba(15,23,42,0.28)] disabled:opacity-60"
      >
        <Save className="h-5 w-5" />
      </button>
    </>
  )
}
