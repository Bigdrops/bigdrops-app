import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useSettings, uploadFile, saveSettings } from '../hooks/useSettings'
import { supabase } from '../supabase'

function useIsMobile() {
  const [m, setM] = useState(window.innerWidth < 640)
  useEffect(() => { const h = () => setM(window.innerWidth < 640); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h) }, [])
  return m
}

export default function Settings() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const { settings, loading } = useSettings()
  const logoRef = useRef()
  const sigRef = useRef()

  const [form, setForm] = useState({
    company_name: '', company_tagline: '', company_address: '', company_city: '',
    company_phone: '', company_email: '', company_website: '',
    bank_name: '', bank_account_name: '', bank_account_number: '', bank_sort_code: '',
    footer_text: '', logo_url: '', signature_url: '',
  })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState({ logo: false, signature: false })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!loading && settings) {
      setForm(f => ({ ...f, ...settings }))
    }
  }, [loading, settings])

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleUpload = async (type, file) => {
    if (!file) return
    setUploading(u => ({ ...u, [type]: true }))
    try {
      const ext = file.name.split('.').pop()
      const path = `${type}/${Date.now()}.${ext}`
      const url = await uploadFile('company-assets', path, file)
      update(type + '_url', url)
    } catch (e) {
      alert('Upload failed: ' + e.message)
    }
    setUploading(u => ({ ...u, [type]: false }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveSettings(form)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      alert('Error saving: ' + e.message)
    }
    setSaving(false)
  }

  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '15px', outline: 'none', boxSizing: 'border-box', color: '#1a1a1a', backgroundColor: 'white' }
  const lbl = { display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#555', marginBottom: '4px' }
  const sec = { backgroundColor: 'white', padding: isMobile ? '16px' : '24px', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: '20px' }
  const secT = { margin: '0 0 18px 0', fontSize: '14px', fontWeight: 'bold', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }
  const grid2 = { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }

  if (loading) return <Layout title="Settings"><p style={{ padding: 30 }}>Loading...</p></Layout>

  return (
    <Layout title="Settings">
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: isMobile ? '12px' : '24px' }}>

        {/* Company Info */}
        <div style={sec}>
          <h3 style={secT}>Company Information</h3>
          <div style={{ ...grid2, marginBottom: '14px' }}>
            <div><label style={lbl}>Company Name</label><input style={inp} value={form.company_name} onChange={e => update('company_name', e.target.value)} placeholder="Sun & Shield Power Solutions" /></div>
            <div><label style={lbl}>Tagline</label><input style={inp} value={form.company_tagline} onChange={e => update('company_tagline', e.target.value)} placeholder="Generator Sales | Maintenance..." /></div>
          </div>
          <div style={{ marginBottom: '14px' }}><label style={lbl}>Address</label><input style={inp} value={form.company_address} onChange={e => update('company_address', e.target.value)} placeholder="No. 5 Industrial Road, Apapa" /></div>
          <div style={{ ...grid2, marginBottom: '14px' }}>
            <div><label style={lbl}>City / State</label><input style={inp} value={form.company_city} onChange={e => update('company_city', e.target.value)} placeholder="Lagos, Nigeria" /></div>
            <div><label style={lbl}>Phone</label><input style={inp} value={form.company_phone} onChange={e => update('company_phone', e.target.value)} placeholder="+234 801 234 5678" /></div>
          </div>
          <div style={grid2}>
            <div><label style={lbl}>Email</label><input style={inp} value={form.company_email} onChange={e => update('company_email', e.target.value)} placeholder="info@sunshield.ng" /></div>
            <div><label style={lbl}>Website</label><input style={inp} value={form.company_website} onChange={e => update('company_website', e.target.value)} placeholder="www.sunshield.ng" /></div>
          </div>
        </div>

        {/* Bank Details */}
        <div style={sec}>
          <h3 style={secT}>Bank Details</h3>
          <div style={{ ...grid2, marginBottom: '14px' }}>
            <div><label style={lbl}>Bank Name</label><input style={inp} value={form.bank_name} onChange={e => update('bank_name', e.target.value)} placeholder="First Bank of Nigeria" /></div>
            <div><label style={lbl}>Account Name</label><input style={inp} value={form.bank_account_name} onChange={e => update('bank_account_name', e.target.value)} placeholder="Sun & Shield Power Solutions" /></div>
          </div>
          <div style={grid2}>
            <div><label style={lbl}>Account Number</label><input style={inp} value={form.bank_account_number} onChange={e => update('bank_account_number', e.target.value)} placeholder="0123456789" /></div>
            <div><label style={lbl}>Sort Code / SWIFT</label><input style={inp} value={form.bank_sort_code} onChange={e => update('bank_sort_code', e.target.value)} placeholder="011-152-383" /></div>
          </div>
        </div>

        {/* Logo & Signature */}
        <div style={sec}>
          <h3 style={secT}>Logo & Signature</h3>
          <div style={grid2}>
            {/* Logo */}
            <div>
              <label style={lbl}>Company Logo</label>
              <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleUpload('logo', e.target.files[0])} />
              {form.logo_url ? (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img src={form.logo_url} alt="Logo" style={{ maxHeight: '80px', maxWidth: '200px', borderRadius: '6px', border: '1px solid #eee', display: 'block' }} />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <div onClick={() => logoRef.current.click()} style={{ fontSize: '12px', color: '#6366F1', cursor: 'pointer' }}>Change</div>
                    <div onClick={() => update('logo_url', '')} style={{ fontSize: '12px', color: '#CC0000', cursor: 'pointer' }}>Remove</div>
                  </div>
                </div>
              ) : (
                <div onClick={() => logoRef.current.click()} style={{ border: '2px dashed #ddd', borderRadius: '8px', padding: '24px', textAlign: 'center', cursor: 'pointer', color: '#aaa', fontSize: '13px' }}>
                  {uploading.logo ? '⏳ Uploading...' : '📁 Click to upload logo'}
                </div>
              )}
            </div>

            {/* Signature */}
            <div>
              <label style={lbl}>Signature Image</label>
              <input ref={sigRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleUpload('signature', e.target.files[0])} />
              {form.signature_url ? (
                <div>
                  <img src={form.signature_url} alt="Signature" style={{ maxHeight: '80px', maxWidth: '200px', borderRadius: '6px', border: '1px solid #eee', display: 'block' }} />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <div onClick={() => sigRef.current.click()} style={{ fontSize: '12px', color: '#6366F1', cursor: 'pointer' }}>Change</div>
                    <div onClick={() => update('signature_url', '')} style={{ fontSize: '12px', color: '#CC0000', cursor: 'pointer' }}>Remove</div>
                  </div>
                </div>
              ) : (
                <div onClick={() => sigRef.current.click()} style={{ border: '2px dashed #ddd', borderRadius: '8px', padding: '24px', textAlign: 'center', cursor: 'pointer', color: '#aaa', fontSize: '13px' }}>
                  {uploading.signature ? '⏳ Uploading...' : '✍️ Click to upload signature'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={sec}>
          <h3 style={secT}>PDF Footer</h3>
          <div style={{ marginBottom: '8px', fontSize: '12px', color: '#999' }}>Appears at the bottom of every invoice/quote PDF — bank details, tagline, etc.</div>
          <textarea
            value={form.footer_text}
            onChange={e => update('footer_text', e.target.value)}
            placeholder={'e.g.\nBank: First Bank | Account: Sun & Shield Power Solutions | No: 0123456789\nAll prices are in Nigerian Naira (NGN). Payment within 30 days.'}
            style={{ ...inp, height: '100px', resize: 'vertical', fontFamily: 'inherit', lineHeight: '1.6' }}
          />
        </div>

        {/* Save */}
        <div style={{ display: 'flex', gap: '12px', paddingBottom: '40px' }}>
          <div onClick={handleSave} style={{ flex: 1, padding: '14px', backgroundColor: '#CC0000', color: 'white', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>
            {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Settings'}
          </div>
          <div onClick={() => navigate(-1)} style={{ padding: '14px 20px', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', color: '#555', fontSize: '15px' }}>Cancel</div>
        </div>

      </div>
    </Layout>
  )
}
