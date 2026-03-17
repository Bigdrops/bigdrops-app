import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/supabase'
import ClientSelector from '@/components/ClientSelector'
import ColumnManager from '@/components/ColumnManager'
import MobileItemCard from '@/components/MobileItemCard'
import UnitInput from '@/components/UnitInput'
import InvoiceFormActions from '@/components/invoice/InvoiceFormActions'
import InvoiceNotesTermsSection from '@/components/invoice/InvoiceNotesTermsSection'
import InvoiceCustomBottomFieldsSection from '@/components/invoice/InvoiceCustomBottomFieldsSection'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  buildCalculationInputs,
  calcTotals,
  makeEmptyItem,
  makeFieldEntry,
  useInvoiceColumns,
} from '@/components/useInvoiceColumns.jsx'
import { toDbItem } from '@/domain/invoice'
import type { ColumnConfig, InvoiceFieldEntry, InvoiceItem } from '@/domain/invoice'
import { buildQuotationFormState, type DbQuotation, type DbQuotationItem, type Quotation } from '@/domain/quotation'
import { QUOTATION_STATUSES, formatQuotationStatus } from './quotationStatus'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

function nextQuotationNumber(rows: Array<Pick<DbQuotation, 'quotation_number'>>) {
  const next =
    rows
      .map((row) => String(row.quotation_number || ''))
      .map((value) => {
        const match = value.match(/(\d+)(?!.*\d)/)
        return match ? Number(match[1]) : null
      })
      .filter((value): value is number => Number.isFinite(value))
      .reduce((max, value) => Math.max(max, value), 0) + 1
  return `QUO-${String(next).padStart(3, '0')}`
}

function buildCustomFields({
  quotation,
  columns,
  headerFields,
  bottomFields,
  discountType,
  discountTiming,
  whtType,
  notesTitle,
  termsTitle,
  mergeQtyUnit,
  showItemImages,
}: {
  quotation: Quotation
  columns: ColumnConfig[]
  headerFields: InvoiceFieldEntry[]
  bottomFields: InvoiceFieldEntry[]
  discountType: 'fixed' | 'percent'
  discountTiming: 'before' | 'after'
  whtType: 'fixed' | 'percent'
  notesTitle: string
  termsTitle: string
  mergeQtyUnit: boolean
  showItemImages: boolean
}) {
  return {
    quotationTitle: quotation.quotation_title || '',
    clientName: quotation.client_name || '',
    notesHtml: quotation.notes || '',
    termsHtml: quotation.terms || '',
    header: headerFields.filter((field) => field.label && field.value),
    bottom: bottomFields.filter((field) => field.text),
    columnConfig: columns,
    notesTitle,
    termsTitle,
    mergeQtyUnit,
    showItemImages,
    discountType,
    discountTiming,
    whtType,
    calculationInputs: buildCalculationInputs({
      invoice: quotation,
      discountType,
      discountTiming,
      whtType,
    }),
  }
}

function toQuotationItem(item: InvoiceItem, quotationId: string, sortOrder: number) {
  const row = toDbItem(item, quotationId, sortOrder) as Record<string, unknown>
  delete row.invoice_id
  return { ...row, quotation_id: quotationId }
}

export default function QuotationForm({ mode, quotationId }: { mode: 'new' | 'edit'; quotationId?: string }) {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const isEdit = mode === 'edit'
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [showColumnManager, setShowColumnManager] = useState(false)
  const [quotation, setQuotation] = useState<Quotation>({
    quotation_number: '',
    client_id: '',
    client_name: '',
    issue_date: new Date().toISOString().split('T')[0],
    valid_until: '',
    status: 'draft',
    quotation_title: '',
    notes: '',
    terms: '',
    workmanship: 0,
    transportation: 0,
    shipping: 0,
    discount: 0,
    vat: 7.5,
    wht: 0,
  })
  const [headerFields, setHeaderFields] = useState<InvoiceFieldEntry[]>([])
  const [bottomFields, setBottomFields] = useState<InvoiceFieldEntry[]>([])
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed')
  const [discountTiming, setDiscountTiming] = useState<'before' | 'after'>('after')
  const [whtType, setWhtType] = useState<'fixed' | 'percent'>('percent')
  const [notesTitle, setNotesTitle] = useState('Notes')
  const [termsTitle, setTermsTitle] = useState('Terms and Conditions')
  const [mergeQtyUnit, setMergeQtyUnit] = useState(false)
  const [showItemImages, setShowItemImages] = useState(false)
  const [items, setItems] = useState<InvoiceItem[]>([
    { ...makeEmptyItem(), row_type: 'standard', group_id: null, group_name: '' },
  ])
  const {
    columns,
    setColumns,
    isVisible,
    getColumn,
    toggleVisible,
    updateColumn,
    addCustomColumn,
    removeCustomColumn,
    resetColumns,
    moveColumn,
    customColumns,
  } = useInvoiceColumns()

  useEffect(() => {
    const load = async () => {
      if (isEdit && quotationId) {
        const [{ data: quotationRow, error }, { data: itemRows }] = await Promise.all([
          supabase.from('quotations').select('*').eq('id', quotationId).single(),
          supabase.from('quotation_items').select('*').eq('quotation_id', quotationId).order('sort_order'),
        ])
        if (error || !quotationRow) {
          alert('Quotation not found.')
          navigate('/quotations')
          return
        }
        const state = buildQuotationFormState(
          quotationRow as DbQuotation,
          (itemRows || []) as DbQuotationItem[],
        )
        setQuotation(state.quotation)
        setItems(state.items)
        setColumns(state.columns)
        setHeaderFields(state.headerFields)
        setBottomFields(state.bottomFields)
        setDiscountType(state.discountType)
        setDiscountTiming(state.discountTiming)
        setWhtType(state.whtType)
        setNotesTitle(state.notesTitle)
        setTermsTitle(state.termsTitle)
        setMergeQtyUnit(state.mergeQtyUnit)
        setShowItemImages(state.showItemImages)
        setLoading(false)
        return
      }
      const { data } = await supabase
        .from('quotations')
        .select('quotation_number')
        .order('created_at', { ascending: false })
        .limit(100)
      setQuotation((current) => ({
        ...current,
        quotation_number: nextQuotationNumber((data || []) as Array<Pick<DbQuotation, 'quotation_number'>>),
      }))
    }
    load()
  }, [isEdit, navigate, quotationId, setColumns])

  const updateQuotation = <K extends keyof Quotation>(field: K, value: Quotation[K]) =>
    setQuotation((current) => ({ ...current, [field]: value }))

  const updateItem = (index: number, field: string, value: unknown) =>
    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item
        if (field === 'custom_data') return { ...item, custom_data: value as InvoiceItem['custom_data'] }
        return { ...item, [field]: value }
      }),
    )

  const totals = useMemo(
    () =>
      calcTotals({
        items,
        columns,
        invoice: quotation,
        discountType,
        discountTiming,
        whtType,
      }),
    [columns, discountTiming, discountType, items, quotation, whtType],
  )

  const handleSave = async (status: Quotation['status']) => {
    setSaving(true)
    const payload = {
      quotation_number: quotation.quotation_number || '',
      quotation_title: quotation.quotation_title || null,
      client_id: quotation.client_id || null,
      client_name: quotation.client_name || '',
      issue_date: quotation.issue_date || null,
      valid_until: quotation.valid_until || null,
      status: status || 'draft',
      notes: quotation.notes || '',
      terms: quotation.terms || '',
      workmanship: Number(quotation.workmanship || 0),
      transportation: Number(quotation.transportation || 0),
      shipping: Number(quotation.shipping || 0),
      discount: totals.discountAmount,
      vat: totals.vatAmount,
      wht: totals.whtAmount,
      subtotal: totals.rawSubtotal,
      install_rate_total: totals.installRateTotal,
      total: totals.totalPayable,
      amount_in_words: quotation.amount_in_words || '',
      custom_fields: JSON.stringify(
        buildCustomFields({
          quotation,
          columns,
          headerFields,
          bottomFields,
          discountType,
          discountTiming,
          whtType,
          notesTitle,
          termsTitle,
          mergeQtyUnit,
          showItemImages,
        }),
      ),
    }
    const quoteQuery =
      isEdit && quotationId
        ? supabase.from('quotations').update(payload).eq('id', quotationId).select().single()
        : supabase.from('quotations').insert([payload]).select().single()
    const { data: savedQuotation, error } = await quoteQuery
    if (error || !savedQuotation) {
      alert('Error saving quotation: ' + (error?.message || 'Unknown error'))
      setSaving(false)
      return
    }
    const resolvedId = String(savedQuotation.id)
    const itemRows = items
      .filter((item) => item.description?.trim())
      .map((item, index) => toQuotationItem(item, resolvedId, index))
    const { error: deleteError } = await supabase.from('quotation_items').delete().eq('quotation_id', resolvedId)
    if (deleteError) {
      alert('Error clearing quotation items: ' + deleteError.message)
      setSaving(false)
      return
    }
    if (itemRows.length > 0) {
      const { error: itemError } = await supabase.from('quotation_items').insert(itemRows)
      if (itemError) {
        alert('Error saving quotation items: ' + itemError.message)
        setSaving(false)
        return
      }
    }
    setSaving(false)
    navigate(`/quotations/${resolvedId}`)
  }

  if (loading) {
    return <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-sm text-zinc-500 shadow-sm">Loading quotation...</div>
  }

  const visibleCustomColumns = customColumns.filter((column: ColumnConfig) => column.visible)

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="m-0 text-[24px] font-extrabold text-slate-900">{isEdit ? 'Edit Quotation' : 'New Quotation'}</h2>
          <p className="mt-1 text-sm text-slate-500">Real Supabase quotation flow using the shared invoice domain underneath.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => setShowColumnManager(true)}>Table & Tax Settings</Button>
          <Button type="button" variant="outline" onClick={() => navigate('/quotations')}>Back to Quotations</Button>
        </div>
      </div>

      {showColumnManager && (
        <ColumnManager
          columns={columns}
          onUpdate={updateColumn}
          onToggle={toggleVisible}
          onAddCustom={addCustomColumn}
          onRemoveCustom={removeCustomColumn}
          onReset={resetColumns}
          onMove={moveColumn}
          onClose={() => setShowColumnManager(false)}
          vat={quotation.vat}
          setVat={(value: number) => updateQuotation('vat', value)}
          wht={quotation.wht}
          setWht={(value: number) => updateQuotation('wht', value)}
          whtType={whtType}
          setWhtType={setWhtType}
        />
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Card className="rounded-2xl border-zinc-200">
            <CardContent className="grid gap-4 pt-6 md:grid-cols-2">
              <div>
                <Label>Quotation Number</Label>
                <Input className="mt-2" value={quotation.quotation_number || ''} onChange={(e) => updateQuotation('quotation_number', e.target.value)} />
              </div>
              <div>
                <Label>Status</Label>
                <select className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm text-slate-900" value={quotation.status || 'draft'} onChange={(e) => updateQuotation('status', e.target.value as Quotation['status'])}>
                  {QUOTATION_STATUSES.map((status) => <option key={status} value={status}>{formatQuotationStatus(status)}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <Label>Quotation Title</Label>
                <Input className="mt-2" value={quotation.quotation_title || ''} onChange={(e) => updateQuotation('quotation_title', e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <ClientSelector
                  clientId={quotation.client_id}
                  clientName={quotation.client_name}
                  isMobile={isMobile}
                  onClientChange={(clientId: string, clientName: string) => {
                    updateQuotation('client_id', clientId)
                    updateQuotation('client_name', clientName)
                  }}
                />
              </div>
              <div>
                <Label>Issue Date</Label>
                <Input className="mt-2" type="date" value={quotation.issue_date || ''} onChange={(e) => updateQuotation('issue_date', e.target.value)} />
              </div>
              <div>
                <Label>Valid Until</Label>
                <Input className="mt-2" type="date" value={quotation.valid_until || ''} onChange={(e) => updateQuotation('valid_until', e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-zinc-200">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">Header Fields</CardTitle>
                <Button type="button" variant="ghost" className="h-auto p-0 text-sm font-bold text-indigo-500" onClick={() => setHeaderFields((current) => [...current, makeFieldEntry({ label: '', value: '' })])}>+ Add Header Field</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {headerFields.length === 0 && <div className="text-sm italic text-slate-400">No custom header fields yet.</div>}
              {headerFields.map((field) => (
                <div key={field.id} className="grid gap-2 md:grid-cols-[160px_minmax(0,1fr)_40px]">
                  <Input value={field.label || ''} onChange={(e) => setHeaderFields((current) => current.map((entry) => entry.id === field.id ? { ...entry, label: e.target.value } : entry))} placeholder="Label" />
                  <Input value={field.value || ''} onChange={(e) => setHeaderFields((current) => current.map((entry) => entry.id === field.id ? { ...entry, value: e.target.value } : entry))} placeholder="Value" />
                  <Button type="button" variant="ghost" className="h-10 px-2 text-xl text-red-700" onClick={() => setHeaderFields((current) => current.filter((entry) => entry.id !== field.id))}>×</Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-zinc-200">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">Line Items</CardTitle>
                <Button type="button" onClick={() => setItems((current) => [...current, { ...makeEmptyItem(), row_type: 'standard', group_id: null, group_name: '', sort_order: current.length }])}>+ Add Item</Button>
              </div>
            </CardHeader>
            <CardContent>
              {isMobile ? (
                items.map((item, index) => (
                  <MobileItemCard
                    key={item._uiKey || item.id || `quotation_item_${index}`}
                    item={item}
                    index={index}
                    number={index + 1}
                    isVisible={isVisible}
                    getColumn={getColumn}
                    customColumns={visibleCustomColumns}
                    showItemImages={showItemImages}
                    invoice={quotation}
                    isFirst={index === 0}
                    isLast={index === items.length - 1}
                    onUpdate={(itemIndex: number, field: string, value: unknown) => {
                      if (field === '__install_rate_override') {
                        setItems((current) => current.map((entry, entryIndex) => entryIndex === itemIndex ? { ...entry, ...(value as object) } : entry))
                        return
                      }
                      updateItem(itemIndex, field, value)
                    }}
                    onRemove={(itemIndex: number) => setItems((current) => current.filter((_, entryIndex) => entryIndex !== itemIndex).map((entry, entryIndex) => ({ ...entry, sort_order: entryIndex })))}
                    onMoveUp={(itemIndex: number) => {
                      const newIndex = itemIndex - 1
                      if (newIndex < 0) return
                      setItems((current) => {
                        const next = [...current]
                        ;[next[itemIndex], next[newIndex]] = [next[newIndex], next[itemIndex]]
                        return next.map((entry, entryIndex) => ({ ...entry, sort_order: entryIndex }))
                      })
                    }}
                    onMoveDown={(itemIndex: number) => {
                      const newIndex = itemIndex + 1
                      if (newIndex >= items.length) return
                      setItems((current) => {
                        const next = [...current]
                        ;[next[itemIndex], next[newIndex]] = [next[newIndex], next[itemIndex]]
                        return next.map((entry, entryIndex) => ({ ...entry, sort_order: entryIndex }))
                      })
                    }}
                    onInsertBelow={(itemIndex: number) => setItems((current) => {
                      const next = [...current]
                      next.splice(itemIndex + 1, 0, { ...makeEmptyItem(), row_type: 'standard', group_id: null, group_name: '', sort_order: itemIndex + 1 })
                      return next.map((entry, entryIndex) => ({ ...entry, sort_order: entryIndex }))
                    })}
                  />
                ))
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500">
                        <th className="px-2 py-3">#</th>
                        <th className="px-2 py-3">Description</th>
                        {isVisible('make') && <th className="px-2 py-3">Make</th>}
                        <th className="px-2 py-3">Qty</th>
                        {isVisible('unit') && <th className="px-2 py-3">Unit</th>}
                        <th className="px-2 py-3">Rate</th>
                        {isVisible('install_rate') && <th className="px-2 py-3">Install</th>}
                        {isVisible('vat_rate') && <th className="px-2 py-3">VAT %</th>}
                        {isVisible('discount_rate') && <th className="px-2 py-3">Disc %</th>}
                        {visibleCustomColumns.map((column) => <th key={column.key} className="px-2 py-3">{column.label}</th>)}
                        <th className="px-2 py-3">Amount</th>
                        <th className="px-2 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={item._uiKey || item.id || index} className="border-b border-zinc-100 align-top">
                          <td className="px-2 py-3 text-sm font-semibold text-zinc-500">{index + 1}</td>
                          <td className="px-2 py-3 min-w-[260px]">
                            <Input value={item.description || ''} onChange={(e) => updateItem(index, 'description', e.target.value)} placeholder="Item description" />
                            <Input className="mt-2" value={item.sub_description || ''} onChange={(e) => updateItem(index, 'sub_description', e.target.value)} placeholder="Sub-description" />
                          </td>
                          {isVisible('make') && <td className="px-2 py-3"><Input value={item.make || ''} onChange={(e) => updateItem(index, 'make', e.target.value)} /></td>}
                          <td className="px-2 py-3 min-w-[88px]"><Input type="number" min="0" value={item.quantity || 0} onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))} /></td>
                          {isVisible('unit') && <td className="px-2 py-3 min-w-[120px]"><UnitInput value={item.unit || ''} onChange={(value: string) => updateItem(index, 'unit', value)} /></td>}
                          <td className="px-2 py-3 min-w-[110px]"><Input type="number" min="0" value={item.unit_price || 0} onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))} /></td>
                          {isVisible('install_rate') && <td className="px-2 py-3 min-w-[110px]"><Input type="number" min="0" value={item.install_rate_override ? item.install_rate ?? '' : ''} onChange={(e) => { const value = e.target.value; updateItem(index, 'install_rate_override', value !== ''); updateItem(index, 'install_rate', value === '' ? null : Number(value)) }} /></td>}
                          {isVisible('vat_rate') && <td className="px-2 py-3 min-w-[90px]"><Input type="number" min="0" max="100" value={item.vat_rate ?? ''} placeholder={String(quotation.vat || 0)} onChange={(e) => updateItem(index, 'vat_rate', e.target.value === '' ? null : Number(e.target.value))} /></td>}
                          {isVisible('discount_rate') && <td className="px-2 py-3 min-w-[90px]"><Input type="number" min="0" max="100" value={item.discount_rate ?? ''} placeholder="global" onChange={(e) => updateItem(index, 'discount_rate', e.target.value === '' ? null : Number(e.target.value))} /></td>}
                          {visibleCustomColumns.map((column) => <td key={column.key} className="px-2 py-3 min-w-[110px]"><Input type={column.type === 'number' ? 'number' : 'text'} value={(item.custom_data || {})[column.key] || ''} onChange={(e) => updateItem(index, 'custom_data', { ...(item.custom_data || {}), [column.key]: column.type === 'number' ? Number(e.target.value || 0) : e.target.value })} /></td>)}
                          <td className="px-2 py-3 text-sm font-bold text-zinc-900">₦{(Number(item.quantity || 0) * Number(item.unit_price || 0)).toLocaleString()}</td>
                          <td className="px-2 py-3"><Button type="button" variant="ghost" size="sm" className="text-red-700" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index).map((entry, itemIndex) => ({ ...entry, sort_order: itemIndex })))}>×</Button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <InvoiceNotesTermsSection
            invoice={quotation}
            updateInvoice={updateQuotation}
            notesTitle={notesTitle}
            setNotesTitle={setNotesTitle}
            termsTitle={termsTitle}
            setTermsTitle={setTermsTitle}
          />

          <InvoiceCustomBottomFieldsSection
            bottomFields={bottomFields}
            setBottomFields={setBottomFields}
            emptyStateText="No custom footer fields yet."
            placeholder="Add a footer field"
          />
        </div>

        <div className="space-y-5">
          <Card className="rounded-2xl border-zinc-200">
            <CardHeader><CardTitle className="text-base">Totals Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label>Global VAT</Label><Input className="mt-2" type="number" min="0" value={quotation.vat || 0} onChange={(e) => updateQuotation('vat', Number(e.target.value))} /></div>
                <div><Label>Discount</Label><Input className="mt-2" type="number" min="0" value={quotation.discount || 0} onChange={(e) => updateQuotation('discount', Number(e.target.value))} /></div>
                <div><Label>Discount Type</Label><select className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm text-slate-900" value={discountType} onChange={(e) => setDiscountType(e.target.value as 'fixed' | 'percent')}><option value="fixed">Fixed</option><option value="percent">Percent</option></select></div>
                <div><Label>Discount Timing</Label><select className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm text-slate-900" value={discountTiming} onChange={(e) => setDiscountTiming(e.target.value as 'before' | 'after')}><option value="after">After Tax</option><option value="before">Before Tax</option></select></div>
                <div><Label>WHT</Label><Input className="mt-2" type="number" min="0" value={quotation.wht || 0} onChange={(e) => updateQuotation('wht', Number(e.target.value))} /></div>
                <div><Label>WHT Type</Label><select className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm text-slate-900" value={whtType} onChange={(e) => setWhtType(e.target.value as 'fixed' | 'percent')}><option value="percent">Percent</option><option value="fixed">Fixed</option></select></div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-zinc-200">
            <CardHeader><CardTitle className="text-base">Totals</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                ['Subtotal', totals.rawSubtotal],
                ['Install Rate Total', totals.installRateTotal],
                ['VAT', totals.vatAmount],
                ['Discount', totals.discountAmount],
                ['WHT', totals.whtAmount],
                ['Total Payable', totals.totalPayable],
              ].map(([label, value]) => <div key={label} className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2"><span className="font-medium text-zinc-600">{label}</span><span className="font-bold text-zinc-900">₦{Number(value || 0).toLocaleString()}</span></div>)}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3"><div className="flex items-center justify-between"><div><div className="text-sm font-semibold text-zinc-800">Merge Qty + Unit in output</div><div className="text-xs text-zinc-500">Stored with quotation custom fields for consistent rendering.</div></div><Switch checked={mergeQtyUnit} onCheckedChange={setMergeQtyUnit} /></div></div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3"><div className="flex items-center justify-between"><div><div className="text-sm font-semibold text-zinc-800">Show item images in output</div><div className="text-xs text-zinc-500">Prepared for shared document rendering behavior.</div></div><Switch checked={showItemImages} onCheckedChange={setShowItemImages} /></div></div>
            </CardContent>
          </Card>

          <InvoiceFormActions
            saving={saving}
            primaryLabel={isEdit ? 'Save Quotation' : 'Create Quotation'}
            onSaveSent={() => handleSave('sent')}
            onSaveDraft={() => handleSave('draft')}
            onCancel={() => navigate('/quotations')}
          />
        </div>
      </div>
    </div>
  )
}
