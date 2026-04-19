import { lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import { Link2, NotebookText, Plus, Signature, X } from 'lucide-react'
import SignatoryPicker from '@/components/SignatoryPicker'
import { Input } from '@/components/ui/input'
import {
  CollapseCard,
  fieldCls,
  type LinkAttachment,
} from '@/components/invoice/mobile/mobileFormPrimitives'

const RichTextEditor = lazy(() => import('@/components/RichTextEditor'))

function EditorLoadingState() {
  return (
    <div className="rounded-[var(--bd-radius)] border border-[var(--bd-border-soft)] bg-[var(--bd-bg)] px-4 py-10 text-center text-sm text-[var(--bd-text3)]">
      Loading editor...
    </div>
  )
}

interface FormNotesTermsProps {
  notesTitle: string
  setNotesTitle: (value: string) => void
  termsTitle: string
  setTermsTitle: (value: string) => void
  invoice: { notes?: string | null; terms?: string | null }
  updateInvoice: (field: string, value: string) => void
  showNotesTerms: boolean
  setShowNotesTerms: (val: boolean) => void
  signatoryId: string | null
  onSignatoryChange: (value: string | null) => void
  signatories: any[]
  afterSignatorySlot?: ReactNode
  showSignatory: boolean
  setShowSignatory: (val: boolean) => void
  referenceLinks: LinkAttachment[]
  updateReferenceLink: (index: number, field: 'label' | 'url', value: string) => void
  removeReferenceLink: (index: number) => void
  addReferenceLink: () => void
  showLinks: boolean
  setShowLinks: (val: boolean) => void
}

export function FormNotesTerms({
  invoice,
  updateInvoice,
  showNotesTerms,
  setShowNotesTerms,
  signatoryId,
  onSignatoryChange,
  signatories,
  afterSignatorySlot,
  showSignatory,
  setShowSignatory,
  referenceLinks,
  updateReferenceLink,
  removeReferenceLink,
  addReferenceLink,
  showLinks,
  setShowLinks,
}: FormNotesTermsProps) {
  return (
    <div className="border-b border-[var(--bd-border-soft)]">
      {/* Notes & Terms */}
      <CollapseCard
        icon={NotebookText}
        iconTone={{ bg: '#f5f3ff', fg: '#7c3aed' }}
        title="Notes & Terms"
        subtitle="Optional rich text blocks"
        open={showNotesTerms}
        onToggle={() => setShowNotesTerms(!showNotesTerms)}
        sectionColor="#7c3aed"
      >
        <div className="space-y-6">
          <div>
            <div className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--bd-text3)]">Notes</div>
            <Suspense fallback={<EditorLoadingState />}>
              <RichTextEditor
                value={invoice.notes || ''}
                onChange={(value: string) => updateInvoice('notes', value)}
                placeholder="Notes..."
              />
            </Suspense>
          </div>

          <div>
            <div className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--bd-text3)]">Terms & Conditions</div>
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

      {/* Signatory */}
      <CollapseCard
        icon={Signature}
        iconTone={{ bg: '#eff6ff', fg: '#2563eb' }}
        title="Signatory"
        subtitle="Authorized person for this document"
        open={showSignatory}
        onToggle={() => setShowSignatory(!showSignatory)}
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
          {afterSignatorySlot}
        </div>
      </CollapseCard>

      {/* Reference Links */}
      <CollapseCard
        icon={Link2}
        iconTone={{ bg: '#f0fdf4', fg: '#059669' }}
        title="Reference Links"
        subtitle="Associated URLs and attachments"
        open={showLinks}
        onToggle={() => setShowLinks(!showLinks)}
        sectionColor="#059669"
      >
        <div className="space-y-2.5">
          {referenceLinks.length === 0 ? (
            <div className="rounded-[var(--bd-radius-lg)] border border-dashed border-[var(--bd-border-soft)] bg-[var(--bd-bg)] px-4 py-5 text-[13px] font-medium text-[var(--bd-text2)]">
              No reference links added yet.
            </div>
          ) : (
            referenceLinks.map((link, index) => (
              <div key={link._uiKey || index} className="flex gap-2">
                <Input
                  value={link.label}
                  onChange={(event) => updateReferenceLink(index, 'label', event.target.value)}
                  placeholder="Label"
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
                  className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-transparent bg-transparent text-[var(--bd-text4)] transition hover:bg-[var(--bd-rose-bg)] hover:text-[var(--bd-rose)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))
          )}

          <button
            type="button"
            onClick={addReferenceLink}
            className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-[var(--bd-radius)] border border-dashed border-[var(--bd-border)] bg-[var(--bd-surface)] text-[13px] font-bold text-[var(--bd-text2)] hover:bg-[var(--bd-bg)]"
          >
            <Plus className="h-4 w-4" />
            Add Reference Link
          </button>
        </div>
      </CollapseCard>
    </div>
  )
}
