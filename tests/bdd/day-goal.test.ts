import { expect } from 'vitest'
import { feature, scenario } from './bdd'
import { dayGoal, goalProgress, GOAL_FIRST } from '@/game/dayGoal'

// (item 175, the owner's: those who don't care for games should want to play a little longer: each day a target for its takings, a little
// past the day before, shown while the shop's open and cheered as it's passed)
feature('每天的營業額小目標', () => {
  scenario('第一天的目標是固定的一個小數字', ({ given, then }) => {
    given('還沒有任何一天的結算', (w) => { w.goal = dayGoal([]) })
    then('目標是 GOAL_FIRST', (w) => { expect(w.goal).toBe(GOAL_FIRST) })
  })
  scenario('之後每天比前一天多一成，進位到百元', ({ given, then }) => {
    given('前一天的營業額 4,321 元', (w) => { w.goal = dayGoal([{ day: 1, revenue: 4321 }]) })
    then('今天的目標是 4,800 元', (w) => { expect(w.goal).toBe(4800) })
  })
  scenario('看的是最近的那一天，不是最早的', ({ given, then }) => {
    given('第一天 2,000 元、第二天 9,000 元', (w) => { w.goal = dayGoal([{ day: 1, revenue: 2000 }, { day: 2, revenue: 9000 }]) })
    then('第三天的目標照 9,000 算：9,900 元', (w) => { expect(w.goal).toBe(9900) })
  })
  scenario('前一天生意差，目標不會低於第一天的', ({ given, then }) => {
    given('前一天只賺 300 元', (w) => { w.goal = dayGoal([{ day: 1, revenue: 300 }]) })
    then('目標還是 GOAL_FIRST', (w) => { expect(w.goal).toBe(GOAL_FIRST) })
  })
  scenario('生意差的一天之後，隔天的目標跟著降下來，追得上', ({ given, then }) => {
    given('第一天 8,000 元、第二天只有 2,000 元（下大雨）', (w) => {
      w.goal = dayGoal([{ day: 1, revenue: 8000 }, { day: 2, revenue: 2000 }])
    })
    then('第三天的目標是 2,200 元，不是 8,800 元', (w) => { expect(w.goal).toBe(2200) })
  })
  scenario('結算的順序亂了也照日子算最近的一天', ({ given, then }) => {
    given('第二天的結算排在第一天前面', (w) => { w.goal = dayGoal([{ day: 2, revenue: 5000 }, { day: 1, revenue: 1000 }]) })
    then('照第二天算：5,500 元', (w) => { expect(w.goal).toBe(5500) })
  })
  scenario('今天賺到目標就算達成，進度不超過滿格', ({ given, then, and }) => {
    given('目標 4,800 元', (w) => { w.goal = 4800 })
    then('賺到 2,400 元時進度一半、還沒達成', (w) => {
      const p = goalProgress(w.goal, 2400)
      expect(p.share).toBeCloseTo(0.5)
      expect(p.reached).toBe(false)
    })
    and('賺到 5,000 元時達成、進度滿格', (w) => {
      const p = goalProgress(w.goal, 5000)
      expect(p.reached).toBe(true)
      expect(p.share).toBe(1)
    })
  })
})
