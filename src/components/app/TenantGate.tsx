import { useMemo, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useWorkspace, useEntity } from '@/lib/tenant/contexts'
import {
  resolveGatePhase,
  type TenantGateInput,
} from '@/domain/tenant/tenantGate'
import PageLoader from '@/components/app/PageLoader'
import LoadingTips from '@/components/loading/LoadingTips'
import { Button } from '@/components/ui/button'
import WorkspaceCreation from '@/pages/WorkspaceCreation'
import WorkspaceSelection from '@/pages/WorkspaceSelection'
import WorkspaceInvitation from '@/pages/WorkspaceInvitation'
import WorkspacePendingApproval from '@/pages/WorkspacePendingApproval'
import CompanyCreation from '@/pages/CompanyCreation'
import ProvisioningProgress from '@/pages/ProvisioningProgress'
import ProvisioningFailed from '@/pages/ProvisioningFailed'

function GateError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border border-black/10 bg-card p-8 text-center shadow-[0_25px_80px_rgba(0,0,0,0.10)]">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Something went wrong
        </h2>
        <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">{message}</p>
        <Button
          type="button"
          onClick={onRetry}
          className="mt-6 h-11 rounded-xl bg-[#111111] px-6 text-white hover:bg-black"
        >
          Try Again
        </Button>
      </div>
    </div>
  )
}

export default function TenantGate({ children }: { children: ReactNode }) {
  const workspaceCtx = useWorkspace()
  const entityCtx = useEntity()
  const location = useLocation()

  const input = useMemo<TenantGateInput>(
    () => ({
      workspaceLoading: workspaceCtx.isLoading,
      workspaceError: workspaceCtx.error,
      workspace: workspaceCtx.workspace ? { id: workspaceCtx.workspace.id, status: workspaceCtx.workspace.status } : null,
      workspaceCount: workspaceCtx.workspaceCount,
      pendingWorkspace: workspaceCtx.pendingWorkspace ? { id: workspaceCtx.pendingWorkspace.id } : null,
      pendingInvitation: workspaceCtx.pendingInvitation ? { id: workspaceCtx.pendingInvitation.id } : null,
      invitationDismissed: workspaceCtx.invitationDismissed,
      entityLoading: entityCtx.isLoading,
      entityError: entityCtx.error,
      entityCount: entityCtx.entityCount,
      provisioningStatus: entityCtx.provisioningStatus,
    }),
    [
      workspaceCtx.isLoading,
      workspaceCtx.error,
      workspaceCtx.workspace,
      workspaceCtx.workspaceCount,
      workspaceCtx.pendingWorkspace,
      workspaceCtx.pendingInvitation,
      workspaceCtx.invitationDismissed,
      entityCtx.isLoading,
      entityCtx.error,
      entityCtx.entityCount,
      entityCtx.provisioningStatus,
    ],
  )

  const phase = resolveGatePhase(input)

  switch (phase) {
    case 'loading':
      return (
        <PageLoader>
          <LoadingTips pathname={location.pathname} active />
        </PageLoader>
      )

    case 'error': {
      const message = workspaceCtx.error ?? entityCtx.error ?? 'Unknown error.'
      const retry = () => {
        workspaceCtx.refresh()
        entityCtx.refresh()
      }
      return <GateError message={message} onRetry={retry} />
    }

    case 'create-workspace':
      return <WorkspaceCreation />

    case 'select-workspace':
      return <WorkspaceSelection />

    case 'pending-invitation':
      return <WorkspaceInvitation />

    case 'pending-approval':
      return <WorkspacePendingApproval />

    case 'create-company':
      return <CompanyCreation />

    case 'provisioning':
      return <ProvisioningProgress />

    case 'provisioning-failed':
      return <ProvisioningFailed />

    case 'blocked':
      return <GateError message="This workspace has been blocked." onRetry={() => workspaceCtx.refresh()} />

    case 'unavailable':
      return <GateError message="This workspace is no longer available." onRetry={() => workspaceCtx.refresh()} />

    case 'ready':
      return <>{children}</>
  }
}
