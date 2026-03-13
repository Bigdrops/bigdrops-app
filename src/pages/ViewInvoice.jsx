import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import ThreadSummaryCard from '../components/ThreadSummaryCard'
import { useInvoiceThread } from '../hooks/useInvoiceThread'

function useIsMobile() {
  const [m, setM] = React.useState(window.innerWidth < 640)
  React.useEffect(() => {
    const h = () => setM(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return m
}

function useIsNarrow() {
  const [n, setN] = React.useState(window.innerWidth < 768)
  React.useEffect(() => {
    const h = () => setN(window.innerWidth < 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return n
}

export default function ViewInvoice() {

  const isMobile = useIsMobile()
  const isNarrow = useIsNarrow()

  const { id } = useParams()
  const navigate = useNavigate()

  const [invoice, setInvoice] = useState(null)
  const [items, setItems] = useState([])
  const [client, setClient] = useState(null)
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)

  const [showMore, setShowMore] = useState(false)
  const [showAdvanceModal, setShowAdvanceModal] = useState(false)

  const [advanceForm, setAdvanceForm] = useState({
    mode: 'percent',
    value: '50'
  })

  const moreRef = useRef()

  const { buildNextInvoiceDefaults } = useInvoiceThread(invoice?.thread_id || null)

  const fetchInvoice = async () => {

    const { data } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single()

    setInvoice(data)

    if (data?.client_id) {
      const { data: c } = await supabase
        .from('clients')
        .select('*')
        .eq('id', data.client_id)
        .single()

      setClient(c || null)
    }
  }

  useEffect(() => {

    fetchInvoice()

    supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id)
      .order('sort_order')
      .then(({ data }) => {
        setItems(data || [])
        setLoading(false)
      })

    supabase
      .from('settings')
      .select('*')
      .eq('id', 1)
      .single()
      .then(({ data }) => {
        if (data) setSettings(data)
      })

  }, [id])

  useEffect(() => {
    const handler = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) {
        setShowMore(false)
      }
    }

    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)

  }, [])

  if (loading) return <Layout title="Invoice"><p style={{ padding: 30 }}>Loading...</p></Layout>

  if (!invoice) return <Layout title="Invoice"><p style={{ padding: 30 }}>Invoice not found.</p></Layout>


  const handleCreateAdvanceInvoice = () => {
    setShowMore(false)
    setShowAdvanceModal(true)
  }

  // ─────────────────────────────────────────────
  // START THREAD (Convert invoice to advance)
  // ─────────────────────────────────────────────

  const handleConfirmAdvance = async () => {

    const val = parseFloat(advanceForm.value)

    if (isNaN(val) || val <= 0) {
      alert('Enter a valid amount')
      return
    }

    const contractTotal = Number(invoice.total || 0)

    let advanceAmount

    if (advanceForm.mode === 'percent') {

      if (val > 100) {
        alert('Percentage cannot exceed 100%')
        return
      }

      advanceAmount = Math.round((contractTotal * val / 100) * 100) / 100

    } else {

      if (val > contractTotal) {
        alert('Amount cannot exceed invoice total')
        return
      }

      advanceAmount = Math.round(val * 100) / 100
    }

    const threadId = crypto.randomUUID()

    const { error } = await supabase
      .from('invoices')
      .update({
        thread_id: threadId,
        thread_role: 'advance',
        thread_position: 1,
        total_contract_value: contractTotal,
        advance_mode: advanceForm.mode,
        advance_value: val,
        is_advance: true
      })
      .eq('id', invoice.id)

    if (error) {
      alert(error.message)
      return
    }

    setShowAdvanceModal(false)

    await fetchInvoice()
  }

  // ─────────────────────────────────────────────
  // Create next invoice in thread
  // ─────────────────────────────────────────────

  const handleCreateNextInvoice = () => {

    const defaults = buildNextInvoiceDefaults()

    if (!defaults) return

    navigate('/invoices/new', {
      state: {
        threadDefaults: defaults
      }
    })
  }

  return (

    <Layout title={invoice.invoice_number}>

      <div style={{ maxWidth: '900px', width: '100%' }}>

        {/* THREAD SUMMARY */}

        {invoice.thread_id && (
          <div style={{ marginBottom: 24 }}>
            <ThreadSummaryCard
              threadId={invoice.thread_id}
              currentInvoiceId={invoice.id}
              onCreateNext={handleCreateNextInvoice}
            />
          </div>
        )}

        {/* ACTION BAR */}

        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>

          <div
            onClick={() => navigate('/invoices')}
            style={{
              padding: '10px 16px',
              borderRadius: 6,
              border: '1px solid #ddd',
              cursor: 'pointer'
            }}
          >
            ← Invoices
          </div>

          <div style={{ flex: 1 }} />

          <div ref={moreRef} style={{ position: 'relative' }}>

            <div
              onClick={() => setShowMore(p => !p)}
              style={{
                padding: '10px 14px',
                borderRadius: 6,
                border: '1px solid #ddd',
                cursor: 'pointer'
              }}
            >
              ••• More
            </div>

            {showMore && (

              <div style={{
                position: 'absolute',
                right: 0,
                marginTop: 6,
                background: 'white',
                borderRadius: 8,
                border: '1px solid #eee',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
              }}>

                {!invoice.thread_id && (
                  <div
                    onClick={handleCreateAdvanceInvoice}
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer'
                    }}
                  >
                    💰 Convert to Advance Invoice
                  </div>
                )}

              </div>

            )}

          </div>

        </div>

        {/* ADVANCE MODAL */}

        {showAdvanceModal && (

          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>

            <div style={{
              background: 'white',
              borderRadius: 14,
              padding: 28,
              width: '420px'
            }}>

              <h3>Create Advance Invoice</h3>

              <div style={{ marginTop: 16 }}>

                <input
                  type="number"
                  value={advanceForm.value}
                  onChange={e => setAdvanceForm({
                    ...advanceForm,
                    value: e.target.value
                  })}
                  style={{
                    width: '100%',
                    padding: 10,
                    border: '1px solid #ddd',
                    borderRadius: 8
                  }}
                />

              </div>

              <div style={{
                display: 'flex',
                gap: 10,
                marginTop: 20
              }}>

                <div
                  onClick={() => setShowAdvanceModal(false)}
                  style={{
                    flex: 1,
                    padding: 12,
                    border: '1px solid #ddd',
                    textAlign: 'center',
                    borderRadius: 8,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </div>

                <div
                  onClick={handleConfirmAdvance}
                  style={{
                    flex: 2,
                    padding: 12,
                    textAlign: 'center',
                    background: '#CC0000',
                    color: 'white',
                    borderRadius: 8,
                    cursor: 'pointer'
                  }}
                >
                  Convert
                </div>

              </div>

            </div>

          </div>

        )}

      </div>

    </Layout>
  )
}