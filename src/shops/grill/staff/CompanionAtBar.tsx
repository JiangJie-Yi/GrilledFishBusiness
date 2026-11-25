// (item 696, part two; the owner's 「…好感度達到一定的女員工會詢問可否住下來，且必（閉）店時也會待在1樓陪老闆，睡覺時會上樓一起睡。」) his
// companion (game/companion; shopState's COMPANION) downstairs with him while the shop's shut by day: down the stair by the staff's door a
// little after she's up, across the room to the stool nearest his fire (round all that stands there: Roasting's way-finder), the stool
// pulled out, up onto it, slid in with it, sat with her hands round a cup of tea on the bar, glancing at him now and then with a smile; as
// the shop's about to open (or opened early), back off the stool, the stool pushed home, back to the door and up. One figure made with the
// shop's (no new kind of thing drawn as she comes: the staff's own figure, the stools'), moved about and hidden while she's not down; the
// room upstairs leaves her out meanwhile (COMPANION.down).
import { memo, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { StaffFigure } from '@/scene/people/StaffFigure'
import { BlobShadow } from '@/scene/effects/BlobShadow'
import { tick } from '@/scene/kit/speed'
import { getClock } from '@/ui/kit/clockStore'
import { COMPANION } from '@/game/world/shopState'
import { CANDIDATES } from '@/game/staff/hiring'
import { alongPath, BOSS_BED, FIGURES, pathLength, SEAT_PULL, STOOL_TUCK, type Seat } from '@/shops/grill/bar'
import { SEAT_MARKS, STOOL_OUT, STOOL_STAND, backOf } from '@/shops/grill/guestbar/seats'
import { STAFF_SCALE } from '@/shops/grill/guestbar/staffPoses'
import { SPEED } from '@/shops/grill/guestbar/walking'
import type { CrewFace } from '@/scene/people/faceSheet'

/** from when she comes down (a few minutes after the dorm's morning) till when she goes back up to get ready (before the shop opens) */
const DOWN_FROM = 11 * 60 + 5, UP_AT = 16 * 60 + 20
/** her stool's seat (the bar's frame: the stool's top, its cushion on it), and her hands' height over it in her own frame: round a cup on the
 * low bar */
const SIT_Y = 0.41, HANDS = 0.09
/** pulling the stool out, stepping up onto it, sliding in with it (s); and going, the same the other way */
const PULL_S = 0.25, STEP_S = 0.35, SLIDE_S = 0.4
/** her pace across the room (a little slower than a customer's: no hurry) */
const PACE = SPEED * 0.85
/** the cup of tea before her (a yunomi, 16 round, its foot a ring round a hole too small to see: no fan into the middle), shared */
const CUP_GEO = new THREE.LatheGeometry([new THREE.Vector2(0.003, 0.002), new THREE.Vector2(0.021, 0.002), new THREE.Vector2(0.024, 0.008),
  new THREE.Vector2(0.027, 0.05), new THREE.Vector2(0.024, 0.051), new THREE.Vector2(0.021, 0.012), new THREE.Vector2(0.004, 0.012)], 16)
const CUP_MAT = new THREE.MeshToonMaterial({ color: '#8fa88b' })
const TEA_GEO = new THREE.RingGeometry(0.004, 0.021, 16, 1).rotateX(-Math.PI / 2).translate(0, 0.042, 0)
const TEA_MAT = new THREE.MeshToonMaterial({ color: '#b8a24a' })
const ease = (k: number) => { const x = Math.max(0, Math.min(1, k)); return x * x * (3 - 2 * x) }
const P = new THREE.Vector3(), Q = new THREE.Vector3(), SHIFT = new THREE.Vector3()

type Phase = 'away' | 'walkIn' | 'pull' | 'step' | 'slide' | 'sit' | 'slideOut' | 'stepDown' | 'push' | 'walkOut'

export const CompanionAtBar = memo(function CompanionAtBar({ seats, open, top }: { seats: readonly Seat[]; open: boolean; top: number }) {
  const scene = useThree((st) => st.scene)
  // (who she is: shopState's COMPANION as App keeps it, looked at each frame, a redraw only as it changes (rarely: a yes, an end))
  const [id, setId] = useState<string | null>(COMPANION.id)
  const who = useMemo(() => (id ? Object.values(CANDIDATES).flat().find((w) => w.id === id) ?? null : null), [id])
  const g = useRef<THREE.Group>(null), shade = useRef<THREE.Group>(null), cup = useRef<THREE.Group>(null)
  const s = useRef({ phase: 'away' as Phase, t: 0, seat: -1, path: [] as THREE.Vector3[], len: 0, d: 0, yaw: 0, smile: 0 })
  const [pose, setPose] = useState<{ moving: boolean; seated: boolean; face?: CrewFace }>({ moving: false, seated: false })
  const doorAt = useRef<THREE.Object3D | null>(null)
  useFrame((_, dt0) => {
    if (COMPANION.id !== id) setId(COMPANION.id)
    const o = g.current, me = s.current
    if (!o || !o.parent) return
    const dt = tick(dt0), minute = getClock().minute
    const want = !!who && COMPANION.id === who.id && !open && minute >= DOWN_FROM && minute < UP_AT
    const st = me.seat >= 0 ? seats[me.seat] : undefined
    // (her stool where it's been moved to by hand, as the customers sit on theirs (SEAT_MARKS))
    const shift = (n: number) => {
      SHIFT.set(0, 0, 0)
      const mk = SEAT_MARKS.get(n)
      if (mk && o.parent) o.parent.worldToLocal(mk.getWorldPosition(SHIFT)).sub(seats[n].stool).setY(0)
      return SHIFT
    }
    // (the stool out from under the bar by `k` toward the aisle (seats' Stools draws it there); her seat on it)
    const seatAt = (n: number, k: number, out: THREE.Vector3) => out.copy(seats[n].stool).add(shift(n)).addScaledVector(backOf(seats[n]), k)
    let next = pose
    if (me.phase === 'away') {
      if (want && seats.length) {
        // (the stool nearest him, where he is now; her way to it from the staff's door, round all that stands in the room)
        let boss: THREE.Object3D | null = null
        FIGURES.forEach((role, f) => { if (!boss && role === 'owner' && f.visible && f.parent) boss = f })
        const at = boss ? o.parent.worldToLocal((boss as THREE.Object3D).getWorldPosition(P)) : null
        let best = 0, bestD = Infinity
        seats.forEach((x, n) => { const dd = at ? x.stool.distanceTo(at) : n; if (dd < bestD) { bestD = dd; best = n } })
        me.seat = best
        const stand = seatAt(best, STOOL_STAND, new THREE.Vector3()).setY(0)
        if (!doorAt.current?.parent) doorAt.current = scene.getObjectByName('staff-door') ?? null
        const sd = doorAt.current
        let path: THREE.Vector3[] = [stand.clone().addScaledVector(backOf(seats[best]), 0.6), stand]
        if (sd) {
          const dW = sd.getWorldPosition(new THREE.Vector3()), inW = sd.localToWorld(new THREE.Vector3(-1, 0, 0))
          const d = o.parent.worldToLocal(dW.clone()).setY(0), into = o.parent.worldToLocal(inW).setY(0).sub(d).normalize()
          const front = d.clone().addScaledVector(into, 0.45)
          const way = BOSS_BED.route?.(o.parent.localToWorld(front.clone()), o.parent.localToWorld(stand.clone()))
          path = way ? way.map((w) => o.parent!.worldToLocal(w.clone()).setY(0)) : [front, stand]
          path[0] = front; path[path.length - 1] = stand
        }
        me.path = path; me.len = pathLength(path); me.d = 0; me.phase = 'walkIn'; me.t = 0
        COMPANION.down = true
        o.visible = true
      }
    } else if (!want && (me.phase === 'walkIn' || me.phase === 'pull')) {
      // (called away before she's sat: back the way she came from where she is)
      if (open) { me.phase = 'away'; o.visible = false; COMPANION.down = false; if (me.seat >= 0) SEAT_PULL.delete(me.seat) }
      else { me.phase = 'walkOut'; me.d = me.len - me.d; me.path = [...me.path].reverse(); me.t = 0; if (me.seat >= 0) SEAT_PULL.delete(me.seat) }
    } else if (!want && open) {
      // (the shop opened early: gone up at once to get ready (she'd be met coming down for work as she went))
      me.phase = 'away'; o.visible = false; COMPANION.down = false; if (me.seat >= 0) SEAT_PULL.delete(me.seat)
    }
    if (me.phase === 'away' || !st) {
      if (o.visible && me.phase === 'away') o.visible = false
      if (cup.current) cup.current.visible = false
      if (next.moving || next.seated) next = { moving: false, seated: false }
      if (next !== pose) setPose(next)
      return
    }
    me.t += dt
    const back = backOf(st)
    switch (me.phase) {
      case 'walkIn': case 'walkOut': {
        me.d = Math.min(me.len, me.d + PACE * dt)
        const { p, dir } = alongPath(me.path, me.d)
        o.position.copy(p)
        if (dir.lengthSq() > 1e-8) me.yaw = Math.atan2(dir.x, dir.z)
        if (me.d >= me.len - 1e-4) {
          if (me.phase === 'walkIn') { me.phase = 'pull'; me.t = 0 }
          else { me.phase = 'away'; o.visible = false; COMPANION.down = false; me.seat = -1 }
        }
        next = { moving: me.phase === 'walkIn' || me.phase === 'walkOut', seated: false }
        break
      }
      case 'pull': {
        SEAT_PULL.set(me.seat, -STOOL_TUCK + (STOOL_OUT + STOOL_TUCK) * ease(me.t / PULL_S))
        seatAt(me.seat, STOOL_STAND, o.position).setY(0)
        me.yaw = Math.atan2(-back.x, -back.z)
        if (me.t >= PULL_S) { me.phase = 'step'; me.t = 0 }
        next = { moving: false, seated: false }
        break
      }
      case 'step': case 'stepDown': {
        const k = ease(me.t / STEP_S), up = me.phase === 'step' ? k : 1 - k
        seatAt(me.seat, STOOL_STAND, P).setY(0)
        seatAt(me.seat, STOOL_OUT, Q).setY(SIT_Y)
        o.position.lerpVectors(P, Q, up)
        o.position.y += Math.sin(Math.PI * k) * 0.06
        me.yaw = Math.atan2(-back.x, -back.z)
        if (me.t >= STEP_S) {
          if (me.phase === 'step') { me.phase = 'slide'; me.t = 0 }
          else { me.phase = 'push'; me.t = 0 }
        }
        next = { moving: false, seated: me.phase === 'slide' }
        break
      }
      case 'slide': case 'slideOut': {
        const k = ease(me.t / SLIDE_S), out = me.phase === 'slide' ? STOOL_OUT * (1 - k) : STOOL_OUT * k
        SEAT_PULL.set(me.seat, out)
        seatAt(me.seat, out, o.position).setY(SIT_Y)
        me.yaw = st.yaw
        if (me.t >= SLIDE_S) {
          if (me.phase === 'slide') { me.phase = 'sit'; me.t = 0 }
          else { me.phase = 'stepDown'; me.t = 0 }
        }
        next = { moving: false, seated: true }
        break
      }
      case 'sit': {
        SEAT_PULL.set(me.seat, 0)
        seatAt(me.seat, 0, o.position).setY(SIT_Y)
        me.yaw = st.yaw
        if (!want) { me.phase = 'slideOut'; me.t = 0 }
        // (a smile his way now and then, and now and then a shy look away; mostly just sat with her tea)
        const cyc = (me.t + (who?.id.length ?? 0) * 1.7) % 11
        next = { moving: false, seated: true, face: cyc < 1.6 ? 'happy' : cyc > 6 && cyc < 7.2 ? 'shy' : undefined }
        break
      }
      case 'push': {
        SEAT_PULL.set(me.seat, STOOL_OUT - (STOOL_OUT + STOOL_TUCK) * ease(me.t / PULL_S))
        seatAt(me.seat, STOOL_STAND, o.position).setY(0)
        if (me.t >= PULL_S) {
          SEAT_PULL.delete(me.seat)
          // (her way back to the door: the way she came, the other way round)
          me.path = [...me.path].reverse(); me.len = pathLength(me.path); me.d = 0; me.phase = 'walkOut'; me.t = 0
        }
        next = { moving: false, seated: false }
        break
      }
    }
    o.rotation.y = me.yaw
    // (her shadow on the floor while she's on it; the cup on the bar before her while she's sat)
    if (shade.current) shade.current.visible = o.position.y < 0.05
    if (cup.current) {
      const sat = me.phase === 'sit' || me.phase === 'slide'
      cup.current.visible = me.phase === 'sit'
      if (sat) cup.current.position.copy(st.plate).add(shift(me.seat)).addScaledVector(back, 0.1).setY(top)
    }
    if (next.moving !== pose.moving || next.seated !== pose.seated || next.face !== pose.face) setPose(next)
  })
  if (!who) return null
  return (
    <>
      <group ref={g} visible={false} name="companion-at-bar">
        <group ref={shade}><BlobShadow r={0.17} /></group>
        <group scale={STAFF_SCALE}>
          <StaffFigure id={who.id} role={who.role} look={who.look} moving={pose.moving} seated={pose.seated ? HANDS : false} face={pose.face} />
        </group>
      </group>
      <group ref={cup} visible={false}>
        <mesh geometry={CUP_GEO} material={CUP_MAT} raycast={() => {}} />
        <mesh geometry={TEA_GEO} material={TEA_MAT} raycast={() => {}} />
      </group>
    </>
  )
})
