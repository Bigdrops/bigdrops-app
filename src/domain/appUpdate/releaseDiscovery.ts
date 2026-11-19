/**
 * Release discovery outcome.
 *
 * The What's New page must never assert that a release is absent before
 * discovery has settled. This module owns that decision so the rule is
 * testable without a React renderer and identical on Web and Android.
 *
 * The five states are distinct on purpose:
 * - `loading`   discovery has not settled; nothing is known yet.
 * - `error`     the release source failed; absence is not established.
 * - `none`      discovery settled and no release applies to this install.
 * - `no-notes`  a release applies but carries no parseable notes.
 * - `available` a release applies and has at least one note.
 */
export type ReleaseDiscoveryState = 'loading' | 'available' | 'no-notes' | 'none' | 'error'

export interface ReleaseDiscoveryFacts {
  /** Discovery has not settled yet. */
  pending: boolean
  /** The release source failed (transport error or unexpected failure). */
  failed: boolean
  /** A release applies to this install right now. */
  applicable: boolean
  /** Parsed note count for the applicable release. Zero when none apply. */
  entryCount: number
}

/**
 * Resolve the discovery state from settled facts.
 *
 * Precedence matters: a pending discovery outranks a failure, because a
 * retry may still succeed, and a failure outranks absence, because a failed
 * fetch does not prove that no release exists.
 */
export function resolveReleaseDiscovery(facts: ReleaseDiscoveryFacts): ReleaseDiscoveryState {
  if (facts.pending) return 'loading'
  if (facts.failed) return 'error'
  if (!facts.applicable) return 'none'
  return facts.entryCount > 0 ? 'available' : 'no-notes'
}
