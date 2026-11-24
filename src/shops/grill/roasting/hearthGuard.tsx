import { useEffect, useRef } from 'react'
import { BOSS_BED } from '@/shops/grill/bar'
import { useThree } from '@react-three/fiber'
import { keepOut, nearTable, type HearthRole } from '@/game/hearthGuard'
import * as THREE from 'three'
import { FIGURES, CARRIED, ALONG, LAY } from '@/shops/grill/bar'
import { HEARTH_ZONES } from './kitchen'

const GUARD_AT = new THREE.Vector3(), GUARD_LOCAL = new THREE.Vector3(), GUARD_INV = new THREE.Matrix4(), GUARD_SHIFT = new THREE.Vector3(), GUARD_HELD = new THREE.Vector3()
/** (the shop's floor map's squares asked from a spare: item 659) */
export const WALK_IJ = new THREE.Vector3()
/**
 * (item 659, the Tester window's: on his way home from where he's been put down, the owner went right through the server stood at their post
 * inside the gate by the till, 7 runs in 9, and a cook at his station: the ways there too narrow to go round them) Those standing in his way
 * stand aside for him, as in a real kitchen: one standing still (a quarter of a second, not moving on their own) on clear floor (not sat at
 * a counter) nearer his way (BOSS_BED.wayW) than AWAY_CLEAR, up to AWAY_AHEAD along it ahead of him, steps off it to the nearest place a body
 * turned sideways stands clear (AWAY_HALF each way, on the shop's floor map) AWAY_OFF from it, their own side first, at a quick step (the
 * place found once), and back once he's AWAY_PAST them along it. Only as they're drawn, as the table's guard puts them out of it (their own
 * place as it was): just before it, each frame he's walking home, and while any of them is still to step back. The world's measure; all from
 * spares but the nook's search (once a step)
 */
const AWAY_CLEAR = 0.5, AWAY_OFF = 0.45, AWAY_HALF = 0.14, AWAY_AHEAD = 2.4, AWAY_PAST = 0.35, AWAY_SPEED = 2.2, AWAY_STILL = 0.25, AWAY_REACH = 1.2
type Away = { off: THREE.Vector3; offL: THREE.Vector3; drawn: THREE.Vector3; last: THREE.Vector3; still: number; to: THREE.Vector3 | null; at: number
  /** (in development: how far they went on their own this frame, and how far the step aside moved them) */
  own?: number; aside?: number }
const AWAYS = new Map<THREE.Object3D, Away>()
if (import.meta.env.DEV && typeof window !== 'undefined') Object.assign(window, { __aways: AWAYS })
const AWAY_BOSS = new THREE.Vector3(), AWAY_W = new THREE.Vector3(), AWAY_TO = new THREE.Vector3(), AWAY_TRY = new THREE.Vector3(), AWAY_WANT = new THREE.Vector3()
const AWAY_CLOCK = { at: 0 }
/** where a point is along a way (its length from the start to the nearest point of it) and how far off it, from `from` along it on */
function alongWay(way: THREE.Vector3[], x: number, z: number, from = 0): [number, number] {
  let run = 0, best = Infinity, at = 0
  for (let k = 1; k < way.length; k++) {
    const a = way[k - 1], b = way[k], ex = b.x - a.x, ez = b.z - a.z, L = Math.hypot(ex, ez)
    if (run + L >= from && L > 1e-6) {
      const t = Math.max((from - run) / L, Math.min(1, ((x - a.x) * ex + (z - a.z) * ez) / (L * L)), 0)
      const d = Math.hypot(a.x + ex * t - x, a.z + ez * t - z)
      if (d < best) { best = d; at = run + t * L }
    }
    run += L
  }
  return [at, best]
}
/** whether a point (the world's) is where the table's guard would put one of `role` out of (GUARD_INV the table's frame's, this frame's) */
function guardedAt(w: THREE.Vector3, role: HearthRole) {
  GUARD_LOCAL.copy(w).applyMatrix4(GUARD_INV)
  const al = GUARD_LOCAL.dot(ALONG), la = GUARD_LOCAL.dot(LAY)
  if (!nearTable(al, la, HEARTH_ZONES)) return false
  const [a2, l2] = keepOut(al, la, role, HEARTH_ZONES)
  return a2 !== al || l2 !== la
}
/** the frame's stepping aside (HearthGuard's, just before its guard); `boss` his mover */
function standAside(boss: THREE.Object3D | null) {
  const now = performance.now(), dt = Math.min(0.1, Math.max(0, (now - AWAY_CLOCK.at) / 1000))
  AWAY_CLOCK.at = now
  const way = BOSS_BED.wayW, on = BOSS_BED.passing && !!boss && !!boss.parent && way.length > 1
  if (!on && !AWAYS.size) return
  // (one gone (a customer out of the door, a cook home: taken out of FIGURES as they went, so never looked at below) let go of, not kept,
  // and all of them with them, for the rest of the night (the Optimization window's))
  if (AWAYS.size) AWAYS.forEach((_a, o) => { if (!o.parent || !FIGURES.has(o)) AWAYS.delete(o) })
  let bossAt = 0
  if (on && boss) { boss.getWorldPosition(AWAY_BOSS); bossAt = alongWay(way, AWAY_BOSS.x, AWAY_BOSS.z)[0] }
  const clear = BOSS_BED.clear
  FIGURES.forEach((role, o) => {
    if (o === boss || o.name === 'BossFollow') return
    let a = AWAYS.get(o)
    if (!o.parent || !o.visible) { if (a) AWAYS.delete(o); return }
    // (where they'd be: as their own frame put them this frame, or, not put again since (stood, nothing moving them), as they were before
    // the step aside)
    if (a && o.position.distanceToSquared(a.drawn) < 1e-12) o.position.sub(a.offL)
    if (!a && !on) return
    o.getWorldPosition(AWAY_W)
    // (where they are along his way, and how far off it: from just behind him on)
    const [at, off] = on ? alongWay(way, AWAY_W.x, AWAY_W.z, Math.max(0, bossAt - AWAY_PAST)) : [0, Infinity]
    const ahead = at - bossAt
    if (!a) {
      if (!on || off > AWAY_CLEAR + 0.2 || ahead < 0 || ahead > AWAY_AHEAD + 0.6) return
      a = { off: new THREE.Vector3(), offL: new THREE.Vector3(), drawn: new THREE.Vector3(), last: AWAY_W.clone(), still: 0, to: null, at }
      AWAYS.set(o, a)
    }
    // (standing still: not moved on their own since the frame before)
    const own = Math.hypot(AWAY_W.x - a.last.x, AWAY_W.z - a.last.z)
    a.still = own < 0.004 ? a.still + dt : 0
    a.last.copy(AWAY_W)
    if (import.meta.env.DEV) a.own = own
    AWAY_WANT.set(0, 0, 0)
    const inWay = on && off < AWAY_CLEAR + (a.to ? 0.15 : 0) && ahead > -AWAY_PAST && ahead < AWAY_AHEAD
    if (inWay && !a.to && a.still >= AWAY_STILL && (!clear || clear(AWAY_W, AWAY_HALF))) {
      // (the nook: the nearest place round them, rings of 10 cm out to AWAY_REACH, sixteen ways each (back toward him only if nearer by a
      // hand), AWAY_OFF off his way ahead and clear for a body turned sideways)
      let best: THREE.Vector3 | null = null, bestCost = Infinity
      for (let r = 0.1; r <= AWAY_REACH + 1e-6 && !best; r += 0.1) for (let k = 0; k < 16; k++) {
        const ang = (k / 16) * Math.PI * 2
        AWAY_TRY.set(AWAY_W.x + Math.cos(ang) * r, AWAY_W.y, AWAY_W.z + Math.sin(ang) * r)
        const [tAt, tOff] = alongWay(way, AWAY_TRY.x, AWAY_TRY.z, Math.max(0, bossAt - AWAY_PAST))
        if (tOff < AWAY_OFF || guardedAt(AWAY_TRY, role)) continue
        if (clear && !clear(AWAY_TRY, AWAY_HALF)) continue
        const cost = r + (tAt < at ? 0.1 : 0)
        if (cost < bestCost) { bestCost = cost; best = AWAY_TRY.clone() }
      }
      if (best) { a.to = best.sub(AWAY_W); a.at = at }
    }
    if (a.to && on && ahead > -AWAY_PAST) AWAY_WANT.copy(a.to)
    else if (!on || ahead <= -AWAY_PAST) a.to = null
    // (a quick step to it, eased at its end)
    AWAY_TO.subVectors(AWAY_WANT, a.off)
    const d = AWAY_TO.length(), most = AWAY_SPEED * dt
    const moved = d > 1e-5 ? Math.min(most, d * Math.min(1, dt * 12)) : 0
    if (moved) a.off.addScaledVector(AWAY_TO, moved / d)
    if (import.meta.env.DEV) a.aside = moved
    if (!on && a.off.lengthSq() < 1e-6) { AWAYS.delete(o); return }
    // (drawn there: into their own parent's frame; and what they've in hand, as far (bar's CARRIED))
    AWAY_TRY.copy(AWAY_W).add(a.off)
    o.parent.worldToLocal(AWAY_TRY)
    a.offL.subVectors(AWAY_TRY, o.position)
    o.position.copy(AWAY_TRY)
    o.updateMatrixWorld(true)
    const held = CARRIED.get(o)
    if (held && a.off.lengthSq() > 1e-10) for (const c of held) {
      if (!c.parent || !c.visible) continue
      c.getWorldPosition(GUARD_HELD).add(a.off)
      c.parent.worldToLocal(GUARD_HELD)
      c.position.copy(GUARD_HELD)
      c.updateMatrixWorld(true)
    }
  })
}
/** (after the guard: where each of them is drawn, to know next frame whether their own frame's put them again) */
function standAsideDrawn() {
  AWAYS.forEach((a, o) => { a.drawn.copy(o.position) })
}
/** how high over the cook table's top he carries a piece (his hands' middle, what he holds hanging from it), and a spare for the top's
 * height in the world */
export const CARRY_LIFT = 0.2
export const TOP_AT = new THREE.Vector3()
/** (in development: who was put out of the table or the hearth, from where to where, the last few hundred) */
const GUARD_LOG: { who: string; role: string; from: [number, number]; to: [number, number] }[] = []
if (import.meta.env.DEV && typeof window !== 'undefined') Object.assign(window, { __hearthPushes: GUARD_LOG })
/**
 * No one stood in the cook table or its hearth (the owner's, 2026-11-10: a member of the staff in the 囲炉裏's salt bed, only his head
 * showing; fixing ways and spots one by one hadn't kept them all out). Every figure drawn (bar's FIGURES) is put out of them the last thing
 * before the frame's drawn (the scene's onBeforeRender: after every useFrame, its ways, its spots, its giving way to others, and before the
 * shadows and the picture are made), the nearest way, the owner into his notch and the third cook into his bay if those are nearer
 * (game/hearthGuard's keepOut). Hung in the table's own frame, beside its corners' markers.
 */
export function HearthGuard() {
  const mark = useRef<THREE.Group>(null)
  const scene = useThree((st) => st.scene)
  useEffect(() => {
    const was = scene.onBeforeRender
    // (each figure in turn, by the map's own forEach: its for-of made a pair for each one, every frame (item 374))
    let frame: THREE.Object3D | null | undefined = null
    // (the owner's mover, found once (and again if it's gone))
    let boss: THREE.Object3D | null = null
    const guard = (role: HearthRole, o: THREE.Object3D) => {
      if (!o.parent) { FIGURES.delete(o); return }
      // (one not drawn this frame left where it is: the plater's walker waits hidden at the bar's middle, the hearth's, till his first
      // errand, and was pushed out of it, his whole figure posed afresh, every frame of the opening (item 411: 340 times a day))
      if (!o.visible || !frame) return
      o.getWorldPosition(GUARD_AT)
      GUARD_LOCAL.copy(GUARD_AT).applyMatrix4(GUARD_INV)
      const al = GUARD_LOCAL.dot(ALONG), la = GUARD_LOCAL.dot(LAY)
      // (only those near the table asked about: the rest are as they are)
      if (!nearTable(al, la, HEARTH_ZONES)) return
      const [a2, l2] = keepOut(al, la, role, HEARTH_ZONES)
      if (a2 === al && l2 === la) return
      if (import.meta.env.DEV) {
        GUARD_LOG.push({ who: o.name || String(o.userData.staffId ?? o.userData.guest ?? '?'), role, from: [al, la], to: [a2, l2] })
        if (GUARD_LOG.length > 400) GUARD_LOG.splice(0, 100)
      }
      // (moved along the table's own axes only, in its frame; back into the world, and into its own parent's frame)
      GUARD_LOCAL.addScaledVector(ALONG, a2 - al).addScaledVector(LAY, l2 - la).applyMatrix4(frame.matrixWorld)
      GUARD_SHIFT.subVectors(GUARD_LOCAL, GUARD_AT)
      o.parent.worldToLocal(GUARD_LOCAL)
      o.position.copy(GUARD_LOCAL)
      o.updateMatrixWorld(true)
      // (and what they've in hand, as far (bar's CARRIED))
      const held = CARRIED.get(o)
      if (held) for (const c of held) {
        if (!c.parent || !c.visible) continue
        c.getWorldPosition(GUARD_HELD).add(GUARD_SHIFT)
        c.parent.worldToLocal(GUARD_HELD)
        c.position.copy(GUARD_HELD)
        c.updateMatrixWorld(true)
      }
    }
    scene.onBeforeRender = function (...args) {
      was.apply(this, args)
      frame = mark.current?.parent
      if (!frame) return
      frame.updateWorldMatrix(true, false)
      GUARD_INV.copy(frame.matrixWorld).invert()
      // (item 659: those standing in his way as he walks home stood aside first, the guard after: nobody put into the table for it)
      standAside(boss ??= scene.getObjectByName('BossFollow') ?? null)
      if (boss && !boss.parent) boss = null
      FIGURES.forEach(guard)
      standAsideDrawn()
    }
    return () => { scene.onBeforeRender = was }
  }, [scene])
  return <group ref={mark} />
}
