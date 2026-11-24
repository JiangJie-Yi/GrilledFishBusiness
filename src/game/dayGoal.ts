// Each business day's target for its takings (item 175, the owner's: those who don't care for games should want to play a little longer): a
// little past the day before's, so there's always something within reach to beat; shown while the shop's open and cheered as it's passed.

/** the first day's target (NT$): a first evening's few customers come to about this (item 175's first-day run: 1,215 by 18:16 with six) */
export const GOAL_FIRST = 1500
/** how much past the day before's takings the next day's target is ("a tenth more than yesterday": one rule, easy to see) */
export const GOAL_UP = 1.1

/** a day's closing takings, as the books keep them (game/daySummary's DayRecord), and whether its target was met (none kept before item 650) */
type Took = { day: number; revenue: number; made?: boolean }

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

// ---- (item 650, the owner's 「達標會有甚麼好處」: it had only been cheered) what a target met brings: word of it going round, the next day's
// customers coming in more often; the more days running it's been met, the more, to a ceiling (more come than the bar can seat, past that)
/** how much more often customers come in for each day running the target's been met, and the most it comes to */
export const GOAL_BONUS_STEP = 0.05, GOAL_BONUS_MAX = 0.15
/** how many days running, back from the latest day kept, the target was met (the days kept in their order by date; a day the shop
 * wasn't opened, not kept, doesn't break it) */
export function goalStreak(past: readonly Took[]): number {
  const days = [...past].sort((a, b) => b.day - a.day)
  let n = 0
  for (const d of days) {
    if (!d.made) break
    n++
  }
  return n
}
/** how much more often customers come in, for that many days running met (0 to GOAL_BONUS_MAX) */
export const goalBonus = (streak: number) => Math.min(GOAL_BONUS_MAX, Math.max(0, streak) * GOAL_BONUS_STEP)
