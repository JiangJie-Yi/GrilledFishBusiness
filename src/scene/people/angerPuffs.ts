import * as THREE from 'three'
import { warmLater } from '@/scene/render/Prewarm'

/**
 * Anger's steam, a cartoon's (item 534, the owner's 「氣餔餔應該是有點像爆炸一團團煙的感覺」: it was three soft white dots rising one
 * after another, a customer's (FolkFigure) and the staff's (crewEmote) alike): every so often a clump of puffs bursts out of the crown,
 * flung up and out in a fan, each a beat after the last, popping out past its size and back, slowing as it goes, then shrinking away; three
 * to a burst at first, six and bigger and oftener as they get crosser; out of the crown (the hair's or the hat's top), not the head's middle. Each puff a cumulus of round lobes, white going to a cool grey
 * underneath, edged in ink as the figures are; three shapes, so a burst's puffs aren't one stamp. Sprites facing the camera, over
 * everything as an emote is; their program made at load.
 */
const LOBES = [
  [[64, 76, 29], [38, 80, 20], [90, 80, 20], [50, 52, 22], [80, 54, 19]],
  [[60, 74, 30], [87, 82, 19], [35, 84, 17], [72, 48, 24], [43, 56, 17]],
  [[66, 78, 27], [40, 72, 22], [91, 72, 19], [62, 48, 23], [87, 52, 14]],
]
const TEX = LOBES.map((lobes) => {
  if (typeof document === 'undefined') return null
  const n = 128, c = document.createElement('canvas')
  c.width = c.height = n
  const g = c.getContext('2d')!
  const disc = (x: number, y: number, r: number) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill() }
  // (the ink: each lobe drawn a little bigger in ink first, the cloud over it: only the outer edge of them all shows)
  g.fillStyle = '#3b2e27'
  for (const [x, y, r] of lobes) disc(x, y, r + 4.5)
  const fill = g.createLinearGradient(0, 22, 0, 108)
  fill.addColorStop(0, '#ffffff'); fill.addColorStop(0.55, '#f4f3f1'); fill.addColorStop(1, '#c9d0da')
  g.fillStyle = fill
  for (const [x, y, r] of lobes) disc(x, y, r)
  // (a curl of ink where the upper lobes sit on the lower, as a drawn cloud's are: the lower part of each upper lobe's edge)
  g.strokeStyle = 'rgba(59, 46, 39, 0.55)'
  g.lineWidth = 2.5
  g.lineCap = 'round'
  for (const [x, y, r] of lobes.slice(3)) { g.beginPath(); g.arc(x, y, r - 1, Math.PI * 0.62, Math.PI * 0.98); g.stroke() }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
})
const MATS = TEX.map((map) => new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, depthTest: false }))
if (typeof document !== 'undefined') { const g = new THREE.Group(); g.add(...MATS.map((m) => new THREE.Sprite(m))); warmLater(g) }

/** the head's crown in its own frame (a customer's: their head's bone): the highest of the vertices it carries, hair, hat and all, as they're
 * bound to it; a guess (0.42, the anger mark's height) if it can't be told */
export function crownOf(mesh: THREE.SkinnedMesh | null | undefined, bone: THREE.Object3D | null | undefined) {
  const sk = mesh?.skeleton, bi = sk && bone ? sk.bones.indexOf(bone as THREE.Bone) : -1
  if (!mesh || !sk || bi < 0) return 0.42
  const cached = CROWNS.get(mesh.geometry)?.get(bi)
  if (cached !== undefined) return cached
  const pos = mesh.geometry.attributes.position, idx = mesh.geometry.attributes.skinIndex, wt = mesh.geometry.attributes.skinWeight
  const m = new THREE.Matrix4().multiplyMatrices(sk.boneInverses[bi], mesh.bindMatrix), v = new THREE.Vector3()
  let top = -Infinity
  for (let i = 0; i < pos.count; i++) {
    // (its own: its bone that one, carrying most of it)
    if (!idx || idx.getX(i) !== bi || (wt && wt.getX(i) < 0.5)) continue
    top = Math.max(top, v.fromBufferAttribute(pos, i).applyMatrix4(m).y)
  }
  const crown = Number.isFinite(top) ? top : 0.42
  if (!CROWNS.has(mesh.geometry)) CROWNS.set(mesh.geometry, new Map())
  CROWNS.get(mesh.geometry)!.set(bi, crown)
  return crown
}
const CROWNS = new WeakMap<THREE.BufferGeometry, Map<number, number>>()

/** out with an overshoot: 0 to 1, past it a little at about two thirds of the way, back to 1 */
const backOut = (x: number) => { const c = 1.9, y = x - 1; return 1 + (c + 1) * y * y * y + c * y * y }

export type PuffBurst = {
  /** its puffs, to add to the frame they're thrown in (the head's) */
  sprites: THREE.Sprite[]
  /** each frame: the time (s), whether it's steaming, how cross (0..1: more, bigger, oftener) */
  update: (t: number, on: boolean, hot: number) => void
  /** 0..1 rising over the moment before a burst (the mark beside the head swelling to it), and falling over the moment after (giving) */
  windUp: (t: number) => number
  give: (t: number) => number
}

/**
 * A cross one's steam: `n` puffs (enough for one burst's five while the last one's are still going), thrown from (0, `y0`, 0) of the frame
 * they're added to, as far as `reach` times a head's and as big as `big` times (a customer's head's own frame: 1 and 1)
 */
export function puffBurst(n: number, y0: number, reach = 1, big = 1): PuffBurst {
  const sprites = Array.from({ length: n }, (_, i) => { const s = new THREE.Sprite(MATS[i % MATS.length]); s.renderOrder = 19; s.visible = false; return s })
  // (each puff: its burst's start, its life, where it's thrown to and how big it grows)
  const st = sprites.map(() => ({ at: -1, life: 1, dx: 0, dy: 0, dz: 0, size: 0 }))
  let next = -1, burst = -1
  return {
    sprites,
    windUp: (t) => (next > 0 ? Math.max(0, 1 - (next - t) / 0.18) : 0),
    give: (t) => (burst > 0 ? Math.max(0, 1 - (t - burst) / 0.2) : 0),
    update(t, on, hot) {
      if (!on) {
        // (calmed down: nothing left half-thrown for the next time)
        if (next >= 0 || burst >= 0) { next = burst = -1; for (const s of st) s.at = -1; for (const p of sprites) p.visible = false }
        return
      }
      if (next < 0) next = t + 0.2
      else if (t >= next) {
        const k = 4 + Math.round(2 * hot)
        for (let i = 0, j = 0; i < st.length && j < k; i++) {
          const s = st[i]
          if (s.at >= 0 && t - s.at < s.life) continue
          // (spread across the fan, -75 to 75 degrees off straight up, a little jitter; thrown 20 to 36 of a head's frame)
          const a = ((j + 0.5) / k - 0.5) * 2.6 + (Math.random() - 0.5) * 0.3
          const d = (0.2 + 0.1 * Math.random() + 0.06 * hot) * reach
          s.at = t + j * 0.05
          s.life = 0.75 + 0.2 * Math.random()
          s.dx = Math.sin(a) * d
          s.dy = Math.cos(a) * d * 0.9 + 0.04 * reach
          s.dz = (Math.random() - 0.5) * 0.06 * reach
          s.size = (0.16 + 0.07 * Math.random()) * (0.85 + 0.35 * hot) * big
          j++
        }
        burst = t
        next = t + (1.1 - 0.4 * hot) * (0.85 + 0.3 * Math.random())
      }
      sprites.forEach((p, i) => {
        const s = st[i], u = s.at < 0 ? -1 : (t - s.at) / s.life
        if (u < 0 || u >= 1) { p.visible = false; return }
        p.visible = true
        // (flung out fast and slowing, rising a little more as it goes; popped out with an overshoot, held, then shrinking away)
        const e = 1 - (1 - u) ** 3
        p.position.set(s.dx * e, y0 + s.dy * e + 0.05 * reach * u * u, 0.02 * reach + s.dz * e)
        const pop = u < 0.2 ? 0.15 + 0.85 * backOut(u / 0.2) : 1
        const gone = u > 0.55 ? 1 - ((u - 0.55) / 0.45) ** 2 : 1
        p.scale.setScalar(s.size * pop * gone)
      })
    },
  }
}
