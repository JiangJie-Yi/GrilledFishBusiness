import { expect } from 'vitest'
import { feature, scenario } from './bdd'
import { plinthPlan, type Rect } from '@/game/world/groundLayout'
import { WALL_SHORTEST, WALL_STAGGER, bedAt, wallAt, wallPlan, type WallLayout, type WallSample } from '@/game/world/stoneWall'

// (a shop like ours (tests/bdd/ground's): the room, a strip out behind it, a bump out of that, the genkan's corner by the door, and the
// stone steps cutting the plinth there; its face 0.294 from its top to its foot, 0.279 of it over the earth)
const ROOM: Rect = [-4.47, -4.0, 0.42, 3.72]
const GENKAN: Rect = [0.42, 2.6, 1.66, 3.72]
const SIDE: Rect = [-4.47, -4.0, 1.66, 2.6]
const BACK: Rect = [-4.3, -5.2, 1.5, -4.0]
const BUMP: Rect = [-3.2, -5.7, -1.9, -5.2]
const BUILDING = [ROOM, GENKAN, SIDE, BACK, BUMP]
const STEPS: Rect = [GENKAN[0], GENKAN[3] - 0.05, GENKAN[2], GENKAN[3] + 0.35]
const HEIGHT = 0.294, SEEN = 0.279
const plan = () => wallPlan(plinthPlan(BUILDING, 0.018, [STEPS]), HEIGHT, SEEN)
/** each course's stones' extents along the face at the course's middle height: [from, to] */
function stonesOf(w: WallLayout) {
  return w.courses.map((c, k) => {
    const out: [number, number][] = []
    for (let i = 0; i <= c.joints.length; i++) {
      const at = (j: number) => (j < 0 ? 0 : j >= c.joints.length ? w.len : (c.joints[j].top + c.joints[j].bot) / 2)
      out.push([at(i - 1), at(i)])
    }
    return { k, out }
  })
}

feature('石台像日本古城的石垣（第 751 項）', () => {
  scenario('出隅的轉角石長短交錯（算木積）', ({ given, then, and }) => {
    let p: ReturnType<typeof plan>
    given('一間有凹凸的店的石台', () => { p = plan() })
    then('每個出隅的每一層，一面是長邊、另一面是短邊，往上一層換邊', () => {
      expect(p.corners.length).toBeGreaterThanOrEqual(5)
      for (const c of p.corners) {
        for (let k = 0; k < c.a.length; k++) {
          const [l, s] = c.a[k] > c.b[k] ? [c.a[k], c.b[k]] : [c.b[k], c.a[k]]
          expect(l).toBeGreaterThan(s * 1.6)
          if (k > 0) expect(c.a[k] > c.b[k]).not.toBe(c.a[k - 1] > c.b[k - 1])
        }
      }
    })
    and('轉角兩面的石層一樣高：兩面在轉角那一點的層線同一個高度', () => {
      for (const f of p.faces) {
        const w = p.layouts[f.run]
        for (let b = 1; b < w.beds.length - 1; b++) {
          if (f.leftCorner >= 0) expect(bedAt(w.beds[b], 0)).toBeCloseTo(p.corners[f.leftCorner].beds[b - 1], 9)
          if (f.rightCorner >= 0) expect(bedAt(w.beds[b], w.len)).toBeCloseTo(p.corners[f.rightCorner].beds[b - 1], 9)
        }
      }
    })
    and('轉角石是方整的：它的上下層線在它那一段是水平的', () => {
      for (const f of p.faces) {
        const w = p.layouts[f.run]
        if (f.leftCorner < 0) continue
        for (let k = 0; k < w.courses.length; k++) {
          const c = w.courses[k], reach = c.joints.length ? c.joints[0].top : w.len
          for (const b of [k, k + 1]) {
            if (b === 0 || b === w.beds.length - 1) continue
            expect(Math.abs(bedAt(w.beds[b], reach * 0.5) - bedAt(w.beds[b], 0))).toBeLessThan(1e-9)
          }
        }
      }
    })
  })

  scenario('石頭大小不一，但沒有細條，上下層的豎縫錯開', ({ given, then, and }) => {
    let p: ReturnType<typeof plan>
    given('同一間店的石台', () => { p = plan() })
    then('長一點的面上，每塊牆石（不算轉角石）至少 7 公分長，長短不一', () => {
      const lens: number[] = []
      for (const f of p.faces) {
        if (f.len < 1) continue
        for (const { k, out } of stonesOf(p.layouts[f.run])) {
          out.forEach(([a, b], i) => {
            if (p.layouts[f.run].courses[k].stones[i].corner) return
            expect(b - a).toBeGreaterThan(WALL_SHORTEST - 0.03)
            lens.push(b - a)
          })
        }
      }
      expect(Math.max(...lens) - Math.min(...lens)).toBeGreaterThan(0.2)
    })
    and('每一條豎縫離上一層的豎縫都超過 4.5 公分', () => {
      for (const w of p.layouts) {
        for (let k = 1; k < w.courses.length; k++) {
          for (const j of w.courses[k].joints) {
            // (a tall stone's sides go on straight down from the joints over it: they're one stone's)
            if (j.tall) continue
            for (const o of w.courses[k - 1].joints) expect(Math.abs(j.top - o.bot)).toBeGreaterThan(WALL_STAGGER - 1e-6)
          }
        }
      }
    })
    and('每一面看得到的高度裡有三層', () => {
      for (const w of p.layouts) expect(w.courses.length).toBe(3)
    })
    and('有幾塊跨兩層的大石：上半與下半在相鄰兩層、同一個樣子、同一個左右', () => {
      let tall = 0
      for (const w of p.layouts) {
        w.courses.forEach((c, k) => c.stones.forEach((st, i) => {
          if (st.tall !== 'top') return
          tall++
          const under = w.courses[k + 1].stones.find((q) => q.tall === 'bottom' && q.seed === st.seed)
          expect(under).toBeDefined()
          const j = w.courses[k + 1].stones.indexOf(under!)
          expect(Math.abs(w.courses[k + 1].joints[j - 1].top - c.joints[i - 1].bot)).toBeLessThan(1e-9)
          expect(Math.abs(w.courses[k + 1].joints[j].top - c.joints[i].bot)).toBeLessThan(1e-9)
        }))
      }
      expect(tall).toBeGreaterThan(5)
    })
  })

  scenario('面上每一點都落在一塊石頭上，石頭之間沒有交錯', ({ given, then }) => {
    let p: ReturnType<typeof plan>
    given('同一間店的石台', () => { p = plan() })
    then('沿著每一面每隔 1 公分、每層高度取點，都在那一層、那一塊石頭的四邊之內', () => {
      const at: WallSample = { course: 0, stone: 0, dl: 0, dr: 0, dt: 0, db: 0 }
      for (const w of p.layouts) {
        for (let s = 0.005; s < w.len; s += 0.01) {
          const beds = w.beds.map((b) => bedAt(b, s))
          for (let y = 0.003; y < HEIGHT; y += 0.01) {
            wallAt(w, s, y, beds, at)
            for (const d of [at.dl, at.dr, at.dt, at.db]) expect(d).toBeGreaterThanOrEqual(-1e-9)
            expect(at.stone).toBeLessThanOrEqual(w.courses[at.course].joints.length)
          }
        }
      }
    })
  })

  scenario('同一個石台每次排出來都一樣', ({ given, then }) => {
    let a: ReturnType<typeof plan>, b: ReturnType<typeof plan>
    given('同一間店的石台排兩次', () => { a = plan(); b = plan() })
    then('兩次一模一樣', () => { expect(JSON.stringify(a.layouts)).toBe(JSON.stringify(b.layouts)) })
  })
})
