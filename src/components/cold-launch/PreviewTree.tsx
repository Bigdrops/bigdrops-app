/**
 * Preview-only workspace tree renderer for `/cold-launch-preview`.
 *
 * The tree stays mounted across normal, connection-error, retry, and theme
 * changes: state and theme only swap CSS classes on stable elements. Layout
 * maths live in ./preview-tree-geometry.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import {
  FALLBACK,
  buildGraph,
  round,
  type Graph,
  type GraphNode,
  type PreviewNetworkState,
} from './preview-tree-geometry'

export type { PreviewNetworkState } from './preview-tree-geometry'

// ── Rendering ───────────────────────────────────────────────────────

function NodeSurface({ node, font, subFont }: { node: GraphNode; font: number; subFont: number }) {
  const { box } = node
  if (node.kind === 'extension') {
    return <circle cx={box.x + box.w / 2} cy={box.y + box.h / 2} r={3} className="clp-dot" />
  }

  const group = node.kind === 'group'
  const size = font
  const lineHeight = size * 1.25
  const subSpace = node.sub ? subFont * 1.6 : 0
  const total = node.lines.length * lineHeight + subSpace
  const first = box.y + box.h / 2 - total / 2 + lineHeight * 0.72

  return (
    <>
      <rect
        x={box.x}
        y={box.y}
        width={box.w}
        height={box.h}
        rx={group ? 14 : 11}
        className={group ? 'clp-pill clp-group-pill' : 'clp-pill'}
      />
      {node.lines.map((line, index) => (
        <text
          key={line}
          x={box.x + box.w / 2}
          y={first + index * lineHeight}
          textAnchor="middle"
          className={group ? 'clp-glabel' : 'clp-code'}
          style={{ fontSize: size }}
        >
          {line}
        </text>
      ))}
      {node.sub ? (
        <text
          x={box.x + box.w / 2}
          y={first + node.lines.length * lineHeight + subFont * 0.2}
          textAnchor="middle"
          className="clp-gsub"
          style={{ fontSize: subFont }}
        >
          {node.sub}
        </text>
      ) : null}
    </>
  )
}

function nodeClass(node: GraphNode): string {
  return [
    'clp-node',
    `clp-node-${node.kind}`,
    node.hot ? 'clp-n-hot' : '',
    node.affected ? 'clp-affected-node' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function GraphSurface({
  graph,
  enhanced,
  state,
}: {
  graph: Graph
  enhanced: boolean
  state: PreviewNetworkState
}) {
  const { product: font, sub: subFont } = graph.fonts

  return (
    <svg
      className="clp-tree"
      viewBox={`0 0 ${graph.w} ${graph.h}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="BOURXE workspace network: Sales, Operations and Finance workspaces linked to RFQ, Cost and Pricing Sheets, Quotation, Invoice, Waybill, Customer Service Reports and Payments"
      data-network-state={state}
    >
      <defs>
        <filter id="clp-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation={enhanced ? 4 : 2.5} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {[0.62, 1].map((ratio, index) => (
        <circle
          key={ratio}
          className={enhanced && index === 0 ? 'clp-ring clp-ring-soft' : 'clp-ring'}
          style={{ animationDelay: `${0.15 + index * 0.2}s` }}
          cx={graph.hub.x}
          cy={graph.hub.y}
          r={Math.round(graph.ring * ratio)}
        />
      ))}

      {graph.edges.map((edge) => (
        <g key={edge.id}>
          <path
            className={[
              'clp-edge',
              `clp-edge-${edge.tier}`,
              edge.affected ? 'clp-affected-edge' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={
              {
                animationDelay: `${edge.delay}s`,
                '--break-delay': `${round(edge.delay * 0.3)}s`,
                '--recover-delay': `${round(edge.delay * 0.18)}s`,
              } as CSSProperties
            }
            pathLength={1}
            d={edge.d}
          />
          <path
            className={[
              'clp-signal',
              `clp-signal-${edge.tier}`,
              edge.affected ? 'clp-affected-signal' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{ animationDelay: `${round(edge.delay + 0.3)}s` }}
            pathLength={1}
            d={edge.d}
            aria-hidden="true"
          />
          {edge.affected ? (
            <path
              className="clp-recovery-signal"
              style={{ animationDelay: `${round(edge.delay * 0.2)}s` }}
              pathLength={1}
              d={edge.d}
              aria-hidden="true"
            />
          ) : null}
        </g>
      ))}

      {graph.nodes.map((node) => {
        const delay = node.kind === 'product' ? 0.9 : node.kind === 'extension' ? 0.4 : 0.6
        return (
          <g
            key={node.id}
            className={nodeClass(node)}
            style={
              {
                animationDelay: `${delay}s`,
                '--wake-delay': `${round(delay + 0.4)}s`,
                '--recover-delay': `${node.affected ? 0.24 : 0}s`,
                '--fx': `${round(graph.hub.x - (node.box.x + node.box.w / 2))}px`,
                '--fy': `${round(graph.hub.y - (node.box.y + node.box.h / 2))}px`,
              } as CSSProperties
            }
            aria-hidden={node.kind === 'extension' ? 'true' : undefined}
          >
            <NodeSurface node={node} font={font} subFont={subFont} />
            {node.kind !== 'extension' ? (
              <title>{node.lines.join(' ')}</title>
            ) : null}
          </g>
        )
      })}
    </svg>
  )
}

export function PreviewTree({
  enhanced,
  state,
  onBrandRatio,
}: {
  enhanced: boolean
  state: PreviewNetworkState
  /** Reports where the BIGDROPS brand block should sit, so the logo stays the hub. */
  onBrandRatio?: (ratio: number) => void
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState(FALLBACK)

  const measure = useCallback(() => {
    const el = wrapRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (rect.width < 40 || rect.height < 40) return
    setSize((prev) =>
      Math.abs(prev.w - rect.width) < 1 && Math.abs(prev.h - rect.height) < 1
        ? prev
        : { w: Math.round(rect.width), h: Math.round(rect.height) },
    )
  }, [])

  // Measured before paint so the first frame already uses the real box.
  useLayoutEffect(() => {
    measure()
    const el = wrapRef.current
    if (!el || typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [measure])

  const graph = buildGraph(size.w, size.h)
  const brandRatio = graph.brandRatio

  useEffect(() => {
    onBrandRatio?.(brandRatio)
  }, [brandRatio, onBrandRatio])

  return (
    <div className="clp-tree-wrap" ref={wrapRef}>
      <GraphSurface graph={graph} enhanced={enhanced} state={state} />
    </div>
  )
}
