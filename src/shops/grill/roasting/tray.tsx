import { memo, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { sameProps } from '@/scene/sameProps'
import { BOARD_SLOTS } from '@/game/kitchen/fireSlots'
import { FREEZER } from '@/shops/grill/Decor'
import { BOARD } from '@/shops/grill/bar'
import { getEdit } from '@/shops/grill/edit'
import { askPantry, tipOver } from '@/shops/grill/bar'
import { STACK_DIR } from './tuning'

/**
 * The big chopping board (blender/cutboard.py): thick warm wood, four planks edge-glued along its length, its corners rounded and edges
 * eased, the knife's fine scratches over its middle; drawn in the room's toon light, with the ink line round it.
 */
const CUTBOARD_URL = import.meta.env.BASE_URL + 'models/cutboard.glb'
useGLTF.preload(CUTBOARD_URL)
/** A shallow wooden tray (盛り板) where ordered food waits raw, to be carried onto the fire. */
export const Tray = memo(TrayImpl, sameProps)
function TrayImpl({ position, container }: { position: [number, number, number]; container: string }) {
  const gltf = useGLTF(CUTBOARD_URL) as unknown as { scene: THREE.Group }
  const { geometry, map } = useMemo(() => {
    gltf.scene.updateMatrixWorld(true)
    const m = gltf.scene.getObjectByName('CutBoard') as THREE.Mesh
    const g = m.geometry.clone().applyMatrix4(m.matrixWorld)
    const map = (m.material as THREE.MeshStandardMaterial).map
    if (map) map.anisotropy = 8
    return { geometry: g, map }
  }, [gltf])
  // in front of the fire, its long side running across the screen
  const yaw = Math.atan2(-STACK_DIR.z, STACK_DIR.x)
  // (pointed at, how many are on it of how many it holds; clicked, the fridge's freezer opened to take more out onto it (item 115, the owner's,
  // 2026-11-15))
  const says = () => `食材 ${BOARD.n}/${BOARD_SLOTS}｜點一下打開冷凍區`
  return (
    <group position={position} rotation-y={yaw} userData={{ container }}
      onPointerOver={(e) => { if (getEdit().on) return; tipOver('砧板', says()).onPointerOver(e) }}
      onPointerOut={(e) => { tipOver('砧板', '').onPointerOut(e) }}
      onClick={(e) => {
        e.stopPropagation()
        if (getEdit().on) return
        FREEZER.open = true
        askPantry('frozen', 'freezer', () => { FREEZER.open = false })
      }}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshToonMaterial color="#ffffff" map={map} />
      </mesh>
      <mesh geometry={geometry} scale={[1.012, 1.08, 1.02]}>
        <meshBasicMaterial color="#3b2a20" side={THREE.BackSide} />
      </mesh>
    </group>
  )
}
/** A pinching hand (for taking salt), drawn over the 3D view while salt is carried. */
export function PinchHand() {
  return (
    <svg className="pinch-hand" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M22 60c-6-6-10-14-9-22 1-5 3-8 6-9l1-14c0-3 5-3 5 0v12l1-16c0-3 5-3 5 0v15l1-12c0-3 5-3 5 0v13l1-8c0-3 5-3 5 0v14c0 8-3 14-7 19-3 4-4 6-4 8z"
        fill="#f3d2b0" stroke="#3b2a20" strokeWidth="2" strokeLinejoin="round" />
      <path d="M19 29c-4 1-8 4-8 8 0 3 3 4 6 2l5-4" fill="#f3d2b0" stroke="#3b2a20" strokeWidth="2"
        strokeLinejoin="round" />
      <circle cx="24" cy="46" r="1.2" fill="#fff" />
      <circle cx="27" cy="50" r="1" fill="#fff" />
    </svg>
  )
}
