import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import DashboardQuickTilesSettings from '../components/settings/DashboardQuickTilesSettings'
import { useSettings, uploadFile, saveSettings } from '../hooks/useSettings'
import { ALL_QUICK_TILE_IDS, QUICK_TILE_COUNT, QUICK_TILE_REGISTRY, loadStoredQuickTiles, saveStoredQuickTiles } from '../config/quickTiles'
import {
  normalizeDocumentFillableSettings,
  serializeDocumentFillableSettings,
} from '@/lib/documentFillableSettings'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Building2, CreditCard, ImageIcon, FileText,
  Shield, Check, Loader2, ChevronRight, Upload, X,
  Pencil, Plus, UserCheck, UserX, Trash2, Smartphone, LayoutDashboard,
  ArchiveRestore, ClipboardList, FolderKanban
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
      <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{label}</label>
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
      className="w-full px-3 py-2.5 border border-input rounded-lg text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-ring/10 focus:border-slate-400 transition-colors placeholder:text-slate-300"
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
    } catch (e) { onToast('Save failed: ' + e.message) }
    setSaving(false)
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-slate-300" /></div>

  if (!editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-muted/50 px-4 py-4">
          <div>
            <div className="text-sm font-bold text-foreground">Saved business identity</div>
            <div className="mt-1 text-xs text-muted-foreground">
              These details appear anywhere the app needs your company identity.
            </div>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-muted/50"
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
      <div className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-muted/50 px-4 py-4">
        <div>
          <div className="text-sm font-bold text-foreground">Edit business identity</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Save changes to update the company details used across the workspace.
          </div>
        </div>
        <button
          onClick={() => {
            restoreSavedCompanyState()
            setEditing(false)
          }}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-muted/50"
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
      <div className="pt-2 border-t border-border">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Additional Info</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Extra fields that appear on your invoice header (e.g. RC Number, Tax ID)</p>
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
              className="w-2/5 px-3 py-2 border border-input rounded-lg text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-ring/10 placeholder:text-slate-300"
              value={item.title}
              onChange={e => setCustomInfo(p => p.map((x, j) => j === i ? { ...x, title: e.target.value } : x))}
              placeholder="Title (e.g. RC Number)"
            />
            <input
              className="flex-1 px-3 py-2 border border-input rounded-lg text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-ring/10 placeholder:text-slate-300"
              value={item.content}
              onChange={e => setCustomInfo(p => p.map((x, j) => j === i ? { ...x, content: e.target.value } : x))}
              placeholder="Value"
            />
            <button
              onClick={() => setCustomInfo(p => p.filter((_, j) => j !== i))}
              className="text-muted-foreground hover:text-red-500 text-xl leading-none px-1 flex-shrink-0"
            >×</button>
          </div>
        ))}
      </div>

      <SaveBtn saving={saving} saved={saved} onClick={save} />
    </div>
  )
}

function BankingSection({ onToast }) {
  const emptyForm = { bank_name: '', account_name: '', account_number: '', sort_code: '', is_default: false }
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [actionId, setActionId] = useState(null)

  const loadAccounts = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('id, bank_name, account_name, account_number, sort_code, is_default')
      .order('is_default', { ascending: false })
      .order('bank_name', { ascending: true })

    if (error) {
      onToast(`Failed to load bank accounts: ${error.message}`)
      setAccounts([])
    } else {
      setAccounts(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  const updateForm = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  const openEdit = (account) => {
    setEditingId(account.id)
    setForm({
      bank_name: account.bank_name || '',
      account_name: account.account_name || '',
      account_number: account.account_number || '',
      sort_code: account.sort_code || '',
      is_default: !!account.is_default,
    })
    setFormOpen(true)
  }

  const closeForm = () => {
    setEditingId(null)
    setForm(emptyForm)
    setFormOpen(false)
  }

  const saveAccount = async () => {
    if (!form.bank_name || !form.account_name || !form.account_number) {
      onToast('Bank name, account name, and account number are required')
      return
    }

    setSaving(true)
    try {
      if (form.is_default) {
        const resetQuery = supabase.from('bank_accounts').update({ is_default: false })
        const resetResult = editingId
          ? await resetQuery.neq('id', editingId)
          : await resetQuery.not('id', 'is', null)
        if (resetResult.error) throw resetResult.error
      }

      const payload = {
        bank_name: form.bank_name,
        account_name: form.account_name,
        account_number: form.account_number,
        sort_code: form.sort_code,
        is_default: !!form.is_default,
      }

      const result = editingId
        ? await supabase.from('bank_accounts').update(payload).eq('id', editingId)
        : await supabase.from('bank_accounts').insert(payload)

      if (result.error) throw result.error

      await loadAccounts()
      closeForm()
      onToast(editingId ? 'Bank account updated' : 'Bank account added')
    } catch (e) {
      onToast(e.message)
    }
    setSaving(false)
  }

  const removeAccount = async (id) => {
    setActionId(`delete:${id}`)
    const { error } = await supabase.from('bank_accounts').delete().eq('id', id)
    if (error) {
      onToast(`Delete failed: ${error.message}`)
      setActionId(null)
      return
    }
    await loadAccounts()
    setActionId(null)
    onToast('Bank account deleted')
  }

  const setDefault = async (id) => {
    setActionId(`default:${id}`)
    const { error: resetError } = await supabase.from('bank_accounts').update({ is_default: false }).neq('id', id)
    if (resetError) {
      onToast(`Default update failed: ${resetError.message}`)
      setActionId(null)
      return
    }

    const { error } = await supabase.from('bank_accounts').update({ is_default: true }).eq('id', id)
    if (error) {
      onToast(`Default update failed: ${error.message}`)
      setActionId(null)
      return
    }

    await loadAccounts()
    setActionId(null)
    onToast('Default bank account updated')
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-slate-300" /></div>

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-muted/50 px-4 py-4">
        <div className="text-sm font-bold text-foreground">Bank accounts</div>
        <div className="mt-1 text-xs text-muted-foreground">
          Manage the payment accounts available across invoices and other payment instructions.
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          No bank accounts added yet.
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => {
            const busy = actionId && actionId.includes(account.id)
            return (
              <div key={account.id} className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-bold text-foreground">{account.bank_name || 'Unnamed bank'}</div>
                      {account.is_default ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-600">
                          Default
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-sm text-slate-700">{account.account_name || 'No account name'}</div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span>Account No: {account.account_number || 'Not set'}</span>
                      <span>Sort Code: {account.sort_code || 'Not set'}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => openEdit(account)}
                      className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-slate-700 hover:bg-muted/50"
                    >
                      <span className="inline-flex items-center gap-1.5"><Pencil size={12} />Edit</span>
                    </button>
                    <button
                      onClick={() => removeAccount(account.id)}
                      disabled={busy}
                      className="rounded-xl border border-red-200 bg-card px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <span className="inline-flex items-center gap-1.5"><Trash2 size={12} />Delete</span>
                    </button>
                  </div>
                </div>
                {!account.is_default ? (
                  <button
                    onClick={() => setDefault(account.id)}
                    disabled={busy}
                    className="mt-4 rounded-xl border border-border bg-muted/50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-muted/50 disabled:opacity-50"
                  >
                    {actionId === `default:${account.id}` ? 'Updating...' : 'Set as Default'}
                  </button>
                ) : null}
              </div>
            )
          })}
        </div>
      )}

      {formOpen ? (
        <div className="rounded-2xl border border-border bg-muted/50 px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-foreground">{editingId ? 'Edit bank account' : 'Add bank account'}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Save the exact account details you want available inside the app.
              </div>
            </div>
            <button
              onClick={closeForm}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-muted/50"
            >
              Cancel
            </button>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Bank Name"><Input value={form.bank_name} onChange={(v) => updateForm('bank_name', v)} placeholder="First Bank of Nigeria" /></Field>
            <Field label="Account Name"><Input value={form.account_name} onChange={(v) => updateForm('account_name', v)} placeholder="Sun & Shield Power Solutions" /></Field>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Account Number"><Input value={form.account_number} onChange={(v) => updateForm('account_number', v)} placeholder="0123456789" /></Field>
            <Field label="Sort Code"><Input value={form.sort_code} onChange={(v) => updateForm('sort_code', v)} placeholder="011-152-383" /></Field>
          </div>
          <div className="mt-4 rounded-xl border border-border bg-card px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-foreground">Default account</div>
                <div className="mt-1 text-xs text-muted-foreground">Use this bank account as the primary payment destination.</div>
              </div>
              <Switch checked={!!form.is_default} onCheckedChange={(value) => updateForm('is_default', value)} />
            </div>
          </div>
          <SaveBtn saving={saving} saved={false} onClick={saveAccount} />
        </div>
      ) : null}

      <button
        onClick={openAdd}
        className="w-full rounded-2xl border border-dashed border-border bg-card px-4 py-3 text-sm font-bold text-slate-700 hover:border-slate-400 hover:bg-muted/50"
      >
        <span className="inline-flex items-center gap-2"><Plus size={14} />Add Bank Account</span>
      </button>
    </div>
  )
}

function BrandingSection({ onToast }) {
  const { settings, loading } = useSettings()
  const [form, setForm] = useState({ logo_url: '', footer_text: '' })
  const [uploading, setUploading] = useState({ logo: false })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [editing, setEditing] = useState(false)
  const logoRef = useRef()

  useEffect(() => {
    if (!loading && settings) setForm(f => ({ ...f, ...settings }))
  }, [loading, settings])

  useEffect(() => {
    if (!loading) {
      const hasSavedData = [settings?.logo_url, settings?.footer_text].some(Boolean)
      setEditing(!hasSavedData)
    }
  }, [loading, settings])

  const u = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const restoreSavedBrandingState = () => {
    setForm({
      logo_url: settings?.logo_url || '',
      footer_text: settings?.footer_text || '',
    })
  }

  const handleUpload = async (type, file) => {
    if (!file) return
    setUploading(p => ({ ...p, [type]: true }))
    try {
      const ext = file.name.split('.').pop()
      const path = `${type}/${Date.now()}.${ext}`
      const url = await uploadFile('logos', path, file)
      u(type + '_url', url)
      onToast('Logo uploaded')
    } catch (e) { onToast('Upload failed: ' + e.message) }
    setUploading(p => ({ ...p, [type]: false }))
  }

  const save = async () => {
    setSaving(true)
    try {
      await saveSettings(form)
      setSaved(true)
      setEditing(false)
      onToast('Branding saved')
      setTimeout(() => setSaved(false), 2500)
    } catch (e) { onToast(e.message) }
    setSaving(false)
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-slate-300" /></div>

  const UploadBox = ({ type, label, inputRef }) => (
    <Field label={label}>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => handleUpload(type, e.target.files[0])} />
      {form[type + '_url'] ? (
        <div className="relative inline-flex flex-col gap-2">
          <img src={form[type + '_url']} alt={label} className="max-h-20 max-w-[180px] rounded-lg border border-border object-contain" />
          <div className="flex gap-3">
            <button onClick={() => inputRef.current.click()} className="text-xs text-blue-600 font-semibold hover:underline">Change</button>
            <button onClick={() => u(type + '_url', '')} className="text-xs text-red-500 font-semibold hover:underline">Remove</button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current.click()}
          className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-slate-400 hover:bg-muted/50 transition-colors"
        >
          {uploading[type]
            ? <Loader2 size={20} className="animate-spin text-muted-foreground mx-auto mb-1" />
            : <Upload size={20} className="text-slate-300 mx-auto mb-1" />
          }
          <p className="text-xs text-muted-foreground font-medium">{uploading[type] ? 'Uploading…' : 'Click to upload'}</p>
        </div>
      )}
    </Field>
  )

  const footerPreview = (form.footer_text || '').split('\n').find(Boolean) || ''

  if (!editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-muted/50 px-4 py-4">
          <div>
            <div className="text-sm font-bold text-foreground">Saved branding</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Review your logo and footer text before editing branding assets.
            </div>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-muted/50"
          >
            Edit
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-muted/50 px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Logo</div>
            <div className="mt-2">
              {form.logo_url ? (
                <img src={form.logo_url} alt="Company logo" className="h-14 w-14 rounded-lg border border-border bg-card object-contain" />
              ) : (
                <div className="text-sm font-medium text-foreground">No logo</div>
              )}
            </div>
          </div>
          <SummaryField label="Footer Text" value={footerPreview || 'Not set'} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-muted/50 px-4 py-4">
        <div>
          <div className="text-sm font-bold text-foreground">Edit branding</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Update the company logo and footer text used in generated documents.
          </div>
        </div>
        <button
          onClick={() => {
            restoreSavedBrandingState()
            setEditing(false)
          }}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-muted/50"
        >
          Cancel
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <UploadBox type="logo" label="Company Logo" inputRef={logoRef} />
      </div>
      <Field label="PDF Footer Text">
        <textarea
          value={form.footer_text || ''}
          onChange={e => u('footer_text', e.target.value)}
          placeholder={'Bank: First Bank | Account: Sun & Shield Power Solutions | No: 0123456789\nAll prices in NGN. Payment within 30 days.'}
          rows={4}
          className="w-full px-3 py-2.5 border border-input rounded-lg text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-ring/10 focus:border-slate-400 transition-colors resize-none placeholder:text-slate-300"
        />
      </Field>
      <SaveBtn saving={saving} saved={saved} onClick={save} />
    </div>
  )
}

function SignatoriesSection({ onToast }) {
  const emptyForm = { name: '', role: '', signature_url: '' }
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [actionId, setActionId] = useState(null)
  const fileRef = useRef()

  const loadSignatories = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('signatories')
      .select('id, name, role, signature_url')
      .order('name', { ascending: true })

    if (error) {
      onToast(`Failed to load signatories: ${error.message}`)
      setItems([])
    } else {
      setItems(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadSignatories()
  }, [loadSignatories])

  const updateForm = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  const openEdit = (item) => {
    setEditingId(item.id)
    setForm({
      name: item.name || '',
      role: item.role || '',
      signature_url: item.signature_url || '',
    })
    setFormOpen(true)
  }

  const closeForm = () => {
    setEditingId(null)
    setForm(emptyForm)
    setFormOpen(false)
  }

  const handleUpload = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `signature/${Date.now()}.${ext}`
      const url = await uploadFile('signatures', path, file)
      updateForm('signature_url', url)
      onToast('Signature uploaded')
    } catch (e) {
      onToast(`Upload failed: ${e.message}`)
    }
    setUploading(false)
  }

  const saveSignatory = async () => {
    if (!form.name.trim()) {
      onToast('Name is required')
      return
    }

    setSaving(true)
    const payload = {
      name: form.name.trim(),
      role: form.role.trim(),
      signature_url: form.signature_url || null,
    }
    const result = editingId
      ? await supabase.from('signatories').update(payload).eq('id', editingId)
      : await supabase.from('signatories').insert(payload)

    if (result.error) {
      onToast(`Save failed: ${result.error.message}`)
      setSaving(false)
      return
    }

    await loadSignatories()
    closeForm()
    setSaving(false)
    onToast(editingId ? 'Signatory updated' : 'Signatory added')
  }

  const removeSignatory = async (id) => {
    setActionId(id)
    const { error } = await supabase.from('signatories').delete().eq('id', id)
    if (error) {
      onToast(`Delete failed: ${error.message}`)
      setActionId(null)
      return
    }
    await loadSignatories()
    setActionId(null)
    onToast('Signatory deleted')
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-slate-300" /></div>

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-muted/50 px-4 py-4">
        <div className="text-sm font-bold text-foreground">Document signatories</div>
        <div className="mt-1 text-xs text-muted-foreground">
          Manage the people and signature images used across invoices and other documents.
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          No signatories added yet.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/50">
                    {item.signature_url ? (
                      <img src={item.signature_url} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <UserCheck size={20} className="text-slate-300" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-foreground">{item.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{item.role || 'No role'}</div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => openEdit(item)}
                    className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-slate-700 hover:bg-muted/50"
                  >
                    <span className="inline-flex items-center gap-1.5"><Pencil size={12} />Edit</span>
                  </button>
                  <button
                    onClick={() => removeSignatory(item.id)}
                    disabled={actionId === item.id}
                    className="rounded-xl border border-red-200 bg-card px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <span className="inline-flex items-center gap-1.5"><Trash2 size={12} />Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen ? (
        <div className="rounded-2xl border border-border bg-muted/50 px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-foreground">{editingId ? 'Edit signatory' : 'Add signatory'}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Save signer details and the signature image used in documents.
              </div>
            </div>
            <button
              onClick={closeForm}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-muted/50"
            >
              Cancel
            </button>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name"><Input value={form.name} onChange={(v) => updateForm('name', v)} placeholder="Adewale Musa" /></Field>
            <Field label="Role"><Input value={form.role} onChange={(v) => updateForm('role', v)} placeholder="Finance Manager" /></Field>
          </div>
          <div className="mt-4">
            <Field label="Signature Image">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e.target.files[0])} />
              {form.signature_url ? (
                <div className="relative inline-flex flex-col gap-2">
                  <img src={form.signature_url} alt="Signature" className="max-h-20 max-w-[180px] rounded-lg border border-border object-contain" />
                  <div className="flex gap-3">
                    <button onClick={() => fileRef.current?.click()} className="text-xs font-semibold text-blue-600 hover:underline">Change</button>
                    <button onClick={() => updateForm('signature_url', '')} className="text-xs font-semibold text-red-500 hover:underline">Remove</button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileRef.current?.click()}
                  className="cursor-pointer rounded-xl border-2 border-dashed border-border p-6 text-center transition-colors hover:border-slate-400 hover:bg-muted/50"
                >
                  {uploading ? (
                    <Loader2 size={20} className="mx-auto mb-1 animate-spin text-muted-foreground" />
                  ) : (
                    <Upload size={20} className="mx-auto mb-1 text-slate-300" />
                  )}
                  <p className="text-xs font-medium text-muted-foreground">{uploading ? 'Uploading...' : 'Click to upload'}</p>
                </div>
              )}
            </Field>
          </div>
          <SaveBtn saving={saving} saved={false} onClick={saveSignatory} />
        </div>
      ) : null}

      <button
        onClick={openAdd}
        className="w-full rounded-2xl border border-dashed border-border bg-card px-4 py-3 text-sm font-bold text-slate-700 hover:border-slate-400 hover:bg-muted/50"
      >
        <span className="inline-flex items-center gap-2"><Plus size={14} />Add Signatory</span>
      </button>
    </div>
  )
}

function UserSection({ session, onToast }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const email = session?.user?.email || ''
  const requirements = {
    length: form.newPassword.length >= 8,
    uppercase: /[A-Z]/.test(form.newPassword),
    number: /\d/.test(form.newPassword),
  }
  const meetsRequirements = Object.values(requirements).every(Boolean)
  const passwordsMatch = form.newPassword.length > 0 && form.newPassword === form.confirmPassword
  const strengthScore = [requirements.length, requirements.uppercase, requirements.number].filter(Boolean).length
  const strength = strengthScore <= 1 ? 'Weak' : strengthScore === 2 ? 'Fair' : 'Strong'
  const strengthClass = strength === 'Strong' ? 'bg-emerald-500' : strength === 'Fair' ? 'bg-amber-500' : 'bg-red-500'

  const save = async () => {
    setError('')
    if (!email) { setError('No signed-in user found'); return }
    if (!form.currentPassword) { setError('Enter your current password'); return }
    if (!meetsRequirements) { setError('Password does not meet requirements'); return }
    if (!passwordsMatch) { setError('Passwords do not match'); return }
    setSaving(true)
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email,
      password: form.currentPassword
    })
    if (verifyError) { setError('Current password incorrect'); setSaving(false); return }
    const { error: e } = await supabase.auth.updateUser({ password: form.newPassword })
    if (e) { setError(e.message); setSaving(false); return }
    await supabase.from('profiles').update({ has_password: true }).eq('id', session.user.id)
    setSaving(false)
    setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setOpen(false)
    onToast('Password updated')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-muted/50 px-4 py-4">
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Signed-in email</div>
          <div className="mt-1 break-all text-sm font-bold text-foreground">{email || 'No user email'}</div>
          <div className="mt-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Password</div>
          <div className="mt-1 text-sm font-medium text-foreground">••••••••</div>
        </div>
        <button
          onClick={() => {
            setError('')
            setOpen(true)
          }}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-muted/50"
        >
          Change Password
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-foreground">Change password</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Verify your current password before saving a new one.
                </div>
              </div>
              <button
                onClick={() => {
                  setOpen(false)
                  setError('')
                  setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
                }}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted/50 hover:text-muted-foreground"
                aria-label="Close password modal"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <Field label="Current Password">
                <input
                  type="password"
                  value={form.currentPassword}
                  onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))}
                  placeholder="Enter current password"
                  className="w-full rounded-lg border border-input px-3 py-2.5 text-sm transition-colors focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-ring/10"
                />
              </Field>

              <Field label="New Password">
                <input
                  type="password"
                  value={form.newPassword}
                  onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
                  placeholder="8+ chars, 1 uppercase, 1 number"
                  className="w-full rounded-lg border border-input px-3 py-2.5 text-sm transition-colors focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-ring/10"
                />
                <div className="mt-2 rounded-xl border border-border bg-muted/50 px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Strength</span>
                    <span className={`text-xs font-bold ${strength === 'Strong' ? 'text-emerald-600' : strength === 'Fair' ? 'text-amber-600' : 'text-red-600'}`}>{strength}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className={`h-full rounded-full transition-all ${strengthClass}`} style={{ width: `${(strengthScore / 3) * 100}%` }} />
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <div className={requirements.length ? 'text-emerald-600' : ''}>8+ characters</div>
                    <div className={requirements.uppercase ? 'text-emerald-600' : ''}>At least 1 uppercase letter</div>
                    <div className={requirements.number ? 'text-emerald-600' : ''}>At least 1 number</div>
                  </div>
                </div>
              </Field>

              <Field label="Confirm New Password">
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  placeholder="Repeat new password"
                  className="w-full rounded-lg border border-input px-3 py-2.5 text-sm transition-colors focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-ring/10"
                />
              </Field>

              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setOpen(false)
                    setError('')
                    setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
                  }}
                  className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm font-bold text-slate-700 hover:bg-muted/50"
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={saving || !form.currentPassword || !meetsRequirements || !passwordsMatch}
                  className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function DashboardSection() {
  const [flashTile, setFlashTile] = useState(null)
  const [activeTiles, setActiveTiles] = useState(() => loadStoredQuickTiles())

  const saveTiles = (nextTiles) => {
    const savedTiles = saveStoredQuickTiles(nextTiles)
    setActiveTiles(savedTiles)
    setFlashTile(savedTiles[savedTiles.length - 1] || 'saved')
    window.clearTimeout(window.__quickTilesFlashTimeout)
    window.__quickTilesFlashTimeout = window.setTimeout(() => setFlashTile(null), 900)
  }

  const updateTileAt = (tileIndex, nextTileId) => {
    const currentTileId = activeTiles[tileIndex]
    if (!nextTileId || currentTileId === nextTileId) return

    const existingIndex = activeTiles.indexOf(nextTileId)
    const nextTiles = [...activeTiles]

    if (existingIndex >= 0) {
      nextTiles[existingIndex] = currentTileId
    }

    nextTiles[tileIndex] = nextTileId
    saveTiles(nextTiles)
    setFlashTile(nextTileId)
    window.clearTimeout(window.__quickTilesFlashTimeout)
    window.__quickTilesFlashTimeout = window.setTimeout(() => setFlashTile(null), 900)
  }

  const moveTile = (tileIndex, direction) => {
    const targetIndex = direction === 'up' ? tileIndex - 1 : tileIndex + 1
    if (targetIndex < 0 || targetIndex >= activeTiles.length) return
    const nextTiles = [...activeTiles]
    const [movedTile] = nextTiles.splice(tileIndex, 1)
    nextTiles.splice(targetIndex, 0, movedTile)
    saveTiles(nextTiles)
    setFlashTile(movedTile)
  }

  return (
    <DashboardQuickTilesSettings
      activeTiles={activeTiles.slice(0, QUICK_TILE_COUNT)}
      flashTile={flashTile}
      onSelectTile={updateTileAt}
      onMoveTile={moveTile}
      registry={QUICK_TILE_REGISTRY}
      optionIds={ALL_QUICK_TILE_IDS}
    />
  )
}

function DocumentsSection({ onToast }) {
  const { settings, loading } = useSettings()
  const [activePanel, setActivePanel] = useState(null)
  const [fillableSettings, setFillableSettings] = useState(() => normalizeDocumentFillableSettings(null))
  const fillableSettingsRef = useRef(fillableSettings)

  useEffect(() => {
    if (!loading) {
      const normalized = normalizeDocumentFillableSettings(settings?.document_fillable_settings)
      setFillableSettings(normalized)
      fillableSettingsRef.current = normalized
    }
  }, [loading, settings])

  useEffect(() => {
    fillableSettingsRef.current = fillableSettings
  }, [fillableSettings])

  const updateEntry = async (key, enabled) => {
    const previousSettings = fillableSettingsRef.current
    const nextSettings = {
      ...previousSettings,
      [key]: {
        ...previousSettings[key],
        enabled,
      },
    }

    setFillableSettings(nextSettings)
    fillableSettingsRef.current = nextSettings

    try {
      await saveSettings({
        document_fillable_settings: serializeDocumentFillableSettings(nextSettings),
      })
    } catch (error) {
      setFillableSettings(previousSettings)
      fillableSettingsRef.current = previousSettings
      onToast('Save failed: ' + error.message)
    }
  }

  const toggleEntry = (key) => {
    const currentValue = fillableSettingsRef.current?.[key]?.enabled
    updateEntry(key, !currentValue)
  }

  const rowKeyDown = (event, key) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      toggleEntry(key)
    }
  }

  const rowClassName = 'flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-border bg-card px-4 py-4 shadow-sm transition hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40'

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-slate-300" /></div>

  if (activePanel !== 'fillable-writing') {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-muted/50 px-4 py-4">
          <div className="text-sm font-bold text-foreground">Documents</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Control which document view pages expose fillable-writing controls inside Customize.
          </div>
        </div>

        <button
          type="button"
          onClick={() => setActivePanel('fillable-writing')}
          className="flex w-full items-center justify-between rounded-2xl border border-border bg-card px-4 py-4 text-left shadow-sm transition hover:bg-muted/30"
        >
          <div>
            <div className="text-sm font-bold text-foreground">Fillable Writing</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Show or hide fillable font and color controls on supported document view pages.
            </div>
          </div>
          <ChevronRight size={16} className="text-slate-300" />
        </button>
      </div>
    )
  }

  const rows = [
    { key: 'csr', label: 'CSR', description: 'Show fillable-writing controls under Customize on CSR pages.' },
    { key: 'waybill', label: 'Waybill', description: 'Show fillable-writing controls under Customize on Waybill pages.' },
    { key: 'invoice', label: 'Invoice', description: 'Show fillable-writing controls inside invoice Customize.' },
    { key: 'quotation', label: 'Quotation', description: 'Show fillable-writing controls inside quotation Customize.' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-muted/50 px-4 py-4">
        <div>
          <div className="text-sm font-bold text-foreground">Fillable Writing</div>
          <div className="mt-1 text-xs text-muted-foreground">
            This only controls whether the font and color controls appear under Customize. It does not pick the fonts here.
          </div>
        </div>
        <button
          type="button"
          onClick={() => setActivePanel(null)}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-muted/50"
        >
          Back
        </button>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <div
            key={row.key}
            role="button"
            tabIndex={0}
            aria-label={`${row.label} fillable writing`}
            aria-pressed={fillableSettings[row.key].enabled}
            onClick={() => toggleEntry(row.key)}
            onKeyDown={(event) => rowKeyDown(event, row.key)}
            className={rowClassName}
          >
            <div className="min-w-0">
              <div className="text-sm font-bold text-foreground">{row.label}</div>
              <div className="mt-1 text-xs text-muted-foreground">{row.description}</div>
            </div>
            <Switch
              checked={fillableSettings[row.key].enabled}
              onCheckedChange={(next) => updateEntry(row.key, next)}
              onClick={(event) => event.stopPropagation()}
              className="border border-slate-300 bg-slate-200 shadow-sm data-[state=checked]:border-indigo-600 data-[state=checked]:bg-indigo-600 [&>span]:bg-white"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function SummaryField({ label, value }) {
  return (
    <div className="rounded-xl border border-border bg-muted/50 px-4 py-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium text-foreground">{value || 'Not set'}</div>
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
      onToast(`Restore failed: ${error.message}`)
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
      <div className="rounded-2xl border border-border bg-muted/50 px-4 py-4">
        <div className="text-sm font-bold text-foreground">Archived records</div>
        <div className="mt-1 text-xs text-muted-foreground">
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
        <div className="rounded-2xl border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
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
              <div key={item.id} className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="break-words text-sm font-bold text-foreground">{title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{subline}</div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
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
                    className="shrink-0 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-slate-700 hover:bg-muted/50 disabled:opacity-50"
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
            You are about to grant <span className="font-bold text-foreground">{user.email}</span> full access to BIGDROPS.
          </p>
          <p className="text-xs text-muted-foreground mt-2">They will be able to create invoices, CSRs, and view all client data immediately.</p>
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
            <span className="font-bold text-foreground">{user.email}</span> will be <span className="font-bold text-amber-700">locked out immediately.</span>
          </p>
          <p className="text-xs text-muted-foreground mt-2">Their data is preserved. You can reactivate them at any time.</p>
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
            This will <span className="font-bold text-red-700">permanently remove</span> <span className="font-bold text-foreground">{user.email}</span> from BIGDROPS.
          </p>
          <p className="text-xs text-muted-foreground mt-2">Their invoice and CSR history is preserved, but their login access is gone forever.</p>
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex gap-2 items-start">
            <span className="text-red-500 text-sm mt-0.5">🚨</span>
            <p className="text-xs text-red-700 font-semibold">This cannot be undone. Type the email address below to confirm.</p>
          </div>
          <input
            ref={inputRef}
            value={emailInput}
            onChange={e => setEmailInput(e.target.value)}
            placeholder={user.email}
            className="mt-3 w-full px-3 py-2.5 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors font-mono"
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
      <div className="bg-card rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${c.iconBg}`}>
            {c.icon}
          </div>
          <h3 className="text-base font-black text-foreground">{c.title}</h3>
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
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-bold text-muted-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
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
            <div key={u.id} className={`bg-card rounded-xl border p-4 ${isSelf ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-foreground truncate">{u.email}</p>
                    {isSelf && <span className="text-[10px] font-black bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full shrink-0">YOU</span>}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {new Date(u.created_at).toLocaleDateString()}
                    {u.assigned_device_code && <span className="ml-2 font-bold text-muted-foreground">· {u.assigned_device_code}</span>}
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
          {users.length === 0 && <p className="text-center text-muted-foreground text-xs font-bold py-8">NO USERS FOUND</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {DEVICE_CODES.map(code => {
            const device = devices.find(d => d.device_code === code)
            return (
              <div key={code} className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Smartphone size={15} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-foreground">Device {code}</p>
                    <p className="text-[11px] text-muted-foreground">{device?.profiles?.email || 'Unassigned'}</p>
                  </div>
                  {device?.profiles && (
                    <span className="ml-auto text-[10px] font-black bg-blue-50 text-blue-600 px-2 py-1 rounded-full">Assigned</span>
                  )}
                </div>
                <Select
                  value={device?.user_id || '__unassigned__'}
                  onValueChange={value => assignDevice(code, value === '__unassigned__' ? '' : value)}
                  disabled={actionId === code}
                >
                  <SelectTrigger className="w-full text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__unassigned__">— Unassign —</SelectItem>
                    {users.map(u => <SelectItem key={u.id} value={u.id}>{u.email}</SelectItem>)}
                  </SelectContent>
                </Select>
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
  { id: 'branding', label: 'Logo & Branding',  icon: ImageIcon,  desc: 'Logo and footer text' },
  { id: 'documents', label: 'Documents',       icon: FolderKanban, desc: 'Customize document control availability' },
  { id: 'signatories', label: 'Signatories', icon: UserCheck, desc: 'Manage document signatories' },
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
      case 'documents': return <DocumentsSection onToast={showToast} />
      case 'signatories': return <SignatoriesSection onToast={showToast} />
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
                className={`w-full flex items-center gap-4 px-4 py-4 bg-card rounded-xl border border-border hover:border-border hover:shadow-sm transition-all group text-left
                  ${id === 'admin' ? 'border-red-100 hover:border-red-300' : ''}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                  ${id === 'admin' ? 'bg-red-50' : 'bg-slate-100'}`}>
                  <Icon size={17} className={id === 'admin' ? 'text-red-600' : 'text-muted-foreground'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${id === 'admin' ? 'text-red-600' : 'text-slate-800'}`}>{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
                <ChevronRight size={15} className="text-slate-300 group-hover:text-muted-foreground transition-colors shrink-0" />
              </button>
            ))}
          </div>
        ) : (
          // Active section
          <div>
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setActive(null)}
                className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors shadow-sm"
                aria-label="Back to settings"
              >
                ←
              </button>
              <h2 className="text-sm font-black text-foreground uppercase tracking-wider">
                {activeSection?.label}
              </h2>
            </div>
            <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
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
