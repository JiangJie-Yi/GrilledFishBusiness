// Each business day's target for its takings (item 175, the owner's: those who don't care for games should want to play a little longer): a
// little past the day before's, so there's always something within reach to beat; shown while the shop's open and cheered as it's passed.

/** the first day's target (NT$): a first evening's few customers come to about this (item 175's first-day run: 1,215 by 18:16 with six) */
export const GOAL_FIRST = 1500
/** how much past the day before's takings the next day's target is ("a tenth more than yesterday": one rule, easy to see) */
export const GOAL_UP = 1.1

/** a day's closing takings, as the books keep them (game/daySummary's DayRecord) */
type Took = { day: number; revenue: number }

/** today's target: the latest day's takings a tenth more, rounded up to the hundred, never under the first day's (a poor day brings the next
 * one's down with it, so it's always within reach) */
export function dayGoal(past: readonly Took[]): number {
  if (!past.length) return GOAL_FIRST
  const last = past.reduce((a, b) => (b.day > a.day ? b : a))
  return Math.max(GOAL_FIRST, Math.ceil((last.revenue * GOAL_UP) / 100) * 100)
}

/** how far today's takings are toward the target: the share (0..1) and whether it's been reached */
export function goalProgress(goal: number, takings: number) {
  const share = goal > 0 ? Math.min(1, Math.max(0, takings / goal)) : 1
  return { share, reached: takings >= goal }
}
