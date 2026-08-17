import { Building2 } from 'lucide-react'
import { supabase } from '../supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useWorkspace } from '@/lib/tenant/contexts'

export default function WorkspaceSelection() {
  const workspaceCtx = useWorkspace()

  const handleSelect = (id: string) => workspaceCtx.selectWorkspace(id)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
      <Card className="w-full max-w-md border-0 shadow-xl shadow-black/5 rounded-2xl bg-card">
        <CardContent className="p-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 shadow-sm">
            <Building2 className="h-8 w-8 text-blue-600" />
          </div>

          <div className="mt-6">
            <div className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
              BigDrops ERP
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
              Choose a workspace
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              You belong to more than one workspace. Select one to continue. The choice lasts for
              this session only.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            {workspaceCtx.activeWorkspaces.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => handleSelect(w.id)}
                className="flex w-full items-center justify-between rounded-xl border border-black/10 bg-background px-4 py-3 text-left transition-colors hover:border-black/20 hover:bg-black/5"
              >
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    {w.name || w.slug || 'Unnamed workspace'}
                  </div>
                  {w.slug && <div className="text-xs text-muted-foreground">/{w.slug}</div>}
                </div>
                <div className="text-xs font-medium text-muted-foreground">{w.role || 'member'}</div>
              </button>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            className="mt-6 w-full rounded-full px-6 font-semibold shadow-sm"
            onClick={handleSignOut}
          >
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}