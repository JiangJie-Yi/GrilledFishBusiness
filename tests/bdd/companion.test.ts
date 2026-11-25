import { expect } from 'vitest'
import { feature, scenario } from './bdd'
import { COMPANION_AT, COMPANION_ASK_AGAIN, COMPANION_KEEP, answerStay, asksToStay, keepsHimCompany, staysCompanion, type Mate } from '@/game/staff/companion'
import { tonightWith, type Lodger } from '@/game/staff/nightTogether'

const her: Mate = { id: 'a', female: true, years: 26, bond: COMPANION_AT }

feature('好感夠高的女員工問能不能住下來，閉店時陪老闆、睡覺時一起上樓（第 696 項）', () => {
  scenario('誰會開口問', ({ then, and }) => {
    then('成年女員工、好感到門檻，二樓有位子就會問', () => { expect(asksToStay(her, 10, false, true)).toBe(true) })
    and('好感不夠、未成年、男員工都不會問', () => {
      expect(asksToStay({ ...her, bond: COMPANION_AT - 1 }, 10, false, true)).toBe(false)
      expect(asksToStay({ ...her, years: 19 }, 10, false, true)).toBe(false)
      expect(asksToStay({ ...her, female: false }, 10, false, true)).toBe(false)
    })
    and('二樓滿了不問；已經住二樓的照樣問', () => {
      expect(asksToStay(her, 10, false, false)).toBe(false)
      expect(asksToStay({ ...her, lives: true }, 10, false, false)).toBe(true)
    })
    and('已經有一位陪著老闆，別人不問；問了還沒回答的不再問', () => {
      expect(asksToStay(her, 10, true, true)).toBe(false)
      expect(asksToStay({ ...her, compAsk: 9 }, 10, false, true)).toBe(false)
    })
  })
  scenario('答應與拒絕', ({ then, and }) => {
    then('答應：住進二樓、成為陪伴，好感再加一點', () => {
      const m = answerStay(her, true, 10)
      expect(m.lives).toBe(true)
      expect(m.companion).toBe(true)
      expect(m.bond).toBeGreaterThan(her.bond)
      expect(staysCompanion(m)).toBe(true)
    })
    and('拒絕：有點受傷，一週內不再問', () => {
      const m = answerStay({ ...her, compAsk: 10 }, false, 10)
      expect(m.bond).toBeLessThan(her.bond)
      expect(m.companion).toBeFalsy()
      expect(asksToStay({ ...m, bond: COMPANION_AT }, 10 + COMPANION_ASK_AGAIN - 1, false, true)).toBe(false)
      expect(asksToStay({ ...m, bond: COMPANION_AT }, 10 + COMPANION_ASK_AGAIN, false, true)).toBe(true)
    })
    and('好感掉到門檻以下就不再是陪伴', () => {
      const m = answerStay(her, true, 10)
      expect(staysCompanion({ ...m, bond: COMPANION_KEEP })).toBe(true)
      expect(staysCompanion({ ...m, bond: COMPANION_KEEP - 1 })).toBe(false)
    })
  })
  scenario('閉店的白天在樓下陪老闆，營業中與睡覺時不在', ({ then, and }) => {
    then('閉店、醒著：在樓下', () => { expect(keepsHimCompany(answerStay(her, true, 1), false, false)).toBe(true) })
    and('營業中、睡覺時、不是陪伴：都不在', () => {
      const m = answerStay(her, true, 1)
      expect(keepsHimCompany(m, true, false)).toBe(false)
      expect(keepsHimCompany(m, false, true)).toBe(false)
      expect(keepsHimCompany(her, false, false)).toBe(false)
    })
  })
  scenario('睡覺時每晚一起上樓（不是看機率）', ({ then, and }) => {
    const lodgers: Lodger[] = [{ id: 'a', female: true, years: 26, lives: true, bond: 60 }, { id: 'b', female: true, years: 30, lives: true, bond: 95 }]
    then('有陪伴的話，每晚都是她，就算別人好感更高', () => {
      for (let day = 1; day <= 30; day++) expect(tonightWith(lodgers, day, () => 0.99, 'a')).toBe('a')
    })
    and('沒有陪伴的話照舊看機率', () => {
      expect(tonightWith(lodgers, 1, () => 0.99, null)).toBe(null)
      expect(tonightWith(lodgers, 1, () => 0, null)).toBe('b')
    })
  })
})
