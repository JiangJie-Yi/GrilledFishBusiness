import { keepOut } from '@/game/kitchen/hearthGuard'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { PREP_S, TAKE_S, type ChefPhase, type Store } from '@/game/kitchen/chefFlow'
import { RING_AZ } from '@/game/kitchen/fireSlots'
import { SHAPE_S } from '@/game/kitchen/rice'
import type { Role } from '@/data/staff'
import { KITCHEN_ROUTE, ALONG, staffWayOut, TILL, GRILL_COUNTERS, GRILL_OFFSET, FIRE_SHIFT, LAY, toGrillScene, CUBBY2 } from '@/shops/grill/bar'
import { UP } from './tuning'
import { type Piece } from './piece'
import { UP_AXIS } from './hearth'
import { COOK_TABLE, type CrewMember, KITCHEN_YAW, fromBar, toBar, floorAt, SOUS_AT, WALK_LAY, BOARD_COOK_AT, BOARD_COOK_YAW, HEARTH_ZONES } from './kitchen'

/**
 * The crew's way home once the shop's shut and empty (Roasting's frame), each from their place: past the table's end (between it and the
 * rice tub) to the gate by the till, through it and out of the front door; the cook first out of his notch, along the table's front;
 * the cashier along behind the till to the gate.
 */
function crewWayOut(role: Role, at: THREE.Vector3) {
  const end = (lay: number) => new THREE.Vector3().addScaledVector(ALONG, 2.95).addScaledVector(LAY, lay)
  // (the third cook straight out of his bay first, then round)
  const via = role === 'chef' ? [new THREE.Vector3().addScaledVector(ALONG, at.dot(ALONG)).addScaledVector(LAY, WALK_LAY), end(WALK_LAY), end(-0.8)] : role === 'sous' ? [end(at.dot(LAY)), end(-0.8)]
    : role === 'cashier' ? [new THREE.Vector3().addScaledVector(ALONG, 5.35).addScaledVector(LAY, -0.3)] : []
  return [at.clone(), ...via, ...staffWayOut(GRILL_COUNTERS).map(fromBar)].map((v) => v.setY(floorAt(v)))
}
/**
 * One of the staff at their place; once the shop's shut and empty (SHOP.leaving) they walk their way out (`way`, from wherever they are)
 * and are gone. `seat`: the name of an unseen mark in the scene they sit on instead, facing its -z (the cashier's chair: it can be moved).
 */
/**
 * The head chef's round with the orders (game/chefFlow): what's being fetched (their pieces' keys), from where, and how far it's got; the
 * chef's CrewWalk walks it (and notes where his hands are, for what he carries), Roasting starts each trip and takes what he brings back
 * onto the board. `seenAt`: when a chef last walked it (with nobody drawn to, orders come out onto the board as they used to).
 */
export const CHEF_TRIP = {
  /** when he last pushed a skewer through what's on the board (his hand drawn pushing it in, for the 0.6 s the rod takes to go in) */
  pierceAt: -1e9,
  phase: 'idle' as ChefPhase, store: 'freezer' as Store, keys: [] as string[], t: 0, seenAt: -1e9, fanUntil: 0,
  /** the foods he's fetching (their ids, the keys' order): at the sacks, the potatoes' kind go from a sack, the rest from the basket */
  ids: [] as string[],
  /** of an order of rice balls, how many he's to shape himself, the rest taken off the third cook's tray (item 129; -1: not looked yet) */
  shape: -1,
  /** where he stands to take it out, and what he faces there (Roasting's frame) */
  spot: new THREE.Vector3(), face: new THREE.Vector3(),
  /** where what he carries is held, in the world */
  hand: new THREE.Vector3(),
}
if (import.meta.env?.DEV && typeof window !== 'undefined') (window as unknown as { __chefTrip?: typeof CHEF_TRIP }).__chefTrip = CHEF_TRIP
/** how long what he's brought is prepared on the board: a rice ball shaped in his hands (game/rice's SHAPE_S), else salted, scored, skewered */
// (the rice balls are shaped at the rice-ball counter, by the cooker, as the rice is taken (TAKE_S + SHAPE_S there): a moment at the board)
export const prepOf = (store: Store) => (store === 'ricetub' ? 0.3 : PREP_S)
// (none to shape, all off the third cook's tray (item 129): only the taking)
export const takeOf = (store: Store, shape = 1) => (store === 'ricetub' && shape > 0 ? TAKE_S + SHAPE_S : TAKE_S)
/**
 * What the head chef has in his hands (the owner's: nothing flies across the kitchen by itself): a piece taken off the board to the fire,
 * or off the fire to the plating place. Its steps: reaching for it where it is, carrying it in his hands as he turns and steps to where
 * it's going, setting it there leaning in (the skewer pushed into the ash, or laid on the plate), and back to his place. Roasting moves the
 * piece and says where he stands and how far he leans (its frame); his CrewWalk stands him there and says where his hands are.
 */
export const CHEF_CARRY = {
  key: null as string | null, kind: 'toFire' as 'toFire' | 'toPlate', phase: 'idle' as 'idle' | 'reach' | 'carry' | 'place' | 'back', t: 0,
  from: new THREE.Vector3(), fromQ: new THREE.Quaternion(), heldQ: new THREE.Quaternion(),
  stand: new THREE.Vector3(), face: new THREE.Vector3(), lean: 0, hold: false,
  /** what he holds it by, in the piece's own frame: its foot (footOf) */
  foot: new THREE.Vector3(),
}
/** each step's seconds: reaching, carrying (a turn and a step or two), setting it down, back */
export const CARRY_S = { reach: 0.3, carry: 0.5, place: 0.35, back: 0.3, idle: 0 }
/** how far he steps from his place toward what he's at (he's in the notch: the fire's right before him), and how far he leans setting it */
export const CARRY_STEP = 0.08, CARRY_LEAN = 0.26
/**
 * The chef's long metal chopsticks (金箸): what's further than his arm reaches (the far side of the hearth) he takes up and sets down with
 * them, the pair reaching from his hand to it, so it doesn't slide to his hand by itself. Two thin rods from the origin along +z, 1 long
 * (stretched to the distance), a little apart.
 */
export const TONGS_GEO = (() => {
  const a = new THREE.CylinderGeometry(0.0035, 0.0022, 1, 5).rotateX(Math.PI / 2).translate(-0.006, 0, 0.5)
  const b = a.clone().translate(0.012, 0, 0)
  return mergeGeometries([a, b])!
})()
export const TONGS_MAT = new THREE.MeshToonMaterial({ color: '#8d9299' })
/** further than this (the world's units) from his hand, he uses them */
export const ARM_REACH = 0.6
export const TONGS_Z = new THREE.Vector3(0, 0, 1)
export const FOOT_BOX = new THREE.Box3(), FOOT_V = new THREE.Vector3(), GRIP = new THREE.Vector3()
/**
 * What the head chef holds a piece by: its foot as it stands on the fire (the end of its skewer that goes into the ash, or the bottom of
 * what sits on the net), in the piece's own frame; from what of it's drawn (its skewer and its food, not its ink). He stands on the
 * kitchen's floor, the table's top at his chest, and a skewer stands near as tall as he is: held by its middle, he carried it over his
 * head; by its foot, his hands stay at his chest, it upright over them, and its foot goes into the ash from them
 */
const RING_TURN = new THREE.Quaternion()
/** how far out the squared ring the skewers stand round is at a bearing (blender/grilledfish.py's ring_at: a superellipse, |x|^4 + |z|^4 the
 * same all round), against its round's */
const ringOut = (a: number) => 1 / (Math.abs(Math.cos(a)) ** 4 + Math.abs(Math.sin(a)) ** 4) ** 0.25
/**
 * A skewer's place on the fire turned round the fire's middle to ring place `k` (game/fireSlots' RING_AZ, the dish's own frame), kept on the
 * squared ring (out or in as the ring is there): its home, its turn and where Dish shows it
 */
export function toRingPlace(p: Piece, k: number) {
  const phi = Math.atan2(p.homeP.z, p.homeP.x)
  const theta = THREE.MathUtils.degToRad(RING_AZ[k])
  // (turning about +y by an angle moves the bearing back by it)
  RING_TURN.setFromAxisAngle(UP, phi - theta)
  const out = ringOut(theta) / ringOut(phi)
  const move = (v: THREE.Vector3) => { v.applyQuaternion(RING_TURN); v.x *= out; v.z *= out }
  move(p.homeP)
  p.homeQ.premultiply(RING_TURN)
  p.homeQ0.premultiply(RING_TURN)
  const h = p.node.userData.home as { p: THREE.Vector3; q: THREE.Quaternion } | undefined
  if (h) { move(h.p); h.q.premultiply(RING_TURN) }
}
export function footOf(p: Piece, out: THREE.Vector3) {
  const n = p.node
  const q0 = n.quaternion.clone(), p0 = n.position.clone()
  n.quaternion.copy(p.homeQ); n.position.copy(p.homeP)
  n.updateWorldMatrix(true, true)
  FOOT_BOX.makeEmpty()
  n.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && m.visible && !m.name.endsWith('_outline')) FOOT_BOX.expandByObject(m) })
  const at = n.getWorldPosition(FOOT_V)
  if (FOOT_BOX.isEmpty()) out.set(0, 0, 0)
  else out.copy(n.worldToLocal(new THREE.Vector3(at.x, FOOT_BOX.min.y, at.z)))
  n.quaternion.copy(q0); n.position.copy(p0); n.updateWorldMatrix(true, true)
  return out
}
if (import.meta.env?.DEV && typeof window !== 'undefined') (window as unknown as { __chefCarry?: typeof CHEF_CARRY }).__chefCarry = CHEF_CARRY
/** the Movable each store is, to find where it's been put (the cubby has none: it's the cook table's) */
// (the rice balls' rice: the electric cooker, on the rice-ball counter (the rice tub's out of use))
const STORE_PIECE: Record<Exclude<Store, 'cubby'>, string> = { freezer: 'freezer', ricetub: 'denkinabe', sacks: 'produce' }
/** the counter a store stands on, if any (he stands before its front) */
// (the warmer's: the two counters are one, its body all the warmer's model (blender/warmer.py), the rice-ball counter's only what's on it)
const STORE_COUNTER: Partial<Record<Store, string>> = { ricetub: 'warmer' }
/**
 * (item 804) a piece found by its edit id, or a group by its name, once, and kept while it's still in the scene: the second cook's every trip
 * walked the whole room (fourteen thousand objects) for each of them, two to six times a trip, a millisecond or so each, a long frame each
 * time he set off
 */
const FOUND = new Map<string, THREE.Object3D>()
const inScene = (o: THREE.Object3D, scene: THREE.Object3D) => { for (let q: THREE.Object3D | null = o; q; q = q.parent) if (q === scene) return true; return false }
function kept(scene: THREE.Object3D, k: string, find: () => THREE.Object3D | undefined) {
  const was = FOUND.get(k)
  if (was && inScene(was, scene)) return was
  const got = find()
  if (got) FOUND.set(k, got); else FOUND.delete(k)
  return got
}
function byEdit(scene: THREE.Object3D, id: string) {
  return kept(scene, `e:${id}`, () => { let got: THREE.Object3D | undefined; scene.traverse((o) => { if (!got && o.userData.editId === id) got = o }); return got })
}
function byName(scene: THREE.Object3D, name: string) {
  return kept(scene, `n:${name}`, () => scene.getObjectByName(name))
}
/**
 * A spot (in `frame`) put out of the cook table and its hearth where the table's guard (HearthGuard) would put whoever stood there, before
 * anyone sets off for it: walked to as it was, they'd been held at the table's edge every frame of the way in and all the while they stood
 * there, drawn up to 0.75 off where they were, sliding along the edge (item 55: the second cook's spot at the vegetables' stand was in the
 * table, past his own place at the board, the stand's box being long and its middle far off).
 */
function clearOfTable(spot: THREE.Vector3, frame: THREE.Object3D, scene: THREE.Object3D) {
  const t = byName(scene, 'cook-table-c0')?.parent
  if (!t) return spot
  t.updateWorldMatrix(true, false)
  frame.updateWorldMatrix(true, false)
  const q = t.worldToLocal(frame.localToWorld(spot.clone()))
  const al = q.dot(ALONG), la = q.dot(LAY)
  const [a2, l2] = keepOut(al, la, 'other', HEARTH_ZONES)
  if (a2 === al && l2 === la) return spot
  q.addScaledVector(ALONG, a2 - al).addScaledVector(LAY, l2 - la)
  return frame.worldToLocal(t.localToWorld(q))
}
/**
 * Where the chef stands to take something out of a store (Roasting's frame): before the fridge under the cook table on the left, its
 * doors' swing clear; else just off the side of the store (as it stands, wherever it's been moved) nearest his place, facing it; never in
 * the cook table (clearOfTable).
 */
export function storeSpot(store: Store, scene: THREE.Object3D, frame: THREE.Object3D, home: THREE.Vector3) {
  if (store === 'cubby') {
    const face = new THREE.Vector3().addScaledVector(ALONG, (CUBBY2.along[0] + CUBBY2.along[1]) / 2).addScaledVector(LAY, COOK_TABLE.lay[1] - 0.11).sub(FIRE_SHIFT)
    // (out of its doors' swing, 0.95 before its front, or as near as it is that's clear of what stands on the floor there (item 516: the
    // vegetables' basket and the sacks are there now, the owner's places, and he stood in the basket, his hand in the sweet potatoes' sack;
    // its doors open part way (CUBBY_KICK), their edges 0.47 out at the most, his round 0.21 past that at 0.68))
    const floor = floorPieces(scene, frame)
    let spot = face.clone().addScaledVector(LAY, 0.95)
    for (const [d, a] of CUBBY_STANDS) {
      const q = face.clone().addScaledVector(LAY, d).addScaledVector(ALONG, a)
      if (floorGap(q, floor) >= SACK_STAND) { spot = q; break }
    }
    return { spot: spot.setY(floorAt(spot)), face }
  }
  if (store === 'sacks') {
    const s = sackSpot(scene, frame, home, CHEF_TRIP.ids[0] ?? '')
    if (s) return s
  }
  const piece = byEdit(scene, STORE_PIECE[store])
  if (!piece) return null
  // (its box in the chef's frame, from the corners of its box in the world)
  const wb = new THREE.Box3().setFromObject(piece)
  if (wb.isEmpty()) return null
  const inv = frame.matrixWorld.clone().invert(), lb = new THREE.Box3()
  for (let i = 0; i < 8; i++) lb.expandByPoint(new THREE.Vector3(i & 1 ? wb.max.x : wb.min.x, i & 2 ? wb.max.y : wb.min.y, i & 4 ? wb.max.z : wb.min.z).applyMatrix4(inv))
  const face = lb.getCenter(new THREE.Vector3()), half = lb.getSize(new THREE.Vector3()).multiplyScalar(0.5)
  // (up on a counter (Decor's PrepCounter: the cooker): before the counter's front, the kitchen's side, across from it; off its own side,
  // toward his place, he stood in the counter)
  const counter = STORE_COUNTER[store] ? warmerFront(scene, piece, frame, STORE_COUNTER[store]!) : null
  if (counter) return { spot: counter.setY(floorAt(counter)), face }
  const d = home.clone().sub(face).setY(0)
  if (d.lengthSq() < 1e-6) d.set(1, 0, 0)
  d.normalize()
  const out = Math.min(Math.abs(d.x) > 1e-4 ? half.x / Math.abs(d.x) : 1e9, Math.abs(d.z) > 1e-4 ? half.z / Math.abs(d.z) : 1e9)
  const spot = clearOfTable(face.clone().addScaledVector(d, out + 0.45), frame, scene)
  return { spot: spot.setY(floorAt(spot)), face }
}
/** how far (Roasting's frame) the second cook's middle stands off a sack's side to reach into it, bent over its mouth: his body's own
 * round (his blob shadow's, 0.17) and a little more; and clear of anything else on the floor by as much */
const SACK_STAND = 0.21
/** where he can stand before the fridge under the cook table, in the order tried: how far out from its front, and along it (Roasting's
 * frame): out of its doors' swing first, then nearer, then to either side */
const CUBBY_STANDS: [number, number][] = [[0.95, 0], [0.85, 0], [0.75, 0], [0.68, 0], [0.75, 0.2], [0.75, -0.2], [0.68, 0.35], [0.68, -0.35]]
/** the pieces standing on the kitchen floor round the second cook's board (the sacks, the vegetables' basket and crates): their points
 * on the floor, in `frame` (every third of their meshes' points), taken afresh as he sets off (they can be moved in edit mode) */
function floorPieces(scene: THREE.Object3D, frame: THREE.Object3D) {
  frame.updateWorldMatrix(true, false)
  const inv = frame.matrixWorld.clone().invert(), v = new THREE.Vector3(), out: number[] = []
  for (const id of FLOOR_PIECES) {
    const o = byEdit(scene, id)
    if (!o) continue
    o.updateWorldMatrix(true, true)
    o.traverse((m) => {
      const pos = (m as THREE.Mesh).isMesh && m.visible ? (m as THREE.Mesh).geometry.attributes.position : null
      if (!pos) return
      for (let k = 0; k < pos.count; k += 3) {
        v.fromBufferAttribute(pos, k).applyMatrix4(m.matrixWorld).applyMatrix4(inv)
        out.push(v.x, v.z)
      }
    })
  }
  return out
}
const FLOOR_PIECES = new Set(['produce', 'vegbasket', 'vegcrate', 'vegcrate2'])
/** how far a place on the floor (`frame`) is from the nearest of those points */
function floorGap(p: THREE.Vector3, pts: number[]) {
  let d = Infinity
  for (let i = 0; i < pts.length; i += 2) d = Math.min(d, Math.hypot(pts[i] - p.x, pts[i + 1] - p.z))
  return d
}
/** the sack's mouth he reaches into and the way across it (Roasting's frame; set as he sets off, read by his walk while he takes it out),
 * how far apart his hands go in it, and his hands there (the world: StaffFigure's handsAt) */
export const SACK_MOUTH = new THREE.Vector3()
export const SACK_ACROSS = new THREE.Vector3()
export const SACK_HAND_GAP = 0.075
/** how far he bends over it at the deepest (half way through taking them out) */
export const SACK_LEAN = 0.5
export const SACK_HANDS = { left: new THREE.Vector3(), right: new THREE.Vector3() }
/** what he's taken out lifted up out of the sack (item 516): from this far through taking them out his hands come up over its rim and in
 * close before his chest (how far before him and how far over the mouth), and so they stay till he's walked this far away from it; held
 * out to carry at once, his hands were in the sack's side as he turned from it */
export const SACK_LIFT_AT = 0.45
const SACK_LIFT_OUT = 0.35
const SACK_LIFT_UP = 0.12
export const SACK_CLEAR_WALK = 0.4
/** how far from the end of his way he turns to what's next there (Roasting's frame) */
export const ARRIVE_TURN = 0.5
const SACK_FWD = new THREE.Vector3(), SACK_SIDE = new THREE.Vector3()
/** his hands held up before him over the sack's mouth's height (Roasting's frame: his own place and turn) */
export function sackLift(o: THREE.Object3D) {
  if (!o.parent) return
  SACK_FWD.set(Math.sin(o.rotation.y), 0, Math.cos(o.rotation.y))
  SACK_SIDE.set(SACK_FWD.z, 0, -SACK_FWD.x)
  for (const [h, s] of [[SACK_HANDS.left, 1], [SACK_HANDS.right, -1]] as const) {
    h.copy(o.position).addScaledVector(SACK_FWD, SACK_LIFT_OUT).addScaledVector(SACK_SIDE, s * SACK_HAND_GAP).setY(SACK_MOUTH.y + SACK_LIFT_UP)
    o.parent.localToWorld(h)
  }
  o.userData.handsAt = SACK_HANDS
}
/** what he takes out of a sack (the rest that keeps at room temperature is in the vegetables' basket and crates beside them) */
const IN_SACKS = new Set(['Potato', 'SweetPotato', 'Onion'])
/**
 * Where he stands to take what keeps at room temperature out (item 516): by the open sack nearest his place (KitchenStores' produce-sack-0..2,
 * an emptied one left out), his middle SACK_STAND off its side toward him, and from there he bends into that sack for the potatoes' kind
 * (IN_SACKS) or into the vegetables' basket at his other hand for the rest (Decor's vegbasket), facing it, his hands into its mouth
 * (SACK_MOUTH). Off the whole row's box toward him he stood by the board a metre and more from any of them and took them out of the air;
 * the sacks at the row's far end and the two crates are walled in by one another (the owner's places, item 524), so it's the near sack and
 * the basket he reaches into, as a cook would.
 */
function sackSpot(scene: THREE.Object3D, frame: THREE.Object3D, home: THREE.Vector3, food: string) {
  frame.updateWorldMatrix(true, false)
  const inv = frame.matrixWorld.clone().invert(), v = new THREE.Vector3()
  /** a piece's middle on the floor, its round and its rim's height (this frame), from its points */
  const measure = (g: THREE.Object3D, c: THREE.Vector3) => {
    let r = 0, top = -Infinity
    g.updateWorldMatrix(true, true)
    g.traverse((m) => {
      const pos = (m as THREE.Mesh).isMesh ? (m as THREE.Mesh).geometry.attributes.position : null
      if (!pos) return
      for (let k = 0; k < pos.count; k += 3) {
        v.fromBufferAttribute(pos, k).applyMatrix4(m.matrixWorld).applyMatrix4(inv)
        r = Math.max(r, Math.hypot(v.x - c.x, v.z - c.z))
        top = Math.max(top, v.y)
      }
    })
    return { c, r, top }
  }
  let best: { c: THREE.Vector3; r: number; top: number; d: number } | null = null
  for (let i = 0; i < 3; i++) {
    const g = byName(scene, `produce-sack-${i}`)
    if (!g || !g.visible) continue
    const m = measure(g, g.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv))
    const d = Math.hypot(home.x - m.c.x, home.z - m.c.z)
    if (m.r > 0 && (!best || d < best.d)) best = { ...m, d }
  }
  if (!best) return null
  const out = new THREE.Vector3(home.x - best.c.x, 0, home.z - best.c.z)
  if (out.lengthSq() < 1e-6) out.set(1, 0, 0)
  out.normalize()
  // (straight off it toward his place, or turned round it a little either way till he's clear of the basket and the rest beside it)
  const floor = floorPieces(scene, frame), at = (a: number) => best.c.clone().addScaledVector(out.clone().applyAxisAngle(UP_AXIS, a), best.r + SACK_STAND)
  const turn = [0, 0.26, -0.26, 0.52, -0.52, 0.79, -0.79].find((a) => floorGap(at(a), floor) >= SACK_STAND - 0.005) ?? 0
  out.applyAxisAngle(UP_AXIS, turn)
  const spot = clearOfTable(best.c.clone().addScaledVector(out, best.r + SACK_STAND), frame, scene)
  // (the basket, for what isn't in a sack: its middle (its box's, the handle over it), its rim under the handle's top)
  let into: { c: THREE.Vector3; r: number; top: number } = best
  if (!IN_SACKS.has(food)) {
    const basket = byEdit(scene, 'vegbasket')
    if (basket) {
      const wb = new THREE.Box3().setFromObject(basket)
      const c = wb.getCenter(new THREE.Vector3()).applyMatrix4(inv)
      const m = measure(basket, c.setY(0))
      const lo = new THREE.Vector3(0, wb.min.y, 0).applyMatrix4(inv).y
      into = { c: m.c, r: m.r * 0.8, top: lo + (m.top - lo) * 0.62 }
    }
  }
  // (his hands into its mouth a hand's breadth in from the rim on his side, a little under it, where the top of what's in it is; across it,
  // the way his shoulders go)
  const toMe = new THREE.Vector3(spot.x - into.c.x, 0, spot.z - into.c.z)
  if (toMe.lengthSq() < 1e-6) toMe.copy(out)
  toMe.normalize()
  SACK_MOUTH.copy(into.c).addScaledVector(toMe, into.r * 0.35).setY(into.top - 0.05)
  SACK_ACROSS.set(-toMe.z, 0, toMe.x)
  return { spot: spot.setY(floorAt(spot)), face: into.c.clone().setY(spot.y) }
}
/** the warming counter's front (Decor's Warmer: its own +z the kitchen's side) across from a piece on it, a step out (the chef's frame); null
 * if it's not on it */
function warmerFront(scene: THREE.Object3D, piece: THREE.Object3D, frame: THREE.Object3D, id: string) {
  const w = byEdit(scene, id)
  // (the counter's own frame: the turned group in it)
  let f: THREE.Object3D | undefined
  w?.traverse((o) => { if (!f && o !== w && Math.abs(o.rotation.y) > 1e-3) f = o })
  if (!w || !f) return null
  f.updateWorldMatrix(true, true)
  const inv = f.matrixWorld.clone().invert(), b = new THREE.Box3(), v = new THREE.Vector3()
  w.traverse((m) => {
    const mesh = m as THREE.Mesh
    if (!mesh.isMesh || !mesh.geometry?.attributes.position) return
    const pos = mesh.geometry.attributes.position, m4 = inv.clone().multiply(mesh.matrixWorld)
    for (let i = 0; i < pos.count; i += 4) b.expandByPoint(v.fromBufferAttribute(pos, i).applyMatrix4(m4))
  })
  if (b.isEmpty()) return null
  const at = f.worldToLocal(new THREE.Box3().setFromObject(piece).getCenter(new THREE.Vector3()))
  if (at.x < b.min.x || at.x > b.max.x || at.z < b.min.z || at.z > b.max.z) return null
  const spot = f.localToWorld(new THREE.Vector3(at.x, 0, b.max.z + 0.4))
  return frame.worldToLocal(spot)
}
/** the chef's way from his place by the board to a spot (Roasting's frame): round all that stands on the kitchen floor (GuestBar3D's route)
 * from where he stands (item 516: it first went straight back off his place onto the aisle's line (WALK_LAY), as out of a notch, where his
 * place once was; from the board that point is between the onions' sack and the vegetables' basket, and every trip he made went through
 * them, his hands in the sacks) */
export function chefWay(home: THREE.Vector3, to: THREE.Vector3) {
  const across = KITCHEN_ROUTE.route ? KITCHEN_ROUTE.route(toBar(home), toBar(to)) : null
  const mid = across ? across.slice(1, -1).map(fromBar).map((v) => v.setY(floorAt(v))) : []
  return [home.clone(), ...mid, to.clone()]
}
/** how long sitting down onto a seat (or getting up off it) takes (the shop's seconds), and how high over the straight way up they step */
export const SIT_S = 0.7
export const SIT_HOP = 0.08
export function crewPlaces(crew: CrewMember[]) {
  const c0 = GRILL_COUNTERS[0]
  const onFloor = (v: THREE.Vector3) => toGrillScene(v).setY(GRILL_OFFSET.y)
  const spots: Record<Role, { at: THREE.Vector3; yaw: number }[]> = {
    // (at the big chopping board: the fire's the owner's)
    chef: [{ at: BOARD_COOK_AT, yaw: BOARD_COOK_YAW }],
    sous: [{ at: SOUS_AT, yaw: KITCHEN_YAW }],
    // (the stocker's GuestBar3D's: by the drinks' crates, carrying them to the fridges; drawn here too they stood in the rice tub)
    stock: [],
    // (stood back far enough that the register's drawer, run all the way out, stops short of them)
    cashier: [{ at: onFloor(c0.at.clone().addScaledVector(c0.along, c0.length / 2 + TILL.along).addScaledVector(c0.lay, TILL.lay + TILL.D / 2 + 0.5)),
      yaw: Math.atan2(-c0.lay.x, -c0.lay.z) }],
    // (the servers are on the floor with the customers, and walk: GuestBar3D draws them)
    server: [],
  }
  const used: Partial<Record<Role, number>> = {}
  return crew.flatMap((m) => {
    const k = used[m.role] ?? 0
    used[m.role] = k + 1
    const spot = spots[m.role][k]
    // (the first cashier sits on the till's chair: GuestBar3D's Register marks its seat)
    const seat = m.role === 'cashier' && k === 0 ? 'cashier-seat' : undefined
    return spot ? [{ m, ...spot, way: crewWayOut(m.role, spot.at), seat }] : []
  })
}
