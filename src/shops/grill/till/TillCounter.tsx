import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { inkModel } from '@/scene/render/inkHull'
import { lampLit } from '@/shops/grill/decor/lampShades'

/**
 * The till counter, from blender/tillcounter.py, in the till's own frame (built for a top at TILL_TOP; another height stretches the body to
 * it): the dark wooden body with loose green bamboo up the customers' face (a warm light behind it showing through) and a round window lit
 * from within like a paper lantern, a polished white marble top, and the walnut partition of fine slats (on round end posts) along the customers' side and down the end.
 */
const URL = import.meta.env.BASE_URL + 'models/tillcounter.glb'
export const TILL_TOP = 0.86
const UNINKED = /^(TillWindowPaper|TillWindowSleeve|TillBambooGlow|TillLattice|TillRope|TillSlat|TillBack|TillShoe)|Node\d/

/** the bamboo's shades, culm to culm: a fresh green, a yellower one, a deeper one… (laid over the one skin) */
const BAMBOO_SHADES = ['#ffffff', '#f2f5c8', '#d6e6b4', '#fff2bf', '#c4d6a8']

/** the window's paper with no light behind it: plain washi, grey-white, a few long fibres in it */
function plainPaper() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  g.fillStyle = '#f2f1ee'
  g.fillRect(0, 0, 128, 128)
  for (let k = 0; k < 70; k++) {
    const x = (k * 53) % 128, y = (k * 97) % 128, a = (k * 2.39) % Math.PI
    g.strokeStyle = k % 3 ? 'rgba(255,255,255,0.5)' : 'rgba(150,150,146,0.25)'
    g.lineWidth = 0.8
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x + Math.cos(a) * 14, y + Math.sin(a) * 14)
    g.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** the culms' one material (item 901): their skin's picture with its waxy sheen, each culm's shade on its points (BAMBOO_SHADES), so all the
 * culms are drawn as one (five materials of one picture before, a draw each) */
let bambooMat: THREE.MeshPhysicalMaterial | null = null
function finishOf(src: THREE.MeshStandardMaterial): THREE.Material {
  if (/^TillBamboo\d$/.test(src.name)) return (bambooMat ??= new THREE.MeshPhysicalMaterial({ map: src.map, vertexColors: true, roughness: 0.35, clearcoat: 0.4, clearcoatRoughness: 0.3 }))
  switch (src.name) {
    case 'TillMarble':
      // (polished marble: the lamps glint in it)
      return new THREE.MeshPhysicalMaterial({ map: src.map, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 0.9 })
    case 'TillBamboo':
      // (green bamboo's waxy skin: a soft sheen)
      return new THREE.MeshPhysicalMaterial({ map: src.map, roughness: 0.35, clearcoat: 0.4, clearcoatRoughness: 0.3 })
    case 'TillWindowPaper':
      // (the window's paper, lit from within like a lantern: brightest where the lamp is, its fibres showing; with the room's lights off,
      // plain grey-white paper)
      return lampLit(new THREE.MeshBasicMaterial({ map: src.map, color: new THREE.Color(1.25, 1.15, 1.05), toneMapped: false }), { offMap: plainPaper() })
    case 'TillBambooGlow':
      // (the warm light behind the bamboo, showing between the culms; off with the room's lights, the wall behind them dark)
      return lampLit(new THREE.MeshBasicMaterial({ map: src.map, color: new THREE.Color(1.1, 1.05, 1), toneMapped: false }), { dim: 0.14 })
    case 'TillShieldWalnut':
      // (oiled walnut: a soft sheen)
      return new THREE.MeshPhysicalMaterial({ map: src.map, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.35 })
    case 'TillShieldSlats':
      // (the partition's lattice, painted: walnut slats over pale hinoki, the normal map standing the slats off the board)
      return new THREE.MeshPhysicalMaterial({ map: src.map, normalMap: src.normalMap, roughness: 0.45, clearcoat: 0.25, clearcoatRoughness: 0.4, side: THREE.DoubleSide })
    case 'TillShieldShoe':
      return new THREE.MeshPhysicalMaterial({ color: src.color.clone(), metalness: 0.7, roughness: 0.35 })
    default:
      return new THREE.MeshToonMaterial({ color: src.color.clone(), map: src.map })
  }
}

let model: THREE.Group | null = null
export function TillCounter({ top }: { top: number }) {
  const gltf = useGLTF(URL) as unknown as { scene: THREE.Group }
  const root = useMemo(() => {
    if (model) return model
    const r = gltf.scene.clone(true)
    const mats = new Map<THREE.Material, THREE.Material>()
    r.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const src = m.material as THREE.MeshStandardMaterial
      let t = mats.get(src)
      if (!t) { t = finishOf(src); mats.set(src, t) }
      // (a culm's shade on its own points (its geometry its own copy, the model's left as loaded))
      const shade = /^TillBamboo(\d)$/.exec(src.name)
      if (shade) {
        const c = new THREE.Color(BAMBOO_SHADES[+shade[1]]), g = m.geometry.clone(), n = g.attributes.position.count
        g.setAttribute('color', new THREE.Float32BufferAttribute(Array.from({ length: n * 3 }, (_, i) => (i % 3 === 0 ? c.r : i % 3 === 1 ? c.g : c.b)), 3))
        m.geometry = g
      }
      m.material = t
      m.castShadow = !UNINKED.test(m.name)
      m.receiveShadow = true
      if (src.name === 'TillWindowPaper' || src.name === 'TillBambooGlow') { m.castShadow = false; m.receiveShadow = false }
    })
    inkModel(r, (m) => UNINKED.test(m.name), { width: 0.003, weld: true })
    model = r
    return r
  }, [gltf])
  // (another height: the body stretched to it, the top and the partition set on it)
  const k = top / TILL_TOP
  return <group scale={[1, k, 1]}><primitive object={root} /></group>
}
useGLTF.preload(URL)
