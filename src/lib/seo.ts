/** 
 * SEO & Metadata utilities for BigDrops ERP 
 * 
 * Usage in page components:
 * import { usePageMetadata } from '@/lib/seo'
 * 
 * const metadata = usePageMetadata({
 *   title: 'Clients',
 *   description: 'Manage your business clients and contacts',
 *   ogImage: '/og-image-clients.png',
 * })
 * 
 * // In a useEffect or similar:
 * metadata.apply()
 */
import * as React from 'react'

export interface SeoMetadata {
  title?: string
  description?: string
  /** Open Graph image URL */
  ogImage?: string
  /** Twitter card image URL */
  twitterImage?: string
  /** Custom favicon override */
  favicon?: string
}

/** 
 * Hook to manage per-page SEO metadata. 
 * Applies metadata to the document head when called. 
 */
export function usePageMetadata(metadata: SeoMetadata): {
  apply: () => void
  reset: () => void
} {
  React.useEffect(() => {
    return applyMetadata(metadata)
  }, [metadata])

  return {
    apply: () => applyMetadata(metadata),
    reset: () => resetMetadata(),
  }
}

/** 
 * Apply metadata to the document head. 
 * Sets title, meta description, and Open Graph tags. 
 */
function applyMetadata(metadata: SeoMetadata): void {
  // Set page title
  if (metadata.title) {
    document.title = `${metadata.title} - BigDrops ERP`
  }

  // Set meta description
  if (metadata.description) {
    // Remove any existing custom descriptions added by this utility
    const descEls = document.querySelectorAll('meta[name="description"]')
    descEls.forEach(el => {
      if ((el.getAttribute('content') ?? '').includes('BigDrops')) {
        el.remove()
      }
    })
    const descEl = document.createElement('meta')
    descEl.setAttribute('name', 'description')
    ;(descEl as any).setAttribute('content', metadata.description)
    document.head.appendChild(descEl)
  }

  // Set Open Graph image
  if (metadata.ogImage) {
    // Remove any existing custom og:image added by this utility
    const existingOg = document.querySelector('meta[property="og:image"]')
    if (existingOg) {
      if ((existingOg.getAttribute('content') ?? '').includes('BigDrops')) {
        existingOg.remove()
      }
    }
    const ogImage = document.createElement('meta')
    ogImage.setAttribute('property', 'og:image')
    ;(ogImage as any).setAttribute('content', metadata.ogImage)
    document.head.appendChild(ogImage)
  }

  // Set Twitter image
  if (metadata.twitterImage) {
    // Remove any existing custom twitter:image added by this utility
    const existingTwitter = document.querySelector('meta[name="twitter:image"]')
    if (existingTwitter) {
      if ((existingTwitter.getAttribute('content') ?? '').includes('BigDrops')) {
        existingTwitter.remove()
      }
    }
    const twitterImage = document.createElement('meta')
    twitterImage.setAttribute('name', 'twitter:image')
    ;(twitterImage as any).setAttribute('content', metadata.twitterImage)
    document.head.appendChild(twitterImage)
  }
}

/** 
 * Remove previously applied metadata (reset to defaults). 
 */
function resetMetadata(): void {
  // Reset title to app default
  document.title = 'BigDrops ERP'

  // Remove all meta description elements added by this utility
  const descEls = document.querySelectorAll('meta[name="description"]')
  descEls.forEach(el => {
    if ((el.getAttribute('content') ?? '').includes('BigDrops')) {
      el.remove()
    }
  })

  // Remove all og:image elements added by this utility
  const ogImgs = document.querySelectorAll('meta[property="og:image"]')
  ogImgs.forEach(el => {
    if ((el.getAttribute('content') ?? '').includes('BigDrops')) {
      el.remove()
    }
  })

  // Remove all twitter:image elements added by this utility
  const twitterImgs = document.querySelectorAll('meta[name="twitter-image"]')
  twitterImgs.forEach(el => {
    if ((el.getAttribute('content') ?? '').includes('BigDrops')) {
      el.remove()
    }
  })
}

export default usePageMetadata