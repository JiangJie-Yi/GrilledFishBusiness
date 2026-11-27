import { expect } from 'vitest'
import { feature, scenario } from './bdd'
import { groundWet } from '@/game/world/puddles'
import { weatherOf } from '@/game/world/weather'

/** the first day from `from` whose sky is `sky` (and, for a cloudy one, with a shower when `shower`) */
function dayWith(sky: 'clear' | 'cloudy' | 'rain', shower = false, from = 2) {
  for (let d = from; d < from + 2000; d++) {
    const w = weatherOf(d)
    if (w.sky === sky && (!shower || w.showers.length > 0) && (sky !== 'clear' || weatherOf(d - 1).sky === 'clear') && (sky !== 'rain' || (weatherOf(d + 1).sky === 'clear'))) return d
  }
  throw new Error(`no ${sky} day`)
}

feature('店外的地面下過雨會濕、會積水坑，雨停後慢慢乾（第 752 項）', () => {
  scenario('前一天和當天都是晴天，整天沒有水坑，地也是乾的', ({ given, then }) => {
    let day = 0
    given('一個前後都晴的日子', () => { day = dayWith('clear'); expect(weatherOf(day - 1).sky).toBe('clear') })
    then('營業時間裡每個時刻都沒有水坑', () => {
      for (const m of [13 * 60, 17 * 60, 20 * 60, 23 * 60]) {
        const g = groundWet(day, m)
        expect(g.puddles).toBe(0)
        expect(g.damp).toBe(0)
      }
    })
  })
  scenario('陣雨下起來，地先濕，水坑慢一點才積起來', ({ given, then, and }) => {
    let day = 0, from = 0
    given('一個傍晚有陣雨的陰天', () => { day = dayWith('cloudy', true); from = weatherOf(day).showers[0].from })
    then('雨下 15 分鐘時，地已經濕了大半，水坑還在積', () => {
      const g = groundWet(day, (from + 15) % 1440)
      expect(g.damp).toBeGreaterThan(0.5)
      expect(g.puddles).toBeLessThan(g.damp)
      expect(g.puddles).toBeGreaterThan(0)
    })
    and('雨下得越久水坑越滿', () => {
      expect(groundWet(day, (from + 35) % 1440).puddles).toBeGreaterThan(groundWet(day, (from + 15) % 1440).puddles)
    })
  })
  scenario('雨停以後水坑還在一陣子，幾個小時後才乾，地比水坑先乾', ({ given, then, and }) => {
    let day = 0, to = 0, peak = 0
    given('陣雨剛停', () => {
      day = dayWith('cloudy', true)
      to = weatherOf(day).showers[0].to
      peak = groundWet(day, to % 1440).puddles
      expect(peak).toBeGreaterThan(0.3)
    })
    then('停了一小時，水坑還在', () => {
      const t = to + 60, g = groundWet(day + Math.floor(t / 1440), t % 1440)
      expect(g.puddles).toBeGreaterThan(peak * 0.4)
    })
    and('停了八小時，水坑乾了；地在那之前就乾了', () => {
      const t = to + 8 * 60, g = groundWet(day + Math.floor(t / 1440), t % 1440)
      expect(g.puddles).toBe(0)
      const t2 = to + 3 * 60, g2 = groundWet(day + Math.floor(t2 / 1440), t2 % 1440)
      expect(g2.damp).toBeLessThan(g2.puddles + 1e-9)
    })
  })
  scenario('下了一整天的雨，第二天中午雨停時水坑是滿的，下午慢慢乾', ({ given, then, and }) => {
    let day = 0
    given('一個雨天', () => { day = dayWith('rain') })
    then('那晚水坑是滿的', () => { expect(groundWet(day, 22 * 60).puddles).toBeGreaterThan(0.95) })
    and('隔天中午剛停還很多，到傍晚少很多', () => {
      const noon = groundWet(day + 1, 12 * 60 + 10).puddles, eve = groundWet(day + 1, 17 * 60).puddles
      expect(noon).toBeGreaterThan(0.8)
      expect(eve).toBeLessThan(noon * 0.4)
    })
  })
})
