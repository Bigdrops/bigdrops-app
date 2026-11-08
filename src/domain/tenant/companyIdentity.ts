import { supabase } from '@/supabase'
import type { TenantClient } from '@/lib/tenantClient'

export interface UpdateEntityDisplayNameInput {
  entityId: string
  displayName: string
  workspaceId?: string
}

export interface SynchronizedCompanySaveInput {
  entityId: string
  workspaceId?: string
  currentDisplayName: string
  newCompanyName: string
  settingsPayload: Record<string, unknown>
  tenantClient: TenantClient
  persistSettings: (updates: Record<string, unknown>, client: TenantClient) => Promise<unknown>
  refreshEntity: () => Promise<void> | void
}

export interface SynchronizedCompanySaveResult {
  displayNameUpdated: boolean
  settingsUpdated: boolean
}

/**
 * Update the human-facing display name of an entity in public.entities.
 *
 * CRITICAL DATABASE INVARIANT:
 * `slug` determines the physical PostgreSQL tenant schema namespace
 * (`entity_${workspace.slug}_${entity.slug}`). It is strictly immutable during
 * company rename operations. Only `display_name` is mutable.
 *
 * Authorization:
 * Governed by public.entities RLS policy `entities_update_member` requiring
 * workspace membership with owner role or create_entity permission.
 */
export async function updateEntityDisplayName(
  input: UpdateEntityDisplayNameInput,
): Promise<{ id: string; display_name: string }> {
  const trimmed = (input.displayName || '').trim()
  if (!trimmed) {
    throw new Error('Company name cannot be empty or whitespace only.')
  }

  let query = supabase
    .from('entities')
    .update({ display_name: trimmed })
    .eq('id', input.entityId)

  if (input.workspaceId) {
    query = query.eq('workspace_id', input.workspaceId)
  }

  const { data, error } = await query.select('id, display_name').single()

  if (error) throw error
  return data as { id: string; display_name: string }
}

/**
 * Synchronize company display name and tenant settings with compensating rollback.
 *
 * Avoids partial-save states across the multi-tenant database boundary:
 * 1. Validates that newCompanyName is non-empty and non-whitespace.
 * 2. If display_name is changing, updates public.entities first.
 *    (Stricter permission boundary: workspace owner / create_entity).
 * 3. Persists tenant settings (company_name, address, phone, custom_info, etc.).
 * 4. If tenant settings persistence fails after public.entities was updated,
 *    triggers a compensating rollback on public.entities to restore the baseline
 *    display_name so records are never left inconsistent.
 * 5. Refreshes EntityProvider so all application-wide consumers receive the
 *    synchronized name.
 */
export async function synchronizedCompanySave(
  input: SynchronizedCompanySaveInput,
): Promise<SynchronizedCompanySaveResult> {
  const trimmedName = (input.newCompanyName || '').trim()
  if (!trimmedName) {
    throw new Error('Company name cannot be empty or whitespace only.')
  }

  const baselineName = (input.currentDisplayName || '').trim()
  const isNameChanging = !!input.entityId && trimmedName !== baselineName
  let entityUpdated = false

  try {
    // Phase 1: Update public.entities display_name if changed
    if (isNameChanging) {
      await updateEntityDisplayName({
        entityId: input.entityId,
        displayName: trimmedName,
        workspaceId: input.workspaceId,
      })
      entityUpdated = true
    }

    // Phase 2: Persist tenant-isolated settings
    await input.persistSettings(
      {
        ...input.settingsPayload,
        company_name: trimmedName,
      },
      input.tenantClient,
    )

    // Phase 3: Refresh EntityProvider context
    await Promise.resolve(input.refreshEntity())

    return {
      displayNameUpdated: isNameChanging,
      settingsUpdated: true,
    }
  } catch (error) {
    // Compensating rollback: Revert public.entities if tenant settings failed
    if (entityUpdated && input.entityId && baselineName) {
      try {
        await updateEntityDisplayName({
          entityId: input.entityId,
          displayName: baselineName,
          workspaceId: input.workspaceId,
        })
        await Promise.resolve(input.refreshEntity())
      } catch (rollbackError) {
        console.error(
          '[synchronizedCompanySave] Critical: compensating rollback of public.entities failed:',
          rollbackError,
        )
      }
    }
    throw error
  }
}
