import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { shopPicture } from '@/scene/render/flatGate'
import { signTexture } from '@/scene/props/signFont'

/**
 * The customers' side of the room, behind the aisle: a wall of cream plaster over a dark wooden wainscot, a frieze of
 * seigaiha waves under the beam, prints and hanging scrolls along the plaster, a shelf of sake bottles, crocks and a beckoning cat, and paper
 * pendant lamps hung low over the bar, their warm light painted on it. Seen from behind (the camera swung round),
 * the wall isn't drawn, so it never hides the bar.
 */

export const INK = '#2a1a10'
export const WP = new THREE.Vector3()
export const NORMAL = new THREE.Vector3()
export const WALL_H = 2.3
/** how thick the room's walls are, behind their face */
export const WALL_T = 0.2
/** how far down the shop's base goes under the room's floor, for the wall's thickness to stand on it all the way */
export const BASE_DEPTH = 0.46
export const WAINSCOT = 0.85

/** a canvas texture of the given size, drawn by `draw` */
export function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat = false) {
  // (painted again once the sign font has loaded: signFont)
  return signTexture(w, h, (g) => draw(g), repeat)
}

/** a paper's grain: a tile of fine speckle with short fibres in it, near white, multiplied over a picture (made once) */
let grainTile: HTMLCanvasElement | null = null
export function grain() {
  if (grainTile) return grainTile
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  const im = g.createImageData(256, 256)
  let sd = 7
  const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647
  for (let i = 0; i < 256 * 256; i++) {
    const v = 236 + rnd() * 19
    im.data[i * 4] = v; im.data[i * 4 + 1] = v - 3; im.data[i * 4 + 2] = v - 10; im.data[i * 4 + 3] = 255
  }
  g.putImageData(im, 0, 0)
  for (let k = 0; k < 260; k++) {
    g.strokeStyle = rnd() < 0.55 ? 'rgba(120,96,64,0.16)' : 'rgba(255,250,236,0.4)'
    g.lineWidth = 0.6
    const x = rnd() * 256, y = rnd() * 256, a = rnd() * Math.PI
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7); g.stroke()
  }
  grainTile = c
  return c
}
/**
 * A picture on the walls, painted finer: drawn at its own size `w`×`h` but onto a canvas about 770 (a print) or 400 (a scroll) across, the
 * drawing scaled up, then the paper multiplied over it (its grain and fibres) and its edges aged a shade (a woodblock print's paper, a scroll's
 * silk)
 */
/**
 * A finger in a print's hand (the bijin scroll's): a slim tapering shape from its root (x0, y0) to its tip (x1, y1), `w0` wide at the root and
 * `w1` at the tip, bowed by `bend` across its length; its outline thin, its tip round with the nail's pale edge, a soft crease at its middle
 * joint. `curl`: seen bent round toward us (a fist's), only the crease of its turn near the tip, no nail. `open`: no line across its root (one
 * laid over the hand, the thumb)
 */
export function handFinger(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, bend: number, skin: string, curl = false, open = false) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux
  const mx = (x0 + x1) / 2 + nx * bend, my = (y0 + y1) / 2 + ny * bend, wm = (w0 + w1) / 2
  const f = new Path2D()
  f.moveTo(x0 + nx * w0 / 2, y0 + ny * w0 / 2)
  f.quadraticCurveTo(mx + nx * wm / 2, my + ny * wm / 2, x1 + nx * w1 / 2, y1 + ny * w1 / 2)
  f.bezierCurveTo(x1 + nx * w1 / 2 + ux * w1 * 0.7, y1 + ny * w1 / 2 + uy * w1 * 0.7, x1 - nx * w1 / 2 + ux * w1 * 0.7, y1 - ny * w1 / 2 + uy * w1 * 0.7, x1 - nx * w1 / 2, y1 - ny * w1 / 2)
  f.quadraticCurveTo(mx - nx * wm / 2, my - ny * wm / 2, x0 - nx * w0 / 2, y0 - ny * w0 / 2)
  f.closePath()
  g.fillStyle = skin; g.fill(f)
  g.lineWidth = 0.38; g.strokeStyle = '#1a1210'
  if (!open) g.stroke(f)
  else {
    // (`open`: laid over the hand, its root running on into it: its two sides and its tip outlined, not across its root)
    g.beginPath()
    g.moveTo(x0 + nx * w0 / 2, y0 + ny * w0 / 2)
    g.quadraticCurveTo(mx + nx * wm / 2, my + ny * wm / 2, x1 + nx * w1 / 2, y1 + ny * w1 / 2)
    g.bezierCurveTo(x1 + nx * w1 / 2 + ux * w1 * 0.7, y1 + ny * w1 / 2 + uy * w1 * 0.7, x1 - nx * w1 / 2 + ux * w1 * 0.7, y1 - ny * w1 / 2 + uy * w1 * 0.7, x1 - nx * w1 / 2, y1 - ny * w1 / 2)
    g.quadraticCurveTo(mx - nx * wm / 2, my - ny * wm / 2, x0 - nx * w0 / 2, y0 - ny * w0 / 2)
    g.stroke()
  }
  // (the middle joint's soft crease across it, a little past half way out)
  const t = curl ? 0.72 : 0.55, cx = x0 + dx * t + nx * bend * 0.9, cy = y0 + dy * t + ny * bend * 0.9, cw = (w0 + (w1 - w0) * t) * 0.32
  g.lineWidth = 0.26; g.strokeStyle = 'rgba(170,118,98,0.55)'
  g.beginPath(); g.moveTo(cx + nx * cw, cy + ny * cw); g.quadraticCurveTo(cx + ux * 0.35, cy + uy * 0.35, cx - nx * cw, cy - ny * cw); g.stroke()
  if (!curl) {
    // (the nail's pale edge at the tip)
    g.lineWidth = 0.3; g.strokeStyle = 'rgba(214,150,140,0.8)'
    g.beginPath(); g.moveTo(x1 + nx * w1 * 0.3 - ux * 0.5, y1 + ny * w1 * 0.3 - uy * 0.5); g.quadraticCurveTo(x1 + ux * 0.35, y1 + uy * 0.35, x1 - nx * w1 * 0.3 - ux * 0.5, y1 - ny * w1 * 0.3 - uy * 0.5); g.stroke()
  }
}
export function artTex(kind: 'print' | 'scroll', w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const k = Math.max(1, Math.round(((kind === 'print' ? 770 : 400) / w) * 2) / 2)
  const W = Math.round(w * k), H = Math.round(h * k)
  const tex = signTexture(W, H, (g) => {
    g.save()
    g.scale(k, k)
    draw(g)
    g.restore()
    g.save()
    g.globalCompositeOperation = 'multiply'
    g.fillStyle = g.createPattern(grain(), 'repeat')!
    g.fillRect(0, 0, W, H)
    const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.32, W / 2, H / 2, Math.max(W, H) * 0.72)
    v.addColorStop(0, 'rgb(255,255,255)')
    v.addColorStop(1, kind === 'print' ? 'rgb(222,206,180)' : 'rgb(228,216,194)')
    g.fillStyle = v
    g.fillRect(0, 0, W, H)
    g.restore()
  })
  if (tex) tex.anisotropy = 4
  return tex
}

/** a red seal stamped in a corner */
export const seal = (g: CanvasRenderingContext2D, x: number, y: number, s: number) => {
  g.fillStyle = '#b8261c'
  g.fillRect(x, y, s, s)
  g.strokeStyle = '#f4e6cc'
  g.lineWidth = 1.5
  g.strokeRect(x + 3, y + 3, s - 6, s - 6)
}

/**
 * The frieze under the beam: seigaiha (青海波) as a dyed band (the owner's, 2026-11-10: it was big waves of two thick flat rings each, like
 * a diagram; then eight rows of small ones, too close together, tight to look at and shimmering as the camera moved): waves three times
 * that size, two across a tile and some two and a half rows of them down the band, each five indigo rings about a little solid heart, the
 * outer ring the boldest; a soft indigo wash in each deepening toward its heart; the line work a little uneven (every wave its own indigo,
 * its rings' widths and places a hair different) and softened at its edges as dye bleeds; the dye mottled, a cotton weave and a few resist
 * specks over it all. A tile is 0.6 wide by the band's 0.2, joining with the next along the wall.
 */
// (the owner's, 2026-11-10 evening: still a little dense; the waves a third bigger again (two to 0.8 instead of 0.6, two rows in the
// band), four rings to each instead of five, finer, with more of the ground between them)
export const SEIGAIHA_TILE = 0.8
export const SEIGAIHA = canvasTex(2048, 512, (g) => {
  const W = 2048, H = 512, R = 512, COLS = W / (2 * R)
  const GROUND = '#ece2c9'
  // (a clear indigo, as sometsuke's blue (item 304, the owner's, 2026-11-17: 「加入一些藍色」: its navy read as black at a distance), and between
  // a wave's outer rings and its inner two a band of pale blue each, a wash as the dye's layered)
  const INDIGO = ['#24508f', '#2a5a9c', '#1f4a86', '#2d5fa3', '#264f8d']
  const PALE = ['rgba(118,160,214,0.42)', 'rgba(150,186,228,0.34)']
  let seed = 1
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  g.fillStyle = GROUND; g.fillRect(0, 0, W, H)
  // (rows half a wave apart, odd rows half a wave along, each row over the one above; from the band's top to past its foot)
  for (let row = 0; row * (R / 2) <= H + R / 2; row++) {
    const cy = row * (R / 2)
    for (let col = -1; col <= COLS; col++) {
      const cx = col * 2 * R + (row % 2 ? R : 0)
      // (a wave and its copy a tile along are the same, so the frieze joins)
      seed = 7919 + ((((col % COLS) + COLS) % COLS) * 17 + row * 131) * 97
      rnd(); rnd()
      const ink = INDIGO[Math.floor(rnd() * INDIGO.length)]
      const half = new Path2D(); half.moveTo(cx - R, cy); half.arc(cx, cy, R, Math.PI, 0); half.closePath()
      g.fillStyle = GROUND; g.fill(half)
      const wash = g.createRadialGradient(cx, cy, R * 0.12, cx, cy, R)
      wash.addColorStop(0, 'rgba(36,80,143,0.16)'); wash.addColorStop(0.65, 'rgba(36,80,143,0.05)'); wash.addColorStop(1, 'rgba(36,80,143,0)')
      g.fillStyle = wash; g.fill(half)
      // (the pale blue bands: between its outer two rings, and between its inner two (item 304))
      for (const [[f0, f1], fill] of [[[0.93, 0.72], PALE[0]], [[0.52, 0.33], PALE[1]]] as const) {
        const band = new Path2D()
        band.arc(cx, cy, R * f0, Math.PI, 0); band.arc(cx, cy, R * f1, 0, Math.PI, true); band.closePath()
        g.fillStyle = fill; g.fill(band)
      }
      // (its rings, each drawn twice: a faint wide one where the dye's bled, then its line)
      for (const [f, w] of [[0.93, 20], [0.72, 13], [0.52, 12], [0.33, 11]] as const) {
        const r = R * f + (rnd() - 0.5) * 5, lw = w + (rnd() - 0.5) * 3
        g.beginPath(); g.arc(cx, cy, r, Math.PI, 0)
        g.strokeStyle = 'rgba(36,80,143,0.12)'; g.lineWidth = lw + 8; g.stroke()
        g.strokeStyle = ink; g.lineWidth = lw; g.stroke()
      }
      g.beginPath(); g.moveTo(cx - R * 0.12, cy); g.arc(cx, cy, R * 0.12, Math.PI, 0); g.closePath()
      g.fillStyle = ink; g.fill()
    }
  }
  // (over it all, wrapped round the tile's ends: the dye's mottle, broad and faint; the cotton's weave; pale resist specks and a few darker)
  seed = 4242
  const wrap = (x: number, draw: (x: number) => void) => { draw(x); if (x < 80) draw(x + W); if (x > W - 80) draw(x - W) }
  for (let k = 0; k < 28; k++) {
    const x = rnd() * W, y = rnd() * H, r = 60 + rnd() * 90, dark = rnd() < 0.5
    wrap(x, (xx) => {
      const m = g.createRadialGradient(xx, y, 0, xx, y, r)
      m.addColorStop(0, dark ? 'rgba(60,50,40,0.06)' : 'rgba(255,250,236,0.08)'); m.addColorStop(1, 'rgba(0,0,0,0)')
      g.fillStyle = m; g.fillRect(xx - r, y - r, r * 2, r * 2)
    })
  }
  for (let y = 0; y < H; y += 3) { g.fillStyle = 'rgba(96,80,56,0.035)'; g.fillRect(0, y, W, 1) }
  for (let x = 0; x < W; x += 3) { g.fillStyle = 'rgba(255,250,236,0.03)'; g.fillRect(x, 0, 1, H) }
  for (let k = 0; k < 5200; k++) {
    const x = rnd() * W, y = rnd() * H, w = 1 + rnd() * 2.5, pale = rnd() < 0.7
    g.fillStyle = pale ? `rgba(246,240,224,${0.12 + rnd() * 0.18})` : `rgba(40,34,26,${0.05 + rnd() * 0.07})`
    wrap(x, (xx) => g.fillRect(xx, y, w, 1))
  }
}, true)

/** a picture from public/textures, laid to repeat (its tiling set where it's used) */
function fileTex(file: string) {
  if (typeof document === 'undefined') return null
  // (not fetched on a phone, which draws no 3D (scene/flatGate))
  const t = shopPicture(file)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = 8
  return t
}
/** the plaster: a warm earthen wall (聚楽壁) of cream clay, mottled, its fine sand in it, the trowel's long sweeps faint across it, chopped straw
 * here and there (blender/walltex.py: tileable, so no seam where one tile meets the next, as the old drawn one had); a tile every 1.2 */
export const PLASTER = fileTex('plaster_wall.jpg')

export function Box({ size, color, ...rest }: { size: [number, number, number]; color: string } & Record<string, unknown>) {
  return (
    <mesh {...rest}>
      <boxGeometry args={size} />
      <meshToonMaterial color={color} />
    </mesh>
  )
}
/** the plaque over the toilet door: お手洗い, and 廁所 under it */
/** a toilet's door's height */
export const WC_H = 1.85
/** a stretch of the wall (the wall's own frame: z along it, y up), plaster or the dark wainscot, the plaster's
 * pattern laid from the wall's own z so stretches side by side run on into each other */
/** upright boards of warm brown wood for the wall's foot (the wainscot), twelve to a tile 1.44 across and the wainscot's height, each its own
 * tone, most flat-sawn and some quarter-sawn, a knot here and there, a V-groove between (blender/walltex.py) */
const WALL_BOARDS = fileTex('wainscot_boards.jpg')
/**
 * (item 743, the owner's 「店內米白色牆要有微微褐色漸變，輕輕地即可」) the shop's cream walls a shade browner low down, by the wainscot's rail (an
 * old wall's warmth there, where hands and the years have been), fading to their own cream by the frieze: a colour multiplied over the
 * wall's own, by the height in it (the same at a height on every piece of wall, so each meets the next), linear from PLASTER_AGE at the
 * rail to none at the wall's top. Its points' colour (the plaster's material drawing them: no new program)
 */
const PLASTER_AGE = new THREE.Color('#ece2cf'), PLASTER_WHITE = new THREE.Color('#ffffff')
export function plasterTint(y: number, out = new THREE.Color()) {
  const k = Math.min(1, Math.max(0, (WALL_H - y) / (WALL_H - WAINSCOT)))
  return out.copy(PLASTER_WHITE).lerp(PLASTER_AGE, k)
}
/** a plane's points coloured by plasterTint at their heights (the plane `h` high, its middle `ym` up the wall), times `base` */
export function tintByHeight(g: THREE.BufferGeometry, ym: number, base = PLASTER_WHITE) {
  const pos = g.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    plasterTint(ym + pos.getY(i), c).multiply(base)
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  return g
}
export function WallPiece({ z0, z1, y0, y1, plaster = false }: { z0: number; z1: number; y0: number; y1: number; plaster?: boolean }) {
  // (the one picture for every piece of wall, its tiling where each piece is written into the piece's own points (item 804): each had its own
  // copy of the picture to tile it, and the room's merge took every piece for a look of its own, a draw each, 15 of them)
  const map = plaster ? PLASTER : WALL_BOARDS
  // (the plaster's points tinted by their height (item 743))
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(z1 - z0, y1 - y0)
    // (the plaster a tile every 1.2; the boards twelve centimetres across, running up the wainscot's whole height in one: as the picture's
    // repeat and offset were, uv × repeat + offset)
    const [ru, rv, ou, ov] = plaster ? [(z1 - z0) / 1.2, (y1 - y0) / 1.2, -z1 / 1.2, y0 / 1.2] : [(z1 - z0) / 1.44, (y1 - y0) / WAINSCOT, -z1 / 1.44, y0 / WAINSCOT]
    const uv = g.attributes.uv as THREE.BufferAttribute
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ru + ou, uv.getY(i) * rv + ov)
    return plaster ? tintByHeight(g, (y0 + y1) / 2) : g
  }, [z0, z1, y0, y1, plaster])
  useEffect(() => () => geo.dispose(), [geo])
  return (
    <mesh geometry={geo} position={[0, (y0 + y1) / 2, (z0 + z1) / 2]} rotation-y={-Math.PI / 2} receiveShadow>
      <meshToonMaterial color="#ffffff" map={map} vertexColors={plaster} />
    </mesh>
  )
}
/** a sliding door's lower board of cedar planks (the owner's: a natural grain, the staff door's first, then the toilets' after it, each its
 * own): four or five planks standing side by side, each its own width and tone, a fine straight grain up them that thickens and thins, a
 * darker streak down some, a soft arch of a flat-sawn figure on one or two, now and then a small knot with the grain parting round it, a dark
 * groove between each two; laid as the board's UVs run (glTF's way up). Every door's from its own seed, so no two are alike */
export function plankBoard(seed: number, tones: string[]) {
  const t = canvasTex(256, 320, (g) => {
    let sd = seed
    const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647 }
    // (the planks' widths: unequal, filling the board)
    const n = tones.length, ws = tones.map(() => 0.7 + rnd() * 0.6), sum = ws.reduce((a, b) => a + b, 0)
    let x0 = 0
    for (let k = 0; k < n; k++) {
      const w = (ws[k] / sum) * 256, x1 = k === n - 1 ? 256 : x0 + w
      const pw = x1 - x0
      g.fillStyle = tones[k]; g.fillRect(x0, 0, pw + 1, 320)
      // (the tone drifting down the plank: a little lighter or darker in long soft bands)
      const drift = g.createLinearGradient(0, 0, 0, 320)
      for (let y = 0; y <= 4; y++) drift.addColorStop(y / 4, rnd() < 0.5 ? `rgba(255,236,200,${rnd() * 0.08})` : `rgba(40,20,8,${rnd() * 0.09})`)
      g.fillStyle = drift; g.fillRect(x0, 0, pw, 320)
      // (a darker streak down it, mineral or heartwood, on some)
      if (rnd() < 0.5) {
        const sx = x0 + 6 + rnd() * (pw - 16), sw = 3 + rnd() * 8
        const gr = g.createLinearGradient(sx, 0, sx + sw, 0)
        gr.addColorStop(0, 'rgba(50,26,12,0)'); gr.addColorStop(0.5, `rgba(50,26,12,${0.1 + rnd() * 0.12})`); gr.addColorStop(1, 'rgba(50,26,12,0)')
        g.fillStyle = gr; g.fillRect(sx, 0, sw, 320)
      }
      // (a knot or two, the grain to go round them)
      const knots: [number, number, number][] = []
      if (rnd() < 0.55) knots.push([x0 + 8 + rnd() * (pw - 16), 30 + rnd() * 260, 2.5 + rnd() * 3.5])
      // (the straight grain: fine lines up the plank, closer here and wider there, bending round a knot)
      const lines = Math.round(pw * (0.32 + rnd() * 0.2))
      for (let q = 0; q < lines; q++) {
        const x = x0 + 2 + rnd() * (pw - 4), dark = rnd() < 0.62
        g.strokeStyle = dark ? `rgba(60,34,18,${0.08 + rnd() * 0.2})` : `rgba(240,210,170,${0.06 + rnd() * 0.1})`
        g.lineWidth = 0.5 + rnd() * (dark ? 1.6 : 1)
        const ph = rnd() * 6, amp = 0.6 + rnd() * 1.6
        g.beginPath()
        for (let y = 0; y <= 320; y += 10) {
          let xx = x + Math.sin(y / (40 + amp * 20) + ph) * amp
          for (const [kx, ky, kr] of knots) { const dy = y - ky, d = Math.hypot(xx - kx, dy); if (d < kr * 5) xx += Math.sign(xx - kx || 1) * (kr * 5 - d) * 0.45 * Math.exp(-(dy * dy) / (kr * kr * 30)) }
          if (y === 0) g.moveTo(xx, y); else g.lineTo(xx, y)
        }
        g.stroke()
      }
      for (const [kx, ky, kr] of knots) {
        const gr = g.createRadialGradient(kx, ky, 0, kx, ky, kr * 1.8)
        gr.addColorStop(0, 'rgba(40,20,8,0.75)'); gr.addColorStop(0.5, 'rgba(70,38,18,0.45)'); gr.addColorStop(1, 'rgba(70,38,18,0)')
        g.fillStyle = gr; g.beginPath(); g.ellipse(kx, ky, kr * 1.4, kr * 1.9, 0, 0, Math.PI * 2); g.fill()
      }
      // (on some a soft arch of a flat-sawn figure, low in contrast, its own height)
      if (rnd() < 0.45) {
        const cx = x0 + pw * (0.35 + rnd() * 0.3), top = 40 + rnd() * 140, rings = 3 + Math.floor(rnd() * 4)
        for (let r = 0; r < rings; r++) {
          g.strokeStyle = `rgba(70,40,20,${0.15 - r * 0.02})`; g.lineWidth = 1 + rnd() * 0.8
          const sp = pw * 0.12 + r * pw * 0.07
          g.beginPath(); g.moveTo(cx - sp, 320); g.bezierCurveTo(cx - sp, top + r * 18 + 60, cx - 2 - r * 2, top + r * 14, cx, top + r * 14)
          g.bezierCurveTo(cx + 2 + r * 2, top + r * 14, cx + sp, top + r * 18 + 60, cx + sp, 320); g.stroke()
        }
      }
      // (the groove at its edge, a hair of light beside it)
      if (k) { g.fillStyle = 'rgba(30,16,8,0.75)'; g.fillRect(x0, 0, 2, 320); g.fillStyle = 'rgba(255,230,190,0.12)'; g.fillRect(x0 + 2, 0, 1, 320) }
      x0 = x1
    }
  })
  if (t) t.flipY = false
  return t
}
