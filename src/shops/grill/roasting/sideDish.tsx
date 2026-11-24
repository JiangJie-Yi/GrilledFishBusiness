import { memo } from 'react'
import * as THREE from 'three'
import { sameProps } from '@/scene/kit/sameProps'
import { PLUM_WARE, wareGeometry } from '@/shops/grill/ware'
import { DISH_R, wareOnce } from './tools'

/** A small round side dish (小皿) for onigiri and mochi, of the same set as the plates (plum blossom), inked. */
export const SideDish = memo(SideDishImpl, sameProps)
function SideDishImpl({ position, container }: { position: [number, number, number]; container: string }) {
  const geometry = wareOnce('dish', () => {
    const R = DISH_R
    return wareGeometry([[0, 0], [R * 0.55, 0], [R * 0.62, 0.012], [R * 0.85, 0.03], [R, 0.05], [R * 0.97, 0.056],
      [R * 0.82, 0.038], [R * 0.55, 0.018], [0, 0.018]], R)
  })
  return (
    <group position={position} userData={{ container }}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshToonMaterial color="#ffffff" map={PLUM_WARE} />
      </mesh>
      <mesh geometry={geometry} scale={[1.03, 1.08, 1.03]}>
        <meshBasicMaterial color="#3b2a20" side={THREE.BackSide} />
      </mesh>
    </group>
  )
}
