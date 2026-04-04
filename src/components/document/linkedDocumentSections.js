export function createLinkedDocumentItem({
  key,
  label,
  subtitle,
  onClick,
  disabled = false,
}) {
  return {
    key,
    label,
    subtitle,
    onClick,
    disabled,
  }
}

export function createLinkedDocumentsSection({
  key,
  title,
  description,
  items = [],
}) {
  return {
    key,
    title,
    description,
    items: items.filter(Boolean),
  }
}

export function createLinkedProjectSection({
  project,
  description,
  onOpenProject,
}) {
  return createLinkedDocumentsSection({
    key: 'project',
    title: 'Project',
    description,
    items: project
      ? [
          createLinkedDocumentItem({
            key: `project-${project.id}`,
            label: project.name || project.id,
            subtitle: 'Open linked project',
            onClick: onOpenProject,
          }),
        ]
      : [],
  })
}
