import { businessDay, rainAt, weatherOf } from '@/game/world/weather'

/**
 * The ground round the shop after rain (item 752, the owner's 「下過雨後還會有水坑」): its earth darkens as it's rained on and dries again over
 * a couple of hours; its puddles fill as the rain goes on, slower, and go on standing a good while after it's stopped, drying slower by night
 * than by day. Worked out for any moment of the clock from the weather before it (game/weather's showers, a rain day's all-day rain into the
 * next noon), in steps of STEP minutes over the LOOK_BACK before it: the same answer however the clock got there (a skip to the next day
 * too), and nothing kept.
 */
/** minutes of hard rain to fill the puddles; to wet the earth through */
export const PUDDLE_FILL = 40, DAMP_FILL = 12
/** minutes to dry them out from full, by day and by night (water goes up off them at a steady rate: a full one shrinks to nothing in that
 * time, a shallow one sooner) */
export const PUDDLE_DRY = { day: 180, night: 400 }
export const DAMP_DRY = { day: 90, night: 200 }
/** how far back it looks (minutes), and its step */
const LOOK_BACK = 18 * 60, STEP = 5

export type GroundWet = { puddles: number; damp: number }
const dark = (minute: number) => minute < 6 * 60 || minute >= 18 * 60

/** the puddles' fill (0 none .. 1 brimming) and the earth's damp (0 dry .. 1 soaked) at `minute` of `day` */
export function groundWet(day: number, minute: number): GroundWet {
  let p = 0, d = 0
  const T = day * 1440 + minute
  for (let t = T - LOOK_BACK; t < T; t += STEP) {
    const dd = Math.floor(t / 1440), mm = t - dd * 1440
    const r = rainAt(weatherOf(businessDay(dd, mm)), mm)
    const n = dark(mm)
    // (rain in by how hard it falls; out as it dries, at a steady rate, only while it isn't raining hard)
    const dry = 1 - Math.min(1, r * 2)
    p = Math.max(0, Math.min(1, p + (r * STEP) / PUDDLE_FILL) - (dry * STEP) / (n ? PUDDLE_DRY.night : PUDDLE_DRY.day))
    d = Math.max(0, Math.min(1, d + (r * STEP) / DAMP_FILL) - (dry * STEP) / (n ? DAMP_DRY.night : DAMP_DRY.day))
  }
  return { puddles: p, damp: d }
}
