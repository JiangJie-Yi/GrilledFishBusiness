import { expect } from 'vitest'
import { feature, scenario } from './bdd'
import { dayGoal, goalBonus, goalProgress, goalStreak, GOAL_BONUS_MAX, GOAL_BONUS_STEP, GOAL_FIRST } from '@/game/dayGoal'
import { addDay, type DaySummary } from '@/game/daySummary'

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

  // (item 650, the owner's 「達標會有甚麼好處」: met, word of it goes round, and the next day more come in; more the more days running)
  scenario('達標的隔天口碑傳開，客人來得多一點；連續達標越多天越多，有上限', ({ given, then, and }) => {
    given('一天達標', (w) => { w.days = [{ day: 1, revenue: 5000, made: true }] })
    then('連續一天，隔天客人多 5%', (w) => {
      expect(goalStreak(w.days)).toBe(1)
      expect(goalBonus(goalStreak(w.days))).toBeCloseTo(GOAL_BONUS_STEP)
    })
    and('連續三天，多 15%', () => {
      expect(goalBonus(goalStreak([1, 2, 3].map((d) => ({ day: d, revenue: 5000, made: true }))))).toBeCloseTo(0.15)
    })
    and('再多天也不超過上限', () => {
      expect(goalBonus(goalStreak([1, 2, 3, 4, 5, 6, 7, 8].map((d) => ({ day: d, revenue: 5000, made: true }))))).toBeCloseTo(GOAL_BONUS_MAX)
    })
  })

  scenario('沒達標的那天斷掉，連續從頭算；沒記錄的舊存檔不算達標', ({ then, and }) => {
    then('最近一天沒達標：連續 0 天、沒有口碑', () => {
      const days = [{ day: 1, revenue: 5000, made: true }, { day: 2, revenue: 5000, made: true }, { day: 3, revenue: 900, made: false }]
      expect(goalStreak(days)).toBe(0)
      expect(goalBonus(goalStreak(days))).toBe(0)
    })
    and('中間斷過：只算最近的那一段', () => {
      expect(goalStreak([{ day: 1, revenue: 5000, made: true }, { day: 2, revenue: 900, made: false }, { day: 3, revenue: 5000, made: true }, { day: 4, revenue: 5000, made: true }])).toBe(2)
    })
    and('結算順序亂了也照日子算', () => {
      expect(goalStreak([{ day: 4, revenue: 5000, made: true }, { day: 3, revenue: 5000, made: true }, { day: 2, revenue: 900, made: false }])).toBe(2)
    })
    and('舊的記錄沒有達標這一欄：當作沒達標', () => { expect(goalStreak([{ day: 1, revenue: 5000 }])).toBe(0) })
  })

  scenario('一天的結算記下那天的目標與有沒有達標；同一天開兩次店，有一次達標就算', ({ given, then, and }) => {
    given('一天的結算', (w) => {
      w.sum = { revenue: 3000, profit: 1000, guests: 10, stars: 4, best: null, overtime: 0, wage: 500 } as unknown as DaySummary
    })
    then('記下目標與達標', (w) => {
      const days = addDay([], 1, w.sum as DaySummary, undefined, { goal: 2500, made: true })
      expect(days[0].goal).toBe(2500)
      expect(days[0].made).toBe(true)
    })
    and('同一天第二次沒達標，仍算達標', (w) => {
      const once = addDay([], 1, w.sum as DaySummary, undefined, { goal: 2500, made: true })
      const twice = addDay(once, 1, w.sum as DaySummary, undefined, { goal: 2500, made: false })
      expect(twice[0].made).toBe(true)
    })
  })
})
