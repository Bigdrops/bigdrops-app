import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import RichTextEditor from '../RichTextEditor'

export default function InvoiceNotesTermsSection({
  invoice,
  updateInvoice,
  notesTitle,
  setNotesTitle,
  termsTitle,
  setTermsTitle,
}) {
  return (
    <Card className="mb-5 rounded-none border-slate-200 bg-white shadow-sm">
      <CardContent className="pt-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Input
              className="mb-2 rounded-none border-0 bg-transparent px-0 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 shadow-none focus-visible:ring-0"
              value={notesTitle}
              onChange={(e) => setNotesTitle(e.target.value)}
            />
            <RichTextEditor
              value={invoice.notes || ''}
              onChange={(val) => updateInvoice('notes', val)}
              placeholder="Notes to client..."
            />
          </div>
          <div>
            <Input
              className="mb-2 rounded-none border-0 bg-transparent px-0 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 shadow-none focus-visible:ring-0"
              value={termsTitle}
              onChange={(e) => setTermsTitle(e.target.value)}
            />
            <RichTextEditor
              value={invoice.terms || ''}
              onChange={(val) => updateInvoice('terms', val)}
              placeholder="Terms and conditions..."
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
