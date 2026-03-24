import { supabase } from '../supabase'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShieldAlert } from 'lucide-react'

export default function PendingApproval({ email }) {
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <>
      <style>{`
        @keyframes approvalPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.45;
          }
          50% {
            transform: scale(1.12);
            opacity: 0.8;
          }
        }

        @keyframes approvalSpin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes approvalFloat {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-4px);
          }
        }

        .approval-pulse {
          animation: approvalPulse 2.2s ease-in-out infinite;
        }

        .approval-ring {
          animation: approvalSpin 7s linear infinite;
        }

        .approval-float {
          animation: approvalFloat 2.8s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .approval-pulse,
          .approval-ring,
          .approval-float {
            animation: none !important;
          }
        }
      `}</style>

      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-0 shadow-xl shadow-black/5 rounded-2xl bg-card">
          <CardHeader className="flex flex-col items-center text-center space-y-4 pt-8">
            <div className="relative flex h-24 w-24 items-center justify-center approval-float">
              <div className="approval-pulse absolute inset-0 rounded-full bg-red-500/10 blur-xl" />

              <div className="approval-ring absolute inset-1 rounded-full border-2 border-dashed border-red-300/70" />

              <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full border border-red-200 bg-red-50 shadow-sm">
                <ShieldAlert className="h-8 w-8 text-red-600" />
              </div>
            </div>

            <div className="space-y-2">
              <CardTitle className="text-xl font-semibold tracking-tight text-foreground">
                Access Restricted
              </CardTitle>

              <CardContent className="p-0">
                <p className="text-sm leading-6 text-muted-foreground">
                  Your signup was successful. You can sign in, but full access is still waiting on
                  account approval and workspace setup.
                </p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Depending on your sign-in flow, your email may already be confirmed or may still
                  need confirmation. Once that is complete, access here still depends on approval
                  and device or account setup for this workspace.
                </p>

                {email ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Signed in as <span className="font-medium text-slate-700">{email}</span>
                  </p>
                ) : null}
              </CardContent>
            </div>
          </CardHeader>

          <CardFooter className="flex justify-center pb-8 pt-2">
            <Button
              type="button"
              variant="destructive"
              className="rounded-full px-6 font-semibold shadow-sm"
              onClick={handleSignOut}
            >
              Sign Out
            </Button>
          </CardFooter>
        </Card>
      </div>
    </>
  )
}
