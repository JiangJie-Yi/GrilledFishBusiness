// The box tree's ray hits (scene/render/rayTree, item 579) are three's own, hit for hit: shapes indexed and not, turned, moved and
// stretched, a face a side, both sides and the back; the distances, points, uvs, normals, faces as three's Mesh.raycast gives them
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { treeNow, treeRaycast } from '@/scene/render/rayTree'

let seed = 12345
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
const key = (h: THREE.Intersection) => [h.faceIndex, h.distance.toFixed(9), ...h.point.toArray().map((x) => x.toFixed(9)),
  ...(h.uv?.toArray() ?? []).map((x) => x.toFixed(9)), ...(h.normal?.toArray() ?? []).map((x) => x.toFixed(9)),
  ...(h.face?.normal.toArray() ?? []).map((x) => x.toFixed(9))].join(',')

describe('rayTree', () => {
  it("hits what three's own raycast hits, the same in every way", () => {
    const shapes = [
      new THREE.TorusKnotGeometry(1, 0.3, 120, 16),
      new THREE.SphereGeometry(1, 32, 24),
      new THREE.BoxGeometry(1, 2, 3, 8, 8, 8).toNonIndexed(),
      new THREE.CylinderGeometry(0.5, 1, 2, 32, 12, true),
    ]
    let rays = 0, hits = 0
    for (const geo of shapes) for (const side of [THREE.FrontSide, THREE.DoubleSide, THREE.BackSide]) {
      const a = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ side }))
      a.position.set(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1)
      a.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3)
      a.scale.set(0.5 + rnd(), 0.5 + rnd(), 0.5 + rnd())
      a.updateMatrixWorld(true)
      const b = a.clone()
      b.raycast = treeRaycast
      treeNow(geo)
      const rc = new THREE.Raycaster()
      for (let k = 0; k < 400; k++) {
        const o = new THREE.Vector3(rnd() * 8 - 4, rnd() * 8 - 4, rnd() * 8 - 4)
        const d = k % 3 === 0 ? a.position.clone().sub(o).normalize() : new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize()
        rc.set(o, d)
        const ha = rc.intersectObject(a), hb = rc.intersectObject(b)
        expect(hb.map(key)).toEqual(ha.map(key))
        rays++
        hits += ha.length
      }
    }
    expect(rays).toBe(4800)
    expect(hits).toBeGreaterThan(1000)
  })
  it("without a tree yet (the page not idle yet), it's three's own", () => {
    const geo = new THREE.SphereGeometry(1, 40, 30)
    const a = new THREE.Mesh(geo, new THREE.MeshBasicMaterial())
    const b = a.clone()
    b.raycast = treeRaycast
    const rc = new THREE.Raycaster(new THREE.Vector3(0.2, 0.1, 5), new THREE.Vector3(0, 0, -1))
    expect(rc.intersectObject(b).map(key)).toEqual(rc.intersectObject(a).map(key))
  })
  it('a tree made before the positions moved is not used', () => {
    const geo = new THREE.SphereGeometry(1, 40, 30)
    const a = new THREE.Mesh(geo, new THREE.MeshBasicMaterial())
    const b = a.clone()
    b.raycast = treeRaycast
    treeNow(geo)
    geo.translate(0, 0, 1)
    geo.attributes.position.needsUpdate = true
    geo.computeBoundingSphere()
    geo.computeBoundingBox()
    const rc = new THREE.Raycaster(new THREE.Vector3(0.2, 0.1, 5), new THREE.Vector3(0, 0, -1))
    expect(rc.intersectObject(b).map(key)).toEqual(rc.intersectObject(a).map(key))
  })
})
