import { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatNaira } from '@/lib/formatters/money'
import { formatDisplayDate } from '@/lib/formatters/date'
import { ComplianceRecordType } from '@/domain/compliance/import/contracts'

interface PreviewCardProps {
  type: ComplianceRecordType
  data: any
}

function Field({ label, value, italic = false, bold = false }: { label: string; value: ReactNode; italic?: boolean; bold?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">{label}</span>
      <span className={`text-sm ${italic ? 'italic' : ''} ${bold ? 'font-bold text-slate-900 text-base' : 'text-slate-700'}`}>
        {value === null || value === undefined || value === '' ? <span className="text-slate-300 italic">—</span> : value}
      </span>
    </div>
  )
}

export default function ComplianceJsonPreviewCard({ type, data }: PreviewCardProps) {
  if (!data) return (
    <div className="text-center py-10 px-4 border border-dashed rounded-2xl bg-slate-50 text-slate-400 text-xs mt-4">
      Nothing to preview yet. Paste JSON and click Preview.
    </div>
  )

  const isVatInput = type === 'vat_input'
  const isFiling = type === 'tax_filing'
  const isWhtReceipt = type === 'wht_receipt'

  return (
    <Card className="border-emerald-100 bg-card shadow-sm mt-4 overflow-hidden border-2">
      <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-100 flex items-center justify-between">
        <span className="text-[10px] font-black uppercase text-emerald-700 tracking-widest">Parsed Preview</span>
        <Badge variant="outline" className="text-[9px] uppercase font-bold bg-bd-surface text-emerald-600 border-emerald-200">
          Ready to Save
        </Badge>
      </div>
      <CardContent className="p-4 space-y-4">
        {isVatInput && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Vendor" value={data.vendor_name} bold />
            <Field label="Date" value={formatDisplayDate(data.date)} />
            <Field label="Category" value={data.category} />
            <Field label="Reference" value={data.reference} />
            <Field label="Net Amount" value={formatNaira(data.net_amount)} />
            <Field label="VAT Amount" value={formatNaira(data.vat_amount)} bold />
            <div className="col-span-2">
              <Badge variant="outline" className={data.is_recoverable ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500'}>
                {data.is_recoverable ? 'Recoverable' : 'Non-Recoverable'}
              </Badge>
            </div>
            {data.notes && <div className="col-span-2"><Field label="Notes" value={data.notes} italic /></div>}
          </div>
        )}

        {isFiling && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tax Type" value={String(data.tax_type).toUpperCase()} bold />
            <Field label="Status" value={<Badge variant="outline" className="uppercase font-bold text-[10px]">{data.status}</Badge>} />
            <Field label="Period Start" value={formatDisplayDate(data.period_start)} />
            <Field label="Period End" value={formatDisplayDate(data.period_end)} />
            <Field label="Amount Due" value={formatNaira(data.amount_due)} bold />
            <Field label="Amount Paid" value={formatNaira(data.amount_paid)} />
            <Field label="Portal Ref" value={data.portal_reference} />
            <Field label="Receipt Ref" value={data.receipt_reference} />
            {data.submitted_at && <Field label="Submitted" value={formatDisplayDate(data.submitted_at)} />}
            {data.notes && <div className="col-span-2"><Field label="Notes" value={data.notes} italic /></div>}
          </div>
        )}

        {isWhtReceipt && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Client Name" value={data.client_name} bold />
            <Field label="WHT Amount" value={formatNaira(data.wht_amount)} bold />
            <Field label="Receipt No" value={data.receipt_number} />
            <Field label="Issue Date" value={formatDisplayDate(data.issue_date)} />
            <Field label="Gross Base" value={formatNaira(data.gross_base_amount)} />
            <Field label="WHT Rate" value={data.wht_rate ? `${data.wht_rate}%` : '—'} />
            <Field label="Status" value={<Badge variant="outline" className="uppercase font-bold text-[10px]">{data.receipt_status}</Badge>} />
            {data.notes && <div className="col-span-2"><Field label="Notes" value={data.notes} italic /></div>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
