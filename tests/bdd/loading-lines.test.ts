import { expect } from 'vitest'
import { feature, scenario } from './bdd'
import { LOADING_LINES, loadingLine } from '@/data/loadingLines'

// (item 175, the first look: while it loads, what the shop's doing to get ready, in the order a shop's opened)
feature('載入時的開店準備', () => {
  scenario('還沒開始算進度時是第一句', ({ then }) => {
    then('炭火點起來了', () => { expect(loadingLine(null)).toBe('炭火點起來了') })
  })
  scenario('照進度一句一句往下', ({ then, and }) => {
    then('20% 是魚送到', () => { expect(loadingLine(20)).toBe('今天的魚剛送到') })
    and('60% 是掛暖簾', () => { expect(loadingLine(60)).toBe('掛上暖簾，點亮燈籠') })
    and('100% 是等第一位客人', () => { expect(loadingLine(100)).toBe('等第一位客人上門') })
  })
  scenario('每一句的起點照順序往上，不會倒回去', ({ then }) => {
    then('起點一個比一個大', () => {
      for (let i = 1; i < LOADING_LINES.length; i++) expect(LOADING_LINES[i][0]).toBeGreaterThan(LOADING_LINES[i - 1][0])
    })
  })
})
