import { memo, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { inkModel } from '@/scene/render/inkHull'
import { StaticBatch } from '@/scene/render/StaticBatch'
import { getClock } from '@/ui/kit/clockStore'
import { nameOver } from '@/shops/grill/bar'

/**
 * The cat wall clock (item 477, the owner's, 2026-11-21: 「這邊增加一個喵咪掛鐘」; a black cat since item 483: 「貓咪時鐘要黑貓」;
 * rounded all over since item 827: 「整體很像幾何形去拼湊出」; blender/catclock.py): our own, a black cat sitting up,
 * its round belly the clock's case and the dial on it, its face over it, a red collar and a gold bell at its neck, its paws at its foot,
 * its tail hanging under it for the pendulum. Its hands on the shop's own clock (eased round, the clock moving on by the second), its tail
 * swung; the head's front and the dial painted here in one picture (the face on its left half, the dial on its right), as the drinks
 * fridge's sign is. In the scene from the first, its programs made at loading.
 */
const URL = import.meta.env.BASE_URL + 'models/catclock.glb'
useGLTF.preload(URL)

/** the eyes' middles and their size on the face's square (px; the square PRINT_HEAD 0.2 m across the head, blender/catclock.py): big (item
 * 512, the owner's 「大大的貓咪眼」), each a third of the face across, 6.6 cm, as they were; set in the face well in from its edge (item 827:
 * they ran to the head's outline) */
const EYES = [[73, 113], [183, 113]] as const, EYE_R = 42
const TAU = Math.PI * 2
/**
 * An eye (item 827, the owner's 「眼睛不OK，整體很像幾何形去拼湊出」: they were two flat cream discs in grey rings, each a sticker laid on the
 * face): set into the fur, a soft dark round it where it sinks in; gold, lighter round its pupil and deepening to amber at its edge, fine
 * streaks out from the pupil, a dark ring at its edge; its pupil a tall slit, a touch toward the nose; the lid's shadow across its top; a
 * window's glint over the pupil and a small one under; the lower lid's wet rim catching the light. The upper lid a curve slanting down to
 * the nose (a cat's eye, not a circle), lined dark and flicked out at its outer corner; `lid` 0 open → 1 shut, the lid drawn down over it,
 * shut a curve across its middle. `t` +1 when the nose is to its right
 */
function paintEye(g: CanvasRenderingContext2D, x: number, y: number, R: number, t: number, lid: number) {
  // (set in: a soft dark round it; gone as the lid comes down (shut, it read as two dark rings round the shut eyes))
  const sock = g.createRadialGradient(x, y, R * 0.92, x, y, R * 1.32)
  sock.addColorStop(0, 'rgba(8,5,5,' + (0.6 * (1 - lid)).toFixed(3) + ')'); sock.addColorStop(1, 'rgba(8,5,5,0)')
  g.fillStyle = sock
  g.beginPath(); g.arc(x, y, R * 1.32, 0, TAU); g.fill()
  // (the lid's edge: from its outer corner, high, to its inner, lower, bowed up over the eye; shutting, all three down to a curve under
  // the middle)
  const o = (a: number, b: number) => a + (b - a) * lid
  const ox = x - t * R * 1.04, ix = x + t * R * 1.04
  const oy = o(y - R * 0.7, y + R * 0.06), iy = o(y - R * 0.46, y + R * 0.12), cy = o(y - R * 1.02, y + R * 0.42)
  g.save()
  g.beginPath(); g.arc(x, y, R, 0, TAU); g.clip()
  if (lid < 0.98) {
    const px = x + t * R * 0.06, py = y + R * 0.05
    const iris = g.createRadialGradient(px, py + R * 0.08, R * 0.12, x, y, R)
    iris.addColorStop(0, '#fff4b8'); iris.addColorStop(0.42, '#f9d750'); iris.addColorStop(0.8, '#e5a22a'); iris.addColorStop(1, '#a65f18')
    g.fillStyle = iris
    g.fillRect(x - R, y - R, 2 * R, 2 * R)
    g.lineWidth = 1.3
    for (let k = 0; k < 40; k++) {
      const a = (k / 40) * TAU + (k % 3) * 0.04, r0 = R * 0.36, r1 = R * (0.84 + (k % 4) * 0.035)
      g.strokeStyle = k % 2 ? 'rgba(255,250,215,0.22)' : 'rgba(140,72,10,0.2)'
      g.beginPath(); g.moveTo(px + Math.cos(a) * r0, py + Math.sin(a) * r0); g.lineTo(px + Math.cos(a) * r1, py + Math.sin(a) * r1); g.stroke()
    }
    g.strokeStyle = 'rgba(90,46,8,0.85)'; g.lineWidth = 3
    g.beginPath(); g.arc(x, y, R - 1.2, 0, TAU); g.stroke()
    const pupil = g.createRadialGradient(px, py, 1, px, py, R * 0.74)
    pupil.addColorStop(0, '#050303'); pupil.addColorStop(1, '#1d120c')
    g.fillStyle = pupil
    g.beginPath(); g.ellipse(px, py, R * 0.26, R * 0.74, 0, 0, TAU); g.fill()
    const shade = g.createLinearGradient(0, cy, 0, y + R * 0.05)
    shade.addColorStop(0, 'rgba(48,22,4,0.7)'); shade.addColorStop(1, 'rgba(48,22,4,0)')
    g.fillStyle = shade
    g.fillRect(x - R, y - R, 2 * R, 2 * R)
    g.fillStyle = 'rgba(255,255,255,0.95)'
    g.beginPath(); g.ellipse(px - R * 0.22, py - R * 0.34, R * 0.18, R * 0.13, -0.5, 0, TAU); g.fill()
    g.fillStyle = 'rgba(255,255,255,0.75)'
    g.beginPath(); g.arc(px + R * 0.22, py + R * 0.4, R * 0.075, 0, TAU); g.fill()
    g.strokeStyle = 'rgba(255,238,190,0.5)'; g.lineWidth = 2
    g.beginPath(); g.arc(x, y, R - 3, Math.PI * 0.22, Math.PI * 0.78); g.stroke()
  }
  // (the lid: the fur down to its edge; shut, all of it)
  g.fillStyle = '#2b2727'
  g.beginPath(); g.moveTo(ox, y - R * 1.2); g.lineTo(ix, y - R * 1.2); g.lineTo(ix, iy); g.quadraticCurveTo(x, cy, ox, oy); g.closePath(); g.fill()
  if (lid >= 0.98) g.fillRect(x - R, y - R, 2 * R, 2 * R)
  g.restore()
  // (its line: dark along the lid's edge, out past the eye at its outer corner in a flick; and a fine dark rim round its foot)
  g.strokeStyle = '#0b0707'
  g.lineCap = 'round'
  g.save()
  g.beginPath(); g.arc(x, y, R + 2.5, 0, TAU); g.clip()
  g.lineWidth = 4.5
  g.beginPath(); g.moveTo(ix, iy); g.quadraticCurveTo(x, cy, ox, oy); g.stroke()
  g.restore()
  g.lineWidth = 3.5
  g.beginPath(); g.moveTo(ox + t * 3, oy + 1); g.lineTo(ox - t * 7, oy - 6); g.stroke()
  if (lid < 0.98) { g.lineWidth = 2.2; g.beginPath(); g.arc(x, y, R + 0.5, Math.PI * 0.12, Math.PI * 0.88); g.stroke() }
}
/**
 * The face (a black cat's since item 483, the owner's 「貓咪時鐘要黑貓」; its eyes after the owner's picture since item 484, big since 512,
 * set in since 827): its fur, a little lighter over the brow and the muzzle (the head's round shades the rest); the eyes (paintEye); a pink
 * nose with a light on it, a little ω of a mouth, cheeks a soft rose, three cream whiskers a side out to the head's edge. On the picture's
 * left half only
 */
function paintFace(g: CanvasRenderingContext2D, lid: number) {
  g.save()
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.fillStyle = '#2b2727'; g.fillRect(0, 0, 256, 256)
  for (const [cx, cy, r, a] of [[128, 62, 70, 0.22], [128, 176, 46, 0.3]] as const) {
    const lit = g.createRadialGradient(cx, cy, 2, cx, cy, r)
    lit.addColorStop(0, 'rgba(82,72,72,' + a + ')'); lit.addColorStop(1, 'rgba(82,72,72,0)')
    g.fillStyle = lit
    g.fillRect(cx - r, cy - r, 2 * r, 2 * r)
  }
  for (const x of [44, 212]) {
    const blush = g.createRadialGradient(x, 182, 2, x, 182, 20)
    blush.addColorStop(0, 'rgba(176,86,98,0.55)'); blush.addColorStop(1, 'rgba(176,86,98,0)')
    g.fillStyle = blush
    g.beginPath(); g.ellipse(x, 182, 22, 13, 0, 0, TAU); g.fill()
  }
  EYES.forEach(([x, y], i) => paintEye(g, x, y, EYE_R, i === 0 ? 1 : -1, lid))
  g.fillStyle = '#e8899a'
  g.beginPath(); g.moveTo(117, 158); g.quadraticCurveTo(128, 151, 139, 158); g.quadraticCurveTo(136, 165, 128, 171); g.quadraticCurveTo(120, 165, 117, 158); g.fill()
  g.fillStyle = 'rgba(255,225,232,0.75)'
  g.beginPath(); g.ellipse(124, 158, 4, 2, -0.2, 0, TAU); g.fill()
  g.strokeStyle = '#d99aa0'; g.lineWidth = 3
  g.beginPath(); g.moveTo(128, 171); g.lineTo(128, 175); g.quadraticCurveTo(124, 183, 116, 180); g.moveTo(128, 175); g.quadraticCurveTo(132, 183, 140, 180); g.stroke()
  // (the whiskers out from the muzzle, a little bowed, out to the head's edge)
  g.strokeStyle = '#efe6d6'; g.lineWidth = 2.6
  for (const [y0, y1, bow] of [[167, 156, -3], [175, 175, -2], [183, 194, 2]] as const) {
    g.beginPath(); g.moveTo(58, y0); g.quadraticCurveTo(30, (y0 + y1) / 2 + bow, 6, y1)
    g.moveTo(198, y0); g.quadraticCurveTo(226, (y0 + y1) / 2 + bow, 250, y1); g.stroke()
  }
  g.restore()
}
/** the picture: the face on its left half (its square laid over the head's 17 cm), the dial on its right (over the dial's 14 cm) */
function paintPrint() {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 256
  const g = c.getContext('2d')!
  g.lineCap = 'round'
  g.lineJoin = 'round'
  PRINT_CANVAS = c
  paintFace(g, 0)
  // ---- the dial: cream, a ring near its edge, twelve ticks (the quarters bold), its quarters' numbers, a little grilled fish under its
  // middle (the shop's)
  const X = 384, Y = 128
  g.fillStyle = '#fbf3df'; g.fillRect(256, 0, 256, 256)
  g.strokeStyle = '#d6c39a'; g.lineWidth = 5
  g.beginPath(); g.arc(X, Y, 118, 0, Math.PI * 2); g.stroke()
  g.strokeStyle = '#4a3a30'
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2, q = k % 3 === 0
    g.lineWidth = q ? 8 : 4
    g.beginPath(); g.moveTo(X + Math.sin(a) * (q ? 96 : 102), Y - Math.cos(a) * (q ? 96 : 102)); g.lineTo(X + Math.sin(a) * 110, Y - Math.cos(a) * 110); g.stroke()
  }
  g.fillStyle = '#4a3a30'
  g.font = 'bold 34px Georgia, "Times New Roman", serif'
  g.textAlign = 'center'; g.textBaseline = 'middle'
  for (const [n, a] of [['12', 0], ['3', 0.25], ['6', 0.5], ['9', 0.75]] as const) g.fillText(n, X + Math.sin(a * Math.PI * 2) * 74, Y - Math.cos(a * Math.PI * 2) * 74 + 2)
  // (the fish: a ginger body, its tail, a darker back line; no eye)
  g.fillStyle = '#e3953f'
  g.beginPath(); g.ellipse(X - 4, Y + 40, 17, 8, 0, 0, Math.PI * 2); g.fill()
  g.beginPath(); g.moveTo(X + 10, Y + 40); g.lineTo(X + 24, Y + 31); g.lineTo(X + 22, Y + 40); g.lineTo(X + 24, Y + 49); g.closePath(); g.fill()
  g.strokeStyle = '#b8682a'; g.lineWidth = 2.5
  g.beginPath(); g.moveTo(X - 16, Y + 37); g.quadraticCurveTo(X - 4, Y + 33, X + 8, Y + 37); g.stroke()
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.flipY = false
  t.anisotropy = 4
  return t
}
let PRINT: THREE.CanvasTexture | null = null
/** the picture's own canvas (the texture's may be a smaller copy, scene/textureCap: painted here, copied over as it's marked changed) */
let PRINT_CANVAS: HTMLCanvasElement | null = null
/** how shut its eyes are drawn now, in steps (a blink's few pictures, painted only as it changes) */
let LID_NOW = 0

const SAYS = nameOver('【掛鐘】黑貓掛鐘', '尾巴當鐘擺左右搖，指針跟著店裡的時間走')
/** the shortest way round from one angle to another */
const turnBy = (from: number, to: number) => ((((to - from + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI

export const CatClock = memo(function CatClock() {
  const gltf = useGLTF(URL) as unknown as { scene: THREE.Group }
  const parts = useMemo(() => {
    const r = (gltf.scene.getObjectByName('CatClock') ?? gltf.scene).clone(true)
    r.position.set(0, 0, 0)
    PRINT ??= paintPrint()
    const made = new Map<THREE.Material, THREE.Material>()
    r.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const src = m.material as THREE.MeshStandardMaterial
      let t = made.get(src)
      if (!t) {
        t = new THREE.MeshToonMaterial({ color: src.name === 'CatClockPrint' ? '#ffffff' : src.color.clone(), map: src.name === 'CatClockPrint' ? PRINT : null })
        t.name = src.name
        made.set(src, t)
      }
      m.material = t
      // (its own shadow's not worth the cost on a wall: none cast, its things' shadows taken)
      m.receiveShadow = true
    })
    // (what moves (the hands, the tail) taken out to a group of its own beside it: the body batched (its plain colours drawn as one), these
    // not)
    const moving = new THREE.Group()
    const hour = r.getObjectByName('CatClockHour')!, minute = r.getObjectByName('CatClockMinute')!, tail = r.getObjectByName('CatClockTail')!
    const tip = tail.getObjectByName('CatClockTailTip') ?? null
    moving.add(hour, minute, tail)
    inkModel(r, () => false, { width: 0.0012, weld: true })
    inkModel(moving, () => false, { width: 0.0012, weld: true })
    return { r, moving, hour, minute, tail, tip }
  }, [gltf])
  const at = useRef({ h: NaN, m: NaN })
  // (a blink now and then (item 484): every three to seven seconds, a fifth of them twice over; the lids down and up in a sixth of a second)
  const blink = useRef({ next: 2 + Math.random() * 3, at: -1, twice: false })
  useFrame(({ clock }, dt) => {
    const now = clock.elapsedTime, b = blink.current
    if (b.at < 0 && now > b.next) { b.at = now; b.twice = Math.random() < 0.2 }
    let lid = 0
    if (b.at >= 0) {
      const s = now - b.at, len = 0.17
      if (s < len) lid = Math.sin((s / len) * Math.PI)
      else if (b.twice && s > len + 0.08 && s < len * 2 + 0.08) lid = Math.sin(((s - len - 0.08) / len) * Math.PI)
      else if (s >= (b.twice ? len * 2 + 0.08 : len)) { b.at = -1; b.next = now + 3 + Math.random() * 4 }
    }
    // (dev: the lids held where asked, to look at them: window.__catLid = 0 … 1)
    if (import.meta.env.DEV) { const held = (window as unknown as { __catLid?: number }).__catLid; if (typeof held === 'number') lid = held }
    const step = Math.round(lid * 4) / 4
    if (import.meta.env.DEV) (window as unknown as { __catLidNow?: number }).__catLidNow = step
    if (step !== LID_NOW && PRINT && PRINT_CANVAS) {
      LID_NOW = step
      paintFace(PRINT_CANVAS.getContext('2d')!, step)
      PRINT.needsUpdate = true
    }
    const min = getClock().minute
    const hTo = (((min / 60) % 12) / 12) * Math.PI * 2, mTo = ((min % 60) / 60) * Math.PI * 2
    const a = at.current
    // (the hands eased round to the time (it moves on by the second), the short way, never spun back the long way at midnight)
    if (!Number.isFinite(a.h)) { a.h = hTo; a.m = mTo }
    const k = Math.min(1, Math.min(dt, 0.1) * 6)
    a.h += turnBy(a.h, hTo) * k
    a.m += turnBy(a.m, mTo) * k
    parts.hour.rotation.z = -a.h
    parts.minute.rotation.z = -a.m
    // (the tail swung as a pendulum: a second and a half each way and back; its tip after it (item 827), a fifth of a swing behind, so it
    // trails and flicks over at each end rather than swinging stiff as one stick)
    const ph = (clock.elapsedTime * Math.PI * 2) / 1.5
    parts.tail.rotation.z = Math.sin(ph) * 0.17
    if (parts.tip) parts.tip.rotation.z = Math.sin(ph - 1.15) * 0.16
  })
  return (
    <group>
      <StaticBatch plain><primitive object={parts.r} /></StaticBatch>
      <primitive object={parts.moving} />
      {/* (pointed at: what it is, a tag (no glow), the cursor an arrow) */}
      <mesh visible={false} position={[0, -0.02, 0.03]} {...SAYS}><boxGeometry args={[0.24, 0.57, 0.06]} /></mesh>
    </group>
  )
})
