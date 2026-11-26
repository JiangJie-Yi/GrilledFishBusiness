import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { StaticBatch } from '@/scene/render/StaticBatch'
import { SIGN_FONT } from '@/scene/props/signFont'
import { STORE, STORE_STATE, WALL_OUT, FRIDGE_GAP, DRINK_BACK, setDrinkPanel, FRIDGE, handOver, WC_ROOM } from '@/shops/grill/bar'
import { EditBlock } from '@/shops/grill/editor/Movable'
import { getEdit } from '@/shops/grill/edit'
import { setTip } from '@/scene/interact/hoverTip'
import { canvasTex } from './base'
import { WcWall, WC_T, WcMass } from './wc'
import { drinkLabel, lowestBack } from './crates'
import { NO_RAY } from '@/scene/interact/pickable'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { unlitShade, lightOn } from '@/game/world/roomLights'
import { getLights, pressLightSwitch } from '@/scene/render/lightsStore'
import { QUALITY } from '@/scene/render/quality'
import { tick } from '@/scene/kit/speed'
import { lightSwitchSound } from '@/shops/grill/sounds/restroomSound'
import { EARTH_Y } from '@/shops/grill/guestbar/ground'
import { GLOW } from './shrine'

/** the stock room's doorway's frame (items 430): its posts' width in the wall's line, its head's height over the opening */
export const STORE_POST = STORE.post, STORE_HEAD = 0.07
/** the stock room's noren (a half-noren, to the stocker's shoulders): as wide as the frame's posts' outer sides (the doorway's as laid out,
 * item 467), and how long */
const STORE_NOREN_L = 0.6
/**
 * The stock room's noren (item 430, the owner's 「這邊挖空並加上掛簾，後面是小儲藏室，倉儲員工專用」): indigo cotton, the shop's back rooms'
 * plain kind: its top band darker where it's sewn over the rod; across its middle, where its two panels part, a white ring round 倉 (the
 * store), and under it in small spaced capitals STAFF ONLY; a white line along its hem; the cotton's weave. One picture over both panels.
 */
const storeNoren = (wide: number) => {
  const PX = 1024 / wide, H = Math.round(STORE_NOREN_L * PX)
  return canvasTex(1024, H, (g) => {
    const cloth = '#1f2f52'
    const band = Math.round(0.034 * PX), cy = Math.round(band + (H - band) * 0.43)
    g.save()
    g.fillStyle = cloth; g.fillRect(0, 0, 1024, H)
    g.globalAlpha = 0.06
    g.fillStyle = '#ffffff'
    for (let x = 0; x < 1024; x += 3) g.fillRect(x, 0, 1, H)
    g.fillStyle = '#000000'
    for (let y = 0; y < H; y += 3) g.fillRect(0, y, 1024, 1)
    g.globalAlpha = 1
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, 0, 1024, band)
    g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(0, band, 1024, 3)
    // (the ring and the character in it)
    g.strokeStyle = '#efe9dc'; g.lineWidth = 16
    g.beginPath(); g.arc(512, cy, 150, 0, Math.PI * 2); g.stroke()
    g.fillStyle = '#efe9dc'; g.textAlign = 'center'; g.textBaseline = 'middle'
    g.font = `700 200px ${SIGN_FONT}`
    g.fillText('倉', 512, cy + 8)
    g.font = '700 46px "Arial Black", sans-serif'
    ;(g as unknown as { letterSpacing: string }).letterSpacing = '14px'
    g.fillText('STAFF ONLY', 512, cy + 232)
    g.fillRect(0, H - Math.round(0.022 * PX), 1024, 5)
    g.restore()
  })
}
/** the noren's cloth for its width: both sides, its picture read from the room (the side toward the stock room mirrored, as a dyed cloth
 * is); made once for the doorway's width (it's laid out once, as the shop loads: no program made while it's open) */
const STORE_NOREN_MATS = new Map<number, THREE.MeshToonMaterial>()
function storeNorenMat(wide: number) {
  const k = Math.round(wide * 1000)
  let m = STORE_NOREN_MATS.get(k)
  if (!m) STORE_NOREN_MATS.set(k, (m = new THREE.MeshToonMaterial({ color: '#ffffff', map: storeNoren(wide), side: THREE.DoubleSide })))
  return m
}
/**
 * The stock room (items 430, 431, 437; the owner's, 2026-11-21: 「這邊挖空並加上掛簾，後面是小儲藏室，倉儲員工專用」「飲料可以從冷飲櫃後面直接
 * 補」): a narrow room behind the side wall, from the wall's start along behind the drinks fridges to the men's toilet's room, its way in a
 * doorway in the wall's stretch past the fridges, a noren over it; only the stocker goes in. Built as the toilets' rooms are (a wing of the
 * house: dark cedar to the waist outside, plaster over, a dark cap along the tops, open over (its slatted ceiling taken away, item 498); inside, cedar to the
 * waist and plaster, the floor's boards the toilets' hinoki), the fridges' backs in its front wall, the drinks' stock along its back wall
 * (ShopProps: the crates and the cartons, and the milk crates). In the wall's frame (x behind its face, y up, z along it).
 */
// (its walls and the stock in it took no shadow at all once (item 476, the owner's 「有不明陰影」: the sun's, through its walls, lay on its floor
// and walls in blots); the sun's light is taken off indoors since item 721 (scene/render/indoorSun), so none of its shadows can show in here,
// and the room's own bulb's hard shadows (item 729) are taken on its walls and its stock as on its floor)
/**
 * The stock room's lamp (item 713, the owner's 「然後這上面掛一盞簡易吊燈。」, a red ring at the top of its far end wall over the stock): a
 * plain enamel shade hung on a bracket from the top of that wall (the room's open over: nothing over it to hang from), as a store room's
 * lamp is. An iron arm out from a wooden block on the wall with a brace under it, the cord down from its end into the shade's socket, the
 * shade a dark green enamel cone white inside. Its bulb a bare tungsten one on its own pull switch, its shadows hard (item 729, the owner's
 * 「這邊是鎢絲燈泡，用拉的，陰影要硬」): clear glass round a zigzag filament between two leads, the filament glowing orange then white as
 * it's lit and dying back through orange as it's put out, the glass warm round it; a cotton pull cord out of the socket, down past the bulb's
 * side and out under the shade's mouth to a wooden bead, pulled when it's clicked (down, the switch's click at the bottom, back up past where
 * it hung and the bead swinging itself still); and its light, one spot down from the bulb through the shade's mouth, its shadows hard-edged,
 * there from the start (no light added after: rule 6) and lit or put out by its strength alone. Its frame: on the wall's face (z 0, the room
 * toward -z), x across the room, y down from the arm.
 */
const LAMP_ARM = 0.42, LAMP_CORD = 0.3
const LAMP_SHADE = new THREE.LatheGeometry([[0.104, -0.082], [0.098, -0.076], [0.06, -0.046], [0.024, -0.014], [0.017, 0]].map(([r, y]) => new THREE.Vector2(r, y)), 12)
const LAMP_SOCKET = new THREE.CylinderGeometry(0.019, 0.021, 0.034, 8, 1, true)
const LAMP_CORD_GEO = new THREE.CylinderGeometry(0.0035, 0.0035, LAMP_CORD, 5, 1, true)
const LAMP_ARM_GEO = new THREE.BoxGeometry(0.014, 0.014, LAMP_ARM)
const LAMP_BRACE_GEO = new THREE.BoxGeometry(0.01, 0.01, Math.hypot(0.22, 0.2))
const LAMP_BLOCK_GEO = new THREE.BoxGeometry(0.07, 0.09, 0.027)
const LAMP_IRON = new THREE.MeshToonMaterial({ color: '#26231f' })
const LAMP_WOOD = new THREE.MeshToonMaterial({ color: '#4a2f1c' })
const LAMP_ENAMEL = new THREE.MeshToonMaterial({ color: '#2f5040' })
/** a thin rod from `a` to `b` (its own frame), `r` thick, three sided */
function rod(a: THREE.Vector3, b: THREE.Vector3, r: number) {
  const g = new THREE.CylinderGeometry(r, r, a.distanceTo(b), 3, 1, true)
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()))
  const m = a.clone().add(b).multiplyScalar(0.5)
  g.translate(m.x, m.y, m.z)
  return g
}
// (the bulb, in the shade's frame (its top at 0, its mouth at -0.082): its neck up into the socket, its round glass (its foot 3 mm under the
// shade's mouth, as a bare bulb's shows under a shallow shade), the filament's zigzag across its middle, its two leads up to the neck)
const BULB_NECK = new THREE.CylinderGeometry(0.0105, 0.0125, 0.02, 8, 1, true)
const BULB_GLASS = (() => { const g = new THREE.IcosahedronGeometry(0.03, 1); g.scale(1, 1.08, 1); return g })()
const BULB_AT = -0.053
const FIL = [-0.0085, -0.0064, -0.0043, -0.0021, 0, 0.0021, 0.0043, 0.0064, 0.0085].map((x, i) => new THREE.Vector3(x, -0.044 - (i % 2) * 0.008, 0))
const BULB_FILAMENT = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(FIL, false, 'catmullrom', 0.2), 16, 0.0009, 3, false)
const BULB_LEADS = mergeGeometries([rod(new THREE.Vector3(-0.004, -0.014, 0), FIL[0], 0.0005), rod(new THREE.Vector3(0.004, -0.014, 0), FIL[8], 0.0005)])!
// (the pull cord: out of the socket's foot at its side, slanting out past the bulb's widest (4 mm clear of it) to where it hangs straight
// down, CORD_HANG to its bead under the shade's mouth; the bead a turned wooden acorn)
const CORD_TOP = new THREE.Vector3(0.019, -0.001, 0.004), CORD_BEND = new THREE.Vector3(0.0345, BULB_AT + 0.003, 0.006)
const CORD_HANG = 0.2
const PULL_TOP = rod(CORD_TOP, CORD_BEND, 0.0011)
const PULL_CORD = new THREE.CylinderGeometry(0.0011, 0.0011, 1, 4, 1, true)
const PULL_BEAD = new THREE.LatheGeometry([[0.0022, 0], [0.0066, -0.004], [0.0086, -0.011], [0.0076, -0.018], [0.0042, -0.022], [0.0016, -0.0235]].map(([r, y]) => new THREE.Vector2(r, y)), 8)
const PULL_HIT = new THREE.BoxGeometry(0.05, CORD_HANG + 0.05, 0.05)
const LAMP_COTTON = new THREE.MeshToonMaterial({ color: '#e7dfcb' })
const HIT_MAT = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
/** its shade's white inside (its back faces: the cone's own, seen from inside it), the glass, the filament, its glow: each this lamp's own,
 * set by how lit it is (its own pull switch, not the room's) */
const LAMP_INSIDE = new THREE.MeshBasicMaterial({ color: '#fff3dc', toneMapped: false, side: THREE.BackSide })
const BULB_GLASS_MAT = new THREE.MeshBasicMaterial({ color: '#f4f1ea', transparent: true, opacity: 0.2, depthWrite: false, toneMapped: false })
const BULB_FIL_MAT = new THREE.MeshBasicMaterial({ color: '#2c2420', toneMapped: false })
const LAMP_GLOW = new THREE.SpriteMaterial({ map: GLOW, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, color: '#ffd9a0', opacity: 0 })
const C_INSIDE_ON = new THREE.Color('#fff3dc'), C_INSIDE_OFF = new THREE.Color()
const C_GLASS_OFF = new THREE.Color('#f4f1ea'), C_GLASS_ON = new THREE.Color('#ffe0a4')
const C_FIL_OFF = new THREE.Color('#2c2420'), C_FIL_HOT = new THREE.Color('#ff7428'), C_FIL_ON = new THREE.Color('#fff2cc')
/** the bulb's light: its strength (candela) at full, how far it reaches (this frame's units: the floor 1.66 under it, the cone's far edge on
 * the floor 2.74 off), its cone's half angle (the shade's mouth: 0.104 out, 0.082 down) */
const BULB_CD = 30, BULB_REACH = 2.8, BULB_CONE = 0.92
/** the pull: how far down it's drawn and how long that takes, how long it's held there, how long it springs back; the bead's swing after */
const PULL_D = 0.028, PULL_DOWN = 0.09, PULL_HOLD = 0.04, PULL_BACK = 0.34, SWING = 0.24, SWING_T = 0.85, SWING_DIE = 2.2
const easeOutBack = (t: number) => { const c = 1.9; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2 }
const storeSays = () => ({ title: '儲藏室電燈', hint: lightOn(getLights(), 'store') ? '點一下拉線關燈' : '點一下拉線開燈' })
function StoreLamp({ at }: { at: [number, number, number] }) {
  const shadeY = -LAMP_CORD - 0.034
  /** the filament's height over the stock room's floor */
  const bulbY = at[1] + shadeY + BULB_AT + 0.004
  const light = useRef<THREE.SpotLight>(null)
  const aim = useRef<THREE.Object3D>(null)
  const swing = useRef<THREE.Group>(null)
  const cord = useRef<THREE.Mesh>(null)
  const bead = useRef<THREE.Mesh>(null)
  const glow = useRef<THREE.Sprite>(null)
  /** how lit it is (0 out .. 1 lit): a filament's quick to light, a little slower to die */
  const k = useRef(lightOn(getLights(), 'store') ? 1 : 0)
  /** the pull under way: its time, whether the switch has clicked yet; its bead under the pointer */
  const pull = useRef<{ t: number; clicked: boolean } | null>(null)
  const hover = useRef(false)
  // (its reach and its shadow's camera in the world's units: this frame's scale to the world's taken where it hangs)
  useLayoutEffect(() => {
    const l = light.current, a = aim.current
    if (!l || !a) return
    l.target = a
    const s = new THREE.Vector3()
    l.parent?.getWorldScale(s)
    const u = s.x || 1
    l.distance = BULB_REACH * u
    l.shadow.camera.near = 0.03 * u
    l.shadow.camera.far = BULB_REACH * u
    l.shadow.camera.updateProjectionMatrix()
    // (item 730) where it can light, in its own frame (the room's units, its cone straight down): its cone's widest within its reach, and
    // down to the earth round the shop (0.46 under the floor), out through the doorway and the stock room's open back and near end: while
    // none of this is in the view ShadowPacer leaves its map as it was (about 30 draws every third frame)
    const R = BULB_REACH * Math.sin(BULB_CONE), H = Math.min(BULB_REACH, bulbY - EARTH_Y)
    l.userData.litBox = new THREE.Box3(new THREE.Vector3(-R, -H, -R), new THREE.Vector3(R, 0.05, R))
  }, [bulbY])
  const shown = useRef(-1)
  useFrame((_, dt) => {
    const want = lightOn(getLights(), 'store') ? 1 : 0
    const was = k.current
    k.current += (want - k.current) * Math.min(1, tick(dt) * (want > k.current ? 24 : 9))
    if (Math.abs(k.current - want) < 0.002) k.current = want
    const night = typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark'
    const v = k.current, key = v + (night ? 10 : 0)
    if (key !== shown.current || was !== v) {
      shown.current = key
      // (the filament dark, through orange as it heats, to white; the glass warm round it; the shade's inside its own white lit, the room's
      // unlit grey out (a little under it); the glow round it by night more than by day)
      if (v < 0.35) BULB_FIL_MAT.color.copy(C_FIL_OFF).lerp(C_FIL_HOT, v / 0.35)
      else BULB_FIL_MAT.color.copy(C_FIL_HOT).lerp(C_FIL_ON, (v - 0.35) / 0.65)
      BULB_GLASS_MAT.color.copy(C_GLASS_OFF).lerp(C_GLASS_ON, v)
      BULB_GLASS_MAT.opacity = 0.2 + 0.32 * v
      C_INSIDE_OFF.set(unlitShade(night)).multiplyScalar(0.9)
      LAMP_INSIDE.color.copy(C_INSIDE_OFF).lerp(C_INSIDE_ON, v)
      LAMP_GLOW.opacity = v * (night ? 0.7 : 0.3)
      if (light.current) light.current.intensity = BULB_CD * v ** 1.6
    }
    // (the pull: drawn down, the click at the bottom, held a moment, sprung back past where it hung; the bead swinging after it, dying away)
    const p = pull.current
    let d = 0, ang = 0
    if (p) {
      p.t += tick(dt)
      const t = p.t
      if (t < PULL_DOWN) d = PULL_D * (t / PULL_DOWN) ** 2
      else if (t < PULL_DOWN + PULL_HOLD) d = PULL_D
      else if (t < PULL_DOWN + PULL_HOLD + PULL_BACK) d = PULL_D * (1 - easeOutBack((t - PULL_DOWN - PULL_HOLD) / PULL_BACK))
      if (!p.clicked && t >= PULL_DOWN) {
        p.clicked = true
        pressLightSwitch('store')
        lightSwitchSound(lightOn(getLights(), 'store'))
        if (hover.current) setTip(storeSays())
      }
      const ts = t - PULL_DOWN - PULL_HOLD
      if (ts > 0) ang = SWING * Math.exp(-ts * SWING_DIE) * Math.sin((2 * Math.PI * ts) / SWING_T)
      if (ts > 2.2) pull.current = null
    }
    if (cord.current) { cord.current.scale.y = CORD_HANG + d; cord.current.position.y = -(CORD_HANG + d) / 2 }
    if (bead.current) { bead.current.position.y = -(CORD_HANG + d); bead.current.scale.setScalar(hover.current ? 1.25 : 1) }
    if (swing.current) { swing.current.rotation.x = ang; swing.current.rotation.z = ang * 0.35 }
    if (glow.current) glow.current.visible = LAMP_GLOW.opacity > 0.002
  })
  const onPull = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (getEdit().on || pull.current) return; pull.current = { t: 0, clicked: false } }
  return (
    <group position={at}>
      <StaticBatch plain>
        {/* (its block on the wall, 2 mm into it (not in one plane with its face); the arm out from it; the brace from the wall under it up to
            the arm's middle) */}
        <mesh geometry={LAMP_BLOCK_GEO} material={LAMP_WOOD} position={[0, 0, -0.027 / 2 + 0.002]} />
        <mesh geometry={LAMP_ARM_GEO} material={LAMP_IRON} position={[0, 0, -0.025 - LAMP_ARM / 2]} />
        <mesh geometry={LAMP_BRACE_GEO} material={LAMP_IRON} position={[0, -0.1, -0.11]} rotation-x={Math.atan2(0.2, 0.22)} />
        {/* (the cord down from the arm's end, into the socket over the shade) */}
        <mesh geometry={LAMP_CORD_GEO} material={LAMP_IRON} position={[0, -LAMP_CORD / 2, -0.025 - LAMP_ARM + 0.012]} />
        <mesh geometry={LAMP_SOCKET} material={LAMP_IRON} position={[0, -LAMP_CORD - 0.017 + 0.004, -0.025 - LAMP_ARM + 0.012]} />
        <mesh geometry={LAMP_SHADE} material={LAMP_ENAMEL} position={[0, shadeY, -0.025 - LAMP_ARM + 0.012]} />
      </StaticBatch>
      <group position={[0, shadeY, -0.025 - LAMP_ARM + 0.012]}>
        <mesh geometry={LAMP_SHADE} material={LAMP_INSIDE} raycast={NO_RAY} />
        {/* the bulb: its neck, its filament and leads, its glass over them */}
        <mesh geometry={BULB_NECK} material={LAMP_IRON} position-y={-0.008} raycast={NO_RAY} />
        <mesh geometry={BULB_LEADS} material={LAMP_IRON} raycast={NO_RAY} />
        <mesh geometry={BULB_FILAMENT} material={BULB_FIL_MAT} raycast={NO_RAY} />
        <mesh geometry={BULB_GLASS} material={BULB_GLASS_MAT} position-y={BULB_AT} raycast={NO_RAY} />
        <sprite ref={glow} scale={0.55} position-y={BULB_AT} material={LAMP_GLOW} raycast={NO_RAY} />
        {/* its pull cord: the slant out past the bulb, then what hangs from there, swinging there (its bead and the box that's clicked) */}
        <mesh geometry={PULL_TOP} material={LAMP_COTTON} raycast={NO_RAY} />
        <group ref={swing} position={CORD_BEND.toArray()}>
          <mesh ref={cord} geometry={PULL_CORD} material={LAMP_COTTON} raycast={NO_RAY} />
          <mesh ref={bead} geometry={PULL_BEAD} material={LAMP_WOOD} raycast={NO_RAY} />
          <mesh geometry={PULL_HIT} material={HIT_MAT} position-y={-(CORD_HANG + 0.05) / 2 + 0.01} onClick={onPull}
            onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); if (getEdit().on) return; hover.current = true; handOver.onPointerOver(e as never); setTip(storeSays()) }}
            onPointerOut={(e: ThreeEvent<PointerEvent>) => { hover.current = false; handOver.onPointerOut(e as never); setTip(null) }} />
        </group>
        {/* its light: down through the shade's mouth from the filament, its shadows hard (a tungsten filament's as good as a point) */}
        <spotLight ref={light} position-y={BULB_AT + 0.004} angle={BULB_CONE} penumbra={0.18} decay={2} color="#ffc98e" intensity={lightOn(getLights(), 'store') ? BULB_CD : 0}
          castShadow={QUALITY.shadows} shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-radius={1} shadow-bias={0.0003} shadow-normalBias={0.05} />
        <object3D ref={aim} position-y={-1} />
      </group>
    </group>
  )
}
export function StoreRoom({ door, room, deep, fridges }: { door: [number, number]; room: [number, number]; deep: number; fridges: [number, number][] }) {
  const h = STORE.doorH, top = h + 0.3
  // (the fridges' openings framed as the doorway is (item 535, the owner's 「梁柱要留」: from the stock room the wall's hidden, and the fridges
  // stood in nothing, black boxes with no frame round them): a post at either side of each, a head over them all (its foot 3 mm under the
  // openings' tops, behind the fridges), each through the wall's thickness out of its back; the posts proud of its face on the shop's side as
  // the doorway's is, the head flush with it there (behind the plaster over the openings: the frieze over the fridges as it was); the doorway's
  // post against the first fridge's side is theirs too, carried up to their head)
  // (item 554, the owner's 「中間這塊拿掉」: no post between two fridges side by side (closer than a post's width): their backs one opening;
  // between two further apart, a post as before)
  // (item 562, the owner's 「高度沒對齊，要注意」: the head over the fridges stopped at the doorway's post, 33 cm over the doorway's own head
  // beside it, the two side by side at two heights: carried on over the doorway to the wall's end now, one head at one height and one
  // depth the whole stretch, the doorway's own head under it in its bay as its lintel)
  const frame = useMemo(() => {
    const ops = [...fridges].sort((p, q) => p[0] - q[0])
    if (!ops.length) return null
    const headY = FRIDGE.H + 0.012 - 0.003, headTop = FRIDGE.H + 0.012 + STORE_HEAD
    const posts: [number, number][] = []
    // (and where two stand side by side, the gap between their cabinets (3 cm) filled at their backs with a strip of their own black, as
    // built-in coolers are: open, the shop's light showed through it from the stock room in a bright line, and the stock room from the shop)
    const fillers: [number, number][] = []
    for (let i = 0; i < ops.length; i++) {
      // (before the first, unless the doorway's post is there already)
      if (i === 0 && Math.abs(ops[0][0] - (door[1] + STORE_POST)) > 0.02) posts.push([ops[0][0] - STORE_POST, ops[0][0]])
      const next = ops[i + 1]
      if (next && next[0] - ops[i][1] < STORE_POST) { fillers.push([ops[i][1] - 0.002, next[0] + 0.002]); continue }
      posts.push(next ? [(ops[i][1] + next[0]) / 2 - Math.max(STORE_POST, next[0] - ops[i][1]) / 2, (ops[i][1] + next[0]) / 2 + Math.max(STORE_POST, next[0] - ops[i][1]) / 2]
        : [ops[i][1], ops[i][1] + STORE_POST])
    }
    return { posts, fillers, headY, headTop, z0: Math.min(ops[0][0], door[0] - STORE_POST), z1: ops[ops.length - 1][1] + STORE_POST }
  }, [fridges, door])
  const [z0, z1] = room
  // (its far end the men's toilet's room's end wall (its outside, 4 mm on), as deep as that room; past it a short wall of its own on to the
  // back)
  const zE = z1 + 0.004
  const mid = (z0 + zE) / 2, len = zE - z0, dx = deep - WALL_OUT
  // (the doorway's whole stretch (item 467), its frame's posts against the wall's end and the fridge's side: the noren, its rod and their
  // brackets within the posts' outer sides (they reached 1 to 2 cm past them, into the fridge now it's beside), the head 2 mm in from them
  // (its ends not in one plane with the posts' sides))
  const outerW = door[1] - door[0] + 2 * STORE_POST, norenW = outerW - 0.012
  const noren = useRef<THREE.Group>(null)
  const whole = useRef<THREE.Group>(null)
  useFrame((_, dt0) => {
    // (swung aside as the stocker goes through, back into the room the way he's going, and settling back after him: a spring, a little
    // overshoot, each panel a little behind the other)
    const dt = Math.min(dt0, 0.05)
    const st = STORE_STATE as typeof STORE_STATE & { v?: number; a?: number }
    const want = st.passing > 0 ? 1 : 0
    st.v = ((st.v ?? 0) + ((want - st.push) * 60 - (st.v ?? 0) * 9) * dt)
    st.push += st.v * dt
    const g = noren.current
    if (!g) return
    g.children.forEach((p, i) => { p.rotation.z = st.push * (0.62 - i * 0.08) })
  })
  const hit = useMemo(() => {
    const hint = () => `只有倉儲員工進出｜後場最少：${lowestBack().slice(0, 3).map((id) => `${drinkLabel(id)} ${DRINK_BACK.back[id] ?? 0}`).join('、')}｜點一下打開飲料庫存`
    return {
      onClick: (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (getEdit().on) return; setDrinkPanel(true) },
      onPointerOver: (e: ThreeEvent<PointerEvent>) => { if (getEdit().on) return; handOver.onPointerOver({ ...e, eventObject: noren.current ?? e.eventObject }); setTip({ title: '儲藏室', hint: hint() }) },
      onPointerOut: (e: ThreeEvent<PointerEvent>) => { handOver.onPointerOut({ ...e, eventObject: noren.current ?? e.eventObject }); setTip(null) },
    }
  }, [])
  return (
    <group ref={whole}>
      <EditBlock>
      <StaticBatch plain>
        {/* (its own floor, the toilets' hinoki boards a hair over the shop's own floor run out behind the wall, taken away (item 710, the
            owner's 「地板有斷層」: from the shop's boards over the sill onto paler ones 3 mm up): the shop's floor runs on into it) */}
        {/* inside: its back wall; its far end in front of the men's room's end wall (6 mm off it) */}
        {/* (its back cut open as the toilets' rooms' are, seen through from outside (item 482, the owner's 「這邊要通透」: a solid back made it a
            blank grey box from behind the shop, the stocker and the stock out of sight): one face, turned in, nothing behind it) */}
        <WcWall len={len} at={[deep, 0, mid]} yaw={-Math.PI / 2} top={top} cut />
        {/* (its near end, by the wall's start, taken away (item 488, the owner's 「這面牆拿掉」: past the side wall's end it stood alone, a panel
            of cedar and plaster beside the doorway, from the room and from outside); the far end, in front of the men's room's end wall) */}
        {/* (6 mm in front of that wall's plaster, 4 mm clear of its corner post's face (item 503, the owner's 「紅圈處理」: 2 mm off it stood
            in one plane with the men's room's dark corner post, itself 2 mm proud of that plaster (item 425), and the post showed through the
            stock room's plaster as a dark strip up its far corner)) */}
        <WcWall len={dx} at={[(WALL_OUT + deep) / 2, 0, zE - 0.006]} yaw={Math.PI} top={top} />
        {/* outside: the short end's body past the men's room (its back open, item 482) */}
        {/* (casting: with the men's room's end, the bulb's light stopped at the far end, item 730) */}
        <WcMass x={[WC_ROOM.D + WC_T + 0.002, deep]} y={[0, top]} z={[zE, zE + WC_T]} cast />
        {/* (no slatted ceiling on its caps (item 498, the owner's 「倉庫不用這個」): it's open over, the stock seen from above) */}
        {/* (a dark post at its far back corner, the open back's edge; the near one went with the near end) */}
        {[zE + WC_T].map((z) => (
          // (4 mm proud of the end walls' backs: not in one plane with them)
          <mesh key={z} position={[deep - WC_T / 2 + 0.004, top / 2, z - 0.015]}><boxGeometry args={[WC_T, top, 0.034]} /><meshToonMaterial color="#2e1c10" /></mesh>
        ))}
        {/* the doorway's frame: the head over the doorway out to the wall's end, the wall over it carrying it. Its posts taken away (item 709,
            the owner's 「紅圈與紅框部份的柱子拿掉」: the one against the fridge's side, up to the fridges' head, and its sill across the foot,
            the one at the wall's end before it (item 503)); and the fridges' openings' posts (item 535), the one past the last fridge by the
            koi's wall with them: the head over all of it as it was */}
        {/* the fridges' openings' head (item 535) */}
        {frame && (
          <mesh position={[(WALL_OUT + 0.004 + 0.002) / 2, (frame.headY + frame.headTop) / 2, (frame.z0 + frame.z1) / 2]}>
            <boxGeometry args={[WALL_OUT + 0.004 - 0.002, frame.headTop - frame.headY, frame.z1 - frame.z0 - 0.004]} /><meshToonMaterial color="#35200f" />
          </mesh>
        )}
        {/* (its back as deep in the stock room as the head over it and the posts (item 562): it stopped 4 mm short of them) */}
        <mesh position={[(WALL_OUT + 0.004 - 0.035) / 2, h + STORE_HEAD / 2, (door[0] + door[1]) / 2]}><boxGeometry args={[WALL_OUT + 0.004 + 0.035, STORE_HEAD, outerW - 0.004]} /><meshToonMaterial color="#35200f" /></mesh>
        {/* (and over it, up to the head over the whole stretch (item 562), a small wall (小壁) of the room's plaster, as a framed wall has: the
            shop's wall over the doorway is drawn from the shop's side only, and from the stock room the head and the lintel were two bars
            across nothing, the shop seen between them; in the wall's thickness, 4 mm in from either face, a millimetre into the lintel,
            the head and the post) */}
        {frame && (
          <mesh position={[WALL_OUT / 2, (h + STORE_HEAD + frame.headY) / 2, (door[0] - STORE_POST + 0.004 + door[1] + 0.001) / 2]}>
            <boxGeometry args={[WALL_OUT - 0.008, frame.headY - h - STORE_HEAD + 0.002, door[1] + 0.001 - (door[0] - STORE_POST + 0.004)]} /><meshToonMaterial color="#ece0c6" />
          </mesh>
        )}
        {/* (the strip between two fridges side by side (item 554), 3 mm proud of their backs toward the stock room, 4.5 cm into the gap) */}
        {frame?.fillers.map(([a, b]) => (
          <mesh key={`ff${a}`} position={[-FRIDGE_GAP + 0.003 - 0.024, FRIDGE.H / 2, (a + b) / 2]}><boxGeometry args={[0.048, FRIDGE.H, b - a]} /><meshToonMaterial color="#1d1e21" /></mesh>
        ))}
        {/* (the noren's rod on its two brackets taken away (item 709, the owner's red box): the noren hangs where it did, from the rod in its
            top band's sleeve, out of sight) */}
      </StaticBatch>
      </EditBlock>
      {/* the noren: its two panels hung from the rod, each its half of the one picture, a slit between; swung aside as the stocker goes
          through (not merged: it moves) */}
      <group ref={noren} name="look-store" position={[-0.05, h + STORE_HEAD - 0.02, (door[0] + door[1]) / 2]}>
        {[-1, 1].map((sd) => <StoreNorenPanel key={sd} sd={sd} wide={norenW} />)}
      </group>
      {/* (its lamp, on a bracket from the top of its far end wall, over the stock (item 713)) */}
      <StoreLamp at={[(WALL_OUT + deep) / 2, top - 0.1, zE - 0.006]} />
      {/* the doorway as one thing to point at: what's in there and what's lowest, a click opens the drinks' stock */}
      <mesh position={[-0.06, (h + STORE_HEAD) / 2, (door[0] + door[1]) / 2]} rotation-y={-Math.PI / 2} {...hit}>
        <planeGeometry args={[door[1] - door[0] + 2 * STORE_POST, h + STORE_HEAD]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
/** one of the stock room noren's two panels: its half of the picture, hung from the rod (its top), a slit between the two */
function StoreNorenPanel({ sd, wide }: { sd: number; wide: number }) {
  const geo = useMemo(() => {
    const w = (wide - 0.008) / 2
    const g = new THREE.PlaneGeometry(w, STORE_NOREN_L)
    const u0 = sd < 0 ? 0 : 1 - w / wide, u1 = u0 + w / wide
    const uv = g.attributes.uv as THREE.BufferAttribute
    for (let k = 0; k < uv.count; k++) uv.setX(k, u0 + uv.getX(k) * (u1 - u0))
    // (hung from its top: the cloth below the rod)
    g.translate(0, -STORE_NOREN_L / 2 + 0.012, 0)
    return { g, z: sd * (0.008 + w) / 2 }
  }, [sd, wide])
  useEffect(() => () => geo.g.dispose(), [geo])
  // (in the doorway's plane, its face to the room: seen from the room the picture reads right)
  return (
    <group position-z={geo.z}>
      <mesh geometry={geo.g} rotation-y={-Math.PI / 2} material={storeNorenMat(wide)} />
    </group>
  )
}
