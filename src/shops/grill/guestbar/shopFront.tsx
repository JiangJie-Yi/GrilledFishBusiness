import { memo, useEffect, useMemo, useRef } from 'react'
import { getClock } from '@/ui/kit/clockStore'
import { heard } from '@/scene/interact/sfx'
import { glowLeave, glowOnly } from '@/scene/interact/hoverGlow'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { StaticBatch } from '@/scene/render/StaticBatch'
import { DOOR_OPEN_S, DOOR_SHUT_S, doorClicked, doorShown, doorShut, doorStep, doorWantOpen, type DoorState, type DoorWalker } from '@/game/world/slideDoor'
import { inkModel } from '@/scene/render/inkHull'
import { aimTip, setTip } from '@/scene/interact/hoverTip'
import { getLights } from '@/scene/render/lightsStore'
import { getEdit } from '@/shops/grill/edit'
import { slideDoorSound } from '@/shops/grill/sounds/restroomSound'
import { businessDay, rainAt, weatherOf } from '@/game/world/weather'
import { FIGURES, CARRIED, DOOR_LANE } from '@/shops/grill/bar'
import { tick } from '@/scene/kit/speed'
import { paperColour } from './lanterns'

/**
 * The shop's front over the way in (item 300, the owner's, 2026-11-17: 「玄關門的門改成，這樣。」「指屋頂」, after a picture of an izakaya's
 * front: a wooden eave over its door, a big red lantern hung under it in the middle, lit menu boards either side, wooden lattice). The
 * model (blender/facade.py, in the doorway's own frame): the head beam over the doorway on a post (the noren's rod just under it); the eave
 * low over it, tiled, its eave-end tiles along its edge, its rafters out from the wall, a strip of lattice along the wall under it; the band
 * on the wall over the eave (over it and not under it, as the picture's are: this camera never looks up, and from over it an eave hides
 * what's under it), from one end of the eave to the other, its middle bay lattice, and either side of it two rows of little lanterns (item
 * 349, the owner's 「有缺口、牌子換成一排排的燈籠」: they were the menu's boards, and the band stopped short of the eave's end); the bar the red
 * and the grill's lanterns hang from. The lanterns' paper lit here with the door lanterns (the door's switch: no light of their own (rule 6)).
 */
const FACADE_URL = import.meta.env.BASE_URL + 'models/facade.glb'
useGLTF.preload(FACADE_URL)
/** the band's little lanterns' paper (item 349, the owner's 「牌子換成一排排的燈籠」: the menu's boards gone for two rows of them): lit with
 * the door lanterns (their switch, their breath), no light of its own (rule 6); made at load, its colour all that changes */
const LANTERN_PAPER = new THREE.MeshBasicMaterial({ toneMapped: false })
/** (item 385, the owner's 「燈籠要有些黃光」) the warm light the band's lanterns throw on the dark board behind them: a soft yellow halo round
 * each (blender/facade.py's FacadeLanternGlow), laid on as light (added, not painted over), as strong as they're lit */
const LANTERN_GLOW = new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0,
  side: THREE.DoubleSide })
function FacadeModel() {
  const gltf = useGLTF(FACADE_URL) as unknown as { scene: THREE.Group }
  const obj = useMemo(() => {
    const r = gltf.scene.clone(true)
    const made = new Map<THREE.Material, THREE.Material>()
    const toon = (src0: THREE.Material) => {
      const src = src0 as THREE.MeshStandardMaterial
      let t = made.get(src)
      if (!t) {
        // (the lattice's gaps cut out (tested, not blended), seen from either side, as the other lattices are)
        // (the lanterns' paper lit as the door's lanterns are (item 349); the tiles' painted relief given its normal map too (item 357))
        if (/LanternPaper/.test(src.name)) {
          LANTERN_PAPER.map = src.map ?? null
          LANTERN_PAPER.needsUpdate = true
          t = LANTERN_PAPER
        } else if (/LanternGlow/.test(src.name)) {
          LANTERN_GLOW.map = src.map ?? null
          LANTERN_GLOW.needsUpdate = true
          t = LANTERN_GLOW
        } else t = /Lattice/.test(src.name) ? new THREE.MeshToonMaterial({ color: '#ffffff', map: src.map ?? null, alphaTest: 0.5, side: THREE.DoubleSide })
          : new THREE.MeshToonMaterial({ color: src.map ? '#ffffff' : src.color.clone(), map: src.map ?? null, normalMap: src.normalMap ?? null })
        t.name = src.name
        made.set(src, t)
      }
      return t
    }
    r.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.material = Array.isArray(m.material) ? m.material.map(toon) : toon(m.material)
      // (the eave throws its shadow down on the step; the rest, under it, none)
      m.castShadow = /Roof/.test(m.name)
      m.receiveShadow = !/Roof|EaveTiles|Glow/.test(m.name)
    })
    inkModel(r, (m) => !/Lattice|EaveTiles|Roof|Glow/.test(m.name), { width: 0.002, weld: true })
    return r
  }, [gltf])
  return <primitive object={obj} />
}
function ShopFrontImpl() {
  const lit = useRef(getLights().door ? 1 : 0)
  useFrame(({ clock }, dt) => {
    // (the band's lanterns lit with the door lanterns, their switch's way over some 0.4 s; their light breathing a little as theirs does)
    // (item 385, the owner's 「燈籠要有些黃光」: lit, their paper a warm candle yellow (it was white, '#fff3dc': red and white, nothing of a
    // flame in it), and their halos on the board behind them as bright as they're lit)
    lit.current += ((getLights().door ? 1 : 0) - lit.current) * Math.min(1, tick(dt) * 7)
    const flame = 0.95 + 0.03 * Math.sin(clock.elapsedTime * 1.9)
    paperColour(LANTERN_PAPER, lit.current, flame, '#ffd88a')
    LANTERN_GLOW.opacity = 0.95 * lit.current * flame
  })
  return <StaticBatch><FacadeModel /></StaticBatch>
}
export const ShopFront = memo(ShopFrontImpl)

/**
 * What's seen out through the doorway (item 306, the owner's: 「光照跟陰影感還不行，尤其是白天，不太真實」: the open doorway showed the dark
 * behind the shop, black under the noren at noon): the street's light out there, a card past the doorway facing in (from outside it isn't
 * there), pale sky over it and the street's warm stone under; and the day spilling in on the genkan's stones, brightest at the sill. Both
 * by the part of the day: bright by day, amber at dusk, rose at dawn, the night's dark blue (the street's own lanterns are the door's).
 * The spill reaches out over the sill and comes in softly at its edge (item 448, the owner's 「還是有一些奇怪的陰影要處理」: it stopped 10 cm
 * short of the door at its brightest, the stones along the door left out of it, a dark band there like a shadow), and it's as the door
 * is: faint through the frosted glass shut, all of it once the doorway's open
 */
const DOOR_LIGHT = (() => {
  if (typeof document === 'undefined') return { spill: null }
  const tex = (c: HTMLCanvasElement) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t }
  // (no street out there (item 397, the owner's 「戶外景拿掉好了」): it was StreetOutside's, with depth (item 386), a card before (item 360))
  const s = document.createElement('canvas')
  s.width = 64; s.height = 128
  const h = s.getContext('2d')!
  // (brightest at the sill (the picture's foot: laid flat it's toward the doorway), fading in over the stones; soft at either side; its
  // very edge (the last few rows, out past the sill's outer edge) easing in, not a cut)
  for (let y = 0; y < 128; y++) {
    const k = Math.pow(y / 127, 1.6) * Math.min(1, 0.55 + 0.45 * (127 - y) / 6)
    const row = h.createLinearGradient(0, 0, 64, 0)
    row.addColorStop(0, 'rgba(255,255,255,0)'); row.addColorStop(0.18, `rgba(255,255,255,${k})`); row.addColorStop(0.82, `rgba(255,255,255,${k})`)
    row.addColorStop(1, 'rgba(255,255,255,0)')
    h.fillStyle = row; h.fillRect(0, y, 64, 1)
  }
  return { spill: tex(s) }
})()
export const DOOR_SPILL = new THREE.MeshBasicMaterial({ map: DOOR_LIGHT.spill, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })
/** the day's spill on the stones: how far in from the noren's line it reaches, and how far out past it (to the sill's outer edge, measured:
 * the stones run to 0.371 past it in the doorway's frame, the sill 0.384..0.459, the line 0.27) */
export const SPILL_IN = 1.2, SPILL_OUT = 0.19
/** how open the way in is (0 shut, 1 its leaves run open: GenkanDoor's), for the day's spill through it */
export const DOOR_OPEN = { k: 0 }
/** the spill's strength for the part of the day, the door shut letting through this much of it (its frosted glass) */
let doorSpillBase = 0
const DOOR_SHUT_LIGHT = 0.45
/** the street's light and the spill on the stones, by the part of the day (the page's data-sky): colour, and the spill's strength */
const DOOR_LOOKS: Record<string, [string, string, number]> = {
  day: ['#ffffff', '#fff0d6', 0.34], dawn: ['#ffffff', '#ffd6c8', 0.16], dusk: ['#ffffff', '#ffb46e', 0.3], night: ['#ffffff', '#8fa6d8', 0.07],
}
let doorSky = ''
const DOOR_SKY_TINT = new THREE.Color(), DOOR_RAIN_TINT = new THREE.Color('#9fb0c4')
/** how hard it's raining (item 623, game/weather), eased: the light through the way in greyer and less of it, the rain heard */
export const RAIN_NOW = { k: 0 }
export function doorLight(dt = 0) {
  const s = typeof document === 'undefined' ? 'day' : document.documentElement.dataset.sky ?? 'day'
  if (s !== doorSky) {
    doorSky = s
    const [, sc, so] = DOOR_LOOKS[s] ?? DOOR_LOOKS.day
    DOOR_SKY_TINT.set(sc)
    doorSpillBase = so
  }
  const c = getClock()
  RAIN_NOW.k += (rainAt(weatherOf(businessDay(c.day, c.minute)), c.minute) - RAIN_NOW.k) * Math.min(1, dt * 1.5)
  DOOR_SPILL.color.copy(DOOR_SKY_TINT).lerp(DOOR_RAIN_TINT, 0.6 * RAIN_NOW.k)
  DOOR_SPILL.opacity = doorSpillBase * (1 - 0.45 * RAIN_NOW.k) * (DOOR_SHUT_LIGHT + (1 - DOOR_SHUT_LIGHT) * DOOR_OPEN.k)
}

/**
 * The sliding door at the way in (item 410, the owner's 「玄關試著做和式拉門」「客人進來的時候會先開拉門再脫鞋」): blender/genkandoor.py's three
 * leaves of dark wood and frosted glass on the stone sill, in the doorway's own frame (this group's); the middle and the north ones slid south
 * over the south one when someone wants through (game/slideDoor: one out on the step, one walking out toward it, one just put in at it),
 * shut once no one does. Whoever's going through is kept to its open way where they're drawn (as the hearth's guard keeps them off the fire,
 * after every walk's frame and before it's drawn), so none walks through a leaf's edge. The glass seen through a little, from either side;
 * a wooden rumble as it runs, a knock as it shuts.
 */
const DOOR_URL = import.meta.env.BASE_URL + 'models/genkandoor.glb'
useGLTF.preload(DOOR_URL)
/** frosted glass: a pale grey-blue, seen through a little (the noren and the night behind it), from either side; no transmission (rule 5) */
const DOOR_GLASS = new THREE.MeshToonMaterial({ color: '#e4e9ec', transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false })
/** how far the moving leaf runs open (x): the north one over the south one, to the post (item 415: two leaves, the owner's 「拉門我要兩節」;
 * item 410's three ran -0.34 and -0.675) */
export const DOOR_RUN: Record<string, number> = { GenkanDoorN: -0.56 }
/** the open way's sides (x) for the middle of one going through: the way's 0.56 open (the stacked leaves' edge -0.131 to the wall's end
 * 0.429), a customer about 0.6 across at the leaves' line (0.3 either side, tests/e2e/_doorwidth415.mjs): kept to its middle, as they were
 * kept 2 cm off the wall before; and how far in and out of the leaves' line they're kept to it, full within its middle (two come together,
 * stood side by side out on the step (the crowd's stepping aside), go through it one after the other) */
const DOOR_WAY = { x: [0.144, 0.154] as const, z: [0.08, 0.78] as const, ease: 0.2 }
/** what the door's called by the pointer, and what a click does now */
const DOOR_TIP = '玄關拉門'
const doorHint = (open: boolean) => (open ? '點一下關上（客人進出時照樣自己開關）' : '點一下拉開，一直開著')
export const DOOR_INV = new THREE.Matrix4(), DOOR_P = new THREE.Vector3(), DOOR_W = new THREE.Vector3(), DOOR_SHIFT = new THREE.Vector3(), DOOR_HELD = new THREE.Vector3()
function GenkanDoorImpl() {
  const gltf = useGLTF(DOOR_URL) as unknown as { scene: THREE.Group }
  const ref = useRef<THREE.Group>(null)
  const scene = useThree((s) => s.scene)
  const { obj, moving, leaves } = useMemo(() => {
    const r = gltf.scene.clone(true)
    const wood = new Map<THREE.Material, THREE.Material>()
    r.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const src = m.material as THREE.MeshStandardMaterial
      if (/Glass/.test(src.name)) { m.material = DOOR_GLASS; m.renderOrder = 2 }
      else {
        let t = wood.get(src)
        // (the wood its picture; the pulls their own dark bronze, no picture; the carvings (item 421) their relief in their normal maps, the
        // transom's lattice and the corners' brass cut out by their pictures, seen from both sides)
        if (!t) {
          const cut = /Kumiko|Brass/.test(src.name)
          const toon = new THREE.MeshToonMaterial({ color: src.map ? '#ffffff' : src.color, map: src.map ?? null, normalMap: src.normalMap ?? null,
            ...(cut ? { alphaTest: 0.5, side: THREE.DoubleSide } : {}) })
          if (src.normalMap) toon.normalScale.copy(src.normalScale)
          toon.name = src.name
          wood.set(src, (t = toon))
        }
        m.material = t
      }
      m.castShadow = false
      m.receiveShadow = true
    })
    // (no ink line round the glass, nor round the flat faces of the lattice, the brass and the lintel's band: round their squares, not their shapes)
    inkModel(r, (m) => m.material === DOOR_GLASS || /Kumiko|Brass|Band/.test((m.material as THREE.Material).name), { width: 0.0015, weld: true })
    // (the two leaves together under one group of their own, to light up under the pointer, the frame over them not)
    const leaves = new THREE.Group()
    leaves.name = 'GenkanDoorLeaves'
    const s0 = r.getObjectByName('GenkanDoorS')
    s0?.parent?.add(leaves)
    for (const n of ['GenkanDoorS', 'GenkanDoorN']) { const o = r.getObjectByName(n); if (o) leaves.add(o) }
    const moving = Object.entries(DOOR_RUN).flatMap(([n, run]) => { const o = r.getObjectByName(n); return o ? [{ o, run, x0: o.position.x }] : [] })
    return { obj: r, moving, leaves }
  }, [gltf])
  const st = useRef<DoorState>(doorShut())
  const wanted = useRef(false)
  /** held open by the player (clicked open: it stays open till it's clicked again; item 415, the owner's 「我也可以互動」) */
  const held = useRef(false)
  /** the game's own time (its frames' deltas, at the game's pace: x2, paused), for how long each one's been seen */
  const clock = useRef(0)
  /** each one about, where they were last (the doorway's frame), when, and since when they've been seen; and each frame's list of them for
   * game/slideDoor, its entries kept from frame to frame (nothing made each frame: it runs before every frame's drawing) */
  const seen = useMemo(() => new Map<THREE.Object3D, { z: number; t: number; since: number }>(), [])
  const walkers = useMemo(() => ({ list: [] as DoorWalker[], pool: [] as DoorWalker[] }), [])
  useEffect(() => {
    const was = scene.onBeforeRender
    // (each figure in turn by the map's own forEach, and the same function each frame: its for-of made a pair for each one (item 374))
    let g: THREE.Group | null = null, now = 0
    const ws = walkers.list
    const pass = (_role: unknown, o: THREE.Object3D) => {
      if (!o.parent || !o.visible || !g) return
      o.getWorldPosition(DOOR_W)
      DOOR_P.copy(DOOR_W).applyMatrix4(DOOR_INV)
      let was1 = seen.get(o)
      if (!was1) { was1 = { z: DOOR_P.z, t: now, since: now }; seen.set(o, was1) }
      const dz = now > was1.t ? (DOOR_P.z - was1.z) / (now - was1.t) : 0
      const age = now - was1.since
      if (now > was1.t) { was1.z = DOOR_P.z; was1.t = now }
      const wk = walkers.pool[ws.length] ?? (walkers.pool[ws.length] = { x: 0, z: 0, dz: 0, age: 0 })
      wk.x = DOOR_P.x; wk.z = DOOR_P.z; wk.dz = dz; wk.age = age
      ws.push(wk)
      // (going through: kept to its open way, eased in and out of it either side of the leaves' line; only where they're drawn)
      const z0 = DOOR_WAY.z[0], z1 = DOOR_WAY.z[1]
      if (DOOR_P.z <= z0 || DOOR_P.z >= z1 || DOOR_P.x < -0.75 || DOOR_P.x > 0.6) return
      const w = Math.min(1, (DOOR_P.z - z0) / DOOR_WAY.ease, (z1 - DOOR_P.z) / DOOR_WAY.ease)
      const to = Math.min(DOOR_WAY.x[1], Math.max(DOOR_WAY.x[0], DOOR_P.x))
      const nx = DOOR_P.x + (to - DOOR_P.x) * w
      if (Math.abs(nx - DOOR_P.x) < 1e-4) return
      DOOR_P.x = nx
      DOOR_P.applyMatrix4(g.matrixWorld)
      DOOR_SHIFT.subVectors(DOOR_P, DOOR_W)
      o.parent.worldToLocal(DOOR_P)
      o.position.copy(DOOR_P)
      o.updateMatrixWorld(true)
      const held = CARRIED.get(o)
      if (held) for (const c of held) {
        if (!c.parent || !c.visible) continue
        c.getWorldPosition(DOOR_HELD).add(DOOR_SHIFT)
        c.parent.worldToLocal(DOOR_HELD)
        c.position.copy(DOOR_HELD)
        c.updateMatrixWorld(true)
      }
    }
    // (those gone: forgotten, so one put in again is new)
    const forget = (_v: unknown, o: THREE.Object3D) => { if (!FIGURES.has(o) || !o.visible) seen.delete(o) }
    scene.onBeforeRender = function (...args) {
      was.apply(this, args)
      g = ref.current
      if (!g) return
      g.updateWorldMatrix(true, false)
      DOOR_INV.copy(g.matrixWorld).invert()
      now = clock.current
      ws.length = 0
      FIGURES.forEach(pass)
      seen.forEach(forget)
      wanted.current = doorWantOpen(ws, held.current)
    }
    return () => { scene.onBeforeRender = was }
  }, [scene, seen, walkers])
  const soundAt = useMemo(() => new THREE.Vector3(), [])
  useFrame((_, dt0) => {
    clock.current += Math.min(dt0, 0.1)
    const was = st.current, now = doorStep(was, wanted.current, Math.min(dt0, 0.1))
    st.current = now
    const k = doorShown(now.k, now.opening)
    DOOR_OPEN.k = k
    for (const m of moving) m.o.position.x = m.x0 + m.run * k
    // (a rumble as it starts to run either way, its knock home at the end of it shutting)
    // (the shop's sliding doors' own sound (restroomSound's), as loud as it's near, as long as it runs)
    if (now.opening !== was.opening && ref.current) slideDoorSound(now.opening, heard(ref.current.localToWorld(soundAt.set(DOOR_LANE.x, 1.0, DOOR_LANE.line))).near, now.opening ? DOOR_OPEN_S : DOOR_SHUT_S)
  })
  // (the player's: pointed at, its leaves light up and the pointer's a hand, its tag says what a click does; clicked, it's slid open and kept
  // open, or let go (doorClicked); in edit mode nothing: the piece is picked as any other)
  return (
    <group ref={ref}>
      <primitive object={obj}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          if (getEdit().on) return
          e.stopPropagation()
          document.body.style.cursor = 'pointer'
          glowOnly(leaves)
          aimTip(e)
          setTip({ title: DOOR_TIP, hint: doorHint(st.current.opening) })
        }}
        onPointerOut={() => { glowLeave(leaves); document.body.style.cursor = ''; setTip(null) }}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          if (getEdit().on) return
          e.stopPropagation()
          held.current = doorClicked(st.current)
          setTip({ title: DOOR_TIP, hint: doorHint(held.current) })
        }} />
    </group>
  )
}
export const GenkanDoor = memo(GenkanDoorImpl)
