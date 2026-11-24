// Something to try, one a day from the second (item 175, the owner's: those who don't care for games should want to play a little longer;
// the first day has its guide): while the shop's shut, a card with one thing in the shop worth finding, and a button that takes them there.
// In the order a newcomer gets the most from them: grilling by hand, the shrine's sake, what the customers say, a dish of their own, a
// word of praise for the staff, the round window by night.

export const TIPS = ['grill', 'altar', 'rating', 'recipe', 'praise', 'window'] as const
export type TipId = (typeof TIPS)[number]

/** the day's tip: none on the first day (the guide's), then the first not yet seen, one a day; none once they've all been seen */
export function tipFor(day: number, seen: readonly TipId[]): TipId | null {
  if (day < 2) return null
  return TIPS.find((t) => !seen.includes(t)) ?? null
}

/** whether the card's up: the shop shut, the day's tip not put away yet today, nothing else in front of it (the first day's guide, the
 * day's sheet, the editor) */
export function tipShown(s: { tip: TipId | null; open: boolean; dismissedDay: number | null; day: number; busy: boolean }) {
  return !!s.tip && !s.open && s.dismissedDay !== s.day && !s.busy
}
