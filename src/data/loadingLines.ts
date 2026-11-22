// What the shop's doing to get ready while it loads (item 175, the first look: a wait with something happening in it reads shorter than a
// bare percentage): a line for each stretch of the progress, in the order a shop's opened, the last one held till the veil lifts.

/** [from this percentage, the line] in order */
export const LOADING_LINES: readonly [number, string][] = [
  [0, '炭火點起來了'],
  [15, '今天的魚剛送到'],
  [35, '擦亮吧台，擺好醬油碟'],
  [55, '掛上暖簾，點亮燈籠'],
  [75, '大廚磨好了刀'],
  [92, '等第一位客人上門'],
]

/** the line for how far it's come (0..100); before anything's counted, the first */
export function loadingLine(pct: number | null): string {
  if (pct === null || !Number.isFinite(pct)) return LOADING_LINES[0][1]
  let line = LOADING_LINES[0][1]
  for (const [from, text] of LOADING_LINES) if (pct >= from) line = text
  return line
}
