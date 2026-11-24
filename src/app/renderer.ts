import { normalizeRenderer } from '@/scene/materialNormalize'
import * as THREE from 'three'
import { QUALITY } from '@/scene/quality'

/**
 * The renderer, asking for less each time if the browser won't give a WebGL context: first the usual, then
 * without antialiasing on the default GPU, then the low-power GPU even if it's slow. (A phone's browser that has
 * crashed its GPU on this site may refuse them all until it's restarted: see NO_WEBGL.)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const IS_TOUCH = typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches

export const makeRenderer = ({ canvas }: { canvas: any }) => {
  const tries: THREE.WebGLRendererParameters[] = [
    { antialias: QUALITY.antialias, powerPreference: 'high-performance' },
    { antialias: false, powerPreference: 'default' },
    { antialias: false, powerPreference: 'low-power', failIfMajorPerformanceCaveat: false, precision: 'mediump' },
  ]
  let last: unknown
  for (const t of tries) {
    try {
      const r = new THREE.WebGLRenderer({ canvas, alpha: true, ...t })
      r.toneMapping = THREE.NoToneMapping
      normalizeRenderer(r)
      return r
    } catch (e) {
      last = e
    }
  }
  throw last
}
/** whether this browser will give a WebGL2 context at all, checked once before the 3D view is put up */
export const NO_WEBGL = (() => {
  if (typeof document === 'undefined') return false
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl2') ?? c.getContext('webgl2', { powerPreference: 'low-power' })
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    return !gl
  } catch {
    return true
  }
})()
/** the 3D view's resolution, at most (the owner's: a MacBook Air's Retina at 2 ran its GPU's memory out: the floor and the bar went black, then
 * the GPU process died); never drawn finer than the screen either */
export const DPR_MAX = 1.25
