import { memo, useMemo, useRef } from 'react'
import { coolerDoorSound } from '@/shops/grill/sounds/restroomSound'
import { heard } from '@/scene/interact/sfx'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { StaticBatch } from '@/scene/render/StaticBatch'
import { inkModel } from '@/scene/render/inkHull'
import { tick } from '@/scene/kit/speed'
import { FloorPiece } from '@/scene/props/FloorPiece'
import { CubbyStock } from '@/shops/grill/kitchen/KitchenStores'
import { QUALITY } from '@/scene/render/quality'
import { IRONS } from '@/shops/grill/bar'
import { getEdit } from '@/shops/grill/edit'
import { setTip } from '@/scene/interact/hoverTip'
import { ColdMist } from '@/scene/effects/ColdMist'
import { CUBBY_KICK, CUBBY_OPEN, askPantry, shutPantry, tipOver, ALONG, handOver, KITCHEN_FOLK, GRILL_OFFSET, KITCHEN_DROP, LAY, CUBBY, CUBBY2, CUBBY_FLOOR_Y, CUBBY_SHELF_Y, COOK_NOTCH, SOUS_NOTCH } from '@/shops/grill/bar'
import { SIZZLE_AT } from './tuning'
import { COOK_TABLE_WOOD, COOK_PANEL_WOOD, KICK_H, TABLE_T, TABLE_ROUND, TABLE_OUT, COOK_MARBLE, panelBox, KITCHEN_FLOOR, quadSlab, barBrassOf } from './common'
import { COOK_TABLE, COOK_TABLE_PARTS, KITCHEN_FLOOR_Y } from './kitchen'
import { HearthGuard } from './hearthGuard'

/**
 * The two recesses in the cook table's body (the owner's notch at its front, the third cook's bay at its end) shaded inside, under the top's
 * overhang, as they are: a soft dark wash down their back walls, deepest up under the top (the side walls lit by their cove strips) (the owner's, 2026-11-10: their walls the
 * same white as the table's faces round them, the bay looked to be no recess at all, the top cut and the body under it flat). The walls are the
 * body's faces, set 0.06 back from the cuts (COOK_TABLE_PARTS' insets); the wash 2 mm off them, from the kick's top to the body's
 */
/** the recesses' slot lights (槽燈; the owner's, 2026-11-11: in the side walls of the owner's notch and the third cook's bay, a groove cut
 * up each in the recess near its inner corner, the light in it): the groove from the kick's top to the top's underside, GROOVE wide, its floor dark, a shadow
 * along its one edge and a catch of light along the other as a cut's are; a warm strip of light up its middle; its warm light on the wall
 * either side of it, fading out over GLOW_W (no light of its own: drawn as light, added to the wall). The wall's one solid face: the groove's
 * drawn on it, 2 mm off */
// (right in the inner corner, the groove's edge 3 mm off the back wall (item 123, the owner's, 2026-11-15: "in the groove, the inner wall the
// arrows point at": it stood 7 cm out along the side wall, a strip of bare wall between it and the corner); its light on the back wall's end
// too (BACK_GLOW))
const GROOVE = 0.036, GROOVE_IN = GROOVE / 2 + 0.003, GLOW_W = 0.2
const RECESS_COVE = new THREE.MeshBasicMaterial({ color: '#ffe0a8', toneMapped: false })
const GROOVE_FLOOR = new THREE.MeshBasicMaterial({ color: '#3a3028', polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })
const GROOVE_SHADE = new THREE.MeshBasicMaterial({ color: '#1e1814', polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })
const GROOVE_LIP = new THREE.MeshBasicMaterial({ color: '#f4efe6', polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })
/** a wash down a wall in its vertices' colours (linear, a row at each stop from the top: [t, r, g, b]); no alpha in them (a picture's alpha,
 * or the vertices', never showed on the wall here: the shading under the top was never seen) but the way it's laid on: the back walls'
 * multiplied over them (darkened), the side walls' added (lit) */
function washGeo(len: number, h: number, stops: [number, number, number, number][]) {
  const g = new THREE.PlaneGeometry(len, h, 1, stops.length - 1)
  const pos = g.attributes.position, col = new Float32Array(pos.count * 3)
  for (let i = 0; i < pos.count; i++) {
    // (rows from the top down, two vertices a row)
    const [t, r, gg, b] = stops[Math.floor(i / 2)]
    col.set([r, gg, b], i * 3)
    pos.setY(i, h / 2 - t * h)
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  return g
}
const washMat = (blend: Partial<THREE.MeshBasicMaterialParameters>) => new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false,
  toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, ...blend })
/** the back walls' shading under the top: the wall times these (deepest up under the top) */
const SHADE_MAT = washMat({ blending: THREE.CustomBlending, blendSrc: THREE.DstColorFactor, blendDst: THREE.ZeroFactor })
const BACK_WASH: [number, number, number, number][] = [[0, 0.45, 0.43, 0.41], [0.35, 0.62, 0.6, 0.58], [1, 0.74, 0.72, 0.7]]
/** the side walls' warm light from their slot lights, added to them: brightest by the groove, gone GLOW_W off either side (columns across
 * the wall, the vertices' colours by how far each is from it) */
const GLOW_MAT = washMat({ blending: THREE.AdditiveBlending })
function glowGeo(h: number) {
  const xs = [-1, -0.45, -0.15, 0.15, 0.45, 1]
  const g = new THREE.PlaneGeometry(GLOW_W * 2, h, xs.length - 1, 1)
  const pos = g.attributes.position, col = new Float32Array(pos.count * 3)
  for (let i = 0; i < pos.count; i++) {
    const x = xs[i % xs.length]
    pos.setX(i, x * GLOW_W)
    const k = Math.max(0, 1 - Math.abs(x)) ** 1.6
    col.set([0.5 * k, 0.3 * k, 0.11 * k], i * 3)
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  return g
}
let backGlow: { h: number; g: THREE.BufferGeometry } | null = null
/** the slot light's glow on the back wall by its corner: the side walls' (glowGeo), a little fainter, the lights being round the corner */
function backGlowGeo(h: number) {
  if (backGlow?.h === h) return backGlow.g
  const g = glowGeo(h)
  const col = g.attributes.color as THREE.BufferAttribute
  for (let i = 0; i < col.count; i++) col.setXYZ(i, col.getX(i) * 0.6, col.getY(i) * 0.6, col.getZ(i) * 0.6)
  backGlow = { h, g }
  return g
}
const RecessShade = memo(function RecessShade() {
  const floor = GRILL_OFFSET.y - KITCHEN_DROP + KICK_H, top = -TABLE_T, h = top - floor
  const IN = 0.06, OFF = 0.002
  // (each wall: where along it runs (from, to: the table's frame, along or lay), where it stands across it, the way it faces)
  const walls: { a: [number, number]; at: number; across: 'along' | 'lay'; face: 1 | -1 }[] = [
    // (the bay: its back wall, its two sides out to the table's end)
    { a: [SOUS_NOTCH.lay[0] - IN, SOUS_NOTCH.lay[1] + IN], at: SOUS_NOTCH.along[0] - IN + OFF, across: 'along', face: 1 },
    { a: [SOUS_NOTCH.along[0] - IN, COOK_TABLE.along[1] - IN], at: SOUS_NOTCH.lay[0] - IN + OFF, across: 'lay', face: 1 },
    { a: [SOUS_NOTCH.along[0] - IN, COOK_TABLE.along[1] - IN], at: SOUS_NOTCH.lay[1] + IN - OFF, across: 'lay', face: -1 },
    // (the notch: its back wall, its two sides out to the table's front)
    { a: [COOK_NOTCH.along[0] - IN, COOK_NOTCH.along[1] + IN], at: COOK_NOTCH.lay[0] - IN + OFF, across: 'lay', face: 1 },
    { a: [COOK_NOTCH.lay[0] - IN, COOK_TABLE.lay[1] - IN], at: COOK_NOTCH.along[0] - IN + OFF, across: 'along', face: 1 },
    { a: [COOK_NOTCH.lay[0] - IN, COOK_TABLE.lay[1] - IN], at: COOK_NOTCH.along[1] + IN - OFF, across: 'along', face: -1 },
  ]
  return (
    <group>
      {walls.map((w, i) => {
        const len = w.a[1] - w.a[0], mid = (w.a[0] + w.a[1]) / 2
        // (the wall's plane: its middle in the table's frame, and turned to face out of the wall into the recess)
        const p = w.across === 'along' ? new THREE.Vector3().addScaledVector(ALONG, w.at).addScaledVector(LAY, mid)
          : new THREE.Vector3().addScaledVector(ALONG, mid).addScaledVector(LAY, w.at)
        p.y = floor + h / 2
        const n = (w.across === 'along' ? ALONG : LAY).clone().multiplyScalar(w.face)
        // (the side walls (each recess's second and third): the cove light along the top, its glow down the wall; the back wall only shaded)
        const side = i % 3 !== 0
        return <group key={i} position={p} rotation-y={Math.atan2(n.x, n.z)}>
          {!side && <mesh material={SHADE_MAT} geometry={washGeo(len, h, BACK_WASH)} raycast={() => {}} renderOrder={1} />}
          {/* (the slot lights' warm light on the back wall at its two ends, by the corners they're in: the half past each end is in the side
              wall, hidden) */}
          {!side && [-1, 1].map((e) => <mesh key={e} position={[e * len / 2, 0, 0.001]} material={GLOW_MAT} geometry={backGlowGeo(h - 0.004)} raycast={() => {}} renderOrder={2} />)}
          {side && (() => {
            // (in the recess, near the wall's inner end by the back wall (the owner's, 2026-11-11: inside it; at the open end it stood on the
            // corner, its glow reaching on past the wall's end into the air): along the wall its +x is toward the a-range's high end (the open
            // side) on a wall facing along LAY (face +1), the low end on one facing along ALONG; what of its glow reaches past the inner end is
            // in the back wall, hidden)
            const x = -(w.across === 'along' ? -w.face : w.face) * (len / 2 - GROOVE_IN)
            const gh = h - 0.004
            return <group position={[x, 0, 0.003]}>
              <mesh material={GROOVE_FLOOR} raycast={() => {}}><planeGeometry args={[GROOVE, gh]} /></mesh>
              <mesh position={[-GROOVE / 2 + 0.003, 0, 0.0005]} material={GROOVE_SHADE} raycast={() => {}}><planeGeometry args={[0.006, gh]} /></mesh>
              <mesh position={[GROOVE / 2 - 0.0015, 0, 0.0005]} material={GROOVE_LIP} raycast={() => {}}><planeGeometry args={[0.003, gh]} /></mesh>
              <mesh name={`recess-cove-${i}`} position={[0.002, 0, 0.002]} material={RECESS_COVE} raycast={() => {}}><boxGeometry args={[0.01, gh - 0.02, 0.003]} /></mesh>
              <mesh position={[0, 0, -0.001]} material={GLOW_MAT} geometry={glowGeo(gh)} raycast={() => {}} renderOrder={2} />
            </group>
          })()}
        </group>
      })}
    </group>
  )
})
function CookTableImpl({ floor = true }: { floor?: boolean }) {
  // (and under it all the kitchen's floor, from the bar's cook's edges to the front, and on past the table's
  // right-hand end where the other cooks stand)
  const W = KITCHEN_FLOOR.along[1] - KITCHEN_FLOOR.along[0], D = KITCHEN_FLOOR.lay[1] - KITCHEN_FLOOR.lay[0]
  const mid = new THREE.Vector3().addScaledVector(ALONG, (KITCHEN_FLOOR.along[0] + KITCHEN_FLOOR.along[1]) / 2)
    .addScaledVector(LAY, (KITCHEN_FLOOR.lay[0] + KITCHEN_FLOOR.lay[1]) / 2).setY(KITCHEN_FLOOR_Y)
  return (
    <>
      {/* (set back under the top on their outer faces only: where they meet, they run into each other, no gap) */}
      {COOK_TABLE_PARTS.map((p, i) => <CookTableBox key={i} lay={[p[0], p[1]]} along={[p[2], p[3]]} inset={p[4]} />)}
      <RecessShade />
      <CubbyFrame />
      {/* (the third cook's fire irons, leant by his bay at its right-hand side, against the crate) */}
      <SousIrons />
      {/* (its far corners, marked for the servers' way round it to the dish racks: GuestBar3D) */}
      <group name="cook-table-c0" position={new THREE.Vector3().addScaledVector(ALONG, COOK_TABLE.along[0]).addScaledVector(LAY, COOK_TABLE.lay[0])} />
      {/* (no one stood in the table or its hearth: put out of them the last thing before each frame's drawn) */}
      <HearthGuard />
      <group name="cook-table-c1" position={new THREE.Vector3().addScaledVector(ALONG, COOK_TABLE.along[1]).addScaledVector(LAY, COOK_TABLE.lay[1])} />
      {/* (the cubbies either side a pair of doors each, opening out to the left and the right; under the hearth, at the back of the notch,
          no cupboard: the table's own face, the cook's knives hung upright on their rack on it (Decor's KnifeSet) */}
      <CubbyDoors along={CUBBY2.along as [number, number]} hinge="both" lit />
      <CubbyDoors along={CUBBY.along as [number, number]} hinge="both" lit />
      {/* (what's kept in them: the grill's own stores, no plates (blender/cubbystock.py)) */}
      {([['right', CUBBY.along], ['left', CUBBY2.along]] as const).map(([which, al]) => {
        const at = new THREE.Vector3().addScaledVector(ALONG, (al[0] + al[1]) / 2).addScaledVector(LAY, (CUBBY.lay[0] + COOK_TABLE.lay[1] - 0.06) / 2)
        return <group key={which} position={[at.x, CUBBY_FLOOR_Y, at.z]} rotation-y={Math.atan2(-ALONG.z, ALONG.x)}><CubbyStock which={which} /></group>
      })}
      <CookTableTop />
      {/* (the same boards as the customers', laid the same way; with the shop open and the room drawn, its one floor
          runs under the kitchen too) */}
      {floor && (
        <group position={mid} rotation-y={Math.atan2(-ALONG.z, ALONG.x)}>
          <FloorPiece w={W} l={D} />
        </group>
      )}
    </>
  )
}
/**
 * The third cook's fire irons (the owner's, 2026-11-10): a pair of long iron hibashi joined at the top by a ring, and a little ash shovel,
 * stood on the top at his bay's right-hand side and leant back against the charcoal crate, there to his hand. Iron, one draw (their parts'
 * colours on their points), no shadow (thin things).
 */
const IRONS_GEO = (() => {
  const parts: THREE.BufferGeometry[] = []
  const tint = (g: THREE.BufferGeometry, hex: string) => {
    const c = new THREE.Color(hex), n = g.attributes.position.count, col = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3)
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    g.deleteAttribute('uv')
    return g
  }
  // (the hibashi: two square iron rods 0.55 long, a hair apart, meeting at a brass-dark ring at the top)
  for (const sd of [-1, 1]) parts.push(tint(new THREE.BoxGeometry(0.012, 0.55, 0.012).translate(sd * 0.012, 0.275, 0), '#3a3a3e'))
  parts.push(tint(new THREE.TorusGeometry(0.022, 0.005, 4, 10).translate(0, 0.565, 0), '#6b5a3a'))
  // (the shovel: a flat blade with its sides turned up, on a rod with a wooden grip)
  const shovel = [
    tint(new THREE.BoxGeometry(0.1, 0.006, 0.09), '#4a4a50'),
    tint(new THREE.BoxGeometry(0.006, 0.022, 0.09).translate(-0.05, 0.011, 0), '#4a4a50'),
    tint(new THREE.BoxGeometry(0.006, 0.022, 0.09).translate(0.05, 0.011, 0), '#4a4a50'),
    tint(new THREE.CylinderGeometry(0.006, 0.006, 0.36, 6).translate(0, 0.18, -0.045), '#3a3a3e'),
    tint(new THREE.CylinderGeometry(0.011, 0.011, 0.11, 8).translate(0, 0.33, -0.045), '#6b4a2a'),
  ]
  // (the blade stood on its tip, the rod up: tilted back as it leans)
  const sh = mergeGeometries(shovel)!.rotateX(-Math.PI / 2 + 0.25).translate(0.07, 0.045, 0)
  parts.push(sh)
  return mergeGeometries(parts)!
})()
const IRONS_MAT = new THREE.MeshToonMaterial({ vertexColors: true })
/** how many sticks burnt to ash in the bed before it's raked over, and how much the fire comes up for it (item 108) */
export const ASH_TIDY = 3
export const TIDY_GAIN = 0.08
/** how long the irons are worked over the fire, clicked (item 108) */
const IRONS_S = 1.4
function SousIronsImpl() {
  // (on the top at the bay's right-hand side, by its mouth, leant back toward the crate (lay-) a little past upright)
  const at = new THREE.Vector3().addScaledVector(ALONG, SOUS_NOTCH.along[1] - 0.26).addScaledVector(LAY, SOUS_NOTCH.lay[0] - 0.07)
  const m = useRef<THREE.Mesh>(null)
  // (taken up and worked over the fire while they're in use (the player's click, or the third cook raking: bar.ts's IRONS): leant right
  // over toward the hearth, lifted, raked to and fro; back in their place after)
  useFrame(() => {
    const o = m.current
    if (!o) return
    const left = (IRONS.until - performance.now()) / 1000
    // (clicked: the fire tidied once they've been worked over it)
    if (IRONS.ask && left <= 0) { IRONS.ask = false; IRONS.tidy?.() }
    const k = left > 0 ? Math.min(1, Math.min(left, 1.6 - Math.min(1.6, left)) / 0.3) : 0
    o.rotation.x = 0.28 + k * 0.75
    o.rotation.z = 0.05 + k * Math.sin(performance.now() / 90) * 0.18
    o.position.y = k * 0.06
  })
  const says = () => (IRONS.until > performance.now() ? '整理炭火中' : '撥掉燒成灰的炭、把炭撥攏，火會旺一點｜點一下整理炭火')
  return (
    <group position={at} rotation-y={Math.atan2(-ALONG.z, ALONG.x)}>
      {/* (leant over toward the crate: about the table's along, its x here; lay is its -z) */}
      <mesh ref={m} geometry={IRONS_GEO} material={IRONS_MAT} rotation-x={0.28} rotation-z={0.05}
        onPointerOver={(e) => { if (getEdit().on) return; tipOver('火鋏與灰鏟', says()).onPointerOver(e) }}
        onPointerOut={(e) => { tipOver('火鋏與灰鏟', '').onPointerOut(e) }}
        onClick={(e) => {
          e.stopPropagation()
          if (getEdit().on || IRONS.until > performance.now()) return
          IRONS.until = performance.now() + IRONS_S * 1000
          IRONS.ask = true
          setTip({ title: '火鋏與灰鏟', hint: '整理炭火中' })
        }} />
    </group>
  )
}
const SousIrons = memo(SousIronsImpl)
function tableTopGeometry(grow: number, thick: number) {
  const { along: [a0, a1], lay: [l0, l1] } = COOK_TABLE
  const i = TABLE_OUT - grow
  const { along: [n0, n1], lay: [nl] } = COOK_NOTCH
  const { along: [s0], lay: [m0, m1] } = SOUS_NOTCH
  // (the notch under the hearth cut in from its front: the outline runs in round it; and round the third cook's bay at its far end)
  const pts: [number, number][] = [[a0 + i, l0 + i], [a1 - i, l0 + i], [a1 - i, m0 - i], [s0 - i, m0 - i], [s0 - i, m1 + i], [a1 - i, m1 + i],
    [a1 - i, l1 - i], [n1 + i, l1 - i], [n1 + i, nl + i], [n0 - i, nl + i], [n0 - i, l1 - i], [a0 + i, l1 - i]]
  // (its corners rounded off, as a planed top would be; the outline, grown out, keeps to the same curves)
  // (its top and underside cut into even quads, not earcut's slivers fanning across them from a corner (item 954): quadSlab)
  const g = quadSlab(pts, [0.16, 0.16, 0.04, 0.1, 0.1, 0.04, 0.16, 0.04, 0.1, 0.1, 0.04, 0.16].map((r) => r + grow),
    { depth: TABLE_T - 2 * thick, bevelThickness: thick, bevelSize: TABLE_OUT + grow * 0.6, bevelSegments: 4 })
  g.rotateX(Math.PI / 2)
  g.translate(0, -thick, 0)
  return g
}
const TABLE_TOP = tableTopGeometry(0, TABLE_ROUND)
const TABLE_TOP_INK = tableTopGeometry(0.012, TABLE_ROUND + 0.007)
/** (item 79, the owner's, 2026-11-13: "the cook table could be finer"): a black-lacquered band (縁) under the top's edge, all round its
 * outline, as a finished counter's; and brass caps wrapping its four outer rounded corners, as the hearth's frame has at its own. (Item 379:
 * set back under the top's round, a dark apron the slab sits on, its line under the round; a hair out from the top it stuck out under the
 * round as a lip) */
const TABLE_BAND = (() => {
  // (set in 2.4 cm: the inside corners' rounds (4 cm) still clear of the band's own bevel)
  const g = tableTopGeometry(-0.015, 0.004)
  // (the top's outline, set in, cut down to a band 2.2 cm deep just under the top: the extrusion's own depth scaled)
  g.computeBoundingBox()
  const b = g.boundingBox!
  g.translate(0, -b.max.y, 0)
  g.scale(1, 0.022 / (b.max.y - b.min.y), 1)
  g.translate(0, -TABLE_T + 0.002, 0)
  return g
})()
const TABLE_CORNERS = (() => {
  const { along: [a0, a1], lay: [l0, l1] } = COOK_TABLE
  // (a hair out from the corner's own round (a true circle, drawn in eight straight steps), on the edge's straight band between its rounds
  // over and under (item 379))
  const i = TABLE_OUT, r = 0.16, R = r + TABLE_OUT + 0.003, hb = TABLE_T - 2 * TABLE_ROUND - 0.008
  // (each corner's middle, and the quarter round it faces: three's cylinder runs from +z toward +x)
  const at: [number, number, number][] = [[a0 + i + r, l0 + i + r, Math.PI], [a1 - i - r, l0 + i + r, Math.PI / 2], [a1 - i - r, l1 - i - r, 0],
    [a0 + i + r, l1 - i - r, Math.PI * 1.5]]
  const parts = at.map(([x, z, t]) => new THREE.CylinderGeometry(R, R, hb, 8, 1, true, t + 0.05, Math.PI / 2 - 0.1).translate(x, -TABLE_T / 2, z))
  return mergeGeometries(parts)!
})()
function CookTableTop() {
  return (
    <group rotation-y={Math.atan2(-ALONG.z, ALONG.x)}>
      <mesh geometry={TABLE_TOP} receiveShadow>
        <meshToonMaterial color="#ffffff" map={COOK_TABLE_WOOD} />
      </mesh>
      <mesh geometry={TABLE_TOP_INK}>
        <meshBasicMaterial color="#3b2a20" side={THREE.BackSide} />
      </mesh>
      <mesh geometry={TABLE_BAND}>
        <meshToonMaterial color="#17110d" />
      </mesh>
      <mesh geometry={TABLE_CORNERS} material={barBrassOf()} />
    </group>
  )
}
/** a plain block of the table's body, by its extents (along, lay, and height from–to) */
function Block({ along: a, lay: l, y: [y0, y1], color }: { along: [number, number]; lay: [number, number]; y: [number, number]; color: string }) {
  const mid = new THREE.Vector3().addScaledVector(ALONG, (a[0] + a[1]) / 2).addScaledVector(LAY, (l[0] + l[1]) / 2)
  return (
    <group position={mid} rotation-y={Math.atan2(-ALONG.z, ALONG.x)}>
      <mesh position-y={(y0 + y1) / 2} ref={(m) => { if (m) inkModel(m) }}>
        <boxGeometry args={[a[1] - a[0], y1 - y0, l[1] - l[0]]} />
        <meshToonMaterial color={color} />
      </mesh>
    </group>
  )
}
/** the cubby cut into the table's front: a header over it under the top, a plinth at its foot, a shelf over its right-hand part */
/** the cubby's boards, all one colour */
const CUBBY_WOOD = '#4a3524'
function CubbyFrame() {
  const floor = GRILL_OFFSET.y - KITCHEN_DROP
  const front = COOK_TABLE.lay[1] - 0.06
  return (
    <>
      <Block along={[CUBBY.along[0], CUBBY.along[1]]} lay={[CUBBY.lay[0], front]} y={[-0.3, -TABLE_T]} color={CUBBY_WOOD} />
      <Block along={[CUBBY.along[0], CUBBY.along[1]]} lay={[CUBBY.lay[0], front]} y={[floor, CUBBY_FLOOR_Y]} color={CUBBY_WOOD} />
      {/* (and the second, on the left: the same header, floor and a shelf the whole way across) */}
      <Block along={[CUBBY2.along[0], CUBBY2.along[1]]} lay={[CUBBY2.lay[0], front]} y={[-0.3, -TABLE_T]} color={CUBBY_WOOD} />
      <Block along={[CUBBY2.along[0], CUBBY2.along[1]]} lay={[CUBBY2.lay[0], front]} y={[floor, CUBBY_FLOOR_Y]} color={CUBBY_WOOD} />
    </>
  )
}
/**
 * A cupboard's doors (開き戸) in the table's front, frame-and-panel in the body's own cedar a shade lighter: one leaf hung at its outer
 * end (`hinge` 'low' or 'high' along the table) or a pair hung at both ends meeting in the middle ('both'), a small oval pull let in
 * near each free edge. Shut, they close it off; a click swings them open outward so what's in it shows, another shuts them (the owner's:
 * pointed at, they lit up and swung open of themselves, and stayed open while the pointer was inside). `front`: the face they hang on (lay); `back`: how far in the cupboard goes (lay), its inside dark. `lit`: a strip of warm
 * light under its header inside, coming on as the doors open (and off as they shut, so none leaks out through them), lighting what's in it.
 */
// (the cupboards are fridges (the owner's): a cold white light in them, not a warm one)
const STRIP_OFF = new THREE.Color('#4a5058')
const STRIP_ON = new THREE.Color('#eef7ff')
/** a wire rack (a fridge's shelf, as the drinks fridges' are): a frame of round rod round it and thin wires across it from front to back,
 * `w` along x and `d` along z, its top at y 0; made once for each size */
const racks = new Map<string, THREE.BufferGeometry>()
function wireRack(w: number, d: number) {
  const key = `${w.toFixed(3)}x${d.toFixed(3)}`
  let g = racks.get(key)
  if (g) return g
  const parts: THREE.BufferGeometry[] = []
  const rod = (len: number, r: number, along: 'x' | 'z', x: number, z: number) => {
    const c = new THREE.CylinderGeometry(r, r, len, 6, 1, true)
    c.rotateZ(along === 'x' ? Math.PI / 2 : 0)
    if (along === 'z') c.rotateX(Math.PI / 2)
    c.translate(x, -r, z)
    parts.push(c)
  }
  rod(w, 0.005, 'x', 0, -d / 2); rod(w, 0.005, 'x', 0, d / 2)
  rod(d, 0.005, 'z', -w / 2, 0); rod(d, 0.005, 'z', w / 2, 0)
  const n = Math.max(2, Math.round(w / 0.035))
  for (let i = 1; i < n; i++) rod(d, 0.0025, 'z', -w / 2 + (w * i) / n, 0)
  rod(w, 0.0035, 'x', 0, 0)
  g = mergeGeometries(parts)!
  parts.forEach((q) => q.dispose())
  racks.set(key, g)
  return g
}
/** a fridge's white lining, its walls, ceiling, floor and shelf */
const FRIDGE_LINING = '#e3e9ee'
/** what a fridge's display says: its temperature */
const FRIDGE_READOUT = (() => {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = 128; c.height = 64
  const g = c.getContext('2d')!
  g.fillStyle = '#0d1418'; g.fillRect(0, 0, 128, 64)
  g.fillStyle = '#7fe8ff'; g.shadowColor = '#4ad0ff'; g.shadowBlur = 10
  g.font = 'bold 40px "Segoe UI", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.fillText('3.0℃', 64, 34)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
})()
/** how bright a cupboard's lamp is, its doors open */
const CUBBY_LAMP = 3.2
/** how far a leaf swings open (a little past square) */
const LEAF_SWING = 1.75
/** how near someone's middle may come to where a cupboard's doors swing (a body's half-width and a little), and how far ahead of a walker
 * that's looked for (seconds of their way: the doors swing shut in less) */
const DOOR_ROOM = 0.35
const DOOR_AHEAD = 0.2
/** and no further ahead than this (a run's pace would look past where they stop: the owner, back at his place by the left-hand cupboard) */
const DOOR_AHEAD_MAX = 0.12
/**
 * How far a point (x, z, in a leaf's own terms: its hinge at the origin, the leaf shut along +x, swinging out toward +z) is from all the
 * places the leaf passes through as it opens, its width `w` swung through LEAF_SWING.
 */
function fromSwing(x: number, z: number, w: number) {
  const a = Math.atan2(z, x)
  if (a >= 0 && a <= LEAF_SWING) return Math.max(0, Math.hypot(x, z) - w)
  // (outside the sweep: to the nearer of its edges, the leaf shut and the leaf open)
  return Math.min(fromLeaf(x, z, w, 1, 0), fromLeaf(x, z, w, SWUNG_X, SWUNG_Z))
}
const SWUNG_X = Math.cos(LEAF_SWING), SWUNG_Z = Math.sin(LEAF_SWING)
/** how far (x, z) is from a leaf `w` long lying from the origin along the unit (cx, cz) */
function fromLeaf(x: number, z: number, w: number, cx: number, cz: number) {
  const t = Math.min(w, Math.max(0, x * cx + z * cz))
  return Math.hypot(x - t * cx, z - t * cz)
}
function CubbyDoors({ along: [a0, a1], hinge, front = COOK_TABLE.lay[1] - 0.11, back = CUBBY.lay[0], lit = false }: { along: [number, number]
  hinge: 'low' | 'high' | 'both'; front?: number; back?: number; lit?: boolean }) {
  const floor = GRILL_OFFSET.y - KITCHEN_DROP
  const top = -0.3, bottom = floor + CUBBY.plinth
  const H = top - bottom, span = a1 - a0
  const leaves = hinge === 'both' ? [-1, 1] : [hinge === 'low' ? -1 : 1]
  const W = span / leaves.length - 0.006
  const mid = new THREE.Vector3().addScaledVector(ALONG, (a0 + a1) / 2).addScaledVector(LAY, front)
  const doors = useRef<(THREE.Group | null)[]>([])
  const frame = useRef<THREE.Group>(null)
  const st = useRef({ k: 0, kept: false, blocked: false })
  const lamp = useRef<THREE.SpotLight>(null)
  // (where the cupboard's lamp shines: straight down, onto its floor)
  const lampAim = useMemo(() => new THREE.Object3D(), [])
  const strip = useRef<THREE.MeshBasicMaterial>(null)
  // (how open it is, for the cold that spills out)
  const cold = useRef(0)
  const side = a0 < COOK_NOTCH.along[0] ? 'left' : 'right'
  if (import.meta.env?.DEV && typeof window !== 'undefined') ((window as unknown as { __cubbies?: Record<string, typeof st> }).__cubbies ??= {})[side] = st
  const geo = useMemo(() => panelBox(W, H, 0.025, 0.45), [W, H])
  const inv = useMemo(() => new THREE.Matrix4(), [])
  const who = useMemo(() => new THREE.Vector3(), [])
  const seen = useMemo(() => new Map<THREE.Object3D, THREE.Vector3>(), [])
  /** whether (x, z), in the doors' frame, is too near where either leaf swings (each in its own terms: hinged at its end of the opening, shut
   * toward the middle) */
  const inSwing = (x: number, z: number) => {
    for (const sd of leaves) if (fromSwing((x - sd * span / 2) * -sd, z, W) < DOOR_ROOM) return true
    return false
  }
  useFrame((_, dt) => {
    const s = st.current
    if (frame.current && (s.k > 0.01 || s.kept)) {
      inv.copy(frame.current.matrixWorld).invert()
      // (anyone stood or passing in front, where the doors swing, where they are or where they'll be a moment on at the pace they're going:
      // the doors don't open into them, and swing shut if they're open, opening again once they're by if they'd been left open)
      s.blocked = false
      for (const f of KITCHEN_FOLK) {
        if (!f.visible) continue
        who.setFromMatrixPosition(f.matrixWorld).applyMatrix4(inv)
        let last = seen.get(f)
        if (!last) seen.set(f, (last = who.clone()))
        const step = dt > 0 ? DOOR_AHEAD / Math.max(dt, 1 / 120) : 0
        const vx = (who.x - last.x) * step, vz = (who.z - last.z) * step
        const cut = Math.min(1, DOOR_AHEAD_MAX / Math.max(1e-6, Math.hypot(vx, vz)))
        const ax = who.x + vx * cut, az = who.z + vz * cut
        last.copy(who)
        if (inSwing(who.x, who.z) || inSwing(ax, az)) s.blocked = true
      }
      for (const f of seen.keys()) if (!KITCHEN_FOLK.has(f)) seen.delete(f)
    } else {
      s.blocked = false
      seen.clear()
    }
    // (the chef reaching in: part way open a moment, whoever's before them (he is))
    const want = performance.now() - CUBBY_KICK[side] < 1500 ? 0.6 : !s.blocked && s.kept ? 1 : 0
    s.k += (want - s.k) * Math.min(1, tick(dt) * (s.blocked ? 16 : 5))
    // (heard as its doors come open and as they meet again: a fridge's seal, quieter than the drinks fridges' (under the table, smaller doors))
    const opened = s.k > 0.05
    if (opened !== CUBBY_OPEN[side] && frame.current) coolerDoorSound(opened, heard(frame.current.getWorldPosition(SIZZLE_AT)).near * 0.55)
    CUBBY_OPEN[side] = opened
    // (each door about its hinge at its outer edge, its free edge swinging out toward the cook, a little past square)
    const e = s.k * s.k * (3 - 2 * s.k)
    doors.current.forEach((d, i) => { if (d) d.rotation.y = leaves[i] * e * LEAF_SWING })
    // (glass-fronted, its light's always on, a little brighter with its doors open)
    if (lamp.current) lamp.current.intensity = (0.55 + 0.45 * e) * CUBBY_LAMP
    strip.current?.color.copy(STRIP_ON)
    cold.current = e
  })
  // (a fridge's: 冷藏櫃門, the owner's name for them)
  const tip = () => setTip({ title: lit ? '冷藏櫃門' : '櫃門', hint: st.current.blocked ? '前面有人，打不開' : st.current.kept ? '點一下關上' : '點一下打開' })
  const over = (e: Parameters<typeof handOver.onPointerOver>[0]) => {
    handOver.onPointerOver(e)
    tip()
  }
  return (
    <group ref={frame} position={mid} rotation-y={Math.atan2(-ALONG.z, ALONG.x)}>
      {lit && (
        <>
          <mesh name={`CubbyStrip-${side}`} position={[0, top - 0.007, -0.045]}>
            <boxGeometry args={[span - 0.12, 0.012, 0.022]} />
            <meshBasicMaterial ref={strip} color={STRIP_OFF} toneMapped={false} />
          </mesh>
          {/* (shining down only, a wide cone from just under its top, and no further than its floor: a lamp in all directions lit the
              table's top above it as well (no shadows, and the toon light lights even what faces away a little), the top and the plate on it
              glowing as the doors opened) */}
          {QUALITY.tier === 'high' && (
            <>
              <primitive object={lampAim} position={[0, bottom, (back - front) * 0.4]} />
              <spotLight ref={lamp} position={[0, top - 0.03, (back - front) * 0.4]} target={lampAim} color="#e6f2ff" intensity={0}
                angle={1.25} penumbra={0.55} distance={(top - bottom) * 1.8} decay={1.6} />
            </>
          )}
          {/* (a fridge's white lining: its back, its two ends, its ceiling, its floor; the shelf lined white too) */}
          <StaticBatch plain>
            <mesh position={[0, (top + bottom) / 2, back - front + 0.006]}><boxGeometry args={[span - 0.01, H, 0.008]} /><meshToonMaterial color={FRIDGE_LINING} /></mesh>
            {[-1, 1].map((e) => (
              <mesh key={e} position={[e * (span / 2 - 0.006), (top + bottom) / 2, (back - front) / 2]}><boxGeometry args={[0.008, H, front - back - 0.01]} /><meshToonMaterial color={FRIDGE_LINING} /></mesh>
            ))}
            <mesh position={[0, top - 0.005, (back - front) / 2 - 0.01]}><boxGeometry args={[span - 0.01, 0.008, front - back - 0.03]} /><meshToonMaterial color={FRIDGE_LINING} /></mesh>
            <mesh position={[0, bottom + 0.003, (back - front) / 2]}><boxGeometry args={[span - 0.01, 0.006, front - back - 0.01]} /><meshToonMaterial color={FRIDGE_LINING} /></mesh>
          </StaticBatch>
          {/* (the shelf a white wire rack, as the drinks fridges' are: the left-hand one the whole way, the right-hand one over its outer half
              only (the owner's), its other half by the cook's notch the whole height for the soy sauce and the seasonings (blender/cubbystock.py)) */}
          {(() => {
            const s0 = side === 'right' ? 0 : -span / 2, s1 = span / 2
            return <mesh position={[(s0 + s1) / 2, CUBBY_SHELF_Y - 0.006, (back - front) / 2]} geometry={wireRack(s1 - s0 - 0.02, front - back - 0.04)}>
              <meshToonMaterial color="#eef2f5" />
            </mesh>
          })()}
          {/* (its display, on the header above its doors: what it's keeping at) */}
          {FRIDGE_READOUT && (
            <mesh position={[span / 2 - 0.16, -0.19, 0.0515]}>
              <planeGeometry args={[0.1, 0.05]} />
              <meshBasicMaterial map={FRIDGE_READOUT} toneMapped={false} />
            </mesh>
          )}
          {/* (and the cold that spills out over its sill as its doors open, falling to the floor and rolling out across it) */}
          <group position={[0, floor, 0.03]}>
            <ColdMist width={span * 0.8} drop={bottom - floor + 0.16} reach={0.7} level={cold} opacity={0.28} />
          </group>
        </>
      )}
      {leaves.map((sd, i) => (
        <group key={i} ref={(g) => { doors.current[i] = g }} position={[sd * span / 2, 0, 0.0125]}
          onClick={(e) => {
            e.stopPropagation()
            if (getEdit().on) return
            st.current.kept = !st.current.kept
            // (a fridge: opened, the stock panel comes up on its tab; shut, it goes (the owner's))
            if (lit) { if (st.current.kept) askPantry('chilled', 'cubby', () => { st.current.kept = false }); else shutPantry() }
            tip()
          }}
          onPointerOver={over} onPointerOut={(e) => { handOver.onPointerOut(e); setTip(null) }}>
          {/* (a frame-and-panel door: a panel of the body's white marble set in a frame of dark cedar, its stiles and rails standing a little
              proud of it, so it reads as joinery of a piece with the table rather than a board stuck on) */}
          <group position={[-sd * (W / 2 + 0.003), bottom + H / 2, 0]}>
            {lit ? (
              // (a fridge's door: a pane of glass in the frame, a pale cold tint, a gleam of the room in it; what's inside seen through it)
              <mesh scale={[W - 0.1, H - 0.1, 1]}>
                <planeGeometry args={[1, 1]} />
                <meshStandardMaterial color="#dff1fb" transparent opacity={0.2} roughness={0.06} metalness={0.2} depthWrite={false} />
              </mesh>
            ) : (
              <mesh geometry={geo} scale={[1, 1, 0.7]}>
                <meshToonMaterial color="#ffffff" map={COOK_MARBLE} />
              </mesh>
            )}
            {/* (the frame's four pieces drawn as one: they swing as one) */}
            <StaticBatch plain>
            {[-1, 1].map((e) => (
              <group key={e}>
                <mesh position={[e * (W / 2 - 0.03), 0, 0.006]}><boxGeometry args={[0.06, H, 0.02]} /><meshToonMaterial color="#7a5638" map={COOK_PANEL_WOOD} /></mesh>
                <mesh position={[0, e * (H / 2 - 0.03), 0.006]}><boxGeometry args={[W - 0.12, 0.06, 0.02]} /><meshToonMaterial color="#7a5638" map={COOK_PANEL_WOOD} /></mesh>
              </group>
            ))}
            </StaticBatch>
          </group>
          {/* (the pull: a small oval let into the stile near the free edge, dark inside) */}
          <mesh position={[-sd * (W - 0.032), bottom + H * 0.55, 0.0172]} scale={[0.6, 1, 1]}>
            <circleGeometry args={[0.022, 20]} />
            <meshBasicMaterial color="#3a2616" />
          </mesh>
        </group>
      ))}
    </group>
  )
}
function CookTableBox({ lay: l, along: a, inset: [i0, i1, j0, j1] }: { lay: [number, number]; along: [number, number]
  /** how far each face is set back under the top: lay's low and high ends, along's low and high (less than 0: run on) */
  inset: [number, number, number, number] }) {
  const lay = [l[0] + i0, l[1] - i1], along = [a[0] + j0, a[1] - j1]
  const W = along[1] - along[0] + 0.12, D = lay[1] - lay[0] + 0.12
  const mid = new THREE.Vector3().addScaledVector(ALONG, (along[0] + along[1]) / 2).addScaledVector(LAY, (lay[0] + lay[1]) / 2)
  const floor = GRILL_OFFSET.y - KITCHEN_DROP
  // (the top is one piece over all of them: CookTableTop)
  return (
    <group position={mid} rotation-y={Math.atan2(-ALONG.z, ALONG.x)}>
      {/* the body, set back a little under the top: clad in honed white marble, a dark kick at its foot */}
      <mesh position-y={(floor - TABLE_T) / 2} geometry={useMemo(() => panelBox(W - 0.12, -floor - TABLE_T, D - 0.12, 1.2), [W, D, floor])}>
        <meshToonMaterial color="#ffffff" map={COOK_MARBLE} />
      </mesh>
      {/* (as high as the steps in the recesses (STEP_H), so none of it shows over their backs: at 0.1 a band of it stood over them, a dark
          step round their back corners (the owner saw)) */}
      <mesh position-y={floor + KICK_H / 2}>
        <boxGeometry args={[W - 0.1, KICK_H, D - 0.1]} />
        <meshToonMaterial color="#1e140d" />
      </mesh>
    </group>
  )
}
export const CookTable = memo(CookTableImpl)
