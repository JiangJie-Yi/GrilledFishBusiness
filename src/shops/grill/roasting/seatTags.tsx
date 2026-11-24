import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { seatLabel, LIP_H, GRILL_SEATS } from '@/shops/grill/bar'

/**
 * One counter of the bar: a long plank of pale hinoki with rounded edges on a dark base, a raised lip on the cook's
 * side, and at each seat the chopsticks on their rest and a dish of sauce. With a gate, the base stops short of one end
 * and that end of the top too: the staff's way between the kitchen and the floor, shut by a little swing door (BarGate).
 */
/**
 * Each place's number (the owner's: the bar's places numbered, fixed on the wooden screen behind the place), made over as a grilled fish's
 * (item 445, the owner's 「號碼牌要有設計感，感覺得出是烤魚店」: a black lacquer disc, gold number and ring): a little board cut as a fish, its head
 * to the left as a grilled fish is served (頭は左), on a bamboo skewer (串) through it from nose to tail as a salt-grilled fish is; charred
 * cedar (焼杉), near black as the disc's lacquer was (in a grilled fish's own gold-brown it was lost on the bamboo behind it), the fish drawn
 * on it in fine gold (its scales, gill, fins, eye; a gold line round its edge), a few grains of salt on its tail; the place's number large on
 * it in cream. Its outline the shape's own (no fan: its faces cut by earcut), its edge dark; on the screen's face toward the customer half
 * way up it. One picture for all the places, a cell each.
 * Item 493 (the owner's 「魚要肥一點，數字要致中，有些是魷魚或貝類其他海鮮生物」): the fish plump (a sea bream's deep body, its back's fin, its
 * forked tail: some 2.1 to 1, not 3), half the places the sea's other things the shop grills (its menu's squid, scallop and shrimp, and a
 * clam), each drawn in the same gold; the number where the board's body is widest (the point furthest from its edge), by its ink, not its
 * letter's box; and the picture, a row of 2048 by 128 held at half by the pictures' cap (a quarter on a Mac, the numbers soft), now 4 by 2
 * cells of 256 by 160, at full size everywhere.
 */
const TAG_CW = 256, TAG_CH = 160, TAG_COLS = 4
export const SEAT_TAG = { L: 0.122, H: 0.122 * TAG_CH / TAG_CW, d: 0.006, foot: 0.012 }
/** the grill's metres a pixel of the picture (its cells as wide as the board, square pixels) */
const TAG_PX = SEAT_TAG.L / TAG_CW
/** the skewer's height on the board, from its middle */
const SEAT_TAG_SKEWER_Y = -0.003
/** the screen's (the raised lip's) face toward the customer, across the counter, and how far in from its ends a board keeps */
const LIP_FACE = 0.28 - 0.03
type TagKind = 'fish' | 'squid' | 'scallop' | 'shrimp' | 'clam'
type TagPt = readonly [number, number]
/** which each place's board is, by its number (1 to 8): a fish every other, as befits the shop, between them the others, a shell on each
 * counter */
const TAG_KIND_BY_LABEL: readonly TagKind[] = ['fish', 'squid', 'fish', 'scallop', 'shrimp', 'fish', 'clam', 'fish']
const tagKindOf = (k: number) => TAG_KIND_BY_LABEL[(seatLabel(k) - 1) % TAG_KIND_BY_LABEL.length]
/** the shrimp's body an arch: its spine a curve from behind its eye to its tail's root, how thick it is either side along it (thickest at
 * its middle, where its number goes) */
const SHRIMP_SPINE = { P0: [-94, 4], P1: [-8, 48], P2: [72, -22], half: [30, 35, 38, 28, 15] } as const
const shrimpAt = (t: number): [number, number] => {
  const { P0, P1, P2 } = SHRIMP_SPINE
  return [0, 1].map((i) => (1 - t) ** 2 * P0[i] + 2 * t * (1 - t) * P1[i] + t * t * P2[i]) as [number, number]
}
const shrimpDir = (t: number): [number, number] => {
  const { P0, P1, P2 } = SHRIMP_SPINE
  const d = [0, 1].map((i) => 2 * (1 - t) * (P1[i] - P0[i]) + 2 * t * (P2[i] - P1[i])), l = Math.hypot(d[0], d[1])
  return [d[0] / l, d[1] / l]
}
const shrimpHalf = (t: number) => {
  const h = SHRIMP_SPINE.half, i = Math.min(3, Math.floor(t * 4)), f = t * 4 - i
  return h[i] + (h[i + 1] - h[i]) * f
}
/**
 * Each kind's outline in its cell's pixels, from the cell's middle, up +, its head (or its pointed end, its hinge) to the left; 19 to 24
 * points (no more than 92 triangles a board, its two faces and its edge), kept 4 px in from the cell's sides
 */
const TAG_OUTLINES: Record<TagKind, readonly TagPt[]> = {
  // (a sea bream's deep body: its brow, its back's fin, its forked tail, its belly)
  fish: [
    [-123, -4], [-118, 14], [-104, 34], [-82, 50], [-56, 58], [-30, 64], [0, 63], [26, 54], [48, 36], [66, 14],
    [96, 40], [123, 60], [110, 20], [103, 0], [110, -20], [123, -56], [96, -38], [66, -12],
    [48, -28], [22, -46], [-12, -54], [-48, -52], [-82, -40], [-108, -22],
  ],
  // (its fins an arrowhead at its mantle's tip, its mantle, its head, four arms trailing)
  squid: [
    [-124, 0], [-92, 54], [-62, 30], [-30, 36], [8, 36], [16, 28], [36, 28],
    [88, 44], [122, 58], [92, 30], [60, 14], [124, 16], [80, 4], [124, -12], [60, -6], [92, -28], [120, -56], [86, -44],
    [36, -28], [16, -28], [8, -36], [-30, -36], [-62, -30], [-92, -54],
  ],
  // (its fan's rim in seven ribs round its hinge, its sides down to its ears, the hinge's line along the foot)
  scallop: (() => {
    const pts: TagPt[] = []
    for (let i = 0; i <= 12; i++) {
      const a = ((140 - (100 * i) / 12) * Math.PI) / 180, r = i % 2 ? 111 : 120
      pts.push([Math.round(r * Math.cos(a)), Math.round(-52 + r * Math.sin(a))])
    }
    return [...pts, [66, -10], [26, -44], [58, -54], [60, -72], [-60, -72], [-58, -54], [-26, -44], [-66, -10]]
  })(),
  // (its beak (the rostrum), a feeler up from its head, its back along the arch, its tail's fan, its belly back)
  shrimp: (() => {
    const top: TagPt[] = [], bot: TagPt[] = []
    for (let i = 0; i <= 4; i++) {
      const t = i / 4, [x, y] = shrimpAt(t), [dx, dy] = shrimpDir(t), h = shrimpHalf(t)
      top.push([Math.round(x - dy * h), Math.round(y + dx * h)])
      bot.push([Math.round(x + dy * h), Math.round(y - dx * h)])
    }
    const [bx, by] = SHRIMP_SPINE.P2, [ex, ey] = shrimpDir(1), a = Math.atan2(ey, ex)
    const fan = (off: number, len: number): TagPt => [Math.min(124, Math.round(bx + Math.cos(a + off) * len)), Math.max(-76, Math.round(by + Math.sin(a + off) * len))]
    return [[-124, -16], [-114, 12], top[0], [-66, 76], [-96, 42], ...top.slice(1),
      fan(0.75, 58), fan(0.38, 34), fan(0, 58), fan(-0.38, 34), fan(-0.75, 58), ...bot.reverse(), [-100, -26]]
  })(),
  // (a rounded triangle, its beak at the top)
  clam: [
    [-4, 76], [18, 72], [46, 58], [74, 38], [96, 14], [108, -8], [104, -30], [86, -50], [58, -64], [22, -72],
    [-14, -72], [-50, -66], [-80, -50], [-100, -28], [-108, -4], [-98, 20], [-76, 42], [-48, 60], [-22, 72],
  ],
}
/** the point inside an outline furthest from its edge (where a label sits most in the middle of it): a 4 px grid, then 1 px round its best */
function tagPole(poly: readonly TagPt[]): TagPt {
  const inside = (x: number, y: number) => {
    let c = false
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j]
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c
    }
    return c
  }
  const edge = (x: number, y: number) => {
    let d = Infinity
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [ax, ay] = poly[j], [bx, by] = poly[i], dx = bx - ax, dy = by - ay
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)))
      d = Math.min(d, Math.hypot(x - ax - t * dx, y - ay - t * dy))
    }
    return d
  }
  let best: TagPt = [0, 0], far = -1
  const scan = (x0: number, x1: number, y0: number, y1: number, step: number) => {
    for (let x = x0; x <= x1; x += step) for (let y = y0; y <= y1; y += step) {
      if (!inside(x, y)) continue
      const d = edge(x, y)
      if (d > far) { far = d; best = [x, y] }
    }
  }
  scan(-TAG_CW / 2, TAG_CW / 2, -TAG_CH / 2, TAG_CH / 2, 4)
  const [bx, by] = best
  scan(bx - 4, bx + 4, by - 4, by + 4, 1)
  return best
}
/** where a level line at `w` first and last crosses an outline (the skewer's way through it) */
function tagSpanAt(poly: readonly TagPt[], w: number): TagPt {
  let lo = Infinity, hi = -Infinity
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [x1, y1] = poly[j], [x2, y2] = poly[i]
    if ((y1 > w) === (y2 > w)) continue
    const x = x1 + ((w - y1) * (x2 - x1)) / (y2 - y1)
    lo = Math.min(lo, x); hi = Math.max(hi, x)
  }
  return [lo, hi]
}
/** the outline's lowest point on its middle's plumb line (what a standing board rests on) */
function tagFootAt(poly: readonly TagPt[], u: number) {
  let lo = Infinity
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [x1, y1] = poly[j], [x2, y2] = poly[i]
    if ((x1 > u) === (x2 > u)) continue
    lo = Math.min(lo, y1 + ((u - x1) * (y2 - y1)) / (x2 - x1))
  }
  return lo
}
const TAG_KINDS = Object.keys(TAG_OUTLINES) as TagKind[]
/** each kind's number's place, its skewer's way through it (pixels), its foot */
const TAG_LOOKS = Object.fromEntries(TAG_KINDS.map((kind) => [kind, {
  pole: tagPole(TAG_OUTLINES[kind]), skewer: tagSpanAt(TAG_OUTLINES[kind], SEAT_TAG_SKEWER_Y / TAG_PX), foot: tagFootAt(TAG_OUTLINES[kind], 0),
}])) as Record<TagKind, { pole: TagPt; skewer: TagPt; foot: number }>
const tagCellOf = (k: number) => [k % TAG_COLS, Math.floor(k / TAG_COLS)] as const
const TAG_GOLD = '#d4ab55', TAG_GOLD_FAINT = 'rgba(212,171,85,0.5)', TAG_CHAR = '#120b07'
/** the k-th place's board's picture, in its cell: charred cedar, its kind drawn in fine gold, a gold line round it, its number */
function paintSeatTag(g: CanvasRenderingContext2D, k: number, rnd: () => number) {
  const kind = tagKindOf(k), poly = TAG_OUTLINES[kind], [col, row] = tagCellOf(k)
  const x0 = col * TAG_CW, y0 = row * TAG_CH
  const P = (u: number, w: number): [number, number] => [x0 + TAG_CW / 2 + u, y0 + TAG_CH / 2 - w]
  const trace = (pts: readonly TagPt[]) => { g.beginPath(); pts.forEach(([u, w], i) => (i ? g.lineTo(...P(u, w)) : g.moveTo(...P(u, w)))) }
  const outline = () => { trace(poly); g.closePath() }
  const line = (pts: readonly TagPt[], width: number, colour = TAG_GOLD) => { g.strokeStyle = colour; g.lineWidth = width; trace(pts); g.stroke() }
  const curve = (a: TagPt, c: TagPt, b: TagPt, width: number, colour = TAG_GOLD) => {
    g.strokeStyle = colour; g.lineWidth = width
    g.beginPath(); g.moveTo(...P(a[0], a[1])); g.quadraticCurveTo(...P(c[0], c[1]), ...P(b[0], b[1])); g.stroke()
  }
  const dot = (u: number, w: number, r: number, colour: string) => { g.fillStyle = colour; g.beginPath(); g.arc(...P(u, w), r, 0, Math.PI * 2); g.fill() }
  // (an eye: a gold ring, its pupil dark, a glint)
  const eye = (u: number, w: number, r: number) => { dot(u, w, r, TAG_GOLD); dot(u - 0.3, w, r * 0.62, TAG_CHAR); dot(u - r * 0.3, w + r * 0.3, Math.max(1.2, r * 0.18), 'rgba(255,240,200,0.9)') }
  // (a few grains of salt caught on it, as on what's salt-grilled)
  const salt = (u0: number, u1: number, w0: number, w1: number, n: number) => {
    for (let i = 0; i < n; i++) dot(u0 + rnd() * (u1 - u0), w0 + rnd() * (w1 - w0), 0.6 + rnd() * 1.0, `rgba(255,250,235,${0.5 + rnd() * 0.4})`)
  }
  g.save()
  outline()
  g.clip()
  // (charred cedar (焼杉), as the old disc's black lacquer stood out on the bamboo: near black, its grain along it in finer dark lines, a
  // little warmth in it where the char's thinnest)
  const wood = g.createLinearGradient(0, y0, 0, y0 + TAG_CH)
  wood.addColorStop(0, TAG_CHAR); wood.addColorStop(0.5, '#24160d'); wood.addColorStop(1, '#2e1d11')
  g.fillStyle = wood
  g.fillRect(x0, y0, TAG_CW, TAG_CH)
  for (let i = 0; i < 30; i++) {
    const yy = y0 + rnd() * TAG_CH
    g.strokeStyle = `rgba(${rnd() > 0.5 ? '70,42,22' : '8,5,3'},${0.35 + rnd() * 0.3})`
    g.lineWidth = 0.8 + rnd() * 1.4
    g.beginPath(); g.moveTo(x0, yy)
    g.bezierCurveTo(x0 + TAG_CW * 0.3, yy + (rnd() - 0.5) * 8, x0 + TAG_CW * 0.7, yy + (rnd() - 0.5) * 8, x0 + TAG_CW, yy + (rnd() - 0.5) * 6); g.stroke()
  }
  if (kind === 'fish') {
    // (its scales in rows of little arcs, its gill, its back's fin's spines, its tail's rays, the fin under it, its pectoral fin, its mouth,
    // its eye; salt on its tail and its back's fin)
    g.strokeStyle = TAG_GOLD_FAINT; g.lineWidth = 1.3
    for (let r = -3; r <= 3; r++) for (let c = 0; c < 7; c++) {
      g.beginPath(); g.arc(...P(-44 + c * 17 + (r % 2 ? 8.5 : 0), r * 13), 8, Math.PI * 0.55, Math.PI * 1.45); g.stroke()
    }
    curve([-72, 46], [-54, 2], [-74, -42], 2.4)
    for (let r = 0; r < 6; r++) line([[-46 + r * 13, 50 - Math.abs(r - 2) * 1.5], [-40 + r * 13, 60 - Math.abs(r - 2) * 1.2]], 1.5)
    for (let r = 0; r < 5; r++) line([[70, 6 - r * 3], [118, 50 - r * 26]], 1.5)
    for (let r = 0; r < 3; r++) line([[30 + r * 9, -36 - r * 2], [24 + r * 9, -46 - r * 2]], 1.5)
    g.strokeStyle = TAG_GOLD; g.lineWidth = 1.6
    g.beginPath(); g.moveTo(...P(-52, -6)); g.quadraticCurveTo(...P(-30, -2), ...P(-24, -20)); g.quadraticCurveTo(...P(-40, -20), ...P(-52, -6)); g.stroke()
    line([[-123, -4], [-110, -6]], 1.6)
    eye(-96, 14, 9)
    salt(70, 124, -60, 60, 36); salt(-50, 30, 44, 64, 14)
  } else if (kind === 'squid') {
    // (its fins' joins, its collar, its eye, a few spots on its mantle, the suckers along its arms)
    curve([-62, 30], [-50, 0], [-62, -30], 2.2)
    curve([10, 34], [18, 0], [10, -34], 2.4)
    eye(28, 6, 8.5)
    for (const [u, w] of [[-100, 8], [-92, -14], [-78, 18], [-70, -6], [-50, 26], [-44, -26], [-8, 26], [-2, -24], [-84, -2]] as const) dot(u, w, 2 + rnd() * 1.2, 'rgba(212,171,85,0.45)')
    for (const [[a, b], [c, d]] of [[[46, 20], [118, 54]], [[50, 8], [120, 14]], [[50, -2], [120, -10]], [[46, -18], [116, -52]]] as const) {
      for (let i = 1; i < 6; i++) { const t = i / 6.5; dot(a + (c - a) * t, b + (d - b) * t, 2.6 - t * 1.8, 'rgba(212,171,85,0.85)') }
    }
  } else if (kind === 'scallop') {
    // (its ribs from its hinge out to its rim's grooves, its growth lines round it, its ears' joins and their fine lines)
    for (let i = 1; i < 12; i += 2) {
      const a = ((140 - (100 * i) / 12) * Math.PI) / 180
      line([[0, -44], [111 * Math.cos(a), -52 + 111 * Math.sin(a)]], 1.6)
    }
    g.strokeStyle = TAG_GOLD_FAINT; g.lineWidth = 1.3
    for (const r of [42, 68, 94]) { g.beginPath(); g.arc(...P(0, -52), r, -Math.PI * (140 / 180), -Math.PI * (40 / 180)); g.stroke() }
    line([[-26, -44], [-58, -54]], 1.8); line([[26, -44], [58, -54]], 1.8)
    for (let i = 0; i < 3; i++) {
      line([[-30 - i * 9, -50 - i * 1.5], [-28 - i * 9, -68]], 1.1, TAG_GOLD_FAINT); line([[30 + i * 9, -50 - i * 1.5], [28 + i * 9, -68]], 1.1, TAG_GOLD_FAINT)
    }
  } else if (kind === 'shrimp') {
    // (its head's shell, its shell's bands across its arched body, its eye, its legs along its belly, its tail fan's ribs, salt)
    const across = (t: number, width: number, bow = 1) => {
      const [x, y] = shrimpAt(t), [dx, dy] = shrimpDir(t), h = shrimpHalf(t) + 2, b = 4 * bow
      curve([x - dy * h, y + dx * h], [x - dx * b, y - dy * b], [x + dy * h, y - dx * h], width)
    }
    across(0.2, 2.6, 1.6)
    for (const t of [0.36, 0.5, 0.64, 0.78, 0.9]) across(t, 1.8)
    eye(-98, 10, 6.5)
    for (let i = 0; i < 7; i++) {
      const t = 0.06 + i * 0.09, [x, y] = shrimpAt(t), [dx, dy] = shrimpDir(t), h = shrimpHalf(t)
      line([[x + dy * (h - 2), y - dx * (h - 2)], [x + dy * (h - 10) - dx * 5, y - dx * (h - 10) - dy * 5]], 1.4)
    }
    const base = SHRIMP_SPINE.P2
    for (const q of [poly.find((p) => p[0] >= 120), poly.reduce((m, p) => (p[1] < m[1] ? p : m))]) if (q) line([[base[0], base[1]], q], 1.2, TAG_GOLD_FAINT)
    salt(-70, 60, 20, 60, 24); salt(80, 124, -76, -10, 12)
  } else {
    // (the clam: its growth lines round from its beak, a few rays out from it, its hinge's ligament beside its beak)
    const beak = [-4, 70] as const
    for (const s of [0.78, 0.56, 0.34]) {
      g.strokeStyle = s === 0.78 ? TAG_GOLD : TAG_GOLD_FAINT; g.lineWidth = s === 0.78 ? 1.8 : 1.4
      trace(poly.map(([u, w]) => [beak[0] + (u - beak[0]) * s, beak[1] + (w - beak[1]) * s] as const)); g.closePath(); g.stroke()
    }
    for (const [u, w] of [[-74, -50], [-26, -70], [30, -70], [80, -46]] as const) {
      line([[beak[0] + (u - beak[0]) * 0.2, beak[1] + (w - beak[1]) * 0.2], [u, w]], 1.1, 'rgba(212,171,85,0.35)')
    }
    line([[2, 72], [30, 62]], 3)
  }
  g.restore()
  // (a gold line round it, just in from its edge)
  outline()
  g.strokeStyle = TAG_GOLD; g.lineWidth = 3; g.stroke()
  // (the number where its body's widest, cream outlined dark, large; set by its ink's own box (the serif's old-style figures sit high or
  // low in their letter's box), so it's in the middle whichever it is)
  const label = String(seatLabel(k))
  g.font = `900 ${label.length > 1 ? 60 : 68}px Georgia, "Times New Roman", serif`
  g.textAlign = 'left'
  g.textBaseline = 'alphabetic'
  g.lineJoin = 'round'
  const m = g.measureText(label), [cx, cy] = P(...TAG_LOOKS[kind].pole)
  const x = cx - (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2, y = cy + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2
  g.lineWidth = 7
  g.strokeStyle = TAG_CHAR
  g.strokeText(label, x, y)
  g.fillStyle = '#f6e7c4'
  g.fillText(label, x, y)
}
const SEAT_TAG_TEX = (() => {
  if (typeof document === 'undefined') return null
  const n = GRILL_SEATS.length
  const cv = document.createElement('canvas')
  cv.width = TAG_CW * TAG_COLS; cv.height = TAG_CH * Math.ceil(n / TAG_COLS)
  const g = cv.getContext('2d')
  if (!g) return null
  let seed = 445
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  for (let k = 0; k < n; k++) paintSeatTag(g, k, rnd)
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  // (its lettering kept sharp: up to twice the pictures' cap (scene/textureCap), so 1024 by 320 isn't shrunk even on a Mac)
  t.userData.capScale = 2
  return t
})()
/** the k-th place's board, `d` thick: its face toward -z (its picture's cell on it, its head to the viewer's left, its number the right way
 * round) and its back and edge plain, two geometries */
function seatTagGeometry(k: number, d: number) {
  const rows = Math.ceil(GRILL_SEATS.length / TAG_COLS), [col, row] = tagCellOf(k)
  // (viewed from -z its left is +x: the outline's left (its head) at +x)
  const pts = TAG_OUTLINES[tagKindOf(k)].map(([u, w]) => new THREE.Vector2(-u * TAG_PX, w * TAG_PX))
  const shape = new THREE.Shape(pts)
  const face = new THREE.ShapeGeometry(shape, 1)
  const back = new THREE.ShapeGeometry(shape, 1)
  // (the face: at -z, its picture's cell by where each point is in the outline)
  face.translate(0, 0, -d / 2)
  const fuv = face.attributes.uv as THREE.BufferAttribute, fpos = face.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < fuv.count; i++) {
    const u = -fpos.getX(i) / TAG_PX, w = fpos.getY(i) / TAG_PX
    fuv.setXY(i, (col + 0.5 + u / TAG_CW) / TAG_COLS, 1 - (row + 0.5 - w / TAG_CH) / rows)
  }
  back.translate(0, 0, d / 2)
  // (ShapeGeometry faces +z: the face toward -z turned by flipping its winding)
  const ix = face.index!
  for (let i = 0; i < ix.count; i += 3) { const a = ix.getX(i + 1); ix.setX(i + 1, ix.getX(i + 2)); ix.setX(i + 2, a) }
  const nm = face.attributes.normal as THREE.BufferAttribute
  for (let i = 0; i < nm.count; i++) nm.setZ(i, -nm.getZ(i))
  // (its edge: a quad between each two points, round)
  const side: number[] = []
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length]
    side.push(a.x, a.y, -d / 2, b.x, b.y, -d / 2, b.x, b.y, d / 2, a.x, a.y, -d / 2, b.x, b.y, d / 2, a.x, a.y, d / 2)
  }
  const edge = new THREE.BufferGeometry()
  edge.setAttribute('position', new THREE.Float32BufferAttribute(side, 3))
  edge.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((side.length / 3) * 2).fill(0), 2))
  edge.computeVertexNormals()
  // (its winding outward whichever way round the outline runs)
  const area = pts.reduce((s, p, i) => s + p.x * pts[(i + 1) % pts.length].y - pts[(i + 1) % pts.length].x * p.y, 0)
  if (area < 0) {
    const pa = edge.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < pa.count; i += 3) {
      const x = pa.getX(i + 1), y = pa.getY(i + 1), z = pa.getZ(i + 1)
      pa.setXYZ(i + 1, pa.getX(i + 2), pa.getY(i + 2), pa.getZ(i + 2)); pa.setXYZ(i + 2, x, y, z)
    }
    edge.computeVertexNormals()
  }
  // (two meshes, not one with two groups: the bar's batch folds meshes together by material)
  const front = face.toNonIndexed(), b2 = back.toNonIndexed()
  const plain = mergeGeometries([b2, edge])!
  face.dispose(); back.dispose(); edge.dispose(); b2.dispose()
  return { face: front, plain }
}
const SEAT_TAG_GEOS = GRILL_SEATS.map((_, k) => seatTagGeometry(k, SEAT_TAG.d))
/** each kind's skewer through it where its line crosses it, out 2 cm past each end: a split of bamboo, six sides (its head at +x) */
const SEAT_TAG_SKEWERS = {} as Record<TagKind, THREE.BufferGeometry>
for (const kind of TAG_KINDS) {
  const [lo, hi] = TAG_LOOKS[kind].skewer
  SEAT_TAG_SKEWERS[kind] = new THREE.CylinderGeometry(0.0016, 0.0016, (hi - lo) * TAG_PX + 0.04, 6).rotateZ(Math.PI / 2).translate((-(lo + hi) / 2) * TAG_PX, 0, 0)
}
const SEAT_TAG_FACE_MAT = typeof document === 'undefined' ? null
  : new THREE.MeshToonMaterial({ map: SEAT_TAG_TEX, emissive: '#ffffff', emissiveMap: SEAT_TAG_TEX, emissiveIntensity: 0.18 })
const SEAT_TAG_EDGE_MAT = typeof document === 'undefined' ? null : new THREE.MeshToonMaterial({ color: '#1a100a' })
const SEAT_TAG_SKEWER_MAT = typeof document === 'undefined' ? null : new THREE.MeshToonMaterial({ color: '#d2b27a' })
/**
 * The place's number: on the screen's face behind it (`onLip`), or standing on a foot where there's no screen. Standing, it's one board
 * facing the customer, its back plain toward the kitchen (item 493: two halves back to back, each head-left from its own side, were each
 * other's mirror, so a board not the same both ends showed the other half's tail or arms past its own)
 */
export function SeatTag({ k, onLip }: { k: number; onLip: boolean }) {
  const kind = tagKindOf(k)
  const board = (
    <>
      <mesh geometry={SEAT_TAG_GEOS[k].face} material={SEAT_TAG_FACE_MAT!} />
      <mesh geometry={SEAT_TAG_GEOS[k].plain} material={SEAT_TAG_EDGE_MAT!} />
      <mesh geometry={SEAT_TAG_SKEWERS[kind]} material={SEAT_TAG_SKEWER_MAT!} position-y={SEAT_TAG_SKEWER_Y} />
    </>
  )
  if (onLip) return <group position={[0, LIP_H / 2, LIP_FACE - SEAT_TAG.d / 2 - 0.001]}>{board}</group>
  // (its lowest point under its middle let 2 mm into its foot's top)
  return (
    <group position={[0, 0, LIP_FACE - 0.035]}>
      <mesh position={[0, SEAT_TAG.foot / 2, 0]}><boxGeometry args={[SEAT_TAG.L * 0.5, SEAT_TAG.foot, 0.026]} /><meshToonMaterial color="#d6b88c" /></mesh>
      <group position-y={SEAT_TAG.foot - 0.002 - TAG_LOOKS[kind].foot * TAG_PX}>{board}</group>
    </group>
  )
}
