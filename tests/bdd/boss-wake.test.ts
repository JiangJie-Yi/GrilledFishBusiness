import { expect } from 'vitest'
import { feature, scenario } from './bdd'
import { AWAKE_WAIT_MS, RELIE_S, SHAKE_GAP_MS, WAKE_SHAKES, relieBeat, shaken, shakenAwake, sleepsAgain } from '@/game/staff/bossStamina'

feature('搖醒睡著的老闆（第 750 項）', () => {
  scenario('搖一兩下不會醒，連搖三下才坐起來', ({ given, when, then, and }) => {
    let n = 0, at = -1e9
    const shake = (t: number) => { n = shaken(n, at, t); at = t }
    given('老闆睡著了', () => { n = 0; at = -1e9 })
    when('搖兩下，每下隔半秒', () => { shake(1000); shake(1500) })
    then('還沒醒（臉皺著繼續睡）', () => { expect(shakenAwake(n)).toBe(false) })
    and('再搖一下就坐起來', () => { shake(2000); expect(n).toBe(WAKE_SHAKES); expect(shakenAwake(n)).toBe(true) })
  })

  scenario('搖得太慢就重新算', ({ given, when, then }) => {
    let n = 0, at = -1e9
    const shake = (t: number) => { n = shaken(n, at, t); at = t }
    given('搖了兩下', () => { shake(0); shake(800) })
    when('隔太久才搖第三下', () => { shake(800 + SHAKE_GAP_MS + 1) })
    then('只算第一下，不會醒', () => { expect(n).toBe(1); expect(shakenAwake(n)).toBe(false) })
  })

  scenario('坐起來後三秒內沒給指令就躺回去睡', ({ given, then, and }) => {
    const awakeAt = 10_000
    given('老闆剛被搖醒、坐起來', () => {})
    then('兩秒多還在等', () => { expect(sleepsAgain(awakeAt, awakeAt + AWAKE_WAIT_MS - 1, false)).toBe(false) })
    and('滿三秒沒人叫他就躺回去', () => { expect(sleepsAgain(awakeAt, awakeAt + AWAKE_WAIT_MS, false)).toBe(true) })
    and('有人叫他（點他、開店）就不會躺回去', () => { expect(sleepsAgain(awakeAt, awakeAt + 10_000, true)).toBe(false) })
  })

  scenario('躺回去：先躺下、再拉被子，然後睡著', ({ then, and }) => {
    then('一開始在躺下', () => { expect(relieBeat(0).phase).toBe('lie') })
    and('躺下後拉被子', () => { expect(relieBeat(RELIE_S.lie + 0.01).phase).toBe('cover') })
    and('都做完就睡著', () => { expect(relieBeat(RELIE_S.lie + RELIE_S.cover + 0.01).phase).toBe('asleep') })
  })
})
