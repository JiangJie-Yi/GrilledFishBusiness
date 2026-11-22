import { expect } from 'vitest'
import { feature, scenario } from './bdd'
import { LINE_MIN_S, LOADING_LINES, lineStep, loadingLine } from '@/data/loadingLines'
import { CREEP_SPAN, loadingPct, loadingStep } from '@/game/loadingCreep'

// (item 175, the first look: while it loads, what the shop's doing to get ready, in the order a shop's opened)
feature('載入時的開店準備', () => {
  scenario('還沒開始算進度時是第一句', ({ then }) => {
    then('炭火點起來了', () => { expect(loadingLine(null)).toBe('炭火點起來了') })
  })
  scenario('照進度一句一句往下', ({ then, and }) => {
    then('20% 是魚送到', () => { expect(loadingLine(20)).toBe('今天的魚剛送到') })
    and('50% 是穿鐵串（模型準備最久的那段，第 592 項）', () => { expect(loadingLine(50)).toBe('魚一尾尾穿上鐵串') })
    and('46% 就換成穿鐵串（正式版停頓前只走到 47～48%）', () => { expect(loadingLine(46)).toBe('魚一尾尾穿上鐵串') })
    and('60% 是掛暖簾', () => { expect(loadingLine(60)).toBe('掛上暖簾，點亮燈籠') })
    and('100% 是等第一位客人', () => { expect(loadingLine(100)).toBe('等第一位客人上門') })
  })
  scenario('每一句至少停一下，一句一句換（第一批檔案一下子湧進來，一句只閃 0.4 秒）', ({ then, and }) => {
    then('才 0.5 秒，進度已經到 50% 也先不換', () => { expect(lineStep(0, 50, 0.5)).toBe(0) })
    and(`停滿 ${LINE_MIN_S} 秒，只往下換一句，不跳到 50% 那句`, () => { expect(lineStep(0, 50, LINE_MIN_S)).toBe(1) })
    and('進度追上了就照進度', () => { expect(lineStep(2, 50, 5)).toBe(3) })
    and('不倒退', () => { expect(lineStep(3, 20, 5)).toBe(3) })
  })
  scenario('每一句的起點照順序往上，不會倒回去', ({ then }) => {
    then('起點一個比一個大', () => {
      for (let i = 1; i < LOADING_LINES.length; i++) expect(LOADING_LINES[i][0]).toBeGreaterThan(LOADING_LINES[i - 1][0])
    })
  })
})

// (item 592, the Tester's: at 45% it sat 8.6 s while the models were made ready, and looked stuck)
feature('載入進度在等的時候慢慢往前', () => {
  /** the shown percentage after `s` seconds of quarter-second steps from `from`, the real estimate given at each step's time */
  const after = (from: number, real: (t: number) => number, s: number) => {
    let v = from
    for (let t = 0.25; t <= s + 1e-9; t += 0.25) v = loadingStep(v, real(t), 0.25)
    return loadingPct(v)
  }
  scenario('真的進度一往前就跟上', ({ then }) => {
    then('從 30% 到真的 64%，馬上是 64%', () => { expect(loadingPct(loadingStep(0.3, 0.64, 0))).toBe(64) })
  })
  scenario('停著的時候照時間往上爬，越等越慢', ({ given, then, and }) => {
    const at = (s: number) => after(0.45, () => 0.45, s)
    given('真的進度停在 45%', () => { expect(loadingPct(loadingStep(0.45, 0.45, 0))).toBe(45) })
    then('等 2 秒有往前', () => { expect(at(2)).toBeGreaterThan(45) })
    and('等 8.6 秒更多，但前 4 秒爬的比後 4 秒多', () => {
      expect(at(8.5)).toBeGreaterThan(at(4))
      expect(at(4) - 45).toBeGreaterThan(at(8) - at(4))
    })
  })
  scenario('真的進度一點一點往前時，往上爬不會被打斷', ({ then }) => {
    then('檔案慢慢進來（每 0.25 秒多 0.02%），5 秒後比只算真的進度多出 3 個百分點以上', () => {
      const real = (t: number) => 0.5 + t * 0.0008
      expect(after(0.5, real, 5) - loadingPct(real(5))).toBeGreaterThanOrEqual(3)
    })
  })
  scenario('等再久也不會跑到下一段去', ({ then, and }) => {
    then('停在 45%，等一分鐘最多爬過剩下的兩成', () => {
      expect(after(0.45, () => 0.45, 60)).toBeLessThanOrEqual(Math.round((0.45 + CREEP_SPAN * 0.55) * 100))
    })
    and('永遠不到 100%', () => { expect(after(0.98, () => 0.99, 600)).toBe(99) })
  })
  scenario('不倒退', ({ then }) => {
    then('顯示著 60%，真的進度只有 50%，還是 60%', () => { expect(loadingPct(loadingStep(0.6, 0.5, 0))).toBe(60) })
  })
})
