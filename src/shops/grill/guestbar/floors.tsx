import { memo, useEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { StaticBatch, mergeByMaterial } from '@/scene/render/StaticBatch'
import { FloorPiece } from '@/scene/props/FloorPiece'
import { inkModel } from '@/scene/render/inkHull'
import { WC_W, WC_ROOM, kitchenOf, kitchenGatesOf, FLOOR_FAR, FLOOR_NEAR, GENKAN, storeOf, STORE, toiletsOf, roomOf, RICE_MAT, WALL_OUT, farOf, type Counter } from '@/shops/grill/bar'
import { WC_BACK_LINE } from '@/shops/grill/dining/wc'
import { Movable } from '@/shops/grill/editor/Movable'
import { drainSpot, outlineOf, plinthPlan, type PlinthPlan, type Rect, type Run } from '@/game/world/groundLayout'
import { normalFromHeight } from '@/scene/render/normalFromHeight'
import { seigaiha } from '@/scene/props/edoPatterns'
import { EARTH_Y, ShopGround } from './ground'
import { DRAIN_CLEAR, DRAIN_FROM, ShopDrain } from './drain'

/**
 * The customers' side of the shop floored in wide old boards: one even rectangle under the whole bar, the row of
 * stools and the way along behind them to the noren, its boards running the length of the bar.
 */
function DiningFloorImpl({ c, from, to, near = FLOOR_NEAR, far = FLOOR_FAR, wall = true, bare = false }: { c: Counter; from: number; to: number; near?: number
  far?: number
  /** a dark edging board along its far side, where it meets the wall */
  wall?: boolean
  /** only the edging board (the floor itself laid as one, under the whole room) */
  bare?: boolean }) {
  const yaw = Math.atan2(c.along.x, c.along.z)
  // (in the floor's own frame: z along the bar, x away from the cook, so lay is -x; its boards are laid from the
  // world, so they run straight on into the next piece's and the kitchen's, no seam between)
  const w = near - far
  const l = to - from
  return (
    <group position={c.at} rotation-y={yaw}>
      {!bare && <FloorPiece w={w} l={l} position={[-(near + far) / 2, 0.004, (from + to) / 2]} />}
      {wall && (
        <mesh position={[-far, 0.01, (from + to) / 2]}>
          <boxGeometry args={[0.04, 0.02, l]} />
          <meshToonMaterial color="#3a2416" />
        </mesh>
      )}
    </group>
  )
}

/** the whole room's floor in one piece, a rectangle under the counters, the kitchen and the way in (roomOf) */
/** what's left of a rectangle (along, lay) when another is cut out of it */
function minus(al: [number, number], ly: [number, number], h: { along: [number, number]; lay: [number, number] }) {
  const ha0 = Math.max(al[0], h.along[0]), ha1 = Math.min(al[1], h.along[1])
  const hl0 = Math.max(ly[0], h.lay[0]), hl1 = Math.min(ly[1], h.lay[1])
  if (ha0 >= ha1 || hl0 >= hl1) return [[al, ly] as [[number, number], [number, number]]]
  const out: [[number, number], [number, number]][] = []
  if (ha0 > al[0]) out.push([[al[0], ha0], ly])
  if (ha1 < al[1]) out.push([[ha1, al[1]], ly])
  if (hl0 > ly[0]) out.push([[ha0, ha1], [ly[0], hl0]])
  if (hl1 < ly[1]) out.push([[ha0, ha1], [hl1, ly[1]]])
  return out
}
const RISER = '#3a2416'
/**
 * The genkan's footing in stone (item 287, the owner's, 2026-11-17: 「門口的厚度要改成石造」: seen from above, the edge of the genkan was a
 * dark board), in the genkan floor's crazy paving (item 395); every face of the way in's stone its own course of whole stones (item 404, the
 * owner's 「切得很怪」: one picture of the paving laid over them all at one scale, its stones cut off wherever a face ended): the steps, the
 * footing's band over them, the footing's sides and the genkan's side by the wall, each a part of blender/stonesteps.py's
 * made to its measure (STONE_MADE), scaled to it as it stands
 */
/** how far out each of the doorway's stone steps reaches (the bar's units: a tread a third of a metre deep, the dining room's metres) */
const STEP_GO = 0.17
/** the steps themselves (item 352, the owner's 「石階梯太假了吧」: they were boxes in the base's masonry picture, bricks stacked); now each
 * (and the band over them) stones of their own on each face that shows, as the genkan's floor is made, in a recessed pebble-wash, moss in
 * their shaded corners (item 424, the owner's 「這石階跟裡面比，不夠精緻，其次是可以加點青苔感。」: they were slabs with a picture of stones on
 * them): blender/stonesteps.py; made at the doorway's measure as it stood, each scaled to it as it stands (within a percent) */
const STEPS_URL = import.meta.env.BASE_URL + 'models/stonesteps.glb'
useGLTF.preload(STEPS_URL)
/** each part's size as made (blender/stonesteps.py's SLABS): the footing's band over the upper step (item 404: a riser of its own, laid on the
 * footing's face), the upper step, the lower; the footing (the genkan's side's low curb over it, StoneSide, taken away: item 539) */
const STONE_MADE: Record<string, [number, number, number]> = { StoneStep0: [1.2369, 0.1123, 0.012], StoneStep1: [1.2329, 0.2247, 0.168],
  StoneStep2: [1.2289, 0.1123, 0.168], StoneFoot: [1.2369, 0.337, 1.3155] }
/** the way in's stone in the room's toon light, made once for each of the model's materials and shared by all its parts (the stones' tints
 * in their points' colour, item 424) */
const PAVING = new Map<THREE.Material, THREE.MeshToonMaterial>()
function pavingOf(sm: THREE.MeshStandardMaterial, tinted: boolean) {
  let t = PAVING.get(sm)
  if (!t) {
    t = new THREE.MeshToonMaterial({ color: '#ffffff', map: sm.map ?? null, normalMap: sm.normalMap ?? null, vertexColors: tinted })
    // (the steps' stones as smooth as the genkan's inside (item 485: 「光澤還差這麼一點」): its normals at the floor's 0.8)
    if (sm.normalMap && /StepStone/.test(sm.name)) t.normalScale.set(0.8, 0.8)
    t.name = sm.name
    PAVING.set(sm, t)
  }
  return t
}
/** the way in's stone parts by name, each a copy of its own in the room's light (each piece of the scene its own object; a step its three
 * materials' meshes under it, item 424) */
function useStoneParts(names: string[]) {
  const gltf = useGLTF(STEPS_URL) as unknown as { scene: THREE.Group }
  const key = names.join()
  return useMemo(() => {
    const out: Record<string, THREE.Object3D> = {}
    for (const n of key.split(',')) {
      const m = gltf.scene.getObjectByName(n)!.clone(true)
      m.position.set(0, 0, 0)
      m.traverse((o) => {
        const me = o as THREE.Mesh
        if (!me.isMesh) return
        me.material = pavingOf(me.material as THREE.MeshStandardMaterial, !!me.geometry.attributes.color)
        me.receiveShadow = true
      })
      out[n] = m
    }
    return out
  }, [gltf, key])
}
/** a part laid in the box from (x0, y0, z0) to (x1, y1, z1) of its parent's frame: its middle there, scaled from its made size to fit */
function laid(part: THREE.Object3D, made: [number, number, number], [x0, y0, z0]: number[], [x1, y1, z1]: number[]) {
  return { object: part, position: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2] as [number, number, number],
    scale: [Math.abs(x1 - x0) / made[0], Math.abs(y1 - y0) / made[1], Math.abs(z1 - z0) / made[2]] as [number, number, number] }
}
/** the stone plinth (石台, item 744, the owner's 「約五分之三的部份做成石台」 over the base's lower courses): how far it stands proud of the
 * base's faces; how far it goes down into the earth (none of it in the air over it); how much of its face one repeat of its picture covers
 * along it (up it, its two courses from the earth to its top). Its top the rim board's foot: of the base as it's seen, from the floor's edge
 * (the fill under the boards shows over the rim) down to the earth, 0.279 of 0.462, three fifths */
const PLINTH_OUT = 0.018, PLINTH_SUNK = 0.015, PLINTH_U = 2
/**
 * The plinth's granite (御影石), cut and laid in two courses (切石積み) as the steps' stone is: blocks of their own lengths (0.28 to 0.56), their
 * joints staggered course to course, each its own grey (warm or cool, as the steps' are), flecked dark and pale, its top edge catching the
 * light and its foot a shade darker; the joints dark; the lower course's foot stained with the earth splashed up on it, a little moss along
 * it. Its height a picture (each block raised, its edges rounded off, the joints sunk) made into its normal map. Its ends meet (the blocks
 * wrap round); its rows run down its v (the earth at its foot, v 1).
 */
const PLINTH_MAT = (() => {
  if (typeof document === 'undefined') return null
  const W = 1024, H = 128, PX = W / PLINTH_U, CH = H / 2, J = 3
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const g = c.getContext('2d')!
  const hc = document.createElement('canvas')
  hc.width = W; hc.height = H
  const hg = hc.getContext('2d')!
  let seed = 744
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  g.fillStyle = '#3a3731'; g.fillRect(0, 0, W, H)
  hg.fillStyle = '#000'; hg.fillRect(0, 0, W, H)
  // (a shade darker than the curb's pale granite, nearer the steps' weathered grey: a foundation's stone, not a kerb's)
  const tones = [[126, 124, 116], [136, 133, 124], [117, 115, 108], [144, 140, 131], [110, 109, 103], [130, 129, 123]]
  for (let k = 0; k < 2; k++) {
    // (its blocks: the top course's from its top edge (the plinth's top: no joint there), the lower's down past the picture's foot (in the earth))
    const y0 = k ? CH + J / 2 : 0, y1 = k ? H + 6 : CH - J / 2
    const joints: number[] = []
    let x = rnd() * PX * 0.5 + k * PX * 0.17
    while (joints.length === 0 || x < joints[0] + W - 0.28 * PX) { joints.push(x); x += (0.28 + rnd() * 0.28) * PX }
    for (let b = 0; b < joints.length; b++) {
      const xa = joints[b], xb = b + 1 < joints.length ? joints[b + 1] : joints[0] + W
      const [r0, g0, b0] = tones[Math.floor(rnd() * tones.length)]
      const sh = 0.94 + rnd() * 0.1, warm = (rnd() - 0.5) * 8
      const col = (f: number) => `rgb(${Math.round(r0 * sh * f + warm)},${Math.round(g0 * sh * f)},${Math.round(b0 * sh * f - warm)})`
      const flecks = Array.from({ length: Math.round((xb - xa) * 1.4) }, () => [rnd(), rnd(), rnd(), rnd()])
      for (const off of [0, -W]) {
        const bx = xa + off + J / 2, bw = xb - xa - J, bh = Math.min(y1, H) - y0
        // (lighter at its top, its own grey through the middle, darker at its foot)
        const gr = g.createLinearGradient(0, y0, 0, y0 + bh)
        gr.addColorStop(0, col(1.1)); gr.addColorStop(0.16, col(1.0)); gr.addColorStop(0.85, col(0.94)); gr.addColorStop(1, col(0.84))
        g.fillStyle = gr; g.fillRect(bx, y0, bw, bh)
        for (const [fx, fy, fr, fk] of flecks) {
          g.fillStyle = fk < 0.5 ? 'rgba(40,38,34,0.5)' : fk < 0.8 ? 'rgba(98,94,86,0.45)' : 'rgba(238,234,224,0.6)'
          g.fillRect(bx + fx * bw, y0 + fy * bh, 1 + fr * 1.6, 1 + fr * 1.2)
        }
        g.fillStyle = 'rgba(255,252,240,0.26)'; g.fillRect(bx, y0, bw, 2)
        if (!k) { g.fillStyle = 'rgba(20,18,14,0.3)'; g.fillRect(bx, y0 + bh - 2, bw, 2) }
        // (its height: raised, its edges rounded off over 4 px; the top course's top edge left square (the plinth's own corner), the lower's
        // foot in the earth)
        for (let i = 0; i < 4; i++) {
          const v = 80 + i * 44
          hg.fillStyle = `rgb(${v},${v},${v})`
          hg.fillRect(bx + i, k ? y0 + i : y0 - 8, bw - 2 * i, k ? y1 - y0 : y1 - y0 + 8 - i)
        }
      }
    }
  }
  // (low down: the earth splashed up on the lower course, a little moss along its foot and in its joints)
  const sp = g.createLinearGradient(0, H - 24, 0, H)
  sp.addColorStop(0, 'rgba(112,86,58,0)'); sp.addColorStop(1, 'rgba(112,86,58,0.42)')
  g.fillStyle = sp; g.fillRect(0, H - 24, W, 24)
  for (let i = 0; i < 320; i++) {
    const x = rnd() * W, y = H - rnd() * rnd() * 34, r = 0.8 + rnd() * 2.2, a = 0.22 + rnd() * 0.36
    for (const off of [0, W, -W]) {
      if (x + off < -r || x + off > W + r) continue
      g.fillStyle = `rgba(${i % 3 ? '74,100,50' : '96,122,62'},${a})`
      g.beginPath(); g.arc(x + off, y, r, 0, Math.PI * 2); g.fill()
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  const n = new THREE.CanvasTexture(normalFromHeight(hc, 1.6))
  for (const x of [t, n]) { x.flipY = false; x.wrapS = x.wrapT = THREE.RepeatWrapping; x.anisotropy = 4 }
  const m = new THREE.MeshToonMaterial({ color: '#ffffff', map: t, normalMap: n })
  m.name = 'ShopPlinth'
  return m
})()
/**
 * The plinth's mesh from its plan (game/world/groundLayout's plinthPlan): along each run its face, from `foot` (in the earth) to `top`, turned
 * out; over each of its ledge's rects its top; at each end where it stops at the steps a face across it, back to the base's face. Its picture
 * by where each point is: along its face (left to right seen from outside), down from its top to the earth (`earth`) its two courses
 */
function plinthGeometry(plan: PlinthPlan, top: number, foot: number, earth: number, out: number) {
  const pos: number[] = [], nor: number[] = [], uv: number[] = []
  const vOf = (y: number) => (top - y) / (top - earth)
  // (a quad, its four points round it and theirs uvs, the way it faces: its triangles turned to face that way)
  const quad = (p: [number, number, number][], t: [number, number][], n: [number, number, number]) => {
    const [a, b, c] = p
    const cr = [(b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]),
      (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])]
    const order = cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] >= 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]
    for (const i of order) { pos.push(...p[i]); uv.push(...t[i]); nor.push(...n) }
  }
  for (const r of plan.runs) {
    const [ox, oz] = r.out
    // (along it, left to right seen from outside)
    const u = (x: number, z: number) => (oz * x - ox * z) / PLINTH_U
    const [ax, az] = r.a, [bx, bz] = r.b
    quad([[ax, foot, az], [bx, foot, bz], [bx, top, bz], [ax, top, az]],
      [[u(ax, az), vOf(foot)], [u(bx, bz), vOf(foot)], [u(bx, bz), 0], [u(ax, az), 0]], [ox, 0, oz])
    // (an end at the steps: across it, from the plinth's face back to the base's)
    for (const [cut, [ex, ez], dir] of [[r.cutA, r.a, -1], [r.cutB, r.b, 1]] as const) {
      if (!cut) continue
      const dx = ox === 0 ? dir : 0, dz = ox === 0 ? 0 : dir
      const ix = ex - ox * out, iz = ez - oz * out
      quad([[ex, foot, ez], [ix, foot, iz], [ix, top, iz], [ex, top, ez]], [[0, vOf(foot)], [out / PLINTH_U, vOf(foot)], [out / PLINTH_U, 0], [0, 0]], [dx, 0, dz])
    }
  }
  // (its ledge's top, along the longer way of each of its rects, a little down its top course)
  for (const [x0, z0, x1, z1] of plan.ledge) {
    const longX = x1 - x0 >= z1 - z0, u = (x: number, z: number) => (longX ? x : z) / PLINTH_U
    quad([[x0, top, z0], [x1, top, z0], [x1, top, z1], [x0, top, z1]], [[u(x0, z0), 0.1], [u(x1, z0), 0.1], [u(x1, z1), 0.1], [u(x0, z1), 0.1]], [0, 1, 0])
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  return g
}
/**
 * A shell of timber round an outline (item 753, the owner's 「這邊有重疊，要注意一下。」: drawn a box a rect, the base's rects' boxes met in
 * one plane back to back inside it, seen in the editor's wireframe as one board laid over another): along each of its runs a face from `y0`
 * to `y1`, turned out; over each of its cells (if given) a top at `y1`. Its boards by where they are (`along` a repeat along, `across` up),
 * so they run on round its corners and from one rect into the next
 */
function shellGeometry(runs: Run[], cells: Rect[] | null, y0: number, y1: number, along: number, across: number) {
  const pos: number[] = [], nor: number[] = [], uv: number[] = []
  const quad = (p: [number, number, number][], t: [number, number][], n: [number, number, number]) => {
    const [a, b, c] = p
    const cr = [(b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]),
      (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])]
    const order = cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] >= 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]
    for (const i of order) { pos.push(...p[i]); uv.push(...t[i]); nor.push(...n) }
  }
  for (const r of runs) {
    const [ox, oz] = r.out, [ax, az] = r.a, [bx, bz] = r.b
    const u = (x: number, z: number) => (oz * x - ox * z) / along
    quad([[ax, y0, az], [bx, y0, bz], [bx, y1, bz], [ax, y1, az]], [[u(ax, az), 0], [u(bx, bz), 0], [u(bx, bz), (y1 - y0) / across], [u(ax, az), (y1 - y0) / across]], [ox, 0, oz])
  }
  for (const [x0, z0, x1, z1] of cells ?? []) {
    quad([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], [[x0 / along, z0 / across], [x1 / along, z0 / across], [x1 / along, z1 / across], [x0 / along, z1 / across]], [0, 1, 0])
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  return g
}
/** the base's rects ([along, lay] pairs, as RoomFloor keeps them) as the floor's frame's rects (x = -lay, z = along) */
const asRects = (rs: [[number, number], [number, number]][]) => rs.map(([al, ly]) => [-ly[1], al[0], -ly[0], al[1]] as Rect)
/**
 * The shop's base: a thick plinth under the whole room (the customers' floor on a solid fill, the kitchen's lower floor in a well in it), a
 * pale rim board round under the fill, on a plinth of stone (item 744: a dark body of boards and a toe board under the rim before, timber
 * down to the gravel), the stone proud of it and down into the earth (the gravel round it gone, item 741): so it all sits on something
 * solid, not on nothing.
 */
function ShopBase({ rects, genkan, drop, step, plinth }: { rects: [[number, number], [number, number]][]; genkan: [[number, number], [number, number]]
  /** how far down the genkan's stone lies */
  step: number; drop: number
  /** the stone plinth round it (plinthPlan's, in this frame) */
  plinth: PlinthPlan }) {
  const top = -drop - 0.003
  // (the plinth's top: the rim board's foot, the rim on it as a sill on its stone (土台))
  const stoneTop = top - 0.06
  // (cut exactly to the room's own outline: the floor's pieces and the genkan's corner, no more; its sides take no shadow: what stands by the
  // floor's edge threw its shadow out onto the plinth's face, hanging there below the floor)
  // (its rim board, the grain running along it, on the stone plinth (its dark body's boards and its toe board under it gone, item 744: the
  // plinth in their place; the fill over it, under the floor's boards, in the body's boards still): round the rects' outline taken
  // together (item 753: a box a rect before, their faces back to back where two met))
  const rimGeo = useMemo(() => shellGeometry(outlineOf(asRects(rects)).runs, null, top - 0.06, top, BASE_TILE.along, BASE_TILE.across), [rects, top])
  useEffect(() => () => rimGeo.dispose(), [rimGeo])
  const [gal, gly] = genkan
  // (under the genkan's stone, solid up to it, and in stone: granite courses from its stones down to the base's foot (item 287), where the
  // rest of the base is timber over its stone plinth)
  const gTop = -step - GENKAN_SUNK - 0.004, gFoot = top - 0.33
  // (its street side in steps (item 342, the owner's: 「這邊做成石階」: it stood a sheer wall of three courses at the door): two treads of the
  // same granite down from the genkan's stone toward the street, each a third of the way down and STEP_GO further out, the doorway's width)
  const rise = (gTop - gFoot) / 3
  const stone = useStoneParts(['StoneStep0', 'StoneStep1', 'StoneStep2', 'StoneFoot'])
  // (the two steps and the band over them, each laid where it stands, then folded together by material (item 424: each is its stones, its
  // pebble-wash and its moss now, three draws for all of them, not nine); copies of the parts, so it can be done again if the room's changed)
  const [ga0, ga1, gy0, gy1] = [gal[0], gal[1], gly[0], gly[1]]
  const steps = useMemo(() => {
    const g = new THREE.Group()
    const add = (o: THREE.Object3D, made: [number, number, number], lo: number[], hi: number[]) => {
      const { position, scale } = laid(o, made, lo, hi)
      const c = o.clone(true)
      c.position.set(...position)
      c.scale.set(...scale)
      g.add(c)
    }
    for (const k of [1, 2]) {
      const yTop = gTop - rise * k, z0 = ga1 + STEP_GO * (k - 1) + 0.002, z1 = ga1 + STEP_GO * k, xc = -(gy0 + gy1) / 2
      const w = (gy1 - gy0 - 0.004 * k) / 2
      add(stone[`StoneStep${k}`], STONE_MADE[`StoneStep${k}`], [xc - w, gFoot, z0], [xc + w, yTop, z1])
    }
    // (the footing's face over the upper step, one course of whole stones laid on it (item 404, the owner's 「切得很怪」: the paving's one
    // picture went on over it and the steps, its stones cut off wherever a face ended): from the upper step's tread up to the genkan's stone,
    // 1.5 mm proud of the footing's face, its foot a hair over the tread)
    add(stone.StoneStep0, STONE_MADE.StoneStep0, [-gy1, gTop - rise + 0.0005, ga1 + 0.0015], [-gy0, gTop, ga1 + 0.0135])
    // (and the footing under the genkan, its side by the steps in their stones now (item 496, the owner's 「這一片沒同步上」): folded in with
    // them, their three materials; it was a draw of its own in the courses' picture)
    add(stone.StoneFoot, STONE_MADE.StoneFoot, [-gy1, gFoot, ga0], [-gy0, gTop, ga1])
    const shared = new Set<THREE.BufferGeometry>()
    g.traverse((o) => { if ((o as THREE.Mesh).isMesh) shared.add((o as THREE.Mesh).geometry) })
    mergeByMaterial(g)
    g.userData.shared = shared
    return g
  }, [stone, gTop, rise, gFoot, ga0, ga1, gy0, gy1])
  // (the folded meshes are its own: let them go when it's done again or goes)
  useEffect(() => () => {
    const shared = steps.userData.shared as Set<THREE.BufferGeometry>
    steps.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && !shared.has(m.geometry)) m.geometry.dispose() })
  }, [steps])
  // (the stone plinth: one mesh, one draw; made again only if the room's shape changes)
  const plinthGeo = useMemo(() => plinthGeometry(plinth, stoneTop, EARTH_Y - PLINTH_SUNK, EARTH_Y, PLINTH_OUT), [plinth, stoneTop])
  useEffect(() => () => plinthGeo.dispose(), [plinthGeo])
  return (
    <>
      <mesh geometry={rimGeo} material={BASE_TIMBER[0]} />
      <primitive object={steps} />
      {PLINTH_MAT && <mesh name="shop-plinth" geometry={plinthGeo} material={PLINTH_MAT} />}
    </>
  )
}
/** the floor's edging strip: how wide (in from the edge) and how high over the boards */
const EDGE_W = 0.04, EDGE_H = 0.02
/** the toilets' rooms out past the room's back edge (item 423, measured in the game, tests/e2e/_floorout423.mjs): their back wall's outer face
 * this far past WC_ROOM.D, and at the floor their end walls' outermost (the corner post, 2 mm proud of the plaster, item 425; it was the back
 * wall's cap overhead, 0.102, as it ran 3 cm past the end) this far past their rooms' ends */
const WC_BACK_PAST = 0.032, WC_SIDE_WALL = 0.062
/**
 * A strip laid along a run of points (x, z) on the floor, `w` wide inward (to the left of the way it runs) and `h` high, its corners
 * mitred (each piece's inner edge cut back where it turns, so the two meet on the diagonal) and its two ends square: each piece a
 * four-sided slab, the lot one geometry.
 */
function mitredRun(pts: [number, number][], w: number, h: number) {
  const n = pts.length - 1
  const nrm = (a: [number, number], b: [number, number]): [number, number] => {
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz)
    return [-dz / l, dx / l]
  }
  // (each point's inner point: in square at the two ends, where the two pieces' inner lines cross at a corner)
  const ins = pts.map(([x, z], i): [number, number] => {
    if (i === 0 || i === n) { const m = i === 0 ? nrm(pts[0], pts[1]) : nrm(pts[n - 1], pts[n]); return [x + m[0] * w, z + m[1] * w] }
    const m0 = nrm(pts[i - 1], pts[i]), m1 = nrm(pts[i], pts[i + 1])
    const bx = m0[0] + m1[0], bz = m0[1] + m1[1], dot = m0[0] * bx + m0[1] * bz
    return [x + (bx / dot) * w, z + (bz / dot) * w]
  })
  const pieces = pts.slice(0, n).map((a, i) => {
    // (the slab's plan, in the shape's own plane (x, -z), stood up h: an extrusion winds its own faces outward)
    const shape = new THREE.Shape([a, pts[i + 1], ins[i + 1], ins[i]].map(([x, z]) => new THREE.Vector2(x, -z)))
    const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false })
    g.rotateX(-Math.PI / 2)
    return g
  })
  const g = mergeGeometries(pieces)!
  pieces.forEach((q) => q.dispose())
  return g
}
const EDGING = new THREE.MeshToonMaterial({ color: '#3a2416' })
/** how much of the base's timber one repeat of its picture covers (BASE_TIMBER): four along, half across, a pixel as long as it's wide */
const BASE_TILE = { along: 4, across: 0.5 }
/**
 * The base's timber, dark: its rim board a shade lighter, its body boards laid the long way in courses, its toe board darkest. Real boards
 * (the owner's: it looked stretched, the same long streaks the whole way along): each course of boards of their own lengths (a metre or so
 * to nearly two), their butt joints staggered course to course, each board its own shade; the grain in each wavers and comes and goes
 * (lines start and stop along it, closer and wider), now and then a knot with its rings, a fine shine along some lines. Four along by half
 * across a repeat (BASE_TILE), 256 pixels a unit both ways; its ends meet (the boards and their grain wrap round), so it runs on unseamed.
 */
const BASE_TIMBER = (() => {
  const W = 1024, H = 128, PX = W / BASE_TILE.along
  const make = (base: string, courses: number, seed0: number) => {
    if (typeof document === 'undefined') return new THREE.MeshToonMaterial({ color: base })
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    const g = c.getContext('2d')!
    let seed = seed0
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const ch = H / courses
    g.fillStyle = base
    g.fillRect(0, 0, W, H)
    for (let k = 0; k < courses; k++) {
      const y0 = k * ch
      // (the course's boards: lengths from 0.9 to 1.9 units, the first joint somewhere along, wrapping round the picture's ends)
      const joints: number[] = []
      let x = rnd() * PX
      while (joints.length === 0 || x < joints[0] + W - 0.9 * PX) { joints.push(x); x += (0.9 + rnd()) * PX }
      for (let b = 0; b < joints.length; b++) {
        const xa = joints[b], xb = b + 1 < joints.length ? joints[b + 1] : joints[0] + W
        // (the board's own: its shade, its grain's lines (each wavering, starting and stopping, some dark, a few with a shine), maybe a knot;
        // chosen once, drawn twice a picture's width apart, so a board over the right end comes back in at the left the same)
        const sh = (rnd() - 0.5) * 0.22
        const nl = Math.round(ch / 2.6)
        const lines = Array.from({ length: nl }, (_, i) => ({
          y: y0 + ((i + 0.3 + rnd() * 0.4) / nl) * ch, x0: xa - 20 + rnd() * (xb - xa) * 0.5, len: (0.35 + rnd() * 0.9) * (xb - xa),
          amp: 0.4 + rnd() * 1.8, f: (2 + rnd() * 5) / PX, ph: rnd() * 6.28, dark: rnd() < 0.78, a: rnd(), lw: 0.6 + rnd() * 1.2 }))
        const knot = rnd() < 0.35 ? { x: xa + (0.2 + rnd() * 0.6) * (xb - xa), y: y0 + (0.3 + rnd() * 0.4) * ch, r: Math.min(ch * 0.32, 4 + rnd() * 7),
          rings: Array.from({ length: 6 }, () => rnd()) } : null
        for (const off of [0, -W]) {
          g.save()
          g.beginPath(); g.rect(xa + off, y0, xb - xa, ch); g.clip()
          g.fillStyle = sh > 0 ? `rgba(255,220,180,${sh * 0.45})` : `rgba(0,0,0,${-sh * 0.8})`
          g.fillRect(xa + off, y0, xb - xa, ch)
          for (const ln of lines) {
            g.strokeStyle = ln.dark ? `rgba(12,6,2,${0.16 + ln.a * 0.24})` : `rgba(235,190,140,${0.07 + ln.a * 0.09})`
            g.lineWidth = ln.lw
            g.beginPath()
            for (let xx = ln.x0; xx <= ln.x0 + ln.len; xx += 6) {
              const yy = ln.y + ln.amp * Math.sin(xx * ln.f * 6.28 + ln.ph) + 0.6 * Math.sin(xx * ln.f * 17 + ln.ph * 2)
              if (xx === ln.x0) g.moveTo(xx + off, yy); else g.lineTo(xx + off, yy)
            }
            g.stroke()
          }
          // (a knot: a dark eye in a few rings)
          if (knot) {
            let n = 0
            for (let r = knot.r * 2.2; r > knot.r; r -= 2.2) {
              g.strokeStyle = `rgba(12,6,2,${0.12 + knot.rings[n++ % 6] * 0.1})`; g.lineWidth = 0.8
              g.beginPath(); g.ellipse(knot.x + off, knot.y, r * 1.9, r, 0, 0, 6.29); g.stroke()
            }
            g.fillStyle = 'rgba(10,5,2,0.55)'
            g.beginPath(); g.ellipse(knot.x + off, knot.y, knot.r * 1.5, knot.r * 0.75, 0, 0, 6.29); g.fill()
          }
          g.restore()
        }
        // (the butt joint: a dark line, a hair of light on one side of it)
        const jx = xa % W
        g.fillStyle = 'rgba(8,4,1,0.75)'; g.fillRect(jx - 1, y0, 2, ch)
        g.fillStyle = 'rgba(255,220,180,0.12)'; g.fillRect(jx + 1, y0, 1, ch)
      }
      // (the course's seam with the next: dark, a light edge under it)
      if (courses > 1) {
        g.fillStyle = 'rgba(8,4,1,0.7)'; g.fillRect(0, y0, W, 1.6)
        g.fillStyle = 'rgba(255,220,180,0.1)'; g.fillRect(0, y0 + 1.6, W, 1)
      }
    }
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.anisotropy = 4
    return new THREE.MeshToonMaterial({ color: '#ffffff', map: t })
  }
  // (the rim board a single board deep; the body six courses to the half unit (the toe board under them, darkest, gone with the stone plinth
  // in its place, item 744))
  return [make('#5c3a22', 1, 9157), make('#3d2414', 6, 4271)]
})()
/** raw timber for the steps: warm unplaned wood, its long grain wavering, a knot or two, and the dark rough of the cut */
const STEP_LOG = (() => {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 64
  const g = c.getContext('2d')!
  // (planed oak, as the floor's: a warm mid-brown, long straight fine grain with a few darker streaks, no knots)
  g.fillStyle = '#9a7650'
  g.fillRect(0, 0, 256, 64)
  for (let i = 0; i < 40; i++) {
    const y = (i * 1.6 + (i % 5) * 0.4) % 64
    g.strokeStyle = i % 3 ? 'rgba(60,36,18,0.16)' : 'rgba(190,140,90,0.16)'
    g.lineWidth = 0.7 + (i % 4) * 0.25
    g.beginPath()
    g.moveTo(0, y)
    g.lineTo(256, y + ((i % 7) - 3) * 0.25)
    g.stroke()
  }
  g.fillStyle = 'rgba(40,22,10,0.18)'
  for (const y of [9, 31, 52]) g.fillRect(0, y, 256, 2.2)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
})()
/**
 * A timber block w × h × d whose grain runs the long way on every face and is laid at one scale all over (a texture one metre
 * long, a quarter of a metre across), however the block is shaped: nothing stretched.
 */
const TIMBER_GEO = new Map<string, THREE.BufferGeometry>()
const TIMBER = new THREE.MeshToonMaterial({ color: '#ffffff', map: STEP_LOG })
function timberBox(w: number, h: number, d: number, along = 1, across = 0.25) {
  const key = [w, h, d, along, across].map((v) => v.toFixed(3)).join()
  const have = TIMBER_GEO.get(key)
  if (have) return have
  const g = new THREE.BoxGeometry(w, h, d)
  TIMBER_GEO.set(key, g)
  const uv = g.attributes.uv
  // (BoxGeometry's faces, four vertices each: +x, -x, +y, -y, +z, -z; the two sizes across each face along its u and v)
  const dims: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]]
  for (let f = 0; f < 6; f++) {
    const [du, dv] = dims[f]
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k
      const u = uv.getX(i), v = uv.getY(i)
      // (the longer side takes the grain, the texture's u; one repeat of the picture `along` long and `across` wide)
      if (du >= dv) uv.setXY(i, (u * du) / along, (v * dv) / across)
      else uv.setXY(i, (v * dv) / along, (u * du) / across)
    }
  }
  return g
}
/**
 * The kitchen raised a step above the customers' floor (a dais, as a robatayaki's cooks stand on: so the cook's table comes to their
 * waist): its boards laid on a solid timber platform, its edges faced in the bar's dark wood, a single step of raw timber at each gate
 * and right across its end, up from the customers' floor.
 */
function KitchenDais({ counters, rise }: { counters: Counter[]; rise: number }) {
  const k = useMemo(() => kitchenOf(counters), [counters])
  const [kx0, kx1] = k.along, [ky0, ky1] = k.lay
  // (in the floor's frame: x is minus lay, z is along)
  return (
    <>
      <mesh position={[-(ky0 + ky1) / 2, rise / 2, (kx0 + kx1) / 2]} geometry={timberBox(ky1 - ky0, rise, kx1 - kx0, BASE_TILE.along, BASE_TILE.across)} material={BASE_TIMBER[1]} receiveShadow />
      <FloorPiece w={ky1 - ky0} l={kx1 - kx0} tint="#d2c4b2" position={[-(ky0 + ky1) / 2, rise + 0.004, (kx0 + kx1) / 2]} />
      {/* (no step at the side counter's gate either (item 501, the owner's 「這塊拿掉」: a pale plank lying across the way by the swing door);
          the first counter's gate's and the one along its open end went before (the owner's: pale planks lying across the aisle by the
          stools' feet)) */}
    </>
  )
}
/**
 * The kitchen, sunk below the customers' floor: its own floor lower down, a riser of the bar's dark wood round its
 * edges (the counters' bases run on down into it), and at each gate two steps to tread on, down from the customers' floor.
 */
function KitchenPit({ counters, drop }: { counters: Counter[]; drop: number }) {
  const k = useMemo(() => kitchenOf(counters), [counters])
  const gates = useMemo(() => kitchenGatesOf(counters), [counters])
  const [kx0, kx1] = k.along, [ky0, ky1] = k.lay
  // (in the floor's frame: x is minus lay, z is along)
  const wall = (xa: number, xb: number, zl: number, zr: number, key: string) => (
    <mesh key={key} position={[-(xa + xb) / 2, -drop / 2, (zl + zr) / 2]}>
      <boxGeometry args={[xb - xa || 0.02, drop, zr - zl || 0.02]} />
      <meshToonMaterial color={RISER} />
    </mesh>
  )
  // (the steps are blocks stood in the kitchen against its edge, each a third lower than the last)
  const [g0, g1] = gates.first
  // (each step a block of raw timber, its grain along it at one scale; run a way on past the gate's way through along the kitchen's
  // edge, to fill the corner of the well beside it, but never past the kitchen's own bounds)
  const STEP_OVER = 0.1
  const stepAt = (a: number, b: number, edgeLay: number, key: string) => [1, 2].map((n) => {
    const h = drop * (3 - n) / 3
    const lo = Math.max(kx0, a - STEP_OVER), hi = Math.min(kx1, b + STEP_OVER)
    return (
      <mesh key={`${key}${n}`} position={[-(edgeLay + 0.17 * n - 0.085), -drop + h / 2, (lo + hi) / 2]} geometry={timberBox(0.17, h, hi - lo)} material={TIMBER} castShadow receiveShadow ref={(m) => { if (m) inkModel(m) }} />
    )
  })
  const stepSide = (a: number, b: number, edgeAlong: number, key: string) => [1, 2].map((n) => {
    const h = drop * (3 - n) / 3
    const lo = Math.max(ky0, a - STEP_OVER), hi = Math.min(ky1, b + STEP_OVER)
    return (
      <mesh key={`${key}${n}`} position={[-(lo + hi) / 2, -drop + h / 2, edgeAlong + 0.17 * n - 0.085]} geometry={timberBox(hi - lo, h, 0.17)} material={TIMBER} castShadow receiveShadow ref={(m) => { if (m) inkModel(m) }} />
    )
  })
  return (
    <>
      <FloorPiece w={ky1 - ky0} l={kx1 - kx0} tint="#d2c4b2" position={[-(ky0 + ky1) / 2, 0.004 - drop, (kx0 + kx1) / 2]} />
      {/* (down the cook's face of the first counter, but the gate's way through) */}
      {wall(ky0 - 0.01, ky0 + 0.01, kx0, g0, 'f1')}
      {wall(ky0 - 0.01, ky0 + 0.01, g1, kx1, 'f2')}
      {/* (down the kitchen's end past the first counter, steps across the whole of it: a way in from the door's side) */}
      {wall(ky0, ky1, kx1 - 0.01, kx1 + 0.01, 'e')}
      {/* (and down by the side counter, the gate's way through) */}
      {gates.side ? (
        <>
          {wall(ky0, gates.side[0], kx0 - 0.01, kx0 + 0.01, 's1')}
          {wall(gates.side[1], ky1, kx0 - 0.01, kx0 + 0.01, 's2')}
          {stepSide(gates.side[0], gates.side[1], kx0, 'sg')}
        </>
      ) : wall(ky0, ky1, kx0 - 0.01, kx0 + 0.01, 's')}
      {/* (the steps at the first counter's gate) */}
      {stepAt(g0, g1, ky0, 'g')}
    </>
  )
}

/** a soft dark shadow, a rounded oblong blurred out to nothing at its edges, for the shop to stand on: its dark to the base's edge, gone
 * a third of a unit out (items 725, 726: it spread 1.2 out, out past the earth round the shop now, a dark ring round it on nothing) */
const GROUND_SHADOW = (() => {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = 512; c.height = 512
  const g = c.getContext('2d')!
  g.filter = 'blur(22px)'
  g.fillStyle = 'rgba(0,4,12,0.72)'
  g.beginPath(); g.roundRect(34, 34, 444, 444, 24); g.fill()
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
})()
function RoomFloorImpl({ counters, drop }: { counters: Counter[]; drop: number }) {
  const c = counters[0]
  const { along: [a0, a1], lay: [l0, l1] } = useMemo(() => roomOf(counters), [counters])
  const kitchen = useMemo(() => kitchenOf(counters), [counters])
  // (the genkan's corner, by the door, is left out of the boards: it's a step down, in stone)
  const g0 = c.length / 2 + GENKAN.along[0], gl = GENKAN.lay[1], D = GENKAN.depth
  // (how far down the base's top lies: below the sunk kitchen's floor, or the genkan's stone, whichever's lower)
  const baseDrop = Math.max(drop, D + 0.02)
  // (and out behind the room's back edge (item 423, the owner's 「模型地板延伸到這邊」「廁所地板也得有」): the toilets' rooms stood out past it with
  // nothing under them, the base and the boards stopping at the back wall. A strip all along the back now, out to just past their back wall:
  // the base and its fill under all of it, the boards where their own floors aren't (beside them, behind the drinks fridges' wall), its own
  // edging round its three open sides. Along, from `al[0]` to the room's back edge; lay, `ly`; the toilets' rooms' own lay, `wc`)
  const back = useMemo(() => {
    const t = toiletsOf(counters)
    if (!t || counters.length < 2) return null
    const c1 = counters[1], half = WC_W + 0.06 + WC_ROOM.E + WC_SIDE_WALL
    // (on unit directions, as the toilets stand (their wall's group on its yaw): the counters' along and lay are a shade over unit length,
    // and reckoned with them the women's end came out 1.2 cm past where it stands)
    const ua = c1.along.clone().normalize(), ul = c.lay.clone().normalize()
    const ends = [t.door - half, t.door + half].map((z) => c1.at.clone().addScaledVector(ua, z).sub(c.at).dot(ul))
    const wc: [number, number] = [Math.min(...ends), Math.max(...ends)]
    // (each side: floor open between the toilets' end and the room's side, the strip runs on to the room's side, edged along it; their end
    // wall standing at the room's side (item 425, the owner's 「接縫修掉，要無縫接軌」: the women's, a few millimetres in from it), the strip
    // ends flush with the room's base, unedged (run on past it to take an edging, its base stood 9 cm out from the room's, a step under the
    // corner); their end past the room's side, just past it)
    const open: [boolean, boolean] = [wc[0] - l0 >= EDGE_W + 0.005, l1 - wc[1] >= EDGE_W + 0.005]
    const ly: [number, number] = [open[0] || wc[0] >= l0 ? l0 : wc[0] - 0.002, open[1] || wc[1] <= l1 ? l1 : wc[1] + 0.002]
    return { al: [a0 - (WC_ROOM.D + WC_BACK_PAST + EDGE_W + 0.003), a0] as [number, number], ly, wc, open }
  }, [counters, c, a0, l0, l1])
  // (and further out under the stock room (items 430, 431): deeper than the toilets' rooms, the base and its fill under its walls' outside;
  // its own floor in it (DiningRoom's StoreRoom), the strip's edging broken where it stands)
  const bump = useMemo(() => {
    const st = storeOf(counters)
    if (!st || !back) return null
    const c1 = counters[1], ua = c1.along.clone().normalize(), ul = c.lay.clone().normalize()
    const ends = [st.room[0] - 0.062, st.room[1] + 0.004 + 0.062].map((z) => c1.at.clone().addScaledVector(ua, z).sub(c.at).dot(ul))
    const ly: [number, number] = [Math.max(back.ly[0], Math.min(...ends)), Math.min(back.ly[1], Math.max(...ends))]
    return { al: [a0 - (STORE.deep + 0.062), back.al[0]] as [number, number], ly }
  }, [counters, c, a0, back])
  // (the edging's run, in the floor's frame (x = -lay, z = along): from the kamachi's end at the door round to the genkan's other side; with the
  // floor run on out behind the back edge (item 423), not along that edge (item 436, the owner's 「這條線拿掉」: a dark line across the floor,
  // seen from behind with the wall there hidden): two runs, the open end and side, and the side by the door; the wall's own skirting
  // (DiningWall's) along its foot instead, hidden with it)
  const edging = useMemo(() => {
    if (!back) return mitredRun([[-gl, a1], [-l1, a1], [-l1, a0], [-l0, a0], [-l0, g0]], EDGE_W, EDGE_H)
    const a = mitredRun([[-gl, a1], [-l1, a1], [-l1, a0]], EDGE_W, EDGE_H), b = mitredRun([[-l0, a0], [-l0, g0]], EDGE_W, EDGE_H)
    const g = mergeGeometries([a, b])!
    a.dispose(); b.dispose()
    return g
  }, [gl, a1, l1, a0, l0, g0, back])
  useEffect(() => () => edging.dispose(), [edging])
  const backEdging = useMemo(() => {
    if (!back) return null
    const head = back.open[1] ? [[-back.ly[1], back.al[1]] as [number, number]] : [], tail = back.open[0] ? [[-back.ly[0], back.al[1]] as [number, number]] : []
    // (broken where the stock room stands out past it (items 430, 431): up to its walls either side, not across its floor)
    const bm = (bump?.ly ?? null) as [number, number] | null
    const ly0 = back.ly[0], ly1 = back.ly[1], al0 = back.al[0]
    if (!bm) return mitredRun([...head, [-ly1, al0], [-ly0, al0], ...tail], EDGE_W, EDGE_H)
    // (a run's points that meet left as one (the stock room's from the room's side: its edge where the strip's starts), and a run with
    // nothing left of it dropped: a nothing-long piece made the edging's corner of nothing, NaN)
    const runs = [[...head, [-ly1, al0], [-bm[1], al0]], [[-bm[0], al0], [-ly0, al0], ...tail]]
      .map((r) => (r as [number, number][]).filter((q, i, a) => i === 0 || Math.hypot(q[0] - a[i - 1][0], q[1] - a[i - 1][1]) > 0.005))
      .filter((r) => r.length > 1)
    const gs = runs.map((r) => mitredRun(r as [number, number][], EDGE_W, EDGE_H))
    if (gs.length === 1) return gs[0]
    const g = mergeGeometries(gs)!
    gs.forEach((x) => x.dispose())
    return g
  }, [back, bump])
  useEffect(() => () => backEdging?.dispose(), [backEdging])
  const A0 = bump?.al[0] ?? back?.al[0] ?? a0, L0 = back?.ly[0] ?? l0, L1 = back?.ly[1] ?? l1
  // (and under the wing of wall at the toilets' end, where they reach the room's side (item 747): from the shop's back wall's slab's outer
  // face (that wall's face along this frame, as the walls stand, less its WALL_OUT) back to the toilets' block's back line, out from the room's
  // side to the side wall's outer face (its face at FLOOR_FAR, its slab WALL_OUT behind it))
  const wing = useMemo(() => {
    if (!back || back.open[0] || counters.length < 2) return null
    const c1 = counters[1]
    const face = c1.at.clone().addScaledVector(c1.lay.clone().normalize(), farOf(c1)).sub(c.at).dot(c.along.clone().normalize())
    return { al: [face - WC_BACK_LINE, face - WALL_OUT] as [number, number], ly: [FLOOR_FAR - WALL_OUT, l0] as [number, number] }
  }, [back, counters, c, l0])
  const bases = useMemo(() => [[[a0, g0], [l0, l1]], [[g0, a1], [gl, l1]], ...(back ? [[back.al, back.ly]] : []), ...(bump ? [[bump.al, bump.ly]] : []),
    ...(wing ? [[wing.al, wing.ly]] : [])] as [[number, number], [number, number]][],
    [a0, g0, l0, l1, a1, gl, back, bump, wing])
  // (the building's footprint on the ground, in this frame (x = -lay, z = along): the base's pieces and the genkan's corner in stone)
  const footprint = useMemo(() => [...bases.map(([al, ly]) => [-ly[1], al[0], -ly[0], al[1]] as Rect), [-gl, g0, -l0, a1] as Rect], [bases, gl, g0, l0, a1])
  // (the fill under the boards: the base's rects (round the kitchen's well when it's sunk), one shell (item 753))
  const fillGeo = useMemo(() => {
    const fill = bases.flatMap(([al, ly]) => (drop > 0 ? minus(al, ly, kitchen) : [[al, ly] as [[number, number], [number, number]]]))
    const o = outlineOf(asRects(fill))
    return shellGeometry(o.runs, o.cells, 0.001 - (baseDrop + 0.004), 0.001, BASE_TILE.along, BASE_TILE.across)
  }, [bases, drop, kitchen, baseDrop])
  useEffect(() => () => fillGeo.dispose(), [fillGeo])
  // (the stone plinth round it (item 744), broken across the doorway, where the stone steps stand out from the genkan's footing)
  const plinth = useMemo(() => plinthPlan(footprint, PLINTH_OUT, [[-gl, a1 - 0.05, -l0, a1 + 2 * STEP_GO + 0.01]]), [footprint, gl, l0, a1])
  // (the toilets' drain (item 755): out of the plinth's face behind them, beside the corner the stock room's base makes; its face looking out
  // behind (its frame turned half round); what it takes of the earth kept clear of the tufts and moss)
  const drain = useMemo(() => {
    if (!back || !bump) return null
    const d = drainSpot(back.wc, bump.ly, back.al[0], PLINTH_OUT, DRAIN_FROM)
    const [x0, z0, x1, z1] = DRAIN_CLEAR
    return { at: [d.x, d.z] as [number, number], keep: [[d.x - x1, d.z - z1, d.x - x0, d.z - z0]] as Rect[] }
  }, [back, bump])
  // (the kitchen's cut out of the boards: it lies lower, KitchenPit)
  const piece = (al: [number, number], ly: [number, number], k: string) => minus(al, ly, kitchen).map(([a, l], i) => (
    <FloorPiece key={`${k}${i}`} w={l[1] - l[0]} l={a[1] - a[0]} position={[-(l[0] + l[1]) / 2, 0.004, (a[0] + a[1]) / 2]} />
  ))
  return (
    <group name="room-floor" position={c.at} rotation-y={Math.atan2(c.along.x, c.along.z)}>
      {/* (none of it ever moves: folded together by material, it was some thirty-five draws; made again only if the room's shape changes) */}
      <StaticBatch key={`${a0}|${a1}|${l0}|${l1}|${drop}`}>
      {piece([a0, g0], [l0, l1], 'a')}
      {piece([g0, a1], [gl, l1], 'b')}
      {back && ([[back.ly[0], back.wc[0]], [back.wc[1], back.ly[1]]] as [number, number][]).filter(([p, q]) => q - p > 0.02).map(([p, q], i) => piece(back.al, [p, q], `k${i}`))}
      <ShopBase rects={bases} genkan={[[g0, a1], [l0, gl]]} step={D} drop={baseDrop} plinth={plinth} />
      {/* (the floor's edge, dark, all the way round but where the genkan's kamachi is: from the kamachi's end by the door, round the
          room's open end, along its open side, up the side wall and along the back wall to the genkan, each corner mitred (the owner's: the
          strip along the side wall stopped short of the corner, and the open edges had none)) */}
      <mesh geometry={edging} material={EDGING} />
      {backEdging && <mesh geometry={backEdging} material={EDGING} />}
      {/* (the whole shop's soft shadow on the ground it stands on, under its base and spreading out past it a little: on the earth (item 741:
          the gravel it lay on round the building gone), under the bed before the door) */}
      <mesh position={[-(L0 + L1) / 2 - 0.12, EARTH_Y + 0.0015, (A0 + a1) / 2 + 0.1]} rotation-x={-Math.PI / 2} renderOrder={-1}>
        <planeGeometry args={[(L1 - L0) + 0.9, (a1 - A0) + 0.9]} />
        <meshBasicMaterial map={GROUND_SHADOW} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      {/* (and a solid fill under the boards right down to the base: round the kitchen's well when it's sunk, under the kitchen's dais as
          well when it's raised; nothing to see through between the floor and the base: its sides (the step down into the kitchen too) in
          the base's dark timber boards, its top under the floor's (item 753: one shell round them all, not a box a rect)) */}
      <mesh geometry={fillGeo} material={BASE_TIMBER[1]} />
      {drop > 0 ? <KitchenPit counters={counters} drop={drop} /> : <KitchenDais counters={counters} rise={-drop} />}
      {/* (the genkan's side's low curb of stone, from its stone up to the boards over the footing's side (StoneSide, item 287 and 496), is
          gone (item 539, the owner's 「這塊拿掉」)) */}
      {/* (the room's open end at the door, from the boards down to the footing, is gone (item 407, the owner's 「這片到底是甚麼? 拿掉」): the
          genkan's stone lies 10 cm under the boards, and at the door it stood up over the genkan's stone like a low wall) */}
      </StaticBatch>
      {/* (the ground it stands on: its gravel bed before the door, curb, stepping stones, tufts and the earth round it (items 708, 725, 726,
          741)) */}
      <ShopGround building={footprint} plinth={plinth} plinthOut={PLINTH_OUT} door={[-gl, -l0]} front={a1} stepsFoot={a1 + 2 * STEP_GO} keep={drain?.keep} />
      {/* (the toilets' drain out of the plinth at the back, into its stone basin (item 755)) */}
      {drain && <Movable id="drain" label="排水口" ground={EARTH_Y}><ShopDrain at={drain.at} yaw={Math.PI} /></Movable>}
      {/* (the rush mat under the rice by the sake (item 717)) */}
      <Movable id="ricemat" label="草蓆" ground={0}><RiceMat /></Movable>
      {/* the genkan: its stones laid crazy-paving in pebble-wash, the shoe-off stone at the step, the threshold, the polished keyaki step
          (item 185: one flat picture of stones and two thin boards before) */}
      <GenkanFloor x={[-gl, -l0]} z={[g0, a1]} />
    </group>
  )
}
/**
 * The rush mat (茣蓙) under the rice sacks and the sake barrels (item 717, the owner's 「紅框地板鋪草蓆」, bar.ts's RICE_MAT), woven as a real
 * one is (item 766, the owner's 「草蓆要真實且好看些」: it was one flat straw colour ruled with lines, its rush running along it): its rush
 * (藺草) across it, strand by strand (3.5 mm each, each its own straw: a soft gold, some greener, now and then a darker or a paler one), the
 * cotton warp along it every 1.6 cm pinching them, so each strand swells between two warps (the weave's 目) and the warp's thread shows
 * where it crosses over a strand, every other one by turns; a little wear. Its height a picture too, made into its normal map (the strands
 * rounded, the grooves and the pinches sunk), so the light runs along the weave. One tile 30 cm square, repeated over it (seamless). Along
 * its two long sides a binding (縁) of navy cloth with a fine seigaiha in it, a gold line near each edge and the stitches along its inner
 * one, over the mat's edge and down its side, 1.5 mm proud of the rush (not in one plane with it). Two draws: the rush as the plinth's
 * stone is drawn (one program with it), the binding as the gravel (one program).
 */
const MAT_TILE = 0.3, MAT_BIND = { w: 0.055, up: 0.0015, out: 0.002, tile: 0.2 }
const RICE_MAT_LOOK = (() => {
  if (typeof document === 'undefined') return null
  const N = 512, STRANDS = 86, ROWS = 19, sw = N / STRANDS, rh = N / ROWS
  const c = document.createElement('canvas'); c.width = c.height = N
  const g = c.getContext('2d')!
  const hc = document.createElement('canvas'); hc.width = hc.height = N
  const hg = hc.getContext('2d')!
  let seed = 766
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  // (each strand's straw)
  const straws = Array.from({ length: STRANDS }, () => {
    const k = rnd(), j = (rnd() - 0.5) * 14
    const base = k < 0.06 ? [160, 138, 86] : k < 0.15 ? [216, 199, 146] : k < 0.4 ? [186, 178, 114] : [199, 180, 118]
    return base.map((v, i) => Math.max(0, Math.min(255, v + j * 0.7 + (i === 1 ? (rnd() - 0.5) * 6 : 0))))
  })
  const img = g.createImageData(N, N), hImg = hg.createImageData(N, N)
  for (let y = 0; y < N; y++) {
    // (between two warps the strand swells to its middle, pinched at them)
    const swell = Math.pow(Math.sin(Math.PI * ((y % rh) / rh)), 0.6)
    for (let x = 0; x < N; x++) {
      const st = Math.floor(x / sw), round = Math.pow(Math.sin(Math.PI * ((x - st * sw) / sw)), 0.8)
      const [r0, g0, b0] = straws[st]
      // (its grooves and the pinches darker, its crown catching a little of the light)
      const k = 0.78 + 0.22 * round * (0.6 + 0.4 * swell) + (round > 0.93 && swell > 0.85 ? 0.04 : 0)
      const i = (y * N + x) * 4
      img.data[i] = r0 * k; img.data[i + 1] = g0 * k; img.data[i + 2] = b0 * k; img.data[i + 3] = 255
      const h = Math.round(255 * (0.2 + 0.55 * round * (0.55 + 0.45 * swell)))
      hImg.data[i] = hImg.data[i + 1] = hImg.data[i + 2] = h; hImg.data[i + 3] = 255
    }
  }
  g.putImageData(img, 0, 0); hg.putImageData(hImg, 0, 0)
  // (the warp's thread where it crosses over a strand, every other one by turns: pale cotton, a little raised)
  for (let r = 0; r <= ROWS; r++) {
    const y = r * rh
    for (let st = 0; st < STRANDS; st++) {
      if ((st + r) % 2) continue
      g.fillStyle = 'rgba(234,226,202,0.6)'; g.fillRect(st * sw + 0.8, y - 0.9, sw - 1.6, 1.8)
      hg.fillStyle = 'rgb(140,140,140)'; hg.fillRect(st * sw + 0.8, y - 0.9, sw - 1.6, 1.8)
    }
  }
  // (a little wear: soft patches a shade darker or paler, drawn round the tile's edges so it repeats unseen)
  for (let i = 0; i < 14; i++) {
    const x = rnd() * N, y = rnd() * N, r = 40 + rnd() * 90, dark = rnd() < 0.6
    for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) {
      const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r)
      gr.addColorStop(0, dark ? 'rgba(96,74,40,0.1)' : 'rgba(240,226,180,0.1)'); gr.addColorStop(1, 'rgba(0,0,0,0)')
      g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2)
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  const n = new THREE.CanvasTexture(normalFromHeight(hc, 2.2))
  for (const x of [t, n]) { x.flipY = false; x.wrapS = x.wrapT = THREE.RepeatWrapping; x.anisotropy = 8 }
  const rush = new THREE.MeshToonMaterial({ color: '#ffffff', map: t, normalMap: n })
  rush.name = 'RiceMatRush'
  // (the binding's cloth: along it u (a repeat every MAT_BIND.tile), across it v from its outer edge (0) to its inner (1))
  const bc = document.createElement('canvas'); bc.width = 256; bc.height = 64
  const bg = bc.getContext('2d')!
  bg.fillStyle = '#1c2843'; bg.fillRect(0, 0, 256, 64)
  seigaiha(bg, 0, 10, 256, 44, { bg: '#1c2843', line: '#b9c4da', lw: 1, unit: 16, rings: 3 })
  for (const y of [6, 56]) { bg.fillStyle = 'rgba(205,170,92,0.95)'; bg.fillRect(0, y, 256, 2) }
  // (its weave, faint; the stitches along its inner edge)
  for (let y = 0; y < 64; y += 2) { bg.fillStyle = 'rgba(0,0,0,0.08)'; bg.fillRect(0, y, 256, 1) }
  for (let x = 2; x < 256; x += 8) { bg.fillStyle = 'rgba(214,206,186,0.85)'; bg.fillRect(x, 60.5, 4, 1.5) }
  const bt = new THREE.CanvasTexture(bc)
  bt.colorSpace = THREE.SRGBColorSpace
  bt.flipY = false; bt.wrapS = bt.wrapT = THREE.RepeatWrapping; bt.anisotropy = 8
  const bind = new THREE.MeshToonMaterial({ map: bt })
  bind.name = 'RiceMatBinding'
  return { rush, bind }
})()
/** a quad's two triangles wound to face `n`, its corners' uv given */
function matQuad(pos: number[], nor: number[], uv: number[], p: [number, number, number][], n: [number, number, number], t: [number, number][]) {
  const [a, b, c] = p
  const cr = [(b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]),
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])]
  for (const i of cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] >= 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]) { pos.push(...p[i]); nor.push(...n); uv.push(...t[i]) }
}
function matGeo(pos: number[], nor: number[], uv: number[]) {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  return g
}
/**
 * The mat's two shapes: its rush (its top and its four sides, from `y0` to `y1`, its picture laid by where it is: one tile MAT_TILE) and its
 * binding (along its two long sides, z0's and z1's: a top MAT_BIND.w in from the edge and up over the rush, its outer side down past the
 * mat's to `y0` (MAT_BIND.out out from it), the step down onto the rush along its inner edge, and its two ends past the mat's)
 */
function riceMatGeometry(x0: number, x1: number, z0: number, z1: number, y0: number, y1: number) {
  const P: number[] = [], N: number[] = [], U: number[] = []
  const u = (x: number) => x / MAT_TILE, v = (z: number) => z / MAT_TILE
  matQuad(P, N, U, [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], [0, 1, 0], [[u(x0), v(z0)], [u(x1), v(z0)], [u(x1), v(z1)], [u(x0), v(z1)]])
  matQuad(P, N, U, [[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]], [-1, 0, 0], [[u(x0), v(z0)], [u(x0) + 0.02, v(z0)], [u(x0) + 0.02, v(z1)], [u(x0), v(z1)]])
  matQuad(P, N, U, [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], [1, 0, 0], [[u(x1), v(z0)], [u(x1) - 0.02, v(z0)], [u(x1) - 0.02, v(z1)], [u(x1), v(z1)]])
  matQuad(P, N, U, [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], [0, 0, -1], [[u(x0), v(z0)], [u(x1), v(z0)], [u(x1), v(z0) + 0.02], [u(x0), v(z0) + 0.02]])
  matQuad(P, N, U, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1], [[u(x0), v(z1)], [u(x1), v(z1)], [u(x1), v(z1) - 0.02], [u(x0), v(z1) - 0.02]])
  const rush = matGeo(P, N, U)
  const bP: number[] = [], bN: number[] = [], bU: number[] = []
  const { w, up, out, tile } = MAT_BIND, top = y1 + up, e0 = x0 - out, e1 = x1 + out, bu = (x: number) => x / tile
  for (const [edge, inn, sd] of [[z0 - out, z0 + w, -1], [z1 + out, z1 - w, 1]] as [number, number, number][]) {
    // (its top, from its outer edge (v 0) to its inner (v 1); its outer side, the cloth's outer band; the step onto the rush; its ends)
    matQuad(bP, bN, bU, [[e0, top, edge], [e1, top, edge], [e1, top, inn], [e0, top, inn]], [0, 1, 0], [[bu(e0), 0], [bu(e1), 0], [bu(e1), 1], [bu(e0), 1]])
    matQuad(bP, bN, bU, [[e0, y0, edge], [e1, y0, edge], [e1, top, edge], [e0, top, edge]], [0, 0, sd], [[bu(e0), 0.02], [bu(e1), 0.02], [bu(e1), 0], [bu(e0), 0]])
    matQuad(bP, bN, bU, [[e0, y1, inn], [e1, y1, inn], [e1, top, inn], [e0, top, inn]], [0, 0, -sd], [[bu(e0), 1], [bu(e1), 1], [bu(e1), 0.98], [bu(e0), 0.98]])
    for (const [x, nx] of [[e0, -1], [e1, 1]] as [number, number][]) {
      matQuad(bP, bN, bU, [[x, y0, edge], [x, top, edge], [x, top, inn], [x, y0, inn]], [nx, 0, 0], [[0, 0], [0, 0.02], [0.02, 0.02], [0.02, 0]])
    }
  }
  return { rush, bind: matGeo(bP, bN, bU) }
}
const RiceMat = memo(function RiceMat() {
  const [x0, x1] = RICE_MAT.x, [z0, z1] = RICE_MAT.z
  // (its long sides along x; 1 mm over the floor's boards at its foot, its top RICE_MAT.t)
  const geo = useMemo(() => riceMatGeometry(x0, x1, z0, z1, 0.001, RICE_MAT.t), [x0, x1, z0, z1])
  useEffect(() => () => { geo.rush.dispose(); geo.bind.dispose() }, [geo])
  if (!RICE_MAT_LOOK) return null
  return (
    <group name="rice-mat">
      <mesh geometry={geo.rush} material={RICE_MAT_LOOK.rush} receiveShadow raycast={() => null} />
      <mesh geometry={geo.bind} material={RICE_MAT_LOOK.bind} receiveShadow raycast={() => null} />
    </group>
  )
})
/**
 * The genkan's floor and step (blender/genkanfloor.py, item 185, the owner's, 2026-11-15: "the genkan's doorway, its stone step and floor,
 * too plain"; it was one flat picture of a grid of grey slabs in thick pale joints, and the step two thin dark boards): natural stones laid
 * crazy-paving, each its own outline, tint (its points' colour) and chamfer, each a little domed (item 265), in a pebble-wash (洗い出し) seen in
 * the joints; a rush rug lying on it (item 264: the doormat and the shoe-off stone that stood at the step are gone; people stand on the rug:
 * bar.ts's GENKAN_RUG, genkanY); a dark granite threshold across the
 * doorway; and the step's edge (上框), a polished keyaki beam along both open sides, mitred at the corner. Modelled in RoomFloor's own frame,
 * the genkan as it is (x 0.42..1.6569, z 2.4..3.7155); fitted to it as it is now, if that's changed. Toon-shaded as the room is, its pictures'
 * relief in their normal maps; one draw for each of its three materials (stone, pebbles, wood)
 */
const GENKAN_FLOOR_URL = import.meta.env.BASE_URL + 'models/genkanfloor.glb'
useGLTF.preload(GENKAN_FLOOR_URL)
/** how far under the genkan's stone its pebble-wash lies (the model's), for the walls' foot and the base to reach down to */
export const GENKAN_SUNK = 0.012
const GENKAN_MODELLED = { x: [0.42, 1.6569], z: [2.4, 3.7155] }
const GenkanFloor = memo(function GenkanFloor({ x, z }: { x: [number, number]; z: [number, number] }) {
  const gltf = useGLTF(GENKAN_FLOOR_URL) as unknown as { scene: THREE.Group }
  const obj = useMemo(() => {
    const r = (gltf.scene.getObjectByName('GenkanRoot') ?? gltf.scene).clone(true)
    // (the shoe-off stone and the threshold their own material (the same pictures), so they're drawn apart from the flat stones and take the
    // room's ink line round them as the step does: a raised stone the floor's colour, unlined, didn't show as one)
    const made = new Map<string, THREE.Material>()
    r.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const src = m.material as THREE.MeshStandardMaterial
      const raised = /Kutsunugi|Sill/.test(m.name)
      const key = `${src.uuid}|${raised}`
      let t = made.get(key)
      if (!t) {
        t = new THREE.MeshToonMaterial({ color: '#ffffff', map: src.map ?? null, normalMap: src.normalMap ?? null, vertexColors: !!m.geometry.attributes.color })
        if (src.normalMap) (t as THREE.MeshToonMaterial).normalScale.set(0.8, 0.8)
        t.name = src.name + (raised ? 'Raised' : '')
        made.set(key, t)
      }
      m.material = t
      m.receiveShadow = true
      // (what stands up off the floor throws its shadow: the shoe-off stone, the threshold and the step; the flat stones don't)
      m.castShadow = raised || /Kamachi/.test(m.name)
    })
    inkModel(r, (m) => !/Kutsunugi|Sill|Kamachi/.test(m.name), { width: 0.0008, weld: true })
    return mergeByMaterial(r)
  }, [gltf])
  // (fitted to the genkan as it is: the same as modelled, unless the room's been laid out otherwise)
  const sx = (x[1] - x[0]) / (GENKAN_MODELLED.x[1] - GENKAN_MODELLED.x[0]), sz = (z[1] - z[0]) / (GENKAN_MODELLED.z[1] - GENKAN_MODELLED.z[0])
  return (
    <group position={[x[0] - GENKAN_MODELLED.x[0] * sx, 0, z[0] - GENKAN_MODELLED.z[0] * sz]} scale={[sx, 1, sz]}>
      <primitive object={obj} />
    </group>
  )
})

// (drawn again only when their own props change, not each time the page above them redraws: while the shop's open that's many times a second)
export const DiningFloor = memo(DiningFloorImpl)
export const RoomFloor = memo(RoomFloorImpl)
