import { useCallback, useEffect, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { supabase } from '@/supabase'
import { SettingsField, SettingsInput, SettingsSaveButton } from './SettingsFormPrimitives'
import { SettingsLoadingState } from './SettingsLoadingState'
import type { SettingsToastFn } from './settings-types'

type BankAccount = {
  id: string
  bank_name?: string | null
  account_name?: string | null
  account_number?: string | null
  sort_code?: string | null
  is_default?: boolean | null
}

type BankForm = {
  bank_name: string
  account_name: string
  account_number: string
  sort_code: string
  is_default: boolean
}

const emptyForm: BankForm = {
  bank_name: '',
  account_name: '',
  account_number: '',
  sort_code: '',
  is_default: false,
}

export function BankingSettingsSection({ onToast }: { onToast: SettingsToastFn }) {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<BankForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)

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
      setAccounts((data as BankAccount[]) || [])
    }
    setLoading(false)
  }, [onToast])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  const updateForm = (key: keyof BankForm, value: string | boolean) =>
    setForm((current) => ({ ...current, [key]: value }))

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  const openEdit = (account: BankAccount) => {
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
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Save failed')
    }
    setSaving(false)
  }

  const removeAccount = async (id: string) => {
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

  const setDefault = async (id: string) => {
    setActionId(`default:${id}`)
    const { error: resetError } = await supabase
      .from('bank_accounts')
      .update({ is_default: false })
      .neq('id', id)
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

  if (loading) return <SettingsLoadingState />

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
            const busy = actionId?.includes(account.id)
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
                      <span className="inline-flex items-center gap-1.5">
                        <Pencil size={12} />
                        Edit
                      </span>
                    </button>
                    <button
                      onClick={() => removeAccount(account.id)}
                      disabled={!!busy}
                      className="rounded-xl border border-red-200 bg-card px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Trash2 size={12} />
                        Delete
                      </span>
                    </button>
                  </div>
                </div>
                {!account.is_default ? (
                  <button
                    onClick={() => setDefault(account.id)}
                    disabled={!!busy}
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
              <div className="text-sm font-bold text-foreground">
                {editingId ? 'Edit bank account' : 'Add bank account'}
              </div>
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
            <SettingsField label="Bank Name">
              <SettingsInput value={form.bank_name} onChange={(value) => updateForm('bank_name', value)} placeholder="First Bank" />
            </SettingsField>
            <SettingsField label="Account Name">
              <SettingsInput
                value={form.account_name}
                onChange={(value) => updateForm('account_name', value)}
                placeholder="Sun & Shield Power Solutions"
              />
            </SettingsField>
            <SettingsField label="Account Number">
              <SettingsInput
                value={form.account_number}
                onChange={(value) => updateForm('account_number', value)}
                placeholder="0123456789"
              />
            </SettingsField>
            <SettingsField label="Sort Code">
              <SettingsInput value={form.sort_code} onChange={(value) => updateForm('sort_code', value)} placeholder="011" />
            </SettingsField>
          </div>
          <div className="mt-4 rounded-xl border border-border bg-card px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-foreground">Set as default</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Use this bank account as the primary payment destination.
                </div>
              </div>
              <Switch checked={!!form.is_default} onCheckedChange={(value) => updateForm('is_default', value)} />
            </div>
          </div>
          <SettingsSaveButton saving={saving} saved={false} onClick={saveAccount} />
        </div>
      ) : null}

      <button
        onClick={openAdd}
        className="w-full rounded-2xl border border-dashed border-border bg-card px-4 py-3 text-sm font-bold text-slate-700 hover:border-slate-400 hover:bg-muted/50"
      >
        <span className="inline-flex items-center gap-2">
          <Plus size={14} />
          Add Bank Account
        </span>
      </button>
    </div>
  )
}
