import { expect } from 'vitest'
import { feature, scenario } from './bdd'
import { CARRY_BOWLS, WARE_ALL, WARE_LOW, WARE_WASH_AT, WASHER_BOWLS, cabinetAtStart, canFill, layPlace, leftAdded, leftBehind, lowOf, noWares, shortOf, sinkWareSays, takeForFill,
  wareIntoWasher, wareTotal, wareTrip, wareUrgent, wareWashNow, type Wares } from '@/game/ware'
import { TABLEWARE } from '@/game/tableware'
import { nextChore, type Dryer } from '@/game/plates'

const w = (p: Partial<Wares>): Wares => ({ ...noWares(), ...p })

feature('飯碗、湯碗、湯匙、筷子也要洗（店主 2026-11-23：「這些也都是要清洗的」）', () => {
  scenario('開店時：每個座位的筷架上一雙乾淨的筷子，其他的都洗好收在碗盤櫃', ({ then, and }) => {
    then('8 個座位：櫃裡的筷子少 8 雙，飯碗、湯碗、湯匙都在櫃裡', () => {
      expect(cabinetAtStart(8)).toEqual({ rice: TABLEWARE.riceBowls, soup: TABLEWARE.soupBowls, renge: TABLEWARE.spoons, chops: TABLEWARE.chopsticks - 8 })
    })
    and('加上座位上的 8 雙，全店的數字不變', () => {
      expect(wareTotal(cabinetAtStart(8), { chops: 8 })).toEqual(WARE_ALL)
    })
  })
  scenario('客人走了，用過的留在座位上等外場來收', ({ then, and, but }) => {
    then('有飯、有湯、吃過東西：一個飯碗、一個湯碗、一支湯匙、一雙筷子', () => {
      expect(leftBehind({ rice: true, soup: true, ate: true })).toEqual({ rice: 1, soup: 1, renge: 1, chops: 1 })
    })
    and('只有湯：湯碗跟它的湯匙', () => { expect(leftBehind({ rice: false, soup: true, ate: true })).toEqual({ rice: 0, soup: 1, renge: 1, chops: 1 }) })
    but('東西還沒來就生氣走了：筷子沒用過，留在筷架上不用洗', () => {
      expect(leftBehind({ rice: false, soup: false, ate: false })).toEqual(noWares())
    })
  })
  scenario('座位還沒收、下一位客人就坐下吃了：碗是各自的，筷子是筷架上同一雙，只算一雙', ({ then, and }) => {
    const first = leftBehind({ rice: true, soup: true, ate: true }), second = leftBehind({ rice: true, soup: false, ate: true })
    then('兩個飯碗、一個湯碗、一支湯匙、一雙筷子', () => { expect(leftAdded(first, second)).toEqual({ rice: 2, soup: 1, renge: 1, chops: 1 }) })
    and('座位上沒有留下的：照客人留下的算', () => { expect(leftAdded(noWares(), second)).toEqual(second) })
  })
  scenario('盛飯、盛湯要用櫃裡乾淨的碗，湯還要一支湯匙', ({ then, and, but }) => {
    then('櫃裡都有：飯、湯都能盛', () => { expect(canFill(cabinetAtStart(8))).toEqual({ rice: true, soup: true }) })
    and('盛一碗湯：湯碗、湯匙各少一個', () => {
      expect(takeForFill(w({ rice: 3, soup: 3, renge: 3, chops: 5 }), 'soup')).toEqual({ rice: 3, soup: 2, renge: 2, chops: 5 })
    })
    but('乾淨的飯碗用完了：飯要等洗好的飯碗', () => { expect(canFill(w({ soup: 2, renge: 2 })).rice).toBe(false) })
    but('湯碗還有、湯匙沒了：湯也要等', () => { expect(canFill(w({ rice: 2, soup: 2 })).soup).toBe(false) })
  })
  scenario('收完、擦完桌子，從櫃裡拿一雙乾淨的筷子擺回筷架', ({ then, but }) => {
    then('有乾淨的：擺上，櫃裡少一雙', () => { expect(layPlace(w({ chops: 3 }))).toEqual({ cab: w({ chops: 2 }), laid: true }) })
    but('一雙都沒有：座位先空著，等洗好的', () => { expect(layPlace(w({ rice: 4 })).laid).toBe(false) })
  })
})

feature('碗與餐具走洗碗機（瀝水籃整個寬度是盤子的梳架，碗跟餐具不手洗）', () => {
  scenario(`洗碗機除了盤子，另有放 ${WASHER_BOWLS} 個碗的碗架、和放全部筷子湯匙的餐具籃`, ({ then, and, but }) => {
    then('水槽有飯碗、湯碗：一次放一個碗進去，先放飯碗', () => {
      const r = wareIntoWasher(w({ rice: 2, soup: 1 }), noWares(), false)
      expect(r.moved).toBe('rice')
      expect(r.sink).toEqual(w({ rice: 1, soup: 1 }))
      expect(r.washer).toEqual(w({ rice: 1 }))
    })
    and('碗放完了：泡在桶裡的筷子、湯匙一次整把放進餐具籃', () => {
      const r = wareIntoWasher(w({ renge: 2, chops: 3 }), w({ rice: 2 }), false)
      expect(r.moved).toBe('cutlery')
      expect(r.washer).toEqual(w({ rice: 2, renge: 2, chops: 3 }))
      expect(r.sink).toEqual(noWares())
    })
    and(`碗架放滿 ${WASHER_BOWLS} 個：剩下的碗留在水槽等下一輪，筷子湯匙照樣放`, () => {
      const r = wareIntoWasher(w({ rice: 2, chops: 1 }), w({ rice: WASHER_BOWLS }), false)
      expect(r.moved).toBe('cutlery')
      expect(r.sink).toEqual(w({ rice: 2 }))
    })
    and('櫃裡的湯碗用完了：先放湯碗', () => {
      expect(wareIntoWasher(w({ rice: 1, soup: 1 }), noWares(), false, w({ rice: 5 })).moved).toBe('soup')
    })
    but('洗碗機正在洗、或洗好的還沒拿出來：什麼都不放', () => {
      expect(wareIntoWasher(w({ rice: 3 }), noWares(), true).moved).toBeNull()
    })
  })
  scenario(`水槽的碗累積到一架 ${WARE_WASH_AT} 個、或有一種用完了，就自己去洗`, ({ then, and, but }) => {
    const cab = w({ rice: 10, soup: 10, renge: 10, chops: 30 })
    then(`碗 ${WARE_WASH_AT} 個（洗碗機的碗架放得滿）：洗`, () => { expect(wareWashNow(w({ rice: WARE_WASH_AT - 2, soup: 2 }), cab)).toBe(true) })
    and('櫃裡沒有乾淨的筷子、水槽裡有：馬上洗', () => { expect(wareWashNow(w({ chops: 1 }), { ...cab, chops: 0 })).toBe(true) })
    but('不到一架、櫃裡都還有：等跟盤子一起洗（只為幾個碗開洗碗機，後來的盤子只能手洗）', () => { expect(wareWashNow(w({ rice: 2, soup: 2, renge: 2 }), cab)).toBe(false) })
    and('用完的那種在洗碗機裡洗好了：算急件', () => { expect(wareUrgent(w({ soup: 2 }), { ...cab, soup: 0 })).toBe(true) })
    and(`快用完了（飯碗剩 ${WARE_LOW.rice} 個以下、筷子剩 ${WARE_LOW.chops} 雙以下）也先洗，不等到一個都沒有`, () => {
      expect(wareWashNow(w({ rice: 1 }), { ...cab, rice: WARE_LOW.rice })).toBe(true)
      expect(lowOf({ ...cab, chops: WARE_LOW.chops })).toEqual(['chops'])
    })
    but('還夠用：照常等一架', () => { expect(wareUrgent(w({ rice: 1 }), { ...cab, rice: WARE_LOW.rice + 1 })).toBe(false) })
    and('用完的是哪幾種', () => { expect(shortOf(w({ rice: 2, chops: 1 }))).toEqual(['soup', 'renge']) })
  })
  scenario(`洗好的一趟最多端 ${CARRY_BOWLS} 個碗回碗盤櫃，筷子湯匙一次全帶`, ({ then, and }) => {
    then(`洗碗機裡 6 個飯碗、4 個湯碗、筷子 5 雙、湯匙 3 支：這趟 6 個飯碗、2 個湯碗，筷子湯匙全帶`, () => {
      expect(wareTrip(w({ rice: 6, soup: 4, chops: 5, renge: 3 }))).toEqual({ take: w({ rice: 6, soup: 2, chops: 5, renge: 3 }), left: w({ soup: 2 }) })
    })
    and('全部端完，數字對得上', () => {
      const from = w({ rice: 3, soup: 9, chops: 2 })
      const t = wareTrip(from)
      expect(wareTotal(t.take, t.left)).toEqual(from)
    })
  })
  scenario('水槽說得出裡面有什麼', ({ then, and }) => {
    then('飯碗 2、筷子 3', () => { expect(sinkWareSays(w({ rice: 2, chops: 3 }))).toBe('飯碗 2、筷子 3') })
    and('沒有：空字串', () => { expect(sinkWareSays(noWares())).toBe('') })
  })
})

feature('管洗碗的也照顧碗與餐具', () => {
  const idle: Dryer = { n: 0, left: null }
  const base = { duty: 'dish' as const, serve: false, dirty: 0, sink: 0, rack: 150, dryer: idle }
  scenario('水槽只有碗（沒有盤子）：碗夠多就去洗', ({ then, but }) => {
    then('碗夠一批：去洗', () => { expect(nextChore({ ...base, wares: { sink: WARE_WASH_AT, wash: true, washer: 0, urgent: false } })).toBe('wash') })
    but('只有一兩個、也不急：先不去', () => { expect(nextChore({ ...base, wares: { sink: 2, wash: false, washer: 0, urgent: false } })).toBeNull() })
  })
  scenario('洗碗機裡只有洗好的碗與餐具（沒有盤子）：也要拿出來', ({ then, and }) => {
    then('洗好了：去拿', () => { expect(nextChore({ ...base, dryer: { n: 0, left: 0 }, wares: { sink: 0, wash: false, washer: 5, urgent: false } })).toBe('unload') })
    and('櫃裡缺的那種在裡面：比收座位還優先', () => {
      expect(nextChore({ ...base, duty: 'all', dirty: 2, dryer: { n: 0, left: 0 }, wares: { sink: 0, wash: false, washer: 3, urgent: true } })).toBe('unload')
    })
  })
  scenario('櫃裡有一種一個都不剩、水槽或洗碗機裡有：管洗碗的先去處理，菜交給管外場的端', ({ then, and, but }) => {
    const out = { sink: 6, wash: true, washer: 0, urgent: true, out: true }
    then('有菜要端：管洗碗的還是先去洗', () => { expect(nextChore({ ...base, serve: true, wares: out })).toBe('wash') })
    and('洗碗機裡洗好了：先拿出來', () => { expect(nextChore({ ...base, serve: true, dryer: { n: 0, left: 0 }, wares: { ...out, sink: 0, washer: 6 } })).toBe('unload') })
    but('管外場的：照樣先端菜', () => { expect(nextChore({ ...base, duty: 'floor', serve: true, wares: out })).toBe('serve') })
    but('只有一位外場：先端菜', () => { expect(nextChore({ ...base, duty: 'all', serve: true, wares: out })).toBe('serve') })
  })
  scenario('盤子的流程不變（沒有碗與餐具時）', ({ then }) => {
    then('盤子 5 個：洗', () => { expect(nextChore({ ...base, sink: 5 })).toBe('wash') })
  })
})
