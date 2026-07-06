export type FeedbackEvent =
  | { type: 'download:start'; payload: { fileName: string } }
  | { type: 'download:success'; payload: { fileName: string; path: string } }
  | { type: 'download:fail'; payload: { fileName: string; error: string } }
  | { type: 'ai:launch:attempt'; payload: { providerName: string; method: 'native' | 'browser' } }
  | { type: 'ai:launch:success'; payload: { providerName: string; method: 'native' | 'browser' } }
  | { type: 'ai:launch:fallback'; payload: { providerName: string; method: string; reason: string } }
  | { type: 'ai:launch:fail'; payload: { providerName: string; method: string; reason: string } }
  | { type: 'back:hint'; payload: { canGoBack: boolean; timestamp: number } }
  | { type: 'system:error'; payload: { error: string; diagnostic?: string } }

type Handler = (event: FeedbackEvent) => void

const handlers = new Map<FeedbackEvent['type'], Set<Handler>>()

export function onFeedback(type: FeedbackEvent['type'], handler: Handler): () => void {
  if (!handlers.has(type)) handlers.set(type, new Set())
  handlers.get(type)!.add(handler)
  return () => handlers.get(type)?.delete(handler)
}

export function emitFeedback(event: FeedbackEvent): void {
  handlers.get(event.type)?.forEach((h) => h(event))
}
