import { shopPicture } from '@/scene/render/flatGate'
import * as THREE from 'three'
import { reflectStudio } from '@/scene/render/studio'
import { forPhone } from '@/shops/grill/kitchen/ware'
import { ALONG, FLOOR_NEAR, GRILL_COUNTERS, LAY, toGrillScene } from '@/shops/grill/bar'
import { COOK_TABLE } from './kitchen'

/**
 * The tray's planed cedar: three boards with the grain running along them, drawn as wavering growth lines that
 * bunch round a knot or two, a dark seam between boards, and a few darker stains where wet food has sat. Mapped
 * in the tray's own units (one texture across 1.6 x 1.6).
 */
export const TRAY_WOOD = (() => {
  if (typeof document === 'undefined') return null
  const S = 1024
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  let seed = 3
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  g.fillStyle = '#c4935a'
  g.fillRect(0, 0, S, S)
  const boards = 3
  const bh = S / boards
  for (let b = 0; b < boards; b++) {
    const y0 = b * bh
    // each board its own shade
    g.fillStyle = `rgba(${150 + rnd() * 40}, ${100 + rnd() * 25}, ${55 + rnd() * 20}, 0.35)`
    g.fillRect(0, y0, S, bh)
    // a knot or two that the grain flows round
    const knots = Array.from({ length: 1 + Math.floor(rnd() * 2) }, () => ({ x: rnd() * S, y: y0 + bh * (0.25 + rnd() * 0.5),
      r: 10 + rnd() * 14 }))
    for (let k = 0; k < 46; k++) {
      const base = y0 + (k / 46) * bh
      g.strokeStyle = `rgba(${90 + rnd() * 30}, ${55 + rnd() * 15}, 25, ${0.18 + rnd() * 0.32})`
      g.lineWidth = 0.8 + rnd() * 2.2
      g.beginPath()
      for (let x = 0; x <= S; x += 8) {
        let y = base + Math.sin(x * 0.006 + k * 0.7 + b) * 5 + Math.sin(x * 0.021 + k) * 1.5
        for (const kn of knots) {
          const dx = x - kn.x
          const dy = y - kn.y
          const d2 = dx * dx + dy * dy
          y += (dy / (Math.sqrt(d2) + 1)) * kn.r * 2.2 * Math.exp(-d2 / (kn.r * kn.r * 9))
        }
        if (x === 0) g.moveTo(x, y)
        else g.lineTo(x, y)
      }
      g.stroke()
    }
    for (const kn of knots) {
      const grad = g.createRadialGradient(kn.x, kn.y, 1, kn.x, kn.y, kn.r)
      grad.addColorStop(0, 'rgba(70, 38, 15, 0.95)')
      grad.addColorStop(0.6, 'rgba(110, 62, 28, 0.7)')
      grad.addColorStop(1, 'rgba(110, 62, 28, 0)')
      g.fillStyle = grad
      g.beginPath()
      g.ellipse(kn.x, kn.y, kn.r * 1.5, kn.r, 0, 0, Math.PI * 2)
      g.fill()
    }
    // the seam to the next board
    g.fillStyle = 'rgba(55, 32, 14, 0.75)'
    g.fillRect(0, y0 + bh - 2, S, 3)
    g.fillStyle = 'rgba(255, 230, 190, 0.25)'
    g.fillRect(0, y0 + bh + 1, S, 2)
  }
  // fine pores along the grain
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(80, 45, 20, ${0.15 + rnd() * 0.25})`
    g.fillRect(rnd() * S, rnd() * S, 2 + rnd() * 6, 1)
  }
  // stains where wet food has rested
  for (let i = 0; i < 5; i++) {
    const x = rnd() * S
    const y = rnd() * S
    const r = 30 + rnd() * 60
    const grad = g.createRadialGradient(x, y, r * 0.2, x, y, r)
    grad.addColorStop(0, 'rgba(90, 55, 25, 0.22)')
    grad.addColorStop(1, 'rgba(90, 55, 25, 0)')
    g.fillStyle = grad
    g.fillRect(x - r, y - r, r * 2, r * 2)
  }
  const t = new THREE.CanvasTexture(forPhone(c))
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(1 / 1.6, 1 / 1.6)
  t.anisotropy = 8
  return t
})()
/** a wood texture of blender/woodtex.py's, tiled every `w` x `h` of the table's units */
function woodTex(file: string, w: number, h: number) {
  if (typeof document === 'undefined') return null
  // (not fetched on a phone, which draws no 3D (scene/flatGate))
  const t = shopPicture(file)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(1 / w, 1 / h)
  t.anisotropy = 8
  return t
}
/** the cook's table's top: keyaki planks, cathedral figure, a tile every 1.6 */
export const COOK_TABLE_WOOD = woodTex('keyaki_top.jpg', 1.6, 1.6)
/** its body: cedar boards standing in framed panels, a panel every 0.6 across, one the body's height */
export const COOK_PANEL_WOOD = woodTex('cedar_panel.jpg', 1, 1)
/** the bar's base: boards standing side by side, straight grain and flat-sawn in turn, their grain clear (the owner: it didn't show) */
export const BAR_BASE_WOOD = woodTex('bar_base.jpg', 1, 1)
/** the cook table's dark kick round its foot: as high as the notch steps, so none shows over their backs */
export const KICK_H = 0.09
/** the cook table's top: how thick (its underside this far under the top), how far its edges are rounded over (up and down), and how far
 * the round reaches in from its outer face (item 379, docs/MODELING.md's 造型感: a thick slab, its edges rounded right over, as a chunky made
 * thing reads; it was 8 cm, its edges eased 1.5 cm) */
export const TABLE_T = 0.1
export const TABLE_ROUND = 0.032
export const TABLE_OUT = 0.034
/** below its top: honed white marble with soft grey veining (blender/marbletex.py), a tile 1.2 across (the owner had it dark a while, and
 * wanted it white again) */
export const COOK_MARBLE = woodTex('marble_panel.jpg', 1, 1)
/** a box whose sides carry the panel texture at its true size: each side's u stretched to how wide it is (a panel every `tile` across), v
 * the whole height */
export function panelBox(w: number, h: number, d: number, tile = 0.6) {
  const g = new THREE.BoxGeometry(w, h, d)
  const uv = g.attributes.uv as THREE.BufferAttribute
  // (the faces in order +x, -x, +y, -y, +z, -z, four corners each: the x faces are d wide, the z faces w)
  for (let f = 0; f < 6; f++) {
    const across = f < 2 ? d : f >= 4 ? w : 0
    for (let k = 0; k < 4; k++) uv.setX(f * 4 + k, uv.getX(f * 4 + k) * (across ? across / tile : 1))
  }
  uv.needsUpdate = true
  return g
}
/**
 * The kitchen's floor, inside the counters: from the first counter's floor's edge (lay) and the side counter's (along)
 * to the side counter's near end and the first counter's far end, so it meets the customers' floors without a gap or
 * an overlap (worked out from the counters, in the scene's frame).
 */
export const KITCHEN_FLOOR = (() => {
  const [c0, c1] = GRILL_COUNTERS
  const lay0 = toGrillScene(c0.at.clone().addScaledVector(c0.lay, FLOOR_NEAR)).dot(LAY)
  const along0 = c1 ? toGrillScene(c1.at.clone().addScaledVector(c1.lay, FLOOR_NEAR)).dot(ALONG) : COOK_TABLE.along[0] - 0.4
  const along1 = toGrillScene(c0.at.clone().addScaledVector(c0.along, c0.length / 2 + 0.15)).dot(ALONG)
  const lay1 = c1 ? toGrillScene(c1.at.clone().addScaledVector(c1.along, -c1.length / 2 - 0.35)).dot(LAY) : COOK_TABLE.lay[1] + 0.9
  return { lay: [lay0, lay1], along: [along0, along1] }
})()
/**
 * The cook's table's top, in one piece round its bay: a thick plank top with its edges rounded over (面取り), the
 * grain running on unbroken, its ink outline round the whole shape (no seams where the parts under it meet).
 */
/** a closed outline through these corners, each rounded off to its radius (a curve cut in from both its sides) */
export function roundedShape(pts: [number, number][], radii: number[]) {
  const sh = new THREE.Shape()
  pts.forEach(([x, y], k) => {
    const [px, py] = pts[(k + pts.length - 1) % pts.length], [nx, ny] = pts[(k + 1) % pts.length]
    const dp = Math.hypot(px - x, py - y), dn = Math.hypot(nx - x, ny - y)
    const r = Math.min(radii[k], dp / 2, dn / 2)
    // (a corner left square: the point itself, no arc of nothing (its bevel's way out would be no way at all))
    if (r < 1e-6) {
      if (k) sh.lineTo(x, y)
      else sh.moveTo(x, y)
      return
    }
    const a: [number, number] = [x + (px - x) / dp * r, y + (py - y) / dp * r]
    const b: [number, number] = [x + (nx - x) / dn * r, y + (ny - y) / dn * r]
    if (k) sh.lineTo(a[0], a[1])
    else sh.moveTo(a[0], a[1])
    // (a true quarter circle (the corners are all square): its middle where the offsets of its two ends meet. A quadratic curve bulged a
    // centimetre out past the circle at its middle, and the brass caps made to the circle stood off it at their ends (item 379))
    const cx = a[0] + b[0] - x, cy = a[1] + b[1] - y
    sh.absarc(cx, cy, r, Math.atan2(a[1] - cy, a[0] - cx), Math.atan2(b[1] - cy, b[0] - cx), (a[0] - cx) * (b[1] - cy) - (a[1] - cy) * (b[0] - cx) < 0)
  })
  sh.closePath()
  return sh
}
/**
 * The bar's top as one plank round the corner: each counter's top as a rectangle (along the first counter, across
 * it), the side counter's outer edge squared up with the first's end, joined into an L and given rounded edges.
 */
export const BAR_DEPTH = 0.62
/** the polished brass of the drawers' pulls (real metal, the studio in it), made once */
let barBrass: THREE.MeshStandardMaterial | null = null
export const barBrassOf = () => {
  if (!barBrass) {
    barBrass = new THREE.MeshStandardMaterial({ color: '#c99a40', metalness: 1, roughness: 0.22, envMapIntensity: 1.1 })
    reflectStudio(barBrass)
  }
  return barBrass
}
