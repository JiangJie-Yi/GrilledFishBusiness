import { expect } from 'vitest'
import { feature, scenario } from './bdd'
import { DISHES } from '@/data/menu'

// (item 630, the owner's 「客人很容易等太久，看要怎調整，或是把烤物時間縮短」: the grilling a quarter shorter; with the plates kept up at the
// plating place, the first bite came in about an hour of the shop's minutes)
const shop = DISHES.find((d) => d.id === 'grilledfish')!
const times = shop.roast!.times

feature('烤物時間縮短：客人不必等太久', () => {
  scenario('魚三十分鐘上下，最久的根莖類也不超過四十一分鐘', ({ then, and }) => {
    then('香魚 30', () => { expect(times.Fish).toBe(30) })
    and('鯖魚、花魚、銀鱈 34', () => { expect([times.Mackerel, times.Hokke, times.Gindara]).toEqual([34, 34, 34]) })
    and('馬鈴薯、地瓜最久，41', () => { expect([times.Potato, times.SweetPotato]).toEqual([41, 41]); expect(Math.max(...Object.values(times))).toBe(41) })
  })
  scenario('最快的蔬菜十一分鐘', ({ then, and }) => {
    then('獅子唐、蘆筍、秋葵、番茄 11', () => { expect([times.Shishito, times.Asparagus, times.Okra, times.Tomato]).toEqual([11, 11, 11, 11]) })
    and('沒有比 11 更短的', () => { expect(Math.min(...Object.values(times))).toBe(11) })
  })
})
