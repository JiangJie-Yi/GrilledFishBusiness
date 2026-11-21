// The shop's uchiwa (団扇; item 511, the owner's, 2026-11-21: 「扇子模型要改版一下，不要有聞字，圖花可以有很多雲海或是魚的標誌」): its
// shape (public/models/uchiwa.glb, from blender/uchiwa.py: an uchiwa's outline, washi on both its faces, a dark binding round its edge, a
// bamboo handle with a node) and its pictures, painted here. No 聞 on it now: on its face the shop's fish in a red crest, clouds over a
// sea of seigaiha waves with two fish leaping from it; on its back a sea of clouds with a shoal of fish swimming over it. The one stood in
// its holder by the seasonings (Decor's Fan) and the one in the owner's or a cook's hand as they fan their fire (Boss's styledBoss,
// StaffFigure's build) are the one fan: one shape, one material, one picture (the old one in their hands was a little round of plain paper
// half the size, boss.py's, drawn in their one mesh; taken into their atlas, which is held at 1024, this one's pictures came to 64 pixels,
// a blur, so it's a mesh of its own on the hand's node, drawn only while it's shown: a draw while they fan, none else).
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { signTexture } from './signFont'
import { inkTogether } from './inkHull'

export const UCHIWA_URL = import.meta.env.BASE_URL + 'models/uchiwa.glb'

/** the pictures' sheet: the face's picture on its left, the back's on its right, each the paper's square (its outline's box, 0.30 across
 * by 0.262 from its top to its foot: 512 by 448, nothing stretched), and under them a strip each of the plain colours of its binding, its
 * bamboo and the bamboo's node (so the whole fan is one material, one draw) */
const SW = 1024, SH = 512, PW = 512, PH = 448
const STRIP = { binding: 0.16, bamboo: 0.5, node: 0.84 } as const
const STRIP_V = (PH + (SH - PH) / 2) / SH
const C = {
  paper: '#f4ecd8', paperBack: '#efe4cc', indigo: '#24457a', vermilion: '#c63e2c', gold: '#c99a3d', goldPale: '#ecdcb4',
  cream: '#fbf6ea', binding: '#4a2f20', bamboo: '#b08a55', node: '#8a6a3e',
}

const rng = (s: number) => () => ((s = (s * 16807) % 2147483647) / 2147483647)
type G = CanvasRenderingContext2D

/** washi: its ground and its fibres, short pale strokes and a few darker */
function washi(g: G, ground: string, rnd: () => number) {
  g.fillStyle = ground
  g.fillRect(0, 0, PW, PH)
  g.lineWidth = 0.9
  for (let i = 0; i < 700; i++) {
    const x = rnd() * PW, y = rnd() * PH, a = rnd() * Math.PI, l = 3 + rnd() * 10
    g.strokeStyle = rnd() < 0.55 ? 'rgba(255,255,255,0.4)' : 'rgba(140,105,60,0.1)'
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke()
  }
}

/** the bamboo ribs fanning out from the handle's top (the foot's middle) through the paper to its edge, a little past level at each side */
function ribs(g: G, alpha: number, width: number) {
  const ox = PW / 2, oy = PH - 7, N = 44
  g.strokeStyle = `rgba(130,95,55,${alpha})`
  g.lineWidth = width
  for (let k = 0; k <= N; k++) {
    const a = Math.PI - 0.12 + (Math.PI + 0.24) * (k / N)
    g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + Math.cos(a) * 620, oy + Math.sin(a) * 620); g.stroke()
  }
}

/** a fish's outline facing +x, its middle at the origin, `L` long, `h` deep */
function fishPath(g: G, L: number, h: number) {
  g.beginPath()
  g.moveTo(0.5 * L, 0.04 * h)
  g.bezierCurveTo(0.42 * L, -0.52 * h, 0.04 * L, -0.74 * h, -0.22 * L, -0.38 * h)
  g.quadraticCurveTo(-0.3 * L, -0.2 * h, -0.34 * L, -0.08 * h)
  g.lineTo(-0.5 * L, -0.5 * h)
  g.quadraticCurveTo(-0.41 * L, 0, -0.5 * L, 0.5 * h)
  g.lineTo(-0.34 * L, 0.08 * h)
  g.quadraticCurveTo(-0.28 * L, 0.28 * h, -0.12 * L, 0.4 * h)
  g.bezierCurveTo(0.12 * L, 0.54 * h, 0.4 * L, 0.4 * h, 0.5 * L, 0.04 * h)
  g.closePath()
}
/** a fish (an emblem's: its fins, its eye, its gill and a few scales in `mark`), at x, y, turned `turn`, `flip` -1 facing the other way;
 * `deep` its body's depth to its length (a sea bream's 0.5, a sardine's 0.34) */
function fish(g: G, x: number, y: number, L: number, deep: number, turn: number, body: string, mark: string, flip = 1) {
  const h = L * deep
  g.save()
  g.translate(x, y)
  g.scale(flip, 1)
  g.rotate(turn)
  g.fillStyle = body
  // (its dorsal fin, spined along its back, and its belly fin, under the body)
  g.beginPath(); g.moveTo(0.14 * L, -0.5 * h); g.lineTo(0.02 * L, -0.86 * h); g.lineTo(-0.1 * L, -0.72 * h); g.lineTo(-0.2 * L, -0.66 * h); g.lineTo(-0.26 * L, -0.34 * h); g.closePath(); g.fill()
  g.beginPath(); g.moveTo(0.02 * L, 0.42 * h); g.lineTo(-0.08 * L, 0.74 * h); g.lineTo(-0.16 * L, 0.36 * h); g.closePath(); g.fill()
  fishPath(g, L, h)
  g.fill()
  g.fillStyle = mark
  g.strokeStyle = mark
  g.beginPath(); g.arc(0.3 * L, -0.08 * h, L * 0.05, 0, Math.PI * 2); g.fill()
  g.lineWidth = Math.max(1, L * 0.035)
  g.beginPath(); g.arc(0, 0, h * 0.42, -0.9, 0.9); g.stroke()
  g.lineWidth = Math.max(0.8, L * 0.02)
  for (const [sx, sy] of [[-0.08, -0.16], [-0.18, 0.06], [-0.08, 0.22], [-0.02, -0.02]]) { g.beginPath(); g.arc(sx * L, sy * h, h * 0.13, -1.2, 1.2); g.stroke() }
  g.restore()
}

/** a crest: a disc, a ring just in from its edge, a sea bream across it (丸に鯛), in `line` */
function crest(g: G, x: number, y: number, r: number, disc: string, line: string, turn = -0.2) {
  g.fillStyle = disc
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill()
  g.strokeStyle = line
  g.lineWidth = r * 0.055
  g.beginPath(); g.arc(x, y, r * 0.87, 0, Math.PI * 2); g.stroke()
  fish(g, x + r * 0.04, y + r * 0.02, r * 1.28, 0.5, turn, line, disc)
}

/** shapes drawn as one: each stroked wide in `line`, then all filled over in `fill`, so only the line round their outside is left */
function outlined(g: G, shapes: (() => void)[], fill: string, line: string, t: number) {
  g.lineWidth = 2 * t
  g.strokeStyle = line
  for (const s of shapes) { s(); g.stroke() }
  g.fillStyle = fill
  for (const s of shapes) { s(); g.fill() }
}

/** a cloud (瑞雲): round billows on a flat foot, a curl in its two big billows, a tail streaming off one end (`flip` -1 its left) */
function cloud(g: G, x: number, y: number, w: number, fill: string, line: string, flip = 1) {
  const lobes: [number, number, number][] = [[-0.34, 0.04, 0.17], [-0.15, -0.09, 0.24], [0.1, -0.05, 0.21], [0.3, 0.05, 0.15]]
  const t = Math.max(1.5, w * 0.022)
  const at = (dx: number) => x + flip * dx * w
  outlined(g, [
    ...lobes.map(([dx, dy, r]) => () => { g.beginPath(); g.arc(at(dx), y + dy * w, r * w, 0, Math.PI * 2) }),
    () => { g.beginPath(); g.roundRect(x - 0.46 * w, y + 0.02 * w, 0.92 * w, 0.17 * w, 0.085 * w) },
    () => {
      g.beginPath()
      g.moveTo(at(0.4), y + 0.03 * w)
      g.bezierCurveTo(at(0.62), y, at(0.72), y + 0.14 * w, at(0.92), y + 0.06 * w)
      g.bezierCurveTo(at(0.74), y + 0.2 * w, at(0.6), y + 0.16 * w, at(0.42), y + 0.17 * w)
      g.closePath()
    },
  ], fill, line, t)
  g.strokeStyle = line
  g.lineWidth = t
  for (const [dx, dy, r] of lobes.slice(1, 3)) {
    const cx = at(dx), cy = y + dy * w + r * w * 0.1
    g.beginPath(); g.arc(cx, cy, r * w * 0.55, Math.PI * 0.95, Math.PI * 2.05); g.stroke()
    g.beginPath(); g.arc(cx + flip * r * w * 0.12, cy, r * w * 0.3, Math.PI * 1.0, Math.PI * 1.9); g.stroke()
  }
}

/** a band of mist (霞): two long round-ended bars, one stepped up over the other */
function kasumi(g: G, x: number, y: number, w: number, h: number, fill: string, line: string) {
  outlined(g, [
    () => { g.beginPath(); g.roundRect(x, y, w, h, h / 2) },
    () => { g.beginPath(); g.roundRect(x + w * 0.24, y - h * 0.8, w * 0.56, h, h / 2) },
  ], fill, line, 1.6)
}

/** seigaiha (青海波): rows of scales of concentric rings, each row over the lower half of the row above, from `top` down past the foot */
function seigaiha(g: G, top: number, R: number) {
  const lw = R * 0.075
  for (let row = 0, y = top; y < PH + R; row++, y += R / 2) {
    for (let x = (row % 2) * R - R; x < PW + R; x += 2 * R) {
      g.fillStyle = C.indigo
      g.beginPath(); g.arc(x, y, R, 0, Math.PI * 2); g.fill()
      g.strokeStyle = C.cream
      g.lineWidth = lw
      for (const k of [1, 0.78, 0.56, 0.34]) { g.beginPath(); g.arc(x, y, R * k - lw / 2, 0, Math.PI * 2); g.stroke() }
    }
  }
}

/** its face: the shop's sea bream in a red crest up to the right, a cloud and a band of gold mist up to the left, a small indigo crest,
 * and along its foot a sea of seigaiha with two fish leaping from it */
function paintFace(g: G) {
  const rnd = rng(511)
  washi(g, C.paper, rnd)
  ribs(g, 0.12, 1.2)
  kasumi(g, 34, 214, 250, 22, C.goldPale, C.gold)
  kasumi(g, 300, 58, 150, 18, C.goldPale, C.gold)
  cloud(g, 152, 150, 228, C.cream, C.gold)
  cloud(g, 404, 262, 128, C.cream, C.gold, -1)
  crest(g, 338, 146, 70, C.vermilion, C.cream, -0.18)
  crest(g, 84, 262, 30, C.indigo, C.cream, -0.25)
  seigaiha(g, 324, 30)
  // (the two leaping: one up to the right out of the waves, one down to the left back into them, drops flung off their tails)
  fish(g, 214, 300, 64, 0.36, -0.75, C.vermilion, C.cream)
  fish(g, 300, 318, 50, 0.36, 0.55, C.vermilion, C.cream, -1)
  // (cream, ringed in indigo: seen on the waves and on the paper both)
  g.fillStyle = C.cream
  g.strokeStyle = C.indigo
  g.lineWidth = 1.4
  for (const [x, y, r] of [[176, 326, 4.5], [168, 312, 3], [186, 338, 3.5], [334, 298, 4], [346, 288, 2.8], [328, 284, 3]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.stroke() }
  // (the ribs' shadows faintly through the print too, as they show through a fan's paper)
  ribs(g, 0.05, 1.1)
}

/** a bank of clouds in the sea of clouds: billows along `y`, filled down past the foot, a curl in every other billow */
function bank(g: G, y: number, r: number, step: number, off: number, fill: string, rnd: () => number) {
  const billows: [number, number, number][] = []
  for (let x = off - step; x < PW + step; x += step) billows.push([x, y + (rnd() - 0.5) * r * 0.3, r * (0.82 + rnd() * 0.3)])
  outlined(g, [
    ...billows.map(([x, yy, rr]) => () => { g.beginPath(); g.arc(x, yy, rr, 0, Math.PI * 2) }),
    () => { g.beginPath(); g.rect(-10, y, PW + 20, PH - y + 10) },
  ], fill, C.indigo, 2.4)
  g.strokeStyle = C.indigo
  g.lineWidth = 2
  billows.forEach(([x, yy, rr], k) => {
    if (k % 2) return
    g.beginPath(); g.arc(x, yy + rr * 0.15, rr * 0.42, Math.PI, Math.PI * 1.9); g.stroke()
    g.beginPath(); g.arc(x + rr * 0.08, yy + rr * 0.15, rr * 0.2, Math.PI, Math.PI * 1.85); g.stroke()
  })
}

/** its back: a sea of clouds (雲海), three banks of billows, the farthest the bluest, a band of gold mist between them, a shoal of fish
 * swimming up across over it, a small gold crest up to the left */
function paintBack(g: G) {
  const rnd = rng(1105)
  washi(g, C.paperBack, rnd)
  ribs(g, 0.26, 1.8)
  kasumi(g, 268, 70, 170, 18, C.goldPale, C.gold)
  crest(g, 104, 110, 38, C.gold, C.cream, -0.15)
  bank(g, 296, 46, 70, 12, '#a7bcd9', rnd)
  bank(g, 340, 40, 62, 40, '#cbd8e9', rnd)
  kasumi(g, 286, 366, 190, 16, C.goldPale, C.gold)
  bank(g, 390, 34, 56, 18, '#f1efe7', rnd)
  // (the shoal: along a rising curve, each turned to its way, a little of a wiggle each, the biggest leading)
  for (let k = 0; k < 7; k++) {
    const t = k / 6
    const x = 78 + 360 * t, y = 258 - 128 * t - 34 * Math.sin(Math.PI * t)
    const dx = 360, dy = -128 - 34 * Math.PI * Math.cos(Math.PI * t)
    fish(g, x, y, 32 + 20 * t, 0.34, Math.atan2(dy, dx) + (rnd() - 0.5) * 0.25, C.vermilion, C.cream)
  }
  ribs(g, 0.07, 1.4)
}

/** the whole sheet, drawn at its size (w by h: the sheet's 1024 by 512 scaled) */
function paintSheet(g: G, w: number, h: number) {
  g.save()
  g.scale(w / SW, h / SH)
  for (const [ox, paint] of [[0, paintFace], [PW, paintBack]] as const) {
    g.save()
    g.translate(ox, 0)
    g.beginPath(); g.rect(0, 0, PW, PH); g.clip()
    paint(g)
    g.restore()
  }
  const strip = (u0: number, u1: number, c: string) => { g.fillStyle = c; g.fillRect(u0 * SW, PH, (u1 - u0) * SW, SH - PH) }
  strip(0, 0.33, C.binding)
  strip(0.33, 0.67, C.bamboo)
  strip(0.67, 1, C.node)
  g.restore()
}

let material: THREE.MeshToonMaterial | null = null
/** its one material, shared by every fan: the sheet (1024 by 512, its rows top down as glTF's UVs are: flipY off), painted once */
function uchiwaMaterial() {
  if (!material) {
    const t = signTexture(SW, SH, (g) => paintSheet(g, SW, SH))
    if (t) { t.flipY = false; t.anisotropy = 4 }
    material = new THREE.MeshToonMaterial({ color: '#ffffff', map: t })
  }
  return material
}

/** the glb's parts by their materials' names, and where each one's uv goes on the sheet */
const PART_OF: Record<string, 'face' | 'back' | keyof typeof STRIP> = {
  FanPaper: 'face', FanPaperBack: 'back', FanBinding: 'binding', FanBamboo: 'bamboo', FanBambooNode: 'node',
}
type Shapes = { all: THREE.BufferGeometry; edge: THREE.BufferGeometry; ink?: THREE.Mesh; held?: THREE.BufferGeometry }
const SHAPES = new WeakMap<THREE.Object3D, Shapes>()
/** the fan's shape as one (its parts' triangles together, each part's uv on its place on the sheet), and its binding and handle's alone
 * (for its ink line: its paper's two faces pushed out would be a dark disc), once for the loaded model */
function shapesOf(scene: THREE.Object3D): Shapes {
  let s = SHAPES.get(scene)
  if (s) return s
  scene.updateMatrixWorld(true)
  const all: THREE.BufferGeometry[] = [], edge: THREE.BufferGeometry[] = []
  scene.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh || Array.isArray(m.material)) return
    const part = PART_OF[(m.material as THREE.Material).name]
    if (!part) return
    const src = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()
    src.applyMatrix4(m.matrixWorld)
    const n = src.attributes.position.count
    const own = src.attributes.uv as THREE.BufferAttribute | undefined
    const uv = new Float32Array(n * 2)
    for (let i = 0; i < n; i++) {
      if (part === 'face' || part === 'back') {
        uv[i * 2] = (part === 'back' ? 0.5 : 0) + (own ? own.getX(i) : 0.5) * 0.5
        uv[i * 2 + 1] = (own ? own.getY(i) : 0.5) * (PH / SH)
      } else {
        uv[i * 2] = STRIP[part]
        uv[i * 2 + 1] = STRIP_V
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', src.attributes.position)
    g.setAttribute('normal', src.attributes.normal)
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
    all.push(g)
    if (part !== 'face' && part !== 'back') edge.push(g)
  })
  s = { all: mergeGeometries(all)!, edge: mergeGeometries(edge)! }
  for (const g of all) g.dispose()
  SHAPES.set(scene, s)
  return s
}

/** the fan whole, for the one stood in its holder (Decor's Fan; in the model's own size, Decor draws it 1.6 times): one mesh, one picture,
 * one draw; its binding and its handle inked (one more) */
export function uchiwaModel(scene: THREE.Object3D): THREE.Group {
  const s = shapesOf(scene)
  const g = new THREE.Group()
  const mesh = new THREE.Mesh(s.all, uchiwaMaterial())
  mesh.name = 'uchiwa'
  mesh.castShadow = true
  mesh.receiveShadow = true
  g.add(mesh)
  // (its ink's shape made once: a line 3.5 mm out in the model's size, its corners closed)
  s.ink ??= inkTogether([new THREE.Mesh(s.edge)], { width: 0.0035, weld: true }) ?? undefined
  if (s.ink) {
    const ink = new THREE.Mesh(s.ink.geometry, s.ink.material)
    ink.raycast = () => {}
    ink.userData.inked = true
    g.add(ink)
  }
  return g
}

/** where a hand holds it: on its handle, 0.235 down from the paper's middle (the handle runs from 0.118 to 0.300) */
const GRIP = 0.235
/** how big it's drawn in a figure's hand, in the figure's own frame: the size it stands in its holder (Decor draws it 1.6 times, the
 * figures are drawn some 1.65 times) */
const IN_HAND = 0.97
/**
 * The fan as it's held, for the node a figure's fan is moved by (the owner's BossFan, a cook's 'fan'): its grip at the node's middle, its
 * paper up its +y, its face (the crest) out along +z, toward the fire they fan. Its own mesh with the shared material (its shape made once
 * for them all): put on the node after the figure's one mesh is made, the node hidden while the fan's not in hand (no draw then). Nothing
 * pointed at finds it (the figure's own hit box does).
 */
export function uchiwaInHand(scene: THREE.Object3D): THREE.Mesh {
  const s = shapesOf(scene)
  if (!s.held) {
    s.held = s.all.clone()
    s.held.applyMatrix4(new THREE.Matrix4().makeTranslation(0, IN_HAND * GRIP, 0)
      .multiply(new THREE.Matrix4().makeScale(IN_HAND, IN_HAND, IN_HAND))
      .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)))
  }
  const mesh = new THREE.Mesh(s.held, uchiwaMaterial())
  mesh.name = 'uchiwa-in-hand'
  mesh.castShadow = true
  mesh.raycast = () => {}
  return mesh
}
