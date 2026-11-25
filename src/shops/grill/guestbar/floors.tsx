import { memo, useEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { StaticBatch, mergeByMaterial } from '@/scene/render/StaticBatch'
import { FloorPiece } from '@/scene/props/FloorPiece'
import { inkModel } from '@/scene/render/inkHull'
import { WC_W, WC_ROOM, kitchenOf, kitchenGatesOf, FLOOR_FAR, FLOOR_NEAR, GENKAN, storeOf, STORE, toiletsOf, roomOf, RICE_MAT, type Counter } from '@/shops/grill/bar'
import { Movable } from '@/shops/grill/editor/Movable'
import { signTexture } from '@/scene/props/signFont'

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
/**
 * The shop's base: a thick plinth of wood under the whole room (the customers' floor on a solid fill, the kitchen's lower
 * floor in a well in it), a pale rim of boards round its top edge, a dark body, a toe board at its foot, standing
 * out past the room all round: so it all sits on something solid, not on nothing.
 */
function ShopBase({ rects, genkan, drop, step }: { rects: [[number, number], [number, number]][]; genkan: [[number, number], [number, number]]
  /** how far down the genkan's stone lies */
  step: number; drop: number }) {
  const top = -drop - 0.003
  // (each piece of the base is cut exactly to the room's own outline: the floor's pieces and the genkan's corner, no more; its sides take no
  // shadow: what stands by the floor's edge threw its shadow out onto the plinth's face, hanging there below the floor)
  const layers = (al: [number, number], ly: [number, number], key: string) => {
    const cx = -(ly[0] + ly[1]) / 2, cz = (al[0] + al[1]) / 2
    const W = ly[1] - ly[0], L = al[1] - al[0]
    // (its rim board, its dark body in boards laid the long way, its toe board: each in timber, the grain running along it)
    return [[top, 0.06], [top - 0.06, 0.22], [top - 0.28, 0.05]].map(([y0, h], i) => (
      <mesh key={`${key}${i}`} position={[cx, (y0 as number) - (h as number) / 2, cz]} geometry={timberBox(W, h as number, L, BASE_TILE.along, BASE_TILE.across)}
        material={BASE_TIMBER[i]} />
    ))
  }
  const [gal, gly] = genkan
  // (under the genkan's stone, solid up to it, and in stone: granite courses from its stones down to the base's foot (item 287), where the
  // rest of the base is timber)
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
  return (
    <>
      {rects.flatMap(([al, ly], i) => layers(al, ly, `r${i}`))}
      <primitive object={steps} />
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
  // (the rim board a single board deep; the body six courses to the half unit; the toe a single board)
  return [make('#5c3a22', 1, 9157), make('#3d2414', 6, 4271), make('#2a180c', 1, 7331)]
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

/** a soft dark shadow, a rounded oblong blurred out to nothing at its edges, for the shop to stand on */
const GROUND_SHADOW = (() => {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = 512; c.height = 512
  const g = c.getContext('2d')!
  g.filter = 'blur(38px)'
  g.fillStyle = 'rgba(0,4,12,0.85)'
  g.beginPath(); g.roundRect(90, 90, 332, 332, 40); g.fill()
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
  const bases = useMemo(() => [[[a0, g0], [l0, l1]], [[g0, a1], [gl, l1]], ...(back ? [[back.al, back.ly]] : []), ...(bump ? [[bump.al, bump.ly]] : [])] as [[number, number], [number, number]][],
    [a0, g0, l0, l1, a1, gl, back, bump])
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
      <ShopBase rects={bases} genkan={[[g0, a1], [l0, gl]]} step={D} drop={baseDrop} />
      {/* (the floor's edge, dark, all the way round but where the genkan's kamachi is: from the kamachi's end by the door, round the
          room's open end, along its open side, up the side wall and along the back wall to the genkan, each corner mitred (the owner's: the
          strip along the side wall stopped short of the corner, and the open edges had none)) */}
      <mesh geometry={edging} material={EDGING} />
      {backEdging && <mesh geometry={backEdging} material={EDGING} />}
      {/* (the whole shop's soft shadow on the ground it stands on, under its base and spreading out past it a little) */}
      <mesh position={[-(L0 + L1) / 2 - 0.12, -baseDrop - 0.34, (A0 + a1) / 2 + 0.1]} rotation-x={-Math.PI / 2} renderOrder={-1}>
        <planeGeometry args={[(L1 - L0) + 2.4, (a1 - A0) + 2.4]} />
        <meshBasicMaterial map={GROUND_SHADOW} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      {/* (and a solid fill under the boards right down to the base: round the kitchen's well when it's sunk, under the kitchen's dais as
          well when it's raised; nothing to see through between the floor and the base) */}
      {bases.flatMap(([al, ly], n) => (drop > 0 ? minus(al as [number, number], ly as [number, number], kitchen)
        : [[al, ly] as [[number, number], [number, number]]]).map(([a, l], i) => (
        // (its sides, showing as the step down into the kitchen, in the base's dark timber boards)
        <mesh key={`fill${n}${i}`} position={[-(l[0] + l[1]) / 2, 0.001 - (baseDrop + 0.004) / 2, (a[0] + a[1]) / 2]}
          geometry={timberBox(l[1] - l[0], baseDrop + 0.004, a[1] - a[0], BASE_TILE.along, BASE_TILE.across)} material={BASE_TIMBER[1]} />
      )))}
      {drop > 0 ? <KitchenPit counters={counters} drop={drop} /> : <KitchenDais counters={counters} rise={-drop} />}
      {/* (the genkan's side's low curb of stone, from its stone up to the boards over the footing's side (StoneSide, item 287 and 496), is
          gone (item 539, the owner's 「這塊拿掉」)) */}
      {/* (the room's open end at the door, from the boards down to the footing, is gone (item 407, the owner's 「這片到底是甚麼? 拿掉」): the
          genkan's stone lies 10 cm under the boards, and at the door it stood up over the genkan's stone like a low wall) */}
      </StaticBatch>
      {/* (the earth it stands on, round it and out before the door (item 708)) */}
      <ShopGround x={[-L1, -L0]} z={[A0, a1]} door={[-gl, -l0]} />
      {/* (the rush mat under the rice by the sake (item 717)) */}
      <Movable id="ricemat" label="草蓆" ground={0}><RiceMat /></Movable>
      {/* the genkan: its stones laid crazy-paving in pebble-wash, the shoe-off stone at the step, the threshold, the polished keyaki step
          (item 185: one flat picture of stones and two thin boards before) */}
      <GenkanFloor x={[-gl, -l0]} z={[g0, a1]} />
    </group>
  )
}
/**
 * The rush mat (茣蓙) under the rice sacks and the sake barrels (item 717, the owner's 「紅框地板鋪草蓆」, bar.ts's RICE_MAT): pale rush woven
 * along its length, the warp's threads across it now and then, a little blotched as a used one is; along its two long sides a binding of
 * dark green cloth with a fine pale line in it. A thin board on the floor's boards (1 mm over them, not in one plane), its picture on its
 * top, its sides the rush's colour; one draw
 */
const RICE_MAT_TEX = signTexture(512, 300, (g) => {
  g.fillStyle = '#c4ab72'
  g.fillRect(0, 0, 512, 300)
  // (blotches: drier, paler; darker where it's been trodden and sat on)
  let seed = 717
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  for (let i = 0; i < 40; i++) {
    const x = rnd() * 512, y = rnd() * 300, r = 20 + rnd() * 70, light = i % 2
    const gr = g.createRadialGradient(x, y, 0, x, y, r)
    gr.addColorStop(0, light ? 'rgba(230,212,160,0.22)' : 'rgba(120,96,52,0.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2)
  }
  // (the rush along its length, a stalk a few pixels, each its own shade)
  for (let y = 0; y < 300; y += 3) {
    g.fillStyle = `rgba(${rnd() < 0.5 ? '100,78,40' : '240,226,180'},${0.12 + rnd() * 0.16})`
    g.fillRect(0, y, 512, 1.4)
  }
  // (the warp's threads across it)
  for (let x = 14; x < 512; x += 38) { g.fillStyle = 'rgba(90,70,40,0.42)'; g.fillRect(x, 0, 1.6, 300) }
  // (its binding along both long sides: dark green cloth, a fine pale line along it)
  for (const y0 of [0, 300 - 22]) {
    g.fillStyle = '#26402f'; g.fillRect(0, y0, 512, 22)
    g.fillStyle = 'rgba(214,200,160,0.55)'; g.fillRect(0, y0 + 10, 512, 1.5)
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, y0 === 0 ? 21 : y0, 512, 1.5)
  }
})
const RICE_MAT_MAT = new THREE.MeshToonMaterial({ map: RICE_MAT_TEX })
const RiceMat = memo(function RiceMat() {
  const [x0, x1] = RICE_MAT.x, [z0, z1] = RICE_MAT.z
  const geo = useMemo(() => new THREE.BoxGeometry(x1 - x0, RICE_MAT.t - 0.001, z1 - z0), [x0, x1, z0, z1])
  useEffect(() => () => geo.dispose(), [geo])
  // (its long sides along x: the picture's binding along them, the box's top face's u along x and v along z)
  return <mesh name="rice-mat" geometry={geo} material={RICE_MAT_MAT} position={[(x0 + x1) / 2, 0.001 + (RICE_MAT.t - 0.001) / 2, (z0 + z1) / 2]}
    receiveShadow raycast={() => null} />
})
/** (item 708) the earth's picture's pixels to a bar unit (about 1.1 cm each); how far out round the building it reaches, how much farther
 * out before the door, and over how much its edge fades into the night or the day round it; its height (2 mm under the street's ground,
 * -0.46, where the door's bamboo and the stone steps stand) */
const EARTH_PX = 88, EARTH_ROUND = 1.5, EARTH_DOOR = 3.0, EARTH_FADE = 0.6, EARTH_Y = -0.462
/** a small seeded random (the earth the same every time it's made) */
function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
/** a point round a rectangle's edge, `t` along it from its first corner (its four sides in turn) */
function roundEdge(a0: number, b0: number, a1: number, b1: number, t: number): [number, number] {
  const w = a1 - a0, h = b1 - b0
  if (t < w) return [a0 + t, b0]
  if (t < w + h) return [a1, b0 + t - w]
  if (t < 2 * w + h) return [a1 - (t - w - h), b1]
  return [a0, b1 - (t - 2 * w - h)]
}
/**
 * The earth the shop stands on (item 708, the owner's 「然後模型周圍我需要一點泥土地，門口多一些」): one sheet of tamped earth under it, out
 * EARTH_ROUND round the building and EARTH_DOOR before the door, in the floor's frame (x = -lay, z = along; `x`, `z` the building's
 * footprint, `door` the doorway across x at the z[1] end). Its picture painted once: brown earth in lighter and darker patches, pebbles
 * with their little shadows, grit; a trodden, paler way out from the door; a few weeds where it thins; its edge ragged and faded out to
 * nothing. Outside the shop's indoor boxes (scene/render/indoorSun: under them), so the sun lies on it and the shadows of what's out of
 * doors fall on it (the door's bamboo, the lantern, the facade); one see-through sheet, one draw, under the building's own soft shadow
 */
const ShopGround = memo(function ShopGround({ x, z, door }: { x: [number, number]; z: [number, number]; door: [number, number] }) {
  const [x0, x1] = x, [z0, z1] = z, [d0, d1] = door
  const made = useMemo(() => {
    if (typeof document === 'undefined') return null
    const X0 = x0 - EARTH_ROUND, X1 = x1 + EARTH_ROUND, Z0 = z0 - EARTH_ROUND, Z1 = z1 + EARTH_DOOR
    const W = X1 - X0, H = Z1 - Z0
    const cw = Math.min(1400, Math.round(W * EARTH_PX)), ch = Math.min(1400, Math.round(H * EARTH_PX))
    const sx = cw / W, sz = ch / H
    // (the picture's rows run along z from Z0 (its top: the plane's far edge as it's laid, flipY), its columns along x from X0)
    const px = (v: number) => (v - X0) * sx, pz = (v: number) => (v - Z0) * sz
    const rnd = seeded(708)
    const c = document.createElement('canvas')
    c.width = cw; c.height = ch
    const g = c.getContext('2d')!
    g.fillStyle = 'rgb(98,76,54)'
    g.fillRect(0, 0, cw, ch)
    const blob = (cx: number, cy: number, r: number, rgb: string, a: number) => {
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r)
      gr.addColorStop(0, `rgba(${rgb},${a})`)
      gr.addColorStop(1, `rgba(${rgb},0)`)
      g.fillStyle = gr
      g.fillRect(cx - r, cy - r, r * 2, r * 2)
    }
    // (patches, broad and soft: drier and paler, damper and darker)
    const patch: [string, number][] = [['140,112,80', 0.18], ['70,54,40', 0.18], ['60,47,36', 0.14], ['124,100,72', 0.16]]
    for (let i = 0; i < 170; i++) blob(rnd() * cw, rnd() * ch, (0.25 + rnd() * 0.7) * sx, ...patch[i % 4])
    // (mottling)
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = i % 2 ? 'rgba(132,106,78,0.12)' : 'rgba(62,48,36,0.12)'
      g.beginPath(); g.arc(rnd() * cw, rnd() * ch, (0.02 + rnd() * 0.05) * sx, 0, Math.PI * 2); g.fill()
    }
    // (the way out from the door, trodden flat and paler)
    g.save()
    g.filter = `blur(${Math.round(0.25 * sx)}px)`
    g.fillStyle = 'rgba(150,124,92,0.3)'
    g.beginPath(); g.ellipse(px((d0 + d1) / 2), pz(z1 + 1.0), ((d1 - d0) / 2 + 0.25) * sx, 1.15 * sz, 0, 0, Math.PI * 2); g.fill()
    g.restore()
    // (pebbles, each with its little shadow under its far side)
    const stone = ['rgb(150,142,128)', 'rgb(128,120,108)', 'rgb(170,162,148)', 'rgb(110,102,92)']
    for (let i = 0; i < 900; i++) {
      const cx = rnd() * cw, cy = rnd() * ch, r = (0.008 + rnd() * rnd() * 0.022) * sx, a = rnd() * Math.PI
      g.fillStyle = 'rgba(40,30,22,0.35)'
      g.beginPath(); g.ellipse(cx + r * 0.35, cy + r * 0.45, r, r * 0.7, a, 0, Math.PI * 2); g.fill()
      g.fillStyle = stone[i % 4]
      g.beginPath(); g.ellipse(cx, cy, r, r * 0.7, a, 0, Math.PI * 2); g.fill()
    }
    // (grit)
    for (let i = 0; i < 14000; i++) {
      g.fillStyle = i % 3 ? 'rgba(58,45,34,0.4)' : 'rgba(190,170,140,0.4)'
      g.fillRect(rnd() * cw, rnd() * ch, 1, 1)
    }
    // (its shape: round the building, out before the door, its edge ragged and soft)
    const near = 0.8
    const rects: [number, number, number, number, number][] = [
      [x0 - near, z0 - near, x1 + near, z1 + near, 0.6],
      [d0 - 0.95, z1 - 0.2, d1 + 0.95, z1 + EARTH_DOOR - near - 0.15, 1.0],
    ]
    // (a few weeds where it thins, under the fade)
    for (const [a0, b0, a1, b1] of rects) {
      for (let i = 0; i < 60; i++) {
        const side = Math.floor(rnd() * 4), t = rnd(), out = 0.05 + rnd() * 0.35
        const [ex, ez] = side === 0 ? [a0 + t * (a1 - a0), b0 - out] : side === 1 ? [a1 + out, b0 + t * (b1 - b0)]
          : side === 2 ? [a0 + t * (a1 - a0), b1 + out] : [a0 - out, b0 + t * (b1 - b0)]
        const cx = px(ex), cy = pz(ez)
        g.strokeStyle = rnd() < 0.5 ? 'rgba(78,98,52,0.7)' : 'rgba(96,112,60,0.65)'
        g.lineWidth = 1.2
        for (let j = 0; j < 4; j++) {
          const a = -Math.PI / 2 + (rnd() - 0.5) * 1.6, l = (0.02 + rnd() * 0.03) * sx
          g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * l, cy + Math.sin(a) * l); g.stroke()
        }
      }
    }
    const m = document.createElement('canvas')
    m.width = cw; m.height = ch
    const mg = m.getContext('2d')!
    mg.filter = `blur(${Math.round(EARTH_FADE * sx * 0.45)}px)`
    mg.fillStyle = '#fff'
    mg.beginPath()
    for (const [a0, b0, a1, b1, r] of rects) mg.roundRect(px(a0), pz(b0), (a1 - a0) * sx, (b1 - b0) * sz, r * sx)
    mg.fill()
    // (bumps out of its edge here and there: ragged, not holed)
    for (const [a0, b0, a1, b1] of rects) {
      const per = 2 * ((a1 - a0) + (b1 - b0))
      for (let i = 0; i < per * 3; i++) {
        const [ex, ez] = roundEdge(a0, b0, a1, b1, rnd() * per)
        mg.beginPath(); mg.arc(px(ex + (rnd() - 0.5) * 0.3), pz(ez + (rnd() - 0.5) * 0.3), (0.12 + rnd() * 0.3) * sx, 0, Math.PI * 2); mg.fill()
      }
    }
    g.globalCompositeOperation = 'destination-in'
    g.drawImage(m, 0, 0)
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    const mat = new THREE.MeshToonMaterial({ map: tex, transparent: true, depthWrite: false })
    mat.name = 'ShopGround'
    const geo = new THREE.PlaneGeometry(W, H)
    return { tex, mat, geo, cx: (X0 + X1) / 2, cz: (Z0 + Z1) / 2 }
  }, [x0, x1, z0, z1, d0, d1])
  useEffect(() => () => { made?.tex.dispose(); made?.mat.dispose(); made?.geo.dispose() }, [made])
  if (!made) return null
  return <mesh name="shop-ground" geometry={made.geo} material={made.mat} position={[made.cx, EARTH_Y, made.cz]} rotation-x={-Math.PI / 2}
    renderOrder={-2} receiveShadow raycast={() => null} />
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
