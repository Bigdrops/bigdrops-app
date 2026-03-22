import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  Building2,
  Check,
  CreditCard,
  ImageIcon,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Shield,
  Trash2,
  UserSquare2,
} from 'lucide-react'
import Layout from '../components/Layout'
import { supabase } from '../supabase'
import { saveSettings } from '../hooks/useSettings'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

const SETTINGS_ID = 1
const SETTINGS_DEFAULTS = {
  company_name: '',
  company_tagline: '',
  company_address: '',
  company_city: '',
  company_phone: '',
  company_email: '',
  company_website: '',
  footer_text: '',
  logo_url: '',
  signature_url: '',
  custom_info: '',
  bank_name: '',
  bank_account_name: '',
  bank_account_number: '',
  bank_sort_code: '',
}
const REQUIRED_BUCKETS = ['logos', 'signatures']

function emptyBankForm() {
  return {
    bank_name: '',
    account_name: '',
    account_number: '',
    sort_code: '',
    is_default: false,
  }
}

function emptySignatoryForm() {
  return {
    name: '',
    role: '',
    signature_url: '',
  }
}

function toErrorMessage(error, fallback) {
  return error?.message || fallback
}

function sanitizeFileName(name) {
  return String(name || 'upload')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '')
}

function strengthMeta(password) {
  const hasLength = password.length >= 8
  const hasUpper = /[A-Z]/.test(password)
  const hasNumber = /\d/.test(password)
  const score = [hasLength, hasUpper, hasNumber].filter(Boolean).length

  if (score <= 1) return { label: 'Weak', tone: 'text-red-600 bg-red-50 border-red-200' }
  if (score === 2) return { label: 'Fair', tone: 'text-amber-700 bg-amber-50 border-amber-200' }
  return { label: 'Strong', tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' }
}

function Toast({ message, tone = 'success', onDone }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2800)
    return () => clearTimeout(timer)
  }, [onDone])

  const isError = tone === 'error'

  return (
    <div className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border px-4 py-3 text-sm shadow-xl ${
      isError ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
    }`}>
      <div className="flex items-center gap-2">
        {isError ? <AlertCircle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
        <span className="font-medium">{message}</span>
      </div>
    </div>
  )
}

function SectionCard({ title, icon: Icon, editing, onEdit, onCancel, children }) {
  return (
    <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-100">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Icon className="h-4 w-4" />
            </div>
            <CardTitle className="text-sm font-semibold text-slate-900">{title}</CardTitle>
          </div>
          {editing ? (
            <Button type="button" variant="outline" size="sm" className="bg-white" onClick={onCancel}>
              Cancel
            </Button>
          ) : (
            <Button type="button" variant="outline" size="icon-sm" className="bg-white" onClick={onEdit} aria-label={`Edit ${title}`}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  )
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</label>
      {children}
    </div>
  )
}

function SummaryLine({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-600">
      <Icon className="h-3.5 w-3.5 text-slate-400" />
      <span>{children}</span>
    </div>
  )
}

function BucketNotice({ bucketStatus, buckets }) {
  const missing = buckets.filter((bucket) => bucketStatus[bucket] === 'missing')
  const unknown = buckets.filter((bucket) => bucketStatus[bucket] === 'unknown')

  if (missing.length === 0 && unknown.length === 0) return null

  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-800">
      {missing.length > 0 ? (
        <div>
          Create these Supabase Storage buckets manually in the dashboard before uploading:
          {' '}
          <span className="font-semibold">{missing.join(', ')}</span>.
        </div>
      ) : null}
      {unknown.length > 0 ? (
        <div className={missing.length > 0 ? 'mt-2' : ''}>
          Bucket access could not be verified for
          {' '}
          <span className="font-semibold">{unknown.join(', ')}</span>.
          If uploads fail, create them manually in Storage first.
        </div>
      ) : null}
    </div>
  )
}

function UploadField({ label, value, bucket, bucketStatus, uploading, onUpload, onRemove, inputRef, placeholder = 'No image uploaded' }) {
  const canUpload = bucketStatus === 'ok' || bucketStatus === 'unknown'

  return (
    <Field label={label}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onUpload(file)
          event.target.value = ''
        }}
      />

      {value ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <img src={value} alt={label} className="h-16 w-16 rounded-lg border border-slate-200 bg-white object-cover" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-slate-900">{label} uploaded</div>
              <div className="truncate text-xs text-slate-500">{value}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="bg-white" onClick={() => inputRef.current?.click()} disabled={!canUpload || uploading}>
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Change
            </Button>
            <Button type="button" variant="destructive" className="border border-red-200 bg-red-50 text-red-700 hover:bg-red-100" onClick={onRemove}>
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => canUpload && inputRef.current?.click()}
          disabled={!canUpload || uploading}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition-colors hover:border-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin text-slate-500" /> : <ImageIcon className="h-5 w-5 text-slate-400" />}
          <div className="text-sm font-medium text-slate-700">{uploading ? `Uploading to ${bucket}...` : 'Click to upload'}</div>
          <div className="text-xs text-slate-500">{canUpload ? placeholder : `Bucket "${bucket}" is not ready`}</div>
        </button>
      )}
    </Field>
  )
}

function PasswordModal({ open, onOpenChange, email, onSuccess, onError }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setSaving(false)
    }
  }, [open])

  const checks = {
    length: newPassword.length >= 8,
    upper: /[A-Z]/.test(newPassword),
    number: /\d/.test(newPassword),
    match: newPassword.length > 0 && newPassword === confirmPassword,
  }
  const canSave = email && currentPassword && checks.length && checks.upper && checks.number && checks.match
  const strength = strengthMeta(newPassword)

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    })

    if (verifyError) {
      setSaving(false)
      onError(toErrorMessage(verifyError, 'Current password is incorrect.'))
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
    setSaving(false)

    if (updateError) {
      onError(toErrorMessage(updateError, 'Password update failed.'))
      return
    }

    onOpenChange(false)
    onSuccess('Password updated successfully.')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>
            Verify your current password first, then choose a stronger one for this account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field label="Current Password">
            <Input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
          </Field>

          <Field label="New Password">
            <Input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
            <div className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold ${strength.tone}`}>
              {strength.label}
            </div>
          </Field>

          <Field label="Confirm New Password">
            <Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
          </Field>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <div className={checks.length ? 'text-emerald-700' : ''}>8+ characters</div>
            <div className={checks.upper ? 'text-emerald-700' : ''}>At least 1 uppercase letter</div>
            <div className={checks.number ? 'text-emerald-700' : ''}>At least 1 number</div>
            <div className={checks.match ? 'text-emerald-700' : ''}>Passwords match</div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" className="bg-white" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={!canSave || saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Save Password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function Settings() {
  const [session, setSession] = useState(null)
  const [settings, setSettings] = useState(SETTINGS_DEFAULTS)
  const [bankAccounts, setBankAccounts] = useState([])
  const [signatories, setSignatories] = useState([])
  const [bucketStatus, setBucketStatus] = useState({ logos: 'unknown', signatures: 'unknown' })
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  const [editingCompany, setEditingCompany] = useState(false)
  const [editingBranding, setEditingBranding] = useState(false)
  const [showBankSection, setShowBankSection] = useState(false)
  const [showSignatorySection, setShowSignatorySection] = useState(false)
  const [showSecuritySection, setShowSecuritySection] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  const [companyForm, setCompanyForm] = useState(SETTINGS_DEFAULTS)
  const [brandingForm, setBrandingForm] = useState({
    logo_url: '',
    footer_text: '',
  })
  const [savingSection, setSavingSection] = useState({
    company: false,
    branding: false,
    bank: false,
    signatory: false,
  })
  const [uploading, setUploading] = useState({
    logo: false,
    signatory: false,
  })
  const [bankEditor, setBankEditor] = useState({ mode: null, id: null, form: emptyBankForm() })
  const [signatoryEditor, setSignatoryEditor] = useState({ mode: null, id: null, form: emptySignatoryForm() })

  const logoInputRef = useRef(null)
  const signatoryInputRef = useRef(null)

  const activeDefaultBank = useMemo(
    () => bankAccounts.find((account) => account.is_default) || bankAccounts[0] || null,
    [bankAccounts],
  )

  const loadAll = async () => {
    setLoading(true)

    const [
      { data: authData },
      { data: settingsRow, error: settingsError },
      { data: bankRows, error: bankError },
      { data: signatoryRows, error: signatoryError },
    ] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('settings').select('*').eq('id', SETTINGS_ID).single(),
      supabase.from('bank_accounts').select('*').order('is_default', { ascending: false }).order('created_at', { ascending: true }),
      supabase.from('signatories').select('*').order('name'),
    ])

    const nextSettings = { ...SETTINGS_DEFAULTS, ...(settingsRow || {}) }
    setSession(authData?.user ? { user: authData.user } : null)
    setSettings(nextSettings)
    setCompanyForm(nextSettings)
    setBrandingForm({
      logo_url: nextSettings.logo_url || '',
      footer_text: nextSettings.footer_text || '',
    })
    setBankAccounts(bankRows || [])
    setSignatories(signatoryRows || [])
    setLoading(false)

    if (settingsError) setToast({ message: toErrorMessage(settingsError, 'Failed to load settings.'), tone: 'error' })
    if (bankError) setToast({ message: toErrorMessage(bankError, 'Failed to load bank accounts.'), tone: 'error' })
    if (signatoryError) setToast({ message: toErrorMessage(signatoryError, 'Failed to load signatories.'), tone: 'error' })
  }

  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    const checkBuckets = async () => {
      const { data, error } = await supabase.storage.listBuckets()

      if (error || !Array.isArray(data)) {
        setBucketStatus({ logos: 'unknown', signatures: 'unknown' })
        return
      }

      const names = new Set(data.map((bucket) => bucket.name))
      setBucketStatus({
        logos: names.has('logos') ? 'ok' : 'missing',
        signatures: names.has('signatures') ? 'ok' : 'missing',
      })
    }

    checkBuckets()
  }, [])

  const handleSettingsSave = async (patch, successMessage) => {
    await saveSettings({ id: SETTINGS_ID, ...patch })
    const nextSettings = { ...settings, ...patch }
    setSettings(nextSettings)
    setCompanyForm(nextSettings)
    setBrandingForm({
      logo_url: nextSettings.logo_url || '',
      footer_text: nextSettings.footer_text || '',
    })
    setToast({ message: successMessage, tone: 'success' })
  }

  const uploadToBucket = async (bucket, file) => {
    const path = `${bucket}/${Date.now()}-${sanitizeFileName(file.name)}`
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
    if (uploadError) throw uploadError
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  }

  const startBankAdd = () => {
    setShowBankSection(true)
    setBankEditor({ mode: 'add', id: null, form: emptyBankForm() })
  }

  const startBankEdit = (account) => {
    setShowBankSection(true)
    setBankEditor({
      mode: 'edit',
      id: account.id,
      form: {
        bank_name: account.bank_name || '',
        account_name: account.account_name || '',
        account_number: account.account_number || '',
        sort_code: account.sort_code || '',
        is_default: !!account.is_default,
      },
    })
  }

  const cancelBankEdit = () => setBankEditor({ mode: null, id: null, form: emptyBankForm() })

  const saveBankAccount = async () => {
    if (!bankEditor.form.bank_name || !bankEditor.form.account_name || !bankEditor.form.account_number) {
      setToast({ message: 'Bank name, account name, and account number are required.', tone: 'error' })
      return
    }

    setSavingSection((current) => ({ ...current, bank: true }))

    try {
      if (bankEditor.form.is_default) {
        await supabase.from('bank_accounts').update({ is_default: false }).neq('id', bankEditor.id || '')
      }

      if (bankEditor.mode === 'edit' && bankEditor.id) {
        const { error } = await supabase.from('bank_accounts').update(bankEditor.form).eq('id', bankEditor.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('bank_accounts').insert([bankEditor.form])
        if (error) throw error
      }

      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true })
      if (error) throw error

      setBankAccounts(data || [])
      cancelBankEdit()
      setToast({ message: 'Bank account saved.', tone: 'success' })
    } catch (error) {
      setToast({ message: toErrorMessage(error, 'Failed to save bank account.'), tone: 'error' })
    }

    setSavingSection((current) => ({ ...current, bank: false }))
  }

  const deleteBankAccount = async (id) => {
    setSavingSection((current) => ({ ...current, bank: true }))
    const { error } = await supabase.from('bank_accounts').delete().eq('id', id)

    if (error) {
      setSavingSection((current) => ({ ...current, bank: false }))
      setToast({ message: toErrorMessage(error, 'Failed to delete bank account.'), tone: 'error' })
      return
    }

    setBankAccounts((current) => current.filter((account) => account.id !== id))
    if (bankEditor.id === id) cancelBankEdit()
    setSavingSection((current) => ({ ...current, bank: false }))
    setToast({ message: 'Bank account deleted.', tone: 'success' })
  }

  const setDefaultBankAccount = async (id) => {
    setSavingSection((current) => ({ ...current, bank: true }))

    try {
      const { error: clearError } = await supabase.from('bank_accounts').update({ is_default: false }).neq('id', id)
      if (clearError) throw clearError
      const { error: setError } = await supabase.from('bank_accounts').update({ is_default: true }).eq('id', id)
      if (setError) throw setError

      setBankAccounts((current) =>
        current.map((account) => ({
          ...account,
          is_default: account.id === id,
        })),
      )
      setToast({ message: 'Default bank account updated.', tone: 'success' })
    } catch (error) {
      setToast({ message: toErrorMessage(error, 'Failed to set default bank account.'), tone: 'error' })
    }

    setSavingSection((current) => ({ ...current, bank: false }))
  }

  const startSignatoryAdd = () => {
    setShowSignatorySection(true)
    setSignatoryEditor({ mode: 'add', id: null, form: emptySignatoryForm() })
  }

  const startSignatoryEdit = (entry) => {
    setShowSignatorySection(true)
    setSignatoryEditor({
      mode: 'edit',
      id: entry.id,
      form: {
        name: entry.name || '',
        role: entry.role || '',
        signature_url: entry.signature_url || '',
      },
    })
  }

  const cancelSignatoryEdit = () => setSignatoryEditor({ mode: null, id: null, form: emptySignatoryForm() })

  const saveSignatory = async () => {
    if (!signatoryEditor.form.name.trim()) {
      setToast({ message: 'Full name is required.', tone: 'error' })
      return
    }

    setSavingSection((current) => ({ ...current, signatory: true }))

    try {
      if (signatoryEditor.mode === 'edit' && signatoryEditor.id) {
        const { error } = await supabase.from('signatories').update(signatoryEditor.form).eq('id', signatoryEditor.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('signatories').insert([signatoryEditor.form])
        if (error) throw error
      }

      const { data, error } = await supabase.from('signatories').select('*').order('name')
      if (error) throw error

      setSignatories(data || [])
      cancelSignatoryEdit()
      setToast({ message: 'Signatory saved.', tone: 'success' })
    } catch (error) {
      setToast({ message: toErrorMessage(error, 'Failed to save signatory.'), tone: 'error' })
    }

    setSavingSection((current) => ({ ...current, signatory: false }))
  }

  const deleteSignatory = async (id) => {
    setSavingSection((current) => ({ ...current, signatory: true }))
    const { error } = await supabase.from('signatories').delete().eq('id', id)

    if (error) {
      setSavingSection((current) => ({ ...current, signatory: false }))
      setToast({ message: toErrorMessage(error, 'Failed to delete signatory.'), tone: 'error' })
      return
    }

    setSignatories((current) => current.filter((entry) => entry.id !== id))
    if (signatoryEditor.id === id) cancelSignatoryEdit()
    setSavingSection((current) => ({ ...current, signatory: false }))
    setToast({ message: 'Signatory deleted.', tone: 'success' })
  }

  const uploadLogo = async (file) => {
    setUploading((current) => ({ ...current, logo: true }))

    try {
      const publicUrl = await uploadToBucket('logos', file)
      setBrandingForm((current) => ({ ...current, logo_url: publicUrl }))
      setToast({ message: 'Logo uploaded.', tone: 'success' })
    } catch (error) {
      setToast({ message: toErrorMessage(error, 'Logo upload failed.'), tone: 'error' })
    }

    setUploading((current) => ({ ...current, logo: false }))
  }

  const uploadSignatoryImage = async (file) => {
    setUploading((current) => ({ ...current, signatory: true }))

    try {
      const publicUrl = await uploadToBucket('signatures', file)
      setSignatoryEditor((current) => ({
        ...current,
        form: {
          ...current.form,
          signature_url: publicUrl,
        },
      }))
      setToast({ message: 'Signature uploaded.', tone: 'success' })
    } catch (error) {
      setToast({ message: toErrorMessage(error, 'Signature upload failed.'), tone: 'error' })
    }

    setUploading((current) => ({ ...current, signatory: false }))
  }

  const companySummary = settings.company_name || 'Company profile not set'
  const brandingSummary = settings.footer_text || 'No footer text saved yet.'

  if (loading) {
    return (
      <Layout title="Settings" session={session}>
        <div className="mx-auto flex max-w-md items-center justify-center py-24">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Settings" session={session}>
      {toast ? <Toast message={toast.message} tone={toast.tone} onDone={() => setToast(null)} /> : null}

      <PasswordModal
        open={showPasswordModal}
        onOpenChange={setShowPasswordModal}
        email={session?.user?.email || ''}
        onSuccess={(message) => setToast({ message, tone: 'success' })}
        onError={(message) => setToast({ message, tone: 'error' })}
      />

      <div className="mx-auto w-full max-w-md space-y-4">
        <SectionCard
          title="Company Info"
          icon={Building2}
          editing={editingCompany}
          onEdit={() => setEditingCompany(true)}
          onCancel={() => {
            setCompanyForm(settings)
            setEditingCompany(false)
          }}
        >
          {editingCompany ? (
            <div className="space-y-4">
              <Field label="Company Name">
                <Input value={companyForm.company_name || ''} onChange={(event) => setCompanyForm((current) => ({ ...current, company_name: event.target.value }))} />
              </Field>
              <Field label="Tagline">
                <Input value={companyForm.company_tagline || ''} onChange={(event) => setCompanyForm((current) => ({ ...current, company_tagline: event.target.value }))} />
              </Field>
              <Field label="Address">
                <Input value={companyForm.company_address || ''} onChange={(event) => setCompanyForm((current) => ({ ...current, company_address: event.target.value }))} />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="City">
                  <Input value={companyForm.company_city || ''} onChange={(event) => setCompanyForm((current) => ({ ...current, company_city: event.target.value }))} />
                </Field>
                <Field label="Phone">
                  <Input value={companyForm.company_phone || ''} onChange={(event) => setCompanyForm((current) => ({ ...current, company_phone: event.target.value }))} />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Email">
                  <Input value={companyForm.company_email || ''} onChange={(event) => setCompanyForm((current) => ({ ...current, company_email: event.target.value }))} />
                </Field>
                <Field label="Website">
                  <Input value={companyForm.company_website || ''} onChange={(event) => setCompanyForm((current) => ({ ...current, company_website: event.target.value }))} />
                </Field>
              </div>

              <Button
                type="button"
                className="w-full"
                disabled={savingSection.company}
                onClick={async () => {
                  setSavingSection((current) => ({ ...current, company: true }))
                  try {
                    await handleSettingsSave({
                      company_name: companyForm.company_name || '',
                      company_tagline: companyForm.company_tagline || '',
                      company_address: companyForm.company_address || '',
                      company_city: companyForm.company_city || '',
                      company_phone: companyForm.company_phone || '',
                      company_email: companyForm.company_email || '',
                      company_website: companyForm.company_website || '',
                    }, 'Company info saved.')
                    setEditingCompany(false)
                  } catch (error) {
                    setToast({ message: toErrorMessage(error, 'Failed to save company info.'), tone: 'error' })
                  }
                  setSavingSection((current) => ({ ...current, company: false }))
                }}
              >
                {savingSection.company ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Save
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="text-lg font-semibold text-slate-900">{companySummary}</div>
                <div className="mt-1 text-sm text-slate-500">{settings.company_tagline || 'No tagline saved yet.'}</div>
              </div>
              <SummaryLine icon={MapPin}>{settings.company_city || 'City not set'}</SummaryLine>
              <SummaryLine icon={Phone}>{settings.company_phone || 'Phone not set'}</SummaryLine>
              <SummaryLine icon={Mail}>{settings.company_email || 'Email not set'}</SummaryLine>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Branding"
          icon={ImageIcon}
          editing={editingBranding}
          onEdit={() => setEditingBranding(true)}
          onCancel={() => {
            setBrandingForm({
              logo_url: settings.logo_url || '',
              footer_text: settings.footer_text || '',
            })
            setEditingBranding(false)
          }}
        >
          {editingBranding ? (
            <div className="space-y-4">
              <BucketNotice bucketStatus={bucketStatus} buckets={['logos']} />

              <UploadField
                label="Logo"
                value={brandingForm.logo_url}
                bucket="logos"
                bucketStatus={bucketStatus.logos}
                uploading={uploading.logo}
                onUpload={uploadLogo}
                onRemove={() => setBrandingForm((current) => ({ ...current, logo_url: '' }))}
                inputRef={logoInputRef}
                placeholder="Upload logo to logos/{timestamp}-{filename}"
              />

              <Field label="Footer Text">
                <Textarea
                  value={brandingForm.footer_text}
                  onChange={(event) => setBrandingForm((current) => ({ ...current, footer_text: event.target.value }))}
                  className="min-h-24"
                />
              </Field>

              <Button
                type="button"
                className="w-full"
                disabled={savingSection.branding}
                onClick={async () => {
                  setSavingSection((current) => ({ ...current, branding: true }))
                  try {
                    await handleSettingsSave({
                      logo_url: brandingForm.logo_url || '',
                      footer_text: brandingForm.footer_text || '',
                    }, 'Branding saved.')
                    setEditingBranding(false)
                  } catch (error) {
                    setToast({ message: toErrorMessage(error, 'Failed to save branding.'), tone: 'error' })
                  }
                  setSavingSection((current) => ({ ...current, branding: false }))
                }}
              >
                {savingSection.branding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Save
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {settings.logo_url ? (
                  <img src={settings.logo_url} alt="Company logo" className="h-12 w-12 rounded-lg border border-slate-200 bg-white object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-500">
                    No logo
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-900">Footer preview</div>
                  <div className="truncate text-sm text-slate-500">{brandingSummary}</div>
                </div>
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Bank Accounts"
          icon={CreditCard}
          editing={showBankSection}
          onEdit={() => setShowBankSection(true)}
          onCancel={() => {
            cancelBankEdit()
            setShowBankSection(false)
          }}
        >
          {showBankSection ? (
            <div className="space-y-4">
              {bankAccounts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  No bank accounts saved yet.
                </div>
              ) : (
                bankAccounts.map((account) => (
                  <div key={account.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold text-slate-900">{account.bank_name}</div>
                          {account.is_default ? (
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                              Default
                            </span>
                          ) : null}
                        </div>
                        <div className="text-sm text-slate-600">{account.account_name}</div>
                        <div className="text-sm text-slate-600">{account.account_number}</div>
                        <div className="text-sm text-slate-500">Sort Code: {account.sort_code || 'Not set'}</div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="icon-sm" className="bg-white" onClick={() => startBankEdit(account)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" variant="destructive" size="icon-sm" className="border border-red-200 bg-red-50 text-red-700 hover:bg-red-100" onClick={() => deleteBankAccount(account.id)} disabled={savingSection.bank}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {!account.is_default ? (
                      <Button type="button" variant="outline" className="mt-3 bg-white" onClick={() => setDefaultBankAccount(account.id)} disabled={savingSection.bank}>
                        Set as Default
                      </Button>
                    ) : null}
                  </div>
                ))
              )}

              {bankEditor.mode ? (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-4 text-sm font-semibold text-slate-900">
                    {bankEditor.mode === 'edit' ? 'Edit Bank Account' : 'Add Bank Account'}
                  </div>
                  <div className="space-y-4">
                    <Field label="Bank Name">
                      <Input value={bankEditor.form.bank_name} onChange={(event) => setBankEditor((current) => ({ ...current, form: { ...current.form, bank_name: event.target.value } }))} />
                    </Field>
                    <Field label="Account Name">
                      <Input value={bankEditor.form.account_name} onChange={(event) => setBankEditor((current) => ({ ...current, form: { ...current.form, account_name: event.target.value } }))} />
                    </Field>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label="Account Number">
                        <Input value={bankEditor.form.account_number} onChange={(event) => setBankEditor((current) => ({ ...current, form: { ...current.form, account_number: event.target.value } }))} />
                      </Field>
                      <Field label="Sort Code">
                        <Input value={bankEditor.form.sort_code} onChange={(event) => setBankEditor((current) => ({ ...current, form: { ...current.form, sort_code: event.target.value } }))} />
                      </Field>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                      <div>
                        <div className="text-sm font-medium text-slate-900">Set as Default</div>
                        <div className="text-xs text-slate-500">This account will be preferred in PDF output settings.</div>
                      </div>
                      <Switch checked={bankEditor.form.is_default} onCheckedChange={(checked) => setBankEditor((current) => ({ ...current, form: { ...current.form, is_default: checked } }))} />
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" className="flex-1 bg-white" onClick={cancelBankEdit}>
                        Cancel
                      </Button>
                      <Button type="button" className="flex-1" onClick={saveBankAccount} disabled={savingSection.bank}>
                        {savingSection.bank ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}

              <Button type="button" variant="outline" className="w-full bg-white" onClick={startBankAdd}>
                <Plus className="h-3.5 w-3.5" />
                Add Bank Account
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm font-medium text-slate-900">
                {bankAccounts.length === 0 ? 'No bank accounts saved' : `${bankAccounts.length} bank account${bankAccounts.length === 1 ? '' : 's'} saved`}
              </div>
              <div className="text-sm text-slate-500">
                {activeDefaultBank
                  ? `${activeDefaultBank.bank_name} • ${activeDefaultBank.account_name}`
                  : 'Add one or more payment accounts for invoice PDFs.'}
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Signatories"
          icon={UserSquare2}
          editing={showSignatorySection}
          onEdit={() => setShowSignatorySection(true)}
          onCancel={() => {
            cancelSignatoryEdit()
            setShowSignatorySection(false)
          }}
        >
          {showSignatorySection ? (
            <div className="space-y-4">
              <BucketNotice bucketStatus={bucketStatus} buckets={['signatures']} />

              {signatories.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  No signatories saved yet.
                </div>
              ) : (
                signatories.map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 gap-3">
                        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                          {entry.signature_url ? (
                            <img src={entry.signature_url} alt={`${entry.name} signature`} className="h-full w-full object-cover" />
                          ) : (
                            <UserSquare2 className="h-5 w-5 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900">{entry.name}</div>
                          <div className="text-sm text-slate-500">{entry.role || 'No role set'}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="icon-sm" className="bg-white" onClick={() => startSignatoryEdit(entry)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" variant="destructive" size="icon-sm" className="border border-red-200 bg-red-50 text-red-700 hover:bg-red-100" onClick={() => deleteSignatory(entry.id)} disabled={savingSection.signatory}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {signatoryEditor.mode ? (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-4 text-sm font-semibold text-slate-900">
                    {signatoryEditor.mode === 'edit' ? 'Edit Signatory' : 'Add Signatory'}
                  </div>
                  <div className="space-y-4">
                    <Field label="Full Name">
                      <Input value={signatoryEditor.form.name} onChange={(event) => setSignatoryEditor((current) => ({ ...current, form: { ...current.form, name: event.target.value } }))} />
                    </Field>
                    <Field label="Role / Title">
                      <Input value={signatoryEditor.form.role} onChange={(event) => setSignatoryEditor((current) => ({ ...current, form: { ...current.form, role: event.target.value } }))} />
                    </Field>
                    <UploadField
                      label="Signature Image"
                      value={signatoryEditor.form.signature_url}
                      bucket="signatures"
                      bucketStatus={bucketStatus.signatures}
                      uploading={uploading.signatory}
                      onUpload={uploadSignatoryImage}
                      onRemove={() => setSignatoryEditor((current) => ({ ...current, form: { ...current.form, signature_url: '' } }))}
                      inputRef={signatoryInputRef}
                      placeholder="Upload signature to signatures/{timestamp}-{filename}"
                    />
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" className="flex-1 bg-white" onClick={cancelSignatoryEdit}>
                        Cancel
                      </Button>
                      <Button type="button" className="flex-1" onClick={saveSignatory} disabled={savingSection.signatory}>
                        {savingSection.signatory ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}

              <Button type="button" variant="outline" className="w-full bg-white" onClick={startSignatoryAdd}>
                <Plus className="h-3.5 w-3.5" />
                Add Signatory
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm font-medium text-slate-900">
                {signatories.length === 0 ? 'No signatories saved' : `${signatories.length} signator${signatories.length === 1 ? 'y' : 'ies'} saved`}
              </div>
              <div className="text-sm text-slate-500">
                {signatories.length > 0 ? `${signatories[0].name}${signatories[0].role ? ` • ${signatories[0].role}` : ''}` : 'Add saved signatories for invoice assignment.'}
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Account Security"
          icon={Shield}
          editing={showSecuritySection}
          onEdit={() => setShowSecuritySection(true)}
          onCancel={() => setShowSecuritySection(false)}
        >
          <div className="space-y-3">
            <SummaryLine icon={Mail}>{session?.user?.email || 'No signed-in email found'}</SummaryLine>
            <SummaryLine icon={Shield}>••••••••</SummaryLine>
            {showSecuritySection ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-medium text-slate-900">Password Management</div>
                <div className="mt-1 text-sm text-slate-500">
                  Verify your current password, then choose a new password with at least 8 characters, 1 uppercase letter, and 1 number.
                </div>
                <Button type="button" className="mt-4" onClick={() => setShowPasswordModal(true)}>
                  Change Password
                </Button>
              </div>
            ) : (
              <Button type="button" variant="outline" className="bg-white" onClick={() => setShowPasswordModal(true)}>
                Change Password
              </Button>
            )}
          </div>
        </SectionCard>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
          Storage buckets needed for uploads:
          {' '}
          <span className="font-semibold text-slate-700">{REQUIRED_BUCKETS.join(', ')}</span>
        </div>
      </div>
    </Layout>
  )
}
