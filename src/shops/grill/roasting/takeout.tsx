import { memo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { colourVertices } from '@/scene/render/StaticBatch'
import { brushText, signTexture } from '@/scene/props/signFont'
import { sameProps } from '@/scene/kit/sameProps'
import { TAKEOUT } from '@/shops/grill/bar'
import { ALONG, nameOver } from '@/shops/grill/bar'
import { TasteBowlImpl } from './serving'

/** The tasting bowl (試食碗): a deep round bowl of the same plum-blossom ware, where whatever's cooked by hand to try is put. */
/**
 * The takeaway box (game/takeout; the owner's): at the plating place's second slot while an order's being packed, open, its food laid in; all of
 * it in, its lid on and wrapped; gone as a server takes it out to the till.
 * (the owner's, 2026-11-13: "an unknown little brown block on the table". It was a kraft card tray, the table's own brown: open, its food in it
 * read as a little tray; shut, only its white paper band showed, a white card on the table. Now a takeaway bento as they're sold in Japan and
 * Taiwan: a black box, red inside, its rice in its own end (white, a pickled plum on it) and the food beside it; shut, a black lid wrapped in
 * the shop's printed paper (掛け紙: 聞野, 焼魚, its red seal), a red cord round it, the chopsticks in their sleeve under it. Named when
 * pointed at.) One draw for the box, two for the lid.
 */
// (a bento's size: a fish at the plate's size lies in it, its length across the table, three side by side along it)
// (long enough for a whole saury, the longest (0.545 at the plate's size): 0.4 long, a saury's tail and a squid hung out over its end)
const BOX_W = 0.58, BOX_D = 0.26, BOX_H = 0.07
/** the rice's end of the box, past the food's on the fire's side along the table (the food where it always lay, over the box's middle before) */
const RICE_D = 0.1
/** the box's two ends along the table (its own z: the table's ALONG), from the food's middle (TAKEOUT_SPOT) */
const BOX_Z0 = -BOX_D / 2 - RICE_D, BOX_Z1 = BOX_D / 2
/** how high each box stands over the one under it (its lid's top): a second order's box set on the first's while that waits to be taken
 * (the owner's, 2026-11-11: a second order's fish were laid on the first's shut lid, "a strange little board with a fish on it") */
export const BOX_TIER = BOX_H + 0.03  // (over the lid's paper, its cord and the chopsticks on it)
/** the takeaways' boxes that can stand stacked at once */
const BOX_TIERS = 3
/** which box an order's food goes in: the one it has, or the lowest no other order waiting holds */
export const tierOf = (id: number) => {
  const o = TAKEOUT.orders.find((x) => x.id === id)
  if (!o) return 0
  if (o.tier === undefined) {
    const held = new Set(TAKEOUT.orders.filter((x) => x !== o && !x.taken && x.tier !== undefined).map((x) => x.tier))
    let t = 0
    while (held.has(t) && t < BOX_TIERS - 1) t++
    o.tier = t
  }
  return o.tier
}
/** one plain block of the box, its points coloured (the box's parts are one draw between them: scene/StaticBatch's colourVertices) */
const bentoBlock = (w: number, h: number, d: number, x: number, y: number, z: number, c: THREE.Color) => {
  const g = new THREE.BoxGeometry(w, h, d).translate(x, y, z)
  colourVertices(g, c)
  return g
}
/** the same, turned about its own middle (x, then y) before it's set in place */
const bentoTurned = (w: number, h: number, d: number, x: number, y: number, z: number, c: THREE.Color, rx: number, ry: number) => {
  const g = new THREE.BoxGeometry(w, h, d).rotateX(rx).rotateY(ry).translate(x, y, z)
  colourVertices(g, c)
  return g
}
const BENTO_BLACK = new THREE.Color('#1d1a18'), BENTO_RICE = new THREE.Color('#f2eee4')
const CORD_RED = new THREE.Color('#c0262a'), SLEEVE_WHITE = new THREE.Color('#f4efe4')
/** inside the box (item 122, the owner's, 2026-11-15: a bento as in the picture they sent): a charcoal-black lining and walls, as moulded
 * takeaway boxes are, where it was lacquer red */
const BENTO_IN = new THREE.Color('#2e2b29')
/** the bento's sides' colours (item 78, 122): the leaf, broccoli and its stalk, carrot, the salad's shredded cabbage and purple cabbage,
 * lemon, sesame; the miso soup's cup, the soup, its wakame and tofu */
const BENTO_LEAF = new THREE.Color('#8cc152')
const BENTO_GREEN = new THREE.Color('#3f7d2c'), BENTO_STALK = new THREE.Color('#9cc46a'), BENTO_CARROT = new THREE.Color('#e8762a')
const BENTO_LEMON = new THREE.Color('#f5e15a')
const BENTO_SESAME = new THREE.Color('#1a1714'), BENTO_CUP = new THREE.Color('#a3231b'), BENTO_MISO = new THREE.Color('#b98a45')
const BENTO_WAKAME = new THREE.Color('#2f4a22'), BENTO_TOFU = new THREE.Color('#f4f0e2')
/** (item 331) the pickled plum, the takuan and the shibazuke, the rolled omelette and its browned top */
const BENTO_PLUM = new THREE.Color('#b8232e'), BENTO_TAKUAN = new THREE.Color('#f2d23a'), BENTO_SHIBA = new THREE.Color('#b0477a')
const BENTO_EGG = new THREE.Color('#f6d35c'), BENTO_EGG_TOP = new THREE.Color('#e3a93a')
/** the box and its lid's black, red and white, coloured on their points: one material for both */
const BENTO_MAT = new THREE.MeshToonMaterial({ vertexColors: true })
/** a flat round face, up, filled in rows across it (a zigzag from one side to the other: no fan of triangles to its middle point) */
function ladderDisc(r: number, n: number, x: number, y: number, z: number, c: THREE.Color) {
  const p = Array.from({ length: n }, (_, k) => [x + r * Math.cos((2 * Math.PI * k) / n), z + r * Math.sin((2 * Math.PI * k) / n)])
  const tri: number[] = []
  const put = (a: number, b: number, d: number) => { for (const k of [a, d, b]) tri.push(p[k][0], y, p[k][1]) }
  let i = 0, j = n - 1
  while (j - i > 1) {
    put(i, i + 1, j)
    if (j - 1 > i + 1) put(i + 1, j - 1, j)
    i++
    j--
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(tri, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((tri.length / 3) * 2).fill(0), 2))
  g.computeVertexNormals()
  colourVertices(g, c)
  return g
}
let bentoGeo: THREE.BufferGeometry | null = null
/**
 * The bento's cells, in its own frame (x its long side, z across it from the back): as a grilled-fish bento's are laid out (item 331, the
 * owner's, 2026-11-18: 「便當有點亂塞」: the rice squeezed in a strip at the back, three great flat leaves over the middle, the broccoli and
 * carrot and a heap of shredded salad at its ends just where a fish's head and tail came, a fourth piece laid on the third): along the back
 * the rice (white, black sesame, a pickled plum in its middle), the pickles, the miso soup's cup; at the front the main cell, where what was
 * grilled lies along the box's length on a leaf, side by side, never on another; and beside it a column of two: broccoli and carrot, and
 * rolled omelette. Each cell's walls low and black; all of it inside the box
 */
const BENTO = {
  back: [-0.222, -0.07] as const, front: [-0.07, 0.122] as const,
  rice: [-0.282, 0.04] as const, pickles: [0.04, 0.13] as const, soup: [0.13, 0.282] as const,
  main: [-0.282, 0.168] as const, side: [0.168, 0.282] as const, sideSplit: 0.026,
}
/** the open box, made once: black outside, charcoal within, its cells and what's in each but the grilled food (laid in as it's served) */
function bentoBox() {
  if (bentoGeo) return bentoGeo
  const T = 0.008, D = BOX_Z1 - BOX_Z0, zc = (BOX_Z0 + BOX_Z1) / 2, L = 0.002, gap = 0.0005, F = 0.0075
  const B = BENTO
  const wallH = BOX_H * 0.78, wall = (w: number, d: number, x: number, z: number) => bentoBlock(w, wallH, d, x, F + wallH / 2, z, BENTO_IN)
  const parts = [
    bentoBlock(BOX_W, 0.005, D, 0, 0.0025, zc, BENTO_BLACK),
    bentoBlock(BOX_W - 2 * T - 2 * gap, L, D - 2 * T - 2 * gap, 0, 0.005 + gap + L / 2, zc, BENTO_IN),
    ...[BOX_Z0, BOX_Z1].flatMap((z, i) => {
      const s2 = i === 0 ? 1 : -1
      return [
        bentoBlock(BOX_W, BOX_H, T, 0, BOX_H / 2, z + s2 * T / 2, BENTO_BLACK),
        bentoBlock(BOX_W - 2 * T - 2 * gap, BOX_H - 0.012, L, 0, BOX_H / 2, z + s2 * (T + gap + L / 2), BENTO_IN),
      ]
    }),
    ...[-1, 1].flatMap((sx) => [
      bentoBlock(T, BOX_H, D - 2 * T, sx * (BOX_W / 2 - T / 2), BOX_H / 2, zc, BENTO_BLACK),
      bentoBlock(L, BOX_H - 0.012, D - 2 * T - 2 * gap - 2 * L, sx * (BOX_W / 2 - T - gap - L / 2), BOX_H / 2, zc, BENTO_IN),
    ]),
    // (the cells' walls: between the back row and the front; across the back row; the side column's, and across it)
    wall(0.556, 0.005, 0, B.back[1]),
    ...[B.pickles[0], B.soup[0]].map((x) => wall(0.005, B.back[1] - B.back[0] - 0.006, x, (B.back[0] + B.back[1]) / 2)),
    wall(0.005, B.front[1] - B.front[0] - 0.006, B.side[0], (B.front[0] + B.front[1]) / 2),
    wall(B.side[1] - B.side[0] - 0.006, 0.005, (B.side[0] + B.side[1]) / 2, B.sideSplit),
  ]
  // (the rice: its bed and a rounded top in its cell, clumps of grains over it, black sesame, a pickled plum in its middle)
  const riceX = (B.rice[0] + B.rice[1]) / 2, riceZ = (B.back[0] + B.back[1]) / 2
  const riceW = B.rice[1] - B.rice[0] - 0.012, riceD = B.back[1] - B.back[0] - 0.012
  parts.push(bentoBlock(riceW, 0.034, riceD, riceX, F + 0.017, riceZ, BENTO_RICE))
  parts.push(bentoBlock(riceW - 0.03, 0.01, riceD - 0.026, riceX, F + 0.039, riceZ, BENTO_RICE))
  const riceTop = F + 0.044
  const RICE_SHADE = new THREE.Color('#e6e0d0')
  const grains = Array.from({ length: 40 }, (_, k) => {
    const gx = riceX + ((k % 10) / 9 - 0.5) * (riceW - 0.03) + Math.sin(k * 3.1) * 0.004
    const gz = riceZ + ((Math.floor(k / 10)) / 3 - 0.5) * (riceD - 0.03) + Math.cos(k * 2.3) * 0.004
    return bentoTurned(0.016, 0.008, 0.011, gx, riceTop - 0.003 + (k % 3) * 0.0015, gz, k % 4 === 0 ? RICE_SHADE : BENTO_RICE, 0.3 * Math.sin(k), k * 1.3)
  })
  const sesame = Array.from({ length: 16 }, (_, k) => bentoTurned(0.006, 0.002, 0.0035, riceX + Math.sin(k * 2.7) * 0.11, riceTop + 0.004, riceZ + Math.cos(k * 1.9) * 0.05,
    BENTO_SESAME, 0, k * 0.9))
  const plum = new THREE.IcosahedronGeometry(0.016, 1).scale(1, 0.8, 1).translate(riceX, riceTop + 0.008, riceZ)
  colourVertices(plum, BENTO_PLUM)
  // (the pickles: three slices of yellow takuan leaning on each other, a little heap of pink shibazuke)
  const pkX = (B.pickles[0] + B.pickles[1]) / 2
  const pickles = [
    ...[0, 1, 2].map((k) => bentoTurned(0.034, 0.006, 0.03, pkX - 0.012 + k * 0.012, F + 0.016, riceZ - 0.03, BENTO_TAKUAN, 0.9, 0.2 * k)),
    ...Array.from({ length: 7 }, (_, k) => bentoTurned(0.016, 0.006, 0.008, pkX + Math.sin(k * 2.2) * 0.022, F + 0.006 + (k % 3) * 0.004, riceZ + 0.03 + Math.cos(k * 1.7) * 0.014, BENTO_SHIBA, 0.3 * Math.sin(k), k * 1.1)),
  ]
  // (the miso soup: a red cup in its cell, the soup a little under its rim, wakame and two cubes of tofu in it)
  const cupX = (B.soup[0] + B.soup[1]) / 2, cupR = 0.042, cupH = 0.048
  const cup = new THREE.LatheGeometry([new THREE.Vector2(cupR * 0.72, 0), new THREE.Vector2(cupR * 0.82, 0.003), new THREE.Vector2(cupR, cupH * 0.55),
    new THREE.Vector2(cupR, cupH), new THREE.Vector2(cupR - 0.003, cupH), new THREE.Vector2(cupR - 0.003, cupH - 0.008)], 16).translate(cupX, F, riceZ)
  colourVertices(cup, BENTO_CUP)
  const soupY = F + cupH - 0.008
  const soup = ladderDisc(cupR - 0.003, 16, cupX, soupY, riceZ, BENTO_MISO)
  const inSoup = [
    ...[[-0.012, -0.008, 0.4], [0.01, 0.012, 1.9], [0.014, -0.014, 3.0]].map(([dx, dz, a]) => bentoTurned(0.016, 0.002, 0.009, cupX + dx, soupY + 0.001, riceZ + dz, BENTO_WAKAME, 0, a)),
    ...[[-0.004, 0.014], [0.002, -0.016]].map(([dx, dz], k) => bentoTurned(0.008, 0.005, 0.008, cupX + dx, soupY + 0.0015, riceZ + dz, BENTO_TOFU, 0, k * 0.6)),
  ]
  // (the main cell's leaf, under what's laid in: one lettuce leaf the cell's size, its edge ruffled a little, lying low)
  const mX = (B.main[0] + B.main[1]) / 2, mZ = (B.front[0] + B.front[1]) / 2
  const mW = B.main[1] - B.main[0] - 0.016, mD = B.front[1] - B.front[0] - 0.016
  const leaf = new THREE.PlaneGeometry(mW, mD, 8, 4).rotateX(-Math.PI / 2)
  {
    const lp = leaf.attributes.position
    for (let i = 0; i < lp.count; i++) {
      const lx = lp.getX(i), lz = lp.getZ(i), e = Math.max(Math.abs(lx) / (mW / 2), Math.abs(lz) / (mD / 2))
      lp.setY(i, 0.002 + e * e * (0.004 + 0.003 * Math.sin(lx * 90 + lz * 40)))
    }
    leaf.translate(mX, F, mZ)
    colourVertices(leaf, BENTO_LEAF)
  }
  // (the side column: two florets of broccoli and two slices of carrot; and two pieces of rolled omelette, their layers showing)
  const sX = (B.side[0] + B.side[1]) / 2
  const greens = [[sX - 0.022, B.front[0] + 0.03], [sX + 0.02, B.front[0] + 0.036]].flatMap(([x, z], k) => {
    const floret = new THREE.IcosahedronGeometry(0.02 - k * 0.002, 0).scale(1, 0.75, 1).rotateY(k * 0.8).translate(x, F + 0.028, z)
    colourVertices(floret, BENTO_GREEN)
    return [floret, bentoBlock(0.01, 0.016, 0.01, x, F + 0.009, z, BENTO_STALK)]
  })
  const carrots = [[sX - 0.018, B.sideSplit - 0.022, 0.4], [sX + 0.022, B.sideSplit - 0.02, 1.6]].map(([x, z, a]) => bentoTurned(0.024, 0.012, 0.018, x, F + 0.007, z, BENTO_CARROT, 0.25, a))
  const omelette = [-1, 1].flatMap((k) => {
    const x = sX + k * 0.024, z = (B.sideSplit + B.front[1]) / 2
    return [bentoBlock(0.038, 0.026, 0.05, x, F + 0.013, z, BENTO_EGG), bentoBlock(0.039, 0.003, 0.051, x, F + 0.0275, z, BENTO_EGG_TOP)]
  })
  // (a wedge of lemon in the main cell's far corner, for the fish)
  const lemon = bentoTurned(0.034, 0.016, 0.014, B.main[1] - 0.03, F + 0.012, B.front[1] - 0.02, BENTO_LEMON, 0, 0.5)
  bentoGeo = mergeGeometries([...parts, ...grains, ...sesame, plum, ...pickles, cup, soup, ...inSoup, leaf, ...greens, ...carrots, ...omelette, lemon]
    .map((g) => (g.index ? g.toNonIndexed() : g)))!
  return bentoGeo
}
/** where the `row`-th of `n` pieces of an order lies in its box (its own frame: x along the box, z across it): in the main cell, side by side
 * across it, each along the box's length, never one on another (item 331) */
export function bentoSpot(row: number, n: number) {
  const B = BENTO, k = Math.max(3, Math.min(5, n)), d = (B.front[1] - B.front[0] - 0.02) / k
  return { x: (B.main[0] + B.main[1]) / 2, z: B.front[0] + 0.01 + d * (Math.min(row, k - 1) + 0.5) }
}
let lidGeo: THREE.BufferGeometry | null = null
/** the lid, made once: black, over the box's rim; a red cord round it across the table (down both its long sides), the chopsticks in their
 * white sleeve (a red band at its top) along the cook's edge, under the cord */
function bentoLid() {
  if (lidGeo) return lidGeo
  const D = BOX_Z1 - BOX_Z0, zc = (BOX_Z0 + BOX_Z1) / 2, top = BOX_H + 0.012
  // (the cord near the box's far end, clear of the print; the sleeve long enough to go under it)
  const cordZ = BOX_Z1 - 0.03, cw = 0.006
  const parts = [
    bentoBlock(BOX_W + 0.012, 0.012, D + 0.012, 0, BOX_H + 0.006, zc, BENTO_BLACK),
    // (the cord: over the top (above the paper) and down both sides, a hair out from the lid's)
    bentoBlock(BOX_W + 0.018, 0.004, cw, 0, top + 0.004, cordZ, CORD_RED),
    ...[-1, 1].map((sx) => bentoBlock(0.003, 0.03, cw, sx * (BOX_W / 2 + 0.0075), top - 0.012, cordZ, CORD_RED)),
    // (the chopsticks' sleeve: lying along the table, under the cord, toward the cook's side (its own -x is away from the cook))
    bentoBlock(0.026, 0.006, 0.26, -BOX_W / 2 + 0.075, top + 0.0045, zc + 0.05, SLEEVE_WHITE),
    bentoBlock(0.0265, 0.0065, 0.035, -BOX_W / 2 + 0.075, top + 0.0046, zc + 0.05 - 0.09, CORD_RED),
  ]
  lidGeo = mergeGeometries(parts.map((g) => g.toNonIndexed()))!
  return lidGeo
}
/** the wrapping paper's print (掛け紙): cream paper, a red double rule round it, the shop's name down it in black, 焼魚 beside it in red, the
 * shop's square seal under */
const KAKEGAMI = signTexture(256, Math.round(256 * (BOX_W - 0.03) / (BOX_Z1 - BOX_Z0 - 0.03)), (g, w, h) => {
  g.fillStyle = '#efe5cf'
  g.fillRect(0, 0, w, h)
  g.strokeStyle = '#b3241c'
  g.lineWidth = 5
  g.strokeRect(12, 12, w - 24, h - 24)
  g.lineWidth = 2
  g.strokeRect(22, 22, w - 44, h - 44)
  brushText(g, '聞', w * 0.38, h * 0.3, 104, { fill: '#1d1712' })
  brushText(g, '野', w * 0.38, h * 0.56, 104, { fill: '#1d1712' })
  brushText(g, '焼', w * 0.74, h * 0.3, 46, { fill: '#b3241c' })
  brushText(g, '魚', w * 0.74, h * 0.42, 46, { fill: '#b3241c' })
  g.fillStyle = '#b3241c'
  g.fillRect(w * 0.64, h * 0.72, 40, 40)
  g.fillStyle = '#efe5cf'
  g.fillRect(w * 0.64 + 8, h * 0.72 + 8, 24, 24)
  g.fillStyle = '#b3241c'
  g.fillRect(w * 0.64 + 13, h * 0.72 + 13, 14, 14)
})
const KAKEGAMI_MAT = new THREE.MeshToonMaterial({ map: KAKEGAMI })
let paperGeo: THREE.BufferGeometry | null = null
/** the paper on the lid's top, read from the cook's side: the print's right along the table (its own z), its top away from the cook (its +x) */
const kakegami = () => paperGeo ??= new THREE.PlaneGeometry(BOX_Z1 - BOX_Z0 - 0.03, BOX_W - 0.03).rotateX(-Math.PI / 2).rotateY(-Math.PI / 2)
  .translate(0, BOX_H + 0.0135, (BOX_Z0 + BOX_Z1) / 2)
/** hit by the pointer's ray only while it's drawn (three's ray goes through what's hidden: an empty tier's name came up over the bare table) */
function raycastShown(this: THREE.Mesh, ray: THREE.Raycaster, hits: THREE.Intersection[]) {
  for (let q: THREE.Object3D | null = this; q; q = q.parent) if (!q.visible) return
  THREE.Mesh.prototype.raycast.call(this, ray, hits)
}
export const TakeoutBox = memo(function TakeoutBox({ at }: { at: () => THREE.Vector3 }) {
  // (where it stands asked every frame: the serving counter's found a moment after, and may be moved in edit mode)
  const g = useRef<THREE.Group>(null)
  useFrame(() => { if (g.current) g.current.position.copy(at()) })
  return (
    <group ref={g} name="takeout-boxes" rotation-y={Math.atan2(ALONG.x, ALONG.z)}
      {...nameOver('外帶便當', '外帶與外送的菜裝在這裡｜裝好蓋上蓋子、綁上繩子，外場拿去收銀台交給客人')}>
      {Array.from({ length: BOX_TIERS }, (_, k) => <OneBox key={k} tier={k} />)}
    </group>
  )
})
/** one order's box, at its tier: shown from its first piece in, its lid on once all of it is */
// (item 374: drawn again only as its own props change; it was with every redraw of the takeaway boxes, 5.8 a second, its one prop the same)
const OneBox = memo(function OneBox({ tier }: { tier: number }) {
  const g = useRef<THREE.Group>(null)
  const lid = useRef<THREE.Group>(null)
  useFrame(() => {
    const o = TAKEOUT.orders.find((x) => !x.taken && (x.packed > 0 || !!x.opened) && x.tier === tier)
    if (g.current) g.current.visible = !!o
    if (lid.current) lid.current.visible = !!o?.ready
  })
  return (
    <group ref={g} position-y={tier * BOX_TIER} visible={false}>
      <mesh geometry={bentoBox()} material={BENTO_MAT} castShadow receiveShadow raycast={raycastShown} />
      <group ref={lid} visible={false}>
        <mesh geometry={bentoLid()} material={BENTO_MAT} castShadow receiveShadow raycast={raycastShown} />
        <mesh geometry={kakegami()} material={KAKEGAMI_MAT} receiveShadow raycast={raycastShown} />
      </group>
    </group>
  )
})
export const TasteBowl = memo(TasteBowlImpl, sameProps)
