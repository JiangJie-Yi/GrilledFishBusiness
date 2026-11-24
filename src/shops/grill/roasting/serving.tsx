import { memo, useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { inkModel } from '@/scene/render/inkHull'
import { tick } from '@/scene/kit/speed'
import { sameProps } from '@/scene/kit/sameProps'
import { useEditSel } from '@/shops/grill/edit'
import { reflectStudio } from '@/scene/render/studio'
import { PLUM_WARE, wareGeometry } from '@/shops/grill/kitchen/ware'
import { warmLater } from '@/scene/render/Prewarm'
import { BOWL_R, TRAY_YAW, TRAY_OFF } from './tuning'
import { basketScale, wareOnce } from './tools'

/** (item 317) how long the bowl and the tray take to change places as the shop opens or shuts (s); and how far through that it is (0 the
 * bowl, 1 the tray) and how big the tray's drawn now (the tongs at rest go with it; the pointer's tag names which is there) */
const TRAY_SWAP_S = 0.7
export const TRAY_SWAP = { k: 0, tray: 0 }
/** one coming in as the other goes: nothing till half way, then up with a little overshoot, set down (going, the same backwards: a little
 * lift, then away) */
const popIn = (x: number) => {
  if (x <= 0.55) return 0
  const t = (x - 0.55) / 0.45, c = 1.70158
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2
}
const KAKU_URL = import.meta.env.BASE_URL + 'models/kakubat.glb'
const TRAY_OFF_AT = TRAY_OFF.toArray() as [number, number, number]
/** the tray and the tongs (blender/kakubat.py), made once: the steel the kitchen's (the studio in it), the rack's wires their picture with
 * the gaps cut out (seen from either side), an ink line round the tray; the tongs' two arms, each turned about its hinge to close them */
export const KAKU: { made: { tray: THREE.Object3D; tongs: THREE.Object3D; arms: THREE.Object3D[] } | null } = { made: null }
function kakuParts(scene: THREE.Group) {
  if (KAKU.made) return KAKU.made
  const root = scene.clone(true)
  // (a working tray's dull, brushed stainless: grey, its rack's bright wires plain over its floor)
  const steel = new THREE.MeshStandardMaterial({ color: '#737a82', metalness: 0.5, roughness: 0.55, envMapIntensity: 0.4 })
  reflectStudio(steel)
  let rack: THREE.Material | null = null
  root.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    const src = m.material as THREE.MeshStandardMaterial
    if (/Rack/.test(m.name)) {
      rack ??= new THREE.MeshToonMaterial({ color: '#ffffff', map: src.map, alphaTest: 0.5, side: THREE.DoubleSide })
      m.material = rack
      m.castShadow = false
    } else {
      m.material = steel
      m.castShadow = true
    }
    m.receiveShadow = true
  })
  const tray = root.getObjectByName('KakubatTray')!, tongs = root.getObjectByName('KakubatTongs')!
  tray.removeFromParent()
  tongs.removeFromParent()
  tray.position.set(0, 0, 0)
  tongs.position.set(0, 0, 0)
  inkModel(tray, (m) => /Rack/.test(m.name), { width: 0.0016, weld: true })
  // (its programs made with the page's: it's first drawn as the shop opens)
  warmLater(tray)
  warmLater(tongs)
  KAKU.made = { tray, tongs, arms: [tongs.getObjectByName('KakubatTong0')!, tongs.getObjectByName('KakubatTong1')!] }
  return KAKU.made
}
useGLTF.preload(KAKU_URL)
/** the floor's server's tongs by the open shop's tray (item 317): drawn here, posed each frame by Roasting's tongStep */
export function ServeTongs() {
  const gltf = useGLTF(KAKU_URL) as unknown as { scene: THREE.Group }
  const k = useMemo(() => kakuParts(gltf.scene), [gltf])
  return <primitive object={k.tongs} />
}
/**
 * The tasting bowl, or with the shop open the square iron tray in its place (item 317, the owner's: 「開店的時候老闆的碗會收起來換成方形鐵
 * 盤」): the one put away as the other's set down (a little lift and away, a little overshoot set down), back again as it shuts.
 */
export function TasteBowlImpl({ position, container, open = false }: { position: [number, number, number]; container: string; open?: boolean }) {
  const geometry = wareOnce('bowl', () => {
    const R = BOWL_R
    return wareGeometry([[0, 0], [R * 0.4, 0], [R * 0.46, 0.012], [R * 0.7, 0.04], [R * 0.92, 0.1], [R, 0.15], [R * 0.98, 0.158],
      [R * 0.9, 0.11], [R * 0.66, 0.05], [R * 0.4, 0.024], [0, 0.024]], R)
  })
  const gltf = useGLTF(KAKU_URL) as unknown as { scene: THREE.Group }
  const kaku = useMemo(() => kakuParts(gltf.scene), [gltf])
  const bowl = useRef<THREE.Group>(null), tray = useRef<THREE.Group>(null)
  const swap = useRef(open ? 1 : 0)
  useFrame((_, dt) => {
    const want = open ? 1 : 0, step = tick(dt) / TRAY_SWAP_S
    if (swap.current !== want) swap.current = want > swap.current ? Math.min(1, swap.current + step) : Math.max(0, swap.current - step)
    const s = swap.current, bs = popIn(1 - s), ts = popIn(s)
    TRAY_SWAP.k = s
    TRAY_SWAP.tray = ts
    if (bowl.current) { bowl.current.scale.setScalar(Math.max(1e-4, bs)); bowl.current.visible = bs > 0.002 }
    if (tray.current) { tray.current.scale.setScalar(Math.max(1e-4, ts)); tray.current.visible = ts > 0.002 }
  })
  return (
    <group position={position} userData={{ container }}>
      <group ref={bowl} visible={!open}>
        <mesh geometry={geometry} castShadow receiveShadow>
          <meshToonMaterial color="#ffffff" map={PLUM_WARE} />
        </mesh>
        <mesh geometry={geometry} scale={[1.03, 1.06, 1.03]}>
          <meshBasicMaterial color="#3b2a20" side={THREE.BackSide} />
        </mesh>
      </group>
      <group ref={tray} position={TRAY_OFF_AT} rotation-y={TRAY_YAW} visible={open}><primitive object={kaku.tray} /></group>
    </group>
  )
}

const ZARU_URL = import.meta.env.BASE_URL + 'models/zaru.glb'
/** the basket's model, made once: its weave and its bound rim in the room's toon light (their relief maps kept), an ink line round it */
let zaruBase: THREE.Object3D | null = null
/** The woven bamboo basket (竹ざる) the foil-roasted potatoes are served into (blender/zaru.py): a plain weave of split bamboo, a rolled rim
 * bound with cane. */
export const Basket = memo(BasketImpl, sameProps)
function BasketImpl({ position, container }: { position: [number, number, number]; container: string }) {
  const gltf = useGLTF(ZARU_URL) as unknown as { scene: THREE.Group }
  // (its size: BASKET_SIZE, and as it's sized in the editor (item 553))
  const size = Number(useEditSel(() => String(basketScale())))
  const obj = useMemo(() => {
    if (!zaruBase) {
      const r = gltf.scene.clone(true)
      r.traverse((o) => {
        const m = o as THREE.Mesh
        if (!m.isMesh) return
        const src = m.material as THREE.MeshStandardMaterial
        m.material = new THREE.MeshToonMaterial({ color: '#ffffff', map: src.map, normalMap: src.normalMap, side: THREE.DoubleSide })
        m.castShadow = true
        m.receiveShadow = true
      })
      inkModel(r, () => false, { width: 0.004, weld: true })
      zaruBase = r
    }
    return zaruBase.clone(true)
  }, [gltf])
  return (
    <group position={position} scale={size} userData={{ container }}>
      <primitive object={obj} />
    </group>
  )
}
useGLTF.preload(ZARU_URL)
