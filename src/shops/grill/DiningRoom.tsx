import { BambooHit, BambooModel } from '@/shops/grill/decor/BarFurnish'
import { memo, Suspense, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { StaticBatch } from '@/scene/render/StaticBatch'
import { GENKAN, fridgesOf, farOf, storeOf, STORE, FRIDGE, WC_W, lampsAlong, RICE_MAT, type Counter } from './bar'
import { EditBlock, Movable } from '@/shops/grill/editor/Movable'
import { CatClock } from '@/shops/grill/decor/CatClock'
import { Kabuto } from '@/shops/grill/decor/Kabuto'
import { WP, NORMAL, WALL_H, WALL_T, BASE_DEPTH, WAINSCOT, SEIGAIHA_TILE, SEIGAIHA, Box, WC_H, WallPiece } from './dining/base'
import { type ArtKey, ART_ZH, PRINTS, SCROLLS, Framed, KOI_SAYS, BIJIN_SAYS, BAMBOO_SAYS, Scroll } from './dining/art'
import { Sudare, RoundShoji, ROUND_AT, WindowDust, RoundWindow } from './dining/roundWindow'
import { MenuTags } from './dining/menuTags'
import { WallSigns } from './dining/wallSigns'
import { ToiletPanel, ToiletHit, ToiletDoor } from './dining/wc'
import { STORE_POST, STORE_HEAD, StoreRoom } from './dining/storeRoom'
import { CornerSupplies } from './dining/supplies'
import { STAFF_W, KSTAND_H, KSTAND_OFF, KSTAND_ALONG, OUTING_T, OUTING_ALONG, OutingPhoto, KabutoStandModel, StaffDoor } from './dining/staffDoor'
import { KamiCopy } from './dining/shrine'
import { Pendant } from './dining/pendant'
import { ALTAR_SCALE, ALTAR_D, ALTAR_Y, AltarTable, Altar } from './dining/altar'
import { SakeStack, WillowModel, LAMP_DROP } from './dining/props'
import { MilkCrate, DrinkCartons, SakeHit, CrateBoxes, CrateBottles } from './dining/crates'
import { WallSpeaker } from './dining/speaker'
import { ExitSign } from './dining/exitSign'
import { GENKAN_SWITCH, SWITCH_STEP, WC_POST_FACE, LightSwitch, DoubleSwitch } from './dining/switches'
import { RiceSacks } from './dining/riceSacks'

/**
 * One counter's stretch of the room: the wall behind its aisle (from/to along it, in the counter's own frame), and
 * pendant lamps over it.
 */
function DiningWallImpl({ c, from, to, far, lampId, lampName, top, door, altar = false, clear = [], corner = false, hang = [], staffDoor, store, genkanDrop }: { c: Counter; from: number; to: number; far: number
  /** (the first counter's wall, along the genkan's side) how far the genkan's stone lies under the room's floor: its wainscot carried on
   * down to it along the genkan (item 539, the owner's 「這塊拿掉」: a low curb of stone stood there under the wall, seen from the street
   * as a course of thin stones under the shoe cupboard; gone, the wall's foot stood over a slot) */
  genkanDrop?: number
  /** the stock room behind it (items 430, 431): its doorway (the clear opening along it), its two ends along it, how deep it is behind the
   * wall's face, and the fridges set into the wall (each its stretch along it) */
  store?: { door: [number, number]; room: [number, number]; deep: number; fridges: [number, number][] }
  /** prints hung here as well, where asked (along it) */
  hang?: { z: number; print: ArtKey }[]
  /** a staff-only door here (its middle, along it): nothing hung over it */
  staffDoor?: number
  /** the first of the room's two walls, whose start is the corner they meet in: its thickness runs on to close the corner, to where the other
   * wall's face truly is (along it) if given (its start, a hair beyond, is where its pictures and lamps are laid out from) */
  corner?: boolean | number
  /** stretches of it (along it) where something stands against it: nothing hung there, no post */
  clear?: [number, number][]
  /** its shelf an altar instead (by the door), and the omiki (御神酒) offered at it: when it was poured, and offering it again */
  altar?: boolean | { pouredAt: number | null; onPour: () => void }
  /** its pendant lamps' edit ids (this, then their number) and their name in the list (each counter's its own) */
  lampId: string
  lampName: string
  /** the bar top's height, where the lamps' light falls */
  top: number
  /** where along it the sliding door to the toilet is, if it has one */
  door?: number
  }) {
  const yaw = Math.atan2(c.along.x, c.along.z)
  const meetAt = typeof corner === 'number' ? corner : from
  const l = to - from
  const mid = (from + to) / 2
  // the wall's stretches: whole, or with the toilets' doorways left open (as high as their frames' lintel)
  const spans = useMemo(() => {
    let out: number[][]
    if (door === undefined) out = [[from, to, 0]]
    else {
      const g0 = door - WC_W - 0.12, g1 = door + WC_W + 0.12
      out = [[from, g0, 0], [door - 0.06, door + 0.06, 0], [g1, to, 0], [g0, g1, WC_H + 0.07]]
    }
    if (!store) return out
    // (the stock room's doorway, its frame's posts in it, and an opening behind each fridge, the fridge standing in front of it (items 430,
    // 431: it's filled through it from the stock room; it stood in it a while, item 515): through it, the wall over each from its top up)
    // (two fridges side by side one opening (item 554, the owner's 「中間這塊拿掉」: the 2 cm of wall left between them went with the post))
    const fr = [...store.fridges].sort((p, q) => p[0] - q[0]).reduce<number[][]>((acc, [a, b]) => {
      const last = acc[acc.length - 1]
      if (last && a - last[1] < STORE_POST) last[1] = Math.max(last[1], b)
      else acc.push([a, b, FRIDGE.H + 0.012])
      return acc
    }, [])
    const holes = [[store.door[0] - STORE_POST, store.door[1] + STORE_POST, STORE.doorH + STORE_HEAD], ...fr]
    for (const [a, b, top] of holes) {
      out = out.flatMap(([z0, z1, y0]) => (y0 !== 0 || z1 <= a || z0 >= b ? [[z0, z1, y0]] : [[z0, a, 0], [b, z1, 0]].filter(([p, q]) => q - p > 0.001)))
      out.push([a, b, top])
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, door, store?.door[0], store?.door[1], store?.fridges.map((f) => f.join()).join()])
  // (pictures along the wall, a print then a scroll in turn, about a metre apart, leaving the shelf's stretch clear)
  // (the shelf in the far third of the wall, or the near one if the door's in the far one)
  const shelfZ0 = door !== undefined && Math.abs(door - (mid + l * 0.3)) < 1.3 ? mid - l * 0.3 : mid + l * 0.3
  // (moved along the wall away from the toilets' door, the owner's wish: more room round it; on the back wall only a little toward the way
  // in, the lucky cats and the shoe cupboard under it moved along with it, clear of the door)
  const shelfZ = shelfZ0 + (door !== undefined ? Math.sign(shelfZ0 - door) || 1 : 1) * (door !== undefined ? 0.35 : 0.05)
  // (the wall with the toilets has the fridge and the doors' sliding along it: no shelf there)
  const shelf = door === undefined
  const isClear = (z: number, pad: number) => clear.every(([a, b]) => z < a - pad || z > b + pad)
  const art = useMemo(() => {
    // (in the bays between the posts, spaced evenly in each, never over a post or the shelf)
    const posts = [from, mid - l / 6, mid + l / 6, to]
    const start = Math.round(c.length * 3)
    const spots: number[] = []
    for (let b = 0; b < 3; b++) {
      const w = posts[b + 1] - posts[b]
      const n = Math.max(0, Math.floor(w / 0.95))
      for (let i = 0; i < n; i++) spots.push(posts[b] + (w / n) * (i + 0.5))
    }
    const kept = spots.filter((z) => (!shelf || Math.abs(z - shelfZ) > 0.85 * ALTAR_SCALE) && isClear(z, 0.3) && (door === undefined || Math.abs(z - door) > 0.95)
      && (door === undefined || Math.abs(z - door) > WC_W * 2 + 0.3))
    // (and on the back wall a second round window: the place nearest its spot)
    const extra = shelf && kept.length ? kept.reduce((m, z) => (Math.abs(z - ROUND_AT) < Math.abs(m - ROUND_AT) ? z : m), kept[0]) : null
    return kept
      .map((z, k) => ({ z, scroll: k % 2 ? SCROLLS[(start + k) % SCROLLS.length] : undefined, print: PRINTS[(start + k) % PRINTS.length],
        // (on the back wall, the plum scroll's place is a round window let into the plaster instead)
        round: (shelf && k % 2 === 1 && SCROLLS[(start + k) % SCROLLS.length] === 'plum') || z === extra,
        // (bare where a banner hung (every third place, but by the drinks fridges) and a big signboard (every fifth, between): they were taken
        // down (the owner's), their places still counted so the rest keep theirs)
        bare: z !== extra && ((k % 3 === 2 && isClear(z, 0.9)) || (k % 5 === 3 && k % 3 !== 2)) }))
      // (nothing where the staff's door is: taken out after the rest are given theirs, so they keep what they were)
      .filter((a) => staffDoor === undefined || Math.abs(a.z - staffDoor) > STAFF_W / 2 + 0.3)
      .concat(hang.map((h) => ({ z: h.z, scroll: undefined, print: h.print, round: false, bare: false })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [l, from, to, mid, shelfZ, c.length, door, shelf, clear, staffDoor, hang.map((h) => `${h.z}${h.print}`).join()])
  // (the menu's tags' stretch of wall (item 293): from past the round window's frame to short of the shrine's shelf)
  const tagSpan = useMemo(() => {
    const r = art.find((a) => a.round)
    if (!r) return null
    // (from 0.635 past the round window: the cat clock (item 477) hangs at 0.68, its right edge at 0.926 (tests/e2e/_wall471.mjs), and a
    // full first row of tags, centred on the stretch, came to 1.4 cm of it; now 4 cm)
    const a = r.z + 0.635, b = shelfZ - 0.61
    return b - a > 0.4 ? ([Math.min(a, b), Math.max(a, b)] as [number, number]) : null
  }, [art, shelfZ])
  // (the pictures just past the staff's door hung a little further along, clear of its frame (the owner's: the scroll there was right up
  // against it); each one's piece keeps its name, so where it's been moved by hand still holds)
  const nudgeArt = (z: number) => (staffDoor !== undefined && z > staffDoor && z - staffDoor < 1.6 ? 0.42 : 0)
  // (the supplies' place: the gap between the drinks fridges and the toilets' doorway on this wall; shrunk only if it's narrower than
  // the stack, about 0.55 across)
  const supplies = useMemo(() => {
    if (door === undefined || !clear.length) return null
    const g0 = door - WC_W - 0.12, g1 = door + WC_W + 0.12
    const below = clear.filter((r) => r[1] <= g0), above = clear.filter((r) => r[0] >= g1)
    const span = below.length ? [Math.max(...below.map((r) => r[1])), g0] : above.length ? [g1, Math.min(...above.map((r) => r[0]))] : null
    if (!span || span[1] - span[0] < 0.35) return null
    // (four centimetres' room either side, six: at four the toilet rolls on top touched the fridge's side (clips.mjs))
    const w = span[1] - span[0] - 0.12
    return { z: (span[0] + span[1]) / 2, k: Math.min(1, w / 0.56) }
  }, [door, clear])
  const frieze = useMemo(() => {
    if (!SEIGAIHA) return null
    const t = SEIGAIHA.clone()
    t.repeat.set(l / SEIGAIHA_TILE, 1)
    // (once down the band, no wrapping at its top and foot)
    t.wrapT = THREE.ClampToEdgeWrapping
    t.needsUpdate = true
    return t
  }, [l])
  // (the wall and all on it are hidden while the camera is round behind it)
  const wall = useRef<THREE.Group>(null)
  useFrame(({ camera }) => {
    const w = wall.current
    if (!w) return
    w.getWorldPosition(WP)
    const facing = NORMAL.set(-1, 0, 0).transformDirection(w.matrixWorld)
    w.visible = camera.position.clone().sub(WP).dot(facing) > 0
  })
  return (
    <group position={c.at} rotation-y={yaw}>
      {/* (local x is away from the cook: the wall stands at the floor's far edge, facing back toward the bar) */}
      <group ref={wall} position-x={-far} name="room-wall" userData={{ from, to, shelf, hideRoot: true }}>
        {/* (the wall stands in edit mode's way: a press on it doesn't go on through to what's behind it, the toilets', the lanterns
            out at the door (scene/pickable's blocksEdit); the pieces on it are still their own) */}
        <EditBlock>
        {/* (all of it standing still: drawn merged, a few meshes for the whole wall) */}
        <StaticBatch plain key={`${from}|${to}|${door}|${!!altar}|${spans.length}`}>
        {/* the plaster over the wainscot, open where the toilets' doors are (a strip between them, and over them) */}
        {/* (the wall's thickness: a slab behind it, the base's dark wood, full height, over the toilets' doorways only above them) */}
        {/* (down through the base's own thickness too, which stops at the room's outline, short of the wall's) */}
        {spans.map(([z0, z1, y0]) => {
          const lo = y0 > 0 ? y0 : -BASE_DEPTH
          const z0e = corner !== false && z0 === from ? meetAt - WALL_T - 0.012 : z0
          return (
            <mesh key={`t${z0}|${y0}`} position={[WALL_T / 2 + 0.012, (lo + WALL_H) / 2, (z0e + z1) / 2]}>
              <boxGeometry args={[WALL_T, WALL_H - lo, z1 - z0e]} /><meshToonMaterial color="#3d2414" />
            </mesh>
          )
        })}
        {/* (at the corner, the sliver between this wall's face and its slab where the other wall's slab ends: filled, so the two walls' tops
            meet without a slot) */}
        {corner !== false && (
          <mesh position={[0.006, (WALL_H - BASE_DEPTH) / 2, meetAt - 0.012 - WALL_T / 2]}>
            <boxGeometry args={[0.014, WALL_H + BASE_DEPTH, WALL_T + 0.002]} /><meshToonMaterial color="#3d2414" />
          </mesh>
        )}
        {spans.map(([z0, z1, y0]) => (
          <group key={`${z0}|${y0}`}>
            <WallPiece z0={z0} z1={z1} y0={Math.max(WAINSCOT, y0)} y1={WALL_H} plaster />
            {y0 < WAINSCOT && <WallPiece z0={z0} z1={z1} y0={0} y1={WAINSCOT} />}
          </group>
        ))}
        {/* (along the genkan, its boards on down to the genkan's stone, under the room's floor's line (item 539); hidden with the wall seen
            from outside, as the rest of it) */}
        {genkanDrop !== undefined && spans.filter(([z0, z1, y0]) => y0 === 0 && z1 > c.length / 2 + GENKAN.along[0] && z0 < c.length / 2 + GENKAN.along[1])
          .map(([z0, z1]) => {
            const a = Math.max(z0, c.length / 2 + GENKAN.along[0]), b = Math.min(z1, c.length / 2 + GENKAN.along[1])
            return <WallPiece key={`genkan${a}`} z0={a} z1={b} y0={-genkanDrop} y1={0} />
          })}
        {/* the rail over the wainscot and the beam along the top */}
        {/* (the rail broken where the toilets' doorways are) */}
        {/* (run right up to the doorways' frames (the owner's: these two sides weren't filled, the rail stopped short of the frames and the
            plaster showed between), and not across the little strip between the two doors) */}
        {spans.filter(([a, b, y0]) => y0 < WAINSCOT && b - a > 0.3).flatMap(([z0, z1]) => {
          const a = door !== undefined && z0 !== from ? z0 + 0.001 : z0, b = door !== undefined && z1 !== to ? z1 - 0.001 : z1
          // (and broken at the staff's door, short of its frame either side)
          const cut = staffDoor === undefined ? null : [staffDoor - STAFF_W / 2 - 0.07, staffDoor + STAFF_W / 2 + 0.07]
          const runs = cut && cut[0] < b && cut[1] > a ? [[a, cut[0]], [cut[1], b]].filter(([p, q]) => q - p > 0.02) : [[a, b]]
          return runs.map(([p, q]) => <Box key={`${z0}|${p}`} size={[0.05, 0.05, q - p]} color="#3a2416" position={[-0.02, WAINSCOT, (p + q) / 2]} />)
        })}
        <Box size={[0.08, 0.1, l]} color="#3a2416" position={[-0.03, WALL_H - 0.05, mid]} />
        {/* (the wall with the toilets: its own skirting along its foot, as the floor's edging was there (item 436, the owner's 「這條線拿掉」): the
            floor runs on out behind it now (item 423), and the edging left along the room's back edge was a dark line across the floor seen
            from behind, the wall hidden; here it hides with the wall. Where it lay: 2.56 cm out from the face, 2 cm high, its back in the face) */}
        {door !== undefined && spans.filter(([, , y0]) => y0 === 0).map(([z0, z1]) => (
          <Box key={`sk${z0}`} size={[0.0316, 0.02, z1 - z0]} color="#3a2416" position={[-0.0098, 0.01, (z0 + z1) / 2]} />
        ))}
        {/* (no upright posts along it) */}
        {/* a frieze of seigaiha waves under the beam, and the pictures hung along the plaster */}
        <mesh position={[-0.004, WALL_H - 0.2, mid]} rotation-y={-Math.PI / 2}>
          <planeGeometry args={[l, 0.2]} />
          <meshToonMaterial color="#ffffff" map={frieze} />
        </mesh>
        <Box size={[0.03, 0.025, l]} color="#3a2416" position={[-0.01, WALL_H - 0.31, mid]} />
        </StaticBatch>
        {/* (everything below is its own piece in a batch of its own, so each can be moved by hand when the shop's shut: key G) */}
        {art.filter((a) => !a.bare).map((a) => (
          <Movable key={a.z} id={`art${from.toFixed(1)}_${a.z.toFixed(2)}`} label={a.round ? '圓窗' : `${a.scroll ? '掛軸' : '畫'}（${ART_ZH[a.scroll ?? a.print]}）`}><StaticBatch plain>
            <group position={[0, a.round ? 1.4 : a.scroll ? 1.42 : 1.5, a.z + nudgeArt(a.z)]}>
              {a.round ? <RoundWindow /> : a.scroll ? <Scroll art={a.scroll} /> : <Framed art={a.print} />}
            </group>
          </StaticBatch>
          {/* (the moon's dust in its shaft by night, outside the batch: it drifts, and a batch's pieces stand still) */}
          {a.round && <group position={[0, 1.4, a.z + nudgeArt(a.z)]}><WindowDust /><RoundShoji /><Suspense fallback={null}><Sudare /></Suspense></group>}
          {/* (the beauty with her shamisen: only to look at (the owner's), named when pointed at, the cursor left an arrow) */}
          {/* (the koi print: only to look at, named when pointed at (the owner's, 2026-11-11)) */}
          {!a.round && !a.scroll && a.print === 'koi' && (
            <mesh visible={false} position={[-0.01, 1.5, a.z + nudgeArt(a.z)]} {...KOI_SAYS}><boxGeometry args={[0.02, 0.52, 0.66]} /></mesh>
          )}
          {a.scroll === 'bijin' && (
            <mesh visible={false} position={[-0.01, 1.42, a.z + nudgeArt(a.z)]} {...BIJIN_SAYS}><boxGeometry args={[0.02, 0.92, 0.34]} /></mesh>
          )}
          </Movable>
        ))}
        {/* (the cat wall clock (item 477, the owner's 「這邊增加一個喵咪掛鐘」): on the wall with the round window, right of it (the window's 40 cm
            round and its frame, a hand's gap, the clock's own 11), under the frieze (its ears' tips 11 cm under the frieze's foot), its back
            3 mm off the plaster) */}
        {art.filter((a) => a.round).slice(0, 1).map((a) => (
          <Movable key="catclock" id="catclock" label="貓咪掛鐘">
            <group position={[-0.003, 1.62, a.z + nudgeArt(a.z) + 0.68]} rotation-y={-Math.PI / 2}><Suspense fallback={null}><CatClock /></Suspense></group>
          </Movable>
        ))}
        {/* (the supplies in the corner between the drinks fridges and the toilets' doorway) */}
        {/* (stood a slot off the wall: the men's door, open, slides along behind them, not through them) */}
        {supplies && <Movable id="supplies" label="衛生紙與清潔用品"><group position={[-0.13, 0, supplies.z]} rotation-y={-Math.PI / 2} scale={supplies.k}><CornerSupplies /></group></Movable>}
        {/* (the staff's door, where asked: up the stairs behind it, 員工專用) */}
        {staffDoor !== undefined && <Movable id="staffdoor" label="員工專用門"><group position={[0, 0, staffDoor]}><StaffDoor /></group></Movable>}
        {/* (just past its frame, the little wooden stand and the samurai helmet on it, facing into the room (the owner's, 2026-11-12)) */}
        {/* (the photograph of everyone out together, on the plaster between the staff's door and the scroll (item 296)) */}
        {staffDoor !== undefined && <Movable id="outingphoto" label="員工旅遊合照">
          <group position={[-0.0135 - OUTING_T / 2, 1.52, staffDoor + OUTING_ALONG]}><OutingPhoto /></group>
        </Movable>}
        {/* (its doors slide (item 292): not in a batch, which would hold them still; it's drawn by material itself) */}
        {staffDoor !== undefined && <Movable id="kabutostand" label="頭盔木台">
          <group position={[-KSTAND_OFF, 0, staffDoor + KSTAND_ALONG]} rotation-y={-Math.PI / 2}><KabutoStandModel /></group>
        </Movable>}
        {/* (turned about to face into the room, its crest and visor toward the counter, and a quarter as big again (item 212, the owner's,
            2026-11-16: 「武士頭盔轉180度，放大1.25倍，Reset!」): its back was what the room saw) */}
        {/* (turned and grown about its own foot, so it stays sat on the stand: about the piece's middle it sank into the stand's top) */}
        {staffDoor !== undefined && <Movable id="kabuto" label="武士頭盔">
          {/* (its model's middle is off its own axis: turned about, it was carried 9 cm off where it stood and its foot 7 mm down into the stand;
              set back so its middle's where it was and it sits on the top) */}
          <group position={[-KSTAND_OFF - 0.0453, KSTAND_H + 0.0035, staffDoor + KSTAND_ALONG]} rotation-y={Math.PI / 2} scale={0.48 * 1.25}><Kabuto /></group>
        </Movable>}
        {/* (the exit sign on the frieze by the way out, its arrow and running figure toward the door at the wall's end) */}
        {altar && <Movable id="exitsign" label="逃生出口燈"><group name="look-exit" position={[-0.045, 2.08, to - 0.62]} rotation-y={-Math.PI / 2}><ExitSign /></group></Movable>}
        {/* (by the way in, at hand height, between the shoe cupboard and the corner: the room's light switch, and beside it the door's lanterns'
            (the owner's: moved from by the round window; neither puts out the exit sign, the emergency light)) */}
        {altar && <Movable id="lightswitch-room" label="店內電燈開關"><group position={[-0.002, 1.12, to - GENKAN_SWITCH]}><LightSwitch circuit="room" /></group></Movable>}
        {altar && <Movable id="lightswitch-door" label="門口燈籠開關"><group position={[-0.002, 1.12, to - GENKAN_SWITCH + SWITCH_STEP]}><LightSwitch circuit="door" /></group></Movable>}
        {/* (and each toilet's lights' switch, slim, on the post between the two doors, each on its own door's side of it (the owner's): beside
            each door's outer side the door slid open over it) */}
        {/* (one plate with two rockers, the men's and the women's, in the middle of the post (the owner's: two slim plates side by side
            showed a seam between them, their edges near the post's)) */}
        {door !== undefined && (
          <Movable id="wcswitch" label="廁所電燈開關">
            <group position={[-WC_POST_FACE - 0.002, 1.12, door]}><DoubleSwitch circuits={['wcM', 'wcF']} /></group>
          </Movable>
        )}
        {altar && <Movable id="altar" label="供桌" blocks><StaticBatch plain><group position={[(-ALTAR_D / 2) * ALTAR_SCALE, ALTAR_Y, shelfZ]} scale={ALTAR_SCALE}><AltarTable />
          {/* hung on the wall on two cloud brackets (雲形の棚受け, blender/kamidana.py's KamiBracket, the owner's after their photo): an arm under
              the shelf ending in a cloud's head, the cloud stepping back down to the plate on the wall, which runs on below to a rounded end */}
          {/* (half as long down the wall as they were (the owner's, 2026-11-11), from the shelf's underside) */}
          {[-0.35, 0.35].map((z) => <group key={z} position={[ALTAR_D / 2, -0.034, z]} scale-y={0.5}><KamiCopy part="bracket" /></group>)}</group></StaticBatch></Movable>}
        {/* (the visitors' signed boards, notes and photographs on the plaster over the shoe cupboard, by the way in (item 295)) */}
        {altar && <WallSigns end={to} />}
        {/* (the menu's wooden tags on the plaster between the round window and the shrine's shelf (item 293)) */}
        {altar && tagSpan && <Movable id="menutags" label="菜單木札"><MenuTags z0={tagSpan[0]} z1={tagSpan[1]} /></Movable>}
        {/* (the omiki poured, the motes rising over the shrine: not merged) */}
        {altar && <Movable id="altarfittings" label="供桌上的供品"><group name="look-altar" position={[(-ALTAR_D / 2) * ALTAR_SCALE, ALTAR_Y, shelfZ]} scale={ALTAR_SCALE}><Altar omiki={altar === true ? undefined : altar} /></group></Movable>}
        </EditBlock>
      </group>
      {/* the toilets: not part of the wall that's hidden from behind, so they're still there when the camera swings round to the back */}
      <group position-x={-far}>
        {/* (and the stock room, a wing of the house as the toilets' are (items 430, 431)) */}
        {store && <StoreRoom {...store} />}
        {/* the toilets, the men's and the women's, side by side */}
        {/* (their doors and frames, shut, stand in edit mode's way as the wall does: not chosen through) */}
        <EditBlock>
        {door !== undefined && (['m', 'f'] as const).map((who, k) => (
          <group key={who} position-z={door + (k ? 1 : -1) * (WC_W / 2 + 0.06)}><ToiletDoor who={who} /></group>
        ))}
        {/* (the toilets' doors slide: not merged) */}
        {door !== undefined && (['m', 'f'] as const).map((who, k) => (
          <group key={who} name={`look-wc-${who}`} position-z={door + (k ? 1 : -1) * (WC_W / 2 + 0.06)}><ToiletPanel who={who} /><ToiletHit who={who} /></group>
        ))}
        </EditBlock>
      </group>
      {/* pendant lamps over the bar's customer side, low: one between each two places, midway (the owner's: a lamp between one customer and
          the next; bar's lampsAlong), their bands 鱗 and 立涌 in turn */}
      {lampsAlong(c).map((z, i) => (
        <Movable key={i} id={`${lampId}${i}`} label={`吊燈（${lampName} ${i + 1}）`} blocks><group position-x={0.05} userData={{ fadeOccluder: 0.5 }}><Pendant z={z} drop={LAMP_DROP} pool={top} band={i % 2} /></group></Movable>
      ))}
    </group>
  )
}
function ShopPropsImpl({ counters }: { counters: Counter[] }) {
  const c0 = counters[0]
  const at = (along: number, lay: number) => c0.at.clone().addScaledVector(c0.along, along).addScaledVector(c0.lay, lay)
  // (their fronts toward the room's open side, where the camera is)
  const face = Math.atan2(-c0.lay.x, -c0.lay.z)
  const fr = useMemo(() => fridgesOf(counters), [counters])
  // (the crates and cartons, in the stock room: the bulb's shadows on them (item 729: they took none, item 476, the sun's kept off them))
  const cratesRef = useRef<THREE.Group>(null)
  // (and the sake barrels, as drawn: the sake's stock)
  const sake = useRef<THREE.Group>(null)
  const sakeLit = () => sake.current
  // (the corner where the room's two walls meet: the plant stands in it, a little in from both)
  const cornerAt = useMemo(() => {
    const along = Math.min(-c0.length / 2 - 0.35, ...counters.slice(1).map((o) => o.at.clone().addScaledVector(o.lay, farOf(o)).sub(c0.at).dot(c0.along)))
    return c0.at.clone().addScaledVector(c0.along, along + 0.42).addScaledVector(c0.lay, farOf(c0) + 0.42)
  }, [c0, counters])
  // (the speaker in the corner where the room's two walls meet (by the staff door), up under the frieze, turned to face down the room's
  // diagonal into the shop (the owner's: over the staff door, flat to the wall, it filled the space over the door); its arm reaching back
  // into the corner, wherever it's put)
  const speaker = useMemo(() => {
    const along = Math.min(-c0.length / 2 - 0.35, ...counters.slice(1).map((o) => o.at.clone().addScaledVector(o.lay, farOf(o)).sub(c0.at).dot(c0.along)))
    const p = c0.at.clone().addScaledVector(c0.along, along + 0.145).addScaledVector(c0.lay, farOf(c0) + 0.115)
    p.y += 1.55
    return { p, yaw: Math.atan2(c0.lay.x, c0.lay.z) }
  }, [c0, counters])
  // (the drinks' stock in the stock room now (item 430: its doorway's where they stood): along its back wall, the beer crates behind the near
  // fridge, the cartons behind the far one, the milk crates behind the doorway, seen through it (item 437); each against the back wall)
  const st = useMemo(() => storeOf(counters), [counters])
  // (packed along the back wall into its far corner, by the men's room (item 490, the owner's 「盡量靠牆角」): the beer crates 3 cm from the
  // room's end wall, the cartons beside them, the milk crates beside those, 3 cm between each stack (measured, tests/e2e/_store490.mjs: the
  // beer crates 0.43 across, the cartons 0.83, the milk crates' two stacks 0.73 from the first's middle); they were spread along it behind
  // the fridges and the doorway, 0.44 bare by the end)
  const crateAt = useMemo(() => (fr && st ? st.at(st.room[1] - 0.241, STORE.deep - 0.16) : new THREE.Vector3()), [fr, st])
  // (the milk crates of cold drinks (item 437): behind the doorway against the back wall, two stacked by the room's end, one beside them,
  // seen through the doorway; clear of the room's end (2.5 cm) and of the cartons (1.7 cm), their backs a centimetre off the wall)
  // (the stack of two 4 cm further from the single than they stood (item 437): the two had run 2.5 cm into each other)
  const milkAt = useMemo(() => (st ? [st.at(st.room[1] - 1.919, STORE.deep - 0.16), st.at(st.room[1] - 1.529, STORE.deep - 0.16)] : null), [st])
  // (the cartons' stack 0.44 deep: its back a centimetre off the back wall, not in its face)
  const cartonAt = useMemo(() => (fr && st ? st.at(st.room[1] - 0.894, STORE.deep - 0.23) : new THREE.Vector3()), [fr, st])
  return (
    // (each piece is its own batch inside its own Movable, so each can be moved by hand when the shop's shut: key G)
    // (not keyed by the language any more: that was for a mat with words on it, long gone, and each switch built all four again, their
    // copies, pictures and ink lines left behind each time)
    <>
      <Movable id="speaker" label="音箱" baseTurn={[0, 45, 0]} baseScale={0.82}><group position={speaker.p} rotation-y={speaker.yaw}><WallSpeaker /></group></Movable>
      {/* (one stack, standing where the two used to) */}
      {/* (on the rush mat (item 717): stood its thickness up, not sunk into it) */}
      <Movable id="sake" label="酒樽"><group ref={sake} position-y={RICE_MAT.t}><StaticBatch plain>
        <group position={at(3.55, 3.6)} rotation-y={face + 0.3}>
          <group rotation-y={Math.PI / 2}><SakeStack part={0} /></group>
        </group>
      </StaticBatch></group>
        <group position={at(3.55, 3.6)} rotation-y={face + 0.3}><group rotation-y={Math.PI / 2}><SakeHit lit={sakeLit} /></group></group>
      </Movable>
      {/* plants about the room: a willow by the sake barrels in the front corner; bamboo by the till's end, by the door
          (none against the side wall: the two drinks fridges stand there) */}
      {/* (its place and turn outside its batch: the object axes in edit mode follow the turn of what's inside a piece down to its first group
          of more than one thing, and a batch is two (the owner saw its object and world places read the same)) */}
      {/* (the sacks of rice beside the sake, between it and the willow (the owner's circle)) */}
      <Movable id="ricesacks" label="白米袋">
        <group position-y={RICE_MAT.t}><group position={at(3.5, 2.97)} rotation-y={face + 0.15}><RiceSacks /></group></group>
      </Movable>
      <Movable id="willow" label="柳樹">
        <group position={at(3.55, 2.95)} rotation-y={1.4} scale={0.9}><StaticBatch plain><WillowModel /></StaticBatch></group>
      </Movable>
      <Movable id="bamboo" label="竹盆栽"><StaticBatch plain>
        <group position={cornerAt} rotation-y={0.4}><BambooModel /></group>
      </StaticBatch>
        {/* (only to look at (the owner's): named when pointed at, the cursor left an arrow, a click does nothing) */}
        <group position={cornerAt} rotation-y={0.4}><BambooHit {...BAMBOO_SAYS} /></group>
      </Movable>
      {/* (the crates of red bottles and the cartons of cans, in the stock room behind the side wall now, along its back wall (item 430)) */}
      {fr && <Movable id="crates" label="酒箱"><group ref={cratesRef}><StaticBatch plain>
        <group position={crateAt} rotation-y={Math.atan2(counters[1].lay.x, counters[1].lay.z)}>
          <CrateBoxes />
        </group>
        {/* (the milk crates of cold drinks behind the doorway (item 437): standing still, in the batch with the beer crates) */}
        {milkAt && <>
          <group name="look-milkcrates" position={milkAt[0]} rotation-y={Math.atan2(counters[1].lay.x, counters[1].lay.z)}>
            <MilkCrate />
            <group position={[0.004, 0.25, -0.003]} rotation-y={0.035}><MilkCrate /></group>
          </group>
          <group position={milkAt[1]} rotation-y={Math.atan2(counters[1].lay.x, counters[1].lay.z) - 0.05}><MilkCrate /></group>
        </>}
      </StaticBatch>
        {/* (the bottles in the crates, out of the batch, as many as the back stock has; and beside them the cartons of canned drinks, as many as
            the back has cans for, laid out again as that changes (item 199): out of the batch too, which merges only what's there as it's
            made and hides the rest) */}
        <group position={crateAt} rotation-y={Math.atan2(counters[1].lay.x, counters[1].lay.z)}>
          <CrateBottles />
        </group>
        <group name="look-crates" position={cartonAt} rotation-y={Math.atan2(counters[1].lay.x, counters[1].lay.z) + 0.02}><DrinkCartons /></group>

      </group>
        {/* (the back stock's pointed at by the stock room's doorway now: what's running low, a click opens the drinks' stock) */}
      </Movable>}
    </>
  )
}

// (drawn again only when their own props change, not each time the page above them redraws: while the shop's open that's many times a second)
export const ShopProps = memo(ShopPropsImpl)
export const DiningWall = memo(DiningWallImpl)
