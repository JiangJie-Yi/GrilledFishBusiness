import { memo, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { StaticBatch } from '@/scene/StaticBatch'
import { inkModel } from '@/scene/inkHull'
import { Movable } from '@/shops/grill/Movable'
import { NOTCH_STEP_AT, NOTCH_STEP_YAW } from './kitchen'

const STEP_URL = import.meta.env.BASE_URL + 'models/notchstep.glb'
useGLTF.preload(STEP_URL)
/** a notch's wooden step (blender/notchstep.py, the owner's 木台階: one block): its top in the table's keyaki, its sides the bar's standing
 * boards; inked, merged, standing still. The owner's in his notch, and the same in the third cook's bay */
export const NotchStep = memo(function NotchStep({ id = 'notchstep', label = '木台階', node = 'NotchStep', at = NOTCH_STEP_AT, yaw = NOTCH_STEP_YAW }: { id?: string
  label?: string; node?: 'NotchStep' | 'SousStep'; at?: THREE.Vector3; yaw?: number }) {
  const gltf = useGLTF(STEP_URL) as unknown as { scene: THREE.Group }
  const obj = useMemo(() => {
    const r = gltf.scene.getObjectByName(node)!.clone(true)
    r.position.set(0, 0, 0)
    // (a duckboard (すのこ): oiled cedar slats with gaps between, on three battens, the model's own wood (the owner's, 2026-11-11: the flat
    // block painted with slats was ugly))
    const made = new Map<THREE.Material, THREE.Material>()
    r.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const src = m.material as THREE.MeshStandardMaterial
      let t = made.get(src)
      if (!t) { t = new THREE.MeshToonMaterial({ color: '#ffffff', map: src.map ?? null }); t.name = src.name; made.set(src, t) }
      m.material = t
      m.castShadow = true
      m.receiveShadow = true
    })
    inkModel(r, () => false, { width: 0.004, weld: true })
    return r
  }, [gltf, node])
  return (
    <Movable id={id} label={label}><StaticBatch plain>
      <group position={at} rotation-y={yaw}><primitive object={obj} /></group>
    </StaticBatch></Movable>
  )
})
