// A customer on their phone while they wait (item 625, the owner's, 2026-11-23: 「客人玩手機的樣子不太像，動畫品質要提升」), beat by beat:
// out of their pocket and up before them, then a while of scrolling, reading, a tap or two, typing with both thumbs, a look up from it
// now and then, a laugh at something on it; at the spell's end back into the pocket. Pure: scene/FolkFigure poses the hands, the head,
// the phone and the face from it.
//
// - Each spell at the phone (FolkFigure's: 12 to 30 s, its idle that while) runs PHONE_OUT_S taking it out, then beats one after another,
//   PHONE_AWAY_S putting it back at the end.
// - The beats each customer's own (by `seed`) and the same however often asked: what it is, how long (within its kind's range).
// - Never a laugh straight after taking it out (nothing read yet), never two looks up in a row; the last beat runs on to the putting away
//   rather than leave a scrap of one.

export type PhoneBeat = 'out' | 'scroll' | 'read' | 'tap' | 'type' | 'up' | 'laugh' | 'away'
/** how long taking it out and putting it back take (s) */
export const PHONE_OUT_S = 0.55
export const PHONE_AWAY_S = 0.6
/** each kind of beat: how likely, its shortest and its longest (s) */
export const PHONE_KINDS: readonly (readonly [PhoneBeat, number, number, number])[] = [
  ['scroll', 0.34, 2.2, 3.6],
  ['read', 0.2, 1.6, 2.8],
  ['tap', 0.12, 0.9, 1.4],
  ['type', 0.16, 2.0, 3.2],
  ['up', 0.12, 1.0, 1.6],
  ['laugh', 0.06, 1.0, 1.3],
]
/** a number 0..1 from two whole numbers, the same each time (a small integer hash) */
export function unit2(a: number, b: number) {
  let h = (Math.imul(a | 0, 0x9e3779b1) ^ Math.imul((b | 0) + 0x7f4a7c15, 0x85ebca6b)) >>> 0
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d) >>> 0
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b) >>> 0
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** a beat: which, how far through it (0..1), its number (the first after taking it out is 0), its whole length (s) */
export type PhoneAt = { beat: PhoneBeat; k: number; n: number; len: number }
const put = (o: PhoneAt, beat: PhoneBeat, k: number, n: number, len: number) => { o.beat = beat; o.k = k; o.n = n; o.len = len; return o }
/** the beat `at` seconds into a spell of `len` seconds at the phone (written into `out`, if given: none made each frame) */
export function phoneBeat(seed: number, at: number, len: number, out: PhoneAt = { beat: 'out', k: 0, n: -1, len: PHONE_OUT_S }): PhoneAt {
  if (at < PHONE_OUT_S) return put(out, 'out', Math.max(0, at) / PHONE_OUT_S, -1, PHONE_OUT_S)
  const end = Math.max(PHONE_OUT_S, len - PHONE_AWAY_S)
  if (at >= end) return put(out, 'away', Math.min(1, (at - end) / PHONE_AWAY_S), -2, PHONE_AWAY_S)
  let from = PHONE_OUT_S, prev: PhoneBeat = 'out'
  for (let n = 0; n < 64; n++) {
    let pick = unit2(seed, n * 2)
    let kind = PHONE_KINDS[PHONE_KINDS.length - 1]
    for (const k of PHONE_KINDS) {
      if (pick < k[1]) { kind = k; break }
      pick -= k[1]
    }
    // (nothing read yet to laugh at; not up again straight after looking up: a scroll instead)
    if ((kind[0] === 'laugh' && prev === 'out') || (kind[0] === 'up' && prev === 'up')) kind = PHONE_KINDS[0]
    // (too little time left for its kind: a tap, the shortest (the one before it leaves at least that))
    if (kind[2] > end - from) kind = PHONE_KINDS[2]
    let long = kind[2] + (kind[3] - kind[2]) * unit2(seed, n * 2 + 1)
    // (the last runs on to the putting away, rather than leave a scrap of a beat before it)
    if (end - (from + long) < PHONE_KINDS[2][2]) long = end - from
    if (at < from + long) return put(out, kind[0], (at - from) / long, n, long)
    from += long
    prev = kind[0]
  }
  return put(out, 'read', 0, 64, 1)
}
