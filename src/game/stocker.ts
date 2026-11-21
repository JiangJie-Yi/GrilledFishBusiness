// The stock keeper's (倉儲) round on the floor (the owner's: they order in and restock, the bar's tissues and the toilets' paper too, and
// walk to do it): what they see to next, and which drinks they order a case of.
import type { BinKind } from './bins'
import { CASE_SIZE } from './drinkStock'

/** a toilet's roll is changed once it's down to this much of a roll (of 1) */
export const ROLL_LOW = 0.25
/** a place's box of tissues is changed once it's down to this many sheets */
export const BOX_LOW = 30
/** a fridge is gone to once this many of its places could be filled from the back */
export const FRIDGE_SHORT = 3

export type StockChore = { kind: 'roll'; who: 'm' | 'f' } | { kind: 'drinks'; unit: number } | { kind: 'tissue'; seat: number }
  | { kind: 'bin'; which: BinKind } | null

/**
 * What the stock keeper sees to next: a toilet's roll running out first (a customer finding it bare minds that most), while nobody's using
 * that toilet; then a fridge short of three or more that the back can fill (of those, the one with the most drinks gone from its shelves,
 * then the shortest: item 541); then a washroom's paper towels or hand soap low (the same trip as a roll's: in, topped up from the
 * spares); then a place's tissues running low (the emptiest first), while nobody sits there and there's a spare box; else nothing.
 * `fridgeShort`: how many of each fridge's drinks the back could fill. A bin by the sink full enough to empty (game/bins' binToEmpty,
 * `bin`) comes after a roll and before the drinks (item 208: its bag tied up and carried out, a new one put in).
 */
export function stockerChore({ rolls, wcBusy, fridgeShort, fridgeGaps, boxes, seatTaken, spares, rollSpares = Infinity, wcLow, bin = null }: {
  rolls: { m: number; f: number }; wcBusy: { m: boolean; f: boolean }; fridgeShort: number[]; boxes: number[]; seatTaken: (n: number) => boolean
  /** each fridge's places standing empty that the back could fill (game/drinkStock's emptyGaps): none counted, the shortest goes first */
  fridgeGaps?: number[]
  spares: number
  /** spare toilet rolls in stock (game/washroom): none, no roll changed */
  rollSpares?: number
  /** each washroom's paper towels or hand soap down to where they're topped up, with a spare in stock for it (game/washroom) */
  wcLow?: { m: boolean; f: boolean }
  /** the bin by the sink that wants emptying (game/bins' binToEmpty), if any */
  bin?: BinKind | null
}): StockChore {
  if (rollSpares > 0) for (const who of ['m', 'f'] as const) if (rolls[who] < ROLL_LOW && !wcBusy[who]) return { kind: 'roll', who }
  if (bin) return { kind: 'bin', which: bin }
  // (the fridge with the most drinks gone from its shelves first (a customer can't have them at all; one with some left still sells), then
  // the shorter, then the first (item 541: the first was taken whenever it was three short, so the second waited while the first wanted
  // filling, eight a trip: a new shop's beer and sake fridge stood empty its first three minutes and more, 340 of them in the back))
  let unit = -1
  const gaps = (i: number) => fridgeGaps?.[i] ?? 0
  fridgeShort.forEach((n, i) => {
    if (n < FRIDGE_SHORT) return
    if (unit < 0 || gaps(i) > gaps(unit) || (gaps(i) === gaps(unit) && n > fridgeShort[unit])) unit = i
  })
  if (unit >= 0) return { kind: 'drinks', unit }
  if (wcLow) for (const who of ['m', 'f'] as const) if (wcLow[who] && !wcBusy[who]) return { kind: 'roll', who }
  if (spares > 0) {
    let best = -1
    boxes.forEach((n, i) => { if (n < BOX_LOW && !seatTaken(i) && (best < 0 || n < boxes[best])) best = i })
    if (best >= 0) return { kind: 'tissue', seat: best }
  }
  return null
}

/** the drinks (of those the fridges are stocked with) a case of is ordered in: those the back, with what's on its way, is down to under a
 * case of (half a case once, when it came the moment it was bought; it takes the liquor shop DELIVERY_MIN to bring it now, item 243) */
export const drinksToOrder = (back: Record<string, number>, ids: string[], coming: readonly { id: string }[] = []) =>
  [...new Set(ids)].filter((id) => (back[id] ?? 0) + coming.filter((d) => d.id === id).length * (CASE_SIZE[id] ?? 24) < (CASE_SIZE[id] ?? 24))
