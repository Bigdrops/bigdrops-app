// Tenancy onboarding gate. Pure decision logic: given the current state of
// workspace/entity resolution and provisioning, decide which onboarding screen
// the signed-in user must see. No side effects, no UI.

export type ProvisioningStatus = 'pending' | 'creating' | 'ready' | 'failed' | 'purging' | 'purged'

export const VALID_PROVISIONING_STATES: ReadonlySet<ProvisioningStatus> = new Set([
  'pending',
  'creating',
  'ready',
  'failed',
  'purging',
  'purged',
])

/** Normalize a free-text name into a URL-safe slug. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Derive the deterministic default name/slug for the automatically created
 * first company of a workspace. Pure: the same workspace name always yields
 * the same slug, so repeated or concurrent bootstrap attempts converge on
 * one row via the UNIQUE (workspace_id, slug) constraint instead of
 * duplicating. The name stays editable later in Company Settings.
 */
export function buildInitialCompanyInput(workspaceName: string | null | undefined): {
  displayName: string
  slug: string
} {
  const base = (workspaceName ?? '').trim()
  const displayName = base ? `${base} Company` : 'My Company'
  return { displayName, slug: slugify(displayName) || 'my-company' }
}

/**
 * Derive the deterministic default name/slug for the automatically created
 * first workspace of a user. Pure: the same user always yields the same
 * slug, so repeated or concurrent bootstrap attempts converge on one row
 * via the UNIQUE slug constraint and the unique pending-per-creator index
 * instead of duplicating. The name stays editable later in workspace
 * settings. The slug is user-id derived (not name derived) because
 * workspaces.slug is globally unique and names collide across users.
 */
export function buildInitialWorkspaceInput(
  email: string | null | undefined,
  userId: string,
): {
  name: string
  slug: string
} {
  const prefix = (email ?? '').split('@')[0].trim()
  const name = prefix ? `${prefix.charAt(0).toUpperCase()}${prefix.slice(1)}'s Workspace` : 'My Workspace'
  return { name, slug: `ws-${userId.slice(0, 8).toLowerCase()}` }
}

export function isProvisioningStatus(value: unknown): value is ProvisioningStatus {
  return typeof value === 'string' && VALID_PROVISIONING_STATES.has(value as ProvisioningStatus)
}

export type TenantGatePhase =
  | 'loading'
  | 'error'
  | 'create-workspace'
  | 'select-workspace'
  | 'pending-invitation'
  | 'pending-approval'
  | 'create-company'
  | 'provisioning'
  | 'provisioning-failed'
  | 'blocked'
  | 'unavailable'
  | 'ready'

export interface TenantGateInput {
  workspaceLoading: boolean
  workspaceError: string | null
  workspace: { id: string; status: string | null } | null
  workspaceCount: number
  pendingWorkspace: { id: string } | null
  pendingInvitation: { id: string } | null
  invitationDismissed: boolean
  entityLoading: boolean
  entityError: string | null
  entityCount: number
  provisioningStatus: ProvisioningStatus | null
}

const STALLED_PHASES: ReadonlySet<ProvisioningStatus> = new Set(['purging', 'purged'])

/**
 * Decide the onboarding phase from current resolution state.
 * Order matters: workspace loading/errors precede entity loading/errors,
 * and a missing workspace short-circuits before entity state is consulted.
 */
export function resolveGatePhase(input: TenantGateInput): TenantGatePhase {
  if (input.workspaceLoading) return 'loading'
  if (input.workspaceError) return 'error'

  if (!input.workspace) {
    if (input.pendingWorkspace) return 'pending-approval'
    // An invitee with no membership must accept before they can create their own
    // workspace, unless they explicitly chose "Pass for now" this session.
    if (input.pendingInvitation && !input.invitationDismissed) return 'pending-invitation'
    // Multiple active memberships: the user must pick one before any entity work.
    if (input.workspaceCount > 1) return 'select-workspace'
    return 'create-workspace'
  }

  if (input.entityLoading) return 'loading'
  if (input.entityError) return 'error'

  if (input.entityCount === 0) return 'create-company'

  switch (input.provisioningStatus) {
    case 'ready':
      return 'ready'
    case 'failed':
      return 'provisioning-failed'
    case 'creating':
    case 'pending':
      return 'provisioning'
    default:
      return STALLED_PHASES.has(input.provisioningStatus as ProvisioningStatus)
        ? input.provisioningStatus === 'purging'
          ? 'blocked'
          : 'unavailable'
        : 'provisioning'
  }
}

export function phaseIsError(phase: TenantGatePhase): boolean {
  return phase === 'error' || phase === 'provisioning-failed' || phase === 'blocked' || phase === 'unavailable'
}

export function gatePhaseLabel(phase: TenantGatePhase): string {
  switch (phase) {
    case 'create-workspace':
      return 'Create workspace'
    case 'select-workspace':
      return 'Select workspace'
    case 'pending-invitation':
      return 'Pending invitation'
    case 'pending-approval':
      return 'Pending approval'
    case 'create-company':
      return 'Create company'
    case 'provisioning':
      return 'Provisioning'
    case 'provisioning-failed':
      return 'Provisioning failed'
    case 'blocked':
      return 'Workspace blocked'
    case 'unavailable':
      return 'Workspace unavailable'
    default:
      return phase
  }
}
