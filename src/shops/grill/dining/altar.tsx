import { blessingChime, pourSake } from '@/shops/grill/shrineSound'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { NO_RAY } from '@/scene/interact/pickable'
import { StaticBatch } from '@/scene/render/StaticBatch'
import { useGLTF } from '@react-three/drei'
import { tipOver, nameOver } from '@/shops/grill/bar'
import { Movable } from '@/shops/grill/Movable'
import { getEdit } from '@/shops/grill/edit'
import { setTip } from '@/scene/interact/hoverTip'
import { canvasTex } from './base'
import { KAMIDANA_URL, kamidanaOf, KamiCopy, OrangePlate, SANBO_FLOOR, SanboPart, Sanbo, KamidanaModel, ContactShadow, BLESSING, SHRINE_OPEN, RIPPLE, SPARKS, MOTES, pointsEach, STAR, easeOut, SHRINE_WIDE, SHRINE_DEEP, ShrineDoors, SHRINE_LIFT, Kamidana, KAMI_SC, SHRINE_BACK, CUP_DZ_ALTAR, CUP_FLOOR, CUP_FULL, cupInnerR, GLOW } from './shrine'

/**
 * The altar on the shelf by the door: the household shrine (神棚), a pair of sake flasks (御神酒徳利) and a cup set out before it, a
 * dish of oranges. Offering the sake (a click) fills the cup and makes the shrine itself glow for a minute.
 */
/** where the Ebisu sits, in the altar's frame (the shrine at the wall, scaled up, its middle bay's floor) */
const EBISU_AT: [number, number, number] = [0.29 + 1.25 * (-0.14 + 0.027), 1.25 * (SHRINE_LIFT + 0.045 + 0.04), 0]
/** a faint rainbow aura: a soft ring of the spectrum round a clear middle, fading out at its edge */
const AURA = canvasTex(128, 128, (g) => {
  // (a pale, warm glow ring, only a hint of colour round it (a faint, desaturated rainbow), broken up by grainy noise; painted per pixel, so a
  // repaint once the sign font loads gives the same picture)
  g.globalCompositeOperation = 'source-over'
  const img = g.createImageData(128, 128)
  const hash = (x: number, y: number) => {
    const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
    return h - Math.floor(h)
  }
  const vnoise = (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf)
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1)
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
  }
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    const dx = (x - 63.5) / 64, dy = (y - 63.5) / 64, r = Math.hypot(dx, dy)
    const ring = Math.exp(-(((r - 0.66) / 0.17) ** 2)) * (r < 1 ? 1 : 0)
    const n = 0.55 * vnoise(x / 9, y / 9) + 0.3 * vnoise(x / 4, y / 4) + 0.15 * hash(x, y)
    const hue = (Math.atan2(dy, dx) / (2 * Math.PI) + 0.5 + n * 0.3) * 6
    const rgb = [0, 2, 4].map((o) => Math.max(0, Math.min(1, Math.abs(((hue + o) % 6) - 3) - 1)))
    const i = (y * 128 + x) * 4
    for (let k = 0; k < 3; k++) img.data[i + k] = 255 * (0.86 * [1, 0.93, 0.78][k] + 0.14 * rgb[k])
    img.data[i + 3] = 255 * ring * Math.max(0, Math.min(1, (n - 0.3) * 1.8))
  }
  g.putImageData(img, 0, 0)
})
/** the cups and their stand set out from where they were worked out: where the owner put them in the edit panel (X −0.015), and back 0.02
 * toward the shrine's steps with the shallower table (TABLE_DEEP) */
const CUPS_SHIFT = 0.005 + 0.025
/** the two 三方 stands (the shrine's little tables) and what's on them a size smaller (item 111, the owner's, 2026-11-14: "the shrine's little
 * table smaller"), from their feet */
const SANBO_SIZE = 0.8
/** where the owner set the cups' stand by hand (2026-11-11: z -0.05, then on 0.055 along and 0.066 further in), along and across */
const CUPS_SET = [0.055, -0.05 - 0.066] as const
/** where the Ebisu's feet are, on his pedestal (the ring of light spreads out from there) */
// (where the shrine's back stands, ALTAR_D / 2, and the Ebisu brought back toward it with the shrine's shallower depth)
const EBISU_FEET: [number, number, number] = [0.29 + (0.145 - 0.29) * SHRINE_DEEP, 0.077, 0]
/** where the cups stand along the shelf's depth (the offering's light comes from there) */
const CUPS_FX = 0.29 - 0.375 + CUPS_SHIFT
/** the altar shelf's depth, out from the wall: the god at the back, raised, the censer before him */
/** the whole shrine area drawn a size larger, its back still against the wall */
export const ALTAR_SCALE = 1.2
export const ALTAR_D = 0.58
/** the offering table drawn shallower than it was modelled (ALTAR_D), its back still to the wall: the owner's, a little less deep (0.53);
 * what's on it brought back to fit, the cups, the flask, the oranges (a little smaller) and the sutra */
// (its front cut back again (the owner's, 2026-11-11: the table too big), to just before what stands on it: 0.47)
// (and again (the owner's, 2026-11-13: the empty strip along its front taken away, once what's on it had been set back toward the wall), to
// 1.5 cm before the front of the cups' stand, the foremost thing on it: 0.39)
// (and again, a little shallower and a little shorter (the owner's, 2026-11-15, item 119), the cups' stand set back 2.5 cm to stay on it, the
// vases and the book in toward the middle)
const TABLE_DEEP = 0.36 / ALTAR_D
/** and shorter along the wall than it was modelled, about its middle */
const TABLE_LONG = 0.93
/** where the two little lanterns stand on the shelf, in its frame: beside the shrine's base's front corners (its plinth out to 0.2475 across,
 * its front at 0.065), between it and the vases (from 0.325 across), behind the flask and the book */
// (forward of where they stood and in a little, either side of the cups' shortened stand, and a little smaller (the owner's, 2026-11-11):
// they stood at 0.07, 0.288, full size)
// (a touch smaller (the owner's, 2026-11-13, item 68): 0.85 before)
const SHRINE_LAMP_X = 0.0, SHRINE_LAMP_Z = 0.25, SHRINE_LAMP_SC = 0.75
/** where the flask stands, by the cups' stand (back 0.02 with them) */
const FLASK_X = -0.04
/** and its height: up over the beckoning cats' stand below it, by the door */
export const ALTAR_Y = 1.42
/** how long the omiki offered stands there, and the extra custom it brings (ms) */
const OMIKI_MS = 180000
/** the small shrine's offering table (blender/kamidana.py's KamiTable): three keyaki boards, a dark lip with a gold line inside it, gold front
 * corners, the arched apron below; in the altar's own frame (its top's surface at y = 0, its front at x = -D/2) */
export function AltarTable() {
  return <group position-x={(ALTAR_D / 2) * (1 - TABLE_DEEP)} scale={[TABLE_DEEP, 1, TABLE_LONG]}><KamidanaModel part="table" /></group>
}
function Sutra() {
  return (
    // (in from the table's front with it, a little smaller, between the table's side lip and the lantern (it stood at -0.105, -0.34, full
    // size: out along the table it ran into the lip, in it ran into the lantern))
    <group position={[-0.073, 0.001, -0.351]} rotation-y={-Math.PI / 2} scale={0.85}><KamidanaModel part="sutra" /></group>
  )
}
/** (where the flask pours from, worked out in the cups' frame and taken into the flask's own: kept, not made each frame) */
const POUR_AT = new THREE.Vector3(), REST_AT = new THREE.Vector3()
export function Altar({ omiki }: { omiki?: { pouredAt: number | null; onPour: () => void } }) {
  // (the offering: one flask pours clear sake into the three cups in turn, the stream and the cups filling; then it's set back)
  const flaskRef = useRef<THREE.Group>(null)
  const flaskShadow = useRef<THREE.Group>(null)
  const streamRef = useRef<THREE.Mesh>(null)
  /** whether a cup was being poured into last frame: its sound starts as the stream does */
  const wasPouring = useRef(false)
  const liquid = useRef<(THREE.Mesh | null)[]>([null, null, null])
  // (the cups as they stand, moved by hand or not: the pour, the stream, the sake in them and the sparks all go where they are)
  const cupsRef = useRef<THREE.Group>(null)
  const cupsOff = useMemo(() => new THREE.Vector3(), [])
  // (the motes: while the offering stands, faint glowing ones drift up from the shrine)
  const burning = useRef(false)
  const motes = useRef<THREE.Points>(null)
  const moteMat = useRef<THREE.PointsMaterial>(null)
  const sparks = useRef<THREE.Points>(null)
  // (each mote its own: how fast it rises, round which way and how far it spirals, how it twinkles, when it starts, how big, its tint (gold,
  // a paler gold, nearly white, now and then a faint rose or sky), and a few large soft ones, as light out of focus)
  const moteRnd = useMemo(() => {
    let seed = 7
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const tints = [[1, 0.78, 0.4], [1, 0.86, 0.55], [1, 0.95, 0.82], [1, 0.82, 0.7], [0.85, 0.92, 1]]
    return Array.from({ length: MOTES }, (_, i) => ({ speed: 0.025 + rnd() * 0.045, turn: (rnd() < 0.5 ? -1 : 1) * (0.6 + rnd() * 1.4), r0: 0.01 + rnd() * 0.03,
      twF: 2 + rnd() * 7, phase: rnd() * 6.28, z0: (rnd() - 0.5) * 0.6, rise: 0.32 + rnd() * 0.2, x0: -0.09 + rnd() * 0.12, offset: rnd(), size: i < 6 ? 2.2 + rnd() : 0.4 + rnd(),
      tint: tints[Math.floor(rnd() * (rnd() < 0.85 ? 3 : 5))] }))
  }, [])
  const sparkRnd = useMemo(() => {
    let seed = 11
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    return Array.from({ length: SPARKS }, () => ({ a: rnd() * Math.PI * 2, out: 0.12 + rnd() * 0.3, up: 0.05 + rnd() * 0.22, life: 0.9 + rnd() * 1.1, size: 0.5 + rnd() }))
  }, [])
  // (the Ebisu's stone, glowing, a soft halo and a faint rainbow aura round him while the offering stands)
  const gltfK = useGLTF(KAMIDANA_URL) as unknown as { scene: THREE.Group }
  const ebisuMats = useMemo(() => {
    const out = new Set<THREE.MeshToonMaterial>()
    kamidanaOf(gltfK.scene).ebisu.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      // (its own copy, so nothing else in the stone glows with it)
      if (!m.userData.ownGlow) { m.material = (m.material as THREE.Material).clone(); m.userData.ownGlow = true }
      const mat = m.material as THREE.MeshToonMaterial
      if (mat.emissive) { mat.emissive.set('#ffc860'); out.add(mat) }
    })
    return [...out]
  }, [gltfK])
  const halo = useRef<THREE.Sprite>(null)
  const aura = useRef<THREE.Sprite>(null)
  const ring = useRef<THREE.Mesh>(null)
  const ring2 = useRef<THREE.Mesh>(null)
  const flash = useRef<THREE.Sprite>(null)
  const lamp = useRef<THREE.PointLight>(null)
  const moteGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MOTES * 3), 3))
    g.setAttribute('size', new THREE.BufferAttribute(new Float32Array(MOTES), 1))
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(MOTES * 3), 3))
    g.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(MOTES), 1))
    return g
  }, [])
  const sparkGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SPARKS * 3), 3))
    g.setAttribute('size', new THREE.BufferAttribute(new Float32Array(SPARKS), 1))
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(SPARKS * 3), 3))
    g.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(SPARKS), 1))
    return g
  }, [])
  const sizes = moteGeo.attributes.size as THREE.BufferAttribute
  useFrame(({ clock, camera }, dt) => {
    const t = clock.elapsedTime
    // (the motes: each rises from the shrine's base and fades as it goes, over about three seconds, swaying a little)
    if (moteMat.current) moteMat.current.opacity += ((BLESSING.on ? 0.9 : 0) - moteMat.current.opacity) * Math.min(1, dt * 1.5)
    if (motes.current && moteMat.current && moteMat.current.opacity > 0.01) {
      const pos = moteGeo.attributes.position as THREE.BufferAttribute
      const col = moteGeo.attributes.color as THREE.BufferAttribute
      for (let i = 0; i < MOTES; i++) {
        // (each spirals up round the shrine at its own pace and turn, swelling in, twinkling, thinning as it climbs, gone at the top)
        const m = moteRnd[i]
        const life = (t * m.speed + m.offset) % 1
        const ang = m.phase + life * m.turn * Math.PI * 2
        const rr = m.r0 * (0.6 + life * 0.8)
        // (out in front of the open doors, where they're seen, not inside the shrine's walls)
        // (slowly up the whole face of the shrine, from its base to above its roof, spread across its width, in front of it)
        pos.setXYZ(i, m.x0 + Math.cos(ang) * rr * 0.5, 0.03 + life * m.rise, m.z0 + Math.sin(ang) * rr)
        // (in quickly, held, out softly near the top: the shelf's group is scaled, so all this is in its own small units)
        const fade = THREE.MathUtils.smoothstep(life, 0, 0.12) * (1 - THREE.MathUtils.smoothstep(life, 0.55, 1))
        const tw = 0.65 + 0.35 * Math.sin(t * m.twF + m.phase) ** 2
        sizes.setX(i, 0.045 * m.size * (0.7 + 0.3 * tw) * (0.6 + fade * 0.4))
        // (its tint, and the fade and the twinkle in its transparency: it shows by day as well as by night)
        col.setXYZ(i, m.tint[0], m.tint[1], m.tint[2])
        ;(moteGeo.attributes.alpha as THREE.BufferAttribute).setX(i, fade * tw * (m.size > 2 ? 0.35 : 1))
      }
      sizes.needsUpdate = true
      pos.needsUpdate = true
      col.needsUpdate = true
      ;(moteGeo.attributes.alpha as THREE.BufferAttribute).needsUpdate = true
    }
    // (offered, the sake stands in its cup for a minute and the shrine glows, then goes quiet; then another can be offered)
    const at = omiki?.pouredAt ?? null
    const left = at === null ? 0 : Math.max(0, 1 - (performance.now() - at) / OMIKI_MS)
    const on = left > 0
    burning.current = on
    // (the blessing's strength: up as the pour ends, a pulse while it stands, down at its end; the doors open for it)
    const blessed = on && (performance.now() - (at ?? 0)) / 1000 > 3.6
    // (as it comes down: the bowl's ring and the little bells)
    if (blessed && !BLESSING.on) blessingChime()
    BLESSING.on = blessed
    BLESSING.k += ((BLESSING.on ? 1 : 0) - BLESSING.k) * Math.min(1, dt * 2.5)
    const pulse = 0.85 + 0.15 * Math.sin(t * 2.4)
    // (the Ebisu: always a faint warm glow in the stone, much brighter while blessed)
    for (const m of ebisuMats) m.emissiveIntensity = 0.05 + 0.22 * BLESSING.k * pulse
    if (halo.current) {
      const hm = halo.current.material as THREE.SpriteMaterial
      hm.opacity = 0.1 + 0.25 * BLESSING.k * pulse
      halo.current.scale.setScalar(0.14 + 0.06 * BLESSING.k * pulse)
      // (and his halo with him: behind the shut doors it's drawn for nothing (item 567))
      halo.current.visible = SHRINE_OPEN.k > 0
    }
    // (round him a faint rainbow aura, its colours turning slowly, breathing)
    if (aura.current) {
      const am = aura.current.material as THREE.SpriteMaterial
      am.opacity = 0.32 * BLESSING.k * (0.8 + 0.2 * Math.sin(t * 1.3))
      am.rotation = t * 0.35
      aura.current.scale.setScalar(0.19 + 0.015 * Math.sin(t * 1.1))
      aura.current.visible = BLESSING.k > 0.01
    }
    // (the moment the offering's taken: a flash of light up from the cups, sparks thrown out from it in arcs, and two soft rings of light, one
    // after the other, rippling out across the shelf, easing as they spread, turning a little, fading as they go)
    const since0 = on ? (performance.now() - (at ?? 0)) / 1000 - 3.6 : -1
    for (const [r, delay, dur, size, peak] of [[ring.current, 0, 1.8, 0.34, 0.95], [ring2.current, 0.3, 2.2, 0.26, 0.7]] as const) {
      if (!r) continue
      const q = (since0 - delay) / dur
      r.visible = q > 0 && q < 1
      if (r.visible) {
        r.scale.setScalar(0.08 + easeOut(q) * size)
        r.rotation.z = q * 0.6 * (delay ? -1 : 1)
        ;(r.material as THREE.MeshBasicMaterial).opacity = peak * Math.min(1, q * 8) * (1 - q) ** 1.6
      }
    }
    if (flash.current) {
      const q = since0 / 0.7
      flash.current.visible = q > 0 && q < 1
      if (flash.current.visible) {
        ;(flash.current.material as THREE.SpriteMaterial).opacity = 0.7 * Math.sin(Math.PI * Math.min(1, q * 1.4)) * (1 - q)
        flash.current.scale.setScalar(0.12 + 0.3 * easeOut(q))
      }
    }
    if (sparks.current) {
      const on2 = since0 > 0 && since0 < 2.4
      sparks.current.visible = on2
      if (on2) {
        const pos = sparkGeo.attributes.position as THREE.BufferAttribute
        const siz = sparkGeo.attributes.size as THREE.BufferAttribute
        const col = sparkGeo.attributes.color as THREE.BufferAttribute
        for (let i = 0; i < SPARKS; i++) {
          const sp = sparkRnd[i]
          const q = Math.min(1, since0 / sp.life)
          const o = easeOut(q) * sp.out
          // (out from the cups and up, then falling back a little, as thrown)
          pos.setXYZ(i, CUPS_FX + Math.cos(sp.a) * o * 0.5, 0.04 + sp.up * Math.sin(Math.PI * Math.min(1, q * 1.2)) * 0.8, Math.sin(sp.a) * o)
          siz.setX(i, 0.045 * sp.size * (1 - q * 0.6) * Math.min(1, (1 - q) * 3))
          col.setXYZ(i, 1, 0.82 + 0.15 * (1 - q), 0.42 + 0.4 * (1 - q))
          ;(sparkGeo.attributes.alpha as THREE.BufferAttribute).setX(i, Math.min(1, (1 - q) * 2.5))
        }
        pos.needsUpdate = true; siz.needsUpdate = true; col.needsUpdate = true
        ;(sparkGeo.attributes.alpha as THREE.BufferAttribute).needsUpdate = true
      }
    }
    if (lamp.current) lamp.current.intensity = 0.3 * BLESSING.k * pulse
    // (pouring: a few seconds from the moment it's offered; the cups stay full while the offering stands)
    const since = at === null ? 99 : (performance.now() - at) / 1000
    // (how far the cups have been moved from where they were made to stand, in this frame: the middle cup's place as it is now)
    const host = streamRef.current?.parent
    if (cupsRef.current && host) {
      const w = cupsRef.current.localToWorld(new THREE.Vector3(-0.3, 0.03, 0))
      const l = host.worldToLocal(w)
      cupsOff.set(l.x - (ALTAR_D / 2 - 0.375 + CUPS_SHIFT), l.y - 0.03 * KAMI_SC, l.z)
    }
    const CUP_X = ALTAR_D / 2 - 0.375 + CUPS_SHIFT + cupsOff.x, CUP_TOP = 0.05 + cupsOff.y, POUR_Y = 0.085 + cupsOff.y
    const cupZ = [-CUP_DZ_ALTAR, 0, CUP_DZ_ALTAR].map((z) => z + cupsOff.z)
    const rest = { x: FLASK_X, y: 0, z: 0.3 }
    const f = flaskRef.current
    // (one cup after another: 1.1 s each from 0.7 s in, the first quarter second gliding over from the last cup, tipped back a little so
    // nothing spills between, then pouring; all of it eased, nothing jumps)
    const GLIDE = 0.28, EACH = 1.1
    const tt = since - 0.7
    const which = on && tt >= 0 && tt < 3 * EACH ? Math.min(2, Math.floor(tt / EACH)) : on && tt >= 3 * EACH ? 2 : -1
    const inSeg = which >= 0 ? tt - which * EACH : 0
    // (the move to the last cup goes over the top: a little longer)
    const glideT = which === 2 ? 0.45 : GLIDE
    const glide = which > 0 ? THREE.MathUtils.smootherstep(inSeg, 0, glideT) : 1
    const pourK = which >= 0 && tt < 3 * EACH ? THREE.MathUtils.smoothstep(inSeg, which > 0 ? glideT : 0.05, (which > 0 ? glideT : 0.05) + 0.15) * (1 - THREE.MathUtils.smoothstep(inSeg, EACH - 0.12, EACH)) : 0
    // (lifted out and tipped in over the first 0.7 s, set back down over the last 0.6)
    const k = on && since < 4.6 ? THREE.MathUtils.smootherstep(since, 0, 0.7) * (1 - THREE.MathUtils.smootherstep(since, 4.0, 4.6)) : 0
    if (f) {
      // (it pours from beside each cup, on the side away from the oranges: the first two from the near side, the last from the far one,
      // lifted up over the cups to get there, turning upright on the way and tipping the other way)
      const side = (i: number) => (i === 2 ? 1 : -1)
      const zAt = (i: number) => cupZ[i] + side(i) * 0.1337
      const z = which <= 0 ? zAt(0) : THREE.MathUtils.lerp(zAt(which - 1), zAt(which), glide)
      const tipSide = which <= 0 ? -1 : THREE.MathUtils.lerp(side(which - 1), side(which), glide)
      const hop = which > 0 ? Math.sin(Math.PI * glide) * (side(which) !== side(which - 1) ? 0.16 : 0.025) : 0
      // (held well above the cups and their stand, and arcing up as it's lifted across, so it never passes through them or the oranges)
      const arc = Math.sin(Math.PI * k) * 0.06
      // (where it pours is the cups' frame's (the shelf's); the flask's own frame is its piece's, moved as the owner set it (item 21: X 0.0425,
      // Z -0.15): set there as it was, it poured that far off the cups, out of sight behind the shrine, nothing in them (item 58). So taken
      // through the world into its own frame)
      POUR_AT.set(CUP_X, POUR_Y + hop, z)
      if (host && f.parent) { host.updateWorldMatrix(true, false); f.parent.updateWorldMatrix(true, false); f.parent.worldToLocal(host.localToWorld(POUR_AT)) }
      f.position.lerpVectors(REST_AT.set(rest.x, rest.y, rest.z), POUR_AT, k)
      f.position.y += arc
      f.rotation.x = -tipSide * (k * (0.85 + 0.25 * pourK) + Math.sin(since * 9) * 0.01 * pourK)
    }
    const sh = flaskShadow.current
    if (sh) {
      const lift = THREE.MathUtils.smoothstep(k, 0, 0.35)
      sh.scale.setScalar(1 + 0.6 * lift)
      sh.visible = lift < 0.99
      sh.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined; if (m) m.opacity = 1 - lift })
    }
    const pouring = pourK > 0.01
    // (each cup's pour heard as its stream starts (the owner's): as loud as the camera's near, from the side of the picture it's on)
    if (pouring && !wasPouring.current && f) {
      const at = f.getWorldPosition(new THREE.Vector3())
      const d = camera.position.distanceTo(at)
      const ndc = at.clone().project(camera)
      pourSake(EACH - 0.2, Math.min(1, 1.8 / (d + 0.6)), ndc.x)
    }
    wasPouring.current = pouring
    if (streamRef.current) {
      streamRef.current.visible = pouring
      if (pouring) {
        const z = cupZ[which]
        const a = POUR_Y + 0.068, b = CUP_TOP
        // (the stream thins in as it starts and out as it stops, wavering a little)
        streamRef.current.position.set(CUP_X, (a + b) / 2, z)
        streamRef.current.scale.set(pourK * (0.85 + 0.15 * Math.sin(since * 23)), a - b, pourK * (0.85 + 0.15 * Math.cos(since * 19)))
      }
    }
    for (let i = 0; i < 3; i++) {
      const m = liquid.current[i]
      if (!m) continue
      // (each cup fills as the stream is on it: 1.1 s each from 0.7 s in; what shows is the sake's surface, rising from the cup's floor and
      // always just inside its wall at that height (the cup's walls are solid, so the rest of it is hidden), never through it)
      const fill = !on ? 0 : THREE.MathUtils.smoothstep(since - 0.7 - i * 1.1, i ? 0.32 : 0.1, 1.0)
      m.visible = fill > 0
      const h = CUP_FLOOR + (CUP_FULL - CUP_FLOOR) * fill
      m.position.set(ALTAR_D / 2 - 0.375 + CUPS_SHIFT + cupsOff.x, KAMI_SC * (0.03 - 0.0125 + h) + cupsOff.y, [-CUP_DZ_ALTAR, 0, CUP_DZ_ALTAR][i] + cupsOff.z)
      m.scale.setScalar(Math.max(0.0001, KAMI_SC * cupInnerR(h) * 0.96))
    }
  })
  const offer = (e: { stopPropagation: () => void }) => { e.stopPropagation(); if (getEdit().on) return; omiki?.onPour() }
  // (the shrine's front, in the altar's frame: its doors' plane, and the roof's)
  const SC = KAMI_SC
  // (the flask (blender/kamidana.py): clicked, it's lifted and pours the offering; a box round it to point at)
  const flask = (z: number, key: string) => (
    <group key={key} position={[0, 0, z]} onClick={offer} {...tipOver('御神酒', '點一下供清酒')}>
      <KamidanaModel part="flask" />
      <mesh position={[0, 0.075, 0]} visible={false}><boxGeometry args={[0.09, 0.16, 0.09]} /></mesh>
    </group>
  )
  return (
    <group>
      {/* the household shrine (神棚) on the shelf, up against the wall, a size larger than it hung up on a wall */}
      {/* (back against the wall: 1.8 cm further back than the table's back edge (the owner's, 2026-11-11: it stood 2.6 cm off the wall)) */}
      <Movable id="shrine" label="神龕"><group position-x={ALTAR_D / 2 + SHRINE_BACK} scale={SC}>
        {/* (pointed at, the shrine is only named (it isn't clicked: no glow, the cursor as it is); its doors and the flask are what's worked) */}
        <group onPointerOver={(e) => { e.stopPropagation(); if (getEdit().on) return; setTip({ title: '神棚', hint: '供奉惠比壽；點御神酒供酒，點門開關' }) }}
          onPointerOut={() => setTip(null)}>
          <group scale-z={SHRINE_WIDE} scale-x={SHRINE_DEEP}><StaticBatch plain><Kamidana part="shrine" /></StaticBatch></group>
        </group>
        {/* (its doors, which open; the Ebisu inside, a piece of its own: brought back with the shallower shrine, he himself not squashed) */}
        <group scale-x={SHRINE_DEEP}><group position={[-0.14, SHRINE_LIFT, 0]}>
          <ShrineDoors />
          <Movable id="ebisu" label="惠比壽石像"><group scale-x={1 / SHRINE_DEEP} {...nameOver('惠比壽石像', '七福神之一，保佑生意興隆、漁獲豐收')}><KamidanaModel part="ebisu" /></group></Movable>
        </group></group>
      </group></Movable>
      {/* (the vases and the cups beside it, each its own piece: not part of what's pointed at, they don't light with it; the vases not batched,
          a batch takes no clicks, and clicked they change their flowers) */}
      {/* the two little lanterns before the shrine (神前灯籠, the owner's after their photo): beside its base's front corners, between it and
          the vases, lit; clear of the side doors as they open, of the flask and of the book */}
      {[-1, 1].map((sd) => (
        <Movable key={sd} id={`shrinelamp${sd}`} label={sd < 0 ? '神前廊燈（左）' : '神前廊燈（右）'}>
          <group position={[SHRINE_LAMP_X, 0, sd * SHRINE_LAMP_Z]} scale={SC * SHRINE_LAMP_SC} {...nameOver('【廊燈】神前廊燈', '供在神前的木造廊燈，柔和照亮神龕門戶。')}><StaticBatch plain><KamiCopy part="lantern" /></StaticBatch><ContactShadow r={0.032} /></group>
        </Movable>
      ))}
      <Movable id="vase-1" label="花瓶（左）"><group position-x={ALTAR_D / 2} scale={SC}><Kamidana part="vase-1" /></group></Movable>
      <Movable id="vase1" label="花瓶（右）"><group position-x={ALTAR_D / 2} scale={SC}><Kamidana part="vase1" /></group></Movable>
      {/* (5 cm along to the left as the owner set it by hand (2026-11-11)) */}
      <Movable id="shrinecups" label="清酒杯與琉璃台"><group ref={cupsRef} position-x={ALTAR_D / 2 + CUPS_SHIFT + CUPS_SET[0]} position-z={CUPS_SET[1]} scale={SC} {...nameOver('清酒杯', '供神的酒杯；點御神酒壺倒酒')}><StaticBatch plain><Kamidana part="cups" /></StaticBatch></group></Movable>
      <points ref={motes} geometry={moteGeo} frustumCulled={false} renderOrder={4}>
        <pointsMaterial ref={moteMat} map={STAR} vertexColors size={1} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} onBeforeCompile={pointsEach} />
      </points>
      {/* (the sparks thrown out from the cups as it's poured) */}
      <points ref={sparks} geometry={sparkGeo} frustumCulled={false} renderOrder={4} visible={false}>
        <pointsMaterial map={STAR} vertexColors size={1} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} onBeforeCompile={pointsEach} />
      </points>
      {/* (and the flash of light up from them) */}
      <sprite ref={flash} position={[CUPS_FX, 0.07, 0]} visible={false} renderOrder={5} raycast={NO_RAY}>
        <spriteMaterial map={GLOW} color="#ffe39a" transparent opacity={0} depthWrite={false} toneMapped={false} />
      </sprite>
      {/* (the Ebisu's halo, a faint glow while the doors are open (not drawn while they're shut, item 567), bright while blessed) */}
      <sprite ref={halo} position={[EBISU_AT[0] - 0.01, EBISU_AT[1], EBISU_AT[2]]} scale={0.16} renderOrder={4} raycast={NO_RAY}>
        <spriteMaterial map={GLOW} color="#ffd27a" transparent opacity={0.18} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      {/* (a faint rainbow aura round him while blessed, its colours slowly turning) */}
      <sprite ref={aura} position={[EBISU_AT[0] - 0.012, EBISU_AT[1], EBISU_AT[2]]} scale={0.17} visible={false} renderOrder={5} raycast={NO_RAY}>
        <spriteMaterial map={AURA} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      {/* (the ripple of light spreading once from the cups as the offering's poured) */}
      {/* (and a ring of light spreading out across the table once from the shrine, as the offering's taken: as it first was) */}
      {/* (just over the shelf's top, so all of it shows on the shelf; gold drawn over, not only added, so it shows by day as well as by night) */}
      <mesh ref={ring} position={EBISU_FEET} rotation-x={-Math.PI / 2} visible={false} renderOrder={4}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={RIPPLE} color="#ffc95a" transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={ring2} position={[EBISU_FEET[0], EBISU_FEET[1] + 0.001, EBISU_FEET[2]]} rotation-x={-Math.PI / 2} visible={false} renderOrder={4}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={RIPPLE} color="#fff0c0" transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>
      <pointLight ref={lamp} position={[EBISU_AT[0] - 0.06, EBISU_AT[1] + 0.02, EBISU_AT[2]]} color="#ffc070" intensity={0} distance={0.9} decay={2} />
      {/* the offering of sake (御神酒): a pair of white flasks either side of the oranges, and a flat cup before them that the
          sake's poured into: only the shrine itself is clicked, to make the offering */}
      <Movable id="sutra" label="經書"><group {...nameOver('經書', '般若心經，供在神前')}><Sutra /></group></Movable>
      <Movable id="flask" label="御神酒壺"><group ref={flaskRef} position={[FLASK_X, 0, 0.3]}>{flask(0, 'f')}</group>
        {/* (its shadow stays on the stand where it stood: fading and spreading as it's lifted off, not carried up with it) */}
        <group ref={flaskShadow} position={[FLASK_X, 0, 0.3]}><ContactShadow r={0.055} /></group></Movable>
      {/* (the clear sake: a thin stream down into the cup, and the cups, each filling with it) */}
      <mesh ref={streamRef} visible={false}>
        <cylinderGeometry args={[0.0012, 0.0012, 1, 6]} /><meshBasicMaterial color="#e6f4ff" transparent opacity={0.55} depthWrite={false} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(m) => { liquid.current[i] = m }} position={[ALTAR_D / 2 - 0.375 + CUPS_SHIFT, 0.035, [-CUP_DZ_ALTAR, 0, CUP_DZ_ALTAR][i]]} rotation-x={-Math.PI / 2} visible={false}>
          <circleGeometry args={[1, 24]} /><meshBasicMaterial color="#e3f1fb" transparent opacity={0.8} depthWrite={false} />
        </mesh>
      ))}
      {/* the oranges on their dish, a leaf on the top one */}
      {/* (in front of the cups' stand, a little smaller: where the owner set it in the edit panel (X −0.010, Z −0.203); brought back and made
          a touch smaller with the shallower table) */}
      {/* (the offerings on two 三方 stands (the owner's, 2026-11-11, after a photo): the oranges on one in the room the cups' stand leaves
          on its right, glutinous rice dumplings on the other before the left lantern) */}
      <Movable id="oranges" label="三方（橘子）">
        <group name="look-oranges" position={[-0.08, 0, 0.139]} scale={SANBO_SIZE} {...nameOver('椪柑', '供品，圓滿吉祥')}>
          <Sanbo /><group position-y={SANBO_FLOOR} scale={0.76}><OrangePlate bare /></group><ContactShadow r={0.05} />
        </group>
      </Movable>
      <Movable id="oranges2" label="三方（糯米糰子）">
        <group position={[-0.11, 0, -0.24]} scale={SANBO_SIZE} {...nameOver('糯米糰子', '供品，白糰子疊成小山')}>
          <Sanbo /><group position-y={SANBO_FLOOR}><SanboPart name="Dango" /></group><ContactShadow r={0.05} />
        </group>
      </Movable>
    </group>
  )
}
