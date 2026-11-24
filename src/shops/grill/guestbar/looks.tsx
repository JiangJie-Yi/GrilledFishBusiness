import { useEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { warmLater } from '@/scene/render/Prewarm'

/**
 * A takeaway: in a kraft paper bag (KraftBag, below), in a server's hands, on the stand behind the till, in the cashier's; and in the
 * customer's hand going out. A rider wears a helmet and carries the insulated box of
 * a delivery on their back. Shared shapes and materials, made once.
 */
/** what goes out of the door with a customer, fading with them: hashed from the start (as the figures' own materials, so a fade only moves
 * its opacity, no program made then: the bag in a hand was switched to hashed by the figure's fade as they went, a 100 ms hitch the first
 * time), its own copy for each customer (the fade sets the opacity: shared, one fading out faded every other bag), the hashed program made at
 * loading (warmLater) */
const fading = (color: string) => { const m = new THREE.MeshToonMaterial({ color, alphaHash: true }); m.userData.hashed = true; return m }
const TO_LOOKS = { bag: '#c9a274', seal: '#b3241c', helmet: '#2a2d33', band: '#e0a21c', dark: '#3a3a3e', stripe: '#f2f2ee', strap: '#26282c' }
const ownLooks = () => Object.fromEntries(Object.entries(TO_LOOKS).map(([k, c]) => [k, fading(c)])) as Record<keyof typeof TO_LOOKS, THREE.MeshToonMaterial>
if (typeof document !== 'undefined') {
  const warm = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.01), fading('#ffffff'))
  warmLater(warm)
  // (and the rider's box, its picture on it: a program of its own, made at loading too)
  const pic = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1)
  pic.needsUpdate = true
  const withPic = fading('#ffffff')
  withPic.map = pic
  warmLater(new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.01), withPic))
}
/** the rider's insulated box (blender/deliverybag.py, item 77, the owner's: like Japan's delivery platforms' bags): four made-up platforms'
 * looks in the four quarters of its picture (Torutto teal, モグゴー black, パクッと便 pink, とどけ丸 red); the model's on the first, each rider's
 * own copy of the picture shifted to theirs (picked by the rider), its material their own to fade with them */
const BAG_URL = import.meta.env.BASE_URL + 'models/deliverybag.glb'
useGLTF.preload(BAG_URL)
const BAG_LOOKS: [number, number][] = [[0, 0], [0.5, 0], [0, -0.5], [0.5, -0.5]]
export function useRiderBag(id: number, strap: THREE.Material) {
  const gltf = useGLTF(BAG_URL) as unknown as { scene: THREE.Group }
  const made = useMemo(() => {
    const root = (gltf.scene.getObjectByName('DeliveryBag') ?? gltf.scene).clone(true)
    root.position.set(0, 0, 0)
    let mat: THREE.MeshToonMaterial | null = null
    let pic: THREE.Texture | null = null
    root.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const src = m.material as THREE.MeshStandardMaterial
      if (src.map) {
        pic = src.map.clone()
        const [u, v] = BAG_LOOKS[((id % 4) + 4) % 4]
        pic.offset.set(u, v)
        pic.needsUpdate = true
        mat = fading('#ffffff')
        mat.map = pic
        m.material = mat
      } else m.material = strap
    })
    return { root, mat: mat as THREE.MeshToonMaterial | null, pic: pic as THREE.Texture | null }
  }, [gltf, id, strap])
  useEffect(() => () => { made.mat?.dispose(); made.pic?.dispose() }, [made])
  return made
}
export function useOwnLooks() {
  const mats = useMemo(ownLooks, [])
  useEffect(() => () => { for (const m of Object.values(mats)) m.dispose() }, [mats])
  return mats
}
