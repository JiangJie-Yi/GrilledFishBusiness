import * as THREE from 'three'
import { type Counter } from '@/shops/grill/bar'

/** the pieces standing against the first counter's wall, behind its aisle: the waiting benches, the helmet's stand and the helmet on it; and
 * the cats' stand by the door with its cats (item 387: moved along the wall into the aisle (the owner's, item 96), the cat at its front
 * 0.42 from the stools' backs, those going by walked into it: aisleSqueeze) */
const WALL_PIECES = ['bench', 'bench2', 'kabutostand', 'kabuto', 'doorcats', 'owncat', 'koban', 'doorcat0', 'doorcat1', 'doorcat2', 'doorcat3']
const WALL_V = new THREE.Vector3(), WALL_INV = new THREE.Matrix4()
/** (and where they stood when last measured, `sig`; when that was, `full`; when those not found were last looked for, `looked`) */
export type WallKeep = { at: number; boxes: { a0: number; a1: number; front: number }[]; roots: Map<string, THREE.Object3D>; sig: number; full: number; looked: number }
/**
 * Each of WALL_PIECES' footprints in the first counter's frame (item 193), from its own meshes' vertices between the floor and a body's
 * shoulders: along the counter from its middle (`a0` to `a1`), and how far toward the aisle its front comes (`front`, lay). Measured now and
 * then, not laid down here, so it follows a piece moved by hand.
 */
export function measureWall(scene: THREE.Object3D, frame: THREE.Object3D, c: { at: THREE.Vector3; along: THREE.Vector3; lay: THREE.Vector3 }, keep: WallKeep) {
  // (measured again only when one of them has moved (by hand in edit mode, the benches put back as the shop shuts), or a minute on (item 374:
  // every 3 s it was, its sums over thousands of vertices each time, run too seldom to be made quick: a number made for each, some 23 MB of
  // garbage every 30 s); and those not in the shop looked for at most every 10 s, a walk through the whole scene for each)
  const now = performance.now(), look = now - keep.looked > 10000
  if (look) keep.looked = now
  let sig = 0
  for (const id of WALL_PIECES) {
    let root = keep.roots.get(id)
    if ((!root || !root.parent) && look) {
      let found: THREE.Object3D | undefined
      scene.traverse((o) => { if (!found && o.userData?.editId === id) found = o })
      if (found) keep.roots.set(id, (root = found))
    }
    if (!root || !root.parent) continue
    const e = root.matrixWorld.elements
    sig = (Math.imul(sig, 31) + id.length) | 0
    for (let k = 0; k < 16; k++) sig = (Math.imul(sig, 31) + Math.round(e[k] * 1e4)) | 0
  }
  if (sig === keep.sig && now - keep.full < 60000) return
  keep.sig = sig; keep.full = now
  keep.boxes.length = 0
  WALL_INV.copy(frame.matrixWorld).invert()
  for (const id of WALL_PIECES) {
    const root = keep.roots.get(id)
    if (!root || !root.parent) continue
    let a0 = Infinity, a1 = -Infinity, front = -Infinity
    root.traverse((o) => {
      const m = o as THREE.Mesh
      const pos = m.isMesh && !(o as THREE.InstancedMesh).isInstancedMesh ? m.geometry?.attributes.position : undefined
      if (!pos || !m.visible || m.userData?.editHandle) return
      // (a big one sampled: its outline's there in every few thousandth vertex)
      const stride = Math.max(1, Math.floor(pos.count / 3000))
      for (let i = 0; i < pos.count; i += stride) {
        WALL_V.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld).applyMatrix4(WALL_INV)
        if (WALL_V.y < 0.02 || WALL_V.y > 0.75) continue
        const dx = WALL_V.x - c.at.x, dz = WALL_V.z - c.at.z
        const al = dx * c.along.x + dz * c.along.z, ly = dx * c.lay.x + dz * c.lay.z
        if (al < a0) a0 = al
        if (al > a1) a1 = al
        if (ly > front) front = ly
      }
    })
    if (front > -Infinity) keep.boxes.push({ a0, a1, front })
  }
}
/** a server's half width (their round body; their hands hanging out past it as they walk): the bar's measure */
export const SERVER_HALF = 0.22
/** how far along the counter from a customer's middle a server stands beside them, at the least and the most (item 591: besideAlong) */
export const BESIDE_LEAST = 0.24, BESIDE_MOST = 0.45
/** how far along the aisle one comes in toward the counter before what stands out from its wall, and goes back out after it */
const SQUEEZE_RAMP = 0.35
type Squeeze = { a0: number; a1: number; lay: number }
/**
 * (item 387, the owner's 「有個致命的問題動作都會深陷進模型去」) the stretches of the first counter's aisle where what stands against its wall
 * comes out into the way of those walking it (`half` across, keeping to its line `line`, the lay from the counter's middle, + toward it):
 * there they keep in toward the counter, just clear of its front if there's room; if there isn't, half way between it and the stools'
 * backs (`stools`): by the cats' stand there's 0.42 between them, a server's round body 0.44 across, and kept to the aisle's line they went
 * 0.14 to 0.2 into its lower tier and their heads through the cat on it (tests/e2e/sinkin.mjs). Each stretch with the line to keep to;
 * those that overlap one, kept to the nearer the counter
 */
export function aisleSqueeze(boxes: WallKeep['boxes'], line: number, stools: number, half: number): Squeeze[] {
  const out: Squeeze[] = []
  for (const b of boxes) {
    const clear = b.front + half + 0.02
    if (clear <= line + 0.01) continue
    const lay = Math.min(clear, (b.front + stools) / 2)
    if (lay > line + 0.01) out.push({ a0: b.a0 - half, a1: b.a1 + half, lay })
  }
  out.sort((p, q) => p.a0 - q.a0)
  const merged: Squeeze[] = []
  for (const z of out) {
    const m = merged.at(-1)
    if (m && z.a0 <= m.a1 + SQUEEZE_RAMP) { m.a1 = Math.max(m.a1, z.a1); m.lay = Math.max(m.lay, z.lay) } else merged.push({ ...z })
  }
  return merged
}
/** where in the aisle one keeps to at a place along it (`a`, the first counter's): its own line, or in toward the counter by a stretch
 * (over SQUEEZE_RAMP before and after it) */
export function squeezeLay(zones: Squeeze[], line: number, a: number) {
  let l = line
  for (const z of zones) {
    const k = a < z.a0 ? 1 - (z.a0 - a) / SQUEEZE_RAMP : a > z.a1 ? 1 - (a - z.a1) / SQUEEZE_RAMP : 1
    if (k > 0) l = Math.max(l, line + (z.lay - line) * Math.min(1, k))
  }
  return l
}
/** a way (the bar's frame) bent in round those stretches where it runs along the first counter's aisle (`c`): its corners where each
 * stretch's ramps begin and end, and its own points on the aisle's line in a stretch drawn in; its first point (where they are now) as
 * it is, and if that's in a stretch, a step on from it drawn in already (set off from a stool by the cats' stand, they'd have come in
 * across the whole of it, and gone into its end) */
export function squeezePath(path: THREE.Vector3[], c: Counter, line: number, zones: Squeeze[]) {
  if (!zones.length || path.length < 2) return path
  const A = (v: THREE.Vector3) => (v.x - c.at.x) * c.along.x + (v.z - c.at.z) * c.along.z
  const L = (v: THREE.Vector3) => (v.x - c.at.x) * c.lay.x + (v.z - c.at.z) * c.lay.z
  const onLine = (v: THREE.Vector3) => Math.abs(L(v) - line) < 0.06
  const drawn = (a: number) => squeezeLay(zones, line, a) > line + 1e-3
  const put = (a: number, y: number) => c.at.clone().addScaledVector(c.along, a).addScaledVector(c.lay, squeezeLay(zones, line, a)).setY(y)
  const out = [path[0]]
  for (let i = 1; i < path.length; i++) {
    const p = path[i - 1], q = path[i]
    if (!onLine(p) || !onLine(q)) { out.push(onLine(q) && drawn(A(q)) ? put(A(q), q.y) : q); continue }
    const ap = A(p), aq = A(q), dir = Math.sign(aq - ap) || 1
    const first = i === 1 && drawn(ap) && Math.abs(aq - ap) > 0.2
    if (first) out.push(put(ap + dir * 0.12, p.y))
    for (const a of zones.flatMap((z) => [z.a0 - SQUEEZE_RAMP, z.a0, z.a1, z.a1 + SQUEEZE_RAMP]).filter((x) => (x - ap) * dir > (first ? 0.13 : 0.01) && (aq - x) * dir > 0.01)
      .sort((x, y) => (x - y) * dir)) out.push(put(a, q.y))
    out.push(drawn(aq) ? put(aq, q.y) : q)
  }
  return out
}
