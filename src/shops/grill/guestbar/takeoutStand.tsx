import { memo, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { mergeByMaterial } from '@/scene/StaticBatch'
import { useRiceTub } from '@/shops/grill/Decor'
import { inkModel } from '@/scene/inkHull'
import { getEdit } from '@/shops/grill/edit'
import { WARM_TUB_HOLDS, keptWarm } from '@/game/takeout'
import { nameOver, TAKEOUT } from '@/shops/grill/bar'
import { tick } from '@/scene/speed'
import { FOLK_FIT } from './decorTex'
import { useRiderBag, useOwnLooks } from './looks'

/** the waiting bench (blender/bench.py): two cedar planks on six dark legs, its seat a stool's height, long enough for four */
const BENCH_URL = import.meta.env.BASE_URL + 'models/bench.glb'
useGLTF.preload(BENCH_URL)
export const WaitingBench = memo(function WaitingBench() {
  const gltf = useGLTF(BENCH_URL) as unknown as { scene: THREE.Group }
  const model = useMemo(() => {
    const r = (gltf.scene.getObjectByName('Bench') ?? gltf.scene).clone(true)
    r.position.set(0, 0, 0)
    const made = new Map<THREE.Material, THREE.Material>()
    r.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const src = m.material as THREE.MeshStandardMaterial
      let t = made.get(src)
      if (!t) { t = new THREE.MeshToonMaterial({ color: src.color.clone(), map: src.map ?? null }); t.name = src.name; made.set(src, t) }
      m.material = t
      m.castShadow = true
      m.receiveShadow = true
    })
    inkModel(r, () => false, { width: 0.0016, weld: true })
    return mergeByMaterial(r)
  }, [gltf])
  return <group {...nameOver('候位長凳', '客滿時客人坐在這裡等位子')}><primitive object={model} /></group>
})
/** the takeaway stand and the kraft bag (blender/takeout.py): each stood on its foot at its origin, in the room's toon light */
const TAKEOUT_URL = import.meta.env.BASE_URL + 'models/takeout.glb'
useGLTF.preload(TAKEOUT_URL)
const takeoutPart = (scene: THREE.Group, name: string) => {
  const r = scene.getObjectByName(name)!.clone(true)
  r.position.set(0, 0, 0)
  const made = new Map<THREE.Material, THREE.Material>()
  r.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    const src = m.material as THREE.MeshStandardMaterial
    let t = made.get(src)
    if (!t) { t = new THREE.MeshToonMaterial({ color: src.color.clone(), map: src.map ?? null }); t.name = src.name; made.set(src, t) }
    m.material = t
    m.castShadow = true
    m.receiveShadow = true
  })
  inkModel(r, () => false, { width: 0.0016, weld: true })
  const merged = mergeByMaterial(r)
  // (its foot on its origin, whatever the export left under it)
  const b = new THREE.Box3().setFromObject(merged)
  const g = new THREE.Group()
  merged.position.y -= b.min.y
  merged.position.x -= (b.min.x + b.max.x) / 2
  merged.position.z -= (b.min.z + b.max.z) / 2
  g.add(merged)
  return g
}
/** (made once, every bag a copy of it sharing its shapes and paints) */
const BAGS = new WeakMap<THREE.Object3D, THREE.Group>()
export const KraftBag = memo(function KraftBag() {
  const gltf = useGLTF(TAKEOUT_URL) as unknown as { scene: THREE.Group }
  const bag = useMemo(() => {
    let base = BAGS.get(gltf.scene)
    if (!base) { base = takeoutPart(gltf.scene, 'KraftBag'); BAGS.set(gltf.scene, base) }
    return base.clone(true)
  }, [gltf])
  return <primitive object={bag} />
})
export const TakeoutStandModel = memo(function TakeoutStandModel() {
  const gltf = useGLTF(TAKEOUT_URL) as unknown as { scene: THREE.Group }
  const stand = useMemo(() => takeoutPart(gltf.scene, 'TakeoutStand'), [gltf])
  return <group {...nameOver('外帶桌', '外帶的牛皮紙袋放這裡，收銀員轉身拿給客人')}><primitive object={stand} /></group>
})
/** the stand's top's height (blender/takeout.py's STAND_H), and its bags' places along it */
export const STAND_TOP = 0.34
/** where the bags stand on the round table (its top's radius 0.31, blender/takeout.py's TOP_R): along its front half, side by side (x, z) */
// (round the warming tub's front, each turned to face out (the owner's, 2026-11-11: the tub in the table's middle): x, z, and its turn)
export const STAND_SLOTS: [number, number, number][] = [-0.75, 0, 0.75].map((a) => [Math.sin(a) * 0.29, Math.cos(a) * 0.29, a])
/** the warming tub on its back half: its middle back from the table's, and how big it's drawn (the rice tub's model (blender/ricetub.py, 0.27
 * round its staves, 0.42 high) a little under half its size: some 25 across, beside the bags, on a table 62 across) */
// (1.65 times what it was drawn (the owner's, 2026-11-11): some 39 across; forward a little to stay on the table, the bags clear of it)
// (then 1.1 times again, in the table's middle (the owner's): some 43 across)
export const WARM_TUB_Z = 0, WARM_TUB_SCALE = 0.44 * 1.65 * 1.1
/** the warming tub (保溫桶; the owner's, 2026-11-11: the old rice tub, put on the takeaway table): the sawara tub bound in copper, its lid on */
// (opened by a click as the rice tub was: its lid lifted off and leant against its side, the rice kept warm in it seen; another, shut)
/** the takeaways kept warm in the tub (the owner's, 2026-11-11: it holds the takeaways, not rice): kraft paper boxes, a red band round each, two
 * to a layer, up from its floor; as many shown as are packed and waiting (game/takeout keptWarm), the rest shrunk to nothing (drawn from the
 * start, so none is new to the renderer when it's shown) */
const WARM_PACK_GEO = new THREE.BoxGeometry(0.18, 0.055, 0.125)
const WARM_BAND_GEO = new THREE.BoxGeometry(0.03, 0.058, 0.128)
const WARM_PACK_MAT = new THREE.MeshToonMaterial({ color: '#c79d66' })
const WARM_BAND_MAT = new THREE.MeshToonMaterial({ color: '#b3362c' })
const WARM_PACKS: [number, number, number][] = Array.from({ length: WARM_TUB_HOLDS }, (_, i) => [(i % 2 ? 1 : -1) * 0.094, 0.028 + 0.0275 + Math.floor(i / 2) * 0.057, (i % 4 < 2 ? 1 : -1) * 0.01])
/** what keeps them warm in it, as a shop does (item 80, the owner's, 2026-11-13: "put some real warming things in it"): a silver insulating
 * liner (保温シート) inside the wall, its top folded out over the rim; and a cotton tenugui laid over the packs, riding on the topmost layer. The
 * tub's own units (blender/ricetub.py: the wall 0.255 round at its foot, 0.27 at its rim, 0.42 tall); drawn from the start, as the tub is */
const LINER_GEO = new THREE.LatheGeometry([[0.236, 0.03], [0.25, 0.4], [0.252, 0.425], [0.268, 0.43], [0.281, 0.418], [0.284, 0.385]]
  .map(([r, y]) => new THREE.Vector2(r, y)), 24)
const crinkle = (paint: (g: CanvasRenderingContext2D, w: number) => void, size = 128) => {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')!
  paint(g, size)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}
// (the liner's foil: smooth silver, broad soft sheens over it, crossed by fine creases, each a bright line with its dark side beside it (item
// 102, the owner's, 2026-11-14: 'the foil far too rough': it was big hard triangles of grey, like broken stone); it tiles, so the creases wrap)
const LINER_TEX = crinkle((g, w) => {
  let seed = 7
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  g.fillStyle = '#c4c8cd'
  g.fillRect(0, 0, w, w)
  for (let i = 0; i < 14; i++) {
    const x = rnd() * w, y = rnd() * w, r = w * (0.15 + rnd() * 0.25), v = rnd() < 0.5 ? 255 : 150
    for (const [ox, oy] of [[0, 0], [-w, 0], [w, 0], [0, -w], [0, w]]) {
      const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r)
      gr.addColorStop(0, `rgba(${v},${v},${v + 4},0.35)`); gr.addColorStop(1, `rgba(${v},${v},${v + 4},0)`)
      g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2)
    }
  }
  g.lineCap = 'round'
  for (let i = 0; i < 90; i++) {
    let x = rnd() * w, y = rnd() * w, a = rnd() * Math.PI * 2
    const pts: [number, number][] = [[x, y]]
    for (let k = 0; k < 2; k++) { a += (rnd() - 0.5) * 0.8; const l = 6 + rnd() * 12; x += Math.cos(a) * l; y += Math.sin(a) * l; pts.push([x, y]) }
    for (const [dx, col, lw] of [[1.2, 'rgba(120,124,130,0.22)', 2.2], [0, 'rgba(255,255,255,0.4)', 1.4]] as const) {
      for (const [ox, oy] of [[0, 0], [-w, 0], [w, 0], [0, -w], [0, w]]) {
        g.strokeStyle = col; g.lineWidth = lw
        g.beginPath(); pts.forEach(([px, py], k) => (k ? g.lineTo : g.moveTo).call(g, px + ox + dx, py + oy + dx)); g.stroke()
      }
    }
  }
}, 256)
if (LINER_TEX) LINER_TEX.repeat.set(4, 2)
const LINER_MAT = new THREE.MeshToonMaterial({ color: '#ffffff', map: LINER_TEX, side: THREE.DoubleSide })
// (the tenugui: cotton, indigo stripes across it, its ends a little frayed)
const TENUGUI_TEX = crinkle((g, w) => {
  g.fillStyle = '#efe9dc'
  g.fillRect(0, 0, w, w)
  g.fillStyle = '#2d4f86'
  for (let i = 0; i < 6; i++) g.fillRect(0, 8 + i * 21, w, 7)
  g.fillStyle = '#7d95bd'
  for (let i = 0; i < 6; i++) g.fillRect(0, 17 + i * 21, w, 2)
})
const TENUGUI_MAT = new THREE.MeshToonMaterial({ color: '#ffffff', map: TENUGUI_TEX, side: THREE.DoubleSide })
/** the tenugui's cloth: a little over the packs' two-wide layer, its edges drooping over them */
const TENUGUI_GEO = (() => {
  const g = new THREE.PlaneGeometry(0.42, 0.3, 8, 6).rotateX(-Math.PI / 2)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i)
    const ex = Math.max(0, Math.abs(x) - 0.17) / 0.04, ez = Math.max(0, Math.abs(z) - 0.06) / 0.09
    p.setY(i, -0.05 * Math.min(1, ex * ex + ez * ez) + 0.004 * Math.sin(x * 50 + z * 30))
  }
  g.computeVertexNormals()
  return g
})()
export const WarmTub = memo(function WarmTub() {
  const tub = useRiceTub()
  const [open, setOpen] = useState(false)
  const lid = useRef<THREE.Group>(null)
  const packs = useRef<(THREE.Group | null)[]>([])
  const cloth = useRef<THREE.Mesh>(null)
  const lidT = useRef(0)
  const says = () => {
    const n = keptWarm(TAKEOUT.orders)
    return `外型像盛白飯的木飯桶（おひつ），裡面保溫著打包好的外帶（${n} 份）｜點一下${open ? '蓋上' : '打開'}`
  }
  useFrame((_, dt) => {
    lidT.current = THREE.MathUtils.clamp(lidT.current + (open ? 1 : -1) * tick(dt) * 2.2, 0, 1)
    const k = lidT.current * lidT.current * (3 - 2 * lidT.current)
    if (lid.current) {
      lid.current.position.set(-0.32 * k, 0.42 - 0.1585 * k + Math.sin(k * Math.PI) * 0.22, 0)
      lid.current.rotation.z = k * 1.36
    }
    const n = keptWarm(TAKEOUT.orders)
    packs.current.forEach((g, i) => { if (g) g.scale.setScalar(i < n ? 1 : 0.0001) })
    // (the cloth over the topmost layer; with none in the tub, put away (item 102, the owner's: folded small on its floor it read as nothing
    // anyone could name, a striped scrap))
    if (cloth.current) {
      const layers = Math.ceil(n / 2)
      cloth.current.position.y = layers ? 0.028 + layers * 0.057 + 0.004 : 0.034
      cloth.current.scale.setScalar(layers ? 1 : 0.0001)
    }
  })
  return (
    <group scale={WARM_TUB_SCALE}
      onClick={(e) => { e.stopPropagation(); if (getEdit().on) return; setOpen((v) => !v) }}
      onPointerOver={(e) => nameOver('保溫桶', says()).onPointerOver(e)} onPointerOut={() => nameOver('保溫桶', '').onPointerOut()}>
      <primitive object={tub.body} />
      <mesh geometry={LINER_GEO} material={LINER_MAT} receiveShadow />
      <mesh ref={cloth} geometry={TENUGUI_GEO} material={TENUGUI_MAT} position={[0, 0.034, 0.005]} rotation-y={0.12} castShadow receiveShadow />
      {WARM_PACKS.map((at, i) => (
        <group key={i} ref={(g) => { packs.current[i] = g }} position={at} scale={0.0001}>
          <mesh geometry={WARM_PACK_GEO} material={WARM_PACK_MAT} castShadow />
          <mesh geometry={WARM_BAND_GEO} material={WARM_BAND_MAT} />
        </group>
      ))}
      <group ref={lid} position={[0, 0.42, 0]}><primitive object={tub.lid} /></group>
    </group>
  )
})
/** seconds: the cashier turning round to the stand (and back), taking the bag up, holding it out over the till to the customer */
export const STAND_TURN = 0.7, STAND_LIFT = 0.4, STAND_GIVE = 0.5
/** (in the figure's hand: its fade reaches these, as it does everything it holds) */
export function TakeoutBag() {
  const m = useOwnLooks()
  return (
    <group position-y={-0.1}>
      <mesh position-y={-0.02} material={m.bag}><boxGeometry args={[0.13, 0.12, 0.07]} /></mesh>
      <mesh position-y={0.045} rotation-x={Math.PI / 2} material={m.bag}><torusGeometry args={[0.03, 0.006, 4, 10, Math.PI]} /></mesh>
      <mesh position={[0, -0.02, 0.036]} material={m.seal}><boxGeometry args={[0.02, 0.12, 0.002]} /></mesh>
    </group>
  )
}
/** (beside the figure, not in it: faded here with them) */
// (item 374: drawn again only as its own props change: it was with every redraw of the bar, 6.8 times a second with riders in)
export const RiderGear = memo(function RiderGear({ id, size, fade }: { id: number; size: number; fade: () => number }) {
  // (blender/folk.py's measure: the head a ball of 0.27 about 0.8 up, the body 0.26 round at its widest; all as the figure's scaled)
  const k = FOLK_FIT * size
  const m = useOwnLooks()
  const bag = useRiderBag(id, m.strap)
  useFrame(() => { const f = fade(); for (const x of Object.values(m)) x.opacity = f; if (bag.mat) bag.mat.opacity = f })
  return (
    <group scale={k}>
      {/* (the helmet over the crown of the head, clear of the hair, down to the brow; a band round its rim) */}
      <mesh position-y={0.8} material={m.helmet}><sphereGeometry args={[0.34, 16, 6, 0, Math.PI * 2, 0, Math.PI * 0.4]} /></mesh>
      <mesh position-y={0.8 + 0.34 * Math.cos(Math.PI * 0.4) - 0.01} material={m.band}><cylinderGeometry args={[0.326, 0.328, 0.035, 16, 1, true]} /></mesh>
      {/* (the insulated box of a delivery on their back, worn as a backpack (the owner's, 2026-11-12: a strange brown bag floating behind
          them): its two straps over the shoulders and down the chest; the box itself the platform's, its mark facing away behind them
          (useRiderBag)) */}
      <group position={[0, 0.36, -0.42]} rotation-y={Math.PI}><primitive object={bag.root} /></group>
      {[-1, 1].map((sd) => (
        <group key={sd}>
          <mesh position={[sd * 0.11, 0.56, -0.1]} rotation-x={-0.25} material={m.strap}><boxGeometry args={[0.05, 0.02, 0.36]} /></mesh>
          <mesh position={[sd * 0.11, 0.42, 0.235]} rotation-x={0.25} material={m.strap}><boxGeometry args={[0.05, 0.26, 0.02]} /></mesh>
        </group>
      ))}
    </group>
  )
})
