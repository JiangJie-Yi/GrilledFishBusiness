import { memo, useEffect, useMemo, useRef } from 'react'
import { glowLeave, glowOnly } from '@/scene/interact/hoverGlow'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { homeCopy } from '@/scene/render/StaticBatch'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { latheSolid } from '@/scene/people/trayGeometry'
import { signTexture } from '@/scene/props/signFont'
import { inkModel, inkTogether } from '@/scene/render/inkHull'
import { aimTip, setTip } from '@/scene/interact/hoverTip'
import { shrineDoor } from '@/shops/grill/sounds/shrineSound'
import { getEdit } from '@/shops/grill/edit'
import { SHOE_CELLS, BENCH_SEATS, nameOver, POINTER_HINT } from '@/shops/grill/bar'
import { tick } from '@/scene/kit/speed'
import { readShoeKey, shoeOf, SHOE_KINDS, type ShoeKind } from '@/game/guests/shoes'

/** how much longer the way in's noren is drawn than it was made, and how much wider (kept to the doorway's width) */
/**
 * The plum sprig in the shoe cupboard's vase, painted on one card (item 257): a dark branch forking up out of the vase's mouth, white-pink
 * five-petalled blossoms along it with their yellow stamens, a few buds still shut; the rest of the card clear (cut out by alphaTest)
 */
const UME_CARD = signTexture(256, 320, (g, w, h) => {
  g.clearRect(0, 0, w, h)
  let seed = 11
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  // (the branch: from the vase's mouth at the foot of the card, forking twice, tapering, a little crooked as plum is)
  const twig = (x: number, y: number, a: number, len: number, wd: number, depth: number, out: [number, number][]) => {
    let px = x, py = y
    const n = 5
    for (let i = 1; i <= n; i++) {
      const t = i / n, nx = px + Math.sin(a) * (len / n) + (rnd() - 0.5) * 6, ny = py - Math.cos(a) * (len / n)
      g.strokeStyle = '#4a2c1a'; g.lineCap = 'round'; g.lineWidth = Math.max(1.4, wd * (1 - t * 0.6))
      g.beginPath(); g.moveTo(px, py); g.lineTo(nx, ny); g.stroke()
      px = nx; py = ny
      out.push([px, py])
      if (depth > 0 && i === 3) twig(px, py, a + (rnd() < 0.5 ? -0.6 : 0.6), len * 0.55, wd * 0.6, depth - 1, out)
    }
  }
  const pts: [number, number][] = []
  twig(w * 0.5, h, -0.12, h * 0.78, 9, 2, pts)
  twig(w * 0.5, h, 0.32, h * 0.55, 7, 1, pts)
  // (the blossoms: five round petals about a yellow heart, white flushed pink, here and there along the twigs; a few buds)
  const bloom = (x: number, y: number, r: number) => {
    const turn = rnd() * Math.PI
    for (let k = 0; k < 5; k++) {
      const a = turn + (k / 5) * Math.PI * 2
      const grd = g.createRadialGradient(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, 0, x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.62)
      grd.addColorStop(0, '#fff6f7'); grd.addColorStop(0.75, '#f9d3db'); grd.addColorStop(1, '#e79aab')
      g.fillStyle = grd
      g.beginPath(); g.arc(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.6, 0, Math.PI * 2); g.fill()
    }
    g.fillStyle = '#d8a13a'; g.beginPath(); g.arc(x, y, r * 0.28, 0, Math.PI * 2); g.fill()
    g.strokeStyle = '#b8782a'; g.lineWidth = 1
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5); g.stroke() }
  }
  pts.forEach(([x, y], i) => {
    if (y > h * 0.86) return
    if (i % 2 === 0) bloom(x + (rnd() - 0.5) * 10, y + (rnd() - 0.5) * 8, 9 + rnd() * 5)
    else { g.fillStyle = '#c4566e'; g.beginPath(); g.ellipse(x + (rnd() - 0.5) * 8, y, 3.2, 4.4, rnd(), 0, Math.PI * 2); g.fill() }
  })
})
const UME_CARD_MAT = new THREE.MeshToonMaterial({ map: UME_CARD, alphaTest: 0.5, side: THREE.DoubleSide })
/** a camellia (椿) for the squat celadon pot (item 297): a short dark stem, glossy dark-green leaves in pairs, one open red flower with its
 * yellow boss and a bud; the rest of the card clear */
const TSUBAKI_CARD = signTexture(256, 256, (g, w, h) => {
  g.clearRect(0, 0, w, h)
  g.strokeStyle = '#3a2416'; g.lineCap = 'round'; g.lineWidth = 7
  g.beginPath(); g.moveTo(w * 0.5, h); g.quadraticCurveTo(w * 0.47, h * 0.7, w * 0.55, h * 0.42); g.stroke()
  const leaf = (x: number, y: number, a: number, s: number) => {
    g.save(); g.translate(x, y); g.rotate(a)
    const grd = g.createLinearGradient(0, -s * 0.3, 0, s * 0.3)
    grd.addColorStop(0, '#2f5a2c'); grd.addColorStop(1, '#173a1c')
    g.fillStyle = grd
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * 0.5, -s * 0.32, s, 0); g.quadraticCurveTo(s * 0.5, s * 0.32, 0, 0); g.fill()
    g.strokeStyle = 'rgba(160, 200, 140, 0.55)'; g.lineWidth = 1.6
    g.beginPath(); g.moveTo(s * 0.06, 0); g.lineTo(s * 0.9, 0); g.stroke()
    g.restore()
  }
  leaf(w * 0.5, h * 0.74, -2.5, 70); leaf(w * 0.49, h * 0.7, -0.55, 74); leaf(w * 0.53, h * 0.52, -2.75, 60); leaf(w * 0.54, h * 0.5, -0.3, 64)
  // (the flower: five broad overlapping petals, deep red, a little lighter at their edges; the yellow boss in its middle)
  const fx = w * 0.56, fy = h * 0.36, R = 40
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + (k / 5) * Math.PI * 2 + 0.3
    const px = fx + Math.cos(a) * R * 0.48, py = fy + Math.sin(a) * R * 0.48
    const grd = g.createRadialGradient(fx, fy, R * 0.1, px, py, R * 0.62)
    grd.addColorStop(0, '#8e1020'); grd.addColorStop(0.7, '#c4202e'); grd.addColorStop(1, '#de4a52')
    g.fillStyle = grd
    g.beginPath(); g.ellipse(px, py, R * 0.6, R * 0.5, a, 0, Math.PI * 2); g.fill()
  }
  g.fillStyle = '#f2d24a'; g.beginPath(); g.arc(fx, fy, R * 0.26, 0, Math.PI * 2); g.fill()
  g.strokeStyle = '#d8a828'; g.lineWidth = 1.4
  for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2; g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx + Math.cos(a) * R * 0.3, fy + Math.sin(a) * R * 0.3); g.stroke() }
  // (a bud, still shut, red showing at its tip through its green)
  g.fillStyle = '#2c5a2a'; g.beginPath(); g.ellipse(w * 0.36, h * 0.48, 9, 13, -0.5, 0, Math.PI * 2); g.fill()
  g.fillStyle = '#b81c2a'; g.beginPath(); g.ellipse(w * 0.345, h * 0.455, 5, 7, -0.5, 0, Math.PI * 2); g.fill()
  g.strokeStyle = '#3a2416'; g.lineWidth = 3; g.beginPath(); g.moveTo(w * 0.49, h * 0.62); g.lineTo(w * 0.37, h * 0.5); g.stroke()
})
/** narcissus (水仙) for the slim bud vase (item 297): long flat leaves standing up, a stem with a few small white six-petalled flowers, each
 * with its little yellow cup, nodding a little */
const SUISEN_CARD = signTexture(160, 320, (g, w, h) => {
  g.clearRect(0, 0, w, h)
  const blade = (x: number, top: number, lean: number, wd: number) => {
    const grd = g.createLinearGradient(0, h, 0, top)
    grd.addColorStop(0, '#4c7a46'); grd.addColorStop(1, '#7aa86a')
    g.fillStyle = grd
    g.beginPath(); g.moveTo(x - wd / 2, h); g.quadraticCurveTo(x + lean * 0.4, (h + top) / 2, x + lean, top)
    g.quadraticCurveTo(x + lean * 0.4 + wd * 0.3, (h + top) / 2, x + wd / 2, h); g.fill()
  }
  blade(w * 0.42, h * 0.18, -16, 11); blade(w * 0.58, h * 0.26, 18, 10); blade(w * 0.5, h * 0.4, 6, 9)
  // (the flower stem, a little above the leaves, its head bent over)
  g.strokeStyle = '#5c8a50'; g.lineWidth = 4; g.lineCap = 'round'
  g.beginPath(); g.moveTo(w * 0.5, h); g.quadraticCurveTo(w * 0.52, h * 0.3, w * 0.6, h * 0.12); g.stroke()
  const flower = (x: number, y: number, r: number) => {
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.2
      const grd = g.createRadialGradient(x, y, 0, x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.55)
      grd.addColorStop(0, '#fffdf4'); grd.addColorStop(1, '#efe8d4')
      g.fillStyle = grd
      g.beginPath(); g.ellipse(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.5, r * 0.3, a, 0, Math.PI * 2); g.fill()
    }
    g.fillStyle = '#f0b62a'; g.beginPath(); g.arc(x, y, r * 0.3, 0, Math.PI * 2); g.fill()
    g.fillStyle = '#d88a1a'; g.beginPath(); g.arc(x, y, r * 0.14, 0, Math.PI * 2); g.fill()
  }
  flower(w * 0.62, h * 0.11, 22); flower(w * 0.38, h * 0.16, 19); flower(w * 0.7, h * 0.24, 17)
})
const TSUBAKI_MAT = new THREE.MeshToonMaterial({ map: TSUBAKI_CARD, alphaTest: 0.5, side: THREE.DoubleSide })
const SUISEN_MAT = new THREE.MeshToonMaterial({ map: SUISEN_CARD, alphaTest: 0.5, side: THREE.DoubleSide })
/** the shoe cupboard's three vases (item 297), turned (latheSolid: open mouths, their feet closed by rungs, round bodies smooth): where each
 * stands along the cupboard's top (its length runs along z here, the room at -x), its outline across, its glaze; and its flower's card: how
 * big, how high its foot stands over the vase's foot */
// (the three set together as one arrangement in the top's middle (the owner's, 「花看起來都太平，幫我放一起」): the tall one in front, the squat pot
// behind it to one side, the bud vase behind to the other, a centimetre or so between them)
const SHOE_VASES: { x: number; z: number; prof: [number, number][]; color: string; card: THREE.Material; size: [number, number]; at: number }[] = [
  // (the tall cream one, the plum's: a shouldered body narrowing to a short neck)
  { x: -0.015, z: 0, color: '#ebe4d2', card: UME_CARD_MAT, size: [0.24, 0.3], at: 0.185,
    prof: [[0.03, 0], [0.037, 0.008], [0.042, 0.045], [0.04, 0.078], [0.03, 0.1], [0.019, 0.112], [0.017, 0.122], [0.0195, 0.126], [0.0145, 0.126], [0.0125, 0.11]] },
  // (a squat celadon pot, wide-mouthed, toward the bench's end: the camellia)
  { x: 0.02, z: -0.1, color: '#a6c6b0', card: TSUBAKI_MAT, size: [0.17, 0.17], at: 0.115,
    prof: [[0.036, 0], [0.046, 0.007], [0.054, 0.028], [0.053, 0.046], [0.046, 0.06], [0.041, 0.064], [0.043, 0.068], [0.037, 0.068], [0.035, 0.055]] },
  // (a slim indigo bud vase toward the door's end: the narcissus)
  { x: 0.025, z: 0.075, color: '#2f3b55', card: SUISEN_MAT, size: [0.12, 0.24], at: 0.23,
    prof: [[0.021, 0], [0.026, 0.008], [0.026, 0.05], [0.021, 0.09], [0.012, 0.125], [0.0095, 0.15], [0.012, 0.158], [0.0075, 0.158], [0.006, 0.14]] },
]
export const ShoeVases = memo(function ShoeVases() {
  const vases = useMemo(() => {
    const g = new THREE.Group()
    for (const v of SHOE_VASES) {
      const m = new THREE.Mesh(latheSolid(v.prof, 20, true), new THREE.MeshToonMaterial({ color: v.color }))
      // (a millimetre over the cupboard's top: its foot's underside not in the top's own plane)
      m.position.set(v.x, SHOE_TOP + 0.001, v.z)
      m.castShadow = true
      g.add(m)
    }
    inkModel(g, () => false, { width: 0.0012, weld: true })
    return g
  }, [])
  return (
    <group {...nameOver('花瓶', '玄關的插花：梅花、山茶、水仙')}>
      <primitive object={vases} />
      {/* (each flower three cards crossed, a third of a turn apart, every other one turned over: never a flat picture from the side (the owner's,
          「花看起來都太平」), and not the same picture twice side by side) */}
      {SHOE_VASES.flatMap((v, i) => [0, 1, 2].map((k) => (
        <mesh key={`${i}-${k}`} position={[v.x, SHOE_TOP + v.at, v.z]} rotation-y={-Math.PI / 2 + (k * Math.PI) / 3} scale-x={k % 2 ? -1 : 1} material={v.card}>
          <planeGeometry args={v.size} />
        </mesh>
      )))}
    </group>
  )
})

/**
 * Along the wall from the way in (the entrance's frame, z toward the door): the cats' stand on the room's boards past the genkan's step,
 * clear of the door and under the altar's shelf; the shoe cupboard down on the genkan's stone, its end against the step, the helmet on it
 * (both moved along away from the door, the owner's wish, the doorway and the till's end left open)
 */
/** (the shoe cupboard's end toward the step where the old one's was, now it's 0.9 long, not 0.71: its middle that much nearer the door) */
export const CAT_STAND_Z = -1.92, SHOE_CAB_Z = -0.62 - (0.56 * 1.27) / 2 + 0.9 / 2
/** the shoe cupboard's middle off the wall: its back 5 cm in from where the first one's was (0.51), now it's 1.27 times as deep (at 0.51 the
 * floor's edge strip along the wall ran 4 cm into its back) */
// (half as deep since (the owner's, 2026-11-10): its back stays on the wall at 0.46)
export const SHOE_CAB_X = 0.46 - 0.2 / 2
/** the shoe cupboard's top (blender/shoecab.py's H): what stands on it stands there */
const SHOE_TOP = 0.56
/** its cubbies (two rows of four: one to each of the eight places) */
export const SHOE_CUBBIES = 8
const SHOE_URL = import.meta.env.BASE_URL + 'models/shoecab.glb'
useGLTF.preload(SHOE_URL)
/**
 * The genkan's shoe cupboard (blender/shoecab.py; the owner's): a low, long walnut cabinet, two rows of four shoji-latticed doors over empty
 * cubbies, one to each place (the guests' own shoes go in them). Pointed at, it says what it is; a click swings all eight open 75 degrees or
 * shut, a wooden knock as they go.
 */
/** the shoe cupboard's materials: its parts' colours on their points; its wood's grain (blender/shoecab.py's walnut: the owner's, 2026-11-10,
 * it was flat colour) under its boards' colours, made once with the model's picture */
const SHOE_MAT = new THREE.MeshToonMaterial({ vertexColors: true })
let SHOE_WOOD_MAT: THREE.MeshToonMaterial | null = null
// (pale: its picture is pale ash and washi now (blender/shoecab.py, item 264: 「鞋櫃木紋感太重，要日和風 有紙糊的那種感覺，不要通透」); walnut before)
// (its colours were traded with the waiting bench's a while (item 291), and put back (item 297, the owner's, 2026-11-17: 「鞋櫃幫我換回原本的顏色
// 好了」): the bench kept its new pale ash)
// (a medium brown with a natural grain since item 305 (the owner's, 2026-11-17: 「鞋櫃改回剛剛的深色，但別太深，記得木紋要自然」): the colour in
// its picture (blender/shoecab.py), the tints near white, the top a shade deeper)
const SHOE_TINT: Record<string, THREE.Color> = { ShoeWood: new THREE.Color('#fbf6ef'), ShoeTop: new THREE.Color('#ece0d0'), ShoeSlat: new THREE.Color('#ffffff') }
/** the customers' shoes, five kinds (item 712, the owner's 「鞋子太過簡單，有點造型、多樣點」: one rounded block a shoe before, 267
 * triangles each): blender/shoes.py, each one shoe, its toe toward +z, its sole on y 0, its parts' greys in its points; each customer's
 * colour of their kind over it (game/guests/shoes). One material for every kind, in the cupboard and on the genkan's stone alike */
const SHOES_URL = import.meta.env.BASE_URL + 'models/shoes.glb'
useGLTF.preload(SHOES_URL)
const SHOE_NODE: Record<ShoeKind, string> = { sneaker: 'ShoeSneaker', leather: 'ShoeLeather', pump: 'ShoePump', boot: 'ShoeBoot', zori: 'ShoeZori' }
const SHOE_KIND_MAT = new THREE.MeshToonMaterial({ vertexColors: true })
/** each kind's shape, from the model (its own frame: the node's matrix put in) */
function useShoeShapes() {
  const gltf = useGLTF(SHOES_URL) as unknown as { scene: THREE.Group }
  return useMemo(() => {
    gltf.scene.updateWorldMatrix(true, true)
    const out = {} as Record<ShoeKind, THREE.BufferGeometry>
    for (const k of SHOE_KINDS) {
      const m = gltf.scene.getObjectByName(SHOE_NODE[k]) as THREE.Mesh | undefined
      out[k] = m ? m.geometry.clone().applyMatrix4(m.matrixWorld) : new THREE.BoxGeometry(0.06, 0.05, 0.17).translate(0, 0.025, 0)
    }
    return out
  }, [gltf])
}
/** one shoe, its pair's other side by side (half a pair's width apart, each turned out a little), as instances of their kind's mesh */
const SHOE_SIDE = 0.042, SHOE_SPLAY = 0.06
const SHOE_Q = new THREE.Quaternion(), SHOE_S = new THREE.Vector3(1, 1, 1), SHOE_V = new THREE.Vector3(), SHOE_Y = new THREE.Vector3(0, 1, 0)
/** the pair's two shoes written into `m` from instance `k`: at `at` (its foot), toes along `yaw` (0: +z) */
function putPair(m: THREE.InstancedMesh, k: number, at: THREE.Vector3, yaw: number, colour: THREE.Color, frame?: THREE.Matrix4) {
  for (let sd = -1; sd <= 1; sd += 2) {
    SHOE_V.set(sd * SHOE_SIDE, 0, 0).applyAxisAngle(SHOE_Y, yaw).add(at)
    SHOE_Q.setFromAxisAngle(SHOE_Y, yaw + sd * SHOE_SPLAY)
    SHOE_M.compose(SHOE_V, SHOE_Q, SHOE_S)
    if (frame) SHOE_M.premultiply(frame)
    m.setMatrixAt(k, SHOE_M)
    m.setColorAt(k, colour)
    k++
  }
  return k
}
/** a cubby's lining (item 719, the owner's 「然後鞋櫃裡面要有鋪墊」): a rush mat's weave, pale straw, its border bound in dark cloth */
const SHOE_LINING_TEX = signTexture(128, 128, (g) => {
  g.fillStyle = '#cdb88a'
  g.fillRect(0, 0, 128, 128)
  for (let y = 0; y < 128; y += 4) {
    g.fillStyle = y % 8 ? 'rgba(120,96,56,0.28)' : 'rgba(255,248,226,0.3)'
    g.fillRect(0, y, 128, 2)
  }
  for (let x = 0; x < 128; x += 32) { g.fillStyle = 'rgba(96,72,40,0.35)'; g.fillRect(x, 0, 1.5, 128) }
  g.fillStyle = '#3a2a22'
  g.fillRect(0, 0, 128, 9); g.fillRect(0, 119, 128, 9)
})
const SHOE_LINING_MAT = new THREE.MeshToonMaterial({ map: SHOE_LINING_TEX })
/** how thick the lining is, and how far in from a cubby's sides and its front and back it lies */
const LINING_T = 0.005, LINING_IN = 0.012
/** the dark veil behind its back's slats (item 497, the owner's 「然後雖然這邊能透視內容但要給與黑黑一層朦朧感」): the shoes in the cubbies seen
 * from behind between the slats, dim through it; the program the toilets' dark boxes' (a dark see-through basic); both its sides (its one
 * face's way round is the exporter's: from the front it's behind the cubbies' back board anyway) */
const SHOE_VEIL_MAT = new THREE.MeshBasicMaterial({ color: '#0d0907', transparent: true, opacity: 0.74, depthWrite: false, side: THREE.DoubleSide })
const SHOE_NONE = new THREE.Matrix4().makeScale(0, 0, 0)
const SHOE_M = new THREE.Matrix4()
const SHOE_C = new THREE.Color()
/** the cubby whose door it is, from anything of the shoe cupboard's under the pointer; -1, not a door (its top, back, sides, its veil) */
const cubbyOf = (o: THREE.Object3D | null) => {
  for (; o; o = o.parent) { const m = /^ShoeDoor[LR](\d+)$/.exec(o.name); if (m) return +m[1] }
  return -1
}
const SHOE_P = new THREE.Vector3()
const SHOE_V2 = new THREE.Vector3()
const SHOE_TITLE = '【下駄箱】'
const shoeHint = (open: boolean) => (open ? '再點一下關上這一格' : '點一格的門，開那一格')
export function ShoeCupboard() {
  const gltf = useGLTF(SHOE_URL) as unknown as { scene: THREE.Group }
  const model = useMemo(() => {
    const root = gltf.scene.clone(true)
    // (each door, and the carcass, drawn once: its parts' colours written on their points, one material for all of it, its pieces put
    // together; an ink line round only its wood, not round the lattice's thin bars (they'd go black). Nine doors of four materials each,
    // each inked, were 47 draws; now two a door)
    const parts = (node: THREE.Object3D) => {
      const out: THREE.Mesh[] = []
      node.traverse((o) => { if ((o as THREE.Mesh).isMesh && o !== node) out.push(o as THREE.Mesh) })
      if ((node as THREE.Mesh).isMesh) out.push(node as THREE.Mesh)
      return out
    }
    const together = (node: THREE.Object3D) => {
      const ms = parts(node)
      if (!ms.length) return
      node.updateWorldMatrix(true, true)
      const inv = node.matrixWorld.clone().invert()
      // (the grained wood apart from the rest: its points' uvs kept, drawn with the grain)
      const grained = (m: THREE.Mesh) => !!(m.material as THREE.MeshStandardMaterial).map
      const woodGrain = ms.find(grained)
      if (woodGrain && !SHOE_WOOD_MAT) SHOE_WOOD_MAT = new THREE.MeshToonMaterial({ vertexColors: true, map: (woodGrain.material as THREE.MeshStandardMaterial).map })
      const geoOf = (m: THREE.Mesh) => {
        const g = new THREE.BufferGeometry()
        g.setAttribute('position', m.geometry.attributes.position.clone())
        g.setAttribute('normal', m.geometry.attributes.normal.clone())
        if (grained(m) && m.geometry.attributes.uv) g.setAttribute('uv', m.geometry.attributes.uv.clone())
        if (m.geometry.index) g.setIndex(m.geometry.index.clone())
        // (the grained boards' own colours (the model's are white over their grain picture: the colour's in the picture there))
        const c = SHOE_TINT[(m.material as THREE.Material).name] ?? (m.material as THREE.MeshStandardMaterial).color
        const n = g.attributes.position.count, col = new Float32Array(n * 3)
        for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3)
        g.setAttribute('color', new THREE.BufferAttribute(col, 3))
        g.applyMatrix4(inv.clone().multiply(m.matrixWorld))
        return g
      }
      const geos = ms.filter((m) => !grained(m)).map(geoOf)
      const woodGeos = ms.filter(grained).map(geoOf)
      const wood = ms.filter((m) => /^Shoe(Wood|Top)$/.test((m.material as THREE.Material).name))
      const hull = inkTogether(wood.map((m) => { const k = new THREE.Mesh(m.geometry.clone().applyMatrix4(inv.clone().multiply(m.matrixWorld))); return k }), { width: 0.0015, weld: true })
      for (const m of ms) if (m !== node) m.removeFromParent()
      if (geos.length) {
        const one = new THREE.Mesh(mergeGeometries(geos)!, SHOE_MAT)
        one.name = node.name + 'Drawn'
        node.add(one)
      }
      if (woodGeos.length && SHOE_WOOD_MAT) {
        const wood = new THREE.Mesh(mergeGeometries(woodGeos)!, SHOE_WOOD_MAT)
        wood.name = node.name + 'Wood'
        node.add(wood)
      }
      if (hull) node.add(hull)
    }
    const doors: { o: THREE.Object3D; s: number; cell: number; k: number }[] = []
    root.traverse((o) => { const m = /^ShoeDoor([LR])(\d+)$/.exec(o.name); if (m) doors.push({ o, s: m[1] === 'L' ? -1 : 1, cell: +m[2], k: 0 }) })
    // (each cubby's floor, from its door and the carcass's depth (the model as it stands, unturned): where its shoes go)
    root.updateWorldMatrix(true, true)
    const cab = root.getObjectByName('ShoeCab')
    const cabBox = cab ? new THREE.Box3().setFromObject(cab) : new THREE.Box3()
    const cells: THREE.Vector3[] = []
    /** each cubby's floor's size across (x) and deep (z), the way its door faces out (+1: +z) (item 719, 712) */
    const floors: { w: number; d: number; out: number }[] = []
    /** each cubby's room, its door shut to the carcass's back (a hair over all round): pointed into while its door's open, it's that cubby
     * (item 528: its door swung away, the pointer on the cubby's inside is where it was) */
    const rooms: THREE.Box3[] = []
    const toRoot = root.matrixWorld.clone().invert()
    for (const d of doors) {
      const b = new THREE.Box3().setFromObject(d.o), c = b.getCenter(new THREE.Vector3())
      // (the shoes in the middle of its depth: it's shallow now, a pair just fits)
      cells[d.cell] = new THREE.Vector3(c.x, b.min.y + 0.004, (cabBox.min.z + cabBox.max.z) / 2)
      floors[d.cell] = { w: b.max.x - b.min.x, d: cabBox.max.z - cabBox.min.z, out: Math.sign(c.z - (cabBox.min.z + cabBox.max.z) / 2) || 1 }
      rooms[d.cell] = new THREE.Box3(new THREE.Vector3(b.min.x, b.min.y, Math.min(b.min.z, cabBox.min.z)),
        new THREE.Vector3(b.max.x, b.max.y, Math.max(b.max.z, cabBox.max.z))).expandByScalar(0.003).applyMatrix4(toRoot)
    }
    for (const d of doors) together(d.o)
    if (cab) together(cab)
    // (the veil left apart, a dark see-through, casting nothing)
    const veil = root.getObjectByName('ShoeVeil') as THREE.Mesh | undefined
    if (veil?.isMesh) { veil.material = SHOE_VEIL_MAT; veil.castShadow = veil.receiveShadow = false }
    // (all eight shut, drawn as one with one ink line, two draws not eighteen; any of them swinging, each its own again)
    const shut = homeCopy(root, doors.map((d) => d.o))
    // (each cubby's lining, all of them one mesh (item 719): a thin mat over its floor, in from its sides, its front and its back)
    const mats = cells.map((at, i) => {
      const f = floors[i]
      if (!at || !f) return null
      // (nearly the cubby's whole floor: in from its partitions, 6 mm off its back's slats and its door's inside (the cupboard 0.218 deep from
      // its back to its doors' fronts), so the shoes' heels and toes are on it, not out over its edge in the air)
      return new THREE.BoxGeometry(f.w - 2 * LINING_IN - 0.006, LINING_T, f.d - 0.04).translate(at.x, at.y - 0.004 + LINING_T / 2 + 0.001, at.z - 0.004)
    }).filter((g): g is THREE.BoxGeometry => !!g)
    const lining = mats.length ? new THREE.Mesh(mergeGeometries(mats)!, SHOE_LINING_MAT) : null
    for (const g of mats) g.dispose()
    if (lining) { lining.name = 'shoe-linings'; lining.raycast = () => {} }
    return { root, doors, cells, floors, rooms, shut, lining }
  }, [gltf])
  /** the cubbies opened by a click, each on its own (item 256, the owner's: 「這櫃子我點一下就全開，能否一個一個開」) */
  const st = useRef({ cells: new Set<number>() })
  /** the cubby whose door's under the pointer; -1 the cupboard itself, null none of it (item 528, the owner's 「有BUG點上面、後面也有聲音，只有門
   * 可以點」: the whole of it lit under the pointer and answered a click, its top and back too: lit, a press on them ticked; clicked, it shut
   * whatever was open, a door's knock with nothing to shut. Only its doors answer now: the one pointed at lit alone, the hand, a click; the
   * rest of it named, nothing lit, the arrow) */
  const hov = useRef<number | null>(null)
  const doorObj = (cell: number) => model.doors.find((d) => d.cell === cell)?.o ?? null
  /** the cubby a pointer's on: its door, or inside it while its door's open (swung away, the pointer where the door was is on its inside:
   * a click there shuts it, as its hint says); -1 the rest of the cupboard */
  const cubbyAt = (e: ThreeEvent<PointerEvent> | ThreeEvent<MouseEvent>) => {
    const c = cubbyOf(e.object)
    if (c >= 0) return c
    const p = model.root.worldToLocal(SHOE_P.copy(e.point))
    for (const d of model.doors) if ((st.current.cells.has(d.cell) || d.k > 0.5) && model.rooms[d.cell]?.containsPoint(p)) return d.cell
    return -1
  }
  const hand = (on: boolean, e: ThreeEvent<PointerEvent>) => {
    POINTER_HINT.hand = Math.max(0, POINTER_HINT.hand + (on ? 1 : -1))
    const el = e.nativeEvent.target as HTMLElement | null
    if (el?.style) el.style.cursor = on || POINTER_HINT.hand ? 'pointer' : ''
  }
  const point = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    if (getEdit().on) return
    const cell = cubbyAt(e), was = hov.current
    if (cell === was) return
    hov.current = cell
    if (was !== null && was >= 0) { glowLeave(doorObj(was)); if (cell < 0) hand(false, e) }
    if (cell >= 0) {
      // (a door: it alone lit, drawn by itself while it's pointed at (the doors' one shut drawing let go: useFrame), its tag over it)
      if (was === null || was < 0) hand(true, e)
      glowOnly(doorObj(cell))
      aimTip({ eventObject: doorObj(cell) ?? e.eventObject, camera: e.camera, nativeEvent: e.nativeEvent })
      setTip({ title: SHOE_TITLE, hint: shoeHint(st.current.cells.has(cell)) })
    } else {
      // (the cupboard itself: what it is and where to click, nothing lit, the plain arrow: it can't be clicked)
      aimTip(e)
      setTip({ title: SHOE_TITLE, hint: shoeHint(false) })
    }
  }
  const leave = (e: ThreeEvent<PointerEvent>) => {
    const was = hov.current
    hov.current = null
    if (was !== null && was >= 0) { glowLeave(doorObj(was)); hand(false, e) }
    setTip(null)
  }
  const g = useRef<THREE.Group>(null)
  // (every cubby's pairs of shoes of a kind one instanced mesh, each shoe its customer's colour (item 227: two meshes a pair, a material
  // each, some thirty draws with the cupboard full; item 712: a mesh a kind); made with the rest, its program at load, none drawn at first)
  const shapes = useShoeShapes()
  const shoes = useMemo(() => Object.fromEntries(SHOE_KINDS.map((k) => {
    const m = new THREE.InstancedMesh(shapes[k], SHOE_KIND_MAT, Math.max(1, model.cells.length * 2))
    m.name = `shoe-pairs-${k}`
    m.frustumCulled = false
    m.raycast = () => {}
    for (let i = 0; i < m.count; i++) { m.setMatrixAt(i, SHOE_NONE); m.setColorAt(i, SHOE_C.set('#444444')) }
    // (only the shoes there are, drawn, side by side from the first (item 528, the Art window's find: every cubby's two were drawn, at
    // nothing where there were none, 4,800 faces with the cupboard empty); none at first)
    m.count = 0
    return [k, m]
  })) as unknown as Record<ShoeKind, THREE.InstancedMesh>, [model, shapes])
  useEffect(() => () => { for (const m of Object.values(shoes)) m.dispose() }, [shoes])
  /** each cubby's shoes as last drawn ('' none, or its door shut on them): the instances written only when one changes */
  const drawn = useRef<string[]>([])
  useFrame((_, dt) => {
    const s = st.current
    const now = performance.now()
    // (each cubby's door by a click on it; and as a customer puts their shoes in or takes them out, open a moment)
    model.doors.forEach((d) => {
      const want = s.cells.has(d.cell) || now - (SHOE_CELLS.kick.get(d.cell) ?? -1e9) < 1400 ? 1 : 0
      d.k += Math.sign(want - d.k) * Math.min(Math.abs(want - d.k), tick(dt) * 3.2)
      const e = d.k * d.k * (3 - 2 * d.k)
      d.o.rotation.y = d.s * e * (75 * Math.PI / 180)
    })
    // (shut, the one drawing of them all; the doors themselves hidden (still pointed at: the pointer's rays don't mind)); and while a door's
    // pointed at, each drawn by itself, the one lit alone (item 528)
    model.shut.home(model.doors.every((d) => d.o.rotation.y === 0) && !(hov.current !== null && hov.current >= 0))
    // (only the shoes in a cubby whose door's open, or opening (item 718, the owner's 「鞋子放進鞋櫃內，就停止渲染，已減少運算，等打開再渲染」):
    // shut in, none drawn; a door opening, its pair's there before it's open enough to see in)
    let changed = false
    model.cells.forEach((at, i) => {
      const door = model.doors.find((d) => d.cell === i)
      const c = door && door.k > 0.001 ? SHOE_CELLS.shoes.get(i) ?? '' : ''
      if (drawn.current[i] === c || !at) return
      drawn.current[i] = c
      changed = true
    })
    if (changed) {
      // (the open cubbies' shoes, each kind's pairs written from its first instance on, as many drawn as there are; on their lining, toes out)
      const n = Object.fromEntries(SHOE_KINDS.map((k) => [k, 0])) as Record<ShoeKind, number>
      model.cells.forEach((at, i) => {
        const c = drawn.current[i]
        if (!c || !at) return
        const s = readShoeKey(c), m = shoes[s.kind]
        SHOE_V2.set(at.x, at.y - 0.004 + LINING_T + 0.001, at.z)
        n[s.kind] = putPair(m, n[s.kind], SHOE_V2, (model.floors[i]?.out ?? 1) > 0 ? 0 : Math.PI, SHOE_C.set(s.colour))
      })
      for (const k of SHOE_KINDS) {
        const m = shoes[k]
        m.count = n[k]
        m.instanceMatrix.needsUpdate = true
        if (m.instanceColor) m.instanceColor.needsUpdate = true
      }
    }
    if (g.current) { g.current.getWorldPosition(SHOE_CELLS.at); SHOE_CELLS.ready = true }
  })
  return (
    <group onClick={(e) => {
      e.stopPropagation()
      if (getEdit().on) return
      // (the cubby whose door (or open inside) was clicked opened or shut, that one alone; a click on the cupboard itself does nothing (item
      // 528: it shut whatever was open, a knock heard with nothing to shut))
      const cell = cubbyAt(e)
      if (cell < 0) return
      const cells = st.current.cells
      if (cells.has(cell)) cells.delete(cell); else cells.add(cell)
      const open = cells.has(cell)
      shrineDoor(open)
      setTip({ title: SHOE_TITLE, hint: shoeHint(open) })
    }}
      onPointerOver={point} onPointerMove={point} onPointerOut={leave}>
      <primitive object={model.root} />
      <group ref={g}>
        {/* (the shoes in each open cubby: a pair, its kind, the customer's colour, toes out; each kind one instanced mesh (item 712, 718)) */}
        {SHOE_KINDS.map((k) => <primitive key={k} object={shoes[k]} />)}
        {/* (and each cubby's lining under them (item 719)) */}
        {model.lining && <primitive object={model.lining} />}
      </group>
    </group>
  )
}
/** the shoes of those waiting on the bench, on the genkan's stone where they stepped up (item 203): a pair each, their colour, at the
 * cupboard's shoes' size; placed each frame from the sitters' own (nothing re-rendered for it) */
// (item 374: its pairs placed frame by frame; drawn again only if its list's ref changes)
export const BenchShoes = memo(BenchShoesImpl)
function BenchShoesImpl({ sitters }: { sitters: { current: Map<number, { id: number; shoes?: { at: THREE.Vector3; yaw: number } }> } }) {
  // (each kind's pairs one instanced mesh (item 712: two meshes a pair, a material each, before), none drawn till one's there: made with
  // the rest, its program at load)
  const shapes = useShoeShapes()
  const meshes = useMemo(() => Object.fromEntries(SHOE_KINDS.map((k) => {
    const m = new THREE.InstancedMesh(shapes[k], SHOE_KIND_MAT, BENCH_SEATS * 2)
    m.name = `bench-shoes-${k}`
    m.frustumCulled = false
    m.castShadow = true
    m.raycast = () => {}
    for (let i = 0; i < m.count; i++) { m.setMatrixAt(i, SHOE_NONE); m.setColorAt(i, SHOE_C.set('#444444')) }
    m.count = 0
    return [k, m]
  })) as unknown as Record<ShoeKind, THREE.InstancedMesh>, [shapes])
  useEffect(() => () => { for (const m of Object.values(meshes)) m.dispose() }, [meshes])
  /** the pairs as last written (each sitter's id, place and turn): written again only when one changes */
  const was = useRef('')
  useFrame(() => {
    let sig = ''
    for (const v of sitters.current.values()) if (v.shoes) sig += `${v.id}:${v.shoes.at.x.toFixed(3)},${v.shoes.at.z.toFixed(3)},${v.shoes.yaw.toFixed(2)};`
    if (sig === was.current) return
    was.current = sig
    const n = Object.fromEntries(SHOE_KINDS.map((k) => [k, 0])) as Record<ShoeKind, number>
    for (const v of sitters.current.values()) {
      if (!v.shoes) continue
      const s = shoeOf(v.id), m = meshes[s.kind]
      if (n[s.kind] >= BENCH_SEATS * 2) continue
      n[s.kind] = putPair(m, n[s.kind], v.shoes.at, v.shoes.yaw, SHOE_C.set(s.colour))
    }
    for (const k of SHOE_KINDS) {
      const m = meshes[k]
      m.count = n[k]
      m.instanceMatrix.needsUpdate = true
      if (m.instanceColor) m.instanceColor.needsUpdate = true
    }
  })
  return <>{SHOE_KINDS.map((k) => <primitive key={k} object={meshes[k]} />)}</>
}
/**
 * The cats at the door, on their stand just inside it against the wall (the entrance's +x side; the till is on the
 * other), facing across the way in at those coming through
 */
/** the cats' stand's top step's height, the koban on it (0.84 once: item 96) */
export const CAT_TOP = 0.74
/**
 * The felt over one of the cats' stand's tiers (`d` deep, its top at `h`, `l` long; grown `g` all round for its ink): one piece of cloth
 * across the top and down the front, its front edge rounded over as cloth drapes (the cats stand in it a little, as on a cushion), its
 * ends softened (item 379, docs/MODELING.md's 造型感). Its faces against the tier sit 2 mm inside it (no two faces in one plane); made once
 * for each tier
 */
const FELT_T = 0.012, FELT_DROP = 0.075
/** the felt's top over its tier (its thickness and its bevel's swell): what stands on it stands this high */
export const FELT_TOP = FELT_T + 0.0018
const FELTS = new Map<string, THREE.BufferGeometry>()
export function feltGeo(d: number, h: number, l: number, g: number) {
  const key = [d, h, l, g].join('|')
  let geo = FELTS.get(key)
  if (geo) return geo
  // (its section across the tier, x out from the wall (its front at -d/2), y up; the outer corners rounded, the cloth's fold at the front
  // fullest)
  const xb = d / 2 + 0.004 + g, xf = -d / 2 - FELT_T - g, yt = h + FELT_T + g, yb = h - FELT_DROP - g, xi = -d / 2 + 0.002, yi = h - 0.002
  const sh = new THREE.Shape()
  const rf = 0.016 + g, rb = 0.006 + g
  sh.moveTo(xb, yi)
  sh.lineTo(xb, yt)
  sh.lineTo(xf + rf, yt)
  sh.absarc(xf + rf, yt - rf, rf, Math.PI / 2, Math.PI, false)
  sh.lineTo(xf, yb + rb)
  sh.absarc(xf + rb, yb + rb, rb, Math.PI, Math.PI * 1.5, false)
  sh.lineTo(xi, yb)
  sh.lineTo(xi, yi)
  sh.closePath()
  const b = 0.003
  geo = new THREE.ExtrudeGeometry(sh, { depth: l + 0.008 + 2 * g - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b * 0.6, bevelSegments: 1, curveSegments: 2 })
  geo.translate(0, 0, -(l + 0.008 + 2 * g - 2 * b) / 2)
  FELTS.set(key, geo)
  return geo
}
export const DOOR_CATS = [
  // (on the stand: x out from the wall, y the tier's top, z along it; the big white pair on the upper tier)
  // (each its own model and size, in its own colours: two big ones on top, two smaller below)
  // (each with room round it: none touching the next, nor the shoe cupboard and the helmet beside the stand)
  // (the big pair on the upper tier either side of the top step, clear of it (the owner's, 2026-11-12: they sat in front of it, their backs
  // in it); each 0.18 across, 2 cm off the step's ends, inside the tier's)
  { x: -0.075, y: 0.6, z: -0.24, yaw: 0.2, kind: 1 as const, h: 0.5 },
  { x: -0.075, y: 0.6, z: 0.24, yaw: -0.2, kind: 3 as const, h: 0.44 },
  { x: -0.27, y: 0.32, z: -0.3, yaw: 0.25, kind: 2 as const, h: 0.38 },
  { x: -0.27, y: 0.32, z: 0.3, yaw: -0.25, kind: 1 as const, h: 0.42 },
]
/** the register's figure tabs: the amount (¥ 1 2 8 0 as it might be), and its maker's plate */
/** the customers' display: green figures on black, the amount to pay */
/** a key of the register's keyboard */
export const REG_GEO = {
  body: new THREE.BoxGeometry(1, 1, 1),
  key: new THREE.CylinderGeometry(0.004, 0.004, 0.016, 6),
  cap: new THREE.CylinderGeometry(0.012, 0.012, 0.006, 12),
  round: new RoundedBoxGeometry(1, 1, 1, 3, 0.12),
  cup: new THREE.CylinderGeometry(0.025, 0.022, 0.06, 14),
  ball: new THREE.SphereGeometry(0.04, 14, 10),
  ear: new THREE.ConeGeometry(0.012, 0.026, 6),
  paw: new THREE.CapsuleGeometry(0.01, 0.03, 4, 8),
}
