import { useState } from 'react'
import { supabase } from '../supabase'
import { Mail } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useWorkspace } from '@/lib/tenant/contexts'
import { acceptWorkspaceInvitation } from '@/domain/tenant/tenantCreation'

export default function WorkspaceInvitation() {
  const workspaceCtx = useWorkspace()
  const [accepting, setAccepting] = useState(false)
  const [acceptError, setAcceptError] = useState<string | null>(null)
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false)

  const handleAccept = async () => {
    if (!workspaceCtx.pendingInvitation) return
    setAccepting(true)
    setAcceptError(null)
    try {
      await acceptWorkspaceInvitation(workspaceCtx.pendingInvitation.id)
      workspaceCtx.refresh()
    } catch (e) {
      setAcceptError(String((e as Error)?.message ?? e))
    } finally {
      setAccepting(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <>
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-0 shadow-xl shadow-black/5 rounded-2xl bg-card">
          <CardHeader className="flex flex-col items-center text-center space-y-4 pt-8">
            <div className="relative flex h-24 w-24 items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-blue-500/10 blur-xl" />
              <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full border border-blue-200 bg-blue-50 shadow-sm">
                <Mail className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="space-y-2">
              <CardTitle className="text-xl font-semibold tracking-tight text-foreground">
                You have been invited
              </CardTitle>

              <CardContent className="p-0">
                <p className="text-sm leading-6 text-muted-foreground">
                  Someone has invited you to join their workspace on BigDrops. Accept the
                  invitation to become a member and access shared companies.
                </p>
                {acceptError && (
                  <p className="mt-3 break-words text-sm leading-6 text-red-600">{acceptError}</p>
                )}
              </CardContent>
            </div>
          </CardHeader>

          <CardFooter className="flex flex-col gap-2 pb-8 pt-2">
            <Button
              type="button"
              className="w-full rounded-full px-6 font-semibold shadow-sm"
              onClick={handleAccept}
              disabled={accepting}
            >
              {accepting ? 'Accepting…' : 'Accept Invitation'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-full px-6 font-semibold shadow-sm"
              onClick={() => setSignOutDialogOpen(true)}
            >
              Sign Out
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full rounded-full px-6 font-semibold text-muted-foreground"
              onClick={workspaceCtx.dismissInvitation}
            >
              Pass for now
            </Button>
            <p className="px-2 text-center text-xs leading-5 text-muted-foreground">
              The invitation stays pending. You can accept it on a later sign-in.
            </p>
          </CardFooter>
        </Card>
      </div>

      <AlertDialog open={signOutDialogOpen} onOpenChange={setSignOutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be signed out of your account. Any unsaved work may be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleSignOut}>
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}