import { expect } from 'vitest'
import { evenRows, seamUnit } from '@/scene/props/edoPatterns'
import { feature, scenario } from './bdd'

feature('江戶花紋鋪成貼圖不會有接縫', () => {
  scenario('一張圖的寬剛好是整數個花紋（接著重複時花紋接得上）', ({ given, then, and }) => {
    let u = 0
    given('256 寬的圖、想要每個花紋約 60', () => { u = seamUnit(256, 60) })
    then('橫向剛好 4 個', () => { expect(256 / u).toBe(4) })
    and('每個花紋大小離想要的不遠', () => { expect(Math.abs(u - 60)).toBeLessThan(10) })
  })
  scenario('圖比一個花紋還小，也至少放一個', ({ then }) => {
    then('寬 20、花紋 64：一個 20 寬的', () => { expect(seamUnit(20, 64)).toBe(20) })
  })
  scenario('一排對一排錯開半個的花紋（青海波、麻の葉、格紋），直向一定是偶數排', ({ then, and }) => {
    then('高 256、每排約 15：偶數排', () => { expect(evenRows(256, 15) % 2).toBe(0) })
    and('高很小也有兩排', () => { expect(evenRows(5, 64)).toBe(2) })
    and('排高乘排數剛好是整張的高', () => { const n = evenRows(300, 21); expect((300 / n) * n).toBeCloseTo(300, 9) })
  })
})
