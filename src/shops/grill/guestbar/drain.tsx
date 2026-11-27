import { memo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { StaticBatch } from '@/scene/render/StaticBatch'
import { signTexture } from '@/scene/props/signFont'
import { NO_RAY } from '@/scene/interact/pickable'
import { tick } from '@/scene/kit/speed'
import { drainTick, DRAIN_MAX } from '@/game/world/drain'
import { DRAIN_FLOW } from '@/shops/grill/bar'
import { skyNow } from '@/shops/grill/dining/ambient'
import { EARTH_Y } from './ground'

/**
 * The toilets' drain (item 755, the owner's 「並在橘色位置增加排水口」, an orange ring on the stone plinth's face at the back, under the men's
 * toilet, beside the corner where the stock room's base stands out): a slim glazed earthenware pipe (土管) out of the plinth's lower course,
 * turned down by an elbow into a small granite catch basin (石桝) set in the earth under it, a fine cast-iron grate in that; the stone round
 * the pipe damp, a grey ring of mortar where it was set in, the earth round the basin darker. Sized to the plinth's stones (item 759, the
 * owner's 「排水孔要細緻些，且要符合比例。」: the first was a pipe 8.4 cm across standing straight out at the camera and a basin 26 cm wide,
 * pale, half a stone's course and more): a pipe 5 cm across, a basin 17 by 15. In its own frame: x along the plinth's face, y the floor's
 * (the earth at EARTH_Y), z out of the face (the face at 0)
 */
/** the pipe: its axis's height over the earth where it leaves the face, its radius, its bore's; how far it runs out before it turns, the turn's
 * radius (its axis's), and how far over the earth its mouth hangs */
export const DRAIN = { y: 0.085, r: 0.025, bore: 0.019, run: 0.028, bend: 0.03, mouth: 0.03 }
/** the basin: across (along the wall) and out (from `gap` off the face), its rim's width, how high it stands over the earth, its top's
 * chamfer, the grate down from its top, how far it's sunk into the earth */
export const DRAIN_BASIN = { w: 0.17, d: 0.15, gap: 0.006, rim: 0.018, up: 0.012, chamfer: 0.004, grate: 0.007, sunk: 0.03 }
/** what it takes of the earth (in its own frame, [x0, z0, x1, z1]): the basin, and the damp round it (no tufts or moss grow in it) */
export const DRAIN_CLEAR: [number, number, number, number] = [-0.16, 0, 0.16, 0.28]
/** how far along the toilets' back face from the corner the stock room's base makes (from the face of its plinth there) to the pipe's middle:
 * where the owner's ring was, under the men's toilet's cistern; the basin's side 4.5 cm clear of that corner */
export const DRAIN_FROM = 0.13
const ROUND = 16

type P3 = [number, number, number]
/** a quad's two triangles, wound to face `n` (as floors.tsx's shells are) */
function quad(pos: number[], nor: number[], p: P3[], n: P3, uv?: number[], t?: [number, number][]) {
  const [a, b, c] = p
  const cr = [(b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]),
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])]
  const order = cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] >= 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]
  for (const i of order) { pos.push(...p[i]); nor.push(...n); if (uv && t) uv.push(...t[i]) }
}
/** one triangle, wound to face `n` */
function tri(pos: number[], nor: number[], p: P3[], n: P3) {
  const [a, b, c] = p
  const cr = [(b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]),
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])]
  for (const i of cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] >= 0 ? [0, 1, 2] : [0, 2, 1]) { pos.push(...p[i]); nor.push(...n) }
}
function made(pos: number[], nor: number[], uv?: number[]) {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  if (uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  return g
}
/** a ring's way across (its axis `d` in the y-z plane: x across it always, and the other way square to both, turning with the pipe) */
const across = (d: P3): [P3, P3] => [[1, 0, 0], [0, d[2], -d[1]]]
/** the ring of `r` round `c` square to `d`, ROUND about (rule 1: 16 for a round thing): each point and its way out */
function ring(c: P3, d: P3, r: number): { p: P3[]; n: P3[] } {
  const [u, v] = across(d), p: P3[] = [], n: P3[] = []
  for (let j = 0; j < ROUND; j++) {
    const a = (j / ROUND) * Math.PI * 2, cu = Math.cos(a), sv = Math.sin(a)
    const o: P3 = [cu * u[0] + sv * v[0], cu * u[1] + sv * v[1], cu * u[2] + sv * v[2]]
    n.push(o); p.push([c[0] + r * o[0], c[1] + r * o[1], c[2] + r * o[2]])
  }
  return { p, n }
}
/**
 * The pipe: a sweep of rings along its axis, out of the face (from 4 mm in, no seam at the stone), on a little, round the elbow in three
 * steps (a quarter turn, its axis on a circle of DRAIN.bend) and down to its mouth; smooth all over (each corner's normal its own ring's
 * way out); the mouth's face (the pipe's wall's thickness) a flat ring facing down. About 100 faces
 */
const PIPE_BODY = (() => {
  const { y, r, bore, run, bend, mouth } = DRAIN
  const yp = EARTH_Y + y, yc = yp - bend
  const stations: { c: P3; d: P3 }[] = [{ c: [0, yp, -0.004], d: [0, 0, 1] }, { c: [0, yp, run], d: [0, 0, 1] }]
  for (const f of [1, 2, 3]) {
    const a = (f / 3) * (Math.PI / 2)
    stations.push({ c: [0, yc + bend * Math.cos(a), run + bend * Math.sin(a)], d: [0, -Math.sin(a), Math.cos(a)] })
  }
  stations.push({ c: [0, EARTH_Y + mouth, run + bend], d: [0, -1, 0] })
  const pos: number[] = [], nor: number[] = []
  const rings = stations.map((s) => ring(s.c, s.d, r))
  for (let i = 0; i + 1 < rings.length; i++) {
    const A = rings[i], B = rings[i + 1]
    for (let j = 0; j < ROUND; j++) {
      const k = (j + 1) % ROUND, at = pos.length / 3
      const mid: P3 = [(A.n[j][0] + A.n[k][0] + B.n[j][0] + B.n[k][0]) / 4, (A.n[j][1] + A.n[k][1] + B.n[j][1] + B.n[k][1]) / 4, (A.n[j][2] + A.n[k][2] + B.n[j][2] + B.n[k][2]) / 4]
      quad(pos, nor, [A.p[j], A.p[k], B.p[k], B.p[j]], mid)
      // (each corner's normal its own: the quad's corners as they were pushed, found by where they are)
      for (let v = at; v < pos.length / 3; v++) {
        const q: P3 = [pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]]
        const pick = [[A, j], [A, k], [B, k], [B, j]].find(([R, m]) => { const w = (R as typeof A).p[m as number]; return w[0] === q[0] && w[1] === q[1] && w[2] === q[2] })!
        const w = (pick[0] as typeof A).n[pick[1] as number]
        nor[v * 3] = w[0]; nor[v * 3 + 1] = w[1]; nor[v * 3 + 2] = w[2]
      }
    }
  }
  // (its mouth's face: the pipe's wall's thickness, between its outside and its bore, facing down)
  const end = stations[stations.length - 1], O = rings[rings.length - 1], I = ring(end.c, end.d, bore)
  for (let j = 0; j < ROUND; j++) { const k = (j + 1) % ROUND; quad(pos, nor, [O.p[j], O.p[k], I.p[k], I.p[j]], [0, -1, 0]) }
  return made(pos, nor)
})()
/** its bore, dark, seen up into from its mouth: closed a centimetre up inside it by a ladder of quads across (rule 2: no fan to a middle) */
const PIPE_BORE = (() => {
  const { bore, run, bend, mouth } = DRAIN
  const c: P3 = [0, EARTH_Y + mouth + 0.01, run + bend], pos: number[] = [], nor: number[] = []
  const lip = ring([0, EARTH_Y + mouth, run + bend], [0, -1, 0], bore).p, top = ring(c, [0, -1, 0], bore).p
  // (the bore's wall from the mouth up to the cap, facing in)
  for (let j = 0; j < ROUND; j++) {
    const k = (j + 1) % ROUND, mx = (lip[j][0] + lip[k][0]) / 2, mz = (lip[j][2] + lip[k][2]) / 2 - c[2]
    const l = Math.hypot(mx, mz) || 1
    quad(pos, nor, [lip[j], lip[k], top[k], top[j]], [-mx / l, 0, -mz / l])
  }
  // (rungs across between the ring's two sides, k and ROUND - k: a triangle at either end, quads between; facing down, at the mouth)
  tri(pos, nor, [top[0], top[1], top[ROUND - 1]], [0, -1, 0])
  for (let k = 1; k < ROUND / 2 - 1; k++) quad(pos, nor, [top[ROUND - k], top[k], top[k + 1], top[ROUND - k - 1]], [0, -1, 0])
  tri(pos, nor, [top[ROUND / 2 - 1], top[ROUND / 2], top[ROUND / 2 + 1]], [0, -1, 0])
  return made(pos, nor)
})()
/**
 * The basin: one shell (no faces back to back, item 753): its outer sides from under the earth up to a chamfer round its top, the rim's top
 * round the opening, the opening's sides down past the grate. 16 faces
 */
const BASIN = (() => {
  const { w, d, gap, rim, up, chamfer: e, grate, sunk } = DRAIN_BASIN
  const x0 = -w / 2, x1 = w / 2, z0 = gap, z1 = gap + d, i0 = x0 + rim, i1 = x1 - rim, k0 = z0 + rim, k1 = z1 - rim
  const yb = EARTH_Y - sunk, yt = EARTH_Y + up, ye = yt - e, yg = yt - grate - 0.004
  const pos: number[] = [], nor: number[] = []
  const s = Math.SQRT1_2
  // (outer sides, up to the chamfer)
  quad(pos, nor, [[x0, yb, z1], [x1, yb, z1], [x1, ye, z1], [x0, ye, z1]], [0, 0, 1])
  quad(pos, nor, [[x0, yb, z0], [x1, yb, z0], [x1, ye, z0], [x0, ye, z0]], [0, 0, -1])
  quad(pos, nor, [[x0, yb, z0], [x0, yb, z1], [x0, ye, z1], [x0, ye, z0]], [-1, 0, 0])
  quad(pos, nor, [[x1, yb, z0], [x1, yb, z1], [x1, ye, z1], [x1, ye, z0]], [1, 0, 0])
  // (the chamfer: four sloping quads round the top's outer edge, mitred at the corners)
  quad(pos, nor, [[x0, ye, z1], [x1, ye, z1], [x1 - e, yt, z1 - e], [x0 + e, yt, z1 - e]], [0, s, s])
  quad(pos, nor, [[x0, ye, z0], [x1, ye, z0], [x1 - e, yt, z0 + e], [x0 + e, yt, z0 + e]], [0, s, -s])
  quad(pos, nor, [[x0, ye, z0], [x0, ye, z1], [x0 + e, yt, z1 - e], [x0 + e, yt, z0 + e]], [-s, s, 0])
  quad(pos, nor, [[x1, ye, z0], [x1, ye, z1], [x1 - e, yt, z1 - e], [x1 - e, yt, z0 + e]], [s, s, 0])
  // (the rim's top: four quads between the chamfer's top edge and the opening's)
  quad(pos, nor, [[x0 + e, yt, z0 + e], [x1 - e, yt, z0 + e], [i1, yt, k0], [i0, yt, k0]], [0, 1, 0])
  quad(pos, nor, [[x0 + e, yt, z1 - e], [x1 - e, yt, z1 - e], [i1, yt, k1], [i0, yt, k1]], [0, 1, 0])
  quad(pos, nor, [[x0 + e, yt, z0 + e], [i0, yt, k0], [i0, yt, k1], [x0 + e, yt, z1 - e]], [0, 1, 0])
  quad(pos, nor, [[x1 - e, yt, z0 + e], [i1, yt, k0], [i1, yt, k1], [x1 - e, yt, z1 - e]], [0, 1, 0])
  // (the opening's sides, facing in)
  quad(pos, nor, [[i0, yg, k1], [i1, yg, k1], [i1, yt, k1], [i0, yt, k1]], [0, 0, -1])
  quad(pos, nor, [[i0, yg, k0], [i1, yg, k0], [i1, yt, k0], [i0, yt, k0]], [0, 0, 1])
  quad(pos, nor, [[i0, yg, k0], [i0, yg, k1], [i0, yt, k1], [i0, yt, k0]], [1, 0, 0])
  quad(pos, nor, [[i1, yg, k0], [i1, yg, k1], [i1, yt, k1], [i1, yt, k0]], [-1, 0, 0])
  return made(pos, nor)
})()
/** the grate over its opening, its picture (the iron's bars over the dark under it) on it */
const GRATE = (() => {
  const { w, d, gap, rim, up, grate } = DRAIN_BASIN
  const i0 = -w / 2 + rim, i1 = w / 2 - rim, k0 = gap + rim, k1 = gap + d - rim, y = EARTH_Y + up - grate
  const pos: number[] = [], nor: number[] = [], uv: number[] = []
  quad(pos, nor, [[i0, y, k0], [i1, y, k0], [i1, y, k1], [i0, y, k1]], [0, 1, 0], uv, [[0, 1], [1, 1], [1, 0], [0, 0]])
  return made(pos, nor, uv)
})()
/** the damp: on the plinth's face round the pipe and down under it (1.5 mm off it), and on the earth round the basin (2.5 mm over it); one
 * picture, its left half the stone's, its right the earth's */
const STAIN_WALL = { w: 0.13, top: 0.14 }
const STAIN = (() => {
  const pos: number[] = [], nor: number[] = [], uv: number[] = []
  const hw = STAIN_WALL.w / 2, yb = EARTH_Y + 0.001, yt = EARTH_Y + STAIN_WALL.top
  quad(pos, nor, [[-hw, yb, 0.0015], [hw, yb, 0.0015], [hw, yt, 0.0015], [-hw, yt, 0.0015]], [0, 0, 1], uv, [[0, 0], [0.5, 0], [0.5, 1], [0, 1]])
  const [x0, z0, x1, z1] = DRAIN_CLEAR, y = EARTH_Y + 0.0025
  quad(pos, nor, [[x0, y, z0 + 0.002], [x1, y, z0 + 0.002], [x1, y, z1], [x0, y, z1]], [0, 1, 0], uv, [[0.5, 1], [1, 1], [1, 0], [0.5, 0]])
  return made(pos, nor, uv)
})()
/** a picture's own run of chances, the same each time it's drawn (it's drawn again once the lettering's font arrives) */
function chances(from: number) {
  let seed = from
  return () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
}
/** the grate's picture: a narrow cast-iron frame, ten fine bars across with the dark between, a bar down the middle; a little rust, and the
 * wet's dull sheen down in the slots */
const GRATE_TEX = signTexture(128, 128, (g) => {
  const rnd = chances(755)
  g.fillStyle = '#0b0908'; g.fillRect(0, 0, 128, 128)
  g.fillStyle = '#34302b'; g.fillRect(0, 0, 128, 6); g.fillRect(0, 122, 128, 6); g.fillRect(0, 0, 6, 128); g.fillRect(122, 0, 6, 128)
  for (let k = 1; k < 11; k++) {
    const y = 6 + k * 10.5
    g.fillStyle = '#34302b'; g.fillRect(6, y - 2, 116, 4)
    g.fillStyle = '#4e4942'; g.fillRect(6, y - 2, 116, 1)
  }
  g.fillStyle = '#34302b'; g.fillRect(61, 6, 6, 116)
  g.fillStyle = '#4e4942'; g.fillRect(61, 6, 1, 116)
  for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(${96 + rnd() * 30},${60 + rnd() * 18},${34 + rnd() * 12},${0.3 + rnd() * 0.3})`; g.fillRect(rnd() * 124, rnd() * 124, 1 + rnd() * 3, 1 + rnd() * 2) }
  for (let k = 0; k < 11; k++) { g.fillStyle = 'rgba(66,76,88,0.3)'; g.fillRect(10 + rnd() * 30, 10 + k * 10.5, 14 + rnd() * 30, 1.5) }
})
/**
 * The damp's picture. Left, the stone round the pipe (its axis DRAIN.y up the picture's STAIN_WALL.top): a ring of grey mortar round the
 * pipe where it was set in, the stone a little darker round it and in a soft streak down under it. Right, the earth: darker round the basin
 * (its middle 29% out from the face), in a few soft overlapping pools, not dots
 */
const STAIN_TEX = signTexture(256, 128, (g) => {
  const rnd = chances(7550)
  g.clearRect(0, 0, 256, 128)
  const cx = 64, cy = 128 * (1 - DRAIN.y / STAIN_WALL.top), pr = (DRAIN.r / STAIN_WALL.w) * 128
  let gr = g.createRadialGradient(cx, cy, pr, cx, cy, pr * 2.2)
  gr.addColorStop(0, 'rgba(30,26,21,0.38)'); gr.addColorStop(1, 'rgba(30,26,21,0)')
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128)
  const lg = g.createLinearGradient(0, cy, 0, 128)
  lg.addColorStop(0, 'rgba(26,23,19,0.26)'); lg.addColorStop(1, 'rgba(26,23,19,0.08)')
  g.fillStyle = lg
  for (let i = 0; i < 9; i++) { const x = cx + (rnd() - 0.5) * pr * 1.6, w = 4 + rnd() * 7; g.fillRect(x - w / 2, cy, w, 128 - cy) }
  g.strokeStyle = 'rgba(112,108,100,0.8)'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, pr + 1.5, 0, Math.PI * 2); g.stroke()
  g.strokeStyle = 'rgba(56,52,47,0.45)'; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, pr + 3.5, 0, Math.PI * 2); g.stroke()
  const ex = 192, ey = 128 * 0.29
  for (const [dx, dy, r, a] of [[0, 0, 54, 0.4], [-20, 16, 36, 0.2], [22, 24, 32, 0.18], [6, 42, 26, 0.14]]) {
    gr = g.createRadialGradient(ex + dx, ey + dy, 2, ex + dx, ey + dy, r)
    gr.addColorStop(0, `rgba(34,24,15,${a})`); gr.addColorStop(0.55, `rgba(34,24,15,${a * 0.5})`); gr.addColorStop(1, 'rgba(34,24,15,0)')
    g.fillStyle = gr; g.fillRect(132, 0, 120, 128)
  }
})
// (the grate in its own picture, toon as the gravel is (one program with it); the damp see-through over the stone and the earth, as the earth's
// own is drawn (one program with it), drawn in front of them)
const GRATE_MAT = new THREE.MeshToonMaterial({ map: GRATE_TEX })
const STAIN_MAT = new THREE.MeshToonMaterial({ map: STAIN_TEX, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 })
/**
 * Its water (item 764, the owner's 「排水要真實，假若店家有用水沒多久要排出」: what the shop uses comes out here a little later, game/world/drain,
 * bar's DRAIN_FLOW): a column from the mouth down onto the grate, as thick as the flow (a flush's surge, hands washed a thread), wavering;
 * two rings spreading on the grate where it lands, by turns; the stone round the mouth and the grate darker while they're wet, drying over
 * minutes. As the washstands' tap's stream is drawn (one program with it: Restroom's WASH_STREAM), its light the day's (dim after dark,
 * as the stone it falls past)
 */
const WATER_LEN = DRAIN.mouth - (DRAIN_BASIN.up - DRAIN_BASIN.grate)
const WATER_GEO = new THREE.CylinderGeometry(1, 1.25, WATER_LEN, ROUND, 1, true)
const RIPPLE_GEO = new THREE.RingGeometry(0.62, 1, ROUND).rotateX(-Math.PI / 2)
const waterMat = () => new THREE.MeshBasicMaterial({ color: '#cfeaf6', transparent: true, opacity: 0.62, depthWrite: false, toneMapped: false })
const WATER_MAT = waterMat()
const RIPPLE_MATS = [waterMat(), waterMat()]
const WATER_DAY = new THREE.Color('#e4f1f5')
/** the water's light by the sky: the day's, the dusk's and dawn's, the night's (the lantern at the back's door far off) */
const WATER_LIGHT: Record<string, number> = { day: 1, dawn: 0.7, dusk: 0.6, night: 0.3 }
/** the grate's own colour and its wet one */
const GRATE_DRY = new THREE.Color('#ffffff'), GRATE_WET = new THREE.Color('#c9c7c2')
/** the damp's picture as seen dry and just wetted */
const STAIN_DRY = 0.72
/** the drain, at `at` in the floor's frame, its face's out turned `yaw` (its frame's z out of the plinth's face) */
export const ShopDrain = memo(function ShopDrain({ at, yaw }: { at: [number, number]; yaw: number }) {
  const stream = useRef<THREE.Mesh>(null)
  const rings = useRef<(THREE.Mesh | null)[]>([])
  const clock = useRef(0)
  const lit = useRef('')
  useFrame((_, dt0) => {
    const dt = tick(Math.min(dt0, 0.1))
    drainTick(DRAIN_FLOW, dt)
    clock.current += dt
    const f = Math.min(DRAIN_FLOW.flow, DRAIN_MAX), on = f > 0.004, t = clock.current
    // (its light by the sky, set as the sky turns (four of them), not every frame)
    const sky = skyNow()
    if (sky !== lit.current) {
      lit.current = sky
      const k = WATER_LIGHT[sky] ?? 1
      for (const m of [WATER_MAT, ...RIPPLE_MATS]) m.color.copy(WATER_DAY).multiplyScalar(k)
    }
    // (wet: the damp darker, the grate's iron darker)
    STAIN_MAT.opacity = STAIN_DRY + (1 - STAIN_DRY) * DRAIN_FLOW.wet
    GRATE_MAT.color.copy(GRATE_DRY).lerp(GRATE_WET, DRAIN_FLOW.wet)
    // (the column: a thread at a trickle, near the bore's width at a surge, wavering)
    const r = on ? 0.0025 + 0.0125 * Math.sqrt(f / DRAIN_MAX) : 0
    const s = stream.current
    if (s) {
      s.visible = on
      if (on) s.scale.set(r * (1 + Math.sin(t * 31) * 0.1), 1, r * (1 + Math.cos(t * 27) * 0.1))
      // (clear water: more of it the thicker it runs, a thread barely seen)
      WATER_MAT.opacity = 0.28 + 0.22 * Math.min(1, f / 1.2)
    }
    // (the rings where it lands: each spreading from the column's edge out to three times it and fading, half a turn apart)
    rings.current.forEach((m, i) => {
      if (!m) return
      m.visible = on
      if (!on) return
      const p = (t * (1.4 + f) + i / 2) % 1
      const w = r * (1.2 + 2.2 * p)
      m.scale.set(w, 1, w)
      RIPPLE_MATS[i].opacity = (1 - p) * Math.min(0.55, 0.15 + f * 0.5)
    })
  })
  // (where the water falls: under the mouth, from it down to the grate)
  const wx = 0, wz = DRAIN.run + DRAIN.bend, top = EARTH_Y + DRAIN.mouth, grate = EARTH_Y + DRAIN_BASIN.up - DRAIN_BASIN.grate
  return (
    <group position={[at[0], 0, at[1]]} rotation-y={yaw}>
      <StaticBatch plain>
        {/* (the pipe a dark salt-glaze brown, its bore dark; the basin granite, a shade under the plinth's stones (its top takes the light)) */}
        <mesh geometry={PIPE_BODY}><meshToonMaterial color="#4f2d1c" /></mesh>
        <mesh geometry={PIPE_BORE}><meshToonMaterial color="#160f0b" /></mesh>
        <mesh geometry={BASIN}><meshToonMaterial color="#6c6a63" /></mesh>
      </StaticBatch>
      <mesh geometry={GRATE} material={GRATE_MAT} raycast={NO_RAY} />
      <mesh geometry={STAIN} material={STAIN_MAT} renderOrder={1} raycast={NO_RAY} />
      <mesh ref={stream} geometry={WATER_GEO} material={WATER_MAT} position={[wx, (top + grate) / 2, wz]} visible={false} renderOrder={2} raycast={NO_RAY} />
      {RIPPLE_MATS.map((m, i) => (
        <mesh key={i} ref={(o) => { rings.current[i] = o }} geometry={RIPPLE_GEO} material={m} position={[wx, grate + 0.0015, wz]} visible={false} renderOrder={2} raycast={NO_RAY} />
      ))}
    </group>
  )
})
