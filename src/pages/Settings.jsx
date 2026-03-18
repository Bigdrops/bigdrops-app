import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import { useSettings, uploadFile, saveSettings } from '../hooks/useSettings'
import { QUICK_TILE_REGISTRY, DEFAULT_QUICK_TILES } from '../config/quickTiles'
import { Switch } from '@/components/ui/switch'
import {
  Building2, CreditCard, ImageIcon, FileText,
  Shield, Check, Loader2, ChevronRight, Upload, X,
  Eye, EyeOff, UserCheck, UserX, Trash2, Smartphone, LayoutDashboard,
  FolderKanban, Wrench, ArchiveRestore, ClipboardList
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
  const [editing, setEditing] = useState(false)
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

  useEffect(() => {
    if (!loading) {
      const hasSavedData = [
        settings?.company_name,
        settings?.company_tagline,
        settings?.company_address,
        settings?.company_phone,
        settings?.company_email,
      ].some(Boolean)
      setEditing(!hasSavedData)
    }
  }, [loading, settings])

  const u = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const restoreSavedCompanyState = () => {
    setForm({
      company_name: settings?.company_name || '',
      company_tagline: settings?.company_tagline || '',
      company_address: settings?.company_address || '',
      company_city: settings?.company_city || '',
      company_phone: settings?.company_phone || '',
      company_email: settings?.company_email || '',
      company_website: settings?.company_website || '',
    })
    try {
      const parsed = JSON.parse(settings?.custom_info || '[]')
      setCustomInfo(Array.isArray(parsed) ? parsed : [])
    } catch {
      setCustomInfo([])
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      await saveSettings({
        ...form,
        custom_info: JSON.stringify(customInfo.filter(f => f.title || f.content))
      })
      setSaved(true)
      setEditing(false)
      onToast('Company info saved')
      setTimeout(() => setSaved(false), 2500)
    } catch (e) { alert('Save failed: ' + e.message) }
    setSaving(false)
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-slate-300" /></div>

  if (!editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <div>
            <div className="text-sm font-bold text-slate-900">Saved business identity</div>
            <div className="mt-1 text-xs text-slate-500">
              These details appear anywhere the app needs your company identity.
            </div>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            Edit
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SummaryField label="Company Name" value={form.company_name} />
          <SummaryField label="Tagline" value={form.company_tagline} />
          <SummaryField label="Address" value={form.company_address} />
          <SummaryField label="City / State" value={form.company_city} />
          <SummaryField label="Phone" value={form.company_phone} />
          <SummaryField label="Email" value={form.company_email} />
          <SummaryField label="Website" value={form.company_website} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
        <div>
          <div className="text-sm font-bold text-slate-900">Edit business identity</div>
          <div className="mt-1 text-xs text-slate-500">
            Save changes to update the company details used across the workspace.
          </div>
        </div>
        <button
          onClick={() => {
            restoreSavedCompanyState()
            setEditing(false)
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
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
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (!loading && settings) setForm(f => ({ ...f, ...settings }))
  }, [loading, settings])

  useEffect(() => {
    if (!loading) {
      const hasSavedData = [
        settings?.bank_name,
        settings?.bank_account_name,
        settings?.bank_account_number,
        settings?.bank_sort_code,
      ].some(Boolean)
      setEditing(!hasSavedData)
    }
  }, [loading, settings])

  const u = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const restoreSavedBankingState = () => {
    setForm({
      bank_name: settings?.bank_name || '',
      bank_account_name: settings?.bank_account_name || '',
      bank_account_number: settings?.bank_account_number || '',
      bank_sort_code: settings?.bank_sort_code || '',
    })
  }

  const save = async () => {
    setSaving(true)
    try {
      await saveSettings(form)
      setSaved(true)
      setEditing(false)
      onToast('Banking details saved')
      setTimeout(() => setSaved(false), 2500)
    } catch (e) { alert(e.message) }
    setSaving(false)
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-slate-300" /></div>

  if (!editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <div>
            <div className="text-sm font-bold text-slate-900">Saved payment details</div>
            <div className="mt-1 text-xs text-slate-500">
              This workspace currently supports one saved bank account.
            </div>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            Edit
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SummaryField label="Bank Name" value={form.bank_name} />
          <SummaryField label="Account Name" value={form.bank_account_name} />
          <SummaryField label="Account Number" value={form.bank_account_number} />
          <SummaryField label="Sort Code / SWIFT" value={form.bank_sort_code} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
        <div>
          <div className="text-sm font-bold text-slate-900">Edit payment details</div>
          <div className="mt-1 text-xs text-slate-500">
            Update the single bank account currently stored for invoices and payment instructions.
          </div>
        </div>
        <button
          onClick={() => {
            restoreSavedBankingState()
            setEditing(false)
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
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
  const orderedTiles = ['invoices', 'projects', 'csr']
  const [flashTile, setFlashTile] = useState(null)
  const tileMeta = {
    invoices: {
      icon: FileText,
      iconBg: '#EFF6FF',
      iconColor: '#2563EB',
      description: 'Sales invoices and billing',
    },
    projects: {
      icon: FolderKanban,
      iconBg: '#F0FDF4',
      iconColor: '#16A34A',
      description: 'Jobs and project trees',
    },
    csr: {
      icon: Wrench,
      iconBg: '#FFF7ED',
      iconColor: '#EA580C',
      description: 'Customer service reports',
    },
  }

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
    setFlashTile(nextTiles[nextTiles.length - 1] || 'saved')
    window.clearTimeout(window.__quickTilesFlashTimeout)
    window.__quickTilesFlashTimeout = window.setTimeout(() => setFlashTile(null), 900)
  }

  const toggleTile = (tileId) => {
    const included = activeTiles.includes(tileId)
    if (included) {
      saveTiles(orderedTiles.filter((id) => id !== tileId && activeTiles.includes(id)))
    } else {
      saveTiles(orderedTiles.filter((id) => id === tileId || activeTiles.includes(id)))
      setFlashTile(tileId)
      window.clearTimeout(window.__quickTilesFlashTimeout)
      window.__quickTilesFlashTimeout = window.setTimeout(() => setFlashTile(null), 900)
      return
    }
    setFlashTile(tileId)
    window.clearTimeout(window.__quickTilesFlashTimeout)
    window.__quickTilesFlashTimeout = window.setTimeout(() => setFlashTile(null), 900)
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-4">
        <h3 className="text-sm font-bold text-slate-900">Quick Tiles</h3>
        <p className="mt-1 text-xs text-slate-400">
          Local mobile preference only. These quick-access chips appear on this device at the top of the mobile dashboard.
        </p>
      </div>
      <div className="px-5">
      {orderedTiles.map((tileId, index) => {
        const tile = QUICK_TILE_REGISTRY[tileId]
        const included = activeTiles.includes(tileId)
        const meta = tileMeta[tileId]
        const Icon = meta.icon

        return (
          <div
            key={tileId}
            className={`flex items-center justify-between gap-3 py-3.5 transition-colors ${
              flashTile === tileId ? 'bg-emerald-50/70' : ''
            } ${index < orderedTiles.length - 1 ? 'border-b border-slate-100' : ''}`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
                style={{ backgroundColor: meta.iconBg, color: meta.iconColor }}
              >
                <Icon size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{tile.label}</p>
                <p className="text-[11px] text-slate-400">{meta.description}</p>
              </div>
            </div>
            <Switch checked={included} onCheckedChange={() => toggleTile(tileId)} />
          </div>
        )
      })}
      </div>
      <p className="px-5 pb-4 pt-3 text-center text-[11px] text-slate-400">
        Saved only on this device. Desktop navigation is unchanged.
      </p>
    </div>
  )
}

function SummaryField({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-800">{value || 'Not set'}</div>
    </div>
  )
}

function ArchivesSection({ onToast }) {
  const [tab, setTab] = useState('invoices')
  const [loading, setLoading] = useState(true)
  const [restoringId, setRestoringId] = useState(null)
  const [data, setData] = useState({
    invoices: [],
    quotations: [],
    projects: [],
  })

  const loadArchives = useCallback(async () => {
    setLoading(true)
    const [{ data: invoices }, { data: quotations }, { data: projects }] = await Promise.all([
      supabase.from('invoices').select('id, invoice_number, client_name, total, status, issue_date, archived_at').not('archived_at', 'is', null).order('archived_at', { ascending: false }),
      supabase.from('quotations').select('id, quotation_number, client_name, total, status, issue_date, archived_at').not('archived_at', 'is', null).order('archived_at', { ascending: false }),
      supabase.from('projects').select('id, name, client_name, status, start_date, project_value, archived_at').not('archived_at', 'is', null).order('archived_at', { ascending: false }),
    ])

    setData({
      invoices: invoices || [],
      quotations: quotations || [],
      projects: projects || [],
    })
    setLoading(false)
  }, [])

  useEffect(() => {
    loadArchives()
  }, [loadArchives])

  const formatMoney = (value) => `₦${Number(value || 0).toLocaleString()}`
  const formatDate = (value) => {
    if (!value) return 'Not set'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return String(value)
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const restoreRecord = async (entity, id) => {
    setRestoringId(`${entity}:${id}`)
    const { error } = await supabase.from(entity).update({ archived_at: null }).eq('id', id)
    if (error) {
      alert(`Restore failed: ${error.message}`)
      setRestoringId(null)
      return
    }
    await loadArchives()
    setRestoringId(null)
    onToast('Record restored')
  }

  const tabs = [
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'quotations', label: 'Quotations', icon: ClipboardList },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
  ]

  const activeItems = data[tab] || []

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
        <div className="text-sm font-bold text-slate-900">Archived records</div>
        <div className="mt-1 text-xs text-slate-500">
          Restore archived invoices, quotations, and projects here by clearing their archive state.
        </div>
      </div>

      <div className="flex gap-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
              tab === id
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <Icon size={12} />
              {label}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-slate-300" /></div>
      ) : activeItems.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
          No archived {tab}.
        </div>
      ) : (
        <div className="space-y-3">
          {activeItems.map((item) => {
            const restoring = restoringId === `${tab}:${item.id}`
            const title =
              tab === 'invoices' ? item.invoice_number :
              tab === 'quotations' ? item.quotation_number :
              item.name
            const subline =
              tab === 'projects'
                ? item.client_name || 'No client'
                : item.client_name || 'No client'

            return (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="break-words text-sm font-bold text-slate-900">{title}</div>
                    <div className="mt-1 text-xs text-slate-500">{subline}</div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400">
                      <span>Archived: {formatDate(item.archived_at)}</span>
                      {tab === 'projects'
                        ? <span>Start: {formatDate(item.start_date)}</span>
                        : <span>Issue date: {formatDate(item.issue_date)}</span>}
                      {item.status ? <span>Status: {String(item.status)}</span> : null}
                      {tab !== 'projects' ? <span>Total: {formatMoney(item.total)}</span> : null}
                      {tab === 'projects' && item.project_value ? <span>Value: {formatMoney(item.project_value)}</span> : null}
                    </div>
                  </div>
                  <button
                    onClick={() => restoreRecord(tab, item.id)}
                    disabled={restoring}
                    className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {restoring ? 'Restoring...' : 'Restore'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
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
  { id: 'archives', label: 'Archives',         icon: ArchiveRestore, desc: 'Restore archived invoices, quotations, and projects' },
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
      case 'archives': return <ArchivesSection onToast={showToast} />
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
          BIGDROPS ERP
        </p>
      </div>
    </Layout>
  )
}
