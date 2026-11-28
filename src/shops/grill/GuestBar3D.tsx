import { batchSeconds, kitchenBatch, stationOf } from '@/game/kitchen/station'
import type { Station } from '@/data/kitchenDishes'
import { KitchenDishes } from '@/shops/grill/kitchen/Stove'
import { memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SKEWER_WASH_S, WASH_LOW, pickUpDirty, putBackClean, washAll, washGoes, washUrgent } from '@/game/kitchen/skewers'
import { stepFrame, waitsForStep } from '@/game/guests/genkanStep'
import { rattleSound } from '@/shops/grill/sounds/skewerSound'
import { getClock, minutesNow } from '@/ui/kit/clockStore'
import { crewCall, crewThanks, crewWelcome } from '@/shops/grill/staff/crewTalk'
import { nextClean, sweeps, SWEEP_S, WIPE_S as FLOOR_WIPE_S } from '@/game/service/spills'
import { FigureHit, GRABBING } from '@/scene/people/FigureHit'
import { glowOff, restingMaterial } from '@/scene/interact/hoverGlow'
import { BOX_SHEETS, sheetsFor, takeSheets } from '@/game/stock/tissues'
import { takeOne, takesTowel } from '@/game/guests/washroom'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import {
  COAT_OFF_S, COAT_ON_S, STAND_SLOTS as UMB_SLOTS, UMB_CLOSE_AT, UMB_DOOR_S, UMB_IN_S, UMB_PUT_S, UMB_TAKE_S, coatOffBeat, coatOnBeat,
  freeSlot, newCoatPose, umbInBeat, umbOutBeat, umbOutS
} from '@/game/guests/rainGear'
import { QUALITY } from '@/scene/render/quality'
import type { GuestView } from '@/game/types'
import { guestLabel, kindOf } from '@/data/guests'
import { FOLK_HEIGHT, FolkFigure, FolkWarm, SEAT as FOLK_SEAT, folkSpec, FOLK_HAND_REST } from '@/scene/people/FolkFigure'
import { delayOf, FADE_S, paceOf } from '@/game/staff/commute'
import { makeTrip, tripStep, turnSmooth, turnToward, type Trip } from '@/shops/grill/staff/commuteWalk'
import { StaffWords, TiredBadges } from '@/shops/grill/staff/StaffWords'
import { STAFF_SAY, STAFF_TALK, idleTick, paceOfStaff } from '@/game/world/shopState'
import { PILE_LINE, bossCleans, pileLeft, staffSink } from '@/game/service/sinkPile'
import { HAND_WASH_LINES, SPONGE_S, beatLength, handClean, handSays, handStops, scrubbed, washBeat, washPlateS, type HandAt } from '@/game/service/handWash'
import { POUR_TOTAL, SAKE_SET_S, SAKE_UP_S, STREAM_FROM, STREAM_TO, pourBeat, pouredBy, streaming } from '@/game/kitchen/sakePour'
import { SAKE_BOTTLE_ML, STATION_GO, TOKKURI_ML, stationGo } from '@/game/kitchen/sakeStand'
import { PLATE_NAME, plateSays } from '@/game/service/plateTip'
import { newWashPose, spongePose, washPose, type WashPoints } from '@/scene/people/washMotion'
import { PLATE_DIMS, PLATE_SPREAD, plateSide, type PlateKind } from '@/game/service/plateSize'
import { PathMap } from '@/shops/grill/editor/PathMap'
import { Drips } from '@/scene/effects/Drips'
import { ServeCounter } from '@/shops/grill/kitchen/ServeCounter'
import { PathVias, PathZones } from '@/shops/grill/editor/PathZone'
import { StaffFigure, TRAY_AT as HELD_AT, wipeStroke, SHAPE_HAND } from '@/scene/people/StaffFigure'
import { CRATE, CRATE_FULL } from '@/shops/grill/decor/Decor'
import { COAL_PER_ADD } from '@/game/kitchen/coalPile'
import { moodOf, walkSpeedOf } from '@/scene/people/people'
import { BlobShadow } from '@/scene/effects/BlobShadow'
import { type Look as StaffLook } from '@/data/staff'
import type { Lang } from '@/data/i18n'
import { sayTip, setTip, shownOver } from '@/scene/interact/hoverTip'
import { pourSakeAt } from '@/shops/grill/sounds/shrineSound'
import { getLights, setLightSwitch } from '@/scene/render/lightsStore'
import { Later } from '@/scene/render/Later'
import { designOf } from '@/shops/grill/kitchen/wareDesigns'
import { oribeLong, roundGlaze } from '@/shops/grill/kitchen/wareGlazes'
import { DiningWall, ShopProps } from './DiningRoom'
import { SakeCup } from './dining/cups'
import { cupped } from './dining/drinkKinds'
import { Tokkuri } from '@/shops/grill/kitchen/Tokkuri'
import { SakeStation, STATION, STATION_OBJ, stationPose, STATION_STREAM_TO } from '@/shops/grill/kitchen/SakeStation'
import { drawerOpens, paysByCard, tabletActive, tenderOf } from '@/game/money/till'
import { Movable } from '@/shops/grill/editor/Movable'
import { getEdit, offsetOf, setLocked } from './edit'
import { WASH_GUIDE, basinHint, guideOff, guideOn } from '@/shops/grill/kitchen/Sink'
import { paysAtTill } from '@/game/money/till'
import { dryerPhase, DRY_S, DRYER_CAP, LOW_FULL, PLATES_ALL, STACK_CAP, dryerTick, dutyOf, lowGoes, lowToBring, nextChore, onTheWay, plateSource, platerGoes, platesToBring, playerLoad, putBack, rackAtStart, START_DIRTY, START_DRAIN, unload, washOne, DRAIN_CAP, drainTick, handOne, unbasket, CLEAN_AT, DIRT_BASE, handTime, plateDirt, soakStep } from '@/game/service/plates'
import { kitchenPath, kitchenPathThrough, outOfPieces, reachSpot, reachableNear, standClear, type Rect } from '@/game/kitchen/kitchenPath'
import { PER_RACK } from '@/shops/grill/kitchen/PlateRack'
import { RICE_FULL, SCOOP_S, SHAPE_EACH, TRAY_MAX, WASH_S, emptyKama, kamaTick, riceGoes, setOn, takeRice, trayWants } from '@/game/kitchen/rice'
import { MAKE_S, SOUP_BOWLS, emptyPot, heatNow, heatRate, potTick, setSoup, soupGoes, soupReady, takeBowl, topUpGoes } from '@/game/kitchen/soup'
import { SeatBowls, fillRice, fillSoup, ladleRest, leftOf, riceFillPose, soupFillPose, useSideProps, type FillAt, type FillPose, type WareAt } from '@/shops/grill/kitchen/SideBowls'
import { addWares, cabinetAtStart, canFill, layPlace, leftAdded, noWares, takeForFill, wareCount, wareIntoWasher, wareOut, wareTrip, wareUrgent, wareWashNow, type Wares } from '@/game/service/ware'
import { coatSound, umbrellaSound } from '@/shops/grill/sounds/restroomSound'
import { bottleClink, lightSwitchSound, plateClink, plateDownSound, scrubSound, stoolSound, washSplash } from '@/shops/grill/sounds/restroomSound'
import { LAST_CALL, ON_DUTY, SHOP, clockIn } from '@/game/world/shopState'
import { flowerBuffs } from '@/game/world/shrineFlowers'
import { murmur } from '@/game/kitchen/fireSound'
import { crowdAmbience } from '@/shops/grill/sounds/fireAmbience'
import { LINES } from '@/data/lines'
import { looksOf, openRoom, penaltyOf, visitRoom } from '@/game/guests/restroom'
import { platerFree } from '@/game/kitchen/kitchenCrew'
import { WARE, SEAT_LEFT, CHOPS_USED, CHOPS_OFF, CHOPS_LOOSE, SEATS_UNCLEARED, FLOOR_CHECK, type PathCross, BOSS_BED } from './bar'
import { DRAIN_KINDS, PLATE_FACES, SEATS_SAT, DRAWER_KICK, seatTurn, GRATING, ONIGIRI_TRAY, HAND_WASH, FIGURES, CARRIED, SOY_DISH_AT, FETCHER, FIRE_TEND, SKEWERS, SEAT_MOVE, SEAT_PULL, STOOL_TUCK, SHOE_CELLS, aisleCornerOf, aisleOf, SHOP_PURSE, STOCKER_WC, SUPPLIES, CHOPS_UP, FED, BENCH, BENCH_SEATS, BENCH_EACH, BENCH_PLACE, BENCH2_ALONG, TAKEOUT_STAND, STAND_AT, cashierIn, gripe, setTissues, tissuesAt, meterWater, OWNER_OUT, OWNER_SPOT, OWNER_YAW, FIRE_SHIFT, KITCHEN_ROUTE, PATH_MAP, type PathRoute, SERVE_COUNTER, PLACE, SICK, SHRINE_FLOWERS, PLATING, READY_SLOTS, PLATE_STACK_ALONG, PLATE_STACK_ACROSS, readyAlong, PLATES_OUT, PLATER_OUT, DRYER, DRAIN, PLATE_COUNT, SINK_BIN, SEAT_STICKS, SEAT_BONES, RICE, SOUP, SOUP_SEATS, SAKE, SAKE_SEATS, SAKE_AT, LOW_RACK, takeDrink, KITCHEN_DROP, kitchenOf, FLOOR_FAR, FLOOR_NEAR, PLATES_SET, SINK, PILE, KITCHEN_FOLK, GENKAN, inGenkan, sauceSide, SEATS_TAKEN, SERVICE, BAR_GATES, TILL, TILL_CASH, anyInStock, batchOf, payIn, TILL_STATE, PLATE_RACK, GUEST_BILLS, DRINKS, yen, payOf, TAKEOUT, takeoutOf, tipOver, TOILETS, WC_GRUMBLE, DRINK_BACK, FRIDGE, FRIDGE_AT, FRIDGE_STATE, isCan, drinkFor, farOf, fridgesOf, storeOf, fridgeUnitOf, gateOf, toiletsOf, type DrinkId, platingOf, alongPath, doorOf, wayInOf, doorAt, doorOutOf, DOOR_LANE, pathLength, pathTo, seatsOf, singleCounter, type Counter, SPILLS, IRONS, type Spill, genkanY, soapPlate, scrubDose, SAY_SEATED, BOWLS, RICE_SEATS, sakeLeft, ownerAway, ownerFree, ownerBack, DRINK_COMING, KITCHEN, DRINK_FRIDGE_TEMP } from './bar'
import { servedWarm } from '@/game/stock/fridgeTemp'
import { arrivals, buyCase, caseCost } from '@/game/stock/drinkStock'
import { GAME_SPEED, tick } from '@/scene/kit/speed'
import { Register } from './guestbar/register'
import { SOUND_AT, LAY, ALONG, SPEED, RAKE_S, SERVER_SPEED, rampedAlong, AHEAD_S, ASIDE_V, WALK_MOST, STOCKER_KEY, BOSS_KEY, BOSS_AT, SITTER_KEY } from './guestbar/walking'
import { type WallKeep, measureWall, SERVER_HALF, BESIDE_LEAST, BESIDE_MOST, aisleSqueeze, squeezeLay, squeezePath } from './guestbar/aisle'
import { Part } from './guestbar/part'
import { PEOPLE_SCALE, STAFF_SCALE, BALL_GEO, BALL_NORI_GEO, STATION_POSE, SAKE_HANDS, SAKE_HANDS_ON, BOWL_HANDS, BOWL_HANDS_ON, STIR_HANDS, STIR_HANDS_ON, COOK_HANDS, COOK_HANDS_ON, AT_WORK_COUNTER, PLATER_BACK, BACK_DIR, GRATE_HANDS, GRATE_ON, BOWL_PASS, RICE_LEN, SOUP_LEN, BOWL_PUT_S, BOWL_UP_S, BOWL_SET_S, PASS_MAX, PASS_Z, TRAY_SETS, SAKE_TRAY, SAKE_TRAY_YAW } from './guestbar/staffPoses'
import { OwnerWalker } from './guestbar/ownerWalker'
import { STAFF_DOOR_AT, koiHang, FOLK_FIT } from './guestbar/decorTex'
import { STOCKER_FIG, Stocker } from './guestbar/stocker'
import { DOOR_BOUND, RAIN_NOW } from './guestbar/shopFront'
import { CompanionAtBar } from './staff/CompanionAtBar'
import { Entrance } from './guestbar/entrance'
import { SHOE_CUBBIES, BenchShoes } from './guestbar/genkan'
import { shoeKey } from '@/game/guests/shoes'
import { GENKAN_SUNK, DiningFloor, RoomFloor } from './guestbar/floors'
import { STOOL_STAND, STOOL_OUT, STOOL_LEAVE, SEAT_MARKS, BENCH_MARKS, SEAT_SHIFT, BENCH_AT, BENCH_A, BENCH_B, STOOL_PULL_S, STOOL_STEP_S, STOOL_SLIDE_S, STOOL_HOME_AT, backOf, type Shown, SHOES_S, DOOR_STEP_IN_S, DOOR_SLIDE_S, STEP_Y_RATE, NO_SHOES, PayFloat, PAY_S, QUEUE_GAP, STEP_TURN, billFor, TRAY_ERRANDS, placedOnce, withPause, UMB_STAND, standGrip, gearFor, gearAtOf, COAT_POSE, GEAR_P, GEAR_Q, shoeStep, SeatBits, Fridges, Stools } from './guestbar/seats'
import { HER, WC_TO_SEAT, WC_SIT_LIFT, wcStayOf, HAND_S, HAND_DRY_S, REFILL_RATE, DRINKS_MAX, drinkRate, wcRate, DRINK_STAY, type PlateRun, STACK_GAP, NEST_GAP, SURFACE_RAY, SURFACE_HITS, TOP_FROM, DOWN_Y, UP_Y, binThrow, SERVE_S, CLEAR_S, CLEAR_DELAY, LAY_S, FLY_PER, HOME_S, READY_S, ON_TABLE, X_AXIS, COAL_STICK_GEO, COAL_STICK_MAT, DIPPER_CUP_GEO, DIPPER_HANDLE_GEO, DIPPER_MAT, DIPPER_WATER_GEO, DIPPER_WATER_MAT, SOUP_EVERY, STIR_S, GRATE_EVERY, GRATE_S, DIP_NEAR, DIP_REACH, RICE_BOWL_GEO, BOWL_HOLD, RICE_WASH_PHASES, WASH_BOWL_HANDS, WASH_BOWL_ON, riceBowlHands, RICE_IN_GEO, WIPE_S, CLEAR_REACH, CLEAR_LIFT, CHOP_ON, WARE_LEFT, WARE_RINSE, SINK_BOWLS_SHOWN, POT_PAIRS_SHOWN, POT_RENGE_SHOWN, BOWL_NEST, CLEAR_WIPE_AT, CLEAR_HANDS, SINK_HANDS, CLEAR_SIDE, WIPE_HAND_Z, CLEAR_TOWARD, WIPE_STAND, RAG_GEO, PASS_STACK_SHOWN, IN_SINK, SINK_SHOWN, IN_DRAIN, WASH_EACH, frontOf, KITCHEN_BLOCKS, PASS_ROOM, HEAD_HIGH, NAMED_BLOCKS, HEAD_ROOM, HOME_ROOM, TRAY_REACH, SINK_BACK, TILL_WAIT_MAX, TILL_BY_PLATER, TAKEOUT_ASIDE, TAKEOUT_NEXT, SHOE_OFF_S, SHOES_BACK, STOOL_HALF, STOOL_STEP, STOOL_CLIMB, PLATE_R, PLATE_GEO, DISH_ALONG, DISH_STEP, DISH_LAY, turnBy, PASS_YAW, FOAM_AT, FOAM_GEO, FOAM_MAT, DRIP_GEO, DRIP_MAT, WASH_SHIFT, WORK_IN, WORK_UP, WASH_FWD, SPOUT_AT, STREAM_W, HAND_TO, HAND_TO_BASKET_S, STATION_POUR_AT, HAND_STREAM, HAND_NDC, HAND_PLANE, HAND_HIT, HAND_TOP, HAND_W, HAND_BOX, UNDER_MAX, PILE_STEP, PILE_AT, SPONGE_BACK_S, RUB_BOX, RUB_C, CARRY_UP, CARRY_CLEAR, CARRY_RAY, CARRY_FROM, CARRY_DOWN, DRIP_LOW, smearOpacity, GLASS_ON, TISSUE_ON, WIPE_MOUTH_MS, SIP_S, SOUP_SIP_S, SIP_GAP, SIPS } from './guestbar/service'
import { LONG_GEO, ROUND_GEO, Plate, PlateKinds, showKind, smearsOf, pickupReady } from './guestbar/plates'
import { WaitingBench, KraftBag, TakeoutStandModel, STAND_TOP, STAND_SLOTS, WARM_TUB_Z, WarmTub, STAND_TURN, STAND_LIFT, STAND_GIVE, TakeoutBag, RiderGear } from './guestbar/takeoutStand'
import { GuestLabel, CUP_AHEAD, CUP_SIDE, SeatDrink, PersonClock } from './guestbar/labels'

/** (item 676, the owner's 「客人會穿越」) whether each hand of a customer, where it hangs at their side, has something standing there on the
 * shop's floor map (a finger's breadth round it): [left, right], 1 drawn in as they walk by it, 0 not; their figure's hands' frame found
 * once; dev `__tuck.on = false` as before */
const TUCK = { on: true }
const TUCK_HALF = 0.03, TUCK_P = new THREE.Vector3(), TUCK_OUT: [number, number] = [0, 0], TUCK_NONE: [number, number] = [0, 0]
const TUCK_FRAMES = new WeakMap<THREE.Object3D, THREE.Object3D | null>()
/** (item 687) how long a hand drawn in is kept in after it was last up against something (ms), and when each was last, left and right */
const TUCK_HOLD = 300
/** (item 693) how long where a hand's drawn to must have had something there for it to be let out (ms): the map's edge before them comes and
 * goes a frame at a time as they walk */
const FRONT_GRACE = 150
/** (left, right) when each was last up against something, and since when (or -1) where each's drawn to has had something there */
const TUCK_SEEN = new WeakMap<THREE.Object3D, [number, number, number, number]>()
/** (item 687) where a hand's drawn in to, across and before them (the body's frame: FolkFigure's and StaffFigure's TUCK_X, TUCK_Z) */
const TUCK_AT: [number, number] = [0.15, 0.29]
/** (item 693) how far before where a hand hangs it's looked at too (the body's frame; 0.15 is about 25 cm, a tenth of a second at a server's
 * pace): drawn in before it gets to what's there, not once it's in it */
const TUCK_AHEAD = 0.15
const tuckOf = (o: THREE.Object3D): [number, number] => {
  const taken = BOSS_BED.taken
  if (!TUCK.on || !taken || !o.visible) return TUCK_NONE
  let hp = TUCK_FRAMES.get(o)
  if (hp === undefined || (hp && !hp.parent)) { hp = o.getObjectByName('handL')?.parent ?? null; TUCK_FRAMES.set(o, hp) }
  if (!hp) return TUCK_NONE
  // (item 687, the Tester window's: a hand drawn in and let out again a frame or two later, most of the times (where it'd hang along the edge of
  // what's there, a few centimetres of the map's): drawn in, kept in till TUCK_HOLD after it was last up against something)
  const now = performance.now()
  let seen = TUCK_SEEN.get(o)
  if (!seen) { seen = [-1e9, -1e9, -1, -1]; TUCK_SEEN.set(o, seen) }
  // (and only where it's drawn in to is clear: up against something before them too (stood at the sink's cabinet), a hand drawn in before
  // their belly went into it, 27 cm, where hanging it was clear of it)
  // (item 691: and let out, kept or not, once where it's drawn to has had something there a while (FRONT_GRACE): turned to face the sink's
  // cabinet with it in. Item 693, the Tester window's 692: let out the first frame of it, it went in and out with the map's edge before
  // them, a frame or two at a time, 48% of the times (0.2% before), and nearer what's there than not drawn in at all)
  const frontL = taken(hp.localToWorld(TUCK_P.set(-TUCK_AT[0], FOLK_HAND_REST.L.y, TUCK_AT[1])), TUCK_HALF)
  const frontR = taken(hp.localToWorld(TUCK_P.set(TUCK_AT[0], FOLK_HAND_REST.R.y, TUCK_AT[1])), TUCK_HALF)
  seen[2] = frontL ? (seen[2] < 0 ? now : seen[2]) : -1
  seen[3] = frontR ? (seen[3] < 0 ? now : seen[3]) : -1
  // (item 693: and where it'll hang a step on, TUCK_AHEAD before them: asked only where it hung, it was drawn in once it was already in what
  // it came up to (a server on the straight way to the sink, past the washer's front corner, the hand 0.13 to 0.4 m in it as it came in))
  const sideL = taken(hp.localToWorld(TUCK_P.copy(FOLK_HAND_REST.L)), TUCK_HALF) || taken(hp.localToWorld(TUCK_P.set(FOLK_HAND_REST.L.x, FOLK_HAND_REST.L.y, FOLK_HAND_REST.L.z + TUCK_AHEAD)), TUCK_HALF)
  const sideR = taken(hp.localToWorld(TUCK_P.copy(FOLK_HAND_REST.R)), TUCK_HALF) || taken(hp.localToWorld(TUCK_P.set(FOLK_HAND_REST.R.x, FOLK_HAND_REST.R.y, FOLK_HAND_REST.R.z + TUCK_AHEAD)), TUCK_HALF)
  if (!frontL && sideL) seen[0] = now
  if (!frontR && sideR) seen[1] = now
  TUCK_OUT[0] = !(seen[2] >= 0 && now - seen[2] > FRONT_GRACE) && now - seen[0] < TUCK_HOLD ? 1 : 0
  TUCK_OUT[1] = !(seen[3] >= 0 && now - seen[3] > FRONT_GRACE) && now - seen[1] < TUCK_HOLD ? 1 : 0
  return TUCK_OUT
}
if (import.meta.env?.DEV && typeof window !== 'undefined') Object.assign(window, { __tuck: TUCK })
/** (item 659 d's next, the bar's frame) a server walking holds back for the owner on his way home ahead of them on their line: from
 * SERVER_HOLD_AHEAD ahead (1.1 m in the world) to a stand at SERVER_HOLD_STOP (a body's width and a little), he within SERVER_HOLD_SIDE of
 * their line; SERVER_HOLD_MOST at most at a time; dev `__serverHold.on = false` as before */
const SERVER_HOLD = { on: true }
const SERVER_HOLD_AHEAD = 0.55, SERVER_HOLD_STOP = 0.28, SERVER_HOLD_SIDE = 0.22, SERVER_HOLD_MOST = 1.5
const SERVER_HOLD_AT = new THREE.Vector3()
if (import.meta.env?.DEV && typeof window !== 'undefined') Object.assign(window, { __serverHold: SERVER_HOLD })
/** (item 722) how long (s) the floor's server stands at their place with nothing to do before going down to wait by the takeaway stand: a
 * moment, so one plate after another doesn't send them there and back between */
const WAIT_AFTER = 2
/** (item 680) a sink plate's half across (the bar's frame), as last measured where one was let go into the basin: two lying nearer than it
 * are on each other, and one is under the tap's stream if the stream comes down within it */
const SINK_PLATE_R = { v: 0.1 }
const RUB_SWAP = new THREE.Vector3()
/** (item 675) a server's tray lifted over the sink's top (the bar's units): eased up over LIFT_UP of their way up to it, up by LIFT_END short
 * of where they stand at it (their hands, before them, as far again from its front as they'd be in it there); kept up LIFT_HOLD of the way
 * back, then eased down over LIFT_DOWN; the hands' undersides (LIFT_HANDS of their own frame under the tray's height) LIFT_CLEAR over it.
 * (Item 691, the Tester window's 690: over 0.35 each way, at their 2.1 a second, it came down in a tenth of a second, as if dropped. Item
 * 693: over 0.9 and 1.2 it still came down in 0.43 s; up over 1.1 now, about half a second, down over 1.6, about three quarters) */
const LIFT_UP = 1.1, LIFT_DOWN = 1.6, LIFT_END = 0.25, LIFT_HOLD = 0.25, LIFT_CLEAR = 0.03, LIFT_HANDS = 0.13
const LIFT_BOX = new THREE.Box3(), LIFT_P = new THREE.Vector3()
/** (item 675) the skewers washed in the basin: in the right hand as it scrubs, held in its grip (the bar's units under the hand's middle) */
const SK_WASH_DOWN = 0.02, SK_AT = new THREE.Vector3()
/** (dev, item 670) how many of the kitchen's ways had no way round what's there, even squeezed past it, and went through the least of it */
const KITCHEN_THROUGH = { n: 0 }
if (import.meta.env?.DEV && typeof window !== 'undefined') Object.assign(window, { __kitchenThrough: KITCHEN_THROUGH })

/** the counter itself (for the shops that don't draw their own): hinoki top, panelled dark front, a lip */
function Counter({ length }: { length: number }) {
  const top = useMemo(() => new THREE.BoxGeometry(length + 0.3, 0.07, 0.62), [length])
  const front = useMemo(() => new THREE.BoxGeometry(length + 0.2, 0.4, 0.5), [length])
  return (
    <group rotation-y={Math.atan2(-ALONG.z, ALONG.x)}>
      <Part geo={top} color="#d9b884" outline={1.02} position={[0, 0.43, 0]} />
      <Part geo={front} color="#3a2a1e" outline={1.01} position={[0, 0.2, 0]} />
      {Array.from({ length: Math.round(length / 0.6) }, (_, k) => (
        <mesh key={k} position={[-length / 2 + 0.3 + k * 0.6, 0.2, 0.252]}>
          <boxGeometry args={[0.46, 0.3, 0.01]} />
          <meshToonMaterial color="#4a3626" />
        </mesh>
      ))}
    </group>
  )
}

function GuestBar3DImpl({ guests, at, length = 3.6, drawCounter = true, lang, top = 0.465, people = true, mark = '食堂', counters: given, scale = 1, offset,
  servers = [], plater = null, stocker = null, omiki, onDrink, onSay, open = true }:
  { guests: GuestView[]; at: THREE.Vector3; length?: number; drawCounter?: boolean; lang: Lang
    /** where the customers sit (the first counter's middle is at, and its door past its far end); one of four if not given */
    counters?: Counter[]
    /** what's dyed on the noren at the door (its first character in the middle) */
    mark?: string
    /** a guest's word (what they made of the toilet) */
    onSay?: (who: 'chef' | 'guest', text: string, guest?: number) => void
    /** the height of the bar top, where the plates go */
    top?: number
    /** draw the customers themselves (a phone shows them in 2D instead; the plates still come and go) */
    people?: boolean
    /** a customer's taken a drink from the fridge (it's paid for) */
    onDrink?: (guest: number, drink: DrinkId) => void
    /** the shop's open: shut, nobody's in the room and the plates are back where they started */
    open?: boolean
    /** the omiki (御神酒) offered at the shrine by the door (poured when, and offering it again) */
    omiki?: { pouredAt: number | null; onPour: () => void }
    /** the servers on the floor: they carry what's plated at the plating place to the customers, clear the plates done with, and wash them */
    servers?: { id: string; look: StaffLook }[]
    /** who plates in the kitchen, fetching plates from the racks for the plating place (the third cook, or the second): none, the owner does */
    plater?: { id: string; role: 'chef' | 'sous'; look: StaffLook } | null
    /** the stocker, once one's hired (none: no one by the crates, and the fridges aren't filled from the back) */
    stocker?: { id: string; look: StaffLook } | null
    /** drawn this much bigger, all of it */
    scale?: number
    /** and moved by this (after scaling) */
    offset?: THREE.Vector3 }) {
  const [shown, setShown] = useState<Shown[]>([])
  const guestsRef = useRef(guests)
  guestsRef.current = guests
  if (import.meta.env?.DEV && typeof window !== 'undefined') (window as unknown as { __guestStates?: typeof guestsRef }).__guestStates = guestsRef
  const groups = useRef(new Map<number, THREE.Group>())
  /** two customers passing each other: which way each steps aside, as they first met (keyed by their ids, low|high) */
  const passing = useRef(new Map<string, { x: number; z: number }>())
  /** how far each walker's stepped aside off their way just now (eased to what's needed), and where their way had them the frame before
   * (keyed by id: a customer's, a server's -1 - i, the stock keeper's) */
  const aside = useRef(new Map<number, { x: number; z: number; f: number }>())
  /** what stands against the first counter's wall behind its aisle, that nobody stepping aside for another goes into (measureWall) */
  const wallKeep = useRef<WallKeep>({ at: -9, boxes: [], roots: new Map(), sig: NaN, full: 0, looked: -1e9 })
  const lastAt = useRef(new Map<number, { x: number; z: number; f: number }>())
  const asideTick = useRef(0)
  if (import.meta.env?.DEV && typeof window !== 'undefined') (window as unknown as { __guestGroups?: typeof groups }).__guestGroups = groups
  const clock = useRef(0)
  const counters = useMemo(() => given ?? singleCounter(at, length), [given, at, length])
  const seats = useMemo(() => seatsOf(counters), [counters])
  /** the first counter's stools as they stand sat at, for those passing behind them (item 193): the stretch of its aisle they're along (a
   * stool's half width past the end ones) and how far toward the aisle their backs come (a stool's half width, 0.21, behind where it stands:
   * tests/e2e/_clash193.mjs's hits on them, -0.79) */
  const stoolLine = useMemo(() => {
    const c = counters[0], at = seats.filter((st) => st.counter === 0).map((st) => st.stool.clone().sub(c.at))
    if (!at.length) return null
    const al = at.map((d) => d.dot(c.along))
    return { a0: Math.min(...al) - 0.21, a1: Math.max(...al) + 0.21, back: Math.min(...at.map((d) => d.dot(c.lay))) - 0.21 }
  }, [counters, seats])
  const wcs = useMemo(() => (given ? toiletsOf(counters) : null), [counters, given])
  const fridges = useMemo(() => (given ? fridgesOf(counters) : null), [counters, given])
  // (the stretches of the side wall kept clear for the fridges: one array, so the wall (memo'd) isn't drawn again with every redraw here)
  // (the stock room behind the side wall (items 430, 431): its doorway, its two ends, how deep it is, and the fridges set into the wall; one
  // object, as the clear stretches are, so the wall isn't drawn again with every redraw here)
  const store = useMemo(() => (given ? storeOf(counters) : null), [counters, given])
  const storeWall = useMemo(() => (store && fridges ? { door: store.door, room: store.room, deep: store.deep,
    fridges: fridges.map((f) => [f.z - FRIDGE.W / 2 - 0.004, f.z + FRIDGE.W / 2 + 0.004] as [number, number]) } : undefined), [store, fridges])
  // (and nothing hung over its doorway)
  const fridgeClear = useMemo(() => (fridges ? [...fridges.map((f) => [f.z - FRIDGE.W / 2 - 0.1, f.z + FRIDGE.W / 2 + 0.1] as [number, number]),
    ...(store ? [[store.door[0] - 0.1, store.door[1] + 0.1] as [number, number]] : [])] : undefined), [fridges, store])
  /** a couple sat side by side turn to talk: the one at the next stool along is on the left (+1), the one before on
   * the right (-1); 0 while the other isn't sat there yet (or has gone) */
  const talkSide = (s: Shown) => {
    const g = guests.find((x) => x.id === s.id)
    const o = g?.partner !== undefined ? shown.find((x) => x.id === g.partner && x.phase === 'sit') : undefined
    return s.phase === 'sit' && o ? Math.sign(o.seat - s.seat) : 0
  }
  /** where the customers come in at the door: where a customer's figure stands as it's put in the scene (one called off the bench, where they
   * sat), till their walk puts it on their way (put at the frame's middle, it stood there, in the kitchen, between being put in and its first
   * frame: tests/e2e/paths.mjs saw it, and one called off the bench was drawn there for a frame, put in after the walk's frame was done:
   * dayaudit.mjs RUSH=1, 13 of them, from the door to the bench when it was the door) */
  const wayIn = useMemo(() => wayInOf(counters), [counters])
  /** in from outside (item 410, the owner's 「客人進來的時候會先開拉門再脫鞋」): shown out on the step past the sliding door, where they stand while
   * it's slid open (game/slideDoor: a moment after they show), then just in through its open way; put before the way in from the door's place
   * (doorOf), walked back going out. `len` its length (going out, they slide it open just in from it) */
  // (item 832, the owner's 「客人進門會從外面顯示，再進來。」: shown out in the street (DOOR_LANE.street, on the earth past the bed before the
  // door), they walk in over it and up the steps to the door, which slides open as they come (game/slideDoor: one walking in from out past
  // it); `waitD` how far along it the door is, where they stop a moment, or close their umbrella)
  const doorLead = useMemo(() => {
    const pts = given ? [doorAt(counters, DOOR_LANE.x, DOOR_LANE.street), doorAt(counters, DOOR_LANE.x, DOOR_LANE.wait), doorAt(counters, DOOR_LANE.x, DOOR_LANE.in)] : []
    // (where they're first put: there, at the ground's height there (item 410: put at the floor's, they dropped onto the step the next frame))
    const start = pts[0]?.clone().setY(genkanY(counters, pts[0]))
    return { pts, len: pathLength(pts), start, waitD: pts.length ? pts[0].distanceTo(pts[1]) : 0 }
  }, [counters, given])
  const paths = useMemo(() => seats.map((st) => {
    const path = [...doorLead.pts.map((v) => v.clone()), ...pathTo(counters, st)]
    return { path, len: pathLength(path) }
  }), [counters, seats, doorLead])
  // the way out: the same way back, but by the till, where they stop to pay (door first, like the way in)
  const leavePaths = useMemo(() => seats.map((st) => {
    const base = pathTo(counters, st)
    if (!given) return { path: base, len: pathLength(base), payD: 0 }
    const { spot, lane, aisle } = payOf(counters)
    const path = [...doorLead.pts.map((v) => v.clone()), base[0], spot, lane, aisle, ...base.slice(1)]
    return { path, len: pathLength(path), payD: pathLength([...doorLead.pts, base[0], spot]) }
  }), [counters, seats, given, doorLead])
  const plateAt = (n: number) => seats[n].plate.clone().setY(top)
  /** how far along a way in (from the door) the genkan's step up into the room is (found once for each way: it was walked out in a hundred
   * steps for every walker twice a frame) */
  const stepMemo = useMemo(() => new WeakMap<THREE.Vector3[], number>(), [counters, given])
  const stepAt = (path: THREE.Vector3[]) => {
    if (!given) return 0
    const known = stepMemo.get(path)
    if (known !== undefined) return known
    // (from out past the sliding door now (item 410): where it leaves the genkan having come into it)
    let at = 0, seen = false
    for (let d = 0; d < 3; d += 0.02) {
      if (inGenkan(counters, alongPath(path, d).p)) seen = true
      else if (seen) { at = d; break }
    }
    stepMemo.set(path, at)
    return at
  }
  /** the chef's plating place on the cook table beside him (bar's platingOf; the owner's: no pass on the bar): the table's top, where a plate
   * ready for a server stands, its stack of clean plates; a place in it from the ready plate's */
  const plating = useMemo(() => platingOf(), [])
  const platingTop = plating.top
  const platingPlace = (along: number) => plating.at.clone().addScaledVector(plating.dir, along).setY(platingTop)
  // where a server stands to take what's set out there: in the aisle across the bar from it
  /** where a server stands in the kitchen, in front of the chef's plating place, to take a ready plate up */
  const pickupSpot = useMemo(() => plating.out.clone().setY(0), [plating])
  /** where the first counter's aisle meets another's */
  const aisleCorner = (c: Counter) => aisleCornerOf(counters, c)
  // the servers wait in the kitchen, each just inside a gate in the bar (the first counter's, by the till, and the side
  // counter's), so they go out through it on every trip and come back in by it, the door swinging for them; a shop
  // without gates has them waiting by the plating place
  const homes = useMemo(() => {
    if (!given) {
      const c0 = counters[0]
      return [0, 1].map((k) => {
        const at = c0.at.clone().addScaledVector(c0.along, -c0.length / 2 - 0.25 - k * 0.42).addScaledVector(c0.lay, -0.75 - k * 0.12)
        return { at, yaw: Math.atan2(c0.lay.x, c0.lay.z), counter: 0, way: [at] }
      })
    }
    return counters.slice(0, BAR_GATES.length).map((c, i) => {
      const g = BAR_GATES[i]
      const { mid } = gateOf(c, g)
      const at = mid.clone().addScaledVector(c.lay, 0.85).addScaledVector(c.along, -g.end * 0.3)
      // (in to the doorway square on, through it, and out to the aisle)
      const way = [at, mid.clone().addScaledVector(c.lay, 0.42), mid.clone().addScaledVector(c.lay, -0.5), mid.clone().addScaledVector(c.lay, -aisleOf(c) - 0.08)]
      return { at, yaw: Math.atan2(-c.lay.x, -c.lay.z), counter: i, way }
    })
  }, [counters, given])
  /** no server hired: the owner serves (nothing flies); his place along the aisle in front of the cook table (in the bar's frame), his way
   * out across the kitchen to the first counter's gate and through it, found once a day */
  const ownerServes = !!given && servers.length === 0 && homes.length > 0
  const ownerHome = useRef<(typeof homes)[number] | null>(null)
  const ownerAt = () => OWNER_SPOT.clone().add(FIRE_SHIFT).sub(offset ?? new THREE.Vector3()).divideScalar(scale).setY(0)
  // (a server's place stood clear of what's on the kitchen's floor, as it is today (the miso pot by the rice tub was on one, the owner saw her
  // standing in it); worked out once the floor's been looked at, and again the next day)
  const clearHomes = useRef(new Map<number, (typeof homes)[number]>())
  const clearHome = (wi: number) => {
    const h = homes[wi]
    if (!h) return h
    const kept = clearHomes.current.get(wi)
    if (kept) return kept
    const blocks = kitchenBlocks()
    if (!blocks.length) return h
    // (further off than a passer-by's room (item 590): stood waiting by the sink's end, a server's hand hanging at their side (StaffFigure's
    // REST, 0.51 out from their middle) was in its side panel 9 to 14 cm all the while)
    let [a0, l0] = standClear(flat(h.at), blocks.map((r) => ({ x0: r.x0 - HOME_ROOM, z0: r.z0 - HOME_ROOM, x1: r.x1 + HOME_ROOM, z1: r.z1 + HOME_ROOM })))
    // (and a place they can walk out of to their gate (item 670: a piece put down on a server's place or round it, the nearest place clear
    // of it was a nook shut in by the warmer and the miso pot, and every way of theirs went through the warmer): the nearest that is)
    if (h.way.length > 1) {
      const k = kitchenOf(counters), area = { x0: k.along[0], z0: k.lay[0], x1: k.along[1], z1: k.lay[1] }
      const near = reachableNear([a0, l0], flat(h.way[1]), area, blocks, HOME_ROOM)
      if (near) [a0, l0] = near
    }
    // (and what they hold before them (their tray, TRAY_REACH out) clear of what's there itself (a block less its passing room): stood waiting
    // facing the sink's end, the second server's tray and hands were in it all the while (item 590); stepped back from it till they're clear)
    const c0 = counters[0]
    const fwd = new THREE.Vector3(Math.sin(h.yaw), 0, Math.cos(h.yaw)), fa = fwd.dot(c0.along), fl = fwd.dot(c0.lay)
    const solid = blocks.map((r) => ({ x0: r.x0 + PASS_ROOM, z0: r.z0 + PASS_ROOM, x1: r.x1 - PASS_ROOM, z1: r.z1 - PASS_ROOM }))
    const held = (k: number) => solid.some((r) => { const x = a0 + fa * (TRAY_REACH - k), z = l0 + fl * (TRAY_REACH - k); return x > r.x0 - 0.02 && x < r.x1 + 0.02 && z > r.z0 - 0.02 && z < r.z1 + 0.02 })
    let back = 0
    while (back < 0.3 && held(back)) back += 0.02
    const a = a0 - fa * back, l = l0 - fl * back
    const at = c0.at.clone().addScaledVector(c0.along, a).addScaledVector(c0.lay, l).setY(h.at.y)
    const made = { ...h, at, way: [at, ...h.way.slice(1)] }
    clearHomes.current.set(wi, made)
    return made
  }
  // (his way out found only once he first goes, the kitchen's floor and what's on it in the scene by then)
  const homeOf = (wi: number) => {
    if (!ownerServes) return clearHome(wi)
    if (!ownerHome.current) {
      const at = ownerAt()
      const g = homes[0]
      const across = g.way.length > 1 ? kitchenRoute(at, g.way[1]) : [at.clone()]
      ownerHome.current = { at, yaw: OWNER_YAW, counter: 0, way: [at.clone(), ...across.slice(1), ...g.way.slice(2).map((v) => v.clone())] }
    }
    return ownerHome.current
  }
  /** from a server's place (inside their gate) across the kitchen to the chef, for a plate he's set out ready: round what stands on its floor */
  const fetchPath = (wi: number) => kitchenRoute(homeOf(wi).at, pickupSpot)
  /** a takeaway's way (the owner's: the customer, or the rider, waits in the genkan in their shoes, by the till): in from the front door to just
   * short of the step up into the room (`wait`); where the server stands on the step to give them their box (`hand`); and the server's way from
   * their place out through their gate, along the aisle by the till to the step (the way customers walk out to pay, backwards) */
  const takeoutWay = useMemo(() => {
    if (!given || !seats.length) return null
    const door = pathTo(counters, seats[0])[0], { spot, lane, aisle } = payOf(counters)
    const line = [door, spot], len = pathLength(line)
    let edge = 0
    for (let d = 0; d < len; d += 0.02) if (!inGenkan(counters, alongPath(line, d).p)) { edge = d; break }
    // (across the line in, for a second one waiting beside the first)
    const side = new THREE.Vector3(-(spot.z - door.z), 0, spot.x - door.x).normalize()
    // (to one side of it, the till's (item 203: they stood on it, those paying and going out walking into them); the genkan's stone runs
    // 0.6 that way from it, and the shoe cupboard is the other way)
    const wait = alongPath(line, Math.max(0.3, edge - 0.32)).p.setY(0).addScaledVector(side, TAKEOUT_ASIDE), hand = alongPath(line, Math.min(len, edge + 0.3)).p.setY(0)
    // (the waiting bench (BENCH): against the wall by the genkan, where BENCH_PLACE has it; its places along it, those sat there facing into the room)
    // (and the second along the wall from it (BENCH2_ALONG); three places on each, the first bench's filled first)
    const bench = new THREE.Vector3(BENCH_PLACE.x, 0, BENCH_PLACE.z), u = new THREE.Vector3(Math.cos(BENCH_PLACE.yaw), 0, -Math.sin(BENCH_PLACE.yaw))
    const bench2 = bench.clone().addScaledVector(u, BENCH2_ALONG)
    const benchSpots = Array.from({ length: BENCH_SEATS }, (_, k) => (k < BENCH_EACH ? bench : bench2).clone()
      .addScaledVector(u, ((k % BENCH_EACH) - (BENCH_EACH - 1) / 2) * BENCH_PLACE.pitch))
    const next = wait.clone().addScaledVector(spot.clone().sub(door).setY(0).normalize(), TAKEOUT_NEXT)
    return { door: door.clone(), wait, next, hand, side, out: [aisle.clone(), lane.clone(), spot.clone(), hand.clone()], bench, bench2, benchYaw: BENCH_PLACE.yaw, benchSpots }
  }, [counters, seats, given])
  /** the cashier's chair (its seat's mark, Register's: it may be moved) in the bar's frame: where their hands are, turned round `turn` of the
   * way to the takeaway stand behind them (0: facing the till) */
  const seatMark = useRef<THREE.Object3D | null>(null)
  /** a customer waiting at the till with no cashier sat at it (item 203): who, since when (the bar's clock), the server on their way to ring
   * them up (their place in the line) and whether they're there behind it */
  const tillCall = useRef<{ who: number; since: number; staff: number; there: boolean }>({ who: -1, since: 0, staff: -1, there: false })
  /** when the liquor shop's deliveries were last looked for (the bar's clock) */
  const deliveryLook = useRef(0)
  /** where a server stands behind the till to ring someone up: the cashier's chair's place on the floor */
  const tillStaffSpot = () => {
    const fb = frame.current, m = seatMark.current
    if (m && fb) { m.updateWorldMatrix(true, false); return fb.worldToLocal(m.getWorldPosition(new THREE.Vector3())).setY(0) }
    return cashierHands(0).setY(0)
  }
  const cashierHands = (turn: number) => {
    const fb = frame.current
    if (!seatMark.current?.parent && fb) { let root: THREE.Object3D = fb; while (root.parent) root = root.parent; seatMark.current = root.getObjectByName('cashier-seat') ?? null }
    const m = seatMark.current
    if (!m || !fb) return new THREE.Vector3(1.25, 0.7, -2.79)
    m.updateWorldMatrix(true, false)
    const at = fb.worldToLocal(m.getWorldPosition(new THREE.Vector3()))
    const ahead = fb.worldToLocal(new THREE.Vector3(0, 0, -1).applyMatrix4(m.matrixWorld)).sub(at).setY(0).normalize()
    return at.addScaledVector(ahead.applyAxisAngle(UP_Y, turn * Math.PI * 0.8), 0.28).setY(at.y + 0.12)
  }
  /** where a takeaway's customer comes up to the till from where they waited: toward the cashier's chair, as far as the genkan goes */
  const tillSide = (from: THREE.Vector3) => {
    const to = cashierHands(0).setY(0), dir = to.clone().sub(from).setY(0)
    const len = dir.length()
    dir.normalize()
    let d = 0
    while (d < len && inGenkan(counters, from.clone().addScaledVector(dir, d + 0.02))) d += 0.02
    return from.clone().addScaledVector(dir, Math.max(0, d - 0.08))
  }
  /** (item 722) whether a server on `duty` waits by the takeaway stand when there's nothing to do: the floor's server (or the only one), in
   * a shop with its gates and the stand, open, not the owner serving it himself; the dishes' server stays by the sink's side, their place */
  const waitsByStand = (duty: string) => !!given && !ownerServes && duty !== 'dish' && !!standTop.current && open && !SHOP.leaving
  /** the takeaway stand (where it's been put): its middle on the floor, where a server stands at its side nearest the kitchen to set a bag on
   * it, and the kitchen's edge nearest that (the route there) */
  const standSpots = () => {
    const fb = frame.current, top = standTop.current
    const at = top && fb ? fb.worldToLocal(top.getWorldPosition(new THREE.Vector3())).setY(0) : new THREE.Vector3(STAND_AT.x, 0, STAND_AT.z)
    // (0.53 out from its middle: at 0.45 their round body was 7 cm into its top as they set a bag on it, item 387)
    const reach = at.clone().add(pickupSpot.clone().sub(at).setY(0).setLength(0.53))
    const c0 = counters[0], d = reach.clone().sub(c0.at)
    const a = THREE.MathUtils.clamp(d.dot(c0.along), kitchen.along[0] + 0.2, kitchen.along[1] - 0.2)
    const l = THREE.MathUtils.clamp(d.dot(c0.lay), kitchen.lay[0] + 0.2, kitchen.lay[1] - 0.2)
    return { at, reach, edge: c0.at.clone().addScaledVector(c0.along, a).addScaledVector(c0.lay, l).setY(0) }
  }
  /** from a server's place out to the step where the takeaway's handed over (walked backwards, the way back) */
  const tillPath = (wi: number) => {
    const h = homeOf(wi), way = takeoutWay!
    return [...h.way.map((v) => v.clone()), ...(h.counter ? [aisleCorner(counters[h.counter])] : []), ...way.out.map((v) => v.clone())]
  }
  /** how far along the counter from a customer's middle a server stands beside them (item 591): half way to the next stool along, between
   * the two customers; at 0.24 (their body 0.22 round) they stood against the customer's own stool, 5 to 6 cm into it, their tray over its
   * seat as they turned to the plate (tests/e2e/sinkin.mjs). At least where it was, at most BESIDE_MOST (the counter's last seat: no stool
   * past it) */
  // (the counter's end seat, no stool past it: the other side, between it and the one before (the Tester's: stood past the door's end seat,
  // a server's body went 12 cm into the cats' stand there, in the narrow way beside it))
  const besideAlong = useMemo(() => seats.map((st) => {
    let next = Infinity, before = Infinity
    for (const o of seats) {
      if (o === st || o.counter !== st.counter) continue
      const d = o.stool.clone().sub(st.stool).dot(st.along)
      if (d > 0.05 && d < next) next = d
      if (d < -0.05 && -d < before) before = -d
    }
    if (next !== Infinity) return THREE.MathUtils.clamp(next / 2, BESIDE_LEAST, BESIDE_MOST)
    if (before !== Infinity) return -THREE.MathUtils.clamp(before / 2, BESIDE_LEAST, BESIDE_MOST)
    return BESIDE_LEAST
  }), [seats])
  /** beside a customer, where a server stands to set their plate down: between them and the next one along, in toward the bar */
  const besideSeat = (n: number) => {
    const st = seats[n]
    return st.aisle.clone().lerp(st.stool, 0.45).addScaledVector(st.along, besideAlong[n] ?? BESIDE_LEAST)
  }
  /** the place on the aisle square behind where a server stands beside a customer: in from there, straight (from the customer's own place
   * on the aisle, the way in went past the side of their stool) */
  const aisleBeside = (n: number) => seats[n].aisle.clone().addScaledVector(seats[n].along, besideAlong[n] ?? BESIDE_LEAST)
  /** a server beside a customer facing the bar square (setting a plate down, taking one up): turned to the plate itself, their tray in front
   * went over the customer's stool (item 591); the plate's reached for */
  const faceBar = (w: { pos: THREE.Vector3; yaw: number }, n: number) => {
    const into = seats[n].stool.clone().sub(seats[n].aisle).setY(0)
    if (into.lengthSq() > 1e-8) w.yaw = Math.atan2(into.x, into.z)
  }
  /** from the chef to a seat, the plate in their hands: back across the kitchen to their place, out through their gate, along the aisle
   * (round the corner, for the other counter) and in beside the customer */
  const routeTo = (n: number, wi: number) => {
    const h = homeOf(wi)
    const out = h.way.length < 2 ? [aisleBeside(n), besideSeat(n)] : backPath(wi, n).slice(1)
    const path = [...kitchenRoute(pickupSpot, h.at), ...out]
    return { path, len: pathLength(path) }
  }
  /** from a server's place to a seat the shortest way (out through their gate): walked backwards, it's their way back */
  const backPath = (wi: number, n: number) => {
    const h = homeOf(wi), st = seats[n]
    if (h.way.length < 2) return [h.at.clone(), aisleBeside(n), besideSeat(n)]
    const turn = st.counter === h.counter ? [] : [aisleCorner(counters[st.counter === 0 ? h.counter : st.counter])]
    return [...h.way.map((v) => v.clone()), ...turn, aisleBeside(n), besideSeat(n)]
  }
  /**
   * From a server's place to glass broken on the floor (bar.ts's SPILLS, in the scene's frame): out through their gate, along the aisle to the
   * seat nearest it, and over to stand before it, the broom's reach short of its middle (StaffFigure's sweepPose: its foot that far out); walked
   * backwards, it's their way back
   */
  /** the seat whose place on the aisle is nearest a point (the bar's frame) */
  const nearestSeat = (p: THREE.Vector3) => {
    let best = 0, bd = Infinity
    seats.forEach((st, n) => { const d = Math.hypot(st.aisle.x - p.x, st.aisle.z - p.z); if (d < bd) { bd = d; best = n } })
    return best
  }
  const spillPath = (wi: number, s: Spill) => {
    const f = frame.current
    if (!f || !seats.length) return null
    const p = f.worldToLocal(new THREE.Vector3(s.at[0], s.at[1], s.at[2]))
    let best = 0, bd = Infinity
    seats.forEach((st, n) => { const d = Math.hypot(st.aisle.x - p.x, st.aisle.z - p.z); if (d < bd) { bd = d; best = n } })
    const a = seats[best].aisle
    const to = new THREE.Vector3(p.x - a.x, 0, p.z - a.z)
    const len = to.length(), reach = 0.36 * STAFF_SCALE
    const stand = len > reach ? a.clone().addScaledVector(to, (len - reach) / len) : a.clone()
    stand.y = a.y
    return [...backPath(wi, best).slice(0, -1), stand]
  }
  /** what a server's doing: across the kitchen to the chef for what he's plated, out to its seat with it, back; out to clear plates done with, to the sink with
   * them; at the sink washing them into the dryer; taking the dried ones out of it back to the racks */
  type WaiterPhase = 'idle' | 'fetch' | 'pickup' | 'go' | 'set' | 'back' | 'clearGo' | 'clearTake' | 'clearBack' | 'drop'
    | 'washGo' | 'wash' | 'unloadGo' | 'unloadTake' | 'unloadCarry' | 'unloadPut' | 'handGo' | 'handwash' | 'basketGo' | 'basketTake'
    | 'toBox' | 'boxTake' | 'toTill' | 'hand' | 'toStand' | 'standPut'
    // (item 722: the floor's server off to wait by the takeaway stand, nothing to do)
    | 'toWait'
    | 'skTrayGo' | 'skTake' | 'skSinkGo' | 'skWash' | 'skHolderGo' | 'skPut'
    | 'tillGo' | 'tillAt'
    | 'sweepGo' | 'sweep' | 'wipeFloor'
    | 'toSakePass' | 'sakePour' | 'sakeUp' | 'sakeGo' | 'sakeSet'
    | 'toBowlPass' | 'bowlUp' | 'toRiceFill' | 'bowlRice' | 'toSoupFill' | 'bowlSoup' | 'bowlGo' | 'bowlSet'
    | 'toBowlWith' | 'bowlWith'
  const waiters = useRef<{ phase: WaiterPhase
    t: number; seat: number; keys: string[]; run: number | null
    /** the way they're drawn facing, turned toward `yaw` a frame at a time (set at once, they spun round at each corner of their way, by as
     * much as 150° in a frame) */
    look?: number
    /** (serving) the plating place's slot they've come for */
    slot?: number
    /** (clearing) the dirty plates they've come for, on their tray once taken; (from the dryer) how many dried plates are on their tray */
    carry?: number[]; stack?: number
    /** (a takeaway) the order whose box they've gone for, and carry out to its customer waiting in the genkan */
    box?: number
    /** (glass broken on the floor, bar.ts's SPILLS) the one they've gone to sweep up; and the broom in their hand, there and back */
    spill?: number; broom?: boolean
    /** their tray put down for an errand (TRAY_ERRANDS), till they're back at their place (item 249) */
    trayDown?: boolean
    /** (item 675) how far their tray's lifted (the bar's units) over the sink's top as they come up to it with what they've cleared, and as
     * they go from it after; whether the way back they're on is from tipping that into the sink */
    lift?: number; fromSink?: boolean
    /** (item 600) the washed bowls, renge and chopsticks on their tray, out of the washer back to the cabinets; and the place they're laying
     * a clean pair at once it's wiped (-1: none to lay), from when */
    ware?: Wares; lay?: number; layT?: number
    path: THREE.Vector3[]; len: number; pos: THREE.Vector3; yaw: number
    /** (item 722) where they stand waiting by the takeaway stand, with nothing to do (the floor's server: their place till there's
     * something, every way out from it begun back at their place inside their gate); how long they've stood at that place with nothing */
    waitAt?: THREE.Vector3; still?: number
    /** their walk home once the shop's shut, and in as it opens (commuteWalk); whether they're in yet */
    out?: Trip; in?: Trip; arrived?: boolean }[]>([])
  const waiterObjs = useRef<(THREE.Group | null)[]>([])
  /** the takeaway boxes in servers' hands, one for each server */
  const waiterBoxes = useRef<(THREE.Group | null)[]>([])
  /** the takeaway stand (bar.ts's TAKEOUT_STAND): its top's mark, the bags drawn on it, the one in the cashier's hands as it's handed over */
  const standTop = useRef<THREE.Object3D | null>(null)
  const standBags = useRef<(THREE.Group | null)[]>([])
  const handBag = useRef<THREE.Group | null>(null)
  /**
   * takeaway customers and delivery riders (game/takeout, the owner's): in at the front door to the edge of the genkan, by the till, where
   * they wait in their shoes (no seat, no shoes off) for a server to bring their box out to them; and out again with it, fading through the door
   */
  type Visitor = { id: number; rider: boolean; order: (typeof TAKEOUT.orders)[number]; phase: 'in' | 'wait' | 'toTill' | 'atTill' | 'out'; t: number; fade: number; fadeT: number; pos: THREE.Vector3; yaw: number
    /** where they wait: two side by side in the genkan, not in one another; and where they come up to the till for their bag from the cashier */
    wait: THREE.Vector3; till?: THREE.Vector3 }
  const visitors = useRef(new Map<number, Visitor>())
  const [visitorList, setVisitorList] = useState<{ id: number; rider: boolean; has: boolean }[]>([])
  const visitorObjs = useRef(new Map<number, THREE.Group>())
  /** those waiting on the genkan's bench for a stool (bar.ts's BENCH): in from the door to their place on it, sat there, and when called (`up`)
   * handed over to the way in to their stool from where they sat (`benchFrom`); given up, out of the door again */
  type Sitter = { id: number; phase: 'in' | 'sit' | 'out'; t: number; fade: number; fadeT: number; pos: THREE.Vector3; yaw: number; spot: number; handed?: boolean
    /** their place on the bench and the way it faces, as last found from its marks: kept while the marks aren't there for a frame */
    at?: THREE.Vector3; face?: THREE.Vector3
    /** sent away (the shop shutting) before they'd sat: where they were on their way in, the way out from there */
    outFrom?: THREE.Vector3; outVia?: boolean
    /** at the genkan's step (item 203): how far through stepping out of (or into) their shoes, 0..1, -1 not at it; and their pair left on the
     * stone, where and which way */
    bow?: number; shoes?: { at: THREE.Vector3; yaw: number }
    /** how far along their way in, and their way out, the genkan's step is (found once each, not every frame); and how long they stop at it
     * going out, fixed as they set off (item 411: worked out each frame from whether their shoes were still on the stone, it went to nothing
     * halfway into the stop as they stepped into them, and they were put where the walk would have been without it: 0.75 to 1.7 on in a frame) */
    stepIn?: number; stepOut?: number; outHold?: number
    /** where their pair's to stand on the stone (their place's in the row), found as they come in: they stop on it both ways, out of their
     * shoes there coming in and back into them going (item 412: they stopped at the step's edge and the pair came and went in the row 0.16 to
     * 0.41 from them, a stride off, never stood in); going out, the place they stop at (null: no pair down there, not stopping) */
    shoeAt?: THREE.Vector3; outShoe?: THREE.Vector3 | null }
  const sitters = useRef(new Map<number, Sitter>())
  /** where the bench's sitters leave their shoes on the genkan's stone (item 203): found from the first one's way up the step, kept */
  const shoeRow = useRef<{ at: THREE.Vector3; toes: THREE.Vector3; across: THREE.Vector3 } | null>(null)
  /** the k-th place's pair's place in the row (shoeRow), the row found the first time from `walk`, a way in from the door: SHOES_BACK back
   * toward the door from where it steps up out of the genkan, toes that way, its pairs off to the side away from the shoe cupboard (kept
   * only once the cupboard's there to keep away from); null with no step on the way to find it from */
  const shoeSpotOf = (k: number, walk: THREE.Vector3[]) => {
    let r = shoeRow.current
    if (!r) {
      const at0 = stepAt(walk)
      if (!(at0 > 0)) return null
      const back = alongPath(walk, Math.max(0, at0 - SHOES_BACK)), toes = back.dir.clone().negate().setY(0).normalize()
      const across = new THREE.Vector3(-toes.z, 0, toes.x), fr = frame.current
      const cab = fr && SHOE_CELLS.ready ? fr.worldToLocal(SHOE_CELLS.at.clone()) : null
      if (cab && across.dot(cab.setY(0).sub(back.p.clone().setY(0))) > 0) across.negate()
      r = { at: back.p.clone().setY(0), toes, across }
      if (cab) shoeRow.current = r
    }
    // (a neat row of them, not each pair where the last was (three at one spot, one in another): two side by side along the step's edge, two
    // more behind them toward the door, the fifth and sixth squeezed between; all on the stone and away from the shoe cupboard (its front a
    // step from where they cross: tests/e2e/_shoerow203.mjs))
    return r.at.clone().addScaledVector(r.across, 0.1 + 0.17 * (k % 2) + (k >= 4 ? 0.085 : 0)).addScaledVector(r.toes, 0.18 * (Math.floor(k / 2) % 2) + (k >= 4 ? 0.09 : 0))
  }
  /** those called off the bench whose shoes have been put in their place's cubby (item 203), for their seated self to take out going */
  const benchShoesIn = useRef(new Set<number>())
  const [sitterList, setSitterList] = useState<{ id: number; sat: boolean }[]>([])
  const sitterObjs = useRef(new Map<number, THREE.Group>())
  const benchFrom = useRef(new Map<number, THREE.Vector3>())
  /** the orders whose boxes a server's on the way with */
  const boxClaimed = useRef(new Set<number>())
  /** the kitchen's plater on their way to the racks for plates, and back with them to the plating place ('idle': at their place in the kitchen,
   * drawn there by Roasting) */
  // (and the kitchen's rice (game/rice): to the open sack of rice to scoop a pot's worth ('toSack', 'scoopRaw'), to the sink to wash it, to the
  // electric cooker to set it on ('toSink', 'wash', 'toKama', 'load'); cooked, it keeps the rice warm and the rice balls' rice is taken from it)
  const platerRun = useRef<{ phase: 'idle' | 'toRack' | 'take' | 'toPass' | 'put' | 'home' | 'settle' | 'toSack' | 'scoopRaw' | 'toSink' | 'wash' | 'toKama' | 'load'
    | 'toRackLow' | 'takeLow' | 'toLow' | 'putLow'
    | 'toSkTray' | 'takeSk' | 'toSkSink' | 'washSk' | 'toHolder' | 'putSk'
    | 'toTillBack' | 'atTill'
    | 'toCrate' | 'takeCoal' | 'toBucket' | 'scoopWater' | 'toHearth' | 'feedCoal' | 'sprinkle' | 'toSoup' | 'stir' | 'rake'
    | 'turnCrate' | 'turnBack' | 'toCoalSack' | 'liftSack' | 'toFill' | 'fillCrate' | 'toSake' | 'pourSake' | 'toShape' | 'shape'
    | 'toRiceBowl' | 'riceBowl' | 'toSoupBowl' | 'soupBowl' | 'toBowlPass' | 'bowlPut' | 'toGrate' | 'grate'
    | 'toStation' | 'cookStation' | 'toDishPass' | 'dishPut'
    t: number; path: THREE.Vector3[]; len: number
    pos: THREE.Vector3; yaw: number; n: number
    /** what they've gone for for the fire: the charcoal or the water (what's in their hands to the hearth, whatever the grill asks meanwhile) */
    fire?: 'coal' | 'water' | 'tidy'
    /** at the soup's pot to make it (the pot empty), not just to stir it */
    making?: boolean
    /** where the plating place's plates are taken from this time: the low rack by the table, or the dish racks (game/plates' plateSource) */
    src?: 'low' | 'rack'
    /** the way they're to face; `yaw` (the way they face, and what's in their hands with them) turned to it a frame at a time (item 242) */
    yawTo?: number }>({ phase: 'idle', t: 0, path: [], len: 0, pos: new THREE.Vector3(), yaw: 0, n: 0 })
  /**
   * A customer's tokkuri of sake (item 177, the owner's, 2026-11-15: "that sake stand: the way it goes looks odd, and not professional"): taken
   * off SAKE.want by the plater (the third cook; with no plater, a server), poured by hand at the sake station on the serving counter
   * (SakeStation: the open bottle kept there in reach), set down there with its cup; a server comes for it, lifts it onto their tray, carries
   * it out and sets it down at the customer's place, and only then is it theirs (SAKE.ready, SAKE_SEATS). One at a time: the station has the
   * one bottle and the one place to pour at.
   */
  const sakeJob = useRef<{ guest: number; seat: number
    /** who pours it: the plater, or a server (their index) */
    pourer: 'plater' | number
    /** how far into the pour (s of the shop's clock): -1 not begun, POUR_TOTAL poured */
    t: number
    /** the open bottle's level as the pour began; whether its sake's been taken from it */
    was?: number; poured?: boolean
    /** the server taking it out (index); lifting it onto their tray (0..1); setting it down at the customer's place (0..1) */
    server?: number; up?: number; down?: number } | null>(null)
  /** the tokkuri and the cup as they're poured, wait at the pass and are carried out (the bar's frame) */
  const sakeJugObj = useRef<THREE.Group>(null)
  const sakeCupObj = useRef<THREE.Group>(null)
  /** a customer's seat, by who they are (-1: not sat at the bar); and whether they're still sat at that one (or away at the toilet from it) */
  const guestSeat = (id: number) => shownRef.current.find((x) => x.id === id)?.seat ?? -1
  /** (item 630) whether a customer's still in the shop (any of them: at their place, in the toilet, on their way): one not, their order let go */
  const guestHere = (id: number | undefined) => id !== undefined && shownRef.current.some((x) => x.id === id)
  const guestSits = (id: number, seat: number) => shownRef.current.some((x) => x.id === id && x.seat === seat && (x.phase === 'sit' || x.phase.startsWith('wc')))
  /** a point of the sake station's (the serving counter's own frame) in the bar's; where the one pouring stands, and the way they face there */
  const stationIn = (v: THREE.Vector3, out = new THREE.Vector3()) => {
    const g = STATION_OBJ.group, f = frame.current
    if (!g || !f) return out.copy(v)
    g.updateWorldMatrix(true, false)
    return f.worldToLocal(g.localToWorld(out.copy(v)))
  }
  const stationSpot = () => stationIn(STATION.front).setY(0)
  const stationYaw = () => {
    const a = stationIn(STATION.front), b = stationIn(new THREE.Vector3(STATION.front.x, 0, 0))
    return Math.atan2(b.x - a.x, b.z - a.z)
  }
  /**
   * A customer's bowl of rice and of miso soup (items 205, 206, the owner's: 「我看客人都沒叫白飯跟味噌湯」「打飯的動畫？我要看到好的動畫品
   * 質」): filled at the counter, the rice scooped out of the cooker and the soup ladled out of its pot (SideBowls' poses, beat by beat), by
   * the plater (the third cook, or the second, or the owner with none); left at the serving counter's left end for a server, who lifts them
   * onto their tray and sets them at the customer's place. With no server (the owner serving), the one serving fills them and takes them
   * straight out. One customer's at a time.
   */
  type BowlJob = { guest: number; seat: number; rice: boolean; soup: boolean
    /** who fills them: the plater, or a server (index) who takes them straight out */
    by: 'plater' | number
    /** where it's got to: the rice being scooped, the soup ladled; to the counter with them (then they're the counter's: passQ) */
    stage: 'rice' | 'soup' | 'toPass'
    /** the row at the counter they're to be set down in (the plater's) */
    row?: number
    /** seconds into the filling's beats; how full each bowl is; the places the filling's posed from */
    t: number; riceFill: number; soupFill: number; W: FillAt | null
    /** the server carrying them out; lifting them onto the tray (0..1); setting them down at the place (0..1) */
    server?: number; up?: number; down?: number }
  const bowlJob = useRef<BowlJob | null>(null)
  // (in development, the bowl being filled and who's at it, to look at from the console)
  if (import.meta.env.DEV && typeof window !== 'undefined') Object.assign(window, { __bowlJob: bowlJob, __waiters: waiters, __platerRun: platerRun })
  /** (item 207) customers' bowls filled and set at the counter (each in its `row` there), or out on a server's tray (`server`; `up`, how far
   * they're lifted onto it, `down`, how far set down at the place; `row` -1: filled by the server and taken straight out): the oldest first */
  type PassBowls = { guest: number; seat: number; rice: boolean; soup: boolean; row: number; server?: number; up: number; down: number
    /** a dish from the stove, the fryer or the board (items 461, 469), carried out as the bowls are */
    dish?: string
    /** taken out with their food, on the same tray beside its plate (item 207) */
    with?: boolean
    /** how long they've waited at the counter for a server (as the plating place's slots count it: readyFor) */
    wait: number }
  const passQ = useRef<PassBowls[]>([])
  /** the dish the plater's making at a station (items 461, 469): whose, which, where, how long it takes, the counter's row it's to go in */
  const kitchenJob = useRef<{ guest: number; seat: number; id: string; station: Station; of: number; row: number; more: { guest: number; seat: number }[] } | null>(null)
  /** the dishes on the move (at the counter, on a tray, being set down), laid out every frame, drawn as the places' are (KitchenDishes) */
  const movingDishes = useRef<{ key: string; id: string; at: THREE.Vector3; yaw: number }[]>([])
  if (import.meta.env?.DEV && typeof window !== 'undefined') Object.assign(window, { __passQ: passQ })
  /** each server's tray as they carry bowls out: where it is, which way they face */
  const bowlTrays = useRef(new Map<number, { at: THREE.Vector3; yaw: number }>())
  /** the bowls on the move, drawn as the seats' are (SeatBowls): those at the counter and on the trays, laid out afresh every frame */
  const movingBowls = useRef<{ rice: WareAt[]; soup: WareAt[]; renge: WareAt[] }>({ rice: [], soup: [], renge: [] })
  /** (item 600) each server's tray as it is this frame (the bar's frame; which way they face), for what's cleared onto it and carried back */
  const trayNow = useRef(new Map<number, { at: THREE.Vector3; yaw: number }>())
  // (in development, for item 600's probes)
  if (import.meta.env?.DEV && typeof window !== 'undefined') Object.assign(window, { __trayNow: trayNow })
  const side = useSideProps()
  if (import.meta.env?.DEV && typeof window !== 'undefined') Object.assign(window, { __bowlJob: bowlJob, __side: side })
  /** the cooker's mouth and the way one stands at it (SideBowls' FillAt); where they stand */
  const riceStand = () => { marks.current.delete('cooker-front'); return inBar('cooker-front', new THREE.Vector3()).setY(0) }
  /** the cooker: its mouth, how wide, the counter's top under it, where one stands at it and faces */
  const cookerAt = () => {
    marks.current.delete('cooker-top')
    marks.current.delete('cooker-foot')
    const stand = riceStand(), top = inBar('cooker-top', stand), foot = inBar('cooker-foot', top.clone().setY(top.y - 0.2))
    const face = top.clone().sub(stand).setY(0).normalize()
    // (how wide the cooker is, from its own model beside the marker (its steam not counted), in the bar's units)
    let r = 0.17
    const model = markOf('cooker-top')?.parent?.children.find((c) => c.name === 'DenkiNabe'), f = frame.current
    if (model && f) {
      const sz = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3())
      r = Math.min(sz.x, sz.z) / 2 / f.getWorldScale(new THREE.Vector3()).x
    }
    return { top, face, right: new THREE.Vector3(-face.z, 0, face.x), r, low: foot.y, stand }
  }
  /** the soup pot: its rim's middle, how wide it is inside, its floor, its soup's face; how wide it is over all (its lid too) (the pot's own
   * model: the steam over it isn't the pot (its box with the steam had the rim up in the air, and the ladle there)) */
  const potAt = () => {
    // (the one in the miso pot's own group on the counter (another of the name stands elsewhere))
    marks.current.delete('miso-pot')
    const o = markOf('miso-pot')?.getObjectByName('MisoPot') ?? null, f = frame.current
    if (!o || !f) return null
    f.updateWorldMatrix(true, false)
    const all = new THREE.Box3()
    o.traverse((m) => { if ((m as THREE.Mesh).isMesh && m.name !== 'MisoSoup') all.expandByObject(m) })
    // (its rim and its width from its inside alone (item 253: from everything in it, the lid pushed half over and the pot's own ladle
    // standing up out of it, the rim was put in the air over the lid, and the ladle rested there)), measured along the pot's own two axes
    // from its vertices in the bar's frame: it's oval and stands turned, and a box of it square to the world was wider than it is (the
    // ladle went through its wall)
    o.updateWorldMatrix(true, true)
    const toBar = new THREE.Matrix4().copy(f.matrixWorld).invert()
    const o0 = o.localToWorld(new THREE.Vector3()).applyMatrix4(toBar)
    const ux = o.localToWorld(new THREE.Vector3(1, 0, 0)).applyMatrix4(toBar).sub(o0).setY(0).normalize()
    const uz = o.localToWorld(new THREE.Vector3(0, 0, 1)).applyMatrix4(toBar).sub(o0).setY(0).normalize()
    const span = (mesh: THREE.Object3D | undefined) => {
      const g = (mesh as THREE.Mesh | undefined)?.geometry?.attributes.position
      if (!mesh || !g) return null
      const m4 = new THREE.Matrix4().multiplyMatrices(toBar, mesh.matrixWorld), v = new THREE.Vector3()
      const s = { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity, y0: Infinity, y1: -Infinity }
      for (let i = 0; i < g.count; i++) {
        v.fromBufferAttribute(g, i).applyMatrix4(m4)
        const d = v.clone().sub(o0), px = d.dot(ux), pz = d.dot(uz)
        s.x0 = Math.min(s.x0, px); s.x1 = Math.max(s.x1, px); s.z0 = Math.min(s.z0, pz); s.z1 = Math.max(s.z1, pz); s.y0 = Math.min(s.y0, v.y); s.y1 = Math.max(s.y1, v.y)
      }
      return s
    }
    const ins = span(o.getObjectByName('MisoPotInside')), body = span(o.getObjectByName('MisoPotBody'))
    const alo = f.worldToLocal(all.min.clone()), ahi = f.worldToLocal(all.max.clone())
    if (!ins) return null
    const ax = (ins.x1 - ins.x0) / 2, az = (ins.z1 - ins.z0) / 2
    const top = o0.clone().addScaledVector(ux, (ins.x0 + ins.x1) / 2).addScaledVector(uz, (ins.z0 + ins.z1) / 2).setY(ins.y1)
    const lo = { y: ins.y0 }, hi = { x: ax * 2, z: az * 2 }
    /** how far its inside wall is from its middle the way `dir` points (an oval's) */
    const rimR = (dir: THREE.Vector3) => { const c = dir.dot(ux), s = dir.dot(uz); return (ax * az) / Math.max(1e-6, Math.hypot(az * c, ax * s)) }
    // (the soup's face where it's drawn (its node's origin is the pot's floor: the soup's at its height in the model))
    const soupFace = o.getObjectByName('MisoSoup')
    const soupBox = soupFace ? new THREE.Box3().setFromObject(soupFace) : null
    // (its lid's pushed half off toward its own -z (blender/misopot.py): the open half its +z, in the bar's frame)
    o.updateWorldMatrix(true, false)
    const open = f.worldToLocal(o.localToWorld(new THREE.Vector3(0, 0, 1))).sub(f.worldToLocal(o.localToWorld(new THREE.Vector3()))).setY(0).normalize()
    return { top, r: Math.min(hi.x, hi.z) / 2, floor: lo.y, open, rimR, rimTop: body ? body.y1 : undefined,
      outer: Math.min(Math.abs(ahi.x - alo.x), Math.abs(ahi.z - alo.z)) / 2 * 0.92,
      surface: soupBox && !soupBox.isEmpty() ? f.worldToLocal(soupBox.max.clone()).y : top.y - 0.03 }
  }
  // (in development, `__potAt()`: the soup pot as measured, in the bar's frame (item 253))
  if (import.meta.env?.DEV && typeof window !== 'undefined') Object.assign(window, { __potAt: () => potAt() })
  /** a bowl's place on the counter beside something round (`at`, `r` across), on the side away from its neighbour (`other`) */
  const counterTops = useRef<{ at: number; boxes: THREE.Box3[] }>({ at: -1e9, boxes: [] })
  const onPrepTop = (p: THREE.Vector3) => {
    const f = frame.current
    if (!f) return true
    if (performance.now() - counterTops.current.at > 1000) {
      counterTops.current.at = performance.now()
      let root: THREE.Object3D = f
      while (root.parent) root = root.parent
      const boxes: THREE.Box3[] = []
      root.traverse((o) => {
        if (o.userData?.editId !== 'warmer' && o.userData?.editId !== 'prepcounter') return
        const b = new THREE.Box3().setFromObject(o)
        boxes.push(new THREE.Box3(f.worldToLocal(b.min.clone()), f.worldToLocal(b.max.clone())))
      })
      counterTops.current.boxes = boxes
    }
    const bs = counterTops.current.boxes
    if (!bs.length) return true
    // (a bowl's width in from every edge of the counter's top)
    return bs.some((b) => {
      const x0 = Math.min(b.min.x, b.max.x) + 0.06, x1 = Math.max(b.min.x, b.max.x) - 0.06
      const z0 = Math.min(b.min.z, b.max.z) + 0.06, z1 = Math.max(b.min.z, b.max.z) - 0.06
      return p.x > x0 && p.x < x1 && p.z > z0 && p.z < z1
    })
  }
  /** a bowl's place on the counter beside something round (`at`, `r` across): the side away from its neighbour (`other`, `or` across)
   * first, else the side toward it if there's room between them; always on the counter's top */
  const besideOf = (at: THREE.Vector3, r: number, right: THREE.Vector3, face: THREE.Vector3, low: number, other: THREE.Vector3 | null, or = 0) => {
    const sd = other && other.clone().sub(at).dot(right) > 0 ? -1 : 1
    const spots = [sd, -sd].flatMap((s) => [0, -0.06, 0.05].map((df) => at.clone().addScaledVector(right, s * (r + 0.075)).addScaledVector(face, df).setY(low)))
    const clear = (p: THREE.Vector3) => onPrepTop(p) && (!other || p.clone().setY(0).distanceTo(other.clone().setY(0)) > or + 0.065)
    return spots.find(clear) ?? spots[0]
  }
  /** the paddle as it stands in the holder on the cooker's side (item 618: Decor's DenkiNabe's `cooker-paddle`, part of the cooker): its
   * grip and how it's turned, in the bar's frame */
  const paddleAt = (): FillAt['paddle'] => {
    marks.current.delete('cooker-paddle')
    const o = markOf('cooker-paddle'), f = frame.current
    if (!o || !f) return undefined
    f.updateWorldMatrix(true, false)
    o.updateWorldMatrix(true, false)
    const grip = f.worldToLocal(o.getWorldPosition(new THREE.Vector3()))
    const q = f.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(o.getWorldQuaternion(new THREE.Quaternion()))
    return { grip, q }
  }
  /** the cooker's places for filling a bowl of rice (SideBowls' FillAt) */
  const riceFillAt = (): FillAt => {
    const c = cookerAt(), p = potAt()
    return { ...c, put: besideOf(c.top, c.r, c.right, c.face, c.low, p?.top ?? null, p?.outer ?? 0), paddle: paddleAt() }
  }
  /** the soup pot's, and where one stands at it: in front of it as one stands at the cooker */
  const soupFillAt = (): FillAt => {
    const c = cookerAt(), p = potAt()
    if (!p) return { ...c, put: besideOf(c.top, c.r, c.right, c.face, c.low, null) }
    // (across from the pot before the counter's front, as far out as at the cooker (item 387: moved back from the pot as far as the cooker's
    // place is from the cooker, it stood in the counter: the pot's further in))
    const stand = frontOf(p.top, c.stand, c.top)
    // (the counter's top the one it stands in: the cooker's (one counter, the two joined))
    return { top: p.top, face: c.face, right: c.right, r: p.r, surface: p.surface, floor: p.floor, rimR: p.rimR, rimTop: p.rimTop, stand, low: c.low, open: p.open,
      put: besideOf(p.top, p.outer, c.right, c.face, c.low, c.top, c.r) }
  }
  /** a customer's bowls' place at the counter in its row (the bar's frame) */
  const passAt = (row: number, kind: 'rice' | 'soup') => stationIn((kind === 'rice' ? BOWL_PASS.rice : BOWL_PASS.soup).clone().setZ(PASS_Z[row] ?? BOWL_PASS.rice.z))
  /** a row at the counter with no bowls in it (none there, or being lifted off it), or -1 */
  const freeRow = () => {
    for (let r = 0; r < PASS_MAX; r++) if (!passQ.current.some((b) => b.row === r && (b.server === undefined || b.up < 1))) return r
    return -1
  }
  /** how many rows at the serving counter are free now */
  const freeRowsNow = () => { let n = 0; for (let r = 0; r < PASS_MAX; r++) if (!passQ.current.some((b) => b.row === r && (b.server === undefined || b.up < 1))) n++; return n }
  const passSpot = () => stationIn(BOWL_PASS.front).setY(0)
  /** the job's next customer: the first whose bowls can be filled now (the rice cooked and some in the pot; the soup hot), sat at the bar */
  const nextBowls = () => {
    // (and a clean bowl to fill in the cabinets, the soup's renge with it (item 600): none, it waits for the washed ones)
    const fill = canFill(WARE.cab)
    const riceOk = RICE.kama.state === 'done' && RICE.rice > 0 && fill.rice, soupOk = soupReady(SOUP.pot, SOUP.left) && fill.soup
    // (what can be had of it now taken out first, the rest left asked for: the soup while the rice is still cooking, or the other way; one
    // not at the bar just now (in the toilet) passed over for the next, not keeping everyone after them waiting)
    const k = BOWLS.want.findIndex((x) => ((x.rice && riceOk) || (x.soup && soupOk)) && guestSeat(x.guest) >= 0)
    if (k < 0) return null
    const w = BOWLS.want[k], seat = guestSeat(w.guest)
    const rice = w.rice && riceOk, soup = w.soup && soupOk
    if ((w.rice && !rice) || (w.soup && !soup)) BOWLS.want[k] = { ...w, rice: w.rice && !rice, soup: w.soup && !soup }
    else BOWLS.want.splice(k, 1)
    return { guest: w.guest, rice, soup, seat }
  }
  /** whether there's a customer's bowls to be filled now (nextBowls would give one): the rice cooked and some in the pot, or the soup hot, for
   * one sat at the bar (item 207: asked for while neither was ready, the plater took it for his job, found none to fill, and stood idle; the
   * plates, the soup's making and the rice's cooking under it never came to: the plating place bare, the fish done waited all evening) */
  const bowlsNow = () => {
    const fill = canFill(WARE.cab)
    const riceOk = RICE.kama.state === 'done' && RICE.rice > 0 && fill.rice, soupOk = soupReady(SOUP.pot, SOUP.left) && fill.soup
    return BOWLS.want.some((x) => ((x.rice && riceOk) || (x.soup && soupOk)) && guestSeat(x.guest) >= 0)
  }
  /** (item 600) a customer's bowls begun: the clean ones out of the cabinets (nextBowls has only given what there's a clean bowl for) */
  const takeBowlsFor = (b: { rice: boolean; soup: boolean }) => {
    if (b.rice) WARE.cab = takeForFill(WARE.cab, 'rice')
    if (b.soup) WARE.cab = takeForFill(WARE.cab, 'soup')
    WARE.ver++
  }
  /** the bowls set down at their place: theirs (Roasting has them eat), drawn there and eaten down */
  const setBowls = (j: { guest: number; seat: number; rice: boolean; soup: boolean; dish?: string }) => {
    const now = performance.now()
    // (a dish from the stove or the fryer (items 461, 469): set at their place, theirs to eat)
    if (j.dish) {
      KITCHEN.seats.set(j.seat, [...(KITCHEN.seats.get(j.seat) ?? []), j.dish])
      const k = `${j.dish}:${j.guest}`
      KITCHEN.got.set(k, (KITCHEN.got.get(k) ?? 0) + 1)
      KITCHEN.ver++
    }
    if (j.rice) { RICE_SEATS.add(j.seat); BOWLS.setAt.set(`rice:${j.seat}`, now); BOWLS.got.add(`rice:${j.guest}`) }
    if (j.soup) { SOUP_SEATS.add(j.seat); SOUP.served++; BOWLS.setAt.set(`soup:${j.seat}`, now); BOWLS.got.add(`soup:${j.guest}`) }
    BOWLS.ver++
  }
  /**
   * (item 600) the bowls, the renge and the chopsticks off the customers' places, laid out every frame (drawn as the seats' bowls are, instanced,
   * and the chopsticks with the places' own: Roasting's BarChopsticks): left at the place once its customer's gone, lifted onto the clearing
   * server's tray with the plate (the rice bowls nested on its left, the soup bowls on its right with their renge in the top one, the used
   * pairs across its front), down into the sink (the bowls stacked in its basin either side of the plates, the chopsticks and the renge stood
   * in the soaking pot in its back corner), and, washed, on a tray back to the cabinets under the racks; a clean pair laid on a place's rest
   * from the tray once it's wiped.
   */
  const warePool = useRef<(WareAt & { qq: THREE.Quaternion })[]>([])
  const leftSpots = useRef(new Map<number, { rice: THREE.Vector3; soup: THREE.Vector3; yaw: number }>())
  const sinkWare = useRef<{ t: number; rice: THREE.Vector3; soup: THREE.Vector3; pot: THREE.Vector3; yaw: number } | null>(null)
  const chopPieces = useRef(new Map<number, THREE.Object3D>())
  const WT = useMemo(() => ({ p: new THREE.Vector3(), p2: new THREE.Vector3(), q: new THREE.Quaternion(), q2: new THREE.Quaternion(), qr: new THREE.Quaternion(),
    m: new THREE.Matrix4(), s: new THREE.Vector3(1, 1, 1), sd: new THREE.Vector3(), fw: new THREE.Vector3(), ps: new THREE.Vector3(), pw: new THREE.Vector3(),
    ss: new THREE.Vector3(), ws: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1), loose: 0 }), [])
  /** the basin's places, the bar's frame (looked at again every two seconds: the sink may be moved in edit mode): the bowls' two stacks
   * either side of the plates' at its middle, toward its front; the soaking pot in its back corner, away from the tap */
  const sinkWareAt = () => {
    const now = performance.now(), f = frame.current, was = sinkWare.current
    if (was && now - was.t < 2000) return was
    const basin = markOf('SinkBasin')
    if (!basin || !f) return was
    f.updateWorldMatrix(true, false)
    basin.updateWorldMatrix(true, false)
    // (in the basin's own frame (blender/sink.py): x along the counter, z out to its front, the tap's foot at the middle of its back; 0.62 by
    // 0.56 round its rim, its floor at -0.08; the plates' stack at its middle, the long ones sweeping some 0.21 round it as they're turned. A
    // bowl's 0.073 round here, the pot's 0.058: the bowls in its two front corners, the pot in a back one, a couple of centimetres off the walls)
    const at = (x: number, z: number) => f.worldToLocal(basin.localToWorld(new THREE.Vector3(x, -0.08, z)))
    const a = at(0, 0), b = at(1, 0)
    // (its walls' inner faces at x 0.31 and z 0.28 either way, its corners rounded 0.05 round (measured: tests/e2e/_basin601.mjs): the pot
    // 0.05 clear of both walls, out of its back corner's round (at -0.24, -0.21 it went 1.5 to 3 cm into it: the Tester's clips, item 600))
    sinkWare.current = { t: now, rice: at(-0.225, 0.195), soup: at(0.225, 0.195), pot: at(-0.2, -0.17), yaw: Math.atan2(-(b.z - a.z), b.x - a.x) }
    return sinkWare.current
  }
  /** a place's pair's piece (BarTableware's chop-pair-<seat>), found once */
  const chopPiece = (seat: number) => {
    let o = chopPieces.current.get(seat)
    if (!o?.parent) {
      let root: THREE.Object3D | null = frame.current
      while (root?.parent) root = root.parent
      o = root?.getObjectByName(`chop-pair-${seat}`) ?? undefined
      if (o) chopPieces.current.set(seat, o)
    }
    return o
  }
  function layWare(mv: { rice: WareAt[]; soup: WareAt[]; renge: WareAt[] }) {
    const f = frame.current
    if (!f) return
    let used = 0
    const loose = CHOPS_LOOSE.m, hadLoose = CHOPS_LOOSE.n
    WT.loose = 0
    f.getWorldScale(WT.ws)
    const entry = (list: WareAt[], key: string, at: THREE.Vector3, yaw: number, fill?: number, q?: THREE.Quaternion) => {
      const pool = warePool.current
      const e = pool[used] ?? (pool[used] = { key: '', at: new THREE.Vector3(), yaw: 0, qq: new THREE.Quaternion() })
      used++
      e.key = key
      e.at.copy(at)
      e.yaw = yaw
      e.fill = fill
      e.q = q ? e.qq.copy(q) : undefined
      list.push(e)
    }
    const sideOf = (yaw: number, out: THREE.Vector3) => out.set(Math.cos(yaw), 0, -Math.sin(yaw))
    const fwdOf = (yaw: number, out: THREE.Vector3) => out.set(Math.sin(yaw), 0, Math.cos(yaw))
    /** a point on a tray (`s` across it to the server's right, `fw` out along it, `up` over its floor) */
    const onTray = (tn: { at: THREE.Vector3; yaw: number }, s: number, fw: number, up: number, out: THREE.Vector3) =>
      out.copy(tn.at).addScaledVector(sideOf(tn.yaw, WT.sd), s).addScaledVector(fwdOf(tn.yaw, WT.fw), fw).setY(tn.at.y + 0.006 + up)
    /** a renge tipped into its soup bowl at `bowl` (its handle out over the rim along `yaw`'s -x): its turn left in WT.q, its foot's place */
    const rengeIn = (bowl: THREE.Vector3, yaw: number, out: THREE.Vector3) => {
      WT.q.setFromAxisAngle(WT.up, yaw).multiply(WT.qr.setFromAxisAngle(WT.z, -0.32))
      return out.copy(bowl).addScaledVector(sideOf(yaw, WT.sd), -0.012).setY(bowl.y + 0.016)
    }
    /** a stick in the world, from its place and turn in the bar's frame */
    const stick = (at: THREE.Vector3, q: THREE.Quaternion) => {
      if (WT.loose >= loose.length) return
      loose[WT.loose++].compose(at, q, WT.s).premultiply(f.matrixWorld)
    }
    /** a pair lying flat along `yaw` (its sticks either side of `at`, the line their grips' ends start from) */
    const pairFlat = (at: THREE.Vector3, yaw: number) => {
      WT.q2.setFromAxisAngle(WT.up, yaw)
      fwdOf(yaw, WT.fw)
      for (const sd of [-1, 1]) stick(WT.p2.copy(at).addScaledVector(WT.fw, sd * 0.0075), WT.q2)
    }
    /** a place's pair from its rest (`k` 0) to lying flat on a tray at `at` (`k` 1), or back: each stick's place and turn blended (the world) */
    const pairBetween = (seat: number, at: THREE.Vector3, yaw: number, k: number) => {
      const pc = chopPiece(seat)
      if (!pc) { if (k > 0.5) pairFlat(at, yaw); return }
      pc.updateWorldMatrix(true, false)
      const e = Math.min(1, Math.max(0, k))
      const s = e * e * (3 - 2 * e)
      fwdOf(yaw, WT.fw)
      for (let i = 0; i < 2; i++) {
        if (WT.loose >= loose.length) return
        // (on its rest, in the world)
        WT.m.multiplyMatrices(pc.matrixWorld, CHOP_ON[i]).decompose(WT.ps, WT.q, WT.ss)
        // (on the tray, in the world)
        WT.pw.copy(at).addScaledVector(WT.fw, (i ? 1 : -1) * 0.0075)
        f.localToWorld(WT.pw)
        WT.q2.setFromAxisAngle(WT.up, yaw).premultiply(f.getWorldQuaternion(WT.qr))
        WT.pw.lerp(WT.ps, 1 - s)
        WT.pw.y += Math.sin(Math.PI * s) * 0.05 * WT.ws.y
        WT.q2.slerp(WT.q, 1 - s)
        loose[WT.loose++].compose(WT.pw, WT.q2, WT.ws)
      }
    }
    const ez = (x: number) => { const k = Math.min(1, Math.max(0, x)); return k * k * (3 - 2 * k) }
    // (1) left at their places; (2) on the clearing trays, going into the sink, or flying to it by themselves (nobody on the floor)
    const nest = new Map<number, { rice: number; soup: number; pairs: number }>()
    for (const r of runs.current) {
      const ware = r.ware
      if (!ware || wareCount(ware) === 0) continue
      if (r.phase === 'dirty' || (r.phase === 'clear' && r.t < 0)) {
        let sp = leftSpots.current.get(r.key)
        if (!sp) {
          const a = counters[seats[r.seat]?.counter ?? 0]?.along
          sp = { rice: riceSpotOf(r.seat), soup: soupSpotOf(r.seat), yaw: a ? Math.atan2(-a.z, a.x) : 0 }
          leftSpots.current.set(r.key, sp)
        }
        if (ware.rice) entry(mv.rice, `left:rice:${r.key}`, sp.rice, 0, WARE_LEFT)
        if (ware.soup) {
          entry(mv.soup, `left:soup:${r.key}`, sp.soup, 0, WARE_LEFT)
          if (ware.renge) entry(mv.renge, `left:renge:${r.key}`, rengeIn(sp.soup, sp.yaw, WT.p), 0, undefined, WT.q)
        }
        continue
      }
      if (r.phase === 'taken') {
        const wi = waiters.current.findIndex((x) => x.carry?.includes(r.key))
        const tn = trayNow.current.get(wi), w = waiters.current[wi]
        if (!tn || !w) continue
        const n = nest.get(wi) ?? { rice: 0, soup: 0, pairs: 0 }
        nest.set(wi, n)
        const lifting = w.phase === 'clearTake' && w.seat === r.seat ? ez((w.t - CLEAR_REACH) / CLEAR_LIFT) : 1
        const dropping = w.phase === 'drop' ? ez(w.t / 0.45) : 0
        const sw = dropping > 0 ? sinkWareAt() : null
        const sp = lifting < 1 ? leftSpots.current.get(r.key) : undefined
        const place = (kind: 'rice' | 'soup', nth: number, out: THREE.Vector3) => {
          onTray(tn, kind === 'rice' ? -0.11 : 0.11, -0.04, nth * BOWL_NEST, out)
          if (lifting < 1) {
            WT.p2.copy(out)
            out.copy(kind === 'rice' ? sp?.rice ?? riceSpotOf(r.seat) : sp?.soup ?? soupSpotOf(r.seat)).lerp(WT.p2, lifting)
            out.y += Math.sin(Math.PI * lifting) * 0.05
          }
          if (sw && dropping > 0) {
            WT.p2.copy(kind === 'rice' ? sw.rice : sw.soup)
            WT.p2.y += (kind === 'rice' ? WARE.sink.rice : WARE.sink.soup) * BOWL_NEST
            out.lerp(WT.p2, dropping)
            out.y += Math.sin(Math.PI * dropping) * 0.04
          }
          return out
        }
        for (let k = 0; k < ware.rice; k++) entry(mv.rice, `tray:rice:${r.key}:${k}`, place('rice', n.rice++, WT.p), tn.yaw, k === ware.rice - 1 ? WARE_LEFT : 0)
        for (let k = 0; k < ware.soup; k++) entry(mv.soup, `tray:soup:${r.key}:${k}`, place('soup', n.soup++, WT.p), tn.yaw, k === ware.soup - 1 ? WARE_LEFT : 0)
        if (ware.renge && ware.soup) {
          const b = place('soup', n.soup - 1, WT.ps)
          entry(mv.renge, `tray:renge:${r.key}`, rengeIn(b, tn.yaw, WT.p), 0, undefined, WT.q)
        }
        if (ware.chops) {
          const at = onTray(tn, -0.11, 0.08 + 0.016 * n.pairs++, 0.004, WT.p)
          if (sw && dropping > 0) {
            // (into the soaking pot as they go in)
            at.lerp(WT.ps.copy(sw.pot).setY(sw.pot.y + 0.04), dropping)
            pairFlat(at, tn.yaw)
          } else if (lifting < 1) pairBetween(r.seat, at, tn.yaw, lifting)
          else pairFlat(at, tn.yaw)
        }
        continue
      }
      if (r.phase === 'clear') {
        // (flying to the sink by itself beside its plate: nobody on the floor)
        const o = runObjs.current.get(r.key)
        if (!o) continue
        if (ware.rice) entry(mv.rice, `fly:rice:${r.key}`, WT.p.copy(o.position).add(WT.sd.set(-0.1, 0.01, 0)), 0, WARE_LEFT)
        if (ware.soup) entry(mv.soup, `fly:soup:${r.key}`, WT.p.copy(o.position).add(WT.sd.set(0.1, 0.01, 0)), 0, WARE_LEFT)
      }
    }
    for (const k of leftSpots.current.keys()) if (!runs.current.some((r) => r.key === k && (r.phase === 'dirty' || r.phase === 'taken' || (r.phase === 'clear' && r.t < 0)))) leftSpots.current.delete(k)
    // (3) waiting in the sink: the bowls stacked in its basin, the chopsticks and the renge stood in the soaking pot
    const sw = sinkWareAt()
    if (sw) {
      side.soakPot.position.copy(sw.pot)
      side.soakPot.visible = true
      const sink = WARE.sink
      for (const kind of ['rice', 'soup'] as const) {
        const n = Math.min(SINK_BOWLS_SHOWN, sink[kind]), base = kind === 'rice' ? sw.rice : sw.soup
        for (let k = 0; k < n; k++) entry(kind === 'rice' ? mv.rice : mv.soup, `sink:${kind}:${k}`, WT.p.copy(base).setY(base.y + 0.002 + k * BOWL_NEST), sw.yaw + k * 0.7, k === n - 1 ? WARE_RINSE : 0)
      }
      // (stood round in the pot, leaning out a little, each pair a turn on from the last)
      const pairs = Math.min(POT_PAIRS_SHOWN, sink.chops), renges = Math.min(POT_RENGE_SHOWN, sink.renge)
      for (let k = 0; k < pairs; k++) {
        const a = k * 2.39996
        for (const sd of [-1, 1]) {
          WT.q.setFromAxisAngle(WT.up, a + sd * 0.05).multiply(WT.qr.setFromAxisAngle(WT.z, Math.PI / 2 - 0.1 - 0.03 * sd))
          stick(WT.p.copy(sw.pot).add(WT.sd.set(Math.cos(a) * 0.014 + sd * 0.004, 0.006, -Math.sin(a) * 0.014)), WT.q)
        }
      }
      for (let k = 0; k < renges; k++) {
        const a = k * 2.39996 + 1.1
        WT.q.setFromAxisAngle(WT.up, a).multiply(WT.qr.setFromAxisAngle(WT.z, -Math.PI / 2 + 0.22))
        entry(mv.renge, `sink:renge:${k}`, WT.p.copy(sw.pot).add(WT.sd.set(Math.cos(a) * 0.012, 0.008, -Math.sin(a) * 0.012)), 0, undefined, WT.q)
      }
    }
    // (4) washed, on a tray back to the cabinets under the racks: the bowls nested as they were cleared, the chopsticks and the renge across its
    // front; into the cabinet's front as they're put away
    waiters.current.forEach((w, wi) => {
      const ware = w.ware
      if (!ware || (w.phase !== 'unloadCarry' && w.phase !== 'unloadPut')) return
      const tn = trayNow.current.get(wi)
      if (!tn) return
      const k = w.phase === 'unloadPut' ? ez(w.t / 0.45) : 0
      const ri = rackNow(PLATE_RACK.n + 1)
      const into = k > 0 ? rackFront(ri).setY(0.32).lerp(rackTop(ri).setY(0.32), 0.25) : null
      const put = (out: THREE.Vector3) => { if (into) { out.lerp(into, k); out.y += Math.sin(Math.PI * k) * 0.03 } return out }
      for (let i = 0; i < Math.min(SINK_BOWLS_SHOWN, ware.rice); i++) entry(mv.rice, `home:rice:${wi}:${i}`, put(onTray(tn, -0.11, -0.04, i * BOWL_NEST, WT.p)), tn.yaw, 0)
      for (let i = 0; i < Math.min(SINK_BOWLS_SHOWN, ware.soup); i++) entry(mv.soup, `home:soup:${wi}:${i}`, put(onTray(tn, 0.11, -0.04, i * BOWL_NEST, WT.p)), tn.yaw, 0)
      for (let i = 0; i < Math.min(3, ware.chops); i++) pairFlat(put(onTray(tn, -0.11, 0.075 + i * 0.016, 0.004, WT.p)), tn.yaw)
      for (let i = 0; i < Math.min(3, ware.renge); i++) {
        WT.q.setFromAxisAngle(WT.up, tn.yaw + Math.PI / 2)
        entry(mv.renge, `home:renge:${wi}:${i}`, put(onTray(tn, 0.02 + i * 0.03, 0.05, 0.002, WT.p)), 0, undefined, WT.q)
      }
    })
    // (5) a clean pair laid on a cleared place's rest from the tray once it's wiped down
    waiters.current.forEach((w, wi) => {
      if (w.phase !== 'clearTake' || w.lay === undefined || w.lay < 0) return
      const tn = trayNow.current.get(wi)
      if (!tn) return
      pairBetween(w.lay, onTray(tn, -0.11, 0.1, 0.004, WT.p), tn.yaw, 1 - ez((w.t - (w.layT ?? 0)) / LAY_S))
    })
    if (WT.loose !== hadLoose || WT.loose > 0) { CHOPS_LOOSE.n = WT.loose; CHOPS_LOOSE.ver++ }
  }
  /** the ladle's rest (in the pot), looked at again a second at a time (moved in edit mode) (the paddle's is the cooker's own, item 618) */
  const restsAt = useRef<{ at: number; ladle: { grip: THREE.Vector3; q: THREE.Quaternion } | null }>({ at: -1e9, ladle: null })
  /** what stands on the bar's top that a tokkuri mustn't be set into (item 177: at one place of each pair it stood in the soy pot and the
   * wasabi the two share): the shared condiments, the little baskets, the soy dishes and the chopsticks, each its box on the top (the bar's
   * frame, x and z), looked at again a second at a time (they're moved in edit mode) */
  const barThings = useRef<{ at: number; boxes: THREE.Box2[] }>({ at: -1e9, boxes: [] })
  const thingsOnBar = () => {
    const now = performance.now(), f = frame.current
    if (now - barThings.current.at < 1000 || !f) return barThings.current.boxes
    barThings.current.at = now
    let root: THREE.Object3D = f
    while (root.parent) root = root.parent
    const boxes: THREE.Box2[] = []
    root.traverse((o) => {
      const id = o.userData?.editId
      if (typeof id !== 'string' || !/^(condiments|tablebasket|soydish|chopsticks|chopstickpair)/.test(id)) return
      const bb = new THREE.Box3().setFromObject(o)
      if (bb.isEmpty()) return
      const lo = f.worldToLocal(bb.min.clone()), hi = f.worldToLocal(bb.max.clone())
      boxes.push(new THREE.Box2(new THREE.Vector2(Math.min(lo.x, hi.x), Math.min(lo.z, hi.z)), new THREE.Vector2(Math.max(lo.x, hi.x), Math.max(lo.z, hi.z))))
    })
    barThings.current.boxes = boxes
    return boxes
  }
  /**
   * Where a seat's tokkuri and its cup are set (item 177; as the server sets them down, and as they're drawn there after): the first of a few
   * places that's clear of everything at that place and its neighbours': the shared soy pot and wasabi, the little basket, the soy dish, the
   * chopsticks (as they stand, moved or not), their plate, and where their soup bowl and their drink (bottle and cup) go whether they're there
   * yet or not; and the next places' tokkuri. Past the soup on the side away from their soy dish (as it was, item 89: at every other place it
   * stood in the soy pot, and beside the soup bowl and the drink it touched both), the other side past the soy dish, before the plate on
   * either side, or behind it. Worked out once for each tokkuri (kept in sakeSpots till it's cleared), so it's drawn where it was set
   */
  const sakeSpots = useRef(new Map<number, { at: THREE.Vector3; cup: THREE.Vector3 }>())
  const sakeSpotOf = (n: number) => {
    const kept = sakeSpots.current.get(n)
    if (kept) return kept
    const st = seats[n], c = counters[st.counter]
    const x = st.mid.clone().sub(c.at).dot(c.along)
    const side = -sauceSide(c, BAR_GATES[st.counter], x)
    const boxes = thingsOnBar()
    // (round things kept clear of: each place's plate, soup bowl and drink, this one's and its neighbours'; the tokkuri already set)
    const rounds: { p: THREE.Vector3; r: number }[] = []
    for (const m of [n - 1, n, n + 1]) {
      const sm = seats[m]
      if (!sm || sm.counter !== st.counter) continue
      const cm = counters[sm.counter], xm = sm.mid.clone().sub(cm.at).dot(cm.along)
      rounds.push({ p: sm.plate.clone(), r: 0.16 })
      rounds.push({ p: sm.mid.clone().addScaledVector(cm.along, -sauceSide(cm, BAR_GATES[sm.counter], xm) * 1.15).addScaledVector(cm.lay, PLACE.sauce[1]), r: 0.07 })
      rounds.push({ p: new THREE.Vector3(...drinkSpot(m, false)), r: 0.045 })
      rounds.push({ p: new THREE.Vector3(...drinkSpot(m, true)), r: 0.032 })
      const other = m === n ? null : sakeSpots.current.get(m)
      if (other) { rounds.push({ p: other.at, r: 0.04 }); rounds.push({ p: other.at.clone().add(other.cup), r: 0.03 }) }
    }
    const clear = (p: THREE.Vector3, r: number) => !boxes.some((bx) => p.x > bx.min.x - r && p.x < bx.max.x + r && p.z > bx.min.y - r && p.z < bx.max.y + r)
      && !rounds.some((o) => Math.hypot(p.x - o.p.x, p.z - o.p.z) < o.r + r)
    // (each try: the tokkuri along and across from the place's middle, its cup from it, along and across)
    const tries: [number, number, number, number][] = [
      [side * 1.55, PLACE.sauce[1] - 0.02, -Math.sign(side) * 0.07, 0.06], [-side * 1.55, PLACE.sauce[1] - 0.02, Math.sign(side) * 0.07, 0.06],
      [-0.25, -0.02, 0.07, -0.06], [0.25, -0.02, -0.07, -0.06], [-0.06, 0.26, 0.085, 0]]
    let pick: { at: THREE.Vector3; cup: THREE.Vector3 } | null = null
    for (const [a, l, ca, cl] of tries) {
      const at = st.mid.clone().addScaledVector(c.along, a).addScaledVector(c.lay, l).setY(top + 0.002)
      const cup = c.along.clone().multiplyScalar(ca).addScaledVector(c.lay, cl)
      pick ??= { at, cup }
      if (clear(at, 0.04) && clear(at.clone().add(cup), 0.03)) { pick = { at, cup }; break }
    }
    sakeSpots.current.set(n, pick!)
    return pick!
  }
  const platerObj = useRef<THREE.Group | null>(null)
  /** how far the plater's drawn back off the work counter just now, eased (item 509) */
  const platerBack = useRef(0)
  const platerStack = useRef<THREE.Group>(null)
  /** the bowl of rice in the plater's hands (washing it, carrying it to the pot, and the cooked rice to the tub) */
  const platerBowl = useRef<THREE.Group>(null)
  /** the rice ball in the third cook's hands as they shape it (item 129) */
  const platerBall = useRef<THREE.Group>(null)
  /** the bundle of iron skewers the plater carries to the sink and back to the holder */
  const platerSkewers = useRef<THREE.Group>(null)
  /** the same in a server's hands (one at a time washes them) */
  const serverSkewers = useRef<THREE.Group>(null)
  /** the fire kept by the plater (bar.ts's FIRE_TEND): a handful of charcoal from the crate, a dipper of water from the bucket (and the
   * dipper stirring the miso soup) */
  const platerCoal = useRef<THREE.Group>(null)
  const platerDipper = useRef<THREE.Group>(null)
  /** when the plater last stirred the soup (seconds, performance clock) */
  const soupAt = useRef(0)
  /** and when they last grated daikon (item 392; not straight away as the shop opens) */
  const grateAt = useRef(performance.now() / 1000)
  /** the plates stacked at the plating place, and those standing in the dryer (drawn as many as there are) */
  const plateStack = useRef<THREE.Group>(null)
  const dryerPlates = useRef<THREE.Group>(null)
  /** the used sticks in the bin by the sink (as many as are in it, up to a handful drawn) */
  /** the plates standing in the draining basket by the sink (washed by hand while the washer was busy) */
  const drainPlates = useRef<THREE.Group>(null)
  /** how long each of the plating place's slots has been ready to go */
  const readyFor = useRef<number[]>(Array.from({ length: READY_SLOTS }, () => 0))
  const kitchen = useMemo(() => kitchenOf(counters), [counters])
  /** the money just paid, rising over the one who paid it (the owner's: +NT$ in green) */
  const [payFloats, setPayFloats] = useState<{ key: number; id: number; text: string }[]>([])
  useEffect(() => {
    ownerHome.current = null
    // (no server: the owner, from his place)
    waiters.current = ownerServes
      ? [{ phase: 'idle', t: 0, seat: -1, keys: [], run: null, path: [], len: 0, pos: ownerAt(), yaw: OWNER_YAW }]
      : servers.slice(0, homes.length).map((_, i) => ({ phase: 'idle', t: 0, seat: -1, keys: [], run: null, path: [], len: 0,
        pos: homes[i].at.clone(), yaw: homes[i].yaw }))
    SERVICE.servers = ownerServes ? 1 : Math.min(homes.length, servers.length)
    return () => {
      SERVICE.servers = 0
      SAKE.station = false
      ownerBack()
      SEATS_TAKEN.clear()
      CHOPS_UP.clear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servers.length, homes, ownerServes])
  /** a point in the bar's frame, in the shop's (where Roasting has the food) */
  const toShop = (v: THREE.Vector3) => v.clone().multiplyScalar(scale).add(offset ?? new THREE.Vector3())
  // where the plates are kept (the dish racks, game/plates) and washed (the sink): found in the room and taken into the bar's own frame each
  // time, as they can be moved by hand in edit mode (a bar on its own, with no room round it, has them at its two ends)
  const frame = useRef<THREE.Group>(null)
  /** a seat's plate's middle, in the world (where the customer there puts their chopsticks: FolkFigure's `plate`) */
  const plateWorldAt = useRef(new THREE.Vector3())
  const plateWorld = useCallback((seat: number) => {
    const f = frame.current, st = seats[seat]
    return f && st ? f.localToWorld(plateWorldAt.current.copy(st.plate).setY(top + 0.015)) : null
  }, [seats, top])
  /** where a seat's drink stands on the bar, in the bar's frame (its sake cup a little nearer the customer than the bottle) */
  const drinkSpot = useCallback((seat: number, cup: boolean) => {
    const st = seats[seat], c = counters[st.counter]
    return st.mid.clone().addScaledVector(c.along, PLACE.drink[0] + (cup ? CUP_SIDE : 0)).addScaledVector(c.lay, PLACE.drink[1] - (cup ? CUP_AHEAD : 0)).setY(top).toArray() as [number, number, number]
  }, [seats, counters, top])
  /** the same in the world (for the customer's hand to go to) */
  const drinkWorldAt = useRef(new THREE.Vector3())
  const drinkWorld = useCallback((seat: number, cup: boolean) => {
    const f = frame.current
    return f && seats[seat] ? f.localToWorld(drinkWorldAt.current.fromArray(drinkSpot(seat, cup))) : null
  }, [seats, drinkSpot])
  /** where a seat's bowl of miso soup stands, in the world (its foot), for their hands to go to (item 345) */
  const soupWorldAt = useRef(new THREE.Vector3())
  const soupSpot = useRef<(n: number) => THREE.Vector3>(() => new THREE.Vector3())
  const soupWorld = useCallback((seat: number) => {
    const f = frame.current
    return f && seats[seat] ? f.localToWorld(soupWorldAt.current.copy(soupSpot.current(seat))) : null
  }, [seats])
  const scene = useThree((st) => st.scene)
  const camera = useThree((st) => st.camera)
  /** (item 633) whether the sake station's stream ran last frame: its pour heard as it starts */
  const stationRan = useRef(false)
  const marks = useRef(new Map<string, THREE.Object3D | null>())
  /** when each mark was last looked for and not found: looked for again a second later (the owner, 2026-11-15: the dirty stack and the
   * draining basket's plates hung in the air over the cook table's end: their marks first looked for before the sink's model was in, the
   * miss was kept for good and they stood at the fallback all day) */
  const missed = useRef(new Map<string, number>())
  /** whether a mark is still in the scene (a piece rebuilt leaves its old one in a subtree no longer drawn: its place was a stale one) */
  /** a mark of the sink's: looked for only in the sink's own pieces (the sink and what stands on it, `sink`, `sink-*`), never by its name over
   * the whole room; and only if it's within a few metres of the sink (the owner, 2026-11-15: the dirty stack and a row of plates stood by the
   * cook table's lantern, over the fire bed, in their game; never found so here, but never to be possible: they wait for the sink instead) */
  const sinkMark = (name: string): THREE.Object3D | null => {
    let home: THREE.Object3D | null = null, hit: THREE.Object3D | null = null
    scene.traverse((q) => {
      const id = q.userData?.editId
      // (the sink's own place: the group it's set out in (Decor's look-sink); its piece's root is at the room's origin)
      if (id === 'sink') home = q.getObjectByName('look-sink') ?? q
      if (!hit && (id === 'sink' || (typeof id === 'string' && id.startsWith('sink-')))) hit = q.getObjectByName(name) ?? null
    })
    if (!hit || !home) return null
    const h = (home as THREE.Object3D).getWorldPosition(new THREE.Vector3())
    return (hit as THREE.Object3D).getWorldPosition(new THREE.Vector3()).distanceTo(h) < 3 ? hit : null
  }
  const inScene = (o: THREE.Object3D) => { let q: THREE.Object3D = o; while (q.parent) q = q.parent; return q === scene }
  /** when each mark found was last made sure of (twice a second at most: it's asked for many times a frame) */
  const sure = useRef(new Map<string, number>())
  const markOf = (name: string) => {
    let o = marks.current.get(name)
    const now = performance.now()
    let stale = false
    if (o && now - (sure.current.get(name) ?? 0) > 500) { sure.current.set(name, now); stale = !inScene(o) }
    if (o === undefined || stale || (o === null && now - (missed.current.get(name) ?? 0) > 1000)) {
      o = name.startsWith('Sink') ? sinkMark(name) : scene.getObjectByName(name) ?? null
      marks.current.set(name, o)
      if (o === null) missed.current.set(name, now)
    }
    return o
  }
  const inBar = (name: string, or: THREE.Vector3) => {
    const o = markOf(name), f = frame.current
    if (!o || !f) return or.clone()
    f.updateWorldMatrix(true, false)
    return f.worldToLocal(o.getWorldPosition(new THREE.Vector3()))
  }
  const endOf = (sd: number) => counters[0].at.clone().addScaledVector(ALONG, sd * (counters[0].length / 2 - 0.25)).addScaledVector(LAY, 0.11).setY(top)
  /** the step stool before the basin (item 221; Sink's StepStoolModel): its top's middle on the kitchen's floor (the bar's frame), its own
   * across and depth there, its half sizes and its height, looked at again a second at a time (it's moved in edit mode); none drawn, null */
  const stool = useRef<{ at: number; mid: THREE.Vector3; ax: THREE.Vector3; az: THREE.Vector3; hx: number; hz: number; h: number } | null>(null)
  const stoolAt = useRef(-1e9)
  const stoolNow = () => {
    const now = performance.now()
    if (now - stoolAt.current < 1000) return stool.current
    stoolAt.current = now
    const o = markOf('StepStoolTop'), f = frame.current
    if (!o || !f || !o.parent) return (stool.current = null)
    f.updateWorldMatrix(true, false)
    o.updateWorldMatrix(true, false)
    const m = f.matrixWorld.clone().invert().multiply(o.matrixWorld)
    const topAt = new THREE.Vector3().setFromMatrixPosition(m), foot = f.worldToLocal(o.parent.getWorldPosition(new THREE.Vector3()))
    const ex = new THREE.Vector3().setFromMatrixColumn(m, 0), ez = new THREE.Vector3().setFromMatrixColumn(m, 2)
    return (stool.current = { at: now, mid: topAt.clone().setY(0), ax: ex.clone().setY(0).normalize(), az: ez.clone().setY(0).normalize(),
      hx: ex.length() * STOOL_HALF[0], hz: ez.length() * STOOL_HALF[1], h: Math.max(0, topAt.y - foot.y) })
  }
  /** how high one standing there (the bar's frame, on the kitchen's floor) stands: up on the stool's top over it, a step's ramp at its edges
   * (stepping up onto it and down off it, not a jump) */
  const stoolY = (p: THREE.Vector3) => {
    const st = stoolNow()
    if (!st) return 0
    const d = p.clone().sub(st.mid).setY(0)
    const e = Math.max(Math.abs(d.dot(st.ax)) - (st.hx - STOOL_STEP), Math.abs(d.dot(st.az)) - (st.hz - STOOL_STEP)) / STOOL_STEP
    if (e >= 1) return 0
    const k = Math.min(1, Math.max(0, e))
    return st.h * (1 - k * k * (3 - 2 * k))
  }
  /** how high a figure stands for the stool, eased (the day's audit, item 221: at x2, a frame a tenth of a second, a server crossed its edge's
   * ramp in a frame and went 0.32 up in it, 46 times a day): toward what stoolY has there, no faster than a step's climb (STOOL_CLIMB), kept
   * on the figure */
  // (kept in a map of its own, not on the figure's userData: React hands a waiter's group a new userData each time the bar redraws, and the
  // second day's audit still saw seven of them go 0.32 up in a frame)
  const stoolLifts = useRef(new WeakMap<THREE.Object3D, number>())
  /** each customer's facing as shown and the one it's turning to (item 242: on their userData, lost each time the bar redrew) */
  const facings = useRef(new WeakMap<THREE.Object3D, { shown: number; want: number }>())
  const stoolLift = (o: THREE.Object3D, p: THREE.Vector3, dt: number) => {
    const want = stoolY(p)
    const was = stoolLifts.current.get(o)
    const now = was === undefined ? want : was + THREE.MathUtils.clamp(want - was, -STOOL_CLIMB * dt, STOOL_CLIMB * dt)
    stoolLifts.current.set(o, now)
    return now
  }
  /** a place before the sink brought onto the stool's top, clear of its edges (where those washing stand: up on it, item 221) */
  const ontoStool = (p: THREE.Vector3) => {
    const st = stoolNow()
    if (!st) return p
    const d = p.clone().sub(st.mid).setY(0)
    const x = THREE.MathUtils.clamp(d.dot(st.ax), -(st.hx - STOOL_STEP * 1.5), st.hx - STOOL_STEP * 1.5)
    const z = THREE.MathUtils.clamp(d.dot(st.az), -(st.hz - STOOL_STEP * 1.5), st.hz - STOOL_STEP * 1.5)
    return st.mid.clone().addScaledVector(st.ax, x).addScaledVector(st.az, z).setY(p.y)
  }
  /** where a plate's lifted off rack `i`, and where a server stands for it */
  const rackTop = (i: number) => inBar(`rack-top-${i}`, endOf(-1))
  const rackFront = (i: number) => inBar(`rack-front-${i}`, endOf(-1)).setY(0)
  /** the low rack by the cook table: where the plates are lifted off it, and where the plater stands at it (looked for afresh: it's moved by hand) */
  const lowTop = () => { marks.current.delete('lowrack-top'); return inBar('lowrack-top', endOf(-1)) }
  const lowFront = () => { marks.current.delete('lowrack-front'); return inBar('lowrack-front', endOf(-1)).setY(0) }
  /** the rack a plate comes off now, and goes back onto: the count is shown across the two, the second's emptying first */
  const rackNow = (n = PLATE_RACK.n) => (n > PER_RACK ? 1 : 0)
  /** the k-th plate up the dirty stack in the sink's basin (they're stacked there a little smaller: the customers' plates are drawn big, the
   * basin's a real sink's size) */
  const dirtyAt = (k: number) => {
    const c = onCounter.current
    if (k < c) return counterAt(k)
    return inBar('SinkBasinFloor', endOf(1)).add(new THREE.Vector3(0, 0.004 + sinkStackUp(c, k), 0))
  }
  /**
   * (item 685, the Tester window's: with the servers' stack in the basin grown to ten, the plate washed where it was taken off its top was
   * inside it, clean and bobbing still under its top; a press on it found the stack's first and took a dirty one) how low a plate of the
   * player's (`kind`) lies at (lx, lz) in the basin, the bar's frame: on the basin's floor, or, over the servers' stack there (its plates within
   * two radii of it), on that stack's top, as one more on it
   */
  const basinBase = (floor: THREE.Vector3, lx: number, lz: number, kind: PlateKind) => {
    const n = Math.min(dirty.current, SINK_SHOWN), c = onCounter.current
    if (n <= c || Math.hypot(floor.x - lx, floor.z - lz) >= SINK_PLATE_R.v * 1.9) return floor.y + 0.012
    const K = SINK.kinds
    return Math.max(floor.y + 0.012, floor.y + 0.004 + sinkStackUp(c, n - 1) + (K[n - 1] === 'long' || kind === 'long' ? STACK_GAP : NEST_GAP) * IN_SINK)
  }
  /** (item 675) the sink's top's height (the bar's frame), looked at again once a second (it's moved in edit mode); NaN with no sink in */
  const sinkTopMemo = useRef({ y: NaN, t: -1e9 })
  const sinkTopBar = () => {
    const c = sinkTopMemo.current, now = performance.now()
    if (now - c.t > 1000) {
      c.t = now
      // (its own slab's box, not with what stands on it: with the tap's in it, it came out at the tap's height and their hands went up to it)
      const top = markOf('SinkTop') as THREE.Mesh | null, f = frame.current
      if (top && f) {
        f.updateWorldMatrix(true, false)
        top.updateWorldMatrix(true, false)
        if (top.isMesh) { if (!top.geometry.boundingBox) top.geometry.computeBoundingBox(); LIFT_BOX.copy(top.geometry.boundingBox!).applyMatrix4(top.matrixWorld) }
        else LIFT_BOX.setFromObject(top)
        c.y = f.worldToLocal(LIFT_P.copy(LIFT_BOX.max)).y
      } else c.y = NaN
    }
    return c.y
  }
  /** how far up the k-th of the sink's dirty plates stands over the first of its stack (`from`, the counter's 0, the basin's the first in
   * it): a round one on a round one nested into it (NEST_GAP), a long one on or under any other on its rim (STACK_GAP) (item 358) */
  const sinkStackUp = (from: number, k: number) => {
    let y = 0
    const K = SINK.kinds
    for (let i = from + 1; i <= Math.min(k, from + SINK_SHOWN - 1); i++) y += K[i] === 'long' || K[i - 1] === 'long' ? STACK_GAP : NEST_GAP
    return y * IN_SINK
  }
  /** the k-th plate up the stack waiting on the counter (item 82, the owner's circle): in front of the draining basket toward the counter's
   * front, a little toward its far end from the basin, on the counter's top (found from the sink's own marks, again now and then: it's moved
   * by hand in edit mode) */
  const counterAt = (k: number) => {
    const now = performance.now()
    if (!counterSpot.current || now - counterSpot.current.t > 2000) {
      const b = markOf('SinkBasket'), fr = markOf('SinkFront'), top = markOf('SinkTop'), f = frame.current
      if (!b || !fr || !top || !f) return inBar('SinkBasinFloor', endOf(1))
      const bw = b.getWorldPosition(new THREE.Vector3()), front = fr.getWorldPosition(new THREE.Vector3()).sub(bw).setY(0).normalize()
      const side = new THREE.Vector3(front.z, 0, -front.x)
      let y = new THREE.Box3().setFromObject(top).max.y
      f.updateWorldMatrix(true, false)
      let at = bw.addScaledVector(front, 0.52).addScaledVector(side, 0.25).setY(y)
      // (worked out in the counter top's own frame (the owner's, 2026-11-15: the stack hung half off the counter's corner, over the palm
      // brush's dish, the sink moved since those offsets were measured): in the clear space in front of the draining basket, between its
      // front edge and the counter's, a plate's width and a centimetre in from every edge)
      const tm = top as THREE.Mesh
      if (tm.isMesh) {
        if (!tm.geometry.boundingBox) tm.geometry.computeBoundingBox()
        const tb = tm.geometry.boundingBox!, ts = tm.getWorldScale(new THREE.Vector3()).x, fs = f.getWorldScale(new THREE.Vector3()).x
        // (a plate's own reach measured off one of the drawn ones (its rim reaches past PLATE_R), and a centimetre)
        const one = sinkPlates.current.find((q) => q)
        const reach = one ? (() => { const sz = new THREE.Box3().setFromObject(one).getSize(new THREE.Vector3()); return Math.max(sz.x, sz.z) / 2 })() : PLATE_R * IN_SINK * fs * 1.2
        const r = (reach + 0.01) / ts
        const bb = new THREE.Box3()
        const wb = new THREE.Box3().setFromObject(b)
        for (const cx of [wb.min.x, wb.max.x]) for (const cy of [wb.min.y, wb.max.y]) for (const cz of [wb.min.z, wb.max.z]) bb.expandByPoint(tm.worldToLocal(new THREE.Vector3(cx, cy, cz)))
        // (the basket against the back (-z) or the front: the clear strip on the other side of it; along it, its far end's half)
        const back = (bb.min.z + bb.max.z) / 2 < (tb.min.z + tb.max.z) / 2
        const z = back ? (bb.max.z + tb.max.z) / 2 : (bb.min.z + tb.min.z) / 2
        // (along it, the basket's own middle (the owner, 2026-11-15, circled: right in front of it, not off at the counter's end))
        const x = (bb.min.x + bb.max.x) / 2
        const l = new THREE.Vector3(THREE.MathUtils.clamp(x, tb.min.x + r, tb.max.x - r), 0, THREE.MathUtils.clamp(z, tb.min.z + r, tb.max.z - r))
        at = tm.localToWorld(l).setY(y)
        // (on the counter's top where the stack stands, found by a ray down onto it alone (item 358, the owner's 「漂浮?」: its box's top
        // was the splashback's along its back edge, the stack 10.5 cm over the counter, in the air))
        SURFACE_RAY.set(TOP_FROM.set(at.x, y + 0.5, at.z), DOWN_Y)
        const hit = SURFACE_RAY.intersectObject(tm, false, SURFACE_HITS)
        if (hit.length) at.y = y = hit[0].point.y
        SURFACE_HITS.length = 0
      }
      counterSpot.current = { at: f.worldToLocal(at), t: now }
    }
    return counterSpot.current.at.clone().add(new THREE.Vector3(0, 0.002 + sinkStackUp(0, k), 0))
  }
  /** a place in the bar's frame as the first counter's (along it, across it): the kitchen's floor and all that stands on it lie square there */
  const flat = (v: THREE.Vector3): [number, number] => { const c0 = counters[0], d = v.clone().sub(c0.at); return [d.dot(c0.along), d.dot(c0.lay)] }
  /** what stands on the kitchen's floor, as rectangles in that frame, each grown by room to pass: the cook's table, the rice tub, the freezer,
   * the racks and the sink, from where their shapes really reach (worked out once a day: nothing's moved while the shop's open) */
  const blocksMade = useRef<Rect[] | null>(null)
  /** which piece each of them is (the cook's table 'cooktable'), for the paths' map (item 168) */
  const blockIds = useRef<string[]>([])
  const kitchenBlocks = (): Rect[] => {
    const f = frame.current
    if (blocksMade.current) return blocksMade.current
    if (!f) return []
    f.updateWorldMatrix(true, false)
    const toBar = new THREE.Matrix4().copy(f.matrixWorld).invert()
    const out: Rect[] = []
    const ids: string[] = []
    const grown = (fl: [number, number][], id = '', room = PASS_ROOM) => ids.push(id) && out.push({ x0: Math.min(...fl.map((q) => q[0])) - room, z0: Math.min(...fl.map((q) => q[1])) - room,
      x1: Math.max(...fl.map((q) => q[0])) + room, z1: Math.max(...fl.map((q) => q[1])) + room })
    const v = new THREE.Vector3(), m4 = new THREE.Matrix4()
    /** a thing's footprint on the kitchen's floor, from its meshes' points (every third) */
    const footOf = (o: THREE.Object3D): [number, number][] | null => {
      let a0 = Infinity, a1 = -Infinity, l0 = Infinity, l1 = -Infinity
      o.updateWorldMatrix(true, true)
      o.traverse((q) => {
        const pos = (q as THREE.Mesh).isMesh ? (q as THREE.Mesh).geometry.attributes.position : null
        if (!pos) return
        m4.multiplyMatrices(toBar, q.matrixWorld)
        for (let i = 0; i < pos.count; i += 3) {
          const [a, l] = flat(v.fromBufferAttribute(pos, i).applyMatrix4(m4))
          a0 = Math.min(a0, a); a1 = Math.max(a1, a); l0 = Math.min(l0, l); l1 = Math.max(l1, l)
        }
      })
      return a0 < a1 ? [[a0, l0], [a1, l1]] : null
    }
    scene.traverse((o) => {
      // (and the keep-clear patches put down in edit mode (item 168))
      const id = o.userData?.editId
      if (!KITCHEN_BLOCKS.has(id) && !(typeof id === 'string' && id.startsWith('pathzone-'))) return
      const fl = footOf(o)
      if (fl) grown(fl, o.userData.editId as string)
    })
    for (const name of HEAD_HIGH) {
      const o = scene.getObjectByName(name), fl = o ? footOf(o) : null
      if (fl) grown(fl, name, HEAD_ROOM)
    }
    for (const name of NAMED_BLOCKS) {
      const o = scene.getObjectByName(name), fl = o ? footOf(o) : null
      if (fl) grown(fl, name)
    }
    const t0 = markOf('cook-table-c0'), t1 = markOf('cook-table-c1')
    if (t0 && t1) grown([flat(f.worldToLocal(t0.getWorldPosition(new THREE.Vector3()))), flat(f.worldToLocal(t1.getWorldPosition(new THREE.Vector3())))], 'cooktable')
    blocksMade.current = out
    blockIds.current = ids
    return out
  }
  /** where the waypoints set by hand are counted from (item 189): the kitchen's middle (not the keep-clear patches' first place, which goes
   * with the serving counter: a waypoint stays where it was put) */
  const viaHome = useMemo(() => {
    const k = kitchenOf(counters), c0 = counters[0]
    return c0.at.clone().addScaledVector(c0.along, (k.along[0] + k.along[1]) / 2).addScaledVector(c0.lay, (k.lay[0] + k.lay[1]) / 2).setY(0)
  }, [counters])
  /** the staff's places a way's ends are known by (item 189): each server's own place, the owner's, the sink, the racks, the plating place's
   * two sides; looked at afresh at most twice a second */
  const placesMemo = useRef({ at: -1e9, list: [] as { key: string; at: THREE.Vector3 }[] })
  const placesNow = () => {
    const now = performance.now()
    if (now - placesMemo.current.at > 500) {
      const pl = platingOf()
      placesMemo.current = { at: now, list: [...homes.map((h, i) => ({ key: `server-${i}`, at: h.at.clone().setY(0) })), { key: 'owner', at: ownerAt() },
        { key: 'sink', at: sinkFront() }, { key: 'rack-0', at: rackFront(0) }, { key: 'rack-1', at: rackFront(1) },
        { key: 'plate-out', at: pl.out.clone().setY(0) }, { key: 'plate-in', at: pl.in.clone().setY(0) }] }
    }
    return placesMemo.current.list
  }
  /** the waypoints set by hand for the way between the places `from` and `to` stand at (each within a step of one), nearest `from` first; none
   * for a way between any other two points */
  const viaStops = (from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3[] => {
    const vias = getEdit().vias
    if (!Object.keys(vias).length) return []
    const places = placesNow()
    const near = (p: THREE.Vector3) => {
      let best: string | null = null, d = 0.35
      for (const q of places) { const e = Math.hypot(q.at.x - p.x, q.at.z - p.z); if (e < d) { d = e; best = q.key } }
      return best
    }
    const a = near(from), b = near(to)
    const ids = a && b && a !== b ? vias[`${a}>${b}`] ?? vias[`${b}>${a}`] : undefined
    if (!ids?.length) return []
    const dx = to.x - from.x, dz = to.z - from.z
    const along = (p: THREE.Vector3) => (p.x - from.x) * dx + (p.z - from.z) * dz
    return ids.map((id) => { const o = offsetOf(id); return viaHome.clone().add(new THREE.Vector3(o[0], 0, o[2])) }).sort((p, q) => along(p) - along(q))
  }
  /** a server's way across the kitchen's floor, round the cook's table and all that stands on it (game/kitchenPath); one between two of the
   * staff's places given waypoints by hand in edit mode goes through them in turn (item 189), each leg still round what's in the way */
  const kitchenRoute = (from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3[] => {
    const c0 = counters[0], k = kitchenOf(counters)
    const back = ([a, l]: [number, number]) => c0.at.clone().addScaledVector(c0.along, a).addScaledVector(c0.lay, l).setY(0)
    const area = { x0: k.along[0], z0: k.lay[0], x1: k.along[1], z1: k.lay[1] }, blocks = kitchenBlocks()
    // (its two ends, where one's set inside a piece itself, moved out to stand up against it (game/kitchenPath's outOfPieces, item 333): no
    // way walks into or out of the middle of the warmer, the low rack or the cook table)
    const end = (v: THREE.Vector3) => { const q = flat(v), o = outOfPieces(q, blocks, PASS_ROOM); return o === q ? v : back(o) }
    const start = end(from)
    const stops = [start, ...viaStops(from, to), end(to)]
    let out: THREE.Vector3[] = []
    for (let i = 1; i < stops.length; i++) {
      // (no way round what's there even squeezed past it: the one through the least of it, not the straight line through it all (item 670,
      // the owner's 「注意一下動線，別讓腳色穿越」: a sack put down across a way, the servers' ways went straight through the warmer and the
      // serving counter))
      const a = flat(stops[i - 1]), b = flat(stops[i])
      let way = kitchenPath(a, b, area, blocks)
      if (!way) { way = kitchenPathThrough(a, b, area, blocks); if (import.meta.env.DEV) KITCHEN_THROUGH.n++ }
      const leg = way.map(back)
      out = i === 1 ? leg : [...out, ...leg.slice(1)]
    }
    // (and from just where they stand: one at their place in a piece's reach (the third cook in his bay at the cook table) moved out to the
    // clear floor at the way's start, they set off from there, 0.7 away, a jump each time (item 411))
    if (start !== from && out.length && out[0].distanceTo(from.clone().setY(0)) > 0.02) out.unshift(from.clone().setY(0))
    return out
  }
  /** the paths' map (item 168, PathMap) filled: what's in the way, looked at afresh (it may have been moved in edit mode); the staff's usual
   * ways (from each one's place, and the owner's, to the sink, the racks and the plating place), worked out again only when that's changed;
   * the ways being walked; the customers' from the door to each seat */
  const pathsMap = useRef({ at: 0, sig: '', staff: [] as PathRoute[] })
  /** (item 659) the owner's mover, found once */
  const bossMover = useRef<THREE.Object3D | null>(null)
  /** (item 659 d's next) how long each server's been held back behind the owner (their pace's seconds) */
  const heldFor = useRef<number[]>([])
  /** how much of their step a server at `p` going `dir` (the bar's frame) holds back for the owner just ahead on their line (0 .. 1) */
  const serverHold = (p: THREE.Vector3, dir: THREE.Vector3, wi: number, adv: number) => {
    const b = bossMover.current ?? (bossMover.current = scene.getObjectByName('BossFollow') ?? null)
    if (!SERVER_HOLD.on || !b?.parent || !b.visible || !frame.current) return 0
    frame.current.worldToLocal(b.getWorldPosition(SERVER_HOLD_AT))
    const rx = SERVER_HOLD_AT.x - p.x, rz = SERVER_HOLD_AT.z - p.z
    const along = rx * dir.x + rz * dir.z, side = Math.abs(rx * dir.z - rz * dir.x)
    if (along <= 0 || along > SERVER_HOLD_AHEAD || side > SERVER_HOLD_SIDE) { heldFor.current[wi] = 0; return 0 }
    const was = heldFor.current[wi] ?? 0
    if (was > SERVER_HOLD_MOST) return 0
    heldFor.current[wi] = was + adv
    return Math.max(0, Math.min(1, 1 - (along - SERVER_HOLD_STOP) / (SERVER_HOLD_AHEAD - SERVER_HOLD_STOP)))
  }
  /** (item 629) where the map's ways go through something at a body's middle height (bar's FLOOR_CHECK, the shop's floor map, made with
   * the editor's map of the ways shown): along each way every 3 cm, but its first and last 12 (where one stands at a thing to use it) and
   * a customer's last step (onto their stool); each stretch of it in something, and the piece it's in (at its middle, or where it runs in
   * or out: the editor's id for it, '' for a wall or a step) */
  const crossingsOf = (routes: PathRoute[]): PathCross[] => {
    const check = FLOOR_CHECK.inSomething, whose = FLOOR_CHECK.pieceAt
    if (!check) return []
    const out: PathCross[] = []
    for (const r of routes) {
      const pts = r.kind === 'guest' ? r.pts.slice(0, -1) : r.pts
      if (pts.length < 2) continue
      const end = pathLength(pts) - 0.12
      let d0 = -1, d1 = -1
      // (a stretch three looks long or more: a way's corner cut across a thing's edge isn't through it)
      const close = () => {
        if (d1 - d0 > 0.05) {
          const a = alongPath(pts, d0).p.setY(0), b = alongPath(pts, d1).p.setY(0), mid = alongPath(pts, (d0 + d1) / 2).p.setY(0)
          out.push({ who: r.who, key: r.key ?? r.to, a, b, piece: whose?.(mid) || whose?.(a) || whose?.(b) || '' })
        }
        d0 = d1 = -1
      }
      for (let d = 0.12; d <= end + 1e-6; d += 0.03) {
        if (check(alongPath(pts, d).p.setY(0))) { if (d0 < 0) d0 = d; d1 = d }
        else if (d0 >= 0) close()
      }
      if (d0 >= 0) close()
    }
    return out
  }
  /** when the serving counter's marks were last read */
  const serveRead = useRef(0)
  const mapPaths = (now: number) => {
    if (now - pathsMap.current.at < 500) return
    pathsMap.current.at = now
    blocksMade.current = null
    const blocks = kitchenBlocks()
    const c0 = counters[0]
    const back = (a: number, l: number) => c0.at.clone().addScaledVector(c0.along, a).addScaledVector(c0.lay, l).setY(0)
    PATH_MAP.blocks = blocks.map((r, i) => ({ id: blockIds.current[i] ?? '', pts: [back(r.x0, r.z0), back(r.x1, r.z0), back(r.x1, r.z1), back(r.x0, r.z1)] }))
    // (and the waypoints set by hand, where each stands: a way given one, or one moved, is worked out again (item 189))
    const vias = getEdit().vias
    const sig = blocks.map((r) => [r.x0, r.z0, r.x1, r.z1].map((v) => v.toFixed(2)).join()).join('|') + '#'
      + Object.entries(vias).map(([key, ids]) => `${key}:${ids.map((id) => offsetOf(id).map((v) => v.toFixed(2)).join()).join(';')}`).join('|')
    if (sig !== pathsMap.current.sig) {
      pathsMap.current.sig = sig
      placesMemo.current.at = -1e9
      // (and where each server stands looked at again with it: a piece moved onto one's place (item 670))
      clearHomes.current.clear()
      const pl = platingOf()
      // (each named: whose, from where to where (item 189))
      // (from where each server really stands: their place stepped clear of what's on the floor (clearHome), as they walk from it; the place
      // as set (under the warmer, item 333) drew a way through it that nobody walked)
      const from = [...homes.map((h, i) => ({ who: `server-${i}`, at: (clearHome(i) ?? h).at })), { who: 'owner', at: ownerAt() }]
      const to = [{ key: 'sink', at: sinkFront() }, { key: 'rack-0', at: rackFront(0) }, { key: 'rack-1', at: rackFront(1) }, { key: 'plate-out', at: pl.out }, { key: 'plate-in', at: pl.in }]
      pathsMap.current.staff = from.flatMap((a) => to.map((b): PathRoute => ({ kind: 'staff', who: a.who, from: a.who, to: b.key, key: `${a.who}>${b.key}`, pts: kitchenRoute(a.at, b.at) })))
    }
    const live: PathRoute[] = []
    const walking = (who: string, pts: THREE.Vector3[]) => { if (pts.length > 1) live.push({ kind: 'live', who, from: '', to: '', pts }) }
    waiters.current.forEach((w, i) => { if (w.phase !== 'idle') walking(ownerServes ? 'owner' : `server-${i}`, w.path) })
    if (platerRun.current.phase !== 'idle') walking('plater', platerRun.current.path)
    if (bossWash.current) walking('owner', bossWash.current.path)
    const guestWays = seats.map((st, n): PathRoute => ({ kind: 'guest', who: 'guest', from: 'door', to: `seat-${n}`, pts: pathTo(counters, st) }))
    PATH_MAP.routes = [...pathsMap.current.staff, ...live, ...guestWays]
    // (item 629, the owner's 「動線看一下，編輯器應表明避免穿越傢俱」: each way's stretches that go through something at a body's middle height,
    // and what they go through, for the map to draw red and name)
    // (kept as they were while the floor's check is made again (just after a piece is moved): not gone for a moment and back, their tags with
    // them (the Tester window's))
    const tc = performance.now()
    if (FLOOR_CHECK.inSomething) PATH_MAP.cross = crossingsOf(PATH_MAP.routes)
    if (import.meta.env.DEV) Object.assign(window, { __crossMs: performance.now() - tc })
    // (the places named on the floor: the staff's own and where they go, the door, each seat at its way's end)
    PATH_MAP.places = [...placesNow(), ...(guestWays.length ? [{ key: 'door', at: guestWays[0].pts[0] }] : []), ...guestWays.map((g) => ({ key: g.to, at: g.pts[g.pts.length - 1] }))]
    PATH_MAP.home = viaHome
    PATH_MAP.v++
  }
  /**
   * The serving counter's place (item 167, the owner's red box): in the corridor between the cook table and the freezer, its middle midway
   * across between the two (as they really reach, not the room left round them) and along at the freezer's middle, square to the cook table;
   * measured once both are found (not a number set blind), then kept (moved by hand in edit mode, it's the edit's)
   */
  const [servePlace, setServePlace] = useState<{ at: THREE.Vector3; yaw: number } | null>(null)
  /** the keep-clear patches (item 168), and where a new one's first put down: the serving counter's side, toward the cook table, else the
   * kitchen's middle */
  const zoneHome = useMemo(() => {
    if (servePlace) return servePlace.at.clone().add(new THREE.Vector3(Math.sin(servePlace.yaw), 0, Math.cos(servePlace.yaw)).multiplyScalar(0.45))
    const k = kitchenOf(counters), c0 = counters[0]
    return c0.at.clone().addScaledVector(c0.along, (k.along[0] + k.along[1]) / 2).addScaledVector(c0.lay, (k.lay[0] + k.lay[1]) / 2).setY(0)
  }, [servePlace, counters])
  /** when it was last measured, and how many times running it's come out the same */
  const placeTry = useRef({ at: 0, same: 0 })
  const placeServe = () => {
    // (measured once a second till it's come out the same twice (the freezer's own place is put on it a moment after the page comes
    // up: measured at once, the counter stood by the sink, a quarter under the floor), and all the while in edit mode, where they may move)
    const now = performance.now()
    if (now - placeTry.current.at < 1000 || (placeTry.current.same >= 2 && !getEdit().on)) return
    placeTry.current.at = now
    blocksMade.current = null
    const blocks = kitchenBlocks(), ids = blockIds.current
    const t = blocks[ids.indexOf('cooktable')], fz = blocks[ids.indexOf('freezer')]
    // (not both found yet: looked at again in a second, not kept so for the day)
    if (!t || !fz) { blocksMade.current = null; return }
    // (the floor it stands on: the dais the freezer stands on, as high as the freezer's foot)
    let fo: THREE.Object3D | null = null
    scene.traverse((o) => { if (!fo && o.userData?.editId === 'freezer') fo = o })
    const f = frame.current
    if (!fo || !f) return
    const foot = f.worldToLocal(new THREE.Box3().setFromObject(fo).min).y
    const c0 = counters[0]
    // (which side of the cook table the freezer's on, across it: the corridor's between the table's edge and the freezer's front)
    const tableEdge = fz.z0 > t.z1 ? t.z1 - PASS_ROOM : t.z0 + PASS_ROOM, freezerFront = fz.z0 > t.z1 ? fz.z0 + PASS_ROOM : fz.z1 - PASS_ROOM
    const a = (fz.x0 + fz.x1) / 2, l = (tableEdge + freezerFront) / 2
    const at = c0.at.clone().addScaledVector(c0.along, a).addScaledVector(c0.lay, l).setY(foot)
    // (its long side along the table, its front (+z) toward the cook table: the side the servers come by)
    const toTable = c0.lay.clone().multiplyScalar(fz.z0 > t.z1 ? -1 : 1)
    const yaw = Math.atan2(toTable.x, toTable.z)
    if (servePlace && servePlace.at.distanceTo(at) < 0.005 && Math.abs(servePlace.yaw - yaw) < 1e-3) { placeTry.current.same++; return }
    placeTry.current.same = 0
    setServePlace({ at, yaw })
  }
  // (the crew's way home goes round the same things: Roasting asks for it as they leave)
  useEffect(() => {
    KITCHEN_ROUTE.route = (from, to) => kitchenRoute(from, to)
    // (and where to stand clear of it all: the third cook's place was under the warming counter put where he stood)
    KITCHEN_ROUTE.clear = (at) => {
      const blocks = kitchenBlocks()
      if (!blocks.length) return at.clone()
      const [a, l] = standClear(flat(at), blocks), c0 = counters[0]
      return c0.at.clone().addScaledVector(c0.along, a).addScaledVector(c0.lay, l).setY(at.y)
    }
    // (and how far a place is into it, asked in the kitchen's own frame (item 802: the owner walked by the keys). Not by `clear` giving the
    // place back: turned back into the bar's frame it missed the place itself by 0.4% of its way from the first counter's middle (up to
    // 0.02), the counters' axes not quite a unit long (0.81, 0.59), and no place was ever clear)
    KITCHEN_ROUTE.inside = (at) => {
      const [a, l] = flat(at)
      let deep = 0
      for (const r of kitchenBlocks()) if (a > r.x0 && a < r.x1 && l > r.z0 && l < r.z1) deep = Math.max(deep, Math.min(a - r.x0, r.x1 - a, l - r.z0, r.z1 - l))
      return deep
    }
    return () => { KITCHEN_ROUTE.route = null; KITCHEN_ROUTE.clear = null; KITCHEN_ROUTE.inside = null }
  })

  // the plates: those out at the seats (or on their way), and the two stacks
  const [, setTick] = useState(0)
  const redraw = () => setTick((n) => n + 1)
  /** the places with soy in their dish just now, a bit a seat (seatSoys) */
  const soyMask = useRef(0)
  const runs = useRef<PlateRun[]>([])
  if (import.meta.env.DEV && typeof window !== 'undefined') Object.assign(window, { __plateRuns: runs })
  /** the plating place's carrier dishes (one a slot) */
  const carriers = useRef<(THREE.Group | null)[]>([])
  const runSeq = useRef(0)
  const runObjs = useRef(new Map<number, THREE.Group>())
  /** the dirty plates in the sink, and the washing (time since the last plate came out; null while the tap's off) */
  const dirty = useRef(0)
  /** how many of those are waiting on the counter in front of the draining basket, not in the basin (the day's first, item 82): the bottom of
   * the dirty stack, so the basin's are washed first */
  const onCounter = useRef(0)
  const counterSpot = useRef<{ at: THREE.Vector3; t: number } | null>(null)
  /** each sink plate's group, the bottom one first (its smear faded as it soaks) */
  const sinkPlates = useRef<(THREE.Group | null)[]>([])
  /** when the sink's plates were last put where the sink is (item 113) */
  const sinkPlaced = useRef(0)
  const wash = useRef<number | null>(null)
  /** customers sat down waiting for a plate: the racks were bare (they're being washed) */
  const waiting = useRef<{ seat: number; guest: number }[]>([])
  /** (no servers) a plate sent over from the racks to the seat, if there's one on them */
  const serve = (seat: number, guest: number) => {
    const ri = rackNow()
    if (PLATE_RACK.n <= 0) {
      waiting.current.push({ seat, guest })
      return
    }
    PLATE_RACK.n -= 1
    runs.current.push({ key: ++runSeq.current, seat, guest, phase: 'serve', t: 0, from: rackTop(ri), kind: kindFor(guest) })
    redraw()
  }
  /** this customer's plate is cleared away (after a moment); one still waiting for a plate needn't get one */
  const clear = (guest: number) => {
    waiting.current = waiting.current.filter((w) => w.guest !== guest)
    const r = runs.current.find((x) => x.guest === guest && (x.phase === 'set' || x.phase === 'serve'))
    if (r) leftDirty(r)
    // (done eating: a few tissues from their place's box (game/tissues); none left, they mind it (the shop's rating) and say so)
    const at = shownRef.current.find((x) => x.id === guest)?.seat ?? r?.seat
    if (at !== undefined && at >= 0) {
      const t = takeSheets(tissuesAt(at), sheetsFor(guest))
      setTissues(at, t.box)
      if (t.short) { gripe(guest, 'tissue'); onSay?.('guest', LINES[lang].noTissue(guest), guest) }
      // (one of them crumpled up and left by their plate, on its right (the owner's), for the server who clears it)
      if (r && tissuesAt(at) < BOX_SHEETS && !t.short) {
        const st = seats[r.seat], c = counters[st.counter]
        r.tissue = st.mid.clone().addScaledVector(c.along, -0.13).addScaledVector(c.lay, -0.06).setY(top).sub(plateAt(r.seat)).toArray() as [number, number, number]
      }
    }
  }
  /** a plate done with: left at the seat for a server to clear (the owner's: nobody's plates fly), or, with none, away to the sink by itself */
  const leftDirty = (r: PlateRun) => {
    r.sticks = SEAT_STICKS.get(r.seat) ?? 0
    SEAT_STICKS.delete(r.seat)
    r.bones = SEAT_BONES.get(r.seat) ?? 0
    SEAT_BONES.delete(r.seat)
    // (dirty by what was eaten off it: a skewer's stick or a fish's bones for each, at least the one dish)
    r.dirt = plateDirt(Math.max(1, r.sticks + r.bones))
    // (where their drink stood, from the plate: the glass is left there till the plate's taken, then rides on it)
    if (shownRef.current.find((x) => x.id === r.guest)?.drink) {
      const st = seats[r.seat], c = counters[st.counter]
      r.glass = st.mid.clone().addScaledVector(c.along, PLACE.drink[0]).addScaledVector(c.lay, PLACE.drink[1]).setY(top).sub(plateAt(r.seat)).toArray() as [number, number, number]
      const who = shownRef.current.find((x) => x.id === r.guest)!
      r.drink = who.drink as DrinkId
      r.level = 1 - (who.drunk ?? 0)
    } else { r.glass = undefined; r.drink = undefined }
    if (waiters.current.length) { r.phase = 'dirty'; r.t = 0 } else { r.phase = 'clear'; r.t = -CLEAR_DELAY }
  }
  /** (item 600) a plate's customer still sat at it (finishing their rice or soup, a tissue to their mouth): it's left till they're up and gone,
   * cleared then with their bowls and chopsticks in one trip (taken while they sat, the chopsticks after them were a second trip, and the
   * place stood with a used pair on it meanwhile) */
  const stillAt = (r: PlateRun) => r.guest >= 0 && shownRef.current.some((x) => x.id === r.guest && x.seat === r.seat && x.phase !== 'leave' && !x.leaving)
  /** (item 600) a place whose pair went with what was cleared laid again with a clean one from the cabinets; none clean, left bare (and kept
   * from being laid again here by someone clearing it: its pair's on their tray) */
  const relay = (seat: number) => {
    const l = layPlace(WARE.cab)
    if (l.laid) { WARE.cab = l.cab; CHOPS_OFF.delete(seat) } else CHOPS_OFF.add(seat)
    WARE.ver++
  }
  /** (item 600) the places left bare for want of a clean pair laid now there are some again (the washed ones just put away): any not being
   * cleared just now */
  const relayBare = () => {
    for (const n of [...CHOPS_OFF]) {
      if (waiters.current.some((x) => x.phase === 'clearTake' && x.seat === n)) continue
      if (WARE.cab.chops <= 0) break
      relay(n)
    }
  }
  /** (item 600) a place cleared and wiped down is laid again before the server goes on: a clean pair (out of the cabinets: the box on their
   * tray) set on its rest over LAY_S; none clean, it's left bare till there is one. True once that's done, or there was none to lay */
  const laidAgain = (w: { seat: number; t: number; lay?: number; layT?: number }) => {
    if (w.lay === undefined) {
      w.lay = -1
      if (w.seat >= 0 && CHOPS_OFF.has(w.seat)) {
        const l = layPlace(WARE.cab)
        if (l.laid) { WARE.cab = l.cab; WARE.ver++; w.lay = w.seat; w.layT = w.t }
      }
    }
    if (w.lay >= 0) {
      if (w.t - (w.layT ?? 0) < LAY_S) return false
      CHOPS_OFF.delete(w.lay)
    }
    w.lay = undefined
    return true
  }
  /** (item 600) customers' bowls off the queue that weren't set down at their place (their customer gone meanwhile): put by, into the sink
   * with the rest to be washed (the food in them binned), as their plates are; `keep` those that stay in the queue, `set` those set down */
  const dropBowls = (keep: (b: PassBowls) => boolean, set?: (b: PassBowls) => boolean) => {
    let n = 0
    for (const b of passQ.current) if (!keep(b) && !set?.(b)) { WARE.sink = addWares(WARE.sink, { rice: b.rice ? 1 : 0, soup: b.soup ? 1 : 0, renge: b.soup ? 1 : 0 }); n++ }
    if (n) WARE.ver++
    passQ.current = passQ.current.filter(keep)
  }
  /** (every second) the plates out at seats looked over for any left where nobody sits */
  const sweep = useRef(0)
  // (stepped back off the sink's front (item 590): stood at its mark, what they held before them (their tray, their hands as they came up to
  // it) went through the curtain under the counter into the cabinet, 0.13 to 0.29 m; still on the step stool, the basin a lean away)
  const sinkFront = () => {
    const at = inBar('SinkFront', endOf(1)).setY(0), mid = inBar('SinkTop', at).setY(0)
    const out = at.clone().sub(mid)
    if (out.lengthSq() > 1e-6) at.addScaledVector(out.normalize(), SINK_BACK)
    return ontoStool(at)
  }
  /**
   * The owner going to wash the stack of dirty plates left on the sink's counter (game/sinkPile, item 103, the owner's, 2026-11-14): nobody
   * washes it but the player, till the third day; then, a few seconds into the day, if it's still there, he says so (over his head and in
   * the log) and walks from the fire to the sink, scrubs it plate by plate into the draining basket, and walks back. Out serving himself (no
   * server hired), it's simply his to wash as a server's chore from then; out on another errand, he goes once he's back.
   */
  const bossWash = useRef<{ phase: 'go' | 'wash' | 'back'; path: THREE.Vector3[]; len: number; t: number; pos: THREE.Vector3; yaw: number
    /** sent by the player (item 166): every dirty plate washed, a plate's worth of the liquid each, not only the counter's stack; and where he
     * came from, to go back to */
    manual?: boolean; home?: THREE.Vector3
    /** washing (item 174): the sponge being taken up (`grab`), a plate being washed (`plate`), the sponge put back (`stow`); the plate in hand:
     * how dirty, its pattern, how it lay turned on the stack and where it was taken from; the left hand where the last plate left it (the bar's
     * frame); the way he faces the basin; the beats' sounds made */
    sub?: 'grab' | 'plate' | 'stow'; dirt?: number; design?: number; spin?: number; inHand?: boolean; from?: THREE.Vector3; fromL?: THREE.Vector3
    base?: number; sounds?: number
    /** whether the plate in hand's washed with the liquid (item 217: without, scrubbed longer and no suds) */
    soapy?: boolean
    /** the plate in hand's kind (item 228) */
    kind?: PlateKind } | null>(null)
  const bossObj = useRef<THREE.Group | null>(null)
  /** where the owner is just now, in the bar's frame: his own figure's place (at the fire while the shop's shut, along the aisle while it's
   * open), so he walks off from where he's seen and comes back there */
  const bossNow = () => {
    const b = scene.getObjectByName('BossFollow'), f = frame.current
    return b && f ? f.worldToLocal(b.getWorldPosition(new THREE.Vector3())).setY(0) : ownerAt()
  }
  // ---- the owner washing up by hand, beat by beat (item 174, the owner's, 2026-11-15: 「別再讓我看到這麼低水平的動畫」: a plate a second went
  // out of the stack and into the basket by itself while his hands circled inside the counter, the sponge left on its dish): he takes the
  // sponge up, takes the top plate off the stack, scrubs it over the water as he turns it, rinses it under the tap (or swishes it in the
  // water with the tap shut), stands it in the basket's next slot, and so on; the sponge put back after the last. The plate leaves the stack
  // as it's taken up, and joins the basket as it's let go (game/handWash's washBeat; scene/washMotion's pose)
  const WASH_POSE = useMemo(newWashPose, [])
  /** his hands in the world, for his figure (OwnerWalker reads them off his group) */
  const WASH_HANDS = useMemo(() => ({ left: new THREE.Vector3(), right: new THREE.Vector3() }), [])
  const washPts = useRef<WashPoints | null>(null)
  /** the plate in his hand, its scaled inside (the plate drawn), the suds on it, the drops off it */
  const washHeld = useRef<THREE.Group>(null)
  const washPlateIn = useRef<THREE.Group>(null)
  const washFoam = useRef<THREE.Group>(null)
  const washDrips = useRef<THREE.Group>(null)
  /**
   * The plate the player's washing by hand (item 224, the owner's, 2026-11-16: 「自己洗盤子的時候老闆不用來，可以拖曳盤子泡水or給水龍頭直接沖，用菜瓜布+洗碗精清潔
   * 更快」; item 234: 「流理台洗碗玩法還是很不順」: each plate was taken up, carried to a spot under the tap the size of a plate, held, carried to
   * the basket and let go, four moves a plate). Now a press on the dirty stack or the basin takes the top one up and it goes where the water
   * is by itself: under the running tap (the tap turned on if there's no water at all), or into the water standing in the basin; held down,
   * the pointer's to and fro scrubs it, faster with the sponge and the liquid (game/handWash's handClean); clean, it goes into the draining
   * basket by itself, and while the press is held the next one's taken up; let go, one not yet clean goes back on the stack. How dirty it is,
   * its pattern, where it is (`at`), how hard it's being scrubbed, whether it's had the liquid on it; the pointer's last place and time; when it
   * was last said of, whether it's been splashed into the water; whether the press is still held; washing it, or on its way into the basket
   * (`t` along, from `from`); how many washed this press
   */
  // (item 458, the owner's 「玩的模式不對，應該是拖曳過去，然後用菜瓜布刷，有用洗碗精會加成」: the plate's taken up and carried (`drag`) to the
  // water and let go there (`soak`), or into the washer's basket; in the water the sponge (or the hand) is rubbed over it (`rub`, the press
  // held on it); clean, it goes into the basket by itself (`toBasket`). `tipTill`: said of a while after it's let go into the water)
  // (item 606, the owner's 「這邊都用拖曳的」: the sponge dragged over it is what rubs it (`rub`, the frame's: the sponge held over the basin);
  // clean, it waits in the water to be dragged into the basket; `fromWater`: the one carried was taken up out of the water (let go where it
  // can't go, it goes back in); `shone`: its coming clean marked)
  const hand = useRef<{ dirt: number; design: number; kind: PlateKind; at: HandAt; scrub: number; soaped: boolean; px: number; py: number; pt: number; said: number
    wet: boolean; heard: number; rub: boolean; phase: 'drag' | 'soak' | 'toBasket'; t: number; from: THREE.Vector3; tipTill: number; fromWater?: boolean; shone?: boolean
    /** (item 680, the owner's 「當我拿第二盤的時候，會飛回去水槽內的第一盤?」) where it lies in the basin, as it was let go there (the bar's frame) */
    lay?: THREE.Vector3 } | null>(null)
  /** (item 681) how hard the pointer's going to and fro with the sponge held, whatever plate it's over (the plate in the water's own came only
   * with one there: rubbed over one already lying in the basin, nothing counted) */
  const rubNow = useRef({ px: -1, py: -1, pt: 0, scrub: 0 })
  /** (item 680) a place in the basin (the bar's frame) for a plate let go over it: where it was, kept a plate's half inside the water's edges */
  const layIn = (p: THREE.Vector3) => {
    const f = frame.current, pool = markOf('SinkWater'), plate = handObj.current
    const out = p.clone()
    if (!f || !pool || !plate) return out
    f.updateWorldMatrix(true, false)
    const corners = (b: THREE.Box3) => [b.min.x, b.max.x].flatMap((x) => [b.min.z, b.max.z].map((z) => f.worldToLocal(new THREE.Vector3(x, b.min.y, z))))
    const w = corners(new THREE.Box3().setFromObject(pool)), q = corners(new THREE.Box3().setFromObject(plate))
    const r = Math.max(Math.max(...q.map((v) => v.x)) - Math.min(...q.map((v) => v.x)), Math.max(...q.map((v) => v.z)) - Math.min(...q.map((v) => v.z))) * 0.5
    SINK_PLATE_R.v = r
    const x0 = Math.min(...w.map((v) => v.x)) + r, x1 = Math.max(...w.map((v) => v.x)) - r, z0 = Math.min(...w.map((v) => v.z)) + r, z1 = Math.max(...w.map((v) => v.z)) - r
    out.x = x0 < x1 ? Math.min(x1, Math.max(x0, out.x)) : (x0 + x1) / 2
    out.z = z0 < z1 ? Math.min(z1, Math.max(z0, out.z)) : (z0 + z1) / 2
    return out
  }
  const handGl = useThree((st) => st.gl)
  /** the pointer's ray (the plate carried over the counter, the sponge over the water, where the plate's let go) */
  const handRay = useRef(new THREE.Raycaster())
  const rayAt = (x: number, y: number) => {
    const r = handGl.domElement.getBoundingClientRect()
    HAND_NDC.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1)
    handRay.current.setFromCamera(HAND_NDC, camera)
    return handRay.current
  }
  /** where the pointer's ray meets the level `y` (the world's), or null */
  const pointerAtY = (x: number, y: number, at: number) => rayAt(x, y).ray.intersectPlane(HAND_PLANE.set(UP_Y, -at), HAND_HIT)
  /** where a plate let go of at the pointer lands: the draining basket, the washer (its door or its basket), the sink, or none of them */
  const dropOn = (x: number, y: number): 'basket' | 'washer' | 'basin' | null => {
    // (the baskets by their boxes, before the sink: they're wire, and the ray went between the wires to the sink's cabinet behind; the
    // washer's door by its box; in the sink, its washer's own (its cavity) is the washer's)
    const ray = rayAt(x, y)
    const boxHit = (o: THREE.Object3D | null) => !!o && ray.ray.intersectsBox(HAND_BOX.setFromObject(o).expandByScalar(0.02))
    if (boxHit(WASH_GUIDE.basket)) return 'basket'
    if (boxHit(WASH_GUIDE.rack) || boxHit(WASH_GUIDE.door)) return 'washer'
    const hit = WASH_GUIDE.basin ? ray.intersectObject(WASH_GUIDE.basin, true)[0] : undefined
    return hit ? (/^SinkDryer/.test(hit.object.name) ? 'washer' : 'basin') : null
  }
  /** where the pointer is, kept as it moves (the sponge in hand follows it over the water) */
  const pointerNow = useRef({ x: -1, y: -1 })
  /** (item 606) what the sponge in hand is over as it's carried (the frame rubs the plate in the water with it over the basin), and where it
   * was let go of (it goes back onto its dish from there) */
  const spongeOver = useRef<'basket' | 'washer' | 'basin' | null>(null)
  /** (item 642) what a carried plate's over: over the basin it's carried just over the water, else over the draining basket's rim */
  const plateOver = useRef<'basket' | 'washer' | 'basin' | null>(null)
  const spongeFrom = useRef(new THREE.Vector3())
  /** (item 606) whether the sponge in hand (the pointer) is over the plate in the water: within its rim, at its level (over the basin wasn't
   * enough: the sponge's own dish is in the basin's box, and the plate came clean on the way over to it) */
  const spongeOnPlate = (o: THREE.Object3D, reach = 1.05) => {
    if (pointerNow.current.x < 0) return false
    RUB_BOX.setFromObject(o).getCenter(RUB_C)
    const r = Math.max(RUB_BOX.max.x - RUB_BOX.min.x, RUB_BOX.max.z - RUB_BOX.min.z) * 0.5
    const p = pointerAtY(pointerNow.current.x, pointerNow.current.y, RUB_C.y)
    return !!p && Math.hypot(p.x - RUB_C.x, p.z - RUB_C.z) < r * reach
  }
  useEffect(() => {
    const move = (ev: PointerEvent) => { pointerNow.current.x = ev.clientX; pointerNow.current.y = ev.clientY }
    window.addEventListener('pointermove', move)
    return () => window.removeEventListener('pointermove', move)
  }, [])
  const handObj = useRef<THREE.Group>(null)
  const handIn = useRef<THREE.Group>(null)
  const handFoam = useRef<THREE.Group>(null)
  /** (item 638, the owner's 「且可以接續拖曳下一個碗盤，即便還沒洗」) the plates soaking in the basin under the top one (the one rubbed and taken
   * up, `hand`), each drawn by one of the pile's (soakObjs, their plates soakIns), from the bottom up */
  const under = useRef<NonNullable<typeof hand.current>[]>([])
  const soakObjs = useRef<(THREE.Group | null)[]>([])
  const soakIns = useRef<(THREE.Group | null)[]>([])
  /** what's listened for while the washing's going on (the press held), to be let go of if the bar's gone meanwhile */
  const handListen = useRef<(() => void) | null>(null)
  useEffect(() => () => handListen.current?.(), [])
  const handCtl = useThree((st) => st.controls) as unknown as { enabled: boolean } | null
  /** the sponge for his hand: a copy of the sink's (its meshes, shared), made once; where it lies on its dish, measured as he takes it up */
  const washSponge = useRef<{ g: THREE.Group; q: THREE.Quaternion; home: THREE.Vector3 } | null>(null)
  /** where he stands to wash: before the sink, along its front toward the basket (from before the basin's middle the stack lay a metre off
   * at his right, the basket behind it: out of his reach) */
  const washSpot = () => {
    const s0 = sinkFront(), mid = inBar('SinkWaterTop', endOf(1)).setY(0), side = basketAt(0).setY(0)
    const fwd = mid.clone().sub(s0)
    if (fwd.lengthSq() < 1e-8) return s0
    fwd.normalize()
    const off = side.sub(mid)
    off.addScaledVector(fwd, -off.dot(fwd))
    const d = off.length()
    // (kept up on the stool's top (item 221))
    return ontoStool(d > 1e-3 ? s0.addScaledVector(off.divideScalar(d), Math.min(WASH_SHIFT, d * 0.5)) : s0)
  }
  /** the sponge's copy (made the first time) and where it lies now on its dish (taken up off it by the player: a little over it) */
  const spongeHome = () => {
    let piece: THREE.Object3D | null = null
    scene.traverse((q) => { if (!piece && q.userData?.editId === 'sink-sponge') piece = q })
    const f = frame.current
    if (!piece || !f) return null
    const pc = piece as THREE.Object3D
    pc.updateWorldMatrix(true, true)
    const meshes: THREE.Mesh[] = []
    // (only what's drawn of it: its unseen box to point at (item 215) came along too, a white box in hand (item 458))
    pc.traverse((m) => { const q = m as THREE.Mesh; if (q.isMesh && q.visible && !q.userData.proxy && !q.userData.editHandle) meshes.push(q) })
    const box = new THREE.Box3()
    for (const m of meshes) box.expandByObject(m)
    if (box.isEmpty()) return null
    const c = box.getCenter(new THREE.Vector3())
    if (!washSponge.current) {
      const q = (pc.getObjectByName('SinkSpongeSet') ?? pc).getWorldQuaternion(new THREE.Quaternion())
      const inv = new THREE.Matrix4().compose(c, q, new THREE.Vector3(1, 1, 1)).invert()
      const g = new THREE.Group()
      g.name = 'wash-sponge'
      for (const m of meshes) {
        // (its own material, not the pointer's glowing copy of it: taken up as it's clicked, it was lit then (item 458))
        const k = new THREE.Mesh(m.geometry, restingMaterial(m))
        k.matrixAutoUpdate = false
        k.matrix.multiplyMatrices(inv, m.matrixWorld)
        k.raycast = () => {}
        g.add(k)
      }
      g.visible = false
      scene.add(g)
      washSponge.current = { g, q, home: new THREE.Vector3() }
    }
    washSponge.current.home.copy(f.worldToLocal(c))
    return washSponge.current
  }
  useEffect(() => () => { const w = washSponge.current; if (w) { w.g.removeFromParent(); washSponge.current = null } }, [])
  // (dev: the washing as it's posed, for the probes (tests/e2e/_washanim.mjs, _washdbg.mjs))
  useEffect(() => {
    if (!import.meta.env.DEV) return
    Object.assign(window, { __wash: { pose: WASH_POSE, hands: WASH_HANDS, state: () => bossWash.current, sponge: () => washSponge.current, frame: () => frame.current, hand: () => hand.current } })
  }, [WASH_POSE, WASH_HANDS])
  /** everything of the washing put by: the plate, the drops, his copy of the sponge (the sink's shown on its dish again), the stream */
  const washDone = () => {
    HAND_WASH.spongeHeld = false
    HAND_WASH.stream = null
    if (washHeld.current) washHeld.current.visible = false
    washDrips.current?.children.forEach((c) => { c.visible = false })
    if (washSponge.current) washSponge.current.g.visible = false
  }
  const sinkNow = () => ({ dirty: dirty.current, drain: DRAIN, plug: SINK.plug, water: SINK.water, soap: SINK.soap, sponge: true, tap: SINK.tap })
  /** a plate's pattern put on a drawn plate (its first mesh with one): the plate in hand takes the stack's top plate's, the basket's slot the
   * one let go of in it, so neither changes as it moves from one to the other */
  const setPattern = (g: THREE.Object3D | null | undefined, design: number) => {
    // (every plate drawn there: a PlateKinds has a round one and a long one (item 228))
    g?.traverse((q) => {
      const m = q as THREE.Mesh
      // (the round plate's own shape too (item 251's ROUND_GEO): it was left out, and a round plate kept its old pattern in hand)
      if (!m.isMesh || (m.geometry !== PLATE_GEO && m.geometry !== ROUND_GEO && m.geometry !== LONG_GEO)) return
      const mat = m.material as THREE.MeshToonMaterial
      if (!mat.map) return
      const t = m.geometry === LONG_GEO ? oribeLong(design) : roundGlaze(design)
      if (mat.map !== t) mat.map = t
    })
  }
  /** the next plate, or why he stops: all washed, the basket full, the water or the liquid gone (said, when the player sent him); the counter's
   * stack only, when he went of himself */
  const nextPlate = (b: NonNullable<typeof bossWash.current>) => {
    b.t = 0; b.sounds = 0; b.inHand = false
    const why = b.manual ? handStops(sinkNow()) : PILE.n > 0 && dirty.current > 0 && DRAIN.n < DRAIN_CAP ? null : 'done'
    if (why) { b.sub = 'stow'; if (b.manual) STAFF_SAY.say('owner', HAND_WASH_LINES[why]); return }
    const n = Math.min(dirty.current, SINK_SHOWN)
    b.sub = 'plate'
    // (washing up for the player with no liquid in the water or on the sponge: scrubbed longer, no suds (item 217))
    b.soapy = !b.manual || SINK.soap > 0
    b.dirt = SINK.dirt.at(-1) ?? 1
    b.design = n - 1
    b.spin = (n - 1) * 0.9
  }
  /** how near a sound is (as the restroom's): loud close by, gone 8.5 away */
  const nearCam = (at: THREE.Vector3) => Math.max(0, Math.min(1, 1 - (at.distanceTo(camera.position) - 1.5) / 7))
  /** how hard the pointer's going to and fro while the press is held: the scrubbing (item 234) */
  const scrubHand = (x: number, y: number) => {
    const now = performance.now(), r = rubNow.current, rdt = Math.max(8, now - r.pt)
    r.scrub = r.px < 0 ? 0 : Math.min(1, r.scrub * 0.6 + (Math.hypot(x - r.px, y - r.py) / rdt) * 0.5)
    r.px = x; r.py = y; r.pt = now
    const h = hand.current
    if (!h) return
    const dt = Math.max(8, now - h.pt)
    h.scrub = Math.min(1, h.scrub * 0.6 + (Math.hypot(x - h.px, y - h.py) / dt) * 0.5)
    h.px = x; h.py = y; h.pt = now
  }
  /** the press let go of (the plate carried, or the rubbing): the view's to be turned again, the pointer and the tap's stream as they were */
  const endWash = () => {
    handListen.current?.()
    HAND_WASH.held = false
    if (handCtl) handCtl.enabled = true
    document.body.style.cursor = ''
    document.body.classList.remove('is-carrying')
    if (!bossWash.current && hand.current?.phase !== 'soak') HAND_WASH.stream = null
  }
  /** listened for while the press is held: the pointer's moves, and its letting go */
  const holdPress = (onUp: (x: number, y: number) => void, onMove?: (x: number, y: number) => void) => {
    if (handCtl) handCtl.enabled = false
    const move = (ev: PointerEvent) => { scrubHand(ev.clientX, ev.clientY); onMove?.(ev.clientX, ev.clientY) }
    const up = (ev: PointerEvent) => onUp(ev.clientX, ev.clientY)
    const stop = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); handListen.current = null }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    handListen.current = stop
  }
  /**
   * The top dirty plate taken up off the stack (a press on the stack or the basin), carried after the pointer over the counter till it's let
   * go (item 458): into the water, or into the washer's basket, or back on the stack. One at a time: while one's in the water, a press on the
   * basin or on it rubs it (rubStart). Whether the press was taken: a plate up, or none, said why (the basin full).
   */
  const startWash = (x: number, y: number, from: 'stack' | 'basin' = 'stack') => {
    if (getEdit().on) return false
    if (hand.current) {
      // (item 606, the owner's 「這邊都用拖曳的」: the plate in the water taken up out of it by a press on the basin (or on it), carried as one
      // off the stack is)
      if (hand.current.phase === 'soak' && from === 'basin') return liftOut(x, y)
      // (item 638, the owner's 「且可以接續拖曳下一個碗盤，即便還沒洗」: a press on the stack with one in the water puts that one under in the
      // basin's pile, soaking on, and takes the next up; it said one at a time. The basin full, said so)
      if (hand.current.phase !== 'soak' || dirty.current <= 0) return false
      // (the basin full: said so in red, and the press kept here (item 642: let through to the basin behind the stack, it took the one
      // soaking up out of the water, and that one's words went over these))
      if (!bury()) {
        hand.current.tipTill = 0
        sayTip({ title: '盤子', hint: `水槽裡已經泡了 ${UNDER_MAX + 1} 個：先刷好一個拖到瀝水籃`, warn: true })
        return true
      }
    }
    if (dirty.current <= 0) return false
    const n = dirty.current
    const dirt = SINK.dirt[n - 1] ?? DIRT_BASE
    SINK.dirt.length = Math.min(SINK.dirt.length, n - 1)
    const kind = SINK.kinds[n - 1] ?? 'round'
    SINK.kinds.length = Math.min(SINK.kinds.length, n - 1)
    dirty.current = n - 1
    PILE.n = pileLeft(PILE.n, dirty.current)
    const design = Math.min(n, SINK_SHOWN) - 1
    hand.current = { dirt, design, kind, at: null, scrub: 0, soaped: false, px: x, py: y, pt: performance.now(), said: 0, wet: false, heard: 0, rub: false,
      phase: 'drag', t: 0, from: new THREE.Vector3(), tipTill: 0 }
    HAND_WASH.held = true
    HAND_WASH.soaking = false
    setPattern(handIn.current, design)
    showKind(handIn.current, kind)
    // (off the top of the stack: it goes from there after the pointer)
    if (handObj.current) { handObj.current.position.copy(dirtyAt(Math.max(0, Math.min(n, SINK_SHOWN) - 1))); handObj.current.visible = true }
    document.body.style.cursor = 'grabbing'
    document.body.classList.add('is-carrying')
    guideOff()
    plateOver.current = dropOn(x, y)
    holdPress((ux, uy) => dropWash(ux, uy), (mx, my) => { plateOver.current = dropOn(mx, my) })
    if (handObj.current) plateClink(handObj.current.getWorldPosition(SOUND_AT))
    redraw()
    return true
  }
  /** (item 606, the owner's 「這邊都用拖曳的」) the plate in the water taken up out of it (a press on it, or on the basin: it rubbed it, item 458),
   * carried after the pointer: into the draining basket if it's clean, into the washer, back into the water; let go anywhere else, back in */
  const liftOut = (x: number, y: number) => {
    const h = hand.current
    if (getEdit().on || !h || h.phase !== 'soak' || HAND_WASH.held) return false
    h.phase = 'drag'; h.fromWater = true; h.rub = false; h.px = x; h.py = y; h.pt = performance.now(); h.scrub = 0
    HAND_WASH.held = true
    HAND_WASH.soaking = false
    document.body.style.cursor = 'grabbing'
    document.body.classList.add('is-carrying')
    guideOff()
    plateOver.current = dropOn(x, y)
    holdPress((ux, uy) => dropWash(ux, uy), (mx, my) => { plateOver.current = dropOn(mx, my) })
    if (handObj.current) washSplash(handObj.current.getWorldPosition(SOUND_AT))
    redraw()
    return true
  }
  /** (item 606) the sponge taken up off its dish by a press on it (it was clicked up and clicked down), carried after the pointer as long as
   * it's held; moved to and fro over the plate in the water it rubs it (the frame's: held over the basin, a plate soaking); let go, it goes
   * back onto its dish */
  const grabSponge = (x: number, y: number) => {
    if (getEdit().on || HAND_WASH.held || bossWash.current) return false
    spongeHome()
    SINK.sponge = true
    HAND_WASH.held = true
    HAND_WASH.spongeBack = 0
    spongeOver.current = dropOn(x, y)
    const h = hand.current
    if (h) { h.px = x; h.py = y; h.pt = performance.now(); h.scrub = 0 }
    rubNow.current.px = x; rubNow.current.py = y; rubNow.current.pt = performance.now(); rubNow.current.scrub = 0
    document.body.style.cursor = 'grabbing'
    document.body.classList.add('is-carrying')
    holdPress(() => {
      SINK.sponge = false
      spongeOver.current = null
      const g = hand.current
      if (g) { g.rub = false; g.tipTill = performance.now() + 1500 }
      // (back onto its dish from where it was let go of, a little arc (the frame draws it))
      const w = washSponge.current
      if (w?.g.visible) { spongeFrom.current.copy(w.g.position); HAND_WASH.spongeBack = performance.now() + SPONGE_BACK_S * 1000 }
      endWash()
    }, (mx, my) => { spongeOver.current = dropOn(mx, my) })
    return true
  }
  HAND_WASH.take = (x, y) => startWash(x, y, 'basin')
  HAND_WASH.grabSponge = (x, y) => grabSponge(x, y)
  const liftRef = useRef(liftOut)
  liftRef.current = liftOut
  /** the press on the dirty stack (or one of its plates): the plate taken up */
  const takeUp = (e: ThreeEvent<PointerEvent>) => {
    if (e.nativeEvent.button !== 0) return
    if (startWash(e.nativeEvent.clientX, e.nativeEvent.clientY)) e.stopPropagation()
  }
  /** the plate put back on the stack, as clean as it's got (it soaks there with the rest); the basin's pile's top up as the one soaking */
  const backOnStack = (h: NonNullable<typeof hand.current>, why: string | null) => {
    hand.current = null
    HAND_WASH.soaking = false
    SINK.dirt.push(h.dirt)
    SINK.kinds.push(h.kind)
    dirty.current += 1
    if (handObj.current) handObj.current.visible = false
    if (handObj.current) plateClink(handObj.current.getWorldPosition(SOUND_AT))
    if (why) sayTip({ title: '盤子', hint: why }); else setTip(null)
    promote()
  }
  /** (item 638) the plate soaking at the top put under in the basin's pile, soaking on, to make way for the next: drawn as one of the pile's
   * from where it lay; whether there was room (UNDER_MAX under the top) */
  const bury = () => {
    const h = hand.current
    if (!h || h.phase !== 'soak') return true
    if (under.current.length >= UNDER_MAX) return false
    const k = under.current.length
    h.rub = false
    under.current.push(h)
    const o = soakObjs.current[k]
    setPattern(soakIns.current[k], h.design)
    showKind(soakIns.current[k], h.kind)
    if (o && handObj.current) { o.position.copy(handObj.current.position); o.visible = true }
    if (handObj.current) handObj.current.visible = false
    hand.current = null
    HAND_WASH.soaking = false
    return true
  }
  /** (item 638) the pile's top plate up as the one soaking at the top (rubbed, taken up out) once the one there's gone: from where it lay */
  const promote = () => {
    if (hand.current || !under.current.length) return
    const k = under.current.length - 1, s = under.current.pop()!
    const o = soakObjs.current[k]
    s.phase = 'soak'; s.rub = false; s.tipTill = performance.now() + 1500
    hand.current = s
    setPattern(handIn.current, s.design)
    showKind(handIn.current, s.kind)
    if (handObj.current && o) { handObj.current.position.copy(o.position); handObj.current.visible = true }
    if (o) o.visible = false
    HAND_WASH.soaking = true
  }
  /**
   * (item 681, the owner's 「菜瓜布依然沒法刷」) the plate the sponge in hand is over is the one rubbed, whichever it is: one lying under the top
   * one comes up to be rubbed where it lies (the two change places in the pile, not on the counter); the top of the dirty ones lying in the
   * basin as they were brought (not dragged in: only one dragged in was rubbed, and those lying there took no notice) is taken into the
   * water where it lies, the one there put under it. The basin full, said so
   */
  const pickRubbed = () => {
    if (!hand.current && under.current.length) promote()
    const h = hand.current
    if (h && h.phase !== 'soak') return
    // (the one on top is the one rubbed, clean or not (a dirty one under a clean one is got at once that's taken out to the basket); kept till
    // the sponge is well off it: rubbed to and fro over two lying on each other, it went from one to the other and back)
    if (h && handObj.current && spongeOnPlate(handObj.current, 1.5)) return
    const r = rubNow.current, now = performance.now()
    for (let k = under.current.length - 1; k >= 0; k--) {
      const o = soakObjs.current[k]
      if (!h || !o?.visible || under.current[k].dirt <= CLEAN_AT || !spongeOnPlate(o)) continue
      const s = under.current[k]
      under.current[k] = h
      setPattern(soakIns.current[k], h.design)
      showKind(soakIns.current[k], h.kind)
      if (handObj.current) { RUB_SWAP.copy(handObj.current.position); handObj.current.position.copy(o.position); o.position.copy(RUB_SWAP) }
      h.rub = false
      s.phase = 'soak'; s.rub = false; s.scrub = r.scrub; s.px = r.px; s.py = r.py; s.pt = r.pt; s.tipTill = now + 1500
      hand.current = s
      setPattern(handIn.current, s.design)
      showKind(handIn.current, s.kind)
      HAND_WASH.soaking = true
      return
    }
    const n = dirty.current, top = Math.min(n, SINK_SHOWN) - 1
    if (n <= 0 || top < onCounter.current) return
    const po = sinkPlates.current[top]
    if (!po?.visible || !spongeOnPlate(po)) return
    if (h && !bury()) {
      if (now - (h.said ?? 0) > 1500) { h.said = now; sayTip({ title: '盤子', hint: `水槽裡已經泡了 ${UNDER_MAX + 1} 個：先刷好一個拖到瀝水籃`, warn: true }) }
      return
    }
    const dirt = SINK.dirt[n - 1] ?? DIRT_BASE
    SINK.dirt.length = Math.min(SINK.dirt.length, n - 1)
    const kind = SINK.kinds[n - 1] ?? 'round'
    SINK.kinds.length = Math.min(SINK.kinds.length, n - 1)
    dirty.current = n - 1
    PILE.n = pileLeft(PILE.n, dirty.current)
    hand.current = { dirt, design: top, kind, at: null, scrub: r.scrub, soaped: false, px: r.px, py: r.py, pt: r.pt, said: 0, wet: false, heard: 0, rub: false,
      phase: 'soak', t: 0, from: new THREE.Vector3(), tipTill: now + 1500, lay: po.position.clone() }
    HAND_WASH.soaking = true
    setPattern(handIn.current, top)
    showKind(handIn.current, kind)
    if (handObj.current) { handObj.current.position.copy(po.position); handObj.current.visible = true }
    redraw()
  }
  /** a plate let go of where it can't go: back into the water if it was taken up out of it (item 606), else back on the stack */
  const backWhence = (h: NonNullable<typeof hand.current>, why: string | null) => {
    if (!h.fromWater) { backOnStack(h, why); return }
    h.phase = 'soak'
    h.tipTill = performance.now() + 2500
    HAND_WASH.soaking = true
    if (handObj.current) washSplash(handObj.current.getWorldPosition(SOUND_AT))
    // (why, said a while before the frame says how it's coming on again)
    if (why) { sayTip({ title: '盤子', hint: why }); h.said = performance.now() + 1300 }
  }
  /**
   * The plate carried let go of (item 458), where it's let go: into the water (item 638: the tap the player's own to turn on; it was turned on);
   * into the washer, its door down and room in it (item 460, the owner's 「然後我也不能手動拖曳碗盤至洗碗機」); into the draining basket if
   * it's clean; else back on the stack
   */
  const dropWash = (x: number, y: number) => {
    const h = hand.current
    endWash()
    if (!h || h.phase !== 'drag') { redraw(); return }
    const on = dropOn(x, y)
    if (on === 'washer') {
      const open = DRYER.manual || DRYER.open >= 1, ph = dryerPhase(DRYER)
      if (open && (ph === 'idle' || ph === 'loaded') && DRYER.n < DRYER_CAP) {
        hand.current = null
        DRYER.n += 1
        if (handObj.current) { plateClink(handObj.current.getWorldPosition(SOUND_AT)); handObj.current.visible = false }
        setTip({ title: '洗碗機', hint: `放進去了（裡面 ${DRYER.n} 個）｜${DRYER.n >= DRYER_CAP ? '滿了，' : ''}點門關上就開始洗` })
        promote()
      } else backWhence(h, !open ? '洗碗機的門關著：先點一下門打開' : ph === 'washing' ? '洗碗機正在洗，等它洗完' : ph === 'clean' ? '洗碗機裡是洗好的，要先拿出來' : `洗碗機滿了（${DRYER_CAP} 個）`)
    } else if (on === 'basin') {
      h.phase = 'soak'
      // (where it was let go, not over to where the last one lay (item 680))
      if (handObj.current) h.lay = layIn(handObj.current.position)
      h.tipTill = performance.now() + 2500
      HAND_WASH.soaking = true
      // (the tap left as it is (item 638, the owner's 「我拖曳碗盤，水龍頭不該自己開」): the splash of it going in)
      if (handObj.current) washSplash(handObj.current.getWorldPosition(SOUND_AT))
    } else if (on === 'basket' && h.dirt <= CLEAN_AT && DRAIN.n < DRAIN_CAP) {
      h.phase = 'toBasket'; h.t = 0; h.from.copy(handObj.current?.position ?? h.from)
    } else backWhence(h, on === 'basket' ? (h.dirt > CLEAN_AT ? '還沒洗乾淨：放回水裡，拿菜瓜布刷乾淨' : '瀝水籃滿了，先把乾的收回碗盤架') : null)
    redraw()
  }
  /** the washing's beats: the sponge taken up, then a plate after another (off the stack as it's taken up, into the basket as it's let go),
   * the sponge put back, and home */
  const washTick = (b: NonNullable<typeof bossWash.current>) => {
    const f = frame.current
    if (b.sub === 'grab') { if (b.t >= SPONGE_S) nextPlate(b); return }
    if (b.sub === 'stow') {
      if (b.t < SPONGE_S) return
      washDone()
      b.phase = 'back'; b.t = 0
      b.path = kitchenRoute(b.pos, b.home ?? ownerAt()); b.len = pathLength(b.path)
      return
    }
    const dirt = b.dirt ?? 1
    if (!b.inHand && b.t >= beatLength('take', dirt)) {
      // (taken up: off the stack (where it lay kept, for the way it comes over))
      if (dirty.current <= 0) { b.sub = 'stow'; b.t = 0; return }
      b.inHand = true
      b.from = dirtyAt(Math.max(0, Math.min(dirty.current, SINK_SHOWN) - 1))
      b.kind = SINK.kinds[dirty.current - 1] ?? 'round'
      SINK.kinds.length = Math.min(SINK.kinds.length, dirty.current - 1)
      showKind(washPlateIn.current, b.kind)
      dirty.current -= 1
      PILE.n = pileLeft(PILE.n, dirty.current)
      setPattern(washPlateIn.current, b.design ?? 0)
      redraw()
    }
    const { beat } = washBeat(b.t, dirt, b.soapy ?? true)
    const at = washPts.current?.work
    if (f && at && beat === 'scrub' && !((b.sounds ?? 0) & 1)) { b.sounds = (b.sounds ?? 0) | 1; f.localToWorld(SOUND_AT.copy(at)); washSplash(SOUND_AT); scrubSound(nearCam(SOUND_AT)) }
    if (f && at && beat === 'rinse' && !((b.sounds ?? 0) & 2)) { b.sounds = (b.sounds ?? 0) | 2; washSplash(f.localToWorld(SOUND_AT.copy(at))) }
    if (b.t >= washPlateS(dirt, b.soapy ?? true)) {
      // (let go of, standing in the basket's next slot: the basket's plate there drawn with its pattern)
      const r = handOne(1, DRAIN)
      DRAIN.n = r.drain.n
      DRAIN.left = r.drain.left
      if (b.manual) SINK.soap = scrubbed(SINK.soap)
      else soapPlate()
      meterWater('dish')
      setPattern(drainPlates.current?.children[DRAIN.n - 1], b.design ?? 0)
      DRAIN_KINDS[DRAIN.n - 1] = b.kind ?? 'round'
      if (f) plateClink(f.localToWorld(SOUND_AT.copy(WASH_POSE.plate)))
      b.fromL = (b.fromL ?? new THREE.Vector3()).copy(WASH_POSE.left)
      nextPlate(b)
    }
  }
  /** the points the washing moves between, in the bar's frame, now (the water's top as it stands, the tap running or not, the basket's next slot) */
  const washPoints = (b: NonNullable<typeof bossWash.current>) => {
    const p = washPts.current ?? (washPts.current = { stack: new THREE.Vector3(), stackSpin: 0, work: new THREE.Vector3(), waterY: 0, spout: null,
      slot: new THREE.Vector3(), along: new THREE.Vector3(), toward: new THREE.Vector3(), left: new THREE.Vector3(), spongeHome: new THREE.Vector3(),
      fromL: new THREE.Vector3(), restL: new THREE.Vector3(), restR: new THREE.Vector3(), r: (PLATE_DIMS.round.w / 2) * IN_SINK })
    const top = inBar('SinkWaterTop', endOf(1)), floor = inBar('SinkBasinFloor', endOf(1))
    p.waterY = floor.y + (top.y - floor.y) * Math.min(1, Math.max(0, SINK.water))
    p.toward.copy(b.pos).sub(top).setY(0).normalize()
    const fwd = WASH_FWD.copy(p.toward).negate()
    p.left.crossVectors(UP_Y, fwd)
    p.work.copy(top).addScaledVector(p.toward, WORK_IN).setY(Math.max(p.waterY, floor.y + 0.03) + WORK_UP)
    p.spout = SINK.tap || SINK.washing ? SPOUT_AT.copy(inBar('SinkSpoutTip', endOf(1))) : null
    p.slot.copy(basketAt(DRAIN.n))
    p.along.copy(inBar('SinkRackSlot1', endOf(1)).sub(inBar('SinkRackSlot0', endOf(1)))).normalize()
    if (b.inHand && b.from) p.stack.copy(b.from)
    else p.stack.copy(dirtyAt(Math.max(0, Math.min(dirty.current, SINK_SHOWN) - 1)))
    p.stackSpin = b.spin ?? 0
    if (washSponge.current) p.spongeHome.copy(washSponge.current.home)
    // (his hands at rest: in front of him at his waist, either side)
    p.restL.copy(b.pos).addScaledVector(p.left, 0.15).addScaledVector(fwd, 0.16).setY(b.pos.y + 0.5)
    p.restR.copy(b.pos).addScaledVector(p.left, -0.15).addScaledVector(fwd, 0.16).setY(b.pos.y + 0.5)
    p.fromL.copy(b.fromL ?? p.restL)
    return p
  }
  /** the washing posed this frame: his hands, the plate (its smear, its suds), the drops off it, the sponge, the tap's stream on the plate, his
   * body turned a little toward what his hands are at */
  const washShow = (b: NonNullable<typeof bossWash.current>, step: number) => {
    const f = frame.current
    const p = washPoints(b), P = WASH_POSE, dirt = b.dirt ?? 1
    const beat = b.sub === 'plate' ? washBeat(b.t, dirt, b.soapy ?? true) : null
    if (!beat) spongePose(Math.min(1, b.t / SPONGE_S), b.sub === 'stow', p, P)
    else washPose(beat.beat, beat.k, p, P)
    if (f) { f.localToWorld(WASH_HANDS.left.copy(P.left)); f.localToWorld(WASH_HANDS.right.copy(P.right)) }
    const h = washHeld.current
    if (h) {
      h.visible = !!beat && P.held
      if (h.visible) {
        h.position.copy(P.plate)
        h.quaternion.copy(P.plateQ)
        washPlateIn.current?.scale.set(IN_SINK, IN_SINK * (0.3 + 0.7 * P.deep), IN_SINK)
        for (const sm of smearsOf(washPlateIn.current)) { const d = dirt * P.smear; (sm.material as THREE.MeshBasicMaterial).opacity = smearOpacity(d); sm.visible = d > CLEAN_AT }
        washFoam.current?.children.forEach((c, i) => { const k = FOAM_AT[i][2] * P.foam * (b.soapy === false ? 0 : 1); c.scale.set(k, k * 0.6, k); c.visible = k > 0.03 })
      }
    }
    // (the drops running off its lowest edge down into the water, three, one after another)
    const dr = washDrips.current
    if (dr) {
      const on = !!beat && P.held && P.wet > 0.3
      if (on) {
        WASH_FWD.copy(UP_Y).applyQuaternion(P.plateQ)
        DRIP_LOW.copy(UP_Y).addScaledVector(WASH_FWD, -WASH_FWD.y).normalize()
        DRIP_LOW.multiplyScalar(-p.r * 0.97).add(P.plate)
      }
      const fall = DRIP_LOW.y - p.waterY
      dr.children.forEach((c, i) => {
        c.visible = on && fall > 0.006
        if (!c.visible) return
        const k = (performance.now() / 1000 * 2.6 + i / 3) % 1
        c.position.set(DRIP_LOW.x, DRIP_LOW.y - fall * k * k, DRIP_LOW.z)
      })
    }
    // (the sponge: his copy where his hand has it, the one on the dish hidden meanwhile)
    const sp = washSponge.current
    HAND_WASH.spongeHeld = !!sp
    if (sp && f) {
      sp.g.visible = true
      f.localToWorld(sp.g.position.copy(P.sponge))
      sp.g.quaternion.copy(P.spongeQ).multiply(sp.q)
    }
    HAND_WASH.stream = P.stream && f ? f.localToWorld(STREAM_W.copy(P.stream)) : null
    // (his body turned a little toward what his hands are at: the stack as he takes a plate, the basket as he stands it in, the sponge's dish)
    const aim = !beat ? p.spongeHome : beat.beat === 'take' ? p.stack : beat.beat === 'rack' ? p.slot : p.work
    const base = b.base ?? b.yaw
    const want = Math.atan2(aim.x - b.pos.x, aim.z - b.pos.z)
    const turn = Math.max(-0.5, Math.min(0.5, Math.atan2(Math.sin(want - base), Math.cos(want - base)))) * 0.6
    b.yaw += Math.atan2(Math.sin(base + turn - b.yaw), Math.cos(base + turn - b.yaw)) * Math.min(1, step * 6)
  }
  const bossWashTick = (step: number) => {
    // (the player's washing up handed to him (item 166, Sink's scrubOnce): he goes once he's free; at the counter's stack already, he washes
    // the lot)
    if (HAND_WASH.ask === 'wash' && !SHOP.leaving && !(open && ownerServes)) {
      if (bossWash.current) { bossWash.current.manual = true; HAND_WASH.ask = null }
      else if (ownerFree('wash')) {
        HAND_WASH.ask = null
        const from = bossNow(), path = kitchenRoute(from, washSpot())
        bossWash.current = { phase: 'go', path, len: pathLength(path), t: 0, pos: from.clone(), yaw: OWNER_YAW, manual: true, home: from }
        ownerAway('wash', true)
        STAFF_SAY.say('owner', HAND_WASH_LINES.start)
      }
    }
    HAND_WASH.boss = (!!bossWash.current?.manual && bossWash.current.phase !== 'back')
      || (open && ownerServes && waiters.current.some((x) => x.phase === 'handGo' || x.phase === 'handwash'))
    if (open && !SHOP.leaving && !bossWash.current && PILE.saidDay !== SHOP.day && bossCleans(SHOP.day, PILE.n)
      && performance.now() - SHOP.openedAt > 9000 && (ownerServes || ownerFree('wash'))) {
      PILE.saidDay = SHOP.day
      STAFF_SAY.say('owner', PILE_LINE)
      if (ownerServes) PILE.n = 0
      else {
        const from = ownerAt(), path = kitchenRoute(from, washSpot())
        bossWash.current = { phase: 'go', path, len: pathLength(path), t: 0, pos: from.clone(), yaw: OWNER_YAW }
        ownerAway('wash', true)
      }
    }
    const b = bossWash.current, o = bossObj.current
    if (o) o.visible = !!b
    if (!b) { if (HAND_WASH.spongeHeld) washDone(); return }
    b.t += step
    if (b.phase === 'go' || b.phase === 'back') {
      const d = Math.min(b.len, b.t * SERVER_SPEED)
      const { p, dir } = alongPath(b.path, d)
      b.pos.copy(p)
      if (dir.x || dir.z) { const want = Math.atan2(dir.x, dir.z); b.yaw += Math.atan2(Math.sin(want - b.yaw), Math.cos(want - b.yaw)) * Math.min(1, step * 12) }
      if (d >= b.len) {
        if (b.phase === 'go') {
          // (at the sink, facing the basin: the sponge taken up first (item 174))
          b.phase = 'wash'; b.t = 0; b.sub = 'grab'; b.inHand = false; b.fromL = undefined
          const at = inBar('SinkWaterTop', endOf(1)).sub(b.pos)
          b.yaw = b.base = Math.atan2(at.x, at.z)
          spongeHome()
        } else { bossWash.current = null; ownerAway('wash', false); if (o) o.visible = false; washDone(); return }
      }
    } else {
      washTick(b)
      if (bossWash.current === b && b.phase === 'wash') washShow(b, step)
    }
    if (o) {
      o.position.copy(b.pos)
      // (up on the kitchen's dais, as the servers are over it (he stood its height down in it, his feet under its boards), and on the sink's
      // step stool over that (item 221))
      const d = b.pos.clone().sub(counters[0].at), a = d.dot(counters[0].along), l = d.dot(counters[0].lay)
      const dais = KITCHEN_DROP < 0 && a > kitchen.along[0] && a < kitchen.along[1] && l > kitchen.lay[0] && l < kitchen.lay[1] ? -KITCHEN_DROP / scale : 0
      o.position.y += dais + stoolLift(o, b.pos, Math.min(step, 0.1))
      o.rotation.y = b.yaw
      o.userData.scrub = undefined
      o.userData.washHands = b.phase === 'wash' ? WASH_HANDS : undefined
    }
  }
  /** where one stands on the kitchen's floor to reach something on (or by) the cook table: the nearest spot clear of it */
  const reachClear = (v: THREE.Vector3) => {
    const blocks = kitchenBlocks()
    if (!blocks.length) return v.clone().setY(0)
    const [a, l] = standClear(flat(v), blocks)
    const c0 = counters[0]
    return c0.at.clone().addScaledVector(c0.along, a).addScaledVector(c0.lay, l).setY(0)
  }
  /** where one stands at the skewer buckets on the cook table's front (the used ones', the clean ones'), measured afresh */
  const skewerSpot = (name: 'skewer-tray' | 'skewer-holder', or: THREE.Vector3) => { marks.current.delete(name); return reachClear(inBar(name, or)) }
  /** the skewers being washed: by a server (a floor one with nothing else to do), or by the plater when there's no server */
  const SK_PHASES = new Set<string>(['skTrayGo', 'skTake', 'skSinkGo', 'skWash', 'skHolderGo', 'skPut'])
  /** where the k-th plate stands in the dish dryer (along its rack, from its first slot to its last), and the way its plates face */
  const dryerAt = (k: number) => inBar('SinkDryerRack0', endOf(1)).lerp(inBar('SinkDryerRack1', endOf(1)), DRYER_CAP > 1 ? k / (DRYER_CAP - 1) : 0)
  /** where the k-th plate stands in the draining basket: along its slots (blender/sink.py's SinkRackSlot0, 1, 6 cm apart as it's made), from
   * the first notch on (blender/sink.py's notched rails: SinkRackSlot0 and 1 are two notches apart), each in its own notch, a gap between them
   * (the owner's, 2026-11-12) */
  const basketAt = (k: number) => { const a = inBar('SinkRackSlot0', endOf(1)), b = inBar('SinkRackSlot1', endOf(1)); return a.clone().add(b.sub(a).multiplyScalar(k / 2)) }
  /** each server's stack of dried plates, drawn on their tray while they carry it to the racks */
  const stackObjs = useRef<(THREE.Group | null)[]>([])
  const ragObjs = useRef<(THREE.Mesh | null)[]>([])
  const shownRef = useRef<Shown[]>([])
  /** whether a guest's plate is the small one (item 169): what they ordered all small things, as Roasting says; unknown, the big one */
  const guestsNow = useRef(guests)
  guestsNow.current = guests
  const kindFor = (id: number | undefined): PlateKind => guestsNow.current.find((x) => x.id === id)?.plate ?? 'round'
  // (the shop open: its furnishings can't be moved about by hand; shut, they can: edit mode, key G)
  useEffect(() => { setLocked(open) }, [open])
  // (the day's rice and soup made fresh: the cooker and the soup's pot empty as the shop opens, the third cook to cook them (the owner's,
  // 2026-11-11))
  /** (item 837) whether the day's first pot of rice and of soup have been put on yet: the third cook's first jobs of the day */
  const dayPrep = useRef({ rice: false, soup: false })
  useEffect(() => {
    if (!open) return
    dayPrep.current = { rice: false, soup: false }
    RICE.rice = 0
    RICE.kama = emptyKama()
    SOUP.pot = emptyPot()
    SOUP.left = 0
    SOUP_SEATS.clear()
    SOUP.served++
    SAKE_SEATS.clear()
    SAKE.served++
    SAKE.want = []
    SAKE.ready.clear()
    sakeJob.current = null
  }, [open])
  /** each shown guest's name tag, faded with them as they go out of the door */
  const labels = useRef(new Map<number, HTMLElement>())
  const labelEl = useCallback((id: number, el: HTMLElement | null) => { if (el) labels.current.set(id, el); else labels.current.delete(id) }, [])
  if (import.meta.env?.DEV && typeof window !== 'undefined') (window as unknown as { __shown?: typeof shownRef }).__shown = shownRef
  if (import.meta.env?.DEV && typeof window !== 'undefined') Object.assign(window, { __waiters: waiters, __visitors: visitors, __visitorObjs: visitorObjs, __waiterBoxes: waiterBoxes, __takeoutWay: takeoutWay, __inGenkan: (v: THREE.Vector3) => inGenkan(counters, v), __dirty: dirty, __barFrame: frame, __platingAt: plating.at, __platingOut: plating.out, __platerRun: platerRun, __sakeJob: sakeJob, __sakeSpot: (n: number) => sakeSpotOf(n), __sakeAround: (n: number) => { const st = seats[n], c = counters[st.counter], x = st.mid.clone().sub(c.at).dot(c.along); return { plate: st.plate.clone(), soup: st.mid.clone().addScaledVector(c.along, -sauceSide(c, BAR_GATES[st.counter], x) * 1.15).addScaledVector(c.lay, PLACE.sauce[1]), drink: new THREE.Vector3(...drinkSpot(n, false)), cup: new THREE.Vector3(...drinkSpot(n, true)) } }, __runs: runs, __sitters: sitters, __tillCall: tillCall, __kitchenBlocks: () => kitchenBlocks(), __kitchenRoute: (a: THREE.Vector3, b: THREE.Vector3) => kitchenRoute(a, b), __kitchenRoom: () => kitchenOf(counters), __pickupSpot: () => pickupSpot, __homeOf: (wi: number) => homeOf(wi), __flat: (v: THREE.Vector3) => flat(v), __shown: shownRef, __guestGroups: groups, __guestClock: clock, __grateNow: () => { grateAt.current = -1e9 } })

  shownRef.current = shown
  // (how many are still in the room: the shop shuts only once they're all out of the door)
  useEffect(() => { SHOP.inRoom = shown.length + visitorList.length + sitterList.length; return () => { SHOP.inRoom = 0 } }, [shown, visitorList, sitterList])
  if (import.meta.env?.DEV && typeof window !== 'undefined') Object.assign(window, { __shown: shownRef })
  // (dev: each walker's step aside as it stands, and the pairs passing, for tests/e2e/_jump203.mjs)
  if (import.meta.env?.DEV && typeof window !== 'undefined') Object.assign(window, { __aside: aside, __passing: passing })
  // closing the shop empties the room at once: nobody at the stools, no plates out or being carried, the stacks as at the start
  // (and looked at as the shop opens: measured while it was shut, the room may still have been coming in (the miso pot by the rice tub wasn't
  // there yet, and the whole day the servers' places and ways went through it))
  useEffect(() => {
    if (!open) return
    blocksMade.current = null
    clearHomes.current.clear()
  }, [open])
  useEffect(() => {
    if (open) return
    setShown([])
    // (the benches emptied as the shop's shut: no one left sat there into the next day (item 328))
    BENCH.ids = []
    BENCH.since.clear()
    BENCH.up.clear()
    BENCH.gone.clear()
    sitters.current.clear()
    setSitterList([])
    runs.current = []
    runObjs.current.clear()
    waiting.current = []
    // (the kitchen's floor looked at again tomorrow: things may be moved about in the meantime; the servers' places with it)
    blocksMade.current = null
    clearHomes.current.clear()
    // (the racks full for the next day but for the day's first washing up (game/plates START_DIRTY, START_DRAIN: the owner's, item 82), the
    // low rack by the table full besides; the dirty ones waiting on the counter by the sink)
    // (the stack on the counter only what's left of it: a new game's, kept from day to day till it's washed (game/sinkPile, item 103))
    PLATE_RACK.n = rackAtStart() + START_DIRTY - PILE.n
    LOW_RACK.n = LOW_FULL
    LOW_RACK.coming = 0
    dirty.current = PILE.n
    onCounter.current = PILE.n
    SINK.dirt.length = 0
    SINK.kinds.length = 0
    // (the basin's pile of the player's own washing let go with the rest (item 638))
    under.current.length = 0
    for (const o of soakObjs.current) if (o) o.visible = false
    wash.current = null
    SINK.washing = false
    // (the plating place bare, the dryer empty and shut, the bin by the sink emptied, the plater at their place)
    PLATING.stock = 0
    PLATING.coming = 0
    PLATING.slots.fill(null)
    PLATES_OUT.clear()
    SEAT_STICKS.clear()
    SEAT_BONES.clear()
    Object.assign(DRYER, { n: 0, left: null, open: 0 })
    // (the basket with the day's first washed plates in it, dry already: taken back to the racks as any dry ones are)
    Object.assign(DRAIN, { n: START_DRAIN, left: START_DRAIN ? 0 : null })
    SINK_BIN.sticks = 0
    SINK_BIN.b = { rubbish: 0, recycle: 0, cans: 0, bottles: 0 }
    SINK_BIN.out = null
    // (the bags stowed under the sink through the evening put out after closing (item 318))
    SINK_BIN.stowed = { rubbish: 0, recycle: 0 }
    // (the bowls, the renge and the chopsticks washed and put away overnight, a clean pair laid at every place (item 600))
    Object.assign(WARE, { cab: cabinetAtStart(seats.length), sink: noWares(), washer: noWares(), out: noWares(), ver: WARE.ver + 1 })
    SEAT_LEFT.clear()
    CHOPS_USED.clear()
    CHOPS_OFF.clear()
    CHOPS_LOOSE.n = 0
    CHOPS_LOOSE.ver++
    platerRun.current = { phase: 'idle', t: 0, path: [], len: 0, pos: new THREE.Vector3(), yaw: 0, n: 0 }
    PLATER_OUT.id = null
    ownerHome.current = null
    ownerBack()
    waiters.current = waiters.current.map((w, i) => ({ phase: 'idle', t: 0, seat: -1, keys: [], run: null, path: [], len: 0,
      pos: (ownerServes ? ownerAt() : homes[i]?.at)?.clone() ?? w.pos, yaw: ownerServes ? OWNER_YAW : homes[i]?.yaw ?? w.yaw }))
    SERVICE.waiting.clear()
    SERVICE.carried.clear()
    SEATS_TAKEN.clear()
    PLATES_SET.clear()
    for (const f of FRIDGE_STATE) { f.passing = 0; f.stocker = false }
    SAY_SEATED.lines.clear()
    // (no bowls asked for or out, the cooker's lid down (items 205, 206))
    bowlJob.current = null
    passQ.current = []
    bowlTrays.current.clear()
    BOWLS.want = []; BOWLS.asked.clear(); BOWLS.got.clear(); BOWLS.setAt.clear(); BOWLS.ver++
    RICE_SEATS.clear()
    RICE.lid = 0
    // (the toilets swept before the day, nobody in them; the paper as it was left)
    // (both scrubbed before the day, a dose of the cleaner each that was used at all (item 203; one clean already, as on a new page, isn't
    // scrubbed again): none left, brushed with water)
    for (const w of [TOILETS.m, TOILETS.f]) { w.passing = 0; w.inside = 0; w.room = openRoom(w.room, w.room.clean < 0.999 ? scrubDose() : true) }
    WC_GRUMBLE.clear()
    redraw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  useEffect(() => {
    // (the plates are seen to here, not in the state update below, which must stay free of side effects)
    for (const g of guests) {
      const s = shownRef.current.find((x) => x.id === g.id)
      if (s && g.state !== 'waiting' && g.state !== 'eating' && s.phase !== 'leave') clear(g.id)
    }
    // (one done, or gone off in a huff: away at the toilet, they go once they're back at their stool; done and satisfied, a tissue to the
    // mouth first, then up (the frame's 'sit'); in a huff, straight up. Marked on their own entry, as the frame loop marks it: a copy put in
    // the list in their place was made from them as the list was next drawn, and the frame loop walked them on a few frames more before it
    // had the copy, which put them back by those frames along their way, a jump back on the way out of the toilet (item 45))
    let marked = false
    for (const g of guests) {
      const s = shownRef.current.find((x) => x.id === g.id)
      if (!s || g.state === 'waiting' || g.state === 'eating' || s.phase === 'leave' || s.leaving || s.wipeAt) continue
      if (s.phase.startsWith('wc')) s.leaving = true
      // (done: first down to their drawer for a tissue, then it to their mouth (item 269))
      else if (s.phase === 'sit' && g.state === 'done') { s.wipeAt = performance.now(); DRAWER_KICK.set(s.seat, s.wipeAt) }
      else { s.phase = 'leave'; s.t = 0 }
      marked = true
    }
    if (marked) redraw()
    // (the same list back when nobody comes: then the bar isn't drawn again for it)
    setShown((cur) => {
      let next = cur
      for (const g of guests) {
        const s = next.find((x) => x.id === g.id)
        const seated = g.state === 'waiting' || g.state === 'eating'
        if (!s && seated) {
          const taken = new Set(next.map((x) => x.seat))
          // (the shop may have given them a stool already: it only does once the last one there has gone)
          const seat = g.seat !== undefined ? g.seat : Array.from({ length: seats.length }, (_, i) => i).find((i) => !taken.has(i))
          // (off the bench (BENCH): their way in starts where they sat, welcomed already)
          // (called this moment, the bench's walk not yet round to it: from where they sit there now)
          const from = benchFrom.current.get(g.id) ?? (BENCH.up.has(g.id) ? sitters.current.get(g.id)?.pos.clone() : undefined)
          if (from) benchFrom.current.delete(g.id)
          const shod = benchShoesIn.current.delete(g.id)
          if (seat !== undefined) next = [...next, from ? { id: g.id, seat, phase: 'enter', t: 0, from, welcomed: true, ...(shod ? { shoesIn: true } : {}) } : { id: g.id, seat, phase: 'enter', t: 0, ...gearFor(g.id) }]
        }
      }
      return next
    })
  }, [guests])

  // ---- a customer dragged to another stool (the owner's: customers only; the owner and the staff keep to their work): picked up off
  // their stool while they wait, carried under the pointer over the floor, set down on a free stool if nothing's on the way to them yet
  // (Roasting answers: SEAT_MOVE), else back onto their own
  const getThree = useThree((st) => st.get)
  if (import.meta.env?.DEV && typeof window !== 'undefined') Object.assign(window, { __guestGroups: groups, __barSeats: seats })
  const drag = useRef<{ id: number; at: THREE.Vector3; asked: number } | null>(null)
  const canMove = (s: Shown) => {
    const g = guestsRef.current.find((x) => x.id === s.id)
    return s.phase === 'sit' && !s.leaving && g?.state === 'waiting' && !runs.current.some((r) => r.seat === s.seat) && !PLATES_SET.has(s.seat)
      && !PLATING.slots.some((sl) => sl?.seat === s.seat) && ![...SERVICE.waiting.values()].includes(s.seat)
  }
  const grab = (s: Shown) => (e: ThreeEvent<PointerEvent>) => {
    if (getEdit().on || e.button !== 0 || drag.current || !canMove(s)) return
    const grp = groups.current.get(s.id)
    if (!grp?.parent) return
    e.stopPropagation()
    const st = getThree()
    const ctl = st.controls as unknown as { enabled: boolean } | null
    if (ctl) ctl.enabled = false
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -grp.getWorldPosition(new THREE.Vector3()).y)
    drag.current = { id: s.id, at: grp.position.clone(), asked: 0 }
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hit = new THREE.Vector3()
    const el = st.gl.domElement
    // (held: the closed hand, and they go on glowing till they're let go)
    el.style.cursor = 'grabbing'
    GRABBING.on = true
    const move = (ev: PointerEvent) => {
      const r = el.getBoundingClientRect()
      ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1)
      ray.setFromCamera(ndc, st.camera)
      const d = drag.current
      if (d && !d.asked && grp.parent && ray.ray.intersectPlane(plane, hit)) d.at.copy(grp.parent.worldToLocal(hit))
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      if (ctl) ctl.enabled = true
      el.style.cursor = ''
      GRABBING.on = false
      glowOff(grp)
      const d = drag.current
      if (!d) return
      // (the nearest stool to where they're let go, if it's close; free of anyone, their plate, their bones)
      let to = -1, best = 0.5
      seats.forEach((p, i) => { const k = Math.hypot(p.stool.x - d.at.x, p.stool.z - d.at.z); if (k < best) { best = k; to = i } })
      const free = to >= 0 && to !== s.seat && !shownRef.current.some((x) => x.seat === to) && !runs.current.some((r) => r.seat === to)
        && !PLATES_SET.has(to) && !guestsRef.current.some((x) => x.id !== s.id && x.seat === to && (x.state === 'waiting' || x.state === 'eating'))
      if (free && canMove(s)) { SEAT_MOVE.ask = { guest: s.id, from: s.seat, to }; d.asked = performance.now() }
      else drag.current = null
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  useFrame(() => {
    const d = drag.current
    if (!d) return
    const s = shownRef.current.find((x) => x.id === d.id)
    const a = SEAT_MOVE.answer
    if (d.asked && a?.guest === d.id) {
      SEAT_MOVE.answer = null
      drag.current = null
      if (a.ok && s) {
        // (their shoes into the cubby of the stool they're on now: they're taken out of it on the way home)
        const shoes = SHOE_CELLS.shoes.get(s.seat % SHOE_CUBBIES)
        if (shoes) { SHOE_CELLS.shoes.delete(s.seat % SHOE_CUBBIES); SHOE_CELLS.shoes.set(a.to % SHOE_CUBBIES, shoes) }
        s.seat = a.to
      }
      return
    }
    if (d.asked && performance.now() - d.asked > 1500) { drag.current = null; return }
    // (held up a little under the pointer, over the floor, while they're carried; their stool's frame put back by the bar's clock once let go)
    if (!s || s.phase !== 'sit') { drag.current = null; return }
    groups.current.get(d.id)?.position.set(d.at.x, d.at.y + 0.18, d.at.z)
  })
  useFrame(({ camera: cam }, dt) => {
    clock.current += tick(dt)
    // (the room's murmur: by how many are sat at the bar; louder with the camera among them)
    if (people) {
      const sat = shown.filter((x) => x.phase === 'sit').length
      const mid = groups.current.values().next().value as THREE.Object3D | undefined
      const d = mid ? cam.position.distanceTo(mid.getWorldPosition(new THREE.Vector3())) : 8
      crowdAmbience(murmur(sat), THREE.MathUtils.clamp(1.4 - d / 12, 0.2, 1), tick(dt))
    }
    let done: number[] = []
    stepFrame(STEP_TURN)
    let paying: { s: Shown; k: number } | null = null
    let queue = 0
    for (const s of shown) {
      s.t += tick(dt)
      // (they come and go whether or not they're drawn: on a phone they aren't, but their plates still follow them)
      const g = groups.current.get(s.id)
      const st = seats[s.seat]
      if (!st) continue
      // (one called off the bench walks in from it, not from the door)
      // (a step straight out from it onto the first counter's aisle first, then along it: cut across from their place to the corner, one from
      // the first bench went through the second and those sat on it (item 193, tests/e2e/_clash193.mjs))
      if (s.from && !s.fromWay) {
        const c0 = counters[0], back = s.from.clone().sub(c0.at).dot(c0.lay) + aisleOf(c0)
        const p = [s.from.clone(), ...(back < -0.02 ? [s.from.clone().addScaledVector(c0.lay, -back)] : []), ...paths[s.seat].path.slice(1 + doorLead.pts.length)]
        s.fromWay = { path: p, len: pathLength(p) }
      }
      const { path, len } = s.phase === 'enter' && s.fromWay ? s.fromWay : paths[s.seat]
      if (s.phase === 'enter') {
        // in through the noren, along the aisle behind the stools (round the corner, for the other counter), and
        // in to their own stool
        // (stopping at the genkan's step a moment, to step out of their shoes and up into slippers)
        const v = SPEED * walkSpeedOf(kindOf(s.id).kind), raw0 = Math.max(0, (s.t - (s.stepHold ?? 0)) * v)
        // (stood out on the step at the sliding door while it's slid open (item 410), then in; one off the bench is in already)
        // (item 623: one still out at the door ahead of them (an umbrella being closed and stood in the stand: three times the door's usual
        // moment), the next one in not there yet: kept unseen, their walk not begun, till that one's in (the Tester window's: on a rain day the
        // next one in was put down in the first, 31 times in three minutes))
        if (!s.from && doorLead.len && s.t < 0.5 && shown.some((o) => o !== s && o.phase === 'enter' && !o.from && (o.t > s.t || (o.t === s.t && o.id < s.id))
          // (item 700: one with an umbrella till it's in the stand just inside: their moment at the door, the walk in, their moment there)
          && o.t - (o.stepHold ?? 0) < (o.gear === 'umbrella' ? UMB_IN_S + doorLead.len / (SPEED * walkSpeedOf(kindOf(o.id).kind)) : DOOR_STEP_IN_S + doorLead.waitD / (SPEED * walkSpeedOf(kindOf(o.id).kind))) + 0.4)) {
          s.t = 0; s.stepHold = 0
        }
        // (item 623: with an umbrella, the moment at the door is its closing and shaking out (UMB_DOOR_S); item 700, the stand in the genkan by
        // the shoe cupboard: then in, and a stop just in from the door beside it to stand it in it (UMB_PUT_S), as a genkan's is used)
        const umbIn = s.gear === 'umbrella' && !s.from && !!doorLead.len
        // (item 832: the stop at the door once they've walked up to it from the street: the door's opened as they came (it ran while they
        // walked the last of the way), a beat there and in; with an umbrella, its closing there)
        const rawDoor = s.from || !doorLead.len ? raw0 : withPause(raw0, doorLead.waitD, (umbIn ? UMB_DOOR_S : DOOR_STEP_IN_S) * v)
        const raw = umbIn ? withPause(rawDoor, doorLead.len, UMB_PUT_S * v) : rawDoor
        // (and with a raincoat, the stop at the step its taking off first (COAT_OFF_S), then the shoes)
        const coatS = s.gear === 'coat' ? COAT_OFF_S : 0
        // (behind their stool they stop, pull it out, step up onto it (the owner's), then sit and slide in with it)
        const stand = len - STOOL_STAND
        // (the genkan's step one at a time (item 414): someone else on it changing their shoes, they wait a body's length back, that time
        // out of their walk)
        const stepD = stepAt(path)
        if (!s.from && waitsForStep(STEP_TURN, s.id, raw, stepD, stepD + (SHOES_S + coatS) * v, QUEUE_GAP)) s.stepHold = (s.stepHold ?? 0) + tick(dt)
        const d = Math.min(stand, withPause(raw, stepD, (SHOES_S + coatS) * v))
        const { p, dir } = alongPath(path, d)
        if (d >= stand) {
          s.pullT = (s.pullT ?? 0) + dt
          const k1 = Math.min(1, s.pullT / STOOL_PULL_S), k2 = Math.min(1, Math.max(0, s.pullT - STOOL_PULL_S) / STOOL_STEP_S)
          // (out from under the counter, where it's put away)
          SEAT_PULL.set(s.seat, -STOOL_TUCK + (STOOL_OUT + STOOL_TUCK) * k1 * k1 * (3 - 2 * k1))
          if (k1 >= 1 && !s.pulledSound) { s.pulledSound = true; if (g) stoolSound(g.getWorldPosition(new THREE.Vector3())) }
          // (stepping from where they stood onto the stool where it's been pulled to)
          p.copy(alongPath(path, stand + (STOOL_STAND - STOOL_OUT) * k2).p)
        }
        s.still = s.lastD !== undefined && Math.abs(d - s.lastD) < 1e-6 && (d < stand || (s.pullT ?? 0) < STOOL_PULL_S)
        s.lastD = d
        // (in through the door faded in, as the takeaways are (they were there at once, whole, in the doorway); one off the bench is in already)
        if (!s.from) s.fade = d >= 0.6 && s.t >= FADE_S ? undefined : Math.min(1, d / 0.6 + s.t / FADE_S)
        g?.position.copy(p)
        // (turned to their way quickly but not at once: at each corner of it they snapped round in a frame)
        if (g) g.rotation.y = s.t < dt * 1.5 ? Math.atan2(dir.x, dir.z) : turnToward(g.rotation.y, d < stand ? Math.atan2(dir.x, dir.z) : st.yaw, dt * 1.5)
        // (welcomed in as they come through the noren: the owner's call passed along by those in (crewTalk, item 324: only the owner and
        // the first server had said it))
        // (item 832: as they come in at the door, not as they're first seen out in the street)
        if (!s.welcomed && s.t > 0.5 && (!!s.from || d >= doorLead.waitD)) {
          s.welcomed = true
          crewWelcome(lang)
        }
        // (item 623, part three: at the door with an umbrella: closed, turned over, shaken; item 700: carried in furled, tip down, and just
        // inside turned to the stand and stood in it, turned back; the beat's own clock the time they've been shown out at the door, held as
        // they walk in, on by the time they've stood by the stand; its place in the stand taken as the hand goes out to it)
        if (umbIn && g) {
          // (item 832: their walk up from the street, the umbrella still up over them, before the beat at the door)
          const bt = Math.max(0, s.t - (s.stepHold ?? 0) - doorLead.waitD / v), ga = gearAtOf(s), put = (rawDoor - doorLead.len) / v
          if (put <= UMB_PUT_S) {
            const pose = umbInBeat(bt <= UMB_DOOR_S ? bt : UMB_DOOR_S + Math.max(0, put), ga.pose)
            ga.umb = s.umbC ?? 0
            if (pose.reach > 0 && (s.umbSlot ?? -1) < 0) {
              const used = Array.from({ length: UMB_SLOTS }, (_, i) => shown.some((o) => o !== s && o.umbSlot === i))
              const f = freeSlot(used)
              s.umbSlot = f >= 0 ? f : UMB_SLOTS - 1
            }
            ga.standAt = UMB_STAND.ready && (s.umbSlot ?? -1) >= 0 ? standGrip(s.umbSlot!, ga.standAt ?? new THREE.Vector3()) : null
            if (pose.inStand && !s.umbIn) { s.umbIn = true; if (ga.standAt) umbrellaSound(ga.standAt, 'in') }
            // (its sounds once each: closed, shaken)
            const at = g.getWorldPosition(GEAR_P)
            if ((s.umbSaid ?? 0) < 1 && bt >= UMB_CLOSE_AT) { s.umbSaid = 1; umbrellaSound(at, 'close') }
            if ((s.umbSaid ?? 0) < 2 && bt >= UMB_CLOSE_AT + 0.85) { s.umbSaid = 2; umbrellaSound(at, 'shake') }
            // (turned to the stand as they go to it, a step toward it as the hand goes out (its mouth a little past their arm))
            if (ga.standAt && g.parent && pose.turn > 0) {
              const st = g.parent.worldToLocal(GEAR_Q.copy(ga.standAt))
              const ty = Math.atan2(st.x - g.position.x, st.z - g.position.z)
              const by = Math.atan2(Math.sin(ty - g.rotation.y), Math.cos(ty - g.rotation.y))
              g.rotation.y += by * pose.turn
              const far = Math.hypot(st.x - g.position.x, st.z - g.position.z)
              if (far > 1e-4) g.position.addScaledVector(GEAR_Q.set(st.x - g.position.x, 0, st.z - g.position.z).divideScalar(far), Math.max(0, far - 0.42) * 0.6 * pose.reach)
            }
          } else ga.umb = -1
        }
        // (with a raincoat: at the step it's taken off first: the hands to its collar, shrugged off, folded, into the left hand; then the shoes)
        const into = (raw - stepAt(path)) / v
        if (coatS > 0) {
          const ga = gearAtOf(s)
          ga.coat = s.coatC ?? 0
          if (into >= 0 && into <= COAT_OFF_S && !s.from) {
            const pose = COAT_POSE.get(s.id) ?? newCoatPose()
            COAT_POSE.set(s.id, pose)
            coatOffBeat(into, pose)
            ga.coatPose = pose
            if (!pose.worn && !s.coatOff) { s.coatOff = true; if (g) coatSound(g.getWorldPosition(GEAR_P)) }
            ga.bundle = pose.bundle
          } else {
            ga.coatPose = null
            if (into > COAT_OFF_S) s.coatOff = true
            ga.bundle = s.coatOff ? 2 : 0
            COAT_POSE.delete(s.id)
          }
          ga.worn = !s.coatOff
        }
        // (at the step: their shoes off and into a cubby of the cupboard, turned to it, a little bow)
        shoeStep(s, g, (into - coatS) / SHOES_S, true)
        s.slippers = d > stepAt(path)
        if (d >= stand && (s.pullT ?? 0) >= STOOL_PULL_S + STOOL_STEP_S) {
          s.phase = 'sit'
          s.slideT = 0
          // (what they're having said now they're sat (item 203: it was called out from the doorway))
          const said = SAY_SEATED.lines.get(s.id)
          if (said !== undefined) { SAY_SEATED.lines.delete(s.id); SAY_SEATED.say(s.id, said) }
          // a plate is set in front of them (or, with a server, brought with the first thing they ordered)
          if (!SERVICE.servers) serve(s.seat, s.id)
        }
      } else if (s.phase === 'sit') {
        // (sliding in to the bar with their stool, then sat where it's always stood)
        if (s.slideT !== undefined && s.slideT < STOOL_SLIDE_S) {
          s.slideT += dt
          const k = Math.min(1, s.slideT / STOOL_SLIDE_S)
          SEAT_PULL.set(s.seat, STOOL_OUT * (1 - k * k * (3 - 2 * k)))
        } else SEAT_PULL.set(s.seat, 0)
        g?.position.copy(st.stool).addScaledVector(backOf(st), SEAT_PULL.get(s.seat) ?? 0)
        if (g) g.rotation.y = st.yaw
        if (s.wipeAt && performance.now() - s.wipeAt > WIPE_MOUTH_MS) { s.phase = 'leave'; s.t = 0; redraw() }
        // (their drink, sipped now and then as they sit (the owner's, 2026-11-10: it stood untouched, gone the moment they left): one every
        // SIP_GAP seconds or so, SIP_S long, SIPS to a drink; none while they wipe their mouth to go)
        if (s.drink && !s.wipeAt && (s.drunk ?? 0) < 1) {
          const now = clock.current
          if (s.sipNext === undefined) s.sipNext = now + 2.5 + (s.id % 4)
          if (s.sipAt !== undefined && now - s.sipAt >= SIP_S) {
            s.sipAt = undefined
            s.drunk = Math.min(1, (s.drunk ?? 0) + 1 / SIPS)
            s.sipNext = now + SIP_GAP * (0.75 + ((s.id * 7 + Math.round(now)) % 6) / 10)
            redraw()
          } else if (s.sipAt === undefined && now >= s.sipNext) s.sipAt = now
        } else if (s.sipAt !== undefined && clock.current - s.sipAt >= SIP_S) s.sipAt = undefined
        // (their miso soup, a mouthful now and then as they eat (item 345, the owner's: 「然後喝湯是怎喝?」): both hands to the bowl, up to the
        // mouth, drunk, down (FolkFigure's soup); never while a sip of their drink's under way, nor once they're wiping their mouth to go)
        const soupKey = `soup:${s.seat}`
        if (SOUP_SEATS.has(s.seat) && BOWLS.setAt.has(soupKey) && !s.wipeAt && leftOf(soupKey) > 0.15) {
          const now = clock.current
          if (s.soupNext === undefined) s.soupNext = now + 3 + (s.id % 5)
          if (s.soupSipAt !== undefined && now - s.soupSipAt >= SOUP_SIP_S) { s.soupSipAt = undefined; s.soupNext = now + 8 + ((s.id * 5 + Math.round(now)) % 7) }
          else if (s.soupSipAt === undefined && s.sipAt === undefined && now >= s.soupNext) s.soupSipAt = now
        } else if (s.soupSipAt !== undefined && clock.current - s.soupSipAt >= SOUP_SIP_S) s.soupSipAt = undefined
        // (now and then, while they wait, off to the toilet: their kind's own)
        const guest = guestsRef.current.find((x) => x.id === s.id)
        if (guest) s.items = guest.items
        // (not once the shop's shut for the day (the owner's item 40: a customer helped themselves to a drink, and paid for it, past closing
        // time); what they've got they drink up)
        // (their first soon after they've sat down, waiting or eating; another once that's drunk, up to three, not after last orders (item 210))
        const thirsty = !s.drink ? drinkRate() : (s.drunk ?? 0) >= 1 && (s.drinks ?? 1) < DRINKS_MAX && !s.wipeAt && !LAST_CALL.on ? REFILL_RATE : 0
        if (fridges && !SHOP.closing && (guest?.state === 'waiting' || guest?.state === 'eating') && thirsty > 0
          && Math.random() < thirsty * flowerBuffs(SHRINE_FLOWERS).drinks * tick(dt)) {
          // (they choose what they want, and go to the fridge it's in)
          const pick = drinkFor(kindOf(s.id).kind, s.id)
          const fr = fridges[fridgeUnitOf(pick)]
          const turn = st.counter === 1 ? [] : [aisleCorner(counters[1])]
          const path = [st.stool.clone(), st.aisle.clone(), ...turn, fr.aisle.clone(), fr.front.clone()]
          s.wc = { who: 'drink', path, len: pathLength(path), unit: fr.n, pick }
          s.phase = 'wcGo'
          s.t = 0
        } else if (wcs && (SICK.has(s.id) || guest?.state === 'waiting' && Math.random() < wcRate() * tick(dt))
          // (one at a time: a toilet someone's on their way to, in, or coming out of is left till they're done)
          && !shown.some((x) => x !== s && x.wc?.who === (HER.has(kindOf(s.id).kind) ? 'f' : 'm') && x.phase.startsWith('wc'))
          // (nor one the stock keeper's gone to change the roll in)
          && STOCKER_WC.who !== (HER.has(kindOf(s.id).kind) ? 'f' : 'm')) {
          const who = HER.has(kindOf(s.id).kind) ? 'f' : 'm'
          const w = wcs[who]
          const turn = st.counter === 1 ? [] : [aisleCorner(counters[1])]
          // (in at the door, past the washstand, round the corner to the toilet)
          const path = [st.stool.clone(), st.aisle.clone(), ...turn, w.aisle.clone(), w.front.clone(), w.inside.clone(), w.turn.clone(), w.stall.clone()]
          s.wc = { who, path, len: pathLength(path) }
          s.phase = 'wcGo'
          s.t = 0
          // (a word as they get up (the owner's): off to the restroom a moment)
          if (!SICK.has(s.id)) onSay?.('guest', LINES[lang].wcGo(s.id, s.id + Math.floor(performance.now() / 7000)), s.id)
        }
      } else if (s.phase === 'wcGo' || s.phase === 'wcBack') {
        // to the door, which slides open as they come up to it, in, and later back out to their stool
        const w = s.wc!
        // (out of a toilet they wait a moment first, for its door to slide open in front of them)
        const wait = s.phase === 'wcBack' && w.who !== 'drink' ? 0.6 : 0
        const d = Math.min(w.len, Math.max(0, s.t - wait) * SPEED * walkSpeedOf(kindOf(s.id).kind))
        // (stood while it does, not treading on the spot (item 50))
        s.still = s.t < wait
        const { p, dir } = alongPath(w.path, s.phase === 'wcGo' ? d : w.len - d)
        g?.position.copy(p)
        if (g) g.rotation.y = turnToward(g.rotation.y, s.phase === 'wcGo' ? Math.atan2(dir.x, dir.z) : Math.atan2(-dir.x, -dir.z), dt * 1.5)
        // (the light switched at its switch, on the post between the two doors outside, as they pass the door: on going in if it's off, off
        // coming out if they put it on and nobody else is in there (item 203: on as they got to the toilet, off as they dried their hands,
        // inside, in the dark either side of it))
        if (w.who !== 'drink' && wcs) {
          const who = w.who as 'm' | 'f'
          const front = pathLength(w.path.slice(0, w.path.length - (s.phase === 'wcGo' ? 3 : 2)))
          if (s.phase === 'wcGo' && !s.wcPast && d >= front) {
            s.wcPast = true
            if (!getLights().wc[who]) { setLightSwitch(who === 'm' ? 'wcM' : 'wcF', true); lightSwitchSound(true); s.wcLit = true }
          } else if (s.phase === 'wcBack' && s.wcPast && w.len - d <= front) {
            s.wcPast = false
            if (s.wcLit && !shown.some((x) => x !== s && x.wc?.who === who && (x.phase === 'wcIn' || x.phase === 'wcWash' || (x.phase === 'wcGo' && x.wcPast)))) {
              setLightSwitch(who === 'm' ? 'wcM' : 'wcF', false)
              lightSwitchSound(false)
            }
            s.wcLit = false
          }
        }
        // (into the stall round the corner, faded out over the last step: put out of sight there at once, they went in a blink, seen from above
        // through the slats of its ceiling)
        // (to a third of themselves at the stall's door, the rest just inside it (below): at x2 the last step was two or three frames, and
        // they still went in a blink)
        // (not faded out any more: seen all the way in, round the corner to the toilet, and sat on it (the owner's, 2026-11-12))
        if (d >= w.len) {
          if (s.phase === 'wcGo') SICK.delete(s.id)
          s.phase = s.phase === 'wcGo' ? 'wcIn' : s.leaving ? 'leave' : 'sit'
          s.t = 0
        }
      } else if (s.phase === 'wcIn') {
        // (in a toilet (the owner's, 2026-11-12: its light switched on going in, and seen using it): its light on if it's off, the last steps
        // from the stall's way in to the toilet, turned round, sat on it a while; up again, it flushes behind them, they say what they
        // thought (below), and walk out round the corner to the washstand)
        let toiletDone = true
        if (s.wc && s.wc.who !== 'drink' && wcs) {
          const who = s.wc.who as 'm' | 'f'
          const w = wcs[who]
          if (s.t - tick(dt) <= 0 && !getLights().wc[who]) { setLightSwitch(who === 'm' ? 'wcM' : 'wcF', true); lightSwitchSound(true); s.wcLit = true }
          const seat = inBar(`wc-seat-${who}`, w.stall), face = inBar(`wc-seatface-${who}`, w.stall)
          s.fade = undefined
          toiletDone = false
          if (s.wcOut) {
            // (on the way out to the washstand: there, washing their hands)
            const o = s.wcOut
            o.t += tick(dt)
            const d = Math.min(o.len, o.t * SPEED * walkSpeedOf(kindOf(s.id).kind))
            const { p: at, dir } = alongPath(o.path, d)
            g?.position.copy(at)
            if (g) g.rotation.y = turnToward(g.rotation.y, Math.atan2(dir.x, dir.z), dt * 3)
            if (d >= o.len) { s.wcOut = undefined; TOILETS[who].handAt = performance.now(); s.phase = 'wcWash'; s.t = 0 }
          } else if (s.t < WC_TO_SEAT) {
            g?.position.lerpVectors(w.stall, seat, s.t / WC_TO_SEAT)
            if (g) g.rotation.y = turnToward(g.rotation.y, Math.atan2(seat.x - w.stall.x, seat.z - w.stall.z), dt * 3)
          } else if (s.t < WC_TO_SEAT + wcStayOf(s.id)) {
            g?.position.copy(seat)
            if (g) g.rotation.y = turnToward(g.rotation.y, Math.atan2(face.x - seat.x, face.z - seat.z), dt * 4)
            if (!s.wcSit) { s.wcSit = true; s.still = true; redraw() }
          } else {
            // (up off it: what's done as they leave it, below, and the way out)
            s.wcSit = false
            s.still = false
            toiletDone = true
            const out = [seat.clone(), w.stall.clone(), w.turn.clone(), w.basin.clone()]
            s.wcOut = { path: out, len: pathLength(out), t: 0 }
            redraw()
          }
        }
        // (at the fridge: facing it, choosing; then their drink in hand, back to their stool. Stood where their way ends each frame, the
        // stepping aside for others on top of it: left where it was, that piled up while someone stood by them, and they jumped back as
        // they set off)
        if (s.wc?.who === 'drink' && g && fridges) {
          g.rotation.y = fridges[s.wc.unit ?? 0].yaw + Math.PI
          g.position.copy(s.wc.path[s.wc.path.length - 1])
          // (stood there choosing, their feet still: left walking, they trod on the spot the whole while, a hand in the fridge (item 50))
          s.still = true
        }
        if (toiletDone && (s.wc?.who === 'drink' ? s.t > DRINK_STAY : s.wcOut?.t === 0)) {
          // (out of the toilet: it flushes behind them, and they say what they thought of it, if it's worth saying)
          if (s.wc && s.wc.who !== 'drink') {
            const t = TOILETS[s.wc.who]
            const was = looksOf(t.room)
            const u = visitRoom(t.room)
            t.room = u.room
            t.flushAt = performance.now()
            if (u.complaint) WC_GRUMBLE.set(s.id, Math.max(WC_GRUMBLE.get(s.id) ?? 0, penaltyOf(u.complaint)))
            const L = LINES[lang]
            // (no complaint: relieved, as they come out (the owner's); a clean one said so now and then)
            if (u.complaint === 'paper') onSay?.('guest', L.wcPaper(s.id), s.id)
            else if (u.complaint === 'dirty') onSay?.('guest', L.wcDirty(s.id), s.id)
            else if (was === 'fresh' && Math.random() < 0.4) onSay?.('guest', L.wcNice(s.id), s.id)
            else onSay?.('guest', L.wcBack(s.id, s.id + Math.floor(performance.now() / 5000)), s.id)
          }
          // (the empty, brought back, put in the crate of empties by the fridges; the next taken (item 210))
          if (s.wc?.who === 'drink' && (!s.drink || (s.drunk ?? 0) >= 1)) {
            s.drink = s.wc.pick ?? drinkFor(kindOf(s.id).kind, s.id)
            s.drunk = 0
            s.sipAt = undefined
            s.sipNext = undefined
            s.drinks = (s.drinks ?? 0) + 1
            // (taken from among the others on its shelf: its clink, glass or a can, heard at the fridge)
            const u = takeDrink(s.drink)
            if (u >= 0) bottleClink(isCan(s.drink), FRIDGE_AT[u])
            // (out of a fridge left open too long, not cold: they mind (item 615, game/fridgeTemp; game/reputation's 'warm'), and say so)
            if (u >= 0 && servedWarm(DRINK_FRIDGE_TEMP.units[u]?.now ?? 0)) { gripe(s.id, 'warm'); onSay?.('guest', LINES[lang].warmDrink(s.id), s.id) }
            onDrink?.(s.id, s.drink)
            redraw()
          }
          if (s.wc && s.wc.who !== 'drink' && wcs) {
            // (out round the corner to the washstand, to wash their hands, the tap running; then out the way they came in, from there)
            const who = s.wc.who
            const w = wcs[who]
            const turn = st.counter === 1 ? [] : [aisleCorner(counters[1])]
            const back = [st.stool.clone(), st.aisle.clone(), ...turn, w.aisle.clone(), w.front.clone(), w.inside.clone(), w.basin.clone()]
            s.wc = { ...s.wc, path: back, len: pathLength(back) }
          } else {
            s.phase = 'wcBack'
            s.t = 0
            s.still = false
          }
        }
      } else if (s.phase === 'wcWash') {
        // (at the washstand, facing it, washing their hands)
        const w = wcs![s.wc!.who as 'm' | 'f']
        g?.position.copy(w.basin)
        if (g) g.rotation.y = w.basinYaw
        s.still = true
        // (walked out to it from the toilet, seen all the way)
        s.fade = undefined
        if (s.t > HAND_S) {
          // (then a step to the hand dryer on the wall beside, turned to it, hands under it while it blows)
          const who = s.wc!.who as 'm' | 'f'
          if (s.t - dt <= HAND_S) {
            const t = TOILETS[who]
            t.dryAt = performance.now()
            // (one in two takes a paper towel too, while there's one (game/washroom))
            if (takesTowel(s.id)) { const took = takeOne(t.towels); t.towels = took.left; if (took.got) t.towelAt = t.dryAt }
          }
          const dry = inBar(`wc-dryer-${who}`, w.basin)
          const k = Math.min(1, (s.t - HAND_S) / 0.3)
          const to = w.basin.clone().lerp(dry.clone().setY(w.basin.y), 0.55)
          g?.position.lerpVectors(w.basin, to, k * k * (3 - 2 * k))
          if (g) g.rotation.y = w.basinYaw + Math.atan2(Math.sin(Math.atan2(dry.x - w.basin.x, dry.z - w.basin.z) - w.basinYaw), Math.cos(Math.atan2(dry.x - w.basin.x, dry.z - w.basin.z) - w.basinYaw)) * k
        }
        if (s.t > HAND_S + HAND_DRY_S) {
          // (out of the toilet: its light put out at the switch outside as they pass it, above)
          s.phase = 'wcBack'; s.t = 0; s.still = false; s.fade = undefined
        }
      } else {
        // a moment to get up, then off the way they came, by the till: they stop there to pay, and again at the genkan's step
        const lp = leavePaths[s.seat]
        const v = SPEED * walkSpeedOf(kindOf(s.id).kind)
        const raw = Math.max(0, (s.t - 0.8 - (s.hold ?? 0)) * v)
        const payAt = lp.len - lp.payD
        // (one with nothing to pay (gone before anything came, and nothing drunk) goes by the till without stopping (item 195: they paid the
        // whole bill, given back to them, into the drawer)); the money taken as the cash key's pressed, once
        const payD = lp.payD && paysAtTill(GUEST_BILLS.of(s.id)) ? lp.payD : 0
        // (the stops on the way out taken in the order they come along it (item 414): since the genkan's step was drawn back toward the bar
        // (item 410) it's the step first, their shoes on, then the till down in the genkan, then the sliding door; the till's stop was taken
        // first, as it had come first, and they paid stood at the step, 1.5 from the till, 6.8 s on it. Where each begins in the walk's own
        // terms (`raw`, the time stood at the stops in it): its place along it, and the stops before it)
        // (item 623: with a raincoat off, the stop at the step its putting on after the shoes (COAT_ON_S): whether, fixed as they set off (the
        // Tester window's: asked each frame, it was gone the moment the coat was on, the stop that much shorter, and they were a stride and a
        // half on in a frame, 1 m)
        s.coatLeave ??= s.gear === 'coat' && !!s.coatOff
        const coatS = s.coatLeave ? COAT_ON_S : 0
        const shoeAt = lp.len - stepAt(lp.path), shoeHold = (SHOES_S + coatS) * v, payHold = payD ? PAY_S * v : 0
        const payFirst = payAt <= shoeAt
        const payRaw = payAt + (payFirst ? 0 : shoeHold), shoeRaw = shoeAt + (payFirst ? payHold : 0)
        // (no cashier sat at the till: they wait at it, a server called round to ring them up (item 203: the register took their money by itself),
        // and pay once one's behind it; at most TILL_WAIT_MAX, then as before)
        {
          const tc = tillCall.current
          if (payD && raw >= payRaw && raw < payRaw + payHold && !cashierIn()) {
            if (tc.who < 0) { tc.who = s.id; tc.since = clock.current; tc.there = false }
            if (tc.who === s.id && !tc.there && clock.current - tc.since < TILL_WAIT_MAX) s.hold = (s.hold ?? 0) + dt
          } else if (tc.who === s.id) { tc.who = -1; tc.there = false }
        }
        if (payD && raw >= payRaw + 0.44 * payHold && !TILL_CASH.paid.has(s.id)) payIn(s.id, billFor(s).bill, paysByCard(s.id), tenderOf(billFor(s).bill, s.id))
        // (in the queue for the till (the owner's): someone else at it paying, they wait a body's length back till it's free)
        // (or the cashier handing a takeaway's bag over it, item 203)
        if (lp.payD && ((TILL_STATE.k >= 0 && TILL_STATE.payer !== s.id) || TAKEOUT_STAND.handing) && raw >= payRaw - QUEUE_GAP && raw < payRaw) s.hold = (s.hold ?? 0) + dt
        // (and for the genkan's step, one at a time (item 414): someone else on it changing their shoes, they wait a body's length back)
        else if (waitsForStep(STEP_TURN, s.id, payFirst ? withPause(raw, payAt, payHold) : raw, shoeAt, shoeAt + shoeHold, QUEUE_GAP)) s.hold = (s.hold ?? 0) + tick(dt)
        // (a word getting up, if they ate; at the till, the cashier's thanks and the bill; the money handed over, theirs)
        const said = s.said ?? 0
        if (said < 1 && s.t > 0.3) {
          s.said = 1
          if (payD && guestsRef.current.find((x) => x.id === s.id)?.state !== 'angry') onSay?.('guest', LINES[lang].payGo(s.id, s.id), s.id)
        }
        // (getting up: their stool pushed back with them first, then pushed home by them, stood behind it, before they walk off (item 203: it
        // slid home by itself, 0.3 s after they'd gone, their back to it 0.6 off down the aisle))
        const back = STOOL_LEAVE * Math.min(1, s.t / STOOL_PULL_S)
        // (and last, just in from the sliding door, a moment as they slide it open (item 410))
        const toDoor = payFirst ? withPause(withPause(raw, payAt, payHold), shoeAt, shoeHold) : withPause(withPause(raw, shoeAt, shoeHold), payAt, payHold)
        // (item 700: with their umbrella in the stand by the shoe cupboard, that stop beside it, and longer: it's taken out first (UMB_TAKE_S);
        // whether, fixed as they set off, as the raincoat's; the door held open for them meanwhile, not let shut and slid open again)
        s.umbLeave ??= s.gear === 'umbrella' && !!s.umbIn
        const inAt = lp.len - doorLead.len, inHold = doorLead.len ? (DOOR_SLIDE_S + (s.umbLeave ? UMB_TAKE_S : 0)) * v : 0
        const d = Math.max(0, Math.min(lp.len, Math.max(back, withPause(toDoor, inAt, inHold))))
        if (g) { if (s.umbLeave && toDoor >= inAt && toDoor < inAt + inHold) DOOR_BOUND.add(g); else DOOR_BOUND.delete(g) }
        const { p, dir } = alongPath(lp.path, lp.len - d)
        const home = Math.max(0, s.t - STOOL_HOME_AT)
        // (pushed home in under the counter, done as they turn to go at 0.8)
        if (home < STOOL_SLIDE_S) SEAT_PULL.set(s.seat, s.t < STOOL_HOME_AT ? back : STOOL_LEAVE - (STOOL_LEAVE + STOOL_TUCK) * (home / STOOL_SLIDE_S))
        else SEAT_PULL.delete(s.seat)
        s.still = s.lastD !== undefined && Math.abs(d - s.lastD) < 1e-6 && d < lp.len
        s.lastD = d
        s.slippers = lp.len - d > stepAt(lp.path)
        g?.position.copy(p)
        if (g) g.rotation.y = s.t < 0.8 ? st.yaw : turnToward(g.rotation.y, Math.atan2(-dir.x, -dir.z), dt * 1.5)
        // (at the step on the way out: their shoes out of their cubby and on)
        shoeStep(s, g, (raw - shoeRaw) / (SHOES_S * v), false)
        // (item 623, part three: then the raincoat: out of the left hand, shaken open, arms into it, the collar set)
        if (s.gear === 'coat') {
          const ga = gearAtOf(s), intoC = (raw - shoeRaw) / v - SHOES_S
          ga.coat = s.coatC ?? 0
          if (coatS > 0 && intoC >= 0 && intoC <= COAT_ON_S) {
            const pose = COAT_POSE.get(s.id) ?? newCoatPose()
            COAT_POSE.set(s.id, pose)
            coatOnBeat(intoC, pose)
            ga.coatPose = pose
            if (pose.worn && s.coatOff) { s.coatOff = false; if (g) coatSound(g.getWorldPosition(GEAR_P)) }
            ga.bundle = pose.bundle
          } else {
            ga.coatPose = null
            if (intoC > COAT_ON_S) s.coatOff = false
            ga.bundle = s.coatOff ? 2 : 0
            COAT_POSE.delete(s.id)
          }
          ga.worn = !s.coatOff
        }
        // (and their umbrella out of the stand (item 700: by the shoe cupboard, at the stop just in from the door): turned to it, taken out,
        // turned back; carried out furled, tip down; out past the door, raining, opened over them, dry held furled; then they go. The beat's
        // clock the time stood by the stand, held as they walk out, on by the time they've been out there; whether it's raining taken as
        // it's taken out, so one going to open it out there isn't let fade as they walk out to it)
        const take = s.umbLeave ? (toDoor - inAt) / v : -1
        if (s.umbLeave && g && take >= 0) {
          const ga = gearAtOf(s)
          s.outWet ??= RAIN_NOW.k > 0.15
          if (d >= lp.len - 0.005) s.outT = s.outT === undefined ? 0 : s.outT + tick(dt)
          const ot = s.outT !== undefined ? UMB_TAKE_S + s.outT : Math.min(take, UMB_TAKE_S)
          const pose = umbOutBeat(ot, s.outWet, ga.pose)
          ga.umb = s.umbC ?? 0
          ga.standAt = UMB_STAND.ready && (s.umbSlot ?? -1) >= 0 ? standGrip(s.umbSlot!, ga.standAt ?? new THREE.Vector3()) : null
          if (!pose.inStand && s.umbIn) { s.umbIn = false; if (ga.standAt) umbrellaSound(ga.standAt, 'out') }
          if (s.outWet && (s.umbSaid ?? 0) < 3 && ot >= UMB_TAKE_S + 0.35) { s.umbSaid = 3; umbrellaSound(g.getWorldPosition(GEAR_P), 'open') }
          if (ga.standAt && g.parent && pose.turn > 0) {
            const st = g.parent.worldToLocal(GEAR_Q.copy(ga.standAt))
            const ty = Math.atan2(st.x - g.position.x, st.z - g.position.z)
            const by = Math.atan2(Math.sin(ty - g.rotation.y), Math.cos(ty - g.rotation.y))
            g.rotation.y += by * pose.turn
            const far = Math.hypot(st.x - g.position.x, st.z - g.position.z)
            if (far > 1e-4) g.position.addScaledVector(GEAR_Q.set(st.x - g.position.x, 0, st.z - g.position.z).divideScalar(far), Math.max(0, far - 0.42) * 0.6 * pose.reach)
          }
        }
        // (at the till, facing it: the register's reading follows what they owe)
        // (waiting to pay: on the way out and not yet past the till)
        if (payD && raw < payRaw + payHold) queue++
        if (payD && raw >= payRaw && raw < payRaw + payHold) {
          if (g) g.rotation.y = Math.atan2(counters[0].lay.x, counters[0].lay.z)
          paying = { s, k: (raw - payRaw) / payHold }
          const k = paying.k
          // (once the register's on their bill: the frame they step up it's still the last one's)
          if ((s.said ?? 0) < 2 && k > 0.12 && TILL_STATE.payer === s.id) {
            s.said = 2
            const bill = TILL_STATE.bill
            const tcs = tillCall.current.staff
            const by = cashierIn() || tcs < 0 ? 'role:cashier' : tcs === TILL_BY_PLATER ? plater?.id ?? 'role:cashier' : ownerServes ? 'owner' : servers[tcs]?.id ?? 'role:cashier'
            STAFF_TALK.push({ key: performance.now() + s.id, id: by, text: LINES[lang].cashierThanks(`NT$${yen(bill)}`, Math.floor(getClock().minute / 60)), until: performance.now() + 3800 })
            // (and thanks from one or two more of those in (item 324))
            crewThanks(lang, by)
          }
          if ((s.said ?? 0) < 3 && k > 0.62 && TILL_STATE.payer === s.id) {
            s.said = 3
            setPayFloats((all) => [...all, { key: performance.now() + s.id, id: s.id, text: `+NT$${yen(TILL_STATE.bill)}` }])
          }
          if ((s.said ?? 0) < 4 && k > 0.86) {
            s.said = 4
            onSay?.('guest', LINES[lang].payThanks(s.id, s.id + 1), s.id)
          }
        }
        // (out of the door they fade away, the last stretch, and no quicker than FADE_S: through it, they stand on there till they're gone
        // (let go at its end, a long stride at ×2 left them a third seen, a blink out of sight))
        // (past the sliding door they fade, down its step (item 410): over the last 0.3, not the last 0.9, which began in front of it)
        const leaveFade = doorLead.len ? 0.3 : 0.9
        // (item 623: not while they're at the stand taking their umbrella: they fade once they've it in hand, open or furled)
        // (item 700: taken out just inside, and raining, not till it's opened out past the door)
        const atStand = !!s.umbLeave && (s.umbIn || (!!s.outWet && (s.outT ?? 0) < umbOutS(true) - UMB_TAKE_S))
        if (atStand) s.fadeT = 0
        else if (lp.len - d < leaveFade) s.fadeT = (s.fadeT ?? 0) + dt
        s.fade = Math.max(0, Math.min(1, Math.max((lp.len - d) / leaveFade, 1 - (s.fadeT ?? 0) / FADE_S)))
        // (and if they've somehow not got out in all the time it can take, they're gone all the same)
        if ((d >= lp.len && s.fade <= 0) || raw > lp.len + (PAY_S + SHOES_S + COAT_ON_S + DOOR_SLIDE_S + 2 + 8) * v) done.push(s.id)
      }
      // (their stool where it's been moved to by hand: sat on it there, and stepped up to it and away from it there)
      const mk = SEAT_MARKS.get(s.seat), fr = frame.current
      if (g && mk && fr) {
        fr.worldToLocal(mk.getWorldPosition(SEAT_SHIFT)).sub(st.stool)
        if (SEAT_SHIFT.lengthSq() > 1e-8) {
          const w = THREE.MathUtils.clamp((1.2 - Math.hypot(g.position.x - st.stool.x, g.position.z - st.stool.z)) / 0.8, 0, 1)
          g.position.addScaledVector(SEAT_SHIFT, w * w * (3 - 2 * w))
        }
      }
      // (the name tag goes with the body: gone a little before they are, so none is left hanging in the doorway)
      const tag = labels.current.get(s.id)
      // (seen in the toilet now, sat on it (the owner's, 2026-11-12): hidden only if faded right out)
      const hidden = s.phase === 'wcIn' && s.wc?.who !== 'drink' && s.fade !== undefined && s.fade <= 0
      if (g) g.visible = !hidden
      // (drei's Html draws its page bit whether its group's shown or not: inside the stall, their words hung on the toilet's wall with no
      // one under them, the owner's ghost bubble; hidden here with the body)
      if (tag) {
        tag.style.opacity = s.fade !== undefined ? String(Math.max(0, Math.min(1, s.fade * 1.6 - 0.5))) : ''
        const vis = hidden ? 'hidden' : ''
        if (tag.style.visibility !== vis) tag.style.visibility = vis
      }
      // (turned toward the way they're to face a frame at a time: each step above sets it outright (along their way, to their seat, to the
      // till), and they spun round at every corner, up to 180° in a frame. A facing set this frame is the one to turn to; one left alone,
      // the last such is still)
      // (kept by the figure, not on its userData: React puts a new userData on it each time the bar redraws, and with it gone the facing
      // was taken afresh from the one set this frame, up to 2.5 rad in a frame (item 242; the step stool's lift had the same, item 220))
      if (g) {
        const u = facings.current.get(g)
        if (!u) facings.current.set(g, { shown: g.rotation.y, want: g.rotation.y })
        else {
          if (g.rotation.y !== u.shown) u.want = g.rotation.y
          u.shown = turnToward(u.shown, u.want, dt)
          g.rotation.y = u.shown
        }
      }
      // (down a step, standing in the genkan)
      // (sat on a toilet: lowered so the seat they're lifted onto is its seat's height (FolkFigure's SEAT, a stool's))
      // (going up or down the sliding door's steps (item 410) no faster than STEP_Y_RATE: a slow frame at x2 took two steps at once, a drop
      // of 0.24 in a frame; put in the scene, where they're shown, at once)
      if (g && given) {
        // (from the height they were shown at last: their walk puts them back on the floor's each frame)
        const ty = s.wcSit ? WC_SIT_LIFT : genkanY(counters, g.position)
        const most = STEP_Y_RATE * tick(dt), was = s.shownY
        s.shownY = was === undefined || s.t <= tick(dt) * 1.5 ? ty : was + Math.max(-most, Math.min(most, ty - was))
        g.position.y = s.shownY
      }
    }
    // (item 623, part three: what stands in the umbrella stand, from those in: each one's whose umbrella's in it, at its place)
    {
      const now = UMB_STAND.now
      now.fill(-1)
      for (const s of shown) if (s.umbIn && (s.umbSlot ?? -1) >= 0) now[s.umbSlot!] = s.umbC ?? 0
      let changed = false
      for (let i = 0; i < UMB_SLOTS; i++) if (now[i] !== UMB_STAND.colours[i]) { UMB_STAND.colours[i] = now[i]; changed = true }
      if (changed) UMB_STAND.ver++
    }
    // (the register and the money follow what's being paid: each dish rung up in turn, the total, the note laid on the tray, the drawer out and
    // the note put in it, the change worked out and set on the tray, the drawer shut, the change taken)
    if (paying) {
      const { s: x, k } = paying
      const { parts, items, bill } = billFor(x)
      // (the note they hand over (game/till's tenderOf, item 210: it went no higher than ten thousand, a bill over it short))
      const given = tenderOf(bill, x.id)
      const rung = Math.min(parts.length, Math.floor(k / 0.32 * parts.length) + 1)
      TILL_STATE.text = yen(k < 0.32 ? parts.slice(0, rung).reduce((a, b) => a + b, 0) : k < 0.62 ? bill : Math.max(0, given - bill))
      // (a card: rung up and paid on the reader, the drawer staying shut and no money changing hands; cash: the cashier presses the cash key
      // at 0.44, the drawer shoots out, the note goes in, the change comes out, and at 0.78 it's pushed shut)
      const card = paysByCard(x.id)
      TILL_STATE.card = card
      TILL_STATE.drawer = drawerOpens(card) && k >= 0.44 && k < 0.78 ? 1 : 0
      TILL_STATE.k = k
      TILL_STATE.tender = card ? 0 : given
      TILL_STATE.change = card ? 0 : Math.max(0, given - bill)
      TILL_STATE.bill = bill
      TILL_STATE.payer = x.id
      TILL_STATE.parts = parts
      TILL_STATE.items = items
    } else {
      TILL_STATE.drawer = 0
      TILL_STATE.k = -1
      TILL_STATE.tender = 0
      TILL_STATE.change = 0
      TILL_STATE.card = false
    }
    // (the liquor shop's deliveries come in (item 243): each case due paid for and put in the back; no cash for it, sent back; a word as they
    // come, from the stocker if there's one)
    if (clock.current - deliveryLook.current > 1) {
      deliveryLook.current = clock.current
      const { arrived, still } = arrivals(DRINK_COMING.list, getClock().day * 1440 + getClock().minute)
      if (arrived.length) {
        DRINK_COMING.list = still
        for (const d of arrived) {
          const r = buyCase(DRINK_BACK.back, d.id, SHOP_PURSE.cash())
          if (r.ok) { DRINK_BACK.back = r.back; SHOP_PURSE.spend(caseCost(d.id)) }
        }
        DRINK_BACK.ver++
        const names = [...new Set(arrived.map((d) => d.id))].map((id) => { const x = DRINKS.find((q) => q.id === id); return x ? (lang === 'ja' ? x.ja : lang === 'en' ? x.en : x.zh) : id })
        if (stocker) STAFF_TALK.push({ key: performance.now() + 0.3, id: stocker.id, text: LINES[lang].deliveryIn(names.join('、'), arrived.length), until: performance.now() + 3200 })
      }
    }
    TILL_STATE.queue = queue
    TILL_STATE.tablet = tabletActive(queue, TILL_STATE.k >= 0 && TILL_STATE.card)
    SEATS_TAKEN.clear()
    for (const x of shown) SEATS_TAKEN.add(x.seat)
    // (and the places not cleared and laid again since their last customer: no one new sat at them meanwhile (item 600))
    SEATS_UNCLEARED.clear()
    // (left uncleared with no one on their way to it: a server sent to clear it (it's in their carry), the next from the bench is called and
    // walks over as they do, the server there first and clearing as they come (waiting till it was cleared, the Tester's rush let 12% fewer
    // through, the places standing empty a server's whole walk and clearing each time))
    const coming = new Set(waiters.current.flatMap((x) => x.carry ?? []))
    for (const r of runs.current) if ((r.phase === 'dirty' && !coming.has(r.key)) || (r.phase === 'clear' && r.t < 0)) SEATS_UNCLEARED.add(r.seat)
    for (const n of SEAT_LEFT.keys()) SEATS_UNCLEARED.add(n)
    // (bare of its pair: but free as soon as a server's at it clearing it, what was left lifted onto their tray: the next customer called from
    // the bench walks over while it's wiped and laid, done before they reach it (the Tester's: waiting till it was laid, a rush let 12% fewer
    // through); bare with no one laying it (none clean), not)
    for (const n of CHOPS_OFF) if (!waiters.current.some((x) => x.phase === 'clearTake' && x.seat === n)) SEATS_UNCLEARED.add(n)
    SEATS_SAT.clear()
    for (const x of shown) if (x.phase === 'sit') SEATS_SAT.add(x.seat)
    // (and whose chopsticks are up off their rest, in their hand: those sat eating)
    CHOPS_UP.clear()
    for (const x of shown) if (x.phase === 'sit' && FED.has(x.id)) CHOPS_UP.add(x.seat)
    // (eaten with: to be washed once they've gone (item 600))
    for (const n of CHOPS_UP) CHOPS_USED.add(n)
    // nobody walks through anybody: those walking (in, out, to the toilet or the fridge) keep a body's width apart,
    // stepping aside for each other, and for the servers and the stock keeper (who keep to their way, their trays and cases held level)
    // (seen coming, and stepped aside at a walk (the owner's item 45, 2026-11-13): pushed apart only once they'd walked into each other, a
    // customer met head on by a server with a tray stood half in them for a frame, and in the next was thrown up to half a body's width
    // aside at x2 (tests/e2e/_pushjump.mjs); and the stock keeper they walked right through. Now how near each two will pass is seen from how
    // they're going (where their ways had them this frame and the last): the nearest they'll come within AHEAD_S seconds. The step aside
    // that needs is taken as they come up, the more the nearer they are to passing, and each one's step aside is eased to that, and back
    // onto their way once they're by, no quicker than ASIDE_V)
    {
      const step = tick(dt)
      const stamp = ++asideTick.current
      const walkers: { p: THREE.Vector3; give: boolean; id: number; vx: number; vz: number; ax: number; az: number; s?: Shown }[] = []
      const add = (p: THREE.Vector3, give: boolean, id: number, s?: Shown) => {
        // (how they're going: from where their way had them the frame before; a leap (a phase begun somewhere else) is no walk)
        const was = lastAt.current.get(id)
        let vx = 0, vz = 0
        if (was && step > 0) { vx = (p.x - was.x) / step; vz = (p.z - was.z) / step }
        if (vx * vx + vz * vz > WALK_MOST * WALK_MOST) { vx = 0; vz = 0 }
        walkers.push({ p, give, id, vx, vz, ax: 0, az: 0, s })
      }
      for (const x of shown) {
        // (item 676: their hands, where they hang at their sides, against something there: drawn in as they walk by it (FolkFigure))
        const go = groups.current.get(x.id)
        if (go) { const [tl, tr] = x.phase === 'sit' ? TUCK_NONE : tuckOf(go); go.userData.tuckL = tl; go.userData.tuckR = tr }
        if (x.phase === 'wcIn' && x.wc?.who !== 'drink') continue
        const gp = groups.current.get(x.id)?.position
        // (those sitting don't move aside, but nobody walks through them either: the ones going by step round them)
        if (gp) add(gp, x.phase !== 'sit', x.id, x)
      }
      waiters.current.forEach((w, wi) => add(waiterObjs.current[wi]?.position ?? w.pos, false, -1 - wi))
      if (STOCKER_FIG.o?.visible) add(STOCKER_FIG.o.position, false, STOCKER_KEY)
      // (item 659: and the owner on his way home from where he was put down: they step round him, he keeps to his way)
      if (BOSS_BED.passing && frame.current) {
        const b = bossMover.current ?? (bossMover.current = scene.getObjectByName('BossFollow') ?? null)
        if (b?.parent && b.visible) add(frame.current.worldToLocal(b.getWorldPosition(BOSS_AT)), false, BOSS_KEY)
        else if (b && !b.parent) bossMover.current = null
      }
      // (and those waiting on the bench, on their way to it, sat there or on their way out: they keep to their way, the rest step round them
      // (item 193: going by in the aisle, customers walked through one stood before their place on it))
      // (on their way in or out they step aside as everyone walking does (item 414: one on their way in to the bench and one on their way out
      // of it walked through each other at the genkan's step, neither giving way); sat, they keep to their place)
      sitters.current.forEach((v) => { const o = sitterObjs.current.get(v.id); if (o && !v.handed) add(o.position, v.phase !== 'sit', SITTER_KEY - v.id) })
      // (a body's width, the round bodies' shoulders and all, so no two ever overlap)
      const R = 0.38
      // (what stands against the first counter's wall, measured every few seconds)
      const wallC = counters[0], keep = wallKeep.current, nowS = performance.now() / 1000
      if (given && wallC && frame.current && (nowS - keep.at > 3 || nowS < keep.at)) { keep.at = nowS; measureWall(scene, frame.current, wallC, keep) }
      /** how far one can step that way (sx, sz) from where their way has them before they'd touch what stands against the first counter's
       * wall, or, the other way, the first counter's stools (a body's half width and 2 cm from either); no end to it if neither is that way */
      const roomToward = (p: THREE.Vector3, sx: number, sz: number) => {
        if (!wallC || !keep.boxes.length) return Infinity
        const toWall = -(sx * wallC.lay.x + sz * wallC.lay.z)
        if (Math.abs(toWall) <= 1e-3) return Infinity
        const dx = p.x - wallC.at.x, dz = p.z - wallC.at.z
        const al = dx * wallC.along.x + dz * wallC.along.z, ly = dx * wallC.lay.x + dz * wallC.lay.z
        let room = Infinity
        if (toWall > 0) { for (const b of keep.boxes) if (al >= b.a0 - R / 2 && al <= b.a1 + R / 2) room = Math.min(room, Math.max(0, ly - (b.front + R / 2 + 0.02)) / toWall) }
        else if (stoolLine && ly < stoolLine.back && al >= stoolLine.a0 && al <= stoolLine.a1) room = Math.max(0, stoolLine.back - R / 2 - 0.02 - ly) / -toWall
        return room
      }
      // (and those walking the first counter's aisle past what stands out from its wall keep in toward the counter, eased in and out as a
      // step aside is (item 387: by the cats' stand, kept to the aisle's line, customers went into the cat at its front: aisleSqueeze))
      if (wallC && stoolLine && keep.boxes.length) {
        const line = -aisleOf(wallC), zones = aisleSqueeze(keep.boxes, line, stoolLine.back, R / 2)
        if (zones.length) for (const w of walkers) {
          if (!w.give) continue
          const dx = w.p.x - wallC.at.x, dz = w.p.z - wallC.at.z
          const al = dx * wallC.along.x + dz * wallC.along.z, ly = dx * wallC.lay.x + dz * wallC.lay.z
          if (ly > line + 0.12 || ly < line - 0.3) continue
          const want = squeezeLay(zones, line, al) - ly
          if (want > 0) { w.ax += wallC.lay.x * want; w.az += wallC.lay.z * want }
        }
      }
      const met = new Set<string>()
      for (let i = 0; i < walkers.length; i++) for (let j = i + 1; j < walkers.length; j++) {
        const a = walkers[i], b = walkers[j]
        if (!a.give && !b.give) continue
        const lo = a.id < b.id ? a : b, hi = lo === a ? b : a
        const rx = lo.p.x - hi.p.x, rz = lo.p.z - hi.p.z, d = Math.hypot(rx, rz)
        // (the nearest they'll pass, and how soon: lo from hi then)
        const ux = lo.vx - hi.vx, uz = lo.vz - hi.vz, uu = ux * ux + uz * uz
        const tc = uu > 1e-6 ? THREE.MathUtils.clamp(-(rx * ux + rz * uz) / uu, 0, AHEAD_S) : 0
        const cx = rx + ux * tc, cz = rz + uz * tc, dc = Math.hypot(cx, cz)
        const need = Math.max(R - d, (R - dc) * (1 - tc / AHEAD_S))
        if (need <= 0) continue
        const key = `${lo.id}|${hi.id}`
        met.add(key)
        // (which way lo steps from hi (and hi from lo): to the side they'd pass each other on, as it was when they first saw it coming,
        // kept till they're by (it doesn't turn about as they pass, nor as one turns a corner). Pushed apart along the line between them,
        // two head on stood stuck in the aisle till their ways crossed, and the push turned about with it: they swapped places in a frame
        // (tests/e2e/_poptrail.mjs); dead on, to one side of the way they're coming)
        let side = passing.current.get(key)
        if (!side) {
          let sx = cx, sz = cz, s = dc
          if (s < 0.02) { sx = -uz; sz = ux; s = Math.sqrt(uu) }
          if (s < 1e-4) { sx = 1; sz = 0; s = 1 }
          side = { x: sx / s, z: sz / s }
          // (and passed the other way round if that's where there's room: with the benches or the helmet's stand that way of whichever has to
          // step aside, they go round each other on the room's side (item 193: held off the benches, a customer met there by a server, who
          // keeps to his way, stood in him as they passed))
          const fits = (x: number, z: number) => Math.min(need, (lo.give ? roomToward(lo.p, x, z) : 0) + (hi.give ? roomToward(hi.p, -x, -z) : 0))
          if (fits(-side.x, -side.z) > fits(side.x, side.z) + 1e-3) { side.x = -side.x; side.z = -side.z }
          // (and two going the same way with no room abreast (the benches one side of the aisle, the stools the other) go one behind the
          // other: whichever's ahead a step on, the other a step back (item 193: two leaving together walked the aisle in each other))
          if (fits(side.x, side.z) < need - 1e-3) {
            const vx = lo.vx + hi.vx, vz = lo.vz + hi.vz, vv = Math.hypot(vx, vz)
            if (vv > 0.3 && uu < 0.25 * vv * vv) { const ahead = rx * vx + rz * vz >= 0 ? 1 : -1; side.x = (ahead * vx) / vv; side.z = (ahead * vz) / vv }
          }
          passing.current.set(key, side)
        }
        // (two walking: half of it each; one into someone who doesn't give (sat, or a server with a tray): all of it, round them)
        // (and one with the benches or the helmet's stand behind them steps back toward it only as far as there's room: the other takes the
        // rest, into the room behind the stools if it's there (item 193: held off the benches, the two passing went into each other))
        let sl = lo.give ? (hi.give ? need * 0.5 : need) : 0, sh = hi.give ? (lo.give ? need * 0.5 : need) : 0
        const rl = lo.give ? roomToward(lo.p, side.x, side.z) : 0, rh = hi.give ? roomToward(hi.p, -side.x, -side.z) : 0
        if (sl > rl) { if (hi.give) sh += sl - rl; sl = rl }
        if (sh > rh) { if (lo.give) sl = Math.min(rl, sl + sh - rh); sh = rh }
        if (lo.give) { lo.ax += side.x * sl; lo.az += side.z * sl }
        if (hi.give) { hi.ax -= side.x * sh; hi.az -= side.z * sh }
      }
      for (const k of passing.current.keys()) if (!met.has(k)) passing.current.delete(k)
      // (each one's step aside eased to what it should be now: out as they come up, back once they're by)
      const most = ASIDE_V * step
      for (const w of walkers) {
        const was = lastAt.current.get(w.id)
        if (was) { was.x = w.p.x; was.z = w.p.z; was.f = stamp } else lastAt.current.set(w.id, { x: w.p.x, z: w.p.z, f: stamp })
        let off = aside.current.get(w.id)
        if (!off) {
          if (w.ax === 0 && w.az === 0) continue
          off = { x: 0, z: 0, f: stamp }
          aside.current.set(w.id, off)
        }
        off.f = stamp
        const tx = w.ax - off.x, tz = w.az - off.z, t = Math.hypot(tx, tz)
        const k = t > most ? most / t : 1
        off.x += tx * k; off.z += tz * k
        w.p.x += off.x; w.p.z += off.z
        // (and never stepped aside into what stands against the first counter's wall, the benches and the helmet's stand (item 193: stepping
        // aside for someone, customers went 0.11 to 0.24 into a bench's seat): a step toward it goes no nearer it than just short of
        // touching it (a body's half width and 2 cm from its front), or than their own way has them, if that runs nearer it (to a place on
        // the bench, and up from it)
        if (w.give && wallC && keep.boxes.length) {
          const dx = w.p.x - wallC.at.x, dz = w.p.z - wallC.at.z
          const al = dx * wallC.along.x + dz * wallC.along.z
          let ly = dx * wallC.lay.x + dz * wallC.lay.z
          const own = ly - (off.x * wallC.lay.x + off.z * wallC.lay.z)
          for (const b of keep.boxes) {
            if (al < b.a0 - R / 2 || al > b.a1 + R / 2) continue
            const near = Math.min(b.front + R / 2 + 0.02, own)
            if (ly >= near) continue
            // (back no quicker than a step aside: come up to it stepped aside further, they'd have jumped back in a frame; its ends are
            // reached a body's half width early, so they're back by then)
            const back = Math.min(near - ly, most)
            w.p.x += wallC.lay.x * back; w.p.z += wallC.lay.z * back; off.x += wallC.lay.x * back; off.z += wallC.lay.z * back
            ly += back
          }
        }
        // (a step aside is a step: stood in a queue or at the genkan's step, eased aside they slid across the floor, their feet still (item 50))
        if (w.s && w.give && t * k > 0.002) w.s.still = false
        if (w.ax === 0 && w.az === 0 && Math.abs(off.x) + Math.abs(off.z) < 1e-4) aside.current.delete(w.id)
      }
      // (those gone, or into a toilet's stall, forgotten: out of it, they're stood where they come out and set off from there)
      aside.current.forEach((v, id) => { if (v.f !== stamp) aside.current.delete(id) })
      lastAt.current.forEach((v, id) => { if (v.f !== stamp) lastAt.current.delete(id) })
    }
    // the fridge's door opens for whoever's at it (as they come up to it, while they take their drink, as they leave it)
    if (fridges) for (const fr of fridges) {
      FRIDGE_STATE[fr.n].passing = shown.filter((x) => x.wc?.who === 'drink' && (x.wc.unit ?? 0) === fr.n && (x.phase === 'wcIn'
        || ((x.phase === 'wcGo' || x.phase === 'wcBack') && (groups.current.get(x.id)?.position.distanceTo(fr.front) ?? 9) < 0.7))).length
      // (the stocker fills it from behind now, its back's hatch open for him (items 431, 535): its front stays shut)
      // (a door left open by hand shuts as soon as anyone else has to go by it: the door swings out over the way, so nobody
      // walks through it)
      if (FRIDGE_STATE[fr.n].open && !FRIDGE_STATE[fr.n].passing) {
        const near = (v: THREE.Vector3 | undefined) => !!v && v.distanceTo(fr.front) < 1.5
        const byCustomer = shown.some((x) => x.phase !== 'sit' && near(groups.current.get(x.id)?.position))
        const byServer = waiterObjs.current.some((o) => near(o?.position))
        if (byCustomer || byServer) FRIDGE_STATE[fr.n].open = false
      }
    }
    // the toilets' doors open for whoever's going through them just now
    if (wcs) for (const who of ['m', 'f'] as const) {
      // (and shut behind them while they're in: locked, its window showing 使用中)
      TOILETS[who].passing = shown.filter((x) => x.wc?.who === who && (x.phase === 'wcGo' || x.phase === 'wcBack')
        && (groups.current.get(x.id)?.position.distanceTo(wcs[who].front) ?? 9) < 1.3).length + (STOCKER_WC.who === who && STOCKER_WC.near ? 1 : 0)
      TOILETS[who].inside = shown.filter((x) => x.wc?.who === who && (x.phase === 'wcIn' || x.phase === 'wcWash')).length + (STOCKER_WC.who === who && STOCKER_WC.inside ? 1 : 0)
    }
    // (the ids held as they are now: the update may run later, once `done` below is a new empty list, and then it took nobody out; those out of
    // the door stayed listed, holding their stool's number, asking every frame to be taken out and drawing the bar again each time)
    if (done.length) {
      const gone = done
      setShown((cur) => { const next = cur.filter((x) => !gone.includes(x.id)); return next.length === cur.length ? cur : next })
    }
    done = []

    // anyone who sat down while the racks were bare gets a plate as soon as one's back on them
    if (waiting.current.length && PLATE_RACK.n > 0) {
      const w = waiting.current.shift()!
      serve(w.seat, w.guest)
    }

    // (a customer gone: what they left at their place besides their plate (item 600: their bowls, the renge, their chopsticks), cleared with
    // it; their plate taken already, or none, on its own for a server to clear (a 'bare' run: no plate drawn))
    if (SEAT_LEFT.size) {
      for (const [seat, left] of SEAT_LEFT) {
        const atSeat = runs.current.filter((x) => x.seat === seat && (x.phase === 'dirty' || (x.phase === 'clear' && x.t < 0)))
        const r = atSeat[0]
        // (the place's one pair counted once, whichever of what's still at it holds it: one who sat at it uncleared ate with the pair already
        // on its rest (the Tester's, item 600: 61 pairs, two customers' leftovers each a pair))
        if (r) {
          const pair = atSeat.reduce((n, x) => n + (x.ware?.chops ?? 0), 0)
          const add = leftAdded({ ...noWares(), chops: pair }, left)
          r.ware = addWares(r.ware ?? noWares(), { ...add, chops: add.chops - pair })
        }
        else if (seats[seat]) {
          const by = waiters.current.length > 0
          runs.current.push({ key: ++runSeq.current, seat, guest: -1, phase: by ? 'dirty' : 'clear', t: by ? 0 : -CLEAR_DELAY, from: plateAt(seat), bare: true, ware: left, dirt: 0, sticks: 0, bones: 0 })
        }
      }
      SEAT_LEFT.clear()
      WARE.ver++
      redraw()
    }
    // the plates on the move: lifted off the stack in an arc to the seat, and cleared away to the dirty stack
    const step = tick(dt)
    sweep.current += step
    if (sweep.current > 1) {
      sweep.current = 0
      for (const r of runs.current) {
        if (r.phase !== 'set') continue
        if (!shownRef.current.some((x) => x.seat === r.seat && x.phase !== 'leave')) leftDirty(r)
      }
      // (a plate on a tray no server's holding any more (their round cut short: the staff changed, the shop shut) isn't left hanging in the
      // air where it was (the owner saw plates floating): one being carried to a customer goes back on the plating place's stack (or the racks, with
      // that full); one cleared off the bar goes on into the sink as a dirty plate)
      const holding = new Set<number>()
      for (const x of waiters.current) {
        if (x.run !== null && x.run !== undefined) holding.add(x.run)
        for (const k of x.carry ?? []) holding.add(k)
      }
      for (const r of [...runs.current]) {
        if (r.phase === 'carry' && !holding.has(r.key)) {
          runs.current = runs.current.filter((x) => x !== r)
          if (PLATING.stock < STACK_CAP) PLATING.stock += 1
          else PLATE_RACK.n = putBack(PLATE_RACK.n, 1)
          redraw()
        } else if (r.phase === 'taken' && !holding.has(r.key)) {
          SINK_BIN.sticks += r.sticks ?? 0
          binThrow([r])
          r.phase = 'clear'
          r.to = undefined
          r.t = 0
        }
      }
    }
    let finished = 0, homed = 0
    for (const r of runs.current) {
      r.t += step
      const o = runObjs.current.get(r.key)
      if (r.phase === 'set' || r.phase === 'dirty' || r.phase === 'taken' || (r.phase === 'clear' || r.phase === 'home') && r.t < 0 || r.phase === 'carry' || r.phase === 'ready') {
        if (r.phase === 'set' || r.phase === 'dirty') o?.position.copy(plateAt(r.seat))
        if (r.phase === 'ready' && o) { o.position.copy(platingPlace(readyAlong(r.slot ?? 0))); o.scale.setScalar(ON_TABLE); o.rotation.y = PASS_YAW }
        // (set down, turned to lie along its customer's counter (item 228: seatTurn); on the tray, the server's turning it as they set it down)
        if (o && (r.phase === 'set' || r.phase === 'dirty')) o.rotation.y = PASS_YAW + seatTurn(r.seat)
        continue
      }
      if (r.phase === 'clear' && !r.to) {
        // setting off: from where it is, to the next free place on the dirty stack
        if (o) r.from = o.position.clone()
        const flying = runs.current.filter((x) => x !== r && x.phase === 'clear' && x.to && x.t !== Infinity).length
        r.to = dirtyAt(dirty.current + flying)
      }
      const to = r.phase === 'clear' || r.phase === 'home' ? r.to! : plateAt(r.seat)
      // (the longer its way, the longer its flight and the higher its arc)
      const far = r.from.distanceTo(to)
      const k = Math.min(1, r.t / Math.max(r.phase === 'serve' ? SERVE_S : r.phase === 'home' ? HOME_S : CLEAR_S, far * FLY_PER))
      const e = k * k * (3 - 2 * k)
      if (o) {
        o.position.lerpVectors(r.from, to, e)
        o.position.y += Math.sin(Math.PI * k) * (0.22 + far * 0.12)
        // (one handed over the bar from the racks (no one on the floor): lying along its customer's counter all the way (item 228))
        if (r.phase === 'serve') o.rotation.y = PASS_YAW + seatTurn(r.seat)
        o.rotation.z = Math.sin(Math.PI * k) * 0.12
        // (down to its size in the sink as it goes into it, and back up as it comes out)
        if (r.phase === 'clear') o.scale.setScalar(1 - (1 - IN_SINK) * e)
        else if (r.phase === 'home') o.scale.setScalar(IN_SINK + (1 - IN_SINK) * e)
      }
      if (k >= 1) {
        if (r.phase === 'serve') r.phase = 'set'
        else if (r.phase === 'home') {
          // (washed, back on the racks)
          r.t = Infinity
          PLATE_RACK.n = putBack(PLATE_RACK.n, 1)
          homed++
        } else {
          r.t = Infinity
          finished++
        }
      }
    }
    // the plating place: a plate laid in one of its slots (Roasting lays it, for a seat's first food) is drawn there from then on; one whose slot's gone
    // without being taken up (its customer left before it went, the food binned, the plate put back on the stack) goes with it
    for (let k = 0; k < READY_SLOTS; k++) {
      const sl = PLATING.slots[k]
      const r = runs.current.find((x) => x.phase === 'ready' && x.slot === k)
      if (sl?.plate && !r) {
        const g = shownRef.current.find((x) => x.seat === sl.seat && x.phase !== 'leave')
        runs.current.push({ key: ++runSeq.current, seat: sl.seat, guest: g?.id ?? -1, phase: 'ready', slot: k, t: 0, from: platingPlace(readyAlong(k)), kind: kindFor(g?.id) })
        redraw()
      } else if (r && (!sl || !sl.plate || sl.seat !== r.seat)) {
        runs.current = runs.current.filter((x) => x !== r)
        redraw()
      }
      // (a later dish's carrier dish while it waits there)
      const cr = carriers.current[k]
      if (cr) cr.visible = !!sl && !sl.plate && sl.landed + sl.flying > 0
      // (how long it's been ready to go: what's for it all down on it, nothing more on its way)
      readyFor.current[k] = sl && sl.landed > 0 && sl.flying === 0 ? readyFor.current[k] + step : 0
    }
    for (const b of passQ.current) if (b.server === undefined) b.wait += step
    const sitting = (n: number) => shownRef.current.some((x) => x.seat === n && (x.phase === 'sit' || x.phase.startsWith('wc')))
    /** a slot of the plating place ready to go, for a customer sat at their place, that no server's on their way for */
    // (the one that's waited the longest, not the first along: in a rush the plating place's last slot waited behind the others coming
    // ready again and again, its food holding two of the tray's four places (item 317))
    const readySlot = () => {
      let best = -1
      for (let k = 0; k < READY_SLOTS; k++) {
        const sl = PLATING.slots[k]
        if (sl && readyFor.current[k] >= READY_S && sitting(sl.seat) && !waiters.current.some((x) => x.slot === k) &&
          (best < 0 || readyFor.current[k] > readyFor.current[best])) best = k
      }
      return best
    }

    // the kitchen's plater (the third cook, or with none the second, between his rounds of the orders; the owner's at the fire): when the plating place's stack of clean plates runs low, across the
    // kitchen to the racks for a few and back with them to the plating place, set down there for plating on, and back to their place
    {
      const pl = platerRun.current
      // (the third cook at their place with nothing to do (the second cook doing it is Roasting's to tell: he may be off fetching))
      if (plater?.role === 'sous') idleTick(plater.id, pl.phase === 'idle' && FIRE_TEND.want === null && !SHOP.leaving, dt)
      // (someone to keep the fire: the grill asks them rather than dropping the coals in itself)
      FIRE_TEND.tender = !!given && !ownerServes && open
      CRATE.tended = FIRE_TEND.tender
      const home = () => (plater ? inBar(`crew-${plater.id}`, ownerAt()) : ownerAt()).setY(0)
      /** which way the one at their place faces, in the bar's frame (null: no one there to match) */
      const yawOfCrew = () => {
        const o = plater ? markOf(`crew-${plater.id}`) : null, f = frame.current
        if (!o || !f) return null
        const q = f.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(o.getWorldQuaternion(new THREE.Quaternion()))
        const z = new THREE.Vector3(0, 0, 1).applyQuaternion(q)
        return Math.atan2(z.x, z.z)
      }
      const walk = (then: () => void) => {
        const d = Math.min(pl.len, pl.t * SERVER_SPEED)
        const { p, dir } = alongPath(pl.path, d)
        pl.pos.copy(p)
        // (turned to the way quickly but not at once: setting off from their place, they snapped round from how they stood there)
        if (dir.x || dir.z) pl.yawTo = Math.atan2(dir.x, dir.z)
        if (d >= pl.len) { pl.t = 0; then() }
      }
      // (going: stood in for from just how the one at their place stands)
      const away = (on: boolean) => {
        if (on) { const y = yawOfCrew(); if (y !== null) pl.yaw = pl.yawTo = y }
        if (plater) PLATER_OUT.id = on ? plater.id : null; else ownerAway('plate', on)
      }
      // (worn out, at half pace (the owner's))
      pl.t += step * paceOfStaff(plater?.id)
      // (the cooker cooking, by the game's clock; cooked, full and keeping warm, said in the kitchen's log (the owner's))
      {
        const r = kamaTick(RICE.kama, step)
        RICE.kama = r.kama
        if (r.cooked) { RICE.rice = RICE.batch; onSay?.('chef', LINES[lang].riceDone) }
        // (the soup's pot heating up in its well, the same)
        // (as fast as the well's heat has it: not at all with it off)
        const s = potTick(SOUP.pot, step * heatRate(heatNow(SOUP.heat, SOUP.pot)))
        SOUP.pot = s.pot
        if (s.hot) { SOUP.left = SOUP.batch; onSay?.('chef', LINES[lang].soupDone) }
      }
      /** where they stand at the cooker; its top, where the rice goes in */
      const kamaSpot = () => { marks.current.delete('cooker-front'); return inBar('cooker-front', home()).setY(0) }
      const kamaTop = () => { marks.current.delete('cooker-top'); return inBar('cooker-top', home()) }
      /** where they stand at the rice-ball counter's board, and the board (Decor's PrepCounter, item 129) */
      const prepSpot = () => { marks.current.delete('prep-front'); return inBar('prep-front', home()).setY(0) }
      const prepBoard = () => { marks.current.delete('prep-board'); return inBar('prep-board', home()) }
      // (item 392: the garnishes' grater on the rice-ball counter, and where one stands at it; none drawn, null)
      const graterAt = () => (markOf('prep-grater') ? inBar('prep-grater', home()) : null)
      const garnishSpot = () => { marks.current.delete('prep-garnish-front'); return inBar('prep-garnish-front', home()).setY(0) }
      /** the open sack of rice (by the sake, just past the kitchen's edge): its middle, the kitchen's edge nearest it (the route there), and
       * where they stand at it, stepped down off the kitchen's floor to it */
      const sackSpots = () => {
        marks.current.delete('RiceSackOpenSet')
        const at = inBar('RiceSackOpenSet', home()).setY(0)
        const c0 = counters[0], d = at.clone().sub(c0.at)
        const a = THREE.MathUtils.clamp(d.dot(c0.along), kitchen.along[0] + 0.2, kitchen.along[1] - 0.2)
        const l = THREE.MathUtils.clamp(d.dot(c0.lay), kitchen.lay[0] + 0.2, kitchen.lay[1] - 0.2)
        const edge = c0.at.clone().addScaledVector(c0.along, a).addScaledVector(c0.lay, l).setY(0)
        return { at, edge, front: at.clone().add(edge.clone().sub(at).setY(0).setLength(0.34)) }
      }
      /** where they stand at the two skewer holders on the cook table's front (the used ones' right of the notch, the clean ones' left of it):
       * the nearest spot on the floor clear of the table (right under one, they stood half in the table's face) */
      const skTraySpot = () => skewerSpot('skewer-tray', home())
      const skHolderSpot = () => skewerSpot('skewer-holder', home())
      const faceTo = (v: THREE.Vector3) => { pl.yawTo = Math.atan2(v.x - pl.pos.x, v.z - pl.pos.z) }
      /** where they stand on the kitchen's floor to reach something on (or by) the cook table: the nearest spot clear of it that a way reaches
       * from where they are (game/kitchenPath's reachSpot; the nearest side alone (standClear) could be one no way reaches: the sake stand,
       * moved along the table's back by the owner, was reached from the gap between the table and the bar, the way there none, and the
       * second cook walked the straight line through the table and the fire bed and back, the hearth's guard throwing him out of it a metre
       * and more each frame (the owner, 2026-11-15: the dayaudit, 193 pushes, 20 jumps of 1.7 m)) */
      const reachOf = (v: THREE.Vector3) => {
        const blocks = kitchenBlocks()
        if (!blocks.length) return v.clone().setY(0)
        const k = kitchenOf(counters)
        const [a, l] = reachSpot(flat(v), flat(pl.pos), { x0: k.along[0], z0: k.lay[0], x1: k.along[1], z1: k.lay[1] }, blocks)
        const c0 = counters[0]
        return c0.at.clone().addScaledVector(c0.along, a).addScaledVector(c0.lay, l).setY(0)
      }
      /** the middle of what's drawn of something (its node's origin is wherever its model put it: the bucket's is the cook table's) */
      const middleOf = (name: string) => {
        marks.current.delete(name)
        const o = markOf(name), f = frame.current
        if (!o || !f) return home()
        f.updateWorldMatrix(true, false)
        return f.worldToLocal(new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()))
      }
      const crateAt = () => middleOf('coal-crate')
      const bucketAt = () => middleOf('WaterBucket')
      /** where the bucket's dipped from: a step toward it in his own place when it's by it (the third cook's bay), or null: from further off
       * (the second cook plating from the board, the bucket moved in edit mode), the floor by it, as for anything on the table */
      const dipFrom = () => {
        const b = bucketAt(), h = home()
        const d = Math.hypot(b.x - h.x, b.z - h.z)
        return d < DIP_NEAR ? h.clone().lerp(b.setY(h.y), Math.max(0, d - DIP_REACH) / d) : null
      }
      /** a step or two straight to a spot in his own place: no way round the table to find (the kitchen's ways go round it, out of his bay) */
      const stepTo = (to: THREE.Vector3, phase: typeof pl.phase) => { pl.path = [pl.pos.clone(), to.clone()]; pl.len = pathLength(pl.path); pl.phase = phase; pl.t = 0 }
      const soupPot = () => middleOf('miso-pot')
      /** where one stands to stir the soup: before the counter's front across from the pot, as far out from it as at the cooker (on the line
       * through the cooker's own place square across the counter). Item 387: it was the pot's middle moved by the cooker's step back from
       * its own; the pot stands further in on the counter than the cooker, and that put them in the counter to the chest, the top through
       * them (the owner's 「有個致命的問題動作都會深陷進模型去」) */
      const soupStand = () => frontOf(soupPot(), kamaSpot(), kamaTop())
      const hearthAt = () => { marks.current.delete('FirePit'); return inBar('FirePit', home()) }
      /** where the water's thrown from: his own bay at the table's far end (Roasting's SOUS_AT), facing in over the hearth's near side */
      const hearthSpot = () => home()
      /** the sack of binchotan on the floor past the table's far end, where the crate's filled from */
      const coalSackAt = () => middleOf('coal-sack')
      /** where he stands to lift an armful out of it: the side of it a way reaches from where he is, the shortest walk (game/kitchenPath's
       * reachSpot): out of his bay past the table's end, on the sack's kitchen side. (Its nearest clear spot was between the table's side and
       * the counter, off the kitchen's floor: no way found there, he walked the straight line through the table's end, and the table's guard
       * put him out of it a frame at a time, to one side and then the other, four leaps a trip (item 54).) */
      const sackReach = () => {
        const blocks = kitchenBlocks()
        if (!blocks.length) return coalSackAt().setY(0)
        const c0 = counters[0], k = kitchenOf(counters)
        const [a, l] = reachSpot(flat(coalSackAt()), flat(pl.pos), { x0: k.along[0], z0: k.lay[0], x1: k.along[1], z1: k.lay[1] }, blocks)
        return c0.at.clone().addScaledVector(c0.along, a).addScaledVector(c0.lay, l).setY(0)
      }
      /** turned to face something where they stand, quickly but not at once, for `dur` seconds; then on */
      const turnTo = (v: THREE.Vector3, dur: number, then: () => void) => {
        pl.yawTo = Math.atan2(v.x - pl.pos.x, v.z - pl.pos.z)
        if (pl.t > dur) { pl.t = 0; then() }
      }
      const setOff = (to: THREE.Vector3, phase: typeof pl.phase) => {
        pl.path = kitchenRoute(pl.pos, to)
        // (home: the last step onto just where they stand at their place (the route stops at the nearest clear floor, as much as 0.7 off:
        // the one at their place shown again there, they jumped))
        if ((phase === 'home' || phase === 'toFill' || phase === 'toHearth' || phase === 'toSake') && pl.path.length && pl.path[pl.path.length - 1].distanceTo(to) > 0.02) pl.path.push(to.clone())
        pl.len = pathLength(pl.path)
        pl.phase = phase
        pl.t = 0
      }
      /** a customer's dish from the stove, the fryer or the board (items 461, 469, the owner's 「用平底鍋來煎料」「可以炸薯條、天婦羅」)
       * taken to make: to its station, made there (the burner lit, the basket let down, the rice rolled), then to the serving counter with
       * it, as the bowls are; the first asked for (one sat at the bar just now) first; more of the same with it as its station allows
       * (game/station's kitchenBatch: the fryer's basket three, the board and the little pot two, a pan one), as many as there are rows
       * free at the serving counter to set them out in */
      const takeKitchen = () => {
        const k = KITCHEN.want.findIndex((x) => guestSeat(x.guest) >= 0)
        if (k < 0) return
        const w = KITCHEN.want.splice(k, 1)[0]
        const station = stationOf(w.id) ?? 'stove'
        // (not kept from starting while the serving counter's full: it's set out when it's made, the rows freed by then, or held till one is)
        const free = Math.max(1, freeRowsNow()), more: { guest: number; seat: number }[] = []
        for (let i = 0; i < KITCHEN.want.length && 1 + more.length < Math.min(kitchenBatch(w.id), free); ) {
          const x = KITCHEN.want[i]
          if (x.id === w.id && guestSeat(x.guest) >= 0) { more.push({ guest: x.guest, seat: guestSeat(x.guest) }); KITCHEN.want.splice(i, 1) } else i++
        }
        kitchenJob.current = { guest: w.guest, seat: guestSeat(w.guest), id: w.id, station, of: batchSeconds(w.id, 1 + more.length), row: freeRow(), more }
        pl.pos.copy(home())
        setOff(station === 'board' ? prepSpot() : inBar(`${station}-front`, home()).setY(0), 'toStation')
        away(true)
      }
      /** (item 835) off to put the rice on: the cooker's empty, to the open sack for the next pot's rice, then to the sink to wash it */
      const riceRun = () => {
        dayPrep.current.rice = true
            // (the cooker's empty: to the open sack for the next pot's rice, over the kitchen's edge to it, then to the sink to wash it)
            pl.pos.copy(home())
            const sk = sackSpots()
            pl.path = [...kitchenRoute(pl.pos, sk.edge), sk.front]
            pl.len = pathLength(pl.path)
            pl.phase = 'toSack'
            pl.t = 0
            away(true)
      }
      /** (item 835) off to make the soup, or top up a pot run low */
      const soupRun = () => {
        dayPrep.current.soup = true
            // (or run low, hot: the next pot's worth made and added, the pot kept hot (item 207))
            // (the soup's pot empty (the day's start): to it to make it, water and dashi in and the miso stirred in, then it heats in its well)
            pl.pos.copy(home())
            pl.making = true
            setOff(soupStand(), 'toSoup')
            away(true)
      }
      /** off for plates for the plating place's stack: off the low rack by the table while it has any (a few steps), else across the kitchen
       * to the racks */
      const goPlates = () => {
        // (called out as they go: the plates short (item 324))
        if (plater) crewCall(lang, 'plates', plater.id)
        pl.pos.copy(home())
        pl.src = plateSource(LOW_RACK.n)
        pl.path = kitchenRoute(pl.pos, pl.src === 'low' ? lowFront() : rackFront(rackNow()))
        pl.len = pathLength(pl.path)
        pl.phase = 'toRack'
        away(true)
      }
      if (!given || ownerServes) {
        // (nobody to plate: a bar on its own, or the owner out serving it all himself; the plating place's stack kept up as it's used, and
        // the rice cooked by itself)
        // (the low rack kept full off the racks, and the plating place's stack off it first)
        if (open && LOW_RACK.n < LOW_FULL && PLATE_RACK.n > 0) { LOW_RACK.n += 1; PLATE_RACK.n -= 1 }
        if (open && PLATING.stock < STACK_CAP) {
          if (LOW_RACK.n > 0) { PLATING.stock += 1; LOW_RACK.n -= 1 } else if (PLATE_RACK.n > 0) { PLATING.stock += 1; PLATE_RACK.n -= 1 }
        }
        // (a pot set on only with rice (or the soup's makings) in stock, and only as much as there is (item 199: made full from nothing))
        if (open && riceGoes(RICE.kama) && anyInStock(['Onigiri'])) { RICE.kama = setOn(); RICE.batch = batchOf('Onigiri', RICE_FULL) }
        if (open && soupGoes(SOUP.pot) && anyInStock(['MisoSoup'])) { SOUP.pot = setSoup(); SOUP.batch = batchOf('MisoSoup', SOUP_BOWLS) }
        if (open && washGoes(SKEWERS.s)) SKEWERS.s = washAll(SKEWERS.s)
      } else if (pl.phase === 'idle') {
        // (the second cook, plating with no third cook to: not while he's fetching an order or skewering it at the board)
        // (the owner doing it, with no third cook: not while he's off on another job, the washing up (item 216: two of him at once))
        // (and not with the shop open till the third cook's in at his place (game/shopState's ON_DUTY: his walk in from the door done): sent off
        // from his place while he was still out at the door or on his way, which was where his mark was, and home to it, he went out to the
        // steps and jumped back (item 411))
        if (pl.t > 0.5 && (!!plater || ownerFree('plate')) && platerFree(!!plater && FETCHER.id === plater.id, FETCHER.busy) && !(plater && open && !ON_DUTY.in.has(plater.id))) {
          pl.t = 0
          // (item 835: how long the oldest of each of his three jobs for those sat at the bar has been waited on (ms), -1 none he can take now)
          const tq = performance.now(), atBar = open && !SHOP.leaving && !!STATION_OBJ.group
          const ageOf = (g: number, at?: number) => (guestSeat(g) >= 0 ? tq - (at ?? tq) : -1)
          const jobAges = {
            bowls: atBar && !bowlJob.current && freeRow() >= 0 && bowlsNow() ? BOWLS.want.reduce((m, x) => Math.max(m, ageOf(x.guest, x.at)), -1) : -1,
            kitchen: atBar && !kitchenJob.current ? KITCHEN.want.reduce((m, x) => Math.max(m, ageOf(x.guest, x.at)), -1) : -1,
            sake: atBar && !sakeJob.current ? SAKE.want.reduce((m, g) => Math.max(m, ageOf(g, SAKE_AT.get(g))), -1) : -1,
          }
          if (open && !SHOP.leaving && FIRE_TEND.want && !FIRE_TEND.done) {
            // (the fire's asked for: charcoal from the crate, or water from the bucket on the table by his bay, first of all)
            pl.pos.copy(home())
            pl.fire = FIRE_TEND.want
            away(true)
            if (pl.fire === 'tidy') {
              // (the irons at his right hand in his bay: taken up and the bed raked over where he stands, none of it walked (item 108))
              pl.path = []; pl.len = 0; pl.phase = 'rake'; faceTo(hearthAt())
              IRONS.until = performance.now() + RAKE_S * 1000
            } else if (pl.fire === 'coal') {
              // (in his bay the crate's at his right hand: turned to it, a handful taken, turned back and tipped in, none of it walked (the
              // owner's); with too little in it for a handful, first out to the sack on the floor for an armful to fill it)
              if (CRATE.left >= COAL_PER_ADD.max || SUPPLIES.coal() < 1) { pl.path = []; pl.len = 0; pl.phase = 'turnCrate' }
              else setOff(sackReach(), 'toCoalSack')
              // (called out: the fire wanting coal (item 324))
              if (plater) crewCall(lang, 'coal', plater.id)
            } else { const near = dipFrom(); if (near) stepTo(near, 'toBucket'); else setOff(reachOf(bucketAt()), 'toBucket') }
          } else if (open && !SHOP.leaving && !dayPrep.current.rice && riceGoes(RICE.kama) && anyInStock(['Onigiri'])) {
            // (item 837, the Tester window's: the day's first pot of rice put on first thing, before the plates: the plates went first, then
            // only with no one waiting, and the day's rice was ready 45 to 77 minutes after the doors opened, the soup 57 to 89, the first to
            // ask for them going without. The rice the longest to come, its cooking going on by itself once it's on; the plates are wanted only
            // once the first fish is off the fire, a good while after the first order)
            riceRun()
          } else if (open && !SHOP.leaving && !dayPrep.current.soup && soupGoes(SOUP.pot) && anyInStock(['MisoSoup'])) {
            soupRun()
          } else if (open && !SHOP.leaving && platerGoes(PLATING.stock, PLATING.coming, PLATE_RACK.n + LOW_RACK.n)) {
            // (the plating place running low: plates before anything else but the fire, nothing done coming off the fire can be served without
            // one (item 207); seen to as it runs low, not once it's bare, and before a late dish or a pour of sake (item 630: bare 45% of a
            // rush, and a third of the time still with it after the sake, the third cook off at a station while the low rack stood full))
            goPlates()
          } else if (open && !SHOP.leaving && riceGoes(RICE.kama) && anyInStock(['Onigiri']) && BOWLS.want.some((x) => x.rice && guestSeat(x.guest) >= 0)) {
            // (item 835, the Tester window's: the rice's pot empty with someone sat waiting on a bowl of it: put on next, after the fire and the
            // plates; at the bottom of his list (below the late dishes, the sake, the bowls, the till and the skewers) it stood empty five hours
            // of a rush's evening, its bowls never filled. The longest to come (washed, then cooked), so the first of the two)
            riceRun()
          } else if (open && !SHOP.leaving && (soupGoes(SOUP.pot) || topUpGoes(SOUP.pot, SOUP.left)) && anyInStock(['MisoSoup']) && BOWLS.want.some((x) => x.soup && guestSeat(x.guest) >= 0)) {
            soupRun()
          } else if (jobAges.bowls >= 0 && jobAges.bowls >= jobAges.kitchen && jobAges.bowls >= jobAges.sake) {
            // (item 835: a customer's bowls, a dish off the stove, the fryer or the board, and a tokkuri: whichever's been waited on longest
            // taken first (from when it was asked for); the late dish (KITCHEN_DUE_MS from its asking, which was at the door) went before all
            // the rest, and in a rush one always was: of 34 who'd asked for rice or soup 20 had none)
            // (a customer's rice and soup (items 205, 206): over to the cooker for the rice, to the pot for the soup, both filled by hand,
            // then to the serving counter with them; only with some ready to fill (bowlsNow, item 207), and a place at the counter to set
            // them down in (another customer's may wait there already: item 207))
            const b = nextBowls()
            if (b) {
              bowlJob.current = { ...b, by: 'plater', stage: b.rice ? 'rice' : 'soup', t: 0, riceFill: 0, soupFill: 0, W: null, row: freeRow() }
              // (the clean bowls out of the cabinets for it as it's begun, the soup's renge with it (item 600))
              takeBowlsFor(b)
              pl.pos.copy(home())
              setOff(b.rice ? riceStand() : soupFillAt().stand, b.rice ? 'toRiceBowl' : 'toSoupBowl')
              away(true)
            }
          } else if (jobAges.kitchen >= 0 && jobAges.kitchen >= jobAges.sake) {
            // (a dish from the stove, the fryer or the board waited on long enough: made before the sake's poured, the plates fetched and the
            // bowls filled (item 461's evening: below them all, it was never come to while the sake kept coming, and those who'd ordered only
            // a dish off the stove sat with nothing for three hours of the shop's, or went))
            // (its station a long while from the plating place: the stack topped up first if it's short of full (item 630))
            if (PLATING.stock + PLATING.coming < STACK_CAP && PLATE_RACK.n + LOW_RACK.n > 0) goPlates()
            else takeKitchen()
          } else if (open && !SHOP.leaving && SAKE.want.length && !sakeJob.current && STATION_OBJ.group) {
            // (item 630: its own again: put in under the late dish's (f166ab30), a sake was poured only when a dish was late too, a second
            // one's over the one being poured, and with none asked for, an empty one queued (the grating and the rice balls held for it))
            // (a customer's tokkuri of sake (item 177, the owner's: "the way it goes looks odd, and not professional"): over to the sake station
            // on the serving counter, the open bottle kept there in reach, and poured by hand; left there with its cup for a server to carry out
            // (the stand on the cook table is out of everyone's reach: its bottle lifted and poured itself, and the tokkuri appeared at the seat))
            const guest = SAKE.want.shift()!, seat = guestSeat(guest)
            // (not at the bar to be found just now: back in the queue for a little later; gone (or none: an empty one queued by the old
            // mix-up above), let go of, not round the queue for ever, the grating and the rice balls held for it (item 630))
            if (seat < 0) { if (guestHere(guest)) SAKE.want.push(guest) }
            else {
              sakeJob.current = { guest, seat, pourer: 'plater', t: -1 }
              sakeSpots.current.delete(seat)
              sakeSpotOf(seat)
              pl.pos.copy(home())
              setOff(stationSpot(), 'toSake')
              away(true)
            }
          } else if (open && !SHOP.leaving && !kitchenJob.current && STATION_OBJ.group && KITCHEN.want.some((x) => guestSeat(x.guest) >= 0)
            && PLATING.stock + PLATING.coming < STACK_CAP && PLATE_RACK.n + LOW_RACK.n > 0) {
            // (a dish at its station is a long while away from the plating place: its stack topped up first (item 630: with it gone, what
            // came off the fire waited for a plate))
            goPlates()
          } else if (open && !SHOP.leaving && !kitchenJob.current && STATION_OBJ.group && KITCHEN.want.some((x) => guestSeat(x.guest) >= 0)) {
            takeKitchen()
          } else if (tillCall.current.who >= 0 && tillCall.current.staff < 0 && !cashierIn() && given) {
            // (someone waiting at the till with no cashier sat at it, no server free for it: round to the back of it to ring them up (item 203);
            // the till's back reached from the kitchen as the takeaway stand behind it is (standSpots))
            tillCall.current.staff = TILL_BY_PLATER
            pl.pos.copy(home())
            setOff(standSpots().edge, 'toTillBack')
            pl.path.push(tillStaffSpot())
            pl.len = pathLength(pl.path)
            away(true)
          } else if (open && !SHOP.leaving && washGoes(SKEWERS.s) && !waiters.current.some((x) => SK_PHASES.has(x.phase))
            && (SKEWERS.s.clean <= WASH_LOW || !platerGoes(PLATING.stock, PLATING.coming, PLATE_RACK.n + LOW_RACK.n))) {
            // (the used skewers piling up, or the clean ones' bucket nearly empty, and no server already on it: to the used bucket by the plating
            // place for all of them. The skewers are the third cook's to wash (CLAUDE.md's kitchen crew: 三廚…洗串); it was only with no server
            // hired, and the servers, always serving first, never got to them: on an ordinary evening 38 lay dirty and none were washed in 200 s,
            // and the bucket ran dry (item 237, tests/e2e/_skewerflow220.mjs))
            pl.pos.copy(home())
            setOff(skTraySpot(), 'toSkTray')
            away(true)
          // (made before the plates are seen to when someone's waiting for a bowl of it (item 205: in a rush the plates always wanted, and the
          // soup and the rice were never made: the bowls waited all evening))
          // (the rice first when both are empty (item 346): the cooker's the longest to come (washed, then a quarter minute cooking), and the soup
          // heats in its well by itself once it's made; soup first, the first bowls of rice came half a minute after the doors opened)
          } else if (open && !SHOP.leaving && riceGoes(RICE.kama) && anyInStock(['Onigiri']) && (BOWLS.want.some((x) => x.rice) || !platerGoes(PLATING.stock, PLATING.coming, PLATE_RACK.n + LOW_RACK.n))) {
            riceRun()
          } else if (open && !SHOP.leaving && (soupGoes(SOUP.pot) || topUpGoes(SOUP.pot, SOUP.left)) && anyInStock(['MisoSoup']) && (BOWLS.want.some((x) => x.soup) || topUpGoes(SOUP.pot, SOUP.left) || !platerGoes(PLATING.stock, PLATING.coming, PLATE_RACK.n + LOW_RACK.n))) {
            soupRun()
          } else if (open && !SHOP.leaving && lowGoes(LOW_RACK.n, LOW_RACK.coming, PLATE_RACK.n)) {
            // (the low rack by the table run low, nothing else wanting: across to the racks for a carry of plates to fill it)
            pl.pos.copy(home())
            pl.path = kitchenRoute(pl.pos, rackFront(rackNow()))
            pl.len = pathLength(pl.path)
            pl.phase = 'toRackLow'
            pl.t = 0
            away(true)
          } else if (open && !SHOP.leaving && trayWants(ONIGIRI_TRAY.n, RICE.rice, RICE.kama)) {
            // (nothing else wanting and the rice cooked: to the rice-ball counter to shape rice balls onto its tray, up to its three (item
            // 129, the owner's, 2026-11-15: the third cook shaping them, seen))
            pl.pos.copy(home())
            setOff(prepSpot(), 'toShape')
            away(true)
          } else if (open && !SHOP.leaving && performance.now() / 1000 - soupAt.current > SOUP_EVERY) {
            // (nothing else wanting: to the miso soup now and then, to stir it as it's kept warm)
            soupAt.current = performance.now() / 1000
            pl.pos.copy(home())
            // (before it, as at the cooker beside it on the warming counter: the nearest clear spot to its middle was round its back, on the
            // counter's edge of the kitchen's floor, and the way there went through the counter)
            setOff(soupStand(), 'toSoup')
            away(true)
          } else if (open && !SHOP.leaving && performance.now() / 1000 - grateAt.current > GRATE_EVERY && graterAt()) {
            // (nothing else wanting: to the garnishes' corner of the rice-ball counter, to grate daikon for what goes out with the fish (item
            // 392, the owner's 「不見得只能料理飯糰」), a few strokes on the grater, and back)
            grateAt.current = performance.now() / 1000
            pl.pos.copy(home())
            setOff(garnishSpot(), 'toGrate')
            away(true)
          }
        }
      } else if (pl.phase === 'toCrate') walk(() => { pl.phase = 'takeCoal'; faceTo(crateAt()) })
      else if (pl.phase === 'turnCrate') turnTo(crateAt(), 0.35, () => { pl.phase = 'takeCoal' })
      else if (pl.phase === 'takeCoal' && pl.t > 0.6) { pl.phase = 'turnBack'; pl.t = 0 }
      else if (pl.phase === 'turnBack') turnTo(hearthAt(), 0.35, () => { pl.phase = 'feedCoal' })
      // (the crate low: an armful out of the sack on the floor, carried back into his bay and into the crate (paid for out of the stock as
      // it goes in: SUPPLIES.refillCrate), then the handful out of it)
      else if (pl.phase === 'toCoalSack') walk(() => { pl.phase = 'liftSack'; faceTo(coalSackAt()) })
      else if (pl.phase === 'liftSack' && pl.t > 0.9) setOff(home(), 'toFill')
      else if (pl.phase === 'toFill') walk(() => { pl.phase = 'fillCrate' })
      else if (pl.phase === 'fillCrate') {
        if (pl.t < 0.3) pl.yawTo = Math.atan2(crateAt().x - pl.pos.x, crateAt().z - pl.pos.z)
        else if (pl.t > 0.9) {
          CRATE.left += SUPPLIES.refillCrate(Math.max(0, CRATE_FULL - CRATE.left))
          pl.phase = 'takeCoal'
          pl.t = 0
        }
      }
      else if (pl.phase === 'rake' && pl.t > RAKE_S) {
        // (raked: the ash knocked off and the coals drawn together (Roasting does it on seeing it done); turned back as he stands)
        FIRE_TEND.done = 'tidy'
        FIRE_TEND.want = null
        pl.phase = 'settle'
        pl.t = 0
      }
      else if (pl.phase === 'toBucket') walk(() => { pl.phase = 'scoopWater'; faceTo(bucketAt()) })
      // (back from a step in his bay straight to where he stands; from the floor by the table, the way round to it)
      else if (pl.phase === 'scoopWater' && pl.t > 0.8) { if (dipFrom()) stepTo(hearthSpot(), 'toHearth'); else setOff(hearthSpot(), 'toHearth') }
      else if (pl.phase === 'toHearth') walk(() => { pl.phase = pl.fire === 'water' ? 'sprinkle' : 'feedCoal'; faceTo(hearthAt()) })
      else if ((pl.phase === 'feedCoal' || pl.phase === 'sprinkle') && pl.t > 0.8) {
        // (the sticks in, or the water splashed on: the grill does the rest; he's in his bay already, turned back as he stands there. What
        // was asked for done: not asked again before the grill's seen it's done (he went straight back for a second handful))
        FIRE_TEND.done = pl.phase === 'feedCoal' ? 'coal' : 'water'
        FIRE_TEND.want = null
        pl.path = []; pl.len = 0
        pl.phase = 'settle'
        pl.t = 0
      } else if (pl.phase === 'toSake') walk(() => { pl.phase = 'pourSake'; pl.yawTo = stationYaw() })
      // (at the station, square on to it: a tokkuri set out, the bottle taken up in both hands, poured, set back, a cup put by it (the
      // beats, game/sakePour; the bottle and the hands posed from them below); poured, left there for a server, and home)
      else if (pl.phase === 'pourSake') {
        const j = sakeJob.current
        if (j && j.pourer === 'plater') j.t = Math.min(POUR_TOTAL, pl.t)
        if (!j || j.pourer !== 'plater' || pl.t >= POUR_TOTAL) setOff(home(), 'home')
      }
      // (a customer's bowls: at the cooker, square on to it, the rice scooped beat by beat; at the pot the soup ladled; to the counter with
      // them, set down there for a server; they gone meanwhile, the bowls put by, and home)
      else if (pl.phase === 'toRiceBowl') walk(() => { const j = bowlJob.current; if (j) { j.W = riceFillAt(); j.t = 0; pl.yawTo = Math.atan2(j.W.face.x, j.W.face.z) } pl.phase = 'riceBowl' })
      else if (pl.phase === 'riceBowl') {
        const j = bowlJob.current
        if (!j) setOff(home(), 'home')
        else {
          j.t = Math.min(RICE_LEN, pl.t)
          if (pl.t >= RICE_LEN) {
            const r = takeRice(RICE.rice, RICE.kama)
            RICE.rice = r.rice; RICE.kama = r.kama; RICE.lid = 0
            j.riceFill = 1
            if (j.soup) { j.stage = 'soup'; setOff(soupFillAt().stand, 'toSoupBowl') }
            else { j.stage = 'toPass'; setOff(passSpot(), 'toBowlPass') }
          }
        }
      }
      else if (pl.phase === 'toSoupBowl') walk(() => { const j = bowlJob.current; if (j) { j.W = soupFillAt(); j.t = 0; pl.yawTo = Math.atan2(j.W.face.x, j.W.face.z) } pl.phase = 'soupBowl' })
      else if (pl.phase === 'soupBowl') {
        const j = bowlJob.current
        if (!j) setOff(home(), 'home')
        else {
          j.t = Math.min(SOUP_LEN, pl.t)
          if (pl.t >= SOUP_LEN) {
            const b = takeBowl(SOUP.pot, SOUP.left)
            SOUP.pot = b.pot; SOUP.left = b.left
            j.soupFill = 1
            j.stage = 'toPass'
            setOff(passSpot(), 'toBowlPass')
          }
        }
      }
      else if (pl.phase === 'toBowlPass') walk(() => { pl.phase = 'bowlPut'; pl.yawTo = stationYaw() })
      else if (pl.phase === 'bowlPut' && pl.t > BOWL_PUT_S) {
        // (left at the counter in their row for a server, and the plater free for the next customer's (item 207); they gone meanwhile,
        // put by)
        const j = bowlJob.current
        if (j && guestSits(j.guest, j.seat)) passQ.current.push({ guest: j.guest, seat: j.seat, rice: j.rice, soup: j.soup, row: j.row ?? 0, up: 0, down: 0, wait: 0 })
        // (put by: into the sink to be washed (item 600))
        else if (j) { WARE.sink = addWares(WARE.sink, { rice: j.rice ? 1 : 0, soup: j.soup ? 1 : 0, renge: j.soup ? 1 : 0 }); WARE.ver++ }
        bowlJob.current = null
        setOff(home(), 'home')
      }
      // (a dish at its station: made there (KITCHEN.cooking: the stove's flame, the pan, the fryer's basket go by it), to the counter with it,
      // set down in its row for a server; they gone meanwhile, put by)
      else if (pl.phase === 'toStation') walk(() => {
        const j = kitchenJob.current
        pl.phase = 'cookStation'
        if (j) faceTo(j.station === 'board' ? inBar('prep-board', pl.pos) : inBar(`${j.station}-top`, pl.pos))
      })
      else if (pl.phase === 'cookStation') {
        const j = kitchenJob.current
        if (!j) { KITCHEN.cooking = null; setOff(home(), 'home') }
        else {
          KITCHEN.cooking = { id: j.id, station: j.station, t: pl.t, of: j.of }
          if (pl.t >= j.of) { KITCHEN.cooking = null; setOff(passSpot(), 'toDishPass') }
        }
      }
      else if (pl.phase === 'toDishPass') walk(() => { pl.phase = 'dishPut'; pl.yawTo = stationYaw() })
      else if (pl.phase === 'dishPut' && pl.t > BOWL_PUT_S) {
        // (each portion set out in a row of its own, for those still sat; one with no row free yet held on to till one is (a server's
        // lifted what was there))
        const j = kitchenJob.current
        const held: { guest: number; seat: number }[] = []
        if (j) for (const p of [{ guest: j.guest, seat: j.seat }, ...j.more]) {
          if (!guestSits(p.guest, p.seat)) continue
          const r = freeRow()
          if (r < 0) { held.push(p); continue }
          passQ.current.push({ guest: p.guest, seat: p.seat, rice: false, soup: false, dish: j.id, row: r, up: 0, down: 0, wait: 0 })
        }
        if (j && held.length) { j.guest = held[0].guest; j.seat = held[0].seat; j.more = held.slice(1); pl.t = BOWL_PUT_S * 0.5 }
        else { kitchenJob.current = null; setOff(home(), 'home') }
      }
      else if (pl.phase === 'toSoup') walk(() => { pl.phase = 'stir'; faceTo(soupPot()) })
      else if (pl.phase === 'stir' && pl.t > (pl.making ? MAKE_S : STIR_S)) {
        // (made: in its well heating up (the water for it metered as the rice's is))
        // (or a hot pot run low topped up with as much as it takes to fill it, still hot (item 207))
        if (pl.making && SOUP.pot.state === 'hot') { SOUP.left += batchOf('MisoSoup', Math.max(0, SOUP_BOWLS - SOUP.left)); meterWater('cooking', 6); pl.making = false }
        else if (pl.making) { SOUP.pot = setSoup(); SOUP.batch = batchOf('MisoSoup', SOUP_BOWLS); meterWater('cooking', 10); pl.making = false; soupAt.current = performance.now() / 1000 }
        setOff(home(), 'home')
      }
      else if (pl.phase === 'toRack') walk(() => {
        pl.phase = 'take'
        const at = pl.src === 'low' ? lowTop() : rackTop(rackNow())
        pl.yawTo = Math.atan2(at.x - pl.pos.x, at.z - pl.pos.z)
      })
      else if (pl.phase === 'take' && pl.t > 0.5) {
        // (off the racks into their hands, as many as the plating place's stack wants)
        if (pl.src === 'low') { pl.n = platesToBring(PLATING.stock, LOW_RACK.n); LOW_RACK.n -= pl.n }
        else { pl.n = platesToBring(PLATING.stock, PLATE_RACK.n); PLATE_RACK.n -= pl.n }
        PLATING.coming = pl.n
        pl.path = kitchenRoute(pl.pos, plating.in.clone().setY(0))
        pl.len = pathLength(pl.path)
        pl.phase = 'toPass'
        pl.t = 0
      } else if (pl.phase === 'toPass') walk(() => {
        pl.phase = 'put'
        pl.yawTo = Math.atan2(plating.at.x - pl.pos.x, plating.at.z - pl.pos.z)
      })
      else if (pl.phase === 'put' && pl.t > 0.5) {
        // (all of them set down, even with a plate or two put back on the stack meanwhile: none is ever lost)
        PLATING.stock += pl.n
        PLATING.coming = 0
        pl.n = 0
        pl.path = kitchenRoute(pl.pos, home())
        pl.len = pathLength(pl.path)
        pl.phase = 'home'
        pl.t = 0
      }
      // ---- the low rack by the table filled: a carry off the racks, across to it, set down on it
      else if (pl.phase === 'toRackLow') walk(() => { pl.phase = 'takeLow'; faceTo(rackTop(rackNow())) })
      else if (pl.phase === 'takeLow' && pl.t > 0.5) {
        pl.n = lowToBring(LOW_RACK.n, PLATE_RACK.n)
        PLATE_RACK.n -= pl.n
        LOW_RACK.coming = pl.n
        setOff(lowFront(), 'toLow')
      } else if (pl.phase === 'toLow') walk(() => { pl.phase = 'putLow'; faceTo(lowTop()) })
      else if (pl.phase === 'putLow' && pl.t > 0.5) {
        LOW_RACK.n += pl.n
        LOW_RACK.coming = 0
        pl.n = 0
        setOff(home(), 'home')
      } else if (pl.phase === 'home') walk(() => { pl.phase = 'settle' })
      else if (pl.phase === 'settle') {
        // (turned to face as they do at their place, then they're themselves again there: turned at once, they snapped round)
        const want = yawOfCrew()
        const turn = want === null ? 0 : Math.atan2(Math.sin(want - pl.yaw), Math.cos(want - pl.yaw))
        if (want !== null) pl.yawTo = want
        if (Math.abs(turn) < 0.03 || pl.t > 0.6) {
          if (want !== null) pl.yaw = pl.yawTo = want
          pl.phase = 'idle'
          away(false)
        }
      }
      else if (pl.phase === 'toSack') walk(() => { pl.phase = 'scoopRaw'; faceTo(sackSpots().at) })
      // ---- the iron skewers (game/skewers): the used tray's all picked up, washed at the sink, put back in the holder by the board
      else if (pl.phase === 'toSkTray') walk(() => { pl.phase = 'takeSk'; faceTo(inBar('skewer-tray', pl.pos)) })
      else if (pl.phase === 'takeSk' && pl.t > 0.6) {
        SKEWERS.s = pickUpDirty(SKEWERS.s)
        setOff(sinkFront(), 'toSkSink')
      } else if (pl.phase === 'toSkSink') walk(() => {
        pl.phase = 'washSk'
        SINK.washing = true
        faceTo(inBar('SinkBasinFloor', endOf(1)))
        if (plater) STAFF_TALK.push({ key: performance.now() + 0.7, id: plater.id, text: LINES[lang].skewerWash, until: performance.now() + 2400 })
      })
      else if (pl.phase === 'washSk' && pl.t > SKEWER_WASH_S) {
        SINK.washing = false
        soapPlate(); meterWater('dish')
        setOff(skHolderSpot(), 'toHolder')
      } else if (pl.phase === 'toHolder') walk(() => { pl.phase = 'putSk'; faceTo(inBar('skewer-holder', pl.pos)) })
      // (ringing someone up at the till (item 203): behind it, facing them, till they've paid; then home)
      else if (pl.phase === 'toTillBack') walk(() => { pl.phase = 'atTill'; tillCall.current.there = tillCall.current.who >= 0; faceTo(payOf(counters).spot) })
      else if (pl.phase === 'atTill') {
        const tc = tillCall.current
        if (tc.who >= 0 && !tc.there) tc.there = true
        if (tc.who < 0 && pl.t > 0.6) { tc.staff = -1; tc.there = false; setOff(home(), 'home') }
      }
      else if (pl.phase === 'putSk' && pl.t > 0.5) {
        SKEWERS.s = putBackClean(SKEWERS.s)
        rattleSound()
        setOff(home(), 'home')
      }
      else if (pl.phase === 'scoopRaw' && pl.t > SCOOP_S) {
        // (a pot's worth scooped into the bowl; back up onto the kitchen's floor and to the sink with it)
        const sk = sackSpots()
        pl.path = [pl.pos.clone(), sk.edge, ...kitchenRoute(sk.edge, sinkFront()).slice(1)]
        pl.len = pathLength(pl.path)
        pl.phase = 'toSink'
        pl.t = 0
      } else if (pl.phase === 'toSink') walk(() => { pl.phase = 'wash'; RICE.washing = true; faceTo(inBar('SinkBasinFloor', endOf(1))) })
      else if (pl.phase === 'wash' && pl.t > WASH_S) {
        // (washed, the water run off it, to the stove with it)
        RICE.washing = false
        meterWater('cooking', 20)
        setOff(kamaSpot(), 'toKama')
      } else if (pl.phase === 'toKama') walk(() => { pl.phase = 'load'; faceTo(kamaTop()) })
      else if (pl.phase === 'load' && pl.t > 0.8) {
        // (into the pot, its lid on, the fire under it: cooking, as much as was in stock)
        RICE.kama = setOn()
        RICE.batch = batchOf('Onigiri', RICE_FULL)
        setOff(home(), 'home')
      }
      else if (pl.phase === 'toShape') walk(() => { pl.phase = 'shape'; faceTo(prepBoard()) })
      else if (pl.phase === 'toGrate') walk(() => { pl.phase = 'grate'; const g = graterAt(); if (g) faceTo(g) })
      else if (pl.phase === 'grate' && (pl.t > GRATE_S || (FIRE_TEND.want && !FIRE_TEND.done) || SAKE.want.length)) setOff(home(), 'home')
      else if (pl.phase === 'shape' && pl.t > SHAPE_EACH) {
        // (one shaped, its rice out of the cooker, set on the tray; another while it wants more and nothing's called them, else back)
        const r = takeRice(RICE.rice, RICE.kama)
        RICE.rice = r.rice
        RICE.kama = r.kama
        ONIGIRI_TRAY.n = Math.min(TRAY_MAX, ONIGIRI_TRAY.n + 1)
        if (open && !SHOP.leaving && trayWants(ONIGIRI_TRAY.n, RICE.rice, RICE.kama) && !(FIRE_TEND.want && !FIRE_TEND.done) && !SAKE.want.length) pl.t = 0
        else setOff(home(), 'home')
      }
      // (the way they face turned to the way they're to face, by time (commuteWalk's turnEase): set at once, they snapped round, over a
      // hundred times a minute at double speed (item 242))
      if (pl.yawTo !== undefined) pl.yaw = pl.phase === 'idle' ? pl.yawTo : turnToward(pl.yaw, pl.yawTo, step)
      const o = platerObj.current
      if (o) {
        o.visible = pl.phase !== 'idle'
        o.position.copy(pl.pos)
        // (down on the genkan's stone where their way crosses it, item 203)
        o.position.y += genkanY(counters, pl.pos) + stoolLift(o, pl.pos, tick(dt))
        o.rotation.y = pl.yaw
        // (at the bowls, the grater and the board the work counter's front came to within 2 cm of his head's widest, which is just at its
        // top's slab (item 509): drawn a little back off it while he's at them, eased there and back, his hands where the work has them)
        platerBack.current += ((AT_WORK_COUNTER.has(pl.phase) && pl.phase !== 'cookStation' ? PLATER_BACK : 0) - platerBack.current) * Math.min(1, dt * 6)
        if (platerBack.current > 1e-4) o.position.addScaledVector(BACK_DIR.set(Math.sin(pl.yaw), 0, Math.cos(pl.yaw)), -platerBack.current)
        // (never the idle fanning of a cook at his place: his hands are full with the work here; bent forward to it: well down to the
        // sack on the floor, over the bucket on the table and the hearth to tip the coals in or splash the water, a little over the crate and
        // the soup)
        o.userData.fetcher = true
        o.userData.fanNow = false
        const bend = (k: number) => Math.sin(Math.PI * Math.min(1, pl.t / k))
        o.userData.lean = pl.phase === 'liftSack' ? 0.5 * bend(0.8) : pl.phase === 'feedCoal' || pl.phase === 'sprinkle' || pl.phase === 'scoopWater' ? 0.32 * bend(0.8)
          : pl.phase === 'rake' ? 0.26 * bend(RAKE_S)
          : pl.phase === 'takeCoal' ? 0.18 * bend(0.6) : pl.phase === 'fillCrate' ? 0.22 * Math.sin(Math.PI * Math.max(0, Math.min(1, (pl.t - 0.2) / 0.7))) : pl.phase === 'stir' ? 0.14
          : pl.phase === 'shape' ? 0.12 : pl.phase === 'grate' ? 0.16 : pl.phase === 'pourSake' ? 0.06 : pl.phase === 'cookStation' ? 0.12 : 0
        // (at the work counter, its top up to his chin (its slab's top at 71% of his height): bent where its top is, not at the waist
        // (StaffFigure's LEAN_WAIST, 55%): bent at the waist his chin and glasses went forward under its top, into its slab (item 509))
        o.userData.leanAt = AT_WORK_COUNTER.has(pl.phase) ? 0.72 : undefined
        // (shaping a rice ball: both hands cupped round it before them, pressed together and turned, three presses to one (StaffFigure))
        o.userData.shape = pl.phase === 'shape' || (pl.phase === 'cookStation' && kitchenJob.current?.station === 'board') ? pl.t / SHAPE_EACH : undefined
        // (at the stove or the fryer (items 461, 469): the right hand on the pan's handle (tossing it now and then) or the basket's, the left by
        // the pan or on the counter)
        COOK_HANDS_ON.v = false
        if (pl.phase === 'cookStation' && kitchenJob.current && kitchenJob.current.station !== 'board') {
          const st = kitchenJob.current.station, grip = markOf(`${st}-grip`), mid = markOf(`${st}-top`)
          if (grip && mid) {
            grip.getWorldPosition(COOK_HANDS.right)
            if (st === 'stove') COOK_HANDS.right.y += Math.max(0, Math.sin(pl.t * 2.3)) ** 10 * 0.05
            mid.getWorldPosition(COOK_HANDS.left)
            COOK_HANDS.left.y += 0.06
            COOK_HANDS_ON.v = true
          }
        }
        // (pouring the sake: both hands on the open bottle, a tokkuri, a cup, where the pour has them (item 177))
        o.userData.handsAt = pl.phase === 'pourSake' && SAKE_HANDS_ON.v ? SAKE_HANDS
          : (pl.phase === 'riceBowl' || pl.phase === 'soupBowl') && BOWL_HANDS_ON.v ? BOWL_HANDS
            : pl.phase === 'stir' && STIR_HANDS_ON.v ? STIR_HANDS : pl.phase === 'grate' && GRATE_ON.v ? GRATE_HANDS
              : pl.phase === 'cookStation' && COOK_HANDS_ON.v ? COOK_HANDS
                : WASH_BOWL_ON.v && RICE_WASH_PHASES.has(pl.phase) ? WASH_BOWL_HANDS : undefined
        // (grating: the right hand with the daikon up and down the grater's length, pressed down on the way out, eased back; the left holding
        // the grater's near end; their places on the grater the world's (item 392))
        GRATE_ON.v = false
        GRATING.on = false
        if (pl.phase === 'grate') {
          const gm = markOf('prep-grater'), fr = frame.current
          if (gm && fr) {
            // (the daikon's cut end down the grater and up it again, pressed down going away from them, lifted a little coming back; held by
            // its top, slanted back toward them at 51 degrees over the grater (its 13 cm); the left hand on the grater's near end. In the
            // world, in the counter's own measure (S: its scale in the world), the daikon's: in the bar's, it came 10 cm short of the grater)
            const gW = gm.getWorldPosition(new THREE.Vector3()), S = gm.getWorldScale(new THREE.Vector3()).y
            const dir = gW.clone().sub(fr.localToWorld(pl.pos.clone())).setY(0).normalize(), side = new THREE.Vector3(dir.z, 0, -dir.x)
            const k = (pl.t * 1.7) % 1, out = k < 0.62 ? k / 0.62 : 1 - (k - 0.62) / 0.38
            const s0 = Math.min(1, pl.t / 0.4)
            GRATING.cut.copy(gW).addScaledVector(dir, (-0.04 + 0.08 * out) * s0 * S)
              .add(new THREE.Vector3(0, (k < 0.62 ? 0.002 : 0.012 * Math.sin(Math.PI * (k - 0.62) / 0.38)) * S, 0))
            GRATING.hand.copy(GRATING.cut).add(new THREE.Vector3(0, 0.101 * S, 0)).addScaledVector(dir, -0.082 * S).addScaledVector(side, -0.008 * S)
            GRATE_HANDS.right.copy(GRATING.hand)
            GRATE_HANDS.left.copy(gW).addScaledVector(dir, -0.085 * S).addScaledVector(side, 0.05 * S).add(new THREE.Vector3(0, 0.016 * S, 0))
            GRATE_ON.v = true
            GRATING.on = true
          }
        }
        // (up on the kitchen's dais)
        // (up on the kitchen's dais while they're over it: stepped down off it at the rice sack)
        if (KITCHEN_DROP < 0) {
          const d = pl.pos.clone().sub(counters[0].at), a = d.dot(counters[0].along), l = d.dot(counters[0].lay)
          if (a > kitchen.along[0] && a < kitchen.along[1] && l > kitchen.lay[0] && l < kitchen.lay[1]) o.position.y += -KITCHEN_DROP / scale
        }
      }
      // (what's in their hands is held at the height a server's tray is: as it's held up on the kitchen's dais, a step lower off it (their
      // figure's own place has the dais's height in it already, and what they held rode 16 cm over their hands))
      const heldBase = () => {
        const d = pl.pos.clone().sub(counters[0].at), a = d.dot(counters[0].along), l = d.dot(counters[0].lay)
        const on = a > kitchen.along[0] && a < kitchen.along[1] && l > kitchen.lay[0] && l < kitchen.lay[1]
        return pl.pos.clone().setY(pl.pos.y + (KITCHEN_DROP < 0 && !on ? KITCHEN_DROP / scale : 0))
      }
      // (the rice in its bowl in their hands: washing it, to the pot with it (going in at 'load'); scooped out of the pot, to the tub with it)
      const pb = platerBowl.current
      if (pb && o) {
        const holding = RICE_WASH_PHASES.has(pl.phase)
        pb.visible = holding
        // (both hands out in front, holding it (or the plates))
        o.userData.carry = holding || (pl.n > 0 && pl.phase !== 'idle') || pl.phase === 'toBowlPass' || pl.phase === 'bowlPut'
          || (bowlJob.current?.by === 'plater' && (pl.phase === 'toSoupBowl'))
        if (holding) {
          // (held out before them by its own size (BOWL_HOLD), both hands on its sides)
          const hands = heldBase().add(new THREE.Vector3(0, HELD_AT[1] * STAFF_SCALE + 0.02, BOWL_HOLD).applyAxisAngle(UP_Y, pl.yaw))
          // (swirled in the water as it's washed)
          if (pl.phase === 'wash') hands.add(new THREE.Vector3(Math.sin(pl.t * 9) * 0.02, -0.03, Math.cos(pl.t * 9) * 0.02))
          const k = pl.phase === 'load' ? Math.min(1, pl.t / 0.6) : pl.phase === 'scoopRaw' ? Math.min(1, pl.t / SCOOP_S) : 0
          const over = pl.phase === 'scoopRaw' ? inBar('RiceSackOpenSet', hands).setY(hands.y - 0.1) : kamaTop()
          pb.position.lerpVectors(hands, over, Math.sin(Math.PI * k) * 0.6)
          pb.rotation.z = pl.phase === 'load' ? Math.sin(Math.PI * k) * 1.1 : 0
          const rice = pb.getObjectByName('bowl-rice')
          if (rice) rice.scale.setScalar(pl.phase === 'load' ? Math.max(0.01, 1 - k) : pl.phase === 'scoopRaw' ? Math.max(0.01, k) : 1)
          riceBowlHands(pb, pl.yaw)
        }
        WASH_BOWL_ON.v = holding
      }
      // (the rice ball between their hands as they shape it, turned a little with each press; its nori wrapped on at the last)
      const ball = platerBall.current
      if (ball && o) {
        const on = pl.phase === 'shape'
        ball.visible = on
        if (on) {
          const k = pl.t / SHAPE_EACH
          ball.position.copy(heldBase()).add(new THREE.Vector3(0, (SHAPE_HAND.y + 0.03) * STAFF_SCALE, (SHAPE_HAND.z + 0.01) * STAFF_SCALE).applyAxisAngle(UP_Y, pl.yaw))
          ball.rotation.set(0, pl.yaw + Math.sin(k * Math.PI * 6) * 0.25, 0)
          const nori = ball.getObjectByName('ball-nori')
          if (nori) nori.visible = k > 0.75
        }
      }
      // (the bundle of skewers in their hands, from the tray to the holder; scrubbed to and fro at the sink)
      const sk = platerSkewers.current
      if (sk && o) {
        const has = pl.phase === 'toSkSink' || pl.phase === 'washSk' || pl.phase === 'toHolder' || pl.phase === 'putSk' || (pl.phase === 'takeSk' && pl.t > 0.3)
        sk.visible = has
        if (has) {
          o.userData.carry = true
          sk.position.copy(heldBase()).add(new THREE.Vector3(pl.phase === 'washSk' ? Math.sin(pl.t * 12) * 0.03 : 0, HELD_AT[1] * STAFF_SCALE + 0.02, HELD_AT[2] * STAFF_SCALE).applyAxisAngle(UP_Y, pl.yaw))
          sk.rotation.set(0, pl.yaw, 0)
        }
      }
      // (the charcoal in both hands, crate to hearth, tipped in; the dipper of water, bucket to hearth, splashed; the dipper stirring the soup)
      const pc = platerCoal.current, pd = platerDipper.current
      if (o && pc && pd) {
        // (where the hands are, bent forward with them (from the waist: drawn back as far as StaffFigure draws them, item 387))
        const hands = heldBase().add(new THREE.Vector3(0, HELD_AT[1] * STAFF_SCALE + 0.02, HELD_AT[2] * STAFF_SCALE)
          .applyAxisAngle(X_AXIS, o.userData.lean ?? 0).add(new THREE.Vector3(0, 0, (o.userData.leanBack ?? 0) * STAFF_SCALE)).applyAxisAngle(UP_Y, pl.yaw))
        const coal = (pl.phase === 'takeCoal' && pl.t > 0.3) || (pl.phase === 'toHearth' && pl.fire === 'coal') || pl.phase === 'feedCoal' || pl.phase === 'turnBack'
        // (an armful out of the sack, carried to the crate and set into it)
        const armful = (pl.phase === 'liftSack' && pl.t > 0.45) || pl.phase === 'toFill' || (pl.phase === 'fillCrate' && pl.t < 0.75)
        pc.visible = coal || armful
        if (coal) {
          o.userData.carry = true
          // (leant over and tipped in towards the coals)
          const k = pl.phase === 'feedCoal' ? Math.min(1, pl.t / 0.5) : 0
          pc.position.copy(hands).lerp(hearthAt().setY(hands.y), k * 0.35)
          pc.rotation.set(k * 1.2, pl.yaw, 0, 'YXZ')
          pc.scale.setScalar(pl.phase === 'feedCoal' && pl.t > 0.55 ? Math.max(0.01, 1 - (pl.t - 0.55) / 0.25) : 1)
        } else if (armful) {
          o.userData.carry = true
          // (bigger, held in both arms; lowered into the crate as it's filled)
          const k = pl.phase === 'fillCrate' ? Math.max(0, Math.min(1, (pl.t - 0.3) / 0.45)) : 0
          pc.position.copy(hands).lerp(crateAt().setY(hands.y - 0.08), k * 0.5)
          pc.rotation.set(0, pl.yaw, 0, 'YXZ')
          pc.scale.setScalar(1.7 * (pl.phase === 'fillCrate' && pl.t > 0.6 ? Math.max(0.01, 1 - (pl.t - 0.6) / 0.15) : 1))
        }
        const dip = (pl.phase === 'scoopWater' && pl.t > 0.3) || (pl.phase === 'toHearth' && pl.fire === 'water') || pl.phase === 'sprinkle' || pl.phase === 'stir'
        pd.visible = dip
        if (dip) {
          o.userData.carry = true
          let tip = 0, at = hands
          if (pl.phase === 'sprinkle') {
            // (a flick out over the hearth, the water thrown)
            const k = Math.min(1, pl.t / 0.6)
            at = hands.clone().lerp(hearthAt().setY(hands.y + 0.05), Math.sin(Math.PI * k) * 0.4)
            tip = Math.sin(Math.PI * k) * 1.4
          } else if (pl.phase === 'stir') {
            // (round and round in the pot: the dipper and the hands up over its near half, over the counter's top (item 387: at the hands' rest,
            // under the top, they went into the counter's front); the left on its rim)
            const W = soupFillAt(), fr = frame.current
            const over = W.top.clone().addScaledVector(W.face, -0.7 * W.r).setY((W.rimTop ?? W.top.y) + 0.06)
            const turn = new THREE.Vector3(Math.sin(pl.t * 5) * 0.04, 0, Math.cos(pl.t * 5) * 0.04)
            at = over.clone().lerp(W.top.clone().setY(over.y), 0.45).add(turn).add(new THREE.Vector3(0, -0.04, 0))
            tip = 0.6
            if (fr) {
              fr.localToWorld(STIR_HANDS.right.copy(over).add(turn))
              const nearR = W.rimR ? W.rimR(W.face.clone().negate()) : W.r
              fr.localToWorld(STIR_HANDS.left.copy(W.top).addScaledVector(W.face, -(nearR + 0.05)).addScaledVector(W.right, 0.12).setY((W.rimTop ?? W.top.y) + 0.01))
              STIR_HANDS_ON.v = true
            }
          }
          pd.position.copy(at)
          pd.rotation.set(tip, pl.yaw, 0, 'YXZ')
          const w = pd.getObjectByName('dipper-water')
          if (w) w.visible = pl.phase !== 'stir' && !(pl.phase === 'sprinkle' && pl.t > 0.35)
        }
      }
      // (the plates in their hands, out in front of them)
      const ps = platerStack.current
      if (ps && o) {
        ps.visible = pl.n > 0 && pl.phase !== 'idle'
        if (ps.visible) {
          const k = pl.phase === 'take' || pl.phase === 'takeLow' ? Math.min(1, pl.t / 0.4) : pl.phase === 'put' || pl.phase === 'putLow' ? 1 - Math.min(1, pl.t / 0.4) : 1
          const hands = heldBase().add(new THREE.Vector3(0, HELD_AT[1] * STAFF_SCALE + 0.02, HELD_AT[2] * STAFF_SCALE).applyAxisAngle(UP_Y, pl.yaw))
          const from = pl.phase === 'put' ? platingPlace(PLATE_STACK_ALONG).addScaledVector(plating.across, PLATE_STACK_ACROSS)
            : pl.phase === 'putLow' || (pl.phase === 'take' && pl.src === 'low') ? lowTop() : rackTop(rackNow())
          ps.position.lerpVectors(from, hands, k * k * (3 - 2 * k))
          ps.children.forEach((c, i) => { c.visible = i < pl.n })
        }
      }
    }

    // the servers, each by their duty (game/plates: one on the floor, one at the dishes; a lone one does both): what's plated at the plating place to
    // its customer; the plates done with, cleared to the sink, their sticks into the bin beside it; washed there into the dish dryer; dried,
    // back to the racks
    const nServers = waiters.current.length
    /** a server's walk in or out a step on: their place and facing, how much of them shows, their stretch and nod */
    const walkCommute = (o: THREE.Group, tr: Trip, w: { pos: THREE.Vector3; yaw: number }) => {
      const pose = tripStep(tr, tick(dt), 1.1, (v) => (o.parent ? o.parent.localToWorld(v.clone()) : v.clone()))
      w.pos.copy(pose.p)
      if (pose.yaw !== null) w.yaw = turnToward(w.yaw, pose.yaw, tick(dt))
      o.position.copy(w.pos)
      // (down on the genkan's stone crossing it, item 203; up on the sink's step stool over it, item 221)
      o.position.y += genkanY(counters, w.pos) + stoolLift(o, w.pos, tick(dt))
      o.rotation.y = w.yaw
      ;(w as { look?: number }).look = w.yaw
      o.visible = pose.shown
      o.userData.fade = tr.done ? 1 : pose.vis
      o.userData.nod = pose.nod
      o.userData.stretch = pose.stretch
      // (off to home or just in: the shop's tray left at the shop, their hands at their sides (item 797, the owner's 「下班身上還有餐盤」))
      o.userData.trayDown = true
      if (KITCHEN_DROP < 0) {
        const d = w.pos.clone().sub(counters[0].at), a = d.dot(counters[0].along), l = d.dot(counters[0].lay)
        if (a > kitchen.along[0] && a < kitchen.along[1] && l > kitchen.lay[0] && l < kitchen.lay[1]) o.position.y += -KITCHEN_DROP / scale
      }
    }
    // takeaways (game/takeout): each order's customer in at the door to the genkan's edge, waiting there, and once their box is in their
    // hands out again; the box in a server's hands as they carry it out
    {
      const way = takeoutWay
      let changed = false
      for (const o of TAKEOUT.orders) {
        if (visitors.current.has(o.id) || o.handed) continue
        if (!way || !open) { if (o.ready) { o.taken = true; o.handed = true; o.gone = true } continue }
        const taken = new Set([...visitors.current.values()].filter((v) => v.phase !== 'out').map((v) => v.wait.distanceTo(way.wait) > 0.1 ? 1 : 0))
        // (a second one by the first, along toward the till (item 410: beside it, out toward the door, they stood in the sliding door))
        const wait = (taken.has(0) ? way.next : way.wait).clone()
        visitors.current.set(o.id, { id: o.id, rider: o.rider, order: o, phase: 'in', t: 0, fade: 0, fadeT: 0, pos: way.door.clone(), yaw: 0, wait })
        changed = true
      }
      for (const v of visitors.current.values()) {
        v.t += step
        const sp = SPEED * walkSpeedOf(kindOf(v.id).kind)
        if (!way || !open) { v.order.gone = true; visitors.current.delete(v.id); changed = true; continue }
        if (v.phase === 'in') {
          const len = way.door.distanceTo(v.wait), d = Math.min(len, v.t * sp)
          v.pos.lerpVectors(way.door, v.wait, len ? d / len : 1)
          v.yaw = Math.atan2(v.wait.x - way.door.x, v.wait.z - way.door.z)
          v.fade = Math.min(1, d / 0.6 + v.t / FADE_S)
          if (d >= len) { v.phase = 'wait'; v.t = 0 }
        } else if (v.phase === 'toTill' || v.phase === 'atTill') {
          // (called up by the cashier with their bag: along the genkan's edge to the till, as near as the genkan goes; there, their face to the till)
          v.fade = 1
          // (there, stood there: their time put back to nought on arriving, the walk from their place was walked again, from it (item 51:
          // up to the till, back a body's length at a step to where they'd waited, and up to the till again))
          const to = (v.till ??= tillSide(v.wait)), len = v.wait.distanceTo(to), d = v.phase === 'atTill' ? len : Math.min(len, v.t * sp)
          v.pos.lerpVectors(v.wait, to, len ? d / len : 1)
          if (v.phase === 'toTill') v.yaw = Math.atan2(to.x - v.wait.x, to.z - v.wait.z)
          if (d >= len && v.phase === 'toTill') { v.phase = 'atTill'; v.t = 0 }
          if (v.phase === 'atTill') { const at = cashierHands(0); v.yaw += Math.atan2(Math.sin(Math.atan2(at.x - v.pos.x, at.z - v.pos.z) - v.yaw), Math.cos(Math.atan2(at.x - v.pos.x, at.z - v.pos.z) - v.yaw)) * Math.min(1, step * 6) }
          if (v.order.handed) {
            v.wait = v.pos.clone()
            v.phase = 'out'; v.t = 0; changed = true
            onSay?.('guest', LINES[lang].payThanks(v.id, v.id + 1), v.id)
          }
        } else if (v.phase === 'wait' && v.order.gone && !v.order.handed) {
          // (given up waiting for it (Roasting's patience, item 203): off out of the door without it)
          v.wait = v.pos.clone()
          v.phase = 'out'; v.t = 0; changed = true
        } else if (v.phase === 'wait') {
          v.fade = 1
          // (turned to the step, where the box comes from)
          const yaw = Math.atan2(way.hand.x - v.pos.x, way.hand.z - v.pos.z)
          v.yaw += Math.atan2(Math.sin(yaw - v.yaw), Math.cos(yaw - v.yaw)) * Math.min(1, step * 6)
          // (no one to bring it (no server, the owner busy with nothing to walk), the box is at the till for them a moment after it's packed)
          if (!waiters.current.length && v.order.ready && v.t > 1.5) { v.order.taken = true; v.order.handed = true }
          if (v.order.handed) {
            v.phase = 'out'; v.t = 0; changed = true
            onSay?.('guest', LINES[lang].payThanks(v.id, v.id + 1), v.id)
          }
        } else {
          // (back out of the door with it, fading on the last stretch, and no quicker than FADE_S)
          const len = v.wait.distanceTo(way.door), d = Math.min(len, v.t * sp)
          v.pos.lerpVectors(v.wait, way.door, len ? d / len : 1)
          v.yaw = Math.atan2(way.door.x - v.wait.x, way.door.z - v.wait.z)
          if (len - d < 0.9) v.fadeT += step
          v.fade = Math.max(0, Math.min(1, Math.max((len - d) / 0.9, 1 - v.fadeT / FADE_S)))
          if (d >= len && v.fade <= 0) { v.order.gone = true; visitors.current.delete(v.id); changed = true }
        }
        const g = visitorObjs.current.get(v.id)
        if (g) {
          g.position.copy(v.pos)
          g.position.y = genkanY(counters, v.pos)
          // (turned to the way they face a moment at a time: set at once, they spun round as they took their bag and went)
          g.rotation.y = turnToward(g.rotation.y, v.yaw, step * 1.5)
        }
      }
      // (the stand: with the cashier at the till, the first bag on it whose customer's waiting turned round for, taken up, turned back with and held
      // out over the till to them, called up to it; no cashier, what's on it given out at once)
      {
        const S = TAKEOUT_STAND
        if (!cashierIn()) {
          for (const id of S.bags) { const v = visitors.current.get(id); if (v) v.order.handed = true }
          if (S.handing) { const v = visitors.current.get(S.handing.id); if (v) v.order.handed = true }
          S.bags = []; S.handing = null; S.turn = 0; S.carry = false
        } else {
          // (not while someone's paying at the till (item 203: she turned round for a bag in the middle of ringing someone up, the drawer open
          // behind her))
          if (!S.handing && TILL_STATE.k < 0) {
            const id = S.bags.find((x) => visitors.current.get(x)?.phase === 'wait')
            if (id !== undefined) { S.handing = { id, t: 0 }; S.bags = S.bags.filter((x) => x !== id) }
          }
          // (one whose customer's gone meanwhile (the shop shut): off the stand)
          S.bags = S.bags.filter((x) => visitors.current.has(x))
          const h = S.handing
          if (h) {
            const v = visitors.current.get(h.id)
            h.t += step
            if (!v) { S.handing = null; S.turn = 0; S.carry = false }
            else {
              S.turn = h.t < STAND_TURN ? h.t / STAND_TURN : h.t < STAND_TURN + STAND_LIFT ? 1 : Math.max(0, 1 - (h.t - STAND_TURN - STAND_LIFT) / STAND_TURN)
              S.carry = h.t > STAND_TURN
              if (v.phase === 'wait' && h.t > STAND_TURN) { v.phase = 'toTill'; v.t = 0 }
              // (turned back and holding it out, the customer there: over the till into their hands)
              if (S.turn === 0 && v.phase === 'atTill' && h.t > STAND_TURN * 2 + STAND_LIFT + STAND_GIVE) {
                v.order.handed = true
                S.handing = null; S.carry = false
              }
            }
          }
        }
        // (the bags: those on the stand in a row on its top; the one handed over from its place there into the cashier's hands, held, and over
        // the till to the customer's)
        const top = standTop.current, fb = frame.current
        standBags.current.forEach((b, k) => { if (b) b.visible = k < S.bags.length })
        const hb = handBag.current
        if (hb) {
          hb.visible = !!S.handing && !!top && !!fb
          if (S.handing && top && fb) {
            const t = S.handing.t, v = visitors.current.get(S.handing.id)
            const from = fb.worldToLocal(top.getWorldPosition(new THREE.Vector3()))
            const held = cashierHands(S.turn)
            const k = THREE.MathUtils.clamp((t - STAND_TURN) / STAND_LIFT, 0, 1)
            hb.position.lerpVectors(from, held, k * k * (3 - 2 * k))
            const give = THREE.MathUtils.clamp((t - STAND_TURN * 2 - STAND_LIFT) / STAND_GIVE, 0, 1)
            if (give > 0 && v?.phase === 'atTill') {
              const to = v.pos.clone().setY(held.y)
              hb.position.lerpVectors(held, to, give * 0.6).y += Math.sin(Math.PI * give) * 0.06
            }
            hb.rotation.y = STAND_AT.yaw + S.turn * Math.PI * 0.8
          }
        }
      }
      if (changed) setVisitorList([...visitors.current.values()].map((v) => ({ id: v.id, rider: v.rider, has: v.phase === 'out' })))
      // (the bench: in to a free place on it and sat down; called to a stool, handed over where they sit; given up, out of the door)
      let benchChanged = false
      if (way) {
        for (const id of BENCH.ids) {
          if (sitters.current.has(id)) continue
          // (a place no one's sat in or on their way to: those going out are up off theirs, and with every place counted (the bench full, one
          // going) the next in was sat on the first, on someone's lap (item 411); one just called away is still sat there till they're on
          // their way to their stool (a frame or two): theirs only if there's no other)
          const places = Array.from({ length: BENCH_SEATS }, (_, k) => k), on = [...sitters.current.values()].filter((x) => x.phase !== 'out')
          const taken = new Set(on.map((x) => x.spot)), held = new Set(on.filter((x) => !x.handed).map((x) => x.spot))
          const free = places.findIndex((k) => !taken.has(k)), spot = Math.max(0, free >= 0 ? free : places.findIndex((k) => !held.has(k)))
          sitters.current.set(id, { id, phase: 'in', t: 0, fade: 0, fadeT: 0, pos: way.door.clone(), yaw: 0, spot })
          benchChanged = true
        }
      }
      for (const v of sitters.current.values()) {
        v.t += step
        const sp = SPEED * walkSpeedOf(kindOf(v.id).kind)
        // (its place on the bench where the bench is now, moved by hand or not)
        // (the marks not there for a frame (the bench put back as the shop shuts): their place as last found, not the bench's place as laid
        // before it was moved, a step off (the day's audit, 2026-11-15: one on the bench 0.84 across in a frame at 04:01))
        const laid = way?.benchSpots[v.spot], bm = BENCH_MARKS.get(v.spot), fb = frame.current
        const found = !!(laid && bm && fb)
        if (found) v.at = (v.at ?? new THREE.Vector3()).copy(fb!.worldToLocal(bm!.getWorldPosition(BENCH_AT[v.spot])))
        const at = v.at ?? laid
        if (!way || !at) { sitters.current.delete(v.id); benchChanged = true; continue }
        // (which way the bench faces, as it stands now: across its row of places, away from the wall; and a step out in front of their place, the
        // way to it and from it bending there, clear of the shoe cupboard by the wall)
        // (the bench their place is on: its first place and its last)
        const b0 = v.spot - (v.spot % BENCH_EACH), m0 = BENCH_MARKS.get(b0), m1 = BENCH_MARKS.get(b0 + BENCH_EACH - 1)
        if (m0 && m1 && fb) {
          fb.worldToLocal(m0.getWorldPosition(BENCH_A)); fb.worldToLocal(m1.getWorldPosition(BENCH_B)); BENCH_B.sub(BENCH_A)
          BENCH_B.set(-BENCH_B.z, 0, BENCH_B.x).normalize()
          v.face = (v.face ?? new THREE.Vector3()).copy(BENCH_B)
        } else if (v.face) BENCH_B.copy(v.face)
        // (never found yet: across the bench as it's laid, its yaw turned a quarter)
        else BENCH_B.set(Math.sin(BENCH_PLACE.yaw), 0, Math.cos(BENCH_PLACE.yaw))
        const before = at.clone().addScaledVector(BENCH_B, 0.42)
        // (in by way of where their pair's to stand: stopped on it, out of their shoes, and up the step (item 412))
        if (v.phase === 'in' && !v.shoeAt) v.shoeAt = shoeSpotOf(v.spot, [way.door, before, at]) ?? undefined
        const walk = v.shoeAt ? [way.door, v.shoeAt, before, at] : [way.door, before, at]
        if (BENCH.up.has(v.id)) {
          // (called: up off the bench and on in to their stool from here (setShown's way in starts where they sat))
          BENCH.up.delete(v.id)
          benchFrom.current.set(v.id, v.pos.clone())
          // (their shoes off the stone into the cubby of the place they're called to, put away for them (item 203))
          const seat = guestsNow.current.find((x) => x.id === v.id)?.seat
          if (v.shoes && seat !== undefined) { SHOE_CELLS.shoes.set(seat % SHOE_CUBBIES, shoeKey(v.id)); benchShoesIn.current.add(v.id) }
          v.shoes = undefined
          v.handed = true; v.t = 0
        }
        // (kept, sat as they were, till the one walking in to the stool is there in their place: let go at once, there was a frame or two of
        // no one on the bench between)
        if (v.handed) {
          if (shownRef.current.some((x) => x.id === v.id) || v.t > 3) { sitters.current.delete(v.id); benchChanged = true }
          continue
        }
        // (sat there, or on their way to it, on none of the bench's lists (its list made afresh under them: a live update of the code, or lost),
        // or the shop shutting or past its last call: sent out, not left sat there for good (item 328, the owner's, 2026-11-18: 「還一堆客人坐著?」:
        // six still sat on the benches the next day, the shop kept from shutting by them till its last minute))
        if ((v.phase === 'sit' || v.phase === 'in') && !BENCH.gone.has(v.id) && !BENCH.up.has(v.id) &&
          (!BENCH.ids.includes(v.id) || SHOP.closing || LAST_CALL.on)) {
          BENCH.ids = BENCH.ids.filter((x) => x !== v.id)
          BENCH.since.delete(v.id)
          BENCH.gone.add(v.id)
        }
        // (sent away still on their way in: out from where they are, not from the place they never reached (the day's audit, 2026-11-15: one
        // 2.22 across in a frame at 04:01, the shop shutting, back to their place on the bench and out from there))
        if (BENCH.gone.has(v.id) && v.phase !== 'out') {
          // (back the way they came: round the corner in front of the bench again if they'd passed it)
          // (how far in they'd got, the stop at their pair as it went; past the corner in front of the bench or not)
          if (v.phase === 'in') {
            v.outFrom = v.pos.clone()
            const got = Math.min(pathLength(walk), withPause(v.t * sp, v.stepIn ?? 0, SHOE_OFF_S * sp))
            v.outVia = got > pathLength(walk.slice(0, walk.length - 1))
          }
          v.phase = 'out'; v.t = 0; v.fadeT = 0
        }
        if (v.phase === 'in') {
          // (stopped at the genkan's step a moment, out of their shoes and up onto the boards in their socks, the pair left on the stone toes out
          // (item 203: the bench is on the room's boards))
          const len = pathLength(walk), hold = SHOE_OFF_S * sp, at0 = (v.stepIn ??= v.shoeAt ? way.door.distanceTo(v.shoeAt) : stepAt(walk)), raw = v.t * sp
          const d = Math.min(len, withPause(raw, at0, hold)), { p, dir } = alongPath(walk, d)
          v.bow = at0 > 0 && raw >= at0 && raw < at0 + hold ? (raw - at0) / hold : -1
          if (at0 > 0 && raw >= at0 + hold * 0.55 && !v.shoes) {
            // (the pair left where they stood, toes out, in their place in the row)
            const spot = v.shoeAt ?? shoeSpotOf(v.spot, walk), r = shoeRow.current
            if (spot) v.shoes = { at: spot.clone().setY(0), yaw: r ? Math.atan2(r.toes.x, r.toes.z) : v.yaw + Math.PI }
          }
          v.pos.copy(p)
          v.yaw = turnSmooth(v.yaw, Math.atan2(dir.x, dir.z), Math.min(step, 0.1))
          v.fade = Math.min(1, d / 0.6 + v.t / FADE_S)
          if (raw >= len + hold) { v.phase = 'sit'; v.t = 0; v.bow = -1; benchChanged = true }
        } else if (v.phase === 'sit') {
          v.fade = 1
          v.pos.copy(at)
          // (sat facing into the room, their back to the wall)
          const yaw = Math.atan2(BENCH_B.x, BENCH_B.z)
          v.yaw += Math.atan2(Math.sin(yaw - v.yaw), Math.cos(yaw - v.yaw)) * Math.min(1, step * 6)
        } else {
          // (going: down onto the stone to their own pair, a moment there stepping back into them, and out of the door (item 412: they stopped
          // at the step's edge, the pair a stride off going from the row); with none down there (never got out of them), straight out)
          if (v.outShoe === undefined) v.outShoe = v.shoes ? v.shoes.at.clone().setY(0) : null
          const sh = v.outShoe
          const back = v.outFrom ? [v.outFrom, ...(v.outVia ? [before] : []), ...(sh ? [sh] : []), way.door] : [at, before, ...(sh ? [sh] : []), way.door]
          const len0 = pathLength(back)
          v.stepOut ??= sh ? pathLength(back.slice(0, back.length - 1)) : len0
          const on = v.stepOut
          const hold = (v.outHold ??= sh ? SHOE_OFF_S * sp : 0), raw = v.t * sp, len = len0 + hold
          const d = Math.min(len0, withPause(raw, on, hold)), { p, dir } = alongPath(back, d)
          v.bow = hold > 0 && raw >= on && raw < on + hold ? (raw - on) / hold : -1
          if (v.shoes && raw >= on + hold * 0.55) v.shoes = undefined
          v.pos.copy(p)
          v.yaw = turnSmooth(v.yaw, Math.atan2(dir.x, dir.z), Math.min(step, 0.1))
          if (len - raw < 0.9) v.fadeT += step
          v.fade = Math.max(0, Math.min(1, Math.max((len - raw) / 0.9, 1 - v.fadeT / FADE_S)))
          if (raw >= len && v.fade <= 0) { BENCH.gone.delete(v.id); sitters.current.delete(v.id); benchChanged = true }
        }
        const g = sitterObjs.current.get(v.id)
        if (g) {
          g.position.copy(v.pos)
          // (and as far aside as they've stepped for whoever they're passing (the crowd's, above, from where they were drawn last frame); sat
          // down, what's left of it eases back to nothing there, not snapped away)
          const off = aside.current.get(SITTER_KEY - v.id)
          if (off) { g.position.x += off.x; g.position.z += off.z }
          g.position.y = genkanY(counters, v.pos)
          // (shown once they're where they are: put in the scene between this and the frame's drawing, they were drawn a frame at the
          // bar's middle first, a flash there as each came (item 242))
          if (!placedOnce.has(g)) { placedOnce.add(g); g.visible = true; g.rotation.y = v.yaw }
          // (and those on the bench as they sit down, get up and go)
          g.rotation.y = turnToward(g.rotation.y, v.yaw, step * 1.5)
          // (a little bow at the step, down to their shoes)
          g.rotation.x = v.bow !== undefined && v.bow >= 0 ? 0.16 * Math.sin(Math.PI * v.bow) : 0
        }
      }
      if (benchChanged) setSitterList([...sitters.current.values()].map((v) => ({ id: v.id, sat: v.phase === 'sit' })))
      waiters.current.forEach((w, wi) => {
        const b = waiterBoxes.current[wi]
        if (!b) return
        b.visible = w.phase === 'toTill' || w.phase === 'hand' || w.phase === 'toStand' || w.phase === 'standPut'
        if (b.visible) {
          // (on their tray, where a plate rides (trayAt, below): up on the kitchen's dais as it's held, a step lower off it; it was 2 cm into
          // the tray and never came down off the dais)
          const d = w.pos.clone().sub(counters[0].at), a = d.dot(counters[0].along), l = d.dot(counters[0].lay)
          const onDais = a > kitchen.along[0] && a < kitchen.along[1] && l > kitchen.lay[0] && l < kitchen.lay[1]
          b.position.copy(w.pos).add(new THREE.Vector3(...HELD_AT).setY(HELD_AT[1] + 0.02).multiplyScalar(STAFF_SCALE).applyAxisAngle(UP_Y, w.look ?? w.yaw))
          // (not down into the genkan with the step's edge under them: they stand on the step up, the room's floor, as they hand it over)
          if (KITCHEN_DROP < 0 && !onDais) b.position.y += KITCHEN_DROP / scale
          b.rotation.y = w.look ?? w.yaw
        }
      })
    }
    // (glass broken on the floor whose sweeper's no longer on it (gone home, let go): free for the next)
    for (const sp of SPILLS.list) {
      const by = sp.by === null ? null : waiters.current[sp.by]
      if (sp.by !== null && (!by || by.spill !== sp.key || (by.phase !== 'sweepGo' && by.phase !== 'sweep' && by.phase !== 'wipeFloor'))) sp.by = null
    }
    waiters.current.forEach((w, wi) => {
      const home = homeOf(wi)
      // (coming in as the shop opens: in at the front door, along the aisle and through their gate to their place, each at their own
      // moment, unseen before it; no work till they're there)
      if (!ownerServes && !w.arrived) {
        const o = waiterObjs.current[wi], id = servers[wi]?.id ?? `server${wi}`
        if (!w.in) {
          if (o && performance.now() - SHOP.openedAt < 4000) {
            const way = [home.at.clone(), ...home.way.slice(1).map((v) => v.clone()), ...(home.counter ? [aisleCorner(counters[home.counter])] : []), doorOf(counters)]
            way.push(...doorOutOf(counters))
            w.in = makeTrip(id, 'in', way.reverse(), delayOf(id, SHOP.day + 0.5) * 0.8 + 0.8, paceOf(id))
          } else { w.arrived = true; clockIn(id, minutesNow()) }
        }
        if (w.in && o) {
          walkCommute(o, w.in, w)
          if (!w.in.done) return
          w.in = undefined
          w.arrived = true
          w.pos.copy(home.at)
          w.yaw = home.yaw
        }
      }
      // (nothing to do just now, or at something: for how they tire (game/shopState's STAFF_IDLE, data/staff's activityOf))
      if (!ownerServes) idleTick(servers[wi]?.id, (w.phase === 'idle' || w.phase === 'toWait') && w.run === null && !SHOP.leaving, dt)
      const duty = ownerServes ? 'all' : dutyOf(wi, nServers)
      // (the tray at their hands wherever they are: its height is as it's held standing up on the kitchen's dais, so down on the customers'
      // floor it comes down the dais's step with them (it stayed up, a plate riding 14 cm over their hands out on the floor))
      const rise = KITCHEN_DROP < 0 ? -KITCHEN_DROP / scale : 0
      const onDais = () => {
        const d = w.pos.clone().sub(counters[0].at), a = d.dot(counters[0].along), l = d.dot(counters[0].lay)
        return a > kitchen.along[0] && a < kitchen.along[1] && l > kitchen.lay[0] && l < kitchen.lay[1]
      }
      // (item 691: up on the step stool with them too, as it lifts their figure (eased, stoolLift): left out, what was on the tray stayed down a
      // stool's height under it as they stood at the sink and the first steps off it, 0.3 m, the Tester window's 690)
      const trayAt = () => w.pos.clone().add(new THREE.Vector3(...HELD_AT).setY(HELD_AT[1] + 0.02).multiplyScalar(STAFF_SCALE)
        .applyAxisAngle(UP_Y, w.look ?? w.yaw)).add(new THREE.Vector3(0, (onDais() ? 0 : -rise) + (w.lift ?? 0)
          + (waiterObjs.current[wi] ? stoolLifts.current.get(waiterObjs.current[wi]!) ?? 0 : 0), 0))
      const run = () => runs.current.find((x) => x.key === w.run)
      // (their way bent in past what stands out from the first counter's wall (item 387: aisleSqueeze); the way back's walked from its end,
      // where they are: bent from there)
      const go = (path: THREE.Vector3[], phase: WaiterPhase) => {
        const c0 = counters[0], line = -aisleOf(c0)
        const zones = stoolLine && wallKeep.current.boxes.length ? aisleSqueeze(wallKeep.current.boxes, line, stoolLine.back, SERVER_HALF) : []
        const back = phase === 'back'
        const bent = squeezePath(back ? [...path].reverse() : path, c0, line, zones)
        // (item 675: back from tipping what they cleared into the sink, their tray picked up off its top and lowered as they go; item 689: and
        // from washing up there, their hands up out of it over its top a step before they come down to their sides (let down at once, the
        // hands went through its cabinet as they turned away from it, 13 cm))
        w.fromSink = (back && (w.phase === 'drop' || w.phase === 'wash' || w.phase === 'handwash' || w.phase === 'skWash'))
          // (and off to the racks with the washer's or the basket's plates on it (item 689: held at their waist, it was in the cabinet as they
          // took them out, 7.5 cm): taken up over the top, lowered on the way)
          || (phase === 'unloadCarry' && (w.phase === 'unloadTake' || w.phase === 'basketTake'))
          // (and the washed skewers carried off to their holder: up out of the basin over the top first, the bundle with the hands)
          || (phase === 'skHolderGo' && w.phase === 'skWash')
        w.path = back && bent !== path ? bent.reverse() : bent; w.len = pathLength(w.path); w.phase = phase; w.t = 0
        // (item 722: off from waiting by the takeaway stand: a way begun at their place inside their gate (the ways out all are) set off on
        // from the stand, round what's in the kitchen, straight on to its next turn (back in to their place first, they passed the stand again:
        // the way to the chef goes round the cook table's end by it); one begun where they stand is from there already)
        if (w.waitAt && phase !== 'toWait') {
          w.waitAt = undefined
          const flatTo = (a: THREE.Vector3, b: THREE.Vector3) => Math.hypot(a.x - b.x, a.z - b.z)
          if (!back && w.path.length && flatTo(w.path[0], home.at) < 0.05 && flatTo(w.pos, home.at) > 0.05) {
            const rest = w.path.length > 1 ? w.path.slice(1) : w.path
            w.path = [...kitchenRoute(w.pos, rest[0]).slice(0, -1), ...rest]
            w.len = pathLength(w.path)
          }
        }
        w.still = 0
      }
      const walk = (then: () => void) => {
        // (from a standstill they pick up their pace over the first fifth of a second, not off at full speed at once (item 183, the owner's:
        // "the staff are far too stiff"))
        let d = rampedAlong(w.t, w.len)
        let { p, dir } = alongPath(w.path, d)
        // (item 659 d's next: the owner on his way home just ahead of them, on their line: slowed behind him, at a stand at a body's width,
        // so what they carry stays where it is on the tray (they're not pushed aside); stood, the stand-aside steps them off his way. No
        // longer than SERVER_HOLD_MOST at a time)
        const hold = BOSS_BED.passing && !ownerServes ? serverHold(p, dir, wi, adv) : 0
        if (hold > 0) { w.t = Math.max(0, w.t - adv * hold); d = rampedAlong(w.t, w.len); ({ p, dir } = alongPath(w.path, d)) }
        w.pos.copy(p)
        if (dir.x || dir.z) w.yaw = Math.atan2(dir.x, dir.z)
        if (d >= w.len) { w.t = 0; then() }
      }
      const face = (at: THREE.Vector3) => { w.yaw = Math.atan2(at.x - w.pos.x, at.z - w.pos.z) }
      const adv = step * paceOfStaff(servers[wi]?.id)
      w.t += adv
      // (the customer gone meanwhile: what was being carried to them put down, and the server goes back)
      if ((w.phase === 'fetch' || w.phase === 'pickup' || w.phase === 'go' || w.phase === 'set' || w.phase === 'toBowlWith' || w.phase === 'bowlWith') && !sitting(w.seat)) {
        dropBowls((b) => !(b.server === wi && b.with))
        for (const k of w.keys) {
          SERVICE.carried.delete(k)
          SERVICE.claimed.delete(k)
        }
        w.keys = []
        const r = run()
        // (a plate carried for them and never eaten off: back on the plating place's stack, or the racks with that full)
        if (r && r.phase === 'carry') {
          runs.current = runs.current.filter((x) => x !== r)
          if (PLATING.stock < STACK_CAP) PLATING.stock += 1
          else PLATE_RACK.n = putBack(PLATE_RACK.n, 1)
          redraw()
        }
        w.run = null
        w.slot = undefined
        // (back over the corners already passed, from where they are: none still ahead of them)
        const walked = w.phase === 'go' || w.phase === 'fetch' ? Math.min(w.len, w.t * SERVER_SPEED) : w.len
        const passed: THREE.Vector3[] = []
        for (let i = 1, at = 0; i < w.path.length - 1; i++) {
          at += w.path[i].distanceTo(w.path[i - 1])
          if (at < walked) passed.push(w.path[i])
        }
        go(w.phase === 'set' ? backPath(wi, w.seat).slice(0, -1).concat(w.pos.clone())
          : w.phase === 'fetch' ? [home.at.clone(), ...passed, w.pos.clone()]
            : [...fetchPath(wi), ...(w.phase === 'go' ? passed : []), w.pos.clone()], 'back')
        w.seat = -1
      }
      /** (item 207) what a server's filled themself, on their tray at once (no counter between), and the filling done */
      const trayFilled = (j: BowlJob) => {
        passQ.current.push({ guest: j.guest, seat: j.seat, rice: j.rice, soup: j.soup, row: -1, server: wi, up: 1, down: 0, wait: 0 })
        bowlJob.current = null
      }
      /** (item 207) customers' bowls waiting at the counter taken out: the oldest set, and one more for a seat at the same counter on the same
       * tray; over to the counter for them. Whether they went */
      const takeBowls = () => {
        const waiting = passQ.current.filter((b) => b.server === undefined && guestSits(b.guest, b.seat)).sort((a, b) => b.wait - a.wait)
        if (!waiting.length) return false
        const first = waiting[0], c = seats[first.seat]?.counter
        const more = waiting.filter((b) => b !== first && seats[b.seat]?.counter === c).slice(0, TRAY_SETS - 1)
        for (const b of [first, ...more]) b.server = wi
        const to = passSpot(), path = kitchenRoute(w.pos, to)
        if (!path.length || path[path.length - 1].distanceTo(to) > 0.02) path.push(to.clone())
        go(path, 'toBowlPass')
        return true
      }
      if (w.phase === 'idle') {
        // (looked about every quarter of a second, not every frame; the owner serving with no server hired: not while he's off washing up
        // (item 216))
        if (w.t >= 0.25 && !(ownerServes && !ownerFree('serve'))) {
          w.t = 0
          // (not at their place: the day's first moment, stood where it was before the kitchen's floor was looked at (in the miso pot): over to it)
          // (or by the takeaway stand, waiting there (item 722))
          const place = w.waitAt ?? home.at
          if (open && !SHOP.leaving && Math.hypot(w.pos.x - place.x, w.pos.z - place.z) > 0.05) { go(kitchenRoute(home.at, w.pos), 'back'); return }
          // (a takeaway's box packed and its customer waiting for it in the genkan: out to them with it before anything else, no one
          // else's on the way with it)
          const box = takeoutWay && !SHOP.leaving ? TAKEOUT.orders.find((o) => o.ready && !o.taken && !boxClaimed.current.has(o.id) &&
            visitors.current.get(o.id)?.phase === 'wait') : undefined
          if (box && (duty !== 'dish' || nServers < 2)) {
            boxClaimed.current.add(box.id)
            w.box = box.id
            // (from the serving counter, once it's there (item 167): to its front; else the plating place, as before)
            go(SERVE_COUNTER.out ? kitchenRoute(homeOf(wi).at, SERVE_COUNTER.out) : fetchPath(wi), 'toBox')
            return
          }
          // (a customer's food set out at the plating place, ready, or their bowls of rice and soup waiting at the counter: whichever's waited
          // the longer carried out first, by either server, before a tokkuri or anything of their own (item 207: the bowls first, and the floor's
          // server went from them to the sake and back while the food done off the fire waited at the plating place a quarter of an hour, as
          // long as three quarters; the food first always, and in a rush the bowls were never taken: three of twenty-one who'd asked for rice
          // had it, one of ten their soup))
          const ready = SHOP.leaving ? -1 : readySlot()
          const bowlsWait = SHOP.leaving || !STATION_OBJ.group ? -1
            : passQ.current.reduce((m, b) => (b.server === undefined && guestSits(b.guest, b.seat) ? Math.max(m, b.wait) : m), -1)
          // (the food first, as long as the bowls haven't waited BOWLS_LATE: a calm evening's food waited behind the bowls (item 207))
          // (item 835, the Tester window's: not only once they'd waited BOWLS_LATE as well: in a rush there was always food at the plating place
          // newer than them, and the bowls stood at the counter 6 to 12 minutes, its two rows full and the third cook kept from setting more)
          if (bowlsWait >= 0 && (ready < 0 || bowlsWait >= readyFor.current[ready]) && takeBowls()) return
          if (ready >= 0) {
            w.slot = ready
            w.seat = PLATING.slots[ready]!.seat
            go(fetchPath(wi), 'fetch')
            return
          }
          // (a customer's rice and soup waiting at the serving counter (items 205, 206): over for them and out to them on the tray; with no one
          // in the kitchen to fill them (the owner serving it all), filled by the server, at the cooker and the pot, and taken straight out)
          if (STATION_OBJ.group && !SHOP.leaving && (duty !== 'dish' || nServers < 2)) {
            const j = bowlJob.current
            if (!j && open && (!given || ownerServes) && BOWLS.want.length) {
              const b = nextBowls()
              if (b) {
                bowlJob.current = { ...b, by: wi, server: wi, stage: b.rice ? 'rice' : 'soup', t: 0, riceFill: 0, soupFill: 0, W: null }
                takeBowlsFor(b)
                const to = b.rice ? riceStand() : soupFillAt().stand, path = kitchenRoute(w.pos, to)
                if (!path.length || path[path.length - 1].distanceTo(to) > 0.02) path.push(to.clone())
                go(path, b.rice ? 'toRiceFill' : 'toSoupFill')
                return
              }
            }
          }
          // (a customer's tokkuri poured and waiting at the sake station (item 177): over for it, no one else on it, and out to them with it on
          // the tray; with no plater to pour it, poured by the server themself first)
          if (STATION_OBJ.group && !SHOP.leaving && (duty !== 'dish' || nServers < 2)) {
            let j = sakeJob.current
            if (!j && open && (!given || ownerServes) && SAKE.want.length) {
              const guest = SAKE.want.shift()!, seat = guestSeat(guest)
              if (seat < 0) { if (guestHere(guest)) SAKE.want.push(guest) }
              else { j = sakeJob.current = { guest, seat, pourer: wi, t: -1, server: wi }; sakeSpots.current.delete(seat); sakeSpotOf(seat) }
            }
            if (j && ((j.pourer === wi && j.t < 0) || (j.server === undefined && j.t >= POUR_TOTAL && guestSits(j.guest, j.seat)))) {
              j.server = wi
              const to = stationSpot(), path = kitchenRoute(w.pos, to)
              if (!path.length || path[path.length - 1].distanceTo(to) > 0.02) path.push(to.clone())
              go(path, 'toSakePass')
              return
            }
          }
          const slot = readySlot()
          // (glass broken on the floor (game/spills; the owner's): a floor server with no plate ready to carry out goes with a broom and sweeps
          // it up, no one else on it)
          const spill = !SHOP.leaving && sweeps(duty, slot >= 0) ? SPILLS.list.find((x) => x.by === null) : undefined
          const toSpill = spill ? spillPath(wi, spill) : null
          if (spill && toSpill) {
            spill.by = wi
            w.spill = spill.key
            w.broom = true
            go(toSpill, 'sweepGo')
            return
          }
          const spoken = new Set(waiters.current.flatMap((x) => x.carry ?? []))
          // (not while its customer's still sat there with their rice or soup (item 600): their bowls and chopsticks cleared with it once
          // they've gone, one trip, not two)
          const dirtyNow = runs.current.filter((r) => r.phase === 'dirty' && !spoken.has(r.key) && !stillAt(r))
          // (the sink and the dryer one server's at a time)
          const atSink = waiters.current.some((x) => x !== w && (x.phase === 'washGo' || x.phase === 'wash' || x.phase === 'unloadGo' || x.phase === 'unloadTake'
            || x.phase === 'handGo' || x.phase === 'handwash' || x.phase === 'basketGo' || x.phase === 'basketTake' || x.phase === 'skSinkGo' || x.phase === 'skWash'))
          // (the used skewers due a wash and no one on it already)
          const skewersDue = washGoes(SKEWERS.s) && !atSink && !waiters.current.some((x) => SK_PHASES.has(x.phase)) && !['toSkTray', 'takeSk', 'toSkSink', 'washSk', 'toHolder', 'putSk'].includes(platerRun.current.phase)
          // (the shop shut and going home: nothing new taken on; what's left is put away overnight with the closing)
          // (the player's washing up handed to the owner while he serves the floor himself (item 166): his next chore, once there's nothing
          // ready to carry out; the counter's stack in with the rest)
          const asked = open && ownerServes && HAND_WASH.ask === 'wash' && slot < 0 && dirty.current > 0 && !SHOP.leaving
          if (asked) { HAND_WASH.ask = null; PILE.n = 0 }
          // (someone waiting at the till with no cashier: round to the back of it to ring them up, before anything else (item 203))
          const tc = tillCall.current
          if (tc.who >= 0 && tc.staff < 0 && !cashierIn() && given) {
            tc.staff = wi
            const st = standSpots(), to = tillStaffSpot()
            // (from waiting by the stand (item 722): up to the kitchen's edge the way they came down, and on round to the till, as from their place)
            const path = w.waitAt ? [w.pos.clone(), st.edge.clone(), to] : [...kitchenRoute(home.at, st.edge), to]
            path[0] = w.pos.clone()
            go(path, 'tillGo')
            return
          }
          const chore = SHOP.leaving ? null : asked ? 'handwash' : nextChore({ duty, serve: slot >= 0, dirty: dirtyNow.length, sink: atSink ? 0 : staffSink(dirty.current, PILE.n), rack: PLATE_RACK.n,
            // (the draining basket left as it is till the shop opens (the owner, 2026-11-15: "four clean ones in the basket to start, right?":
            // the day's first four, dry already, were carried off to the racks the moment the page came up, the basket bare); the player may)
            dryer: atSink ? { n: 0, left: null } : DRYER, drain: atSink || !open ? { n: 0, left: null } : DRAIN, skewers: skewersDue && (washUrgent(SKEWERS.s) ? 'urgent' : true),
            dirtyAge: dirtyNow.reduce((m, r) => Math.max(m, r.t), 0),
            // (the bowls, the renge and the chopsticks in the sink and the washer (item 600))
            wares: atSink ? undefined : { sink: wareCount(WARE.sink), wash: wareWashNow(WARE.sink, WARE.cab), washer: wareCount(WARE.washer),
              urgent: wareUrgent(addWares(WARE.sink, WARE.washer), WARE.cab), out: wareOut(addWares(WARE.sink, WARE.washer), WARE.cab) },
            // (someone on the bench waiting for a seat (item 600))
            seatWait: BENCH.ids.length > 0 })
          if (chore === 'serve') {
            // (across the kitchen to the chef for it)
            w.slot = slot
            w.seat = PLATING.slots[slot]!.seat
            go(fetchPath(wi), 'fetch')
          } else if (chore === 'clear') {
            // (out through their gate to the dirty plates, the longest waiting first and up to two more at that counter, nearest first)
            // (the longest left first: the list is in the order they were set, not left)
            const first = dirtyNow.reduce((a, r) => (r.t > a.t ? r : a), dirtyNow[0])
            const c = seats[first.seat].counter
            const more = dirtyNow.filter((r) => r !== first && seats[r.seat].counter === c)
              .sort((a, b) => seats[a.seat].mid.distanceTo(seats[first.seat].mid) - seats[b.seat].mid.distanceTo(seats[first.seat].mid)).slice(0, 2)
            w.carry = [first.key, ...more.map((r) => r.key)]
            w.seat = first.seat
            go(backPath(wi, first.seat), 'clearGo')
          } else if (chore === 'wash' || chore === 'unload' || chore === 'handwash' || chore === 'unbasket') {
            // (across the kitchen to the sink: to wash what's in it into the washer under it (or by hand into the draining basket while the washer's
            // busy: the owner's, 2026-11-10), or to take the washer's clean plates, or the basket's dry ones, back to the racks)
            go(kitchenRoute(home.at, sinkFront()), chore === 'wash' ? 'washGo' : chore === 'unload' ? 'unloadGo' : chore === 'handwash' ? 'handGo' : 'basketGo')
          } else if (chore === 'skewers') {
            // (across the kitchen to the used skewers' bucket on the cook table's front, all of them out of it, to the sink with them)
            go(kitchenRoute(home.at, skewerSpot('skewer-tray', home.at)), 'skTrayGo')
          } else if (!chore && waitsByStand(duty) && !w.waitAt) {
            // (item 722, the owner's 「她在幹嘛?如果是閒置狀態請在外帶位」: nothing to do a moment (WAIT_AFTER), the floor's server goes
            // down to the takeaway stand behind the cashier and waits there, facing out to the room and the door, where a takeaway's bag is
            // set down; stood at their place inside their gate, they were by the cook table's pots, seeming to do nothing there)
            w.still = (w.still ?? 0) + 0.25
            if (w.still >= WAIT_AFTER) {
              const st = standSpots()
              const path = [...kitchenRoute(home.at, st.edge), st.reach]
              path[0] = w.pos.clone()
              go(path, 'toWait')
            }
          }
        }
      } else if (w.phase === 'fetch') walk(() => { w.phase = 'pickup'; face(plating.at) })
      // ---- ringing up at the till with no cashier (item 203): behind it facing the customer, the register theirs till the customer's paid
      else if (w.phase === 'tillGo') walk(() => {
        w.phase = 'tillAt'
        const tc = tillCall.current
        tc.there = tc.who >= 0
        face(payOf(counters).spot)
      })
      else if (w.phase === 'tillAt') {
        const tc = tillCall.current
        if (tc.who >= 0 && !tc.there) tc.there = true
        // (paid and gone, or no one waiting any more: back the way they came)
        if (tc.who < 0 && w.t > 0.6) {
          tc.staff = -1
          tc.there = false
          const st = standSpots()
          go([...kitchenRoute(home.at, st.edge), w.pos.clone()], 'back')
        }
      }
      // ---- the iron skewers (game/skewers): the used bucket emptied into their hands, washed at the sink, put back in the clean ones' bucket
      else if (w.phase === 'skTrayGo') walk(() => { w.phase = 'skTake'; face(inBar('skewer-tray', w.pos)) })
      else if (w.phase === 'skTake' && w.t > 0.6) { SKEWERS.s = pickUpDirty(SKEWERS.s); go(kitchenRoute(w.pos, sinkFront()), 'skSinkGo') }
      else if (w.phase === 'skSinkGo') walk(() => {
        w.phase = 'skWash'
        face(inBar('SinkBasinFloor', endOf(1)))
        const id = ownerServes ? 'owner' : servers[wi]?.id
        if (id) STAFF_TALK.push({ key: performance.now() + 0.7 + wi, id, text: LINES[lang].skewerWash, until: performance.now() + 2400 })
      })
      else if (w.phase === 'skWash' && w.t > SKEWER_WASH_S) { soapPlate(); meterWater('dish'); go(kitchenRoute(w.pos, skewerSpot('skewer-holder', w.pos)), 'skHolderGo') }
      else if (w.phase === 'skHolderGo') walk(() => { w.phase = 'skPut'; face(inBar('skewer-holder', w.pos)) })
      // ('back' walks its way from its end to its start, so it's given from their place to where they are, as every other way back is: given the
      // other way round, they were at their place the moment they set off, walked back out to the holder and were at their place again)
      else if (w.phase === 'skPut' && w.t > 0.5) { SKEWERS.s = putBackClean(SKEWERS.s); rattleSound(); go(kitchenRoute(home.at, w.pos), 'back') }
      else if (w.phase === 'sweepGo') walk(() => {
        // (at the broken glass: facing it, broom down, a word to the room)
        w.phase = 'sweep'
        const sp = SPILLS.list.find((x) => x.key === w.spill)
        if (sp && frame.current) face(frame.current.worldToLocal(new THREE.Vector3(sp.at[0], sp.at[1], sp.at[2])))
        const id = ownerServes ? 'owner' : servers[wi]?.id
        if (id) STAFF_TALK.push({ key: performance.now() + wi, id, text: LINES[lang].sweepSay(wi + (w.spill ?? 0)), until: performance.now() + 2800 })
      })
      else if (w.phase === 'sweep') {
        // (the glass swept up as they go (the shards drawn in: Spills), the drink left on the floor; swept, the broom put by and the cloth out
        // to wipe it dry (item 116: the glass first, then the wet))
        const sp = SPILLS.list.find((x) => x.key === w.spill)
        if (sp) sp.left = Math.max(0, 1 - w.t / SWEEP_S)
        if (sp && nextClean(sp.left, sp.wet) === 'wipe') { w.phase = 'wipeFloor'; w.t = 0; w.broom = false }
        else if (!sp) w.phase = 'wipeFloor'
      }
      else if (w.phase === 'wipeFloor') {
        // (down on the floor with the cloth, wiping round and round over the drink till it's dry; done, gone, and back the way they came)
        const sp = SPILLS.list.find((x) => x.key === w.spill)
        if (sp) sp.wet = Math.max(0, 1 - w.t / FLOOR_WIPE_S)
        if (!sp || nextClean(sp.left, sp.wet) === 'done') {
          SPILLS.list = SPILLS.list.filter((x) => x.key !== w.spill)
          w.spill = undefined
          // (any more glass broken that no one's on: straight on to it along the aisle, and only then back (the owner's, 2026-11-11: he went
          // back to his place after each and came out again for the next))
          const next = SHOP.leaving ? undefined : SPILLS.list.find((x) => x.by === null)
          const to = next ? spillPath(wi, next) : null
          const here = nearestSeat(w.pos)
          if (next && to && to.length >= 2) {
            next.by = wi
            w.spill = next.key
            w.broom = true
            const there = nearestSeat(to[to.length - 2])
            const turn = seats[here].counter === seats[there].counter ? [] : [aisleCorner(counters[seats[here].counter === 0 ? seats[there].counter : seats[here].counter])]
            go([w.pos.clone(), seats[here].aisle.clone(), ...turn, ...to.slice(-2)], 'sweepGo')
          } else go([...backPath(wi, here).slice(0, -1), w.pos.clone()], 'back')
        }
      }
      else if (w.phase === 'toBox') walk(() => { w.phase = 'boxTake'; face(takeoutOf().at) })
      else if (w.phase === 'boxTake' && w.t > 0.45) {
        // (the bag up off the cook table (Roasting lets its food go with it): with a cashier at the till, across the kitchen and down off its
        // floor to the takeaway stand behind them; else back across the kitchen, out through their gate to the step)
        const o = TAKEOUT.orders.find((x) => x.id === w.box)
        if (o) o.taken = true
        if (cashierIn()) {
          const st = standSpots()
          const path = [...kitchenRoute(SERVE_COUNTER.out ?? pickupSpot, st.edge), st.reach]
          path[0] = w.pos.clone()
          go(path, 'toStand')
        } else {
          const path = [...kitchenRoute(SERVE_COUNTER.out ?? pickupSpot, home.at), ...tillPath(wi).slice(1)]
          path[0] = w.pos.clone()
          go(path, 'toTill')
        }
      } else if (w.phase === 'toStand') walk(() => { w.phase = 'standPut'; face(standSpots().at) })
      // (there by the stand (item 722): waiting, turned the way their place faces, out to the room and the door)
      else if (w.phase === 'toWait') walk(() => { w.phase = 'idle'; w.waitAt = w.pos.clone(); w.yaw = home.yaw; w.seat = -1 })
      else if (w.phase === 'standPut' && w.t > 0.45) {
        // (set down on it for the cashier; back the way they came)
        if (w.box !== undefined) TAKEOUT_STAND.bags.push(w.box)
        boxClaimed.current.delete(w.box ?? -1)
        w.box = undefined
        // (the floor's server, who waits here anyway with nothing to do (item 722): stays, turned out to the room; walked back in to their
        // place, they came straight out again)
        if (waitsByStand(duty)) { w.phase = 'idle'; w.waitAt = w.pos.clone(); w.yaw = home.yaw; w.t = 0; w.still = 0 }
        // (the way they came, from their place to here: walked from its end, here, back to its start (the owner's item 36: given from here,
        // they were back inside their gate the moment they set off, walked out to the stand again, and were at their place again, at a jump
        // each time, every takeaway the cashier handed over)
        // (and from where that way began to their place round what's in the kitchen (item 173): the way out began at the serving counter
        // (item 167), and their place put straight before it, the last of it went straight through the low rack, the warmer and the cook
        // table's corner: pushed out of the table, a jump each time, a dozen a night)
        else go([...kitchenRoute(home.at, w.path[0] ?? w.pos).slice(0, -1), ...w.path.slice(0, -1).map((v) => v.clone()), w.pos.clone()], 'back')
      } else if (w.phase === 'toTill') walk(() => {
        w.phase = 'hand'
        const v = visitors.current.get(w.box ?? -1)
        if (v) face(v.pos)
        const id = ownerServes ? 'owner' : servers[wi]?.id
        if (id) STAFF_TALK.push({ key: performance.now() + wi, id, text: LINES[lang].takeoutHand(!!v?.rider), until: performance.now() + 3000 })
      })
      else if (w.phase === 'hand' && w.t > 0.6) {
        // (into their hands; back the way they came, in through their gate)
        const v = visitors.current.get(w.box ?? -1)
        if (v) v.order.handed = true
        boxClaimed.current.delete(w.box ?? -1)
        w.box = undefined
        go(tillPath(wi).slice(0, -1).concat(w.pos.clone()), 'back')
      }
      // (the sake station (item 177): there, square on to it; their own to pour first (no plater), or lifted onto the tray as it waits)
      else if (w.phase === 'toSakePass') walk(() => {
        w.yaw = stationYaw()
        const j = sakeJob.current
        if (!j || j.server !== wi) go(kitchenRoute(homeOf(wi).at, w.pos), 'back')
        else if (j.pourer === wi && j.t < POUR_TOTAL) { w.phase = 'sakePour'; j.t = 0 }
        else w.phase = 'sakeUp'
      })
      else if (w.phase === 'sakePour') {
        const j = sakeJob.current
        if (j) j.t = Math.min(POUR_TOTAL, w.t)
        if (!j) go(kitchenRoute(homeOf(wi).at, w.pos), 'back')
        else if (w.t >= POUR_TOTAL) { w.phase = 'sakeUp'; w.t = 0 }
      }
      else if (w.phase === 'sakeUp') {
        const j = sakeJob.current
        if (!j || !guestSits(j.guest, j.seat)) { sakeJob.current = null; go(kitchenRoute(homeOf(wi).at, w.pos), 'back') }
        else {
          j.up = Math.min(1, w.t / SAKE_UP_S)
          if (w.t >= SAKE_UP_S) {
            // (on the tray: back across the kitchen to their place, out through their gate, along the aisle and in beside the customer)
            const h = homeOf(wi)
            const out = h.way.length < 2 ? [aisleBeside(j.seat), besideSeat(j.seat)] : backPath(wi, j.seat).slice(1)
            go([...kitchenRoute(w.pos, h.at), ...out], 'sakeGo')
          }
        }
      }
      else if (w.phase === 'sakeGo') walk(() => {
        const j = sakeJob.current
        if (!j) { go(kitchenRoute(homeOf(wi).at, w.pos), 'back'); return }
        w.phase = 'sakeSet'
        face(sakeSpotOf(j.seat).at)
        const id = ownerServes ? 'owner' : servers[wi]?.id
        if (id) STAFF_TALK.push({ key: performance.now() + wi, id, text: LINES[lang].sakeServe(j.guest), until: performance.now() + 2600 })
      })
      else if (w.phase === 'sakeSet') {
        const j = sakeJob.current
        if (j) j.down = Math.min(1, w.t / SAKE_SET_S)
        if (!j || w.t >= SAKE_SET_S) {
          // (down at their place, the cup by it: theirs (Roasting has them drink it); they gone meanwhile, it's taken back with the server)
          if (j && guestSits(j.guest, j.seat)) { SAKE_SEATS.add(j.seat); SAKE.ready.add(j.guest); SAKE.served++ }
          const seat = j?.seat ?? nearestSeat(w.pos)
          sakeJob.current = null
          go(backPath(wi, seat).slice(0, -1).concat(w.pos.clone()), 'back')
        }
      }
      // (a customer's bowls: at the counter, taken up onto the tray; or filled by the server themself at the cooker and the pot; out to the
      // customer's place and set down there, rice on their left, soup on their right)
      else if (w.phase === 'toBowlPass') walk(() => {
        const b = passQ.current.find((x) => x.server === wi)
        if (!b) go(kitchenRoute(homeOf(wi).at, w.pos), 'back')
        else { w.phase = 'bowlUp'; w.t = 0; face(passAt(Math.max(0, b.row), 'rice').lerp(passAt(Math.max(0, b.row), 'soup'), 0.5)) }
      })
      else if (w.phase === 'toRiceFill') walk(() => { const j = bowlJob.current; if (!j) { go(kitchenRoute(homeOf(wi).at, w.pos), 'back'); return } j.W = riceFillAt(); j.t = 0; w.yaw = Math.atan2(j.W.face.x, j.W.face.z); w.phase = 'bowlRice'; w.t = 0 })
      else if (w.phase === 'bowlRice') {
        const j = bowlJob.current
        if (!j) go(kitchenRoute(homeOf(wi).at, w.pos), 'back')
        else {
          j.t = Math.min(RICE_LEN, w.t)
          if (w.t >= RICE_LEN) {
            const r = takeRice(RICE.rice, RICE.kama)
            RICE.rice = r.rice; RICE.kama = r.kama; RICE.lid = 0
            j.riceFill = 1
            if (j.soup) { j.stage = 'soup'; const to = soupFillAt().stand, path = kitchenRoute(w.pos, to); if (!path.length || path[path.length - 1].distanceTo(to) > 0.02) path.push(to.clone()); go(path, 'toSoupFill') }
            else { trayFilled(j); w.phase = 'bowlUp'; w.t = BOWL_UP_S }
          }
        }
      }
      else if (w.phase === 'toSoupFill') walk(() => { const j = bowlJob.current; if (!j) { go(kitchenRoute(homeOf(wi).at, w.pos), 'back'); return } j.W = soupFillAt(); j.t = 0; w.yaw = Math.atan2(j.W.face.x, j.W.face.z); w.phase = 'bowlSoup'; w.t = 0 })
      else if (w.phase === 'bowlSoup') {
        const j = bowlJob.current
        if (!j) go(kitchenRoute(homeOf(wi).at, w.pos), 'back')
        else {
          j.t = Math.min(SOUP_LEN, w.t)
          if (w.t >= SOUP_LEN) {
            const b = takeBowl(SOUP.pot, SOUP.left)
            SOUP.pot = b.pot; SOUP.left = b.left
            j.soupFill = 1
            trayFilled(j)
            w.phase = 'bowlUp'; w.t = BOWL_UP_S
          }
        }
      }
      else if (w.phase === 'bowlUp') {
        // (those whose customer's gone meanwhile put by; the rest lifted onto the tray)
        dropBowls((b) => b.server !== wi || guestSits(b.guest, b.seat))
        const mine = passQ.current.filter((b) => b.server === wi)
        if (!mine.length) go(kitchenRoute(homeOf(wi).at, w.pos), 'back')
        else {
          for (const b of mine) b.up = Math.min(1, w.t / BOWL_UP_S)
          if (w.t >= BOWL_UP_S) {
            // (on the tray: back across the kitchen to their place, out through their gate, along the aisle and in beside the first customer)
            const h = homeOf(wi), seat = mine[0].seat
            const out = h.way.length < 2 ? [aisleBeside(seat), besideSeat(seat)] : backPath(wi, seat).slice(1)
            go([...kitchenRoute(w.pos, h.at), ...out], 'bowlGo')
          }
        }
      }
      else if (w.phase === 'bowlGo') walk(() => {
        const b = passQ.current.find((x) => x.server === wi)
        if (!b) { go(kitchenRoute(homeOf(wi).at, w.pos), 'back'); return }
        w.phase = 'bowlSet'
        faceBar(w, b.seat)
        const id = ownerServes ? 'owner' : servers[wi]?.id
        if (id) STAFF_TALK.push({ key: performance.now() + wi, id, text: LINES[lang].sideServe(b.guest, b.rice, b.soup), until: performance.now() + 2600 })
      })
      else if (w.phase === 'bowlSet') {
        const b = passQ.current.find((x) => x.server === wi)
        if (b) b.down = Math.min(1, w.t / BOWL_SET_S)
        if (!b || w.t >= BOWL_SET_S) {
          // (down at their place: theirs (Roasting has them eat them); they gone meanwhile, taken back with the server)
          if (b && guestSits(b.guest, b.seat)) setBowls(b)
          dropBowls((x) => x !== b, (x) => guestSits(x.guest, x.seat))
          const seat = b?.seat ?? nearestSeat(w.pos)
          // (the next set on the tray: along the aisle to its place, at the same counter (item 207)); their customer gone, put by
          const next = passQ.current.find((x) => x.server === wi && guestSits(x.guest, x.seat))
          dropBowls((x) => x.server !== wi || x === next)
          if (next) go([w.pos.clone(), aisleBeside(seat), aisleBeside(next.seat), besideSeat(next.seat)], 'bowlGo')
          else go(backPath(wi, seat).slice(0, -1).concat(w.pos.clone()), 'back')
        }
      }
      else if (w.phase === 'pickup' && pickupReady(w.slot, w.t)) {
        // (what's set out for the seat taken up off the plating place, once nothing more's flying to it: its plate, if one's laid there, onto the tray,
        // and the food with it; the slot free)
        const k = w.slot ?? -1
        w.keys = [...SERVICE.waiting.entries()].filter(([, n]) => n === w.seat).map(([key]) => key)
        for (const key of w.keys) {
          SERVICE.waiting.delete(key)
          SERVICE.claimed.add(key)
        }
        const r = runs.current.find((x) => x.phase === 'ready' && x.slot === k)
        if (r) {
          r.phase = 'carry'
          r.slot = undefined
          w.run = r.key
          runObjs.current.get(r.key)?.scale.setScalar(1)
        }
        if (k >= 0) PLATING.slots[k] = null
        w.slot = undefined
        // (that customer's bowls waiting at the counter taken out with it, on the same tray beside the plate: a meal goes out together (item
        // 207: a trip of their own each, the bowls had both servers going all evening, the food left waiting at the plating place behind them))
        const withIt = passQ.current.find((b) => b.server === undefined && b.seat === w.seat && guestSits(b.guest, b.seat))
        if (withIt) {
          withIt.server = wi
          withIt.with = true
          const to = passSpot(), path = kitchenRoute(w.pos, to)
          if (!path.length || path[path.length - 1].distanceTo(to) > 0.02) path.push(to.clone())
          go(path, 'toBowlWith')
        } else {
          const rt = routeTo(w.seat, wi)
          rt.path[0] = w.pos.clone()
          go(rt.path, 'go')
        }
      } else if (w.phase === 'toBowlWith') walk(() => {
        const b = passQ.current.find((x) => x.server === wi && x.with)
        w.phase = 'bowlWith'
        w.t = 0
        if (b && b.row >= 0) face(passAt(b.row, 'rice').lerp(passAt(b.row, 'soup'), 0.5))
      })
      else if (w.phase === 'bowlWith') {
        const b = passQ.current.find((x) => x.server === wi && x.with)
        if (b) b.up = Math.min(1, w.t / BOWL_UP_S)
        if (!b || w.t >= BOWL_UP_S) {
          // (on the tray with the food: out through their gate, along the aisle, in beside the customer)
          const h = homeOf(wi)
          const out = h.way.length < 2 ? [aisleBeside(w.seat), besideSeat(w.seat)] : backPath(wi, w.seat).slice(1)
          go([...kitchenRoute(w.pos, h.at), ...out], 'go')
        }
      } else if (w.phase === 'go') walk(() => {
        w.phase = 'set'; faceBar(w, w.seat)
        const id = servers[wi]?.id
        if (id) STAFF_TALK.push({ key: performance.now() + wi, id, text: LINES[lang].serveSay(Math.floor(Math.random() * 3)), until: performance.now() + 2600 })
      })
      else if (w.phase === 'set' && w.t > 0.4) {
        // (down at their place: the plate, and what's on it with it; their bowls brought with it too (item 207)); heard as it's set down (item 320)
        const r = run()
        if (r && frame.current) plateDownSound(frame.current.localToWorld(plateAt(w.seat).clone()))
        if (r && r.phase === 'carry') r.phase = 'set'
        for (const b of passQ.current) if (b.server === wi && b.with && guestSits(b.guest, b.seat)) setBowls(b)
        dropBowls((b) => !(b.server === wi && b.with), (b) => guestSits(b.guest, b.seat))
        for (const k of w.keys) {
          SERVICE.carried.delete(k)
          SERVICE.claimed.delete(k)
          SERVICE.delivered.add(k)
        }
        // (its turn kept for Roasting to lay what's on it by, till it's laid (item 228))
        w.keys = []
        w.run = null
        // (on the way back, the dirty plates left along this counter that nobody's gone for, the nearest first, a tray's three: taken up as
        // they go by, to the sink with them (item 53: only the floor's server cleared, and only with nothing to carry, and on an ordinary
        // evening nearly three of the eight seats stood with a dirty plate on them at any time, not to be sat at till it's cleared))
        const spoken = new Set(waiters.current.flatMap((x) => x.carry ?? []))
        const hereN = w.seat, here = seats[hereN]
        const by = SHOP.leaving ? [] : onTheWay(here.counter, runs.current.filter((x) => x.phase === 'dirty' && !spoken.has(x.key) && !stillAt(x))
          .map((x) => ({ run: x, counter: seats[x.seat].counter, far: seats[x.seat].mid.distanceTo(here.mid) })))
        if (by.length) {
          w.carry = by.map((x) => x.run.key)
          w.seat = by[0].run.seat
          go([w.pos.clone(), aisleBeside(hereN), aisleBeside(by[0].run.seat), besideSeat(by[0].run.seat)], 'clearGo')
        }
        // (back the shortest way to their place, in through their gate)
        else go(backPath(wi, w.seat).slice(0, -1).concat(w.pos.clone()), 'back')
      } else if (w.phase === 'back') {
        // (picking up their pace on the way back too (item 183))
        const d = rampedAlong(w.t, w.len)
        const { p, dir } = alongPath(w.path, w.len - d)
        w.pos.copy(p)
        w.yaw = Math.atan2(-dir.x, -dir.z)
        if (d >= w.len) {
          w.phase = 'idle'
          w.pos.copy(home.at)
          w.yaw = home.yaw
          w.t = 0
          w.seat = -1
          w.broom = false
        }
      } else if (w.phase === 'clearGo' || w.phase === 'clearBack') walk(() => {
        if (w.phase === 'clearGo') {
          // (at the seat: the plate up off the bar onto the tray)
          const r = runs.current.find((x) => x.key === (w.carry ?? []).find((k) => runs.current.find((y) => y.key === k)?.phase === 'dirty'))
          if (r) { r.phase = 'taken'; r.from = plateAt(r.seat); faceBar(w, r.seat); if (r.ware?.chops) CHOPS_OFF.add(r.seat) }
          w.lay = undefined
          w.phase = 'clearTake'
        } else {
          face(inBar('SinkBasinFloor', endOf(1)))
          w.phase = 'drop'
        }
      })
      // (the clean pair laid as the wipe's last stroke ends (item 600): begun LAY_S before it, so clearing a place takes no longer than it did)
      else if (w.phase === 'clearTake' && w.t > CLEAR_WIPE_AT + WIPE_S - LAY_S && laidAgain(w) && w.t > CLEAR_WIPE_AT + WIPE_S) {
        // (another dirty plate at this counter still to take: on along the aisle to it; or back in through their gate, across to the sink)
        const next = runs.current.find((x) => (w.carry ?? []).includes(x.key) && x.phase === 'dirty')
        if (next) {
          const from = w.seat
          w.seat = next.seat
          go([w.pos.clone(), aisleBeside(from), aisleBeside(next.seat), besideSeat(next.seat)], 'clearGo')
        } else {
          const back = backPath(wi, w.seat).reverse()
          back[0] = w.pos.clone()
          go([...back, ...kitchenRoute(home.at, sinkFront()).slice(1)], 'clearBack')
        }
      } else if (w.phase === 'drop' && w.t > 0.5) {
        // (into the sink with the dirty ones; the sticks left on them into the bin beside it (the owner's); the bones and the tissues with
        // them, and the bottles and cans into the recycling bin (item 208))
        const keys = new Set(w.carry ?? [])
        const taken = runs.current.filter((x) => keys.has(x.key) && x.phase === 'taken')
        SINK_BIN.sticks += taken.reduce((n, x) => n + (x.sticks ?? 0), 0)
        binThrow(taken)
        for (const x of taken) if (!x.bare) { SINK.dirt.push(x.dirt ?? DIRT_BASE); SINK.kinds.push(x.kind ?? 'round') }
        // (the bowls into the basin with them, the chopsticks and the renge into the soaking pot (item 600))
        for (const x of taken) if (x.ware) WARE.sink = addWares(WARE.sink, x.ware)
        WARE.ver++
        runs.current = runs.current.filter((x) => !keys.has(x.key))
        dirty.current += taken.filter((x) => !x.bare).length
        w.carry = []
        w.seat = -1
        go(kitchenRoute(home.at, w.pos), 'back')
        redraw()
      } else if (w.phase === 'washGo' || w.phase === 'unloadGo' || w.phase === 'handGo' || w.phase === 'basketGo') walk(() => {
        face(inBar(w.phase === 'basketGo' ? 'SinkRackSlot0' : 'SinkBasinFloor', endOf(1)))
        if ((w.phase === 'washGo' || w.phase === 'handGo') && servers[wi]?.id && Math.random() < 0.6) STAFF_TALK.push({ key: performance.now() + wi, id: servers[wi].id, text: LINES[lang].washSay(Math.floor(Math.random() * 3)), until: performance.now() + 2600 })
        w.phase = w.phase === 'washGo' ? 'wash' : w.phase === 'handGo' ? 'handwash' : w.phase === 'basketGo' ? 'basketTake' : 'unloadTake'
      })
      // (the dirtier the plate on top, the longer it's scrubbed: one soaked, a rinse (game/plates' handTime))
      else if (w.phase === 'handwash' && w.t >= handTime(SINK.dirt.at(-1) ?? 1)) {
        // (the washer busy: a plate scrubbed by hand under the running tap and stood in the draining basket beside the sink, one at a time; the
        // sink washed empty or the basket full, back to their place)
        w.t = 0
        // (not the stack left on the counter (item 103): only what's over it)
        const pile = pileLeft(PILE.n, dirty.current), before = dirty.current
        const r = handOne(before - pile, DRAIN)
        r.dirty += pile
        if (r.dirty !== before) {
          dirty.current = r.dirty
          DRAIN.n = r.drain.n
          DRAIN.left = r.drain.left
          soapPlate(); meterWater('dish')
          const o = waiterObjs.current[wi]
          if (o) { washSplash(o.getWorldPosition(SOUND_AT)); window.setTimeout(() => plateClink(SOUND_AT), 520) }
          redraw()
        }
        if (dirty.current <= pile || DRAIN.n >= DRAIN_CAP || r.dirty === before) go(kitchenRoute(home.at, w.pos), 'back')
      } else if (w.phase === 'basketTake' && w.t > 0.6) {
        // (the basket's drained plates onto the tray, a trip's worth, and across to the racks with them)
        const u = unbasket(DRAIN)
        DRAIN.n = u.drain.n
        DRAIN.left = u.drain.left
        w.stack = u.take
        go(kitchenRoute(w.pos, rackFront(rackNow(PLATE_RACK.n + 1))), 'unloadCarry')
        redraw()
      }
      else if (w.phase === 'wash' && w.t >= WASH_EACH) {
        // (at the sink, the tap running: a plate washed out of the sink and stood in the dryer, its door down, one at a time; the sink washed
        // empty or the dryer full, its door shut and it started, and back to their place)
        w.t = 0
        const pile = pileLeft(PILE.n, dirty.current), before = dirty.current
        const r = washOne(before - pile, DRYER)
        r.dirty += pile
        let moved = r.dirty !== before
        if (moved) {
          dirty.current = r.dirty
          DRYER.n = r.dryer.n
          soapPlate(); meterWater('dish')
          // (heard: the splash and scrub in the soapy water, the plate stood in the dryer with a clink)
          const o = waiterObjs.current[wi]
          if (o) { washSplash(o.getWorldPosition(SOUND_AT)); window.setTimeout(() => plateClink(SOUND_AT), 330) }
          redraw()
        } else {
          // (its plates in, or none: the sink's bowls next, a bowl at a time into its bowls' rack, then the soaking pot's chopsticks and renge all
          // at once into its cutlery basket (item 600))
          const m = wareIntoWasher(WARE.sink, WARE.washer, DRYER.left !== null, WARE.cab)
          if (m.moved) {
            WARE.sink = m.sink
            WARE.washer = m.washer
            WARE.ver++
            moved = true
            soapPlate(); meterWater('dish')
            const o = waiterObjs.current[wi]
            if (o) { washSplash(o.getWorldPosition(SOUND_AT)); window.setTimeout(() => plateClink(SOUND_AT), m.moved === 'cutlery' ? 180 : 330) }
          }
        }
        // (done: nothing more goes in: the sink's plates washed (or the washer full of them) and none of its bowls or cutlery will go; or nothing
        // could be put in at all)
        const morePlates = dirty.current - pile > 0 && DRYER.n < DRYER_CAP && DRYER.left === null
        const moreWare = wareIntoWasher(WARE.sink, WARE.washer, DRYER.left !== null, WARE.cab).moved !== null
        if (!moved || (!morePlates && !moreWare)) {
          // (started: its door shut, whoever had let it down)
          if (DRYER.left === null && (DRYER.n > 0 || wareCount(WARE.washer) > 0)) { DRYER.left = DRY_S; DRYER.manual = false }
          go(kitchenRoute(home.at, w.pos), 'back')
        }
      } else if (w.phase === 'unloadTake' && w.t > 0.6) {
        // (the dryer's door down: a trip's worth of the dried plates out onto the tray, and across to the racks with them)
        const u = unload(DRYER)
        DRYER.n = u.dryer.n
        DRYER.left = u.dryer.left
        w.stack = u.take
        // (and the washed bowls, renge and chopsticks onto the tray with them, for the cabinets under the racks (item 600))
        const t = wareTrip(WARE.washer)
        WARE.washer = t.left
        w.ware = wareCount(t.take) > 0 ? t.take : undefined
        if (wareCount(WARE.washer) > 0 && DRYER.left === null) DRYER.left = 0
        WARE.ver++
        go(kitchenRoute(w.pos, rackFront(rackNow(PLATE_RACK.n + 1))), 'unloadCarry')
        redraw()
      } else if (w.phase === 'unloadCarry') walk(() => { face(rackTop(rackNow(PLATE_RACK.n + 1))); w.phase = 'unloadPut' })
      else if (w.phase === 'unloadPut' && w.t > 0.5) {
        // (set down on the rack's stack: a clink or two)
        const o = waiterObjs.current[wi]
        if (o && w.stack) { plateClink(o.getWorldPosition(SOUND_AT)); window.setTimeout(() => plateClink(SOUND_AT), 120) }
        PLATE_RACK.n = putBack(PLATE_RACK.n, w.stack ?? 0)
        w.stack = 0
        // (the bowls behind the cabinet's doors, the chopsticks and the renge in its drawers (item 600); a place left bare for want of a clean
        // pair laid now there are some)
        if (w.ware) {
          WARE.cab = addWares(WARE.cab, w.ware)
          w.ware = undefined
          WARE.ver++
          relayBare()
        }
        go(kitchenRoute(home.at, w.pos), 'back')
      }
      // (item 675: their tray lifted over the sink's top as they come the last of the way up to it with what they've cleared, and down again
      // over the first of the way from it after (held at their waist, it and the hands under it went into the sink's cabinet as they came up
      // and turned away, 7.5 and 25 cm): the hands under it just over the top, eased in and out along the way)
      // (item 693: the step stool's height for them this frame, taken once, here, before what's on their tray is placed (trayAt reads it): a
      // frame behind, it was over the tray by as much as they'd come down off the stool in a frame, 11 cm, as they stepped off it with the
      // washer's plates; their figure takes the same below)
      if (waiterObjs.current[wi]) stoolLift(waiterObjs.current[wi]!, w.pos, tick(dt))
      w.lift = 0
      // (item 689: so too up to the washer or the draining basket for their plates, held up as they're taken onto it, and lowered on the way to
      // the racks)
      // (item 693: and the skewers carried up to the sink to be washed: held at their waist, the hands went 0.62 m on into the cabinet as they
      // came up, every time, the Tester window's)
      const liftUp = w.phase === 'clearBack' || w.phase === 'unloadGo' || w.phase === 'basketGo' || w.phase === 'skSinkGo'
      const liftAt = w.phase === 'drop' || w.phase === 'unloadTake' || w.phase === 'basketTake'
      if (liftUp || liftAt || ((w.phase === 'back' || w.phase === 'unloadCarry' || w.phase === 'skHolderGo') && w.fromSink)) {
        // (kept up as they tip it in: let down at once, their hands went back into the cabinet before they reached into the basin)
        const d = rampedAlong(w.t, w.len), top = sinkTopBar(), fig = waiterObjs.current[wi]
        const k = liftAt ? 1 : liftUp ? (LIFT_UP - (w.len - d - LIFT_END)) / LIFT_UP : (LIFT_DOWN - (d - LIFT_HOLD)) / LIFT_DOWN
        if (k > 0 && fig && Number.isFinite(top)) {
          // (from their figure's own feet (up on the dais, the step stool): the hands' undersides (LIFT_HANDS of their frame under the tray's
          // height) just over the top)
          const c = Math.min(1, k), sm = c * c * (3 - 2 * c)
          w.lift = sm * Math.max(0, top + LIFT_CLEAR - fig.position.y - (HELD_AT[1] - LIFT_HANDS) * STAFF_SCALE)
        }
      }
      // what's on the tray goes where the tray goes (and, being set down, from the tray to the bar)
      const tray = trayAt()
      // (the bundle of skewers in their hands, from the used bucket to the clean one; scrubbed to and fro at the sink)
      const sb = serverSkewers.current
      if (sb && (SK_PHASES.has(w.phase) || sb.userData.by === wi)) {
        const has = w.phase === 'skSinkGo' || w.phase === 'skWash' || w.phase === 'skHolderGo' || w.phase === 'skPut' || (w.phase === 'skTake' && w.t > 0.3)
        sb.visible = has
        sb.userData.by = has ? wi : undefined
        const hr = has && w.phase === 'skWash' && frame.current ? waiterObjs.current[wi]?.getObjectByName('handR') : undefined
        if (hr && frame.current) {
          // (item 675: in the right hand as it scrubs in the basin (StaffFigure's scrub; the hand itself, up on the step stool with them), not
          // held at the tray's height before them, in the sink's cabinet with the hands)
          frame.current.worldToLocal(hr.getWorldPosition(SK_AT))
          sb.position.copy(SK_AT)
          sb.position.y -= SK_WASH_DOWN
          sb.rotation.set(0, w.look ?? w.yaw, 0)
        } else if (has) { sb.position.copy(tray); sb.position.y += 0.01; sb.rotation.set(0, w.look ?? w.yaw, 0) }
      }
      if (w.carry?.length) {
        let i = 0
        for (const key of w.carry) {
          const r = runs.current.find((x) => x.key === key)
          const o = runObjs.current.get(key)
          if (!r || !o || r.phase !== 'taken') continue
          const on = tray.clone().setY(tray.y + 0.006 + i * STACK_GAP)
          // (lifted off the bar onto the tray; and at the sink, down off it into the basin)
          if (w.phase === 'clearTake' && key === runs.current.find((x) => x.key === key && x.seat === w.seat)?.key) {
            // (lifted with the right hand once it's reached it, in a little arc onto the tray (item 231))
            const k = Math.min(1, Math.max(0, (w.t - CLEAR_REACH) / CLEAR_LIFT))
            const sm = k * k * (3 - 2 * k)
            o.position.lerpVectors(r.from, on, sm)
            o.position.y += Math.sin(Math.PI * sm) * 0.05
          } else if (w.phase === 'drop') {
            const k = Math.min(1, w.t / 0.45)
            o.position.lerpVectors(on, dirtyAt(dirty.current + i), k * k * (3 - 2 * k))
            o.scale.setScalar(1 - (1 - IN_SINK) * k)
          } else o.position.copy(on)
          i++
        }
      }
      const so = stackObjs.current[wi]
      if (so) {
        const n = w.stack ?? 0
        const carrying = n > 0 && (w.phase === 'unloadCarry' || w.phase === 'unloadPut')
        so.visible = carrying
        if (carrying) {
          const k = w.phase === 'unloadPut' ? 1 - Math.min(1, w.t / 0.45) : 1
          so.position.lerpVectors(rackTop(rackNow(PLATE_RACK.n + 1)), tray.clone().setY(tray.y + 0.006), k * k * (3 - 2 * k))
          so.children.forEach((c, i) => { c.visible = i < n })
        }
      }
      const k = w.phase === 'set' ? Math.min(1, w.t / 0.4) : 0
      const plateTo = w.seat >= 0 ? plateAt(w.seat) : tray
      const hold = tray.clone().lerp(plateTo, k * k * (3 - 2 * k))
      hold.y += Math.sin(Math.PI * k) * 0.04
      // (their bowls, brought with the food, set down as it is)
      if (w.phase === 'set') for (const b of passQ.current) if (b.server === wi && b.with) b.down = Math.min(1, w.t / 0.4)
      if (w.phase === 'go' || w.phase === 'set' || w.phase === 'toBowlWith' || w.phase === 'bowlWith') {
        const pr = runObjs.current.get(w.run ?? -1)
        // (the plate, carried on the tray as it lay at the plating place, and turned as it's set down to lie along its customer's counter
        // (item 228: seatTurn); what's on it with it, side by side across it as far apart as the plate's kind has them, turned with it)
        const turn = w.seat >= 0 ? seatTurn(w.seat) * k * k * (3 - 2 * k) : 0
        if (pr && run()?.phase === 'carry') { pr.position.copy(hold.clone().setY(hold.y + 0.006)); pr.rotation.y = PASS_YAW + turn }
        const spread = PLATE_SPREAD[run()?.kind ?? 'round'], across = plating.across.clone().applyAxisAngle(UP_Y, turn)
        w.keys.forEach((key, i) => {
          const sd = plateSide(i)
          SERVICE.carried.set(key, toShop(hold.clone().addScaledVector(across, sd.across * spread).add(new THREE.Vector3(0, 0.035 + sd.layer * 0.03, 0))))
          SERVICE.turn.set(key, turn)
        })
      }
      const o = waiterObjs.current[wi]
      // (out on the floor, or gone to wash up for the player while the shop's shut (item 166): out either way, not at his place)
      if (ownerServes) ownerAway('serve', w.phase !== 'idle')
      // (the plate up on the tray, the bar where it was wiped down with a cloth, twice along and back (the owner's))
      const wiping = w.phase === 'clearTake' && w.t > CLEAR_WIPE_AT && w.t < CLEAR_WIPE_AT + WIPE_S && w.seat >= 0
      if (o) o.userData.wipe = wiping ? (w.t - CLEAR_WIPE_AT) / WIPE_S : undefined
      // (sweeping up broken glass: how long into it; the broom in hand there and back (StaffFigure, the owner's SweepBroom))
      // (wiping the floor after: stooped as they sweep, the broom put by, the cloth in their hand on the floor (item 116))
      // (wiping the floor its own: stooped as for the sweep, but the broom and the dustpan put by and the cloth in hand (item 164: the three
      // were out together, the sweep's flag kept on for the stoop))
      if (o) { o.userData.sweep = w.phase === 'sweep' ? w.t : undefined; o.userData.floorWipe = w.phase === 'wipeFloor' ? w.t : undefined; o.userData.broom = !!w.broom }
      // (their tray down for an errand, and on the way back from one; up again for what's carried on it and at their place)
      if (TRAY_ERRANDS.has(w.phase)) w.trayDown = true
      else if (w.phase !== 'back') w.trayDown = false
      // (and put by from the first moment of tipping what's cleared into the sink (item 591): held before them as they came up, it was in the
      // sink's cabinet below its top, 13 cm, for the frames their hands took to reach in (StaffFigure puts it by once they're half way); stood
      // back no further, the step stool under them)
      if (o) o.userData.trayDown = !!w.trayDown || w.phase === 'drop'
      // (item 675: with it put by, what they've in their hands held before them as it would be: a takeaway's bag (drawn where a plate on the
      // tray rides), the skewers' bundle (on the tray's place but at the sink); else their hands at their sides)
      // (item 689: and as they tip what they've cleared into the sink, and up out of it after, their hands kept up over its top (let down to
      // their sides as the tray was put by, their hands went down through its top's front before they reached into it))
      // (and out for the takeaway's bag as they take it up (boxTake), so they're out for it as it's shown: let out as it showed, it hung a while
      // 18 cm off their hands, the Tester window's 688)
      if (o) o.userData.holding = w.phase === 'boxTake' || w.phase === 'toTill' || w.phase === 'hand' || w.phase === 'toStand' || w.phase === 'standPut'
        || w.phase === 'skSinkGo' || w.phase === 'skHolderGo' || w.phase === 'skPut' || (w.phase === 'skTake' && w.t > 0.3)
        || w.phase === 'drop' || (w.phase === 'back' && !!w.fromSink && (w.lift ?? 0) > 0.001)
      // (item 675: lifted over the sink's top, in their own frame (StaffFigure lifts the tray and the hands under it))
      if (o) o.userData.trayLift = (w.lift ?? 0) / STAFF_SCALE
      // (item 676: a hand up against something as they go by it drawn in to their side (StaffFigure))
      if (o) { const [tl, tr] = tuckOf(o); o.userData.tuckL = tl; o.userData.tuckR = tr }
      // (washing up at the sink, by hand or into the washer: the scrubbing motion (StaffFigure's scrub))
      // (and the skewers washed in the basin too (item 675: their hands were held before them at the tray's height, in the sink's cabinet))
      if (o) o.userData.scrub = w.phase === 'wash' || w.phase === 'handwash' || w.phase === 'skWash' ? w.t : undefined
      // (pouring a customer's sake themself (no plater): both hands where the pour has them (item 177)); and the tray it's carried out on
      // (clearing a place: the right hand on the plate's rim as it's taken up and set on the tray, the left on the tray (item 231))
      const clearHands = () => {
        const f = frame.current
        if (!f || wi >= CLEAR_HANDS.length) return false
        const r = runs.current.find((x) => (w.carry ?? []).includes(x.key) && x.seat === w.seat && x.phase === 'taken')
        const po = r ? runObjs.current.get(r.key) : undefined
        if (!po) return false
        const yaw = w.look ?? w.yaw
        CLEAR_SIDE.set(Math.cos(yaw), 0, -Math.sin(yaw))
        CLEAR_TOWARD.copy(w.pos).sub(po.position).setY(0)
        if (CLEAR_TOWARD.lengthSq() < 1e-8) CLEAR_TOWARD.set(-Math.sin(yaw), 0, -Math.cos(yaw)); else CLEAR_TOWARD.normalize()
        const H = CLEAR_HANDS[wi], tr = trayAt()
        f.localToWorld(H.right.copy(po.position).addScaledVector(CLEAR_TOWARD, PLATE_R * 0.8 * (po.scale.x || 1)).setY(po.position.y + 0.012))
        f.localToWorld(H.left.copy(tr).addScaledVector(CLEAR_SIDE, -0.11 * STAFF_SCALE).setY(tr.y + 0.01))
        return true
      }
      /** both hands down into the sink's basin as what's cleared goes in (item 590), a hand's breadth apart across them, a little over its floor */
      const sinkHands = () => {
        const f = frame.current
        if (!f || wi >= SINK_HANDS.length || !markOf('SinkBasinFloor')) return false
        const yaw = w.look ?? w.yaw
        CLEAR_SIDE.set(Math.cos(yaw), 0, -Math.sin(yaw))
        const fl = inBar('SinkBasinFloor', endOf(1)), H = SINK_HANDS[wi]
        f.localToWorld(H.right.copy(fl).addScaledVector(CLEAR_SIDE, 0.06 * STAFF_SCALE).setY(fl.y + 0.06))
        f.localToWorld(H.left.copy(fl).addScaledVector(CLEAR_SIDE, -0.06 * STAFF_SCALE).setY(fl.y + 0.06))
        return true
      }
      if (o) o.userData.handsAt = w.phase === 'sakePour' && SAKE_HANDS_ON.v ? SAKE_HANDS
        : (w.phase === 'bowlRice' || w.phase === 'bowlSoup') && BOWL_HANDS_ON.v ? BOWL_HANDS
        : w.phase === 'clearTake' && w.t < CLEAR_WIPE_AT && clearHands() ? CLEAR_HANDS[wi]
        : w.phase === 'drop' && sinkHands() ? SINK_HANDS[wi] : undefined
      if (sakeJob.current?.server === wi) { SAKE_TRAY.copy(trayAt()); SAKE_TRAY_YAW.v = w.look ?? w.yaw }
      {
        const tn = trayNow.current.get(wi) ?? { at: new THREE.Vector3(), yaw: 0 }
        tn.at.copy(trayAt())
        tn.yaw = w.look ?? w.yaw
        trayNow.current.set(wi, tn)
      }
      if (passQ.current.some((b) => b.server === wi)) bowlTrays.current.set(wi, { at: trayAt(), yaw: w.look ?? w.yaw })
      else bowlTrays.current.delete(wi)
      // (they step in to the bar's edge between the stools for it, facing it, and back out: the cloth's under their hand (StaffFigure's
      // wipe: the right hand out on the top, along and back), on the near edge of the top where the plate was)
      let wipeAt: { p: THREE.Vector3; yaw: number; k: number } | null = null
      const rag = ragObjs.current[wi]
      if (rag) rag.visible = wiping || w.phase === 'wipeFloor'
      // (the cloth on the floor over the drink, wiped round and round in front of them (item 116))
      if (rag && w.phase === 'wipeFloor' && frame.current) {
        const sp = SPILLS.list.find((x) => x.key === w.spill)
        if (sp) {
          const at = frame.current.worldToLocal(new THREE.Vector3(sp.at[0], sp.at[1], sp.at[2]))
          const a = w.t * 7
          rag.position.set(at.x + Math.cos(a) * 0.07, at.y + 0.004, at.z + Math.sin(a) * 0.07)
          rag.rotation.y = a
          // (and where it is from the one wiping, in their own upright frame, for their hand to be on it)
          if (o) {
            const d = rag.position.clone().sub(w.pos).applyAxisAngle(UP_Y, -w.yaw).divideScalar(STAFF_SCALE)
            o.userData.wipeAt = [d.x, rag.position.y / STAFF_SCALE, d.z]
          }
        }
      }
      if (wiping) {
        const st = seats[w.seat], c = counters[st.counter], p = (w.t - CLEAR_WIPE_AT) / WIPE_S
        // (along the bar where they stand beside it (besideAlong, item 591), in toward it only: wiped from WIPE_STAND's 0.34 along when they
        // stood at 0.45 or the end seat's other side, a step in that's a fifth of a second covered as much as 0.79 of the bar along it, a
        // jump of 0.67 to 0.89 m a frame (the Tester's dayaudit, clearTake))
        const stand = st.mid.clone().addScaledVector(c.lay, -WIPE_STAND[1]).addScaledVector(c.along, besideAlong[w.seat] ?? WIPE_STAND[0]).setY(w.pos.y)
        const yaw = Math.atan2(c.lay.x, c.lay.z)
        const k = Math.min(1, p / 0.15, (1 - p) / 0.15)
        wipeAt = { p: stand, yaw, k: k * k * (3 - 2 * k) }
        if (rag) {
          // (the cloth over where the plate stood (item 231: it wiped the bar in front of where they stood, beside the place), worked along it
          // and in toward them (StaffFigure's wipeStroke), the right hand on it, the left on the tray)
          const [wx, wz] = wipeStroke(p)
          const place = plateAt(w.seat)
          rag.position.copy(place).addScaledVector(c.along, (wx - 0.06) * STAFF_SCALE * 1.15).addScaledVector(c.lay, (wz - WIPE_HAND_Z) * STAFF_SCALE * 1.15).setY(top + 0.006)
          rag.rotation.y = yaw + Math.PI / 2 + Math.cos(p * Math.PI * 3 - Math.PI / 2) * 0.3
          const f = frame.current
          if (f && wi < CLEAR_HANDS.length) {
            const H = CLEAR_HANDS[wi], tr = trayAt()
            f.localToWorld(H.right.copy(rag.position).setY(top + 0.03))
            CLEAR_SIDE.set(Math.cos(yaw), 0, -Math.sin(yaw))
            f.localToWorld(H.left.copy(tr).addScaledVector(CLEAR_SIDE, -0.11 * STAFF_SCALE).setY(tr.y + 0.01))
            if (o) o.userData.handsAt = H
          }
        }
      }
      // (going home only once what's in hand is put down: a plate carried to the sink, a stack to the racks; the owner saw the plates of a
      // server who'd set off for the door float on without them along the way they'd have walked, in mid-air)
      if (o && SHOP.leaving && !ownerServes && (w.out || w.phase === 'idle')) {
        // (the shop's shut and empty: finishing up a moment where they are, then out through their gate, along the aisle (round the corner
        // from the side counter's) to the front door, a nod back in, and through it fading, as the customers go (commuteWalk))
        const id = servers[wi]?.id ?? `server${wi}`
        if (!w.out) {
          const h = homeOf(wi)
          // (from waiting by the takeaway stand (item 722): back in to their place round what's in the kitchen first)
          const from = w.waitAt && h.way.length > 1 ? kitchenRoute(w.pos, h.way[1]).slice(0, -1) : [w.pos.clone()]
          w.waitAt = undefined
          const way = [...from, ...h.way.slice(1).map((v) => v.clone()), ...(h.counter ? [aisleCorner(counters[h.counter])] : []), doorOf(counters)]
          way.push(...doorOutOf(counters))
          w.out = makeTrip(id, 'out', way, delayOf(id, SHOP.day), paceOf(id))
          SHOP.walking.add(id)
        }
        walkCommute(o, w.out, w)
        if (w.out.done) SHOP.walking.delete(id)
      } else if (o) {
        w.out = undefined
        // (still finishing as the others go: the shop waits for them too)
        if (SHOP.leaving && !ownerServes) SHOP.walking.add(servers[wi]?.id ?? `server${wi}`)
        // (the owner's figure here only while he's out serving: at his place, Roasting draws him; out washing up, his washing figure (item 216:
        // this one was shown whenever he was out for anything, a second owner standing by the pass while he washed at the sink))
        o.visible = !ownerServes || OWNER_OUT.by === 'serve'
        o.position.copy(w.pos)
        o.position.y += genkanY(counters, w.pos) + (stoolLifts.current.get(o) ?? stoolLift(o, w.pos, tick(dt)))
        // (the facing shown eased to the way they're going, never more than a little a frame (turnSmooth, item 183))
        w.look = turnSmooth(w.look ?? w.yaw, w.yaw, step)
        o.rotation.y = w.look
        if (wipeAt) {
          o.position.lerp(wipeAt.p, wipeAt.k)
          o.rotation.y = w.look + Math.atan2(Math.sin(wipeAt.yaw - w.look), Math.cos(wipeAt.yaw - w.look)) * wipeAt.k
        }
      }
      // (up on the kitchen's dais while they're over it; not again for one on their way home: walkCommute has put them up on it (twice up, they
      // stood a step's height over the dais as they finished up to go, and dropped to the floor as they set off: the owner's item 42))
      if (o && KITCHEN_DROP < 0 && !w.out) {
        const d = w.pos.clone().sub(counters[0].at), a = d.dot(counters[0].along), l = d.dot(counters[0].lay)
        if (a > kitchen.along[0] && a < kitchen.along[1] && l > kitchen.lay[0] && l < kitchen.lay[1]) o.position.y += -KITCHEN_DROP / scale
      }
    })
    SERVICE.walkers = waiters.current.map((w) => w.pos)
    // (which seats have their plate down, for what's being served to them; and which have it out, down or on its way)
    PLATES_SET.clear()
    PLATES_OUT.clear()
    for (const r of runs.current) {
      if (r.phase === 'set' || r.phase === 'clear' && r.t < 0) PLATES_SET.add(r.seat)
      if (r.phase === 'set' || r.phase === 'carry') PLATES_OUT.add(r.seat)
    }
    // (the places with soy in their dish: one sat at it, or their plate still down after they've gone, till it's cleared (item 203: it came
    // as they sat and went as they stood, the plate still there)); drawn again only as that changes
    {
      let mask = 0
      for (const x of shown) if (x.seat >= 0 && x.phase !== 'enter' && x.phase !== 'leave') mask |= 1 << x.seat
      for (const n of PLATES_SET) if (n >= 0) mask |= 1 << n
      if (mask !== soyMask.current) { soyMask.current = mask; redraw() }
    }
    if (finished || homed) {
      // (those come to the sink by themselves (no one on the floor), each as dirty as it was left)
      let platesIn = 0
      for (const r of runs.current) if (r.t === Infinity && r.phase !== 'home') {
        if (!r.bare) { SINK.dirt.push(r.dirt ?? DIRT_BASE); SINK.kinds.push(r.kind ?? 'round'); platesIn++ }
        // (and what was left with it (item 600): into the sink with it, its place laid again from the cabinets, there being nobody to clear it)
        if (r.ware) {
          WARE.sink = addWares(WARE.sink, r.ware)
          if (r.ware.chops && r.seat >= 0) relay(r.seat)
          WARE.ver++
        }
      }
      runs.current = runs.current.filter((r) => r.t !== Infinity)
      dirty.current += platesIn
      redraw()
    }
    // (with nobody on the floor to wash them, the sink's plates wash themselves back onto the racks, a batch at a time)
    if (!nServers) {
      // (the bowls, the renge and the chopsticks likewise straight back into the cabinets, washed (item 600))
      if (wareCount(WARE.sink) + wareCount(WARE.washer) > 0) {
        WARE.cab = addWares(addWares(WARE.cab, WARE.sink), WARE.washer)
        WARE.sink = noWares()
        WARE.washer = noWares()
        WARE.ver++
      }
      if (wash.current === null && staffSink(dirty.current, PILE.n) > 0 && !runs.current.some((r) => r.phase === 'clear' && r.t >= 0)) wash.current = 0
      if (wash.current !== null) {
        wash.current += step
        if (wash.current >= WASH_EACH && staffSink(dirty.current, PILE.n) > 0) {
          wash.current = 0
          dirty.current -= 1
          soapPlate(); meterWater('dish')
          const going = runs.current.filter((r) => r.phase === 'home').length
          runs.current.push({ key: ++runSeq.current, seat: -1, guest: -1, phase: 'home', t: 0, from: dirtyAt(dirty.current), to: rackTop(rackNow(PLATE_RACK.n + going + 1)) })
          redraw()
        }
        if (staffSink(dirty.current, PILE.n) === 0) wash.current = null
      }
    }
    // the dryer drying (game/plates), its door down while someone's at it
    if (DRYER.left !== null && DRYER.left > 0) DRYER.left = dryerTick(DRYER, step).left
    // (the basket's plates draining dry)
    if (DRAIN.left !== null && DRAIN.left > 0) DRAIN.left = drainTick(DRAIN, step).left
    // (the player's put the sink's dirty plates in it, its door down (Sink): as many as there's room for, with a clink or two; the sink's count
    // told for its label)
    if (DRYER.ask) {
      DRYER.ask = 0
      const k = playerLoad(dirty.current, DRYER)
      if (k > 0) {
        dirty.current -= k
        DRYER.n += k
        const at = inBar('SinkDryerRack0', endOf(1))
        const f = frame.current
        if (f) { plateClink(f.localToWorld(SOUND_AT.copy(at))); window.setTimeout(() => plateClink(SOUND_AT), 140) }
        redraw()
      }
    }
    // (the player's washing up by hand is the owner's to do (item 166: a plate went clean at a click, nothing seen done): bossWashTick sends
    // him, or out serving himself he takes it as his next chore; the shop shutting meanwhile, asked no more. The basket's dry plates back to
    // the racks at a click, as before)
    if (HAND_WASH.ask === 'wash' && SHOP.leaving) HAND_WASH.ask = null
    if (HAND_WASH.ask === 'take') {
      HAND_WASH.ask = null
      const u = unbasket(DRAIN)
      if (u.take > 0) {
        DRAIN.n = u.drain.n
        DRAIN.left = u.drain.left
        PLATE_RACK.n = putBack(PLATE_RACK.n, u.take)
        const f = frame.current
        if (f) { plateClink(f.localToWorld(SOUND_AT.copy(inBar('SinkBasinFloor', endOf(1))))); window.setTimeout(() => plateClink(SOUND_AT), 140) }
        redraw()
      }
    }
    // (the owner gone to wash the stack the player left on the counter (item 103): from the third day; washed into the draining basket)
    bossWashTick(step)
    // (the sake station (item 177): the open bottle posed by the pour, in the pourer's hands; its stream and its level; the tokkuri and the cup
    // where they are: set out and poured into, waiting at the pass, lifted onto the server's tray, carried, set down at the customer's place)
    {
      SAKE.station = !!STATION_OBJ.group && !!given && waiters.current.length > 0
      const j0 = sakeJob.current
      // (poured and not yet taken, the customer gone meanwhile: not wanted)
      if (j0 && j0.server === undefined && j0.t >= POUR_TOTAL && !guestSits(j0.guest, j0.seat)) sakeJob.current = null
      const j = sakeJob.current
      if (j && j.t >= 0 && j.was === undefined) j.was = SAKE.open
      // (poured: a tokkuri's worth out of the open bottle; finished, a new one opened only with sake left (item 199: it stood full again
      // whether there was sake in stock or none))
      if (j && j.t >= POUR_TOTAL && !j.poured) {
        j.poured = true
        SAKE.unpoured.delete(j.guest)
        SAKE.open = stationGo(Math.round((j.was ?? SAKE.open) * STATION_GO) - 1, sakeLeft()) / STATION_GO
      }
      const pouring = !!j && j.t >= 0 && j.t < POUR_TOTAL
      // (and between pours, the open bottle as there's sake for: sold out, the bottle poured empty stands empty; sake bought, a new one's
      // opened; stock thrown out, never more in it than there is)
      if (!pouring) SAKE.open = stationGo(Math.round(SAKE.open * STATION_GO), sakeLeft()) / STATION_GO
      const beat = pouring ? pourBeat(j!.t) : null
      const P = STATION_POSE
      if (beat) stationPose(beat.beat, beat.k, P)
      else { P.foot.copy(STATION.bottle); P.q.copy(STATION_OBJ.q0) }
      if (STATION_OBJ.bottle) { STATION_OBJ.bottle.position.copy(P.foot); STATION_OBJ.bottle.quaternion.copy(P.q) }
      if (STATION_OBJ.liquid) STATION_OBJ.liquid.scale.y = Math.max(0.02, pouring ? (j!.was ?? SAKE.open) - pouredBy(j!.t) * (TOKKURI_ML / SAKE_BOTTLE_ML[0]) : SAKE.open)
      const sm = STATION_OBJ.stream
      if (sm) {
        // (not drawn at all between pours (item 533: drawn a hair long, a draw every frame of the evening); in the scene from the start, its
        // program's made at load all the same: scene/Prewarm compiles the hidden ones too)
        const on = pouring && streaming(j!.t)
        // (heard as the sake starts to run (item 633, the owner's 「倒酒的音效應統一，供酒的也是」): the one pour's sound, the shrine's, as
        // long as the stream runs in the world's time)
        if (on && !stationRan.current && STATION_OBJ.group) pourSakeAt((STREAM_TO - STREAM_FROM) / Math.max(0.25, GAME_SPEED.value), STATION_OBJ.group.localToWorld(STATION_POUR_AT.copy(P.mouth)), camera)
        stationRan.current = on
        sm.visible = on
        if (on) { const to = STATION_STREAM_TO(); sm.position.copy(P.mouth); sm.scale.set(1, Math.max(1e-4, P.mouth.y - to.y), 1) }
        else sm.scale.set(1, 1e-4, 1)
      }
      SAKE_HANDS_ON.v = !!beat && !!STATION_OBJ.group
      if (SAKE_HANDS_ON.v) { STATION_OBJ.group!.localToWorld(SAKE_HANDS.left.copy(P.left!)); STATION_OBJ.group!.localToWorld(SAKE_HANDS.right.copy(P.right!)) }
      const jo = sakeJugObj.current, co = sakeCupObj.current
      if (jo && co) {
        let jug: THREE.Vector3 | null = null, cup: THREE.Vector3 | null = null
        if (j && pouring) { jug = P.jug ? stationIn(P.jug) : null; cup = P.cup ? stationIn(P.cup) : null }
        else if (j && j.t >= POUR_TOTAL) {
          const e = (x: number) => x * x * (3 - 2 * x)
          // (on the tray side by side, the tokkuri toward their left hand)
          const side = new THREE.Vector3(Math.cos(SAKE_TRAY_YAW.v), 0, -Math.sin(SAKE_TRAY_YAW.v))
          const trayJug = SAKE_TRAY.clone().addScaledVector(side, -0.035).setY(SAKE_TRAY.y + 0.006)
          const trayCup = SAKE_TRAY.clone().addScaledVector(side, 0.045).setY(SAKE_TRAY.y + 0.006)
          if ((j.down ?? 0) > 0) {
            const k = e(j.down!), spot = sakeSpotOf(j.seat)
            jug = trayJug.lerp(spot.at, k)
            cup = trayCup.lerp(spot.at.clone().add(spot.cup), k)
            jug.y += Math.sin(Math.PI * k) * 0.03; cup.y += Math.sin(Math.PI * k) * 0.03
          } else {
            const k = e(j.up ?? 0)
            jug = stationIn(STATION.jug).lerp(trayJug, k)
            cup = stationIn(STATION.cup).lerp(trayCup, k)
            jug.y += Math.sin(Math.PI * k) * 0.04; cup.y += Math.sin(Math.PI * k) * 0.04
          }
        }
        jo.visible = !!jug
        if (jug) jo.position.copy(jug)
        co.visible = !!cup
        if (cup) co.position.copy(cup)
      }
    }
    // (a customer's rice and soup (items 205, 206): in the hands of the one filling them, beat by beat (SideBowls' poses: the paddle and the
    // ladle with them, the cooker's lid lifted); carried to the counter in front of them; waiting there; lifted onto a server's tray, out on it
    // and set down at the place; the paddle hung on the cooker and the ladle in the pot meanwhile)
    {
      // (a customer's bowls left at the counter, or not yet carried out, they gone meanwhile: not to be taken out (it stayed there for them,
      // and every customer's after it waited behind it))
      dropBowls((b) => b.server !== undefined || guestSits(b.guest, b.seat))
      // (item 600: what's off the places laid out below, after the customers' bowls)
      const j = bowlJob.current, f = frame.current
      const now = performance.now()
      if (now - restsAt.current.at > 1000 && STATION_OBJ.group) {
        restsAt.current.at = now
        restsAt.current.ladle = ladleRest(soupFillAt())
      }
      let pose: FillPose | null = null
      if (j && j.W && (j.stage === 'rice' || j.stage === 'soup')) {
        const filling = j.by === 'plater' ? (platerRun.current.phase === 'riceBowl' || platerRun.current.phase === 'soupBowl')
          : (waiters.current[j.by]?.phase === 'bowlRice' || waiters.current[j.by]?.phase === 'bowlSoup')
        if (filling) pose = j.stage === 'rice' ? riceFillPose(j.W, j.t) : soupFillPose(j.W, j.t)
      }
      BOWL_HANDS_ON.v = !!pose && !!f
      if (pose && f) { f.localToWorld(BOWL_HANDS.left.copy(pose.left)); f.localToWorld(BOWL_HANDS.right.copy(pose.right)) }
      // (lifting the cooker's lid off and putting it back on: the right hand on its knob where it really is, as it lifts and tips back; on
      // its way there, where the pose has it (item 387: up and over the cooker's front, not through it))
      if (pose && f && j?.stage === 'rice' && pose.onKnob) {
        const lid = markOf('DenkiLid')
        if (lid) { const b = new THREE.Box3().setFromObject(lid); BOWL_HANDS.right.set((b.min.x + b.max.x) / 2, b.max.y + 0.01, (b.min.z + b.max.z) / 2) }
      }
      RICE.lid = pose && j?.stage === 'rice' ? pose.lid : 0
      // (where each bowl is, and how full)
      let riceAt: THREE.Vector3 | null = null, soupAt: THREE.Vector3 | null = null
      if (j) {
        if (pose && j.stage === 'rice') { j.riceFill = pose.fill; riceAt = pose.bowl }
        if (pose && j.stage === 'soup') { j.soupFill = pose.fill; soupAt = pose.bowl; if (j.rice) riceAt = null }
        // (in front of them, in their hands, as they go to the counter, or to the pot with the rice)
        const holder = j.by === 'plater' ? platerRun.current : waiters.current[j.by]
        const carrying = j.stage === 'toPass' || (j.stage === 'soup' && !pose)
        if (holder && carrying) {
          const fwd = new THREE.Vector3(Math.sin(holder.yaw), 0, Math.cos(holder.yaw)), rt = new THREE.Vector3(-fwd.z, 0, fwd.x)
          const hands = holder.pos.clone().addScaledVector(fwd, HELD_AT[2] * STAFF_SCALE + 0.02).setY(holder.pos.y + HELD_AT[1] * STAFF_SCALE - 0.03)
          if (j.rice) riceAt = hands.clone().addScaledVector(rt, j.soup && j.stage === 'toPass' ? -0.065 : 0)
          if (j.soup && j.stage === 'toPass') soupAt = hands.clone().addScaledVector(rt, 0.065)
        }
        // (set down at the counter in their row, from their hands)
        if (j.by === 'plater' && platerRun.current.phase === 'bowlPut') {
          const k = Math.min(1, platerRun.current.t / BOWL_PUT_S), row = j.row ?? 0
          if (j.rice) riceAt = (riceAt ?? passAt(row, 'rice')).clone().lerp(passAt(row, 'rice'), k * k * (3 - 2 * k))
          if (j.soup) soupAt = (soupAt ?? passAt(row, 'soup')).clone().lerp(passAt(row, 'soup'), k * k * (3 - 2 * k))
        }
      }
      // (customers' bowls at the counter, lifted onto a tray, out on it two sets side by side, and down at the place: rice on the customer's
      // left, soup on their right (item 207: drawn as the seats' are, instanced, as many as there are))
      const mv = movingBowls.current
      mv.rice.length = 0
      mv.soup.length = 0
      mv.renge.length = 0
      movingDishes.current.length = 0
      const ez = (x: number) => x * x * (3 - 2 * x)
      for (const b of passQ.current) {
        const tray = b.server !== undefined ? bowlTrays.current.get(b.server) : undefined
        const nth = b.server === undefined ? 0 : passQ.current.filter((x) => x.server === b.server).indexOf(b)
        const place = (kind: 'rice' | 'soup' | 'dish') => {
          const pass = b.row >= 0 ? passAt(b.row, kind === 'dish' ? 'rice' : kind) : null
          if (!tray) return pass
          const sideV = new THREE.Vector3(Math.cos(tray.yaw), 0, -Math.sin(tray.yaw)), fwdV = new THREE.Vector3(Math.sin(tray.yaw), 0, Math.cos(tray.yaw))
          // (two sets side by side, or with the food's plate the bowls either side of it, a little behind (item 207))
          const side = kind === 'dish' ? 0 : kind === 'rice' ? -1 : 1
          const onTray = b.with ? tray.at.clone().addScaledVector(sideV, side * 0.11).addScaledVector(fwdV, -0.04).setY(tray.at.y + 0.006)
            : tray.at.clone().addScaledVector(sideV, side * 0.06).addScaledVector(fwdV, nth === 0 ? 0.045 : -0.045).setY(tray.at.y + 0.006)
          if (b.down > 0) {
            const k = ez(b.down), at = onTray.lerp(kind === 'rice' ? riceSpotOf(b.seat) : kind === 'soup' ? soupSpotOf(b.seat) : dishSpotOf(b.seat, (KITCHEN.seats.get(b.seat) ?? []).length), k)
            at.y += Math.sin(Math.PI * k) * 0.03
            return at
          }
          if (pass && b.up < 1) {
            const k = ez(b.up), at = pass.clone().lerp(onTray, k)
            at.y += Math.sin(Math.PI * k) * 0.04
            return at
          }
          return onTray
        }
        if (b.rice) { const at = place('rice'); if (at) mv.rice.push({ key: `pass:rice:${b.guest}`, at, yaw: 0 }) }
        if (b.soup) { const at = place('soup'); if (at) mv.soup.push({ key: `pass:soup:${b.guest}`, at, yaw: 0 }) }
        if (b.dish) {
          const at = place('dish')
          if (at) {
            // (lying along the counter at the pass and at the place, along the tray on it; turned round between as it's lifted and set down)
            const seatYaw = dishYawOf(b.seat)
            const yaw = !tray ? seatYaw : b.down > 0 ? turnBy(tray.yaw, seatYaw, ez(b.down)) : b.row >= 0 && b.up < 1 ? turnBy(seatYaw, tray.yaw, ez(b.up)) : tray.yaw
            movingDishes.current.push({ key: `pass:dish:${b.guest}:${b.dish}`, id: b.dish, at, yaw })
          }
        }
      }
      layWare(mv)
      side.chawan.visible = !!riceAt
      if (riceAt) { side.chawan.position.copy(riceAt); fillRice(side.rice, j!.riceFill) }
      side.wan.visible = !!soupAt
      if (soupAt) { side.wan.position.copy(soupAt); fillSoup(side.soup, j!.soupFill) }
      // (the paddle in the hand scooping; else it's the cooker's own, standing in the holder on its side (item 618: Decor's DenkiNabe draws it
      // there): taken from it and put back in it at the very place and turn it stands, the cooker's hidden the very frame this one's shown
      // and shown again the very frame it's put back, here, not each in its own frame's turn (never both of them, never neither); the ladle
      // in the hand, else in the pot)
      const paddle = pose && j?.stage === 'rice' && pose.tool.held ? pose.tool : null
      side.shamoji.visible = !!paddle
      const restPaddle = markOf('cooker-paddle')
      if (restPaddle && restPaddle.visible === !!paddle) restPaddle.visible = !paddle
      if (paddle) { side.shamoji.position.copy(paddle.grip); side.shamoji.quaternion.copy(paddle.q) }
      side.lump.visible = !!pose && j?.stage === 'rice' && pose.load > 0.02
      if (side.lump.visible) side.lump.scale.setScalar(Math.max(0.05, pose!.load))
      const ladle = pose && j?.stage === 'soup' ? pose.tool : restsAt.current.ladle
      side.otama.visible = !!ladle
      if (ladle) { side.otama.position.copy(ladle.grip); side.otama.quaternion.copy(ladle.q) }
      side.ladleSoup.visible = !!pose && j?.stage === 'soup' && pose.load > 0.02
      if (side.ladleSoup.visible) side.ladleSoup.scale.set(Math.max(0.1, pose!.load), 1, Math.max(0.1, pose!.load))
      const st = pose?.stream ?? null
      side.stream.visible = !!st
      if (st) { side.stream.position.copy(st[0]); side.stream.scale.set(1, Math.max(1e-3, st[0].y - st[1].y), 1) }
    }
    // (the serving counter (item 167): placed once the floor's measured; where its top and its front are, read again every second)
    if (given) placeServe()
    if (servePlace && performance.now() - serveRead.current > 1000) {
      serveRead.current = performance.now()
      const top = markOf('ServeCounterTop'), front = markOf('ServeCounterFront'), f = frame.current
      if (top && front && f) {
        SERVE_COUNTER.at = f.worldToLocal(top.getWorldPosition(SERVE_COUNTER.at ?? new THREE.Vector3()))
        SERVE_COUNTER.out = f.worldToLocal(front.getWorldPosition(SERVE_COUNTER.out ?? new THREE.Vector3())).setY(0)
      }
    }
    // (the paths' map, while it's shown in edit mode (item 168))
    // (the ways' crossings let go of with the paths' map put away (the Tester window's: 8 kept, not drawn))
    { const e = getEdit(); if (e.on && e.paths) mapPaths(performance.now()); else if (PATH_MAP.cross.length) PATH_MAP.cross = [] }
    SINK.dirty = dirty.current
    PILE.n = pileLeft(PILE.n, dirty.current)
    // (the counter's stack only ever the bottom of the dirty plates: those washed off the top come from the basin first, then from it)
    if (onCounter.current > dirty.current) onCounter.current = dirty.current
    // (the sink's plates put where the sink is now, once a second (item 113, the owner's, 2026-11-14: six dirty plates stood by the lantern on
    // the cook table before the shop had opened: drawn before the sink's model was in, its marks not found, they took the bar's end, and
    // nothing redrew them till the shop opened); moved in edit mode, they follow it too)
    {
      const now = performance.now()
      if (now - sinkPlaced.current > 1000) {
        sinkPlaced.current = now
        const n = Math.min(dirty.current, SINK_SHOWN)
        // (not drawn till the sink's in: put at the fallback meanwhile, the bar's end, they hung in the air over the cook table)
        const there = !!markOf('SinkTop') && !!markOf('SinkBasinFloor') && !!markOf('SinkBasket') && !!markOf('SinkFront')
        for (let i = 0; i < n; i++) { const q = sinkPlates.current[i]; if (q) { q.position.copy(dirtyAt(i)); q.visible = there } }
      }
    }
    // (the sink's plates, each as dirty as it came: as many as there are (any come by another way counted dirty as the first dish leaves one;
    // those washed off the top gone); under water each comes clean a little at a time, the top one under the running tap the faster, and
    // rinsed by it with no water standing (game/plates' soakStep); their smears faded with it)
    {
      const D = SINK.dirt, K = SINK.kinds
      while (D.length < dirty.current) D.push(DIRT_BASE)
      if (D.length > dirty.current) D.length = dirty.current
      while (K.length < dirty.current) K.push('round')
      if (K.length > dirty.current) K.length = dirty.current
      const standing = SINK.water > 0.12, running = SINK.tap || SINK.washing
      for (let i = 0; i < D.length; i++) {
        const top = i === D.length - 1
        // (those waiting on the counter (item 82) out of the water: they don't soak)
        if (i >= onCounter.current) D[i] = soakStep(D[i], step, standing || (top && running), top && running)
        for (const smear of smearsOf(sinkPlates.current[i])) { (smear.material as THREE.MeshBasicMaterial).opacity = smearOpacity(D[i]); smear.visible = D[i] > CLEAN_AT }
        showKind(sinkPlates.current[i], K[i])
      }
    }
    // (item 681: the sponge rubs the plate it's over, whichever)
    if (SINK.sponge && !bossWash.current && frame.current) pickRubbed()
    // (the plate the player's washing by hand (items 224, 234, 458): carried after the pointer a little over the counter; let go in the water,
    // under the running tap tipped to the stream or in the water at its top, it comes clean slowly by itself and quickly as it's rubbed (the
    // sponge in hand, else the bare hand; the liquid on the sponge or in the water a bonus on that); its smear fading, its suds as it's rubbed
    // soapy; heard and said of; clean, into the draining basket by itself)
    {
      const h = hand.current, o = handObj.current, f = frame.current
      const now = performance.now()
      if (h && o && f && h.phase === 'toBasket') {
        // (a little arc from where it was washed into the basket's next slot, stood up on its edge as it goes)
        h.t += step
        const k = Math.min(1, h.t / HAND_TO_BASKET_S), sm = k * k * (3 - 2 * k)
        o.position.lerpVectors(h.from, basketAt(DRAIN.n), sm)
        o.position.y += Math.sin(Math.PI * sm) * 0.06
        o.rotation.set(0.5 + sm * 1.0, 0, 0)
        if (k >= 1) {
          const r = handOne(1, DRAIN)
          DRAIN.n = r.drain.n
          DRAIN.left = r.drain.left
          setPattern(drainPlates.current?.children[DRAIN.n - 1], h.design)
          DRAIN_KINDS[DRAIN.n - 1] = h.kind
          plateClink(o.getWorldPosition(SOUND_AT))
          o.visible = false
          hand.current = null
          HAND_WASH.soaking = false
          // (the basin's pile's top up next (item 638))
          promote()
          if (!bossWash.current) HAND_WASH.stream = null
          // (one come up from under it (item 638): that one's to be rubbed next, not another dragged in (item 681))
          sayTip({ title: '盤子', hint: DRAIN.n >= DRAIN_CAP ? '洗好了｜瀝水籃滿了，先把乾的收回碗盤架' : hand.current ? '洗好了｜下一個在水裡，拿菜瓜布接著刷' : dirty.current > 0 ? `洗好了｜還有 ${dirty.current} 個髒盤，拖下一個到水裡` : '洗好了，都洗完了' })
          redraw()
        }
      } else if (h && o && f && h.phase === 'drag') {
        // (carried after the pointer, tipped a little, swaying: over the draining basket a little over its rim; over the counter a little over
        // its top, found by a ray down onto it where it'd be; over the basin's opening (the top's cut away there: the ray finds none), a little
        // over the water's level (item 642: at the water's height all the way, it went 8 cm into the counter's top beside the basin; the
        // basin's pointer group takes in the counter's top, so what it's over by that is no guide)
        const water = f.localToWorld(HAND_TOP.copy(inBar('SinkWaterTop', endOf(1)))).y + CARRY_UP
        let top = water
        if (plateOver.current === 'basket' && WASH_GUIDE.basket) top = Math.max(water, HAND_BOX.setFromObject(WASH_GUIDE.basket).max.y + CARRY_CLEAR)
        else {
          const counter = markOf('SinkTop'), at0 = counter && pointerAtY(h.px, h.py, water)
          if (counter && at0) {
            CARRY_RAY.set(CARRY_FROM.set(at0.x, at0.y + 1, at0.z), CARRY_DOWN)
            const hit = CARRY_RAY.intersectObject(counter, true)[0]
            if (hit) top = Math.max(water, hit.point.y + CARRY_CLEAR)
          }
        }
        const at = pointerAtY(h.px, h.py, top)
        if (at) HAND_TO.copy(f.worldToLocal(HAND_W.copy(at)))
        else HAND_TO.copy(o.position)
        o.position.lerp(HAND_TO, Math.min(1, step * 18))
        o.rotation.set(0.15, 0, 0.06 * Math.sin(now / 260))
        o.visible = true
        if (!bossWash.current) HAND_WASH.stream = null
        if (now - h.said > 200) {
          h.said = now
          setTip({ title: '盤子', hint: handSays(null, h.dirt, { sponge: SINK.sponge, soap: false, basketFull: DRAIN.n >= DRAIN_CAP, held: true }) })
        }
      } else if (h && o && f) {
        const floor = inBar('SinkBasinFloor', endOf(1)), wtop = inBar('SinkWaterTop', endOf(1)), spout = inBar('SinkSpoutTip', endOf(1))
        const running = SINK.tap || SINK.washing
        const water = SINK.water > 0.12
        // (where it lies (item 680: let go anywhere in the basin it went over to the one place, on the last one); under the running tap only if
        // the stream comes down on it)
        const lx = h.lay ? h.lay.x : floor.x, lz = h.lay ? h.lay.z : floor.z
        h.at = running && Math.hypot(lx - spout.x, lz - spout.z) < SINK_PLATE_R.v ? 'tap' : water ? 'water' : null
        // (rubbed as the sponge in the player's hand is moved over it (item 606): held over the plate itself, within its rim; dry or wet
        // (item 638: in a dry basin it did nothing))
        // (item 681: the sponge on it anywhere over its face, the sponge's own half reaching past the rim (at the rim's edge, a hair off, it
        // wasn't rubbing: rubbed to and fro over it, a third of the moves went by it))
        h.rub = SINK.sponge && h.dirt > CLEAN_AT && spongeOnPlate(o, 1.5)
        // (where it lies: under the tap halfway down to the basin's floor, tipped to the stream; in the water over the drain at its top; with
        // no water, just over the basin's floor)
        if (h.at === 'tap') HAND_TO.set(spout.x, floor.y + (spout.y - floor.y) * 0.45, spout.z)
        else if (h.at === 'water') HAND_TO.set(lx, floor.y + (wtop.y - floor.y) * Math.min(1, Math.max(0, SINK.water)) - 0.004, lz)
        else HAND_TO.set(lx, floor.y + 0.05, lz)
        // (on those under it where it lies, if any (item 638); on the servers' stack, if it's over it (item 685), the tap's stream or not)
        let below = 0
        for (const u of under.current) if (Math.hypot((u.lay ? u.lay.x : floor.x) - lx, (u.lay ? u.lay.z : floor.z) - lz) < SINK_PLATE_R.v) below++
        const ax = h.at === 'tap' ? spout.x : lx, az = h.at === 'tap' ? spout.z : lz
        const base = basinBase(floor, ax, az, h.kind), onStack = base > floor.y + 0.012
        if ((h.at !== 'tap' && below) || onStack) HAND_TO.y = Math.max(HAND_TO.y, base + below * PILE_STEP + 0.006)
        // (clean: lifted a little in the water, bobbing, to be taken out (item 606))
        if (h.dirt <= CLEAN_AT) HAND_TO.y += 0.02 + 0.004 * Math.sin(now / 320)
        o.position.lerp(HAND_TO, Math.min(1, step * 12))
        o.rotation.set(h.at === 'tap' ? 0.5 : 0, 0, h.rub ? 0.1 * Math.sin(now / 110) * h.scrub : 0)
        o.visible = true
        // (coming clean: the water's own, and the rubbing while the press is held on it; the washing-up liquid on the sponge, or in the water it's
        // in, used once as a plate comes clean with it)
        const soap = SINK.soap > 0 && (SINK.sponge || h.at === 'water')
        const was = h.dirt
        h.dirt = handClean(h.dirt, step, h.at, { sponge: SINK.sponge, soap, scrub: h.rub ? h.scrub : 0 })
        if (soap && h.rub) h.soaped = true
        if (was > CLEAN_AT && h.dirt <= CLEAN_AT && h.soaped) SINK.soap = scrubbed(SINK.soap)
        h.scrub *= Math.max(0, 1 - step * 2.5)
        for (const sm of smearsOf(handIn.current)) { (sm.material as THREE.MeshBasicMaterial).opacity = smearOpacity(h.dirt); sm.visible = h.dirt > CLEAN_AT }
        // (item 681, the owner's 「如用洗碗精要冒泡」: the liquid on the sponge froths as it's rubbed, wet or dry (less with no water: it was none))
        const suds = h.rub && soap && h.dirt > CLEAN_AT
        const foamK = h.at ? 1 : 0.6
        handFoam.current?.children.forEach((c, i) => { const k = suds ? FOAM_AT[i][2] * (0.65 + 0.35 * h.scrub) * foamK : 0; c.scale.set(k, k * 0.6, k); c.visible = k > 0.03 })
        // (the tap's stream stopped on it, unless the owner's at the sink with his own)
        if (!bossWash.current) HAND_WASH.stream = h.at === 'tap' ? f.localToWorld(HAND_STREAM.copy(o.position)) : null
        // (heard: a splash as it goes into the water or under the stream, the sponge as it's rubbed)
        if (!!h.at !== h.wet) { h.wet = !!h.at; if (h.wet) washSplash(o.getWorldPosition(SOUND_AT)) }
        if (h.rub && h.scrub > 0.2 && now - h.heard > 650) { h.heard = now; scrubSound(nearCam(o.getWorldPosition(SOUND_AT))) }
        // (said of, a few times a second, as it's rubbed, pointed at, or just let go into the water)
        if ((h.rub || now < h.tipTill) && now - h.said > 200) {
          h.said = now
          setTip({ title: '盤子', hint: handSays(h.at, h.dirt, { sponge: SINK.sponge, soap, basketFull: DRAIN.n >= DRAIN_CAP }) })
        }
        // (clean: it waits in the water to be dragged into the basket (item 606, the owner's 「這邊都用拖曳的」: it went in by itself), a clink
        // and a word as it comes clean)
        if (h.dirt <= CLEAN_AT && !h.shone) {
          h.shone = true
          plateClink(o.getWorldPosition(SOUND_AT))
          h.tipTill = now + 3000
          h.said = 0
        }
      }
      // (item 638: the basin's pile under the top plate, each soaking on in the water (slowly, unrubbed), stacked on the basin's floor a
      // little turned one from the next, its smears fading as it comes clean)
      if (f && under.current.length + soakObjs.current.filter((x) => x?.visible).length) {
        const floor = inBar('SinkBasinFloor', endOf(1))
        // (soaking only in standing water: the tap's stream comes down on the one on top (item 681: under the running tap those under it came
        // clean unrubbed, and came up clean))
        const at: HandAt = SINK.water > 0.12 ? 'water' : null
        for (let k = 0; k < UNDER_MAX; k++) {
          const o = soakObjs.current[k], s = under.current[k]
          if (!o) continue
          if (!s) { if (o.visible) o.visible = false; continue }
          // (where it was let go (item 680), on those under it there)
          const lx = s.lay ? s.lay.x : floor.x, lz = s.lay ? s.lay.z : floor.z
          let below = 0
          for (let j = 0; j < k; j++) { const u = under.current[j]; if (u && Math.hypot((u.lay ? u.lay.x : floor.x) - lx, (u.lay ? u.lay.z : floor.z) - lz) < SINK_PLATE_R.v) below++ }
          PILE_AT.set(lx + (s.lay ? 0 : k % 2 ? 0.012 : -0.01), basinBase(floor, lx, lz, s.kind) + below * PILE_STEP, lz + (s.lay ? 0 : k % 2 ? -0.008 : 0.01))
          o.position.lerp(PILE_AT, Math.min(1, step * 10))
          o.rotation.set(0, k * 0.7, 0)
          o.visible = true
          s.dirt = handClean(s.dirt, step, at, { sponge: false, soap: false, scrub: 0 })
          for (const sm of smearsOf(soakIns.current[k])) { (sm.material as THREE.MeshBasicMaterial).opacity = smearOpacity(s.dirt); sm.visible = s.dirt > CLEAN_AT }
        }
      }
      // (the sponge in the player's hand (item 458): after the pointer over the water, on the plate as it's rubbed with it, squashed with the
      // rubbing; further out, back on its dish to look at (still the player's); its place told to the sink, the liquid squeezed onto it there)
      const back = !bossWash.current && !SINK.sponge && now < (HAND_WASH.spongeBack ?? 0)
      const w = !bossWash.current && (SINK.sponge || back) && f ? washSponge.current ?? spongeHome() : null
      if (w && f && back) {
        // (let go of (item 606): back onto its dish in a little arc, eased; its dish's own shown again as it lands (Sink hides it till then))
        const k = 1 - Math.max(0, HAND_WASH.spongeBack - now) / (SPONGE_BACK_S * 1000), sm = k * k * (3 - 2 * k)
        w.g.position.lerpVectors(spongeFrom.current, f.localToWorld(HAND_W.copy(w.home)), sm)
        w.g.position.y += Math.sin(Math.PI * sm) * 0.06
        w.g.quaternion.copy(w.q)
        w.g.scale.set(1, 1, 1)
        w.g.visible = true
        HAND_WASH.spongeAt = null
      } else if (w && f) {
        const wt = f.localToWorld(HAND_TOP.copy(inBar('SinkWaterTop', endOf(1))))
        const rubbing = !!h && h.phase === 'soak' && h.rub
        // (held (item 606): over the counter a little over its dish's height, over the basin just over the water, on the plate as it's rubbed)
        const homeY = f.localToWorld(HAND_W.copy(w.home)).y
        const lvl = rubbing && o ? o.getWorldPosition(HAND_W).y + 0.03 : spongeOver.current === 'basin' ? wt.y + 0.04 : Math.max(wt.y + 0.04, homeY + 0.06)
        // (brought under the liquid's spout as it's pressed, to catch it (item 459), else after the pointer)
        const to = HAND_WASH.spongeTo && now < HAND_WASH.spongeTo.until ? HAND_WASH.spongeTo.at : null
        const p = to ?? (pointerNow.current.x >= 0 ? pointerAtY(pointerNow.current.x, pointerNow.current.y, lvl) : null)
        const near = !!p
        w.g.visible = near
        if (p && near) {
          w.g.position.lerp(p, Math.min(1, step * 30))
          w.g.quaternion.copy(w.q)
          const sq = rubbing ? h!.scrub : 0
          w.g.rotateY(rubbing ? 0.25 * Math.sin(now / 90) * sq : 0)
          w.g.scale.set(1 + 0.12 * sq, 1 - 0.3 * sq, 1 + 0.12 * sq)
          HAND_WASH.spongeAt = w.g.position
        } else HAND_WASH.spongeAt = null
      } else if (!bossWash.current && !HAND_WASH.spongeHeld && washSponge.current?.g.visible) {
        washSponge.current.g.visible = false
        HAND_WASH.spongeAt = null
      }
    }
    DRYER.open = waiters.current.some((x) => x.phase === 'wash' || x.phase === 'unloadTake') ? 1 : 0
    SINK.washing = waiters.current.some((x) => x.phase === 'wash' || x.phase === 'handwash' || x.phase === 'skWash') || wash.current !== null || RICE.washing
    // (every plate told over: the racks', the sink's, the washer's, the basket's, and the rest out (at the plating place, on their way, at the
    // seats))
    PLATE_COUNT.rack = PLATE_RACK.n
    PLATE_COUNT.low = LOW_RACK.n
    PLATE_COUNT.sink = dirty.current
    PLATE_COUNT.washer = DRYER.n
    PLATE_COUNT.basket = DRAIN.n
    PLATE_COUNT.out = Math.max(0, PLATES_ALL - PLATE_RACK.n - LOW_RACK.n - dirty.current - DRYER.n - DRAIN.n)
    if (drainPlates.current) {
      // (nor the basket's till its marks are found (as the sink's own))
      if (DRAIN.n > 0 && markOf('SinkRackSlot0') && markOf('SinkRackSlot1')) {
        const along = inBar('SinkRackSlot1', endOf(1)).sub(inBar('SinkRackSlot0', endOf(1))).normalize()
        drainPlates.current.children.forEach((c, i) => {
          c.visible = i < DRAIN.n
          if (c.visible) { c.position.copy(basketAt(i)); c.quaternion.setFromUnitVectors(UP_Y, along); showKind(c, DRAIN_KINDS[i] ?? 'round') }
        })
      } else drainPlates.current.children.forEach((c) => { c.visible = false })
    }
    // (the plating place's stack of clean plates, the plates in the dryer, and the sticks in the bin: as many drawn as there are)
    plateStack.current?.children.forEach((c, i) => { c.visible = i < PLATING.stock })
    // (nor the dryer's till its marks are found (the owner, 2026-11-15: a row of plates stood in the air over the fire bed, at the bar's end))
    if (DRYER.n > 0 && dryerPlates.current && markOf('SinkDryerRack0') && markOf('SinkDryerRack1')) {
      const along = dryerAt(1).sub(dryerAt(0)).normalize()
      dryerPlates.current.children.forEach((c, i) => {
        c.visible = i < DRYER.n
        if (c.visible) { c.position.copy(dryerAt(i)); c.quaternion.setFromUnitVectors(UP_Y, along) }
      })
    } else dryerPlates.current?.children.forEach((c) => { c.visible = false })
    // (what each of the kitchen's people has in hand, laid out above: for the hearth's guard to move with them if it puts them out of the cook
    // table (bar's CARRIED; each one's list kept and refilled, nothing made a frame))
    const heldBy = (o: THREE.Object3D) => { let a = CARRIED.get(o); if (!a) { a = []; CARRIED.set(o, a) } a.length = 0; return a }
    const po = platerObj.current
    if (po) {
      const h = heldBy(po)
      if (platerStack.current) h.push(platerStack.current)
      if (platerCoal.current) h.push(platerCoal.current)
      if (platerDipper.current) h.push(platerDipper.current)
      if (platerBowl.current) h.push(platerBowl.current)
      if (platerBall.current) h.push(platerBall.current)
    }
    waiters.current.forEach((w, wi) => {
      const o = waiterObjs.current[wi]
      if (!o) return
      const h = heldBy(o)
      const so = stackObjs.current[wi], rag = ragObjs.current[wi], sb = serverSkewers.current
      if (so) h.push(so)
      if (rag) h.push(rag)
      if (sb && sb.userData.by === wi) h.push(sb)
      if (w.carry) for (const key of w.carry) { const r = runObjs.current.get(key); if (r) h.push(r) }
      const pr = runObjs.current.get(w.run ?? -1)
      if (pr) h.push(pr)
    })
  })

  // (the customers' shoes at the door and the soy at their places, for SeatBits: worked out again only when who's in, and where, changes)
  const seatSoys = useMemo(() => seats.map((_, n) => n).filter((n) => soyMask.current & (1 << n)).map((n) => {
      const st = seats[n], c = counters[st.counter]
      // (into the dish where it stands (it may have been moved in edit mode: Roasting's BarTableware notes it), else where it's laid)
      const dish = SOY_DISH_AT.get(n), f = frame.current
      if (dish && f) return f.worldToLocal(dish.clone()).setY(top + 0.013)
      const x = st.mid.clone().sub(c.at).dot(c.along)
      return st.mid.clone().addScaledVector(c.along, sauceSide(c, BAR_GATES[st.counter], x)).addScaledVector(c.lay, PLACE.sauce[1]).setY(top + 0.013)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [soyMask.current, seats, counters, top])

  // (the bowls of miso soup set at their places (bar.ts's SOUP_SEATS: Roasting ladles them out): on the other side of their plate from the soy)
  const [soupVer, setSoupVer] = useState(SOUP.served)
  useFrame(() => { if (SOUP.served !== soupVer) setSoupVer(SOUP.served) })
  /** where a place's bowl of soup is set (the plate's other side from its soy), and its rice: in front of the plate toward the soy's side,
   * on the customer's left of it or right as there's room, clear of the plate and of whatever stands on the bar (item 205) */
  // (kept for the customers' hands: soupWorld above)
  soupSpot.current = (n: number) => soupSpotOf(n)
  function soupSpotOf(n: number) {
    const st = seats[n], c = counters[st.counter]
    const x = st.mid.clone().sub(c.at).dot(c.along)
    return st.mid.clone().addScaledVector(c.along, -sauceSide(c, BAR_GATES[st.counter], x) * 1.15).addScaledVector(c.lay, PLACE.sauce[1]).setY(top + 0.002)
  }
  const riceSpotOf = (n: number) => {
    const st = seats[n], c = counters[st.counter]
    const x = st.mid.clone().sub(c.at).dot(c.along), sd = sauceSide(c, BAR_GATES[st.counter], x)
    const boxes = thingsOnBar(), soupAt = soupSpotOf(n)
    // (clear of the plate as it is (item 228): the long one lies along the counter, its length and width; a round one its round)
    const kind = guestsNow.current.find((g) => g.seat === n && (g.state === 'waiting' || g.state === 'eating'))?.plate ?? 'round'
    const dims = PLATE_DIMS[kind]
    const offPlate = (p: THREE.Vector3) => {
      const d = p.clone().sub(st.plate).setY(0)
      return kind === 'long' ? Math.abs(d.dot(c.along)) > dims.l / 2 + 0.06 || Math.abs(d.dot(c.lay)) > dims.w / 2 + 0.06 : d.length() > dims.w / 2 + 0.07
    }
    const clear = (p: THREE.Vector3) => offPlate(p) && p.distanceTo(soupAt.clone().setY(p.y)) > 0.12
      && !boxes.some((b) => b.distanceToPoint(new THREE.Vector2(p.x, p.z)) < 0.058)
    // (beside the plate toward the soy's side as there's room; with the long plate along the counter, in front of it, nearer the customer)
    for (const [a, l] of [[sd * 0.13, -0.05], [sd * 0.17, -0.03], [-sd * 0.13, -0.05], [sd * 0.22, 0.0], [0, -0.07], [sd * 0.08, -0.12], [-sd * 0.08, -0.12], [sd * 0.26, -0.04]] as const) {
      const p = st.mid.clone().addScaledVector(c.along, a).addScaledVector(c.lay, l).setY(top + 0.002)
      if (clear(p)) return p
    }
    return st.mid.clone().addScaledVector(c.along, sd * 0.13).addScaledVector(c.lay, -0.05).setY(top + 0.002)
  }
  /** where a place's dishes from the stove and the fryer are set (items 461, 469): in the front row either side of the plate, clear of the
   * long plate's ends (the first on the side away from the soy dish, in front of the drink and the soup; the next on the soy's side, in
   * front of it; a third and a fourth further out), `nth`: how many are there already. (sauceSide is the soy dish's offset, ±0.21: only its
   * sign here; taken as ±1 the two were set 0.03 and 0.06 from the middle, on the plate and on each other) */
  function dishSpotOf(n: number, nth = 0) {
    const st = seats[n], c = counters[st.counter]
    const x = st.mid.clone().sub(c.at).dot(c.along), sd = Math.sign(sauceSide(c, BAR_GATES[st.counter], x))
    const out = (nth % 2 === 0 ? -sd : sd) * (DISH_ALONG + DISH_STEP * Math.floor(nth / 2))
    return st.mid.clone().addScaledVector(c.along, out).addScaledVector(c.lay, DISH_LAY).setY(top + 0.002)
  }
  /** which way a place's dishes lie: their long side along the counter */
  const dishYawOf = (n: number) => { const a = counters[seats[n].counter].along; return Math.atan2(-a.z, a.x) }
  const [kitchenVer, setKitchenVer] = useState(KITCHEN.ver)
  useFrame(() => { if (KITCHEN.ver !== kitchenVer) setKitchenVer(KITCHEN.ver) })
  const seatDishes = useMemo(() => [...KITCHEN.seats].flatMap(([n, ids]) => (seats[n] ? ids.map((id, i) => ({ key: `dish:${n}:${i}`, id, at: dishSpotOf(n, i), yaw: dishYawOf(n) })) : [])),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [kitchenVer, seats, counters, top])
  const [bowlVer, setBowlVer] = useState(BOWLS.ver)
  useFrame(() => { if (BOWLS.ver !== bowlVer) setBowlVer(BOWLS.ver) })
  const seatBowls = useMemo(() => ({
    rice: [...RICE_SEATS].filter((n) => seats[n]).map((n) => ({ key: `rice:${n}`, at: riceSpotOf(n), yaw: 0 })),
    soup: [...SOUP_SEATS].filter((n) => seats[n] && BOWLS.setAt.has(`soup:${n}`)).map((n) => ({ key: `soup:${n}`, at: soupSpotOf(n), yaw: 0 })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [bowlVer, soupVer, seats, counters, top])
  if (import.meta.env?.DEV && typeof window !== 'undefined') Object.assign(window, { __seatBowls: seatBowls })
  const seatSoups = useMemo(() => [...SOUP_SEATS].filter((n) => seats[n] && !BOWLS.setAt.has(`soup:${n}`)).map((n) => {
    const st = seats[n], c = counters[st.counter]
    const x = st.mid.clone().sub(c.at).dot(c.along)
    return st.mid.clone().addScaledVector(c.along, -sauceSide(c, BAR_GATES[st.counter], x) * 1.15).addScaledVector(c.lay, PLACE.sauce[1]).setY(top + 0.002)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [soupVer, bowlVer, seats, counters, top])
  // (the tokkuri of sake and its cup set at their places (bar.ts's SAKE_SEATS: Roasting pours them, item 89): past the soup, further out
  // along the bar from their plate)
  const [sakeVer, setSakeVer] = useState(SAKE.served)
  useFrame(() => { if (SAKE.served !== sakeVer) setSakeVer(SAKE.served) })
  const seatSakes = useMemo(() => {
    for (const n of [...sakeSpots.current.keys()]) if (!SAKE_SEATS.has(n) && sakeJob.current?.seat !== n) sakeSpots.current.delete(n)
    return [...SAKE_SEATS].filter((n) => seats[n]).map((n) => {
      const { at, cup } = sakeSpotOf(n)
      return { at, cup }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sakeVer, seats, counters, top])

  // (item 374) what's here from the first and never changes with what goes on: the plating place's carrier dishes and its spare stack, the
  // dryer's and the draining basket's plates, the plate washed by hand and its suds; and what the kitchen carries (coal, the dipper, the
  // skewers, a rice ball, the rice bowl, a stack of plates): hidden or shown, moved and filled frame by frame through their refs. Made once:
  // made afresh each time the bar was drawn (several times a second while the shop's open), some two hundred elements went through React
  // again each time for nothing
  const sinkKit = useMemo(() => (<>
        {/* (a carrier dish under a later dish at the plating place, its seat's plate out already: never the bare table (the owner's); not one
            of the shop's plates, it goes with the food) */}
        {given && Array.from({ length: READY_SLOTS }, (_, k) => (
          <group key={`carrier${k}`} name={`plating-carrier-${k}`} ref={(o) => { carriers.current[k] = o }} position={platingPlace(readyAlong(k))} scale={ON_TABLE * 0.8} visible={false}
            {...shownOver('盤子', '裝盤處｜下一道菜放在這裡等')}><Plate design={k + 3} /></group>
        ))}
        {/* the plating place's stack of clean plates (the kitchen brings them from the racks; one's laid for a seat as its first food comes off the fire) */}
        {given && (
          <group ref={plateStack} name="plating-stack" position={platingPlace(PLATE_STACK_ALONG).addScaledVector(plating.across, PLATE_STACK_ACROSS)}
            {...shownOver('乾淨的盤子', '裝盤處的備用盤｜菜一烤好就拿一個來裝')}>
            {Array.from({ length: PASS_STACK_SHOWN }, (_, i) => (
              <group key={i} position={[0, i * NEST_GAP * ON_TABLE, 0]} rotation-y={i * 1.1} scale={ON_TABLE} visible={false}><Plate design={i + 5} /></group>
            ))}
          </group>
        )}
        {/* the washed plates standing in the dish dryer under the sink's counter (seen through its glass door), and the used sticks in the bin
            beside it (cleared off the customers' plates with them) */}
        {given && (
          <group ref={dryerPlates} {...shownOver('洗好的盤子', '在烘碗機裡烘乾｜乾了外場搬回碗盤架')}>
            {Array.from({ length: DRYER_CAP }, (_, i) => <group key={i} scale={IN_SINK} visible={false}><Plate design={i + 1} /></group>)}
          </group>
        )}
        {/* (and those washed by hand while the washer was busy, standing in the draining basket on the sink's counter) */}
        {given && (
          <group ref={drainPlates} name="drain-plates" {...shownOver('洗好的盤子', '手洗的，立在瀝水籃裡瀝乾')}>
            {/* (drawn shallower than they are, so thirty stood in their notches show a gap between each (the owner's, 2026-11-12): the shop's
                plates are deep, and at the notches' pitch they lay nested into one another) */}
            {Array.from({ length: DRAIN_CAP }, (_, i) => <group key={i} scale={IN_DRAIN} visible={false}><PlateKinds design={i + 2} /></group>)}
          </group>
        )}
        {/* (the owner washing up by hand (item 174): the plate in his hand, the suds on it; the drops off its edge) */}
        {given && (
          <group ref={washHeld} name="wash-plate" visible={false}>
            <group ref={washPlateIn} scale={IN_SINK}>
              <PlateKinds dirty design={0} />
              <group ref={washFoam}>
                {FOAM_AT.map(([x, z], i) => <mesh key={i} geometry={FOAM_GEO} material={FOAM_MAT} position={[x, 0.016, z]} visible={false} raycast={() => {}} />)}
              </group>
            </group>
          </group>
        )}
        {/* (the plate the player's washing by hand (item 224): at the pointer, under the tap or in the water; its suds) */}
        <group ref={handObj} name="hand-plate" visible={false} userData={{ reachPast: true }}
          // (in the water: a press on it takes it up out of the water to be carried (item 606: it rubbed it, item 458); pointed at, it says how
          // it's coming on)
          onPointerDown={(e) => { if (e.nativeEvent.button !== 0 || getEdit().on) return; if (liftRef.current(e.nativeEvent.clientX, e.nativeEvent.clientY)) e.stopPropagation() }}
          onPointerOver={(e) => { const h = hand.current; if (!h || h.phase !== 'soak' || HAND_WASH.held) return; e.stopPropagation(); h.tipTill = Infinity }}
          onPointerOut={() => { const h = hand.current; if (h && h.tipTill === Infinity) h.tipTill = performance.now() + 300 }}>
          <group ref={handIn} scale={IN_SINK}>
            <PlateKinds dirty design={0} />
            <group ref={handFoam} name="hand-foam">
              {FOAM_AT.map(([x, z], i) => <mesh key={i} geometry={FOAM_GEO} material={FOAM_MAT} position={[x, 0.016, z]} visible={false} raycast={() => {}} />)}
            </group>
          </group>
        </group>
        {/* (the basin's pile under it (item 638): in the scene from the start, hidden till a plate's put under; a press on one takes up the top
            one, as a press on the basin does) */}
        {Array.from({ length: UNDER_MAX }, (_, k) => (
          <group key={k} ref={(g) => { soakObjs.current[k] = g }} name={`soak-plate-${k}`} visible={false} userData={{ reachPast: true }}
            onPointerDown={(e) => { if (e.nativeEvent.button !== 0 || getEdit().on) return; if (HAND_WASH.take?.(e.nativeEvent.clientX, e.nativeEvent.clientY)) e.stopPropagation() }}>
            <group ref={(g) => { soakIns.current[k] = g }} scale={IN_SINK}><PlateKinds dirty design={0} /></group>
          </group>
        ))}
        {given && (
          <group ref={washDrips} name="wash-drips">
            {[0, 1, 2].map((i) => <mesh key={i} geometry={DRIP_GEO} material={DRIP_MAT} visible={false} raycast={() => {}} />)}
          </group>
        )}
  </>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [given])
  const carryKit = useMemo(() => (<>
        {given && (
          <group ref={platerCoal} name="plater-coal" visible={false}>
            {/* (a handful of binchotan held across both hands) */}
            {Array.from({ length: 5 }, (_, i) => (
              <mesh key={i} position={[(i - 2) * 0.018, (i % 2) * 0.012, 0]} rotation={[Math.PI / 2, 0, (i - 2) * 0.12]} geometry={COAL_STICK_GEO} material={COAL_STICK_MAT} />
            ))}
          </group>
        )}
        {given && (
          <group ref={platerDipper} name="plater-dipper" visible={false}>
            {/* (a wooden dipper: its cup out front, its handle back to the hands) */}
            <mesh position={[0, 0, 0.12]} geometry={DIPPER_CUP_GEO} material={DIPPER_MAT} />
            <mesh name="dipper-water" position={[0, 0.022, 0.12]} rotation-x={-Math.PI / 2} geometry={DIPPER_WATER_GEO} material={DIPPER_WATER_MAT} />
            <mesh position={[0, 0.02, 0.04]} rotation-x={Math.PI / 2 - 0.25} geometry={DIPPER_HANDLE_GEO} material={DIPPER_MAT} />
          </group>
        )}
        {given && [platerSkewers, serverSkewers].map((ref, k) => (
          <group key={k} ref={ref} visible={false}>
            {/* (a bundle of iron skewers held across the hands) */}
            {Array.from({ length: 7 }, (_, i) => (
              <mesh key={i} position={[(i - 3) * 0.008, (i % 2) * 0.006, 0]} rotation={[Math.PI / 2, 0, (i - 3) * 0.03]}>
                <cylinderGeometry args={[0.0022, 0.0022, 0.17, 5]} /><meshStandardMaterial color="#c9ccd1" metalness={0.85} roughness={0.35} />
              </mesh>
            ))}
          </group>
        ))}
        {given && (
          <group ref={platerBall} visible={false}>
            {/* (a rice ball in the making, and its band of nori) */}
            <mesh geometry={BALL_GEO}><meshToonMaterial color="#f6f3ea" /></mesh>
            <mesh name="ball-nori" geometry={BALL_NORI_GEO} position={[0, -0.012, 0]}><meshToonMaterial color="#1d2a1e" /></mesh>
          </group>
        )}
        {given && (
          <group ref={platerBowl} name="plater-bowl" visible={false}>
            {/* (a wooden rice-washing bowl, the rice in it) */}
            <mesh geometry={RICE_BOWL_GEO}><meshToonMaterial color="#b98b56" side={THREE.DoubleSide} /></mesh>
            <mesh name="bowl-rice" geometry={RICE_IN_GEO} position={[0, 0.045, 0]}><meshToonMaterial color="#f6f2e8" /></mesh>
          </group>
        )}
        {given && (
          <group ref={platerStack} visible={false} {...shownOver('乾淨的盤子', '從碗盤櫃補到裝盤處')}>
            {Array.from({ length: 5 }, (_, i) => <group key={i} position={[0, i * NEST_GAP * IN_SINK, 0]} rotation-y={i * 1.1} scale={IN_SINK}><Plate design={i + 7} /></group>)}
          </group>
        )}
  </>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [given])
  // (item 374) each customer's hit box given the same callbacks each time the bar's drawn: made once for each of them, reading them (and the
  // language) as they are when called; made afresh each time, every customer's hit box was drawn again with the bar, several times a second
  const langNow = useRef(lang)
  langNow.current = lang
  const moveNow = useRef(canMove)
  moveNow.current = canMove
  const grabNow = useRef(grab)
  grabNow.current = grab
  const hits = useRef(new Map<number, { title: () => string; hint: () => string; onPointerDown: (e: ThreeEvent<PointerEvent>) => void; grabbable: () => boolean }>())
  const hitOf = (id: number) => {
    let h = hits.current.get(id)
    if (h) return h
    const now = () => shownRef.current.find((x) => x.id === id)
    h = {
      title: () => guestLabel(id, langNow.current),
      hint: () => {
        const v = now(), l = langNow.current
        return v && moveNow.current(v) ? (l === 'ja' ? 'ドラッグして空席へ' : l === 'en' ? 'Drag to a free seat' : '拖曳到空位換座位') : ''
      },
      onPointerDown: (e) => { const v = now(); if (v) grabNow.current(v)(e) },
      grabbable: () => { const v = now(); return !getEdit().on && !!v && moveNow.current(v) },
    }
    hits.current.set(id, h)
    return h
  }
  // (and the bench's and the genkan's waiting customers' fading and standing still read through callbacks made once for each of them)
  const benchFades = useRef(new Map<number, () => number>())
  const benchFadeOf = (id: number) => {
    let f = benchFades.current.get(id)
    if (!f) benchFades.current.set(id, (f = () => sitters.current.get(id)?.fade ?? 0))
    return f
  }
  const visitorCalls = useRef(new Map<number, { fade: () => number; still: () => boolean }>())
  const visitorOf = (id: number) => {
    let c = visitorCalls.current.get(id)
    if (!c) visitorCalls.current.set(id, (c = { fade: () => visitors.current.get(id)?.fade ?? 0, still: () => visitors.current.get(id)?.phase === 'wait' }))
    return c
  }
  // (those gone let go of)
  useEffect(() => { for (const id of [...hits.current.keys()]) if (!shown.some((x) => x.id === id)) hits.current.delete(id) }, [shown])
  useEffect(() => { for (const id of [...benchFades.current.keys()]) if (!sitterList.some((x) => x.id === id)) benchFades.current.delete(id) }, [sitterList])
  useEffect(() => { for (const id of [...visitorCalls.current.keys()]) if (!visitorList.some((x) => x.id === id)) visitorCalls.current.delete(id) }, [visitorList])

  // (what mounts a stage later, made once for what it's made with: it was made again with every redraw of the bar, three times a second,
  // its stage's wrappers drawn again each time (item 374))
  const shopPropsLater = useMemo(() => <Later stage={2}><ShopProps counters={counters} /></Later>, [counters])
  const fridgesLater = useMemo(() => (fridges ? <Later stage={2}><Fridges fridges={fridges} /></Later> : null), [fridges])
  // (the serving counter, the takeaway stand and the benches, made once for what they're made with (item 374): drawn in the bar's own
  // render, they and all in them were drawn again with every redraw of the bar, 3.4 times a second (Movable 13.5 a second))
  const servePiece = useMemo(() => servePlace && (
    <Movable id="servecounter" label="備餐檯" ground={0} blocks>
      <group name="look-servecounter" position={servePlace.at.toArray()} rotation-y={servePlace.yaw}><ServeCounter /><SakeStation /></group>
    </Movable>
  ), [servePlace])
  const standPiece = useMemo(() => given && (
    <Movable id="takeoutstand" label="外帶桌">
      <group position={[STAND_AT.x, 0, STAND_AT.z]} rotation-y={STAND_AT.yaw}>
        <TakeoutStandModel />
        <group ref={standTop} name="takeout-stand-top" position-y={STAND_TOP} userData={{ marker: true }} />
        {STAND_SLOTS.map(([x, z, a], k) => (
          <group key={k} ref={(o) => { standBags.current[k] = o }} position={[x, STAND_TOP, z]} rotation-y={a} visible={false}><KraftBag /></group>
        ))}
        {/* (the old rice tub on its back half, as the warming tub (the owner's, 2026-11-11)) */}
        <group position={[0, STAND_TOP, WARM_TUB_Z]}><WarmTub /></group>
      </group>
    </Movable>
  ), [given])
  const benchPieces = useMemo(() => given && takeoutWay && (
    <>
      <Movable id="bench" label="候位長凳">
        <group position={[takeoutWay.bench.x, BENCH_PLACE.y, takeoutWay.bench.z]} rotation-y={takeoutWay.benchYaw}>
          {/* (drawn at the customers' size, as the stools are, the same every way (it was squashed along and across to fit, its
              proportions off: the owner's, 2026-11-11)) */}
          <group scale={PEOPLE_SCALE}><WaitingBench /></group>
        </group>
        {/* (its places, where those waiting sit: they go with it, moved by hand) */}
        {takeoutWay.benchSpots.slice(0, BENCH_EACH).map((p, k) => (
          <group key={k} name={`bench-place-${k}`} position={p} userData={{ marker: true }} ref={(o) => { if (o) BENCH_MARKS.set(k, o); else BENCH_MARKS.delete(k) }} />
        ))}
      </Movable>
      {/* (the second bench, along the wall toward the cat stand, under the shrine: the same bench, its own three places (the owner's, 2026-11-12)) */}
      <Movable id="bench2" label="候位長凳（二）">
        <group position={[takeoutWay.bench2.x, BENCH_PLACE.y, takeoutWay.bench2.z]} rotation-y={takeoutWay.benchYaw}>
          <group scale={PEOPLE_SCALE}><WaitingBench /></group>
        </group>
        {takeoutWay.benchSpots.slice(BENCH_EACH).map((p, j) => {
          const k = BENCH_EACH + j
          return <group key={k} name={`bench-place-${k}`} position={p} userData={{ marker: true }} ref={(o) => { if (o) BENCH_MARKS.set(k, o); else BENCH_MARKS.delete(k) }} />
        })}
      </Movable>
    </>
  ), [given, takeoutWay])
  return (
    <group ref={frame} name="bar-frame" scale={scale} position={offset}>
      {/* (the walking paths' map, in edit mode when asked for (item 168)) */}
      <PathMap />
      {/* (what a press of the soap or a squeeze of the washing-up liquid gives out, seen (item 289): one small pool of them for the shop) */}
      <Drips />
      {/* (the keep-clear patches (item 168): put down by the serving counter, moved and sized by hand) */}
      <PathZones home={zoneHome} />
      <PathVias home={viaHome} />
      {/* (the serving counter, in the corridor between the cook table and the freezer (item 167)) */}
      {servePiece}
      {/* (one customer made with the page, never shown: their program linked while it loads) */}
      {people && <Suspense fallback={null}><FolkWarm /></Suspense>}
      {drawCounter && <group position={at}><Counter length={length} /></group>}
      {counters.map((c, i) => {
        // the first counter's floor runs on past its end to the door, and back to meet the others' aisles; each other
        // one's runs up to the first one's
        const c0 = counters[0]
        // (the walls' corner reckoned on unit directions, as the walls stand (on their yaw): the counters' along and lay are a shade over
        // unit length, and reckoned with them the two walls missed each other by a centimetre and more, a step across their tops at the
        // corner and a slot down its inside)
        const unit = (v: THREE.Vector3) => v.clone().normalize()
        if (i === 0) {
          const back = Math.min(-c.length / 2 - 0.35, ...counters.slice(1).map((o) =>
            o.at.clone().addScaledVector(o.lay, farOf(o)).sub(c.at).dot(c.along)))
          const wallBack = Math.min(-c.length / 2 - 0.35, ...counters.slice(1).map((o) =>
            o.at.clone().addScaledVector(unit(o.lay), farOf(o)).sub(c.at).dot(unit(c.along))))
          return (
            <group key={i}>
              <DiningFloor c={c} from={back} to={c.length / 2 + 1.45} bare={!!given} wall={!given} />
              {/* (and past the bar's end, a strip more behind the till for the cashier to stand on; a shop laid out
                  in full has one floor under all of it instead) */}
              {given && <RoomFloor counters={counters} drop={KITCHEN_DROP / scale} />}
              {given && shopPropsLater}
              {given && <DiningWall c={c} from={back} to={c.length / 2 + 1.45} far={FLOOR_FAR} lampId="barlamp" lampName="長吧台" top={top} altar={omiki ?? true} corner={wallBack}
                staffDoor={STAFF_DOOR_AT} genkanDrop={GENKAN.depth + GENKAN_SUNK} />}
            </group>
          )
        }
        const meet = c0.at.clone().addScaledVector(c0.lay, FLOOR_NEAR).sub(c.at).dot(c.along)
        // (where its wall's line reaches the first counter's wall)
        const corner = (FLOOR_FAR - c.at.clone().sub(c0.at).dot(unit(c0.lay))) / unit(c.along).dot(unit(c0.lay))
        return (
          <group key={i}>
            <DiningFloor c={c} from={-c.length / 2 - 0.35} to={meet} far={farOf(c)} bare={!!given} wall={!given} />
            {/* (its wall runs on into the corner, to meet the first counter's: the toilet's door in that stretch) */}
            {given && <DiningWall c={c} from={-c.length / 2 - 0.35} to={corner} far={farOf(c)} lampId="sidelamp" lampName="側吧台" top={top} door={wcs?.door ?? (meet + corner) / 2}
              clear={fridgeClear} hang={koiHang(fridgeClear ?? [], -c.length / 2 - 0.35, wcs?.door ?? (meet + corner) / 2, corner)} store={storeWall} />}
          </group>
        )
      })}
      {/* the way in, just past the end of the bar where the customers come and go */}
      <Entrance at={doorOf(counters)} mark={mark} />
      {/* the till, just inside the door on the bar's side of the way in (the shops that lay out their own counters) */}
      {given && (
        <Register lang={lang} top={top + TILL.rise} yaw={Math.atan2(-counters[0].along.z, counters[0].along.x)}
          at={counters[0].at.clone().addScaledVector(counters[0].along, counters[0].length / 2 + TILL.along).addScaledVector(counters[0].lay, TILL.lay)} />
      )}
      {/* (each stool its own Movable, so each can be moved, turned and made larger or smaller by hand when the shop's shut: only the stool's look; where its guest
          sits and the way to it stay as they are, so no one is put out of a seat) */}
      <Stools seats={seats} />
      {/* their shoes, left in pairs on the genkan's stone by the step, a pair for each of them inside (all of them one draw: SeatBits) */}
      {given && <SeatBits shoes={NO_SHOES} soys={seatSoys} soups={seatSoups} />}
      {/* (the rice and soup bowls at the places, eaten down; and the bowls, the paddle and the ladle of the one filling and serving them (items 205, 206)) */}
      {given && <SeatBowls rice={seatBowls.rice} soup={seatBowls.soup} />}
      {/* (the bowls at the counter and out on the trays (item 207): the same lists every frame, refilled) */}
      {given && <SeatBowls rice={movingBowls.current.rice} soup={movingBowls.current.soup} renge={movingBowls.current.renge} />}
      {given && <primitive object={side.soakPot} />}
      {/* (the dishes from the stove and the fryer, at the places and on their way (items 461, 469)) */}
      {given && <Suspense fallback={null}><KitchenDishes seat={seatDishes} moving={movingDishes} /></Suspense>}
      {given && <><primitive object={side.chawan} /><primitive object={side.wan} /><primitive object={side.shamoji} /><primitive object={side.otama} /><primitive object={side.stream} /></>}
      {given && seatSakes.map((k, i) => (
        <group key={i} position={k.at}><Tokkuri /><group position={k.cup}><SakeCup level={0.8} /></group></group>
      ))}
      {/* (a customer's tokkuri and its cup on their way: poured into at the sake station, waiting at the pass, on a server's tray (item 177)) */}
      {given && <group ref={sakeJugObj} name="sake-going-jug" visible={false}><Tokkuri /></group>}
      {given && <group ref={sakeCupObj} name="sake-going-cup" visible={false}><SakeCup level={0} /></group>}
      {/* (the fridges' own light inside, always on: it lights the drinks whatever the room's light, and shows the more with the lamps out; one
          for the pair, between them, and here from the first, not with the fridges as they come in later: a light added to the scene has every
          material in it made again, a stall) */}
      {fridges && QUALITY.tier === 'high' && (
        <pointLight position={fridges[0].at.clone().lerp(fridges[1].at, 0.5).setY(FRIDGE.H * 0.55)} color="#eaf4ff" intensity={1.1} distance={FRIDGE.H * 2.4} decay={1.4} />
      )}
      {fridges && fridgesLater}
      {/* what each has fetched from the fridge, stood beside their plate, toward the cook (a sake's cup a little nearer them): drunk down sip by
          sip, off the bar in their hand while it's up at their mouth */}
      {given && shown.filter((s) => s.drink && s.phase !== 'leave' && !(s.phase.startsWith('wc') && s.wc?.who === 'drink')).map((s) => (
        <SeatDrink key={`drink${s.id}`} s={s} id={s.drink as DrinkId} at={drinkSpot(s.seat, false)} cupAt={cupped(s.drink!) ? drinkSpot(s.seat, true) : null}
          clock={clock} level={1 - (s.drunk ?? 0)} />
      ))}
      {/* (each seated customer's soy in the little dish at their place, a dab of grated daikon in it: drawn with the shoes, SeatBits) */}
      {/* the dirty plates waiting in the sink, and the plates out: on their way to a seat, at it, cleared away, washed and going back */}
      {Array.from({ length: Math.min(dirty.current, SINK_SHOWN) }, (_, i) => (
        <group key={`d${i}`} name={`sink-dirty-${i}`} ref={(o) => { sinkPlates.current[i] = o }} position={dirtyAt(i)} rotation-y={i * 0.9} scale={IN_SINK}
          // (the dirty plates taken up to wash one (the owner, 2026-11-15: "I can't wash up by hand": the stack did nothing))
          // (and the thing to click next for washing up by hand lit up while they're pointed at (item 215))
          onPointerOver={(e) => { if (getEdit().on || HAND_WASH.held) return; e.stopPropagation(); tipOver('髒盤子', basinHint()).onPointerOver(e); guideOn() }}
          onPointerOut={(e) => { if (getEdit().on || HAND_WASH.held) return; tipOver('髒盤子', '').onPointerOut(e); guideOff() }}
          // (a press takes the top one up in the player's own hand, to be washed under the tap or in the water (item 224))
          onPointerDown={takeUp}><PlateKinds dirty design={i} /></group>
      ))}
      {sinkKit}
      {/* (the kitchen's plater, off their place on the way to the racks and back with plates for the plating place; at their place, Roasting draws them;
          the plates in their hands) */}
      {given && !ownerServes && (
        <group ref={(o) => {
          const was = platerObj.current
          if (was && was !== o) { KITCHEN_FOLK.delete(was); FIGURES.delete(was) }
          platerObj.current = o
          // (out from his place and back to it: the third cook's is his bay, the second cook's his board; none, the owner)
          if (o) { KITCHEN_FOLK.add(o); FIGURES.set(o, !plater ? 'owner' : plater.role === 'sous' ? 'sous' : 'other') }
        }} name="plater-walker" scale={STAFF_SCALE} visible={false}>
          <BlobShadow r={0.17} />
          {plater ? <StaffFigure id={plater.id} role={plater.role} look={plater.look} /> : <OwnerWalker />}
        </group>
      )}
      {carryKit}
      {/* (a server's stack of dried plates, on their tray on the way from the dryer back to the racks) */}
      {waiters.current.map((_, wi) => (
        <group key={`stack${wi}`} name={`server-stack-${wi}`} ref={(o) => { stackObjs.current[wi] = o }} visible={false} {...shownOver('洗好的盤子', '外場搬回碗盤架')}>
          {Array.from({ length: 5 }, (_, i) => <group key={i} position={[0, i * NEST_GAP * IN_SINK, 0]} rotation-y={i * 1.1} scale={IN_SINK} name={`stack-plate-${i}`}><Plate design={i + 3} /></group>)}
        </group>
      ))}
      {/* (each server's cloth, out on the bar as they wipe it down) */}
      {waiters.current.map((_, wi) => (
        <mesh key={`rag${wi}`} name={`bar-rag-${wi}`} ref={(o) => { ragObjs.current[wi] = o }} geometry={RAG_GEO} visible={false} raycast={() => {}}>
          <meshToonMaterial color="#f2efe6" />
        </mesh>
      ))}
      {runs.current.map((r) => (
        // (pointed at, it says whose it is and where it is in its round (item 279): read as the pointer comes onto it, the run as it is then)
        <group key={r.key} name={`plate-run-${r.key}`}
          {...shownOver(PLATE_NAME[r.kind ?? 'round'], () => plateSays({ phase: r.phase, seat: r.seat, bones: r.bones, sticks: r.sticks, tissue: !!r.tissue, drink: !!r.glass }))}
          ref={(o) => {
          if (!o) { const was = runObjs.current.get(r.key); if (was) PLATE_FACES.delete(was); return void runObjs.current.delete(r.key) }
          runObjs.current.set(r.key, o)
          // (a plate a piece can be rested on, its face found by a ray (Roasting, item 258))
          PLATE_FACES.add(o)
          if (!o.userData.placed) {
            o.userData.placed = true
            o.position.copy(r.from)
          }
        }}>
          {!r.bare && <Plate kind={r.kind ?? 'round'} dirty={r.phase === 'clear' || r.phase === 'dirty' || r.phase === 'taken'} dirt={r.dirt ?? 1} design={designOf(r.key)} sticks={r.sticks ?? 1} bones={r.bones ?? 0} glass={r.glass && (r.phase === 'taken' ? GLASS_ON : r.glass)} drink={r.drink} level={r.level}
            garnish={r.phase === 'home' ? undefined : r.phase === 'clear' || r.phase === 'dirty' || r.phase === 'taken' ? 'left' : 'full'}
            tissue={r.tissue && (r.phase === 'taken' ? TISSUE_ON : r.tissue)} />}
        </group>
      ))}
      <Later stage={3}>
      {given && fridges && stocker && <Stocker counters={counters} fridges={fridges} who={stocker} />}
      {/* (item 696: his companion down with him while the shop's shut by day, sat at the bar by his fire with her tea) */}
      {given && <CompanionAtBar seats={seats} open={open} top={top} />}
      {/* (what the staff and the owner say as the day ends and begins, over their heads) */}
      {given && <StaffWords />}
      {/* (the worn out among the staff, while the shop's open: a debuff beside each (the owner's)) */}
      {given && open && <TiredBadges />}
      {/* (what's just been paid, rising green over the one who paid it, and gone) */}
      {payFloats.map((f) => <PayFloat key={f.key} text={f.text} follow={() => groups.current.get(f.id)} done={() => setPayFloats((all) => all.filter((x) => x.key !== f.key))} />)}
      {/* (the owner gone to wash the stack left on the sink's counter (item 103), or the player's washing up (item 166): only while he's at it;
          there with nobody hired too, as he's at the fire while the shop's shut and it's him who goes then) */}
      {(
        <group ref={(o) => {
          const was = bossObj.current
          if (was && was !== o) { KITCHEN_FOLK.delete(was); FIGURES.delete(was) }
          bossObj.current = o
          if (o) { KITCHEN_FOLK.add(o); FIGURES.set(o, 'owner') }
        }} scale={STAFF_SCALE} visible={false} userData={{ broom: false }}>
          <BlobShadow r={0.2} />
          <OwnerWalker />
        </group>
      )}
      {ownerServes && (
        <group ref={(o) => {
          const was = waiterObjs.current[0]
          if (was && was !== o) { KITCHEN_FOLK.delete(was); FIGURES.delete(was) }
          waiterObjs.current[0] = o
          if (o) { KITCHEN_FOLK.add(o); FIGURES.set(o, 'owner') }
        }} position={ownerAt()} rotation-y={OWNER_YAW} scale={STAFF_SCALE} visible={false}>
          <BlobShadow r={0.2} />
          <OwnerWalker />
        </group>
      )}
      {!ownerServes && servers.slice(0, homes.length).map((w, i) => (
        <group key={w.id} ref={(o) => {
          const was = waiterObjs.current[i]
          if (was && was !== o) { KITCHEN_FOLK.delete(was); FIGURES.delete(was) }
          waiterObjs.current[i] = o
          if (o) { KITCHEN_FOLK.add(o); FIGURES.set(o, 'other') }
        }} position={homes[i].at} rotation-y={homes[i].yaw} scale={STAFF_SCALE} userData={{ staffId: w.id }}>
          <BlobShadow r={0.17} />
          <StaffFigure id={w.id} role="server" look={w.look} />
        </group>
      ))}
      {people && shown.map((s) => {
        const g = guests.find((x) => x.id === s.id)
        const walking = s.phase !== 'sit'
        return (
          <group key={s.id} position={s.from ?? doorLead.start ?? wayIn} userData={{ guest: s.id }} ref={(o) => { if (o) { groups.current.set(s.id, o); FIGURES.set(o, 'other') } else groups.current.delete(s.id) }}>
            {/* (a soft shadow under them, sat or walking) */}
            <BlobShadow r={0.17 * PEOPLE_SCALE} />
            <group scale={PEOPLE_SCALE}>
              <PersonClock s={s} phase={s.wcSit ? 'wcSit' : s.phase === 'sit' && s.wipeAt ? 'wipe' : s.phase} drink={s.drink} eating={s.phase === 'sit' && FED.has(s.id)}
                clock={clock} talk={talkSide(s)} mood={g ? moodOf(g) : null} plateOf={plateWorld} drinkOf={drinkWorld} soupOf={soupWorld} drunk={s.drunk} />
              {/* (named as the pointer's over them; picked up and carried to another stool while they wait) */}
              <FigureHit {...hitOf(s.id)} />
            </group>
            {/* (their label just over their head, sat up on the seat or standing) */}
            <GuestLabel id={s.id} y={((walking ? 0 : FOLK_SEAT) + FOLK_HEIGHT * FOLK_FIT * folkSpec(s.id).size) * PEOPLE_SCALE + 0.08}
              dots={!!g && !walking && g.state === 'waiting' && g.rating === null} rating={g?.rating ?? null} angry={g?.state === 'angry'}
              partner={g?.partner !== undefined && !g?.family} name={guestLabel(s.id, lang)} onEl={labelEl}  lang={lang} />
          </group>
        )
      })}
      {/* the takeaway stand behind the cashier's chair (bar.ts's TAKEOUT_STAND): its bags on its top, set there by the servers */}
      {standPiece}
      {/* the waiting bench in the genkan, and those sat on it waiting for a stool */}
      {benchPieces}
      {/* (gone from the bench's list, faded out: drawn so until React takes them away, never back at full (it was ?? 1: a blink of them whole in the
          doorway as they went, the last frame)) */}
      {people && sitterList.map((v) => (
        <group key={`bench${v.id}`} name={`bench-sitter-${v.id}`} ref={(o) => { if (o) { if (!placedOnce.has(o)) o.visible = false; sitterObjs.current.set(v.id, o); FIGURES.set(o, 'other') } else sitterObjs.current.delete(v.id) }}>
          <BlobShadow r={0.17 * PEOPLE_SCALE} />
          <group scale={PEOPLE_SCALE}>
            <Suspense fallback={null}>
              <FolkFigure id={v.id} eating={false} walking={!v.sat} clock={clock} fade={benchFadeOf(v.id)} fit={FOLK_FIT} />
            </Suspense>
          </group>
        </group>
      ))}
      {/* (the shoes of those waiting on the bench, left on the genkan's stone at the step, toes out (item 203)) */}
      {people && given && <BenchShoes sitters={sitters} />}
      {/* takeaway customers and riders waiting in the genkan, and the boxes the servers carry out to them */}
      {people && visitorList.map((v) => (
        <group key={`takeout${v.id}`} ref={(o) => { if (o) { visitorObjs.current.set(v.id, o); FIGURES.set(o, 'other') } else visitorObjs.current.delete(v.id) }}>
          <BlobShadow r={0.17 * PEOPLE_SCALE} />
          <group scale={PEOPLE_SCALE}>
            <Suspense fallback={null}>
              <FolkFigure id={v.id} eating={false} walking still={visitorOf(v.id).still} clock={clock}
                fade={visitorOf(v.id).fade} fit={FOLK_FIT} held={v.has ? <TakeoutBag /> : undefined} />
            </Suspense>
            {v.rider && <RiderGear id={v.id} size={folkSpec(v.id).size} fade={visitorOf(v.id).fade} />}
          </group>
        </group>
      ))}
      {people && homes.map((_, i) => (
        <group key={`box${i}`} ref={(o) => { waiterBoxes.current[i] = o }} visible={false}><KraftBag /></group>
      ))}
      {/* the bag being handed over by the cashier, from the stand over the till */}
      {people && <group ref={handBag} visible={false}><KraftBag /></group>}
      </Later>
    </group>
  )
}
/** (item 374) the bar drawn again only when what it's given has changed: the page draws it a few times a second while the shop's open (its
 * clock, its log), each time with its crew made afresh (the same people in new objects) and its place a new vector; drawn again with them,
 * all of the bar (some five hundred elements) went through React again for nothing. Its crew compared by who they are, a place by where */
type BarProps = Parameters<typeof GuestBar3DImpl>[0]
type BarWorker = { id: string; role?: string; look: unknown } | null | undefined
const sameWorker = (a: BarWorker, b: BarWorker) => a === b || (!!a && !!b && a.id === b.id && a.role === b.role && a.look === b.look)
function sameBar(a: BarProps, b: BarProps) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof BarProps>
  for (const k of keys) {
    const x = a[k] as unknown, y = b[k] as unknown
    if (Object.is(x, y)) continue
    if (k === 'servers') {
      const p = (x ?? []) as BarWorker[], q = (y ?? []) as BarWorker[]
      if (p.length === q.length && p.every((w, i) => sameWorker(w, q[i]))) continue
      return false
    }
    if (k === 'plater' || k === 'stocker') { if (sameWorker(x as BarWorker, y as BarWorker)) continue; return false }
    if (x instanceof THREE.Vector3 && y instanceof THREE.Vector3 && x.equals(y)) continue
    // (no one in yet, either time: a new empty list)
    if (Array.isArray(x) && Array.isArray(y) && !x.length && !y.length) continue
    return false
  }
  return true
}
export const GuestBar3D = memo(GuestBar3DImpl, sameBar)
