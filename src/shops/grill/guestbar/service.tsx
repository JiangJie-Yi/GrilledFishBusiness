import { toss, type Waste } from '@/game/service/bins'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { warmLater } from '@/scene/render/Prewarm'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { PLATE_DIMS, type PlateKind } from '@/game/service/plateSize'
import { CARRY_FRONT, HOLD_AIR } from '@/scene/people/StaffFigure'
import { wareGeometry } from '@/shops/grill/kitchen/ware'
import { HAND_MS } from '@/shops/grill/rooms/Restroom'
import { STACK_CAP } from '@/game/service/plates'
import { type Wares } from '@/game/service/ware'
import { TISSUE_REACH_MS, SINK_BIN, isCan, type DrinkId, platingOf } from '@/shops/grill/bar'
import { BONES_GEO } from '@/shops/grill/kitchen/fishBones'
import { STAFF_SCALE } from './staffPoses'

/** the women's kinds, who use the women's toilet */
export const HER = new Set(['officeLady', 'schoolgirl', 'yukataLady', 'grandma', 'maidCoser', 'gyaru', 'housewife', 'nurse'])
/** how often one sat waiting gets up to go to the toilet (per second), and how long they're in there */
const WC_RATE = 1 / 240
const WC_STAY = 6
/** seconds from the stall's way in to sat on the toilet; and how far a customer sat on it is lowered from a stool's seat (FolkFigure's SEAT,
 * 0.31) to its seat (blender/wc.py's bowl, 0.40 up) */
export const WC_TO_SEAT = 1.0, WC_SIT_LIFT = 0.40 - 0.31
/** how long each one's in the toilet: 4 to 6 seconds, their own (the owner's) */
export const wcStayOf = (id: number) => WC_STAY - 2 + ((id * 7919) % 100) / 50
/** and how long they wash their hands at the washstand after, the tap running (Restroom's HAND_MS) */
export const HAND_S = HAND_MS / 1000
/** after washing, their hands held under the hand dryer on the wall by the washstand (the owner's: no towel; Restroom's WcDryer blows) */
export const HAND_DRY_S = 1.5
/** and to go and get themselves a drink from the fridge: soon after they've sat down, waiting or eating (item 210: an izakaya in Osaka, とりあえず
 * ビール: about half of them had one, once), and another once it's drunk, up to DRINKS_MAX; how long they stand choosing */
const DRINK_RATE = 1 / 12
export const REFILL_RATE = 1 / 10
export const DRINKS_MAX = 3
/** (in development, `__drinkRate` in the console makes them thirstier, for watching it) */
export const drinkRate = () => (import.meta.env.DEV ? (window as unknown as { __drinkRate?: number }).__drinkRate : undefined) ?? DRINK_RATE
/** (and `__wcRate` readier for the toilet) */
export const wcRate = () => (import.meta.env.DEV ? (window as unknown as { __wcRate?: number }).__wcRate : undefined) ?? WC_RATE
export const DRINK_STAY = 2.25

/** a plate laid on the plating place for a seat, its food put on it there ('ready'), carried to the seat by a server ('carry'), set at it ('set'), left
 * at it dirty till a server comes for it ('dirty') and on their tray to the sink ('taken'); with no server to carry anything (a bar with
 * nobody on its floor), off the racks to the seat by itself ('serve'), cleared away to the sink by itself ('clear', after a pause), and
 * washed, back to the racks ('home') */
export type PlateRun = { key: number; seat: number; guest: number; phase: 'ready' | 'serve' | 'carry' | 'set' | 'dirty' | 'taken' | 'clear' | 'home'; t: number; from: THREE.Vector3
  /** which plate it is (game/plateSize, item 228: by what its seat ordered), for all its run, to the seat and back */
  kind?: PlateKind
  /** (clearing) its place on the dirty stack in the sink, taken when it sets off, so two cleared at once don't aim for the same one; (going
   * home) where on the racks it goes */
  to?: THREE.Vector3
  /** (on the plating place) its slot there */
  slot?: number
  /** (done with) the crumpled tissue they wiped their mouth with, beside it, from its middle: cleared with it (the owner's) */
  tissue?: [number, number, number]
  /** (done with) the sticks left on it, of what was eaten off it: into the bin by the sink with them */
  sticks?: number
  /** (done with) the whole fish eaten off it, their bones left on it; and the customer's emptied glass beside it, cleared with it */
  bones?: number; glass?: [number, number, number]
  /** (done with) what they drank, its bottle or can left where it stood (and a sake's cup), and how much was left in it */
  drink?: DrinkId; level?: number
  /** (done with) how dirty it's been left (game/plates' plateDirt: by how much was eaten off it) */
  dirt?: number
  /** (done with) the bowls, the renge and the chopsticks left at its place (item 600), cleared with it to the sink; `bare`: no plate, only
   * those (a customer who'd had no plate, or whose plate was taken before they went) */
  ware?: Wares; bare?: boolean }
export const STACK_GAP = 0.026
/** the step between two round plates nested in a stack (item 358, the owner's 「漂浮?」: at STACK_GAP each stood a plate's whole depth and
 * more over the one under it, a gap of air between every two, a stack of plates floating over one another): a real stack's, about a third
 * of a plate's depth (the round one 0.0198 deep, its outline 0.0207: clear of the one under's outline and its smear) */
export const NEST_GAP = 0.0055
/** (a ray down onto one surface, made once: the counter's top under the sink's stack) */
export const SURFACE_RAY = new THREE.Raycaster(), SURFACE_HITS: THREE.Intersection[] = [], TOP_FROM = new THREE.Vector3(), DOWN_Y = new THREE.Vector3(0, -1, 0)
export const UP_Y = new THREE.Vector3(0, 1, 0)
/** what was left on cleared plates thrown into the bins by the sink (item 208, game/bins): the sticks, the fish's bones and the crumpled
 * tissues into the rubbish bin, the bottles and cans into the recycling bin; each bin's lid lifted a moment for what goes in it */
export function binThrow(plates: readonly PlateRun[]) {
  let b = SINK_BIN.b
  const was = { ...b }
  for (const x of plates) {
    b = toss(b, 'stick', x.sticks ?? 0)
    b = toss(b, 'bone', x.bones ?? 0)
    if (x.tissue) b = toss(b, 'tissue')
    if (x.drink) b = toss(b, (isCan(x.drink) ? 'can' : 'bottle') as Waste)
  }
  SINK_BIN.b = b
  const now = performance.now()
  if (b.rubbish > was.rubbish) SINK_BIN.lids.rubbish.until = now + 1400
  if (b.recycle > was.recycle) SINK_BIN.lids.recycle.until = now + 1400
}
export const SERVE_S = 0.55
export const CLEAR_S = 0.6
export const CLEAR_DELAY = 1.0
/** how long a server takes to lay a clean pair of chopsticks on a place's rest once it's cleared and wiped (item 600) */
export const LAY_S = 0.55
/** a plate's flight takes at least this long a unit of its way (the bar's): from the racks, or to the sink, it's across the room */
export const FLY_PER = 0.3
export const HOME_S = 0.8
/** what's set out on the plating place goes once it's been all there this long (a moment for anything more for the seat to come off the fire) */
export const READY_S = 1.2
/** a plate's size on the cook table at the plating place (a little smaller: the room there's between the tasting bowl and the bin), and how many of its stack are drawn at most (a few over what the kitchen
 * keeps there: those put back from a slot whose customer left) */
export const ON_TABLE = 0.85
/** the plater's rice bowl (a wooden rice-washing bowl, open), and the rice in it */
/** the plater's hand props for the fire and the soup: binchotan sticks, a wooden dipper (made once) */
export const X_AXIS = new THREE.Vector3(1, 0, 0)
export const COAL_STICK_GEO = new THREE.CylinderGeometry(0.009, 0.01, 0.15, 6)
export const COAL_STICK_MAT = new THREE.MeshToonMaterial({ color: '#2b2b2e' })
export const DIPPER_CUP_GEO = new THREE.CylinderGeometry(0.04, 0.034, 0.05, 12, 1, true)
export const DIPPER_HANDLE_GEO = new THREE.CylinderGeometry(0.006, 0.006, 0.2, 6)
export const DIPPER_MAT = new THREE.MeshToonMaterial({ color: '#c8a273' })
export const DIPPER_WATER_GEO = new THREE.CircleGeometry(0.037, 12)
export const DIPPER_WATER_MAT = new THREE.MeshToonMaterial({ color: '#9ccbe0', transparent: true, opacity: 0.8 })
/** how often (seconds) the plater goes to stir the miso soup when there's nothing else, and for how long */
export const SOUP_EVERY = 40, STIR_S = 3
/** (item 392) how often the plater, with nothing else wanting, grates daikon for the fish's plates (s), and how long at it */
export const GRATE_EVERY = 55, GRATE_S = 4.2
/** the water bucket up on the cook table by the third cook's bay (Roasting's TABLE_BIN): a plater whose place is nearer it than DIP_NEAR
 * (the third cook, in his bay) steps toward it in his place till it's DIP_REACH off and dips it from there, his arm and the dipper the rest
 * (the bar's units) */
export const DIP_NEAR = 0.7, DIP_REACH = 0.21
export const RICE_BOWL_GEO = new THREE.CylinderGeometry(0.1, 0.07, 0.07, 16, 1, true).translate(0, 0.035, 0)
/** the rice bowl's middle held out before the one carrying it (the bar's units): their body's front, a little air, and the bowl's own
 * radius (item 628, the owner's 「避免這種情況」: held at a tray's place, a tray's thin, the back half of the bowl was in the third cook) */
export const BOWL_HOLD = (CARRY_FRONT + HOLD_AIR) * STAFF_SCALE + RICE_BOWL_GEO.parameters.radiusTop
/** the phases the third cook has the rice bowl in their hands: scooped full at the sack, to the sink, washed, to the pot, tipped in */
export const RICE_WASH_PHASES = new Set(['scoopRaw', 'toSink', 'wash', 'toKama', 'load'])
/** (item 628) the third cook's hands on the rice bowl's sides (the world's), a third of the way up it, wherever it is: carried, swirled in
 * the sink, tipped into the pot (they stayed where a tray's held, under the bowl's back half) */
export const WASH_BOWL_HANDS = { left: new THREE.Vector3(), right: new THREE.Vector3() }
export const WASH_BOWL_ON = { v: false }
const BOWL_SIDE = new THREE.Vector3()
const BOWL_TIP_AXIS = new THREE.Vector3(0, 0, 1)
export function riceBowlHands(b: THREE.Object3D, yaw: number) {
  const p = RICE_BOWL_GEO.parameters, up = p.height / 3
  // (its wall's radius that far up it, and a palm's thickness out from it)
  const r = p.radiusBottom + (p.radiusTop - p.radiusBottom) / 3 + 0.012
  b.updateWorldMatrix(true, false)
  for (const [out, sd] of [[WASH_BOWL_HANDS.left, -1], [WASH_BOWL_HANDS.right, 1]] as const) {
    // (their side, in the bowl's own frame: the bar's, the bowl tipped about the bar's z as it's poured)
    BOWL_SIDE.set(Math.cos(yaw) * sd, 0, -Math.sin(yaw) * sd).applyAxisAngle(BOWL_TIP_AXIS, -b.rotation.z)
    b.localToWorld(out.copy(BOWL_SIDE).multiplyScalar(r).setY(BOWL_SIDE.y * r + up))
  }
}
export const RICE_IN_GEO = new THREE.CylinderGeometry(0.092, 0.08, 0.025, 16)
/** how long a server wipes the bar down where a plate was cleared: two strokes along and back */
export const WIPE_S = 1.6
/**
 * Clearing a place by hand (item 231, the owner's 「收東西跟擦桌子的動畫都還很不OK」: the plate slid off the bar onto the tray by itself, no hand
 * near it, and the bar was wiped on one line twice in a second): from their arriving at the seat, the right hand goes out to the plate's
 * rim and the left to the tray's side (CLEAR_REACH), the plate's lifted with the hand in a little arc onto the tray (CLEAR_LIFT) and let go
 * (CLEAR_SET); then the cloth's out and the place wiped where it stood (WIPE_S), the tray still in the left hand. The shop's seconds.
 */
export const CLEAR_REACH = 0.35, CLEAR_LIFT = 0.4, CLEAR_SET = 0.15
/** (item 600) each stick of a place's pair as it lies on its rest, in the pair's piece's frame (Roasting's BarChopsticks' `onSet`, its SETTING:
 * 22 cm long, sloping up onto the rest), for one lifted off it or laid on it to start and end where the place's own are drawn */
export const CHOP_ON = [-1, 1].map((sd) => new THREE.Matrix4().compose(new THREE.Vector3(-0.11, 0.0015, sd * 0.0075),
  new THREE.Quaternion().setFromEuler(new THREE.Euler(0, sd * 0.012, Math.atan2(0.0075, 0.198))), new THREE.Vector3(1, 1, 1)))
/** (item 600) how much of a bowl's left in it as it's left at the place (SideBowls' eaten down), and in the top one of the sink's stacks */
export const WARE_LEFT = 0.12, WARE_RINSE = 0.05
/** (item 600) the most of each kind drawn stacked in the sink (counted as many as there are) and stood in its soaking pot */
export const SINK_BOWLS_SHOWN = 6, POT_PAIRS_SHOWN = 8, POT_RENGE_SHOWN = 5
/** (item 600) a nested bowl's rise over the one under it */
export const BOWL_NEST = 0.012
export const CLEAR_WIPE_AT = CLEAR_REACH + CLEAR_LIFT + CLEAR_SET
/** each server's two hands while clearing (the world), and the scratch for finding them */
export const CLEAR_HANDS = [0, 1, 2, 3].map(() => ({ left: new THREE.Vector3(), right: new THREE.Vector3() }))
/** each server's hands as they put what they've cleared into the sink (item 590): down into the basin over the counter, not the tray held out
 * before them at their waist, through the curtain under the counter and into the cabinet */
export const SINK_HANDS = [0, 1, 2, 3].map(() => ({ left: new THREE.Vector3(), right: new THREE.Vector3() }))
export const CLEAR_SIDE = new THREE.Vector3()
/** how far out in front the wiping hand is in the figure's frame (StaffFigure's WIPE_HAND.z): the stroke's middle, for the cloth over the place */
export const WIPE_HAND_Z = 0.44
export const CLEAR_TOWARD = new THREE.Vector3()
/** where they stand to wipe it: along the bar from the seat's middle (between its stool and the next), and back from the bar's middle line
 * (a step back from its edge, reaching to it: right up against it, their face was just over the top, at their shoulders) */
export const WIPE_STAND = [0.34, 0.53] as const
/** the cloth they wipe it with: a folded white towel */
export const RAG_GEO = new RoundedBoxGeometry(0.085, 0.007, 0.05, 1, 0.003)
// (as many as the stack holds: drawn from loading, shown as many as there are (item 630: the stack 4 to 8, drawn 7 to 8, not 11: the
// Optimization window's))
export const PASS_STACK_SHOWN = STACK_CAP
/** a plate's size in the sink, against its own: its own (item 203, the owner's 「盤子進水槽變小」: 0.78 when every plate was the one big round
 * plate and the sink's stack had to fit; the plates sized to what's on them since (item 228), none shrinks on its way in or grows on its way
 * out) */
export const IN_SINK = 1
/** the most of the sink's dirty plates drawn stacked in it: as many as stand clear under the tap's spout (cleared on the way back (item 53),
 * the sink took up to twenty-five on an ordinary evening, a stack up through the tap); the rest are counted and washed, the stack no higher */
export const SINK_SHOWN = 12
/** a plate standing in the draining basket: its size, a third of its depth */
export const IN_DRAIN: [number, number, number] = [IN_SINK, IN_SINK * 0.3, IN_SINK]
/** the sink's tap running, a plate washed every this many seconds, lifted out and back to the racks */
export const WASH_EACH = 0.5
/**
 * Where one stands before a counter across from something on it (`at`), as far out from the counter's front as one stands at another thing on
 * it (`stand`, before `thing`): on the line through `stand` square across the counter (the way from `stand` to `thing` is into it), across
 * from `at`. (Item 387: moved back from `at` as far as `stand` is from `thing`, a thing further in on the counter put them in it)
 */
export function frontOf(at: THREE.Vector3, stand: THREE.Vector3, thing: THREE.Vector3) {
  const into = thing.clone().sub(stand).setY(0)
  if (into.lengthSq() < 1e-8) return at.clone().setY(0)
  into.normalize()
  return at.clone().setY(0).addScaledVector(into, -at.clone().sub(stand).setY(0).dot(into))
}
/** what stands on the kitchen's floor that a server crossing it to the racks goes round (with the cook's table) */
export const KITCHEN_BLOCKS = new Set(['warmer', 'prepcounter', 'ricetub', 'misopot', 'denkinabe', 'fryer', 'freezer', 'platerack', 'platerack2', 'lowrack', 'sink', 'sink-bin', 'produce', 'vegcrate', 'vegcrate2', 'vegbasket', 'coalsack', 'servecounter'])
/** how much room is left round each of them for a server to pass (the bar's units) */
export const PASS_ROOM = 0.13
/** what stands up off one of them as high as a head (by its name), and how much room is left round it (item 591): PASS_ROOM is room for a
 * body at a counter's top; a head is rounder (0.25 out to the side of one's feet, 0.30 ahead), so going by the sake station's open bottle
 * at the serving counter's end, kept PASS_ROOM off the counter, the second cook's feet came 0.32 off its middle (it's 0.046 round): his
 * head and glasses 2 to 9 cm into it, coming round the counter's end with the fish (tests/e2e/sinkin.mjs, _route591.mjs). As much as
 * leaves the way between the counter's back and the freezer open (0.33 closed it: the fish fetched the long way round, a quarter slower) */
export const HEAD_HIGH = ['sake-station-bottle']
/** (item 678, the owner's 「這甚麼?」 on the map of the ways' 「穿過家具（4 條路）」) what stands on the kitchen's floor that isn't one of the editor's
 * pieces, found by its name: the skewer buckets by the cook table (kitchen/SkewerStore), the owner's ways went through the used one */
export const NAMED_BLOCKS = ['skewer-tray', 'skewer-holder']
export const HEAD_ROOM = 0.27
/** and the more a server's own place is kept off it, their hands hanging at their sides (the bar's units: 0.1, 20 cm in the world) */
export const HOME_ROOM = 0.1
/** how far before a server what they hold is (their tray and hands: StaffFigure's, 0.6 out in the world; the bar's units) */
export const TRAY_REACH = 0.3
/** how far back off the sink's front mark a server stands at it (the bar's units: 16 cm in the world) */
export const SINK_BACK = 0.08
/** with no cashier at the till (item 203: the register rang them up by itself): how long (the bar's clock, s) one waits there for a server to
 * come round to it before paying as before (no one stuck at the door all night: the shop closing, every server tied up). At 30, on an
 * ordinary evening x2 a server came for 12 of 20 (4 to 27 s); 45, a busy shop's wait */
export const TILL_WAIT_MAX = 45
/** (the till's call taken by the third cook, not a server: tillCall's `staff`) */
export const TILL_BY_PLATER = 99
/** where a takeaway waits in the genkan, off the line those paying walk out along (item 203): this far to its side, toward the till, and a
 * second this much further (the genkan's stone reaches 0.6 that way: tests/e2e/_genkan203.mjs) */
// (item 410: in a little from the sliding door, its leaves on the sill (-0.25 stood one's head in the shut south leaf); a second along the
// line toward the till rather than out beside the first, where the door is)
export const TAKEOUT_ASIDE = -0.22, TAKEOUT_NEXT = 0.25
/** those waiting for a stool, at the genkan's step: how long they stop there to step out of their shoes (or into them going), and how far
 * the pair's left on the stone back from where they stepped up, toes out (item 203: the bench is on the room's boards, and they walked up
 * onto them in their shoes) */
export const SHOE_OFF_S = 0.8
export const SHOES_BACK = 0.13
/** the step stool's half its width and its depth, in its own frame (blender/stepstool.py: 0.66 by 0.40), and the ramp at its edges over
 * which one stepping onto it comes up to its top (the bar's units) */
export const STOOL_HALF = [0.33, 0.2] as const
export const STOOL_STEP = 0.045
/** how fast one goes up onto it or down off it (the bar's units a second: its 0.16 in about a quarter of a second) */
export const STOOL_CLIMB = 0.6
// (the same shape as the big plate by the fire, smaller: a foot, a shallow well, a lifted rim)
export const PLATE_R = 0.13
export const PLATE_GEO = wareGeometry(([[0, 0], [0.32, 0], [0.4, 0.012], [0.47, 0.03], [0.5, 0.038], [0.49, 0.042], [0.44, 0.026],
  [0.3, 0.01], [0, 0.01]] as [number, number][]).map(([x, y]) => [x * PLATE_R * 2, y] as [number, number]), PLATE_R)
export const SMEAR_GEO = new THREE.CircleGeometry(0.058, 18)
/** how high a plate's floor is in its own units (where what's left on it lies): the long one's and the round one's (item 251's) */
export const FLOOR_LONG = 0.008, FLOOR_ROUND = 0.009
/** each kind of plate's size against the shop's round plate as it's drawn (PLATE_GEO, 2 x PLATE_R across its rim): the long one's own */
export const KIND_SCALE: Record<PlateKind, number> = { round: PLATE_DIMS.round.w / (2 * PLATE_R), mame: PLATE_DIMS.mame.w / (2 * PLATE_R), long: 1 }
/** a place's dishes from the stove and the fryer (items 461, 469; their plates 0.138 across, Stove's DISH_SCALE): the first this far either
 * side of the place's middle (the long plate's end at 0.15, 2 cm clear), each next pair this much further out, all this far in front of the
 * counter's line (the plate's back at 0.04, the chopsticks' front row at -0.135 and only 0.11 to either side; the drink, the soup and the soy
 * dish behind at 0.08 to 0.13) */
export const DISH_ALONG = 0.24, DISH_STEP = 0.155, DISH_LAY = -0.06
/** how long (ms, real time) a dish from the stove, the fryer or the board is waited on before the third cook makes it ahead of pouring the
 * sake, fetching plates and filling bowls (item 461's evening: last of them, it was never come to) */
export const KITCHEN_DUE_MS = 12000
/** a turn from one way to another by k (0..1), the short way round */
export const turnBy = (from: number, to: number, k: number) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * k
/** the way the plates at the plating place lie (their length back across the cook table, as what's on them does), as a turn about up in
 * the bar's frame: the long plate's length (its x) that way */
export const PASS_YAW = (() => { const d = platingOf().dir; return Math.atan2(-d.z, d.x) })()
/** where a fish's bones are left on the long plate, along it, the head the way the fish's was (x, z, its turn) */
export const BONES_ON_LONG = [[0.0, -0.014, Math.PI + 0.05], [0.012, 0.024, Math.PI - 0.08]] as const
/** the owner washing a plate up by hand (item 174): the suds on its face, a few small white blobs (x, z on it, how big), and the drops
 * running off its edge into the water; low-poly, made once */
export const FOAM_AT: [number, number, number][] = [[0.01, 0, 1], [-0.035, 0.025, 0.85], [0.04, -0.03, 0.9], [-0.02, -0.045, 0.75], [0.05, 0.035, 0.7],
  [-0.055, -0.005, 0.8], [0, 0.05, 0.7]]
export const FOAM_GEO = new THREE.IcosahedronGeometry(0.016, 1)
export const FOAM_MAT = new THREE.MeshToonMaterial({ color: '#f6f9fc' })
export const DRIP_GEO = new THREE.IcosahedronGeometry(0.0045, 0).scale(1, 1.7, 1)
export const DRIP_MAT = new THREE.MeshBasicMaterial({ color: '#d6ecf7' })
/** how far along the sink's front the owner stands over toward the basket to wash (the bar's units), and where he works a plate: in from the
 * basin's middle toward him, and up over the water */
export const WASH_SHIFT = 0.22
// (0.16 in, the plate's edge came over the basin's near wall onto the counter)
export const WORK_IN = 0.05
export const WORK_UP = 0.035
// (scratch, kept)
export const WASH_FWD = new THREE.Vector3()
export const SPOUT_AT = new THREE.Vector3()
export const STREAM_W = new THREE.Vector3()
/** the player's plate in hand (items 224, 234): where it's to be held (the scratch), and how long it takes washed into the basket (s) */
export const HAND_TO = new THREE.Vector3()
export const HAND_TO_BASKET_S = 0.35
/** scratch: where the sake station's pour is heard from (item 633) */
export const STATION_POUR_AT = new THREE.Vector3()
export const HAND_STREAM = new THREE.Vector3()
/** (item 458) scratch for the pointer's ray: where it's on the screen, the level it meets, where; a point in the world */
export const HAND_NDC = new THREE.Vector2(), HAND_PLANE = new THREE.Plane(), HAND_HIT = new THREE.Vector3(), HAND_TOP = new THREE.Vector3(), HAND_W = new THREE.Vector3(), HAND_BOX = new THREE.Box3()
/** (item 638) how many plates soak in the basin under the top one, how far up each lies on the one under it, and scratch for where */
export const UNDER_MAX = 3, PILE_STEP = 0.014
export const PILE_AT = new THREE.Vector3()
/** the sponge let go of, on its way back onto its dish (s, item 606: it's in hand only while it's dragged); scratch for whether it's over
 * the plate in the water */
export const SPONGE_BACK_S = 0.22
export const RUB_BOX = new THREE.Box3(), RUB_C = new THREE.Vector3()
/** a plate carried over the counter: how far over the water's top over the basin; how far over the counter's top, or the draining basket's
 * rim, past it (item 642) */
// (its middle that far over: tipped as it's carried, its low edge comes 4.5 cm nearer)
export const CARRY_UP = 0.1, CARRY_CLEAR = 0.075
export const CARRY_RAY = new THREE.Raycaster(), CARRY_FROM = new THREE.Vector3(), CARRY_DOWN = new THREE.Vector3(0, -1, 0)
export const DRIP_LOW = new THREE.Vector3()
/** a smear's opacity by how dirty the plate is: as dark as it ever was (0.6) from a plate of two dishes on, a plate of one a little lighter,
 * fading smoothly to nothing as it soaks clean */
export const smearOpacity = (dirt: number) => 0.62 * Math.min(1, dirt * 1.6)
export const USED_STICK_GEO = new THREE.CylinderGeometry(0.004, 0.003, 0.18, 5)
/** where on a done-with plate its used sticks lie, criss-cross (as many as were eaten off it, up to four drawn) */
export const STICKS_ON = [[-0.02, 0.6], [0.015, -0.4], [-0.035, 1.3], [0.03, 0.15]] as const
/** where the bones lie on a done-with plate (as many fish as were eaten off it, up to two drawn) */
export const BONES_ON = [[0.0, -0.025, 0.25], [0.01, 0.03, -0.35]] as const
/** where it rides once the plate's up on the tray: on the plate, at its middle */
export const GLASS_ON: [number, number, number] = [0.02, 0, 0.02]
/** a used tissue crumpled into a ball (a lumpy little ball, its points pushed in and out); on the plate once it's taken up with it */
export const CRUMPLE_GEO = (() => {
  const g = new THREE.IcosahedronGeometry(0.018, 1)
  const p = g.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < p.count; i++) {
    const k = 0.72 + 0.5 * Math.abs((Math.sin(i * 12.9898 + p.getX(i) * 311) * 43758.5453) % 1)
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.8, p.getZ(i) * k)
  }
  g.computeVertexNormals()
  return g
})()
export const CRUMPLE_MAT = new THREE.MeshToonMaterial({ color: '#f7f5ef' })
export const TISSUE_ON: [number, number, number] = [-0.035, 0.006, 0.025]
/** how long a customer wipes their mouth with a tissue before getting up */
// (the reach down to their drawer for the tissue first (item 269), then the wipe)
export const WIPE_MOUTH_MS = 900 + TISSUE_REACH_MS
/** a sip of their drink: how long (the bar's clock), about how long between sips, how many to a drink */
export const SIP_S = 2.4
/** how long a mouthful of miso soup takes, the bowl taken up in both hands and put down again (item 345) */
export const SOUP_SIP_S = 3.2
/** (item 210: a drink went down in about fifty minutes, so few had a second; an izakaya's customers have two or three in an evening) */
export const SIP_GAP = 6
export const SIPS = 4
// (a done-with plate's bones, and the plater's rice bowl, first shown mid-shift: their shaders made with the rest at load (scene/Prewarm))
{
  const g = new THREE.Group()
  g.add(new THREE.Mesh(BONES_GEO, new THREE.MeshToonMaterial({ color: '#efe6cf' })))
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.0255, 0.0255, 0.006, 14), new THREE.MeshToonMaterial({ color: '#b98b56', side: THREE.DoubleSide })))
  warmLater(g)
}

/**
 * What's set on a plate with the food (item 272, the owner's, 2026-11-17: 「擺盤跟比例也是，會讓人覺得遊戲有點隨便做的感覺」): at the front
 * and to the right of the one it's set before (前盛り, as a Japanese grill plates it), on a long plate a shiso leaf, a little mound of grated
 * daikon on it and a stick of pickled ginger shoot (はじかみ) leaning on that, pink at its foot; on a round one a half-moon of lemon and a
 * pinch of daikon; nothing on a little one. Left when the food's eaten: the leaf and the ginger (the daikon's eaten with the fish). Each set
 * one mesh in its colours (one draw a plate), in the plate's own units, the customer's side its -z and their right its -x (measured)
 */
export const GARNISH_MAT = new THREE.MeshToonMaterial({ vertexColors: true, side: THREE.DoubleSide })
const tint = (g: THREE.BufferGeometry, hex: string) => {
  const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b }
  const out = g.index ? g.toNonIndexed() : g
  if (out !== g) { const m = out.attributes.position.count, b = new Float32Array(m * 3); for (let i = 0; i < m; i++) { b[i * 3] = c.r; b[i * 3 + 1] = c.g; b[i * 3 + 2] = c.b } out.setAttribute('color', new THREE.BufferAttribute(b, 3)); out.deleteAttribute('uv'); return out }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3))
  g.deleteAttribute('uv')
  return g
}
/** a shiso leaf lying flat, its edge toothed, cupped a little along its midrib; `len` long, its tip toward +x */
function shisoLeaf(len: number) {
  const s = new THREE.Shape(), N = 12, pts: [number, number][] = []
  for (let k = 0; k <= N; k++) {
    const t = k / N, w = len * 0.36 * Math.sin(Math.PI * t) ** 0.8 * (k % 2 && k < N ? 1.08 : 1)
    pts.push([len * (t - 0.5), w])
  }
  for (let k = N - 1; k >= 1; k--) { const [x, w] = pts[k]; pts.push([x, -w]) }
  s.moveTo(pts[0][0], pts[0][1])
  for (const [x, y] of pts.slice(1)) s.lineTo(x, y)
  const g = new THREE.ShapeGeometry(s).rotateX(-Math.PI / 2)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) p.setY(i, Math.abs(p.getZ(i)) / (len * 0.36) * len * 0.07)
  g.computeVertexNormals()
  return g
}
/** a little lumpy mound (grated daikon), `r` across */
function mound(r: number, seed: number) {
  const g = new THREE.IcosahedronGeometry(r, 1)
  const p = g.attributes.position
  let k = seed
  for (let i = 0; i < p.count; i++) {
    k = (k * 16807) % 2147483647
    const j = 0.85 + 0.3 * (k / 2147483647)
    p.setXYZ(i, p.getX(i) * j, Math.max(0, p.getY(i)) * 0.6 * j, p.getZ(i) * j)
  }
  g.computeVertexNormals()
  return g
}
export const GARNISHES = (() => {
  if (typeof document === 'undefined') return null
  // (the long plate's: the leaf front right, its tip out toward the plate's end, the daikon on its middle, the ginger leaning on it)
  const leaf = tint(shisoLeaf(0.06), '#3d7a35').rotateY(0.5).translate(-0.085, FLOOR_LONG + 0.0015, -0.03)
  const dai = tint(mound(0.012, 7), '#f3f0e6').translate(-0.085, FLOOR_LONG + 0.004, -0.03)
  const stem = (from: number, to: number, hex: string) => tint(new THREE.CylinderGeometry(0.0016, 0.0019, to - from, 6).translate(0, (from + to) / 2, 0), hex)
  const ginger = mergeGeometries([stem(0, 0.016, '#e5839c'), stem(0.016, 0.05, '#e9ecd2')])!.rotateZ(-1.15).rotateY(0.35).translate(-0.066, FLOOR_LONG + 0.003, -0.022)
  const leftLong = mergeGeometries([leaf.clone(), ginger.clone()])!
  const fullLong = mergeGeometries([leaf, dai, ginger])!
  // (the round plate's: a half-moon of lemon lying on its side front right, its rind yellow, its flesh paler; a pinch of daikon by it)
  const half = new THREE.Shape()
  half.absarc(0, 0, 0.017, 0, Math.PI, false)
  half.lineTo(0.017, 0)
  const lemon = new THREE.ExtrudeGeometry(half, { depth: 0.008, bevelEnabled: false, curveSegments: 8 })
  const lemonC = tint(lemon, '#efd65a')
  lemonC.rotateX(-Math.PI / 2).rotateY(-0.6).translate(-0.04, FLOOR_ROUND + 0.0015, -0.032)
  const pinch = tint(mound(0.008, 11), '#f3f0e6').translate(-0.018, FLOOR_ROUND + 0.003, -0.045)
  const fullRound = mergeGeometries([lemonC, pinch])!
  const leftRound = lemonC.clone()
  return { long: { full: fullLong, left: leftLong }, round: { full: fullRound, left: leftRound } }
})()
// (made with the rest at load: shown only once there's food out)
if (GARNISHES) { const g = new THREE.Group(); g.add(new THREE.Mesh(GARNISHES.long.full, GARNISH_MAT)); warmLater(g) }
