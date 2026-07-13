import type { FeedbackBus, Unsubscribe } from './FeedbackBus'
import type { PdfFeedbackEvent, PdfFeedbackEventKind } from './types'

export class DefaultFeedbackBus implements FeedbackBus {
  private handlers = new Map<PdfFeedbackEventKind, Set<(event: PdfFeedbackEvent) => void>>()

  emit(event: PdfFeedbackEvent): void {
    this.handlers.get(event.kind)?.forEach(h => h(event))
  }

  on(eventKind: PdfFeedbackEventKind, handler: (event: PdfFeedbackEvent) => void): Unsubscribe {
    if (!this.handlers.has(eventKind)) this.handlers.set(eventKind, new Set())
    this.handlers.get(eventKind)!.add(handler)
    return () => this.handlers.get(eventKind)?.delete(handler)
  }
}
