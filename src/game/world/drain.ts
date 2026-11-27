import { USES, type Use } from '@/game/money/utilities'

/**
 * The shop's drain (item 764, the owner's 「排水要真實，假若店家有用水沒多久要排出」): the water used about the shop goes out of the drain at the
 * back (the pipe out of the plinth under the men's toilet, items 755 and 759) a little after it's used, as much of it as goes down, at the
 * pace it came: a flush a short surge, hands washed a thin run, the washing-up a steady trickle while it goes on. Each use's water is a
 * slug on its way: arriving after the time it takes to run there, running out at its own rate (rising over RISE) until it's gone; the pipe
 * carries DRAIN_MAX at most, more backing up in it and running on longer. The mouth's flow is eased (the pipe evens it out, and empties
 * with a tail); the stone and the grate under it wet with it at once, and dry over minutes.
 */
/** how each use's water comes to the drain: how long it takes to run there (seconds: the toilets are over it, the kitchen's sink at the shop's
 * far end), how much of it goes down (the rice's and the soup's water stays in the pot, half; the dipper's goes on the coals and the
 * hands, none), and how fast it runs out (litres a second) */
export const DRAIN_WAY: Record<Use, { delay: number; share: number; rate: number }> = {
  flush: { delay: 2.5, share: 1, rate: 1.2 },
  washlet: { delay: 2, share: 1, rate: 0.25 },
  handwash: { delay: 3, share: 1, rate: 0.2 },
  // (a tap left running: out as fast as it's run in, its minute's litres over the minute, so its run never breaks)
  wcTap: { delay: 3, share: 1, rate: 5 / 60 },
  dish: { delay: 7, share: 1, rate: 0.3 },
  tap: { delay: 7, share: 1, rate: 6 / 60 },
  cooking: { delay: 7, share: 0.5, rate: 0.15 },
  mop: { delay: 8, share: 1, rate: 0.5 },
  dipper: { delay: 0, share: 0, rate: 0 },
}
/** the pipe's most, litres a second */
export const DRAIN_MAX = 2
/** how long a slug's run takes to rise to its rate (s) */
export const RISE = 0.3
/** how long the stone and the grate take to dry (s, to a third) */
export const DRY_S = 150
/** at most this many slugs on their way (the oldest let go past it: a backlog that long is a steady run anyway) */
const MOST = 48

export interface Slug { at: number; left: number; rate: number; run: number }
export interface DrainState {
  /** its own clock (s, the game's: run on by the game's speed) */
  t: number
  slugs: Slug[]
  /** what's running out of the mouth now (litres a second, eased) */
  flow: number
  /** how wet the stone and the grate under it are (0..1) */
  wet: number
}
export const newDrain = (): DrainState => ({ t: 0, slugs: [], flow: 0, wet: 0 })

/** `n` uses of `use`'s water sent down the drain (a fraction of one for a tap left running: a part of its minute) */
export function pour(s: DrainState, use: Use, n = 1) {
  const w = DRAIN_WAY[use], litres = USES[use].litres * n * w.share
  if (!(litres > 0) || !(w.rate > 0)) return
  // (a tap's minute metered in parts: its next part runs on from the last if that's still on its way (one run, not many starts))
  const last = s.slugs[s.slugs.length - 1]
  if (last && last.rate === w.rate && last.at + last.run + last.left / w.rate >= s.t + w.delay - 0.5 && last.at <= s.t + w.delay) { last.left += litres; return }
  s.slugs.push({ at: s.t + w.delay, left: litres, rate: w.rate, run: 0 })
  if (s.slugs.length > MOST) s.slugs.splice(0, s.slugs.length - MOST)
}

/** what each slug that's arrived would run just now (litres a second, before the pipe's most) */
const want = (g: Slug, t: number) => (t >= g.at && g.left > 0 ? g.rate * Math.min(1, g.run / RISE) : 0)

/** time on by `dt` seconds: what's arrived runs out (the pipe's most shared between them), the mouth's flow eased toward it, the wet
 * followed; what's run out let go (in place: nothing made a frame) */
export function drainTick(s: DrainState, dt: number) {
  if (!(dt > 0)) return
  s.t += dt
  let total = 0
  for (const g of s.slugs) { if (s.t >= g.at && g.left > 0) g.run += dt; total += want(g, s.t) }
  const k = total > DRAIN_MAX ? DRAIN_MAX / total : 1
  let out = 0, n = 0
  for (const g of s.slugs) {
    const used = Math.min(g.left, want(g, s.t) * k * dt)
    g.left -= used; out += used
    if (g.left > 1e-4) s.slugs[n++] = g
  }
  s.slugs.length = n
  const now = out / dt
  // (rising in a quarter of a second, the tail as the pipe empties over a second and more)
  s.flow += (now - s.flow) * Math.min(1, dt / (now > s.flow ? 0.25 : 1.2))
  if (s.flow < 1e-3 && now === 0) s.flow = 0
  s.wet = Math.max(s.wet * Math.exp(-dt / DRY_S), Math.min(1, s.flow / 0.3))
}
