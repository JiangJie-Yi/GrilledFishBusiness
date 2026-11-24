import { FRIDGE_UNITS, type DrinkId } from '@/shops/grill/bar'
import { SHELF_SIZES, SHELF_SPAN, SHELF_LAYOUTS, DRINK_SCALE, shapeOf, KIND_OF } from './drinkKinds'
import { LITE_GEO, BOTTLE_GEO, PACK } from './bottleGeometry'

/** how far apart a place's drinks stand, front to back: each its own depth and 5 mm (game/drinkStock's PLACE_DEPTH, how many, fills the
 * twelve centimetres behind the front one: enough for the shelf to read full through the glass; all the way back it was six hundred bottles
 * a fridge) */
export const rankStep = (id: DrinkId) => shelfSize(id)[1] + 0.005
/** how tall a drink stands on its shelf (its shelf bottle, DrinkBottleLite, at its size in the shop): where it's held (its middle) and how
 * tall what finds the pointer is */
export function shelfTall(id: DrinkId) {
  const kind = KIND_OF[id], shaped = shapeOf(id)
  const top = kind === 'pack' ? PACK.h + 0.0034 : kind === 'can' && id !== 'cola' && id !== 'greenTea' ? 0.0935 : kind === 'small' ? 0.076
    : shaped ? LITE_GEO[shaped].capY + 0.005 * LITE_GEO[shaped].capR : 0.2
  return top * DRINK_SCALE[id]
}
export function shelfSize(id: DrinkId): [number, number] {
  const hit = SHELF_SIZES.get(id)
  if (hit) return hit
  const kind = KIND_OF[id], shaped = shapeOf(id)
  const g = kind === 'pack' ? PACK.body : kind === 'can' && id !== 'cola' && id !== 'greenTea' ? LITE_GEO.canLabel : kind === 'small' ? BOTTLE_GEO.small
    : shaped ? LITE_GEO[shaped].body : null
  let v: [number, number] = [0.06, 0.06]
  if (g) {
    if (!g.boundingBox) g.computeBoundingBox()
    const b = g.boundingBox!, sc = DRINK_SCALE[id]
    // (turned a quarter round (DrinkBottleLite): its own z across the shelf, its x deep)
    v = [(b.max.z - b.min.z) * sc, (b.max.x - b.min.x) * sc]
  }
  SHELF_SIZES.set(id, v)
  return v
}
if (import.meta.env?.DEV && typeof window !== 'undefined') Object.assign(window, { __shelfSize: shelfSize })
export function shelfLayout(n: number, r: number) {
  const key = `${n}-${r}`, hit = SHELF_LAYOUTS.get(key)
  if (hit) return hit
  const ws = FRIDGE_UNITS[n].shelves[r].ids.map((id) => shelfSize(id)[0])
  const gap = Math.max(0.003, (SHELF_SPAN - ws.reduce((a, w) => a + w, 0)) / (ws.length + 1))
  const xs: number[] = []
  let x = -(ws.reduce((a, w) => a + w, 0) + gap * (ws.length - 1)) / 2
  for (const w of ws) { xs.push(x + w / 2); x += w + gap }
  const v = { xs, gap }
  SHELF_LAYOUTS.set(key, v)
  return v
}
