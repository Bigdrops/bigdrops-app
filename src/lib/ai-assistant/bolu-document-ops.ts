/**
 * bolu-document-ops.ts — pure deterministic engine for Bolu document operations.
 *
 * Applies the structured operations the assistant is allowed to propose
 * (custom document field entries and document groups) to a clone of the
 * persisted rows. No I/O, no model involvement: the proposal builder
 * (Gate 1 preview) and the modification executor (Gate 2 persistence) call
 * the same functions, so the preview and the saved result cannot drift.
 *
 * Layout rule applied on every run: ungrouped line items keep their original
 * relative order first, then every group emits its header row followed
 * immediately by its member items (members must remain contiguous). Groups
 * keep their first-appearance order unless `reorder-groups` was applied.
 */

import type { BoluFieldEntryOp, BoluGroupOp } from './bolu-operations'

/** Compact normalized shape for a custom document field entry. */
export interface BoluFieldEntry {
  id?: string
  label: string
  value: string
}

const trimmedString = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value).trim()

function toCaseInsensitiveKey(value: unknown): string {
  return trimmedString(value).toLowerCase()
}

/** Normalizes one raw persisted entry, preserving unknown sibling keys. */
export function normalizeFieldEntry(
  raw: Record<string, unknown> | null | undefined,
): { id?: string; label: string; value: string } & Record<string, unknown> {
  const row = raw && typeof raw === 'object' && !Array.isArray(raw) ? { ...raw } : {}
  const id = trimmedString(row.id) || undefined
  const label = trimmedString(row.label)
  const value = trimmedString(row.value)
  return { ...row, id, label, value }
}

export type FieldEntryResolution =
  | { index: number }
  | { errors: string[] }

/** Resolves a match against a list of persisted entries; label matching is trimmed and case-insensitive. */
export function resolveEntryMatch(
  entries: Array<ReturnType<typeof normalizeFieldEntry>>,
  match: { id?: string; label?: string },
  noun: 'details row' | 'chip',
): FieldEntryResolution {
  const id = trimmedString(match.id)
  if (id) {
    const indexes = entries
      .map((entry, index) => (entry.id === id ? index : -1))
      .filter((index) => index >= 0)
    if (indexes.length === 1) return { index: indexes[0] }
    if (indexes.length > 1) {
      return { errors: [`More than one ${noun} carries that reference; I cannot tell them apart.`] }
    }
    return { errors: [`No ${noun} matches that reference.`] }
  }

  const label = trimmedString(match.label).toLowerCase()
  if (label) {
    const indexes = entries
      .map((entry, index) => (entry.label.toLowerCase() === label ? index : -1))
      .filter((index) => index >= 0)
    if (indexes.length === 1) return { index: indexes[0] }
    if (indexes.length === 0) {
      return { errors: [`No ${noun} named "${match.label}" exists on this document.`] }
    }
    return {
      errors: [`More than one ${noun} is named "${match.label}"; please include the value so I can tell them apart.`],
    }
  }

  return { errors: [`Which ${noun} should I change? Give me its label (and value, if more than one shares it).`] }
}

/** Fingerprint of a field family: order-significant id|label|value triples. */
export function fingerprintFieldFamily(
  entries: Array<Record<string, unknown> | null | undefined> | null | undefined,
): string {
  const normalized = (Array.isArray(entries) ? entries : []).map((entry) => {
    const field = normalizeFieldEntry(entry)
    return `${field.id ?? ''}|${field.label.toLowerCase()}|${field.value}`
  })
  return JSON.stringify(normalized)
}

/** Fingerprint of the persisted item set (order-significant; rows and groupMeta are carried). */
export function fingerprintItems(
  rows: Array<Record<string, unknown> | null | undefined> | null | undefined,
  groupMeta: Record<string, { name?: string; showSubtotal?: boolean } | undefined> | null | undefined,
): string {
  const items = (Array.isArray(rows) ? rows : []).map((row) => [
    row?.row_type ?? 'standard',
    trimmedString(row?.description),
    Number(row?.quantity ?? 0),
    Number(row?.unit_price ?? 0),
    trimmedString(row?.unit),
    trimmedString(row?.item_id),
    row?.install_rate == null ? '' : Number(row.install_rate),
    row?.vat_rate == null ? '' : Number(row.vat_rate),
    row?.discount_rate == null ? '' : Number(row.discount_rate),
    row?.install_rate_taxable === true,
    trimmedString(row?.sub_description),
    trimmedString(row?.make),
    trimmedString(row?.group_id),
    trimmedString(row?.group_name),
    trimmedString(row?.image_url),
  ].join('|'))
  const meta = groupMeta ?? {}
  const metaJson = JSON.stringify(meta, Object.keys(meta).sort())
  return JSON.stringify({ items, meta: metaJson })
}

export interface BoluFieldApplication {
  entries: Array<ReturnType<typeof normalizeFieldEntry>>
  summary: string[]
  errors: string[]
}

function makeEntryId(): string {
  return `field_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function makeGroupId(): string {
  return `grp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Applies add/update/remove operations to a normalized field family. Labels
 * must be non-empty, unique within the family after application, and matched
 * case-insensitively.
 */
export function applyFieldOperations(
  persisted: Array<Record<string, unknown> | null | undefined> | null | undefined,
  ops: BoluFieldEntryOp[],
  noun: 'details row' | 'chip',
): BoluFieldApplication {
  const errors: string[] = []
  const summary: string[] = []
  const entries: Array<ReturnType<typeof normalizeFieldEntry>> =
    (Array.isArray(persisted) ? persisted : []).map((entry) => normalizeFieldEntry(entry))

  for (const op of ops) {
    if (op.op === 'add') {
      const label = trimmedString(op.label)
      const value = trimmedString(op.value)
      if (!label || !value) {
        errors.push(`New ${noun} entries need both a label and a value.`)
        continue
      }
      if (entries.some((entry) => entry.label.toLowerCase() === label.toLowerCase())) {
        errors.push(`A ${noun} named "${label}" already exists. Update it instead of adding it twice.`)
        continue
      }
      entries.push({ id: makeEntryId(), label, value })
      summary.push(`Added ${noun} "${label}": ${value}.`)
      continue
    }

    if (op.op === 'update') {
      const resolved = resolveEntryMatch(entries, op.match ?? {}, noun)
      if ('errors' in resolved) {
        errors.push(...resolved.errors)
        continue
      }
      const entry = entries[resolved.index]
      const label = op.set?.label !== undefined ? trimmedString(op.set.label) : entry.label
      const value = op.set?.value !== undefined ? trimmedString(op.set.value) : entry.value
      if (!label || !value) {
        errors.push(`A ${noun} needs both a label and a value.`)
        continue
      }
      if (entries.some((other, index) => index !== resolved.index && other.label.toLowerCase() === label.toLowerCase())) {
        errors.push(`Another ${noun} is already named "${label}".`)
        continue
      }
      const beforeLabel = entry.label
      const beforeValue = entry.value
      entries[resolved.index] = { ...entry, label, value }
      summary.push(`Changed ${noun} "${beforeLabel}"${beforeValue === value ? '' : ` from "${beforeValue}" to "${value}"`}.`)
      continue
    }

    if (op.op === 'remove') {
      const resolved = resolveEntryMatch(entries, op.match ?? {}, noun)
      if ('errors' in resolved) {
        errors.push(...resolved.errors)
        continue
      }
      const [removed] = entries.splice(resolved.index, 1)
      summary.push(`Removed ${noun} "${removed.label}".`)
      continue
    }
  }

  if (errors.length === 0) {
    const seen = new Map<string, number>()
    for (const entry of entries) {
      const key = entry.label.toLowerCase()
      seen.set(key, (seen.get(key) ?? 0) + 1)
    }
    for (const [key, count] of seen) {
      if (count > 1) errors.push(`More than one ${noun} would end up named "${key}". Give them distinct labels.`)
    }
  }

  return { entries, summary, errors }
}

export interface BoluGroupApplication {
  rows: Array<Record<string, any>>
  groupMeta: Record<string, { name: string; showSubtotal: boolean }>
  summary: string[]
  errors: string[]
  /** Per-group shape after application, for the preview. */
  after: Array<{ name: string; members: number; showSubtotal: boolean }>
}

function findGroup(
  rows: Array<Record<string, any>>,
  name: string,
): { index: number; row: Record<string, any>; id: string } | null {
  const key = trimmedString(name).toLowerCase()
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].row_type !== 'group_header') continue
    if (trimmedString(rows[i].group_name ?? rows[i].description).toLowerCase() === key) {
      return { index: i, row: rows[i], id: trimmedString(rows[i].group_id) }
    }
  }
  return null
}

function findMembers(
  rows: Array<Record<string, any>>,
  description: string,
): number[] {
  const key = trimmedString(description).toLowerCase()
  const matches: number[] = []
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].row_type === 'group_header') continue
    if (trimmedString(rows[i].description).toLowerCase() === key) matches.push(i)
  }
  return matches
}

/**
 * Applies group operations to a clone of the persisted rows. Members are
 * located by description and must match exactly one standard row each. After
 * application the rows are re-sequenced: ungrouped line items first in
 * their original relative order, then every group block in the resolved
 * group order, then sort_order is rewritten 0..n-1.
 */
export function applyGroupOperations(
  persistedRows: Array<Record<string, any>>,
  persistedGroupMeta: Record<string, { name: string; showSubtotal: boolean }> | null | undefined,
  ops: BoluGroupOp[],
): BoluGroupApplication {
  const errors: string[] = []
  const summary: string[] = []
  const rows = persistedRows.map((row) => ({ ...row }))
  const groupMeta: Record<string, { name: string; showSubtotal: boolean }> = {}

  for (const [id, meta] of Object.entries(persistedGroupMeta ?? {})) {
    const name = trimmedString(meta?.name)
    if (!name) continue
    groupMeta[id] = { name, showSubtotal: meta?.showSubtotal === true }
  }

  // Group order: default = first appearance; `reorder-groups` overrides it.
  const groupOrder: string[] = []
  const noteGroup = (id: string) => {
    if (id && !groupOrder.includes(id)) groupOrder.push(id)
  }
  for (const row of rows) {
    if (row.row_type === 'group_header') noteGroup(trimmedString(row.group_id))
  }

  for (const op of ops) {
    if (op.op === 'create-group') {
      const name = trimmedString(op.name)
      if (!name) {
        errors.push('Name the group first.')
        continue
      }
      if (name.length > 60) {
        errors.push('Group names must be 60 characters or fewer.')
        continue
      }
      if (findGroup(rows, name)) {
        errors.push(`A group named "${name}" already exists.`)
        continue
      }
      const groupId = makeGroupId()
      rows.push({
        row_type: 'group_header',
        description: name,
        group_id: groupId,
        group_name: name,
        quantity: 0,
        unit_price: 0,
        unit: null,
        install_rate: null,
        vat_rate: null,
        discount_rate: null,
        item_id: null,
        image_url: null,
      })
      groupMeta[groupId] = { name, showSubtotal: op.showSubtotal === true }
      groupOrder.push(groupId)
      summary.push(`Created group "${name}"${op.showSubtotal ? ' with a subtotal row' : ''}.`)
      continue
    }

    if (op.op === 'rename-group') {
      const match = findGroup(rows, op.group)
      if (!match) {
        errors.push(`No group is named "${op.group}".`)
        continue
      }
      const id = match.id
      const nextName = op.set?.name !== undefined ? trimmedString(op.set.name) : trimmedString(match.row.group_name)
      if (!nextName) {
        errors.push('The group name cannot be blank.')
        continue
      }
      if (nextName.toLowerCase() !== trimmedString(match.row.group_name).toLowerCase() && findGroup(rows, nextName)) {
        errors.push(`A group named "${nextName}" already exists.`)
        continue
      }
      match.row.group_name = nextName
      match.row.description = nextName
      for (const row of rows) {
        if (row.row_type !== 'group_header' && row.group_id === id) {
          row.group_name = nextName
        }
      }
      groupMeta[id] = {
        name: nextName,
        showSubtotal: op.set?.showSubtotal !== undefined
          ? op.set.showSubtotal === true
          : groupMeta[id]?.showSubtotal === true,
      }
      summary.push(`Renamed group "${match.row.group_name}" to "${nextName}".`)
      continue
    }

    if (op.op === 'set-subtotal') {
      const match = findGroup(rows, op.group)
      if (!match) {
        errors.push(`No group is named "${op.group}".`)
        continue
      }
      const id = match.id
      const current = groupMeta[id] ?? { name: trimmedString(match.row.group_name), showSubtotal: false }
      groupMeta[id] = { ...current, showSubtotal: op.showSubtotal === true }
      summary.push(op.showSubtotal
        ? `The "${current.name}" group will show a subtotal.`
        : `The "${current.name}" group will not show a subtotal.`)
      continue
    }

    if (op.op === 'add-items') {
      const targetName = op.group === null ? null : trimmedString(op.group)
      let targetId: string | null = null
      let targetLabel = 'ungrouped'
      if (targetName !== null) {
        const match = findGroup(rows, targetName)
        if (!match) {
          errors.push(`No group is named "${targetName}". Create it first, or check the name.`)
          continue
        }
        targetId = match.id
        targetLabel = targetName
      }
      for (const description of op.items) {
        const matches = findMembers(rows, description)
        if (matches.length === 0) {
          errors.push(`No line item matches "${description}".`)
          continue
        }
        if (matches.length > 1) {
          errors.push(`More than one line item matches "${description}"; I cannot tell which ones to assign.`)
          continue
        }
        const row = rows[matches[0]]
        const from = trimmedString(row.group_id)
        row.group_id = targetId
        row.group_name = targetId === null ? null : targetName
        summary.push(targetId === null
          ? `Removed "${row.description}" from its group.`
          : from && from !== targetId
            ? `Moved "${row.description}" into "${targetLabel}".`
            : `Added "${row.description}" to "${targetLabel}".`)
      }
      continue
    }

    if (op.op === 'remove-group') {
      const match = findGroup(rows, op.group)
      if (!match) {
        errors.push(`No group is named "${op.group}".`)
        continue
      }
      const id = match.id
      const memberIdxs = rows
        .map((row, index) => ({ row, index }))
        .filter(({ row }) => row.row_type !== 'group_header' && row.group_id === id)
        .map(({ index }) => index)
      if (op.disposition === 'delete-items') {
        for (const memberIdx of [...memberIdxs].sort((a, b) => b - a)) {
          rows.splice(memberIdx, 1)
        }
        const adjustedHeader = rows.indexOf(match.row)
        rows.splice(adjustedHeader, 1)
        delete groupMeta[id]
        summary.push(`Removed group "${match.row.group_name}" and its ${memberIdxs.length} item${memberIdxs.length === 1 ? '' : 's'}.`)
        continue
      }
      for (const memberIdx of memberIdxs) {
        rows[memberIdx].group_id = null
        rows[memberIdx].group_name = null
      }
      rows.splice(match.index, 1)
      delete groupMeta[id]
      summary.push(`Removed group "${match.row.group_name}"; its ${memberIdxs.length} item${memberIdxs.length === 1 ? '' : 's'} are now ungrouped.`)
      continue
    }

    if (op.op === 'reorder-groups') {
      const headerIds = rows
        .filter((row) => row.row_type === 'group_header')
        .map((row) => trimmedString(row.group_id))
      const idByName = new Map<string, string>()
      for (const row of rows) {
        if (row.row_type !== 'group_header') continue
        idByName.set(trimmedString(row.group_name ?? row.description).toLowerCase(), trimmedString(row.group_id))
      }
      const requested = op.order.map((name) => trimmedString(name).toLowerCase())
      if (new Set(requested).size !== requested.length) {
        errors.push('That reorder repeats a group name.')
        continue
      }
      if (requested.length !== headerIds.length) {
        errors.push('A reorder must list every group on the document, each exactly once.')
        continue
      }
      const resolved: string[] = []
      let ok = true
      for (const name of requested) {
        const id = idByName.get(name)
        if (!id) {
          errors.push(`No group is named "${name}".`)
          ok = false
        } else {
          resolved.push(id)
        }
      }
      if (!ok) continue
      groupOrder.length = 0
      groupOrder.push(...resolved)
      summary.push(`Reordered ${resolved.length} groups.`)
      continue
    }
  }

  const after = rows
    .filter((row) => row.row_type === 'group_header')
    .map((row) => {
      const id = trimmedString(row.group_id)
      return {
        name: trimmedString(row.group_name),
        members: rows.filter((candidate) => candidate.row_type !== 'group_header' && candidate.group_id === id).length,
        showSubtotal: groupMeta[id]?.showSubtotal === true,
      }
    })

  if (errors.length > 0) {
    return { rows, groupMeta, summary, errors, after }
  }

  // Deterministic emission: ungrouped rows in original relative order first,
  // then every group block in the resolved group order.
  const blocks = new Map<string, Array<Record<string, any>>>()
  const headerRows = new Map<string, Record<string, any>>()
  for (const row of rows) {
    if (row.row_type === 'group_header') {
      const id = trimmedString(row.group_id)
      headerRows.set(id, row)
      if (!blocks.has(id)) blocks.set(id, [])
      continue
    }
    const id = trimmedString(row.group_id)
    if (!id) continue
    if (!blocks.has(id)) blocks.set(id, [])
    blocks.get(id)!.push(row)
  }

  const output: Array<Record<string, any>> = []
  for (const row of rows) {
    if (row.row_type === 'group_header') continue
    if (trimmedString(row.group_id)) continue
    output.push(row)
  }
  for (const id of groupOrder) {
    const header = headerRows.get(id)
    if (header) output.push(header)
    output.push(...(blocks.get(id) ?? []))
  }

  for (let i = 0; i < output.length; i++) {
    output[i].sort_order = i
  }

  return { rows: output, groupMeta, summary, errors: [], after }
}
