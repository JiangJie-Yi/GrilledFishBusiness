import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { gateSound } from '@/shops/grill/sounds/restroomSound'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { StaticBatch } from '@/scene/render/StaticBatch'
import { GAME_SPEED } from '@/scene/kit/speed'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { COMMUTERS } from '@/shops/grill/staff/commuteWalk'
import { AxisGizmo, focusCamera, useEditBox } from '@/shops/grill/editor/Movable'
import { beginChange, commitOffsets, getEdit, moveTo, offsetOf, positionOf, registerMovable, useEditSel } from '@/shops/grill/edit'
import { SERVICE, BAR_GATES, BOSS_BED, gateOf, type Gate, BAR_BASE_Z, type Counter } from '@/shops/grill/bar'
import { BAR_TOP } from './barPlaces'
import { TRAY_WOOD } from './common'

/** how near someone has to come for a gate to swing open for them (the bar's sizes); how far it opens (rad), how quickly (a rate, the share
 * of the way a second: half open in about a ninth of a second of the shop's time, nine tenths as they reach it), and its spring shutting
 * again (a stiffness and damping: back past shut by some 12 degrees, then 2, settled in about a second). (Item 242: it was flung open
 * from three quarters of a metre off, at 14 a frame's share, a slow frame or double speed all of it at once: 0.98 rad in one frame, 83
 * times a minute; now it swings as they come up to it, and goes on with the way it was moving when they're by) */
const GATE_NEAR = 0.55
const GATE_OPEN = 1.4
const GATE_PUSH = 6
// (the spring a swing door's hinge has: shut again in a third of a second it was (14 rad/s, flicked back faster than it was pushed); now
// a little under a second's swing back, past shut and back, the same 12 degrees over and settled in about a second)
const GATE_K = 64
const GATE_C = 8
const GATE_AT = new THREE.Vector3()
/**
 * The swing door across a counter's gate: a leaf of slatted wood as high as the bar, its top capped in the bar's own
 * wood so it reads as the bar run on, hung on brass hinges on the base's end. It stands shut, flush with the bar, and
 * swings open away from whoever of the staff comes up to it (SERVICE.walkers, COMMUTERS), springing shut again behind them.
 */
function BarGateImpl({ c, gate }: { c: Counter; gate: Gate }) {
  const yaw = Math.atan2(-c.along.z, c.along.x)
  const end = gate.end
  // (the hinge: the inner edge of the gap, on the base's line; the leaf reaches from it across the doorway)
  const { hinge, mid: middle } = useMemo(() => gateOf(c, gate), [c, gate])
  const G = gate.leaf
  const leaf = useRef<THREE.Group>(null)
  const open = useRef(0)
  // (its swing: the angle, how fast it's turning, which way it was pushed, whether it's tapped shut yet this time)
  const swing = useRef({ ang: 0, vel: 0, side: 0, swinging: false, tapped: false })
  const frame = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const { camera, gl, raycaster } = useThree()
  const controls = useThree((s) => s.controls) as unknown as { enabled: boolean; target?: THREE.Vector3; update?: () => void } | null
  const editing = useEditSel((s) => s.on), selected = useEditSel((s) => s.selected), space = useEditSel((s) => s.space)
  const drag = useRef<{ at: THREE.Vector3; y: number; lift: boolean } | null>(null)
  const idx = BAR_GATES.indexOf(gate)
  // (its handles hang in the gate's own turned frame: for the world's axes they're turned back by that frame's turn; for its own, not at all)
  const gizmoFrame = useRef<THREE.Group>(null)
  const [gateWorld, setGateWorld] = useState(0)
  useEffect(() => {
    if (!editing) return
    const t = window.setTimeout(() => {
      const f = gizmoFrame.current
      if (f) setGateWorld(-new THREE.Euler().setFromQuaternion(f.getWorldQuaternion(new THREE.Quaternion()), 'YXZ').y)
    }, 50)
    return () => window.clearTimeout(t)
  }, [editing, selected])
  // (while editing, the leaf is outlined like any other piece that can be moved: brighter pointed at, amber chosen)
  const [hover, setHover] = useState(false)
  useEditBox(leaf, editing, selected === `gate${idx}` ? 'chosen' : hover ? 'hover' : 'idle')
  // (in edit mode, key G with the shop shut: the swing door by itself is moved by hand, the post and doorway staying; on the list of what can be moved)
  useEffect(() => registerMovable(`gate${idx}`, idx === 1 ? '水槽旁閘門門板' : '櫃檯尾閘門門板', () => {
    if (leaf.current) focusCamera(camera, controls, leaf.current.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.5, 0)))
  }), [idx, camera, controls])
  const hit = (e: PointerEvent, y: number, lift: boolean) => {
    const r = gl.domElement.getBoundingClientRect()
    raycaster.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera)
    // (over the floor: the plane at the gate's height; lifted: a upright plane through it, facing the camera)
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -y)
    if (lift) {
      plane.normal.copy(camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize().negate())
      plane.constant = -plane.normal.dot(body.current!.getWorldPosition(new THREE.Vector3()))
    }
    return raycaster.ray.intersectPlane(plane, new THREE.Vector3())
  }
  const down = (e: { stopPropagation: () => void; nativeEvent: PointerEvent; intersections?: { object: THREE.Object3D }[] }) => {
    if (!getEdit().on || !body.current) return
    // (an axis arrow under the pointer takes it: the box is only for the free move)
    if (e.intersections?.some((i) => i.object.userData.gizmo)) return
    e.stopPropagation()
    beginChange()
    moveTo(`gate${idx}`, offsetOf(`gate${idx}`))
    const wp = body.current.getWorldPosition(new THREE.Vector3())
    const lift = e.nativeEvent.shiftKey
    const p = hit(e.nativeEvent, wp.y, lift)
    if (!p) return
    drag.current = { at: p, y: wp.y, lift }
    if (controls) controls.enabled = false
    const move = (ev: PointerEvent) => {
      const d = drag.current
      if (!d) return
      const q = hit(ev, d.y, d.lift)
      if (!q) return
      // (the move in the world, taken into the bar's own frame and then the nudge's units: the bar is drawn GRILL_SCALE over its own size)
      const par = body.current!.parent!
      const a = par.worldToLocal(d.at.clone()), b = par.worldToLocal(q.clone())
      const dl = b.sub(a)
      const n = offsetOf(`gate${idx}`)
      // (the swing door's own offset, in the bar's units, its post and doorway staying where they are)
      moveTo(`gate${idx}`, [n[0] + dl.x, n[1] + dl.y, n[2] + dl.z])
      d.at.copy(q)
    }
    const up = () => {
      drag.current = null
      if (controls) controls.enabled = true
      commitOffsets()
      window.removeEventListener('pointermove', move)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up, { once: true })
  }
  useFrame((_, dt0) => {
    const dt = Math.min(dt0, 0.05)
    // (whoever's walking by it: the servers (and the owner serving), and the staff walking out at the day's end or in at its start
    // (commuteWalk's COMMUTERS, the world's, brought into the bar's frame); the nearest, and which side of it they're on)
    let near: THREE.Vector3 | null = null, best = GATE_NEAR
    for (const w of SERVICE.walkers) { const d = Math.hypot(w.x - middle.x, w.z - middle.z); if (d < best) { best = d; near = w } }
    const par = frame.current?.parent
    if (par && COMMUTERS.size) for (const { p } of COMMUTERS.values()) {
      const w = par.worldToLocal(GATE_AT.copy(p))
      const d = Math.hypot(w.x - middle.x, w.z - middle.z)
      if (d < best) { best = d; near = w.clone() }
    }
    // (and the owner walked by the player's keys (item 802, the owner's 「當我控制老闆時，過不了閘門」): it swung for the crew alone)
    if (par && BOSS_BED.drivenAt) {
      const w = par.worldToLocal(GATE_AT.copy(BOSS_BED.drivenAt))
      const d = Math.hypot(w.x - middle.x, w.z - middle.z)
      if (d < best) { best = d; near = w.clone() }
    }
    const g = swing.current
    if (near) {
      // (pushed open away from them: in toward the kitchen from the floor, out toward the floor from the kitchen; the way it was going
      // kept while it's open (someone just behind them keeps it open))
      if (g.side === 0 || Math.abs(g.ang) < 0.08) {
        const side = (near.x - middle.x) * c.lay.x + (near.z - middle.z) * c.lay.z
        if (g.side === 0 && par) gateSound(par.localToWorld(GATE_AT.copy(middle)), 'push')
        g.side = side > 0 ? -1 : 1
      }
      const was = g.ang
      g.ang += (-end * GATE_OPEN * g.side - g.ang) * (1 - Math.exp(-dt * GAME_SPEED.value * GATE_PUSH))
      // (how fast it's swinging, kept for the spring: let go, it goes on the way it was moving)
      g.vel = dt > 0 ? (g.ang - was) / dt : 0
      g.swinging = true
    } else if (g.swinging) {
      // (let go: sprung back shut, past it and back, and still; a tap as it first swings through shut)
      for (let n = 0; n < 4; n++) {
        const h = dt / 4
        g.vel += (-GATE_K * g.ang - GATE_C * g.vel) * h
        const before = g.ang
        g.ang += g.vel * h
        if (before !== 0 && Math.sign(before) !== Math.sign(g.ang) && !g.tapped) { g.tapped = true; if (par) gateSound(par.localToWorld(GATE_AT.copy(middle)), 'tap') }
      }
      if (Math.abs(g.ang) < 0.002 && Math.abs(g.vel) < 0.02) { g.ang = 0; g.vel = 0; g.swinging = false; g.side = 0; g.tapped = false }
    }
    open.current = Math.min(1, Math.abs(g.ang) / GATE_OPEN)
    if (leaf.current) leaf.current.rotation.y = g.ang
    // (the whole gate where it's been put, the moment it's moved)
    if (body.current) {
      const n = positionOf(`gate${idx}`)
      body.current.position.set(n[0], n[1], n[2])
    }
  })
  const H = BAR_TOP - 0.02
  return (
    <group ref={frame} position={c.at} rotation-y={yaw}>
      <group position={[hinge, 0, 0.08]}>
        {/* the swing door by itself: its own thing, apart from the post and the doorway, which stay where they are; it's this that's moved by hand */}
        <group ref={body} position={positionOf(`gate${idx}`)} onPointerDown={down}
          onPointerOver={editing ? (e: { stopPropagation: () => void }) => { e.stopPropagation(); setHover(true) } : undefined} onPointerOut={editing ? () => setHover(false) : undefined}>
        {editing && <group ref={gizmoFrame}><AxisGizmo id={`gate${idx}`} at={[end * G / 2, H / 2, 0]} theta={space === 'world' ? gateWorld : 0} /></group>}
        <group ref={leaf} name="gate-leaf">
          {/* (its frame, panels, joints and hinge leaves, some forty parts, drawn as a handful: they swing together, as one) */}
          <StaticBatch plain>
          <group position-x={end * (G / 2 - 0.005)}>
            {/* a framed door of planed wood: two stiles and three rails with rounded edges, the grain running up the
                stiles and across the rails, and a recessed board panel of upright planks between them */}
            <GateLeaf w={G - 0.02} h={H - 0.06} y={0.05} />
            {[0.16, BAR_TOP - 0.16].map((y) => [1, -1].map((sd) => (
              <group key={`${y}${sd}`} position={[-end * (G / 2 - 0.005) + end * 0.022, y, sd * 0.042]}>
                <mesh geometry={HINGE_GEO.plate}><meshToonMaterial color="#b89040" /></mesh>
                {[-1, 1].map((k) => (
                  <mesh key={k} geometry={HINGE_GEO.screw} position={[0, k * 0.02, sd * 0.0025]} rotation-x={Math.PI / 2}>
                    <meshToonMaterial color="#5a4220" />
                  </mesh>
                ))}
              </group>
            )))}
          </group>
          </StaticBatch>
        </group>
        {/* the hinges, top and bottom (they go with the door when it's moved by hand, so they're in its group): a brass knuckle on the hinge's line, a leaf screwed to the base's end and one to
            the door's stile (that one turns with it: GateHingeLeaf) */}
        {/* (some thirty parts, drawn as four: they never move apart) */}
        <StaticBatch plain>
        {[0.16, BAR_TOP - 0.16].map((y) => (
          <group key={y} position-y={y}>
            <mesh geometry={HINGE_GEO.knuckle}><meshToonMaterial color="#c8a050" /></mesh>
            <mesh geometry={HINGE_GEO.knuckle} scale={[1.25, 1.03, 1.25]}><meshBasicMaterial color="#3b2a20" side={THREE.BackSide} /></mesh>
            {[1, -1].map((sd) => (
              <group key={sd}>
                <mesh geometry={HINGE_GEO.plate} position={[-end * 0.022, 0, sd * 0.024]}><meshToonMaterial color="#b89040" /></mesh>
                {[-1, 1].map((k) => (
                  <mesh key={k} geometry={HINGE_GEO.screw} position={[-end * 0.022, k * 0.02, sd * 0.0265]} rotation-x={Math.PI / 2}>
                    <meshToonMaterial color="#5a4220" />
                  </mesh>
                ))}
              </group>
            ))}
          </group>
        ))}
        </StaticBatch>
        </group>
        {/* the door's post (柱): a jamb of pale planed wood standing up the base's end, its face rounded, the hinges on it,
            set apart from the dark base so the gate reads as a door hung on a post; and a thin dark shadow line down the
            gap between it and the door */}
        {/* (a hair wider, deeper and taller than the base it stands against, so its faces don't lie in the base's own planes and z-fight) */}
        <mesh position={[-end * 0.022, (BAR_TOP - 0.06) / 2 + 0.002, 0]} castShadow>
          <primitive object={gateGeo(0.056, BAR_TOP - 0.056, BAR_BASE_Z[1] - BAR_BASE_Z[0] + 0.036, 0.01)} attach="geometry" />
          <meshToonMaterial color="#d8b88a" map={GATE_WOOD.up} />
        </mesh>
        <mesh position={[-end * 0.022, (BAR_TOP - 0.06) / 2 + 0.002, 0]} scale={[1.12, 1.01, 1.03]}>
          <primitive object={gateGeo(0.056, BAR_TOP - 0.056, BAR_BASE_Z[1] - BAR_BASE_Z[0] + 0.036, 0.01)} attach="geometry" />
          <meshBasicMaterial color="#3b2a20" side={THREE.BackSide} />
        </mesh>
      </group>
    </group>
  )
}
/** a gate's hinge: its knuckle (a brass barrel on the hinge's line), its leaves, their screw heads */
const HINGE_GEO = {
  knuckle: new THREE.CylinderGeometry(0.009, 0.009, 0.075, 10),
  plate: new THREE.BoxGeometry(0.036, 0.07, 0.004),
  screw: new THREE.CylinderGeometry(0.004, 0.004, 0.003, 8),
}
/** rounded boxes for the gate's parts, made once per size */
const GATE_GEO = new Map<string, THREE.BufferGeometry>()
function gateGeo(w: number, h: number, d: number, r: number) {
  const k = [w, h, d, r].map((v) => v.toFixed(3)).join()
  if (!GATE_GEO.has(k)) GATE_GEO.set(k, new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2.2, h / 2.2, d / 2.2)))
  return GATE_GEO.get(k)!
}
/** the bar's wood for the gate, its grain turned to run up (the stiles, the panel) or across (the rails, the cap) */
const GATE_WOOD = (() => {
  const turn = (up: boolean) => {
    if (!TRAY_WOOD) return null
    const t = TRAY_WOOD.clone()
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.center.set(0.5, 0.5)
    t.rotation = up ? Math.PI / 2 : 0
    t.repeat.set(0.35, 0.35)
    t.needsUpdate = true
    return t
  }
  return { up: turn(true), across: turn(false) }
})()
/** the gate's door: a frame of stiles and rails, rounded, and a panel of planks set back in it, both sides alike */
function GateLeaf({ w, h, y }: { w: number; h: number; y: number }) {
  const S = 0.07, T = 0.075
  const parts: { at: [number, number, number]; size: [number, number, number]; up: boolean }[] = [
    { at: [-(w - S) / 2, h / 2, 0], size: [S, h, T], up: true },
    { at: [(w - S) / 2, h / 2, 0], size: [S, h, T], up: true },
    ...[S / 2, h * 0.52, h - S / 2].map((ry) => ({ at: [0, ry, 0] as [number, number, number], size: [w - 2 * S + 0.004, S, T * 0.9] as [number, number, number], up: false })),
  ]
  return (
    <group position-y={y}>
      {parts.map((pt, i) => (
        <group key={i} position={pt.at}>
          <mesh castShadow>
            <primitive object={gateGeo(...pt.size, 0.012)} attach="geometry" />
            <meshToonMaterial color="#e8cfa6" map={pt.up ? GATE_WOOD.up : GATE_WOOD.across} />
          </mesh>
          <mesh scale={[1 + 0.008 / pt.size[0], 1 + 0.008 / pt.size[1], 1.15]}>
            <primitive object={gateGeo(...pt.size, 0.012)} attach="geometry" />
            <meshBasicMaterial color="#3b2a20" side={THREE.BackSide} />
          </mesh>
        </group>
      ))}
      {/* the panels, upper and lower, of upright boards with dark joints between, set back in the frame */}
      {[[S, h * 0.52 - S / 2], [h * 0.52 + S / 2, h - S]].map(([a, b], i) => (
        <group key={i} position-y={(a + b) / 2}>
          <mesh>
            <boxGeometry args={[w - 2 * S, b - a, T * 0.4]} />
            <meshToonMaterial color="#d2b48a" map={GATE_WOOD.up} />
          </mesh>
          {[-1, 0, 1].map((k) => [1, -1].map((sd) => (
            <mesh key={`${k}${sd}`} position={[k * (w - 2 * S) / 4, 0, sd * T * 0.21]} rotation-y={sd > 0 ? 0 : Math.PI}>
              <planeGeometry args={[0.006, b - a]} />
              <meshBasicMaterial color="#5a3a22" />
            </mesh>
          )))}
        </group>
      ))}
    </group>
  )
}
export const BarGate = memo(BarGateImpl)
