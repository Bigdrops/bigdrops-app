import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import net from 'node:net'
import { chromium } from 'playwright'

async function getFreePort() {
  const server = net.createServer()
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0
  server.close()
  await once(server, 'close')
  return port
}

async function waitForServer(url, process, timeoutMs = 30000) {
  const startedAt = Date.now()
  let lastError = null

  while (Date.now() - startedAt < timeoutMs) {
    if (process.exitCode !== null) {
      throw new Error(`Vite dev server exited early with code ${process.exitCode}.`)
    }

    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch (error) {
      lastError = error
    }

    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  throw new Error(`Timed out waiting for Vite dev server. Last error: ${lastError?.message || 'none'}`)
}

test('cleanup catalog session setup starts active review without hook-order crash', { timeout: 60000 }, async () => {
  const port = await getFreePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const server = spawn('bun', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: process.cwd(),
    env: { ...process.env, BROWSER: 'none' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const serverOutput = []
  server.stdout.on('data', (chunk) => serverOutput.push(String(chunk)))
  server.stderr.on('data', (chunk) => serverOutput.push(String(chunk)))

  let browser
  try {
    await waitForServer(`${baseUrl}/src/tests/item-library/cleanupSessionHookLifecycle.harness.html`, server)

    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()
    const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') pageErrors.push(message.text())
    })

    await page.goto(`${baseUrl}/src/tests/item-library/cleanupSessionHookLifecycle.harness.html`)
    await page.getByText('Clean & Standardize Catalog').waitFor()
    await page.getByText('50 items per batch selected').waitFor()

    await page.getByRole('button', { name: 'Start Cleanup Session' }).click()
    await page.getByText('Batch 1 of 4').waitFor()
    await page.getByText('Export batch JSON').waitFor()
    assert.deepEqual(pageErrors, [])

    await page.getByRole('button', { name: 'Start new session' }).click()
    await page.getByText('Clean & Standardize Catalog').waitFor()
    await page.getByRole('button', { name: 'Start Cleanup Session' }).click()
    await page.getByText('Batch 1 of 4').waitFor()
    assert.deepEqual(pageErrors, [])
  } finally {
    if (browser) await browser.close()
    server.kill()
    if (server.exitCode === null) {
      await Promise.race([
        once(server, 'exit'),
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ])
    }
  }

  assert.equal(server.exitCode === null || server.exitCode === 0 || server.killed, true, serverOutput.join('\n'))
})
