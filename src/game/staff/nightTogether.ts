// A night together upstairs (item 637, the owner's, 2026-11-24: 「交往中拿掉，是說只要住宿是女生，好感度達到一定程度，在睡覺時間上樓有機率會
// 恩愛」), in place of the dating there was (item 340, taken out: no asking out, no dates, no 交往中). Pure rules; App asks them as the owner
// goes to bed, the room upstairs (shops/grill/DormRoom) draws the two of them, Boss sends him up the stair instead of to his futon.
//
// - Who: a woman of the staff who lives upstairs (game/lodging's `lives`), of age (twenty and over), her feeling for the owner (game/affinity's
//   bond) up at TOGETHER_AT. Of those, the fondest.
// - When: as he goes to bed at the night's end (the shop shut, game/dormLife's sleeping hours). A chance each night, the fonder the likelier:
//   CHANCE_LOW at TOGETHER_AT, CHANCE_HIGH at 100. The night's roll is the night's (by the day and her), however often it's asked: going up
//   and down the stair to look again changes nothing.
// - Then: he goes up the stair, not to his own futon; up there they sleep side by side, close, a heart now and then, the lamp low and warm.
//   Nothing more is shown. The morning after, her feeling up TOGETHER_BOND.
import { unit } from './commute'

const clamp = (v: number) => Math.max(0, Math.min(100, v))

export const ADULT = 20
export const TOGETHER_AT = 80
export const CHANCE_LOW = 0.25
export const CHANCE_HIGH = 0.6
export const TOGETHER_BOND = 2

/** one of the staff, as these rules need them: who, whether a woman, how old, whether she lives upstairs, her feeling for the owner */
export type Lodger = { id: string; female: boolean; years: number; lives: boolean; bond: number }

/** whether she could be the one tonight: a woman of age living upstairs, fond enough */
export const mayShare = (w: Lodger) => w.female && w.years >= ADULT && w.lives && w.bond >= TOGETHER_AT

/** how likely a night together is with her: CHANCE_LOW at TOGETHER_AT, rising to CHANCE_HIGH at 100; none under it */
export function togetherChance(bond: number) {
  if (bond < TOGETHER_AT) return 0
  return CHANCE_LOW + ((Math.min(100, bond) - TOGETHER_AT) / (100 - TOGETHER_AT)) * (CHANCE_HIGH - CHANCE_LOW)
}

/** the night's dice for her (0..1): the same however often it's asked that night */
export const nightRoll = (id: string, day: number) => unit(id, `together${day}`)

/** who he goes up to tonight (business day `day`, ending), if anyone: his companion if he has one (game/companion, item 696: every night, of
 * age and living upstairs), else the fondest who may, if the night's dice say so; `roll` for tests */
export function tonightWith(staff: Lodger[], day: number, roll: (id: string, day: number) => number = nightRoll, companion: string | null = null): string | null {
  const mine = companion ? staff.find((w) => w.id === companion && w.female && w.years >= ADULT && w.lives) : undefined
  if (mine) return mine.id
  const may = staff.filter(mayShare).sort((a, b) => b.bond - a.bond || (a.id < b.id ? -1 : 1))
  const her = may[0]
  if (!her) return null
  return roll(her.id, day) < togetherChance(her.bond) ? her.id : null
}

/** the morning after a night together: her feeling up TOGETHER_BOND */
export const afterTogether = (bond: number) => clamp(bond + TOGETHER_BOND)

/**
 * Where on her futon the two of them lie, and how far the quilt's let out over them (the room upstairs draws it): he lies on the side with
 * the more room (the room's +x: sd 1), and the quilt's let out that way by as much as there's room (at most `most`), on her side by a little
 * (at most `her`), never over the wall, the stair's well or a futon laid beside it, with `gap` between; each lies `side` from the futon's
 * middle, the further apart the more it's let out. `half`: the quilt's half width; positions along the room's x.
 */
export function bedFit(x: number, half: number, wall: number, well: number, others: { x: number; laid: boolean }[],
  { gap = 0.03, most = 0.36, her = 0.12, side = [0.14, 0.19] as readonly [number, number] } = {}) {
  let left = x - half - (wall + gap), right = well - gap - (x + half)
  for (const b of others) {
    if (!b.laid) continue
    if (b.x < x) left = Math.min(left, x - half - (b.x + half + gap))
    else right = Math.min(right, b.x - half - gap - (x + half))
  }
  const sd: 1 | -1 = right >= left ? 1 : -1
  const extra = Math.max(0, Math.min(most, Math.max(left, right)))
  const extraHer = Math.max(0, Math.min(her, Math.min(left, right)))
  return { sd, extra, extraHer, side: side[0] + (side[1] - side[0]) * (extra / most) }
}
