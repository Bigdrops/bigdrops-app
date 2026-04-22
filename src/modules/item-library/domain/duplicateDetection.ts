import type { DuplicateCandidateGroup, DuplicateCandidateMember, ItemCatalogItem } from '../types'

const NOISE_TOKENS = new Set(['and', 'for', 'the', 'with'])

function stripBracketedText(value: string) {
  return value.replace(/\([^)]*\)|\[[^\]]*]|\{[^}]*}/g, ' ')
}

function normalizeMeasurementTokens(value: string) {
  return value
    .replace(/\bamp(?:s|ere|eres)?\b/g, 'amp')
    .replace(/\bmm²\b/g, 'sqmm')
    .replace(/\bmm2\b/g, 'sqmm')
    .replace(/\bsq\.?\s*mm\b/g, 'sqmm')
    .replace(/\b(\d+)\s*-\s*core\b/g, '$1core')
    .replace(/\b(\d+)\s*core\b/g, '$1core')
    .replace(/\b(\d+)\s*c\b/g, '$1core')
    .replace(/\b(\d+)\s*-\s*c\b/g, '$1core')
}

function singularizeToken(token: string) {
  if (token.length <= 3) return token
  if (token.endsWith('ies') && token.length > 4) return `${token.slice(0, -3)}y`
  if (token.endsWith('es') && token.length > 4 && !token.endsWith('ses')) return token.slice(0, -2)
  if (token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1)
  return token
}

function tokenizeName(name: string) {
  const normalized = normalizeMeasurementTokens(stripBracketedText(name).toLowerCase())
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized
    .split(' ')
    .map((token) => singularizeToken(token.trim()))
    .filter((token) => token && !NOISE_TOKENS.has(token))
}

function createFamilyKey(tokens: string[]) {
  return [...tokens].sort().join(' ')
}

function getTokenOverlapScore(left: string[], right: string[]) {
  const leftSet = new Set(left)
  const rightSet = new Set(right)
  const overlap = [...leftSet].filter((token) => rightSet.has(token))
  if (overlap.length === 0) return { overlapCount: 0, score: 0 }

  const denominator = Math.max(leftSet.size, rightSet.size)
  return { overlapCount: overlap.length, score: overlap.length / denominator }
}

function shouldGroupItems(leftTokens: string[], rightTokens: string[]) {
  const leftKey = createFamilyKey(leftTokens)
  const rightKey = createFamilyKey(rightTokens)
  if (!leftKey || !rightKey) return false
  if (leftKey === rightKey) return true

  const { overlapCount, score } = getTokenOverlapScore(leftTokens, rightTokens)
  if (overlapCount >= 3 && score >= 0.7) return true
  if (overlapCount >= 2) {
    const leftPhrase = leftTokens.join(' ')
    const rightPhrase = rightTokens.join(' ')
    if (leftPhrase.includes(rightPhrase) || rightPhrase.includes(leftPhrase)) return true
    if (score >= 0.82) return true
  }

  return false
}

function pickGroupLabel(members: DuplicateCandidateMember[]) {
  const ranked = [...members].sort((left, right) => {
    if (right.usage_count !== left.usage_count) return right.usage_count - left.usage_count
    if ((right.name?.length || 0) !== (left.name?.length || 0)) return (left.name?.length || 0) - (right.name?.length || 0)
    return left.name.localeCompare(right.name)
  })

  return ranked[0]?.name || 'Similar items'
}

function buildReason(tokens: string[]) {
  const reasonTokens = tokens.slice(0, 4)
  if (!reasonTokens.length) {
    return 'These items share very similar wording.'
  }

  return `These items share similar normalized wording around ${reasonTokens.join(', ')}.`
}

export function detectDuplicateGroups(items: ItemCatalogItem[]): DuplicateCandidateGroup[] {
  const candidates = items
    .map((item) => {
      const tokens = tokenizeName(item.name)
      return {
        item,
        tokens,
        familyKey: createFamilyKey(tokens),
      }
    })
    .filter((entry) => entry.tokens.length >= 2)

  const visited = new Set<string>()
  const groups: DuplicateCandidateGroup[] = []

  for (const candidate of candidates) {
    if (visited.has(candidate.item.item_id)) continue

    const cluster = candidates.filter((entry) => shouldGroupItems(candidate.tokens, entry.tokens))
    if (cluster.length < 2) continue

    cluster.forEach((entry) => visited.add(entry.item.item_id))

    const members = cluster
      .map((entry) => ({
        item_id: entry.item.item_id,
        name: entry.item.name,
        usage_count: Number(entry.item.usage_count || 0),
        last_sold_price: entry.item.last_sold_price ?? null,
        last_used_at: entry.item.last_used_at ?? null,
      }))
      .sort((left, right) => {
        if (right.usage_count !== left.usage_count) return right.usage_count - left.usage_count
        return left.name.localeCompare(right.name)
      })

    groups.push({
      group_id: members.map((member) => member.item_id).join('::'),
      label: pickGroupLabel(members),
      reason: buildReason(candidate.tokens),
      normalized_label: candidate.familyKey,
      members,
    })
  }

  return groups.sort((left, right) => {
    if (right.members.length !== left.members.length) return right.members.length - left.members.length
    const rightUsage = right.members.reduce((sum, member) => sum + member.usage_count, 0)
    const leftUsage = left.members.reduce((sum, member) => sum + member.usage_count, 0)
    if (rightUsage !== leftUsage) return rightUsage - leftUsage
    return left.label.localeCompare(right.label)
  })
}
