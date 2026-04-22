import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createClient } from '@supabase/supabase-js'

import {
  type FailedClientRow,
  type ClientTableField,
  type InsertedClientRow,
  CLIENT_TABLE_FIELDS,
  normalizeClientName,
  sanitizeClientRow,
} from './shared.ts'

type SupabaseClientRow = InsertedClientRow

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..', '..')
const inputPath = path.join(projectRoot, 'docs', 'clients.cleaned.final.json')
const outputPath = path.join(projectRoot, 'docs', 'client-map.json')

function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

async function readInputRows() {
  const raw = await readFile(inputPath, 'utf8')
  const parsed = JSON.parse(raw) as unknown

  if (!Array.isArray(parsed)) {
    throw new Error('Expected clients.cleaned.final.json to contain an array')
  }

  return parsed
}

function pickInsertableColumns(
  row: Record<string, string | null>,
  activeColumns: ReadonlySet<ClientTableField>,
) {
  const payload: Record<string, string | null> = {}

  for (const field of CLIENT_TABLE_FIELDS) {
    if (activeColumns.has(field)) {
      payload[field] = row[field]
    }
  }

  return payload
}

function getMissingColumnName(message: string): ClientTableField | null {
  const match = message.match(/Could not find the '([^']+)' column/i)
  if (!match) return null

  const field = match[1] as ClientTableField
  return CLIENT_TABLE_FIELDS.includes(field) ? field : null
}

function getNullConstraintColumnName(message: string): ClientTableField | null {
  const match = message.match(/null value in column "([^"]+)"/i)
  if (!match) return null

  const field = match[1] as ClientTableField
  return CLIENT_TABLE_FIELDS.includes(field) ? field : null
}

async function main() {
  const supabaseUrl = requireEnv('SUPABASE_URL')
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  const rows = await readInputRows()

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const insertedIds: string[] = []
  const failedRows: FailedClientRow[] = []
  const activeColumns = new Set<ClientTableField>(CLIENT_TABLE_FIELDS)
  const skippedColumns: ClientTableField[] = []

  for (const [index, rawRow] of rows.entries()) {
    const row = sanitizeClientRow((rawRow ?? {}) as Record<string, unknown>)

    if (!row.name) {
      failedRows.push({
        index,
        name: null,
        reason: 'Missing required client name after sanitization',
      })
      continue
    }

    const { data: existingClient, error: existingClientError } = await supabase
      .from('clients')
      .select('id, name')
      .eq('name', row.name)
      .maybeSingle<SupabaseClientRow>()

    if (existingClientError) {
      failedRows.push({
        index,
        name: row.name,
        reason: existingClientError.message,
      })
      continue
    }

    if (existingClient?.id) {
      insertedIds.push(existingClient.id)
      continue
    }

    let payload = pickInsertableColumns(row, activeColumns)
    let { data, error } = await supabase
      .from('clients')
      .insert([payload])
      .select('id, name')
      .single<SupabaseClientRow>()

    const missingColumn = getMissingColumnName(error?.message || '')
    if (missingColumn && activeColumns.has(missingColumn)) {
      activeColumns.delete(missingColumn)
      skippedColumns.push(missingColumn)
      payload = pickInsertableColumns(row, activeColumns)
      ;({ data, error } = await supabase
        .from('clients')
        .insert([payload])
        .select('id, name')
        .single<SupabaseClientRow>())
    }

    const nullConstraintColumn = getNullConstraintColumnName(error?.message || '')
    if (nullConstraintColumn && payload[nullConstraintColumn] == null) {
      payload = {
        ...payload,
        [nullConstraintColumn]: '',
      }
      ;({ data, error } = await supabase
        .from('clients')
        .insert([payload])
        .select('id, name')
        .single<SupabaseClientRow>())
    }

    if (error || !data?.id) {
      failedRows.push({
        index,
        name: row.name,
        reason: error?.message || 'Insert succeeded without returning an id',
      })
      continue
    }

    insertedIds.push(data.id)
  }

  let insertedClients: InsertedClientRow[] = []

  if (insertedIds.length > 0) {
    const { data, error } = await supabase
      .from('clients')
      .select('id, name')
      .in('id', insertedIds)
      .order('name', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch inserted clients: ${error.message}`)
    }

    insertedClients = (data || []) as InsertedClientRow[]
  }

  const clientMap = Object.fromEntries(
    insertedClients
      .filter((client) => typeof client.name === 'string' && client.name.trim().length > 0)
      .map((client) => [normalizeClientName(String(client.name)), client.id]),
  )

  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(clientMap, null, 2)}\n`, 'utf8')

  console.log(
    JSON.stringify(
      {
        totalInputRows: rows.length,
        totalClientsInserted: insertedIds.length,
        failedRows,
        skippedColumns,
        clientMapCreated: true,
        clientMapPath: outputPath,
      },
      null,
      2,
    ),
  )
}

await main()
