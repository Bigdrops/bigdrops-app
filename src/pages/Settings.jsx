import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import { useSettings, uploadFile, saveSettings } from '../hooks/useSettings'
import {
  Building2, CreditCard, ImageIcon, FileText,
  Shield, Check, Loader2, ChevronRight, Upload, X,
  Eye, EyeOff, UserCheck, UserX, Trash2, Smartphone
} from 'lucide-react'

const ADMIN_EMAILS = ['jaiyewisdom@gmail.com', 'mondayevg2007@gmail.com']
const DEVICE_CODES = ['La', 'Lb', 'Lc', 'Ld']

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t) }, [onDone])
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
      <Check size={13} className="text-emerald-400" />
      {message}
    </div>
  )
}

// ─── Field helpers ────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors placeholder:text-slate-300"
    />
  )
}

function SaveBtn({ saving, saved, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="w-full py-3 rounded-xl bg-slate-900 text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors disabled:opacity-50 mt-6"
    >
      {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <Check size={15} /> : null}
      {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
    </button>
  )
}

// ─── Sections ─────────────────────────────────────────────────────────────────

function CompanySection({ onToast }) {
  const { settings, loading } = useSettings()
  const [form, setForm] = useState({
    company_name: '', company_tagline: '', company_address: '',
    company_city: '', company_phone: '', company_email: '', company_website: ''
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!loading && settings) setForm(f => ({ ...f, ...settings }))
  }, [loading, settings])

  const u = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    setSaving(true)
    try {
      await saveSettings(form)
      setSaved(true)
      onToast('Company info saved')
      setTimeout(() => setSaved(false), 2500)
    } catch (e) { alert(e.message) }
    setSaving(false)
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-slate-300" /></div>

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Company Name"><Input value={form.company_name} onChange={v => u('company_name', v)} placeholder="Sun & Shield Power Solutions" /></Field>
        <Field label="Tagline"><Input value={form.company_tagline} onChange={v => u('company_tagline', v)} placeholder="Generator Sales | Maintenance" /></Field>
      </div>
      <Field label="Address"><Input value={form.company_address} onChange={v => u('company_address', v)} placeholder="No. 5 Industrial Road, Apapa" /></Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="City / State"><Input value={form.company_city} onChange={v => u('company_city', v)} placeholder="Lagos, Nigeria" /></Field>
        <Field label="Phone"><Input value={form.company_phone} onChange={v => u('company_phone', v)} placeholder="+234 801 234 5678" /></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Email"><Input value={form.company_email} onChange={v => u('company_email', v)} placeholder="info@sunshield.ng" /></Field>
        <Field label="Website"><Input value={form.company_website} onChange={v => u('company_website', v)} placeholder="www.sunshield.ng" /></Field>
      </div>
      <SaveBtn saving={saving} saved={saved} onClick={save} />
    </div>
  )
}

function BankingSection({ onToast }) {
  const { settings, loading } = useSettings()
  const [form, setForm] = useState({ bank_name: '', bank_account_name: '', bank_account_number: '', bank_sort_code: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!loading && settings) setForm(f => ({ ...f, ...settings }))
  }, [loading, settings])

  const u = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    setSaving(true)
    try {
      await saveSettings(form)
      setSaved(true)
      onToast('Banking details saved')
      setTimeout(() => setSaved(false), 2500)
    } catch (e) { alert(e.message) }
    setSaving(false)
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-slate-300" /></div>

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Bank Name"><Input value={form.bank_name} onChange={v => u('bank_name', v)} placeholder="First Bank of Nigeria" /></Field>
        <Field label="Account Name"><Input value={form.bank_account_name} onChange={v => u('bank_account_name', v)} placeholder="Sun & Shield Power Solutions" /></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Account Number"><Input value={form.bank_account_number} onChange={v => u('bank_account_number', v)} placeholder="0123456789" /></Field>
        <Field label="Sort Code / SWIFT"><Input value={form.bank_sort_code} onChange={v => u('bank_sort_code', v)} placeholder="011-152-383" /></Field>
      </div>
      <SaveBtn saving={saving} saved={saved} onClick={save} />
    </div>
  )
}

function BrandingSection({ onToast }) {
  const { settings, loading } = useSettings()
  const [form, setForm] = useState({ logo_url: '', signature_url: '', footer_text: '' })
  const [uploading, setUploading] = useState({ logo: false, signature: false })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const logoRef = useRef()
  const sigRef = useRef()

  useEffect(() => {
    if (!loading && settings) setForm(f => ({ ...f, ...settings }))
  }, [loading, settings])

  const u = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleUpload = async (type, file) => {
    if (!file) return
    setUploading(p => ({ ...p, [type]: true }))
    try {
      const ext = file.name.split('.').pop()
      const path = `${type}/${Date.now()}.${ext}`
      const url = await uploadFile('company-assets', path, file)
      u(type + '_url', url)
      onToast(`${type === 'logo' ? 'Logo' : 'Signature'} uploaded`)
    } catch (e) { alert('Upload failed: ' + e.message) }
    setUploading(p => ({ ...p, [type]: false }))
  }

  const save = async () => {
    setSaving(true)
    try {
      await saveSettings(form)
      setSaved(true)
      onToast('Branding saved')
      setTimeout(() => setSaved(false), 2500)
    } catch (e) { alert(e.message) }
    setSaving(false)
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-slate-300" /></div>

  const UploadBox = ({ type, label, inputRef }) => (
    <Field label={label}>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => handleUpload(type, e.target.files[0])} />
      {form[type + '_url'] ? (
        <div className="relative inline-flex flex-col gap-2">
          <img src={form[type + '_url']} alt={label} className="max-h-20 max-w-[180px] rounded-lg border border-slate-200 object-contain" />
          <div className="flex gap-3">
            <button onClick={() => inputRef.current.click()} className="text-xs text-blue-600 font-semibold hover:underline">Change</button>
            <button onClick={() => u(type + '_url', '')} className="text-xs text-red-500 font-semibold hover:underline">Remove</button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current.click()}
          className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors"
        >
          {uploading[type]
            ? <Loader2 size={20} className="animate-spin text-slate-400 mx-auto mb-1" />
            : <Upload size={20} className="text-slate-300 mx-auto mb-1" />
          }
          <p className="text-xs text-slate-400 font-medium">{uploading[type] ? 'Uploading…' : 'Click to upload'}</p>
        </div>
      )}
    </Field>
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <UploadBox type="logo" label="Company Logo" inputRef={logoRef} />
        <UploadBox type="signature" label="Signature" inputRef={sigRef} />
      </div>
      <Field label="PDF Footer Text">
        <textarea
          value={form.footer_text || ''}
          onChange={e => u('footer_text', e.target.value)}
          placeholder={'Bank: First Bank | Account: Sun & Shield Power Solutions | No: 0123456789\nAll prices in NGN. Payment within 30 days.'}
          rows={4}
          className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors resize-none placeholder:text-slate-300"
        />
      </Field>
      <SaveBtn saving={saving} saved={saved} onClick={save} />
    </div>
  )
}

function UserSection({ session, onToast }) {
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [showPass, setShowPass] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    setError('')
    if (form.password.length < 6) { setError('Minimum 6 characters'); return }
    if (form.password !== form.confirm) { setError('Passwords do not match'); return }
    setSaving(true)
    const { error: e } = await supabase.auth.updateUser({ password: form.password })
    if (e) { setError(e.message); setSaving(false); return }
    await supabase.from('profiles').update({ has_password: true }).eq('id', session.user.id)
    setSaving(false)
    setSaved(true)
    setForm({ password: '', confirm: '' })
    onToast('Password updated')
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Signed in as</p>
        <p className="text-sm font-bold text-slate-800">{session?.user?.email}</p>
      </div>
      <Field label="New Password">
        <div className="relative">
          <input
            type={showPass ? 'text' : 'password'}
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            placeholder="Min. 6 characters"
            className="w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors"
          />
          <button onClick={() => setShowPass(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
            {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </Field>
      <Field label="Confirm Password">
        <input
          type="password"
          value={form.confirm}
          onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
          placeholder="Repeat password"
          className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors"
        />
      </Field>
      {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
      <SaveBtn saving={saving} saved={saved} onClick={save} />
    </div>
  )
}

function AdminSection({ onToast }) {
  const [tab, setTab] = useState('users')
  const [users, setUsers] = useState([])
  const [devices, setDevices] = useState([])
  const [fetching, setFetching] = useState(true)
  const [actionId, setActionId] = useState(null)

  const fetchAll = useCallback(async () => {
    setFetching(true)
    const [{ data: u }, { data: d }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('devices').select('*, profiles(email)'),
    ])
    setUsers(u || [])
    setDevices(d || [])
    setFetching(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const approve = async (id) => {
    setActionId(id + '_a')
    await supabase.from('profiles').update({ is_approved: true }).eq('id', id)
    await fetchAll()
    setActionId(null)
    onToast('User approved')
  }

  const deactivate = async (id) => {
    setActionId(id + '_d')
    await supabase.from('profiles').update({ is_approved: false }).eq('id', id)
    await fetchAll()
    setActionId(null)
    onToast('User deactivated')
  }

  const remove = async (id) => {
    if (!window.confirm('Remove access? Invoice history is preserved.')) return
    setActionId(id + '_r')
    await supabase.from('profiles').delete().eq('id', id)
    await fetchAll()
    setActionId(null)
    onToast('User removed')
  }

  const assignDevice = async (code, userId) => {
    setActionId(code)
    if (userId === '') {
      await supabase.from('devices').update({ user_id: null }).eq('device_code', code)
    } else {
      await supabase.from('devices').upsert({ device_code: code, user_id: userId })
      await supabase.from('profiles').update({ assigned_device_code: code }).eq('id', userId)
    }
    await fetchAll()
    setActionId(null)
    onToast('Device updated')
  }

  return (
    <div>
      <div className="flex gap-2 mb-5">
        {['users', 'devices'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors
              ${tab === t ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
            {t === 'users' ? 'Manage Users' : 'Device Codes'}
          </button>
        ))}
      </div>

      {fetching ? (
        <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-slate-300" /></div>
      ) : tab === 'users' ? (
        <div className="space-y-3">
          {users.map(u => (
            <div key={u.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{u.email}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {new Date(u.created_at).toLocaleDateString()}
                    {u.assigned_device_code && <span className="ml-2 font-bold text-slate-600">· {u.assigned_device_code}</span>}
                  </p>
                </div>
                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full shrink-0 ${u.is_approved ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-600'}`}>
                  {u.is_approved ? 'Active' : 'Pending'}
                </span>
              </div>
              <div className="flex gap-2">
                {!u.is_approved
                  ? <button onClick={() => approve(u.id)} disabled={actionId === u.id + '_a'}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors disabled:opacity-50">
                      {actionId === u.id + '_a' ? <Loader2 size={11} className="animate-spin" /> : <UserCheck size={11} />} Approve
                    </button>
                  : <button onClick={() => deactivate(u.id)} disabled={actionId === u.id + '_d'}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold hover:bg-amber-100 transition-colors disabled:opacity-50">
                      {actionId === u.id + '_d' ? <Loader2 size={11} className="animate-spin" /> : <UserX size={11} />} Deactivate
                    </button>
                }
                <button onClick={() => remove(u.id)} disabled={actionId === u.id + '_r'}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors disabled:opacity-50">
                  {actionId === u.id + '_r' ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />} Remove
                </button>
              </div>
            </div>
          ))}
          {users.length === 0 && <p className="text-center text-slate-400 text-xs font-bold py-8">NO USERS FOUND</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {DEVICE_CODES.map(code => {
            const device = devices.find(d => d.device_code === code)
            return (
              <div key={code} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <Smartphone size={15} className="text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800">Device {code}</p>
                    <p className="text-[11px] text-slate-400">{device?.profiles?.email || 'Unassigned'}</p>
                  </div>
                  {device?.profiles && (
                    <span className="ml-auto text-[10px] font-black bg-blue-50 text-blue-600 px-2 py-1 rounded-full">Assigned</span>
                  )}
                </div>
                <select
                  value={device?.user_id || ''}
                  onChange={e => assignDevice(code, e.target.value)}
                  disabled={actionId === code}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                >
                  <option value="">— Unassign —</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.email}</option>)}
                </select>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main Settings Page ────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'company',  label: 'Company Info',    icon: Building2,  desc: 'Name, address, contact' },
  { id: 'banking',  label: 'Banking',          icon: CreditCard, desc: 'Account & bank details' },
  { id: 'branding', label: 'Logo & Branding',  icon: ImageIcon,  desc: 'Logo, signature, footer' },
  { id: 'user',     label: 'User Settings',    icon: FileText,   desc: 'Change your password' },
]

const ADMIN_SECTION = { id: 'admin', label: 'Admin Panel', icon: Shield, desc: 'Users & device codes' }

export default function Settings() {
  const [active, setActive] = useState(null)
  const [session, setSession] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
  }, [])

  const isAdmin = ADMIN_EMAILS.includes(session?.user?.email)
  const sections = isAdmin ? [...SECTIONS, ADMIN_SECTION] : SECTIONS

  const showToast = useCallback((msg) => setToast(msg), [])

  const renderSection = () => {
    switch (active) {
      case 'company':  return <CompanySection onToast={showToast} />
      case 'banking':  return <BankingSection onToast={showToast} />
      case 'branding': return <BrandingSection onToast={showToast} />
      case 'user':     return <UserSection session={session} onToast={showToast} />
      case 'admin':    return <AdminSection onToast={showToast} />
      default:         return null
    }
  }

  const activeSection = sections.find(s => s.id === active)

  return (
    <Layout title="Settings" session={session}>
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      <div className="max-w-2xl mx-auto">
        {!active ? (
          // Home — section list
          <div className="space-y-2">
            {sections.map(({ id, label, icon: Icon, desc }) => (
              <button
                key={id}
                onClick={() => setActive(id)}
                className={`w-full flex items-center gap-4 px-4 py-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all group text-left
                  ${id === 'admin' ? 'border-red-100 hover:border-red-300' : ''}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                  ${id === 'admin' ? 'bg-red-50' : 'bg-slate-100'}`}>
                  <Icon size={17} className={id === 'admin' ? 'text-red-600' : 'text-slate-600'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${id === 'admin' ? 'text-red-600' : 'text-slate-800'}`}>{label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                </div>
                <ChevronRight size={15} className="text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
              </button>
            ))}
          </div>
        ) : (
          // Active section
          <div>
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setActive(null)}
                className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors shadow-sm"
                aria-label="Back to settings"
              >
                ←
              </button>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                {activeSection?.label}
              </h2>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              {renderSection()}
            </div>
          </div>
        )}

        <p className="text-center text-[11px] text-slate-300 font-bold uppercase tracking-widest mt-8 pb-4">
          BIGDROPS · Sun & Shield Power Solutions
        </p>
      </div>
    </Layout>
  )
}
