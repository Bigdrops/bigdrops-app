import type { ReactNode } from 'react'

export type ToastTone = 'default' | 'success' | 'error' | 'warning' | 'info' | 'loading'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastItem {
  id: string
  title: string
  description?: ReactNode
  tone: ToastTone
  duration: number
  createdAt: number
  action?: ToastAction
  icon?: ReactNode
}

type Listener = (toasts: ToastItem[]) => void

let toasts: ToastItem[] = []
const listeners = new Set<Listener>()

function emit() {
  const current = [...toasts]
  listeners.forEach((fn) => fn(current))
}

export const toastStore = {
  add(input: Omit<ToastItem, 'id' | 'createdAt'> & { id?: string }): string {
    const id = input.id || `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const existingIndex = toasts.findIndex((t) => t.id === id)
    const item: ToastItem = {
      ...input,
      id,
      createdAt: Date.now(),
    }

    if (existingIndex >= 0) {
      toasts[existingIndex] = item
    } else {
      toasts.unshift(item)
    }

    if (toasts.length > 6) {
      toasts = toasts.slice(0, 6)
    }

    emit()
    return id
  },

  dismiss(id?: string | number): void {
    if (id !== undefined) {
      const idStr = String(id)
      toasts = toasts.filter((t) => t.id !== idStr)
    } else {
      toasts = toasts.slice(1)
    }
    emit()
  },

  clear(): void {
    toasts = []
    emit()
  },

  getState(): ToastItem[] {
    return [...toasts]
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    listener([...toasts])
    return () => {
      listeners.delete(listener)
    }
  },
}
