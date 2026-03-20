import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import ClientSelector from '../components/ClientSelector'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  makeEmptyItem,
  toDbItem,
  useInvoiceColumns,
  buildCalculationInputs,
  ensureUiKey,
  normalizeExtraCharges,
  normalizeFieldEntries,
  BUILTIN_COLUMNS,
} from '../components/useInvoiceColumns.jsx'
import { computeDocument } from '../lib/Calculations'
import { numberToWords } from '../hooks/useInvoiceForm'

export default function EditProformaInvoice() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [discountType, setDiscountType] = useState('fixed')
  const [discountTiming, setDiscountTiming] = useState('after')
  const [whtType, setWhtType] = useState('percent')
  const [mergeQtyUnit, setMergeQtyUnit] = useState(false)
  const [showItemImages, setShowItemImages] = useState(false)
  const [attachments, setAttachments] = useState([])
  const {
    columns,
    setColumns,
  } = useInvoiceColumns()

  const [customFields, setCustomFields] = useState([])
  const [bottomFields, setBottomFields] = useState([])
  const [extraCharges, setExtraCharges] = useState([])
  const [chargeLabels, setChargeLabels] = useState({
    workmanship: 'Workmanship',
    transportation: 'Transportation',
    shipping: 'Shipping',
  })
  const [notesTitle, setNotesTitle] = useState('Notes')
  const [termsTitle, setTermsTitle] = useState('Terms and Conditions')
  const [invoiceTitle, setInvoiceTitle] = useState('')
  const [invoice, setInvoice] = useState(null)
  const [items, setItems] = useState([
    { ...makeEmptyItem(), row_type: 'standard', group_id: null, group_name: '' },
  ])

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('invoices').select('*').eq('id', id).single()
      if (!data) {
        navigate('/invoices')
        return
      }

      let parsedCustomFields = null
      try {
        const parsed = JSON.parse(data.custom_fields || '{}')
        parsedCustomFields = parsed
        if (parsed && !Array.isArray(parsed)) {
          setCustomFields(normalizeFieldEntries(parsed.header, 'value'))
          setBottomFields(normalizeFieldEntries(parsed.bottom, 'text'))
          setExtraCharges(normalizeExtraCharges(parsed.extraCharges))
          if (parsed.chargeLabels) setChargeLabels(parsed.chargeLabels)
          if (parsed.columnConfig) {
            const merged = parsed.columnConfig.map((saved) => {
              const base = BUILTIN_COLUMNS.find((b) => b.key === saved.key)
              return base ? { ...base, ...saved } : saved
            })
            setColumns(merged)
          }
          if (parsed.notesTitle) setNotesTitle(parsed.notesTitle)
          if (parsed.termsTitle) setTermsTitle(parsed.termsTitle)
          if (parsed.attachments) setAttachments(parsed.attachments)
          if (parsed.mergeQtyUnit) setMergeQtyUnit(parsed.mergeQtyUnit)
          if (parsed.showItemImages) setShowItemImages(parsed.showItemImages)
          if (parsed.discountType) setDiscountType(parsed.discountType)
          if (parsed.discountTiming) setDiscountTiming(parsed.discountTiming)
          if (parsed.whtType) setWhtType(parsed.whtType)
        } else if (Array.isArray(parsed)) {
          setCustomFields(normalizeFieldEntries(parsed, 'value'))
        }
      } catch (e) {}

      if (data.invoice_title) setInvoiceTitle(data.invoice_title)

      const { data: itemData } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', id)
        .order('sort_order')

      const loaded = (itemData && itemData.length > 0 ? itemData : [makeEmptyItem()]).map((item) => ({
        ...ensureUiKey(item),
        row_type: item.row_type || 'standard',
        group_id: item.group_id || null,
        group_name: item.group_name || '',
        custom_data:
          typeof item.custom_data === 'string'
            ? JSON.parse(item.custom_data || '{}')
            : item.custom_data || {},
        image_url: item.image_url || null,
      }))

      setItems(loaded)
      setInvoice(data)
      setLoading(false)
    }

    load()
  }, [id, navigate, setColumns])

  const updateInvoice = (field, value) => setInvoice((i) => ({ ...i, [field]: value }))

  const updateItem = (index, field, value) =>
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    )

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { ...makeEmptyItem(), row_type: 'standard', group_id: null, group_name: '', sort_order: prev.length },
    ])
  }

  const removeItem = (index) =>
    setItems((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((item, idx) => ({ ...item, sort_order: idx }))
    )

  const calculationInputs = buildCalculationInputs({
    invoice: invoice || {},
    discountType,
    discountTiming,
    whtType,
  })

  const documentTotals = computeDocument({
    items,
    document: {
      ...(invoice || {}),
      workmanship: Number(invoice?.workmanship || 0),
      transportation: Number(invoice?.transportation || 0),
      shipping: Number(invoice?.shipping || 0),
    },
    cf: {
      extraCharges,
      calculationInputs,
    },
  })

  const rawSubtotal = documentTotals.subtotal
  const installRateTotal = documentTotals.installRateTotal
  const vatAmount = documentTotals.vat
  const discountAmount = documentTotals.discount
  const whtAmount = documentTotals.wht
  const totalPayable = documentTotals.totalPayable

  const handleSave = async (status) => {
    setSaving(true)

    const customFieldsData = {
      header: customFields.filter((f) => f.label && f.value),
      bottom: bottomFields.filter((f) => f.text),
      extraCharges: extraCharges.filter((c) => c.label),
      chargeLabels,
      columnConfig: columns,
      notesTitle,
      termsTitle,
      attachments,
      mergeQtyUnit,
      showItemImages,
      discountType,
      discountTiming,
      whtType,
      calculationInputs,
      template: 'proforma',
    }

    const paymentTermsValue =
      invoice.payment_terms === 'Custom'
        ? invoice.custom_payment_terms
        : invoice.payment_terms

    const { error } = await supabase
      .from('invoices')
      .update({
        invoice_title: invoiceTitle || null,
        po_number: String(invoice.po_number || '').trim() || null,
        client_id: invoice.client_id || null,
        client_name: invoice.client_name,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date || null,
        status,
        payment_terms: paymentTermsValue,
        notes: invoice.notes,
        terms: invoice.terms,
        workmanship: Number(invoice.workmanship || 0),
        transportation: Number(invoice.transportation || 0),
        shipping: Number(invoice.shipping || 0),
        discount: discountAmount,
        vat: vatAmount,
        wht: whtAmount,
        custom_fields: JSON.stringify(customFieldsData),
        work_duration: invoice.work_duration,
        subtotal: rawSubtotal,
        install_rate_total: installRateTotal,
        total: totalPayable,
        amount_in_words: numberToWords(totalPayable),
      })
      .eq('id', id)

    if (error) {
      alert('Error saving: ' + error.message)
      setSaving(false)
      return
    }

    const itemsToSave = items
      .filter((item) =>
        item.row_type === 'group_header'
          ? item.group_name?.trim()
          : item.description?.trim()
      )
      .map((item, i) => toDbItem(item, id, i))

    await supabase.from('invoice_items').delete().eq('invoice_id', id)

    if (itemsToSave.length > 0) {
      await supabase.from('invoice_items').insert(itemsToSave)
    }

    setSaving(false)
    navigate('/invoices/' + id)
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-green-600 rounded-full animate-spin" />
        </div>
      </Layout>
    )
  }

  if (!invoice) {
    return (
      <Layout>
        <div className="p-6 text-center text-gray-500">Proforma invoice not found</div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Proforma Invoice</h1>
            <p className="text-sm text-gray-500 mt-1">{invoice.invoice_number}</p>
          </div>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Proforma
          </Badge>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoice_number">Proforma Number</Label>
                <Input
                  id="invoice_number"
                  value={invoice.invoice_number}
                  onChange={(e) => updateInvoice('invoice_number', e.target.value)}
                  placeholder="SASPRO-001"
                />
              </div>
              <div>
                <Label htmlFor="po_number">PO Number (Optional)</Label>
                <Input
                  id="po_number"
                  value={invoice.po_number || ''}
                  onChange={(e) => updateInvoice('po_number', e.target.value)}
                  placeholder="Purchase order number"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="invoice_title">Invoice Title (Optional)</Label>
              <Input
                id="invoice_title"
                value={invoiceTitle}
                onChange={(e) => setInvoiceTitle(e.target.value)}
                placeholder="e.g., Supply of Office Equipment"
              />
            </div>

            <div>
              <Label>Client</Label>
              <ClientSelector
                value={invoice.client_id}
                onChange={(client) => {
                  updateInvoice('client_id', client?.id || '')
                  updateInvoice('client_name', client?.name || '')
                }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="issue_date">Issue Date</Label>
                <Input
                  id="issue_date"
                  type="date"
                  value={invoice.issue_date || ''}
                  onChange={(e) => updateInvoice('issue_date', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="due_date">Valid Until</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={invoice.due_date || ''}
                  onChange={(e) => updateInvoice('due_date', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Line Items</CardTitle>
              <Button onClick={addItem} size="sm" variant="outline">
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={item._uiKey || index} className="p-4 border rounded-lg bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-5">
                      <Label className="text-xs text-gray-500">Description</Label>
                      <Input
                        value={item.description || ''}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        placeholder="Item description"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs text-gray-500">Quantity</Label>
                      <Input
                        type="number"
                        value={item.quantity || ''}
                        onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                        placeholder="1"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs text-gray-500">Unit</Label>
                      <Input
                        value={item.unit || ''}
                        onChange={(e) => updateItem(index, 'unit', e.target.value)}
                        placeholder="PCS"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs text-gray-500">Unit Price</Label>
                      <Input
                        type="number"
                        value={item.unit_price || ''}
                        onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="md:col-span-1 flex items-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 text-right text-sm text-gray-600">
                    Line Total: ₦{((item.quantity || 0) * (item.unit_price || 0)).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>₦{rawSubtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">VAT ({invoice.vat || 7.5}%)</span>
                <span>₦{vatAmount.toLocaleString()}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>₦{totalPayable.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Notes & Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={invoice.notes || ''}
                onChange={(e) => updateInvoice('notes', e.target.value)}
                placeholder="Additional notes for the client"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="terms">Terms & Conditions</Label>
              <Textarea
                id="terms"
                value={invoice.terms || ''}
                onChange={(e) => updateInvoice('terms', e.target.value)}
                placeholder="Payment terms and conditions"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => navigate('/invoices/' + id)}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSave('draft')}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save as Draft'}
          </Button>
          <Button
            onClick={() => handleSave('sent')}
            disabled={saving}
            className="bg-green-600 hover:bg-green-700"
          >
            {saving ? 'Saving...' : 'Save & Send'}
          </Button>
        </div>
      </div>
    </Layout>
  )
}
