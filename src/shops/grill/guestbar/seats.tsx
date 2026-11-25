import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { newStepTurn } from '@/game/guests/genkanStep'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@/scene/interact/Html'
import * as THREE from 'three'
import { StaticBatch } from '@/scene/render/StaticBatch'
import { warmLater } from '@/scene/render/Prewarm'
import { STAND_SLOTS as UMB_SLOTS, coatOf, gearOf, newCoatPose, newUmbPose, umbrellaOf } from '@/game/guests/rainGear'
import { KASA_FLOOR, ROD_TIP, TIP_END, canopyScale, coatPictures, rainMats, rainWarmGroup, standCanopyColour, useKasa, type GearAt } from '@/scene/people/rainGear3D'
import { kindOf } from '@/data/guests'
import { folkSpec } from '@/scene/people/FolkFigure'
import { inkModel } from '@/scene/render/inkHull'
import { DrinkFridge, FridgeDoor, DrinkWarm } from '@/shops/grill/dining/fridge'
import { FridgeStock } from '@/shops/grill/dining/fridgeStock'
import { StoolModel } from '@/shops/grill/decor/BarFurnish'
import { Movable } from '@/shops/grill/editor/Movable'
import { dishLines } from '@/game/money/till'
import { SEAT_PULL, STOOL_TUCK, SHOE_CELLS, BENCH_SEATS, billOf, GUEST_BILLS, DRINKS, fridgesOf, type DrinkId, seatsOf } from '@/shops/grill/bar'
import { tick } from '@/scene/kit/speed'
import { PEOPLE_SCALE } from './staffPoses'
import { RAIN_NOW } from './shopFront'
import { SHOE_CUBBIES } from './genkan'
import { shoeKey } from '@/game/guests/shoes'
import { LABEL_STYLE, LABEL_Z } from './labels'

/** a stool pulled out and pushed in (the bar's frame): where its customer stops behind it, how far it's pulled out, how far they push it back
 * getting up; how long pulling it out, stepping onto it, sliding in (or home) take, and when, getting up, they push it home before they go */
export const STOOL_STAND = 0.42, STOOL_OUT = 0.25, STOOL_LEAVE = 0.22
/**
 * Where each stool's seat and each place on the waiting bench are as they've been moved by hand (edit mode): a marker hung in each, where it
 * was laid out (the owner's, 2026-11-10: a seat goes with its chair; moved, its customer sat where it had been). A customer near their own
 * stool is moved by as much as it has been (all of it within 0.4 of it, none from 1.2: the way to it bends to it); one on the bench sits
 * where the bench is
 */
export const SEAT_MARKS = new Map<number, THREE.Object3D>()
export const BENCH_MARKS = new Map<number, THREE.Object3D>()
export const SEAT_SHIFT = new THREE.Vector3()
export const BENCH_AT = Array.from({ length: BENCH_SEATS }, () => new THREE.Vector3())
export const BENCH_A = new THREE.Vector3(), BENCH_B = new THREE.Vector3()
export const STOOL_PULL_S = 0.25, STOOL_STEP_S = 0.3, STOOL_SLIDE_S = 0.4, STOOL_HOME_AT = 0.4
/** the way back from a place's stool toward the aisle (level) */
export const backOf = (st: { stool: THREE.Vector3; aisle: THREE.Vector3 }) => st.aisle.clone().sub(st.stool).setY(0).normalize()
export type Shown = { id: number; seat: number; phase: 'enter' | 'sit' | 'leave' | 'wcGo' | 'wcIn' | 'wcWash' | 'wcBack'; t: number
  /** (in a toilet) sat on it just now; whether they switched its light on going in (and so put it out after, if they're the last); their
   * way out from it to the washstand once they're up (and how far along it, in seconds walked) */
  wcSit?: boolean; wcLit?: boolean; wcOut?: { path: THREE.Vector3[]; len: number; t: number }
  /** past the toilet's door on the way in (its light's switch on the post between the two doors, outside: item 203) */
  wcPast?: boolean
  /** done eating, a tissue to their mouth a moment before they get up (the owner's): since when */
  wipeAt?: number
  /** their drink, sipped now and then as they sit (the bar's clock): when this sip began (none under way: undefined), when the next is
   * due; how much of it's gone (0 to 1) */
  sipAt?: number; sipNext?: number; drunk?: number
  /** (a mouthful of their miso soup under way since (the bar's clock), and when the next is due (item 345)) */
  soupSipAt?: number; soupNext?: number
  /** how many drinks they've had from the fridge (item 210: another when one's drunk, up to DRINKS_MAX) */
  drinks?: number
  /** at their stool: seconds into pulling it out and stepping up onto it (coming in), into sliding in with it (sat) */
  pullT?: number; slideT?: number; pulledSound?: boolean
  /** called to their stool off the genkan's bench: where they sat, and their way in from there */
  from?: THREE.Vector3
  fromWay?: { path: THREE.Vector3[]; len: number }
  /** their shoes in a cubby of the cupboard; welcomed in */
  shoesIn?: boolean; welcomed?: boolean
  /** (leaving) how long they've stood in the queue for the till, or for the genkan's step; what's been said on the way out (getting up,
   * paying, thanks) */
  hold?: number; said?: number
  /** (coming in) how long they've waited for the genkan's step, someone else on it (item 414) */
  stepHold?: number
  /** how far along their way they'd come last frame, and whether they've stood still since (a pause: shoes, paying, getting up) */
  lastD?: number; still?: boolean
  /** (off to the toilet, or to the fridge for a drink) where, and the way there from their stool; told to go home
   * meanwhile, they do once they're back */
  wc?: { who: 'm' | 'f' | 'drink'; path: THREE.Vector3[]; len: number; unit?: number; pick?: DrinkId }
  /** what they've fetched from the fridge, stood by their plate */
  drink?: DrinkId
  leaving?: boolean
  /** what they've ordered, for their bill at the till on the way out */
  items?: number
  /** how much of them shows (fading out as they go out of the door) */
  fade?: number
  /** going out of the door: how long (s) they've been fading */
  fadeT?: number
  /** (item 623, part three) what they came in with against the rain (decided as they're put in, by the weather then), its colours; their
   * umbrella's place in the stand by the shoe cupboard (-1 none yet) and whether it stands there; their raincoat off (folded, with them);
   * going out, how long they've been out past the door with it (s) and whether it's raining as they take it out; what their figure's told of
   * it each frame */
  gear?: 'umbrella' | 'coat' | null; umbC?: number; coatC?: number; umbSlot?: number; umbIn?: boolean; coatOff?: boolean
  outT?: number; outWet?: boolean; gearAt?: GearAt
  /** (item 700) going out, whether they'll take their umbrella out of the stand at the stop just in from the door: fixed as they set off */
  umbLeave?: boolean
  /** (item 623) going out, whether they'll put their raincoat on at the step: fixed as they set off */
  coatLeave?: boolean
  /** (item 623) the last of their door moment's sounds played (closed, shaken; taken out, opened), so each plays once */
  umbSaid?: number
  /** in the house's slippers (inside, past the genkan's step), or their own shoes */
  slippers?: boolean
  /** the height they were last shown at (item 410: eased up and down the sliding door's steps) */
  shownY?: number }
/** how long they stand at the genkan's step changing their shoes */
export const SHOES_S = 1.2
/** (item 410) how long one coming stands on the step at the sliding door while it's slid open (game/slideDoor: it's wanted open DOOR_SEEN_S
 * after they show out there, and open in DOOR_OPEN_S; a beat more); one going, just in from it as they slide it */
export const DOOR_WAIT_S = 0.9, DOOR_SLIDE_S = 0.35
/** how fast a customer's height may change (a second, the bar's units): a step's 0.13 in a little over a tenth of a second (item 410) */
export const STEP_Y_RATE = 1.2
/** (their shoes go into the cupboard now: none left out on the genkan's stones) */
export const NO_SHOES: { at: THREE.Vector3; turn: number; colour: string }[] = []
/** the money a customer's just paid, over their head: rising a hand's width and fading in 1.6 s, following them */
export function PayFloat({ text, follow, done }: { text: string; follow: () => THREE.Object3D | undefined; done: () => void }) {
  const g = useRef<THREE.Group>(null)
  const t = useRef(0)
  const at = useMemo(() => new THREE.Vector3(), [])
  useFrame((_, dt) => {
    const o = g.current, who = follow()
    t.current += tick(dt)
    if (t.current > 1.6) { done(); return }
    if (!o || !who || !o.parent) return
    o.position.copy(o.parent.worldToLocal(who.getWorldPosition(at))).add(new THREE.Vector3(0, 0.62 + t.current * 0.12, 0))
  })
  return (
    <group ref={g}>
      <Html center zIndexRange={LABEL_Z} style={LABEL_STYLE}><span className="pay-float">{text}</span></Html>
    </group>
  )
}
/** how long they stand at the till paying: the bill rung up, the drawer out and in, the change given */
export const PAY_S = 5.6
/** how far back the next one waits while someone's paying */
export const QUEUE_GAP = 0.6
/** the genkan's step, one at a time changing their shoes, the next a body's length (QUEUE_GAP) back till they've stepped on (item 414:
 * game/genkanStep) */
export const STEP_TURN = newStepTurn()
/** what one paying at the till is rung up for, a line a dish and then their drink (item 182: at the menu's prices, as App's books have it;
 * the old flat price only for one whose bill isn't known; item 195: as their bill stands, less what was given back for what they didn't
 * get, and the drink on it) */
export function billFor(x: { id: number; items?: number; drink?: DrinkId }) {
  const n = Math.max(1, x.items ?? 2), owed = GUEST_BILLS.of(x.id)
  const each = owed ? dishLines(owed.paid, n) : Array.from({ length: n }, () => billOf(1))
  const drink = owed ? owed.drink ?? 0 : x.drink ? (DRINKS.find((d) => d.id === x.drink)?.price ?? billOf(1, x.drink) - billOf(1)) : 0
  // (and a line each side: the miso soup or the sake with their dishes, item 203)
  const sides = owed?.side?.map((q) => q.price) ?? []
  const parts = drink ? [...each, ...sides, drink] : [...each, ...sides]
  return { parts, items: each.length, bill: parts.reduce((a, b) => a + b, 0) }
}
/** a server's errands, for which their tray's put down (item 249): sweeping up and wiping the floor, the till, the takeaway's bag, the skewers,
 * washing up and their hands at the sink. The rest (fetching what's plated, carrying it, setting it down, clearing, the dried plates, the sake)
 * is carried on it, and at their place they hold it */
export const TRAY_ERRANDS = new Set(['washGo', 'wash', 'handGo', 'handwash', 'toBox', 'boxTake', 'toTill', 'hand', 'toStand', 'standPut', 'skTrayGo', 'skTake',
  'skSinkGo', 'skWash', 'skHolderGo', 'skPut', 'tillGo', 'tillAt', 'sweepGo', 'sweep', 'wipeFloor'])
/** figures placed where they are at least once since they were put in the scene (till then hidden, item 242) */
export const placedOnce = new WeakSet<THREE.Object3D>()
/** a walk that stops a while at a point along it: how far along, at a time when it would have been `d` */
export const withPause = (d: number, at: number, hold: number) => (d < at ? d : d < at + hold ? at : d - hold)
/**
 * A customer's moment at the genkan's step (`f` 0..1 through it; outside it, nothing): turned to the shoe cupboard, a little bow; their
 * cubby (by their seat) opened a moment, their shoes put in it coming in (`entering`), taken out of it going
 */
// ---- (item 623, part three; the owner's 「進來的客人會穿雨衣或帶雨傘」) the rain's things: an umbrella closed and shaken out at the door and
// stood in the stand just inside it, taken out there going and opened out past the door; a raincoat taken off at the genkan's step and
// folded, carried to the stool and set down by it, put on again going. game/rainGear's rules and beats, scene/rainGear3D's shapes and
// materials.
/** where the stand stands (the doorway's frame, look-door's: x along the front, + toward the north wall, z out to the street): in the
 * genkan, in the corner between the shoe cupboard's door end and the front wall (item 700, the owner's 「傘架請放在鞋櫃旁」; it stood out on
 * the second stone step before the fixed leaf), clear of the north wall (x 0.498) by 1.3 cm, of the cupboard's end (z 0.089) by 4.7, of the
 * door's frame (z 0.338) by 5.4, its foot on the stones' highest (domed, -0.090 to -0.093 there) */
export const KASA_AT: [number, number, number] = [0.411, -0.0905, 0.21]
/** the stand's places (its own frame, its foot's middle): six round the jar's inside leant out a little, three nearer its middle leant less,
 * their points on its floor (item 700: in the corner, walls on two sides and the way in on the third, none leant against its outside as on
 * the step: a full stand's handles spread over its mouth, as one's are): each its rod's and its furled canopy's placing, and where its grip
 * is (the hand's place putting it in or taking it out) */
const SLOT = (() => {
  const Y = new THREE.Vector3(0, 1, 0), ONE = new THREE.Vector3(1, 1, 1), furl = canopyScale(0, new THREE.Vector3())
  const rod: THREE.Matrix4[] = [], canopy: THREE.Matrix4[] = [], grip: THREE.Vector3[] = []
  const add = (point: THREE.Vector3, up: THREE.Vector3, twist: number) => {
    // (the rod's +y runs from the grip down to the point: its grip TIP_END up the umbrella from its point)
    const g = point.clone().addScaledVector(up, TIP_END)
    const q = new THREE.Quaternion().setFromUnitVectors(Y, up.clone().negate()).multiply(new THREE.Quaternion().setFromAxisAngle(Y, twist))
    rod.push(new THREE.Matrix4().compose(g, q, ONE))
    canopy.push(new THREE.Matrix4().compose(g.clone().addScaledVector(up, -ROD_TIP), q, furl))
    grip.push(g)
  }
  // (round the inside: at the rim 0.048 out, within its 0.066; their furled canopies, 0.02 across, clear of each other above it)
  for (let k = 0; k < 6; k++) {
    const a = 0.3 + (2 * Math.PI * k) / 6, lean = 0.11
    add(new THREE.Vector3(0.024 * Math.cos(a), KASA_FLOOR, 0.024 * Math.sin(a)), new THREE.Vector3(Math.sin(lean) * Math.cos(a), Math.cos(lean), Math.sin(lean) * Math.sin(a)), a + Math.PI)
  }
  // (and nearer the middle, between the ring's: the last to be filled)
  for (let k = 0; k < 3; k++) {
    const a = 0.3 + Math.PI / 6 + (2 * Math.PI * k) / 3, lean = 0.04
    add(new THREE.Vector3(0.008 * Math.cos(a), KASA_FLOOR, 0.008 * Math.sin(a)), new THREE.Vector3(Math.sin(lean) * Math.cos(a), Math.cos(lean), Math.sin(lean) * Math.sin(a)), a + 1.2)
  }
  return { rod, canopy, grip }
})()
/** what's in the stand (each place's umbrella's colour, -1 none: the customers' own, worked out again each frame from those in), its own
 * frame in the world (the stand's, each frame), and how many times what's in it has changed */
export const UMB_STAND = { colours: new Int8Array(UMB_SLOTS).fill(-1), now: new Int8Array(UMB_SLOTS), ver: 0, frame: new THREE.Matrix4(), ready: false }
/** a place's grip in the world (the stand drawn: its frame known) */
if (import.meta.env?.DEV && typeof window !== 'undefined') Object.assign(window, { __umbStand: UMB_STAND })
export const standGrip = (slot: number, out: THREE.Vector3) => out.copy(SLOT.grip[Math.max(0, Math.min(UMB_SLOTS - 1, slot))]).applyMatrix4(UMB_STAND.frame)
/** what a customer brings in against the rain, as they're put in (none for one called off the bench: they came in before) */
export function gearFor(id: number): Pick<Shown, 'gear' | 'umbC' | 'coatC' | 'umbSlot'> {
  const g = gearOf(id, RAIN_NOW.k, folkSpec(id).briefcase)
  return g ? { gear: g, umbC: umbrellaOf(id), coatC: coatOf(id, kindOf(id).kind === 'kid'), umbSlot: -1 } : {}
}
/** a customer's rain things for their figure this frame, written over (made once each) */
export const gearAtOf = (s: Shown) => (s.gearAt ??= { umb: -1, pose: newUmbPose(), standAt: null, coat: -1, worn: false, coatPose: null, bundle: 0 })
export const COAT_POSE = new Map<number, ReturnType<typeof newCoatPose>>()
export const GEAR_P = new THREE.Vector3(), GEAR_Q = new THREE.Vector3()
/**
 * The umbrella stand in the genkan by the shoe cupboard (blender/kasatate.py's KasaStand, a Shigaraki jar in namako blue) and the umbrellas
 * stood in it: one set of instances for their furled canopies (each its own colour) and one for their rods, as many as stand there; all of it
 * there from the shop's load (the stand empty on a dry day, as shops leave theirs out), its programs warmed then; nothing of it casts a
 * shadow.
 */
export const KasaStand = memo(function KasaStand() {
  const kasa = useKasa()
  const jar = useRef<THREE.Group>(null)
  const parts = useMemo(() => {
    const m = rainMats()
    const canopies = new THREE.InstancedMesh(kasa.canopy, m.standCanopy, UMB_SLOTS), rods = new THREE.InstancedMesh(kasa.rod, m.rod, UMB_SLOTS)
    const c = new THREE.Color('#ffffff')
    for (let i = 0; i < UMB_SLOTS; i++) { canopies.setColorAt(i, c); canopies.setMatrixAt(i, SLOT.canopy[i]); rods.setMatrixAt(i, SLOT.rod[i]) }
    canopies.count = 0; rods.count = 0
    for (const x of [canopies, rods]) { x.castShadow = false; x.frustumCulled = false }
    return { canopies, rods }
  }, [kasa])
  useEffect(() => () => { parts.canopies.dispose(); parts.rods.dispose() }, [parts])
  useEffect(() => { if (jar.current) inkModel(jar.current) }, [])
  const seen = useRef(-1)
  const col = useMemo(() => new THREE.Color(), [])
  useFrame(() => {
    const j = jar.current
    if (!j) return
    j.updateWorldMatrix(true, false)
    UMB_STAND.frame.copy(j.matrixWorld)
    UMB_STAND.ready = true
    if (seen.current === UMB_STAND.ver) return
    seen.current = UMB_STAND.ver
    // (the umbrellas in it, each at its place in its colour)
    let n = 0
    for (let i = 0; i < UMB_SLOTS; i++) {
      const c = UMB_STAND.colours[i]
      if (c < 0) continue
      parts.canopies.setMatrixAt(n, SLOT.canopy[i]); parts.rods.setMatrixAt(n, SLOT.rod[i])
      parts.canopies.setColorAt(n, standCanopyColour(c, col))
      n++
    }
    parts.canopies.count = n; parts.rods.count = n
    parts.canopies.instanceMatrix.needsUpdate = true; parts.rods.instanceMatrix.needsUpdate = true
    if (parts.canopies.instanceColor) parts.canopies.instanceColor.needsUpdate = true
  })
  return (
    <group ref={jar}>
      <mesh geometry={kasa.stand} material={rainMats().stand} />
      <primitive object={parts.canopies} />
      <primitive object={parts.rods} />
    </group>
  )
})
/** the rain things' programs made as the shop loads (scene/Prewarm), and the raincoats' pictures sent to the card: never while it's open */
export function RainGearWarm() {
  const kasa = useKasa()
  const gl = useThree((st) => st.gl)
  useEffect(() => {
    warmLater(rainWarmGroup(kasa))
    for (const t of coatPictures() ?? []) gl.initTexture(t)
  }, [kasa, gl])
  return null
}

export function shoeStep(s: Shown, g: THREE.Object3D | undefined, f: number, entering: boolean) {
  if (!g) return
  if (f < 0 || f > 1) { g.rotation.x = 0; return }
  const cell = s.seat % SHOE_CUBBIES
  if (SHOE_CELLS.ready && g.parent) {
    const at = g.parent.worldToLocal(SHOE_CELLS.at.clone())
    g.rotation.y = Math.atan2(at.x - g.position.x, at.z - g.position.z)
  }
  g.rotation.x = 0.16 * Math.sin(Math.PI * f)
  // (its door open while they're at it, shut a moment after)
  if (f > 0.12 && f < 0.85) SHOE_CELLS.kick.set(cell, performance.now())
  if (f > 0.55 && entering && !s.shoesIn) { s.shoesIn = true; SHOE_CELLS.shoes.set(cell, shoeKey(s.id)) }
  if (f > 0.55 && !entering && s.shoesIn !== false) { s.shoesIn = false; SHOE_CELLS.shoes.delete(cell) }
}
/** what's set at a customer's place (their soy, their drink) and their shoes left in the genkan: shared shapes */
/** the miso soup's bowl at a customer's place: how tall */
const SOUP_BOWL_H = 0.045
const NO_SOUPS: THREE.Vector3[] = []
const AT_SEAT = {
  soy: new THREE.CircleGeometry(0.03, 16),
  daikon: new THREE.SphereGeometry(0.011, 8, 6),
  shoe: new THREE.SphereGeometry(1, 8, 6),
  // (a lacquered soup bowl, its foot ring narrower, open at the top, and the miso soup in it)
  // (open at its top, its inside drawn too: closed, its lid hid the soup)
  bowl: new THREE.CylinderGeometry(0.048, 0.03, SOUP_BOWL_H, 16, 1, true).translate(0, SOUP_BOWL_H / 2, 0),
  broth: new THREE.CircleGeometry(0.045, 16),
}
/** how many of each SeatBits holds at most */
const BITS_MAX = 24
const BIT_MATS = {
  shoe: new THREE.MeshToonMaterial({ color: '#ffffff' }),
  soy: new THREE.MeshToonMaterial({ color: '#3a1c0c' }),
  daikon: new THREE.MeshToonMaterial({ color: '#f2efe4' }),
  bowl: new THREE.MeshToonMaterial({ color: '#7a1a14', side: THREE.DoubleSide }),
  broth: new THREE.MeshToonMaterial({ color: '#b07a3a' }),
}
const BIT_M = new THREE.Matrix4(), BIT_N = new THREE.Matrix4(), BIT_Q = new THREE.Quaternion(), BIT_C = new THREE.Color()
const BIT_ID = new THREE.Quaternion()
const BIT_UP = new THREE.Vector3(0, 1, 0), BIT_X = new THREE.Vector3(1, 0, 0), BIT_P = new THREE.Vector3(), BIT_S = new THREE.Vector3()
/**
 * The customers' little things, each kind one draw for all of them (they were two meshes a customer, a draw each: some thirty a frame with
 * the bar full): the pairs of shoes left on the genkan's stone, and the soy in the dish at each seated customer's place with its dab of
 * daikon. Laid out as they were, each the shape and colour it had.
 */
export const SeatBits = memo(function SeatBits({ shoes, soys, soups = NO_SOUPS }: { shoes: { at: THREE.Vector3; turn: number; colour: string }[]; soys: THREE.Vector3[]; soups?: THREE.Vector3[] }) {
  const shoe = useRef<THREE.InstancedMesh>(null), soy = useRef<THREE.InstancedMesh>(null), daikon = useRef<THREE.InstancedMesh>(null)
  const bowl = useRef<THREE.InstancedMesh>(null), broth = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const a = bowl.current, b = broth.current
    if (!a || !b) return
    const n = Math.min(BITS_MAX, soups.length)
    for (let i = 0; i < n; i++) {
      a.setMatrixAt(i, BIT_M.compose(soups[i], BIT_ID, BIT_S.set(1, 1, 1)))
      b.setMatrixAt(i, BIT_M.compose(BIT_P.copy(soups[i]).setY(soups[i].y + SOUP_BOWL_H - 0.008), BIT_Q.setFromAxisAngle(BIT_X, -Math.PI / 2), BIT_S.set(1, 1, 1)))
    }
    a.count = n; b.count = n
    a.instanceMatrix.needsUpdate = true; b.instanceMatrix.needsUpdate = true
  }, [soups])
  useLayoutEffect(() => {
    const m = shoe.current
    if (!m) return
    // (its colours there from the first, the empty shop: made with the first pair, the program it was warmed with as the shop loaded wasn't
    // the one it then wanted, a hitch as the first customer came in)
    if (!m.instanceColor) m.setColorAt(0, BIT_C.set('#000000'))
    let n = 0
    for (const sh of shoes) {
      BIT_M.compose(sh.at, BIT_Q.setFromAxisAngle(BIT_UP, sh.turn), BIT_S.set(1, 1, 1))
      for (const sd of [-1, 1]) {
        if (n >= BITS_MAX) break
        BIT_N.compose(BIT_P.set(sd * 0.028, 0.018, 0), BIT_ID, BIT_S.set(0.025, 0.018, 0.06)).premultiply(BIT_M)
        m.setMatrixAt(n, BIT_N)
        m.setColorAt(n, BIT_C.set(sh.colour))
        n++
      }
    }
    m.count = n
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [shoes])
  useLayoutEffect(() => {
    const a = soy.current, b = daikon.current
    if (!a || !b) return
    const n = Math.min(BITS_MAX, soys.length)
    for (let i = 0; i < n; i++) {
      a.setMatrixAt(i, BIT_M.compose(soys[i], BIT_Q.setFromAxisAngle(BIT_X, -Math.PI / 2), BIT_S.set(1, 1, 1)))
      b.setMatrixAt(i, BIT_M.compose(BIT_P.copy(soys[i]).add(BIT_S.set(0.008, 0.004, 0.004)), BIT_ID, BIT_S.set(1, 0.5, 1)))
    }
    a.count = n; b.count = n
    a.instanceMatrix.needsUpdate = true; b.instanceMatrix.needsUpdate = true
  }, [soys])
  // (never culled as a whole: their bounds would be the first few's)
  return (
    <>
      <instancedMesh ref={shoe} args={[AT_SEAT.shoe, BIT_MATS.shoe, BITS_MAX]} count={0} frustumCulled={false} />
      <instancedMesh ref={soy} args={[AT_SEAT.soy, BIT_MATS.soy, BITS_MAX]} count={0} frustumCulled={false} />
      <instancedMesh ref={daikon} args={[AT_SEAT.daikon, BIT_MATS.daikon, BITS_MAX]} count={0} frustumCulled={false} />
      <instancedMesh ref={bowl} args={[AT_SEAT.bowl, BIT_MATS.bowl, BITS_MAX]} count={0} frustumCulled={false} castShadow />
      <instancedMesh ref={broth} args={[AT_SEAT.broth, BIT_MATS.broth, BITS_MAX]} count={0} frustumCulled={false} />
    </>
  )
})

/** the drinks fridges, each its own piece for edit mode: drawn again only if they move */
export const Fridges = memo(function Fridges({ fridges }: { fridges: NonNullable<ReturnType<typeof fridgesOf>> }) {
  return (
    <>
      {fridges.map((f) => (
        <Movable key={f.n} id={`drinkfridge${f.n}`} label={`飲料櫃 ${f.n + 1}`}><group name={f.n ? 'look-fridge-b' : 'look-fridge'} position={f.at} rotation-y={f.yaw}><DrinkFridge n={f.n} /><FridgeStock n={f.n} /><FridgeDoor n={f.n} />{f.n === 0 && <DrinkWarm />}</group></Movable>
      ))}
    </>
  )
})

/** the stools, each its own piece for edit mode: drawn again only if the seats change */
export const Stools = memo(function Stools({ seats }: { seats: ReturnType<typeof seatsOf> }) {
  // (each stool where it's been pulled out to, back toward the aisle (SEAT_PULL): its customer pulling it out and sliding in with it)
  const pulls = useRef<(THREE.Group | null)[]>([])
  useFrame(() => {
    seats.forEach((st, n) => {
      const o = pulls.current[n]
      if (!o) return
      const k = SEAT_PULL.get(n) ?? -STOOL_TUCK
      const b = backOf(st)
      if (Math.abs(o.position.x - b.x * k) > 1e-5 || Math.abs(o.position.z - b.z * k) > 1e-5) o.position.set(b.x * k, 0, b.z * k)
    })
  })
  return (
    <>
      {/* (each stool its own Movable, so each can be moved, turned and made larger or smaller by hand when the shop's shut; its customer sits on it
          where it's been moved to (SEAT_MARKS)) */}
      {seats.map((st, n) => (
        <Movable key={`${seats.length}-${n}`} id={`stool${n}`} label={`座位 ${n + 1}`}>
          <group ref={(o) => { pulls.current[n] = o }}>
          <StaticBatch plain>
            <group position={st.stool} rotation-y={st.yaw} scale={PEOPLE_SCALE}><StoolModel red={n % 2 === 1} /></group>
          </StaticBatch>
          </group>
          <group name={`stool-seat-${n}`} position={st.stool} userData={{ marker: true }} ref={(o) => { if (o) SEAT_MARKS.set(n, o); else SEAT_MARKS.delete(n) }} />
        </Movable>
      ))}
    </>
  )
})
