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
