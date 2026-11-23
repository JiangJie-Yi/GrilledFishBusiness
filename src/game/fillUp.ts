// A container's pieces shown as its stock grows all at once (a delivery; item 607, the owner's, 2026-11-23: 「補滿的瞬間有點怪，要不要加個
// 動畫」: the storeroom's sacks, crates and basket full in a frame): one after another, as if put in by the handful, the whole of it in about
// FILL_S, never slower than FILL_MIN a second; as it's used (one at a time), at once; drawn as it is from the first (a page just opened, the
// shop just set up), not filled. Pure: shops/grill/KitchenStores draws it, a knock heard and a puff seen as they go in.

/** how long a container takes to fill from empty (s), and the fewest pieces a second however few it holds */
export const FILL_S = 1.1
export const FILL_MIN = 9

/** the pieces shown after `dt` seconds, toward `want` of `all` (`shown` below 0: not drawn yet, so as it is) (fractional: its whole part's
 * what's drawn) */
export function fillToward(shown: number, want: number, all: number, dt: number) {
  if (shown < 0 || want <= shown) return want
  return Math.min(want, shown + Math.max(FILL_MIN, all / FILL_S) * dt)
}

/** how many pieces have just gone in, from `before` to `after` (whole ones; none on the first frame) */
export const landed = (before: number, after: number) => (before < 0 ? 0 : Math.max(0, Math.floor(after) - Math.floor(before)))
