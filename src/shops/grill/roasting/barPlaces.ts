import * as THREE from 'three'
import { PLATE_SPREAD, plateSide, plateSpot, type PlateKind } from '@/game/plateSize'
import { readyAlong, ALONG, platingOf, GRILL_BAR_TOP, GRILL_COUNTERS, GRILL_OFFSET, GRILL_SCALE, GRILL_SEATS, FIRE_SHIFT, LAY, toGrillScene, CUBBY, CUBBY2, COOK_NOTCH, seatTurn } from '@/shops/grill/bar'
import { UP_AXIS } from './hearth'

/** the bar the customers sit at, behind the fire (away from the camera): its middle, length, top, and seats */
export const BAR_AT = GRILL_COUNTERS[0].at.clone()
// (high enough for the customers sat at it: about a third of their height above the seat, as a real counter)
export const BAR_TOP = GRILL_BAR_TOP
export const BAR_SEATS = GRILL_SEATS.length
/** the same, as this one's drawn (GRILL_SCALE bigger; and this one's frame is the fire's, FIRE_SHIFT along from the bar's: without it the food
 * set at a customer's place lay 0.65 along the counter from their plate, and that carried on a server's tray beside the tray) */
export const BAR_AT_SCENE = toGrillScene(BAR_AT).sub(FIRE_SHIFT)
const BAR_TOP_SCENE = BAR_TOP * GRILL_SCALE + GRILL_OFFSET.y
/** how big food is on a plate, next to the fire's: a whole fish no longer than the plate is wide (the owner's: at the fire's size, laid
 * across the plating place, a fish's tail hung off the table's edge, three mushrooms ran off the plate onto the wood) */
export const BAR_FOOD_SCALE = 0.3 * GRILL_SCALE
/** how much smaller what's grilled lies in a takeaway's box than on a plate (item 331: a whole saury fits its main cell's length) */
export const TAKEOUT_FOOD = 0.8
/** the chef's plating place (bar.ts's platingOf), on the cook table right beside him: what's grilled is plated there, ready (ORDER_READY), and
 * a server comes into the kitchen to him for it (the owner's: no pass on the bar between them any more); the table's top in the scene, and
 * the way across the table */
export const PLATING_FRAME = platingOf()
/** the skewers' holder and used tray drawn at the cook table's size (the fire's drawn big) */
export const SKEWER_SCALE = 2.2
/** the skewers' two holders, hung on the cook table's front on the strips of table either side of the notch (the owner's, 2026-11-10: the
 * used ones moved from a channel on the hearth's frame into a holder of their own, then the two swapped): the clean ones' left of the notch,
 * by the cutting board, where they're pushed through what's prepared; the used ones' right of it, by the plating, where they're pulled out.
 * Low on the face, the rods' tops just under the table top's edge and out in front of it (they splay only outward): clear of the cutting
 * board's overhang, the bowl, anything on the table (the owner's red box: they stood up through the bowl's rim; at the board, 16 of 30
 * stood up into it); short, its foot just over the bucket and the bin on the floor below (it stood down into the bin) */
const SKEWER_HANG = { lay: COOK_NOTCH.lay[1] + 0.062 * SKEWER_SCALE, y: -0.225 * SKEWER_SCALE }
/** how near (the scene's, across the table) a skewer must be let go to what's on the board to go through it */
export const SKEWER_DROP = 0.5
export const skewerHolderAt = () => new THREE.Vector3().addScaledVector(ALONG, (CUBBY2.along[1] + COOK_NOTCH.along[0]) / 2 - FIRE_SHIFT.dot(ALONG))
  .addScaledVector(LAY, SKEWER_HANG.lay).setY(SKEWER_HANG.y)
export const skewerUsedAt = () => new THREE.Vector3().addScaledVector(ALONG, (COOK_NOTCH.along[1] + CUBBY.along[0]) / 2 - FIRE_SHIFT.dot(ALONG))
  .addScaledVector(LAY, SKEWER_HANG.lay).setY(SKEWER_HANG.y)
const PLATING_TOP = PLATING_FRAME.top * GRILL_SCALE + GRILL_OFFSET.y
/** the way back across the table at the plating place (bar.ts's platingOf `dir`): a plated piece lies so, its length toward the table's back
 * (the plating place is near the table's end: lying along the table, a fish ran off it) */
export const PLATING_DIR = PLATING_FRAME.dir.clone()
/** where a piece goes at the plating place: side by side in its slot (on the plate laid there, or loose on the table, for a plate already out),
 * three to a row, a full row with another on top, as far apart as the plate's kind has them (game/plateSize, item 228); in this one's frame,
 * the fire FIRE_SHIFT along from the bar's (fromBar, below) */
export const readyFoodAt = (slot: number, row: number, plate: boolean, kind: PlateKind) => toGrillScene(PLATING_FRAME.at.clone().addScaledVector(PLATING_FRAME.dir, readyAlong(slot))).sub(FIRE_SHIFT)
  .addScaledVector(PLATING_FRAME.across, plateSide(row).across * PLATE_SPREAD[kind] * GRILL_SCALE)
  .setY(PLATING_TOP + 0.04 + (plate ? 0.01 * GRILL_SCALE : 0) + plateSide(row).layer * 0.06)
/** a turn about up (scratch, for what's on a plate turned with it) */
export const TURN_Q = new THREE.Quaternion()
/** (scratch) a point of a piece being sat down on its plate (item 258) */
export const LOW_AT = new THREE.Vector3()
/** the ray that finds a plate's face under a piece set down on it (item 258), straight down */
export const REST_RAY = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0), 0, 1)
/** how long a piece's face is kept, nothing under it changed (a plate moved under it by hand, its spot not); the last number given a piece */
export const REST_STALE = 10000
/** a piece's spot on a server's tray, in place of where it is (item 374): it and the plate under it go with the tray, every frame somewhere
 * else, and what it rests on (a height over its spot) doesn't change with it: measured as it's picked up, not every frame (97% of these
 * measures, three rays each against every plate and every piece on the bar, were pieces being carried) */
export const TRAY_SPOT = -0x7fffffff
/** (and on a tray, how often what's under its middle is felt for again, alone: the plate and the spot go along together, but not quite (a
 * step down off the kitchen's dais, the plate set down: 3.5 cm apart a while); its roll as it was picked up, kept (felt for across the seat's
 * way, not the tray's as it turns, its sides found the plate's rim, then nothing: it rocked from side to side as it was carried)) */
export const TRAY_REST_MS = 100
/** how far either side of a piece's middle, across its plate, what holds it up is felt for (the scene's units: about half a fish's width) */
export const REST_SIDE = 0.018 * GRILL_SCALE
/** (scratch) the way across the plate a piece rests on, its length's, and its roll over about it (item 271) */
export const REST_ACROSS = new THREE.Vector3()
export const REST_LONG = new THREE.Vector3()
export const REST_ROLL = new THREE.Quaternion()
export const REST_BOX = new THREE.Box3()
/** whether something's drawn: it and everything it's in */
export const drawnUp = (o: THREE.Object3D | null) => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true }
/** where the n-th piece on a seat's plate lies once it's set down before its customer (item 228): the plate's middle, and across it as the
 * plate's turned to lie along their counter (seatTurn), as far apart as its kind has them */
// (item 557: where on the plate by game/plateSize's plateSpot: on the long plate the loose ones along its front edge, clear of the fish;
// `nth` how many of its kind (long or loose) are on it already)
export const seatFoodAt = (seat: number, nth: number, kind: PlateKind, out: THREE.Vector3, loose = false) => {
  const s = plateSpot(kind, nth, loose), turn = seatTurn(seat)
  return out.copy(barSeat(seat))
    .addScaledVector(PLATING_FRAME.across.clone().applyAxisAngle(UP_AXIS, turn), s.across * GRILL_SCALE)
    .addScaledVector(PLATING_FRAME.dir.clone().applyAxisAngle(UP_AXIS, turn), s.along * GRILL_SCALE)
    .add(new THREE.Vector3(0, BAR_TOP_SCENE + 0.04 + s.layer * 0.06, 0))
}
const barSeat =(n: number) => toGrillScene(GRILL_SEATS[n].plate).sub(FIRE_SHIFT).setY(0)
export const HOVER_GLOW = new THREE.Color('#ffb347').multiplyScalar(0.35)
