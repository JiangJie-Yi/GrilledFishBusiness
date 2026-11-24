/**
 * The owner making way for those walking near him as he walks his way (item 659 d, the Tester window's: on his way home from where he's
 * been put down, a server coming at him through the kitchen or across in front of him went through him, 0.07 to 0.20 m between their
 * bodies: those standing in his way step aside for him, but those walking kept to their own way, and so did he). As in a real kitchen,
 * the one with nothing in his hands gives way to those carrying, who don't step aside (the servers keep their trays level, faster than he
 * goes): what he'd do next is seen ahead (GIVE.ahead seconds), each of them going on as they're going, and the first of these that keeps
 * him clear of all of them taken: on at his own pace; slower (one ahead going his way: at about their pace); waiting where he is (one about
 * to cross his way ahead); a step off where his way has him (one coming at him head on, one coming up behind him quicker than he goes,
 * one crossing just where he stands), the nearest step first, where there's floor for it and none standing. None of them clear, whichever
 * keeps him furthest from them.
 *
 * The world's measure (metres, seconds), on the floor (x, z). `x, z` where his way has him; `ux, uz` the way it goes (unit); `speed` his own
 * pace along it; `cx, cz` how far off it he's stepped already; `others` flat, x, z, vx, vz of each one's body (those standing too: no step
 * is taken onto them).
 */
export const GIVE = {
  /** how near two bodies' middles may pass (his half and theirs, as the shop's map keeps those let down off people) */
  clear: 0.5,
  /** how far ahead in time he sees what's coming (seconds) */
  ahead: 0.7,
  /** going slower than this, one's standing */
  moving: 0.35,
  /** looked at only within this of him */
  look: 3,
  /** how far off his way he steps, the near step and the far one */
  steps: [0.3, 0.55] as const,
  /** how quick he steps aside (metres a second): his step's taken at that over the time seen ahead */
  stepSpeed: 1.5,
  /** the paces tried before he'd wait (his own pace's share) */
  paces: [1, 0.75, 0.5, 0.25] as const,
}
/** whether there's floor for him at (dx, dz) off where his way has him (the shop's map, a body turned sideways) */
export type Floor = { clear(dx: number, dz: number): boolean }

export type GiveWay = {
  /** how fast he goes on: 0 waiting .. 1 his own pace */
  k: number
  /** where off his way he's to be (the world's, from where his way has him): 0, 0 on it */
  dx: number
  dz: number
  /** how near the nearest of them comes, done so (squared: compared only) */
  near2: number
}

/** the nearest two come over [t0, t1] (squared): one at (ax, az) + (avx, avz)·t, the other at (bx, bz) + (bvx, bvz)·t */
function meet2(ax: number, az: number, avx: number, avz: number, bx: number, bz: number, bvx: number, bvz: number, t0: number, t1: number) {
  const rx = bx - ax, rz = bz - az, wx = bvx - avx, wz = bvz - avz, ww = wx * wx + wz * wz
  const t = ww > 1e-9 ? Math.min(t1, Math.max(t0, -(rx * wx + rz * wz) / ww)) : t0
  const qx = rx + wx * t, qz = rz + wz * t
  return qx * qx + qz * qz
}
/** the nearest any of those walking comes over the time seen ahead (squared), he going on from (hx, hz) at (hvx, hvz) */
function goes2(hx: number, hz: number, hvx: number, hvz: number, o: ArrayLike<number>, walking: Uint8Array, n: number) {
  let m = Infinity
  for (let j = 0; j < n; j++) if (walking[j]) m = Math.min(m, meet2(hx, hz, hvx, hvz, o[j * 4], o[j * 4 + 1], o[j * 4 + 2], o[j * 4 + 3], 0, GIVE.ahead))
  return m
}
/** the same, he stepping from (hx, hz) over to (tx, tz) at GIVE.stepSpeed and stood there after */
function steps2(hx: number, hz: number, tx: number, tz: number, o: ArrayLike<number>, walking: Uint8Array, n: number) {
  const L = Math.hypot(tx - hx, tz - hz), tau = Math.min(GIVE.ahead, L / GIVE.stepSpeed)
  const vx = tau > 1e-6 ? (tx - hx) / tau : 0, vz = tau > 1e-6 ? (tz - hz) / tau : 0
  let m = Infinity
  for (let j = 0; j < n; j++) {
    if (!walking[j]) continue
    const ox = o[j * 4], oz = o[j * 4 + 1], ovx = o[j * 4 + 2], ovz = o[j * 4 + 3]
    m = Math.min(m, meet2(hx, hz, vx, vz, ox, oz, ovx, ovz, 0, tau))
    if (tau < GIVE.ahead) m = Math.min(m, meet2(tx, tz, 0, 0, ox, oz, ovx, ovz, tau, GIVE.ahead))
  }
  return m
}
const WALKING = new Uint8Array(64)
/** the step offs tried, the near ring first, to his sides first, then back, then forward (unit, in his way's own frame: along, left) */
const RING: [number, number][] = [[0, 1], [0, -1], [-0.7071, 0.7071], [-0.7071, -0.7071], [-1, 0], [0.7071, 0.7071], [0.7071, -0.7071], [1, 0]]

/** what he does for `others`, written into `out` and returned */
export function giveWay(x: number, z: number, ux: number, uz: number, speed: number, cx: number, cz: number, others: ArrayLike<number>, floor: Floor | null, out: GiveWay): GiveWay {
  out.k = 1; out.dx = 0; out.dz = 0; out.near2 = Infinity
  const n = Math.min(WALKING.length, Math.floor(others.length / 4)), L2 = GIVE.look * GIVE.look, M2 = GIVE.moving * GIVE.moving
  let any = false
  for (let j = 0; j < n; j++) {
    const rx = others[j * 4] - x, rz = others[j * 4 + 1] - z, vx = others[j * 4 + 2], vz = others[j * 4 + 3]
    WALKING[j] = rx * rx + rz * rz <= L2 && vx * vx + vz * vz >= M2 ? 1 : 0
    if (WALKING[j]) any = true
  }
  if (!any) return out
  const C2 = GIVE.clear * GIVE.clear, hx = x + cx, hz = z + cz, off = cx !== 0 || cz !== 0
  // (on, at his own pace or slower: back onto his way if that's clear, else where he's stepped to already)
  let bestK = 0, best2 = -1
  for (const k of GIVE.paces) {
    const vx = ux * speed * k, vz = uz * speed * k
    const m = goes2(x, z, vx, vz, others, WALKING, n)
    if (m >= C2) { out.k = k; out.near2 = m; return out }
    const mo = off ? goes2(hx, hz, vx, vz, others, WALKING, n) : m
    if (mo >= C2) { out.k = k; out.dx = cx; out.dz = cz; out.near2 = mo; return out }
    if (mo > best2) { best2 = mo; bestK = k }
  }
  // (waiting there)
  const w = goes2(hx, hz, 0, 0, others, WALKING, n)
  if (w >= C2) { out.k = 0; out.dx = cx; out.dz = cz; out.near2 = w; return out }
  let bdx = cx, bdz = cz, bk = 0
  if (w > best2) best2 = w
  else bk = bestK
  // (a step off his way: the nearest that keeps him clear, with floor for it and none of them stood there)
  const lx = -uz, lz = ux
  for (const r of GIVE.steps) for (const [a, l] of RING) {
    const dx = (ux * a + lx * l) * r, dz = (uz * a + lz * l) * r
    let onSomeone = false
    for (let j = 0; j < n && !onSomeone; j++) {
      if (WALKING[j]) continue
      const sx = others[j * 4] - (x + dx), sz = others[j * 4 + 1] - (z + dz)
      onSomeone = sx * sx + sz * sz < C2
    }
    if (onSomeone || (floor && !floor.clear(dx, dz))) continue
    const m = steps2(hx, hz, x + dx, z + dz, others, WALKING, n)
    if (m >= C2) { out.k = 0; out.dx = dx; out.dz = dz; out.near2 = m; return out }
    if (m > best2 + 0.0025) { best2 = m; bdx = dx; bdz = dz; bk = 0 }
  }
  // (none clear: whichever keeps him furthest from them)
  out.k = bk; out.dx = bk ? cx : bdx; out.dz = bk ? cz : bdz; out.near2 = best2
  return out
}
