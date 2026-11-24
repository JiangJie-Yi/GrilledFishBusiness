import { memo, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { brushText, signTexture } from '@/scene/props/signFont'
import { forPhone } from '@/shops/grill/kitchen/ware'
import { LAY_DIR, TRASH_R, TRASH_H } from './tuning'

/** split bamboo in a 2-over-2 twill (網代編み), honey-coloured and a little smoked, wrapped round the basket */
const TRASH_WEAVE = (() => {
  if (typeof document === 'undefined') return null
  const W = 512
  const H = 256
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  let seed = 8
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  g.fillStyle = '#4a3420'
  g.fillRect(0, 0, W, H)
  const cell = 16
  for (let i = 0; i < W / cell; i++) {
    for (let j = 0; j < H / cell; j++) {
      const over = (i + j) % 4 < 2
      const tone = 0.85 + rnd() * 0.2
      const r = Math.round((over ? 214 : 186) * tone)
      const gg = Math.round((over ? 172 : 140) * tone)
      const b = Math.round((over ? 104 : 80) * tone)
      g.fillStyle = `rgb(${r}, ${gg}, ${b})`
      if (over) g.fillRect(i * cell, j * cell + 1.5, cell, cell - 3)
      else g.fillRect(i * cell + 1.5, j * cell, cell - 3, cell)
      // the bamboo's sheen and its fibres
      g.fillStyle = 'rgba(255, 240, 200, 0.25)'
      if (over) g.fillRect(i * cell, j * cell + 4, cell, 1.5)
      else g.fillRect(i * cell + 4, j * cell, 1.5, cell)
      g.fillStyle = 'rgba(80, 50, 20, 0.3)'
      if (over) g.fillRect(i * cell, j * cell + 10, cell, 1)
      else g.fillRect(i * cell + 10, j * cell, 1, cell)
    }
  }
  // smoked darker toward the foot
  const grad = g.createLinearGradient(0, H, 0, 0)
  grad.addColorStop(0, 'rgba(60, 35, 15, 0.35)')
  grad.addColorStop(1, 'rgba(60, 35, 15, 0)')
  g.fillStyle = grad
  g.fillRect(0, 0, W, H)
  const t = new THREE.CanvasTexture(forPhone(c))
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(2, 1.4)
  return t
})()
/** rattan wound round and round: diagonal dark-and-light bands */
const RATTAN = (() => {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 16
  const g = c.getContext('2d')!
  for (let x = -16; x < 128; x += 6) {
    g.fillStyle = (x / 6) % 2 ? '#7a4e2a' : '#3e2412'
    g.beginPath()
    g.moveTo(x, 16)
    g.lineTo(x + 6, 16)
    g.lineTo(x + 12, 0)
    g.lineTo(x + 6, 0)
    g.fill()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = THREE.RepeatWrapping
  t.repeat.set(8, 1)
  return t
})()
const TRASH_LABEL = signTexture(96, 180, (g) => {
  // washi: off-white with fibres
  g.fillStyle = '#f3ecd9'
  g.fillRect(0, 0, 96, 180)
  g.strokeStyle = 'rgba(150, 130, 100, 0.25)'
  for (let i = 0; i < 40; i++) {
    g.beginPath()
    g.moveTo(Math.random() * 96, Math.random() * 180)
    g.lineTo(Math.random() * 96, Math.random() * 180)
    g.stroke()
  }
  brushText(g, 'ご', 48, 52, 52, { fill: '#1e1a16', shadow: 'rgba(120,90,50,0.25)' })
  brushText(g, 'み', 48, 112, 52, { fill: '#1e1a16', shadow: 'rgba(120,90,50,0.25)' })
  g.fillStyle = '#b4302a'
  g.fillRect(34, 148, 28, 22)
  brushText(g, '屑', 48, 160, 18, { fill: '#f3ecd9' })
})

/**
 * The little waste basket on the bar (the owner's, 2026-11-10: the woven basket that stood on the floor by the cook, put out for the customers,
 * one between each two places, in front of their soy and wasabi): the same twill-woven bamboo and rattan rims and its strip of washi with
 * ごみ, a third the size, a crumpled napkin or two in it; its shapes and looks shared by them all (the bar's batch draws them all at once)
 */
const BASKET_K = 0.34
/** how much of its height it keeps (item 283, the owner's, 2026-11-17: 「稍微短一節」): a band of its weave lower, its weave cut short with it
 * (the same cells, not squashed) */
const BASKET_SHORT = 0.78
const BASKET_GEO = (() => {
  const R = TRASH_R * BASKET_K, H = TRASH_H * BASKET_K * BASKET_SHORT
  const cut = (g: THREE.BufferGeometry) => { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * BASKET_SHORT); return g }
  const body = cut(new THREE.CylinderGeometry(R * 1.04, R * 0.86, H, 16, 1, true).translate(0, H / 2, 0))
  const inner = cut(new THREE.CylinderGeometry(R * 0.99, R * 0.82, H - 0.006, 16, 1, true).translate(0, H / 2 + 0.003, 0))
  const floor = new THREE.CircleGeometry(R * 0.84, 16).rotateX(-Math.PI / 2).translate(0, 0.006, 0)
  const rim = new THREE.TorusGeometry(R * 1.04, 0.006, 5, 16).rotateX(Math.PI / 2).translate(0, H, 0)
  const foot = new THREE.TorusGeometry(R * 0.87, 0.005, 5, 16).rotateX(Math.PI / 2).translate(0, 0.005, 0)
  // (its strip of washi on the front, toward the customers (-z))
  const label = new THREE.PlaneGeometry(0.03 * BASKET_SHORT, 0.057 * BASKET_SHORT).rotateY(Math.PI).translate(0, H * 0.48, -(R * 1.04 * 0.95 + 0.002))
  const paper = new THREE.IcosahedronGeometry(0.016, 0).translate(0.006, H * 0.62, 0.004)
  return { body, inner, floor, rim, foot, label, paper, ink: body }
})()
const BASKET_MAT = {
  body: new THREE.MeshToonMaterial({ color: '#ffffff', map: TRASH_WEAVE }),
  inner: new THREE.MeshToonMaterial({ color: '#9a8058', map: TRASH_WEAVE, side: THREE.BackSide }),
  floor: new THREE.MeshToonMaterial({ color: '#6e5634' }),
  rim: new THREE.MeshToonMaterial({ color: '#4a2e18', map: RATTAN }),
  label: new THREE.MeshToonMaterial({ map: TRASH_LABEL }),
  paper: new THREE.MeshToonMaterial({ color: '#f1ece0' }),
  ink: new THREE.MeshBasicMaterial({ color: '#3b2a20', side: THREE.BackSide }),
}
export function TableBasket() {
  const G = BASKET_GEO, M = BASKET_MAT
  return (
    <group>
      <mesh geometry={G.body} material={M.body} />
      <mesh geometry={G.inner} material={M.inner} />
      <mesh geometry={G.ink} material={M.ink} scale={[1.04, 1.01, 1.04]} />
      <mesh geometry={G.floor} material={M.floor} />
      <mesh geometry={G.rim} material={M.rim} />
      <mesh geometry={G.foot} material={M.rim} />
      <mesh geometry={G.label} material={M.label} />
      <mesh geometry={G.paper} material={M.paper} />
    </group>
  )
}

/**
 * The food-waste bin on the floor by the cook (blender/foodwaste.py; the owner's, 2026-11-10: it was the woven waste basket, which went out on the
 * bar for the customers): olive-green plastic, its lid sat on a little askew; its label written here (生ごみ, and 廚餘 under it). Burnt scraps
 * and the like go in it as they did the basket (its `container`, 'trash')
 */
const FOOD_WASTE_URL = import.meta.env.BASE_URL + 'models/foodwaste.glb'
const FOOD_WASTE_LABEL = signTexture(256, 160, (g) => {
  g.fillStyle = '#f7f6f0'; g.fillRect(0, 0, 256, 160)
  g.strokeStyle = '#3f6a2a'; g.lineWidth = 6; g.strokeRect(8, 8, 240, 144)
  brushText(g, '生ごみ', 128, 66, 58, { fill: '#2f4a1f', shadow: 'rgba(60,80,40,0.25)' })
  g.fillStyle = '#3f6a2a'; g.font = '700 30px "Noto Sans TC", "Microsoft JhengHei", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.fillText('廚餘', 128, 122)
})
export const FoodWasteBin = memo(function FoodWasteBin({ position, container }: { position: [number, number, number]; container: string }) {
  const gltf = useGLTF(FOOD_WASTE_URL) as unknown as { scene: THREE.Group }
  const root = useMemo(() => {
    const r = (gltf.scene.getObjectByName('FoodWaste') ?? gltf.scene).clone(true)
    r.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const src = m.material as THREE.MeshStandardMaterial
      m.material = new THREE.MeshToonMaterial({ color: src.color, map: src.name === 'WasteLabel' ? FOOD_WASTE_LABEL : src.map })
      if (src.name === 'WasteLabel' && FOOD_WASTE_LABEL) { FOOD_WASTE_LABEL.flipY = false; (m.material as THREE.MeshToonMaterial).color.set('#ffffff') }
      m.castShadow = src.name !== 'WasteLabel'
      m.receiveShadow = true
    })
    return r
  }, [gltf])
  // (it stands with its label to the cook's way out, as the basket's strip faced)
  return <group position={position} rotation-y={Math.atan2(LAY_DIR.x, LAY_DIR.z)} userData={{ container }}><primitive object={root} /></group>
})
useGLTF.preload(FOOD_WASTE_URL)
