import { blindSound, slideDoorSound } from '@/shops/grill/sounds/restroomSound'
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { plainColours, mergeByMaterial } from '@/scene/render/StaticBatch'
import { glowLeave, glowOnly } from '@/scene/interact/hoverGlow'
import { inkModel } from '@/scene/render/inkHull'
import { businessDay, rainAt, weatherOf } from '@/game/world/weather'
import { RAIN_GLSL, rainUniforms } from '@/scene/effects/rainGlsl'
import { getClock } from '@/ui/kit/clockStore'
import { useGLTF } from '@react-three/drei'
import { tipOver } from '@/shops/grill/bar'
import { getEdit } from '@/shops/grill/edit'
import { setTip } from '@/scene/interact/hoverTip'
import type { Sky } from '@/game/world/clock'
import { skyNow, onSky } from './ambient'
import { seeded } from './pendant'

/**
 * The round window's paper, as the light outside falls on it: by day the sky's cool blue through it; by night dark blue, a street lantern's
 * warm glow off to one side and the moon's paler one high up, the bamboo's shadows on it; at dusk the evening sun's orange, brightest where
 * it's low behind the paper, the bamboo's shadows thrown long and warm-dark; at dawn a pale rose under lavender, the bamboo's shadows faint.
 * Drawn again (the one canvas) whenever the part of the day turns (data-sky on the page).
 */
function drawRoundPaper(g: CanvasRenderingContext2D, sky: Sky, shadows = true) {
  const night = sky === 'night'
  g.clearRect(0, 0, 512, 512)
  if (sky === 'dusk' || sky === 'dawn') {
    const gr = g.createLinearGradient(0, 0, 0, 512)
    if (sky === 'dusk') { gr.addColorStop(0, '#ffebcf'); gr.addColorStop(0.45, '#ffd29e'); gr.addColorStop(1, '#f3a874') }
    else { gr.addColorStop(0, '#eceeff'); gr.addColorStop(0.5, '#f4dde8'); gr.addColorStop(1, '#ebc4c8') }
    g.fillStyle = gr; g.fillRect(0, 0, 512, 512)
    // (the sun's own brightness through the paper: the evening's low on one side, the morning's a faint glow over it all)
    const [x, y, r, c] = sky === 'dusk' ? [330, 300, 260, 'rgba(255,244,214,0.75)'] : [256, 160, 330, 'rgba(255,250,246,0.5)']
    const l = g.createRadialGradient(x as number, y as number, 0, x as number, y as number, r as number)
    l.addColorStop(0, c as string); l.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = l; g.fillRect(0, 0, 512, 512)
  } else if (night) {
    const gr = g.createRadialGradient(256, 256, 30, 256, 256, 300)
    gr.addColorStop(0, '#3a4766'); gr.addColorStop(0.7, '#262f4a'); gr.addColorStop(1, '#151a2c')
    g.fillStyle = gr; g.fillRect(0, 0, 512, 512)
    // (a lantern's warm glow low on the right, the moon's high on the left)
    for (const [x, y, r, c] of [[380, 360, 210, 'rgba(255,170,80,0.55)'], [150, 120, 120, 'rgba(220,230,255,0.35)']] as [number, number, number, string][]) {
      const l = g.createRadialGradient(x, y, 0, x, y, r)
      l.addColorStop(0, c); l.addColorStop(1, 'rgba(0,0,0,0)')
      g.fillStyle = l; g.fillRect(0, 0, 512, 512)
    }
  } else {
    // (the sky's cool light through the paper, a linear gradient (the owner's): pale at the top, a deeper blue toward the foot)
    const gr = g.createLinearGradient(0, 0, 0, 512)
    gr.addColorStop(0, '#eef7ff'); gr.addColorStop(0.45, '#cfe5fb'); gr.addColorStop(1, '#94bde9')
    g.fillStyle = gr; g.fillRect(0, 0, 512, 512)
  }
  // (the fibres of the washi)
  g.strokeStyle = night ? 'rgba(200,210,240,0.08)' : 'rgba(110,140,190,0.13)'; g.lineWidth = 1
  for (let k = 0; k < 160; k++) { const x = (k * 97) % 512, y = (k * 233) % 512; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 14, y + (k % 5) - 2); g.stroke() }
  // (and its longer fibres and the odd thicker one, as handmade paper has; by night the moon throws the shadows of the bamboo outside on it,
  // by day none)
  g.strokeStyle = night ? 'rgba(220,228,250,0.06)' : 'rgba(255,255,255,0.5)'
  for (let k = 0; k < 60; k++) {
    const x = (k * 151) % 512, y = (k * 89) % 512, a = (k * 0.71) % Math.PI
    g.lineWidth = k % 9 ? 0.8 : 1.6
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * 18 + 6, y + Math.sin(a) * 18 - 4, x + Math.cos(a) * 34, y + Math.sin(a) * 34); g.stroke()
  }
  if (!shadows) return
  if (night) bambooGrove(g, 'shadow')
  else if (sky === 'dusk') bambooGrove(g, 'shadow', '90,58,26')
  else if (sky === 'dawn') { g.globalAlpha = 0.45; bambooGrove(g, 'shadow', '70,58,104'); g.globalAlpha = 1 }
}
/**
 * The bamboo just outside the round window, in the paper's frame (512 x 512 over the window's round): two culms further off, thin, two
 * nearer and fuller, each tapering, its nodes ridged, and from some nodes a slender branch with a spray of narrow pointed leaves drooping
 * from its end; and a few sprays hanging in from above. Drawn the one way, by one seed, as the moon's shadows on the paper by night
 * (`shadow`), and as the bamboo itself seen with the shoji open (`day`: green culms lit down one side, their nodes pale rings, the leaves in
 * three greens; `night`: moonlit silhouettes, a cool light down one edge), so each culm, branch and leaf outside is where its shadow falls
 * (the owner's: the view open matching the shadows shut)
 */
/**
 * A layer to draw something blurred on sharp, laid on the picture after with one blur (the owner's freeze at every turn of the day: a canvas
 * filter set before many fills blurs each fill on its own, and these canvases are drawn on the CPU (scene/canvasKeep): the round window's
 * leaves, culms, far windows and clouds, a thousand blurs, took the page 4 to 5 s at each change of sky, the whole game stopped). A layer for
 * each size of canvas, cleared and given the picture's transform as it's taken.
 */
const BLUR_LAYERS = new Map<string, CanvasRenderingContext2D>()
function blurLayer(g: CanvasRenderingContext2D) {
  const { width: w, height: h } = g.canvas
  let l = BLUR_LAYERS.get(`${w}x${h}`)
  if (!l) {
    const c = document.createElement('canvas')
    c.width = w; c.height = h
    l = c.getContext('2d')!
    BLUR_LAYERS.set(`${w}x${h}`, l)
  }
  l.setTransform(1, 0, 0, 1, 0, 0)
  l.globalAlpha = 1; l.filter = 'none'; l.globalCompositeOperation = 'source-over'
  l.clearRect(0, 0, w, h)
  l.setTransform(g.getTransform())
  return l
}
/** the layer laid on the picture, blurred `px` (in the picture's own pixels, as the filters were), in whatever clip the picture has */
function layBlurred(g: CanvasRenderingContext2D, l: CanvasRenderingContext2D, px: number) {
  g.save()
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.filter = px > 0 ? `blur(${px}px)` : 'none'
  g.drawImage(l.canvas, 0, 0)
  g.restore()
}
/** `part`: only the two further culms ('back'), only the two near ones and the sprays ('front'), or all of it; drawn the same whichever */
function bambooGrove(g: CanvasRenderingContext2D, look: 'shadow' | 'day' | 'night', shade = '6,10,24', part: 'all' | 'back' | 'front' = 'all') {
  const rnd = seeded(5)
  const shadow = look === 'shadow'
  const LEAF = look === 'day' ? ['#4f7a2c', '#6c9a3a', '#3f6424'] : ['#18261e', '#203226', '#121c16']
  let tone = 0
  const leaf = (len: number, wid: number) => {
    if (!shadow) g.fillStyle = LEAF[tone++ % 3]
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(wid, len * 0.34, 0, len); g.quadraticCurveTo(-wid * 0.8, len * 0.34, 0, 0); g.fill()
    // (the midrib: a fine paler line down the leaf)
    if (!shadow && len > 26) {
      g.strokeStyle = look === 'day' ? 'rgba(220,235,170,0.35)' : 'rgba(150,170,190,0.18)'
      g.lineWidth = 0.7
      g.beginPath(); g.moveTo(0, 2); g.quadraticCurveTo(wid * 0.15, len * 0.4, 0, len * 0.9); g.stroke()
    }
  }
  const spray = (n: number, side: number, size: number) => {
    for (let k = 0; k < n; k++) {
      g.save()
      g.rotate(side * (0.35 + k * 0.32) + (rnd() - 0.5) * 0.25)
      leaf(size * (0.75 + rnd() * 0.45), size * 0.13)
      g.restore()
    }
  }
  const culm = (x: number, w: number, lean: number, blur: number, alpha: number, far: boolean) => {
    // (the shadows soft as the moon throws them; the bamboo itself crisp, the two further off a touch out of focus: drawn sharp on a layer,
    // blurred once as it's laid on)
    const soft = shadow ? blur : far ? 0.8 : 0
    const pic = g, unseen = (far && part === 'front') || (!far && part === 'back')
    if (soft) g = blurLayer(pic)
    g.save()
    // (the part not drawn still drawn, unseen: the same random runs through, so each part is as it is in the whole)
    if (unseen) g.globalAlpha = 0
    const ink = shadow ? `rgba(${shade},${alpha})` : look === 'day' ? '#4a5e22' : '#141e18'
    g.fillStyle = ink
    g.strokeStyle = ink
    g.translate(x, 540)
    g.rotate(lean)
    // (the culm: its shadow from below the paper up past its top; the bamboo itself on down to the ground, out of sight under the window)
    const foot = shadow ? 0 : 260
    if (!shadow) {
      const body = g.createLinearGradient(-w / 2, 0, w / 2, 0)
      if (look === 'day') { body.addColorStop(0, '#5f7a2a'); body.addColorStop(0.3, '#a6be58'); body.addColorStop(0.55, '#8eaa44'); body.addColorStop(1, '#4e6622') }
      else { body.addColorStop(0, '#2c3c46'); body.addColorStop(0.25, '#1a2620'); body.addColorStop(1, '#0f1712') }
      g.fillStyle = body
    }
    g.beginPath(); g.moveTo(-w / 2, foot); g.lineTo(-w * 0.4, -620); g.lineTo(w * 0.4, -620); g.lineTo(w / 2, foot); g.fill()
    g.fillStyle = ink
    for (let y = 30 + rnd() * 40; y < 600; y += 74 + rnd() * 26) {
      // (a node: the culm's ridge across it, a little proud each side; on the bamboo itself a pale ring over a dark line)
      if (shadow) g.fillRect(-w * 0.62, -y - 1.6, w * 1.24, 3.4)
      else {
        g.fillStyle = look === 'day' ? '#d8dc9a' : '#3a4a52'
        g.fillRect(-w * 0.58, -y - 1.6, w * 1.16, 1.8)
        g.fillStyle = ink
        g.fillRect(-w * 0.55, -y + 0.2, w * 1.1, 1.4)
      }
      if (rnd() < 0.6) {
        const side = rnd() < 0.5 ? -1 : 1, bl = 30 + rnd() * 46
        g.save()
        g.translate(side * w * 0.4, -y)
        g.rotate(side * (0.75 + rnd() * 0.35))
        g.lineWidth = Math.max(1, w * 0.12)
        g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(side * 4, -bl * 0.5, 0, -bl); g.stroke()
        g.translate(0, -bl)
        // (the leaves droop from the branch's end, fanned to the outside)
        g.rotate(Math.PI - side * 0.5)
        spray(3 + Math.floor(rnd() * 4), side, 30 + w * 1.2)
        g.restore()
      }
    }
    g.restore()
    if (soft) { const l = g; g = pic; if (!unseen) layBlurred(g, l, soft) }
  }
  culm(146, 11, 0.05, 2.4, 0.26, true)
  culm(214, 8, -0.035, 2.6, 0.22, true)
  culm(366, 17, 0.03, 0.9, 0.46, false)
  culm(434, 12, -0.06, 1.1, 0.4, false)
  // (sprays hanging in from above, out of the frame)
  const pic = g
  if (shadow) g = blurLayer(pic)
  g.save()
  if (part === 'back') g.globalAlpha = 0
  g.fillStyle = `rgba(${shade},0.34)`
  for (const [x, y, side] of [[290, -8, 1], [120, 4, -1], [470, 20, -1]] as [number, number, number][]) {
    g.save(); g.translate(x, y); g.rotate(Math.PI * 0.08 * side); spray(5, side, 46); g.restore()
  }
  g.restore()
  if (shadow) { const l = g; g = pic; if (part !== 'back') layBlurred(g, l, 1.4) }
}
const ROUND_PAPER = (() => {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const g = c.getContext('2d')!
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  const draw = () => { drawRoundPaper(g, skyNow()); t.needsUpdate = true }
  draw()
  onSky(draw)
  return t
})()
/**
 * A round window (丸窓) let into the plaster: a reveal of wood round it, a frame of keyaki turned to a moulded profile, four bent segments
 * with the grain running round, and inside, a lattice of sugi over washi lit from outside (day or night: ROUND_PAPER; blender/roundwindow.py
 * for the woodwork); hung low, its frame just clear of the rail over the wainscot
 */
const ROUND_URL = import.meta.env.BASE_URL + 'models/roundwindow.glb'
/** the window's woodwork, in the room's toon light, its frame inked round, drawn a few parts at a time (it never moves) */
function RoundWood() {
  const gltf = useGLTF(ROUND_URL) as unknown as { scene: THREE.Group }
  const obj = useMemo(() => {
    const r = gltf.scene.clone(true)
    const made = new Map<THREE.Material, THREE.Material>()
    r.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const src = m.material as THREE.MeshStandardMaterial
      let t = made.get(src)
      if (!t) {
        // (its wood a deep walnut, darkened over its own grain (the owner's: a dark, solid frame; it was a bright orange keyaki))
        t = new THREE.MeshToonMaterial({ color: src.color.clone().multiply(ROUND_WOOD_TINT), map: src.map ?? null })
        t.name = src.name
        made.set(src, t)
      }
      m.material = t
    })
    // (the lattice the shoji's own now: its two halves slide apart, RoundShoji)
    const lattice: THREE.Object3D[] = []
    r.traverse((o) => { if (/^RoundLattice/.test(o.name)) lattice.push(o) })
    for (const o of lattice) o.parent?.remove(o)
    inkModel(r, (m) => !/RoundFrame/.test(m.name), { width: 0.0025, weld: true })
    plainColours(r)
    mergeByMaterial(r)
    return r
  }, [gltf])
  return <primitive object={obj} />
}
useGLTF.preload(ROUND_URL)
/**
 * The round window's bamboo blind (簾, blender/sudare.py; item 301, the owner's, 2026-11-17: 「圓窗加上日式窗簾注意面數」): hung from a bamboo pole
 * just over the frame, in front of it (by 1.6 cm: nothing touches it), its slats' gaps cut out of its picture so the window's view shows
 * through them, the rest rolled up at its foot on two cords. About a hundred triangles; its weave and its cloth in its picture.
 * And it's worked (item 338, the owner's, 2026-11-18: 「圓窗的窗簾亦可互動，注意光源」): a click takes it on to its next way, half rolled up (as
 * it was hung) to let right down over the window, to rolled up under its pole, to half again, as a blind's cords would, its slats ticking as
 * it goes. Let down, its slats stay as they are (its picture runs on down it), its roll grows thinner and goes down with its foot; rolled
 * up, the roll fattens under the pole. And the window's light goes as it covers it (`BLIND`): the shaft, the glow round the window and the
 * glow under its sill, the dust in the moon's beam, dimmed by how much of the window it's over (a quarter of the light comes through a
 * sudare's gaps), and the sun's patch on the floor striped with its slats' shadows over as much of it. No light of its own (rule 6).
 */
const SUDARE_URL = import.meta.env.BASE_URL + 'models/sudare.glb'
type BlindWay = 'half' | 'down' | 'up'
/** each way's foot (its height in the window's frame, the window's paper -0.4..0.4); the way after each; what a click will do */
const BLIND_FOOT: Record<BlindWay, number> = { half: 0.05, down: -0.44, up: 0.4 }
const BLIND_NEXT: Record<BlindWay, BlindWay> = { half: 'down', down: 'up', up: 'half' }
const BLIND_SAYS: Record<BlindWay, string> = { half: '點一下放下', down: '點一下捲起', up: '點一下放到一半' }
/** the model's measures (blender/sudare.py): the hanging part's top (under its head), its picture's repeat, its plane, the cords' knot at the
 * pole; how thick a slat is (the roll grows by it as it takes more), the roll's least radius (let right down) */
const BLIND_TOP = 0.53 - 0.012 - 0.03, BLIND_PERIOD = 0.585, BLIND_X = -0.105, BLIND_KNOT = 0.53 - 0.004
const SLAT_T = 0.004, ROLL_MIN = 0.012
/** the roll's radius for its foot where it is: the bamboo that's not hanging wound on it */
const rollR = (foot: number) => Math.sqrt(ROLL_MIN * ROLL_MIN + (SLAT_T * (foot - BLIND_FOOT.down)) / Math.PI)
/** the blind as it hangs now (its foot), and how much of the window's round (-0.4..0.4) it's over, and of the window's lower half */
const blindCover = (foot: number) => ({ all: THREE.MathUtils.clamp((0.4 - foot) / 0.8, 0, 1), low: THREE.MathUtils.clamp(-foot / 0.4, 0, 1) })
const BLIND = { foot: BLIND_FOOT.half, cover: blindCover(BLIND_FOOT.half).all, coverLow: blindCover(BLIND_FOOT.half).low, drawn: -1 }
/** how far the round window's shoji is slid open (0..1, RoundShoji each frame): the air through it moves the blind (item 365) */
const ROUND_AIR = { k: 0 }
if (import.meta.env.DEV && typeof window !== 'undefined') Object.assign(window, { __roundAir: ROUND_AIR })
/** what of the window's light gets through it over what it covers */
const BLIND_PASS = 0.25
export function Sudare() {
  const gltf = useGLTF(SUDARE_URL) as unknown as { scene: THREE.Group }
  const parts = useMemo(() => {
    const r = gltf.scene.clone(true)
    const made = new Map<THREE.Material, THREE.Material>()
    r.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const src = m.material as THREE.MeshStandardMaterial
      let t = made.get(src)
      if (!t) {
        // (the slats: their picture's gaps cut out (tested, not blended), seen from either side, as the chair back's kumiko is)
        t = /Slats/.test(src.name) ? new THREE.MeshToonMaterial({ color: '#ffffff', map: src.map ?? null, alphaTest: 0.5, side: THREE.DoubleSide })
          : new THREE.MeshToonMaterial({ color: src.map ? '#ffffff' : src.color.clone(), map: src.map ?? null })
        t.name = src.name
        made.set(src, t)
      }
      m.material = t
      m.raycast = () => {}
      m.castShadow = false
    })
    inkModel(r, (m) => !/SudarePole/.test(m.name), { width: 0.002, weld: true })
    // (the hanging part's own copy of its square, its foot's two points and their place down its picture moved as it's let down)
    const blind = r.getObjectByName('SudareBlind') as THREE.Mesh | undefined
    if (blind) blind.geometry = blind.geometry.clone()
    const pos = blind?.geometry.attributes.position as THREE.BufferAttribute | undefined
    const feet: number[] = [], tops: number[] = []
    if (pos) for (let i = 0; i < pos.count; i++) (pos.getY(i) < BLIND_TOP - 0.05 ? feet : tops).push(i)
    // (the roll about its own axis, each cord from its knot at the pole: their pictures moved so they're turned and stretched about those)
    const centre = (m: THREE.Mesh | undefined, at: (b: THREE.Box3) => THREE.Vector3) => {
      if (!m) return null
      m.geometry = m.geometry.clone()
      m.geometry.computeBoundingBox()
      const c = at(m.geometry.boundingBox!)
      m.geometry.translate(-c.x, -c.y, 0)
      m.position.set(c.x, c.y, 0)
      return { m, h: m.geometry.boundingBox!.min.y - c.y }
    }
    const roll = centre(r.getObjectByName('SudareRoll') as THREE.Mesh | undefined, (b) => b.getCenter(new THREE.Vector3()))
    const rollMade = roll ? -roll.h : 0.028
    const cords = [0, 1].map((k) => centre(r.getObjectByName(`SudareCord${k}`) as THREE.Mesh | undefined,
      (b) => new THREE.Vector3(0, b.max.y, 0))).filter((x): x is NonNullable<typeof x> => !!x)
    // (a cord's drop as it was made, from its knot to its foot under the roll)
    const cordDrop = cords.length ? -cords[0].h : 0.54
    // (the pole's axis, where it swings from as the air takes it (item 365))
    const poleM = r.getObjectByName('SudarePole') as THREE.Mesh | undefined
    const pivot = poleM ? new THREE.Box3().setFromObject(poleM).getCenter(new THREE.Vector3()) : new THREE.Vector3(BLIND_X, BLIND_KNOT, 0)
    return { r, blind, pos, feet, tops, roll: roll?.m ?? null, rollMade, cords: cords.map((c) => c.m), cordDrop, pivot }
  }, [gltf])
  // (the window slid open, the air through it takes the blind (item 365, the owner's 「窗簾如果打開，竹簾會擺動」): it swings on its pole, out
  // into the room, back under its own weight, the breeze coming and going in gusts; the more of it hangs, the more it's taken; shut, it
  // settles. Its swing eased toward the air's push each frame, so it never jumps, and it lags a gust a little as a hanging thing does)
  const swing = useRef<THREE.Group>(null)
  const sw = useRef({ a: 0, v: 0 })
  const st = useRef<{ way: BlindWay; from: number; t: number; dur: number }>({ way: 'half', from: BLIND_FOOT.half, t: 1, dur: 1 })
  const pick = useRef<THREE.Mesh>(null)
  /** the blind hung at `foot`: its square's foot and its picture, the roll under it, the cords round the roll, the place to point at */
  const hang = (foot: number) => {
    const { pos, feet, tops, blind, roll, rollMade, cords, cordDrop } = parts
    // (item 831, the owner's 「捲到高的時候，這邊空空。」: the hanging part stopped at the roll's top, and the roll hung out in front of it by
    // its own girth, so from above, rolled right up, one looked down between the two at the window. Now the slats go on down behind the
    // roll to its middle, the roll against their face (wound on them, as a blind's is): seen from above, its top, and behind it the slats,
    // nothing between)
    const rr = rollR(foot)
    if (pos && blind) {
      const uv = blind.geometry.attributes.uv as THREE.BufferAttribute
      for (const i of feet) { pos.setY(i, foot - rr); uv.setY(i, (BLIND_TOP - foot + rr) / BLIND_PERIOD) }
      for (const i of tops) uv.setY(i, 0)
      pos.needsUpdate = true
      uv.needsUpdate = true
      blind.geometry.computeBoundingSphere()
    }
    if (roll) {
      roll.position.set(BLIND_X - 0.0015 - rr, foot - rr, 0)
      roll.scale.set(rr / rollMade, rr / rollMade, 1)
    }
    const drop = BLIND_KNOT - (foot - 2 * rr - 0.004)
    for (const c of cords) c.scale.y = drop / cordDrop
    if (pick.current) {
      const lo = foot - 2 * rr - 0.01, hi = BLIND_KNOT + 0.02
      pick.current.position.set(BLIND_X - 0.03, (lo + hi) / 2, 0)
      pick.current.scale.set(1, hi - lo, 1)
    }
  }
  useLayoutEffect(() => { hang(BLIND.foot) })
  useFrame(({ clock }, dt) => {
    // (its swing: a spring toward where the air holds it, the air a gusting push into the room)
    const g = swing.current
    if (g) {
      const t = clock.elapsedTime, air = ROUND_AIR.k
      const gust = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 0.41) * Math.sin(t * 0.17 + 1.3))
      const push = air * (0.05 + 0.07 * gust) * (0.55 + 0.45 * BLIND.cover) * (1 + 0.35 * Math.sin(t * 2.3) + 0.15 * Math.sin(t * 5.1 + 0.6))
      const h = Math.min(dt, 0.05), w = sw.current
      w.v += ((push - w.a) * 26 - w.v * 3.2) * h
      w.a += w.v * h
      if (air < 0.001 && Math.abs(w.a) < 1e-4 && Math.abs(w.v) < 1e-4) { w.a = 0; w.v = 0 }
      g.rotation.z = -w.a
    }
    const s = st.current
    // (let down or rolled up over a time as far as it goes, eased: a hand on its cord)
    s.t = Math.min(1, s.t + Math.min(dt, 0.1) / s.dur)
    const e = s.t * s.t * (3 - 2 * s.t)
    const foot = s.from + (BLIND_FOOT[s.way] - s.from) * e
    if (Math.abs(foot - BLIND.foot) > 1e-5 || BLIND.drawn < 0) {
      BLIND.foot = foot
      hang(foot)
      const c = blindCover(foot)
      BLIND.cover = c.all
      BLIND.coverLow = c.low
      // (the window's light as much of it's let through: at once on its glows, and the floor's patch painted again now and then as it moves)
      applySkyGlows()
      if (Math.abs(c.all - BLIND.drawn) > 0.01 || s.t >= 1) { BLIND.drawn = c.all; paintFall(c.all) }
    }
  })
  const says = () => BLIND_SAYS[st.current.way]
  const go = () => {
    const s = st.current
    s.from = BLIND.foot
    s.way = BLIND_NEXT[s.way]
    s.t = 0
    s.dur = 0.35 + 1.1 * Math.abs(BLIND_FOOT[s.way] - s.from)
    blindSound(BLIND_FOOT[s.way] < s.from, 0.5, s.dur)
  }
  // (dev: the blind let down or rolled up as a click would, for the probes (item 623's rain through the window))
  useEffect(() => { if (import.meta.env?.DEV) Object.assign(window, { __blindGo: go }) })
  return (
    <group>
      <group position={parts.pivot}><group ref={swing}><group position={parts.pivot.clone().negate()}><primitive object={parts.r} /></group></group></group>
      {/* (where it's pointed at and clicked: an unseen square over all of it as it hangs, a little in front of it (the shoji's click is
          behind it, where the window's not under the blind)) */}
      <mesh ref={pick} name="sudare-pick" rotation-y={-Math.PI / 2} visible={false}
        onClick={(ev) => { ev.stopPropagation(); if (getEdit().on) return; go(); setTip({ title: '竹簾', hint: says() }) }}
        onPointerOver={(ev) => { if (getEdit().on) return; ev.stopPropagation(); glowOnly(parts.r); tipOver('竹簾', says()).onPointerOver(ev) }}
        onPointerOut={(ev) => { glowLeave(parts.r); tipOver('竹簾', '').onPointerOut(ev) }}>
        <planeGeometry args={[1.04, 1]} />
      </mesh>
    </group>
  )
}
useGLTF.preload(SUDARE_URL)
/** the round window's frame's tint over its keyaki: a deep walnut */
const ROUND_WOOD_TINT = new THREE.Color('#7a5136')
/** the round window's radius (its paper's) */
const ROUND_R = 0.4
/**
 * What's outside the round window, seen with its shoji slid open (the owner's: the shop's in a city, and the view wants depth; it was bamboo
 * against the sky, flat): a city backstreet in four layers, each drawn at its own depth behind the window and looked through it in
 * perspective (ROUND_VIEW's shader), so as the camera moves the near things slide across the far ones. Near (0.2 behind it): a few bamboo,
 * the ones whose shadows fall on the paper by night (bambooGrove; there was a low fence of split bamboo and a wire: the owner took them away).
 * Across the alley (1.2): old two- and three-storey fronts, their windows, a vertical sign or two, the
 * air conditioners' outdoor units, a utility pole with its transformer and the wires strung from it. Far off (5): the city's towers, hazy blue
 * with the distance by day, by night their windows lit and red lights on their tops, and a lattice radio tower among them. And the sky (20): by
 * day blue, paler toward the horizon, a few clouds; by night deep blue, the city's glow along its foot, a few stars and the moon. Each layer's
 * picture spans a half-size `H` either way of the window's middle (in its own units), so it fills the view at an angle too.
 */
const VIEW_LAYERS = { near: { d: 0.2, H: 0.52 }, back: { d: 0.42, H: 0.52 }, mid: { d: 1.2, H: 1.12 }, far: { d: 5, H: 3.4 }, sky: { d: 20, H: 12.4 } }
type ViewLayer = keyof typeof VIEW_LAYERS
/** a layer's picture's own places: x, y (the window's units, its middle 0, up +) to the canvas's pixels */
const viewPx = (k: ViewLayer, size: number) => {
  const H = VIEW_LAYERS[k].H
  return { X: (x: number) => (x / H * 0.5 + 0.5) * size, Y: (y: number) => (0.5 - y / H * 0.5) * size, S: (l: number) => (l / H * 0.5) * size }
}
/** the street's day-lit pictures toned to the light of dawn or dusk: everything drawn on the layer (and only that) washed over with it */
function toneTo(g: CanvasRenderingContext2D, size: number, sky: Sky, dusk: string, dawn: string) {
  if (sky !== 'dusk' && sky !== 'dawn') return
  g.save()
  g.filter = 'none'
  g.globalCompositeOperation = 'source-atop'
  g.fillStyle = sky === 'dusk' ? dusk : dawn
  g.fillRect(0, 0, size, size)
  g.restore()
}
function drawViewSky(g: CanvasRenderingContext2D, size: number, sky: Sky) {
  const night = sky === 'night'
  const { X, Y, S } = viewPx('sky', size)
  const grd = g.createLinearGradient(0, 0, 0, size)
  if (sky === 'dusk' || sky === 'dawn') {
    // (dusk: deep violet overhead to the orange glow along the horizon, the sun low in it; dawn: blue going pale, a rose and peach band low
    // down, the last stars fading)
    const stops: [number, string][] = sky === 'dusk'
      ? [[0, '#3a4076'], [0.3, '#76668f'], [0.43, '#e5a070'], [0.5, '#ffd28a'], [0.54, '#f5bb7e'], [1, '#6a5258']]
      : [[0, '#5f80c8'], [0.36, '#a9b7e6'], [0.46, '#f1c6cc'], [0.5, '#ffdcbc'], [0.54, '#f3d2c6'], [1, '#cdbfd0']]
    for (const [k, c] of stops) grd.addColorStop(k, c)
    g.fillStyle = grd
    g.fillRect(0, 0, size, size)
    const rnd = seeded(91)
    if (sky === 'dusk') {
      const sx = X(1.9), sy = Y(1.7), sr = S(0.62)
      const glow = g.createRadialGradient(sx, sy, 0, sx, sy, sr * 7)
      glow.addColorStop(0, 'rgba(255,240,200,0.9)'); glow.addColorStop(0.25, 'rgba(255,196,112,0.45)'); glow.addColorStop(1, 'rgba(255,170,100,0)')
      g.fillStyle = glow
      g.fillRect(sx - sr * 7, sy - sr * 7, sr * 14, sr * 14)
      g.fillStyle = '#fff1d0'
      g.beginPath(); g.arc(sx, sy, sr, 0, Math.PI * 2); g.fill()
    } else {
      for (let k = 0; k < 24; k++) {
        g.fillStyle = `rgba(255,255,250,${0.15 + rnd() * 0.35})`
        g.fillRect(rnd() * size, rnd() * size * 0.22, 1, 1)
      }
    }
    // (long thin clouds lit from below: gold and rose at dusk, pink at dawn)
    // (drawn sharp on a layer, blurred once as it's laid on: blurLayer)
    const pic = g
    g = blurLayer(pic)
    for (const [cx, cy, w] of [[-3.5, 3.0, 3.2], [2.8, 4.4, 3.6], [0.2, 2.4, 2.2], [5.2, 2.9, 2.6], [-6, 4.8, 3.0]]) {
      g.fillStyle = sky === 'dusk' ? 'rgba(255,200,145,0.7)' : 'rgba(255,212,222,0.75)'
      for (let k = 0; k < 6; k++) {
        const r = S(w * (0.1 + rnd() * 0.08))
        g.beginPath(); g.ellipse(X(cx + (rnd() - 0.5) * w), Y(cy + rnd() * w * 0.12), r * 2.6, r, 0, 0, Math.PI * 2); g.fill()
      }
      g.fillStyle = sky === 'dusk' ? 'rgba(138,104,122,0.42)' : 'rgba(190,170,210,0.4)'
      g.fillRect(X(cx - w * 0.5), Y(cy + 0.02), S(w), S(0.1))
    }
    { const l = g; g = pic; layBlurred(g, l, 5) }
    return
  }
  if (night) { grd.addColorStop(0, '#070d22'); grd.addColorStop(0.42, '#14214a'); grd.addColorStop(0.5, '#3a3550'); grd.addColorStop(0.53, '#6a4a48'); grd.addColorStop(1, '#1a1a26') }
  else { grd.addColorStop(0, '#3f86d8'); grd.addColorStop(0.4, '#8dbcef'); grd.addColorStop(0.5, '#d4e8fb'); grd.addColorStop(1, '#c8dcef') }
  g.fillStyle = grd
  g.fillRect(0, 0, size, size)
  const rnd = seeded(91)
  if (night) {
    // (a few stars, the city's glow drowning those low down; the moon, high, its halo)
    for (let k = 0; k < 90; k++) {
      const x = rnd() * size, y = rnd() * size * 0.45
      g.fillStyle = `rgba(255,255,240,${0.25 + rnd() * 0.6})`
      g.fillRect(x, y, 1 + (rnd() < 0.15 ? 1 : 0), 1 + (rnd() < 0.15 ? 1 : 0))
    }
    const mx = X(-2.2), my = Y(4.2), mr = S(0.55)
    const halo = g.createRadialGradient(mx, my, 0, mx, my, mr * 6)
    halo.addColorStop(0, 'rgba(255,250,225,0.5)'); halo.addColorStop(0.3, 'rgba(190,200,255,0.15)'); halo.addColorStop(1, 'rgba(190,200,255,0)')
    g.fillStyle = halo
    g.fillRect(mx - mr * 6, my - mr * 6, mr * 12, mr * 12)
    g.fillStyle = '#fff6da'
    g.beginPath(); g.arc(mx, my, mr, 0, Math.PI * 2); g.fill()
    g.fillStyle = 'rgba(200,190,160,0.35)'
    for (const [dx, dy, r] of [[-0.25, -0.1, 0.22], [0.2, 0.25, 0.15], [0.05, -0.35, 0.12]]) { g.beginPath(); g.arc(mx + dx * mr, my + dy * mr, r * mr, 0, Math.PI * 2); g.fill() }
  } else {
    // (a few clouds: soft heaps of white, flat below, drifting high)
    const pic = g
    g = blurLayer(pic)
    for (const [cx, cy, w] of [[-3.5, 3.2, 2.4], [2.6, 4.6, 3.0], [0.4, 2.2, 1.6], [5.5, 2.6, 2.0], [-6, 5.2, 2.6]]) {
      g.fillStyle = 'rgba(255,255,255,0.85)'
      for (let k = 0; k < 7; k++) {
        const r = S(w * (0.18 + rnd() * 0.16))
        g.beginPath(); g.arc(X(cx + (rnd() - 0.5) * w), Y(cy + rnd() * w * 0.22), r, 0, Math.PI * 2); g.fill()
      }
      g.fillStyle = 'rgba(205,220,240,0.6)'
      g.fillRect(X(cx - w * 0.55), Y(cy - 0.05), S(w * 1.1), S(0.18))
    }
    { const l = g; g = pic; layBlurred(g, l, 6) }
  }
}
function drawViewFar(g: CanvasRenderingContext2D, size: number, sky: Sky) {
  const night = sky === 'night'
  const { X, Y, S } = viewPx('far', size)
  g.clearRect(0, 0, size, size)
  const rnd = seeded(37)
  // (far off, the haze of the distance: their colour gone toward the sky's)
  const body = night ? '#121a30' : '#8aa3c2', edge = night ? '#0c1222' : '#7d97b8'
  // (a touch out of focus: drawn sharp on a layer, blurred once as it's laid on (blurLayer))
  const pic = g
  g = blurLayer(pic)
  // (the radio tower: a lattice tapering up, two decks, its top a mast; red and white by day, lit warm by night)
  const tx = -0.9
  const tower = (x: number, y: number) => [X(tx + x), Y(y)] as const
  g.strokeStyle = night ? '#ffb45a' : '#d9663f'
  g.lineWidth = Math.max(1, S(0.012))
  for (const sd of [-1, 1]) {
    g.beginPath()
    g.moveTo(...tower(sd * 0.45, -0.6)); g.quadraticCurveTo(...tower(sd * 0.12, 0.6), ...tower(sd * 0.04, 1.9))
    g.stroke()
  }
  for (let k = 0; k < 14; k++) {
    const y0 = -0.6 + k * 0.18, w0 = 0.45 * Math.pow(1 - (y0 + 0.6) / 2.6, 1.6) + 0.04
    const y1 = y0 + 0.18, w1 = 0.45 * Math.pow(1 - (y1 + 0.6) / 2.6, 1.6) + 0.04
    g.beginPath(); g.moveTo(...tower(-w0, y0)); g.lineTo(...tower(w1, y1)); g.moveTo(...tower(w0, y0)); g.lineTo(...tower(-w1, y1)); g.stroke()
  }
  g.fillStyle = night ? '#ffc070' : '#f2f0ea'
  g.fillRect(X(tx - 0.16), Y(0.85), S(0.32), S(0.08))
  g.fillRect(X(tx - 0.08), Y(1.5), S(0.16), S(0.06))
  g.fillRect(X(tx - 0.012), Y(2.6), S(0.024), S(0.7))
  // (the towers: a row of blocks of every height and width along the horizon, some stepped, each with its windows)
  let x = -3.4
  while (x < 3.4) {
    const w = 0.22 + rnd() * 0.45, h = 0.2 + rnd() * rnd() * 1.6 + (Math.abs(x - 0.6) < 0.8 ? 0.4 : 0)
    const y0 = -0.75
    g.fillStyle = rnd() < 0.5 ? body : edge
    g.fillRect(X(x), Y(y0 + h), S(w), S(h))
    if (rnd() < 0.3) g.fillRect(X(x + w * 0.2), Y(y0 + h + 0.12), S(w * 0.6), S(0.12))
    // (windows: by night lit, warm and cool, many dark; by day faint lines)
    const rows = Math.floor(h / 0.045), cols = Math.max(2, Math.floor(w / 0.05))
    for (let r = 1; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (night) {
        if (rnd() < 0.42) {
          g.fillStyle = rnd() < 0.7 ? 'rgba(255,214,140,0.85)' : 'rgba(190,220,255,0.75)'
          g.fillRect(X(x + (c + 0.3) * (w / cols)), Y(y0 + r * 0.045), Math.max(1, S(w / cols * 0.45)), Math.max(1, S(0.018)))
        }
      } else if (r % 2 === 0) {
        g.fillStyle = 'rgba(220,232,245,0.35)'
        g.fillRect(X(x + (c + 0.2) * (w / cols)), Y(y0 + r * 0.045), Math.max(1, S(w / cols * 0.6)), Math.max(1, S(0.012)))
      }
    }
    if (night && h > 0.9) { g.fillStyle = '#ff3a2a'; g.beginPath(); g.arc(X(x + w / 2), Y(y0 + h + 0.02), Math.max(1.5, S(0.016)), 0, Math.PI * 2); g.fill() }
    x += w + (rnd() < 0.25 ? 0.05 + rnd() * 0.15 : 0)
  }
  { const l = g; g = pic; layBlurred(g, l, 0.8) }
  // (the haze at their feet, the street's lights by night)
  const haze = g.createLinearGradient(0, Y(-0.2), 0, Y(-0.8))
  haze.addColorStop(0, night ? 'rgba(90,60,70,0)' : 'rgba(210,225,240,0)')
  haze.addColorStop(1, night ? 'rgba(120,80,70,0.7)' : 'rgba(210,225,240,0.75)')
  g.fillStyle = haze
  g.fillRect(0, Y(-0.2), size, Y(-0.8) - Y(-0.2))
  // (at dusk the towers dark violet against the glow behind them, at dawn a lavender haze)
  toneTo(g, size, sky, 'rgba(66,44,92,0.58)', 'rgba(150,140,196,0.38)')
}
function drawViewMid(g: CanvasRenderingContext2D, size: number, sky: Sky) {
  const night = sky === 'night'
  const { X, Y, S } = viewPx('mid', size)
  const H = VIEW_LAYERS.mid.H, W = 2 * H
  g.clearRect(0, 0, size, size)
  const dim = night ? 0.3 : 1
  const shade = (hex: string, k: number) => { const c = new THREE.Color(hex).multiplyScalar(k); return `#${c.getHexString()}` }
  const rect = (x: number, y: number, w: number, h: number, c: string) => { g.fillStyle = c; g.fillRect(X(x), Y(y), S(w), S(h)) }
  /**
   * The street across the alley, one stretch of it that repeats along (the shader takes it round: seen at an angle the street runs on,
   * no wall or sky run out at its edge (the owner's)): two machiya (町家) between a beige block of flats and a grey one, all down to the
   * ground: upper floors of windows, a band between each floor, an eave of tiles over the ground floor, the shops under it (lattices,
   * noren, red lanterns, a shutter), the kerb and the street. Drawn three times over, a stretch apart, so what crosses an edge carries on.
   */
  const stretch = () => {
    const rnd = seeded(58)
    // (where each storey sits: the ground floor's eave, the floors above it)
    const EAVE = -0.4, STREET = -1.0
    type Front = { x: number; w: number; top: number; kind: 'machiya' | 'flats' | 'concrete'; col: string }
    const fronts: Front[] = [
      { x: -H, w: 0.6, top: 0.04, kind: 'machiya', col: '#5a3a26' },
      { x: -H + 0.6, w: 0.62, top: 0.34, kind: 'flats', col: '#cdbb9c' },
      { x: -H + 1.22, w: 0.5, top: 0.0, kind: 'machiya', col: '#4a3022' },
      { x: -H + 1.72, w: W - 1.72, top: 0.24, kind: 'concrete', col: '#9a9c9e' },
    ]
    for (const f of fronts) {
      const R = f.x + f.w
      // ---- above the eave: the wall, by its kind
      if (f.kind === 'machiya') {
        // (an old townhouse: a plaster upper floor with its mushiko slits (虫籠窓), a little roof of tiles over it, dark timber)
        rect(f.x, f.top, f.w, f.top - EAVE, shade('#e4dccb', dim))
        rect(f.x, f.top, f.w, 0.02, shade('#3a2a1e', dim))
        rect(f.x, f.top, 0.025, f.top - EAVE, shade(f.col, dim))
        rect(R - 0.025, f.top, 0.025, f.top - EAVE, shade(f.col, dim))
        // (its roof at the top: kawara in a band, their round ends along the edge lit on top)
        rect(f.x - 0.02, f.top + 0.09, f.w + 0.04, 0.09, shade('#3e434a', dim))
        for (let x = f.x - 0.01; x < R + 0.02; x += 0.035) {
          g.fillStyle = shade('#6a717a', dim)
          g.beginPath(); g.arc(X(x), Y(f.top + 0.005), S(0.013), 0, Math.PI * 2); g.fill()
        }
        // (the mushiko slits: a long low opening of thick white bars, dark between; warm behind them by night)
        const sy = f.top - 0.13, sw = f.w * 0.62, sx = f.x + (f.w - sw) / 2
        rect(sx, sy, sw, 0.12, night ? (rnd() < 0.7 ? '#e9a957' : '#2a2018') : shade('#2a211a', 1))
        for (let x = sx + 0.012; x < sx + sw; x += 0.03) rect(x, sy, 0.016, 0.12, shade('#ece4d4', dim))
        rect(sx - 0.01, sy + 0.01, sw + 0.02, 0.012, shade('#d6ccb8', dim))
      } else {
        // (a block: its wall, the band along each floor (腰線), the parapet and its shadow)
        rect(f.x, f.top, f.w, f.top - EAVE, shade(f.col, dim))
        rect(f.x - 0.01, f.top + 0.03, f.w + 0.02, 0.05, shade(f.col, dim * 0.8))
        rect(f.x, f.top - 0.02, f.w, 0.025, 'rgba(0,0,0,0.16)')
        if (f.kind === 'concrete') for (let y = f.top - 0.06; y > EAVE; y -= 0.05) rect(f.x, y, f.w, 0.002, 'rgba(0,0,0,0.07)')
        const n = Math.max(2, Math.round((f.w - 0.06) / 0.2))
        for (let fl = 0; ; fl++) {
          const wy = f.top - 0.1 - fl * 0.32
          if (wy - 0.16 < EAVE + 0.04) break
          // (the floor's band under its windows)
          rect(f.x, wy - 0.2, f.w, 0.018, shade(f.col, dim * 0.82))
          rect(f.x, wy - 0.218, f.w, 0.006, 'rgba(255,255,255,0.12)')
          for (let k = 0; k < n; k++) {
            const ww = (f.w - 0.06) / n - 0.05, wh = 0.15, wx = f.x + 0.055 + k * (f.w - 0.06) / n
            // (its frame, set in a little: a dark reveal along its top and side)
            rect(wx - 0.01, wy + 0.01, ww + 0.02, wh + 0.02, shade('#57514a', dim))
            const lit = night && rnd() < 0.45
            if (lit) rect(wx, wy, ww, wh, rnd() < 0.8 ? '#ffd78f' : '#ffe9c2')
            else {
              // (by day the glass a pale blue-grey with the sky in it, brighter at the top, a streak across it)
              const gl = g.createLinearGradient(0, Y(wy), 0, Y(wy - wh))
              gl.addColorStop(0, night ? '#1d2436' : '#a9bccb'); gl.addColorStop(1, night ? '#121828' : '#6f8598')
              g.fillStyle = gl; g.fillRect(X(wx), Y(wy), S(ww), S(wh))
              if (!night) {
                g.fillStyle = 'rgba(255,255,255,0.28)'
                g.beginPath(); g.moveTo(X(wx + ww * 0.15), Y(wy)); g.lineTo(X(wx + ww * 0.4), Y(wy)); g.lineTo(X(wx + ww * 0.15), Y(wy - wh)); g.lineTo(X(wx - ww * 0.1 > wx ? wx : wx), Y(wy - wh)); g.fill()
              }
            }
            rect(wx + ww / 2 - 0.004, wy, 0.008, wh, shade('#57514a', dim))
            // (a curtain drawn part across, now and then)
            if (rnd() < 0.35) rect(wx, wy, ww * 0.32, wh, lit ? 'rgba(232,160,100,0.7)' : `rgba(226,214,192,${night ? 0.25 : 0.7})`)
            // (a little awning (雨よけ) over some)
            if (rnd() < 0.4) {
              rect(wx - 0.02, wy + 0.035, ww + 0.04, 0.02, shade('#6c6a66', dim))
              rect(wx - 0.02, wy + 0.015, ww + 0.04, 0.006, 'rgba(0,0,0,0.2)')
            }
          }
          // (an air conditioner's outdoor unit on its bracket under a window, now and then)
          if (rnd() < 0.7) {
            const ax = f.x + 0.06 + rnd() * (f.w - 0.26)
            rect(ax, wy - 0.17, 0.15, 0.1, night ? '#4a4c52' : '#e8e6de')
            rect(ax, wy - 0.27, 0.15, 0.006, shade('#6a6a66', dim))
            g.strokeStyle = night ? '#2a2c30' : '#9a9890'; g.lineWidth = Math.max(1, S(0.005))
            g.beginPath(); g.arc(X(ax + 0.095), Y(wy - 0.22), S(0.032), 0, Math.PI * 2); g.stroke()
            for (let k = 0; k < 4; k++) rect(ax + 0.01, wy - 0.185 - k * 0.02, 0.04, 0.004, night ? '#2a2c30' : '#b8b6ae')
          }
        }
      }
      // ---- the eave over the ground floor: a strip of tiles, their ends lit along the edge, its shadow under it
      rect(f.x - 0.01, EAVE + 0.05, f.w + 0.02, 0.06, shade(f.kind === 'machiya' ? '#3e434a' : '#5a5c60', dim))
      rect(f.x - 0.01, EAVE - 0.005, f.w + 0.02, 0.012, shade('#8a9098', dim))
      rect(f.x, EAVE - 0.015, f.w, 0.05, 'rgba(0,0,0,0.3)')
      // ---- the ground floor
      const gy = EAVE - 0.06, gh = gy - STREET
      if (f.kind === 'machiya') {
        // (its timber face: a lattice (格子) of fine slats over the front room, a noren in its doorway; warm light behind by night)
        rect(f.x, gy, f.w, gh, shade(f.col, dim))
        const lx = f.x + 0.03, lw = f.w * 0.52
        rect(lx, gy - 0.04, lw, gh - 0.1, night ? '#c9873e' : '#2b1f17')
        for (let x = lx + 0.005; x < lx + lw; x += 0.022) rect(x, gy - 0.04, 0.012, gh - 0.1, shade('#6b4a30', night ? 0.55 : 1))
        rect(lx, gy - 0.04, lw, 0.012, shade('#3a281c', dim))
        // (the doorway, its noren: indigo, a white crest, split in three)
        const dx = lx + lw + 0.04, dw = f.w - lw - 0.1
        rect(dx, gy - 0.02, dw, gh - 0.02, night ? '#3a2614' : '#1a120c')
        const nc = rnd() < 0.5 ? '#2c3f6a' : '#7a2a2a'
        for (let k = 0; k < 3; k++) rect(dx + 0.004 + k * dw / 3, gy - 0.03, dw / 3 - 0.008, 0.2, shade(nc, night ? 0.75 : 1))
        g.fillStyle = shade('#f2ece0', night ? 0.8 : 1)
        g.beginPath(); g.arc(X(dx + dw / 2), Y(gy - 0.12), S(0.025), 0, Math.PI * 2); g.fill()
      } else if (f.kind === 'flats') {
        // (an izakaya on the ground floor of the flats: its sliding doors of glass in timber, a noren, a pair of red lanterns)
        rect(f.x, gy, f.w, gh, shade('#3a2a20', dim))
        const dx = f.x + 0.06, dw = f.w - 0.12
        rect(dx, gy - 0.05, dw, gh - 0.05, night ? '#e2a25a' : '#4c5862')
        for (let k = 1; k < 4; k++) rect(dx + k * dw / 4 - 0.005, gy - 0.05, 0.01, gh - 0.05, shade('#3a2a20', 1))
        rect(dx, gy - 0.2, dw, 0.008, shade('#3a2a20', 1))
        for (let k = 0; k < 4; k++) rect(dx + 0.004 + k * dw / 4, gy - 0.04, dw / 4 - 0.008, 0.17, shade('#1f2d4e', night ? 0.8 : 1))
      } else {
        // (a shop shut for the day: its shutter half down, the glass under it)
        rect(f.x, gy, f.w, gh, shade('#7d8082', dim))
        const sx = f.x + 0.05, sw = f.w - 0.1
        rect(sx, gy - 0.03, sw, gh - 0.05, night ? '#d9c08a' : '#566470')
        for (let y = gy - 0.03; y > gy - 0.25; y -= 0.018) rect(sx, y, sw, 0.012, shade('#a2a6a8', night ? 0.5 : 1))
        rect(sx, gy - 0.25, sw, 0.012, shade('#5a5e60', dim))
      }
      rect(f.x, STREET + 0.012, f.w, 0.012, 'rgba(0,0,0,0.3)')
    }
    // ---- red lanterns (赤ちょうちん) hung from the eave: one by the machiya's door, a pair by the izakaya's
    const chochin = (x: number, y: number, r: number) => {
      if (night) {
        const lg = g.createRadialGradient(X(x), Y(y), 0, X(x), Y(y), S(r * 4))
        lg.addColorStop(0, 'rgba(255,120,70,0.55)'); lg.addColorStop(1, 'rgba(255,120,70,0)')
        g.fillStyle = lg; g.fillRect(X(x - r * 4), Y(y + r * 4), S(r * 8), S(r * 8))
      }
      rect(x - 0.002, EAVE - 0.01, 0.004, EAVE - 0.01 - (y + r * 1.5), shade('#2a2420', dim))
      const body = g.createRadialGradient(X(x - r * 0.3), Y(y + r * 0.2), 0, X(x), Y(y), S(r * 1.3))
      if (night) { body.addColorStop(0, '#ffd2a0'); body.addColorStop(0.5, '#ff5a3a'); body.addColorStop(1, '#a8231c') }
      else { body.addColorStop(0, '#e2483c'); body.addColorStop(0.6, '#b8261e'); body.addColorStop(1, '#6a1410') }
      g.fillStyle = body
      g.beginPath(); g.ellipse(X(x), Y(y), S(r), S(r * 1.45), 0, 0, Math.PI * 2); g.fill()
      g.strokeStyle = night ? 'rgba(150,40,20,0.5)' : 'rgba(60,10,8,0.45)'; g.lineWidth = Math.max(1, S(0.002))
      for (let k = -2; k <= 2; k++) { g.beginPath(); g.ellipse(X(x), Y(y + k * r * 0.45), S(r * Math.sqrt(1 - (k * 0.3) ** 2)), S(r * 0.08), 0, 0, Math.PI * 2); g.stroke() }
      rect(x - r * 0.62, y + r * 1.5, r * 1.24, r * 0.22, '#1a1412')
      rect(x - r * 0.62, y - r * 1.28, r * 1.24, r * 0.22, '#1a1412')
      g.fillStyle = night ? '#2a0e08' : '#1a0806'
      g.font = `bold ${Math.round(S(r * 0.9))}px "Yu Mincho", "MS Mincho", serif`; g.textAlign = 'center'; g.textBaseline = 'middle'
      g.fillText('酒', X(x), Y(y))
    }
    chochin(-H + 0.6 + 0.12, -0.56, 0.036)
    chochin(-H + 0.6 + 0.5, -0.56, 0.036)
    // (the machiya's before its lattice: by its door it hung over the noren's crest)
    chochin(-H + 1.22 + 0.16, -0.55, 0.032)
    // ---- the signs: boards stood off the wall on brackets, a side to them, lit from behind by night
    const sign = (x: number, top: number, h: number, w: number, bg: string, fg: string, text: string) => {
      const d = 0.014
      if (night) { g.save(); g.fillStyle = bg; g.globalAlpha = 0.45; g.filter = 'blur(10px)'; g.fillRect(X(x - 0.05), Y(top + 0.05), S(w + 0.1), S(h + 0.1)); g.restore() }
      // (its brackets to the wall, top and foot)
      for (const y of [top - 0.03, top - h + 0.03]) rect(x + w, y + 0.006, 0.05, 0.012, shade('#3a3a3a', dim))
      // (its side, toward the wall)
      g.fillStyle = shade(bg, night ? 0.55 : 0.5)
      g.beginPath(); g.moveTo(X(x + w), Y(top)); g.lineTo(X(x + w + d), Y(top - d)); g.lineTo(X(x + w + d), Y(top - h - d)); g.lineTo(X(x + w), Y(top - h)); g.fill()
      g.fillStyle = shade(bg, night ? 0.4 : 0.42)
      g.beginPath(); g.moveTo(X(x), Y(top - h)); g.lineTo(X(x + w), Y(top - h)); g.lineTo(X(x + w + d), Y(top - h - d)); g.lineTo(X(x + d), Y(top - h - d)); g.fill()
      // (its face: lit through by night, a frame round it)
      const face = g.createLinearGradient(X(x), 0, X(x + w), 0)
      face.addColorStop(0, night ? shade(bg, 1.25) : bg); face.addColorStop(1, night ? bg : shade(bg, 0.86))
      g.fillStyle = face; g.fillRect(X(x), Y(top), S(w), S(h))
      g.strokeStyle = shade(bg, 0.45); g.lineWidth = Math.max(1, S(0.006)); g.strokeRect(X(x), Y(top), S(w), S(h))
      g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = Math.max(1, S(0.002)); g.strokeRect(X(x + 0.008), Y(top - 0.008), S(w - 0.016), S(h - 0.016))
      g.fillStyle = fg
      g.font = `bold ${Math.round(S(w * 0.66))}px "Yu Mincho", "MS Mincho", serif`
      g.textAlign = 'center'; g.textBaseline = 'middle'
      const chars = [...text]
      chars.forEach((ch, i) => g.fillText(ch, X(x + w / 2), Y(top - (i + 0.5) * (h / chars.length))))
    }
    sign(-H + 0.6 + 0.03, 0.22, 0.42, 0.085, night ? '#3aa8ff' : '#1f6fb8', '#ffffff', '居酒屋')
    sign(-H + 1.72 + 0.05, 0.14, 0.4, 0.08, night ? '#fff6e4' : '#f2ede2', '#2a1c14', '酒処')
    sign(W - H - 0.16, 0.1, 0.32, 0.07, night ? '#ff5a72' : '#c8344c', '#fff6ee', 'スナック')
    // ---- the kerb and the street below it all (run on down: seen from high the street's all that shows there)
    rect(-H, STREET, W, 0.025, shade('#9a968e', dim))
    const st = g.createLinearGradient(0, Y(STREET - 0.025), 0, Y(-H))
    st.addColorStop(0, shade('#4a4a4c', dim)); st.addColorStop(1, shade('#3a3a3c', dim))
    g.fillStyle = st; g.fillRect(X(-H), Y(STREET - 0.025), S(W), Y(-H) - Y(STREET - 0.025) + 2)
    if (night) for (const x of [-H + 0.42, -H + 0.95, -H + 1.6]) {
      const pool = g.createRadialGradient(X(x), Y(STREET - 0.06), 0, X(x), Y(STREET - 0.06), S(0.22))
      pool.addColorStop(0, 'rgba(255,170,100,0.35)'); pool.addColorStop(1, 'rgba(255,170,100,0)')
      g.fillStyle = pool; g.fillRect(X(x - 0.22), Y(STREET), S(0.44), Y(-H) - Y(STREET))
    }
    // ---- the utility pole and its wires, thin and far off
    const px = 0.36
    g.fillStyle = night ? '#2e3036' : '#a8a8a2'
    g.beginPath(); g.moveTo(X(px - 0.022), Y(STREET)); g.lineTo(X(px - 0.014), Y(1.0)); g.lineTo(X(px + 0.014), Y(1.0)); g.lineTo(X(px + 0.022), Y(STREET)); g.fill()
    g.fillStyle = night ? '#24262c' : '#7c7c76'
    g.fillRect(X(px - 0.16), Y(0.86), S(0.32), S(0.018))
    g.fillStyle = night ? '#3a3e44' : '#8f9497'
    g.fillRect(X(px + 0.025), Y(0.62), S(0.07), S(0.12))
    g.strokeStyle = night ? 'rgba(10,10,14,0.8)' : 'rgba(40,40,40,0.7)'
    g.lineWidth = Math.max(1, S(0.003))
    for (const [y, sag] of [[0.86, 0.12], [0.84, 0.16], [0.62, 0.12]] as [number, number][]) {
      for (const sd of [-1, 1]) {
        g.beginPath(); g.moveTo(X(px + sd * 0.15), Y(y)); g.quadraticCurveTo(X(px + sd * 0.6), Y(y - sag * 1.6), X(px + sd * H), Y(y - sag * 0.6)); g.stroke()
      }
    }
  }
  for (const k of [-1, 0, 1]) { g.save(); g.translate(S(k * W), 0); stretch(); g.restore() }
  // (the fronts across the alley in the shade at dusk, the sun going down behind them, warm on their edges; cool and grey at dawn)
  toneTo(g, size, sky, 'rgba(94,72,62,0.38)', 'rgba(118,118,168,0.26)')
}
function drawViewNear(g: CanvasRenderingContext2D, size: number, sky: Sky, part: 'back' | 'front' = 'front') {
  const { X, S } = viewPx('near', size)
  g.clearRect(0, 0, size, size)
  // (a few bamboo just outside (the owner's: the fence taken away), the very ones whose shadows the moon throws on the paper: the paper's
  // 512 px over the window's round, laid on this layer's own span)
  g.save()
  g.translate(X(-ROUND_R), X(-ROUND_R))
  g.scale(S(2 * ROUND_R) / 512, S(2 * ROUND_R) / 512)
  bambooGrove(g, sky === 'night' ? 'night' : 'day', undefined, part)
  g.restore()
  // (against the evening sun the bamboo's dark, its edges warm; in the dawn a cool grey-green)
  toneTo(g, size, sky, 'rgba(40,30,20,0.6)', 'rgba(70,72,110,0.3)')
}
/** the four layers' pictures, made again as the part of the day turns */
const ROUND_VIEW = (() => {
  if (typeof document === 'undefined') return null
  const make = (size: number, draw: (g: CanvasRenderingContext2D, size: number, sky: Sky) => void, wrapS: THREE.Wrapping = THREE.ClampToEdgeWrapping) => {
    const c = document.createElement('canvas')
    c.width = c.height = size
    const g = c.getContext('2d')!
    const t = new THREE.CanvasTexture(c)
    t.wrapS = wrapS
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    return { t, paint: (sky: Sky) => { draw(g, size, sky); t.needsUpdate = true } }
  }
  // (the far city and the sky mirrored on round, the street across repeating, at an angle: their pictures' edges were drawn out into
  // bands, the street across ran out to bare wall and the sky showed under it (the owner's); the bamboo in two depths, the two further
  // culms a little behind the near ones, each stirring on its own)
  const layers = { sky: make(512, drawViewSky, THREE.MirroredRepeatWrapping), far: make(1024, drawViewFar, THREE.MirroredRepeatWrapping),
    mid: make(1024, drawViewMid, THREE.RepeatWrapping), back: make(512, (g, n, sk) => drawViewNear(g, n, sk, 'back')), near: make(512, drawViewNear) }
  // (only when it's turned: the two marks change together, and each would paint all four again)
  let painted: Sky | null = null
  const paint = () => { const sky = skyNow(); if (sky === painted) return; painted = sky; for (const l of Object.values(layers)) l.paint(sky) }
  paint()
  onSky(paint)
  const L = VIEW_LAYERS
  const mat = new THREE.ShaderMaterial({
    uniforms: { uSky: { value: layers.sky.t }, uFar: { value: layers.far.t }, uMid: { value: layers.mid.t }, uBack: { value: layers.back.t }, uNear: { value: layers.near.t },
      uCam: { value: new THREE.Vector3(0, 0, 3) }, uTime: { value: 0 }, ...rainUniforms() },
    vertexShader: `varying vec3 vLocal;
void main() { vLocal = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D uSky, uFar, uMid, uBack, uNear;
uniform vec3 uCam;
uniform float uTime;
varying vec3 vLocal;
${RAIN_GLSL}
vec4 layer(sampler2D t, vec2 xy, float H) { return texture2D(t, clamp(xy / (2.0 * H) + 0.5, 0.0, 1.0)); }
// (along, as its picture wraps (repeating, or mirrored round); up and down held at its edges)
vec4 layerOn(sampler2D t, vec2 xy, float H) { vec2 uv = xy / (2.0 * H) + 0.5; return texture2D(t, vec2(uv.x, clamp(uv.y, 0.002, 0.998))); }
void main() {
  // (the way the eye looks through this point of the window, on into the street: where it meets each layer)
  vec3 dir = normalize(vLocal - uCam);
  vec2 slope = dir.xy / max(-dir.z, 0.15);
  vec3 c = layerOn(uSky, vLocal.xy + slope * ${L.sky.d.toFixed(1)}, ${L.sky.H.toFixed(2)}).rgb;
  // (the far city and the street across hazed into the sky by the air between (the owner's: softer, less contrast, the eye kept on the
  // window and the bamboo); the near bamboo stirring a little in the wind, more toward their tops)
  vec3 air = c;
  vec4 f = layerOn(uFar, vLocal.xy + slope * ${L.far.d.toFixed(1)}, ${L.far.H.toFixed(2)}); c = mix(c, mix(f.rgb, air, 0.38), f.a);
  vec4 m = layerOn(uMid, vLocal.xy + slope * ${L.mid.d.toFixed(1)}, ${L.mid.H.toFixed(2)}); c = mix(c, mix(m.rgb, air, 0.14), m.a);
  // (item 623: rain over the street, behind the bamboo: its veil far off, finer and fainter, and its streaks between the street and the
  // bamboo; the street dulled under it)
  if (uRain > 0.002) {
    c = rainDull(c, uRain);
    c += RAIN_INK * uRain * (0.16 * rainLayer(vLocal.xy + slope * 3.0, uRainT, vec2(0.05, 0.22), 1.9, 0.5, 0.012, 9.3)
      + 0.34 * rainLayer(vLocal.xy + slope * 0.8, uRainT, vec2(0.035, 0.16), 2.6, 0.55, 0.006, 1.7));
  }
  vec2 sway = vec2(sin(uTime * 0.9 + vLocal.y * 2.5) * 0.008 + sin(uTime * 2.3) * 0.002, 0.0) * (0.4 + vLocal.y / 0.8 + 0.5);
  vec2 swayB = vec2(sin(uTime * 0.7 + vLocal.y * 2.1 + 1.7) * 0.006 + sin(uTime * 1.9 + 0.6) * 0.0015, 0.0) * (0.4 + vLocal.y / 0.8 + 0.5);
  vec4 bb = layer(uBack, vLocal.xy + slope * ${L.back.d.toFixed(2)} + swayB, ${L.back.H.toFixed(2)}); c = mix(c, mix(bb.rgb, air, 0.06), bb.a);
  vec4 n = layer(uNear, vLocal.xy + slope * ${L.near.d.toFixed(1)} + sway, ${L.near.H.toFixed(2)}); c = mix(c, n.rgb, n.a);
  // (the bamboo out in the wet too, a little duller)
  if (uRain > 0.002) c = mix(c, rainDull(c, uRain), 0.4);
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`,
  })
  return mat
})()
/**
 * The round window's shoji (the owner's: it opens left and right): two halves, each a half of the paper with its own lattice (bars over the
 * washi), sliding apart into the wall when clicked and back together at another, with the runners' sound, cut to the window's round
 * (whatever slides past its edge is in the wall, unseen); behind them the view outside (ROUND_VIEW: a city backstreet, in depth). They swung open into the room for a
 * while, hinged at the round's left and right like the fridges' doors; the owner found the half-moons standing out in the air odd, and chose
 * this, as a round window's shoji does. (A passer-by's shadow crossed the paper by day now and then: the owner found it odd and had it
 * taken away.) Not batched: it moves, and it's clicked.
 */
/** the glow under the round window's sill: a soft fan of light fading down the wall, its colour the part of the day's */
export const SILL_TEX = (() => {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = 128; c.height = 64
  const g = c.getContext('2d')!
  const gr = g.createRadialGradient(64, 0, 4, 64, 0, 64)
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = gr; g.fillRect(0, 0, 128, 64)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
})()
const SILL_LIGHT: Record<Sky, { c: THREE.Color; a: number }> = {
  day: { c: new THREE.Color('#dce8ff'), a: 0.16 },
  dusk: { c: new THREE.Color('#ffb46e'), a: 0.3 },
  dawn: { c: new THREE.Color('#ffc8c0'), a: 0.16 },
  night: { c: new THREE.Color('#9fb8e0'), a: 0 },
}
export function RoundShoji() {
  const R = ROUND_R
  const win = useRef<THREE.Group>(null)
  const halves = useRef<(THREE.Group | null)[]>([])
  const view = useRef<THREE.Mesh>(null)
  const sill = useRef<THREE.Mesh>(null)
  const st = useRef({ open: false, k: 0 })
  // (dev: the shoji slid open or shut as a click would, for the probes (item 623's rain through the window))
  useEffect(() => { if (import.meta.env?.DEV) Object.assign(window, { __roundShoji: (open: boolean) => { st.current.open = open } }) }, [])
  /** the window's frame, inverted, for cutting what's drawn to its round */
  const inv = useMemo(() => ({ value: new THREE.Matrix4() }), [])
  const round = useMemo(() => {
    const cut = <T extends THREE.Material>(m: T, lowerOnly = false, shadows = false) => {
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uWinInv = inv
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform mat4 uWinInv;\nvarying vec3 vWin;')
          .replace('#include <project_vertex>', '#include <project_vertex>\nvWin = (uWinInv * modelMatrix * vec4(transformed, 1.0)).xyz;')
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWin;')
          .replace('void main() {', `void main() {\n  if (vWin.y * vWin.y + vWin.z * vWin.z > ${(R * R).toFixed(5)}${lowerOnly ? ' || vWin.y > 0.0' : ''}) discard;`)
        // (item 950: the light through the paper looked up where the point is in the window, not on the paper: the moon's and the lantern's
        // light and the bamboo's shadows fall where they fall as it slides across them. Item 848, the owner's 「圖1在靜止模式下才是對的，
        // 圖二是打開的瞬間要拿掉。」: the shadows on it always, shut and still (his first picture), and as it slides open or shut; no plain
        // paper the moment it opens (his second), nor a moment after it's shut, as item 950 had them go)
        if (shadows) {
          sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `vec2 winUv = vec2(vWin.z, vWin.y) / ${(2 * R).toFixed(5)} + 0.5;
  diffuseColor *= texture2D(map, winUv);`)
        }
      }
      m.customProgramCacheKey = () => (lowerOnly ? (shadows ? 'round-cut-low-shade' : 'round-cut-low') : 'round-cut')
      return m
    }
    return {
      // (the washi on its lower half only (the owner's: the lower half screened, the upper open on the view, as a koshi-shoji is))
      paper: cut(new THREE.MeshBasicMaterial({ map: ROUND_PAPER, toneMapped: false }), true, true),
      wood: cut(new THREE.MeshToonMaterial({ color: '#6a4428' })),
    }
  }, [inv, R])
  useEffect(() => () => { round.paper.dispose(); round.wood.dispose() }, [round])
  // (each half's lattice, one mesh: its outer upright, the three bars across from the middle out to the round, an upright at its inner edge)
  const bars = useMemo(() => [-1, 1].map((sd) => {
    const out: THREE.BufferGeometry[] = []
    const bar = (p: [number, number, number], sz: [number, number, number]) => { const g = new THREE.BoxGeometry(...sz); g.translate(...p); out.push(g) }
    bar([-0.012, 0, sd * 0.2], [0.018, 2 * Math.sqrt(R * R - 0.04), 0.016])
    bar([-0.012, 0, sd * 0.008], [0.018, 2 * R, 0.016])
    for (const y of [-0.2, 0, 0.2]) {
      const half = Math.sqrt(R * R - y * y)
      bar([-0.012, y, sd * half / 2], [0.018, 0.016, half])
    }
    const g = mergeGeometries(out)!
    out.forEach((q) => q.dispose())
    return g
  }), [R])
  useEffect(() => () => { bars.forEach((g) => g.dispose()) }, [bars])
  const eye = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera }, dt) => {
    const w = win.current
    const s = st.current
    if (!w) return
    inv.value.copy(w.matrixWorld).invert()
    // (where the eye is, in the window's own frame: the street's layers are looked through from there)
    if (view.current && ROUND_VIEW) ROUND_VIEW.uniforms.uCam.value.copy(view.current.worldToLocal(eye.copy(camera.position)))
    if (ROUND_VIEW) ROUND_VIEW.uniforms.uTime.value += Math.min(dt, 0.1)
    // (item 623: the rain out there, by the day's weather, eased on and off; its streaks on the view's own time)
    if (ROUND_VIEW) {
      const c = getClock(), u = ROUND_VIEW.uniforms
      u.uRain.value += (rainAt(weatherOf(businessDay(c.day, c.minute)), c.minute) - u.uRain.value) * Math.min(1, dt * 1.5)
      u.uRainT.value = u.uTime.value
    }
    // (the light under the sill: its part of the day's colour, eased)
    if (sill.current) {
      const want = SILL_LIGHT[skyNow()]
      const m = sill.current.material as THREE.MeshBasicMaterial
      m.color.lerp(want.c, Math.min(1, dt * 2))
      // (as little of it as the blind lets through, over the window's lower half it's let down over (item 338))
      const a = want.a * (1 - (1 - BLIND_PASS) * BLIND.coverLow)
      m.opacity += (a - m.opacity) * Math.min(1, dt * 2)
      sill.current.visible = m.opacity > 0.01
    }
    const want = s.open ? 1 : 0
    s.k += Math.sign(want - s.k) * Math.min(Math.abs(want - s.k), Math.min(dt, 0.1) * 1.6)
    const e = s.k * s.k * (3 - 2 * s.k)
    halves.current.forEach((h, i) => { if (h) h.position.z = (i ? 1 : -1) * e * (R + 0.02) })
    ROUND_AIR.k = e
  })
  const says = () => (st.current.open ? '點一下關上' : '點一下打開（左右拉開）')
  return (
    <group ref={win} name="round-shoji">
      {/* (the light in through it falling on the wall under its sill (the owner's): a soft glow fading down the plaster, cool white by day,
          warm at dusk, rose at dawn, none at night (the moon's beam is its own)) */}
      <mesh ref={sill} position={[-0.012, -R - 0.32, 0]} rotation-y={-Math.PI / 2} raycast={() => {}}>
        <planeGeometry args={[R * 2.4, 0.6]} />
        <meshBasicMaterial map={SILL_TEX ?? undefined} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      {/* (outside, behind it all: the street, seen in depth through the window (ROUND_VIEW)) */}
      <mesh ref={view} position-x={-0.001} rotation-y={-Math.PI / 2} material={ROUND_VIEW ?? undefined}>
        <circleGeometry args={[R, 64]} />
      </mesh>
      <group onClick={(ev) => {
        ev.stopPropagation()
        if (getEdit().on) return
        st.current.open = !st.current.open
        slideDoorSound(st.current.open)
        setTip({ title: '圓窗', hint: says() })
      }}
        onPointerOver={(ev) => { if (getEdit().on) return; tipOver('圓窗', says()).onPointerOver(ev) }}
        onPointerOut={(ev) => { tipOver('圓窗', '').onPointerOut(ev) }}>
        {/* (the whole window to point at, its frame too, open or shut: an unseen disc out over the frame (the owner's); the pointer's rays
            don't mind it's unseen) */}
        <mesh position-x={-0.092} rotation-y={-Math.PI / 2} visible={false}>
          <circleGeometry args={[R + 0.08, 32]} />
        </mesh>
        {[0, 1].map((i) => (
          <group key={i} ref={(o) => { halves.current[i] = o }}>
            <mesh position-x={-0.004} rotation-y={-Math.PI / 2} material={round.paper}>
              <circleGeometry args={[R, 48, i ? -Math.PI / 2 : Math.PI / 2, Math.PI]} />
            </mesh>
            <mesh geometry={bars[i]} material={round.wood} />
          </group>
        ))}
      </group>
    </group>
  )
}
/** where along the back wall the second round window goes (the wall's own frame) */
export const ROUND_AT = -1.36
/** the daylight that comes in through it (by day only, gone at night): a cool glow round it on the plaster, and a faint shaft of it slanting
 * down into the room, soft at its edges and fading as it goes */
const DAYLIGHT = (() => {
  if (typeof document === 'undefined') return { halo: null, beam: null, fall: null, fallCanvas: null }
  const tex = (c: HTMLCanvasElement) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t }
  const halo = document.createElement('canvas')
  halo.width = halo.height = 128
  const h = halo.getContext('2d')!
  // (a ring: clear over the window itself, so its paper keeps its own blue, brightest just outside the frame, fading out over the plaster)
  const gr = h.createRadialGradient(64, 64, 0, 64, 64, 64)
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); gr.addColorStop(0.56, 'rgba(255,255,255,0.85)')
  gr.addColorStop(0.72, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)')
  h.fillStyle = gr; h.fillRect(0, 0, 128, 128)
  // (the shaft: across it soft at both edges, along it brightest at the window (the picture's top) and gone by its far end)
  const beam = document.createElement('canvas')
  beam.width = 64; beam.height = 256
  const b = beam.getContext('2d')!
  for (let y = 0; y < 256; y++) {
    // (fading in over its first stretch from the window too: the sheets' start at the frame showed as a hard edge)
    const t = y / 255, k = Math.pow(1 - t, 1.7) * Math.min(1, t / 0.2) ** 1.5
    const row = b.createLinearGradient(0, 0, 64, 0)
    row.addColorStop(0, 'rgba(255,255,255,0)'); row.addColorStop(0.5, `rgba(255,255,255,${k})`); row.addColorStop(1, 'rgba(255,255,255,0)')
    b.fillStyle = row; b.fillRect(0, y, 64, 1)
  }
  // (the sun's patch on the floor (item 306): painted by paintFall, the blind's shadows on it as it's let down (item 338))
  const fall = document.createElement('canvas')
  fall.width = 256; fall.height = 128
  return { halo: tex(halo), beam: tex(beam), fall: tex(fall), fallCanvas: fall }
})()
/**
 * The sun's patch on the floor (item 306): the round window's shape, soft at its edge, its lattice's bars dark across it; and over as much of it
 * as the blind covers of the window (item 338: `cover`, from the patch's far end, where the window's top throws its light, the way the
 * shaft slants in) the blind's slats' shadows across it, fine stripes letting a quarter of it through, soft at the blind's foot
 */
function paintFall(cover: number) {
  const c = DAYLIGHT.fallCanvas
  if (!c || !DAYLIGHT.fall) return
  const f = c.getContext('2d')!
  const W = c.width, H = c.height
  f.setTransform(1, 0, 0, 1, 0, 0)
  f.globalCompositeOperation = 'source-over'
  f.filter = 'none'
  f.clearRect(0, 0, W, H)
  f.save()
  f.scale(W / 128, 1)
  f.filter = 'blur(5px)'
  f.fillStyle = 'rgba(255,255,255,0.95)'
  f.beginPath(); f.arc(64, 64, 52, 0, Math.PI * 2); f.fill()
  f.filter = 'blur(2px)'
  f.globalCompositeOperation = 'destination-out'
  f.fillStyle = 'rgba(0,0,0,0.75)'
  for (const x of [46, 82]) f.fillRect(x - 3, 0, 6, 128)
  for (const y of [38, 64, 90]) f.fillRect(0, y - 2.5, 128, 5)
  f.restore()
  if (cover > 0.002) {
    // (the slats' shadows: lines along the wall, every 3 pixels two dark and one let through, over the covered stretch, fading in at its edge)
    const x1 = cover * W
    f.globalCompositeOperation = 'destination-out'
    f.filter = 'none'
    for (let x = 0; x < Math.min(W, x1 + 8); x += 3) {
      const edge = THREE.MathUtils.clamp((x1 + 8 - x) / 16, 0, 1)
      f.fillStyle = `rgba(0,0,0,${0.9 * edge})`
      f.fillRect(x, 0, 2, H)
    }
    f.globalCompositeOperation = 'source-over'
  }
  DAYLIGHT.fall.needsUpdate = true
}
// (painted once at the start, as the blind hangs then)
if (typeof document !== 'undefined') paintFall(BLIND.cover)
/** the light from outside about the round window, by the part of the day: its colour, and how strong (none by day, the sky's light all
 * over then) */
const SKY_GLOWS: { m: THREE.MeshBasicMaterial; looks: Record<Sky, [string, number]>; blinded: boolean }[] = []
/** a glow of the window's light, by the part of the day, and (`blinded`) dimmed as the blind covers the window (item 338) */
function skyGlow(m: THREE.MeshBasicMaterial, looks: Record<Sky, [string, number]>, blinded = true) {
  SKY_GLOWS.push({ m, looks, blinded })
  const [c, o] = looks[skyNow()]
  m.color.set(c)
  m.opacity = o
  return m
}
/** every glow as the part of the day and the blind have it now */
function applySkyGlows() {
  const s = skyNow(), k = 1 - (1 - BLIND_PASS) * BLIND.cover
  for (const { m, looks, blinded } of SKY_GLOWS) { m.color.set(looks[s][0]); m.opacity = looks[s][1] * (blinded ? k : 1) }
}
if (typeof document !== 'undefined') onSky(applySkyGlows)
// (by night the moon's faint blue glow round the window and its shaft slanting in, dust drifting in it (WindowDust); at dusk the evening
// sun's, orange and stronger; at dawn only a faint rose glow round it (the morning sun's on the room's other side); by day none)
// (and by day (item 306, the owner's: 「光照跟陰影感還不行，尤其是白天，不太真實」): the plaster round it a little lit, a faint warm shaft of the
// sun slanting in, and its patch on the floor where it falls, the lattice's bars across it)
const WINDOW_HALO = skyGlow(new THREE.MeshBasicMaterial({ map: DAYLIGHT.halo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  toneMapped: false }), { day: ['#fff4dc', 0.14], dawn: ['#ffc6d4', 0.12], dusk: ['#ffc07c', 0.3], night: ['#8fc4ff', 0.22] })
const SUNBEAM = skyGlow(new THREE.MeshBasicMaterial({ map: DAYLIGHT.beam, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  toneMapped: false, side: THREE.DoubleSide }), { day: ['#fff1d6', 0.1], dawn: ['#ffd6de', 0], dusk: ['#ffb872', 0.22], night: ['#78b2ff', 0.15] })
// (the patch on the floor not dimmed as a whole: the blind's shadows are painted on it, over as much of it as it covers (paintFall))
const SUNFALL = skyGlow(new THREE.MeshBasicMaterial({ map: DAYLIGHT.fall, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  toneMapped: false }), { day: ['#ffeccc', 0.3], dawn: ['#ffd6c8', 0.1], dusk: ['#ffb46e', 0.34], night: ['#9cc0ff', 0.1] }, false)
/** the dust in the moon's shaft by night, in the evening sun's at dusk: specks drifting slowly down it and about, catching its light (in the
 * window's frame, as the shaft) */
// (24 of them, the owner's: fewer specks; they were 46)
const DUST_N = 24
export function WindowDust() {
  const pts = useRef<THREE.Points>(null)
  const { geo, seeds } = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(DUST_N * 3), 3))
    return { geo: g, seeds: Array.from({ length: DUST_N }, () => [Math.random(), Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 6.28, 0.6 + Math.random() * 0.8]) }
  }, [])
  const mat = useMemo(() => new THREE.PointsMaterial({ color: '#cfe4ff', size: 0.018, sizeAttenuation: true, transparent: true, opacity: 0.55, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false }), [])
  useFrame(({ clock }) => {
    const o = pts.current
    if (!o) return
    const sky = skyNow()
    o.visible = sky === 'night' || sky === 'dusk'
    if (!o.visible) return
    mat.color.set(sky === 'dusk' ? '#ffd8a8' : '#cfe4ff')
    const t = clock.elapsedTime, a = geo.attributes.position as THREE.BufferAttribute
    const tilt = SHAFT_TILT, R = 0.4
    for (let i = 0; i < DUST_N; i++) {
      const [u0, sx, sz, ph, sp] = seeds[i]
      // (along the shaft, slowly on down it and round again; across it, a lazy wander)
      const u = (u0 + t * 0.012 * sp) % 1, L = 0.2 + u * (SHAFT_L - 0.35)
      const w = R * (0.7 + u * 0.4)
      const x = -0.07 - Math.cos(tilt) * L + Math.sin(tilt) * sx * w * 0.6 + Math.sin(t * 0.3 * sp + ph) * 0.03
      const y = -Math.sin(tilt) * L - Math.cos(tilt) * sx * w * 0.6 + Math.cos(t * 0.23 * sp + ph) * 0.03
      a.setXYZ(i, x, y, sz * w * 0.8 + Math.sin(t * 0.17 + ph) * 0.04)
    }
    a.needsUpdate = true
    // (each speck fading in and out of the light: the whole lot's opacity breathing a little; as little of it as the blind lets through)
    mat.opacity = (0.42 + Math.sin(t * 0.5) * 0.08) * (1 - (1 - BLIND_PASS) * BLIND.cover)
  })
  return <points ref={pts} geometry={geo} material={mat} frustumCulled={false} renderOrder={3} />
}
/** how steeply the window's light comes down into the room (rad below level) and how far it reaches (item 338: 0.62, its patch fell 2 m in,
 * under the bar's counter and the hearth's rim, out of sight; at 60 degrees, the sun high as the owner has it by day (11-01), it lands on the
 * open floor between the wall's stands and the bar, 0.58 to 1.04 out) */
const SHAFT_TILT = Math.PI / 3, SHAFT_L = 1.75
/** where its patch lies on the floor (1.4 under the window's middle): its middle out from the wall, and its size (the round's 0.8 laid along
 * the floor 0.8 / tan of the tilt, and as wide along the wall, a little more for its soft edge) */
const SUNFALL_AT = -1.4 / Math.tan(SHAFT_TILT) - 0.07
const SUNFALL_SIZE: [number, number] = [0.8 / Math.tan(SHAFT_TILT) * 1.22, 0.98]
/** the shaft's two crossed sheets, in the window's frame (the room toward -x): from the window's face, slanting down and in */
const SUNBEAM_GEO = (() => {
  const R = 0.4, L = SHAFT_L, tilt = SHAFT_TILT
  const d = new THREE.Vector3(-Math.cos(tilt), -Math.sin(tilt), 0)
  const up = new THREE.Vector3(-Math.sin(tilt), Math.cos(tilt), 0)
  const at = new THREE.Vector3(-0.07, 0, 0)
  const sheet = (side: THREE.Vector3, w0: number, w1: number) => {
    const far = at.clone().addScaledVector(d, L)
    const v = [at.clone().addScaledVector(side, -w0), at.clone().addScaledVector(side, w0), far.clone().addScaledVector(side, w1), far.clone().addScaledVector(side, -w1)]
    return { pos: v.flatMap((p) => [p.x, p.y, p.z]), uv: [0, 1, 1, 1, 1, 0, 0, 0] }
  }
  const a = sheet(new THREE.Vector3(0, 0, 1), R * 0.8, R * 1.15), b = sheet(up, R * 0.7, R * 1.0)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute([...a.pos, ...b.pos], 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute([...a.uv, ...b.uv], 2))
  g.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7])
  return g
})()
export function RoundWindow() {
  const R = 0.4
  return (
    <group name="RoundWindow">
      {/* (what the window view (data/views) looks at: its middle, its +z turned to face into the room) */}
      <group name="look-window" rotation-y={-Math.PI / 2} />
      {/* (by day: the sky's light glowing round it on the plaster, and slanting in) */}
      <mesh position-x={-0.075} rotation-y={-Math.PI / 2} material={WINDOW_HALO} renderOrder={2}><planeGeometry args={[R * 4.2, R * 4.2]} /></mesh>
      <mesh geometry={SUNBEAM_GEO} material={SUNBEAM} renderOrder={2} />
      {/* (where the shaft meets the floor (1.4 under the window's middle), drawn long the way it slants in) */}
      <mesh position={[SUNFALL_AT, -1.4 + 0.006, 0]} rotation-x={-Math.PI / 2} material={SUNFALL} renderOrder={2}><planeGeometry args={SUNFALL_SIZE} /></mesh>
      {/* (the paper is the shoji's: RoundShoji, outside the batch, as it slides open) */}
      {/* (the reveal, the frame and its bead) */}
      <Suspense fallback={null}><RoundWood /></Suspense>
      {/* (its bamboo blind (item 301) is outside the batch, with the shoji: it's let down and rolled up (item 338)) */}
    </group>
  )
}
