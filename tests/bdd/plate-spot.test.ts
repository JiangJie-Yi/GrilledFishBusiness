import { feature, scenario } from './bdd'
import { LONG_BACK, LOOSE_FRONT, PLATE_DIMS, PLATE_SPREAD, plateSide, plateSpot } from '@/game/plateSize'

// (item 557, the owner's 「模型發現都沒擺好」)
feature('長盤上的擺法', () => {
  scenario('烤魚與配菜不疊在一起：魚靠後排，配菜沿盤子前緣排開', ({ given, when, then, and }) => {
    given('一條烤魚與兩樣散的配菜要放在長盤上', (w) => { w.kind = 'long' as const })
    when('依序擺上', (w) => {
      w.fish = plateSpot(w.kind, 0, false)
      w.a = plateSpot(w.kind, 0, true)
      w.b = plateSpot(w.kind, 1, true)
    })
    then('配菜離魚的中線至少隔開一個配菜的寬度', (w) => {
      for (const s of [w.a, w.b]) if (Math.abs(s.across - w.fish.across) < 0.05) throw new Error(`配菜與魚只隔 ${Math.abs(s.across - w.fish.across)}`)
    })
    and('兩樣配菜沿盤長分開，不疊在一起', (w) => {
      if (Math.abs(w.a.along - w.b.along) < 0.05) throw new Error(`兩樣配菜只隔 ${Math.abs(w.a.along - w.b.along)}`)
    })
    and('全部在盤子裡（不超出盤寬與盤長）', (w) => {
      const { l, w: wd } = PLATE_DIMS.long
      for (const s of [w.fish, w.a, w.b]) if (Math.abs(s.across) > wd / 2 || Math.abs(s.along) > l / 2) throw new Error(`超出盤子：${JSON.stringify(s)}`)
    })
  })
  scenario('圓盤與豆皿照舊並排', ({ given, then }) => {
    given('圓盤上的第二樣', (w) => { w.s = plateSpot('round', 1, true) })
    then('跟以前一樣在旁邊一格', (w) => {
      if (w.s.across !== plateSide(1).across * PLATE_SPREAD.round || w.s.along !== 0) throw new Error(JSON.stringify(w.s))
    })
  })
  scenario('長盤上兩條魚照以前的間距並排、往後收', ({ given, then }) => {
    given('第二條魚', (w) => { w.s = plateSpot('long', 1, false) })
    then('在第一條旁邊一格，整排往後', (w) => {
      if (Math.abs(w.s.across - (LONG_BACK + plateSide(1).across * PLATE_SPREAD.long)) > 1e-9 || LOOSE_FRONT <= 0) throw new Error(JSON.stringify(w.s))
    })
  })
})
