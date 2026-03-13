import { Document, Page, Text, View, StyleSheet, Image, Link } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    padding: 40,
    backgroundColor: 'white',
  },

  header: {
    marginBottom: 20,
    position: 'relative',
  },
  headerMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerAccent: {
    height: 8,
    backgroundColor: '#1E3A8A',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    marginBottom: 14,
  },
  companyBlock: {
    flex: 1,
    marginRight: 20,
  },
  logo: {
    maxWidth: 130,
    maxHeight: 65,
    marginBottom: 5,
    objectFit: 'contain',
  },
  companyName: {
    fontSize: 17,
    fontFamily: 'Helvetica-Bold',
    color: '#CC0000',
    marginBottom: 2,
  },
  companyTagline: {
    fontSize: 8,
    color: '#666',
    marginBottom: 2,
  },
  companyDetail: {
    fontSize: 8,
    color: '#555',
    marginBottom: 1,
  },
  docBlock: {
    alignItems: 'flex-end',
  },
  docTitle: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#CC0000',
    marginBottom: 4,
  },
  docSubtitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    marginBottom: 4,
    textAlign: 'right',
    textTransform: 'uppercase',
  },
  docNumber: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#333',
    marginBottom: 2,
  },
  docDate: {
    fontSize: 9,
    color: '#555',
    marginBottom: 1,
  },
  advanceBadgeWrap: {
    marginTop: 10,
    alignItems: 'center',
  },
  advanceBadge: {
    backgroundColor: '#F59E0B',
    color: 'white',
    borderRadius: 14,
    paddingVertical: 5,
    paddingHorizontal: 14,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  divider: {
    borderBottomWidth: 2,
    borderBottomColor: '#CC0000',
    marginBottom: 20,
  },

  twoCol: {
    flexDirection: 'row',
    marginBottom: 16,
    marginTop: 4,
  },
  col: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#0056B3',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 5,
  },
  clientName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  clientDetail: {
    fontSize: 8,
    color: '#555',
    marginBottom: 2,
  },

  table: {
    marginBottom: 14,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  thText: {
    color: 'white',
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: 'white',
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: '#f9f9f9',
  },
  groupRow: {
    flexDirection: 'row',
    backgroundColor: '#333',
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  groupText: {
    color: 'white',
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
  },
  groupSubtotalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  groupSubtotalLabel: {
    fontSize: 8,
    color: '#555',
    fontFamily: 'Helvetica-Bold',
    marginRight: 12,
  },
  groupSubtotalValue: {
    fontSize: 8,
    color: '#1a1a1a',
    fontFamily: 'Helvetica-Bold',
  },

  cNum: {
    width: 18,
    textAlign: 'center',
    fontSize: 8,
  },
  cDesc: {
    flex: 3,
  },
  cQty: {
    flex: 0.7,
    textAlign: 'center',
    fontSize: 8,
  },
  cUnit: {
    flex: 0.8,
    textAlign: 'center',
    fontSize: 8,
  },
  cQtyUnit: {
    flex: 1.2,
    textAlign: 'center',
    fontSize: 8,
  },
  cPrice: {
    flex: 1.5,
    textAlign: 'right',
    fontSize: 8,
  },
  cAmt: {
    flex: 1.5,
    textAlign: 'right',
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },

  descText: {
    fontSize: 8.5,
    color: '#1a1a1a',
  },
  subDescText: {
    fontSize: 7,
    color: '#888',
    marginTop: 1,
    fontFamily: 'Helvetica-Oblique',
  },
  itemThumb: {
    width: 80,
    height: 80,
    objectFit: 'contain',
    borderRadius: 3,
    marginTop: 5,
  },

  totalsSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 12,
  },
  totalsBox: {
    width: 300,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 8,
    color: '#555',
  },
  totalValue: {
    fontSize: 8,
    color: '#1a1a1a',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 2,
    borderTopColor: '#1a1a1a',
    paddingTop: 6,
    marginTop: 4,
  },
  grandLabel: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
  },
  grandValue: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
  },
  advanceDueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  advanceDueLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#92400E',
  },
  advanceDueValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#B45309',
  },
  whtRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  payableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 2,
    borderTopColor: '#CC0000',
    paddingTop: 6,
    marginTop: 4,
  },
  payableLabel: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#CC0000',
  },
  payableValue: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#CC0000',
  },

  amountWords: {
    backgroundColor: '#f9f9f9',
    padding: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#CC0000',
  },
  amountWordsText: {
    fontSize: 8,
    color: '#555',
    fontFamily: 'Helvetica-Oblique',
  },

  notesBox: {
    marginBottom: 10,
  },
  notesText: {
    fontSize: 8,
    color: '#555',
    lineHeight: 1.5,
  },

  sigSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 14,
  },
  sigBlock: {
    alignItems: 'center',
  },
  sigImage: {
    width: 130,
    height: 55,
    objectFit: 'contain',
    marginBottom: 4,
  },
  sigLine: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    width: 170,
    paddingTop: 4,
  },
  sigLabel: {
    fontSize: 8,
    color: '#555',
    textAlign: 'center',
  },

  docsSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  docsSectionLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#333',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    gap: 6,
  },
  docBullet: {
    fontSize: 10,
    color: '#555',
  },
  docLink: {
    fontSize: 8,
    color: '#0056B3',
    textDecoration: 'underline',
  },

  footer: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
    marginTop: 12,
  },
  footerText: {
    fontSize: 7.5,
    color: '#888',
    textAlign: 'center',
    lineHeight: 1.6,
  },
})

const stripHtml = (html) => {
  if (!html) return ''
  return html
    .replace(/<strong>(.*?)<\/strong>/gs, '$1')
    .replace(/<em>(.*?)<\/em>/gs, '$1')
    .replace(/<u>(.*?)<\/u>/gs, '$1')
    .replace(/<li>(.*?)<\/li>/gs, '• $1\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const parseCF = (raw) => {
  const defaults = {
    header: [],
    bottom: [],
    extraCharges: [],
    chargeLabels: {},
    mergeQtyUnit: false,
    showItemImages: false,
    attachments: [],
    notesTitle: 'Notes',
    termsTitle: 'Terms and Conditions',
    groupMeta: {},
  }
  if (!raw) return defaults
  try {
    const p = JSON.parse(raw)
    if (Array.isArray(p)) return { ...defaults, header: p }
    return { ...defaults, ...p }
  } catch {
    return defaults
  }
}

const getAdvanceInfo = (invoice) => {
  const isAdvance = invoice?.thread_role === 'advance' || invoice?.is_advance

  if (!isAdvance) {
    return {
      isAdvance: false,
      contractTotal: 0,
      advanceAmount: 0,
      badgeLabel: '',
      footerNote: '',
    }
  }

  const contractTotal = Number(invoice.total_contract_value || invoice.total || 0)
  const advanceAmount = Number(invoice.total || 0)

  let pct = 0

  if (invoice.advance_mode === 'percent') {
    pct = Number(invoice.advance_value || 0)
  } else if (contractTotal > 0) {
    pct = (advanceAmount / contractTotal) * 100
  }

  const cleanPct = Math.max(0, Math.min(100, Number(pct || 0)))
  const remainingPct = Math.max(0, 100 - cleanPct)
  const remainingAmount = Math.max(0, contractTotal - advanceAmount)

  const badgeLabel =
    invoice.advance_mode === 'fixed'
      ? `₦${advanceAmount.toLocaleString()} ADVANCE PAYMENT`
      : `${cleanPct.toFixed(cleanPct % 1 === 0 ? 0 : 1)}% ADVANCE PAYMENT`

  const dueLabel =
    invoice.advance_mode === 'fixed'
      ? 'ADVANCE PAYMENT DUE'
      : `${cleanPct.toFixed(cleanPct % 1 === 0 ? 0 : 1)}% ADVANCE PAYMENT DUE`

  const footerNote =
    remainingAmount > 0
      ? `Balance of ${remainingPct.toFixed(remainingPct % 1 === 0 ? 0 : 1)}% (₦${remainingAmount.toLocaleString()}) due upon project completion`
      : 'Advance covers the full project value'

  return {
    isAdvance: true,
    contractTotal,
    advanceAmount,
    remainingAmount,
    pct: cleanPct,
    remainingPct,
    badgeLabel,
    dueLabel,
    footerNote,
  }
}

export default function InvoicePDF({ invoice, items = [], client, settings = {} }) {
  const cf = parseCF(invoice.custom_fields)
  const { mergeQtyUnit, showItemImages, attachments, chargeLabels, groupMeta } = cf
  const advanceInfo = getAdvanceInfo(invoice)

  const companyName = settings.company_name || 'SUN & SHIELD POWER SOLUTIONS'
  const companyTagline =
    settings.company_tagline ||
    'Generator Sales | Maintenance | Installation | Rental | Facility Management'
  const companyAddress = settings.company_address || ''
  const companyCity = settings.company_city || ''
  const companyPhone = settings.company_phone || ''
  const companyEmail = settings.company_email || ''
  const logoUrl = settings.logo_url || ''
  const signatureUrl = settings.signature_url || ''
  const footerText = settings.footer_text || ''

  const subtotal = Number(invoice.subtotal || 0)
  const vatAmount = Number(invoice.vat || 0)
  const discount = Number(invoice.discount || 0)
  const whtAmount = Number(invoice.wht || 0)
  const totalPayable = Number(invoice.total || 0)
  const grandTotal = whtAmount > 0 ? totalPayable + whtAmount : totalPayable
  const installTotal = Number(invoice.install_rate_total || 0)

  const fixedCharges = [
    { label: chargeLabels.workmanship || 'Workmanship', value: Number(invoice.workmanship || 0) },
    { label: chargeLabels.transportation || 'Transportation', value: Number(invoice.transportation || 0) },
    { label: chargeLabels.shipping || 'Shipping', value: Number(invoice.shipping || 0) },
  ].filter((e) => e.value > 0)

  const validAttachments = (attachments || []).filter((a) => a.label && a.url)

  const renderRows = (() => {
    const rows = []
    let currentGroupName = null
    let currentGroupSubtotal = 0
    let currentGroupShowSubtotal = false

    const flushGroup = () => {
      if (currentGroupName !== null && currentGroupShowSubtotal) {
        rows.push({
          _type: 'group_subtotal',
          name: currentGroupName,
          subtotal: currentGroupSubtotal,
        })
      }
      currentGroupName = null
      currentGroupSubtotal = 0
      currentGroupShowSubtotal = false
    }

    items.forEach((item, index) => {
      if (item.row_type === 'group_header') {
        flushGroup()
        currentGroupName = item.group_name
        currentGroupShowSubtotal = !!(groupMeta && groupMeta[item.group_name]?.showSubtotal)
        currentGroupSubtotal = 0
        rows.push({ _type: 'group_header', item, index })
      } else {
        const amount = Number(item.amount || Number(item.quantity) * Number(item.unit_price) || 0)
        if (currentGroupName !== null) currentGroupSubtotal += amount
        rows.push({ _type: 'item', item, index, amount })
      }
    })

    flushGroup()
    return rows
  })()

  let itemCount = 0

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerAccent} />
          <View style={styles.headerMain}>
            <View style={styles.companyBlock}>
              {logoUrl ? <Image src={logoUrl} style={styles.logo} /> : <Text style={styles.companyName}>{companyName}</Text>}
              {!logoUrl && companyTagline ? <Text style={styles.companyTagline}>{companyTagline}</Text> : null}
              {logoUrl ? <Text style={[styles.companyName, { fontSize: 12, marginTop: 3 }]}>{companyName}</Text> : null}
              {companyAddress ? <Text style={styles.companyDetail}>{companyAddress}</Text> : null}
              {companyCity ? <Text style={styles.companyDetail}>{companyCity}</Text> : null}
              {companyPhone ? <Text style={styles.companyDetail}>{companyPhone}</Text> : null}
              {companyEmail ? <Text style={styles.companyDetail}>{companyEmail}</Text> : null}
            </View>

            <View style={styles.docBlock}>
              <Text style={styles.docTitle}>{invoice.document_type || 'INVOICE'}</Text>
              {invoice.invoice_title ? <Text style={styles.docSubtitle}>{invoice.invoice_title}</Text> : null}
              <Text style={styles.docNumber}>{invoice.invoice_number}</Text>
              <Text style={styles.docDate}>Date: {invoice.issue_date}</Text>
              {invoice.due_date ? <Text style={styles.docDate}>Due: {invoice.due_date}</Text> : null}
            </View>
          </View>

          {advanceInfo.isAdvance && (
            <View style={styles.advanceBadgeWrap}>
              <Text style={styles.advanceBadge}>{advanceInfo.badgeLabel}</Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.sectionLabel}>Bill To</Text>
            <Text style={styles.clientName}>{invoice.client_name}</Text>
            {client?.address ? <Text style={styles.clientDetail}>{client.address}</Text> : null}
            {client?.city ? (
              <Text style={styles.clientDetail}>
                {client.city}
                {client.state ? ', ' + client.state : ''}
              </Text>
            ) : null}
            {client?.phone ? <Text style={styles.clientDetail}>{client.phone}</Text> : null}
            {client?.email ? <Text style={styles.clientDetail}>{client.email}</Text> : null}
            {client?.contact_person ? <Text style={styles.clientDetail}>Attn: {client.contact_person}</Text> : null}
          </View>

          <View style={styles.col}>
            <Text style={styles.sectionLabel}>Details</Text>
            {invoice.payment_terms ? <Text style={styles.clientDetail}>Payment Terms: {invoice.payment_terms}</Text> : null}
            {invoice.work_duration ? <Text style={styles.clientDetail}>Work Duration: {invoice.work_duration}</Text> : null}
            {invoice.job_title ? <Text style={styles.clientDetail}>Job Title: {invoice.job_title}</Text> : null}
            {cf.header.filter((f) => f.label && f.value).map((f, i) => (
              <Text key={i} style={styles.clientDetail}>
                {f.label}: {f.value}
              </Text>
            ))}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.thText, styles.cNum]}>#</Text>
            <Text style={[styles.thText, styles.cDesc]}>Description</Text>
            {mergeQtyUnit ? (
              <Text style={[styles.thText, styles.cQtyUnit]}>Qty</Text>
            ) : (
              <>
                <Text style={[styles.thText, styles.cQty]}>Qty</Text>
                <Text style={[styles.thText, styles.cUnit]}>Unit</Text>
              </>
            )}
            <Text style={[styles.thText, styles.cPrice]}>Unit Price</Text>
            <Text style={[styles.thText, styles.cAmt]}>Amount (NGN)</Text>
          </View>

          {renderRows.map((row, ri) => {
            if (row._type === 'group_header') {
              return (
                <View key={'gh_' + ri} style={styles.groupRow}>
                  <Text style={styles.groupText}>{row.item.group_name}</Text>
                </View>
              )
            }

            if (row._type === 'group_subtotal') {
              return (
                <View key={'gs_' + ri} style={styles.groupSubtotalRow}>
                  <Text style={styles.groupSubtotalLabel}>{row.name} — Section Total</Text>
                  <Text style={styles.groupSubtotalValue}>NGN {row.subtotal.toLocaleString()}</Text>
                </View>
              )
            }

            itemCount++
            const { item, amount } = row
            const rowStyle = itemCount % 2 === 0 ? styles.tableRowAlt : styles.tableRow

            return (
              <View key={'item_' + ri} style={rowStyle} wrap={false}>
                <Text style={[{ color: '#999', alignSelf: 'flex-start' }, styles.cNum]}>{itemCount}</Text>

                <View style={[styles.cDesc, { alignSelf: 'flex-start' }]}>
                  <Text style={styles.descText}>{item.description}</Text>
                  {item.sub_description ? <Text style={styles.subDescText}>{item.sub_description}</Text> : null}
                  {item.make ? <Text style={[styles.subDescText, { color: '#777' }]}>Make: {item.make}</Text> : null}
                  {showItemImages && item.image_url ? (
                    <Link src={item.image_url}>
                      <Image src={item.image_url} style={styles.itemThumb} />
                    </Link>
                  ) : null}
                </View>

                {mergeQtyUnit ? (
                  <Text style={[styles.cQtyUnit, { alignSelf: 'flex-start' }]}>
                    {item.quantity}
                    {item.unit ? ' ' + item.unit : ''}
                  </Text>
                ) : (
                  <>
                    <Text style={[styles.cQty, { alignSelf: 'flex-start' }]}>{item.quantity}</Text>
                    <Text style={[styles.cUnit, { color: '#555', alignSelf: 'flex-start' }]}>{item.unit || ''}</Text>
                  </>
                )}

                <Text style={[styles.cPrice, { alignSelf: 'flex-start' }]}>
                  {Number(item.unit_price || 0).toLocaleString()}
                </Text>
                <Text style={[styles.cAmt, { alignSelf: 'flex-start' }]}>{amount.toLocaleString()}</Text>
              </View>
            )
          })}
        </View>

        <View style={[styles.totalsSection, { marginTop: 10 }]} wrap={false}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>NGN {subtotal.toLocaleString()}</Text>
            </View>

            {installTotal > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Install Rate</Text>
                <Text style={styles.totalValue}>NGN {installTotal.toLocaleString()}</Text>
              </View>
            )}

            {fixedCharges.map((e) => (
              <View key={e.label} style={styles.totalRow}>
                <Text style={styles.totalLabel}>{e.label}</Text>
                <Text style={styles.totalValue}>NGN {e.value.toLocaleString()}</Text>
              </View>
            ))}

            {cf.extraCharges &&
              cf.extraCharges
                .filter((c) => Number(c.value) > 0)
                .map((c, i) => (
                  <View key={i} style={styles.totalRow}>
                    <Text style={styles.totalLabel}>{c.label}</Text>
                    <Text style={styles.totalValue}>NGN {Number(c.value).toLocaleString()}</Text>
                  </View>
                ))}

            {vatAmount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>VAT</Text>
                <Text style={styles.totalValue}>NGN {vatAmount.toLocaleString()}</Text>
              </View>
            )}

            {discount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Discount</Text>
                <Text style={[styles.totalValue, { color: '#CC0000' }]}>- NGN {discount.toLocaleString()}</Text>
              </View>
            )}

            <View style={styles.grandTotalRow}>
              <Text style={styles.grandLabel}>
                {advanceInfo.isAdvance ? 'Total Project Value' : 'Total Due'}
              </Text>
              <Text style={styles.grandValue}>
                NGN {(advanceInfo.isAdvance ? advanceInfo.contractTotal : grandTotal).toLocaleString()}
              </Text>
            </View>

            {advanceInfo.isAdvance && (
              <View style={styles.advanceDueRow}>
                <Text style={styles.advanceDueLabel}>{advanceInfo.dueLabel}</Text>
                <Text style={styles.advanceDueValue}>NGN {advanceInfo.advanceAmount.toLocaleString()}</Text>
              </View>
            )}

            {!advanceInfo.isAdvance && whtAmount > 0 && (
              <>
                <View style={styles.whtRow}>
                  <Text style={[styles.totalLabel, { color: '#CC0000' }]}>Less: WHT</Text>
                  <Text style={[styles.totalValue, { color: '#CC0000' }]}>- NGN {whtAmount.toLocaleString()}</Text>
                </View>
                <View style={styles.payableRow}>
                  <Text style={styles.payableLabel}>Total Payable</Text>
                  <Text style={styles.payableValue}>NGN {totalPayable.toLocaleString()}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {invoice.amount_in_words ? (
          <View style={styles.amountWords}>
            <Text style={styles.amountWordsText}>{invoice.amount_in_words}</Text>
          </View>
        ) : null}

        {cf.bottom && cf.bottom.filter((f) => f.text).length > 0 && (
          <View style={{ marginBottom: 10, padding: 8, borderWidth: 1, borderColor: '#eee' }}>
            {cf.bottom
              .filter((f) => f.text)
              .map((f, i) => (
                <Text key={i} style={{ fontSize: 8, color: '#333', marginBottom: 2 }}>
                  {f.text}
                </Text>
              ))}
          </View>
        )}

        {invoice.notes && stripHtml(invoice.notes) ? (
          <View style={styles.notesBox}>
            <Text style={[styles.sectionLabel, { marginBottom: 4 }]}>{cf.notesTitle || 'Notes'}</Text>
            <Text style={styles.notesText}>{stripHtml(invoice.notes)}</Text>
          </View>
        ) : null}

        {invoice.terms && stripHtml(invoice.terms) ? (
          <View style={[styles.notesBox, { marginBottom: 14 }]}>
            <Text style={[styles.sectionLabel, { marginBottom: 4 }]}>{cf.termsTitle || 'Terms and Conditions'}</Text>
            <Text style={styles.notesText}>{stripHtml(invoice.terms)}</Text>
          </View>
        ) : null}

        {signatureUrl ? (
          <View style={styles.sigSection}>
            <View style={styles.sigBlock}>
              <Image src={signatureUrl} style={styles.sigImage} />
              <View style={styles.sigLine}>
                <Text style={styles.sigLabel}>Authorised Signature</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.sigSection}>
            <View style={styles.sigBlock}>
              <View style={{ height: 40 }} />
              <View style={styles.sigLine}>
                <Text style={styles.sigLabel}>Authorised Signature</Text>
              </View>
            </View>
          </View>
        )}

        {validAttachments.length > 0 && (
          <View style={styles.docsSection}>
            <Text style={styles.docsSectionLabel}>Supporting Documents</Text>
            {validAttachments.map((att, i) => (
              <View key={i} style={styles.docItem}>
                <Text style={styles.docBullet}>📎</Text>
                <Link src={att.url} style={styles.docLink}>
                  {att.label}
                </Link>
              </View>
            ))}
          </View>
        )}

        {advanceInfo.isAdvance ? (
          <View style={styles.footer}>
            <Text style={styles.footerText}>{advanceInfo.footerNote}</Text>
          </View>
        ) : footerText ? (
          <View style={styles.footer}>
            <Text style={styles.footerText}>{footerText}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  )
}