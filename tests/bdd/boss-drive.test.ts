import { expect } from 'vitest'
import { feature, scenario } from './bdd'
import { DRIVE, canJump, driveStep, noKeys, slide } from '@/game/staff/bossDrive'

const keys = (s: string) => ({ w: s.includes('w'), a: s.includes('a'), s: s.includes('s'), d: s.includes('d') })

feature('老闆的第一人稱：WASD 走動、空白鍵跳（第 748 項）', () => {
  scenario('W 朝面向往前走，S 往後退', ({ given, when, then, and }) => {
    let r: ReturnType<typeof driveStep>
    given('老闆面向 +z', () => {})
    when('按住 W 一秒', () => { r = driveStep(keys('w'), 0, 1) })
    then('往前走了一步的距離', () => { expect(r.dz).toBeCloseTo(DRIVE.walk); expect(r.dx).toBeCloseTo(0) })
    and('按住 S 一秒是往後退，比往前慢', () => { const b = driveStep(keys('s'), 0, 1); expect(b.dz).toBeCloseTo(-DRIVE.back); expect(DRIVE.back).toBeLessThan(DRIVE.walk) })
  })

  scenario('A 往左轉、D 往右轉，走的方向跟著轉', ({ then, and }) => {
    then('按 A 面向往 +x 轉', () => { expect(driveStep(keys('a'), 0, 0.1).yaw).toBeGreaterThan(0) })
    and('按 D 往反方向轉', () => { expect(driveStep(keys('d'), 0, 0.1).yaw).toBeLessThan(0) })
    and('轉了 90 度再按 W，往 +x 走', () => { const r = driveStep(keys('w'), Math.PI / 2, 1); expect(r.dx).toBeCloseTo(DRIVE.walk); expect(r.dz).toBeCloseTo(0) })
    and('沒按鍵就不動', () => { const r = driveStep(keys(''), 0.3, 1); expect(r.dx).toBe(0); expect(r.dz).toBe(0); expect(r.yaw).toBe(0.3); expect(noKeys(keys(''))).toBe(true) })
  })

  scenario('撞到不能站的地方：沿著牆滑過去，正面撞上就停', ({ given, then, and }) => {
    // (a wall along x = 1: he may stand only where x < 1)
    const ok = (x: number) => x < 1
    given('一面牆在 x = 1', () => {})
    then('斜著走向牆，沿牆滑（z 照走，x 不過去）', () => { expect(slide(0.95, 0, 0.1, 0.1, ok)).toEqual([0.95, 0.1]) })
    and('正面撞上，停在原地', () => { expect(slide(0.95, 0, 0.1, 0, ok)).toEqual([0.95, 0]) })
    and('沒碰到牆就整步走', () => { expect(slide(0, 0, 0.1, 0.1, ok)).toEqual([0.1, 0.1]) })
  })

  scenario('空白鍵跳：站在地上才跳得起來', ({ then, and }) => {
    then('站在地上可以跳', () => { expect(canJump(0, 0, 0)).toBe(true) })
    and('還在空中不能再跳', () => { expect(canJump(0.2, 0, 1.1)).toBe(false); expect(canJump(0.1, 0, -0.5)).toBe(false) })
  })
})
