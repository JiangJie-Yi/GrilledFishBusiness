import { memo, useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { IDLE_RELEASED, idleRelease } from './gpuSweep'
import { PRE_UPLOADED, preUpload } from './preUpload'
import { paceFirstDraws } from './firstDraws'
import { QUALITY } from './quality'
import type * as THREE from 'three'
import { holdVeil, laterPending, laterSeen, sceneDrawn } from './Later'

/**
 * Shader programs linked while the page loads, not the first time each thing is drawn. A dish's food (once it's ordered), the first
 * customer, the coins in the drawer, the coal in the fire: each, the first time it showed, stopped the picture for a tenth of a second to
 * over half a second while its program was linked (ANGLE turns each into Direct3D's on the spot). Once the whole shop is in (every stage
 * mounted, the scene drawn), every material in it, the hidden ones too, is compiled, and so is each template warmLater() was given (what
 * things made only later are copied from); the loading veil waits till they're ready. The programs are kept as long as their materials
 * are: the ones the later things use.
 */
const later = new Set<THREE.Object3D>()
/** once the page's compiling is done: compiles what's given it straight away (a template that came after) */
let warmNow: ((o: THREE.Object3D) => void) | null = null
/** (item 652, the Optimization window's) whether the warming's done (its programs, its shadows; the loading's veil let go), and those
 * waiting for it: work of their own that's not to be laid over the loading's paced first frames */
const WARMED = { done: false, waiting: new Set<() => void>() }
/** `f` once the warming's done (at once if it is); what it gives back calls it off */
export function whenWarm(f: () => void): () => void {
  if (WARMED.done) { f(); return () => {} }
  WARMED.waiting.add(f)
  return () => { WARMED.waiting.delete(f) }
}
/** a template of things made only later (copies of it, on its materials), to compile with the scene while the page loads */
export function warmLater(o: THREE.Object3D) {
  if (warmNow) warmNow(o)
  else later.add(o)
}

/** a material whose customProgramCacheKey isn't a function (given a string, or not a material at all) stops three's compile with
 * "material.customProgramCacheKey is not a function": compile goes through the hidden meshes too, so one there held the loading veil
 * for good. Such a one is put back to three's own key (or none) and named in the console, so where it was set can be found. */
function mendKeys(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.material) return
    for (const x of ([] as THREE.Material[]).concat(m.material)) {
      if (!x || typeof x.customProgramCacheKey === 'function') continue
      console.warn(`[prewarm] ${o.name || o.type}: material "${x.name}" (${x.type}) had a customProgramCacheKey that isn't a function:`, x.customProgramCacheKey)
      delete (x as { customProgramCacheKey?: unknown }).customProgramCacheKey
      if (typeof x.customProgramCacheKey !== 'function') x.customProgramCacheKey = () => ''
    }
  })
}

/** compiles what it's given, a throw (a material three can't take) caught here: it mustn't keep the veil down */
function compileSafe(gl: THREE.WebGLRenderer, o: THREE.Object3D, camera: THREE.Camera, scene?: THREE.Scene) {
  try {
    mendKeys(o)
    return gl.compileAsync(o, camera, scene ?? null).catch((e) => { console.error('[prewarm]', e) })
  } catch (e) {
    console.error('[prewarm]', e)
    return Promise.resolve()
  }
}

/**
 * Every program the renderer has linked kept for good (item 565: the slowdowns past midnight): three lets a program go the moment the last
 * material drawn with it is disposed (a customer gone, the coal bed made again, a piece's copy let go), and the next thing drawn with the
 * same settings links it again, a stop of a tenth to a quarter of a second (the menu's tags 180 ms, the coal 130, the freezer's goods
 * 260, measured past midnight with the clock moved on: the programs 65, then 63 as two were let go, then 66 as they were made again). A
 * program's taken once more as it's seen, so it's never at nought; there are some seventy of them, a few kilobytes of the GPU's each.
 */
function keepPrograms(gl: THREE.WebGLRenderer) {
  const kept = new WeakSet<object>()
  const keep = () => {
    for (const p of (gl.info.programs ?? []) as unknown as ({ usedTimes: number } & object)[]) {
      if (kept.has(p)) continue
      kept.add(p)
      p.usedTimes++
    }
  }
  keep()
  const t = window.setInterval(keep, 500)
  return () => window.clearInterval(t)
}

/**
 * The shadows' programs for a figure bent by bones and for a mesh drawn as instances made now, with the room's lights all in (item 589,
 * fixed rule 7): each is made only as the first such thing is drawn into the shadows' picture, and three makes a program apart for every
 * count of lights, so one made in the first frames (StaffWarm, the lights not all in yet) wasn't the one needed: the Tester's count found a
 * shadow program made two to three minutes into business, once a skinned body, once an instanced mesh (a customer, the seats' bowls…).
 * Every one of them in view made to cast a shadow, wherever the shadows' camera looks, for a few frames under the loading veil (three
 * shadow pictures: ShadowPacer draws one every third frame; the first with three's own depth material, then each kind's own,
 * materialNormalize's OWN_DEPTH), then as they were.
 */
function warmShadows(scene: THREE.Object3D): Promise<void> {
  const was: [THREE.Object3D, boolean, boolean][] = []
  scene.traverseVisible((o) => {
    if (!(o as THREE.SkinnedMesh).isSkinnedMesh && !(o as THREE.InstancedMesh).isInstancedMesh) return
    was.push([o, o.castShadow, o.frustumCulled])
    o.castShadow = true
    o.frustumCulled = false
  })
  return new Promise((done) => {
    let n = 0
    const f = () => {
      if (++n < 12) { requestAnimationFrame(f); return }
      for (const [o, cast, culled] of was) { o.castShadow = cast; o.frustumCulled = culled }
      done()
    }
    requestAnimationFrame(f)
  })
}

// (item 374: drawn again only as its own props change: it does its work in its frames and effects, and was drawn again with every redraw
// of the page or the scene, about three times a second, for nothing)
export const Prewarm = memo(function Prewarm() {
  const { gl, scene, camera } = useThree()
  useEffect(() => {
    const release = holdVeil('prewarm')
    // (item 594: till the rest's made, a frame's programs compiled and pictures sent before it's drawn, not in it)
    const unpace = paceFirstDraws(gl, scene)
    const unkeep = keepPrograms(gl)
    // (item 566: what's hidden a while let go of on the GPU, put back as it's drawn again)
    // (`?idle=0`: not, to measure against)
    const unidle = new URLSearchParams(location.search).get('idle') === '0' ? () => {} : idleRelease(scene)
    if (import.meta.env.DEV) (window as unknown as { __idle?: typeof IDLE_RELEASED }).__idle = IDLE_RELEASED
    let started = false
    let unupload = () => {}
    const tick = window.setInterval(() => {
      // (everything else in: the stages mounted and the shop drawn, nothing held but this)
      if (started || !laterSeen() || laterPending() > 1 || !sceneDrawn()) return
      started = true
      window.clearInterval(tick)
      const t0 = performance.now()
      Promise.all([compileSafe(gl, scene, camera), ...[...later].map((o) => compileSafe(gl, o, camera, scene))])
        .catch(() => undefined)
        .then(() => {
          if (import.meta.env.DEV) console.info(`[prewarm] ${Math.round(performance.now() - t0)} ms, ${later.size} templates, ${gl.info.programs?.length ?? '?'} programs`)
          // (item 571: and the pictures not on the card yet sent while it's idle, the templates' too)
          if (QUALITY.tier === 'high' && new URLSearchParams(location.search).get('upload') !== '0') unupload = preUpload(gl, scene, [...later])
          if (import.meta.env.DEV) (window as unknown as { __preUpload?: typeof PRE_UPLOADED }).__preUpload = PRE_UPLOADED
          later.clear()
          warmNow = (o) => { void compileSafe(gl, o, camera, scene) }
        })
        // (and the shadows' programs for the skinned and the instanced, the lights all in)
        .then(() => warmShadows(scene))
        .finally(() => {
          unpace(); release()
          WARMED.done = true
          // (each on its own: one that throws doesn't keep the rest from theirs (the Optimization window's))
          for (const f of [...WARMED.waiting]) { try { f() } catch (e) { console.error('[prewarm] whenWarm', e) } }
          WARMED.waiting.clear()
        })
    }, 250)
    return () => { window.clearInterval(tick); unpace(); release(); warmNow = null; unkeep(); unidle(); unupload() }
  }, [gl, scene, camera])
  return null
})
