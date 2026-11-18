import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { useBoluAssistant } from './BoluAssistantProvider'
import launcherBot from '@/assets/clerk-launcher-bot.svg'
import './boluFab.css'

const STORAGE_KEY = 'bolu_fab_position:v1'
const FAB_SIZE = 52
const VIEWPORT_MARGIN = 12
const DRAG_THRESHOLD = 6

interface Position {
  x: number
  y: number
}

function clampPosition(x: number, y: number): Position {
  const winWidth = typeof window !== 'undefined' ? window.innerWidth : 360
  const winHeight = typeof window !== 'undefined' ? window.innerHeight : 640

  const minX = VIEWPORT_MARGIN
  const maxX = Math.max(minX, winWidth - FAB_SIZE - VIEWPORT_MARGIN)

  const minY = VIEWPORT_MARGIN
  const maxY = Math.max(minY, winHeight - FAB_SIZE - VIEWPORT_MARGIN)

  return {
    x: Math.min(Math.max(x, minX), maxX),
    y: Math.min(Math.max(y, minY), maxY),
  }
}

export function BoluFloatingActionButton({ className = '' }: { className?: string } = {}) {
  const { open, isOpen } = useBoluAssistant()
  const location = useLocation()

  const [position, setPosition] = useState<Position | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const rootRef = useRef<HTMLElement>(null)
  const dragInfoRef = useRef<{
    startX: number
    startY: number
    initialX: number
    initialY: number
    hasMoved: boolean
    pointerId: number
  } | null>(null)

  // Load saved position from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
          setPosition(clampPosition(parsed.x, parsed.y))
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, [])

  // Keep position clamped on window resize or device orientation change
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        if (!prev) return null
        return clampPosition(prev.x, prev.y)
      })
    }
    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [])

  // Pointer drag interactions
  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return // Left / primary pointer only

    const rect = rootRef.current?.getBoundingClientRect()
    const curX = rect ? rect.left : (position?.x ?? (window.innerWidth - FAB_SIZE - 16))
    const curY = rect ? rect.top : (position?.y ?? (window.innerHeight - 158))

    dragInfoRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: curX,
      initialY: curY,
      hasMoved: false,
      pointerId: e.pointerId,
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Ignore pointer capture errors
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const info = dragInfoRef.current
    if (!info || info.pointerId !== e.pointerId) return

    const dx = e.clientX - info.startX
    const dy = e.clientY - info.startY

    if (!info.hasMoved) {
      if (Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
        info.hasMoved = true
        setIsDragging(true)
      } else {
        return
      }
    }

    const nextPos = clampPosition(info.initialX + dx, info.initialY + dy)
    setPosition(nextPos)
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const info = dragInfoRef.current
    if (!info || info.pointerId !== e.pointerId) return

    const pointerId = info.pointerId
    const moved = info.hasMoved

    try {
      if (e.currentTarget.hasPointerCapture(pointerId)) {
        e.currentTarget.releasePointerCapture(pointerId)
      }
    } catch {
      // Ignore
    }

    dragInfoRef.current = null
    setIsDragging(false)

    if (moved) {
      // Persist the dragged position
      setPosition((latest) => {
        if (latest) {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(latest))
          } catch {
            // Ignore storage errors
          }
        }
        return latest
      })
    } else {
      // Quick tap without deliberate movement triggers assistant
      open('future-fab')
    }
  }

  const handlePointerCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
    const info = dragInfoRef.current
    if (!info || info.pointerId !== e.pointerId) return

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
    } catch {
      // Ignore
    }

    dragInfoRef.current = null
    setIsDragging(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      open('future-fab')
    }
  }

  // Suppress rendering if the assistant workspace is open
  if (isOpen) return null

  // Suppress rendering on Design Lab or debug routes for strict test isolation
  const pathname = location?.pathname ?? ''
  if (pathname.startsWith('/design-lab') || pathname.startsWith('/debug')) {
    return null
  }

  const maskStyle = {
    WebkitMaskImage: `url(${launcherBot})`,
    maskImage: `url(${launcherBot})`,
  }

  const dynamicRootStyle: React.CSSProperties = position
    ? {
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        right: 'auto',
        bottom: 'auto',
        touchAction: 'none',
        userSelect: 'none',
      }
    : {
        touchAction: 'none',
      }

  return (
    <aside
      ref={rootRef}
      style={dynamicRootStyle}
      data-dragging={isDragging ? 'true' : undefined}
      className={`bolu-ai-fab-root ${className}`.trim()}
      aria-label="Bolu Assistant Launcher"
    >
      <div className={`bolu-ai-fab-float ${isDragging ? 'bolu-ai-fab-float--dragging' : ''}`}>
        <div className="bolu-ai-fab-aura" aria-hidden="true" />
        <button
          type="button"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onKeyDown={handleKeyDown}
          className="bolu-ai-fab-button group cursor-grab active:cursor-grabbing select-none"
          aria-label="Open Bolu AI assistant"
          data-testid="bolu-floating-action-button"
        >
          <span
            className="bolu-ai-fab-glyph"
            style={maskStyle}
            aria-hidden="true"
          />
          <span className="bolu-ai-fab-dot" aria-hidden="true" />
        </button>
      </div>

      <div className="bolu-ai-fab-tooltip hidden md:flex" aria-hidden="true">
        <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
        <span>Ask Bolu</span>
      </div>
    </aside>
  )
}
