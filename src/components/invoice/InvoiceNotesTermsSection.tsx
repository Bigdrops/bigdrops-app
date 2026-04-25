import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import RichTextEditor from '../RichTextEditor'

interface InvoiceNotesTermsSectionProps {
  invoice: {
    notes?: string | null
    terms?: string | null
  }
  updateInvoice: (field: 'notes' | 'terms', value: string) => void
  notesTitle: string
  setNotesTitle: (val: string) => void
  termsTitle: string
  setTermsTitle: (val: string) => void
}

export default function InvoiceNotesTermsSection({
  invoice,
  updateInvoice,
  notesTitle,
  setNotesTitle,
  termsTitle,
  setTermsTitle,
}: InvoiceNotesTermsSectionProps) {
  return (
    <Card className="mb-5 rounded-xl border border-border bg-card shadow-sm">
      <CardContent className="p-4 pt-5 sm:p-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <Input
              className="mb-3 border-0 bg-transparent px-0 py-1 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground shadow-none focus-visible:ring-0"
              value={notesTitle}
              onChange={(e) => setNotesTitle(e.target.value)}
            />
            <RichTextEditor
              value={invoice.notes || ''}
              onChange={(val: string) => updateInvoice('notes', val)}
              placeholder="Notes to client..."
            />
          </div>
          <div>
            <Input
              className="mb-3 border-0 bg-transparent px-0 py-1 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground shadow-none focus-visible:ring-0"
              value={termsTitle}
              onChange={(e) => setTermsTitle(e.target.value)}
            />
            <RichTextEditor
              value={invoice.terms || ''}
              onChange={(val: string) => updateInvoice('terms', val)}
              placeholder="Terms and conditions..."
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
