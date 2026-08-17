import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ButtonLoading } from '@/components/loading/AppLoadingStates'
import { useWorkspace } from '@/lib/tenant/contexts'
import { createWorkspace, slugify } from '@/domain/tenant/tenantCreation'

export default function WorkspaceCreation() {
  const workspaceCtx = useWorkspace()
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Please enter a workspace name.')
      return
    }

    setLoading(true)
    try {
      await createWorkspace({ name: name.trim(), slug: slugify(name) })
      workspaceCtx.refresh()
    } catch (e) {
      setError(String((e as Error)?.message ?? e))
    } finally {
      setLoading(false)
    }
  }

  const updateName = (event: ChangeEvent<HTMLInputElement>) => setName(event.target.value)

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
      <Card className="w-full max-w-md border-0 shadow-xl shadow-black/5 rounded-2xl bg-card">
        <CardContent className="p-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 shadow-sm">
            <Building2 className="h-8 w-8 text-emerald-600" />
          </div>

          <div className="mt-6">
            <div className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
              BigDrops ERP
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
              {mode === 'create' ? 'Create your workspace' : 'Join a workspace'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {mode === 'create'
                ? 'A workspace holds your business data. Your workspace must be approved before you can create a company inside it.'
                : 'Workspaces are invite-only. Ask your company or team to send you an invitation.'}
            </p>
          </div>

          <div className="mt-6 flex rounded-xl border border-black/10 bg-black/5 p-1">
            {(['create', 'join'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  mode === m ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground'
                }`}
              >
                {m === 'create' ? 'Create' : 'Join'}
              </button>
            ))}
          </div>

          {mode === 'join' ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-black/10 bg-background p-4">
                <h3 className="text-sm font-semibold text-foreground">Invitation required</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Ask the administrator of the company or team you work with to invite this
                  account&apos;s email address. There is no join code.
                </p>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                Once an invitation is sent, it appears automatically the next time you sign in and
                you can accept it from your invitation screen.
              </p>
            </div>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="workspace-name" className="text-slate-700">
                  Workspace name
                </Label>
                <Input
                  id="workspace-name"
                  type="text"
                  value={name}
                  onChange={updateName}
                  placeholder="e.g. Tunde and Sons Limited"
                  className="h-12 rounded-xl border-black/10 bg-background pl-4 text-base shadow-none"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-xl bg-[#111111] text-white hover:bg-black"
              >
                <ButtonLoading
                  loading={loading}
                  loadingLabel="Creating workspace"
                  idleLabel="Create Workspace"
                />
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
