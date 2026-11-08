import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  useEffect(() => {
    // Set per-page metadata for the 404 page
    if (document.title !== 'Page not found - BigDrops ERP') {
      document.title = 'Page not found - BigDrops ERP'
    }

    const descEl = document.querySelector('meta[name="description"]')
    if (!descEl) {
      const newDesc = document.createElement('meta')
      newDesc.setAttribute('name', 'description')
      ;(newDesc as any).setAttribute('content', '')
      document.head.appendChild(newDesc)
    }
    ;(document.querySelector('meta[name="description"]') as HTMLMetaElement).setAttribute(
      'content',
      'The page you are looking for does not exist. Return to the dashboard or explore other sections.'
    )
  }, [])

  return (
    <section
      className="min-h-screen bg-gradient-to-b from-[var(--bg)] to-[var(--bg-secondary)] flex items-center justify-center p-4 px-6"
    >
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="p-6 bg-[var(--card)] rounded-xl border border-[var(--border)]">
          <svg
            className="mx-auto mb-4 text-[var(--accent)] w-16 h-16"
            viewBox="0 0 64 64"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="64" height="64" rx="8" fill="#0f0e17" />
            <path d="M8 8h48v8H8V8zm0 16h48v8H8v-8zm0 16h48v8H8v-8zm0 16h48v8H8v-8z" fill="#bb86fc" />
            <circle cx="32" cy="32" r="20" fill="none" stroke="#7c3aed" stroke-width="2" />
            <text x="32" y="38" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="bold" fill="#fff" text-anchor="middle">
              404
            </text>
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-[var(--text)] tracking-tight mb-2">
          Page not found
        </h1>

        <p className="text-[var(--text-muted)] text-lg leading-relaxed">
          The page you are looking for does not exist or has been removed.
        </p>

        <div className="space-y-3">
          <Link to="/" className="inline-flex items-center justify-center">
            <Button variant="default" className="inline-flex items-center justify-center">
              Return to Dashboard
            </Button>
          </Link>

          <Button variant="secondary" className="inline-flex items-center justify-center">
            Explore BigDrops
          </Button>
        </div>
      </div>
    </section>
  )
}