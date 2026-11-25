import { expect } from 'vitest'
import { feature, scenario } from './bdd'
import { tagPlace, tagSplit } from '@/game/kitchen/menuTags'

const plain = (n: number) => Array.from({ length: n }, () => false)

feature('牆上的菜單木牌：兩排平均、置中，分類頭牌跟它的菜在同一排（第 716 項）', () => {
  scenario('放得下一排就只排一排', ({ then }) => {
    then('17 片以內全在第一排', () => { expect(tagSplit(plain(9), 17)).toBe(9); expect(tagSplit(plain(17), 17)).toBe(17) })
  })
  scenario('兩排時平均分，不是上排塞滿、下排一點點', ({ then, and }) => {
    then('25 片沒有頭牌：13 與 12', () => { expect(tagSplit(plain(25), 17)).toBe(13) })
    and('34 片：17 與 17', () => { expect(tagSplit(plain(34), 17)).toBe(17) })
    and('每排都不超過 17 片', () => {
      for (let n = 18; n <= 34; n++) { const s = tagSplit(plain(n), 17); expect(s).toBeLessThanOrEqual(17); expect(n - s).toBeLessThanOrEqual(17) }
    })
  })
  scenario('換排落在分類的交界：頭牌開始第二排', ({ then, and }) => {
    then('中間附近有分類開頭，就從那裡換排', () => {
      const heads = plain(25); heads[0] = true; heads[11] = true; heads[20] = true
      expect(tagSplit(heads, 17)).toBe(11)
    })
    and('中間前後 3 片內沒有分類開頭，就平均分', () => {
      const heads = plain(25); heads[0] = true; heads[3] = true; heads[22] = true
      expect(tagSplit(heads, 17)).toBe(13)
    })
  })
  scenario('每片的位置：第一排從頭數，第二排從換排那片重新數', ({ then }) => {
    then('換排在 13：第 12 片是第一排第 12 欄，第 13 片是第二排第 0 欄', () => {
      expect(tagPlace(12, 13)).toEqual({ row: 0, col: 12 })
      expect(tagPlace(13, 13)).toEqual({ row: 1, col: 0 })
      expect(tagPlace(20, 13)).toEqual({ row: 1, col: 7 })
    })
  })
})
