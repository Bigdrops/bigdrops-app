import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import UnitInput from '../components/UnitInput'
import RichTextEditor from '../components/RichTextEditor'
import ClientSelector from '../components/ClientSelector'
import ColumnManager from '../components/ColumnManager'
import ItemImageUpload from '../components/ItemImageUpload'
import AttachmentsPanel from '../components/AttachmentsPanel'
import MobileItemCard from '../components/MobileItemCard'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  makeEmptyItem,
  makeEmptyGroup,
  toDbItem,
  useInvoiceColumns,
  calcTotals,
  BUILTIN_COLUMNS,
} from '../components/useInvoiceColumns.jsx'
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

export default function EditInvoice() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isMobile = useIsMobile()
  const isNarrow = useIsNarrow()

  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [discountType, setDiscountType] = useState('fixed')
  const [discountTiming, setDiscountTiming] = useState('after')
  const [whtType, setWhtType] = useState('percent')
  const [showCSVNote, setShowCSVNote] = useState(false)
  const [csvTab, setCSVTab] = useState('Upload File')
  const [pasteCSV, setPasteCSV] = useState('')
  const [showColumnManager, setShowColumnManager] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [mergeQtyUnit, setMergeQtyUnit] = useState(false)
  const [showItemImages, setShowItemImages] = useState(false)
  const [attachments, setAttachments] = useState([])
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
  const [groups, setGroups] = useState([])

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('invoices').select('*').eq('id', id).single()
      if (!data) {
        navigate('/invoices')
        return
      }

      setInvoice(data)
      if (data.invoice_title) setInvoiceTitle(data.invoice_title)

      let savedGroupMeta = {}
      try {
        const parsed = JSON.parse(data.custom_fields || '{}')
        if (parsed && !Array.isArray(parsed)) {
          setCustomFields(parsed.header || [])
          setBottomFields(parsed.bottom || [])
          setExtraCharges(parsed.extraCharges || [])
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
          if (parsed.groupMeta) savedGroupMeta = parsed.groupMeta
        } else if (Array.isArray(parsed)) {
          setCustomFields(parsed)
        }
      } catch (e) {}

      const { data: itemData } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', id)
        .order('sort_order')

      const loaded = (itemData && itemData.length > 0 ? itemData : [makeEmptyItem()]).map((item) => ({
        ...item,
        row_type: item.row_type || 'standard',
        group_id: item.group_id || null,
        group_name: item.group_name || '',
        custom_data:
          typeof item.custom_data === 'string'
            ? JSON.parse(item.custom_data || '{}')
            : item.custom_data || {},
        install_rate_override: !!(
          item.install_rate !== null &&
          item.install_rate !== undefined &&
          item.install_rate !== 0
        ),
        image_url: item.image_url || null,
      }))

      setItems(loaded)

      const discoveredGroups = []
      const seenGroupIds = new Set()
      loaded.forEach((item) => {
        if (item.row_type === 'group_header') {
          const gid = item.group_id || makeGroupId()
          if (!seenGroupIds.has(gid)) {
            seenGroupIds.add(gid)
            const meta = savedGroupMeta[gid] || savedGroupMeta[item.group_name] || {}
            discoveredGroups.push({
              id: gid,
              name: item.group_name || `Group ${discoveredGroups.length + 1}`,
              showSubtotal: !!meta.showSubtotal,
            })
          }
        }
      })
      setGroups(discoveredGroups)

      setLoading(false)
    }

    load()
  }, [id, navigate, setColumns])

  const updateInvoice = (field, value) => setInvoice((i) => ({ ...i, [field]: value }))

  const updateItem = (index, field, value) =>
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
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
    const gid = base.id || makeGroupId()
    const group = {
      ...base,
      id: gid,
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

  const parseCsvItems = (text) => {
    const lines = text.split('\n').filter((l) => l.trim())
    if (lines.length < 2) {
      return { error: 'The CSV needs a header row and at least one item row.' }
    }

    const headers = lines[0]
      .split(',')
      .map((h) => h.trim().toLowerCase().replace(/"/g, ''))

    const newItems = []
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim().replace(/"/g, ''))
      if (!cols[0]) continue
      const row = {}
      headers.forEach((h, idx) => {
        row[h] = cols[idx] || ''
      })
      newItems.push({
        ...makeEmptyItem(),
        row_type: 'standard',
        group_id: null,
        group_name: '',
        description: row['description'] || cols[0],
        sub_description: row['sub_description'] || '',
        make: row['make'] || '',
        quantity: Number(row['quantity'] || 1),
        unit: (row['unit'] || '').toUpperCase(),
        unit_price: Number(row['unit_price'] || 0),
        sort_order: newItems.length,
      })
    }

    if (!newItems.length) {
      return {
        error:
          'No valid item rows were found. Check that the file contains description values under the CSV header.',
      }
    }

    return { newItems }
  }

  const handleCSVImport = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = String(ev.target?.result || '')
      const { newItems, error } = parseCsvItems(text)
      if (error) {
        alert(error)
        return
      }

      setItems((prev) => [
        ...prev.filter((i) => i.description || i.row_type === 'group_header'),
        ...newItems,
      ])
      alert(newItems.length + ' items imported')
      setShowCSVNote(false)
    }

    reader.readAsText(file)
    e.target.value = ''
  }

  const {
    rawSubtotal,
    installRateTotal,
    vatAmount,
    discountAmount,
    grandTotal,
    whtAmount,
    totalPayable,
  } = calcTotals({
    items,
    columns,
    invoice: { ...invoice, _extraCharges: extraCharges },
    discountType,
    discountTiming,
    whtType,
  })

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
      groupMeta,
    }

    const paymentTermsValue =
      invoice.payment_terms === 'Custom'
        ? invoice.custom_payment_terms
        : invoice.payment_terms

    const { error } = await supabase
      .from('invoices')
      .update({
        invoice_title: invoiceTitle || null,
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

    const { error: delErr } = await supabase
      .from('invoice_items')
      .delete()
      .eq('invoice_id', id)

    if (delErr) {
      alert('Error clearing previous items: ' + delErr.message)
      setSaving(false)
      return
    }

    if (itemsToSave.length > 0) {
      const { error: insErr } = await supabase.from('invoice_items').insert(itemsToSave)
      if (insErr) {
        alert('Error saving items: ' + insErr.message)
        setSaving(false)
        return
      }
    }

    setSaving(false)
    navigate('/invoices/' + id)
  }

  const renderGroupHeaderRow = (item, index, reorderBtns, visCount) => {
    const g = groups.find((group) => group.id === item.group_id)
    const gItems = g
      ? items.filter(
          (it) => it.row_type === 'standard' && it.group_id === g.id
        )
      : []
    const gTotal = gItems.reduce(
      (s, it) => s + Number(it.quantity || 0) * Number(it.unit_price || 0),
      0
    )

    return (
      <tr key={index} style={{ backgroundColor: '#333' }}>
        {reorderBtns}
        <td style={{ padding: '10px 8px', textAlign: 'center', color: '#888' }}>?</td>
        <td colSpan={visCount} style={{ padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              style={{
                flex: 1,
                backgroundColor: 'transparent',
                color: 'white',
                fontWeight: 'bold',
                border: 'none',
                borderBottom: '1px solid #555',
                fontSize: '14px',
                outline: 'none',
                padding: '4px',
              }}
              value={item.group_name || ''}
              onChange={(e) => {
                if (g) updateGroupName(g.id, e.target.value)
                else updateItem(index, 'group_name', e.target.value)
              }}
              placeholder="Group name"
            />
            {g && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                    <div
                    onClick={() => toggleGroupSubtotal(g.id)}
                    style={{
                      width: '32px',
                      height: '18px',
                      borderRadius: '9px',
                      backgroundColor: g.showSubtotal ? '#16A34A' : '#666',
                      position: 'relative',
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        backgroundColor: 'white',
                        position: 'absolute',
                        top: '2px',
                        left: g.showSubtotal ? '16px' : '2px',
                        transition: 'left 0.2s',
                      }}
                    />
                  </div>
                  <span style={{ color: '#ccc', fontSize: '11px', whiteSpace: 'nowrap' }}>
                    Subtotal
                  </span>
                </label>
                {g.showSubtotal && (
                  <span
                    style={{
                      color: '#4ade80',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {'\u20A6'}{gTotal.toLocaleString()}
                  </span>
                )}
              </div>
            )}
          </div>
        </td>
        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
          <span
            onClick={() => (g ? deleteGroup(g.id) : removeItem(index))}
            style={{ color: '#ff6b6b', cursor: 'pointer', fontSize: '18px' }}
          >
            {'\u00D7'}
          </span>
        </td>
      </tr>
    )
  }

  const renderMobileRows = () => {
    let number = 0

    return items.map((item, index) => {
      if (item.row_type === 'group_header') {
        const group = groups.find((g) => g.id === item.group_id)
        if (!group) return null

        const groupItems = items.filter(
          (it) => it.row_type === 'standard' && it.group_id === group.id
        )

        const groupSubtotal = groupItems.reduce(
          (sum, it) => sum + Number(it.quantity || 0) * Number(it.unit_price || 0),
          0
        )

        return (
          <div
            key={`group_${group.id}_${index}`}
            style={{
              border: '2px solid #333',
              borderRadius: '10px',
              marginBottom: '16px',
              overflow: 'hidden',
            }}
          >
            <div style={{ backgroundColor: '#333', padding: '10px 14px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '8px',
                }}
              >
                <input
                  style={{
                    flex: 1,
                    backgroundColor: 'transparent',
                    color: 'white',
                    fontWeight: 'bold',
                    border: 'none',
                    borderBottom: '1px solid #666',
                    fontSize: '15px',
                    outline: 'none',
                    padding: '4px 0',
                  }}
                  value={group.name}
                  onChange={(e) => updateGroupName(group.id, e.target.value)}
                  placeholder="Group name"
                />
                <span
                  onClick={() => deleteGroup(group.id)}
                  style={{
                    color: '#ff6b6b',
                    cursor: 'pointer',
                    fontSize: '20px',
                    lineHeight: 1,
                  }}
                >
                  {'\u00D7'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                    <div
                    onClick={() => toggleGroupSubtotal(group.id)}
                    style={{
                      width: '36px',
                      height: '20px',
                      borderRadius: '10px',
                      backgroundColor: group.showSubtotal ? '#16A34A' : '#555',
                      position: 'relative',
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        backgroundColor: 'white',
                        position: 'absolute',
                        top: '2px',
                        left: group.showSubtotal ? '18px' : '2px',
                        transition: 'left 0.2s',
                      }}
                    />
                  </div>
                  <span style={{ color: '#ccc', fontSize: '12px' }}>
                    Show subtotal
                  </span>
                </label>

                {group.showSubtotal && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      color: '#4ade80',
                      fontSize: '13px',
                      fontWeight: 'bold',
                    }}
                  >
                    {'\u20A6'}{groupSubtotal.toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            <div style={{ padding: '12px' }}>
              {groupItems.map((groupItem, gi) => {
                number++
                const itemIndex = items.indexOf(groupItem)

                return (
                  <MobileItemCard
                    key={`group_item_${group.id}_${itemIndex}`}
                    item={groupItem}
                    index={itemIndex}
                    number={number}
                    isVisible={isVisible}
                    getColumn={getColumn}
                    customColumns={customColumns}
                    showItemImages={showItemImages}
                    invoice={invoice}
                    isFirst={gi === 0}
                    isLast={gi === groupItems.length - 1}
                    onUpdate={(idx, field, value) => {
                      if (field === '__install_rate_override') {
                        setItems((prev) =>
                          prev.map((it, i) =>
                            i !== idx ? it : { ...it, ...value }
                          )
                        )
                      } else {
                        updateItem(idx, field, value)
                      }
                    }}
                    onRemove={removeItem}
                    onInsertBelow={() => addItemToGroup(group.id)}
                    onMoveUp={(idx) => moveItem(idx, -1)}
                    onMoveDown={(idx) => moveItem(idx, 1)}
                  />
                )
              })}

              <div
                onClick={() => addItemToGroup(group.id)}
                style={{
                  padding: '10px',
                  border: '1px dashed #CC0000',
                  borderRadius: '8px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#CC0000',
                  fontWeight: '600',
                }}
              >
                + Add item to {group.name || 'group'}
              </div>
            </div>
          </div>
        )
      }

      if (item.row_type === 'standard' && !item.group_id) {
        number++
        return (
          <MobileItemCard
            key={`ungrouped_${index}`}
            item={item}
            index={index}
            number={number}
            isVisible={isVisible}
            getColumn={getColumn}
            customColumns={customColumns}
            showItemImages={showItemImages}
            invoice={invoice}
            isFirst={number === 1}
            isLast={index === items.length - 1}
            onUpdate={(idx, field, value) => {
              if (field === '__install_rate_override') {
                setItems((prev) =>
                  prev.map((it, i) =>
                    i !== idx ? it : { ...it, ...value }
                  )
                )
              } else {
                updateItem(idx, field, value)
              }
            }}
            onRemove={removeItem}
            onInsertBelow={(idx) => insertItemAfter(idx)}
            onMoveUp={(idx) => moveItem(idx, -1)}
            onMoveDown={(idx) => moveItem(idx, 1)}
          />
        )
      }

      return null
    })
  }

  if (loading || !invoice) {
    return (
      <Layout title="Edit Invoice">
        <p style={{ padding: 30 }}>Loading...</p>
      </Layout>
    )
  }

  return (
    <Layout title={invoice?.invoice_number ? 'Edit ' + invoice.invoice_number : 'Edit Invoice'}>
      <div style={{ maxWidth: '1100px' }}>
        {showColumnManager && (
          <ColumnManager
            columns={columns}
            onToggle={toggleVisible}
            onUpdate={updateColumn}
            onAddCustom={addCustomColumn}
            onRemoveCustom={removeCustomColumn}
            onReset={resetColumns}
            onMove={moveColumn}
            onClose={() => setShowColumnManager(false)}
            vat={invoice.vat || 0}
            setVat={(value) => updateInvoice('vat', value)}
            wht={invoice.wht || 0}
            setWht={(value) => updateInvoice('wht', value)}
            whtType={whtType}
            setWhtType={setWhtType}
          />
        )}

        <Card className="mb-5">
          <CardContent className="space-y-3 pt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <Label>Invoice Number</Label>
              <Input
                className="font-bold text-red-600 bg-gray-50"
                value={invoice.invoice_number || ''}
                readOnly
              />
            </div>
            <div>
              <Label>Issue Date</Label>
              <Input
                type="date"
                value={invoice.issue_date || ''}
                onChange={(e) => updateInvoice('issue_date', e.target.value)}
              />
            </div>
            <div>
              <Label>Due Date</Label>
              <Input
                type="date"
                value={invoice.due_date || ''}
                onChange={(e) => updateInvoice('due_date', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>
              Invoice Title{' '}
              <span style={{ color: '#aaa', fontWeight: 'normal' }}>
                (optional — shows on document when filled)
              </span>
            </Label>
            <Input
              value={invoiceTitle}
              onChange={(e) => setInvoiceTitle(e.target.value)}
              placeholder="e.g. Supply and Installation of Electrical Fittings"
            />
          </div>
          </CardContent>
        </Card>

        <Card className="mb-5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-widest text-blue-700">
              Client Details
            </CardTitle>
          </CardHeader>
          <CardContent>
          <ClientSelector
            clientId={invoice.client_id}
            clientName={invoice.client_name}
            isMobile={isMobile}
            onClientChange={(clientId, clientName) => {
              updateInvoice('client_id', clientId)
              updateInvoice('client_name', clientName)
            }}
          />
          </CardContent>
        </Card>

        <Card className="mb-5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-widest text-blue-700">
              Header Fields
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label>Work Duration</Label>
              <Input
                value={invoice.work_duration || ''}
                onChange={(e) => updateInvoice('work_duration', e.target.value)}
                placeholder="e.g. 7 days"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px',
              }}
            >
              <Label className="mb-0">Custom Header Fields</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCustomFields((f) => [...f, { label: '', value: '' }])}
              >
                + Add Field
              </Button>
            </div>

            {customFields.length === 0 && (
              <div className="text-sm text-gray-400 italic">
                Fields like Engine No, Serial No, appear on invoice header.
              </div>
            )}

            {customFields.map((field, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_1fr_36px] items-center gap-2"
              >
                <Input
                  value={field.label}
                  onChange={(e) => {
                    const u = [...customFields]
                    u[i] = { ...u[i], label: e.target.value }
                    setCustomFields(u)
                  }}
                  placeholder="Label (e.g. Engine No)"
                />
                <Input
                  value={field.value}
                  onChange={(e) => {
                    const u = [...customFields]
                    u[i] = { ...u[i], value: e.target.value }
                    setCustomFields(u)
                  }}
                  placeholder="Value"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setCustomFields(customFields.filter((_, j) => j !== i))}
                  className="text-red-600 hover:bg-red-50 hover:text-red-600"
                >
                  {'\u00D7'}
                </Button>
              </div>
            ))}
          </div>
          </CardContent>
        </Card>

        <div style={sec}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <h3 style={{ ...secT, margin: 0 }}>Line Items</h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                id="invoice-csv-import-edit"
                type="file"
                accept=".csv"
                hidden
                onChange={handleCSVImport}
              />

              <div
                onClick={() => setShowColumnManager(true)}
                style={{
                  padding: '8px 14px',
                  backgroundColor: '#F0F0FF',
                  color: '#6366F1',
                  border: '1px solid #c7d2fe',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 'bold',
                }}
              >
                  {'\u2699'} Columns
              </div>

              <div style={{ position: 'relative', maxWidth: '100%' }}>
                <Button
                  type="button"
                  onClick={() => setShowCSVNote((p) => !p)}
                  className="bg-green-600 px-3 py-2 text-xs hover:bg-green-700"
                >
                  Import CSV {'\u25BE'}
                </Button>

                {showCSVNote && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      width: 'min(420px, calc(100vw - 32px))',
                      zIndex: 100,
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                      border: '1px solid #E2E8F0',
                      overflow: 'hidden',
                      padding: '16px',
                      boxSizing: 'border-box',
                      maxHeight: 'min(70vh, 560px)',
                      overflowY: 'auto',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div
                      onClick={() => setShowCSVNote(false)}
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 12,
                        fontSize: 20,
                        cursor: 'pointer',
                        color: '#94A3B8',
                        lineHeight: 1
                      }}
                    >
                      ×
                    </div>
                    <div
                      style={{
                        marginBottom: '12px',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        padding: '10px',
                        backgroundColor: '#F8FAFC',
                        fontSize: '12px',
                        color: '#475569',
                        lineHeight: '1.6',
                        whiteSpace: 'pre-line',
                      }}
                    >
                      {`Use a CSV with:
Recommended header: description
Optional: sub_description, make, quantity, unit, unit_price

Upload a .csv file or paste raw CSV below.
Imported rows are added as invoice items.`}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px',
                        marginBottom: '12px',
                        borderBottom: '2px solid #eee',
                        paddingBottom: '8px',
                      }}
                    >
                      {['Upload File', 'Paste CSV'].map((tab) => (
                        <Button
                          key={tab}
                          type="button"
                          onClick={() => setCSVTab(tab)}
                          variant={csvTab === tab ? 'default' : 'outline'}
                          className={csvTab === tab ? 'bg-red-700 hover:bg-red-800' : ''}
                        >
                          {tab}
                        </Button>
                      ))}
                    </div>

                    {csvTab === 'Upload File' ? (
                      <Button
                        type="button"
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={() =>
                          document.getElementById('invoice-csv-import-edit')?.click()
                        }
                      >
                        Choose CSV File
                      </Button>
                    ) : (
                      <div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: '#888',
                            marginBottom: '6px',
                            lineHeight: '1.6',
                          }}
                        >
                          <strong>Recommended:</strong> description
                          <br />
                          <strong>Optional:</strong> sub_description, make, quantity, unit, unit_price
                        </div>
                        <textarea
                          value={pasteCSV}
                          onChange={(e) => setPasteCSV(e.target.value)}
                          placeholder={
                            'description,quantity,unit,unit_price\nCable tie,5,PCS,700'
                          }
                          style={{
                            width: '100%',
                            height: '100px',
                            padding: '8px',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontFamily: 'monospace',
                            outline: 'none',
                            boxSizing: 'border-box',
                            resize: 'vertical',
                            display: 'block',
                          }}
                        />
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            marginTop: '6px',
                          }}
                        >
                          <Button
                            type="button"
                            onClick={() => {
                              if (!pasteCSV.trim()) {
                                alert('Paste CSV content before importing.')
                                return
                              }
                              const { newItems, error } = parseCsvItems(pasteCSV)
                              if (error) {
                                alert(error)
                                return
                              }
                              setItems((p) => [
                                ...p.filter(
                                  (i) => i.description || i.row_type === 'group_header'
                                ),
                                ...newItems,
                              ])
                              setPasteCSV('')
                              setShowCSVNote(false)
                              alert(newItems.length + ' items imported')
                            }}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Import
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div
                onClick={addGroup}
                style={{
                  padding: '8px 14px',
                  backgroundColor: '#1a1a1a',
                  color: 'white',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                + Group
              </div>

              <div
                onClick={addItem}
                style={{
                  padding: '8px 14px',
                  backgroundColor: '#CC0000',
                  color: 'white',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                + Add Item
              </div>
            </div>
          </div>

          {isNarrow && (
            <div>
              {renderMobileRows()}

              <div
                onClick={addItem}
                style={{
                  padding: '12px',
                  backgroundColor: '#CC0000',
                  color: 'white',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '700',
                  textAlign: 'center',
                  marginBottom: '20px',
                }}
              >
                + Add Item
              </div>

              <div
                onClick={addGroup}
                style={{
                  padding: '12px',
                  backgroundColor: '#1a1a1a',
                  color: 'white',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600',
                  textAlign: 'center',
                }}
              >
                + Add Group
              </div>
            </div>
          )}

          {!isNarrow && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1a1a1a' }}>
                    <th style={{ padding: '10px 4px', textAlign: 'center', color: 'white', width: '28px' }} />
                    <th style={{ padding: '10px 8px', textAlign: 'center', color: 'white', width: '28px' }}>#</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: 'white', minWidth: '200px' }}>Description</th>
                    {isVisible('make') && (
                      <th style={{ padding: '10px 12px', textAlign: 'left', color: 'white', minWidth: '80px' }}>
                        Make
                      </th>
                    )}
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: 'white', minWidth: '60px' }}>Qty</th>
                    {isVisible('unit') && (
                      <th style={{ padding: '10px 12px', textAlign: 'left', color: 'white', minWidth: '70px' }}>
                        Unit
                      </th>
                    )}
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: 'white', minWidth: '120px' }}>Rate</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: 'white', minWidth: '110px' }}>Amount</th>
                    {isVisible('install_rate') && (
                      <th style={{ padding: '10px 12px', textAlign: 'left', color: 'white', minWidth: '110px' }}>
                        Install Rate
                      </th>
                    )}
                    {isVisible('vat_rate') && (
                      <th style={{ padding: '10px 12px', textAlign: 'center', color: 'white', minWidth: '72px' }}>
                        VAT %
                      </th>
                    )}
                    {isVisible('discount_rate') && (
                      <th style={{ padding: '10px 12px', textAlign: 'center', color: 'white', minWidth: '72px' }}>
                        Disc %
                      </th>
                    )}
                    {customColumns.filter((c) => c.visible).map((col) => (
                      <th key={col.key} style={{ padding: '10px 12px', textAlign: 'left', color: 'white', minWidth: '90px' }}>
                        {col.label}
                      </th>
                    ))}
                    {showItemImages && (
                      <th style={{ padding: '10px 12px', textAlign: 'left', color: 'white', width: '70px' }}>
                        Image
                      </th>
                    )}
                    <th style={{ padding: '10px 12px', color: 'white', width: '30px' }} />
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let n = 0
                    const installCol = getColumn('install_rate')

                    return items.map((item, index) => {
                      if (item.row_type === 'standard') n++

                      const visCount =
                        3 +
                        (isVisible('make') ? 1 : 0) +
                        (isVisible('unit') ? 1 : 0) +
                        (isVisible('install_rate') ? 1 : 0) +
                        (isVisible('vat_rate') ? 1 : 0) +
                        (isVisible('discount_rate') ? 1 : 0) +
                        customColumns.filter((c) => c.visible).length +
                        (showItemImages ? 1 : 0) +
                        2

                      const autoInstall = installCol?.formula
                        ? parseFloat(installCol.formula) *
                          Number(item.quantity || 1) *
                          Number(item.unit_price || 0)
                        : null

                      const reorderBtns = (
                        <td style={{ padding: '4px 2px', textAlign: 'center', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                            <div
                              onClick={() => moveItem(index, -1)}
                              style={{
                                cursor: index === 0 ? 'not-allowed' : 'pointer',
                                color: index === 0 ? '#ddd' : '#888',
                                fontSize: '11px',
                                lineHeight: 1,
                                padding: '2px',
                              }}
                            >
                              {'\u25B2'}
                            </div>
                            <div
                              onClick={() => moveItem(index, 1)}
                              style={{
                                cursor: index === items.length - 1 ? 'not-allowed' : 'pointer',
                                color: index === items.length - 1 ? '#ddd' : '#888',
                                fontSize: '11px',
                                lineHeight: 1,
                                padding: '2px',
                              }}
                            >
                              {'\u25BC'}
                            </div>
                          </div>
                        </td>
                      )

                      if (item.row_type === 'group_header') {
                        return renderGroupHeaderRow(item, index, reorderBtns, visCount)
                      }

                      return (
                        <tr
                          key={index}
                          style={{
                            borderBottom: '1px solid #eee',
                            backgroundColor: index % 2 === 0 ? '#fafafa' : 'white',
                          }}
                        >
                          {reorderBtns}
                          <td style={{ padding: '8px', textAlign: 'center', color: '#999', fontSize: '12px', fontWeight: '700' }}>
                            {n}
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <input
                              style={inp}
                              value={item.description || ''}
                              onChange={(e) => updateItem(index, 'description', e.target.value)}
                              placeholder="Item description"
                            />
                            <input
                              style={{ ...inp, marginTop: '4px', fontSize: '13px', color: '#888' }}
                              value={item.sub_description || ''}
                              onChange={(e) => updateItem(index, 'sub_description', e.target.value)}
                              placeholder="Sub-description (optional)"
                            />
                          </td>
                          {isVisible('make') && (
                            <td style={{ padding: '8px 12px' }}>
                              <input
                                style={inp}
                                value={item.make || ''}
                                onChange={(e) => updateItem(index, 'make', e.target.value)}
                                placeholder="Brand"
                              />
                            </td>
                          )}
                          <td style={{ padding: '8px 12px' }}>
                            <input
                              style={inp}
                              type="number"
                              min="0"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                            />
                          </td>
                          {isVisible('unit') && (
                            <td style={{ padding: '8px 12px', minWidth: '100px' }}>
                              <UnitInput
                                value={item.unit || ''}
                                onChange={(val) => updateItem(index, 'unit', val)}
                              />
                            </td>
                          )}
                          <td style={{ padding: '8px 12px' }}>
                            <input
                              style={inp}
                              type="number"
                              min="0"
                              value={item.unit_price}
                              onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))}
                            />
                          </td>
                          <td style={{ padding: '8px 12px', fontWeight: 'bold', color: '#1a1a1a', whiteSpace: 'nowrap' }}>
                            NGN {(Number(item.quantity) * Number(item.unit_price)).toLocaleString()}
                          </td>
                          {isVisible('install_rate') && (
                            <td style={{ padding: '8px 12px' }}>
                              <input
                                style={inp}
                                type="number"
                                min="0"
                                value={item.install_rate_override ? item.install_rate ?? '' : ''}
                                placeholder={
                                  autoInstall !== null ? String(Number(autoInstall.toFixed(2))) : '0'
                                }
                                onChange={(e) => {
                                  const val = e.target.value
                                  setItems((prev) =>
                                    prev.map((it, i) =>
                                      i !== index
                                        ? it
                                        : val === ''
                                        ? { ...it, install_rate_override: false, install_rate: null }
                                        : {
                                            ...it,
                                            install_rate_override: true,
                                            install_rate: Number(val),
                                          }
                                    )
                                  )
                                }}
                              />
                            </td>
                          )}
                          {isVisible('vat_rate') && (
                            <td style={{ padding: '8px 12px' }}>
                              <input
                                style={{
                                  ...inp,
                                  textAlign: 'center',
                                  backgroundColor:
                                    item.vat_rate !== null && item.vat_rate !== undefined
                                      ? 'white'
                                      : '#f9f9f9',
                                  color: item.vat_rate === 0 ? '#CC0000' : '#1a1a1a',
                                }}
                                type="number"
                                min="0"
                                max="100"
                                value={
                                  item.vat_rate !== null && item.vat_rate !== undefined
                                    ? item.vat_rate
                                    : ''
                                }
                                placeholder={String(invoice.vat || 0)}
                                onChange={(e) => {
                                  const val = e.target.value
                                  updateItem(index, 'vat_rate', val === '' ? null : Number(val))
                                }}
                              />
                              {item.vat_rate === 0 && (
                                <div style={{ fontSize: '10px', color: '#CC0000', marginTop: '2px' }}>
                                  excluded
                                </div>
                              )}
                            </td>
                          )}
                          {isVisible('discount_rate') &&
                            (() => {
                              const drVal = item.discount_rate
                              const isExcluded = drVal === 0
                              const hasOverride = drVal !== null && drVal !== undefined
                              return (
                                <td style={{ padding: '8px 12px' }}>
                                  <input
                                    style={{
                                      ...inp,
                                      textAlign: 'center',
                                      backgroundColor: isExcluded
                                        ? '#fff0f0'
                                        : hasOverride
                                        ? '#fffbe6'
                                        : '#f9f9f9',
                                      color: isExcluded ? '#CC0000' : '#1a1a1a',
                                    }}
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={hasOverride ? drVal : ''}
                                    placeholder="global"
                                    onChange={(e) => {
                                      const val = e.target.value
                                      updateItem(index, 'discount_rate', val === '' ? null : Number(val))
                                    }}
                                  />
                                  {isExcluded ? (
                                    <div
                                      style={{
                                        fontSize: '10px',
                                        color: '#CC0000',
                                        marginTop: '2px',
                                        fontWeight: 'bold',
                                      }}
                                    >
                                      {'\u2713'} no discount
                                    </div>
                                  ) : drVal > 0 ? (
                                    <div style={{ fontSize: '10px', color: '#B45309', marginTop: '2px' }}>
                                      {drVal}% this row
                                    </div>
                                  ) : (
                                    <div style={{ fontSize: '10px', color: '#aaa', marginTop: '2px' }}>
                                      blank = global
                                    </div>
                                  )}
                                </td>
                              )
                            })()}
                          {customColumns.filter((c) => c.visible).map((col) => (
                            <td key={col.key} style={{ padding: '8px 12px' }}>
                              <input
                                style={inp}
                                type={col.type === 'number' ? 'number' : 'text'}
                                value={(item.custom_data || {})[col.key] || ''}
                                onChange={(e) =>
                                  updateItem(index, 'custom_data', {
                                    ...(item.custom_data || {}),
                                    [col.key]:
                                      col.type === 'number'
                                        ? Number(e.target.value)
                                        : e.target.value,
                                  })
                                }
                              />
                            </td>
                          ))}
                          {showItemImages && (
                            <td style={{ padding: '8px 12px', verticalAlign: 'top' }}>
                              <ItemImageUpload
                                value={item.image_url || null}
                                onChange={(url) => updateItem(index, 'image_url', url)}
                              />
                            </td>
                          )}
                          <td style={{ padding: '8px 12px', textAlign: 'center', verticalAlign: 'top' }}>
                            <span
                              onClick={() => removeItem(index)}
                              style={{ color: '#CC0000', cursor: 'pointer', fontSize: '18px' }}
                            >
                              {'\u00D7'}
                            </span>
                          </td>
                        </tr>
                      )
                    })
                  })()}
                </tbody>
              </table>

              {/* Persistent action bar so Add Item never disappears */}
              <div
                style={{
                  marginTop: '14px',
                  display: 'flex',
                  gap: '10px',
                  flexWrap: 'wrap',
                }}
              >
                <div
                  onClick={addItem}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: '#CC0000',
                    color: 'white',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 'bold',
                  }}
                >
                  + Add Item
                </div>
                    <div
                  onClick={addGroup}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: '#1a1a1a',
                    color: 'white',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  + Add Group
                </div>
              </div>

            </div>
          )}
        </div>

        <Card className="mb-5">
          <CardHeader
            className="cursor-pointer"
            onClick={() => setShowAdvanced((p) => !p)}
          >
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-base">Advanced Options</CardTitle>
              <span className="text-lg text-slate-400">{showAdvanced ? '▲' : '▾'}</span>
            </div>
          </CardHeader>
          {showAdvanced && (
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-slate-900">
                    Merge Qty + Unit on PDF
                  </div>
                  <div className="text-xs text-slate-500">
                    Shows &quot;5 Sets&quot; instead of separate Qty and Unit columns
                  </div>
                </div>
                <Switch
                  checked={mergeQtyUnit}
                  onCheckedChange={() => setMergeQtyUnit((p) => !p)}
                />
              </div>

              <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-slate-900">
                    Show item images in PDF
                  </div>
                  <div className="text-xs text-slate-500">
                    Adds an image column - upload images per row above
                  </div>
                </div>
                <Switch
                  checked={showItemImages}
                  onCheckedChange={() => setShowItemImages((p) => !p)}
                />
              </div>
            </CardContent>
          )}
        </Card>

        <Card className="mb-5">
          <CardHeader>
            <CardTitle className="text-base">Attachments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-slate-500">
              Files attached here appear as download links on the invoice view.
            </div>
            <AttachmentsPanel attachments={attachments} onChange={setAttachments} />
          </CardContent>
        </Card>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: '20px',
            marginBottom: '20px',
          }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Additional Charges</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

            {['workmanship', 'transportation', 'shipping'].map((key) => (
              <div
                key={key}
                className="flex items-center justify-between gap-2"
              >
                <Input
                  className="w-[130px] text-xs font-bold text-slate-600"
                  value={chargeLabels[key]}
                  onChange={(e) =>
                    setChargeLabels((p) => ({ ...p, [key]: e.target.value }))
                  }
                  placeholder={key}
                />
                <Input
                  type="number"
                  min="0"
                  className="w-[140px] text-right"
                  value={invoice[key] || 0}
                  onChange={(e) => updateInvoice(key, Number(e.target.value))}
                />
              </div>
            ))}

            {extraCharges.map((charge, i) => (
              <div
                key={i}
                className="flex items-center gap-2"
              >
                <Input
                  className="flex-1 text-xs"
                  value={charge.label}
                  onChange={(e) => {
                    const u = [...extraCharges]
                    u[i] = { ...u[i], label: e.target.value }
                    setExtraCharges(u)
                  }}
                  placeholder="Charge name"
                />
                <Input
                  type="number"
                  min="0"
                  className="w-[90px] text-right"
                  value={charge.value || 0}
                  onChange={(e) => {
                    const u = [...extraCharges]
                    u[i] = { ...u[i], value: Number(e.target.value) }
                    setExtraCharges(u)
                  }}
                />
                <Button
                  type="button"
                  onClick={() => {
                    const u = [...extraCharges]
                    u[i] = { ...u[i], withTax: !u[i].withTax }
                    setExtraCharges(u)
                  }}
                  variant="ghost"
                  className={`h-9 px-2 text-[11px] font-bold ${charge.withTax ? 'text-blue-700' : 'text-slate-500'}`}
                >
                  {charge.withTax ? '+VAT' : 'No VAT'}
                </Button>
                <Button
                  type="button"
                  onClick={() =>
                    setExtraCharges(extraCharges.filter((_, j) => j !== i))
                  }
                  variant="ghost"
                  className="h-9 px-2 text-lg text-red-700"
                >
                  {'\u00D7'}
                </Button>
              </div>
            ))}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() =>
                  setExtraCharges([...extraCharges, { label: '', value: 0, withTax: true }])
                }
                variant="outline"
                className="border-dashed border-blue-700 text-xs text-blue-700"
              >
                + Charge (with VAT)
              </Button>
              <Button
                type="button"
                onClick={() =>
                  setExtraCharges([...extraCharges, { label: '', value: 0, withTax: false }])
                }
                variant="outline"
                className="border-dashed text-xs text-slate-500"
              >
                + Charge (no VAT)
              </Button>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="mb-0">Discount</Label>
                <div className="flex flex-wrap gap-2">
                  <div className="flex overflow-hidden rounded-md border">
                    <button
                      type="button"
                      onClick={() => setDiscountType('fixed')}
                      style={tog(discountType === 'fixed')}
                    >
                      {'\u20A6'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('percent')}
                      style={tog(discountType === 'percent')}
                    >
                      %
                    </button>
                  </div>

                  <div className="flex overflow-hidden rounded-md border">
                    <button
                      type="button"
                      onClick={() => setDiscountTiming('before')}
                      style={tog(discountTiming === 'before')}
                    >
                      Before Tax
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountTiming('after')}
                      style={tog(discountTiming === 'after')}
                    >
                      After Tax
                    </button>
                  </div>
                </div>
              </div>

              <Input
                type="number"
                min="0"
                className="text-right"
                value={invoice.discount || 0}
                onChange={(e) => updateInvoice('discount', Number(e.target.value))}
              />
            </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
            {[
              { label: 'Subtotal', value: rawSubtotal },
              ...extraCharges
                .filter((c) => c.withTax && Number(c.value) > 0)
                .map((c) => ({ label: c.label + ' (+VAT)', value: Number(c.value) })),
              { label: `VAT (${invoice.vat || 0}%)`, value: vatAmount },
              { label: chargeLabels.workmanship, value: Number(invoice.workmanship || 0) },
              {
                label: chargeLabels.transportation,
                value: Number(invoice.transportation || 0),
              },
              { label: chargeLabels.shipping, value: Number(invoice.shipping || 0) },
              installRateTotal > 0
                ? { label: 'Install Rate Total', value: installRateTotal }
                : null,
              ...extraCharges
                .filter((c) => !c.withTax && Number(c.value) > 0)
                .map((c) => ({ label: c.label, value: Number(c.value) })),
              discountAmount > 0
                ? {
                    label:
                      discountType === 'percent'
                        ? `Discount (${invoice.discount || 0}% ${discountTiming === 'before' ? 'before tax' : 'after tax'})`
                        : `Discount (${discountTiming === 'before' ? 'before tax' : 'after tax'})`,
                    value: -discountAmount,
                  }
                : null,
            ]
              .filter(Boolean)
              .filter((r) => r.value !== 0)
              .map(({ label, value }) => (
                <div
                  key={label}
                  className="flex justify-between text-sm"
                >
                  <span className="text-slate-600">{label}</span>
                  <span
                    className={`whitespace-nowrap ${value < 0 ? 'text-red-700' : 'text-slate-900'}`}
                  >
                    {value < 0 ? '-' : ''}{'\u20A6'}{Math.abs(value).toLocaleString()}
                  </span>
                </div>
              ))}

            <Separator className="my-2 bg-slate-900" />

            <div className="flex items-center justify-between">
              <span className="text-[15px] font-bold">Grand Total</span>
              <span className="whitespace-nowrap text-xl font-bold text-slate-900">
                {'\u20A6'}{grandTotal.toLocaleString()}
              </span>
            </div>

            {whtAmount > 0 && (
              <div className="mt-2 flex justify-between border-t border-dashed pt-2 text-[13px] text-red-700">
                <span>
                  Less: WHT (
                  {whtType === 'percent'
                    ? (invoice.wht || 0) + '%'
                    : '\u20A6' + Number(invoice.wht || 0).toLocaleString()}
                  )
                </span>
                <span style={{ whiteSpace: 'nowrap' }}>
                  -{'\u20A6'}{whtAmount.toLocaleString()}
                </span>
              </div>
            )}

            <Separator className="my-2 bg-red-700" />

            <div className="flex items-center justify-between">
              <span className="text-[15px] font-bold text-red-700">Total Payable</span>
              <span className="whitespace-nowrap text-[22px] font-bold text-red-700">
                {'\u20A6'}{totalPayable.toLocaleString()}
              </span>
            </div>

            <div className="mt-3 rounded-md bg-slate-50 p-3 text-xs italic text-slate-600">
              {numberToWords(totalPayable)}
            </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-5">
          <CardHeader>
            <CardTitle className="text-base">Payment Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label>Payment Terms</Label>
              <Select
                value={invoice.payment_terms || ''}
                onValueChange={(value) => updateInvoice('payment_terms', value)}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select payment terms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Net 30">Net 30</SelectItem>
                  <SelectItem value="Net 60">Net 60</SelectItem>
                  <SelectItem value="Due on receipt">Due on receipt</SelectItem>
                  <SelectItem value="50% advance">50% advance</SelectItem>
                  <SelectItem value="Custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {invoice.payment_terms === 'Custom' && (
              <div>
                <Label>Specify Terms</Label>
                <Input
                  className="mt-2"
                  value={invoice.custom_payment_terms || ''}
                  onChange={(e) => updateInvoice('custom_payment_terms', e.target.value)}
                  placeholder="e.g. 60% downpayment, 40% on delivery"
                />
              </div>
            )}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-5">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-base">Custom Fields</CardTitle>
              <Button
                type="button"
                variant="ghost"
                className="h-auto p-0 text-sm font-bold text-indigo-500"
                onClick={() => setBottomFields((f) => [...f, { text: '' }])}
              >
              + Add Custom Field
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
          {bottomFields.length === 0 && (
            <div className="text-sm italic text-slate-400">
              Plain-text entries like "ADVANCE PAYMENT DUE (60%)" that appear below the
              totals.
            </div>
          )}

          {bottomFields.map((field, i) => (
            <div
              key={i}
              className="flex items-center gap-2"
            >
              <Input
                className="flex-1"
                value={field.text}
                onChange={(e) => {
                  const u = [...bottomFields]
                  u[i] = { text: e.target.value }
                  setBottomFields(u)
                }}
                placeholder="e.g. ADVANCE PAYMENT DUE (60%): ₦141,601"
              />
              <Button
                type="button"
                onClick={() => setBottomFields(bottomFields.filter((_, j) => j !== i))}
                variant="ghost"
                className="h-9 px-2 text-xl text-red-700"
              >
                {'\u00D7'}
              </Button>
            </div>
          ))}
          </CardContent>
        </Card>

        <Card className="mb-5">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Input
                className="mb-3 rounded-none border-0 border-b-2 border-blue-700 px-2 py-1 text-xs font-bold uppercase tracking-[1px] text-blue-700 shadow-none focus-visible:ring-0"
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
                className="mb-3 rounded-none border-0 border-b-2 border-blue-700 px-2 py-1 text-xs font-bold uppercase tracking-[1px] text-blue-700 shadow-none focus-visible:ring-0"
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

        <div className="ml-auto flex max-w-[400px] flex-col gap-2.5 pb-10">
          <Button
            type="button"
            onClick={() => handleSave('sent')}
            className="h-auto bg-red-700 px-6 py-3.5 text-[15px] font-bold hover:bg-red-800"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button
            type="button"
            onClick={() => handleSave('draft')}
            variant="secondary"
            className="h-auto bg-slate-600 px-6 py-3.5 text-[15px] text-white hover:bg-slate-700"
          >
            {saving ? 'Saving...' : 'Save as Draft'}
          </Button>
          <Button
            type="button"
            onClick={() => navigate('/invoices/' + id)}
            variant="outline"
            className="h-auto px-6 py-3.5 text-[15px] text-slate-600"
          >
            Cancel
          </Button>
        </div>
      </div>
    </Layout>
  )
}



