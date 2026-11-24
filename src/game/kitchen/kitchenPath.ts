// A way across the kitchen's floor round what stands on it (the cook's table, the rice tub, the freezer, the racks, the sink): the floor
// laid out as a grid, the shortest way along it found (A*), then pulled straight wherever the way between two points is clear, so it's a
// few corners and not a staircase. In any flat frame: x and z, the things in it as rectangles along its axes.

export type Rect = { x0: number; z0: number; x1: number; z1: number }
type P = [number, number]

const inside = (r: Rect, x: number, z: number) => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1

/** whether the straight way from a to b keeps clear of every block (looked at every `step` along it) */
function clear(a: P, b: P, blocks: Rect[], step: number) {
  const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (step / 2)))
  for (let k = 0; k <= n; k++) {
    const t = k / n, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t
    if (blocks.some((r) => inside(r, x, z))) return false
  }
  return true
}

/**
 * A place inside a piece itself (its block less the room left round it for passers-by, `margin`), moved out past that piece's nearest side
 * into the room round it (`gap` past the side): where one going to it stands, up against it, not in it (item 333, the owner's, 2026-11-18:
 * 「外場路線有問題，可否設置碰撞點?」: a place set inside a piece (a server's under the warmer, the plater's at the low rack, a spot on the
 * cook table) had every way to or from it walk straight through that piece). A place in the room round it, or clear, is as it was.
 */
export function outOfPieces(p: P, blocks: Rect[], margin: number, gap = 0.03): P {
  let q = p
  for (const r of blocks) {
    const core = { x0: r.x0 + margin, z0: r.z0 + margin, x1: r.x1 - margin, z1: r.z1 - margin }
    if (!inside(core, q[0], q[1])) continue
    const d = [q[0] - core.x0, core.x1 - q[0], q[1] - core.z0, core.z1 - q[1]], m = Math.min(...d)
    q = m === d[0] ? [core.x0 - gap, q[1]] : m === d[1] ? [core.x1 + gap, q[1]] : m === d[2] ? [q[0], core.z0 - gap] : [q[0], core.z1 + gap]
  }
  return q
}

/** a place standing inside a block (in the room left round it for passers-by, say: someone stepped up to it) stepped out of it the
 * shortest way, past its nearest edge (and on out of any it comes into then) */
function stepOut(p: P, blocks: Rect[], cell: number): P {
  let q = p
  for (let n = 0; n < 4; n++) {
    const r = blocks.find((b) => inside(b, q[0], q[1]))
    if (!r) break
    const d = [q[0] - r.x0, r.x1 - q[0], q[1] - r.z0, r.z1 - q[1]], m = Math.min(...d), e = cell * 0.25
    q = m === d[0] ? [r.x0 - e, q[1]] : m === d[1] ? [r.x1 + e, q[1]] : m === d[2] ? [q[0], r.z0 - e] : [q[0], r.z1 + e]
  }
  return q
}

/** a place to stand (a server's, waiting by their gate) clear of what's on the floor: where it is, or (standing in a block, the room round it
 * included) just past the block's nearest edge. A server's place inside their gate was on the miso pot by the rice tub, once it was put
 * back there (the owner saw her standing in it) */
export const standClear = (p: P, blocks: Rect[], cell = 0.1): P => stepOut(p, blocks, cell)

const wayLength = (w: P[]) => w.reduce((s, v, i) => (i ? s + Math.hypot(v[0] - w[i - 1][0], v[1] - w[i - 1][1]) : 0), 0)

/**
 * Where to stand to reach something whose middle is `p`, coming from `from`: just past a side of a block it's in (and on out of any block
 * that comes into), inside the room, with a way to it from `from`; of those, the one the shortest way off. `p` itself if it's clear;
 * standClear's if no side will do. The nearest side alone (standClear) can be a slot no way reaches: the coal sack by the cook table's end,
 * stepped out of the sack into the table and out of the table toward the counter, stood off the kitchen's floor between the table's side
 * and the counter; no way found there, the third cook walked the straight line through the table's end (item 54).
 */
export function reachSpot(p: P, from: P, room: Rect, blocks: Rect[], cell = 0.1): P {
  const ins = blocks.filter((r) => inside(r, p[0], p[1]))
  if (!ins.length) return p
  const e = cell * 0.25
  const inRoom = (q: P) => q[0] >= room.x0 && q[0] <= room.x1 && q[1] >= room.z0 && q[1] <= room.z1
  let best: P | null = null, bestLen = Infinity
  for (const r of ins) {
    for (const side of [[r.x0 - e, p[1]], [r.x1 + e, p[1]], [p[0], r.z0 - e], [p[0], r.z1 + e]] as P[]) {
      const q = stepOut(side, blocks, cell)
      if (!inRoom(q) || blocks.some((b) => inside(b, q[0], q[1]))) continue
      const way = kitchenPath(from, q, room, blocks, cell)
      if (!way) continue
      const len = wayLength(way)
      if (len < bestLen) { bestLen = len; best = q }
    }
  }
  return best ?? stepOut(p, blocks, cell)
}

/**
 * How much of the room left round each block is given up, in turn, when there's no way with all of it (item 670, the owner's, 2026-11-24:
 * 「注意一下動線，別讓腳色穿越」: a sack or a crate put down across the kitchen's way left the gaps round it narrower than a body and its
 * room on both sides, no way was found, and the way was drawn straight from end to end through the warmer, the fryer and the serving
 * counter; squeezed past, they brush by a thing's side, not through it)
 */
export const SQUEEZE = [0.065, 0.11] as const
/** a block with `s` of the room round it given up (never past its own middle) */
const shrunk = (r: Rect, s: number): Rect => {
  const cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2
  return { x0: Math.min(cx, r.x0 + s), z0: Math.min(cz, r.z0 + s), x1: Math.max(cx, r.x1 - s), z1: Math.max(cz, r.z1 - s) }
}

/**
 * The way from `from` to `to` inside `room`, round the `blocks` (each already grown by how much room a person walking by needs): the
 * corners along it, from and to included; the straight line if nothing's in the way; squeezed past them (SQUEEZE) if there's no way with
 * all the room round them; null if there's no way at all. (`from` and `to` themselves may stand a little inside a block: whoever's there
 * stepped up to it.)
 */
export function kitchenPath(from: P, to: P, room: Rect, blocks: Rect[], cell = 0.1, squeeze: readonly number[] = SQUEEZE): P[] | null {
  for (let k = 0; k <= squeeze.length; k++) {
    const bl = k ? blocks.map((r) => shrunk(r, squeeze[k - 1])) : blocks
    // (an end standing inside a block steps out of it first, and the way is found between where they step out to)
    const a0 = stepOut(from, bl, cell), b0 = stepOut(to, bl, cell)
    const way = wayBetween(a0, b0, room, bl, cell)
    if (way) return [from, ...(a0 !== from ? [a0] : []), ...way.slice(1, -1), ...(b0 !== to ? [b0] : []), to]
  }
  return null
}

/**
 * (item 670) the nearest place to `p` one can stand at with `standRoom` more round them than the blocks have, that's walked to from `from`
 * (squeezed past them if need be, as SQUEEZE): a server's place a piece was put down on, or round, stood clear of it the shortest way
 * (standClear) landed in a nook shut in by the warmer and the miso pot, and every way from it went through the warmer. `p` itself if it's
 * such a place; null if there's none in the room.
 */
export function reachableNear(p: P, from: P, room: Rect, blocks: Rect[], standRoom: number, cell = 0.1): P | null {
  const walk = blocks.map((r) => shrunk(r, SQUEEZE[SQUEEZE.length - 1]))
  const stand = blocks.map((r) => ({ x0: r.x0 - standRoom, z0: r.z0 - standRoom, x1: r.x1 + standRoom, z1: r.z1 + standRoom }))
  const nx = Math.max(1, Math.ceil((room.x1 - room.x0) / cell)), nz = Math.max(1, Math.ceil((room.z1 - room.z0) / cell))
  const idx = (i: number, j: number) => j * nx + i
  const cx = (i: number) => room.x0 + (i + 0.5) * cell, cz = (j: number) => room.z0 + (j + 0.5) * cell
  const free = new Uint8Array(nx * nz)
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) free[idx(i, j)] = walk.some((r) => inside(r, cx(i), cz(j))) ? 0 : 1
  const s = stepOut(from, walk, cell)
  const si = Math.min(nx - 1, Math.max(0, Math.floor((s[0] - room.x0) / cell))), sj = Math.min(nz - 1, Math.max(0, Math.floor((s[1] - room.z0) / cell)))
  // (all that's walked to from there, square by square; a diagonal only past two clear squares, as the ways go)
  const seen = new Uint8Array(nx * nz), queue = [idx(si, sj)]
  seen[idx(si, sj)] = 1
  while (queue.length) {
    const k = queue.pop()!, i = k % nx, j = Math.floor(k / nx)
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      if (!di && !dj) continue
      const ni = i + di, nj = j + dj
      if (ni < 0 || nj < 0 || ni >= nx || nj >= nz) continue
      const k2 = idx(ni, nj)
      if (seen[k2] || !free[k2] || (di && dj && (!free[idx(i + di, j)] || !free[idx(i, j + dj)]))) continue
      seen[k2] = 1
      queue.push(k2)
    }
  }
  const pi = Math.floor((p[0] - room.x0) / cell), pj = Math.floor((p[1] - room.z0) / cell)
  if (pi >= 0 && pj >= 0 && pi < nx && pj < nz && seen[idx(pi, pj)] && !stand.some((r) => inside(r, p[0], p[1]))) return p
  let best: P | null = null, bestD = Infinity
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    if (!seen[idx(i, j)]) continue
    const x = cx(i), z = cz(j), d = Math.hypot(x - p[0], z - p[1])
    if (d < bestD && !stand.some((r) => inside(r, x, z))) { bestD = d; best = [x, z] }
  }
  return best
}

/** what a square in a block costs on the way through them (THROUGH squares clear for each of it) */
const THROUGH = 12
/**
 * (item 670) the way from `from` to `to` when there's none round the blocks even squeezed past them (one's place shut in: a piece put down
 * on it, or round it): across the grid, a square in a block (with the most of the room round it given up) costing THROUGH clear ones, so
 * it's round them wherever it can be and across the least of them where it can't; a few corners where it's clear, square by square where
 * it isn't. Never the straight line through all that's there (the way the staff's ways went before); [from, to] only if they're one square.
 */
export function kitchenPathThrough(from: P, to: P, room: Rect, blocks: Rect[], cell = 0.1): P[] {
  const bl = blocks.map((r) => shrunk(r, SQUEEZE[SQUEEZE.length - 1]))
  const nx = Math.max(1, Math.ceil((room.x1 - room.x0) / cell)), nz = Math.max(1, Math.ceil((room.z1 - room.z0) / cell))
  const idx = (i: number, j: number) => j * nx + i
  const cx = (i: number) => room.x0 + (i + 0.5) * cell, cz = (j: number) => room.z0 + (j + 0.5) * cell
  const cellOf = (p: P): [number, number] => [Math.min(nx - 1, Math.max(0, Math.floor((p[0] - room.x0) / cell))), Math.min(nz - 1, Math.max(0, Math.floor((p[1] - room.z0) / cell)))]
  const [si, sj] = cellOf(from), [ti, tj] = cellOf(to)
  const s0 = idx(si, sj), goal = idx(ti, tj)
  if (s0 === goal) return [from, to]
  const cost = new Float32Array(nx * nz)
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) cost[idx(i, j)] = bl.some((r) => inside(r, cx(i), cz(j))) ? THROUGH : 0
  const g = new Float32Array(nx * nz).fill(Infinity), came = new Int32Array(nx * nz).fill(-1), done = new Uint8Array(nx * nz)
  const open: number[] = [s0]
  g[s0] = 0
  const h = (k: number) => Math.hypot((k % nx) - ti, Math.floor(k / nx) - tj)
  while (open.length) {
    let best = 0
    for (let k = 1; k < open.length; k++) if (g[open[k]] + h(open[k]) < g[open[best]] + h(open[best])) best = k
    const cur = open[best]
    open.splice(best, 1)
    if (cur === goal) break
    if (done[cur]) continue
    done[cur] = 1
    const i = cur % nx, j = Math.floor(cur / nx)
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      if (!di && !dj) continue
      const ni = i + di, nj = j + dj
      if (ni < 0 || nj < 0 || ni >= nx || nj >= nz) continue
      const k = idx(ni, nj)
      if (done[k]) continue
      const step = di && dj ? Math.SQRT2 : 1
      const ng = g[cur] + step * (1 + cost[k])
      if (ng < g[k]) { g[k] = ng; came[k] = cur; open.push(k) }
    }
  }
  if (came[goal] < 0) return [from, to]
  const cells: P[] = []
  for (let k = goal; k >= 0 && k !== s0; k = came[k]) cells.push([cx(k % nx), cz(Math.floor(k / nx))])
  cells.reverse()
  const pts: P[] = [from, ...cells.slice(0, -1), to]
  const out: P[] = [from]
  let a = 0
  while (a < pts.length - 1) {
    let b = pts.length - 1
    while (b > a + 1 && !clear(pts[a], pts[b], bl, cell)) b--
    out.push(pts[b])
    a = b
  }
  return out
}

/** the corners of the way from a to b, both included (both standing clear of the blocks), or null */
function wayBetween(from: P, to: P, room: Rect, blocks: Rect[], cell: number): P[] | null {
  if (clear(from, to, blocks, cell)) return [from, to]
  const nx = Math.max(1, Math.ceil((room.x1 - room.x0) / cell)), nz = Math.max(1, Math.ceil((room.z1 - room.z0) / cell))
  const idx = (i: number, j: number) => j * nx + i
  const cx = (i: number) => room.x0 + (i + 0.5) * cell, cz = (j: number) => room.z0 + (j + 0.5) * cell
  const cellOf = (p: P): [number, number] => [Math.min(nx - 1, Math.max(0, Math.floor((p[0] - room.x0) / cell))), Math.min(nz - 1, Math.max(0, Math.floor((p[1] - room.z0) / cell)))]
  const [si, sj] = cellOf(from), [ti, tj] = cellOf(to)
  const free = new Uint8Array(nx * nz)
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) free[idx(i, j)] = blocks.some((r) => inside(r, cx(i), cz(j))) ? 0 : 1
  free[idx(si, sj)] = 1
  free[idx(ti, tj)] = 1
  // (A* over the grid, eight ways round each cell; a diagonal only where both cells beside it are free, so it never cuts a corner)
  const g = new Float32Array(nx * nz).fill(Infinity)
  const came = new Int32Array(nx * nz).fill(-1)
  const open: number[] = [idx(si, sj)]
  const inOpen = new Uint8Array(nx * nz)
  const done = new Uint8Array(nx * nz)
  g[idx(si, sj)] = 0
  inOpen[idx(si, sj)] = 1
  const h = (k: number) => Math.hypot((k % nx) - ti, Math.floor(k / nx) - tj)
  const goal = idx(ti, tj)
  while (open.length) {
    let best = 0
    for (let k = 1; k < open.length; k++) if (g[open[k]] + h(open[k]) < g[open[best]] + h(open[best])) best = k
    const cur = open[best]
    open.splice(best, 1)
    inOpen[cur] = 0
    if (cur === goal) break
    done[cur] = 1
    const i = cur % nx, j = Math.floor(cur / nx)
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      if (!di && !dj) continue
      const ni = i + di, nj = j + dj
      if (ni < 0 || nj < 0 || ni >= nx || nj >= nz) continue
      const k = idx(ni, nj)
      if (!free[k] || done[k]) continue
      if (di && dj && (!free[idx(i + di, j)] || !free[idx(i, j + dj)])) continue
      const ng = g[cur] + (di && dj ? Math.SQRT2 : 1)
      if (ng < g[k]) {
        g[k] = ng
        came[k] = cur
        if (!inOpen[k]) { open.push(k); inOpen[k] = 1 }
      }
    }
  }
  if (came[goal] < 0 && goal !== idx(si, sj)) return null
  // (back from the goal to the start, cell by cell; then only the corners kept where the straight way to the next one is clear)
  const cells: P[] = []
  for (let k = goal; k >= 0 && k !== idx(si, sj); k = came[k]) cells.push([cx(k % nx), cz(Math.floor(k / nx))])
  cells.reverse()
  const pts: P[] = [from, ...cells.slice(0, -1), to]
  const out: P[] = [from]
  let a = 0
  while (a < pts.length - 1) {
    let b = pts.length - 1
    while (b > a + 1 && !clear(pts[a], pts[b], blocks, cell)) b--
    out.push(pts[b])
    a = b
  }
  return out
}
