import * as THREE from 'three'

/**
 * The sun (by night the moon), the room's one directional light, shines only out of doors (item 721, the owner's 「光源變的很怪，方向性的光源
 * 做再室外即可，室內不用」): inside the shop's walls (and the dorm upstairs) its share is given as a soft light from all round instead, a little
 * more from above, the room as bright as it was but no side of a thing lit and its other dark, no shadow of the sun's across the floor; out
 * of doors (the street at the door, the eaves, the ground round the building) it's as it was, its shadows with it.
 *
 * Done in three's own lighting chunk (lights_fragment_begin's directional lights, before any program's made: imported first, from main), so
 * every lit material has it with no program of its own: a point's place in the world, from the view's own matrix, against up to BOXES indoor
 * boxes, each a mat4 uniform: world to the box's frame in world units in its first three rows, its half sizes and how soft its edge in its
 * last row (a box whose last is 0 is none: as every material's is that hasn't the uniforms, a shader of its own, or the boxes not set yet).
 * The boxes are set from the scene (app/sceneParts' IndoorSun); `indoorSunPaused` while another canvas draws (the editor's character viewer,
 * its figures stood at the world's middle, in the shop's box, lit by its own lights).
 */
const BOXES = 4
/** each box's matrix, shared by every material's uniforms (a typed array: three's clone of a material's uniforms keeps it, not a copy) */
const MATS: Float32Array[] = []
/** the boxes' edges' softness as set (the last of each matrix), kept while they're paused */
const SOFT = new Float32Array(BOXES)
/** the sun's share inside given back from all round: so much of it whatever way a face looks, and so much more as it looks up */
const FILL_BASE = 0.8, FILL_UP = 0.14

const MARK = 'jgsInside'
const PARS = /* glsl */ `
${Array.from({ length: BOXES }, (_, i) => `uniform mat4 jgsIndoor${i};`).join('\n')}
// (item 721: how far within an indoor box a point in the world lies: 1 well inside, 0 at its walls and out of doors, over its soft edge)
float jgsInBox( mat4 m, vec3 wp ) {
	vec4 h = vec4( m[ 0 ][ 3 ], m[ 1 ][ 3 ], m[ 2 ][ 3 ], m[ 3 ][ 3 ] );
	if ( h.w <= 0.0 ) return 0.0;
	vec3 q = abs( ( m * vec4( wp, 1.0 ) ).xyz ) - h.xyz;
	return clamp( - max( max( q.x, q.y ), q.z ) / h.w, 0.0, 1.0 );
}
float ${MARK}( vec3 viewPos ) {
	vec3 wp = ( ( vec4( viewPos, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
	return max( ${Array.from({ length: BOXES }, (_, i) => `jgsInBox( jgsIndoor${i}, wp )`).reduce((a, b) => `max( ${a}, ${b} )`)}, 0.0 );
}
`
const DIR_START = '#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )'
const DIR_INFO = '\t\tgetDirectionalLightInfo( directionalLight, directLight );\n'
const GRID = '\t#ifdef USE_LIGHT_PROBES_GRID'

/** three's chunks with the indoor boxes in: once (a module made again by the dev server finds them in already) */
function patch() {
  const C = THREE.ShaderChunk as Record<string, string>
  if (C.lights_pars_begin.includes(MARK)) return
  const begin = C.lights_fragment_begin
  // (three's own text as this was written against (r186): any other and it's said, not patched wrong)
  const at = [DIR_START, DIR_INFO, GRID].map((s) => begin.split(s).length - 1)
  if (at.some((n) => n !== 1)) {
    console.error('indoorSun: three\'s lights_fragment_begin is not as expected; the sun shines indoors too', at)
    return
  }
  C.lights_pars_begin += PARS
  C.lights_fragment_begin = begin
    // (the sun's share inside, gathered as it's taken off its direct light: before its shadow, which then falls only out of doors)
    .replace(DIR_START, `vec3 jgsSunFill = vec3( 0.0 );\n\n${DIR_START}\n\n\tfloat jgsIn = ${MARK}( geometryPosition );`)
    .replace(DIR_INFO, `${DIR_INFO}\n\t\tjgsSunFill += directLight.color * jgsIn;\n\t\tdirectLight.color *= 1.0 - jgsIn;\n`)
    // (and given back with the room's soft light, from all round, a little more from above)
    .replace(GRID, `\tirradiance += jgsSunFill * ( ${FILL_BASE.toFixed(3)} + ${FILL_UP.toFixed(3)} * ( vec4( geometryNormal, 0.0 ) * viewMatrix ).y );\n\n${GRID}`)
  // (each lit material's own uniforms, cloned from these as its program's made, the matrices shared)
  const lib = THREE.ShaderLib as Record<string, { uniforms: Record<string, THREE.IUniform> }>
  for (let i = 0; i < BOXES; i++) {
    const was = lib.standard.uniforms[`jgsIndoor${i}`]?.value as Float32Array | undefined
    MATS[i] = was ?? new Float32Array(16)
    for (const k of ['standard', 'physical', 'toon', 'lambert', 'phong']) lib[k].uniforms[`jgsIndoor${i}`] = { value: MATS[i] }
  }
}
patch()
if (!MATS.length) {
  const lib = THREE.ShaderLib as Record<string, { uniforms: Record<string, THREE.IUniform> }>
  for (let i = 0; i < BOXES; i++) MATS[i] = (lib.standard.uniforms[`jgsIndoor${i}`]?.value as Float32Array | undefined) ?? new Float32Array(16)
}

const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), ONE = new THREE.Vector3(1, 1, 1), C = new THREE.Vector3()
/**
 * Box `i` indoors: `frame` its frame in the world (a group's matrixWorld: its scale taken as the box's units), `min`/`max` its corners in
 * that frame's own units, `soft` how far in (the frame's units) the sun's gone entirely; `null` takes it away.
 */
export function setIndoorBox(i: number, box: { frame: THREE.Matrix4; min: THREE.Vector3Tuple; max: THREE.Vector3Tuple; soft: number } | null) {
  const e = MATS[i]
  if (!e) return
  if (!box) { e.fill(0); SOFT[i] = 0; return }
  const pos = new THREE.Vector3(), scale = new THREE.Vector3()
  box.frame.decompose(pos, Q, scale)
  const s = scale.x
  C.set((box.min[0] + box.max[0]) / 2, (box.min[1] + box.max[1]) / 2, (box.min[2] + box.max[2]) / 2).applyMatrix4(box.frame)
  M.compose(C, Q, ONE).invert()
  e.set(M.elements)
  // (its last row: its half sizes and its edge's softness, in the world's units)
  e[3] = ((box.max[0] - box.min[0]) / 2) * s
  e[7] = ((box.max[1] - box.min[1]) / 2) * s
  e[11] = ((box.max[2] - box.min[2]) / 2) * s
  SOFT[i] = box.soft * s
  e[15] = paused ? 0 : SOFT[i]
}
/**
 * Whether a sphere in the world (`x, y, z` its middle, `r` its radius) lies wholly within one of the indoor boxes, `margin` (world units)
 * clear of its every side: what's in there casts no sun's shadow anyone sees (the sun's taken off inside, and out of doors the walls and roof
 * round it cast theirs), so the sun's shadow map is drawn without it (app/sceneParts' ShadowPacer). None while they're paused.
 */
export function insideIndoors(x: number, y: number, z: number, r: number, margin: number) {
  for (let i = 0; i < BOXES; i++) {
    const e = MATS[i]
    if (!e || e[15] <= 0) continue
    const k = r + margin
    if (Math.abs(e[0] * x + e[4] * y + e[8] * z + e[12]) + k > e[3]) continue
    if (Math.abs(e[1] * x + e[5] * y + e[9] * z + e[13]) + k > e[7]) continue
    if (Math.abs(e[2] * x + e[6] * y + e[10] * z + e[14]) + k > e[11]) continue
    return true
  }
  return false
}
/**
 * Whether a point in the world (a piece's middle) lies within one of the indoor boxes, or no more than `out` (world units) outside its
 * sides: the room's furniture by its middle, though its sphere reaches out past a box (item 724: app/sceneParts' ShadowPacer leaves the
 * smaller of these out of the sun's map too; by the room's open side they cast long shadows over the earth outside when the sun was low).
 * None while they're paused.
 */
export function centreIndoors(x: number, y: number, z: number, out: number) {
  for (let i = 0; i < BOXES; i++) {
    const e = MATS[i]
    if (!e || e[15] <= 0) continue
    if (Math.abs(e[0] * x + e[4] * y + e[8] * z + e[12]) > e[3] + out) continue
    if (Math.abs(e[1] * x + e[5] * y + e[9] * z + e[13]) > e[7] + out) continue
    if (Math.abs(e[2] * x + e[6] * y + e[10] * z + e[14]) > e[11] + out) continue
    return true
  }
  return false
}
let paused = false
/** while another canvas draws (the editor's character viewer): the boxes off, the sun everywhere; and back on */
export function indoorSunPaused(on: boolean) {
  paused = on
  for (let i = 0; i < BOXES; i++) if (MATS[i]) MATS[i][15] = on ? 0 : SOFT[i]
}
