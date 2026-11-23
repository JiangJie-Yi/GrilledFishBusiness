/**
 * What the menu needs to open (item 617, the owner's, 2026-11-24: 「然後改成最少20樣菜單才能開業」「要平均分類，白飯跟味僧湯不算，那是基本
 * 款」): MENU_MIN dishes (twenty at the grill), white rice and miso soup not among them (they're the basics every customer can have), spread
 * evenly over four kinds: each kind at least its share (five of twenty). The kinds are the grill's three (its fish, its skewers of meat and
 * seafood, its vegetables) and the rest (the rice, the fried, the egg's, the soup, the sake): the menu's own sections (烤物 37, 炸物 2,
 * 玉子 1, 飯物 3, 湯 1, 飲料 1) can't be shared evenly. An entry counts by its first part, a dish in two seasonings as two (the menu's own
 * count).
 */
import { sectionOf } from '@/data/kitchenDishes'

export type MenuKind = 'fish' | 'skewer' | 'veg' | 'kitchen'
export const MENU_KINDS: readonly { id: MenuKind; zh: string; ja: string; en: string }[] = [
  { id: 'fish', zh: '烤魚', ja: '焼き魚', en: 'Fish' },
  { id: 'skewer', zh: '串燒・海鮮', ja: '串焼き・海鮮', en: 'Skewers' },
  { id: 'veg', zh: '烤蔬菜', ja: '焼き野菜', en: 'Vegetables' },
  { id: 'kitchen', zh: '飯物・小菜', ja: 'ご飯・一品', en: 'Rice & sides' },
]
/** the basics: on the menu or not, not counted toward opening */
export const MENU_BASICS: ReadonlySet<string> = new Set(['Rice', 'MisoSoup'])
const FISH: ReadonlySet<string> = new Set(['ExtraFish', 'Saury', 'Mackerel', 'Aji', 'Iwashi', 'Shishamo', 'Salmon', 'Hokke', 'Buri', 'Gindara', 'Nodoguro'])
const SKEWER: ReadonlySet<string> = new Set(['Yakitori', 'PorkBelly', 'Sausage', 'Squid', 'ShrimpSkewer', 'Scallop', 'BloodCake'])
/** grilled but not a vegetable: the mochi toasted on the net goes with the rice */
const WITH_RICE: ReadonlySet<string> = new Set(['NetMochi'])

/** which of the four kinds a food is */
export const menuKindOf = (id: string): MenuKind =>
  FISH.has(id) ? 'fish' : SKEWER.has(id) ? 'skewer' : WITH_RICE.has(id) || sectionOf(id) !== 'grill' ? 'kitchen' : 'veg'
export const menuKindName = (k: MenuKind, lang: 'zh' | 'ja' | 'en') => MENU_KINDS.find((x) => x.id === k)![lang]

type HasParts = { parts: readonly { id: string }[] }
/** whether an entry counts toward opening (not one of the basics) */
export const counted = (e: HasParts) => !MENU_BASICS.has(e.parts[0]?.id ?? '')

/**
 * How the menu stands against opening: `n` entries counted (the basics left out), each kind's share (`each`) and what it has, the kinds
 * short of their share (in the kinds' order) and whether it can open (`ok`: `min` counted and no kind short)
 */
export function menuMix(entries: readonly HasParts[], min: number) {
  const each = Math.ceil(min / MENU_KINDS.length)
  const have: Record<MenuKind, number> = { fish: 0, skewer: 0, veg: 0, kitchen: 0 }
  let n = 0
  for (const e of entries) {
    if (!counted(e)) continue
    n++
    have[menuKindOf(e.parts[0].id)]++
  }
  const short = MENU_KINDS.filter((k) => have[k.id] < each).map((k) => ({ kind: k.id, have: have[k.id], need: each }))
  return { n, min, each, have, short, ok: n >= min && short.length === 0 }
}

/**
 * Candidates for the menu put in the order to take them (the second cook's menu made at a click, the auto mode's): first as many of each
 * kind as it's short of its share, kind by kind; then the rest; each kind's in the order they came (the best first, as they're given).
 * The basics last: they don't count.
 */
export function mixFirst<T extends { id: string }>(pool: readonly T[], entries: readonly HasParts[], min: number): T[] {
  const m = menuMix(entries, min)
  const want = { ...Object.fromEntries(m.short.map((s) => [s.kind, s.need - s.have])) } as Partial<Record<MenuKind, number>>
  const first: T[] = [], rest: T[] = [], basics: T[] = []
  for (const x of pool) {
    if (MENU_BASICS.has(x.id)) { basics.push(x); continue }
    const k = menuKindOf(x.id)
    if ((want[k] ?? 0) > 0) { first.push(x); want[k] = (want[k] ?? 0) - 1 } else rest.push(x)
  }
  return [...first, ...rest, ...basics]
}
