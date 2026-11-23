import { expect } from 'vitest'
import { feature, scenario } from './bdd'
import { PHONE_AWAY_S, PHONE_KINDS, PHONE_OUT_S, phoneBeat, type PhoneBeat } from '@/game/phoneBeats'

/** every beat of a spell, sampled every 50 ms: [beat, n, its length] in order, each once */
const beatsOf = (seed: number, len: number) => {
  const out: { beat: PhoneBeat; n: number; len: number }[] = []
  for (let at = 0; at < len; at += 0.05) {
    const b = phoneBeat(seed, at, len)
    if (!out.length || out[out.length - 1].n !== b.n || out[out.length - 1].beat !== b.beat) out.push({ beat: b.beat, n: b.n, len: b.len })
  }
  return out
}

feature('客人等菜時滑手機（第 625 項）', () => {
  scenario('先從口袋掏出手機，最後收回去', ({ then, and }) => {
    then('一開始是掏出手機', () => { expect(phoneBeat(7, 0.1, 20).beat).toBe('out'); expect(phoneBeat(7, PHONE_OUT_S - 0.01, 20).beat).toBe('out') })
    and('最後 0.6 秒是收回去', () => { expect(phoneBeat(7, 20 - PHONE_AWAY_S + 0.01, 20).beat).toBe('away'); expect(phoneBeat(7, 19.99, 20).beat).toBe('away') })
  })

  scenario('中間滑、讀、點、打字、抬頭、笑，各有長短', ({ given, then, and }) => {
    given('二十位客人，各滑一段 30 秒', (w) => { w.all = Array.from({ length: 20 }, (_, i) => beatsOf(i * 37 + 5, 30)) })
    then('每一段都是這幾種之一，長度在它的範圍內（最後一段可以延到收起來）', (w) => {
      for (const bs of w.all as ReturnType<typeof beatsOf>[]) {
        const mid = bs.filter((b) => b.beat !== 'out' && b.beat !== 'away')
        mid.forEach((b, i) => {
          const kind = PHONE_KINDS.find((k) => k[0] === b.beat)!
          expect(kind).toBeTruthy()
          expect(b.len).toBeGreaterThanOrEqual(kind[2] - 1e-6)
          if (i < mid.length - 1) expect(b.len).toBeLessThanOrEqual(kind[3] + 1e-6)
        })
      }
    })
    and('二十位加起來，每一種都出現過', (w) => {
      const seen = new Set((w.all as ReturnType<typeof beatsOf>[]).flat().map((b) => b.beat))
      for (const k of PHONE_KINDS) expect(seen).toContain(k[0])
    })
  })

  scenario('剛掏出來不會馬上笑，也不會連著抬頭兩次', ({ given, then, and }) => {
    given('五十位客人，各滑一段 30 秒', (w) => { w.all = Array.from({ length: 50 }, (_, i) => beatsOf(i * 101 + 3, 30)) })
    then('掏出手機後的第一段不是笑', (w) => { for (const bs of w.all as ReturnType<typeof beatsOf>[]) expect(bs[1].beat).not.toBe('laugh') })
    and('沒有連續兩段都是抬頭', (w) => {
      for (const bs of w.all as ReturnType<typeof beatsOf>[]) for (let i = 1; i < bs.length; i++) expect(bs[i].beat === 'up' && bs[i - 1].beat === 'up').toBe(false)
    })
  })

  scenario('同一位客人同一刻問幾次都一樣，不同客人節奏不同', ({ then, and }) => {
    then('同一位、同一刻：一樣', () => { expect(phoneBeat(42, 7.3, 24)).toEqual(phoneBeat(42, 7.3, 24)) })
    and('不同客人：同一段時間裡的動作順序不一樣', () => {
      const a = beatsOf(1, 30).map((b) => b.beat).join(','), b = beatsOf(2, 30).map((x) => x.beat).join(',')
      expect(a).not.toBe(b)
    })
  })
})
