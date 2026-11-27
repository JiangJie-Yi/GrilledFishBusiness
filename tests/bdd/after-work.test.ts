import { expect } from 'vitest'
import { feature, scenario } from './bdd'
import { afterActs, afterDone, nightBond, nightOdds, type AfterDone } from '@/game/staff/afterWork'

const ids = (l: ReturnType<typeof afterActs>) => l.map((x) => x.act.id)

feature('下班後跟員工相處：住二樓的才有一起度過的時間，男女不同（第 770、796 項）', () => {
  scenario('沒住二樓的員工下班後，只能跟他道聲辛苦了，一天一次', ({ given, then, and }) => {
    let done: AfterDone = {}
    given('一位住外面的男員工，今天還沒道過辛苦', () => { expect(ids(afterActs({ female: false, lives: false, bond: 60 }, done, 5))).toEqual(['thanks']) })
    then('可以道聲辛苦了', () => { expect(afterActs({ female: false, lives: false, bond: 60 }, done, 5)[0].why).toBeNull() })
    and('道過之後今天就不行了，明天又可以', () => {
      done = afterDone(done, 'thanks', 5)
      expect(afterActs({ female: false, lives: false, bond: 60 }, done, 5)[0].why).toBe('done')
      expect(afterActs({ female: false, lives: false, bond: 60 }, done, 6)[0].why).toBeNull()
    })
  })
  scenario('住二樓的男員工跟女員工，能一起做的事不一樣', ({ then, and }) => {
    then('男的：喝一杯、下將棋、聽棒球', () => {
      expect(ids(afterActs({ female: false, lives: true, bond: 60 }, {}, 5))).toEqual(['thanks', 'beer', 'shogi', 'radio'])
    })
    and('女的：喝杯茶、請吃宵夜、聊家鄉', () => {
      expect(ids(afterActs({ female: true, lives: true, bond: 60 }, {}, 5))).toEqual(['thanks', 'tea', 'latebite', 'hometown'])
    })
  })
  scenario('一起度過的時間一晚一次，跟道辛苦分開算；感情還不夠的事要等熟一點', ({ given, then, and }) => {
    let done: AfterDone = {}
    given('一位住二樓、好感 40 的女員工', () => {
      const l = afterActs({ female: true, lives: true, bond: 40 }, done, 9)
      expect(l.find((x) => x.act.id === 'hometown')?.why).toBe('bond')
      expect(l.find((x) => x.act.id === 'tea')?.why).toBeNull()
    })
    then('陪她喝過茶，今晚其他一起的事都不行了，道辛苦還可以', () => {
      done = afterDone(done, 'tea', 9)
      const l = afterActs({ female: true, lives: true, bond: 40 }, done, 9)
      expect(l.filter((x) => x.act.dorm).every((x) => x.why === 'done')).toBe(true)
      expect(l.find((x) => x.act.id === 'thanks')?.why).toBeNull()
    })
    and('隔天晚上又可以', () => {
      expect(afterActs({ female: true, lives: true, bond: 40 }, done, 10).find((x) => x.act.id === 'tea')?.why).toBeNull()
    })
  })
  scenario('住二樓的人有時候晚上會自己來找老闆，越熟越常，住外面的不會', ({ then, and }) => {
    then('一百個晚上裡，好感 90 的比好感 20 的常來', () => {
      const n = (bond: number) => Array.from({ length: 400 }, (_, d) => nightBond({ id: 'staff-7', female: true, lives: true, bond }, d)).filter(Boolean).length
      expect(n(90)).toBeGreaterThan(n(20))
      expect(n(20) / 400).toBeGreaterThan(nightOdds(20) * 0.5)
    })
    and('來的時候加的好感是自己去找的一半，而且是自己會做的事', () => {
      for (let d = 0; d < 200; d++) {
        const b = nightBond({ id: 'staff-3', female: false, lives: true, bond: 80 }, d)
        if (!b) continue
        expect(['shogi', 'radio']).toContain(b.act.id)
        expect(b.bond).toBe(Math.max(1, Math.round(b.act.bond / 2)))
      }
    })
    and('住外面的從來不會', () => {
      expect(Array.from({ length: 200 }, (_, d) => nightBond({ id: 'staff-9', female: true, lives: false, bond: 100 }, d)).some(Boolean)).toBe(false)
    })
  })
})
