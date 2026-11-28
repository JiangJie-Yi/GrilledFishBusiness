import { expect } from 'vitest'
import { feature, scenario } from './bdd'
import { HOLD_MAX, NEXT_WAIT, STAY_MAX, gaveUpOnNext, holdsOn, overstayed } from '@/game/guests/stay'

// (item 207, the owner's: 「是否有客人站位置太久，需制定用餐時間」: a customer sat on two hours and more, waiting on a dish that was long in
// coming, and their stool was nobody else's)
feature('用餐時間（第 207 項）', () => {
  scenario('坐滿用餐時間就結帳離開，沒上的退錢', ({ then, and }) => {
    then(`用餐時間是 ${STAY_MAX} 分鐘`, () => { expect(STAY_MAX).toBe(100) })
    and('坐了 99 分鐘還沒到', () => { expect(overstayed(0, 99)).toBe(false) })
    and('坐了 100 分鐘就到了', () => { expect(overstayed(10, 110)).toBe(true) })
  })
})

// (item 630, the owner's 「客人很容易等太久……很容易浪費食材」: one who'd had a dish got up after 25 minutes of the shop's with nothing before
// them, though the rest of what they'd ordered was on the fire: the most refunded of all, and what came off for them eaten by the staff)
feature('吃過一道之後，等下一道（第 630 項）', () => {
  scenario('已經吃到東西的客人，下一道 40 分鐘內來都等', ({ then, and, but }) => {
    then(`等下一道最多 ${NEXT_WAIT} 分鐘`, () => { expect(NEXT_WAIT).toBe(40) })
    and('上一道吃完（開始吃後 8 分鐘）再等 39 分鐘：還在等', () => { expect(gaveUpOnNext(0, 8 + 39)).toBe(false) })
    but('等滿 40 分鐘：結帳離開，沒上的退錢', () => { expect(gaveUpOnNext(0, 8 + 40.5)).toBe(true) })
  })
})

// (items 1005 and its own, the Tester window's 874 and 877: a tokkuri set down the minute its customer was sent off; then, held for what was
// on its way, they got up the minute it came, uneaten, and one sat 35 minutes for a soup that stood 44 at the counter)
feature('東西在路上、擺上了、正在吃時，客人先吃完再走（第 1005 項）', () => {
  scenario('菜、飯湯、清酒已經擺上還沒動，或正在吃配菜：一定先吃完', ({ then, and }) => {
    then('擺上了就留下來吃', () => { expect(holdsOn({ setDown: true, eatingSide: false, coming: false, heldFor: 999 })).toBe(true) })
    and('正在吃配菜也一樣', () => { expect(holdsOn({ setDown: false, eatingSide: true, coming: false, heldFor: 999 })).toBe(true) })
  })
  scenario(`還在路上的：最多多留 ${HOLD_MAX} 分鐘`, ({ then, but, and }) => {
    then(`本來該走了 ${HOLD_MAX - 1} 分鐘，菜還在路上：再等等`, () => { expect(holdsOn({ setDown: false, eatingSide: false, coming: true, heldFor: HOLD_MAX - 1 })).toBe(true) })
    but(`過了 ${HOLD_MAX} 分鐘還沒來：照樣結帳走，座位讓出來`, () => { expect(holdsOn({ setDown: false, eatingSide: false, coming: true, heldFor: HOLD_MAX })).toBe(false) })
    and('什麼都沒在路上：照原本的時間走', () => { expect(holdsOn({ setDown: false, eatingSide: false, coming: false, heldFor: 0 })).toBe(false) })
  })
})
