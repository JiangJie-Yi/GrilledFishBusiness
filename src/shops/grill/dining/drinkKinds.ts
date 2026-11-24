import { glassShatter } from '@/shops/grill/sounds/restroomSound'
import * as THREE from 'three'
import { DRINKS, FRIDGE_STOCK, FRIDGE_UNITS, SPILLS, type DrinkId } from '@/shops/grill/bar'

/** a fallen drink's turn over onto its side (toward the room), its turning about its own length as it rolls (a bottle's girth, about), and what
 * its lying is measured with (made once) */
export const TIP_AXIS = new THREE.Vector3(1, 0, 0)
export const SPIN_AXIS = new THREE.Vector3(0, 1, 0)
export const TIP_Q = new THREE.Quaternion()
export const SPIN_Q = new THREE.Quaternion()
export const ROLL_R = 0.035
/** a carried drink's lean, and a thrown one's tumble, about this (scratch) */
export const LEAN_AXIS = new THREE.Vector3()
export const TUMBLE_Q = new THREE.Quaternion()
export const TUMBLE_UP = new THREE.Vector3()
/** how a thrown drink goes (item 248): the floor's friction once it's down (m/s²), how much of its way it keeps from a bounce, the room it
 * has before the fridge (its frame, metres: between the tables, it stops short against what's in the way) */
export const SLIDE_FRICTION = 4, BOUNCE_KEEP = 0.55
export const THROW_X = 1.4, THROW_Z: [number, number] = [0.3, 1.8]
export const LIFT_BOX = new THREE.Box3()
export const LIFT_AT = new THREE.Vector3()
/**
 * The shelves slope down to the front, as a convenience store's do (the owner's, 2026-11-11): what's taken from the front, those behind it
 * slide down into its place (blender/drinkfridge.py: each shelf's wire 3.5 cm higher at the back, front to back 0.625, its front edge at
 * z 0.305); a drink at z stands that much higher than the shelf's front, leaning back with it
 */
export const SHELF_FRONT_Z = 0.305, SHELF_K = 0.035 / 0.625, SHELF_TILT = Math.atan(SHELF_K)
export const riseAt = (z: number) => (SHELF_FRONT_Z - z) * SHELF_K
/** how long the drinks behind take to slide down into the place of the one taken */
export const SLIDE_S = 0.45
/** a fridge's places as its shelves' batch is made with them: each its drink, or (empty) the drink that's its own */
export const bakedShelves = (n: number) => FRIDGE_STOCK.units[n].map((row, r) => row.map((id, k) => (id ?? FRIDGE_UNITS[n].shelves[r].ids[k]) as DrinkId))
/** how wide across a shelf a drink stands and how deep (its shape as the shelves draw it, DrinkBottleLite, turned a quarter round as it's
 * stood there, at its size in the shop), measured once each */
export const SHELF_SIZES = new Map<DrinkId, [number, number]>()
/** how much of a shelf's width the drinks stand along (blender/drinkfridge.py: its walls 0.395 either side of the middle, the cove lights'
 * baffles 2 cm in from them; a little room left inside those) */
export const SHELF_SPAN = 0.72
/**
 * Where each of a shelf's places stands across it (the owner's, 2026-11-10: the rows were laid at a fixed pitch from the middle, small
 * bottles with wide gaps between them, cans and packs packed shoulder to shoulder, room left at an end): each place as wide as its own
 * drink (the shelf's own, so nothing moves as drinks are taken or swapped), the gaps between them and at both ends all alike, the row filling
 * the shelf; and that gap.
 */
export const SHELF_LAYOUTS = new Map<string, { xs: number[]; gap: number }>()
/** a drink's name, for its tag */
// (in the page's language)
export const drinkName = (id: string) => {
  const d = DRINKS.find((x) => x.id === id), lang = document.documentElement.lang
  return (lang === 'ja' ? d?.ja : lang === 'en' ? d?.en : d?.zh) ?? (lang === 'ja' ? '飲み物' : lang === 'en' ? 'Drink' : '飲料')
}
/** a bottle of one of the drinks, standing (its foot at the origin): its glass or can, its label printed round it,
 * its neck and cap */
/** how much bigger each drink stands than it's modelled, to be the size it is in a shop (a 350 ml can is 12 cm tall) */
// (as sold: a 500 ml beer bottle 25 cm, a 300 ml sake 23 cm, a 2 l tea bottle 31 cm, ramune 18 cm, 350 ml cans 12.2 cm, 500 ml PET 20.5 cm,
// the 65 ml cultured milk 9 cm, a 200 ml milk bottle 13 cm)
export const DRINK_SCALE: Record<DrinkId, number> = { beer: 1.2, sake: 1.12, oolong: 1.26, ramune: 1.06, beerCan: 1.36, highball: 1.36, coffee: 1.2, greenTea: 1.3,
  cola: 1.3, yakult: 1.12, sports: 1.3, milk: 1.1, chuhai: 1.36, blackCoffee: 1.2, cafeAuLait: 1.2, yuzuSoda: 1.36, darkBeer: 1.2, shochu: 1.08, umeshu: 1.06,
  grapeSoju: 1.08, yogurt: 1.5, lacticSoda: 1.36, appleJuice: 1.25, barleyTea: 1.25, vegJuice: 1.25 }
/** what each drink's shaped as (its bottle or can): the newer ones as one of the first (a dark beer the beer's bottle, shochu and umeshu the
 * sake's) */
const FORM: Partial<Record<DrinkId, DrinkId>> = { darkBeer: 'beer', shochu: 'sake', umeshu: 'sake', blackCoffee: 'coffee', cafeAuLait: 'coffee', yuzuSoda: 'chuhai',
  grapeSoju: 'sake', lacticSoda: 'chuhai' }
export const formOf = (id: DrinkId): DrinkId => FORM[id] ?? id
/** which of the shelves' simple bottles a drink's drawn as (LITE_GEO), or none (a can, a pack, a little bottle) */
export const shapeOf = (id: DrinkId) => {
  const f = formOf(id)
  return f === 'beer' ? 'beer' : f === 'sake' ? 'sake' : id === 'oolong' ? 'pet' : id === 'cola' || id === 'greenTea' || id === 'sports' ? 'pet500'
    : id === 'milk' ? 'milk' : id === 'ramune' ? 'ramune' : null
}
/**
 * The floor's real top under a point (the fridge's own floor, its frame's y = 0, is a centimetre under the boards' top: what was laid there
 * flat, a spilt drink and its shards, was under the boards): a short ray straight down, against only what's near it (its originals too, if
 * it's drawn merged: StaticBatch), not the figures nor the drinks; the highest top found within a few centimetres of it, or its own height
 */
export function floorAt(scene: THREE.Object3D, p: THREE.Vector3) {
  const near: THREE.Object3D[] = [], s = new THREE.Sphere()
  scene.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh || (m as THREE.SkinnedMesh).isSkinnedMesh || !m.geometry) return
    if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere()
    s.copy(m.geometry.boundingSphere!).applyMatrix4(m.matrixWorld)
    if (Math.hypot(s.center.x - p.x, s.center.z - p.z) > s.radius + 0.05 || s.center.y - s.radius > p.y + 0.1) return
    for (let q: THREE.Object3D | null = m.parent; q; q = q.parent) if (q.name.startsWith('drink-')) return
    near.push(m)
  })
  const rc = new THREE.Raycaster(p.clone().setY(p.y + 0.1), new THREE.Vector3(0, -1, 0), 0, 0.2)
  const hit = rc.intersectObjects(near, false).find((h) => h.face && h.face.normal.clone().transformDirection(h.object.matrixWorld).y > 0.7)
  return hit ? hit.point.y : p.y
}
/**
 * A glass bottle broken on the floor (game/spills): out of the stock for good, its shards and its drink left where it hit (bar.ts's SPILLS,
 * Spills draws them; a server sweeps them up), the crash heard there. `unit`: the scene's units to a metre where it fell (the fridge's frame
 * is in metres): what's left on the floor is drawn its real size
 */
export function breakBottle(id: DrinkId, at: THREE.Vector3, unit: number) {
  const d = DRINKS.find((x) => x.id === id)!
  const f = formOf(id)
  const glass = f === 'beer' ? (id === 'darkBeer' ? '#4a2c12' : '#7a4a1c') : id === 'ramune' ? '#a8dcea' : soju(id) ? '#4f9a58' : '#eef4f2'
  const clear = id === 'milk' ? 0 : id === 'darkBeer' ? 0.15 : f === 'beer' ? 0.35 : id === 'umeshu' ? 0.4 : 0.8
  SPILLS.list.push({ key: SPILLS.next++, at: [at.x, at.y, at.z], unit, drink: d.color, clear, glass, seed: Math.random() * 1000, t0: performance.now(), by: null, left: 1, wet: 1 })
  glassShatter(at)
}
/** whether a drink's poured into a cup or a glass to be drunk (sake, umeshu and the like from their slim bottles; bottled beer, item 203) */
export const cupped = (id: string) => id === 'sake' || id === 'umeshu' || id === 'beer'
/**
 * A drink as it stands on a fridge's shelf among the hundred and sixty (the owner's: the fridges were the heaviest thing in the room): its
 * bottle or can in a few turned rings, opaque, its glass's and its drink's colour in its points; its label, and its cap. Two materials for
 * all of them (PARTS and the label's), so a fridge's whole stock is two draws; the one taken up, pointed at or carried is the full one.
 */
/** a shelf bottle's body colour: the beer's brown glass, the ramune's aqua, the milk white; a clear bottle the colour of what's in it, paled by
 * the glass */
export function liteBodyColour(id: DrinkId) {
  const d = DRINKS.find((x) => x.id === id)!, f = formOf(id)
  return id === 'beer' ? '#4a2a10' : id === 'darkBeer' ? '#2a1a0c' : id === 'ramune' ? '#86d0e2' : id === 'milk' ? '#f4f2ea' : id === 'umeshu' ? '#d6a060' : soju(id) ? '#3f8a4a' : f === 'sake' ? '#e4ece6'
    : `#${new THREE.Color(d.color).lerp(new THREE.Color('#ffffff'), 0.25).getHexString()}`
}
/** the soju (green glass) */
export const soju = (id: string) => id === 'shochu' || id === 'grapeSoju'
/** what each drink's made of: aluminium cans, glass bottles, PET bottles, the little cultured milk bottle, paper packs */
export const KIND_OF: Record<DrinkId, 'can' | 'glass' | 'pet' | 'small' | 'pack'> = { beer: 'glass', sake: 'glass', oolong: 'pet', ramune: 'glass', beerCan: 'can', highball: 'can',
  coffee: 'can', greenTea: 'pet', cola: 'pet', yakult: 'small', sports: 'pet', milk: 'glass', chuhai: 'can', blackCoffee: 'can', cafeAuLait: 'can', yuzuSoda: 'can',
  darkBeer: 'glass', shochu: 'glass', umeshu: 'glass', grapeSoju: 'glass', yogurt: 'small', lacticSoda: 'can', appleJuice: 'pack', barleyTea: 'pack', vegJuice: 'pack' }
/** how see-through a shelf bottle's glass is: the beer's brown and the soju's green deep, the plastic thinnest */
export const glassAlpha = (id: DrinkId) => (formOf(id) === 'beer' ? 0.84 : soju(id) ? 0.58 : KIND_OF[id] === 'pet' ? 0.12 : id === 'ramune' ? 0.3 : 0.2)
