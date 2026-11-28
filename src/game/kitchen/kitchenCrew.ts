/**
 * Who does what in the kitchen while the shop's open (the owner's three-way split): the owner, the head chef (大廚), is at the fire, taking
 * things on and off it; the second cook (二廚) fetches each order out of its store and skewers it at the board; the third cook (三廚) plates,
 * keeps the fire's charcoal and water, the rice and the skewers' washing. With no third cook, the second does that too, between his rounds.
 */
type Cook = { role: string }

/** who plates and keeps the fire: the third cook; with none, the second (hired, or `house`, the shop's own) */
export function platerOf<T extends Cook>(crew: T[], house: T): T {
  return crew.find((w) => w.role === 'sous') ?? crew.find((w) => w.role === 'chef') ?? house
}

/** whether the plater may go off now (for plates, charcoal, the rice): not the second cook while he's on a round with an order */
export const platerFree = (isFetcher: boolean, fetching: boolean) => !(isFetcher && fetching)

/**
 * (item 845, the Tester window's 872) who lends the floor a hand: the second cook (hired, or `house`, the shop's own), only while there's a
 * third cook at the plating (with none, the second plates himself); none else
 */
export function helperOf<T extends Cook>(crew: T[], house: T): T | null {
  if (!crew.some((w) => w.role === 'sous')) return null
  return crew.find((w) => w.role === 'chef') ?? house
}

/** (item 842) how long a customer's bowls or tokkuri wait on the busy third cook before a free hand fills or pours them (the game's minutes) */
export const HELP_AFTER = 10
/** (item 845) how long what's plated, or the bowls filled at the counter, wait with both servers busy before the second cook carries them out
 * (the game's minutes: late at night, the servers tired at half their pace, they waited as long as an hour) */
export const HELPER_AFTER = 4
/** (item 1005, the Tester window's 874) how long a tokkuri's been asked for (the game's minutes) before it's poured ahead of the rice and
 * soup, the bowls and the dishes: a pour's a few seconds at the station, and at the back of everyone's list 6 of 19 were never poured in three
 * days, 4 more too late, the customer gone */
export const SAKE_FIRST = 10
/** whether any tokkuri asked for (how long each has been waited on, the game's minutes; -1 for one whose customer isn't sat) is overdue */
export const sakeOverdue = (waits: number[]) => waits.some((m) => m >= SAKE_FIRST)

/** what the second cook may go out for just now, the first that can be had first: nothing unless he's free (at his board, no round of his own
 * on and none of the orders waiting for him, the shop open, him on duty); a takeaway packed with its customer waiting for it (item 1004: the
 * Tester window's 874 saw two wait from 04:37 to the close, the servers clearing and washing, him idle); what's plated, then the bowls at
 * the counter, once they've waited
 * HELPER_AFTER with the servers all busy; a tokkuri poured and waiting as long; then, with the third cook swamped (HELP_AFTER), a tokkuri
 * poured, and the bowls filled (item 1005: the sake before the bowls, a pour's a few seconds; last, it was poured 2 times in three days) */
export function helperJobs(s: { free: boolean; serversBusy: boolean; foodWait: number; bowlsWait: number; swampedBowls: boolean; swampedSake: boolean
  /** how long the oldest tokkuri poured and waiting at the station has been asked for (-1: none) */
  pouredWait: number
  /** (item 1004) how long the oldest takeaway packed, its customer waiting, has waited (-1: none he can take) */
  boxWait?: number }) {
  const jobs: ('box' | 'food' | 'bowls' | 'fill' | 'pour' | 'tokkuri')[] = []
  if (!s.free) return jobs
  if (s.serversBusy && (s.boxWait ?? -1) >= HELPER_AFTER) jobs.push('box')
  if (s.serversBusy && s.foodWait >= HELPER_AFTER) jobs.push('food')
  if (s.serversBusy && s.bowlsWait >= HELPER_AFTER) jobs.push('bowls')
  if (s.serversBusy && s.pouredWait >= HELP_AFTER) jobs.push('tokkuri')
  if (s.swampedSake) jobs.push('pour')
  if (s.swampedBowls) jobs.push('fill')
  return jobs
}
