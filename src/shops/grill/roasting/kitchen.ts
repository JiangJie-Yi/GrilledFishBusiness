import { type HearthZones } from '@/game/kitchen/hearthGuard'
import * as THREE from 'three'
import type { Look, Role } from '@/data/staff'
import { ALONG, inKitchen, GRILL_COUNTERS, GRILL_OFFSET, GRILL_SCALE, SIDE_PULL, FIRE_SHIFT, KITCHEN_DROP, LAY, toGrillScene, CUBBY, CUBBY2, COOK_NOTCH, SOUS_NOTCH } from '@/shops/grill/bar'
import { HEARTH_HALF, HEARTH_LONG } from './hearth'

/**
 * The cook's table everything stands on (the fire pit, the tray, the plates): a thick top of pale planks, its front
 * and sides boarded dark, down to the floor the customers walk on. Its back butts against the bar's cook's edges;
 * a bay is cut into its front, left of the tray, and the cook stands in there, close by the fire and the seasonings,
 * in full view (no table in front of him).
 */
// (the fire in the middle across it, the cook's whole side open: the front face is a straight run the cook stands along, the
// cubby for the plates cut into it under the top)
export const COOK_TABLE = { lay: [-2.1, 2.1], along: [-2.4 + 2 * SIDE_PULL, 3.1] }
/** the cooks the boss's height (BOSS_SCALE, his figure 0.95 tall; theirs 0.97) */
export const CHEF_SCALE = 1.05 * 0.8 * GRILL_SCALE * 0.98
/** the table as boxes (lay from–to, along from–to, and how far each face is set back under the top: lay's low and high ends, along's low and
 * high; less than 0 where it runs into the next box): all of it behind the cubby, and the front either side of it */
/** (and the notch's: its back wall, and the wall between it and the cubby) */
// (the back's split round the third cook's bay at the far end (SOUS_NOTCH): before it, across its back wall, and either side of it, each face
// on the bay set back under the top as the table's outer faces are)
const [SN0, SN1] = SOUS_NOTCH.lay, SNA = SOUS_NOTCH.along[0]
export const COOK_TABLE_PARTS: [number, number, number, number, [number, number, number, number]][] = [
  [COOK_TABLE.lay[0], SN0, COOK_TABLE.along[0], SNA, [0.06, -0.01, 0.06, -0.01]],
  [SN0, SN1, COOK_TABLE.along[0], SNA, [-0.01, -0.01, 0.06, 0.06]],
  [SN1, CUBBY.lay[0], COOK_TABLE.along[0], SNA, [-0.01, -0.01, 0.06, -0.01]],
  [COOK_TABLE.lay[0], SN0, SNA, COOK_TABLE.along[1], [0.06, 0.06, -0.01, 0.06]],
  [SN1, CUBBY.lay[0], SNA, COOK_TABLE.along[1], [0.06, -0.01, -0.01, 0.06]],
  [CUBBY.lay[0], COOK_TABLE.lay[1], COOK_TABLE.along[0], CUBBY2.along[0], [-0.01, 0.06, 0.06, -0.01]],
  [CUBBY.lay[0], COOK_TABLE.lay[1], CUBBY2.along[1], COOK_NOTCH.along[0], [-0.01, 0.06, -0.01, 0.06]],
  [CUBBY.lay[0], COOK_TABLE.lay[1], CUBBY.along[1], COOK_TABLE.along[1], [-0.01, 0.06, -0.01, 0.06]],
  [CUBBY.lay[0], COOK_NOTCH.lay[0], COOK_NOTCH.along[0], COOK_NOTCH.along[1], [-0.01, 0.06, -0.01, -0.01]],
  [CUBBY.lay[0], COOK_TABLE.lay[1], COOK_NOTCH.along[1], CUBBY.along[0], [-0.01, 0.06, 0.06, -0.01]],
]
export type CrewMember = { id: string; role: Role; look: Look }
/** the shop's own second cook, at the board while the shop's open when none's been hired (the kitchen cooks by itself: someone has to
 * fetch each order and bring it to the board, the owner at the fire) */
export const HOUSE_CHEF: CrewMember = { id: 'house-chef', role: 'chef', look: { female: false, age: 'middle' } }
/**
 * Where each of the staff stands while the shop's open (the owner is the player, so isn't drawn): the second cook at
 * the board, the third cook in his bay at the cook's table's far end (SOUS_AT), facing in at the fire; the cashier behind the till by the door; one server at
 * the near end of the bar by the till, the other at the dead end of the side counter's aisle (both out of the way the
 * customers walk). The first two of each job are shown.
 */
export const KITCHEN_YAW = Math.atan2(-ALONG.x, -ALONG.z)
/** a place in the bar's plan (the first counter's frame) as the crew stand (Roasting's frame: the fire FIRE_SHIFT along from the bar's), and back */
export const fromBar = (v: THREE.Vector3) => toGrillScene(v).sub(FIRE_SHIFT)
export const toBar = (v: THREE.Vector3) => v.clone().add(FIRE_SHIFT).sub(GRILL_OFFSET).divideScalar(GRILL_SCALE)
/** the floor under a place (Roasting's frame): the kitchen's raised floor, or the customers' */
export const floorAt = (v: THREE.Vector3) => (inKitchen(GRILL_COUNTERS, toBar(v)) ? GRILL_OFFSET.y - KITCHEN_DROP : GRILL_OFFSET.y)
/** the kitchen's floor's top in this frame, as CookTable lays it (the customers' floor, GRILL_OFFSET's height; the kitchen's dais up off
 * it; its boards a hair over that): what everyone in the kitchen stands on */
export const KITCHEN_FLOOR_Y = GRILL_OFFSET.y - KITCHEN_DROP + 0.004 * GRILL_SCALE
/** where the cook stands (on the floor, in the notch: in up to the hearth, as the owner drew; he stood out past the table's edge), and the
 * way he faces: in at the fire. In the middle of the notch, along: it's only a little wider than he is (1.3 to his 1.0), and set to one side
 * (it was 0.36 nearer its left-hand side) he stood into the table beside it, by the left-hand cubby (the owner saw it) */
// (and 2.2 out, not 2.0: up on the notch's step his chest and sleeves were level with the seasonings' ledge, its pots in them (clips.mjs
// found it; at 2.12 his sleeves still brushed the peanut bowl and the miso))
// (on the kitchen's floor (KITCHEN_FLOOR_Y): his frame's floor is his, his step on it; it was this frame's 0, the cook table's top, and he
// stood up there on his step, a table's height over the floor, the table's top at his feet, and his step with him (the owner saw it))
export const CHEF_AT = new THREE.Vector3().addScaledVector(LAY, 2.3).addScaledVector(ALONG, (COOK_NOTCH.along[0] + COOK_NOTCH.along[1]) / 2 - FIRE_SHIFT.dot(ALONG))
  .setY(KITCHEN_FLOOR_Y)
/** how high the step is in the owner's notch and the third cook's bay (a low wooden step, a duckboard's height: the owner's, 2026-11-10; at
 * 0.2 the owner stood up out of his notch, the table's top at his hips, and the third cook's bay had none, the floor showing in it) */
const STEP_H = 0.09  // (a duckboard's slats on its battens: the owner's, 2026-11-11, thicker; 0.05 before)
/** where the third cook stands: in his bay at the table's far end (SOUS_NOTCH), a little out from its back wall (his front's some 0.3 ahead
 * of his feet), in the middle of it across, facing in at the fire (KITCHEN_YAW), on his step; he stood out past the table's end, the crate
 * out of reach */
export const SOUS_AT = new THREE.Vector3().addScaledVector(ALONG, (SOUS_NOTCH.along[0] + SOUS_NOTCH.along[1]) / 2 + 0.03 - FIRE_SHIFT.dot(ALONG))
  .addScaledVector(LAY, (SOUS_NOTCH.lay[0] + SOUS_NOTCH.lay[1]) / 2 - FIRE_SHIFT.dot(LAY)).setY(KITCHEN_FLOOR_Y + STEP_H)
/** the aisle in front of the cook table, where he stands while the shop's open */
const AISLE_LAY = 2.62
/** and the line he walks along it, a little further out (clear of his cook's back, at the fire), and how far along it either way (the
 * Roasting frame's along: in front of the table, short of its ends, clear of what stands by them) */
export const WALK_LAY = AISLE_LAY + 0.38
const WALK_ALONG: [number, number] = [-1.24, 1.86]
export const CHEF_YAW = Math.atan2(-CHEF_AT.x, -CHEF_AT.z)
/** where the second cook stands while the shop's open (the owner's: the owner, 大廚, at the fire; the second, 二廚, fetching the orders and
 * skewering them): on the kitchen floor before the big chopping board, left of the notch and of where the water bucket stood on the floor by it, facing
 * in at the board (measured: the board along -2.33..-0.73, its front at lay 2.15; the bucket from along -1.05; he's 1.17 across with his
 * arms, which at -1.62 touched it, and the owner's reaching to the board's end)) */
// (item 387, the owner's 「有個致命的問題動作都會深陷進模型去」: at -1.74 the produce sacks' row (the owner's, against the side counter, along
// -2.50..-1.91, its onions' sack out to the board's front) was in his left side to the hip, 19 cm, all the while he skewered; at the board's
// middle now, his body (-0.45..+0.45 about his feet, his arms to 0.59) clear of the sack and of the skewer holder before the board's right
// end (along -0.97..-0.74, lay to 2.37: in front of where his right hand hangs))
// (item 516: and 0.12 on toward the board's right end: the sacks drawn 1.4 times as big since (the owner's), the hand hanging at his side
// toward them (StaffFigure's REST, 0.51 out from his middle) was in the onions' sack's side all the while he stood idle; his other hand
// still 0.18 behind the skewer holder's back)
export const BOARD_COOK_AT = new THREE.Vector3().addScaledVector(LAY, 2.55).addScaledVector(ALONG, -1.30).setY(GRILL_OFFSET.y - KITCHEN_DROP)
export const BOARD_COOK_YAW = Math.atan2(-LAY.x, -LAY.z)
/** the owner, smaller than the cooks (round and short, as Overcooked's), and how far down the cook's aisle his walk goes, in his own frame */
export const BOSS_SCALE = 1.05 * 0.8 * GRILL_SCALE
/** a step in the Roasting frame, in his own (turned with him, his size) */
const bossFrame = (v: THREE.Vector3, unit = false): [number, number] => {
  const w = v.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -CHEF_YAW)
  if (unit) w.normalize(); else w.divideScalar(BOSS_SCALE)
  return [w.x, w.z]
}
/** his way about, from a place of his (BossAisle): straight back to the walking line, then along it */
const bossAisle = (home: THREE.Vector3) => {
  const h = home.dot(ALONG)
  return { mouth: bossFrame(LAY.clone().multiplyScalar(WALK_LAY - home.dot(LAY))), dir: bossFrame(ALONG, true),
    range: [(WALK_ALONG[0] - h) / BOSS_SCALE, (WALK_ALONG[1] - h) / BOSS_SCALE] as [number, number] }
}
/** the low wooden step on the notch's floor that he stands on at the fire (the owner's; blender/notchstep.py's NotchStep): its height, its
 * size, and where it stands: on the kitchen's floor, from wall to wall across the notch (its walls at the floor, the table's dark kick, are
 * STEP_FIT out from COOK_NOTCH's cut, and it 3 mm short of them), from the notch's back wall out a little past the table's edge, under his
 * feet; turned with the table */
const STEP_FIT = 0.047
export const NOTCH_STEP = { h: STEP_H, d: 2.4 - (COOK_NOTCH.lay[0] - STEP_FIT) }
export const NOTCH_STEP_AT = new THREE.Vector3().addScaledVector(ALONG, CHEF_AT.dot(ALONG)).addScaledVector(LAY, COOK_NOTCH.lay[0] - STEP_FIT + NOTCH_STEP.d / 2)
  .setY(KITCHEN_FLOOR_Y)
export const NOTCH_STEP_YAW = Math.atan2(-ALONG.z, ALONG.x)
/** the third cook's (SousStep): his bay's floor filled with the same step (the owner's, 2026-11-10: it stood out over the table's end, a
 * board in the air), from wall to wall across it and from its back wall to the table's end, level with the owner's; turned so its depth
 * runs into the bay, along the table */
export const SOUS_STEP_AT = new THREE.Vector3().addScaledVector(ALONG, (SOUS_NOTCH.along[0] - STEP_FIT + COOK_TABLE.along[1]) / 2 - FIRE_SHIFT.dot(ALONG))
  .addScaledVector(LAY, (SOUS_NOTCH.lay[0] + SOUS_NOTCH.lay[1]) / 2 - FIRE_SHIFT.dot(LAY)).setY(KITCHEN_FLOOR_Y)
export const SOUS_STEP_YAW = Math.atan2(ALONG.x, ALONG.z)
export const BOSS_AISLE = { ...bossAisle(CHEF_AT),
  step: { to: (NOTCH_STEP_AT.dot(LAY) + NOTCH_STEP.d / 2 - CHEF_AT.dot(LAY)) / BOSS_SCALE, h: NOTCH_STEP.h / BOSS_SCALE } }
// (his walk on his round: out of the notch (straight back) and along the aisle)
export const BOSS_WALK = bossFrame(ALONG.clone().multiplyScalar(1.7).addScaledVector(LAY, WALK_LAY - CHEF_AT.dot(LAY)))
/**
 * The cook table and its hearth on the floor plan, in the table's own frame (its corners' markers' frame: along it, across it, the hearth's
 * middle at FIRE_SHIFT): what no one may stand in (game/hearthGuard)
 */
export const HEARTH_ZONES: HearthZones = {
  table: { along: [COOK_TABLE.along[0], COOK_TABLE.along[1]], lay: [COOK_TABLE.lay[0], COOK_TABLE.lay[1]] },
  pit: { along: [FIRE_SHIFT.dot(ALONG) - HEARTH_HALF * HEARTH_LONG, FIRE_SHIFT.dot(ALONG) + HEARTH_HALF * HEARTH_LONG], lay: [-HEARTH_HALF, HEARTH_HALF] },
  notch: { along: [COOK_NOTCH.along[0], COOK_NOTCH.along[1]], lay: [COOK_NOTCH.lay[0], COOK_NOTCH.lay[1]] },
  bay: { along: [SOUS_NOTCH.along[0], SOUS_NOTCH.along[1]], lay: [SOUS_NOTCH.lay[0], SOUS_NOTCH.lay[1]] },
}
