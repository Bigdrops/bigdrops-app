import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { Clock3 } from 'lucide-react'
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

const POLL_INTERVAL_MS = 5000

export default function WorkspacePendingApproval() {
  const workspaceCtx = useWorkspace()
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false)

  useEffect(() => {
    const id = setInterval(() => workspaceCtx.refresh(), POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [workspaceCtx])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <>
      <style>{`
        @keyframes approvalPulse {
          0%, 100% { transform: scale(1); opacity: 0.45; }
          50% { transform: scale(1.12); opacity: 0.8; }
        }
        @keyframes approvalSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes approvalFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        .approval-pulse { animation: approvalPulse 2.2s ease-in-out infinite; }
        .approval-ring { animation: approvalSpin 7s linear infinite; }
        .approval-float { animation: approvalFloat 2.8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .approval-pulse, .approval-ring, .approval-float { animation: none !important; }
        }
      `}</style>

      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-0 shadow-xl shadow-black/5 rounded-2xl bg-card">
          <CardHeader className="flex flex-col items-center text-center space-y-4 pt-8">
            <div className="relative flex h-24 w-24 items-center justify-center approval-float">
              <div className="approval-pulse absolute inset-0 rounded-full bg-amber-500/10 blur-xl" />
              <div className="approval-ring absolute inset-1 rounded-full border-2 border-dashed border-amber-300/70" />
              <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full border border-amber-200 bg-amber-50 shadow-sm">
                <Clock3 className="h-8 w-8 text-amber-600" />
              </div>
            </div>

            <div className="space-y-2">
              <CardTitle className="text-xl font-semibold tracking-tight text-foreground">
                Workspace Awaiting Approval
              </CardTitle>

              <CardContent className="p-0">
                <p className="text-sm leading-6 text-muted-foreground">
                  Your workspace was created. An administrator must approve it before you can create
                  a company and start using BigDrops.
                </p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  This page refreshes automatically. Approval usually takes a few minutes.
                </p>
              </CardContent>
            </div>
          </CardHeader>

          <CardFooter className="flex justify-center pb-8 pt-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-6 font-semibold shadow-sm"
              onClick={() => setSignOutDialogOpen(true)}
            >
              Sign Out
            </Button>
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
