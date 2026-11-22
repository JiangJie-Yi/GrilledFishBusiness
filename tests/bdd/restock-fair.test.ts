import { expect } from 'vitest'
import { feature, scenario } from './bdd'
import { FRIDGE_UNITS } from '@/shops/grill/bar'
import { CASE_SIZE, depthOf, emptyFillable, emptyFridge, emptyGaps, restockRun, startBack, takeFromPlace, type Back, type Places } from '@/game/drinkStock'
import { FRIDGE_SHORT, stockerChore } from '@/game/stocker'

// (the Tester window's random-state checks and evening simulation of item 541, made scenarios (item 547): seeded, the same every run)

/** a small seeded random (mulberry32) */
const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
/** the shop's two fridges as they are: each place's drink, shelf by shelf */
const homeOf = (u: number) => FRIDGE_UNITS[u].shelves.map((sh) => [...sh.ids] as string[])
const ALL_IDS = [...new Set(FRIDGE_UNITS.flatMap((u) => u.shelves.flatMap((sh) => sh.ids as string[])))]
const total = (p: Places) => p.counts.reduce((s, r) => s + r.reduce((a, b) => a + b, 0), 0)
const sumBack = (b: Back) => Object.values(b).reduce((a, c) => a + c, 0)

type Case = { home: string[][]; p: Places; back: Back; carry: number }
type Run = ReturnType<typeof restockRun>
/** a fridge to fill: three places in ten empty, most of the rest part-full of their own drink, a few holding another drink moved in by hand;
 * a back with a fifth of the drinks out of stock; a trip's carry of 1 to 30 */
function randomCase(R: () => number): Case {
  const home = homeOf(R() < 0.5 ? 0 : 1)
  const p = emptyFridge(home) as Places
  home.forEach((row, r) => row.forEach((id, k) => {
    const x = R()
    if (x < 0.3) return
    const drink = x < 0.92 ? id : ALL_IDS[Math.floor(R() * ALL_IDS.length)]
    p.rows[r][k] = drink
    p.counts[r][k] = 1 + Math.floor(R() * depthOf(drink))
  }))
  const back: Back = {}
  for (const id of ALL_IDS) back[id] = R() < 0.2 ? 0 : Math.floor(R() * 60)
  return { home, p, back, carry: 1 + Math.floor(R() * 30) }
}

/** a busy evening on the two fridges: each step a customer (by `rate`) takes one bottle from one of them (their share by `weights`), off
 * a place with any; every `every` steps the stocker's round (`choose` the fridge from each one's short and sold-out places), 8 a trip; the
 * shop orders a case of whatever the back's down to under one. How much of each fridge's places have something in them, on average; trips,
 * bottles moved; when each was first filled; trips for nothing */
function evening(choose: (short: number[], gaps: number[]) => number, { steps = 3000, every = 12, seed = 7, weights = [0.5, 0.5], rate = 0.8 } = {}) {
  const R = rng(seed)
  const homes = [homeOf(0), homeOf(1)]
  const ps: Places[] = homes.map((h) => emptyFridge(h) as Places)
  let back: Back = startBack()
  const stocked = [0, 0], trips = [0, 0], moved = [0, 0], first = [-1, -1]
  let wasted = 0
  for (let t = 0; t < steps; t++) {
    if (R() < rate) {
      const u = R() < weights[0] / (weights[0] + weights[1]) ? 0 : 1
      const any: [number, number][] = []
      ps[u].counts.forEach((row, r) => row.forEach((n, k) => { if (n > 0) any.push([r, k]) }))
      if (any.length) { const [r, k] = any[Math.floor(R() * any.length)]; takeFromPlace(ps[u], r, k) }
    }
    if (t % every === 0) {
      const short = ps.map((p, i) => emptyFillable(p, homes[i], back)), gaps = ps.map((p, i) => emptyGaps(p, homes[i], back))
      const u = choose(short, gaps)
      if (u >= 0) {
        const run = restockRun(ps[u], homes[u], back, 8)
        if (run.moved === 0) wasted++
        ps[u] = { rows: run.rows, counts: run.counts }
        back = run.back
        trips[u]++
        moved[u] += run.moved
        if (first[u] < 0) first[u] = t
      }
      for (const id of Object.keys(back)) if (back[id] < (CASE_SIZE[id] ?? 24)) back[id] += CASE_SIZE[id] ?? 24
    }
    ps.forEach((p, i) => { stocked[i] += p.counts.reduce((s, r) => s + r.filter((n) => n > 0).length, 0) / p.counts.reduce((s, r) => s + r.length, 0) })
  }
  return { stocked: stocked.map((a) => a / steps), trips, moved, wasted, first }
}
const calm = { rolls: { m: 1, f: 1 }, wcBusy: { m: false, f: false }, boxes: [100], seatTaken: () => false, spares: 0 }
/** the fridge the stocker goes to (game/stocker's), or -1 */
const newChoice = (short: number[], gaps: number[]) => { const c = stockerChore({ ...calm, fridgeShort: short, fridgeGaps: gaps }); return c?.kind === 'drinks' ? c.unit : -1 }
/** the choice before item 541, the control: the first three or more short */
const oldChoice = (short: number[]) => short.findIndex((n) => n >= FRIDGE_SHORT)
const shareOf = (trips: number[], u: number) => trips[u] / Math.max(1, trips[0] + trips[1])

feature('倉儲補飲料：一趟怎麼補、先去哪一台（第 541 項；Tester 視窗寫的亂數與整晚模擬，第 547 項改成情境）', () => {
  scenario('隨機 6,000 種櫃子各補一趟：帳對得上、不超過一趟與格深、別種飲料的格子不動、搬得盡量多、賣光的格子先補', ({ given, when, then, and }) => {
    given('兩台真實的冰箱格子，6,000 種隨機的剩量、換過飲料的格子、後場缺貨、一趟 1 到 30 瓶（固定種子）', (w) => {
      const R = rng(541)
      w.cases = Array.from({ length: 6000 }, () => randomCase(R))
    })
    when('每一種都補一趟', (w) => { w.runs = (w.cases as Case[]).map((c) => restockRun(c.p, c.home, c.back, c.carry)) })
    then('帳對得上：櫃子多的、後場少的，都等於搬的', (w) => {
      const cases = w.cases as Case[], runs = w.runs as Run[], bad: string[] = []
      cases.forEach((c, i) => {
        const r = runs[i]
        if (total({ rows: r.rows, counts: r.counts }) - total(c.p) !== r.moved) bad.push(`#${i} 櫃子多的不等於搬的`)
        if (sumBack(c.back) - sumBack(r.back) !== r.moved) bad.push(`#${i} 後場少的不等於搬的`)
        if (Object.values(r.back).some((n) => n < 0)) bad.push(`#${i} 後場變成負的`)
      })
      expect(bad.slice(0, 5)).toEqual([])
    })
    and('不超過一趟能拿的，也不超過每格放得下的', (w) => {
      const cases = w.cases as Case[], runs = w.runs as Run[], bad: string[] = []
      cases.forEach((c, i) => {
        const r = runs[i]
        if (r.moved > c.carry) bad.push(`#${i} 搬了 ${r.moved}，一趟只拿 ${c.carry}`)
        r.rows.forEach((row, rr) => row.forEach((id, k) => {
          const n = r.counts[rr][k]
          if (id === null && n !== 0) bad.push(`#${i} ${rr},${k} 沒飲料卻有 ${n}`)
          if (id && n > depthOf(id)) bad.push(`#${i} ${rr},${k} ${id} ${n} 超過格深`)
        }))
      })
      expect(bad.slice(0, 5)).toEqual([])
    })
    and('別種飲料佔著的格子不動', (w) => {
      const cases = w.cases as Case[], runs = w.runs as Run[], bad: string[] = []
      cases.forEach((c, i) => c.home.forEach((row, rr) => row.forEach((id, k) => {
        const was = c.p.rows[rr][k]
        if (was && was !== id && (runs[i].rows[rr][k] !== was || runs[i].counts[rr][k] !== c.p.counts[rr][k])) bad.push(`#${i} ${rr},${k} 放著別種的 ${was} 被動了`)
      })))
      expect(bad.slice(0, 5)).toEqual([])
    })
    and('搬的是一趟能拿的與補得進的較小者：能多搬就多搬，補得進就不空手', (w) => {
      const cases = w.cases as Case[], runs = w.runs as Run[], bad: string[] = []
      cases.forEach((c, i) => {
        const want = Math.min(c.carry, emptyFillable(c.p, c.home, c.back))
        if (runs[i].moved !== want) bad.push(`#${i} 搬了 ${runs[i].moved}，應該 ${want}`)
      })
      expect(bad.slice(0, 5)).toEqual([])
    })
    and('有賣光的格子（後場有它的貨）還空著時，不先去補沒放滿的', (w) => {
      const cases = w.cases as Case[], runs = w.runs as Run[], bad: string[] = []
      let toppedUp = 0
      cases.forEach((c, i) => {
        const r = runs[i]
        let topUp = false, gapLeft = false
        c.home.forEach((row, rr) => row.forEach((id, k) => {
          const was = c.p.counts[rr][k], now = r.counts[rr][k]
          if (was > 0 && now > was) topUp = true
          if (was === 0 && now === 0 && c.p.rows[rr][k] === null && (r.back[id] ?? 0) > 0) gapLeft = true
        }))
        if (topUp) { toppedUp++; if (gapLeft) bad.push(`#${i} 補了沒放滿的，賣光的格子還空著`) }
      })
      expect(bad.slice(0, 5)).toEqual([])
      // (and the check had something to see: trips that put all the sold-out places back and went on to top up (64 of the 6,000: a trip's
      // carry mostly goes on the sold-out places first))
      expect(toppedUp).toBeGreaterThan(30)
    })
  })

  scenario('挑哪一台：賣光的格子多的先，再看缺得多的，再先第一台；後場補得了的不到門檻就不跑', ({ then, and, but }) => {
    then('缺 9／6、賣光 0／6：第二台', () => { expect(newChoice([9, 6], [0, 6])).toBe(1) })
    and('缺 9／6、賣光 6／0：第一台', () => { expect(newChoice([9, 6], [6, 0])).toBe(0) })
    and('缺 6／9、賣光 3／3：缺得多的第二台', () => { expect(newChoice([6, 9], [3, 3])).toBe(1) })
    and('缺 5／5、賣光 2／2：第一台', () => { expect(newChoice([5, 5], [2, 2])).toBe(0) })
    and('缺 2／9：只有第二台過門檻', () => { expect(newChoice([2, 9], [0, 0])).toBe(1) })
    but(`缺 2／2、賣光 2／2：都不到 ${FRIDGE_SHORT} 瓶，先不跑`, () => { expect(newChoice([2, 2], [2, 2])).toBe(-1) })
  })

  scenario('忙碌的一晚，兩台真實的冰箱、一趟 8 瓶：舊的挑法第二台幾乎補不到；新的兩台都補到，沒有空手的一趟', ({ given, when, then, and }) => {
    given('營業 3,000 步：每步八成有客人從櫃子拿一瓶（兩台各半），倉儲每 12 步跑一趟，後場不到一箱就叫一箱（固定種子）', () => {})
    when('舊的挑法（當對照）與新的各過一晚；新的另外過客人偏 80／20、偏 20／80、客人少（三成）、客人很多（每步都有）的晚上', (w) => {
      w.old = evening((s) => oldChoice(s))
      w.even = evening(newChoice)
      w.leanFirst = evening(newChoice, { weights: [0.8, 0.2] })
      w.leanSecond = evening(newChoice, { weights: [0.2, 0.8] })
      w.slow = evening(newChoice, { rate: 0.3 })
      w.busy = evening(newChoice, { rate: 1 })
    })
    then('舊的：第二台分到的不到一成，架上有貨的比例不到第一台的六成', (w) => {
      expect(shareOf(w.old.trips, 1)).toBeLessThan(0.1)
      expect(w.old.stocked[1]).toBeLessThan(w.old.stocked[0] * 0.6)
    })
    and('新的、兩台客人一樣多：第二台至少分到四分之一的趟數', (w) => { expect(shareOf(w.even.trips, 1)).toBeGreaterThanOrEqual(0.25) })
    and('新的、第二台客人多（20／80）：第一台也還分得到一成', (w) => { expect(shareOf(w.leanSecond.trips, 0)).toBeGreaterThanOrEqual(0.1) })
    and('新的每一晚：兩台都補到，沒有一趟是空手的', (w) => {
      for (const k of ['even', 'leanFirst', 'leanSecond', 'slow', 'busy']) {
        expect(w[k].wasted, k).toBe(0)
        expect(w[k].trips[0], k).toBeGreaterThan(0)
        expect(w[k].trips[1], k).toBeGreaterThan(0)
      }
    })
    and('客人少的晚上，兩台架上都有一半以上的格子有貨', (w) => {
      expect(w.slow.stocked[0]).toBeGreaterThan(0.5)
      expect(w.slow.stocked[1]).toBeGreaterThan(0.5)
    })
  })
})
