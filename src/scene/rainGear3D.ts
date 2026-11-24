// The rain's things as drawn (item 623, part three; the owner's 「進來的客人會穿雨衣或帶雨傘」): an umbrella (its canopy and its rod), a
// raincoat folded up, the umbrella stand, from public/models/kasatate.glb (blender/kasatate.py), in the bar's units; their materials, one
// for each colour, made once for the page and warmed as it loads (nothing compiled while the shop's open); and the raincoats' pictures, for
// a customer's clothes while they wear one (painted to the clothes pictures' own layout: the front in the middle, the back at the edges, the
// collar at the top, the legs along the foot). game/rainGear says who has what and the beats of it; FolkFigure and GuestBar3D draw them.
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { COAT_COLOURS, UMB_COLOURS, VINYL, type CoatPose, type UmbPose } from '@/game/guests/rainGear'

export const KASA_URL = import.meta.env.BASE_URL + 'models/kasatate.glb'
/** the canopy's tip from the grip, along the rod (blender/kasatate.py's ROD_TIP), and the ferrule's end past it: the umbrella's whole reach
 * from the grip to its point */
export const ROD_TIP = 0.43, TIP_END = 0.455
/** where an umbrella's point rests in the stand: the jar's floor over its foot (KASA_FLOOR), the jar's rim (its top) */
export const KASA_FLOOR = 0.03, STAND_TOP = 0.252
/** the canopy as made (open): its rim's radius and its drop below the tip; furled, its rim drawn in to FURL_R */
const OPEN_R = 0.3213, OPEN_DROP = 0.1391, FURL_R = 0.02
const OPEN_ANGLE = Math.atan2(OPEN_R, OPEN_DROP)
const FURL_ANGLE = Math.asin((FURL_R / OPEN_R) * Math.sin(OPEN_ANGLE))
/** the canopy's scale about its tip, `open` 0 (furled) to 1 (open): its ribs swung out from the shaft, each keeping its length (across by
 * the sine of their angle to it, down by its cosine, against the open canopy's) */
export function canopyScale(open: number, out: THREE.Vector3) {
  const a = FURL_ANGLE + (OPEN_ANGLE - FURL_ANGLE) * Math.max(0, Math.min(1, open))
  const across = Math.sin(a) / Math.sin(OPEN_ANGLE)
  return out.set(across, Math.cos(a) / Math.cos(OPEN_ANGLE), across)
}

/** a customer's rain things this frame, for their figure: the umbrella (its colour, -1 none in hand), its pose (game/rainGear), where its
 * grip goes in the stand (the world's) when it's being put in or taken out; the raincoat (its colour, -1 none), whether it's on, the hands
 * at it; the folded coat: 0 none, 1 between the hands, 2 in the left hand (by the stool while they sit) */
export type GearAt = { umb: number; pose: UmbPose; standAt: THREE.Vector3 | null; coat: number; worn: boolean; coatPose: CoatPose | null; bundle: 0 | 1 | 2 }

/** the shapes, shared (the model's own, never let go); their colours three plain floats a point, as the shop's other pieces have theirs (the
 * glTF's come as four shorts a point: the room's merging of like pieces (WorldBatch) failed on the jar's, again and again) */
const FLOATED = new WeakSet<THREE.BufferGeometry>()
function floatColours(g: THREE.BufferGeometry) {
  if (FLOATED.has(g)) return g
  FLOATED.add(g)
  const c = g.getAttribute('color') as THREE.BufferAttribute | undefined
  if (c && (!(c.array instanceof Float32Array) || c.itemSize !== 3)) {
    const out = new Float32Array(c.count * 3)
    for (let i = 0; i < c.count; i++) for (let k = 0; k < 3; k++) out[i * 3 + k] = c.getComponent(i, k)
    g.setAttribute('color', new THREE.BufferAttribute(out, 3))
  }
  return g
}
export function useKasa() {
  const gltf = useGLTF(KASA_URL) as unknown as { nodes: Record<string, THREE.Mesh> }
  const n = gltf.nodes
  return { stand: floatColours(n.KasaStand.geometry), canopy: floatColours(n.KasaCanopy.geometry), rod: floatColours(n.KasaRod.geometry), bundle: floatColours(n.KasaBundle.geometry) }
}
if (typeof window !== 'undefined') useGLTF.preload(KASA_URL)

type Mats = { canopy: THREE.MeshToonMaterial[]; vinylOpen: THREE.MeshToonMaterial; rod: THREE.MeshToonMaterial; stand: THREE.MeshToonMaterial
  standCanopy: THREE.MeshToonMaterial; bundle: THREE.MeshToonMaterial[] }
let MATS: Mats | null = null
/** the materials: a canopy's in each colour (both its faces: it's seen from under it), the clear one's see-through while it's open (no
 * transmission: a plain blend), the rod's and the jar's in their points' colours, the stand's canopies in each instance's colour, the folded
 * coat in each coat's colour; all made once */
export function rainMats(): Mats {
  if (MATS) return MATS
  const toon = (color: string, extra: THREE.MeshToonMaterialParameters = {}) => new THREE.MeshToonMaterial({ color, vertexColors: true, ...extra })
  MATS = {
    canopy: UMB_COLOURS.map((c, i) => toon(i === VINYL ? '#d6e0e5' : c.hex, { side: THREE.DoubleSide })),
    vinylOpen: toon(UMB_COLOURS[VINYL].hex, { side: THREE.DoubleSide, transparent: true, opacity: 0.42, depthWrite: false }),
    rod: toon('#ffffff'),
    stand: toon('#ffffff'),
    standCanopy: toon('#ffffff', { side: THREE.DoubleSide }),
    bundle: COAT_COLOURS.map((c) => toon(c.hex)),
  }
  return MATS
}
/** an umbrella's canopy's colour standing furled in the stand (its instance's: the clear one's a pale grey, folded up) */
export const standCanopyColour = (i: number, out: THREE.Color) => out.set(i === VINYL ? '#d6e0e5' : UMB_COLOURS[Math.max(0, i)].hex)

let COATS: THREE.Texture[] | null = null
/** the raincoats' pictures, one for each colour, made once (none off the page) */
export function coatPictures(): THREE.Texture[] | null {
  if (COATS || typeof document === 'undefined') return COATS
  COATS = COAT_COLOURS.map((c) => paintCoat(c.hex))
  return COATS
}
/**
 * A raincoat over the clothes' picture's layout (512 x 256: the front's middle at the middle, the back at the two edges, the collar along
 * the top, the trousers' strip along the foot): the coat's colour, its wet sheen in soft streaks down it, the placket down the front with
 * its snaps, a stand-up collar, the hood bunched at the back of the neck, two flap pockets, the hem a little above the foot and dark
 * trousers under it, beads of rain on it here and there. Set as the clothes' pictures are (sRGB, flipY off, wrapped round).
 */
function paintCoat(hex: string) {
  const c = document.createElement('canvas')
  c.width = 512; c.height = 256
  const g = c.getContext('2d')!
  g.fillStyle = hex
  g.fillRect(0, 0, 512, 256)
  // (shaded a little toward the back (the edges) and the foot)
  const side = g.createLinearGradient(0, 0, 512, 0)
  side.addColorStop(0, 'rgba(0,0,0,0.18)'); side.addColorStop(0.3, 'rgba(0,0,0,0)'); side.addColorStop(0.7, 'rgba(0,0,0,0)'); side.addColorStop(1, 'rgba(0,0,0,0.18)')
  g.fillStyle = side
  g.fillRect(0, 0, 512, 232)
  // (the wet sheen: soft light streaks down it)
  for (const [u, w, a] of [[0.12, 12, 0.08], [0.31, 20, 0.16], [0.4, 9, 0.1], [0.6, 16, 0.14], [0.71, 9, 0.09], [0.88, 14, 0.08]]) {
    const x = u * 512, gr = g.createLinearGradient(x - w, 0, x + w, 0)
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, `rgba(255,255,255,${a})`); gr.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = gr
    g.fillRect(x - w, 20, 2 * w, 205)
  }
  // (the collar, standing, round the front; the hood bunched at the back of the neck, with its drawstring)
  g.fillStyle = 'rgba(0,0,0,0.2)'
  g.fillRect(196, 0, 120, 15)
  g.fillRect(0, 0, 78, 24); g.fillRect(434, 0, 78, 24)
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2
  g.beginPath(); g.moveTo(8, 20); g.quadraticCurveTo(40, 27, 74, 20); g.moveTo(438, 20); g.quadraticCurveTo(472, 27, 504, 20); g.stroke()
  // (the placket down the front and its snaps)
  g.fillStyle = 'rgba(0,0,0,0.24)'
  g.fillRect(250, 14, 12, 212)
  for (let k = 0; k < 5; k++) {
    g.fillStyle = '#e4e2da'; g.beginPath(); g.arc(256, 38 + k * 42, 4.2, 0, Math.PI * 2); g.fill()
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.arc(256, 38 + k * 42, 1.6, 0, Math.PI * 2); g.fill()
  }
  // (two flap pockets)
  for (const x of [176, 296]) {
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x, 142, 40, 5)
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2; g.strokeRect(x + 1, 147, 38, 26)
  }
  // (the hem, and the trousers under it)
  g.fillStyle = 'rgba(0,0,0,0.38)'
  g.fillRect(0, 226, 512, 4)
  g.fillStyle = '#26262c'
  g.fillRect(0, 230, 512, 26)
  // (beads of rain on it: a light dot with a darker one under it)
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  for (let k = 0; k < 70; k++) {
    const x = rnd() * 512, y = 22 + rnd() * 200, r = 1.2 + rnd() * 1.8
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.ellipse(x, y + r * 0.6, r, r * 1.3, 0, 0, Math.PI * 2); g.fill()
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(x - r * 0.25, y, r * 0.55, r * 0.75, 0, 0, Math.PI * 2); g.fill()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.flipY = false
  t.anisotropy = 4
  t.wrapS = THREE.RepeatWrapping
  return t
}

/** everything of it drawn once, to be warmed as the page loads (scene/Prewarm's warmLater): a canopy in each material, the rod, the jar, the
 * folded coat in each colour, the stand's two sets of instances (canopies and rods, each instance coloured); none of it cast shadows */
export function rainWarmGroup(shapes: ReturnType<typeof useKasa>) {
  const m = rainMats(), g = new THREE.Group()
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material) => { const x = new THREE.Mesh(geo, mat); x.castShadow = false; g.add(x) }
  for (const c of m.canopy) add(shapes.canopy, c)
  add(shapes.canopy, m.vinylOpen)
  add(shapes.rod, m.rod)
  add(shapes.stand, m.stand)
  for (const b of m.bundle) add(shapes.bundle, b)
  for (const [geo, mat] of [[shapes.canopy, m.standCanopy], [shapes.rod, m.rod]] as const) {
    const im = new THREE.InstancedMesh(geo, mat, 1)
    im.setColorAt(0, new THREE.Color('#ffffff'))
    im.castShadow = false
    g.add(im)
  }
  return g
}
