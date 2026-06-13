import { goeyToast, type GoeyPromiseData, type GoeyToastOptions } from 'goey-toast'
import { LoaderCircle } from 'lucide-react'
import { createElement, type ReactNode } from 'react'

type FeedbackTone = 'default' | 'success' | 'error' | 'warning' | 'info'

type FeedbackOptions = Omit<GoeyToastOptions, 'fillColor' | 'borderColor'>

type FeedbackPromiseMessages<T> = GoeyPromiseData<T>

const baseClassNames = {
  wrapper: 'bd-goey-toast max-w-[85vw]',
  content: 'bd-goey-toast__content break-words',
  header: 'bd-goey-toast__header',
  title: 'bd-goey-toast__title break-words',
  icon: 'bd-goey-toast__icon',
  description: 'bd-goey-toast__description break-words',
  actionWrapper: 'bd-goey-toast__action-wrapper',
  actionButton: 'bd-goey-toast__action-button',
} as const

const toneClassNames: Record<FeedbackTone, string> = {
  default: 'bd-goey-toast--default',
  success: 'bd-goey-toast--success',
  error: 'bd-goey-toast--error',
  warning: 'bd-goey-toast--warning',
  info: 'bd-goey-toast--info',
}

const toneTokens: Record<FeedbackTone, { fillColor: string; borderColor: string }> = {
  default: {
    fillColor: 'hsl(var(--bd-goey-toast-fill))',
    borderColor: 'hsl(var(--bd-goey-toast-border))',
  },
  success: {
    fillColor: 'hsl(var(--bd-goey-toast-fill))',
    borderColor: 'hsl(var(--bd-goey-toast-border))',
  },
  error: {
    fillColor: 'hsl(var(--bd-feedback-error-bg))',
    borderColor: 'hsl(var(--bd-feedback-error-border))',
  },
  warning: {
    fillColor: 'hsl(var(--bd-goey-toast-fill))',
    borderColor: 'hsl(var(--bd-goey-toast-border))',
  },
  info: {
    fillColor: 'hsl(var(--bd-goey-toast-fill))',
    borderColor: 'hsl(var(--bd-goey-toast-border))',
  },
}

function toMessageString(message: string | Error | ReactNode, fallback: string) {
  if (message instanceof Error) {
    return message.message || fallback
  }

  if (typeof message === 'string') {
    const trimmed = message.trim()
    return trimmed || fallback
  }

  return fallback
}

function toToastId(prefix: string, message: string) {
  const slug = message.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return `${prefix}-${slug || 'message'}`
}

function createOptions(tone: FeedbackTone, options?: FeedbackOptions): GoeyToastOptions {
  const { classNames, ...restOptions } = options ?? {}
  const behavior =
    tone === 'success'
      ? { showProgress: true, showTimestamp: false }
      : tone === 'info'
        ? { showProgress: false, showTimestamp: false }
        : { showProgress: false, showTimestamp: false }

  return {
    ...behavior,
    ...restOptions,
    ...toneTokens[tone],
    classNames: {
      ...baseClassNames,
      ...classNames,
      wrapper: [baseClassNames.wrapper, toneClassNames[tone], classNames?.wrapper]
        .filter(Boolean)
        .join(' '),
    },
  }
}

function createPromiseMessages<T>(messages: FeedbackPromiseMessages<T>): FeedbackPromiseMessages<T> {
  return {
    ...messages,
    classNames: {
      ...baseClassNames,
      ...messages.classNames,
      wrapper: [
        baseClassNames.wrapper,
        'bd-goey-toast--promise',
        messages.classNames?.wrapper,
      ]
        .filter(Boolean)
        .join(' '),
    },
  }
}

export const feedback = {
  success(message: string, options?: FeedbackOptions) {
    return goeyToast.success(
      message,
      createOptions('success', {
        duration: 2400,
        id: toToastId('success', message),
        preset: 'smooth',
        bounce: 0.18,
        ...options,
      }),
    )
  },

  error(message: string | Error, options?: FeedbackOptions) {
    const errorMessage = toMessageString(message, 'Something went wrong')

    return goeyToast.error(
      errorMessage,
      createOptions('error', {
        duration: 5600,
        id: toToastId('error', errorMessage),
        preset: 'smooth',
        bounce: 0.14,
        ...options,
      }),
    )
  },

  info(message: string, options?: FeedbackOptions) {
    return goeyToast.info(
      message,
      createOptions('info', {
        duration: 3000,
        preset: 'smooth',
        bounce: 0.16,
        ...options,
      }),
    )
  },

  warning(message: string, options?: FeedbackOptions) {
    return goeyToast.warning(
      message,
      createOptions('warning', {
        duration: 4800,
        id: toToastId('warning', message),
        preset: 'smooth',
        bounce: 0.14,
        ...options,
      }),
    )
  },

  loading(message: string, options?: FeedbackOptions) {
    return goeyToast(
      message,
      createOptions('info', {
        duration: Number.POSITIVE_INFINITY,
        icon: createElement(LoaderCircle, {
          className: 'bd-goey-toast__spinner',
          'aria-hidden': true,
        }),
        showTimestamp: false,
        showProgress: false,
        bounce: 0.12,
        preset: 'smooth',
        ...options,
      }),
    )
  },

  promise<T>(promise: Promise<T>, messages: FeedbackPromiseMessages<T>) {
    const loadingId = toToastId('promise', messages.loading)
    const normalizedMessages = createPromiseMessages(messages)
    const loadingDescription = normalizedMessages.description?.loading

    goeyToast(
      normalizedMessages.loading,
      createOptions('info', {
        id: loadingId,
        duration: Number.POSITIVE_INFINITY,
        description: loadingDescription,
        icon: createElement(LoaderCircle, {
          className: 'bd-goey-toast__spinner',
          'aria-hidden': true,
        }),
        showTimestamp: false,
        showProgress: false,
        bounce: 0.12,
        preset: 'smooth',
        classNames: normalizedMessages.classNames,
      }),
    )

    return promise
      .then((data) => {
        const successTitle =
          typeof normalizedMessages.success === 'function'
            ? normalizedMessages.success(data)
            : normalizedMessages.success
        const successDescription =
          typeof normalizedMessages.description?.success === 'function'
            ? normalizedMessages.description.success(data)
            : normalizedMessages.description?.success

        goeyToast.success(
          successTitle,
          createOptions('success', {
            id: loadingId,
            duration: 2400,
            description: successDescription,
            action: normalizedMessages.action?.success,
            preset: 'smooth',
            bounce: 0.18,
            classNames: normalizedMessages.classNames,
          }),
        )

        return data
      })
      .catch((error) => {
        const errorTitle =
          typeof normalizedMessages.error === 'function'
            ? normalizedMessages.error(error)
            : normalizedMessages.error
        const errorDescription =
          typeof normalizedMessages.description?.error === 'function'
            ? normalizedMessages.description.error(error)
            : normalizedMessages.description?.error

        goeyToast.error(
          errorTitle,
          createOptions('error', {
            id: loadingId,
            duration: 5600,
            description: errorDescription,
            action: normalizedMessages.action?.error,
            preset: 'smooth',
            bounce: 0.14,
            classNames: normalizedMessages.classNames,
          }),
        )

        throw error
      })
  },

  dismiss(id?: string | number) {
    goeyToast.dismiss(id)
  },
}

export type { FeedbackOptions, FeedbackPromiseMessages }
