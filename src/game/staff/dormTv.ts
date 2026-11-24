// The television upstairs (items 612, 613, the owner's, 2026-11-24: 「二樓有人的時候可以開電視，或是人物在玩switch」「電視大台點，可以互動」).
// Pure rules; shops/grill/DormRoom draws the set, what's on it and those watching it.
//
// - What each of those living in does with their time up there, awake and settled on their cushion: a spell at the television, a spell at
//   their handheld game, a spell at the table with their tea; PASTIME_MIN of the clock's minutes at a time, by them and the spell (the same
//   however often it's asked: going down the stair and back up changes nothing).
// - The set's on while one of them wants to watch it, off while none does (nobody up there, all asleep, all at their games or their tea).
// - The player can switch it on or off and change its channel; their switch holds until the room's own wish for it turns the other way
//   (someone sits down to watch, the last of them goes to bed): then the room has its way again.
// - With it on, those at the table watch too; with it off (the player's doing), whoever wanted to watch has their handheld out instead.
import { unit } from './commute'

export type Pastime = 'tv' | 'handheld' | 'table'
/** what one of them settled on their cushion is doing just now */
export type Upstairs = 'watch' | 'handheld' | 'table'
/** a spell's length, in the clock's minutes */
export const PASTIME_MIN = 40
/** the channels the set gets */
export const TV_CHANNELS = 5
/** how their spells fall, by and large: the television most, the handheld next, the table least */
const SHARE: readonly (readonly [Pastime, number])[] = [['tv', 0.45], ['handheld', 0.35], ['table', 0.2]]

/** what they'd do with this spell (`minutes`: the clock's minutes from day 0, ui/clockStore's minutesNow) */
export function pastimeOf(id: string, minutes: number): Pastime {
  const r = unit(id, `pastime${Math.floor(minutes / PASTIME_MIN)}`)
  let upTo = 0
  for (const [p, share] of SHARE) {
    upTo += share
    if (r < upTo) return p
  }
  return 'table'
}

/** the player's last switch of the set, and the room's wish for it as it stood then (`manual` null: none holds) */
export type TvHold = { manual: boolean | null; wish: boolean }
export const TV_FREE: TvHold = { manual: null, wish: false }

/** the set on or off now, from the room's wish and the hold there is: the player's switch holds until the wish turns; then it's let go */
export function tvNow(hold: TvHold, wish: boolean): { on: boolean; hold: TvHold } {
  if (hold.manual !== null && wish !== hold.wish) return { on: wish, hold: { manual: null, wish } }
  return { on: hold.manual ?? wish, hold: hold.wish === wish ? hold : { manual: hold.manual, wish } }
}
/** the player's switch: the set the other way from how it is (`on`), held against the room's wish as it stands */
export const tvSwitched = (on: boolean, wish: boolean): TvHold => ({ manual: !on, wish })

/** what one of them settled on their cushion does, by their pastime and the set */
export function upstairsDoing(p: Pastime, on: boolean): Upstairs {
  if (p === 'handheld') return 'handheld'
  if (on) return 'watch'
  return p === 'tv' ? 'handheld' : 'table'
}

/** the next channel round */
export const nextChannel = (ch: number) => (Math.round(ch) + 1) % TV_CHANNELS
