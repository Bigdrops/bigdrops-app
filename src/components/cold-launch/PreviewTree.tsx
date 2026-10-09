/**
 * Preview-only workspace tree for `/cold-launch-preview`.
 *
 * Geometry is measured from the live container size and laid out in CSS pixels,
 * so the SVG maps 1:1 to the viewport. Every featured node is placed inside the
 * safe viewport band and paths are anchored to node edges, which keeps labels
 * clear of connection lines at every size.
 *
 * This module performs no backend, authentication, or startup work.
 */

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'

export type PreviewNetworkState = 'normal' | 'error' | 'retrying'

interface Pt {
  x: number
  y: number
}

/** Node surface rectangle, in CSS pixels. */
interface Box {
  x: number
  y: number
  w: number
  h: number
}

type NodeKind = 'group' | 'product' | 'extension'
type EdgeTier = 'primary' | 'secondary' | 'handoff' | 'extension'

interface GraphNode {
  id: string
  kind: NodeKind
  lines: string[]
  sub?: string
  hot?: boolean
  affected?: boolean
  box: Box
}

interface GraphEdge {
  id: string
  tier: EdgeTier
  affected?: boolean
  bow: number
  delay: number
  d: string
}

interface Graph {
  w: number
  h: number
  hub: Pt
  ring: number
  nodes: GraphNode[]
  edges: GraphEdge[]
}

// ── Content model ───────────────────────────────────────────────────

interface ProductDef {
  id: string
  lines: string[]
  sub?: string
  hot?: boolean
}

/**
 * Featured BIGDROPS products. Long names wrap onto two lines so the labels stay
 * narrow enough to sit side by side on phones without clipping.
 */
const PRODUCTS: Record<string, ProductDef> = {
  rfq: { id: 'rfq', lines: ['RFQ'] },
  quotation: { id: 'quotation', lines: ['Quotation'] },
  invoice: { id: 'invoice', lines: ['Invoice'], hot: true },
  cps: { id: 'cps', lines: ['Cost & Pricing', 'Sheets'] },
  waybill: { id: 'waybill', lines: ['Waybill'] },
  csr: { id: 'csr', lines: ['Customer Service', 'Reports'] },
  payments: { id: 'payments', lines: ['Payments'], hot: true },
}

interface WorkspaceDef {
  id: string
  lines: string[]
  sub: string
  products: string[]
}

const WORKSPACES: WorkspaceDef[] = [
  {
    id: 'sales',
    lines: ['Sales', 'Workspace'],
    sub: 'RFQ · Quotes · Invoices',
    products: ['rfq', 'quotation', 'invoice'],
  },
  {
    id: 'operations',
    lines: ['Operations', 'Workspace'],
    sub: 'Costing · Delivery · Service',
    products: ['cps', 'waybill', 'csr'],
  },
  {
    id: 'finance',
    lines: ['Finance', 'Workspace'],
    sub: 'Collections',
    products: ['payments'],
  },
]

/** Nodes and branches touched by the simulated connection failure. */
const AFFECTED_NODES = new Set(['finance', 'payments'])

// ── Text metrics ────────────────────────────────────────────────────

const PAD_X = 12
const codeWidth = (line: string, font: number) => line.length * font * 0.63
const labelWidth = (line: string, font: number) => line.length * font * 0.58

function boxSize(
  lines: string[],
  sub: string | undefined,
  font: number,
  subFont: number,
  kind: NodeKind,
) {
  const measure = kind === 'product' ? codeWidth : labelWidth
  const text = Math.max(...lines.map((line) => measure(line, font)))
  const min = kind === 'group' ? 108 : 56
  const max = kind === 'group' ? 210 : 190
  const w = Math.round(Math.min(max, Math.max(min, text + PAD_X * 2)))
  const h = Math.round(lines.length * font * 1.25 + (sub ? subFont * 1.6 : 0) + 10)
  return { w, h }
}

function center(box: Box): Pt {
  return { x: box.x + box.w / 2, y: box.y + box.h / 2 }
}

/** Intersection of the ray `from → box centre` with the box boundary. */
function anchor(box: Box, from: Pt): Pt {
  const c = center(box)
  const dx = from.x - c.x
  const dy = from.y - c.y
  if (dx === 0 && dy === 0) return c
  const sx = dx === 0 ? Number.POSITIVE_INFINITY : box.w / 2 / Math.abs(dx)
  const sy = dy === 0 ? Number.POSITIVE_INFINITY : box.h / 2 / Math.abs(dy)
  const s = Math.min(sx, sy)
  return { x: round(c.x + dx * s), y: round(c.y + dy * s) }
}

const round = (n: number) => Math.round(n * 10) / 10

/** Quadratic curve between two node surfaces, bowed away from the hub. */
/** Picks the perpendicular direction that bends the curve away from the hub. */
function bowSign(
  mx: number,
  my: number,
  dx: number,
  dy: number,
  len: number,
  hub: Pt,
  bow: number,
): number {
  const px = (-dy / len) * bow
  const py = (dx / len) * bow
  const a = Math.hypot(mx + px - hub.x, my + py - hub.y)
  const b = Math.hypot(mx - px - hub.x, my - py - hub.y)
  return a >= b ? 1 : -1
}

function edgePath(a: Box, b: Box, hub: Pt, bow: number): string {
  const ca = center(a)
  const cb = center(b)
  const start = anchor(a, cb)
  const end = anchor(b, ca)
  const dx = cb.x - ca.x
  const dy = cb.y - ca.y
  const len = Math.hypot(dx, dy) || 1
  const mx = (start.x + end.x) / 2
  const my = (start.y + end.y) / 2
  // Perpendicular offset, signed away from the hub so branches bow outward
  // instead of cutting across the centre of the network.
  const sign = bowSign(mx, my, dx, dy, len, hub, bow)
  const cx = round(mx + (-dy / len) * bow * sign)
  const cy = round(my + (dx / len) * bow * sign)
  return `M${round(start.x)},${round(start.y)} Q${cx},${cy} ${round(end.x)},${round(end.y)}`
}

/** Curve from a node surface out to an off-screen branch tip. */
function branchPath(a: Box, tip: Pt, hub: Pt, bow: number): string {
  const ca = center(a)
  const start = anchor(a, tip)
  const dx = tip.x - ca.x
  const dy = tip.y - ca.y
  const len = Math.hypot(dx, dy) || 1
  const mx = (start.x + tip.x) / 2
  const my = (start.y + tip.y) / 2
  const sign = bowSign(mx, my, dx, dy, len, hub, bow)
  const cx = round(mx + (-dy / len) * bow * sign)
  const cy = round(my + (dx / len) * bow * sign)
  return `M${round(start.x)},${round(start.y)} Q${cx},${cy} ${round(tip.x)},${round(tip.y)}`
}

// ── Layout ──────────────────────────────────────────────────────────

const FALLBACK = { w: 390, h: 844 }

/** Exported for static geometry verification. */
export function buildGraph(w: number, h: number): Graph {
  const narrow = w < 560
  const fp = narrow ? (w < 380 ? 10.5 : 11.5) : 13
  const fg = fp + 0.5
  const fs = Math.max(8, fp - 2)

  const logo = Math.max(46, Math.min(92, Math.min(w, h) * 0.084))
  const word = Math.max(15, Math.min(28, Math.min(w, h) * 0.027))
  const brandHalf = (logo + 10 + word * 1.2) / 2

  const hub: Pt = { x: w / 2, y: h * 0.44 }
  const safeTop = narrow ? 74 : 78
  const safeBottom = narrow ? 126 : 132
  const gapY = Math.max(13, fp * 1.25)
  const gapX = Math.max(9, fp * 0.8)

  const sizeOf = (def: ProductDef | WorkspaceDef, kind: NodeKind) =>
    boxSize(
      (def as ProductDef).lines,
      kind === 'group' ? (def as WorkspaceDef).sub : undefined,
      kind === 'group' ? fg : fp,
      fs,
      kind,
    )

  const productBox = (id: string, cx: number, top: number): Box => {
    const size = sizeOf(PRODUCTS[id], 'product')
    return { x: Math.round(cx - size.w / 2), y: Math.round(top), w: size.w, h: size.h }
  }
  const groupBox = (id: string, cx: number, top: number): Box => {
    const def = WORKSPACES.find((ws) => ws.id === id)!
    const size = sizeOf(def, 'group')
    return { x: Math.round(cx - size.w / 2), y: Math.round(top), w: size.w, h: size.h }
  }

  const nodes: GraphNode[] = []

  // ── Sales lobe: products in a row above the workspace node, above the hub ──
  const sales = WORKSPACES[0]
  const salesProducts = sales.products.map((id) => ({ id, size: sizeOf(PRODUCTS[id], 'product') }))
  const rowWidth =
    salesProducts.reduce((sum, item) => sum + item.size.w, 0) + gapX * (salesProducts.length - 1)
  let cursor = Math.round(hub.x - rowWidth / 2)
  const salesRowTop = safeTop
  const salesRowHeight = Math.max(...salesProducts.map((item) => item.size.h))
  for (const item of salesProducts) {
    const box: Box = {
      x: cursor,
      y: Math.round(salesRowTop + (salesRowHeight - item.size.h) / 2),
      w: item.size.w,
      h: item.size.h,
    }
    cursor += item.size.w + gapX
    nodes.push({ id: item.id, kind: 'product', lines: PRODUCTS[item.id].lines, hot: PRODUCTS[item.id].hot, box })
  }

  const salesGroupSize = sizeOf(sales, 'group')
  const salesGroupBox = groupBox(
    'sales',
    hub.x,
    Math.max(
      Math.round(salesRowTop + salesRowHeight + gapY),
      Math.round(hub.y - brandHalf - gapY * 1.5 - salesGroupSize.h),
    ),
  )
  nodes.push({
    id: sales.id,
    kind: 'group',
    lines: sales.lines,
    sub: sales.sub,
    box: salesGroupBox,
  })

  // ── Bottom lobes: Operations (right) and Finance (left) ──
  // Children fan outward in two rows so a branch never crosses a sibling,
  // and each lobe keeps its own start row so narrow screens stay readable.
  const bottomBase = Math.round(hub.y + brandHalf)

  interface RowItem {
    pid: string
    size: { w: number; h: number }
  }

  interface Lobe {
    ws: WorkspaceDef
    group: { w: number; h: number }
    rows: RowItem[][]
    spread: number
    extent: number
    startRow: number
    x: number
  }

  // Very narrow screens give every child its own row; wider screens fan the
  // first two children sideways so the lobe stays compact without crossings.
  const stacked = w < 350

  const lobes: Lobe[] = WORKSPACES.slice(1).map((ws, index) => {
    const group = sizeOf(ws, 'group')
    const ids = ws.products
    const item = (pid: string): RowItem => ({ pid, size: sizeOf(PRODUCTS[pid], 'product') })
    const rows: RowItem[][] = stacked
      ? ids.map((pid) => [item(pid)])
      : ids.length > 1
        ? [ids.slice(0, ids.length - 1).map(item), ids.slice(ids.length - 1).map(item)]
        : [ids.map(item)]
    const spread =
      rows[0].length > 1 ? Math.max(...rows[0].map((entry) => entry.size.w / 2)) + 14 : 0
    const extent = Math.max(
      group.w / 2,
      ...rows.flatMap((row) =>
        row.length > 1
          ? row.map((entry) => spread + entry.size.w / 2)
          : row.map((entry) => entry.size.w / 2),
      ),
    )
    return {
      ws,
      group,
      rows,
      spread,
      extent,
      startRow: narrow ? index + 1 : 1,
      x: 0,
    }
  })

  // Narrow screens stack the lobes in different rows, so each lobe only has to
  // fit the viewport. Wide screens share rows, so the columns must not touch.
  const opsLobe = lobes[0]
  const finLobe = lobes[1]
  opsLobe.x = Math.min(Math.round(w * (narrow ? 0.68 : 0.74)), Math.round(w - 8 - opsLobe.extent))
  finLobe.x = Math.max(Math.round(w * (narrow ? 0.28 : 0.24)), Math.round(8 + finLobe.extent))
  if (!narrow && finLobe.x + finLobe.extent > opsLobe.x - opsLobe.extent) {
    const mid = w / 2
    finLobe.x = Math.round(mid - 12 - finLobe.extent)
    opsLobe.x = Math.round(mid + 12 + opsLobe.extent)
  }

  const rowIds = [
    ...new Set(lobes.flatMap((lobe) => lobe.rows.map((_, index) => lobe.startRow + index))),
  ].sort((a, b) => a - b)
  const rowHeights = rowIds.map((row) => {
    const items = lobes.flatMap((lobe) => lobe.rows[row - lobe.startRow] ?? [])
    return items.length ? Math.max(...items.map((entry) => entry.size.h)) : 0
  })
  const maxGroupHeight = Math.max(...lobes.map((lobe) => lobe.group.h))

  // Short viewports compress the row gaps instead of pushing nodes off screen.
  const maxBottom = h - safeBottom
  let bottomGap = gapY
  let bottomTop = bottomBase + Math.round(bottomGap * 1.7)
  let rowTops: number[] = []
  for (let attempt = 0; attempt < 14; attempt += 1) {
    bottomTop = bottomBase + Math.round(bottomGap * 1.7)
    rowTops = []
    let cursorRow = bottomTop + maxGroupHeight + bottomGap
    for (const height of rowHeights) {
      rowTops.push(Math.round(cursorRow))
      cursorRow += height + bottomGap
    }
    if (cursorRow - bottomGap <= maxBottom || bottomGap <= 9) break
    bottomGap -= 1
  }

  const rowTop = new Map(rowIds.map((row, index) => [row, rowTops[index]]))
  const rowHeight = new Map(rowIds.map((row, index) => [row, rowHeights[index]]))

  /** Branches that skip a row swing wide of the column so nothing is crossed. */
  const deepBow = new Map<string, number>()

  for (const lobe of lobes) {
    const box = groupBox(lobe.ws.id, lobe.x, bottomTop)
    nodes.push({ id: lobe.ws.id, kind: 'group', lines: lobe.ws.lines, sub: lobe.ws.sub, box })

    lobe.rows.forEach((rowItems, rowIndex) => {
      const row = lobe.startRow + rowIndex
      const top = rowTop.get(row)! + (rowHeight.get(row)! - 0) / 2
      rowItems.forEach((entry, index) => {
        const offset =
          rowItems.length > 1 ? (index - (rowItems.length - 1) / 2) * lobe.spread * 2 : 0
        nodes.push({
          id: entry.pid,
          kind: 'product',
          lines: PRODUCTS[entry.pid].lines,
          hot: PRODUCTS[entry.pid].hot,
          box: {
            x: Math.round(lobe.x + offset - entry.size.w / 2),
            y: Math.round(top + (rowHeight.get(row)! - entry.size.h) / 2),
            w: entry.size.w,
            h: entry.size.h,
          },
        })
        if (stacked && rowIndex > 0) deepBow.set(entry.pid, Math.round((lobe.extent + 16) * 2))
      })
    })
  }

  const byId = new Map(nodes.map((node) => [node.id, node]))
  const boxOf = (id: string): Box => byId.get(id)!.box

  // ── Off-screen branches keep the network reading as continuous ──
  const extensionTips: Array<{ id: string; from: string; tip: Pt; bow: number; affected?: boolean }> = [
    { id: 'ext-top', from: 'rfq', tip: { x: -w * 0.18, y: safeTop * 0.35 }, bow: 26 },
    { id: 'ext-right', from: 'waybill', tip: { x: w * 1.18, y: h * 0.7 }, bow: 34 },
    { id: 'ext-bottom', from: 'payments', tip: { x: -w * 0.12, y: h * 1.08 }, bow: 30, affected: true },
  ]

  const edges: GraphEdge[] = []
  let delay = 0.22
  const push = (edge: Omit<GraphEdge, 'delay'>) => {
    edges.push({ ...edge, delay: round(delay * 100) / 100 })
    delay += 0.14
  }

  push({
    id: 'hub-sales',
    tier: 'primary',
    bow: 16,
    d: edgePath({ x: hub.x, y: hub.y, w: 0, h: 0 }, salesGroupBox, hub, 16),
  })
  push({
    id: 'hub-operations',
    tier: 'primary',
    bow: 18,
    d: edgePath({ x: hub.x, y: hub.y, w: 0, h: 0 }, boxOf('operations'), hub, 18),
  })
  push({
    id: 'hub-finance',
    tier: 'primary',
    affected: true,
    bow: 18,
    d: edgePath({ x: hub.x, y: hub.y, w: 0, h: 0 }, boxOf('finance'), hub, 18),
  })

  for (const ws of WORKSPACES) {
    for (const pid of ws.products) {
      push({
        id: `${ws.id}-${pid}`,
        tier: 'secondary',
        bow: deepBow.get(pid) ?? 14,
        d: edgePath(boxOf(ws.id), boxOf(pid), hub, deepBow.get(pid) ?? 14),
      })
    }
  }

  push({
    id: 'handoff-csr-payments',
    tier: 'handoff',
    affected: true,
    bow: 26,
    d: edgePath(boxOf('csr'), boxOf('payments'), hub, 26),
  })

  for (const tip of extensionTips) {
    push({
      id: tip.id,
      tier: 'extension',
      affected: tip.affected,
      bow: tip.bow,
      d: branchPath(boxOf(tip.from), tip.tip, hub, tip.bow),
    })
    nodes.push({
      id: tip.id,
      kind: 'extension',
      lines: [],
      box: { x: Math.round(tip.tip.x - 3), y: Math.round(tip.tip.y - 3), w: 6, h: 6 },
    })
  }

  for (const node of nodes) {
    if (AFFECTED_NODES.has(node.id)) node.affected = true
  }

  const ring = Math.max(
    120,
    Math.round(Math.abs(hub.y - center(boxOf('sales')).y) * 0.98),
  )

  return { w, h, hub, ring, nodes, edges }
}

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
  const narrow = graph.w < 560
  const font = narrow ? (graph.w < 380 ? 10.5 : 11.5) : 13
  const groupFont = font + 0.5
  const subFont = Math.max(8, font - 2)

  return (
    <svg
      className="clp-tree"
      viewBox={`0 0 ${graph.w} ${graph.h}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="BIGDROPS workspace network: Sales, Operations and Finance workspaces linked to RFQ, Cost and Pricing Sheets, Quotation, Invoice, Waybill, Customer Service Reports and Payments"
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
}: {
  enhanced: boolean
  state: PreviewNetworkState
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

  useEffect(() => {
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

  return (
    <div className="clp-tree-wrap" ref={wrapRef}>
      <GraphSurface graph={graph} enhanced={enhanced} state={state} />
    </div>
  )
}
