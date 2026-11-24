import { useEffect, useMemo, useRef } from 'react'
import { DORM_LIFE } from '@/shops/grill/bar'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { tick } from '@/scene/kit/speed'
import { TRAY_AT } from '@/scene/people/StaffFigure'
import { commuteOf, delayOf, paceOf } from '@/game/staff/commute'
import { COMMUTERS, makeTrip, tripStep, turnToward, type Trip } from '@/shops/grill/commuteWalk'
import { afterPhase, CHEF_PACE, TAKE_S } from '@/game/kitchen/chefFlow'
import { minutesNow } from '@/ui/kit/clockStore'
import { fromTray, takeRice } from '@/game/kitchen/rice'
import type { Role } from '@/data/staff'
import { FRIDGE_KICK } from '@/shops/grill/Decor'
import { TAKEOUT_STAND } from '@/shops/grill/bar'
import { SHOP, clockIn, idleTick, paceOfStaff } from '@/game/world/shopState'
import { aisleCornerOf, aisleOf, FIGURES, STAFF_DOOR_HOLD, CUBBY_KICK, KITCHEN_ROUTE, PLATER_OUT, FETCHER, RICE, genkanY, ONIGIRI_TRAY, staffWayOut, doorOutOf, alongPath, pathLength, KITCHEN_FOLK, BAR_GATES, gateOf, GRILL_COUNTERS, GRILL_SCALE } from '@/shops/grill/bar'
import { CHEF_SCALE, fromBar, toBar, floorAt } from './kitchen'
import { CHEF_TRIP, prepOf, takeOf, storeSpot, SACK_MOUTH, SACK_ACROSS, SACK_HAND_GAP, SACK_LEAN, SACK_HANDS, SACK_LIFT_AT, SACK_CLEAR_WALK, ARRIVE_TURN, sackLift, chefWay, SIT_S, SIT_HOP } from './crew'

export function CrewWalk({ id, role, at, yaw, way, seat, round, fetcher, children }: { id: string; role: Role; at: THREE.Vector3; yaw: number; way: THREE.Vector3[]; seat?: string; round?: boolean
  fetcher?: boolean; children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null)
  const trip = useRef<{ way: THREE.Vector3[]; len: number; gone: number } | null>(null)
  /** (one who sits (the cashier): how far they're sat down on their seat from their place on the floor beside it, 0 stood there .. 1 sat; and
   * the seat's place and turn in their frame, where it was last measured) */
  const sat = useRef(0)
  const seatAt = useRef<{ p: THREE.Vector3; yaw: number } | null>(null)
  /** where they stand: their place (the third cook's is his own bay in the cook table now (SOUS_AT): it was out on the kitchen's floor and
   * moved off anything stood there each day (KITCHEN_ROUTE.clear: the warming counter was put where he stood); that moved him out of
   * his bay, it being the table's) */
  const placeOf = () => at
  /** where they are `k` of the way from their place (stood, facing their work) onto their seat (sat, facing as it does): eased, a little up
   * over the step onto it */
  const sitBetween = (o: THREE.Group, k: number) => {
    const s = seatAt.current
    if (!s) return
    const e = k * k * (3 - 2 * k)
    o.position.lerpVectors(placeOf(), s.p, e)
    o.position.y += Math.sin(e * Math.PI) * SIT_HOP
    const d = Math.atan2(Math.sin(s.yaw - yaw), Math.cos(s.yaw - yaw))
    o.rotation.y = yaw + d * e
  }
  /** the second cook's round (fetcher): walking to a store or back, taking it out there, preparing and skewering it at the board, his
   * place; whether he's away (what's on the fire, and off it, is the owner's: Boss.tsx) */
  const walkTrip = (o: THREE.Group, dt: number) => {
    const T = CHEF_TRIP
    T.seenAt = performance.now()
    FETCHER.id = id
    FETCHER.busy = T.phase !== 'idle'
    // (at the board with nothing to fetch or prepare, and not out plating either: for how he tires (data/staff's activityOf))
    idleTick(id, T.phase === 'idle' && PLATER_OUT.id !== id && !SHOP.leaving, dt)
    o.userData.fetcher = true
    o.userData.lean = 0
    o.userData.handsAt = undefined
    o.userData.carry = T.phase === 'toBoard' || (T.phase === 'taking' && T.t > TAKE_S * 0.5)
    // (and shaping the rice balls at the counter as he takes the rice)
    // (at the board only once he's turned round to it (item 516): home from a store he turned on the spot with his hands out over the board,
    // and they swept through the onions' sack and the vegetables' basket behind him; turning, they're at his sides)
    const toWork = Math.abs(Math.atan2(Math.sin(yaw - o.rotation.y), Math.cos(yaw - o.rotation.y))) < 0.35
    o.userData.prep = (T.phase === 'prepping' && toWork) || (T.phase === 'taking' && T.store === 'ricetub' && T.shape > 0 && T.t > TAKE_S)
    const pierced = performance.now() - T.pierceAt
    o.userData.pierce = T.phase === 'prepping' && pierced < 600 ? pierced / 600 : undefined
    o.userData.fanNow = false
    // (what he carries where his hands hold it: before him as carried, or, lifting it out of a sack, between his hands (sackLift))
    const hand = () => {
      o.updateMatrixWorld()
      if (o.userData.handsAt === SACK_HANDS) T.hand.copy(SACK_HANDS.left).add(SACK_HANDS.right).multiplyScalar(0.5)
      else T.hand.set(...TRAY_AT).applyMatrix4(o.matrixWorld)
    }
    if (T.phase === 'toStore' || T.phase === 'toBoard') {
      if (!trip.current) {
        let w: THREE.Vector3[]
        if (T.phase === 'toStore') {
          const s = o.parent ? storeSpot(T.store, scene, o.parent, at) : null
          // (nowhere to be found: he brings it from where it was, at once)
          if (!s) { T.phase = 'prepping'; T.t = 0; return false }
          T.spot.copy(s.spot); T.face.copy(s.face)
          w = chefWay(at, T.spot)
        } else w = chefWay(at, T.spot).reverse()
        trip.current = { way: w, len: pathLength(w), gone: 0 }
      }
      const w = trip.current
      // (worn out, at half pace (the owner's): walking, reaching in, preparing)
      w.gone = Math.min(w.len, w.gone + dt * CHEF_PACE * paceOfStaff(id))
      const { p, dir } = alongPath(w.way, w.gone)
      o.position.copy(p)
      // (the last of the way turned already to what's next (item 516): to the board coming home, to the store going out to it; walking
      // straight in, he came home from the freezer headed at the sacks beside his place, what he carried out before him in the onions' sack,
      // and turned round on the spot)
      const want = w.len - w.gone < ARRIVE_TURN ? (T.phase === 'toBoard' ? yaw : Math.atan2(T.face.x - T.spot.x, T.face.z - T.spot.z))
        : dir.x || dir.z ? Math.atan2(dir.x, dir.z) : o.rotation.y
      o.rotation.y = turnToward(o.rotation.y, want, dt)
      // (back from the sacks with it lifted out before him till he's turned away and a step off them)
      if (T.phase === 'toBoard' && T.store === 'sacks' && w.gone < SACK_CLEAR_WALK) sackLift(o)
      if (w.gone >= w.len) {
        trip.current = null
        T.t = 0
        if (T.phase === 'toStore') {
          // (the lid lifted, the doors opened part way, as he reaches in)
          if (T.store === 'freezer') FRIDGE_KICK.at = performance.now()
          else if (T.store === 'cubby') CUBBY_KICK.left = performance.now()
        } else o.position.copy(at)
        T.phase = afterPhase(T.phase)
      }
      hand()
      return T.phase !== 'prepping'
    }
    if (T.phase === 'taking') {
      o.position.copy(T.spot)
      o.rotation.y = turnToward(o.rotation.y, Math.atan2(T.face.x - T.spot.x, T.face.z - T.spot.z), dt)
      // (bent over a sack's mouth (item 516): down into it as he takes hold, his hands in among the potatoes a moment, and up out of it with
      // them, his hands coming up together to carry them (from half way: carry); he stood upright a metre off and took them from the air)
      if (T.store === 'sacks' && o.parent) {
        const k = Math.min(1, T.t / TAKE_S)
        o.userData.lean = SACK_LEAN * Math.sin(k * Math.PI)
        if (k < SACK_LIFT_AT) {
          SACK_HANDS.left.copy(SACK_MOUTH).addScaledVector(SACK_ACROSS, SACK_HAND_GAP)
          SACK_HANDS.right.copy(SACK_MOUTH).addScaledVector(SACK_ACROSS, -SACK_HAND_GAP)
          o.parent.localToWorld(SACK_HANDS.left)
          o.parent.localToWorld(SACK_HANDS.right)
          o.userData.handsAt = SACK_HANDS
        } else sackLift(o)
      }
      // (rice balls: what the third cook's tray has taken off it as he comes to it, only the rest shaped there (item 129))
      if (T.store === 'ricetub' && T.shape < 0) { const f = fromTray(ONIGIRI_TRAY.n, T.keys.length); ONIGIRI_TRAY.n = f.left; T.shape = f.shape }
      T.t += dt * paceOfStaff(id)
      if (T.t >= takeOf(T.store, T.shape)) {
        // (a rice ball's rice out of the cooker, for each one he's making (game/rice))
        if (T.store === 'ricetub') for (let i = 0; i < Math.max(0, T.shape); i++) { const r = takeRice(RICE.rice, RICE.kama); RICE.rice = r.rice; RICE.kama = r.kama }
        T.shape = -1
        T.phase = afterPhase(T.phase); T.t = 0
      }
      hand()
      return true
    }
    if (T.phase === 'prepping') {
      T.t += dt * paceOfStaff(id)
      if (T.t >= prepOf(T.store)) { T.phase = afterPhase(T.phase); T.t = 0 }
    }
    return false
  }
  const gone = useRef(0)
  const path = useRef<{ way: THREE.Vector3[]; len: number } | null>(null)
  const scene = useThree((s) => s.scene)
  const mark = useRef<THREE.Object3D | null>(null)
  // (their walk home as the shop shuts, or in as it opens (game/commute, commuteWalk); whether they've come in yet today)
  const commute = useRef<Trip | null>(null)
  const arrived = useRef(false)
  useEffect(() => {
    const o = g.current
    if (!o) return
    KITCHEN_FOLK.add(o)
    FIGURES.set(o, role === 'sous' ? 'sous' : 'other')
    return () => { KITCHEN_FOLK.delete(o); FIGURES.delete(o); SHOP.walking.delete(id); COMMUTERS.delete(id) }
  }, [id, role])
  /**
   * Their way out from a place (this frame, on the floor), through the door and a step past it: a cook across the kitchen round all that
   * stands on its floor (GuestBar3D's route) to the gate, the cashier along behind the till; home through the front door; a cook who lives
   * upstairs (game/commute) from the gate across the aisle to the staff door and up the stair behind it.
   */
  const wayOf = (from: THREE.Vector3, o: THREE.Group) => {
    const out = staffWayOut(GRILL_COUNTERS)
    const across = round && KITCHEN_ROUTE.route ? KITCHEN_ROUTE.route(toBar(from), out[0]) : null
    const toGate = across ? [from, ...across.slice(1).map(fromBar)] : null
    const floor = (v: THREE.Vector3) => v.setY(floorAt(v))
    const sd = commuteOf(role, id) === 'dorm' && o.parent ? scene.getObjectByName('staff-door') : undefined
    if (sd && o.parent) {
      sd.updateWorldMatrix(true, false)
      const dW = sd.getWorldPosition(new THREE.Vector3()), room = sd.localToWorld(new THREE.Vector3(-1, 0, 0)).sub(dW).setY(0).normalize()
      const here = (v: THREE.Vector3) => floor(o.parent!.worldToLocal(v))
      const head = toGate ?? [from, ...way.slice(1, -2)]
      // (out in front of the door first, then straight in: coming along the wall from the bar they'd have cut the corner through the helmet's
      // stand beside the door (the owner's, 2026-11-12))
      // (and from the gate out to the aisle behind the stools, along it to its corner, then to the door: from the gate straight across to the
      // door they walked through the first counter's stools, a hair off the second one's middle (item 49, tests/e2e/_chefway.mjs))
      const c0 = GRILL_COUNTERS[0], gate = gateOf(c0, BAR_GATES[0]).mid
      const aisle = [gate.clone().addScaledVector(c0.lay, -aisleOf(c0)), aisleCornerOf(GRILL_COUNTERS, GRILL_COUNTERS[1])].map((v) => floor(fromBar(v)))
      return [...head.map((v, i) => (i ? floor(v) : v)), floor(fromBar(out[1])), ...aisle, here(dW.clone().addScaledVector(room, 1.6)), here(dW.clone().addScaledVector(room, 0.75)),
        here(dW.clone()), here(dW.clone().addScaledVector(room, -0.6))]
    }
    const w = (toGate ? [...toGate, ...out.slice(1).map(fromBar)] : [from, ...way.slice(1)]).map((v, i) => (i ? floor(v) : v))
    // (on out through the sliding door's open way and down its steps (item 410: a step past the door, through its shut middle))
    return [...w, ...doorOutOf(GRILL_COUNTERS).map((v) => floor(fromBar(v)))]
  }
  /** a step along their walk: where they stand and face, how much of them shows, their stretch and nod; the stair's door slid open
   * for them as they near it; whether it's done */
  const stepCommute = (o: THREE.Group, dt: number) => {
    const tr = commute.current!
    const pose = tripStep(tr, tick(dt), 1.6, (v) => (o.parent ? o.parent.localToWorld(v.clone()) : v.clone()))
    o.position.copy(pose.p)
    // (down on the genkan's stone as they cross it, in or out by the front door (item 203: a step's height over it, in their shoes))
    o.position.y += genkanY(GRILL_COUNTERS, toBar(o.position)) * GRILL_SCALE
    if (pose.yaw !== null) o.rotation.y = turnToward(o.rotation.y, pose.yaw, tick(dt))
    o.visible = pose.shown
    o.userData.fade = pose.vis
    o.userData.nod = pose.nod
    o.userData.stretch = pose.stretch
    if (commuteOf(role, id) === 'dorm' && tr.len - tr.d < 1.6 && tr.t > tr.wait) STAFF_DOOR_HOLD.until = performance.now() + 1500
    if (tr.done) { o.userData.fade = 1; o.userData.nod = 0; o.userData.stretch = false }
    return tr.done
  }
  useFrame((_, dt) => {
    const o = g.current
    if (!o) return
    if (!SHOP.leaving) {
      gone.current = 0
      path.current = null
      // (off fetching plates for the plating place: GuestBar3D walks them meanwhile)
      o.visible = PLATER_OUT.id !== id
      // (coming in as the shop opens: in at the front door, or down the stair through the staff door, each at their own moment; unseen
      // before it)
      if (!arrived.current) {
        if (!commute.current || commute.current.dir !== 'in') {
          const w = performance.now() - SHOP.openedAt < 4000 ? wayOf(placeOf().clone(), o) : null
          if (w && w.length > 2) commute.current = makeTrip(id, 'in', w.reverse(), delayOf(id, SHOP.day + 0.5) * 0.8, paceOf(id))
          else { arrived.current = true; clockIn(id, minutesNow()) }
          // (living upstairs: off down the stair up there as they set off (item 339))
          if (commuteOf(role, id) === 'dorm') { DORM_LIFE.downAt.set(id, performance.now()); DORM_LIFE.upAt.delete(id) }
        }
        if (!arrived.current) {
          if (!stepCommute(o, dt)) return
          commute.current = null
          arrived.current = true
        }
      }
      // (off plating or at the fire's charcoal, with no third cook to: the orders wait in their stores for him, not out onto the board by themselves)
      if (fetcher && !o.visible) { CHEF_TRIP.seenAt = performance.now(); FETCHER.id = id; FETCHER.busy = CHEF_TRIP.phase !== 'idle' }
      if (fetcher && o.visible && walkTrip(o, tick(dt))) return
      if (seat && o.parent) {
        if (!mark.current?.parent) mark.current = scene.getObjectByName(seat) ?? null
        const m = mark.current
        // (the seat's mark measured where it is now; one not yet placed in the world (its world matrix still the origin's: the till's chair
        // not drawn yet, or just put back) isn't sat on: they stand at their own place meanwhile. Read as it was, it sat the cashier in the
        // middle of the scene, which is the hearth's: a head over the fire (the owner saw two))
        m?.updateWorldMatrix(true, false)
        if (m && m.matrixWorld.elements[12] ** 2 + m.matrixWorld.elements[14] ** 2 > 0.01) {
          const inv = o.parent.matrixWorld.clone().invert()
          const dir = new THREE.Vector3(0, 0, -1).transformDirection(m.matrixWorld).transformDirection(inv)
          seatAt.current = { p: new THREE.Vector3().setFromMatrixPosition(m.matrixWorld).applyMatrix4(inv), yaw: Math.atan2(dir.x, dir.z) }
          // (sat down from their place beside it over a moment, up and onto it (the owner's item 37: from the floor onto the seat, half a metre
          // up, in a frame), as the customers get onto their stools)
          sat.current = Math.min(1, sat.current + tick(dt) / SIT_S)
          sitBetween(o, sat.current)
          // (the cashier at the till: turned round in the chair to the takeaway stand behind them, hands out with a bag (bar.ts's TAKEOUT_STAND))
          if (seat === 'cashier-seat') {
            TAKEOUT_STAND.cashierAt = performance.now()
            o.rotation.y += TAKEOUT_STAND.turn * Math.PI * 0.8
            o.userData.carry = TAKEOUT_STAND.carry
          }
          return
        }
      }
      o.position.copy(placeOf())
      // (turned back to their work a frame at a time: home from the stores, they snapped round to it)
      o.rotation.y = turnToward(o.rotation.y, yaw, tick(dt))
      return
    }
    // (still out with plates, the coal or the rice (GuestBar3D walks them): home first, what's in hand put down, and only then out; set off
    // from their place meanwhile, what they carried floated on alone along their way (the owner's ghost plates))
    if (PLATER_OUT.id === id && !commute.current) { o.visible = false; SHOP.walking.add(id); return }
    // (sat (the cashier): up off the seat and down onto the floor by their place first, over a moment, as they sat down: they dropped from
    // the seat to the floor in a frame and set off)
    if (seat && sat.current > 0 && seatAt.current && !commute.current) {
      sat.current = Math.max(0, sat.current - tick(dt) / SIT_S)
      sitBetween(o, sat.current)
      // (still on their way out, for the shop's shutting: everyone out of the door first)
      SHOP.walking.add(id)
      return
    }
    // (on their way: from where they are, down off a seat onto the floor, finishing up first, then home or upstairs)
    if (fetcher) { CHEF_TRIP.phase = 'idle'; CHEF_TRIP.keys = []; CHEF_TRIP.shape = -1; trip.current = null; o.userData.carry = o.userData.prep = false; FETCHER.busy = false }
    if (!commute.current || commute.current.dir !== 'out') {
      commute.current = makeTrip(id, 'out', wayOf(o.position.clone().setY(way[0].y), o), delayOf(id, SHOP.day), paceOf(id))
      SHOP.walking.add(id)
    }
    if (stepCommute(o, dt)) {
      // (through the staff door, living upstairs: on the stair up there now (item 339))
      if (SHOP.walking.has(id) && commuteOf(role, id) === 'dorm') { DORM_LIFE.upAt.set(id, performance.now()); DORM_LIFE.downAt.delete(id) }
      SHOP.walking.delete(id)
    }
  })
  // (their place the same Vector3 while it's the same place: a new one each time the grill redraws had React put them back there for a frame,
  // and anyone walking home as the shop closed jumped back to their place and on again)
  const atKey = `${at.x},${at.y},${at.z}`
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const place = useMemo(() => at.clone(), [atKey])
  return <group ref={g} name={`crew-${id}`} userData={{ staffId: id }} position={place} rotation-y={yaw} scale={CHEF_SCALE}>{children}</group>
}
