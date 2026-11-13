import { useEffect, useState } from 'react'
import './CsrFormePreview.css'

type CsrFormePreviewProps = {
  render: () => Promise<Blob>
}

/**
 * In-app CSR preview rendered through the same Forme engine used for the
 * download and share paths, so the preview can never drift from the PDF.
 */
export default function CsrFormePreview({ render }: CsrFormePreviewProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    let objectUrl: string | null = null

    setLoading(true)
    setError(null)

    render()
      .then((blob) => {
        if (!alive) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
        setLoading(false)
      })
      .catch((err) => {
        if (!alive) return
        setError(err instanceof Error ? err.message : 'Failed to render the CSR preview.')
        setUrl(null)
        setLoading(false)
      })

    return () => {
      alive = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [render])

  if (error) {
    return (
      <div className="csrFormePreview">
        <div className="csrFormePreview__message">{error}</div>
      </div>
    )
  }

  return (
    <div className="csrFormePreview">
      {loading ? <div className="csrFormePreview__message">Generating preview…</div> : null}
      {url ? (
        <iframe
          className="csrFormePreview__frame"
          src={url}
          title="CSR PDF preview"
          aria-label="CSR PDF preview"
        />
      ) : null}
    </div>
  )
}
