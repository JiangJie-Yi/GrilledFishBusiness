import { expect } from 'vitest'
import { feature, scenario } from './bdd'
import { MENU_BASICS, MENU_KINDS, menuKindOf, menuMix, mixFirst } from '@/game/kitchen/menuMix'
import { MENU_MIN } from '@/data/recipes'
import { DISHES } from '@/data/menu'
import { trialIdeas } from '@/game/kitchen/research'

// (item 617, the owner's 「然後改成最少20樣菜單才能開業」「要平均分類，白飯跟味僧湯不算，那是基本款」)
const entry = (id: string, k = 0) => ({ key: `${id}:${k}`, parts: [{ id }] })
const FISH = ['Salmon', 'Buri', 'Gindara', 'Saury', 'Aji', 'Mackerel']
const SKEWER = ['Yakitori', 'PorkBelly', 'Squid', 'ShrimpSkewer', 'Scallop', 'Sausage']
const VEG = ['Onion', 'Negi', 'Carrot', 'Shishito', 'GrilledCorn', 'Eggplant']
const KITCHEN = ['Onigiri', 'Omurice', 'Tamagoyaki', 'Fries', 'EggDropSoup', 'Sake']
const five = (ids: string[]) => ids.slice(0, 5).map((id) => entry(id))

feature('開業的菜單：至少 20 樣，四類平均，白飯味噌湯不算', () => {
  scenario('門檻是 20 樣，四類各至少 5 樣', ({ then, and }) => {
    then('烤魚店的開業門檻是 20 樣', () => { expect(MENU_MIN.grilledfish).toBe(20) })
    and('分成四類：烤魚、串燒・海鮮、烤蔬菜、飯物・小菜', () => { expect(MENU_KINDS.map((k) => k.zh)).toEqual(['烤魚', '串燒・海鮮', '烤蔬菜', '飯物・小菜']) })
    and('20 樣平均分給四類，每類 5 樣', () => { expect(menuMix([], 20).each).toBe(5) })
  })
  scenario('四類各 5 樣、共 20 樣就能開業', ({ given, then }) => {
    const w = { menu: [] as ReturnType<typeof entry>[] }
    given('烤魚、串燒、蔬菜、飯物小菜各上架 5 樣', () => { w.menu = [...five(FISH), ...five(SKEWER), ...five(VEG), ...five(KITCHEN)] })
    then('可以開業', () => { const m = menuMix(w.menu, 20); expect(m.n).toBe(20); expect(m.ok).toBe(true); expect(m.short).toEqual([]) })
  })
  scenario('白飯和味噌湯是基本款，不算在 20 樣裡', ({ given, then, and }) => {
    const w = { menu: [] as ReturnType<typeof entry>[] }
    given('四類各 5 樣少一樣蔬菜，再加白飯與味噌湯', () => { w.menu = [...five(FISH), ...five(SKEWER), ...VEG.slice(0, 4).map((id) => entry(id)), ...five(KITCHEN), entry('Rice'), entry('MisoSoup')] })
    then('只算 19 樣，不能開業', () => { const m = menuMix(w.menu, 20); expect(m.n).toBe(19); expect(m.ok).toBe(false) })
    and('白飯、味噌湯是基本款', () => { expect(MENU_BASICS.has('Rice') && MENU_BASICS.has('MisoSoup')).toBe(true) })
  })
  scenario('20 樣都是烤的魚和肉，不能開業，說缺哪一類幾樣', ({ given, then, and }) => {
    const w = { menu: [] as ReturnType<typeof entry>[] }
    given('烤魚 10 樣（同一種魚不同調味也算一樣）、串燒 10 樣', () => {
      w.menu = [...FISH.map((id) => entry(id)), ...FISH.slice(0, 4).map((id) => entry(id, 1)), ...SKEWER.map((id) => entry(id)), ...SKEWER.slice(0, 4).map((id) => entry(id, 1))]
    })
    then('有 20 樣，但不能開業', () => { const m = menuMix(w.menu, 20); expect(m.n).toBe(20); expect(m.ok).toBe(false) })
    and('缺烤蔬菜 5 樣、飯物小菜 5 樣', () => { expect(menuMix(w.menu, 20).short).toEqual([{ kind: 'veg', have: 0, need: 5 }, { kind: 'kitchen', have: 0, need: 5 }]) })
  })
  scenario('每一種料歸到對的類', ({ then, and }) => {
    then('魚是烤魚，雞肉串與干貝是串燒・海鮮', () => { expect(['Salmon', 'Hokke', 'Shishamo'].map(menuKindOf)).toEqual(['fish', 'fish', 'fish']); expect(['Yakitori', 'Scallop', 'BloodCake'].map(menuKindOf)).toEqual(['skewer', 'skewer', 'skewer']) })
    and('烤的菜、菇與根莖是烤蔬菜', () => { expect(['Onion', 'GrilledShiitake', 'SweetPotato', 'Daikon'].map(menuKindOf)).toEqual(['veg', 'veg', 'veg', 'veg']) })
    and('年糕、飯糰、蛋包飯、玉子燒、炸物、湯、清酒是飯物・小菜', () => { expect(['NetMochi', 'Onigiri', 'Omurice', 'Tamagoyaki', 'Tempura', 'EggDropSoup', 'Sake'].map(menuKindOf)).toEqual(Array(7).fill('kitchen')) })
  })
  scenario('每一類能上架的都夠 5 樣，開得了店', ({ then }) => {
    then('烤魚店每一類的試菜點子都至少 5 種料', () => {
      const d = DISHES.find((x) => x.id === 'grilledfish')!
      const ids = new Set(trialIdeas(d).map((x) => x.id).filter((id) => !MENU_BASICS.has(id)))
      for (const k of MENU_KINDS) expect([...ids].filter((id) => menuKindOf(id) === k.id).length, k.id).toBeGreaterThanOrEqual(5)
    })
  })
  scenario('二廚一鍵做菜單時，先補不夠的那一類', ({ given, then, and }) => {
    const w = { pool: [] as { id: string }[], menu: [] as ReturnType<typeof entry>[] }
    given('菜單上已有烤魚 5 樣，候選的有 8 樣魚、3 樣蔬菜、2 樣飯物', () => {
      w.menu = five(FISH)
      w.pool = [...['Hokke', 'Nodoguro', 'Iwashi', 'Shishamo', 'Mackerel', 'Aji', 'Saury', 'Buri'].map((id) => ({ id })), { id: 'Onion' }, { id: 'Negi' }, { id: 'Carrot' }, { id: 'Onigiri' }, { id: 'Omurice' }]
    })
    then('蔬菜與飯物排在魚前面', () => {
      const order = mixFirst(w.pool, w.menu, 20).map((x) => x.id)
      expect(order.slice(0, 5).sort()).toEqual(['Carrot', 'Negi', 'Omurice', 'Onigiri', 'Onion'])
    })
    and('原本的順序在同一類裡照舊', () => { expect(mixFirst(w.pool, w.menu, 20).slice(5).map((x) => x.id)).toEqual(['Hokke', 'Nodoguro', 'Iwashi', 'Shishamo', 'Mackerel', 'Aji', 'Saury', 'Buri']) })
  })
})
