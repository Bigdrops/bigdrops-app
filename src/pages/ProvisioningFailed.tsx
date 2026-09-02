import { useState } from 'react'
import { AlertTriangle, ArrowLeftRight, Building2 } from 'lucide-react'
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
import { useEntity, useWorkspace } from '@/lib/tenant/contexts'
import { CompanySelectionSheet } from '@/components/layout/CompanySelectionSheet'

export default function ProvisioningFailed() {
  const entityCtx = useEntity()
  const { workspace } = useWorkspace()
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false)
  const [switcherOpen, setSwitcherOpen] = useState(false)

  const failedName = entityCtx.entity?.name || 'Your company'
  const hasOtherCompanies = entityCtx.entityCount > 1
  const workspaceName = workspace?.name || 'your workspace'

  const handleRetry = () => {
    entityCtx.recheckProvisioning()
  }

  const handleSwitchCompany = () => {
    setSwitcherOpen(true)
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
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-red-200 bg-red-50 shadow-sm">
              <AlertTriangle className="h-8 w-8 text-red-600" aria-hidden="true" />
            </div>

            <div className="space-y-2">
              <CardTitle className="text-xl font-semibold tracking-tight text-foreground">
                Company Setup Failed
              </CardTitle>

              <CardContent className="p-0">
                <p className="text-sm leading-6 text-muted-foreground">
                  <span className="font-semibold text-foreground">{failedName}</span> could not
                  be set up in {workspaceName}.
                </p>
                {entityCtx.provisioningError && (
                  <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-left text-xs text-red-700">
                    {entityCtx.provisioningError}
                  </p>
                )}
              </CardContent>
            </div>
          </CardHeader>

          <CardFooter className="flex flex-col gap-3 pb-8 pt-2">
            {/* Primary: Switch Company (if other companies exist) */}
            {hasOtherCompanies && (
              <Button
                type="button"
                className="w-full rounded-xl bg-[#111111] px-6 font-semibold text-white shadow-sm hover:bg-black"
                onClick={handleSwitchCompany}
              >
                <ArrowLeftRight className="mr-2 h-4 w-4" />
                Switch Company
              </Button>
            )}

            {/* Secondary: Retry */}
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl font-semibold shadow-sm"
              onClick={handleRetry}
            >
              Try Again
            </Button>

            {/* Tertiary: low-priority escape */}
            <Button
              type="button"
              variant="ghost"
              className="w-full rounded-xl text-muted-foreground"
              onClick={() => setSignOutDialogOpen(true)}
            >
              Sign Out
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Company Switcher */}
      <CompanySelectionSheet open={switcherOpen} onOpenChange={setSwitcherOpen} />

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
