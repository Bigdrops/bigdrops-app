import type { CandidateAlternative } from './routing/bolu-alternative-discovery'

export class ModelUnavailableError extends Error {
  readonly code = 'MODEL_UNAVAILABLE' as const
  readonly failedConnectionId?: string
  readonly failedModelId?: string
  readonly alternatives: CandidateAlternative[]

  constructor(
    message: string,
    alternatives: CandidateAlternative[],
    failedConnectionId?: string,
    failedModelId?: string,
  ) {
    super(message)
    this.name = 'ModelUnavailableError'
    this.alternatives = alternatives
    this.failedConnectionId = failedConnectionId
    this.failedModelId = failedModelId
  }
}
