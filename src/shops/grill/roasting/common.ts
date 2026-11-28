import { shopPicture } from '@/scene/render/flatGate'
import * as THREE from 'three'
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { reflectStudio } from '@/scene/render/studio'
import { forPhone } from '@/shops/grill/kitchen/ware'
import { ALONG, FLOOR_NEAR, GRILL_COUNTERS, LAY, toGrillScene } from '@/shops/grill/bar'
import { COOK_TABLE } from './kitchen'

/**
 * The tray's planed cedar: three boards with the grain running along them, drawn as wavering growth lines that
 * bunch round a knot or two, a dark seam between boards, and a few darker stains where wet food has sat. Mapped
 * in the tray's own units (one texture across 1.6 x 1.6).
 */
export const TRAY_WOOD = (() => {
  if (typeof document === 'undefined') return null
  const S = 1024
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  let seed = 3
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  g.fillStyle = '#c4935a'
  g.fillRect(0, 0, S, S)
  const boards = 3
  const bh = S / boards
  for (let b = 0; b < boards; b++) {
    const y0 = b * bh
    // each board its own shade
    g.fillStyle = `rgba(${150 + rnd() * 40}, ${100 + rnd() * 25}, ${55 + rnd() * 20}, 0.35)`
    g.fillRect(0, y0, S, bh)
    // a knot or two that the grain flows round
    const knots = Array.from({ length: 1 + Math.floor(rnd() * 2) }, () => ({ x: rnd() * S, y: y0 + bh * (0.25 + rnd() * 0.5),
      r: 10 + rnd() * 14 }))
    for (let k = 0; k < 46; k++) {
      const base = y0 + (k / 46) * bh
      g.strokeStyle = `rgba(${90 + rnd() * 30}, ${55 + rnd() * 15}, 25, ${0.18 + rnd() * 0.32})`
      g.lineWidth = 0.8 + rnd() * 2.2
      g.beginPath()
      for (let x = 0; x <= S; x += 8) {
        let y = base + Math.sin(x * 0.006 + k * 0.7 + b) * 5 + Math.sin(x * 0.021 + k) * 1.5
        for (const kn of knots) {
          const dx = x - kn.x
          const dy = y - kn.y
          const d2 = dx * dx + dy * dy
          y += (dy / (Math.sqrt(d2) + 1)) * kn.r * 2.2 * Math.exp(-d2 / (kn.r * kn.r * 9))
        }
        if (x === 0) g.moveTo(x, y)
        else g.lineTo(x, y)
      }
      g.stroke()
    }
    for (const kn of knots) {
      const grad = g.createRadialGradient(kn.x, kn.y, 1, kn.x, kn.y, kn.r)
      grad.addColorStop(0, 'rgba(70, 38, 15, 0.95)')
      grad.addColorStop(0.6, 'rgba(110, 62, 28, 0.7)')
      grad.addColorStop(1, 'rgba(110, 62, 28, 0)')
      g.fillStyle = grad
      g.beginPath()
      g.ellipse(kn.x, kn.y, kn.r * 1.5, kn.r, 0, 0, Math.PI * 2)
      g.fill()
    }
    // the seam to the next board
    g.fillStyle = 'rgba(55, 32, 14, 0.75)'
    g.fillRect(0, y0 + bh - 2, S, 3)
    g.fillStyle = 'rgba(255, 230, 190, 0.25)'
    g.fillRect(0, y0 + bh + 1, S, 2)
  }
  // fine pores along the grain
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(80, 45, 20, ${0.15 + rnd() * 0.25})`
    g.fillRect(rnd() * S, rnd() * S, 2 + rnd() * 6, 1)
  }
  // stains where wet food has rested
  for (let i = 0; i < 5; i++) {
    const x = rnd() * S
    const y = rnd() * S
    const r = 30 + rnd() * 60
    const grad = g.createRadialGradient(x, y, r * 0.2, x, y, r)
    grad.addColorStop(0, 'rgba(90, 55, 25, 0.22)')
    grad.addColorStop(1, 'rgba(90, 55, 25, 0)')
    g.fillStyle = grad
    g.fillRect(x - r, y - r, r * 2, r * 2)
  }
  const t = new THREE.CanvasTexture(forPhone(c))
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(1 / 1.6, 1 / 1.6)
  t.anisotropy = 8
  return t
})()
/** a wood texture of blender/woodtex.py's, tiled every `w` x `h` of the table's units */
function woodTex(file: string, w: number, h: number) {
  if (typeof document === 'undefined') return null
  // (not fetched on a phone, which draws no 3D (scene/flatGate))
  const t = shopPicture(file)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(1 / w, 1 / h)
  t.anisotropy = 8
  return t
}
/** the cook's table's top: keyaki planks, cathedral figure, a tile every 1.6 */
export const COOK_TABLE_WOOD = woodTex('keyaki_top.jpg', 1.6, 1.6)
/** its body: cedar boards standing in framed panels, a panel every 0.6 across, one the body's height */
export const COOK_PANEL_WOOD = woodTex('cedar_panel.jpg', 1, 1)
/** the bar's base: boards standing side by side, straight grain and flat-sawn in turn, their grain clear (the owner: it didn't show) */
export const BAR_BASE_WOOD = woodTex('bar_base.jpg', 1, 1)
/** the cook table's dark kick round its foot: as high as the notch steps, so none shows over their backs */
export const KICK_H = 0.09
/** the cook table's top: how thick (its underside this far under the top), how far its edges are rounded over (up and down), and how far
 * the round reaches in from its outer face (item 379, docs/MODELING.md's 造型感: a thick slab, its edges rounded right over, as a chunky made
 * thing reads; it was 8 cm, its edges eased 1.5 cm) */
export const TABLE_T = 0.1
export const TABLE_ROUND = 0.032
export const TABLE_OUT = 0.034
/** below its top: honed white marble with soft grey veining (blender/marbletex.py), a tile 1.2 across (the owner had it dark a while, and
 * wanted it white again) */
export const COOK_MARBLE = woodTex('marble_panel.jpg', 1, 1)
/** a box whose sides carry the panel texture at its true size: each side's u stretched to how wide it is (a panel every `tile` across), v
 * the whole height */
export function panelBox(w: number, h: number, d: number, tile = 0.6) {
  const g = new THREE.BoxGeometry(w, h, d)
  const uv = g.attributes.uv as THREE.BufferAttribute
  // (the faces in order +x, -x, +y, -y, +z, -z, four corners each: the x faces are d wide, the z faces w)
  for (let f = 0; f < 6; f++) {
    const across = f < 2 ? d : f >= 4 ? w : 0
    for (let k = 0; k < 4; k++) uv.setX(f * 4 + k, uv.getX(f * 4 + k) * (across ? across / tile : 1))
  }
  uv.needsUpdate = true
  return g
}
/**
 * The kitchen's floor, inside the counters: from the first counter's floor's edge (lay) and the side counter's (along)
 * to the side counter's near end and the first counter's far end, so it meets the customers' floors without a gap or
 * an overlap (worked out from the counters, in the scene's frame).
 */
export const KITCHEN_FLOOR = (() => {
  const [c0, c1] = GRILL_COUNTERS
  const lay0 = toGrillScene(c0.at.clone().addScaledVector(c0.lay, FLOOR_NEAR)).dot(LAY)
  const along0 = c1 ? toGrillScene(c1.at.clone().addScaledVector(c1.lay, FLOOR_NEAR)).dot(ALONG) : COOK_TABLE.along[0] - 0.4
  const along1 = toGrillScene(c0.at.clone().addScaledVector(c0.along, c0.length / 2 + 0.15)).dot(ALONG)
  const lay1 = c1 ? toGrillScene(c1.at.clone().addScaledVector(c1.along, -c1.length / 2 - 0.35)).dot(LAY) : COOK_TABLE.lay[1] + 0.9
  return { lay: [lay0, lay1], along: [along0, along1] }
})()
/**
 * The cook's table's top, in one piece round its bay: a thick plank top with its edges rounded over (面取り), the
 * grain running on unbroken, its ink outline round the whole shape (no seams where the parts under it meet).
 */
/** a closed outline through these corners, each rounded off to its radius (a curve cut in from both its sides) */
export function roundedShape(pts: [number, number][], radii: number[]) {
  const sh = new THREE.Shape()
  pts.forEach(([x, y], k) => {
    const [px, py] = pts[(k + pts.length - 1) % pts.length], [nx, ny] = pts[(k + 1) % pts.length]
    const dp = Math.hypot(px - x, py - y), dn = Math.hypot(nx - x, ny - y)
    const r = Math.min(radii[k], dp / 2, dn / 2)
    // (a corner left square: the point itself, no arc of nothing (its bevel's way out would be no way at all))
    if (r < 1e-6) {
      if (k) sh.lineTo(x, y)
      else sh.moveTo(x, y)
      return
    }
    const a: [number, number] = [x + (px - x) / dp * r, y + (py - y) / dp * r]
    const b: [number, number] = [x + (nx - x) / dn * r, y + (ny - y) / dn * r]
    if (k) sh.lineTo(a[0], a[1])
    else sh.moveTo(a[0], a[1])
    // (a true quarter circle (the corners are all square): its middle where the offsets of its two ends meet. A quadratic curve bulged a
    // centimetre out past the circle at its middle, and the brass caps made to the circle stood off it at their ends (item 379))
    const cx = a[0] + b[0] - x, cy = a[1] + b[1] - y
    sh.absarc(cx, cy, r, Math.atan2(a[1] - cy, a[0] - cx), Math.atan2(b[1] - cy, b[0] - cx), (a[0] - cx) * (b[1] - cy) - (a[1] - cy) * (b[0] - cx) < 0)
  })
  sh.closePath()
  return sh
}
type P2 = [number, number]
/**
 * A slab through an outline of square corners `pts`, each rounded off to its radius as roundedShape rounds it, extruded and bevelled as
 * ExtrudeGeometry does (its sides are ExtrudeGeometry's own), but its two flat faces cut into even quads where earcut cut them into long
 * slivers fanning out from one corner across the whole face (item 954, the owner's 「灶台區的面數很怪」 with the wireframe of the cook table's
 * top round the hearth). The lines through the outline's own corners cut the face into cells, each one quad; a cell with a rounded corner
 * at a corner of it a square there half its narrower side (or the curve's radius), the curve's piece a ladder across it from the square's
 * inner corner (as blender/common.py's ladder_fill: no fan), the rest of the cell quads; a notch's inside corner, its curve hollow toward the
 * cell, a ladder between the curve and the cell's two sides. Wherever a cut meets the outline, the outline is given that point, so the sides
 * meet the faces point for point. `arc`: the straight steps round each curve (ExtrudeGeometry's curveSegments 4 made 8).
 */
// (the angle under which two of a slab's side facets are drawn as one smooth turn: its round's facets 22.5 degrees apart, its rounded
// corners' 11.25; its square corners 90)
const SIDE_CREASE = (40 * Math.PI) / 180
export function quadSlab(pts: P2[], radii: number[], ex: { depth: number; bevelThickness: number; bevelSize: number; bevelSegments: number }, arc = 8) {
  const n = pts.length
  const near = (p: P2, q: P2) => Math.abs(p[0] - q[0]) < 1e-7 && Math.abs(p[1] - q[1]) < 1e-7
  // ---- the outline: each rounded corner a true quarter circle from its cut-in point on the edge before to the one on the edge after
  const ring: P2[] = []
  const put = (p: P2) => { if (!ring.length || !near(ring[ring.length - 1], p)) ring.push(p) }
  for (let k = 0; k < n; k++) {
    const [x, y] = pts[k], [px, py] = pts[(k + n - 1) % n], [nx, ny] = pts[(k + 1) % n]
    const dp = Math.hypot(px - x, py - y), dn = Math.hypot(nx - x, ny - y)
    const r = Math.min(radii[k] ?? 0, dp / 2, dn / 2)
    if (r < 1e-6) { put([x, y]); continue }
    const a: P2 = [x + (px - x) / dp * r, y + (py - y) / dp * r], b: P2 = [x + (nx - x) / dn * r, y + (ny - y) / dn * r]
    const cx = a[0] + b[0] - x, cy = a[1] + b[1] - y, t0 = Math.atan2(a[1] - cy, a[0] - cx)
    let d = Math.atan2(b[1] - cy, b[0] - cx) - t0
    if (d > Math.PI) d -= 2 * Math.PI
    if (d < -Math.PI) d += 2 * Math.PI
    for (let s = 0; s <= arc; s++) put(s === 0 ? a : s === arc ? b : [cx + Math.cos(t0 + d * s / arc) * r, cy + Math.sin(t0 + d * s / arc) * r])
  }
  if (ring.length > 1 && near(ring[0], ring[ring.length - 1])) ring.pop()
  const onSeg = (p: P2, a: P2, b: P2) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy
    if (l2 < 1e-18) return near(p, a)
    const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2
    if (t < -1e-9 || t > 1 + 1e-9) return false
    const ex = a[0] + dx * t - p[0], ey = a[1] + dy * t - p[1]
    return ex * ex + ey * ey < 1e-14
  }
  const onRing = (p: P2) => { for (let k = 0; k < ring.length; k++) if (onSeg(p, ring[k], ring[(k + 1) % ring.length])) return true; return false }
  const area = (q: P2[]) => { let s = 0; for (let k = 0; k < q.length; k++) { const a = q[k], b = q[(k + 1) % q.length]; s += a[0] * b[1] - b[0] * a[1] } return s / 2 }
  // ---- a cell's piece of the face: the outline clipped to the cell (Sutherland and Hodgman's, one side of it at a time)
  const clip = (poly: P2[], x0: number, x1: number, y0: number, y1: number) => {
    const side = (p: P2[], inside: (q: P2) => boolean, cut: (a: P2, b: P2) => P2) => {
      const out: P2[] = []
      for (let k = 0; k < p.length; k++) {
        const a = p[k], b = p[(k + 1) % p.length], ia = inside(a), ib = inside(b)
        if (ia) out.push(a)
        if (ia !== ib) out.push(cut(a, b))
      }
      return out
    }
    const atX = (x: number) => (a: P2, b: P2): P2 => [x, a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0])]
    const atY = (y: number) => (a: P2, b: P2): P2 => [a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]), y]
    let p = side(poly, (q) => q[0] >= x0 - 1e-9, atX(x0))
    p = side(p, (q) => q[0] <= x1 + 1e-9, atX(x1))
    p = side(p, (q) => q[1] >= y0 - 1e-9, atY(y0))
    p = side(p, (q) => q[1] <= y1 + 1e-9, atY(y1))
    const out: P2[] = []
    for (const q of p) if (!out.length || !near(out[out.length - 1], q)) out.push(q)
    if (out.length > 1 && near(out[0], out[out.length - 1])) out.pop()
    // (a point on a straight run between two others left out: it's on neither the outline's turns nor the cell's)
    return out.filter((q, k) => {
      const a = out[(k + out.length - 1) % out.length], b = out[(k + 1) % out.length]
      return Math.abs((q[0] - a[0]) * (b[1] - a[1]) - (q[1] - a[1]) * (b[0] - a[0])) > 1e-12 || onRing(q)
    })
  }
  const tris: P2[][] = []
  const quad = (a: P2, b: P2, c: P2, d: P2) => { tris.push([a, b, c], [a, c, d]) }
  // (a convex piece: a ladder across it from `s` (a triangle, then quads one rung at a time, a triangle or a quad at the far end), as
  // blender/common.py's ladder_fill)
  const ladder = (q: P2[], s: number) => {
    const m = q.length, at = (k: number) => q[(s + k) % m]
    tris.push([at(0), at(1), at(m - 1)])
    let lo = 1, hi = m - 1
    while (hi - lo > 2) { quad(at(lo), at(lo + 1), at(hi - 1), at(hi)); lo++; hi-- }
    if (hi - lo === 2) tris.push([at(lo), at(lo + 1), at(hi)])
  }
  const convex = (q: P2[]) => {
    let sign = 0
    for (let k = 0; k < q.length; k++) {
      const a = q[k], b = q[(k + 1) % q.length], c = q[(k + 2) % q.length]
      const z = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])
      if (Math.abs(z) < 1e-14) continue
      if (!sign) sign = Math.sign(z)
      else if (Math.sign(z) !== sign) return false
    }
    return true
  }
  // (a cut piece: one quad if it's the whole cell; a ladder across it from its corner off the outline if it's convex (a rounded corner's);
  // otherwise (a notch's inside corner, its curve hollow toward it) a ladder between the curve (the outline's run through it) and the cell's
  // sides, the shorter given as many steps as the longer, its longest steps halved)
  const cut = (piece: P2[], x0: number, x1: number, y0: number, y1: number) => {
    if (piece.length < 3) return
    const A = Math.abs(area(piece))
    if (A < 1e-10) return
    if (Math.abs(A - (x1 - x0) * (y1 - y0)) < 1e-9 && piece.every((q) => (Math.abs(q[0] - x0) < 1e-7 || Math.abs(q[0] - x1) < 1e-7) && (Math.abs(q[1] - y0) < 1e-7 || Math.abs(q[1] - y1) < 1e-7))) {
      quad([x0, y0], [x1, y0], [x1, y1], [x0, y1])
      return
    }
    if (convex(piece)) {
      const s = piece.findIndex((q) => !onRing(q))
      ladder(piece, s < 0 ? 0 : s)
      return
    }
    const on = piece.map(onRing), m = piece.length
    let s = -1
    for (let k = 0; k < m; k++) if (on[k] && !on[(k + m - 1) % m]) { s = s === -1 ? k : -2 }
    if (s < 0) {
      for (const t of THREE.ShapeUtils.triangulateShape(piece.map(([x, y]) => new THREE.Vector2(x, y)), [])) tris.push([piece[t[0]], piece[t[1]], piece[t[2]]])
      return
    }
    let e = s
    while (on[(e + 1) % m] && (e + 1) % m !== s) e = (e + 1) % m
    const r1: P2[] = [], r2: P2[] = []
    for (let k = s; ; k = (k + 1) % m) { r1.push(piece[k]); if (k === e) break }
    for (let k = s; ; k = (k + m - 1) % m) { r2.push(piece[k]); if (k === e) break }
    const M = Math.max(r1.length, r2.length) - 1
    for (const r of [r1, r2]) {
      while (r.length - 1 < M) {
        let w = 0, best = -1
        for (let k = 0; k + 1 < r.length; k++) { const L = Math.hypot(r[k + 1][0] - r[k][0], r[k + 1][1] - r[k][1]); if (L > best) { best = L; w = k } }
        r.splice(w + 1, 0, [(r[w][0] + r[w + 1][0]) / 2, (r[w][1] + r[w + 1][1]) / 2])
      }
    }
    for (let k = 0; k < M; k++) {
      const a = r1[k], b = r1[k + 1], c = r2[k + 1], d = r2[k]
      if (near(a, d)) tris.push([a, b, c])
      else if (near(b, c)) tris.push([a, b, d])
      else quad(a, b, c, d)
    }
  }
  // (the face cut along the lines through the outline's square corners only (its own notches' and ends' lines): a cell with no rounded corner
  // at its corners one quad; one with, a square at each such corner half the cell's narrower side (or the curve's radius, if that's more), so
  // no strip as thin as a small curve runs the cell's length: the square's piece a ladder across it, the rest of the cell quads)
  const uniq = (v: number[]) => [...v].sort((a, b) => a - b).filter((x, k, w) => !k || x - w[k - 1] > 1e-6)
  const X = uniq(pts.map((q) => q[0])), Y = uniq(pts.map((q) => q[1]))
  const roundAt = (x: number, y: number) => {
    for (let k = 0; k < n; k++) if (Math.abs(pts[k][0] - x) < 1e-7 && Math.abs(pts[k][1] - y) < 1e-7) return Math.min(radii[k] ?? 0, Math.hypot(pts[(k + n - 1) % n][0] - x, pts[(k + n - 1) % n][1] - y) / 2, Math.hypot(pts[(k + 1) % n][0] - x, pts[(k + 1) % n][1] - y) / 2)
    return 0
  }
  for (let i = 0; i + 1 < X.length; i++) for (let j = 0; j + 1 < Y.length; j++) {
    const x0 = X[i], x1 = X[i + 1], y0 = Y[j], y1 = Y[j + 1]
    const [r00, r10, r11, r01] = [roundAt(x0, y0), roundAt(x1, y0), roundAt(x1, y1), roundAt(x0, y1)]
    if (!(r00 || r10 || r11 || r01)) { cut(clip(ring, x0, x1, y0, y1), x0, x1, y0, y1); continue }
    const half = Math.min(x1 - x0, y1 - y0) / 2
    const sq = (r: number) => Math.max(half, r)
    const lx = uniq([x0, x1, ...(r00 || r01 ? [x0 + sq(Math.max(r00, r01))] : []), ...(r10 || r11 ? [x1 - sq(Math.max(r10, r11))] : [])].filter((x) => x >= x0 - 1e-9 && x <= x1 + 1e-9))
    const ly = uniq([y0, y1, ...(r00 || r10 ? [y0 + sq(Math.max(r00, r10))] : []), ...(r01 || r11 ? [y1 - sq(Math.max(r01, r11))] : [])].filter((y) => y >= y0 - 1e-9 && y <= y1 + 1e-9))
    for (let a = 0; a + 1 < lx.length; a++) for (let b = 0; b + 1 < ly.length; b++) cut(clip(ring, lx[a], lx[a + 1], ly[b], ly[b + 1]), lx[a], lx[a + 1], ly[b], ly[b + 1])
  }
  // ---- the outline given every point of the faces that lies on it, so the sides are cut where the faces are
  const extra: P2[] = []
  for (const t of tris) for (const p of t) if (!ring.some((q) => near(q, p)) && !extra.some((q) => near(q, p)) && onRing(p)) extra.push(p)
  const full: P2[] = []
  for (let k = 0; k < ring.length; k++) {
    const a = ring[k], b = ring[(k + 1) % ring.length]
    full.push(a)
    const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy
    const on = extra.filter((p) => onSeg(p, a, b) && !near(p, a) && !near(p, b))
    on.sort((p, q) => ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2 - ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / l2)
    full.push(...on)
  }
  // ---- the sides and bevels ExtrudeGeometry's own, through every point of the outline; the two faces ours, as its are: lying at its two
  // ends, the near one facing back (-z), their texture coordinates where they are
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(full.map(([x, y]) => new THREE.Vector2(x, y))), { ...ex, bevelEnabled: true, curveSegments: 1 })
  const cap = g.groups.find((q) => q.materialIndex === 0)!, sides = g.groups.find((q) => q.materialIndex === 1)!
  const P = g.attributes.position, U = g.attributes.uv
  let zn = Infinity, zf = -Infinity
  for (let k = cap.start; k < cap.start + cap.count; k++) { const z = P.getZ(k); if (z < zn) zn = z; if (z > zf) zf = z }
  const pos: number[] = [], uv: number[] = [], nor: number[] = []
  for (const [z, up] of [[zn, -1], [zf, 1]] as const) {
    for (const t of tris) {
      const ccw = (t[1][0] - t[0][0]) * (t[2][1] - t[0][1]) - (t[1][1] - t[0][1]) * (t[2][0] - t[0][0]) > 0
      const o = ccw === (up > 0) ? [t[0], t[1], t[2]] : [t[0], t[2], t[1]]
      for (const [x, y] of o) { pos.push(x, y, z); uv.push(x, y); nor.push(0, 0, up) }
    }
  }
  const capCount = pos.length / 3
  // (the sides smooth round the edge's round and round the outline's rounded corners, hard where the outline turns square (item 957, the
  // owner's 「同一個物件有的硬邊、有的軟邊」: as ExtrudeGeometry leaves them each facet is its own, the round drawn as four flat bands and
  // each rounded corner as eight): the facets that meet at under SIDE_CREASE averaged where they meet; the round's ring on each face's
  // plane given the face's own normal, the face running on into the round unbroken. Given in mm: toCreasedNormals takes points within a
  // centimetre of each other for one point)
  const sp = new Float32Array(sides.count * 3)
  for (let k = 0; k < sides.count; k++) {
    sp[k * 3] = P.getX(sides.start + k) * 1000; sp[k * 3 + 1] = P.getY(sides.start + k) * 1000; sp[k * 3 + 2] = P.getZ(sides.start + k) * 1000
  }
  const sg = new THREE.BufferGeometry()
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3))
  const SN = toCreasedNormals(sg, SIDE_CREASE).attributes.normal
  for (let k = sides.start; k < sides.start + sides.count; k++) {
    const z = P.getZ(k), q = k - sides.start
    pos.push(P.getX(k), P.getY(k), z); uv.push(U.getX(k), U.getY(k))
    if (Math.abs(z - zn) < 1e-7) nor.push(0, 0, -1)
    else if (Math.abs(z - zf) < 1e-7) nor.push(0, 0, 1)
    else nor.push(SN.getX(q), SN.getY(q), SN.getZ(q))
  }
  sg.dispose()
  g.dispose()
  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  out.addGroup(0, capCount, 0)
  out.addGroup(capCount, pos.length / 3 - capCount, 1)
  return out
}
/**
 * The bar's top as one plank round the corner: each counter's top as a rectangle (along the first counter, across
 * it), the side counter's outer edge squared up with the first's end, joined into an L and given rounded edges.
 */
export const BAR_DEPTH = 0.62
/** the polished brass of the drawers' pulls (real metal, the studio in it), made once */
let barBrass: THREE.MeshStandardMaterial | null = null
export const barBrassOf = () => {
  if (!barBrass) {
    barBrass = new THREE.MeshStandardMaterial({ color: '#c99a40', metalness: 1, roughness: 0.22, envMapIntensity: 1.1 })
    reflectStudio(barBrass)
  }
  return barBrass
}
