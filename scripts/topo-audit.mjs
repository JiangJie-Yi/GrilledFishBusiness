// Every model's meshes looked over for how they're wired (item 843, the owner's 「我看有些模型的佈線很誇張」; docs/STANDARDS.md): each mesh's
// triangles, its size, its slivers (a triangle whose longest side is over SLIVER times its height across it), and of those its caps (one
// angle over CAP degrees: the flat obtuse kind an n-gon fanned or earcut leaves, shading in streaks and showing as a spray of lines across a
// face; a long thin quad's two halves are needles, right-angled, and fine), its worst pole (the most triangles at one point: a fan into a
// middle, a dark blotch), its degenerate ones (no area). Of the caps, those shaded smooth (`soft`: its corners' normals more than BENT degrees
// apart, so the light's drawn across its length in a streak) apart from those on a flat face (a cylinder's end, a board's face: all its
// normals one way, it shades as one colour; any convex cap of a dozen sides or more cut into triangles without a point inside has two such,
// its ears, however it's cut). Worst first: by soft caps, then caps, then poles, then slivers.
//
//   node scripts/topo-audit.mjs [files…]   (SLIVER=12 CAP=150 BENT=5 POLE=10 TOP=40; MODEL=1 a line a model instead; CSV=1)
import { readdir } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'

const SLIVER = +(process.env.SLIVER ?? 12), POLE = +(process.env.POLE ?? 10), TOP = +(process.env.TOP ?? 40), CAP = +(process.env.CAP ?? 150)
const CAP_COS = Math.cos((CAP * Math.PI) / 180), BENT_COS = Math.cos(((+(process.env.BENT ?? 5)) * Math.PI) / 180)
let files = process.argv.slice(2)
if (!files.length) files = (await readdir('public/models')).filter((f) => f.endsWith('.glb')).map((f) => join('public/models', f))
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
const rows = []
const v0 = [0, 0, 0], v1 = [0, 0, 0], v2 = [0, 0, 0], n0 = [0, 0, 0], n1 = [0, 0, 0], n2 = [0, 0, 0]
const ncos = (a, b) => (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / Math.sqrt(Math.max(1e-24, (a[0] ** 2 + a[1] ** 2 + a[2] ** 2) * (b[0] ** 2 + b[1] ** 2 + b[2] ** 2)))
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const len2 = (a) => a[0] * a[0] + a[1] * a[1] + a[2] * a[2]
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
for (const file of files) {
  let doc
  try { doc = await io.read(file) } catch (e) { console.error('skip', file, e.message); continue }
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh()
    if (!mesh) continue
    const m = node.getWorldMatrix()
    const sc = Math.max(Math.hypot(m[0], m[1], m[2]), Math.hypot(m[4], m[5], m[6]), Math.hypot(m[8], m[9], m[10]))
    let tris = 0, pole = 0, slivers = 0, caps = 0, soft = 0, dead = 0, area = 0
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity]
    for (const p of mesh.listPrimitives()) {
      const pos = p.getAttribute('POSITION'), nrm = p.getAttribute('NORMAL')
      if (!pos || (p.getMode() !== 4 && p.getMode() !== undefined)) continue
      const n = pos.getCount()
      const v = [0, 0, 0]
      const key = new Map(), id = new Int32Array(n)
      for (let i = 0; i < n; i++) {
        pos.getElement(i, v)
        for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], v[k]); hi[k] = Math.max(hi[k], v[k]) }
        const kq = v.map((x) => Math.round(x * 1e5)).join(',')
        if (!key.has(kq)) key.set(kq, key.size)
        id[i] = key.get(kq)
      }
      const idx = p.getIndices()
      const count = idx ? idx.getCount() : n
      const use = new Int32Array(key.size)
      for (let t = 0; t + 2 < count; t += 3) {
        const a = idx ? idx.getScalar(t) : t, b = idx ? idx.getScalar(t + 1) : t + 1, c = idx ? idx.getScalar(t + 2) : t + 2
        use[id[a]]++; use[id[b]]++; use[id[c]]++
        pos.getElement(a, v0); pos.getElement(b, v1); pos.getElement(c, v2)
        const e0 = sub(v1, v0), e1 = sub(v2, v1), e2 = sub(v0, v2)
        const A = Math.sqrt(len2(cross(e0, sub(v2, v0)))) / 2
        const L2 = Math.max(len2(e0), len2(e1), len2(e2))
        tris++
        if (A < 1e-12 || L2 < 1e-16) { dead++; continue }
        area += A
        // (longest side over the height across it: c / (2A / c) = c^2 / 2A; an even triangle's 1.15)
        if (L2 / (2 * A) > SLIVER) {
          slivers++
          // (its widest angle: the one across from the longest side; over CAP, a cap)
          const sides = [[e0, sub(v2, v0)], [sub(v0, v1), e1], [sub(v1, v2), sub(v0, v2)]]
          for (const [p_, q_] of sides) {
            const c_ = (p_[0] * q_[0] + p_[1] * q_[1] + p_[2] * q_[2]) / Math.sqrt(len2(p_) * len2(q_))
            if (c_ < CAP_COS) {
              caps++
              // (shaded smooth across it: its corners' normals apart)
              if (nrm) { nrm.getElement(a, n0); nrm.getElement(b, n1); nrm.getElement(c, n2); if (Math.min(ncos(n0, n1), ncos(n1, n2), ncos(n0, n2)) < BENT_COS) soft++ }
              break
            }
          }
        }
      }
      for (const u of use) pole = Math.max(pole, u)
    }
    const size = Math.max(...hi.map((h, k) => h - lo[k])) * sc
    rows.push({ file: basename(file), name: node.getName() || mesh.getName() || '?', tris, size, pole, slivers, caps, soft, dead, area: area * sc * sc })
  }
}
if (process.env.MODEL) {
  const by = new Map()
  for (const r of rows) {
    const o = by.get(r.file) ?? { file: r.file, tris: 0, slivers: 0, caps: 0, soft: 0, dead: 0, pole: 0, meshes: 0 }
    o.tris += r.tris; o.slivers += r.slivers; o.caps += r.caps; o.soft += r.soft; o.dead += r.dead; o.pole = Math.max(o.pole, r.pole); o.meshes++
    by.set(r.file, o)
  }
  const list = [...by.values()].sort((a, b) => b.soft - a.soft || b.caps - a.caps || b.pole - a.pole || b.tris - a.tris)
  for (const o of list.slice(0, TOP)) console.log(`${o.file.padEnd(24)} ${String(o.tris).padStart(7)} tris  ${String(o.soft).padStart(5)} soft caps  ${String(o.caps).padStart(5)} caps (${(100 * o.caps / Math.max(1, o.tris)).toFixed(0).padStart(3)}%)  ${String(o.slivers).padStart(6)} slivers  pole ${String(o.pole).padStart(3)}  dead ${o.dead}  ${o.meshes} meshes`)
  console.log(`${list.length} models, ${rows.reduce((s, r) => s + r.tris, 0)} triangles, ${rows.reduce((s, r) => s + r.soft, 0)} soft caps, ${rows.reduce((s, r) => s + r.caps, 0)} caps, ${rows.reduce((s, r) => s + r.slivers, 0)} slivers`)
} else {
  const bad = rows.filter((r) => r.caps >= 4 || r.pole >= POLE || r.dead > 0)
  bad.sort((a, b) => b.soft - a.soft || b.caps - a.caps || b.pole - a.pole || b.slivers - a.slivers)
  const csv = !!process.env.CSV
  if (csv) console.log('file,mesh,tris,soft,caps,slivers,pole,dead,size')
  for (const r of bad.slice(0, TOP)) {
    if (csv) console.log([r.file, r.name, r.tris, r.soft, r.caps, r.slivers, r.pole, r.dead, r.size.toFixed(3)].join(','))
    else console.log(`${r.file.padEnd(22)} ${r.name.slice(0, 28).padEnd(28)} ${String(r.tris).padStart(6)} tris  ${String(r.soft).padStart(4)} soft  ${String(r.caps).padStart(4)} caps  ${String(r.slivers).padStart(5)} slivers  pole ${String(r.pole).padStart(3)}  dead ${r.dead}  ${r.size.toFixed(2)} across`)
  }
  console.log(`${bad.length} of ${rows.length} meshes (SLIVER ${SLIVER}, CAP ${CAP} degrees, POLE ${POLE})`)
}
