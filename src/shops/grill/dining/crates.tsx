import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { NO_RAY } from '@/scene/interact/pickable'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { mergeByMaterial } from '@/scene/render/StaticBatch'
import { inkModel } from '@/scene/render/inkHull'
import { reflectStudio, useStudio } from '@/scene/render/studio'
import { useGLTF } from '@react-three/drei'
import { SIGN_FONT } from '@/scene/props/signFont'
import { CASE_SIZE } from '@/game/stock/drinkStock'
import { CARTON_CASES, cartonStack } from '@/game/stock/cartonStack'
import { cartonMaterials } from '@/shops/grill/stock/drinkCartons'
import { askPantry, SUPPLIES, DRINK_BACK, DRINKS, FRIDGE_UNITS, handOver, setDrinkPanel } from '@/shops/grill/bar'
import { getEdit } from '@/shops/grill/edit'
import { setTip } from '@/scene/interact/hoverTip'
import { drawGlyph } from '@/ui/art/glyphs'
import { canvasTex } from './base'

/**
 * The milk crates of cold drinks (item 437, the owner's, 2026-11-21: 「新整另一種籃子風格，裡面也是用來裝冷飲類」, after a pink milk crate):
 * blender/milkcrate.py, faded magenta moulded plastic, ribs round its top, a hand-hold in each end, its sides a lattice of diamonds (a
 * picture's holes, not cut), a solid band round its foot, scuffed; bottled tea, a sports drink and cans standing in it. In the stock room
 * against its back wall behind the doorway, seen through it from the room. The plastic glossy as the beer crates' is (the studio in it, a
 * little), the lattice cut by its picture's holes (no mipmaps: shrunk, the holes' edges went grey and speckled), the drinks toon-lit.
 */
const MILK_URL = import.meta.env.BASE_URL + 'models/milkcrate.glb'
useGLTF.preload(MILK_URL)
let milkMats: Record<string, THREE.Material> | null = null
const milkMatOf = (src: THREE.MeshStandardMaterial) => {
  if (!milkMats) milkMats = {}
  let m = milkMats[src.name]
  if (!m) {
    if (src.name === 'MilkCrateLattice') {
      if (src.map) { src.map.generateMipmaps = false; src.map.minFilter = THREE.LinearFilter; src.map.needsUpdate = true }
      m = new THREE.MeshStandardMaterial({ color: '#ffffff', map: src.map ?? null, normalMap: src.normalMap ?? null, roughness: 0.45, metalness: 0,
        alphaTest: 0.5, side: THREE.DoubleSide, envMapIntensity: 0.35 })
      reflectStudio(m as THREE.MeshStandardMaterial)
    } else if (src.name === 'MilkCratePlastic') {
      m = new THREE.MeshStandardMaterial({ color: '#ffffff', map: src.map ?? null, normalMap: src.normalMap ?? null, roughness: 0.45, metalness: 0, envMapIntensity: 0.35 })
      reflectStudio(m as THREE.MeshStandardMaterial)
    } else m = new THREE.MeshToonMaterial({ color: '#ffffff', map: src.map ?? null })
    m.name = src.name
    milkMats[src.name] = m
  }
  return m
}
/** a milk crate as made (its foot's middle at its origin, its front +z, 0.37 x 0.25 x 0.30 at its lip): one copy, its parts shared */
export function MilkCrate() {
  const gltf = useGLTF(MILK_URL) as unknown as { scene: THREE.Group }
  const obj = useMemo(() => {
    const r = (gltf.scene.getObjectByName('MilkCrateRoot') ?? gltf.scene).clone(true)
    r.position.set(0, 0, 0)
    r.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.material = milkMatOf(m.material as THREE.MeshStandardMaterial)
      m.castShadow = true
      m.receiveShadow = true
    })
    // (an ink line round its plastic, not its lattice (the whole panel would be outlined) or its drinks; a hair wide, as it's always been
    // seen: given none, it took the hull's own 0.012, ten times the room's lines, drawn at its batch's 0.0012 only while the batch's merge
    // didn't read the width (item 575; at 0.012 it's a thick, broken black band round each crate))
    inkModel(r, (m) => !/MilkCratePlastic/.test((m.material as THREE.Material).name), { width: 0.0012 })
    return r
  }, [gltf])
  return <primitive object={obj} />
}
/** plastic crates of bottles (P箱), stacked by the fridges, where the stock's seen to (blender/bottlecrate.py: the owner's, their hand-holds
 * cut through and plastic to look at; they were boxes with a black slot painted on) */
const CRATE_URL = import.meta.env.BASE_URL + 'models/bottlecrate.glb'
useGLTF.preload(CRATE_URL)
/** the brewer's name moulded white on a crate's long sides: ビール big, 20本入 · 中瓶 under it, on clear (the planes over the smooth panels) */
const CRATE_LETTERS = canvasTex(600, 128, (g) => {
  g.save()
  g.fillStyle = '#f6efe4'; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.font = `900 62px ${SIGN_FONT}`
  g.fillText('ビール', 300, 50)
  g.font = '700 25px "Arial Black", sans-serif'
  ;(g as unknown as { letterSpacing: string }).letterSpacing = '2px'
  g.fillText('20本入 · 中瓶', 300, 103)
  g.restore()
})
/** the crate's moulded red plastic, glossy (the studio's light in it), and its lettering: made once, shared */
let crateMats: { plastic: THREE.MeshStandardMaterial; letters: THREE.MeshToonMaterial } | null = null
const crateMatsOf = () => {
  if (!crateMats) {
    const plastic = new THREE.MeshStandardMaterial({ color: '#c3302a', roughness: 0.36, metalness: 0, envMapIntensity: 0.85 })
    reflectStudio(plastic)
    if (CRATE_LETTERS) CRATE_LETTERS.flipY = false
    crateMats = { plastic, letters: new THREE.MeshToonMaterial({ color: '#ffffff', map: CRATE_LETTERS, alphaTest: 0.45 }) }
  }
  return crateMats
}
function CrateModel() {
  useStudio()
  const gltf = useGLTF(CRATE_URL) as unknown as { scene: THREE.Group }
  const obj = useMemo(() => {
    const r = gltf.scene.getObjectByName('BottleCrate')!.clone(true)
    r.position.set(0, 0, 0)
    const m = crateMatsOf()
    r.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.material = /Letters/.test(mesh.name) ? m.letters : m.plastic
      mesh.castShadow = true
      mesh.receiveShadow = true
    })
    inkModel(r, (q) => /Letters/.test(q.name), { width: 0.0012, weld: true })
    return r
  }, [gltf])
  return <primitive object={obj} />
}
/**
 * The bottle crates (P箱) by the fridges, the brewer's red plastic, two stacked (blender/bottlecrate.py: ribbed sides, a hand-hold cut
 * through each, a grid of cells inside), its brown beer bottles standing in the cells, their necks and caps up out of it
 */
/** the drinks' names, for the back stock's tag */
export const drinkLabel = (id: string) => DRINKS.find((d) => d.id === id)?.zh ?? id
/** the drinks that live in the fridges, the lowest in the back first */
export const lowestBack = () => [...new Set(FRIDGE_UNITS.flatMap((u) => u.shelves.flatMap((sh) => sh.ids)))]
  .sort((a, b) => (DRINK_BACK.back[a] ?? 0) / (CASE_SIZE[a] ?? 24) - (DRINK_BACK.back[b] ?? 0) / (CASE_SIZE[b] ?? 24))
const CARTONS_URL = import.meta.env.BASE_URL + 'models/drinkcartons.glb'
/** how far up each layer of the stack stands (blender/drinkcartons.py: a case 0.21 tall, sat on the tape of the one under it), and where its
 * two columns' middles are along it */
const CASE_STEP = 0.213
const CASE_COL_X = [-0.2, 0.2] as const
/** the cartons of canned drinks stacked by the crates (blender/drinkcartons.py): each printed for its drink on one print at one scale
 * (drinkCartons.ts), matte kraft with its flutes and handholes, taped shut with a translucent brown tape. As many of them there as the back
 * has cans for (item 199, the owner's 「庫存的東西沒對上」: the nine stood whatever was in the back; game/cartonStack), those over one that's
 * gone dropped onto what's under them; laid out again only when that changes, the cases there folded together by material each time (two
 * draws for the stack, and their ink line, as it was) */
export function DrinkCartons() {
  const gltf = useGLTF(CARTONS_URL) as unknown as { scene: THREE.Group }
  // (the cases as made: each its board and its tape, dressed, where it stands in the stack's frame; the model's own geometry, never let go)
  const src = useMemo(() => {
    const root = gltf.scene.clone(true)
    const { board, tape } = cartonMaterials()
    root.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const tapeOf = /Tape/.test((m.material as THREE.Material).name ?? '')
      m.material = tapeOf ? tape : board
      // (the tape lies on the board: no shadow of its own)
      m.castShadow = !tapeOf
      m.receiveShadow = true
    })
    root.updateMatrixWorld(true)
    const own = new Set<THREE.BufferGeometry>()
    root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) own.add(m.geometry) })
    return { cases: CARTON_CASES.map((_, i) => root.getObjectByName(`Carton${i}`) ?? null), own }
  }, [gltf])
  const holder = useMemo(() => new THREE.Group(), [])
  const laid = useRef({ key: '', at: -1 })
  /** what's drawn let go: what was made for it (the merged cases, their ink line), not the model's own */
  const clear = useCallback(() => {
    for (const c of [...holder.children]) {
      c.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && !src.own.has(m.geometry)) m.geometry.dispose() })
      c.removeFromParent()
    }
  }, [holder, src])
  useEffect(() => { laid.current.key = ''; return clear }, [clear])
  useFrame(({ clock }) => {
    // (looked at twice a second)
    if (laid.current.key && clock.elapsedTime - laid.current.at < 0.5) return
    laid.current.at = clock.elapsedTime
    const at = cartonStack(DRINK_BACK.back, (id) => CASE_SIZE[id] ?? 24)
    const key = at.map((a) => (a.shown ? `${a.layer}${a.col}` : '-')).join(',')
    if (key === laid.current.key) return
    laid.current.key = key
    clear()
    const r = new THREE.Group()
    at.forEach((a, i) => {
      const c = src.cases[i]
      if (!a.shown || !c) return
      const k = c.clone(true)
      c.matrixWorld.decompose(k.position, k.quaternion, k.scale)
      k.position.y += (a.layer - CARTON_CASES[i].layer) * CASE_STEP
      // (the one across the top, come down on one column alone: over that column's middle)
      if (CARTON_CASES[i].col < 0 && a.col !== -1) k.position.x += CASE_COL_X[a.col]
      r.add(k)
    })
    if (r.children.length) {
      inkModel(r, (m) => /Tape/.test((m.material as THREE.Material).name ?? ''), { width: 0.0012, weld: true })
      mergeByMaterial(r)
    }
    holder.add(r)
  })
  return <primitive object={holder} />
}
useGLTF.preload(CARTONS_URL)
/** an unseen box over the sake barrels: the sake's stock (kept at room temperature); pointed at, it says how much there is and lights them
 * (`lit`: the barrels as drawn), a click opens the stock on its larder's tab, at the sake (the owner's) */
export function SakeHit({ lit }: { lit: () => THREE.Object3D | null }) {
  const hint = () => {
    const n = SUPPLIES.has('Sake')
    return n < 0 ? '點一下看常溫區的清酒' : `清酒 ${n}・點一下看常溫區的庫存`
  }
  // (pointed at only where the barrels themselves are, tried against them as drawn: the box round the round, tall stack caught the pointer
  // in the air beside them, over the rice sacks at their foot, seen from up high)
  const raycast = useMemo(() => {
    const found: THREE.Intersection[] = []
    return function (this: THREE.Mesh, ray: THREE.Raycaster, hits: THREE.Intersection[]) {
      const drawn = lit()
      if (!drawn) { THREE.Mesh.prototype.raycast.call(this, ray, hits); return }
      found.length = 0
      ray.intersectObject(drawn, true, found)
      if (found.length) hits.push({ ...found[0], object: this })
    }
  }, [lit])
  return (
    <mesh position={[0, SAKE_HIT[1] / 2, 0]} raycast={raycast}
      onClick={(e) => { e.stopPropagation(); if (getEdit().on) return; askPantry('ambient', 'sack', undefined, 'Sake') }}
      onPointerOver={(e) => { if (getEdit().on) return; handOver.onPointerOver({ ...e, eventObject: lit() ?? e.eventObject }); setTip({ title: '菰樽（清酒）', hint: hint() }) }}
      onPointerOut={(e) => { handOver.onPointerOut({ ...e, eventObject: lit() ?? e.eventObject }); setTip(null) }}>
      <boxGeometry args={SAKE_HIT} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}
/** the stack's size (in the frame it's turned in): the box pointed at over it */
const SAKE_HIT: [number, number, number] = [0.9, 0.98, 0.76]
/**
 * The stock room's goods to point at (item 735, the owner's 「應該是點擊貨物而非門簾」: the noren in its doorway lit up and opened the drinks'
 * stock; the crates and cartons in there do now): tried against the goods as drawn (`goods`: the beer crates, their bottles, the cartons
 * and the milk crates), so it's taken only where they are, seen under the noren through the doorway or from over the room's open top;
 * pointed at, they light up together and say what's lowest in the back; a click opens the drinks' stock. (The wall in front of them stops
 * the pointer on the shop's side: StoreRoom's sheets.) Unseen itself, not drawn.
 */
export function StockHit({ goods }: { goods: () => THREE.Object3D | null }) {
  const hint = () => `後場最少：${lowestBack().slice(0, 3).map((id) => `${drinkLabel(id)} ${DRINK_BACK.back[id] ?? 0}`).join('、')}｜點一下打開飲料庫存`
  const raycast = useMemo(() => {
    const found: THREE.Intersection[] = []
    return function (this: THREE.Mesh, ray: THREE.Raycaster, hits: THREE.Intersection[]) {
      const drawn = goods()
      if (!drawn) return
      found.length = 0
      ray.intersectObject(drawn, true, found)
      if (found.length) hits.push({ ...found[0], object: this })
    }
  }, [goods])
  return (
    <mesh raycast={raycast}
      onClick={(e) => { e.stopPropagation(); if (getEdit().on) return; setDrinkPanel(true) }}
      onPointerOver={(e) => { if (getEdit().on) return; handOver.onPointerOver({ ...e, eventObject: goods() ?? e.eventObject }); setTip({ title: '後場的飲料', hint: hint() }) }}
      onPointerOut={(e) => { handOver.onPointerOut({ ...e, eventObject: goods() ?? e.eventObject }); setTip(null) }}>
      <boxGeometry args={[0.01, 0.01, 0.01]} />
      <meshBasicMaterial visible={false} />
    </mesh>
  )
}
/**
 * The beer bottles standing in the crates' cells: only their tops show over the crates' walls, so only the tops are made (the owner's: each
 * was a whole bottle, 12 round): the shoulder, the neck and its lip in brown glass, 8 round, open below where the cells hide it; the foil
 * round the neck and the crown cap in gold; all of them in both crates one instanced mesh each (the beer bottle's own size, 1.2 times)
 */
const UP_AXIS = new THREE.Vector3(0, 1, 0)
const CRATE_NECK = new THREE.LatheGeometry([[0.0275, 0.1], [0.0275, 0.12], [0.0235, 0.145], [0.0145, 0.17], [0.0125, 0.2], [0.0135, 0.206], [0.0135, 0.21]]
  .map(([x, y]) => new THREE.Vector2(x * 1.2, y * 1.2)), 8)
const CRATE_CAP = (() => {
  const foil = new THREE.CylinderGeometry(0.0138 * 1.2, 0.0155 * 1.2, 0.04 * 1.2, 8, 1, true).translate(0, 0.18 * 1.2, 0)
  const cap = new THREE.CylinderGeometry(0.0145 * 1.2, 0.0145 * 1.2, 0.008 * 1.2, 8).translate(0, 0.213 * 1.2, 0)
  const g = mergeGeometries([foil.toNonIndexed(), cap.toNonIndexed()])!
  foil.dispose(); cap.dispose()
  return g
})()
const CRATE_GLASS_MAT = new THREE.MeshToonMaterial({ color: '#5a3010' })
const CRATE_CAP_MAT = new THREE.MeshToonMaterial({ color: '#c9a24a', side: THREE.DoubleSide })
/** the two crates of bottled beer, the top one a little askew on the lower (the bottles in them drawn apart: CrateBottles) */
export function CrateBoxes() {
  return (
    <group>
      {[0, 1].map((k) => (
        <group key={k} position={[k * 0.03 - 0.015, k * 0.272, 0]} rotation-y={k * 0.1}><CrateModel /></group>
      ))}
    </group>
  )
}
/**
 * The bottled beer in the two crates, as many as there are in the back stock (item 199, the owner's: 「庫存的東西沒對上」): twenty to a crate,
 * the lower filled first, so the top one empties first as bottles are taken. Drawn outside the crates' batch: a batch doesn't take instanced
 * meshes in and hides what it's merged, so they were never drawn at all.
 */
export function CrateBottles() {
  const W = 0.36, D = 0.29
  const cols = 5, rows = 4
  // (where each bottle stands, the lower crate's twenty first; in the crates' frame)
  const at = useMemo(() => {
    const out: THREE.Matrix4[] = []
    for (const k of [0, 1]) {
      const crate = new THREE.Matrix4().compose(new THREE.Vector3(k * 0.03 - 0.015, k * 0.272, 0), new THREE.Quaternion().setFromAxisAngle(UP_AXIS, k * 0.1), new THREE.Vector3(1, 1, 1))
      for (let n = 0; n < cols * rows; n++) {
        const x = -W / 2 + (W / cols) * ((n % cols) + 0.5), z = -D / 2 + (D / rows) * (Math.floor(n / cols) + 0.5)
        out.push(crate.clone().multiply(new THREE.Matrix4().makeTranslation(x, 0.012, z)))
      }
    }
    return out
  }, [])
  const necks = useRef<THREE.InstancedMesh>(null), caps = useRef<THREE.InstancedMesh>(null)
  const place = useCallback((m: THREE.InstancedMesh | null) => {
    if (!m) return
    at.forEach((mx, i) => m.setMatrixAt(i, mx))
    m.instanceMatrix.needsUpdate = true
    m.computeBoundingSphere()
  }, [at])
  useFrame(() => {
    const n = Math.max(0, Math.min(at.length, Math.floor(DRINK_BACK.back.beer ?? 0)))
    for (const m of [necks.current, caps.current]) if (m && m.count !== n) m.count = n
  })
  return (
    <group>
      <instancedMesh ref={(m) => { necks.current = m; place(m) }} args={[CRATE_NECK, CRATE_GLASS_MAT, at.length]} castShadow={false} />
      <instancedMesh ref={(m) => { caps.current = m; place(m) }} args={[CRATE_CAP, CRATE_CAP_MAT, at.length]} castShadow={false} />
    </group>
  )
}
/**
 * What stands about the room besides the counters (the shop's own frame): sake barrels stacked in the open corner past
 * the kitchen, a pot of bamboo at the dead end of the side counter's aisle, and the empty-bottle crates at the
 * kitchen's end — all of it on the floor out of everyone's way, and facing the room.
 */

/** the notes that float out of the speaker, drawn once */
const NOTE_TEX = (() => {
  if (typeof document === 'undefined') return []
  return (['note', 'notes', 'note', 'notes'] as const).map((ch, i) => {
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const g = c.getContext('2d')!
    // (the game's own drawn notes (ui/glyphs), never a font's: a dark edge all round, then the colour; the second pair turned the other way)
    if (i > 1) { g.translate(64, 0); g.scale(-1, 1) }
    for (let a = 0; a < 8; a++) drawGlyph(g, ch, 7 + Math.cos(a * Math.PI / 4) * 3, 7 + Math.sin(a * Math.PI / 4) * 3, 50, 'rgba(40,20,8,0.85)')
    drawGlyph(g, ch, 7, 7, 50, ['#ffd98a', '#9fe3ae', '#ffb0a0', '#a8d0ff'][i])
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  })
})()
/**
 * Notes coming out of the speaker's cones while music plays: sprites of the game's own drawn notes, single and beamed, big ones from the woofer and small ones from the tweeter, each
 * rising and swaying on its own beat, growing as it goes and fading out; with the music off no more set out, and those up finish their flight.
 */
export function MusicNotes({ playing }: { playing: boolean }) {
  const N = 10
  const refs = useRef<(THREE.Sprite | null)[]>([])
  const k = useRef(0)
  // (each note: which driver it comes out of (the big woofer or the little tweeter), how big it grows, its own speed and way to drift)
  const notes = useMemo(() => Array.from({ length: N }, (_, i) => {
    const woofer = i % 3 !== 2
    return { x0: (((i * 37) % 7) - 3) * 0.008, y0: woofer ? -0.07 : 0.15, size: (woofer ? 0.17 : 0.09) * (0.8 + ((i * 53) % 5) * 0.1), speed: 0.22 + ((i * 29) % 6) * 0.025,
      drift: (((i * 17) % 9) - 4) * 0.045, phase: i / N }
  }), [])
  // (each note's own flight: when it set out (none: not flying). With the music on, a note that's done sets out again; with it off, no new
  // one sets out, and those already up go on rising and fading out each in its own time (the owner's: they all shrank away at once))
  const born = useRef<(number | null)[]>(notes.map(() => null))
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    notes.forEach((n, i) => {
      const sp = refs.current[i]
      if (!sp) return
      let b0 = born.current[i]
      if (b0 !== null && (t - b0) * n.speed >= 1) b0 = null
      // (set out again, or for the first time as the music starts: staggered by each note's own phase)
      if (b0 === null && playing) b0 = t + (k.current ? 0 : n.phase / n.speed)
      born.current[i] = b0
      const life = b0 === null ? -1 : (t - b0) * n.speed
      sp.visible = life >= 0 && life < 1
      if (!sp.visible) return
      // (out of the cone, on and up in front of the speaker, swaying as it goes)
      sp.position.set(n.x0 + n.drift * life + Math.sin(t * 2.1 + i * 1.7) * 0.04 * life, n.y0 + life * 0.55, 0.14 + life * 0.5)
      sp.scale.setScalar(n.size * Math.min(1, life * 6) * (0.75 + 0.5 * life))
      ;(sp.material as THREE.SpriteMaterial).opacity = Math.min(1, life * 8) * (1 - life) ** 0.6
    })
    // (whether the music's been on since the notes last stood still: a fresh start staggers them)
    k.current = playing || born.current.some((x) => x !== null) ? 1 : 0
  })
  return (
    <>
      {notes.map((_, i) => (
        <sprite key={i} ref={(o) => { refs.current[i] = o }} visible={false} raycast={NO_RAY}>
          <spriteMaterial map={NOTE_TEX[i % NOTE_TEX.length]} transparent depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </>
  )
}
