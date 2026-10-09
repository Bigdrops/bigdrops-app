import { useState } from 'react'
import { Bell, ChevronLeft, ChevronRight, Loader2, LockKeyhole, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/supabase'
import { SettingsField, SettingsSummaryField } from './SettingsFormPrimitives'
import { pageFormPrimaryActionClassName } from '@/components/ui/form-page-styles'
import { canUseAndroidNativeSqlite } from '@/lib/native/capacitor'
import type { SettingsSession, SettingsToastFn } from './settings-types'

type PasswordForm = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export function UserSettingsSection({
  session,
  onToast,
}: {
  session: SettingsSession
  onToast: SettingsToastFn
}) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [saving, setSaving] = useState(false)
  const [hydrating, setHydrating] = useState(false)
  const [error, setError] = useState('')

  const email = session?.user?.email || ''

  const requirements = {
    length: form.newPassword.length >= 8,
    uppercase: /[A-Z]/.test(form.newPassword),
    number: /\d/.test(form.newPassword),
  }

  const meetsRequirements = Object.values(requirements).every(Boolean)
  const passwordsMatch =
    form.newPassword.length > 0 && form.newPassword === form.confirmPassword

  const strengthScore = [
    requirements.length,
    requirements.uppercase,
    requirements.number,
  ].filter(Boolean).length

  const strength =
    strengthScore <= 1 ? 'Weak' : strengthScore === 2 ? 'Fair' : 'Strong'

  const strengthClass =
    strength === 'Strong'
      ? 'bg-bd-status-success-text'
      : strength === 'Fair'
      ? 'bg-bd-status-warning-text'
      : 'bg-bd-status-danger-text'

  const resetModal = () => {
    setOpen(false)
    setError('')
    setForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    })
  }

  const save = async () => {
    setError('')

    if (!email) {
      setError('No signed-in user found')
      return
    }

    if (!form.currentPassword) {
      setError('Enter your current password')
      return
    }

    if (!meetsRequirements) {
      setError('Password does not meet requirements')
      return
    }

    if (!passwordsMatch) {
      setError('Passwords do not match')
      return
    }

    setSaving(true)

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email,
      password: form.currentPassword,
    })

    if (verifyError) {
      setError('Current password incorrect')
      setSaving(false)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: form.newPassword,
    })

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    await supabase.from('profiles').update({ has_password: true }).eq('id', session!.user!.id)

    setSaving(false)
    resetModal()
    onToast('Password updated')
  }

  const retryDeviceHydration = async () => {
    try {
      setHydrating(true)
      const { hydrateLocalDeviceProfile } = await import('@/lib/native/deviceHydration')
      await hydrateLocalDeviceProfile({ userId: session!.user!.id })
      onToast('Device successfully registered/hydrated on this device')
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'Failed to register device')
    } finally {
      setHydrating(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="px-1">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-bd-text-muted">
          User Settings
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-bd-border bg-card shadow-sm">
        <div className="border-b border-bd-border bg-bd-surface-muted px-4 py-3.5">
          <div className="text-sm font-bold text-bd-text">Profile & Security</div>
          <div className="mt-0 text-[12px] leading-5 text-muted-foreground">
            Review your signed-in account details and security actions.
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2">
          <SettingsSummaryField label="Signed-in Email" value={email || 'No user email'} />
          <SettingsSummaryField label="Password" value="••••••••" />
        </div>

        <div className="border-t border-bd-border px-4 py-4">
          <button
            onClick={() => {
              setError('')
              setOpen(true)
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-bd-border bg-bd-surface px-4 py-2.5 text-sm font-bold text-bd-text transition-colors hover:bg-bd-surface-muted"
          >
            <LockKeyhole size={14} />
            Change Password
          </button>
        </div>
      </div>

      {canUseAndroidNativeSqlite() ? (
        <div className="overflow-hidden rounded-2xl border border-bd-border bg-card shadow-sm">
          <div className="border-b border-bd-border bg-bd-surface-muted px-4 py-3.5">
            <div className="text-sm font-bold text-bd-text">Device Assignment</div>
            <div className="mt-0 text-[12px] leading-5 text-muted-foreground">
              Retry offline device registration for this device.
            </div>
          </div>

          <div className="px-4 py-4">
            <button
              onClick={retryDeviceHydration}
              disabled={hydrating}
              className="rounded-xl border border-bd-border bg-bd-surface px-4 py-2.5 text-sm font-bold text-bd-text transition-colors hover:bg-bd-surface-muted disabled:opacity-50"
            >
              {hydrating ? 'Registering...' : 'Retry Registration'}
            </button>
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[hsl(var(--bd-overlay-scrim))] px-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-bd-border bg-card shadow-xl">
            <div className="flex items-start gap-3 border-b border-bd-border bg-bd-surface-muted px-4 py-3.5">
              <button
                onClick={resetModal}
                className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-bd-border bg-bd-surface text-bd-text-muted transition-colors hover:bg-bd-surface-muted"
                aria-label="Close password modal"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-bd-text">Change Password</div>
                <div className="mt-0 text-[12px] leading-5 text-muted-foreground">
                  Verify your current password before saving a new one.
                </div>
              </div>

              <button
                onClick={resetModal}
                className="rounded-lg p-1 text-bd-text-muted transition-colors hover:bg-bd-surface-muted hover:text-bd-text"
                aria-label="Close password modal"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 px-4 py-4">
              <SettingsField label="Current Password">
                <input
                  type="password"
                  value={form.currentPassword}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      currentPassword: event.target.value,
                    }))
                  }
                  placeholder="Enter current password"
                  className="w-full rounded-xl border border-bd-border px-3 py-2.5 text-sm transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </SettingsField>

              <SettingsField label="New Password">
                <input
                  type="password"
                  value={form.newPassword}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      newPassword: event.target.value,
                    }))
                  }
                  placeholder="8+ chars, 1 uppercase, 1 number"
                  className="w-full rounded-xl border border-bd-border px-3 py-2.5 text-sm transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                />

                <div className="mt-3 rounded-xl border border-bd-border bg-bd-surface-muted px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-bd-text-muted">
                      Strength
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        strength === 'Strong'
                          ? 'text-bd-status-success-text'
                          : strength === 'Fair'
                          ? 'text-bd-status-warning-text'
                          : 'text-bd-status-danger-text'
                      }`}
                    >
                      {strength}
                    </span>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-bd-surface-muted">
                    <div
                      className={`h-full rounded-full transition-all ${strengthClass}`}
                      style={{ width: `${(strengthScore / 3) * 100}%` }}
                    />
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <div className={requirements.length ? 'text-bd-status-success-text' : ''}>
                      8+ characters
                    </div>
                    <div className={requirements.uppercase ? 'text-bd-status-success-text' : ''}>
                      At least 1 uppercase letter
                    </div>
                    <div className={requirements.number ? 'text-bd-status-success-text' : ''}>
                      At least 1 number
                    </div>
                  </div>
                </div>
              </SettingsField>

              <SettingsField label="Confirm New Password">
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      confirmPassword: event.target.value,
                    }))
                  }
                  placeholder="Repeat new password"
                  className="w-full rounded-xl border border-bd-border px-3 py-2.5 text-sm transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </SettingsField>

              {error ? (
                <p className="rounded-xl bg-bd-status-danger-bg px-3 py-2 text-xs text-bd-status-danger-text">
                  {error}
                </p>
              ) : null}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={resetModal}
                  className="flex-1 rounded-xl border border-bd-border bg-bd-surface px-4 py-3 text-sm font-bold text-bd-text transition-colors hover:bg-bd-surface-muted"
                >
                  Cancel
                </button>

                <button
                  onClick={save}
                  disabled={
                    saving ||
                    !form.currentPassword ||
                    !meetsRequirements ||
                    !passwordsMatch
                  }
                  className={`flex-1 rounded-xl ${pageFormPrimaryActionClassName} px-4 py-3 text-sm font-bold transition-colors disabled:opacity-50`}
                >
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
