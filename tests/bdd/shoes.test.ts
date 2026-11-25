import { expect } from 'vitest'
import { feature, scenario } from './bdd'
import { readShoeKey, shoeKey, shoeOf, SHOE_KINDS, SHOE_PALETTE } from '@/game/guests/shoes'
import { kindOf } from '@/data/guests'

/** the first customer id (from 1) of a kind */
const idOf = (kind: string) => { for (let id = 1; id < 5000; id++) if (kindOf(id).kind === kind) return id; throw new Error(kind) }

feature('客人的鞋子：照身分穿不同款式、各有顏色（第 712 項）', () => {
  scenario('穿什麼看是誰', ({ then, and }) => {
    then('上班族穿皮鞋', () => { expect(shoeOf(idOf('salaryman')).kind).toBe('leather') })
    and('OL 穿高跟鞋', () => { expect(shoeOf(idOf('officeLady')).kind).toBe('pump') })
    and('老奶奶穿草履', () => { expect(shoeOf(idOf('grandma')).kind).toBe('zori') })
    and('魚市場的人穿靴子', () => { expect(shoeOf(idOf('marketWorker')).kind).toBe('boot') })
    and('大學生穿運動鞋', () => { expect(shoeOf(idOf('collegeStudent')).kind).toBe('sneaker') })
  })
  scenario('顏色是那一款自己的，同一位客人每次都一樣', ({ then, and }) => {
    then('每位客人的顏色都在那一款的配色裡', () => {
      for (let id = 1; id < 300; id++) { const s = shoeOf(id); expect(SHOE_PALETTE[s.kind]).toContain(s.colour) }
    })
    and('同一位客人兩次一樣', () => { expect(shoeOf(42)).toEqual(shoeOf(42)) })
    and('一百位客人裡五款都有人穿', () => {
      const seen = new Set(Array.from({ length: 100 }, (_, i) => shoeOf(i + 1).kind))
      for (const k of SHOE_KINDS) expect(seen.has(k)).toBe(true)
    })
  })
  scenario('鞋櫃記得是哪一雙', ({ then, and }) => {
    then('寫進去再讀回來一樣', () => { expect(readShoeKey(shoeKey(7))).toEqual(shoeOf(7)) })
    and('以前只記顏色的，讀成那個顏色的運動鞋', () => { expect(readShoeKey('#2a2220')).toEqual({ kind: 'sneaker', colour: '#2a2220' }) })
  })
})
