import { memo, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { warmLater } from '@/scene/render/Prewarm'
import { RAIN_NOW } from './shopFront'

/**
 * The rain at the way in (item 834, the owner's 「下雨時，門口會有表現，也會有陰影變化」), in the doorway's own frame (look-door: x along the
 * front, y up, z out to the street): out in front of the eave, streaks falling to the ground, as many of them shown as it's raining hard
 * (RAIN_NOW, eased); off the eave's front edge a drip here and there along it, now and then, falling as a drop does (slow off the edge,
 * then faster), and where each lands on the gravel a small ring of splash spreading and gone. None of it under the eave, none through the
 * door's bamboo. Three instanced meshes, their programs made with the scene as it loads (warmLater), hidden when it's dry. Lit by nothing
 * (rain's seen by the light behind it): their colour as the sky is, pale by day, dim at night.
 * (The stones wet and darker, and the sun's shadows faint and soft under the cloud, are the ground's (ground.tsx's GROUND_WET, floors.tsx)
 * and the key light's (app/Scene, game/world/roomLights' shadowDepth))
 */
// (measured, tests/e2e/_eave834.mjs: the eave's front edge at z 1.06 to 1.11, its underside 2.37 there, along x -1.40 to 1.16; the
// gravel's top -0.453, the earth's -0.462; the door's bamboo x 0.42 to 0.97, out to z 1.36)
const EAVE = { x: [-1.36, 1.12] as const, y: 2.35, z: 1.11 }
const GROUND_Y = -0.452
const AREA = { x: [-2.3, 2.5] as const, z: [1.17, 2.8] as const, top: 3.3 }
const BAMBOO_X = [0.38, 1.02] as const
const STREAKS = 320, DRIPS = 16, SPLASHES = 24
/** how fast the rain falls (the bar's units a second: twice the metres) and the drips' gravity; how long a splash lasts (s) */
const FALL = 11, GRAVITY = 19.6, SPLASH_S = 0.32

/** a streak: two thin cards crossed (seen from the street and from along the front alike), its foot at 0 */
function streakGeometry(w: number, h: number) {
  const pos: number[] = [], uv: number[] = [], idx: number[] = []
  for (const [ax, az] of [[1, 0], [0, 1]]) {
    const n = pos.length / 3
    pos.push(-ax * w / 2, 0, -az * w / 2, ax * w / 2, 0, az * w / 2, ax * w / 2, h, az * w / 2, -ax * w / 2, h, -az * w / 2)
    uv.push(0, 0, 1, 0, 1, 1, 0, 1)
    idx.push(n, n + 1, n + 2, n, n + 2, n + 3)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  return g
}
/** a streak's look: white, clear at its top (where it's come from) and fullest just above its foot */
const STREAK_TEX = (() => {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = 4; c.height = 64
  const g = c.getContext('2d')!
  const grad = g.createLinearGradient(0, 0, 0, 64)
  grad.addColorStop(0, 'rgba(255,255,255,0)'); grad.addColorStop(0.7, 'rgba(255,255,255,0.75)'); grad.addColorStop(1, 'rgba(255,255,255,0.35)')
  g.fillStyle = grad; g.fillRect(0, 0, 4, 64)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
})()
const STREAK_GEO = streakGeometry(0.006, 0.19), DROP_GEO = streakGeometry(0.009, 0.06)
const SPLASH_GEO = new THREE.RingGeometry(0.55, 1, 12).rotateX(-Math.PI / 2)
const STREAK_MAT = new THREE.MeshBasicMaterial({ color: '#d3dbe3', map: STREAK_TEX, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })
STREAK_MAT.name = 'DoorRain'
/** (the splashes added on: each one's colour its strength, black gone) */
const SPLASH_MAT = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
SPLASH_MAT.name = 'DoorRainSplash'
/** the rain's colour by the part of the day (the page's data-sky) */
const RAIN_TINT: Record<string, string> = { day: '#d3dbe3', dawn: '#b9c2cb', dusk: '#b4bcc6', night: '#7d8896' }
// (their programs made with the scene as it loads (rule 7: nothing compiled in the hours): a copy of each, never shown)
{
  const t = new THREE.Group()
  for (const [g, m] of [[STREAK_GEO, STREAK_MAT], [SPLASH_GEO, SPLASH_MAT]] as const) {
    const im = new THREE.InstancedMesh(g, m, 1)
    if (m === SPLASH_MAT) im.setColorAt(0, new THREE.Color(0, 0, 0))
    t.add(im)
  }
  warmLater(t)
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a)

export const DoorRain = memo(function DoorRain() {
  const made = useMemo(() => {
    const streaks = new THREE.InstancedMesh(STREAK_GEO, STREAK_MAT, STREAKS)
    const drops = new THREE.InstancedMesh(DROP_GEO, STREAK_MAT, DRIPS)
    const splashes = new THREE.InstancedMesh(SPLASH_GEO, SPLASH_MAT, SPLASHES)
    for (const m of [streaks, drops, splashes]) {
      m.frustumCulled = false
      m.visible = false
      m.raycast = () => {}
      m.renderOrder = 3
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    }
    const black = new THREE.Color(0, 0, 0)
    for (let i = 0; i < SPLASHES; i++) splashes.setColorAt(i, black)
    // (the streaks: each its place and its own pace a little; the drips: each its place along the eave's edge (none over the bamboo), when it
    // lets go next, whether its drop's falling, its height and speed as it does; the splashes: where, and how far through)
    const st = Array.from({ length: STREAKS }, () => ({ x: rnd(AREA.x[0], AREA.x[1]), y: rnd(GROUND_Y, AREA.top), z: rnd(AREA.z[0], AREA.z[1]), v: rnd(0.85, 1.15) }))
    const along: number[] = []
    for (let i = 0; along.length < DRIPS && i < DRIPS * 4; i++) {
      const x = EAVE.x[0] + ((i + 0.5) / (DRIPS * 1.6)) * (EAVE.x[1] - EAVE.x[0])
      if (x > EAVE.x[1]) break
      if (x > BAMBOO_X[0] && x < BAMBOO_X[1]) continue
      along.push(x + rnd(-0.03, 0.03))
    }
    const dr = along.map((x) => ({ x, next: rnd(0, 1.2), y: 0, v: 0, falling: false }))
    const sp = Array.from({ length: SPLASHES }, () => ({ x: 0, z: 0, t: 1 }))
    return { streaks, drops, splashes, st, dr, sp, m4: new THREE.Matrix4(), col: new THREE.Color(), sky: '' }
  }, [])
  useEffect(() => () => { for (const m of [made.streaks, made.drops, made.splashes]) m.dispose() }, [made])
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05), k = RAIN_NOW.k
    const { streaks, drops, splashes, st, dr, sp, m4, col } = made
    const on = k > 0.02
    const anySplash = sp.some((s) => s.t < 1)
    streaks.visible = on
    drops.visible = on
    splashes.visible = on || anySplash
    if (!on && !anySplash) return
    // (their colour as the sky is, set as it changes)
    const sky = typeof document === 'undefined' ? 'day' : document.documentElement.dataset.sky ?? 'day'
    if (sky !== made.sky) { made.sky = sky; STREAK_MAT.color.set(RAIN_TINT[sky] ?? RAIN_TINT.day) }
    STREAK_MAT.opacity = 0.42 + 0.33 * k
    // (the streaks: as many shown as it's raining hard; each falling, and from the top again, somewhere new, once it's reached the ground)
    const n = Math.round(STREAKS * Math.min(1, k * 1.1))
    for (let i = 0; i < n; i++) {
      const s = st[i]
      s.y -= FALL * s.v * dt
      if (s.y < GROUND_Y) { s.y += AREA.top - GROUND_Y; s.x = rnd(AREA.x[0], AREA.x[1]); s.z = rnd(AREA.z[0], AREA.z[1]) }
      m4.makeTranslation(s.x, s.y, s.z)
      streaks.setMatrixAt(i, m4)
    }
    streaks.count = n
    streaks.instanceMatrix.needsUpdate = true
    // (the drips off the eave: each lets go after a while (the harder the rain, the sooner), falls, and splashes where it lands)
    let dn = 0
    for (const d of dr) {
      if (!d.falling) {
        if (!on) continue
        d.next -= dt * (0.4 + 1.4 * k)
        if (d.next > 0) continue
        d.falling = true; d.y = EAVE.y; d.v = 0; d.next = rnd(0.35, 1.1)
      }
      d.v += GRAVITY * dt
      d.y -= d.v * dt
      if (d.y <= GROUND_Y) {
        d.falling = false
        const s = sp.find((x) => x.t >= 1)
        if (s) { s.x = d.x + rnd(-0.01, 0.01); s.z = EAVE.z + rnd(-0.01, 0.02); s.t = 0 }
        continue
      }
      m4.makeTranslation(d.x, d.y, EAVE.z)
      drops.setMatrixAt(dn++, m4)
    }
    drops.count = dn
    drops.instanceMatrix.needsUpdate = true
    // (the splashes spreading out, fading)
    for (let i = 0; i < SPLASHES; i++) {
      const s = sp[i]
      if (s.t < 1) s.t = Math.min(1, s.t + dt / SPLASH_S)
      const r = 0.012 + 0.05 * Math.sqrt(s.t), a = s.t < 1 ? (1 - s.t) * (1 - s.t) * 0.55 : 0
      m4.makeScale(r, 1, r).setPosition(s.x, GROUND_Y + 0.004, s.z)
      splashes.setMatrixAt(i, m4)
      splashes.setColorAt(i, col.setScalar(a))
    }
    splashes.instanceMatrix.needsUpdate = true
    if (splashes.instanceColor) splashes.instanceColor.needsUpdate = true
  })
  return (
    <group name="door-rain">
      <primitive object={made.streaks} />
      <primitive object={made.drops} />
      <primitive object={made.splashes} />
    </group>
  )
})
