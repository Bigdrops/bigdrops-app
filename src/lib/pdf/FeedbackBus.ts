import type { PdfFeedbackEvent } from './types'

export type Unsubscribe = () => void

export interface FeedbackBus {
  emit(event: PdfFeedbackEvent): void
  on(eventKind: PdfFeedbackEvent['kind'], handler: (event: PdfFeedbackEvent) => void): Unsubscribe
}
