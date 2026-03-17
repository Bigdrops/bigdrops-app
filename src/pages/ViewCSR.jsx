import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { pdf } from '@react-pdf/renderer'

import { supabase } from '../supabase'
import Layout from '../components/Layout'
import {
  buildCsrPreviewData,
  getCsrBranding,
} from '../components/csr/csrUtils'
import CSRPreviewPanel from '../components/csr/CSRPreviewPanel'
import { getCsrPdfDocument } from '../components/csr/CSRPreviewTemplates'

export default function ViewCSR() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [csr, setCsr] = useState(null)
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [template, setTemplate] = useState(() => {
    try {
      return localStorage.getItem('csr_pdf_template') || '3'
    } catch {
      return '3'
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
    const blob = await pdf(
      getCsrPdfDocument({ csr: previewData, branding, template })
    ).toBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = previewData.csr_number + '.pdf'
    a.click()
  }

  return (
    <Layout title={previewData.csr_number}>
      <div style={{ maxWidth: '900px' }}>
        <div
          style={{
            background: 'linear-gradient(180deg, #F8FAFC 0%, #EEF4FF 100%)',
            border: '1px solid #DBE5F3',
            borderRadius: '14px',
            padding: '16px',
            marginBottom: '18px',
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
          }}
        >
          <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => navigate('/csr')} style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', border: '1px solid #d1d5db', backgroundColor: 'white', fontWeight: '600' }}>Back</button>
            <div style={{ flex: 1 }} />
            <button type="button" onClick={handleDownload} style={{ padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', backgroundColor: '#0056B3', color: 'white', fontWeight: '600', border: 'none' }}>Download PDF</button>
            <button type="button" onClick={() => navigate('/csr/edit/' + id)} style={{ padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', backgroundColor: '#CC0000', color: 'white', fontWeight: '600', border: 'none' }}>Edit CSR</button>
          </div>
        </div>

        <CSRPreviewPanel
          csr={previewData}
          template={template}
          onTemplateChange={setTemplate}
        />
      </div>
    </Layout>
  )
}
