import { describe, it, expect } from 'bun:test'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { buildBoluPageContext } from '../../lib/ai-assistant/bolu-context'

describe('Bolu AI Floating Action Button (AI FAB) — Production Integration & Coexistence', () => {
  const cssPath = resolve(__dirname, '../../components/ai-assistant/boluFab.css')
  const fabSourcePath = resolve(__dirname, '../../components/ai-assistant/BoluFloatingActionButton.tsx')
  const providerPath = resolve(__dirname, '../../components/ai-assistant/BoluAssistantProvider.tsx')
  const mobileFabPath = resolve(__dirname, '../../components/layout/MobileFab.tsx')

  const css = readFileSync(cssPath, 'utf-8')
  const fabSource = readFileSync(fabSourcePath, 'utf-8')
  const providerSource = readFileSync(providerPath, 'utf-8')
  const mobileFabSource = readFileSync(mobileFabPath, 'utf-8')

  it('Coexistence Geometry: AI FAB sits exactly 14px above the 50px MobileFab', () => {
    // 1. MobileFab is at bottom-[94px] with height [50px]
    expect(mobileFabSource).toContain('bottom-[94px]')
    expect(mobileFabSource).toContain('h-[50px]')
    const mobileFabBottom = 94
    const mobileFabHeight = 50
    const mobileFabTop = mobileFabBottom + mobileFabHeight // 144px

    // 2. Bolu AI FAB mobile placement has 14px vertical gap: 144px + 14px = 158px
    expect(css).toContain('bottom: calc(158px + env(safe-area-inset-bottom, 0px))')
    const aiFabBottom = 158
    expect(aiFabBottom - mobileFabTop).toBe(14)

    // 3. Both clear the 62px bottom navigation
    const navHeight = 62
    expect(mobileFabBottom).toBeGreaterThan(navHeight)
    expect(aiFabBottom).toBeGreaterThan(navHeight)
  })

  it('Desktop Adaptation: Restrained 2rem margin and hover disclosure', () => {
    // Desktop positioning
    expect(css).toContain('@media (min-width: 768px)')
    expect(css).toContain('bottom: 2rem')
    expect(css).toContain('right: 2rem')
    expect(css).toContain('z-index: 40')

    // Desktop hover disclosure tooltip
    expect(css).toContain('.bolu-ai-fab-tooltip')
    expect(fabSource).toContain('Ask Bolu')
  })

  it('Fold Dual-Pane Awareness: Anchored to the right active detail pane', () => {
    expect(css).toContain('html[data-separating-fold="true"] .bolu-ai-fab-root')
    expect(css).toContain('right: max(20px, env(safe-area-inset-right, 0px))')
  })

  it('Virtual Keyboard Awareness: Auto-hides when virtual keyboard opens to prevent obstruction', () => {
    expect(css).toContain('html[data-keyboard-open="true"] .bolu-ai-fab-root')
    expect(css).toContain('display: none !important')
  })

  it('Distinctive Motion & Accessibility: Respects prefers-reduced-motion', () => {
    // Ambient float and halo pulse animations
    expect(css).toContain('@keyframes boluFabFloat')
    expect(css).toContain('@keyframes boluFabHaloPulse')
    expect(css).toContain('@keyframes boluDotPulse')
    expect(css).toContain('.bolu-ai-fab-float')
    expect(css).toContain('.bolu-ai-fab-aura')

    // Accessibility: disables animations under reduced-motion preference
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(css).toContain('animation: none !important')
  })

  it('Visual Identity: Freestanding circular button with notification dot and no enclosing card', () => {
    // Button shape is rounded-full (freestanding circular action button)
    expect(css).toContain('border-radius: 9999px')
    // Notification indicator dot exists
    expect(css).toContain('.bolu-ai-fab-dot')
    // Uses approved character glyph
    expect(fabSource).toContain('clerk-launcher-bot.svg')
    expect(fabSource).toContain('bolu-ai-fab-glyph')
    // Proper accessibility label
    expect(fabSource).toContain('aria-label="Open Bolu AI assistant"')
  })

  it('Provider Integration: Mounted globally and connects via "future-fab" launcher source', () => {
    // BoluAssistantProvider mounts BoluFloatingActionButton
    expect(providerSource).toContain('<BoluFloatingActionButton />')
    expect(providerSource).toContain('isOpen: open')
    expect(providerSource).toContain('close: () => void')

    // FAB invokes open('future-fab')
    expect(fabSource).toContain("open('future-fab')")

    // Context accurately records future-fab launcher origin
    const ctx = buildBoluPageContext('/invoices', 'future-fab')
    expect(ctx.origin.launcher).toBe('future-fab')
    expect(ctx.origin.module).toBe('invoice')
  })

  it('Isolation & State Preservation: Hides when workspace is open and isolates Design Lab', () => {
    // When assistant workspace is already open, FAB suppresses itself
    expect(fabSource).toContain('if (isOpen) return null')

    // Design Lab and Debug routes are strictly isolated
    expect(fabSource).toContain("pathname.startsWith('/design-lab')")
    expect(fabSource).toContain("pathname.startsWith('/debug')")
  })
})
