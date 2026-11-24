import { DISHES, type Dish as DishInfo } from '@/data/menu'
import { RING_SLOTS } from '@/game/fireSlots'

// distance between dishes on the carousel
export const SPACING = 6
/** most items that fit around the charcoal at once: its places (game/fireSlots) */
export const FIRE_CAPACITY = RING_SLOTS

export const ITEM_IDS = Object.fromEntries(DISHES.map((d) => [d.id, d.items.map((it) => it.id)]))
/** every menu item by id (for its calories when it's eaten) */
export const ALL_ITEMS = new Map(DISHES.flatMap((d) => d.items.map((it) => [it.id, it] as const)))
/** a comfortably full adult meal, and how fast it settles */
export const FULL_KCAL = 1500
export const DIGEST_KCAL_PER_SEC = 1.2

/** Signed carousel slot of dish i relative to the active one, wrapping so neighbours are -1 / +1. */
export function slot(i: number, active: number, n: number) {
  let d = (i - active) % n
  if (d > n / 2) d -= n
  if (d < -n / 2) d += n
  return d
}

/**
 * What's on the table: the ordered portions plus whatever the ordered sets include. Bases (the set meals) are
 * ordered like anything else, by their id in the same counts.
 */
export const servings = (dish: DishInfo, order: Record<string, number>) => {
  const all = { ...order }
  for (const b of dish.bases) {
    const n = order[b.id] ?? 0
    if (!n || !b.includes) continue
    for (const [id, k] of Object.entries(b.includes)) all[id] = (all[id] ?? 0) + k * n
  }
  return all
}

/**
 * What's drawn on the cook's table of it: what `servings` says, but with the shop open not the miso soup or the sake (the soup's ladled from
 * its pot to each customer's place; the count of them ordered only grows through the night, and every bowl of it was drawn here, all on the
 * one spot at the seasoning ledge's end: the owner's "a stack of unknown dishes by the salt", 2026-11-13).
 */
export const onTable = (dish: DishInfo, order: Record<string, number>, open: boolean) => {
  const all = servings(dish, order)
  if (open) for (const id of dish.roast?.drinks ?? []) delete all[id]
  return all
}

/** The first set meal that's been ordered, if any. */
export const orderedBase = (dish: DishInfo, order: Record<string, number>) => dish.bases.find((b) => (order[b.id] ?? 0) > 0)

/** The stage's centre and size in canvas pixels (the canvas fills the whole app). */
export type Frame = { cx: number; cy: number; w: number; h: number }

/** the sake offered at the shrine stands (and brings its extra custom) this long (ms) */
export const OMIKI_MS = 180000
/** what offering the sake costs (NT$) */
export const OFFERING_COST = 1000
