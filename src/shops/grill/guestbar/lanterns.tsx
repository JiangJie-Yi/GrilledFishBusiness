import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { NO_RAY } from '@/scene/pickable'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { mergeByMaterial } from '@/scene/StaticBatch'
import { unlitShade } from '@/game/roomLights'
import { brushText, signTexture } from '@/scene/signFont'
import { inkModel } from '@/scene/inkHull'
import { getLights } from '@/scene/lightsStore'
import { tick } from '@/scene/speed'
import { panelTex } from './decorTex'

/** the big red lantern under the eave: hung in the doorway's middle, out in front of the noren, from the eave's boards (its cord's top: the
 * eave's underside there, blender/facade.py's `under`) */
// (7 mm lower (item 440): its top's rim, as it sways, kept under the eave's boards; tests/e2e/_bighang440.mjs)
export const BIG_HANG: [number, number] = [2.462, 0.64]
/** the big one's size against the door lanterns': fat and round, a little shorter */
const BIG_CHOCHIN: [number, number, number] = [1.8, 0.95, 1.8]

/** the noren (blender/genkan.py): its lacquered rod with brass caps, and three cloth panels in soft folds with their tabs over the rod, each painted
 * with its third of the shop's cloth and swung from its top edge */
/** a natural wood pole's grain: pale peeled cedar, long streaks along it and a knot here and there */
const POLE_WOOD = (() => {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = 256; c.height = 64
  const g = c.getContext('2d')!
  g.fillStyle = '#c99f6e'; g.fillRect(0, 0, 256, 64)
  let seed = 3
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  for (let k = 0; k < 70; k++) {
    const y = rnd() * 64
    g.strokeStyle = rnd() < 0.5 ? 'rgba(120,80,40,0.35)' : 'rgba(240,210,160,0.35)'
    g.lineWidth = 0.6 + rnd() * 1.4
    g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(80, y + rnd() * 4 - 2, 170, y + rnd() * 4 - 2, 256, y); g.stroke()
  }
  for (const x of [60, 190]) { g.fillStyle = 'rgba(100,60,30,0.6)'; g.beginPath(); g.ellipse(x, 30, 5, 3, 0, 0, Math.PI * 2); g.fill() }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
})()
export function NorenModel({ tex, panels, pole = 'lacquer' }: { tex: THREE.Texture | null; panels: React.MutableRefObject<(THREE.Mesh | null)[]>
  /** the rod: the old black lacquer with brass caps, or a plain pole of natural wood */
  pole?: 'lacquer' | 'wood' }) {
  const gltf = useGLTF(NOREN_URL) as unknown as { scene: THREE.Group }
  const model = useMemo(() => {
    const r = gltf.scene.clone(true)
    r.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const src = m.material as THREE.MeshStandardMaterial
      const k = /NorenPanel(\d)/.exec(m.name)
      if (k) {
        // (a cloth (item 559): its own uniforms, Entrance's frame loop driving them; never merged with the room, as it moves in its shader)
        if (!m.geometry.boundingBox) m.geometry.computeBoundingBox()
        const bb = m.geometry.boundingBox!
        const u: ClothUniforms = { uBend: { value: 0 }, uRip: { value: 0 }, uTime: { value: 0 }, uPhase: { value: +k[1] * 1.9 },
          uTop: { value: bb.max.y }, uLen: { value: Math.max(1e-3, bb.max.y - bb.min.y) },
          uFold: { value: 0 }, uFoldAt: { value: 0.35 }, uFoldX: { value: new THREE.Vector2(0, 1) }, uSwing: { value: 0 }, uSy: { value: 1 } }
        const mat = new THREE.MeshToonMaterial({ map: panelTex(tex, +k[1]), side: THREE.DoubleSide })
        mat.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, u); sh.vertexShader = clothVertex(sh.vertexShader) }
        mat.customProgramCacheKey = () => 'noren-cloth'
        // (faded as it hangs between the camera and what's looked at (OccluderFade), still the cloth)
        mat.userData.fadeKeepsShader = true
        m.material = mat
        m.userData.cloth = u
        m.userData.noWorld = true
        // (moved in its shader, out past its own bounds: never culled by them)
        m.frustumCulled = false
      } else if (pole === 'wood') m.material = new THREE.MeshToonMaterial({ color: '#ffffff', map: POLE_WOOD })
      else m.material = src.name === 'NorenBrass' ? new THREE.MeshStandardMaterial({ color: '#c9a04a', metalness: 1, roughness: 0.3 })
        : new THREE.MeshToonMaterial({ color: src.color.clone() })
    })
    return r
  }, [gltf, tex, pole])
  // (the panels handed over from the model as it's drawn, not as it's made: made twice in development (React's strict mode), the second copy
  // was the one handed over and the one drawn never swung (item 203))
  useLayoutEffect(() => {
    model.traverse((o) => { const k = /NorenPanel(\d)/.exec(o.name); if (k && (o as THREE.Mesh).isMesh) panels.current[+k[1]] = o as THREE.Mesh })
  }, [model, panels])
  return <primitive object={model} />
}


/** how near (the panel's own units, out from its face) someone walking through comes before they push it, and how far they push its hem (rad) */
export const NOREN_REACH = 0.5
export const NOREN_PUSH = 1.0
/** how far the cloth below the lintel folds out through the open way for one walking out, at the most (rad; item 559) */
export const NOREN_FOLD = 0.9
/** (item 559) one this near its line (out or in) is under it and has it, going or not; further off, only one going through the way in, at
 * this pace along it (a walk's 1.1 a second; one stood swaying, or walking along it, far under it) */
export const NOREN_UNDER = 0.12, NOREN_GOING = 0.15
/** the sliding door in its own frame (GenkanDoor's group), measured off genkandoor.glb (tests/e2e/_norenx559.mjs): its open way's sides once
 * open (the fixed leaf's edge, the wall's end; shut, the moving leaf's run (DOOR_RUN) back across it), the lintel's underside (the leaves'
 * tops), the leaves' inner faces' line (z, out toward the street) */
export const DOOR_GAP = { x: [-0.131, 0.429] as const, lintel: 1.975, leaves: 0.387 }
/** the street's air at the way in's noren, panel `i` (item 559): gusts that come and go (their swell slow), within them a flutter, each panel a
 * little behind the one before it; about -1 to 1 */
export const norenBreeze = (t: number, i: number) => {
  const tt = t - i * 0.35
  const swell = 0.55 + 0.45 * Math.sin(tt * 0.29 + 0.8) * Math.sin(tt * 0.47 + 2.1)
  return swell * (0.6 * Math.sin(tt * 1.13) + 0.3 * Math.sin(tt * 2.37 + 1.4) + 0.2 * Math.sin(tt * 3.9 + i))
}
/** a noren panel's cloth: how far its hem's bent out along its face (its own units), how much a ripple runs down it, the time, its own phase,
 * where it hangs from and how long it is */
export type ClothUniforms = { uBend: { value: number }; uRip: { value: number }; uTime: { value: number }; uPhase: { value: number }; uTop: { value: number }; uLen: { value: number }
  /** folded out below `uFoldAt` (0..1 down it) by this much (rad), across it from none at uFoldX.x to all of it at uFoldX.y (its own x) */
  uFold: { value: number }; uFoldAt: { value: number }; uFoldX: { value: THREE.Vector2 }
  /** swung whole about its rod (rad, its hem in a +); how much longer it's drawn than its depth (the world's measure it's turned in) */
  uSwing: { value: number }; uSy: { value: number } }
/** the cloth in a noren panel's shader (item 559): hung from its top (uTop), bent out along its face the further down it hangs (h^1.7: the
 * rod holds its top), a ripple running down it, its hem a little aside; below the fold's line turned out round it (over a fifth of its length,
 * as cloth goes round the lintel's edge, the rest straight on: lifted as it goes out); the whole swung about the rod. Turned in the world's
 * measure (its height drawn uSy times its depth), so it keeps its length; its normal leant by the slope it's bent to and turned with it, so the
 * light moves over its folds */
const clothVertex = (vs: string) => ['uniform float uBend, uRip, uTime, uPhase, uTop, uLen, uFold, uFoldAt, uSwing, uSy;', 'uniform vec2 uFoldX;', vs]
  .join(String.fromCharCode(10))
  .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
  float clothH = clamp((uTop - position.y) / uLen, 0.0, 1.0);
  float clothW = 6.2832 * (clothH * 1.2 - uTime * 0.8) + uPhase + position.x * 4.0;
  float clothF = uFold * clamp((position.x - uFoldX.x) / (uFoldX.y - uFoldX.x), 0.0, 1.0);
  float clothS = clothH - uFoldAt;
  {
    float dzdh = uBend * 1.7 * pow(max(clothH, 1e-3), 0.7) + uRip * (sin(clothW) + clothH * 7.5398 * cos(clothW));
    objectNormal = normalize(objectNormal + vec3(0.0, objectNormal.z * dzdh / uLen, 0.0));
    float th = uSwing - clothF * clamp(clothS / 0.2, 0.0, 1.0);
    float cth = cos(th), sth = sin(th);
    objectNormal = normalize(vec3(objectNormal.x, objectNormal.y * cth - uSy * objectNormal.z * sth, objectNormal.y * sth / uSy + objectNormal.z * cth));
  }`)
  .replace('#include <begin_vertex>', `#include <begin_vertex>
  {
    float cz = transformed.z + uBend * pow(clothH, 1.7) + uRip * clothH * sin(clothW);
    transformed.x += uBend * 0.1 * clothH * sin(uPhase + uTime * 0.7);
    float cy = (transformed.y - uTop) * uSy;
    if (clothS > 0.0 && abs(clothF) > 1e-4) {
      float r = min(clothS, 0.2), more = max(clothS - 0.2, 0.0), len = uLen * uSy;
      cz += len * (0.2 / clothF * (1.0 - cos(clothF * r / 0.2)) + more * sin(clothF));
      cy += len * (r - 0.2 / clothF * sin(clothF * r / 0.2) + more * (1.0 - cos(clothF)));
    }
    float cs = cos(uSwing), sn = sin(uSwing);
    transformed.y = uTop + (cy * cs - cz * sn) / uSy;
    transformed.z = cy * sn + cz * cs;
  }`)
export const NOREN_BIG = 1.3
export const NOREN_WIDE = 1.0
/** how long the noren's two cords are, from the beam down to its rod (the rod hung 0.18 higher than it was) */
export const NOREN_CORD = 0.18

/**
 * A long lantern's skin (長提灯), its picture once round it: the washi lit from inside, the bamboo ribs it's wound on painted in (each a fine
 * dark line, the paper between them bellying a little, lit at its crown), its ends darker under the caps; and down its front and again round
 * its back the words in big brushed characters. `red`: the red one, the shop's mark in black edged with gold (a white band near each end
 * was tried: the owner had it taken off); `cream`: the grill's, cream paper, 炭火 in black (the owner had its 焼 taken off: the red one
 * beside it says it) with a red band top and bottom.
 */
const chochinTexture = (mark: string, style: 'red' | 'cream' = 'red', wide = 1) => signTexture(512, 512, (g) => {
  const cream = style === 'cream'
  const grad = g.createLinearGradient(0, 0, 512, 0)
  // (brightest down the middle of each face, where the lamp's behind it)
  const [deep, mid] = cream ? ['#cbb894', '#fbf1d8'] : ['#8a1810', '#e8402e']
  for (const [k, c] of [[0, deep], [0.25, mid], [0.5, deep], [0.75, mid], [1, deep]] as [number, string][]) grad.addColorStop(k, c)
  g.fillStyle = grad
  g.fillRect(0, 0, 512, 512)
  // (the ribs: a fine dark line each, the paper just above and below it a shade darker, between them a soft light)
  const RIBS = 26
  for (let k = 0; k <= RIBS; k++) {
    const y = (k / RIBS) * 512
    const band = g.createLinearGradient(0, y - 512 / RIBS / 2, 0, y + 512 / RIBS / 2)
    band.addColorStop(0, 'rgba(255,240,210,0)')
    band.addColorStop(0.5, cream ? 'rgba(90,60,30,0.16)' : 'rgba(60,8,4,0.22)')
    band.addColorStop(1, 'rgba(255,240,210,0)')
    g.fillStyle = band
    g.fillRect(0, y - 512 / RIBS / 2, 512, 512 / RIBS)
    g.fillStyle = cream ? 'rgba(80,50,25,0.45)' : 'rgba(50,6,3,0.5)'
    g.fillRect(0, y - 0.9, 512, 1.8)
  }
  // (darker at the ends, under the caps)
  const ends = g.createLinearGradient(0, 0, 0, 512)
  ends.addColorStop(0, 'rgba(20,6,2,0.45)'); ends.addColorStop(0.1, 'rgba(20,6,2,0)'); ends.addColorStop(0.9, 'rgba(20,6,2,0)'); ends.addColorStop(1, 'rgba(20,6,2,0.45)')
  g.fillStyle = ends
  g.fillRect(0, 0, 512, 512)
  if (cream) {
    // (the grill's: a red band round it near each end)
    for (const y of [56, 440]) { g.fillStyle = '#b8261c'; g.fillRect(0, y, 512, 16) }
  }
  // (the words, down the front and again round the back)
  const chars = [...(cream ? '炭火' : mark)]
  const size = (chars.length === 1 ? 230 : chars.length === 2 ? 168 : 124) * (cream ? 0.82 : 1)
  const gap = chars.length === 1 ? 0 : size * 1.02
  // (on a lantern drawn wider round than tall (the big one, `wide`), each character narrowed by as much, to stand true on it)
  for (const u of [128, 384]) chars.forEach((ch, i) => {
    g.save()
    g.translate(u, 256 + (i - (chars.length - 1) / 2) * gap)
    g.scale(1 / wide, 1)
    brushText(g, ch, 0, 0, size, cream
      ? { fill: '#160a06', shadow: 'rgba(255,200,120,0.3)' }
      : { fill: '#160a06', edge: 'rgba(245,200,110,0.55)', shadow: 'rgba(255,170,90,0.35)' })
    g.restore()
  })
})
/**
 * A door lantern's paper (items 120, 125, the owner's, 2026-11-15): drawn as the room's own lamps are (lampShades): not shaded by the room's
 * lights (lit by them, put out it stood dark and heavily shadowed, the owner saw), its flame's light when lit, in `tint` (warm white for the
 * cream papers: "the 炭火 one a yellow-white light"); put out, the plain grey-white the room's lamps are by day, a dim grey by night
 * (game/roomLights' unlitShade, by the hour: the page's data-theme)
 */
const paperMat = (map: THREE.Texture | null, fin = false) => new THREE.MeshBasicMaterial({ map, toneMapped: false, side: fin ? THREE.DoubleSide : THREE.FrontSide,
  alphaTest: fin ? 0.5 : 0 })
const PAPER_OFF = new THREE.Color(), PAPER_ON = new THREE.Color()
/** a paper's colour, lit `k` of the way (0 out .. 1 lit), its flame `flame`, in `tint` */
export const paperColour = (m: THREE.MeshBasicMaterial, k: number, flame: number, tint: string) => {
  PAPER_OFF.set(unlitShade(typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark'))
  PAPER_ON.set(tint).multiplyScalar(flame)
  m.color.copy(PAPER_OFF).lerp(PAPER_ON, k)
}
/** how far apart the two lanterns by the doorway hang, the red and the grill's beside it (middle to middle) */
export const CHOCHIN_PAIR = 0.32  // (0.3: their paper just touched, clips.mjs)
/** how much further from the doorway the pair hangs than at first (item 415: the sliding door's two leaves reach right to the post; item 420:
 * 0.05, the red one's paper a centimetre over the leaves' south edge, into the south leaf's stile as it swayed toward the door, 51 frames of
 * 541 and 17 mm deep; tests/e2e/_chochin420.mjs) */
export const CHOCHIN_OFF = 0.08
const chochinGlow = (inner: string, mid: string, outer: string) => {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, inner)
  grad.addColorStop(0.35, mid)
  grad.addColorStop(1, outer)
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(c)
}
/** the red lantern's glow round it, and the cream (炭火) one's, yellow-white (item 120: it glowed the red one's red) */
const CHOCHIN_GLOW = chochinGlow('rgba(255,120,70,0.8)', 'rgba(255,80,40,0.3)', 'rgba(255,60,30,0)')
const CHOCHIN_GLOW_CREAM = chochinGlow('rgba(255,240,205,0.8)', 'rgba(255,222,160,0.3)', 'rgba(255,210,140,0)')
const CHOCHIN_URL = import.meta.env.BASE_URL + 'models/chochin.glb'
const NOREN_URL = import.meta.env.BASE_URL + 'models/noren.glb'
useGLTF.preload(CHOCHIN_URL)
useGLTF.preload(NOREN_URL)
/** the lanterns' caps (lacquer, by their colour) and their bands' and bail's gold: one material each for all of them (item 533) */
const CHOCHIN_PARTS = new Map<string, THREE.Material>()
const chochinPart = (src: THREE.MeshStandardMaterial) => {
  const key = src.name === 'ChochinGold' ? 'gold' : src.color.getHexString()
  let m = CHOCHIN_PARTS.get(key)
  if (!m) {
    m = key === 'gold' ? new THREE.MeshStandardMaterial({ color: '#d6a84a', metalness: 1, roughness: 0.3 }) : new THREE.MeshToonMaterial({ color: src.color.clone() })
    CHOCHIN_PARTS.set(key, m)
  }
  return m
}

/**
 * A red paper lantern (赤提灯) hung at the door on a little arm off a post, the shop's name on it, lit from inside:
 * it sways a touch and its glow breathes like the flame in it.
 */
export function Chochin({ mark, style = 'red', big = false }: { mark: string; style?: 'red' | 'cream'
  /** the big one under the eave (item 300): fat and round, BIG_CHOCHIN its size against these */
  big?: boolean }) {
  const tex = useMemo(() => chochinTexture(mark, style, big ? BIG_CHOCHIN[0] / BIG_CHOCHIN[1] : 1), [mark, style, big])
  const hang = useRef<THREE.Group>(null)
  // (blender/genkan.py's lantern: its paper lit from within and painted with the name, its caps lacquer, its bands and bail gold; its paper's
  // material handed back with it, the one that's drawn (kept aside in a ref while it was made, it was a copy made and thrown away by React's
  // second run in development: the lit or unlit paper was set on that, and the lanterns shone on with their switch off: the owner saw it))
  const gltf = useGLTF(CHOCHIN_URL) as unknown as { scene: THREE.Group }
  const { model, skin } = useMemo(() => {
    const r = gltf.scene.clone(true)
    let paper: THREE.MeshBasicMaterial | null = null
    r.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const src = m.material as THREE.MeshStandardMaterial
      if (src.name === 'ChochinPaper') {
        paper = paperMat(tex)
        m.material = paper
      } else m.material = chochinPart(src)
    })
    inkModel(r, (m) => /Band|Bail|Tassel/.test(m.name), { width: 0.0015, weld: true })
    // (item 533: its caps, its gold and its ink lines each drawn as one (its parts each had a material of their own: ten draws a lantern, six now))
    mergeByMaterial(r)
    return { model: r, skin: paper as THREE.MeshBasicMaterial | null }
  }, [gltf, tex])
  // (the merged shapes are its own: let go with it; the loaded model's are shared)
  useEffect(() => () => {
    const shared = new Set<THREE.BufferGeometry>()
    gltf.scene.traverse((o) => { if ((o as THREE.Mesh).isMesh) shared.add((o as THREE.Mesh).geometry) })
    model.traverse((o) => { const g = (o as THREE.Mesh).geometry; if ((o as THREE.Mesh).isMesh && !shared.has(g)) g.dispose() })
  }, [gltf, model])
  const halo = useRef<THREE.Sprite>(null)
  /** how lit it is (0 out .. 1 lit), going to its switch's way over some 0.4 s, as a flame's lit or put out */
  const lit = useRef(getLights().door ? 1 : 0)
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    // (lit, its glow breathing like the flame; out (the door lanterns' switch by the way in: thrown by the shop at its opening and its last
    // order, App), the paper as daylight or the dark finds it)
    lit.current += ((getLights().door ? 1 : 0) - lit.current) * Math.min(1, tick(dt) * 7)
    const k = lit.current, flame = 0.9 + 0.06 * Math.sin(t * 2.1) + 0.04 * Math.sin(t * 7.3 + 1.1)
    // (the big one, heavy, barely (item 440: swinging as the small ones do, its top's rim rose 1.6 cm into the eave at each end))
    if (hang.current) hang.current.rotation.z = Math.sin(t * 0.9) * (big ? 0.012 : 0.04)
    if (skin) paperColour(skin, k, flame, style === 'cream' ? '#fff1cc' : '#ffffff')
    if (halo.current) halo.current.material.opacity = k * (0.5 + (flame - 0.9) * 2)
  })
  return (
    <group>
      {/* hung straight from above on a long cord (no post) */}
      <group ref={hang} name="look-chochin" position={[-0.26, 2.25, 0]} scale={big ? BIG_CHOCHIN : 1}>
        <mesh position-y={-0.075}>
          <cylinderGeometry args={[0.003, 0.003, 0.15, 4]} />
          <meshBasicMaterial color="#1a0d08" />
        </mesh>
        {/* (the long lantern's middle: its cord, then half its height under it) */}
        <group position-y={-0.5}>
          <primitive object={model} />
          <sprite ref={halo} scale={[0.9, 1.25, 1]} raycast={NO_RAY}>
            <spriteMaterial map={style === 'cream' ? CHOCHIN_GLOW_CREAM : CHOCHIN_GLOW} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} opacity={0.5} />
          </sprite>
        </group>
      </group>
    </group>
  )
}

/** how far beyond the grill's lantern the fish lantern hangs, along the doorway's face; the cord from the beam to its ring */
export const FISH_LANTERN_OUT = 0.44
const FISH_LANTERN_CORD = 0.1
/** the arm it hangs from, out of the wall's end (its own frame's units, before its scale) */
const FISH_ARM = 0.42
const FISH_LANTERN_URL = import.meta.env.BASE_URL + 'models/fishlantern.glb'
useGLTF.preload(FISH_LANTERN_URL)
/** the fish's radius down its length (t 0 its head's top, 1 the root of its tail), as blender/fishlantern.py turns it: to paint its flowers
 * round wherever they are on it (the paper's u is the same width round its narrow tail as round its shoulders) */
const FISH_RT: [number, number][] = [[0, 0], [0.02, 0.026], [0.06, 0.047], [0.12, 0.063], [0.2, 0.076], [0.3, 0.085], [0.4, 0.086], [0.5, 0.081],
  [0.6, 0.072], [0.7, 0.059], [0.8, 0.044], [0.9, 0.031], [0.96, 0.026], [1, 0.024]]
const fishR = (t: number) => {
  for (let i = 1; i < FISH_RT.length; i++) if (t <= FISH_RT[i][0]) {
    const [t0, r0] = FISH_RT[i - 1], [t1, r1] = FISH_RT[i]
    return r0 + ((r1 - r0) * (t - t0)) / (t1 - t0)
  }
  return FISH_RT[FISH_RT.length - 1][1]
}
/** the fish lantern's pictures, painted once: the fish's indigo washi, lit from within (brightest down the middle of its front and back, darker
 * to its sides and ends, mottled as dyed paper is), printed with white blossoms of four and five petals, its eyes gold-ringed; its fins and
 * tail ribbed, indigo at the root going pale to a scalloped edge (cut out: alphaTest); the round lantern's washi with 焼魚 on it front and
 * back. u round the fish reads left to right from its front, 0.75 the middle of its front; v from its head down */
const FISH_LANTERN_TEX = (() => {
  if (typeof document === 'undefined') return null
  const W = 1024, H = 1024, L = 0.56
  // (a little seeded stream of numbers, the same fish every time)
  let n = 97
  const rnd = () => { n = (n * 16807) % 2147483647; return (n - 1) / 2147483646 }
  const body = document.createElement('canvas')
  body.width = W; body.height = H
  const g = body.getContext('2d')!
  const im = g.createImageData(W, H)
  const dark = [24, 38, 84], light = [96, 128, 196]
  for (let y = 0; y < H; y++) {
    const t = y / H, along = 0.5 + 0.5 * Math.sin(Math.PI * Math.min(1, t * 1.15))
    for (let x = 0; x < W; x++) {
      const u = x / W
      const face = Math.pow(Math.abs(Math.sin(2 * Math.PI * u)), 0.8)
      const mottle = 0.06 * Math.sin(u * 37 + t * 11) * Math.sin(u * 13 - t * 29) + 0.04 * Math.sin(u * 91 + t * 53)
      const k = Math.min(1, Math.max(0, 0.18 + 0.7 * face * along + mottle))
      const i = (y * W + x) * 4
      im.data[i] = dark[0] + (light[0] - dark[0]) * k
      im.data[i + 1] = dark[1] + (light[1] - dark[1]) * k
      im.data[i + 2] = dark[2] + (light[2] - dark[2]) * k
      im.data[i + 3] = 255
    }
  }
  g.putImageData(im, 0, 0)
  // (pixels to a metre round it at t, and down it)
  const across = (t: number) => W / (2 * Math.PI * Math.max(0.012, fishR(t)) * 0.914)
  const down = H / L
  const EYES: [number, number][] = [[1 - 35 / 360, 0.1], [1 - 145 / 360, 0.1]]
  /** a blossom (world radius `r` metres) at u, t: `petals` round petals, white, its heart a dot; drawn again across the seam if it runs over */
  const blossom = (u: number, t: number, r: number, petals: number, turn: number) => {
    for (const shift of [-W, 0, W]) {
      const x = u * W + shift, y = t * H
      const hs = across(t) * r, vs = down * r
      if (x + hs < 0 || x - hs > W) continue
      g.save()
      g.translate(x, y)
      g.scale(hs, vs)
      g.rotate(turn)
      g.fillStyle = '#f4f1e6'
      for (let k = 0; k < petals; k++) {
        const a = (k / petals) * Math.PI * 2
        g.beginPath(); g.ellipse(Math.cos(a) * 0.52, Math.sin(a) * 0.52, 0.48, 0.4, a, 0, Math.PI * 2); g.fill()
      }
      g.fillStyle = petals === 5 ? '#e8c46a' : '#26386f'
      g.beginPath(); g.arc(0, 0, 0.17, 0, Math.PI * 2); g.fill()
      g.restore()
    }
  }
  for (let k = 0, made = 0; k < 400 && made < 110; k++) {
    const u = rnd(), t = 0.03 + rnd() * 0.94, r = 0.009 + rnd() * 0.014
    // (none over its eyes)
    if (EYES.some(([eu, et]) => Math.hypot(Math.min(Math.abs(u - eu), 1 - Math.abs(u - eu)) * W / across(et), (t - et) * L) < 0.03 + r)) continue
    blossom(u, t, r, rnd() < 0.6 ? 5 : 4, rnd() * Math.PI)
    made++
  }
  // (its eyes: a gold ring round a black eye, a glint in it)
  for (const [u, t] of EYES) {
    const x = u * W, y = t * H, hs = across(t), vs = down
    g.save(); g.translate(x, y); g.scale(hs, vs)
    g.fillStyle = '#1a1410'; g.beginPath(); g.arc(0, 0, 0.0185, 0, Math.PI * 2); g.fill()
    g.fillStyle = '#e8b530'; g.beginPath(); g.arc(0, 0, 0.016, 0, Math.PI * 2); g.fill()
    g.fillStyle = '#120c08'; g.beginPath(); g.arc(0, 0, 0.0095, 0, Math.PI * 2); g.fill()
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(0.003, -0.003, 0.0028, 0, Math.PI * 2); g.fill()
    g.restore()
  }
  const bodyTex = new THREE.CanvasTexture(body)
  bodyTex.colorSpace = THREE.SRGBColorSpace
  bodyTex.wrapS = THREE.RepeatWrapping
  bodyTex.anisotropy = 4
  // (a fin: x from its root to its edge, y across it; seven ribs, the edge scalloped between them)
  const fin = document.createElement('canvas')
  fin.width = fin.height = 256
  const f = fin.getContext('2d')!
  const RIBS = 7, F = 256
  const edge = new Path2D()
  edge.moveTo(0, 0)
  edge.lineTo(F * 0.9, 0)
  for (let k = 0; k < RIBS; k++) {
    const y0 = (k / RIBS) * F, y1 = ((k + 1) / RIBS) * F, ym = (y0 + y1) / 2
    edge.quadraticCurveTo(F * 1.04, ym, F * 0.88, y1)
  }
  edge.lineTo(0, F)
  edge.closePath()
  const fill = f.createLinearGradient(0, 0, F, 0)
  fill.addColorStop(0, '#22336a'); fill.addColorStop(0.55, '#4d68ab'); fill.addColorStop(0.85, '#9fb2dc'); fill.addColorStop(1, '#e4e8f2')
  f.fillStyle = fill
  f.fill(edge)
  f.save()
  f.clip(edge)
  // (the ribs, pale, each with the dye pooled darker along its side)
  for (let k = 0; k < RIBS; k++) {
    const y = ((k + 0.5) / RIBS) * F
    f.strokeStyle = 'rgba(14,22,52,0.35)'; f.lineWidth = 5
    f.beginPath(); f.moveTo(0, y + 2); f.lineTo(F, y + 2); f.stroke()
    f.strokeStyle = '#eee9dc'; f.lineWidth = 2.4
    f.beginPath(); f.moveTo(0, y); f.lineTo(F, y); f.stroke()
  }
  // (a pale rim along its scalloped edge, and a few white spots)
  f.strokeStyle = 'rgba(240,238,230,0.9)'; f.lineWidth = 5
  f.stroke(edge)
  f.fillStyle = 'rgba(244,241,230,0.85)'
  for (let k = 0; k < 10; k++) { f.beginPath(); f.arc(F * (0.25 + rnd() * 0.5), F * rnd(), 3 + rnd() * 4, 0, Math.PI * 2); f.fill() }
  f.restore()
  const finTex = new THREE.CanvasTexture(fin)
  finTex.colorSpace = THREE.SRGBColorSpace
  return { bodyTex, finTex }
})()
/** the round lantern's paper: washi lit from within, ribbed, 焼魚 in black brush round it twice, a quarter round from the fish's front and
 * back (u reads left to right; its words at u 0 and 0.5, so with the fish's side to the street (the lantern turned a quarter) they face the
 * street too, the owner's; v from its top down). Its lettering drawn wider than tall: the paper's u is a longer way round its belly than its
 * v is up it */
const FISH_TOP_TEX = signTexture(1024, 256, (g) => {
  const W = 1024, H = 256
  const grad = g.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, '#c9b58e'); grad.addColorStop(0.3, '#f6ecd4'); grad.addColorStop(0.5, '#fff8e8'); grad.addColorStop(0.7, '#f6ecd4'); grad.addColorStop(1, '#c9b58e')
  g.fillStyle = grad
  g.fillRect(0, 0, W, H)
  for (let y = 4; y < H; y += 10.5) { g.fillStyle = 'rgba(120,90,50,0.22)'; g.fillRect(0, y, W, 1.6) }
  g.fillStyle = 'rgba(120,90,50,0.12)'
  for (let x = 0; x < W; x += 128) g.fillRect(x, 0, 1.5, H)
  // (the one at u 0 drawn at both edges, half of it each side of the seam)
  for (const cx of [W * 0.5, 0, W]) {
    g.save()
    g.translate(cx, H * 0.53)
    g.scale(1.36, 1)
    brushText(g, '焼', -54, 0, 104, { fill: '#140a06', shadow: 'rgba(255,200,120,0.3)' })
    brushText(g, '魚', 54, 0, 104, { fill: '#140a06', shadow: 'rgba(255,200,120,0.3)' })
    g.restore()
  }
})
/** a soft round glow, warm white, for round the lit papers */
const FISH_GLOW = (() => {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(255,236,200,0.7)'); grad.addColorStop(0.4, 'rgba(255,220,170,0.22)'); grad.addColorStop(1, 'rgba(255,210,160,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(c)
})()
/**
 * The fish lantern by the door (the owner's, after their photograph of one: blender/fishlantern.py): a round paper lantern with 焼魚 on it,
 * and under it on a short chain a fish lantern hung head up, its indigo washi printed with white blossoms, gold-ringed eyes, ribbed fins
 * spread out on either side and its tail fanned at the foot, lit from within. It hangs on a cord from the beam and sways a touch, the fish
 * on its chain a moment behind the lantern; its glow breathes like the flame in it.
 */
export function FishLantern() {
  const gltf = useGLTF(FISH_LANTERN_URL) as unknown as { scene: THREE.Group }
  const hang = useRef<THREE.Group>(null)
  const fishGlow = useRef<THREE.Sprite>(null)
  /** the pale glow under the fish (it was lit whatever the switch: the owner saw the fish shine on with the lanterns out) */
  const fishUnder = useRef<THREE.Sprite>(null)
  /** how lit it is (0 out .. 1 lit), going to its switch's way over some 0.4 s */
  const lit = useRef(getLights().door ? 1 : 0)
  const { model, fish, papers } = useMemo(() => {
    const r = gltf.scene.clone(true)
    const papers: THREE.MeshBasicMaterial[] = []
    const lit = (map: THREE.Texture | null, fin = false) => {
      const m = paperMat(map, fin)
      papers.push(m)
      return m
    }
    r.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const name = (m.material as THREE.Material).name
      m.material = name === 'FishLanternTopPaper' ? lit(FISH_TOP_TEX)
        : name === 'FishLanternPaper' ? lit(FISH_LANTERN_TEX?.bodyTex ?? null)
          : name === 'FishLanternFinPaper' ? lit(FISH_LANTERN_TEX?.finTex ?? null, true)
            : name === 'FishLanternIron' ? new THREE.MeshToonMaterial({ color: '#2a2622' })
              : new THREE.MeshToonMaterial({ color: '#16110e' })
      m.castShadow = false
    })
    inkModel(r, (m) => /Fins|Chain/.test(m.name), { width: 0.0015, weld: true })
    // (the fish and its fins on a pivot at its head, where the chain holds it, to swing a little after the lantern)
    const body = r.getObjectByName('FishLanternBody') as THREE.Mesh | undefined
    const fins = r.getObjectByName('FishLanternFins')
    const fish = new THREE.Group()
    if (body && fins) {
      body.geometry.computeBoundingBox()
      const head = body.geometry.boundingBox!.max.y
      fish.position.y = head
      const holder = body.parent ?? r
      holder.add(fish)
      for (const o of [body, fins]) { fish.add(o); o.position.y -= head }
    }
    // (item 533: what doesn't swing on its own (the round lantern's paper, its caps) with their ink lines as one; the fish kept as it is)
    mergeByMaterial(r, (o) => o === fish)
    return { model: r, fish, papers }
  }, [gltf])
  useEffect(() => () => { for (const m of papers) m.dispose() }, [papers])
  // (the merged shapes are its own: let go with it; the loaded model's are shared)
  useEffect(() => () => {
    const shared = new Set<THREE.BufferGeometry>()
    gltf.scene.traverse((o) => { if ((o as THREE.Mesh).isMesh) shared.add((o as THREE.Mesh).geometry) })
    model.traverse((o) => { const g = (o as THREE.Mesh).geometry; if ((o as THREE.Mesh).isMesh && !shared.has(g)) g.dispose() })
  }, [gltf, model])
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    lit.current += ((getLights().door ? 1 : 0) - lit.current) * Math.min(1, tick(dt) * 7)
    const k = lit.current, flame = 0.92 + 0.05 * Math.sin(t * 2.3) + 0.03 * Math.sin(t * 6.1 + 0.7)
    for (const m of papers) paperColour(m, k, flame, '#fff4dc')
    if (fishGlow.current) fishGlow.current.material.opacity = 0.55 * k
    if (fishUnder.current) fishUnder.current.material.opacity = 0.35 * k
    if (hang.current) { hang.current.rotation.z = Math.sin(t * 0.8) * 0.025; hang.current.rotation.x = Math.sin(t * 0.55 + 1) * 0.015 }
    fish.rotation.z = Math.sin(t * 0.8 - 0.7) * 0.045
  })
  return (
    <group>
      {/* (hung from the end of a wooden arm out of the wall's end beside the doorway, square to the street: there's no eave out there) */}
      <mesh position={[-FISH_ARM / 2 + 0.03, 0.03, 0]}>
        <boxGeometry args={[FISH_ARM, 0.045, 0.05]} />
        <meshToonMaterial color="#3a2416" />
      </mesh>
      <mesh position={[0, 0.006, 0]} rotation-y={Math.PI / 2}><torusGeometry args={[0.012, 0.0028, 5, 10]} /><meshToonMaterial color="#2a2622" /></mesh>
      <mesh position-y={-FISH_LANTERN_CORD / 2}>
        <cylinderGeometry args={[0.003, 0.003, FISH_LANTERN_CORD, 4]} />
        <meshBasicMaterial color="#1a0d08" />
      </mesh>
      <group ref={hang} position-y={-FISH_LANTERN_CORD}>
        <primitive object={model} />
        <sprite ref={fishGlow} position-y={-0.16} scale={[0.62, 0.55, 1]} raycast={NO_RAY}>
          <spriteMaterial map={FISH_GLOW} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} opacity={0.55} />
        </sprite>
        <sprite ref={fishUnder} position-y={-0.68} scale={[0.5, 0.95, 1]} raycast={NO_RAY}>
          <spriteMaterial map={FISH_GLOW} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} opacity={0.35} color="#bcd0ff" />
        </sprite>
      </group>
    </group>
  )
}
