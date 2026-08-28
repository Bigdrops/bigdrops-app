'use client'

import { useState, useEffect } from 'react'
import { GoeyToaster } from 'goey-toast'

export function Toaster() {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  )

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    return () => observer.disconnect()
  }, [])

  return (
    <GoeyToaster
      position="top-center"
      theme={isDark ? 'dark' : 'light'}
      offset="24px"
      gap={12}
      closeButton="top-right"
      visibleToasts={3}
      maxQueue={6}
      queueOverflow="drop-oldest"
      showProgress={false}
      preset="smooth"
      bounce={0.22}
      toastOptions={{
        classNames: {
          toast: 'bd-goey-toast-host',
        },
      }}
    />
  )
}
