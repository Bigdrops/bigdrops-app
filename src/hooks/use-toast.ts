'use client'

import type * as React from 'react'
import { feedback } from '@/lib/feedback'

export type ToastProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info'
}

export type ToastActionElement = React.ReactElement

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

function toMessage(value: React.ReactNode, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function toast(props: Omit<ToasterToast, 'id'>) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const title = toMessage(props.title, 'Notice')
  const description = props.description
  const options = description ? { description } : undefined

  if (props.variant === 'destructive') {
    feedback.error(title, options)
  } else if (props.variant === 'warning') {
    feedback.warning(title, options)
  } else if (props.variant === 'success') {
    feedback.success(title, options)
  } else {
    feedback.info(title, options)
  }

  return {
    id,
    dismiss: () => feedback.dismiss(id),
    update: (nextProps: ToasterToast) => {
      feedback.dismiss(id)
      return toast(nextProps)
    },
  }
}

function useToast() {
  return {
    toasts: [] as ToasterToast[],
    toast,
    dismiss: (toastId?: string) => feedback.dismiss(toastId),
  }
}

export { useToast, toast }
