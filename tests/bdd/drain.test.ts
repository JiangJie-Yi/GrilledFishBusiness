import { expect } from 'vitest'
import { feature, scenario } from './bdd'
import { DRAIN_MAX, DRAIN_WAY, drainTick, newDrain, pour, type DrainState } from '@/game/world/drain'
import { USES } from '@/game/money/utilities'

/** run the drain on `secs` seconds a frame at a time (60 a second), adding up what ran out */
function run(s: DrainState, secs: number) {
  let litres = 0, most = 0
  for (let i = 0; i < Math.round(secs * 60); i++) {
    const before = s.slugs.reduce((p, g) => p + g.left, 0)
    drainTick(s, 1 / 60)
    litres += before - s.slugs.reduce((p, g) => p + g.left, 0)
    most = Math.max(most, s.flow)
  }
  return { litres, most }
}

feature('店裡用了水，過一下子就從後面的排水口流出來（第 764 項）', () => {
  scenario('沖一次馬桶：幾秒後排水口才出水，流掉的水等於沖掉的水', ({ given, when, then, and }) => {
    let s: DrainState
    given('排水口沒有水在流', () => { s = newDrain(); expect(s.flow).toBe(0) })
    when('男廁沖了一次馬桶', () => { pour(s, 'flush') })
    then('水還在管子裡走的那幾秒，管口沒有水', () => {
      run(s, DRAIN_WAY.flush.delay - 0.2)
      expect(s.flow).toBe(0)
    })
    and('之後一陣水流出來，流完的總量是沖掉的 6 公升，然後停', () => {
      const r = run(s, 20)
      expect(r.litres).toBeCloseTo(USES.flush.litres, 3)
      expect(r.most).toBeGreaterThan(0.8)
      expect(s.slugs.length).toBe(0)
      run(s, 10)
      expect(s.flow).toBe(0)
    })
  })
  scenario('洗手是細細的一道，比沖馬桶小得多', ({ given, then }) => {
    let a: ReturnType<typeof run>, b: ReturnType<typeof run>
    given('一次洗手、另一邊一次沖水', () => {
      const s1 = newDrain(); pour(s1, 'handwash'); a = run(s1, 30)
      const s2 = newDrain(); pour(s2, 'flush'); b = run(s2, 30)
    })
    then('洗手最大的水流不到沖水的四分之一，總量是 1.5 公升', () => {
      expect(a.most).toBeLessThan(b.most / 4)
      expect(a.litres).toBeCloseTo(USES.handwash.litres, 3)
    })
  })
  scenario('廚房洗碗的水走得比較遠，比廁所晚到', ({ given, then }) => {
    let s: DrainState
    given('同時洗一個盤子、沖一次馬桶', () => { s = newDrain(); pour(s, 'dish'); pour(s, 'flush') })
    then('廁所的水先到，洗碗的水晚幾秒才到', () => {
      expect(DRAIN_WAY.dish.delay).toBeGreaterThan(DRAIN_WAY.flush.delay)
      run(s, DRAIN_WAY.flush.delay + 0.5)
      expect(s.flow).toBeGreaterThan(0)
      expect(s.slugs.some((g) => g.at > s.t)).toBe(true)
    })
  })
  scenario('一下子用很多水，管子一次排不完，排得比較久', ({ given, then }) => {
    let s: DrainState
    given('兩間廁所同時沖水、又在洗碗、又在洗手', () => {
      s = newDrain(); pour(s, 'flush'); pour(s, 'flush'); pour(s, 'handwash'); pour(s, 'washlet')
    })
    then('流量不超過管子的上限，水一滴不少', () => {
      const r = run(s, 60)
      expect(r.most).toBeLessThanOrEqual(DRAIN_MAX + 1e-9)
      expect(r.litres).toBeCloseTo(USES.flush.litres * 2 + USES.handwash.litres + USES.washlet.litres, 3)
    })
  })
  scenario('水瓢澆在炭上的水不會從排水口出來', ({ given, then }) => {
    let s: DrainState
    given('用了一次水瓢', () => { s = newDrain(); pour(s, 'dipper') })
    then('排水口一直沒水', () => { expect(run(s, 30).litres).toBe(0); expect(s.slugs.length).toBe(0) })
  })
  scenario('出過水的石頭和格柵是濕的，過幾分鐘才慢慢乾', ({ given, then, and }) => {
    let s: DrainState
    given('沖完一次馬桶、水剛流完', () => { s = newDrain(); pour(s, 'flush'); run(s, 15) })
    then('還是濕的', () => { expect(s.wet).toBeGreaterThan(0.85) })
    and('五分鐘後乾了大半', () => { run(s, 300); expect(s.wet).toBeLessThan(0.25) })
  })
  scenario('水龍頭一直開著，排水口一直有細細的水，不是一陣一陣', ({ given, then }) => {
    let s: DrainState
    given('洗手台的水龍頭開著（每秒記一次那一分鐘的六十分之一）', () => {
      s = newDrain()
      for (let i = 0; i < 40; i++) { pour(s, 'wcTap', 1 / 60); drainTick(s, 1) }
    })
    then('排水口的水流一直在，起伏很小', () => {
      const flows: number[] = []
      for (let i = 0; i < 20; i++) { pour(s, 'wcTap', 1 / 60); for (let f = 0; f < 60; f++) { drainTick(s, 1 / 60); if (f % 15 === 0) flows.push(s.flow) } }
      expect(Math.min(...flows)).toBeGreaterThan(0.04)
      expect(Math.max(...flows) - Math.min(...flows)).toBeLessThan(0.05)
    })
  })
})
