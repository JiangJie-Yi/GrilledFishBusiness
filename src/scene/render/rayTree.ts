// A box tree over a still mesh's triangles, for the pointer's rays (item 579, from the Tester's 578: every pointer event ray-tested the merged
// batches' hidden originals one triangle at a time, with nothing to skip by: over the shrine 1.29 ms, the whole room 2.6 to 3.0 ms, a click
// some four of them). Built the first time a ray comes near a geometry, kept with it; the ray tries boxes first and only the few triangles
// in the boxes it goes through. The answer is three's own (the same triangles, the same sides, the same distances and points); a mesh that
// isn't plain (a material per group, a drawn part only, morphs, bones) is left to three
import * as THREE from 'three'

/** triangles in a box at most before it's split */
const LEAF = 8
/** fewer triangles than this: three's own test is as quick */
const SMALL = 96

type Tree = {
  /** each node's box: min x, y, z, max x, y, z */
  box: Float32Array
  /** a node's first child (the second follows it), or -1 for a leaf */
  kid: Int32Array
  /** a leaf's triangles: from `first`, `count` of them, in `tris` */
  first: Int32Array
  count: Int32Array
  tris: Uint32Array
  /** the positions' version it was made from: moved since, it's not used */
  version: number
}
const trees = new WeakMap<THREE.BufferGeometry, Tree | null>()
/** three's own, as it was when this was loaded (what everything falls back to: never this, whatever is put on the prototype after) */
export const ownRaycast = THREE.Mesh.prototype.raycast
/** on: the trees used (dev: `__rayTree.on = false` to measure three's own in the same page) */
export const RAY_TREE = { on: true }
if (import.meta.env?.DEV && typeof window !== 'undefined') Object.assign(window, { __rayTree: RAY_TREE })

/** the k-th of tris[lo..hi] by their middles along `axis` put at k, those before it no larger, those after no smaller (Hoare's selection) */
function select(tris: Uint32Array, mid: Float32Array, axis: number, lo: number, hi: number, k: number) {
  while (hi > lo) {
    const pivot = mid[3 * tris[(lo + hi) >> 1] + axis]
    let i = lo, j = hi
    while (i <= j) {
      while (mid[3 * tris[i] + axis] < pivot) i++
      while (mid[3 * tris[j] + axis] > pivot) j--
      if (i <= j) { const x = tris[i]; tris[i] = tris[j]; tris[j] = x; i++; j-- }
    }
    if (k <= j) hi = j
    else if (k >= i) lo = i
    else return
  }
}

function build(geo: THREE.BufferGeometry): Tree | null {
  const pos = geo.attributes.position as THREE.BufferAttribute | undefined
  if (!pos) return null
  const idx = geo.index
  const n = Math.floor((idx ? idx.count : pos.count) / 3)
  if (n < SMALL) return null
  const at = (t: number, k: number) => (idx ? idx.getX(3 * t + k) : 3 * t + k)
  // (each triangle's middle and box)
  const mid = new Float32Array(3 * n), lo = new Float32Array(3 * n), hi = new Float32Array(3 * n)
  for (let t = 0; t < n; t++) {
    for (let a = 0; a < 3; a++) { lo[3 * t + a] = Infinity; hi[3 * t + a] = -Infinity }
    for (let k = 0; k < 3; k++) {
      const v = at(t, k)
      const p = [pos.getX(v), pos.getY(v), pos.getZ(v)]
      for (let a = 0; a < 3; a++) { lo[3 * t + a] = Math.min(lo[3 * t + a], p[a]); hi[3 * t + a] = Math.max(hi[3 * t + a], p[a]) }
    }
    for (let a = 0; a < 3; a++) mid[3 * t + a] = (lo[3 * t + a] + hi[3 * t + a]) / 2
  }
  const tris = new Uint32Array(n)
  for (let t = 0; t < n; t++) tris[t] = t
  const cap = 2 * Math.ceil(n / LEAF) * 2 + 1
  const box = new Float32Array(6 * cap), kid = new Int32Array(cap).fill(-1), first = new Int32Array(cap), count = new Int32Array(cap)
  let nodes = 1
  const stack: [number, number, number][] = [[0, 0, n]]
  while (stack.length) {
    const [node, from, len] = stack.pop()!
    let bx = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity], cm = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]
    for (let i = from; i < from + len; i++) {
      const t = tris[i]
      for (let a = 0; a < 3; a++) {
        bx[a] = Math.min(bx[a], lo[3 * t + a]); bx[3 + a] = Math.max(bx[3 + a], hi[3 * t + a])
        cm[a] = Math.min(cm[a], mid[3 * t + a]); cm[3 + a] = Math.max(cm[3 + a], mid[3 * t + a])
      }
    }
    box.set(bx, 6 * node)
    const ext = [cm[3] - cm[0], cm[4] - cm[1], cm[5] - cm[2]]
    const axis = ext[0] >= ext[1] && ext[0] >= ext[2] ? 0 : ext[1] >= ext[2] ? 1 : 2
    if (len <= LEAF || ext[axis] <= 0 || nodes + 2 > cap) { first[node] = from; count[node] = len; continue }
    // (split at the middle of the triangles' middles along the box's longest side: the median put in its place, the smaller before it
    // and the larger after, not the whole run sorted)
    const half = len >> 1
    select(tris, mid, axis, from, from + len - 1, from + half)
    kid[node] = nodes
    stack.push([nodes, from, half], [nodes + 1, from + half, len - half])
    nodes += 2
  }
  return { box: box.subarray(0, 6 * nodes), kid: kid.subarray(0, nodes), first: first.subarray(0, nodes), count: count.subarray(0, nodes), tris, version: pos.version }
}

const inv = new THREE.Matrix4(), ray = new THREE.Ray(), sphere = new THREE.Sphere()
const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), P = new THREE.Vector3(), W = new THREE.Vector3()

/** whether the ray (origin o, the inverse of its direction d) goes through a box before `far` */
function slab(b: Float32Array, i: number, o: THREE.Vector3, d: THREE.Vector3, far: number) {
  let t0 = 0, t1 = far
  for (let a = 0; a < 3; a++) {
    const oa = a === 0 ? o.x : a === 1 ? o.y : o.z, da = a === 0 ? d.x : a === 1 ? d.y : d.z
    let u = (b[6 * i + a] - oa) * da, v = (b[6 * i + 3 + a] - oa) * da
    if (u > v) { const x = u; u = v; v = x }
    if (u > t0) t0 = u
    if (v < t1) t1 = v
    if (t0 > t1) return false
  }
  return true
}

/** a still mesh's raycast through its box tree (use as `mesh.raycast = treeRaycast`) */
export function treeRaycast(this: THREE.Mesh, raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
  const geo = this.geometry, mat = this.material
  if (mat === undefined) return
  if (!RAY_TREE.on) return ownRaycast.call(this, raycaster, intersects)
  // (anything but a plain mesh: three's own)
  if (Array.isArray(mat) || geo.groups.length > 0 || geo.drawRange.start !== 0 || geo.drawRange.count !== Infinity
    || this.morphTargetInfluences?.length || (this as unknown as { isSkinnedMesh?: boolean }).isSkinnedMesh) return ownRaycast.call(this, raycaster, intersects)
  // (three's own first tests: the bounding sphere in the world, then the box in its own frame)
  if (geo.boundingSphere === null) geo.computeBoundingSphere()
  sphere.copy(geo.boundingSphere!).applyMatrix4(this.matrixWorld)
  if (!raycaster.ray.intersectsSphere(sphere)) return
  inv.copy(this.matrixWorld).invert()
  ray.copy(raycaster.ray).applyMatrix4(inv)
  if (geo.boundingBox === null) geo.computeBoundingBox()
  if (!ray.intersectsBox(geo.boundingBox!)) return
  // (no tree yet (it's made when the page is idle, treeLater), or the positions changed since: three's own, the same answer)
  const tree = trees.get(geo)
  if (!tree || tree.version !== (geo.attributes.position as THREE.BufferAttribute).version) {
    if (tree) { trees.delete(geo); treeLater(geo) }
    return ownRaycast.call(this, raycaster, intersects)
  }
  const pos = geo.attributes.position, idx = geo.index, uv = geo.attributes.uv, uv1 = geo.attributes.uv1, nrm = geo.attributes.normal
  const at = (t: number, k: number) => (idx ? idx.getX(3 * t + k) : 3 * t + k)
  const d = new THREE.Vector3(1 / ray.direction.x, 1 / ray.direction.y, 1 / ray.direction.z)
  const far = Infinity
  const stack = [0]
  while (stack.length) {
    const i = stack.pop()!
    if (!slab(tree.box, i, ray.origin, d, far)) continue
    if (tree.kid[i] >= 0) { stack.push(tree.kid[i], tree.kid[i] + 1); continue }
    for (let k = tree.first[i]; k < tree.first[i] + tree.count[i]; k++) {
      const t = tree.tris[k], a = at(t, 0), b = at(t, 1), c = at(t, 2)
      A.fromBufferAttribute(pos, a); B.fromBufferAttribute(pos, b); C.fromBufferAttribute(pos, c)
      // (the sides as three tests them)
      const side = (mat as THREE.Material).side
      const hit = side === THREE.BackSide ? ray.intersectTriangle(C, B, A, true, P) : ray.intersectTriangle(A, B, C, side === THREE.FrontSide, P)
      if (!hit) continue
      W.copy(P).applyMatrix4(this.matrixWorld)
      const distance = raycaster.ray.origin.distanceTo(W)
      if (distance < raycaster.near || distance > raycaster.far) continue
      // (the rest as three's checkGeometryIntersection makes it: barycentric, uv, uv1, the normal turned to face the ray, the face)
      const out: THREE.Intersection = { distance, point: W.clone(), object: this }
      const barycoord = new THREE.Vector3()
      THREE.Triangle.getBarycoord(P, A, B, C, barycoord)
      if (uv) out.uv = THREE.Triangle.getInterpolatedAttribute(uv as THREE.BufferAttribute, a, b, c, barycoord, new THREE.Vector2()) as THREE.Vector2
      if (uv1) out.uv1 = THREE.Triangle.getInterpolatedAttribute(uv1 as THREE.BufferAttribute, a, b, c, barycoord, new THREE.Vector2()) as THREE.Vector2
      if (nrm) {
        out.normal = THREE.Triangle.getInterpolatedAttribute(nrm as THREE.BufferAttribute, a, b, c, barycoord, new THREE.Vector3()) as THREE.Vector3
        if (out.normal.dot(ray.direction) > 0) out.normal.multiplyScalar(-1)
      }
      const face = { a, b, c, normal: new THREE.Vector3(), materialIndex: 0 }
      THREE.Triangle.getNormal(A, B, C, face.normal)
      out.face = face
      out.barycoord = barycoord
      out.faceIndex = t
      intersects.push(out)
    }
  }
}

// ---- made while the page is idle, a geometry at a time (the biggest, some 40,000 triangles, about 30 ms), so a pointer's first pass
// over a piece never waits for one: till then its rays are three's own
/** a geometry's tree made and kept with it (and, in development, counted) */
function keep(g: THREE.BufferGeometry) {
  const tree = build(g)
  trees.set(g, tree)
  if (tree && import.meta.env?.DEV) made.add(new WeakRef(g))
}
const queue: THREE.BufferGeometry[] = []
let waiting = false
type Idle = (f: (d: { timeRemaining: () => number }) => void, o?: { timeout: number }) => number
const idle: Idle = typeof window !== 'undefined' && 'requestIdleCallback' in window
  ? (f, o) => (window as unknown as { requestIdleCallback: Idle }).requestIdleCallback(f, o)
  : (f) => window.setTimeout(() => f({ timeRemaining: () => 8 }), 200)
const step = (d: { timeRemaining: () => number }) => {
  waiting = false
  while (queue.length && d.timeRemaining() > 4) {
    const g = queue.shift()!
    if (!trees.has(g)) keep(g)
  }
  if (queue.length) later()
}
const later = () => { if (waiting || typeof window === 'undefined') return; waiting = true; idle(step, { timeout: 4000 }) }
/** a geometry's tree to be made when the page is idle (once; again if its positions change) */
export function treeLater(geo: THREE.BufferGeometry) {
  if (trees.has(geo) || queue.includes(geo)) return
  queue.push(geo)
  later()
}
/** (dev) how many trees are made and how much memory they take, all told: the geometries held weakly (a tree goes with its geometry) */
const made = new Set<WeakRef<THREE.BufferGeometry>>()
if (import.meta.env?.DEV && typeof window !== 'undefined') Object.assign(RAY_TREE, {
  bytes: () => {
    let n = 0, b = 0, tris = 0
    for (const r of made) {
      const g = r.deref(), t = g && trees.get(g)
      if (!t) continue
      n++
      tris += t.tris.length
      b += t.box.byteLength + t.kid.byteLength + t.first.byteLength + t.count.byteLength + t.tris.byteLength
    }
    return { trees: n, triangles: tris, bytes: b, waiting: queue.length }
  },
})
/** a geometry's tree made now (the checks, and anything that can't wait) */
export function treeNow(geo: THREE.BufferGeometry) {
  keep(geo)
}
