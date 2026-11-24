import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { NO_RAY } from '@/scene/interact/pickable'
import { StaticBatch } from '@/scene/render/StaticBatch'
import { signTexture } from '@/scene/props/signFont'
import { getLights } from '@/scene/render/lightsStore'
import { AnchoredLight } from '@/scene/render/AnchoredLight'
import { QUALITY } from '@/scene/render/quality'
import { lampLit } from '@/shops/grill/decor/lampShades'
import { nightGlow } from './ambient'
import { INK, WALL_H } from './base'
import { GLOW } from './shrine'

/**
 * A paper pendant lamp over the bar, lit. Its light is painted, not cast: a halo round the shade and a warm pool on
 * the bar top under it (added on, so it brightens what it falls on). Six real lights would cost every lit surface in
 * the room on every frame; these cost two quads each.
 */
/** the paper lantern's body: a round ball, a circle in section, drawn in to the wooden rings at its two ends, turned on a lathe */
const LANTERN_R = 0.125
const LANTERN_END = Math.sqrt(LANTERN_R ** 2 - 0.05 ** 2)
/** a ball's band turned (a paper lantern's body): from `end` below its middle to `end` above, its points evenly round the curve (they were
 * evenly up its height, crowded across the flat middle and few where it rounds in to its rings: twice the faces for a coarser outline) */
function ballLathe(R: number, end: number, bands: number, round: number) {
  const top = Math.asin(Math.min(1, end / R)), pts: THREE.Vector2[] = []
  for (let i = 0; i <= bands; i++) {
    const a = -top + (2 * top * i) / bands
    pts.push(new THREE.Vector2(R * Math.cos(a), R * Math.sin(a)))
  }
  return new THREE.LatheGeometry(pts, round)
}
// (eight bands and sixteen round, smooth shaded: 256 faces (12 x 24, 576, before; the owner's count had each lamp at 1,418 with its outline))
const LANTERN_GEO = ballLathe(LANTERN_R, LANTERN_END, 8, 16)
/** a little seeded stream of numbers, the same pictures every time */
export function seeded(seed: number) {
  let n = seed
  return () => { n = (n * 16807) % 2147483647; return (n - 1) / 2147483646 }
}
/** a band round a lantern's top or its foot, after the owner's two pattern sheets (their references 5a72cc81, 鱗, and 16be7e14, 立涌; before
 * them seigaiha and shippo from another sheet, thin seigaiha lines and 麻の葉, none of which would do), in one family of colour, indigo
 * (the owner's), multiplied into the paper at half strength (色彩增值、半透明 50%, the owner's: it was colour dodge for a while, the shapes
 * glowing out of a deep blue band), so the washi's fibres, ribs and glow come through every shape: on a pale blue ground, the shapes from deep
 * indigo to a light blue, fine dark lines round them. 鱗 (uroko): rows of scales, each a round-topped dome, every row lying over the one behind
 * it half a scale along; 立涌 (tatewaku): upright stripes of every width waving up the band together. Its width a whole number of repeats, so
 * it runs on round the lantern with no seam */
const BAND_COLOURS = ['#1d3468', '#2c4c8c', '#4568a8', '#6a8cc6', '#9ab2dc']
function patternBand(g: CanvasRenderingContext2D, W: number, y0: number, y1: number, kind: 'uroko' | 'tatewaku', flip = false) {
  const h = Math.ceil(y1 - y0)
  const sheet = document.createElement('canvas')
  sheet.width = W; sheet.height = h
  const s = sheet.getContext('2d')
  if (!s) return
  const rnd = seeded(kind === 'uroko' ? 47 : 53)
  // (the lines and flecks: the deepest indigo, the dye at its strongest)
  const LINE = '#13254d'
  /** a colour of the sheet, not the one just used (two the same side by side read as one) */
  let last = -1
  // (the navy a little more often than the rest, as the sheets have it: `deep`)
  const pick = (deep = false) => {
    const n = BAND_COLOURS.length + (deep ? 1 : 0)
    let k = Math.floor(rnd() * n) % BAND_COLOURS.length
    if (k === last) k = (k + 1) % BAND_COLOURS.length
    last = k
    return BAND_COLOURS[k]
  }
  /** watercolour: the shape just filled mottled lighter and darker, inside its own outline (`path` clipped to) */
  const mottle = (path: Path2D, x: number, y: number, r: number) => {
    s.save(); s.clip(path)
    for (let k = 0; k < 3; k++) {
      const cx = x + (rnd() - 0.5) * r, cy = y + (rnd() - 0.5) * r, rr = r * (0.5 + rnd() * 0.7)
      const gr = s.createRadialGradient(cx, cy, 0, cx, cy, rr)
      gr.addColorStop(0, k % 2 ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,30,0.1)'); gr.addColorStop(1, 'rgba(0,0,0,0)')
      s.fillStyle = gr
      s.fillRect(cx - rr, cy - rr, rr * 2, rr * 2)
    }
    s.restore()
  }
  s.fillStyle = '#dce5f3'
  s.fillRect(0, 0, W, h)
  s.lineWidth = 1.5
  if (kind === 'uroko') {
    // (18 scales round it; the rows from the top down, each over the one before so only each scale's dome shows)
    const n = 18, R = W / n / 2, step = R * 0.8
    for (let row = 0, y = -R * 0.2; y < h + R; row++, y += step) {
      for (let k = -1; k <= n; k++) {
        const x = k * 2 * R + (row % 2 ? R : 0)
        const path = new Path2D()
        path.arc(x, y, R - 0.6, 0, Math.PI * 2)
        s.fillStyle = pick()
        s.fill(path)
        mottle(path, x, y - R * 0.3, R)
        s.strokeStyle = LINE
        s.stroke(path)
      }
    }
  } else {
    // (stripes of every width, 34 round it, their edges waving up the band together, a little out of step with each other)
    const N = 34, widths = Array.from({ length: N }, () => 0.5 + rnd() * 1.3)
    const sum = widths.reduce((a, b) => a + b, 0)
    const A = h * 0.085, lam = h * 0.58
    const edge = (x: number, y: number, ph: number) => x + A * Math.sin((2 * Math.PI * y) / lam + ph)
    let x = 0
    const phases = widths.map(() => (rnd() - 0.5) * 0.5)
    const colours: string[] = []
    for (let k = 0; k < N; k++) {
      const w = (widths[k] / sum) * W
      for (const shift of [0, W, -W]) {
        const x0 = x + shift, x1 = x + w + shift, p0 = phases[k], p1 = phases[(k + 1) % N]
        if (x1 + A < 0 || x0 - A > W) continue
        const path = new Path2D()
        path.moveTo(edge(x0, -2, p0), -2)
        for (let y = -2; y <= h + 2; y += 3) path.lineTo(edge(x0, y, p0), y)
        for (let y = h + 2; y >= -2; y -= 3) path.lineTo(edge(x1, y, p1), y)
        path.closePath()
        s.fillStyle = shift === 0 ? (colours[k] = pick(true)) : colours[k]
        s.fill(path)
        mottle(path, (x0 + x1) / 2, h / 2, Math.max(w, h * 0.5))
        s.strokeStyle = LINE
        s.stroke(path)
      }
      x += w
    }
  }
  // (a few flecks of the dye)
  s.fillStyle = LINE
  for (let k = 0; k < 70; k++) { s.beginPath(); s.arc(rnd() * W, rnd() * h, 0.6 + rnd() * 1.2, 0, Math.PI * 2); s.fill() }
  g.save()
  // (multiplied into the paper at half strength, as dye is, see-through: the upper band turned upside down, so the two face each other
  // across the lantern's middle)
  g.globalCompositeOperation = 'multiply'
  g.globalAlpha = 0.5
  if (flip) { g.translate(0, y0 + h); g.scale(1, -1); g.drawImage(sheet, 0, 0) } else g.drawImage(sheet, 0, y0)
  // (a fine line of indigo along either edge)
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.globalAlpha = 1
  g.fillStyle = 'rgba(37,56,95,0.6)'
  g.fillRect(0, y0 - 5, W, 2.5)
  g.fillRect(0, y0 + h + 3, W, 2.5)
  g.restore()
}
/**
 * A lantern's paper (u round it, v up it: 1024 x 300, about as many pixels to the inch round its belly as up it, so what's painted on it
 * keeps its shape there). `lit`: glowing from within, warm, brightest in the middle of its belly; unlit, plain washi, a little cream (only
 * a little). Its bamboo ribs and the seams between its panels, the paper's fibres here and there, and a band round its lower belly (`band`:
 * 鱗 or 立涌, after the owner's pattern sheets; it had two sea bream painted on it, then thin seigaiha lines, then 麻の葉, then seigaiha and
 * shippo from another sheet).
 */
function lanternPaper(g: CanvasRenderingContext2D, lit: boolean, band: 'uroko' | 'tatewaku' = 'uroko') {
  const W = 1024, H = 300
  const grad = g.createLinearGradient(0, 0, 0, H)
  for (const [t, c] of (lit ? [[0, '#f2b878'], [0.22, '#ffe2b0'], [0.5, '#fff6e0'], [0.78, '#ffe2b0'], [1, '#f2b878']]
    : [[0, '#e0d9cb'], [0.28, '#f1ebdf'], [0.52, '#f7f2e8'], [0.76, '#efe9dc'], [1, '#dcd5c6']]) as [number, string][]) grad.addColorStop(t, c)
  g.fillStyle = grad
  g.fillRect(0, 0, W, H)
  const rnd = seeded(lit ? 11 : 29)
  // (the washi's own clouding and its long kozo fibres, a little lighter and darker than the sheet)
  for (let k = 0; k < 26; k++) {
    const x = rnd() * W, y = rnd() * H, r = 20 + rnd() * 60
    const cl = g.createRadialGradient(x, y, 0, x, y, r)
    cl.addColorStop(0, lit ? 'rgba(255,250,235,0.16)' : 'rgba(255,255,255,0.22)'); cl.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = cl
    g.fillRect(x - r, y - r, r * 2, r * 2)
  }
  g.lineCap = 'round'
  for (let k = 0; k < 360; k++) {
    const x = rnd() * W, y = rnd() * H, a = rnd() * Math.PI, l = 8 + rnd() * 26, bend = (rnd() - 0.5) * 10
    g.strokeStyle = k % 3 ? (lit ? 'rgba(255,248,230,0.28)' : 'rgba(255,255,255,0.45)') : (lit ? 'rgba(170,110,60,0.12)' : 'rgba(150,140,120,0.16)')
    g.lineWidth = 0.6 + rnd() * 0.7
    g.beginPath(); g.moveTo(x, y)
    g.quadraticCurveTo(x + Math.cos(a) * l / 2 - Math.sin(a) * bend, y + Math.sin(a) * l / 2 + Math.cos(a) * bend, x + Math.cos(a) * l, y + Math.sin(a) * l)
    g.stroke()
  }
  // (the bamboo ribs it's wound on: a fine line every few pixels, a shade darker, a pale one beside it)
  for (let y = 3; y < H; y += 6.6) {
    g.fillStyle = lit ? 'rgba(190,130,70,0.22)' : 'rgba(120,112,98,0.2)'
    g.fillRect(0, y, W, 1.5)
    g.fillStyle = lit ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.35)'
    g.fillRect(0, y + 1.8, W, 1)
  }
  // (the seams between its panels)
  g.fillStyle = lit ? 'rgba(200,140,80,0.16)' : 'rgba(120,110,95,0.14)'
  for (let x = 0; x < W; x += 128) g.fillRect(x, 0, 1.6, H)
  // (its bands, one round its shoulder and one round its foot, mirrored (the owner's: top and bottom, the one the other way up), each out
  // toward its end so the white of the paper between them is wide (the owner's: wider))
  patternBand(g, W, H * 0.07, H * 0.27, band, true)
  patternBand(g, W, H * 0.73, H * 0.93, band)
}
const LANTERN_SKIN = signTexture(1024, 300, (g) => lanternPaper(g, true))
const PENDANT_GLOW = nightGlow(new THREE.SpriteMaterial({ map: GLOW, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, color: '#ffcf90' }), 0.35, 0.75)
const PENDANT_BLOOM = nightGlow(new THREE.SpriteMaterial({ map: GLOW, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, color: '#ffb870' }), 0, 0.28)
// (pulled toward the camera in depth so it never fights the bar's top under it, seen from far off)
const PENDANT_POOL = nightGlow(new THREE.MeshBasicMaterial({ map: GLOW, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), 0.18, 0.42)
/** and the same paper with no light in it: plain washi, a little cream, its fibres and its band */
const LANTERN_SKIN_OFF = signTexture(1024, 300, (g) => lanternPaper(g, false))
const LANTERN_SHADE = lampLit(new THREE.MeshBasicMaterial({ color: '#ffffff', map: LANTERN_SKIN, toneMapped: false, side: THREE.DoubleSide }), { offMap: LANTERN_SKIN_OFF })
/** every other lantern's: the same washi, its band 立涌 */
const LANTERN_SHADE_TATEWAKU = lampLit(new THREE.MeshBasicMaterial({ color: '#ffffff', map: signTexture(1024, 300, (g) => lanternPaper(g, true, 'tatewaku')),
  toneMapped: false, side: THREE.DoubleSide }), { offMap: signTexture(1024, 300, (g) => lanternPaper(g, false, 'tatewaku')) })
/**
 * Each pendant's own light (item 194, the owner's, 2026-11-16: "the shop's light by night isn't enough, and isn't real"): a warm lamp's
 * light (about 2700 K) from inside the lantern, a pool of it on the bar and on the faces and plates round it, falling away to the room's
 * darker corners; on with the room's lights (the room circuit, as the shades are). In the scene from the first and always there (the count
 * of lights never changes: every material would be compiled again), its strength alone changed; casts no shadow; not at the lowest quality
 */
const PENDANT_LIGHT = 4
function PendantLight({ y }: { y: number }) {
  const lamp = useRef<THREE.PointLight | null>(null)
  useFrame(() => {
    const l = lamp.current
    const want = getLights().on ? PENDANT_LIGHT : 0
    if (l && l.intensity !== want) l.intensity = want
  })
  return <AnchoredLight light={lamp} position={[0, y, 0]} color="#ffb46a" intensity={getLights().on ? PENDANT_LIGHT : 0} distance={3.4} decay={2} />
}
/** (item 492) the pendant lamps' own parts made once for them all (each lamp made its own of every one: six of each the same), and their
 * cord, rings and loop drawn as one (StaticBatch plain): nine draws a lamp were six */
const PENDANT_RING_GEO = new THREE.CylinderGeometry(0.056, 0.056, 0.024, 12)
const PENDANT_LOOP_GEO = new THREE.TorusGeometry(0.012, 0.0025, 4, 8)
const PENDANT_POOL_GEO = new THREE.PlaneGeometry(1.3, 1.3)
const PENDANT_CORDS = new Map<number, THREE.CylinderGeometry>()
const pendantCord = (len: number) => {
  const k = Math.round(len * 1e4)
  let g = PENDANT_CORDS.get(k)
  if (!g) { g = new THREE.CylinderGeometry(0.004, 0.004, len, 4); PENDANT_CORDS.set(k, g) }
  return g
}
const PENDANT_CORD_MAT = new THREE.MeshToonMaterial({ color: INK })
const PENDANT_RING_MAT = new THREE.MeshToonMaterial({ color: '#cdb083' })
const PENDANT_LOOP_MAT = new THREE.MeshToonMaterial({ color: '#8a6a3a' })
const PENDANT_INK_MAT = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide })
/** a pendant lamp, an oval washi lantern, its band 鱗 or 立涌 (`band` 0 or 1; the owner's: every one the plain lantern again, the round
 * one with 日式烤魚 and the fish taken down) */
export function Pendant({ z, drop, pool, band = 0, hang = 0 }: { z: number; drop: number; pool: number; band?: number
  /** how far under the room's top its cord starts (the shelf over the bar's foot, item 450: the lamps hang from it) */
  hang?: number }) {
  return (
    <group position={[0, WALL_H, z]}>
      {/* (a paper lantern: the oval of ribbed washi, a pale wooden ring at each end, a little ring at the top for the cord; the cord, the
          rings and the loop never move: drawn as one) */}
      <StaticBatch plain>
        <mesh position-y={-(hang + drop) / 2} geometry={pendantCord(drop - hang)} material={PENDANT_CORD_MAT} />
        <group position-y={-drop - 0.13}>
          {[LANTERN_END + 0.004, -LANTERN_END - 0.004].map((y) => <mesh key={y} position-y={y} geometry={PENDANT_RING_GEO} material={PENDANT_RING_MAT} />)}
          <mesh position-y={LANTERN_END + 0.028} rotation-x={Math.PI / 2} geometry={PENDANT_LOOP_GEO} material={PENDANT_LOOP_MAT} />
        </group>
      </StaticBatch>
      {/* (a lamp casts no shadow: the moon threw the lit lanterns' onto the floor, well away under them) */}
      <group position-y={-drop - 0.13}>
        <mesh geometry={LANTERN_GEO} material={band ? LANTERN_SHADE_TATEWAKU : LANTERN_SHADE} />
        <mesh geometry={LANTERN_GEO} scale={1.035} raycast={NO_RAY} material={PENDANT_INK_MAT} />
        {/* (light, not the lamp: the pointer goes through them (they took clicks meant for the drinks behind, 3.6 m of bloom there by day too)) */}
        <sprite scale={0.85} material={PENDANT_GLOW} raycast={NO_RAY} />
        {/* (and by night a wide soft bloom round it) */}
        <sprite scale={2.2} material={PENDANT_BLOOM} raycast={NO_RAY} />
        {/* (and its own light, a little under the lantern's middle (item 194)) */}
        {QUALITY.tier !== 'low' && <PendantLight y={-0.12} />}
      </group>
      {/* (the pool of light on the bar top below, down from the lamp's height) */}
      <mesh position-y={pool - WALL_H + 0.004} rotation-x={-Math.PI / 2} renderOrder={1} raycast={NO_RAY} geometry={PENDANT_POOL_GEO}>
        <primitive object={PENDANT_POOL} attach="material" />
      </mesh>
    </group>
  )
}
