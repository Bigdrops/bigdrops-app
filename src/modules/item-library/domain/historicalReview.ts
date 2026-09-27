import type {
  HistoricalReviewCandidate,
  HistoricalReviewCatalogRef,
  HistoricalReviewCase,
  HistoricalReviewOccurrence,
  HistoricalReviewRawOccurrence,
  HistoricalReviewResult,
  HistoricalReviewSpecToken,
} from '../types'
import { normalizeItemText } from './suggestionRanking'

const NOISE_TOKENS = new Set(['and', 'for', 'the', 'with'])
const MAX_CANDIDATES_PER_CASE = 6

type CandidateRef = HistoricalReviewCatalogRef & {
  ref_kind: 'catalog' | 'alias'
  item_id: string
  name: string
  normalized_text: string
  matched_text: string
  standard_price: number | null
  usage_count: number | null
  last_sold_price: number | null
  last_used_at: string | null
  tokens: string[]
}

type CandidateGroup = {
  tenant_schema: string
  normalized_description: string
  rows: HistoricalReviewRawOccurrence[]
  tokens: string[]
  near_catalog: boolean
  near_alias: boolean
  near_candidate: boolean
  is_tier_b: boolean
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function stripBracketedText(value: string) {
  return value.replace(/\([^)]*\)|\[[^\]]*]|\{[^}]*}/g, ' ')
}

function tokenizeForTierEvidence(value: string): string[] {
  const normalized = stripBracketedText(value)
    .toLowerCase()
    .replace(/\bamp(?:s|ere|eres)?\b/g, 'amp')
    .replace(/\bmm²\b/g, 'sqmm')
    .replace(/\bmm2\b/g, 'sqmm')
    .replace(/\bsq\.?\s*mm\b/g, 'sqmm')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return [
    ...new Set(
      normalized
        .split(' ')
        .map((token) => token.trim())
        .filter((token) => token.length > 2 && !NOISE_TOKENS.has(token)),
    ),
  ]
}

function getTokenOverlap(left: string[], right: string[]) {
  const rightSet = new Set(right)
  return left.filter((token) => rightSet.has(token))
}

function isNearText(left: string, leftTokens: string[], right: string, rightTokens: string[]) {
  if (!left || !right || left === right) return false

  if (
    left.length >= 8 &&
    right.length >= 8 &&
    (left.includes(right) || right.includes(left))
  ) {
    return true
  }

  return getTokenOverlap(leftTokens, rightTokens).length >= 3
}

function getDisplayDescription(rows: HistoricalReviewRawOccurrence[]) {
  const counts = new Map<string, number>()
  rows.forEach((row) => {
    const description = String(row.description || '').trim()
    if (!description) return
    counts.set(description, (counts.get(description) || 0) + 1)
  })

  return [...counts.entries()].sort((left, right) => {
    if (right[1] !== left[1]) return right[1] - left[1]
    if (left[0].length !== right[0].length) return left[0].length - right[0].length
    return left[0].localeCompare(right[0])
  })[0]?.[0] || 'Unresolved historical item'
}

function countValues(values: Array<string | null | undefined>) {
  const counts = new Map<string, number>()
  values.forEach((value) => {
    const normalized = String(value || '').trim()
    if (!normalized) return
    counts.set(normalized, (counts.get(normalized) || 0) + 1)
  })
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count
      return left.value.localeCompare(right.value)
    })
}

function dateValue(value: string | null | undefined) {
  return new Date(value || 0).getTime() || 0
}

function stableCaseId(tenant_schema: string, normalized_description: string) {
  return `${tenant_schema || 'tenant'}::${normalized_description}`
}

// ponytail: code-unit order matches Postgres uuid ordering (memcmp) used
// by compute_historical_review_case_hash and array_agg(id ORDER BY id).
// localeCompare uses ICU collation and can disagree with the server.
function compareIdentifiers(left: string, right: string) {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

export function buildHistoricalReviewCaseMembershipHash(rows: HistoricalReviewRawOccurrence[]) {
  const members = rows
    .map((row) => ({
      sourceTable: row.source_type === 'invoice' ? 'invoice_items' : 'quotation_items',
      rowId: String(row.row_id || ''),
    }))
    .filter((row) => row.rowId)
    .sort((left, right) => {
      if (left.sourceTable !== right.sourceTable) return compareIdentifiers(left.sourceTable, right.sourceTable)
      return compareIdentifiers(left.rowId, right.rowId)
    })
    .map((row) => `${row.sourceTable}:${row.rowId}`)

  return `hr-v1-${members.join('|')}`
}

function getOccurrenceDate(row: HistoricalReviewRawOccurrence) {
  return row.document_date || row.updated_at || null
}

function toOccurrence(row: HistoricalReviewRawOccurrence): HistoricalReviewOccurrence {
  return {
    row_id: row.row_id,
    tenant_schema: row.tenant_schema,
    source_type: row.source_type,
    source_document_id: row.source_document_id,
    source_document_number: row.source_document_number || null,
    document_date: row.document_date || null,
    client_name: row.client_name || null,
    description: row.description,
    normalized_description: row.normalized_description,
    unit: row.unit || null,
    make: row.make || null,
    quantity: toNumber(row.quantity),
    unit_price: toNumber(row.unit_price),
    group_name: row.group_name || null,
    group_id: row.group_id || null,
    updated_at: row.updated_at || null,
  }
}

function buildSpecificationPatterns() {
  return [
    { kind: 'role', label: 'Role', regex: /\b(primary|secondary)\b/gi },
    { kind: 'voltage', label: 'Voltage', regex: /\b\d+(?:\.\d+)?\s*v(?:olts?)?\b/gi },
    { kind: 'wattage', label: 'Wattage', regex: /\b\d+(?:\.\d+)?\s*w(?:atts?)?\b/gi },
    { kind: 'amperage', label: 'Amperage', regex: /\b\d+(?:\.\d+)?\s*a(?:mp|amps|ampere|amperes)?\b/gi },
    { kind: 'gauge', label: 'Gauge', regex: /\b(?:swg\s*)?\d+(?:\.\d+)?\s*(?:swg|awg|gauge)\b|\bswg\s*\d+(?:\.\d+)?\b/gi },
    { kind: 'cross_section', label: 'Cross-section', regex: /\b\d+(?:\.\d+)?\s*(?:mm\s*(?:²|2)|sq\.?\s*mm|sqmm)(?=\s|$|[^a-z0-9])/gi },
    { kind: 'diameter', label: 'Diameter', regex: /\b\d+(?:\.\d+)?\s*(?:mm(?!\s*(?:²|2))|cm|inch|in|")\b/gi },
    { kind: 'capacity', label: 'Capacity', regex: /\b\d+(?:\.\d+)?\s*(?:ah|mah|kva|va|uf|mf|l|litre|liter|kg)\b/gi },
    { kind: 'dimension', label: 'Dimension', regex: /\b\d+(?:\.\d+)?\s*[x×]\s*\d+(?:\.\d+)?(?:\s*[x×]\s*\d+(?:\.\d+)?)?\s*(?:mm|cm|m|inch|in)?\b/gi },
    { kind: 'part_number', label: 'Part number', regex: /\b(?:p\/n|pn|part\s*no\.?|part\s*number)\s*[:#-]?\s*[a-z0-9][a-z0-9./_-]*\b/gi },
    { kind: 'model', label: 'Model', regex: /\b(?:model|mdl)\s*[:#-]?\s*[a-z0-9][a-z0-9./_-]*\b/gi },
    { kind: 'rating', label: 'Rating', regex: /\b\d+(?:\.\d+)?\s*(?:bar|psi|hz|rpm|grade)\b|\b(?:15w-40|20w-50|sae\s*\d+[a-z0-9-]*)\b/gi },
    { kind: 'material', label: 'Material', regex: /\b(copper|steel|stainless|brass|pvc|rubber|aluminium|aluminum)\b/gi },
  ] as const
}

export function extractHistoricalReviewSpecs(value: string): HistoricalReviewSpecToken[] {
  const source = String(value || '')
  const tokens = new Map<string, HistoricalReviewSpecToken>()

  for (const pattern of buildSpecificationPatterns()) {
    const matches = source.matchAll(pattern.regex)
    for (const match of matches) {
      const rawValue = String(match[0] || '').trim()
      if (!rawValue) continue
      const normalizedValue = normalizeItemText(rawValue).toUpperCase()
      const key = `${pattern.kind}:${normalizedValue}`
      tokens.set(key, {
        kind: pattern.kind,
        label: pattern.label,
        value: rawValue.toUpperCase(),
      })
    }
  }

  return [...tokens.values()].sort((left, right) => {
    if (left.kind !== right.kind) return left.kind.localeCompare(right.kind)
    return left.value.localeCompare(right.value)
  })
}

function hasOneExactCatalogTarget(normalizedDescription: string, catalogRefs: CandidateRef[]) {
  return catalogRefs.filter(
    (ref) => ref.ref_kind === 'catalog' && ref.normalized_text === normalizedDescription && ref.is_active !== false,
  ).length === 1
}

function hasOneExactAliasTarget(normalizedDescription: string, aliasRefs: CandidateRef[]) {
  const targetIds = new Set(
    aliasRefs
      .filter(
        (ref) =>
          ref.ref_kind === 'alias' &&
          ref.normalized_text === normalizedDescription &&
          ref.is_active !== false &&
          ref.is_retired !== true,
      )
      .map((ref) => ref.item_id)
      .filter(Boolean),
  )
  return targetIds.size === 1
}

export function buildHistoricalReviewCandidateEvidence(
  normalizedDescription: string,
  references: HistoricalReviewCatalogRef[],
): HistoricalReviewCandidate[] {
  const normalized = normalizeItemText(normalizedDescription)
  const caseTokens = tokenizeForTierEvidence(normalized)
  const refs: CandidateRef[] = references
    .map((ref) => ({
      ...ref,
      item_id: String(ref.item_id || ''),
      name: String(ref.name || ''),
      normalized_text: normalizeItemText(ref.normalized_text || ref.name),
      matched_text: String(ref.matched_text || ref.name || ''),
      standard_price: toNumber(ref.standard_price),
      usage_count: toNumber(ref.usage_count),
      last_sold_price: toNumber(ref.last_sold_price),
      last_used_at: ref.last_used_at || null,
      tokens: tokenizeForTierEvidence(ref.normalized_text || ref.name),
    }))
    .filter((ref) => ref.item_id && ref.name && ref.is_active !== false)

  const candidateMap = new Map<string, HistoricalReviewCandidate>()

  refs.forEach((ref) => {
    const exact = ref.normalized_text === normalized
    const near = isNearText(normalized, caseTokens, ref.normalized_text, ref.tokens)
    if (!exact && !near) return

    const shared_terms = getTokenOverlap(caseTokens, ref.tokens)
    const exactAlias = exact && ref.ref_kind === 'alias' && ref.is_retired !== true
    const evidence_type = exact
      ? ref.ref_kind === 'catalog'
        ? 'exact_catalog'
        : 'exact_alias'
      : ref.ref_kind === 'catalog'
        ? 'similar_catalog'
        : 'similar_alias'

    const candidate: HistoricalReviewCandidate = {
      item_id: ref.item_id,
      name: ref.name,
      matched_text: ref.matched_text,
      evidence_type,
      evidence_strength: exact || exactAlias ? 'deterministic' : 'advisory',
      evidence_label:
        evidence_type === 'exact_catalog'
          ? 'Exact catalog name'
          : evidence_type === 'exact_alias'
            ? 'Existing alias'
            : evidence_type === 'similar_alias'
              ? 'Similar alias wording'
              : 'Similar catalog item',
      shared_terms,
      standard_price: ref.standard_price,
      usage_count: ref.usage_count,
      last_sold_price: ref.last_sold_price,
      last_used_at: ref.last_used_at,
      specifications: extractHistoricalReviewSpecs(`${ref.name} ${ref.matched_text}`),
    }

    const existing = candidateMap.get(candidate.item_id)
    if (!existing) {
      candidateMap.set(candidate.item_id, candidate)
      return
    }

    if (existing.evidence_strength === 'advisory' && candidate.evidence_strength === 'deterministic') {
      candidateMap.set(candidate.item_id, candidate)
    }
  })

  return [...candidateMap.values()]
    .sort((left, right) => {
      if (left.evidence_strength !== right.evidence_strength) {
        return left.evidence_strength === 'deterministic' ? -1 : 1
      }
      if (right.shared_terms.length !== left.shared_terms.length) return right.shared_terms.length - left.shared_terms.length
      if (Number(right.usage_count || 0) !== Number(left.usage_count || 0)) {
        return Number(right.usage_count || 0) - Number(left.usage_count || 0)
      }
      return left.name.localeCompare(right.name)
    })
    .slice(0, MAX_CANDIDATES_PER_CASE)
}

function buildCandidateRefs(catalogRefs: HistoricalReviewCatalogRef[]) {
  return catalogRefs.map((ref) => ({
    ...ref,
    ref_kind: ref.ref_kind,
    item_id: String(ref.item_id || ''),
    name: String(ref.name || ''),
    normalized_text: normalizeItemText(ref.normalized_text || ref.name),
    matched_text: String(ref.matched_text || ref.name || ''),
    standard_price: toNumber(ref.standard_price),
    usage_count: toNumber(ref.usage_count),
    last_sold_price: toNumber(ref.last_sold_price),
    last_used_at: ref.last_used_at || null,
    tokens: tokenizeForTierEvidence(ref.normalized_text || ref.name),
  })) as CandidateRef[]
}

function isEligibleStandardUnlinked(row: HistoricalReviewRawOccurrence) {
  return (
    !row.item_id &&
    (row.row_type || 'standard') === 'standard' &&
    Boolean(row.normalized_description)
  )
}

export function buildHistoricalReviewCases(params: {
  tenantSchema: string | null
  occurrences: HistoricalReviewRawOccurrence[]
  catalogRefs: HistoricalReviewCatalogRef[]
  truncated?: boolean
}): HistoricalReviewResult {
  const tenantSchema = params.tenantSchema || 'unknown'
  const catalogRefs = buildCandidateRefs(params.catalogRefs)
  const catalogOnlyRefs = catalogRefs.filter((ref) => ref.ref_kind === 'catalog')
  const aliasOnlyRefs = catalogRefs.filter((ref) => ref.ref_kind === 'alias')
  const excludedTierDCount = params.occurrences.filter(
    (row) => !row.item_id && ((row.row_type || 'standard') !== 'standard' || !row.normalized_description),
  ).length

  const eligibleRows = params.occurrences
    .filter(isEligibleStandardUnlinked)
    .map((row) => ({
      ...row,
      tenant_schema: row.tenant_schema || tenantSchema,
      normalized_description: normalizeItemText(row.normalized_description || row.description),
    }))

  const unresolvedRows = eligibleRows.filter((row) => {
    const normalized = row.normalized_description
    return !hasOneExactCatalogTarget(normalized, catalogOnlyRefs) && !hasOneExactAliasTarget(normalized, aliasOnlyRefs)
  })

  const groupsByDescription = new Map<string, CandidateGroup>()
  unresolvedRows.forEach((row) => {
    const rowTenantSchema = row.tenant_schema || tenantSchema
    const groupKey = stableCaseId(rowTenantSchema, row.normalized_description)
    const existing = groupsByDescription.get(groupKey)
    if (existing) {
      existing.rows.push(row)
      return
    }

    groupsByDescription.set(groupKey, {
      tenant_schema: rowTenantSchema,
      normalized_description: row.normalized_description,
      rows: [row],
      tokens: tokenizeForTierEvidence(row.normalized_description),
      near_catalog: false,
      near_alias: false,
      near_candidate: false,
      is_tier_b: false,
    })
  })

  const groups = [...groupsByDescription.values()]
  groups.forEach((group) => {
    group.near_catalog = catalogRefs.some(
      (ref) => ref.ref_kind === 'catalog' && isNearText(group.normalized_description, group.tokens, ref.normalized_text, ref.tokens),
    )
    group.near_alias = catalogRefs.some(
      (ref) => ref.ref_kind === 'alias' && isNearText(group.normalized_description, group.tokens, ref.normalized_text, ref.tokens),
    )
    group.near_candidate = groups.some(
      (other) =>
        other.normalized_description !== group.normalized_description &&
        isNearText(group.normalized_description, group.tokens, other.normalized_description, other.tokens),
    )
    group.is_tier_b = !group.near_catalog && !group.near_alias && !group.near_candidate
  })

  const cases: HistoricalReviewCase[] = groups
    .filter((group) => !group.is_tier_b)
    .map((group) => {
      const occurrences = group.rows
        .map(toOccurrence)
        .sort((left, right) => dateValue(right.document_date || right.updated_at) - dateValue(left.document_date || left.updated_at))
      const invoiceCount = occurrences.filter((row) => row.source_type === 'invoice').length
      const quotationCount = occurrences.filter((row) => row.source_type === 'quotation').length
      const unitPrices = occurrences.map((row) => row.unit_price).filter((value): value is number => value !== null)
      const usageDates = occurrences.map((row) => getOccurrenceDate(row)).filter((value): value is string => Boolean(value))
      const candidateReasons = [
        group.near_catalog ? 'similar catalog text' : null,
        group.near_alias ? 'similar alias text' : null,
        group.near_candidate ? 'similar unresolved history' : null,
      ].filter((value): value is string => Boolean(value))
      const caseMembershipHash = buildHistoricalReviewCaseMembershipHash(group.rows)
      const invoiceRowIds = occurrences
        .filter((row) => row.source_type === 'invoice')
        .map((row) => row.row_id)
        .sort(compareIdentifiers)
      const quotationRowIds = occurrences
        .filter((row) => row.source_type === 'quotation')
        .map((row) => row.row_id)
        .sort(compareIdentifiers)

      return {
        case_id: `${stableCaseId(group.tenant_schema, group.normalized_description)}::${caseMembershipHash}`,
        case_membership_hash: caseMembershipHash,
        tenant_schema: group.tenant_schema,
        normalized_description: group.normalized_description,
        display_description: getDisplayDescription(group.rows),
        occurrence_count: occurrences.length,
        invoice_count: invoiceCount,
        quotation_count: quotationCount,
        latest_used_at: usageDates.sort((left, right) => dateValue(right) - dateValue(left))[0] || null,
        first_used_at: usageDates.sort((left, right) => dateValue(left) - dateValue(right))[0] || null,
        raw_description_variants: countValues(group.rows.map((row) => row.description)),
        unit_values: countValues(group.rows.map((row) => row.unit)),
        make_values: countValues(group.rows.map((row) => row.make)),
        group_values: countValues(group.rows.map((row) => row.group_name)),
        unit_price_min: unitPrices.length ? Math.min(...unitPrices) : null,
        unit_price_max: unitPrices.length ? Math.max(...unitPrices) : null,
        specifications: extractHistoricalReviewSpecs(group.rows.map((row) => row.description).join(' ')),
        candidate_reason_labels: candidateReasons,
        candidates: buildHistoricalReviewCandidateEvidence(group.normalized_description, params.catalogRefs),
        occurrences,
        invoice_row_ids: invoiceRowIds,
        quotation_row_ids: quotationRowIds,
      }
    })
    .sort((left, right) => {
      if (right.occurrence_count !== left.occurrence_count) return right.occurrence_count - left.occurrence_count
      if (dateValue(right.latest_used_at) !== dateValue(left.latest_used_at)) {
        return dateValue(right.latest_used_at) - dateValue(left.latest_used_at)
      }
      return left.display_description.localeCompare(right.display_description)
    })

  const repeatedCases = cases.filter((entry) => entry.occurrence_count > 1)
  const specificationSensitiveCases = cases.filter((entry) => entry.specifications.length > 0)
  const casesWithCandidates = cases.filter((entry) => entry.candidates.length > 0)
  const invoiceOccurrenceCount = cases.reduce((sum, entry) => sum + entry.invoice_count, 0)
  const quotationOccurrenceCount = cases.reduce((sum, entry) => sum + entry.quotation_count, 0)
  const occurrenceCount = cases.reduce((sum, entry) => sum + entry.occurrence_count, 0)

  return {
    tenant_schema: tenantSchema,
    cases,
    summary: {
      occurrence_count: occurrenceCount,
      case_count: cases.length,
      repeated_case_count: repeatedCases.length,
      singleton_case_count: cases.length - repeatedCases.length,
      repeated_occurrence_count: repeatedCases.reduce((sum, entry) => sum + entry.occurrence_count, 0),
      invoice_occurrence_count: invoiceOccurrenceCount,
      quotation_occurrence_count: quotationOccurrenceCount,
      specification_sensitive_case_count: specificationSensitiveCases.length,
      cases_with_candidates_count: casesWithCandidates.length,
      tier_d_excluded_count: excludedTierDCount,
      tier_b_excluded_count: groups.filter((group) => group.is_tier_b).reduce((sum, group) => sum + group.rows.length, 0),
      truncated: params.truncated === true,
    },
  }
}
