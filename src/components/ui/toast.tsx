'use client'

import type * as React from 'react'

export type ToastProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info'
}

export type ToastActionElement = React.ReactElement

type ToastComponentProps = React.HTMLAttributes<HTMLDivElement>

const DeprecatedToastPrimitive = ({ children, ...props }: ToastComponentProps) => (
  <div {...props}>{children}</div>
)

// Deprecated compatibility exports. Toast UI now renders exclusively through
// the shared goey toaster and feedback API.
const ToastProvider = ({ children }: { children?: React.ReactNode }) => <>{children}</>
const ToastViewport = DeprecatedToastPrimitive
const Toast = DeprecatedToastPrimitive
const ToastTitle = DeprecatedToastPrimitive
const ToastDescription = DeprecatedToastPrimitive
const ToastClose = DeprecatedToastPrimitive
const ToastAction = DeprecatedToastPrimitive

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
