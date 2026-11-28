import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { StaticBatch } from '@/scene/render/StaticBatch'
import { SIGN_FONT } from '@/scene/props/signFont'
import { STORE, STORE_STATE, WALL_OUT, FRIDGE_GAP, FRIDGE, handOver, nameOver, WC_ROOM, BACK_TOP } from '@/shops/grill/bar'
import { EditBlock, Movable } from '@/shops/grill/editor/Movable'
import { PatternMat } from '@/scene/props/PatternMat'
import { getEdit } from '@/shops/grill/edit'
import { setTip } from '@/scene/interact/hoverTip'
import { canvasTex, WALL_H, BASE_DEPTH } from './base'
import { WcWall, WC_T, WcMass, WC_CAP } from './wc'
import { NO_RAY } from '@/scene/interact/pickable'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { unlitShade, lightOn } from '@/game/world/roomLights'
import { getLights, pressLightSwitch } from '@/scene/render/lightsStore'
import { QUALITY } from '@/scene/render/quality'
import { tick } from '@/scene/kit/speed'
import { lightSwitchSound } from '@/shops/grill/sounds/restroomSound'
import { EARTH_Y } from '@/shops/grill/guestbar/ground'
import { pointsEach } from './shrine'
import { GLOW } from './shrine'

/** the stock room's doorway's frame (items 430): its posts' width in the wall's line, its head's height over the opening */
export const STORE_POST = STORE.post, STORE_HEAD = 0.07
/** the stock room's noren: as wide as the frame's posts' outer sides (the doorway's as laid out, item 467), and how long (item 781, the
 * owner's 「簾子長一些，最少要一半以上」: 0.6, a half-noren to the stocker's shoulders, a third of the doorway; 1.15 a mid-length one, its hem
 * 0.76 over the floor, six tenths of the opening behind it, the crates in there still seen under it) */
const STORE_NOREN_L = 1.15
/**
 * The stock room's noren (item 430, the owner's 「這邊挖空並加上掛簾，後面是小儲藏室，倉儲員工專用」): indigo cotton, the shop's back rooms'
 * plain kind: its top band darker where it's sewn over the rod; across its middle, where its two panels part, a white ring round 倉 (the
 * store), and under it in small spaced capitals STAFF ONLY; a white line along its hem; the cotton's weave. One picture over both panels.
 */
const storeNoren = (wide: number) => {
  // (as many pixels a metre as keep both its width and its length within 1024: a picture past that is halved as it's uploaded)
  const PX = Math.min(1024 / wide, 1024 / STORE_NOREN_L), W = Math.round(wide * PX), H = Math.round(STORE_NOREN_L * PX)
  return canvasTex(W, H, (g) => {
    const cloth = '#1f2f52'
    const band = Math.round(0.034 * PX)
    g.save()
    g.fillStyle = cloth; g.fillRect(0, 0, W, H)
    g.globalAlpha = 0.06
    g.fillStyle = '#ffffff'
    for (let x = 0; x < W; x += 3) g.fillRect(x, 0, 1, H)
    g.fillStyle = '#000000'
    for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1)
    g.globalAlpha = 1
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, 0, W, band)
    g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(0, band, W, 3)
    // (the ring and the character in it, as large as they were (drawn for 1024 across 0.648), at a person's eyes: 0.34 under its top)
    const k = W / 1024
    g.translate(W / 2, Math.round(0.34 * PX)); g.scale(k, k)
    g.strokeStyle = '#efe9dc'; g.lineWidth = 16
    g.beginPath(); g.arc(0, 0, 150, 0, Math.PI * 2); g.stroke()
    g.fillStyle = '#efe9dc'; g.textAlign = 'center'; g.textBaseline = 'middle'
    g.font = `700 200px ${SIGN_FONT}`
    g.fillText('倉', 0, 8)
    g.font = '700 46px "Arial Black", sans-serif'
    ;(g as unknown as { letterSpacing: string }).letterSpacing = '14px'
    g.fillText('STAFF ONLY', 0, 232)
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.fillRect(0, H - Math.round(0.022 * PX), W, Math.max(3, Math.round(5 * k)))
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
/**
 * The glow at its mouth (item 761, the owner's 「且光的方向要真實」: a round glow all about the bulb lit the wall over the shade too, which
 * a shade keeps dark): under the shade's rim only, brightest at the mouth and fading down and out, nothing over it (a sprite's up is the
 * screen's: the shade seen from the side or from a little over it, its glow under it)
 */
const MOUTH_GLOW = (() => {
  if (typeof document === 'undefined') return null
  const N = 128, c = document.createElement('canvas')
  c.width = c.height = N
  const g = c.getContext('2d')!
  const img = g.createImageData(N, N)
  // (its middle the mouth, a little up the picture: the light falls from there)
  const cx = N / 2, cy = N * 0.38
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = (x - cx) / (N * 0.5), dy = (y - cy) / (N * 0.62)
    const r = Math.hypot(dx * 1.15, dy)
    // (over the mouth's line, cut off within a few pixels: the shade's own)
    const below = Math.min(1, Math.max(0, (y - cy + 3) / 9))
    const a = Math.max(0, 1 - r) ** 2.2 * below
    const i = (y * N + x) * 4
    img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = Math.round(a * 255)
  }
  g.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
})()
const LAMP_GLOW = new THREE.SpriteMaterial({ map: MOUTH_GLOW ?? GLOW, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, color: '#ffd9a0', opacity: 0 })
const C_INSIDE_ON = new THREE.Color('#fff3dc'), C_INSIDE_OFF = new THREE.Color()
const C_GLASS_OFF = new THREE.Color('#f4f1ea'), C_GLASS_ON = new THREE.Color('#ffe0a4')
const C_FIL_OFF = new THREE.Color('#2c2420'), C_FIL_HOT = new THREE.Color('#ff7428'), C_FIL_ON = new THREE.Color('#fff2cc')
/** the bulb's light: its strength (candela) at full, how far it reaches (this frame's units: the floor 1.66 under it, the cone's far edge on
 * the floor 2.74 off), its cone's half angle (the shade's mouth: 0.104 out, 0.082 down) */
const BULB_CD = 13, BULB_REACH = 2.8, BULB_CONE = 0.92
/** how much of its cone's edge fades out (item 761, the owner's 「可以的話，再揉一些」: 0.18, a hard rim to its pool; 0.6 then) (item 775, the
 * owner's 「這邊不太真」 at that: with 0.6 of the cone fading in, the wall under the shade lay dark and the pool brightest far down it, white
 * and flat at 30 cd: as a bulb's glass (3 cm round, 10 cm in from the shade's rim) blurs the rim's cut, 0.28, and 13 cd: the wall brightest
 * just inside the pool's soft top, darker down it, as near a wall a lamp lights it) */
const BULB_SOFT = 0.28
/** the pull: how far down it's drawn and how long that takes, how long it's held there, how long it springs back; the bead's swing after */
const PULL_D = 0.028, PULL_DOWN = 0.09, PULL_HOLD = 0.04, PULL_BACK = 0.34, SWING = 0.24, SWING_T = 0.85, SWING_DIE = 2.2
const easeOutBack = (t: number) => { const c = 1.9; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2 }
/**
 * (item 776, the owner's 「然後燈打開可以看到一些塵埃在燈那邊飄」) dust in the bulb's light: specks drifting slow in the air under it, seen only
 * where its light falls on them (its cone, brightest near the bulb, gone past its edge), each catching it now and then as it turns (a
 * twinkle); the warm air over the bulb lifting those near it a little, the rest settling slower than they drift. Gone with the light. One draw,
 * the shrine's motes' kind of points (its program: shrine's pointsEach, a size and a see-through of each speck's own), a soft speck for the
 * star; made with the room, never new while the shop's open
 */
const DUSTS = 84
/** how deep under the bulb they drift (this frame's units), and how far out from its axis (inside its cone, at most) */
const DUST_DEEP = [0.05, 0.78] as const, DUST_OUT = 0.34
/** each speck's size on the screen (CSS pixels, most of them the small end): a point of light whatever how far it is (as a speck in a beam
 * is to the eye, far smaller than it shows), up close no smaller than its own size (`Speck.size`) would draw it; and how far off (world)
 * they've faded to half, gone from the whole shop's view */
const DUST_PX = [3.4, 7] as const, DUST_FAR = 3.2
const DUST_DOT = (() => {
  if (typeof document === 'undefined') return null
  const N = 32, c = document.createElement('canvas')
  c.width = c.height = N
  const g = c.getContext('2d')!
  const img = g.createImageData(N, N)
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const r = Math.hypot(x - 15.5, y - 15.5) / 16
    // (a round core half the dot across, a faint glow round it: drawn a few pixels wide, its middle still lit)
    const a = Math.min(1, Math.exp(-((r / 0.42) ** 2)) + Math.exp(-((r / 0.8) ** 2)) * 0.2) * Math.max(0, 1 - r ** 8)
    const i = (y * N + x) * 4
    img.data[i] = 255; img.data[i + 1] = 246; img.data[i + 2] = 226; img.data[i + 3] = Math.round(a * 255)
  }
  g.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  // (drawn a few pixels wide: a mip-map's the dot averaged with the dark round it, faint; read straight it keeps its lit core)
  t.generateMipmaps = false
  t.minFilter = THREE.LinearFilter
  return t
})()
type Speck = { x: number; y: number; z: number; age: number; seed: number; size: number; px: number; tw: number }
const DUST_V = new THREE.Vector3()
const dustRnd = (() => { let s = 7761; return () => ((s = (s * 16807) % 2147483647) / 2147483647) })()
/** a speck put somewhere in the light (more of them nearer the bulb), fresh */
function speckAt(p: Speck) {
  const h = DUST_DEEP[0] + (DUST_DEEP[1] - DUST_DEEP[0]) * dustRnd() ** 1.5
  const out = Math.min(DUST_OUT, Math.tan(BULB_CONE) * h * 0.92) * Math.sqrt(dustRnd()), a = dustRnd() * Math.PI * 2
  p.x = Math.cos(a) * out; p.y = BULB_AT - h; p.z = Math.sin(a) * out; p.age = 0
  return p
}
function StoreDust({ k }: { k: React.MutableRefObject<number> }) {
  const pts = useRef<THREE.Points>(null)
  const specks = useMemo(() => Array.from({ length: DUSTS }, (_, i) => {
    const p = speckAt({ x: 0, y: 0, z: 0, age: 0, seed: i * 1.37 + dustRnd() * 6, size: 0, px: 0, tw: 1.2 + dustRnd() * 3.5 })
    p.age = 2 + dustRnd() * 3
    p.size = 0.006 + dustRnd() ** 2 * 0.01
    p.px = DUST_PX[0] + (DUST_PX[1] - DUST_PX[0]) * dustRnd() ** 2.5
    return p
  }), [])
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DUSTS * 3), 3))
    g.setAttribute('size', new THREE.BufferAttribute(new Float32Array(DUSTS), 1))
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(DUSTS * 3).fill(1), 3))
    g.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(DUSTS), 1))
    // (where they can be, fixed: culled with it while the stock room's out of the view, never measured again as they move)
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, BULB_AT - (DUST_DEEP[0] + DUST_DEEP[1]) / 2, 0), Math.hypot(DUST_OUT * 1.1, (DUST_DEEP[1] - DUST_DEEP[0]) / 2 + 0.03))
    return g
  }, [])
  useEffect(() => () => geo.dispose(), [geo])
  const tanCone = Math.tan(BULB_CONE)
  useFrame(({ clock, camera, size, viewport }, dt0) => {
    const o = pts.current
    if (!o) return
    const lit = k.current
    o.visible = lit > 0.01
    if (!o.visible) return
    const dt = Math.min(0.05, tick(dt0)), t = clock.elapsedTime
    const pos = geo.attributes.position as THREE.BufferAttribute, al = geo.attributes.alpha as THREE.BufferAttribute, sz = geo.attributes.size as THREE.BufferAttribute
    // (a speck's size is the world's, drawn size * (half the view's CSS height) / depth device pixels: a pixel size back to the world's)
    const perPx = (viewport.dpr * 2) / Math.max(1, size.height)
    for (let i = 0; i < DUSTS; i++) {
      const p = specks[i], h = BULB_AT - p.y
      // (drifting each its own slow way, a few millimetres a second; lifted over the bulb, settling elsewhere)
      const lift = h < 0.2 ? 0.006 * (1 - h / 0.2) : -0.0025
      p.x += (Math.sin(t * 0.37 + p.seed) * 0.011 + Math.sin(t * 0.91 + p.seed * 2.3) * 0.004) * dt
      p.z += (Math.cos(t * 0.43 + p.seed * 1.7) * 0.011 + Math.cos(t * 0.77 + p.seed * 0.6) * 0.004) * dt
      p.y += (lift + Math.sin(t * 0.29 + p.seed * 3.1) * 0.005) * dt
      p.age += dt
      const r = Math.hypot(p.x, p.z), edge = Math.min(DUST_OUT, tanCone * Math.max(0, h))
      if (h < DUST_DEEP[0] * 0.6 || h > DUST_DEEP[1] || r > edge * 1.08) speckAt(p)
      // (seen as the light falls on it: inside the cone, fading at its edge; the nearer the bulb the brighter; a glint as it turns; in
      // over a second when it's put somewhere new)
      const inCone = 1 - Math.min(1, Math.max(0, (r / Math.max(1e-3, edge) - 0.72) / 0.36))
      const near = 1 / (1 + (Math.max(0, h) / 0.6) ** 2)
      const glint = 0.42 + 0.58 * (0.5 + 0.5 * Math.sin(t * p.tw + p.seed * 5)) ** 3
      const depth = Math.max(0.05, -DUST_V.set(p.x, p.y, p.z).applyMatrix4(o.matrixWorld).applyMatrix4(camera.matrixWorldInverse).z)
      al.setX(i, lit * inCone * near * glint * Math.min(1, p.age / 1.2) / (1 + (depth / DUST_FAR) ** 2))
      pos.setXYZ(i, p.x, p.y, p.z)
      sz.setX(i, Math.max(p.size, p.px * perPx * depth))
    }
    pos.needsUpdate = true; al.needsUpdate = true; sz.needsUpdate = true
  })
  return (
    <points ref={pts} geometry={geo} renderOrder={4} raycast={NO_RAY}>
      <pointsMaterial map={DUST_DOT} vertexColors color="#ffe7c2" size={1} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} onBeforeCompile={pointsEach} />
    </points>
  )
}
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
        {/* (its centre (the picture's mouth, 38% down it) at the shade's mouth, a little under the bulb) */}
        <sprite ref={glow} scale={0.5} position-y={BULB_AT - 0.012 - 0.5 * (0.5 - 0.38)} material={LAMP_GLOW} raycast={NO_RAY} />
        {/* its pull cord: the slant out past the bulb, then what hangs from there, swinging there (its bead and the box that's clicked) */}
        <mesh geometry={PULL_TOP} material={LAMP_COTTON} raycast={NO_RAY} />
        <group ref={swing} position={CORD_BEND.toArray()}>
          <mesh ref={cord} geometry={PULL_CORD} material={LAMP_COTTON} raycast={NO_RAY} />
          <mesh ref={bead} geometry={PULL_BEAD} material={LAMP_WOOD} raycast={NO_RAY} />
          <mesh geometry={PULL_HIT} material={HIT_MAT} position-y={-(CORD_HANG + 0.05) / 2 + 0.01} onClick={onPull}
            onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); if (getEdit().on) return; hover.current = true; handOver.onPointerOver(e as never); setTip(storeSays()) }}
            onPointerOut={(e: ThreeEvent<PointerEvent>) => { hover.current = false; handOver.onPointerOut(e as never); setTip(null) }} />
        </group>
        {/* (item 776) the dust drifting in its light */}
        <StoreDust k={k} />
        {/* its light: down through the shade's mouth from the filament, its shadows hard (a tungsten filament's as good as a point) */}
        <spotLight ref={light} position-y={BULB_AT + 0.004} angle={BULB_CONE} penumbra={BULB_SOFT} decay={2} color="#ffc98e" intensity={lightOn(getLights(), 'store') ? BULB_CD : 0}
          castShadow={QUALITY.shadows} shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-radius={1} shadow-bias={0.0003} shadow-normalBias={0.05} />
        <object3D ref={aim} position-y={-1} />
      </group>
    </group>
  )
}
/**
 * The stock room's floor (item 739, the owner's 「儲藏室的地板要稍微鋪個材質，你覺得甚麼好?」, answered: a mortar floor, 土間): a back room's
 * floor in a real izakaya, cement, as the crates are dragged over it and it's hosed down; grey, the trowel's sweeps faint in it, its grit,
 * a damp stain or two where the crates stand by the back wall, a control joint across it every so often and the dirt along the walls' feet.
 * Laid on the shop's boards that run on into it (item 710: no step up), from the wall's line on the shop's side to the back wall, so the shop's
 * wood stops at the doorway. Across its width (u) from the wall to the back wall, along its length (v) from the far end to the wall's start.
 */
const STORE_FLOOR = canvasTex(256, 1024, (g) => {
  let s = 7331
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  g.fillStyle = '#8c8881'; g.fillRect(0, 0, 256, 1024)
  // (soft mottling, lighter and darker, as a cement floor dries unevenly)
  for (let i = 0; i < 150; i++) {
    const x = rnd() * 256, y = rnd() * 1024, r = 16 + rnd() * 56, dark = rnd() < 0.5
    const gr = g.createRadialGradient(x, y, 0, x, y, r)
    gr.addColorStop(0, dark ? 'rgba(58,54,48,0.11)' : 'rgba(206,202,194,0.10)'); gr.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r)
  }
  // (the trowel's sweeps: faint arcs, a little lighter or darker)
  g.lineCap = 'round'
  for (let i = 0; i < 30; i++) {
    const x = rnd() * 256, y = rnd() * 1024, r = 34 + rnd() * 70, a = rnd() * Math.PI * 2
    g.lineWidth = 4 + rnd() * 6
    g.strokeStyle = rnd() < 0.55 ? 'rgba(214,210,202,0.08)' : 'rgba(66,62,56,0.07)'
    g.beginPath(); g.arc(x, y, r, a, a + 0.8 + rnd() * 0.9); g.stroke()
  }
  // (its grit)
  for (let i = 0; i < 6000; i++) {
    const x = rnd() * 256, y = rnd() * 1024
    g.fillStyle = rnd() < 0.5 ? `rgba(52,49,45,${0.16 + 0.22 * rnd()})` : `rgba(218,215,208,${0.14 + 0.2 * rnd()})`
    g.fillRect(x, y, 1, 1)
  }
  // (damp where the crates stand, along the back wall toward the far end: darker, soft edged)
  for (const [x, y, r] of [[212, 760, 70], [200, 905, 58], [222, 600, 44], [190, 470, 36]]) {
    const gr = g.createRadialGradient(x, y, r * 0.2, x, y, r)
    gr.addColorStop(0, 'rgba(48,46,42,0.26)'); gr.addColorStop(0.7, 'rgba(48,46,42,0.12)'); gr.addColorStop(1, 'rgba(48,46,42,0)')
    g.fillStyle = gr; g.fillRect(x - r, y - r * 1.4, 2 * r, 2.8 * r)
  }
  // (control joints across it, a groove with its lit edge)
  for (const y of [340, 690]) {
    g.fillStyle = 'rgba(44,42,38,0.55)'; g.fillRect(0, y, 256, 2)
    g.fillStyle = 'rgba(220,216,208,0.22)'; g.fillRect(0, y + 2, 256, 1)
  }
  // (dirt along the walls' feet, both long sides)
  for (const [x0, x1] of [[0, 22], [256, 234]]) {
    const gr = g.createLinearGradient(x0, 0, x1, 0)
    gr.addColorStop(0, 'rgba(40,38,34,0.30)'); gr.addColorStop(1, 'rgba(40,38,34,0)')
    g.fillStyle = gr; g.fillRect(Math.min(x0, x1), 0, 22, 1024)
  }
})
/** an unseen sheet over the wall's face on the shop's side that takes the pointer and stops it there (item 735: the goods behind the wall,
 * pointed at now, aren't pointed at through it; as the toilets' walls do, WcBlock) */
const STORE_BLOCK_MAT = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
/**
 * (item 754, the owner's 「注意光影不透出來」, a red ring round the earth lit out behind the stock room at night) its lamp kept in it: its back
 * cut open to be seen into from outside, and its near end taken away (item 488), one-sided faces that stop no light (a shadow's map is
 * drawn from the backs of what's one-sided), the bulb lit the earth out behind it and its plinth through where its walls stand. A closed
 * slab where each stands, from the earth up to its walls' tops, drawn into the shadows' maps only (no colour, no depth: unseen, never in
 * the way of the view in); the bulb's map only (`userData.sunless`: left out of the sun's, app/sceneParts' ShadowPacer: the near end has
 * no wall to cast the sun's shadow by day)
 */
const STORE_SHADE_MAT = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })
/** how far the mat before its doorway reaches out into the shop (item 756) */
const STORE_MAT_D = 0.42
/** where its far end wall begins, out from the shop's wall's face (item 762): just behind the fridges' backs */
const END_IN = -FRIDGE_GAP + 0.006
const stopHere = (e: { stopPropagation: () => void }) => e.stopPropagation()
export function StoreRoom({ door, room, deep, fridges }: { door: [number, number]; room: [number, number]; deep: number; fridges: [number, number][] }) {
  // (its walls' tops: their caps level with the head over the fridges (item 745): 0.3 over its doorway's height before, 10 cm under it)
  const h = STORE.doorH, top = BACK_TOP - WC_CAP
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
    const headY = FRIDGE.H + 0.012 - 0.003, headTop = BACK_TOP
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
  const mid = (z0 + zE) / 2, len = zE - z0
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
    // (item 781: bent, not swung stiff as a board: over his shoulder tilted aside, under it hanging down over him)
    g.children.forEach((p, i) => { const m = p.children[0] as THREE.Mesh | undefined; if (m) bendNoren(m.geometry, st.push * (0.62 - i * 0.08)) })
  })
  // (the small wall over the doorway and the fridges (item 762): its outline across them, the doorway's stretch from over its lintel, the
  // fridges' from the doorway's height (their lintel gone), up to the head; through the wall's thickness, 4 mm in from either face)
  const smallWall = useMemo(() => {
    if (!frame) return null
    const za = door[0] - STORE_POST + 0.004, zb = door[1] + STORE_POST, zc = frame.z1 - 0.004
    const ya = h + STORE_HEAD - 0.001, yb = h - 0.001, yt = frame.headY + 0.001
    const x0 = Math.max(0.004, -FRIDGE_GAP + 0.002), x1 = WALL_OUT - 0.004
    const sh = new THREE.Shape([new THREE.Vector2(za, ya), new THREE.Vector2(zb, ya), new THREE.Vector2(zb, yb), new THREE.Vector2(zc, yb),
      new THREE.Vector2(zc, yt), new THREE.Vector2(za, yt)])
    // (drawn in its z-y plane, carried through the wall along its x: turned a quarter so the shape's x is the room's z, its depth the room's x)
    const g = new THREE.ExtrudeGeometry(sh, { depth: x1 - x0, bevelEnabled: false })
    g.rotateY(-Math.PI / 2).translate(x1, 0, 0)
    return g
  }, [frame, door, h])
  useEffect(() => () => smallWall?.dispose(), [smallWall])
  // (its noren only named now, nothing to do with it (item 735, the owner's 「應該是點擊貨物而非門簾」): the goods in there open the drinks'
  // stock, pointed at themselves (ShopProps' StockHit); it lit and opened the stock, the doorway as one thing to point at (item 430))
  const hit = useMemo(() => nameOver('儲藏室', '只有倉儲員工進出｜點裡面的貨看飲料庫存'), [])
  // (the unseen slabs (item 754), the back's and the near end's, one mesh: one draw in the view (nothing written there) and one in the bulb's
  // shadow map; its userData kept from one redraw to the next)
  const shadeGeo = useMemo(() => {
    const back = new THREE.BoxGeometry(0.06, top + BASE_DEPTH, len + 0.06).translate(deep + 0.031, (top - BASE_DEPTH) / 2, mid)
    const end = new THREE.BoxGeometry(deep + 0.061 - WALL_OUT, top + BASE_DEPTH, 0.06).translate((WALL_OUT + deep + 0.061) / 2, (top - BASE_DEPTH) / 2, z0 - 0.064)
    const g = mergeGeometries([back, end])
    back.dispose(); end.dispose()
    return g
  }, [top, len, deep, mid, z0])
  useEffect(() => () => shadeGeo.dispose(), [shadeGeo])
  const shadeData = useMemo(() => ({ noWorld: true, sunless: true }), [])
  return (
    <group ref={whole}>
      <EditBlock>
      <StaticBatch plain>
        {/* (its own floor, the toilets' hinoki boards a hair over the shop's own floor run out behind the wall, taken away (item 710, the
            owner's 「地板有斷層」: from the shop's boards over the sill onto paler ones 3 mm up): the shop's floor runs on into it) */}
        {/* inside: its back wall; its far end in front of the men's room's end wall (6 mm off it) */}
        {/* (its back cut open as the toilets' rooms' are, seen through from outside (item 482, the owner's 「這邊要通透」: a solid back made it a
            blank grey box from behind the shop, the stocker and the stock out of sight): one face, turned in, nothing behind it) */}
        <WcWall len={len} at={[deep, 0, mid]} yaw={-Math.PI / 2} top={top} cut soft />
        {/* (its near end, by the wall's start, taken away (item 488, the owner's 「這面牆拿掉」: past the side wall's end it stood alone, a panel
            of cedar and plaster beside the doorway, from the room and from outside); the far end, in front of the men's room's end wall) */}
        {/* (6 mm in front of that wall's plaster, 4 mm clear of its corner post's face (item 503, the owner's 「紅圈處理」: 2 mm off it stood
            in one plane with the men's room's dark corner post, itself 2 mm proud of that plaster (item 425), and the post showed through the
            stock room's plaster as a dark strip up its far corner)) */}
        {/* (and from the fridges' backs, through the shop's wall's thickness (item 762, the owner's 「這邊要補齊」: it began at the wall's outer
            face, and with that wall hidden (seen from outside) a slot 20 cm wide stood open between it and the fridges, the men's room seen
            through it, a dark strip from the floor up); 1.6 cm clear of the last fridge's side) */}
        <WcWall len={deep - END_IN} at={[(END_IN + deep) / 2, 0, zE - 0.006]} yaw={Math.PI} top={top} soft />
        {/* outside: the short end's body past the men's room (its back open, item 482) */}
        {/* (casting: with the men's room's end, the bulb's light stopped at the far end, item 730) */}
        <WcMass x={[WC_ROOM.D + WC_T + 0.002, deep]} y={[0, top]} z={[zE, zE + WC_T]} cast />
        {/* (no slatted ceiling on its caps (item 498, the owner's 「倉庫不用這個」): it's open over, the stock seen from above) */}
        {/* (no dark post at its far back corner (item 760, the owner's 「注意這條線」, a shot from over the back: beside the men's room's own
            corner post, a second dark line from the top to the floor with a sliver of the end's outside between them): the end's body's own
            corner there, cream over its cedar; the near one went with the near end (item 488)) */}
        {/* the doorway's frame: the head over the doorway out to the wall's end, the wall over it carrying it. Its posts taken away (item 709,
            the owner's 「紅圈與紅框部份的柱子拿掉」: the one against the fridge's side, up to the fridges' head, and its sill across the foot,
            the one at the wall's end before it (item 503)); and the fridges' openings' posts (item 535), the one past the last fridge by the
            koi's wall with them: the head over all of it as it was */}
        {/* (the doorway's post at the wall's start (item 738, the owner's 「上方的梁柱跟旁邊的柱也得補上」: the head and the lintel ended in
            the air there, nothing under them, since item 503 took the post that was (from the shop it stood proud of the wall's face, and
            the owner had it out)): from the floor up into the head, in the wall's thickness, its shop's face 2 mm behind the wall's line
            (not proud now), its stock room's face 2 mm proud of the lintel's; the lintel's and the small wall's ends in it) */}
        <mesh position={[(0.002 + WALL_OUT + 0.006) / 2, ((frame ? frame.headY : h + STORE_HEAD) + 0.001) / 2, door[0] - STORE_POST / 2 + 0.001]}>
          <boxGeometry args={[WALL_OUT + 0.004, (frame ? frame.headY : h + STORE_HEAD) + 0.001, STORE_POST - 0.002]} /><meshToonMaterial color="#35200f" />
        </mesh>
        {/* (and the lintel carried on over the fridges' backs to the head's end (item 738, the owner's red box over their tops): one lintel at
            the doorway's height the whole stretch, as the head is one (item 562); in the wall's thickness only, behind the fridges (their
            backs in front of the wall's face), its stock room's face flush with the doorway's lintel's; the restock hatches' tops (1.875)
            go 2.5 cm up behind it) */}
        {/* (its shop's face behind the fridges' back doors since they stand back in the opening (item 746: their backs 6 mm behind the
            wall's face, the outer door 2 cm proud of the back, the hatches' tops 2.5 cm up behind the lintel): a centimetre clear of them) */}
        {/* (taken away (item 762, the owner's 「梁柱那要拿掉」: from the stock room a black beam across the fridges' backs): the small wall's
            plaster down to its foot over them instead (below)) */}
        {/* the fridges' openings' head (item 535) */}
        {frame && (
          <mesh position={[(WALL_OUT + 0.004 + 0.002) / 2, (frame.headY + frame.headTop) / 2, (frame.z0 + frame.z1) / 2]}>
            <boxGeometry args={[WALL_OUT + 0.004 - 0.002, frame.headTop - frame.headY, frame.z1 - frame.z0 - 0.004]} /><meshToonMaterial color="#35200f" />
          </mesh>
        )}
        {/* (its back as deep in the stock room as the head over it and the posts (item 562): it stopped 4 mm short of them) */}
        <mesh position={[(WALL_OUT + 0.004 - 0.035) / 2, h + STORE_HEAD / 2, (door[0] + door[1]) / 2]}><boxGeometry args={[WALL_OUT + 0.004 + 0.035, STORE_HEAD, outerW - 0.004]} /><meshToonMaterial color="#35200f" /></mesh>
        {/* (and over it, up to the head over the whole stretch (item 562), a small wall (小壁) of the room's plaster, as a framed wall has (on
            over the fridges' lintel too, item 738, to the head's end): the
            shop's wall over the doorway is drawn from the shop's side only, and from the stock room the head and the lintel were two bars
            across nothing, the shop seen between them; in the wall's thickness, 4 mm in from either face, a millimetre into the lintel,
            the head and the post) */}
        {/* (its shop's face 2 mm behind the fridges' backs (item 746: 4 mm in from the wall's face before, the fridges standing out in front
            of it)) */}
        {/* (and over the fridges from the doorway's height (item 762: the lintel that was across their backs there taken away): one shape,
            an L, so no faces back to back where the two heights meet (item 753)) */}
        {smallWall && <mesh geometry={smallWall}><meshToonMaterial color="#ece0c6" /></mesh>}
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
      {/* (its lamp's light kept in it (item 754): unseen slabs where its open back and near end are, casting) */}
      <mesh castShadow geometry={shadeGeo} material={STORE_SHADE_MAT} raycast={NO_RAY} userData={shadeData} />
      {/* (its lamp, on a bracket from the top of its far end wall, over the stock (item 713)) */}
      <StoreLamp at={[(WALL_OUT + deep) / 2, top - 0.1, zE - 0.006]} />
      {/* the noren, named when pointed at (item 735): over its cloth only, so the goods seen under it through the doorway are pointed at
          themselves; a click on it stopped there (it went through to them) */}
      <mesh position={[-0.06, h + STORE_HEAD - 0.02 - STORE_NOREN_L / 2, (door[0] + door[1]) / 2]} rotation-y={-Math.PI / 2} material={STORE_BLOCK_MAT} {...hit} onClick={stopHere}>
        <planeGeometry args={[outerW, STORE_NOREN_L]} />
      </mesh>
      {/* (the wall's face on the shop's side over the doorway, and on past it to the far end, the fridges' with it: the pointer stopped there,
          the goods behind not pointed at through it; the fridges' own in front of it) */}
      <mesh position={[-0.004, (h + STORE_HEAD - 0.02 + WALL_H) / 2, (door[0] + door[1]) / 2]} rotation-y={-Math.PI / 2} material={STORE_BLOCK_MAT}
        onPointerOver={stopHere} onPointerMove={stopHere} onClick={stopHere}>
        <planeGeometry args={[outerW, WALL_H - (h + STORE_HEAD - 0.02)]} />
      </mesh>
      <mesh position={[-0.004, WALL_H / 2, (door[1] + STORE_POST + zE) / 2]} rotation-y={-Math.PI / 2} material={STORE_BLOCK_MAT}
        onPointerOver={stopHere} onPointerMove={stopHere} onClick={stopHere}>
        <planeGeometry args={[zE - door[1] - STORE_POST, WALL_H]} />
      </mesh>
      {/* (a mat at its doorway (item 756, the owner's 「倉庫玄關口要有地墊。」; item 763: the owner's navy 青海波 with blossoms, the dirt of
          the back's coming and going not seen on it); inside the room (item 782, the owner's 「腳踏墊放倉庫室內」: it lay on the shop's boards
          before the doorway): on the mortar floor 2 cm in from the wall's inner face, 42 cm on into the room, as wide as the doorway's frame
          less 3 cm each side, square to the doorway (nothing stands there: no vertex of anything else in it, `_mat782.mjs`); 4 mm thick, half a
          millimetre over the mortar (its top 6.5 mm up), a dark rubber border; the stock keeper walks over it, the noren's hem over it) */}
      <Movable id="storemat" label="倉庫門口地墊" ground={0.007}>
        <group position={[WALL_OUT + 0.02 + STORE_MAT_D / 2, 0.007, (door[0] + door[1]) / 2]} rotation-y={Math.PI / 2}>
          <PatternMat art="navyWaves" w={outerW - 0.06} d={STORE_MAT_D} t={0.004} edge={0.03} rim="#1b1e26" />
        </group>
      </Movable>
      {/* its mortar floor (item 739), over the shop's boards (their top 4 mm up here: at a millimetre it was under them, never seen), 2.5 mm
          over them and drawn in front of them; the crates' feet a few millimetres into it, as they were into the boards */}
      {/* (from the wall's line on the shop's side: the wall's thickness behind the fridges and the doorway's sill were a strip of the shop's
          boards along the room) */}
      <mesh position={[(0.006 + deep - 0.002) / 2, 0.0065, (z0 + z1) / 2]} rotation-x={-Math.PI / 2} receiveShadow raycast={NO_RAY}>
        <planeGeometry args={[deep - 0.008, z1 - z0]} />
        <meshToonMaterial color="#ffffff" map={STORE_FLOOR} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-2} />
      </mesh>
    </group>
  )
}
/** (item 781) how far under the rod the stocker's shoulder meets the noren as he goes through (over it the cloth tilted aside, under it
 * hanging down again, draped over him), how much of the tilt the cloth under it keeps, half the length of the turn between; its rows across
 * (how finely it bends) */
const NOREN_PUSH_AT = 0.48, NOREN_HANG = 0.22, NOREN_BEND = 0.12, NOREN_ROWS = 12
/** one of the noren's panels pushed `a` (radians) aside: from the rod down to where it's pushed tilted a, under that hanging again (a
 * little of a kept), the turn between eased; each row put along the cloth (its length kept, not moved straight); flat as it hangs at 0. Only
 * when it's moved */
function bendNoren(g: THREE.BufferGeometry, a: number) {
  const ud = g.userData as { rest?: Float32Array; a?: number }
  const rest = ud.rest
  if (!rest || Math.abs((ud.a ?? 0) - a) < 1e-4) return
  ud.a = a
  const pos = g.attributes.position as THREE.BufferAttribute
  const lo = NOREN_PUSH_AT - NOREN_BEND, hi = NOREN_PUSH_AT + NOREN_BEND
  // (down the rows, top first, two to a row (the plane's own order): walked along the cloth in 2 cm steps)
  let x = 0, y = 0, sAt = 0
  for (let r = 0; r * 2 < pos.count; r++) {
    const y0 = rest[r * 6 + 1], s = Math.max(0, -y0)
    const n = Math.max(1, Math.ceil((s - sAt) / 0.02)), ds = (s - sAt) / n
    for (let j = 0; j < n; j++) {
      const t = a * (1 - THREE.MathUtils.smoothstep(sAt + (j + 0.5) * ds, lo, hi) * (1 - NOREN_HANG))
      x += Math.sin(t) * ds; y += Math.cos(t) * ds
    }
    sAt = s
    // (its own frame's -z is into the stock room, the way it's pushed)
    for (let c = 0; c < 2; c++) { const i = r * 2 + c; pos.setXYZ(i, rest[i * 3], y0 > 0 ? y0 : -y, -x) }
  }
  pos.needsUpdate = true
  g.computeVertexNormals()
}
/** one of the stock room noren's two panels: its half of the picture, hung from the rod (its top), a slit between the two */
function StoreNorenPanel({ sd, wide }: { sd: number; wide: number }) {
  const geo = useMemo(() => {
    const w = (wide - 0.008) / 2
    const g = new THREE.PlaneGeometry(w, STORE_NOREN_L, 1, NOREN_ROWS)
    const u0 = sd < 0 ? 0 : 1 - w / wide, u1 = u0 + w / wide
    const uv = g.attributes.uv as THREE.BufferAttribute
    for (let k = 0; k < uv.count; k++) uv.setX(k, u0 + uv.getX(k) * (u1 - u0))
    // (hung from its top: the cloth below the rod; as it hangs kept to bend from, its bounds as wide as it's ever pushed)
    g.translate(0, -STORE_NOREN_L / 2 + 0.012, 0)
    g.userData.rest = (g.attributes.position.array as Float32Array).slice()
    g.computeBoundingSphere()
    g.boundingSphere!.radius += STORE_NOREN_L * 0.4
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
