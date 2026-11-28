import * as THREE from 'three'

/**
 * `layers` copies of a plane in one geometry, each turned about the upright by `turnOf(i)` as three turns a mesh about its y (x' = cos x +
 * sin z, z' = -sin x + cos z), each copy's vertices given its seed (aSeed, for the noise) and its turn's cos and sin (aTurn, for turning what
 * the vertex shader moves in the sheet's own frame): the crossed noise sheets of steam and flames drawn at once, not a draw a sheet with its
 * own material (item 804). Only the plane's position and uv are kept (their shaders light nothing).
 */
export function crossedSheets(plane: THREE.BufferGeometry, layers: number, turnOf: (i: number) => number, seedOf: (i: number) => number) {
  const P = plane.attributes.position, U = plane.attributes.uv, at = plane.index!.array, n = P.count
  const pos = new Float32Array(n * layers * 3), uv = new Float32Array(n * layers * 2), seed = new Float32Array(n * layers), turn = new Float32Array(n * layers * 2)
  const index: number[] = []
  for (let i = 0; i < layers; i++) {
    const a = turnOf(i), c = Math.cos(a), s = Math.sin(a), sd = seedOf(i)
    for (let v = 0; v < n; v++) {
      const o = i * n + v, x = P.getX(v), z = P.getZ(v)
      pos[o * 3] = c * x + s * z
      pos[o * 3 + 1] = P.getY(v)
      pos[o * 3 + 2] = -s * x + c * z
      uv[o * 2] = U.getX(v)
      uv[o * 2 + 1] = U.getY(v)
      seed[o] = sd
      turn[o * 2] = c
      turn[o * 2 + 1] = s
    }
    for (let k = 0; k < at.length; k++) index.push(at[k] + i * n)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
  g.setAttribute('aTurn', new THREE.BufferAttribute(turn, 2))
  g.setIndex(index)
  g.computeBoundingSphere()
  return g
}
