import { memo, useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useProgress } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { bakeable, colourVertices, keyOf, plainShared } from './StaticBatch'
import { laterPending, laterSeen, sceneDrawn } from './Later'
import { HOVER, anyLit } from '@/scene/interact/hoverGlow'
import { WORLD, giveBack, mergeAway, mergeState, takeOut, type WorldSpan } from './worldMerge'
import { paused } from '@/scene/kit/speed'

/** how often (ms) the room's meshes are looked over for what's kept still (the same place at two looks running) */
const LOOK_MS = 1200
/** what's come in and kept still since it was made, ADD_MIN or more of it, merged on its own and added to it, ADD_MS apart (never made again
 * whole by itself: what's taken out is drawn by itself, as before the merge; made again whole only as the editor's shut) */
const ADD_MIN = 24
const ADD_MS = 3000
/** (item 598) how long a piece must have kept still to be added to what's merged once it's made: the plates, bowls and food set down for a
// while were merged after 2.4 s and taken out again as they were picked up, the merge growing all the while the shop was open */
const SETTLED_MS = 30_000
/** (item 767) the first making held till the shop's all in (the loading veil's own test, ui/LoadingScreen's: nothing loading, every staged
 * part in, the shop drawn) through two looks, so all of it's kept still; made at FIRST_BY_MS whatever (a file that never comes) */
const FIRST_BY_MS = 40_000
/** (item 523, the owner's 「先啟用整間合併」) by default the whole room merged, a look at a time, by stretches of the room (CELL 3, 6 since item 529): the
 * overview 1,587 draws to 1,119 (the ink lines alone merged, as before, about 1,400), the close views 20 to 30% fewer, their triangles about as
 * unmerged (one mesh a look for the whole room, `?world=1`, drew fewer still, 888, but two to three times the close views' triangles: the merge
 * isn't culled by piece), each view's picture the same as unmerged but for what moves (the clock's pendulum, the window's street, the cats'
 * paws); built, the frame rate the same on this machine (59.5 / 59.6), at x2 in a rush 4% more frames. `?world=ink`: the ink lines alone
 * (the default from item 374 to 523); `?world=0` none of it; `?world=1` one mesh a look for the whole room */
const WORLD_ASK = typeof location === 'undefined' ? '0' : new URLSearchParams(location.search).get('world')
const INK_ONLY = WORLD_ASK === 'ink'
const OFF = !INK_ONLY && WORLD_ASK !== '1' && WORLD_ASK !== null
/** the room's merge split by stretches of the room this many units across (x and z), a look's mesh a stretch (`?wcell=<units>`, item 374:
 * tried against a look's one mesh for all the room); 0: not split (only as `?world=1` asks) */
// (item 529, the owner's 「這遊戲玩到後面都很卡」: six across, not three: with the shop full the CPU's held up by how many things are drawn,
// not their triangles: busy, the overview 1,755 draws to 1,506 and 32.8 ms a frame to 26.9 (30 to 37 frames a second), shut 1,104 to 1,001,
// the triangles the same in every view, the worst 1% of the views' frames 25 to 36 a second; one for the whole room, 1,439 and 26.3 ms)
const CELL = typeof location === 'undefined' ? 0 : Number(new URLSearchParams(location.search).get('wcell')) || (WORLD_ASK === '1' ? 0 : 6)
const CENTRE = new THREE.Vector3()

/** a mesh the room's merge can take: one material, opaque, drawn whole, nothing of its own done as it's drawn */
function mergeable(o: THREE.Object3D): o is THREE.Mesh {
  const m = o as THREE.Mesh
  if (!m.isMesh || (m as THREE.SkinnedMesh).isSkinnedMesh || (m as THREE.InstancedMesh).isInstancedMesh || Array.isArray(m.material)) return false
  if (m.userData.worldBatch || m.userData.noWorld || mergeState(m)) return false
  const g = m.geometry, mat = m.material as THREE.Material & { aoMap?: unknown; lightMap?: unknown }
  if (!g?.attributes.position || g.morphAttributes.position || g.drawRange.start !== 0 || g.drawRange.count !== Infinity) return false
  if (mat.transparent || mat.userData.noWorld || mat.aoMap || mat.lightMap || mat.visible === false) return false
  // (only what the eye's camera draws: on layer 0 (with the mirror's or not); a view's camera marker is on layer 5 but in the editor)
  if (!m.layers.isEnabled(0)) return false
  if (m.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender || mat.onBeforeRender !== THREE.Material.prototype.onBeforeRender) return false
  // (a hand-written shader only the ink lines' kind: drawn from inside out, its look all in its uniforms)
  if ((mat as THREE.ShaderMaterial).isShaderMaterial && mat.side !== THREE.BackSide) return false
  // (only the ink lines, asked so: drawn from inside out, a hand-written shader or a plain one)
  // (or what asks for it (userData.worldMerge: the signed wall's pieces, item 402: many small still pieces of one picture))
  if (INK_ONLY && !m.userData.worldMerge && !(mat.side === THREE.BackSide && ((mat as THREE.ShaderMaterial).isShaderMaterial || (mat as THREE.MeshBasicMaterial).isMeshBasicMaterial))) return false
  // (nor what fades as it comes between the camera and what's looked at (scene/OccluderFade: a lamp, the noren): its material's swapped for a
  // see-through copy then, and it was taken out of the merge each time, twice and left out; now never put in)
  for (let q = m.parent; q; q = q.parent) if (q.userData.fadeOccluder) return false
  return true
}
/** the group it's merged within: the nearest above it that's hidden as a whole now and then (userData.hideRoot: a wall hidden while the
 * camera's round behind it), its merge put under it and hidden with it; else the room */
function rootOf(o: THREE.Object3D, scene: THREE.Object3D) {
  for (let q = o.parent; q && q !== scene; q = q.parent) if (q.userData.hideRoot) return q
  return scene
}
/** shown, it and all it's under up to its root (the root's own hiding hides its merge with it), and in the room */
function inRoom(o: THREE.Object3D, scene: THREE.Object3D) {
  let q: THREE.Object3D | null = o.parent
  for (; q; q = q.parent) {
    if (q === scene) return true
    if (q.userData.hideRoot) { for (let r = q.parent; r; r = r.parent) if (r === scene) return true; return false }
    if (!q.visible) return false
  }
  return false
}
const sameAt = (a: THREE.Matrix4, b: THREE.Matrix4) => { for (let i = 0; i < 16; i++) if (Math.abs(a.elements[i] - b.elements[i]) > 1e-6) return false; return true }

/** an ink line's hull (scene/inkHull's: a shader drawn from inside out, each vertex pushed out along its normal by its width (uWidth) in the
 * piece's own units, before the piece's matrix) */
const isHull = (m: THREE.Material) => (m as THREE.ShaderMaterial).isShaderMaterial && m.side === THREE.BackSide && !!(m as THREE.ShaderMaterial).uniforms?.uWidth
/** how far a mesh's material pushes it out (a hull's width; 0 for anything else) */
const pushOf = (m: THREE.Material) => (isHull(m) ? ((m as THREE.ShaderMaterial).uniforms.uWidth.value as number) : 0)
/** a hull's shape pushed out as its shader pushes it (`w` along each vertex's normal, in its own units), to be merged so: its line in the
 * room's frame then exactly as wide as round the piece itself, however the piece is scaled */
function pushedOut(g: THREE.BufferGeometry, w: number) {
  const x = new THREE.BufferGeometry()
  for (const [k, a] of Object.entries(g.attributes)) x.setAttribute(k, a)
  if (g.index) x.setIndex(g.index)
  const pos = (g.attributes.position as THREE.BufferAttribute).clone(), nrm = g.attributes.normal as THREE.BufferAttribute | undefined
  if (nrm) for (let i = 0; i < pos.count; i++) {
    const nx = nrm.getX(i), ny = nrm.getY(i), nz = nrm.getZ(i), l = Math.hypot(nx, ny, nz) || 1
    pos.setXYZ(i, pos.getX(i) + (nx / l) * w, pos.getY(i) + (ny / l) * w, pos.getZ(i) + (nz / l) * w)
  }
  x.setAttribute('position', pos)
  return x
}
/** a hull's material with no width of its own (its shape's pushed out already, pushedOut): a copy of it (the same shader, so the same
 * program; its colour the same uniform), made once for each */
const FLAT_INK = new Map<THREE.Material, THREE.Material>()
function flatInk(mat: THREE.Material) {
  let c = FLAT_INK.get(mat)
  if (!c) {
    const sh = mat as THREE.ShaderMaterial
    const x = sh.clone()
    x.uniforms.uWidth = { value: 0 }
    if (sh.uniforms.uColor) x.uniforms.uColor = sh.uniforms.uColor
    FLAT_INK.set(mat, (c = x))
  }
  return c
}

/** what's watched of a merged mesh: where it was, its material and look as merged, its shape's version */
type Watch = { m: THREE.Mesh; at: THREE.Matrix4; mat: THREE.Material; colour: number; glow: number; geo: THREE.BufferGeometry; ver: number; layers: number }
const hexOf = (m: THREE.Material, k: 'color' | 'emissive') => ((m as THREE.MeshToonMaterial)[k] as THREE.Color | undefined)?.getHex() ?? -1

/**
 * The room's meshes merged across it (item 367; scene/worldMerge): every LOOK_MS the room's meshes are looked over, and those in the same
 * place as at the last look (kept still), opaque and drawn whole, are merged, a mesh for each look they share (StaticBatch's keyOf: the
 * colour, pictures, finish, glow, depth's pull and shader's uniforms; and the shadows cast and taken, the draw order); theirs
 * hidden (worldMerge's mergeAway). Watched every frame after: one that moves, goes from the room, is hidden (by itself or what it's under), is
 * given another material or its colour or glow changes, or has its shape changed, is taken out of it on the spot (worldMerge's takeOut,
 * twice so and it's left out after); a quarter taken out, or the editor left, and it's made again. The editor on, it's all given back.
 * Nothing new to draw with (their own materials), nothing to point at (the originals are what the pointer finds), the same shadows.
 */
// (item 374: drawn again only as its own props change: it does its work in its frames and effects, and was drawn again with every redraw
// of the page or the scene, about three times a second, for nothing)
export const WorldBatch = memo(function WorldBatch() {
  const scene = useThree((s) => s.scene)
  /** what's merged: its meshes (`base` of them as it was made, the rest added since) and what's watched */
  const built = useRef<{ meshes: THREE.Mesh[]; watch: Watch[]; base: number } | null>(null)
  const seen = useRef(new Map<THREE.Mesh, THREE.Matrix4>())
  /** since when each has kept still where it is */
  const since = useRef(new Map<THREE.Mesh, number>())
  const lastLook = useRef(0)
  const madeAt = useRef(0)
  const mountedAt = useRef(performance.now())
  const strikes = useRef(new WeakMap<THREE.Mesh, number>())
  /** (item 767) how many looks running the shop's been all in; what's been offered to be added already (a look of its own in its stretch,
   * nothing to merge it with, it was offered again every few seconds for nothing: 18 to 45 ms frames, 3.6 s apart, all day) */
  const loadedLooks = useRef(0)
  const tried = useRef(new WeakSet<THREE.Mesh>())
  const frame = useRef(0)
  const undo = useRef(() => {})
  undo.current = () => {
    const b = built.current
    if (!b) return
    built.current = null
    for (const m of b.meshes) { m.removeFromParent(); m.geometry.dispose() }
    for (const w of b.watch) giveBack(w.m)
    WORLD.dirty = true
    WORLD.changedAt = performance.now()
  }
  useEffect(() => () => undo.current(), [])
  /** `list` merged, a mesh for each look they share; `more`: added to what's merged (what's come in and kept still since), not made anew */
  const build = (list: THREE.Mesh[], more = false) => {
    if (!more) {
      WORLD.dirty = false
      WORLD.builds++
      WORLD.out = 0
      tried.current = new WeakSet()
    }
    const groups = new Map<string, { mat: THREE.Material; list: THREE.Mesh[]; cast: boolean; take: boolean; order: number; colours: boolean; root: THREE.Object3D; layers: number; plain: boolean }>()
    for (const m of list) {
      if ((strikes.current.get(m) ?? 0) >= 2 || !mergeable(m) || !m.visible || !inRoom(m, scene)) continue
      // (a plain colour drawn with the material every plain colour drawn its way shares, its colour on its points (item 598): one draw a
      // stretch for all of them, where each colour was its own)
      const plain = plainShared(m.material as THREE.Material)
      const mat = plain ?? (m.material as THREE.Material)
      const root = rootOf(m, scene)
      // (and, the room's own (not a wall's), by the stretch of the room it's in (CELL across, x and z), so a close view leaves the rest out)
      let cell = ''
      if (CELL && root === scene) {
        if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere()
        const c = CENTRE.copy(m.geometry.boundingSphere!.center).applyMatrix4(m.matrixWorld)
        cell = `${Math.floor(c.x / CELL)},${Math.floor(c.z / CELL)}`
      }
      // (an ink hull's width left out of its look (item 598): each one's pushed out by its own as it's baked, the merged one drawn with none;
      // apart by width, the ink was 38 of the room's draws)
      const look = isHull(mat) ? keyOf(mat).replace(/\|uWidth=[^|]*/, '') : keyOf(mat)
      const key = `${look}|${m.renderOrder}|${m.castShadow}|${m.receiveShadow}|${root.uuid}|${cell}|L${m.layers.mask}`
      const g = groups.get(key) ?? { mat, list: [], cast: m.castShadow, take: m.receiveShadow, order: m.renderOrder, colours: !!(mat as THREE.MeshToonMaterial).vertexColors, root, layers: m.layers.mask, plain: !!plain }
      g.list.push(m)
      groups.set(key, g)
    }
    // (merged away only with every mesh under it merged too (or merged already): the renderer draws nothing under what it's hidden, and a
    // hull left out (alone in its look) went with its piece, its line gone; a look left with one, not merged at all, and so on round)
    const going = new Set<THREE.Mesh>()
    for (let pass = 0; pass < 4; pass++) {
      going.clear()
      for (const g of groups.values()) if (g.list.length >= 2) for (const m of g.list) going.add(m)
      let held = 0
      for (const g of groups.values()) {
        if (g.list.length < 2) continue
        const keep = g.list.filter((m) => {
          let ok = true
          m.traverse((d) => { if (ok && d !== m && (d as THREE.Mesh).isMesh && !going.has(d as THREE.Mesh) && !mergeState(d)?.hidden) ok = false })
          return ok
        })
        held += g.list.length - keep.length
        g.list = keep
      }
      if (!held) break
    }
    const made: THREE.Mesh[] = []
    const watch: Watch[] = []
    for (const g of groups.values()) {
      if (g.list.length < 2) continue
      // (in its root's frame: under the wall it's on, it goes where the wall goes)
      g.root.updateWorldMatrix(true, false)
      const toRoot = g.root === scene ? null : new THREE.Matrix4().copy(g.root.matrixWorld).invert()
      // (an ink hull pushed out as its shader would, each by its own width in its own units, and drawn with no width of its own)
      const hull = isHull(g.mat)
      const geos = g.list.map((m) => {
        m.updateWorldMatrix(true, false)
        const push = pushOf(m.material as THREE.Material)
        const own = push ? pushedOut(m.geometry, push) : m.geometry
        const x = bakeable(own, toRoot ? new THREE.Matrix4().multiplyMatrices(toRoot, m.matrixWorld) : m.matrixWorld)
        // (a plain colour's on its points; the shared material's already plain colours have theirs)
        // (asked of each mesh, not its look's first: a look begun by a piece already on the shared material (plainColours) took the plain
        // colours after it as white (the room's rim, a book under the till, the first try))
        if (!(m.material as THREE.MeshToonMaterial).vertexColors && plainShared(m.material as THREE.Material)) colourVertices(x, (m.material as THREE.MeshToonMaterial).color)
        // (colours on the points only where the material reads them (white where it does and they've none): mismatched, they won't merge)
        if (!g.colours && x.attributes.color) x.deleteAttribute('color')
        if (g.colours && !x.attributes.color) x.setAttribute('color', new THREE.BufferAttribute(new Float32Array(x.attributes.position.count * 3).fill(1), 3))
        return x
      })
      const counts = geos.map((x) => x.attributes.position.count)
      const geo = mergeGeometries(geos)
      for (const x of geos) x.dispose()
      if (!geo) continue
      // (its normals, UVs and colours let go of once they're on the graphics card: only its positions are written again (a part drawn in))
      for (const k of ['normal', 'uv', 'color']) (geo.attributes[k] as THREE.BufferAttribute | undefined)?.onUpload(function (this: THREE.BufferAttribute) { (this as unknown as { array: unknown }).array = null })
      const mesh = new THREE.Mesh(geo, hull ? flatInk(g.mat) : g.mat)
      mesh.name = 'world-batch'
      mesh.castShadow = g.cast
      mesh.receiveShadow = g.take
      mesh.renderOrder = g.order
      mesh.raycast = () => {}
      mesh.matrixAutoUpdate = false
      mesh.userData.worldBatch = true
      mesh.layers.mask = g.layers
      g.root.add(mesh)
      mesh.updateMatrixWorld(true)
      made.push(mesh)
      let from = 0
      g.list.forEach((m, i) => {
        const n = counts[i]
        const span: WorldSpan = { mesh, from, n, src: m, toRoot, push: pushOf(m.material as THREE.Material) }
        from += n
        const mat = m.material as THREE.Material
        watch.push({ m, at: m.matrixWorld.clone(), mat, colour: hexOf(mat, 'color'), glow: hexOf(mat, 'emissive'), geo: m.geometry, ver: (m.geometry.attributes.position as THREE.BufferAttribute).version, layers: m.layers.mask })
        mergeAway(m, span)
      })
    }
    const b = built.current
    // (an add counted only as something's merged by it (item 767))
    if (more && made.length) WORLD.adds++
    if (more && b) { b.meshes.push(...made); b.watch.push(...watch) }
    else built.current = made.length ? { meshes: made, watch, base: made.length } : null
  }
  useFrame(() => {
    if (OFF) return
    frame.current++
    // (the editor on: everything as it is, to be picked and moved)
    if (HOVER.paused) { if (built.current) undo.current(); return }
    const b = built.current
    if (b) {
      // ---- what's merged, watched: anything changed taken out on the spot
      const f = frame.current
      for (let i = 0; i < b.watch.length; i++) {
        const w = b.watch[i], m = w.m
        const st = mergeState(m)
        if (!st?.hidden || st.lifted) continue
        const gone = m.material !== w.mat ? 'material' : m.geometry !== w.geo || (m.geometry.attributes.position as THREE.BufferAttribute).version !== w.ver ? 'shape'
          : !sameAt(m.matrixWorld, w.at) ? 'moved' : m.layers.mask !== w.layers ? 'layers'
            // (and, a few at a time, whether it's still in the room and shown, and its colour and glow as they were)
            : (i + f) % 6 !== 0 ? '' : !inRoom(m, scene) || w.mat.visible === false ? 'hidden' : hexOf(w.mat, 'color') !== w.colour ? 'colour' : hexOf(w.mat, 'emissive') !== w.glow ? 'glow' : ''
        if (gone) { takeOut(m, gone); strikes.current.set(m, (strikes.current.get(m) ?? 0) + 1) }
      }
    }
    // ---- the room looked over now and then: what's kept still since the last look
    const now = performance.now()
    // (the veil lifting and nothing made yet (worldMerge's veilLifting, item 767): looked over now, not at the next look's time)
    const forced = WORLD.lifting && !b
    if (now - lastLook.current < LOOK_MS && !forced) return
    lastLook.current = now
    WORLD.lifting = false
    const was = seen.current, next = new Map<THREE.Mesh, THREE.Matrix4>(), keep: THREE.Mesh[] = []
    const wasSince = since.current, nextSince = new Map<THREE.Mesh, number>()
    scene.traverseVisible((o) => {
      if (!mergeable(o)) return
      const at = was.get(o)
      if (at && sameAt(at, o.matrixWorld)) keep.push(o)
      const still = !!at && sameAt(at, o.matrixWorld)
      next.set(o, still ? at : o.matrixWorld.clone())
      nextSince.set(o, still ? (wasSince.get(o) ?? now) : now)
    })
    seen.current = next
    since.current = nextSince
    // (the shop all in this look: the loading veil's own test (ui/LoadingScreen), item 767)
    const loaded = !useProgress.getState().active && laterPending() === 0 && laterSeen() && sceneDrawn()
    loadedLooks.current = loaded ? loadedLooks.current + 1 : 0
    // (come into the room and kept still since it was made (the room still loading, a piece put down): merged on their own and added to it, what's
    // merged left as it is (made again whole each time, it was made thirteen times in its first two minutes as the room loaded, each a hitch:
    // every piece in the room baked again); made again whole only once what's added has come to half as many meshes as it was made with)
    // (added only what's kept still a while (SETTLED_MS): not what's only set down a moment)
    // (and only as ADD_MIN of it are new since the last offer (item 767): what's alone in its look in its stretch had nothing to merge with and
    // was offered again every look past ADD_MS, a 18 to 45 ms frame each 3.6 s; offered again with the new, which it might go with)
    const settled = b ? keep.filter((o) => now - (nextSince.get(o) ?? now) >= SETTLED_MS) : keep
    if (b && !WORLD.dirty && settled.length >= ADD_MIN && now - madeAt.current > ADD_MS && !anyLit()) {
      let fresh = 0
      for (const m of settled) if (!tried.current.has(m)) fresh++
      if (fresh >= ADD_MIN) {
        for (const m of settled) tried.current.add(m)
        build(settled, true)
        madeAt.current = now
        return
      }
    }
    // ---- grown too far from what it was made as: made again whole (item 598, the Tester window's three days: what came in and kept still
    // since was added as merges of its own and never folded back, and what was taken out stayed in the old merges drawn in to a point, so the
    // room's merge grew some 44 meshes a day (227 to 315 in three), the draws some 200 a day, the frames 60 to 54; the line above always said
    // "made again whole once what's added has come to half", but nothing did). Made again once what's added is a fifth of what it was made
    // with while the game stands still (the day's summary: the hitch of making it unseen), or half of it whatever; or a quarter taken out,
    // only while it stands still (taken out goes on all the time while the shop runs: a first try made it again five times in four minutes,
    // the room unmerged meanwhile, 1,800 draws)
    if (b && !WORLD.dirty) {
      const added = b.meshes.length - b.base
      if (added >= b.base * 0.5 || (paused() && (added >= b.base * 0.2 || WORLD.out >= b.watch.length * 0.25))) { WORLD.dirty = true; WORLD.changedAt = now }
    }
    // ---- to be made again (a quarter taken out, much new, the editor left): given back first, and made again once what's given back has kept
    // still through two looks (looked at while merged, it was hidden, and none of it counted as still)
    if (b && WORLD.dirty) { undo.current(); seen.current = new Map(); since.current = new Map(); return }
    // ---- made once something's kept still and nothing's lit by the pointer just now
    // (the first time not before the shop's all in, through two looks (item 767: made at two hundred kept still, or twenty seconds on, what
    // came in after it (the sink, the shrine, the till, the cats at the door, ...) waited 30 s and was merged on its own only as 24 or more
    // of it had, fewer never: the overview's draws 934 to 1,008 by which came in first); FIRST_BY_MS whatever)
    // (or at once as the veil lifts: the veil's own test has held 0.6 s by then)
    if (!b && keep.length > 1 && (loadedLooks.current >= 2 || (forced && loaded) || now - mountedAt.current > FIRST_BY_MS) && !anyLit()) {
      build(keep)
      madeAt.current = now
    }
  })
  return null
})
