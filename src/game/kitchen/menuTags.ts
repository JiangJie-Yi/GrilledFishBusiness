// How the menu's tags on the wall are shared between its two rows (item 716, the owner's 「會置中對齊，根據內容量」): each row centred on
// the wall with a rail as long as it, the two rows as even as they can be (the first full and the second a stub read lopsided), broken
// between two sections where one begins near the middle (a section's plaque on the row with its dishes, not left at the end of the row
// before them), at most `cols` a row. Pure rules: shops/grill/dining/menuTags lays them out.

/** how many of `heads.length` tags go on the first row (the rest on the second): all of them if they fit one; else as near half as there
 * is a section's plaque to begin the second row with (within 3 either side), else half */
export function tagSplit(heads: readonly boolean[], cols: number): number {
  const n = heads.length
  if (n <= cols) return n
  const half = Math.ceil(n / 2)
  for (let d = 0; d <= 3; d++) {
    for (const i of [half - d, half + d]) {
      if (i > 0 && i < n && heads[i] && i <= cols && n - i <= cols) return i
    }
  }
  return Math.min(cols, half)
}

/** a tag's place: its row and its column (counted from the row's start, its right as the room reads it) */
export const tagPlace = (k: number, split: number) => (k < split ? { row: 0, col: k } : { row: 1, col: k - split })
