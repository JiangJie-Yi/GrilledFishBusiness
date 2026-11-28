// The crossed noise sheets of steam and flames in one geometry (scene/effects/sheets, item 804) are where each sheet was as a mesh of its own
// turned about its y: the same points, uvs and triangles, each sheet's seed and turn on its vertices; and the turn the vertex shaders give what
// they move in a sheet's own frame (mat2(c, -s, s, c), GLSL's column by column) is three's own turn about y
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { crossedSheets } from '@/scene/effects/sheets'

describe('crossedSheets', () => {
  it('puts each sheet where its own mesh, turned about the upright, was', () => {
    const plane = new THREE.PlaneGeometry(1.1, 1.6, 8, 28).translate(0, 0.8, 0)
    const layers = 7, turnOf = (i: number) => (i * Math.PI) / layers + 0.1, seedOf = (i: number) => i * 7.31
    const g = crossedSheets(plane, layers, turnOf, seedOf)
    const n = plane.attributes.position.count, at = plane.index!.array
    expect(g.attributes.position.count).toBe(n * layers)
    expect(g.index!.count).toBe(at.length * layers)
    const o = new THREE.Object3D(), v = new THREE.Vector3()
    for (let i = 0; i < layers; i++) {
      o.rotation.y = turnOf(i)
      o.updateMatrix()
      for (let k = 0; k < n; k++) {
        v.fromBufferAttribute(plane.attributes.position, k).applyMatrix4(o.matrix)
        const j = i * n + k
        expect(g.attributes.position.getX(j)).toBeCloseTo(v.x, 6)
        expect(g.attributes.position.getY(j)).toBeCloseTo(v.y, 6)
        expect(g.attributes.position.getZ(j)).toBeCloseTo(v.z, 6)
        expect(g.attributes.uv.getX(j)).toBe(plane.attributes.uv.getX(k))
        expect(g.attributes.uv.getY(j)).toBe(plane.attributes.uv.getY(k))
        expect(g.attributes.aSeed.getX(j)).toBeCloseTo(seedOf(i), 5)
        expect(g.attributes.aTurn.getX(j)).toBeCloseTo(Math.cos(turnOf(i)), 6)
        expect(g.attributes.aTurn.getY(j)).toBeCloseTo(Math.sin(turnOf(i)), 6)
      }
      for (let k = 0; k < at.length; k++) expect(g.index!.getX(i * at.length + k)).toBe(at[k] + i * n)
    }
  })

  it("turns what's moved in a sheet's frame as three turns the sheet", () => {
    for (const a of [0, 0.4, 1.3, Math.PI / 2, 2.9]) {
      const c = Math.cos(a), s = Math.sin(a), d = new THREE.Vector2(0.23, -0.71)
      // (GLSL's mat2(c, -s, s, c) * d: its columns (c, -s) and (s, c))
      const out = new THREE.Vector2(c * d.x + s * d.y, -s * d.x + c * d.y)
      const three = new THREE.Vector3(d.x, 0, d.y).applyAxisAngle(new THREE.Vector3(0, 1, 0), a)
      expect(out.x).toBeCloseTo(three.x, 9)
      expect(out.y).toBeCloseTo(three.z, 9)
    }
  })
})
