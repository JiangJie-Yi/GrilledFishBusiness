import { memo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { TRAY_AT as HELD_AT, SweepBroom, ownerSweepPose, floorWipePose, OWNER_BEND } from '@/scene/people/StaffFigure'
import { BossModel, drawnCentre } from '@/shops/grill/staff/Boss'
import { tick } from '@/scene/kit/speed'
import { OWNER_IN_STAFF, OWNER_HAND, OWNER_BONE, OWNER_TRAY_GEO } from './staffPoses'

/** the owner out serving (no server hired): his figure with a rock and a bob as he walks, and a lacquered tray held in front */
// (item 374: never drawn again with the bar. His rock and bob by how far he's gone since the last frame, eased in and out as he sets off
// and stops: a walking flag the bar kept for him (and each server, and the plater), set as they set off and stopped, had his figure drawn
// again each time, and the rock came and went at once)
const OWNER_AT = new THREE.Vector3()
export const OwnerWalker = memo(OwnerWalkerImpl)
function OwnerWalkerImpl() {
  const g = useRef<THREE.Group>(null)
  const last = useRef<THREE.Vector3 | null>(null)
  const pace = useRef(0)
  const tray = useRef<THREE.Mesh>(null)
  /** his hands (the model's own nodes) and where they rest, found once he's drawn */
  const hands = useRef<{ node: THREE.Object3D; at: THREE.Vector3; q: THREE.Quaternion; upper: boolean }[] | null>(null)
  useFrame(({ clock }, delta) => {
    const o = g.current
    if (!o) return
    const t = clock.elapsedTime, dt = tick(delta)
    // (how fast he's going, 0 to 1 at a walk (as the staff's figures have it); from nothing while he's out of sight, not from where he was
    // put away)
    if (o.parent && !o.parent.visible) { last.current = null; pace.current = 0 }
    else {
      const at = o.getWorldPosition(OWNER_AT)
      const sp = last.current ? Math.hypot(at.x - last.current.x, at.z - last.current.z) / Math.max(dt, 1e-3) : 0
      ;(last.current ??= new THREE.Vector3()).copy(at)
      pace.current += (Math.min(1, sp / 0.6) - pace.current) * Math.min(1, dt * 8)
    }
    const k = pace.current
    o.rotation.z = Math.sin(t * 9) * 0.05 * k
    o.position.y = Math.abs(Math.sin(t * 9)) * 0.014 * k
    // (sweeping up broken glass, or the broom carried: the tray put by)
    // (nor while he's down sweeping or wiping the floor (item 116: the tray showed in his hands as he wiped, a black disc on the floor))
    // (nor on an errand, the till, the skewers, the sink or sweeping up, there and back (trayDown, item 249: back from sweeping up broken glass
    // he had it in his hands again, an empty black disc, "a black plate"))
    if (tray.current) tray.current.visible = !o.parent?.userData.broom && o.parent?.userData.scrub === undefined && o.parent?.userData.sweep === undefined
      && o.parent?.userData.floorWipe === undefined && o.parent?.userData.washHands === undefined && o.parent?.userData.handsAt === undefined
      && !o.parent?.userData.trayDown
    // (sweeping: both his hands on the broom's handle, going with it from side to side, as a server's are (the owner's, 2026-11-11: his hands
    // stood still at his sides while the broom swept); back where they rest after)
    if (!hands.current) {
      const l = o.getObjectByName('BossHandL'), r = o.getObjectByName('BossHandR')
      // (each hand's palm, where it's drawn, from its bone's origin (in the bone's parent's frame): the bone's origin isn't in the hand, so it's
      // the palm that's put on the handle (the owner's, 2026-11-12: set by its origin, his hands stood out wide at his sides, off the broom).
      // Worked out each frame he's at a job (below), not kept from the first)
      if (l && r && l.parent && r.parent) hands.current = [l, r].map((node, k) => ({ node, at: node.position.clone(), q: node.quaternion.clone(), upper: k === 1 }))
    }
    const sweep = o.parent?.userData.sweep as number | undefined
    // (wiping a spill off the floor after (item 164): stooped as for the sweep, the broom put by, a hand on the cloth)
    const floorWipe = o.parent?.userData.floorWipe as number | undefined
    const wipeAt = o.parent?.userData.wipeAt as [number, number, number] | undefined
    // (washing up at the sink (item 103): leant a little over the basin, both hands down in it, the right scrubbing round on the plate)
    const scrub = o.parent?.userData.scrub as number | undefined
    // (washing a plate up by hand (item 174): each hand where the washing has it, in the world: the left on the plate, the right with the sponge)
    // (or both at a job's places in the world: the open sake bottle as he pours a customer's tokkuri at the sake station (item 177))
    const washHands = (o.parent?.userData.washHands ?? o.parent?.userData.handsAt) as { left: THREE.Vector3; right: THREE.Vector3 } | undefined
    // (stooped over the small broom while he sweeps, upright after)
    o.rotation.x += ((sweep !== undefined || floorWipe !== undefined ? OWNER_BEND : scrub !== undefined || washHands ? OWNER_BEND * 0.35 : 0) - o.rotation.x) * 0.2
    const posing = sweep !== undefined || scrub !== undefined || floorWipe !== undefined || !!washHands
    // (each hand's palm, where it's drawn, from its bone's origin, in the bone's parent's frame: worked out afresh each frame he's at a job,
    // his whole figure's matrices and its skin's brought up to date first (item 174: worked out once, as he came to a job and leant in, it
    // came out a hand's width off, and stayed so: his hands a hand's width off the plate and the sponge, the broom's handle, the cloth))
    if (posing && hands.current) { o.updateWorldMatrix(true, false); o.updateMatrixWorld(true) }
    if (hands.current) for (const h of hands.current) {
      if (!posing || !h.node.parent) { h.node.position.copy(h.at); h.node.quaternion.copy(h.q); continue }
      const parent = h.node.parent
      const palm = parent.worldToLocal(h.node.localToWorld(drawnCentre(o, h.node))).sub(parent.worldToLocal(h.node.getWorldPosition(OWNER_BONE)))
      if (washHands) {
        h.node.position.copy(parent.worldToLocal(OWNER_HAND.copy(h.upper ? washHands.right : washHands.left))).sub(palm)
        continue
      }
      if (scrub !== undefined) {
        const k = scrub * Math.PI * 10
        OWNER_HAND.set(h.upper ? 0.09 + Math.cos(k) * 0.035 : -0.08, 0.36 + (h.upper ? Math.sin(k) * 0.02 : 0), 0.3 + (h.upper ? Math.sin(k) * 0.03 : 0))
        h.node.position.copy(parent.worldToLocal(o.localToWorld(OWNER_HAND))).sub(palm)
        continue
      }
      if (floorWipe !== undefined) {
        // (his own frame is the server's he stands in for, scaled up to his height: the cloth's place brought into it)
        const w = floorWipePose(OWNER_HAND.set(...(wipeAt ?? [0.05, 0.004, 0.62])).divideScalar(OWNER_IN_STAFF))
        h.node.position.copy(parent.worldToLocal(o.localToWorld(OWNER_HAND.copy(h.upper ? w.right : w.left)))).sub(palm)
        continue
      }
      const p = ownerSweepPose(sweep!)
      h.node.position.copy(parent.worldToLocal(o.localToWorld(OWNER_HAND.copy(h.upper ? p.upper : p.lower)))).sub(palm)
    }
  })
  return (
    <group ref={g}>
      <group scale={OWNER_IN_STAFF}><BossModel /></group>
      {/* (the broom, when he sweeps up broken glass in a server's stead) */}
      <SweepBroom owner />
      <mesh ref={tray} position={[HELD_AT[0], HELD_AT[1] - 0.003, HELD_AT[2]]} geometry={OWNER_TRAY_GEO}>
        <meshToonMaterial color="#3a1a14" />
      </mesh>
    </group>
  )
}
