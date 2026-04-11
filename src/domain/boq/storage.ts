import type { Boq } from './types'
import { createEmptyBoq } from './factories'

const STORAGE_KEY = 'boq_documents_v1'

function readAll(): Boq[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(rows: Boq[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
}

export function listBoqs(): Boq[] {
  return readAll().sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')))
}

export function getBoqById(id: string): Boq | null {
  return readAll().find((boq) => boq.id === id) || null
}

export function getNextBoqNumber(): string {
  const maxNumber = readAll()
    .map((boq) => String(boq.boq_number || '').trim().toUpperCase())
    .filter((value) => value.startsWith('BOQ-'))
    .map((value) => {
      const match = value.match(/-(\d+)$/)
      return match ? Number(match[1]) : null
    })
    .filter((value): value is number => Number.isFinite(value))
    .reduce((max, value) => Math.max(max, value), 0)

  return `BOQ-${String(maxNumber + 1).padStart(3, '0')}`
}

export function saveBoq(boq: Boq): Boq {
  const rows = readAll()
  const exists = rows.some((entry) => entry.id === boq.id)
  const nextBoq = {
    ...boq,
    boq_number: boq.boq_number || getNextBoqNumber(),
    updated_at: new Date().toISOString(),
    created_at: boq.created_at || new Date().toISOString(),
  }

  writeAll(exists ? rows.map((entry) => entry.id === boq.id ? nextBoq : entry) : [nextBoq, ...rows])
  return nextBoq
}

export function deleteBoq(id: string) {
  writeAll(readAll().filter((entry) => entry.id !== id))
}

export function ensureBoqSeed(): Boq[] {
  const existing = readAll()
  if (existing.length > 0) return existing

  const seed = createEmptyBoq()
  saveBoq({ ...seed, boq_number: getNextBoqNumber(), vendor_name: 'Sample Project', notes: 'Local BOQ storage for first implementation pass.' })
  return listBoqs()
}
