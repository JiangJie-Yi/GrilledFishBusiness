import { bottleClink, boxThud, canClatter, throwWhoosh } from '@/shops/grill/sounds/restroomSound'
import { landingOf } from '@/game/service/spills'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { StaticBatch, type BatchParts } from '@/scene/render/StaticBatch'
import { glowLeave, glowOff, glowOn, glowOnly } from '@/scene/interact/hoverGlow'
import { BOSS_DRINK, BOSS_FX } from '@/shops/grill/staff/Boss'
import { depthOf } from '@/game/stock/drinkStock'
import { FRIDGE_AT, FRIDGE_STATE, FRIDGE_STOCK, FRIDGE_UNITS, isCan, moveDrink, moveOut, pullOut, putBack, tableHit, type DrinkId } from '@/shops/grill/bar'
import { getEdit } from '@/shops/grill/edit'
import { aimTip, setTip } from '@/scene/interact/hoverTip'
import { TIP_AXIS, SPIN_AXIS, TIP_Q, SPIN_Q, ROLL_R, LEAN_AXIS, TUMBLE_Q, TUMBLE_UP, SLIDE_FRICTION, BOUNCE_KEEP, THROW_X, THROW_Z, LIFT_BOX, LIFT_AT, SHELF_TILT, riseAt, SLIDE_S, bakedShelves, drinkName, floorAt, breakBottle, KIND_OF } from './drinkKinds'
import { rankStep, shelfTall, shelfSize, shelfLayout } from './shelves'
import { DrinkBottle, DrinkBottleLite } from './bottles'

/**
 * A fridge's drinks, each in its place on its shelf (FRIDGE_STOCK): one tidy row to a shelf, every label to the door.
 * Customers empty places as they take their drinks, the shop puts one back every so often, and any drink can be dragged,
 * with the door open: to another place (an empty one, or swapping with the drink there), or right out onto the floor
 * before the fridge, and back in again later.
 */
export const FridgeStock = memo(FridgeStockImpl)
function FridgeStockImpl({ n = 0 }: { n?: number }) {
  const root = useRef<THREE.Group>(null)
  const { camera, gl, raycaster, scene } = useThree()
  const controls = useThree((st) => st.controls) as unknown as { enabled: boolean } | null
  const [, setVer] = useState(0)
  const seen = useRef(-1)
  const objs = useRef(new Map<string, THREE.Group>())
  const dragKey = useRef<string | null>(null)
  // (the bottles on the shelves are drawn in one batch with the ranks behind them; each place is pointed at by an unseen stand-in, lit
  // round when the pointer's on it, and the bottle that's picked up drawn on its own while it's carried)
  const [lifted, setLifted] = useState<string | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  const [raised, setRaised] = useState<string | null>(null)
  // (the bottle carried out of its place, drawn on its own in it, lit while it's carried)
  useEffect(() => {
    if (!lifted) return
    const g = objs.current.get(lifted)
    glowOn(g)
    return () => glowOff(g)
  }, [lifted])
  const shelves = FRIDGE_UNITS[n].shelves
  const slotAt = (r: number, k: number) => new THREE.Vector3(shelfLayout(n, r).xs[k], shelves[r].y + riseAt(0.16), 0.16)
  // (each place's drinks sliding down into the place of the one taken from its front: how many fewer, since when; and how many it held)
  const slides = useRef(new Map<string, { from: number; count: number }>())
  const had = useRef(new Map<string, number>())
  const hadVer = useRef(-1)
  const [, setSliding] = useState(0)
  const doorOpen = () => FRIDGE_STATE[n].open || FRIDGE_STATE[n].passing > 0
  // (what the shelves' batch was made with: each place's drink, an empty one as the drink that's its own (its home), so a place emptied and
  // filled again (a customer's drink taken, the stocker's carried out) is only hidden and shown in the batch; only a place holding another
  // drink than it was made with (one dragged across, two swapped) makes it again. Made again at every change before, both fridges' hundred
  // and sixty bottles, it was a stall each time a customer took a drink)
  const [baked, setBaked] = useState(() => bakedShelves(n))
  const batch = useRef<BatchParts | null>(null)
  const shown = useRef<{ now: string; api: BatchParts | null }>({ now: '', api: null })
  useFrame((_, dt) => {
    if (seen.current !== FRIDGE_STOCK.ver) {
      seen.current = FRIDGE_STOCK.ver
      setVer((v) => v + 1)
      if (FRIDGE_STOCK.units[n].some((row, r) => row.some((id, k) => id !== null && id !== baked[r]?.[k]))) setBaked(bakedShelves(n))
    }
    // (each place's bottles shown or hidden in the batch as the stock is now: as many as stand in it, from the front back, the shelf sloping
    // down to the front (the owner's, 2026-11-11: as a convenience store's; before, they stood from the back wall forward and the front one
    // taken left a gap); the front one hidden while it's pointed at or carried, drawn on its own then; and a place whose drinks are sliding
    // down, all of it hidden, drawn on its own (SlideRun) till they're down)
    // (only when the stock's changed: not every frame)
    if (hadVer.current !== FRIDGE_STOCK.ver) {
      hadVer.current = FRIDGE_STOCK.ver
      FRIDGE_STOCK.units[n].forEach((row, r) => row.forEach((id, k) => {
        const key = `${r}-${k}`, c = id ? FRIDGE_STOCK.counts[n][r][k] : 0, before = had.current.get(key)
        had.current.set(key, c)
        if (before !== undefined && c > 0 && c < before && id === baked[r]?.[k]) { slides.current.set(key, { from: before - c, count: c }); setSliding((v) => v + 1) }
      }))
    }
    const api = batch.current
    const now = `${FRIDGE_STOCK.ver}|${lifted}|${raised}|${slides.current.size ? [...slides.current.keys()].join(',') : ''}`
    if (api && (shown.current.now !== now || shown.current.api !== api)) {
      shown.current = { now, api }
      FRIDGE_STOCK.units[n].forEach((row, r) => row.forEach((id, k) => {
        const deep = depthOf(baked[r]?.[k]), count = id ? FRIDGE_STOCK.counts[n][r][k] : 0, key = `${r}-${k}`, sliding = slides.current.has(key)
        for (let j = 0; j < deep; j++) api.show(`p${r}-${k}-${j}`, !sliding && j < count && !(j === 0 && (lifted === key || raised === key)))
      }))
    }
    // (what's out: on the floor before the fridge, or set down on a table, upright, where it was put)
    const host = root.current
    // (those broken as they landed this frame: taken out of what's out once it's gone through them)
    const broken: number[] = []
    if (host) {
      host.updateWorldMatrix(true, false)
      FRIDGE_STOCK.out.forEach((o, i) => {
        const g = objs.current.get(`o${i}`)
        if (!g || o.unit !== n || dragKey.current === `o${i}`) return
        if (o.w) {
          g.position.copy(host.worldToLocal(new THREE.Vector3(o.w[0], o.w[1], o.w[2])))
          g.quaternion.copy(host.getWorldQuaternion(new THREE.Quaternion()).invert())
        } else {
          // (down on the boards' real top (floorAt), not the fridge's own floor a centimetre under it (the owner's: nothing laid on the floor
          // sinks into it)): found once where it's put down, however it got there
          if (o.base === undefined) { const w = host.localToWorld(new THREE.Vector3(o.x, 0, o.z)); o.base = host.worldToLocal(w.setY(floorAt(scene, w))).y }
          // (thrown (item 248): it goes the way it was thrown, through the air tumbling end over end, then sliding on the boards till their
          // friction stops it; kept before the fridge, between the tables (against their edge it stops short, a little back the way it came))
          if (o.vx !== undefined || o.vz !== undefined) {
            const h = Math.min(dt, 0.05)
            o.x += (o.vx ?? 0) * h
            o.z += (o.vz ?? 0) * h
            if (Math.abs(o.x) > THROW_X) { o.x = THREE.MathUtils.clamp(o.x, -THROW_X, THROW_X); o.vx = -(o.vx ?? 0) * 0.2 }
            if (o.z < THROW_Z[0] || o.z > THROW_Z[1]) { o.z = THREE.MathUtils.clamp(o.z, THROW_Z[0], THROW_Z[1]); o.vz = -(o.vz ?? 0) * 0.2 }
            if (o.fy === undefined) {
              const s = Math.hypot(o.vx ?? 0, o.vz ?? 0), d = Math.max(0, s - SLIDE_FRICTION * h)
              if (d < 0.03) { o.vx = undefined; o.vz = undefined; o.base = undefined; o.lift = undefined }
              else { o.vx = ((o.vx ?? 0) * d) / s; o.vz = ((o.vz ?? 0) * d) / s }
            }
          }
          if (o.spin !== undefined && o.fy !== undefined) o.ang = (o.ang ?? 0) + o.spin * Math.min(dt, 0.05)
          // (let go in mid-air, it falls: gravity, and a small bounce on the floor)
          if (o.fy !== undefined) {
            o.fell = Math.max(o.fell ?? 0, o.fy)
            o.vy = (o.vy ?? 0) - 9.8 * Math.min(dt, 0.05)
            o.fy += o.vy * Math.min(dt, 0.05)
            if (o.fy <= 0) {
              o.fy = 0
              // (what landing does to it (game/spills), the first time it lands from this fall, from as high as it fell (the fridge's own
              // frame is in metres): a glass bottle from high enough breaks, its shards and its drink left on the floor where it hit (Spills),
              // till a server sweeps it up; a can's knocked over and rolls, clanking)
              if (!o.hit) {
                o.hit = true
                const at = host.localToWorld(new THREE.Vector3(o.x + (o.roll ?? 0), 0, o.z))
                // (thrown, it hits harder than its height alone: its speed along as much more fall again (item 248: thrown hard, a glass
                // bottle breaks as one let fall from high)
                const along2 = (o.vx ?? 0) ** 2 + (o.vz ?? 0) ** 2
                const land = landingOf(KIND_OF[o.id], (o.fell ?? 0) + (along2 / (2 * 9.8)) * 0.6)
                if (land === 'shatter') { broken.push(i); breakBottle(o.id, at.setY(floorAt(scene, at)), host.getWorldScale(LIFT_AT).y); return }
                if (KIND_OF[o.id] === 'glass' && along2 > 0.5) bottleClink(false, at)
                // (it tumbled over in the air (more than a quarter turn from upright, or still turning hard): it lands on its side)
                if (o.spin !== undefined) {
                  const a = ((o.ang ?? 0) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)
                  if ((Math.abs(Math.sin(a)) > 0.5 || Math.cos(a) < 0 || o.spin > 6) && !o.tipped) { o.tipped = true; o.tip = 0; o.roll = 0 }
                  o.spin = undefined; o.ang = undefined
                }
                if (land === 'roll' && !o.tipped) { o.tipped = true; o.tip = 0; o.roll = 0; canClatter(at) }
                // (a paper pack: onto its side with a dull thud of board (a box doesn't roll); a little drop, a softer one)
                if (KIND_OF[o.id] === 'pack') {
                  if (land === 'topple' && !o.tipped) { o.tipped = true; o.tip = 0; o.roll = 0 }
                  boxThud(at, land === 'topple' ? 1 : 0.5)
                }
              }
              // (landing: a hard fall from high enough can't keep it upright, a tall bottle least of all: it tips over, and rolls)
              if (!o.tipped && o.vy < -2.2 && Math.random() < Math.min(0.95, (o.fell ?? 0) * 0.9 + 0.15)) { o.tipped = true; o.tip = 0; o.roll = 0 }
              // (a bounce keeps some of its way along, the rest lost to the floor)
              if (o.vx !== undefined) o.vx *= BOUNCE_KEEP
              if (o.vz !== undefined) o.vz *= BOUNCE_KEEP
              if (o.vy < -0.8) o.vy = -o.vy * 0.25
              else { o.fy = undefined; o.vy = undefined; o.fell = 0 }
            }
          }
          if (o.tipped) {
            // (over on its side in about half a second, rolling a hand's width while it goes, slowing)
            const tip = Math.min(Math.PI / 2, (o.tip ?? 0) + dt * 4)
            o.tip = tip
            const box = KIND_OF[o.id] === 'pack'
            const roll = box ? 0 : Math.min(0.22, (o.roll ?? 0) + dt * 0.5 * (1 - tip / (Math.PI / 2) + 0.15))
            o.roll = roll
            g.position.set(o.x + roll, (o.fy ?? 0) + (o.base ?? 0), o.z)
            // (over toward the room, then rolling sideways along the floor, turning about its own length as it goes: the roll was turned about
            // the same axis as the fall, tipping it on past lying flat, its neck down into the floor)
            g.quaternion.copy(TIP_Q.setFromAxisAngle(TIP_AXIS, tip)).multiply(SPIN_Q.setFromAxisAngle(SPIN_AXIS, -roll / ROLL_R))
            // (its lowest point on the floor, whatever its girth and however it's turned (the owner's, 2026-11-10: a ramune lying down sank half
            // into the boards: it was raised a fixed 2.6 cm, a slim bottle's half width): measured each frame while it goes over and rolls,
            // kept once it lies still)
            const still = tip >= Math.PI / 2 && (box || roll >= 0.22) && o.fy === undefined
            if (!still || o.lift === undefined) {
              const lift = restLift(g, host, (o.fy ?? 0) + (o.base ?? 0))
              if (still) o.lift = lift
              g.position.y += lift
            } else g.position.y += o.lift
          } else if (o.ang !== undefined && o.ax !== undefined) {
            // (tumbling in the air about its own middle, end over end the way it flies)
            const mid = shelfTall(o.id) / 2
            TUMBLE_Q.setFromAxisAngle(LEAN_AXIS.set(o.ax, 0, o.az ?? 0), o.ang)
            g.quaternion.copy(TUMBLE_Q)
            g.position.set(o.x, (o.fy ?? 0) + (o.base ?? 0) + mid, o.z).sub(TUMBLE_UP.set(0, mid, 0).applyQuaternion(TUMBLE_Q))
          } else {
            g.position.set(o.x, (o.fy ?? 0) + (o.base ?? 0), o.z)
            g.quaternion.identity()
          }
        }
      })
    }
    if (broken.length) {
      for (const i of broken.sort((a, b) => b - a)) FRIDGE_STOCK.out.splice(i, 1)
      FRIDGE_STOCK.ver++
    }
    // (what's been taken is put back by the stocker, carried out from the back (GuestBar3D's stocker), not by itself)
  })
  type From = { kind: 'slot'; r: number; k: number } | { kind: 'out'; i: number }
  /**
   * How far a drink lying on the floor (in front of the fridge: its own frame's y `floor`) is to be raised so its lowest point is on it: its
   * box measured round its own vertices as it's turned now (a bottle on its side touches the floor with its body, a can with its rim),
   * in the fridge's frame; 0 if it's not down in it
   */
  const restLift = (g: THREE.Object3D, host: THREE.Object3D, floor: number) => {
    g.updateMatrixWorld(true)
    LIFT_BOX.setFromObject(g, true)
    if (LIFT_BOX.isEmpty()) return 0
    const floorWorld = host.localToWorld(LIFT_AT.set(0, floor, 0)).y
    const below = floorWorld - LIFT_BOX.min.y
    return below > 0 ? below / host.getWorldScale(LIFT_AT).y : 0
  }
  /**
   * The real top of whatever's under a point set down on a table (tableHit has each table at one height; where a top stands a little higher
   * or lower than that, a drink set down there hung in the air (the owner's)): a short ray straight down there, against only what's near it
   * (not the whole scene, nor the figures, nor the drinks themselves, nor anything unseen): its y, or the table's own if nothing's found
   */
  const surfaceAt = (p: THREE.Vector3, skip: THREE.Object3D | null) => {
    const from = p.clone().setY(p.y + 0.3), near: THREE.Object3D[] = []
    const c = new THREE.Vector3(), s = new THREE.Sphere()
    const under = (o: THREE.Object3D) => { for (let a: THREE.Object3D | null = o; a; a = a.parent) if (a === skip) return true; return false }
    scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh || !m.visible || (m as THREE.SkinnedMesh).isSkinnedMesh || !m.geometry) return
      const mat = m.material as THREE.Material
      if (!mat || (mat.transparent && !mat.depthWrite) || (mat as THREE.MeshBasicMaterial).colorWrite === false) return
      if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere()
      s.copy(m.geometry.boundingSphere!).applyMatrix4(m.matrixWorld)
      c.copy(s.center).setY(from.y)
      if (c.distanceTo(from) > s.radius + 0.05 || s.center.y - s.radius > from.y || under(m)) return
      near.push(m)
    })
    const rc = new THREE.Raycaster(from, new THREE.Vector3(0, -1, 0), 0, 0.6)
    const hit = rc.intersectObjects(near, false).find((h) => h.face && h.face.normal.clone().transformDirection(h.object.matrixWorld).y > 0.7)
    return hit && Math.abs(hit.point.y - p.y) < 0.25 ? hit.point.y : p.y
  }
  const begin = (from: From, ev: { stopPropagation: () => void; ray?: THREE.Ray }) => {
    // (edit mode is for the scene alone)
    if (getEdit().on) return
    // (a drink in the fridge only with its door open: the glass is in the way otherwise)
    if (from.kind === 'slot' && !doorOpen()) return
    ev.stopPropagation()
    if (from.kind === 'out') { const o = FRIDGE_STOCK.out[from.i]; if (o) { o.tipped = false; o.tip = 0; o.roll = 0; o.lift = undefined; o.vx = o.vz = o.spin = o.ang = undefined } }
    // (lifted from its place among the others: its clink against them)
    const lifting = from.kind === 'slot' ? FRIDGE_STOCK.units[n][from.r]?.[from.k] : null
    if (lifting) bottleClink(isCan(lifting), FRIDGE_AT[n])
    // (held by its own middle, however tall it is (the owner's, 2026-11-10: it was held 11 cm up whatever it was, a can hung under the pointer
    // and jumped as it was taken hold of))
    const held = lifting ?? (from.kind === 'out' ? FRIDGE_STOCK.out[from.i]?.id : null)
    const mid = held ? shelfTall(held) / 2 : 0.11
    const key = from.kind === 'slot' ? `${from.r}-${from.k}` : `o${from.i}`
    const grp = objs.current.get(key)
    const host = root.current
    if (!grp || !host) return
    if (controls) controls.enabled = false
    document.body.classList.add('is-carrying')
    const plane = new THREE.Plane()
    let onTable: THREE.Vector3 | null = null
    // (item 248, the owner's, 2026-11-17: 「飲料從冰箱甩出去沒感覺」: where it's been the last tenth of a second, out on the level, for how
    // fast and which way it's going: it leans that way as it's carried (its weight felt), and let go moving, it's thrown so)
    const trail: { t: number; x: number; y: number; z: number }[] = []
    const trailV = () => {
      const a = trail[0], b = trail[trail.length - 1]
      if (!a || !b || b.t - a.t < 16 || performance.now() - b.t > 90) return new THREE.Vector3()
      const s = (b.t - a.t) / 1000
      return new THREE.Vector3((b.x - a.x) / s, (b.y - a.y) / s, (b.z - a.z) / s)
    }
    let leanX = 0, leanZ = 0
    dragKey.current = key
    if (from.kind === 'slot') setLifted(key)
    // (carried on a level through where it was picked up (the owner's: on the fridge's upright front alone it lagged and swung off from the
    // pointer, seen from above, and stopped dead at the fridge's sides): wherever the pointer's ray meets that level, it's right there, a
    // little up; in front of the fridge's own outline it's on the fridge's front, to go into a place on another shelf)
    // (held by its middle, `mid` up from its foot: the pointer stays on the bottle's middle, not its foot)
    host.updateWorldMatrix(true, false)
    // (the level a little above where it was, so what it's carried over isn't run into; it stays on the pointer)
    const level = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(grp.localToWorld(new THREE.Vector3(0, mid, 0)).y + 0.05))
    const heldMid = new THREE.Vector3(0, -mid, 0)
    // (on the fridge's front, held where it was taken hold of: it stays just where it was under the pointer, moved from there (it jumped to
    // have its middle on the pointer, before); once out past the fridge's outline, by its middle, as it is on the level)
    const frontPlane = () => {
      const nrm = new THREE.Vector3(0, 0, 1).transformDirection(host.matrixWorld)
      return new THREE.Plane().setFromNormalAndCoplanarPoint(nrm, host.localToWorld(new THREE.Vector3(0, 0.7, 0.2)))
    }
    // (`grip`: the point it was taken hold of, on its own upright through its middle (where it stands in its place, those in front of it
    // taken), from its foot: that point kept on the pointer's ray as it's carried, on the fridge's front)
    let grip: THREE.Vector2 | null = null
    if (from.kind === 'slot' && ev.ray && lifting) {
      const nrm = new THREE.Vector3(0, 0, 1).transformDirection(host.matrixWorld)
      const own = new THREE.Plane().setFromNormalAndCoplanarPoint(nrm, host.localToWorld(new THREE.Vector3(0, 0.7, grp.position.z - backOf(from.r, from.k, lifting))))
      const at = ev.ray.intersectPlane(own, new THREE.Vector3())
      if (at) { const q = host.worldToLocal(at); grip = new THREE.Vector2(q.x - grp.position.x, q.y - grp.position.y) }
      // (brought out to the front at once, along its own place (those in front of it are gone), that point still on the pointer: on the
      // screen it only comes a little nearer, it doesn't jump)
      const front = grip && ev.ray.intersectPlane(frontPlane(), new THREE.Vector3())
      if (grip && front) { const q = host.worldToLocal(front); grp.position.set(q.x - grip.x, q.y - grip.y, 0.2) }
    }
    // (lit while it's carried, as everything picked up is: one off the floor now; one out of a place once the bottle carried is drawn in it
    // (the effect on `lifted`))
    if (from.kind === 'out') glowOn(grp)
    const move = (e: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect()
      raycaster.setFromCamera(new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1), camera)
      host.updateWorldMatrix(true, false)
      plane.copy(frontPlane())
      const front = raycaster.ray.intersectPlane(plane, new THREE.Vector3())
      const onFront = front ? host.worldToLocal(front.clone()) : null
      const inFridge = !!onFront && Math.abs(onFront.x) < 0.45 && onFront.y > 0.02 && onFront.y < 1.62
      const flat = inFridge ? null : raycaster.ray.intersectPlane(level, new THREE.Vector3())
      const hit = inFridge ? front : flat
      // (out of the fridge, over a table: it goes down on the table, standing upright, wherever the pointer is (the level it's carried on is
      // the shelf's, often over the tables' tops: the ray met it first and it was never over one); on the fridge's front, a table nearer)
      const th = tableHit(raycaster.ray)
      onTable = th && (!inFridge || !hit || th.distanceTo(raycaster.ray.origin) < hit.distanceTo(raycaster.ray.origin)) ? th : null
      // (down on the top that's really there, not the table's height as reckoned)
      if (onTable) onTable.y = surfaceAt(onTable, root.current)
      // (carried within the boss's reach, set down where he'd come for it or held right over him: he glows, to say it's for him)
      const boss = scene.getObjectByName('BossFollow')
      if (boss && !BOSS_DRINK.at) {
        const bp = boss.getWorldPosition(new THREE.Vector3())
        const mid = bp.clone().add(new THREE.Vector3(0, 0.6, 0))
        BOSS_FX.hover = (!!onTable && bp.setY(onTable.y).distanceTo(onTable) < 3) || raycaster.ray.distanceToPoint(mid) < 0.6
      } else BOSS_FX.hover = false
      if (onTable) {
        grp.position.copy(host.worldToLocal(onTable.clone()))
        grp.quaternion.copy(host.getWorldQuaternion(new THREE.Quaternion()).invert())
        return
      }
      grp.quaternion.identity()
      if (inFridge && onFront) { grp.position.set(onFront.x - (grip?.x ?? 0), onFront.y - (grip?.y ?? mid), 0.2); return }
      if (!flat) return
      grip = null
      grp.position.copy(host.worldToLocal(flat)).add(heldMid)
      const now = performance.now()
      trail.push({ t: now, x: grp.position.x, y: grp.position.y, z: grp.position.z })
      while (trail.length > 2 && now - trail[0].t > 110) trail.shift()
      // (leaning the way it's carried, the top ahead of the hand, as far as it's going fast (a half radian at most), eased)
      const v = trailV()
      leanX += (v.x - leanX) * 0.35
      leanZ += (v.z - leanZ) * 0.35
      const sp = Math.hypot(leanX, leanZ)
      if (sp > 0.05) grp.quaternion.setFromAxisAngle(LEAN_AXIS.set(leanZ / sp, 0, -leanX / sp), Math.min(0.5, sp * 0.09))
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      document.body.classList.remove('is-carrying')
      if (controls) controls.enabled = true
      dragKey.current = null
      setLifted(null)
      BOSS_FX.hover = false
      glowOff(grp)
      grp.quaternion.identity()
      if (onTable) {
        const w: [number, number, number] = [onTable.x, onTable.y, onTable.z]
        grp.position.set(0, 0, 0)
        if (from.kind === 'slot') pullOut(n, [from.r, from.k], 0, 0.5, w)
        else moveOut(from.i, w)
        // (set down near the boss: it's for him, and he comes over and drinks it)
        const boss = scene.getObjectByName('BossFollow')
        const item = from.kind === 'slot' ? FRIDGE_STOCK.out[FRIDGE_STOCK.out.length - 1] : FRIDGE_STOCK.out[from.i]
        if (boss && item && !BOSS_DRINK.at && boss.getWorldPosition(new THREE.Vector3()).setY(onTable.y).distanceTo(onTable) < 3) {
          BOSS_DRINK.at = onTable.clone(); BOSS_DRINK.id = item.id; BOSS_DRINK.item = item; BOSS_DRINK.arrived = false
          // (handed him: a flash of the glow)
          BOSS_FX.glowAt = performance.now()
        }
        return
      }
      const px = grp.position.x, py = grp.position.y, pz = grp.position.z
      // (let go on the fridge's front, within it: into a place; out in front of it on the level, it's out)
      const inside = Math.abs(px) < 0.4 && py > 0.1 && py < 1.62 && Math.abs(pz - 0.2) < 0.12
      // (dropped on the nearest place within reach: moved or swapped; out past the fridge's sides or down to the floor, stood
      // on the floor; anywhere else, back where it was)
      let best: [number, number] | null = null
      let bestD = 0.1
      for (let rr = 0; rr < shelves.length; rr++) {
        for (let kk = 0; kk < shelves[rr].ids.length; kk++) {
          const sp = slotAt(rr, kk)
          const d = Math.hypot(sp.x - px, sp.y - py)
          if (d < bestD) {
            bestD = d
            best = [rr, kk]
          }
        }
      }
      const home = from.kind === 'slot' ? slotAt(from.r, from.k) : new THREE.Vector3(FRIDGE_STOCK.out[from.i].x, 0, FRIDGE_STOCK.out[from.i].z)
      grp.position.copy(home)
      if (inside && best) {
        if (from.kind === 'slot' && (best[0] !== from.r || best[1] !== from.k)) moveDrink(n, [from.r, from.k], best)
        else if (from.kind === 'out') putBack(from.i, n, best)
      } else if (!inside) {
        const x = THREE.MathUtils.clamp(px, -1.2, 1.2)
        // (where it was let go, out before the fridge; let go against its front, a little out from it, the others' places taken in turn)
        const z = pz > 0.35 ? Math.min(pz, 1.6) : 0.5 + 0.13 * (FRIDGE_STOCK.out.filter((o) => o.unit === n).length % 3)
        let idx = from.kind === 'out' ? from.i : -1
        if (from.kind === 'slot') {
          pullOut(n, [from.r, from.k], x, z)
          idx = FRIDGE_STOCK.out.length - 1
        } else {
          FRIDGE_STOCK.out[from.i].x = x
          FRIDGE_STOCK.ver++
        }
        // (let go above the floor, it drops from there; where it's to come down, found again (`base`: the frame below))
        const o = FRIDGE_STOCK.out[idx]
        if (o) o.base = undefined
        if (o && py > 0.03) {
          o.fy = py
          o.vy = 0
          o.fell = py
          o.hit = false
          // (let go moving, it's thrown (item 248): on the way it was going and as fast (6 m/s at most), up a little as a throw goes,
          // tumbling end over end about the way it flies, as fast as it was thrown; fast, the air's heard past it)
          const v = trailV(), sp = Math.hypot(v.x, v.z)
          if (sp > 0.6) {
            const k = Math.min(1, 6 / sp)
            o.vx = v.x * k; o.vz = v.z * k
            o.vy = Math.min(2.2, sp * k * 0.3)
            o.spin = Math.min(14, sp * k * 3.2); o.ang = 0; o.ax = v.z / sp; o.az = -v.x / sp
            o.x = px; o.z = Math.max(THROW_Z[0], pz)
            if (sp > 2.2) throwWhoosh(host.localToWorld(new THREE.Vector3(px, py, pz)), (sp - 2) / 4)
          }
          // (what's out moved there; a place's own stays at its place, its others still in it)
          if (from.kind === 'out') grp.position.set(o.x, py, o.z)
        }
      }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  const reg = (key: string) => (g: THREE.Group | null) => { if (g) objs.current.set(key, g); else objs.current.delete(key) }
  const bakedKey = baked.map((row) => row.join(',')).join('|')
  // (made once for what it was baked with, so the stock changing doesn't redraw the hundred and sixty bottles under the batch)
  const ranks = useMemo(() => baked.map((row, r) => row.map((id, k) => {
    // (as many as the place holds (game/drinkStock's depthOf), front to back, straight back, square, each its own depth and 5 mm apart (the
    // owner's: neat rows; they were set a hair askew)), each a part of the batch of its own: shown while it's there)
    const sp = new THREE.Vector3(shelfLayout(n, r).xs[k], FRIDGE_UNITS[n].shelves[r].y, 0.16), step = rankStep(id)
    // (laid in from the back wall forward: the glass and the drinks in it are see-through, drawn in the order they're merged, so the ones
    // behind first and those in front over them (the owner's, 2026-11-10: the front ones first, the ones behind showed over them, their
    // shoulders out of place through the front ones'))
    // (each up the slope as far back as it stands, leaning back with the shelf; those behind the front one a little plainer: through the glass
    // and the front one only their shoulders and labels show (the owner's: the ranks behind as light to draw as they can be))
    const deep = depthOf(id)
    return Array.from({ length: deep }, (_, i) => deep - 1 - i).map((j) => (
      <group key={`p${r}-${k}-${j}`} position={[sp.x, shelves[r].y + riseAt(sp.z - step * j), sp.z - step * j]} rotation-x={SHELF_TILT} userData={{ batchPart: `p${r}-${k}-${j}` }}>
        <DrinkBottleLite id={id} back={j > 0} deep={j > 1} />
      </group>
    ))
  })), [baked, n])
  /** how far back in its place its front one stands now: none, those behind slide down to the front (the shelf slopes) */
  const backOf = (_r: number, _k: number, _id: DrinkId) => 0
  return (
    <group ref={root}>
      {FRIDGE_STOCK.units[n].map((row, r) => row.map((id, k) => id && (
        <group key={`${r}-${k}`} ref={reg(`${r}-${k}`)} name={`drink-${n}-${r}-${k}`}
          position={slotAt(r, k).toArray()} onPointerDown={(ev) => begin({ kind: 'slot', r, k }, ev)}
          onPointerOver={(ev) => { ev.stopPropagation(); if (doorOpen()) { document.body.style.cursor = 'pointer'; setHover(`${r}-${k}`); setRaised(`${r}-${k}`) } aimTip(ev); setTip({ title: drinkName(id), hint: doorOpen() ? '拖出來，放到桌上或客人面前' : '先點櫃門打開' }) }}
          onPointerOut={() => { document.body.style.cursor = ''; setHover((h) => (h === `${r}-${k}` ? null : h)); setTip(null) }}>
          {/* (what the pointer finds: the bottle's size, unseen) */}
          <mesh position-y={shelfTall(id) / 2} visible={false}><boxGeometry args={[shelfSize(shelves[r].ids[k])[0] + shelfLayout(n, r).gap * 0.9, shelfTall(id) + 0.02, 0.06]} /></mesh>
          {/* (pointed at, or carried: the very bottle on the shelf (the shelf's own, not a finer one: the owner's, 2026-11-10: it changed under
              the pointer), lit as anything pointed at is, where it stands in its place) */}
          {/* (drawn after the shelves' batch (its group's order): see-through as it is, the bottles behind it under it, not over it) */}
          <group renderOrder={1} rotation-x={SHELF_TILT}>
            {lifted === `${r}-${k}` ? <DrinkBottleLite id={id} /> : raised === `${r}-${k}` && (
              <HoverLit active={hover === `${r}-${k}`} onDone={() => setRaised((x) => (x === `${r}-${k}` ? null : x))}>
                <group position-z={-backOf(r, k, id)}><DrinkBottleLite id={id} /></group>
              </HoverLit>
            )}
          </group>
        </group>
      )))}
      {/* (the front bottles and the ranks behind each, packed shoulder to shoulder back to the fridge's back wall, as a shop's shelves are:
          one batch, each place's front bottle and ranks a part of it, hidden while the place is empty (and the front one while it's carried);
          a hair of play in each so the rows aren't ruled) */}
      <StaticBatch key={`ranks${n}|${bakedKey}`} parts={batch}>{ranks}</StaticBatch>
      {[...slides.current].map(([key, sl]) => {
        const [r, k] = key.split('-').map(Number), id = baked[r]?.[k]
        if (!id) return null
        return <SlideRun key={`slide${key}`} id={id} count={Math.min(sl.count, depthOf(id))} from={sl.from} x={shelfLayout(n, r).xs[k]} y={shelves[r].y} step={rankStep(id)}
          onDone={() => { slides.current.delete(key); setSliding((v) => v + 1) }} />
      })}
      {/* (what's been taken out, stood on the floor before the fridge) */}
      {FRIDGE_STOCK.out.map((o, i) => o.unit === n && (
        <group key={`o${i}-${o.id}`} ref={reg(`o${i}`)} name={`drink-out-${n}-${i}`} position={[o.x, 0, o.z]} onPointerDown={(ev) => begin({ kind: 'out', i }, ev)}
          onPointerOver={(ev) => { document.body.style.cursor = 'grab'; glowOnly(ev.eventObject); aimTip(ev); setTip({ title: drinkName(o.id), hint: '拖曳移動，放回櫃子或遞給客人' }) }} onPointerOut={(ev) => { document.body.style.cursor = ''; glowLeave(ev.eventObject); setTip(null) }}>
          <DrinkBottle id={o.id} wet />
        </group>
      ))}
    </group>
  )
}
/** a place's drinks sliding down the shelf (`count` of them, `from` places further back than they'll stand), drawn on their own while they do
 * (the shelves' batch has them hidden), handed back once they're down (`onDone`) */
function SlideRun({ id, count, from, x, y, step, onDone }: { id: DrinkId; count: number; from: number; x: number; y: number; step: number; onDone: () => void }) {
  const g = useRef<THREE.Group>(null)
  const t = useRef(0)
  const done = useRef(false)
  useFrame((_, dt) => {
    t.current += Math.min(dt, 0.05)
    const k = Math.min(1, t.current / SLIDE_S), e = k * k * (3 - 2 * k)
    g.current?.children.forEach((c, j) => {
      const z = 0.16 - step * (j + from * (1 - e))
      c.position.set(x, y + riseAt(z), z)
    })
    if (k >= 1 && !done.current) { done.current = true; onDone() }
  })
  return (
    <group ref={g}>
      {Array.from({ length: count }, (_, j) => (
        <group key={j} rotation-x={SHELF_TILT}><DrinkBottleLite id={id} back={j > 0} deep={j > 1} /></group>
      ))}
    </group>
  )
}
/**
 * A bottle the pointer's on, as everything else pointed at answers (the owner's): drawn on its own, lit in its place, as anything that can
 * be picked up is (scene/hoverGlow); put out as the pointer leaves, and then handed back to the shelf's batch (`onDone`). It was lifted 2 cm
 * and made 3% larger as well (the owner's, 2026-11-10: no rising, only the glow), and before that a glowing tube 25 cm tall round it.
 */
function HoverLit({ active, onDone, children }: { active: boolean; onDone: () => void; children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null)
  const done = useRef(onDone)
  done.current = onDone
  useEffect(() => {
    const o = g.current
    if (!active) { done.current(); return }
    if (!o) return
    glowOnly(o)
    return () => glowLeave(o)
  }, [active])
  return <group ref={g}>{children}</group>
}
