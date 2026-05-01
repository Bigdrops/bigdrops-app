'use client'

import { useTheme } from 'next-themes'
import { GoeyToaster } from 'goey-toast'

export function Toaster() {
  const { theme = 'system' } = useTheme()

  return (
    <GoeyToaster
      position="top-center"
      theme={theme === 'dark' ? 'dark' : 'light'}
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
