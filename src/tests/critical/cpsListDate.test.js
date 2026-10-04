import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// The CPS list previously rendered the document status twice: once as the
// tertiary metadata line and once as the status badge. The metadata line
// must show the canonical persisted issue_date instead, formatted with the
// shared project formatter used by the Invoice list.
const adaptersSource = readFileSync(
  new URL('../../config/moduleAdapters.ts', import.meta.url),
  'utf8',
)
const listSource = readFileSync(
  new URL('../../components/cps/CpsList.tsx', import.meta.url),
  'utf8',
)

test('CPS list query projects the persisted issue_date', () => {
  const select = adaptersSource.match(/\.from\("cps_sheets"\)\s*\.select\("([^"]+)"\)/)
  assert.ok(select, 'cps_sheets select projection not found')
  const fields = select[1].split(',').map((field) => field.trim())
  assert.ok(
    fields.includes('issue_date'),
    `cps_sheets projection must include issue_date, got: ${select[1]}`,
  )
})

test('CPS list card renders issue_date in the metadata position, not status', () => {
  const tertiary = listSource.match(/tertiary=\{([^}]+)\}/)
  assert.ok(tertiary, 'ModuleRowCard tertiary mapping not found')
  assert.ok(
    tertiary[1].includes('issue_date'),
    `tertiary line must render issue_date, got: ${tertiary[1].trim()}`,
  )
  assert.ok(
    !tertiary[1].includes('status'),
    `tertiary line must not render status, got: ${tertiary[1].trim()}`,
  )
})

test('CPS list keeps an independent status badge', () => {
  assert.ok(
    /statusLabel=\{cps\.status/.test(listSource),
    'status badge must remain driven by cps.status',
  )
})

test('CPS list cache key versions the issue_date projection', () => {
  assert.ok(
    listSource.includes('bd:list:cps_sheets:v2:all'),
    'CpsList cache key must match the v2 projection',
  )
  assert.ok(
    adaptersSource.includes('bd:list:cps_sheets:v2:all'),
    'adapter cache key must match the v2 projection',
  )
})
