import type * as THREE from 'three'
import { capTexture } from './textureCap'

/**
 * Pictures sent to the graphics card while the page is idle, not in the frame they're first drawn in (item 571, the Origin window's 577).
 * With the shop up, some 126 of its 574 pictures still weren't on the card (the fish's bodies at 1024, the vegetables, the coal, the miso
 * soup): each went up, its mipmaps made, in the middle of the frame something first showed it (the first fish on the grill, a shrine door
 * opened). Now, once the page's programs are made, every picture of every material in the scene (the hidden ones too) and of the templates
 * things are copied from is brought within the cap first (scene/textureCap, as it would be at its first draw) and uploaded, a few
 * milliseconds' worth at a time while the browser's idle; and looked over again every ten seconds for what's come in since.
 */
const BUDGET_MS = 4
const LOOK_MS = 10000

export const PRE_UPLOADED = { count: 0, ms: 0, waiting: 0 }

type Idle = (cb: (d: { timeRemaining: () => number }) => void, o?: { timeout: number }) => number
const onIdle: Idle = typeof window !== 'undefined' && 'requestIdleCallback' in window
  ? (cb, o) => (window as unknown as { requestIdleCallback: Idle }).requestIdleCallback(cb, o)
  // (Safari has none: a moment later, a budget of its own)
  : (cb) => window.setTimeout(() => { const t0 = performance.now(); cb({ timeRemaining: () => Math.max(0, BUDGET_MS - (performance.now() - t0)) }) }, 50)
const offIdle = (id: number) => {
  if ('cancelIdleCallback' in window) (window as unknown as { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(id)
  else clearTimeout(id)
}

/** a picture that's ready and not yet on the card */
function waiting(gl: THREE.WebGLRenderer, t: THREE.Texture) {
  if (t.isRenderTargetTexture || t.version === 0) return false
  const im = t.image as { width?: number; complete?: boolean; readyState?: number } | undefined
  if (!im || (im as HTMLVideoElement).readyState !== undefined || im.complete === false || !(im.width ?? 1)) return false
  return (gl.properties.get(t) as { __webglTexture?: unknown }).__webglTexture === undefined
}

function texturesOf(root: THREE.Object3D, into: Set<THREE.Texture>) {
  root.traverse((o) => {
    const mat = (o as THREE.Mesh).material
    if (!mat) return
    for (const m of Array.isArray(mat) ? mat : [mat]) {
      for (const k in m) { const v = (m as unknown as Record<string, unknown>)[k] as THREE.Texture; if (v?.isTexture) into.add(v) }
      const u = (m as THREE.ShaderMaterial).uniforms
      if (u) for (const k in u) { const v = u[k]?.value as THREE.Texture; if (v?.isTexture) into.add(v) }
    }
  })
}

/** starts sending what's not on the card yet, from `scene` and `extra` (templates not in it); returns the stop */
export function preUpload(gl: THREE.WebGLRenderer, scene: THREE.Object3D, extra: THREE.Object3D[] = []): () => void {
  let queue: THREE.Texture[] = []
  let idle = 0
  let stopped = false
  const look = () => {
    const all = new Set<THREE.Texture>()
    texturesOf(scene, all)
    for (const o of extra) texturesOf(o, all)
    // (the small ones first: more of them up in each idle stretch)
    queue = [...all].filter((t) => waiting(gl, t)).sort((a, b) => area(a) - area(b))
    PRE_UPLOADED.waiting = queue.length
    if (queue.length && !idle) idle = onIdle(send, { timeout: 2000 })
  }
  const send = (d: { timeRemaining: () => number }) => {
    idle = 0
    if (stopped) return
    const t0 = performance.now()
    while (queue.length && (performance.now() - t0 < BUDGET_MS) && d.timeRemaining() > 1) {
      const t = queue.shift()!
      if (!waiting(gl, t)) continue
      capTexture(t)
      gl.initTexture(t)
      PRE_UPLOADED.count++
    }
    PRE_UPLOADED.ms += performance.now() - t0
    PRE_UPLOADED.waiting = queue.length
    if (queue.length) idle = onIdle(send, { timeout: 2000 })
  }
  look()
  const t = window.setInterval(look, LOOK_MS)
  return () => { stopped = true; window.clearInterval(t); if (idle) offIdle(idle) }
}

const area = (t: THREE.Texture) => { const im = t.image as { width?: number; height?: number } | undefined; return (im?.width ?? 0) * (im?.height ?? 0) }
