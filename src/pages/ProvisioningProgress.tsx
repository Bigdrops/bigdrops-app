import { useEffect, useState } from 'react'
import { Loader2, Layers } from 'lucide-react'
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
import { supabase } from '../supabase'
import { useEntity } from '@/lib/tenant/contexts'

const POLL_INTERVAL_MS = 3000

export default function ProvisioningProgress() {
  const entityCtx = useEntity()
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false)

  useEffect(() => {
    const id = setInterval(() => {
      entityCtx.refresh()
      entityCtx.recheckProvisioning()
    }, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [entityCtx])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <>
      <style>{`
        @keyframes provisionFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        @keyframes provisionPulse {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.12); opacity: 0.8; }
        }
        .provision-float { animation: provisionFloat 2.8s ease-in-out infinite; }
        .provision-pulse { animation: provisionPulse 2.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .provision-float, .provision-pulse { animation: none !important; }
        }
      `}</style>

      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-0 shadow-xl shadow-black/5 rounded-2xl bg-card">
          <CardHeader className="flex flex-col items-center text-center space-y-4 pt-8">
            <div className="provision-float relative flex h-24 w-24 items-center justify-center">
              <div className="provision-pulse absolute inset-0 rounded-full bg-sky-500/10 blur-xl" />
              <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full border border-sky-200 bg-sky-50 shadow-sm">
                <Loader2 className="h-8 w-8 animate-spin text-sky-600" aria-hidden="true" />
              </div>
            </div>

            <div className="space-y-2">
              <CardTitle className="text-xl font-semibold tracking-tight text-foreground">
                Setting Up Your Company
              </CardTitle>

              <CardContent className="p-0">
                <p className="text-sm leading-6 text-muted-foreground">
                  We are creating your company workspace: tables, permissions and defaults. This
                  usually takes a few seconds.
                </p>
                <p className="mt-3 flex items-center justify-center gap-2 text-sm leading-6 text-muted-foreground">
                  <Layers className="h-4 w-4 text-sky-600" aria-hidden="true" />
                  This page refreshes automatically.
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
              You will be signed out of your account. Provisioning will continue in the background.
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
