import { shrineDoor } from '@/shops/grill/shrineSound'
import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { NO_RAY } from '@/scene/pickable'
import { homeCopy, plainColours, mergeByMaterial } from '@/scene/StaticBatch'
import { inkModel } from '@/scene/inkHull'
import { reflectStudio, useStudio } from '@/scene/studio'
import { useGLTF } from '@react-three/drei'
import { tipOver, setShrineFlower, SHRINE_FLOWERS } from '@/shops/grill/bar'
import { getEdit } from '@/shops/grill/edit'
import { FLOWERS, nextFlower, type Flower } from '@/game/world/shrineFlowers'
import { setTip } from '@/scene/hoverTip'
import { canvasTex } from './base'

/** the two vases' arrangements (blender/shrinevase.py): 0 white and gold chrysanthemums, 1 pink, crimson and violet blooms */
const VASE_URLS = ['shrinevase', 'shrinevase0', 'shrinevase1'].map((v) => import.meta.env.BASE_URL + `models/${v}.glb`)
/** a shrine vase (榊立て, blender/shrinevase.py): white porcelain with a cobalt band of waves, a spray of glossy sakaki and small chrysanthemums */
function Bouquet({ variant = 0, spray = [1, 1, 1] }: { variant?: number; spray?: [number, number, number] }) {
  const gltf = useGLTF(VASE_URLS[variant]) as unknown as { scene: THREE.Group }
  const root = useMemo(() => {
    const r = gltf.scene.clone(true)
    // (the arrangement's own size (VASE_POSE) on the flowers alone, about the vase's mouth, their stems kept in it: the vase the same one
    // whichever flowers are in it (the owner's, 2026-11-11: it was sized with them, wider or slimmer for each))
    const body = r.getObjectByName('VaseBody')
    if (body && spray.some((k) => k !== 1)) {
      r.updateWorldMatrix(true, true)
      const inv = r.matrixWorld.clone().invert(), vb = new THREE.Box3()
      const pos = (body as THREE.Mesh).geometry.attributes.position, v = new THREE.Vector3()
      for (let i = 0; i < pos.count; i++) vb.expandByPoint(v.fromBufferAttribute(pos, i).applyMatrix4(body.matrixWorld).applyMatrix4(inv))
      const pivot = new THREE.Group()
      pivot.position.set((vb.min.x + vb.max.x) / 2, vb.max.y, (vb.min.z + vb.max.z) / 2)
      r.add(pivot)
      pivot.updateWorldMatrix(true, false)
      const sprays: THREE.Object3D[] = []
      r.traverse((o) => { if ((o as THREE.Mesh).isMesh && o !== body) sprays.push(o) })
      for (const o of sprays) pivot.attach(o)
      pivot.scale.set(...spray)
    }
    // (one material for each of the model's: the petals sharing theirs, the bouquet folds into a few draws below)
    const mats = new Map<THREE.Material, THREE.Material>()
    r.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const src = m.material as THREE.MeshStandardMaterial
      let t = mats.get(src)
      if (!t) {
        // (the flowers and leaves: pictures on crossed cards, as the willow's (item 57): double-sided, cut out by their alpha, the picture
        // not made smaller for the distance (averaged into the gaps round them, the leaves fell under the cut-off and the vase stood bare))
        if (src.name === 'VaseCards' && src.map) { src.map.minFilter = THREE.LinearFilter; src.map.generateMipmaps = false; src.map.needsUpdate = true }
        t = src.name === 'VaseCards'
          ? new THREE.MeshToonMaterial({ color: src.color.clone(), map: src.map ?? null, side: THREE.DoubleSide, alphaTest: 0.5 })
          : src.name === 'VasePorcelain'
          ? new THREE.MeshPhysicalMaterial({ map: src.map, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.08 })
          : src.name === 'VaseLeaf'
            ? new THREE.MeshPhysicalMaterial({ color: src.color.clone(), roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.2, side: THREE.DoubleSide })
            : new THREE.MeshToonMaterial({ color: src.color.clone(), map: src.map, side: THREE.DoubleSide })
        t.name = src.name
        mats.set(src, t)
      }
      m.material = t
      m.castShadow = true
    })
    // (the porcelain alone inked: the flowers' cards are cut out by their picture, a hull round each card drew a black square (item 57))
    inkModel(r, (m) => /Cards|Leaves|Mum|Stems|Stalk|Bud|Breath|Flower/.test(m.name), { width: 0.0008, weld: true })
    plainColours(r)
    mergeByMaterial(r)
    // (its foot measured, the vase stood on it: at 0 here is the table's top (the owner's: the vases sat 3 mm up, and leaning, one side of
    // the foot more); the porcelain alone, not the flowers' ink)
    let foot = Infinity
    r.updateWorldMatrix(true, true)
    r.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh || (m.material as THREE.Material).name !== 'VasePorcelain') return
      const pos = m.geometry.attributes.position, v = new THREE.Vector3()
      for (let i = 0; i < pos.count; i++) foot = Math.min(foot, v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld).y)
    })
    return { r, foot: Number.isFinite(foot) ? foot : 0 }
  }, [gltf, spray])
  return <group position-y={-root.foot}><primitive object={root.r} /></group>
}
VASE_URLS.forEach((u) => useGLTF.preload(u))
/**
 * each arrangement's own turn and size (the owner's, 2026-11-10): the sakaki as it was made; the white and gold turned a little under half
 * round, a touch slimmer and taller; the pink and crimson turned the other way past half round (its blooms to the right and back), a touch
 * wider and lower. Upright, all of them: no lean, so the whole foot is down on the table. The size the flowers' only, and the vase where it
 * stands whichever's in it (the owner's, 2026-11-11: three different vases, and moved about: the white and gold's was 2 cm along)
 */
const VASE_POSE: { turn: number; spray: [number, number, number] }[] = [
  { turn: 0, spray: [1, 1, 1] },
  { turn: Math.PI * 0.45, spray: [0.95, 1.05, 0.95] },
  { turn: -Math.PI * 0.65, spray: [1.05, 0.92, 1.05] },
]
/** a vase whose flowers change at a click: the sakaki with small chrysanthemums, the white and gold, the pink and crimson, each bringing its
 * own blessing while it stands there (game/shrineFlowers), each set at its own turn and size (VASE_POSE). `slot`: 0 the left vase, 1 the right */
function BouquetPick({ slot }: { slot: number }) {
  const [v, setV] = useState<Flower>(SHRINE_FLOWERS[slot] ?? 0)
  const pose = VASE_POSE[v] ?? VASE_POSE[0]
  return (
    // (smaller than they were: the vases stood nearly as tall as the shrine; a sakaki vase comes to about two thirds of it)
    <group rotation-y={pose.turn} scale={0.78}
      onClick={(e) => {
        e.stopPropagation(); if (getEdit().on) return; const n = nextFlower(v); setShrineFlower(slot, n); setV(n)
        // (its tag says the flowers now there: it was still naming the ones just taken out, till the pointer moved off and back)
        setTip({ title: `供花・${FLOWERS[n].name}`, hint: `${FLOWERS[n].buff}｜點一下換一組花` })
      }}
      {...tipOver(`供花・${FLOWERS[v].name}`, `${FLOWERS[v].buff}｜點一下換一組花`)}>
      <Bouquet variant={v} spray={pose.spray} />
    </group>
  )
}


/**
 * The household shrine (神棚) up on the wall: a shelf on two brackets, a little shrine of pale hinoki on a stepped base
 * with a railing, its two doors and a roof with the crossed finials (千木) and the short logs (鰹木) along its ridge,
 * a bouquet in a vase either side, the cups of rice, salt and water before it, and the sacred rope (注連縄) with its
 * paper streamers hung across the front.
 */
/** `part`: the shrine itself, the things set about it (vases, cups), or all of it (on the wall) */
export const KAMIDANA_URL = import.meta.env.BASE_URL + 'models/kamidana.glb'
/** the shrine's model (and the oranges and the sutra, nodes of their own in it): its wood toon like the room, its gold real metal reflecting the
 * studio, an ink line round the bigger parts; made once, each piece taken out of it to be shown where it stands */
type KamiPart = 'shrine' | 'oranges' | 'sutra' | 'table' | 'flask' | 'cupstand' | 'doors' | 'ebisu' | 'bracket' | 'lantern'
let kamidanaParts: Record<KamiPart, THREE.Object3D> | null = null
export function kamidanaOf(scene: THREE.Group) {
  if (kamidanaParts) return kamidanaParts
  const r = scene.clone(true)
  const mats = new Map<THREE.Material, THREE.Material>()
  const lineMats = new Map<THREE.Material, THREE.Material>()
  r.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    const src = m.material as THREE.MeshStandardMaterial
    // (what it was made of, kept: the export renames the meshes (KamiJ32Part...), so a part's known by its material (item 644))
    m.userData.mat = src.name
    let t = mats.get(src)
    if (!t) {
      if (src.name === 'KamiGold') {
        // (the shrine's fittings: gilt, a paler, softer gold than the ingot's polished casting, its gleam spread wide)
        const g = new THREE.MeshPhysicalMaterial({ color: '#dcb25a', metalness: 1, roughness: 0.34, envMapIntensity: 0.9 })
        reflectStudio(g)
        t = g
      } else if (src.name === 'KamiRuri') {
        // (the cups' stand: porcelain under a deep cobalt glaze run through with emerald and turquoise, glossy, the studio's light sliding over it)
        const g = new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: src.map, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.04, specularIntensity: 0.9 })
        reflectStudio(g)
        g.envMapIntensity = 0.7
        t = g
      } else if (src.name === 'KamiEbisuStone') {
        // (the Ebisu: a light carving wearing the fine one's relief (a normal map baked from it) and its hollows' shadow in the colour; lit, not
        // toon-flat, so the carving shows)
        t = new THREE.MeshStandardMaterial({ map: src.map, normalMap: src.normalMap, roughness: 0.85 })
      } else if (src.name === 'KamiLanternPaper') {
        // (the little lanterns' paper, lit from inside: drawn as it glows, its lattice dark across it, by day and by night)
        t = new THREE.MeshBasicMaterial({ color: '#ffe3b8', map: src.map })
      } else if (src.name === 'KamiPeel') {
        // (the ponkan's peel: a little gloss on its oily skin, not a polish; its pebbles and the calyx's sepals baked in relief (item 574))
        t = new THREE.MeshPhysicalMaterial({ color: src.color.clone(), map: src.map, normalMap: src.normalMap, roughness: 0.48, clearcoat: 0.22, clearcoatRoughness: 0.35, specularIntensity: 0.55 })
      } else if (src.name === 'KamiLeaf' || src.name === 'KamiDish' || src.name === 'KamiCobalt' || src.name === 'KamiFlaskGlaze') {
        // (the leaves' gloss, the porcelain's glaze: a soft sheen)
        t = new THREE.MeshPhysicalMaterial({ color: src.color.clone(), map: src.map, roughness: 0.35, clearcoat: 0.4, clearcoatRoughness: 0.25 })
      } else if (/Cutout/.test(src.name)) {
        // (the rope's tassels and paper streamers (item 551): cards, their shapes cut out of their pictures, seen from either side)
        t = new THREE.MeshToonMaterial({ color: src.color.clone(), map: src.map, alphaTest: 0.5, side: THREE.DoubleSide })
      } else if (/^KamiRoof/.test(src.name) && src.normalMap) {
        // (the gables' logs (item 573): baked onto a flat panel each, their roundness in a normal map, kept in the toon light)
        t = new THREE.MeshToonMaterial({ color: src.color.clone(), map: src.map, normalMap: src.normalMap })
      } else {
        t = new THREE.MeshToonMaterial({ color: src.color.clone(), map: src.map })
        // (the flask's label (item 574): its name a picture now, seen at a slant round the belly: sharper so, not smeared across)
        if (src.name === 'KamiFlaskPaper' && src.map) src.map.anisotropy = 8
      }
      mats.set(src, t)
    }
    m.material = t
    // (the lines drawn on the shrine's parts (its KamiJ*Line meshes, lying on their faces): pulled a little toward the eye, so they stay over
    // the face they're on whichever is drawn first (item 374: they won a tie of depth by being drawn after it, and in the room's merge,
    // ?world=1, the order isn't kept); a copy of their material where it's the parts' own too)
    if (/^KamiJ\d+Line/.test(m.name)) {
      let l = lineMats.get(t)
      if (!l) {
        l = t.clone()
        l.polygonOffset = true
        l.polygonOffsetFactor = -1
        l.polygonOffsetUnits = -2
        lineMats.set(t, l)
      }
      m.material = l
    }
    m.castShadow = true
    m.receiveShadow = true
  })
  inkModel(r, (m) => /Gold|Cap|Plate|Crest|Seam|Bal|Katsuogi|Fold|Char|Slip|Calyx|Stem|Bow|Cord|Tail|Tassel|Fringe|Line|Inlay|Nail|Core|Pillar|Beam|Shide|Label|Knot|Edge|Jamb|Sill|Inside|Fuda|Eye|Smile|Ear|Cheek|Rod/.test(m.name) || /^KamiEbisu(Line|Stone)$/.test(m.userData.mat), { width: 0.0012, weld: true })
  // (the Ebisu's face's lines bare (his brows' mesh, exported as KamiJ32Part, wore the shrine's line, a band of black round them, heavy and
  // cross from across the room; his eyes' did not), and his own line finer (item 644, the Tester's: at the shrine's 0.0012 his nose was
  // ringed in black, and wider than the narrow cuts of his moustache and the corners of his smile it showed through them, black notches in
  // his face): narrower than the cuts, it keeps out of them)
  inkModel(r, (m) => m.userData.mat !== 'KamiEbisuStone', { width: 0.0005, weld: true })
  const take = (n: string) => { const o = r.getObjectByName(n)!; o.removeFromParent(); o.position.set(0, 0, 0); return o }
  // (the doors' leaves, each hung from its hinge, apart from the rest (they swing open); the Ebisu inside, a piece of its own)
  const doors = new THREE.Group()
  const shrineNode = r.getObjectByName('Kamidana') ?? r
  doors.position.copy(shrineNode.position); doors.quaternion.copy(shrineNode.quaternion); doors.scale.copy(shrineNode.scale)
  for (const leaf of [...shrineNode.children].filter((o) => /DoorLeaf/.test(o.name))) { leaf.removeFromParent(); doors.add(leaf) }
  kamidanaParts = { oranges: take('KamiOranges'), sutra: take('KamiSutra'), table: take('KamiTable'), flask: take('KamiFlask'), cupstand: take('KamiCupStand'),
    bracket: take('KamiBracket'), lantern: take('KamiLantern'),
    ebisu: (() => { const o = r.getObjectByName('KamiEbisu')!; o.removeFromParent(); return o })(), doors, shrine: r }
  // (what's left, the shrine itself, never moves: its hundred parts folded into a mesh per material)
  plainColours(r)
  mergeByMaterial(r)
  return kamidanaParts
}
/** another of one of the shrine model's pieces (the shelf's two brackets, the two lanterns): a copy sharing its shapes and materials */
export function KamiCopy({ part }: { part: KamiPart }) {
  const gltf = useGLTF(KAMIDANA_URL) as unknown as { scene: THREE.Group }
  useStudio()
  const obj = useMemo(() => kamidanaOf(gltf.scene)[part].clone(true), [gltf, part])
  return <primitive object={obj} />
}
/** a plate of oranges of its own (a copy: there are two), its plate drawn smaller and the oranges on it as they were (the owner's, 2026-11-11:
 * the plate smaller, not the oranges): the plate's meshes are the wide ones (the dish and its cobalt line, some 18 across; the oranges and
 * their leaf under 10) */
const DISH_K = 0.6
export function OrangePlate({ bare = false }: { bare?: boolean }) {
  const gltf = useGLTF(KAMIDANA_URL) as unknown as { scene: THREE.Group }
  useStudio()
  const obj = useMemo(() => {
    const o = kamidanaOf(gltf.scene).oranges.clone(true)
    o.updateWorldMatrix(true, true)
    for (const m of o.children) {
      const mesh = m as THREE.Mesh
      if (!mesh.isMesh) continue
      mesh.geometry.computeBoundingBox()
      const b = mesh.geometry.boundingBox!
      // (its ink, a child of it, goes with it)
      // (on a stand: no plate at all, not drawn (item 574: shrunk to nothing, the dish and its cobalt lines were still drawn every frame, two
      // draws and 1,364 triangles, their ink and their shadows besides))
      if (b.max.x - b.min.x > 0.15) {
        if (bare) mesh.visible = false
        else mesh.scale.multiply(new THREE.Vector3(DISH_K, 1, DISH_K))
      }
    }
    // (on a stand, the oranges let down onto its tray: they sat as high as the plate under them held them (the owner's, 2026-11-11: floating))
    if (bare) {
      o.updateMatrixWorld(true)
      let low = Infinity
      for (const m of o.children) {
        const mesh = m as THREE.Mesh
        if (!mesh.isMesh || mesh.geometry.boundingBox!.max.x - mesh.geometry.boundingBox!.min.x > 0.15) continue
        low = Math.min(low, new THREE.Box3().setFromObject(mesh).min.y)
      }
      if (isFinite(low)) o.position.y -= low
    }
    return o
  }, [gltf, bare])
  return <primitive object={obj} />
}
/** the offering stands (三方) and the rice dumplings (blender/sanbo.py), in the room's toon light, a copy each; the stand's tray floor's height */
const SANBO_URL = import.meta.env.BASE_URL + 'models/sanbo.glb'
useGLTF.preload(SANBO_URL)
export const SANBO_FLOOR = 0.054
export function SanboPart({ name }: { name: 'Sanbo' | 'Dango' }) {
  const gltf = useGLTF(SANBO_URL) as unknown as { scene: THREE.Group }
  const obj = useMemo(() => {
    const r = gltf.scene.getObjectByName(name)!.clone(true)
    r.position.set(0, 0, 0)
    const made = new Map<THREE.Material, THREE.Material>()
    r.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const src = m.material as THREE.MeshStandardMaterial
      let t = made.get(src)
      // (its normal map kept: the hinoki's grain and the openings' cut edges stand in the light (item 61))
      if (!t) { t = new THREE.MeshToonMaterial({ color: src.color.clone(), map: src.map ?? null, normalMap: src.normalMap ?? null }); t.name = src.name; made.set(src, t) }
      m.material = t
      m.castShadow = true
      m.receiveShadow = true
    })
    inkModel(r, () => false, { width: 0.0008, weld: true })
    // (its foot on the origin, whatever height it was made at: the dumplings sat 3 cm over the stand's tray (the owner's, 2026-11-11: floating))
    r.updateMatrixWorld(true)
    r.position.y -= new THREE.Box3().setFromObject(r).min.y
    return r
  }, [gltf, name])
  return <primitive object={obj} />
}
export const Sanbo = () => <SanboPart name="Sanbo" />
export function KamidanaModel({ part = 'shrine' }: { part?: KamiPart }) {
  const gltf = useGLTF(KAMIDANA_URL) as unknown as { scene: THREE.Group }
  useStudio()
  const obj = useMemo(() => kamidanaOf(gltf.scene)[part], [gltf, part])
  return <primitive object={obj} />
}
useGLTF.preload(KAMIDANA_URL)

/** a soft round shadow under something standing on the table (a contact shadow: dark in the middle, gone at the edge) */
const CONTACT = canvasTex(64, 64, (g) => {
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  gr.addColorStop(0, 'rgba(20,12,6,0.55)'); gr.addColorStop(0.55, 'rgba(20,12,6,0.28)'); gr.addColorStop(1, 'rgba(20,12,6,0)')
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64)
})
export function ContactShadow({ r, y = 0.0008 }: { r: number; y?: number }) {
  return (
    <mesh position-y={y} rotation-x={-Math.PI / 2} renderOrder={1}>
      <planeGeometry args={[r * 2, r * 2]} /><meshBasicMaterial map={CONTACT} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

/** whether an offering of sake stands just now (Altar sets it): the shrine's doors open of themselves, the Ebisu glows */
export const BLESSING = { on: false, k: 0 }
/** how far the shrine's doors stand open (ShrineDoors keeps it, 0 shut): the Ebisu behind them and his halo drawn only while they're open
 * (item 567) */
export const SHRINE_OPEN = { k: 0 }
/** a ring of light, feathered both sides, a little brighter and broken with sparkle along its band (the ripple when the sake's offered) */
export const RIPPLE = (() => {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  const img = g.createImageData(256, 256)
  let seed = 3
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const spark = Array.from({ length: 90 }, () => [rnd() * Math.PI * 2, 0.72 + rnd() * 0.14, 0.4 + rnd() * 0.6])
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const dx = (x - 127.5) / 128, dy = (y - 127.5) / 128, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx)
    let v = Math.exp(-(((r - 0.8) / 0.05) ** 2)) * 0.9 + Math.exp(-(((r - 0.8) / 0.16) ** 2)) * 0.35
    for (const [sa, sr, sb] of spark) {
      const da = Math.abs(((a - sa + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * r, dr = r - sr
      v += sb * Math.exp(-(da * da + dr * dr) / 0.0004)
    }
    const i = (y * 256 + x) * 4
    img.data[i] = 255; img.data[i + 1] = 226; img.data[i + 2] = 160; img.data[i + 3] = Math.min(255, v * 255) * (r < 1 ? 1 : 0)
  }
  g.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
})()
/** the burst of sparks at the moment it's poured, and the motes that rise round the shrine while it stands */
export const SPARKS = 36, MOTES = 60
/** points with a size and a transparency of their own each (the size and alpha attributes), so a mote can fade without going dark */
export const pointsEach = (sh: { vertexShader: string; fragmentShader: string }) => {
  sh.vertexShader = sh.vertexShader.replace('uniform float size;', 'attribute float size;\nattribute float alpha;\nvarying float vAlpha;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vAlpha = alpha;')
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vAlpha;')
    .replace('#include <premultiplied_alpha_fragment>', 'gl_FragColor.a *= vAlpha;\n#include <premultiplied_alpha_fragment>')
}
/** a glint: a white-hot core, a soft glow, and four thin rays (the motes and the sparks: a twinkle that reads on pale wood as on dark) */
export const STAR = (() => {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const img = g.createImageData(64, 64)
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const dx = (x - 31.5) / 32, dy = (y - 31.5) / 32, r = Math.hypot(dx, dy)
    const core = Math.exp(-((r / 0.09) ** 2)), glow = Math.exp(-((r / 0.35) ** 2)) * 0.55
    const rays = (Math.exp(-((dx / 0.035) ** 2)) + Math.exp(-((dy / 0.035) ** 2))) * Math.max(0, 1 - r) ** 2 * 0.8
    const v = Math.min(1, core + glow + rays)
    const i = (y * 64 + x) * 4
    img.data[i] = 255; img.data[i + 1] = 255; img.data[i + 2] = 255; img.data[i + 3] = v * 255
  }
  g.putImageData(img, 0, 0)
  return new THREE.CanvasTexture(c)
})()
/** a gentle ease out */
export const easeOut = (q: number) => 1 - (1 - q) ** 3
/** the shrine's doors: each pair swings open about its hinges when clicked, and shut again */
/** the shrine drawn wider than it was modelled, across its front (along z): the owner's 1.1 (it was 1.25, too wide for its height) */
export const SHRINE_WIDE = 1.1
/** and a little shallower front to back, its back still to the wall (the offerings' shelf in front of it as it was) */
// (0.72 now: shallower again (the owner's, 2026-11-11))
export const SHRINE_DEEP = 0.72
/** how far the doors swing open (radians): wide, square to the front and a little past (the owner's: the railing round the outside, nothing
 * across the front; it ran before the side bays' doors and beside the steps, and stopped them at 57° and 70°) */
const DOOR_SWING = { middle: 1.62, side: 1.7 }
/** the doors' leaves' stand-ins for the pointer (item 578): drawn as nothing (no draw), a ray still meets them */
const DOOR_HIT_MAT = new THREE.MeshBasicMaterial({ visible: false })
export function ShrineDoors() {
  const gltf = useGLTF(KAMIDANA_URL) as unknown as { scene: THREE.Group }
  const doors = useMemo(() => {
    const d = kamidanaOf(gltf.scene).doors
    // (widened with the shrine: each leaf's hinge moved out, the leaf itself widened in its own frame, so it still swings true when opened)
    if (!d.userData.wide) {
      d.updateMatrixWorld(true)
      for (const leaf of d.children) {
        // (but the crest and the gold plates on it kept their shape (a round crest, square plates): their meshes narrowed back by as much,
        // the crest about the line where the doors meet, the plates about their own middles)
        const toLeaf = new THREE.Matrix4(), back = new THREE.Matrix4(), box = new THREE.Box3()
        const meshes: THREE.Mesh[] = []
        leaf.traverse((o) => { if ((o as THREE.Mesh).isMesh && /Crest|DoorPlate/.test(o.name + (o.parent?.name ?? ''))) meshes.push(o as THREE.Mesh) })
        for (const m of meshes) {
          toLeaf.copy(leaf.matrixWorld).invert().multiply(m.matrixWorld)
          m.geometry = m.geometry.clone()
          m.geometry.applyMatrix4(toLeaf)
          box.setFromBufferAttribute(m.geometry.getAttribute('position') as THREE.BufferAttribute)
          const crest = /Crest/.test(m.name + (m.parent?.name ?? ''))
          const pivot = crest ? (Math.abs(box.max.z) > Math.abs(box.min.z) ? box.max.z : box.min.z) : (box.min.z + box.max.z) / 2
          m.geometry.applyMatrix4(back.makeTranslation(0, 0, -pivot)).applyMatrix4(back.makeScale(1, 1, 1 / SHRINE_WIDE)).applyMatrix4(back.makeTranslation(0, 0, pivot))
          m.geometry.applyMatrix4(toLeaf.invert())
          m.geometry.computeBoundingSphere(); m.geometry.computeBoundingBox()
        }
        leaf.position.z *= SHRINE_WIDE
        leaf.scale.z *= SHRINE_WIDE
        // (each leaf swings as one: its board, its gold crest and plates and its ink folded together by material (six leaves, some
        // twenty-five draws))
        plainColours(leaf)
        mergeByMaterial(leaf)
      }
      d.userData.wide = true
      // (all six shut, drawn as one: a copy of them shut, a draw a material, not four a leaf)
      d.userData.home = homeCopy(d, [...d.children])
      // (item 578, the Tester's: a click on the doors, and every move of the pointer over them, had three test its ray against each of the
      // leaves' triangles, their crests', and the shut copy's, one by one (12 ms of the click's frame, against 4 for a bare wall). Now none of
      // those take a ray: each leaf carries a plain box as big as it, drawn as nothing, that swings with it (open, the doorway's clear to the
      // Ebisu inside, and the swung leaves still take their clicks to shut))
      d.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.raycast = NO_RAY })
      const lb = new THREE.Box3(), inv = new THREE.Matrix4(), size = new THREE.Vector3(), mid = new THREE.Vector3(), rel = new THREE.Matrix4()
      for (const leaf of d.children) {
        if (leaf.name === 'home-copy') continue
        leaf.updateMatrixWorld(true)
        inv.copy(leaf.matrixWorld).invert()
        lb.makeEmpty()
        leaf.traverse((o) => {
          const m = o as THREE.Mesh
          if (!m.isMesh || (m.material as THREE.Material).side === THREE.BackSide) return
          m.geometry.computeBoundingBox()
          lb.union(m.geometry.boundingBox!.clone().applyMatrix4(rel.multiplyMatrices(inv, m.matrixWorld)))
        })
        if (lb.isEmpty()) continue
        const hit = new THREE.Mesh(new THREE.BoxGeometry(...lb.getSize(size).toArray()), DOOR_HIT_MAT)
        hit.position.copy(lb.getCenter(mid))
        hit.name = 'shrine-door-hit'
        leaf.add(hit)
      }
    }
    return d
  }, [gltf])
  const [open, setOpen] = useState(false)
  const k = useRef(0)
  const wasOpen = useRef(false)
  useFrame((_, dt) => {
    const want = open || BLESSING.on
    // (each time they start to swing, their creak and knock)
    if (want !== wasOpen.current) { wasOpen.current = want; shrineDoor(want) }
    k.current += ((want ? 1 : 0) - k.current) * Math.min(1, dt * 4)
    // (home and shut: settled at nothing, so the one drawing of them all takes over)
    if (!want && k.current < 1e-3) k.current = 0
    ;(doors.userData.home as ReturnType<typeof homeCopy>).home(k.current === 0)
    // (item 567, the owner's 「有沒有辦法把惠比夀的石像做，在關閉時不渲染，打開的瞬間才做渲染呢？」: the Ebisu in the middle bay drawn only
    // while its doors are open, from the frame they start to swing until they're home again: shut, nothing of him shows, and he was drawn
    // every frame all the same (6 draws, 3,656 triangles, and his shadow), the whole evening. In edit mode he's always there, to be picked.
    // His programs are linked as the page loads with the rest (Prewarm compiles the hidden too): nothing's made the moment they open)
    SHRINE_OPEN.k = k.current
    kamidanaOf(gltf.scene).ebisu.visible = k.current > 0 || getEdit().on
    for (const leaf of doors.children) {
      if (leaf.name === 'home-copy') continue
      // (each leaf swings out to the front, the left one one way and the right the other, as far as it can without meeting the railing round
      // the deck (the owner saw them go through its posts and rails, swung 100°): the middle doors' hinges stand right behind the posts at the
      // foot of the steps, the side bays' leaves a short way behind the front rails)
      const sd = leaf.name.endsWith('-1') ? -1 : 1
      leaf.rotation.y = sd * k.current * (/^KamiM/.test(leaf.name) ? DOOR_SWING.middle : DOOR_SWING.side)
    }
  })
  return (
    <group onClick={(e) => { e.stopPropagation(); if (getEdit().on) return; setOpen((v) => !v); setTip({ title: '神棚門', hint: open ? '點一下打開' : '點一下關上' }) }}
      {...tipOver('神棚門', open ? '點一下關上' : '點一下打開')}>
      <primitive object={doors} />
    </group>
  )
}

/** how high the shrine stands on its table, in the model's units: its base (the model's foot, at 0) right on the table's top, a hair into it
 * so no line shows (it was 0.015 up: with the altar's own scale on top of the shrine's, 4.5 cm clear of the table in the room, the owner's
 * "floating apart") */
export const SHRINE_LIFT = -0.0003
/** the vases' feet: on the table's top where they stand, a hair into it (measured: tests/e2e/_vases.mjs) */
const VASE_LIFT = -0.00004
export function Kamidana({ part = 'all' }: { part?: 'all' | 'shrine' | 'vase-1' | 'vase1' | 'cups' }) {
  return (
    <group>
      {/* the shrine itself, from blender/kamidana.py: a three-bay shrine in hinoki, its fittings gold */}
      {/* (its base down on the table's top: it stood 4.5 cm above it (the owner saw it floating, apart from its table)) */}
      {(part === 'all' || part === 'shrine') && <group position={[-0.14, SHRINE_LIFT, 0]}><KamidanaModel /></group>}
      {/* the bouquets in their vases, leaning in a little, each its own piece */}
      {[-1, 1].filter((sd) => part === 'all' || part === `vase${sd}`).map((sd) => (
        // (the vase's foot down on the table's top, a hair into it (it stood 1.5 cm up here: 3 mm in the room); the top's a hair above the
        // shrine's foot out here at the front)
        <group key={sd} position={[-0.15, VASE_LIFT, sd * 0.3]}><BouquetPick slot={sd < 0 ? 0 : 1} /><ContactShadow r={0.05} y={0.0013} /></group>
      ))}
      {/* the cups' stand (blender/kamidana.py), the cups on it */}
      {(part === 'all' || part === 'cups') && <group position={[-0.3, 0, 0]}><group scale-z={CUPSTAND_SHORT}><KamidanaModel part="cupstand" /></group><ContactShadow r={0.15 * CUPSTAND_SHORT} /></group>}
      {(part === 'all' || part === 'cups') && [-CUP_DZ, 0, CUP_DZ].map((z) => (
        <group key={z} position={[-0.3, 0.03, z]}>
          {/* (a cup with a wall of its own: a thick rim, a foot ring, a floor, the sake poured in is seen in it) */}
          <mesh geometry={SAKE_CUP} position-y={-0.0125}><meshToonMaterial color="#f4f1ea" /></mesh>
          <mesh geometry={SAKE_CUP} position-y={-0.0125} scale={[1.05, 1.03, 1.05]}><meshBasicMaterial color="#5a4a3a" side={THREE.BackSide} /></mesh>
        </group>
      ))}
    </group>
  )
}

/** the shrine's scale on the shelf (its cups too) */
export const KAMI_SC = 1.25
export const SHRINE_BACK = 0.018
/** the cups' glass stand drawn shorter, and the cups on it closer (the owner's, 2026-11-11: the stand shortened, the cups the closer; they
 * were 0.09 apart): their spacing in the cups' own frame, and in the altar's (KAMI_SC), which the pour goes by */
// (0.6 now: shorter again, the owner's)
const CUPSTAND_SHORT = 0.6
const CUP_DZ = 0.09 * CUPSTAND_SHORT
export const CUP_DZ_ALTAR = CUP_DZ * KAMI_SC
/** the cup's inside: its floor's height, how high it's filled, and its radius at a height (the inner wall of SAKE_CUP's profile, in its own units) */
export const CUP_FLOOR = 0.0058, CUP_FULL = 0.0212
const CUP_INNER: [number, number][] = [[0.0056, 0], [0.0062, 0.0066], [0.0125, 0.0088], [0.0225, 0.0102], [0.0246, 0.0106]]
export const cupInnerR = (y: number) => {
  for (let i = 0; i < CUP_INNER.length - 1; i++) {
    const [y0, r0] = CUP_INNER[i], [y1, r1] = CUP_INNER[i + 1]
    if (y <= y1) return r0 + (r1 - r0) * THREE.MathUtils.clamp((y - y0) / (y1 - y0), 0, 1)
  }
  return CUP_INNER[CUP_INNER.length - 1][1]
}
/** a little sake cup (お猪口), thick-walled: foot ring, belly, a rounded rim, the inside hollow with its own floor */
const SAKE_CUP = new THREE.LatheGeometry([[0, 0.0005], [0.0072, 0.0005], [0.0078, 0.0022], [0.0095, 0.008], [0.0118, 0.016], [0.0128, 0.0232], [0.0126, 0.0252],
  [0.0116, 0.0256], [0.0106, 0.0246], [0.0102, 0.0225], [0.0088, 0.0125], [0.0066, 0.0062], [0, 0.0056]].map(([x, y]) => new THREE.Vector2(x, y)), 20)
/** the glow round a lit lamp, and the pool of its light on what's under it: a soft warm disc, bright in the middle */
export const GLOW = (() => {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(255,200,130,0.9)')
  grad.addColorStop(0.4, 'rgba(255,170,90,0.35)')
  grad.addColorStop(1, 'rgba(255,150,70,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(c)
})()
