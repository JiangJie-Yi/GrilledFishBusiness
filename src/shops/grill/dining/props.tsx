import { useMemo } from 'react'
import * as THREE from 'three'
import { inkModel } from '@/scene/render/inkHull'
import { useGLTF } from '@react-three/drei'
import { nameOver } from '@/shops/grill/bar'

const BARRELS_URL = import.meta.env.BASE_URL + 'models/komodaru.glb'
/** a stack of straw-wrapped sake barrels (菰樽, blender/komodaru.py: two on the floor, one on them), toon-shaded and inked, stood on the
 * floor, 1.13 across as it always was (item 72: the barrels squatter now, as real ones, so it's the width kept, not the height); `part`
 * turns each stack its own way so two never look alike. Low-poly, its straw, cords and print all in its pictures: the normal map kept
 * (the weave's rows and the cords stand proud in the light), the frayed straw over the rims and the cords' ends on cards cut out by their
 * alpha (double-sided, no ink: a line round each card would draw its edges) */
export function SakeStack({ part }: { part: number }) {
  const gltf = useGLTF(BARRELS_URL) as unknown as { scene: THREE.Group }
  const stack = useMemo(() => {
    const root = gltf.scene.clone(true)
    root.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const src = m.material as THREE.MeshStandardMaterial
      const card = /Cards/.test(m.name)
      m.material = new THREE.MeshToonMaterial({
        color: src.color.clone(), map: src.map ?? null, normalMap: src.normalMap ?? null,
        ...(card ? { alphaTest: 0.5, side: THREE.DoubleSide } : {}),
      })
      // (the cards' picture not mipmapped: far off, its thin straws would blur into the alpha and vanish)
      if (card && src.map) { src.map.generateMipmaps = false; src.map.minFilter = THREE.LinearFilter }
      m.castShadow = !card
      m.receiveShadow = true
    })
    // (no ink round the cards (the straw frayed over the lids, the cords' ends): a line round each drew a black zigzag along each rim)
    inkModel(root, (m) => /Cards/.test(m.name), { width: 0.0018, weld: true })
    const box = new THREE.Box3().setFromObject(root)
    const size = box.getSize(new THREE.Vector3())
    const k = 1.13 / (size.x || 1)
    const c = box.getCenter(new THREE.Vector3())
    const out = new THREE.Group()
    root.position.set(-c.x, -box.min.y, -c.z)
    out.add(root)
    out.scale.setScalar(k)
    // (its marks turned to the room)
    out.rotation.y = part ? -0.95 : -0.62
    return out
  }, [gltf, part])
  return <primitive object={stack} />
}
/**
 * A weeping willow (柳) in a tall glazed pot (blender/willow.py; the owner's: its quality up, its faces not too many: it was a pot, a stick,
 * fourteen tubes and 140 little cones, 2,128 triangles; now 1,540): a celadon pot run pale from the rim, a slender trunk, six branches arching
 * over, and its long twigs hanging, each two crossed strips of a painted twig and its leaves, drawn double-sided and cut out by their alpha
 * (no ink line round them: it would draw their strips' edges)
 */
const WILLOW_URL = import.meta.env.BASE_URL + 'models/willow.glb'
useGLTF.preload(WILLOW_URL)
export function WillowModel() {
  const gltf = useGLTF(WILLOW_URL) as unknown as { scene: THREE.Group }
  const obj = useMemo(() => {
    const r = gltf.scene.getObjectByName('Willow')!.clone(true)
    r.position.set(0, 0, 0)
    const made = new Map<THREE.Material, THREE.Material>()
    r.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const src = m.material as THREE.MeshStandardMaterial
      let t = made.get(src)
      if (!t) {
        const leaves = src.name === 'WillowLeaves'
        t = new THREE.MeshToonMaterial({ color: src.color.clone(), map: src.map ?? null, side: leaves ? THREE.DoubleSide : THREE.FrontSide, alphaTest: leaves ? 0.5 : 0 })
        // (the leaves' picture not made smaller for the distance: its little leaves averaged into the gaps round them came out under the cut-off,
        // and from the overview the willow stood bare (the owner's view); sharp at every distance instead)
        if (leaves && src.map) { src.map.minFilter = THREE.LinearFilter; src.map.generateMipmaps = false; src.map.needsUpdate = true }
        made.set(src, t)
      }
      m.material = t
      m.castShadow = true
      m.receiveShadow = true
    })
    inkModel(r, (m) => /Leaves|Soil|Moss/.test(m.name), { width: 0.004, weld: true })
    return r
  }, [gltf])
  // (pointed at, what it is (the owner's); a group round it: a primitive's own handlers aren't attached)
  return <group {...WILLOW_SAYS}><primitive object={obj} /></group>
}
const WILLOW_SAYS = nameOver('【觀賞盆栽】垂柳', '墨色粗陶盆裡的垂柳，枝條隨意垂下，盆面鋪著青苔')
export const LAMP_DROP = 0.36
