import { expect } from 'vitest'
import { feature, scenario } from './bdd'
import { CHANCE_HIGH, CHANCE_LOW, TOGETHER_AT, TOGETHER_BOND, afterTogether, bedFit, mayShare, nightRoll, togetherChance, tonightWith, type Lodger } from '@/game/nightTogether'

const her = (o: Partial<Lodger> = {}): Lodger => ({ id: 'w1', female: true, years: 26, lives: true, bond: 90, ...o })

feature('住在二樓的女員工，睡覺時間有機率跟老闆恩愛（第 637 項）', () => {
  scenario('只有住在二樓、成年的女員工，好感到門檻才有可能', ({ then, and }) => {
    then('住二樓、成年、女生、好感到門檻：有可能', () => { expect(mayShare(her({ bond: TOGETHER_AT }))).toBe(true) })
    and('好感差一點：不會', () => { expect(mayShare(her({ bond: TOGETHER_AT - 1 }))).toBe(false) })
    and('沒住二樓：不會', () => { expect(mayShare(her({ lives: false }))).toBe(false) })
    and('男員工、未滿二十歲：不會', () => {
      expect(mayShare(her({ female: false }))).toBe(false)
      expect(mayShare(her({ years: 19 }))).toBe(false)
    })
  })

  scenario('越喜歡老闆，機率越高', ({ then, and }) => {
    then('門檻上是低的機率，100 是高的機率', () => {
      expect(togetherChance(TOGETHER_AT)).toBeCloseTo(CHANCE_LOW, 5)
      expect(togetherChance(100)).toBeCloseTo(CHANCE_HIGH, 5)
    })
    and('門檻以下沒有機會', () => { expect(togetherChance(TOGETHER_AT - 1)).toBe(0) })
    and('好感越高機率越高', () => { expect(togetherChance(95)).toBeGreaterThan(togetherChance(85)) })
  })

  scenario('同一晚上下樓幾次結果都一樣，不能一直重試', ({ given, then }) => {
    const staff = [her({ bond: 88 })]
    given('同一晚問很多次', () => {})
    then('每次答案都一樣', () => {
      const first = tonightWith(staff, 41)
      for (let i = 0; i < 5; i++) expect(tonightWith(staff, 41)).toBe(first)
      expect(nightRoll('w1', 41)).toBe(nightRoll('w1', 41))
    })
  })

  scenario('有好幾位符合時，跟最喜歡老闆的那位；骰子說不就誰都沒有', ({ given, then, and }) => {
    const staff = [her({ id: 'a', bond: 84 }), her({ id: 'b', bond: 97 }), her({ id: 'c', bond: 99, lives: false })]
    given('兩位住二樓的女員工好感夠，另一位更喜歡但沒住二樓', () => {})
    then('骰子小：跟住二樓裡最喜歡老闆的那位', () => { expect(tonightWith(staff, 3, () => 0)).toBe('b') })
    and('骰子大：今晚沒有', () => { expect(tonightWith(staff, 3, () => 0.99)).toBe(null) })
    and('沒有人符合：沒有', () => { expect(tonightWith([her({ bond: 50 })], 3, () => 0)).toBe(null) })
  })

  scenario('隔天早上她的好感再升一點，不會超過 100', ({ then, and }) => {
    then('好感上升', () => { expect(afterTogether(90)).toBe(90 + TOGETHER_BOND) })
    and('最多 100', () => { expect(afterTogether(99.5)).toBe(100) })
  })

  scenario('二樓：老闆躺在空間多的那一側，被子只往有空的地方放寬，不蓋到隔壁的被褥、不穿牆、不伸到樓梯口', ({ given, then, and }) => {
    // (the room upstairs as it is: the wall at -1.75, the stair's well from 0.95; the two futons at -1.12 and 0.02, the quilt 1.04 wide)
    const half = 0.52, wall = -1.75, well = 0.95
    given('兩條被褥都鋪著', () => {})
    then('她在右邊那條：往右（樓梯口那邊）有空，老闆躺右邊，被子往右放寬，不超過樓梯口', () => {
      const f = bedFit(0.02, half, wall, well, [{ x: -1.12, laid: true }])
      expect(f.sd).toBe(1)
      expect(0.02 + half + f.extra).toBeLessThanOrEqual(well)
      expect(0.02 - half - f.extraHer).toBeGreaterThanOrEqual(-1.12 + half)
    })
    and('她在左邊那條、右邊也鋪著：兩邊都只剩一點，被子放寬不碰到隔壁、不穿牆', () => {
      const f = bedFit(-1.12, half, wall, well, [{ x: 0.02, laid: true }])
      const lo = -1.12 - half - (f.sd < 0 ? f.extra : f.extraHer), hi = -1.12 + half + (f.sd > 0 ? f.extra : f.extraHer)
      expect(lo).toBeGreaterThanOrEqual(wall)
      expect(hi).toBeLessThanOrEqual(0.02 - half)
    })
    and('隔壁沒鋪：往隔壁那邊放寬，兩人離得開一點', () => {
      const f = bedFit(-1.12, half, wall, well, [{ x: 0.02, laid: false }])
      expect(f.sd).toBe(1)
      expect(f.extra).toBeCloseTo(0.36, 5)
      expect(f.side).toBeCloseTo(0.19, 5)
    })
  })
})
