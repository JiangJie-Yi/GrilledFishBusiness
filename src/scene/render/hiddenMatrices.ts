import * as THREE from 'three'

/**
 * (item 804, the owner's 「降低 Geometry、Draw Calls 與記憶體佔用」, FPS among it) What's hidden not placed afresh every frame. Three's
 * updateMatrixWorld goes into every object of the scene every frame, shown or not, and works out where each is (its renderer then draws
 * nothing under a hidden one): of the shop's 13,484 objects 7,507 are under something hidden, 4,776 of them StaticBatch's originals (which
 * skip it already), the rest the pieces' put-away parts (a drinks fridge's 215 under one group, the register's keys while their merged copy
 * stands for them, ...). Here a hidden group (not a hidden mesh: one may be a pointer's target, FigureHit's box or a picture's tip, and the
 * pointer's rays take what's hidden) is gone into the first time it's met hidden, and then once every SWEEP_MS while it stays hidden (what
 * it holds moved meanwhile, or what it's under, is a moment late there, drawn by nobody); shown again, it's gone into that same frame as
 * ever. A point's world place asked for (getWorldPosition, localToWorld, Box3.setFromObject) is worked out afresh as it's asked, as ever.
 * Measured (tests/e2e/_census3.mjs, the shop shut, this machine): the scene's matrices 2.3 to 2.6 ms a frame, 1.2 with hidden groups left out.
 * `?hidmat=0` in the address: as three does it.
 */
const SWEEP_MS = 500
const OFF = typeof location !== 'undefined' && new URLSearchParams(location.search).get('hidmat') === '0'
/** when each hidden group was last gone into while hidden */
const SWEPT = new WeakMap<THREE.Object3D, number>()
let now = 0, nowAt = -1

/** whether to leave a hidden group's insides as they are this frame */
function keepAsIs(o: THREE.Object3D) {
  // (the clock read once a frame's worth: a hundred hidden groups a frame each asking for it, for nothing)
  if (nowAt !== FRAME.n) { nowAt = FRAME.n; now = performance.now() }
  const at = SWEPT.get(o)
  if (at !== undefined && now - at < SWEEP_MS) return true
  SWEPT.set(o, now)
  return false
}

/** the scene's frames counted (each call of updateMatrixWorld on a root, the renderer's own once a render) */
const FRAME = { n: 0 }

if (!OFF) {
  const P = THREE.Object3D.prototype
  // (in development, three's own kept by it, to time one against the other in the same scene)
  if (import.meta.env.DEV && typeof window !== 'undefined') Object.assign(window, { __hidmat: { three: P.updateMatrixWorld, FRAME } })
  P.updateMatrixWorld = function updateMatrixWorld(this: THREE.Object3D, force?: boolean) {
    if (this.parent === null) FRAME.n++
    if (this.matrixAutoUpdate) this.updateMatrix()
    if (this.matrixWorldNeedsUpdate || force) {
      if (this.matrixWorldAutoUpdate === true) {
        if (this.parent === null) this.matrixWorld.copy(this.matrix)
        else this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix)
      }
      this.matrixWorldNeedsUpdate = false
      force = true
    }
    const children = this.children
    for (let i = 0, l = children.length; i < l; i++) {
      const c = children[i]
      // (a hidden group, its insides as they were (a hidden mesh as ever: below))
      if (c.visible === false && !(c as THREE.Mesh).isMesh && keepAsIs(c)) continue
      c.updateMatrixWorld(force)
    }
  }
}
