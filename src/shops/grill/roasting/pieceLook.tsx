import { isDummyMap, isFlatNormal } from '@/scene/render/materialNormalize'
import { ironSkewer } from '@/shops/grill/kitchen/skewerShape'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { OUTLINE_WIDTH } from '@/scene/props/Dish'
import { bakeable } from '@/scene/render/StaticBatch'
import { atlasModel } from '@/scene/render/atlasMerge'
import { warmLater } from '@/scene/render/Prewarm'
import { baseName } from './tuning'
import { type Piece } from './piece'
import { CHAR_COLOR } from './tools'

type Uniform = { value: number }
/** per-piece look: how charred it is, and how much of each seasoning is on it (all 0 → 1) */
export type Looks = { uChar: Uniform; uSear?: Uniform; uSalt: Uniform; uSoy: Uniform; uMilk: Uniform; uPeanut: Uniform
  /** miso glaze; green dabs (wasabi, yuzu kosho); red flakes (shichimi); a glisten of lemon juice */
  uMiso: Uniform; uGreen: Uniform; uRed: Uniform; uLemon: Uniform
  /** (item 473) how done each of its two sides is, of its roasting time (1 done): A the side that faced the fire first, B the other; its
   * fat's shine; and which way its A side looks, in its own frame */
  uCookA: Uniform; uCookB: Uniform; uOil: Uniform; uSide: { value: THREE.Vector3 } }

/**
 * Burn patches for over-roasted food: a value-noise mask over the texture that grows as uChar goes 0 → 1, so the
 * food blackens in spots first and ends up fully charred. Seasonings show on top: salt and peanut powder as
 * specks, soy as a dark lacquer over everything, condensed milk in wavy drizzled ribbons.
 */
/** a fish's eyes neither brown, char nor take the seasoning: they stay a clear white with a dark pupil */
// (set, not raw (they'd pale as raw flesh does), and no further)
export const EYE_LOOKS: Looks = { uChar: { value: 0 }, uSear: { value: 0 }, uSalt: { value: 0 }, uSoy: { value: 0 }, uMilk: { value: 0 },
  uPeanut: { value: 0 }, uMiso: { value: 0 }, uGreen: { value: 0 }, uRed: { value: 0 }, uLemon: { value: 0 },
  uCookA: { value: 0.3 }, uCookB: { value: 0.3 }, uOil: { value: 0 }, uSide: { value: new THREE.Vector3(1, 0, 0) } }

export function addCharring(mat: THREE.MeshToonMaterial, looks: Looks, bites: Bites) {
  const hasMap = !!mat.map && !isDummyMap(mat.map)
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, looks, bites)
    shader.uniforms.uCharColor = { value: CHAR_COLOR }
    // (whether it has a picture of its own: the white one scene/materialNormalize gives the rest doesn't count)
    shader.uniforms.uHasMap = { value: hasMap ? 1 : 0 }
    // (its own frame's normal passed on: which of its two sides a point's on (item 473))
    shader.vertexShader = 'varying vec3 vCharN;\n' + BITE_VERTEX(shader.vertexShader).replace('#include <defaultnormal_vertex>',
      '#include <defaultnormal_vertex>\n  vCharN = objectNormal;')
    shader.fragmentShader = BITE_FRAGMENT(shader.fragmentShader
      .replace('#include <common>', /* glsl */ `#include <common>
        uniform float uChar;
        uniform float uSear;
        uniform float uSalt;
        uniform float uSoy;
        uniform float uMilk;
        uniform float uPeanut;
        uniform float uMiso;
        uniform float uGreen;
        uniform float uRed;
        uniform float uLemon;
        uniform float uHasMap;
        uniform vec3 uCharColor;
        uniform float uCookA;
        uniform float uCookB;
        uniform float uOil;
        uniform vec3 uSide;
        varying vec3 vCharN;
        float charHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float charNoise(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(charHash(i), charHash(i + vec2(1, 0)), f.x),
                     mix(charHash(i + vec2(0, 1)), charHash(i + vec2(1, 1)), f.x), f.y);
        }`)
      .replace('#include <map_fragment>', /* glsl */ `#include <map_fragment>
        float charN = uHasMap > 0.5 ? charNoise(vMapUv * 9.0) * 0.65 + charNoise(vMapUv * 23.0) * 0.35 : 0.5;
        // (item 473) how done this side is: its A the side toward the fire first, its B the other, each its own till it's turned and they
        // even out
        float cook = mix(uCookB, uCookA, smoothstep(-0.35, 0.35, dot(normalize(vCharN), uSide)));
        // raw: pale and a little cold, its colour thin; set as it warms through
        diffuseColor.rgb *= mix(vec3(1.26, 1.27, 1.3), vec3(1.0), smoothstep(0.0, 0.4, cook));
        // browning: golden first in patches where the skin blisters, the patches closing up and deepening as it's done
        float blotch = uHasMap > 0.5 ? charNoise(vMapUv * 6.0 + 2.7) * 0.6 + charNoise(vMapUv * 17.0 + 5.1) * 0.4 : 0.5;
        float brown = smoothstep(0.3, 1.0, cook) * mix(smoothstep(0.35, 0.7, blotch), 1.0, smoothstep(0.55, 1.0, cook));
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.95, 0.7, 0.42) + vec3(0.05, 0.025, 0.0), brown * 0.62);
        // its skin's little blisters, darker, from three quarters done
        if (uHasMap > 0.5) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.26, 0.14, 0.07),
          smoothstep(0.74, 0.82, charNoise(vMapUv * 34.0 + 9.0)) * smoothstep(0.7, 1.15, cook) * 0.5);
        // the grill's bars seared across it as it cooks (none on it raw): dark brown, blistered and broken up, deepening as it roasts
        if (uHasMap > 0.5) {
          float searBar = smoothstep(0.84, 0.95, 0.5 + 0.5 * sin((vMapUv.y * 11.0 + vMapUv.x * 1.5) * 6.2831853))
            * smoothstep(0.55, 0.8, charNoise(vMapUv * 8.0) + 0.3);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.2, 0.12, 0.06), clamp(searBar * 0.75, 0.0, 1.0) * uSear);
        }
        // (charring by side too: left past done, the side toward the fire blackens first)
        float charAmt = max(uChar, smoothstep(1.15, 3.0, cook));
        float charMask = smoothstep(1.0 - charAmt * 1.15, 1.0 - charAmt * 1.15 + 0.2, charN);
        diffuseColor.rgb = mix(diffuseColor.rgb, uCharColor, charMask);
        // soy brushed on: a dark, rich lacquer over the whole surface
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.5, 0.3, 0.15) + vec3(0.05, 0.02, 0.0), uSoy * 0.85);
        // miso spread on: a thick golden-brown paste, caught darker where it's bubbled
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.66, 0.42, 0.18) * (uHasMap > 0.5 ? 0.8 + 0.3 * charNoise(vMapUv * 14.0) : 0.95), uMiso * 0.8);
        // lemon squeezed over: a pale, bright sheen
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.08 + vec3(0.05, 0.05, 0.0), uLemon * 0.6);
        if (uHasMap > 0.5) {
          // coarse salt stuck to the surface: scattered white grains, more of them with every pinch
          float saltN = charHash(floor(vMapUv * vec2(150.0, 90.0)));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 1.0, 0.98), step(1.0 - uSalt * 0.3, saltN));
          // peanut powder: fine tan dust settled in specks
          float nutN = charHash(floor(vMapUv * vec2(110.0, 70.0)) + 17.0);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.67, 0.4), step(1.0 - uPeanut * 0.55, nutN));
          // wasabi or yuzu kosho: a few soft green dabs
          float dabN = charNoise(vMapUv * 7.0 + 11.0);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.76, 0.3), smoothstep(1.0 - uGreen * 0.28, 1.02 - uGreen * 0.28, dabN));
          // shichimi: red and dark flakes
          float redN = charHash(floor(vMapUv * vec2(120.0, 80.0)) + 41.0);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.78, 0.22, 0.1), step(1.0 - uRed * 0.35, redN));
          // condensed milk drizzled across in thin wavy ribbons, more of them the more is poured
          float ribbon = abs(fract(vMapUv.x * (4.0 + 4.0 * step(0.5, uMilk)) + sin(vMapUv.y * 9.0) * 0.25) - 0.5);
          float milk = (1.0 - smoothstep(0.04, 0.08, ribbon)) * step(0.3, charNoise(vMapUv * 5.0 + 3.0));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.99, 0.95, 0.84), milk * min(1.0, uMilk * 2.0));
        }`)
      .replace('#include <opaque_fragment>', /* glsl */ `{
          // (item 473) its fat's shine as it cooks: a soft light on it from over the cook's shoulder, gone as it dries and chars
          float gl = pow(max(dot(normalize(vNormal), normalize(vec3(0.3, 0.75, 0.6))), 0.0), 26.0);
          outgoingLight += vec3(1.0, 0.94, 0.82) * gl * uOil * 0.5;
        }
        #include <opaque_fragment>`))
  }
  mat.customProgramCacheKey = () => 'charring'
  // (scene/materialNormalize gives it the features it lacks in their do-nothing form, a white map among them, so a fish with a picture and
  // one without share a program: the specks and the seared bars are by uHasMap, not by whether there's a map)
  mat.userData.normalize = 'charring'
}

/**
 * Bites taken out of food: up to MAX_BITES balls (centre + radius, in the piece's own space) where nothing is
 * drawn, their edges wobbled like tooth marks. Shared by a piece's materials and its ink outlines.
 */
export const MAX_BITES = 6
export type Bites = { uBites: { value: THREE.Vector4[] }; uBiteCount: { value: number } }
export const newBites = (): Bites => ({
  uBites: { value: Array.from({ length: MAX_BITES }, () => new THREE.Vector4()) },
  uBiteCount: { value: 0 },
})
const BITE_VERTEX = (src: string) => 'varying vec3 vBitePos;\n' + src.replace('#include <begin_vertex>',
  '#include <begin_vertex>\n  vBitePos = transformed;')
const BITE_FRAGMENT = (src: string) => /* glsl */ `varying vec3 vBitePos;
  uniform vec4 uBites[${MAX_BITES}];
  uniform int uBiteCount;
` + src.replace(/void main\(\)\s*\{/, /* glsl */ `void main() {
  for (int i = 0; i < ${MAX_BITES}; i++) {
    if (i >= uBiteCount) break;
    vec3 d = vBitePos - uBites[i].xyz;
    float teeth = 0.86 + 0.14 * sin(atan(d.y, d.x) * 9.0 + float(i) * 2.3) * sin(atan(d.z, d.x) * 7.0);
    if (length(d) < uBites[i].w * teeth) discard;
  }`)

/** Let an ink outline (a ShaderMaterial from Dish) show the same bites as its food. */
export function biteOutline(outline: THREE.Mesh, bites: Bites) {
  const mat = outline.material as THREE.ShaderMaterial
  if (!mat.vertexShader.includes('vBitePos')) {
    mat.vertexShader = BITE_VERTEX(mat.vertexShader)
    mat.fragmentShader = BITE_FRAGMENT(mat.fragmentShader)
    mat.needsUpdate = true
  }
  mat.uniforms.uBites = bites.uBites
  mat.uniforms.uBiteCount = bites.uBiteCount
}

/**
 * The charring programs made with the page (scene/Prewarm), not when the first piece of a kind is ordered: every food mesh once on its own
 * charring copy of its material (its browning, seasonings and bites) and its ink on its bitten copy, compiled while the page loads, kept,
 * never drawn. The first of each kind, ordered, stopped the picture a quarter to half a second while its program was linked. False till
 * Dish has made the food over into its toon materials (bindMaterials waits for the same).
 */
export function warmCharring(root: THREE.Object3D, isFood: (id: string) => boolean) {
  const meshes: THREE.Mesh[] = []
  for (const obj of root.children) {
    if (!isFood((obj.userData.itemId as string | undefined) ?? baseName(obj.name))) continue
    obj.traverse((o) => { if (o instanceof THREE.Mesh && !o.name.endsWith('_outline')) meshes.push(o) })
  }
  if (!meshes.length || !meshes.every((m) => m.material instanceof THREE.MeshToonMaterial)) return false
  const group = new THREE.Group()
  for (const m of meshes) {
    const src = m.material as THREE.MeshToonMaterial
    if (src.name.startsWith('Foil') || src.name.startsWith('Wrapper')) continue
    // (both of its sides: a piece cooks front side only, and shows its inside, both, once it's bitten)
    for (const side of [THREE.FrontSide, THREE.DoubleSide]) {
      const mat = src.clone()
      mat.side = side
      addCharring(mat, EYE_LOOKS, newBites())
      const w = m.clone(false) as THREE.Mesh
      w.material = mat
      group.add(w)
    }
    for (const c of m.children) {
      if (!(c instanceof THREE.Mesh) || !c.name.endsWith('_outline')) continue
      const o = c.clone(false) as THREE.Mesh
      o.material = (c.material as THREE.ShaderMaterial).clone()
      biteOutline(o, newBites())
      group.add(o)
    }
  }
  warmLater(group)
  return true
}

const inkScale = new THREE.Vector3()
/**
 * The seasoning ledge (its board, the pots on it, their spoons and brushes, the fan's holder) drawn as one while all of it sits at home: a
 * copy of it as it stands, under the dish, its pots' little pictures packed into one atlas (scene/atlasMerge) and their lines merged into one,
 * so some fifty draws are a handful. `home(true)` shows the copy and hides the pieces (still pointed at: the pointer's rays don't mind what's
 * hidden); `home(false)` the other way, as soon as anything on it is picked up or pointed at.
 */
export function ledgeCopy(dish: THREE.Object3D, members: THREE.Object3D[]) {
  dish.updateWorldMatrix(true, true)
  const inv = new THREE.Matrix4().copy(dish.matrixWorld).invert()
  const shown = (o: THREE.Object3D) => { for (let q: THREE.Object3D | null = o; q && q !== dish; q = q.parent) if (!q.visible) return false; return true }
  const tmp = new THREE.Group()
  const inks: THREE.BufferGeometry[] = []
  let ink: THREE.ShaderMaterial | null = null
  const side = new Map<THREE.Mesh, THREE.Side>()
  let ok = true
  for (const mv of members) mv.traverse((m) => {
    if (!(m instanceof THREE.Mesh) || !shown(m)) return
    if (Array.isArray(m.material) || m instanceof THREE.SkinnedMesh || m instanceof THREE.InstancedMesh || m.morphTargetInfluences?.length) { ok = false; return }
    const rel = new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld)
    if (m.material instanceof THREE.ShaderMaterial) {
      // (an ink line: its hull's shape only, all of them under one copy of the line's material)
      if (!m.material.uniforms?.uWidth) { ok = false; return }
      ink ??= m.material
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', m.geometry.attributes.position)
      g.setAttribute('normal', m.geometry.attributes.normal)
      if (m.geometry.index) g.setIndex(m.geometry.index)
      inks.push(bakeable(g, rel))
      return
    }
    const c = new THREE.Mesh(m.geometry, m.material)
    c.matrixAutoUpdate = false
    c.matrix.copy(rel)
    c.castShadow = m.castShadow
    side.set(c, (m.material as THREE.Material).side)
    tmp.add(c)
  })
  // (the pictures that fit an atlas: small, laid once over the part (not tiled), on a plain toon material)
  const fits = (c: THREE.Mesh) => {
    const mt = c.material as THREE.MeshToonMaterial
    // (the white and flat maps scene/materialNormalize gives every material are none of its own)
    if (!(mt instanceof THREE.MeshToonMaterial) || mt.transparent || mt.alphaMap || (mt.emissiveMap && !isDummyMap(mt.emissiveMap))
      || (mt.normalMap && !isFlatNormal(mt.normalMap))) return false
    const img = (isDummyMap(mt.map) ? undefined : mt.map?.image) as { width?: number } | undefined
    if (img && (img.width ?? 0) > 512) return false
    const uv = c.geometry.attributes.uv as THREE.BufferAttribute | undefined
    if (uv) for (let i = 0; i < uv.count; i++) { const u = uv.getX(i), v = uv.getY(i); if (u < -0.03 || u > 1.03 || v < -0.03 || v > 1.03) return false }
    return true
  }
  const gradient = (tmp.children.find((c) => fits(c as THREE.Mesh)) as THREE.Mesh | undefined)?.material as THREE.MeshToonMaterial | undefined
  const front = ok ? atlasModel(tmp, fits, (map) => new THREE.MeshToonMaterial({ map, gradientMap: gradient?.gradientMap ?? null, vertexColors: true })) : null
  // (what's drawn from both sides (a pot's inside), on a copy of it that is)
  let both: THREE.Material | null = null
  for (const c of tmp.children as THREE.Mesh[]) if (front && c.material === front && side.get(c) !== THREE.FrontSide) {
    if (!both) { both = front.clone(); both.side = THREE.DoubleSide }
    c.material = both
  }
  const copy = new THREE.Group()
  copy.name = 'ledge-copy'
  copy.visible = false
  const groups = new Map<THREE.Material, { geos: THREE.BufferGeometry[]; shadow: boolean }>()
  for (const c of tmp.children as THREE.Mesh[]) {
    const mat = c.material as THREE.Material
    const g = groups.get(mat) ?? { geos: [], shadow: false }
    g.geos.push(bakeable(c.geometry, c.matrix))
    g.shadow ||= c.castShadow
    groups.set(mat, g)
    // (the atlas's own copies of the geometries, done with)
    if (mat === front || mat === both) c.geometry.dispose()
  }
  for (const [mat, { geos, shadow }] of groups) {
    const geo = mergeGeometries(geos)
    for (const g of geos) g.dispose()
    if (!geo) { ok = false; continue }
    const mesh = new THREE.Mesh(geo, mat)
    mesh.castShadow = shadow
    mesh.receiveShadow = true
    mesh.raycast = () => {}
    copy.add(mesh)
  }
  let line: THREE.ShaderMaterial | null = null
  if (inks.length && ink) {
    const geo = mergeGeometries(inks)
    for (const g of inks) g.dispose()
    if (geo) {
      const mat = (ink as THREE.ShaderMaterial).clone()
      line = mat
      const mesh = new THREE.Mesh(geo, mat)
      mesh.raycast = () => {}
      // (its width the same on screen as the dish's own lines)
      const at = new THREE.Vector3()
      mesh.onBeforeRender = () => { dish.getWorldScale(at); mat.uniforms.uWidth.value = OUTLINE_WIDTH / ((at.x + at.y + at.z) / 3) }
      copy.add(mesh)
    } else ok = false
  }
  const dispose = () => {
    copy.removeFromParent()
    copy.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose() })
    ;(front as THREE.MeshToonMaterial | null)?.map?.dispose()
    front?.dispose()
    both?.dispose()
    line?.dispose()
  }
  if (!ok) { dispose(); return null }
  dish.add(copy)
  let at = false
  return {
    home(h: boolean) {
      if (h === at) return
      at = h
      copy.visible = h
      for (const mv of members) { mv.visible = !h; mv.userData.drawnElsewhere = h }
    },
    dispose() { if (at) for (const mv of members) { mv.visible = true; mv.userData.drawnElsewhere = false } dispose() },
  }
}

/**
 * A piece's food drawn with one ink line round all its parts, not one for each (a fish's body, fins and eyes, a rice ball's rice and its
 * seaweed: the grill's food was some eighty draws of ink alone). The parts lying in one frame (a model's several materials, one node) have
 * their hulls merged into one mesh beside them, on a copy of their bitten ink (its bites the piece's own); their own hulls are kept but
 * hidden (a portion's copy is made from the first's node, and builds its own from them). Not the stick (its bites stay empty), nor foil,
 * nor what swells (its hull follows its shape keys).
 */
export function inkOneLine(p: Piece) {
  const groups = new Map<THREE.Object3D, THREE.Mesh[]>()
  const hullOf = (m: THREE.Mesh) => m.children.find((c) => c instanceof THREE.Mesh && c.name.endsWith('_outline')) as THREE.Mesh | undefined
  for (const { mesh: m, foil } of p.mats) {
    if (foil || p.sticks.includes(m) || m.morphTargetInfluences?.length || !m.parent || !hullOf(m)) continue
    const list = groups.get(m.parent) ?? []
    list.push(m)
    groups.set(m.parent, list)
  }
  for (const [parent, ms] of groups) {
    // (one copied from another portion's node: its line rebuilt from these parts, on this piece's bites)
    for (const c of [...parent.children]) if (c.userData.oneInk) c.removeFromParent()
    if (ms.length < 2 || !ms.every((m) => m.matrix.equals(ms[0].matrix))) continue
    const hulls = ms.map(hullOf) as THREE.Mesh[]
    const geos = hulls.map((h) => {
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', h.geometry.attributes.position)
      g.setAttribute('normal', h.geometry.attributes.normal)
      if (h.geometry.index) g.setIndex(h.geometry.index)
      return g
    })
    if (!geos.every((g) => !!g.index === !!geos[0].index)) continue
    const geo = mergeGeometries(geos)
    if (!geo) continue
    const mat = (hulls[0].material as THREE.ShaderMaterial).clone()
    mat.uniforms.uBites = p.bites.uBites
    mat.uniforms.uBiteCount = p.bites.uBiteCount
    const ink = new THREE.Mesh(geo, mat)
    ink.matrix.copy(ms[0].matrix)
    ink.matrixAutoUpdate = false
    ink.userData.oneInk = true
    ink.raycast = () => {}
    let most = 0
    // (its width kept the same on screen however big the piece has been (as Dish's lines do))
    ink.onBeforeRender = () => {
      parent.getWorldScale(inkScale)
      const avg = (inkScale.x + inkScale.y + inkScale.z) / 3
      if (avg > most) { most = avg; mat.uniforms.uWidth.value = OUTLINE_WIDTH / avg }
    }
    parent.add(ink)
    for (const h of hulls) h.visible = false
    p.ink = ink
    p.inkOf = ms
  }
}

/**
 * Every skewer the same iron one (the owner's: the model's rods came each its own length and thickness, made at random, so on the board one was
 * half again as long as the next; and a plain rod didn't read as a skewer): a flat steel bar (skewerShape), its sharp point down where the
 * model's rod stood in the salt (pushed into the ash, as at a robata), up its line past the food to a loop for a handle; its flat (and the loop)
 * turned out from the fire, so it lies flat, loop and all, on the board. One per model rod and piece, shared by every copy; also where the
 * rod's middle is (its own frame), for laying it centred on the board.
 */
/** the longest a rod is drawn (in the world); each dish's own is as long as its food reaches up it and a little over for the loop (rodReach).
 * (item 620: 1.4 was too short for a whole fish run through its length, a mackerel's or an aji's: the rod's loop came out of its middle) */
const STICK_LEN = 2.0
/** the shortest, and how far past the food's top a rod goes (its loop clear of the food) */
const STICK_MIN = 0.7, STICK_OVER = 0.16
const STICK_W = 0.0095
const STICK_T = 0.0045
const STICK_POINT = 0.14
const STICK_RING = 0.034
/** the size of piece the rod is STICK_LEN long in (its world length the same in every one) */
const STICK_BASE = 0.95
const RODS = new WeakMap<THREE.BufferGeometry, Map<string, { geo: THREE.BufferGeometry; mid: THREE.Vector3; out: THREE.Vector3 }>>()
/** ms: an iron skewer drawn out of its food as it's plated; and how far, in its lengths (all of it and a little, clear of the food) */
export const PULL_MS = 450, PULL_OUT = 1.1
/** `scale`: its piece's own (each piece is authored at its own size in the dish's model, some not even alike every way: the rod drawn that
 * much the other way, so it doesn't grow and shrink with the food); `turn`: the rod's own frame in its piece's, where the scale is; `out`: the
 * way out from the fire, in the rod's own frame */
/**
 * How long a dish's rod is drawn, in the world (the owner's, 2026-11-12/13: the rods were all 1.4, three times a squid, "the iron skewers'
 * size compared again and again"): from where its point goes into the ash up to the top of its food, and STICK_OVER over for its loop,
 * between STICK_MIN and STICK_LEN. Measured on the model's own rod and food as the piece is first found, standing at home
 */
export function rodReach(rod: THREE.Mesh, piece: THREE.Object3D, upIn: THREE.Vector3, size: THREE.Vector3) {
  // (in the piece's own frame: a piece is first found drawn at no size, a hidden template, so the world can't measure it; then brought to
  // the world by the size it's shown at (Dish's home) and its parent's)
  const toPiece = (m: THREE.Object3D) => {
    const rel = new THREE.Matrix4()
    for (let a: THREE.Object3D | null = m; a && a !== piece; a = a.parent) { a.updateMatrix(); rel.premultiply(a.matrix) }
    return rel
  }
  // (its two ends as the iron's drawn on it (rodEnds: its foot in the hearth, its point up), brought into the piece's frame. Item 620, the
  // owner's 「鐵籤串不好這個好像修很多次了」: its lowest and highest points in the piece's frame were taken for its ends, and where a dish's rod
  // lies along its piece's X (19 of the 32: the model's skewers run along their pieces' X), those were two points across its thickness:
  // the food's reach came out a tenth to two thirds of itself, the rod drawn as short as rods go, and the food stood above its loop)
  const v = new THREE.Vector3(), r = toPiece(rod)
  const ends = rodEnds(rod.geometry, upIn)
  const lo = ends.foot.clone().applyMatrix4(r)
  const dir = ends.tip.clone().applyMatrix4(r).sub(lo).normalize()
  let reach = 0
  piece.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh || m === rod || m.name.endsWith('_outline') || (m.material as THREE.Material)?.name?.startsWith('BambooSkewer')) return
    const p = m.geometry.attributes.position as THREE.BufferAttribute, rm = toPiece(m)
    for (let i = 0; i < p.count; i += 3) reach = Math.max(reach, v.fromBufferAttribute(p, i).applyMatrix4(rm).sub(lo!).dot(dir))
  })
  // (every copy of a dish the same rod (the owner's: no rods one long, one short): as long as the largest a copy of it is drawn (Dish
  // draws them up to 1.22 times their size, 1.12 again in height) needs. Its reach brought to the world by the size the piece is shown at
  // along the rod (`size`, its home's) and its parent's: item 620, the piece's own size was left out, and a dish drawn at 0.76 had its loop
  // twice as far over it as it should, one drawn bigger hardly clear of it)
  const along = dir.clone().multiply(size).length()
  return THREE.MathUtils.clamp(reach * along * ROD_COPY_MAX * (piece.parent ? piece.parent.getWorldScale(v).x : 1) + STICK_OVER, STICK_MIN, STICK_LEN)
}
/** the largest a copy of a dish is drawn against its model; and each dish's rod length once worked out (by the dish's id) */
const ROD_COPY_MAX = 1.35
export const ROD_LEN = new Map<string, number>()
/**
 * A model rod's two ends, in its own frame: `foot`, where it stands in the hearth (the middle of its lower end), and `tip`, its far point.
 * Its ends are the farthest two of its points; the model's point is the end whose last few millimetres all close in on one spot, its foot a
 * ring. The iron's point goes in where the rod stands in the hearth: its lower end, standing on the fire (`upIn`, the way up in the rod's own
 * frame). The model's own point told it before, and a rod whose two ends were alike was a coin toss: some stood ring first in the sand, the
 * point up in the air (the owner saw). One lying (a rod across the net) by its point still. Shared by the iron drawn on it (standardStick)
 * and its length (rodReach, item 620).
 */
function rodEnds(src: THREE.BufferGeometry, upIn: THREE.Vector3) {
  const P = src.attributes.position as THREE.BufferAttribute
  const pts: THREE.Vector3[] = []
  for (let i = 0; i < P.count; i++) pts.push(new THREE.Vector3().fromBufferAttribute(P, i))
  let a = pts[0], b = pts[0], far = -1
  for (const p of pts) for (const q of pts) { const d = p.distanceToSquared(q); if (d > far) { far = d; a = p; b = q } }
  const axis = b.clone().sub(a).normalize()
  const end = (e: THREE.Vector3, sign: number) => {
    const near = pts.filter((p) => sign * p.clone().sub(e).dot(axis) > -0.01)
    const c = near.reduce((m, p) => m.add(p), new THREE.Vector3()).multiplyScalar(1 / near.length)
    return { c, spread: Math.max(...near.map((p) => p.distanceTo(c))) }
  }
  const ea = end(a, -1), eb = end(b, 1)
  const rise = eb.c.clone().sub(ea.c).dot(upIn), len = ea.c.distanceTo(eb.c)
  const aLow = Math.abs(rise) > 0.3 * len ? rise > 0 : ea.spread > eb.spread
  return { foot: (aLow ? ea.c : eb.c).clone(), tip: (aLow ? b : a).clone() }
}
export function standardStick(src: THREE.BufferGeometry, scale: THREE.Vector3, turn: THREE.Quaternion, out: THREE.Vector3, upIn: THREE.Vector3, rodLen = STICK_LEN) {
  const key = [...scale.toArray(), ...turn.toArray(), ...out.toArray(), ...upIn.toArray(), rodLen].map((x) => x.toFixed(3)).join()
  const mine = RODS.get(src) ?? new Map<string, { geo: THREE.BufferGeometry; mid: THREE.Vector3; out: THREE.Vector3 }>()
  RODS.set(src, mine)
  const had = mine.get(key)
  if (had) return had
  const { foot, tip } = rodEnds(src, upIn)
  const up = tip.clone().sub(foot).normalize()
  // (its flat's face out from the fire: across it, the bar's width and the loop's plane)
  const face = out.clone().addScaledVector(up, -out.dot(up))
  if (face.lengthSq() < 1e-6) face.crossVectors(up, Math.abs(up.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0))
  face.normalize()
  const across = new THREE.Vector3().crossVectors(up, face).normalize()
  // (how long a unit of each of these is in the world, the piece's scale taken off)
  const along = (d: THREE.Vector3) => STICK_BASE / Math.max(0.05, d.clone().applyQuaternion(turn).multiply(scale).length())
  const geo = ironSkewer(rodLen, STICK_W, STICK_T, STICK_POINT, STICK_RING)
  geo.applyMatrix4(new THREE.Matrix4().makeBasis(across.clone().multiplyScalar(along(across)), up.clone().multiplyScalar(along(up)),
    face.clone().multiplyScalar(along(face))).setPosition(foot))
  geo.computeVertexNormals()
  for (const name of Object.keys(src.attributes)) {
    if (geo.attributes[name]) continue
    const s0 = src.attributes[name] as THREE.BufferAttribute
    geo.setAttribute(name, new THREE.Float32BufferAttribute(new Array(geo.attributes.position.count * s0.itemSize).fill(1), s0.itemSize))
  }
  // (`out`: its whole length along it toward its loop, the way it's drawn out of the food when it's pulled)
  const res = { geo, mid: foot.clone().addScaledVector(up, (rodLen / 2) * along(up)), out: up.clone().multiplyScalar(rodLen * along(up)) }
  mine.set(key, res)
  return res
}

/** A small repeatable random generator, so a piece always gets the same crumple. */
export function seeded(key: string) {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

/** Crush a foil mesh a little differently: its own copy of the geometry, pushed in and out in random folds. */
export function crumpleFoil(mesh: THREE.Mesh, rand: () => number) {
  const g = mesh.geometry.clone()
  const pos = g.attributes.position as THREE.BufferAttribute
  const f = Array.from({ length: 3 }, () => [3 + rand() * 6, rand() * 6.3])
  const amp = 0.03 + rand() * 0.06
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const fold = Math.sin(f[0][0] * v.x + f[0][1]) * Math.sin(f[1][0] * v.y + f[1][1]) * Math.sin(f[2][0] * v.z + f[2][1])
    v.multiplyScalar(1 + amp * fold)
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  g.computeVertexNormals()
  mesh.geometry = g
  for (const c of mesh.children) if (c instanceof THREE.Mesh && c.name.endsWith('_outline')) c.geometry = g
}
