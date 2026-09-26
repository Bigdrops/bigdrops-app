/**
 * Coordinates concurrent update checks so simultaneous launch, resume,
 * and manual-Retry triggers never cause two authoritative policy fetches.
 *
 * Rules:
 * - A caller joins an already-running fresh operation and shares its result.
 * - A fresh request arriving while only a stale local-only operation runs
 *   chains exactly one forced check after that operation settles.
 * - Operations are cleared by promise identity, so a chained successor is
 *   never cleared by its predecessor's settlement.
 */
export interface CoordinatedCheck<T> {
  promise: Promise<T>
  /** True when the caller joined an already-running operation. */
  joined: boolean
}

interface InFlight<T> {
  promise: Promise<T>
  /** True when the operation performs a fresh authoritative fetch. */
  fresh: boolean
}

export function createCheckCoordinator<T>() {
  let inFlight: InFlight<T> | null = null

  function settle(promise: Promise<T>): void {
    // Both handlers clear: a settled operation must release the slot
    // without creating an unhandled rejection.
    void promise.then(
      () => {
        if (inFlight?.promise === promise) inFlight = null
      },
      () => {
        if (inFlight?.promise === promise) inFlight = null
      },
    )
  }

  function submit(
    desiresFresh: boolean,
    start: (forced: boolean) => Promise<T>,
  ): CoordinatedCheck<T> {
    const current = inFlight
    if (current && (current.fresh || !desiresFresh)) {
      return { promise: current.promise, joined: true }
    }
    if (current) {
      const chained = current.promise.then(
        () => start(true),
        () => start(true),
      )
      inFlight = { promise: chained, fresh: true }
      settle(chained)
      return { promise: chained, joined: false }
    }
    const op = start(desiresFresh)
    inFlight = { promise: op, fresh: desiresFresh }
    settle(op)
    return { promise: op, joined: false }
  }

  return { submit }
}
