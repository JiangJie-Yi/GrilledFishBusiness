import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { plainColours, mergeByMaterial } from '@/scene/StaticBatch'
import { inkModel } from '@/scene/inkHull'
import { useGLTF } from '@react-three/drei'
import { SIGN_FONT } from '@/scene/signFont'
import { askPantry, SUPPLIES, tipOver } from '@/shops/grill/bar'
import { getEdit } from '@/shops/grill/edit'
import { canvasTex } from './base'

/**
 * The sacks of white rice by the sake (blender/ricesacks.py; the owner's: the room-temperature stock wants rice, its sacks piled by the sake,
 * for the rice balls, grilled with soy sauce): three unopened burlap sacks, two lying and one stood against them, each printed by the game:
 * 白米 big in black over its weave, 新米 in red above, its weight under, a red seal. Pointed at, they say how much rice there is; clicked, the
 * stock opens on its room-temperature tab, at the rice
 */
const RICE_URL = import.meta.env.BASE_URL + 'models/ricesacks.glb'
useGLTF.preload(RICE_URL)
const riceSackPrint = (weave: CanvasImageSource | null) => canvasTex(512, 512, (g) => {
  g.save()
  if (weave) g.drawImage(weave, 0, 0, 512, 512)
  else { g.fillStyle = '#c9b48c'; g.fillRect(0, 0, 512, 512) }
  // (printed onto the weave: multiplied, so the threads show through the ink)
  g.globalCompositeOperation = 'multiply'
  g.globalAlpha = 0.9
  g.strokeStyle = '#b3261e'; g.lineWidth = 7
  g.strokeRect(92, 112, 328, 288)
  g.lineWidth = 2.5
  g.strokeRect(104, 124, 304, 264)
  g.textAlign = 'center'; g.textBaseline = 'middle'
  g.fillStyle = '#b3261e'
  g.font = `900 46px ${SIGN_FONT}`
  g.fillText('新米', 256, 162)
  g.fillStyle = '#1a1612'
  g.font = `900 150px ${SIGN_FONT}`
  g.fillText('白米', 256, 262)
  g.font = '700 30px "Noto Sans JP", "Yu Gothic", sans-serif'
  g.fillText('精白米 30kg', 256, 356)
  // (the seal, a red ring with 米 in it, at the box's corner)
  g.strokeStyle = '#b3261e'; g.lineWidth = 6
  g.beginPath(); g.arc(404, 392, 34, 0, Math.PI * 2); g.stroke()
  g.fillStyle = '#b3261e'
  g.font = `900 38px ${SIGN_FONT}`
  g.fillText('米', 404, 394)
  g.restore()
})
export function RiceSacks() {
  const gltf = useGLTF(RICE_URL) as unknown as { scene: THREE.Group }
  const obj = useMemo(() => {
    const r = gltf.scene.getObjectByName('RiceSacks')!.clone(true)
    r.position.set(0, 0, 0)
    // (the sacks' printed cloth one material; the open sack's inside, its rice and the wooden measure in it their own)
    const made = new Map<string, THREE.Material>()
    r.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const src = m.material as THREE.MeshStandardMaterial
      let mat = made.get(src.name)
      if (!mat) {
        // (the print's top toward the sack's far side, reading along its length from the room (flipped as a canvas is, unlike a glTF's own
        // pictures: kept glTF's way it came out mirrored))
        mat = src.name === 'RiceSack'
          ? new THREE.MeshToonMaterial({ color: '#ffffff', map: riceSackPrint((src.map?.image as CanvasImageSource | undefined) ?? null) })
          : new THREE.MeshToonMaterial({ color: '#ffffff', map: src.map ?? null, side: src.name === 'RiceSackInside' || src.name === 'RiceMasu' ? THREE.DoubleSide : THREE.FrontSide })
        made.set(src.name, mat)
      }
      m.material = mat
      m.castShadow = true
      m.receiveShadow = true
    })
    // (the rice and the cloth's inside aren't outlined: the rice is seen down into the sack, its rim tucked under the cuff)
    inkModel(r, (m) => /RiceSackRice|RiceSackIn$|RiceMasuRice/.test(m.name), { width: 0.004, weld: true })
    plainColours(r)
    // (each sack drawn apart, to be put away as the rice runs down (item 182))
    return mergeByMaterial(r, (o) => /^RiceSack[01]$|^RiceSackOpenSet$/.test(o.name))
  }, [gltf])
  // (as many sacks as the rice in stock makes: the open one while there's any, the next at over a third of the most kept (STOCK_CAP, 100),
  // the last at over two thirds (item 182, the owner's: "the things themselves don't match the interface": three full sacks over "used up")
  const sacks = useMemo(() => ['RiceSackOpenSet', 'RiceSack1', 'RiceSack0'].map((n) => obj.getObjectByName(n) ?? null), [obj])
  useFrame(() => {
    const n = SUPPLIES.has('Onigiri')
    sacks.forEach((o, k) => { const v = n < 0 || n > (k * 100) / 3; if (o && o.visible !== v) o.visible = v })
  })
  const says = () => {
    // (the owner's: its stock, and a word when it's run out; clicked, the stock's room-temperature tab, where it's ordered)
    const n = SUPPLIES.has('Onigiri')
    return n < 0 ? '做飯糰的主食・點一下開常溫區補貨' : n === 0 ? '白米已耗盡・點一下開常溫區進貨' : `剩 ${n} 份・做飯糰的主食・點一下開常溫區補貨`
  }
  return (
    // (handlers on a group round it: a primitive's own aren't attached)
    <group onPointerOver={(e) => { if (getEdit().on) return; tipOver('【常溫食材】白米存量', says()).onPointerOver(e) }}
      onPointerOut={(e) => { if (getEdit().on) return; tipOver('【常溫食材】白米存量', '').onPointerOut(e) }}
      onClick={(e) => { e.stopPropagation(); if (getEdit().on) return; askPantry('ambient', 'sack', undefined, 'Onigiri') }}>
      <primitive object={obj} />
    </group>
  )
}
