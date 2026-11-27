// The stone plinth's face laid as a castle's stone wall (石垣, item 751, the owner's 「地基石階改成像日本古城那樣」 with a picture of Osaka
// castle's walls: stones of all sizes fitted close, the corners' long and short stones crossing, grass and moss in the joints): rough
// courses (布積み) of stones each its own length, roughly dressed and fitted against one another (打込接ぎ: their corners knocked off, small
// stones (間詰石) in the gaps where joints meet), the beds between courses wandering a little, the head joints a little askew and never
// over one another course to course; at each corner turning away (出隅) its corner stones (算木積み): long stones laid their long side on
// one face and their end on the other, the other way about in the next course up, the courses level across the corner. Pure: the shop's 3D
// (guestbar/castleWall) paints it into the plinth's picture.
import type { PlinthPlan } from './groundLayout'

/** how a face ends at a side: at a corner turning away ('convex', its corner stones going round it), at one turning in ('concave', its
 * stones meeting the other face's in a joint), or where the wall stops ('cut', at the door's steps: its last stone going round its end) */
export type WallEnd = 'convex' | 'concave' | 'cut'
/** a face of the wall: a run of the plinth seen from outside, left to right */
export interface WallFace {
  /** the plan's run it is */
  run: number
  len: number
  /** its left end in the floor's plane, and the way along it to its right (a unit vector) */
  from: [number, number]
  along: [number, number]
  left: WallEnd
  right: WallEnd
  /** the corner it shares with the face round its left end, its right end (an index into the corners), -1 for none */
  leftCorner: number
  rightCorner: number
}
/** a corner's stones, course by course from the top: their beds' levels (down from the wall's top, between the courses), how far each
 * course's stone reaches along the face whose right end is there (`a`) and the face whose left end is there (`b`), and its look */
export interface WallCorner { beds: number[]; a: number[]; b: number[]; tones: number[] }
/** a stone's look: its tone (0 to 1, the painter's choice of grey), its own seed; how much is knocked off each of its corners (m: top
 * left, top right, bottom right, bottom left); a corner stone (算木積み) is squarer and finer; a tall stone two courses high is two of
 * these, the same look, its `tall` half the one over ('top') and the one under ('bottom') */
export interface WallStone { tone: number; seed: number; cut: [number, number, number, number]; corner: boolean; tall?: 'top' | 'bottom' }
/** a head joint across a course: where it meets the bed over it (`top`, along the face) and the bed under it (`bot`), those beds' levels
 * there, and how much its slant shortens a distance across it; `tall` a tall stone's side going on down from the joint over it */
export interface WallJoint { top: number; bot: number; yTop: number; yBot: number; cos: number; tall?: boolean }
export interface WallCourse { joints: WallJoint[]; stones: WallStone[] }
export interface WallLayout {
  len: number
  /** its beds, top to bottom: the wall's top (level, 0), the beds between its courses (each a line of points [along, down], along rising),
   * and a level line under its foot */
  beds: [number, number][][]
  courses: WallCourse[]
  /** whether a joint stops it at its left end, its right end (a concave corner) */
  stopLeft: boolean
  stopRight: boolean
  /** the small stones fitted in the gaps where joints meet (間詰石): [along, down, radius] */
  wedges: [number, number, number][]
}

/** a course's height, about: three up the plinth's 28 cm seen */
export const WALL_COURSE = 0.093
/** no stone shorter along its course than this (a sliver), save the whole of a face too short for more */
export const WALL_SHORTEST = 0.07
/** how close a head joint may come to one in the course over it */
export const WALL_STAGGER = 0.045

function chances(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** the plinth's faces from its plan: each run's face, its ends seen from outside, and the corners two faces share (a convex end with no
 * face round it taken as the wall's end) */
export function wallFaces(plan: PlinthPlan): { faces: WallFace[]; corners: number } {
  const end = (convex: boolean, cut: boolean): WallEnd => (cut ? 'cut' : convex ? 'convex' : 'concave')
  const faces = plan.runs.map((r, run): WallFace => {
    const along: [number, number] = [r.out[1], -r.out[0]]
    const da = along[0] * r.a[0] + along[1] * r.a[1], db = along[0] * r.b[0] + along[1] * r.b[1]
    const aFirst = da <= db
    return {
      run, len: Math.abs(db - da), along,
      from: aFirst ? [r.a[0], r.a[1]] : [r.b[0], r.b[1]],
      left: aFirst ? end(r.convexA, r.cutA) : end(r.convexB, r.cutB),
      right: aFirst ? end(r.convexB, r.cutB) : end(r.convexA, r.cutA),
      leftCorner: -1, rightCorner: -1,
    }
  })
  let corners = 0
  for (const f of faces) {
    if (f.right !== 'convex') continue
    const x = f.from[0] + f.along[0] * f.len, z = f.from[1] + f.along[1] * f.len
    const g = faces.find((q) => q !== f && q.left === 'convex' && q.leftCorner < 0 && Math.abs(q.from[0] - x) < 1e-4 && Math.abs(q.from[1] - z) < 1e-4)
    if (g) { f.rightCorner = corners; g.leftCorner = corners; corners++ } else f.right = 'cut'
  }
  for (const f of faces) if (f.left === 'convex' && f.leftCorner < 0) f.left = 'cut'
  return { faces, corners }
}

/** how many courses a face `visible` high (to the earth) is laid in */
export const wallCourses = (visible: number) => Math.max(2, Math.round(visible / WALL_COURSE))

/** a corner's stones: its beds a little off the even levels; its stones long (22 to 32 cm) one way and short (9 to 13 cm) the other,
 * crossing course by course */
export function wallCorner(seed: number, visible: number): WallCorner {
  const rnd = chances(seed)
  const n = wallCourses(visible)
  const beds = Array.from({ length: n - 1 }, (_, k) => (visible * (k + 1)) / n + (rnd() - 0.5) * 0.016)
  const longA = rnd() < 0.5
  const a: number[] = [], b: number[] = [], tones: number[] = []
  for (let k = 0; k < n; k++) {
    const long = 0.22 + rnd() * 0.1, short = 0.09 + rnd() * 0.04
    const aLong = (k % 2 === 0) === longA
    a.push(aLong ? long : short)
    b.push(aLong ? short : long)
    tones.push(rnd())
  }
  return { beds, a, b, tones }
}

/** a point on a bed at `s` along it (its points' line) */
export function bedAt(bed: readonly [number, number][], s: number) {
  if (s <= bed[0][0]) return bed[0][1]
  const last = bed.length - 1
  if (s >= bed[last][0]) return bed[last][1]
  let lo = 0, hi = last
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1
    if (bed[m][0] <= s) lo = m
    else hi = m
  }
  const [s0, y0] = bed[lo], [s1, y1] = bed[hi]
  return s1 > s0 ? y0 + ((y1 - y0) * (s - s0)) / (s1 - s0) : y0
}

/**
 * A face laid: its courses (as many as wallCourses), each from its corner stones (where it has a corner) and wall stones between them
 * of their own lengths (most 10 to 32 cm, one in ten a big one to 42 cm; none a sliver: the last one takes what's left), its head joints
 * askew by up to 2.2 cm and kept off those of the course over it; its beds from the corners' levels at its ends, wandering a little between
 * (level under and over a corner stone), each a point at every joint meeting it; small stones in some of the gaps.
 */
export function layWall(f: WallFace, corners: readonly WallCorner[], height: number, visible: number, seed: number): WallLayout {
  const rnd = chances(seed * 7919 + f.run * 104729 + 17)
  const n = wallCourses(visible), L = f.len
  const cl = f.leftCorner >= 0 ? corners[f.leftCorner] : null, cr = f.rightCorner >= 0 ? corners[f.rightCorner] : null
  const own = () => Array.from({ length: n - 1 }, (_, k) => (visible * (k + 1)) / n + (rnd() - 0.5) * 0.014)
  const lv0 = cl ? cl.beds : own(), lv1 = cr ? cr.beds : own()
  // (each course's corner stones' reach along this face: this face is its left corner's b and its right corner's a. A corner stone with
  // no room left for a stone beside it takes the face to its end; two with no room between them meet in a joint, sharing the face)
  const reachL: number[] = [], reachR: number[] = []
  for (let k = 0; k < n; k++) {
    let l = cl ? cl.b[k] : 0, r = cr ? cr.a[k] : 0
    if (L - l - r < WALL_SHORTEST) {
      if (cl && cr) { const t = (L * l) / (l + r); l = t; r = L - t }
      else if (cl) l = L
      else if (cr) r = L
    }
    reachL.push(l)
    reachR.push(r)
  }
  // (the beds' levels along the face: from one end's to the other's, wandering a centimetre or so between, not at the ends)
  const waves = Array.from({ length: n - 1 }, () => [0.9 + rnd() * 0.8, rnd() * Math.PI * 2, rnd() * Math.PI * 2])
  const levelAt = (k: number, s: number) => {
    const t = L > 0 ? s / L : 0, [p, ph, ps] = waves[k]
    const taper = Math.min(1, s / 0.35, (L - s) / 0.35)
    return lv0[k] + (lv1[k] - lv0[k]) * t + taper * (0.008 * Math.sin((2 * Math.PI * s) / p + ph) + 0.004 * Math.sin((2 * Math.PI * s) / (p * 0.37) + ps))
  }
  // (the courses' head joints, top course first: the corner stones' ends square, the rest askew and off the course over's, and off the
  // corner stones' ends in the course under (laid already, as it were: they're the corners'); and a few tall stones, two courses high (the
  // castle's big stones among the rest): one in six or so, none at a corner, none near another, their sides going on down into the next
  // course with room there for a stone either side)
  const tops: { top: number; bot: number; tall?: boolean }[][] = []
  /** each course's tall stones: [their stone's index, their foot's span along the bed under (from, to), their sides' slant on down] */
  const downs: [number, number, number, number, number][][] = []
  const cornerEnds = (k: number) => [...(cl && reachL[k] > 0 && reachL[k] < L ? [reachL[k]] : []), ...(cr && reachR[k] > 0 && reachR[k] < L ? [L - reachR[k]] : [])]
  for (let k = 0; k < n; k++) {
    const js: { top: number; bot: number; tall?: boolean }[] = []
    const avoid = [...(k > 0 ? tops[k - 1].map((j) => j.bot) : []), ...(k < n - 1 ? cornerEnds(k + 1) : [])]
    const clear = (x: number) => !avoid.some((a) => Math.abs(a - x) < WALL_STAGGER)
    const start = reachL[k], end = L - reachR[k]
    if (cl && start > 0 && start < L - 1e-6) js.push({ top: start, bot: start })
    // (laid in the spans between the corner stones and the feet of the tall stones from the course over)
    const over = k > 0 ? downs[k - 1] : []
    const spans: [number, number][] = []
    let from = start
    for (const d of over) { spans.push([from, d[1]]); from = d[2] }
    spans.push([from, end])
    spans.forEach(([a, b], si) => {
      let s = a
      for (;;) {
        let len = 0.1 + Math.pow(rnd(), 1.3) * 0.22
        if (rnd() < 0.1) len = 0.3 + rnd() * 0.12
        let next = s + len
        if (b - next < WALL_SHORTEST) break
        if (!clear(next)) {
          // (moved to the nearest place clear of them, half a centimetre at a time, neither stone either side of it a sliver nor this one
          // longer by more than 25 cm; failing that, the clearest)
          let best = NaN, near = Infinity, clearest = next, most = -1
          for (let x = s + WALL_SHORTEST; x <= Math.min(b - WALL_SHORTEST, next + 0.25) + 1e-9; x += 0.005) {
            const m = avoid.reduce((lo, q) => Math.min(lo, Math.abs(q - x)), Infinity)
            if (m >= WALL_STAGGER && Math.abs(x - next) < near) { near = Math.abs(x - next); best = x }
            if (m > most) { most = m; clearest = x }
          }
          next = Number.isNaN(best) ? clearest : best
        }
        const prevBot = js.length ? js[js.length - 1].bot : a
        const slant = Math.max(prevBot + 0.04 - next, Math.min(b - 0.04 - next, (rnd() - 0.5) * 0.044))
        js.push({ top: next, bot: next + slant })
        s = next
      }
      if (si < over.length) {
        const [, x0, x1, sl0, sl1] = over[si]
        js.push({ top: x0, bot: x0 + sl0, tall: true }, { top: x1, bot: x1 + sl1, tall: true })
      }
    })
    if (cr && end > 1e-6 && end < L - 1e-6 && (!js.length || end - js[js.length - 1].top > 1e-6)) js.push({ top: end, bot: end })
    tops.push(js)
    const down: [number, number, number, number, number][] = []
    if (k < n - 1) {
      const a = reachL[k + 1], b = L - reachR[k + 1]
      for (let i = 0; i + 1 < js.length; i++) {
        const l = js[i], r = js[i + 1], x0 = l.bot, x1 = r.bot
        if (l.tall || r.tall || x1 - x0 < 0.12 || x1 - x0 > 0.36) continue
        if (x0 - a < WALL_SHORTEST || b - x1 < WALL_SHORTEST) continue
        if (down.length && x0 - down[down.length - 1][2] < 0.35) continue
        if (rnd() < 0.17) down.push([i + 1, x0, x1, (l.bot - l.top) * 0.9, (r.bot - r.top) * 0.9])
      }
    }
    downs.push(down)
  }
  // (the beds between the courses: a point wherever a joint meets one, its level the corner's under and over a corner stone)
  const beds: [number, number][][] = [[[0, 0], [L, 0]]]
  for (let k = 1; k < n; k++) {
    const flatL = cl ? Math.max(reachL[k - 1], reachL[k]) : -1, flatR = cr ? L - Math.max(reachR[k - 1], reachR[k]) : L + 1
    const at = [0, L, ...tops[k - 1].map((j) => j.bot), ...tops[k].map((j) => j.top)].sort((p, q) => p - q)
    const pts: [number, number][] = []
    for (const s of at) {
      if (pts.length && s - pts[pts.length - 1][0] < 0.003) continue
      const y = s <= flatL + 1e-6 ? lv0[k - 1] : s >= flatR - 1e-6 ? lv1[k - 1] : levelAt(k - 1, s) + (rnd() - 0.5) * 0.016
      pts.push([s, y])
    }
    beds.push(pts)
  }
  beds.push([[0, height + 0.02], [L, height + 0.02]])
  // (each course's joints with their beds' levels where they meet them, and its stones)
  const courses: WallCourse[] = []
  tops.forEach((js, k) => {
    const joints: WallJoint[] = js.map(({ top, bot, tall }) => {
      const yTop = bedAt(beds[k], top), yBot = bedAt(beds[k + 1], bot)
      const slope = (bot - top) / Math.max(1e-6, yBot - yTop)
      return { top, bot, yTop, yBot, cos: 1 / Math.hypot(1, slope), ...(tall ? { tall } : {}) }
    })
    const stones: WallStone[] = []
    const tallTops = new Set(downs[k].map((d) => d[0]))
    for (let i = 0; i <= joints.length; i++) {
      const cornerL = !!cl && i === 0 && reachL[k] > 0, cornerR = !!cr && i === joints.length && reachR[k] > 0
      const chip = () => (rnd() < 0.35 ? 0 : 0.004 + rnd() * 0.014)
      const fine = () => rnd() * 0.005
      // (a corner stone's corners on the corner's side aren't corners at all: it goes on round it)
      const cut: [number, number, number, number] = cornerL ? [0, fine(), fine(), 0] : cornerR ? [fine(), 0, 0, fine()] : [chip(), chip(), chip(), chip()]
      const tone = cornerL ? cl!.tones[k] : cornerR ? cr!.tones[k] : rnd()
      const st: WallStone = { tone, seed: Math.floor(rnd() * 1e9), cut, corner: cornerL || cornerR }
      // (a tall stone's upper half: no corners at its foot, it goes on down)
      if (tallTops.has(i)) { st.tall = 'top'; st.cut = [cut[0], cut[1], 0, 0] }
      stones.push(st)
    }
    // (each tall stone's lower half in this course: the stone between its two sides, the same look as its upper half, no corners at its top)
    if (k > 0) {
      for (const [ui, x0] of downs[k - 1]) {
        const q = joints.findIndex((j) => j.tall && Math.abs(j.top - x0) < 1e-9)
        if (q < 0) continue
        const upper = courses[k - 1].stones[ui], own = stones[q + 1]
        stones[q + 1] = { tone: upper.tone, seed: upper.seed, cut: [0, 0, own.cut[2], own.cut[3]], corner: false, tall: 'bottom' }
      }
    }
    courses.push({ joints, stones })
  })
  // (small stones in the gaps where a joint meets a bed between two knocked-off corners, about half of those big enough)
  const wedges: [number, number, number][] = []
  courses.forEach((c, k) => c.joints.forEach((j, i) => {
    const l = c.stones[i], r = c.stones[i + 1]
    if (j.tall) return
    if (k > 0) {
      const g = Math.max(l.cut[1], r.cut[0])
      if (g > 0.009 && rnd() < 0.5) wedges.push([j.top, j.yTop + g * 0.3, g * 0.42 + 0.002])
    }
    if (k < n - 1) {
      const g = Math.max(l.cut[2], r.cut[3])
      if (g > 0.009 && rnd() < 0.5) wedges.push([j.bot, j.yBot - g * 0.3, g * 0.42 + 0.002])
    }
  }))
  wedges.sort((p, q) => p[0] - q[0])
  return { len: L, beds, courses, stopLeft: f.left === 'concave', stopRight: f.right === 'concave', wedges }
}

/** the whole plinth laid: its faces, its corners' stones, each face's layout (the same every time for the same plan) */
export function wallPlan(plan: PlinthPlan, height: number, visible: number, seed = 751) {
  const { faces, corners } = wallFaces(plan)
  const cs = Array.from({ length: corners }, (_, i) => wallCorner(seed * 31 + i * 977 + 5, visible))
  return { faces, corners: cs, layouts: faces.map((f) => layWall(f, cs, height, visible, seed)) }
}

/** where a head joint is along the face at the height `y` */
const jointAt = (j: WallJoint, y: number) => j.top + ((j.bot - j.top) * (y - j.yTop)) / Math.max(1e-6, j.yBot - j.yTop)
/** where a point of a face falls: its course and stone, and how far in it is from that stone's edges (m: left, right, top, bottom;
 * Infinity where it has none: the wall's top, under the earth, round a corner or the wall's end) */
export interface WallSample { course: number; stone: number; dl: number; dr: number; dt: number; db: number }
/** the point `s` along the face, `y` down from its top: `beds` its beds' levels at `s` (bedAt for each, top to bottom), handed in so a
 * painter going down a column works them out once */
export function wallAt(w: WallLayout, s: number, y: number, beds: readonly number[], out: WallSample): WallSample {
  const n = w.courses.length
  let k = 0
  while (k < n - 1 && y >= beds[k + 1]) k++
  const js = w.courses[k].joints
  // (the joints left of the point at its height: the first whose line at that height is past it)
  let lo = 0, hi = js.length
  while (lo < hi) {
    const m = (lo + hi) >> 1
    if (jointAt(js[m], y) <= s) lo = m + 1
    else hi = m
  }
  const i = lo
  out.course = k
  out.stone = i
  out.dl = i > 0 ? (s - jointAt(js[i - 1], y)) * js[i - 1].cos : w.stopLeft ? s : Infinity
  out.dr = i < js.length ? (jointAt(js[i], y) - s) * js[i].cos : w.stopRight ? w.len - s : Infinity
  // (a tall stone's halves: its top the course over's top, its foot the course under's foot)
  const tall = w.courses[k].stones[i].tall
  out.dt = tall === 'bottom' ? (k > 1 ? y - beds[k - 1] : Infinity) : k > 0 ? y - beds[k] : Infinity
  out.db = tall === 'top' ? (k + 1 < n - 1 ? beds[k + 2] - y : Infinity) : k < n - 1 ? beds[k + 1] - y : Infinity
  return out
}
