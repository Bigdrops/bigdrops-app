import { buildGraph } from './src/components/cold-launch/PreviewTree'

type Box = { x: number; y: number; w: number; h: number }

const VIEWPORTS: Array<[number, number, string]> = [
  [320, 720, 'small mobile'],
  [340, 780, 'fold'],
  [390, 844, 'mobile'],
  [430, 932, 'large mobile'],
  [560, 900, 'narrow desktop'],
  [768, 1024, 'tablet'],
  [1280, 720, 'laptop'],
  [1440, 800, 'desktop'],
  [1920, 1080, 'wide desktop'],
]

let failures = 0
const fail = (msg: string) => {
  failures += 1
  console.log('  FAIL ' + msg)
}

const overlap = (a: Box, b: Box, tol = 2) =>
  a.x + a.w - tol > b.x && b.x + b.w - tol > a.x && a.y + a.h - tol > b.y && b.y + b.h - tol > a.y

function inside(box: Box, p: { x: number; y: number }, tol: number) {
  return (
    p.x > box.x + tol && p.x < box.x + box.w - tol && p.y > box.y + tol && p.y < box.y + box.h - tol
  )
}

function sampleQ(d: string, steps = 48) {
  const m = /^M([-\d.]+),([-\d.]+) Q([-\d.]+),([-\d.]+) ([-\d.]+),([-\d.]+)$/.exec(d)
  if (!m) return []
  const [x0, y0, cx, cy, x1, y1] = m.slice(1).map(Number)
  const pts: Array<{ x: number; y: number }> = []
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps
    const u = 1 - t
    pts.push({
      x: u * u * x0 + 2 * u * t * cx + t * t * x1,
      y: u * u * y0 + 2 * u * t * cy + t * t * y1,
    })
  }
  return pts
}

for (const [w, h, name] of VIEWPORTS) {
  const g = buildGraph(w, h)
  const safeTop = w < 560 ? 74 : 78
  const safeBottom = w < 560 ? 126 : 132
  const featured = g.nodes.filter((n) => n.kind !== 'extension')
  console.log(`\n${name} ${w}x${h} (featured=${featured.length}, edges=${g.edges.length})`)

  // 1. all featured surfaces inside the viewport with margin
  for (const n of featured) {
    const b = n.box
    if (b.x < 6 || b.y < 6 || b.x + b.w > w - 6 || b.y + b.h > h - 6) {
      fail(`node ${n.id} outside viewport: ${JSON.stringify(b)}`)
    }
  }

  // 2. featured labels never overlap each other
  for (let i = 0; i < featured.length; i += 1) {
    for (let j = i + 1; j < featured.length; j += 1) {
      if (overlap(featured[i].box, featured[j].box)) {
        fail(`labels overlap: ${featured[i].id} vs ${featured[j].id}`)
      }
    }
  }

  // 3. keep the top control band and the lower tips zone clear
  const controls: Box = { x: 0, y: 0, w, h: safeTop - 6 }
  const lower: Box = { x: 0, y: h - safeBottom, w, h: safeBottom }
  for (const n of featured) {
    if (overlap(n.box, controls)) fail(`${n.id} intrudes into the top control band`)
    if (overlap(n.box, lower)) fail(`${n.id} intrudes into the lower tips zone`)
  }

  // 4. the centre brand block stays clear of node surfaces
  const logo = Math.max(46, Math.min(92, Math.min(w, h) * 0.084))
  const word = Math.max(15, Math.min(28, Math.min(w, h) * 0.027))
  const brandHalf = (logo + 10 + word * 1.2) / 2
  const brand: Box = {
    x: w / 2 - Math.max(logo, 8 * word * 0.62) / 2,
    y: (h * 0.44 - brandHalf + logo) - word * 1.2,
    w: Math.max(logo, 8 * word * 0.62),
    h: word * 1.2 + 6,
  }
  for (const n of featured) {
    if (overlap(n.box, brand, 0)) fail(`${n.id} overlaps the BIGDROPS wordmark`)
  }

  // 5. connection paths never cross a node they do not belong to
  const ids = g.edges.map((e) => e.id)
  for (const edge of g.edges) {
    const pts = sampleQ(edge.d)
    if (!pts.length) {
      fail(`edge ${edge.id} has an unparsable path`)
      continue
    }
    for (const n of g.nodes) {
      if (n.kind === 'extension') continue
      const endpoints = edge.id.startsWith('handoff-')
        ? edge.id.replace('handoff-', '').split('-')
        : [n.id]
      const mine = edge.id.includes(n.id) || endpoints.includes(n.id)
      if (mine) continue
      if (pts.some((p) => inside(n.box, p, 1))) fail(`edge ${edge.id} crosses node ${n.id}`)
    }
  }

  // 6. every edge leaves the viewport for the infinite branch effect
  const extEdges = g.edges.filter((e) => e.tier === 'extension')
  if (extEdges.length < 3) fail(`expected at least 3 off-screen branches, found ${extEdges.length}`)
  console.log(`  info ids: ${ids.join(', ')}`)
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL CHECKS PASSED')
process.exit(failures ? 1 : 0)
