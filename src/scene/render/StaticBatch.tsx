import { useLayoutEffect, useRef, type MutableRefObject, type ReactNode } from 'react'
import * as THREE from 'three'
import { isDummyMap, isFlatNormal } from './materialNormalize'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { mergeState } from './worldMerge'
import { treeLater, treeRaycast } from './rayTree'

/*
 * Things that never move, drawn as a handful of meshes instead of hundreds. Its children are built as usual (each a
 * mesh with its own little material, as is easiest to write), then, once they're there, every mesh among them is
 * baked into place and those that look alike (the same kind of material, colour, pictures, side, blending and finish: keyOf) are
 * merged into one, and the originals are hidden. A beckoning cat of forty parts, inked, is two draws, not eighty.
 *
 * Only for what's static: the children are read once, when it mounts (a change to them later isn't picked up), and
 * nothing in it can move on its own or be pointed at. What's in it can be put away and brought back, though, without
 * merging it all again: a group marked `userData.batchPart` is a part of it that `parts` shows or hides (a fridge's
 * shelf place emptied as a customer takes its drink, filled again by the stocker).
 */

/** the parts of a batch, shown or hidden (`userData.batchPart` on a group in it): given once it's merged */
export type BatchParts = { show: (part: string, shown: boolean) => void }

const ATTRS = ['position', 'normal', 'uv'] as const

/**
 * The rest of a material's look that two drawn as one must share (item 575): the depth's pull toward the eye (the shrine's lines lying on
 * its faces, item 374), the cut-out's edge, the glow, its other pictures, how a lit one's surface takes the light (the register's chrome,
 * steel and plastics: a white material each, their colours on their points, were drawn with one another's), an ink hull's width. Merged,
 * they're all drawn with the first one's material; a setting a material hasn't reads as nothing.
 */
const LOOK = ['depthTest', 'depthFunc', 'colorWrite', 'polygonOffset', 'polygonOffsetFactor', 'polygonOffsetUnits', 'alphaTest', 'alphaHash',
  'alphaToCoverage', 'premultipliedAlpha', 'dithering', 'fog', 'flatShading', 'wireframe', 'emissive', 'emissiveMap', 'normalMap', 'normalMapType',
  'normalScale', 'bumpMap', 'bumpScale', 'displacementMap', 'alphaMap', 'aoMap', 'lightMap', 'gradientMap', 'specularMap', 'envMap',
  'envMapIntensity', 'roughness', 'metalness', 'roughnessMap', 'metalnessMap', 'clearcoat', 'clearcoatRoughness', 'sheen', 'sheenRoughness',
  'sheenColor', 'specularIntensity', 'specularColor', 'ior', 'iridescence', 'anisotropy', 'specular', 'shininess'] as const
/** one setting written out: a number to four places, a colour its hex, a picture its id */
function setting(v: unknown): string {
  if (v === undefined || v === null) return ''
  if (typeof v === 'number') return String(Math.round(v * 1e4) / 1e4)
  if (typeof v !== 'object') return String(v)
  const o = v as { isColor?: boolean; isVector2?: boolean; isTexture?: boolean; getHexString?: () => string; x?: number; y?: number; uuid?: string; toArray?: () => number[] }
  if (o.isColor) return o.getHexString!()
  if (o.isVector2) return `${o.x},${o.y}`
  if (o.isTexture) return o.uuid!
  return o.toArray ? o.toArray().join(',') : o.uuid ?? String(v)
}
/** what decides whether two meshes can be drawn as one (a batch's, and the room's merge, scene/WorldBatch) */
export function keyOf(m: THREE.Material) {
  const x = m as THREE.Material & Record<string, unknown> & { color?: THREE.Color; map?: THREE.Texture | null; toneMapped?: boolean; vertexColors?: boolean
    emissive?: THREE.Color; emissiveIntensity?: number }
  let k = [m.type, x.color?.getHexString(), x.map?.uuid, m.side, m.transparent, m.opacity, m.blending, m.depthWrite, x.toneMapped, x.vertexColors].join('|')
  for (const p of LOOK) k += `|${setting(x[p])}`
  // (how bright it glows only where it glows)
  if (x.emissive && x.emissive.getHex() !== 0) k += `|${setting(x.emissiveIntensity)}`
  // (a reworked shader's own variant; a hand-written one's code and its uniforms' values (the ink lines': their width, their colour))
  k += `|${m.customProgramCacheKey()}`
  const sh = m as THREE.ShaderMaterial
  if (sh.isShaderMaterial) {
    k += `|${sh.vertexShader.length}:${sh.fragmentShader.length}`
    for (const [n, u] of Object.entries(sh.uniforms ?? {})) k += `|${n}=${setting(u.value)}`
  }
  return k
}

/** the materials plain pieces share, their colours on their points: one for each way of drawing that isn't the colour */
const PLAIN = new Map<string, THREE.MeshToonMaterial>()
/** a toon material that's only a colour: no picture, opaque, not glowing, not reworked in its shader */
// (the white picture and flat normals scene/materialNormalize gives a material without its own, and its tiny alphaTest, are none of its own:
// item 598, a normalised plain colour was taken for a picture, and 25 of them stood apart in the room's merge, a draw each in each stretch)
const plainOf = (m: THREE.Material) => {
  const t = m as THREE.MeshToonMaterial
  const own = (x: THREE.Texture | null | undefined) => !!x && !isDummyMap(x) && !isFlatNormal(x)
  if (!t.isMeshToonMaterial || own(t.map) || t.alphaMap || own(t.emissiveMap) || own(t.normalMap) || t.bumpMap || t.lightMap || t.aoMap || t.transparent || t.opacity < 1
    || t.alphaTest > 0.002 || t.vertexColors || t.wireframe || t.emissive.getHex() !== 0 || t.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile) return null
  return [t.gradientMap?.uuid, t.side, t.depthWrite, t.depthTest, t.toneMapped, t.fog, t.polygonOffset, t.polygonOffsetFactor, t.polygonOffsetUnits].join('|')
}
/** the material plain-coloured pieces drawn like `m` share (its colour then on their points), or null if `m` isn't a plain colour */
export function plainShared(m: THREE.Material): THREE.MeshToonMaterial | null {
  const key = plainOf(m)
  if (key === null) return null
  let shared = PLAIN.get(key)
  if (!shared) {
    shared = (m as THREE.MeshToonMaterial).clone()
    shared.color.set('#ffffff')
    shared.vertexColors = true
    shared.name = 'PlainColours'
    PLAIN.set(key, shared)
  }
  return shared
}
/**
 * The plain-coloured pieces under root given one material between them, each one's colour written on its points (its geometry copied first:
 * others may share it in another colour), so merged they're one draw where each colour was its own (half the scene's draws were plain
 * toon colours). Only for what's left alone once it's made: a colour changed on one of their materials later doesn't show any more.
 */
export function plainColours(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh || Array.isArray(m.material) || (m as THREE.SkinnedMesh).isSkinnedMesh || (m as THREE.InstancedMesh).isInstancedMesh) return
    const key = plainOf(m.material)
    if (key === null) return
    let shared = PLAIN.get(key)
    if (!shared) {
      shared = (m.material as THREE.MeshToonMaterial).clone()
      shared.color.set('#ffffff')
      shared.vertexColors = true
      shared.name = 'PlainColours'
      PLAIN.set(key, shared)
    }
    const g = m.geometry.clone()
    colourVertices(g, (m.material as THREE.MeshToonMaterial).color)
    m.geometry = g
    m.material = shared
  })
}

/** the geometry, its own copy, with just what every merged mesh has (and unindexed, so any can go with any) */
/** a geometry's every vertex given one colour (as a material has it: linear), for a material many plain-coloured pieces share (`vertexColors`):
 * merged, they're one draw */
export function colourVertices(g: THREE.BufferGeometry, c: THREE.Color) {
  const n = g.attributes.position.count, a = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3))
}

export function bakeable(g: THREE.BufferGeometry, m: THREE.Matrix4) {
  const src = g.index ? g.toNonIndexed() : g
  const out = new THREE.BufferGeometry()
  const n = src.attributes.position.count
  for (const a of ATTRS) {
    const at = src.attributes[a]
    out.setAttribute(a, at ? at.clone() : new THREE.BufferAttribute(new Float32Array(n * (a === 'uv' ? 2 : 3)), a === 'uv' ? 2 : 3))
  }
  // (and its colours, where they're carried by its vertices: a material shared by pieces of many colours)
  const has = src.attributes.color ? [...ATTRS, 'color'] : ATTRS
  if (src.attributes.color) out.setAttribute('color', src.attributes.color.clone())
  out.applyMatrix4(m)
  // (a mirroring transform turns the faces inside out: wind them back)
  if (m.determinant() < 0) {
    for (const a of has) {
      const arr = out.attributes[a].array as Float32Array
      const w = out.attributes[a].itemSize
      for (let i = 0; i < n; i += 3) for (let k = 0; k < w; k++) [arr[(i + 1) * w + k], arr[(i + 2) * w + k]] = [arr[(i + 2) * w + k], arr[(i + 1) * w + k]]
    }
  }
  if (src !== g) src.dispose()
  return out
}

/** `plain`: its plain-coloured pieces drawn as one (plainColours): for a batch whose colours are never changed once it's made */
export function StaticBatch({ children, parts, plain = false }: { children: ReactNode; parts?: MutableRefObject<BatchParts | null>; plain?: boolean }) {
  const holder = useRef<THREE.Group>(null)
  const merged = useRef<THREE.Group>(null)
  useLayoutEffect(() => {
    const h = holder.current, o = merged.current
    if (!h || !o) return
    if (plain) plainColours(h)
    h.updateWorldMatrix(true, true)
    const inv = new THREE.Matrix4().copy(h.matrixWorld).invert()
    // (and where each marked part's vertices went: [its piece among `pieces` (which merged mesh), from which vertex, how many])
    const groups = new Map<string, { mat: THREE.Material; geos: THREE.BufferGeometry[]; shadow: boolean; order: number; count: number; parts: [string, number, number][] }>()
    const partOf = (m: THREE.Object3D) => { for (let q: THREE.Object3D | null = m; q && q !== h; q = q.parent) if (typeof q.userData.batchPart === 'string') return q.userData.batchPart as string; return null }
    h.traverse((m) => {
      if (!(m instanceof THREE.Mesh) || m instanceof THREE.SkinnedMesh || m instanceof THREE.InstancedMesh || Array.isArray(m.material)) return
      if (!m.visible) return
      const key = `${keyOf(m.material)}|${m.renderOrder}`
      const g = groups.get(key) ?? { mat: m.material as THREE.Material, geos: [] as THREE.BufferGeometry[], shadow: false, order: m.renderOrder, count: 0, parts: [] }
      const geo = bakeable(m.geometry, new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld))
      const part = parts ? partOf(m) : null
      if (part) g.parts.push([part, g.count, geo.attributes.position.count])
      g.count += geo.attributes.position.count
      g.geos.push(geo)
      g.shadow ||= m.castShadow
      groups.set(key, g)
    })
    const made: THREE.Mesh[] = []
    const ranges = new Map<string, [THREE.Mesh, number, number][]>()
    for (const { mat, geos, shadow, order, parts: marked } of groups.values()) {
      const geo = mergeGeometries(geos)
      for (const x of geos) x.dispose()
      if (!geo) continue
      const mesh = new THREE.Mesh(geo, mat)
      mesh.castShadow = shadow
      mesh.receiveShadow = true
      mesh.raycast = () => {}
      mesh.renderOrder = order
      made.push(mesh)
      o.add(mesh)
      for (const [part, from, n] of marked) {
        const list = ranges.get(part) ?? []
        list.push([mesh, from, n])
        ranges.set(part, list)
      }
    }
    h.visible = false
    // (hidden only because the merged meshes draw them: still what the edit mode picks (scene/pickable), as the merged ones take no rays)
    h.userData.drawnElsewhere = true
    // (the originals, hidden, aren't drawn; nor need their places be worked out again every frame: thousands of them, in all the batches)
    const own = h.updateMatrixWorld
    h.updateMatrixWorld = () => {}
    // (and the pointer's rays through them by a box tree each, made when the page is idle (scene/render/rayTree, item 579: every pointer
    // event tried their triangles one by one, 2.6 to 3.0 ms over the whole room); the same hits as three's own; only those on three's own
    // raycast: one made to take none keeps its own)
    const treed: THREE.Mesh[] = []
    h.traverse((m) => {
      if (!(m instanceof THREE.Mesh) || m instanceof THREE.SkinnedMesh || m instanceof THREE.InstancedMesh || m.raycast !== THREE.Mesh.prototype.raycast) return
      m.raycast = treeRaycast
      treeLater(m.geometry)
      treed.push(m)
    })
    // (a part hidden: its vertices all drawn in to one point, so its triangles cover nothing (and cast nothing); shown, put back from
    // how they were made; only its own stretch of the buffer sent again, not the whole batch merged over)
    const kept = new Map<THREE.Mesh, Float32Array>()
    const hidden = new Set<string>()
    const api: BatchParts = {
      show: (part, shown) => {
        if (shown !== hidden.has(part)) return
        if (shown) hidden.delete(part)
        else hidden.add(part)
        for (const [mesh, from, n] of ranges.get(part) ?? []) {
          const pos = mesh.geometry.attributes.position as THREE.BufferAttribute
          const arr = pos.array as Float32Array
          let orig = kept.get(mesh)
          if (!orig) { orig = arr.slice(); kept.set(mesh, orig) }
          if (shown) arr.set(orig.subarray(from * 3, (from + n) * 3), from * 3)
          else for (let i = from * 3; i < (from + n) * 3; i += 3) { arr[i] = orig[from * 3]; arr[i + 1] = orig[from * 3 + 1]; arr[i + 2] = orig[from * 3 + 2] }
          pos.addUpdateRange(from * 3, n * 3)
          pos.needsUpdate = true
        }
      },
    }
    if (parts) parts.current = api
    return () => {
      if (parts?.current === api) parts.current = null
      for (const m of made) {
        m.removeFromParent()
        m.geometry.dispose()
      }
      h.visible = true
      h.userData.drawnElsewhere = false
      h.updateMatrixWorld = own
      for (const m of treed) if (m.raycast === treeRaycast) delete (m as { raycast?: unknown }).raycast
    }
  }, [parts, plain])
  return (
    <>
      <group ref={holder}>{children}</group>
      {/* (what it merged into: marked, so a piece looking for the way its contents face looks past it, into the originals) */}
      <group ref={merged} userData={{ batchMade: true }} />
    </>
  )
}

/**
 * A loaded model of many small parts (a lantern's every lattice bar its own mesh) folded in place into one mesh per material, so it's a few
 * draws instead of hundreds. Unlike StaticBatch the merged meshes are ordinary ones under the model's root: it can still be pointed at,
 * moved and lit up as a whole. For a model whose parts never move on their own; skinned, instanced and multi-material meshes are left be.
 */
/**
 * Pieces shown a few at a time, always the first so many in a set order (the sticks standing up out of a sack, the outer ones going first):
 * one mesh for each material among them and one ink line round them all, their draw ranges cut to the first `n`, not a mesh and a line each
 * (the sack of charcoal was 28 draws). The pieces (each with its ink hull under it, as inkModel puts it) are taken out of `root` and the
 * merged meshes put in its place; `show(n)` shows the first n (none: nothing's drawn at all). Pointed at, only what's shown is hit.
 * (Each material merged on its own (item 389): the onions' heap is of two (the onions baked onto it, and their roots, plain-coloured), and
 * everything was drawn in the first piece's; with only the roots carrying their colours by their vertices nothing merged at all: the sack's
 * onions were left out, and their ink drawn round nothing, black lumps in the sack.)
 */
export function countedBatch(root: THREE.Object3D, pieces: THREE.Mesh[]) {
  root.updateWorldMatrix(true, true)
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert()
  // (each material's pieces, and for each piece in the order, how many of that material's vertices are in it and the ones before it)
  const sets = new Map<THREE.Material, { geos: THREE.BufferGeometry[]; ends: number[]; count: number; shadow: boolean; lit: boolean; name: string }>()
  const ink: THREE.BufferGeometry[] = [], inkEnds: number[] = []
  let inkMat: THREE.Material | null = null
  for (const p of pieces) {
    const mat = p.material as THREE.Material
    const set = sets.get(mat) ?? { geos: [], ends: [], count: 0, shadow: false, lit: false, name: p.name }
    sets.set(mat, set)
    const b = bakeable(p.geometry, new THREE.Matrix4().multiplyMatrices(inv, p.matrixWorld))
    set.geos.push(b)
    set.count += b.attributes.position.count
    set.shadow ||= p.castShadow
    set.lit ||= p.receiveShadow
    for (const s of sets.values()) s.ends.push(s.count)
    const h = p.children.find((c) => (c as THREE.Mesh).isMesh && c.userData.inked) as THREE.Mesh | undefined
    if (!h) { inkEnds.push(inkEnds.at(-1) ?? 0); continue }
    inkMat = h.material as THREE.Material
    const src = h.geometry.index ? h.geometry.toNonIndexed() : h.geometry
    const hg = new THREE.BufferGeometry()
    hg.setAttribute('position', src.attributes.position.clone())
    hg.setAttribute('normal', src.attributes.normal.clone())
    if (src !== h.geometry) src.dispose()
    hg.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, h.matrixWorld))
    ink.push(hg)
    inkEnds.push((inkEnds.at(-1) ?? 0) + hg.attributes.position.count)
  }
  const merge = (geos: THREE.BufferGeometry[]) => { const g = geos.length ? mergeGeometries(geos) : null; for (const x of geos) x.dispose(); return g }
  const bodies: { mesh: THREE.Mesh; ends: number[] }[] = []
  for (const [mat, set] of sets) {
    // (a set started after some pieces of others: none of its own in those)
    const ends = [...new Array<number>(pieces.length - set.ends.length).fill(0), ...set.ends]
    const geo = merge(set.geos)
    if (!geo) continue
    const mesh = new THREE.Mesh(geo, mat)
    mesh.name = set.name
    mesh.castShadow = set.shadow
    mesh.receiveShadow = set.lit
    mesh.userData.inked = true
    root.add(mesh)
    bodies.push({ mesh, ends })
  }
  const inkGeo = merge(ink)
  const line = inkGeo && inkMat ? new THREE.Mesh(inkGeo, inkMat) : null
  if (line) {
    line.raycast = () => {}
    line.userData.inked = true
    root.add(line)
  }
  for (const p of pieces) p.removeFromParent()
  return {
    show(n: number) {
      const k = Math.max(0, Math.min(pieces.length, Math.floor(n)))
      for (const { mesh, ends } of bodies) {
        const upTo = k ? ends[k - 1] : 0
        mesh.geometry.setDrawRange(0, upTo)
        mesh.visible = upTo > 0
      }
      line?.geometry.setDrawRange(0, k ? inkEnds[k - 1] : 0)
      if (line) line.visible = k > 0
    },
  }
}

/**
 * Parts that move only now and then (a shrine's doors, swung open on a click), drawn as one while they're all home: a copy of them as they're
 * posed now, one mesh per material, put under `root`, hidden till `home(true)`, when it's shown and the parts themselves hidden (still pointed
 * at: the pointer's rays don't mind what's hidden); `home(false)` the other way, as soon as any is to move. Six doors of four draws each are
 * four. If any material's pieces don't merge, the copy's left out and the parts are drawn as they were.
 */
export function homeCopy(root: THREE.Object3D, movers: THREE.Object3D[]) {
  root.updateWorldMatrix(true, true)
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert()
  const groups = new Map<THREE.Material, { geos: THREE.BufferGeometry[]; shadow: boolean; take: boolean; order: number }>()
  for (const mv of movers) mv.traverse((m) => {
    // (shown as its own code has it: one the room's merge has taken reads hidden while it's drawn by the merge (worldMerge's mergeAway), and
    // a copy made again after it was taken left it out, its part then hidden by home(true) and drawn by neither (the Art window's report,
    // seen at the sake stand, item 560))
    const shown = mergeState(m)?.want ?? m.visible
    if (!(m instanceof THREE.Mesh) || m instanceof THREE.SkinnedMesh || m instanceof THREE.InstancedMesh || Array.isArray(m.material) || !shown) return
    const g = groups.get(m.material) ?? { geos: [], shadow: false, take: false, order: m.renderOrder }
    g.geos.push(bakeable(m.geometry, new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld)))
    g.shadow ||= m.castShadow
    // (and takes one as its parts do (item 533): it took one whatever they did, so a fridge's shut doors (none of it takes one: the owner's)
    // were shaded as they rest and not as they swung, and the room's merge, keyed by it, left the copy apart from the still parts it matches)
    g.take ||= m.receiveShadow
    groups.set(m.material, g)
  })
  const copy = new THREE.Group()
  copy.name = 'home-copy'
  copy.visible = false
  let whole = groups.size > 0
  for (const [mat, { geos, shadow, take, order }] of groups) {
    const geo = mergeGeometries(geos)
    for (const x of geos) x.dispose()
    if (!geo) { whole = false; continue }
    const mesh = new THREE.Mesh(geo, mat)
    mesh.castShadow = shadow
    mesh.receiveShadow = take
    mesh.renderOrder = order
    mesh.raycast = () => {}
    copy.add(mesh)
  }
  if (whole) root.add(copy)
  else for (const c of copy.children) (c as THREE.Mesh).geometry.dispose()
  let at = false
  return {
    home(h: boolean) {
      if (!whole || h === at) return
      at = h
      copy.visible = h
      for (const mv of movers) { mv.visible = !h; mv.userData.drawnElsewhere = h }
    },
  }
}

export function mergeByMaterial(root: THREE.Object3D, keep: (o: THREE.Object3D) => boolean = () => false) {
  root.updateWorldMatrix(true, true)
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert()
  const groups = new Map<THREE.Material, { geos: THREE.BufferGeometry[]; meshes: THREE.Mesh[] }>()
  // (`keep`: the parts that move on their own (a hand, an eye that blinks), left out of it with all that's under them)
  const kept = (o: THREE.Object3D) => { for (let q: THREE.Object3D | null = o; q && q !== root; q = q.parent) if (keep(q)) return true; return false }
  root.traverse((m) => {
    if (!(m instanceof THREE.Mesh) || m instanceof THREE.SkinnedMesh || m instanceof THREE.InstancedMesh || Array.isArray(m.material) || !m.visible) return
    if (kept(m)) return
    const g = groups.get(m.material) ?? { geos: [], meshes: [] }
    g.geos.push(bakeable(m.geometry, new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld)))
    g.meshes.push(m)
    groups.set(m.material, g)
  })
  const merged = new Set<THREE.Object3D>([...groups.values()].flatMap((g) => (g.meshes.length < 2 ? [] : g.meshes)))
  for (const [mat, { geos, meshes }] of groups) {
    if (meshes.length < 2) { for (const x of geos) x.dispose(); continue }
    const geo = mergeGeometries(geos)
    for (const x of geos) x.dispose()
    if (!geo) continue
    const mesh = new THREE.Mesh(geo, mat)
    mesh.name = meshes[0].name
    mesh.castShadow = meshes.some((x) => x.castShadow)
    mesh.receiveShadow = meshes.some((x) => x.receiveShadow)
    // (an ink hull stays one: not pointed at, not inked again)
    if (meshes.every((x) => x.raycast === meshes[0].raycast)) mesh.raycast = meshes[0].raycast
    if (meshes.some((x) => x.userData.inked)) mesh.userData.inked = true
    // (what hangs under a mesh merged away and isn't merged itself (a lone hand's ink line, the only one of its kind) is kept, where it was)
    for (const x of meshes) for (const c of [...x.children]) if (!merged.has(c)) x.parent?.attach(c)
    for (const x of meshes) x.removeFromParent()
    root.add(mesh)
  }
  return root
}
