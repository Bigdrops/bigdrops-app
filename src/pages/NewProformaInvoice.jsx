import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import UnitInput from '../components/UnitInput'
import ClientSelector from '../components/ClientSelector'
import ColumnManager from '../components/ColumnManager'
import ItemImageUpload from '../components/ItemImageUpload'
import AttachmentsPanel from '../components/AttachmentsPanel'
import MobileItemCard from '../components/MobileItemCard'
import InvoiceFormActions from '../components/invoice/InvoiceFormActions'
import InvoicePaymentTermsSection from '../components/invoice/InvoicePaymentTermsSection'
import InvoiceCustomBottomFieldsSection from '../components/invoice/InvoiceCustomBottomFieldsSection'
import InvoiceNotesTermsSection from '../components/invoice/InvoiceNotesTermsSection'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  makeEmptyItem,
  makeEmptyGroup,
  makeExtraCharge,
  makeFieldEntry,
  toDbItem,
  useInvoiceColumns,
  buildCalculationInputs,
  ensureUiKey,
} from '../components/useInvoiceColumns.jsx'
import { computeDocument } from '../lib/Calculations'
import {
  inp,
  makeGroupId,
  numberToWords,
  sec,
  secT,
  tog,
  useIsNarrow,
} from '../hooks/useInvoiceForm'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

export default function NewProformaInvoice() {
  const navigate = useNavigate()

  const [saving, setSaving] = useState(false)
  const [discountType, setDiscountType] = useState('fixed')
  const [discountTiming, setDiscountTiming] = useState('after')
  const [whtType, setWhtType] = useState('percent')
  const [showColumnManager, setShowColumnManager] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [mergeQtyUnit, setMergeQtyUnit] = useState(false)
  const [showItemImages, setShowItemImages] = useState(false)
  const [attachments, setAttachments] = useState([])
  const {
    columns,
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
  const isMobile = useIsMobile()
  const isNarrow = useIsNarrow()

  const [invoiceTitle, setInvoiceTitle] = useState('')
  const [invoice, setInvoice] = useState({
    invoice_number: '',
    po_number: '',
    client_id: '',
    client_name: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '',
    status: 'draft',
    document_type: 'PROFORMA',
    payment_terms: 'Net 30',
    custom_payment_terms: '',
    notes: '',
    terms: '',
    workmanship: 0,
    transportation: 0,
    shipping: 0,
    discount: 0,
    vat: 7.5,
    wht: 0,
    is_advance: false,
    advance_percentage: 0,
    work_duration: '',
    amount_in_words: '',
  })

  const [items, setItems] = useState([
    { ...makeEmptyItem(), row_type: 'standard', group_id: null, group_name: '' },
  ])

  const [groups, setGroups] = useState([])

  useEffect(() => {
    supabase
      .from('invoices')
      .select('invoice_number')
      .eq('document_type', 'PROFORMA')
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const match = data[0].invoice_number.match(/SASPRO-(\d+)/)
          const num = match ? parseInt(match[1]) + 1 : 1
          setInvoice((i) => ({
            ...i,
            invoice_number: 'SASPRO-' + String(num).padStart(3, '0'),
          }))
        } else {
          setInvoice((i) => ({ ...i, invoice_number: 'SASPRO-001' }))
        }
      })
  }, [])

  const updateInvoice = (field, value) =>
    setInvoice((i) => ({ ...i, [field]: value }))

  const updateItem = (index, field, value) =>
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, [field]: value } : it))
    )

  const addUngroupedItem = (insertAt = null) => {
    setItems((prev) => {
      const newItem = {
        ...makeEmptyItem(),
        row_type: 'standard',
        group_id: null,
        group_name: '',
      }
      if (insertAt === null || insertAt >= prev.length) {
        return [...prev, { ...newItem, sort_order: prev.length }]
      }
      const next = [...prev]
      next.splice(insertAt, 0, { ...newItem, sort_order: insertAt })
      return next.map((it, idx) => ({ ...it, sort_order: idx }))
    })
  }

  const addItem = () => addUngroupedItem()

  const removeItem = (index) =>
    setItems((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((item, idx) => ({ ...item, sort_order: idx }))
    )

  const insertItemAfter = (index) => addUngroupedItem(index + 1)

  const moveItem = (index, dir) => {
    const newIdx = index + dir
    if (newIdx < 0 || newIdx >= items.length) return
    const next = [...items]
    ;[next[index], next[newIdx]] = [next[newIdx], next[index]]
    setItems(next.map((item, idx) => ({ ...item, sort_order: idx })))
  }

  const addGroup = () => {
    const base = makeEmptyGroup()
    const id = base.id || makeGroupId()
    const group = {
      ...base,
      id,
      name: base.name || `Group ${groups.length + 1}`,
      showSubtotal: !!base.showSubtotal,
    }

    setGroups((prev) => [...prev, group])
    setItems((prev) => [
      ...prev.map((item, idx) => ({ ...item, sort_order: idx })),
      {
        ...makeEmptyItem(),
        row_type: 'group_header',
        group_id: group.id,
        group_name: group.name,
        sort_order: prev.length,
      },
    ])
  }

  const updateGroupName = (groupId, newName) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, name: newName } : g))
    )
    setItems((prev) =>
      prev.map((item) =>
        item.group_id === groupId ? { ...item, group_name: newName } : item
      )
    )
  }

  const toggleGroupSubtotal = (groupId) =>
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, showSubtotal: !g.showSubtotal } : g
      )
    )

  const deleteGroup = (groupId) => {
    setGroups((prev) => prev.filter((g) => g.id !== groupId))
    setItems((prev) =>
      prev
        .filter(
          (item) => !(item.row_type === 'group_header' && item.group_id === groupId)
        )
        .map((item, idx) =>
          item.group_id === groupId
            ? { ...item, group_id: null, group_name: '', sort_order: idx }
            : { ...item, sort_order: idx }
        )
    )
  }

  const addItemToGroup = (groupId) => {
    const group = groups.find((g) => g.id === groupId)
    if (!group) return

    setItems((prev) => {
      let insertAt = prev.findIndex(
        (item) => item.row_type === 'group_header' && item.group_id === groupId
      )

      if (insertAt === -1) insertAt = prev.length - 1

      for (let i = insertAt + 1; i < prev.length; i++) {
        if (prev[i].row_type === 'group_header') break
        if (prev[i].group_id === groupId) {
          insertAt = i
        }
      }

      const newItem = {
        ...makeEmptyItem(),
        row_type: 'standard',
        group_id: groupId,
        group_name: group.name,
      }

      const next = [...prev]
      next.splice(insertAt + 1, 0, newItem)
      return next.map((item, idx) => ({ ...item, sort_order: idx }))
    })
  }

  const calculationInputs = buildCalculationInputs({
    invoice,
    discountType,
    discountTiming,
    whtType,
  })

  const documentTotals = computeDocument({
    items,
    document: {
      ...invoice,
      workmanship: Number(invoice.workmanship || 0),
      transportation: Number(invoice.transportation || 0),
      shipping: Number(invoice.shipping || 0),
    },
    cf: {
      extraCharges,
      calculationInputs,
    },
  })

  const computedItems = documentTotals.items
  const computedGroups = new Map(
    documentTotals.groups.map((group) => [group.group_id, group])
  )
  const rawSubtotal = documentTotals.subtotal
  const installRateTotal = documentTotals.installRateTotal
  const vatAmount = documentTotals.vat
  const discountAmount = documentTotals.discount
  const grandTotal = documentTotals.grandTotal
  const whtAmount = documentTotals.wht
  const totalPayable = documentTotals.totalPayable

  const handleSave = async (status) => {
    setSaving(true)

    const groupMeta = {}
    groups.forEach((g) => {
      groupMeta[g.id] = { name: g.name, showSubtotal: g.showSubtotal }
    })

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
      groupMeta,
      template: 'proforma',
    }

    const paymentTermsValue =
      invoice.payment_terms === 'Custom'
        ? invoice.custom_payment_terms
        : invoice.payment_terms

    const { data: inv, error } = await supabase
      .from('invoices')
      .insert([
        {
          invoice_number: invoice.invoice_number,
          po_number: String(invoice.po_number || '').trim() || null,
          invoice_title: invoiceTitle || null,
          client_id: invoice.client_id || null,
          client_name: invoice.client_name,
          issue_date: invoice.issue_date,
          due_date: invoice.due_date || null,
          status,
          document_type: 'PROFORMA',
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
        },
      ])
      .select()
      .single()

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
      .map((item, i) => toDbItem(item, inv.id, i))

    if (itemsToSave.length > 0) {
      await supabase.from('invoice_items').insert(itemsToSave)
    }

    setSaving(false)
    navigate('/invoices/' + inv.id)
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">New Proforma Invoice</h1>
            <p className="text-sm text-gray-500 mt-1">Create a new proforma invoice</p>
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
                  value={invoice.po_number}
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
                  value={invoice.issue_date}
                  onChange={(e) => updateInvoice('issue_date', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="due_date">Valid Until</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={invoice.due_date}
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
                <span className="text-gray-600">VAT ({invoice.vat}%)</span>
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
          <Button variant="outline" onClick={() => navigate('/invoices')}>
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
