import { buildGraph } from './src/components/cold-launch/PreviewTree'
const g = buildGraph(1280, 720)
for (const n of g.nodes) {
  const b = n.box
  console.log(n.id.padEnd(14), Math.round(b.x), Math.round(b.y), Math.round(b.x + b.w), Math.round(b.y + b.h))
}
console.log('hub', g.hub)
