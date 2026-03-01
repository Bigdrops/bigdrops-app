import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import InvoicePDF from '../components/InvoicePDF'

export default function ViewInvoice() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('invoices').select('*').eq('id', id).single().then(({ data }) => {
      setInvoice(data)
    })
    supabase.from('invoice_items').select('*').eq('invoice_id', id).order('sort_order').then(({ data }) => {
      setItems(data || [])
      setLoading(false)
    })
  }, [id])

  if (loading) return <Layout title="Invoice"><p style={{ padding: 30 }}>Loading...</p></Layout>
  if (!invoice) return <Layout title="Invoice"><p style={{ padding: 30 }}>Invoice not found.</p></Layout>

  const statusColor = (status) => {
    if (status === 'paid') return { bg: '#DCFCE7', color: '#16A34A' }
    if (status === 'sent') return { bg: '#E8F0FB', color: '#0056B3' }
    if (status === 'overdue') return { bg: '#FEE2E2', color: '#CC0000' }
    return { bg: '#F5F5F5', color: '#555' }
  }

  const s = statusColor(invoice.status)

  return (
    <Layout title={invoice.invoice_number}>
      <div style={{ maxWidth: '900px' }}>

        {/* Action Bar */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center' }}>
          <div onClick={() => navigate('/invoices')} style={{ padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', border: '1px solid #ddd', backgroundColor: 'white' }}>
            ← Back
          </div>
          <span style={{ backgroundColor: s.bg, color: s.color, padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', textTransform: 'capitalize' }}>
            {invoice.status || 'draft'}
          </span>
          <div style={{ flex: 1 }} />
          <PDFDownloadLink
            document={<InvoicePDF invoice={invoice} items={items} />}
            fileName={invoice.invoice_number + '.pdf'}
            style={{ textDecoration: 'none' }}>
            {({ loading }) => (
              <div style={{ padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', backgroundColor: '#0056B3', color: 'white', fontWeight: 'bold' }}>
                {loading ? 'Preparing PDF...' : '⬇ Download PDF'}
              </div>
            )}
          </PDFDownloadLink>
          <div onClick={() => navigate('/invoices/edit/' + id)} style={{ padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', backgroundColor: '#CC0000', color: 'white', fontWeight: 'bold' }}>
            Edit Invoice
          </div>
        </div>

        {/* Invoice Preview */}
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: '40px' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
            <div>
              <div style={{ color: '#CC0000', fontWeight: 'bold', fontSize: '22px', marginBottom: '4px' }}>SUN & SHIELD POWER SOLUTIONS</div>
              <div style={{ color: '#555', fontSize: '12px' }}>Generator Sales | Maintenance | Installation | Rental | Facility Management</div>
              <div style={{ color: '#555', fontSize: '12px' }}>Lagos, Nigeria</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#CC0000', fontWeight: 'bold', fontSize: '20px', marginBottom: '4px' }}>{invoice.document_type || 'INVOICE'}</div>
              <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#333' }}>{invoice.invoice_number}</div>
              <div style={{ fontSize: '12px', color: '#555' }}>Date: {invoice.issue_date}</div>
              {invoice.due_date && <div style={{ fontSize: '12px', color: '#555' }}>Due: {invoice.due_date}</div>}
            </div>
          </div>

          <div style={{ borderBottom: '2px solid #CC0000', marginBottom: '24px' }} />

          {/* Client & Details */}
          <div style={{ display: 'flex', marginBottom: '24px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#0056B3', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Bill To</div>
              <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>{invoice.client_name}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#0056B3', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Details</div>
              {invoice.payment_terms && <div style={{ fontSize: '13px', color: '#555' }}>Payment Terms: {invoice.payment_terms}</div>}
              {invoice.work_duration && <div style={{ fontSize: '13px', color: '#555' }}>Work Duration: {invoice.work_duration}</div>}
              {invoice.custom_fields && <div style={{ fontSize: '13px', color: '#555' }}>{invoice.custom_fields}</div>}
            </div>
          </div>

          {/* Line Items */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#1a1a1a' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', color: 'white' }}>Description</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', color: 'white' }}>Make</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', color: 'white' }}>Qty</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', color: 'white' }}>Unit</th>
                <th style={{ padding: '10px 14px', textAlign: 'right', color: 'white' }}>Unit Price</th>
                <th style={{ padding: '10px 14px', textAlign: 'right', color: 'white' }}>Amount</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', color: 'white' }}>VAT%</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                item.row_type === 'group_header' ? (
                  <tr key={index} style={{ backgroundColor: '#333' }}>
                    <td colSpan="7" style={{ padding: '10px 14px', fontWeight: 'bold', color: 'white', fontSize: '13px' }}>{item.group_name}</td>
                  </tr>
                ) : (
                  <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white', borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <div>{item.description}</div>
                      {item.sub_description && <div style={{ fontSize: '11px', color: '#888', fontStyle: 'italic' }}>{item.sub_description}</div>}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#555' }}>{item.make || '—'}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', color: '#555' }}>{item.unit || '—'}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>₦{Number(item.unit_price || 0).toLocaleString()}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 'bold' }}>₦{Number(item.amount || item.quantity * item.unit_price || 0).toLocaleString()}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', color: '#555' }}>{item.vat_rate || 0}%</td>
                  </tr>
                )
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
            <div style={{ width: '280px' }}>
              {[
                { label: 'Subtotal', value: invoice.subtotal },
                { label: 'VAT', value: invoice.vat },
                { label: 'Workmanship', value: invoice.workmanship },
                { label: 'Transportation', value: invoice.transportation },
                { label: 'Shipping', value: invoice.shipping },
                { label: 'Discount', value: invoice.discount, negative: true },
              ].filter(r => Number(r.value) > 0).map(({ label, value, negative }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                  <span style={{ color: '#555' }}>{label}</span>
                  <span style={{ color: negative ? '#CC0000' : '#1a1a1a' }}>{negative ? '-' : ''}₦{Number(value || 0).toLocaleString()}</span>
                </div>
              ))}
              <div style={{ borderTop: '2px solid #1a1a1a', paddingTop: '10px', marginTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 'bold', fontSize: '15px' }}>TOTAL (NGN)</span>
                <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#CC0000' }}>₦{Number(invoice.total || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Amount in Words */}
          {invoice.amount_in_words && (
            <div style={{ backgroundColor: '#f9f9f9', padding: '12px', borderLeft: '3px solid #CC0000', marginBottom: '24px', fontSize: '12px', color: '#555', fontStyle: 'italic' }}>
              {invoice.amount_in_words}
            </div>
          )}

          {/* Notes & Terms */}
          {invoice.notes && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#0056B3', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Notes</div>
              <div style={{ fontSize: '13px', color: '#555' }}>{invoice.notes}</div>
            </div>
          )}
          {invoice.terms && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#0056B3', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Terms & Conditions</div>
              <div style={{ fontSize: '13px', color: '#555' }}>{invoice.terms}</div>
            </div>
          )}

          {/* Footer */}
          <div style={{ borderTop: '1px solid #eee', paddingTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#333', marginBottom: '4px' }}>Payment Terms</div>
              <div style={{ fontSize: '12px', color: '#555' }}>{invoice.payment_terms || 'Net 30'}</div>
            </div>
            <div style={{ width: '200px', borderTop: '1px solid #333', paddingTop: '6px', marginTop: '30px' }}>
              <div style={{ fontSize: '11px', color: '#555' }}>Authorised Signature</div>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  )
}