import type { ReactNode } from 'react'
import { errorRegistry } from './errorRegistry'
import { normalizeError } from './errorMessages'
import { toastStore, type ToastAction, type ToastTone } from './toastStore'
import { uiSound } from './uiSoundEvent'

export type FeedbackTone = ToastTone

export interface FeedbackOptions {
  id?: string
  duration?: number
  description?: ReactNode
  action?: ToastAction
  icon?: ReactNode
  classNames?: Record<string, string>
  [key: string]: unknown
}

export type FeedbackPromiseMessages<T> = {
  loading: string
  success: string | ((data: T) => string)
  error: string | ((error: unknown) => string)
  description?: {
    loading?: ReactNode
    success?: ReactNode | ((data: T) => ReactNode)
    error?: ReactNode | ((error: unknown) => ReactNode)
  }
  action?: {
    success?: ToastAction
    error?: ToastAction
  }
  classNames?: Record<string, string>
}

function toToastId(prefix: string, message: string) {
  const slug = message.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return `${prefix}-${slug || 'message'}`
}

export const feedback = {
  success(message: string, options?: FeedbackOptions): string {
    uiSound('notification.success')
    return toastStore.add({
      id: options?.id || toToastId('success', message),
      tone: 'success',
      title: message,
      description: options?.description,
      duration: options?.duration ?? 2600,
      action: options?.action,
      icon: options?.icon,
    })
  },

  error(message: string | Error, options?: FeedbackOptions): string {
    uiSound('notification.error')
    const normalized = normalizeError(message)
    const registryId = errorRegistry.add(normalized.userSafe, normalized.diagnostic)

    const defaultAction: ToastAction | undefined = normalized.diagnostic
      ? {
          label: 'Logs',
          onClick: () => {
            if (typeof window !== 'undefined') {
              window.location.href = '/settings?section=system-logs'
            }
          },
        }
      : undefined

    return toastStore.add({
      id: options?.id || toToastId('error', `${normalized.userSafe}-${registryId}`),
      tone: 'error',
      title: normalized.userSafe,
      description: options?.description,
      duration: options?.duration ?? 5500,
      action: options?.action ?? defaultAction,
      icon: options?.icon,
    })
  },

  info(message: string, options?: FeedbackOptions): string {
    uiSound('notification.info')
    return toastStore.add({
      id: options?.id || toToastId('info', message),
      tone: 'info',
      title: message,
      description: options?.description,
      duration: options?.duration ?? 3200,
      action: options?.action,
      icon: options?.icon,
    })
  },

  warning(message: string, options?: FeedbackOptions): string {
    uiSound('notification.warning')
    return toastStore.add({
      id: options?.id || toToastId('warning', message),
      tone: 'warning',
      title: message,
      description: options?.description,
      duration: options?.duration ?? 4500,
      action: options?.action,
      icon: options?.icon,
    })
  },

  loading(message: string, options?: FeedbackOptions): string {
    return toastStore.add({
      id: options?.id || toToastId('loading', message),
      tone: 'loading',
      title: message,
      description: options?.description,
      duration: Number.POSITIVE_INFINITY,
      action: options?.action,
      icon: options?.icon,
    })
  },

  promise<T>(promise: Promise<T>, messages: FeedbackPromiseMessages<T>): Promise<T> {
    const loadingId = toToastId('promise', messages.loading)
    const loadingDescription = messages.description?.loading

    toastStore.add({
      id: loadingId,
      tone: 'loading',
      title: messages.loading,
      description: loadingDescription,
      duration: Number.POSITIVE_INFINITY,
    })

    return promise
      .then((data) => {
        const successTitle =
          typeof messages.success === 'function'
            ? messages.success(data)
            : messages.success
        const successDescription =
          typeof messages.description?.success === 'function'
            ? messages.description.success(data)
            : messages.description?.success

        uiSound('notification.success')
        toastStore.add({
          id: loadingId,
          tone: 'success',
          title: successTitle,
          description: successDescription,
          duration: 2600,
          action: messages.action?.success,
        })

        return data
      })
      .catch((error) => {
        const errorTitle =
          typeof messages.error === 'function'
            ? messages.error(error)
            : messages.error
        const errorDescription =
          typeof messages.description?.error === 'function'
            ? messages.description.error(error)
            : messages.description?.error

        const normalized = normalizeError(error)
        errorRegistry.add(errorTitle || normalized.userSafe, normalized.diagnostic)
        uiSound('notification.error')

        toastStore.add({
          id: loadingId,
          tone: 'error',
          title: errorTitle,
          description: errorDescription,
          duration: 5500,
          action: messages.action?.error ?? {
            label: 'Logs',
            onClick: () => {
              if (typeof window !== 'undefined') {
                window.location.href = '/settings?section=system-logs'
              }
            },
          },
        })

        throw error
      })
  },

  dismiss(id?: string | number) {
    toastStore.dismiss(id)
  },
}

export type { FeedbackOptions as ToastOptions }
