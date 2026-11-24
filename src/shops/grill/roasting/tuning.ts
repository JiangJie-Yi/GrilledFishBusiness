import * as THREE from 'three'
import { tipOver } from '@/shops/grill/bar'
import { readyFoodAt } from './barPlaces'

/** (where a customer's looking, worked out) */
export const GAZE_AT = new THREE.Vector3()

/** GLTFLoader strips the dot from Blender's "Fish.001", so drop trailing digits to get the type. */
export const baseName = (name: string) => name.replace(/\d+$/, '')

// colour multipliers over the (grilled-looking) textures: pale when raw, as authored when done, charred when burnt
/** (item 473, the owner's 「東西烤好的感覺要有，不能太隨意」) what stands round the fire on its stick browns on the side it shows the coals
 * first: that side cooks SIDE_LEAD faster than the piece as a whole and the other as much slower (some 1.4 to 0.6); the cook turns it on
 * its stick at TURN_AT of its time (TURN_S the turn), the other side then the faster, the two even as it's done. Left unturned it would
 * be charring one side with the other still pale */
export const SIDE_LEAD = 0.38, TURN_AT = 0.5, TURN_S = 0.5
export const STICK_AXIS = new THREE.Vector3(1, 0, 0)
/** (scratch) the way to the fire in a piece's own frame, its turn undone, its turn on its stick */
export const FIRE_SIDE = new THREE.Vector3(), FIRE_INV = new THREE.Quaternion(), STICK_TURN = new THREE.Quaternion()
export const DONE_TINT = new THREE.Color(1, 1, 1)
export const BURNT_TINT = new THREE.Color(0.22, 0.17, 0.14)
// past done, food keeps darkening slowly, reaching full char at this many cook-times
export const CHAR_START = 1.15
export const CHAR_FULL = 3
/** where the camera looks from (App CAMERA_POSITION), for food that turns its broad side toward it */
export const FACE_CAMERA = new THREE.Vector3(2.9, 2.2, 4.0)
/** how many sips a bowl of soup takes, and how good it is (miso soup doesn't take seasoning) */
export const SIPS = 3
export const SOUP_TASTE = 78
/** how a dish from the stove, the fryer or the board pleases (items 461, 469), as the soup's */
export const DISH_TASTE = 80
// the fan (団扇): waved over the fire, how much hotter it gets per unit the fan travels, and at most; the extra heat
// dies back (per second) once the fanning stops, and while it lasts the coals burn away faster in proportion to it
// (per second, at the most it can add: the plain burn is about 0.0002 a second, so fanning flat out burns some 65 times
// as fast)
// (fanned hard, the fire goes past its full 100%, to FIRE_FANNED_MAX (120%), cooking faster still, and the coals burn away much faster
// for it: all the faster the further over 100% it is, FAN_OVER_BURN a second at the top)
export const FAN_GAIN = 0.08
export const FAN_MAX = 0.3
export const FAN_FADE = 0.02
/** how fast (per second) the heat that's been fanned up is let into the fire */
export const FAN_RISE = 0.06
export const FAN_BURN = 0.02
export const FIRE_FANNED_MAX = 1.2
export const FAN_OVER_BURN = 0.03
/** how long a bowl of rice or of soup takes a customer to eat (the shop's clock; SideBowls' EAT_MS draws it eaten down over as long) */
export const SIDE_EAT_S = 12

export const FLIGHT_SECONDS = 0.7
/** how long the owner's pushing a skewer in for, as the player skewers something by hand (item 105) */
export const PIERCE_MS = 900
// the plate: everything is laid pointing the same way (LAY_DIR), side by side across the plate (STACK_DIR) with
// enough room that neighbours don't overlap, then in a second layer on top
// LAY_DIR points at the camera and STACK_DIR runs across the screen, so the row reads left to right
export const LAY_DIR = new THREE.Vector3(0.59, 0, 0.81).normalize()
export const STACK_DIR = new THREE.Vector3(0.81, 0, -0.59).normalize()
/** skewers on the board: their top (its loop, the handle) toward the cook, their point (the end that was in the ash) away from him */
export const ON_BOARD = STACK_DIR.clone()
export const ONE = new THREE.Vector3(1, 1, 1)
export const PLATE_R = 0.5
export const SLOT_GAP = 0.2       // wider than the broadest piece (a fish lying flat)
export const PER_LAYER = 5
/** a plate takes 20 (four layers of five); the next one is set down behind it */
export const PER_PLATE = 20
/**
 * How far to brighten each charcoal material once it has burnt to ash. Its colour multiplies a very dark
 * texture, so scaling the colour up turns the black into a mottled pale grey while keeping the ridges and cracks.
 */
export const ASH_GAIN: Record<string, number> = { Ember: 45, Binchotan: 18 }
export const ASH_TINT = new THREE.Color('#d8d2c8')
export const PLATE_STEP = 1.2
export const DISH_TOP: [number, number, number] = [1.8, 0, -0.26]
export const BASKET_TOP: [number, number, number] = [2.0, 0, 0.4]
/** what a container on the table is called, and what can be done with it (by its key: plate-0, box, bin, tray...) */
export const CONTAINER_TIP = (key: string, open = false) => {
  const kind = key.split('-')[0]
  // (with the shop open the bowl's put away and the square iron tray's in its place (item 317))
  const name = ({ plate: '餐盤', dish: '小碟', basket: '竹籃', box: '調味盒', bin: '水桶', tray: '大砧板', trash: '廚餘桶', rawdish: '生食碟', lantern: '行燈', bowl: open ? '方形鐵盤' : '試吃碗' } as Record<string, string>)[kind] ?? '擺設'
  return { title: name, hint: kind === 'trash' ? '專放烤焦的食物｜拖曳移動' : '拖曳移動' }
}
/** where the tasting bowl stands on the table (a spot clear of the fire, the tray and the plates), and how big: clear of the notch the chef
 * stands in and inside the table's front edge (the owner's: at 0.52 across from 1.95, 1.0 it ran half into the notch, the chef's belly in it,
 * and out past the edge); in the room's frame along 1.72, back from the front 0.43, the fire's frame here */
export const BOWL_TOP: [number, number, number] = [1.85, 0, 0.72]
export const BOWL_R = 0.4
/**
 * The open shop's square iron tray (角バット, item 317, the owner's) in the bowl's place (blender/kakubat.py): its long side along the table
 * (STACK_DIR), what's laid on it lying back across it as on a plate, in the bowl's one row; how high it rests there (on its rack 3 cm over
 * its foot, and the 2.3 cm the landing takes back off a spot's height). Its tongs (the floor's server's): 41 cm from hinge to grip, lying
 * beside its end toward the plating place, their hinge toward the server's side; how long they take to reach a piece and lift it onto its
 * plate (game/tray's TONG_TAKE_S for the first, TONG_S each after) and to go back down (s)
 */
/** (item 276) what drips fat onto the coals as it grills: the oily fish and the meats */
export const FATTY = /^(Saury|saury|Mackerel|mackerel|Salmon|Buri|Gindara|Hokke|Nodoguro|Iwashi|Aji|ayu|Shishamo|ExtraFish|PorkBelly|Sausage|Yakitori)$/
export const TRAY_REST = 0.03 + 0.023
export const TRAY_YAW = Math.atan2(0.59, 0.81)
/** which way along the table the plating place is from the bowl (+1 or -1 along STACK_DIR); the tray stands 10 cm that way from the bowl's
 * middle (longer than the bowl's round, it ran over the little dish beyond its other end), its tongs beyond its end there */
export const TRAY_SIDE = Math.sign(readyFoodAt(0, 0, true, 'round').sub(new THREE.Vector3(...BOWL_TOP)).dot(STACK_DIR)) || 1
export const TRAY_OFF = STACK_DIR.clone().multiplyScalar(TRAY_SIDE * 0.1)
export const TONG_LEN = 0.41, TONG_REST_OUT = 0.53
/** how high their hinge lies over the table, on their side (their lower arm's widest, and its thickness) */
export const TONG_LIE = 0.028
export const TONG_LIFT_S = 0.32, TONG_BACK_S = 0.3
export type TongPhase = 'rest' | 'reach' | 'lift' | 'back'
/** (scratch) the tongs' pose */
export const TONG_X = new THREE.Vector3(), TONG_Y = new THREE.Vector3(), TONG_Z = new THREE.Vector3(), TONG_M = new THREE.Matrix4()
export const TONG_QR = new THREE.Quaternion(), TONG_QU = new THREE.Quaternion(), TONG_AT = new THREE.Vector3(), TONG_REST_TIP = new THREE.Vector3()
/** a fish's bones (fishBones, drawn at the customers' size) at the size the fire's fish are drawn, and what pointing at them says */
export const BONE_SCALE = 3
export const BONES_TIP = tipOver('魚骨', '吃剩的魚骨｜點一下丟進廚餘桶')
/** how much room the bowl takes when the table's pieces are pushed clear of each other (less than it is: it sits among them) */
export const BOWL_PUSH = 0.3
/** the bowl's rim above its foot: what's laid across it rests at this height */
export const BOWL_RIM = 0.15
/** the table's pieces that edit mode moves by their nudge (the cutting board, the seasoning ledge, the water bucket, the basket, the tasting
 * bowl, the scraps bin, the rice balls' dish: the owner's, every one a piece of its own): the edit id of each */
export const EDIT_PIECES: Record<string, string> = { tray: 'cutboard', box: 'seasoning', bin: 'bucket', 'basket-0': 'basket', 'bowl-0': 'tastebowl', trash: 'trash', rawdish: 'ricedish' }
/** whether the table's pieces (the plates, the seasoning box, the cutting board, the bowl...) can be dragged about by hand: not any more, they
 * stay where they're set (the owner moves them in developer mode); only the food, the tools and the charcoal are picked up */
export const DRAG_PIECES = false
/** where the plates past the first start on the table's top, round the fire (the first is in the cubby under it) */
export const PLATE_TOP: [number, number, number] = [1.45, 0.02, -1.24]
/** seconds to eat one piece: a few bites, each taking a chunk out and chewed before the next (the owner's tasting) */
export const EAT_SECONDS = 3
/** a customer's piece takes longer, the food on the plate going bite by bite (the owner's: 8 to 14 seconds a dish; game time, so faster at
 * x2); and how long one who's eaten waits for the rest of what they ordered before getting up to pay for what they've had */
export const GUEST_EAT_SECONDS = 8
// (how long one who's eaten waits for the next before getting up: game/stay's NEXT_WAIT, item 630)
export const BITES_PER_PIECE = 4
export const UP = new THREE.Vector3(0, 1, 0)
export const ZERO = new THREE.Vector3()
/** where a sound's heard from (a seasoned piece's sizzle, a cupboard's doors), worked out in place */
export const SIZZLE_AT = new THREE.Vector3()
/** the pinching hand is drawn a little above the pinch of salt it holds */
export const HAND_OFFSET = new THREE.Vector3(0, 0.07, 0)
/** the water bucket, drawn this much bigger than modelled (its water is for damping the fire down, not for the food: the owner's); and its
 * footprint. At a bucket's own size (on the table it was once drawn three times as big, nearly a metre across) */
// (its own size again, on the floor (the owner's, 2026-11-11: off the table onto the floor, at the size it was): it was 0.55 on the table)
export const BUCKET_SCALE = 1
export const BIN_R = 0.27 * BUCKET_SCALE
/** (scratch: a piece's size in the world, for its rod) */
export const ROD_WS = new THREE.Vector3()
/** the food waste bin (廚餘桶) for burnt food only (item 114, the owner's, 2026-11-14: "for the burnt food"; and the fish bones left
 * on the plates), on the floor by the cook's right foot */
export const TRASH_R = 0.15
export const TRASH_H = 0.3
/** where the bucket stands: on the floor past the table's end, beside the low dish rack toward the table's front corner, its back by the
 * table's end face (the owner's, 2026-11-11: off the table onto the floor, its own size; it stood on the table's top in front of the third
 * cook's bay (2026-11-09), and before that on the floor by the cook's left foot). Along (the bar's, as COOK_NOTCH) and out (lay) */
export const FLOOR_BUCKET = { along: 3.475, lay: 1.25 }
/** where the trash bin stands: on the floor in front of the strip of table right of the cook's notch (the notch is only as wide as his step;
 * past the strip, the fridge's doors swing out). Along and out, as the bucket */
export const FLOOR_TRASH = { along: 1.43, lay: 2.26 }
