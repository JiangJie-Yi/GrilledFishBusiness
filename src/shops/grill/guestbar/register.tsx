import { memo, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { StaticBatch } from '@/scene/StaticBatch'
import { Omamori } from '@/shops/grill/Omamori'
import type { Lang } from '@/data/i18n'
import { setTip } from '@/scene/hoverTip'
import { LuckyCat } from '@/shops/grill/LuckyCat'
import { IpadModel } from '@/shops/grill/Ipad'
import { TillBoxes } from '@/shops/grill/TillBoxes'
import { TillStoolModel } from '@/shops/grill/BarFurnish'
import { TillCounter } from '@/shops/grill/TillCounter'
import { CAT_STAND_H, TillBellLive, TillDeskPiece, TillMatLive } from '@/shops/grill/TillDesk'
import { beep, behindBody, chime, DRAWER_FRONT, DRAWER_KEY, showKeyTip, turnKey, liftOn, rattle, RECEIPT_TEX, REGISTER, RegisterBody, RegisterDrawer, RegisterKeys, registerTag, registerText, useRegisterModel } from '@/shops/grill/cashRegister'
import { Movable } from '@/shops/grill/Movable'
import { getEdit } from '@/shops/grill/edit'
import { changeOf, CoinPile, CoinStack, isNote, NoteStack, type CoinKind, type Note } from '@/shops/grill/Cash'
import { takeOut, type Denom } from '@/game/money/till'
import { TILL_CASH, TILL_STATE, POINTER_HINT, tipOver } from '@/shops/grill/bar'
import { tl } from '@/data/i18n'
import { PEOPLE_SCALE } from './staffPoses'

/** the boxes on the till's low shelf, each its own piece, and its name in the developer panel */
const TILL_BOXES = [['bags', '紙袋'], ['napkins', '紙巾'], ['rolls', '收銀紙捲'], ['coasters', '杯墊'], ['chopsticks', '割箸']] as const

/**
 * The till by the door (帳場): a counter of the bar's dark wood under a pale top with a rounded edge, set back on the
 * bar's side of the way in with room behind it for the cashier. On it the cash register (its keys, its drawer, the
 * customers' display), a card reader, a receipt printer with its paper curling out, a tray for the change, a cup of
 * pens, a little bell to ring, the お会計 sign facing the customers, and a beckoning cat (招き猫) for luck.
 */
/** where the cashier's chair stands behind the till (its frame: x along the bar, +z behind it), and its seat's height (the model's) (item 516:
 * 6 cm further back than it was, its front had touched the counter's back and the cashier's knees went 4.6 cm into it all the time they sat;
 * the takeaway stand behind it still 10 cm clear of its back) */
const TILL_CHAIR: [number, number, number] = [0.05, 0, 0.70]
const TILL_SEAT = 0.452
// (the till and all on and about it, some thirty pieces: likewise drawn again only for its own changes)
export const Register = memo(RegisterImpl, (a, b) => a.yaw === b.yaw && a.top === b.top && a.lang === b.lang && a.at.equals(b.at))
function RegisterImpl({ at, yaw, top, lang }: { at: THREE.Vector3; yaw: number; top: number; lang: Lang }) {
  return (
    <>
      {/* (two seats of their own behind it (blender/tillstools.py), clear of its back: the cashier's walnut chair squarely behind the
          register, where the cashier sits (the unseen mark on its seat, which Roasting sits them on, the chair's way round), and a helper's
          stool of the same make along from it) */}
      <Movable id="till-stool-hi" label="收銀高腳凳">
        <StaticBatch plain>
          <group position={at} rotation-y={yaw}><group position={TILL_CHAIR} scale={PEOPLE_SCALE}><TillStoolModel which="High" /></group></group>
        </StaticBatch>
        <group position={at} rotation-y={yaw}><group name="cashier-seat" position={[TILL_CHAIR[0], TILL_SEAT * PEOPLE_SCALE, TILL_CHAIR[2]]} /></group>
      </Movable>
      <Movable id="till-stool-lo" label="收銀矮凳"><StaticBatch plain>
        <group position={at} rotation-y={yaw}><group position={[-0.44, 0, 0.68]} rotation-y={-0.28} scale={PEOPLE_SCALE}><TillStoolModel which="Low" /></group></group>
      </StaticBatch></Movable>
      <Movable id="till-counter" label="收銀櫃檯" blocks><StaticBatch plain>
      <group position={at} rotation-y={yaw}>
      {/* (local x along the bar, +z toward the cashier, behind it) */}
      {/* the counter itself, from blender/tillcounter.py: its dark body with the lit bamboo and the lantern window, the marble top, the walnut partition */}
      <TillCounter top={top} />
      </group>
      </StaticBatch></Movable>
      <Movable id="till-register" label="收銀機（含抽屜）">
        <StaticBatch plain>
      <group position={at} rotation-y={yaw}>
      {/* the register, an electronic one of the kind every shop has: a cream cash drawer (a lock and a label on its front)
          under a body whose sloped panel carries the keys (the coloured function keys to the left, the grey number pad, the
          big cream keys and the teal total key to the right), the till roll's cover at the back with its paper coming
          out, a small operator's display on a stalk, and over it all the customers' display, its green figures facing both ways */}
      <group position={[0.05, top, 0.06]} rotation-y={Math.PI} scale={REG_SC}>
        {/* the register itself, from blender/register.py: the drawer's case, the body on it with its keys, the displays' housings, the deck */}
        <RegisterBody />
        {/* the cables: one tidy bundle out of the back through a grommet, held to the counter by a clip, with the card reader's lead and the tablet's branching from it */}
        <mesh position={[0.05, 0.12, 0.151]}><boxGeometry args={[0.03, 0.018, 0.012]} /><meshToonMaterial color="#2a2c30" /></mesh>
        {/* (the cables go with the register: moved in edit mode, they come along) */}
        {/* the cables: the register's power, the card reader's and the tablet's leads, into the grommet in the top */}
        <mesh geometry={REG_CABLES.power}><meshToonMaterial color="#17171a" /></mesh>
        {/* (the grommet: a dark metal ring let into the top, the hole black inside it) */}
        <mesh position={[GROMMET[0], 0.0009, GROMMET[2]]} rotation-x={-Math.PI / 2}><ringGeometry args={[0.0062, 0.012, 28]} /><meshToonMaterial color="#3a3c40" /></mesh>
        <mesh position={[GROMMET[0], 0.0007, GROMMET[2]]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.0062, 24]} /><meshBasicMaterial color="#060607" /></mesh>
      </group>
      </group>
        </StaticBatch>
        <RegisterLive at={at} yaw={yaw} top={top} lang={lang} />
      </Movable>
      <Movable id="till-card" label="刷卡機"><StaticBatch plain>
      <group position={at} rotation-y={yaw}>
      {/* the card reader on its cradle, its face to the customers (blender/tilldesk.py), on the desk mat */}
      <group position={[-0.38, top, -0.1]}><TillDeskPiece name="TillCardReader" /></group>
      </group>
      </StaticBatch></Movable>
      <Movable id="till-printer" label="明細印表機" baseTurn={[0, 180, 0]}><StaticBatch plain>
      <group position={at} rotation-y={yaw}>
      {/* the receipt printer, its slip curling out (blender/tilldesk.py), on the desk mat */}
      <group position={[-0.38, top, 0.12]}><TillDeskPiece name="TillPrinter" /></group>
      </group>
      </StaticBatch></Movable>
      <Movable id="till-tray" label="找零盤" baseTurn={[0, 90, 0]}><StaticBatch plain>
      <group position={at} rotation-y={yaw}>
      {/* the change tray (カルトン, blender/tilldesk.py): black resin, its floor ribbed, ありがとうございました in gold along its edge */}
      <group position={[0.0, top, -0.4]}><TillDeskPiece name="TillTray" /></group>
      </group>
      </StaticBatch></Movable>
      <Movable id="till-pens" label="筆筒"><StaticBatch plain>
      <group position={at} rotation-y={yaw}>
      {/* the pen cup, full (blender/tilldesk.py), on the desk mat */}
      <group position={[-0.52, top, 0.12]}><TillDeskPiece name="TillPens" /></group>
      </group>
      </StaticBatch></Movable>
      <Movable id="till-omamori" label="御守" baseTurn={[0, -114, 0]}>
      <group position={at} rotation-y={yaw}>
      {/* an omamori, 開運招福 (the owner's, after their picture; blender/omamori.py): on the desk mat, leaning back on the pen cup */}
      <group position={[-0.46, top + 0.002, 0.16]} rotation={[-0.2, -0.35, 0]}><Omamori /></group>
      </group>
      </Movable>
      <Movable id="till-bell" label="服務鈴" baseTurn={[0, 25, 0]}>
      <group position={at} rotation-y={yaw}>
      {/* the service bell (blender/tilldesk.py): rung with a click */}
      <group position={[-0.52, top, -0.1]}>
        <TillBellLive tip={lang === 'ja' ? tipOver('呼び鈴', 'クリックで鳴らす') : tipOver('服務鈴', '點一下按鈴')} onRing={() => !getEdit().on} />
      </group>
      </group>
      </Movable>
      <Movable id="till-mat" label="木質台座（含抽屜）">
      <group position={at} rotation-y={yaw}>
      {/* the walnut stand the reader, the printer, the pens and the tablet stand on (blender/tilldesk.py); its drawers open with a click (not batched) */}
      <group position={[-0.21, top, -0.005]}>
        <TillMatLive editing={() => getEdit().on}
          tip={(open) => lang === 'ja' ? tipOver('引き出し', open ? 'クリックで閉める' : 'クリックで開ける') : tipOver('抽屜', open ? '點一下關上' : '點一下拉開')} />
      </group>
      </group>
      </Movable>
      <Movable id="till-ingot" label="元寶"><StaticBatch plain>
      <group position={at} rotation-y={yaw}>
      {/* a gold ingot (元寶) on its red stand, for wealth, between the bell and the cat (blender/tilldesk.py) */}
      <group position={[-0.3, top, -0.34]} rotation-y={0.3} scale={1.5}><TillDeskPiece name="TillIngot" /></group>
      </group>
      </StaticBatch></Movable>
      <Movable id="till-tree" label="招財樹"><StaticBatch plain>
      <group position={at} rotation-y={yaw}>
      {/* a money tree (pachira) in its red pot, by the cat (blender/tilldesk.py) */}
      <group position={[0.12, top, -0.34]}><TillDeskPiece name="TillMoneyTree" /></group>
      </group>
      </StaticBatch></Movable>
      <Movable id="till-cat" label="櫃檯招財貓" baseTurn={[0, -45, 0]}>
      <group position={at} rotation-y={yaw}>
      <group position={[0.45, top, -0.21]} rotation-y={Math.PI}>
        {/* the beckoning cat, bigger, at the till's corner by the door, facing the customers, sat up on a river stone (blender/tilldesk.py);
            not batched: it waves its paw (a batch would take every pose of the wave at once, a fan of paws) */}
        <TillDeskPiece name="TillCatStand" />
        <group position-y={CAT_STAND_H}><LuckyCat kind={1} height={0.46} /></group>
      </group>
      </group>
      </Movable>
      {TILL_BOXES.map(([k, zh]) => (
        <Movable key={k} id={`till-box-${k}`} label={`紙箱（${zh}）`}>
          <group position={at} rotation-y={yaw}><TillBoxes part={k} lang={lang} /></group>
        </Movable>
      ))}
      <Movable id="till-manual" label="收銀機操作說明書">
        <group position={at} rotation-y={yaw}><TillBoxes part="manual" lang={lang} /></group>
      </Movable>
      <Movable id="till-ipad" label="平板（iPad）">
      <group position={at} rotation-y={yaw}>
        {/* the order tablet, an iPad on a folding stand, at the cashier's right hand, its screen toward the cashier, leaning back a little */}
        <group position={[0.5, top, 0.1]}>
          {/* (the model from blender/ipad.py: the tablet, its screen the order screen, on its folding stand; not batched: its screen is touched) */}
          <IpadModel lang={lang} />
        </group>
      </group>
      </Movable>
    </>
  )
}

/** the little plates on the notes' slots */
/** a cable run as a tube through the given points (in the register's own units), black rubber */
const cable = (pts: [number, number, number][], r = 0.0042) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.4), 36, r, 6, false)
/** where the register's lead goes down through the counter's top: a grommet under the register's back, out of sight (the register's own units) */
const GROMMET: [number, number, number] = [0.05, 0, 0.13]
const REG_CABLES = {
  // (out of its back, held close down the case's back, under the case's back edge and into the grommet below: from above, none of it shows)
  power: cable([[0.05, 0.12, 0.158], [0.05, 0.104, 0.175], [0.05, 0.06, 0.178], [0.05, 0.006, 0.178], [0.05, 0.0026, 0.16], [GROMMET[0], -0.012, GROMMET[2]]], 0.0045),
}
/** the register's size in the till, its body and its working parts (drawer, keys, displays) alike: as it's modelled, at one with the tablet,
 * printer and card reader beside it (it had been 1.4 times larger, out of scale with them) */
const REG_SC = 1
/**
 * The insert's layout (blender/register.py's RegInsert), in the register's own units, in the drawer's frame: the middles of the notes'
 * compartments along the back (the 2000 one holds coin rolls) and of the six coin cups along the front, their floors' heights, the cups'
 * floors' slope, and how many coins lie in each. The money in them is drawn at the till's own scale (1 / REG_SC). When the register was
 * brought down from 1.4 times its model's size these stayed in the old, 1.4 times larger units: the outer cups' coins lay outside the drawer
 * on either side and the 10000s stuck out over it (the owner: "the till's burst")
 */
const NOTE_X: Record<Note, number> = { 10000: 0.1253, 5000: 0.0418, 1000: -0.1253 }
const NOTE_Z = 0.067, NOTE_Y = 0.021
const COIN_CUPS: [CoinKind, number, number][] = [[500, 0.1392, 14], [100, 0.0835, 24], [50, 0.0278, 15], [10, -0.0278, 26], [5, -0.0835, 11], [1, -0.1392, 18]]
const COIN_Z = -0.079, COIN_Y = 0.02, COIN_TILT = -0.12
/** a point in the insert (the drawer's frame), in the till's frame, with the drawer out as far as `open` */
const insertToTill = (ix: number, iy: number, iz: number, top: number, open: number) =>
  new THREE.Vector3(0.05 - ix * REG_SC, top + iy * REG_SC, 0.06 - (iz - 0.24 * open) * REG_SC)
/** where the coin tray's middle is, and how far down the till's top its dish is, in the till's frame */
const TRAY_AT = { x: 0.0, z: -0.4, y: 0.0215 }
const smooth = (e0: number, e1: number, x: number) => THREE.MathUtils.smoothstep(x, e0, e1)
/**
 * the register's moving parts, apart from the batched till: its drawer, which slides out (by hand, a click on it, or on its own as a
 * customer pays), its displays, which read what's being paid, and the money going about: the note the customer lays on the coin tray, which
 * the cashier takes into the drawer, and the change that comes back out onto the tray for the customer to take
 */
function RegisterLive({ at, yaw, top, lang }: { at: THREE.Vector3; yaw: number; top: number; lang: Lang }) {
  const drawer = useRef<THREE.Group>(null)
  const drawerHover = useRef(false)
  const keyHover = useRef(false)
  const setDrawerKeyHover = (on: boolean, ev: Event) => {
    if (keyHover.current === on) return
    keyHover.current = on
    const key = useRegisterModel.cached()?.drawerKey ?? null
    liftOn(key, on)
    showKeyTip(on ? 'DRAWER_KEY' : null, lang)
    POINTER_HINT.hand = Math.max(0, POINTER_HINT.hand + (on ? 1 : -1))
    const el = ev.target as HTMLElement | null
    if (el?.style) el.style.cursor = on || POINTER_HINT.hand ? 'pointer' : ''
  }
  const setDrawerHover = (on: boolean, ev: Event) => {
    if (drawerHover.current === on) return
    drawerHover.current = on
    liftOn(useRegisterModel.cached()?.drawer ?? null, on)
    setTip(on ? { title: tl(lang, '收銀抽屜', 'レジのドロア', 'Till drawer'), hint: tl(lang, '點一下拉開／推回（上鎖時拉不開）', 'クリックで開閉（施錠中は開かない）', 'Click to open / close (won’t open locked)') } : null)
    POINTER_HINT.hand = Math.max(0, POINTER_HINT.hand + (on ? 1 : -1))
    const el = ev.target as HTMLElement | null
    if (el?.style) el.style.cursor = on || POINTER_HINT.hand ? 'pointer' : ''
  }
  const cash = useRef<THREE.Group>(null)
  const tender = useRef<THREE.Group>(null)
  const change = useRef<THREE.Group>(null)
  const open = useRef(0)
  const vel = useRef(0)
  const innerShown = useRef<boolean | null>(null)
  const warmFrames = useRef(0)
  /** (whether the drawer was last sent out: it rings as it's let go) */
  const sentOut = useRef(false)
  const [pay, setPay] = useState<{ tender: Note[]; change: (Note | CoinKind)[] }>({ tender: [], change: [] })
  // (what's in the drawer, drawn: follows TILL_CASH as customers pay in and the owner takes out)
  const [inDrawer, setInDrawer] = useState(TILL_CASH.drawer)
  const drawerSeen = useRef(TILL_CASH.drawer)
  /** the owner takes a compartment's money: only with the drawer out, and it goes to the shop's cash */
  const takeCash = (e: { stopPropagation: () => void }, k: Denom) => {
    e.stopPropagation()
    if (getEdit().on || open.current < 0.5) return
    const r = takeOut(TILL_CASH.drawer, k)
    if (!r.amount) return
    TILL_CASH.drawer = r.drawer
    TILL_CASH.onTake?.(r.amount)
    beep('ok')
  }
  const cashTip = (k: Denom) => tipOver(
    tl(lang, `${k.toLocaleString()} 円${k >= 1000 ? '鈔' : '硬幣'}`, `${k.toLocaleString()} 円${k >= 1000 ? '札' : '玉'}`, `¥${k.toLocaleString()} ${k >= 1000 ? 'notes' : 'coins'}`),
    inDrawer[k] ? tl(lang, `點一下取出 ¥${(k * inDrawer[k]).toLocaleString()}，加進現金`, `クリックで ¥${(k * inDrawer[k]).toLocaleString()} を取り出す`, `Click to take ¥${(k * inDrawer[k]).toLocaleString()} into cash`)
      : tl(lang, '這格是空的', 'この仕切りは空', 'This one is empty'))
  const paySeen = useRef('')
  const led = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 160
    c.height = 40
    return new THREE.CanvasTexture(c)
  }, [])
  const shown = useRef('')
  const slip = useRef<THREE.Mesh>(null)
  const slipGeo = useMemo(() => new THREE.PlaneGeometry(0.054, 0.062).translate(0, 0.031, 0), [])
  useFrame((_, delta) => {
    // (the drawer: out while a customer's paying, or when it's been clicked open, easing out and in)
    // (a spring: opening, the latch lets go and it shoots out, runs a little past where it stops and settles back; shutting, it's pushed home and
    // meets its stop with a small bounce)
    // (pointed at while shut, it comes out a hair, as if a finger's on it)
    const want = Math.max(TILL_STATE.drawer, TILL_STATE.manual ? 1 : 0, drawerHover.current ? 0.025 : 0)
    if (want > 0.5 !== sentOut.current) {
      sentOut.current = want > 0.5
      if (sentOut.current) chime()
    }
    const dt2 = Math.min(delta, 0.03)
    const opening = want > open.current
    const stiff = opening ? 300 : 140, damp = opening ? 19 : 20
    vel.current += ((want - open.current) * stiff - vel.current * damp) * dt2
    open.current += vel.current * dt2
    // (it can't go in past shut: it stops there, with a little of its speed given back)
    if (open.current < 0) { open.current = 0; vel.current = Math.abs(vel.current) * 0.25 }
    // (locked, pulled at: it knocks out a hair against the lock and back, twice)
    const rt = (performance.now() - REGISTER.rattleAt) / 1000
    const knock = rt < 0.3 ? Math.abs(Math.sin(rt * Math.PI * 2 / 0.15)) * 0.0025 * (1 - rt / 0.3) : 0
    if (drawer.current) drawer.current.position.z = -open.current * 0.24 - knock
    if (cash.current) cash.current.visible = open.current > 0.15 || warmFrames.current < 40
    // (its inside drawn only once it's out a little: shut, it's all in the dark of the till; and its first few dozen frames, unseen inside
    // the shut till, so the programs it's drawn with (its shadow's too) are made as the shop loads, not at the first pull a minute in)
    const inside = open.current > 0.02 || ++warmFrames.current < 40
    if (inside !== innerShown.current) {
      innerShown.current = inside
      for (const o of useRegisterModel.cached()?.inner ?? []) o.visible = inside
    }
    if (drawerSeen.current !== TILL_CASH.drawer) { drawerSeen.current = TILL_CASH.drawer; setInDrawer(TILL_CASH.drawer) }
    // (what's being paid, as notes and coins to draw: changes only with the customer)
    const key = `${TILL_STATE.tender}|${TILL_STATE.change}`
    if (paySeen.current !== key) {
      paySeen.current = key
      setPay({ tender: TILL_STATE.tender ? (changeOf(TILL_STATE.tender) as Note[]) : [], change: TILL_STATE.change ? changeOf(TILL_STATE.change) : [] })
    }
    const k = TILL_STATE.k
    // (the receipt: printed out of its window while the customer pays, torn off and gone as they take their change)
    const sl = slip.current
    if (sl && k >= 0) {
      sl.visible = TILL_STATE.slip && k >= 0.3 && k < 0.95
      if (sl.visible) { sl.scale.y = Math.max(0.01, smooth(0.3, 0.52, k) * REGISTER.printLen); sl.position.y = 0.2185 + smooth(0.88, 0.95, k) * 0.05 }
    } else if (sl) {
      // (a receipt printed by hand at the keys: fed out over a moment, left hanging till it's torn off, a click, or a while has passed)
      const t = REGISTER.printAt < 0 ? -1 : (performance.now() - REGISTER.printAt) / 1000
      if (t > 20) REGISTER.printAt = -1
      sl.visible = t >= 0 && t <= 20
      if (sl.visible) { sl.scale.y = Math.max(0.01, smooth(0, 0.3 + 0.4 * REGISTER.printLen, t) * REGISTER.printLen); sl.position.y = 0.2185 }
    }
    // (the note laid on the tray, then taken into its place in the drawer)
    const tg = tender.current
    if (tg) {
      tg.visible = k >= 0.38 && k < 0.64
      if (tg.visible) {
        const t = smooth(0.54, 0.64, k)
        const kind = pay.tender[0] ?? 1000
        // (its slot in the drawer, in the till's frame: the drawer's own place, less how far out it's drawn)
        const slot = insertToTill(NOTE_X[kind], NOTE_Y + 0.011, NOTE_Z, top, open.current)
        const tray = new THREE.Vector3(TRAY_AT.x, top + TRAY_AT.y + (1 - smooth(0.38, 0.44, k)) * 0.1, TRAY_AT.z)
        tg.position.lerpVectors(tray, slot, t)
        tg.position.y += Math.sin(Math.PI * t) * 0.07
        tg.rotation.y = THREE.MathUtils.lerp(Math.PI + 0.12, Math.PI / 2, t)
      }
    }
    // (the change: taken out of the drawer's coin cups and notes while it's open, carried over to the tray, and taken away by the customer)
    const cg = change.current
    if (cg) {
      cg.visible = k >= 0.64 && k < 0.95
      if (cg.visible) {
        const t = smooth(0.64, 0.74, k)
        const from = insertToTill(COIN_CUPS[1][1], COIN_Y + 0.007, COIN_Z, top, open.current)
        const to = new THREE.Vector3(TRAY_AT.x, top + TRAY_AT.y, TRAY_AT.z)
        cg.position.lerpVectors(from, to, t)
        cg.position.y += Math.sin(Math.PI * t) * 0.06 + smooth(0.9, 0.95, k) * 0.12
      }
    }
    const text = registerText()
    const tag = registerTag()
    if (shown.current === `${tag}|${text}`) return
    shown.current = `${tag}|${text}`
    const g = (led.image as HTMLCanvasElement).getContext('2d')!
    g.fillStyle = '#07100a'
    g.fillRect(0, 0, 160, 40)
    g.font = 'bold 30px "Courier New", monospace'
    g.textAlign = 'right'
    g.textBaseline = 'middle'
    g.fillStyle = '#5cff7a'
    g.shadowColor = '#5cff7a'
    g.shadowBlur = 7
    g.fillText(text, 152, 21)
    // (the word saying what the figures are, small, dimmer, at the left)
    g.font = 'bold 11px "Noto Sans TC", "Noto Sans JP", sans-serif'
    g.textAlign = 'left'
    g.shadowBlur = 3
    g.fillStyle = '#9dffb0'
    g.fillText(tag, 6, 9)
    led.needsUpdate = true
  })
  const coinList = pay.change.filter((v): v is CoinKind => !isNote(v))
  const noteList = pay.change.filter((v): v is Note => isNote(v))
  return (
    <group position={at} rotation-y={yaw}>
      {/* (the note the customer lays down: on the coin tray's dish) */}
      <group ref={tender} visible={false}>
        {pay.tender.map((v, i) => <NoteStack key={i} kind={v} n={1} position={[i * 0.006, i * 0.0016, i * 0.008]} rotation-y={0.07 * i} />)}
      </group>
      {/* (the change on the tray: the notes first, then the coins in rows) */}
      <group ref={change} visible={false}>
        {noteList.map((v, i) => <NoteStack key={`n${i}`} kind={v} n={1} position={[0.04, i * 0.0016, 0.0]} rotation-y={Math.PI + 0.1} />)}
        {coinList.map((v, j) => <CoinStack key={`c${j}`} kind={v} n={1} position={[-0.08 + (j % 4) * 0.032, 0, (Math.floor(j / 4) - 0.5) * 0.045]} />)}
      </group>
      <group position={[0.05, top, 0.06]} rotation-y={Math.PI} scale={REG_SC}>
        {/* the drawer: its front panel (a lock, the label, a pull slot) and its tray behind it, in one piece that comes out; clicked, it opens */}
        <group ref={drawer} onClick={(e) => {
          e.stopPropagation()
          if (getEdit().on || behindBody(e)) return
          // (its key: turned a quarter, locking it or unlocking it)
          if (DRAWER_KEY.test(e.object.name)) { turnKey(); return }
          if (!DRAWER_FRONT.test(e.object.name)) return
          // (opened by hand only if it isn't locked; pushed shut whether or not)
          if (!TILL_STATE.manual && REGISTER.state.drawerLocked) { rattle(); return }
          TILL_STATE.manual = !TILL_STATE.manual
          // (and the till's own panel with it, the drawer's money in sight to take (App's, item 366))
          window.dispatchEvent(new CustomEvent('jgs-till', { detail: TILL_STATE.manual }))
        }} onPointerMove={(e) => {
          e.stopPropagation()
          // (only its front can be taken hold of, and only where it can be seen: not through the case from the side or behind)
          const seen = !getEdit().on && !behindBody(e)
          const onKey = seen && DRAWER_KEY.test(e.object.name)
          setDrawerKeyHover(onKey, e.nativeEvent)
          setDrawerHover(seen && !onKey && DRAWER_FRONT.test(e.object.name), e.nativeEvent)
        }} onPointerOut={(e) => { setDrawerHover(false, e.nativeEvent); setDrawerKeyHover(false, e.nativeEvent) }}>
          {/* (its front and its tray, from the model) */}
          <RegisterDrawer />
          {/* (the insert: each compartment and cup where the model has it, the money in it at the till's own scale) */}
          <group ref={cash} visible={false}>
            {/* the money in the insert (the insert itself is the model's): the notes face up in their compartments under the weights, a stray one
                askew on top; the coins heaped loose in their cups, on their floors' slope */}
            {/* (as many as there are, a stack's worth at most; clicked, the owner takes them) */}
            {(Object.keys(NOTE_X).map(Number) as Note[]).map((kind, i) => {
              const n = Math.min(inDrawer[kind], 12)
              return (
                <group key={kind} position={[NOTE_X[kind], NOTE_Y, NOTE_Z]} onClick={(e) => takeCash(e, kind)} {...cashTip(kind)}>
                  <group scale={1 / REG_SC}>
                    {n > 1 && <NoteStack kind={kind} n={n - 1} rotation-y={Math.PI / 2 + (i - 1) * 0.012} />}
                    {n > 0 && <NoteStack kind={kind} n={1} position={[0.002 * (i - 1), 0.0012 * (n - 1) + 0.001, -0.004]} rotation-y={Math.PI / 2 + 0.05 - i * 0.03} />}
                  </group>
                  {/* (a touch area over the compartment, so even an empty one can be pointed at) */}
                  <mesh visible={false} position-y={0.007}><boxGeometry args={[0.072, 0.021, 0.114]} /></mesh>
                </group>
              )
            })}
            {COIN_CUPS.map(([kind, x]) => (
              <group key={kind} position={[x, COIN_Y, COIN_Z]} rotation-x={COIN_TILT} onClick={(e) => takeCash(e, kind)} {...cashTip(kind)}>
                {inDrawer[kind] > 0 && <CoinPile kind={kind} n={Math.min(inDrawer[kind], 40)} w={0.04 * REG_SC} d={0.11 * REG_SC} seed={kind} scale={1 / REG_SC} />}
                <mesh visible={false} position-y={0.006}><boxGeometry args={[0.044, 0.014, 0.12]} /></mesh>
              </group>
            ))}
          </group>
        </group>
        {/* the keys and the mode lock */}
        <RegisterKeys lang={lang} />
        {/* the receipt (clicked, it's torn off) */}
        <mesh ref={slip} geometry={slipGeo} visible={false} position={[-0.025, 0.2185, 0.076]} rotation={[0.2, Math.PI, 0]}
          {...tipOver(tl(lang, '收據', 'レシート', 'Receipt'), tl(lang, '點一下撕下', 'クリックで切り取る', 'Click to tear it off'))}
          onClick={(e) => { e.stopPropagation(); if (!getEdit().on && TILL_STATE.k < 0) REGISTER.printAt = -1 }}>
          <meshBasicMaterial map={RECEIPT_TEX} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        {/* the operator's display, in the housing's own pose: upright, facing straight out of the front */}
        <group position={[0.085, 0.252, 0.05]} rotation={[-0.04, 0, 0]}>
          <mesh position-z={-0.0086} rotation={[0, Math.PI, 0]}><planeGeometry args={[0.13, 0.04]} /><meshBasicMaterial map={led} toneMapped={false} /></mesh>
        </group>
        {/* the customers' display on its stalk */}
        <group position={[0.085, 0.33, 0.12]} rotation-y={(24 * Math.PI) / 180}><group rotation-x={-0.18}>
          <mesh position-z={0.0113}><planeGeometry args={[0.15, 0.044]} /><meshBasicMaterial map={led} toneMapped={false} /></mesh>
        </group></group>
      </group>
    </group>
  )
}
