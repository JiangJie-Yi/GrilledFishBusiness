// How far the loading veil shows it's come while the loading waits on something it can't count (item 592, the Tester's: at 45% it sat
// 8.6 s, the first files in and the shop's models being read and made ready, nothing for the count to go on, and it looked stuck): the
// real estimate as soon as it's ahead; while it's not, going on by itself toward a little past it, slower the nearer it gets, never more
// than a share of what's left, so the real one coming in takes it up again and it hasn't run on ahead to stand still there waiting for it.
// Followed step by step, not timed from when the estimate last moved: files trickling in moved it a hair at a time, and each hair started
// the wait over (it went 45% to 50% and stood there 5.4 s).

/** of what's left to load, how much it may go on by itself, and how quickly (s: most of the way there in this long) */
export const CREEP_SPAN = 0.2
export const CREEP_S = 5

/**
 * The shown progress (0..1) `dt` seconds on: up to the real estimate (`real`, 0..1) at once if that's ahead; and from there on toward
 * CREEP_SPAN of the way from it to the end, most of that in CREEP_S; never back.
 */
export function loadingStep(shown: number, real: number, dt: number): number {
  const r = Number.isFinite(real) ? Math.min(1, Math.max(0, real)) : 0
  const s = Math.max(shown, r), top = r + CREEP_SPAN * (1 - r)
  if (s >= top) return s
  return s + (top - s) * (1 - Math.exp(-Math.max(0, dt) / CREEP_S))
}

/** as a percentage on the veil: whole, at most 99 (it lifts at the end) */
export const loadingPct = (shown: number) => Math.min(99, Math.round(shown * 100))
