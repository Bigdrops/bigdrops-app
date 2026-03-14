import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import { useSettings, uploadFile, saveSettings } from '../hooks/useSettings'
import { QUICK_TILE_REGISTRY, DEFAULT_QUICK_TILES } from '../config/quickTiles'
import {
  Building2, CreditCard, ImageIcon, FileText,
  Shield, Check, Loader2, ChevronRight, Upload, X,
  Eye, EyeOff, UserCheck, UserX, Trash2, Smartphone, LayoutDashboard
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
  // Custom additional info fields — stored as JSON in settings.custom_info
  const [customInfo, setCustomInfo] = useState([]) // [{title, content}]

  useEffect(() => {
    if (!loading && settings) {
      setForm(f => ({ ...f, ...settings }))
      try {
        const parsed = JSON.parse(settings.custom_info || '[]')
        if (Array.isArray(parsed)) setCustomInfo(parsed)
      } catch(e) {}
    }
  }, [loading, settings])

  const u = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    setSaving(true)
    try {
      await saveSettings({
        ...form,
        custom_info: JSON.stringify(customInfo.filter(f => f.title || f.content))
      })
      setSaved(true)
      onToast('Company info saved')
      setTimeout(() => setSaved(false), 2500)
    } catch (e) { alert('Save failed: ' + e.message) }
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

      {/* ── Additional Info Fields ── */}
      <div className="pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Additional Info</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Extra fields that appear on your invoice header (e.g. RC Number, Tax ID)</p>
          </div>
          <button
            onClick={() => setCustomInfo(p => [...p, { title: '', content: '' }])}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 whitespace-nowrap"
          >+ Add Field</button>
        </div>
        {customInfo.length === 0 && (
          <p className="text-xs text-slate-300 italic">No extra fields yet. Click + Add Field above.</p>
        )}
        {customInfo.map((item, i) => (
          <div key={i} className="flex gap-2 mb-2 items-center">
            <input
              className="w-2/5 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 placeholder:text-slate-300"
              value={item.title}
              onChange={e => setCustomInfo(p => p.map((x, j) => j === i ? { ...x, title: e.target.value } : x))}
              placeholder="Title (e.g. RC Number)"
            />
            <input
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 placeholder:text-slate-300"
              value={item.content}
              onChange={e => setCustomInfo(p => p.map((x, j) => j === i ? { ...x, content: e.target.value } : x))}
              placeholder="Value"
            />
            <button
              onClick={() => setCustomInfo(p => p.filter((_, j) => j !== i))}
              className="text-slate-400 hover:text-red-500 text-xl leading-none px-1 flex-shrink-0"
            >×</button>
          </div>
        ))}
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

function DashboardSection() {
  const allTiles = Object.keys(QUICK_TILE_REGISTRY)

  const getInitialTiles = () => {
    try {
      const saved = localStorage.getItem('quick_tiles')
      if (!saved) return DEFAULT_QUICK_TILES
      const parsed = JSON.parse(saved)
      if (!Array.isArray(parsed)) return DEFAULT_QUICK_TILES
      const validSaved = parsed.filter((id) => QUICK_TILE_REGISTRY[id])
      return validSaved.length > 0 ? validSaved : DEFAULT_QUICK_TILES
    } catch (e) {
      return DEFAULT_QUICK_TILES
    }
  }

  const [activeTiles, setActiveTiles] = useState(getInitialTiles)

  const saveTiles = (nextTiles) => {
    setActiveTiles(nextTiles)
    localStorage.setItem('quick_tiles', JSON.stringify(nextTiles))
  }

  const toggleTile = (tileId) => {
    const included = activeTiles.includes(tileId)
    if (included) {
      saveTiles(activeTiles.filter((id) => id !== tileId))
    } else {
      saveTiles([...activeTiles, tileId])
    }
  }

  const moveTile = (tileId, direction) => {
    const idx = activeTiles.indexOf(tileId)
    if (idx < 0) return
    const target = direction === 'up' ? idx - 1 : idx + 1
    if (target < 0 || target >= activeTiles.length) return
    const next = [...activeTiles]
    ;[next[idx], next[target]] = [next[target], next[idx]]
    saveTiles(next)
  }

  return (
    <div className="space-y-2">
      {allTiles.map((tileId) => {
        const tile = QUICK_TILE_REGISTRY[tileId]
        const included = activeTiles.includes(tileId)
        const idx = activeTiles.indexOf(tileId)
        const isFirst = idx === 0
        const isLast = idx === activeTiles.length - 1

        return (
          <div
            key={tileId}
            className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800">{tile.label}</p>
            </div>
            <button
              onClick={() => toggleTile(tileId)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                included
                  ? 'border-red-200 text-red-600 hover:bg-red-50'
                  : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              {included ? 'Exclude' : 'Include'}
            </button>
            <button
              onClick={() => moveTile(tileId, 'up')}
              disabled={!included || isFirst}
              className="px-2 py-1.5 rounded-lg text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Up
            </button>
            <button
              onClick={() => moveTile(tileId, 'down')}
              disabled={!included || isLast}
              className="px-2 py-1.5 rounded-lg text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Down
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ─── Confirmation Modals ──────────────────────────────────────────────────────

function ConfirmModal({ type, user, onConfirm, onCancel, loading }) {
  const [emailInput, setEmailInput] = useState('')
  const cancelRef = useRef()
  const inputRef = useRef()

  // Esc key closes
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  // Focus Cancel by default (approve/deactivate), focus input for remove
  useEffect(() => {
    if (type === 'remove') inputRef.current?.focus()
    else cancelRef.current?.focus()
  }, [type])

  const emailMatch = emailInput.trim().toLowerCase() === user.email.toLowerCase()

  const config = {
    approve: {
      title: 'Grant Access',
      icon: <UserCheck size={22} className="text-emerald-600" />,
      iconBg: 'bg-emerald-50',
      body: (
        <>
          <p className="text-sm text-slate-700 leading-relaxed">
            You are about to grant <span className="font-bold text-slate-900">{user.email}</span> full access to BIGDROPS.
          </p>
          <p className="text-xs text-slate-400 mt-2">They will be able to create invoices, CSRs, and view all client data immediately.</p>
        </>
      ),
      confirmLabel: 'Yes, Grant Access',
      confirmClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      canConfirm: true,
    },
    deactivate: {
      title: 'Deactivate Account',
      icon: <UserX size={22} className="text-amber-600" />,
      iconBg: 'bg-amber-50',
      body: (
        <>
          <p className="text-sm text-slate-700 leading-relaxed">
            <span className="font-bold text-slate-900">{user.email}</span> will be <span className="font-bold text-amber-700">locked out immediately.</span>
          </p>
          <p className="text-xs text-slate-400 mt-2">Their data is preserved. You can reactivate them at any time.</p>
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex gap-2 items-start">
            <span className="text-amber-500 text-sm mt-0.5">⚠️</span>
            <p className="text-xs text-amber-700 font-semibold">If they are currently logged in, they will be blocked on their next action.</p>
          </div>
        </>
      ),
      confirmLabel: 'Yes, Deactivate',
      confirmClass: 'bg-amber-600 hover:bg-amber-700 text-white',
      canConfirm: true,
    },
    remove: {
      title: 'Remove User',
      icon: <Trash2 size={22} className="text-red-600" />,
      iconBg: 'bg-red-50',
      body: (
        <>
          <p className="text-sm text-slate-700 leading-relaxed">
            This will <span className="font-bold text-red-700">permanently remove</span> <span className="font-bold text-slate-900">{user.email}</span> from BIGDROPS.
          </p>
          <p className="text-xs text-slate-400 mt-2">Their invoice and CSR history is preserved, but their login access is gone forever.</p>
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex gap-2 items-start">
            <span className="text-red-500 text-sm mt-0.5">🚨</span>
            <p className="text-xs text-red-700 font-semibold">This cannot be undone. Type the email address below to confirm.</p>
          </div>
          <input
            ref={inputRef}
            value={emailInput}
            onChange={e => setEmailInput(e.target.value)}
            placeholder={user.email}
            className="mt-3 w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors font-mono"
          />
          {emailInput && !emailMatch && (
            <p className="text-[11px] text-red-500 font-bold mt-1">Email doesn't match</p>
          )}
        </>
      ),
      confirmLabel: 'Permanently Remove',
      confirmClass: emailMatch ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed',
      canConfirm: emailMatch,
    },
  }

  const c = config[type]

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${c.iconBg}`}>
            {c.icon}
          </div>
          <h3 className="text-base font-black text-slate-900">{c.title}</h3>
        </div>

        {/* Body */}
        <div className="px-5 pb-5">
          {c.body}
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-2">
          <button
            ref={cancelRef}
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={c.canConfirm ? onConfirm : undefined}
            disabled={!c.canConfirm || loading}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${c.confirmClass} disabled:opacity-60`}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            {loading ? 'Processing…' : c.confirmLabel}
          </button>
        </div>

        <p className="text-center text-[10px] text-slate-300 font-bold pb-3">Press Esc to cancel</p>
      </div>
    </div>
  )
}

// ─── Admin Section ────────────────────────────────────────────────────────────

function AdminSection({ onToast, session }) {
  const [tab, setTab] = useState('users')
  const [users, setUsers] = useState([])
  const [devices, setDevices] = useState([])
  const [fetching, setFetching] = useState(true)
  const [actionId, setActionId] = useState(null)
  // modal: { type: 'approve'|'deactivate'|'remove', user }
  const [modal, setModal] = useState(null)

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

  const closeModal = useCallback(() => setModal(null), [])

  const handleConfirm = async () => {
    if (!modal) return
    const { type, user } = modal
    setActionId(user.id + '_' + type[0])
    try {
      if (type === 'approve') {
        await supabase.from('profiles').update({ is_approved: true }).eq('id', user.id)
        onToast('Access granted to ' + user.email)
      } else if (type === 'deactivate') {
        await supabase.from('profiles').update({ is_approved: false }).eq('id', user.id)
        onToast(user.email + ' deactivated')
      } else if (type === 'remove') {
        await supabase.from('profiles').delete().eq('id', user.id)
        onToast(user.email + ' removed')
      }
      await fetchAll()
    } catch (e) {
      onToast('Error: ' + e.message)
    }
    setActionId(null)
    setModal(null)
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

  const isLoading = (id, suffix) => actionId === id + '_' + suffix

  return (
    <div>
      {/* Confirmation modal */}
      {modal && (
        <ConfirmModal
          type={modal.type}
          user={modal.user}
          onConfirm={handleConfirm}
          onCancel={closeModal}
          loading={!!actionId}
        />
      )}

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
          {users.map(u => {
            const isSelf = u.id === session?.user?.id
            return (
            <div key={u.id} className={`bg-white rounded-xl border p-4 ${isSelf ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-800 truncate">{u.email}</p>
                    {isSelf && <span className="text-[10px] font-black bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full shrink-0">YOU</span>}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {new Date(u.created_at).toLocaleDateString()}
                    {u.assigned_device_code && <span className="ml-2 font-bold text-slate-600">· {u.assigned_device_code}</span>}
                  </p>
                </div>
                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full shrink-0 ${u.is_approved ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-600'}`}>
                  {u.is_approved ? 'Active' : 'Pending'}
                </span>
              </div>
              {isSelf ? (
                <p className="text-[11px] text-blue-400 font-bold text-center py-1">🔒 Cannot modify your own account</p>
              ) : (
                <div className="flex gap-2">
                  {!u.is_approved
                    ? <button
                        onClick={() => setModal({ type: 'approve', user: u })}
                        disabled={isLoading(u.id, 'a')}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors disabled:opacity-50">
                        {isLoading(u.id, 'a') ? <Loader2 size={11} className="animate-spin" /> : <UserCheck size={11} />} Approve
                      </button>
                    : <button
                        onClick={() => setModal({ type: 'deactivate', user: u })}
                        disabled={isLoading(u.id, 'd')}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold hover:bg-amber-100 transition-colors disabled:opacity-50">
                        {isLoading(u.id, 'd') ? <Loader2 size={11} className="animate-spin" /> : <UserX size={11} />} Deactivate
                      </button>
                  }
                  <button
                    onClick={() => setModal({ type: 'remove', user: u })}
                    disabled={isLoading(u.id, 'r')}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors disabled:opacity-50">
                    {isLoading(u.id, 'r') ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />} Remove
                  </button>
                </div>
              )}
            </div>
          )})
          }
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
  { id: 'dashboard', label: 'Dashboard',       icon: LayoutDashboard, desc: 'Quick tiles on dashboard header' },
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
      case 'dashboard': return <DashboardSection />
      case 'user':     return <UserSection session={session} onToast={showToast} />
      case 'admin':    return <AdminSection onToast={showToast} session={session} />
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
