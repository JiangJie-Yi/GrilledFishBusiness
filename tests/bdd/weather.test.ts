import { expect } from 'vitest'
import { feature, scenario } from './bdd'
import { RAIN_EASE, businessDay, flowFor, rainAt, rainGear, showerGap, weatherOf, type Weather } from '@/game/world/weather'

const days = Array.from({ length: 600 }, (_, i) => i + 1)

feature('天氣（第 623 項）', () => {
  scenario('每天的天氣固定，一段日子裡晴、陰、雨都有，雨天約六分之一', ({ given, then, and }) => {
    given('六百天', (w) => { w.ws = days.map((d) => weatherOf(d)) })
    then('同一天問兩次一樣', () => { expect(weatherOf(42)).toEqual(weatherOf(42)) })
    and('晴、陰、雨都有', (w) => { for (const s of ['clear', 'cloudy', 'rain']) expect((w.ws as Weather[]).some((x) => x.sky === s)).toBe(true) })
    and('雨天大約一成到兩成五', (w) => {
      const rain = (w.ws as Weather[]).filter((x) => x.sky === 'rain').length / days.length
      expect(rain).toBeGreaterThan(0.1)
      expect(rain).toBeLessThan(0.25)
    })
  })

  scenario('雨天整晚下雨；陰天偶爾一陣雨，慢慢下大、慢慢停', ({ given, then, and }) => {
    given('一個雨天、一個有陣雨的陰天', (w) => {
      w.rainDay = weatherOf(days.find((d) => weatherOf(d).sky === 'rain')!)
      w.showerDay = weatherOf(days.find((d) => weatherOf(d).showers.length && weatherOf(d).sky === 'cloudy')!)
    })
    then('雨天開店到打烊都在下', (w) => { for (const m of [17 * 60, 20 * 60, 23 * 60 + 30, 2 * 60, 4 * 60]) expect(rainAt(w.rainDay as Weather, m)).toBeGreaterThan(0.3) })
    and('陣雨：之前沒下，剛開始小、幾分鐘後大，快停時又小，停了就沒有', (w) => {
      const s = (w.showerDay as Weather).showers[0], m = (x: number) => (x >= 24 * 60 ? x - 24 * 60 : x)
      expect(rainAt(w.showerDay as Weather, m(s.from - 5))).toBe(0)
      expect(rainAt(w.showerDay as Weather, m(s.from + 1))).toBeLessThan(rainAt(w.showerDay as Weather, m(s.from + RAIN_EASE + 2)))
      expect(rainAt(w.showerDay as Weather, m(s.to - 2))).toBeLessThan(rainAt(w.showerDay as Weather, m(s.from + RAIN_EASE + 2)))
      expect(rainAt(w.showerDay as Weather, m(s.to + 1))).toBe(0)
    })
  })

  scenario('過了午夜還是同一個營業日的天氣', ({ then, and }) => {
    then('凌晨兩點算前一天', () => { expect(businessDay(8, 2 * 60)).toBe(7) })
    and('晚上八點算當天', () => { expect(businessDay(8, 20 * 60)).toBe(8) })
  })

  scenario('下雨的日子開店是「雨天」的客流；不下雨的日子不會抽到雨天', ({ then, and }) => {
    then('雨天：雨天的客流', () => { for (let n = 0; n < 14; n++) expect(flowFor(n, 'rain')).toBe('rainy') })
    and('晴、陰：從來不是雨天', () => { for (let n = 0; n < 14; n++) { expect(flowFor(n, 'clear')).not.toBe('rainy'); expect(flowFor(n, 'cloudy')).not.toBe('rainy') } })
  })

  scenario('陣雨的時候客人來得慢一點；雨天的客流本身已經算了雨', ({ given, then, and }) => {
    given('一個有陣雨的陰天、一個雨天', (w) => {
      w.showerDay = weatherOf(days.find((d) => weatherOf(d).showers.length && weatherOf(d).sky === 'cloudy')!)
      w.rainDay = weatherOf(days.find((d) => weatherOf(d).sky === 'rain')!)
    })
    then('陣雨下得最大時，客人間隔拉長', (w) => {
      const s = (w.showerDay as Weather).showers[0], mid = Math.round((s.from + s.to) / 2) % (24 * 60)
      expect(showerGap(w.showerDay as Weather, mid)).toBeGreaterThan(1.15)
    })
    and('雨天：不再另外拉長', (w) => { expect(showerGap(w.rainDay as Weather, 20 * 60)).toBe(1) })
  })

  scenario('下雨時進門的客人多半帶傘、一些穿雨衣、少數什麼都沒有；不下雨時都沒有', ({ given, then, and }) => {
    given('兩百位客人在大雨中進門', (w) => { w.gear = Array.from({ length: 200 }, (_, i) => rainGear(i + 1, 0.9)) })
    then('帶傘的最多', (w) => {
      const g = w.gear as ReturnType<typeof rainGear>[]
      const n = (x: ReturnType<typeof rainGear>) => g.filter((y) => y === x).length
      expect(n('umbrella')).toBeGreaterThan(n('coat'))
      expect(n('coat')).toBeGreaterThan(0)
      expect(n(null)).toBeGreaterThan(0)
    })
    and('沒下雨：沒有人帶', () => { for (let i = 1; i < 50; i++) expect(rainGear(i, 0)).toBe(null) })
  })

  scenario('開店第一天一定是晴天（第一天有引導，不要一開始就是雨天的冷清）', ({ then }) => {
    then('第一天晴、沒有陣雨', () => {
      expect(weatherOf(1).sky).toBe('clear')
      expect(weatherOf(1).showers.length).toBe(0)
    })
  })

  scenario('天氣不會一連好幾天都一樣：連號的日子各抽各的', ({ given, then }) => {
    given('兩千天', (w) => { w.ws = Array.from({ length: 2000 }, (_, i) => weatherOf(i + 2)) })
    then('最長連續同一種天氣不超過 14 天，雨天在一成三到兩成一之間', (w) => {
      let run = 0, most = 0, prev = ''
      for (const x of w.ws as Weather[]) { run = x.sky === prev ? run + 1 : 1; prev = x.sky; most = Math.max(most, run) }
      expect(most).toBeLessThanOrEqual(14)
      const rain = (w.ws as Weather[]).filter((x) => x.sky === 'rain').length / 2000
      expect(rain).toBeGreaterThan(0.13)
      expect(rain).toBeLessThan(0.21)
    })
  })
})
