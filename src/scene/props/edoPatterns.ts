/**
 * The five Edo patterns (item 793, the owner's 「這些花紋可以加入到員工或是客人的衣服上」 with a sheet of them, "Patterns of Edo"; and
 * Origin's item 763, the mats' and the table cloths'): 七宝 shippou (rings a quarter over each other), the striped blocks (幾何), 麻の葉
 * asanoha (the hemp leaf), 梅 ume (plum blossoms between dotted lines) and 青海波 seigaiha (the waves). Each is drawn on a 2D canvas in
 * the rectangle (x, y, w, h), clipped to it, its repeats laid from its top left corner and fitted to a whole number across and down
 * (seamUnit), so a picture drawn whole by one repeats without a seam. Drawn only: whoever uses one makes its own texture (signTexture,
 * canvasTex) and gives it its colours.
 */

/** how one's drawn: its ground (left as it is if none), its lines' colour and width (px), one repeat's size (px), a gold edge along its
 * lines (its colour and how far it shows each side, px), its flowers' colour (shippou's four petals, ume's plum) */
export type EdoOpts = {
  bg?: string
  line?: string
  lw?: number
  unit?: number
  gold?: { color: string; w: number } | false
  flower?: string
}
export type EdoKind = 'shippou' | 'blocks' | 'asanoha' | 'ume' | 'seigaiha'

/** the sheet's own colours, each pattern's (the owner's picture): wine red and cream; black and white; pink and a deeper pink; black,
 * white and a gold heart; wine red and cream */
export const EDO_LOOKS: Record<EdoKind, Required<Pick<EdoOpts, 'bg' | 'line'>> & EdoOpts> = {
  shippou: { bg: '#7a1f2b', line: '#f2e8da', flower: '#f2e8da' },
  blocks: { bg: '#141313', line: '#efeeea' },
  asanoha: { bg: '#f3a8a4', line: '#c2486c' },
  ume: { bg: '#161515', line: '#e9e6e0', flower: '#f4f0ea' },
  seigaiha: { bg: '#7a1f2b', line: '#f2e8da' },
}

/** a repeat's size fitted to `extent`: a whole number of them across it (at least one), as near `unit` as that allows */
export function seamUnit(extent: number, unit: number) {
  return extent / Math.max(1, Math.round(extent / unit))
}
/** how many rows of an alternating pattern fit `extent` at about `row` each, an even number (each other row is set over by half) */
export function evenRows(extent: number, row: number) {
  return 2 * Math.max(1, Math.round(extent / (2 * row)))
}

/** a path stroked: with a gold edge first (wider, under it) if asked */
function stroke(g: CanvasRenderingContext2D, o: EdoOpts, lw: number, line: string) {
  if (o.gold) { g.strokeStyle = o.gold.color; g.lineWidth = lw + 2 * o.gold.w; g.stroke() }
  g.strokeStyle = line
  g.lineWidth = lw
  g.stroke()
}
/** clipped to (x, y, w, h), its ground laid if it's given */
function begin(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, bg?: string) {
  g.save()
  g.beginPath()
  g.rect(x, y, w, h)
  g.clip()
  if (bg) { g.fillStyle = bg; g.fillRect(x, y, w, h) }
  g.lineCap = 'round'
  g.lineJoin = 'round'
}

/** 七宝 (shippou): equal rings on a square grid each over its four neighbours by a quarter of its round (their radius the grid's half
 * diagonal: they meet four at a time at the grid's cells' middles), a four-petalled flower in each ring and a dot where they meet */
export function shippou(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, o: EdoOpts = {}) {
  const L = EDO_LOOKS.shippou, unit = o.unit ?? 64
  const a = seamUnit(w, unit), b = seamUnit(h, unit), r = Math.hypot(a, b) / 2
  const lw = o.lw ?? Math.max(1, unit / 26), line = o.line ?? L.line, flower = o.flower ?? o.line ?? L.flower!
  begin(g, x, y, w, h, o.bg ?? L.bg)
  const ni = Math.round(w / a), nj = Math.round(h / b)
  for (let i = -1; i <= ni + 1; i++) for (let j = -1; j <= nj + 1; j++) {
    g.beginPath()
    g.arc(x + i * a, y + j * b, r, 0, Math.PI * 2)
    stroke(g, o, lw, line)
  }
  g.fillStyle = flower
  for (let i = -1; i <= ni + 1; i++) for (let j = -1; j <= nj + 1; j++) {
    const cx = x + i * a, cy = y + j * b, pr = r * 0.15, pd = r * 0.17
    // (its four petals, on the diagonals, each a round one a little long, and the small round where they meet)
    for (let k = 0; k < 4; k++) {
      const t = Math.PI / 4 + (k * Math.PI) / 2
      g.beginPath()
      g.ellipse(cx + Math.cos(t) * pd, cy + Math.sin(t) * pd, pr, pr * 0.82, t, 0, Math.PI * 2)
      g.fill()
    }
    // (a dot where four rings meet)
    g.beginPath()
    g.arc(cx + a / 2, cy + b / 2, r * 0.07, 0, Math.PI * 2)
    g.fill()
  }
  g.restore()
}

/** the striped blocks (the sheet's "geometric"): a honeycomb of upright hexagons, each three rhombi round its middle (a block seen from a
 * corner), each rhombus filled with a few lines along one of its sides, each of the three its own way round (a pinwheel) */
export function blocks(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, o: EdoOpts & { stripes?: number } = {}) {
  const L = EDO_LOOKS.blocks, unit = o.unit ?? 64
  // (an upright hexagon `unit` across; across, a whole number of them; down, an even number of rows 3/4 of its height apart)
  const sx = seamUnit(w, unit), rows = evenRows(h, (unit / Math.sqrt(3)) * 1.5), sy = h / rows
  const hy = sy / 1.5
  const lw = o.lw ?? Math.max(1, unit / 30), line = o.line ?? L.line, n = o.stripes ?? 4
  begin(g, x, y, w, h, o.bg ?? L.bg)
  const ni = Math.round(w / sx)
  for (let j = -1; j <= rows + 1; j++) for (let i = -1; i <= ni + 1; i++) {
    const cx = x + i * sx + (j & 1 ? sx / 2 : 0), cy = y + j * sy
    const V = {
      top: [cx, cy - hy], ur: [cx + sx / 2, cy - hy / 2], lr: [cx + sx / 2, cy + hy / 2],
      bottom: [cx, cy + hy], ll: [cx - sx / 2, cy + hy / 2], ul: [cx - sx / 2, cy - hy / 2],
    }
    // (each rhombus from the middle: its two sides out of it, and the side its lines run along)
    const faces: [number[], number[], 'u' | 'v'][] = [[V.ul, V.ur, 'u'], [V.ul, V.bottom, 'v'], [V.ur, V.bottom, 'u']]
    for (const [P, Q, along] of faces) {
      const ux = P[0] - cx, uy = P[1] - cy, vx = Q[0] - cx, vy = Q[1] - cy
      g.beginPath()
      for (let k = 0; k < n; k++) {
        // (its lines set in from its edges: each a step across, ending a little short of the sides they meet)
        const t = (k + 0.5) / n, e0 = 0.08, e1 = 0.92
        if (along === 'u') { g.moveTo(cx + vx * t + ux * e0, cy + vy * t + uy * e0); g.lineTo(cx + vx * t + ux * e1, cy + vy * t + uy * e1) }
        else { g.moveTo(cx + ux * t + vx * e0, cy + uy * t + vy * e0); g.lineTo(cx + ux * t + vx * e1, cy + uy * t + vy * e1) }
      }
      stroke(g, o, lw, line)
    }
  }
  g.restore()
}

/** 麻の葉 (asanoha): a grid of equal triangles, their sides drawn and each one's corners joined to its middle (the hemp leaf's six-pointed
 * stars round every point of the grid) */
export function asanoha(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, o: EdoOpts = {}) {
  const L = EDO_LOOKS.asanoha, unit = o.unit ?? 64
  const s = seamUnit(w, unit), rows = evenRows(h, (s * Math.sqrt(3)) / 2), H = h / rows
  const lw = o.lw ?? Math.max(1, unit / 40), line = o.line ?? L.line
  begin(g, x, y, w, h, o.bg ?? L.bg)
  const ni = Math.round(w / s)
  const P = (i: number, j: number): [number, number] => [x + (i + (j & 1 ? 0.5 : 0)) * s, y + j * H]
  const tri = (A: [number, number], B: [number, number], C: [number, number]) => {
    const mx = (A[0] + B[0] + C[0]) / 3, my = (A[1] + B[1] + C[1]) / 3
    g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.lineTo(C[0], C[1]); g.closePath()
    for (const Q of [A, B, C]) { g.moveTo(Q[0], Q[1]); g.lineTo(mx, my) }
  }
  g.beginPath()
  for (let j = -1; j <= rows; j++) for (let i = -2; i <= ni + 1; i++) {
    if ((j & 1) === 0) { tri(P(i, j), P(i - 1, j + 1), P(i, j + 1)); tri(P(i, j), P(i + 1, j), P(i, j + 1)) }
    else { tri(P(i, j), P(i, j + 1), P(i + 1, j + 1)); tri(P(i, j), P(i + 1, j), P(i + 1, j + 1)) }
  }
  stroke(g, o, lw, line)
  g.restore()
}

/** 梅 (ume): five-petalled plum blossoms in columns, each column set half a step down from the next, dotted lines between the columns */
export function ume(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, o: EdoOpts & { heart?: string } = {}) {
  const L = EDO_LOOKS.ume, unit = o.unit ?? 64
  const a = seamUnit(w, unit), b = seamUnit(h, unit)
  const lw = o.lw ?? Math.max(1, unit / 40), line = o.line ?? L.line, flower = o.flower ?? L.flower!
  begin(g, x, y, w, h, o.bg ?? L.bg)
  const ni = Math.round(w / a), nj = Math.round(h / b)
  // (the dotted lines: halfway between the columns, a dot every twelfth of a step)
  g.fillStyle = line
  for (let i = -1; i <= ni; i++) for (const fx of [0, 0.5]) {
    const lx = x + (i + fx) * a
    for (let d = 0; d <= h; d += b / 12) { g.beginPath(); g.arc(lx, y + d, lw * 0.6, 0, Math.PI * 2); g.fill() }
  }
  const bloom = (cx: number, cy: number) => {
    const pr = a * 0.085, pd = a * 0.088
    g.beginPath()
    for (let k = 0; k < 5; k++) {
      const t = -Math.PI / 2 + (k * 2 * Math.PI) / 5
      g.moveTo(cx + Math.cos(t) * pd + pr, cy + Math.sin(t) * pd)
      g.arc(cx + Math.cos(t) * pd, cy + Math.sin(t) * pd, pr, 0, Math.PI * 2)
    }
    if (o.gold) { g.strokeStyle = o.gold.color; g.lineWidth = 2 * o.gold.w; g.stroke() }
    g.fillStyle = flower
    g.fill()
    // (its heart: a small round of the ground's colour, and a ring of stamens round it)
    g.beginPath(); g.arc(cx, cy, a * 0.028, 0, Math.PI * 2); g.fillStyle = o.heart ?? o.bg ?? L.bg; g.fill()
    g.fillStyle = o.heart ?? o.bg ?? L.bg
    for (let k = 0; k < 5; k++) {
      const t = -Math.PI / 2 + Math.PI / 5 + (k * 2 * Math.PI) / 5
      g.beginPath(); g.arc(cx + Math.cos(t) * a * 0.05, cy + Math.sin(t) * a * 0.05, a * 0.009, 0, Math.PI * 2); g.fill()
    }
  }
  for (let i = -1; i <= ni; i++) for (let j = -1; j <= nj; j++) {
    bloom(x + (i + 0.25) * a, y + (j + 0.25) * b)
    bloom(x + (i + 0.75) * a, y + (j + 0.75) * b)
  }
  g.restore()
}

/** 青海波 (seigaiha): rows of fans of rings, each fan as wide as `unit`, each row half a fan over from the last and a quarter of a fan
 * down, the lower over the upper (each fan's ground laid first, so it covers what's behind it) */
export function seigaiha(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, o: EdoOpts & { rings?: number } = {}) {
  const L = EDO_LOOKS.seigaiha, unit = o.unit ?? 64
  const u = seamUnit(w, unit), R = u / 2, rows = evenRows(h, R / 2), rh = h / rows
  const lw = o.lw ?? Math.max(1, unit / 30), line = o.line ?? L.line, bg = o.bg ?? L.bg, rings = o.rings ?? 4
  begin(g, x, y, w, h, bg)
  const ni = Math.round(w / u)
  for (let j = -3; j <= rows + 2; j++) for (let i = -1; i <= ni + 1; i++) {
    const cx = x + i * u + (j & 1 ? R : 0), cy = y + j * rh
    g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fillStyle = bg; g.fill()
    for (let k = 0; k < rings; k++) {
      const rr = R * (1 - k / rings) - lw / 2
      if (rr <= lw) break
      g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI * 2)
      stroke(g, o, lw, line)
    }
  }
  g.restore()
}

/** any of them by its name */
export const EDO_PATTERNS: Record<EdoKind, (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, o?: EdoOpts) => void> = {
  shippou, blocks, asanoha, ume, seigaiha,
}
