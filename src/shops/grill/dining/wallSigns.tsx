import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { inkTogether } from '@/scene/render/inkHull'
import { CARD_CHARS, CORK_NOTES, paintWallSigns, SIGNS_PX, WALL_LEDGE, WALL_PIECES, WALL_SIGNS, type WallPiece } from '@/shops/grill/decor/wallPhotos'
import { signTexture } from '@/scene/props/signFont'
import { nameOver } from '@/shops/grill/bar'
import { Movable } from '@/shops/grill/editor/Movable'

/**
 * The corner by the way in where the visitors have left their mark (item 295, the owner's, 2026-11-17: 「靠近玄關的門處牆壁會有些美食家的簽名及
 * 留言板+照片」): on the plaster over the shoe cupboard, past the shrine's shelf, short of the doorway. Every piece its own, movable on its own
 * in the editor and all one group (item 402, the owner's 「物件要拆細、拆散 然後再group」; edit.ts's grp-signwall). Laid out to a design (item
 * 409, the owner's 「玄關門口的塗鴉簽名牆太亂了，還是拿掉，至於簽名板可以留 但要用有設計感的方式編排」「簽名板太像了」: item 406 had taped
 * everything up at its own slant and item 405 scribbled the plaster all over round it, the plaster's writing now gone): a display ledge across
 * the middle (WALL_LEDGE), the four Japanese boards standing on it leaning back on the wall, the photographs over them in line, the Western
 * three in a column by the door, the cork board with its notes pinned on it under the ledge (wallPhotos' WALL_PIECES, CORK_NOTES). `end` the
 * wall's end by the way in: each placed back from it (the switches 1.2 to 1.4 back; the exit sign 0.42 to 0.82 back, from 1.8 up; the
 * shrine's shelf ends 1.27 back, from 1.46 up; the doorway's front starts 0.26 back). Their pictures one canvas, one material (seen through
 * where a paper's cut); the still ones merged into one draw by the room's merge (userData.worldMerge), one taken out as it's moved.
 */
let SIGNS_ZH = true
const SIGNS_TEX = signTexture(WALL_SIGNS.size[0] * SIGNS_PX, WALL_SIGNS.size[1] * SIGNS_PX, (g) => paintWallSigns(g, SIGNS_ZH))
// (fine handwriting: kept at up to twice the machine's cap (scene/textureCap))
if (SIGNS_TEX) SIGNS_TEX.userData.capScale = 2
const SIGNS_MAT = new THREE.MeshToonMaterial({ color: '#ffffff', map: SIGNS_TEX, alphaTest: 0.5 })
const signUV = ([x, y, w, h]: number[]) => { const [W, H] = WALL_SIGNS.size; return [x / W, 1 - (y + h) / H, (x + w) / W, 1 - y / H] }
/** a geometry of the given faces (four corners each, counter-clockwise seen from the side it faces, with their picture's corners) and
 * triangles (three) */
function facesGeometry(quads: { p: number[][]; uv: number[][] }[], tris: { p: number[][]; uv: number[][] }[] = []) {
  const pos: number[] = [], uv: number[] = [], idx: number[] = []
  for (const f of quads) { const b = pos.length / 3; f.p.forEach((q) => pos.push(...q)); f.uv.forEach((q) => uv.push(...q)); idx.push(b, b + 1, b + 2, b, b + 2, b + 3) }
  for (const f of tris) { const b = pos.length / 3; f.p.forEach((q) => pos.push(...q)); f.uv.forEach((q) => uv.push(...q)); idx.push(b, b + 1, b + 2) }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}
/** a board off the wall about its middle: its back at the wall's face, its front `t` out into the room (-x), its picture's size (a millimetre
 * a unit) along the wall (z: its left toward the wall's far end) and up; its face its picture, its edges their swatch */
function plaqueGeometry(rect: number[], edge: number[], t: number) {
  const w = rect[2] / 1000, h = rect[3] / 1000
  const [u0, v0, u1, v1] = signUV(rect), [e0, f0, e1, f1] = signUV(edge)
  const xb = 0, xf = -t, za = -w / 2, zb = w / 2, ya = -h / 2, yb = h / 2
  const E = [[e0, f0], [e1, f0], [e1, f1], [e0, f1]]
  return facesGeometry([
    { p: [[xf, ya, za], [xf, ya, zb], [xf, yb, zb], [xf, yb, za]], uv: [[u0, v0], [u1, v0], [u1, v1], [u0, v1]] },
    { p: [[xb, ya, za], [xf, ya, za], [xf, yb, za], [xb, yb, za]], uv: E },
    { p: [[xf, ya, zb], [xb, ya, zb], [xb, yb, zb], [xf, yb, zb]], uv: E },
    { p: [[xf, yb, za], [xf, yb, zb], [xb, yb, zb], [xb, yb, za]], uv: E },
    { p: [[xb, ya, za], [xb, ya, zb], [xf, ya, zb], [xf, ya, za]], uv: E },
  ])
}
/** a paper about its middle, flat on what it's pinned to (its picture as cut: see-through round it); the yellow note's corner (its picture's
 * (48, 25)-(32, 41) fold, from its middle in millimetres) turned up off the board, its tip 6 mm out */
function paperGeometry(rect: number[], curl = false) {
  const w = rect[2] / 1000, h = rect[3] / 1000
  const [u0, v0, u1, v1] = signUV(rect)
  // (a point on the paper from its middle in its picture's millimetres (y down) to its place and its picture's)
  const P = (mx: number, my: number, out = 0) => [-out, -my / 1000, mx / 1000]
  const U = (mx: number, my: number) => [u0 + (mx / 1000 / w + 0.5) * (u1 - u0), v1 - (my / 1000 / h + 0.5) * (v1 - v0)]
  const hw = rect[2] / 2, hh = rect[3] / 2
  if (!curl) return facesGeometry([{ p: [P(-hw, hh), P(hw, hh), P(hw, -hh), P(-hw, -hh)], uv: [U(-hw, hh), U(hw, hh), U(hw, -hh), U(-hw, -hh)] }])
  // (the note with its lower right corner cut along the fold, and the flap folded back over it, its tip lifted)
  const outline = [[-hw, -hh], [hw, -hh], [hw, 25], [32, hh], [-hw, hh]]
  const tris: { p: number[][]; uv: number[][] }[] = []
  // (its outline in a ladder of triangles from its first corner, its own picture laid on each)
  for (let i = 1; i < outline.length - 1; i++) {
    const q = [outline[0], outline[i + 1], outline[i]]
    tris.push({ p: q.map(([x, y]) => P(x, y)), uv: q.map(([x, y]) => U(x, y)) })
  }
  tris.push({ p: [P(48, 25), P(36, 27, 0.006), P(32, 41)], uv: [U(48, 25), U(36, 27), U(32, 41)] })
  return facesGeometry([], tris)
}
/** a pushpin's head: an octagon 11 mm across standing 6 mm out, its top the shine of its colour (WALL_SIGNS.pins[k]), its sides its rim;
 * its top closed across in a ladder (no fan into a middle) */
const PIN_GEOS: THREE.BufferGeometry[] = []
function pinGeometry(k: number) {
  if (PIN_GEOS[k]) return PIN_GEOS[k]
  const [x, y, w, h] = WALL_SIGNS.pins[k], [W, H] = WALL_SIGNS.size
  const R = 0.0056, out = 0.006
  const ring = (xx: number) => Array.from({ length: 8 }, (_, i) => [xx, Math.sin((i * Math.PI) / 4) * R, Math.cos((i * Math.PI) / 4) * R])
  const top = ring(-out), foot = ring(0)
  const tuv = Array.from({ length: 8 }, (_, i) => [(x + w / 2 + Math.cos((i * Math.PI) / 4) * w * 0.48) / W, 1 - (y + h / 2 - Math.sin((i * Math.PI) / 4) * h * 0.48) / H])
  const rim = [(x + w * 0.94) / W, 1 - (y + h / 2) / H]
  const quads = Array.from({ length: 8 }, (_, i) => { const j = (i + 1) % 8; return { p: [foot[i], foot[j], top[j], top[i]], uv: [rim, rim, rim, rim] } })
  const L = [[0, 1, 7], [1, 2, 6], [1, 6, 7], [2, 3, 5], [2, 5, 6], [3, 4, 5]]
  PIN_GEOS[k] = facesGeometry(quads, L.map((t) => ({ p: t.map((i) => top[i]), uv: t.map((i) => tuv[i]) })))
  return PIN_GEOS[k]
}
/** a strip of washi tape `len` long, 18 mm wide, its picture one of the tapes */
function tapeGeometry(k: number, len: number) {
  const [u0, v0, u1, v1] = signUV(WALL_SIGNS.tapes[k]), w = 0.018
  return facesGeometry([{ p: [[0, -w / 2, -len / 2], [0, -w / 2, len / 2], [0, w / 2, len / 2], [0, w / 2, -len / 2]], uv: [[u0, v0], [u1, v0], [u1, v1], [u0, v1]] }])
}
/** a round board (丸色紙, item 409) about its middle: its back at the wall's face, its front `t` out; its face its picture's square's circle
 * (24 round, closed across in a ladder: no fan into a middle), its rim its swatch */
function roundGeometry(rect: number[], edge: number[], t: number) {
  const R = rect[2] / 2000, n = 24
  const [u0, v0, u1, v1] = signUV(rect), [e0, f0, e1, f1] = signUV(edge)
  // (round it from the picture's right (z +, toward the door), up first: z = R cos a, y = R sin a)
  const ring = Array.from({ length: n }, (_, i) => [Math.cos((i / n) * Math.PI * 2), Math.sin((i / n) * Math.PI * 2)])
  const at = (k: number, x: number) => [x, ring[k][1] * R, ring[k][0] * R]
  const uv = (k: number) => [u0 + (ring[k][0] * 0.5 + 0.5) * (u1 - u0), v0 + (ring[k][1] * 0.5 + 0.5) * (v1 - v0)]
  const E = [[e0, f0], [e1, f0], [e1, f1], [e0, f1]]
  const quads: { p: number[][]; uv: number[][] }[] = []
  for (let k = 0; k < n; k++) { const j = (k + 1) % n; quads.push({ p: [at(k, -t), at(k, 0), at(j, 0), at(j, -t)], uv: E }) }
  const tris: { p: number[][]; uv: number[][] }[] = []
  const tri = (a: number, b: number, c: number) => tris.push({ p: [at(a, -t), at(b, -t), at(c, -t)], uv: [uv(a), uv(b), uv(c)] })
  tri(0, 1, n - 1)
  let lo = 1, hi = n - 1
  while (hi - lo > 2) { tri(lo, lo + 1, hi - 1); tri(lo, hi - 1, hi); lo++; hi-- }
  if (hi - lo === 2) tri(lo, lo + 1, hi)
  return facesGeometry(quads, tris)
}
/** the display ledge (item 409) `len` long about its middle: its section an L run along the wall (the shelf, its lip standing up along its
 * front), its back against the wall (no face there), its ends closed; the frames' dark wood */
function ledgeGeometry(len: number) {
  const { deep: D, thick: T, lip: L, lipUp: H } = WALL_LEDGE
  const [e0, f0, e1, f1] = signUV(WALL_SIGNS.wood)
  const E = [[e0, f0], [e1, f0], [e1, f1], [e0, f1]]
  const za = -len / 2, zb = len / 2
  // (round its section from the wall's foot: under it, its front, the lip's top, the lip's back, the shelf's top)
  const S = [[0, -T], [-D, -T], [-D, H], [-D + L, H], [-D + L, 0], [0, 0]]
  const quads: { p: number[][]; uv: number[][] }[] = []
  for (let i = 0; i < S.length - 1; i++) {
    const [x0, y0] = S[i], [x1, y1] = S[i + 1]
    quads.push({ p: [[x0, y0, zb], [x1, y1, zb], [x1, y1, za], [x0, y0, za]], uv: E })
  }
  // (its ends: the shelf's and the lip's)
  for (const [z, sd] of [[zb, 1], [za, -1]] as const) {
    for (const [x0, y0, x1, y1] of [[-D, -T, 0, 0], [-D, 0, -D + L, H]]) {
      const q = [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]]
      quads.push({ p: sd > 0 ? q : [q[0], q[3], q[2], q[1]], uv: E })
    }
  }
  return facesGeometry(quads)
}
/** where a board standing on the ledge goes (item 409): its foot's front against the ledge's lip, its top's back 1.5 mm off the wall, so it
 * leans back the room between over its height; its back's middle then, and how far it leans */
function leanOn(p: WallPiece) {
  const h = p.rect[3] / 1000, { up, deep, lip } = WALL_LEDGE
  const th = Math.asin(Math.min(0.5, (deep - lip - 0.002 - p.t) / h)), s = Math.sin(th), c = Math.cos(th)
  return { x: -0.0015 - (h / 2) * s, y: up + 0.0005 + (h / 2) * c, th }
}
const DEG2 = Math.PI / 180
/** what the pointer says over any of it */
const SIGN_TIP = ['【簽名牆】美食家的簽名與留言', '來過的客人留下的簽名卡、留言板與合照'] as const
/** a mesh of the wall's: its own geometry, the wall's picture, in the room's merge while it stands still */
function signMesh(geo: THREE.BufferGeometry, mat: THREE.Material = SIGNS_MAT, ink = false) {
  const m = new THREE.Mesh(geo, mat)
  m.receiveShadow = true
  m.userData.worldMerge = true
  const g = new THREE.Group()
  g.add(m)
  if (ink) { const k = inkTogether([m], { width: 0.0012, weld: true }); if (k) g.add(k) }
  return g
}
/** one piece on the wall: its board (and its ink), its tape */
function WallPieceView({ p, end }: { p: WallPiece; end: number }) {
  const obj = useMemo(() => {
    const g = new THREE.Group()
    g.add(signMesh(p.round ? roundGeometry(p.rect, p.edge, p.t) : plaqueGeometry(p.rect, p.edge, p.t), SIGNS_MAT, true))
    // (its tape: over its two top corners, at a slant across each, or one strip across its top's middle)
    const w = p.rect[2] / 1000, h = p.rect[3] / 1000, x = -p.t - 0.0004
    if (p.hold === 'tape') {
      for (const sd of [-1, 1]) {
        const t = signMesh(tapeGeometry(p.tape ?? 0, 0.05))
        t.position.set(x, h / 2 - 0.004, sd * (w / 2 - 0.008))
        t.rotation.x = sd * 38 * DEG2
        g.add(t)
      }
    } else if (p.hold === 'tape1') {
      const t = signMesh(tapeGeometry(p.tape ?? 0, 0.045))
      t.position.set(x, h / 2, 0)
      t.rotation.x = 4 * DEG2
      g.add(t)
    }
    return g
  }, [p])
  useEffect(() => () => obj.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && !PIN_GEOS.includes(m.geometry)) m.geometry.dispose() }), [obj])
  // (standing on the ledge, leaning back on the wall (item 409); or flat on the wall at its slant)
  const at = p.lean ? leanOn(p) : null
  return (
    <Movable id={p.id} label={p.label}>
      <primitive object={obj} position={at ? [at.x, at.y, end - p.back] : [-0.004 - p.layer * 0.003, p.up, end - p.back]}
        rotation={at ? [0, 0, -at.th] : [p.tilt * DEG2, 0, 0]} {...nameOver(...SIGN_TIP)} />
    </Movable>
  )
}
/** the display ledge (item 409), a hair off the wall */
function LedgeView({ end }: { end: number }) {
  const L = WALL_LEDGE
  const obj = useMemo(() => {
    const g = new THREE.Group()
    g.add(signMesh(ledgeGeometry(L.back1 - L.back0), SIGNS_MAT, true))
    return g
  }, [L])
  useEffect(() => () => obj.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.geometry.dispose() }), [obj])
  return (
    <Movable id={L.id} label={L.label}>
      <primitive object={obj} position={[-0.0008, L.up, end - (L.back0 + L.back1) / 2]} {...nameOver(...SIGN_TIP)} />
    </Movable>
  )
}
/** one note pinned on the cork board: the paper a hair off the cork, its pins through it */
function CorkNoteView({ n, k, end }: { n: (typeof CORK_NOTES)[number]; k: number; end: number }) {
  const cork = WALL_PIECES[0]
  const obj = useMemo(() => {
    const g = new THREE.Group()
    g.add(signMesh(paperGeometry(WALL_SIGNS.notes[k], !!n.curl)))
    for (const [dz, dy, c] of n.pins) {
      const pin = signMesh(pinGeometry(c))
      pin.position.set(-0.0004, dy, dz)
      g.add(pin)
    }
    return g
  }, [n, k])
  useEffect(() => () => obj.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && !PIN_GEOS.includes(m.geometry)) m.geometry.dispose() }), [obj])
  return (
    <Movable id={n.id} label={n.label}>
      <primitive object={obj} position={[-0.004 - cork.t - 0.0006 - (n.layer ?? 0) * 0.0012, cork.up + n.dy, end - cork.back + n.dz]} rotation-x={n.rot} {...nameOver(...SIGN_TIP)} />
    </Movable>
  )
}
export function WallSigns({ end }: { end: number }) {
  // (their words in the page's language, painted again as that changes; once more as the hand's letters are in, both its weights (item 390:
  // painted before they were, they were in the system's plain letters))
  const lang = useRef('')
  useFrame(() => {
    const l = document.documentElement.lang
    if (l === lang.current || !SIGNS_TEX) return
    lang.current = l
    SIGNS_ZH = l !== 'ja' && l !== 'en'
    const c = SIGNS_TEX.image as HTMLCanvasElement
    const repaint = () => { paintWallSigns(c.getContext('2d')!, SIGNS_ZH); SIGNS_TEX.needsUpdate = true }
    repaint()
    void Promise.all(['700', '400'].map((w) => document.fonts?.load(`${w} 40px "LXGW WenKai TC"`,
      '謝謝招待下次再來烤魚超讚老闆好帥生日快樂鹽烤鯖魚ごちそうさままた来ます焼き魚最高大将お誕生日鯖の塩焼き開店紀念記念秋夜の隔壁桌となりの席小美みき必點食'
      + '客人的話お様声同事聚餐会社飲み加油晴歲翔收據集滿送飯糰燒焼スタンプカードレシートかっこいいたいしょうがんばってはるなさいおめでとうしょう個おにぎりBestgrilledfishintown!TomLondonNT$0123456789' + CARD_CHARS))).then(repaint).catch(() => {})
  })
  return (
    <group name="wall-signs" userData={{ end }}>
      <LedgeView end={end} />
      {WALL_PIECES.map((p) => <WallPieceView key={p.id} p={p} end={end} />)}
      {CORK_NOTES.map((n, k) => <CorkNoteView key={n.id} n={n} k={k} end={end} />)}
    </group>
  )
}
