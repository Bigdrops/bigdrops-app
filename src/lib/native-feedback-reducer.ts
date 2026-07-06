import { onFeedback, type FeedbackEvent } from './native-feedback-event-bus'

export type UIIntent = {
  id: string
  title: string
  description?: string
  variant: 'success' | 'error' | 'warning' | 'info' | 'loading'
  duration: number
  createdAt: number
}

type Listener = (intents: UIIntent[]) => void

const active = new Map<string, UIIntent>()
const listeners = new Set<Listener>()

function notify() {
  const queue = [...active.values()]
  listeners.forEach((fn) => fn(queue))
}

export function dismiss(id: string) {
  active.delete(id)
  notify()
}

export function subscribe(fn: Listener) {
  listeners.add(fn)
  fn([...active.values()])
  return () => listeners.delete(fn)
}

const PRIORITIES: Record<string, number> = {
  'system:error': 0,
  'download:fail': 0,
  'ai:launch:fail': 0,
  'ai:launch:fallback': 1,
  'ai:launch:success': 2,
  'download:success': 2,
  'download:start': 1,
  'back:hint': 3,
  'ai:launch:attempt': 3,
}

function eventToIntent(event: FeedbackEvent): UIIntent | null {
  const now = Date.now()

  switch (event.type) {
    case 'download:start':
      return { id: 'download', title: event.payload.fileName, description: 'Downloading...', variant: 'loading', duration: 0, createdAt: now }

    case 'download:success':
      return { id: 'download', title: `${event.payload.fileName} downloaded`, description: event.payload.path, variant: 'success', duration: 3000, createdAt: now }

    case 'download:fail':
      return { id: 'download', title: 'Download failed', description: event.payload.error, variant: 'error', duration: 5000, createdAt: now }

    case 'ai:launch:attempt':
      return null

    case 'ai:launch:success':
      return { id: `ai:${event.payload.providerName}`, title: `Opened in ${event.payload.providerName}`, variant: 'success', duration: 2500, createdAt: now }

    case 'ai:launch:fallback':
      return { id: `ai:${event.payload.providerName}`, title: `Could not open ${event.payload.providerName}`, description: event.payload.reason, variant: 'warning', duration: 4000, createdAt: now }

    case 'ai:launch:fail':
      return { id: `ai:${event.payload.providerName}`, title: `Failed to open ${event.payload.providerName}`, description: event.payload.reason, variant: 'error', duration: 5000, createdAt: now }

    case 'back:hint':
      return { id: `back:${event.payload.timestamp}`, title: 'Press back again to exit', variant: 'info', duration: 2000, createdAt: now }

    case 'system:error':
      return { id: `error:${now}`, title: event.payload.error, description: event.payload.diagnostic, variant: 'error', duration: 6000, createdAt: now }
  }
}

export function dispatch(event: FeedbackEvent) {
  const intent = eventToIntent(event)
  if (!intent) return

  active.set(intent.id, intent)
  notify()
}

const TYPES: FeedbackEvent['type'][] = [
  'download:start', 'download:success', 'download:fail',
  'ai:launch:attempt', 'ai:launch:success', 'ai:launch:fallback', 'ai:launch:fail',
  'back:hint', 'system:error',
]

TYPES.forEach((type) => onFeedback(type, dispatch))

export { PRIORITIES }
