import { memo, useEffect, useMemo, useRef } from 'react'
import { getClock, minutesNow } from '@/ui/kit/clockStore'
import { BOX_SHEETS, TISSUE } from '@/game/stock/tissues'
import { drinksToOrder, ROLL_LOW, stockerChore, type StockChore } from '@/game/stock/stocker'
import { bagGoes, bagOut, binToEmpty, type BinKind } from '@/game/service/bins'
import { ROLL, SOAP, SOAP_FULL, SOAP_REFILL_AT, topUp, TOWEL, TOWEL_FULL, TOWEL_REFILL_AT } from '@/game/guests/washroom'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@/scene/interact/Html'
import * as THREE from 'three'
import { delayOf, paceOf } from '@/game/staff/commute'
import { makeTrip, tripStep, turnToward, type Trip } from '@/shops/grill/staff/commuteWalk'
import { STAFF_IDLE, idleTick, paceOfStaff } from '@/game/world/shopState'
import { StaffFigure, TRAY_AT as HELD_AT } from '@/scene/people/StaffFigure'
import { BlobShadow } from '@/scene/effects/BlobShadow'
import { activityOf, type Look as StaffLook } from '@/data/staff'
import { useBinBags } from '@/shops/grill/kitchen/Sink'
import { bottleClink } from '@/shops/grill/sounds/restroomSound'
import { SHOP, clockIn } from '@/game/world/shopState'
import { newRoll } from '@/game/guests/restroom'
import { FIGURES, aisleCornerOf, aisleOf, DRAWER_HELD, SHOP_PURSE, STOCKER_WC, SUPPLIES, setTissues, tissuesAt, KITCHEN_ROUTE, SINK_BIN, AISLE, SEATS_TAKEN, BAR_GATES, TOILETS, DRINK_BACK, FRIDGE, FRIDGE_AT, FRIDGE_STATE, FRIDGE_STOCK, placesOf, FRIDGE_UNITS, farOf, fridgesOf, storeOf, STORE_STATE, gateOf, toiletsOf, alongPath, doorOf, doorOutOf, pathLength, seatsOf, type Counter, genkanY, STAFF_DOOR_HOLD, DRINK_COMING } from '@/shops/grill/bar'
import { caseCost, emptyFillable, emptyGaps, orderCase, restockRun } from '@/game/stock/drinkStock'
import { NO_POINTER, zr } from '@/scene/interact/htmlProps'
import { STAFF_SCALE } from './staffPoses'

/**
 * The stocker (倉儲), there only once one's hired and while the shop's open (drawn as that hire): stands by the crates of drinks at the
 * back (the back stock, DRINK_BACK) and, when a fridge is three or more short
 * of what the back can fill, carries a case over, opens it, fills its empty places from the back (game/drinkStock's restockRun, as many
 * as a trip carries) and goes back to the crates.
 */
const STOCK_CARRY = 8
/** (item 208) the stock keeper's ways for a bin's bag (StockerImpl's binWays), and how long he's gone down the stair with it (the shop's seconds) */
type BinWays = { toBin: THREE.Vector3[]; toDoor: THREE.Vector3[]; door: THREE.Vector3; mouths: Record<BinKind, THREE.Vector3>; scale: number }
const BIN_AWAY_S = 6
/** the stock keeper's figure (in the bar's frame, as the customers' are): they step round him as they do the servers (the owner's item 45) */
export const STOCKER_FIG: { o: THREE.Object3D | null } = { o: null }
// (he walks by his own frame loop: drawn again only if he or the room changes, not with every redraw of the bar)
/** a washroom's paper towels or soap down to where they're topped up, with a spare in stock for it: the stock keeper goes round to it */
const wcLow = (w: 'm' | 'f') => {
  const t = TOILETS[w]
  return (t.towels < TOWEL_REFILL_AT && SUPPLIES.has(TOWEL) > 0) || (t.soap < SOAP_REFILL_AT && SUPPLIES.has(SOAP) > 0)
}
/** whether it's a roll he's going to change there (else he's topping up the towels or the soap) */
const rolling = (w: 'm' | 'f') => TOILETS[w].room.paper < ROLL_LOW && SUPPLIES.has(ROLL) > 0
export const Stocker = memo(StockerImpl, (a, b) => a.counters === b.counters && a.fridges === b.fridges && a.who.id === b.who.id && a.who.look === b.who.look)
/**
 * The stock keeper (倉儲; the owner's: they order in and restock, and walk to do it), by game/stocker's chores: a toilet's roll running out,
 * changed for a new one (in through its door when nobody's using it, the guests leaving it till he's out); the drinks carried out of the back
 * to a fridge short of them; a place's box of tissues running low, changed for a spare (its drawer pulled out while he does, nobody sat
 * there); and, looking round, a case of a drink ordered in once the back's down to under half a case of it. From his place by the crates
 * along the aisles, round the corner for the long counter.
 */
function StockerImpl({ counters, fridges, who }: { counters: Counter[]; fridges: NonNullable<ReturnType<typeof fridgesOf>>; who: { id: string; look: StaffLook } }) {
  const g = useRef<THREE.Group>(null)
  const held = useRef<{ crate: THREE.Object3D | null; roll: THREE.Object3D | null; box: THREE.Object3D | null; bag: THREE.Group | null }>({ crate: null, roll: null, box: null, bag: null })
  const scene = useThree((st3) => st3.scene)
  // (a bin's bag tied up and carried out, and the new one brought back (item 208): copies of the sink's own)
  const bags = useBinBags()
  const statusEl = useRef<HTMLSpanElement>(null)
  const c1 = counters[1]
  const home = useMemo(() => {
    // (in the stock room, standing by or slacking (item 481, the owner's 「倉儲如果在待命或是偷閒就待在倉庫內即可」): a little along from its
    // doorway's middle toward the wall's end and in from it, before the milk crates (their fronts 0.84 in), clear of the way along behind the
    // fridges to their backs)
    const sto = storeOf(counters)
    if (sto) return sto.at(sto.mid - 0.25, 0.6)
    const last = fridges[fridges.length - 1]
    // (out from the crates and the cartons into the aisle (the owner's: stood against them, he read as staring at the wall), clear of the
    // fridge's front and its doors, a little along from it (the owner's: squeezed half into the gap by it). The wall's at farOf (the crates
    // 0.32 in from it): a move into the room is +lay (the last move went the other way, and stood him in the middle of the beer crates: the
    // owner saw him sunk in a red box, 2026-11-10))
    return c1.at.clone().addScaledVector(c1.along, last.z - FRIDGE.W / 2 - 0.42).addScaledVector(c1.lay, farOf(c1) + 0.32 + 0.95)
  }, [c1, fridges, counters])
  const seats = useMemo(() => seatsOf(counters), [counters])
  const wcs = useMemo(() => toiletsOf(counters), [counters])
  // (the stock room's way in (items 430, 431): before its doorway in the aisle, in it, and just inside it; the drinks are fetched in there now
  // and put in the fridges from behind, out of the customers' way)
  const store = useMemo(() => storeOf(counters), [counters])
  const storeWay = useMemo(() => store && { out: store.at(store.mid, -0.42), mid: store.at(store.mid, 0.1), inside: store.at(store.mid, 0.46) }, [store])
  /** out of the stock room from his place in it (item 481): just inside its doorway, through it, before it in the aisle; none without it */
  const outOfStore = () => (storeWay ? [storeWay.inside.clone(), storeWay.mid.clone(), storeWay.out.clone()] : [])
  /** his way out into the side counter's aisle, across from his place */
  const homeAisle = useMemo(() => c1.at.clone().addScaledVector(c1.along, home.clone().sub(c1.at).dot(c1.along) / c1.along.lengthSq()).addScaledVector(c1.lay, -AISLE), [home, c1])
  const st = useRef({ phase: 'idle' as 'idle' | 'take' | 'go' | 'work' | 'back', t: 0, chore: null as StockChore, path: [] as THREE.Vector3[], len: 0, d: 0,
    pos: home.clone(), yaw: 0, check: 0, done: false,
    /** (a fridge filled from behind, item 535) its hatch let go to close, and he waits by it till it's shut before he turns away */
    filled: false,
    /** (item 554) how far he's stepped in from where he stands while its back's door slides (0) to where he fills it (1), and how long he's
     * been filling it */
    slide: 0, fill: 0,
    /** (a bin's bag, item 208) which part of the round he's at (0 to the bins, 1 out to the staff door with it, 2 gone down the stair, 3 back
     * to the bins with a new one), his ways, and what's in his hands */
    leg: 0, ways: null as BinWays | null, bag: null as BinKind | 'new' | null })
  /** (item 208) his ways for a bin's bag, in the bar's frame on the floor: from his place along the aisles to the first counter's gate, through
   * it into the kitchen and across to before the bins; and from them back out through the gate, along the aisle to the staff door and in
   * through it, to the stair behind (the rubbish goes down it to be put out). Null while the bins or the door aren't there to be found */
  const binWays = (): BinWays | null => {
    const o = g.current, par = o?.parent, route = KITCHEN_ROUTE.route
    if (!o || !par || !route) return null
    let front: THREE.Object3D | null = null, mouth: THREE.Object3D | null = null, recMouth: THREE.Object3D | null = null
    scene.traverse((q) => {
      if (!front && q.name === 'SinkBinFront') front = q
      if (!mouth && q.name === 'SinkBinTop') mouth = q
      if (!recMouth && q.name === 'SinkBinRecTop') recMouth = q
    })
    const sd = scene.getObjectByName('staff-door')
    if (!front || !mouth || !recMouth || !sd) return null
    const local = (q: THREE.Object3D) => par.worldToLocal(q.getWorldPosition(new THREE.Vector3())).setY(0)
    const c0 = counters[0], gate = gateOf(c0, BAR_GATES[0]).mid.clone().setY(0)
    const gateIn = gate.clone().addScaledVector(c0.lay, 0.45), gateOut = gate.clone().addScaledVector(c0.lay, -aisleOf(c0))
    const bin = local(front)
    const inner = route(gateIn, bin)
    if (!inner.length || inner[inner.length - 1].distanceTo(bin) > 0.02) inner.push(bin.clone())
    const toBin = [home.clone(), ...outOfStore(), homeAisle.clone(), aisleCornerOf(counters, c1), gateOut.clone(), gate.clone(), gateIn.clone(), ...inner.slice(1)]
    sd.updateWorldMatrix(true, false)
    const dW = sd.getWorldPosition(new THREE.Vector3()), room = sd.localToWorld(new THREE.Vector3(-1, 0, 0)).sub(dW).setY(0).normalize()
    const at = (k: number) => par.worldToLocal(dW.clone().addScaledVector(room, k)).setY(0)
    const toDoor = [...[...inner].reverse(), gateIn.clone(), gate.clone(), gateOut.clone(), aisleCornerOf(counters, c1), at(1.6), at(0.75), at(0), at(-0.6)]
    // (the bags in his hands at the sink's own size: his figure's drawn smaller than the room)
    const sk = (mouth as THREE.Object3D).getWorldScale(new THREE.Vector3()).x, gs = o.getWorldScale(new THREE.Vector3()).x
    return { toBin, toDoor, door: at(0), mouths: { rubbish: local(mouth), recycle: local(recMouth) }, scale: gs > 0 ? sk / gs : 1 }
  }
  if (import.meta.env?.DEV && typeof window !== 'undefined') (window as unknown as { __stocker?: typeof st }).__stocker = st
  // (his walk in as the shop opens and home as it shuts (commuteWalk): out along the side counter's aisle, round the corner, to the front door)
  const cm = useRef<{ trip: Trip | null; arrived: boolean }>({ trip: null, arrived: false })
  useEffect(() => () => { SHOP.walking.delete(who.id) }, [who.id])
  useFrame((_, dt0) => {
    // (worn out, at half pace (the owner's))
    const dt = Math.min(dt0, 0.1) * paceOfStaff(who.id)
    // (his walk in and home at his own pace, as everyone else's is (commuteWalk's paceOf): the shift's done, not worn into it. Item 838, the
    // Tester window's 873: tired at half, the stock room to the front door, 14.9 long, took him 40 of the game's minutes, and the shop shut
    // as he got out of it, the last of them)
    const dtWalk = Math.min(dt0, 0.1)
    const s = st.current
    const o = g.current
    if (o) {
      const c = cm.current
      // (his status put away while he walks in or home: shown again below once he's at work)
      if ((!c.arrived || SHOP.leaving) && statusEl.current) statusEl.current.style.visibility = 'hidden'
      const wayFrom = (from: THREE.Vector3) => {
        // (on out through the sliding door's open way and down its steps (item 410: a step past the door, through its shut middle))
        // (out of the stock room first, from his place in it (item 481))
        return [from.clone(), ...(from.distanceTo(home) < 0.05 ? outOfStore() : []), homeAisle.clone(), aisleCornerOf(counters, c1), doorOf(counters), ...doorOutOf(counters)]
      }
      const apply = (tr: Trip) => {
        const pose = tripStep(tr, dtWalk, 1.0, (v) => (o.parent ? o.parent.localToWorld(v.clone()) : v.clone()))
        s.pos.copy(pose.p)
        if (pose.yaw !== null) s.yaw = turnToward(s.yaw, pose.yaw, dtWalk)
        o.position.copy(s.pos)
        // (down on the genkan's stone as he crosses it, as the customers are (item 203: a step's height over it))
        o.position.y += genkanY(counters, s.pos)
        o.rotation.y = s.yaw
        o.visible = pose.shown
        o.userData.fade = tr.done ? 1 : pose.vis
        o.userData.nod = pose.nod
        o.userData.stretch = pose.stretch
      }
      if (!c.arrived) {
        if (!c.trip) {
          if (performance.now() - SHOP.openedAt < 4000) c.trip = makeTrip(who.id, 'in', wayFrom(home).reverse(), delayOf(who.id, SHOP.day + 0.5) * 0.8 + 1.2, paceOf(who.id))
          else { c.arrived = true; clockIn(who.id, minutesNow()) }
        }
        if (c.trip) {
          apply(c.trip)
          if (!c.trip.done) return
          c.trip = null
          c.arrived = true
          s.pos.copy(home)
        }
      }
      // (shut: once back from what he was about, finishing up, then home)
      if (SHOP.leaving) {
        SHOP.walking.add(who.id)
        if (s.phase === 'idle' || c.trip) {
          if (!c.trip) c.trip = makeTrip(who.id, 'out', wayFrom(s.pos), delayOf(who.id, SHOP.day), paceOf(who.id))
          apply(c.trip)
          if (c.trip.done) SHOP.walking.delete(who.id)
          return
        }
      }
    }
    /** along his way, out or back (back: the same way, walked from its end) */
    const walk = () => {
      s.d = Math.min(s.len, s.d + dt * 1.0)
      const { p, dir } = alongPath(s.path, s.phase === 'back' ? s.len - s.d : s.d)
      s.pos.copy(p)
      if (dir.x || dir.z) s.yaw = s.phase === 'back' ? Math.atan2(-dir.x, -dir.z) : Math.atan2(dir.x, dir.z)
      return s.d >= s.len
    }
    const set = (path: THREE.Vector3[]) => { s.path = path; s.len = pathLength(path); s.d = 0 }
    const c = s.chore
    // (the stock room's noren swung aside as he goes through its doorway, either way)
    STORE_STATE.passing = storeWay && s.pos.distanceTo(storeWay.mid) < 0.3 ? 1 : 0
    idleTick(who.id, s.phase === 'idle' && !SHOP.leaving, dt, true)
    if (s.phase === 'idle') {
      s.check += dt
      s.t += dt
      // (standing by: facing the room most of the while, now and then turned to the stock behind him, bent over his clipboard counting it)
      // (slacking at his game instead, past a while with nothing to do: the only one who does (the owner's), his status plate put away for
      // its own badge over him)
      const slacking = activityOf(STAFF_IDLE.get(who.id)) === 'slack'
      const counting = !slacking && s.t % 14 > 9
      const face = counting ? Math.atan2(c1.lay.x, c1.lay.z) : Math.atan2(-c1.lay.x, -c1.lay.z)
      s.yaw += Math.atan2(Math.sin(face - s.yaw), Math.cos(face - s.yaw)) * Math.min(1, dt * 4)
      if (g.current) { g.current.userData.lean = counting ? 0.18 : 0; g.current.userData.prep = undefined }
      if (s.check > 1) {
        s.check = 0
        // (a case ordered from the liquor shop of whatever the back, with what's on its way, is running out of, one a look (item 243: it came
        // that moment); brought round DELIVERY_MIN later, paid for then)
        const ids = FRIDGE_UNITS.flatMap((u) => u.shelves.flatMap((sh) => sh.ids))
        const want = drinksToOrder(DRINK_BACK.back, ids, DRINK_COMING.list)[0]
        if (want && SHOP_PURSE.cash() >= caseCost(want)) {
          DRINK_COMING.list = orderCase(DRINK_COMING.list, want, getClock().day * 1440 + getClock().minute)
          DRINK_BACK.ver++
        }
        const busy = (w: 'm' | 'f') => TOILETS[w].passing > 0 || TOILETS[w].inside > 0
        // (none taken on once the shop's closing (item 838, the Tester window's 873: at 05:12 he went to fill a fridge, at 05:13 to empty the
        // bin, 36 of the game's minutes there at his half pace, and the staff waited on him to shut): what's left is done as the shop opens)
        const next = SHOP.closing || SHOP.leaving ? null : stockerChore({
          rolls: { m: TOILETS.m.room.paper, f: TOILETS.f.room.paper }, wcBusy: { m: busy('m'), f: busy('f') },
          fridgeShort: fridges.map((f) => emptyFillable(placesOf(f.n), FRIDGE_UNITS[f.n].shelves.map((sh) => sh.ids), DRINK_BACK.back)),
          // (and the drinks gone from each one's shelves: that fridge first (item 541))
          fridgeGaps: fridges.map((f) => emptyGaps(placesOf(f.n), FRIDGE_UNITS[f.n].shelves.map((sh) => sh.ids), DRINK_BACK.back)),
          boxes: seats.map((_, i) => tissuesAt(i)), seatTaken: (n) => SEATS_TAKEN.has(n), spares: Math.max(0, SUPPLIES.has(TISSUE)),
          // (a roll changed only with a spare in stock; and the washrooms' paper towels and soap topped up from theirs, on the same round)
          rollSpares: Math.max(0, SUPPLIES.has(ROLL)), wcLow: { m: wcLow('m'), f: wcLow('f') },
          // (a bin by the sink full enough to empty (item 208), none of its bags out already)
          bin: SINK_BIN.out ? null : binToEmpty(SINK_BIN.b),
        })
        const ways = next?.kind === 'bin' ? binWays() : null
        if (next && !(next.kind === 'roll' && !wcs) && !(next.kind === 'bin' && !ways)) {
          s.chore = next
          s.done = false
          s.slide = 0; s.fill = 0; s.filled = false
          if (next.kind === 'drinks') {
            const f = fridges.find((x) => x.n === next.unit)!
            // (in through the stock room's noren and along behind the fridges to this one's back (item 431); to its front, as before, if
            // there's no stock room)
            // (his place is in there now (item 481): straight along behind the fridges)
            // (before the half of its back that opens, a step back from it while its door slides (item 554))
            set(storeWay ? [home.clone(), f.wait.clone()] : [home.clone(), f.front.clone()])
          }
          else if (next.kind === 'bin') {
            s.ways = ways
            s.leg = 0
            set(ways!.toBin)
            if (held.current.bag) held.current.bag.scale.setScalar(ways!.scale)
          }
          else if (next.kind === 'roll') {
            const w = wcs![next.who]
            STOCKER_WC.who = next.who
            // (in at the door, past the washstand, round the corner to the toilet's paper)
            set([home.clone(), ...outOfStore(), homeAisle.clone(), w.aisle.clone(), w.front.clone(), w.inside.clone(), w.turn.clone(), w.stall.clone()])
          } else {
            const seat = seats[next.seat]
            // (beside the stool, on the drawer's side (the customer's left, + along), facing the bar)
            const beside = seat.aisle.clone().lerp(seat.stool, 0.55).addScaledVector(seat.along, 0.3)
            set([home.clone(), ...outOfStore(), homeAisle.clone(), ...(seat.counter === 1 ? [] : [aisleCornerOf(counters, c1)]), seat.aisle.clone(), beside])
          }
          // (the drinks: first bent to the cartons for a case, then off with it; with the stock room, in there first, the case taken from the
          // stock along its back wall behind him, then turned to the fridge's back)
          if (next.kind === 'drinks' && !storeWay) { s.phase = 'take'; s.t = 0 } else { s.phase = 'go'; s.t = 0 }
        }
      }
    } else if (s.phase === 'take') {
      s.t += dt
      // (in the stock room, to the stock along its back wall behind him; by the crates and cartons, toward them)
      const inStore = !!(storeWay && store && c?.kind === 'drinks')
      // (straight back from where he stands before the fridge's back: the stock along the room's back wall)
      const fr = inStore ? fridges.find((x) => x.n === (c as { unit: number }).unit)! : null
      const to = fr ? s.pos.clone().addScaledVector(fr.wait.clone().sub(fr.back), 25) : null
      const face = to ? Math.atan2(to.x - s.pos.x, to.z - s.pos.z) : Math.atan2(c1.lay.x, c1.lay.z)
      s.yaw += Math.atan2(Math.sin(face - s.yaw), Math.cos(face - s.yaw)) * Math.min(1, dt * 6)
      // (turned first, then bent to it: a quarter of a second to turn, the bend and back after)
      const k = inStore ? Math.max(0, (s.t - 0.25) / 0.9) : s.t / 0.9
      if (g.current) g.current.userData.lean = 0.4 * Math.sin(Math.min(1, k) * Math.PI)
      if (k >= 1) { if (g.current) g.current.userData.lean = 0; s.phase = inStore ? 'work' : 'go'; s.t = 0 }
    } else if (s.phase === 'go') {
      if (walk()) { s.phase = storeWay && c?.kind === 'drinks' ? 'take' : 'work'; s.t = 0 }
    } else if (s.phase === 'work' && c) {
      s.t += dt
      if (c.kind === 'drinks') {
        const f = fridges.find((x) => x.n === c.unit)!
        // (facing its back square on (item 554: he stands before the half of it that opens, not its middle))
        s.yaw = storeWay ? f.yaw : Math.atan2(f.at.x - s.pos.x, f.at.z - s.pos.z)
        const fillIn = () => {
          const run = restockRun(placesOf(c.unit), FRIDGE_UNITS[c.unit].shelves.map((sh) => sh.ids), DRINK_BACK.back, STOCK_CARRY)
          run.rows.forEach((r, i) => { FRIDGE_STOCK.units[c.unit][i] = r; FRIDGE_STOCK.counts[c.unit][i] = run.counts[i] })
          DRINK_BACK.back = run.back
          DRINK_BACK.ver++
          FRIDGE_STOCK.ver++
          bottleClink(false, FRIDGE_AT[c.unit])
        }
        if (storeWay) {
          // (from behind (items 431, 554): the case taken from the stock behind him, its back's outer door slid across from a step back (the
          // case in his arms reaches 2 cm past the back's face where he fills it, the door 2 cm proud of it), a step in once it's open, the
          // drinks put in row by row through the open half (seen through the glass from the room), a step back, slid shut, and away only
          // once it's home (he'd walk off with it still sliding). His own mark held each frame while it's to be open, as the bar counts those
          // at it afresh each frame (a count added to here was lost to that, and he filled it through the shut glass))
          const rear = FRIDGE_STATE[c.unit].rear
          if (!s.filled) {
            FRIDGE_STATE[c.unit].stocker = true
            if (rear > 0.97) s.slide = Math.min(1, s.slide + dt / 0.25)
            if (s.slide >= 1) {
              s.fill += dt
              if (s.fill > 1.6) { fillIn(); s.filled = true }
            }
          } else {
            s.slide = Math.max(0, s.slide - dt / 0.25)
            FRIDGE_STATE[c.unit].stocker = s.slide > 0
            if (s.slide <= 0 && rear < 0.02) { s.filled = false; s.fill = 0; s.phase = 'back' }
          }
          const e = s.slide * s.slide * (3 - 2 * s.slide)
          s.pos.lerpVectors(f.wait, f.back, e)
        } else {
          // (from the front, the room's glass door open while he fills it)
          if (!s.filled) FRIDGE_STATE[c.unit].stocker = true
          if (s.t > 1.6 && !s.filled) { fillIn(); FRIDGE_STATE[c.unit].stocker = false; s.filled = true }
          if (s.filled && s.t > 1.6) { s.filled = false; s.phase = 'back' }
        }
      } else if (c.kind === 'roll') {
        // (in, the door shut behind him: the old roll off the holder, a new one on, from the spares in stock; and the towel box and the soap
        // topped up from theirs while he's there)
        if (s.t > 2.4 && !s.done) {
          s.done = true
          const t = TOILETS[c.who]
          if (t.room.paper < ROLL_LOW && SUPPLIES.take(ROLL, 1)) {
            t.room = newRoll(t.room)
            t.rollAt = performance.now()
          }
          if (topUp(t.towels, TOWEL_FULL, TOWEL_REFILL_AT, 1).level !== t.towels && SUPPLIES.take(TOWEL, 1)) t.towels = TOWEL_FULL
          if (topUp(t.soap, SOAP_FULL, SOAP_REFILL_AT, 1).level !== t.soap && SUPPLIES.take(SOAP, 1)) t.soap = SOAP_FULL
        }
        if (s.t > 2.8) s.phase = 'back'
      } else if (c.kind === 'bin') {
        const w = s.ways!
        if (s.leg === 0 || s.leg === 3) {
          // (at the bins, bent to the one he's come for, its lid held up: the full bag lifted out and its neck tied (0), or the new one shaken
          // out and set in over its rim (3))
          const m = w.mouths[c.which]
          s.yaw = Math.atan2(m.x - s.pos.x, m.z - s.pos.z)
          SINK_BIN.lids[c.which].until = performance.now() + 450
          if (g.current) g.current.userData.lean = 0.38 * Math.sin(Math.min(1, s.t / 1.4) * Math.PI)
          if (s.leg === 0 && s.t > 0.7 && !s.done) {
            s.done = true
            SINK_BIN.b = bagOut(SINK_BIN.b, c.which)
            if (c.which === 'rubbish') SINK_BIN.sticks = 0
            SINK_BIN.out = c.which
            s.bag = c.which
          }
          // (with customers about, not out through the staff door with it (item 318): turned to the sink's cupboard beside the bins, the bag
          // stowed in it and a new one taken out; with none, out by the staff door as before)
          if (s.leg === 0 && s.t > 1.4) {
            if (bagGoes(!SHOP.leaving) === 'underSink') { s.leg = 4; s.t = 0 }
            else { s.leg = 1; set(w.toDoor); s.phase = 'go' }
          }
          if (s.leg === 3 && s.t > 0.7 && s.bag) { s.bag = null; SINK_BIN.out = null }
          if (s.leg === 3 && s.t > 1.3) { if (g.current) g.current.userData.lean = 0; set(w.toBin); s.phase = 'back' }
        } else if (s.leg === 4) {
          // (bent to the cupboard under the sink, the other side of the bins from the recycling's (the rubbish bin stands against the sink): the
          // full bag in, a new one out of the roll kept there; then back to the bin to set it in (leg 3))
          const toSink = w.mouths.rubbish.clone().sub(w.mouths.recycle).setY(0)
          if (toSink.lengthSq() > 1e-6) s.yaw += Math.atan2(Math.sin(Math.atan2(toSink.x, toSink.z) - s.yaw), Math.cos(Math.atan2(toSink.x, toSink.z) - s.yaw)) * Math.min(1, dt * 8)
          if (g.current) g.current.userData.lean = 0.5 * Math.sin(Math.min(1, s.t / 1.1) * Math.PI)
          if (s.t > 0.55 && s.bag && s.bag !== 'new') { SINK_BIN.stowed[s.bag] += 1; s.bag = 'new' }
          if (s.t > 1.1) { if (g.current) g.current.userData.lean = 0; s.leg = 3; s.t = 0 }
        } else if (s.leg === 1) {
          // (through the staff door with it and down the stair behind, to put it out with the shop's rubbish)
          s.leg = 2
          s.t = 0
        } else if (s.leg === 2 && s.t > BIN_AWAY_S) {
          // (back up with a new bag for it, out through the door again and back to the bins)
          s.bag = 'new'
          s.leg = 3
          set([...w.toDoor].reverse())
          s.phase = 'go'
        }
      } else {
        // (the drawer out, the box in it changed for a spare, the drawer back in)
        const seat = seats[c.seat]
        const at = seat.mid
        s.yaw = Math.atan2(at.x - s.pos.x, at.z - s.pos.z)
        if (!SEATS_TAKEN.has(c.seat)) DRAWER_HELD.add(c.seat)
        if (s.t > 1.3 && !s.done) {
          s.done = true
          if (SUPPLIES.take(TISSUE, 1)) setTissues(c.seat, BOX_SHEETS)
        }
        if (s.t > 2.0) { DRAWER_HELD.delete(c.seat); s.phase = 'back' }
      }
      if (s.phase === 'back') { s.d = 0 }
    } else if (s.phase === 'back') {
      if (walk()) {
        s.phase = 'idle'
        s.t = 0
        s.pos.copy(home)
        if (c?.kind === 'roll') STOCKER_WC.who = null
        if (c?.kind === 'bin') { s.ways = null; s.leg = 0 }
        s.chore = null
      }
    }
    // (on his way to a chore or back from it, for his figure: his clipboard put by as he goes (item 374: it was his state, and all of him was
    // drawn again each time he set off or stopped))
    if (g.current) g.current.userData.walking = s.phase === 'go' || s.phase === 'back'
    // (at a toilet's door: near enough to have it open; in, past it)
    if (c?.kind === 'roll' && wcs) {
      const w = wcs[c.who]
      STOCKER_WC.near = s.pos.distanceTo(w.front) < 1.3 && !(s.phase === 'work')
      STOCKER_WC.inside = s.phase === 'work'
    } else { STOCKER_WC.near = false; STOCKER_WC.inside = false }
    let fade = 1
    if (c?.kind === 'bin' && s.ways) {
      const toDoor = s.pos.distanceTo(s.ways.door)
      if ((s.leg === 1 || s.leg === 3) && toDoor < 1.6) STAFF_DOOR_HOLD.until = performance.now() + 1200
      // (past the door, in the stair: fading out going in, in coming back out)
      if ((s.leg === 1 && s.phase === 'go' && s.len - s.d < 0.6) || (s.leg === 3 && s.phase === 'go' && s.d < 0.6)) fade = Math.max(0, Math.min(1, (s.leg === 1 ? s.len - s.d : s.d) / 0.6))
      if (s.leg === 2 || (s.leg === 1 && s.phase === 'work')) fade = 0
    }
    if (g.current) {
      g.current.position.copy(s.pos)
      // (turned toward the way he's to face a frame at a time: set at once, he spun round at each corner and at the fridge, 130° in a frame)
      g.current.rotation.y = turnToward(g.current.rotation.y, s.yaw, dt)
      // (seen all the way in the toilet's stall changing the roll, as the customers are since the owner's 2026-11-12 (item 203: he alone still
      // faded out in there); faded only through the staff door, taking a bin's bag out (item 208))
      g.current.userData.fade = fade
      g.current.visible = fade > 0.02
    }
    // (in his arms: a case of drinks carried out; a new roll; a new box of tissues; back empty-handed)
    const out = s.phase === 'go' || s.phase === 'work'
    const h = held.current
    if (h.crate) h.crate.visible = (out || (s.phase === 'take' && s.t > 0.45)) && c?.kind === 'drinks'
    // (what he's at, over his head (the owner's: standing about, nobody could tell): as words, the run's share done while it's under way)
    const el = statusEl.current
    if (el) {
      const zh = document.documentElement.lang !== 'ja' && document.documentElement.lang !== 'en', ja = document.documentElement.lang === 'ja'
      const tl3 = (a: string, b: string, e: string) => (ja ? b : zh ? a : e)
      const pct = (k: number) => ` ${Math.round(Math.min(1, k) * 100)}%`
      const slacking = s.phase === 'idle' && activityOf(STAFF_IDLE.get(who.id)) === 'slack'
      const text = s.phase === 'idle' ? (s.t % 14 > 9 && !slacking ? tl3('庫存清點中', '在庫チェック中', 'Counting stock') : tl3('待命', '待機中', 'Standing by'))
        : s.phase === 'take' ? tl3('取貨中', '荷出し中', 'Picking up a case')
        : s.phase === 'back' ? tl3('返回待命', '戻り中', 'Heading back')
        : c?.kind === 'drinks' ? (s.phase === 'work' ? tl3('補貨中', '補充中', 'Restocking') + pct(s.t / 1.6) : tl3('搬運飲料中', '飲み物運搬中', 'Carrying drinks'))
        : c?.kind === 'roll' ? (rolling(c.who) ? tl3('更換衛生紙', 'トイレ紙交換', 'Changing the toilet roll') : tl3('補充洗手間用品', 'トイレ用品の補充', 'Restocking the washroom'))
          + (s.phase === 'work' ? pct(s.t / 2.8) : '')
        : c?.kind === 'bin' ? (s.leg === 3 ? tl3('換新垃圾袋', 'ゴミ袋の交換', 'Putting in a new bag')
          : s.leg === 4 ? tl3('垃圾袋收到水槽下', 'ゴミ袋をシンク下へ', 'Stowing the bag under the sink')
          : c.which === 'rubbish' ? tl3('倒垃圾', 'ゴミ出し', 'Taking out the rubbish') : tl3('倒資源回收', '資源ごみ出し', 'Taking out the recycling'))
        : tl3('補充面紙', 'ティッシュ補充', 'Refilling tissues') + (s.phase === 'work' ? pct(s.t / 2.0) : '')
      if (el.textContent !== text) el.textContent = text
      el.style.visibility = slacking || g.current?.visible === false || (g.current?.userData.fade ?? 1) < 0.5 ? 'hidden' : ''
    }
    if (h.roll) h.roll.visible = out && c?.kind === 'roll' && !s.done && rolling(c.who)
    if (h.box) h.box.visible = out && c?.kind === 'tissue' && !s.done
    // (a bin's bag: the full one tied up and carried out, the new one brought back folded (item 208))
    if (h.bag) {
      h.bag.visible = c?.kind === 'bin' && s.bag !== null
      // (the group's three, in the order they're hung in it: the rubbish's, the recycling's, the new one)
      const [rub, rec, fresh] = h.bag.children
      if (rub) rub.visible = s.bag === 'rubbish'
      if (rec) rec.visible = s.bag === 'recycle'
      if (fresh) fresh.visible = s.bag === 'new'
    }
  })
  // (shut, nothing of his left about: no drawer held out, no toilet waiting on him)
  useEffect(() => () => {
    STOCKER_WC.who = null; STOCKER_WC.near = false; STOCKER_WC.inside = false; DRAWER_HELD.clear(); for (const f of FRIDGE_STATE) f.stocker = false
    // (a bin's bag he had out: put back in as it was (gone home or let go mid-round), the bin as he left it)
    SINK_BIN.out = null
  }, [])
  return (
    <group ref={(o) => { g.current = o; STOCKER_FIG.o = o; if (o) FIGURES.set(o, 'other') }} position={home} scale={STAFF_SCALE} userData={{ staffId: who.id, role: 'stock' }}>
      <BlobShadow r={0.17} />
      <StaffFigure id={who.id} role="stock" look={who.look} />
      <Html position={[0, 1.95, 0]} center zIndexRange={zr(19, 9)} style={NO_POINTER}>
        <span ref={statusEl} className="staff-status" />
      </Html>
      <mesh ref={(o) => { held.current.crate = o }} position={[0, HELD_AT[1] + 0.06, HELD_AT[2]]} visible={false}>
        <boxGeometry args={[0.22, 0.13, 0.16]} />
        <meshToonMaterial color="#b98a52" />
      </mesh>
      <mesh ref={(o) => { held.current.roll = o }} position={[0, HELD_AT[1] + 0.05, HELD_AT[2]]} rotation-z={Math.PI / 2} visible={false}>
        <cylinderGeometry args={[0.05, 0.05, 0.1, 14]} />
        <meshToonMaterial color="#f4f2ec" />
      </mesh>
      <mesh ref={(o) => { held.current.box = o }} position={[0, HELD_AT[1] + 0.04, HELD_AT[2]]} visible={false}>
        <boxGeometry args={[0.2, 0.06, 0.11]} />
        <meshToonMaterial color="#e9e3d4" />
      </mesh>
      {/* (a bin's bag by its knot in his hands, hanging below them; or the new one folded (item 208)) */}
      <group ref={(o) => { held.current.bag = o }} position={[0, HELD_AT[1] + 0.02, HELD_AT[2]]} visible={false}>
        <primitive object={bags.rubbish} />
        <primitive object={bags.recycle} />
        <primitive object={bags.fresh} />
      </group>
    </group>
  )
}
