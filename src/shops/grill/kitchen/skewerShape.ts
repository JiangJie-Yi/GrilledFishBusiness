// A grill skewer's shape (金串, the owner's: a plain rod didn't read as one): a flat steel bar with a sharp point at one end and, for a handle
// at the other, a little fish cut from the same steel (item 711, the owner's 「這個圓圈圈尾端做成魚的形狀」: it was a loop of the bar). Made in
// its own frame: along +y from its point (y 0) up through the fish's tail; the bar `w` wide (x, half of it) and `t` thick (z, half), its
// point `point` long, the fish about 3 `ring` long (`ring`: the loop's radius it took the place of), lying in the bar's flat (x, y). The
// cooks' rods (Roasting), the holders' (SkewerStore) and the one in hand while researching (Decor) are all of it, at their own sizes.
import * as THREE from 'three'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * (item 711) the fish's outline, seen from its side, its head down: its mouth on the bar's line (0, 0), up its back (+x) over its dorsal fin
 * to the narrow of its tail, out to its tail's two lobes and the notch between, and down its belly (-x) back to its mouth (anticlockwise);
 * and its eye, a hole near its head on its back's side. In `ring`s
 */
const FISH = [[0, 0], [0.26, 0.08], [0.5, 0.3], [0.7, 0.68], [0.78, 1.02], [0.98, 1.38], [0.66, 1.58], [0.52, 1.86], [0.28, 2.22],
  [0.36, 2.44], [0.84, 2.96], [0.4, 2.86], [0, 2.66], [-0.4, 2.86], [-0.84, 2.96], [-0.36, 2.44], [-0.28, 2.22], [-0.5, 1.84],
  [-0.68, 1.4], [-0.74, 1.0], [-0.66, 0.6], [-0.46, 0.28], [-0.24, 0.07]]
const FISH_EYE = { x: 0.3, y: 0.5, r: 0.13 }
/** how far down the bar's end the fish's mouth is set (in `ring`s): the bar's end inside its head, not standing out of its mouth */
const FISH_BITE = 0.25

/** the faces turned out if they were made in: `probe` a point on it, `out` the way out from there */
function outward(g: THREE.BufferGeometry, probe: number, out: THREE.Vector3) {
  g.computeVertexNormals()
  const n = new THREE.Vector3().fromBufferAttribute(g.attributes.normal as THREE.BufferAttribute, probe)
  if (n.dot(out) >= 0) return g
  const ix = g.index!.array as Uint16Array | Uint32Array
  for (let i = 0; i < ix.length; i += 3) { const k = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = k }
  g.computeVertexNormals()
  return g
}

export function ironSkewer(len: number, w: number, t: number, point: number, ring: number) {
  // (the bar: six round its flattened section, from its point up to where the loop begins)
  const SIDES = 6
  const pos: number[] = [], idx: number[] = []
  const section = (y: number, k: number) => {
    const base = pos.length / 3
    for (let j = 0; j < SIDES; j++) { const a = (j / SIDES) * Math.PI * 2; pos.push(Math.cos(a) * w * k, y, Math.sin(a) * t * k) }
    return base
  }
  const join = (a: number, b: number) => { for (let j = 0; j < SIDES; j++) { const j2 = (j + 1) % SIDES; idx.push(a + j, b + j, b + j2, a + j, b + j2, a + j2) } }
  pos.push(0, 0, 0)
  const s0 = section(point * 0.45, 0.5)
  for (let j = 0; j < SIDES; j++) idx.push(0, s0 + j, s0 + ((j + 1) % SIDES))
  const s1 = section(point, 1)
  join(s0, s1)
  const s2 = section(len, 1)
  join(s1, s2)
  const bar = new THREE.BufferGeometry()
  bar.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  bar.setIndex(idx)
  outward(bar, s1, new THREE.Vector3(1, 0, 0))
  // (the fish (item 711): its outline cut from a plate a hair thicker than the bar (its faces before the bar's where the bar runs into its
  // head, not in one plane with them), its eye a hole; its mouth FISH_BITE down the bar's end. Its own flat faces, sharp-edged as cut steel)
  const shape = new THREE.Shape(FISH.map(([x, y]) => new THREE.Vector2(x * ring, y * ring)))
  const eye = new THREE.Path()
  for (let k = 0; k < 6; k++) {
    const a = -(k / 6) * Math.PI * 2
    const x = (FISH_EYE.x + Math.cos(a) * FISH_EYE.r) * ring, y = (FISH_EYE.y + Math.sin(a) * FISH_EYE.r) * ring
    if (k) eye.lineTo(x, y); else eye.moveTo(x, y)
  }
  eye.closePath()
  shape.holes.push(eye)
  const plate = t * 1.15
  const cut = new THREE.ExtrudeGeometry(shape, { depth: plate * 2, bevelEnabled: false, curveSegments: 1 })
  cut.translate(0, len - FISH_BITE * ring, -plate)
  cut.deleteAttribute('uv')
  cut.clearGroups()
  const fish = mergeVertices(cut)
  cut.dispose()
  const both = [bar, fish].map((g) => {
    const n = g.attributes.position.count
    g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(n * 2).fill(0.5), 2))
    return g
  })
  const out = mergeGeometries(both)!
  for (const g of both) g.dispose()
  return out
}
