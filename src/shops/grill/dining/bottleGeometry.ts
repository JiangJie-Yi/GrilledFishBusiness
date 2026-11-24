import * as THREE from 'three'
import { reflectStudio } from '@/scene/render/studio'
import { DRINKS, type DrinkId } from '@/shops/grill/bar'
import { canvasTex } from './base'
import { formOf, soju, KIND_OF } from './drinkKinds'

/** a bottle turned from its profile: the points of (radius, height) from its foot up to its mouth */
// (8 round (12 before, 16 before that; the owner's: a hundred and sixty of them in the fridges, seen through glass): a bottle a few
// centimetres across is round enough at that, smooth shaded; its labels, caps and the cans the same)
const bottleBody = (pts: [number, number][]) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 8)
/** what's in a bottle: its inside (the profile drawn in by the glass's thickness) filled to `fill` of the way up, a flat top there */
function liquidOf(pts: [number, number][], fill: number) {
  const top = pts[pts.length - 1][1] * fill
  const out: [number, number][] = []
  for (let i = 0; i < pts.length; i++) {
    const [r, y] = pts[i]
    if (y <= top) { out.push([Math.max(0, r * 0.9), Math.max(0.002, y)]); continue }
    const [r0, y0] = pts[i - 1]
    out.push([(r0 + ((top - y0) / (y - y0)) * (r - r0)) * 0.9, top])
    break
  }
  out.push([0, top])
  return bottleBody(out)
}
/** a screw cap: a short cylinder, its side finely ribbed for the fingers */
function ribbedCap(r: number, h: number) {
  const g = new THREE.CylinderGeometry(r, r, h, 16, 1)
  const pos = g.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), d = Math.hypot(x, z)
    if (d < r * 0.99) continue
    const a = Math.atan2(z, x), k = 1 + 0.04 * (Math.cos(a * 8) > 0 ? 1 : 0)
    pos.setX(i, x * k); pos.setZ(i, z * k)
  }
  g.computeVertexNormals()
  return g
}
/** the ramune bottle's profile: a round body, its shoulder drawn in to the neck's pinch, the chamber the marble rolls in, a second pinch
 * that holds it up against the mouth, and the mouth */
const RAMUNE_PTS: [number, number][] = [[0, 0], [0.021, 0], [0.0245, 0.004], [0.025, 0.012], [0.025, 0.085], [0.023, 0.1], [0.017, 0.114],
  [0.0115, 0.122], [0.0108, 0.128], [0.0148, 0.138], [0.0152, 0.146], [0.0115, 0.154], [0.0098, 0.16], [0.0115, 0.172], [0.0122, 0.178], [0, 0.178]]
export const BOTTLE_SHAPE = {
  // a brown long-necked beer bottle, a gold foil at its neck
  beer: { body: bottleBody([[0, 0], [0.024, 0], [0.0275, 0.005], [0.0275, 0.12], [0.0235, 0.145], [0.0145, 0.17], [0.0125, 0.2],
    [0.0135, 0.206], [0.0135, 0.21], [0, 0.21]]), label: new THREE.CylinderGeometry(0.0282, 0.0282, 0.07, 8, 1, true), labelY: 0.065,
    cap: new THREE.CylinderGeometry(0.0145, 0.0145, 0.008, 8), capY: 0.213, foil: new THREE.CylinderGeometry(0.0138, 0.0155, 0.04, 9), foilY: 0.18 },
  // the glass milk bottle: a wide mouth, a paper cap pressed down over it, a paper label round its middle
  milk: { body: bottleBody([[0, 0], [0.02, 0], [0.0225, 0.005], [0.0225, 0.085], [0.02, 0.098], [0.0175, 0.106], [0.0175, 0.118], [0, 0.118]]),
    label: new THREE.CylinderGeometry(0.0228, 0.0228, 0.06, 8, 1, true), labelY: 0.05,
    cap: new THREE.CylinderGeometry(0.0195, 0.0195, 0.006, 9), capY: 0.121, foil: new THREE.CylinderGeometry(0.0182, 0.0188, 0.014, 9) as THREE.BufferGeometry | null, foilY: 0.112 },
  // the 500 ml plastic bottle: a ribbed foot, a label round its middle, a coloured cap
  pet500: { body: bottleBody([[0, 0], [0.019, 0], [0.0235, 0.006], [0.0235, 0.1], [0.021, 0.125], [0.0135, 0.145], [0.0105, 0.152],
    [0.0105, 0.158], [0, 0.158]]), label: new THREE.CylinderGeometry(0.0238, 0.0238, 0.075, 8, 1, true), labelY: 0.07,
    cap: ribbedCap(0.0118, 0.012), capY: 0.164, foil: null as THREE.BufferGeometry | null, foilY: 0 },
  // a clear slim sake bottle with a round shoulder, a paper collar under the red cap
  sake: { body: bottleBody([[0, 0], [0.022, 0], [0.0245, 0.004], [0.0245, 0.12], [0.0225, 0.15], [0.014, 0.178], [0.0105, 0.2],
    [0.0115, 0.206], [0, 0.206]]), label: new THREE.CylinderGeometry(0.0249, 0.0249, 0.085, 8, 1, true), labelY: 0.07,
    cap: ribbedCap(0.0125, 0.014), capY: 0.21, foil: new THREE.CylinderGeometry(0.0112, 0.0125, 0.012, 9), foilY: 0.196 },
  // the big plastic tea bottle: wide, a ribbed foot, a green label round its middle
  pet: { body: bottleBody([[0, 0], [0.026, 0], [0.032, 0.008], [0.032, 0.012], [0.0305, 0.02], [0.032, 0.028], [0.032, 0.17],
    [0.028, 0.2], [0.017, 0.225], [0.0135, 0.236], [0.0135, 0.246], [0, 0.246]]), label: new THREE.CylinderGeometry(0.0326, 0.0326, 0.1, 8, 1, true),
    labelY: 0.1, cap: ribbedCap(0.0145, 0.014), capY: 0.252, foil: null as THREE.BufferGeometry | null, foilY: 0 },
}
/** what's in each shaped bottle, and how full: the tea and the sports drink near the top, the sake a little lower, the milk to the neck */
export const BOTTLE_DRINK = {
  beer: liquidOf([[0, 0], [0.024, 0], [0.0275, 0.005], [0.0275, 0.12], [0.0235, 0.145], [0.0145, 0.17], [0.0125, 0.2], [0, 0.21]], 0.8),
  milk: liquidOf([[0, 0], [0.02, 0], [0.0225, 0.005], [0.0225, 0.085], [0.02, 0.098], [0.0175, 0.106], [0, 0.118]], 0.86),
  pet500: liquidOf([[0, 0], [0.019, 0], [0.0235, 0.006], [0.0235, 0.1], [0.021, 0.125], [0.0135, 0.145], [0.0105, 0.152], [0, 0.158]], 0.9),
  sake: liquidOf([[0, 0], [0.022, 0], [0.0245, 0.004], [0.0245, 0.12], [0.0225, 0.15], [0.014, 0.178], [0.0105, 0.2], [0, 0.206]], 0.8),
  pet: liquidOf([[0, 0], [0.026, 0], [0.032, 0.008], [0.032, 0.17], [0.028, 0.2], [0.017, 0.225], [0.0135, 0.236], [0, 0.246]], 0.88),
}
/** the shelf's plain bottles (DrinkBottleLite): each body a few rings (its foot, its shoulder rounded by a ring more, its neck and its lip),
 * 8 round, open under its foot and under its cap (no fan of triangles to a point); a label band; a cap; the beer's gold foil round its
 * neck, the sake's paper collar (`collar`, its radius at its foot and its top, how tall, where) */
const liteBody = (pts: [number, number][]) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 7)
export const LITE_PTS: Record<'beer' | 'sake' | 'pet500' | 'pet' | 'milk' | 'ramune', [number, number][]> = {
  beer: [[0.012, 0], [0.0275, 0.003], [0.0275, 0.12], [0.0235, 0.145], [0.0145, 0.17], [0.0125, 0.2], [0.0135, 0.206], [0.004, 0.207]],
  sake: [[0.012, 0], [0.0245, 0.003], [0.0245, 0.12], [0.0225, 0.15], [0.014, 0.178], [0.0105, 0.2], [0.0115, 0.206], [0.004, 0.207]],
  pet500: [[0.012, 0], [0.0235, 0.004], [0.0235, 0.1], [0.021, 0.125], [0.0135, 0.145], [0.0105, 0.152], [0.0105, 0.158], [0.004, 0.159]],
  pet: [[0.014, 0], [0.032, 0.006], [0.032, 0.17], [0.028, 0.2], [0.017, 0.225], [0.0135, 0.236], [0.0135, 0.246], [0.004, 0.247]],
  milk: [[0.012, 0], [0.0225, 0.004], [0.0225, 0.085], [0.02, 0.098], [0.0175, 0.106], [0.0175, 0.118], [0.004, 0.119]],
  ramune: [[0.012, 0], [0.025, 0.006], [0.025, 0.085], [0.0115, 0.122], [0.0152, 0.146], [0.0098, 0.16], [0.0122, 0.178], [0.004, 0.179]],
}
/** a collar round a shelf bottle's neck: a band open at both ends, `rb` round at its foot, `rt` at its top, `h` tall */
const liteCollar = (rb: number, rt: number, h: number) => new THREE.CylinderGeometry(rt, rb, h, 7, 1, true)
/** a shelf bottle's cap: its side and its top turned in to a small ring (no fan of triangles into its middle (the owner's, 2026-11-12: the
 * caps showed spokes); open underneath, where it sits on the neck), `seg` round */
// (its side alone, its top the card laid in it (item 65b): it was turned in to a little ring over the top)
const liteCap = (seg: number) => new THREE.LatheGeometry([new THREE.Vector2(0.013, -0.005), new THREE.Vector2(0.013, 0.005)], seg)
/** the bottles behind the front one in each place, all but hidden by it (the owner's, 2026-11-12: no more faces than need be): six round,
 * their bodies in fewer rings (the foot, the body's top, the shoulder, the lip), their labels and caps six round too; a third of the faces */
const LITE_FAR_PTS: Record<keyof typeof LITE_PTS, [number, number][]> = {
  beer: [[0.012, 0], [0.0275, 0.003], [0.0275, 0.12], [0.0145, 0.17], [0.0135, 0.206], [0.004, 0.207]],
  sake: [[0.012, 0], [0.0245, 0.003], [0.0245, 0.12], [0.014, 0.178], [0.0115, 0.206], [0.004, 0.207]],
  pet500: [[0.012, 0], [0.0235, 0.004], [0.0235, 0.1], [0.0135, 0.145], [0.0105, 0.158], [0.004, 0.159]],
  pet: [[0.014, 0], [0.032, 0.006], [0.032, 0.17], [0.017, 0.225], [0.0135, 0.246], [0.004, 0.247]],
  milk: [[0.012, 0], [0.0225, 0.004], [0.0225, 0.085], [0.0175, 0.106], [0.0175, 0.118], [0.004, 0.119]],
  ramune: [[0.012, 0], [0.025, 0.006], [0.025, 0.085], [0.0115, 0.122], [0.0122, 0.178], [0.004, 0.179]],
}
export const LITE_FAR = Object.fromEntries(Object.entries(LITE_FAR_PTS).map(([k, pts]) => [k, new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 6)])) as unknown as Record<keyof typeof LITE_PTS, THREE.BufferGeometry>
const LITE_FAR_LABEL = new Map<THREE.BufferGeometry, THREE.BufferGeometry>()
/** a label band six round, the same size as the one given */
export const farLabel = (g: THREE.CylinderGeometry) => {
  let f = LITE_FAR_LABEL.get(g)
  if (!f) { const p = g.parameters; f = new THREE.CylinderGeometry(p.radiusTop, p.radiusBottom, p.height, 6, 1, true); LITE_FAR_LABEL.set(g, f) }
  return f
}
export const LITE_GEO = {
  beer: { body: liteBody(LITE_PTS.beer), label: new THREE.CylinderGeometry(0.0282, 0.0282, 0.07, 7, 1, true), labelY: 0.065, capY: 0.21, capR: 1.1,
    collar: { geo: liteCollar(0.0152, 0.0136, 0.028), y: 0.186 } as { geo: THREE.BufferGeometry; y: number } | null },
  sake: { body: liteBody(LITE_PTS.sake), label: new THREE.CylinderGeometry(0.0249, 0.0249, 0.085, 7, 1, true), labelY: 0.07, capY: 0.208, capR: 0.95,
    collar: { geo: liteCollar(0.0129, 0.0116, 0.012), y: 0.196 } as { geo: THREE.BufferGeometry; y: number } | null },
  pet500: { body: liteBody(LITE_PTS.pet500), label: new THREE.CylinderGeometry(0.0238, 0.0238, 0.075, 7, 1, true), labelY: 0.07, capY: 0.162, capR: 0.9,
    collar: null as { geo: THREE.BufferGeometry; y: number } | null },
  pet: { body: liteBody(LITE_PTS.pet), label: new THREE.CylinderGeometry(0.0326, 0.0326, 0.1, 7, 1, true), labelY: 0.1, capY: 0.25, capR: 1.1,
    collar: null as { geo: THREE.BufferGeometry; y: number } | null },
  milk: { body: liteBody(LITE_PTS.milk), label: new THREE.CylinderGeometry(0.0228, 0.0228, 0.06, 7, 1, true), labelY: 0.05, capY: 0.12, capR: 1.5,
    collar: null as { geo: THREE.BufferGeometry; y: number } | null },
  ramune: { body: liteBody(LITE_PTS.ramune), label: new THREE.CylinderGeometry(0.0252, 0.0252, 0.05, 7, 1, true), labelY: 0.055, capY: 0.181, capR: 1.0,
    collar: null as { geo: THREE.BufferGeometry; y: number } | null },
  cap: liteCap(8),
  capFar: liteCap(6),
  marble: new THREE.IcosahedronGeometry(0.0108, 0),
  canLabel: new THREE.CylinderGeometry(0.0212, 0.0212, 0.088, 7, 1, true),
}
export const BOTTLE_GEO = {
  body: new THREE.CylinderGeometry(0.026, 0.028, 0.13, 9),
  label: new THREE.CylinderGeometry(0.0285, 0.0295, 0.06, 9, 1, true),
  neck: new THREE.CylinderGeometry(0.012, 0.026, 0.04, 8),
  cap: new THREE.CylinderGeometry(0.013, 0.013, 0.01, 8),
  can: bottleBody([[0, 0], [0.0168, 0], [0.0198, 0.004], [0.0212, 0.011], [0.0212, 0.078], [0.0202, 0.084], [0.0184, 0.0885], [0.0178, 0.09], [0, 0.09]]),
  canLabel: new THREE.CylinderGeometry(0.0215, 0.0215, 0.07, 8, 1, true),
  small: new THREE.LatheGeometry([[0, 0], [0.016, 0], [0.017, 0.02], [0.013, 0.036], [0.016, 0.056], [0.015, 0.072], [0, 0.072]]
    .map(([x, y]) => new THREE.Vector2(x, y - 0.036)), 8),
  smallTop: new THREE.CylinderGeometry(0.0155, 0.0155, 0.004, 8),
  // the ramune bottle: its glass, the drink in it, the marble held up in its neck, its blue cap, a paper band round its shoulder
  ramune: bottleBody(RAMUNE_PTS),
  ramuneDrink: liquidOf(RAMUNE_PTS, 0.62),
  marble: new THREE.IcosahedronGeometry(0.0108, 1),
  ramuneCap: new THREE.CylinderGeometry(0.0128, 0.0135, 0.014, 8),
  ramuneLabel: new THREE.CylinderGeometry(0.0252, 0.0252, 0.05, 8, 1, true),
}
/**
 * Each drink's label, drawn round it twice (it reads from either side), in the manner of what's on a Japanese shop's shelf (no maker's
 * marks): the beer can's gold with a big 生, the highball's navy and amber, the coffee can's dark brown with a steaming cup, the green
 * tea's brushed 緑茶 over leaves, the oolong's amber, the sports drink's blue and white split, the milk's blue lettering, the lemon chuhai's
 * frosted silver and a lemon slice, the sake's washi label and red seal, the ramune's blue and its marble.
 */
export const LABEL_W = 512, LABEL_H = 256
function drawLabel(g: CanvasRenderingContext2D, id: DrinkId, lbl: readonly string[]) {
  const W = LABEL_W, H = LABEL_H
  // (a glass bottle's label printed once, on its front: its back shows through the glass, and twice it would read through itself)
  const once = formOf(id) === 'sake' || id === 'ramune' || id === 'milk' || formOf(id) === 'beer'
  const face = (draw: (cx: number) => void) => { for (const cx of once ? [W * 0.25] : [W * 0.25, W * 0.75]) { g.save(); draw(cx); g.restore() } }
  const vtext = (text: string, cx: number, cy: number, size: number, fill: string) => {
    const chars = [...text]
    g.font = `900 ${size}px "Zen Antique", "Noto Serif TC", serif`
    g.textAlign = 'center'; g.textBaseline = 'middle'
    chars.forEach((ch, k) => { g.fillStyle = fill; g.fillText(ch, cx, cy + (k - (chars.length - 1) / 2) * size * 0.95) })
  }
  const htext = (text: string, cx: number, cy: number, size: number, fill: string, font = '"Arial Black", "Helvetica Neue", sans-serif', weight = 900) => {
    g.font = `${weight} ${size}px ${font}`
    g.textAlign = 'center'; g.textBaseline = 'middle'
    g.fillStyle = fill; g.fillText(text, cx, cy)
  }
  const grad = (stops: [number, string][]) => {
    const gr = g.createLinearGradient(0, 0, 0, H)
    for (const [t, c] of stops) gr.addColorStop(t, c)
    return gr
  }
  const JP = '"Zen Antique", serif'
  /**
   * A paper pack's print (PACK's body; the owner's, 2026-11-10): its ground, a band of colour at its foot; its wide front at a quarter
   * round, its narrow sides at a half and at the seam (both ends, a half each), its back at three quarters (what's in it, the 200 ml and
   * the paper pack mark); each panel drawn a seventh wider than it's drawn tall (the print runs 14 cm round on 512 dots, 8 cm up on 256);
   * a strip of the ground at the very top for its top and foot
   */
  const pack = (ground: string, band: string, front: (cx: number) => void, side: (cx: number) => void) => {
    g.fillStyle = ground; g.fillRect(0, 0, W, H)
    g.fillStyle = band; g.fillRect(0, H * 0.87, W, H * 0.13)
    const panel = (x: number, draw: (cx: number) => void) => { g.save(); g.translate(x, 0); g.scale(1.144, 1); draw(0); g.restore() }
    panel(W * 0.25, (cx) => {
      front(cx)
      htext('200ml', cx + 34, H * 0.935, 14, '#ffffff', '"Arial Black", sans-serif')
      paperMark(cx - 44, H * 0.935, 18, '#ffffff')
    })
    for (const x of [0, W * 0.5, W]) panel(x, side)
    panel(W * 0.75, (cx) => {
      g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(cx - 52, H * 0.18, 104, H * 0.6)
      g.strokeStyle = band; g.lineWidth = 1.5; g.strokeRect(cx - 52, H * 0.18, 104, H * 0.6)
      g.fillStyle = 'rgba(60,50,40,0.45)'
      for (let k = 0; k < 9; k++) g.fillRect(cx - 44, H * 0.25 + k * 15, k % 3 === 2 ? 52 : 88, 3)
      paperMark(cx - 36, H * 0.935, 18, '#ffffff')
      htext('200ml', cx + 30, H * 0.935, 14, '#ffffff', '"Arial Black", sans-serif')
    })
    g.fillStyle = ground; g.fillRect(0, 0, W, 6)
  }
  /** the paper pack mark (紙パック): a little rounded square, 紙 in it */
  const paperMark = (x: number, y: number, s: number, ink: string) => {
    g.strokeStyle = ink; g.lineWidth = 1.6
    g.beginPath(); g.roundRect(x - s / 2, y - s / 2, s, s, 3); g.stroke()
    htext('紙', x, y + 1, s * 0.62, ink, '"Noto Sans TC", sans-serif', 700)
  }
  // (soju's Hangul: the system's own Korean face (Malgun Gothic on Windows, Apple SD Gothic Neo on a Mac))
  const HANGUL = '"Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", "Nanum Gothic", sans-serif'
  switch (id) {
    case 'beerCan': {
      g.fillStyle = grad([[0, '#f4e3a0'], [0.5, '#d9b24a'], [1, '#a8822a']]); g.fillRect(0, 0, W, H)
      g.fillStyle = '#f6f1e2'; g.fillRect(0, H * 0.08, W, H * 0.06); g.fillRect(0, H * 0.86, W, H * 0.05)
      face((cx) => {
        g.fillStyle = '#b8201c'; g.beginPath(); g.arc(cx, H * 0.45, 46, 0, Math.PI * 2); g.fill()
        g.strokeStyle = '#f6e7b0'; g.lineWidth = 3; g.beginPath(); g.arc(cx, H * 0.45, 52, 0, Math.PI * 2); g.stroke()
        htext('生', cx, H * 0.46, 64, '#fff8e8', JP)
        htext('BEER', cx, H * 0.74, 26, '#5a1a10')
        g.fillStyle = '#7a4a12'
        for (const sd of [-1, 1]) for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(cx + sd * 76, H * 0.32 + k * 13, 5, 9, sd * 0.5, 0, Math.PI * 2); g.fill() }
      })
      break
    }
    case 'beer': {
      g.fillStyle = '#f2e8c8'; g.fillRect(0, 0, W, H)
      face((cx) => {
        g.fillStyle = '#b8201c'; g.beginPath(); g.ellipse(cx, H / 2, 100, 88, 0, 0, Math.PI * 2); g.fill()
        g.fillStyle = '#f6efd6'; g.beginPath(); g.ellipse(cx, H / 2, 90, 78, 0, 0, Math.PI * 2); g.fill()
        htext('生', cx, H * 0.46, 76, '#b8201c', JP)
        htext('LAGER', cx, H * 0.78, 20, '#5a1a10')
      })
      break
    }
    case 'highball': {
      g.fillStyle = grad([[0, '#0f1a34'], [1, '#1c2a52']]); g.fillRect(0, 0, W, H)
      g.fillStyle = '#d88a2a'; g.fillRect(0, H * 0.58, W, H * 0.16)
      face((cx) => {
        vtext('ハイボール', cx - 40, H * 0.4, 30, '#f2d27a')
        htext('WHISKY', cx + 34, H * 0.3, 22, '#f2d27a')
        htext('& SODA', cx + 34, H * 0.42, 18, '#d8e0f0')
        g.fillStyle = 'rgba(255,255,255,0.7)'
        for (let k = 0; k < 12; k++) { g.beginPath(); g.arc(cx + 10 + (k * 23) % 60, H * 0.6 + (k * 37) % 30, 2 + (k % 3), 0, Math.PI * 2); g.fill() }
        htext('ALC.7%', cx + 34, H * 0.85, 16, '#d8e0f0')
      })
      break
    }
    case 'coffee': {
      g.fillStyle = grad([[0, '#3a2012'], [1, '#1c0e06']]); g.fillRect(0, 0, W, H)
      g.fillStyle = '#c89a4a'; g.fillRect(0, H * 0.14, W, 4); g.fillRect(0, H * 0.84, W, 4)
      face((cx) => {
        g.fillStyle = '#f2e6cc'; g.beginPath(); g.moveTo(cx - 30, H * 0.42); g.lineTo(cx + 30, H * 0.42); g.lineTo(cx + 22, H * 0.62); g.lineTo(cx - 22, H * 0.62); g.closePath(); g.fill()
        g.strokeStyle = '#f2e6cc'; g.lineWidth = 5; g.beginPath(); g.arc(cx + 32, H * 0.5, 9, -1.4, 1.4); g.stroke()
        g.strokeStyle = 'rgba(242,230,204,0.7)'; g.lineWidth = 3
        for (const dx of [-12, 0, 12]) { g.beginPath(); g.moveTo(cx + dx, H * 0.38); g.bezierCurveTo(cx + dx - 8, H * 0.32, cx + dx + 8, H * 0.28, cx + dx, H * 0.22); g.stroke() }
        htext('COFFEE', cx, H * 0.74, 28, '#e8c27a')
        g.fillStyle = '#c4302a'; g.beginPath(); g.arc(cx + 70, H * 0.3, 20, 0, Math.PI * 2); g.fill()
        htext('微糖', cx + 70, H * 0.3, 16, '#fff', JP)
      })
      break
    }
    case 'greenTea': {
      g.fillStyle = grad([[0, '#f6f8ee'], [0.6, '#dfecc8'], [1, '#9cc070']]); g.fillRect(0, 0, W, H)
      face((cx) => {
        g.fillStyle = 'rgba(74,138,58,0.35)'
        for (let k = 0; k < 5; k++) { g.save(); g.translate(cx + 40, H * 0.3 + k * 32); g.rotate(-0.6 + k * 0.3); g.beginPath(); g.ellipse(0, 0, 26, 9, 0, 0, Math.PI * 2); g.fill(); g.restore() }
        vtext('緑茶', cx - 20, H * 0.48, 66, '#1f4a22')
        g.fillStyle = '#c4302a'; g.fillRect(cx + 46, H * 0.72, 30, 30)
        htext('濃', cx + 61, H * 0.72 + 16, 20, '#fff', JP)
      })
      break
    }
    case 'cola': {
      g.fillStyle = '#b8161a'; g.fillRect(0, 0, W, H)
      g.strokeStyle = '#ffffff'; g.lineWidth = 10
      g.beginPath(); for (let x = 0; x <= W; x += 8) { const y = H * 0.62 + Math.sin(x / 40) * 16; if (x) g.lineTo(x, y); else g.moveTo(x, y) } g.stroke()
      face((cx) => { htext('コーラ', cx, H * 0.36, 52, '#ffffff', JP); htext('COLA', cx, H * 0.82, 22, '#ffd8d0') })
      break
    }
    case 'oolong': {
      g.fillStyle = grad([[0, '#c87a2a'], [1, '#6a3410']]); g.fillRect(0, 0, W, H)
      g.strokeStyle = 'rgba(240,200,120,0.6)'; g.lineWidth = 3
      for (let k = 0; k < 6; k++) { g.beginPath(); for (let x = 0; x <= W; x += 8) { const y = H * 0.2 + k * 34 + Math.sin(x / 30 + k) * 8; if (x) g.lineTo(x, y); else g.moveTo(x, y) } g.stroke() }
      face((cx) => { g.fillStyle = 'rgba(40,16,4,0.55)'; g.fillRect(cx - 44, H * 0.1, 88, H * 0.8); vtext('烏龍茶', cx, H * 0.5, 54, '#f6e2b0') })
      break
    }
    case 'sports': {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H)
      g.fillStyle = '#1f5fb8'
      g.beginPath(); g.moveTo(0, H); g.lineTo(0, H * 0.55); for (let x = 0; x <= W; x += 16) g.lineTo(x, H * 0.55 - Math.sin((x / W) * Math.PI * 4) * 30 - x * 0.05); g.lineTo(W, H); g.closePath(); g.fill()
      face((cx) => { htext('SPORTS', cx, H * 0.24, 34, '#1f5fb8'); htext('DRINK', cx, H * 0.4, 26, '#1f5fb8'); htext('イオン', cx, H * 0.78, 30, '#ffffff', JP) })
      break
    }
    case 'milk': {
      g.fillStyle = '#fbf8ee'; g.fillRect(0, 0, W, H)
      g.fillStyle = '#2a5aa8'; g.fillRect(0, 0, W, H * 0.12); g.fillRect(0, H * 0.88, W, H * 0.12)
      face((cx) => {
        g.fillStyle = 'rgba(42,90,168,0.85)'
        for (const [dx, dy, r] of [[-60, -30, 12], [62, 20, 16], [-50, 46, 9], [40, -48, 10]]) { g.beginPath(); g.ellipse(cx + dx, H / 2 + dy, r * 1.3, r, 0.4, 0, Math.PI * 2); g.fill() }
        vtext('牛乳', cx, H * 0.5, 62, '#2a5aa8')
        htext('成分無調整', cx, H * 0.94, 16, '#ffffff', JP, 400)
      })
      break
    }
    case 'chuhai': {
      g.fillStyle = grad([[0, '#eef2f4'], [0.5, '#c8d0d6'], [1, '#e8eef2']]); g.fillRect(0, 0, W, H)
      g.fillStyle = 'rgba(255,255,255,0.8)'
      for (let k = 0; k < 160; k++) g.fillRect((k * 97) % W, (k * 61) % H, 2, 2)
      face((cx) => {
        g.fillStyle = '#f6d23a'; g.beginPath(); g.arc(cx + 30, H * 0.45, 40, 0, Math.PI * 2); g.fill()
        g.fillStyle = '#fff6c0'; g.beginPath(); g.arc(cx + 30, H * 0.45, 32, 0, Math.PI * 2); g.fill()
        g.strokeStyle = '#f6d23a'; g.lineWidth = 3
        for (let k = 0; k < 8; k++) { g.beginPath(); g.moveTo(cx + 30, H * 0.45); g.lineTo(cx + 30 + Math.cos(k * 0.785) * 32, H * 0.45 + Math.sin(k * 0.785) * 32); g.stroke() }
        vtext('レモン', cx - 50, H * 0.45, 30, '#1c3a7a')
        htext('チューハイ', cx, H * 0.82, 22, '#1c3a7a', JP)
      })
      break
    }
    case 'sake': {
      g.fillStyle = '#f4efe0'; g.fillRect(0, 0, W, H)
      g.fillStyle = 'rgba(160,130,80,0.15)'
      for (let k = 0; k < 90; k++) g.fillRect((k * 89) % W, (k * 53) % H, 14, 1)
      face((cx) => {
        vtext('清酒', cx, H * 0.46, 70, '#1a1410')
        g.fillStyle = '#b8261c'; g.fillRect(cx + 44, H * 0.12, 26, 40)
        vtext('特撰', cx + 57, H * 0.12 + 20, 15, '#fff2e0')
      })
      break
    }
    case 'ramune': {
      g.fillStyle = '#2a6ab0'; g.fillRect(0, 0, W, H)
      g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 6
      for (let x = -H; x < W; x += 30) { g.beginPath(); g.moveTo(x, H); g.lineTo(x + H, 0); g.stroke() }
      face((cx) => {
        g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(cx, H / 2, 70, 50, 0, 0, Math.PI * 2); g.fill()
        htext('ラムネ', cx, H * 0.48, 40, '#2a6ab0', JP)
      })
      break
    }
    case 'blackCoffee': {
      g.fillStyle = grad([[0, '#2a2a2a'], [1, '#0a0a0a']]); g.fillRect(0, 0, W, H)
      g.fillStyle = '#c8a24a'; g.fillRect(0, H * 0.12, W, 3); g.fillRect(0, H * 0.86, W, 3)
      face((cx) => {
        htext('BLACK', cx, H * 0.42, 54, '#f2f2f2')
        htext('COFFEE', cx, H * 0.62, 22, '#c8a24a')
        g.fillStyle = '#b8201c'; g.beginPath(); g.arc(cx + 72, H * 0.24, 20, 0, Math.PI * 2); g.fill()
        htext('無糖', cx + 72, H * 0.24, 15, '#fff', JP)
      })
      break
    }
    case 'cafeAuLait': {
      g.fillStyle = grad([[0, '#f2e2c4'], [1, '#c89a64']]); g.fillRect(0, 0, W, H)
      g.fillStyle = '#6a3c1c'; g.fillRect(0, H * 0.8, W, H * 0.2)
      face((cx) => {
        g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(cx + 40, H * 0.46, 30, 22, 0, 0, Math.PI * 2); g.fill()
        g.fillStyle = '#a06a3a'; g.beginPath(); g.ellipse(cx + 40, H * 0.44, 22, 12, 0, 0, Math.PI * 2); g.fill()
        vtext('カフェオレ', cx - 34, H * 0.44, 28, '#5a3418')
        htext('CAFE AU LAIT', cx, H * 0.9, 18, '#f2e2c4')
      })
      break
    }
    case 'yuzuSoda': {
      g.fillStyle = grad([[0, '#f4f2a0'], [1, '#b8d050']]); g.fillRect(0, 0, W, H)
      g.fillStyle = 'rgba(255,255,255,0.7)'
      for (let k = 0; k < 14; k++) { g.beginPath(); g.arc((k * 71) % W, H * 0.15 + (k * 43) % (H * 0.7), 3 + (k % 3), 0, Math.PI * 2); g.fill() }
      face((cx) => {
        g.fillStyle = '#f2c41c'; g.beginPath(); g.arc(cx + 34, H * 0.44, 34, 0, Math.PI * 2); g.fill()
        g.fillStyle = '#3a7a2a'; g.beginPath(); g.ellipse(cx + 44, H * 0.26, 14, 7, -0.5, 0, Math.PI * 2); g.fill()
        vtext('ゆず', cx - 34, H * 0.44, 40, '#2a5a2a')
        htext('SODA', cx, H * 0.84, 26, '#2a5a2a')
      })
      break
    }
    case 'darkBeer': {
      g.fillStyle = '#1a120c'; g.fillRect(0, 0, W, H)
      face((cx) => {
        g.strokeStyle = '#e8c27a'; g.lineWidth = 4; g.beginPath(); g.ellipse(cx, H / 2, 96, 84, 0, 0, Math.PI * 2); g.stroke()
        htext('黒', cx, H * 0.44, 78, '#e8c27a', JP)
        htext('STOUT', cx, H * 0.78, 20, '#e8c27a')
      })
      break
    }
    case 'shochu': {
      // (Korean soju's paper label (no maker's): white, a dewdrop of a bamboo leaf in green, 소주 in green, a red seal, the strength in small)
      g.fillStyle = '#f7f8f3'; g.fillRect(0, 0, W, H)
      g.fillStyle = '#2a8a44'; g.fillRect(0, 0, W, H * 0.07); g.fillRect(0, H * 0.93, W, H * 0.07)
      face((cx) => {
        g.fillStyle = '#5bb36a'
        g.beginPath(); g.ellipse(cx - 56, H * 0.36, 14, 34, -0.5, 0, Math.PI * 2); g.fill()
        g.fillStyle = '#9fd6a4'; g.beginPath(); g.ellipse(cx - 40, H * 0.46, 9, 22, 0.4, 0, Math.PI * 2); g.fill()
        htext('소주', cx + 14, H * 0.47, 66, '#1f7a3a', HANGUL, 800)
        g.fillStyle = '#c62a2a'; g.beginPath(); g.roundRect(cx + 62, H * 0.17, 30, 30, 4); g.fill()
        htext('真', cx + 77, H * 0.17 + 16, 20, '#fff4f0', JP)
        htext('16.5%  360ml', cx + 6, H * 0.8, 18, '#2f6a3a', '"Arial", sans-serif', 700)
      })
      break
    }
    case 'grapeSoju': {
      // (the green grape one: pale green, a bunch of grapes, 청포도 over 소주)
      g.fillStyle = grad([[0, '#f2fae6'], [1, '#d6ecbc']]); g.fillRect(0, 0, W, H)
      face((cx) => {
        g.fillStyle = '#7ab84a'
        for (let r = 0; r < 4; r++) for (let k = 0; k <= 3 - r; k++) { g.beginPath(); g.arc(cx - 70 + k * 15 + r * 7.5, H * 0.3 + r * 14, 8, 0, Math.PI * 2); g.fill() }
        g.fillStyle = 'rgba(255,255,255,0.5)'
        for (let r = 0; r < 4; r++) for (let k = 0; k <= 3 - r; k++) { g.beginPath(); g.arc(cx - 73 + k * 15 + r * 7.5, H * 0.3 + r * 14 - 3, 2.5, 0, Math.PI * 2); g.fill() }
        g.strokeStyle = '#5a7a2a'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx - 48, H * 0.22); g.quadraticCurveTo(cx - 40, H * 0.12, cx - 30, H * 0.16); g.stroke()
        htext('청포도', cx + 30, H * 0.4, 46, '#3a7a2a', HANGUL, 800)
        htext('소주', cx + 30, H * 0.65, 34, '#1f5a2a', HANGUL, 800)
      })
      break
    }
    case 'yogurt': {
      // (drinking yogurt: white, a pink band, ヨーグルト and a little strawberry)
      g.fillStyle = '#fdf7f9'; g.fillRect(0, 0, W, H)
      g.fillStyle = '#e8708f'; g.fillRect(0, H * 0.62, W, H * 0.24)
      face((cx) => {
        htext('のむ', cx, H * 0.28, 30, '#d94a7a', JP)
        htext('ヨーグルト', cx, H * 0.46, 36, '#b8305a', JP)
        g.fillStyle = '#e8384a'; g.beginPath(); g.moveTo(cx - 12, H * 0.68); g.quadraticCurveTo(cx, H * 0.88, cx + 12, H * 0.68); g.quadraticCurveTo(cx, H * 0.62, cx - 12, H * 0.68); g.fill()
        g.fillStyle = '#3a8a3a'; g.fillRect(cx - 6, H * 0.64, 12, 4)
      })
      break
    }
    case 'lacticSoda': {
      // (the cultured soda's can: white with blue polka dots, a wave of blue, its name)
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H)
      g.fillStyle = '#3a6ac8'
      for (let r = 0; r < 7; r++) for (let k = 0; k < 18; k++) { g.beginPath(); g.arc(k * 30 + (r % 2) * 15, r * 38 + 10, 6, 0, Math.PI * 2); g.fill() }
      g.fillStyle = '#ffffff'; g.fillRect(0, H * 0.32, W, H * 0.4)
      face((cx) => {
        htext('乳酸菌', cx, H * 0.43, 34, '#1f4aa0', JP)
        htext('ソーダ', cx, H * 0.62, 30, '#2a5ab0', JP)
      })
      break
    }
    case 'umeshu': {
      g.fillStyle = '#f2e6c8'; g.fillRect(0, 0, W, H)
      face((cx) => {
        // (a plum blossom: five round petals in deep red)
        g.fillStyle = '#b8263a'
        for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5; g.beginPath(); g.arc(cx + 40 + Math.cos(a) * 14, H * 0.3 + Math.sin(a) * 14, 10, 0, Math.PI * 2); g.fill() }
        g.fillStyle = '#f2d27a'; g.beginPath(); g.arc(cx + 40, H * 0.3, 5, 0, Math.PI * 2); g.fill()
        vtext('梅酒', cx - 20, H * 0.5, 62, '#7a1a2a')
      })
      break
    }
    case 'appleJuice': {
      pack('#fbf6ea', '#c8302a', (cx) => {
        htext('りんご', cx, H * 0.14, 30, '#c8302a', JP)
        // (a red apple, its shine, its stem and a leaf)
        const ay = H * 0.47
        g.fillStyle = '#d8352a'; g.beginPath(); g.ellipse(cx - 13, ay, 30, 34, 0, 0, Math.PI * 2); g.ellipse(cx + 13, ay, 30, 34, 0, 0, Math.PI * 2); g.fill()
        g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(cx - 20, ay - 14, 7, 11, -0.5, 0, Math.PI * 2); g.fill()
        g.strokeStyle = '#6a3a14'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, ay - 30); g.quadraticCurveTo(cx + 2, ay - 42, cx + 6, ay - 48); g.stroke()
        g.fillStyle = '#4a8a3a'; g.beginPath(); g.ellipse(cx + 18, ay - 42, 13, 6, -0.5, 0, Math.PI * 2); g.fill()
        htext('果汁100%', cx, H * 0.77, 16, '#5a1a10', '"Noto Sans TC", sans-serif', 700)
      }, (cx) => {
        for (let k = 0; k < 3; k++) { g.fillStyle = '#d8352a'; g.beginPath(); g.arc(cx, H * (0.22 + k * 0.2), 10, 0, Math.PI * 2); g.fill(); g.fillStyle = '#4a8a3a'; g.beginPath(); g.ellipse(cx + 6, H * (0.22 + k * 0.2) - 12, 5, 2.5, -0.5, 0, Math.PI * 2); g.fill() }
      })
      break
    }
    case 'barleyTea': {
      pack('#efe2bf', '#6a3a14', (cx) => {
        vtext('麦茶', cx - 24, H * 0.42, 48, '#4a2a10')
        // (an ear of barley, its awns up)
        g.strokeStyle = '#8a6a2a'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(cx + 26, H * 0.78); g.quadraticCurveTo(cx + 30, H * 0.5, cx + 24, H * 0.2); g.stroke()
        for (let k = 0; k < 7; k++) {
          const y = H * (0.24 + k * 0.06), sd = k % 2 ? 1 : -1
          g.fillStyle = '#c89a3a'; g.beginPath(); g.ellipse(cx + 26 + sd * 7, y, 6, 9, sd * 0.5, 0, Math.PI * 2); g.fill()
          g.strokeStyle = '#b08a3a'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx + 26 + sd * 9, y - 6); g.lineTo(cx + 26 + sd * 20, y - 26); g.stroke()
        }
        htext('香ばしい', cx, H * 0.79, 15, '#6a3a14', '"Noto Sans TC", sans-serif', 700)
      }, (cx) => {
        vtext('麦茶', cx, H * 0.42, 30, '#6a3a14')
      })
      break
    }
    case 'vegJuice': {
      pack('#f8f2e2', '#2e7d3a', (cx) => {
        htext('野菜', cx, H * 0.14, 32, '#2e7d3a', JP)
        // (a carrot and a tomato, their leaves)
        g.fillStyle = '#e8701a'; g.beginPath(); g.moveTo(cx - 34, H * 0.36); g.lineTo(cx - 6, H * 0.36); g.lineTo(cx - 20, H * 0.7); g.closePath(); g.fill()
        g.strokeStyle = '#c85a12'; g.lineWidth = 1.5
        for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(cx - 30 + k * 2, H * (0.36 + k * 0.08)); g.lineTo(cx - 22 + k, H * (0.36 + k * 0.08)); g.stroke() }
        g.fillStyle = '#4a8a3a'
        for (const a of [-0.5, 0, 0.5]) { g.beginPath(); g.ellipse(cx - 20 + a * 10, H * 0.31, 4, 11, a, 0, Math.PI * 2); g.fill() }
        g.fillStyle = '#d8352a'; g.beginPath(); g.arc(cx + 20, H * 0.55, 22, 0, Math.PI * 2); g.fill()
        g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(cx + 13, H * 0.5, 5, 8, -0.5, 0, Math.PI * 2); g.fill()
        g.fillStyle = '#3a7a2a'
        for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; g.beginPath(); g.ellipse(cx + 20 + Math.cos(a) * 6, H * 0.47 + Math.sin(a) * 3, 6, 2.5, a, 0, Math.PI * 2); g.fill() }
        htext('ジュース', cx, H * 0.8, 15, '#2e5a2a', '"Noto Sans TC", sans-serif', 700)
      }, (cx) => {
        g.fillStyle = '#e8701a'; g.beginPath(); g.moveTo(cx - 8, H * 0.2); g.lineTo(cx + 8, H * 0.2); g.lineTo(cx, H * 0.4); g.closePath(); g.fill()
        g.fillStyle = '#d8352a'; g.beginPath(); g.arc(cx, H * 0.6, 12, 0, Math.PI * 2); g.fill()
      })
      break
    }
    case 'yakult': {
      g.fillStyle = '#f8f2e4'; g.fillRect(0, 0, W, H)
      g.fillStyle = '#d42a24'; g.fillRect(0, H * 0.3, W, H * 0.4)
      face((cx) => htext('乳酸菌', cx, H / 2, 46, '#ffffff', JP))
      break
    }
    default: {
      g.fillStyle = lbl[0]; g.fillRect(0, 0, W, H)
      face((cx) => htext(lbl[2], cx, H / 2, 40, lbl[1], JP))
    }
  }
}
/**
 * The drinks' looks, shared by them all, so a fridge's eighty bottles are a handful of draws (each drink's own glass, label, drink and cap
 * had been a material each: some fifty draws for the two fridges). Every label in one picture (LABEL_ATLAS, a cell each, a margin of itself
 * round it), and how each is finished (its clear coat, how rough, how metallic: a can's printed aluminium, the sake's washi) in a little
 * picture laid the same way (LABEL_FINISH, a pixel a cell); the glass and the PET one see-through material, each drink's tint and how clear
 * it is in its vertices; the drink inside likewise; the caps, foils and rims one toon material, their colours in their vertices; the cans'
 * aluminium one. In a fridge's light, a glowing twin of each.
 */
export const CELL_W = LABEL_W + 16, CELL_H = LABEL_H + 16, ATLAS_COLS = 4, ATLAS_ROWS = Math.ceil(DRINKS.length / 4)
export const cellOf = (id: DrinkId) => { const i = DRINKS.findIndex((d) => d.id === id); return { c: i % ATLAS_COLS, r: Math.floor(i / ATLAS_COLS) } }
export const LABEL_ATLAS = (() => {
  const t = canvasTex(CELL_W * ATLAS_COLS, CELL_H * ATLAS_ROWS, (g) => {
    for (const d of DRINKS) {
      const { c, r } = cellOf(d.id), x0 = c * CELL_W, y0 = r * CELL_H
      g.save()
      g.beginPath(); g.rect(x0 + 8, y0 + 8, LABEL_W, LABEL_H); g.clip()
      g.translate(x0 + 8, y0 + 8)
      drawLabel(g, d.id, d.label)
      g.restore()
      // (its margin: across, the other edge (it wraps round the bottle); up and down, its own edge drawn out)
      const cv = g.canvas
      g.drawImage(cv, x0 + LABEL_W, y0 + 8, 8, LABEL_H, x0, y0 + 8, 8, LABEL_H)
      g.drawImage(cv, x0 + 8, y0 + 8, 8, LABEL_H, x0 + 8 + LABEL_W, y0 + 8, 8, LABEL_H)
      g.drawImage(cv, x0, y0 + 8, CELL_W, 1, x0, y0, CELL_W, 8)
      g.drawImage(cv, x0, y0 + 7 + LABEL_H, CELL_W, 1, x0, y0 + 8 + LABEL_H, CELL_W, 8)
    }
  })
  // (its fine print kept: every label in a picture 2112 wide was brought down to the cap's 1024, each label a quarter of itself, blurred
  // (the owner's, 2026-11-10: the packaging looked cheap); allowed twice the cap, about as drawn)
  if (t) { t.anisotropy = 4; t.userData.capScale = 2 }
  return t
})()
const LABEL_FINISH = (() => {
  const data = new Uint8Array(ATLAS_COLS * ATLAS_ROWS * 4)
  for (const d of DRINKS) {
    const { c, r } = cellOf(d.id), kind = KIND_OF[d.id]
    // (red: its clear coat; green: how rough; blue: how metallic, as three's maps read them)
    // (the owner's, 2026-11-10: a can's print is on aluminium (metal 0.85, roughness 0.28); a bottle's label a little matt (0.4))
    // (a paper pack's printed board half matt, a touch of its foil's sheen (roughness 0.5, metal 0.05))
    const [coat, rough, metal] = kind === 'can' ? [0.3, 0.28, 0.85] : kind === 'pack' ? [0, 0.5, 0.05] : [0.25, 0.4, 0]
    data.set([coat * 255, rough * 255, metal * 255, 255], ((ATLAS_ROWS - 1 - r) * ATLAS_COLS + c) * 4)
  }
  const t = new THREE.DataTexture(data, ATLAS_COLS, ATLAS_ROWS)
  t.magFilter = t.minFilter = THREE.NearestFilter
  t.needsUpdate = true
  return t
})()
/** a drink's label shape, its UVs into its cell of the atlas (made once a shape a drink) */
const LABEL_GEO = new Map<string, THREE.BufferGeometry>()
export function labelGeo(g: THREE.BufferGeometry, id: DrinkId) {
  const key = `${g.uuid}|${id}`
  let out = LABEL_GEO.get(key)
  if (!out) {
    out = g.clone()
    const uv = out.attributes.uv as THREE.BufferAttribute, { c, r } = cellOf(id)
    const AW = CELL_W * ATLAS_COLS, AH = CELL_H * ATLAS_ROWS
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (c * CELL_W + 8 + uv.getX(i) * LABEL_W) / AW, 1 - (r * CELL_H + 8 + (1 - uv.getY(i)) * LABEL_H) / AH)
    LABEL_GEO.set(key, out)
  }
  return out
}
/** a shape with a colour (and, given, how clear it is) in its every vertex, for a material shared by many colours (made once a colour) */
const TINTED = new Map<string, THREE.BufferGeometry>()
export function tinted(g: THREE.BufferGeometry, hex: string, alpha?: number) {
  const key = `${g.uuid}|${hex}|${alpha ?? ''}`
  let out = TINTED.get(key)
  if (!out) {
    out = g.clone()
    const c = new THREE.Color(hex), n = out.attributes.position.count, k = alpha === undefined ? 3 : 4, a = new Float32Array(n * k)
    for (let i = 0; i < n; i++) { a[i * k] = c.r; a[i * k + 1] = c.g; a[i * k + 2] = c.b; if (k === 4) a[i * k + 3] = alpha! }
    out.setAttribute('color', new THREE.BufferAttribute(a, k))
    TINTED.set(key, out)
  }
  return out
}
/** a glow the colour of what's glowing: its emissive times its vertices' colour */
function glowByVertex<M extends THREE.Material>(m: M, key: string) {
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('vec3 totalEmissiveRadiance = emissive;', 'vec3 totalEmissiveRadiance = emissive * vColor.rgb;') }
  m.customProgramCacheKey = () => key
  return m
}
export const LABEL_MAT = new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: LABEL_ATLAS, roughnessMap: LABEL_FINISH, metalnessMap: LABEL_FINISH, clearcoatMap: LABEL_FINISH,
  roughness: 1, metalness: 1, clearcoat: 1 })
const LABEL_LIT = LABEL_MAT.clone()
LABEL_LIT.emissive = new THREE.Color('#ffffff'); LABEL_LIT.emissiveMap = LABEL_ATLAS; LABEL_LIT.emissiveIntensity = 0.3
export const GLASS = new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.06, clearcoat: 0.95, clearcoatRoughness: 0.04, transparent: true,
  depthWrite: false, specularIntensity: 1 })
export const CAN = new THREE.MeshStandardMaterial({ color: '#d4d8dc', metalness: 0.88, roughness: 0.28 })
reflectStudio(GLASS, CAN, LABEL_MAT, LABEL_LIT)
/** the drink in each bottle: its colour and how clear in its vertices, lit a touch from within so it glows in the fridge; smooth, the room's
 * light caught on its top (the owner's: a gleam on the drink's surface inside) */
export const FILL = glowByVertex(new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.06, transparent: true, depthWrite: false,
  emissive: '#ffffff', emissiveIntensity: 0.12 }), 'bottle-fill')
/** the caps, foils, collars and rims: their colours in their vertices */
export const PARTS = new THREE.MeshToonMaterial({ color: '#ffffff', vertexColors: true })
/**
 * The shelf's bottles and cans (DrinkBottleLite), glossy (the owner's: they were flat and dead): their colours in their vertices shaded round
 * them as a turned bottle under a strip light is, so eight sides read as thirty-two: dark at the edges, a white gleam on the left (the tube's
 * reflection), the colour full in the middle, a second softer gleam on the right; the studio's room in them. Their labels the same way.
 */
export const SHELF_PARTS = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.22, metalness: 0.25 })
export const SHELF_LABEL = LABEL_LIT.clone()
SHELF_LABEL.vertexColors = true
/**
 * The shelf's glass (the owner's, 2026-11-10: they were solid colours, plastic): each bottle's drink and its glass over it, see-through, their
 * tints and how clear in their vertices, very smooth, the studio's light in it (no transmission: one material using it has three draw the
 * whole room twice a frame); the gleams down each (shadedGlass) whiter and more solid. One draw for a fridge's every bottle
 */
export const SHELF_GLASS = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.08, metalness: 0, transparent: true, depthWrite: false,
  emissive: '#ffffff', emissiveIntensity: 0.03, envMapIntensity: 0.3 })
SHELF_GLASS.name = 'ShelfGlass'
/** the shelf's cans' tops: bright aluminium, a little light of the fridge's own on them */
export const SHELF_METAL = new THREE.MeshStandardMaterial({ color: '#cfd4d9', metalness: 0.88, roughness: 0.28, emissive: '#cfd4d9', emissiveIntensity: 0.16 })
reflectStudio(SHELF_PARTS, SHELF_LABEL, SHELF_GLASS, SHELF_METAL, FILL)
/** how a point round a bottle is lit, by which way it faces (in the bottle's own frame, its front (to the door) +x, the viewer's left +z):
 * [how much of its colour, how much white gleam] */
function roundLight(x: number, z: number): [number, number] {
  const r = Math.hypot(x, z)
  if (r < 1e-5) return [1, 0]
  const nx = x / r, nz = z / r
  const front = Math.max(0, nx)
  const key = Math.max(0, nx * 0.45 + nz * 0.89), fill = Math.max(0, nx * 0.6 - nz * 0.8)
  return [0.5 + 0.5 * front, Math.pow(key, 10) * 0.85 + Math.pow(fill, 12) * 0.3]
}
const SHADED = new Map<string, THREE.BufferGeometry>()
/** a geometry's colour, shaded round it (roundLight) */
export function shaded(g: THREE.BufferGeometry, hex: string, flat = false) {
  const key = `${g.uuid}|${hex}|${flat}`
  let out = SHADED.get(key)
  if (!out) {
    out = g.clone()
    // (`flat`: a box's (the paper pack's), each side lit by the way it faces, all of it alike, not round it point by point)
    const c = new THREE.Color(hex), pos = out.attributes.position, a = new Float32Array(pos.count * 3), src = flat ? out.attributes.normal : pos
    for (let i = 0; i < pos.count; i++) {
      const [k, w] = roundLight(src.getX(i), src.getZ(i))
      a[i * 3] = Math.min(1, c.r * k + w); a[i * 3 + 1] = Math.min(1, c.g * k + w); a[i * 3 + 2] = Math.min(1, c.b * k + w)
    }
    out.setAttribute('color', new THREE.BufferAttribute(a, 3))
    SHADED.set(key, out)
  }
  return out
}
/** glass shaded round it as `shaded` is, see-through: its tint and how clear (`alpha`) in its vertices, the gleams whiter and more solid */
const GLASSY = new Map<string, THREE.BufferGeometry>()
export function shadedGlass(g: THREE.BufferGeometry, hex: string, alpha: number) {
  const key = `${g.uuid}|${hex}|${alpha}`
  let out = GLASSY.get(key)
  if (!out) {
    out = g.clone()
    const c = new THREE.Color(hex), pos = out.attributes.position, a = new Float32Array(pos.count * 4)
    for (let i = 0; i < pos.count; i++) {
      const [k, w] = roundLight(pos.getX(i), pos.getZ(i))
      const s = 0.72 + 0.28 * k
      a[i * 4] = Math.min(1, c.r * s + w); a[i * 4 + 1] = Math.min(1, c.g * s + w); a[i * 4 + 2] = Math.min(1, c.b * s + w)
      a[i * 4 + 3] = Math.min(1, alpha + w * 0.6)
    }
    out.setAttribute('color', new THREE.BufferAttribute(a, 4))
    GLASSY.set(key, out)
  }
  return out
}
/** how full each shelf bottle is (of its height), as the full bottles' drinks are */
const LITE_FULL = { beer: 0.8, sake: 0.8, pet500: 0.9, pet: 0.88, milk: 0.86, ramune: 0.62 }
/**
 * What's in a shelf bottle: its own glass's shape (LITE_PTS) drawn in a millimetre and a half all round, filled to how full it is, a flat top
 * there; its eight sides at the glass's own angles, so each of its faces lies under one of the glass's (the owner's, 2026-11-10: the full
 * bottle's drink, another shape, its shoulder rounder than the plain glass's, showed out through it at the shoulder)
 */
const LITE_DRINK = new Map<string, THREE.BufferGeometry>()
function liteFill(shaped: keyof typeof LITE_PTS) {
  const hit = LITE_DRINK.get(shaped)
  if (hit) return hit
  const pts = LITE_PTS[shaped], top = pts[pts.length - 1][1] * LITE_FULL[shaped], out: [number, number][] = []
  const IN = 0.0015
  for (let i = 0; i < pts.length; i++) {
    const [r, y] = pts[i]
    if (y <= top) { out.push([Math.max(0.002, r - IN), Math.max(IN, y)]); continue }
    const [r0, y0] = pts[i - 1]
    out.push([Math.max(0.002, r0 + ((top - y0) / (y - y0)) * (r - r0) - IN), top])
    break
  }
  out.push([0.0005, top])
  const g = liteBody(out)
  LITE_DRINK.set(shaped, g)
  return g
}
/** a shelf bottle's drink, inside its glass to as full as it's filled, its colour and how clear in its vertices */
export function liteDrink(shaped: 'beer' | 'sake' | 'pet' | 'pet500' | 'milk' | 'ramune', id: DrinkId) {
  const d = DRINKS.find((x) => x.id === id)!
  const g = liteFill(shaped)
  // (a clear drink all but clear: the glass's colour and the light through it are what's seen; a milk or a tea solid)
  return tinted(g, id === 'ramune' ? '#c6ecf6' : id === 'sake' ? '#f2ecd4' : d.color,
    id === 'milk' ? 1 : id === 'ramune' || id === 'sake' || soju(id) || id === 'sports' ? 0.16 : 0.88)
}
/**
 * A can's top (the owner's, 2026-11-10): its rolled rim, the lid pressed down inside it, flat, and, lying on it, the ring pull (its finger
 * hole and its rivet); all aluminium. Turned from a profile (from its outside up over the rim and in: its faces up and out), 12 round, open
 * at the very middle under the pull's rivet (no fan of triangles crowding to a point there)
 */
export const CAN_LID = new THREE.LatheGeometry([[0.018, 0.0895], [0.0186, 0.0905], [0.0187, 0.0928], [0.0181, 0.0935], [0.0174, 0.0929], [0.0168, 0.0915],
  [0.0164, 0.0909], [0.0045, 0.0911]].map(([r, y]) => new THREE.Vector2(r, y)), 12)
CAN_LID.computeVertexNormals()
/** the shelf's cans' top, 8 round: the same, its shoulder run down to the edge of their print, which is their whole body */
// (its shoulder and its rim's roll only, the lid inside it the card laid in it, its pull and scored ring in the picture (item 65b): 3 rings
// round, 48 faces, where it was 8 down into the lid and in to the rivet, 128)
export const LITE_CAN_LID = new THREE.LatheGeometry([[0.0214, 0.0884], [0.0189, 0.0912], [0.0187, 0.0928], [0.0181, 0.0935]].map(([r, y]) => new THREE.Vector2(r, y)), 8)
LITE_CAN_LID.computeVertexNormals()
/** a can behind the front one: its lid in four rings, six round (36 faces against 128) */
export const LITE_CAN_LID_FAR = new THREE.LatheGeometry([[0.0214, 0.0884], [0.0187, 0.0928], [0.0181, 0.0935]].map(([r, y]) => new THREE.Vector2(r, y)), 6)
LITE_CAN_LID_FAR.computeVertexNormals()
/** a little bottle behind the front one: its body six round in five rings; and every little bottle's lid, its side and its top turned in to
 * a small ring (it was a cylinder whose top was a fan of triangles into its middle) */
export const SMALL_FAR = new THREE.LatheGeometry([[0, 0], [0.016, 0], [0.017, 0.02], [0.013, 0.036], [0.015, 0.072], [0, 0.072]].map(([x, y]) => new THREE.Vector2(x, y - 0.036)), 6)
const smallLid = (seg: number) => new THREE.LatheGeometry([new THREE.Vector2(0.0155, -0.002), new THREE.Vector2(0.0155, 0.002)], seg)
export const SMALL_LID = smallLid(8), SMALL_LID_FAR = smallLid(6)
export const CAN_TAB = (() => {
  // (the ring pull: a rounded tongue with its finger hole, lying flat, its rivet end over the lid's middle)
  const s = new THREE.Shape()
  s.absarc(0, 0.0045, 0.0042, 0, Math.PI, false)
  s.lineTo(-0.0042, -0.0055)
  s.absarc(0, -0.0055, 0.0042, Math.PI, Math.PI * 2, false)
  s.lineTo(0.0042, 0.0045)
  const hole = new THREE.Path()
  hole.absarc(0, -0.0052, 0.0024, 0, Math.PI * 2, true)
  s.holes.push(hole)
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.0006, bevelEnabled: false, curveSegments: 4 })
  g.rotateX(-Math.PI / 2)
  return g
})()
/**
 * A paper pack's body (the owner's, 2026-11-10: a Japanese brick pack, 4 x 3 x 8 cm made, drawn a quarter bigger): a brick, its upright
 * edges chamfered; its print round it as a can's label is round a can (u from the middle of a narrow side, round to its wide front at a
 * quarter, where a label's front is), its top and its foot the print's plain ground (a strip at the very top of its picture); its front +x
 * (turned to the room with the rest), `w` wide, `d` deep, `h` tall. Its top and foot ladders of triangles across it (no fan to a point)
 */
function packBody(w: number, d: number, h: number, c: number) {
  const P: [number, number][] = [[0, w / 2], [d / 2 - c, w / 2], [d / 2, w / 2 - c], [d / 2, -(w / 2 - c)], [d / 2 - c, -w / 2], [-(d / 2 - c), -w / 2],
    [-d / 2, -(w / 2 - c)], [-d / 2, w / 2 - c], [-(d / 2 - c), w / 2], [0, w / 2]]
  const L = [0]
  for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]))
  const tot = L[L.length - 1]
  const pos: number[] = [], nrm: number[] = [], uv: number[] = []
  const vert = (x: number, y: number, z: number, n: [number, number, number], u: number, v: number) => { pos.push(x, y, z); nrm.push(...n); uv.push(u, v) }
  for (let i = 0; i < P.length - 1; i++) {
    const [x0, z0] = P[i], [x1, z1] = P[i + 1]
    const len = Math.hypot(x1 - x0, z1 - z0) || 1
    const n: [number, number, number] = [-(z1 - z0) / len, 0, (x1 - x0) / len]
    const u0 = L[i] / tot, u1 = L[i + 1] / tot
    vert(x0, 0, z0, n, u0, 0); vert(x1, 0, z1, n, u1, 0); vert(x1, h, z1, n, u1, 1)
    vert(x0, 0, z0, n, u0, 0); vert(x1, h, z1, n, u1, 1); vert(x0, h, z0, n, u0, 1)
  }
  // (the top and the foot: across it in rungs, the ground's colour)
  const RUNGS = [[8, 1, 2], [8, 2, 7], [7, 2, 3], [7, 3, 6], [6, 3, 4], [6, 4, 5]]
  for (const [a, b, e] of RUNGS) for (const k of [a, b, e]) vert(P[k][0], h, P[k][1], [0, 1, 0], 0.5, 0.99)
  for (const [a, b, e] of RUNGS) for (const k of [a, e, b]) vert(P[k][0], 0, P[k][1], [0, -1, 0], 0.5, 0.99)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  return g
}
/** a paper pack: its body, the sealed seam across its top (a fin along its width), the silver foil disc of its straw hole near a corner of
 * its top, and the straw in its clear wrapper stuck to its back, aslant (17 degrees) */
export const PACK = (() => {
  const w = 0.04, d = 0.03, h = 0.08
  return {
    h, w, d, body: packBody(w, d, h, 0.0022),
    seam: new THREE.BoxGeometry(0.0013, 0.0034, w - 0.002).translate(0, 0.0017, 0),
    hole: new THREE.CylinderGeometry(0.0034, 0.0034, 0.0006, 10), holeAt: [d / 4, h + 0.0003, w / 4] as [number, number, number],
    straw: new THREE.CylinderGeometry(0.0013, 0.0013, 0.064, 6), wrap: new THREE.BoxGeometry(0.0028, 0.07, 0.0062),
    strawAt: [-d / 2 - 0.0017, h * 0.47, 0] as [number, number, number], strawTilt: 0.3,
  }
})()
/** a label's band shaded round it the same way (white shaded: it multiplies the label's picture; the gleam lifts it a little) */
export function shadedLabel(g: THREE.BufferGeometry, id: DrinkId, flat = false) {
  return shaded(labelGeo(g, id), '#ffffff', flat)
}
/** the ramune's marble: clear glass catching the light */
export const MARBLE = new THREE.MeshPhysicalMaterial({ color: '#e8f6fa', roughness: 0.02, clearcoat: 1, transparent: true, opacity: 0.55, specularIntensity: 1 })
/** dew on a cold bottle: little beads of water scattered over it, a few running down (a picture of them, laid over the glass) */
export const DEW = (() => {
  const t = canvasTex(256, 256, (g) => {
    g.clearRect(0, 0, 256, 256)
    let seed = 13
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let k = 0; k < 420; k++) {
      const x = rnd() * 256, y = rnd() * 256, r = 0.6 + rnd() * rnd() * 3.2
      const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r)
      gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.6, 'rgba(230,245,255,0.35)'); gr.addColorStop(1, 'rgba(200,230,255,0)')
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill()
    }
    // (a few that have run down, leaving a trail)
    for (let k = 0; k < 9; k++) {
      const x = rnd() * 256, y = rnd() * 120, l = 40 + rnd() * 90
      g.strokeStyle = 'rgba(235,248,255,0.4)'; g.lineWidth = 1.6
      g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 2, y + l / 3, x - 2, y + (l * 2) / 3, x + 1, y + l); g.stroke()
      g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(x + 1, y + l, 2.4, 0, Math.PI * 2); g.fill()
    }
  })
  if (t) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 1) }
  return new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, opacity: 0.85 })
})()
