import type { SupabaseClient } from '@supabase/supabase-js'
import { listConnections, type PublicConnection } from '../connection-vault.js'
import { isFreeModel } from '../openrouter-pricing.js'
import { getCatalogueEntry } from '../provider-catalog.js'

export interface CandidateAlternative {
  connectionId: string
  connectionName: string
  providerId: string
  modelId: string
  modelName: string
  isFree: boolean
}

/**
 * Discovers and ranks eligible AI model alternatives for Manual mode failover negotiation.
 *
 * Security & Integrity Guarantees:
 * - Read-only: uses `listConnections` selecting `PUBLIC_COLUMNS`; never mutates selection counters or acquires row locks.
 * - Secret exclusion: secret vault ciphertexts (encrypted_key, nonce, tag) are excluded from PUBLIC_COLUMNS.
 * - Health verification: excludes quarantined connections, disabled connections, unpooled connections, and active cooldowns.
 * - Model cooldown: excludes models currently cooling down in `model_cooldowns`.
 * - Diversity & Ranking: deterministic priority ordering by connection priority, health, and selection count.
 */
export async function discoverEligibleAlternatives(
  adminClient: SupabaseClient,
  failedConnectionId?: string | null,
  failedModelId?: string | null,
  limit: number = 4,
): Promise<CandidateAlternative[]> {
  try {
    const allConnections = await listConnections(adminClient)
    const now = Date.now()

    // 1. Filter eligible connections
    const eligibleConnections = allConnections.filter((c: PublicConnection) => {
      if (!c.isEnabled) return false
      if (!c.inPool) return false
      if (c.healthStatus === 'quarantined') return false
      if (c.accountCooldownUntil && new Date(c.accountCooldownUntil).getTime() > now) {
        return false
      }
      return true
    })

    // 2. Sort connections deterministically:
    // Priority ascending (1 before 2 before 100), healthy before unknown, fewer consecutive failures, fewer total selections
    eligibleConnections.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority
      const healthRank = (status: string) => (status === 'healthy' ? 0 : status === 'unknown' ? 1 : 2)
      const diffHealth = healthRank(a.healthStatus) - healthRank(b.healthStatus)
      if (diffHealth !== 0) return diffHealth
      if (a.consecutiveFailures !== b.consecutiveFailures) return a.consecutiveFailures - b.consecutiveFailures
      return a.totalSelections - b.totalSelections
    })

    const candidates: CandidateAlternative[] = []
    const seenCombos = new Set<string>()

    for (const conn of eligibleConnections) {
      const entry = getCatalogueEntry(conn.providerId)
      const labelMap = new Map<string, string>()

      if (conn.discoveredModels) {
        for (const m of conn.discoveredModels) {
          labelMap.set(m.id, m.label || m.id)
        }
      }
      if (entry?.curatedModels) {
        for (const c of entry.curatedModels) {
          if (!labelMap.has(c.id)) labelMap.set(c.id, c.label || c.id)
        }
      }

      // Gather candidate model IDs for this connection
      const candidateModelIds: string[] = []
      if (conn.model) candidateModelIds.push(conn.model)
      if (Array.isArray(conn.allowedModels)) {
        for (const m of conn.allowedModels) {
          if (!candidateModelIds.includes(m)) candidateModelIds.push(m)
        }
      }

      for (const mId of candidateModelIds) {
        if (!mId || mId === '*') continue

        // Check if model is in active model_cooldowns
        if (conn.modelCooldowns && conn.modelCooldowns[mId]) {
          const cdUntil = new Date(conn.modelCooldowns[mId]).getTime()
          if (cdUntil > now) continue
        }

        // Avoid offering the exact failed connection + model combination
        if (conn.id === failedConnectionId && mId === failedModelId) {
          continue
        }

        const comboKey = `${conn.id}:${mId}`
        if (seenCombos.has(comboKey)) continue
        seenCombos.add(comboKey)

        const discModel = conn.discoveredModels?.find((d) => d.id === mId)
        const isFree = isFreeModel(mId, discModel?.metadata)
        const modelName = labelMap.get(mId) || mId
        const connectionName = conn.name || entry?.name || conn.providerId

        candidates.push({
          connectionId: conn.id,
          connectionName,
          providerId: conn.providerId,
          modelId: mId,
          modelName,
          isFree,
        })

        if (candidates.length >= Math.max(3, Math.min(5, limit))) {
          break
        }
      }

      if (candidates.length >= Math.max(3, Math.min(5, limit))) {
        break
      }
    }

    return candidates
  } catch (err) {
    console.error('[bolu-alternative-discovery] Error discovering alternatives:', err)
    return []
  }
}
