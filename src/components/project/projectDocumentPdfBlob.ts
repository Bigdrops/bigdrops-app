import type { ProjectDocumentRecord } from '@/domain/projectDocuments'

/**
 * Shared Forme render path for Project Document exports (card and detail page).
 * Both call sites render through the same document from the same prepared record.
 */
export async function renderProjectDocumentPdfBlob(
  document: ProjectDocumentRecord,
  opts: { projectName?: string; settings?: Record<string, unknown> | null } = {},
): Promise<Blob> {
  const [{ ProjectDocumentFormeDocument }, { renderPdfcnToBlob }] = await Promise.all([
    import('@/components/pdf/forme/ProjectDocumentFormeDocument'),
    import('@/components/pdf/pdfcn/adapter'),
  ])
  const { createElement } = await import('react')
  return renderPdfcnToBlob(
    createElement(ProjectDocumentFormeDocument, {
      document,
      projectName: opts.projectName,
      settings: opts.settings ?? null,
    }),
  )
}
