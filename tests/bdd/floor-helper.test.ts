import { expect } from 'vitest'
import { feature, scenario } from './bdd'
import { HELP_AFTER, HELPER_AFTER, helperJobs, helperOf } from '@/game/kitchen/kitchenCrew'

const HOUSE = { id: 'house-chef', role: 'chef' }
const calm = { free: true, serversBusy: true, foodWait: -1, bowlsWait: -1, swampedBowls: false, swampedSake: false, pouredWait: -1 }
feature('二廚在空檔幫外場端菜（第 845 項）', () => {
  scenario('有三廚時，幫忙的是二廚；沒有三廚時二廚自己擺盤，不另外幫忙', ({ given, then, and }) => {
    given('雇了二廚與三廚', (w) => { w.crew = [{ id: 'a', role: 'chef' }, { id: 'b', role: 'sous' }, { id: 'c', role: 'server' }] })
    then('幫忙的是二廚', (w) => { expect(helperOf(w.crew, HOUSE)?.id).toBe('a') })
    and('只雇了三廚時是店裡自己的二廚', () => { expect(helperOf([{ id: 'b', role: 'sous' }], HOUSE)?.id).toBe('house-chef') })
    and('沒有三廚時沒有人另外幫忙', () => { expect(helperOf([{ id: 'a', role: 'chef' }], HOUSE)).toBeNull() })
  })
  scenario('菜在出餐口等太久、兩位外場都在忙時，二廚把菜端出去', ({ given, when, then, but }) => {
    given('兩位外場都在忙', (w) => { w.s = { ...calm } })
    when(`一盤菜在出餐口等了 ${HELPER_AFTER} 分`, (w) => { w.s.foodWait = HELPER_AFTER })
    then('二廚先去端菜', (w) => { expect(helperJobs(w.s)[0]).toBe('food') })
    but('才等了一下的菜留給外場', (w) => { expect(helperJobs({ ...w.s, foodWait: HELPER_AFTER - 1 })).not.toContain('food') })
  })
  scenario('有外場閒著時，二廚不搶外場的工作', ({ given, then }) => {
    given('一位外場閒著，菜與碗都等很久了', (w) => { w.s = { ...calm, serversBusy: false, foodWait: 30, bowlsWait: 30, pouredWait: 30 } })
    then('二廚留在自己的砧板', (w) => { expect(helperJobs(w.s)).toEqual([]) })
  })
  scenario('二廚自己的單優先：有單在等他取料、或正在取料時，不出去', ({ given, then }) => {
    given('有單在等他，菜也等很久了', (w) => { w.s = { ...calm, free: false, foodWait: 30, swampedBowls: true } })
    then('哪裡都不去', (w) => { expect(helperJobs(w.s)).toEqual([]) })
  })
  scenario('三廚忙不過來時，二廚盛飯湯、倒清酒', ({ given, then, and }) => {
    given(`飯湯與清酒等三廚超過 ${HELP_AFTER} 分`, (w) => { w.s = { ...calm, serversBusy: false, swampedBowls: true, swampedSake: true } })
    then('就算外場有空，二廚也盛飯湯', (w) => { expect(helperJobs(w.s)).toContain('fill') })
    and('也倒清酒', (w) => { expect(helperJobs(w.s)).toContain('pour') })
    and('端菜排在盛飯湯前面', (w) => { expect(helperJobs({ ...w.s, serversBusy: true, foodWait: HELPER_AFTER })).toEqual(['food', 'fill', 'pour']) })
  })
})
