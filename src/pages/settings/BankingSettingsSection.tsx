import { useCallback, useEffect, useState } from 'react'
import { Landmark, Pencil, Plus, Trash2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { supabase } from '@/supabase'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { SettingsField, SettingsInput } from './SettingsFormPrimitives'
import { SettingsLoadingState } from './SettingsLoadingState'
import { SettingsSummaryCard, SettingsSummaryRow } from '@/components/settings/SettingsSummaryCard'
import { SettingsActionFooter } from '@/components/settings/SettingsActionFooter'
import { feedback } from '@/lib/feedback'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

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

export function BankingSettingsSection() {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
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
      feedback.error(`Failed to load bank accounts: ${error.message}`)
      setAccounts([])
    } else {
      setAccounts((data as BankAccount[]) || [])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  const updateForm = (key: keyof BankForm, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setIsEditorOpen(true)
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
    setIsEditorOpen(true)
  }

  const closeForm = () => {
    setEditingId(null)
    setForm(emptyForm)
    setIsEditorOpen(false)
  }

  const saveAccount = async () => {
    if (!form.bank_name || !form.account_name || !form.account_number) {
      feedback.error('Bank name, account name, and account number are required')
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
      feedback.success(editingId ? 'Bank account updated' : 'Bank account added')
    } catch (error) {
      feedback.error(
        getUserFacingMutationMessage(error, {
          action: editingId ? 'update' : 'create',
        }),
      )
    }

    setSaving(false)
  }

  const removeAccount = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bank account?')) return
    
    setActionId(`delete:${id}`)

    const { error } = await supabase.from('bank_accounts').delete().eq('id', id)

    if (error) {
      feedback.error(`Delete failed: ${error.message}`)
      setActionId(null)
      return
    }

    await loadAccounts()
    setActionId(null)
    feedback.success('Bank account deleted')
  }

  const setDefault = async (id: string) => {
    setActionId(`default:${id}`)

    const { error: resetError } = await supabase
      .from('bank_accounts')
      .update({ is_default: false })
      .neq('id', id)

    if (resetError) {
      feedback.error(`Default update failed: ${resetError.message}`)
      setActionId(null)
      return
    }

    const { error } = await supabase
      .from('bank_accounts')
      .update({ is_default: true })
      .eq('id', id)

    if (error) {
      feedback.error(`Default update failed: ${error.message}`)
      setActionId(null)
      return
    }

    await loadAccounts()
    setActionId(null)
    feedback.success('Default bank account updated')
  }

  if (loading) return <SettingsLoadingState />

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between gap-4 px-1">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-bd-text-muted opacity-60">
            Payment Destinantions
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={openAdd}
          className="rounded-full border-bd-border bg-bd-card-bg text-xs font-bold shadow-sm hover:bg-bd-surface-muted"
        >
          <Plus className="mr-2 h-3.5 w-3.5" />
          Add Account
        </Button>
      </div>

      <div className="grid gap-6">
        {accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6 rounded-[var(--bd-radius-xl)] border border-dashed border-bd-border bg-[hsl(var(--bd-card-bg))/0.3]">
            <div className="rounded-full bg-bd-surface-muted p-4 mb-4">
              <Landmark size={28} className="text-bd-text-muted opacity-30" />
            </div>
            <h4 className="text-sm font-bold text-bd-text">No bank accounts</h4>
            <p className="mt-1 text-xs text-bd-text-muted">Add accounts to receive payments on your documents.</p>
          </div>
        ) : (
          accounts.map((account) => (
            <SettingsSummaryCard 
              key={account.id}
              title={account.bank_name || 'Unnamed Bank'}
              description={account.account_name || 'No account name'}
              action={
                <div className="flex items-center gap-2">
                  {!account.is_default && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDefault(account.id)}
                      disabled={actionId === `default:${account.id}`}
                      className="h-8 rounded-full text-[10px] font-black uppercase tracking-wider text-bd-text-muted hover:text-bd-text"
                    >
                      Set Default
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(account)}
                    className="h-8 w-8 text-bd-text-muted hover:text-bd-text"
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAccount(account.id)}
                    disabled={actionId === `delete:${account.id}`}
                    className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              }
            >
              <SettingsSummaryRow 
                label="Account Details" 
                value={
                  <div className="flex items-center gap-3">
                    <span>{account.account_number}</span>
                    <span className="opacity-30">•</span>
                    <span>{account.sort_code}</span>
                  </div>
                } 
                icon={<Landmark size={16} />}
              />
              {account.is_default && (
                <div className="px-5 py-2 bg-emerald-50/50 border-t border-[hsl(var(--bd-border)/0.3)]">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Primary Account</span>
                </div>
              )}
            </SettingsSummaryCard>
          ))
        )}
      </div>

      <Sheet open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-lg">
          <SheetHeader className="p-6 pb-2">
            <SheetTitle>{editingId ? 'Edit Bank Account' : 'Add Bank Account'}</SheetTitle>
            <SheetDescription>
              Manage account details for receiving payments.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6">
            <div className="space-y-6 py-6">
              <div className="grid gap-4">
                <SettingsField label="Bank Name">
                  <SettingsInput
                    value={form.bank_name}
                    onChange={(value) => updateForm('bank_name', value)}
                    placeholder="First Bank"
                  />
                </SettingsField>

                <SettingsField label="Account Name">
                  <SettingsInput
                    value={form.account_name}
                    onChange={(value) => updateForm('account_name', value)}
                    placeholder="Sun & Shield Power Solutions"
                  />
                </SettingsField>

                <div className="grid grid-cols-2 gap-4">
                  <SettingsField label="Account Number">
                    <SettingsInput
                      value={form.account_number}
                      onChange={(value) => updateForm('account_number', value)}
                      placeholder="0123456789"
                    />
                  </SettingsField>

                  <SettingsField label="Sort Code">
                    <SettingsInput
                      value={form.sort_code}
                      onChange={(value) => updateForm('sort_code', value)}
                      placeholder="011"
                    />
                  </SettingsField>
                </div>
              </div>

              <div className="h-px bg-[hsl(var(--bd-border)/0.3)]" />

              <div className="flex items-center justify-between gap-3 rounded-xl border border-[hsl(var(--bd-border)/0.5)] bg-[hsl(var(--bd-surface-muted)/0.3)] px-4 py-4">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-bd-text">Set as default</div>
                  <div className="mt-0.5 text-xs text-bd-text-muted">
                    Primary destination for new documents.
                  </div>
                </div>

                <Switch
                  checked={!!form.is_default}
                  onCheckedChange={(value) => updateForm('is_default', value)}
                  className="data-[state=checked]:bg-bd-button-primary-bg"
                />
              </div>
            </div>
          </div>

          <SettingsActionFooter 
            onSave={saveAccount}
            onCancel={closeForm}
            saving={saving}
          />
        </SheetContent>
      </Sheet>
    </div>
  )
}