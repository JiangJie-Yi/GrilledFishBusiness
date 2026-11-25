import { expect } from 'vitest'
import { feature, scenario } from './bdd'
import { GIFTS, TASTE_BOND, canGiftToday, giftOk, giftResult, giftTaste, type Giftee } from '@/game/staff/gifts'

const ROLES = ['chef', 'sous', 'server', 'cashier', 'stock']
const people: Giftee[] = Array.from({ length: 300 }, (_, i) => ({ id: `w${i}`, female: i % 2 === 0, years: 18 + ((i * 7) % 45), role: ROLES[i % 5] }))
const warm = (t: string) => t === 'love' || t === 'like'

feature('送禮給員工（第 696 項）', () => {
  scenario('每個人對禮物各有喜好，同一個人每次一樣', ({ then, and }) => {
    then('同一個人、同一樣禮物，每次的反應一樣', () => {
      for (const w of people.slice(0, 40)) for (const g of GIFTS) expect(giftTaste(w, g.id)).toBe(giftTaste({ ...w }, g.id))
    })
    and('四種反應都有人有', () => {
      const seen = new Set(people.flatMap((w) => GIFTS.map((g) => giftTaste(w, g.id))))
      expect([...seen].sort()).toEqual(['dislike', 'like', 'love', 'meh'])
    })
    and('女員工比男員工更喜歡髮簪', () => {
      const n = (f: boolean) => people.filter((w) => w.female === f && warm(giftTaste(w, 'hairpin'))).length
      expect(n(true)).toBeGreaterThan(n(false) * 2)
    })
    and('廚師比外場更喜歡磨刀石', () => {
      const share = (cook: boolean) => {
        const ws = people.filter((w) => (w.role === 'chef' || w.role === 'sous') === cook)
        return ws.filter((w) => warm(giftTaste(w, 'whetstone'))).length / ws.length
      }
      expect(share(true)).toBeGreaterThan(share(false))
    })
  })
  scenario('送的東西越合心意，好感加得越多；不喜歡的會扣', ({ then, and }) => {
    then('很喜歡 > 喜歡 > 普通 > 0，不喜歡是負的', () => {
      expect(TASTE_BOND.love).toBeGreaterThan(TASTE_BOND.like)
      expect(TASTE_BOND.like).toBeGreaterThan(TASTE_BOND.meh)
      expect(TASTE_BOND.meh).toBeGreaterThan(0)
      expect(TASTE_BOND.dislike).toBeLessThan(0)
    })
    and('跟上次送同一樣，反應降一級（不喜歡的還是不喜歡）', () => {
      for (const w of people.slice(0, 60)) for (const g of GIFTS) {
        const first = giftResult(w, g.id), again = giftResult(w, g.id, g.id)
        expect(again.again).toBe(true)
        if (first.taste === 'dislike') expect(again.taste).toBe('dislike')
        else expect(again.bond).toBeLessThanOrEqual(first.bond)
        if (first.taste === 'love') expect(again.taste).toBe('like')
      }
    })
    and('上次送的是別的，這次照常', () => { const w = people[3]; expect(giftResult(w, 'tea', 'flowers').taste).toBe(giftTaste(w, 'tea')) })
  })
  scenario('一天只能送一次；未成年的不送酒', ({ then, and }) => {
    then('今天送過了就不能再送，明天可以', () => {
      expect(canGiftToday({ giftDay: 5 }, 5)).toBe(false)
      expect(canGiftToday({ giftDay: 5 }, 6)).toBe(true)
      expect(canGiftToday({}, 1)).toBe(true)
    })
    and('十九歲不能送清酒，二十歲可以；其他禮物都可以', () => {
      const w = { id: 'k', female: false, years: 19, role: 'server' }
      expect(giftOk(w, 'sake')).toBe(false)
      expect(giftOk({ ...w, years: 20 }, 'sake')).toBe(true)
      for (const g of GIFTS) if (g.id !== 'sake') expect(giftOk(w, g.id)).toBe(true)
    })
  })
})
