import { memo, useRef, useState, type RefObject } from 'react'
import type { Visit } from '@/game/reputation'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { type Chef } from '@/data/chefs'
import type { Lang } from '@/data/i18n'
import { Steam } from '@/scene/Steam'
import { sameProps } from '@/scene/sameProps'
import { ROAST_STAGES, type Roast, type Seasoning } from '@/data/menu'
import { type Entry } from '@/data/recipes'
import type { Step } from '@/game/types'
import type { GuestView } from '@/game/types'
import { BAMBOO_WARE, wareGeometry } from '@/shops/grill/ware'
import { type DrinkId } from '@/shops/grill/bar'
import { PLATE_R } from './tuning'
import { type CrewMember } from './kitchen'
import { wareOnce } from './tools'
import { type Looks, type Bites } from './pieceLook'

/** something on the table drawn only while `holds` says it holds something (a plate, a side dish: brought from the dish cabinet when it's
 * wanted), looked at every frame, drawn again only when that changes */
export function WhenHeld({ holds, children }: { holds: () => boolean; children: React.ReactNode }) {
  const [on, setOn] = useState(false)
  useFrame(() => { const h = holds(); if (h !== on) setOn(h) })
  return on ? <>{children}</> : null
}

export type Piece = {
  key: string
  /** the way it lay on its plate at the plating place (item 228): turned from that as its plate's set down before its customer */
  passQ?: THREE.Quaternion
  /** cooked for nobody (its customer gone) and kept warm in the big bowl for the next who orders one, never binned */
  keepWarm?: boolean
  /** its iron skewer (game/skewers): pushed through it on the board (when, performance.now()), pulled out as it's plated (when); none before
   * the one and after the other (the raw food from the fridge has none: the owner's) */
  skewerAt?: number
  pullAt?: number
  /** (item 317) its place on the open shop's tray by the fire while it waits there for its plate (its skewer drawn out there); lifted onto
   * its plate by the server's tongs (`tonged`: from then on it's that plate's, never back to the tray), in the tongs just now (`tong`) */
  trayAt?: number
  tonged?: boolean
  tong?: boolean
  /** where its rod's middle is (its own frame): laid on the board centred on it */
  stickMid?: THREE.Vector3
  /** its place round the fire (game/fireSlots' RING_AZ), while it stands there or is on its way to it; given up as it leaves */
  ringSlot?: number
  /** (on a plate) how far its lowest point is under its origin, in its parent's frame, for the way it was turned and sized when measured
   * (measured again only when it's turned or sized otherwise, item 258) */
  restDrop?: { q: THREE.Quaternion; s: number; drop: number; cx: number; cz: number }
  /** (on a plate) the face it rests on, in its parent's frame: the plate's own surface (or what it lies on, on the plate) under it, found
   * where it is (`at`) by a ray, again each second (`t`); none found, null (item 258); and how far it's rolled over about its length, from
   * what holds it up either side of it (item 271) */
  /** the face it rests on, measured (`t`, performance.now()) where it was (`x`, `z`: its spot, in thousandths, on `on`; on a server's tray
   * TRAY_SPOT instead) with what was under it then (`sig`, restSig's), and the height of its spot then (`base`: on a tray, the face is kept as a
   * height over the spot, which moves with the tray, the plate under it with it); what was under its middle (`mid`: on a tray measured again
   * alone every TRAY_REST_MS, the face moved as much as it did) */
  restFace?: { on: string | undefined; x: number; z: number; sig: number; t: number; face: number | null; roll: number; base: number; mid: number | null }
  /** a number of its own, for restSig */
  hid?: number
  id: string
  copy: number
  loose: boolean
  node: THREE.Object3D
  homeP: THREE.Vector3
  homeQ: THREE.Quaternion
  /** as authored, before any turn to face the camera (how it's laid flat on a plate) */
  homeQ0: THREE.Quaternion
  /** seconds spent over the fire */
  progress: number
  /** (item 473) how far its side toward the fire is ahead of the piece as a whole (of its roasting time; the other side as far behind);
   * whether it's been turned on its stick and how far through the turn it is (0..1); whether its fire side's been taken; whether it's
   * been done over the fire yet (its hiss and its wisp once) */
  lead: number
  turned: boolean
  turnT: number
  sideSet: boolean
  wasDone: boolean
  collected: boolean
  /** 0..1 along the flight to the plate */
  flight: number
  /** (served by a server) set out ready at the chef's plating place, or on its way: it goes on to the customer's plate when it's set down */
  via?: 'plated'
  /** (the owner tasting it: time since his last munch) */
  chewAt?: number
  /** which of the plating place's slots it's put out in */
  readyAt?: number
  /** drawn at the bar's size: it's been out at the plating place, so it doesn't grow back on the last hop */
  small?: boolean
  fromP: THREE.Vector3
  fromQ: THREE.Quaternion
  toP: THREE.Vector3
  toQ: THREE.Quaternion
  mats: { mat: THREE.MeshToonMaterial; mesh: THREE.Mesh; base: THREE.Color; emissive: THREE.Color; foil: boolean;
    show?: 'closed' | 'open'; eye?: boolean }[]
  /** in the basket: a simple rigid ball that falls in, rolls and settles against the others */
  body: { v: THREE.Vector3; r: number; live: boolean } | null
  /** how charred and how seasoned it is, shared by all of this piece's materials */
  looks: Looks
  /** the bites taken out of it so far */
  bites: Bites
  /** the bamboo skewer, and the food on it: eating takes the food and leaves the stick on the plate */
  sticks: THREE.Mesh[]
  food: THREE.Mesh[]
  /** meshes with a "Puffed" shape key (mochi swelling on the grill net) */
  puffs: THREE.Mesh[]
  /** eaten down to the bare stick, which stays on the plate until clicked away */
  stickOnly: boolean
  /** its food's ink lines as one (inkOneLine), and the parts it's the lines of: shown while they are */
  ink?: THREE.Mesh
  inkOf?: THREE.Mesh[]
  /** grill-net items: which spot on the net it has (null: waiting its turn, hidden and not cooking) */
  netSpot: number | null
  /** when the owner asked to taste it (performance.now()), the boss on his way to eat it; 0 if not */
  awaitBoss: number
  /** it's the boss eating it: carried from the bowl to his hand at his mouth */
  byBoss?: boolean
  /** once served: the plate, dish or basket it's on (plate-n, dish-n, basket-n), and where on it */
  container: string | null
  local: THREE.Vector3
  /** dabs of each seasoning (and splashes of water) it's had, for its 美味 */
  dabs: Record<Seasoning, number>
  /** each seasoning as it went on, and when (for its timing, and the recipe) */
  steps: Step[]
  /** ordered and waiting raw on the tray (carried or clicked onto the fire from there), and when it arrived */
  staged: boolean
  stagedAt: number
  /** just put out on the tray: it appears in its spot there rather than sliding in from where it stood on the fire */
  fresh: boolean
  /** ordered in the open shop and not yet brought to the board: still where it's kept, or in the chef's hands (CHEF_TRIP) */
  fetching?: boolean
  /** being prepared on the board till then (performance.now()): not yet to the fire */
  prepUntil?: number
  /** tended half way through its grilling (fanned, or its glaze): once */
  tended?: boolean
  /** was it on order last frame (a fresh order goes to the tray) */
  wasPresent: boolean
  /** 0 → 1 while moving from the tray onto the fire (1 once it's there) */
  homeFlight: number
  /** foil-roasted potatoes: unwrapped in the basket with a click, and 0 → 1 while the foil comes off */
  unwrapped: boolean
  unwrapT: number
  /** the AI chef has seen to its seasoning */
  chefSeasoned: boolean
  /** being carried by the pointer (a bare stick or something burnt, on its way to the bin) */
  carried: boolean
  /** 0 → 1 while dropping into the bin (−1 otherwise), and where it fell from */
  trash: number
  /** when it went into the tasting bowl (the bowl's oldest is eaten up to make room) */
  bowlAt?: number
  trashFrom: THREE.Vector3
  /** seconds since it landed on the plate or in the basket (it steams a little at first) */
  landed: number
  /** where it sits once collected: index into its plate run (or its pile); null while on the fire */
  slot: number | null
  /** 0 → 1 while being eaten off the plate; eaten pieces are gone until re-ordered */
  eat: number
  eaten: boolean
  /** (shop open) the customer it was served to, and their seat at the bar; -1 for none */
  guest: number
  seat: number
  /** (shop open) the dish on the menu it was ordered as: what goes on it, and its name */
  want: { dabs: string[]; name: string; ja?: string } | null
}

export type TagState = { stage: (typeof ROAST_STAGES)[number]['key']; label: string; pct: number }

export const stageOf = (r: number) => ROAST_STAGES.find((s) => r < s.until)!

/** Plate the roasted pieces are served onto: a shallow cream dish with a blue rim line and an ink outline. */
export const Plate = memo(PlateImpl, sameProps)
function PlateImpl({ position, container }: { position: [number, number, number]; container: string }) {
  const geometry = wareOnce('plate', () => {
    // profile drawn for a 0.5 radius plate, scaled up to PLATE_R
    const k = PLATE_R / 0.5
    return wareGeometry(([[0, 0], [0.32, 0], [0.4, 0.025], [0.47, 0.06], [0.5, 0.075], [0.49, 0.082], [0.44, 0.052],
      [0.3, 0.02], [0, 0.02]] as [number, number][]).map(([x, y]) => [x * k, y] as [number, number]), PLATE_R)
  })
  return (
    <group position={position} userData={{ container }}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshToonMaterial color="#ffffff" map={BAMBOO_WARE} />
      </mesh>
      <mesh geometry={geometry} scale={[1.025, 1.06, 1.025]}>
        <meshBasicMaterial color="#3b2a20" side={THREE.BackSide} />
      </mesh>
    </group>
  )
}

/** pieces that steam for a moment when they're served (hot fish, potatoes out of the foil) */
export const STEAMS = /^(Fish|ExtraFish|Saury|Mackerel|Potato|SweetPotato|NetMochi)$/
const WISP_SECONDS = 4.5

/** A little steam rising off food that's just been served, fading out after a few seconds. */
export function Wisp({ at, onDone }: { at: [number, number, number]; onDone: () => void }) {
  const level = useRef(1)
  const t = useRef(0)
  const done = useRef(false)
  useFrame((_, delta) => {
    t.current += delta
    level.current = Math.max(0, 1 - t.current / WISP_SECONDS) ** 1.5
    if (!done.current && t.current > WISP_SECONDS) {
      done.current = true
      onDone()
    }
  })
  return <Steam position={[at[0], at[1] + 0.04, at[2]]} layers={2} width={0.3} height={0.7} opacity={0.6} speed={0.1}
    level={level} />
}

export type RoastingProps = {
  url: string
  roast: Roast
  /** ids the menu controls; anything else listed in roast.times is always there (the base fish) */
  itemIds: string[]
  quantities: Record<string, number>
  /** only the dish on stage roasts and shows its tags */
  active: boolean
  instant?: boolean
  /** 0..1 the charcoal on the bed, read every frame (what's put on goes straight on it; it burns down, is fanned up, doused) */
  fire?: RefObject<number>
  /** 0..1 the fire's heat, rising to the bed as fresh charcoal catches (App's): food roasts faster on a hotter fire */
  heat?: RefObject<number>
  /** told how many pieces are off the fire (on a plate, in a pile or eaten), for the fire's capacity limit */
  onOffFire?: (count: number, loose: number) => void
  /** a piece has been eaten up (for 飽足) */
  onEat?: (id: string, taste: number, how?: { doneness?: number; dabs?: Record<string, number>; steps?: Step[] }) => void
  /** the player's best way with each food, from the tasting notes: the chef may cook to it */
  notes?: Record<string, { doneness?: number; dabs?: Record<string, number> }>
  /** something to tell the diner (it isn't cooked yet, it's burnt) */
  onNotice?: (what: 'notCooked' | 'burnt' | 'waste' | 'fireFull' | 'offTable' | 'heapFull' | 'needSkewer' | 'binBurnt') => void
  /** written every frame: how much smoke is coming off the fire (0..1), from food that's cooked and still on it */
  smoke?: RefObject<number>
  /** likewise for black smoke, from food left on until it burns */
  blackSmoke?: RefObject<number>
  /** AI simulation: a chef who works the grill and customers who order and eat */
  ai?: boolean
  /** the shop's shut and being worked by hand (see game/mode) */
  research?: boolean
  /** the AI customers order from the menu, and the chef adds charcoal, through the app */
  /** order something; false if it couldn't be (the fire or the basket is full) */
  /** `reuse`: made from a portion already put out and eaten (Roasting's revived it): paid for, but no new portion put out */
  onOrder?: (id: string, guest?: number, reuse?: boolean) => boolean
  onAddCharcoal?: (sticks?: number, byHand?: boolean, fromCrate?: boolean) => boolean
  /** something the chef or a customer says */
  onSay?: (who: 'chef' | 'guest', text: string, guest?: number) => void
  /** which table is out: the player's tasting (closed) or the shop's (open); each keeps its own food */
  space?: 'closed' | 'open'
  /** draw the bar (with the shop open) the food is served onto; a phone shows its customers in 2D, without it */
  bar?: boolean
  /** who's hired to help the owner (the head chef): a second chef, a sous chef */
  /** who's on the staff here (each drawn at their place while the shop is open) */
  crew?: CrewMember[]
  /** what's said is in this language, with these names for the food */
  lang?: Lang
  names?: Record<string, string>
  /** a customer walked out: what they'd ordered and not eaten (to be refunded) */
  /** (`why`: what sent them off, for the books' notes in development (item 329): the first dish too long in coming, the next, the shop
   * shutting, their time sat out, a takeaway not come) */
  onWalkOut?: (ids: string[], guest: number, why?: 'first' | 'next' | 'hurry' | 'stay' | 'takeout') => void
  /** a customer's visit, scored as they go (game/reputation): App keeps them for the shop's rating */
  onVisit?: (v: Visit) => void
  /** (shop open) what's on the menu, each dish's parts (a food and what goes on it); customers order from this */
  /** the menu as put out (its prices too: item 210, a dish dearer than it's worth passed over) */
  entries?: Entry[]
  /** a customer orders this dish off the menu: false if it can't be had (out of stock, the fire's full) */
  onOrderEntry?: (key: string, guest: number, reuse?: Record<string, number>, atTill?: boolean, warm?: Record<string, number>) => boolean
  /** how slowly customers come in (no cashier: fewer) */
  crowd?: number
  /** the omiki's been offered at the shrine: each customer orders a little more */
  blessed?: boolean
  /** (on a phone, with no 3D room) a waiting customer's had a drink from the fridge */
  onDrink?: (guest: number, drink: DrinkId) => void
  /** the shop is open: the chef works the grill, the player only watches */
  locked?: boolean
  /** who's at the grill in the AI simulation */
  chef?: Chef
  /** every AI customer so far: what they ordered, what they've eaten, how they rated it */
  onGuests?: (guests: GuestView[]) => void
}
