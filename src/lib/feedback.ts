import { goeyToast, type GoeyPromiseData, type GoeyToastOptions } from 'goey-toast'
import { LoaderCircle } from 'lucide-react'
import { createElement, type ReactNode } from 'react'

type FeedbackTone = 'default' | 'success' | 'error' | 'warning' | 'info'

type FeedbackOptions = Omit<GoeyToastOptions, 'fillColor' | 'borderColor'>

type FeedbackPromiseMessages<T> = GoeyPromiseData<T>

const baseClassNames = {
  wrapper: 'bd-goey-toast',
  content: 'bd-goey-toast__content',
  header: 'bd-goey-toast__header',
  title: 'bd-goey-toast__title',
  icon: 'bd-goey-toast__icon',
  description: 'bd-goey-toast__description',
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
    fillColor: 'hsl(var(--bd-goey-toast-fill))',
    borderColor: 'hsl(var(--bd-goey-toast-border))',
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

  return {
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
        duration: 2000,
        id: toToastId('success', message),
        ...options,
      }),
    )
  },

  error(message: string | Error, options?: FeedbackOptions) {
    const errorMessage = toMessageString(message, 'Something went wrong')

    return goeyToast.error(
      errorMessage,
      createOptions('error', {
        duration: 4000,
        id: toToastId('error', errorMessage),
        ...options,
      }),
    )
  },

  info(message: string, options?: FeedbackOptions) {
    return goeyToast.info(
      message,
      createOptions('info', {
        duration: 3000,
        ...options,
      }),
    )
  },

  warning(message: string, options?: FeedbackOptions) {
    return goeyToast.warning(
      message,
      createOptions('warning', {
        duration: 3500,
        id: toToastId('warning', message),
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
        ...options,
      }),
    )
  },

  promise<T>(promise: Promise<T>, messages: FeedbackPromiseMessages<T>) {
    return goeyToast.promise(promise, {
      ...createPromiseMessages(messages),
      fillColor: 'hsl(var(--bd-goey-toast-fill))',
      borderColor: 'hsl(var(--bd-goey-toast-border))',
    })
  },

  dismiss(id?: string | number) {
    goeyToast.dismiss(id)
  },
}

export type { FeedbackOptions, FeedbackPromiseMessages }
