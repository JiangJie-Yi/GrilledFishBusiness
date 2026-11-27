import { seigaiha } from './edoPatterns'

/**
 * The four 和風 pictures the owner gave for the shop's mats and table cloths (item 763, the owner's 「這個素材分別幫我美化到各類腳踏墊或是
 * 桌巾，給你發揮」: four strips side by side), each drawn here afresh (no picture of theirs pasted in), whole, on a 2D canvas in the rectangle
 * (x, y, w, h):
 *
 * - `sakuraStream`: cream, pale aqua flowing water (流水) in soft bands across it, pink cherry blossoms in watercolour, a few leaves;
 * - `navyWaves`: navy 青海波 (seigaiha) with cream lines over a gold one, white and pink blossoms gold-edged in a drift across it;
 * - `tealWaves`: turquoise 青海波 in white lines, sprays of white blossom on thin grey-brown twigs;
 * - `goldSakura`: cream, dusky-pink blossoms edged and veined in gold, gold flowing lines, gold leaf scattered in flecks.
 *
 * Each from a seed of its own, the same picture every time. Drawn only: whoever uses one makes its texture (and puts its border round it).
 */
type G = CanvasRenderingContext2D
function chances(seed: number) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}
/**
 * One cherry blossom: five petals round its middle, each broad and notched at its tip, turned `turn`; filled `fill`, edged `edge` (none if
 * not given, `ew` wide), its heart `heart` with a few stamens. `soft`: drawn in two washes, a watercolour's paler edge
 */
export function blossom(g: G, x: number, y: number, r: number, turn: number, o: { fill: string; edge?: string; ew?: number; heart?: string; soft?: boolean }) {
  g.save()
  g.translate(x, y)
  g.rotate(turn)
  const petal = () => {
    g.beginPath()
    g.moveTo(0, 0)
    g.bezierCurveTo(-r * 0.62, -r * 0.22, -r * 0.6, -r * 0.82, -r * 0.16, -r * 0.98)
    g.lineTo(0, -r * 0.84)
    g.lineTo(r * 0.16, -r * 0.98)
    g.bezierCurveTo(r * 0.6, -r * 0.82, r * 0.62, -r * 0.22, 0, 0)
    g.closePath()
  }
  for (let k = 0; k < 5; k++) {
    g.save()
    g.rotate((k / 5) * Math.PI * 2)
    petal()
    if (o.soft) {
      g.globalAlpha = 0.55
      g.fillStyle = o.fill
      g.fill()
      g.globalAlpha = 0.6
      g.scale(0.78, 0.78)
      petal()
      g.fill()
      g.globalAlpha = 1
    } else {
      g.fillStyle = o.fill
      g.fill()
    }
    if (o.edge) { g.strokeStyle = o.edge; g.lineWidth = o.ew ?? Math.max(1, r * 0.06); g.stroke() }
    g.restore()
  }
  if (o.heart) {
    g.fillStyle = o.heart
    g.beginPath(); g.arc(0, 0, r * 0.16, 0, Math.PI * 2); g.fill()
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + 0.2
      g.beginPath(); g.arc(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3, Math.max(0.8, r * 0.045), 0, Math.PI * 2); g.fill()
    }
  }
  g.restore()
}
/** a band of flowing water across (x, y) `w` wide, `yy` down: three soft curves running the same way, each paler and thinner */
function stream(g: G, x: number, y: number, w: number, yy: number, amp: number, band: number, col: string, rnd: () => number) {
  const ph = rnd() * Math.PI * 2, k = (Math.PI * 2) / (w * (0.6 + rnd() * 0.4))
  for (let line = 0; line < 3; line++) {
    g.beginPath()
    for (let i = 0; i <= 64; i++) {
      const px = x + (i / 64) * w, py = y + yy + line * band * 0.42 + Math.sin(px * k + ph + line * 0.5) * amp
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py)
    }
    g.strokeStyle = col
    g.globalAlpha = 0.55 - line * 0.12
    g.lineWidth = band * (0.34 - line * 0.07)
    g.lineCap = 'round'
    g.stroke()
  }
  g.globalAlpha = 1
}

export function sakuraStream(g: G, x: number, y: number, w: number, h: number) {
  const rnd = chances(7631), u = Math.min(w, h)
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip()
  g.fillStyle = '#f5eee0'; g.fillRect(x, y, w, h)
  // (washes of paper's warmth)
  for (let i = 0; i < 18; i++) {
    const cx = x + rnd() * w, cy = y + rnd() * h, r = u * (0.15 + rnd() * 0.25), gr = g.createRadialGradient(cx, cy, 0, cx, cy, r)
    gr.addColorStop(0, 'rgba(236,222,198,0.35)'); gr.addColorStop(1, 'rgba(236,222,198,0)')
    g.fillStyle = gr; g.fillRect(cx - r, cy - r, r * 2, r * 2)
  }
  for (let s = 0; s < 4; s++) stream(g, x, y, w, h * (0.12 + s * 0.26), u * 0.05, u * 0.12, s % 2 ? '#a9d8dc' : '#8ccbd2', rnd)
  // (leaves, then the blossoms over them, in drifts)
  for (let i = 0; i < 14; i++) {
    const lx = x + rnd() * w, ly = y + rnd() * h, L = u * (0.05 + rnd() * 0.04), a = rnd() * Math.PI * 2
    g.save(); g.translate(lx, ly); g.rotate(a)
    g.fillStyle = 'rgba(112,150,110,0.65)'
    g.beginPath(); g.moveTo(-L, 0); g.quadraticCurveTo(0, -L * 0.45, L, 0); g.quadraticCurveTo(0, L * 0.45, -L, 0); g.fill()
    g.restore()
  }
  for (let i = 0; i < 26; i++) {
    const r = u * (0.03 + rnd() * rnd() * 0.07)
    blossom(g, x + rnd() * w, y + rnd() * h, r, rnd() * Math.PI, { fill: rnd() < 0.3 ? '#f7c9d2' : '#f2aebd', heart: '#d8607a', soft: true })
  }
  // (a few petals drifting)
  for (let i = 0; i < 22; i++) {
    const px = x + rnd() * w, py = y + rnd() * h, r = u * (0.008 + rnd() * 0.01)
    g.save(); g.translate(px, py); g.rotate(rnd() * Math.PI * 2)
    g.fillStyle = 'rgba(242,170,186,0.8)'; g.beginPath(); g.ellipse(0, 0, r * 1.4, r, 0, 0, Math.PI * 2); g.fill()
    g.restore()
  }
  g.restore()
}

export function navyWaves(g: G, x: number, y: number, w: number, h: number) {
  const rnd = chances(7632), u = Math.min(w, h)
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip()
  seigaiha(g, x, y, w, h, { bg: '#1b2846', line: '#dcd6c6', lw: Math.max(1, u / 420), unit: u / 3.6, gold: false, rings: 3 })
  // (blossoms in a drift from corner to corner, white and pink, gold-edged; buds by them)
  for (let i = 0; i < 18; i++) {
    const t = rnd(), cx = x + t * w + (rnd() - 0.5) * w * 0.3, cy = y + (1 - t) * h * 0.85 + (rnd() - 0.5) * h * 0.35, r = u * (0.04 + rnd() * 0.05)
    blossom(g, cx, cy, r, rnd() * Math.PI, { fill: rnd() < 0.55 ? '#f6f1e6' : '#f1b5c2', edge: '#c9a55a', ew: Math.max(1, r * 0.05), heart: '#c9a55a' })
  }
  g.restore()
}

export function tealWaves(g: G, x: number, y: number, w: number, h: number) {
  const rnd = chances(7633), u = Math.min(w, h)
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip()
  seigaiha(g, x, y, w, h, { bg: '#4fb3b8', line: '#f4fbfb', lw: Math.max(1.2, u / 300), unit: u / 4.5, gold: false, rings: 3 })
  // (sprays of white blossom on thin twigs)
  for (let b = 0; b < 4; b++) {
    let px = x + rnd() * w, py = y + rnd() * h, a = rnd() * Math.PI * 2
    g.strokeStyle = '#7d6e63'; g.lineWidth = Math.max(1.2, u / 260); g.lineCap = 'round'
    for (let s = 0; s < 6; s++) {
      const L = u * (0.05 + rnd() * 0.05), nx = px + Math.cos(a) * L, ny = py + Math.sin(a) * L
      g.beginPath(); g.moveTo(px, py); g.lineTo(nx, ny); g.stroke()
      blossom(g, nx, ny, u * (0.022 + rnd() * 0.02), rnd() * Math.PI, { fill: '#fbfbf7', edge: '#e7c9cf', ew: 1, heart: '#e39aa8' })
      if (rnd() < 0.6) { g.fillStyle = '#f2c4cc'; g.beginPath(); g.ellipse(nx + L * 0.3, ny - L * 0.2, u * 0.007, u * 0.011, a, 0, Math.PI * 2); g.fill() }
      px = nx; py = ny; a += (rnd() - 0.5) * 1.2
    }
  }
  g.restore()
}

export function goldSakura(g: G, x: number, y: number, w: number, h: number) {
  const rnd = chances(7634), u = Math.min(w, h)
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip()
  g.fillStyle = '#f4ecdc'; g.fillRect(x, y, w, h)
  // (gold flowing lines)
  g.strokeStyle = '#c9a256'; g.lineCap = 'round'
  for (let s = 0; s < 4; s++) {
    const yy = y + h * (0.15 + s * 0.24), ph = rnd() * 6, k = (Math.PI * 2) / (w * 0.8)
    for (let line = 0; line < 2; line++) {
      g.lineWidth = Math.max(1, u / 300) * (line ? 0.7 : 1.2)
      g.beginPath()
      for (let i = 0; i <= 48; i++) {
        const px = x + (i / 48) * w, py = yy + line * u * 0.03 + Math.sin(px * k + ph) * u * 0.04
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py)
      }
      g.stroke()
    }
  }
  // (blossoms, dusky pink, gold-edged, gold-veined)
  for (let i = 0; i < 16; i++) {
    const r = u * (0.045 + rnd() * 0.06), cx = x + rnd() * w, cy = y + rnd() * h
    blossom(g, cx, cy, r, rnd() * Math.PI, { fill: rnd() < 0.5 ? '#d9a0a6' : '#e8b8b6', edge: '#c49a4c', ew: Math.max(1, r * 0.05), heart: '#c49a4c' })
  }
  // (gold leaf scattered)
  for (let i = 0; i < 120; i++) {
    const px = x + rnd() * w, py = y + rnd() * h, s = u * (0.002 + rnd() * rnd() * 0.012)
    g.fillStyle = rnd() < 0.7 ? '#cfa95c' : '#e3c486'
    g.save(); g.translate(px, py); g.rotate(rnd() * 3); g.fillRect(-s, -s * 0.7, s * 2, s * 1.4); g.restore()
  }
  g.restore()
}
