import { expect } from 'vitest'
import { feature, scenario } from './bdd'
import { tipFor, tipShown, TIPS } from '@/game/dailyTip'

// (item 175: from the second day, one thing worth finding a day, while the shop's shut)
feature('每天一個「今天可以試試」', () => {
  scenario('第一天沒有提示，那天有第一天的引導', ({ then }) => {
    then('第 1 天沒有', () => { expect(tipFor(1, [])).toBeNull() })
  })
  scenario('第二天起照順序一天一個', ({ then, and }) => {
    then('第 2 天是自己烤魚', () => { expect(tipFor(2, [])).toBe('grill') })
    and('看過烤魚以後，下一天是供御神酒', () => { expect(tipFor(3, ['grill'])).toBe('altar') })
  })
  scenario('跳過沒看的那天，隔天還是從還沒看過的開始', ({ given, then }) => {
    given('第 2 天沒看提示（沒開遊戲）', (w) => { w.seen = [] })
    then('第 5 天打開還是先看烤魚', (w) => { expect(tipFor(5, w.seen)).toBe('grill') })
  })
  scenario('全部看過就不再出現', ({ then }) => {
    then('看過全部以後沒有提示', () => { expect(tipFor(9, [...TIPS])).toBeNull() })
  })
  scenario('只在打烊時、當天還沒收起來、前面沒有別的東西時出現', ({ given, then, and, but }) => {
    given('第 3 天的提示是供酒', (w) => { w.base = { tip: 'altar' as const, open: false, dismissedDay: null, day: 3, busy: false } })
    then('打烊時出現', (w) => { expect(tipShown(w.base)).toBe(true) })
    and('營業中不出現', (w) => { expect(tipShown({ ...w.base, open: true })).toBe(false) })
    and('當天收起來以後不再出現', (w) => { expect(tipShown({ ...w.base, dismissedDay: 3 })).toBe(false) })
    but('結算單或引導在前面時先不出現', (w) => { expect(tipShown({ ...w.base, busy: true })).toBe(false) })
    and('隔天又出現（下一個提示）', (w) => { expect(tipShown({ ...w.base, dismissedDay: 3, day: 4 })).toBe(true) })
  })
})
