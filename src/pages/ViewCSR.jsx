import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { supabase } from '../supabase'
import Layout from '../components/Layout'
import {
  buildCsrPreviewData,
  getCsrBranding,
} from '../components/csr/csrUtils'
import CSRPreviewPanel from '../components/csr/CSRPreviewPanel'
import { toast } from '@/hooks/use-toast'
import { DocumentActionSheet } from '@/components/document/DocumentViewShell'

export default function ViewCSR() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [csr, setCsr] = useState(null)
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [showMore, setShowMore] = useState(false)
  const [template, setTemplate] = useState(() => {
    try {
      return localStorage.getItem('csr_pdf_template') || '4'
    } catch {
      return '4'
    }
  })

  useEffect(() => {
    supabase.from('csrs').select('*').eq('id', id).single().then(({ data }) => {
      setCsr(data)
      setLoading(false)
    })
    supabase.from('settings').select('*').eq('id', 1).single().then(({ data }) => {
      if (data) setSettings(data)
    })
  }, [id])

  useEffect(() => {
    try {
      localStorage.setItem('csr_pdf_template', template)
    } catch {
      // Ignore storage write failures and keep the in-memory selection.
    }
  }, [template])

  if (loading) return <Layout title="CSR"><p style={{ padding: 30 }}>Loading...</p></Layout>
  if (!csr) return <Layout title="CSR"><p style={{ padding: 30 }}>CSR not found.</p></Layout>

  const previewData = buildCsrPreviewData(csr)
  const branding = getCsrBranding(settings)

  const handleDownload = async () => {
    const [{ pdf }, { getCsrPdfDocument }] = await Promise.all([
      import('@react-pdf/renderer'),
      import('../components/csr/CSRPreviewTemplates'),
    ])
    const blob = await pdf(
      getCsrPdfDocument({ csr: previewData, branding, template })
    ).toBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = previewData.csr_number + '.pdf'
    a.click()
  }

  const handleCopy = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value)
      setShowMore(false)
      toast({ title: 'Copied', description: `${label} copied` })
    } catch {
      toast({ title: 'Copy failed', description: `Could not copy ${label.toLowerCase()}`, variant: 'destructive' })
    }
  }

  const moreActions = [
    {
      label: 'Copy CSR Number',
      subtitle: previewData.csr_number || 'Copy the current CSR number',
      action: () => handleCopy(previewData.csr_number || '', 'CSR number'),
      iconKey: 'copy',
    },
    {
      label: 'Copy Client Name',
      subtitle: previewData.client_name || 'Copy the linked client name',
      action: () => handleCopy(previewData.client_name || '', 'Client name'),
      iconKey: 'copy',
    },
    {
      label: 'Open Edit Screen',
      subtitle: 'Continue editing this CSR',
      action: () => navigate('/csr/edit/' + id),
      iconKey: 'open',
    },
  ]

  return (
    <Layout title={previewData.csr_number}>
      <div style={{ maxWidth: '900px', width: '100%' }}>
        <div
          style={{
            background: 'linear-gradient(180deg, #F8FAFC 0%, #EEF4FF 100%)',
            border: '1px solid #DBE5F3',
            borderRadius: '16px',
            padding: '18px',
            marginBottom: '18px',
            boxShadow: '0 16px 40px rgba(15, 23, 42, 0.08)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '999px', backgroundColor: '#ffffff', border: '1px solid #D6E0EF', fontSize: '12px', fontWeight: '700', color: '#0F172A', marginBottom: '10px' }}>
                Customer Service Report
              </div>
              <div style={{ fontSize: '26px', fontWeight: '700', color: '#0F172A', marginBottom: '4px' }}>{previewData.csr_number}</div>
              <div style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>
                {previewData.client_name || 'Unassigned client'}{previewData.date ? ` • ${previewData.date}` : ''}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => navigate('/csr')} style={{ padding: '9px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', border: '1px solid #d1d5db', backgroundColor: 'white', fontWeight: '600', color: '#0F172A' }}>Back</button>
              <button type="button" onClick={handleDownload} style={{ padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', backgroundColor: '#0056B3', color: 'white', fontWeight: '700', border: 'none', boxShadow: '0 10px 24px rgba(0, 86, 179, 0.18)' }}>Download PDF</button>
              <button type="button" onClick={() => navigate('/csr/edit/' + id)} style={{ display: 'none' }}>Edit CSR</button>
              <div>
                <button type="button" onClick={() => setShowMore(true)} style={{ padding: '10px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', border: '1px solid #CBD5E1', backgroundColor: 'white', fontWeight: '700', color: '#0F172A' }}>
                  More actions
                </button>
              </div>
            </div>
          </div>
        </div>

        <CSRPreviewPanel
          csr={previewData}
          template={template}
          onTemplateChange={setTemplate}
          branding={branding}
        />

        <DocumentActionSheet
          open={showMore}
          onOpenChange={setShowMore}
          title="CSR Actions"
          subtitle={previewData.csr_number}
          actions={moreActions.map((item) => ({
            label: item.label,
            subtitle: item.subtitle,
            onClick: item.action,
            iconKey: item.iconKey,
          }))}
        />
      </div>
    </Layout>
  )
}
