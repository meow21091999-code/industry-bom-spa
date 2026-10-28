import React, { useMemo } from 'react'

/* ------------------------------------------------------------------
   A small, dependency-free renderer for the registry's Mermaid
   `graph TD` sources. These are trees: one root, children beneath it,
   two or three levels deep. We parse nodes / edges / classDef / class
   and lay them out left-to-right as a tidy tree in SVG.

   No CDN, no runtime library, no WASM — so it renders offline and can
   be verified by server-rendering.
   ------------------------------------------------------------------ */

const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ',
  '&mdash;': '—', '&ndash;': '–', '&middot;': '·', '&rarr;': '→', '&hellip;': '…', '&#8377;': '₹' }

function decode(s) {
  let t = String(s || '')
  for (const [k, v] of Object.entries(ENT)) t = t.split(k).join(v)
  return t.replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
}

function parse(source) {
  const nodes = new Map()   // id -> { id, lines, cls }
  const edges = []          // [from, to]
  const defs = new Map()    // className -> { fill, stroke, color }
  const assign = new Map()  // id -> className

  const ensure = id => {
    if (!nodes.has(id)) nodes.set(id, { id, lines: [id], cls: null })
    return nodes.get(id)
  }

  for (const raw of String(source || '').split('\n')) {
    const line = raw.trim()
    if (!line || /^graph\s|^flowchart\s|^%%/.test(line)) continue

    const cd = line.match(/^classDef\s+(\w+)\s+(.+?);?$/)
    if (cd) {
      const style = {}
      for (const part of cd[2].split(',')) {
        const [k, v] = part.split(':').map(x => x.trim())
        if (k && v) style[k] = v
      }
      defs.set(cd[1], style)
      continue
    }

    const cl = line.match(/^class\s+([\w,\s]+?)\s+(\w+)\s*;?$/)
    if (cl) {
      for (const id of cl[1].split(',').map(x => x.trim()).filter(Boolean)) assign.set(id, cl[2])
      continue
    }

    // node definitions — they appear alone AND inline on edge lines:
    //   A["label"]        L0 --> A["label"]
    for (const nd of line.matchAll(/(\w+)\s*\[\s*["']?([\s\S]*?)["']?\s*\]/g)) {
      const lines2 = decode(nd[2].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''))
        .split('\n').map(x => x.trim()).filter(Boolean)
      const n = ensure(nd[1])
      if (lines2.length) n.lines = lines2
    }

    // edge, possibly with a label:  A --> B   |   A -->|text| B
    const ed = line.match(/^(\w+)\s*-->\s*(?:\|[^|]*\|\s*)?(\w+)/)
    if (ed) {
      ensure(ed[1]); ensure(ed[2])
      edges.push([ed[1], ed[2]])
    }
  }

  for (const [id, cls] of assign) {
    const n = nodes.get(id)
    if (n) n.cls = cls
  }

  return { nodes, edges, defs }
}

const NODE_W = 208
const PAD = 10
const LINE_H = 14
const GAP_X = 64
const GAP_Y = 12

function wrap(text, max = 26) {
  const words = String(text).split(/\s+/)
  const out = []
  let cur = ''
  for (const w of words) {
    if (!cur) cur = w
    else if ((cur + ' ' + w).length <= max) cur += ' ' + w
    else { out.push(cur); cur = w }
  }
  if (cur) out.push(cur)
  return out
}

export default function Diagram({ source }) {
  const model = useMemo(() => {
    const { nodes, edges, defs } = parse(source)
    if (!nodes.size) return null

    // children / parent
    const children = new Map()
    const parent = new Map()
    for (const id of nodes.keys()) children.set(id, [])
    for (const [a, b] of edges) {
      children.get(a)?.push(b)
      if (!parent.has(b)) parent.set(b, a)
    }

    const roots = [...nodes.keys()].filter(id => !parent.has(id))
    const level = new Map()
    const order = []
    const walk = (id, depth) => {
      if (level.has(id)) return
      level.set(id, depth)
      order.push(id)
      for (const c of children.get(id) || []) walk(c, depth + 1)
    }
    roots.forEach(r => walk(r, 0))
    // any node not reached (cycles) — place at depth 0
    for (const id of nodes.keys()) if (!level.has(id)) walk(id, 0)

    // leaf-order y placement, parents centred on children
    let slot = 0
    const y = new Map()
    const heights = new Map()
    for (const [id, n] of nodes) {
      const lines = n.lines.flatMap(l => wrap(l))
      heights.set(id, Math.max(34, lines.length * LINE_H + PAD * 2))
      n._lines = lines
    }
    const place = id => {
      const kids = (children.get(id) || []).filter(k => level.get(k) > level.get(id))
      if (!kids.length) { y.set(id, slot); slot += 1; return }
      kids.forEach(place)
      const ys = kids.map(k => y.get(k))
      y.set(id, (Math.min(...ys) + Math.max(...ys)) / 2)
    }
    roots.forEach(place)
    for (const id of nodes.keys()) if (!y.has(id)) { y.set(id, slot); slot += 1 }

    const rowH = Math.max(...heights.values()) + GAP_Y
    const maxLevel = Math.max(...level.values())
    const width = (maxLevel + 1) * (NODE_W + GAP_X) + GAP_X
    const height = Math.max(1, slot) * rowH + GAP_Y

    const pos = id => ({
      x: GAP_X + level.get(id) * (NODE_W + GAP_X),
      y: GAP_Y + y.get(id) * rowH,
      h: heights.get(id),
    })

    return { nodes, edges, defs, pos, width, height }
  }, [source])

  if (!model) return <pre className="diagram-fallback">{source}</pre>

  const { nodes, edges, defs, pos, width, height } = model

  return (
    <div className="diagram-shell">
      <div className="diagram-scroll">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="System overview diagram">
          {edges.map(([a, b], i) => {
            const p = pos(a), c = pos(b)
            if (!p || !c) return null
            const x1 = p.x + NODE_W, y1 = p.y + p.h / 2
            const x2 = c.x, y2 = c.y + c.h / 2
            const mx = (x1 + x2) / 2
            return (
              <path key={i} d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
                fill="none" stroke="var(--border-bright)" strokeWidth="1.5" />
            )
          })}

          {[...nodes.values()].map(n => {
            const p = pos(n.id)
            const style = n.cls ? defs.get(n.cls) || {} : {}
            const fill = style.fill || 'var(--surface)'
            const stroke = style.stroke || 'var(--border-bright)'
            const color = style.color || 'var(--text)'
            return (
              <g key={n.id}>
                <rect x={p.x} y={p.y} width={NODE_W} height={p.h} rx="7"
                  fill={fill} stroke={stroke} strokeWidth="1.5" />
                {n._lines.map((ln, i) => (
                  <text key={i} x={p.x + NODE_W / 2} y={p.y + PAD + 11 + i * LINE_H}
                    textAnchor="middle" fontSize="11.5"
                    fontFamily="IBM Plex Sans, system-ui, sans-serif"
                    fill={color}>
                    {ln}
                  </text>
                ))}
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
