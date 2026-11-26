import { expect } from 'vitest'
import { feature, scenario } from './bdd'
import { curbStones, groundPlan, type Rect } from '@/game/world/groundLayout'

// (a shop like ours, in the floor's plane: the room, a narrower strip out behind it, a deeper bump out of that, and the genkan's corner
// at the front by the door; the door's apron out before it)
const ROOM: Rect = [-4.47, -4.0, 0.42, 3.72]
const GENKAN: Rect = [0.42, 2.6, 1.66, 3.72]
const SIDE: Rect = [-4.47, -4.0, 1.66, 2.6]
const BACK: Rect = [-4.3, -5.2, 1.5, -4.0]
const BUMP: Rect = [-3.2, -5.7, -1.9, -5.2]
const BUILDING = [ROOM, GENKAN, SIDE, BACK, BUMP]
const W = 0.36
const APRON: Rect = [-0.23, 3.72, 2.31, 4.97]
const inBuilding = (x: number, z: number) => BUILDING.some((r) => x > r[0] && x < r[2] && z > r[1] && z < r[3])
const inRects = (rs: readonly Rect[], x: number, z: number) => rs.some((r) => x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3])
/** points round the building's outline, `d` out from it (the outline walked a centimetre at a time; corners and all) */
function round(d: number) {
  const pts: [number, number][] = []
  for (const r of BUILDING) {
    for (let x = r[0]; x <= r[2]; x += 0.01) pts.push([x, r[1] - d], [x, r[3] + d])
    for (let z = r[1]; z <= r[3]; z += 0.01) pts.push([r[0] - d, z], [r[2] + d, z])
  }
  // (a point on the seam between two of the building's rects is the building's, not out round it)
  return pts.filter(([x, z]) => !inRects(BUILDING, x, z))
}

feature('店外的地面：沿著建築一圈的玉砂利，外緣一排緣石（第 725、726 項）', () => {
  scenario('砂利帶貼著建築一圈，寬度一樣，不鋪進建築裡', ({ given, then, and }) => {
    let plan: ReturnType<typeof groundPlan>
    given('一間有凹凸的店（主廳、後面較窄的一條、倉庫再凸出一塊、玄關那一角）與門前的一片', () => { plan = groundPlan(BUILDING, W, APRON) })
    then('沒有一格砂利在建築裡', () => {
      for (const g of plan.gravel) {
        for (let k = 0; k < 9; k++) {
          const x = g[0] + (g[2] - g[0]) * ((k % 3) + 0.5) / 3, z = g[1] + (g[3] - g[1]) * (Math.floor(k / 3) + 0.5) / 3
          expect(inBuilding(x, z)).toBe(false)
        }
      }
    })
    and('建築外緣一公分外的每一點都鋪著砂利（凹角、凸角都是）', () => {
      for (const [x, z] of round(0.01)) expect(inRects(plan.gravel, x, z)).toBe(true)
    })
    and('離建築比砂利帶寬還遠的地方沒有砂利（門前那片除外）', () => {
      // (how far a point is from the building, square round its corners as the bed is: from the nearest of its rects, the farther of the
      // two ways across)
      const far = (x: number, z: number) => Math.min(...BUILDING.map((r) => Math.max(Math.max(r[0] - x, 0, x - r[2]), Math.max(r[1] - z, 0, z - r[3]))))
      for (const [x, z] of round(W + 0.02)) if (far(x, z) > W + 0.005 && !inRects([APRON], x, z)) expect(inRects(plan.gravel, x, z)).toBe(false)
    })
    and('門前那一片都是砂利', () => {
      for (let x = APRON[0] + 0.01; x < APRON[2]; x += 0.05) for (let z = APRON[1] + 0.01; z < APRON[3]; z += 0.05) expect(inRects(plan.gravel, x, z)).toBe(true)
    })
  })

  scenario('緣石沿著砂利帶外緣排一圈，轉角接好，不重疊', ({ given, then, and }) => {
    const plan = groundPlan(BUILDING, W, APRON)
    const CW = 0.05, JOINT = 0.004
    let stones: ReturnType<typeof curbStones>
    const box = (s: (typeof stones)[number]): Rect => (s.along === 'x' ? [s.x - s.len / 2, s.z - CW / 2, s.x + s.len / 2, s.z + CW / 2] : [s.x - CW / 2, s.z - s.len / 2, s.x + CW / 2, s.z + s.len / 2])
    given('照外緣排緣石（寬 5 公分、一塊約 32 公分、接縫 4 毫米）', () => { stones = curbStones(plan.runs, CW, 0.32, 0.15, JOINT, [], 7) })
    then('任兩塊之間至少留一道接縫（不重疊，也不貼成同一個面），轉角也是', () => {
      const bs = stones.map(box)
      for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
        const a = bs[i], b = bs[j]
        expect(Math.max(b[0] - a[2], a[0] - b[2], b[1] - a[3], a[1] - b[3])).toBeGreaterThan(JOINT - 1e-6)
      }
    })
    and('沒有一塊壓在砂利上或建築上', () => {
      for (const b of stones.map(box)) {
        const cx = (b[0] + b[2]) / 2, cz = (b[1] + b[3]) / 2
        expect(inBuilding(cx, cz)).toBe(false)
        expect(plan.gravel.some((g) => cx > g[0] + 1e-6 && cx < g[2] - 1e-6 && cz > g[1] + 1e-6 && cz < g[3] - 1e-6)).toBe(false)
      }
    })
    and('沿著外緣走一圈，除了接縫，處處都有緣石（轉角也是）', () => {
      const bs = stones.map(box)
      for (const r of plan.runs) {
        const alongX = r.out[0] === 0
        const s0 = (alongX ? r.a[0] : r.a[1]) - (r.convexA ? CW : 0), s1 = (alongX ? r.b[0] : r.b[1]) + (r.convexB ? CW : 0)
        let gap = 0
        for (let s = s0 + 0.0005; s < s1; s += 0.001) {
          const x = alongX ? s : r.a[0] + r.out[0] * CW / 2, z = alongX ? r.a[1] + r.out[1] * CW / 2 : s
          if (inRects(bs, x, z)) gap = 0
          else { gap += 0.001; expect(gap).toBeLessThan(JOINT + 0.0021) }
        }
      }
    })
  })

  scenario('踏石穿過的地方可以留開口', ({ given, then }) => {
    const plan = groundPlan(BUILDING, W, APRON)
    const GAP: Rect = [0.88, 4.9, 1.2, 5.1]
    let stones: ReturnType<typeof curbStones>
    given('門前那排緣石，踏石經過的地方要留空', () => { stones = curbStones(plan.runs, 0.05, 0.32, 0.15, 0.004, [GAP], 7) })
    then('沒有一塊緣石碰到那一段', () => {
      for (const s of stones) {
        const b: Rect = s.along === 'x' ? [s.x - s.len / 2, s.z - 0.025, s.x + s.len / 2, s.z + 0.025] : [s.x - 0.025, s.z - s.len / 2, s.x + 0.025, s.z + s.len / 2]
        expect(b[0] < GAP[2] && b[2] > GAP[0] && b[1] < GAP[3] && b[3] > GAP[1]).toBe(false)
      }
    })
  })
})
