import { expect } from 'vitest'
import { feature, scenario } from './bdd'
import { frameStep, MAX_FRAME_S } from '@/game/framePace'

// (how much of the game's time a figure or a timer takes from one frame: the shop's clock goes by the wall clock times the speed, so the
// figures must take the same, or a slow machine at x2 has its customers and staff fall behind the clock)
const run = (fps: number, speed: number, seconds: number) => {
  let t = 0
  const frames = Math.round(fps * seconds)
  for (let i = 0; i < frames; i++) t += frameStep((1 / fps) * speed, speed)
  return t
}

feature('客人與員工跟店裡的時鐘走得一樣快', () => {
  scenario('一般速度：每秒 10 格以上，人物的時間跟真實時間一樣', ({ when, then }) => {
    when('每秒 60、30、12 格各跑 10 秒', (w) => { w.got = [60, 30, 12].map((f) => run(f, 1, 10)) })
    then('人物都走了 10 秒', (w) => { for (const t of w.got) expect(t).toBeCloseTo(10, 5) })
  })

  scenario('×2：弱電腦每秒只有 12 格，人物仍跟時鐘一樣快兩倍', ({ when, then }) => {
    when('×2、每秒 12 格跑 10 秒', (w) => { w.t = run(12, 2, 10) })
    then('人物走了 20 秒的遊戲時間（以前只有 12 秒）', (w) => { expect(w.t).toBeCloseTo(20, 5) })
  })

  scenario('卡住一下不會讓人物一步跳很遠', ({ then, and }) => {
    then('一般速度，一格最多算 0.1 秒', () => { expect(frameStep(3, 1)).toBe(MAX_FRAME_S) })
    and('×2，一格最多算 0.2 秒（真實時間仍是 0.1 秒）', () => { expect(frameStep(3, 2)).toBeCloseTo(2 * MAX_FRAME_S, 9) })
    and('暫停時（速度 0）照一般速度的上限', () => { expect(frameStep(0.5, 0)).toBe(MAX_FRAME_S) })
  })
})
