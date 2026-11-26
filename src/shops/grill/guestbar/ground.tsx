/**
 * The ground round the shop (item 708, the owner's 「然後模型周圍我需要一點泥土地，門口多一些」; made again in items 725 and 726, the owner's
 * 「且泥土地有點大圈，然後樣子不是很好看」「我希望它豐富點」: it was one sheet of earth 1.5 out round the building and 3.0 before the door,
 * its edge a ragged ring of blurred blobs that looked like shadows on the ground). As round a real shop:
 *
 * - a bed of river gravel (玉砂利, where the eaves drip: 雨落ち) GRAVEL_W wide all round the building's foot, square at its corners, and
 *   out before the door the facade's width (the stone steps and the door's bamboo standing in it);
 * - a curb (縁石) of low granite stones along the bed's outer edge, each its own length, height and grey, their corners closed;
 * - stepping stones (飛び石) from the steps' foot out over the bed and the curb to the street;
 * - past the curb a narrow band of tamped earth, moss along the curb, fallen leaves, a few weeds, faded out over EARTH_FADE;
 * - tufts of mondo grass (竜のひげ) along the curb and at its corners.
 *
 * All of it in the room floor's frame (x = -lay, z = along), laid from the building's footprint (its rects: game/world/groundLayout's
 * groundPlan and curbStones, BDD ground). Four draws (the gravel, the stones, the tufts, the earth), none casting a shadow, all taking the
 * sun's (out of doors); made once, at load.
 */
import { memo, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { curbStones, groundPlan, type Rect } from '@/game/world/groundLayout'
import { signTexture } from '@/scene/props/signFont'

/** heights in the floor's frame: the earth's sheet (2 mm under the street's level, -0.46); the gravel's top, just under the stone steps'
 * foot (-0.453: they stand in it, as the building's base and the door's bamboo do); the curb's top, 3.5 cm over the gravel; the stepping
 * stones' top, 1.2 cm over it */
export const EARTH_Y = -0.462
export const GRAVEL_Y = -0.4535
const CURB_TOP = GRAVEL_Y + 0.035, STEP_TOP = GRAVEL_Y + 0.012
/** the bed's width round the building; the curb's width, its stones' length (each up to CURB_SPREAD of it longer or shorter), their joint */
const GRAVEL_W = 0.36, CURB_W = 0.05, CURB_LEN = 0.32, CURB_SPREAD = 0.18, CURB_JOINT = 0.004
/** the bed out before the door: how far out from the front, how far past the doorway each side (the facade's width) */
const APRON_OUT = 1.25, APRON_SIDE = 0.65
/** the earth past the curb, and how far it fades out past that; its picture's pixels to a unit */
const EARTH_BAND = 0.36, EARTH_FADE = 0.24, EARTH_PX = 96
/** how much ground one repeat of the gravel's picture covers */
const GRAVEL_TILE = 0.5
/** the stepping stones: their half sizes across and along the way out, the gaps between them */
const STEP_RX = 0.16, STEP_RZ = 0.12, STEP_PITCH = 0.29

/** a small seeded random (the same ground each time it's made) */
function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * The gravel's picture, a repeat of GRAVEL_TILE: river pebbles a centimetre or two across packed close, each its own pale grey or warm
 * stone, its little shadow down and right on what's under it, the light on its upper left; the dark between them. Seamless (each pebble
 * drawn again across the edges it overlaps)
 */
const GRAVEL_TEX = signTexture(512, 512, (g) => {
  const N = 512
  g.fillStyle = '#4e4840'
  g.fillRect(0, 0, N, N)
  const rnd = seeded(725)
  const tones = ['#a39b8f', '#958d81', '#b0a89b', '#867e73', '#bcb4a6', '#8f877b', '#9e9588', '#7a7268', '#aa9f8e', '#b4aa98']
  // (each pebble rounded: lit on its upper left, its own tone through the middle, darker to its lower right; packed close, little dark between)
  const shade = (hex: string, k: number) => { const n = parseInt(hex.slice(1), 16); return `rgb(${Math.min(255, Math.round((n >> 16) * k))},${Math.min(255, Math.round(((n >> 8) & 255) * k))},${Math.min(255, Math.round((n & 255) * k))})` }
  for (let i = 0; i < 1500; i++) {
    const x = rnd() * N, y = rnd() * N, r = 8 + rnd() * rnd() * 13, a = rnd() * Math.PI, e = 0.64 + rnd() * 0.3
    const tone = tones[Math.floor(rnd() * tones.length)]
    for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) {
      const cx = x + dx, cy = y + dy
      if (cx < -r * 2 || cx > N + r * 2 || cy < -r * 2 || cy > N + r * 2) continue
      g.fillStyle = 'rgba(32,27,22,0.34)'
      g.beginPath(); g.ellipse(cx + r * 0.16, cy + r * 0.22, r * 1.02, r * e * 1.02, a, 0, Math.PI * 2); g.fill()
      const gr = g.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r * 1.05)
      gr.addColorStop(0, shade(tone, 1.16)); gr.addColorStop(0.55, tone); gr.addColorStop(1, shade(tone, 0.72))
      g.fillStyle = gr
      g.beginPath(); g.ellipse(cx, cy, r, r * e, a, 0, Math.PI * 2); g.fill()
    }
  }
}, true)
if (GRAVEL_TEX) GRAVEL_TEX.anisotropy = 4
const GRAVEL_MAT = new THREE.MeshToonMaterial({ map: GRAVEL_TEX })
GRAVEL_MAT.name = 'ShopGravel'
/** granite (御影石): near white (each stone's own grey multiplies it), flecked dark and pale, a repeat 0.2 across */
const STONE_TEX = signTexture(128, 128, (g) => {
  g.fillStyle = '#e4e1da'
  g.fillRect(0, 0, 128, 128)
  const rnd = seeded(727)
  for (let i = 0; i < 900; i++) {
    const x = rnd() * 128, y = rnd() * 128, r = 0.5 + rnd() * rnd() * 2.2, k = rnd()
    g.fillStyle = k < 0.45 ? 'rgba(52,50,48,0.55)' : k < 0.75 ? 'rgba(120,114,106,0.45)' : 'rgba(255,255,252,0.7)'
    for (const dx of [-128, 0, 128]) for (const dy of [-128, 0, 128]) { g.beginPath(); g.arc(x + dx, y + dy, r, 0, Math.PI * 2); g.fill() }
  }
}, true)
/** the curb's and the stepping stones' granite: each stone's own grey in its points, over the flecks; its faces flat */
const STONE_MAT = new THREE.MeshToonMaterial({ map: STONE_TEX, vertexColors: true })
STONE_MAT.name = 'ShopCurb'
/** a tuft of mondo grass: narrow dark blades from its foot, arching out, paler at their tips; clear between them */
const TUFT_TEX = signTexture(128, 128, (g) => {
  g.clearRect(0, 0, 128, 128)
  const rnd = seeded(726)
  for (let i = 0; i < 17; i++) {
    const base = 64 + (rnd() - 0.5) * 20, lean = (rnd() - 0.5) * 1.7, h = 64 + rnd() * 56
    const tipX = base + lean * h * 0.62, tipY = 128 - h, cx = base + lean * h * 0.2, cy = 128 - h * 0.72, w0 = 3.4 + rnd() * 1.8
    const grad = g.createLinearGradient(0, 128, 0, tipY)
    grad.addColorStop(0, '#1d3519'); grad.addColorStop(0.55, '#2e5628'); grad.addColorStop(1, i % 3 ? '#4d7c3e' : '#6b9653')
    g.fillStyle = grad
    g.beginPath()
    g.moveTo(base - w0 / 2, 128)
    g.quadraticCurveTo(cx - w0 * 0.45, cy, tipX, tipY)
    g.quadraticCurveTo(cx + w0 * 0.45, cy, base + w0 / 2, 128)
    g.closePath(); g.fill()
  }
})
const TUFT_MAT = new THREE.MeshToonMaterial({ map: TUFT_TEX, alphaTest: 0.4, side: THREE.DoubleSide })
TUFT_MAT.name = 'ShopTuft'
/** a tuft's shape: three cards crossed, 0.15 across and 0.12 high, their foot at 0 (their normals up: lit as the ground round them is) */
const TUFT_GEO = (() => {
  const pos: number[] = [], uv: number[] = [], nor: number[] = [], idx: number[] = []
  for (let k = 0; k < 3; k++) {
    const a = (k * Math.PI) / 3, c = Math.cos(a) * 0.075, s = Math.sin(a) * 0.075, n = pos.length / 3
    pos.push(-c, 0, -s, c, 0, s, c, 0.12, s, -c, 0.12, -s)
    uv.push(0, 0, 1, 0, 1, 1, 0, 1)
    for (let q = 0; q < 4; q++) nor.push(0, 1, 0)
    idx.push(n, n + 1, n + 2, n, n + 2, n + 3)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  return g
})()

/** flat faces, each its own colour at each point: the stones' one mesh */
class Faces {
  pos: number[] = []
  nor: number[] = []
  col: number[] = []
  uv: number[] = []
  private n = new THREE.Vector3()
  private u = new THREE.Vector3()
  tri(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, ca: THREE.Color, cb: THREE.Color, cc: THREE.Color) {
    this.n.subVectors(b, a).cross(this.u.subVectors(c, a)).normalize()
    const n = this.n, up = Math.abs(n.y) > 0.7, xs = Math.abs(n.x) > Math.abs(n.z)
    for (const [p, q] of [[a, ca], [b, cb], [c, cc]] as const) {
      this.pos.push(p.x, p.y, p.z); this.nor.push(n.x, n.y, n.z); this.col.push(q.r, q.g, q.b)
      this.uv.push((up ? p.x : xs ? p.z : p.x) / 0.2, (up ? p.z : p.y) / 0.2)
    }
  }
  /** a quad a b c d (counter-clockwise seen from its front), its two top points' colour and its two bottom ones' */
  quad(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, ca: THREE.Color, cb: THREE.Color, cc: THREE.Color, cd: THREE.Color) {
    this.tri(a, b, c, ca, cb, cc); this.tri(a, c, d, ca, cc, cd)
  }
  /**
   * A stone: its outline (counter-clockwise from above, in x, z), its top at `top`, chamfered `ch` in round its edge and down `ch`, its
   * sides down to `foot`; its top's colour, its sides' at the shoulder and at the foot
   */
  stone(outline: [number, number][], top: number, foot: number, ch: number, cTop: THREE.Color, cSide: THREE.Color, cFoot: THREE.Color) {
    const n = outline.length
    const cx = outline.reduce((p, q) => p + q[0], 0) / n, cz = outline.reduce((p, q) => p + q[1], 0) / n
    const inner = outline.map(([x, z]) => { const d = Math.hypot(x - cx, z - cz) || 1; return [x - (x - cx) / d * ch, z - (z - cz) / d * ch] as [number, number] })
    const V = (p: [number, number], y: number) => new THREE.Vector3(p[0], y, p[1])
    const lit = cTop.clone().multiplyScalar(1.07)
    // (its top: the inner outline, in triangles that don't all meet at one point; each turned to face up, whichever way it came)
    const tris = THREE.ShapeUtils.triangulateShape(inner.map(([x, z]) => new THREE.Vector2(x, -z)), [])
    for (const [i, j, k] of tris) {
      const A = inner[i], B = inner[j], C = inner[k]
      const up = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]) < 0
      this.tri(V(A, top), V(up ? B : C, top), V(up ? C : B, top), cTop, cTop, cTop)
    }
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n
      // (the chamfer round it, catching the light; then its side down to its foot, darker toward it)
      this.quad(V(outline[i], top - ch), V(outline[j], top - ch), V(inner[j], top), V(inner[i], top), lit, lit, lit, lit)
      this.quad(V(outline[i], foot), V(outline[j], foot), V(outline[j], top - ch), V(outline[i], top - ch), cFoot, cFoot, cSide, cSide)
    }
  }
  geometry() {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3))
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3))
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2))
    return g
  }
}

export const ShopGround = memo(function ShopGround({ building, door, front, stepsFoot }: {
  /** the building's footprint on the ground: its rects, [x0, z0, x1, z1] in the floor's frame */
  building: Rect[]
  /** the doorway across x at the front; the front's z; where the stone steps out from it end */
  door: [number, number]; front: number; stepsFoot: number
}) {
  const key = JSON.stringify([building, door, front, stepsFoot])
  const made = useMemo(() => {
    if (typeof document === 'undefined') return null
    const rnd = seeded(726)
    const apron: Rect = [door[0] - APRON_SIDE, front, door[1] + APRON_SIDE, front + APRON_OUT]
    const plan = groundPlan(building, GRAVEL_W, apron)
    // ---- the gravel: its cells, the picture laid on by where they are (one repeat a GRAVEL_TILE)
    const gp: number[] = [], gu: number[] = [], gn: number[] = []
    for (const [x0, z0, x1, z1] of plan.gravel) {
      for (const [x, z] of [[x0, z0], [x0, z1], [x1, z1], [x0, z0], [x1, z1], [x1, z0]]) {
        gp.push(x, GRAVEL_Y, z); gn.push(0, 1, 0); gu.push(x / GRAVEL_TILE, -z / GRAVEL_TILE)
      }
    }
    const gravel = new THREE.BufferGeometry()
    gravel.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3))
    gravel.setAttribute('normal', new THREE.Float32BufferAttribute(gn, 3))
    gravel.setAttribute('uv', new THREE.Float32BufferAttribute(gu, 2))
    // ---- the stepping stones: from the steps' foot out to the street, the doorway's middle, each a little off the line and turned
    const mid = (door[0] + door[1]) / 2, apronEnd = front + APRON_OUT
    const stepAt: [number, number, number][] = []
    for (let k = 0, z = stepsFoot + 0.06 + STEP_RZ; k < 3; k++, z += STEP_PITCH) stepAt.push([mid + [0, 0.06, -0.05][k], z, [0.12, -0.18, 0.08][k]])
    stepAt.push([mid + 0.04, apronEnd + CURB_W + 0.03 + STEP_RZ, -0.1])
    // ---- the curb: its stones along the bed's outer edge
    const curb = curbStones(plan.runs, CURB_W, CURB_LEN, CURB_SPREAD, CURB_JOINT, [], 725)
    const f = new Faces()
    const greys = ['#a19e96', '#aaa79f', '#96938c', '#b2afa7', '#9b978e'].map((h) => new THREE.Color(h))
    for (const s of curb) {
      const c = greys[Math.floor(rnd() * greys.length)].clone().multiplyScalar(0.94 + rnd() * 0.1)
      const top = CURB_TOP + (rnd() - 0.5) * 0.006, turn = (rnd() - 0.5) * 0.02
      const hl = s.len / 2, hw = CURB_W / 2
      const local: [number, number][] = s.along === 'x' ? [[-hl, -hw], [hl, -hw], [hl, hw], [-hl, hw]] : [[-hw, -hl], [hw, -hl], [hw, hl], [-hw, hl]]
      const co = Math.cos(turn), si = Math.sin(turn)
      const outline = local.map(([x, z]) => [s.x + x * co - z * si, s.z + x * si + z * co] as [number, number])
      // (counter-clockwise from above, as the stone's faces are made: x then z the other way round)
      f.stone(outline.reverse(), top, EARTH_Y, 0.006, c, c.clone().multiplyScalar(0.8), c.clone().multiplyScalar(0.52))
    }
    const stoneTones = ['#aaa396', '#9e978a', '#b3ac9f', '#968f82'].map((h) => new THREE.Color(h))
    for (const [sx, sz, turn] of stepAt) {
      const n = 9, outline: [number, number][] = []
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + (rnd() - 0.5) * 0.25, r = 1 + (rnd() - 0.5) * 0.12
        const x = Math.cos(a) * STEP_RX * r, z = Math.sin(a) * STEP_RZ * r
        outline.push([sx + x * Math.cos(turn) - z * Math.sin(turn), sz + x * Math.sin(turn) + z * Math.cos(turn)])
      }
      const c = stoneTones[Math.floor(rnd() * stoneTones.length)]
      f.stone(outline.reverse(), STEP_TOP, EARTH_Y, 0.012, c, c.clone().multiplyScalar(0.74), c.clone().multiplyScalar(0.5))
    }
    const stones = f.geometry()
    // ---- the tufts: in clumps along the curb, out in the earth, and three at each of its outer corners; none on the way out
    const tufts: [number, number, number, number][] = []
    const clearOfWay = (x: number, z: number) => !(z > front && Math.abs(x - mid) < STEP_RX + 0.2)
    for (const r of plan.runs) {
      const alongX = r.out[0] === 0, s0 = alongX ? r.a[0] : r.a[1], s1 = alongX ? r.b[0] : r.b[1]
      const edge = alongX ? r.a[1] : r.a[0], ox = r.out[0], oz = r.out[1]
      for (let s = s0 + 0.3 + rnd() * 0.5; s < s1 - 0.25; s += 0.7 + rnd() * 0.9) {
        const clump = 1 + Math.floor(rnd() * 3)
        for (let k = 0; k < clump; k++) {
          const along = s + (rnd() - 0.5) * 0.16, out = CURB_W + 0.1 + rnd() * 0.08
          const x = alongX ? along : edge + ox * out, z = alongX ? edge + oz * out : along
          if (clearOfWay(x, z)) tufts.push([x, z, rnd() * Math.PI * 2, 0.8 + rnd() * 0.45])
        }
      }
      for (const [conv, p, dir] of [[r.convexA, r.a, -1], [r.convexB, r.b, 1]] as const) {
        if (!conv) continue
        for (let k = 0; k < 3; k++) {
          const along = (alongX ? p[0] : p[1]) + dir * (0.06 + rnd() * 0.12), out = CURB_W + 0.11 + rnd() * 0.08
          const x = alongX ? along : edge + ox * out, z = alongX ? edge + oz * out : along
          if (clearOfWay(x, z)) tufts.push([x, z, rnd() * Math.PI * 2, 0.9 + rnd() * 0.4])
        }
      }
    }
    // ---- the earth past the curb: its picture, faded out at its edge
    const reach = GRAVEL_W + CURB_W + EARTH_BAND
    const shapes: Rect[] = [...building.map((r) => [r[0] - reach, r[1] - reach, r[2] + reach, r[3] + reach] as Rect),
      [apron[0] - CURB_W - EARTH_BAND, apron[1], apron[2] + CURB_W + EARTH_BAND, apron[3] + CURB_W + EARTH_BAND + 0.12]]
    const X0 = Math.min(...shapes.map((r) => r[0])) - EARTH_FADE, X1 = Math.max(...shapes.map((r) => r[2])) + EARTH_FADE
    const Z0 = Math.min(...shapes.map((r) => r[1])) - EARTH_FADE, Z1 = Math.max(...shapes.map((r) => r[3])) + EARTH_FADE
    const W = X1 - X0, H = Z1 - Z0
    const cw = Math.min(1600, Math.round(W * EARTH_PX)), ch = Math.min(1600, Math.round(H * EARTH_PX))
    const sx = cw / W, sz = ch / H
    const px = (v: number) => (v - X0) * sx, pz = (v: number) => (v - Z0) * sz
    const c = document.createElement('canvas')
    c.width = cw; c.height = ch
    const g = c.getContext('2d')!
    // (tamped earth dried pale in the sun, a warm tan: a dark brown read as a shadow round the shop as it faded out)
    g.fillStyle = 'rgb(140,112,82)'
    g.fillRect(0, 0, cw, ch)
    const blob = (x: number, y: number, r: number, rgb: string, a: number) => {
      const gr = g.createRadialGradient(x, y, 0, x, y, r)
      gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`)
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2)
    }
    // (drier and damper patches, broad and soft; mottling; grit)
    const patch: [string, number][] = [['168,140,106', 0.16], ['106,82,60', 0.14], ['94,74,54', 0.1], ['156,128,94', 0.14]]
    for (let i = 0; i < 140; i++) blob(rnd() * cw, rnd() * ch, (0.15 + rnd() * 0.4) * sx, ...patch[i % 4])
    for (let i = 0; i < 2200; i++) {
      g.fillStyle = i % 2 ? 'rgba(168,140,106,0.13)' : 'rgba(92,72,52,0.13)'
      g.beginPath(); g.arc(rnd() * cw, rnd() * ch, (0.012 + rnd() * 0.03) * sx, 0, Math.PI * 2); g.fill()
    }
    for (let i = 0; i < 9000; i++) { g.fillStyle = i % 3 ? 'rgba(82,64,46,0.4)' : 'rgba(208,190,162,0.4)'; g.fillRect(rnd() * cw, rnd() * ch, 1, 1) }
    // (the way out from the last stepping stone to the street, trodden paler)
    g.save()
    g.filter = `blur(${Math.round(0.08 * sx)}px)`
    g.fillStyle = 'rgba(186,162,128,0.4)'
    g.beginPath(); g.ellipse(px(mid + 0.02), pz(apronEnd + 0.55), 0.3 * sx, 0.55 * sz, 0, 0, Math.PI * 2); g.fill()
    g.restore()
    // (small stones, each with its shadow)
    const pebble = ['rgb(150,142,128)', 'rgb(126,118,106)', 'rgb(168,160,146)', 'rgb(108,100,90)']
    for (let i = 0; i < 420; i++) {
      const x = rnd() * cw, y = rnd() * ch, r = (0.006 + rnd() * rnd() * 0.016) * sx, a = rnd() * Math.PI
      g.fillStyle = 'rgba(38,28,20,0.35)'; g.beginPath(); g.ellipse(x + r * 0.3, y + r * 0.4, r, r * 0.7, a, 0, Math.PI * 2); g.fill()
      g.fillStyle = pebble[i % 4]; g.beginPath(); g.ellipse(x, y, r, r * 0.7, a, 0, Math.PI * 2); g.fill()
    }
    // (moss along the curb, thicker toward its corners, in the damp it keeps; and in patches here and there)
    const moss = ['74,100,50', '92,122,60', '62,86,42', '104,130,66']
    for (const r of plan.runs) {
      const alongX = r.out[0] === 0, s0 = alongX ? r.a[0] : r.a[1], s1 = alongX ? r.b[0] : r.b[1]
      const edge = alongX ? r.a[1] : r.a[0], ox = r.out[0], oz = r.out[1]
      for (let s = s0; s < s1; s += 0.025) {
        const nearEnd = Math.min(s - s0, s1 - s), thick = nearEnd < 0.5 ? 0.85 : 0.35
        if (rnd() > thick) continue
        const out = CURB_W + 0.004 + rnd() * rnd() * 0.09
        const x = alongX ? s : edge + ox * out, z = alongX ? edge + oz * out : s
        blob(px(x), pz(z), (0.012 + rnd() * 0.03) * sx, moss[Math.floor(rnd() * 4)], 0.55 + rnd() * 0.3)
      }
    }
    for (let i = 0; i < 26; i++) {
      const r = plan.runs[Math.floor(rnd() * plan.runs.length)], alongX = r.out[0] === 0
      const s = (alongX ? r.a[0] : r.a[1]) + rnd() * ((alongX ? r.b[0] - r.a[0] : r.b[1] - r.a[1]))
      const out = CURB_W + 0.05 + rnd() * (EARTH_BAND - 0.05), edge = alongX ? r.a[1] : r.a[0]
      const x = alongX ? s : edge + r.out[0] * out, z = alongX ? edge + r.out[1] * out : s
      for (let k = 0; k < 7; k++) blob(px(x + (rnd() - 0.5) * 0.12), pz(z + (rnd() - 0.5) * 0.12), (0.02 + rnd() * 0.04) * sx, moss[k % 4], 0.5)
    }
    // (fallen leaves, dry and curled: a few blown up against the curb, the rest about the band)
    const leaf = ['150,88,40', '178,120,48', '118,70,36', '190,148,70', '140,60,34']
    for (let i = 0; i < 38; i++) {
      const r = plan.runs[Math.floor(rnd() * plan.runs.length)], alongX = r.out[0] === 0
      const s = (alongX ? r.a[0] : r.a[1]) + rnd() * ((alongX ? r.b[0] - r.a[0] : r.b[1] - r.a[1]))
      const out = CURB_W + (i % 3 ? 0.01 + rnd() * 0.05 : 0.05 + rnd() * (EARTH_BAND - 0.02)), edge = alongX ? r.a[1] : r.a[0]
      const x = px(alongX ? s : edge + r.out[0] * out), y = pz(alongX ? edge + r.out[1] * out : s)
      const L = (0.022 + rnd() * 0.02) * sx, a = rnd() * Math.PI * 2, col = leaf[Math.floor(rnd() * leaf.length)]
      g.save(); g.translate(x, y); g.rotate(a)
      g.fillStyle = 'rgba(30,20,12,0.3)'; g.beginPath(); g.ellipse(L * 0.12, L * 0.16, L, L * 0.42, 0, 0, Math.PI * 2); g.fill()
      g.fillStyle = `rgb(${col})`; g.beginPath(); g.moveTo(-L, 0); g.quadraticCurveTo(0, -L * 0.62, L, 0); g.quadraticCurveTo(0, L * 0.62, -L, 0); g.fill()
      g.strokeStyle = 'rgba(70,40,20,0.55)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-L * 1.25, 0); g.lineTo(L * 0.9, 0); g.stroke()
      g.restore()
    }
    // (a few weeds where it thins out)
    for (const r of shapes) {
      const per = 2 * ((r[2] - r[0]) + (r[3] - r[1]))
      for (let i = 0; i < per * 2.2; i++) {
        const t = rnd() * per, w = r[2] - r[0], h = r[3] - r[1], o = 0.02 + rnd() * 0.12
        const [ex, ez] = t < w ? [r[0] + t, r[1] - o] : t < w + h ? [r[2] + o, r[1] + t - w] : t < 2 * w + h ? [r[2] - (t - w - h), r[3] + o] : [r[0] - o, r[3] - (t - 2 * w - h)]
        const x = px(ex), y = pz(ez)
        g.strokeStyle = rnd() < 0.5 ? 'rgba(74,96,48,0.7)' : 'rgba(96,114,58,0.65)'
        g.lineWidth = 1.2
        for (let j = 0; j < 4; j++) {
          const a = -Math.PI / 2 + (rnd() - 0.5) * 1.6, l = (0.018 + rnd() * 0.026) * sx
          g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke()
        }
      }
    }
    // (drier and paler toward its edge, as earth nobody waters is: it fades out to dust, not to a dark smudge. A pale coat over it all,
    // cut away again within 0.12 of its outline (each shape drawn shrunk, so only the true outline keeps the rim, not where two meet))
    const dust = document.createElement('canvas')
    dust.width = cw; dust.height = ch
    const dg = dust.getContext('2d')!
    dg.fillStyle = 'rgba(200,182,152,0.62)'
    dg.fillRect(0, 0, cw, ch)
    dg.globalCompositeOperation = 'destination-out'
    dg.filter = `blur(${Math.round(0.07 * sx)}px)`
    dg.fillStyle = '#000'
    dg.beginPath()
    for (const [a0, b0, a1, b1] of shapes) dg.roundRect(px(a0 + 0.12), pz(b0 + 0.12), (a1 - a0 - 0.24) * sx, (b1 - b0 - 0.24) * sz, 0.12 * sx)
    dg.fill()
    g.drawImage(dust, 0, 0)
    // (its edge: round the band's outline, its corners rounded, faded out over EARTH_FADE; a little uneven, not in blobs)
    const m = document.createElement('canvas')
    m.width = cw; m.height = ch
    const mg = m.getContext('2d')!
    mg.filter = `blur(${Math.round(EARTH_FADE * sx * 0.42)}px)`
    mg.fillStyle = '#fff'
    mg.beginPath()
    for (const [a0, b0, a1, b1] of shapes) mg.roundRect(px(a0), pz(b0), (a1 - a0) * sx, (b1 - b0) * sz, 0.18 * sx)
    mg.fill()
    for (const r of shapes) {
      const per = 2 * ((r[2] - r[0]) + (r[3] - r[1]))
      for (let i = 0; i < per * 1.4; i++) {
        const t = rnd() * per, w = r[2] - r[0], h = r[3] - r[1]
        const [ex, ez] = t < w ? [r[0] + t, r[1]] : t < w + h ? [r[2], r[1] + t - w] : t < 2 * w + h ? [r[2] - (t - w - h), r[3]] : [r[0], r[3] - (t - 2 * w - h)]
        mg.beginPath(); mg.arc(px(ex), pz(ez), (0.05 + rnd() * 0.07) * sx, 0, Math.PI * 2); mg.fill()
      }
    }
    // (its colour and its fade put together by hand, not cut out on the canvas: a canvas keeps nothing of a colour where it's wholly clear
    // (black there), and the picture's smaller copies averaged that black into its edge, a dark ring round it as it faded. Each pixel the
    // earth's own colour, clear or not; rows turned over as the plane lays them (the canvas's top at Z0))
    const col = g.getImageData(0, 0, cw, ch).data, msk = mg.getImageData(0, 0, cw, ch).data
    const data = new Uint8Array(cw * ch * 4)
    for (let y = 0; y < ch; y++) {
      const from = y * cw * 4, to = (ch - 1 - y) * cw * 4
      for (let i = 0; i < cw * 4; i += 4) {
        data[to + i] = col[from + i]; data[to + i + 1] = col[from + i + 1]; data[to + i + 2] = col[from + i + 2]; data[to + i + 3] = msk[from + i + 3]
      }
    }
    const tex = new THREE.DataTexture(data, cw, ch, THREE.RGBAFormat)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.magFilter = THREE.LinearFilter
    tex.minFilter = THREE.LinearMipmapLinearFilter
    tex.generateMipmaps = true
    tex.anisotropy = 4
    tex.needsUpdate = true
    const earthMat = new THREE.MeshToonMaterial({ map: tex, transparent: true, depthWrite: false })
    earthMat.name = 'ShopGround'
    const earth = new THREE.PlaneGeometry(W, H)
    return { gravel, stones, tufts, tex, earthMat, earth, ex: (X0 + X1) / 2, ez: (Z0 + Z1) / 2 }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  useEffect(() => () => { if (!made) return; made.gravel.dispose(); made.stones.dispose(); made.tex.dispose(); made.earthMat.dispose(); made.earth.dispose() }, [made])
  // (the tufts: one mesh of copies, each its place, turn, size and a little of its own green)
  const tuftMesh = useMemo(() => {
    if (!made) return null
    const im = new THREE.InstancedMesh(TUFT_GEO, TUFT_MAT, made.tufts.length)
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), col = new THREE.Color()
    const greens = ['#ffffff', '#e4eed6', '#d4e4c4', '#f2f6e6']
    made.tufts.forEach(([x, z, turn, k], i) => {
      m.compose(new THREE.Vector3(x, EARTH_Y, z), q.setFromAxisAngle(up, turn), new THREE.Vector3(k, k * (0.85 + ((i * 37) % 10) / 30), k))
      im.setMatrixAt(i, m)
      im.setColorAt(i, col.set(greens[i % greens.length]))
    })
    im.name = 'shop-tufts'
    im.receiveShadow = true
    im.raycast = () => null
    im.computeBoundingSphere()
    return im
  }, [made])
  useEffect(() => () => tuftMesh?.dispose(), [tuftMesh])
  if (!made) return null
  return (
    <group name="shop-ground-all">
      <mesh name="shop-ground" geometry={made.earth} material={made.earthMat} position={[made.ex, EARTH_Y, made.ez]} rotation-x={-Math.PI / 2}
        renderOrder={-2} receiveShadow raycast={() => null} />
      <mesh name="shop-gravel" geometry={made.gravel} material={GRAVEL_MAT} receiveShadow raycast={() => null} />
      <mesh name="shop-curb" geometry={made.stones} material={STONE_MAT} receiveShadow raycast={() => null} />
      {tuftMesh && <primitive object={tuftMesh} />}
    </group>
  )
})
