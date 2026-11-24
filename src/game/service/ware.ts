// The tableware washed besides the plates (item 600, the owner's, 2026-11-23: 「洗碗流程要注意，我發現目前僅有盤子，但我還有飯碗、湯碗、筷子、
// 湯匙，這些也都是要清洗的。這部份流程要多加詳細」): a customer's rice bowl, their soup bowl and its renge, and their pair of chopsticks go round
// as the plates do (game/plates). Left at their place when they go; cleared onto the tray with their plate; into the sink (the bowls in its
// basin, the chopsticks and the renge into the soaking pot); into the washer under it with the plates (its bowls' rack, its cutlery basket:
// the draining basket's full width is the plates' comb, so the bowls and the cutlery are never washed by hand into it); washed and dried,
// back on a tray to the cabinets under the racks (the rice bowls behind the left doors, the soup bowls behind the right, the chopsticks in
// the left drawers, the renge in the right: game/tableware), where the kitchen takes a clean bowl each time it fills one and the floor a
// clean pair each time it lays a place again. A kind with none clean left holds up what needs it, and is washed first.
import { TABLEWARE } from './tableware'

export type WareKind = 'rice' | 'soup' | 'renge' | 'chops'
export const WARE_KINDS: readonly WareKind[] = ['rice', 'soup', 'renge', 'chops']
/** how many of each: rice bowls, soup bowls, renge, pairs of chopsticks */
export type Wares = Record<WareKind, number>
export const noWares = (): Wares => ({ rice: 0, soup: 0, renge: 0, chops: 0 })
/** everything the shop has of each (game/tableware) */
export const WARE_ALL: Readonly<Wares> = { rice: TABLEWARE.riceBowls, soup: TABLEWARE.soupBowls, renge: TABLEWARE.spoons, chops: TABLEWARE.chopsticks }
export const addWares = (a: Readonly<Wares>, b: Partial<Wares>): Wares =>
  ({ rice: a.rice + (b.rice ?? 0), soup: a.soup + (b.soup ?? 0), renge: a.renge + (b.renge ?? 0), chops: a.chops + (b.chops ?? 0) })
export const wareCount = (w: Partial<Wares>) => (w.rice ?? 0) + (w.soup ?? 0) + (w.renge ?? 0) + (w.chops ?? 0)
export const bowlCount = (w: Partial<Wares>) => (w.rice ?? 0) + (w.soup ?? 0)
export const cutleryCount = (w: Partial<Wares>) => (w.renge ?? 0) + (w.chops ?? 0)
/** all of them, wherever they are, added up (to see none's gone missing: it's always WARE_ALL) */
export const wareTotal = (...at: Partial<Wares>[]) => at.reduce<Wares>((s, w) => addWares(s, w), noWares())

/** the cabinets as a day starts: everything washed and put away, but for a clean pair laid at every place */
export const cabinetAtStart = (places: number): Wares => ({ ...WARE_ALL, chops: Math.max(0, WARE_ALL.chops - places) })

/** what a customer leaves at their place when they go: the bowls they were brought (the soup's with its renge in it), and their chopsticks
 * if they ate with them (one who walked out before anything came leaves theirs clean on the rest) */
export const leftBehind = (had: { rice: boolean; soup: boolean; ate: boolean }): Wares =>
  ({ rice: had.rice ? 1 : 0, soup: had.soup ? 1 : 0, renge: had.soup ? 1 : 0, chops: had.ate ? 1 : 0 })

/** whether the kitchen can fill a customer's rice now (a clean rice bowl in the cabinets), and their soup (a clean soup bowl and a renge) */
export const canFill = (cab: Readonly<Wares>) => ({ rice: cab.rice > 0, soup: cab.soup > 0 && cab.renge > 0 })
/** a bowl filled: the clean one out of the cabinets (the soup's renge with it) */
export const takeForFill = (cab: Readonly<Wares>, kind: 'rice' | 'soup'): Wares => kind === 'rice'
  ? { ...cab, rice: Math.max(0, cab.rice - 1) }
  : { ...cab, soup: Math.max(0, cab.soup - 1), renge: Math.max(0, cab.renge - 1) }
/** a place laid again once it's cleared and wiped: a clean pair out of the cabinets onto its rest; none clean, it's left bare (`laid` false)
 * till there is one */
export const layPlace = (cab: Readonly<Wares>) => (cab.chops > 0 ? { cab: { ...cab, chops: cab.chops - 1 }, laid: true } : { cab: { ...cab }, laid: false })

/** the kinds none of which is clean in the cabinets now: what needs them waits */
export const shortOf = (cab: Readonly<Wares>): WareKind[] => WARE_KINDS.filter((k) => cab[k] <= 0)
/** how few clean ones of a kind left in the cabinets count as running low: its washing comes first, before it runs out (a rackful of bowls
 * and their renge, a pair for every place). Waiting for none: all the rice bowls dumped in the sink came back in 67 s, the floor kept busy
 * and the washing put after it, the cabinets at 0 to 4 meanwhile (the Tester's, item 600) */
export const WARE_LOW: Readonly<Wares> = { rice: 4, soup: 4, renge: 4, chops: 8 }
export const lowOf = (cab: Readonly<Wares>): WareKind[] => WARE_KINDS.filter((k) => cab[k] <= WARE_LOW[k])
/** whether any of `where`'s is of a kind none of which is clean (what needs it waits on it: the dishes' server sees to it before carrying food) */
export const wareOut = (where: Partial<Wares>, cab: Readonly<Wares>) => shortOf(cab).some((k) => (where[k] ?? 0) > 0)
/** whether any of `where`'s is of a kind running low (washing it, taking it back, comes first) */
export const wareUrgent = (where: Partial<Wares>, cab: Readonly<Wares>) => lowOf(cab).some((k) => (where[k] ?? 0) > 0)
/** a customer's leftovers added to what's still at their place uncleared: their bowls and renge their own, but the place has the one pair of
 * chopsticks (one who sat at it uncleared ate with the pair already on the rest): never more than the one pair to be cleared from it */
export const leftAdded = (at: Readonly<Wares>, left: Readonly<Wares>): Wares => ({ ...addWares(at, left), chops: Math.min(1, at.chops + left.chops) })

/** the washer's rack for bowls besides its plates' (game/plates' DRYER_CAP), how many it holds; its cutlery basket takes all there are */
export const WASHER_BOWLS = 6
/** the sink's bowls are put in the washer by themselves once there are a rackful (or any of a kind run short); else with the plates, whenever
 * they go in (a load of four bowls started it and kept it busy: the plates after them were washed by hand, more slowly, the sink piled up) */
export const WARE_WASH_AT = WASHER_BOWLS
/** whether the sink's wares want washing now for their own sake: a batch of bowls, or any of a kind run short in the cabinets */
export const wareWashNow = (sink: Readonly<Wares>, cab: Readonly<Wares>) => bowlCount(sink) >= WARE_WASH_AT || wareUrgent(sink, cab)
/**
 * The next of the sink's wares into the washer (after its plates: game/plates' washOne), its door down: a bowl at a time while its bowls'
 * rack has room (a kind run short in the cabinets first, then the rice bowls, then the soup), then the soaking pot's chopsticks and renge
 * into its cutlery basket all at once. Nothing while it's washing, or has washed ones still in it (`running`: they come out first).
 */
export function wareIntoWasher(sink: Readonly<Wares>, washer: Readonly<Wares>, running: boolean, cab?: Readonly<Wares>):
  { sink: Wares; washer: Wares; moved: 'rice' | 'soup' | 'cutlery' | null } {
  const s = { ...sink }, w = { ...washer }
  if (running) return { sink: s, washer: w, moved: null }
  if (bowlCount(w) < WASHER_BOWLS) {
    const short = cab ? lowOf(cab) : []
    const order: ('rice' | 'soup')[] = short.includes('soup') && !short.includes('rice') ? ['soup', 'rice'] : ['rice', 'soup']
    for (const k of order) if (s[k] > 0) { s[k]--; w[k]++; return { sink: s, washer: w, moved: k } }
  }
  if (cutleryCount(s) > 0) {
    w.renge += s.renge; w.chops += s.chops
    s.renge = 0; s.chops = 0
    return { sink: s, washer: w, moved: 'cutlery' }
  }
  return { sink: s, washer: w, moved: null }
}
/** how many bowls one carries back to the cabinets at a time (two nested stacks on the tray); the chopsticks and the renge all go, a bundle */
export const CARRY_BOWLS = 8
/** a trip's worth of the washed ones out (of the washer): up to CARRY_BOWLS bowls, the rice bowls first, and all the cutlery */
export function wareTrip(from: Readonly<Wares>): { take: Wares; left: Wares } {
  const rice = Math.min(from.rice, CARRY_BOWLS), soup = Math.min(from.soup, CARRY_BOWLS - rice)
  const take = { rice, soup, renge: from.renge, chops: from.chops }
  return { take, left: { rice: from.rice - rice, soup: from.soup - soup, renge: 0, chops: 0 } }
}

/** what the sink says of its wares, pointed at (besides its plates): how many of each are waiting to be washed (none: nothing) */
export function sinkWareSays(sink: Readonly<Wares>, lang: 'zh' | 'ja' | 'en' = 'zh') {
  const n = WARE_NAMES[lang]
  const parts = WARE_KINDS.filter((k) => sink[k] > 0).map((k) => `${n[k]} ${sink[k]}`)
  return parts.join(lang === 'en' ? ', ' : '、')
}
export const WARE_NAMES: Record<'zh' | 'ja' | 'en', Record<WareKind, string>> = {
  zh: { rice: '飯碗', soup: '湯碗', renge: '湯匙', chops: '筷子' },
  ja: { rice: '飯茶碗', soup: '汁椀', renge: 'れんげ', chops: '箸' },
  en: { rice: 'rice bowls', soup: 'soup bowls', renge: 'renge', chops: 'chopsticks' },
}
