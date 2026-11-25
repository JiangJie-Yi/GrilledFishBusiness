// What the shop's doing to get ready while it loads (item 175, the first look: a wait with something happening in it reads shorter than a
// bare percentage): a line for each stretch of the progress, in the order a shop's opened, the last one held till the veil lifts.

/** [from this percentage, the line] in order */
export const LOADING_LINES: readonly [number, string][] = [
  [0, '炭火點起來了'],
  [15, '今天的魚剛送到'],
  [35, '擦亮吧台，擺好醬油碟'],
  // (item 592: the long stretch after the first files, the models made ready, split between two; from 46%: from 50 the built game never
  // showed it, its 50 to 54% all inside the stretch the page is held up (the Tester's, 0 times in 6))
  [46, '魚一尾尾穿上燒烤串'],
  [55, '掛上暖簾，點亮燈籠'],
  [75, '大廚磨好了刀'],
  [92, '等第一位客人上門'],
]

/** which line is for how far it's come (0..100), by its place in the list; before anything's counted, the first */
export function lineIndex(pct: number | null): number {
  if (pct === null || !Number.isFinite(pct)) return 0
  let at = 0
  LOADING_LINES.forEach(([from], i) => { if (pct >= from) at = i })
  return at
}
/** the line for how far it's come (0..100); before anything's counted, the first */
export const loadingLine = (pct: number | null): string => LOADING_LINES[lineIndex(pct)][1]

/** the least a line's up before the next (s) (item 592: the first files come in a burst, 16% to 45% in half a second, and their lines went
 * by unread, one of them 0.4 s) */
export const LINE_MIN_S = 0.9
/** the line to show next (its place) after the one shown (`shown`) has been up `held` seconds: on toward the one for how far it's come, a
 * line at a time and each up LINE_MIN_S at the least; never back */
export function lineStep(shown: number, pct: number | null, held: number): number {
  return lineIndex(pct) > shown && held >= LINE_MIN_S ? shown + 1 : shown
}
