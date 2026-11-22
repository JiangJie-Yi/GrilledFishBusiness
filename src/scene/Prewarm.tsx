import { memo, useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { IDLE_RELEASED, idleRelease } from './gpuSweep'
import { PRE_UPLOADED, preUpload } from './preUpload'
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

// (item 374: drawn again only as its own props change: it does its work in its frames and effects, and was drawn again with every redraw
// of the page or the scene, about three times a second, for nothing)
export const Prewarm = memo(function Prewarm() {
  const { gl, scene, camera } = useThree()
  useEffect(() => {
    const release = holdVeil('prewarm')
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
        .finally(release)
    }, 250)
    return () => { window.clearInterval(tick); release(); warmNow = null; unkeep(); unidle(); unupload() }
  }, [gl, scene, camera])
  return null
})
