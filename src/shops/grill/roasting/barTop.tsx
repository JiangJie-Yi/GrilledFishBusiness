import { useMemo } from 'react'
import * as THREE from 'three'
import { normalFromHeight } from '@/scene/normalFromHeight'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { LIP_H, ALONG, BAR_GATES, gateCut, type Gate, GRILL_COUNTERS, SIDE_PULL, LAY, type Counter } from '@/shops/grill/bar'
import { BAR_TOP } from './barPlaces'
import { TRAY_WOOD, roundedShape, BAR_DEPTH } from './common'

function barTopShape(grow: number) {
  const box = (c: Counter) => {
    const hl = (c.length + 0.3) / 2, hd = BAR_DEPTH / 2
    const pts = [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => c.at.clone().addScaledVector(c.along, a * hl).addScaledVector(c.lay, b * hd))
    const xs = pts.map((p) => p.dot(ALONG)), ys = pts.map((p) => p.dot(LAY))
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
  }
  const a = box(GRILL_COUNTERS[0]), b = box(GRILL_COUNTERS[1])
  // (the side counter stands off the first's cook's side, at its start: its outer edge flush with the first's end)
  const i = BAR_TOP_OUT - grow
  const x0 = Math.min(a.x0, b.x0) + i
  // (short of each gate's flap, which is a piece of its own: at the first counter's far end, the side counter's near
  // one, which is its high-lay end here)
  const ax1 = a.x1 - gateCut(BAR_GATES[0]), by1 = b.y1 - gateCut(BAR_GATES[1])
  const pts: [number, number][] = [[x0, a.y0 + i], [ax1 - i, a.y0 + i], [ax1 - i, a.y1 - i], [b.x1 - i, a.y1 - i], [b.x1 - i, by1 - i],
    [x0, by1 - i]]
  // (item 379: the outer corner, where the two rows of places meet, rounded off (BAR_CORNER_R); the inside corner on the kitchen's side a
  // little; the ends at the gates square, the gates' flaps running on from them)
  const sh = roundedShape(pts, [BAR_CORNER_R + grow, 0, 0, 0.04 + grow, 0, 0])
  const thick = BAR_TOP_ROUND + grow * 0.6
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.06 - 2 * thick, bevelEnabled: true, bevelThickness: thick, bevelSize: BAR_TOP_OUT + grow * 0.6,
    bevelSegments: 4, curveSegments: 4 })
  // (the boards on the top run along each arm of the L: along the first counter, and along the side counter, at one scale
  // over both: the faces' texture coordinates laid from where they are, not stretched over the shape)
  const pos = g.attributes.position, uv = g.attributes.uv
  for (let t = 0; t < pos.count; t += 3) {
    const nz = Math.abs((pos.getX(t + 1) - pos.getX(t)) * (pos.getY(t + 2) - pos.getY(t)) - (pos.getY(t + 1) - pos.getY(t)) * (pos.getX(t + 2) - pos.getX(t)))
    const flat = pos.getZ(t) === pos.getZ(t + 1) && pos.getZ(t) === pos.getZ(t + 2) && nz > 1e-9
    for (let k = 0; k < 3; k++) {
      const x = pos.getX(t + k), y = pos.getY(t + k)
      if (flat) uv.setXY(t + k, x, y)
      else uv.setXY(t + k, x + y, pos.getZ(t + k) * 4)
    }
  }
  g.rotateX(Math.PI / 2)
  g.translate(0, BAR_TOP - thick, 0)
  return g
}
/** the bar top's edges rounded over this far, up and down (of its 6 cm) and in from its faces, and its outer corner's round (item 379,
 * docs/MODELING.md's 造型感: its edges had been eased 1.2 cm, its corners square) */
const BAR_TOP_ROUND = 0.02
const BAR_TOP_OUT = 0.028
const BAR_CORNER_R = 0.12
const BAR_WOOD = (() => {
  if (!TRAY_WOOD) return null
  const t = TRAY_WOOD.clone()
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(1 / 1.6, 1 / 1.6)
  t.needsUpdate = true
  return t
})()
export function BarTop() {
  const geo = useMemo(() => barTopShape(0), [])
  const ink = useMemo(() => barTopShape(0.01), [])
  // (a core of dark wood inside the plank, a little in from its faces: where the long top's triangles meet, a hair's crack between
  // them would let the cove light under the bar show through as a bright line; this keeps it shut)
  // (its top a little under the plank's: it came 4 mm out over it, a dark brown slab lying all along the bar top inside its pale rim)
  const core = useMemo(() => barTopShape(-0.02).translate(0, -BAR_TOP, 0).scale(1, 0.5, 1).translate(0, BAR_TOP - 0.012, 0), [])
  return (
    <group rotation-y={Math.atan2(-ALONG.z, ALONG.x)}>
      <mesh geometry={geo} castShadow receiveShadow><meshToonMaterial color="#ffffff" map={BAR_WOOD} /></mesh>
      <mesh geometry={core}><meshBasicMaterial color="#5a3c24" side={THREE.DoubleSide} /></mesh>
      <mesh geometry={ink}><meshBasicMaterial color="#3b2a20" side={THREE.BackSide} /></mesh>
    </group>
  )
}
/** the cove light's glow down the bar's base: warm at the top, gone by the floor */
export const COVE_GLOW = (() => {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = 8
  c.height = 64
  const g = c.getContext('2d')!
  const grad = g.createLinearGradient(0, 0, 0, 64)
  // (faint, and mostly near the top: laid on as light it adds the same to dark grain and light alike, so much of it washed the boards' grain
  // out to one flat colour)
  grad.addColorStop(0, 'rgba(255,205,135,0.3)')
  grad.addColorStop(0.3, 'rgba(255,195,120,0.1)')
  grad.addColorStop(0.65, 'rgba(255,190,110,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 8, 64)
  return new THREE.CanvasTexture(c)
})()
/** how high the raised lip along the bar's cook's side stands over its top */
/** how far the first counter's lip runs on towards the side counter's, so the two meet at the corner with no gap (the bar's own sizes) */
const LIP_JOIN = 0.29
/** a unit slab with rounded edges (scaled to each top), its grain still running the long way */
export const ROUNDED_SLAB = new RoundedBoxGeometry(1, 1, 1, 3, 0.08)
/**
 * The lip between the customers and the fire made over in the Edo way, wood and bamboo (item 313, the owner's, 2026-11-18: 「客人區與灶台的
 * 小木板可以升級，我的想法是參考剛剛的江戶風與木竹做搭配」, after a woodblock's 衝立): in its same 15 cm and 6 cm, a wooden rail along its top
 * (the condiment rack's hooks still over it, item 334), a band of bamboo lattice under it open to the fire (the customers see what's grilling
 * through it), and a low panel (腰板) at its foot, dark wood carved with the hemp-leaf (麻の葉) in fine lines; each place's number hung on the
 * lattice. The lattice and the carving in their pictures, laid at one scale along it (a repeat every 0.3): three slabs and a sheet.
 */
export const KOSHI_H = 0.05, RAIL_H = 0.03
const LIP_TILE = 0.3
/** the lip's pictures drawn at twice their first size (512 x 128 a repeat), their drawing as it was, scaled: a normal map's slopes want
 * the room (item 394) */
const LIP_PX = 2
/** the lattice's picture's height (its width 256 a repeat of LIP_TILE): as tall as the lattice is at the picture's scale (64 for its first
 * 0.07: item 416 made the lip twice as tall, and a 64 stretched over it drew its rails and cords three times as thick); the rails across it,
 * their middles down it: two on a low one, three on a tall one (item 416) */
const LATTICE_H = Math.round((64 * (LIP_H - KOSHI_H - RAIL_H)) / 0.07)
const LATTICE_RAILS = LATTICE_H > 120 ? [0.2, 0.5, 0.8].map((f) => Math.round(f * LATTICE_H)) : [14, 48]
/**
 * The lattice's picture and its relief (item 394, the owner's, 2026-11-20: 「毫無立體感，有辦法增加幾何面嗎?在不增加模型面數的情況下」: it was
 * a flat picture on a flat sheet): a normal map worked out for each part as it's shaped, not from a height picture (a half-round's
 * slope runs steep at its edges, which a height picture's steps lose): each split culm round across its width, its node a low ridge, the
 * two rails round over and standing in front of the culms, the palm cord bound round each crossing in turns; and the shadows painted in,
 * the rails' and the cord's on the culms under them (the light from above). The sheet's faces as they were.
 */
const EDO_LATTICE = (() => {
  if (typeof document === 'undefined') return null
  const W = 256, H = LATTICE_H, cell = W / 12
  const c = document.createElement('canvas')
  c.width = W * LIP_PX; c.height = H * LIP_PX
  const g = c.getContext('2d')!
  g.scale(LIP_PX, LIP_PX)
  g.clearRect(0, 0, W, H)
  let seed = 5
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const nodes: number[][] = []
  // (split bamboo stood side by side, a gap between each: each its own straw green-gold, lighter down its middle, a node at its own height)
  for (let k = 0; k < 12; k++) {
    const x = k * cell + 3, w = cell - 6
    const tone = 0.86 + 0.14 * rnd()
    // (round as a toon cylinder's drawn (the room's toon light has two steps, and a front lit from above stays in the lighter one however its
    // normals lean, so the roundness is painted in too): a dark edge, the lit side, a highlight left of the middle, the turn into shadow,
    // the shadow, and the light thrown back at its far edge)
    const gr = g.createLinearGradient(x, 0, x + w, 0)
    const at = (f: number, r: number, gg: number, b: number) => gr.addColorStop(f, `rgb(${Math.round(r * tone)},${Math.round(gg * tone)},${Math.round(b * tone)})`)
    at(0, 104, 78, 40); at(0.1, 168, 138, 84); at(0.3, 228, 204, 146); at(0.38, 214, 186, 122); at(0.66, 170, 138, 82); at(0.86, 112, 84, 42); at(1, 136, 106, 60)
    g.fillStyle = gr; g.fillRect(x, 0, w, H)
    // (its node, a ring round it lit along its top, its underside dark; two on a tall one, each in its own half (item 416))
    const own = H > 120 ? [H * (0.08 + rnd() * 0.32), H * (0.58 + rnd() * 0.32)] : [10 + rnd() * 44]
    nodes.push(own)
    for (const ny of own) {
      g.fillStyle = 'rgba(255,236,190,0.4)'; g.fillRect(x, ny - 0.5, w, 1)
      g.fillStyle = 'rgba(70,48,22,0.6)'; g.fillRect(x, ny + 0.5, w, 1.6)
    }
  }
  // (the rails' shadows on the culms: a band under each rail, fading down, and a fainter one over it; on the culms only)
  g.globalCompositeOperation = 'source-atop'
  for (const y of LATTICE_RAILS) {
    const under = g.createLinearGradient(0, y + 3, 0, y + 9)
    under.addColorStop(0, 'rgba(38,22,8,0.6)'); under.addColorStop(1, 'rgba(38,22,8,0)')
    g.fillStyle = under; g.fillRect(0, y + 3, W, 6)
    const over = g.createLinearGradient(0, y - 3, 0, y - 6)
    over.addColorStop(0, 'rgba(38,22,8,0.3)'); over.addColorStop(1, 'rgba(38,22,8,0)')
    g.fillStyle = over; g.fillRect(0, y - 6, W, 3)
  }
  g.globalCompositeOperation = 'source-over'
  // (a pair of bamboo rails across, tied to each upright with dark palm cord, wound round in turns, its shadow under it)
  for (const y of LATTICE_RAILS) {
    // (the rail round: lit along its top, darkening under)
    const rg = g.createLinearGradient(0, y - 3, 0, y + 3)
    rg.addColorStop(0, '#a07a44'); rg.addColorStop(0.3, '#c49a5a'); rg.addColorStop(0.55, '#7a5a30'); rg.addColorStop(1, '#3e2a14')
    g.fillStyle = rg; g.fillRect(0, y - 3, W, 6)
    g.fillStyle = 'rgba(255,240,200,0.45)'; g.fillRect(0, y - 2, W, 0.8)
    for (let k = 0; k < 12; k++) {
      const cx = k * cell + cell / 2
      g.fillStyle = 'rgba(24,12,4,0.45)'; g.fillRect(cx - 2.2, y - 3, 6, 8)
      g.fillStyle = '#2a1a10'; g.fillRect(cx - 3, y - 4, 6, 8)
      g.save(); g.beginPath(); g.rect(cx - 3, y - 4, 6, 8); g.clip()
      g.strokeStyle = 'rgba(150,112,72,0.55)'; g.lineWidth = 0.7
      for (let d = -8; d <= 8; d += 1.7) { g.beginPath(); g.moveTo(cx - 3, y - 4 + d); g.lineTo(cx + 3, y - 4 + d + 6); g.stroke() }
      g.restore()
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = THREE.RepeatWrapping
  t.anisotropy = 4
  // (the relief, each pixel's slope as its part is shaped (x along the picture, y up it): a cord over a rail over a culm)
  const nc = document.createElement('canvas')
  nc.width = W * LIP_PX; nc.height = H * LIP_PX
  const ng = nc.getContext('2d')!
  const img = ng.createImageData(nc.width, nc.height), d = img.data
  for (let py = 0; py < nc.height; py++) for (let px = 0; px < nc.width; px++) {
    const u = (px + 0.5) / LIP_PX, v = (py + 0.5) / LIP_PX
    const k = Math.min(11, Math.floor(u / cell)), cx = k * cell + cell / 2
    let nx = 0, ny = 0
    const tie = LATTICE_RAILS.find((y) => Math.abs(v - y) <= 4 && Math.abs(u - cx) <= 3)
    const rail = LATTICE_RAILS.find((y) => Math.abs(v - y) <= 3)
    if (tie !== undefined) {
      // (the cord: a knot domed over the crossing, its turns ridged across it)
      const wrap = 0.32 * Math.cos((u - cx - (v - tie)) * 3.7)
      nx = ((u - cx) / 3) * 0.6 + wrap
      ny = -((v - tie) / 4) * 0.6 - wrap
    } else if (rail !== undefined) {
      ny = -((v - rail) / 3) * 0.85
    } else {
      const x0 = k * cell + 3, w = cell - 6
      if (u >= x0 && u <= x0 + w) {
        nx = ((u - (x0 + w / 2)) / (w / 2)) * 0.85
        for (const nk of nodes[k]) { const dn = v - (nk + 1); if (Math.abs(dn) < 2) ny = -(dn / 2) * 0.5 }
      }
    }
    const l = Math.hypot(nx, ny)
    if (l > 0.95) { nx *= 0.95 / l; ny *= 0.95 / l }
    const nz = Math.sqrt(1 - nx * nx - ny * ny), i = (py * nc.width + px) * 4
    d[i] = (nx * 0.5 + 0.5) * 255; d[i + 1] = (ny * 0.5 + 0.5) * 255; d[i + 2] = (nz * 0.5 + 0.5) * 255; d[i + 3] = 255
  }
  ng.putImageData(img, 0, 0)
  const n = new THREE.CanvasTexture(nc)
  n.wrapS = THREE.RepeatWrapping
  n.anisotropy = 4
  return { map: t, normal: n }
})()
/** the hemp-leaf (麻の葉) traced on a picture of the carved panel's (of 256 by 64): a six-pointed star of lines in each cell of a
 * triangular grid, and the hexagon round it */
function asanoha(g: CanvasRenderingContext2D, dx = 0, dy = 0) {
  const s = 32, h = s * Math.sqrt(3) / 2
  for (let row = -1; row < 4; row++) for (let col = -1; col < 10; col++) {
    const cx = col * s + (row % 2 ? s / 2 : 0) + dx, cy = row * h + 8 + dy
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3 + Math.PI / 6
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * s * 0.58, cy + Math.sin(a) * s * 0.58); g.stroke()
    }
    g.beginPath()
    for (let k = 0; k <= 6; k++) { const a = (k * Math.PI) / 3; const x = cx + Math.cos(a) * s * 0.5, y = cy + Math.sin(a) * s * 0.5; if (k) g.lineTo(x, y); else g.moveTo(x, y) }
    g.stroke()
  }
}
/**
 * The carved panel's picture and its relief (item 394): the hemp-leaf's pale strips standing proud of a sunk dark ground as a kumiko's
 * do, rounded over, and the beads along its top and foot sunk; its normal map from a height picture of them (scene/normalFromHeight),
 * the strips' shadows on the ground painted in, down and a little across (the light from above).
 */
const EDO_KOSHI = (() => {
  if (typeof document === 'undefined') return null
  const W = 256, H = 64
  const c = document.createElement('canvas')
  c.width = W * LIP_PX; c.height = H * LIP_PX
  const g = c.getContext('2d')!
  g.scale(LIP_PX, LIP_PX)
  g.fillStyle = '#5a3520'; g.fillRect(0, 0, W, H)
  // (its grain, faint)
  for (let y = 0; y < H; y += 3) { g.fillStyle = `rgba(${y % 2 ? '30,16,8' : '110,72,40'},0.18)`; g.fillRect(0, y, W, 1) }
  // (the strips' shadows on the ground, then the strips, pale, a lighter line along each's upper edge)
  g.lineCap = 'round'
  g.strokeStyle = 'rgba(16,7,2,0.7)'; g.lineWidth = 3; asanoha(g, 0.8, 1.3)
  g.strokeStyle = 'rgba(214,170,108,1)'; g.lineWidth = 1.9; asanoha(g)
  // (each strip's edges: the upper caught by the light, the lower turned away)
  g.strokeStyle = 'rgba(255,238,200,0.75)'; g.lineWidth = 0.7; asanoha(g, -0.4, -0.5)
  g.strokeStyle = 'rgba(70,40,16,0.5)'; g.lineWidth = 0.6; asanoha(g, 0.45, 0.55)
  // (a fine bead along its top and foot)
  g.fillStyle = 'rgba(20,10,4,0.7)'; g.fillRect(0, 0, W, 3); g.fillRect(0, H - 3, W, 3)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = THREE.RepeatWrapping
  t.anisotropy = 4
  // (its height: the ground a little down, the strips up in three steps (rounded over), the beads sunk)
  const hc = document.createElement('canvas')
  hc.width = W * LIP_PX; hc.height = H * LIP_PX
  const h = hc.getContext('2d')!
  h.scale(LIP_PX, LIP_PX)
  h.fillStyle = 'rgb(70,70,70)'; h.fillRect(0, 0, W, H)
  h.lineCap = 'round'
  for (const [lw, grey] of [[3.2, 140], [2.3, 200], [1.3, 255]] as const) { h.strokeStyle = `rgb(${grey},${grey},${grey})`; h.lineWidth = lw; asanoha(h) }
  h.fillStyle = 'rgb(18,18,18)'; h.fillRect(0, 0, W, 3); h.fillRect(0, H - 3, W, 3)
  const n = new THREE.CanvasTexture(normalFromHeight(hc, 2.2))
  n.wrapS = THREE.RepeatWrapping
  n.anisotropy = 4
  return { map: t, normal: n }
})()
export const EDO_LATTICE_MAT = typeof document === 'undefined' ? null : new THREE.MeshToonMaterial({ color: '#ffffff', map: EDO_LATTICE!.map, normalMap: EDO_LATTICE!.normal, alphaTest: 0.5, side: THREE.DoubleSide })
export const EDO_KOSHI_MAT = typeof document === 'undefined' ? null : new THREE.MeshToonMaterial({ color: '#ffffff', map: EDO_KOSHI!.map, normalMap: EDO_KOSHI!.normal })
export const LIP_INK = new THREE.MeshBasicMaterial({ color: '#3b2a20', side: THREE.BackSide })
/** how far in from the first counter's start its lip begins (with two counters: where the side counter's stands) */
export const LIP_TRIM = 0.62
/** the raised lip's run along its counter (from, to: its own frame): stopping short of where the other counter butts on, and of the gate's
 * flap; the first counter's starts where the side counter's now stands, drawn in from the wall by SIDE_PULL */
export function lipSpanOf(c: Counter, trim: number, butt: boolean, gate?: Gate): [number, number] {
  const L = c.length, G = gate ? gateCut(gate) : 0, end = gate?.end ?? 1
  let x0 = -(L + 0.3) / 2 + trim - (trim ? 0.02 : 0) + (trim ? SIDE_PULL - LIP_JOIN : 0), x1 = (L + 0.3) / 2 + (butt ? 0.05 : 0)
  if (gate) {
    if (end > 0) x1 -= G
    else x0 += G
  }
  return [x0, x1]
}
/** the lip's faces across its counter (its own frame): the customers', the cook's */
const LIP_FACES = [0.25, 0.31] as const
type LipRect = { a0: number; a1: number; l0: number; l1: number }
let lipRects: [LipRect, LipRect] | null | undefined
/**
 * The two counters' lips in the bar's frame (along, lay): the first counter's, and the side counter's; null unless they meet at a corner the
 * side counter's on the low-along side of and the first counter's on the low-lay side of (as laid out: GRILL_COUNTERS)
 */
export function lipCorner() {
  if (lipRects !== undefined) return lipRects
  if (GRILL_COUNTERS.length < 2) return (lipRects = null)
  const rect = (c: Counter, [x0, x1]: [number, number]): LipRect => {
    const pts = [[x0, LIP_FACES[0]], [x1, LIP_FACES[0]], [x1, LIP_FACES[1]], [x0, LIP_FACES[1]]]
      .map(([x, z]) => c.at.clone().addScaledVector(c.along, x).addScaledVector(c.lay, z))
    const as = pts.map((p) => p.dot(ALONG)), ls = pts.map((p) => p.dot(LAY))
    return { a0: Math.min(...as), a1: Math.max(...as), l0: Math.min(...ls), l1: Math.max(...ls) }
  }
  const [c0, c1] = GRILL_COUNTERS
  const r0 = rect(c0, lipSpanOf(c0, LIP_TRIM, false, BAR_GATES[0])), r1 = rect(c1, lipSpanOf(c1, 0, true, BAR_GATES[1]))
  const ok = r1.a0 < r0.a0 + 0.001 && r0.l0 < r1.l0 + 0.001 && r1.a1 > r0.a0 && r0.l1 > r1.l0
  return (lipRects = ok ? [r0, r1] : null)
}
/** the lip's plan as one L, grown `g` all round: the first counter's run on to the side counter's outer face, the side counter's to the
 * first's, their outer corner square to both */
function lipOutline(g: number): [number, number][] {
  const [r0, r1] = lipCorner()!
  return [[r1.a0 - g, r0.l0 - g], [r0.a1 + g, r0.l0 - g], [r0.a1 + g, r0.l1 + g], [r1.a1 + g, r0.l1 + g], [r1.a1 + g, r1.l1 + g],
    [r1.a0 - g, r1.l1 + g]]
}
/** a picture laid on an L's extrusion (before it's stood up: x along, y lay, z down it) at its true size: the caps' grain along each arm (the
 * side counter's arm turned), the sides along their run (u, `tile` a picture) and down them (v, `v(z)`) */
function layAlongL(g: THREE.BufferGeometry, tile: number, v: (z: number) => number) {
  const [r0, r1] = lipCorner()!
  const pos = g.attributes.position, uv = g.attributes.uv
  for (let t = 0; t < pos.count; t += 3) {
    const flat = pos.getZ(t) === pos.getZ(t + 1) && pos.getZ(t) === pos.getZ(t + 2)
    const cx = (pos.getX(t) + pos.getX(t + 1) + pos.getX(t + 2)) / 3, cy = (pos.getY(t) + pos.getY(t + 1) + pos.getY(t + 2)) / 3
    const sideArm = cx < r1.a1 + 0.02 && cy > r0.l1
    let dx = 0, dy = 0
    for (let k = 1; k < 3; k++) { dx += Math.abs(pos.getX(t + k) - pos.getX(t)); dy += Math.abs(pos.getY(t + k) - pos.getY(t)) }
    for (let k = 0; k < 3; k++) {
      const x = pos.getX(t + k), y = pos.getY(t + k), z = pos.getZ(t + k)
      if (flat) uv.setXY(t + k, (sideArm ? y : x) / tile, (sideArm ? x : y) / tile)
      else uv.setXY(t + k, (dx >= dy ? x : y) / tile, v(z))
    }
  }
  uv.needsUpdate = true
}
/** the rail's rounds over its top edges (and under), up and down (of its 3 cm) and in from its faces */
const RAIL_ROUND = 0.012, RAIL_ROUND_IN = 0.013
/** the rail round the L, grown `grow` all round (its ink): its top and bottom edges rounded right over */
function lipRailGeometry(grow: number) {
  const sh = new THREE.Shape(lipOutline(grow - RAIL_ROUND_IN).map(([x, y]) => new THREE.Vector2(x, y)))
  const t = RAIL_ROUND + grow * 0.5
  const g = new THREE.ExtrudeGeometry(sh, { depth: RAIL_H + 2 * grow - 2 * t, bevelEnabled: true, bevelThickness: t, bevelSize: RAIL_ROUND_IN,
    bevelSegments: 3, curveSegments: 1 })
  layAlongL(g, 1.6, (z) => z * 4)
  g.rotateX(Math.PI / 2)
  g.translate(0, BAR_TOP + LIP_H + grow - t, 0)
  return g
}
/** the carved panel round the L, grown `grow` all round and `up` up and down (its ink) */
function lipKoshiGeometry(grow: number, up: number) {
  const sh = new THREE.Shape(lipOutline(grow).map(([x, y]) => new THREE.Vector2(x, y)))
  const g = new THREE.ExtrudeGeometry(sh, { depth: KOSHI_H + 2 * up, bevelEnabled: false, curveSegments: 1 })
  layAlongL(g, LIP_TILE, (z) => 1 - (z - up) / KOSHI_H)
  g.rotateX(Math.PI / 2)
  g.translate(0, BAR_TOP + KOSHI_H + up, 0)
  return g
}
/**
 * The lip over both counters as one L (item 379, docs/MODELING.md's 造型感): its carved panel and its rail each one piece round the corner, the
 * rail's edges rounded right over; the bamboo lattice's two sheets meeting at the corner. Each counter's had stopped short of the other's face
 * at the corner (a 2 cm notch at its outer corner), and their rails ran through each other there, one's end standing out past the other's
 * side. In the bar's frame, as the top is; in the bar's batch.
 */
export function BarLip() {
  const [r0, r1] = lipCorner()!
  const rail = useMemo(() => lipRailGeometry(0), [])
  const railInk = useMemo(() => lipRailGeometry(0.004), [])
  const koshi = useMemo(() => lipKoshiGeometry(0, 0), [])
  const koshiInk = useMemo(() => lipKoshiGeometry(0.004, 0.0025), [])
  // (the lattice just behind the customers' faces (3 mm in), each sheet on to the other's at the corner)
  const LAT = LIP_H - KOSHI_H - RAIL_H, y = BAR_TOP + KOSHI_H + LAT / 2
  const inA = r1.a0 + 0.003, inL = r0.l0 + 0.003
  const len0 = r0.a1 - 0.005 - inA, len1 = r1.l1 - 0.005 - inL
  return (
    <group rotation-y={Math.atan2(-ALONG.z, ALONG.x)}>
      <mesh geometry={koshi} castShadow material={EDO_KOSHI_MAT!} />
      <mesh geometry={koshiInk} material={LIP_INK} />
      <mesh geometry={lipSheet(len0, LAT + 0.004)} position={[inA + len0 / 2, y, inL]} material={EDO_LATTICE_MAT!} castShadow />
      <mesh geometry={lipSheet(len1, LAT + 0.004)} position={[inA, y, inL + len1 / 2]} rotation-y={Math.PI / 2} material={EDO_LATTICE_MAT!} castShadow />
      <mesh geometry={rail} castShadow receiveShadow><meshToonMaterial color="#ffffff" map={BAR_WOOD} /></mesh>
      <mesh geometry={railInk} material={LIP_INK} />
    </group>
  )
}
/** the carved panel: a slab `len` long whose picture repeats every LIP_TILE along its two long faces, at one height up them (made once a
 * length; a rounded slab's faces each take the whole picture, and along the bar it was drawn out into streaks) */
const KOSHI_GEO = new Map<string, THREE.BoxGeometry>()
export function koshiBox(len: number) {
  const key = len.toFixed(3)
  let g = KOSHI_GEO.get(key)
  if (!g) {
    g = new THREE.BoxGeometry(len, KOSHI_H, 0.06)
    const uv = g.attributes.uv as THREE.BufferAttribute
    // (BoxGeometry's faces four vertices each, +x, -x, +y, -y, +z, -z: the long faces (+y, -y, +z, -z) tiled along their length)
    for (let f = 2; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setX(i, uv.getX(i) * (len / LIP_TILE)) }
    KOSHI_GEO.set(key, g)
  }
  return g
}
/** a sheet `len` long and `h` high whose picture repeats every LIP_TILE along it (made once a length) */
const LIP_SHEETS = new Map<string, THREE.PlaneGeometry>()
export function lipSheet(len: number, h: number) {
  const key = `${len.toFixed(3)}|${h.toFixed(3)}`
  let g = LIP_SHEETS.get(key)
  if (!g) {
    g = new THREE.PlaneGeometry(len, h)
    const uv = g.attributes.uv as THREE.BufferAttribute
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * (len / LIP_TILE))
    LIP_SHEETS.set(key, g)
  }
  return g
}
