import { expect } from 'vitest'
import { feature, scenario } from './bdd'
import { pullAtOf } from '@/game/kitchen/chefFlow'
import { PULL_LEAST, ROAST_STAGES } from '@/data/menu'

// (item 841, the Tester window's: a skilled chef with a gift took the fish off the fire half cooked, and the customer it was set before
// wouldn't eat it)
feature('主廚下火的熟度（第 841 項）', () => {
  scenario('不管主廚多厲害，菜都要熟了才下火', ({ then, and }) => {
    const done = ROAST_STAGES.find((s) => s.key === 'done')!
    const halfEnd = ROAST_STAGES.find((s) => s.key === 'half')!.until
    then('能力超過 1（技能 95、天才 ×1.3、感情好）也不會在半熟時下火', () => { expect(pullAtOf(1.235)).toBeGreaterThanOrEqual(halfEnd); expect(pullAtOf(1.6)).toBeGreaterThanOrEqual(PULL_LEAST) })
    and('下火的熟度落在「熟了」那一段', () => { for (const e of [0.3, 0.7, 1, 1.3, 2]) { expect(pullAtOf(e)).toBeGreaterThanOrEqual(1); expect(pullAtOf(e)).toBeLessThan(done.until) } })
    and('手越好越接近剛熟（沒把握的人多烤一下）', () => { expect(pullAtOf(0.5)).toBeGreaterThan(pullAtOf(0.9)) })
  })
})
