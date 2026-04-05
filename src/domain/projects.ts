type ClientMatchInput = {
  documentClientId?: string | null
  documentClientName?: string | null
  projectClientId?: string | null
  projectClientName?: string | null
}

export type ProjectPrefillState = {
  projectId?: string
  projectCode?: string
  projectName?: string
  clientId?: string
  clientName?: string
  sourceInvoice?: {
    invoiceId?: string
    invoiceNumber?: string
    clientId?: string
    clientName?: string
    poNumber?: string
  }
}

function normalizeValue(value: unknown) {
  return String(value || '').trim()
}

function normalizeText(value: unknown) {
  return normalizeValue(value).toLowerCase()
}

export function isClientMismatch({
  documentClientId,
  documentClientName,
  projectClientId,
  projectClientName,
}: ClientMatchInput) {
  const docClientId = normalizeValue(documentClientId)
  const projectClientIdValue = normalizeValue(projectClientId)

  if (docClientId && projectClientIdValue) {
    return docClientId !== projectClientIdValue
  }

  const docClientName = normalizeText(documentClientName)
  const projectClientNameValue = normalizeText(projectClientName)

  if (docClientName && projectClientNameValue) {
    return docClientName !== projectClientNameValue
  }

  return false
}

export function getClientMismatchMessage({
  documentClientName,
  projectClientName,
}: {
  documentClientName?: string | null
  projectClientName?: string | null
}) {
  const docClient = normalizeValue(documentClientName) || 'this document'
  const projectClient = normalizeValue(projectClientName) || 'the selected project'
  return `Client mismatch: document is for ${docClient} while the selected project belongs to ${projectClient}.`
}

export function getProjectCodePrefix(date = new Date()) {
  return `PRJ-${date.getFullYear()}-`
}

export function extractProjectCodeSequence(code: unknown, prefix: string) {
  const value = normalizeValue(code)
  if (!value.startsWith(prefix)) return 0
  const sequence = Number.parseInt(value.slice(prefix.length), 10)
  return Number.isFinite(sequence) ? sequence : 0
}

type ProjectCodeError = {
  code?: string | null
  message?: string | null
  details?: string | null
  hint?: string | null
}

type CreateProjectPayload = {
  name: string
  client_id?: string | null
  client_name?: string | null
  status: string
  start_date: string
  project_value?: number | null
  po_number?: string | null
  notes?: string | null
  location?: string | null
}

function errorMentionsProjectCode(error: ProjectCodeError | null | undefined) {
  const haystack = [error?.message, error?.details, error?.hint]
    .map((value) => normalizeText(value))
    .filter(Boolean)
    .join(' ')

  return haystack.includes('project_code')
}

export function isProjectCodeConflict(error: ProjectCodeError | null | undefined) {
  return error?.code === '23505' && errorMentionsProjectCode(error)
}

export async function generateNextProjectCode(
  supabaseClient: {
    from: (table: string) => {
      select: (columns: string) => {
        ilike: (column: string, pattern: string) => Promise<{ data?: Array<{ project_code?: string | null }>; error?: { message?: string } | null }>
      }
    }
  },
  date = new Date(),
) {
  const prefix = getProjectCodePrefix(date)
  const { data, error } = await supabaseClient
    .from('projects')
    .select('project_code')
    .ilike('project_code', `${prefix}%`)

  if (error) {
    throw new Error(error.message || 'Could not generate a project code.')
  }

  const nextSequence =
    (data || []).reduce((max, project) => Math.max(max, extractProjectCodeSequence(project.project_code, prefix)), 0) + 1

  return `${prefix}${String(nextSequence).padStart(3, '0')}`
}

export async function createProjectWithGeneratedCode(
  supabaseClient: {
    from: (table: string) => {
      select: (columns: string) => {
        ilike: (column: string, pattern: string) => Promise<{ data?: Array<{ project_code?: string | null }>; error?: ProjectCodeError | null }>
      }
      insert: (payload: Record<string, unknown>) => {
        select: () => {
          single: () => Promise<{ data?: { id: string }; error?: ProjectCodeError | null }>
        }
      }
    }
  },
  payload: CreateProjectPayload,
  maxRetries = 2,
) {
  let lastError: ProjectCodeError | Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const projectCode = await generateNextProjectCode(supabaseClient)
      const result = await supabaseClient
        .from('projects')
        .insert({
          project_code: projectCode,
          ...payload,
        })
        .select()
        .single()

      if (!result.error) {
        return result
      }

      if (!isProjectCodeConflict(result.error)) {
        return result
      }

      lastError = result.error
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Could not create project.')
      break
    }
  }

  return { data: null, error: lastError }
}
