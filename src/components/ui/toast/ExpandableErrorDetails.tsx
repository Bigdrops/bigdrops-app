import { useState } from 'react'

interface ExpandableErrorDetailsProps {
  diagnostic: string
  registryId: string
}

export function ExpandableErrorDetails({ diagnostic, registryId }: ExpandableErrorDetailsProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bd-error-details">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="bd-error-details-toggle"
        aria-expanded={expanded}
      >
        {expanded ? 'Hide details' : 'View details'}
      </button>
      {expanded && (
        <pre className="bd-error-details-diagnostic">
          {diagnostic}
          {'\n\n'}Registry ID: {registryId}
        </pre>
      )}
    </div>
  )
}
