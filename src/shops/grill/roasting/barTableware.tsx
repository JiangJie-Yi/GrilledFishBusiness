import { memo, useEffect, useMemo, useRef, type RefObject } from 'react'
import { useGLTF } from '@react-three/drei'
import { whenDrawn } from '@/scene/render/flatGate'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { flatOf } from '@/scene/render/flatBake'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { homeCopy, StaticBatch, type BatchParts } from '@/scene/render/StaticBatch'
import { inkModel } from '@/scene/render/inkHull'
import { signTexture } from '@/scene/props/signFont'
import { paintShikigami, SHIKI_SIZE } from '@/shops/grill/shikigami'
import { DRAWER_HELD, setTissues, tissuesAt } from '@/shops/grill/bar'
import { BOX_SHEETS } from '@/game/stock/tissues'
import { getEdit, positionOf, useEditSel, type V3 } from '@/shops/grill/edit'
import { setTip } from '@/scene/interact/hoverTip'
import { slide as drawerSound } from '@/shops/grill/TillDesk'
import { tissuePull } from '@/shops/grill/paperSound'
import { reflectStudio, useStudio } from '@/scene/render/studio'
import { Movable } from '@/shops/grill/Movable'
import { wareDesign } from '@/shops/grill/wareDesigns'
import { SEATS_SAT, DRAWER_KICK, TISSUE_REACH_MS, seatLabel, CHOPS_UP, CHOPS_OFF, CHOPS_LOOSE, PLACE, sharedAlong, seatAlong, tipOver, sauceSide, BAR_GATES, GRILL_COUNTERS, nameOver, SOY_DISH_AT, type Counter } from '@/shops/grill/bar'
import { BAR_TOP } from './barPlaces'
import { TableBasket } from './bins'
import { TRAY_WOOD, BAR_DEPTH, barBrassOf } from './common'

/**
 * The paper laid at each place (敷紙, item 310: shikigami.ts paints its print): 0.60 along the counter by 0.34 across (wide enough for the soy
 * dish on either side; the shared soy pot's bin, between two places, 5 cm clear of it),
 * from the plate's near side to 5 mm short of the step up to the lip (the chopsticks lie 5 cm before it), half a millimetre over the top; its
 * print the right way up for the one sitting there (its top toward the cook). One geometry and one material for every place, painted again
 * once the brush hand's letters are in
 */
const SHIKI_W = 0.6, SHIKI_D = 0.34, SHIKI_Z = 0.063
const SHIKI_GEO = new THREE.PlaneGeometry(SHIKI_W, SHIKI_D).rotateX(-Math.PI / 2).rotateY(Math.PI)
const SHIKI_TEX = signTexture(SHIKI_SIZE[0], SHIKI_SIZE[1], (g) => paintShikigami(g))
if (SHIKI_TEX) SHIKI_TEX.anisotropy = 8
const SHIKI_MAT = new THREE.MeshToonMaterial({ color: '#ffffff', map: SHIKI_TEX })
// (on a phone at the start only once the 3D's drawn (scene/flatGate): it fetched the lettering for a page with no 3D)
if (typeof document !== 'undefined') whenDrawn(() => void document.fonts?.load('700 40px "LXGW WenKai TC"', '聞野炭火焼魚炭の香や串の雫に秋の声').then(() => {
  const c = SHIKI_TEX?.image as HTMLCanvasElement | undefined
  if (!c) return
  paintShikigami(c.getContext('2d')!)
  SHIKI_TEX!.needsUpdate = true
}).catch(() => {}))
/**
 * The bar's tableware, each piece its own (the owner's, 2026-11-10: they were part of the bar's one batch, nothing when pointed at and not
 * to be moved in edit mode): at each place its chopsticks on their rest (one piece: they go together) and its little soy dish; each two
 * places' soy pot and wasabi on their tray. Pointed at, each is named (nameOver: there's nothing to do with them, so no glow); in edit mode
 * each is moved as any other piece. The chopsticks themselves are BarChopsticks' (a pair is picked up as someone eats), laid where their
 * set's piece stands; the soy GuestBar3D pours is poured where the dish is (SOY_DISH_AT). Out of edit mode it's all drawn as one copy
 * (homeCopy: a draw or two for each of its materials, as when it was in the bar's batch), made again as edit mode's left.
 */
export const BarTableware = memo(function BarTableware() {
  const root = useRef<THREE.Group>(null)
  const pieces = useRef<THREE.Group[]>([])
  const copy = useRef<{ made: number; home: ReturnType<typeof homeCopy> | null; group: THREE.Object3D | null }>({ made: 0, home: null, group: null })
  const frames = useRef(0)
  const editing = useEditSel((s) => s.on)
  useFrame(() => {
    const r = root.current
    if (!r) return
    frames.current++
    const c = copy.current
    // (where each soy dish stands, in the world: for the soy poured into it)
    if (frames.current % 30 === 1 || editing) for (const p of pieces.current) {
      const seat = p.userData.soySeat as number | undefined
      if (seat !== undefined) SOY_DISH_AT.set(seat, p.getWorldPosition(SOY_DISH_AT.get(seat) ?? new THREE.Vector3()))
    }
    if (editing) {
      // (each piece drawn itself while it may be moved; the copy put away, made again after)
      if (c.home) { c.home.home(false); c.group?.removeFromParent(); c.group?.traverse((m) => { if ((m as THREE.Mesh).isMesh) (m as THREE.Mesh).geometry.dispose() }); c.home = null; c.group = null }
      return
    }
    // (made once everything in it has been drawn a while: each piece's own batch made, the edit offsets on them)
    const shown = (p: THREE.Object3D) => { for (let q: THREE.Object3D | null = p; q && q !== r; q = q.parent) if (!q.visible) return false; return true }
    if (!c.home && frames.current > 60 && pieces.current.length && pieces.current.every((p) => p.parent && shown(p))) {
      const before = new Set(r.children)
      c.home = homeCopy(r, pieces.current)
      c.group = r.children.find((k) => !before.has(k)) ?? null
      c.home.home(true)
    }
  })
  useEffect(() => () => {
    const c = copy.current
    c.group?.traverse((m) => { if ((m as THREE.Mesh).isMesh) (m as THREE.Mesh).geometry.dispose() })
  }, [])
  const keep = (k: number) => (g: THREE.Group | null) => { if (g) pieces.current[k] = g }
  let k = 0, first = 0
  return (
    <group ref={root}>
      {GRILL_COUNTERS.map((c, ci) => {
        const yaw = Math.atan2(-c.along.z, c.along.x), gate = BAR_GATES[ci]
        const base = first
        first += c.seats
        return (
          <group key={ci} position={c.at} rotation-y={yaw}>
            {Array.from({ length: c.seats }, (_, n) => {
              const x = seatAlong(c, n), seat = base + n, no = seatLabel(seat)
              return (
                <group key={n}>
                  {/* (the place's printed paper (item 310), under its plate, its chopsticks and its soy dish: drawn with the rest of the tableware) */}
                  <group ref={keep(k++)} name={`shiki-${seat}`} position={[x - 0.0125, BAR_TOP + 0.0005, SHIKI_Z]} {...nameOver('敷紙', '和紙的餐墊，印著本店的木版畫｜每個座位一張')}>
                    <mesh geometry={SHIKI_GEO} material={SHIKI_MAT} receiveShadow />
                  </group>
                  {/* (the chopstick rest: its own piece (the owner's, 2026-11-12: the chopsticks themselves a piece to be moved, said three times)) */}
                  <Movable id={`chopsticks${seat}`} label={`筷架（座位 ${no}）`}>
                    <group ref={keep(k++)} name={`chop-set-${seat}`} position={[x, BAR_TOP, PLACE.chop]} {...nameOver('筷架', '靛藍釉的筷架，黑漆塗箸擱在上面')}>
                      {/* (itself, 136 triangles, its glaze shining (item 281): as a flat sheet (item 144) it was a blue line along the bar) */}
                      {/* (its model's own shapes, the same for every place (item 492: batched one by one, each place made its own copy of each, sixteen
                          on the card for two)) */}
                      <group position={[SETTING.restX, 0, 0]} rotation-y={Math.PI / 2}><BarPiece name="BarHashioki" /></group>
                    </group>
                  </Movable>
                  {/* (the pair of chopsticks: a piece of its own, moved apart from the rest; BarChopsticks, instanced, lays them where this stands, and
                      picks them up for its customer; the box here is only their reach, to be pointed at and chosen: marked the piece's stand-in
                      (`proxy`), or the edit mode's picking passed it by as unseen and a click on the sticks chose the seat they're drawn with (the
                      owner, 2026-11-15, said four times)); fitted to the two sticks as drawn (measured: 22.2 cm long, 2.4 cm across the pair,
                      their sheets 2.7 to 11 mm over the top as they rise onto the rest), so its AABB and OBB are theirs (it stood 2.6 cm tall and
                      4 cm across, and a low camera's ray to the bar top past their end met it first) */}
                  <Movable id={`chopstickpair${seat}`} label={`筷子（座位 ${no}）`}>
                    <group ref={keep(k++)} name={`chop-pair-${seat}`} position={[x, BAR_TOP, PLACE.chop]} {...nameOver('筷子', '黑漆塗箸，客人開動時拿起來')}>
                      <mesh visible={false} userData={{ proxy: true }} position={[0, 0.007, 0]}><boxGeometry args={[SETTING.chopL + 0.003, 0.011, 0.024]} /></mesh>
                    </group>
                  </Movable>
                  <Movable id={`soydish${seat}`} label={`醬油碟（座位 ${no}）`}>
                    {/* (at its own seat: sauceSide is the dish's offset from the seat's middle; drawn at the offset alone since the tableware
                        became pieces of their own (2026-11-10), every counter's dishes lay heaped by its middle (item 335, the owner's: 「醬油碟
                        分配不均?」)) */}
                    <group ref={keep(k++)} userData={{ soySeat: seat }} position={[x + sauceSide(c, gate, x), BAR_TOP + 0.001, PLACE.sauce[1]]}
                      {...nameOver('醬油碟', '染付的小碟，客人坐下時倒醬油、放一點蘿蔔泥')}>
                      {/* (itself, its little well and rim in the round (item 344, the owner's: 「醬油碟是平的?」): one flat sheet with its picture from
                          above it was (item 144), and the soy poured into it lay on nothing) */}
                      {/* (its shape the model's own, shared by every place (item 492), not batched into a copy of its own) */}
                      <BarPiece name="BarSoyDish" design={n} />
                    </group>
                  </Movable>
                </group>
              )
            })}
            {/* the soy pot and the wasabi that each two places share, at the back between them: hung on the lip on a little shelf, their bin
                under it on the counter (item 334) */}
            {sharedAlong(c).map((x, j) => {
              const a = seatLabel(base + 2 * j), b = 2 * j + 1 < c.seats ? seatLabel(base + 2 * j + 1) : null
              return (
                <group key={`shared${j}`}>
                <Movable id={`condiments${base}-${j}`} label={`醬料吊架（座位 ${b === null ? a : `${Math.min(a, b)}・${Math.max(a, b)}`}）`}>
                  <group ref={keep(k++)} position={[x, BAR_TOP + 0.001, PLACE.rack]} {...nameOver('醬料吊架', '掛在吧台內側木板上的小木架，兩個座位共用的染付醬油壺與青瓷山葵罐')}>
                    <StaticBatch plain><BarPiece name="BarCondRack" /></StaticBatch>
                  </group>
                </Movable>
                {/* (the little waste basket the two places share, in front of their soy pot and wasabi: a piece of its own to be moved (the
                    owner's, 2026-11-12: it was in the bar's batch, not to be moved)) */}
                <Movable id={`tablebasket${base}-${j}`} label={`桌上垃圾桶（座位 ${b === null ? a : `${Math.min(a, b)}・${Math.max(a, b)}`}）`}>
                  <group ref={keep(k++)} position={[x, BAR_TOP + 0.001, PLACE.basket]} rotation-y={(j % 2 ? 1 : -1) * 0.25}
                    {...nameOver('桌上垃圾桶', '兩個座位共用的竹編小垃圾桶，放用過的紙巾')}>
                    <StaticBatch plain><TableBasket /></StaticBatch>
                  </group>
                </Movable>
                </group>
              )
            })}
          </group>
        )
      })}
    </group>
  )
})
/** each place's drawer under the top: where it is along the place (to the customer's left: the owner's; half as wide as it was, and for a
 * while on their right),
 * where its case's front edge stands (just behind the top's rounded edge, on the customers' side), how far the drawer slides out, and where its
 * box of tissues sits in it (lengthways) */
export const DRAWER = { x: 0.17, z: -0.296, out: 0.15, tissue: [0, -0.105, 0.122] as [number, number, number] }
/**
 * Each place's drawer, a box of tissues in it (the owner's: one to each place, in its own drawer; they were a box between every two places,
 * on the top): pointed at, it lights up and says so; a click slides it out toward the customer, another back in, with the runners' rumble. Its
 * case is the counter's own (batched with it); the drawer moves, so it isn't, and the tissues in it are drawn only while it's out. Nothing
 * works in edit mode.
 */
// (all shut, the drawers are drawn as one batch, a few draws for the lot, not four apiece (body, brass pull and the ink of each): one
// pulled out is put away from the batch and drawn on its own while it's out, as the till's keys are)
export const BarDrawers = memo(function BarDrawers({ c, first }: { c: Counter; first: number }) {
  const parts = useRef<BatchParts | null>(null)
  return (
    <group position={c.at} rotation-y={Math.atan2(-c.along.z, c.along.x)}>
      <StaticBatch parts={parts}>
        {Array.from({ length: c.seats }, (_, n) => (
          <group key={n} position={[seatAlong(c, n) + DRAWER.x, BAR_TOP - 0.06, DRAWER.z]} userData={{ batchPart: `d${n}` }}><BarPiece name="BarDrawer" grain={n} /></group>
        ))}
      </StaticBatch>
      {Array.from({ length: c.seats }, (_, n) => <BarDrawer key={n} x={seatAlong(c, n) + DRAWER.x} seat={first + n} grain={n} batch={parts} part={`d${n}`} />)}
    </group>
  )
})
/** a place's drawer (its seat's number among all the bars': while someone sits there it's pushed home and stays shut, or it'd go into them; and
 * which of the walnut's boards it's made of) */
function BarDrawer({ x, seat, grain, batch, part }: { x: number; seat: number; grain: number; batch: RefObject<BatchParts | null>; part: string }) {
  const slider = useRef<THREE.Group>(null)
  /** the drawer as drawn on its own (hidden while it's shut and the batch has it; still pointed at: the pointer's rays don't mind) */
  const own = useRef<THREE.Group>(null)
  /** pointed at: drawn on its own then too, its glow being on it, not on the batch */
  const hov = useRef(false)
  const inside = useRef<THREE.Group>(null)
  const sheet = useRef<THREE.Group>(null)
  const box = useRef<THREE.Group>(null)
  const st = useRef({ open: false, at: 0, pulled: -1, used: false, kicked: -1, sheets: null as null | { flat: THREE.Object3D; up: THREE.Object3D } })
  // (how many are left in its box, out of a new box's (the owner's: shown as 200/200))
  const left = () => `${tissuesAt(seat)}/${BOX_SHEETS}`
  const says = () => (st.current.open ? `衛生紙 ${left()}・點衛生紙抽一張・點抽屜推回去` : `一個座位一盒衛生紙（${left()}）・點一下拉開`)
  const tissueSays = () => (tissuesAt(seat) > 0 ? `剩 ${left()}・點一下抽一張` : `${left()}・空了，開店前會換新的一盒`)
  useFrame((_, dt) => {
    const s = st.current
    // (pushed back in as its customer sits down again; away at the toilet or on their way, it can be out (item 269))
    if (s.open && SEATS_SAT.has(seat)) { s.open = false; drawerSound(true) }
    // (its customer's own pull for a tissue (item 269): out a moment, a tissue drawn up out of the box as their hand's at it, and back in)
    const kick = DRAWER_KICK.get(seat)
    const kicked = kick !== undefined && performance.now() - kick < TISSUE_REACH_MS + 150
    if (kick !== undefined && s.kicked !== kick && performance.now() - kick > TISSUE_REACH_MS * 0.45) { s.kicked = kick; s.pulled = 0; s.used = true; tissuePull() }
    // (a box that's been pulled from shows it: the next tissue left standing up out of the slot, the flat one only in a new box)
    if (s.at > 0.02 && box.current) {
      if (!s.sheets) {
        const flat = box.current.getObjectByName('BarTissueLowSheet'), up = box.current.getObjectByName('BarTissueLowPop')
        if (flat && up) s.sheets = { flat, up }
      }
      if (s.sheets) {
        const used = s.used || tissuesAt(seat) < BOX_SHEETS
        // (an empty box shows none (item 182: one stood up out of the slot of a box with none left))
        s.sheets.up.visible = used && tissuesAt(seat) > 0
        s.sheets.flat.visible = !used
      }
    }
    // (a tissue pulled, the owner's way: drawn up out of the slot, its foot in the slot till it's all out, leaning out toward whoever's
    // pulling it, then lifted on up and away, fading. The sheet hangs from its top edge, so it's stretched out of the slot from nothing
    // as its top rises (it hung its whole length below the box from the start, under the drawer, and looked to be falling))
    const g = sheet.current
    if (g && s.pulled >= 0) {
      s.pulled += dt
      const k = s.pulled / TISSUE_FLY
      if (k >= 1) { s.pulled = -1; g.visible = false } else {
        g.visible = true
        const rise = THREE.MathUtils.smoothstep(k, 0, 0.42)
        const free = THREE.MathUtils.smootherstep(k, 0.42, 1)
        const len = TISSUE_LEN * rise
        // (its top edge: up out of the slot and leaning out toward the customer as it comes, then on up and away)
        g.position.set(Math.sin(k * 7) * 0.006 * free, TISSUE_SLOT + len * 0.93 + free * 0.1, -(0.4 * len + free * 0.17))
        // (leaning back to the slot as it's drawn, its width along the slot's length; a little sway once it's free)
        g.rotation.set(-0.4 * rise + 0.15 * free, Math.PI / 2 + Math.sin(k * 4) * 0.25 * free, Math.sin(k * 6) * 0.1 * free)
        g.scale.set(0.72 + 0.28 * free, Math.max(0.02, rise), 1)
        const fade = 1 - THREE.MathUtils.smoothstep(k, 0.62, 1)
        g.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.Material | undefined; if (m) m.opacity = fade })
      }
    }
    // (out while the stock keeper changes its box of tissues, too)
    const want = s.open || kicked || DRAWER_HELD.has(seat) ? 1 : 0
    if (inside.current && want) inside.current.visible = true
    // (drawn on its own while it's anything but home and shut, the batch's copy of it put away meanwhile; the batch not made yet, on its own)
    const alone = want > 0 || s.at > 0 || hov.current || !batch.current
    if (own.current && own.current.visible !== alone) { own.current.visible = alone; batch.current?.show(part, !alone) }
    if (Math.abs(want - s.at) < 1e-4) return
    s.at = Math.abs(want - s.at) < 0.002 ? want : s.at + (want - s.at) * Math.min(1, dt * 7)
    if (slider.current) slider.current.position.z = -DRAWER.out * s.at
    if (inside.current) inside.current.visible = s.at > 0.02
  })
  /** whether the pointer's ray reached it through the top (the owner's, 2026-11-10: pointing at the bar top over a drawer lit it and named it,
   * the drawer under the wood): it crossed the top's face behind its rounded front edge before it got to the drawer */
  const topHides = (e: { ray: THREE.Ray; point: THREE.Vector3 }) => {
    const frame = slider.current?.parent?.parent
    if (!frame) return false
    const inv = frame.matrixWorld.clone().invert()
    const o = e.ray.origin.clone().applyMatrix4(inv)
    const d = e.point.clone().applyMatrix4(inv).sub(o)
    if (d.y >= 0) return false
    const t = (BAR_TOP - o.y) / d.y
    return t > 0 && t < 1 && o.z + d.z * t > -BAR_DEPTH / 2 + 0.004
  }
  /** pointed at (not through the top): lit and named as the pointer moves over it (its name kept up to date: the drawer, or the tissues in
   * it); through the top, as if it weren't */
  const hover = (e: { ray: THREE.Ray; point: THREE.Vector3; stopPropagation: () => void }, title: string, hint: () => string) => {
    if (getEdit().on) return
    const ev = e as unknown as Parameters<ReturnType<typeof tipOver>['onPointerOver']>[0]
    if (topHides(e)) { if (hov.current) { hov.current = false; tipOver(title, '').onPointerOut(ev) } return }
    e.stopPropagation()
    if (!hov.current) { hov.current = true; tipOver(title, hint()).onPointerOver(ev) } else setTip({ title, hint: hint() })
  }
  const unhover = (e: Parameters<ReturnType<typeof tipOver>['onPointerOut']>[0]) => {
    if (!hov.current) return
    hov.current = false
    if (!getEdit().on) tipOver('抽屜', '').onPointerOut(e)
  }
  /** the drawer clicked: out, or back in */
  const toggle = () => {
    if (SEATS_SAT.has(seat)) { setTip({ title: '抽屜', hint: '客人坐著，等他走了再開' }); return }
    st.current.open = !st.current.open
    drawerSound(!st.current.open)
    setTip({ title: '抽屜', hint: says() })
  }
  return (
    <group position={[x, BAR_TOP - 0.06, DRAWER.z]}>
      {/* (handlers on a group round it: a primitive's own aren't attached) */}
      <group ref={slider} name={`drawer-slider-${seat}`}
        onPointerMove={(e) => hover(e, '抽屜', says)}
        onPointerOut={unhover}
        onClick={(e) => {
          if (getEdit().on || topHides(e)) return
          e.stopPropagation()
          toggle()
        }}>
        <group ref={own}><BarPiece name="BarDrawer" grain={grain} /></group>
        <group ref={inside} position={DRAWER.tissue} visible={false}>
          {/* (the box itself: a click on it pulls a tissue. Shut away it isn't drawn, but it's still in the pointer's way (the pointer's
              rays don't mind what's hidden): there it's the drawer, which a click opens) */}
          <group onPointerMove={(e) => (st.current.open ? hover(e, '衛生紙', tissueSays) : hover(e, '抽屜', says))}
            onClick={(e) => {
              if (getEdit().on || topHides(e)) return
              e.stopPropagation()
              if (!st.current.open) { toggle(); return }
              // (one out of the box: it's counted, as the customers' are)
              if (st.current.pulled < 0 && tissuesAt(seat) > 0) {
                st.current.pulled = 0
                st.current.used = true
                setTissues(seat, tissuesAt(seat) - 1)
                tissuePull()
                setTip({ title: '衛生紙', hint: tissueSays() })
              }
            }}>
            <group ref={box}><BarPiece name="BarTissueLow" /></group>
          </group>
          <group ref={sheet} visible={false}><BarPiece name="BarTissuePull" fade /></group>
        </group>
      </group>
    </group>
  )
}

/** the chopsticks' ink, drawn for each of their instances: BarPiece's hull (their back faces pushed out along their welded normals) */
const CHOP_INK = new THREE.ShaderMaterial({
  uniforms: { uWidth: { value: 0.0008 }, uColor: { value: new THREE.Color('#3b2a20') } },
  vertexShader: /* glsl */ `
    uniform float uWidth;
    void main() {
      vec4 p = vec4(position + normalize(normal) * uWidth, 1.0);
      #ifdef USE_INSTANCING
      p = instanceMatrix * p;
      #endif
      gl_Position = projectionMatrix * modelViewMatrix * p;
    }`,
  fragmentShader: /* glsl */ `
    uniform vec3 uColor;
    void main() { gl_FragColor = vec4(uColor, 1.0); }`,
  side: THREE.BackSide,
})
const CHOP_GONE = new THREE.Matrix4().makeScale(0, 0, 0)
/**
 * Every place's chopsticks at once, one draw and one for their ink (instanced): lying across the place on their rest until its customer starts
 * eating, when they're picked up (FolkFigure has the same lacquered pair in the hand) and gone from the rest till they've done (the owner's:
 * the customers ate with the pair on the rest untouched). Out of the bar's batch, so a pair can go.
 */
export const BarChopsticks = memo(function BarChopsticks() {
  useStudio()
  const gltf = useGLTF(SETTING_URL) as unknown as { scene: THREE.Group }
  const made = useMemo(() => {
    const src = gltf.scene.getObjectByName('BarChopstick')
    let mesh: THREE.Mesh | null = null
    src?.traverse((o) => { if (!mesh && (o as THREE.Mesh).isMesh) mesh = o as THREE.Mesh })
    if (!src || !mesh) return null
    const m0 = mesh as THREE.Mesh
    // (its shape in the piece's own frame, its root at the origin, as BarPiece lays it)
    src.updateMatrixWorld(true)
    const geo = m0.geometry.clone().applyMatrix4(new THREE.Matrix4().copy(src.matrixWorld).invert().multiply(m0.matrixWorld))
    const was = m0.material as THREE.MeshStandardMaterial
    // (black lacquer with the studio's gleam along it: a stick shows its round by its light (item 281))
    const mat = new THREE.MeshStandardMaterial({ color: was.color.clone(), map: was.map, roughness: 0.28, metalness: 0, envMapIntensity: 0.9 })
    reflectStudio(mat)
    const shape = new THREE.BufferGeometry()
    shape.setAttribute('position', geo.attributes.position)
    if (geo.index) shape.setIndex(geo.index)
    const hull = mergeVertices(shape, 1e-5)
    hull.computeVertexNormals()
    // (each place's two sticks where they lie, in the bars' frame: its counter, its place along it, and each stick on the rest; as laid
    // there, and moved with their own piece once it's drawn (BarTableware's chop-pair-<place>, moved in edit mode as it may be))
    const places: THREE.Matrix4[][] = []
    const e = new THREE.Euler(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1)
    const onSet = [-1, 1].map((sd) => new THREE.Matrix4().compose(new THREE.Vector3(-SETTING.chopL / 2, 0.0015, sd * 0.0075),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, sd * 0.012, SETTING.chopTilt)), one))
    for (const c of GRILL_COUNTERS) {
      const bar = new THREE.Matrix4().compose(c.at, q.setFromEuler(e.set(0, Math.atan2(-c.along.z, c.along.x), 0)), one)
      for (let n = 0; n < c.seats; n++) {
        const at = bar.clone().multiply(new THREE.Matrix4().makeTranslation(seatAlong(c, n), BAR_TOP, PLACE.chop))
        places.push(onSet.map((s) => at.clone().multiply(s)))
      }
    }
    // (each lying stick itself, 56 triangles, square at the top tapering to its rounded tip, its ink line round it, both instanced: two draws
    // for every place's pair (item 281, the owner's, 2026-11-17: 「筷子跟筷架要有基本的立體感」: laid as one flat sheet with its picture from
    // above (item 144) they were a hairline seen along the bar, and cast no shadow); those in a customer's hand are theirs, drawn with them)
    // (and room for those off the places (item 600): on a tray, standing in the soaking pot, on their way back to a place)
    const sticks = new THREE.InstancedMesh(geo, mat, places.length * 2 + CHOPS_LOOSE.m.length)
    const ink = new THREE.InstancedMesh(hull, CHOP_INK, places.length * 2 + CHOPS_LOOSE.m.length)
    ink.instanceMatrix = sticks.instanceMatrix
    sticks.count = ink.count = places.length * 2
    sticks.receiveShadow = true
    sticks.frustumCulled = ink.frustumCulled = false
    return { sticks, ink, places, geo, hull, mat, onSet }
  }, [gltf])
  // (the sets' pieces as they stand: looked up once they're drawn; read again while editing, as they're moved)
  const sets = useRef<(THREE.Object3D | null)[]>([])
  const settled = useRef(0)
  const scene = useThree((s) => s.scene)
  useEffect(() => () => { if (made) { made.geo.dispose(); made.hull.dispose(); made.mat.dispose(); made.ink.dispose(); made.sticks.dispose() } }, [made])
  // (which places' pairs are up, last laid out: laid out again only when that changes)
  const shown = useRef('-')
  const loose = useMemo(() => ({ inv: new THREE.Matrix4(), m: new THREE.Matrix4() }), [])
  useFrame(() => {
    if (!made) return
    // (up in a hand, or taken up with what's cleared and not laid again (item 600); and those off the places, as they move)
    let up = 0, off = 0
    for (const n of CHOPS_UP) up |= 1 << n
    for (const n of CHOPS_OFF) off |= 1 << n
    let key = `${up}/${off}/${CHOPS_LOOSE.ver}`
    // (laid where their set's piece is: found once it's drawn, and followed while edit mode's on)
    const parent = made.sticks.parent
    if (parent && (settled.current < 2 || getEdit().on)) {
      let all = true
      made.places.forEach((pair, i) => {
        const o = sets.current[i]?.parent ? sets.current[i] : (sets.current[i] = scene.getObjectByName(`chop-pair-${i}`) ?? null)
        if (!o) { all = false; return }
        o.updateWorldMatrix(true, false)
        const m = new THREE.Matrix4().copy(parent.matrixWorld).invert().multiply(o.matrixWorld)
        pair.forEach((p, k) => p.copy(m).multiply(made.onSet[k]))
      })
      if (all) { settled.current++; key += `|${settled.current}|${getEdit().on ? performance.now() : ''}` }
    }
    if (key === shown.current) return
    shown.current = key
    made.places.forEach((pair, i) => pair.forEach((m, k) => made.sticks.setMatrixAt(i * 2 + k, CHOPS_UP.has(i) || CHOPS_OFF.has(i) ? CHOP_GONE : m)))
    // (the pairs off the places, laid out in the world by GuestBar3D: into this one's frame)
    const base = made.places.length * 2, n = Math.min(CHOPS_LOOSE.n, CHOPS_LOOSE.m.length)
    if (n > 0 && parent) {
      loose.inv.copy(parent.matrixWorld).invert()
      for (let k = 0; k < n; k++) made.sticks.setMatrixAt(base + k, loose.m.multiplyMatrices(loose.inv, CHOPS_LOOSE.m[k]))
    }
    made.sticks.count = made.ink.count = base + (parent ? n : 0)
    made.sticks.instanceMatrix.needsUpdate = true
  })
  if (!made) return null
  return (
    <>
      <primitive object={made.sticks} />
      <primitive object={made.ink} />
    </>
  )
})
/** where a place's chopsticks lie (across it, nearest the customer), how long they are, how far along their rest stands under their tips, and the
 * slope they lie at from the table up onto it */
// (the rest lies across the chopsticks now (the owner's): they cross its drawn-in waist, lower than its ends, so they slope less)
const SETTING = { chopL: 0.22, restX: 0.088, chopTilt: Math.atan2(0.0075, 0.198) }
/** how long a pulled tissue takes to come out and drift off, fading; how long it is (BarTissuePull hangs this far from its top edge); and how
 * high the box's slot stands over the box's foot */
const TISSUE_FLY = 1.8
const TISSUE_LEN = 0.17
const TISSUE_SLOT = 0.06
const SETTING_URL = import.meta.env.BASE_URL + 'models/barsetting.glb'
const settingPieces = new Map<string, THREE.Object3D>()
/**
 * One of a place's things (blender/barsetting.py): the soy dish (in the plates' design `design`), a chopstick, the rest, the tissues, the
 * drawer and its case (in the walnut's board `grain`, one of four: the places' drawers aren't all cut from one), the shared soy pot and wasabi.
 * `fade`: its own materials, to be faded out (a pulled tissue).
 */
export function BarPiece({ name, design, grain, fade, flat }: { name: string; design?: number; grain?: number; fade?: boolean; flat?: boolean }) {
  useStudio()
  const gltf = useGLTF(SETTING_URL) as unknown as { scene: THREE.Group }
  const gl = useThree((s) => s.gl)
  const obj = useMemo(() => {
    const board = grain === undefined ? undefined : grain % 4
    const key = `${name}|${design ?? ''}|${board ?? ''}`
    let base = settingPieces.get(key)
    if (!base) {
      const src = gltf.scene.getObjectByName(name)!
      // (the board: the picture on its swatch)
      const swatch = board === undefined ? null
        : ((gltf.scene.getObjectByName(`BarWalnutSwatchMesh${board}`) as THREE.Mesh | undefined)?.material as THREE.MeshStandardMaterial | undefined)?.map ?? null
      base = src.clone(true)
      base.position.set(0, 0, 0)
      base.traverse((o) => {
        const m = o as THREE.Mesh
        if (!m.isMesh) return
        const was = m.material as THREE.MeshStandardMaterial
        // (the hung condiment shelf in the bar's lip's own wood (item 334))
        const map = design !== undefined && /Dish/.test(was.name) ? wareDesign(design) : swatch && /Walnut/.test(was.name) ? swatch
          : /RackWood/.test(was.name) ? TRAY_WOOD : was.map
        // (the walnut glowing a little with its own grain: under the bar's top it's in shadow, and it went a dark brown block there)
        const wood = /Walnut/.test(was.name)
        // (the chopstick rest's indigo glaze glossy, the studio's light caught on its curves (item 281))
        const glaze = /RestGlaze/.test(was.name) ? new THREE.MeshStandardMaterial({ color: was.color.clone(), map, roughness: 0.22, metalness: 0, envMapIntensity: 0.8 }) : null
        if (glaze) reflectStudio(glaze)
        m.material = /Brass/.test(was.name) ? barBrassOf() : glaze ? glaze
          : new THREE.MeshToonMaterial({ color: was.color.clone(), map,
            ...(wood ? { emissive: new THREE.Color('#ffffff'), emissiveMap: map, emissiveIntensity: 0.2 } : {}),
            side: /Paper/.test(was.name) ? THREE.DoubleSide : THREE.FrontSide })
        m.castShadow = /Tissue/.test(name)
        m.receiveShadow = true
      })
      inkModel(base, (m) => /Slot|Sheet|Spoon/.test(m.name), { width: 0.0008, weld: true })
      settingPieces.set(key, base)
    }
    // (laid flat on the bar, one sheet with its picture from above (the owner's, 2026-11-15: the soy dishes, the chopsticks and their rests))
    if (flat) {
      const f = flatOf(gl, key, base)
      const g = new THREE.Group(), m = new THREE.Mesh(f.geo, f.mat)
      m.name = name
      m.receiveShadow = true
      g.add(m)
      return g
    }
    const made = base.clone(true)
    // (to fade: its own materials, see-through)
    if (fade) made.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) { const t = (m.material as THREE.Material).clone(); t.transparent = true; t.depthWrite = false; m.material = t }
    })
    return made
  }, [gltf, name, design, grain, fade, flat, gl])
  // (a faded copy's materials are its own: let go of with it)
  useEffect(() => () => {
    if (fade) obj.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) (m.material as THREE.Material).dispose() })
  }, [obj, fade])
  return <primitive object={obj} />
}
useGLTF.preload(SETTING_URL)


/**
 * What edit mode shows for a piece that is moved by the table's nudge rather than by wrapping it: a block of its size that is never drawn, standing
 * where the piece is less the edit's own offset, in a Movable, so the box, the arrows and the fields work as for any other piece.
 */
// (drawn again only when its place or size changes, not with every redraw of the kitchen: `at` is worked out afresh each time)
export const EditProxy = memo(EditProxyImpl, (a, b) => a.id === b.id && a.label === b.label && a.yaw === b.yaw && a.at.equals(b.at) && a.size.every((v, i) => v === b.size[i]))
function EditProxyImpl({ id, label, at, size, yaw }: { id: string; label: string; at: THREE.Vector3; size: V3; yaw: number }) {
  // (redrawn as its own place changes (item 186))
  useEditSel(() => String(positionOf(id)))
  const o = positionOf(id)
  return (
    <Movable id={id} label={label}>
      {/* (unseen, but there to be pointed at in edit mode, where its glow shows the piece's place) */}
      <mesh position={[at.x - o[0], at.y - o[1] + size[1] / 2, at.z - o[2]]} rotation-y={yaw} userData={{ proxy: true }}>
        <boxGeometry args={size} />
        <meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false} />
      </mesh>
    </Movable>
  )
}
