// Gifts for the staff (item 696, the owner's, 2026-11-25: 「這邊做細緻一些，且可以送禮」): eight things the owner can give one of the staff,
// one a day each, paid from the cash. Each of them takes to some, is so-so about most, and doesn't care for one or two, as they are (a
// woman or a man, their age, whether they cook) and a roll of their own; what they thought of one is known once it's given (the office's
// relations card shows it after). The same thing as last time is a little less welcome. Pure rules: App takes the money and keeps what's
// known on their rota.
import { unit } from './commute'

export type GiftId = 'flowers' | 'wagashi' | 'tea' | 'sake' | 'hairpin' | 'scarf' | 'whetstone' | 'cookbook'
/** what they make of it, warmest first */
export type Taste = 'love' | 'like' | 'meh' | 'dislike'
export const TASTES: readonly Taste[] = ['love', 'like', 'meh', 'dislike']
/** the gifts: their names, their price (NT$), and whether they're only for those of age (sake: twenty and over) */
export const GIFTS: readonly { id: GiftId; zh: string; ja: string; en: string; price: number; adult?: boolean }[] = [
  { id: 'flowers', zh: '花束', ja: '花束', en: 'Flowers', price: 600 },
  { id: 'wagashi', zh: '和菓子', ja: '和菓子', en: 'Wagashi', price: 350 },
  { id: 'tea', zh: '高山茶', ja: '高山茶', en: 'Oolong tea', price: 500 },
  { id: 'sake', zh: '吟釀清酒', ja: '吟醸酒', en: 'Ginjo sake', price: 1200, adult: true },
  { id: 'hairpin', zh: '髮簪', ja: 'かんざし', en: 'Hairpin', price: 900 },
  { id: 'scarf', zh: '圍巾', ja: 'マフラー', en: 'Scarf', price: 1500 },
  { id: 'whetstone', zh: '磨刀石', ja: '砥石', en: 'Whetstone', price: 800 },
  { id: 'cookbook', zh: '食譜書', ja: '料理本', en: 'Cookbook', price: 650 },
]
export const giftOf = (id: string) => GIFTS.find((g) => g.id === id)
/** what each taste does to their feeling for the owner */
export const TASTE_BOND: Record<Taste, number> = { love: 8, like: 5, meh: 2, dislike: -3 }
/** of age, for the sake (as game/nightTogether's) */
export const GIFT_ADULT = 20

/** one of the staff, as these rules need them */
export type Giftee = { id: string; female: boolean; years: number; role: string }
const COOK = new Set(['chef', 'sous'])

/** how much a gift's to their liking (0..1.4 or so): a roll of their own for it, and what they are */
function liking(w: Giftee, g: GiftId) {
  const old = w.years >= 40, young = w.years < 26, cook = COOK.has(w.role)
  const lean: Record<GiftId, number> = {
    flowers: w.female ? 0.25 : old ? -0.15 : -0.05,
    wagashi: young ? 0.12 : 0.05,
    tea: old ? 0.28 : young ? -0.1 : 0.05,
    sake: (w.female ? 0 : 0.15) + (w.years >= 30 ? 0.1 : 0),
    hairpin: w.female ? 0.3 : -0.45,
    scarf: 0.1,
    whetstone: cook ? 0.35 : -0.25,
    cookbook: cook ? 0.25 : young ? 0.05 : -0.05,
  }
  return unit(w.id, `gift-${g}`) + lean[g]
}

/** whether it can be given them at all (sake to one under age: no) */
export const giftOk = (w: Giftee, g: GiftId) => !(giftOf(g)?.adult && w.years < GIFT_ADULT)

/** what they make of a gift, as they are */
export function giftTaste(w: Giftee, g: GiftId): Taste {
  const v = liking(w, g)
  return v > 0.85 ? 'love' : v > 0.55 ? 'like' : v > 0.18 ? 'meh' : 'dislike'
}

/** a gift given them: what they make of it (the same as last time, a step less welcome; a dislike stays one) and what it does to their bond */
export function giftResult(w: Giftee, g: GiftId, last?: string): { taste: Taste; bond: number; again: boolean } {
  const t0 = giftTaste(w, g), again = last === g
  const taste = again && t0 !== 'dislike' ? TASTES[Math.min(TASTES.indexOf(t0) + 1, TASTES.indexOf('meh'))] : t0
  return { taste, bond: TASTE_BOND[taste], again }
}

/** whether one may be given something today: one gift a day each */
export const canGiftToday = (r: { giftDay?: number }, today: number) => r.giftDay !== today
