import { lightSwitchSound } from '@/shops/grill/restroomSound'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { SWITCH_SPOT } from '@/game/shopState'
import * as THREE from 'three'
import { inkModel } from '@/scene/inkHull'
import { useGLTF } from '@react-three/drei'
import { handOver } from '@/shops/grill/bar'
import { getEdit } from '@/shops/grill/edit'
import { setTip } from '@/scene/hoverTip'
import { getLights, pressLightSwitch, useLights } from '@/scene/lightsStore'
import { lightOn, type Circuit } from '@/game/roomLights'

const SWITCH_URL = import.meta.env.BASE_URL + 'models/lightswitch.glb'
/** the slim one (スリムスイッチ, 3.4 cm by 12): the toilets', on the post between their two doors */
const SWITCH_SLIM_URL = import.meta.env.BASE_URL + 'models/lightswitch-slim.glb'
/**
 * The light switch on the wall by the door (blender/lightswitch.py): an ivory wide rocker at hand height. A click puts the shop's lights out
 * or on again (scene/lightsStore; the lamps and the room's light follow it): the rocker rocks over, and while the lights are out its
 * little guide light (ホタル) glows green, to find it by in the dark. Facing -x (the wall's own frame: the room).
 */
/** how far from the wall's end by the way in the room's switch is (the door lanterns' a plate's width nearer the way in; the owner moved
 * the pair 0.54 further in along the wall) */
// (and 0.5 further along the wall, toward the round window (item 298, the owner's, 2026-11-17: 「店內電燈與門口燈籠 都X:-0.5 然後 Reset」: the
// panel's X runs along the wall the other way, its parent's z))
export const GENKAN_SWITCH = 1.36
export const SWITCH_STEP = 0.11
/** how far out from the wall the post between the toilets' doors stands (its face): the toilets' switch plate on it */
export const WC_POST_FACE = 0.06
/** each switch's name, and what pressing it does */
const SWITCH_SAYS: Record<Circuit, { title: string; on: string; off: string }> = {
  room: { title: '店內電燈', on: '點一下關燈', off: '點一下開燈' },
  door: { title: '門口燈籠', on: '點一下熄掉燈籠', off: '點一下點亮燈籠' },
  wcM: { title: '男廁電燈', on: '點一下關燈', off: '點一下開燈' },
  wcF: { title: '女廁電燈', on: '點一下關燈', off: '點一下開燈' },
}
export function LightSwitch({ circuit = 'room', slim = false }: { circuit?: Circuit; slim?: boolean }) {
  const on = lightOn(useLights(), circuit)
  const [lit, setLit] = useState(false)
  const tag = () => { const say = SWITCH_SAYS[circuit]; setTip({ title: say.title, hint: lightOn(getLights(), circuit) ? say.on : say.off }) }
  const press = (e: { stopPropagation: () => void }) => { e.stopPropagation(); if (getEdit().on) return; pressLightSwitch(circuit); lightSwitchSound(lightOn(getLights(), circuit)); tag() }
  const gltf = useGLTF(slim ? SWITCH_SLIM_URL : SWITCH_URL) as unknown as { scene: THREE.Group }
  const model = useMemo(() => {
    const root = gltf.scene.clone(true)
    const toon = new Map<THREE.Material, THREE.MeshToonMaterial>()
    const lamp = new THREE.MeshBasicMaterial({ toneMapped: false })
    root.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const src = m.material as THREE.MeshStandardMaterial
      if (src.name === 'SwitchLamp') { m.material = lamp; return }
      let t = toon.get(src)
      if (!t) { t = new THREE.MeshToonMaterial({ color: src.color.clone() }); toon.set(src, t) }
      m.material = t
    })
    inkModel(root, (m) => /Lamp/.test(m.name), { width: 0.0012, weld: true })
    return { root, rocker: root.getObjectByName('SwitchRocker'), lamp, toon: [...toon.values()] }
  }, [gltf])
  useEffect(() => {
    if (model.rocker) model.rocker.rotation.x = on ? -0.14 : 0.14
    model.lamp.color.set(on ? '#7c8a72' : '#8dffb0')
  }, [model, on])
  useEffect(() => { for (const t of model.toon) t.emissive.set(lit ? '#2a2a30' : '#000000') }, [model, lit])
  // (the room's switch: where it is in the world, for one of the staff coming in to a dark shop to walk to (SWITCH_SPOT); now and then, it
  // may be moved)
  const at = useRef<THREE.Group>(null)
  const since = useRef(1)
  useFrame((_, dt) => {
    if (circuit !== 'room' || !at.current || (since.current += dt) < 1) return
    since.current = 0
    const p = at.current.getWorldPosition(new THREE.Vector3()), f = at.current.getWorldDirection(new THREE.Vector3())
    SWITCH_SPOT.at = { x: p.x, y: p.y, z: p.z }
    SWITCH_SPOT.front = { x: f.x, y: 0, z: f.z }
  })
  return (
    <group ref={at} rotation-y={-Math.PI / 2} onClick={press}
      onPointerOver={(e: { stopPropagation: () => void }) => { e.stopPropagation(); if (getEdit().on) return; setLit(true); handOver.onPointerOver(e as never); tag() }}
      onPointerOut={(e: { stopPropagation: () => void }) => { setLit(false); handOver.onPointerOut(e as never); setTip(null) }}>
      {/* (the handlers on a group round it: a primitive's own aren't attached) */}
      <primitive object={model.root} />
    </group>
  )
}
useGLTF.preload(SWITCH_URL)
useGLTF.preload(SWITCH_SLIM_URL)
const SWITCH_DOUBLE_URL = import.meta.env.BASE_URL + 'models/lightswitch-double.glb'
/** one plate, two rockers (blender/lightswitch.py, SWITCH=double): each its own circuit, its own guide light; which one's pointed at or
 * pressed by which side of the plate the pointer's on (the first, -x, on the left) */
export function DoubleSwitch({ circuits }: { circuits: [Circuit, Circuit] }) {
  const lights = useLights()
  const [lit, setLit] = useState<0 | 1 | null>(null)
  const gltf = useGLTF(SWITCH_DOUBLE_URL) as unknown as { scene: THREE.Group }
  const model = useMemo(() => {
    const root = gltf.scene.clone(true)
    const toon = new Map<THREE.Material, THREE.MeshToonMaterial>()
    const lamps = [new THREE.MeshBasicMaterial({ toneMapped: false }), new THREE.MeshBasicMaterial({ toneMapped: false })]
    root.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const src = m.material as THREE.MeshStandardMaterial
      if (src.name === 'SwitchLamp') { m.material = lamps[/1$/.test(m.name) ? 1 : 0]; return }
      let t = toon.get(src)
      if (!t) { t = new THREE.MeshToonMaterial({ color: src.color.clone() }); toon.set(src, t) }
      m.material = t
    })
    inkModel(root, (m) => /Lamp/.test(m.name), { width: 0.0012, weld: true })
    return { root, rockers: [root.getObjectByName('SwitchRocker0'), root.getObjectByName('SwitchRocker1')], lamps, toon: [...toon.values()] }
  }, [gltf])
  useEffect(() => {
    circuits.forEach((c, k) => {
      const on = lightOn(lights, c)
      const r = model.rockers[k]
      if (r) r.rotation.x = on ? -0.14 : 0.14
      model.lamps[k].color.set(on ? '#7c8a72' : '#8dffb0')
    })
  }, [model, lights, circuits])
  useEffect(() => { for (const t of model.toon) t.emissive.set(lit !== null ? '#2a2a30' : '#000000') }, [model, lit])
  const which = (e: { point: THREE.Vector3 }) => (model.root.worldToLocal(e.point.clone()).x < 0 ? 0 : 1) as 0 | 1
  const tag = (k: 0 | 1) => { const c = circuits[k], say = SWITCH_SAYS[c]; setTip({ title: say.title, hint: lightOn(getLights(), c) ? say.on : say.off }) }
  return (
    <group rotation-y={-Math.PI / 2}
      onClick={(e: { stopPropagation: () => void; point: THREE.Vector3 }) => {
        e.stopPropagation(); if (getEdit().on) return
        const k = which(e); pressLightSwitch(circuits[k]); lightSwitchSound(lightOn(getLights(), circuits[k])); tag(k)
      }}
      onPointerMove={(e: { stopPropagation: () => void; point: THREE.Vector3 }) => { if (getEdit().on) return; const k = which(e); if (k !== lit) { setLit(k); tag(k) } }}
      onPointerOver={(e: { stopPropagation: () => void; point: THREE.Vector3 }) => { e.stopPropagation(); if (getEdit().on) return; const k = which(e); setLit(k); handOver.onPointerOver(e as never); tag(k) }}
      onPointerOut={(e: { stopPropagation: () => void }) => { setLit(null); handOver.onPointerOut(e as never); setTip(null) }}>
      <primitive object={model.root} />
    </group>
  )
}
useGLTF.preload(SWITCH_DOUBLE_URL)
