import { expect } from 'vitest'
import { feature, scenario } from './bdd'
import { DRINK_DEFAULT, DRINK_MAX, DRINK_MIN, WARM_AT, driftDrinkTemp, servedWarm, stepDrinkTemp } from '@/game/fridgeTemp'

feature('飲料櫃的溫度（第 615 項）', () => {
  scenario('預設 4℃，一次調一度，調不出 1～8℃', ({ then, and }) => {
    then('一開始設定在 4℃', () => { expect(DRINK_DEFAULT).toBe(4) })
    and('調冷一度、調暖一度', () => { expect(stepDrinkTemp(4, -1)).toBe(3); expect(stepDrinkTemp(4, 1)).toBe(5) })
    and('最冷 1℃、最暖 8℃', () => { expect(stepDrinkTemp(DRINK_MIN, -1)).toBe(DRINK_MIN); expect(stepDrinkTemp(DRINK_MAX, 1)).toBe(DRINK_MAX) })
  })

  scenario('門開一下下還是冰的；開太久溫度上升，飲料不冰', ({ given, when, then, and }) => {
    given('設定 4℃，櫃裡 4℃', (w) => { w.t = 4 })
    when('門開 5 秒', (w) => { for (let i = 0; i < 50; i++) w.t = driftDrinkTemp(w.t, 4, true, 0.1) })
    then('變暖一點，但還是冰的', (w) => { expect(w.t).toBeGreaterThan(4); expect(servedWarm(w.t)).toBe(false) })
    and('再開 30 秒：超過 10℃，拿出來的飲料不冰', (w) => {
      for (let i = 0; i < 300; i++) w.t = driftDrinkTemp(w.t, 4, true, 0.1)
      expect(w.t).toBeGreaterThan(WARM_AT)
      expect(servedWarm(w.t)).toBe(true)
    })
  })

  scenario('門關上後慢慢降回設定溫度', ({ given, when, then }) => {
    given('櫃裡已經 14℃', (w) => { w.t = 14 })
    when('關著 90 秒', (w) => { for (let i = 0; i < 900; i++) w.t = driftDrinkTemp(w.t, 4, false, 0.1) })
    then('回到 4℃', (w) => { expect(Math.round(w.t)).toBe(4) })
  })
})
