import { memo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { type PlateKind } from '@/game/service/plateSize'
import { mameGlaze, oribeLong, roundGlaze } from '@/shops/grill/wareGlazes'
import { DrinkBottle } from '@/shops/grill/dining/bottles'
import { DrinkCup } from '@/shops/grill/dining/cups'
import { cupped } from '@/shops/grill/dining/drinkKinds'
import { CLEAN_AT } from '@/game/service/plates'
import { plateGoes } from '@/game/service/tray'
import { PLATING, type DrinkId } from '@/shops/grill/bar'
import { BONES_GEO, HEAD_GEO } from '@/shops/grill/fishBones'
import { INK } from './part'
import { PLATE_R, PLATE_GEO, SMEAR_GEO, FLOOR_LONG, FLOOR_ROUND, KIND_SCALE, BONES_ON_LONG, smearOpacity, USED_STICK_GEO, STICKS_ON, BONES_ON, CRUMPLE_GEO, CRUMPLE_MAT, GARNISH_MAT, GARNISHES } from './service'

/** the long plate (長角皿, blender/longplate.py, item 228): made in the bar's units at the size it's drawn, its length along x; its lip a band
 * of thickness, a foot ring under it (item 251, the owner's: 「盤子造型再精美些有點太簡陋，厚度感要出來」「但模型要簡易」) */
const LONG_PLATE_URL = import.meta.env.BASE_URL + 'models/longplate.glb'
useGLTF.preload(LONG_PLATE_URL)
export let LONG_GEO: THREE.BufferGeometry | null = null
/** the round plate (blender/roundplate.py, item 251): the shop's round plate as PLATE_GEO was, 2 x PLATE_R across its rim, now with a lip of
 * some thickness and a foot ring, 20 round (it was a lathe in code, 384 triangles); its picture's UVs straight down, as wareGeometry's */
const ROUND_PLATE_URL = import.meta.env.BASE_URL + 'models/roundplate.glb'
useGLTF.preload(ROUND_PLATE_URL)
export let ROUND_GEO: THREE.BufferGeometry | null = null
/** the round plate's geometry as loaded, its picture's v the way wareGeometry has it (0.5 - z / 2R: through glTF it may come the other way) */
const roundGeoOf = (scene: THREE.Object3D) => {
  const g = (scene.getObjectByName('RoundPlate') as THREE.Mesh | undefined)?.geometry
  if (!g) return null
  const pos = g.attributes.position, uv = g.attributes.uv
  if (uv) {
    let i = 0
    while (i < pos.count && Math.abs(pos.getZ(i)) < PLATE_R * 0.5) i++
    if (i < pos.count && Math.sign(uv.getY(i) - 0.5) === Math.sign(pos.getZ(i))) {
      for (let k = 0; k < uv.count; k++) uv.setY(k, 1 - uv.getY(k))
      uv.needsUpdate = true
    }
  }
  return g
}

/** a customer's plate, of the shop's one set of painted ware (dirty: a smear of sauce and the sticks left on it, of what was eaten off it,
 * thrown away with it at the sink (the owner's)); drawn again only when it gets dirty */
export const Plate = memo(PlateImpl)
function PlateImpl({ kind = 'round', dirty = false, dirt = 1, design = 0, sticks = 1, bones = 0, glass, tissue, drink, level = 0, garnish }: { dirty?: boolean; dirt?: number; design?: number; sticks?: number; bones?: number
  /** what's set with the food (item 272): all of it with the food on it, what's left of it once it's eaten, none on a plate with nothing */
  garnish?: 'full' | 'left'
  /** which of the shop's plates it is (game/plateSize, item 228): the long one, a round one, a little one; it and what's left on it, not
   * what stands beside it */
  kind?: PlateKind
  /** where what they drank was left, from the plate's middle (on the bar where it was drunk, or on the plate being cleared): its own bottle or
   * can (the owner's, 2026-11-10: a glass from nowhere stood there), as much left in it as they left, and a sake's cup by it */
  glass?: readonly [number, number, number]
  drink?: DrinkId
  level?: number
  /** the crumpled tissue left by it, from its middle (on the bar, or on the plate being cleared) */
  tissue?: readonly [number, number, number] }) {
  const gltf = useGLTF(LONG_PLATE_URL) as unknown as { scene: THREE.Group }
  const roundGltf = useGLTF(ROUND_PLATE_URL) as unknown as { scene: THREE.Group }
  if (!LONG_GEO) LONG_GEO = (gltf.scene.getObjectByName('LongPlate') as THREE.Mesh | undefined)?.geometry ?? null
  if (!ROUND_GEO) ROUND_GEO = roundGeoOf(roundGltf.scene)
  const long = kind === 'long' && !!LONG_GEO
  const geo = long ? LONG_GEO! : ROUND_GEO ?? PLATE_GEO
  // (what's left on it lies on its floor, not over it: the smear, the sticks and the bones were set for the plates before item 251's)
  const floor = long ? FLOOR_LONG : FLOOR_ROUND
  return (
    <group>
      <group scale={KIND_SCALE[long ? 'long' : kind === 'long' ? 'round' : kind]}>
      <mesh geometry={geo} castShadow receiveShadow>
        {/* (each kind its own glaze (item 278): the long ones Oribe, the round ones white crackle with iron and green, the little ones Kiseto) */}
        <meshToonMaterial color="#ffffff" map={long ? oribeLong(design) : kind === 'mame' ? mameGlaze(design) : roundGlaze(design)} />
      </mesh>
      <mesh geometry={geo} scale={long ? [1.012, 1.05, 1.03] : [1.03, 1.05, 1.03]}>
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
      {garnish && GARNISHES && kind !== 'mame' && (
        <mesh geometry={GARNISHES[long ? 'long' : 'round'][garnish]} material={GARNISH_MAT} raycast={() => {}} />
      )}
      {dirty && (
        <>
          {/* (its smear, as dirty as it was left (game/plates' plateDirt): the more eaten off it, the bigger and the darker; in the sink it
              fades as it soaks, GuestBar3D setting its opacity frame by frame; on the long plate drawn out along it) */}
          <mesh name="plate-smear" geometry={SMEAR_GEO} position={long ? [0.02, floor + 0.0015, 0] : [0.03, floor + 0.0015, -0.02]} rotation-x={-Math.PI / 2}
            scale={long ? [1.9 * (0.7 + 0.4 * dirt), 0.65 * (0.7 + 0.4 * dirt), 1] : [1.2 * (0.7 + 0.4 * dirt), 0.8 * (0.7 + 0.4 * dirt), 1]} visible={dirt > CLEAN_AT}>
            <meshBasicMaterial color="#8a5a32" transparent opacity={smearOpacity(dirt)} depthWrite={false} />
          </mesh>
          {STICKS_ON.slice(0, Math.min(4, sticks)).map(([x, yaw], i) => (
            <mesh key={i} geometry={USED_STICK_GEO} position={[x, floor + 0.0042 + i * 0.006, 0.03 - i * 0.012]} rotation={[0, yaw, Math.PI / 2]}>
              <meshToonMaterial color="#c9a46a" />
            </mesh>
          ))}
          {/* (the bones of each fish eaten off it, picked clean, the head browned) */}
          {(long ? BONES_ON_LONG : BONES_ON).slice(0, Math.min(2, bones)).map(([x, z, yaw], i) => (
            <group key={`b${i}`} name="plate-bones" position={[x, floor + 0.006 + i * 0.004, z]} rotation-y={yaw}>
              <mesh geometry={BONES_GEO}><meshToonMaterial color="#efe6cf" /></mesh>
              <mesh geometry={HEAD_GEO}><meshToonMaterial color="#8a5a30" /></mesh>
            </group>
          ))}
        </>
      )}
      </group>
      {dirty && (
        <>
          {/* (the tissue they wiped their mouth with, crumpled up) */}
          {tissue && <mesh name="plate-tissue" geometry={CRUMPLE_GEO} position={[tissue[0], tissue[1] + 0.016, tissue[2]]} material={CRUMPLE_MAT} />}
          {/* (what they drank, its bottle or can left, drunk down (and a sake's cup by it)) */}
          {glass && drink && (
            <group name="plate-glass" position={[glass[0], glass[1], glass[2]]}>
              <DrinkBottle id={drink} level={level} />
              {cupped(drink) && <group position={[0.05, 0, -0.03]}><DrinkCup id={drink} level={0} /></group>}
            </group>
          )}
        </>
      )}
    </group>
  )
}

/** a plate of each kind drawn at one place (item 228), the one it is shown by showKind: for the plates whose kind changes as they're used
 * (the sink's stack, the basket's slots, the plates being washed in hand), so a change is a flag, not a redraw */
// (memo: its two numbers the same, it isn't drawn again with whatever holds it (item 374: 167 times a second while the shop was open))
export const PlateKinds = memo(function PlateKinds({ design = 0, dirty = false }: { design?: number; dirty?: boolean }) {
  return (
    <>
      <group name="kind-round"><Plate kind="round" design={design} dirty={dirty} sticks={0} /></group>
      <group name="kind-long" visible={false}><Plate kind="long" design={design} dirty={dirty} sticks={0} /></group>
    </>
  )
})
const MAME_OF_ROUND = KIND_SCALE.mame / KIND_SCALE.round
/** show the kind of plate it is, of a PlateKinds' two (its parts found once, kept on it) */
export const showKind = (g: THREE.Object3D | null | undefined, kind: PlateKind) => {
  if (!g) return
  const k = (g.userData.kinds ??= [g.getObjectByName('kind-round'), g.getObjectByName('kind-long')]) as (THREE.Object3D | undefined)[]
  if (k[1]) k[1].visible = kind === 'long'
  if (k[0]) { k[0].visible = kind !== 'long'; k[0].scale.setScalar(kind === 'mame' ? MAME_OF_ROUND : 1) }
}
/** every smear drawn on a plate (or a PlateKinds' two), found once, kept on it */
export const smearsOf = (g: THREE.Object3D | null | undefined): THREE.Mesh[] => {
  if (!g) return []
  if (!g.userData.smears) { const out: THREE.Mesh[] = []; g.traverse((q) => { if (q.name === 'plate-smear') out.push(q as THREE.Mesh) }); g.userData.smears = out }
  return g.userData.smears as THREE.Mesh[]
}

/**
 * A server at the plating place for a plate (item 317, the owner's): they take the tongs up, and what's for it on the tray by the fire is
 * lifted onto it a piece at a time (Roasting); they take the plate up once it's all on it and nothing's in the air on its way (and a moment
 * after they're there, as before)
 */
export function pickupReady(slot: number | undefined, t: number) {
  const sl = PLATING.slots[slot ?? -1]
  if (sl) sl.tongs = true
  return t > 0.4 && plateGoes(sl?.onTray ?? 0, sl?.flying ?? 0)
}
