import { type GuestKind } from '@/data/guests'
import type { GuestView } from '@/game/types'
import { GRILL_SEATS } from '@/shops/grill/bar'

export type Guest = { id: number; orders: string[]; ate: string[]; eaten: number[]; since: number; state: GuestView['state']; seat: number
  /** the one they came in with (a couple, sat side by side) */
  partner?: number
  /** that one a grown-up and their child, not a couple (item 377) */
  family?: boolean
  /** (shop clock) when they'll say a word of the room's things, if they do (item 348); -1 once it's come */
  propAt?: number
  /** (shop clock) when they got up; their plate and sticks are cleared away a moment later */
  leftAt?: number; cleared?: boolean
  /** (shop clock) till when they're eating their bowl of rice or soup (item 205: set down, it was eaten that moment, and one whose last it
   * was got up and went, the bowl there a second): not up before then */
  sideUntil?: number
  /** (shop clock) when they ate their first piece: how long they waited for it */
  firstAte?: number
  /** when they last began a piece off the fire (the soup or sake don't count: item 203): waiting on the rest of their order from then */
  lastAte?: number
  /** a takeaway or a delivery (game/takeout): not sat anywhere, their food packed at the plating place, carried out to them at the till */
  takeout?: boolean }
/** at most this many AI customers seated at once; one gives up after waiting this long with nothing to eat */
export const MAX_SEATED = GRILL_SEATS.length
/** who can come in as a couple: him, and her */
// (and the night's: the band's man and the gyaru, the nurse off her shift (item 377))
export const COUPLE_HIM = new Set<GuestKind>(['salaryman', 'collegeStudent', 'schoolboy', 'delinquent', 'foreignTourist', 'bandman'])
export const COUPLE_HER = new Set<GuestKind>(['officeLady', 'schoolgirl', 'yukataLady', 'maidCoser', 'collegeStudent', 'gyaru', 'nurse'])
export const PATIENCE = 150
