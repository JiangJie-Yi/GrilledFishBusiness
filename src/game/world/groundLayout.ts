// The ground round the shop (items 725, 726, the owner's 「且泥土地有點大圈，然後樣子不是很好看」「我希望它豐富點」): a bed of gravel (雨落ち,
// where the eaves drip) laid round the building's foot and out before its door (before the door only since item 741, the owner's
// 「石子地就幫我做門前有就好，其它拿掉」: groundPlan with no width round the building), and the curb (縁石) of low stones along the bed's
// outer edge, worked out from the building's footprint (a few rects in the floor's plane); and the stone plinth round the building's foot
// (item 744, plinthPlan). Pure: the shop's 3D (guestbar/ground's ShopGround, guestbar/floors' ShopBase) lays the gravel's cells, the curb's
// stones, the stepping stones, the tufts and the plinth from these.

/** a rect in the floor's plane, [x0, z0, x1, z1], x0 < x1 and z0 < z1 */
export type Rect = readonly [number, number, number, number]
/**
 * A straight run of the bed's outer edge, from `a` to `b` (along x or along z, `a` the lesser), `out` the way out of the bed (a unit
 * vector across it); whether the corner at each end turns out (convex: the bed's own corner) or in (concave: where it steps out further)
 */
export interface Run { a: [number, number]; b: [number, number]; out: [number, number]; convexA: boolean; convexB: boolean }
export interface GroundPlan {
  /** the bed's cells: whole rects, none over the building */
  gravel: Rect[]
  /** its outer edge's runs (none where it meets the building) */
  runs: Run[]
}

const inside = (r: Rect, x: number, z: number) => x > r[0] && x < r[2] && z > r[1] && z < r[3]
const grow = (r: Rect, w: number): Rect => [r[0] - w, r[1] - w, r[2] + w, r[3] + w]
/** each value once, those closer than a tenth of a millimetre taken as one */
function levels(v: number[]) {
  const s = [...v].sort((p, q) => p - q), out: number[] = []
  for (const x of s) if (!out.length || x - out[out.length - 1] > 1e-4) out.push(x)
  return out
}

/**
 * The gravel bed: `width` out round the building's footprint (`building`: its rects, touching or overlapping as they may), with `apron` (a
 * rect out before the door) as well. Its cells merged along each row and down rows that match; the runs of its outer edge, joined where
 * they run on in one line.
 */
export function groundPlan(building: readonly Rect[], width: number, apron: Rect | null): GroundPlan {
  const outer = [...building.map((r) => grow(r, width)), ...(apron ? [apron] : [])]
  const all = [...building, ...outer]
  const xs = levels(all.flatMap((r) => [r[0], r[2]])), zs = levels(all.flatMap((r) => [r[1], r[3]]))
  const nx = xs.length - 1, nz = zs.length - 1
  // (each cell: 0 outside, 1 the building, 2 the bed)
  const kind: number[] = []
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const cx = (xs[i] + xs[i + 1]) / 2, cz = (zs[j] + zs[j + 1]) / 2
    kind.push(building.some((r) => inside(r, cx, cz)) ? 1 : outer.some((r) => inside(r, cx, cz)) ? 2 : 0)
  }
  const at = (i: number, j: number) => (i < 0 || j < 0 || i >= nx || j >= nz ? 0 : kind[j * nx + i])
  // (the cells: a row's runs of bed, then each carried down while the next row has the very same run)
  const spans: [number, number, number, number][] = []
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      if (at(i, j) !== 2) continue
      let k = i
      while (at(k + 1, j) === 2) k++
      spans.push([i, k, j, j])
      i = k
    }
  }
  const merged: [number, number, number, number][] = []
  for (const s of spans) {
    const up = merged.find((m) => m[0] === s[0] && m[1] === s[1] && m[3] === s[2] - 1)
    if (up) up[3] = s[3]
    else merged.push([...s])
  }
  const gravel: Rect[] = merged.map(([i0, i1, j0, j1]) => [xs[i0], zs[j0], xs[i1 + 1], zs[j1 + 1]])
  // (the edge: each side of a bed cell with the outside across it, joined into runs along one line)
  const segs: { a: [number, number]; b: [number, number]; out: [number, number] }[] = []
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    if (at(i, j) !== 2) continue
    if (at(i, j + 1) === 0) segs.push({ a: [xs[i], zs[j + 1]], b: [xs[i + 1], zs[j + 1]], out: [0, 1] })
    if (at(i, j - 1) === 0) segs.push({ a: [xs[i], zs[j]], b: [xs[i + 1], zs[j]], out: [0, -1] })
    if (at(i + 1, j) === 0) segs.push({ a: [xs[i + 1], zs[j]], b: [xs[i + 1], zs[j + 1]], out: [1, 0] })
    if (at(i - 1, j) === 0) segs.push({ a: [xs[i], zs[j]], b: [xs[i], zs[j + 1]], out: [-1, 0] })
  }
  const same = (p: [number, number], q: [number, number]) => Math.abs(p[0] - q[0]) < 1e-6 && Math.abs(p[1] - q[1]) < 1e-6
  const lines: { a: [number, number]; b: [number, number]; out: [number, number] }[] = []
  for (const s of segs.sort((p, q) => p.a[0] - q.a[0] || p.a[1] - q.a[1])) {
    const on = lines.find((l) => l.out[0] === s.out[0] && l.out[1] === s.out[1] && same(l.b, s.a))
    if (on) on.b = s.b
    else lines.push({ a: [...s.a], b: [...s.b], out: s.out })
  }
  // (an end's corner: just past the end, a hair in from the edge, is it bed (the edge steps out there: concave) or not (convex)?)
  const bed = (x: number, z: number) => {
    const i = xs.findIndex((v, n) => n < nx && x > v && x < xs[n + 1]), j = zs.findIndex((v, n) => n < nz && z > v && z < zs[n + 1])
    return i >= 0 && j >= 0 && at(i, j) === 2
  }
  const e = 1e-3
  const runs: Run[] = lines.map(({ a, b, out }) => {
    const along: [number, number] = out[0] === 0 ? [1, 0] : [0, 1]
    const probe = (p: [number, number], dir: number) => bed(p[0] + along[0] * e * dir - out[0] * e, p[1] + along[1] * e * dir - out[1] * e)
    return { a, b, out, convexA: !probe(a, -1), convexB: !probe(b, 1) }
  })
  return { gravel, runs }
}

/**
 * The outline of rects taken together (item 753, the owner's 「這邊有重疊，要注意一下。」: the base drawn a box a rect, their faces where two
 * rects met in one plane, back to back, inside it, seen overlapping in the editor's wireframe): its runs, each a straight stretch with the
 * outside across it (`out`), joined where they run on in one line; none where two rects meet. A hole (a rect not covered, inside) has its
 * own runs, facing into it; and its area in whole rects, none over another (its top drawn once, not a rect's top over its neighbour's).
 * The runs' corners aren't worked out (convexA, convexB both true)
 */
export function outlineOf(rects: readonly Rect[]): { runs: Run[]; cells: Rect[] } {
  const xs = levels(rects.flatMap((r) => [r[0], r[2]])), zs = levels(rects.flatMap((r) => [r[1], r[3]]))
  const nx = xs.length - 1, nz = zs.length - 1
  const solid: boolean[] = []
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const cx = (xs[i] + xs[i + 1]) / 2, cz = (zs[j] + zs[j + 1]) / 2
    solid.push(rects.some((r) => inside(r, cx, cz)))
  }
  const at = (i: number, j: number) => i >= 0 && j >= 0 && i < nx && j < nz && solid[j * nx + i]
  // (its area: a row's runs of solid cells, each carried down while the next row has the very same run)
  const spans: [number, number, number, number][] = []
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      if (!at(i, j)) continue
      let k = i
      while (at(k + 1, j)) k++
      const up = spans.find((m) => m[0] === i && m[1] === k && m[3] === j - 1)
      if (up) up[3] = j
      else spans.push([i, k, j, j])
      i = k
    }
  }
  const cells: Rect[] = spans.map(([i0, i1, j0, j1]) => [xs[i0], zs[j0], xs[i1 + 1], zs[j1 + 1]])
  const segs: { a: [number, number]; b: [number, number]; out: [number, number] }[] = []
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    if (!at(i, j)) continue
    if (!at(i, j + 1)) segs.push({ a: [xs[i], zs[j + 1]], b: [xs[i + 1], zs[j + 1]], out: [0, 1] })
    if (!at(i, j - 1)) segs.push({ a: [xs[i], zs[j]], b: [xs[i + 1], zs[j]], out: [0, -1] })
    if (!at(i + 1, j)) segs.push({ a: [xs[i + 1], zs[j]], b: [xs[i + 1], zs[j + 1]], out: [1, 0] })
    if (!at(i - 1, j)) segs.push({ a: [xs[i], zs[j]], b: [xs[i], zs[j + 1]], out: [-1, 0] })
  }
  const same = (p: [number, number], q: [number, number]) => Math.abs(p[0] - q[0]) < 1e-6 && Math.abs(p[1] - q[1]) < 1e-6
  const lines: { a: [number, number]; b: [number, number]; out: [number, number] }[] = []
  for (const s of segs.sort((p, q) => p.a[0] - q.a[0] || p.a[1] - q.a[1])) {
    const on = lines.find((l) => l.out[0] === s.out[0] && l.out[1] === s.out[1] && same(l.b, s.a))
    if (on) on.b = s.b
    else lines.push({ a: [...s.a], b: [...s.b], out: s.out })
  }
  return { runs: lines.map((l) => ({ ...l, convexA: true, convexB: true })), cells }
}

/** what's left of a rect with another taken out of it: up to four rects (the strips either side, then those over and under between them) */
function minus(r: Rect, c: Rect): Rect[] {
  if (c[0] >= r[2] || c[2] <= r[0] || c[1] >= r[3] || c[3] <= r[1]) return [r]
  const out: Rect[] = []
  if (c[0] > r[0]) out.push([r[0], r[1], c[0], r[3]])
  if (c[2] < r[2]) out.push([c[2], r[1], r[2], r[3]])
  const x0 = Math.max(r[0], c[0]), x1 = Math.min(r[2], c[2])
  if (c[1] > r[1]) out.push([x0, r[1], x1, c[1]])
  if (c[3] < r[3]) out.push([x0, c[3], x1, r[3]])
  return out
}

/** a run of the plinth's face: as groundPlan's runs, and whether each end stops at a cut (its end open there, to be closed by a face across it) */
export interface PlinthRun extends Run { cutA: boolean; cutB: boolean }
export interface PlinthPlan {
  /** its ledge: the ring `out` wide round the building's faces, in whole rects */
  ledge: Rect[]
  /** its face's runs, along the ring's outer edge */
  runs: PlinthRun[]
}

/**
 * The stone plinth (石台) round the building's foot (item 744, the owner's 「約五分之三的部份做成石台」): standing `out` proud of the building's
 * faces (its ledge the ring groundPlan would lay as a bed `out` wide; its face that ring's outer edge), and none within a `cut` (the stone
 * steps at the door: the plinth stops either side of them, its runs broken there and their ends marked)
 */
export function plinthPlan(building: readonly Rect[], out: number, cut: readonly Rect[] = []): PlinthPlan {
  const p = groundPlan(building, out, null)
  const ledge = p.gravel.flatMap((r) => cut.reduce<Rect[]>((rs, c) => rs.flatMap((q) => minus(q, c)), [r]))
  const runs: PlinthRun[] = []
  for (const r of p.runs) {
    const alongX = r.out[0] === 0, line = alongX ? r.a[1] : r.a[0]
    // (its stretch along its line, cut where a cut lies across that line: [from, to, stops at a cut at its start, at its end])
    let parts: [number, number, boolean, boolean][] = [[alongX ? r.a[0] : r.a[1], alongX ? r.b[0] : r.b[1], false, false]]
    for (const c of cut) {
      const [l0, l1, s0, s1] = alongX ? [c[1], c[3], c[0], c[2]] : [c[0], c[2], c[1], c[3]]
      if (line <= l0 || line >= l1) continue
      parts = parts.flatMap(([a, b, ca, cb]) => {
        if (s1 <= a || s0 >= b) return [[a, b, ca, cb] as [number, number, boolean, boolean]]
        const o: [number, number, boolean, boolean][] = []
        if (s0 > a) o.push([a, s0, ca, true])
        if (s1 < b) o.push([s1, b, true, cb])
        return o
      })
    }
    for (const [a, b, ca, cb] of parts) {
      runs.push({ a: alongX ? [a, line] : [line, a], b: alongX ? [b, line] : [line, b], out: r.out,
        convexA: ca ? false : r.convexA, convexB: cb ? false : r.convexB, cutA: ca, cutB: cb })
    }
  }
  return { ledge, runs }
}

/** a curb stone: its middle (in the floor's plane), the way it runs, its length; `w` across it as asked */
export interface CurbStone { x: number; z: number; along: 'x' | 'z'; len: number }

/**
 * The curb's stones along the runs: `w` wide, laid just outside the bed's edge, about `len` each (one in `spread` longer or shorter, by
 * `seed`), `joint` between them. Where two runs meet at a corner, the one along x takes the corner's square: at a convex corner it runs on
 * past its end by `w` (the corner closed), at a concave one the run along z stops `w` short (not laid over its neighbour); and the run
 * along z a joint short of it as well, at either (their faces not meeting in one plane). None over a `gap` (a rect).
 */
export function curbStones(runs: readonly Run[], w: number, len: number, spread: number, joint: number, gaps: readonly Rect[] = [], seed = 1): CurbStone[] {
  let s = seed >>> 0 || 1
  const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296 }
  const out: CurbStone[] = []
  for (const r of runs) {
    const alongX = r.out[0] === 0
    let s0 = alongX ? r.a[0] : r.a[1], s1 = alongX ? r.b[0] : r.b[1]
    if (alongX) { if (r.convexA) s0 -= w; if (r.convexB) s1 += w }
    else { s0 += (r.convexA ? 0 : w) + joint; s1 -= (r.convexB ? 0 : w) + joint }
    const L = s1 - s0
    if (L < joint * 2) continue
    // (how many: the nearest whole number of `len` with its joint, at least one; their lengths each a little off it, then all scaled to fit)
    const n = Math.max(1, Math.round((L + joint) / (len + joint)))
    const ks = Array.from({ length: n }, () => 1 + (rnd() * 2 - 1) * spread)
    const k = (L - joint * (n - 1)) / ks.reduce((p, q) => p + q, 0)
    // (the line it's laid on: just outside the edge, its middle w/2 out)
    const off = (alongX ? r.a[1] : r.a[0]) + (alongX ? r.out[1] : r.out[0]) * w / 2
    let at = s0
    for (const q of ks) {
      const l = q * k, mid = at + l / 2
      const st: CurbStone = alongX ? { x: mid, z: off, along: 'x', len: l } : { x: off, z: mid, along: 'z', len: l }
      const box: Rect = alongX ? [mid - l / 2, off - w / 2, mid + l / 2, off + w / 2] : [off - w / 2, mid - l / 2, off + w / 2, mid + l / 2]
      if (!gaps.some((g) => box[0] < g[2] && box[2] > g[0] && box[1] < g[3] && box[3] > g[1])) out.push(st)
      at += l + joint
    }
  }
  return out
}
