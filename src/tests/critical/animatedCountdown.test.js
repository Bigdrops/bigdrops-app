import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('AnimatedCountdown component exists with proper exports and types', () => {
  const filePath = path.resolve('src/components/ui/animated-countdown.tsx')
  assert.ok(fs.existsSync(filePath), 'animated-countdown.tsx must exist')

  const content = fs.readFileSync(filePath, 'utf8')
  assert.match(content, /export function AnimatedCountdown/)
  assert.match(content, /export type CountdownVariant = 'modern' \| 'digital' \| 'minimal' \| 'classic'/)
  assert.match(content, /export type CountdownSize = 'sm' \| 'md' \| 'lg'/)
  assert.match(content, /export interface AnimatedCountdownProps/)
  assert.match(content, /targetDate:\s*Date \| string \| number/)
})

test('AnimatedCountdown implements live interval ticking and cleanup', () => {
  const content = fs.readFileSync(path.resolve('src/components/ui/animated-countdown.tsx'), 'utf8')
  assert.match(content, /setInterval/)
  assert.match(content, /clearInterval/)
  assert.match(content, /calculateTimeLeft/)
  assert.match(content, /Math\.floor/)
})

test('AnimatedCountdown avoids em dashes and hardcoded colors', () => {
  const content = fs.readFileSync(path.resolve('src/components/ui/animated-countdown.tsx'), 'utf8')
  assert.doesNotMatch(content, /—/, 'Must not contain em dashes')
  assert.doesNotMatch(content, /#[0-9a-fA-F]{3,6}/, 'Must not inject hardcoded hex colors')
  assert.match(content, /var\(--au-/, 'Must support theme tokens')
})
