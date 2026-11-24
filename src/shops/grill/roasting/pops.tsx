import { memo, useEffect, useState } from 'react'
import { Html } from '@/scene/interact/Html'
import { BOARD_SLOTS } from '@/game/kitchen/fireSlots'
import { NO_POINTER, zr } from '@/scene/interact/htmlProps'
import { Wisp } from './piece'

/** the tray for raw food waiting to go on the fire: a row of sticks across it, side by side, BOARD_SLOTS of them (the owner's, 2026-11-10:
 * nine, five and four laid on top in the gaps, heaped up in a rush); loose food in a row along its back. It holds no more than that: the
 * rest wait in the fridge until there's room, brought out as the tray's cleared, and the second cook brings no more than there's room for */
// (ten (item 115): in two columns of five side by side across the board, none laid over another)
export const TRAY_ROWS = BOARD_SLOTS / 2
export const TRAY_CAP = BOARD_SLOTS
export const LOOSE_CAP = 7
/** how far apart the board's two columns are, along it */
export const TRAY_COL = 0.78
/** the rice balls waiting raw on their little dish at once (the rest in the fridge till there's room) */
export const RAW_DISH_CAP = 3
export const TRAY_W = 1.6
export const TRAY_D = 0.9
/** the seasoning box, as a round footprint for bumping into things */
export const BOX_R = 0.46
/** where the seasoning ledge (blender/grilledfish.py: its middle) is hung: on the hearth's front face, over the cook's place in the notch
 * (along as the notch's middle; out from the frame's face by half the ledge's depth) */
export const BOX_SPOT = { along: -0.04, lay: 1.222 + 0.1 }
/** the ledge's length, and the fan's peg at the end of the hook past its left end: how far along from the ledge's middle and how high above it
 * (blender/grilledfish.py: LEDGE_L, the hook's arm 0.2 past the end at 0.985 high, the ledge's middle at 0.19) */
export const LEDGE_L = 1.62
export const FAN_PEG = { along: -LEDGE_L / 2 + 0.045, up: 0.365 - 0.19 }
/** the fan hung on its peg: its paper's middle this far below the peg (its handle's length, 1.6 times its own, and the loop) */
export const FAN_DROP = -0.4
/** the containers that stay where they're set, whatever's beside them: the ledge, fixed to the hearth; the bucket and the trash bin (not
 * taken up by hand: the bucket's dipper is) */
export const FIXED = new Set(['box', 'bin', 'trash'])
/** and of those, what stands on the table's top, so what's put down there by hand is kept off it (the ledge is up over the cook's place, the
 * trash bin down on the floor); not what's set out for itself as the table's laid (each has its own place clear of it: pushed off it there,
 * the plate pushed the rice balls' dish along the table and it the side dish, out over its edge) */
export const FIXED_ON_TOP = new Set(['bin'])
/** how many of the floating 美味 words can be up at once, and where an unused place waits */
const POP_SLOTS = 8
const POP_AWAY: [number, number, number] = [0, -50, 0]
/** a word in one of the little floating words' places (Roasting's `pops`) */
type Pop = { id: number; at: [number, number, number]; text: string; good: boolean }
/**
 * One of the little floating words' places: drawn again only as its own word changes (item 374: all eight were drawn again with every
 * redraw of the kitchen, about 12 times a second at the shop's busiest, most of them empty, each a drei Html working its place out again)
 */
const PopWord = memo(function PopWord({ x }: { x: Pop | null }) {
  return (
    <Html position={x?.at ?? POP_AWAY} center zIndexRange={zr(36, 26)} style={NO_POINTER}>
      {/* (the word's own key: a new one starts its rise again) */}
      {x && <span key={x.id} className={`taste-pop${x.good ? '' : ' is-bad'}`}>{x.text}</span>}
    </Html>
  )
})
/**
 * The little floating words and the wisps of steam, each kept by a small component of its own that the kitchen feeds (`POP_FEED`,
 * `WISP_FEED`): kept in the kitchen's own state, every word and every wisp drew the whole kitchen again (item 374: 2.3 times a second at the
 * shop's busiest, the chef seasoning and plating, and everything under it not memoised with it)
 */
export const POP_FEED: { to: ((p: Pop) => void) | null } = { to: null }
type WispAt = { key: string; at: [number, number, number] }
export const WISP_FEED: { to: ((w: WispAt) => void) | null } = { to: null }
export const PopWords = memo(function PopWords() {
  const [pops, setPops] = useState<(Pop | null)[]>(() => Array(POP_SLOTS).fill(null))
  useEffect(() => {
    const timers = new Set<number>()
    POP_FEED.to = (p) => {
      setPops((all) => {
        // (the first free place, or the oldest's)
        let k = all.findIndex((x) => !x)
        if (k < 0) k = all.reduce((o, x, i) => (x!.id < all[o]!.id ? i : o), 0)
        const next = all.slice()
        next[k] = p
        return next
      })
      const t = window.setTimeout(() => { timers.delete(t); setPops((all) => (all.some((x) => x?.id === p.id) ? all.map((x) => (x?.id === p.id ? null : x)) : all)) }, 1500)
      timers.add(t)
    }
    return () => { POP_FEED.to = null; for (const t of timers) window.clearTimeout(t) }
  }, [])
  return <>{pops.map((x, k) => <PopWord key={k} x={x} />)}</>
})
export const Wisps = memo(function Wisps() {
  const [wisps, setWisps] = useState<WispAt[]>([])
  useEffect(() => {
    WISP_FEED.to = (w) => setWisps((all) => [...all.filter((x) => x.key !== w.key), w])
    return () => { WISP_FEED.to = null }
  }, [])
  return <>{wisps.map((w) => <Wisp key={w.key} at={w.at} onDone={() => setWisps((all) => all.filter((x) => x.key !== w.key))} />)}</>
})
