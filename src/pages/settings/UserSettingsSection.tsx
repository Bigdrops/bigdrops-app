import { useState } from 'react'
import { ChevronLeft, LockKeyhole, X } from 'lucide-react'
import { supabase } from '@/supabase'
import { SettingsField, SettingsSummaryField } from './SettingsFormPrimitives'
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
      ? 'bg-emerald-500'
      : strength === 'Fair'
      ? 'bg-amber-500'
      : 'bg-red-500'

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
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
          User Settings
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-card shadow-sm">
        <div className="border-b border-slate-200/80 bg-slate-50/50 px-4 py-3.5">
          <div className="text-sm font-bold text-slate-900">Profile & Security</div>
          <div className="mt-0 text-[12px] leading-5 text-muted-foreground">
            Review your signed-in account details and security actions.
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2">
          <SettingsSummaryField label="Signed-in Email" value={email || 'No user email'} />
          <SettingsSummaryField label="Password" value="••••••••" />
        </div>

        <div className="border-t border-slate-200/80 px-4 py-4">
          <button
            onClick={() => {
              setError('')
              setOpen(true)
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <LockKeyhole size={14} />
            Change Password
          </button>
        </div>
      </div>

      {canUseAndroidNativeSqlite() ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-card shadow-sm">
          <div className="border-b border-slate-200/80 bg-slate-50/50 px-4 py-3.5">
            <div className="text-sm font-bold text-slate-900">Device Assignment</div>
            <div className="mt-0 text-[12px] leading-5 text-muted-foreground">
              Retry offline device registration for this device.
            </div>
          </div>

          <div className="px-4 py-4">
            <button
              onClick={retryDeviceHydration}
              disabled={hydrating}
              className="rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              {hydrating ? 'Registering...' : 'Retry Registration'}
            </button>
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/80 bg-card shadow-xl">
            <div className="flex items-start gap-3 border-b border-slate-200/80 bg-slate-50/50 px-4 py-3.5">
              <button
                onClick={resetModal}
                className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-500 transition-colors hover:bg-slate-50"
                aria-label="Close password modal"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-slate-900">Change Password</div>
                <div className="mt-0 text-[12px] leading-5 text-muted-foreground">
                  Verify your current password before saving a new one.
                </div>
              </div>

              <button
                onClick={resetModal}
                className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
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
                  className="w-full rounded-xl border border-slate-200/80 px-3 py-2.5 text-sm transition-colors focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500/10"
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
                  className="w-full rounded-xl border border-slate-200/80 px-3 py-2.5 text-sm transition-colors focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500/10"
                />

                <div className="mt-3 rounded-xl border border-slate-200/80 bg-slate-50/50 px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Strength
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        strength === 'Strong'
                          ? 'text-emerald-600'
                          : strength === 'Fair'
                          ? 'text-amber-600'
                          : 'text-red-600'
                      }`}
                    >
                      {strength}
                    </span>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full transition-all ${strengthClass}`}
                      style={{ width: `${(strengthScore / 3) * 100}%` }}
                    />
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <div className={requirements.length ? 'text-emerald-600' : ''}>
                      8+ characters
                    </div>
                    <div className={requirements.uppercase ? 'text-emerald-600' : ''}>
                      At least 1 uppercase letter
                    </div>
                    <div className={requirements.number ? 'text-emerald-600' : ''}>
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
                  className="w-full rounded-xl border border-slate-200/80 px-3 py-2.5 text-sm transition-colors focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500/10"
                />
              </SettingsField>

              {error ? (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">
                  {error}
                </p>
              ) : null}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={resetModal}
                  className="flex-1 rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
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