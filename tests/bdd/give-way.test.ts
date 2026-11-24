import { expect } from 'vitest'
import { feature, scenario } from './bdd'
import { GIVE, giveWay, type Floor, type GiveWay } from '@/game/staff/giveWay'

// (him on his way at the origin going +z at a jog, not stepped off it: his left is −x; each one x, z, vx, vz)
const at = (people: number[][], floor: Floor | null = null) =>
  giveWay(0, 0, 0, 1, 1.9, 0, 0, people.flat(), floor, { k: 1, dx: 0, dz: 0, near2: 0 } as GiveWay)

feature('老闆走在路上讓路給走動中的人（第 659 項 d）', () => {
  scenario('有人要從他前面橫過，他停下來等對方過去', ({ when, then, and }) => {
    let r: GiveWay
    when('一個人從他右前方往左橫過他的路', () => { r = at([[0.8, 0.6, -1.5, 0]]) })
    then('他停下來', () => { expect(r.k).toBe(0) })
    and('留在原地，不往旁邊讓', () => { expect([r.dx, r.dz]).toEqual([0, 0]) })
  })
  scenario('橫過的人走的線正好是他現在站的地方，他照走，對方從他背後過', ({ when, then }) => {
    let r: GiveWay
    when('一個人從他右邊往左走，正對著他站的地方', () => { r = at([[1.0, 0, -1.5, 0]]) })
    then('他照自己的速度走', () => { expect(r.k).toBe(1) })
  })
  scenario('橫過的人已經走過去了，他照走', ({ when, then }) => {
    let r: GiveWay
    when('那個人已經在他左前方、還在往左走開', () => { r = at([[-0.8, 0.6, -1.5, 0]]) })
    then('他照自己的速度走', () => { expect(r.k).toBe(1) })
  })
  scenario('迎面走來的人，他停下並往對方不在的那一側讓一步', ({ when, then, and }) => {
    let r: GiveWay
    when('一個人從他正前方稍偏右的地方迎面走來', () => { r = at([[0.15, 1.0, 0, -1.5]]) })
    then('他停下來', () => { expect(r.k).toBe(0) })
    and('往左讓（對方在右邊）', () => { expect(r.dx).toBeLessThan(0) })
    and('讓的距離不超過最遠的那一步', () => { expect(Math.hypot(r.dx, r.dz)).toBeLessThanOrEqual(GIVE.steps[1] + 1e-9) })
    and('讓開以後對方經過時離他至少一個身體寬', () => { expect(Math.sqrt(r.near2)).toBeGreaterThanOrEqual(GIVE.clear) })
  })
  scenario('左邊沒有地方讓時，往右邊讓', ({ when, then }) => {
    let r: GiveWay
    when('一個人正面走來，他左邊是牆', () => { r = at([[0, 1.0, 0, -1.5]], { clear: (dx) => dx >= 0 }) })
    then('他往右讓', () => { expect(r.dx).toBeGreaterThan(0) })
  })
  scenario('從背後追上來、走得比他快的人，他往旁邊讓對方先過', ({ when, then, and }) => {
    let r: GiveWay
    when('一個人在他背後 1.15 m、用比他快的速度同方向走來', () => { r = at([[0, -1.15, 0, 3]]) })
    then('他停下', () => { expect(r.k).toBe(0) })
    and('往旁邊讓一步', () => { expect(Math.abs(r.dx)).toBeGreaterThan(0.2) })
  })
  scenario('前面同方向走得比較慢的人，他放慢跟在後面', ({ when, then }) => {
    let r: GiveWay
    when('前面一公尺有人用他一半的速度往同方向走', () => { r = at([[0.1, 1.0, 0, 0.95]]) })
    then('他放慢，但不停下、不往旁邊讓', () => { expect(r.k).toBeGreaterThan(0); expect(r.k).toBeLessThan(1); expect([r.dx, r.dz]).toEqual([0, 0]) })
  })
  scenario('站著不動、離得遠、已經在他身後走開的人，他都不用讓', ({ then, and }) => {
    then('前面站著不動的人（那是站著的人讓他）', () => { expect(at([[0, 1.0, 0, 0]]).k).toBe(1) })
    and('三公尺外迎面走來的人', () => { expect(at([[0, 4.0, 0, -2]]).k).toBe(1) })
    and('迎面走過去、已經在他身後的人', () => { expect(at([[0.3, -0.3, 0, -1.5]]).k).toBe(1) })
  })
  scenario('讓的時候不會站到別人身上', ({ when, then }) => {
    let r: GiveWay
    when('一個人迎面走來，他左邊站著另一個人', () => { r = at([[0.15, 1.0, 0, -1.5], [-0.55, 0, 0, 0]]) })
    then('他讓到的位置離站著的人至少一個身體寬', () => { expect(Math.hypot(r.dx + 0.55, r.dz)).toBeGreaterThanOrEqual(GIVE.clear) })
  })
})
