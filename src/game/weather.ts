// The weather (item 623, the owner's, 2026-11-23: 「增加天氣系統，有時候窗外會下雨，進來的客人會穿雨衣或帶雨傘」): each business day's sky,
// the same however often it's asked, and the rain through its evening. Pure rules (BDD `weather`): ui/GameClock shows it, the grill's
// windows and its door (shops/grill) draw the rain and are heard with it, its customers come in under umbrellas or in raincoats.
//
// - A business day runs from its opening into the small hours: before noon, it's still the day before's (its weather too).
// - Rain all evening about one day in six (RAIN_DAY); cloudy about one in three, and a cloudy evening one time in three has a passing
//   shower (SHOWER_CHANCE): from six to midnight, 40 to 120 minutes of it, coming on over RAIN_EASE minutes and going off over twice that;
//   the rest clear.
// - A rain day's trade is the rainy day's (game/flow's 'rainy': fewer, slower, hungrier customers), and only a rain day's: the opening's own
//   pattern drawn as before (flowOf) otherwise, a rainy one drawn on a dry day made a steady one. A passing shower thins the door a little
//   while it lasts (showerGap).
// - Those who come in while it rains: most with an umbrella, some in a raincoat, a few with neither (each customer their own).
import { unit2 } from './commute'
import { flowOf, type FlowKind } from './flow'

export type Sky = 'clear' | 'cloudy' | 'rain'
/** a business day's weather: its sky, and when it rains (session minutes: from that day's midnight, past 24 * 60 after the next) */
export type Weather = { sky: Sky; showers: readonly { from: number; to: number }[]; hard: number }
/** how many days in a hundred are a rain day; a cloudy one; and how many cloudy evenings in a hundred have a shower */
export const RAIN_DAY = 0.17
export const CLOUDY_DAY = 0.33
export const SHOWER_CHANCE = 0.35
/** how many of the clock's minutes a shower takes to come on (twice that to go off) */
export const RAIN_EASE = 8

/** the business day a moment of the clock belongs to: its small hours are the day before's */
export const businessDay = (day: number, minute: number) => (minute < 12 * 60 ? day - 1 : day)
/** a moment of the clock in its business day's minutes (the small hours past 24 * 60) */
export const sessionMinute = (minute: number) => (minute < 12 * 60 ? minute + 24 * 60 : minute)

/** a business day's weather (the last day asked kept: it's asked every frame) */
let last: { day: number; w: Weather } | null = null
export function weatherOf(day: number): Weather {
  if (last?.day === day) return last.w
  const w = weatherFresh(day)
  last = { day, w }
  return w
}
function weatherFresh(day: number): Weather {
  const r = unit2(day, 1), hard = 0.55 + 0.45 * unit2(day, 2)
  // (the shop's first day fine: its guide's day, its first customers (item 175); a wet first day had the rainy trade's few)
  if (day <= 1) return { sky: 'clear', showers: [], hard }
  if (r < RAIN_DAY) return { sky: 'rain', showers: [{ from: 12 * 60, to: 36 * 60 }], hard }
  if (r < RAIN_DAY + CLOUDY_DAY) {
    if (unit2(day, 3) >= SHOWER_CHANCE) return { sky: 'cloudy', showers: [], hard }
    const from = 18 * 60 + Math.floor(unit2(day, 4) * 6 * 60), long = 40 + Math.floor(unit2(day, 5) * 80)
    return { sky: 'cloudy', showers: [{ from, to: from + long }], hard }
  }
  return { sky: 'clear', showers: [], hard }
}

/** how hard it's raining at a moment of the clock (0 dry .. 1 pouring): a shower coming on and going off; a rain day's own swells */
export function rainAt(w: Weather, minute: number) {
  const m = sessionMinute(minute)
  let k = 0
  for (const s of w.showers) {
    if (m <= s.from || m >= s.to) continue
    k = Math.max(k, Math.min(1, (m - s.from) / RAIN_EASE, (s.to - m) / (2 * RAIN_EASE)))
  }
  if (!k) return 0
  // (a rain day's heavier and lighter spells (slow waves); a shower as hard as the day's)
  const swell = w.sky === 'rain' ? 0.8 + 0.2 * Math.sin(m / 37) * Math.sin(m / 23 + 1.3) : 1
  return k * w.hard * swell
}

/** the gap between customers against the usual while a passing shower lasts (a rain day's own trade has its rain in it already) */
export const showerGap = (w: Weather, minute: number) => (w.sky === 'rain' ? 1 : 1 + 0.4 * rainAt(w, minute))

/** the opening's pattern of trade by its weather: a rain day's the rainy one; a dry day's drawn as ever, never the rainy one (a steady day) */
export function flowFor(n: number, sky: Sky): FlowKind {
  if (sky === 'rain') return 'rainy'
  const f = flowOf(n)
  return f === 'rainy' ? 'steady' : f
}

/** what a customer coming in now has against the rain (by them): an umbrella, a raincoat, neither; nothing when it isn't raining */
export function rainGear(id: number, rain: number): 'umbrella' | 'coat' | null {
  if (rain < 0.15) return null
  const r = unit2(id, 11)
  return r < 0.65 ? 'umbrella' : r < 0.85 ? 'coat' : null
}
