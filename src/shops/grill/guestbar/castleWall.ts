import * as THREE from 'three'
import type { PlinthPlan } from '@/game/world/groundLayout'
import { bedAt, wallAt, wallPlan, type WallFace, type WallLayout, type WallSample } from '@/game/world/stoneWall'
import { normalFromHeight } from '@/scene/render/normalFromHeight'

/**
 * The plinth's picture as a castle's stone wall (石垣, item 751, the owner's 「地基石階改成像日本古城那樣」; laid by game/world/stoneWall):
 * every face of it its own, none repeated, in one picture (an atlas): each face's strip laid along rows of it, broken into the next row
 * where it runs out (`pieces`: where each bit of each face is), a few pixels round each bit painted on past its edge so its filtering
 * doesn't take in its neighbour's; and a patch for the plinth's top. Its granite light and beige-grey as the castle's, each stone its own
 * shade, flecked, its top edge catching the light and its foot a shade darker; a few streaked by the rain, lichen on some; the joints dark,
 * moss in them low down and in the beds, a few tufts of grass out of them; earth splashed up its foot. Its height (each stone raised and
 * its edges rounded off, the joints sunk, the small stones in the gaps lower) its normal map, at half the size.
 */
/** how many pixels a metre */
const K = 256
/** the pixels painted on past each bit's edges */
const PAD = 6
/** the picture's width: within textureCap's 1024 (a wider one is drawn smaller before it's uploaded), its rows as many as the faces need */
const W = 1024
export interface WallPiece { s0: number; s1: number; x: number; y: number }
export interface WallAtlas {
  W: number; H: number; K: number
  /** each face's bits (its run's index): along the face from s0 to s1, s0 at pixel column x, the wall's top at pixel row y */
  pieces: WallPiece[][]
  /** the plinth's top's patch: [u0, v0, u1, v1] */
  ledge: [number, number, number, number]
}

/** where each face's strip goes: rows of the face's height and the pads either side, a face going on into the next row where it runs out */
function placeStrips(faces: WallFace[], height: number): WallAtlas {
  const rowH = PAD + Math.ceil(height * K) + PAD
  const pieces: WallPiece[][] = faces.map(() => [])
  let x = 0, row = 0
  for (const f of faces) {
    let s = 0
    while (s < f.len - 1e-9) {
      const room = (W - x - 2 * PAD) / K
      if (room < 0.05) { row++; x = 0; continue }
      const take = Math.min(f.len - s, room)
      pieces[f.run].push({ s0: s, s1: s + take, x: x + PAD, y: row * rowH + PAD })
      x += Math.ceil(take * K) + 2 * PAD
      s += take
    }
  }
  if (W - x < 40) { row++; x = 0 }
  const H = Math.ceil(((row + 1) * rowH) / 4) * 4
  return { W, H, K, pieces, ledge: [(x + 8) / W, (row * rowH + PAD + 4) / H, (x + 32) / W, (row * rowH + PAD + 12) / H] }
}

function hash(ix: number, iy: number, seed: number) {
  let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
/** smooth value noise, 0 to 1 */
function noise(x: number, y: number, seed: number) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy)
  const a = hash(ix, iy, seed), b = hash(ix + 1, iy, seed), c = hash(ix, iy + 1, seed), d = hash(ix + 1, iy + 1, seed)
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy
}
const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}
/** the granite's greys (sRGB): beige-grey, as the castle's in the sun but a shade nearer the door's steps' grey, a few cooler, a few
 * weathered darker */
/**
 * (items 1009, 1010, the owner's 「請用 backing map 來做」「階梯的與地基的石階不太同，能否依階梯的品質為主，須同步一下。」: the plinth's stones
 * pale and blotchy, painted, beside the steps' dark fine granite) the steps' own granite: their baked picture (blender/stonesteps.py's, the
 * granite's cell of their atlas page, public/textures/plinth_granite.webp) laid over the plinth in its material as a detail map, as fine as on
 * the steps (GRANITE_TILE a repeat; the plinth's own picture is 256 px a metre); its mean colour, sRGB as painted here and linear as the
 * shader divides by it, so the stones keep the tones painted under it
 */
const GRANITE_URL = import.meta.env.BASE_URL + 'textures/plinth_granite.webp'
const GRANITE_SRGB: [number, number, number] = [124.8, 120.9, 114.7]
const GRANITE_MEAN = new THREE.Vector3(0.2147, 0.201, 0.1804)
const GRANITE_TILE = 0.75
let graniteTex: THREE.Texture | null = null
const graniteDetail = () => {
  if (!graniteTex) {
    graniteTex = new THREE.TextureLoader().load(GRANITE_URL)
    graniteTex.wrapS = graniteTex.wrapT = THREE.RepeatWrapping
    graniteTex.colorSpace = THREE.SRGBColorSpace
    graniteTex.anisotropy = 4
  }
  return graniteTex
}
/** (item 1010) each stone's tone over the granite: the steps' wall's (stonesteps.py's WALL_TINTS, item 527: greys a shade and two deeper, a
 * hair warmer and cooler) */
const TONES: [number, number, number][] = [[1.0, 1.0, 1.0], [0.99, 0.975, 0.95], [0.94, 0.955, 0.98], [0.90, 0.895, 0.89], [0.83, 0.83, 0.835],
  [0.96, 0.96, 0.955]].map(([r, g, b]) => [GRANITE_SRGB[0] * r, GRANITE_SRGB[1] * g, GRANITE_SRGB[2] * b])
/** a corner stone, dressed: a little paler */
const CORNER_TONE: [number, number, number] = [GRANITE_SRGB[0] * 1.05, GRANITE_SRGB[1] * 1.05, GRANITE_SRGB[2] * 1.04]

interface Px { r: number; g: number; b: number; h: number }
/** a point of a face: its colour and height (`y` down from the wall's top, `visible` the earth there) */
function paintAt(w: WallLayout, face: number, s: number, y: number, beds: number[], at: WallSample, visible: number, o: Px) {
  wallAt(w, s, y, beds, at)
  const stone = w.courses[at.course].stones[at.stone]
  const e = Math.min(at.dl, at.dr, at.dt, at.db)
  // (the joint a little wider and narrower along it: hand-fitted)
  const half = 0.003 + 0.0034 * noise(s * 18, y * 18, 11 + face)
  let gap = e < half
  if (!gap) {
    const [tl, tr, br, bl] = stone.cut
    gap = (tl > 0 && at.dl + at.dt < tl + 2 * half) || (tr > 0 && at.dr + at.dt < tr + 2 * half) ||
      (br > 0 && at.dr + at.db < br + 2 * half) || (bl > 0 && at.dl + at.db < bl + 2 * half)
  }
  let wedge = -1
  if (gap) {
    const ws0 = w.wedges
    let lo = 0, hi = ws0.length
    while (lo < hi) { const m = (lo + hi) >> 1; if (ws0[m][0] < s - 0.03) lo = m + 1; else hi = m }
    for (let q = lo; q < ws0.length; q++) {
      const [ws, wy, wr] = ws0[q]
      if (ws > s + 0.03) break
      const d = Math.hypot(s - ws, y - wy), a = Math.atan2(y - wy, s - ws)
      const r = wr * (1 + 0.18 * Math.sin(a * 3 + ws * 97) + 0.1 * Math.sin(a * 5 + wy * 61))
      if (d < r - 0.0015) { wedge = r - d; break }
    }
  }
  const grain = hash(Math.floor(s * K), Math.floor(y * K), 3 + face)
  let r: number, g: number, b: number, h: number
  if (!gap) {
    const [r0, g0, b0] = stone.corner ? CORNER_TONE : TONES[Math.floor(stone.tone * TONES.length) % TONES.length]
    const sr = hash(stone.seed, 1, 5), shade = (stone.corner ? 0.97 : 0.86) + sr * (stone.corner ? 0.05 : 0.18), warm = (hash(stone.seed, 2, 5) - 0.5) * 10
    // (its face bulging: rolling a little, its top edge in the light, its foot in its own shadow, its sides a shade darker; the wall's
    // patina over it all, darker in weathered patches)
    const roll = noise(s * 11 + stone.seed % 97, y * 11, 21) - 0.5
    let f = shade * (1 + 0.08 * roll)
    f *= 1 + 0.12 * (1 - smooth(0, 0.022, at.dt - half)) - 0.24 * (1 - smooth(0, 0.042, at.db - half)) - 0.1 * (1 - smooth(0, 0.028, Math.min(at.dl, at.dr) - half))
    const pat = noise(s * 3.2, y * 3.2, 51 + face)
    f *= 0.93 + 0.12 * pat - 0.16 * smooth(0.66, 0.86, noise(s * 5.5 + 7, y * 5.5, 53 + face))
    if (y < 0.004) f *= 1.08
    // (the granite's grains: in its detail map now (items 1009, 1010), as fine as the steps'; here only the stone's own light)
    // (a corner stone dressed: the chisel's fine strokes across it)
    if (stone.corner) f *= 1 + 0.025 * Math.sin((s + y) * Math.PI * 2 / 0.011)
    r = r0 * f + warm; g = g0 * f; b = b0 * f - warm
    // (the rain's streaks down from its top on a few)
    if (at.dl < 1 && at.dr < 1 && hash(stone.seed, 3, 5) < 0.4) {
      const span = at.dl + at.dr, p = 0.2 + 0.6 * hash(stone.seed, 4, 5), wdt = 0.006 + 0.012 * hash(stone.seed, 6, 5)
      const down = at.dt === Infinity ? y / 0.09 : at.dt / Math.max(0.02, at.dt + at.db)
      const k = (1 - smooth(wdt * 0.5, wdt, Math.abs(at.dl - p * span))) * (1 - 0.7 * down) * (0.6 + 0.4 * noise(s * 60, y * 9, 29))
      r *= 1 - 0.2 * k; g *= 1 - 0.19 * k; b *= 1 - 0.17 * k
    }
    // (lichen in pale patches; moss creeping in from the joints low down)
    const li = smooth(0.7, 0.82, noise(s * 9 + 3.1, y * 9, 31 + face))
    if (li > 0) { const q = li * 0.32; r += (196 - r) * q; g += (198 - g) * q; b += (180 - b) * q }
    const moss = smooth(0.1, 0.26, y) * (1 - smooth(0, 0.022, e - half)) * smooth(0.45, 0.75, noise(s * 22, y * 22, 37 + face))
    if (moss > 0) { const q = moss * 0.65; r += (84 - r) * q; g += (106 - g) * q; b += (56 - b) * q }
    h = 0.4 + (stone.corner ? 0.44 * smooth(0, 0.009, e - half) : 0.3 * smooth(0, 0.016, e - half) + 0.14 * smooth(0.016, 0.06, e - half)) + (stone.corner ? 0.02 : 0.06) * roll
  } else if (wedge >= 0) {
    // (a small stone in the gap, darker, rounded)
    const t = 0.78 + 0.16 * hash(Math.floor(s * 300), Math.floor(y * 300), 41)
    const f = t * (0.86 + 0.14 * smooth(0, 0.004, wedge)) * (grain < 0.06 ? 0.7 : 1)
    // (item 1010: the granite, a shade darker)
    r = GRANITE_SRGB[0] * 0.95 * f; g = GRANITE_SRGB[1] * 0.95 * f; b = GRANITE_SRGB[2] * 0.95 * f
    h = 0.26 + 0.24 * smooth(0, 0.005, wedge)
  } else {
    // (a joint: dark, darkest deep in it; moss in it low down and along the beds, the rest earth and dust)
    const depth = Math.min(1, e / half)
    const f = 0.55 + 0.3 * depth
    r = 60 * f; g = 54 * f; b = 47 * f
    const bedJoint = Math.min(at.dt, at.db) < Math.min(at.dl, at.dr)
    const mo = smooth(0.42, 0.62, noise(s * 15, y * 15, 43 + face)) * (bedJoint ? 1 : 0.55) * (0.35 + 0.65 * smooth(0.06, 0.2, y))
    if (mo > 0) { const q = mo * 0.85; r += (64 - r) * q; g += (92 - g) * q; b += (40 - b) * q }
    h = 0.08 + 0.08 * mo
  }
  // (earth splashed up its foot; under the earth, earth)
  const sp = smooth(visible - 0.065, visible, y)
  if (sp > 0) {
    const q = sp * sp * (0.5 + 0.2 * noise(s * 30, y * 30, 47))
    r += (118 - r) * q; g += (92 - g) * q; b += (64 - b) * q
  }
  if (y > visible) { r += (96 - r) * 0.75; g += (74 - g) * 0.75; b += (52 - b) * 0.75 }
  o.r = r; o.g = g; o.b = b; o.h = h
  return o
}

/** a few tufts of grass out of the joints, low down: blades from the joint up and out */
function grassTufts(g: CanvasRenderingContext2D, faces: WallFace[], layouts: WallLayout[], atlas: WallAtlas, visible: number) {
  for (const f of faces) {
    const w = layouts[f.run]
    const n = Math.floor(f.len / 1.1)
    for (let t = 0; t < n; t++) {
      // (at a joint's foot on a bed, in the lower courses)
      const k = 1 + Math.floor(hash(f.run, t, 61) * (w.courses.length - 1))
      const js = w.courses[k - 1]?.joints ?? []
      if (!js.length) continue
      const j = js[Math.floor(hash(f.run, t, 63) * js.length)]
      const s = j.bot, y = j.yBot
      if (y > visible - 0.01) continue
      const p = atlas.pieces[f.run].find((q) => s >= q.s0 && s <= q.s1)
      if (!p) continue
      const x0 = p.x + (s - p.s0) * K, y0 = p.y + y * K
      const blades = 4 + Math.floor(hash(f.run, t, 65) * 4)
      for (let i = 0; i < blades; i++) {
        const a = -Math.PI / 2 + (hash(i, t, 67 + f.run) - 0.5) * 1.5, len = (0.012 + 0.022 * hash(i, t, 69 + f.run)) * K
        const bend = (hash(i, t, 71 + f.run) - 0.5) * 0.6
        g.strokeStyle = `rgb(${60 + Math.floor(hash(i, t, 73) * 40)},${100 + Math.floor(hash(i, t, 75) * 45)},${44 + Math.floor(hash(i, t, 77) * 20)})`
        g.lineWidth = 1.1
        g.beginPath()
        g.moveTo(x0, y0)
        g.quadraticCurveTo(x0 + Math.cos(a) * len * 0.5, y0 + Math.sin(a) * len * 0.5, x0 + Math.cos(a + bend) * len, y0 + Math.sin(a + bend) * len)
        g.stroke()
      }
    }
  }
}

/**
 * The plinth's stone wall for its plan: its faces and layouts (game/world/stoneWall's wallPlan), its atlas, and its material (toon, its
 * picture and its normal map; one draw). `height` its face from its top to its foot, `visible` to the earth. Null where there's no page
 */
export function plinthWall(plan: PlinthPlan, height: number, visible: number) {
  if (typeof document === 'undefined') return null
  // (the last one kept: the same plan again (the page's first render done twice in development, the shop mounted again) not painted again)
  const key = JSON.stringify([plan, height, visible])
  if (lastWall?.key !== key) lastWall = { key, wall: paintWall(plan, height, visible) }
  return lastWall.wall
}
let lastWall: { key: string; wall: ReturnType<typeof paintWall> } | null = null
function paintWall(plan: PlinthPlan, height: number, visible: number) {
  const { faces, layouts } = wallPlan(plan, height, visible)
  const atlas = placeStrips(faces, height)
  const c = document.createElement('canvas')
  c.width = atlas.W; c.height = atlas.H
  const g = c.getContext('2d')!
  const img = g.createImageData(atlas.W, atlas.H)
  const d = img.data
  const hw = atlas.W >> 1, hh = atlas.H >> 1
  const hsum = new Float32Array(hw * hh), hcount = new Uint8Array(hw * hh)
  const at: WallSample = { course: 0, stone: 0, dl: 0, dr: 0, dt: 0, db: 0 }, px: Px = { r: 0, g: 0, b: 0, h: 0 }
  const rows = Math.ceil(height * K)
  for (const f of faces) {
    const w = layouts[f.run]
    const beds = new Array<number>(w.beds.length)
    for (const p of atlas.pieces[f.run]) {
      const cols = Math.ceil((p.s1 - p.s0) * K)
      for (let cx = -PAD; cx < cols + PAD; cx++) {
        const X = p.x + cx
        if (X < 0 || X >= atlas.W) continue
        const s = Math.min(f.len, Math.max(0, p.s0 + (cx + 0.5) / K))
        for (let b = 0; b < beds.length; b++) beds[b] = bedAt(w.beds[b], s)
        for (let cy = -PAD; cy < rows + PAD; cy++) {
          const Y = p.y + cy
          if (Y < 0 || Y >= atlas.H) continue
          const y = Math.min(height, Math.max(0, (cy + 0.5) / K))
          paintAt(w, f.run, s, y, beds, at, visible, px)
          const i = (Y * atlas.W + X) * 4
          d[i] = px.r; d[i + 1] = px.g; d[i + 2] = px.b; d[i + 3] = 255
          const hi = (Y >> 1) * hw + (X >> 1)
          hsum[hi] += px.h; hcount[hi]++
        }
      }
    }
  }
  // (the top's patch: the stones' tops, plain, a little lighter)
  const [lu0, lv0, lu1, lv1] = atlas.ledge
  for (let Y = Math.floor(lv0 * atlas.H) - 4; Y < Math.ceil(lv1 * atlas.H) + 4; Y++) {
    for (let X = Math.floor(lu0 * atlas.W) - 4; X < Math.ceil(lu1 * atlas.W) + 4; X++) {
      // (item 1010: the granite's, a little lighter, facing the sky; its grains in the detail map)
      const i = (Y * atlas.W + X) * 4, f = 1.05 + 0.03 * (hash(X >> 3, Y >> 3, 93) - 0.5)
      d[i] = GRANITE_SRGB[0] * f; d[i + 1] = GRANITE_SRGB[1] * f; d[i + 2] = GRANITE_SRGB[2] * f; d[i + 3] = 255
      const hi = (Y >> 1) * hw + (X >> 1)
      hsum[hi] += 0.8; hcount[hi]++
    }
  }
  g.putImageData(img, 0, 0)
  grassTufts(g, faces, layouts, atlas, visible)
  // (its height at half the size, each pixel the mean of the four it covers; none painted there: low)
  const hc = document.createElement('canvas')
  hc.width = hw; hc.height = hh
  const hg = hc.getContext('2d')!
  const himg = hg.createImageData(hw, hh)
  for (let i = 0; i < hw * hh; i++) {
    const v = hcount[i] ? Math.round((hsum[i] / hcount[i]) * 255) : 20
    himg.data[i * 4] = himg.data[i * 4 + 1] = himg.data[i * 4 + 2] = v
    himg.data[i * 4 + 3] = 255
  }
  hg.putImageData(himg, 0, 0)
  const map = new THREE.CanvasTexture(c)
  map.colorSpace = THREE.SRGBColorSpace
  const normalMap = new THREE.CanvasTexture(normalFromHeight(hc, 2.2))
  for (const t of [map, normalMap]) { t.flipY = false; t.anisotropy = 4 }
  const material = new THREE.MeshToonMaterial({ color: '#ffffff', map, normalMap })
  material.name = 'ShopPlinth'
  // (items 1009, 1010: the steps' granite over it as a detail map, by where each point is: along a face and up it, or across its top; over
  // the granite's mean, so the stones keep their tones; compiled as it's first drawn, with the rest at load)
  const detail = graniteDetail()
  material.onBeforeCompile = (sh) => {
    sh.uniforms.uGranite = { value: detail }
    sh.uniforms.uGraniteMean = { value: GRANITE_MEAN }
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vGrUv;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvGrUv = (abs(normal.y) > 0.5 ? position.xz : vec2(position.x + position.z, position.y)) / ${GRANITE_TILE.toFixed(3)};`)
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D uGranite;\nuniform vec3 uGraniteMean;\nvarying vec2 vGrUv;')
      .replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb *= texture2D(uGranite, vGrUv).rgb / uGraniteMean;')
  }
  material.customProgramCacheKey = () => 'plinth-granite'
  return { faces, atlas, material, dispose: () => { map.dispose(); normalMap.dispose(); material.dispose() } }
}
