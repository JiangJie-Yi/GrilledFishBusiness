import { memo } from 'react'
import * as THREE from 'three'

/**
 * A sake cup (お猪口): what sake is drunk from at the bar (the owner's, 2026-11-10: not from its bottle), beside the bottle; white porcelain with
 * an indigo ring inside its lip, the sake in it as high as `level`. Its shape turned from a profile (12 round), its foot ring and lip, the
 * hollow inside; its middle at its foot
 */
const CHOKO_PTS: [number, number][] = [[0.012, 0], [0.0135, 0.004], [0.0105, 0.006], [0.017, 0.012], [0.0225, 0.028], [0.024, 0.036],
  [0.0215, 0.0365], [0.0195, 0.028], [0.0135, 0.014], [0.008, 0.009]]
const CHOKO_GEO = (() => {
  const g = new THREE.LatheGeometry(CHOKO_PTS.map(([r, y]) => new THREE.Vector2(r, y)), 12)
  g.computeVertexNormals()
  return g
})()
const CHOKO_SAKE = new THREE.CircleGeometry(0.018, 12).rotateX(-Math.PI / 2)
const CHOKO_MAT = new THREE.MeshToonMaterial({ color: '#f6f3ea', side: THREE.DoubleSide })
const CHOKO_RING = new THREE.TorusGeometry(0.0205, 0.0012, 4, 16).rotateX(Math.PI / 2)
const CHOKO_RING_MAT = new THREE.MeshToonMaterial({ color: '#2c4a7a' })
const CHOKO_SAKE_MAT = new THREE.MeshToonMaterial({ color: '#f2ead0', transparent: true, opacity: 0.8 })
export const SakeCup = memo(function SakeCup({ level = 1 }: { level?: number }) {
  return (
    <group>
      <mesh geometry={CHOKO_GEO} material={CHOKO_MAT} />
      <mesh geometry={CHOKO_RING} material={CHOKO_RING_MAT} position-y={0.0335} />
      {level > 0.05 && <mesh geometry={CHOKO_SAKE} material={CHOKO_SAKE_MAT} position-y={0.012 + 0.018 * Math.min(1, level)} scale={0.62 + 0.38 * Math.min(1, level)} />}
    </group>
  )
})
/**
 * A beer glass (コップ, item 203: bottled beer was drunk from the bottle, the owner's 「啤酒對瓶喝」; at an izakaya a 瓶ビール comes with a
 * small glass to pour it into): a plain tumbler a little wider at its lip, clear, the beer in it amber under a white head, as high as `level`.
 * Turned from a profile (12 round), its middle at its foot; its glass a plain see-through toon (no transmission: CLAUDE.md's rendering rule)
 */
const KOPPU_PTS: [number, number][] = [[0.009, 0.004], [0.0225, 0.004], [0.0235, 0.0], [0.0245, 0.003], [0.03, 0.088], [0.0285, 0.0895],
  [0.0235, 0.008], [0.009, 0.007]]
const KOPPU_GEO = (() => {
  const g = new THREE.LatheGeometry(KOPPU_PTS.map(([r, y]) => new THREE.Vector2(r, y)), 12)
  g.computeVertexNormals()
  return g
})()
/** the beer in it: a short column inside the glass, its top the beer's face; the head a thin disc of foam on it */
const KOPPU_BEER = new THREE.CylinderGeometry(0.0262, 0.0238, 1, 12, 1).translate(0, 0.5, 0)
const KOPPU_HEAD = new THREE.CylinderGeometry(0.0268, 0.0264, 0.008, 12, 1)
// (the glass a warm clear (a cool one over the head turned it lilac), the head a cream white)
const KOPPU_MAT = new THREE.MeshToonMaterial({ color: '#f6f4ee', transparent: true, opacity: 0.26, side: THREE.DoubleSide, depthWrite: false })
const KOPPU_BEER_MAT = new THREE.MeshToonMaterial({ color: '#e0a330', transparent: true, opacity: 0.88 })
const KOPPU_HEAD_MAT = new THREE.MeshToonMaterial({ color: '#fff2d8' })
export const BeerGlass = memo(function BeerGlass({ level = 1 }: { level?: number }) {
  const h = 0.072 * Math.min(1, Math.max(0, level))
  return (
    <group>
      {h > 0.004 && <mesh geometry={KOPPU_BEER} material={KOPPU_BEER_MAT} position-y={0.008} scale-y={h} />}
      {h > 0.004 && <mesh geometry={KOPPU_HEAD} material={KOPPU_HEAD_MAT} position-y={0.008 + h + 0.004} />}
      <mesh geometry={KOPPU_GEO} material={KOPPU_MAT} />
    </group>
  )
})
/** what a drink's poured into: the beer's glass, else the sake cup */
export const DrinkCup = memo(function DrinkCup({ id, level = 1 }: { id: string; level?: number }) {
  return id === 'beer' ? <BeerGlass level={level} /> : <SakeCup level={level} />
})
