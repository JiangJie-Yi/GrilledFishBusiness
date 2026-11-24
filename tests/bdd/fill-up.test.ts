import { expect } from 'vitest'
import { feature, scenario } from './bdd'
import { FILL_MIN, FILL_S, fillToward, landed } from '@/game/stock/fillUp'

/** frames of 1/60 s until `shown` reaches `want`: how many seconds, and how many went in each frame at most */
const run = (from: number, want: number, all: number) => {
  let s = from, t = 0, most = 0
  while (Math.floor(s) < want && t < 10) {
    const next = fillToward(s, want, all, 1 / 60)
    most = Math.max(most, landed(s, next))
    s = next
    t += 1 / 60
  }
  return { t, most }
}

feature('倉庫的麻袋、木箱、籃子補貨時一顆一顆裝進去（第 607 項）', () => {
  scenario('空袋子一下子補滿：不是一格就滿，大約一秒裝滿', ({ given, then, and }) => {
    given('一袋 36 顆的馬鈴薯，從空補到滿', (w) => { w.r = run(0, 36, 36) })
    then('大約一秒裝滿（不是一格）', (w) => { const r = w.r as ReturnType<typeof run>; expect(r.t).toBeGreaterThan(FILL_S * 0.8); expect(r.t).toBeLessThan(FILL_S * 1.2) })
    and('每一格最多進去一兩顆', (w) => { expect((w.r as ReturnType<typeof run>).most).toBeLessThanOrEqual(2) })
  })

  scenario('少量補貨也看得到一顆一顆進去，每秒至少 9 顆', ({ given, then }) => {
    given('一籃 6 顆的番茄，從 2 顆補到 6 顆', (w) => { w.r = run(2, 6, 6) })
    then('4 顆在半秒內進去', (w) => { expect((w.r as ReturnType<typeof run>).t).toBeLessThanOrEqual(4 / FILL_MIN + 0.02) })
  })

  scenario('用掉的時候馬上少；剛打開頁面時照庫存畫，不演裝進去', ({ then, and }) => {
    then('用掉一顆：下一格就少一顆', () => { expect(fillToward(20, 19, 36, 1 / 60)).toBe(19) })
    and('還沒畫過（-1）：直接是庫存的數', () => { expect(fillToward(-1, 30, 36, 1 / 60)).toBe(30); expect(landed(-1, 30)).toBe(0) })
  })
})
