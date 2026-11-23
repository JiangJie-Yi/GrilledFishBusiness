import * as THREE from 'three'

/*
 * In development only: what a hot update leaves behind on the GPU, let go. Vite swaps an edited module for a fresh copy and React runs the
 * memos of its components again, so the textures and shapes the old copy made (at the top of the module, and in every memo) are never
 * disposed: they stay on the GPU, counted by three, as long as the tab stays open (the owner's dev tab, after a day of edits: 4,662 shapes
 * and 1,227 textures, where the shop uses about 2,100 and 380). So every texture and geometry is noted as it's made (forgotten again once
 * it's disposed), and a few seconds after each hot update of code, every one noted that nothing in the scene uses is disposed. What's kept
 * for later and isn't drawn just now (a customer's look not in the shop, the lamps' unlit paper) is only put on the GPU again when it's next
 * drawn; render targets (the shadow maps, the room's light) are never noted. Imported first of all (main.tsx), before anything is made.
 */

const made = new Set<THREE.Texture | THREE.BufferGeometry>()

if (import.meta.env.DEV) {
  const tp = THREE.Texture.prototype
  const need = Object.getOwnPropertyDescriptor(tp, 'needsUpdate')
  if (need?.set) {
    Object.defineProperty(tp, 'needsUpdate', {
      configurable: true,
      get: need.get,
      set(this: THREE.Texture, v: boolean) {
        if (v && !(this as THREE.Texture & { isRenderTargetTexture?: boolean }).isRenderTargetTexture) made.add(this)
        need.set!.call(this, v)
      },
    })
  }
  const tDispose = tp.dispose
  tp.dispose = function (this: THREE.Texture) { made.delete(this); return tDispose.call(this) }
  const gp = THREE.BufferGeometry.prototype
  const set = gp.setAttribute
  gp.setAttribute = function (this: THREE.BufferGeometry, ...a: Parameters<typeof set>) { made.add(this); return set.apply(this, a) } as typeof set
  const gDispose = gp.dispose
  gp.dispose = function (this: THREE.BufferGeometry) { made.delete(this); return gDispose.call(this) }
}

/** let go of every texture and geometry noted that nothing in the scene draws: how many of each */
export function gpuSweep(scene: THREE.Object3D): { textures: number; geometries: number } {
  const used = new Set<unknown>()
  const take = (v: unknown) => { if (v && (v as THREE.Texture).isTexture) used.add(v) }
  scene.traverse((o) => {
    const m = o as THREE.Mesh & { skeleton?: THREE.Skeleton }
    if (m.geometry) used.add(m.geometry)
    take(m.skeleton?.boneTexture)
    for (const mat of ([] as (THREE.Material | undefined)[]).concat(m.material)) {
      if (!mat) continue
      for (const v of Object.values(mat)) take(v)
      for (const u of Object.values((mat as THREE.ShaderMaterial).uniforms ?? {})) take(u?.value)
    }
  })
  const sc = scene as THREE.Scene
  take(sc.background)
  take(sc.environment)
  let textures = 0, geometries = 0
  for (const r of [...made]) {
    if (used.has(r)) continue
    if ((r as THREE.Texture).isTexture) {
      // (a picture that couldn't be put back (one with nothing to upload from) is left be)
      if (!(r as THREE.Texture).image) continue
      textures++
    } else geometries++
    r.dispose()
  }
  return { textures, geometries }
}

/**
 * What's in the scene but hidden a while, let go of on the GPU (item 566, the owner's 「Geo一直很高，有什麼方法可以下降嗎」: of the 1,694
 * geometries on the GPU with the shop shut, 817 weren't drawn: the pieces the room's merge took (drawn in its cells now, hidden), the parts a
 * piece's own merge hid, their ink lines, the poses and things not out just now; each had been drawn once before it was hidden, so it stayed
 * on the GPU). Every `every` ms the scene is walked: a geometry no shown mesh draws, found so twice running (hidden `every` to twice that),
 * is disposed: its buffers on the GPU let go, its points kept, so three puts it on the GPU again by itself the next time it's drawn (an
 * upload, no shader made). Not one whose points were let go after their upload (the room's merge's cells: WorldBatch), which couldn't be put
 * back. Returns its stop.
 */
const released = new WeakSet<THREE.BufferGeometry>()
export const IDLE_RELEASED = { count: 0, last: 0, ms: 0 }
const whole = (g: THREE.BufferGeometry) =>
  (!g.index || !!g.index.array?.length) && Object.values(g.attributes).every((a) => !!(a as THREE.BufferAttribute).array?.length)
/** each attribute (and the index) a geometry draws with, its morph targets' too; stops at the first `fn` that says so */
function anyPart(g: THREE.BufferGeometry, fn: (p: object) => boolean): boolean {
  for (const k in g.attributes) if (fn(g.attributes[k])) return true
  if (g.index && fn(g.index)) return true
  for (const list of Object.values(g.morphAttributes)) for (const a of list ?? []) if (fn(a)) return true
  return false
}
export function idleRelease(scene: THREE.Object3D, every = 10000): () => void {
  let idle = new Set<THREE.BufferGeometry>()
  const tick = () => {
    const t0 = performance.now()
    const shown = new Set<THREE.BufferGeometry>()
    scene.traverseVisible((o) => { const g = (o as THREE.Mesh).geometry; if (g) shown.add(g) })
    for (const g of shown) released.delete(g)
    const all = new Set<THREE.BufferGeometry>()
    scene.traverse((o) => { const g = (o as THREE.Mesh).geometry; if (g) all.add(g) })
    // (and none sharing an attribute or its index with another geometry (the boss's and the staff's skinned figures and their other poses, the
    // bottles, the rice cooker, the switches: 25 shared with a shown one, the Tester window's find, item 586): disposing it deletes the shared
    // buffer on the GPU while the other's still drawn from it (or, hidden too, will be: its vertex array still pointing at the deleted one))
    const owner = new Map<object, THREE.BufferGeometry>()
    const shared = new Set<object>()
    for (const g of all) anyPart(g, (p) => { const u = owner.get(p); if (u === undefined) owner.set(p, g); else if (u !== g) shared.add(p); return false })
    const next = new Set<THREE.BufferGeometry>()
    let n = 0
    for (const g of all) {
      // (let go of before, but on the GPU again: drawn a moment between two looks (the room's merge made again gives its pieces back for a
      // few seconds) and three put it back up, its dispose listener with it; taken as let go of, it was never let go of again (the Tester
      // window's three days: 310 more on the GPU at the first remaking of the room's merge, and there they stayed))
      if (released.has(g) && (g as unknown as { _listeners?: { dispose?: unknown[] } })._listeners?.dispose?.length) released.delete(g)
      if (shown.has(g) || released.has(g)) continue
      if (shared.size && anyPart(g, (p) => shared.has(p))) continue
      if (idle.has(g) && whole(g)) { g.dispose(); released.add(g); n++ } else next.add(g)
    }
    idle = next
    IDLE_RELEASED.count += n
    IDLE_RELEASED.last = n
    IDLE_RELEASED.ms = performance.now() - t0
  }
  // (run while the browser's idle, not in the middle of a frame's time)
  const soon = () => { if ('requestIdleCallback' in window) window.requestIdleCallback(tick, { timeout: 3000 }); else tick() }
  const t = window.setInterval(soon, every)
  return () => window.clearInterval(t)
}

if (import.meta.env.DEV && import.meta.hot) {
  let wait = 0
  import.meta.hot.on('vite:afterUpdate', (payload: { updates?: { type: string }[] }) => {
    if (!payload.updates?.some((u) => u.type === 'js-update')) return
    window.clearTimeout(wait)
    wait = window.setTimeout(() => {
      const scene = (window as unknown as { __scene?: THREE.Scene }).__scene
      if (!scene) return
      const n = gpuSweep(scene)
      if (n.textures || n.geometries) console.info(`[gpu sweep] after a hot update: let go of ${n.textures} textures, ${n.geometries} geometries`)
    }, 4000)
  })
  ;(window as unknown as { __gpuSweep?: () => unknown }).__gpuSweep = () => {
    const scene = (window as unknown as { __scene?: THREE.Scene }).__scene
    return scene ? gpuSweep(scene) : null
  }
}
