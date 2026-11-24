import { expect } from 'vitest'
import { feature, scenario } from './bdd'
import { PASTIME_MIN, TV_CHANNELS, TV_FREE, nextChannel, pastimeOf, tvNow, tvSwitched, upstairsDoing, type TvHold } from '@/game/staff/dormTv'

feature('二樓的電視（第 612、613 項）', () => {
  scenario('樓上有人想看就開著，沒人想看就關著', ({ given, then, and }) => {
    given('沒有人按過電視', (w) => { w.hold = TV_FREE })
    then('有人坐下來想看：開著', (w) => { expect(tvNow(w.hold as TvHold, true).on).toBe(true) })
    and('沒有人想看（沒人在、都睡了、都在玩掌機或喝茶）：關著', (w) => { expect(tvNow(w.hold as TvHold, false).on).toBe(false) })
  })

  scenario('玩家關掉的電視，要等樓上的情況變了才會再自己打開', ({ given, when, then, and }) => {
    given('有人在看，電視開著', (w) => { w.hold = TV_FREE; w.r = tvNow(w.hold as TvHold, true); expect((w.r as { on: boolean }).on).toBe(true) })
    when('玩家把它關掉', (w) => { w.hold = tvSwitched(true, true) })
    then('那個人還想看，電視還是關著', (w) => {
      const r = tvNow(w.hold as TvHold, true)
      expect(r.on).toBe(false)
      w.hold = r.hold
    })
    and('那個人去睡了（沒人想看）：照樓上的情況關著，玩家的那一下不再算', (w) => {
      const r = tvNow(w.hold as TvHold, false)
      expect(r.on).toBe(false)
      expect(r.hold.manual).toBe(null)
      w.hold = r.hold
    })
    and('隔天又有人坐下來想看：自己打開', (w) => { expect(tvNow(w.hold as TvHold, true).on).toBe(true) })
  })

  scenario('沒人在的時候玩家打開的電視，一直開著，直到有人來看、再沒人看', ({ given, when, then, and }) => {
    given('樓上沒人', (w) => { w.hold = TV_FREE })
    when('玩家打開', (w) => { w.hold = tvSwitched(false, false) })
    then('開著', (w) => { const r = tvNow(w.hold as TvHold, false); expect(r.on).toBe(true); w.hold = r.hold })
    and('有人坐下來看：照樣開著，交給樓上的情況', (w) => { const r = tvNow(w.hold as TvHold, true); expect(r.on).toBe(true); expect(r.hold.manual).toBe(null); w.hold = r.hold })
    and('那個人去睡了：關掉', (w) => { expect(tvNow(w.hold as TvHold, false).on).toBe(false) })
  })

  scenario('想看電視的人，電視被關掉就拿出掌機玩；在喝茶的人，電視開著就跟著看', ({ then, and }) => {
    then('想看、電視開著：看電視', () => { expect(upstairsDoing('tv', true)).toBe('watch') })
    and('想看、電視關著：玩掌機', () => { expect(upstairsDoing('tv', false)).toBe('handheld') })
    and('在玩掌機的：不管電視', () => { expect(upstairsDoing('handheld', true)).toBe('handheld'); expect(upstairsDoing('handheld', false)).toBe('handheld') })
    and('喝茶的：電視開著就看，關著就喝茶', () => { expect(upstairsDoing('table', true)).toBe('watch'); expect(upstairsDoing('table', false)).toBe('table') })
  })

  scenario('每個人一晚上會換著做，同一段時間問幾次都一樣', ({ given, then, and }) => {
    given('一位住宿的員工，一整天 36 段', (w) => { w.got = Array.from({ length: 36 }, (_, i) => pastimeOf('cook-ayu', i * PASTIME_MIN + 5)) })
    then('看電視、玩掌機、喝茶都有', (w) => { for (const p of ['tv', 'handheld', 'table']) expect(w.got as string[]).toContain(p) })
    and('同一段時間再問一次，答案一樣（上下樓不會換）', () => {
      expect(pastimeOf('cook-ayu', 3 * PASTIME_MIN + 1)).toBe(pastimeOf('cook-ayu', 3 * PASTIME_MIN + PASTIME_MIN - 1))
    })
  })

  scenario('換台一台一台輪下去', ({ then }) => {
    then(`${TV_CHANNELS} 台輪完回到第一台`, () => {
      let ch = 0
      for (let i = 0; i < TV_CHANNELS; i++) ch = nextChannel(ch)
      expect(ch).toBe(0)
      expect(nextChannel(0)).toBe(1)
    })
  })
})
