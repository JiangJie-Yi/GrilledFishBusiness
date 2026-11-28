import { expect } from 'vitest'
import { feature, scenario } from './bdd'
import { AUTO_SWEEP_LOW, AUTO_SWEEP_MIN, autoSweep, drawerTotal, openingFloat, takeTakings } from '@/game/money/till'

// (item 822, the owner's 「幫我測一下自動模式可以撐幾天」: the auto-run never took the takings out of the register's drawer; on its seventh day
// it had no cash to buy in with (NT$68,000 in the drawer), sold out, and stopped)
feature('自動營運把收銀機的營收收回現金', () => {
  scenario('打烊以後：抽屜裡有營收就收', ({ then, and }) => {
    then('有 1 元營收也收', () => { expect(autoSweep(false, 50000, 1)).toBe(true) })
    and('沒有營收（只剩零用金）不收', () => { expect(autoSweep(false, 50000, 0)).toBe(false) })
  })
  scenario('營業中：現金不夠時才收', ({ then, and }) => {
    then(`現金 ${AUTO_SWEEP_LOW} 以上不收`, () => { expect(autoSweep(true, AUTO_SWEEP_LOW, 20000)).toBe(false) })
    and(`現金不到 ${AUTO_SWEEP_LOW}、營收至少 ${AUTO_SWEEP_MIN}：收`, () => { expect(autoSweep(true, AUTO_SWEEP_LOW - 1, AUTO_SWEEP_MIN)).toBe(true) })
    and(`營收不到 ${AUTO_SWEEP_MIN} 先不收`, () => { expect(autoSweep(true, 0, AUTO_SWEEP_MIN - 1)).toBe(false) })
  })
  scenario('收的時候留下找零用的零用金', ({ given, when, then }) => {
    given('抽屜裡是零用金加 7,300 元營收', (w) => {
      const d = openingFloat()
      d[1000] = (d[1000] ?? 0) + 7; d[100] = (d[100] ?? 0) + 3
      w.d = d
    })
    when('經理收營收', (w) => { w.r = takeTakings(w.d) })
    then('收走 7,300，抽屜剩零用金', (w) => { expect(w.r.amount).toBe(7300); expect(drawerTotal(w.r.drawer)).toBe(drawerTotal(openingFloat())) })
  })
})
