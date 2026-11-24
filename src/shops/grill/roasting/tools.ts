import * as THREE from 'three'
import { type Seasoning } from '@/data/menu'
import { scaleOf } from '@/shops/grill/edit'
import { STACK_DIR } from './tuning'

/** the little side dishes for onigiri and mochi from the grill net */
export const DISH_R = 0.25
export const DISH_STEP = 0.6
/** the bamboo basket the foil-roasted potatoes are served in (its radius as made, blender/zaru.py) */
export const BASKET_R = 0.48
/** the basket's inner floor as y = BOWL_CURVE * r², fitted to its lathe profile (as made) */
export const BOWL_CURVE = 0.45
/** the basket's size as it's set down, of its size as made (item 553, the owner's 「縮小一些」), and as much again as it's sized in the editor
 * (it wasn't: its unseen edit box grew and shrank, the basket didn't, the owner's 「竹簍不能縮放」): what it holds, its rim and its floor by it */
export const BASKET_SIZE = 0.8
export const basketScale = () => BASKET_SIZE * scaleOf('basket')[0]
export const BASKET_STEP = 0.85
/** grains and drops falling from a seasoning while it's held over food */
export const GRAINS = 360
/** a seasoning held over the food goes on no more than once every this many seconds (whichever piece it's over), and only once it's been
 * over the piece a moment */
export const DAB_EVERY = 0.7
export const DAB_FIRST = 0.25
/**
 * How each seasoning is worked over the food while it's held there, at time `t` (s): where it moves to from where it's held (in the
 * table's frame), how much more it tips, and how many grains or drops a second fall. A pinch of salt rubbed between the fingers (a quick
 * small jitter), the powders shaken off their spoons (a bob), the sauces brushed along (a stroke back and forth), the pastes dabbed on (a
 * dip), the lemon squeezed (a press and twist).
 */
export function toolAction(kind: Seasoning, t: number) {
  const tau = Math.PI * 2
  switch (kind) {
    case 'salt': return { off: new THREE.Vector3(Math.sin(t * tau * 9) * 0.004, Math.sin(t * tau * 13) * 0.003, Math.cos(t * tau * 11) * 0.004), tilt: 0, rate: 46 }
    case 'peanut':
    case 'shichimi': return { off: new THREE.Vector3(0, Math.max(0, Math.sin(t * tau * 5.5)) * 0.022, 0), tilt: Math.sin(t * tau * 5.5) * 0.12, rate: 40 }
    case 'soy':
    case 'milk': return { off: STACK_DIR.clone().multiplyScalar(Math.sin(t * tau * 1.8) * 0.06).add(new THREE.Vector3(0, -0.015, 0)), tilt: 0.15, rate: 9 }
    case 'lemon': return { off: new THREE.Vector3(0, -Math.abs(Math.sin(t * tau * 1.6)) * 0.02, 0), tilt: Math.sin(t * tau * 1.6) * 0.25, rate: 14 }
    case 'water': return { off: new THREE.Vector3(), tilt: 0, rate: 0 }
    default: return { off: new THREE.Vector3(0, -Math.max(0, Math.sin(t * tau * 2.2)) * 0.03, 0), tilt: 0.1, rate: 6 }
  }
}
/** the rings that spread from a piece as a seasoning goes on: how many can be out at once, and how long each lasts (s) */
export const RINGS = 6
export const RING_LIFE = 0.45
/** a seasoned piece's bounce: how long (s) and how much bigger at its height */
export const BOUNCE_TIME = 0.3
export const BOUNCE = 0.13
export const GRAIN_COLORS: Record<Seasoning, THREE.Color> = {
  salt: new THREE.Color('#ffffff'),
  soy: new THREE.Color('#3a1a08'),
  milk: new THREE.Color('#fbf3dc'),
  peanut: new THREE.Color('#c99a5c'),
  miso: new THREE.Color('#a8662a'),
  wasabi: new THREE.Color('#9fc25a'),
  shichimi: new THREE.Color('#c8401f'),
  yuzu: new THREE.Color('#b7c43a'),
  lemon: new THREE.Color('#fff29a'),
  water: new THREE.Color('#bfe2f2'),
}
/** the seasonings that go on food (all but water), in the order they're tasted */
export const DABS = ['salt', 'soy', 'milk', 'peanut', 'miso', 'wasabi', 'shichimi', 'yuzu', 'lemon'] as const
/** how much one dab of each seasoning adds (0 → 1 fully coated) */
export const DAB = 0.35
/** label over a seasoning when pointed at */
export const TOOL_NAMES: Record<Seasoning, string> = { salt: '鹽', soy: '醬油', milk: '煉乳', peanut: '花生粉', miso: '味噌', wasabi: '山葵',
  shichimi: '七味粉', yuzu: '柚子胡椒', lemon: '檸檬', water: '水' }
// skewer geometry from blender/grilledfish.py: foot radius, tip radius, tip height
export const STICK_FOOT_R = 0.76
// (its top 0.64 out from the fire's middle, not the model's 0.42: stood up by STAND_UP as the pieces are first found)
export const STICK_TOP_R = 0.64
/** how far each skewer's turned up from the model's lean in over the fire (radians): from a top 0.42 out to 0.64 at the top's height */
export const STAND_UP = Math.atan2(0.76 - 0.42, 1.15) - Math.atan2(0.76 - 0.64, 1.15)
export const STICK_TOP_Y = 1.15
export const LAYER_HEIGHT = 0.1
export const CHAR_COLOR = new THREE.Color(0.045, 0.035, 0.03)


/** the table's ware's shapes, each made once and shared by every one set out (they come and go as something's put on them: one made each
 * time stayed on the GPU, never let go) */
const WARE_GEO = new Map<string, THREE.BufferGeometry>()
export const wareOnce = (key: string, make: () => THREE.BufferGeometry) => {
  let g = WARE_GEO.get(key)
  if (!g) { g = make(); WARE_GEO.set(key, g) }
  return g
}
