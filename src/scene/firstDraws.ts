import type * as THREE from 'three'
import { capTexture } from './textureCap'

/**
 * The shop's first frames drawn only once what they need is ready, not made in the frame (item 594, the Origin window's find: as the page
 * loaded, one task held the main thread 4.4 to 5.4 s: the first frame that drew the shop linked every one of its programs on the spot (1.8 s
 * of it) and sent every picture up (1.0 s), the rest the GPU's own wait; the loading veil's count and fish stood still, nothing else could
 * run). While the page loads (till Prewarm has made the rest), each frame looks first at what's in view:
 *   - a material never compiled: the scene compiled with compileAsync (the browser links the programs off the main thread where it can,
 *     KHR_parallel_shader_compile), and the frame skipped till it's done;
 *   - pictures not on the card yet: sent a few milliseconds' worth (within the cap, as at their first draw), and the frame skipped;
 *   - else drawn as ever.
 * The frames skipped are under the loading veil; between them the page's own work (the veil's count, its fish) goes on.
 */
const BUDGET_MS = 8

type Mat = THREE.Material & Record<string, unknown>
function texturesOf(m: Mat, into: THREE.Texture[]) {
  for (const k in m) { const v = m[k] as THREE.Texture; if (v?.isTexture) into.push(v) }
  const u = (m as unknown as THREE.ShaderMaterial).uniforms
  if (u) for (const k in u) { const v = u[k]?.value as THREE.Texture; if (v?.isTexture) into.push(v) }
}
function waiting(gl: THREE.WebGLRenderer, t: THREE.Texture) {
  if (t.isRenderTargetTexture || t.version === 0) return false
  const im = t.image as { width?: number; complete?: boolean; readyState?: number } | undefined
  if (!im || (im as HTMLVideoElement).readyState !== undefined || im.complete === false || !(im.width ?? 1)) return false
  return (gl.properties.get(t) as { __webglTexture?: unknown }).__webglTexture === undefined
}

/** starts pacing the renderer's frames; returns the stop (the renderer drawing every frame as ever) */
export function paceFirstDraws(gl: THREE.WebGLRenderer, main: THREE.Object3D): () => void {
  const render = gl.render.bind(gl)
  let compiling = false
  let stopped = false
  // (never stuck: a material compileAsync gives no program to is drawn anyway after three tries, a picture's sent only once)
  let tries = 0
  const tried = new WeakSet<THREE.Texture>()
  gl.render = (scene, camera) => {
    // (only the shop drawn on the screen: a picture drawn into a target of its own (the room's light from its studio, a sheet baked flat) is
    // drawn there and then, as it's asked for: skipped, the room's light was never made, and the shop came up cold and blue)
    if (stopped || scene !== main || gl.getRenderTarget() !== null) { render(scene, camera); return }
    if (compiling) return
    let fresh = false
    const pics: THREE.Texture[] = []
    scene.traverseVisible((o) => {
      const mat = (o as THREE.Mesh).material as Mat | Mat[] | undefined
      if (!mat) return
      for (const m of Array.isArray(mat) ? mat : [mat]) {
        if (!fresh && (gl.properties.get(m) as { programs?: unknown }).programs === undefined) fresh = true
        texturesOf(m, pics)
      }
    })
    if (fresh && tries < 3) {
      tries++
      compiling = true
      gl.compileAsync(scene, camera).catch(() => undefined).finally(() => { compiling = false })
      return
    }
    if (!fresh) tries = 0
    const t0 = performance.now()
    let left = false
    for (const t of pics) {
      if (tried.has(t) || !waiting(gl, t)) continue
      if (performance.now() - t0 > BUDGET_MS) { left = true; break }
      tried.add(t)
      capTexture(t)
      gl.initTexture(t)
    }
    if (left) return
    render(scene, camera)
  }
  return () => { stopped = true; gl.render = render }
}
