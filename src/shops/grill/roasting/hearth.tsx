import { memo, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { surfaceY } from '@/game/kitchen/coalPile'
import { ashMaterial, useBinchotan } from '@/shops/grill/binchotanModel'
import { ALONG, FIRE_SHIFT, LAY, COOK_NOTCH, SOUS_NOTCH } from '@/shops/grill/bar'

/** how much bigger the fire pit (its ground and stones) is drawn than modelled */
export const PIT_SCALE = 1.3
/**
 * The pit's ground texture is white salt inside and brown earth out to a fading rim: the earth is kept, but darkened and
 * browned further out like ground scorched by heat, and the disc drawn a little smaller (PIT_GROUND).
 */
export const PIT_GROUND = 0.9
export function scorchEarth(mesh: THREE.Mesh) {
  const mat = mesh.material as THREE.MeshStandardMaterial
  const img = mat.map?.image as CanvasImageSource & { width: number; height: number } | undefined
  if (!img || typeof document === 'undefined') return
  const c = document.createElement('canvas')
  c.width = img.width
  c.height = img.height
  const g = c.getContext('2d')!
  g.drawImage(img, 0, 0)
  const px = g.getImageData(0, 0, c.width, c.height)
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      const r = Math.hypot(x / c.width - 0.5, y / c.height - 0.5) * 2
      const i = (y * c.width + x) * 4
      // (the salt fills the ring right out under the stones, pure salt to r = 0.58 whatever tone the model's earth had; past it the earth goes
      // darker and redder-brown toward the rim, the way fired ground does, multiplied in as a stain, and never over the salt)
      const k = Math.min(1, Math.max(0, (r - 0.66) / 0.3))
      const grainS = 0.84 + 0.16 * ((px.data[i] + px.data[i + 1] + px.data[i + 2]) / 765)
      const saltness = 1 - Math.min(1, Math.max(0, (r - 0.58) / 0.08))
      const mul = 1 - k
      const er = px.data[i] * (mul + k * (px.data[i] / 255) * 0.75), eg = px.data[i + 1] * (mul + k * (px.data[i + 1] / 255) * 0.65), eb = px.data[i + 2] * (mul + k * (px.data[i + 2] / 255) * 0.6)
      px.data[i] = er + (236 * grainS - er) * saltness
      px.data[i + 1] = eg + (231 * grainS - eg) * saltness
      px.data[i + 2] = eb + (220 * grainS - eb) * saltness
      const edge = Math.min(1, Math.max(0, (r - 0.7) / 0.28))
      // (powdery: the ring's alpha grained with fine noise, thinning to scattered specks at its edge, not a hard disc)
      const grain = 0.55 + 0.9 * Math.random()
      px.data[i + 3] *= r < 0.66 ? 1 : Math.min(1, (1 - 0.3 * k) * (1 - edge * edge * (3 - 2 * edge)) * (edge > 0.2 ? grain : 1))
    }
  }
  g.putImageData(px, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.flipY = mat.map!.flipY
  t.colorSpace = mat.map!.colorSpace
  t.anisotropy = mat.map!.anisotropy
  mat.map = t
  mat.transparent = true
  // (the ground is drawn first and writes its depth, so the scene's shadow-only floor, which sits a hair under it, can never be drawn over the
  // salt from any angle: that was the net's and the coals' shadows laid across it as stripes)
  mat.depthWrite = true
  mat.alphaTest = 0.06
  mesh.renderOrder = -2
  mat.needsUpdate = true
}
/** the soft orange pool of light a heap of embers throws on what's round it: a radial gradient, drawn once */
const EMBER_GLOW = (() => {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  gr.addColorStop(0, 'rgba(255,140,50,0.9)'); gr.addColorStop(0.4, 'rgba(255,90,20,0.35)'); gr.addColorStop(1, 'rgba(255,60,10,0)')
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(c)
})()
/**
 * The bed of ash between and under the sticks: grey granular clumps (blender/binchotan.py's BinAsh), lying flat on the salt (none on a point,
 * none in the air), some with a faint red in them while the fire's up (what's left of burnt sticks: not a blaze), and a pool of orange light on
 * the salt.
 */
export const EmberBed = memo(EmberBedImpl)
function EmberBedImpl({ fuel }: { fuel: { current: number } }) {
  const lumps = useMemo(() => {
    let seed = 23
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const groups: { m: THREE.Matrix4[]; k: number }[] = [{ m: [], k: 0.35 }, { m: [], k: 0.12 }, { m: [], k: 0 }]
    // (fine and many, flatter, crumbled, heaped more toward the middle where the sticks burn down)
    for (let i = 0; i < 132; i++) {
      const a = rnd() * Math.PI * 2, r = 0.33 * rnd() ** 0.9
      const x = Math.cos(a) * r, z = Math.sin(a) * r, s = 0.45 + rnd() * 0.85
      // (lying flat, only turned about the vertical, its flat underside a hair into the salt so no gap shows under it)
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6.28)
      const m = new THREE.Matrix4().compose(new THREE.Vector3(x, surfaceY(x, z, PIT_LIFT) - 0.002, z), q, new THREE.Vector3(s * (0.85 + rnd() * 0.5), s * (0.35 + rnd() * 0.4), s * (0.85 + rnd() * 0.5)))
      groups[i % 3].m.push(m)
    }
    return groups
  }, [])
  const bin = useBinchotan()
  // (three greys: pale, ashen, and a darker one of half-burnt bits)
  const mats = useMemo(() => lumps.map((_, i) => { const m = ashMaterial(bin); m.emissive.set('#a8280a'); m.color.multiplyScalar([1.15, 0.9, 0.62][i]); return m }), [lumps, bin])
  const refs = useRef<(THREE.InstancedMesh | null)[]>([])
  const pool = useRef<THREE.Mesh>(null)
  useLayoutEffect(() => {
    lumps.forEach((gr, i) => { const im = refs.current[i]; if (im) { gr.m.forEach((m, j) => im.setMatrixAt(j, m)); im.instanceMatrix.needsUpdate = true } })
  }, [lumps])
  // (each lump set down on the salt as it's actually modelled (the fire pit's mesh, measured once it's there): a height map of its top in
  // the bed's own frame, every lump's foot put on it, so none floats over the salt or sinks out of sight)
  const settled = useRef(false)
  useFrame(({ scene }) => {
    if (settled.current) return
    const pit = scene.getObjectByName('FirePit') as THREE.Mesh | undefined
    const im0 = refs.current[0]
    if (!pit?.geometry || !im0) return
    settled.current = true
    const toLocal = im0.parent!.matrixWorld.clone().invert()
    const N = 48, R = 0.4, top = new Float32Array(N * N).fill(-Infinity)
    const pa = pit.geometry.attributes.position, v = new THREE.Vector3()
    for (let i = 0; i < pa.count; i++) {
      v.fromBufferAttribute(pa, i).applyMatrix4(pit.matrixWorld).applyMatrix4(toLocal)
      const gx = Math.floor((v.x + R) / (2 * R) * N), gz = Math.floor((v.z + R) / (2 * R) * N)
      if (gx >= 0 && gz >= 0 && gx < N && gz < N) top[gz * N + gx] = Math.max(top[gz * N + gx], v.y)
    }
    const at = (x: number, z: number) => {
      const gx = Math.floor((x + R) / (2 * R) * N), gz = Math.floor((z + R) / (2 * R) * N)
      let h = -Infinity
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const k = (gz + dz) * N + gx + dx; if (k >= 0 && k < top.length) h = Math.max(h, top[k]) }
      return h
    }
    // (the salt's own level, the commonest height under the lumps: none set up on the rim's stones or the grate's feet, held to the salt)
    const hs = lumps.flatMap((gr) => gr.m.map((m) => at(m.elements[12], m.elements[14]))).filter(Number.isFinite).sort((a, b) => a - b)
    const salt = hs[hs.length >> 1] ?? 0
    const p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3()
    lumps.forEach((gr, i) => {
      const im = refs.current[i]
      if (!im) return
      gr.m.forEach((m, j) => {
        m.decompose(p, q, sc)
        const h = Math.min(at(p.x, p.z), salt + 0.012)
        if (Number.isFinite(h)) { p.y = h - 0.003; m.compose(p, q, sc); im.setMatrixAt(j, m) }
      })
      im.instanceMatrix.needsUpdate = true
    })
  })
  useFrame(({ clock }) => {
    const f = Math.max(0, fuel.current), t = clock.elapsedTime
    mats.forEach((m, i) => {
      const flick = 0.85 + 0.15 * Math.sin(t * (2.1 + i) + i * 1.7)
      // (ash of what's burnt through: at most a faint red in it while the fire's up)
      m.emissiveIntensity = lumps[i].k * Math.min(1.2, f) * flick
    })
    if (pool.current) {
      pool.current.visible = f > 0.03
      ;(pool.current.material as THREE.MeshBasicMaterial).opacity = Math.min(0.85, 0.75 * Math.min(1.2, f) ** 1.2) * (0.9 + 0.1 * Math.sin(t * 3.1))
    }
  })
  return (
    <>
      {lumps.map((gr, i) => <instancedMesh key={i} ref={(m) => { refs.current[i] = m }} args={[bin.ash(i * 2), mats[i], gr.m.length]} frustumCulled={false} receiveShadow />)}
      <mesh ref={pool} position-y={surfaceY(0, 0, PIT_LIFT) + 0.03} rotation-x={-Math.PI / 2} renderOrder={2}>
        <planeGeometry args={[1.5, 1.5]} />
        <meshBasicMaterial map={EMBER_GLOW} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
    </>
  )
}
/** the most sticks of charcoal the bed holds at once, and how long one lasts once it's burning, in game seconds (it burns down to a third of its length, then it's ash) */
export const UP_AXIS = new THREE.Vector3(0, 1, 0)
export const COAL_LAST_S = 300
/** how far through its life one the fire's level holds burning stays: glowing, short of where its ash coat starts (0.72) */
export const COAL_HOLD_S = 0.6 * COAL_LAST_S
/** how long a fresh stick of charcoal takes to kindle to red-hot, in game seconds */
export const COAL_KINDLE_S = 22
/** how much higher the salt is heaped in the pit than it was modelled */
export const PIT_SALT_RISE = 2.4
/** how much higher the pit (its stones, coals and net) stands than it was modelled, with the flames and smoke over it */
export const PIT_LIFT = 0
/** the way the charcoal's rows run in its bed: along the table, as the hearth's frame does (item 211) */
export const BED_TURN = Math.atan2(ALONG.z, ALONG.x)
export const PIT_PARTS = /^(FirePit|Stone|Robuchi|Charcoal|BinchotanHeap)/
/** how often the kitchen says a side couldn't be had (real ms): once, then not again for a while (item 229) */
export const SIDE_SAY_MS = 90000
/** the stone ring's outer edge: nothing can be pushed into the fire */
export const RING_CLEAR = 1.15 * PIT_SCALE
/** the square hearth's frame (炉縁, blender/grilledfish.py IRORI_IN + IRORI_W), its outer half-width as drawn: square to the table, along
 * ALONG and LAY; nothing is set down on it or inside it (sized so the table's front row of plates, bowls and the board stand clear of it) */
export const HEARTH_HALF = (0.8 + 0.13) * PIT_SCALE
/** the hearth a little longer along the table than across it (an oblong 囲炉裏): its frame and bed stretched this much along */
export const HEARTH_LONG = 1.15
/** a thing at `at` (from the fire's middle) of reach `r`, or a w x d board turned to the table, moved out of the square hearth the short way */
export function clearOfHearth(at: THREE.Vector3, r: number, w = 0, d = 0) {
  for (let k = 0; k < 2; k++) {
    const u = at.dot(ALONG), v = at.dot(LAY)
    const hu = HEARTH_HALF * HEARTH_LONG + r + w / 2, hv = HEARTH_HALF + r + d / 2
    if (Math.abs(u) < hu && Math.abs(v) < hv) {
      if (hu - Math.abs(u) < hv - Math.abs(v)) at.addScaledVector(ALONG, Math.sign(u || 1) * hu - u)
      else at.addScaledVector(LAY, Math.sign(v || 1) * hv - v)
    }
    // (nor over the notch cut into the table's front: moved along to its nearer side, where there's table under it)
    const a = at.dot(ALONG) + FIRE_SHIFT.dot(ALONG), l = at.dot(LAY) + FIRE_SHIFT.dot(LAY)
    const [n0, n1] = COOK_NOTCH.along, ha = r + w / 2
    if (l + r + d / 2 > COOK_NOTCH.lay[0] && a + ha > n0 && a - ha < n1) at.addScaledVector(ALONG, a - n0 < n1 - a ? n0 - ha - a : n1 + ha - a)
    // (nor over the third cook's bay at its far end: moved across to its nearer side)
    const [m0, m1] = SOUS_NOTCH.lay, hl = r + d / 2
    if (a + ha > SOUS_NOTCH.along[0] && l + hl > m0 && l - hl < m1) at.addScaledVector(LAY, l - m0 < m1 - l ? m0 - hl - l : m1 + hl - l)
  }
}
/** whether a round thing at (a, l) (the table's frame) of reach r is over the third cook's bay, where there's no top */
export const overSousBay = (a: number, l: number, r: number) => a + r > SOUS_NOTCH.along[0] && l + r > SOUS_NOTCH.lay[0] && l - r < SOUS_NOTCH.lay[1]
