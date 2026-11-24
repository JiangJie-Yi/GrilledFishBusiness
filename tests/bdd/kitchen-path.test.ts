import { expect } from 'vitest'
import { feature, scenario } from './bdd'
import { kitchenPath, kitchenPathThrough, outOfPieces, reachableNear, type Rect } from '@/game/kitchen/kitchenPath'

// (item 333, the owner's, 2026-11-18: 「外場路線有問題，可否設置碰撞點?」)
const MARGIN = 0.13
const piece = { x0: 1, z0: 1, x1: 2, z1: 2 }
const grown: Rect = { x0: piece.x0 - MARGIN, z0: piece.z0 - MARGIN, x1: piece.x1 + MARGIN, z1: piece.z1 + MARGIN }
const room: Rect = { x0: -1, z0: -1, x1: 4, z1: 4 }
const inPiece = (p: [number, number]) => p[0] > piece.x0 && p[0] < piece.x1 && p[1] > piece.z0 && p[1] < piece.z1

feature('廚房裡的路不穿過擺設（第 333 項）', () => {
  scenario('要去的地方設在擺設裡面時，停在擺設邊上', ({ given, when, then, and }) => {
    given('一件擺設，要去的地方在它裡面、靠近它的一邊', (w) => { w.to = [1.5, 1.9] })
    when('把要去的地方移出擺設', (w) => { w.at = outOfPieces(w.to, [grown], MARGIN) })
    then('站到最近的那一邊外面', (w) => { expect(w.at[0]).toBeCloseTo(1.5, 6); expect(w.at[1]).toBeGreaterThan(piece.z1) })
    and('走過去的每一段都不經過擺設本身', (w) => {
      const way = kitchenPath([0, 0], w.at, room, [grown])!
      for (let i = 1; i < way.length; i++) for (let t = 0; t <= 1; t += 0.02) {
        const p: [number, number] = [way[i - 1][0] + (way[i][0] - way[i - 1][0]) * t, way[i - 1][1] + (way[i][1] - way[i - 1][1]) * t]
        expect(inPiece(p)).toBe(false)
      }
    })
  })
  scenario('站在擺設旁邊留給人走的空間裡的不動', ({ given, then }) => {
    given('要去的地方在擺設外、留給人走的空間裡', (w) => { w.to = [1.5, 2.05] })
    then('位置不變', (w) => { expect(outOfPieces(w.to, [grown], MARGIN)).toBe(w.to) })
  })
})

// (item 670, the owner's, 2026-11-24: 「注意一下動線，別讓腳色穿越」: a piece put down across the kitchen's way, no way was found with the
// room round everything, and the way was drawn straight through the warmer, the fryer and the serving counter)
const grow = (r: Rect, m = MARGIN): Rect => ({ x0: r.x0 - m, z0: r.z0 - m, x1: r.x1 + m, z1: r.z1 + m })
const inBare = (bare: Rect[], p: [number, number]) => bare.some((r) => p[0] > r.x0 && p[0] < r.x1 && p[1] > r.z0 && p[1] < r.z1)
/** how much of a way lies in the pieces themselves */
const lengthIn = (bare: Rect[], way: [number, number][]) => {
  let n = 0
  for (let i = 1; i < way.length; i++) {
    const L = Math.hypot(way[i][0] - way[i - 1][0], way[i][1] - way[i - 1][1]), k = Math.max(1, Math.ceil(L / 0.01))
    for (let s = 0; s < k; s++) { const t = (s + 0.5) / k; if (inBare(bare, [way[i - 1][0] + (way[i][0] - way[i - 1][0]) * t, way[i - 1][1] + (way[i][1] - way[i - 1][1]) * t])) n += L / k }
  }
  return n
}
const box: Rect = { x0: 0, z0: 0, x1: 4, z1: 3 }

feature('廚房的路被擋住時不拉直線穿過擺設（第 670 項）', () => {
  scenario('兩件擺設中間的縫比留給人走的空間窄，路貼著擺設擠過去', ({ given, when, then, and }) => {
    given('一道從牆到牆的擺設，中間只留 20 公分的縫', (w) => { w.bare = [{ x0: 1.5, z0: 0, x1: 2.0, z1: 1.4 }, { x0: 1.5, z0: 1.6, x1: 2.0, z1: 3 }] })
    when('從一邊走到另一邊', (w) => { w.way = kitchenPath([0.5, 1.5], [3.5, 1.5], box, w.bare.map((r: Rect) => grow(r))) })
    then('找得到路', (w) => { expect(w.way).not.toBeNull() })
    and('整條路都不經過擺設本身', (w) => { expect(lengthIn(w.bare, w.way)).toBe(0) })
  })
  scenario('站的地方被擺設整個圍住，走穿過最少的那條，不是直線', ({ given, when, then, and }) => {
    given('四面都被擋住的角落：上面那道薄，右邊那道厚', (w) => {
      w.bare = [{ x0: 1.0, z0: 0.5, x1: 1.2, z1: 2.5 }, { x0: 2.8, z0: 0.5, x1: 3.4, z1: 2.5 }, { x0: 1.0, z0: 2.3, x1: 3.4, z1: 2.45 }, { x0: 1.0, z0: 0.3, x1: 3.4, z1: 0.8 }]
      w.blocks = w.bare.map((r: Rect) => grow(r))
    })
    when('從角落裡走到右上方外面', (w) => { w.from = [2.0, 1.6]; w.to = [3.8, 2.85]; w.way = kitchenPath(w.from, w.to, box, w.blocks) ?? kitchenPathThrough(w.from, w.to, box, w.blocks) })
    then('繞不出去（擠也擠不過）', (w) => { expect(kitchenPath(w.from, w.to, box, w.blocks)).toBeNull() })
    and('走的那條經過擺設的長度比直線短', (w) => { expect(lengthIn(w.bare, w.way)).toBeLessThan(lengthIn(w.bare, [w.from, w.to]) - 0.1) })
    and('是從薄的那道出去', (w) => { expect(lengthIn(w.bare, w.way)).toBeLessThan(0.3) })
  })
  scenario('外場的站位被圍在角落裡，改站到從閘門走得到的最近那一格', ({ given, when, then, and }) => {
    given('房間左下角被一道 L 形的擺設圍住，站位在角落裡', (w) => {
      w.bare = [{ x0: 0, z0: 0.8, x1: 1.0, z1: 1.0 }, { x0: 0.8, z0: 0, x1: 1.0, z1: 1.0 }]
      w.blocks = w.bare.map((r: Rect) => grow(r))
    })
    when('從閘門那邊找站得住的地方', (w) => { w.at = reachableNear([0.3, 0.3], [3.0, 2.0], box, w.blocks, 0.1) })
    then('找得到', (w) => { expect(w.at).not.toBeNull() })
    and('不在角落裡', (w) => { expect(w.at[0] > 1.0 || w.at[1] > 1.0).toBe(true) })
    and('從那裡走得到閘門，不用穿過擺設', (w) => { const way = kitchenPath(w.at, [3.0, 2.0], box, w.blocks); expect(way).not.toBeNull(); expect(lengthIn(w.bare, way!)).toBe(0) })
    and('離原本的站位不遠', (w) => { expect(Math.hypot(w.at[0] - 0.3, w.at[1] - 0.3)).toBeLessThan(1.6) })
  })
  scenario('站位本來就走得到，就不動', ({ then }) => {
    then('照原本的位置', () => { expect(reachableNear([3.0, 1.0], [3.0, 2.0], box, [grow({ x0: 0, z0: 0.8, x1: 1.0, z1: 1.0 })], 0.1)).toEqual([3.0, 1.0]) })
  })
})
