import { memo, useEffect, useMemo, useRef } from 'react'
import { NO_RAY } from '@/scene/interact/pickable'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { StaticBatch } from '@/scene/render/StaticBatch'
import { Koban } from '@/shops/grill/decor/Koban'
import { OwnLuckyCat } from '@/shops/grill/decor/OwnLuckyCat'
import { LuckyCat } from '@/shops/grill/decor/LuckyCat'
import { Movable } from '@/shops/grill/editor/Movable'
import { rainAmbience } from '@/shops/grill/sounds/restroomSound'
import { FLOOR } from '@/scene/props/floors'
import { FIGURES, nameOver, GENKAN } from '@/shops/grill/bar'
import { ALONG } from './walking'
import { crestNorenTexture } from './decorTex'
import { ShopFront, DOOR_SPILL, SPILL_IN, SPILL_OUT, DOOR_OPEN, RAIN_NOW, doorLight, DOOR_RUN, DOOR_INV, GenkanDoor } from './shopFront'
import { BIG_HANG, NorenModel, NOREN_REACH, NOREN_PUSH, NOREN_FOLD, NOREN_UNDER, NOREN_GOING, DOOR_GAP, norenBreeze, type ClothUniforms, NOREN_BIG, NOREN_WIDE, NOREN_CORD, CHOCHIN_PAIR, CHOCHIN_OFF, Chochin, FISH_LANTERN_OUT, FishLantern } from './lanterns'
import { ShoeVases, CAT_STAND_Z, SHOE_CAB_Z, SHOE_CAB_X, ShoeCupboard, CAT_TOP, FELT_TOP, DOOR_CATS, CatStand } from './genkan'
import { KASA_AT, KasaStand, RainGearWarm } from './seats'
import { DoorBambooHit, DoorBambooModel } from '@/shops/grill/decor/BarFurnish'
import { BlobShadow } from '@/scene/effects/BlobShadow'
/** where the door's bamboo stands (the doorway's frame: x along the front, + toward the north wall; z out to the street): its box's foot
 * on the street's ground right of the way in, under the eave, up against the building's side (item 707, the owner's 「幫我貼齊，然後有點陰影」:
 * its rim 2 mm off the facade's dark side panel); out to the street 0.30 so its culms stand in front of the door's frame, not hidden behind
 * its post (item 728, the owner's 「竹往前，不被門吃掉」) (blender/bamboo.py's AT, the same) */
const DOOR_BAMBOO_AT: [number, number, number] = [0.692, -0.46, 0.622]
const DOOR_BAMBOO_SAYS = nameOver('【門口植栽】青竹', '燒杉木箱裡的一叢青竹，迎客，也替門口擋一點街上的目光')

/**
 * The way in: a noren hanging just past the end of the bar, three panels that sway a little.
 */
// (drawn again only if the door's place or the shop's mark changes: the bar above it redraws several times a second while the shop's open, and
// the way in is a dozen pieces, each in edit mode's wrapper)
export const Entrance = memo(EntranceImpl, (a, b) => a.mark === b.mark && a.at.equals(b.at))
function EntranceImpl({ at, mark }: { at: THREE.Vector3; mark: string }) {
  const lantern = mark === '聞野' ? '燒' : mark
  // (the rain heard inside while it rains (item 623), let go with the shop)
  const rainHum = useMemo(() => rainAmbience(), [])
  useEffect(() => {
    if (import.meta.env?.DEV) Object.assign(window, { __rainHum: rainHum, __rainNow: RAIN_NOW })
    return () => rainHum.stop()
  }, [rainHum])
  // (the grill's noren reads 烤魚, the shop's trade, with a fish on it; the other shops' name their own)
  const tex = useMemo(() => crestNorenTexture(mark), [mark])
  const panels = useRef<(THREE.Mesh | null)[]>([])
  const yaw = Math.atan2(ALONG.x, ALONG.z)
  // (hung high, its rod well over a customer's head: they duck through only its hem)
  // (the doorway wide, its middle a little off the way in toward the till: the wall's close on the other side)
  const W = 1.05, H = 2.14, DX = -0.12
  // (the rod and cloth hung out toward the doorway's own line, not back in the room)
  const NZ = 0.27
  // (pushed aside by whoever walks through under it, the panels they pass swung away from them and back after (item 203: it hung on, still,
  // as they went through it); which way each was pushed kept while someone's under it, set by the side they came from)
  // (item 559, the owner's 「門前的簾子，飄的不自然」: each panel swung whole, a board on a hinge, all the time in a steady sine, though it
  // hangs inside the shut door: now each swings as a pendulum of cloth (its angle `a`, how fast it's going `av`), held by whoever pushes it;
  // the door shut, the shop's still air only breathing on it; slid open, the street's air in through it leaning it in, in gusts; the cloth
  // bent and rippling by its own shader (NorenModel's: clothVertex); one walking out folds it out through the open way below the lintel (`f`,
  // `fv`), where before they went through it (it can't swing out past 0.07 for the leaves)
  // (`d0`, `s`, `lx0`: the panel's side in the door's frame and how its own x runs there, `at` the lintel's underside down it (0..1): found
  // as one starts to push it out; `sy` how much longer it's drawn than its own depth (the noren's scale): it's swung and folded in the
  // world's measure, so it keeps its length as it goes (turned in its own, it came up short, a fifth at a push))
  const cloth = useRef([0, 1, 2].map(() => ({ a: 0, av: 0, f: 0, fv: 0, d0: 0, s: 1, lx0: 0, at: 0.35, sy: 1 })))
  const side = useRef([0, 0, 0])
  const at3 = useMemo(() => new THREE.Vector3(), [])
  const doorTo = useMemo(() => new THREE.Matrix4(), [])
  // (who has it: one going through the way in (out or in along it, faster than NOREN_GOING), or one stood right under it; one only sat or
  // stood by it doesn't (the bar's end seat, 0.21 in from its line: since item 203 its guest held two panels pushed out the whole evening,
  // and turned them the wrong way as the next came in); each one's place along the way in, when, how fast they're going along it (smoothed),
  // kept from frame to frame (one gone forgotten); the figures run by the map's own forEach, its callbacks made once (item 374))
  const goers = useMemo(() => new Map<THREE.Object3D, { z: number; t: number; v: number }>(), [])
  const scan = useMemo(() => ({ m: null as THREE.Mesh | null, bb: null as THREE.Box3 | null, leaves: 0, near: 0, from: 0, now: 0, p: new THREE.Vector3() }), [])
  const { track, forget, reach } = useMemo(() => ({
    track: (_r: unknown, o: THREE.Object3D) => {
      if (!o.visible) return
      const z = o.getWorldPosition(scan.p).applyMatrix4(DOOR_INV).z, now = scan.now
      const g = goers.get(o)
      if (!g) { goers.set(o, { z, t: now, v: 0 }); return }
      if (now <= g.t) return
      g.v += ((z - g.z) / (now - g.t) - g.v) * Math.min(1, (now - g.t) / 0.15)
      g.z = z; g.t = now
    },
    forget: (_g: unknown, o: THREE.Object3D) => { if (!FIGURES.has(o)) goers.delete(o) },
    // (in the panel's own frame: across it, and out in front of it or behind; how near the nearest one with it is; one out past the door's
    // leaves only through the door, as open as it is (one stood outside waiting for it to open pushed it through the shut door))
    reach: (_r: unknown, o: THREE.Object3D) => {
      const m = scan.m!, bb = scan.bb!
      if (!o.visible) return
      const q = m.worldToLocal(o.getWorldPosition(scan.p))
      if (q.x < bb.min.x - NOREN_REACH * 0.5 || q.x > bb.max.x + NOREN_REACH * 0.5) return
      if (Math.abs(q.z) > NOREN_UNDER && Math.abs(goers.get(o)?.v ?? 0) < NOREN_GOING) return
      let k = 1 - Math.min(1, Math.abs(q.z) / NOREN_REACH)
      if (q.z > scan.leaves) k *= DOOR_OPEN.k
      if (k > scan.near) { scan.near = k; scan.from = q.z }
    },
  }), [goers, scan])
  useFrame(({ clock }, dt0) => {
    const t = clock.elapsedTime
    const dt = Math.min(dt0, 0.1)
    doorLight(dt)
    // (the rain heard inside (item 623): fuller with the way in's door open, a little more from up under the roof)
    rainHum.set(RAIN_NOW.k, DOOR_OPEN.k, FLOOR.up ? 1 : 0)
    scan.now = t
    FIGURES.forEach(track)
    goers.forEach(forget)
    // (the door's frame to the world: where its leaves stand, for each panel)
    doorTo.copy(DOOR_INV).invert()
    panels.current.forEach((m, i) => {
      if (!m) return
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox()
      const bb = m.geometry.boundingBox!
      const c = cloth.current[i]
      const u = m.userData.cloth as ClothUniforms | undefined
      // (its measures: how much longer it's drawn than its depth; where the door's leaves stand out in front of it, its own z)
      m.getWorldScale(at3); c.sy = at3.z > 1e-6 ? at3.y / at3.z : 1
      if (u) u.uSy.value = c.sy
      scan.m = m; scan.bb = bb; scan.near = 0; scan.from = 0
      scan.leaves = m.worldToLocal(at3.set(DOOR_GAP.x[1], DOOR_GAP.lintel * 0.5, DOOR_GAP.leaves).applyMatrix4(doorTo)).z
      FIGURES.forEach(reach)
      const near = scan.near, from = scan.from
      if (near <= 0) side.current[i] = 0
      else if (side.current[i] === 0) {
        side.current[i] = from >= 0 ? 1 : -1
        // (one coming to push it out: its sides in the door's frame, and the lintel's underside in its own)
        if (side.current[i] < 0 && u) {
          const ym = (bb.min.y + bb.max.y) / 2
          const d0 = at3.set(bb.min.x, ym, 0).applyMatrix4(m.matrixWorld).applyMatrix4(DOOR_INV).x
          const d1 = at3.set(bb.max.x, ym, 0).applyMatrix4(m.matrixWorld).applyMatrix4(DOOR_INV).x
          const s = (d1 - d0) / Math.max(1e-3, bb.max.x - bb.min.x)
          c.d0 = d0; c.lx0 = bb.min.x; c.s = Math.abs(s) < 0.1 ? 1 : s
          m.worldToLocal(at3.set((d0 + d1) / 2, DOOR_GAP.lintel, 0.3).applyMatrix4(doorTo))
          c.at = Math.min(0.9, Math.max(0.05, (u.uTop.value - at3.y) / u.uLen.value))
        }
      }
      // (the air at it: the door shut, the shop's own, a breath; slid open, the street's in through it, leaning it in (the way in's inside:
      // its hem swung back, a +), in gusts)
      const open = DOOR_OPEN.k
      const air = norenBreeze(t, i) * (0.25 + 0.75 * open)
      // (pushed the way they're going, the hem swung away from them: while their body has it (the hem on their side of where they hold it),
      // brought there quickly; let go, it swings free, a pendulum its own length (about 1.6 s a swing), back past where it hangs and back
      // again, settling in a few swings)
      const push = side.current[i] * NOREN_PUSH * near
      const held = push > 0 ? c.a < push : push < 0 ? c.a > push : false
      c.av += (held ? 70 * (push - c.a) - 9 * c.av : 16 * (0.045 * open + 0.022 * air - c.a) - 2.2 * c.av) * dt
      c.a += c.av * dt
      // (its hem kept in from the sliding door's leaves, 8 cm out past it (item 410): swung out no more than 0.07)
      if (c.a < -0.07) { c.a = -0.07; if (c.av < 0) c.av = 0 }
      if (!u) { m.rotation.x = c.a; return }
      u.uSwing.value = c.a
      // (one walking out: below the lintel, it's folded out through the open way ahead of them as they come to it (their hand and head
      // before them: begun 0.3 off, all of it 0.1 off; one only stood nearer than the push's reach doesn't), quickly; let go, it swings back
      // down and settles; where a leaf's before it (the moving one as it runs, the fixed one), it stays in, eased over 12 cm)
      const ahead = Math.min(1, Math.max(0, (near - 0.4) / 0.4))
      const out = push < 0 ? NOREN_FOLD * ahead * ahead * (3 - 2 * ahead) : 0
      const folding = out > 0 && c.f < out
      c.fv += (folding ? 110 * (out - c.f) - 13 * c.fv : -20 * c.f - 3.2 * c.fv) * dt
      c.f += c.fv * dt
      if (c.f < -0.12) { c.f = -0.12; if (c.fv < 0) c.fv = 0 }
      const o0 = Math.max(DOOR_GAP.x[0], DOOR_GAP.x[1] + DOOR_RUN.GenkanDoorN * open)
      const fx = c.lx0 + (o0 - c.d0) / c.s
      u.uFold.value = c.f
      u.uFoldAt.value = c.at
      u.uFoldX.value.set(fx, fx + 0.12 / c.s)
      // (the cloth: billowed by the air (in, with the street's), its hem trailing behind as it swings (the way it's swinging, the other way
      // bent), a ripple running down it, more in the street's air and while it moves; its hem's outward reach kept to the door's 0.07 as well)
      const L = u.uLen.value * c.sy
      u.uBend.value = Math.max(-0.05, Math.min(0.022 * air - 0.012 * open + 0.05 * c.av, 0.06, L * (0.07 + c.a)))
      u.uRip.value = 0.001 + open * (0.003 + 0.003 * Math.abs(air)) + Math.min(0.012, 0.012 * Math.abs(c.av))
      u.uTime.value = t
    })
  })
  return (
    <group name="look-door" position={at} rotation-y={yaw}>
      {/* the shop's front over the way in: its eave, the beam and post, the band of the menu's lit boards, the lanterns' bar (item 300) */}
      {/* (the lanterns hung from it with it (item 441, the owner's 「上面燈籠跟燈座要連動」): the red one and the grill's from its bar, the big one from
          its eave, each still its own piece: moved, the front takes them along, as they hang from it) */}
      <Movable id="facade" label="門面"><ShopFront />
        <group position-x={DX}>
        <Movable id="chochin" label="紅燈籠"><group position={[-(W / 2 * NOREN_WIDE + 0.12) + 0.26 - CHOCHIN_OFF, H - 0.08 - 2.25, 0.47]}><Chochin mark={lantern} /></group></Movable>
        {/* (and the grill's own, cream, 炭火 on it, hung right beside the red one, on its far side from the doorway (the owner's: it hung on the
            doorway's other side)) */}
        <Movable id="chochin2" label="燒烤燈籠"><group position={[-(W / 2 * NOREN_WIDE + 0.12) + 0.26 - CHOCHIN_OFF - CHOCHIN_PAIR, H - 0.08 - 2.25, 0.47]}><Chochin mark={lantern} style="cream" /></group></Movable>
        {/* (and under the eave in the doorway's middle the big one, the shop's name 聞野 on it (item 300)) */}
        <Movable id="chochin-big" label="大紅燈籠"><group position={[0.26, BIG_HANG[0] - 2.25, BIG_HANG[1]]}><Chochin mark={mark} big /></group></Movable>
        </group>
      </Movable>
      {/* the sliding door in the doorway (item 410) */}
      <Movable id="genkandoor" label="玄關拉門"><GenkanDoor /></Movable>
      {/* (in edit mode the cats' stand, the shoe cupboard and the like can each be moved: each its own batch inside its own Movable) */}
      <Movable id="doorcats" label="門口招財貓台"><StaticBatch plain>
      {/* just inside, against the wall: a two-tier stand of dark wood, the beckoning cats on it facing those coming in */}
      <group position={[0.4, 0, CAT_STAND_Z]}>
        {/* (its back against the wall, 0.1 behind its middle: the lower tier deep, the upper shallow and narrower; and a third, the top, a
            step at the back of the upper one, for the koban (the owner's, 2026-11-12); that step deeper and shorter along the wall (the
            owner's, 2026-11-12: 'the third step thicker, its width shorter, the cats moved to either side of it'): 0.2 deep, 0.26 long, the
            two big cats either side of it); and lower, 0.14 over the upper tier where it was 0.24 (the owner's, 2026-11-14, item 96) */}
        {/* (a red felt (毛氈) laid over each step, hanging down its front, as under a festival's dolls; one model since item 736, the owner's
            「招財貓台的模型有點怪」: genkan.tsx's CatStand, blender/catstand.py) */}
        <CatStand />
      </group>
      </StaticBatch></Movable>
      {/* (each cat its own piece in edit mode, on the stand's frame) */}
      <group position={[0.4, 0, CAT_STAND_Z]}>
        {DOOR_CATS.map((k, i) => (
          <Movable key={i} id={`doorcat${i}`} label={`招財貓 ${i + 1}`}><StaticBatch plain>
            <group position={[k.x, k.y + FELT_TOP - 0.008, k.z]} rotation-y={-Math.PI / 2 + k.yaw}><LuckyCat kind={k.kind} height={k.h} still /></group>
          </StaticBatch></Movable>
        ))}
        {/* (a koban, the old oval gold coin, on its little stand, up on the top step (the owner's, 2026-11-12: a step more, the coin on top);
            bigger, the step lower (item 96)) */}
        <Movable id="koban" label="小判金幣"><group position={[0, CAT_TOP + FELT_TOP + 0.0005, 0]} rotation-y={-Math.PI / 2} scale={1.35}><Koban /></group></Movable>
        {/* (the shop's own beckoning cat, its paw going, in the middle of the first step between the two small ones, facing the way in
            (item 97, the owner's, 2026-11-14)) */}
        <Movable id="owncat" label="招財貓（招手）"><group position={[-0.22, 0.32 + FELT_TOP, 0]} rotation-y={-Math.PI / 2} scale={1.15}
          {...nameOver('招財貓', '本店的招財貓，舉著左手招客人進門')}><OwnLuckyCat /></group></Movable>
      </group>
      {/* (the samurai helmet (兜) that sat on the lower tier between the two small cats is on its own little stand by the staff's door now
          (the owner's, 2026-11-12): DiningRoom's) */}
      {/* (the coir doormat that lay on the genkan's stone is gone (the owner's, 2026-11-17: 「紅圈地毯移除要換成地毯，做成一片就好、大片一點、日式風格」,
          item 264): one larger rush rug in its place, part of the floor's model (blender/genkanfloor.py's GenkanRug)) */}
      <Movable id="shoecab" label="鞋櫃">
      {/* the shoe cupboard (下駄箱) against the wall in the genkan (blender/shoecab.py; the owner's: low, broad, walnut, louvred doors that
          open, sunk pulls): its doors swing open at a click to its empty cubbies; a vase of a sprig on its top */}
      {/* (7 mm up: the genkan's stones are domed now (item 265), their tops 6 mm over their joints, and its foot sat into them) */}
      <group position={[SHOE_CAB_X, -GENKAN.depth + 0.007, SHOE_CAB_Z]}>
        <group rotation-y={-Math.PI / 2}><ShoeCupboard /></group>
        {/* (three vases on its top, as a genkan's flowers are set (item 297, the owner's, 2026-11-17: 「上面多幾個花瓶」): the tall cream one with
            its plum a little off the middle, a squat celadon pot with a camellia toward the bench's end, a slim indigo bud vase with narcissus
            toward the door's; each flower a picture on one card (item 257's way), facing the room as the cupboard does) */}
        <ShoeVases />
      </group>
      </Movable>
      {/* (item 623, part three: the umbrella stand out on the step before the fixed leaf, the customers' umbrellas stood in it while they're in) */}
      <Movable id="kasatate" label="傘架" ground={KASA_AT[1]}><group position={KASA_AT}><KasaStand /></group></Movable>
      <RainGearWarm />
      {/* (item 703, the owner's 「這邊加上一株綠竹，要高的。」: a tall clump of green bamboo in a charred-cedar box out on the street's ground right
          of the way in, under the eave, beside the fish lantern (blender/bamboo.py, its branches and leaves kept clear of the lantern and the
          eave as measured there); only to look at: named when pointed at) */}
      <Movable id="doorbamboo" label="門口綠竹" ground={DOOR_BAMBOO_AT[1]}>
        <StaticBatch plain><group position={DOOR_BAMBOO_AT}><DoorBambooModel /></group></StaticBatch>
        {/* (and its soft shadow on the ground round its foot (item 707): the box and the clump over it standing on the street, not floating) */}
        <group position={DOOR_BAMBOO_AT}><BlobShadow r={0.27} /></group>
        <group position={DOOR_BAMBOO_AT}><DoorBambooHit {...DOOR_BAMBOO_SAYS} /></group>
      </Movable>
      <group position-x={DX}>
      {/* (the street's light out through the doorway, facing in only; and the day spilling in on the genkan's stones (item 306)) */}
      {/* (past the door, nothing: the street that stood out there (items 360, 386) taken away, item 397 (the owner's 「戶外景拿掉好了」): from out
          round the shop its power pole stood up out of the night past the restrooms (item 396, 「這是甚麼? 2F嗎?」)) */}
      {/* (from as far in as it was out to the sill's outer edge, under the leaves (item 448): SPILL_IN, SPILL_OUT past the noren's line) */}
      <mesh position={[0, -GENKAN.depth + 0.012, NZ + (SPILL_OUT - SPILL_IN) / 2]} rotation-x={-Math.PI / 2} material={DOOR_SPILL} renderOrder={2} raycast={NO_RAY}><planeGeometry args={[W * 0.95, SPILL_OUT + SPILL_IN]} /></mesh>
      {/* the doorway: the noren's rod, and the red lantern hung by the doorway on the bar's side */}
      {/* (the red lantern, its own piece: hung by its own cord) */}
      {/* (the lanterns at the door don't fade when they're in the way, as the room's hangings do: they're outside, and it left them a ghost
          from inside (the owner's)) */}
      {/* (the pair 5 cm further from the doorway than they were, for the sliding door's two leaves (item 415): the red one's paper bulged into the
          doorway, and the leaves had to stop short of it, the way left open narrower than a customer) */}
      {/* (and beyond it the fish lantern, a round one with a fish hung under it (the owner's, after their photograph of one)) */}
      {/* (turned a quarter round, its fish's side to the street, and a little bigger: 1.15 times (the owner's: 1.3, then a little smaller)) */}
      <Movable id="fishlantern" label="魚燈" baseTurn={[0, -90, 0]} baseScale={1.15}><group position={[(W / 2 * NOREN_WIDE + 0.12) + FISH_LANTERN_OUT, H - 0.08, 0.47]} scale={0.85}><FishLantern /></group></Movable>
      {/* the noren: three panels side by side, hung from a bamboo rod under the lintel, the rod by a cord at each end from the beam above */}
      <Movable id="noren" label="門簾" blocks>
        {/* (fades when it stands between the camera and what's looked at, as the other hangings do: see OccluderFade) */}
        <group userData={{ fadeOccluder: true }}>
          {/* (the pole laid on the lintel's brackets, no cords; the cloth longer than it was, as wide as the doorway so it stays clear of the walls) */}
          <group position-y={NOREN_CORD}>
          <group position={[0, H - 0.05, NZ]} scale={[NOREN_WIDE, NOREN_BIG * 1.05, 1]}><NorenModel tex={tex} panels={panels} pole="wood" /></group>
          </group>
        </group>
      </Movable>
      </group>
    </group>
  )
}
