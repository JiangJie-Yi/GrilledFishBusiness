import { memo, useEffect, useLayoutEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { warmLater } from '@/scene/render/Prewarm'

/** a soft round shadow, black in the middle and fading out: one texture for all */
const BLOB = (() => {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, 'rgba(0,0,0,0.5)')
  grad.addColorStop(0.6, 'rgba(0,0,0,0.3)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
})()
const GEO = new THREE.PlaneGeometry(1, 1)
const MAT = new THREE.MeshBasicMaterial({ map: BLOB, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })
/** how many can be drawn at once in each set of layers (the shop's people, the umbrella stand and the serving counter come to twenty-odd) */
const CAP = 64
/** where each shadow is: an unseen group in its place, as its quad was (its own frame: lying flat, just off the floor, its size) */
const ANCHORS = new Set<THREE.Object3D>()
// (their program made with the page's, not as the first is drawn: one drawn as instances is a program of its own)
if (typeof document !== 'undefined') warmLater(new THREE.InstancedMesh(GEO, MAT, 1))

/**
 * A cheap round shadow on the floor under someone (their feet at the origin), no shadow map; `r` is its radius; black but see-through, so
 * the feet read as standing on the floor. (item 804) Not a quad of its own any more: an unseen group where the quad was, and every shadow
 * drawn in one draw for each set of layers they're on (BlobShadows), placed from these as each frame's drawn: some twenty draws a busy
 * frame, the shop's people's and the stand's, were one each.
 */
// (drawn again only if its size changes: it stands under everyone, whose parents redraw often)
export const BlobShadow = memo(function BlobShadow({ r = 0.2 }: { r?: number }) {
  const ref = useRef<THREE.Group>(null)
  useLayoutEffect(() => {
    const g = ref.current
    if (!g) return
    ANCHORS.add(g)
    return () => { ANCHORS.delete(g) }
  }, [])
  return <group ref={ref} rotation-x={-Math.PI / 2} position-y={0.008} scale={[r * 2, r * 2, 1]} />
})

/** shown: it and everything it's under, to the scene */
function shownIn(o: THREE.Object3D, scene: THREE.Object3D) {
  for (let q: THREE.Object3D | null = o; q; q = q.parent) {
    if (q === scene) return true
    if (!q.visible) return false
  }
  return false
}

/**
 * Every blob shadow drawn: an instanced quad for each set of layers they're on (the shop's, the room upstairs'), filled from their places
 * the moment before the scene's drawn (its matrices all worked out by then, and after the hearth's guard has put anyone out of the table),
 * so each is under its figure this very frame. Mounted once in the scene.
 */
export const BlobShadows = memo(function BlobShadows() {
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    const meshes = new Map<number, THREE.InstancedMesh>()
    const meshFor = (mask: number) => {
      let m = meshes.get(mask)
      if (!m) {
        m = new THREE.InstancedMesh(GEO, MAT, CAP)
        m.name = 'blob-shadows'
        m.frustumCulled = false
        m.renderOrder = -1
        m.layers.mask = mask
        m.raycast = () => {}
        m.matrixAutoUpdate = false
        m.count = 0
        scene.add(m)
        meshes.set(mask, m)
      }
      return m
    }
    meshFor(1)
    // (in development: the places and the drawn quads, for the probes to set against each other)
    if (import.meta.env.DEV) Object.assign(window, { __blob: { anchors: ANCHORS, meshes } })
    const was = scene.onBeforeRender
    scene.onBeforeRender = function (...args) {
      was.apply(this, args)
      for (const m of meshes.values()) m.count = 0
      for (const g of ANCHORS) {
        if (!shownIn(g, scene)) continue
        const m = meshFor(g.layers.mask)
        if (m.count >= CAP) continue
        m.setMatrixAt(m.count++, g.matrixWorld)
      }
      for (const m of meshes.values()) m.instanceMatrix.needsUpdate = true
    }
    return () => {
      scene.onBeforeRender = was
      for (const m of meshes.values()) { m.removeFromParent(); m.dispose() }
    }
  }, [scene])
  return null
})
