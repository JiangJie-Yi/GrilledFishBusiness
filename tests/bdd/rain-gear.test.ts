import { expect } from 'vitest'
import { feature, scenario } from './bdd'
import {
  COAT_COLOURS, COAT_OFF_S, COAT_ON_S, STAND_SLOTS, UMB_COLOURS, UMB_IN_S, coatOf, coatOffBeat, coatOnBeat, freeSlot, gearOf, newCoatPose,
  newUmbPose, umbInBeat, umbOutBeat, umbOutS, umbrellaOf, UMB_DOOR_S, UMB_TAKE_S,
} from '@/game/guests/rainGear'

const ids = Array.from({ length: 400 }, (_, i) => i + 1)

feature('客人的傘與雨衣（第 623 項第三段）', () => {
  scenario('下雨時進門的客人帶傘或穿雨衣；提公事包的不穿雨衣', ({ then, and }) => {
    then('不下雨就什麼都沒有', () => { for (const id of ids) expect(gearOf(id, 0, false)).toBe(null) })
    and('下雨時傘最多，雨衣其次，也有什麼都沒帶的', () => {
      const g = ids.map((id) => gearOf(id, 1, false))
      const n = (k: string | null) => g.filter((x) => x === k).length
      expect(n('umbrella')).toBeGreaterThan(n('coat'))
      expect(n('coat')).toBeGreaterThan(0)
      expect(n(null)).toBeGreaterThan(0)
    })
    and('提公事包的人改帶傘', () => { for (const id of ids) expect(gearOf(id, 1, true)).not.toBe('coat') })
  })

  scenario('每個人的傘色、雨衣色固定；小朋友穿黃色雨衣', ({ then, and }) => {
    then('同一位客人每次一樣，五種傘色都有人用', () => {
      expect(umbrellaOf(77)).toBe(umbrellaOf(77))
      const seen = new Set(ids.map((id) => umbrellaOf(id)))
      expect(seen.size).toBe(UMB_COLOURS.length)
    })
    and('小朋友一律黃色，大人不穿黃色', () => {
      const yellow = COAT_COLOURS.findIndex((c) => c.name === 'yellow')
      for (const id of ids) {
        expect(coatOf(id, true)).toBe(yellow)
        expect(coatOf(id, false)).not.toBe(yellow)
      }
    })
  })

  scenario('傘架從第一格放起，拿走就空出來，滿了沒有位置', ({ then, and }) => {
    then('空的傘架放第一格', () => { expect(freeSlot(new Array(STAND_SLOTS).fill(false))).toBe(0) })
    and('前兩格有傘就放第三格', () => { expect(freeSlot([true, true, false, false])).toBe(2) })
    and('中間有人拿走，空出的那格先用', () => { expect(freeSlot([true, false, true])).toBe(1) })
    and('全滿沒有位置', () => { expect(freeSlot(new Array(STAND_SLOTS).fill(true))).toBe(-1) })
  })

  scenario('進門收傘：撐著傘到門口，收起、倒過來甩兩下；進門後在鞋櫃旁的傘架放好，再轉回來', ({ given, then, and }) => {
    given('一個姿勢', (w) => { w.p = newUmbPose() })
    then('剛到門口時傘是撐開的', (w) => { umbInBeat(0.2, w.p); expect(w.p.open).toBe(1); expect(w.p.flip).toBe(0); expect(w.p.inStand).toBe(false) })
    and('收傘的時候還沒放進傘架', (w) => { umbInBeat(1.0, w.p); expect(w.p.open).toBeLessThan(1); expect(w.p.inStand).toBe(false) })
    and('在門外的時間結束時傘已經收好、倒過來，手還沒伸出去：拿著走進門', (w) => {
      umbInBeat(UMB_DOOR_S, w.p)
      expect(w.p.open).toBe(0)
      expect(w.p.flip).toBe(1)
      expect(w.p.shake).toBe(0)
      expect(w.p.reach).toBe(0)
      expect(w.p.turn).toBe(0)
      expect(w.p.inStand).toBe(false)
    })
    and('伸手到傘架時傘已經收好、倒過來', (w) => {
      umbInBeat(UMB_IN_S - 0.6, w.p)
      expect(w.p.open).toBe(0)
      expect(w.p.flip).toBe(1)
      expect(w.p.reach).toBeGreaterThan(0.5)
      expect(w.p.turn).toBeGreaterThan(0.5)
    })
    and('最後傘在傘架裡，手和身體都轉回來', (w) => {
      umbInBeat(UMB_IN_S, w.p)
      expect(w.p.inStand).toBe(true)
      expect(w.p.reach).toBe(0)
      expect(w.p.turn).toBe(0)
    })
  })

  scenario('出門拿傘：在門內的傘架拿起來，拿著走出門；下雨到門外才撐開，沒下雨就拿著', ({ given, then, and }) => {
    given('一個姿勢', (w) => { w.p = newUmbPose() })
    then('一開始傘還在傘架裡', (w) => { umbOutBeat(0, true, w.p); expect(w.p.inStand).toBe(true) })
    and('拿到手以後先往上提出傘架', (w) => { umbOutBeat(0.7, true, w.p); expect(w.p.inStand).toBe(false); expect(w.p.lift).toBeGreaterThan(0.5) })
    and('在傘架旁的時間結束時傘收著、傘頭朝下，人轉回門口', (w) => {
      umbOutBeat(UMB_TAKE_S, true, w.p)
      expect(w.p.open).toBe(0)
      expect(w.p.flip).toBe(1)
      expect(w.p.turn).toBe(0)
      expect(w.p.reach).toBe(0)
      expect(w.p.inStand).toBe(false)
    })
    and('下雨：最後撐開、傘頭朝上', (w) => { umbOutBeat(umbOutS(true), true, w.p); expect(w.p.open).toBe(1); expect(w.p.flip).toBe(0); expect(w.p.turn).toBe(0) })
    and('沒下雨：收著拿在手上，傘頭朝下，也比較快', (w) => {
      umbOutBeat(umbOutS(false), false, w.p)
      expect(w.p.open).toBe(0)
      expect(w.p.flip).toBe(1)
      expect(umbOutS(false)).toBeLessThan(umbOutS(true))
    })
  })

  scenario('在玄關脫雨衣、摺好拿在手上；出門前再穿回去', ({ given, then, and }) => {
    given('一個姿勢', (w) => { w.p = newCoatPose() })
    then('脫：一開始還穿著', (w) => { coatOffBeat(0, w.p); expect(w.p.worn).toBe(true); expect(w.p.bundle).toBe(0) })
    and('脫：中途脫下來，手往兩邊', (w) => { coatOffBeat(0.47, w.p); expect(w.p.worn).toBe(false); expect(w.p.spread).toBeGreaterThan(0.5) })
    and('脫：最後摺好拿在左手', (w) => { coatOffBeat(COAT_OFF_S, w.p); expect(w.p.bundle).toBe(2); expect(w.p.fold).toBe(0) })
    and('穿：一開始拿在手上，最後穿好、手上沒東西', (w) => {
      coatOnBeat(0, w.p)
      expect(w.p.worn).toBe(false)
      expect(w.p.bundle).toBe(2)
      coatOnBeat(COAT_ON_S, w.p)
      expect(w.p.worn).toBe(true)
      expect(w.p.bundle).toBe(0)
    })
  })
})
