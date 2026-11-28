import { expect } from 'vitest'
import { feature, scenario } from './bdd'
import { DISHES } from '@/data/menu'
import { LEAN_PAR, NEW_SHOP_FROZEN, PAR, autoOpeningOrder, inPacks, keeperEvery, type Stock } from '@/game/money/economy'
import { BUY_AHEAD, OPEN_AT, buyingNow } from '@/game/world/hours'
import { storageOf } from '@/data/storage'
import type { Entry } from '@/data/recipes'

// (item 630, the owner's 「很容易浪費食材，自動模式下要改良」: the manager (自動營運) topped every good the shop sells up to ten before
// opening, on the menu or not, and the chilled and the ambient went off before they were used; item 343's lean rule kept only by the stock
// keeper. And the keeper's rounds went by the clock on the wall: at x2 one round in an hour and a half of the shop's)
const grill = DISHES.find((d) => d.id === 'grilledfish')!
const entryOf = (id: string): Entry => ({ key: id, shop: 'grilledfish', name: id, ja: id, price: 100, parts: [{ id, dabs: [], name: id, ja: id }] })

feature('自動營運開店前的補貨：照菜單、會壞的少量', () => {
  scenario('倉庫是空的，菜單上有鯖魚、雞肉串、馬鈴薯', ({ given, when, then, and }) => {
    given('冷凍、冷藏、常溫各一道', (w) => {
      expect([storageOf('Mackerel'), storageOf('Yakitori'), storageOf('Potato')]).toEqual(['frozen', 'chilled', 'ambient'])
      w.menu = [entryOf('Mackerel'), entryOf('Yakitori'), entryOf('Potato')]
    })
    when('自動營運開店前叫貨', (w) => { w.o = autoOpeningOrder(grill, w.menu, {} as Stock, 1e9) })
    then('冷凍的鯖魚補到標準量', (w) => { expect(w.o.buy.Mackerel).toBe(inPacks('Mackerel', PAR)) })
    and(`冷藏的雞肉串只買 ${LEAN_PAR.chilled} 份（湊整包）`, (w) => { expect(w.o.buy.Yakitori).toBe(inPacks('Yakitori', LEAN_PAR.chilled)) })
    and(`常溫的馬鈴薯只買 ${LEAN_PAR.ambient} 份（湊整包）`, (w) => { expect(w.o.buy.Potato).toBe(inPacks('Potato', LEAN_PAR.ambient)) })
    and('菜單上沒有的不買', (w) => { for (const id of ['Saury', 'PorkBelly', 'SweetPotato']) expect(w.o.buy[id]).toBeUndefined() })
  })
})

feature('自動營運開店前，菜單還沒做好（新開局）', () => {
  scenario('庫存與菜單都是空的：每樣食材少量買一點，讓廚師有得挑來做菜單', ({ when, then, and }) => {
    when('自動營運開店前叫貨', (w) => { w.o = autoOpeningOrder(grill, [], {} as Stock, 1e9, false) })
    // (item 787: to PAR, ten of every fish the shop sells, those the menu didn't take went off two days on)
    then(`冷凍的鯖魚也只買 ${NEW_SHOP_FROZEN} 份（湊整包）：菜單做好以後，菜單上的才補到標準量`, (w) => { expect(w.o.buy.Mackerel).toBe(inPacks('Mackerel', NEW_SHOP_FROZEN)) })
    and(`冷藏的雞肉串只買 ${LEAN_PAR.chilled} 份（湊整包）`, (w) => { expect(w.o.buy.Yakitori).toBe(inPacks('Yakitori', LEAN_PAR.chilled)) })
    and(`常溫的馬鈴薯只買 ${LEAN_PAR.ambient} 份（湊整包）`, (w) => { expect(w.o.buy.Potato).toBe(inPacks('Potato', LEAN_PAR.ambient)) })
    and('店裡賣的每樣食材都有買到', (w) => { for (const g of grill.items) expect(w.o.buy[g.id] ?? 0).toBeGreaterThan(0) })
  })
  scenario('已經有一點的不再買', ({ when, then }) => {
    when('雞肉串已經有 5 份', (w) => { w.o = autoOpeningOrder(grill, [], { Yakitori: 5 } as Stock, 1e9, false) })
    then('雞肉串不買', (w) => { expect(w.o.buy.Yakitori).toBeUndefined() })
  })
})

// (item 787, the owner's 「幫我測一下自動模式可以撐幾天」: bought from six in the morning on, after a night's close, the chilled was half
// gone by the opening and thrown out the morning after, and ordered again at once, every day)
feature('什麼時候進貨：開店前一個半小時起，到收店為止', () => {
  scenario('營業時間 16:30 到 04:30', ({ then, and }) => {
    then(`開店前 ${BUY_AHEAD} 分鐘（15:00）起就可以進貨`, () => { expect(buyingNow(OPEN_AT - BUY_AHEAD)).toBe(true); expect(buyingNow(15 * 60)).toBe(true) })
    and('14:59 以前不進貨', () => { expect(buyingNow(14 * 60 + 59)).toBe(false); expect(buyingNow(11 * 60)).toBe(false) })
    and('營業中（深夜也是）照樣進貨', () => { expect(buyingNow(20 * 60)).toBe(true); expect(buyingNow(2 * 60)).toBe(true) })
    and('收店以後（04:30 起）到隔天下午都不進貨', () => { expect(buyingNow(4 * 60 + 30)).toBe(false); expect(buyingNow(6 * 60)).toBe(false) })
  })
})

feature('倉儲巡貨照店裡的時間', () => {
  scenario('不累、手腳普通（速度 50）的倉儲', ({ then, and }) => {
    then('×1：每 30 秒巡一次', () => { expect(keeperEvery(50, 0, 1)).toBe(30) })
    and('×2：現實時間 15 秒巡一次（店裡的時間一樣）', () => { expect(keeperEvery(50, 0, 2)).toBe(15) })
    and('累了（疲勞 50）慢一半', () => { expect(keeperEvery(50, 50, 1)).toBe(45) })
  })
})
