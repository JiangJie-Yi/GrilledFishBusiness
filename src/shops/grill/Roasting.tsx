import { KITCHEN_IDS } from '@/data/kitchenDishes'
import { cookSeconds, sideAllowed } from '@/game/kitchen/station'
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { SKEWER_POOL, skewerTotal, takeSkewer, usedSkewer, washAll } from '@/game/kitchen/skewers'
import { BOWL_HAND_MAX, BOWL_WARM_MAX, bowlPlace, warmToEat } from '@/game/service/plates'
import { TONG_S, TONG_TAKE_S, TRAY_PLACES, trayPlace } from '@/game/service/tray'
import { CALM_ASK, KITCHEN, FIRE_FLARE, FUMING, KAKUBAT } from './bar'
import { calmedSince } from '@/game/guests/calm'
import { CALM_GUEST, CALM_OWNER, PROP_TALK } from '@/data/calmLines'
import { SkewerStore } from './SkewerStore'
import { clinkSound, pierceSound } from './skewerSound'
import { sizzleBurst } from './restroomSound'
import { BONES_GEO, HEAD_GEO, BONE_MAT, BONE_HEAD_MAT } from './fishBones'
import type { Gripe } from '@/game/guests/reputation'
import { BASE_MATERIAL } from '@/scene/render/baseMaterial'
import { SOFT_DOT } from '@/scene/effects/softDot'
import { useGLTF } from '@react-three/drei'
import { Html } from '@/scene/interact/Html'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { glowOnly } from '@/scene/interact/hoverGlow'
import { canCookByHand, modeOf, showsProgress } from '@/game/kitchen/mode'
import { FLOWS, hourGap, wantOf, type FlowKind } from '@/game/guests/flow'
import { businessDay, flowFor, showerGap, weatherOf } from '@/game/world/weather'
import { bedStick, COAL_MAX, COAL_PER_ADD, crumble, glowingFor, roomFor, type Lay, throwForce } from '@/game/kitchen/coalPile'
import { BlobShadow } from '@/scene/effects/BlobShadow'
import { GAME_SPEED, tick } from '@/scene/kit/speed'
import { CHEFS } from '@/data/chefs'
import { LINES } from '@/data/lines'
import { steady } from '@/scene/kit/steadyProps'
import { StaffFigure, StaffWarm } from '@/scene/people/StaffFigure'
import { fireCall, fireLow, HOT_AT, roastRate } from '@/game/kitchen/fireTend'
import { nextTrip, TAKE_S, TEND_AT, tendOf } from '@/game/kitchen/chefFlow'
import { boardRoom, freeRingSlot } from '@/game/kitchen/fireSlots'
import { pickOrders, takesAt } from '@/game/kitchen/orderPick'
import { addWares, leftBehind, noWares, wareCount } from '@/game/service/ware'
import { fairPrice } from '@/game/money/economy'
import { getClock } from '@/ui/kit/clockStore'
import { crewAnswer, crewEcho } from './crewTalk'
import { sideChance } from '@/game/kitchen/sides'
import { gaveUpOnNext, overstayed } from '@/game/guests/stay'
import { RICE_SIDE, riceName } from '@/data/sides'
import { SOUP_SERVE_S, SOUP_SIDE, soupReady, takeBowl } from '@/game/kitchen/soup'
import { SAKE_SERVE_S, SAKE_SIDE, SAKE_WAIT_S } from '@/game/kitchen/sakeStand'
import { sideChance as sakeChance } from '@/game/kitchen/sakeTasting'
import { seasonSound, sprinkleTick } from './seasonSound'
import { biteSound, chewSound } from './chewSound'
import { comesIn, patienceIn, roomMood } from '@/game/world/roomLights'
import { getLights } from '@/scene/render/lightsStore'
import { canRide, comesAt, drinksAlcohol, familyShare, kindOf, LATE_MORE, pastHour, WITH_CHILD } from '@/data/guests'
import { fitsBeforeClose, RIDER_SHARE, TAKEOUT_MAX, takeoutGap, takeoutSize } from '@/game/guests/takeout'
import { CLOSE_AT } from '@/game/world/hours'
import { type Seasoning } from '@/data/menu'
import { partName, type Seasoning as Dab } from '@/data/recipes'
import { tipIn } from '@/data/tipText'
import { bestStage, PAIRING, PAIRING_DEFAULT, stageOf as seasonStage, timingLoss } from '@/game/kitchen/taste'
import type { Step } from '@/game/types'
import { CRATE, DECOR, Decor, FRIDGE_KICK, backToCrate, liftFromCrate, takeFromCrate, type Held } from './Decor'
import { BOARD, COAL_BRIDGE, IRONS, SAKE, SAKE_SEATS, SAKE_TASTED, SOUP, SOUP_SEATS, SHRINE_FLOWERS, WC_GRUMBLE, TAKEOUT, RIDERS, TAKEOUT_SPOT, SERVE_COUNTER, barToFire, BENCH, BENCH_SEATS, BENCH_WAIT, PULLED } from './bar'
import { fireAmbience } from './fireAmbience'
import { fireSound } from '@/game/kitchen/fireSound'
import { flowerBuffs } from '@/game/world/shrineFlowers'
import { BOSS_TASTE } from './Boss'
import { MODEL_LEN, MODEL_R, useBinchotan } from './binchotanModel'
import { coalLayer, coalLook, type CoalLook } from './coalLayer'
import { offsetOf, positionOf, settleOffset, useEditSel } from './edit'
import { figureCursorOn, setTip } from '@/scene/interact/hoverTip'
import { EditBlock } from './Movable'
import { plateFor, type PlateKind } from '@/game/service/plateSize'
import { CREW_LOAD, GAZE, SHOP, STAFF_SAY, LATE, LAST_CALL, RATING_FLOW, STAFF_TALK } from '@/game/world/shopState'
import { loadOf } from '@/game/staff/crewMood'
import { FED, EAT_PHASE, PLATE_FACES, SAY_SEATED, BOWLS, RICE_SEATS, SIDE_SALE, FIRE_TEND, SKEWERS, SEAT_MOVE, CHOPS_USED, CHOPS_OFF, SEAT_LEFT, SEATS_UNCLEARED, GRIPES, gripe, meterWater, SUPPLIES, SICK, PLATING, READY_SLOTS, PLATES_OUT, PLATER_OUT, OWNER_GRILL, FETCHER, SEAT_STICKS, SEAT_BONES, WHOLE_FISH, ALONG, drinkFor, POINTER_HINT, PLATES_SET, SEATS_TAKEN, SERVICE, PANTRY, GRILL_COUNTERS, GRILL_OFFSET, GRILL_SCALE, GRILL_SEATS, FIRE_SHIFT, KITCHEN_DROP, LAY, toGrillScene, COOK_NOTCH, SOUS_NOTCH, seatTurn } from './bar'
import { freshFactor, sickChance } from '@/game/stock/freshness'
import { NO_POINTER, zr } from '@/scene/interact/htmlProps'
import { GAZE_AT, baseName, SIDE_LEAD, TURN_AT, TURN_S, STICK_AXIS, FIRE_SIDE, FIRE_INV, STICK_TURN, DONE_TINT, BURNT_TINT, CHAR_START, CHAR_FULL, FACE_CAMERA, SIPS, SOUP_TASTE, DISH_TASTE, FAN_GAIN, FAN_MAX, FAN_FADE, FAN_RISE, FAN_BURN, FIRE_FANNED_MAX, FAN_OVER_BURN, SIDE_EAT_S, FLIGHT_SECONDS, PIERCE_MS, LAY_DIR, STACK_DIR, ON_BOARD, ONE, PLATE_R, SLOT_GAP, PER_LAYER, PER_PLATE, ASH_GAIN, ASH_TINT, PLATE_STEP, DISH_TOP, BASKET_TOP, CONTAINER_TIP, BOWL_TOP, BOWL_R, FATTY, TRAY_REST, TRAY_SIDE, TRAY_OFF, TONG_LEN, TONG_REST_OUT, TONG_LIE, TONG_LIFT_S, TONG_BACK_S, type TongPhase, TONG_X, TONG_Y, TONG_Z, TONG_M, TONG_QR, TONG_QU, TONG_AT, TONG_REST_TIP, BONE_SCALE, BONES_TIP, BOWL_PUSH, BOWL_RIM, EDIT_PIECES, DRAG_PIECES, PLATE_TOP, EAT_SECONDS, GUEST_EAT_SECONDS, BITES_PER_PIECE, UP, ZERO, SIZZLE_AT, HAND_OFFSET, BUCKET_SCALE, BIN_R, ROD_WS, TRASH_R, TRASH_H, FLOOR_BUCKET, FLOOR_TRASH } from './roasting/tuning'
import { type Guest, MAX_SEATED, COUPLE_HIM, COUPLE_HER, PATIENCE } from './roasting/guests'
import { BAR_SEATS, BAR_AT_SCENE, BAR_FOOD_SCALE, TAKEOUT_FOOD, PLATING_FRAME, SKEWER_SCALE, SKEWER_DROP, skewerHolderAt, skewerUsedAt, PLATING_DIR, readyFoodAt, TURN_Q, LOW_AT, REST_RAY, REST_STALE, TRAY_SPOT, TRAY_REST_MS, REST_SIDE, REST_ACROSS, REST_LONG, REST_ROLL, REST_BOX, drawnUp, seatFoodAt, HOVER_GLOW } from './roasting/barPlaces'
import { coalClink } from './roasting/sounds'
import { WhenHeld, type Piece, type TagState, stageOf, Plate, STEAMS, type RoastingProps } from './roasting/piece'
import { FoodWasteBin } from './roasting/bins'
import { TRAY_ROWS, TRAY_CAP, LOOSE_CAP, TRAY_COL, RAW_DISH_CAP, TRAY_W, TRAY_D, BOX_R, BOX_SPOT, LEDGE_L, FAN_PEG, FAN_DROP, FIXED, FIXED_ON_TOP, POP_FEED, WISP_FEED, PopWords, Wisps } from './roasting/pops'
import { PIT_SCALE, PIT_GROUND, scorchEarth, EmberBed, UP_AXIS, COAL_LAST_S, COAL_HOLD_S, COAL_KINDLE_S, PIT_SALT_RISE, PIT_LIFT, BED_TURN, PIT_PARTS, SIDE_SAY_MS, RING_CLEAR, HEARTH_LONG, clearOfHearth, overSousBay } from './roasting/hearth'
import { Bar } from './roasting/bar'
import { COOK_TABLE, HOUSE_CHEF, CHEF_AT, SOUS_AT, NOTCH_STEP, SOUS_STEP_AT, SOUS_STEP_YAW } from './roasting/kitchen'
import { CHEF_TRIP, prepOf, CHEF_CARRY, CARRY_S, CARRY_STEP, CARRY_LEAN, TONGS_GEO, TONGS_MAT, ARM_REACH, TONGS_Z, GRIP, toRingPlace, footOf, crewPlaces } from './roasting/crew'
import { CrewWalk } from './roasting/crewWalk'
import { CARRY_LIFT, TOP_AT } from './roasting/hearthGuard'
import { ASH_TIDY, TIDY_GAIN, CookTable } from './roasting/cookTable'
import { EditProxy } from './roasting/barTableware'
import { NotchStep } from './roasting/notchStep'
import { BossBedWays, BossFuton, BossSpot } from './roasting/bossBed'
import { Tray, PinchHand } from './roasting/tray'
import { DISH_R, DISH_STEP, BASKET_R, BOWL_CURVE, BASKET_SIZE, basketScale, BASKET_STEP, GRAINS, DAB_EVERY, DAB_FIRST, toolAction, RINGS, RING_LIFE, BOUNCE_TIME, BOUNCE, GRAIN_COLORS, DABS, DAB, TOOL_NAMES, STICK_FOOT_R, STICK_TOP_R, STAND_UP, STICK_TOP_Y, LAYER_HEIGHT } from './roasting/tools'
import { SideDish } from './roasting/sideDish'
import { BOX_TIER, tierOf, bentoSpot, TakeoutBox, TasteBowl } from './roasting/takeout'
import { TRAY_SWAP, KAKU, ServeTongs, Basket } from './roasting/serving'
import { type Looks, EYE_LOOKS, addCharring, MAX_BITES, newBites, biteOutline, warmCharring, ledgeCopy, inkOneLine, PULL_MS, PULL_OUT, rodReach, ROD_LEN, standardStick, seeded, crumpleFoil } from './roasting/pieceLook'



/**
 * Roasting over the fire: each skewer browns as it cooks (raw → half → done → slowly charring), shows a tag above
 * it, glows under the pointer, and a click on the tag or the food lifts it off the fire onto the plate.
 * Rendered as a sibling after <Dish>, so its per-frame transforms land after Dish's pop-in animation, and it picks
 * up the extra portions Dish clones in as they appear.
 */
/** the last number given a piece, its face kept on the plate under it (roasting/barPlaces' REST_STALE) */
let REST_HID = 0
/** how many times the shop has opened since the page was loaded (each opening draws the next pattern of trade) */
const OPENINGS = { n: 0 }
/** a session of trade, on the shop's clock (runGuests counts 0.8 a beat): what the day's pattern is laid over */
const SESSION_LEN = 420

/** (item 374) drawn again only when what it's given has really changed: the page drew it about three times a second while the shop's open,
 * handing it its callbacks made afresh and its servings, crew and names as new objects of the same values, and everything under it that
 * isn't memoised with it (scene/steadyProps: each callback a steady one calling the latest, each value kept while it's alike) */
export const Roasting = steady(RoastingImpl)
function RoastingImpl({ url, roast, itemIds, quantities, active, instant = false, fire, heat, onOffFire, onEat,
  onNotice, smoke, blackSmoke, ai = false, research = false, onOrder, onAddCharcoal, onSay, chef = CHEFS[1], onGuests, space = 'closed',
  locked = false, notes = {}, crowd = 1, blessed = false, onDrink, onWalkOut, onVisit, lang = 'zh', names = {}, crew = [], bar = true,
  entries, onOrderEntry }: RoastingProps) {
  const L = () => LINES[lang]
  const nameOf = (id: string) => names[id] ?? roast.names[id] ?? id
  const { scene } = useGLTF(url)
  /** the whole room's scene (the boss is in it, not in the model) */
  const room = useThree((st) => st.scene)
  const menuIds = useMemo(() => new Set(itemIds), [itemIds])
  const root = scene.children[0]
  // the water bucket's two hoops, made as flat bands (片) rather than round rods: the model's hoops are found by their material and each ring is
  // measured (where along the bucket it stands, how wide it is), then the mesh is given two thin bands of the same height, flat in section
  useMemo(() => {
    root.getObjectByName('WaterBucket')?.traverse((o) => {
      if (!(o instanceof THREE.Mesh) || o.userData.flatHoops || o.name.endsWith('_outline')) return
      if ((o.material as THREE.Material).name !== 'BucketHoop') return
      o.userData.flatHoops = true
      const pos = o.geometry.getAttribute('position')
      o.geometry.computeBoundingBox()
      const bb = o.geometry.boundingBox!, sz = bb.getSize(new THREE.Vector3())
      // (the bucket's own axis is the one the hoops are shortest along)
      const ax = sz.x <= sz.y && sz.x <= sz.z ? 0 : sz.y <= sz.z ? 1 : 2
      const get = (i: number, k: number) => (k === 0 ? pos.getX(i) : k === 1 ? pos.getY(i) : pos.getZ(i))
      const mid = (bb.min.getComponent(ax) + bb.max.getComponent(ax)) / 2
      const rings = [{ lo: Infinity, hi: -Infinity, r: 0 }, { lo: Infinity, hi: -Infinity, r: 0 }]
      const u = (ax + 1) % 3, v = (ax + 2) % 3
      for (let i = 0; i < pos.count; i++) {
        const a = get(i, ax), ring = rings[a < mid ? 0 : 1]
        ring.lo = Math.min(ring.lo, a); ring.hi = Math.max(ring.hi, a)
        ring.r = Math.max(ring.r, Math.hypot(get(i, u), get(i, v)))
      }
      const bands = rings.map((r) => {
        const h = Math.min((r.hi - r.lo) * 0.9, 0.05), t = 0.012, R = r.r
        const prof = [[R - t, -h / 2], [R, -h / 2], [R + 0.003, h / 2], [R - t, h / 2], [R - t, -h / 2]].map(([x, y]) => new THREE.Vector2(x, y))
        const g = new THREE.LatheGeometry(prof, 56)
        g.translate(0, (r.lo + r.hi) / 2, 0)
        return g
      })
      let merged = mergeGeometries(bands, false) as THREE.BufferGeometry
      // (the lathe stands along Y: laid along the bucket's own axis if that's another)
      if (ax === 2) merged.rotateX(Math.PI / 2)
      else if (ax === 0) merged.rotateZ(-Math.PI / 2)
      merged = merged.toNonIndexed()
      merged.computeVertexNormals()
      o.geometry = merged
      for (const c of o.children) if (c instanceof THREE.Mesh && c.name.endsWith('_outline')) c.geometry = merged
    })
  }, [root])
  // the fire pit drawn bigger than it was modelled (its stones further out, the coals heaped wider), the skewers
  // still planted where they were, now well inside the ring
  useMemo(() => {
    for (const o of root.children) {
      // (the hearth's bed, frame and stones stand in edit mode's way: what's behind them isn't chosen or lit through them (item 162: the trash bin
      // and the knives lit through the frame); App's EditBlock round the model looks at them)
      if (/^(FirePit|Robuchi|Stone)/.test(o.name)) o.userData.editBlock = true
      if (!PIT_PARTS.test(o.name) || o.userData.pitScaled) continue
      o.userData.pitScaled = true
      o.position.x *= PIT_SCALE
      o.position.z *= PIT_SCALE
      o.position.y += PIT_LIFT
      o.scale.multiplyScalar(o.name === 'FirePit' ? PIT_SCALE * PIT_GROUND : PIT_SCALE)
      // (the square hearth (its bed, its frame and the stones round it) turned square to the table; the round things in it don't mind)
      if (/^(FirePit|Robuchi|Stone)/.test(o.name)) {
        // (the stones, set round the square, carried round with it about the fire's middle)
        const turn = Math.atan2(-ALONG.z, ALONG.x)
        if (/^Stone/.test(o.name)) o.position.applyAxisAngle(UP_AXIS, turn)
        // (the bed drawn longer along the table: its own x is the table's length once turned. The frame's made that long already
        // (blender/grilledfish.py's IRORI_LONG): stretched here, its bars along the table were wider than the others and its brass corner
        // caps lopsided)
        if (/^FirePit/.test(o.name)) o.scale.x *= HEARTH_LONG
        o.rotateOnWorldAxis(UP_AXIS, turn)
      }
      // (the salt heaped higher, filling the ring)
      if (o.name === 'FirePit') { o.scale.y *= PIT_SALT_RISE; scorchEarth(o as THREE.Mesh) }
    }
    // (no striped shadow acne on the salt and no lattice shadow of the net laid over the coals: the ground doesn't take shadows, the net casts none)
    root.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      if (/^FirePit/.test(o.name)) m.receiveShadow = false
      if (/^GrillNet/.test(o.name) || /^GrillNet/.test(o.parent?.name ?? '')) m.castShadow = false
    })
    // (the net a hand's width higher too)
    const net = root.getObjectByName('GrillNet')
    if (net && !net.userData.lifted) {
      net.userData.lifted = true
      net.position.y += PIT_LIFT
    }
  }, [root])

  // pieces by node, found by scanning the model root; rescanned whenever Dish adds a cloned portion
  const pieces = useRef<Piece[]>([])
  /** the owner's last dish-up call and when (said once for a dish however many pieces of it come off together (item 324)) */
  const lastCall = useRef({ text: '', at: -1e9 })
  /** the chef's long chopsticks (CHEF_CARRY: out while he reaches further than his arm) */
  const tongs = useRef<THREE.Mesh>(null)
  if (import.meta.env?.DEV && typeof window !== 'undefined') (window as unknown as { __pieces?: typeof pieces }).__pieces = pieces
  /** (on a phone) who's had their drink from the fridge */
  const drank = useRef(new Set<number>())
  const scannedCount = useRef(-1)
  // (the charring programs, made while the page loads: warmCharring)
  const charWarm = useRef(false)
  useFrame(() => { if (!charWarm.current) charWarm.current = warmCharring(root, (id) => id in roast.times) })
  const scan = () => {
    const known = new Set(pieces.current.map((p) => p.node))
    for (const obj of root.children) {
      const id = (obj.userData.itemId as string | undefined) ?? baseName(obj.name)
      if (!(id in roast.times) || known.has(obj)) continue
      const mats: Piece['mats'] = []
      // (where Dish has it standing at home: the scene's cached, so after a remount it may be anywhere, on a plate)
      const home = obj.userData.home as { p: THREE.Vector3; q: THREE.Quaternion } | undefined
      if (home) {
        obj.position.copy(home.p)
        obj.quaternion.copy(home.q)
      }
      // (a skewer stood more upright in the ash, once (the owner's, 2026-11-13: in a rush the fire "blew up": seen from above, as he
      // looks at it, every skewer's top leant in over the coals (the model's: its foot 0.76 out, its top 0.42), so the food of all of
      // them heaped up over the middle; now its top 0.64 out, the food round the fire, each in its own place): turned about its foot, the
      // lowest point of its rod, about the level line square to its bearing)
      if (!roast.loose.includes(id) && !obj.userData.stoodUp) {
        obj.userData.stoodUp = true
        obj.updateWorldMatrix(true, true)
        let low: THREE.Vector3 | null = null
        const v = new THREE.Vector3()
        obj.traverse((m) => {
          const mesh = m as THREE.Mesh
          if (!mesh.isMesh || !(mesh.material as THREE.Material)?.name?.startsWith('BambooSkewer') || mesh.name.endsWith('_outline')) return
          const pos = mesh.geometry.attributes.position
          for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld); if (!low || v.y < low.y) low = v.clone() }
        })
        if (low && obj.parent) {
          const foot = obj.parent.worldToLocal(low as THREE.Vector3)
          const phi = Math.atan2(obj.position.z, obj.position.x)
          const turn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(Math.sin(phi), 0, -Math.cos(phi)), STAND_UP)
          obj.position.sub(foot).applyQuaternion(turn).add(foot)
          obj.quaternion.premultiply(turn)
          if (home) { home.p.copy(obj.position); home.q.copy(obj.quaternion) }
        }
      }
      const looks: Looks = { uChar: { value: 0 }, uSear: { value: 0 }, uSalt: { value: 0 }, uSoy: { value: 0 }, uMilk: { value: 0 },
        uPeanut: { value: 0 }, uMiso: { value: 0 }, uGreen: { value: 0 }, uRed: { value: 0 }, uLemon: { value: 0 },
        uCookA: { value: 0 }, uCookB: { value: 0 }, uOil: { value: 0 }, uSide: { value: new THREE.Vector3(1, 0, 0) } }
      pieces.current.push({
        key: obj.uuid, id, copy: (obj.userData.copy as number | undefined) ?? 0, loose: roast.loose.includes(id),
        node: obj, homeP: obj.position.clone(), homeQ: faceCamera(id, obj), homeQ0: obj.quaternion.clone(),
        progress: 0, lead: 0, turned: false, turnT: 0, sideSet: false, wasDone: false, collected: false,
        flight: 0, fromP: new THREE.Vector3(), fromQ: new THREE.Quaternion(), toP: new THREE.Vector3(),
        toQ: new THREE.Quaternion(), mats, looks, bites: newBites(), sticks: [], food: [], puffs: [], stickOnly: false,
        netSpot: null, awaitBoss: 0, container: null, local: new THREE.Vector3(), carried: false, trash: -1,
        dabs: { salt: 0, soy: 0, milk: 0, peanut: 0, miso: 0, wasabi: 0, shichimi: 0, yuzu: 0, lemon: 0, water: 0 }, steps: [], staged: false, stagedAt: 0, fresh: false, wasPresent: false, homeFlight: 1,
        unwrapped: false, unwrapT: 0, chefSeasoned: false,
        trashFrom: new THREE.Vector3(),
        landed: -1,
        body: null, slot: null, eat: 0, eaten: false, guest: -1, seat: -1, want: null,
      })
    }
    scannedCount.current = root.children.length
  }

  /**
   * A skewer whose food is flat (a pair of curled shrimp) turns on its stick to show its broad side to the
   * camera wherever it stands on the ring, the way a cook sets it facing the diners; others keep their turn.
   */
  function faceCamera(id: string, obj: THREE.Object3D) {
    const q = obj.quaternion.clone()
    if (!roast.faceCamera?.includes(id)) return q
    const stick = new THREE.Vector3(1, 0, 0).applyQuaternion(q)
    // (the food's broad face: Blender's local Y, which the glTF export turns into local Z)
    const side = new THREE.Vector3(0, 0, 1).applyQuaternion(q)
    const toCam = FACE_CAMERA.clone().sub(obj.position)
    toCam.addScaledVector(stick, -toCam.dot(stick)).normalize()
    side.addScaledVector(stick, -side.dot(stick)).normalize()
    const angle = Math.atan2(new THREE.Vector3().crossVectors(side, toCam).dot(stick), side.dot(toCam))
    return q.premultiply(new THREE.Quaternion().setFromAxisAngle(stick, angle))
  }

  /**
   * Each piece browns and chars on its own, so it gets its own copies of its materials. Dish swaps in the toon
   * materials in an effect that can land after our first frame, so keep trying until they're there.
   */
  const bindMaterials = (p: Piece) => {
    if (p.mats.length) return
    const meshes: THREE.Mesh[] = []
    // (not the one ink line round another portion's parts, copied with its node (inkOneLine makes this piece's own): it isn't toon, and a second
    // portion of a whole fish was never bound, its rod never made the standard one nor pulled, drawn as large as the fish (the owner's, a week))
    p.node.traverse((o) => {
      if (o instanceof THREE.Mesh && !o.name.endsWith('_outline') && !o.userData.oneInk) meshes.push(o)
    })
    if (!meshes.length || !meshes.every((m) => m.material instanceof THREE.MeshToonMaterial)) return
    const rand = seeded(p.key)
    // every piece its own shade: a touch lighter or darker, warmer or cooler, than the next
    const shade = { h: (rand() - 0.5) * 0.05, s: (rand() - 0.5) * 0.2, l: (rand() - 0.5) * 0.12 }
    for (const m of meshes) {
      const mat = (m.material as THREE.MeshToonMaterial).clone()
      // Potatoes roast inside foil ("Foil…") with their skin whole ("…Top" is the cap); served, the foil is shown
      // opened out ("Wrapper…") and the cap broken off to show the flesh. Foil doesn't brown or char.
      const foil = mat.name.startsWith('Foil') || mat.name.startsWith('Wrapper')
      const eye = /^Fish(Eye|Pupil)/.test(mat.name)
      const show = mat.name.startsWith('Wrapper') ? 'open' : foil || mat.name.endsWith('Top') ? 'closed' : undefined
      if (!foil) {
        // bites come out of the food only: the bamboo stick is never eaten (it gets bites that stay empty)
        const stick = mat.name.startsWith('BambooSkewer')
        const bites = stick ? newBites() : p.bites
        addCharring(mat, eye ? EYE_LOOKS : p.looks, bites)
        for (const c of m.children) if (c instanceof THREE.Mesh && c.name.endsWith('_outline')) biteOutline(c, bites)
        if (!eye) mat.color.offsetHSL(shade.h, shade.s, shade.l)
      } else {
        // no two sheets of foil crumple alike: give this one its own folds, sheen and grey
        crumpleFoil(m, rand)
        mat.normalScale.multiplyScalar(0.6 + rand() * 1.0)
        mat.color.multiplyScalar(0.9 + rand() * 0.14)
      }
      if (!BASE_MATERIAL.has(m)) BASE_MATERIAL.set(m, m.material)
      m.material = mat
      p.mats.push({ mat, mesh: m, base: mat.color.clone(), emissive: mat.emissive.clone(), foil, show, eye })
      if (mat.name.startsWith('BambooSkewer')) {
        // (every rod the one iron skewer, whatever the model made it)
        // (the way out from the fire, in the rod's own frame: from its place's bearing round the hearth, brought back through the piece's turn and
        // size and the rod's own turn in it)
        const sc = (p.node.userData.home?.s as THREE.Vector3 | undefined) ?? ONE
        const phi = Math.atan2(p.homeP.z, p.homeP.x)
        const outward = new THREE.Vector3(Math.cos(phi), 0, Math.sin(phi)).applyQuaternion(p.homeQ0.clone().invert()).divide(sc)
          .applyQuaternion(m.quaternion.clone().invert()).normalize()
        // (and the way up, there: which of its ends is down in the hearth)
        const upIn = new THREE.Vector3(0, 1, 0).applyQuaternion(p.homeQ0.clone().invert()).divide(sc).applyQuaternion(m.quaternion.clone().invert()).normalize()
        const rod = standardStick(m.geometry, sc, m.quaternion, outward, upIn, ROD_LEN.get(p.id) ?? ROD_LEN.set(p.id, rodReach(m, p.node, upIn, sc)).get(p.id)!)
        m.geometry = rod.geo
        for (const c of m.children) if (c instanceof THREE.Mesh && c.name.endsWith('_outline')) c.geometry = rod.geo
        p.stickMid = rod.mid.clone().applyQuaternion(m.quaternion).add(m.position)
        // (where it sits through the food, and the way out by its loop end: pulled, it slides out of the food that way (the owner's, 2026-11-12:
        // drawn out, not shrunk away))
        m.userData.rodHome = m.position.clone()
        m.userData.rodOut = rod.out.clone().applyQuaternion(m.quaternion)
        p.sticks.push(m)
      }
      else p.food.push(m)
      if (m.morphTargetInfluences?.length) p.puffs.push(m)
    }
    inkOneLine(p)
  }

  const present = (p: Piece) => !menuIds.has(p.id) || p.copy < (quantities[p.id] ?? 0)
  /** the fire's heat now (what's cooked by, heard, glowing, too hot): App's, rising as fresh charcoal catches; with none given, the bed's */
  const heatOf = () => (heat ?? fire)?.current ?? 0.55

  /**
   * 美味 (0..100): how good it is to eat right now. Doneness first — raw is poor, done is best (a touch past done
   * is better still), past that it dries out and burnt is bad — then each seasoning by how well it suits the
   * food, and a splash of water makes it soggy.
   */
  const tasteOf = (p: Piece) => {
    const r = p.progress / roast.times[p.id]
    let t = r < 0.5 ? 10 + r * 20
      : r < 1 ? 20 + (r - 0.5) * 70
      : r < 1.3 ? 55 + (r - 1) * 30
      : r < 2.2 ? 64 - (r - 1.3) * 26
      : 12
    for (const k of DABS) {
      const n = p.dabs[k]
      if (!n) continue
      const w = PAIRING[k][p.id] ?? PAIRING_DEFAULT[k]
      // one dab in full, a second a little more, then it's too much
      const amount = n === 1 ? 1 : n === 2 ? 1.4 : 1.4 - (n - 2) * 0.9
      t += w > 0 ? w * amount : w * n
      // and put on at the wrong time (soy early, so it burns; lemon cooked; salt sprinkled at the end) it loses some
      const first = p.steps.find((x) => x.k === k)
      if (first) t -= timingLoss(k, first.at)
    }
    t -= p.dabs.water * 6
    return Math.round(THREE.MathUtils.clamp(t, 0, 100))
  }

  /** how a piece lies on a plate or the tray: loose ones on their bottom, skewers flat with the food face up */
  const flatQ = (p: Piece, out: THREE.Quaternion, dir = LAY_DIR) => {
    if (p.loose) {
      const z = new THREE.Vector3().crossVectors(dir, UP)
      return out.setFromRotationMatrix(new THREE.Matrix4().makeBasis(dir, UP, z))
    }
    const phi = Math.atan2(p.homeP.z, p.homeP.x)
    const outward = new THREE.Vector3(Math.cos(phi), 0, Math.sin(phi))
    const stick = new THREE.Vector3(-(STICK_FOOT_R - STICK_TOP_R) * Math.cos(phi), STICK_TOP_Y,
      -(STICK_FOOT_R - STICK_TOP_R) * Math.sin(phi)).normalize()
    const face = outward.addScaledVector(stick, -outward.dot(stick)).normalize()
    const from = new THREE.Matrix4().makeBasis(stick, face, new THREE.Vector3().crossVectors(stick, face))
    const to = new THREE.Matrix4().makeBasis(dir, UP, new THREE.Vector3().crossVectors(dir, UP))
    const turn = new THREE.Quaternion().setFromRotationMatrix(to.multiply(from.transpose()))
    return out.copy(p.homeQ0).premultiply(turn)
  }

  /** the tray where ordered food waits raw: where it is, and the n-th spot on it */
  // (where each thing stands, kept off the hearth's frame as it's dragged and as it's first set out: the hearth grew, and things set out
  // round the old one would sit on its frame)
  const trayAt = () => { const v = new THREE.Vector3(...(roast.tray ?? [0, 0, 0])).add(nudge('tray')); clearOfHearth(v, 0.04, TRAY_W, TRAY_D); return v }
  // skewers lie along the tray's long side, in a row from back to front, then a few laid on top in the gaps between them (TRAY_CAP)
  /** loose food (potatoes, rice balls, mochi) waits in a row along the back of the tray, clear of the sticks (LOOSE_CAP) */
  const trayLooseSpot = (n: number) => trayAt()
    .addScaledVector(STACK_DIR, ((n % LOOSE_CAP) - 3) * 0.2)
    .addScaledVector(LAY_DIR, -(TRAY_D / 2 - 0.13))
    .add(new THREE.Vector3(0, 0.07, 0))
  const traySpot = (n: number) => {
    // (two columns, the left one filled first, five rows each from back to front)
    const col = n >= TRAY_ROWS ? 1 : 0
    const row = n % TRAY_ROWS
    return trayAt()
      .addScaledVector(LAY_DIR, 0.04 + (row - (TRAY_ROWS - 1) / 2) * (TRAY_D - 0.34) / (TRAY_ROWS - 1))
      .addScaledVector(STACK_DIR, (col - 0.5) * TRAY_COL)
      .add(new THREE.Vector3(0, 0.07, 0))
  }

  /**
   * Plate n of the run. They go around the fire at the first plate's distance: the 2nd to its front-right, the
   * rest round the back (so none sits between the camera and the fire); a full lap moves out a ring.
   */
  // plates, side dishes and the basket can be dragged about the table: how far each has been moved
  const moved = useRef(new Map<string, THREE.Vector3>())
  const [, setMoveTick] = useState(0)
  const nudge = (key: string) => moved.current.get(key) ?? ZERO
  // empty plates and dishes can be stacked, any on any: what each one sits on (its nudge then carries the lift too)
  const stackOn = useRef(new Map<string, string>())
  const STACKABLE = (k: string) => /^(plate|dish)-\d+$|^rawdish$/.test(k)
  const stackRoot = (k: string) => {
    let r = k
    for (let i = 0; i < 20 && stackOn.current.has(r); i++) r = stackOn.current.get(r)!
    return r
  }
  const sameStack = (a: string, b: string) => stackRoot(a) === stackRoot(b)
  /** the one on top of whatever stack this is in */
  const stackTop = (k: string) => {
    let t = k
    for (let i = 0; i < 20; i++) {
      const up = [...stackOn.current].find(([, under]) => under === t)?.[0]
      if (!up) break
      t = up
    }
    return t
  }
  /** how far above its own foot the next one stacked on this container rests */
  const stackStep = (k: string) => (k.startsWith('plate') ? 0.075 : 0.05)
  /** whether anything is lying on (or in) this container */
  const holds = (k: string) => pieces.current.some((q) => q.container === k && present(q) && !q.eaten)

  const plateAt = (n: number) => atHome(`plate-${n}`, clearSpot('plate', n, PLATE_R, (m) => {
    // (as many as are needed go round the fire on the table's top, the first where the others start)
    const [x, y, z] = PLATE_TOP
    const r0 = Math.hypot(x, z)
    const a0 = Math.atan2(z, x)
    const step = 2 * Math.asin(Math.min(1, (PLATE_STEP / 2) / r0))     // angle between neighbouring plates
    const order = [0, 1, -1, -2, -3, -4, -5]                             // in steps, from the first plate
    const lap = Math.floor(m / order.length)
    const a = a0 + order[m % order.length] * step + lap * step / 2
    const r = r0 + lap * PLATE_STEP
    const v = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r)
    clearOfHearth(v, PLATE_R)
    return v
  }))
  /**
   * Where the n-th of a row of spots (`spot(m)`, the m-th of them) is that's clear of all that stands on the table and on it, not off its
   * edge: a plate or a dish set out goes there (the owner saw grilled food on a plate half under the bucket: the plates went round the fire
   * one after another whatever stood there). Worked out again only every half second (nothing on the table moves faster).
   */
  const spotCache = useRef(new Map<string, { t: number; v: THREE.Vector3 }>())
  const clearSpot = (kind: string, n: number, r: number, spot: (m: number) => THREE.Vector3) => {
    const key = `${kind}-${n}`, now = performance.now()
    const hit = spotCache.current.get(key)
    if (hit && now - hit.t < 500) return hit.v.clone()
    const things = standing()
    const a0 = COOK_TABLE.along[0] - FIRE_SHIFT.dot(ALONG) + r + 0.16, a1 = COOK_TABLE.along[1] - FIRE_SHIFT.dot(ALONG) - r - 0.16
    const l0 = COOK_TABLE.lay[0] - FIRE_SHIFT.dot(LAY) + r + 0.16, l1 = COOK_TABLE.lay[1] - FIRE_SHIFT.dot(LAY) - r - 0.16
    let free = -1, v = spot(n)
    for (let m = 0; m < 48; m++) {
      const c = spot(m)
      const a = c.dot(ALONG), l = c.dot(LAY)
      if (a < a0 || a > a1 || l < l0 || l > l1) continue
      if (overSousBay(a + FIRE_SHIFT.dot(ALONG), l + FIRE_SHIFT.dot(LAY), r)) continue
      if (things.some((t) => Math.hypot(t.p.x - c.x, t.p.z - c.z) < t.r + r * 0.85)) continue
      if (++free === n) { v = c; break }
    }
    spotCache.current.set(key, { t: now, v })
    return v.clone()
  }
  /** what stands on the table that a plate or a dish set out mustn't go under or into: the bucket, the bin, the tray, the lantern, the
   * baskets, the rice balls' dish, the tasting bowl, the crate (round footprints) */
  const standing = () => {
    const out: { p: THREE.Vector3; r: number }[] = []
    const keys = ['tray', 'lantern', 'bowl-0', ...(carriers.bin ? ['bin'] : []), ...(roast.trash ? ['trash'] : []), ...(roast.rawDish ? ['rawdish'] : []),
      ...(roast.basket ? Array.from({ length: basketCount }, (_, n) => `basket-${n}`) : [])]
    for (const k of keys) out.push(...circlesOf(k, containerAt(k)))
    out.push({ p: new THREE.Vector3(DECOR.crate.at[0], 0, DECOR.crate.at[1]), r: DECOR.crate.r })
    // (and the miso soup and the sake taken out to try, at the table's right end (menu.ts's layout.first))
    root.traverse((o) => {
      const id = o.userData.itemId as string | undefined
      if (id && roast.drinks?.includes(id) && o.visible && o.scale.x > 0.01) out.push({ p: o.position.clone(), r: id === 'Sake' ? 0.22 : 0.19 })
    })
    return out
  }
  const boxPlaced = useRef(false)
  const [plateCount, setPlateCount] = useState(1)
  const carriedOut = useRef(false)
  const shattered = useRef(new Set<string>())
  // charcoal added is thrown in: a few sticks leave the hand (or the crate), fly in an arc, land on the heap, bounce, tip and lie
  // where they land, a burst of sparks and ash where each strikes. Each stick starts black and kindles on its own, over some
  // seconds, to red-hot (its glow reddening, its face going ashy grey), as binchotan does
  type Coal = { g: THREE.Object3D; mat: CoalLook; x: number; y: number; z: number; vx: number; vz: number; vy: number; rx: number; rz: number; ry: number
    sx: number; sz: number; settled: boolean; top: number; delay: number; heat: number; bounced: boolean
    /** how hard it was thrown (0 dropped gently .. 1 flung): how high it bounces; and a hop it's been jolted into by another landing hard by it */
    force?: number; hopY?: number; hopV?: number
    /** seconds since it landed, whether it's burnt out, and how long it's been going out when it's pushed out by the new */
    age: number; gone: boolean; dying: boolean; dyT: number
    /** one of the newest the fire's level keeps burning (game/coalPile's glowingFor): it doesn't go to ash while it is */
    held?: boolean
    /** where it lies in plan (its landing), the way it points, how steeply it tips, and the pose it settles to */
    tx: number; tz: number; yaw: number; slope: number; lx: number; lz: number; ly: number; qEnd: THREE.Quaternion
    /** which of the six sticks it is, and its size against the model's (its pose is `g`: the fire's drawn instanced, coalLayer) */
    shape: number; wide: number; long: number }
  const coals = useRef<Coal[]>([])
  /** whether the bed has been laid with its first sticks */
  const bedSeeded = useRef(false)
  // (the same sticks as the crate's, from Blender (blender/binchotan.py): each thrown one its own of the six, its own length and thickness)
  const bin = useBinchotan()
  /** a stick from the crate: one of the six, its own length and thickness */
  const stickSize = () => ({ shape: Math.floor(Math.random() * 6), wide: (0.03 + Math.random() * 0.006) / MODEL_R, long: (0.28 + Math.random() * 0.12) / MODEL_LEN })
  // (the sticks on the fire and the crumbs they break into, all drawn by a few instanced meshes: their poses and looks written in each frame)
  const coalDraw = useMemo(() => coalLayer(bin), [bin])
  useEffect(() => () => coalDraw.dispose(), [coalDraw])
  /** the pieces of sticks that burnt through and broke: falling onto what's under them, lying there as grey ash a while, then gone */
  type Crumb = { id: number; shape: number; sy: number; mat: CoalLook; x: number; y: number; z: number; ty: number; vy: number; q: THREE.Quaternion; age: number; m: THREE.Object3D }
  const crumbs = useRef<Crumb[]>([])
  const crumbSeq = useRef(0)
  /** a stick burnt through gives way: it's gone from the heap (what lay on it comes down) and its pieces fall */
  const breakStick = (c: Coal) => {
    c.gone = true
    if (c.g) c.g.visible = false
    const below: Lay[] = []
    for (const o of coals.current) if (o && o !== c && !o.gone && !o.dying && o.top < c.top + 0.01) below.push({ x: o.tx, z: o.tz, yaw: o.yaw, y: o.top, slope: o.slope })
    const parts = crumble({ x: c.tx, z: c.tz, yaw: c.yaw, y: c.top, slope: c.slope }, below, Math.random, PIT_LIFT)
    const made = parts.map((p) => {
      // (burnt through: grey ash, granular, the pieces' shapes but the ash's own face)
      const mat = coalLook()
      // (lying on its side the way it fell, a little askew)
      const q = new THREE.Quaternion().setFromUnitVectors(UP_AXIS, new THREE.Vector3(Math.cos(p.yaw), (Math.random() - 0.5) * 0.4, Math.sin(p.yaw)).normalize())
        .multiply(new THREE.Quaternion().setFromAxisAngle(UP_AXIS, Math.random() * 6))
      const shape = Math.floor(Math.random() * 6), m = new THREE.Object3D()
      m.position.set(p.x, c.y + 0.004, p.z)
      m.quaternion.copy(q)
      return { id: crumbSeq.current++, shape, sy: Math.max(0.02, p.len) / bin.chunkShape(shape).len, mat, x: p.x, y: c.y + 0.004, z: p.z, ty: p.y, vy: 0, q, age: 0, m } as Crumb
    })
    crumbs.current = [...crumbs.current, ...made].slice(-40)
    burst(c.x, c.top, c.z)
    restack()
  }
  // sparks and ash flung up where the sticks land: two little point clouds, each particle with its own life
  const SPARKS = 80
  const sparkPts = useRef<{ x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; ash: boolean; s: number }[]>([])
  const sparkGeo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SPARKS * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(SPARKS * 3), 3)); return g }, [])
  // (the ash's colours carry their alpha (item 242): it fades out into the air; with its colour only, it went to black, grey tiles over the fire)
  const ashGeo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SPARKS * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(SPARKS * 4), 4)); return g }, [])
  const burst = (x: number, y: number, z: number) => {
    for (let i = 0; i < 9; i++) {
      const a = Math.random() * Math.PI * 2, v = 0.15 + Math.random() * 0.35
      // (sparks short-lived, thrown and falling; the ash lifted, lingering as it drifts down (item 242))
      const ash = i % 3 === 0
      sparkPts.current.push({ x, y, z, vx: Math.cos(a) * v, vy: 0.5 + Math.random() * 0.9, vz: Math.sin(a) * v, life: ash ? 1.3 + Math.random() * 0.9 : 0.5 + Math.random() * 0.7, ash, s: Math.random() * 6.28 })
    }
    if (sparkPts.current.length > SPARKS * 2) sparkPts.current.splice(0, sparkPts.current.length - SPARKS * 2)
  }
  /** each stick's pose as it lies in the bed (game/coalPile's bedStick: flat, side by side, the next layer across) */
  const restack = () => {
    for (const c of coals.current) {
      if (!c || c.gone || c.dying) continue
      c.qEnd.setFromUnitVectors(UP_AXIS, new THREE.Vector3(Math.cos(c.yaw), c.slope, Math.sin(c.yaw)).normalize())
    }
  }
  /** a stick that has burnt down to ash: the only kind that's cleared to make room (a burning one isn't pushed out by new charcoal) */
  const ashedOut = (c: Coal) => c.age / COAL_LAST_S > 0.72
  /** the sticks burnt through to ash lying in the bed */
  const ashCount = () => coals.current.filter((c) => c && !c.gone && !c.dying && ashedOut(c)).length
  /** the bed tidied with the irons (item 108): the ash knocked off it, the live coals drawn together (the fire a little up for it) */
  const tidyFire = () => {
    for (const c of coals.current) if (c && !c.gone && !c.dying && ashedOut(c)) c.dying = true
    if (fire && fire.current > 0.02) fire.current = Math.min(1, fire.current + TIDY_GAIN)
  }
  // (for the irons clicked by the player, shut or open: they tidy it themselves once they've been worked over it)
  IRONS.tidy = tidyFire
  /** whether there's room on the bed for more: under the most sticks it holds, or some already ash to be cleared */
  const roomForCoal = () => {
    const alive = coals.current.filter((c) => c && !c.gone && !c.dying)
    return roomFor(alive.length, alive.filter(ashedOut).length, COAL_MAX)
  }
  /** whether one more stick can go on: the bed has room for it, and there's a place on the heap for it to lie (not just a count: a heap piled
   * as high as it goes has none) */
  const canPlaceCoal = () => {
    if (!roomForCoal()) return false
    const lying: Lay[] = []
    for (const c of coals.current) if (c && !c.gone && !c.dying) lying.push({ x: c.tx, z: c.tz, yaw: c.yaw, y: c.top, slope: c.slope })
    return !!bedStick(lying, Math.random, PIT_LIFT, BED_TURN) || coals.current.some((c) => c && !c.gone && !c.dying && ashedOut(c))
  }
  /** charcoal onto the fire: a load (the chef, the button), or `count` sticks (one, dragged from the crate by hand) */
  /** a handful of charcoal: six or seven sticks */
  const coalPortion = () => COAL_PER_ADD.min + Math.floor(Math.random() * (COAL_PER_ADD.max - COAL_PER_ADD.min + 1))
  const dropCoals = (from?: { x: number; y: number; z: number }, count?: number, force = 0) => {
    // (only as many as the bed has room for: the most it holds, less those still burning; ones burnt to ash are cleared to make room)
    const aliveNow = coals.current.filter((c) => c && !c.gone && !c.dying)
    const n = Math.min(count ?? COAL_PER_ADD.min + Math.floor(Math.random() * (COAL_PER_ADD.max - COAL_PER_ADD.min + 1)), COAL_MAX - aliveNow.length + aliveNow.filter(ashedOut).length)
    if (n <= 0) return 0
    const base = coals.current.length
    // (a bed only holds so many sticks: when the new ones would take it past the most, the oldest burn out at once, shrinking away)
    const alive = coals.current.filter((c) => c && !c.gone && !c.dying)
    for (const c of alive.filter(ashedOut).slice(0, Math.max(0, alive.length + n - COAL_MAX))) c.dying = true
    // (always out of the crate of binchotan, whether it's clicked or a stick let go over the fire: thrown from there across the table)
    const crateAt = positionOf('crate')
    const start = from ?? { x: DECOR.crate.at[0] + crateAt[0], y: 0.34 + crateAt[1], z: DECOR.crate.at[1] + crateAt[2] }
    const lying: Lay[] = []
    for (const c of coals.current) if (c && !c.gone && !c.dying) lying.push({ x: c.tx, z: c.tz, yaw: c.yaw, y: c.top, slope: c.slope })
    let placed = 0
    for (let k = 0; k < n; k++) {
      // (each laid in its own place in the bed, one after another, from the middle out, as a robatayaki's binchotan is laid (item 211: they
      // were stood up in rings, a campfire under the net); when every place is taken, the oldest stick that's burnt to ash is cleared to make
      // one, and when even that leaves none, the rest stay in the crate)
      let spot = bedStick(lying, Math.random, PIT_LIFT, BED_TURN)
      for (let tries = 0; !spot && tries < 3; tries++) {
        const oldest = coals.current.find((c) => c && !c.gone && !c.dying && ashedOut(c))
        if (!oldest) break
        oldest.dying = true
        const at = lying.findIndex((l) => l.x === oldest.tx && l.z === oldest.tz)
        if (at >= 0) lying.splice(at, 1)
        spot = bedStick(lying, Math.random, PIT_LIFT, BED_TURN)
      }
      if (!spot) break
      const { x: tx, z: tz, yaw, rest } = spot
      // (laid straight into its place in the bed)
      const ly = rest.y
      lying.push({ x: tx, z: tz, yaw, y: rest.y, slope: rest.slope })
      // (the charcoal as it came from the crate; the cracks light up only as it heats (the emissive map))
      const mat = coalLook(), g = new THREE.Object3D()
      g.visible = false
      coals.current[base + k] = { g, mat, x: start.x + (Math.random() - 0.5) * 0.06, y: start.y, z: start.z + (Math.random() - 0.5) * 0.06, vx: 0, vz: 0, vy: 0,
        rx: Math.random() * 3, rz: Math.random() * 3, ry: Math.random() * 6, sx: (Math.random() - 0.5) * 14 * (1 + 1.5 * force), sz: (Math.random() - 0.5) * 14 * (1 + 1.5 * force), force,
        settled: false, top: rest.y, delay: k * 0.11 + Math.random() * 0.05, heat: 0, bounced: false, age: 0, gone: false, dying: false, dyT: 0,
        tx, tz, yaw, slope: rest.slope, lx: spot.from.x, lz: spot.from.z, ly, qEnd: new THREE.Quaternion(), ...stickSize() }
      placed++
    }
    if (!placed) return 0
    restack()
    // (the flight to each one's place: about two thirds of a second)
    for (let k = 0; k < placed; k++) {
      // (thrown harder, it gets there sooner, flatter and faster)
      const c = coals.current[base + k], T = (0.5 + Math.random() * 0.25) * (1 - 0.55 * force)
      c.vx = (c.lx - c.x) / T
      c.vz = (c.lz - c.z) / T
      c.vy = (c.ly - c.y + 0.5 * 9.8 * T * T) / T
    }
    return placed
  }
  // (the fire bar's button, in App: a portion out of the crate, as many as the bed takes; it pays for those)
  useEffect(() => {
    if (!active || !bar) return
    COAL_BRIDGE.place = () => (fire && fire.current >= 1 - 1e-6 ? 0 : dropCoals(undefined, Math.min(SUPPLIES.coal(), coalPortion())))
    return () => { COAL_BRIDGE.place = null }
  })
  if (import.meta.env?.DEV && typeof window !== 'undefined') Object.assign(window, { __dropCoals: dropCoals, __fire: fire, __coals: coals, __pieces: pieces })
  const [shards, setShards] = useState<{ id: number; x: number; y: number; z: number; s: number; r: number; t: number }[]>([])
  /** the kitchen's floor, where a dish let go off the table lands (the scene's y) */
  const FLOOR_Y = GRILL_OFFSET.y - KITCHEN_DROP
  const LIFT = 0.25
  /** whether a place (the scene's x, z) is off the cook's table (past its edges, less the thing's own radius) */
  const outsideTable = (at: THREE.Vector3, r: number) => {
    const a = at.dot(ALONG) + FIRE_SHIFT.dot(ALONG), l = at.dot(LAY) + FIRE_SHIFT.dot(LAY)
    // (and over the notch cut into its front: nothing to stand on there)
    const inNotch = (a > COOK_NOTCH.along[0] + 0.05 && a < COOK_NOTCH.along[1] - 0.05 && l > COOK_NOTCH.lay[0] + 0.05)
      || (a > SOUS_NOTCH.along[0] + 0.05 && l > SOUS_NOTCH.lay[0] + 0.05 && l < SOUS_NOTCH.lay[1] - 0.05)
    return inNotch || a < COOK_TABLE.along[0] - 0.05 || a > COOK_TABLE.along[1] + 0.05 || l < COOK_TABLE.lay[0] - 0.05 || l > COOK_TABLE.lay[1] + 0.05 - 0 * r
  }
  /** a container at home, moved by its nudge (no spare plates or dishes stacked on the table any more: they're all in the dish cabinet, but
   * for the tasting bowl; a plate or a side dish is on the table only while something's on it) */
  function atHome(key: string, home: THREE.Vector3) {
    return home.clone().add(nudge(key))
  }
  const bowlAt = () => { const v = new THREE.Vector3(...BOWL_TOP).add(nudge('bowl-0')); clearOfHearth(v, BOWL_R); return v }
  const basketAt = (n: number) => {
    // (the first stands at the table's left end; more, as they're needed, stand on the table's top in a row, as far apart as they're big)
    const [x, y, z] = n === 0 ? roast.basket!.at : BASKET_TOP
    return new THREE.Vector3(x, y, z).addScaledVector(LAY_DIR, -Math.max(0, n - 1) * BASKET_STEP * basketScale()).add(nudge(`basket-${n}`))
  }
  /** how many one basket holds at its size (its floor's area: the menu's capacity at its size as made); more go in another set down beside it */
  const basketHolds = () => Math.max(4, Math.round((roast.basket?.capacity ?? 10) * basketScale() ** 2))
  /** where a container (plate-n, dish-n, basket-n, the seasoning box, the bin) is now */
  const containerAt = (key: string): THREE.Vector3 => {
    const [kind, n] = key.split('-')
    if (kind === 'box' || kind === 'bin') return (carriers[kind]?.[0]?.home.clone() ?? new THREE.Vector3()).add(nudge(kind))
    if (kind === 'tray') return trayAt()
    if (kind === 'bar') return BAR_AT_SCENE.clone()
    if (kind === 'lantern') return new THREE.Vector3(DECOR.lantern.at[0], 0, DECOR.lantern.at[1]).add(nudge('lantern'))
    if (kind === 'trash') return new THREE.Vector3(...(roast.trash ?? [0, 0, 0])).add(nudge('trash'))
    if (kind === 'rawdish') return atHome('rawdish', new THREE.Vector3(...(roast.rawDish?.at ?? [0, 0, 0])))
    if (kind === 'bowl') return bowlAt()
    // (the plating place's frame is the room's: in the fire's own, FIRE_SHIFT back, as the plates there are (readyFoodAt); without it the box
    // stood off the table's corner, half over the floor, what was packed into it hanging out over the bin (the owner's "brown block"))
    // (on the serving counter once it's found (item 167): in a plate at the plating place's second slot, it was)
    if (kind === 'takeout') return SERVE_COUNTER.at ? barToFire(SERVE_COUNTER.at) : new THREE.Vector3().addScaledVector(ALONG, TAKEOUT_SPOT.along).addScaledVector(LAY, TAKEOUT_SPOT.lay).sub(FIRE_SHIFT)
    return kind === 'plate' ? plateAt(+n) : kind === 'dish' ? dishAt(+n) : basketAt(+n)
  }
  /** where the fan hangs: from its peg past the ledge's left end, its paper's middle below it (Decor turns it to face the cook) */
  const fanAt = () => containerAt('box').addScaledVector(ALONG, FAN_PEG.along).add(new THREE.Vector3(0, FAN_PEG.up - FAN_DROP, 0))
  const footprint = (key: string) => {
    const kind = key.split('-')[0]
    return { plate: PLATE_R, dish: DISH_R, basket: BASKET_R * basketScale(), box: BOX_R, bin: BIN_R, tray: 0.6, trash: TRASH_R, rawdish: DISH_R, bowl: BOWL_PUSH, lantern: DECOR.lantern.r }[kind] ?? 0.3
  }
  /** a container's footprint as circles: one for most, three in a row along the long tray */
  const circlesOf = (key: string, at: THREE.Vector3) => key === 'tray'
    ? [-1, 0, 1].map((k) => ({ p: at.clone().addScaledVector(STACK_DIR, k * (TRAY_W - TRAY_D) / 2), r: TRAY_D / 2 + 0.02 }))
    : [{ p: at.clone(), r: footprint(key) }]
  /** everything standing on the table that can be moved, for bumping into */
  const containerKeys = () => [
    ...Array.from({ length: plateCount }, (_, n) => `plate-${n}`),
    ...(roast.dish ? Array.from({ length: dishCount }, (_, n) => `dish-${n}`) : []),
    ...(roast.basket ? Array.from({ length: basketCount }, (_, n) => `basket-${n}`) : []),
    ...Object.keys(carriers),
    ...(roast.tray ? ['tray'] : []),
    ...(roast.trash ? ['trash'] : []),
    ...(roast.rawDish ? ['rawdish'] : []),
    'bowl-0',
    'lantern',
  ]
  /**
   * Keep a moved container from passing through things: out of the stone ring, and clear of every other
   * plate, dish, basket, the box and the bin (round footprints, pushed apart until they just touch).
   */
  const settle = (key: string, at: THREE.Vector3, stacking = false, byHand = true) => {
    // (the ledge is fixed to the hearth: nothing pushes it, and it pushes nothing (it's up off the table, over the cook's place))
    if (FIXED.has(key)) return at
    const r = footprint(key)
    // (what it's stacked with doesn't push it away; nor, while an empty one is carried, other empty ones it could go on)
    const others = containerKeys().filter((k) => k !== key && (!FIXED.has(k) || (byHand && FIXED_ON_TOP.has(k))) && !sameStack(k, key) && !(stacking && STACKABLE(k) && !holds(k)))
      .flatMap((k) => circlesOf(k, containerAt(k)))
    // the crate (the fan hangs on its hook, up off the table)
    for (const d of [DECOR.crate, DECOR.rice]) others.push({ p: new THREE.Vector3(d.at[0], 0, d.at[1]), r: d.r })
    // the bar behind the fire (shop open) is in the way too
    if (bar) for (const c of GRILL_COUNTERS) for (let k = -2; k <= 2; k++) others.push({ p: toGrillScene(c.at.clone().addScaledVector(c.along, k * c.length / 4.5)).sub(FIRE_SHIFT), r: 0.42 * GRILL_SCALE })
    // the soup bowls on the table are in the way too
    root.traverse((o) => {
      const id = o.userData.itemId as string | undefined
      if (id && roast.drinks?.includes(id) && o.visible && o.scale.x > 0.01) others.push({ p: o.position.clone(), r: id === 'Sake' ? 0.22 : 0.19 })
    })
    // (what's kept in the cubbies under the top isn't in the way of anything on it)
    for (let k = others.length - 1; k >= 0; k--) if (others[k].p.y < -0.1) others.splice(k, 1)
    for (let i = 0; i < 8; i++) {
      // (nothing on the table's drawn-in end hangs over the side counter's lip: kept a plank in from it)
      // (the seasoning box, with its pots, reaches further than its round footprint: held a little further in)
      const edge = COOK_TABLE.along[0] - FIRE_SHIFT.dot(ALONG) + r + 0.16 + (key === 'box' ? 0.1 : 0)
      const here = at.dot(ALONG)
      if (here < edge) at.addScaledVector(ALONG, edge - here)
      // (nor hanging over the table's right-hand end, its back or its front)
      const farEnd = COOK_TABLE.along[1] - FIRE_SHIFT.dot(ALONG) - r - 0.16
      if (here > farEnd) at.addScaledVector(ALONG, farEnd - here)
      const across = at.dot(LAY)
      const acrossMax = COOK_TABLE.lay[1] - FIRE_SHIFT.dot(LAY) - r - 0.16, acrossMin = COOK_TABLE.lay[0] - FIRE_SHIFT.dot(LAY) + r + 0.16
      if (across > acrossMax) at.addScaledVector(LAY, acrossMax - across)
      else if (across < acrossMin) at.addScaledVector(LAY, acrossMin - across)
      // (kept off the square hearth: a round thing by its reach, the tray (a long board, square to the table) by its whole length and width)
      // (the tasting bowl by its whole rim, as where it's drawn is worked out: else the two disagree and it creeps a little each time)
      if (key === 'tray') clearOfHearth(at, 0.04, TRAY_W, TRAY_D)
      else clearOfHearth(at, key === 'bowl-0' ? BOWL_R : r)
      // (the tray is long: each of its circles is pushed clear, carrying the whole tray)
      for (const own of circlesOf(key, at)) {
        for (const o of others) {
          const dx = own.p.x - o.p.x
          const dz = own.p.z - o.p.z
          const dd = Math.hypot(dx, dz) || 1e-6
          const min = own.r + o.r + 0.02
          if (dd < min) {
            at.x += (dx / dd) * (min - dd)
            at.z += (dz / dd) * (min - dd)
            own.p.x += (dx / dd) * (min - dd)
            own.p.z += (dz / dd) * (min - dd)
          }
        }
      }
    }
    // (and last of all, never off the table's top, whatever pushed it: the edges are hard)
    {
      const edge = COOK_TABLE.along[0] - FIRE_SHIFT.dot(ALONG) + 0.16
      const a1 = at.dot(ALONG), l1 = at.dot(LAY)
      const aMax = COOK_TABLE.along[1] - FIRE_SHIFT.dot(ALONG) - 0.16
      const lMin = COOK_TABLE.lay[0] - FIRE_SHIFT.dot(LAY) + 0.16, lMax = COOK_TABLE.lay[1] - FIRE_SHIFT.dot(LAY) - 0.16
      if (a1 < edge + r * 0.5) at.addScaledVector(ALONG, edge + r * 0.5 - a1)
      if (a1 > aMax - r * 0.5) at.addScaledVector(ALONG, aMax - r * 0.5 - a1)
      if (l1 < lMin + r * 0.5) at.addScaledVector(LAY, lMin + r * 0.5 - l1)
      if (l1 > lMax - r * 0.5) at.addScaledVector(LAY, lMax - r * 0.5 - l1)
    }
    // (and never left on the hearth: pushed apart from the rest after it was cleared of it, a thing could be shoved back onto it (the
    // owner saw the lantern standing in the fire with many plates out))
    if (key === 'tray') clearOfHearth(at, 0.04, TRAY_W, TRAY_D)
    else clearOfHearth(at, key === 'bowl-0' ? BOWL_R : r)
    return at
  }
  const [basketCount, setBasketCount] = useState(1)
  /** since when the fire's run past HOT_AT (seconds), for the third cook's water */
  const hotSince = useRef<number | null>(null)
  /** when the grill last asked the third cook for charcoal (seconds) */
  const coalAsked = useRef(0)
  // (with the shop open nothing goes in the basket or on the side dishes: it's all served at the bar, unwrapped)
  /** while the shop's closed and the cook's at it by hand, everything that comes off the fire goes into the tasting bowl */
  /** a potato or a sweet potato in its foil: the basket's (roast.basketItems) */
  const isTuber = (p: Piece) => !!roast.basket && !!roast.basketItems?.includes(p.id)
  const inBowl = (p: Piece) => (p.collected ? !!p.container?.startsWith('bowl') : (space !== 'open' && byHandRef.current) || (space === 'open' && !!p.keepWarm && !isTuber(p)))
  // (the shop open, a potato or a sweet potato cooked for nobody is kept warm in the bamboo basket by the fire, not on the tray, for the
  // next customer who orders one (item 553, the owner's 「並看它能有甚麼公用，加入進去」: open, it stood there with nothing to do))
  const inBasket = (p: Piece) => !inBowl(p) && isTuber(p) && (space !== 'open' || (p.collected ? !!p.container?.startsWith('basket') : !!p.keepWarm))
  // onigiri and mochi off the grill net go on little side dishes of their own
  const onDish = (p: Piece) => !inBowl(p) && space !== 'open' && !!roast.dish && !!roast.net?.includes(p.id)
  const dishAt = (n: number) => {
    // (as many as are needed in a row on the table's top, clear of what stands there)
    const [x, y, z] = DISH_TOP
    return atHome(`dish-${n}`, clearSpot('dish', n, DISH_R, (m) => new THREE.Vector3(x, y, z).addScaledVector(STACK_DIR, -Math.max(0, m - 1) * DISH_STEP)))
  }
  const [dishCount, setDishCount] = useState(1)
  // nothing on the table overlaps: every plate, dish, basket, box, bucket, bin and tray is pushed clear of the
  // fire and of each other where it stands — at the start, and whenever another plate or basket is put out
  useLayoutEffect(() => {
    // (the seasoning box starts beside the cook, in the table's corner by where they stand, not out against the counter's edge)
    // (the water bucket on the table's top by the third cook's bay, the trash bin on the floor by the cook's step, whatever was kept from
    // before (the bucket stood on the floor by his other foot, and before that on the table, drawn three times its size))
    const floorY = CHEF_AT.y
    if (carriers.bin) {
      const h = carriers.bin[0].home
      const want = new THREE.Vector3().addScaledVector(ALONG, FLOOR_BUCKET.along - FIRE_SHIFT.dot(ALONG)).addScaledVector(LAY, FLOOR_BUCKET.lay)
      moved.current.set('bin', new THREE.Vector3(want.x - h.x, floorY - h.y, want.z - h.z))
    }
    if (roast.trash) {
      const t = roast.trash
      const want = new THREE.Vector3().addScaledVector(ALONG, FLOOR_TRASH.along - FIRE_SHIFT.dot(ALONG)).addScaledVector(LAY, FLOOR_TRASH.lay)
      moved.current.set('trash', new THREE.Vector3(want.x - t[0], floorY - t[1], want.z - t[2]))
    }
    // (and back on its hearth if it was ever let fall off the table, as it could be before it was fixed in place)
    const ledge = moved.current.get('box')
    if (ledge && (Math.abs(ledge.y) > 1e-4 || outsideTable(containerAt('box'), footprint('box')))) { moved.current.delete('box'); boxPlaced.current = false }
    if (carriers.box && !boxPlaced.current && !moved.current.has('box')) {
      boxPlaced.current = true
      const want = new THREE.Vector3().addScaledVector(ALONG, BOX_SPOT.along).addScaledVector(LAY, BOX_SPOT.lay)
      moved.current.set('box', new THREE.Vector3(want.x - carriers.box[0].home.x, 0, want.z - carriers.box[0].home.z))
    }
    for (let pass = 0; pass < 3; pass++) {
      for (const key of containerKeys()) {
        // (a stack stays where it was put; what's kept in the cubby under the table stays there till it's taken out)
        // (nor the lantern: it's where it was set; what's set out keeps clear of it)
        if (stackOn.current.has(key) || FIXED.has(key) || key === 'tray' || key === 'lantern' || outsideTable(containerAt(key), footprint(key))) continue
        const at = containerAt(key)
        const ok = settle(key, at.clone(), false, false)
        const shift = ok.sub(at)
        shift.y = 0
        if (shift.lengthSq() > 1e-6) moved.current.set(key, nudge(key).clone().add(shift))
      }
    }
    // (and what settle moved is moved on the table: the box with its pots and utensils, the bucket with its dipper)
    for (const [key, nodes] of Object.entries(carriers)) {
      const next = nudge(key)
      for (const b of nodes) b.node.position.copy(b.home).add(next)
      for (const t of tools) {
        if (carrierOf(t.node.name) !== key) continue
        t.home.copy(t.home0).add(next)
        if (t.back >= 1) t.node.position.copy(t.home)
      }
    }
    setMoveTick((t) => t + 1)
    // (settle and friends read the current counts and nudges)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plateCount, dishCount, basketCount, root, space])
  // (with the shop open, everything cooked is served to the customers along the bar behind the fire)
  // (only what a customer ordered: cooked for no one, it stays with the cook, on a plate of their own, not sent off to some seat)
  const ownerOf = (p: Piece) => guests.current.find((g) => (g.state === 'waiting' || g.state === 'eating') &&
    g.orders.filter((o) => o === p.id).length > pieces.current.filter((q) => q !== p && q.guest === g.id && q.id === p.id).length)
  const destination = (p: Piece) => (space === 'open' && (p.container === 'bar' || (!p.collected && ownerOf(p))) ? 'bar' : inBowl(p) ? 'bowl' : inBasket(p) ? 'basket' : onDish(p) ? 'dish' : 'plate')

  /** take this container out of its stack (or what's on it off it), set down clear of the rest */
  const unstack = (key: string) => {
    for (const k of [stackTop(key), key]) {
      if (!stackOn.current.has(k)) continue
      stackOn.current.delete(k)
      const n = nudge(k).clone()
      n.y = 0
      moved.current.set(k, n)
      const base = containerAt(k).sub(n)
      const ok = settle(k, containerAt(k)).sub(base)
      ok.y = 0
      moved.current.set(k, ok)
    }
    setMoveTick((t) => t + 1)
  }
  /**
   * A piece for the plating place put to a slot there: the seat's own, if one's set out for it; else a free one, a plate laid in it off the plating place's stack
   * if the seat's plate isn't out yet (else the piece goes loose, to be added to the plate at the seat). None to be had (no slot free, or no
   * plate stacked there yet: the kitchen's gone for some), false: it stays held where it is, and is asked for again
   */
  /** the kind of plate a seat's order is served on (game/plateSize): its customer's order, sat there just now */
  const plateOfSeat = (seat: number): PlateKind => plateFor(guests.current.find((g) => g.seat === seat && (g.state === 'waiting' || g.state === 'eating'))?.orders ?? [])
  const plateReady = (p: Piece) => {
    let k = PLATING.slots.findIndex((sl) => sl?.seat === p.seat)
    const plated = PLATES_OUT.has(p.seat)
    const free = k < 0 ? PLATING.slots.findIndex((sl) => sl === null) : -1
    if (k < 0 && (free < 0 || (!plated && PLATING.stock <= 0))) return false
    // (item 317, the owner's: onto the tray by the fire first, where its skewer's drawn out, and the floor's server lifts it onto its plate
    // with the tongs when they come for it; a place free there, or it waits by the fire (the tray full of what waits for its plates, the
    // oldest kept warm eaten by the staff to make room for it). Once it's been lifted onto its plate it's that plate's, as it was)
    const viaTray = !p.tonged
    let place = -1
    let eat: Piece | undefined
    if (viaTray) {
      if (p.trayAt !== undefined) place = p.trayAt
      else {
        const warm = pieces.current.filter((q) => q !== p && q.keepWarm && q.collected && !q.eaten && q.slot !== null && q.container?.startsWith('bowl'))
          .sort((a, b) => (a.bowlAt ?? 0) - (b.bowlAt ?? 0))
        const r = trayPlace(trayTaken(p), warm[0]?.slot ?? null)
        if (r.place < 0) return false
        place = r.place
        if (r.eat !== null) eat = warm[0]
      }
    }
    if (k < 0) {
      k = free
      PLATING.slots[k] = { seat: p.seat, plate: !plated, flying: 1, landed: 0, onTray: 0, tongs: false }
      if (!plated) PLATING.stock -= 1
    }
    if (eat) { eat.eaten = true; eat.keepWarm = false; eat.slot = null }
    const row = pieces.current.filter((q) => q !== p && q.via === 'plated' && q.readyAt === k && !q.eaten && q.trash < 0 &&
      !SERVICE.claimed.has(q.key) && !SERVICE.carried.has(q.key)).length
    p.readyAt = k
    if (viaTray) {
      // (where it lies on the tray; kept where it was if it's on it already (its customer gone and another's ordered it): no hop in place)
      const keep = p.trayAt === place
      p.trayAt = place
      trayFoodAt(place, p.toP)
      if (keep && Math.hypot(p.node.position.x - p.toP.x, p.node.position.z - p.toP.z) < 0.02) p.flight = 1
    }
    // (a plate under it always: the seat's own, or for a later dish (the seat's plate gone out) a carrier dish (GuestBar3D's), never the bare
    // table (the owner saw a skewer lying on the wood))
    else p.toP.copy(readyFoodAt(k, row, true, plateOfSeat(p.seat)))
    p.local.copy(p.toP).sub(containerAt('bar'))
    return true
  }
  /** (item 317) where a piece lies on the open shop's tray: its place in the bowl's one row (game/plates' bowlPlace), on the rack */
  const trayFoodAt = (place: number, out = new THREE.Vector3()) => {
    const b = bowlAt()
    return out.copy(b).add(TRAY_OFF).addScaledVector(STACK_DIR, bowlPlace(place).across).setY(b.y + TRAY_REST)
  }
  /** (item 317) the tray's places in use (but `but`'s own): what waits there for its plate, and (in the same row) what's kept warm on it */
  const trayTaken = (but?: Piece) => {
    const out: number[] = []
    for (const q of pieces.current) {
      if (q === but || q.eaten || q.trash >= 0) continue
      if (q.trayAt !== undefined) out.push(q.trayAt)
      else if (q.keepWarm && q.collected && q.slot !== null && q.container?.startsWith('bowl')) out.push(q.slot)
    }
    return out
  }
  /**
   * The tongs by the tray (item 317), each frame: lying beside it, or in the floor's server's hand while they're at the plating place for a
   * plate: to a piece of that plate's on the tray (its skewer out of it), closed on it and lifting it in a low arc onto the plate, and on to
   * the next, or back down beside the tray (ServeTongs draws them; they're posed here, in the fire's frame)
   */
  const tongRef = useRef({ key: null as string | null, slot: -1, phase: 'rest' as TongPhase, t: 0, tip: new THREE.Vector3(), from: new THREE.Vector3(),
    first: true, open: 0, use: 0 })
  const tongStep = (dt: number) => {
    const T = tongRef.current
    const now = performance.now()
    T.t += dt
    // (where they lie: on the table beside the tray's end toward the plating place, along the way the food lies, their hinge on the server's
    // side (+LAY) and their grip toward the table's back)
    const b = bowlAt()
    const restTip = TONG_REST_TIP.copy(b).add(TRAY_OFF).addScaledVector(STACK_DIR, TRAY_SIDE * TONG_REST_OUT).addScaledVector(LAY_DIR, -TONG_LEN / 2)
    // (lying on their side, one arm on the table and the other over it)
    restTip.y = b.y + TONG_LIE
    // (the next piece to lift: one on the tray for a plate whose server's there, down on it, its skewer drawn out of it)
    const next = () => {
      if (space !== 'open') return null
      for (let k = 0; k < READY_SLOTS; k++) {
        const sl = PLATING.slots[k]
        if (!sl?.tongs || !sl.onTray) continue
        const q = pieces.current.find((x) => x.readyAt === k && x.trayAt !== undefined && x.flight >= 1 && !x.eaten && x.trash < 0 &&
          !(x.skewerAt !== undefined && (x.pullAt === undefined || now - x.pullAt < PULL_MS)))
        if (q) return { q, k }
      }
      return null
    }
    if (T.phase === 'rest' || T.phase === 'back') {
      const n = next()
      if (n) { T.key = n.q.key; T.slot = n.k; T.from.copy(T.tip); T.first = T.phase === 'rest' || T.t < TONG_BACK_S * 0.3; T.phase = 'reach'; T.t = 0 }
    }
    const p = T.key ? pieces.current.find((q) => q.key === T.key) : undefined
    // (its piece gone meanwhile (eaten, binned, its plate's customer gone): let go, back down)
    if ((T.phase === 'reach' || T.phase === 'lift') && (!p || p.eaten || p.trash >= 0 || (T.phase === 'reach' && p.trayAt === undefined))) {
      if (p) p.tong = false
      T.key = null; T.from.copy(T.tip); T.phase = 'back'; T.t = 0
    }
    if (T.phase === 'reach' && p) {
      // (from beside the tray, or from the plate it last set something on, to over the piece, opening as they come)
      const dur = T.first ? TONG_TAKE_S : TONG_S - TONG_LIFT_S
      const k = Math.min(1, T.t / dur), e = k * k * (3 - 2 * k)
      TONG_AT.copy(p.node.position).setY(p.node.position.y + 0.04)
      T.tip.lerpVectors(T.from, TONG_AT, e)
      T.tip.y += Math.sin(k * Math.PI) * 0.06
      T.open = THREE.MathUtils.lerp(T.open, 0.14, Math.min(1, dt * 14))
      T.use = T.first ? e : 1
      if (k >= 1) {
        // (closed on it: off the tray, onto its plate beside what's on it already)
        const row = pieces.current.filter((q) => q !== p && q.readyAt === T.slot && q.tonged && !q.eaten && q.trash < 0 &&
          !SERVICE.claimed.has(q.key) && !SERVICE.carried.has(q.key)).length
        p.fromP.copy(p.node.position)
        p.fromQ.copy(p.node.quaternion)
        p.toP.copy(readyFoodAt(T.slot, row, true, plateOfSeat(p.seat)))
        p.local.copy(p.toP).sub(containerAt('bar'))
        p.trayAt = undefined
        p.tonged = true
        p.tong = true
        p.flight = 0
        T.phase = 'lift'; T.t = 0
      }
    } else if (T.phase === 'lift' && p) {
      // (holding it by its top as it goes over)
      T.tip.copy(p.node.position).setY(p.node.position.y + 0.035)
      T.open = THREE.MathUtils.lerp(T.open, -0.02, Math.min(1, dt * 20))
      T.use = 1
      if (p.flight >= 1) {
        p.tong = false
        T.key = null
        // (straight on to the next of this plate's, or another's whose server's there; none, back down beside the tray)
        const n = next()
        T.from.copy(T.tip)
        if (n) { T.key = n.q.key; T.slot = n.k; T.first = false; T.phase = 'reach' } else T.phase = 'back'
        T.t = 0
      }
    } else if (T.phase === 'back') {
      const k = Math.min(1, T.t / TONG_BACK_S), e = k * k * (3 - 2 * k)
      T.tip.lerpVectors(T.from, restTip, e)
      T.tip.y += Math.sin(k * Math.PI) * 0.05
      T.open = THREE.MathUtils.lerp(T.open, 0, Math.min(1, dt * 10))
      T.use = 1 - e
      if (k >= 1) { T.phase = 'rest'; T.t = 0 }
    } else {
      T.tip.copy(restTip)
      T.open = 0
      T.use = 0
    }
    // (their pose: lying on their side beside the tray, their grip toward the table's back (their arms one over the other: the way they
    // spread, up); in use tipped down to their grip from the server's hand, over it and toward them, their arms either side of what they hold)
    const K = KAKU.made
    if (!K) return
    TONG_X.copy(LAY_DIR).negate()
    TONG_Z.set(0, 1, 0)
    TONG_Y.crossVectors(TONG_Z, TONG_X).normalize()
    TONG_QR.setFromRotationMatrix(TONG_M.makeBasis(TONG_X, TONG_Y, TONG_Z))
    TONG_X.copy(LAY_DIR).multiplyScalar(-0.18).add(TONG_Y.set(0, -0.34, 0)).normalize()
    TONG_Z.crossVectors(TONG_X, TONG_Y.set(0, 1, 0)).normalize()
    TONG_Y.crossVectors(TONG_Z, TONG_X).normalize()
    TONG_QU.setFromRotationMatrix(TONG_M.makeBasis(TONG_X, TONG_Y, TONG_Z))
    const g = K.tongs
    g.quaternion.slerpQuaternions(TONG_QR, TONG_QU, THREE.MathUtils.clamp(T.use, 0, 1))
    // (the hinge from the grip back along them)
    g.position.copy(T.tip).addScaledVector(TONG_X.set(1, 0, 0).applyQuaternion(g.quaternion), -TONG_LEN)
    K.arms[0].rotation.y = -T.open
    K.arms[1].rotation.y = T.open
    // (with the tray: put away with it, shut)
    const s = T.phase === 'rest' ? TRAY_SWAP.tray : 1
    g.scale.setScalar(Math.max(1e-4, s))
    g.visible = s > 0.002
  }
  /**
   * The open shop: a cooked piece goes to the customer who's owed one of these, onto their plate at the bar (pieces already on it push the
   * new one along), or, with a server on the floor, out to the plating place, plated there for them to carry over (the owner's: the kitchen plates,
   * the floor only carries)
   */
  const serveTo = (p: Piece, owner: Guest) => {
    p.keepWarm = false
    // (a takeaway's: packed into the box at the plating place, side by side, the owner's hands taking it there)
    if (owner.takeout) {
      p.guest = owner.id
      p.seat = -1
      const row = pieces.current.filter((q) => q !== p && q.guest === owner.id && q.container === 'takeout' && !q.eaten).length
      p.container = 'takeout'
      p.body = null
      // (lying the box's long way, across the table, side by side along it; at the plate's size (BAR_FOOD_SCALE): at the fire's, a fish
      // lay out over the box's sides and the tasting bowl beside it)
      // (in the box's main cell, side by side across it (bentoSpot, item 331): they were laid three across and the fourth on the third)
      const all = (TAKEOUT.orders.find((o) => o.id === owner.id)?.items ?? 3)
      const spot = bentoSpot(row, all)
      p.toP.copy(containerAt('takeout')).addScaledVector(ALONG, spot.z).addScaledVector(LAY, -spot.x)
        .add(new THREE.Vector3(0, 0.05 + tierOf(owner.id) * BOX_TIER, 0))
      // (its box set out now, for it to land in)
      const order = TAKEOUT.orders.find((o) => o.id === owner.id)
      if (order) order.opened = true
      flatQ(p, p.toQ, LAY)
      p.local.copy(p.toP).sub(containerAt('takeout'))
      return
    }
    const seat = owner.seat
    p.guest = owner.id
    p.seat = seat
    const row = pieces.current.filter((q) => q !== p && q.collected && q.container === 'bar' && q.seat === seat && present(q) && !q.eaten && q.loose === p.loose).length
    seatFoodAt(seat, row, plateOfSeat(seat), p.toP, p.loose)
    p.container = 'bar'
    p.body = null
    // (on the plate at the plating place lying back across the table, side by side, in its middle: never over the table's end; on a
    // customer's plate as it lies before them, along their counter, a fish's head on their left (item 228: seatTurn), as it's turned to
    // once a server sets it down)
    flatQ(p, p.toQ, PLATING_DIR)
    p.passQ = p.toQ.clone()
    if (!(SERVICE.servers && bar)) p.toQ.premultiply(TURN_Q.setFromAxisAngle(UP_AXIS, seatTurn(seat)))
    p.local.copy(p.toP).sub(containerAt('bar'))
    if (SERVICE.servers && bar) {
      p.via = 'plated'
      p.readyAt = undefined
      plateReady(p)
    }
  }
  /** the chef says something, now and then (not more often than every two and a half seconds) */
  const chefSay = (text: string) => {
    if (performance.now() - chefSaid.current > 2500) {
      chefSaid.current = performance.now()
      onSay?.('chef', text)
    }
  }
  const collect = (p: Piece) => {
    if (p.collected || !present(p)) return
    // (the shop open and cooked for nobody (its customer gone): into the big bowl to keep, for the next customer who orders one (the owner's:
    // food's never thrown out but burnt; the bin is for the sticks and the burnt))
    if (space === 'open' && !ownerOf(p)) p.keepWarm = true
    const bowl = inBowl(p)
    const basket = inBasket(p)
    const dish = onDish(p)
    // (the bowl kept to its one row: with it full, what went in first is eaten up, its place the new one's (the owner's: a mountain piled up in
    // it, the twenty-first laid on the first; then still two layers of five))
    if (bowl) {
      const inIt = pieces.current.filter((q) => q !== p && q.collected && !q.eaten && q.slot !== null && q.container?.startsWith('bowl'))
        .sort((a, b) => (a.bowlAt ?? 0) - (b.bowlAt ?? 0))
      // (open, the bowl's the tray (item 317), its row shared with what waits on it for its plate: kept to its places with those counted)
      const onTray = space === 'open' ? pieces.current.filter((q) => q !== p && q.trayAt !== undefined && !q.eaten && q.trash < 0).length : 0
      for (const q of inIt.slice(0, warmToEat(inIt.length + onTray + 1, space === 'open' ? BOWL_WARM_MAX : BOWL_HAND_MAX))) { q.eaten = true; q.keepWarm = false; q.slot = null }
      p.bowlAt = performance.now()
    }
    // take the first free spot where it's going (basket, dishes or plates); eaten food frees its spot
    const taken = new Set(pieces.current.filter((q) => q.slot !== null && !q.eaten && present(q) &&
      destination(q) === destination(p)).map((q) => q.slot))
    if (bowl && space === 'open') for (const t of trayTaken(p)) taken.add(t)
    let slot = 0
    while (taken.has(slot)) slot++
    // (the tray's every place taken by what waits there for its plate: nowhere to keep it warm; the staff have it)
    if (bowl && space === 'open' && slot >= TRAY_PLACES) { p.eaten = true; p.keepWarm = false; p.slot = null; return }
    // (food comes off the fire onto a plate only if that plate is on the cook's table: a plate carried off it, or fallen to the floor, takes nothing)
    if (bowl) {
      if (outsideTable(bowlAt(), BOWL_R)) { onNotice?.('offTable'); return }
    } else if (space !== 'open' && !basket && !dish) {
      const pl = plateAt(Math.floor(slot / PER_PLATE))
      if (outsideTable(pl, PLATE_R)) { onNotice?.('offTable'); return }
    }
    p.slot = slot
    p.collected = true
    // (its place on the grill net goes to the next one waiting only once it's off the net (the release below): done, and waiting there for a
    // place at the plating place, it still lies on it, and the next one put on in its place lay in it (item 332, the owner's 「我又重現這個經典
    // 場面」: in a rush, the net's three places heaped with what had been done and what had gone on since))
    // tells Dish to stop driving this node's position (its pop-in would pull it back up to skewer height)
    p.node.userData.onPlate = true
    p.flight = instant ? 1 : 0
    p.fromP.copy(p.node.position)
    p.fromQ.copy(p.node.quaternion)
    const owner = space === 'open' ? ownerOf(p) : undefined
    if (space === 'open' && owner) {
      serveTo(p, owner)
      return
    }
    if (bowl) {
      // laid side by side across the bowl, the skewers' sticks resting across its rim: one row, kept to it (game/plates' bowlPlace)
      const { across, layer } = bowlPlace(slot)
      p.toP.copy(bowlAt()).addScaledVector(STACK_DIR, across)
      if (space === 'open') p.toP.add(TRAY_OFF)
      // (open, on the tray's rack (item 317), as what waits there for its plate lies)
      p.toP.y += space === 'open' ? TRAY_REST : (p.loose ? 0.07 : BOWL_RIM + 0.02) + layer * LAYER_HEIGHT
      p.container = 'bowl-0'
    } else if (basket) {
      // tossed in from just above the basket; from there the physics drops it in and lets it settle
      const a = Math.random() * Math.PI * 2
      const r = Math.random() * 0.1 * basketScale()
      p.toP.copy(basketAt(0)).add(new THREE.Vector3(Math.cos(a) * r, 0.42, Math.sin(a) * r))
      p.body = null
      // lying on its side, broken-open top up, turned any which way
      const yaw = Math.random() * Math.PI * 2
      const along = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw))
      p.toQ.setFromRotationMatrix(new THREE.Matrix4().makeBasis(along, UP, new THREE.Vector3().crossVectors(along, UP)))
    } else if (dish) {
      // a side dish holds a few in a ring; a full one gets another set down beside it
      const cap = roast.dish!.capacity
      const n = Math.floor(slot / cap)
      const a = ((slot % cap) / cap) * Math.PI * 2 + 0.4
      const r = cap > 1 ? DISH_R * 0.48 : 0
      p.toP.copy(dishAt(n)).add(new THREE.Vector3(Math.cos(a) * r, 0.05, Math.sin(a) * r))
      if (n + 1 > dishCount) setDishCount(n + 1)
      p.container = `dish-${n}`
      // lying flat, just as it sat on the net, turned any which way
      p.toQ.copy(p.homeQ).premultiply(new THREE.Quaternion().setFromAxisAngle(UP, Math.random() * Math.PI * 2))
    } else {
      // side by side across the plate, centred; a full row starts a new layer on top; a full plate, a new plate
      const plate = Math.floor(slot / PER_PLATE)
      const within = slot % PER_PLATE
      const col = within % PER_LAYER
      const layer = Math.floor(within / PER_LAYER)
      const across = (col - (PER_LAYER - 1) / 2) * SLOT_GAP + (layer % 2) * (SLOT_GAP / 2)
      p.toP.copy(plateAt(plate)).addScaledVector(STACK_DIR, across)
      if (plate + 1 > plateCount) setPlateCount(plate + 1)
      p.container = `plate-${plate}`
      // skewers are longer than the plate is wide, so the stick rests across the rim (top ≈ 0.08) instead of
      // cutting through it
      p.toP.y += (p.loose ? 0.075 : 0.105) + layer * LAYER_HEIGHT
    }
    if (basket && !bowl) p.container = 'basket-0'
    // (onto a plate that's under another, or one stacked up: it's set down on its own first)
    if (p.container && STACKABLE(p.container) && (stackOn.current.has(p.container) || stackTop(p.container) !== p.container)) {
      const offset = p.toP.clone().sub(containerAt(p.container))
      unstack(p.container)
      p.toP.copy(containerAt(p.container)).add(offset)
    }
    // where it sits relative to its plate, dish or basket, so it goes along when that's dragged somewhere else
    p.local.copy(p.toP).sub(containerAt(p.container!))
    // everything points the same way along LAY_DIR
    // A skewer's local axes depend on how its parts were joined in Blender, so flatQ works from the stick itself
    // (it runs from its foot on the outer ring up and in to its tip, the food's broad side facing out) and turns
    // it to lie along LAY_DIR, broad side up; loose pieces just lie on their bottom
    if (!basket && !dish) flatQ(p, p.toQ)
  }

  /**
   * Eat a piece that's sitting on the plate (or in the basket): a few chewing bites and the food is gone. A skewer
   * leaves its bare stick behind; clicking that clears it away.
   */
  /** carry a piece from the tray onto the fire (skewers only while there's room among the coals) */
  const putOnFire = (p: Piece) => {
    if (!p.staged) return false
    // (researching: not on the fire till it's been skewered by hand)
    if (space !== 'open' && p.sticks.length && p.skewerAt === undefined) {
      onNotice?.('needSkewer')
      p.node.userData.onPlate = true
      return false
    }
    // (a skewer into a place of its own round the fire (game/fireSlots), the first free one, it turned round to it; with none free it waits
    // on the board, the second cook waiting with what he's brought (the owner's, 2026-11-10: in a rush they stood all round it, crowded))
    if (!p.loose) {
      const taken = new Set(pieces.current.filter((q) => q !== p && q.ringSlot !== undefined).map((q) => q.ringSlot!))
      const k = p.ringSlot !== undefined && !taken.has(p.ringSlot) ? p.ringSlot : freeRingSlot(taken)
      if (k === null) {
        // (told only to the player putting it on by hand: with the shop open the kitchen does, and waits on its own; the notice, "take the done
        // ones off first", came up for the player, who can't (the owner's item 35, found on a whole day's audit))
        if (space !== 'open') onNotice?.('fireFull')
        p.node.userData.onPlate = true
        return false
      }
      if (k !== p.ringSlot) toRingPlace(p, k)
      p.ringSlot = k
    }
    p.staged = false
    // (out of the basket it waited in, if it's a potato (item 583): the basket's settling lets go of it)
    p.body = null
    p.homeFlight = instant ? 1 : 0
    p.fromP.copy(p.node.position)
    p.fromQ.copy(p.node.quaternion)
    p.node.userData.onPlate = true
    // it lights up as it goes on, so you see it took
    flashUntil.current.set(p.key, performance.now() + 900)
    return true
  }

  const eat = (p: Piece) => {
    if (!p.collected || p.flight < 1 || p.eaten || !present(p) || p.via) return
    // potatoes in the basket are unwrapped first, with a click of their own
    if (inBasket(p) && !p.unwrapped) {
      p.unwrapped = true
      return
    }
    if (p.stickOnly) {
      p.eaten = true
      p.slot = null
      return
    }
    if (p.eat > 0) return
    // only food that's properly done: not raw or half-cooked, and not burnt
    const stage = stageOf(p.progress / roast.times[p.id]).key
    if (stage === 'raw' || stage === 'half') {
      onNotice?.('notCooked')
      return
    }
    if (stage === 'burnt') {
      onNotice?.('burnt')
      return
    }
    // (tasting by hand: the boss goes over to it and eats it there, one at a time; at the bar the customers eat for themselves)
    if (space !== 'open') {
      if (BOSS_TASTE.at || pieces.current.some((q) => q.awaitBoss)) return
      p.awaitBoss = performance.now()
      BOSS_TASTE.at = p.node.getWorldPosition(new THREE.Vector3())
      BOSS_TASTE.arrived = false
      return
    }
    p.eat = 0.0001
  }

  if (import.meta.env?.DEV && typeof window !== 'undefined') Object.assign(window, { __eat: eat, __collect: collect, __times: roast.times })
  /**
   * Take the next bite out of a piece: working in from the far end of the food along its longest side, each bite
   * a ball a bit wider than the food is thick, off-centre to alternate sides, so what's left looks gnawed.
   * Once bitten into, its inside faces are drawn too, so the bite shows the inside instead of a hollow.
   */
  const takeBite = (p: Piece) => {
    const k = p.bites.uBiteCount.value
    if (k >= MAX_BITES) return
    const box = new THREE.Box3()
    for (const { mesh: m, foil } of p.mats) {
      if (foil || p.sticks.includes(m)) continue
      m.geometry.computeBoundingBox()
      box.union(m.geometry.boundingBox!)
    }
    const size = box.getSize(new THREE.Vector3())
    const mid = box.getCenter(new THREE.Vector3())
    const axes = [0, 1, 2].sort((a, b) => size.getComponent(b) - size.getComponent(a))
    const [long, wide] = axes
    const len = size.getComponent(long)
    const c = mid.clone()
    c.setComponent(long, box.max.getComponent(long) - len * (0.05 + k * 0.95 / BITES_PER_PIECE))
    c.setComponent(wide, mid.getComponent(wide) + (k % 2 ? 1 : -1) * size.getComponent(wide) * 0.22)
    const r = Math.max(len / BITES_PER_PIECE * 0.85, size.getComponent(wide) * 0.62)
    p.bites.uBites.value[k].set(c.x, c.y, c.z, r)
    p.bites.uBiteCount.value = k + 1
    if (k === 0) {
      for (const { mat, foil } of p.mats) if (!foil) {
        mat.side = THREE.DoubleSide
        mat.needsUpdate = true
      }
    }
  }

  // pointer: hovering food on the fire or the plate makes it glow and turns the cursor into a hand; a click (not
  // a drag that orbits the camera) takes it off the fire, or eats it once it's on the plate
  const { gl, camera, raycaster, scene: world } = useThree()
  const shift = useRef<{ key: string; start: THREE.Vector3; from: THREE.Vector3 } | null>(null)
  /** soup bowls: sips left, and how full it looks (eased toward what's left) */
  const sips = useRef(new Map<string, { left: number; level: number }>())
  /** a stick of charcoal or the fan in hand (see Decor), and the heat the fanning has added */
  const held = useRef<Held>(null)
  const fanned = useRef({ extra: 0, last: 0, pending: 0 })
  const [decorTip, setDecorTip] = useState<'charcoal' | 'fan' | 'skewer' | null>(null)
  // how many things have gone in the bin (it starts empty), and the fire glowing as raw food is carried over it
  const trashedRef = useRef(0)
  const flashUntil = useRef(new Map<string, number>())
  const [, setTrashed] = useState(0)
  /** a whole fish's bones left in the tasting bowl once the owner's eaten it (the owner's, 2026-11-10), till they're clicked into the bin or the
   * shop opens: where in the bowl, which way they lie */
  const [bones, setBones] = useState<{ key: number; at: [number, number, number]; yaw: number }[]>([])
  const bonesSeq = useRef(0)
  const [fireHint, setFireHint] = useState(0)
  const lockedRef = useRef(locked)
  lockedRef.current = locked
  // (with the shop open nothing is cooked or seasoned by hand: the cooks do it; see game/mode)
  const byHand = canCookByHand(modeOf(ai, research))
  const byHandRef = useRef(byHand)
  byHandRef.current = byHand

  // ---- two tables: the player's tasting (shop closed) and the shop's own (open). Switching puts one table's
  // food away exactly as it was and brings the other's back, each piece where it was and as cooked as it was.
  type Snap = { pieces: Map<string, Record<string, unknown>>; counts: [number, number, number];
    moved: Map<string, THREE.Vector3>; sips: Map<string, { left: number; level: number }>; trashed: number
    stacks: Map<string, string> }
  const snaps = useRef(new Map<string, Snap>())
  const lastSpace = useRef(space)
  // (its skewer too (skewerAt, pullAt): put away without them, what was on the fire came back off its skewer, standing in the air over the
  // coals (the owner's, 2026-11-10), and what had been skewered by hand on the board had to be skewered again)
  const SCALARS = ['progress', 'collected', 'flight', 'stickOnly', 'netSpot', 'container', 'staged', 'stagedAt', 'wasPresent',
    'homeFlight', 'unwrapped', 'unwrapT', 'chefSeasoned', 'trash', 'landed', 'slot', 'eat', 'eaten', 'guest', 'seat', 'skewerAt', 'pullAt', 'trayAt', 'tonged',
    'tong', 'lead', 'turned', 'turnT', 'sideSet', 'wasDone'] as const
  const VECS = ['fromP', 'fromQ', 'toP', 'toQ', 'local', 'trashFrom'] as const
  const save = (): Snap => {
    const out = new Map<string, Record<string, unknown>>()
    for (const p of pieces.current) {
      const r: Record<string, unknown> = {}
      for (const k of SCALARS) r[k] = p[k]
      for (const k of VECS) r[k] = p[k].clone()
      r.body = p.body ? { v: p.body.v.clone(), r: p.body.r, live: p.body.live } : null
      r.dabs = { ...p.dabs }
      r.steps = [...p.steps]
      // (its numbers; which way its first side looks (item 473) kept apart, a copy)
      r.looks = Object.fromEntries(Object.entries(p.looks).filter(([, u]) => typeof u.value === 'number').map(([k, u]) => [k, u.value]))
      r.side = p.looks.uSide.value.clone()
      r.want = p.want
      r.bites = { n: p.bites.uBiteCount.value, v: p.bites.uBites.value.map((b) => b.clone()) }
      r.pos = p.node.position.clone()
      r.quat = p.node.quaternion.clone()
      r.ud = { onPlate: p.node.userData.onPlate, shrink: p.node.userData.shrink, byGuest: p.node.userData.byGuest }
      r.food = p.food.map((m) => m.visible)
      r.puffs = p.puffs.map((m) => [...(m.morphTargetInfluences ?? [])])
      out.set(p.key, r)
    }
    return { pieces: out, counts: [plateCount, dishCount, basketCount], moved: new Map([...moved.current].map(([k, v]) => [k, v.clone()])),
      sips: new Map([...sips.current].map(([k, v]) => [k, { ...v }])), trashed: trashedRef.current,
      stacks: new Map(stackOn.current) }
  }
  const fresh = (p: Piece) => {
    p.skewerAt = undefined
    p.pullAt = undefined
    p.trayAt = undefined
    p.tonged = false
    p.tong = false
    p.wasPresent = false
    p.staged = false
    p.homeFlight = 1
    p.unwrapped = false
    p.unwrapT = 0
    p.chefSeasoned = false
    for (const k of Object.keys(p.dabs) as Seasoning[]) p.dabs[k] = 0
    p.steps = []
    p.progress = 0
    p.lead = 0; p.turned = false; p.turnT = 0; p.sideSet = false; p.wasDone = false
    p.netSpot = null
    p.ringSlot = undefined
    p.container = null
    p.carried = false
    p.trash = -1
    p.body = null
    for (const u of Object.values(p.looks)) { if (typeof u.value === 'number') u.value = 0; else u.value.set(1, 0, 0) }
    p.stickOnly = false
    for (const m of p.food) if (m !== p.node) m.visible = true
    p.bites.uBiteCount.value = 0
    p.landed = -1
    p.collected = false
    p.flight = 0
    p.slot = null
    p.eat = 0
    p.eaten = false
    p.guest = -1
    p.seat = -1
    p.want = null
    p.node.userData.onPlate = false
    p.node.userData.shrink = 1
    p.node.userData.byGuest = false
    p.node.userData.follow = undefined
    p.node.quaternion.copy(p.homeQ)
    p.node.position.copy(p.homeP)
  }
  /** a portion of `id` the open shop's kitchen can make a new order from: put out before, eaten (or binned) and cleared away, and out of
   * everyone's hands (not `taken` already for this order) */
  const recyclable = (id: string, taken: Set<Piece>) => pieces.current.find((q) => q.id === id && menuIds.has(q.id) && present(q) && q.eaten &&
    q.trash < 0 && !q.carried && !q.via && !taken.has(q) && !SERVICE.waiting.has(q.key) && !SERVICE.carried.has(q.key) && !SERVICE.claimed.has(q.key))
  /** one kept warm in the bowl, cooked for someone who'd gone and nobody's yet (not `taken` already for this order): a new order of it has
   * that one, not one more cooked (the owner's: the bowl never emptied, every order cooking one more for it) */
  const warmFor = (id: string, taken: Set<Piece>) => pieces.current.find((q) => q.id === id && q.keepWarm && (q.container?.startsWith('bowl') || q.container?.startsWith('basket')) &&
    q.guest < 0 && present(q) && !q.eaten && q.trash < 0 && !taken.has(q) && !SERVICE.claimed.has(q.key) && !SERVICE.carried.has(q.key))
  /** made again: back as it was before it was ever cooked, to be brought out raw on the tray as the order's (next frame: present, not yet seen) */
  const revive = (p: Piece) => {
    fresh(p)
    p.via = undefined
    p.readyAt = undefined
    p.small = false
    SERVICE.delivered.delete(p.key)
    for (const { mat, foil } of p.mats) {
      if (foil || mat.side === THREE.FrontSide) continue
      mat.side = THREE.FrontSide
      mat.needsUpdate = true
    }
  }
  const load = (snap: Snap | undefined) => {
    for (const p of pieces.current) {
      const r = snap?.pieces.get(p.key)
      if (!r) {
        fresh(p)
      } else {
        const w = p as unknown as Record<string, unknown>
        for (const k of SCALARS) w[k] = r[k]
        for (const k of VECS) (p[k] as THREE.Vector3 & THREE.Quaternion).copy(r[k] as THREE.Vector3 & THREE.Quaternion)
        const b = r.body as { v: THREE.Vector3; r: number; live: boolean } | null
        p.body = b ? { v: b.v.clone(), r: b.r, live: b.live } : null
        Object.assign(p.dabs, r.dabs)
        p.steps = [...((r.steps as Step[] | undefined) ?? [])]
        p.want = (r.want as Piece['want']) ?? null
        for (const [k, v] of Object.entries(r.looks as Record<string, number>)) (p.looks as unknown as Record<string, { value: number }>)[k].value = v
        if (r.side) p.looks.uSide.value.copy(r.side as THREE.Vector3)
        const bites = r.bites as { n: number; v: THREE.Vector4[] }
        p.bites.uBiteCount.value = bites.n
        bites.v.forEach((v, i) => p.bites.uBites.value[i].copy(v))
        p.node.position.copy(r.pos as THREE.Vector3)
        p.node.quaternion.copy(r.quat as THREE.Quaternion)
        Object.assign(p.node.userData, r.ud)
        ;(r.food as boolean[]).forEach((v, i) => { if (p.food[i]) p.food[i].visible = v })
        ;(r.puffs as number[][]).forEach((v, i) => { const m = p.puffs[i]?.morphTargetInfluences; if (m) v.forEach((x, j) => (m[j] = x)) })
        p.carried = false
      }
      // a bitten piece shows its inside
      for (const { mat, foil } of p.mats) {
        const side = !foil && p.bites.uBiteCount.value ? THREE.DoubleSide : THREE.FrontSide
        if (mat.side !== side) {
          mat.side = side
          mat.needsUpdate = true
        }
      }
    }
    setPlateCount(snap?.counts[0] ?? 1)
    setDishCount(snap?.counts[1] ?? 1)
    setBasketCount(snap?.counts[2] ?? 1)
    moved.current = new Map(snap?.moved ?? [])
    stackOn.current = new Map(snap?.stacks ?? [])
    sips.current = new Map(snap?.sips ?? [])
    trashedRef.current = snap?.trashed ?? 0
    setTrashed(trashedRef.current)
    setMoveTick((t) => t + 1)
  }
  useLayoutEffect(() => {
    if (lastSpace.current === space) return
    snaps.current.set(lastSpace.current, save())
    // (each opening a clean kitchen: the last day's leftovers (raw skewers set out, half-cooked ones, a plate nobody came for) aren't
    // brought back onto the table (the owner saw skewers there that nobody had ordered); the shut shop's table comes back as it was left.
    // What stands on the table stays where it stood, though: the seasoning ledge, the board, the bucket, the bin, the basket and the bowl
    // keep their places (and what edit mode did to them), only the plates and dishes put out going; cleared with the rest, the ledge went
    // back to the model's own place at every opening (placed once, by boxPlaced) and the edit's moves were lost (the owner saw it shift))
    const stands = [...moved.current].filter(([k]) => !STACKABLE(k)).map(([k, v]) => [k, v.clone()] as const)
    load(space === 'open' ? undefined : snaps.current.get(space))
    if (space === 'open') for (const [k, v] of stands) moved.current.set(k, v)
    lastSpace.current = space
    // (the bones in the bowl gone with the table's clearing)
    if (space === 'open') setBones([])
    // (shut: the customers are gone, and what they'd ordered with them)
    if (space === 'closed') {
      guests.current = []
      wants.current = []
      onGuests?.([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [space])
  const scrap = useRef<{ p: Piece; x: number; y: number; started: boolean } | null>(null)
  const stageSeq = useRef(0)
  const aiClock = useRef(0)
  const guestClock = useRef(0)
  const guestTime = useRef(0)
  // (the day's pattern of trade, drawn as the shop opens (game/flow), and when it opened on the shop's clock; the chef says what kind of day it is)
  const flow = useRef<FlowKind>('steady')
  const openedAt = useRef(0)
  useEffect(() => {
    if (!ai || !bar) return
    // (by the day's weather (item 623, game/weather): a rain day's trade the rainy one, a dry day's never)
    const c = getClock()
    flow.current = flowFor(OPENINGS.n++, weatherOf(businessDay(c.day, c.minute)).sky)
    openedAt.current = guestTime.current
    const t = window.setTimeout(() => onSay?.('chef', FLOWS[flow.current].say[lang]), 1500)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ai])
  const chefClock = useRef(0)
  const guests = useRef<Guest[]>([])
  /** the shop's seconds since the last takeaway order (game/takeout) */
  const takeoutClock = useRef(0)
  if (import.meta.env?.DEV && typeof window !== 'undefined') Object.assign(window, { __roastGuests: guests })
  SAY_SEATED.say = (id, text) => onSay?.('guest', text, id)
  // (a customer dragged to another stool (GuestBar3D asks): only while they're waiting with nothing cooked tied to their stool yet, and
  // the stool's nobody's)
  useFrame(() => {
    const a = SEAT_MOVE.ask
    if (!a) return
    SEAT_MOVE.ask = null
    const g = guests.current.find((x) => x.id === a.guest)
    const held = pieces.current.some((q) => q.guest === a.guest && (q.collected || q.seat >= 0) && !q.eaten)
    const taken = guests.current.some((x) => x.id !== a.guest && x.seat === a.to && (x.state === 'waiting' || x.state === 'eating' || !x.cleared))
    const ok = !!g && g.state === 'waiting' && g.seat === a.from && !held && !taken
    if (ok) { g.seat = a.to; report() }
    SEAT_MOVE.answer = { guest: a.guest, to: a.to, ok }
  })
  /** the customers who've said how dark it is (once each) */
  const darkSaid = useRef(new Set<number>())
  /** what's been ordered off the menu and not yet brought out: each food, as which dish */
  const wants = useRef<{ id: string; dabs: string[]; name: string }[]>([])
  // (said in the page's language: the menu's own Japanese name for it, its English made the menu's way; the bare food's name in it otherwise
  // (the kitchen's log in Japanese named the dishes in Chinese))
  const nameOfP = (p: Piece) => {
    const w = p.want
    if (!w) return nameOf(p.id)
    if (lang === 'ja') return w.ja ?? w.name
    if (lang === 'en') return partName({ name: w.name, en: nameOf(p.id) }, nameOf(p.id), p.id, w.dabs as Dab[], 'en')
    return w.name
  }
  const guestSeq = useRef(0)
  /** when each customer's tokkuri was asked for (the shop's clock): poured at the sake station and carried out to them (GuestBar3D), or with no
   * station set at their place after SAKE_WAIT_S */
  const sakeAsked = useRef(new Map<number, number>())
  /** when the kitchen last said a bowl of rice or soup couldn't be had for want of it in stock (item 229) */
  const sideSaid = useRef<Partial<Record<'rice' | 'soup', number>>>({})
  const report = () => onGuests?.(guests.current.filter((g) => !g.takeout).map((g) => ({ id: g.id, state: g.state, items: g.orders.length, ate: [...g.ate],
    rating: g.eaten.length ? g.eaten.reduce((a, b) => a + b, 0) / g.eaten.length : null, seat: g.seat, partner: g.partner, family: g.family, plate: plateFor(g.orders) })))
  const chefSaid = useRef(0)
  /** when the chef last said there's no clean skewer */
  const noSkewerSaid = useRef(-1e9)
  // (the shop shut: every used skewer washed and back in the holder (the staff wash them as they close))
  useEffect(() => { if (space !== 'open') SKEWERS.s = washAll(SKEWERS.s) }, [space])
  // (the shop shut: what's left kept warm in the big bowl, cooked for customers who went before it reached them (they were refunded:
  // App's refund), eaten up by the staff as their supper, not left there into the night (the owner's, 2026-11-12))
  useEffect(() => {
    if (space === 'open') return
    const left = pieces.current.filter((p) => p.keepWarm && !p.eaten && (p.container?.startsWith('bowl') || p.container?.startsWith('basket')))
    if (!left.length) return
    for (const p of left) { p.eaten = true; p.keepWarm = false; p.slot = null }
    onSay?.('chef', L().staffMeal(left.length))
  }, [space])

  /** the best seasoning for a food by the PAIRING table (null if nothing suits it) */
  const bestSeasoning = (id: string) => {
    let best: Exclude<Seasoning, 'water'> | null = null
    let score = 5
    for (const k of DABS) {
      const w = PAIRING[k][id] ?? PAIRING_DEFAULT[k]
      if (w > score) {
        score = w
        best = k
      }
    }
    return best
  }

  /**
   * The AI chef, a step at a time: keeps the fire up, puts what's waiting on the tray onto the fire, seasons each
   * piece as it comes good (once, with what suits it best), takes it off when it's done, unwraps the potatoes,
   * and clears burnt food and bare sticks into the bucket.
   */
  const runChef = () => {
    const say = chefSay
    // (the head chef's next trip, first come first fetched, while he's at his place: with something on the fire he goes meanwhile)
    const T = CHEF_TRIP
    // (the second cook walking the orders to the board, the owner at the fire carrying them on and off it, each at his own; the owner one
    // thing at a time in his hands (with nobody walking (shut, a phone) pieces go across by themselves, as they did))
    const chefLive = performance.now() - T.seenAt < 1000
    const handLive = performance.now() - OWNER_GRILL.seenAt < 1000
    // (asked each time: a piece taken up just now makes him busy for what comes after in the same step)
    const busy = () => handLive && CHEF_CARRY.key !== null
    const carry = (p: Piece, kind: 'toFire' | 'toPlate') => {
      const C = CHEF_CARRY
      C.key = p.key; C.kind = kind; C.phase = 'reach'; C.t = 0
      C.from.copy(p.node.position); C.fromQ.copy(p.node.quaternion)
      footOf(p, C.foot)
    }
    // (not while he's off plating or at the charcoal: the orders wait till he's back at the board)
    if (T.phase === 'idle' && chefLive && PLATER_OUT.id !== FETCHER.id) {
      // (no more than the board has room for (game/fireSlots): its raw skewers waiting there counted; full, he waits by it)
      const onBoard = pieces.current.filter((p) => p.staged && !p.fetching && !p.loose && present(p) && !p.eaten && !roast.rawDish?.items.includes(p.id)).length
      const trip = nextTrip(pieces.current.filter((p) => p.fetching && present(p)).map((p) => ({ key: p.key, id: p.id, at: p.stagedAt })), boardRoom(onBoard))
      // (busy from now: not sent off for plates in this same frame (GuestBar3D))
      if (trip) {
        T.store = trip.store; T.keys = trip.keys; T.t = 0; T.phase = 'toStore'; FETCHER.busy = true
        T.ids = trip.keys.map((k) => pieces.current.find((p) => p.key === k)?.id ?? '')
      }
    }
    // the owner is the head chef and works the grill by hand; a hired chef cooks alongside (takes things off when
    // done, seasons them), the sous chef does the rest (keeps the fire up, puts what's waiting on, clears away)
    // (with the shop open the kitchen cooks by itself: the owner's own cook does all of it, a hired chef or sous chef working alongside)
    const hasChef = true, hasSous = true
    // (the fire kept by the third cook when there's one walking (bar.ts's FIRE_TEND): the grill asks, he fetches, and only when he's at
    // the hearth do the sticks go in or the water on; with no one, it's done at once, as it always was)
    const tend = space === 'open' && FIRE_TEND.tender
    if (FIRE_TEND.done === 'coal') {
      // (his handful out of the crate at his right hand: paid for as it was filled from the sack, not again now)
      FIRE_TEND.done = null; FIRE_TEND.want = null
      const left = CRATE.left
      if (fire && left >= 1 && roomForCoal()) {
        // (tipped in from his hands, over the hearth's near side in front of his bay)
        const tip = SOUS_AT.clone().addScaledVector(ALONG, -0.55)
        const placed = dropCoals({ x: tip.x, y: 0.45, z: tip.z }, Math.min(left, coalPortion()))
        if (placed) { CRATE.left = Math.max(0, CRATE.left - placed); if (onAddCharcoal?.(placed, false, true) !== false) say(L().addCharcoal) }
      }
      return
    }
    if (FIRE_TEND.done === 'tidy') {
      // (raked over by the third cook (item 108))
      FIRE_TEND.done = null; FIRE_TEND.want = null
      tidyFire()
      return
    }
    if (FIRE_TEND.done === 'water') {
      FIRE_TEND.done = null; FIRE_TEND.want = null
      if (fire) fire.current = Math.max(0, fire.current - 0.3)
      meterWater('dipper')
      WISP_FEED.to?.({ key: 'douse', at: [0, 0.15, 0] })
      return
    }
    if (!tend && FIRE_TEND.want) FIRE_TEND.want = null
    // (ash gathering in the bed, the shop open: the third cook asked to rake it over; with no one to, it's done at once (item 108))
    if (space === 'open' && fire && fire.current > 0.02 && !FIRE_TEND.want && ashCount() >= ASH_TIDY) {
      if (tend) FIRE_TEND.want = 'tidy'
      else tidyFire()
    }
    // (what to do about the fire: game/fireTend's call; how long it's run too hot, how long since it asked for charcoal)
    const nowS = performance.now() / 1000
    if (fire && heatOf() > HOT_AT) { if (hotSince.current === null) hotSince.current = nowS }
    else hotSince.current = null
    // (a rake asked for is no bar to charcoal or water: they're the more pressing, and take its place)
    // (kept up higher with the kitchen busy (game/fireTend's fireLow, item 207): the skewers on the fire or waiting for it)
    // (the skewers ordered and not yet off it: on it, on the board, or still to be fetched (a piece's customer is only put to it as it's
    // served: counting by that, the kitchen was never busy))
    const load = space === 'open' ? pieces.current.filter((p) => present(p) && !p.loose && !p.eaten && p.trash < 0 && !p.collected).length : 0
    const call = fire ? fireCall({ fire: fire.current, tender: tend, want: FIRE_TEND.want === 'tidy' ? null : FIRE_TEND.want, hotFor: hotSince.current === null ? 0 : nowS - hotSince.current,
      askedFor: FIRE_TEND.want === 'coal' ? nowS - coalAsked.current : 0, low: fireLow(load) }) : 'none'
    if (call === 'ask-water') {
      hotSince.current = null
      FIRE_TEND.want = 'water'
      say(L().tooHot)
      return
    }
    if (call === 'ask-coal' || call === 'drop-coal') {
      // (a handful out of the crate, as many as the bed takes; paid for only those, and none at all when it's full)
      if (!roomForCoal()) return
      // (no more than the sack and the crate have between them (both take from the crate, the crate filled from the sack): none left, the
      // chef says so now and then)
      const left = SUPPLIES.coal() + CRATE.left
      if (left < 1) { say(L().noCharcoal); return }
      if (call === 'ask-coal') {
        // (asked once; the grill gets on with the food while the third cook fetches it)
        FIRE_TEND.want = 'coal'
        coalAsked.current = nowS
      } else {
        // (no one to send, or the one sent off on something long (the rice, the plates) with the fire nearly out: the owner tosses a handful
        // in himself from where he stands at it (item 203: they flew in from the crate by themselves); away from it, it waits for him)
        const ownerThere = space !== 'open' || performance.now() - OWNER_GRILL.seenAt < 1000
        if (!ownerThere) return
        if (FIRE_TEND.want === 'coal') FIRE_TEND.want = null
        // (out of the crate, as it's thrown from it (item 199: thrown from the crate, the sticks came off the sack's count and the crate never
        // emptied): the crate filled from the sack first if it's empty, paid for then, not again now)
        takeFromCrate()
        // (from his hands, a little in from where he stands toward the fire, as the third cook's are from his)
        const tip = space === 'open' ? CHEF_AT.clone().multiplyScalar(0.85) : null
        const placed = dropCoals(tip ? { x: tip.x, y: 0.45, z: tip.z } : undefined, Math.min(CRATE.left, coalPortion()))
        if (!placed) return
        CRATE.left = Math.max(0, CRATE.left - placed)
        if (onAddCharcoal?.(placed, false, true) === false) return
        say(L().addCharcoal)
        return
      }
    }
    const live = pieces.current.filter((p) => present(p) && !p.eaten && p.trash < 0 && !p.carried)
    const stageOfP = (p: Piece) => stageOf(p.progress / roast.times[p.id]).key
    const scrapIt = live.find((p) => p.stickOnly || (!p.collected && !p.staged && stageOfP(p) === 'burnt'))
    if (scrapIt && roast.trash && (hasSous || !hasChef)) {
      if (scrapIt.skewerAt !== undefined && scrapIt.pullAt === undefined) { scrapIt.pullAt = performance.now(); SKEWERS.s = usedSkewer(SKEWERS.s) }
      scrapIt.trashFrom.copy(scrapIt.node.position)
      scrapIt.trash = 0
      scrapIt.node.userData.onPlate = true
      say(scrapIt.stickOnly ? L().stickAway : L().burntAway)
      return
    }
    // (cooked for someone who's since gone: left on the cook's table with no one to go to, or out on the plating place for a customer who's left;
    // the next customer owed one of these has it at once, and if nobody is, after a while it's cold and it's binned)
    if (space === 'open') {
      // (the bowl keeps no more than BOWL_WARM_MAX warm: the oldest over it the staff eat up (the owner's: a mountain of fish piled in it))
      const warmKept = live.filter((p) => p.keepWarm && !p.eaten && p.container?.startsWith('bowl'))
      for (const p of warmKept.slice(0, warmToEat(warmKept.length))) { p.eaten = true; p.keepWarm = false; p.slot = null }
      // (...and the basket no more than it holds (item 553): the oldest over it the staff eat up)
      const warmBasket = live.filter((p) => p.keepWarm && !p.eaten && p.container?.startsWith('basket'))
      for (const p of warmBasket.slice(0, Math.max(0, warmBasket.length - basketHolds()))) { p.eaten = true; p.keepWarm = false; p.slot = null }
      const here = (id: number) => guests.current.some((g) => g.id === id && (g.state === 'waiting' || g.state === 'eating'))
      const stray = live.find((p) => p.collected && (p.flight >= 1 || (p.via === 'plated' && p.readyAt === undefined)) && !p.stickOnly &&
        !SERVICE.claimed.has(p.key) && !SERVICE.carried.has(p.key) && p.container !== 'takeout' && (p.container !== 'bar' || (p.via === 'plated' && !here(p.guest))) &&
        // (one kept warm in the bowl waits there till someone orders it: it's not to be picked up again and again ahead of the rest)
        !(p.keepWarm && (p.container?.startsWith('bowl') || p.container?.startsWith('basket')) && !ownerOf(p)))
      if (stray) {
        const was = stray.guest
        stray.guest = -1
        const owner = ownerOf(stray)
        if (owner) {
          // (kept warm on the open shop's tray (item 317): it keeps its place there for its new customer's plate)
          if (space === 'open' && stray.trayAt === undefined && stray.container?.startsWith('bowl') && stray.slot !== null) stray.trayAt = stray.slot
          SERVICE.waiting.delete(stray.key)
          stray.via = undefined
          stray.readyAt = undefined
          stray.slot = null
          stray.flight = 0
          stray.fromP.copy(stray.node.position)
          stray.fromQ.copy(stray.node.quaternion)
          serveTo(stray, owner)
          say(L().orphanAgain(nameOfP(stray)))
          return
        }
        stray.guest = was
        // (the shop shut for the day: there's no next customer to keep it for (the owner's item 41: past closing the chef put it in the bowl
        // "for the next customer"); the staff have it, and say so)
        if (SHOP.closing && !stray.container?.startsWith('bowl')) {
          SERVICE.waiting.delete(stray.key)
          stray.via = undefined
          stray.readyAt = undefined
          stray.keepWarm = false
          stray.slot = null
          stray.trayAt = undefined
          stray.eaten = true
          say(L().orphanMeal(nameOfP(stray)))
          return
        }
        // (nobody's: kept warm in the big bowl (out of the plating place, which the next seat needs), never binned; a potato, in the basket)
        if (!stray.container?.startsWith('bowl') && !stray.container?.startsWith('basket')) {
          SERVICE.waiting.delete(stray.key)
          stray.via = undefined
          stray.readyAt = undefined
          stray.collected = false
          stray.slot = null
          stray.trayAt = undefined
          stray.keepWarm = true
          collect(stray)
          say(L().orphanAway)
          return
        }
        // (already in the bowl, held for someone who went before it reached them: nobody's again, kept warm, not picked up over and over)
        stray.guest = -1
        stray.keepWarm = true
      }
    }
    // the chef cooks to the notes when they choose to (a better hand follows them more often), else by eye
    const follows = (p: Piece) => {
      const n = notes[p.id]
      if (!n) return null
      if (p.node.userData.follow === undefined) p.node.userData.follow = Math.random() < chef.seasonChance * 0.85
      return p.node.userData.follow ? n : null
    }
    const pullOf = (p: Piece) => {
      const n = follows(p)
      return n?.doneness !== undefined ? Math.min(1.45, Math.max(0.95, n.doneness)) : chef.pullAt
    }
    // (of those done, the one nearest burning first (item 207: the fire kept higher, done ones go over sooner, and in a rush the first found
    // was taken while one further on burnt waiting its turn))
    let ready: Piece | undefined
    if (hasChef) for (const p of live) {
      if (p.collected || p.staged || p.homeFlight < 1) continue
      const r = p.progress / roast.times[p.id]
      if (r >= pullOf(p) && (!ready || r > ready.progress / roast.times[ready.id])) ready = p
    }
    // what the chef means to put on a piece: what it was ordered with, else what the notes say worked best, else
    // what suits it (a less practised hand now and then forgets: decided once per piece)
    const planOf = (p: Piece): Exclude<Seasoning, 'water'>[] => {
      if (p.want) return p.want.dabs as Exclude<Seasoning, 'water'>[]
      if (p.node.userData.seasonOk === undefined) p.node.userData.seasonOk = Math.random() < chef.seasonChance
      if (!p.node.userData.seasonOk) return []
      const noted = follows(p)?.dabs
      const k = noted ? (Object.entries(noted).filter(([x, n]) => n > 0 && x !== 'water').sort((m, n) => n[1] - m[1])[0]?.[0] as
        Exclude<Seasoning, 'water'> | undefined) ?? null : bestSeasoning(p.id)
      return k ? [k] : []
    }
    // each seasoning at its own time, as a cook does: salt as it goes on, glazes just before it's done, wasabi,
    // shichimi, yuzu kosho and lemon once it's off
    const dueOnFire = (k: string, r: number) => {
      const at = bestStage(k)
      return at === 'before' || at === 'early' ? r < 0.6 : at === 'late' ? r >= 0.85 : false
    }
    const dab = (p: Piece, k: Exclude<Seasoning, 'water'>, quiet = false) => {
      // (none left in stock: it goes without, and the cook says so)
      if (!season(p, k)) { say(L().outOf(k)); return false }
      emit(k, p.node.position.clone().add(new THREE.Vector3(0, 0.25, 0)), 30)
      // (heard as by hand: its own sound, and over the coals the fire's sizzle (it was silent, the owner's))
      seasonSound(k)
      if (!p.collected && !p.staged) sizzleBurst(p.node.getWorldPosition(SIZZLE_AT), k === 'salt' ? 0.7 : 1)
      // (his hand over it as it goes on, the way it goes on (the owner's: it went on with nobody doing it): salt rubbed off his fingers, a
      // glaze brushed, a powder tapped off a spoon; not while it's in his hands to be carried)
      if (handLive && !p.collected && !p.staged && CHEF_CARRY.key === null) {
        OWNER_GRILL.dabUntil = performance.now() + 900
        OWNER_GRILL.dab = k === 'salt' ? 'pinch' : k === 'soy' || k === 'milk' || k === 'miso' ? 'brush' : 'spoon'
      }
      if (!quiet) say(L().seasoned(nameOfP(p), k))
      return true
    }
    if (ready && !busy()) {
      collect(ready)
      // (off the fire in his hands to the plating place, or kept warm in the bowl; one waiting by the fire for a place there is taken over when one's free (above))
      if (handLive && ready.collected && !inBasket(ready) && (ready.via === 'plated' ? ready.readyAt !== undefined : !!ready.container)) carry(ready, 'toPlate')
      say(L().done(nameOfP(ready)))
      // (and called out over his head, as a real kitchen calls a dish ready (item 180, the owner's: "the owner's words don't sound natural"))
      // (once for a dish however many of its pieces come off together: the same called three times running in two seconds (item 324));
      // and none within 2.5 s of the last, whatever it was, one on the floor answering it (item 372: the owner's voice was over everything)
      {
        const text = L().callDone(nameOfP(ready)), now = performance.now(), gap = now - lastCall.current.at
        if (gap > 3500 || (text !== lastCall.current.text && gap > 2500)) {
          STAFF_TALK.push({ key: now, id: 'owner', text, until: now + 2400 })
          lastCall.current = { text, at: now }
          crewAnswer(lang)
        }
      }
      for (const k of planOf(ready)) if (!ready.dabs[k] && bestStage(k) === 'after') dab(ready, k)
      return
    }
    // (half way through, the chef tends what's on: the salted ones' coals fanned a moment (a little heat banked for the fire), a glaze
    // brushed on at its own time below)
    const toTend = live.find((p) => !p.collected && !p.staged && p.homeFlight >= 1 && !p.tended && p.progress / roast.times[p.id] >= TEND_AT)
    if (toTend) {
      toTend.tended = true
      if (tendOf(planOf(toTend)) === 'fan' && CHEF_CARRY.key === null && fire && fire.current > 0.02) {
        OWNER_GRILL.fanUntil = performance.now() + 2200
        fanned.current.pending = Math.min(FAN_MAX - fanned.current.extra, fanned.current.pending + FAN_MAX * 0.25)
        fanned.current.last = performance.now()
        say(L().fanned(nameOfP(toTend)))
        return
      }
    }
    const toSeason = hasChef && live.find((p) => !p.collected && !p.staged && p.homeFlight >= 1 &&
      planOf(p).some((k) => !p.dabs[k] && dueOnFire(k, p.progress / roast.times[p.id])))
    if (toSeason) {
      const r = toSeason.progress / roast.times[toSeason.id]
      // (those due together, put on together and said in one breath (item 46): one by one only the first was heard, the chef's words coming
      // no more than one each 2.5 s, and a miso dish glazed with soy too read as 味噌烤鰤魚 刷上甘醇醬油, the miso never said)
      const went = planOf(toSeason).filter((k) => !toSeason.dabs[k] && dueOnFire(k, r)).filter((k) => dab(toSeason, k, true))
      if (went.length) say(L().seasoned(nameOfP(toSeason), went))
      return
    }
    const wrapped = live.find((p) => p.collected && inBasket(p) && !p.unwrapped && p.flight >= 1)
    if (wrapped) {
      wrapped.unwrapped = true
      return
    }
    // (the sous chef puts things on; with no sous chef, the second chef does it too)
    const next = hasSous || hasChef ? live.filter((p) => p.staged && !p.fetching && !((p.prepUntil ?? 0) > performance.now()) && (!p.sticks.length || p.skewerAt !== undefined))
      .sort((a, b) => a.stagedAt - b.stagedAt)[0] : undefined
    if (next && !busy() && putOnFire(next)) {
      // (in his hands from the board to its place in the fire)
      if (handLive) carry(next, 'toFire')
      say(L().onFire(nameOfP(next)))
    }
  }

  /**
   * AI customers, each one followed from the door to the bill: now and then one comes in (while there's a seat),
   * orders one to three things off the menu, eats only what they ordered as it comes off the grill (one piece at
   * a time), and when they've had it all leaves with their rating, the average of how good each was. Kept
   * waiting too long with nothing to eat, they walk out.
   */
  const runGuests = () => {
    // (patience is counted on the shop's own clock: it stops while the shop's closed or not on screen)
    guestTime.current += 0.8
    const now = guestTime.current
    guestClock.current += 0.8
    const seated = guests.current.filter((g) => !g.takeout && (g.state === 'waiting' || g.state === 'eating'))
    // (no room drawn, on a phone: nobody walks to the fridge, but they still help themselves to a drink, once each)
    if (!bar && onDrink) for (const g of seated) {
      if (g.state !== 'waiting' || drank.current.has(g.id) || Math.random() > 0.8 / 70) continue
      drank.current.add(g.id)
      onDrink(g.id, drinkFor(kindOf(g.id).kind, g.id))
    }
    // (how far into the session it is, a session being some minutes of the shop's clock, and so how busy the day's pattern runs just now)
    const dayK = (now - openedAt.current) / SESSION_LEN
    const fl = FLOWS[flow.current]
    // (the room's light: nobody comes into a dark shop, those in it say so once, and wait less long in a dim one, much less in the dark)
    const mood = roomMood(getLights().on, typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark')
    if (mood !== 'lit') {
      for (const g of seated) {
        if (darkSaid.current.has(g.id)) continue
        darkSaid.current.add(g.id)
        onSay?.('guest', L().dark(g.id), g.id)
        break
      }
    }
    /** what someone (number `id`) orders, `want` dishes at most: off the menu as listed (each charged and its stock taken), a portion kept
     * warm in the bowl or one cleared away made again where there is (the dine-in's and the takeaway's alike) */
    /** a bowl of rice or miso soup a customer would have had, and none in stock (item 229, the owner's 「明明有白飯 卻沒人點，味僧湯也是」: there was
     * none to be had, and nothing said why): said in the kitchen's log, once in a while, for it to be ordered in */
    const missedSide = (kind: 'rice' | 'soup') => {
      const now = performance.now()
      if (now - (sideSaid.current[kind] ?? -1e9) < SIDE_SAY_MS) return
      sideSaid.current[kind] = now
      onSay?.('chef', L().noSide(kind))
    }
    const placeOrders = (id: number, want: number, seated = true) => {
      const orders: string[] = []
      const said: string[] = []
      // (passed over for its price (game/orderPick's takesAt, item 210): if that's all they passed over, it was the prices that sent them off)
      let dear = 0
      // (each dish they want picked among what can still be had (game/orderPick, item 203: two picks at random, two sold out, and they went
      // out with "nothing to be had", one star, the menu still with dishes to be had): one that can't be had now tried once, another picked)
      if (entries) pickOrders(entries, Math.min(want, blessed ? 3 : 2), (e) => {
        // a dish (or a set) off the menu, made the way it's listed
        // (the miso soup too, ladled from the pot (the owner's, 2026-11-11): it was left off, not grilled, and every set with it never ordered)
        if (!e.parts.every((pt) => pt.id in roast.times || pt.id === 'MisoSoup' || KITCHEN_IDS.has(pt.id))) return false
        // (a dish off the stove, the fryer or the board: not to take away, and one a customer (game/station's sideAllowed, item 461's evening:
        // a takeaway with one was never ready, 'cooking' 228 shop minutes; with one or two each, those who'd ordered them sat hours))
        if (!sideAllowed(orders, e.parts.map((pt) => pt.id), seated)) return false
        // (a takeaway in the last half hour: only what can be grilled, packed and handed over by closing (game/takeout's fitsBeforeClose,
        // item 329), each part's time on the fire as it burns now; the soup's ladled)
        if (!seated && LAST_CALL.on) {
          const rate = roastRate(heatOf()), left = (CLOSE_AT - getClock().minute + 1440) % 1440
          if (!fitsBeforeClose(e.parts.map((pt) => (pt.id === 'MisoSoup' ? 0 : KITCHEN_IDS.has(pt.id) ? cookSeconds(pt.id) : (roast.times[pt.id] ?? 0) / rate)), left)) return false
        }
        if (Math.random() > takesAt(e.price, fairPrice(e))) { dear++; return false }
        wants.current.push(...e.parts)
        // (its parts: one kept warm in the bowl, where there is; else made from portions already used and cleared, where there are any)
        const again: Piece[] = [], warm: Piece[] = []
        for (const pt of e.parts) {
          const w = warmFor(pt.id, new Set(warm))
          if (w) { warm.push(w); continue }
          const q = recyclable(pt.id, new Set(again))
          if (q) again.push(q)
        }
        const reuse: Record<string, number> = {}
        for (const q of [...again, ...warm]) reuse[q.id] = (reuse[q.id] ?? 0) + 1
        // (those kept warm are cooked and paid for already: none taken from stock or costed again (item 203); the ones made again from a
        // piece cleared away are new portions, as ever)
        const kept: Record<string, number> = {}
        for (const q of warm) kept[q.id] = (kept[q.id] ?? 0) + 1
        if (onOrderEntry?.(e.key, id, reuse, seated, kept)) {
          // (its prep: rice washed and cooked, the soup, what's rinsed)
          meterWater('cooking', e.parts.length)
          for (const q of again) revive(q)
          // (the bowl's held for them: carried over to them from there (the stray's way, next))
          for (const q of warm) { q.guest = id; q.keepWarm = false }
          orders.push(...e.parts.map((pt) => pt.id))
          said.push(lang === 'ja' ? e.ja ?? e.name : lang === 'en' ? e.parts.map((pt) => partName({ name: pt.name, en: nameOf(pt.id) }, nameOf(pt.id), pt.id, pt.dabs as Dab[], 'en')).join(' & ') : e.name)
          return true
        }
        wants.current.splice(wants.current.length - e.parts.length, e.parts.length)
        return false
      })
      else pickOrders(itemIds.filter((x) => x in roast.times || x === 'MisoSoup' || (seated && KITCHEN_IDS.has(x))), want, (pick) => {
        if (!sideAllowed(orders, [pick], seated)) return false
        const warm = warmFor(pick, new Set())
        const again = !warm ? recyclable(pick, new Set()) : undefined
        if (!onOrder?.(pick, id, !!(again || warm))) return false
        if (again) revive(again)
        if (warm) { warm.guest = id; warm.keepWarm = false }
        orders.push(pick)
        said.push(nameOf(pick))
        return true
      })
      // (a bowl of miso soup alongside, as many have (the owner's, 2026-11-11: the soup ordered): charged and taken from the stock as any
      // order is, ladled from the pot; sat at the bar, most of those having fish (item 205: one in three, whatever they had, and it was
      // never seen ladled or carried, so the owner never saw it ordered))
      const fishy = seated && bar
      if (orders.length && !orders.includes('MisoSoup') && Math.random() < (fishy ? sideChance('soup', orders) : SOUP_SIDE)) {
        if (onOrder?.('MisoSoup', id, false)) {
          orders.push('MisoSoup')
          said.push(nameOf('MisoSoup'))
        } else if (SUPPLIES.has('MisoSoup') === 0) missedSide('soup')
      }
      // (and a bowl of rice, sat at the bar (item 205: there was none to be had): scooped from the cooker and carried out as the soup is)
      if (fishy && orders.length && Math.random() < sideChance('rice', orders)) {
        if (SIDE_SALE.sell(RICE_SIDE.id, id)) {
          orders.push(RICE_SIDE.id)
          said.push(riceName(lang))
        } else if (SUPPLIES.has(RICE_SIDE.stock) === 0) missedSide('rice')
      }
      // (and some a tokkuri of sake, sat at the bar (item 89, the owner's: "it's on the menu, the customers order it"; they never did): charged
      // and taken from the stock as any order is, poured from the stand)
      // (never to one under age (item 203: a pupil was poured one like anyone), nor to a taxi driver on his break (item 377))
      // (more of them for each make the owner's tasted at the stand: the floor staff speak for it (item 363, game/sakeTasting))
      if (seated && orders.length && drinksAlcohol(id) && Math.random() < sakeChance(SAKE_SIDE, SAKE_TASTED.list) && onOrder?.('Sake', id, false)) {
        orders.push('Sake')
        said.push(nameOf('Sake'))
        // (theirs till it's poured: out of the stock, still in the bottle (item 199))
        SAKE.unpoured.add(id)
      }
      return { orders, said, dear: !orders.length && dear > 0 }
    }
    // the bench in the genkan (bar.ts's BENCH, the owner's): the first sat waiting called to a stool that's come free (ordering then, as anyone
    // coming in does); one who's waited too long there, or with the shop closing or past its last call, off out of the door again
    if (BENCH.ids.length) {
      const used = new Set(guests.current.filter((g) => g.state === 'waiting' || g.state === 'eating' || !g.cleared).map((g) => g.seat))
      for (const n of SEATS_TAKEN) used.add(n)
      // (nor one not yet cleared and laid again since its last customer (item 600))
      for (const n of SEATS_UNCLEARED) used.add(n)
      const seat = Array.from({ length: BAR_SEATS }, (_, n) => n).find((n) => !used.has(n))
      for (const id of [...BENCH.ids]) {
        // (or past their hour while they waited (data/guests' pastHour, item 377): a child, a high schooler, the old folk gone home, not sat down)
        if (SHOP.closing || LAST_CALL.on || !onOrder || now - (BENCH.since.get(id) ?? now) > BENCH_WAIT || pastHour(id, getClock().minute)) {
          BENCH.ids = BENCH.ids.filter((x) => x !== id)
          BENCH.since.delete(id)
          BENCH.gone.add(id)
          onSay?.('guest', L().benchGone(id), id)
          onVisit?.({ id, taste: null, waited: BENCH_WAIT, walkedOut: true, gripes: ['wait'] })
        }
      }
      if (seat !== undefined && BENCH.ids.length && onOrder && !SHOP.closing && !LAST_CALL.on) {
        const id = BENCH.ids.shift()!
        BENCH.since.delete(id)
        const want = Math.max(1, wantOf(flow.current, Math.random(), Math.random())) + (blessed && Math.random() < 0.6 ? 1 : 0) + (LATE.on && Math.random() < LATE_MORE ? 1 : 0)
        const { orders, said, dear } = placeOrders(id, want)
        if (orders.length) {
          BENCH.up.add(id)
          guests.current.push({ id, orders, ate: [], eaten: [], since: now, state: 'waiting', seat })
          if (bar) SAY_SEATED.lines.set(id, L().order(id, said))
          else onSay?.('guest', L().order(id, said), id)
          // (said back as it's taken, by the owner (crewTalk, item 324))
          crewEcho(lang, said.slice(0, 2).join(lang === 'en' ? ', ' : '、'))
        } else {
          BENCH.gone.add(id)
          onSay?.('guest', dear ? L().dear(id) : L().nothing(id), id)
          onVisit?.({ id, taste: null, waited: 0, walkedOut: true, gripes: [dear ? 'dear' : 'nothing'] })
        }
        report()
      }
    }
    // (no one more sat down in the last half hour before closing (game/hours' lastCall): takeaways only then, below)
    // (every stool taken, still one comes in if there's room on the bench to wait)
    if (onOrder && !SHOP.closing && !LAST_CALL.on && comesIn(mood) && (seated.length < MAX_SEATED || (bar && BENCH.ids.length < BENCH_SEATS)) && guestClock.current > (7 + Math.random() * 6) * crowd * fl.gap(dayK) * hourGap(getClock().minute) * showerGap(weatherOf(businessDay(getClock().day, getClock().minute)), getClock().minute) / RATING_FLOW.more) {
      guestClock.current = 0
      // (someone still getting up counts as there: the stool's not free till they've gone and their plate's cleared)
      const used = new Set(guests.current.filter((g) => g.state === 'waiting' || g.state === 'eating' || !g.cleared).map((g) => g.seat))
      // (nor one the room still has somebody at: getting up and going, or away at the toilet; nor one not yet cleared and laid again since its
      // last customer (item 600: the next sat down to their used chopsticks))
      for (const n of SEATS_TAKEN) used.add(n)
      for (const n of SEATS_UNCLEARED) used.add(n)
      const free = (n: number) => n < BAR_SEATS && !used.has(n)
      // now and then a couple comes in together, if two stools side by side on one counter are free: a young man and
      // a young woman (the next ids that are), sat next to each other
      const pairAt = Math.random() < Math.min(0.9, fl.pairs * flowerBuffs(SHRINE_FLOWERS).pairs)
        ? Array.from({ length: BAR_SEATS - 1 }, (_, n) => n).find((n) => free(n) && free(n + 1) && GRILL_SEATS[n].counter === GRILL_SEATS[n + 1].counter)
        : undefined
      // (each part of the night its own crowd: the next number that would come in then (data/guests' comesAt, item 377: no child after eight,
      // no high schooler after ten, the taxis and the fish market's hands at dawn))
      const minute = getClock().minute
      const crowdOk = (i: number) => comesAt(i, minute)
      let first = guestSeq.current + 1
      while (!crowdOk(first) && first < guestSeq.current + 400) first++
      let ids = [first]
      // (a pair: in the early evening and at dinner as often as not a grown-up and their child (data/guests' familyShare), else a couple)
      const withChild = pairAt !== undefined && Math.random() < familyShare(minute)
      if (pairAt !== undefined) {
        const pairOk = (i: number) => (withChild ? WITH_CHILD.has(kindOf(i).kind) && kindOf(i + 1).kind === 'kid'
          : COUPLE_HIM.has(kindOf(i).kind) && COUPLE_HER.has(kindOf(i + 1).kind)) && crowdOk(i) && crowdOk(i + 1)
        let i = guestSeq.current + 1
        while (!pairOk(i) && i < guestSeq.current + 600) i++
        if (i < guestSeq.current + 600) ids = [i, i + 1]
      }
      const couple = ids.length === 2
      const family = couple && kindOf(ids[1]).kind === 'kid'
      for (const [k, id] of ids.entries()) {
        // (a stool for them, before they order: with every one taken, or someone still at it, or others already waiting on the bench, one on
        // their own sits down on the bench to wait their turn if there's room on it (a couple doesn't); else they don't come in)
        const seatFor = couple ? pairAt! + k : BENCH.ids.length ? undefined : Array.from({ length: BAR_SEATS }, (_, n) => n).find((n) => !used.has(n))
        if (!couple && seatFor === undefined && bar && BENCH.ids.length < BENCH_SEATS) {
          guestSeq.current = Math.max(guestSeq.current, id)
          BENCH.ids.push(id)
          BENCH.since.set(id, now)
          onSay?.('guest', L().benchWait(id), id)
          continue
        }
        if (seatFor === undefined || used.has(seatFor)) continue
        // (the deep night's crowd orders more (the owner's: a different class of customer then))
        const want = Math.max(1, wantOf(flow.current, Math.random(), Math.random())) + (blessed && Math.random() < 0.6 ? 1 : 0) + (LATE.on && Math.random() < LATE_MORE ? 1 : 0)
        const { orders, said, dear } = placeOrders(id, want)
        guestSeq.current = Math.max(guestSeq.current, id)
        if (orders.length) {
          const seat = seatFor
          used.add(seat)
          guests.current.push({ id, orders, ate: [], eaten: [], since: now, state: 'waiting', seat, partner: couple ? ids[1 - k] : undefined, family: family || undefined })
          if (bar) SAY_SEATED.lines.set(id, L().order(id, said))
          else onSay?.('guest', L().order(id, said), id)
          // (said back as it's taken, by the owner (crewTalk, item 324))
          crewEcho(lang, said.slice(0, 2).join(lang === 'en' ? ', ' : '、'))
        } else {
          onSay?.('guest', dear ? L().dear(id) : L().nothing(id), id)
          // (came in and found nothing they could have: a visit of its own, and not a happy one)
          onVisit?.({ id, taste: null, waited: 0, walkedOut: true, gripes: [dear ? 'dear' : 'nothing'] })
        }
      }
      // (a couple only if both of them stayed: one who found nothing to order went, and the other sits alone)
      if (couple) {
        const both = ids.every((x) => guests.current.some((g) => g.id === x))
        if (!both) for (const g of guests.current) if (ids.includes(g.id)) g.partner = undefined
      }
      // (only those still here and the last few gone are kept: the list doesn't grow all day)
      guests.current = guests.current.filter((g, i, all) => g.state === 'waiting' || g.state === 'eating' || !g.cleared ||
        i >= all.length - 12)
      report()
    }
    // takeaways and deliveries (game/takeout, the owner's): now and then one at the till, more often in the last half hour; not on a phone (no
    // room to walk them in), nor while closing up
    takeoutClock.current += 0.8
    if (onOrder && bar && !SHOP.closing && comesIn(mood) && TAKEOUT.orders.filter((o) => !o.gone).length < TAKEOUT_MAX &&
      takeoutClock.current > takeoutGap(LAST_CALL.on, crowd) * (0.6 + Math.random() * 0.8)) {
      takeoutClock.current = 0
      const rider = Math.random() < RIDER_SHARE
      // (a rider the next number that'd take the work (data/guests' canRide): a yukata lady came for a delivery, helmet and box on her back)
      let id = guestSeq.current + 1
      // (one who comes for it themselves, one who'd be about then (item 377: no child at the till at three in the morning))
      const minute = getClock().minute
      while ((rider ? !canRide(id) : !comesAt(id, minute)) && id < guestSeq.current + 400) id++
      guestSeq.current = id
      // (a rider's order is the platform's: it keeps its cut (bar's RIDERS, item 210))
      if (rider) RIDERS.add(id)
      const { orders, said } = placeOrders(id, takeoutSize(rider, Math.random()), false)
      if (!orders.length) RIDERS.delete(id)
      if (orders.length) {
        guests.current.push({ id, orders, ate: [], eaten: [], since: now, state: 'waiting', seat: -1, takeout: true })
        // (its soup in a cup of its own, not in the box: only what's grilled is packed there)
        TAKEOUT.orders.push({ id, rider, items: orders.filter((x) => x !== 'MisoSoup' && !KITCHEN_IDS.has(x)).length, packed: 0, ready: false, taken: false, handed: false, gone: false })
        onSay?.('chef', L().takeoutOrder(said, rider))
      }
    }
    // (each one's food packed as it's done (its pieces in the box: Roasting's collect, serveTo); taken out by a server, those pieces done
    // with; gone out of the door, the order let go)
    for (const o of TAKEOUT.orders) {
      const g = guests.current.find((x) => x.id === o.id)
      if (!g) { o.gone = true; RIDERS.delete(o.id); continue }
      const mine = pieces.current.filter((p) => p.guest === o.id && p.container === 'takeout' && !p.eaten)
      o.packed = mine.filter((p) => p.flight >= 1 && !p.carried).length
      o.ready = o.packed >= o.items
      if (o.taken && g.state === 'waiting') {
        for (const p of mine) { p.eaten = true; p.slot = null }
        g.state = 'done'
        g.cleared = true
      }
    }
    for (const o of TAKEOUT.orders) if (o.gone) RIDERS.delete(o.id)
    TAKEOUT.orders = TAKEOUT.orders.filter((o) => !o.gone)
    // (a box under another taken away: those over it come down onto the table, their food with them)
    TAKEOUT.orders.filter((o) => !o.taken && o.tier !== undefined).sort((a, b) => a.tier! - b.tier!).forEach((o, k) => {
      if (o.tier === k) return
      const d = (o.tier! - k) * BOX_TIER
      o.tier = k
      for (const p of pieces.current) if (p.guest === o.id && p.container === 'takeout' && !p.eaten) { p.local.y -= d; p.toP.y -= d; p.fromP.y -= d }
    })
    // someone kept waiting too long goes: till something off the fire's come, a soup or a sake before it no reason to wait longer for the rest
    // (item 203: a bowl of soup started the between-dishes clock, half an hour, and a fish that takes three quarters of an hour at a middling
    // fire never reached them: up and off mid-meal, refunded, a bad word left)
    // (how near the end of their patience each one waiting for their first dish is, for their face and the steam off them (item 347))
    for (const id of [...FUMING.keys()]) if (!seated.some((g) => g.id === id)) FUMING.delete(id)
    // (and the staff feel it (item 381, game/crewMood): the shop's load from those waiting for their food, as last reckoned)
    CREW_LOAD.value = loadOf([...FUMING.values()])
    for (const id of [...CALM_ASK.used.keys()]) if (!seated.some((g) => g.id === id)) CALM_ASK.used.delete(id)
    // (the owner seeing to those kept waiting (item 348, game/calm): each way once, their wait's start moved on; the owner's word, then theirs)
    {
      const limit = PATIENCE * flowerBuffs(SHRINE_FLOWERS).patience * patienceIn(mood) * RATING_FLOW.patience
      for (const a of CALM_ASK.q.splice(0)) {
        const g = seated.find((x) => x.id === a.id)
        const used = CALM_ASK.used.get(a.id) ?? []
        if (!g || g.lastAte !== undefined || used.includes(a.kind)) continue
        g.since = calmedSince(g.since, now, limit, a.kind)
        CALM_ASK.used.set(a.id, [...used, a.kind])
        CALM_ASK.onDone?.(a.id, a.kind)
        STAFF_SAY.say('owner', CALM_OWNER[a.kind])
        const back = CALM_GUEST[a.kind][lang]
        window.setTimeout(() => onSay?.('guest', back[Math.floor(Math.random() * back.length)], a.id), 1500)
      }
    }
    // (a customer sat at ease, now and then, of the room's things: a look at it and a word (item 348); once a visit at most, a third of them)
    for (const g of seated) {
      g.propAt ??= now + 18 + Math.random() * 50
      if (g.propAt < 0 || now < g.propAt) continue
      g.propAt = -1
      if (Math.random() > 0.35 || (FUMING.get(g.id) ?? 0) > 0.3) continue
      const things = (['altar', 'window', 'fridge', 'cat'] as const).map((k) => [k, room.getObjectByName(k === 'cat' ? 'lucky-cat' : `look-${k}`)] as const).filter(([, o]) => !!o)
      if (!things.length) continue
      const [k, o] = things[Math.floor(Math.random() * things.length)]
      o!.getWorldPosition(GAZE_AT)
      GAZE.set(g.id, { x: GAZE_AT.x, z: GAZE_AT.z, until: performance.now() + 4200 })
      const lines = PROP_TALK[k][lang]
      onSay?.('guest', lines[Math.floor(Math.random() * lines.length)], g.id)
    }
    for (const g of seated) {
      const limit = PATIENCE * flowerBuffs(SHRINE_FLOWERS).patience * patienceIn(mood) * RATING_FLOW.patience
      FUMING.set(g.id, g.lastAte === undefined ? Math.min(1, (now - g.since) / limit) : 0)
      if (g.lastAte === undefined && now - g.since > limit) {
        g.state = 'angry'
        if (mood === 'dark') gripe(g.id, 'dark')
        const owed = [...g.orders]
        for (const a of g.ate) owed.splice(owed.indexOf(a), 1)
        onWalkOut?.(owed, g.id, 'first')
        onSay?.('guest', mood === 'dark' ? L().darkGone(g.id) : L().angry(g.id), g.id)
        report()
      }
    }
    // (and a takeaway or a delivery waited for as long as one sat in waits for their first, then given up: off without it, given back what
    // they paid, a word left (item 203: they stood in the genkan all night for a box that never came))
    for (const g of guests.current) {
      if (!g.takeout || g.state !== 'waiting' || now - g.since <= PATIENCE * flowerBuffs(SHRINE_FLOWERS).patience * RATING_FLOW.patience) continue
      const o = TAKEOUT.orders.find((x) => x.id === g.id)
      if (o?.taken) continue
      g.state = 'angry'
      g.cleared = true
      if (o) o.gone = true
      onWalkOut?.([...g.orders], g.id, 'takeout')
      onSay?.('guest', L().angry(g.id), g.id)
      onVisit?.({ id: g.id, taste: null, waited: now - g.since, walkedOut: true, gripes: ['wait'] })
      report()
    }
    // someone who's finished (or walked out): once the last piece is eaten they get up and their plate is taken away
    // (GuestBar3D: it's told when they're done, after that last piece, and clears the plate a moment later), and
    // the bare sticks on it go with it
    for (const g of guests.current) {
      if (g.state === 'waiting' || g.state === 'eating' || g.cleared) continue
      if (pieces.current.some((p) => p.guest === g.id && p.eat > 0 && !p.stickOnly && !p.eaten)) continue
      if (g.state === 'done' && (g.sideUntil ?? 0) > now) continue
      g.leftAt ??= now
      if (now - g.leftAt < 1.6) continue
      g.cleared = true
      // (what they leave at their place to be washed (item 600, the owner's: the bowls, the renge and the chopsticks as the plates are): their
      // bowls as they were brought, and their chopsticks if they ate with them (a pair laid there); GuestBar3D clears them with their plate)
      if (g.seat >= 0 && !g.takeout) {
        const left = leftBehind({ rice: RICE_SEATS.has(g.seat) && BOWLS.setAt.has(`rice:${g.seat}`), soup: SOUP_SEATS.has(g.seat) && BOWLS.setAt.has(`soup:${g.seat}`),
          // (ate anything: rice and soup with them too, not only what's off the fire (only that has the pair up in their hand: CHOPS_UP))
          ate: (CHOPS_USED.has(g.seat) || g.eaten.length > 0) && !CHOPS_OFF.has(g.seat) })
        CHOPS_USED.delete(g.seat)
        if (wareCount(left) > 0) SEAT_LEFT.set(g.seat, addWares(SEAT_LEFT.get(g.seat) ?? noWares(), left))
      }
      // (their soup bowl off the drawn ones at the places, and their rice bowl (GuestBar3D draws them left there now, item 600); their bowls
      // not yet brought, not to be now)
      if (SOUP_SEATS.delete(g.seat)) SOUP.served++
      if (RICE_SEATS.delete(g.seat)) BOWLS.ver++
      // (and the dishes from the stove and the fryer at their place, and what of theirs wasn't made yet (items 461, 469))
      if (KITCHEN.seats.delete(g.seat)) KITCHEN.ver++
      KITCHEN.want = KITCHEN.want.filter((x) => x.guest !== g.id)
      KITCHEN.asked.delete(g.id)
      BOWLS.setAt.delete(`rice:${g.seat}`)
      BOWLS.setAt.delete(`soup:${g.seat}`)
      BOWLS.want = BOWLS.want.filter((x) => x.guest !== g.id)
      BOWLS.asked.delete(g.id)
      BOWLS.got.delete(`rice:${g.id}`)
      BOWLS.got.delete(`soup:${g.id}`)
      if (SAKE_SEATS.delete(g.seat)) SAKE.served++
      // (a tokkuri asked for them and not brought: not to be poured now)
      const wi = SAKE.want.indexOf(g.id)
      if (wi >= 0) SAKE.want.splice(wi, 1)
      SAKE.ready.delete(g.id)
      sakeAsked.current.delete(g.id)
      SAKE.unpoured.delete(g.id)
      // (their visit, scored: the food, the wait for it, what put them out (the tissues, the toilet, the dark, their stomach))
      const gr = GRIPES.get(g.id) ?? new Set<Gripe>()
      if (SICK.has(g.id)) gr.add('sick')
      if (WC_GRUMBLE.has(g.id)) gr.add('toilet')
      const waited = (g.firstAte ?? now) - g.since
      if (waited > 180) gr.add('wait')
      onVisit?.({ id: g.id, taste: g.eaten.length ? g.eaten.reduce((a, b) => a + b, 0) / g.eaten.length : null, waited, walkedOut: g.state === 'angry', gripes: [...gr] })
      GRIPES.delete(g.id)
      for (const p of pieces.current) {
        if (p.guest !== g.id || p.container !== 'bar') continue
        p.eaten = true
        p.slot = null
      }
    }
    // (who has food before them: drawn eating only then (bar.ts's FED))
    FED.clear()
    // (a tokkuri sold to someone no longer here (the shop shut on them, the day over): not to be poured (item 199))
    if (SAKE.unpoured.size) for (const id of SAKE.unpoured) if (!guests.current.some((g) => g.id === id)) SAKE.unpoured.delete(id)
    for (const p of pieces.current) if (p.container === 'bar' && p.guest >= 0 && p.collected && p.flight >= 1 && !p.eaten && !p.stickOnly && p.via !== 'plated' && present(p)) FED.add(p.guest)
    /** a customer's tokkuri: asked for the first time (SAKE.want: poured by hand at the sake station on the serving counter and carried out to
     * them on a server's tray, GuestBar3D, item 177); whether it's been set at their place now (SAKE.ready); with no station or nobody to pour
     * at it (SAKE.station false: a bar on its own), set at their place after SAKE_WAIT_S as it was */
    const sakePoured = (id: number, now: number) => {
      const asked = sakeAsked.current.get(id)
      if (asked === undefined) { sakeAsked.current.set(id, now); SAKE.want.push(id); return false }
      const done = SAKE.ready.delete(id)
      const queued = SAKE.want.indexOf(id)
      if (!done && !(queued >= 0 && !SAKE.station && now - asked > SAKE_WAIT_S)) return false
      if (!done) SAKE.want.splice(queued, 1)
      sakeAsked.current.delete(id)
      SAKE.unpoured.delete(id)
      return true
    }
    // a guest eats a piece of what they ordered, if it's ready (each one piece at a time: the whole shop waited on one mouthful at a time
    // before, and with the room full everyone sat on and on)
    for (const g of guests.current) {
      if (g.state !== 'waiting' && g.state !== 'eating') continue
      // (a takeaway's eaten at home)
      if (g.takeout) continue
      if (pieces.current.some((p) => p.guest === g.id && p.eat > 0 && !p.eaten && !p.stickOnly)) continue
      // (eaten some, and the rest long in coming (lost, or the kitchen swamped): up to pay for what they've had, the rest let go, not sat
      // at an empty plate for ever)
      // (or hurried out half an hour past closing (SHOP.hurry), nothing before them: up to pay for what they've had, the rest refunded)
      // (or sat their time out (game/stay, item 207): up to pay for what they've had, the rest given back)
      if ((g.state === 'eating' && !FED.has(g.id) && gaveUpOnNext(g.lastAte ?? now, now)) || (SHOP.hurry && !FED.has(g.id))
        || (g.ate.length > 0 && !FED.has(g.id) && overstayed(g.since, now))) {
        const owed = [...g.orders]
        for (const a of g.ate) owed.splice(owed.indexOf(a), 1)
        const why = SHOP.hurry && !FED.has(g.id) ? 'hurry' : g.state === 'eating' && gaveUpOnNext(g.lastAte ?? now, now) ? 'next' : 'stay'
        g.state = 'done'
        if (!SHOP.hurry || g.ate.length === 0) gripe(g.id, 'wait')
        onWalkOut?.(owed, g.id, why)
        report()
        continue
      }
      const owed = [...g.orders]
      for (const id of g.ate) owed.splice(owed.indexOf(id), 1)
      // (their dishes from the stove, the fryer and the board (items 461, 469): each asked for once (bar.ts's KITCHEN), made at its station by
      // the third cook and carried out to them (GuestBar3D); theirs, and eaten, once set at their place. A takeaway's, or with no room drawn,
      // made meanwhile: had once its time's gone by)
      const dishOwed = owed.filter((id) => KITCHEN_IDS.has(id))
      if (space === 'open' && dishOwed.length) {
        if (bar && !g.takeout) {
          const asked = KITCHEN.asked.get(g.id) ?? []
          const left = [...asked]
          for (const id of dishOwed) {
            const k = left.indexOf(id)
            if (k >= 0) left.splice(k, 1)
            else { KITCHEN.want.push({ guest: g.id, id, at: performance.now() }); asked.push(id) }
          }
          KITCHEN.asked.set(g.id, asked)
          const got = dishOwed.find((id) => (KITCHEN.got.get(`${id}:${g.id}`) ?? 0) > 0)
          if (got) {
            const key = `${got}:${g.id}`
            KITCHEN.got.set(key, (KITCHEN.got.get(key) ?? 1) - 1)
            asked.splice(asked.indexOf(got), 1)
            g.firstAte ??= now
            g.eaten.push(Math.max(0, DISH_TASTE - (WC_GRUMBLE.get(g.id) ?? 0)))
            g.ate.push(got)
            g.sideUntil = Math.max(g.sideUntil ?? 0, now + SIDE_EAT_S)
            g.state = g.eaten.length >= g.orders.length ? 'done' : 'eating'
            report()
            return
          }
        } else if (now - g.since > cookSeconds(dishOwed[0]) + 6) {
          g.firstAte ??= now
          g.eaten.push(Math.max(0, DISH_TASTE - (WC_GRUMBLE.get(g.id) ?? 0)))
          g.ate.push(dishOwed[0])
          g.state = g.eaten.length >= g.orders.length ? 'done' : 'eating'
          report()
          return
        }
      }
      // (their rice and soup, sat at the bar with the room drawn (items 205, 206): asked for once, scooped and ladled at the counter and carried
      // out to them (bar.ts's BOWLS, GuestBar3D); theirs, and eaten, once they're set down at their place)
      if (space === 'open' && bar && !g.takeout && (owed.includes('MisoSoup') || owed.includes(RICE_SIDE.id))) {
        if (!BOWLS.asked.has(g.id)) {
          BOWLS.asked.add(g.id)
          BOWLS.want.push({ guest: g.id, rice: owed.includes(RICE_SIDE.id), soup: owed.includes('MisoSoup') })
        }
        const got = owed.includes(RICE_SIDE.id) && BOWLS.got.has(`rice:${g.id}`) ? RICE_SIDE.id : owed.includes('MisoSoup') && BOWLS.got.has(`soup:${g.id}`) ? 'MisoSoup' : null
        if (got) {
          BOWLS.got.delete(`${got === 'MisoSoup' ? 'soup' : 'rice'}:${g.id}`)
          // (something to start on, but not a dish off the fire: the wait for the rest goes on from when they sat down (item 203))
          g.firstAte ??= now
          g.eaten.push(Math.max(0, SOUP_TASTE - (WC_GRUMBLE.get(g.id) ?? 0)))
          g.ate.push(got)
          g.sideUntil = Math.max(g.sideUntil ?? 0, now + SIDE_EAT_S)
          g.state = g.eaten.length >= g.orders.length ? 'done' : 'eating'
          report()
          return
        }
      }
      // (their miso soup: ladled from the pot a while after they've ordered, once it's hot, set at their place and drunk (bar.ts's SOUP_SEATS);
      // the pot run dry, they wait for the next (the third cook makes it); a takeaway's in a cup with the box; with no room drawn (a phone),
      // as it always was)
      if (space === 'open' && (!bar || g.takeout) && owed.includes('MisoSoup') && now - g.since > SOUP_SERVE_S && soupReady(SOUP.pot, SOUP.left)) {
        const b = takeBowl(SOUP.pot, SOUP.left)
        SOUP.pot = b.pot
        SOUP.left = b.left
        if (!g.takeout) { SOUP_SEATS.add(g.seat); SOUP.served++ }
        // (something to start on, but not a dish off the fire: the wait for the rest goes on from when they sat down (item 203))
        g.firstAte ??= now
        g.eaten.push(Math.max(0, SOUP_TASTE - (WC_GRUMBLE.get(g.id) ?? 0)))
        g.ate.push('MisoSoup')
        g.state = g.eaten.length >= g.orders.length ? 'done' : 'eating'
        report()
        return
      }
      // (their sake: a little after they've ordered, asked for (SAKE.want): poured at the sake station on the serving counter and carried out on
      // a server's tray, who sets it at their place (SAKE.ready, SAKE_SEATS: GuestBar3D, item 177); then drunk. With no station (a bar on its
      // own), set at their place after SAKE_WAIT_S)
      if (space === 'open' && owed.includes('Sake') && now - g.since > SAKE_SERVE_S && sakePoured(g.id, now)) {
        SAKE_SEATS.add(g.seat)
        SAKE.served++
        g.firstAte ??= now
        g.eaten.push(Math.max(0, SOUP_TASTE - (WC_GRUMBLE.get(g.id) ?? 0)))
        g.ate.push('Sake')
        g.state = g.eaten.length >= g.orders.length ? 'done' : 'eating'
        report()
        return
      }
      const dish = pieces.current.find((p) => present(p) && p.collected && p.flight >= 1 && !p.eaten && !p.stickOnly &&
        // (with the shop open only their own, and only once it's set before them (via 'plated': still on the plating place, the server not
        // there yet): one nobody's in the kitchen's bowl, or their own on the plating place, was eaten where it lay, from the bar, and what was
        // cooked after came off the fire for nobody, into the bowl: the bowl filled with twenty and more an hour in; the bowl's go to the next
        // owed one through serveTo, carried)
        p.trash < 0 && owed.includes(p.id) && (space === 'open' ? p.guest === g.id && p.container === 'bar' && p.via !== 'plated' : p.guest === g.id || p.guest < 0) && stageOf(p.progress / roast.times[p.id]).key === 'done')
      if (!dish) continue
      if (inBasket(dish) && !dish.unwrapped) {
        dish.unwrapped = true
        return
      }
      // (not made the way it's on the menu: not what they ordered)
      const asOrdered = !dish.want || dish.want.dabs.slice().sort().join() ===
        Object.entries(dish.dabs).filter(([k, n]) => n > 0 && k !== 'water').map(([k]) => k).sort().join()
      // (and as fresh as what it was made from: a tired fish tastes of it)
      // (and as they're feeling: a dirty toilet, or one with no paper, sours what they eat after it)
      const fresh = PANTRY.used[dish.id] ?? PANTRY.fresh[dish.id] ?? 100
      const taste = Math.max(0, tasteOf(dish) * freshFactor(fresh) - (asOrdered ? 0 : 15) - (WC_GRUMBLE.get(g.id) ?? 0))
      // (made with what wasn't fit to eat: likely as not it upsets their stomach, and they're off to the toilet)
      const sick = Math.random() < sickChance(fresh)
      dish.node.userData.byGuest = true
      eat(dish)
      g.firstAte ??= now
      g.lastAte = now
      g.eaten.push(taste)
      g.ate.push(dish.id)
      g.state = g.eaten.length >= g.orders.length ? 'done' : 'eating'
      const stars = taste >= 80 ? 5 : taste >= 65 ? 4 : taste >= 45 ? 3 : taste >= 25 ? 2 : 1
      window.setTimeout(() => {
        if (sick) SICK.add(g.id)
        onSay?.('guest', sick ? L().sick(g.id, nameOfP(dish)) : L().verdict(g.id, nameOfP(dish), stars), g.id)
        report()
      }, EAT_SECONDS * 1000)
      return
    }
  }
  const [saltInHand, setSaltInHand] = useState(false)
  const hand = useRef<THREE.Group>(null)
  const controls = useThree((s) => s.controls) as unknown as { enabled: boolean } | null

  // seasonings beside the fire (salt, soy and brush, condensed milk, peanut powder): pick one up, carry it over a
  // piece of food and let go to season that piece
  const tools = useMemo(() => Object.entries(roast.tools ?? {}).flatMap(([name, kind]) => {
    const node = root.getObjectByName(name)
    return node ? [{ node, kind, home: node.position.clone(), home0: node.position.clone(),
      homeQ: node.quaternion.clone(), back: 1 }] : []
  }), [root, roast.tools])
  // (the utensils' thin handles cast no shadow: from the spot high over the bar they only laid thin dark stripes across the table)
  useEffect(() => {
    for (const t of tools) t.node.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = false })
  }, [tools])
  // the seasoning box and what stands in it (but not the utensils, which have their own homes), for dragging
  // the seasoning box and the water bucket: each moves as one with whatever stands in it (the utensils have their
  // own homes, which move along)
  const carriers = useMemo(() => {
    const group = (names: string[] | undefined) => (names ?? []).flatMap((name) => {
      const node = root.getObjectByName(name)
      if (!node || Object.prototype.hasOwnProperty.call(roast.tools ?? {}, name)) return []
      return [{ node, home: node.position.clone() }]
    })
    const out: Record<string, { node: THREE.Object3D; home: THREE.Vector3 }[]> = {}
    const box = group(roast.toolBox)
    const bucket = group(roast.bucket)
    if (box.length) out.box = box
    if (bucket.length) out.bin = bucket
    return out
  }, [root, roast.toolBox, roast.bucket, roast.tools])
  useLayoutEffect(() => {
    // (the seasoning box turned right round, about its own middle: its pots and spoons swung with it)
    const bx = root.getObjectByName('SeasoningBox')
    if (bx && !bx.userData.turned) {
      bx.userData.turned = true
      const n = nudge('box')
      const c = (carriers.box?.[0]?.home ?? bx.position).clone()
      const flip = (v: THREE.Vector3) => new THREE.Vector3(2 * c.x - v.x, v.y, 2 * c.z - v.z)
      for (const k of carriers.box ?? []) {
        k.home.copy(flip(k.home))
        k.node.position.copy(k.home).add(n)
        k.node.rotation.y += Math.PI
      }
      for (const t of tools) if (carrierOf(t.node.name) === 'box') {
        t.home0.copy(flip(t.home0))
        t.home.copy(t.home0).add(n)
        if (t.back >= 1) t.node.position.copy(t.home)
      }
    }
  }, [root, carriers, tools])
  useLayoutEffect(() => {
    // (the water bucket and its dipper, drawn bigger: scaled about the bucket's own place)
    const b = root.getObjectByName('WaterBucket'), d = root.getObjectByName('WaterDipper')
    if (b && !b.userData.scaled) {
      b.userData.scaled = true
      const c = b.position.clone()
      for (const n of [b, d]) if (n) {
        n.scale.multiplyScalar(BUCKET_SCALE)
        n.position.sub(c).multiplyScalar(BUCKET_SCALE).add(c)
      }
      const nd = nudge('bin')
      for (const t of tools) if (t.node === d) { t.home.copy(d!.position); t.home0.copy(d!.position).sub(nd) }
    }
  }, [root, carriers, tools])
  useEffect(() => {
    // grabbing the box or the bucket itself (not a pot or a utensil) drags the whole thing
    for (const [key, nodes] of Object.entries(carriers)) if (nodes[0]) nodes[0].node.userData.container = key
  }, [carriers])
  /** which group a utensil belongs to (it moves when that group is dragged) */
  const carrierOf = (name: string) =>
    (roast.toolBox ?? []).includes(name) ? 'box' : (roast.bucket ?? []).includes(name) ? 'bin' : null
  type Tool = (typeof tools)[number]
  // (the cutting board, the seasoning box and the water bucket are moved in edit mode by the same nudge a hand moves them by: the change in what
  // the edit says is added to it, and the box's pots and the bucket's dipper go along)
  // (redrawn as those pieces' own places change (item 186: the whole kitchen redrew with each step of any piece's drag))
  const editOffsets = useEditSel((s) => Object.values(EDIT_PIECES).map((id) => String(s.offsets[id])).join('|'))
  const editSeen = useRef<Record<string, THREE.Vector3>>({})
  useLayoutEffect(() => {
    let any = false
    for (const [key, id] of Object.entries(EDIT_PIECES)) {
      const at = new THREE.Vector3(...positionOf(id))
      const was = editSeen.current[key] ?? new THREE.Vector3()
      const d = at.clone().sub(was)
      if (d.lengthSq() < 1e-10) continue
      editSeen.current[key] = at
      const next = nudge(key).clone().add(d)
      moved.current.set(key, next)
      // (it can't be set down in the stones or through another piece: pushed clear, as when it's moved by hand)
      const here = containerAt(key)
      const clear = settle(key, here.clone())
      clear.y = here.y
      const push = clear.sub(here)
      next.add(push)
      moved.current.set(key, next)
      // (and the edit's place goes where it's ended up, so its box and handles stay on it, not where it couldn't go)
      if (push.lengthSq() > 1e-8) {
        const o = offsetOf(id)
        editSeen.current[key] = at.clone().add(push)
        settleOffset(id, [o[0] + push.x, o[1] + push.y, o[2] + push.z])
      }
      for (const b of carriers[key] ?? []) b.node.position.copy(b.home).add(next)
      for (const t of tools) {
        if (carrierOf(t.node.name) !== key) continue
        t.home.copy(t.home0).add(next)
        if (t.back >= 1) t.node.position.copy(t.home)
      }
      any = true
    }
    if (any) setMoveTick((t) => t + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editOffsets, carriers, tools])
  // the pots they stand in: pointing at or grabbing a pot means its utensil
  const pots = useMemo(() => Object.entries(roast.toolPots ?? {}).flatMap(([potName, toolName]) => {
    const pot = root.getObjectByName(potName)
    const tool = tools.find((t) => t.node.name === toolName)
    return pot && tool ? [{ pot, tool }] : []
  }), [root, roast.toolPots, tools])
  const drag = useRef<{ tool: Tool; target: Piece | null; at: THREE.Vector3; pour: number; scoop: number
    /** where it's held, eased after the pointer; its own clock (its working motion); the piece it's over and how long it's been there; the
     * time since it last went on; the pieces it's put some on this time; the grains owed; the time since the last patter */
    base: THREE.Vector3; t: number; on: Piece | null; dwell: number; since: number; dabbed: Set<Piece>; acc: number; tick: number } | null>(null)
  /** the pieces just seasoned, each bouncing a little (how far through, 0..1) */
  const bounces = useRef(new Map<Piece, number>())
  /** the rings spreading where a seasoning's just gone on */
  const ringObjs = useRef<(THREE.Mesh | null)[]>([])
  const ringLife = useRef<number[]>(Array(RINGS).fill(0))
  const ringNext = useRef(0)
  /** a seasoning goes on: the piece seasoned, a burst of it falling, the piece bouncing a little, a ring spreading from it in its colour,
   * and its sound */
  const dabNow = (p: Piece, kind: Seasoning, from: THREE.Vector3) => {
    season(p, kind)
    emit(kind, from.clone().add(new THREE.Vector3(0, -0.04, 0)), kind === 'salt' || kind === 'peanut' || kind === 'shichimi' ? 22 : 10)
    bounces.current.set(p, 0)
    const k = ringNext.current
    ringNext.current = (k + 1) % RINGS
    const ring = ringObjs.current[k]
    if (ring) {
      ring.position.copy(p.node.position).add(new THREE.Vector3(0, 0.03, 0))
      ;(ring.material as THREE.MeshBasicMaterial).color.copy(GRAIN_COLORS[kind])
      ringLife.current[k] = RING_LIFE
    }
    seasonSound(kind)
    // (on what's over the coals, the fire answers: a burst of sizzle (salt a lighter one))
    if (!p.collected && !p.staged && p.homeFlight >= 1) sizzleBurst(p.node.getWorldPosition(SIZZLE_AT), kind === 'salt' ? 0.7 : 1)
  }
  /** the dipper pouring out what it scooped, where it was let go: how long it has left (s) */
  const pouring = useRef<{ tool: Tool; left: number; at: THREE.Vector3 } | null>(null)
  // (the seasoning ledge drawn as one while all of it is at home (ledgeCopy): made once it has settled, again whenever the ledge is moved)
  const ledge = useRef<{ key: string; since: number; copy: ReturnType<typeof ledgeCopy> }>({ key: '', since: 0, copy: null })
  useEffect(() => () => { ledge.current.copy?.dispose(); ledge.current = { key: '', since: 0, copy: null } }, [root])
  /** the water standing in the dipper's cup (shown once it's scooped some up, gone as it's poured out) */
  const dipperWater = useMemo(() => root.getObjectByName('DipperWater') ?? null, [root])
  useLayoutEffect(() => { if (dipperWater) dipperWater.visible = false }, [dipperWater])
  const hoveredTool = useRef<Tool | null>(null)
  const [toolLabel, setToolLabel] = useState<{ kind: Seasoning; at: [number, number, number] } | null>(null)

  // the grains and drops that fall while a seasoning is held over food
  const grains = useMemo(() => {
    const pos = new Float32Array(GRAINS * 3)
    for (let i = 0; i < GRAINS; i++) pos[i * 3 + 1] = -1e4
    const col = new Float32Array(GRAINS * 3)
    const vel = new Float32Array(GRAINS * 3)
    const life = new Float32Array(GRAINS)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(col, 3))
    return { pos, col, vel, life, geometry, next: 0 }
  }, [])
  // (round grains and drops, crisp-edged (item 242: they were squares))
  const grainMaterial = useMemo(() => new THREE.PointsMaterial({ size: 0.024, sizeAttenuation: true, vertexColors: true, map: SOFT_DOT, alphaTest: 0.5 }), [])
  const emit = (kind: Seasoning, from: THREE.Vector3, count: number) => {
    const { pos, col, vel, life } = grains
    const c = GRAIN_COLORS[kind]
    for (let n = 0; n < count; n++) {
      const i = grains.next
      grains.next = (grains.next + 1) % GRAINS
      pos.set([from.x + (Math.random() - 0.5) * 0.06, from.y, from.z + (Math.random() - 0.5) * 0.06], i * 3)
      col.set([c.r, c.g, c.b], i * 3)
      // powders scatter, sauces fall in drops
      const spread = kind === 'salt' || kind === 'peanut' ? 0.25 : 0.05
      vel.set([(Math.random() - 0.5) * spread, -0.2 - Math.random() * 0.3, (Math.random() - 0.5) * spread], i * 3)
      life[i] = 0.9
    }
  }
  /** a seasoning lands on a piece: its look changes (more of it with every dab) */
  const season = (p: Piece, kind: Seasoning) => {
    // (a dose of it from stock, unless it's one the dish was ordered with, the first time: that went with the order. None left, it doesn't
    // go on)
    const paid = !!p.want?.dabs.includes(kind) && !p.dabs[kind]
    if (kind !== 'water' && !paid && !SUPPLIES.dab(kind)) return false
    const before = tasteOf(p)
    p.dabs[kind]++
    if (kind === 'water') {
      meterWater('dipper')
      // a splash of water cools it (it stops short of charring for a while) — and leaves it soggy
      p.progress = Math.max(0, p.progress - roast.times[p.id] * 0.15)
    } else {
      const u = { salt: p.looks.uSalt, soy: p.looks.uSoy, milk: p.looks.uMilk, peanut: p.looks.uPeanut, miso: p.looks.uMiso,
        wasabi: p.looks.uGreen, yuzu: p.looks.uGreen, shichimi: p.looks.uRed, lemon: p.looks.uLemon }[kind]
      u.value = Math.min(1, u.value + DAB)
      // (when it went on: before the fire, while cooking, just before it's done, or once it's off)
      p.steps.push({ k: kind, at: seasonStage(p.collected ? null : p.progress / roast.times[p.id]) })
    }
    const delta = tasteOf(p) - before
    pop(p.node.position.clone().add(new THREE.Vector3(0, 0.3, 0)), delta)
    return true
  }

  // little floating words: how a seasoning changed a piece's 美味
  // (shown in a few places kept mounted, each word taking the next free one: one mounted for each word, a React root and its page element
  // made and thrown away two or three times a second while the chef seasoned, kept in development (the heap rose with them))
  const popId = useRef(0)
  const pop = (at: THREE.Vector3, delta: number) => {
    if (!delta) return
    const id = ++popId.current
    const word = lang === 'en' ? 'Taste' : '美味'
    const text = delta > 0 ? `${word} +${delta}` : `${word} ${delta}`
    POP_FEED.to?.({ id, at: at.toArray() as [number, number, number], text, good: delta > 0 })
  }
  // the 美味 of whatever's pointed at
  const [tasteTip, setTasteTip] = useState<{ at: [number, number, number]; taste: number } | null>(null)

  const hovered = useRef<Piece | null>(null)
  // the hovered food's tag brightens too (tags sit at low opacity until pointed at)
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)
  const setHover = (p: Piece | null) => {
    hovered.current = p
    setHoveredKey(p?.key ?? null)
  }
  useEffect(() => {
    const el = gl.domElement
    if (!active) {
      hovered.current = null
      el.style.cursor = ''
      return
    }
    const pointer = { x: 0, y: 0 }
    const aim = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect()
      pointer.x = e.clientX - rect.left
      pointer.y = e.clientY - rect.top
      raycaster.setFromCamera(new THREE.Vector2((pointer.x / rect.width) * 2 - 1, -(pointer.y / rect.height) * 2 + 1),
        camera)
    }
    /** a bare stick left on the plate is thin and hard to hit, so anywhere near it counts */
    const nearStick = () => {
      const rect = el.getBoundingClientRect()
      const v = new THREE.Vector3()
      let best: Piece | null = null
      let bestD = 30
      for (const p of pieces.current) {
        if (!p.stickOnly || p.eaten || !present(p)) continue
        for (const s of p.sticks) {
          s.getWorldPosition(v).project(camera)
          const d = Math.hypot((v.x + 1) / 2 * rect.width - pointer.x, (1 - v.y) / 2 * rect.height - pointer.y)
          if (d < bestD) {
            bestD = d
            best = p
          }
        }
      }
      return best
    }
    /** the food under the pointer: on the fire, or on the plate / in the basket once it's landed */
    const pickFood = (seasoning = false) => {
      if (!byHandRef.current) return null
      const candidates = pieces.current.filter((p) => present(p) && !p.eaten &&
        // (not one on the fire still waiting for its place on the net (it isn't drawn); one waiting on the tray or the rice balls' dish is
        // there to be clicked onto the fire: it holds no place on the net till then)
        !(roast.net?.includes(p.id) && !p.collected && !p.staged && p.netSpot === null) &&
        (!p.collected || (p.flight >= 1 && (p.eat === 0 || p.stickOnly))) && !(seasoning && p.stickOnly))
      const hits = raycaster.intersectObjects(candidates.map((p) => p.node), true)
      if (!hits.length) return seasoning ? null : nearStick()
      let o: THREE.Object3D | null = hits[0].object
      while (o && !candidates.some((p) => p.node === o)) o = o.parent
      return candidates.find((p) => p.node === o) ?? null
    }
    const pickTool = () => {
      if (!byHandRef.current) return null
      // (the whole water bucket is a handle on its dipper: pointing anywhere on it takes the dipper, to scoop up water)
      const bucket = root.getObjectByName('WaterBucket')
      const dipper = tools.find((t) => t.kind === 'water') ?? null
      const hits = raycaster.intersectObjects([...tools.map((t) => t.node), ...pots.map((p) => p.pot), ...(bucket && dipper ? [bucket] : [])], true)
      if (!hits.length) return null
      let o: THREE.Object3D | null = hits[0].object
      while (o && !tools.some((t) => t.node === o) && !pots.some((p) => p.pot === o) && o !== bucket) o = o.parent
      if (o && o === bucket) return pouring.current ? null : dipper
      return tools.find((t) => t.node === o) ?? pots.find((p) => p.pot === o)?.tool ?? null
    }
    // where a carried seasoning is held: on a level plane a little above the food, under the pointer
    const holdPlane = new THREE.Plane()
    const carry = (e: PointerEvent) => {
      const d = drag.current!
      aim(e)
      const y = root.localToWorld(new THREE.Vector3(0, 0.95, 0)).y
      holdPlane.set(UP, -y)
      const hit = raycaster.ray.intersectPlane(holdPlane, new THREE.Vector3())
      if (hit) d.at.copy(root.worldToLocal(hit))
      const target = pickFood(true)
      d.target = target
      if (target !== hovered.current) setHover(target)
    }

    /** soup on the table (miso soup): the bowl under the pointer, if it still has any in it */
    const pickDrink = () => {
      const bowls: THREE.Object3D[] = []
      root.traverse((o) => {
        const id = o.userData.itemId as string | undefined
        if (id && roast.drinks?.includes(id) && o.visible && o.scale.x > 0.01) bowls.push(o)
      })
      for (const hit of raycaster.intersectObjects(bowls, true)) {
        for (let o: THREE.Object3D | null = hit.object; o; o = o.parent) {
          if (bowls.includes(o) && (sips.current.get(o.uuid)?.left ?? SIPS) > 0) return o
        }
      }
      return null
    }

    let down: { x: number; y: number } | null = null
    let ownTip = false
    // (only what this lit is put out here: the glow is shared, and the till's drawers, the shrine and the rest light their own through the pointer events)
    let ownGlow = false
    const onMove = (e: PointerEvent) => {
      if (lockedRef.current) { if (ownGlow) { glowOnly(null); ownGlow = false } if (ownTip) { setTip(null); ownTip = false } return }
      if (drag.current || held.current) return
      if (e.buttons) return
      aim(e)
      const tool = pickTool()
      const p = tool ? null : pickFood()
      if (tool !== hoveredTool.current) {
        hoveredTool.current = tool
        setToolLabel(tool ? { kind: tool.kind, at: [tool.home.x, tool.home.y + 0.32, tool.home.z] } : null)
      }
      if (p !== hovered.current) {
        setHover(p)
        // pointing at a piece shows how good it'd be to eat right now (not a bare skewer: there's nothing on it to eat)
        setTasteTip(p && !p.stickOnly ? { at: p.node.position.clone().add(new THREE.Vector3(0, 0.42, 0)).toArray() as [number, number, number],
          taste: tasteOf(p) } : null)
      }
      const soup = tool || p ? null : pickDrink()
      if (!soup && !p && !hovered.current) setTasteTip(null)
      if (soup && !p) setTasteTip({ at: soup.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.32, 0)).toArray() as [number, number, number], taste: SOUP_TASTE })
      const dec = tool || p || soup ? null : pickDecor()
      // (the skewer holder says itself, with its count, by its own pointer events)
      setDecorTip(dec === 'skewer' ? null : dec)
      // (what's under the pointer, other than the food (which shows its own taste tip), lights up)
      const cont = tool || p || soup || dec ? null : pickContainer()
      let lit: THREE.Object3D | null = null
      if (tool) lit = tool.node
      else if (soup) lit = soup
      else if (dec) world.traverse((o) => { if (!lit && o.userData.decor === dec) lit = o })
      else if (cont) world.traverse((o) => { if (!lit && o.userData.container === cont) lit = o })
      if (lit || ownGlow) { glowOnly(lit); ownGlow = !!lit }
      // (what's under the pointer, named by a tag, for what isn't food or a tool (those have their own): a dish or the table's boxes, dragged about)
      // (only its own tag is cleared here: the scene's other things set theirs through the pointer events)
      if (!tool && !p && !soup && !dec && cont) { setTip(CONTAINER_TIP(cont, TRAY_SWAP.k > 0.5)); ownTip = true } else if (ownTip) { setTip(null); ownTip = false }
      // (a person under the pointer keeps their own (FigureHit, item 643: the owner's hand over him asleep, put back here on the next move))
      if (!figureCursorOn(el)) el.style.cursor = tool || dec ? 'grab' : p || soup ? 'pointer' : pickContainer() ? 'grab' : POINTER_HINT.hand ? 'pointer' : ''
    }
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY }
      if (ownGlow) { glowOnly(null); ownGlow = false }
      if (e.button !== 0 || lockedRef.current) return
      aim(e)
      const tool = pickTool()
      if (!tool) {
        // any skewer or piece of food can be picked up and carried to the bin (a plain click still eats or
        // complains as usual: carrying only starts once the pointer moves)
        const food = pickFood()
        if (food) {
          // the camera holds still from the press on (otherwise the first few pixels, before the carry starts,
          // turn the view a little and it keeps drifting after)
          if (controls) controls.enabled = false
          scrap.current = { p: food, x: e.clientX, y: e.clientY, started: false }
          window.addEventListener('pointermove', haul)
          window.addEventListener('pointerup', dropScrap, { once: true })
          return
        }
        // a stick of binchotan from the crate, or the fan
        const dec = pickDecor()
        if (dec) {
          held.current = { kind: dec, at: new THREE.Vector3(), wave: -1 }
          // (a stick out of the crate: gone from it as it's taken up (item 109))
          if (dec === 'charcoal') liftFromCrate()
          setDecorTip(null)
          if (controls) controls.enabled = false
          document.body.classList.add('is-carrying')
          el.style.cursor = 'grabbing'
          holdDecor(e)
          window.addEventListener('pointermove', holdDecor)
          window.addEventListener('pointerup', dropDecor, { once: true })
          return
        }
        // otherwise grab a plate, side dish, the basket, the seasoning box or the bin (not the food on them)
        const picked = food ? null : pickContainer()
        // (charcoal goes on only by dragging a stick from the crate: a click on the fire does nothing)
        // (nor the seasoning ledge, hung on the hearth's frame: dragged past the table's edge it fell to the kitchen floor, its pots and
        // the fan in its holder with it (the owner found it lying by the sink); its pots and utensils are still taken up one by one)
        if (!picked || FIXED.has(picked)) return
        // (from a stack, the one on top comes off)
        const key = STACKABLE(picked) ? stackTop(picked) : picked
        if (stackOn.current.has(key)) {
          stackOn.current.delete(key)
          const n = nudge(key).clone()
          n.y = 0
          moved.current.set(key, n)
        }
        const start = groundHit()
        if (!start) return
        shift.current = { key, start, from: nudge(key).clone() }
        lightContainer(key)
        if (controls) controls.enabled = false
        document.body.classList.add('is-carrying')
        window.addEventListener('pointermove', slide)
        window.addEventListener('pointerup', release, { once: true })
        return
      }
      // pick it up: the camera holds still while it's carried, and the pointer is followed over the whole window
      // (it passes over the food tags, which sit above the canvas)
      if (pouring.current?.tool === tool) return
      drag.current = { tool, target: null, at: tool.node.position.clone(), pour: 0, scoop: tool.kind === 'water' ? 0 : 1,
        base: tool.node.position.clone(), t: 0, on: null, dwell: 0, since: DAB_EVERY, dabbed: new Set(), acc: 0, tick: 0 }
      if (tool.kind === 'salt') setSaltInHand(true)
      if (controls) controls.enabled = false
      el.style.cursor = 'grabbing'
      document.body.classList.add('is-carrying')
      setToolLabel(null)
      carry(e)
      window.addEventListener('pointermove', carry)
      window.addEventListener('pointerup', drop, { once: true })
    }
    const drop = () => {
      const d = drag.current
      window.removeEventListener('pointermove', carry)
      document.body.classList.remove('is-carrying')
      if (!d) return
      // let go over food: season it; either way the seasoning goes back to its place
      // (the dipper, once it's scooped, pours where it's let go first, tipping its water out over a moment, then goes back)
      const scooped = d.tool.kind === 'water' && d.scoop >= 1
      const overCoals = d.tool.kind === 'water' && Math.hypot(d.at.x, d.at.z) < RING_CLEAR * 0.7
      if (d.target) {
        if (d.tool.kind === 'water') season(d.target, 'water')
        else if (!d.dabbed.has(d.target)) dabNow(d.target, d.tool.kind, d.tool.node.position)
      } else if (overCoals && scooped) {
        // water thrown on the coals: they hiss and steam, and the fire drops right down
        if (fire) fire.current = Math.max(0, fire.current - 0.3)
        meterWater('dipper')
        WISP_FEED.to?.({ key: 'douse', at: [0, 0.15, 0] })
      }
      // (scooped, it's always poured out where it's let go: on the food, the coals, or just the table)
      if (scooped) pouring.current = { tool: d.tool, left: 0.8, at: d.tool.node.position.clone() }
      else {
        d.tool.back = 0
        if (d.tool.kind === 'water' && dipperWater) dipperWater.visible = false
      }
      drag.current = null
      setSaltInHand(false)
      if (controls) controls.enabled = true
      el.style.cursor = ''
      setHover(null)
    }
    /** the crate of charcoal or the fan under the pointer */
    const pickDecor = () => {
      // (the crate's charcoal and the fan are only taken up by hand while researching, as the food and the tools are)
      if (!byHandRef.current) return null
      const groups: THREE.Object3D[] = []
      world.traverse((o) => { if (typeof o.userData.decor === 'string') groups.push(o) })
      const hit = raycaster.intersectObjects(groups, true)[0]
      for (let o: THREE.Object3D | null = hit?.object ?? null; o; o = o.parent) {
        if (typeof o.userData.decor === 'string') {
          const d = o.userData.decor as 'charcoal' | 'fan' | 'skewer'
          // (a clean skewer taken from the holder only while there's one in it)
          return d === 'skewer' && SKEWERS.s.clean <= 0 ? null : d
        }
      }
      return null
    }
    // carried a little above the fire; the fan, waved over a lit fire, fans the coals up
    /** the stick or fan in hand: how fast it's moving (scene units a second) and when it last moved */
    const swing = { v: 0, t: 0 }
    /** whether the 'heap full' tag is showing over the fire while a stick's held */
    let heapWarn = false
    const holdDecor = (e: PointerEvent) => {
      const h = held.current
      if (!h) return
      const tNow = performance.now()
      aim(e)
      const y = root.localToWorld(new THREE.Vector3(0, h.kind === 'fan' ? 0.62 : h.kind === 'skewer' ? 0.3 : 0.5, 0)).y
      holdPlane.set(UP, -y)
      const hit = raycaster.ray.intersectPlane(holdPlane, new THREE.Vector3())
      if (!hit) return
      const at = root.worldToLocal(hit)
      if (h.wave < 0) {
        h.at.copy(at)
        h.wave = 0
        return
      }
      const moved = at.distanceTo(h.at)
      // (a stick held over a fire that has no room for it: its tag says so before it's let go)
      if (h.kind === 'charcoal') {
        const over = Math.hypot(at.x, at.z) < RING_CLEAR
        const full = over && !canPlaceCoal()
        if (full !== heapWarn) { heapWarn = full; setTip(full ? { title: '炭堆已滿', hint: '放不下了，等底下的炭燒成灰再加' } : null) }
      }
      // (how fast it's being swung (eased over the last few moves): let go, that's how hard it's thrown)
      const dt = Math.max(0.008, (tNow - swing.t) / 1000)
      swing.v = swing.v * 0.5 + (moved / dt) * 0.5
      swing.t = tNow
      h.at.copy(at)
      if (h.kind !== 'fan') return
      h.wave += moved
      if (fire && fire.current > 0.02 && Math.hypot(at.x, at.z) < RING_CLEAR + 0.1) {
        // (the heat the fanning calls up is banked and let into the fire a little at a time: the fire rises, it doesn't jump)
        const gain = Math.min(moved * FAN_GAIN, FAN_MAX - fanned.current.extra - fanned.current.pending)
        if (gain > 0) fanned.current.pending += gain
        fanned.current.last = performance.now()
      }
    }
    const dropDecor = () => {
      const h = held.current
      // (a swing stopped before letting go is no throw: only what's moving at the moment of release counts)
      const force = throwForce(swing.v, performance.now() - swing.t)
      if (heapWarn) { heapWarn = false; setTip(null) }
      swing.v = 0
      window.removeEventListener('pointermove', holdDecor)
      document.body.classList.remove('is-carrying')
      // the charcoal let go over the fire goes on it
      // (one stick, from where it's let go; the crate is a stick the fewer)
      if (h?.kind === 'charcoal' && Math.hypot(h.at.x, h.at.z) < RING_CLEAR) {
        // (full, it isn't taken from the crate or paid for: it goes back, with a word why)
        if (!canPlaceCoal()) { onNotice?.('heapFull'); backToCrate() }
        else if (fire && fire.current >= 1 - 1e-6) { onNotice?.('heapFull'); backToCrate() }
        else if (dropCoals({ x: h.at.x, y: h.at.y, z: h.at.z }, 1, force) > 0) { onAddCharcoal?.(1, true); takeFromCrate() }
        else backToCrate()
      } else if (h?.kind === 'charcoal') backToCrate()
      // (a clean skewer let go over something on the board not yet on one: pushed through it (the owner's: while researching, it's skewered by
      // hand); let go anywhere else, it goes back in the holder)
      if (h?.kind === 'skewer') {
        // (the one the pointer's over: the nearest to its ray, measured to the middle of what's on the board (the owner's, 2026-11-10: it was
        // judged where the ray met a level 0.3 over the table, off to the side of what the eye saw under the pointer: let go over one fish,
        // the one beside it got the skewer, or none did))
        let best: Piece | null = null
        let d = SKEWER_DROP * root.getWorldScale(new THREE.Vector3()).x
        for (const p of pieces.current) {
          if (!present(p) || !p.staged || p.fetching || !p.sticks.length || p.skewerAt !== undefined || p.trash >= 0) continue
          const c = new THREE.Box3().setFromObject(p.food[0] ?? p.node).getCenter(new THREE.Vector3())
          const q = raycaster.ray.distanceToPoint(c)
          if (q < d) { d = q; best = p }
        }
        const t = best ? takeSkewer(SKEWERS.s) : null
        if (best && t) {
          SKEWERS.s = t
          best.skewerAt = performance.now()
          pierceSound()
          // (the owner does it with the player: turned to it, pushing the rod through (Boss, item 105))
          OWNER_GRILL.pierceUntil = best.skewerAt + PIERCE_MS
          new THREE.Box3().setFromObject(best.food[0] ?? best.node).getCenter(OWNER_GRILL.pierceAt)
        }
      }
      held.current = null
      if (controls) controls.enabled = true
      el.style.cursor = ''
    }
    /** the plate / dish / basket under the pointer, by the container key its group carries */
    const pickContainer = () => {
      if (!DRAG_PIECES || !byHandRef.current) return null
      const groups: THREE.Object3D[] = []
      world.traverse((o) => { if (typeof o.userData.container === 'string') groups.push(o) })
      for (const hit of raycaster.intersectObjects(groups, true)) {
        for (let o: THREE.Object3D | null = hit.object; o; o = o.parent) {
          if (typeof o.userData.container === 'string') return o.userData.container as string
        }
      }
      return null
    }
    /** where the pointer meets the table, in the dish's own coordinates */
    const groundHit = () => {
      const plane = new THREE.Plane(UP, -root.localToWorld(new THREE.Vector3()).y)
      const hit = raycaster.ray.intersectPlane(plane, new THREE.Vector3())
      return hit ? root.worldToLocal(hit) : null
    }
    /** while a plate, the basket, the box or the bucket is being dragged, it (and whatever it carries) glows */
    const lit: { mat: THREE.MeshToonMaterial; was: THREE.Color }[] = []
    const lightContainer = (key: string | null) => {
      for (const { mat, was } of lit) mat.emissive.copy(was)
      lit.length = 0
      if (!key) return
      const roots: THREE.Object3D[] = []
      world.traverse((o) => { if (o.userData.container === key) roots.push(o) })
      for (const b of carriers[key] ?? []) roots.push(b.node)
      const seen = new Set<THREE.Material>()
      for (const r of roots) r.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return
        for (const mat of Array.isArray(o.material) ? o.material : [o.material]) {
          if (!(mat instanceof THREE.MeshToonMaterial) || seen.has(mat)) continue
          seen.add(mat)
          lit.push({ mat, was: mat.emissive.clone() })
          mat.emissive.add(HOVER_GLOW)
        }
      })
    }
    const slide = (e: PointerEvent) => {
      const s = shift.current
      if (!s) return
      aim(e)
      const hit = groundHit()
      if (!hit) return
      const before = nudge(s.key).clone()
      // where it would go, kept clear of the fire and of everything else on the table
      const base = containerAt(s.key).sub(before)
      const want = base.clone().add(s.from).add(hit.sub(s.start))
      want.y = base.y
      // (a plate or dish carried past the table's edge goes where it's taken, off the table; let go there, it falls to the floor below)
      const out = outsideTable(want, footprint(s.key))
      const next = out ? want.clone().sub(base) : settle(s.key, want, STACKABLE(s.key) && !holds(s.key)).sub(base)
      next.y = 0
      carriedOut.current = out
      if (carriedOut.current) next.y = LIFT - base.y
      // (taken out of the cubby, it comes up onto the table's top)
      moved.current.set(s.key, next)
      if (carriers[s.key]) {
        // the box carries its pots and utensils with it, the bucket its dipper
        for (const b of carriers[s.key]) b.node.position.copy(b.home).add(next)
        for (const t of tools) {
          if (carrierOf(t.node.name) !== s.key) continue
          t.home.copy(t.home0).add(next)
          if (t.back >= 1 && drag.current?.tool !== t) t.node.position.copy(t.home)
        }
      }
      // potatoes rolling about in the basket go along with it
      const delta = next.clone().sub(before)
      for (const p of pieces.current) if (p.body?.live && p.container === s.key) p.node.position.add(delta)
      setMoveTick((t) => t + 1)
    }
    const release = () => {
      const s = shift.current
      if (s && carriedOut.current) {
        // (let go off the table: it falls under gravity to the floor, a small bounce, and lies there)
        const key = s.key
        const n0 = nudge(key).clone()
        const baseY = containerAt(key).y - n0.y
        let y = n0.y, vy = 0, last = performance.now()
        const fall = () => {
          const now = performance.now()
          const d = Math.min(0.05, (now - last) / 1000)
          last = now
          vy -= 9.8 * d
          y += vy * d
          const floorN = FLOOR_Y - baseY + 0.0
          if (y <= floorN) {
            y = floorN
            // (a plate or dish that falls this far (the table's top is well over a metre up) is ceramic on a hard floor: it shatters,
            // shards scattered on the floor, and a fresh one is set out in the cubby a moment later)
            if (vy < -2.5 && /^(plate|dish|rawdish)/.test(key) && !shattered.current.has(key)) {
              shattered.current.add(key)
              const at = containerAt(key)
              setShards((all) => [...all, ...Array.from({ length: 9 }, (_, n) => ({ id: Math.random(), x: at.x + (Math.random() - 0.5) * 0.5, y: at.y + 0.005, z: at.z + (Math.random() - 0.5) * 0.5, s: 0.03 + Math.random() * 0.05, r: Math.random() * 6, t: performance.now() + n * 0 }))].slice(-40))
              y = -20   // (the broken plate is gone from the floor at once)
              vy = 0
              window.setTimeout(() => {
                moved.current.delete(key)
                stackOn.current.delete(key)
                shattered.current.delete(key)
                setMoveTick((t) => t + 1)
              }, 1800)
              window.setTimeout(() => setShards((all) => all.filter((sh) => performance.now() - sh.t < 6000)), 6200)
            }
            if (vy < -1) vy = -vy * 0.2
            else vy = 0
          }
          const cur = nudge(key).clone()
          cur.y = y
          moved.current.set(key, cur)
          // (the box carries its pots and utensils down with it, the bucket its dipper)
          for (const b of carriers[key] ?? []) b.node.position.copy(b.home).add(cur)
          for (const t of tools) {
            if (carrierOf(t.node.name) !== key) continue
            t.home.copy(t.home0).add(cur)
            if (t.back >= 1) t.node.position.copy(t.home)
          }
          setMoveTick((t) => t + 1)
          if (y < -10) return
          if (vy !== 0 || y > floorN) requestAnimationFrame(fall)
        }
        requestAnimationFrame(fall)
      } else if (s && STACKABLE(s.key)) {
        const at = containerAt(s.key)
        // the nearest other empty one it's been let go over (the top of its stack), if any
        const target = containerKeys()
          .filter((k) => k !== s.key && STACKABLE(k) && !holds(k) && stackTop(k) === k && !sameStack(k, s.key))
          .map((k) => ({ k, d: Math.hypot(containerAt(k).x - at.x, containerAt(k).z - at.z) }))
          .filter((o) => o.d < footprint(o.k) * 0.75)
          .sort((a, b) => a.d - b.d)[0]
        const base = at.clone().sub(nudge(s.key))
        if (!holds(s.key) && target) {
          // set square on top of it
          const there = containerAt(target.k)
          stackOn.current.set(s.key, target.k)
          const n = there.clone().sub(base)
          n.y = there.y + stackStep(target.k) - base.y
          moved.current.set(s.key, n)
        } else {
          // not over one: it's pushed clear of whatever it was carried across
          const n = settle(s.key, at.clone()).sub(base)
          n.y = 0
          moved.current.set(s.key, n)
        }
        setMoveTick((t) => t + 1)
      }
      shift.current = null
      lightContainer(null)
      window.removeEventListener('pointermove', slide)
      document.body.classList.remove('is-carrying')
      if (controls) controls.enabled = true
    }
    // carrying scraps to the bin
    const haul = (e: PointerEvent) => {
      const q = scrap.current
      if (!q) return
      if (!q.started) {
        if (Math.hypot(e.clientX - q.x, e.clientY - q.y) < 6) return
        q.started = true
        setTasteTip(null)
        q.p.carried = true
        q.p.node.userData.onPlate = true
        if (controls) controls.enabled = false
        document.body.classList.add('is-carrying')
        setHover(q.p)                  // what's being carried glows
      }
      aim(e)
      const plane = new THREE.Plane(UP, -root.localToWorld(new THREE.Vector3(0, 0.55, 0)).y)
      const hit = raycaster.ray.intersectPlane(plane, new THREE.Vector3())
      if (hit) q.p.node.position.copy(root.worldToLocal(hit))
      // raw food being carried: the fire lights up to say it can go there, brighter right over it
      if (q.p.staged) setFireHint(Math.hypot(q.p.node.position.x, q.p.node.position.z) < RING_CLEAR ? 2 : 1)
    }
    const dropScrap = () => {
      const q = scrap.current
      window.removeEventListener('pointermove', haul)
      scrap.current = null
      setFireHint(0)
      if (controls) controls.enabled = true
      if (!q?.started) return
      document.body.classList.remove('is-carrying')
      if (controls) controls.enabled = true
      q.p.carried = false
      setHover(null)
      setTasteTip(null)
      const bin = containerAt('trash')
      const pos = q.p.node.position
      // over the bin is judged where the pointer meets the height of its rim, not where the carried food floats
      const rim = raycaster.ray.intersectPlane(new THREE.Plane(UP, -root.localToWorld(new THREE.Vector3(0, TRASH_H, 0)).y),
        new THREE.Vector3())
      const atRim = rim ? root.worldToLocal(rim) : pos
      const overBin = roast.trash && Math.hypot(atRim.x - bin.x, atRim.z - bin.z) < TRASH_R + 0.12
      const burnt = stageOf(q.p.progress / roast.times[q.p.id]).key === 'burnt'
      if (overBin && burnt) {
        // let go over the food waste bin: what's burnt drops in (only that: item 114)
        q.p.trash = 0
        q.p.trashFrom.copy(pos)
        q.p.staged = false
      } else if (overBin) {
        // (anything that can still be eaten isn't thrown away: it goes back where it was, with a word why)
        onNotice?.(stageOf(q.p.progress / roast.times[q.p.id]).key === 'done' ? 'waste' : 'binBurnt')
        if (!q.p.collected && !q.p.staged) q.p.node.userData.onPlate = false
      } else if (q.p.staged && Math.hypot(pos.x, pos.z) < RING_CLEAR) {
        // raw food from the tray, let go over the fire: onto its skewer spot (or the net, or the ash)
        putOnFire(q.p)
      } else if (!q.p.collected && !q.p.staged) {
        q.p.node.userData.onPlate = false            // back onto its skewer spot
      }
    }
    const onUp = (e: PointerEvent) => {
      if (lockedRef.current || !byHandRef.current) return
      if (drag.current || shift.current || scrap.current?.started) return
      if (e.button !== 0 || !down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return
      aim(e)
      const p = pickFood()
      if (!p) {
        // a sip of soup: it goes down a little each time, and the last sip counts as having had it
        const bowl = pickDrink()
        if (!bowl) return
        const s = sips.current.get(bowl.uuid) ?? { left: SIPS, level: 1 }
        s.left -= 1
        sips.current.set(bowl.uuid, s)
        if (s.left === 0) onEat?.(bowl.userData.itemId as string, SOUP_TASTE)
        return
      }
      if (p.staged) putOnFire(p)
      else if (p.collected && space === 'open') return      // (served at the bar: it's the customers')
      else if (p.collected && inBasket(p) && !p.unwrapped) p.unwrapped = true      // unwrap the foil first
      else if (p.collected) eat(p)
      else collect(p)
    }
    const onLeave = () => {
      if (drag.current) return
      hoveredTool.current = null
      setToolLabel(null)
      setHover(null)
      el.style.cursor = ''
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointerleave', onLeave)
    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointerleave', onLeave)
    }
  })

  /**
   * The basket's little physics: each potato is a ball under gravity, resting on the bowl (a paraboloid matching
   * the basket's shape) and pushed apart from its neighbours, so they tumble in, roll down to the middle and heap
   * up. Rolling turns them; friction and damping let them come to rest.
   */
  const settleBasket = (dt: number) => {
    // (not what's being carried off it by the pointer: the settling pulled it back in under the hand)
    const live = pieces.current.filter((p) => p.body?.live && present(p) && !p.eaten && !p.carried)
    if (!live.length) return
    const c = basketAt(0)
    // (its floor and rim at its size: a uniformly sized bowl's floor y = (BOWL_CURVE / k) r²)
    const k = basketScale(), curve = BOWL_CURVE / k
    const steps = 4
    const h = dt / steps
    const n = new THREE.Vector3()
    const d = new THREE.Vector3()
    for (let k = 0; k < steps; k++) {
      for (const p of live) {
        const b = p.body!
        const pos = p.node.position
        b.v.y -= 6 * h
        pos.addScaledVector(b.v, h)
        // the bowl: floor rising toward the rim
        const dx = pos.x - c.x
        const dz = pos.z - c.z
        const dist = Math.hypot(dx, dz) || 1e-6
        const slope = 2 * curve * dist
        const floor = c.y + 0.03 * k + curve * dist * dist
        n.set((-slope * dx) / dist, 1, (-slope * dz) / dist).normalize()
        const depth = floor + b.r / n.y - pos.y
        if (depth > 0) {
          pos.addScaledVector(n, depth * n.y)
          const vn = b.v.dot(n)
          if (vn < 0) b.v.addScaledVector(n, -vn * 1.25)
          b.v.multiplyScalar(0.96)
          // roll along the floor
          const speed = Math.hypot(b.v.x, b.v.z)
          if (speed > 1e-4) {
            d.set(b.v.z, 0, -b.v.x).divideScalar(speed)
            p.node.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(d, (speed * h) / b.r * 0.6))
          }
        }
        // the rim keeps them in
        const wall = BASKET_R * k * 0.9 - b.r * 0.6
        if (dist > wall) {
          pos.x = c.x + (dx / dist) * wall
          pos.z = c.z + (dz / dist) * wall
          const out = (b.v.x * dx + b.v.z * dz) / dist
          if (out > 0) {
            b.v.x -= (dx / dist) * out * 1.3
            b.v.z -= (dz / dist) * out * 1.3
          }
        }
      }
      // potatoes push each other apart
      for (let i = 0; i < live.length; i++) {
        for (let j = i + 1; j < live.length; j++) {
          const a = live[i]
          const o = live[j]
          d.subVectors(a.node.position, o.node.position)
          const dist = d.length() || 1e-6
          const min = a.body!.r + o.body!.r
          if (dist >= min) continue
          d.divideScalar(dist)
          const push = (min - dist) / 2
          a.node.position.addScaledVector(d, push)
          o.node.position.addScaledVector(d, -push)
          const rel = a.body!.v.dot(d) - o.body!.v.dot(d)
          if (rel < 0) {
            a.body!.v.addScaledVector(d, -rel * 0.6)
            o.body!.v.addScaledVector(d, rel * 0.6)
          }
        }
      }
    }
    for (const p of live) {
      p.body!.v.multiplyScalar(1 - 0.8 * dt)
      if (p.body!.v.lengthSq() < 0.0004) p.body!.v.multiplyScalar(0.5)
    }
  }

  const anchors = useRef<Record<string, THREE.Group | null>>({})
  const [tags, setTags] = useState<{ key: string; id: string; name?: string; state: TagState }[]>([])
  const lastTags = useRef('')
  const lastOff = useRef(-1)
  const since = useRef(0)
  const tint = useMemo(() => new THREE.Color(), [])

  // glowing charcoal: mostly black at a low fire, more and more of it red-hot as the fire builds; as the fire
  // burns down the coals are used up and slowly turn to pale grey ash (fresh charcoal brings the black back)
  const embers = useRef<{ mat: THREE.MeshToonMaterial; base: number; color: THREE.Color }[] | null>(null)
  // (starts at the fire's own level, so a cold pit is ash from the first frame, not charcoal easing down to it)
  const fuel = useRef((heat ?? fire)?.current ?? 0.55)

  useFrame(({ clock: clk, camera: frameCam }, delta) => {
    const clock = clk.elapsedTime
    const cdt = Math.min(delta, 0.05)
    // (as many of the newest sticks kept burning as the fire's level has on the bed (item 199: the gauge at 94% over a bed gone to grey ash,
    // each stick ashing on its own five minutes while the gauge took ninety to fall): the rest go to ash as ever)
    {
      let keep = fire ? glowingFor(fire.current) : COAL_MAX
      for (let i = coals.current.length - 1; i >= 0; i--) {
        const c = coals.current[i]
        if (!c || c.gone || c.dying) continue
        c.held = keep > 0
        if (keep > 0) keep--
      }
    }
    for (const c of coals.current) {
      if (!c || !c.g) continue
      // (the glow: black at first, then a deep red creeping in, orange, and the face going grey under it as it kindles)
      if (c.gone) continue
      if (c.bounced) {
        // (held by the fire's level: burning on short of its ash, or kindled back to it (fanned up, the level up again); else burning down)
        const d = delta * GAME_SPEED.value
        c.age = c.held && !c.dying ? (c.age < COAL_HOLD_S ? Math.min(COAL_HOLD_S, c.age + d) : Math.max(COAL_HOLD_S, c.age - 2 * d)) : c.age + d
        // (burning down: a stick of binchotan keeps its length and shape as it goes, only a little slimmer, its glow dying back at the end as it
        // greys over with ash and lies there pale until it's pushed out; pushed out by new ones, it crumbles to a puff of ash, fading away in a second and a half)
        const burnt = c.dying ? (c.dyT += delta) / 1.5 : Math.min(1, c.age / COAL_LAST_S)
        if (c.dying) {
          if (c.dyT <= delta) {
            c.mat.transparent = true
            burst(c.x, c.y, c.z)
          }
          // (its ink fading with it: the same instance's alpha, coalLayer)
          c.mat.opacity = Math.max(0, 1 - burnt)
        } else {
          const slim = 1 - 0.1 * burnt * burnt
          c.g.scale.set(slim, 1, slim)
        }
        if (c.dying && burnt >= 1) { c.gone = true; c.g.visible = false; restack(); continue }
        // (burnt through near the end of its life, it gives way and breaks, the pieces falling)
        if (!c.dying && c.age / COAL_LAST_S >= 0.95) { breakStick(c); continue }
        c.heat = Math.min(1, c.heat + delta * GAME_SPEED.value / COAL_KINDLE_S)
        // (the last third of its life: the glow dies back and the ash coat takes over)
        const ashed = Math.max(0, Math.min(1, (Math.min(1, c.age / COAL_LAST_S) - 0.72) / 0.28))
        const h = c.heat * (1 - ashed * ashed * (3 - 2 * ashed)) * (c.dying ? Math.max(0, 1 - burnt) : 1)
        // (charcoal-dark under the fire's light, only its cracks glowing; greying with ash at the end)
        c.mat.color.set('#6a6a6a').lerp(ASH_TINT, ashed).multiplyScalar(1 + 2.2 * ashed ** 1.5)
        const flick = 0.9 + 0.1 * Math.sin(clock * 9 + c.top * 90) * Math.sin(clock * 4.3 + c.rx)
        // (only the fractures light up (the emissive map): an orange that goes yellower and brighter as the stick kindles, a dull red while it's still catching)
        c.mat.emissive.setRGB(1, 0.32 + 0.4 * h ** 1.6, 0.06 + 0.2 * h ** 3)
        c.mat.emissiveIntensity = 0.8 * h ** 1.3 * flick
      }
      if (c.settled) {
        // (what lay on it comes down as sticks beneath burn away; it eases to its pose)
        // (and slides down the heap to where it lies, if it landed where the ground fell away)
        if (Math.abs(c.y - c.top) > 0.0005 || Math.abs(c.x - c.tx) > 0.0005 || Math.abs(c.z - c.tz) > 0.0005) {
          const k = Math.min(1, delta * 6), sl = Math.min(1, delta * 3)
          c.x += (c.tx - c.x) * sl; c.z += (c.tz - c.z) * sl; c.y += (c.top - c.y) * k
          c.g.position.set(c.x, c.y, c.z)
        }
        if (c.g.quaternion.angleTo(c.qEnd) > 0.002) c.g.quaternion.slerp(c.qEnd, Math.min(1, delta * 8))
        // (jolted by one landing hard beside it: a little hop, falling back with a smaller bounce or two)
        if (c.hopV || c.hopY) {
          c.hopV = (c.hopV ?? 0) - 9.8 * cdt
          c.hopY = (c.hopY ?? 0) + c.hopV * cdt
          if (c.hopY <= 0) { c.hopY = 0; c.hopV = c.hopV < -0.35 ? -c.hopV * 0.3 : 0 }
          c.g.position.set(c.x, c.y + c.hopY, c.z)
        }
        continue
      }
      if (c.delay > 0) {
        c.delay -= cdt
        c.g.visible = c.delay <= 0
        if (c.delay > 0) continue
      }
      c.vy -= 9.8 * cdt
      c.x += c.vx * cdt
      c.z += c.vz * cdt
      c.y += c.vy * cdt
      // (tumbling in the air, then turning to the way it lies as it lands)
      if (!c.bounced) { c.rx += c.sx * cdt; c.rz += c.sz * cdt; c.g.rotation.set(c.rx, c.ry, c.rz) }
      else c.g.quaternion.slerp(c.qEnd, Math.min(1, delta * 14))
      if (c.y <= c.ly && c.vy < 0) {
        c.y = c.ly
        if (!c.bounced) burst(c.x, c.y, c.z)
        // (it clatters as it lands: loud on the first strike, softer on the bounce)
        const f = c.force ?? 0
        if (c.vy < -0.4) coalClink(Math.min(1, (-c.vy / 4) * (c.bounced ? 0.5 : 1)))
        // (landing hard, it jolts the sticks lying by it: each hops a little, more the nearer and the harder)
        if (!c.bounced && f > 0.15) {
          for (const o of coals.current) {
            if (!o || o === c || !o.settled || o.gone) continue
            const d = Math.hypot(o.x - c.x, o.z - c.z)
            if (d < 0.25) o.hopV = (o.hopV ?? 0) + f * 1.4 * (1 - d / 0.25)
          }
        }
        c.bounced = true
        if (c.vy < -0.9) { c.vy = -c.vy * (0.3 + 0.3 * f); c.vx *= 0.35 + 0.3 * f; c.vz *= 0.35 + 0.3 * f }
        else { c.vy = 0; c.x = c.lx; c.z = c.lz; c.vx = 0; c.vz = 0; c.settled = true }
      }
      c.g.position.set(c.x, c.y, c.z)
    }
    // (the broken pieces: falling to rest, a faint red in them dying out (it's burnt nearly through), then lying grey until they fade)
    for (const k of crumbs.current) {
      if (!k.m) continue
      k.age += delta * GAME_SPEED.value
      if (k.y > k.ty || k.vy > 0) {
        k.vy -= 9.8 * cdt
        k.y += k.vy * cdt
        if (k.y <= k.ty) { k.y = k.ty; k.vy = k.vy < -0.6 ? -k.vy * 0.2 : 0 }
        k.m.position.y = k.y
      }
      const glowLeft = Math.max(0, 1 - k.age / 12)
      k.mat.emissive.setRGB(0.9, 0.22, 0.05)
      k.mat.emissiveIntensity = 0.35 * glowLeft * (0.85 + 0.15 * Math.sin(clock * 3 + k.id))
      if (k.age > 40) {
        k.mat.transparent = true
        k.mat.opacity = Math.max(0, 1 - (k.age - 40) / 3)
      }
    }
    if (crumbs.current.some((k) => k.age > 43)) crumbs.current = crumbs.current.filter((k) => k.age <= 43)
    // (the sticks and the crumbs drawn as they now are)
    coalDraw.draw(coals.current, crumbs.current)
    // (sparks and ash from the landings: thrown up, falling back, fading out)
    {
      const sp = sparkPts.current
      const pa = sparkGeo.attributes.position as THREE.BufferAttribute, ca = sparkGeo.attributes.color as THREE.BufferAttribute
      const pb = ashGeo.attributes.position as THREE.BufferAttribute, cb = ashGeo.attributes.color as THREE.BufferAttribute
      let ns = 0, na = 0
      for (let i = sp.length - 1; i >= 0; i--) {
        const q = sp[i]
        q.life -= cdt
        if (q.life <= 0) { sp.splice(i, 1); continue }
        if (q.ash) {
          // (a flake of ash (item 242): light, held up by the air, its rise slowed and its fall a slow drift, side to side as it goes)
          const drag = Math.exp(-2.4 * cdt)
          q.vx *= drag; q.vz *= drag
          q.vy = q.vy * drag - 0.55 * cdt
          q.x += Math.sin(q.life * 7 + q.s) * 0.05 * cdt
          q.z += Math.cos(q.life * 5.3 + q.s) * 0.05 * cdt
        } else q.vy -= 3.2 * cdt
        q.x += q.vx * cdt
        q.y += q.vy * cdt
        q.z += q.vz * cdt
        const k = Math.min(1, q.life / 0.5)
        if (q.ash) {
          if (na >= SPARKS) continue
          // (pale grey, catching the light as it turns over; fading out over its last moments)
          const tumble = 0.82 + 0.18 * Math.sin(q.life * 15 + q.s)
          pb.setXYZ(na, q.x, q.y, q.z); cb.setXYZW(na, 0.86 * tumble, 0.84 * tumble, 0.8 * tumble, 0.9 * Math.min(1, q.life / 0.6)); na++
        } else {
          if (ns >= SPARKS) continue
          pa.setXYZ(ns, q.x, q.y, q.z); ca.setXYZ(ns, k, 0.45 * k * k, 0.08 * k ** 3); ns++
        }
      }
      for (let i = ns; i < SPARKS; i++) { pa.setXYZ(i, 0, -9, 0); ca.setXYZ(i, 0, 0, 0) }
      for (let i = na; i < SPARKS; i++) { pb.setXYZ(i, 0, -9, 0); cb.setXYZW(i, 0, 0, 0, 0) }
      pa.needsUpdate = ca.needsUpdate = pb.needsUpdate = cb.needsUpdate = true
    }
    if (!embers.current || !embers.current.length) {
      const found = new Map<THREE.MeshToonMaterial, number>()
      root.traverse((o) => {
        if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshToonMaterial &&
          (o.material.name === 'Ember' || o.material.name === 'Binchotan')) {
          found.set(o.material, o.material.emissiveIntensity)
        }
      })
      embers.current = [...found].map(([mat, base]) => ({ mat, base, color: mat.color.clone() }))
    }
    // (Dish sets every mesh to cast and receive shadows as it loads, so the ground and net are put right here, once it has)
    if (!root.userData.shadowsFixed) {
      const g = root.getObjectByName('FirePit') as THREE.Mesh | undefined
      const n = root.getObjectByName('GrillNet')
      // (the net a group of its meshes now (its wires a cut-out card of their own material beside the iron's, item 85): every one of them)
      let casts = false
      n?.traverse((o) => { if ((o as THREE.Mesh).isMesh && o.castShadow) casts = true })
      if (g && n && g.receiveShadow && casts) {
        g.receiveShadow = false
        n.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = false })
        root.userData.shadowsFixed = true
      }
    }
    const target = heatOf()
    // (the fire's sound: its crackle by how hot, its sizzle by what's over it; loud with the camera near the fire, faint across the room)
    if (active) {
      const over = pieces.current.filter((p) => present(p) && !p.collected && !p.staged && !p.carried).length
      const snd = fireSound(Math.min(1, target), over)
      const camD = frameCam.position.distanceTo(root.getWorldPosition(new THREE.Vector3()))
      fireAmbience(snd.crackle, snd.sizzle, THREE.MathUtils.clamp(1.4 - camD / 12, 0.15, 1), tick(delta))
    }
    // (the coals' own state eases toward the fire: charcoal added swells up and kindles over a moment, the pile shrinks back slowly as it burns)
    const ease = target > fuel.current ? 0.05 : 0.35
    fuel.current += (target - fuel.current) * Math.min(1, delta * ease)
    const f = fuel.current
    const ash = THREE.MathUtils.smoothstep(0.5 - f, 0, 0.45)
    // (no fire: only a few lumps of grey ash and slag; charcoal is what swells the heap, kindles and glows)
    // (the ash bed stays as it is under the charcoal, lit or not: the first sticks go on over it, and it isn't swapped away)
    const burning = f > 0.02
    // (the model's own heap of orange lumps is never shown: the bed is the sticks thrown on it, all one kind, and a fire lit with none gets a few laid on it)
    for (const nm of ['Charcoal', 'BinchotanHeap']) {
      const o = root.getObjectByName(nm)
      if (o) o.visible = false
    }
    // (as many as the fire's level has burning (item 199: a handful's six or seven under a gauge at half, eighteen's worth))
    if (burning && !bedSeeded.current && !coals.current.some((c) => c && !c.gone && !c.dying)) { bedSeeded.current = true; dropCoals(undefined, Math.max(1, glowingFor(fire?.current ?? f))) }

    embers.current.forEach((e, i) => {
      // no fire, no glow; as the heap kindles its glow goes from a deep red, through orange, toward a yellower white at the full blaze, and it breathes
      const flick = 0.93 + 0.07 * Math.sin(clock * 6.1 + i * 2.3) * Math.sin(clock * 2.7 + i)
      e.mat.emissiveIntensity = e.base * 1.23 * f ** 1.6 * flick
      e.mat.emissive.setRGB(0.55 + 0.45 * Math.min(1, f * 1.3), 0.1 + 0.5 * Math.min(1, f) ** 1.5, 0.02 + 0.18 * Math.min(1, f) ** 3)
      const gain = 1 + ((ASH_GAIN[e.mat.name] ?? 1) - 1) * ash ** 1.5
      e.mat.color.copy(e.color).lerp(ASH_TINT, ash).multiplyScalar(gain)
    })
    if (scannedCount.current !== root.children.length) scan()
    const dt = tick(delta)
    // fanned-up heat burns the coals faster while it lasts (more the hotter it's been fanned), and dies back once the
    // fanning stops
    const fan = fanned.current
    if (fan.pending > 0 && fire) {
      const rise = Math.min(fan.pending, dt * FAN_RISE, Math.max(0, FIRE_FANNED_MAX - fire.current))
      fire.current += rise
      // (fanned, the bed's coals flare at once: the heat with it, not catching like fresh charcoal)
      if (heat) heat.current += rise
      fan.extra += rise
      fan.pending -= rise
      if (rise <= 0) fan.pending = 0
    }
    if (fan.extra > 0 && fire) {
      fire.current = Math.max(0, fire.current - dt * GAME_SPEED.value * FAN_BURN * (fan.extra / FAN_MAX))
      if (performance.now() - fan.last > 600) {
        const back = Math.min(fan.extra, dt * FAN_FADE)
        fan.extra -= back
        fire.current = Math.max(0, fire.current - back)
      }
      if (fire.current <= 0.02) { fan.extra = 0; fan.pending = 0 }
    }
    // (past 100% the coals are going up fast: the more over, the faster they're used up)
    if (fire && fire.current > 1) fire.current = Math.max(1, fire.current - dt * GAME_SPEED.value * FAN_OVER_BURN * ((fire.current - 1) / (FIRE_FANNED_MAX - 1)))
    // soup going down as it's drunk: the surface sinks into the bowl and narrows with it; a bowl taken off the
    // order comes back full next time
    root.traverse((o) => {
      const id = o.userData.itemId as string | undefined
      if (!id || !roast.drinks?.includes(id)) return
      const liquid = o.children.find((c) => /^(Miso|Sake)Liquid/.test(c.name))
      if (!liquid) return
      if (!liquid.userData.full) liquid.userData.full = { y: liquid.position.y }
      if (!o.visible || o.scale.x < 0.01) {
        sips.current.delete(o.uuid)
        return
      }
      const s = sips.current.get(o.uuid)
      if (!s) {
        liquid.position.y = liquid.userData.full.y
        liquid.scale.set(1, 1, 1)
        liquid.visible = true
        return
      }
      s.level += (s.left / SIPS - s.level) * Math.min(1, dt * 4)
      const gone = 1 - s.level
      // (the sake cup is much shallower than the soup bowl)
      const cup = liquid.name.startsWith('Sake')
      liquid.position.y = liquid.userData.full.y - gone * (cup ? 0.022 : 0.07)
      liquid.scale.set(1 - gone * (cup ? 0.5 : 0.42), 1, 1 - gone * (cup ? 0.5 : 0.42))
      liquid.visible = s.level > 0.03
    })
    // seasonings: the one being carried follows the pointer, tipped to pour over the food beneath it (a little
    // sprinkle or drip falls while it's over something); the rest sit in their places, glowing when pointed at
    const d = drag.current
    for (const t of tools) {
      const held = d?.tool === t
      if (held && t.kind === 'salt' && hand.current) hand.current.position.copy(t.node.position).add(HAND_OFFSET)
      const pour = pouring.current?.tool === t ? pouring.current : null
      if (held && t.kind === 'water' && d!.scoop < 1) {
        // (the dipper first goes down into the bucket and comes up full: down to the water, a dip under it, and up out again)
        d!.scoop = Math.min(1, d!.scoop + dt / 0.55)
        const k = d!.scoop
        const down = Math.sin(Math.min(1, k * 1.25) * Math.PI)
        t.node.position.copy(t.home).add(new THREE.Vector3(0, -0.11 * down + 0.06 * Math.max(0, k - 0.6) / 0.4, 0))
        t.node.quaternion.copy(t.homeQ).premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, -1).normalize(), -0.25 * down))
        if (k > 0.45 && dipperWater) { dipperWater.visible = true; dipperWater.scale.setScalar(1) }
        if (Math.random() < dt * 12 * down) emit('water', t.node.position.clone().add(new THREE.Vector3(0, 0.02, 0)), 2)
      } else if (held) {
        const dd = d!
        dd.t += dt
        // (the dipper, full, held level so as not to spill until it's let go; the rest tip toward the food they're over, and work it there)
        const want = t.kind === 'water' ? 0 : dd.target ? 1 : 0
        dd.pour += (want - dd.pour) * Math.min(1, dt * 8)
        dd.base.lerp(dd.at, Math.min(1, dt * 14))
        const act = toolAction(t.kind, dd.t)
        t.node.position.copy(dd.base).addScaledVector(act.off, dd.pour)
        t.node.quaternion.copy(t.homeQ).premultiply(new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(1, 0, -1).normalize(), (t.kind === 'water' ? 0 : 0.2) + dd.pour * (0.9 + act.tilt)))
        // (its grains or drops falling evenly, as fast as it's worked: none while it's only being carried)
        if (t.kind !== 'water' && dd.target) {
          dd.acc += dt * act.rate * dd.pour
          for (; dd.acc >= 1; dd.acc -= 1) emit(t.kind, t.node.position.clone().add(new THREE.Vector3(0, -0.05, 0)), 1)
          dd.tick += dt
          if (dd.tick > 0.16) { dd.tick = 0; sprinkleTick(t.kind) }
          // (held over a piece, it goes on every so often: a moment after it's come over the piece, and no sooner after the last time than
          // DAB_EVERY, however the hand wavers between pieces)
          if (dd.on !== dd.target) { dd.on = dd.target; dd.dwell = 0 }
          dd.dwell += dt
          if (dd.dwell >= DAB_FIRST && dd.since >= DAB_EVERY) {
            dd.since = 0
            dabNow(dd.target, t.kind, t.node.position)
            dd.dabbed.add(dd.target)
          }
        } else {
          dd.on = null
          dd.dwell = 0
        }
        dd.since += dt
      } else if (pour) {
        // (pouring: the dipper tips over where it was let go, its water running out in a stream, then it's carried back)
        pour.left -= dt
        const k = 1 - Math.max(0, pour.left) / 0.8
        t.node.position.lerp(pour.at, Math.min(1, dt * 14))
        t.node.quaternion.copy(t.homeQ).premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, -1).normalize(), Math.min(1, k * 2) * 1.9))
        if (k > 0.2 && k < 0.95) emit('water', t.node.position.clone().add(new THREE.Vector3(0.03, -0.04, 0.03)), 4)
        if (dipperWater) dipperWater.scale.setScalar(Math.max(0.01, 1 - Math.max(0, k - 0.25) / 0.6))
        if (pour.left <= 0) {
          pouring.current = null
          t.back = 0
          if (dipperWater) dipperWater.visible = false
        }
      } else if (t.back < 1) {
        // carried back home in a little arc
        t.back = Math.min(1, t.back + dt * 2.5)
        t.node.position.lerp(t.home, Math.min(1, dt * 10))
        t.node.quaternion.slerp(t.homeQ, Math.min(1, dt * 10))
        if (t.back >= 1) {
          t.node.position.copy(t.home)
          t.node.quaternion.copy(t.homeQ)
        }
      }
      const lit = active && (held || hoveredTool.current === t ||
        (!!shift.current && carrierOf(t.node.name) === shift.current.key))
      t.node.traverse((o) => {
        if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshToonMaterial) {
          // (the spoons' and brushes' handles share one wood material: each gets its own, so only this one glows)
          if (!o.userData.ownMaterial) {
            o.material = o.material.clone()
            o.userData.ownMaterial = true
          }
          o.material.emissive.set(lit ? HOVER_GLOW : 0x000000)
        }
      })
    }
    {
      // (the ledge as one: once it's been still a second where it is, and only while nothing on it is held, pointed at or carried back)
      const L = ledge.current
      const n = nudge('box')
      const key = `${n.x.toFixed(4)},${n.y.toFixed(4)},${n.z.toFixed(4)}`
      if (key !== L.key) { L.copy?.dispose(); L.copy = null; L.key = key; L.since = 0 }
      const still = !d && !pouring.current && !hoveredTool.current && !shift.current && tools.every((t) => t.back >= 1)
      if (!L.copy && still && carriers.box && (L.since += dt) > 1) {
        const members = [...carriers.box.map((b) => b.node), ...tools.filter((t) => carrierOf(t.node.name) === 'box').map((t) => t.node)]
        L.copy = ledgeCopy(root, members)
        // (couldn't be made: not tried again till the ledge moves)
        if (!L.copy) L.since = -Infinity
      }
      L.copy?.home(still)
    }
    {
      const { pos, vel, life } = grains
      let any = false
      for (let i = 0; i < GRAINS; i++) {
        if (life[i] <= 0) continue
        any = true
        life[i] -= dt
        vel[i * 3 + 1] -= 4.5 * dt
        pos[i * 3] += vel[i * 3] * dt
        pos[i * 3 + 1] += vel[i * 3 + 1] * dt
        pos[i * 3 + 2] += vel[i * 3 + 2] * dt
        // (a grain that reaches the table top is gone into it; one that's done is put far out of sight: parked just
        // under the table it would show on the floors, which lie below it)
        if (pos[i * 3 + 1] < 0.004) life[i] = 0
        if (life[i] <= 0) pos.set([0, -1e4, 0], i * 3)
      }
      if (any) grains.geometry.attributes.position.needsUpdate = true
      grains.geometry.attributes.color.needsUpdate = true
    }
    // (the seasoned pieces' bounces run on; the rings spread and fade)
    for (const [p, k] of bounces.current) {
      if (k + dt / BOUNCE_TIME >= 1) bounces.current.delete(p)
      else bounces.current.set(p, k + dt / BOUNCE_TIME)
    }
    ringObjs.current.forEach((ring, k) => {
      if (!ring) return
      const left = ringLife.current[k]
      ring.visible = left > 0
      if (left <= 0) return
      ringLife.current[k] = left - dt
      const u = 1 - Math.max(0, ringLife.current[k]) / RING_LIFE
      ring.scale.setScalar(0.6 + u * 1.6)
      ;(ring.material as THREE.MeshBasicMaterial).opacity = 0.75 * (1 - u)
    })
    // the grill net holds a few at a time: hand free spots to waiting pieces, first ordered first
    const spots = roast.netSpots ?? []
    if (spots.length) {
      const onNet = (p: Piece) => roast.net?.includes(p.id) && present(p) && !p.collected && !p.staged
      // (one spot, one piece: should two hold the same, the one that's been on longest keeps it and the other waits its turn off the net;
      // and what's done but still lying on it, waiting to be taken to the plating place, keeps its own (item 332))
      const taken = new Set<number>()
      for (const p of pieces.current) if (p.collected && p.netSpot !== null && roast.net?.includes(p.id)) taken.add(p.netSpot)
      for (const p of pieces.current.filter((q) => onNet(q) && q.netSpot !== null).sort((a, b) => b.progress - a.progress)) {
        if (taken.has(p.netSpot!)) p.netSpot = null
        else taken.add(p.netSpot!)
      }
      for (const p of pieces.current.filter((q) => onNet(q) && q.netSpot === null).sort((a, b) => a.copy - b.copy)) {
        const free = spots.findIndex((_, i) => !taken.has(i))
        if (free < 0) break
        p.netSpot = free
        taken.add(free)
      }
    }
    const waiting = (p: Piece) => !!roast.net?.includes(p.id) && !p.collected && !p.staged && p.netSpot === null
    // what's waiting on the tray, in the order it arrived
    // (what the chef has brought back to his place: onto the board, from his hands, and prepared there a moment before it can go on;
    // with no chef walking the orders (the shop shut, a phone), what's waiting comes out as it used to)
    const T = CHEF_TRIP
    // (not as the shop's closing, the staff going home: what's taken out of the freezer then would wait for a second cook who never comes for it,
    // and never show (item 124, the owner's, 2026-11-15: "I clicked the fish and it didn't come onto the board"); out on the board at once)
    const fetchLive = space === 'open' && bar && !SHOP.leaving && !SHOP.closing && performance.now() - T.seenAt < 1000
    if (T.phase === 'prepping' && T.keys.length) {
      for (const p of pieces.current) if (p.fetching && T.keys.includes(p.key)) {
        p.fetching = false
        p.fresh = false
        p.node.userData.shrink = undefined
        p.prepUntil = performance.now() + Math.max(0, prepOf(T.store) - T.t) * 1000
      }
      T.keys = []
    }
    if (!fetchLive) for (const p of pieces.current) if (p.fetching) { p.fetching = false; p.fresh = true; p.node.userData.shrink = undefined; FRIDGE_KICK.at = performance.now() }
    const onTray = pieces.current.filter((p) => p.staged && !p.fetching && present(p) && !p.carried && p.trash < 0)
      .sort((a, b) => a.stagedAt - b.stagedAt)
    // (those on the raw dish don't take a place on the tray; nor the potatoes in their foil, which wait in the basket (item 583))
    const onBoard = onTray.filter((p) => !roast.rawDish?.items.includes(p.id) && !isTuber(p))
    // (the tray takes so many: the rest wait in the fridge, unseen, until there's room)
    const boardSticks = onBoard.filter((q) => !q.loose), boardLoose = onBoard.filter((q) => q.loose)
    // (and the rice balls' little dish takes three, round it: the rest wait in the fridge too (the fourth and after stood in a column over
    // its middle, one on another: the owner's "heaped like a mountain", 2026-11-13))
    const onRawDish = onTray.filter((p) => !!roast.rawDish?.items.includes(p.id))
    const inFridge = new Set([...boardSticks.slice(TRAY_CAP), ...boardLoose.slice(LOOSE_CAP), ...onRawDish.slice(RAW_DISH_CAP)])
    // (how many are on the board, for the freezer to hold back more while it's full (item 115) and the board to say)
    BOARD.n = onBoard.length

    // ---- the places round the fire (game/fireSlots): each given up as what holds it leaves it, in his hands to the plating place, flying off
    // by itself, done with, or back on the board; every piece, a fish's rod its own or not (held by those without one, a rush's fire was
    // taken up whole by what had long been eaten, and nothing more went on)
    for (const p of pieces.current) {
      if (p.ringSlot === undefined && p.netSpot === null) continue
      const gone = !present(p) || p.trash >= 0 || p.eaten || p.staged || p.fetching ||
        (p.collected && (CHEF_CARRY.key === p.key ? CHEF_CARRY.phase !== 'reach' : p.flight > 0))
      if (gone) { p.ringSlot = undefined; p.netSpot = null }
    }
    // ---- the iron skewers (the owner's: fifty of them, game/skewers): a piece's pushed onto one from the holder in the last of its preparing on
    // the board (none clean: it waits there, said once); pulled out as it lands on its plate (the shop open) into the used tray; its rod drawn
    // growing in as it's pushed through, shrinking out as it's pulled. And how many are on food, for the count; the pool kept whole
    {
      const now = performance.now()
      let inUse = 0
      for (const p of pieces.current) {
        if (!p.sticks.length) continue
        const here = present(p) && p.trash < 0 && !p.eaten
        // (researching, what's on the board is skewered by hand: a clean skewer dragged from the holder onto it (the owner's))
        // (nor in the frame it's taken out, before it's set on the board: it was skewered then, on its way there)
        if (here && p.skewerAt === undefined && !p.fetching && !(space !== 'open' && (p.staged || !p.wasPresent))) {
          const ready = !p.staged || p.prepUntil === undefined || now >= p.prepUntil - 600
          if (ready) {
            let t = takeSkewer(SKEWERS.s)
            // (the shop shut, the owner on his own: he washes the used ones himself when the holder's empty)
            if (!t && space !== 'open' && SKEWERS.s.dirty + SKEWERS.s.carrying > 0) { SKEWERS.s = washAll(SKEWERS.s); t = takeSkewer(SKEWERS.s) }
            if (t) { SKEWERS.s = t; p.skewerAt = now; pierceSound(); CHEF_TRIP.pierceAt = now }
            else {
              p.prepUntil = Math.max(p.prepUntil ?? 0, now + 800)
              if (now - noSkewerSaid.current > 15000) { noSkewerSaid.current = now; chefSay(L().noSkewer) }
            }
          }
        }
        // (researching too: what's tasted is in the bowl without its skewer (the owner's: no skewer in a bowl or on a plate; one was left
        // lying in the bowl when the food was eaten off it, a taste shown for it))
        // (pulled as it's down where it's going, whatever it's done with: a takeaway's in its box had kept its rod when it wasn't counted here
        // (the owner saw rods on the box))
        if (p.skewerAt !== undefined && p.pullAt === undefined && p.collected && p.flight >= 1 && p.trash < 0 && !p.eaten) {
          p.pullAt = now
          SKEWERS.s = usedSkewer(SKEWERS.s)
          clinkSound()
          // (pulled out by the chef, the food left on the plate, the rod dropped in the used bucket (SkewerStore flies it there))
          // (it flies from where it's drawn out to, once it's out)
          const rod = p.sticks[0]
          if (rod?.parent && PULLED.length < 8) PULLED.push({ from: rod.parent.localToWorld((rod.userData.rodHome as THREE.Vector3).clone().addScaledVector(rod.userData.rodOut as THREE.Vector3, rod.scale.x * PULL_OUT)), at: now + PULL_MS })
        }
        if (here && p.skewerAt !== undefined && p.pullAt === undefined) inUse++
        // (the rod: in as it's pushed, out as it's pulled; none before or after)
        const grow = p.skewerAt === undefined ? 0 : p.pullAt !== undefined ? 1 - Math.min(1, (now - p.pullAt) / 450) : Math.min(1, (now - p.skewerAt) / 600)
        // (every rod the one standard size (the owner's, 2026-11-11: some long and thick, a week of it): its shape is made for the piece at its
        // home size; however much larger than that the piece is drawn in the world now (its own size, popping in or served, and everything it's
        // in), the rod's taken back by as much: never larger than standard. Smaller (popping in, shrunk away) it goes with the piece, as it did.
        // (it went by the piece's own size against what it was meant to be, and the whole fish, drawn 1.1 to 1.3 as they're served, kept rods
        // to 2 m long))
        const hs = p.node.userData.home?.s as THREE.Vector3 | undefined
        // (read from its world matrix as last drawn: getWorldScale would work the whole chain above it out again, for every piece, every frame)
        const wk = hs && hs.x > 0 ? ROD_WS.setFromMatrixScale(p.node.matrixWorld).x / hs.x : 1
        const keep = wk > 1.0 ? 1 / wk : 1
        for (const m of p.sticks) {
          const home = m.userData.rodHome as THREE.Vector3 | undefined
          if (p.pullAt !== undefined && !p.stickOnly && home) {
            // (pulled: drawn out along itself by its loop, quicker as it comes, its whole length and a little more, then gone to the bucket)
            const t = Math.min(1, (now - p.pullAt) / PULL_MS)
            m.visible = t < 1
            m.scale.setScalar(keep)
            m.position.copy(home).addScaledVector(m.userData.rodOut as THREE.Vector3, keep * PULL_OUT * t * t)
            continue
          }
          if (home) m.position.copy(home)
          m.visible = grow > 0.001 && !p.stickOnly ? true : p.stickOnly && p.pullAt === undefined
          m.scale.setScalar((p.stickOnly ? 1 : Math.max(0.001, grow)) * keep)
        }
      }
      SKEWERS.inUse = inUse
      const lost = SKEWER_POOL - skewerTotal(SKEWERS.s, inUse)
      if (lost !== 0) SKEWERS.s = { ...SKEWERS.s, clean: Math.max(0, SKEWERS.s.clean + lost) }
    }
    // (how far into their dish each customer is, kept afresh each frame below (bar.ts's EAT_PHASE))
    EAT_PHASE.clear()
    pieces.current.forEach((p, n) => {
      bindMaterials(p)
      // (its one ink line shown while its food is)
      if (p.ink && p.inkOf) p.ink.visible = p.inkOf[0].visible
      if (present(p) && !p.wasPresent) {
        // just ordered: it's brought out raw on the tray (the base fish, not on the menu, starts on the fire)
        p.wasPresent = true
        p.node.userData.shrink = undefined
        // (in the open shop: the next one of these ordered, as what dish)
        if (space === 'open') {
          const i = wants.current.findIndex((w) => w.id === p.id)
          p.want = i >= 0 ? wants.current.splice(i, 1)[0] : null
        }
        if (menuIds.has(p.id) && roast.tray) {
          p.staged = true
          p.fresh = true
          // (no place on the grill net while it's on the tray: the net's spots were handed out above, this same frame, to whatever wasn't
          // on the tray or off the fire, this one too the moment it was put out; it kept that spot on the tray, the spot went to the next
          // one (on the tray it holds none), and it went on the net with it, on top of that one: four mochi on one spot in a rush, rice
          // balls one on another (the owner's, 2026-11-13, "heaped like a mountain"))
          p.netSpot = null
          p.stagedAt = ++stageSeq.current
          p.tended = false
          p.prepUntil = undefined
          // (in the open shop the chef goes and gets it: it stays where it's kept till he brings it; else it's out on the board at once)
          p.fetching = fetchLive
          if (!fetchLive) FRIDGE_KICK.at = performance.now()
          p.node.userData.onPlate = true
        }
      }
      // (a takeaway's, shut in its box once its lid's on, or gone out with it: not drawn through the lid (it lay over it, the owner saw);
      // drawn again as soon as it's anything else)
      const boxed = p.container === 'takeout' && p.collected && (p.eaten || TAKEOUT.orders.some((o) => o.id === p.guest && o.ready))
      if (boxed) { p.node.visible = false; p.node.userData.boxed = true } else if (p.node.userData.boxed) { p.node.visible = true; p.node.userData.boxed = false }
      if (!present(p)) {
        // taken off the order: next time it comes back raw, on the tray
        // (sent home to the fire's place but kept at no size, so it isn't seen there for the moment it takes Dish to shrink it away)
        if (menuIds.has(p.id)) p.node.userData.shrink = 0.0001
        p.wasPresent = false
        p.staged = false
        p.fetching = false
        // (and off its skewer: kept, it came back on its next order raw from the freezer with last time's rod through it (the owner saw rods
        // on what was being fetched), and wasn't skewered again at the board)
        p.skewerAt = undefined
        p.pullAt = undefined
        p.homeFlight = 1
        p.unwrapped = false
        p.unwrapT = 0
        p.chefSeasoned = false
        for (const k of Object.keys(p.dabs) as Seasoning[]) p.dabs[k] = 0
        p.steps = []
        p.progress = 0
        p.lead = 0; p.turned = false; p.turnT = 0; p.sideSet = false; p.wasDone = false
        p.netSpot = null
        p.ringSlot = undefined
        p.container = null
        p.carried = false
        p.trash = -1
        p.body = null
        for (const u of Object.values(p.looks)) { if (typeof u.value === 'number') u.value = 0; else u.value.set(1, 0, 0) }
        p.stickOnly = false
        // (its bitten-away parts back; not the piece itself where it's a single mesh (the daikon, the onion, the mochi): that's Dish's to show
        // or hide, and set shown here every frame it was drawn shrunk to nothing on the net, never ordered)
        for (const m of p.food) if (m !== p.node) m.visible = true
        if (p.bites.uBiteCount.value) {
          p.bites.uBiteCount.value = 0
          for (const { mat, foil } of p.mats) if (!foil && mat.side !== THREE.FrontSide) {
            mat.side = THREE.FrontSide
            mat.needsUpdate = true
          }
        }
        p.landed = -1
        p.via = undefined
        p.small = false
        p.trayAt = undefined
        p.tonged = false
        p.tong = false
        p.collected = false
        p.flight = 0
        p.slot = null
        p.eat = 0
        p.eaten = false
        p.want = null
        p.node.userData.onPlate = false
        p.node.userData.follow = undefined
        p.node.quaternion.copy(p.homeQ)
        p.node.position.copy(p.homeP)
        return
      }
      // eaten and gone (or in the bin): nothing more to work out for it, every frame, however many there have been
      // (and nothing of it left for a server to carry; nor anything left told of one that isn't going through the
      // pass, should the floor have set it down just as it was taken away)
      if (!p.via && SERVICE.delivered.size) SERVICE.delivered.delete(p.key)
      if (p.eaten && p.via) {
        p.via = undefined
        SERVICE.waiting.delete(p.key)
        SERVICE.carried.delete(p.key)
        SERVICE.claimed.delete(p.key)
        SERVICE.delivered.delete(p.key)
      }
      if (p.eaten && p.trash < 0) {
        if (menuIds.has(p.id)) p.node.userData.shrink = 0.0001
        else p.node.scale.setScalar(0.0001)
        return
      }
      const time = roast.times[p.id]
      if (p.trash >= 0) {
        // tossed into the bin: a short arc down into it, and gone
        p.trash = Math.min(1, p.trash + dt / 0.45)
        const k = p.trash
        const into = containerAt('trash')
        into.y += 0.12
        p.node.position.lerpVectors(p.trashFrom, into, k)
        p.node.position.y += Math.sin(k * Math.PI) * 0.12
        if (k >= 1) {
          p.trash = -1
          p.eaten = true
          // it's in the bin now: one more thing lying in it
          trashedRef.current += 1
          setTrashed(trashedRef.current)
          p.slot = null
          p.collected = true
          p.stickOnly = false
        }
      } else if (p.carried) {
        // (held by the pointer, see haul)
      } else if (p.staged && p.fetching) {
        // (still where it's kept, unseen; then in the chef's hands as he takes it out and carries it back, side by side)
        const i = T.keys.indexOf(p.key)
        const held = i >= 0 && (T.phase === 'toBoard' || (T.phase === 'taking' && T.t > TAKE_S * 0.5))
        if (held && p.node.parent) {
          const at = p.node.parent.worldToLocal(T.hand.clone()).addScaledVector(STACK_DIR, (i - (T.keys.length - 1) / 2) * 0.07)
          if (p.node.userData.shrink !== undefined) p.node.position.copy(at)
          else p.node.position.lerp(at, Math.min(1, dt * 14))
          p.node.userData.shrink = undefined
          flatQ(p, p.node.quaternion, ON_BOARD)
        } else p.node.userData.shrink = 0.0001
      } else if (p.staged && roast.rawDish?.items.includes(p.id) && !inFridge.has(p)) {
        // rice balls wait raw on their own little dish, sitting the way they'll go on the net, three round it
        const k = Math.max(0, onRawDish.indexOf(p))
        const a = (k / RAW_DISH_CAP) * Math.PI * 2 + 0.4
        const at = containerAt('rawdish').add(new THREE.Vector3(Math.cos(a) * 0.1, 0.05, Math.sin(a) * 0.1))
        // (out of the fridge (or just ordered), set straight down in its place, as on the tray)
        if (p.fresh) { p.node.position.copy(at); p.fresh = false } else p.node.position.lerp(at, Math.min(1, dt * 10))
        p.node.quaternion.copy(p.homeQ)
      } else if (p.staged && inFridge.has(p)) {
        // (still in the fridge: set straight down in its spot when it's brought out)
        p.fresh = true
      } else if (p.staged && isTuber(p)) {
        // (item 583, the owner's 「然後這類根莖塊類食物，不應該在生食沾坂上」: a potato or a sweet potato in its foil waits in the bamboo basket by
        // the board, not on the board, where raw fish and meat wait: let go over the basket as it's set out, it drops in and comes to rest
        // there by the basket's own settling (settleBasket), with any roasted ones come back to it; taken from there onto the fire)
        if (!p.body?.live) {
          // (its size as made (Dish's), not as it's drawn this moment: the first of each, waiting unseen till then, was still at nothing, and
          // came to rest as a point, the two firsts one inside the other (the Tester's, item 583))
          const sc = (p.node.userData.home?.s as THREE.Vector3 | undefined) ?? p.node.scale
          const s = [sc.x, sc.y, sc.z].sort((x, y) => x - y)
          const k = onTray.indexOf(p)
          p.node.position.copy(basketAt(0)).add(new THREE.Vector3(Math.cos(k * 2.4) * 0.12, 0.3 + (k % 4) * 0.06, Math.sin(k * 2.4) * 0.12))
          flatQ(p, p.node.quaternion, STACK_DIR)
          p.body = { v: new THREE.Vector3(0, -0.4, 0), r: (s[0] + s[1]) / 2 * 1.05, live: true }
          p.fresh = false
        }
      } else if (p.staged) {
        // waiting raw on the tray, laid flat in its spot
        const at = p.loose ? trayLooseSpot(Math.max(0, boardLoose.indexOf(p))) : traySpot(Math.max(0, boardSticks.indexOf(p)))
        // (lying along the tray's long side, which runs across the front, its point away from the cook; the rod's middle on its spot)
        flatQ(p, p.node.quaternion, p.loose ? STACK_DIR : ON_BOARD)
        if (!p.loose && p.stickMid) {
          const off = p.stickMid.clone().multiply(p.node.scale.x > 0.01 ? p.node.scale : ONE).applyQuaternion(p.node.quaternion)
          at.x -= off.x
          at.z -= off.z
        }
        if (p.fresh) { p.node.position.copy(at); p.fresh = false } else p.node.position.lerp(at, Math.min(1, dt * 10))
      } else if (!p.collected) {
        if (active && !waiting(p) && !p.carried && p.homeFlight >= 1) {
          p.progress += dt * roastRate(heatOf())
          // (fat dripping onto the coals as it cooks (item 276): a fatty fish or meat, from a third done on, now and then, a flare of flame
          // under it a moment and the hiss of it; nothing over a bed too low to flame)
          const r = p.progress / (roast.times[p.id] ?? 1)
          // (item 473: standing round the fire on its stick, the flank it shows the coals browns first; turned on its stick half way (a
          // hiss as its paler side meets the heat), the other catches up. What lies on the net, loose in the ash, or swells as it
          // toasts cooks evenly)
          if (p.netSpot === null && !p.loose && !p.puffs.length) {
            FIRE_SIDE.set(-p.node.position.x, -0.25, -p.node.position.z).normalize().applyQuaternion(FIRE_INV.copy(p.node.quaternion).invert())
            if (!p.sideSet) { p.looks.uSide.value.copy(FIRE_SIDE); p.sideSet = true }
            p.lead += (dt * roastRate(heatOf()) / (roast.times[p.id] ?? 1)) * SIDE_LEAD * Math.sign(FIRE_SIDE.dot(p.looks.uSide.value))
            if (!p.turned && r >= TURN_AT) { p.turned = true; p.turnT = 0.0001; sizzleBurst(p.node.getWorldPosition(SIZZLE_AT), 0.55) }
          }
          // (just right: a hiss, a wisp of its smell off it, a warm glint on it a moment)
          if (!p.wasDone && r >= 1) {
            p.wasDone = true
            flashUntil.current.set(p.key, performance.now() + 650)
            sizzleBurst(p.node.getWorldPosition(SIZZLE_AT), 1)
            WISP_FEED.to?.({ key: `done-${p.key}`, at: [p.node.position.x, p.node.position.y + 0.05, p.node.position.z] })
          }
          if (FATTY.test(p.id) && r > 0.33 && r < 1.1 && heatOf() > 0.15 && Math.random() < dt * 0.14) {
            FIRE_FLARE.fat = Math.max(FIRE_FLARE.fat, 0.55 + 0.45 * Math.random())
            sizzleBurst(p.node.getWorldPosition(SIZZLE_AT), 0.8)
          }
        }
        p.node.quaternion.copy(p.homeQ)
        // (item 473: turned on its stick, half a second, eased; turned, it stays so)
        if (p.turnT > 0) {
          if (p.turnT < 1) p.turnT = Math.min(1, p.turnT + dt / TURN_S)
          p.node.quaternion.multiply(STICK_TURN.setFromAxisAngle(STICK_AXIS, p.turnT * p.turnT * (3 - 2 * p.turnT) * Math.PI))
        }
        p.node.position.x = p.homeP.x
        p.node.position.z = p.homeP.z
        if (p.netSpot !== null) {
          p.node.position.x = spots[p.netSpot][0]
          p.node.position.z = spots[p.netSpot][1]
        }
        if (p.homeFlight < 1) {
          // carried from the tray onto the fire: a little arc to its spot, turning upright onto the stick
          p.homeFlight = Math.min(1, p.homeFlight + dt / 0.6)
          const e = p.homeFlight < 0.5 ? 2 * p.homeFlight ** 2 : 1 - (-2 * p.homeFlight + 2) ** 2 / 2
          const to = new THREE.Vector3(p.node.position.x, p.homeP.y, p.node.position.z)
          p.node.position.lerpVectors(p.fromP, to, e)
          p.node.position.y += Math.sin(p.homeFlight * Math.PI) * 0.35
          p.node.quaternion.slerpQuaternions(p.fromQ, p.homeQ, e)
          if (p.homeFlight >= 1) p.node.userData.onPlate = false
        }
        if (!menuIds.has(p.id)) p.node.position.y = p.homeP.y   // the base fish has no pop-in driving y
      } else {
        if (p.flight >= 1) p.landed += dt
        else p.landed = -1
        if (p.flight < 1 && p.flight + dt / FLIGHT_SECONDS >= 1 && STEAMS.test(p.id) && !p.eaten) {
          p.landed = 0
          const at = inBasket(p) ? basketAt(0).add(new THREE.Vector3(0, 0.06, 0)) : p.toP
          WISP_FEED.to?.({ key: p.key, at: at.toArray() as [number, number, number] })
        }
        // (served at the bar, it waits in the cook's hand by the fire till the customer's plate is set down for it)
        const plateless = p.container === 'bar' && bar && !SERVICE.servers && !p.via && p.flight === 0 && !PLATES_SET.has(p.seat)
        // (served through the plating place: out there till a server takes it, then on the tray with them, then onto the plate)
        if (p.via === 'plated') {
          if (SERVICE.delivered.has(p.key)) {
            SERVICE.delivered.delete(p.key)
            // (its stick left on the plate once it's eaten: cleared with it, into the bin by the sink)
            if (!p.loose && p.skewerAt !== undefined && p.pullAt === undefined) SEAT_STICKS.set(p.seat, (SEAT_STICKS.get(p.seat) ?? 0) + 1)
            if (WHOLE_FISH.has(p.id)) SEAT_BONES.set(p.seat, (SEAT_BONES.get(p.seat) ?? 0) + 1)
            const row = pieces.current.filter((q) => q !== p && q.collected && q.container === 'bar' && q.seat === p.seat && !q.via && present(q) && !q.eaten && q.loose === p.loose).length
            p.fromP.copy(p.node.position)
            p.fromQ.copy(p.node.quaternion)
            // (on the seat's plate as it lies before its customer, turned along their counter (item 228))
            seatFoodAt(p.seat, row, plateOfSeat(p.seat), p.toP, p.loose)
            if (!p.passQ) p.passQ = p.toQ.clone()
            p.toQ.copy(p.passQ).premultiply(TURN_Q.setFromAxisAngle(UP_AXIS, seatTurn(p.seat)))
            SERVICE.turn.delete(p.key)
            // (its spot is kept as where it is from the bar (the frame below puts it there each frame): moved to the plate, or it went back to
            // the plating place every frame, and lay there, on the plating place, while its customer's plate went out empty (the owner saw two skewers
            // left on the board))
            p.local.copy(p.toP).sub(containerAt('bar'))
            p.via = undefined
            // (on the plate already, the plate put down: there at once (item 203: its flight restarted at 0.6, it jumped up 0.43 off the plate
            // as the server set it down, and dropped back))
            p.flight = 1
          } else if (SERVICE.carried.has(p.key)) {
            // (on the server's tray, where they hold it: its spot moved with it, as above; the bar hands it in its own frame)
            p.fromP.copy(SERVICE.carried.get(p.key)!).sub(FIRE_SHIFT)
            p.toP.copy(p.fromP)
            // (and turned as its plate's turned, set down before its customer (item 228))
            if (!p.passQ) p.passQ = p.toQ.clone()
            p.toQ.copy(p.passQ).premultiply(TURN_Q.setFromAxisAngle(UP_AXIS, SERVICE.turn.get(p.key) ?? 0))
            p.local.copy(p.toP).sub(containerAt('bar'))
            p.flight = 1
          } else if (p.readyAt === undefined) {
            // (held by the fire: a slot on the plating place, and a plate in it, asked for again; with the owner at the grill, only once his
            // hands are free, and then he takes it there (it flew over by itself, the owner saw: the head chef takes everything off the fire))
            // (with him away from it (washing up by hand, tasting, a drink), it waits by the fire till he's back (item 203: it went over to the
            // plating place by itself, through the air, nobody at the fire))
            const owner = performance.now() - OWNER_GRILL.seenAt < 1000
            if (owner && CHEF_CARRY.key === null && plateReady(p)) {
              const C = CHEF_CARRY
              C.key = p.key; C.kind = 'toPlate'; C.phase = 'reach'; C.t = 0
              C.from.copy(p.node.position); C.fromQ.copy(p.node.quaternion)
              footOf(p, C.foot)
            }
          } else if (!SERVICE.claimed.has(p.key) && PLATING.slots[p.readyAt]?.seat !== p.seat) {
            // (its slot taken up, or freed, without it: it goes to a slot of its own again, from where it is)
            p.readyAt = undefined
            SERVICE.waiting.delete(p.key)
            p.fromP.copy(p.node.position)
            p.fromQ.copy(p.node.quaternion)
            p.flight = 0
            plateReady(p)
          } else if (p.flight >= 1) {
            p.small = true
            // (on the tray by the fire it isn't on its plate yet (item 317): the server claims it once the tongs have put it there)
            if (p.trayAt === undefined && !p.tong && !SERVICE.waiting.has(p.key) && !SERVICE.claimed.has(p.key)) SERVICE.waiting.set(p.key, p.seat)
          }
        }
        const held = p.via === 'plated' && p.readyAt === undefined
        if (!plateless && !held) p.flight = Math.min(1, p.flight + dt / (p.tong ? TONG_LIFT_S : FLIGHT_SECONDS))
        if (!p.body?.live) {
          const e = p.flight < 0.5 ? 2 * p.flight * p.flight : 1 - (-2 * p.flight + 2) ** 2 / 2
          // (its spot follows the plate or dish if that's been dragged somewhere; on the tray, the tray (item 317))
          if (p.trayAt !== undefined) trayFoodAt(p.trayAt, p.toP)
          else if (p.container) p.toP.copy(containerAt(p.container)).add(p.local)
          p.node.position.lerpVectors(p.fromP, p.toP, e)
          // (a little arc through the air; lifted in the tongs, a low one)
          p.node.position.y += Math.sin(p.flight * Math.PI) * (p.tong ? 0.12 : 0.45)
          p.node.quaternion.slerpQuaternions(p.fromQ, p.toQ, e)
          // (landed on a plate (or in a takeaway's box): its own underside put on the plate's face, so a thick fish doesn't sink through it
          // and a thin slice doesn't hover over it (they were all set at one height: the owner saw both). Every frame, from how far its lowest
          // point is under its origin for the way it's turned (measured again only when it's turned or sized otherwise): measured once for
          // where it was and put into its spot, the correction was lost at the plating place, whose spots are given afresh each frame at
          // one height, and it was never measured again there: a thick fish sank into its plate and a slice of fillet hovered over it
          // (item 258, the owner's 「2倍速看，時常有這問題」))
          // (and on the open shop's tray, on its rack (item 317): what waits there for its plate, and what's kept warm on it)
          const onTray = p.trayAt !== undefined || (space === 'open' && !!p.container?.startsWith('bowl'))
          if (p.flight >= 1 && (p.container === 'bar' || p.container === 'takeout' || onTray) && p.node.parent) {
            // (and the face it rests on: the plate's own surface under it (or what it lies on there), found by a ray straight down onto the
            // plates as they're drawn (bar.ts's PLATE_FACES) and the other pieces lying on them, where it is, and again each second (what
            // it lay on eaten from under it); none under it (a takeaway's box, the table's top): from its spot's height as before (item
            // 258: worked out from its spot's height for the plates before item 228's, it rested 3 cm over the new ones' faces)
            const nowMs = performance.now()
            // (and with gravity (item 271, the owner's: 「我覺得你對食物要考究一下，應該會有重力」): what holds it up either side of it, across
            // the plate (the way things lie side by side on it), measured too: one side on the plate and the other on the piece beside it, or
            // against the rim, it rolls over about its length to lie on both, its lower side on what's under it; it hung level over
            // whatever was highest under its middle)
            const across = REST_ACROSS.copy(PLATING_FRAME.across)
            if (p.readyAt === undefined && p.seat !== undefined && p.seat >= 0) across.applyAxisAngle(UP_AXIS, seatTurn(p.seat))
            // (measured again only when what's under it may have changed: where it is, the plates drawn, and each piece lying at the same place at
            // the bar, where it is (to 2 mm), how big and how it's rolled; or after REST_STALE (item 374: three rays every second for every piece
            // on the bar, against every plate and every piece on it, whatever had changed: three's triangle tests the most garbage the shop made,
            // 100 MB the half minute in a rush))
            const carried = SERVICE.carried.has(p.key)
            const rx = carried ? TRAY_SPOT : Math.round(p.local.x * 1000), rz = carried ? TRAY_SPOT : Math.round(p.local.z * 1000)
            let sig = 0
            if (p.container === 'bar' && !onTray) {
              sig = PLATE_FACES.size
              // (only those carried as it is or not: one on a tray rests on nothing on the bar, nor one on the bar on anything on a tray. On a
              // tray only which are on it with it: what's on its plate was laid there before it was picked up and stays so till it's set down,
              // and the pieces on a tray, each a little rolled and turned as the tray turns, measured one another again and again by where
              // they were)
              for (const q of pieces.current) {
                if (q === p || q.container !== p.container || q.seat !== p.seat || (q.flight ?? 0) < 1 || q.eaten || !q.node) continue
                if (SERVICE.carried.has(q.key) !== carried) continue
                const at = q.node.position
                sig = (Math.imul(sig, 31) + (q.hid ??= ++REST_HID)) | 0
                if (carried) continue
                sig = (Math.imul(sig, 31) + Math.round(at.x * 500) * 3 + Math.round(at.y * 500) * 5 + Math.round(at.z * 500) * 7) | 0
                sig = (Math.imul(sig, 31) + Math.round(q.node.scale.x * 200) + Math.round((q.restFace?.roll ?? 0) * 100) * 11) | 0
              }
            }
            const rf = p.restFace
            const anew = !rf || rf.on !== p.container || rf.x !== rx || rf.z !== rz || rf.sig !== sig || nowMs - rf.t > REST_STALE
            if (p.container === 'bar' && !onTray && (anew || (carried && nowMs - rf!.t > TRAY_REST_MS))) {
              const par = p.node.parent
              const under: THREE.Object3D[] = [...PLATE_FACES]
              for (const q of pieces.current) if (q !== p && q.container === p.container && (q.flight ?? 0) >= 1 && !q.eaten && q.node) under.push(q.node)
              const faceAt = (side: number) => {
                // (from over the middle of what's drawn of it, not its origin, which can be at a stick's end: from there the ray found the
                // fish beside it, and it hung over the plate on that)
                REST_RAY.ray.origin.copy(par.localToWorld(LOW_AT.set(p.node.position.x + (p.restDrop?.cx ?? 0), p.node.position.y + 0.25, p.node.position.z + (p.restDrop?.cz ?? 0)).addScaledVector(across, side * REST_SIDE)))
                const hit = REST_RAY.intersectObjects(under, true).find((h) => drawnUp(h.object))
                return hit ? par.worldToLocal(LOW_AT.copy(hit.point)).y : null
              }
              const mid = faceAt(0)
              if (!anew && rf) {
                // (on a tray, a while on: its middle alone, what it rests on moved as much as that did; kept from here as a height over its
                // spot where it is now)
                if (mid !== null && rf.mid !== null && rf.face !== null) rf.face += mid - rf.mid
                if (mid !== null) { rf.mid = mid; rf.base = p.toP.y }
                rf.t = nowMs
              } else {
                const l = faceAt(-1), r = faceAt(1)
                const roll = l !== null && r !== null ? THREE.MathUtils.clamp(Math.atan2(r - l, 2 * REST_SIDE), -0.4, 0.4) : 0
                // (rolled, it lies on its lower side's support: the lower of either side's, or its middle's if a side found nothing)
                const low = Math.min(...[l, r, mid].filter((v): v is number => v !== null))
                p.restFace = { on: p.container, x: rx, z: rz, sig, t: nowMs, face: Number.isFinite(low) ? (roll ? low : mid ?? low) : null, roll, base: p.toP.y, mid }
              }
            }
            const roll = p.container === 'bar' && !onTray ? p.restFace?.roll ?? 0 : 0
            if (roll) p.node.quaternion.premultiply(REST_ROLL.setFromAxisAngle(REST_LONG.crossVectors(across, UP_AXIS).normalize(), roll))
            // (its lowest point for the way it lies now, rolled or not: measured again only when that changes)
            const r = p.restDrop
            if (!r || r.s !== p.node.scale.x || r.q.angleTo(p.node.quaternion) > 1e-3) {
              p.node.updateWorldMatrix(true, true)
              // (only what's drawn of it: the model's own bamboo stick is kept, hidden (the rod drawn is the game's), and a box round all of
              // it put that hidden stick's foot on the plate, the fillet itself 4 cm over it)
              let low = Infinity
              REST_BOX.makeEmpty()
              p.node.traverseVisible((o) => {
                const m = o as THREE.Mesh
                const a = m.isMesh ? (m.geometry?.attributes?.position as THREE.BufferAttribute | undefined) : undefined
                if (!a) return
                for (let i = 0; i < a.count; i++) { LOW_AT.fromBufferAttribute(a, i).applyMatrix4(m.matrixWorld); low = Math.min(low, LOW_AT.y); REST_BOX.expandByPoint(LOW_AT) }
              })
              if (low === Infinity) low = new THREE.Box3().setFromObject(p.node).min.y
              // (and where the middle of what's drawn of it is, from its origin, for the rays above)
              const mid = REST_BOX.isEmpty() ? null : p.node.parent.worldToLocal(REST_BOX.getCenter(LOW_AT))
              const cx = mid ? mid.x - p.node.position.x : 0, cz = mid ? mid.z - p.node.position.z : 0
              low = p.node.parent.worldToLocal(LOW_AT.set(0, low, 0)).y
              p.restDrop = { q: p.node.quaternion.clone(), s: p.node.scale.x, drop: p.node.position.y - low, cx, cz }
            }
            // (on a tray, kept as a height over its spot as the tray moves on)
            const kept = p.container === 'bar' && !onTray ? p.restFace : undefined
            const face = (kept && kept.face !== null ? kept.face + (kept.x === TRAY_SPOT ? p.toP.y - kept.base : 0) : null) ?? p.toP.y - (p.container === 'takeout' ? 0.04 : 0.023)
            p.node.position.y = face + 0.003 + p.restDrop!.drop
          }
          if (p.flight >= 1 && inBasket(p)) {
            // let go above the basket: size the ball from the potato's two shorter axes
            const s = [p.node.scale.x, p.node.scale.y, p.node.scale.z].sort((x, y) => x - y)
            p.body = { v: new THREE.Vector3((Math.random() - 0.5) * 0.3, -0.4, (Math.random() - 0.5) * 0.3),
              r: (s[0] + s[1]) / 2 * 1.05, live: true }
          }
        }
        // (no bar drawn, on a phone: what's served is carried off to the customers, who are on the 2D board; and with
        // the shop shut there's no bar at all, so nothing left served on it hangs in the air where it was)
        if (!bar && p.container === 'bar') p.node.visible = p.flight < 1
        if (space !== 'open' && p.container === 'bar') p.node.visible = false
      }

      // browning, then a slow char: black patches spread across the texture and the whole piece darkens,
      // deepening the longer it's left on
      const r = p.progress / time
      const charred = THREE.MathUtils.smootherstep(r, CHAR_START, CHAR_FULL)
      // (item 473: its two sides' own doneness, the shader browning and charring each by its own; its fat's shine from a third done,
      // going as it dries past done)
      p.looks.uChar.value = 0
      p.looks.uCookA.value = Math.max(0, r + p.lead)
      p.looks.uCookB.value = Math.max(0, r - p.lead)
      p.looks.uOil.value = THREE.MathUtils.smoothstep(r, 0.3, 0.9) * (1 - THREE.MathUtils.smoothstep(r, 1.3, 2.2)) * (FATTY.test(p.id) ? 1 : 0.4)
      // (the grill's marks come on as it browns: none raw, full by the time it's done)
      if (p.looks.uSear) p.looks.uSear.value = THREE.MathUtils.smoothstep(r, 0.25, 0.9)
      // mochi on the net swells up as it toasts, and breathes a little while it's still over the coals
      if (p.puffs.length) {
        const puff = THREE.MathUtils.smoothstep(r, 0.55, 1.15)
        const breathe = p.collected ? 0 : Math.sin(performance.now() / 380 + p.copy) * 0.05 * puff
        for (const m of p.puffs) m.morphTargetInfluences![0] = Math.min(1, puff + breathe)
      }
      // (raw to done its sides' own colour now, the shader's; past done the whole of it darkening as before)
      if (r < 1) tint.copy(DONE_TINT)
      else tint.copy(DONE_TINT).lerp(BURNT_TINT, charred * 0.6)
      const glow = hovered.current === p || (flashUntil.current.get(p.key) ?? 0) > performance.now()
      // potatoes: wrapped and whole in the ash. Picked up, the foil is unwrapped on the way over — the sheet opens
      // out, swells and falls away — and the potato lands in the basket bare, broken open to show the flesh
      // potatoes in the basket keep their foil until clicked; then it opens out, swells and falls away
      if (p.unwrapped) p.unwrapT = Math.min(1, p.unwrapT + dt / 0.7)
      const peel = p.unwrapped ? p.unwrapT : -1
      for (const { mat, mesh, base, emissive, foil, show, eye } of p.mats) {
        // (hide the mesh rather than the material, so its ink outline goes with it)
        if (show === 'closed') mesh.visible = !(p.unwrapped && p.unwrapT > (foil ? 0.05 : 0.35))
        if (show === 'open') {
          mesh.visible = peel > 0 && peel < 1
          if (mesh.visible) {
            if (!mat.transparent) {
              mat.transparent = true
              mat.needsUpdate = true
            }
            mat.opacity = 1 - peel * peel
            mesh.scale.setScalar(1 + peel * 0.9)
            mesh.position.y = -0.4 * peel * peel
          } else {
            mesh.scale.setScalar(1)
            mesh.position.y = 0
          }
        }
        if (!foil && !eye) mat.color.copy(base).multiply(tint)
        mat.emissive.copy(emissive)
        if (glow) mat.emissive.add(HOVER_GLOW)
      }
      // burnt food shrivels a little. Menu items get their scale from Dish's pop-in, which applies this factor;
      // the base fish has no pop-in, so set it directly.
      let shrink = 1 - 0.08 * THREE.MathUtils.smoothstep(r, 1.8, CHAR_FULL)
      // being eaten, a mouthful at a time: on each bite the piece is lifted a little as if picked up, a chunk with
      // tooth-marked edges disappears from the end, and it settles back while it's chewed (阿姆阿姆). On a skewer
      // only the food goes and the bare stick is left lying on the plate
      // (the boss come over to taste it: the bites begin; if he can't get there, it's eaten anyway after a while)
      if (p.awaitBoss && (BOSS_TASTE.arrived || performance.now() - p.awaitBoss > 6000)) {
        p.byBoss = BOSS_TASTE.arrived
        p.awaitBoss = 0
        p.eat = 0.0001
      }
      if (p.eat > 0 && !p.eaten && !p.stickOnly) {
        p.eat = Math.min(1, p.eat + dt / (p.container === 'bar' && !p.byBoss ? GUEST_EAT_SECONDS / (SHOP.hurry ? 4 : 1) : EAT_SECONDS))
        const phase = p.eat * BITES_PER_PIECE
        if (p.container === 'bar' && p.guest >= 0 && !p.byBoss) EAT_PHASE.set(p.guest, Math.max(EAT_PHASE.get(p.guest) ?? 0, phase))
        const wanted = Math.min(BITES_PER_PIECE, Math.floor(phase + 0.35))
        while (p.bites.uBiteCount.value < wanted) {
          takeBite(p)
          // (the owner's own taste: each bite crunches, and he's chewing)
          if (p.byBoss) { biteSound(); BOSS_TASTE.chewing = true }
        }
        // (and between bites the soft munching)
        if (p.byBoss) {
          p.chewAt = (p.chewAt ?? 0) + dt
          if (p.chewAt > 0.24 + Math.random() * 0.08) { p.chewAt = 0; chewSound() }
        }
        // (only what's eaten off your own plate hops up to be bitten: at the bar it's the customer you see eating, so
        // the piece just lies there getting smaller)
        if (!p.body?.live && p.container !== 'bar') {
          const lift = Math.max(0, Math.sin(Math.min(1, (phase % 1) * 1.6) * Math.PI))
          p.node.position.y += 0.06 * lift
          p.node.rotateOnWorldAxis(STACK_DIR, -0.12 * lift)
        }
        // (the boss's: up out of the bowl to his chopsticks' tips, held there as he eats it (item 112: he tastes with a bowl and chopsticks);
        // his hand till he's got them out)
        const hand = p.byBoss && !BOSS_TASTE.tipOn ? room.getObjectByName('BossHandR') : null
        if (p.byBoss && p.node.parent && (BOSS_TASTE.tipOn || hand)) {
          const to = p.node.parent.worldToLocal(BOSS_TASTE.tipOn ? BOSS_TASTE.tip.clone() : hand!.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.08, 0)))
          p.node.position.lerp(to, THREE.MathUtils.smoothstep(p.eat, 0, 0.15))
        }
        if (p.eat >= 1) {
          // (he's had it: what he thinks of it, then off back to his round)
          if (p.byBoss) { BOSS_TASTE.verdict = tasteOf(p); BOSS_TASTE.chewing = false }
          // (a whole fish eaten off its bones: they're left in the bowl, a few lying about it one over another)
          if (p.byBoss && WHOLE_FISH.has(p.id)) {
            const k = ++bonesSeq.current
            const at = bowlAt().add(new THREE.Vector3(Math.cos(k * 2.4) * 0.035, 0.055 + ((k - 1) % 3) * 0.012, Math.sin(k * 2.4) * 0.035))
            setBones((all) => [...all.slice(-2), { key: k, at: at.toArray() as [number, number, number], yaw: k * 1.9 }])
          }
          if (!p.node.userData.byGuest) BOSS_TASTE.at = null
          p.byBoss = false
          // (what an AI customer eats fills their stomach, not yours)
          if (!p.node.userData.byGuest) onEat?.(p.id, tasteOf(p), { doneness: p.progress / roast.times[p.id], dabs: { ...p.dabs }, steps: [...p.steps] })
          if (p.sticks.length && p.pullAt === undefined) {
            p.stickOnly = true
            for (const m of p.food) m.visible = false
          } else {
            p.eaten = true
            p.slot = null
          }
        }
      }
      // served at the bar it comes down to the size of the customers and their plates (the fire is drawn big, to
      // cook on; the bar is in the people's own scale), shrinking as it's carried over
      // (in a takeaway's box a little under a plate's size: a whole saury lies in its main cell's length (item 331))
      // (and on the open shop's tray, kept warm there (item 317), as what waits there for its plate)
      if ((p.container === 'bar' || p.container === 'takeout' || (space === 'open' && p.container?.startsWith('bowl'))) && p.collected) shrink *= (p.small ? BAR_FOOD_SCALE : THREE.MathUtils.lerp(1, BAR_FOOD_SCALE, THREE.MathUtils.smoothstep(p.flight, 0, 1)))
        * (p.container === 'takeout' ? TAKEOUT_FOOD : 1)
      if (p.eaten || waiting(p) || inFridge.has(p)) shrink = 0.0001
      const bounce = bounces.current.get(p)
      if (bounce !== undefined) shrink *= 1 + BOUNCE * Math.sin(Math.PI * bounce)
      if (menuIds.has(p.id)) p.node.userData.shrink = shrink
      else p.node.scale.setScalar(shrink)

      // tags sit above the food, staggered over three heights so neighbouring tags don't overlap
      const a = anchors.current[p.key]
      if (a) {
        a.position.copy(p.node.position)
        a.position.y += (p.loose ? 0.2 : 0.32) + (n % 3) * 0.15
      }
    })

    if (roast.basket) settleBasket(dt)

    // AI simulation: the chef works the grill, customers order and eat
    // the plating place's slots: how many of each one's pieces are flying to it and are down on it (GuestBar3D sends a server once it's all there); one
    // left with nothing (its customer gone, what was on it binned) freed, its plate back on the stack
    if (space === 'open') for (let k = 0; k < READY_SLOTS; k++) {
      const sl = PLATING.slots[k]
      if (!sl) continue
      let flying = 0, landed = 0, onTray = 0
      for (const q of pieces.current) {
        if (q.via !== 'plated' || q.readyAt !== k || q.eaten || q.trash >= 0 || SERVICE.claimed.has(q.key) || SERVICE.carried.has(q.key)) continue
        // (one just set down by the tongs is still theirs this frame (item 317): it's waiting for its server from the next, and the plate
        // taken up in between went without it)
        if (q.flight >= 1 && !q.tong) landed++
        else flying++
        if (q.trayAt !== undefined) onTray++
      }
      sl.flying = flying
      sl.landed = landed
      sl.onTray = onTray
      if (!flying && !landed) {
        if (sl.plate) PLATING.stock += 1
        PLATING.slots[k] = null
      }
    }

    // (the server's tongs by the tray, lifting what's on it onto its plate (item 317)); and how much is on it, for the stock's tableware tab
    tongStep(dt)
    KAKUBAT.out = space === 'open'
    {
      let n = 0
      if (space === 'open') for (const q of pieces.current) if (!q.eaten && q.trash < 0 && (q.trayAt !== undefined || (q.keepWarm && q.collected && q.container?.startsWith('bowl')))) n++
      KAKUBAT.n = n
    }

    // (what the chef's carrying: where it is through each step, and where he stands; it holds still in its own flight meanwhile)
    {
      const C = CHEF_CARRY
      if (tongs.current) tongs.current.visible = false
      const p = C.key ? pieces.current.find((q) => q.key === C.key) : undefined
      if (C.key && (!p || !present(p) || p.eaten || p.trash >= 0 || performance.now() - OWNER_GRILL.seenAt > 1000)) {
        // (gone meanwhile, or nobody to carry it: let go, it goes on by itself)
        C.key = null; C.phase = 'idle'; C.lean = 0; C.hold = false
      } else if (p && C.phase !== 'idle') {
        C.t += dt
        // (where it's going: its place in the fire (on the net, if it's one for the net), or where it lands at the plating place)
        const dest = C.kind === 'toFire'
          ? new THREE.Vector3(p.netSpot !== null ? spots[p.netSpot][0] : p.homeP.x, p.homeP.y, p.netSpot !== null ? spots[p.netSpot][1] : p.homeP.z)
          : (p.container ? containerAt(p.container).add(p.local) : p.toP.clone())
        const destQ = C.kind === 'toFire' ? p.homeQ : p.toQ
        if (C.kind === 'toFire') { p.homeFlight = 0; p.node.userData.onPlate = true } else p.flight = 0
        const home = CHEF_AT.clone().setY(CHEF_AT.y + NOTCH_STEP.h)
        // (to the nearest he can stand to it in the notch: along it either way as far as it's wide, and hardly forward (the seasoning ledge
        // hangs before him there))
        const toward = (v: THREE.Vector3) => {
          const fs = FIRE_SHIFT.dot(ALONG)
          const a = THREE.MathUtils.clamp(v.dot(ALONG), COOK_NOTCH.along[0] + 0.32 - fs, COOK_NOTCH.along[1] - 0.32 - fs)
          const l = THREE.MathUtils.clamp(v.dot(LAY), home.dot(LAY) - CARRY_STEP, home.dot(LAY))
          return new THREE.Vector3().addScaledVector(ALONG, a).addScaledVector(LAY, l).setY(home.y)
        }
        const hand = p.node.parent ? p.node.parent.worldToLocal(OWNER_GRILL.hand.clone()) : OWNER_GRILL.hand.clone()
        const k = Math.min(1, C.t / CARRY_S[C.phase]), e = k * k * (3 - 2 * k)
        // (held by its foot (C.foot): from its origin to its foot, turned as it's turned, in its parent's frame)
        const grip = (q: THREE.Quaternion) => GRIP.copy(C.foot).multiply(p.node.scale).applyQuaternion(q)
        // (his hands' height, in the world: down to its foot where it is, up over the table's top as it's carried, down with it to where its
        // foot goes; never under the table's top, nor over his chin)
        const up = (v: THREE.Vector3) => (p.node.parent ? p.node.parent.localToWorld(v.clone()) : v.clone()).y
        // (his palms' middle: a mitten's half its height, 0.1, over the top at the least, or it went into it reaching to the board)
        const reachY = (v: THREE.Vector3) => THREE.MathUtils.clamp(up(v) + 0.04, OWNER_GRILL.top + 0.1, OWNER_GRILL.top + 0.4)
        const lifted = OWNER_GRILL.top + CARRY_LIFT
        if (C.phase === 'reach') OWNER_GRILL.handY = reachY(C.from.clone().add(grip(C.fromQ)))
        else if (C.phase === 'carry') OWNER_GRILL.handY = lifted
        else if (C.phase === 'place') OWNER_GRILL.handY = THREE.MathUtils.lerp(lifted, reachY(dest.clone().add(grip(destQ))), e)
        else OWNER_GRILL.handY = NaN
        if (C.phase === 'reach') {
          // (his hands to it where it is: on the board, or standing in the fire)
          p.node.position.copy(C.from); p.node.quaternion.copy(C.fromQ)
          // (leaning in further the further it is from him)
          const far = Math.min(1, C.from.clone().sub(home).setY(0).length() / 1.2)
          C.stand.copy(toward(C.from)); C.face.copy(C.from); C.lean = CARRY_LEAN * (0.6 + 0.8 * far) * Math.sin(Math.PI * k); C.hold = false
          C.heldQ.copy(p.homeQ)
        } else if (C.phase === 'carry') {
          // (in his hands by its foot, standing up on its stick over them, as he turns and steps to where it's going)
          p.node.quaternion.slerpQuaternions(C.fromQ, C.heldQ, e)
          p.node.position.lerpVectors(C.from, hand.clone().sub(grip(p.node.quaternion)), Math.min(1, e * 2.2))
          C.stand.copy(toward(dest)); C.face.copy(dest); C.lean = 0; C.hold = true
        } else if (C.phase === 'place') {
          // (leaning in, the skewer pushed into the ash at its place, or the fish laid on the plate)
          p.node.position.lerpVectors(hand.clone().sub(grip(C.heldQ)), dest, e)
          p.node.quaternion.slerpQuaternions(C.heldQ, destQ, e)
          C.lean = CARRY_LEAN * Math.sin(Math.PI * Math.min(1, k * 1.2)); C.hold = true
        } else {
          // (set: it's in its place; he straightens and steps back)
          p.node.position.copy(dest); p.node.quaternion.copy(destQ)
          C.stand.copy(home); C.lean = 0; C.hold = false
        }
        if (k >= 1) {
          C.t = 0
          if (C.phase === 'reach') C.phase = 'carry'
          else if (C.phase === 'carry') C.phase = 'place'
          else if (C.phase === 'place') {
            C.phase = 'back'
            // (it's where it goes now: on the fire it begins to cook; on the plating place it lands (the steam, the plate's count))
            if (C.kind === 'toFire') { p.homeFlight = 1; p.node.userData.onPlate = false } else p.flight = 0.999
            // (a puff of ash and sparks where the skewer goes in)
            if (C.kind === 'toFire') emit('salt', dest.clone().add(new THREE.Vector3(0, 0.05, 0)), 8)
          } else { C.phase = 'idle'; C.key = null; C.lean = 0; C.hold = false }
        }
        if (C.phase === 'back' || C.phase === 'idle') { if (C.kind === 'toFire') p.homeFlight = 1 }
        // (the long chopsticks from his hand to it, while it's further than his arm reaches: out to it as he reaches, holding it as it comes in)
        const tg = tongs.current
        if (tg?.parent) {
          // (to what he holds it by)
          const tip = p.node.localToWorld(C.foot.clone())
          const from = OWNER_GRILL.hand.clone()
          const far = tip.distanceTo(from)
          const on = (C.phase === 'reach' || C.phase === 'carry' || C.phase === 'place') && far > ARM_REACH
          tg.visible = on
          if (on) {
            if (C.phase === 'reach') tip.lerpVectors(from, tip, e)
            const a = tg.parent.worldToLocal(from.clone()), b = tg.parent.worldToLocal(tip)
            tg.position.copy(a)
            tg.quaternion.setFromUnitVectors(TONGS_Z, b.clone().sub(a).normalize())
            tg.scale.set(1, 1, a.distanceTo(b))
          }
        }
      }
      // (the owner stands to it at the fire: where, in the world, and how, for Boss.tsx)
      const fr = tongs.current?.parent
      OWNER_GRILL.on = C.phase !== 'idle' && !!fr
      if (fr) { fr.localToWorld(OWNER_GRILL.stand.copy(C.stand)); fr.localToWorld(OWNER_GRILL.face.copy(C.face)); OWNER_GRILL.top = fr.localToWorld(TOP_AT.set(0, 0, 0)).y }
      if (C.phase === 'idle') OWNER_GRILL.handY = NaN
      OWNER_GRILL.lean = C.lean
      OWNER_GRILL.hold = C.hold
    }
    if (ai && active) {
      aiClock.current += dt
      chefClock.current += dt
      if (chefClock.current > chef.pace) {
        chefClock.current = 0
        runChef()
      }
      if (aiClock.current > 0.8) {
        aiClock.current = 0
        runGuests()
      }
    }

    // smoke rises once food over the coals starts to cook through (fat and juices dripping onto the charcoal):
    // none from a bare fire, more with every done piece, most when it's charring
    // (from four tenths cooked, as the fat begins to run (item 242: from seven, the fire stood smokeless half the evening, fish on it))
    if (smoke) {
      let s = 0
      let b = 0
      for (const p of pieces.current) {
        if (!present(p) || p.collected || waiting(p)) continue
        const r = p.progress / roast.times[p.id]
        // (pale smoke while it cooks; once it's burning there's only the black)
        s += THREE.MathUtils.smoothstep(r, 0.4, 1.05) * 0.32 * (1 - THREE.MathUtils.smoothstep(r, 1.8, 2.2))
        // food left to burn sends up thick black smoke
        b += THREE.MathUtils.smoothstep(r, 2.0, 2.8) * 0.45
      }
      const glow = Math.min(1, heatOf() * 1.5)
      smoke.current += (Math.min(1, s) * glow - smoke.current) * Math.min(1, dt * 0.8)
      if (blackSmoke) blackSmoke.current += (Math.min(1, b) * glow - blackSmoke.current) * Math.min(1, dt * 0.6)
    }

    since.current += delta
    if (since.current < 0.25) return
    since.current = 0
    // keep as many plates out as the food on them needs (always at least one)
    let need = 1
    let needBaskets = 1
    let needDishes = 1
    const cap = basketHolds()
    for (const p of pieces.current) {
      // (what's served at the bar has a slot too, but it's the customers' and needs no plate out by the fire)
      if (p.slot === null || p.eaten || !present(p) || p.container === 'bar' || p.container?.startsWith('bowl')) continue
      if (inBasket(p)) needBaskets = Math.max(needBaskets, Math.floor(p.slot / cap) + 1)
      else if (onDish(p)) needDishes = Math.max(needDishes, Math.floor(p.slot / roast.dish!.capacity) + 1)
      else need = Math.max(need, Math.floor(p.slot / PER_PLATE) + 1)
    }
    if (need !== plateCount) setPlateCount(need)
    if (needBaskets !== basketCount) setBasketCount(needBaskets)
    if (needDishes !== dishCount) setDishCount(needDishes)
    // skewers off the fire (for the fire's limit), and potatoes still around (for the basket's)
    const off = pieces.current.filter((p) => (p.collected || p.staged) && present(p) && !p.loose).length
    const loose = pieces.current.filter((p) => inBasket(p) && present(p) && !p.eaten).length
    if (off * 1000 + loose !== lastOff.current) {
      lastOff.current = off * 1000 + loose
      onOffFire?.(off, loose)
    }
    // (the progress tags worked out only while they're shown (by hand at the fire): with the shop open they aren't, and each piece passing a
    // step redrew the whole kitchen, several times a second, for tags nobody saw)
    if (!active || !showsProgress(modeOf(ai, research))) {
      if (lastTags.current !== '[]') {
        lastTags.current = '[]'
        setTags([])
      }
      return
    }
    const next: { key: string; id: string; name?: string; state: TagState }[] = []
    for (const p of pieces.current) {
      if (!present(p) || p.collected || p.staged || (roast.net?.includes(p.id) && p.netSpot === null)) continue
      const r = p.progress / roast.times[p.id]
      const s = stageOf(r)
      next.push({ key: p.key, id: p.id, name: p.want?.name, state: { stage: s.key, label: s.label, pct: Math.round(Math.min(1, r) * 20) / 20 } })
    }
    const k = JSON.stringify(next)
    if (k !== lastTags.current) {
      lastTags.current = k
      setTags(next)
    }
  })

  const byKey = (key: string) => pieces.current.find((p) => p.key === key)
  if (import.meta.env?.DEV && typeof window !== 'undefined') Object.assign(window, { __pieces: pieces, __collect: collect, __moved: moved,
    __table: () => containerKeys().map((k) => ({ k, at: containerAt(k).toArray().map((v) => +v.toFixed(3)), r: footprint(k) })) })

  // (the crew at their places, and their figures: made once for the crew there is (item 374: made in the drawing, their places' ways new
  // arrays each time, every one of them and all they hold were drawn again with every redraw of the fire, 7 times a second))
  const crewWalks = useMemo(() => crewPlaces(crew.some((m) => m.role === 'chef') ? crew : [HOUSE_CHEF, ...crew]).map(({ m, at, yaw, way, seat }, i, all) => (
    <CrewWalk key={m.id} id={m.id} role={m.role} at={at} yaw={yaw} way={way} seat={seat} round={m.role === 'chef' || m.role === 'sous'}
      fetcher={m.role === 'chef' && all.findIndex((x) => x.m.role === 'chef') === i}>
      {!seat && <BlobShadow r={0.17} />}<StaffFigure id={m.id} role={m.role} look={m.look} seated={!!seat} />
    </CrewWalk>
  )), [crew])
  return (
    <>
      {Array.from({ length: plateCount }, (_, n) => (
        <WhenHeld key={n} holds={() => holds(`plate-${n}`)}><Plate container={`plate-${n}`} position={plateAt(n).toArray() as [number, number, number]} /></WhenHeld>
      ))}
      {roast.basket && Array.from({ length: basketCount }, (_, n) => (
        <Basket key={n} container={`basket-${n}`} position={basketAt(n).toArray() as [number, number, number]} />
      ))}
      {roast.dish && Array.from({ length: dishCount }, (_, n) => (
        <WhenHeld key={n} holds={() => holds(`dish-${n}`)}><SideDish container={`dish-${n}`} position={dishAt(n).toArray() as [number, number, number]} /></WhenHeld>
      ))}
      <TasteBowl container="bowl-0" position={bowlAt().toArray() as [number, number, number]} open={space === 'open'} />
      <ServeTongs />
      {/* (a whole fish's bones in the bowl, once eaten: clicked, into the bin with the rest) */}
      {bones.map((b) => (
        <group key={b.key} position={b.at} rotation-y={b.yaw} scale={BONE_SCALE} {...BONES_TIP}
          onClick={(e) => { e.stopPropagation(); if (locked) return; setBones((all) => all.filter((x) => x.key !== b.key)); trashedRef.current += 1; setTrashed(trashedRef.current); clinkSound() }}>
          <mesh geometry={BONES_GEO} material={BONE_MAT} />
          <mesh geometry={HEAD_GEO} material={BONE_HEAD_MAT} />
        </group>
      ))}
      {/* the takeaway box, while one's being packed (game/takeout) */}
      {space === 'open' && <TakeoutBox at={() => containerAt('takeout')} />}
      <EmberBed fuel={fuel} />
      {/* (the sticks on the fire, their ink, and the crumbs they break into: a few instanced meshes, written each frame) */}
      <primitive object={coalDraw.group} />
      {/* (round, both (item 242: squares they were, the ash 5 cm grey tiles): the sparks hot dots, the ash small soft flakes) */}
      <points geometry={sparkGeo} frustumCulled={false}><pointsMaterial map={SOFT_DOT} size={0.02} vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></points>
      <points geometry={ashGeo} frustumCulled={false}><pointsMaterial map={SOFT_DOT} size={0.022} vertexColors transparent depthWrite={false} toneMapped={false} /></points>
      {shards.map((sh) => (
        <mesh key={sh.id} position={[sh.x, sh.y, sh.z]} rotation={[-Math.PI / 2, 0, sh.r]}>
          <circleGeometry args={[sh.s, 3]} /><meshToonMaterial color="#efece4" side={THREE.DoubleSide} />
        </mesh>
      ))}
      <Decor held={held} lanternAt={containerAt('lantern').toArray() as [number, number, number]} fanAt={fanAt().toArray() as [number, number, number]} />
      {active && decorTip && (
        <Html position={decorTip === 'fan' ? (fanAt().add(new THREE.Vector3(0, 0.3, 0)).toArray() as [number, number, number]) : [DECOR.crate.at[0], 0.5, DECOR.crate.at[1]]}
          center zIndexRange={zr(30, 10)} style={NO_POINTER}>
          <span className="tool-tag">{decorTip === 'fan' ? '團扇' : '備長炭'}<small>{decorTip === 'fan' ? '拿到火上來回搧' : '拖到火上添炭'}</small></span>
        </Html>
      )}
      {roast.tray && <Tray container="tray" position={trayAt().toArray() as [number, number, number]} />}
      {/* (the iron skewers' holder by the board and their used tray by the plating place) */}
      {roast.tray && bar && <group scale={SKEWER_SCALE}><SkewerStore lang={lang} byHand={space !== 'open'} yaw={Math.atan2(LAY.x, LAY.z)}
        holderAt={skewerHolderAt().divideScalar(SKEWER_SCALE).toArray() as [number, number, number]}
        usedAt={skewerUsedAt().divideScalar(SKEWER_SCALE).toArray() as [number, number, number]} /></group>}
      {/* (edit mode's boxes for what the nudge moves: an unseen block the size of each, in a group the edit moves; the pieces themselves follow by the nudge) */}
      {roast.tray && <EditProxy id="cutboard" label="大砧板" at={containerAt('tray')} size={[TRAY_W, 0.12, TRAY_D]} yaw={-Math.atan2(STACK_DIR.z, STACK_DIR.x)} />}
      {carriers.box && <EditProxy id="seasoning" label="調味架" at={containerAt('box').add(new THREE.Vector3(0, -0.12, 0))} size={[LEDGE_L, 0.42, 0.22]} yaw={-Math.atan2(STACK_DIR.z, STACK_DIR.x)} />}
      {carriers.bin && <EditProxy id="bucket" label="水桶" at={containerAt('bin')} size={[BIN_R * 2, 0.45, BIN_R * 2]} yaw={0} />}
      {roast.basket && <EditProxy id="basket" label="竹簍" at={containerAt('basket-0')} size={[BASKET_R * 2 * BASKET_SIZE, 0.14 * BASKET_SIZE, BASKET_R * 2 * BASKET_SIZE]} yaw={0} />}
      <EditProxy id="tastebowl" label="試吃碗" at={containerAt('bowl-0')} size={[BOWL_R * 2, BOWL_RIM, BOWL_R * 2]} yaw={0} />
      {roast.trash && <EditProxy id="trash" label="廚餘桶" at={containerAt('trash')} size={[TRASH_R * 2, 0.4, TRASH_R * 2]} yaw={0} />}
      {roast.rawDish && <EditProxy id="ricedish" label="飯糰小碟" at={containerAt('rawdish')} size={[DISH_R * 2, 0.06, DISH_R * 2]} yaw={0} />}
      {/* (the table, the crew and the bar stay where they were drawn: the fire and all round it stand FIRE_SHIFT along from them, to the table's middle) */}
      <group position={[-FIRE_SHIFT.x, 0, -FIRE_SHIFT.z]}>
      {/* (the table stands in edit mode's way: the pieces behind it and under it aren't chosen or lit through it (item 162)) */}
      <EditBlock><CookTable floor={!bar} /></EditBlock>
      {/* (the crew keep their own places on the kitchen floor: carried back by the shift) */}
      <group position={[FIRE_SHIFT.x, 0, FIRE_SHIFT.z]}>
      {/* the owner: at his grill while the shop's shut; open, his chef has the grill and he stands along the aisle from it, keeping an eye  (he fades himself out of the way when he stands between the camera and what it looks at: Boss.tsx) */}
      {bar && (<>
        <BossSpot open={space === 'open'} lang={lang} />
        {/* (his futon, the nights he's too tired for the stair, and his way to it (item 444)) */}
        <BossBedWays open={space === 'open'} research={research} />
        <Suspense fallback={null}><BossFuton /></Suspense>
        {/* (and the notch's wooden step he and his cook stand on) */}
        <NotchStep />
        <NotchStep id="soustep" label="三廚木台階" node="SousStep" at={SOUS_STEP_AT} yaw={SOUS_STEP_YAW} />
        {/* (the chef's long chopsticks, out while he reaches across the hearth) */}
        <mesh ref={tongs} name="chef-tongs" geometry={TONGS_GEO} material={TONGS_MAT} visible={false} raycast={() => {}} />
        {/* (the staff's outfits drawn a moment under the notch's floor as the shop loads: their programs made then, not as they first walk in) */}
        <Suspense fallback={null}><group position={CHEF_AT}><StaffWarm /></group></Suspense>
      </>)}
      {space === 'open' && bar && crewWalks}
      </group>
      {bar && <Bar />}
      </group>
      {/* (the rice balls' own little dish, set out while some wait raw on it) */}
      {roast.rawDish && (
        <WhenHeld holds={() => holds('rawdish') || pieces.current.some((q) => q.staged && !!roast.rawDish?.items.includes(q.id) && present(q))}>
          <SideDish container="rawdish" position={containerAt('rawdish').toArray() as [number, number, number]} />
        </WhenHeld>
      )}
      {/* (the floor's bin by the cook a food-waste bin now (the owner's, 2026-11-10): the woven basket's on the bar for the customers) */}
      {roast.trash && <FoodWasteBin container="trash" position={containerAt('trash').toArray() as [number, number, number]} />}
      {fireHint > 0 && (
        // where carried food can be set down: the fire bed glows
        <mesh rotation-x={-Math.PI / 2} position-y={0.07}>
          <ringGeometry args={[0.18, RING_CLEAR - 0.18, 64]} />
          <meshBasicMaterial color="#ff8a1e" transparent opacity={fireHint === 2 ? 0.5 : 0.22} depthWrite={false} />
        </mesh>
      )}
      {/* salt is taken with the fingers: a pinching hand follows the pinch while it's carried */}
      {saltInHand && (
        <group ref={hand}>
          <Html center zIndexRange={zr(40, 30)} style={NO_POINTER}><PinchHand /></Html>
        </group>
      )}
      <points geometry={grains.geometry} material={grainMaterial} frustumCulled={false} renderOrder={3} />
      {Array.from({ length: RINGS }, (_, k) => (
        <mesh key={`ring${k}`} ref={(m) => { ringObjs.current[k] = m }} visible={false} rotation-x={-Math.PI / 2} renderOrder={4}>
          <ringGeometry args={[0.07, 0.085, 32]} />
          <meshBasicMaterial transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {active && tasteTip && (
        <Html position={tasteTip.at} center zIndexRange={zr(35, 25)} style={NO_POINTER}>
          <span className="taste-tip">美味 <b>{tasteTip.taste}</b></span>
        </Html>
      )}
      <PopWords />
      {active && toolLabel && (
        <Html position={toolLabel.at} center zIndexRange={zr(30, 10)} style={NO_POINTER}>
          <span className="tool-tag">{tipIn(toolLabel.kind === 'water' ? '水（退火用）' : TOOL_NAMES[toolLabel.kind], lang)}<small>{tipIn(toolLabel.kind === 'water' ? '拖至炭火／爐心' : '拖到食物上', lang)}</small></span>
        </Html>
      )}
      <Wisps />
      {active && showsProgress(modeOf(ai, research)) && tags.map(({ key, id, name, state }) => (
        <group key={key} ref={(g) => { anchors.current[key] = g }}>
          <Html center zIndexRange={zr(30, 10)}>
            <button type="button"
              className={`roast-tag roast-${state.stage}${hoveredKey === key ? ' roast-tag-lit' : ''}`}
              aria-label={`${roast.names[id]}，${state.label}，點一下放到盤子上`}
              onClick={() => { const p = byKey(key); if (p) collect(p) }}>
              <svg className="roast-ring" viewBox="0 0 20 20" aria-hidden="true">
                <circle cx="10" cy="10" r="8" className="roast-ring-track" />
                <circle cx="10" cy="10" r="8" className="roast-ring-fill" pathLength={100}
                  strokeDasharray={`${state.pct * 100} 100`} />
              </svg>
              <span className="roast-name">{name ?? roast.names[id]}</span>
              <span className="roast-state">{state.label}</span>
            </button>
          </Html>
        </group>
      ))}
    </>
  )
}
