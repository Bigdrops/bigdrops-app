import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// Structural regression test for the post-save React #310 crash.
// ViewCps previously called an actions useMemo AFTER its loading early
// return, so the loading-to-loaded transition changed the hook count
// (8 hooks, then 9) and React threw "Rendered more hooks than during
// the previous render" on every successful view hydration.
//
// This test cannot execute hooks without a React renderer (the repo has
// no component-test framework, and none is introduced here). It guards
// the structural invariant instead: no hook call may appear after the
// loading guard inside the ViewCps component body.
const source = readFileSync(new URL('../../pages/ViewCps.tsx', import.meta.url), 'utf8')

const HOOK_CALL =
  /(?:^|[^.\w])(useState|useEffect|useMemo|useCallback|useRef|useLayoutEffect|useReducer|useContext|useTransition|useDeferredValue|useId|useSyncExternalStore|useOptimistic|useActionState)\s*\(/g

function componentBody() {
  const start = source.indexOf('export default function ViewCps()')
  assert.ok(start >= 0, 'ViewCps component not found')
  return source.slice(start)
}

test('ViewCps loading guard exists', () => {
  const body = componentBody()
  assert.ok(body.includes('if (loading'), 'loading early return not found')
})

test('ViewCps calls no hooks after its loading early return', () => {
  const body = componentBody()
  const guardIndex = body.indexOf('if (loading')
  assert.ok(guardIndex >= 0, 'loading early return not found')

  const tail = body.slice(guardIndex)
  const offenders = [...tail.matchAll(HOOK_CALL)].map((match) => match[1])
  assert.deepEqual(
    offenders,
    [],
    `hook calls after the loading guard would change the hook count on hydration: ${offenders.join(', ')}`,
  )
})

test('ViewCps still computes view data and actions with hooks', () => {
  const body = componentBody()
  const guardIndex = body.indexOf('if (loading')
  const head = body.slice(0, guardIndex)
  const hooks = [...head.matchAll(HOOK_CALL)].map((match) => match[1])
  assert.ok(hooks.includes('useMemo'), 'expected view-data/actions memos above the guard')
  assert.ok(hooks.includes('useEffect'), 'expected load effect above the guard')
  assert.ok(hooks.includes('useState'), 'expected state hooks above the guard')
})
