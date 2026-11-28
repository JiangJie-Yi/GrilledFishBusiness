/**
 * The ground round the shop (item 708, the owner's 「然後模型周圍我需要一點泥土地，門口多一些」; made again in items 725 and 726, the owner's
 * 「且泥土地有點大圈，然後樣子不是很好看」「我希望它豐富點」: it was one sheet of earth 1.5 out round the building and 3.0 before the door,
 * its edge a ragged ring of blurred blobs that looked like shadows on the ground). As round a real shop:
 *
 * - a bed of river gravel (玉砂利) before the door only (item 741, the owner's 「石子地就幫我做門前有就好，其它拿掉」: it ran GRAVEL_W 0.36 wide
 *   all round the building's foot as well), the steps' width and a little, out to the street (the stone steps standing in it, the door's
 *   bamboo's planter at its back corner);
 * - a curb (縁石) of low granite stones along the bed's outer edge, each its own length, height and grey, their corners closed;
 * - stepping stones (飛び石) from the steps' foot out over the bed and the curb to the street;
 * - round the building, tamped earth from the stone plinth's foot (guestbar/floors' ShopBase, item 744) out, moss along the plinth and the
 *   curb, fallen leaves, a few weeds, faded out over EARTH_FADE;
 * - tufts of mondo grass (竜のひげ) along the plinth's foot and the curb, and at their corners.
 *
 * All of it in the room floor's frame (x = -lay, z = along), laid from the building's footprint (its rects: game/world/groundLayout's
 * groundPlan and curbStones, BDD ground). Four draws (the gravel, the stones, the tufts, the earth), none casting a shadow, all taking the
 * sun's (out of doors); made once, at load.
 */
import { memo, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { curbStones, groundPlan, type PlinthPlan, type Rect, type Run } from '@/game/world/groundLayout'
import { groundWet } from '@/game/world/puddles'
import { signTexture } from '@/scene/props/signFont'
import { getClock } from '@/ui/kit/clockStore'
import { RAIN_NOW } from './shopFront'
import { skyNow } from '@/shops/grill/dining/ambient'

/** heights in the floor's frame: the earth's sheet (2 mm under the street's level, -0.46); the gravel's top, just under the stone steps'
 * foot (-0.453: they stand in it, as the building's base and the door's bamboo do); the curb's top, 3.5 cm over the gravel; the stepping
 * stones' top, 1.2 cm over it */
export const EARTH_Y = -0.462
/** (item 834) how wet the ground out front is now (0 dry .. 1 soaked, game/world/puddles' groundWet, eased): the way in's stone steps and
 * the stone plinth darken with it as the earth and the gravel do (floors.tsx) */
export const GROUND_WET = { k: 0 }
export const GRAVEL_Y = -0.4535
const CURB_TOP = GRAVEL_Y + 0.035, STEP_TOP = GRAVEL_Y + 0.012
/** the curb's width, its stones' length (each up to CURB_SPREAD of it longer or shorter), their joint */
const CURB_W = 0.05, CURB_LEN = 0.32, CURB_SPREAD = 0.18, CURB_JOINT = 0.004
/** the bed before the door: how far out from the front, how far past the doorway each side (the steps' width and a little (item 741): it
 * was 0.65, the facade's width) */
// (item 833, the owner's 「石階縮短三分之一」, a red box round the steps and two thirds of the bed out from them: 1.25 it was, from the
// building's front to the curb)
const APRON_OUT = 0.83, APRON_SIDE = 0.03
/**
 * the door's bamboo's planter (guestbar/entrance's DOOR_BAMBOO_AT), measured in the floor's frame (tests/e2e/_ground741.mjs): from the
 * doorway's far side, across (its near side 2.2 cm past it) and out from the front; the bed's edge goes round it, its curb from its front on
 */
const PLANTER = { x: [0.022, 0.352], z: [-0.002, 0.328] }
/** the earth round the building, out from its plinth's face (item 752, the owner's 「泥土地往內縮，除了玄關」: 0.77 before, as far as the
 * gravel, the curb and the earth past them reached, items 725-726), a margin round its picture; the band past the bed's curb (the genkan's
 * front, kept as it was); its picture's pixels to a unit. Its edge square (item 765, the owner's 「泥土地必須要方的」: rounded, blurred and
 * ragged with blobs before), straight along each side and square at each corner; soft (item 779, the owner's 「泥土地要有點柔邊」: crisp
 * to a pixel, a darker tamped line round it, since item 765): faded out over EARTH_SOFT each side of its outline */
const EARTH_REACH = 0.42, EARTH_BAND = 0.36, EARTH_FADE = 0.04, EARTH_PX = 96, EARTH_SOFT = 0.022
/** (item 1011) how far past the gravel's curb along the front the earth goes (the band before the door's further, for its last stepping stone) */
const EARTH_PAST = 0.14
/** (item 828, the owner's 「然後到最外圍就稍微淡些」) its outermost band fainter: how wide, and how much of it shows at its edge (all of it
 * EARTH_THIN in) */
const EARTH_THIN = 0.13, EARTH_EDGE = 0.5
/** (item 1002, the owner's 「有角的地方都改成圓的」, red rings round two of its corners) the earth's corners rounded this far, and where its
 * shapes meet the corner between them as much (a smooth union of the two) */
const EARTH_ROUND = 0.4
/** how much ground one repeat of the gravel's picture covers */
const GRAVEL_TILE = 0.5
/** the stepping stones: their half sizes across and along the way out, the gaps between them */
const STEP_RX = 0.16, STEP_RZ = 0.12, STEP_PITCH = 0.29

/**
 * A puddle (item 752): one shape, a little uneven round its edge (16 points round, closed by a ladder of quads across it, rule 2: no fan),
 * laid at each place in one mesh; still water, dark and a little see-through, the sky's light in soft streaks across it, painted (item 772,
 * the Optimization window's count: shining, a standard material mirroring a sky of its own, they made three programs more, theirs and the
 * two three blurs that sky with; now the earth's own (toon, its picture, see-through), lighter by day and darker after dark). Its rain
 * rings as the drain's water (one program with the washstand's stream)
 */
const PUDDLES = 6
const PUDDLE_GEO = (() => {
  const N = 16, pts: [number, number][] = []
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2, r = 1 + 0.1 * Math.sin(2 * a + 0.7) + 0.06 * Math.sin(3 * a + 2.1)
    pts.push([Math.cos(a) * r, Math.sin(a) * r])
  }
  const pos: number[] = [], nor: number[] = [], uv: number[] = []
  // (its picture laid flat over it, 2.4 across: the picture's water inside the shape everywhere, faded out before its edge)
  const put = (...ix: number[]) => { for (const i of ix) { pos.push(pts[i][0], 0, pts[i][1]); nor.push(0, 1, 0); uv.push(pts[i][0] / 2.4 + 0.5, pts[i][1] / 2.4 + 0.5) } }
  // (rungs between k and N - k, wound to face up)
  put(0, N - 1, 1)
  for (let k = 1; k < N / 2 - 1; k++) { put(k, N - k, N - k - 1); put(k, N - k - 1, k + 1) }
  put(N / 2 - 1, N / 2 + 1, N / 2)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  return g
})()
/**
 * The puddle's picture: still water, the sky's light in it (lighter streaks where it catches more), darkening through a rim of soaked earth
 * to nothing at its uneven edge, so it lies in the earth rather than on it. Made by hand, each pixel its colour whether clear or not (a
 * canvas's clear pixels are black, and its smaller copies ringed it dark)
 */
const PUDDLE_TEX = (() => {
  const N = 128, data = new Uint8Array(N * N * 4)
  const water = [110, 122, 134], rim = [40, 31, 24]
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = (x + 0.5) / N - 0.5, v = (y + 0.5) / N - 0.5, r = Math.hypot(u, v), a = Math.atan2(v, u)
    const edge = 0.3 + 0.03 * Math.sin(2 * a + 0.7) + 0.02 * Math.sin(5 * a + 1.3)
    const alpha = Math.min(1, Math.max(0, (edge - r) / 0.07))
    // (the rim: soaked earth from the edge in, over a third of the way)
    const wetRim = Math.min(1, Math.max(0, (r - edge * 0.55) / (edge * 0.45)))
    // (streaks of the sky's light across it, soft: what it mirrors, painted)
    const streak = 0.34 * Math.max(0, Math.sin(u * 14 + v * 5 + 1.1)) * Math.max(0, Math.sin(u * 3 - v * 9))
    const i = (y * N + x) * 4
    for (let c = 0; c < 3; c++) data[i + c] = Math.round(Math.min(255, (water[c] * (1 - wetRim) + rim[c] * wetRim) * (1 + streak)))
    data[i + 3] = Math.round(255 * alpha * (0.88 + 0.12 * wetRim))
  }
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat)
  t.colorSpace = THREE.SRGBColorSpace
  t.magFilter = THREE.LinearFilter
  t.minFilter = THREE.LinearMipmapLinearFilter
  t.generateMipmaps = true
  t.needsUpdate = true
  return t
})()
const PUDDLE_MAT = new THREE.MeshToonMaterial({ color: '#ffffff', map: PUDDLE_TEX, transparent: true, depthWrite: false,
  polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 })
PUDDLE_MAT.name = 'ShopPuddle'
/** how light they are by the sky now (the sky's light in them, dim after dark) */
const PUDDLE_SHINE: Record<string, number> = { day: 1, dawn: 0.86, dusk: 0.78, night: 0.62 }
type Puddle = { x: number; z: number; r: number; turn: number; long: number }
/** the puddles' mesh laid `s` as full as they get (1 full): each the shape stretched `long` along its turn and `r` across, flat on the earth */
function layPuddles(g: THREE.BufferGeometry, puddles: readonly Puddle[], s: number) {
  const base = PUDDLE_GEO.attributes.position.array as Float32Array, n = base.length / 3
  const pos = g.attributes.position as THREE.BufferAttribute, a = pos.array as Float32Array
  puddles.forEach((q, i) => {
    const c = Math.cos(q.turn), sn = Math.sin(q.turn), sx = q.r * q.long * s, sz = q.r * s
    for (let v = 0; v < n; v++) {
      const x = base[v * 3] * sx, z = base[v * 3 + 2] * sz, o = (i * n + v) * 3
      a[o] = q.x + x * c + z * sn
      a[o + 1] = EARTH_Y + 0.0022
      a[o + 2] = q.z - x * sn + z * c
    }
  })
  pos.needsUpdate = true
}
const RIPPLE_GEO = new THREE.RingGeometry(0.72, 1, 16).rotateX(-Math.PI / 2)
const RIPPLE_MATS = Array.from({ length: 8 }, () => new THREE.MeshBasicMaterial({ color: '#dfe8ec', transparent: true, opacity: 0, depthWrite: false, toneMapped: false }))

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

export const ShopGround = memo(function ShopGround({ building, plinth, plinthOut, door, front, stepsFoot, keep }: {
  /** the building's footprint on the ground: its rects, [x0, z0, x1, z1] in the floor's frame */
  building: Rect[]
  /** its stone plinth (item 744, ShopBase's): the ring it stands proud of the footprint, and its face's runs; how far proud */
  plinth: PlinthPlan; plinthOut: number
  /** the doorway across x at the front; the front's z; where the stone steps out from it end */
  door: [number, number]; front: number; stepsFoot: number
  /** places on the earth no tuft, moss or leaf is put in (what stands there: the toilets' drain's basin and its damp, item 755) */
  keep?: Rect[]
}) {
  const key = JSON.stringify([building, plinth, plinthOut, door, front, stepsFoot, keep])
  const made = useMemo(() => {
    if (typeof document === 'undefined') return null
    const rnd = seeded(726)
    // (item 1011, the owner's 「門口碎石地板往橫的延伸，泥土地內縮」, a red frame along the front from the door's bed to the building's corner:
    // the bed run on along the front, as deep, to the corner on the door's far side from the bamboo's planter, its end flush with the plinth
    // round the corner; the band of earth before the door, with its last stepping stone, as it was)
    const doorApron: Rect = [door[0] - APRON_SIDE, front, door[1] + APRON_SIDE, front + APRON_OUT]
    const atFront = building.filter((r) => Math.abs(r[3] - front) < 0.05)
    const corner = Math.min(...(atFront.length ? atFront : building).map((r) => r[0])) - plinthOut
    const apron: Rect = [Math.min(doorApron[0], corner), front, doorApron[2], front + APRON_OUT]
    // (the bed before the door only (item 741): none round the building; its edge round the plinth (its ledge) and the bamboo's planter,
    // the planter's place taken from the plinth's face (so the bed meets the two with no slot of earth between, nor a curb in it))
    const planter: Rect = [door[1] + plinthOut, front + PLANTER.z[0], door[1] + PLANTER.x[1], front + PLANTER.z[1]]
    const plan = groundPlan([...building, ...plinth.ledge, planter], 0, apron)
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
    // (as many as the bed has room for between the steps' foot and its curb (three it had, item 833 shortened it), spread evenly; and one
    // over the curb on the earth)
    const stepAt: [number, number, number][] = []
    const bedLen = apronEnd - stepsFoot, nStep = Math.max(1, Math.floor((bedLen - 0.12) / STEP_PITCH))
    for (let k = 0; k < nStep; k++) stepAt.push([mid + [0, 0.06, -0.05][k % 3], stepsFoot + ((k + 0.5) * bedLen) / nStep, [0.12, -0.18, 0.08][k % 3]])
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
    // ---- the edges the earth's moss, leaves and tufts keep to: the plinth's foot (its face) and the bed's curb's outer side; none in the
    // bed, on its curb or on the way out
    const edges: { r: Run; off: number }[] = [...plinth.runs.map((r) => ({ r, off: 0.004 })), ...plan.runs.map((r) => ({ r, off: CURB_W }))]
    const clearOfWay = (x: number, z: number) => !(z > front && Math.abs(x - mid) < STEP_RX + 0.2) &&
      !(x > apron[0] - CURB_W - 0.04 && x < apron[2] + CURB_W + 0.04 && z > apron[1] - 0.02 && z < apron[3] + CURB_W + 0.04) &&
      !(keep ?? []).some(([x0, z0, x1, z1]) => x > x0 && x < x1 && z > z0 && z < z1)
    // ---- the tufts (item 833, the owner's 「泥土地上的草可以多種一點、自然些」: they were clumps of one to three, 0.7 to 1.6 apart, only along
    // the edges, a row of them): along the plinth's foot and the curb in clumps closer together and fuller (two to five, the middle one the
    // biggest, the rest smaller round it), a cluster at each outer corner; and out over the earth, a clump here and there, thicker close in
    // under the building (damp, nobody walks there) and thinning out toward the earth's edge; none on the way in
    const tufts: [number, number, number, number][] = []
    const clump = (cx: number, cz: number, n: number, spread: number, big: number) => {
      for (let k = 0; k < n; k++) {
        const a = rnd() * Math.PI * 2, d = k === 0 ? 0 : spread * (0.45 + rnd() * 0.55)
        const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d
        if (clearOfWay(x, z)) tufts.push([x, z, rnd() * Math.PI * 2, big * (k === 0 ? 1 : 0.55 + rnd() * 0.35)])
      }
    }
    for (const { r, off } of edges) {
      const alongX = r.out[0] === 0, s0 = alongX ? r.a[0] : r.a[1], s1 = alongX ? r.b[0] : r.b[1]
      const edge = alongX ? r.a[1] : r.a[0], ox = r.out[0], oz = r.out[1]
      for (let s = s0 + 0.15 + rnd() * 0.3; s < s1 - 0.15; s += 0.32 + rnd() * 0.6) {
        const out = off + 0.07 + rnd() * 0.12
        clump(alongX ? s : edge + ox * out, alongX ? edge + oz * out : s, 2 + Math.floor(rnd() * 4), 0.075, 0.85 + rnd() * 0.5)
      }
      for (const [conv, p, dir] of [[r.convexA, r.a, -1], [r.convexB, r.b, 1]] as const) {
        if (!conv) continue
        const along = (alongX ? p[0] : p[1]) + dir * (0.08 + rnd() * 0.08), out = off + 0.1 + rnd() * 0.06
        clump(alongX ? along : edge + ox * out, alongX ? edge + oz * out : along, 4 + Math.floor(rnd() * 3), 0.09, 1.05 + rnd() * 0.3)
      }
    }
    // (out over the earth: tried at random over its square, taken the more often the nearer the building's plinth (clear of it by a hand))
    {
      const xs = building.flatMap((b) => [b[0], b[2]]), zs = building.flatMap((b) => [b[1], b[3]])
      // (item 1002: out before the front as far as the earth goes now; item 1011: to just past the bed's curb along it)
      const ex0 = Math.min(...xs) - EARTH_REACH, ex1 = Math.max(...xs) + EARTH_REACH, ez0 = Math.min(...zs) - EARTH_REACH
      const ez1 = Math.max(Math.max(...zs) + EARTH_REACH, apron[3] + CURB_W + EARTH_PAST)
      const awayOf = (x: number, z: number) => Math.min(...building.map(([a0, b0, a1, b1]) => Math.max(a0 - x, x - a1, b0 - z, z - b1, -1e9)))
      const tries = Math.round((ex1 - ex0) * (ez1 - ez0) * 6)
      for (let i = 0; i < tries; i++) {
        const x = ex0 + 0.06 + rnd() * (ex1 - ex0 - 0.12), z = ez0 + 0.06 + rnd() * (ez1 - ez0 - 0.12)
        const away = awayOf(x, z)
        if (away < plinthOut + 0.08) continue
        if (rnd() > 0.1 + 0.55 * (1 - THREE.MathUtils.smoothstep(away, plinthOut + 0.1, EARTH_REACH))) continue
        clump(x, z, 1 + Math.floor(rnd() * 3), 0.06, 0.6 + rnd() * 0.55)
      }
    }
    // ---- the earth round the building and past the curb: its picture, faded out at its edge. (item 828, the owner's 「泥土地要正方形」, red
    // rings round three jogs in its edge, as item 765's 「泥土地必須要方的」: it was each of the building's rects EARTH_REACH out, put
    // together, so wherever the building stepped in or out (the toilets' block, the stock room, the wing, the genkan's corner) its edge
    // stepped with it, notched and jogged) one square: the building's whole extent EARTH_REACH out all round, its corners square; and the
    // band before the door out past the bed's curb as before (item 752: 「除了玄關」)
    const reach = EARTH_REACH
    const bx = building.flatMap((r) => [r[0], r[2]]), bz = building.flatMap((r) => [r[1], r[3]])
    // (the band before the door, its sides flush with the square's where they come within a forearm of them: a step of a hand or two
    // between them was the third jog the owner ringed, at the front corner)
    const tab: Rect = [doorApron[0] - CURB_W - EARTH_BAND, doorApron[1], doorApron[2] + CURB_W + EARTH_BAND, doorApron[3] + CURB_W + EARTH_BAND + 0.12]
    // (item 1002, the owner's 「前面泥土地需多出這一區塊」, the strip before the building's whole front framed: bare past EARTH_REACH, and the
    // band before the door out further. The square's front out as far as that band's, the whole length of the front)
    // (item 1011, the owner's 「泥土地內縮」: the gravel along the front now, the earth's front drawn in to just past its curb (EARTH_PAST),
    // the band before the door alone out further, for its last stepping stone)
    const sq: Rect = [Math.min(...bx) - reach, Math.min(...bz) - reach, Math.max(...bx) + reach, Math.max(Math.max(...bz) + reach, apron[3] + CURB_W + EARTH_PAST)]
    const shapes: Rect[] = [sq, [tab[0] - sq[0] < 0.5 ? sq[0] : tab[0], tab[1], sq[2] - tab[2] < 0.5 ? sq[2] : tab[2], tab[3]]]
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
    // (the way out from the last stepping stone to the street, trodden paler (item 1002: a little, as the rest's one colour))
    g.save()
    g.filter = `blur(${Math.round(0.08 * sx)}px)`
    g.fillStyle = 'rgba(186,162,128,0.18)'
    g.beginPath(); g.ellipse(px(mid + 0.02), pz(apronEnd + 0.55), 0.3 * sx, 0.55 * sz, 0, 0, Math.PI * 2); g.fill()
    g.restore()
    // (small stones, each with its shadow)
    const pebble = ['rgb(150,142,128)', 'rgb(126,118,106)', 'rgb(168,160,146)', 'rgb(108,100,90)']
    for (let i = 0; i < 420; i++) {
      const x = rnd() * cw, y = rnd() * ch, r = (0.006 + rnd() * rnd() * 0.016) * sx, a = rnd() * Math.PI
      g.fillStyle = 'rgba(38,28,20,0.35)'; g.beginPath(); g.ellipse(x + r * 0.3, y + r * 0.4, r, r * 0.7, a, 0, Math.PI * 2); g.fill()
      g.fillStyle = pebble[i % 4]; g.beginPath(); g.ellipse(x, y, r, r * 0.7, a, 0, Math.PI * 2); g.fill()
    }
    // (moss along the plinth's foot and the curb, thicker toward their corners, in the damp they keep; and in patches here and there)
    const moss = ['74,100,50', '92,122,60', '62,86,42', '104,130,66']
    for (const { r, off } of edges) {
      const alongX = r.out[0] === 0, s0 = alongX ? r.a[0] : r.a[1], s1 = alongX ? r.b[0] : r.b[1]
      const edge = alongX ? r.a[1] : r.a[0], ox = r.out[0], oz = r.out[1]
      for (let s = s0; s < s1; s += 0.025) {
        const nearEnd = Math.min(s - s0, s1 - s), thick = nearEnd < 0.5 ? 0.85 : 0.35
        if (rnd() > thick) continue
        const out = off + 0.004 + rnd() * rnd() * 0.09
        const x = alongX ? s : edge + ox * out, z = alongX ? edge + oz * out : s
        if (clearOfWay(x, z)) blob(px(x), pz(z), (0.012 + rnd() * 0.03) * sx, moss[Math.floor(rnd() * 4)], 0.55 + rnd() * 0.3)
      }
    }
    // (an edge at random, a long one more often than a short: and a spot along it)
    const lens = edges.map(({ r }) => Math.hypot(r.b[0] - r.a[0], r.b[1] - r.a[1])), total = lens.reduce((p, q) => p + q, 0)
    const pick = () => { let t = rnd() * total, i = 0; while (i < lens.length - 1 && t > lens[i]) t -= lens[i++]; return edges[i] }
    for (let i = 0; i < (total > 0 ? 26 : 0); i++) {
      const { r, off } = pick(), alongX = r.out[0] === 0
      const s = (alongX ? r.a[0] : r.a[1]) + rnd() * ((alongX ? r.b[0] - r.a[0] : r.b[1] - r.a[1]))
      const out = off + 0.05 + rnd() * (EARTH_BAND - 0.05), edge = alongX ? r.a[1] : r.a[0]
      const x = alongX ? s : edge + r.out[0] * out, z = alongX ? edge + r.out[1] * out : s
      if (!clearOfWay(x, z)) continue
      for (let k = 0; k < 7; k++) blob(px(x + (rnd() - 0.5) * 0.12), pz(z + (rnd() - 0.5) * 0.12), (0.02 + rnd() * 0.04) * sx, moss[k % 4], 0.5)
    }
    // (fallen leaves, dry and curled: a few blown up against the plinth and the curb, the rest about the earth)
    const leaf = ['150,88,40', '178,120,48', '118,70,36', '190,148,70', '140,60,34']
    for (let i = 0; i < (total > 0 ? 38 : 0); i++) {
      const { r, off } = pick(), alongX = r.out[0] === 0
      const s = (alongX ? r.a[0] : r.a[1]) + rnd() * ((alongX ? r.b[0] - r.a[0] : r.b[1] - r.a[1]))
      const out = off + (i % 3 ? 0.01 + rnd() * 0.05 : 0.05 + rnd() * (EARTH_BAND - 0.02)), edge = alongX ? r.a[1] : r.a[0]
      const ex = alongX ? s : edge + r.out[0] * out, ez = alongX ? edge + r.out[1] * out : s
      if (!clearOfWay(ex, ez)) continue
      const x = px(ex), y = pz(ez)
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
    // (and damper, darker, close in under the building: in the shade of its eaves the earth keeps the wet longest; fading out from the
    // plinth's foot over a few hand's breadths (item 752's 「泥土地要有漸層」). Its rectangles filled as one, then blurred and laid over at half
    // (item 780: each drawn blurred at half on its own, it was darker where two met))
    const damp = document.createElement('canvas')
    damp.width = cw; damp.height = ch
    const kg = damp.getContext('2d')!
    kg.fillStyle = 'rgb(58,40,24)'
    for (const [a0, b0, a1, b1] of building) kg.fillRect(px(a0 - 0.05), pz(b0 - 0.05), (a1 - a0 + 0.1) * sx, (b1 - b0 + 0.1) * sz)
    g.save()
    g.filter = `blur(${Math.round(0.14 * sx)}px)`
    // (item 1002, the owner's 「泥土地顏色應該一致」: a hint of it, not a darker band of its own round the building (it was at half))
    g.globalAlpha = 0.18
    g.drawImage(damp, 0, 0)
    g.restore()
    // (how far in from its whole outline each pixel is, in units, outside less than 0: the most, over its shapes, of a shape's least way to
    // its sides (measured as a square is, so its corners stay square). Its rim's dust and its fade from it, not from each shape on its own
    // (item 780, the owner's 「而且不要有這種接口」: each shape's outline was stroked darker, and where one ran on inside another, the bed's
    // band's side across the narrow band before the shop's front, it was a dark seam out from the shop's corner))
    // (item 1002: each shape a box with its corners rounded EARTH_ROUND (a rounded box's distance), the two put together smoothly, so the
    // corner where the band before the door meets the square rounds too; inside, how far in, as before)
    const boxSd = (wx: number, wz: number, r: Rect) => {
      const cx = (r[0] + r[2]) / 2, cz = (r[1] + r[3]) / 2, rr = Math.min(EARTH_ROUND, (r[2] - r[0]) / 2, (r[3] - r[1]) / 2)
      const qx = Math.abs(wx - cx) - (r[2] - r[0]) / 2 + rr, qz = Math.abs(wz - cz) - (r[3] - r[1]) / 2 + rr
      return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - rr
    }
    const deep = new Float32Array(cw * ch)
    for (let y = 0; y < ch; y++) {
      const z = Z0 + (y + 0.5) / sz
      for (let x = 0; x < cw; x++) {
        const wx = X0 + (x + 0.5) / sx
        let d = 1e9
        for (const r of shapes) {
          const b = boxSd(wx, z, r)
          // (a smooth union: the least of the two, eased together within EARTH_ROUND of where they meet)
          const h = Math.min(1, Math.max(0, 0.5 + 0.5 * (b - d) / EARTH_ROUND))
          d = d > 1e8 ? b : b + (d - b) * h - EARTH_ROUND * h * (1 - h)
        }
        deep[y * cw + x] = -d
      }
    }
    // (its colour and its fade put together by hand, not cut out on the canvas: a canvas keeps nothing of a colour where it's wholly clear
    // (black there), and the picture's smaller copies averaged that black into its edge, a dark ring round it as it faded. Each pixel the
    // earth's own colour, clear or not; drier and paler toward its edge, as earth nobody waters is (it fades out to dust, not to a dark
    // smudge): a pale coat within 0.05 of its outline, gone 0.15 in; its edge faded out over EARTH_SOFT each side of the outline (item 779).
    // Rows turned over as the plane lays them (the canvas's top at Z0))
    const col = g.getImageData(0, 0, cw, ch).data
    const data = new Uint8Array(cw * ch * 4)
    const ease = THREE.MathUtils.smoothstep
    for (let y = 0; y < ch; y++) {
      const from = y * cw * 4, to = (ch - 1 - y) * cw * 4
      for (let x = 0; x < cw; x++) {
        // (item 1002: the dust toward its edge a touch, not a pale rim of its own (it was 0.62))
        const i = x * 4, d = deep[y * cw + x], du = 0.15 * (1 - ease(d, 0.05, 0.15))
        data[to + i] = col[from + i] + (200 - col[from + i]) * du
        data[to + i + 1] = col[from + i + 1] + (182 - col[from + i + 1]) * du
        data[to + i + 2] = col[from + i + 2] + (152 - col[from + i + 2]) * du
        data[to + i + 3] = 255 * ease(d, -EARTH_SOFT, EARTH_SOFT) * (EARTH_EDGE + (1 - EARTH_EDGE) * ease(d, 0, EARTH_THIN))
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
    // ---- where the puddles stand after rain (item 752): in the earth along the plinth's foot, a hand to a forearm out from it, clear of the
    // way out, the bed and what's kept clear; and one by the drain's basin, where its run-off gathers
    const puddles: Puddle[] = []
    for (let tries = 0; puddles.length < PUDDLES && tries < 200; tries++) {
      const { r, off } = pick()
      if (off !== 0.004) continue
      const alongX = r.out[0] === 0, s0 = alongX ? r.a[0] : r.a[1], s1 = alongX ? r.b[0] : r.b[1]
      if (s1 - s0 < 0.6) continue
      const s = s0 + 0.25 + rnd() * (s1 - s0 - 0.5), size = 0.07 + rnd() * 0.08, out = off + size + 0.05 + rnd() * (EARTH_REACH - 2 * size - 0.12)
      const edge = alongX ? r.a[1] : r.a[0], x = alongX ? s : edge + r.out[0] * out, z = alongX ? edge + r.out[1] * out : s
      if (!clearOfWay(x, z) || puddles.some((q) => Math.hypot(q.x - x, q.z - z) < q.r + size + 0.25)) continue
      puddles.push({ x, z, r: size, turn: rnd() * Math.PI, long: 1.2 + rnd() * 0.5 })
    }
    for (const [x0, , x1, z1] of (keep ?? []).slice(0, 1)) puddles.push({ x: (x0 + x1) / 2, z: z1 + 0.11, r: 0.075, turn: 0.3, long: 1.5 })
    return { gravel, stones, tufts, tex, earthMat, earth, ex: (X0 + X1) / 2, ez: (Z0 + Z1) / 2, puddles }
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
  // (the puddles: one mesh of copies of one shape, each its place, turn and size; drawn as full as the ground's wet (game/puddles), shrinking
  // from their edges as they dry; rain's rings on them while it rains)
  const puddleMesh = useMemo(() => {
    if (!made || !made.puddles.length) return null
    const n = PUDDLE_GEO.attributes.position.count, k = made.puddles.length
    const g = new THREE.BufferGeometry()
    const nor = new Float32Array(k * n * 3), uv = new Float32Array(k * n * 2)
    for (let i = 0; i < k * n; i++) nor[i * 3 + 1] = 1
    for (let i = 0; i < k; i++) uv.set(PUDDLE_GEO.attributes.uv.array as Float32Array, i * n * 2)
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(k * n * 3), 3))
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3))
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
    // (its bounds as full as they get, so it's culled right however full; then laid dry, as nothing, till the clock says)
    layPuddles(g, made.puddles, 1)
    g.computeBoundingSphere()
    layPuddles(g, made.puddles, 0)
    const me = new THREE.Mesh(g, PUDDLE_MAT)
    me.name = 'shop-puddles'
    me.raycast = () => null
    me.renderOrder = 1
    me.receiveShadow = true
    me.visible = false
    return me
  }, [made])
  useEffect(() => () => puddleMesh?.geometry.dispose(), [puddleMesh])
  const wet = useRef({ key: '', fill: -1, damp: -1, shown: -1, want: { puddles: 0, damp: 0 } })
  const rings = useRef<(THREE.Mesh | null)[]>([])
  const ringLife = useRef(RIPPLE_MATS.map(() => ({ t: 1, at: 0, x: 0, z: 0, r: 0 })))
  useFrame((_, dt) => {
    if (!made) return
    const w = wet.current, c = getClock()
    // (the ground's wet worked out once a minute of the clock; eased toward it)
    const key = `${c.day}:${Math.floor(c.minute)}`
    if (key !== w.key) { w.key = key; w.want = groundWet(c.day, Math.floor(c.minute)) }
    const k = Math.min(1, dt * 2.5)
    const fill = w.fill < 0 ? w.want.puddles : w.fill + (w.want.puddles - w.fill) * k
    const damp = w.damp < 0 ? w.want.damp : w.damp + (w.want.damp - w.damp) * k
    GROUND_WET.k = damp
    if (Math.abs(damp - w.damp) > 1e-3) {
      // (wet earth darker, the gravel and the curb a little darker with it)
      made.earthMat.color.setRGB(1 - 0.4 * damp, 1 - 0.42 * damp, 1 - 0.44 * damp)
      GRAVEL_MAT.color.setScalar(1 - 0.22 * damp)
      STONE_MAT.color.setScalar(1 - 0.18 * damp)
    }
    w.damp = damp
    PUDDLE_MAT.color.setScalar(PUDDLE_SHINE[skyNow()] ?? 1)
    const pm = puddleMesh
    // (their size as drawn: laid again only as it changes by a little, and gone below a trace)
    const s = fill > 0.02 ? 0.3 + 0.7 * Math.sqrt(fill) : 0
    if (pm && (Math.abs(s - w.shown) > 0.002 || (s === 0) !== (w.shown === 0))) {
      w.shown = s
      layPuddles(pm.geometry, made.puddles, s)
      pm.visible = s > 0
    }
    w.fill = fill
    // (rain on them: a ring here and there spreading out and fading, each in a puddle as full as it is)
    const raining = RAIN_NOW.k > 0.05 && fill > 0.15
    ringLife.current.forEach((L, i) => {
      const mesh = rings.current[i]
      if (!mesh) return
      L.t += dt / 0.7
      if (L.t >= 1) {
        if (!raining || Math.random() > RAIN_NOW.k * 0.5) { mesh.visible = false; return }
        const q = made.puddles[Math.floor(Math.random() * made.puddles.length)], s = 0.3 + 0.7 * Math.sqrt(fill)
        const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * 0.6 * q.r * s
        L.t = 0; L.x = q.x + Math.cos(a) * d * q.long; L.z = q.z + Math.sin(a) * d; L.r = 0.012 + Math.random() * 0.012
      }
      mesh.visible = true
      mesh.position.set(L.x, EARTH_Y + 0.0026, L.z)
      const w2 = L.r + 0.05 * L.t
      mesh.scale.set(w2, 1, w2)
      RIPPLE_MATS[i].opacity = (1 - L.t) * 0.5 * RAIN_NOW.k
    })
  })
  if (!made) return null
  return (
    <group name="shop-ground-all">
      <mesh name="shop-ground" geometry={made.earth} material={made.earthMat} position={[made.ex, EARTH_Y, made.ez]} rotation-x={-Math.PI / 2}
        renderOrder={-2} receiveShadow raycast={() => null} />
      <mesh name="shop-gravel" geometry={made.gravel} material={GRAVEL_MAT} receiveShadow raycast={() => null} />
      <mesh name="shop-curb" geometry={made.stones} material={STONE_MAT} receiveShadow raycast={() => null} />
      {tuftMesh && <primitive object={tuftMesh} />}
      {puddleMesh && <primitive object={puddleMesh} />}
      {RIPPLE_MATS.map((m, i) => (
        <mesh key={i} ref={(o) => { rings.current[i] = o }} geometry={RIPPLE_GEO} material={m} visible={false} renderOrder={2} raycast={() => null} />
      ))}
    </group>
  )
})
