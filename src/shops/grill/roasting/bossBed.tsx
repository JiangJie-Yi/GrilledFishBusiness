import { memo, useEffect, useMemo, useRef } from 'react'
import { BOSS_BED, FLOOR_CHECK, FUTON, SEATS_SAT, seatsOf } from '@/shops/grill/bar'
import { useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { keepOut } from '@/game/kitchen/hearthGuard'
import * as THREE from 'three'
import { inkModel, isInk } from '@/scene/render/inkHull'
import { BlobShadow } from '@/scene/effects/BlobShadow'
import type { Lang } from '@/data/i18n'
import { Boss } from '@/shops/grill/staff/Boss'
import { getEdit, subscribeEdit } from '@/shops/grill/edit'
import { Movable } from '@/shops/grill/editor/Movable'
import { kitchenOf, aisleCornerOf, aisleOf, FIGURES, KITCHEN_ROUTE, ALONG, staffWayOut, inKitchen, BAR_GATES, gateOf, inGenkan, GRILL_COUNTERS, GRILL_OFFSET, GRILL_SCALE, KITCHEN_DROP, LAY, roomOf, type Counter } from '@/shops/grill/bar'
import { whenWarm } from '@/scene/render/Prewarm'
import { fromBar, toBar, floorAt, CHEF_AT, CHEF_YAW, BOSS_SCALE, BOSS_AISLE, BOSS_WALK, HEARTH_ZONES } from './kitchen'
import { WALK_IJ } from './hearthGuard'

/**
 * Where the owner lays his futon down, the nights he's too tired for the stair (item 444, the owner's, 2026-11-21: 「老闆也有體力值，累了也會
 * 在一樓打地舖睡」, game/bossStamina): at the stair's foot, before the staff's door, its length along the wall toward the corner (the one open
 * stretch of the shop's floor a futon fits, clear of the side counter's stools; the others gone home or upstairs by then, and he's up and has
 * it folded away before they're down again); and his way there from his fire, as his cooks who live upstairs go to the door: across the
 * kitchen to the gate, out, along the aisle to its corner, to before the futon's foot and onto it. In the grill's frame (this group's).
 */
/**
 * The floor round a spot, as the owner's futon sees it (item 537, the owner's 「老闆這邊睡會穿模型，找一個不會穿模型的地方睡。」: laid between
 * the barrel and the rice sacks it ran over the sacks under its head, the potted willow's boughs over its pillow and the sake barrels by its
 * foot, its head off the kitchen's floor down the step past it): 5 cm squares in the room's own lie (U along the first counter, V across it,
 * in the world), from `c0`, R each way, each one taken where anything stands in it up to 60 cm over `floorY` (every mesh's triangles, edges
 * and insides: but the floors' own flat faces, the people, the unseen), the step between the kitchen's floor and the room's with it; a test
 * of a rectangle on it (taken anywhere in it), a point on it in the world. Made as the owner sets off for bed: what's moved in the editor since
 * is where it is now. Quick enough for that frame (item 543: each mesh's points worked out once, not once for each of its triangles; the meshes
 * clear of the square passed by; a triangle within one square marked as that square, as its edges would: two maps took 60 to 70 ms, the
 * frame he set off in held that long)
 */
/** (floorMap's scratch: a mesh's points, each worked out once: in the world, then across the map in squares (item 543); each map its own
 * (item 652: one made a step at a time, inside a mesh too, while another's made all at once)) */
// (`top`: how high over the floor what stands there is looked at: a futon's 60 cm; one stood up there, his height (item 652: put down under
// the bar's overhanging top, he stood through it))
// (made a mesh at a step (item 652, the Optimization window's: the boss's drop map is some 340 thousand points, 32 ms here and some 130 on a
// slower laptop in one frame; stepped, a few milliseconds a frame); floorMap below makes it all at once, as the futon's way wants it)
// (`bottom`: from how high over the floor (item 629: a body's middle, knee up: the steps and the rugs not in it))
// (`owners`: and whose each square is, the mesh that marked it last (item 629: what a way goes through, named); `raised`: a floor a
// step up on the rest (the kitchen's: its rectangle in the first counter's frame, how much higher in the world), what's on it looked at
// from it (item 629: the sink's step stool, stood on to wash up, was under the band from the room's floor, the kitchen's 16 cm short of it))
function* floorMapSteps(meshes: THREE.Mesh[], g: THREE.Object3D, c0: THREE.Vector3, floorY: number, R = 4.5, top = 0.6, bottom = -0.25, owners = false,
  raised: { along: [number, number]; lay: [number, number]; dy: number } | null = null) {
  let FLOOR_PTS = new Float64Array(5 * 4096), FLOOR_SEEN = new Int32Array(4096), FLOOR_STAMP = 0
  // (a step given back every so many points or triangles, inside a mesh too: one big merged mesh was 30 ms in a step)
  let work = 0
  g.updateWorldMatrix(true, false)
  const c = GRILL_COUNTERS[0]
  const dirOf = (d: THREE.Vector3) => { const o = g.localToWorld(fromBar(c.at.clone())), t = g.localToWorld(fromBar(c.at.clone().add(d))); return t.sub(o).setY(0).normalize() }
  const U = dirOf(c.along), V = dirOf(c.lay)
  const CELL = 0.05, N = Math.round((2 * R) / CELL)
  const occ = new Uint8Array(N * N)
  // (each square's mesh, its place in `meshes` one on; the one being looked into now)
  const own = owners ? new Int32Array(N * N) : null
  let cur = 0
  const lo = floorY + bottom, hi = floorY + top
  // (the raised floor's rectangle in squares of the map (u, v), and the band over both floors)
  const dy = raised?.dy ?? 0
  let ru0 = 0, ru1 = -1, rv0 = 0, rv1 = -1
  if (raised) {
    const us: number[] = [], vs: number[] = []
    for (const a of raised.along) for (const l of raised.lay) {
      const w = g.localToWorld(fromBar(c.at.clone().addScaledVector(c.along, a).addScaledVector(c.lay, l).setY(0)))
      us.push(((w.x - c0.x) * U.x + (w.z - c0.z) * U.z + R) / CELL); vs.push(((w.x - c0.x) * V.x + (w.z - c0.z) * V.z + R) / CELL)
    }
    ru0 = Math.min(...us); ru1 = Math.max(...us); rv0 = Math.min(...vs); rv1 = Math.max(...vs)
  }
  const loAll = Math.min(lo, lo + dy), hiAll = Math.max(hi, hi + dy)
  const E1 = new THREE.Vector3(), E2 = new THREE.Vector3(), WB = new THREE.Box3(), WS = new THREE.Sphere()
  // (the square's reach in the world, the box round its corners: a mesh's box clear of it isn't looked into)
  let sx0 = Infinity, sx1 = -Infinity, sz0 = Infinity, sz1 = -Infinity
  for (const ka of [-R, R]) for (const kb of [-R, R]) {
    const x = c0.x + U.x * ka + V.x * kb, z = c0.z + U.z * ka + V.z * kb
    sx0 = Math.min(sx0, x); sx1 = Math.max(sx1, x); sz0 = Math.min(sz0, z); sz1 = Math.max(sz1, z)
  }
  const mark = (i: number, j: number) => { if (i >= 0 && j >= 0 && i < N && j < N) { occ[j * N + i] = 1; if (own) own[j * N + i] = cur } }
  // (a triangle's edges, stepped along at half a square, and its inside where it isn't edge-on from above)
  const seg = (ax: number, ay: number, bx: number, by: number) => {
    const k = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) * 2))
    for (let q = 0; q <= k; q++) mark(Math.floor(ax + ((bx - ax) * q) / k), Math.floor(ay + ((by - ay) * q) / k))
  }
  // (the meshes bedFinds gathered, their matrices as they were drawn last: it isn't made to work them all out again (item 543))
  for (let mi = 0; mi < meshes.length; mi++) {
    const m = meshes[mi]
    cur = mi + 1
    const pos = m.geometry.attributes.position as THREE.BufferAttribute
    // (its box if it has one, or the ball round it the renderer made for culling: 3,340 of the meshes had no box, and making them took 44 ms
    // the first time he went to bed (item 543); one passed that might have been passed by is looked into for nothing, no more)
    const gb = m.geometry.boundingBox
    if (gb) {
      WB.copy(gb).applyMatrix4(m.matrixWorld)
      if (WB.max.y < loAll || WB.min.y > hiAll || WB.distanceToPoint(c0) > R * 1.5 || WB.max.x < sx0 || WB.min.x > sx1 || WB.max.z < sz0 || WB.min.z > sz1) continue
    } else {
      if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere()
      WS.copy(m.geometry.boundingSphere!).applyMatrix4(m.matrixWorld)
      const r = WS.radius, sc = WS.center
      if (sc.y + r < loAll || sc.y - r > hiAll || sc.distanceTo(c0) - r > R * 1.5 || sc.x + r < sx0 || sc.x - r > sx1 || sc.z + r < sz0 || sc.z - r > sz1) continue
    }
    // (its points' heights first, each once (the same sums as a point's own applyMatrix4); the rest of a point (across the world, and across
    // the map in squares (u, v)) only for a triangle in the band, once (item 543: most of a merged batch's points are well up off the floor))
    const n = pos.count
    if (FLOOR_PTS.length < 5 * n) { FLOOR_PTS = new Float64Array(5 * n); FLOOR_SEEN = new Int32Array(n) }
    const P = FLOOR_PTS, seen = FLOOR_SEEN, e = m.matrixWorld.elements, stamp = ++FLOOR_STAMP
    // (straight from their array where they lie plain in it, three's getX otherwise (interleaved, or packed small): the same numbers, and
    // the first night's call no longer held up in getX, 27 ms of it (item 543))
    const arr = pos.array, plain = !(pos as unknown as { isInterleavedBufferAttribute?: boolean }).isInterleavedBufferAttribute && !pos.normalized && pos.itemSize === 3
    const affine = e[3] === 0 && e[7] === 0 && e[11] === 0 && e[15] === 1
    const wOf = (x: number, y: number, z: number) => affine ? 1 : 1 / (e[3] * x + e[7] * y + e[11] * z + e[15])
    for (let i = 0; i < n; i++) {
      const x = plain ? arr[3 * i] : pos.getX(i), y = plain ? arr[3 * i + 1] : pos.getY(i), z = plain ? arr[3 * i + 2] : pos.getZ(i)
      P[5 * i + 1] = (e[1] * x + e[5] * y + e[9] * z + e[13]) * wOf(x, y, z)
      if (++work >= 8192) { work = 0; yield }
    }
    const fill = (i: number) => {
      if (seen[i] === stamp) return
      seen[i] = stamp
      const x = plain ? arr[3 * i] : pos.getX(i), y = plain ? arr[3 * i + 1] : pos.getY(i), z = plain ? arr[3 * i + 2] : pos.getZ(i)
      const w = wOf(x, y, z), wx = (e[0] * x + e[4] * y + e[8] * z + e[12]) * w, wz = (e[2] * x + e[6] * y + e[10] * z + e[14]) * w
      const k = 5 * i
      P[k] = wx; P[k + 2] = wz
      P[k + 3] = ((wx - c0.x) * U.x + (wz - c0.z) * U.z + R) / CELL
      P[k + 4] = ((wx - c0.x) * V.x + (wz - c0.z) * V.z + R) / CELL
    }
    const idx = m.geometry.index, ix = idx?.array, cnt = idx ? idx.count : n
    for (let t = 0; t + 2 < cnt; t += 3) {
      if (++work >= 8192) { work = 0; yield }
      const ia = ix ? ix[t] : t, ib = ix ? ix[t + 1] : t + 1, ic = ix ? ix[t + 2] : t + 2
      const a = 5 * ia, b = 5 * ib, d = 5 * ic
      const y0 = Math.min(P[a + 1], P[b + 1], P[d + 1]), y1 = Math.max(P[a + 1], P[b + 1], P[d + 1])
      if (y1 < loAll || y0 > hiAll) continue
      fill(ia); fill(ib); fill(ic)
      // (on the raised floor (its middle): its band, and its floor, a step up)
      let fl = floorY
      if (raised) {
        const cu = (P[a + 3] + P[b + 3] + P[d + 3]) / 3, cv = (P[a + 4] + P[b + 4] + P[d + 4]) / 3
        const up = cu > ru0 && cu < ru1 && cv > rv0 && cv < rv1
        if (up) fl = floorY + dy
        if (y1 < (up ? lo + dy : lo) || y0 > (up ? hi + dy : hi)) continue
      }
      // (a flat face low down is a floor's, the kitchen's or the room's, or a mat or a shadow on one: not in the way. Up to 20 cm over the
      // floor it's on: the kitchen's is 16 over the room's, a mat on it 2 or 3 (item 545: it was 25, and a board 9 cm high on the kitchen's
      // floor had its top at exactly that, the room's merged copy of it (its points kept to float32) on one side of it and the board itself
      // on the other: its top's diagonal across the map one way and not the other)
      if (y1 < fl + 0.2) {
        E1.set(P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2])
        E2.set(P[d] - P[a], P[d + 1] - P[a + 1], P[d + 2] - P[a + 2])
        if (Math.abs(E1.cross(E2).normalize().y) > 0.9) continue
      }
      const au = P[a + 3], av = P[a + 4], bu = P[b + 3], bv = P[b + 4], du = P[d + 3], dv = P[d + 4]
      const fi0 = Math.floor(Math.min(au, bu, du)), fi1 = Math.floor(Math.max(au, bu, du)), fj0 = Math.floor(Math.min(av, bv, dv)), fj1 = Math.floor(Math.max(av, bv, dv))
      // (within one square: that square, all its edges would mark; off the map altogether: nothing)
      if (fi0 === fi1 && fj0 === fj1) { mark(fi0, fj0); continue }
      if (fi1 < 0 || fj1 < 0 || fi0 >= N || fj0 >= N) continue
      seg(au, av, bu, bv); seg(bu, bv, du, dv); seg(du, dv, au, av)
      if (Math.abs((bu - au) * (dv - av) - (du - au) * (bv - av)) < 0.5) continue
      const i0 = Math.max(0, fi0), i1 = Math.min(N - 1, fi1), j0 = Math.max(0, fj0), j1 = Math.min(N - 1, fj1)
      for (let jj = j0; jj <= j1; jj++) for (let ii = i0; ii <= i1; ii++) {
        const x = ii + 0.5, y = jj + 0.5
        const s1 = (bu - au) * (y - av) - (x - au) * (bv - av), s2 = (du - bu) * (y - bv) - (x - bu) * (dv - bv), s3 = (au - du) * (y - dv) - (x - du) * (av - dv)
        if ((s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0)) { occ[jj * N + ii] = 1; if (own) own[jj * N + ii] = cur }
      }
    }
    yield
  }
  // (its sums, for any rectangle of it at once)
  const sum = new Uint32Array((N + 1) * (N + 1))
  for (let jj = 0; jj < N; jj++) for (let ii = 0; ii < N; ii++) sum[(jj + 1) * (N + 1) + ii + 1] = occ[jj * N + ii] + sum[jj * (N + 1) + ii + 1] + sum[(jj + 1) * (N + 1) + ii] - sum[jj * (N + 1) + ii]
  const taken = (u0: number, u1: number, v0: number, v1: number) => {
    const ia = Math.floor((u0 + R) / CELL), ib = Math.ceil((u1 + R) / CELL), ja = Math.floor((v0 + R) / CELL), jb = Math.ceil((v1 + R) / CELL)
    if (ia < 0 || ja < 0 || ib > N || jb > N) return true
    return sum[jb * (N + 1) + ib] - sum[ja * (N + 1) + ib] - sum[jb * (N + 1) + ia] + sum[ja * (N + 1) + ia] > 0
  }
  // (item 629: a mesh in a rectangle of it, the first square's of it that's taken; none asked for, or nothing there: null)
  const whose = (u0: number, u1: number, v0: number, v1: number): THREE.Mesh | null => {
    if (!own) return null
    const ia = Math.max(0, Math.floor((u0 + R) / CELL)), ib = Math.min(N, Math.ceil((u1 + R) / CELL)), ja = Math.max(0, Math.floor((v0 + R) / CELL)), jb = Math.min(N, Math.ceil((v1 + R) / CELL))
    for (let jj = ja; jj < jb; jj++) for (let ii = ia; ii < ib; ii++) { const k = own[jj * N + ii]; if (k) return meshes[k - 1] ?? null }
    return null
  }
  const at = (u: number, v: number) => c0.clone().addScaledVector(U, u).addScaledVector(V, v)
  // (in the shop: in the room's floor (its rectangle), all on the one floor, the kitchen's or the room's)
  const rm = roomOf(GRILL_COUNTERS)
  const bar = (w: THREE.Vector3) => toBar(g.worldToLocal(w.clone()))
  const inRoom = (w: THREE.Vector3) => {
    const dd = bar(w).sub(c.at), al = dd.dot(c.along), ly = dd.dot(c.lay)
    return al > rm.along[0] + 0.02 && al < rm.along[1] - 0.02 && ly > rm.lay[0] + 0.02 && ly < rm.lay[1] - 0.02
  }
  const level = (w: THREE.Vector3) => inKitchen(GRILL_COUNTERS, bar(w))
  if (import.meta.env.DEV) (window as unknown as { __futonMap?: unknown }).__futonMap = { N, occ, c0: c0.toArray(), U: U.toArray(), V: V.toArray(), R, CELL }
  return { U, V, R, taken, at, inRoom, level, whose }
}
function floorMap(meshes: THREE.Mesh[], g: THREE.Object3D, c0: THREE.Vector3, floorY: number, R = 4.5, top = 0.6) {
  const it = floorMapSteps(meshes, g, c0, floorY, R, top)
  let r = it.next()
  while (!r.done) r = it.next()
  return r.value
}
type FloorMap = ReturnType<typeof floorMap>
/** where the futon lies clear on a map, its middle at (u, v) and its length's way (du, dv) one of the room's four: the futon and a hand's
 * margin clear and in the shop on the one floor, and the spot before its foot he steps up from; and nothing of it in `keepOut` (the map's
 * rectangles: before a door) */
function futonFits(f: FloorMap, u: number, v: number, du: number, dv: number, keepOut: [number, number, number, number][] = [], tall: FloorMap | null = null) {
  const half = FUTON.L * GRILL_SCALE / 2, wide = FUTON.W * GRILL_SCALE / 2 + 0.06
  const eu = du ? half + 0.06 : wide, ev = dv ? half + 0.06 : wide
  if (f.taken(u - eu, u + eu, v - ev, v + ev)) return null
  if (keepOut.some(([u0, u1, v0, v1]) => u + eu > u0 && u - eu < u1 && v + ev > v0 && v - ev < v1)) return null
  const bu = u + du * (half + 0.8), bv = v + dv * (half + 0.8)
  if (f.taken(bu - 0.15, bu + 0.15, bv - 0.15, bv + 0.15)) return null
  const m = f.at(u, v), before = f.at(bu, bv)
  // (and that spot clear up to his height (the shop's map, his: item 652, the Tester window's: laid by the side counter, he stood up to fold it
  // under its top, 1.2 m up, and through a stool's seat going back)
  if (tall) {
    const q = before.clone().sub(tall.at(0, 0)), tu = q.dot(tall.U), tv = q.dot(tall.V)
    if (tall.taken(tu - 0.15, tu + 0.15, tv - 0.15, tv + 0.15)) return null
  }
  const corners = [-1, 1].flatMap((su) => [-1, 1].map((sv) => f.at(u + su * eu, v + sv * ev)))
  if (![m, ...corners, before].every(f.inRoom)) return null
  const lv = f.level(m)
  if (!corners.every((q) => f.level(q) === lv) || f.level(before) !== lv) return null
  return { foot: f.at(u + du * half, v + dv * half), head: f.at(u - du * half, v - dv * half), before }
}
/** what the boss's way to bed goes by, found in one walk round the scene (item 543: a walk round it for each, eight thousand things a walk) */
type BedFinds = { door: THREE.Object3D | null; fridge: THREE.Object3D | null
  /** the meshes a floor map looks at: drawn, not people (skinned) or many at once (instanced), not the futon, not unseen */
  meshes: THREE.Mesh[] }
/** (item 652, the Tester window's) one of the people, the root of them and all they have on them: a customer's own (`guest`), a server's
 * or a cook's (`staffId`, `broom`), the owner's (BossFollow), the kitchen's people, those waiting on the bench and the takeaway's (FIGURES);
 * and what hangs on a bone (a hat, a phone, an umbrella) */
/** (dev: `__bossWay.seated.on = false` to see his way home made as it was, past those sat at the bar (item 659a); `.step = false`, his step to
 * where he comes down as it was, past whoever's on the way) */
const SEATED_WAY = { on: true, step: true }
const isFolk = (o: THREE.Object3D) => (o as THREE.Bone).isBone || o.userData.guest !== undefined || o.userData.staffId !== undefined
  || o.userData.broom !== undefined || o.name === 'BossFollow' || FIGURES.has(o)
/** (item 652) not on the floor as furniture: one of the people or on them (a map made with them in it kept each where they stood as it was
 * made: the owner's own 9 meshes, the staff's 65, the customers' 55 open, the owner let go by one put down where they'd stood, the Tester
 * window's), or in a group put away (a server not on tonight, their tray at their place); a wall hidden while the camera's round behind it is
 * there all the same */
const offTheFloor = (m: THREE.Object3D) => {
  for (let q: THREE.Object3D | null = m; q; q = q.parent) {
    if (isFolk(q)) return true
    if (q !== m && !q.visible && !q.userData.hideRoot) return true
  }
  return false
}
function bedFinds(scene: THREE.Object3D): BedFinds {
  const f: BedFinds = { door: null, fridge: null, meshes: [] }
  scene.traverse((q) => {
    if (q.name === 'staff-door') f.door ??= q
    else if (q.name === 'look-fridge') f.fridge ??= q
    const m = q as THREE.Mesh
    if (!m.isMesh || (m as THREE.SkinnedMesh).isSkinnedMesh || (m as THREE.InstancedMesh).isInstancedMesh || !m.visible || /^Futon/.test(m.name)) return
    if (!m.geometry?.attributes.position) return
    if (([] as THREE.Material[]).concat(m.material).every((x) => x.transparent && x.opacity < 0.05)) return
    // (nor the ink lines' hulls: a hair bigger than the piece they're drawn round, which marks its own place; and merged with the room, as in
    // service, pushed out by their width as they're kept (scene/WorldBatch's pushedOut), as they're not drawn alone: the room's map a few
    // squares fuller merged than not round the women's toilet (item 545), and their triangles as many again as the pieces')
    if (([] as THREE.Material[]).concat(m.material).every(isInk)) return
    // (nor what's drawn see-through over what's there and not in the depth: the soft shades on the floor round every piece's foot (scene's
    // ContactShades, made again 2.5 s and 9 s in, its points not the same twice), a glow: the Tester window's (item 652): the shades marked
    // the floor a hand round the tables' edges, and the same let-go came down somewhere else each time the page was loaded)
    if (m.name === 'contact-shades' || ([] as THREE.Material[]).concat(m.material).every((x) => x.transparent && !x.depthWrite)) return
    if (offTheFloor(m)) return
    f.meshes.push(m)
  })
  return f
}
export const BossBedWays = memo(function BossBedWays({ open, research }: { open: boolean; research: boolean }) {
  const ref = useRef<THREE.Group>(null)
  const scene = useThree((st) => st.scene)
  // (wanted with the shop open; called, the player come to his fire with it shut (not already there as it shut: the hearth's view where
  // the day was spent, he'd never get to bed))
  useEffect(() => { BOSS_BED.wanted = open }, [open])
  const wasAt = useRef(research)
  useEffect(() => { if (research && !wasAt.current) BOSS_BED.callAt = performance.now(); wasAt.current = research }, [research])
  useEffect(() => {
    BOSS_BED.frame = ref.current
    BOSS_BED.way = (fromGrill) => {
      const g = ref.current
      if (!g) return null
      const finds = bedFinds(scene), sd = finds.door, fr = finds.fridge
      g.updateWorldMatrix(true, false)
      // (item 561, the owner's 「睡覺位置看要不要改在這」 with his box drawn on the floor: along the wall from the staff's door, the other way
      // from the fridges' corner, the futon along the wall (FUTON's out and along); before it, item 480's between the barrel and the rice
      // sacks, full since (item 537), and the stair's foot by the door)
      if (!sd) return null
      sd.updateWorldMatrix(true, false)
      // (the door, the way into the room from it, and along the wall toward the corner (the side wall's way, where the fridges stand), in
      // the bar's frame)
      const bar = (w: THREE.Vector3) => toBar(g.worldToLocal(w.clone()))
      const d = bar(sd.getWorldPosition(new THREE.Vector3())).setY(0)
      const room = bar(sd.localToWorld(new THREE.Vector3(-1, 0, 0))).setY(0).sub(d).normalize()
      const along = new THREE.Vector3(-room.z, 0, room.x)
      if (fr && bar(fr.getWorldPosition(new THREE.Vector3())).setY(0).sub(d).dot(along) < 0) along.negate()
      const mid = d.clone().addScaledVector(room, FUTON.out).addScaledVector(along, FUTON.along)
      let head = mid.clone().addScaledVector(along, FUTON.L / 2), foot = mid.clone().addScaledVector(along, -FUTON.L / 2)
      const onFloor = (v: THREE.Vector3) => { const q = fromBar(v); return q.setY(floorAt(q)) }
      // (item 537: there if it's clear, or the nearest place round it that is (a potted bamboo had come to stand by the door, and laid
      // there it was across the door's way): its length along the wall the first way tried, the strip before the door kept clear for it to
      // be slid open, all of it on the map of what stands there (floorMap))
      let beforeW: THREE.Vector3 | null = null
      {
        const w = (v: THREE.Vector3) => g.localToWorld(onFloor(v))
        const midW = w(mid), f = floorMap(finds.meshes, g, midW, midW.y)
        const toMap = (p: THREE.Vector3) => { const q = p.clone().sub(midW); return [q.dot(f.U), q.dot(f.V)] }
        const alongW = w(mid.clone().add(along)).sub(midW).setY(0).normalize(), roomW = w(mid.clone().add(room)).sub(midW).setY(0).normalize()
        const dW = w(d)
        const door = [dW.clone().addScaledVector(alongW, -0.95), dW.clone().addScaledVector(alongW, 0.95).addScaledVector(roomW, 0.8)].map(toMap)
        const keepOut: [number, number, number, number][] = [[Math.min(door[0][0], door[1][0]), Math.max(door[0][0], door[1][0]), Math.min(door[0][1], door[1][1]), Math.max(door[0][1], door[1][1])]]
        // (its foot toward the corner as it was, then the other ways round)
        const ways = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][])
          .map((k) => ({ k, s: -(f.U.clone().multiplyScalar(k[0]).addScaledVector(f.V, k[1]).dot(alongW)) })).sort((p, q) => q.s - p.s).map((x) => x.k)
        let best: ReturnType<typeof futonFits> = null, bestScore = Infinity
        for (let v = -2.5; v <= 2.5001; v += 0.1) for (let u = -2.5; u <= 2.5001; u += 0.1) {
          for (let k = 0; k < ways.length; k++) {
            const score = Math.hypot(u, v) + k * 0.15
            if (score >= bestScore) continue
            const fit = futonFits(f, u, v, ways[k][0], ways[k][1], keepOut, shopMap)
            if (fit) { best = fit; bestScore = score }
          }
        }
        if (best) {
          const b = (x: THREE.Vector3) => bar(x).setY(0)
          foot = b(best.foot); head = b(best.head); beforeW = best.before
        }
      }
      const out = staffWayOut(GRILL_COUNTERS)
      const across = KITCHEN_ROUTE.route ? KITCHEN_ROUTE.route(toBar(fromGrill), out[0]) : null
      const head0 = across ? [fromGrill.clone(), ...across.slice(1).map((v) => onFloor(v))] : [fromGrill.clone()]
      const c0 = GRILL_COUNTERS[0], gate = gateOf(c0, BAR_GATES[0]).mid
      const aisle = [gate.clone().addScaledVector(c0.lay, -aisleOf(c0)), aisleCornerOf(GRILL_COUNTERS, GRILL_COUNTERS[1])]
      const before = beforeW ? bar(beforeW).setY(0) : foot.clone().addScaledVector(along, -0.4)
      // (from the aisle to the spot before the futon round all that's there on the shop's map, made (roomWay, A*), else straight: item 652,
      // the Tester window's: the futon laid by the side counter, straight from the aisle's corner went through its stools and under its top)
      const roundTo = (from: THREE.Vector3) => {
        const a = g.localToWorld(onFloor(from)), b = g.localToWorld(onFloor(before))
        const w = roomWay(a, b)
        return w ? w.slice(1, -1).map((p) => onFloor(bar(p).setY(0))) : []
      }
      const viaFirst = [...head0, onFloor(out[1]), ...aisle.map(onFloor), ...roundTo(aisle[aisle.length - 1]), onFloor(before), onFloor(foot)]
      // (out by whichever of the bar's two gates is the shorter way to it (item 632, the owner's 「我發現老闆會先到員工專用門在回來，動線條一
      // 下」: it was always the first counter's gate, round the far side of the kitchen to it and back the length of the aisle, 24.6 to a futon
      // 9 away; the side counter's gate's by it)
      const lengthOf = (pts: THREE.Vector3[]) => pts.slice(1).reduce((n, q, i) => n + q.distanceTo(pts[i]), 0)
      let path = viaFirst
      const c1 = GRILL_COUNTERS[1]
      if (c1 && BAR_GATES[1] && KITCHEN_ROUTE.route) {
        const g1 = gateOf(c1, BAR_GATES[1]).mid
        // (in, through and out to the aisle's middle before it turns along it, as by the first gate: straight from its doorway it brushed
        // the stools along the side counter)
        const in1 = g1.clone().addScaledVector(c1.lay, 0.45), out1 = g1.clone().addScaledVector(c1.lay, -0.5), aisle1 = g1.clone().addScaledVector(c1.lay, -aisleOf(c1))
        const across1 = KITCHEN_ROUTE.route(toBar(fromGrill), in1)
        const viaSide = [fromGrill.clone(), ...across1.slice(1).map((v) => onFloor(v)), onFloor(out1), onFloor(aisle1), ...roundTo(aisle1), onFloor(before), onFloor(foot)]
        if (lengthOf(viaSide) < lengthOf(viaFirst) - 0.3) path = viaSide
      }
      // (the staff's door, and the floor just inside the room before it: his way up the stair to the room upstairs (item 637))
      return { path, foot: onFloor(foot), head: onFloor(head), door: onFloor(d.clone().addScaledVector(room, -0.25)), doorFront: onFloor(d.clone().addScaledVector(room, 0.45)) }
    }
    // (item 652, the owner's 「老闆被拖曳是可以放下位置的」: let go off his round's line, he comes down where he's let go, or as near it as he'd
    // stand clear (a stool, a table, a wall there: beside it; the genkan's stone: up on the room's floor by it), on the map of what stands
    // there (floorMap, as the futon's place is found, looked at up to his height); his body's square BOSS_FEET each way, his belly and his
    // hands at his sides: a counter's top or a table's edge not over any of it)
    const BOSS_FEET = 0.16 * GRILL_SCALE, BOSS_TALL = 0.95 * GRILL_SCALE
    // (item 629: a body's middle, knee to chest, over the room's floor (the world's measure), and how far round a way's point the piece
    // it goes through is looked for, to name it)
    const CROSS_BAND: [number, number] = [0.2 * GRILL_SCALE, 0.62 * GRILL_SCALE], CROSS_HALF = 0.025 * GRILL_SCALE
    // (looked for out to his own height round it: let go over the bar's middle, the aisle behind its stools or the kitchen in front of it;
    // the places round it nearest first, the first he'd stand clear at taken (the Optimization window's: the whole square was gone through
    // every time, 32 ms here, some 130 on a slower laptop, right as he was let go))
    const REACH = 1.0 * GRILL_SCALE
    const RING: [number, number][] = []
    for (let v = -REACH; v <= REACH + 1e-4; v += 0.05) for (let u = -REACH; u <= REACH + 1e-4; u += 0.05) if (Math.hypot(u, v) <= REACH) RING.push([u, v])
    RING.sort((a, b) => Math.hypot(a[0], a[1]) - Math.hypot(b[0], b[1]))
    // (and the meshes the map looks at found once, again only once edit mode's changed something, or a minute on (a crate's come since))
    let dropMeshes: THREE.Mesh[] | null = null, dropFound = 0
    const meshesNow = () => {
      if (!dropMeshes || performance.now() - dropFound > 60000) { dropMeshes = bedFinds(scene).meshes; dropFound = performance.now() }
      return dropMeshes.filter((q) => q.parent)
    }
    // (the cook table's guard (HearthGuard's, game/hearthGuard): where the owner mayn't stand at it, his notch his own; a point (the world's)
    // put out of it as the guard would draw him there (the Tester window's: let go over it, he was drawn at its edge, and slid from there
    // through it to where he'd stand, the guard's nearest edge flipped over in a frame: 0.7 m at a stroke))
    const GQ = new THREE.Vector3()
    const tableOf = () => scene.getObjectByName('cook-table-c0')?.parent ?? null
    const guarded = (w: THREE.Vector3, t: THREE.Object3D | null) => {
      if (!t) return false
      const q = t.worldToLocal(GQ.copy(w)), al = q.dot(ALONG), la = q.dot(LAY)
      const [a2, l2] = keepOut(al, la, 'owner', HEARTH_ZONES)
      return a2 !== al || l2 !== la
    }
    // (item 652, the Tester window's: the people where they're drawn now (the world's, on the floor), but him: the map has none of them
    // (they move), so where he'd come down is kept clear of them as they are as he's let go: one of 39 drops onto a person came down on them,
    // 0.00 to 0.05 m from their middle. Clear: his half and theirs)
    const FOLK_CLEAR = 0.5
    // (those sat at the bar, who don't step aside, kept off in the room: his half and a body leaning back off its stool (item 659a); a square
    // that near costs him as much as walking 0.6 m)
    const SEATED_CLEAR = 0.45, SEATED_COST = 6
    // (where he's let down kept further off: his half and theirs, from their body's middle (the Tester window's: a customer sat back at the bar
    // has their body 18 cm off their place; with the soft shades no longer pushing every spot out, he came down on them, 0.5 from their place))
    const DROP_CLEAR = 0.6
    // (each one's body where it is: their FigureHit box, kept at their body's middle every frame, found once for each of them; else their place)
    const bodies = new WeakMap<THREE.Object3D, THREE.Object3D | null>()
    const bodyOf = (o: THREE.Object3D) => {
      let h = bodies.get(o)
      if (h === undefined || (h && !h.parent)) {
        let found: THREE.Object3D | null = null
        o.traverse((q) => { if (!found && q.userData.figureHit) found = q })
        h = found
        bodies.set(o, h)
      }
      return h ?? o
    }
    const folkNow = () => {
      const out: number[] = [], w = new THREE.Vector3()
      for (const [o] of FIGURES) {
        if (!o.parent || !o.visible || o.name === 'BossFollow') continue
        bodyOf(o).getWorldPosition(w)
        out.push(w.x, w.z)
      }
      return out
    }
    /** the customers sat at the bar just now (bar's SEATS_SAT: on their stools, not away at the toilet or the fridge): each one's body where
     * it is (the world's x, z), the figures near a stool that's sat on; `stoolAt` a stool's place (the bar's frame) into the world */
    const seatedNow = (stoolAt: (v: THREE.Vector3) => THREE.Vector3 | null): number[] => {
      if (!SEATED_WAY.on || !SEATS_SAT.size) return []
      const seats = seatsOf(GRILL_COUNTERS)
      const stools = [...SEATS_SAT].map((k) => seats[k] && stoolAt(seats[k].stool)).filter((v): v is THREE.Vector3 => !!v)
      const out: number[] = [], w = new THREE.Vector3()
      for (const [o] of FIGURES) {
        if (!o.parent || !o.visible || o.userData.guest === undefined) continue
        bodyOf(o).getWorldPosition(w)
        if (stools.some((s) => Math.hypot(s.x - w.x, s.z - w.z) < 0.6)) out.push(w.x, w.z)
      }
      return out
    }
    /** whether a straight step from `a` to `b` (the world's) comes nearer one of the people (`folk`: their bodies' x, z) than STEP_CLEAR, or
     * than `a` itself is to them if that's nearer (stepping away from one he's beside is all right, going past them isn't) */
    const STEP_CLEAR = 0.45
    const passesFolk = (a: THREE.Vector3, b: THREE.Vector3, folk: number[]) => {
      const abx = b.x - a.x, abz = b.z - a.z, L2 = abx * abx + abz * abz
      for (let k = 0; k < folk.length; k += 2) {
        const x = folk[k], z = folk[k + 1]
        const t = L2 ? Math.max(0, Math.min(1, ((x - a.x) * abx + (z - a.z) * abz) / L2)) : 0
        const d = Math.hypot(a.x + abx * t - x, a.z + abz * t - z)
        if (d < Math.min(STEP_CLEAR, Math.hypot(a.x - x, a.z - z)) - 1e-3) return true
      }
      return false
    }
    const onFolk = (w: THREE.Vector3, folk: number[], clear = FOLK_CLEAR) => {
      for (let k = 0; k < folk.length; k += 2) if (Math.hypot(folk[k] - w.x, folk[k + 1] - w.z) < clear) return true
      return false
    }
    const unguard = (w: THREE.Vector3, t: THREE.Object3D | null) => {
      if (!t) return w
      const q = t.worldToLocal(w.clone()), al = q.dot(ALONG), la = q.dot(LAY)
      const [a2, l2] = keepOut(al, la, 'owner', HEARTH_ZONES)
      if (a2 === al && l2 === la) return w
      return t.localToWorld(q.addScaledVector(ALONG, a2 - al).addScaledVector(LAY, l2 - la))
    }
    /** where on a map he'd come down, from `from` (the world's, out of the table's guard already): the nearest place round it he'd stand
     * clear at (his body's square clear of all that's there up to his height, in the shop, not in the genkan, on one floor), clear of the
     * table's guard and with his way over to it clear of it too; in the grill's frame on the floor, or null */
    const pick = (f: FloorMap, from: THREE.Vector3, g: THREE.Object3D) => {
      const bar = (w: THREE.Vector3) => toBar(g.worldToLocal(w.clone()))
      const onFloor = (v: THREE.Vector3) => { const q = fromBar(v); return q.setY(floorAt(q)) }
      const t = tableOf(), folk = folkNow()
      const d0 = from.clone().sub(f.at(0, 0)), u0 = d0.dot(f.U), v0 = d0.dot(f.V)
      // (first a place his step to doesn't pass anyone; none round him like that, the nearest as it was (let go in a crowd he's still put down, not sent back to where he was taken from: 23 of 2,255 places across a rush's shop had none that way))
      for (const careful of [true, false]) for (const [du, dv] of RING) {
        const u = u0 + du, v = v0 + dv
        if (f.taken(u - BOSS_FEET, u + BOSS_FEET, v - BOSS_FEET, v + BOSS_FEET)) continue
        const w = f.at(u, v)
        // (not on one of the people)
        if (onFolk(w, folk, DROP_CLEAR)) continue
        const corners = [-1, 1].flatMap((su) => [-1, 1].map((sv) => f.at(u + su * BOSS_FEET, v + sv * BOSS_FEET)))
        if (![w, ...corners].every(f.inRoom) || inGenkan(GRILL_COUNTERS, bar(w))) continue
        const lv = f.level(w)
        if (!corners.every((q) => f.level(q) === lv)) continue
        // (not at the table, nor his way over to it across it)
        if (guarded(w, t)) continue
        // (on the room's floor, only where he can walk home from (a corner shut in by the till's things: the nearest place out of it))
        if (!lv && walk && walk.f === f && walk.reach) {
          const [wi, wj] = walk.ij(w)
          if (wi < -walk.n || wi > walk.n || wj < -walk.n || wj > walk.n || !walk.reach[(wj + walk.n) * walk.W + (wi + walk.n)]) continue
        }
        const steps = Math.ceil(Math.hypot(du, dv) / 0.08)
        let across = false
        for (let k = 1; k < steps && !across; k++) across = guarded(f.at(u0 + (du * k) / steps, v0 + (dv * k) / steps), t)
        if (across) continue
        // (nor his step over to it through one of the people: no nearer to any of them on the way than he was let go, or than STEP_CLEAR
        // (the Tester window's, item 659a: let go 0.57 m behind a customer sat at the bar, too near to come down on, the nearest place found was
        // across the stool, and his step there went 0.13 m from them); a step away from them is all right)
        if (careful && SEATED_WAY.step && folk.length && passesFolk(from, w, folk)) continue
        return onFloor(bar(w).setY(0))
      }
      return null
    }
    // (item 652, the Tester window's: the map of the shop's whole floor made once a while after it's drawn, a few milliseconds a frame (and
    // again after edit mode's changed something), so where he's to come down is known the moment he's let go: worked out then, round where
    // he was let go, he stood there a quarter to half a second (some seconds on a slower laptop), in the serving counter or the low rack)
    let shopMap: FloorMap | null = null, mapJob = 0, mapRaf = 0, mapLater = 0
    const buildShopMap = () => {
      const g = ref.current
      if (!g) return
      const job = ++mapJob
      g.updateWorldMatrix(true, false)
      const c0 = GRILL_COUNTERS[0], rm = roomOf(GRILL_COUNTERS)
      const mid = c0.at.clone().addScaledVector(c0.along, (rm.along[0] + rm.along[1]) / 2).addScaledVector(c0.lay, (rm.lay[0] + rm.lay[1]) / 2).setY(0)
      const q = fromBar(mid)
      // (on the room's floor (the kitchen's is a step up on it: in the band), out over the whole room's floor)
      const centre = g.localToWorld(q.setY(GRILL_OFFSET.y))
      const R = (Math.max(rm.along[1] - rm.along[0], rm.lay[1] - rm.lay[0]) / 2 + 0.4) * GRILL_SCALE
      const mapStart = performance.now()
      // (in the editor a step a frame may take longer: nothing's being served while the pieces are laid out (item 629: the ways' crossings
      // were 3.7 s coming))
      const ed = getEdit(), slice = ed.on ? 8 : 3
      /** a map made a step a frame, then `done` with it */
      const stepped = <M,>(it: Generator<undefined, M>, done: (m: M) => void) => {
        const step = () => {
          if (job !== mapJob) return
          const t = performance.now()
          let r = it.next()
          while (!r.done && performance.now() - t < slice) r = it.next()
          if (!r.done) { mapRaf = requestAnimationFrame(step); return }
          done(r.value)
        }
        mapRaf = requestAnimationFrame(step)
      }
      const walkMap = () => stepped(floorMapSteps(meshesNow(), g, centre, centre.y, R, BOSS_TALL), (m) => {
        shopMap = m
        // (and its walking squares, and the room's floor that's reachable from the gates, the frame after)
        mapRaf = requestAnimationFrame(() => {
          if (job !== mapJob || !shopMap || !ref.current) return
          const t1 = performance.now()
          const wk = makeWalk(shopMap, ref.current)
          wk.reach = reachOf(wk, ref.current)
          walk = wk
          if (import.meta.env.DEV) Object.assign(window, { __mapTimes: { start: mapStart, made: t1, reachMs: performance.now() - t1 } })
        })
      })
      // (item 629: and, the editor's map of the ways shown, the floor at a body's middle height first: what a way goes through, named
      // there. Only then: in the editor the room's merge is let go of (scene/WorldBatch), each piece's own meshes there to name it by; and
      // what's drawn and solid only, not the editor's handles, an unseen hit box, a glow; the kitchen's floor a step up, looked at from it)
      if (!ed.on || !ed.paths) { walkMap(); return }
      // (people, what's on them and what's put away are left out of every map (bedFinds' offTheFloor: a server not on tonight, their tray
      // at their place, 5 of the kitchen's ways went "through" it))
      const solid = meshesNow().filter((m) => !m.userData.editHandle
        && !([] as THREE.Material[]).concat(m.material).every((x) => !x.visible || !x.colorWrite || x.opacity <= 0.02 || x.blending === THREE.AdditiveBlending))
      const kr = kitchenOf(GRILL_COUNTERS)
      const kdy = g.localToWorld(new THREE.Vector3(0, GRILL_OFFSET.y - KITCHEN_DROP, 0)).y - g.localToWorld(new THREE.Vector3(0, GRILL_OFFSET.y, 0)).y
      stepped(floorMapSteps(solid, g, centre, centre.y, R, CROSS_BAND[1], CROSS_BAND[0], true, { along: kr.along, lay: kr.lay, dy: kdy }), (cm) => {
        const o = cm.at(0, 0), P = new THREE.Vector3()
        // (a point of the bar's frame on the map: P, from its middle; false with nothing to put it on)
        const onMap = (p: THREE.Vector3) => { const gg = ref.current; if (!gg) return false; gg.localToWorld(P.copy(fromBar(p)).setY(0)).sub(o); return true }
        // (the way's own line in something: the square it's on taken (a way along beside a thing, a hair off it, is not through it))
        FLOOR_CHECK.inSomething = (p) => {
          if (!onMap(p)) return false
          const u = P.dot(cm.U), v = P.dot(cm.V)
          return cm.taken(u - 1e-4, u + 1e-4, v - 1e-4, v + 1e-4)
        }
        // (and the piece there, a little round it)
        const meshAt = (p: THREE.Vector3) => {
          if (!onMap(p)) return null
          const u = P.dot(cm.U), v = P.dot(cm.V)
          return cm.whose(u - CROSS_HALF, u + CROSS_HALF, v - CROSS_HALF, v + CROSS_HALF)
        }
        FLOOR_CHECK.pieceAt = (p) => {
          for (let q: THREE.Object3D | null = meshAt(p); q; q = q.parent) if (q.userData.editId) return String(q.userData.editId)
          return ''
        }
        // (in development: the mesh itself, for the checks; and when it was made)
        if (import.meta.env.DEV) Object.assign(FLOOR_CHECK, { meshAt, madeMs: performance.now() - mapStart })
        FLOOR_CHECK.ver++
        walkMap()
      })
    }
    // (once the page has done loading (scene/Prewarm's warming done: its first frames are paced for its own programs and pictures), when
    // it's idle (the Optimization window's: a fixed six seconds laid it over the loading's pacing))
    const idleThen = (f: () => void) => {
      const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback
      if (ric) ric(f, { timeout: 2000 })
      else mapLater = window.setTimeout(f, 200)
    }
    const unwarm = whenWarm(() => idleThen(buildShopMap))
    // (made again only when what's on the floor may have changed: a piece moved, turned, sized, grouped, hidden; edit mode or the paths'
    // map shown or put away; not as a tool's picked or a piece selected (the Tester window's (item 629): each of those made both maps again,
    // twice over, and the ways' "through" tags went missing now and then). The edit state's parts are replaced whole when they change)
    const floorSig = () => { const e = getEdit(); return [e.on, e.paths, e.offsets, e.rotations, e.scales, e.groups, e.pivots, e.hidden] as const }
    let lastSig = floorSig()
    const unsub = subscribeEdit(() => {
      const sig = floorSig()
      if (sig.every((v, k) => v === lastSig[k])) return
      lastSig = sig
      dropMeshes = null; shopMap = null; walk = null; mapJob++
      // (the map of what a way goes through let go of with its functions, the dev check's too: its squares' meshes (a quarter of a megabyte)
      // kept by nothing once the paths' map is put away (the Optimization window's))
      FLOOR_CHECK.inSomething = null; FLOOR_CHECK.pieceAt = null; FLOOR_CHECK.ver++
      if (import.meta.env.DEV) Object.assign(FLOOR_CHECK, { meshAt: null })
      cancelAnimationFrame(mapRaf); window.clearTimeout(mapLater)
      // (in the editor at once, a step a frame: the page isn't idle while it's drawn, and the ways' crossings waited 2 s for it (item 629))
      mapLater = getEdit().on ? window.setTimeout(buildShopMap, 300) : window.setTimeout(() => idleThen(buildShopMap), 600)
    })
    BOSS_BED.drop = (atGrill, done) => {
      const g = ref.current
      if (!g) { done(null); return () => {} }
      g.updateWorldMatrix(true, false)
      const onFloor = (v: THREE.Vector3) => { const q = fromBar(v); return q.setY(floorAt(q)) }
      // (out of the table's guard first, where it would draw him)
      const p = unguard(g.localToWorld(onFloor(toBar(atGrill).setY(0))), tableOf())
      // (the shop's map made: at once)
      if (shopMap) { done(pick(shopMap, p, g)); return () => {} }
      // (not yet (just loaded, or edit mode's just changed something): down where he's held (out of the table's guard), nothing gone through
      // for it (the Optimization window's); there only on the shop's floor, not in the genkan, not on one of the people, or back to his place
      // (the Tester window's: asked before the map was made, the genkan, the street and the kitchen's far corner, he'd have stood there))
      const b = toBar(g.worldToLocal(p.clone())).setY(0), c0 = GRILL_COUNTERS[0], rm = roomOf(GRILL_COUNTERS)
      const al = b.clone().sub(c0.at).dot(c0.along), ly = b.clone().sub(c0.at).dot(c0.lay)
      const onShop = al > rm.along[0] + 0.1 && al < rm.along[1] - 0.1 && ly > rm.lay[0] + 0.1 && ly < rm.lay[1] - 0.1
      done(onShop && !inGenkan(GRILL_COUNTERS, b) && !onFolk(p, folkNow(), DROP_CLEAR) ? g.worldToLocal(p.clone()) : null)
      return () => {}
    }
    /** the room's floor for his walking, on the shop's map: squares of 10 cm, each free if his body (a little narrower than where he'd stand:
     * he goes past things) is clear there, in the room, not in the genkan; worked out as asked and kept; and those he can walk to from the
     * bar's gates (a corner shut in by the till's counter, its stools and the takeaway stand isn't) */
    type Walk = { f: FloorMap; o: THREE.Vector3; n: number; W: number; free: (i: number, j: number) => boolean; ij: (w: THREE.Vector3) => [number, number]; reach: Int8Array | null }
    const WALK_STEP = 0.1
    const makeWalk = (f: FloorMap, g: THREE.Object3D): Walk => {
      const H = BOSS_FEET * 0.8, n = Math.floor((f.R - H) / WALK_STEP), W = 2 * n + 1
      const o = f.at(0, 0), memo = new Int8Array(W * W)
      const free = (i: number, j: number) => {
        if (i < -n || i > n || j < -n || j > n) return false
        const k = (j + n) * W + (i + n)
        if (memo[k]) return memo[k] > 0
        const u = i * WALK_STEP, v = j * WALK_STEP, w = f.at(u, v)
        const ok = !f.taken(u - H, u + H, v - H, v + H) && f.inRoom(w) && !inGenkan(GRILL_COUNTERS, toBar(g.worldToLocal(w)))
        memo[k] = ok ? 1 : -1
        return ok
      }
      // (from a spare: asked each frame for those stepping aside (item 659))
      const ij = (w: THREE.Vector3): [number, number] => { const d = WALK_IJ.copy(w).sub(o); return [Math.round(d.dot(f.U) / WALK_STEP), Math.round(d.dot(f.V) / WALK_STEP)] }
      return { f, o, n, W, free, ij, reach: null }
    }
    /** the nearest free square to one, within `r` squares (null if none) */
    const nearestFree = (wk: Walk, i0: number, j0: number, r: number): [number, number] | null => {
      if (wk.free(i0, j0)) return [i0, j0]
      let best = Infinity, at: [number, number] | null = null
      for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        const d = Math.hypot(di, dj)
        if (d < best && wk.free(i0 + di, j0 + dj)) { best = d; at = [i0 + di, j0 + dj] }
      }
      return at
    }
    /** the room's floor he can walk to from the bar's gates (out in the aisle before each): spread out square by square from them */
    const reachOf = (wk: Walk, g: THREE.Object3D) => {
      const onFloor = (v: THREE.Vector3) => { const q = fromBar(v); return q.setY(floorAt(q)) }
      const reach = new Int8Array(wk.W * wk.W), queue: number[] = []
      for (let k = 0; k < Math.min(GRILL_COUNTERS.length, BAR_GATES.length); k++) {
        const c = GRILL_COUNTERS[k], lane = gateOf(c, BAR_GATES[k]).mid.setY(0).addScaledVector(c.lay, -aisleOf(c))
        const [i0, j0] = wk.ij(g.localToWorld(onFloor(lane)))
        const at = nearestFree(wk, i0, j0, 6)
        if (at) { const key = (at[1] + wk.n) * wk.W + (at[0] + wk.n); if (!reach[key]) { reach[key] = 1; queue.push(key) } }
      }
      while (queue.length) {
        const key = queue.pop()!, i = (key % wk.W) - wk.n, j = Math.floor(key / wk.W) - wk.n
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const i2 = i + di, j2 = j + dj
          if (!wk.free(i2, j2)) continue
          const k2 = (j2 + wk.n) * wk.W + (i2 + wk.n)
          if (reach[k2]) continue
          reach[k2] = 1
          queue.push(k2)
        }
      }
      return reach
    }
    let walk: Walk | null = null
    // (item 659: where one could stand, on its squares: for those stepping aside for him as he walks home)
    BOSS_BED.clear = (w, half) => {
      if (half === undefined) { if (!walk) return false; const [i, j] = walk.ij(w); return walk.free(i, j) }
      const f = walk?.f, g = ref.current
      if (!f || !g) return false
      const d = WALK_IJ.copy(w).sub(walk!.o), u = d.dot(f.U), v = d.dot(f.V)
      return !f.taken(u - half, u + half, v - half, v + half) && f.inRoom(w) && !inGenkan(GRILL_COUNTERS, toBar(g.worldToLocal(WALK_IJ.copy(w))))
    }
    /** a way across the room's floor on the shop's map (item 652, the Tester window's: from by the till, straight to the aisle he went through
     * it): from `a` to `b` (the world's), on the free squares, eight ways from each (A*), then drawn straight where nothing's between (the
     * corners it turns at); the end's own square taken, from the nearest free one; null with no map yet or no way */
    const roomWay = (a: THREE.Vector3, b: THREE.Vector3, avoid?: number[] | null): THREE.Vector3[] | null => {
      const wk = walk
      if (!wk) return null
      const { f, n, W, free } = wk
      const end = wk.ij(b)
      const goal = nearestFree(wk, end[0], end[1], 6)
      if (!goal) return null
      const [ib, jb] = goal
      // (and from the nearest free square to where he is, as to where he's going (item 659a, the Tester window's: come down where the
      // squares round him were all taken (between a stool and the bar), no way was found, and his first stretch home went straight, past a
      // customer sat there 0.02 m from them))
      const start = nearestFree(wk, ...wk.ij(a), 6)
      if (!start) return null
      const [ia, ja] = start
      // (round those not stepping aside for him (item 659a, the Tester window's: customers sat at the bar; his way, made on the map with no one
      // on it, cut past the bar's end seats 0.12 m from them): the squares within SEATED_CLEAR of each (`avoid`: their bodies, the world's x, z)
      // marked once, dearer to walk through (SEATED_COST a square, so he goes round if there's a way round, and past them only if there's none),
      // and no straight line drawn across them)
      let heavy: Uint8Array | null = null
      if (avoid?.length) {
        heavy = new Uint8Array(W * W)
        const R = SEATED_CLEAR / WALK_STEP, Rc = Math.ceil(R), q = new THREE.Vector3()
        for (let k = 0; k < avoid.length; k += 2) {
          const [ci, cj] = wk.ij(q.set(avoid[k], a.y, avoid[k + 1]))
          for (let dj = -Rc; dj <= Rc; dj++) for (let di = -Rc; di <= Rc; di++) {
            const i = ci + di, j = cj + dj
            if (Math.hypot(di, dj) > R || i < -n || i > n || j < -n || j > n) continue
            heavy[(j + n) * W + (i + n)] = 1
          }
        }
      }
      // (A*: a heap of the squares to look at by how far they've come and how far there is to go)
      const cost = new Float32Array(W * W).fill(Infinity), from = new Int32Array(W * W).fill(-1)
      const heap: [number, number][] = []
      const push = (k: number, pr: number) => { heap.push([pr, k]); let c = heap.length - 1; while (c > 0) { const pp = (c - 1) >> 1; if (heap[pp][0] <= heap[c][0]) break; [heap[pp], heap[c]] = [heap[c], heap[pp]]; c = pp } }
      const pop = () => { const top = heap[0], last = heap.pop()!; if (heap.length) { heap[0] = last; let c = 0; for (;;) { const l = 2 * c + 1, r = l + 1; let m = c; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m } } return top[1] }
      const key = (i: number, j: number) => (j + n) * W + (i + n)
      const ka = key(ia, ja), kb = key(ib, jb)
      cost[ka] = 0
      push(ka, Math.hypot(ib - ia, jb - ja))
      let found = false, looked = 0
      while (heap.length && looked < 60000) {
        const k = pop()
        looked++
        if (k === kb) { found = true; break }
        const i = (k % W) - n, j = Math.floor(k / W) - n
        for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
          if (!di && !dj) continue
          const i2 = i + di, j2 = j + dj
          if (!free(i2, j2)) continue
          if (di && dj && (!free(i + di, j) || !free(i, j + dj))) continue
          const k2 = key(i2, j2), c2 = cost[k] + (di && dj ? Math.SQRT2 : 1) + (heavy?.[k2] ? SEATED_COST : 0)
          if (c2 >= cost[k2]) continue
          cost[k2] = c2; from[k2] = k
          push(k2, c2 + Math.hypot(ib - i2, jb - j2))
        }
      }
      if (!found) return null
      const cells: [number, number][] = []
      for (let k = kb; k >= 0; k = from[k]) cells.push([(k % W) - n, Math.floor(k / W) - n])
      cells.reverse()
      // (straight where nothing's between: from each corner, on to the furthest square it can see)
      const sees = (p: [number, number], q: [number, number]) => {
        const steps = Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) * 2)
        for (let k = 1; k < steps; k++) {
          const i = Math.round(p[0] + ((q[0] - p[0]) * k) / steps), j = Math.round(p[1] + ((q[1] - p[1]) * k) / steps)
          if (!free(i, j) || heavy?.[key(i, j)]) return false
        }
        return true
      }
      const out: THREE.Vector3[] = [a.clone()]
      let at = 0
      while (at < cells.length - 1) {
        let next = at + 1
        for (let k = cells.length - 1; k > at + 1; k--) if (sees(cells[at], cells[k])) { next = k; break }
        out.push(f.at(cells[next][0] * WALK_STEP, cells[next][1] * WALK_STEP))
        at = next
      }
      out.push(b.clone())
      return out
    }
    if (import.meta.env.DEV) Object.assign(window, { __bossWay: { roomWay, map: () => shopMap, walk: () => walk, seated: SEATED_WAY, folkNow, seatedNow: () => seatedNow((v) => (ref.current ? ref.current.localToWorld(fromBar(v).setY(0)) : null)) } })
    BOSS_BED.home = (fromGrill, toGrill) => {
      const route = KITCHEN_ROUTE.route
      if (!route) return null
      const onFloor = (v: THREE.Vector3) => { const q = fromBar(v); return q.setY(floorAt(q)) }
      const cs = GRILL_COUNTERS, P = toBar(fromGrill).setY(0), H = toBar(toGrill).setY(0)
      // (item 652, the Tester window's: round the kitchen's people where they stand (past the gate he went through the server at their post,
      // 7 runs in 9, and through a cook at his station): where his way goes within FOLK_CLEAR of one, two corners put in beside them on
      // whichever side's free on the shop's map (and out of the table's guard), as far out as there's room for, a little if no more; and of
      // the two gates' ways, the one that goes through none of them, the other's walk up to PASS_COST longer; the bar's frame)
      const g0 = ref.current, wk0 = walk, t0 = tableOf(), clear = FOLK_CLEAR / GRILL_SCALE, PASS_COST = 3
      // (the kitchen's people where they stand (not by his place: he stands in among them at the table))
      const folk: THREE.Vector3[] = []
      if (g0) {
        const fw = folkNow()
        for (let k = 0; k < fw.length; k += 2) {
          const q = toBar(g0.worldToLocal(new THREE.Vector3(fw[k], 0, fw[k + 1]))).setY(0)
          if (inKitchen(cs, q) && q.distanceTo(H) > clear) folk.push(q)
        }
      }
      const aside = (pts: THREE.Vector3[], from: number) => {
        if (!g0 || !wk0 || !folk.length) return pts
        const freeAt = (v: THREE.Vector3) => { const w = g0.localToWorld(onFloor(v)); const [i, j] = wk0.ij(w); return wk0.free(i, j) && !guarded(w, t0) }
        // (a line clear on the map; but within `ends` of an end that's on the way already (the gate's mouth, his notch at the table: not
        // free squares for his walking, and walked through all the same))
        const clearLine = (a: THREE.Vector3, b: THREE.Vector3, endA = 0, endB = 0) => {
          const L = a.distanceTo(b), n = Math.max(1, Math.ceil(L / 0.04))
          for (let k = 0; k <= n; k++) {
            const d = (L * k) / n
            if (d < endA || L - d < endB) continue
            if (!freeAt(a.clone().lerp(b, k / n))) return false
          }
          return true
        }
        // (each leg from where the way's got to: the first of them along it (past its start, not yet gone round) gone round, and on from
        // there; each of them once)
        const out = pts.slice(0, from + 1), done = new Set<THREE.Vector3>()
        let s = from + 1
        for (let n = 0; s < pts.length && n < 64; n++) {
          const a = out[out.length - 1], b = pts[s], ab = b.clone().sub(a), len = ab.length()
          let round: THREE.Vector3[] | null = null
          if (len > 1e-6) {
            const t = ab.clone().divideScalar(len), nrm = new THREE.Vector3(-t.z, 0, t.x)
            let best: { q: THREE.Vector3; k: number; e: number } | null = null
            for (const q of folk) {
              if (done.has(q)) continue
              const k = q.clone().sub(a).dot(t), e = q.clone().sub(a).dot(nrm)
              if (k < 0.02 || k > len || Math.abs(e) >= clear) continue
              if (!best || k < best.k) best = { q, k, e }
            }
            if (best) {
              done.add(best.q)
              const at = a.clone().addScaledVector(t, best.k)
              for (const frac of [1, 0.75, 0.55]) {
                for (const sd of best.e >= 0 ? [-1, 1] : [1, -1]) {
                  // (the way that far from them, on that side of them)
                  const off = best.e + sd * clear * frac
                  const c1 = at.clone().addScaledVector(t, -Math.min(clear, best.k * 0.5)).addScaledVector(nrm, off)
                  const c2 = at.clone().addScaledVector(t, Math.min(clear, (len - best.k) * 0.5)).addScaledVector(nrm, off)
                  if (clearLine(a, c1, 0.1) && clearLine(c1, c2) && clearLine(c2, b, 0, 0.1)) { round = [c1, c2]; break }
                }
                if (round) break
              }
            }
          }
          if (round) out.push(...round)
          else { out.push(b); s++ }
        }
        for (; s < pts.length; s++) out.push(pts[s])
        return out
      }
      /** how many of them a way goes through still (a body's width or less from it, past `from`) */
      const through = (pts: THREE.Vector3[], from: number) => folk.filter((q) => {
        for (let i = Math.max(1, from + 1); i < pts.length; i++) {
          const a = pts[i - 1], ab = pts[i].clone().sub(a), L2 = ab.lengthSq()
          const k = L2 ? Math.max(0, Math.min(1, q.clone().sub(a).dot(ab) / L2)) : 0
          if (a.clone().addScaledVector(ab, k).distanceTo(q) < clear * 0.6) return true
        }
        return false
      }).length
      if (inKitchen(cs, P)) return [fromGrill.clone(), ...aside([P, ...route(P, H).slice(1)], 0).slice(1).map(onFloor)]
      // (out in the room: square onto the aisle he's by (the first counter's or the side counter's, whichever's nearer), along it (round the
      // corner where the two meet, if the gate's on the other), out to the gate, in through it, and across the kitchen to his place; the
      // place on the aisle kept to its length, from where the two aisles meet to the counter's end (the Tester window's: from by the genkan,
      // square onto the first counter's aisle was out past its end at the front door, the doorway's guard pulling him 1.6 m in a frame))
      const corner = cs.length > 1 ? aisleCornerOf(cs, cs[1]).setY(0) : null
      const onAisle = (c: Counter, q: THREE.Vector3) => {
        const tc = corner ? corner.clone().sub(c.at).dot(c.along) : -c.length / 2
        const lo = Math.min(tc, -c.length / 2), hi = Math.max(tc, c.length / 2)
        const t = Math.max(lo, Math.min(hi, q.clone().sub(c.at).dot(c.along)))
        return c.at.clone().addScaledVector(c.along, t).addScaledVector(c.lay, -aisleOf(c)).setY(0)
      }
      const off = (c: Counter) => Math.abs(P.clone().sub(c.at).dot(c.lay) + aisleOf(c))
      const near = cs.length > 1 && off(cs[1]) < off(cs[0]) ? 1 : 0
      const lengthOf = (pts: THREE.Vector3[]) => pts.slice(1).reduce((n, q, i) => n + q.distanceTo(pts[i]), 0)
      // (the room's part on the shop's map when it's made, round all that's there; else square onto the aisle and along it)
      const g = ref.current
      const world = (v: THREE.Vector3) => (g ? g.localToWorld(onFloor(v)) : null)
      const barOf = (w: THREE.Vector3) => (g ? toBar(g.worldToLocal(w.clone())).setY(0) : w)
      let path: THREE.Vector3[] | null = null, pathCost = Infinity
      // (the customers sat at the bar kept off in the room's part (item 659a): they don't step aside for him)
      const sat = seatedNow((v) => world(v))
      for (let k = 0; k < Math.min(cs.length, BAR_GATES.length); k++) {
        const c = cs[k], mid = gateOf(c, BAR_GATES[k]).mid.setY(0)
        const lane = mid.clone().addScaledVector(c.lay, -aisleOf(c)), out = mid.clone().addScaledVector(c.lay, -0.5), inn = mid.clone().addScaledVector(c.lay, 0.45)
        const wa = world(P), wb = world(lane)
        const across = wa && wb ? roomWay(wa, wb, sat) : null
        const to = across ? across.slice(1).map(barOf) : near === k || !corner ? [onAisle(c, P), lane] : [onAisle(cs[near], P), corner, lane]
        const way = aside([P, ...to, out, inn, ...route(inn, H).slice(1)], to.length + 1)
        const cost = lengthOf(way) + PASS_COST * through(way, to.length + 1)
        if (!path || cost < pathCost) { path = way; pathCost = cost }
      }
      return path ? [fromGrill.clone(), ...path.slice(1).map(onFloor)] : null
    }
    return () => { BOSS_BED.way = null; BOSS_BED.frame = null; BOSS_BED.drop = null; BOSS_BED.home = null; BOSS_BED.clear = null; unsub(); unwarm(); mapJob++; cancelAnimationFrame(mapRaf); window.clearTimeout(mapLater); FLOOR_CHECK.inSomething = null; FLOOR_CHECK.pieceAt = null; if (import.meta.env.DEV) Object.assign(FLOOR_CHECK, { meshAt: null }) }
  }, [scene])
  return <group ref={ref} />
})
/**
 * The futon itself (blender/futon.py), where its foot lies (BOSS_BED.futon, the grill's frame, at the bar's size): folded in three at its
 * foot as he brings it, the mattress unrolled along to its head, the pillow put down at its head, the quilt unfolded up over him from his
 * feet to his shoulders; in the morning the quilt thrown back, all of it folded up and the stack gone as he takes it off. Toon-lit as the
 * room; unseen while it's put away.
 */
const FUTON_URL = import.meta.env.BASE_URL + 'models/futon.glb'
useGLTF.preload(FUTON_URL)
export const BossFuton = memo(function BossFuton() {
  const gltf = useGLTF(FUTON_URL) as unknown as { scene: THREE.Group }
  const parts = useMemo(() => {
    const r = (gltf.scene.getObjectByName('FutonRoot') ?? gltf.scene).clone(true)
    r.position.set(0, 0, 0)
    const made = new Map<THREE.Material, THREE.Material>()
    r.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const src = m.material as THREE.MeshStandardMaterial
      let t = made.get(src)
      if (!t) { t = new THREE.MeshToonMaterial({ color: '#ffffff', map: src.map ?? null }); t.name = src.name; made.set(src, t) }
      m.material = t
      m.receiveShadow = true
    })
    inkModel(r, () => false, { width: 0.0009, weld: true })
    const kake = r.getObjectByName('FutonKake')!
    return { r, shiki: r.getObjectByName('FutonShiki')!, kake, pillow: r.getObjectByName('FutonMakura')!,
      pillowAt: r.getObjectByName('FutonMakura')!.position.clone(), kakeMap: ((kake as THREE.Mesh).material as THREE.MeshToonMaterial)?.map ?? null }
  }, [gltf])
  const g = useRef<THREE.Group>(null)
  useFrame(() => {
    const o = g.current, f = BOSS_BED.futon
    if (!o) return
    o.visible = f.on
    if (!f.on) return
    o.position.copy(f.foot)
    o.rotation.y = f.yaw
    // (folded in three at its foot as it comes; unrolled to its head; folded up again in the morning, the stack lifting away as he takes it)
    const ease = (k: number) => k * k * (3 - 2 * k)
    const fold = ease(Math.min(1, f.fold * 1.6)), gone = ease(Math.max(0, (f.fold - 0.62) / 0.38))
    const len = (1 / 3 + (2 / 3) * ease(f.unroll)) * (1 - fold * (2 / 3))
    parts.shiki.scale.set(1, 1 + (1 - len) * 1.6, len)
    // (the quilt: folded at its foot on the mattress till it's pulled up over him (cover), its swell rising as it goes; back to its fold in
    // the morning as he throws it back)
    const cv = ease(f.cover) * (1 - fold)
    const kl = 1 / 3 + (2 / 3) * cv
    // (its swell up to his full height as soon as it's being pulled over him (item 631, the owner's 「睡覺動畫有破綻」: risen with its
    // length, half pulled up it was half his height, and his shirt and his hands came out through its top)
    parts.kake.scale.set(1, 0.35 + 0.65 * ease(Math.min(1, cv / 0.2)), kl)
    // (its picture as long as what's shown of it, its head's band at its head (item 474, the owner's 「棉被被拉開的時候破圖了」: shortened, the
    // whole picture was squeezed into it, the crosses a third their size and running, as it was pulled up over him))
    if (parts.kakeMap) { parts.kakeMap.repeat.set(1, kl); parts.kakeMap.offset.set(0, 1 - kl) }
    parts.kake.position.set(0, (1 - len) * FUTON.top * 1.6, 0)
    // (the pillow: dropped at its head, a little bounce; on the folded stack in the morning)
    const pk = ease(f.pillow)
    parts.pillow.visible = pk > 0
    const pz = parts.pillowAt.z * len
    parts.pillow.position.set(parts.pillowAt.x, parts.pillowAt.y + (1 - pk) * 0.25 + Math.sin(pk * Math.PI) * 0.03 + fold * 0.18, pz)
    o.scale.setScalar(GRILL_SCALE * (1 - gone * 0.9))
    o.position.y += gone * 0.4 * GRILL_SCALE
  })
  return <group ref={g} visible={false} name="boss-futon"><primitive object={parts.r} /></group>
})
/** the owner in his place, at the grill (open or shut: open, he's the head chef there, his second cook at the board): drawn again only when
 * that or the language changes, not with every redraw of the kitchen (he walks, turns and fades by his own frame loop) */
export const BossSpot = memo(function BossSpot({ open, lang }: { open: boolean; lang: Lang }) {
  return (
    <Movable id="boss" label="老闆"><group position={CHEF_AT} rotation-y={CHEF_YAW} scale={BOSS_SCALE}>
      <Boss to={BOSS_WALK} aisle={BOSS_AISLE} open={open} lang={lang}><BlobShadow r={0.24} /></Boss>
    </group></Movable>
  )
})
