/**
 * How long a customer sits (item 207, the owner's, 2026-11-16: 「是否有客人站位置太久，需制定用餐時間」): a sitting is STAY_MAX of the shop's
 * minutes, as an izakaya keeps its seats to a time; at it, they pay for what they've had and go, what never came given back.
 */
export const STAY_MAX = 100
/** whether one sat down at `since` (the shop's minutes) has had their time by `now` */
export const overstayed = (since: number, now: number) => now - since >= STAY_MAX
/**
 * (item 630, the owner's 「客人很容易等太久……很容易浪費食材」) How long one who's had a dish waits for the next with nothing before them (the
 * shop's minutes, after the last is eaten, EAT_MINUTES): it was 25, and those who'd been served got up while the rest of what they'd ordered
 * was still on the fire (different stores fetched apart, grilled 11 to 41 minutes, a server's trip each): the most refunded of all, and what
 * came off for them eaten by the staff. Food comes to a counter in waves; one who's eating and drinking waits on the next
 */
export const NEXT_WAIT = 40
export const EAT_MINUTES = 8
/** whether one who began their last dish at `lastAte` (the shop's minutes) has given up on the next by `now` */
export const gaveUpOnNext = (lastAte: number, now: number) => now - lastAte > NEXT_WAIT + EAT_MINUTES
/**
 * (items 1005 and its own, the Tester window's 874 and 877) Whether one who'd go now (given up on the next, sat their time out, hurried out
 * at closing) stays a little: for something of theirs set down and not yet taken (a dish, their bowls, a tokkuri) or a side they're eating,
 * always, to eat it; for something still on its way to them (made, at the counter or carried), HOLD_MAX at most past when they'd have gone
 * (`heldFor`, the shop's minutes): a tokkuri set down the minute its customer was sent off, then, held for it, they left the minute a soup
 * that had stood 44 minutes at the counter was set down, 35 minutes on, uneaten
 */
export const HOLD_MAX = 20
export const holdsOn = (s: { setDown: boolean; eatingSide: boolean; coming: boolean; heldFor: number }) =>
  s.setDown || s.eatingSide || (s.coming && s.heldFor < HOLD_MAX)
