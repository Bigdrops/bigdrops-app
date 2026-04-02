export function getProjectActionState({ projectId, project }) {
  const hasResolvedProject = Boolean(project?.id)
  const hasProject = hasResolvedProject || Boolean(projectId)
  const label = hasProject ? 'View Project' : 'Link to Project'

  return {
    hasProject,
    hasResolvedProject,
    label,
  }
}

export function getDocumentActionState({ sourceDocument, relatedDocuments }) {
  const safeRelated = Array.isArray(relatedDocuments) ? relatedDocuments : []
  const hasResolvedSource = Boolean(sourceDocument?.id)
  const hasResolvedRelated = safeRelated.some((doc) => Boolean(doc?.id))
  const hasResolvedLinkedDocuments = hasResolvedSource || hasResolvedRelated
  const hasAnyLinkedDocuments = Boolean(sourceDocument) || safeRelated.length > 0
  const label = hasResolvedLinkedDocuments ? 'Linked Documents' : 'Link Documents'

  return {
    hasLinkedDocuments: hasResolvedLinkedDocuments,
    hasAnyLinkedDocuments,
    label,
  }
}
