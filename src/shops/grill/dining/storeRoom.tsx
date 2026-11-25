import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { StaticBatch } from '@/scene/render/StaticBatch'
import { SIGN_FONT } from '@/scene/props/signFont'
import { STORE, STORE_STATE, WALL_OUT, FRIDGE_GAP, DRINK_BACK, setDrinkPanel, FRIDGE, handOver, WC_ROOM } from '@/shops/grill/bar'
import { EditBlock } from '@/shops/grill/editor/Movable'
import { getEdit } from '@/shops/grill/edit'
import { setTip } from '@/scene/interact/hoverTip'
import { canvasTex } from './base'
import { WcWall, WC_T, WcMass } from './wc'
import { drinkLabel, lowestBack } from './crates'

/** the stock room's doorway's frame (items 430): its posts' width in the wall's line, its head's height over the opening */
export const STORE_POST = STORE.post, STORE_HEAD = 0.07
/** the stock room's noren (a half-noren, to the stocker's shoulders): as wide as the frame's posts' outer sides (the doorway's as laid out,
 * item 467), and how long */
const STORE_NOREN_L = 0.6
/**
 * The stock room's noren (item 430, the owner's 「這邊挖空並加上掛簾，後面是小儲藏室，倉儲員工專用」): indigo cotton, the shop's back rooms'
 * plain kind: its top band darker where it's sewn over the rod; across its middle, where its two panels part, a white ring round 倉 (the
 * store), and under it in small spaced capitals STAFF ONLY; a white line along its hem; the cotton's weave. One picture over both panels.
 */
const storeNoren = (wide: number) => {
  const PX = 1024 / wide, H = Math.round(STORE_NOREN_L * PX)
  return canvasTex(1024, H, (g) => {
    const cloth = '#1f2f52'
    const band = Math.round(0.034 * PX), cy = Math.round(band + (H - band) * 0.43)
    g.save()
    g.fillStyle = cloth; g.fillRect(0, 0, 1024, H)
    g.globalAlpha = 0.06
    g.fillStyle = '#ffffff'
    for (let x = 0; x < 1024; x += 3) g.fillRect(x, 0, 1, H)
    g.fillStyle = '#000000'
    for (let y = 0; y < H; y += 3) g.fillRect(0, y, 1024, 1)
    g.globalAlpha = 1
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, 0, 1024, band)
    g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(0, band, 1024, 3)
    // (the ring and the character in it)
    g.strokeStyle = '#efe9dc'; g.lineWidth = 16
    g.beginPath(); g.arc(512, cy, 150, 0, Math.PI * 2); g.stroke()
    g.fillStyle = '#efe9dc'; g.textAlign = 'center'; g.textBaseline = 'middle'
    g.font = `700 200px ${SIGN_FONT}`
    g.fillText('倉', 512, cy + 8)
    g.font = '700 46px "Arial Black", sans-serif'
    ;(g as unknown as { letterSpacing: string }).letterSpacing = '14px'
    g.fillText('STAFF ONLY', 512, cy + 232)
    g.fillRect(0, H - Math.round(0.022 * PX), 1024, 5)
    g.restore()
  })
}
/** the noren's cloth for its width: both sides, its picture read from the room (the side toward the stock room mirrored, as a dyed cloth
 * is); made once for the doorway's width (it's laid out once, as the shop loads: no program made while it's open) */
const STORE_NOREN_MATS = new Map<number, THREE.MeshToonMaterial>()
function storeNorenMat(wide: number) {
  const k = Math.round(wide * 1000)
  let m = STORE_NOREN_MATS.get(k)
  if (!m) STORE_NOREN_MATS.set(k, (m = new THREE.MeshToonMaterial({ color: '#ffffff', map: storeNoren(wide), side: THREE.DoubleSide })))
  return m
}
/**
 * The stock room (items 430, 431, 437; the owner's, 2026-11-21: 「這邊挖空並加上掛簾，後面是小儲藏室，倉儲員工專用」「飲料可以從冷飲櫃後面直接
 * 補」): a narrow room behind the side wall, from the wall's start along behind the drinks fridges to the men's toilet's room, its way in a
 * doorway in the wall's stretch past the fridges, a noren over it; only the stocker goes in. Built as the toilets' rooms are (a wing of the
 * house: dark cedar to the waist outside, plaster over, a dark cap along the tops, open over (its slatted ceiling taken away, item 498); inside, cedar to the
 * waist and plaster, the floor's boards the toilets' hinoki), the fridges' backs in its front wall, the drinks' stock along its back wall
 * (ShopProps: the crates and the cartons, and the milk crates). In the wall's frame (x behind its face, y up, z along it).
 */
/** what's in a room with a ceiling takes none of the sun's shadows (item 476, the owner's 「有不明陰影」: the stock room's walls and slats
 * cast nothing, so the sun went through them, and the fridges', the cartons' and even the men's toilet's next door shadows lay on its
 * floor and walls in blots; a roof only the sun saw left the toilet's, its rays slanting in along the room past its end). Only a uniform
 * changes (three's receiveShadow), no program */
export function useNoSun(ref: RefObject<THREE.Object3D | null>) {
  useLayoutEffect(() => { ref.current?.traverse((o) => { if ((o as THREE.Mesh).isMesh && o.receiveShadow) o.receiveShadow = false }) })
}
export function StoreRoom({ door, room, deep, fridges }: { door: [number, number]; room: [number, number]; deep: number; fridges: [number, number][] }) {
  const h = STORE.doorH, top = h + 0.3
  // (the fridges' openings framed as the doorway is (item 535, the owner's 「梁柱要留」: from the stock room the wall's hidden, and the fridges
  // stood in nothing, black boxes with no frame round them): a post at either side of each, a head over them all (its foot 3 mm under the
  // openings' tops, behind the fridges), each through the wall's thickness out of its back; the posts proud of its face on the shop's side as
  // the doorway's is, the head flush with it there (behind the plaster over the openings: the frieze over the fridges as it was); the doorway's
  // post against the first fridge's side is theirs too, carried up to their head)
  // (item 554, the owner's 「中間這塊拿掉」: no post between two fridges side by side (closer than a post's width): their backs one opening;
  // between two further apart, a post as before)
  // (item 562, the owner's 「高度沒對齊，要注意」: the head over the fridges stopped at the doorway's post, 33 cm over the doorway's own head
  // beside it, the two side by side at two heights: carried on over the doorway to the wall's end now, one head at one height and one
  // depth the whole stretch, the doorway's own head under it in its bay as its lintel)
  const frame = useMemo(() => {
    const ops = [...fridges].sort((p, q) => p[0] - q[0])
    if (!ops.length) return null
    const headY = FRIDGE.H + 0.012 - 0.003, headTop = FRIDGE.H + 0.012 + STORE_HEAD
    const posts: [number, number][] = []
    // (and where two stand side by side, the gap between their cabinets (3 cm) filled at their backs with a strip of their own black, as
    // built-in coolers are: open, the shop's light showed through it from the stock room in a bright line, and the stock room from the shop)
    const fillers: [number, number][] = []
    for (let i = 0; i < ops.length; i++) {
      // (before the first, unless the doorway's post is there already)
      if (i === 0 && Math.abs(ops[0][0] - (door[1] + STORE_POST)) > 0.02) posts.push([ops[0][0] - STORE_POST, ops[0][0]])
      const next = ops[i + 1]
      if (next && next[0] - ops[i][1] < STORE_POST) { fillers.push([ops[i][1] - 0.002, next[0] + 0.002]); continue }
      posts.push(next ? [(ops[i][1] + next[0]) / 2 - Math.max(STORE_POST, next[0] - ops[i][1]) / 2, (ops[i][1] + next[0]) / 2 + Math.max(STORE_POST, next[0] - ops[i][1]) / 2]
        : [ops[i][1], ops[i][1] + STORE_POST])
    }
    return { posts, fillers, headY, headTop, z0: Math.min(ops[0][0], door[0] - STORE_POST), z1: ops[ops.length - 1][1] + STORE_POST }
  }, [fridges, door])
  const [z0, z1] = room
  // (its far end the men's toilet's room's end wall (its outside, 4 mm on), as deep as that room; past it a short wall of its own on to the
  // back)
  const zE = z1 + 0.004
  const mid = (z0 + zE) / 2, len = zE - z0, dx = deep - WALL_OUT
  // (the doorway's whole stretch (item 467), its frame's posts against the wall's end and the fridge's side: the noren, its rod and their
  // brackets within the posts' outer sides (they reached 1 to 2 cm past them, into the fridge now it's beside), the head 2 mm in from them
  // (its ends not in one plane with the posts' sides))
  const outerW = door[1] - door[0] + 2 * STORE_POST, norenW = outerW - 0.012
  const noren = useRef<THREE.Group>(null)
  // (none of the sun's shadows inside it (item 476))
  const whole = useRef<THREE.Group>(null)
  useNoSun(whole)
  useFrame((_, dt0) => {
    // (swung aside as the stocker goes through, back into the room the way he's going, and settling back after him: a spring, a little
    // overshoot, each panel a little behind the other)
    const dt = Math.min(dt0, 0.05)
    const st = STORE_STATE as typeof STORE_STATE & { v?: number; a?: number }
    const want = st.passing > 0 ? 1 : 0
    st.v = ((st.v ?? 0) + ((want - st.push) * 60 - (st.v ?? 0) * 9) * dt)
    st.push += st.v * dt
    const g = noren.current
    if (!g) return
    g.children.forEach((p, i) => { p.rotation.z = st.push * (0.62 - i * 0.08) })
  })
  const hit = useMemo(() => {
    const hint = () => `只有倉儲員工進出｜後場最少：${lowestBack().slice(0, 3).map((id) => `${drinkLabel(id)} ${DRINK_BACK.back[id] ?? 0}`).join('、')}｜點一下打開飲料庫存`
    return {
      onClick: (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (getEdit().on) return; setDrinkPanel(true) },
      onPointerOver: (e: ThreeEvent<PointerEvent>) => { if (getEdit().on) return; handOver.onPointerOver({ ...e, eventObject: noren.current ?? e.eventObject }); setTip({ title: '儲藏室', hint: hint() }) },
      onPointerOut: (e: ThreeEvent<PointerEvent>) => { handOver.onPointerOut({ ...e, eventObject: noren.current ?? e.eventObject }); setTip(null) },
    }
  }, [])
  return (
    <group ref={whole}>
      <EditBlock>
      <StaticBatch plain>
        {/* (its own floor, the toilets' hinoki boards a hair over the shop's own floor run out behind the wall, taken away (item 710, the
            owner's 「地板有斷層」: from the shop's boards over the sill onto paler ones 3 mm up): the shop's floor runs on into it) */}
        {/* inside: its back wall; its far end in front of the men's room's end wall (6 mm off it) */}
        {/* (its back cut open as the toilets' rooms' are, seen through from outside (item 482, the owner's 「這邊要通透」: a solid back made it a
            blank grey box from behind the shop, the stocker and the stock out of sight): one face, turned in, nothing behind it) */}
        <WcWall len={len} at={[deep, 0, mid]} yaw={-Math.PI / 2} top={top} cut />
        {/* (its near end, by the wall's start, taken away (item 488, the owner's 「這面牆拿掉」: past the side wall's end it stood alone, a panel
            of cedar and plaster beside the doorway, from the room and from outside); the far end, in front of the men's room's end wall) */}
        {/* (6 mm in front of that wall's plaster, 4 mm clear of its corner post's face (item 503, the owner's 「紅圈處理」: 2 mm off it stood
            in one plane with the men's room's dark corner post, itself 2 mm proud of that plaster (item 425), and the post showed through the
            stock room's plaster as a dark strip up its far corner)) */}
        <WcWall len={dx} at={[(WALL_OUT + deep) / 2, 0, zE - 0.006]} yaw={Math.PI} top={top} />
        {/* outside: the short end's body past the men's room (its back open, item 482) */}
        <WcMass x={[WC_ROOM.D + WC_T + 0.002, deep]} y={[0, top]} z={[zE, zE + WC_T]} />
        {/* (no slatted ceiling on its caps (item 498, the owner's 「倉庫不用這個」): it's open over, the stock seen from above) */}
        {/* (a dark post at its far back corner, the open back's edge; the near one went with the near end) */}
        {[zE + WC_T].map((z) => (
          // (4 mm proud of the end walls' backs: not in one plane with them)
          <mesh key={z} position={[deep - WC_T / 2 + 0.004, top / 2, z - 0.015]}><boxGeometry args={[WC_T, top, 0.034]} /><meshToonMaterial color="#2e1c10" /></mesh>
        ))}
        {/* the doorway's frame: the head over the doorway out to the wall's end, the wall over it carrying it. Its posts taken away (item 709,
            the owner's 「紅圈與紅框部份的柱子拿掉」: the one against the fridge's side, up to the fridges' head, and its sill across the foot,
            the one at the wall's end before it (item 503)); and the fridges' openings' posts (item 535), the one past the last fridge by the
            koi's wall with them: the head over all of it as it was */}
        {/* the fridges' openings' head (item 535) */}
        {frame && (
          <mesh position={[(WALL_OUT + 0.004 + 0.002) / 2, (frame.headY + frame.headTop) / 2, (frame.z0 + frame.z1) / 2]}>
            <boxGeometry args={[WALL_OUT + 0.004 - 0.002, frame.headTop - frame.headY, frame.z1 - frame.z0 - 0.004]} /><meshToonMaterial color="#35200f" />
          </mesh>
        )}
        {/* (its back as deep in the stock room as the head over it and the posts (item 562): it stopped 4 mm short of them) */}
        <mesh position={[(WALL_OUT + 0.004 - 0.035) / 2, h + STORE_HEAD / 2, (door[0] + door[1]) / 2]}><boxGeometry args={[WALL_OUT + 0.004 + 0.035, STORE_HEAD, outerW - 0.004]} /><meshToonMaterial color="#35200f" /></mesh>
        {/* (and over it, up to the head over the whole stretch (item 562), a small wall (小壁) of the room's plaster, as a framed wall has: the
            shop's wall over the doorway is drawn from the shop's side only, and from the stock room the head and the lintel were two bars
            across nothing, the shop seen between them; in the wall's thickness, 4 mm in from either face, a millimetre into the lintel,
            the head and the post) */}
        {frame && (
          <mesh position={[WALL_OUT / 2, (h + STORE_HEAD + frame.headY) / 2, (door[0] - STORE_POST + 0.004 + door[1] + 0.001) / 2]}>
            <boxGeometry args={[WALL_OUT - 0.008, frame.headY - h - STORE_HEAD + 0.002, door[1] + 0.001 - (door[0] - STORE_POST + 0.004)]} /><meshToonMaterial color="#ece0c6" />
          </mesh>
        )}
        {/* (the strip between two fridges side by side (item 554), 3 mm proud of their backs toward the stock room, 4.5 cm into the gap) */}
        {frame?.fillers.map(([a, b]) => (
          <mesh key={`ff${a}`} position={[-FRIDGE_GAP + 0.003 - 0.024, FRIDGE.H / 2, (a + b) / 2]}><boxGeometry args={[0.048, FRIDGE.H, b - a]} /><meshToonMaterial color="#1d1e21" /></mesh>
        ))}
        {/* (the noren's rod on its two brackets taken away (item 709, the owner's red box): the noren hangs where it did, from the rod in its
            top band's sleeve, out of sight) */}
      </StaticBatch>
      </EditBlock>
      {/* the noren: its two panels hung from the rod, each its half of the one picture, a slit between; swung aside as the stocker goes
          through (not merged: it moves) */}
      <group ref={noren} name="look-store" position={[-0.05, h + STORE_HEAD - 0.02, (door[0] + door[1]) / 2]}>
        {[-1, 1].map((sd) => <StoreNorenPanel key={sd} sd={sd} wide={norenW} />)}
      </group>
      {/* the doorway as one thing to point at: what's in there and what's lowest, a click opens the drinks' stock */}
      <mesh position={[-0.06, (h + STORE_HEAD) / 2, (door[0] + door[1]) / 2]} rotation-y={-Math.PI / 2} {...hit}>
        <planeGeometry args={[door[1] - door[0] + 2 * STORE_POST, h + STORE_HEAD]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
/** one of the stock room noren's two panels: its half of the picture, hung from the rod (its top), a slit between the two */
function StoreNorenPanel({ sd, wide }: { sd: number; wide: number }) {
  const geo = useMemo(() => {
    const w = (wide - 0.008) / 2
    const g = new THREE.PlaneGeometry(w, STORE_NOREN_L)
    const u0 = sd < 0 ? 0 : 1 - w / wide, u1 = u0 + w / wide
    const uv = g.attributes.uv as THREE.BufferAttribute
    for (let k = 0; k < uv.count; k++) uv.setX(k, u0 + uv.getX(k) * (u1 - u0))
    // (hung from its top: the cloth below the rod)
    g.translate(0, -STORE_NOREN_L / 2 + 0.012, 0)
    return { g, z: sd * (0.008 + w) / 2 }
  }, [sd, wide])
  useEffect(() => () => geo.g.dispose(), [geo])
  // (in the doorway's plane, its face to the room: seen from the room the picture reads right)
  return (
    <group position-z={geo.z}>
      <mesh geometry={geo.g} rotation-y={-Math.PI / 2} material={storeNorenMat(wide)} />
    </group>
  )
}
