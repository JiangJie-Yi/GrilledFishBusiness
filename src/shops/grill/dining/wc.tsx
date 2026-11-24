import { doorClick, LOCK_TEX, ToiletLive, WashstandLive, WcBin, WcBrush, WcDryer, WcMarks, WcOtohime, WcPads, WcPaper, WcRemote, WcTowelBox } from '@/shops/grill/Restroom'
import { latchSound, slideDoorSound } from '@/shops/grill/restroomSound'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { plainColours, StaticBatch, mergeByMaterial } from '@/scene/StaticBatch'
import { glowLeave, glowOnly } from '@/scene/hoverGlow'
import { inkModel } from '@/scene/inkHull'
import { heard } from '@/scene/sfx'
import { useGLTF } from '@react-three/drei'
import { SIGN_FONT } from '@/scene/signFont'
import { tipOver, POINTER_HINT, TOILETS, WC_ROOM, WC_SLIDE, WC_W } from '@/shops/grill/bar'
import { Movable } from '@/shops/grill/Movable'
import { getEdit } from '@/shops/grill/edit'
import { setTip } from '@/scene/hoverTip'
import { getLights } from '@/scene/lightsStore'
import { wcDarkness } from '@/game/roomLights'
import { skyNow } from './ambient'
import { canvasTex, WC_H, plankBoard } from './base'
import { SILL_TEX } from './roundWindow'

/** the restroom's plaque (the owner's, 2026-11-09: a bright figure, not a dark character; no black rim): a warm walnut board, softly
 * bevelled, a brass nail at either end, and in its middle a round little figure in one bright colour, a man in a haori with short hair
 * (lapis blue) or a woman in kimono with her hair up (sakura pink); `glow`: the figure alone, white on black, for it to shine a little in the
 * dark (its emissive map) */
const WC_SIGN_MADE = new Map<string, THREE.Texture | null>()
const WC_ICON = { m: '#38bdf8', f: '#fb7185' }
function wcFigure(g: CanvasRenderingContext2D, who: 'm' | 'f', x: number, y: number, fill: string, size = 1) {
  g.save()
  g.translate(x, y)
  g.scale(size, size)
  g.fillStyle = fill
  const round = (path: Path2D) => g.fill(path)
  if (who === 'm') {
    // (head, with short hair a cap over it)
    g.beginPath(); g.arc(0, -52, 19, 0, Math.PI * 2); g.fill()
    // (the haori: square shoulders, wide sleeves falling to the hands, the body straight down to the knees)
    const p = new Path2D()
    p.moveTo(-14, -30); p.lineTo(14, -30)
    p.quadraticCurveTo(38, -30, 42, -12); p.lineTo(44, 14); p.quadraticCurveTo(44, 20, 37, 20); p.lineTo(24, 20)
    p.lineTo(22, 34); p.lineTo(-22, 34); p.lineTo(-24, 20); p.lineTo(-37, 20); p.quadraticCurveTo(-44, 20, -44, 14)
    p.lineTo(-42, -12); p.quadraticCurveTo(-38, -30, -14, -30); p.closePath()
    round(p)
    // (the legs, two, a gap between)
    const l = new Path2D(); l.roundRect(-19, 32, 15, 40, 5); l.roundRect(4, 32, 15, 40, 5); round(l)
  } else {
    // (head and her hair up in a bun)
    g.beginPath(); g.arc(0, -52, 18, 0, Math.PI * 2); g.fill()
    g.beginPath(); g.arc(0, -74, 10, 0, Math.PI * 2); g.fill()
    // (the kimono: narrow shoulders, sleeves hanging, drawn in at the obi, then down and out a little to its hem)
    const p = new Path2D()
    p.moveTo(-12, -31); p.lineTo(12, -31)
    p.quadraticCurveTo(34, -30, 38, -10); p.lineTo(40, 10); p.quadraticCurveTo(40, 16, 33, 16); p.lineTo(20, 16)
    p.lineTo(18, 4)
    p.quadraticCurveTo(24, 40, 32, 70); p.quadraticCurveTo(0, 76, -32, 70); p.quadraticCurveTo(-24, 40, -18, 4)
    p.lineTo(-20, 16); p.lineTo(-33, 16); p.quadraticCurveTo(-40, 16, -40, 10); p.lineTo(-38, -10); p.quadraticCurveTo(-34, -30, -12, -31); p.closePath()
    round(p)
  }
  g.restore()
}
/** the figure, a little smaller (the owner's, 2026-11-10), left of the middle, and its character (男 or 女) in the sign's brush hand on its
 * right, both in `fill`; `shade` under them first */
function wcMark(g: CanvasRenderingContext2D, who: 'm' | 'f', fill: string, shade = false) {
  const draw = (colour: string) => {
    wcFigure(g, who, 112, 99, colour, 0.76)
    g.fillStyle = colour
    g.font = `900 104px ${SIGN_FONT}`
    g.textAlign = 'center'; g.textBaseline = 'middle'
    g.fillText(who === 'm' ? '男' : '女', 221, 102)
  }
  if (shade) { g.save(); g.translate(0, 2.5); g.globalAlpha = 0.35; draw('#2a170a'); g.restore() }
  draw(fill)
}
function wcSign(who: 'm' | 'f', glow = false) {
  const key = `${who}|${glow}`
  if (!WC_SIGN_MADE.has(key)) WC_SIGN_MADE.set(key, canvasTex(480, 288, (g) => {
    g.save()
    // (drawn half again over its laid-out size: the character's strokes stay crisp)
    g.scale(1.5, 1.5)
    if (glow) {
      g.fillStyle = '#000'; g.fillRect(0, 0, 320, 192)
      wcMark(g, who, '#ffffff')
      g.restore()
      return
    }
    // (its edges and rim (the board's thickness and bevel take theirs from round the picture's border): end grain, a little darker)
    g.fillStyle = '#5c3c22'; g.fillRect(0, 0, 320, 192)
    // (the board: walnut, lighter at its middle, its edge rounded off (a pale bevel above, a soft shade below), no dark rim)
    const face = new Path2D(); face.roundRect(2, 2, 316, 188, 12)
    const wood = g.createLinearGradient(0, 0, 0, 192)
    wood.addColorStop(0, '#7a5434'); wood.addColorStop(0.5, '#8a6240'); wood.addColorStop(1, '#6c4a2e')
    g.fillStyle = wood; g.fill(face)
    g.save(); g.clip(face)
    // (the grain: long flowing lines along it, deeper and paler, a knot's swirl)
    let seed = who === 'm' ? 3 : 11
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    for (let k = 0; k < 26; k++) {
      const y0 = 8 + k * 7 + rnd() * 3
      g.strokeStyle = rnd() < 0.5 ? 'rgba(52,30,14,0.26)' : 'rgba(176,128,84,0.22)'; g.lineWidth = 0.8 + rnd() * 1.4
      g.beginPath()
      for (let x = 0; x <= 320; x += 6) { const y = y0 + Math.sin(x / (40 + k * 3) + k) * 3 + Math.sin(x / 13 + k * 2) * 0.8; if (x === 0) g.moveTo(x, y); else g.lineTo(x, y) }
      g.stroke()
    }
    g.strokeStyle = 'rgba(52,30,14,0.24)'; g.lineWidth = 1
    for (let r = 4; r < 22; r += 4) { g.beginPath(); g.ellipse(258, 162, r * 1.8, r * 0.6, 0.05, 0, Math.PI * 2); g.stroke() }
    // (the bevel, soft: light falling over its top edge, shade under its foot)
    const top = g.createLinearGradient(0, 0, 0, 16); top.addColorStop(0, 'rgba(236,200,150,0.5)'); top.addColorStop(1, 'rgba(236,200,150,0)')
    g.fillStyle = top; g.fillRect(0, 0, 320, 16)
    const foot = g.createLinearGradient(0, 176, 0, 192); foot.addColorStop(0, 'rgba(40,22,10,0)'); foot.addColorStop(1, 'rgba(40,22,10,0.4)')
    g.fillStyle = foot; g.fillRect(0, 176, 320, 16)
    g.restore()
    // (a brass nail at either end)
    for (const x of [24, 296]) {
      const n = g.createRadialGradient(x - 2, 94, 1, x, 96, 7)
      n.addColorStop(0, '#f6dc94'); n.addColorStop(0.6, '#b98a2e'); n.addColorStop(1, '#5a3a10')
      g.fillStyle = n; g.beginPath(); g.arc(x, 96, 6, 0, Math.PI * 2); g.fill()
    }
    // (the figure and its character: a faint shade under them, then the bright colour)
    wcMark(g, who, WC_ICON[who], true)
    g.restore()
  }))
  return WC_SIGN_MADE.get(key) ?? null
}
/** the plaque's board (the owner's, 2026-11-10: it had no thickness, a picture flat on the wall): a slab of walnut WC_PLAQUE wide, high and
 * thick, its corners rounded and its edges bevelled; its uvs laid from its face, so its edges and bevel take the picture's rim (end grain);
 * its back on the wall at z 0, its face out along +z */
const WC_PLAQUE = { w: 0.4, h: 0.24, d: 0.022, r: 0.016, b: 0.004 }
const WC_PLAQUE_GEO = (() => {
  const { w, h, d, r, b } = WC_PLAQUE
  const x = w / 2 - b, y = h / 2 - b, q = r - b
  const s = new THREE.Shape()
  s.moveTo(-x + q, -y); s.lineTo(x - q, -y); s.quadraticCurveTo(x, -y, x, -y + q); s.lineTo(x, y - q); s.quadraticCurveTo(x, y, x - q, y)
  s.lineTo(-x + q, y); s.quadraticCurveTo(-x, y, -x, y - q); s.lineTo(-x, -y + q); s.quadraticCurveTo(-x, -y, -x + q, -y)
  const geo = new THREE.ExtrudeGeometry(s, { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 1, curveSegments: 3 })
  const P = geo.attributes.position as THREE.BufferAttribute, uv = geo.attributes.uv as THREE.BufferAttribute
  for (let i = 0; i < P.count; i++) uv.setXY(i, (P.getX(i) + w / 2) / w, (P.getY(i) + h / 2) / h)
  geo.translate(0, 0, b)
  return geo
})()

/** a family crest (紋) in one colour, centred at x, y, `R` its radius: 梅鉢 (plum blossom: five round petals, a dot in its heart and a ring of
 * small ones round it) or 桜 (cherry blossom: five petals each notched at its tip, stamens in its heart), after the owner's two references */
function crest(g: CanvasRenderingContext2D, kind: 'ume' | 'sakura', x: number, y: number, R: number, ink: string, ground: string) {
  g.save()
  g.translate(x, y)
  g.fillStyle = ink
  if (kind === 'ume') {
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5
      g.beginPath(); g.arc(Math.cos(a) * R * 0.62, Math.sin(a) * R * 0.62, R * 0.345, 0, Math.PI * 2); g.fill()
    }
    g.fillStyle = ground; g.beginPath(); g.arc(0, 0, R * 0.3, 0, Math.PI * 2); g.fill()
    g.fillStyle = ink; g.beginPath(); g.arc(0, 0, R * 0.1, 0, Math.PI * 2); g.fill()
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + Math.PI / 5 + (k * 2 * Math.PI) / 5
      g.beginPath(); g.arc(Math.cos(a) * R * 0.2, Math.sin(a) * R * 0.2, R * 0.05, 0, Math.PI * 2); g.fill()
    }
  } else {
    for (let k = 0; k < 5; k++) {
      g.save()
      g.rotate((k * 2 * Math.PI) / 5)
      g.beginPath()
      g.moveTo(0, -R * 0.16)
      g.bezierCurveTo(-R * 0.22, -R * 0.3, -R * 0.46, -R * 0.62, -R * 0.32, -R * 0.9)
      g.quadraticCurveTo(-R * 0.2, -R * 1.03, -R * 0.08, -R * 0.99)
      g.lineTo(0, -R * 0.85)
      g.lineTo(R * 0.08, -R * 0.99)
      g.quadraticCurveTo(R * 0.2, -R * 1.03, R * 0.32, -R * 0.9)
      g.bezierCurveTo(R * 0.46, -R * 0.62, R * 0.22, -R * 0.3, 0, -R * 0.16)
      g.closePath(); g.fill()
      g.restore()
    }
    g.beginPath(); g.arc(0, 0, R * 0.08, 0, Math.PI * 2); g.fill()
    g.strokeStyle = ink; g.lineWidth = Math.max(1, R * 0.03)
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + Math.PI / 5 + (k * 2 * Math.PI) / 5
      g.beginPath(); g.moveTo(Math.cos(a) * R * 0.08, Math.sin(a) * R * 0.08); g.lineTo(Math.cos(a) * R * 0.2, Math.sin(a) * R * 0.2); g.stroke()
      g.beginPath(); g.arc(Math.cos(a) * R * 0.22, Math.sin(a) * R * 0.22, R * 0.035, 0, Math.PI * 2); g.fill()
    }
  }
  g.restore()
}
/** the noren over each toilet's door (the owner's: longer, and close fitting: as wide as the doorway, the posts' inner faces just covered,
 * its top up over the head where it hangs from its rod, no gap showing the shoji above it): across both its panels, and down */
const WC_NOREN_W = 0.85, WC_NOREN_L = 0.6
/**
 * The noren over each toilet's door (the owner's: some pattern on them, cut in half down the middle): navy for the men's with a white
 * 梅鉢 across its middle, deep red for the women's with a white 桜, the slit between its two panels cutting the crest in half; a darker band
 * along its top where it's sewn over its rod, the crest small and tone on tone scattered over the rest, a white line along its hem, the
 * cotton's weave. One picture over both panels (each panel shows its half: ToiletDoor's noren), at the noren's own shape (a pixel as tall as
 * it's wide, the crest round).
 */
const wcNoren = (who: 'm' | 'f') => {
  const PX = 1024 / WC_NOREN_W, H = Math.round(WC_NOREN_L * PX)
  return canvasTex(1024, H, (g) => {
    const cloth = who === 'm' ? '#22335f' : '#8e2329'
    const kind = who === 'm' ? 'ume' : 'sakura'
    const band = Math.round(0.034 * PX), cy = Math.round(band + (H - band) * 0.47)
    g.save()
    g.fillStyle = cloth; g.fillRect(0, 0, 1024, H)
    // (the weave: fine threads either way)
    g.globalAlpha = 0.06
    g.fillStyle = '#ffffff'
    for (let x = 0; x < 1024; x += 3) g.fillRect(x, 0, 1, H)
    g.fillStyle = '#000000'
    for (let y = 0; y < H; y += 3) g.fillRect(0, y, 1024, 1)
    g.globalAlpha = 1
    // (the small crests, tone on tone, clear of the big one)
    for (let r = 0, y = band + 50; y < H - 20; r++, y += 78) for (let x = (r % 2) * 56 + 40; x < 1024; x += 112) {
      if (Math.hypot(x - 512, y - cy) < 250) continue
      crest(g, kind, x, y, 22, 'rgba(255,255,255,0.1)', 'rgba(0,0,0,0)')
    }
    // (the band along its top, sewn over the rod)
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(0, 0, 1024, band)
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(0, band, 1024, 3)
    // (the big crest across the middle, white, in a fine white ring)
    crest(g, kind, 512, cy, 178, '#f4efe4', cloth)
    g.strokeStyle = '#f4efe4'; g.lineWidth = 7
    g.beginPath(); g.arc(512, cy, 214, 0, Math.PI * 2); g.stroke()
    // (a white line along the hem)
    g.fillStyle = '#f4efe4'; g.fillRect(0, H - Math.round(0.022 * PX), 1024, 5)
    g.restore()
  })
}
const WC_NOREN = { m: wcNoren('m'), f: wcNoren('f') }
/**
 * The long noren hung across the way round to the toilet (the owner's: in through the door the washstand first, the toilet round the
 * corner), down to below the waist: linen, a dark band along its top over the rod, printed (the owner's, after his two pictures of wagara):
 * the men's green bamboo, a few stalks with their nodes and sprays of slender leaves, two paler ones behind for depth; the women's peonies,
 * three great layered blossoms, pink, red and cream round golden hearts, among their leaves; the linen's weave over it all. Nothing across
 * the slit between its two panels.
 */
/** the long noren inside: down to the waist (the owner's: shorter; it hung to the knee), and the opening it hangs across */
const WC_STALL_L = 0.9, WC_STALL_W = WC_ROOM.D - WC_ROOM.X0 - 0.06
const wcStallNoren = (who: 'm' | 'f') => {
  const H = Math.round(512 * WC_STALL_L / WC_STALL_W)
  return canvasTex(512, H, (g) => {
    // (a little random of its own, the same every time it's drawn)
    let seed = who === 'm' ? 7 : 11
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }
    g.save()
    const gr = g.createLinearGradient(0, 0, 0, H)
    if (who === 'm') { gr.addColorStop(0, '#22385e'); gr.addColorStop(1, '#162540') } else { gr.addColorStop(0, '#b22222'); gr.addColorStop(1, '#8b0000') }
    g.fillStyle = gr; g.fillRect(0, 0, 512, H)
    if (who === 'm') {
      // (indigo (the owner's: the men's a deep navy with a traditional pattern; it was green bamboo on linen): waves of seigaiha rising over
      // its lower half in pale lines, fading upward; on each panel a white crest, the plum blossom (梅鉢) in its ring)
      const R = 30
      for (let row = 0; row * R * 0.5 < H * 0.55; row++) {
        const y = H - row * R * 0.5
        const fade = Math.max(0, 1 - row * R * 0.5 / (H * 0.55))
        for (let x = (row % 2) * R; x < 512 + R; x += R * 2) {
          for (let k = 3; k >= 1; k--) {
            g.beginPath(); g.arc(x, y, (R * k) / 3, Math.PI, 0)
            g.fillStyle = k === 3 ? '#1b2d4d' : 'rgba(0,0,0,0)'; if (k === 3) g.fill()
            g.strokeStyle = `rgba(200,215,235,${0.5 * fade})`; g.lineWidth = 2
            g.stroke()
          }
        }
      }
      const crest = (cx: number, cy: number, r: number) => {
        g.strokeStyle = '#f2efe6'; g.lineWidth = 4
        g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke()
        g.fillStyle = '#f2efe6'
        for (let k = 0; k < 5; k++) {
          const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5
          g.beginPath(); g.arc(cx + Math.cos(a) * r * 0.42, cy + Math.sin(a) * r * 0.42, r * 0.3, 0, Math.PI * 2); g.fill()
        }
        g.fillStyle = '#22385e'; g.beginPath(); g.arc(cx, cy, r * 0.17, 0, Math.PI * 2); g.fill()
        g.fillStyle = '#f2efe6'
        for (let k = 0; k < 5; k++) {
          const a = -Math.PI / 2 + Math.PI / 5 + (k * 2 * Math.PI) / 5
          g.beginPath(); g.arc(cx + Math.cos(a) * r * 0.12, cy + Math.sin(a) * r * 0.12, r * 0.03, 0, Math.PI * 2); g.fill()
        }
      }
      crest(128, H * 0.36, 52)
      crest(384, H * 0.36, 52)
    } else {
      // peonies (牡丹, as in the owner's reference): their three-lobed leaves first, then each blossom from the back, seen a little from
      // above: a ring of broad ruffled petals, deep at the heart and pale at the edge; a smaller ring; the golden heart of stamens; and the
      // cupped petals in front of it. Each kept to its own panel (the slit at the middle cuts through nothing)
      type Hue = { deep: string; mid: string; pale: string; line: string }
      const petal = (L: number, W: number, from: string, to: string, line: string, bumps: number) => {
        // (in the petal's own frame: its narrow base at the origin, its ruffled end out along +x; a few shallow scallops round the end,
        // a little notch where each two meet; faint veins from the base)
        const edge = (t: number) => { const a = t * 1.25; return [L * 0.6 + Math.cos(a) * L * 0.4, Math.sin(a) * W] }
        const gr = g.createLinearGradient(0, 0, L, 0)
        gr.addColorStop(0, from); gr.addColorStop(0.6, to); gr.addColorStop(1, to)
        g.beginPath()
        g.moveTo(0, -W * 0.22)
        const [sx, sy] = edge(-1)
        g.bezierCurveTo(L * 0.25, -W * 0.55, L * 0.5, -W * 1.05, sx, sy)
        for (let k = 0; k < bumps; k++) {
          const t0 = -1 + (k / bumps) * 2, t1 = -1 + ((k + 1) / bumps) * 2
          const [mx, my] = edge((t0 + t1) / 2), [ex, ey] = edge(t1)
          const out = 1 + 0.1 + rnd() * 0.06
          g.quadraticCurveTo(L * 0.6 + (mx - L * 0.6) * out, my * out, ex - (ex - L * 0.6) * 0.04, ey * 0.96)
        }
        g.bezierCurveTo(L * 0.5, W * 1.05, L * 0.25, W * 0.55, 0, W * 0.22)
        g.closePath()
        g.fillStyle = gr; g.fill()
        g.strokeStyle = line; g.lineWidth = 1.3; g.stroke()
        g.globalAlpha = 0.3
        g.strokeStyle = line; g.lineWidth = 0.9
        for (const t of [-0.55, -0.18, 0.18, 0.55]) {
          const [vx, vy] = edge(t)
          g.beginPath(); g.moveTo(L * 0.08, 0); g.quadraticCurveTo(vx * 0.45, vy * 0.3, vx * 0.78, vy * 0.78); g.stroke()
        }
        g.globalAlpha = 1
      }
      const peonyLeaf = (x: number, y: number, a: number, len: number, body: string, lit: string) => {
        // (a stalk, three pointed lobes at its end, the middle the longest; two-toned, a pale vein down each)
        g.save(); g.translate(x, y); g.rotate(a)
        g.strokeStyle = body; g.lineWidth = 2.2
        g.beginPath(); g.moveTo(0, 0); g.lineTo(len * 0.3, 0); g.stroke()
        for (const [da, k] of [[-0.62, 0.68], [0.62, 0.68], [0, 1]]) {
          g.save(); g.translate(len * 0.3, 0); g.rotate(da)
          const l = len * 0.7 * k, w = l * 0.27
          g.beginPath(); g.moveTo(0, 0)
          g.bezierCurveTo(l * 0.3, -w * 1.1, l * 0.72, -w * 0.85, l, 0)
          g.bezierCurveTo(l * 0.72, w * 0.85, l * 0.3, w * 1.1, 0, 0)
          g.fillStyle = body; g.fill()
          g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(l * 0.3, -w * 1.1, l * 0.72, -w * 0.85, l, 0); g.closePath()
          g.fillStyle = lit; g.fill()
          g.strokeStyle = 'rgba(232,240,214,0.5)'; g.lineWidth = 1.1
          g.beginPath(); g.moveTo(l * 0.04, 0); g.lineTo(l * 0.86, 0); g.stroke()
          g.restore()
        }
        g.restore()
      }
      const blossom = (cx: number, cy: number, r: number, hue: Hue) => {
        g.save()
        const left = cx < 256
        g.beginPath(); g.rect(left ? 0 : 263, 40, 249, H - 40); g.clip()
        for (const a of [-0.35, 0.55, 1.45, 2.35, 3.35]) {
          const t = a + (rnd() - 0.5) * 0.3
          peonyLeaf(cx + Math.cos(t) * r * 0.45, cy + Math.sin(t) * r * 0.4, t, r * (0.95 + rnd() * 0.15), ['#2f5a3a', '#355f3d', '#2a5234'][Math.floor(rnd() * 3)], '#4f8a58')
        }
        // (the flower a little flattened, seen from above it)
        g.translate(cx, cy); g.scale(1, 0.84)
        const off = rnd() * 0.9
        for (let k = 0; k < 7; k++) {
          const a = off + (k / 7) * Math.PI * 2
          g.save(); g.rotate(a); g.translate(r * 0.08, 0)
          petal(r * (0.92 + rnd() * 0.12), r * 0.44, hue.deep, hue.pale, hue.line, 4)
          g.restore()
        }
        for (let k = 0; k < 6; k++) {
          const a = off + ((k + 0.5) / 6) * Math.PI * 2
          g.save(); g.rotate(a); g.translate(r * 0.05, 0)
          petal(r * 0.7, r * 0.36, hue.deep, hue.mid, hue.line, 3)
          g.restore()
        }
        // (the heart: golden stamens, a little above the middle)
        g.save(); g.translate(0, -r * 0.1)
        g.fillStyle = '#c9932e'
        g.beginPath(); g.ellipse(0, 0, r * 0.27, r * 0.19, 0, 0, Math.PI * 2); g.fill()
        g.fillStyle = '#e9c252'
        g.beginPath(); g.ellipse(0, -r * 0.02, r * 0.23, r * 0.15, 0, 0, Math.PI * 2); g.fill()
        for (let k = 0; k < 22; k++) {
          const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd())
          const x = Math.cos(a) * d * r * 0.22, y = Math.sin(a) * d * r * 0.14 - r * 0.02
          g.fillStyle = '#f6dc7a'; g.beginPath(); g.arc(x, y, 2.6, 0, Math.PI * 2); g.fill()
          g.strokeStyle = '#a8701e'; g.lineWidth = 0.8; g.stroke()
        }
        g.restore()
        // (the cupped petals in front of it, up from below, their ruffled tops over the heart's lower half)
        for (let k = 0; k < 3; k++) {
          g.save(); g.translate((k - 1) * r * 0.3, r * 0.52); g.rotate(-Math.PI / 2 + (k - 1) * 0.38)
          petal(r * (0.6 + (k === 1 ? 0.06 : 0)), r * 0.3, hue.mid, hue.pale, hue.line, 3)
          g.restore()
        }
        g.restore()
      }
      blossom(140, H * 0.4, 92, { deep: '#d55a74', mid: '#ec8fa1', pale: '#fbd5dc', line: 'rgba(140,40,60,0.5)' })
      blossom(380, H * 0.6, 104, { deep: '#e9d9d2', mid: '#f7eee8', pale: '#ffffff', line: 'rgba(120,40,40,0.45)' })
      blossom(158, H * 0.8, 76, { deep: '#e3a88c', mid: '#f4d7c4', pale: '#fffaf1', line: 'rgba(150,105,80,0.45)' })
    }
    // (the linen's weave over it all)
    g.globalAlpha = 0.07
    g.fillStyle = '#ffffff'
    for (let x = 0; x < 512; x += 3) g.fillRect(x, 0, 1, H)
    g.fillStyle = '#000000'
    for (let y = 0; y < H; y += 3) g.fillRect(0, y, 512, 1)
    g.globalAlpha = 1
    // (the women's a deep crimson (緋色), as the women's door noren is red (the owner's: it was a deep wisteria, reading as the men's
    // indigo), its peonies pink and white over it; its band along the top a darker red)
    g.fillStyle = who === 'm' ? '#0f1a2e' : '#5a0c12'; g.fillRect(0, 0, 512, 40)
    g.fillStyle = '#f4efe4'; g.fillRect(0, H - 20, 512, 4)
    g.restore()
  })
}
const WC_STALL_NOREN = { m: wcStallNoren('m'), f: wcStallNoren('f') }

/**
 * The way through to the toilet: one sliding door (引き戸) in a dark wooden frame, shut, wood below and shoji paper on
 * a lattice above, a short indigo noren over it, and the plaque.
 */
/** hinoki floorboards, a warm pale wood, the boards running across */
const WC_FLOOR = canvasTex(128, 64, (g) => {
  g.fillStyle = '#c9a572'
  g.fillRect(0, 0, 128, 64)
  for (let i = 0; i < 4; i++) {
    g.fillStyle = ['#d2b07c', '#c4a06c', '#cfac78', '#c9a572'][i]
    g.fillRect(0, i * 16 + 1, 128, 14)
    g.strokeStyle = 'rgba(110,70,30,0.18)'
    for (let k = 0; k < 6; k++) {
      g.beginPath()
      g.moveTo(0, i * 16 + 3 + k * 2.2)
      g.bezierCurveTo(40, i * 16 + 2 + k * 2.2, 90, i * 16 + 5 + k * 2.2, 128, i * 16 + 3 + k * 2.2)
      g.stroke()
    }
  }
}, true)
/** charred cedar boards (焼杉), the dark upright planks of a traditional wall's foot */
const WC_CEDAR = canvasTex(64, 128, (g) => {
  g.fillStyle = '#2a1d15'
  g.fillRect(0, 0, 64, 128)
  for (let i = 0; i < 4; i++) {
    g.fillStyle = ['#33241a', '#2c1f16', '#382818', '#2e2018'][i]
    g.fillRect(i * 16 + 1, 0, 14, 128)
    g.strokeStyle = 'rgba(0,0,0,0.35)'
    for (let k = 0; k < 6; k++) {
      g.beginPath()
      g.moveTo(i * 16 + 3 + k * 2, 0)
      g.bezierCurveTo(i * 16 + 2 + k * 2, 40, i * 16 + 5 + k * 2, 90, i * 16 + 3 + k * 2, 128)
      g.stroke()
    }
  }
}, true)
/**
 * A toilet in the dark (its switch by the door off: the owner's): its rooms' insides dimmed, as the lamp's paper is, by a see-through black
 * box filling each (its faces toward the eye only, so whatever's in it is darkened once, seen from above or through the door); fading in
 * and out as the switch goes, not drawn at all while the light's on. `rooms`: each one's size across x, up and across z, and its middle.
 */
const WC_DARK = new THREE.BoxGeometry(1, 1, 1)
/** the daylight from the stall's window on its floor: a soft fan, barred by the window's lattice */
const WC_WINDOW_FALL = (() => {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas'); c.width = c.height = 128
  const g = c.getContext('2d')!
  const gr = g.createRadialGradient(64, 0, 4, 64, 0, 110)
  gr.addColorStop(0, 'rgba(255,248,230,0.9)'); gr.addColorStop(1, 'rgba(255,248,230,0)')
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128)
  g.globalCompositeOperation = 'destination-out'
  g.fillStyle = 'rgba(0,0,0,0.7)'
  for (const x of [34, 64, 94]) g.fillRect(x - 3, 0, 6, 128)
  for (const y of [42, 84]) g.fillRect(0, y - 3, 128, 6)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  return t
})()
/** how far in from a room's walls its dark (and its warm light) is laid (item 489, the owner's 「這有奇怪的陰影，要拿掉」): laid to the
 * walls, its faces lay in theirs (its front in the doorway's plane, up past the door to the ceiling; its sides in the walls' faces), and
 * seen from the shop or from above, a dark band ran over the plaster above the doors and down beside the stalls' noren, flickering with the
 * walls it shared a plane with. In from them, the walls in front of it hide it and nothing outside the room is darkened */
const WC_DARK_IN = 0.02
function WcDark({ who, rooms }: { who: 'm' | 'f'; rooms: [number, number, number, number, number][] }) {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0, depthWrite: false }), [])
  /** and the other way: its light on after dark, its rooms warmly lit within (item 126, the owner's, 2026-11-15: "the toilets' light at night
   * isn't right: shut it's fine, open the door and it gives itself away": the floor outside the door bright with its spill, the room inside
   * as dim as the shop's night), laid on once over what's in them */
  const warm = useMemo(() => new THREE.MeshBasicMaterial({ color: WC_ROOM_WARM, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
    toneMapped: false }), [])
  useEffect(() => () => { mat.dispose(); warm.dispose() }, [mat, warm])
  const group = useRef<THREE.Group>(null)
  const lit = useRef<THREE.Group>(null)
  useFrame(() => {
    const on = getLights().wc[who], sky = skyNow()
    const want = wcDarkness(on, sky)
    mat.opacity += (want - mat.opacity) * 0.08
    if (group.current) group.current.visible = mat.opacity > 0.01
    const glow = on ? (sky === 'night' ? 1 : sky === 'day' ? 0 : 0.5) : 0
    warm.opacity += (glow - warm.opacity) * 0.08
    if (lit.current) lit.current.visible = warm.opacity > 0.01
  })
  return (
    <>
      <group ref={group} visible={false}>
        {rooms.map(([sx, sy, sz, x, z], i) => <mesh key={i} geometry={WC_DARK} material={mat} position={[x, sy / 2, z]} scale={[sx - 2 * WC_DARK_IN, sy, sz - 2 * WC_DARK_IN]} renderOrder={4} />)}
      </group>
      <group ref={lit} visible={false}>
        {rooms.map(([sx, sy, sz, x, z], i) => <mesh key={i} geometry={WC_DARK} material={warm} position={[x, sy / 2, z]} scale={[sx - 2 * WC_DARK_IN, sy, sz - 2 * WC_DARK_IN]} renderOrder={4} raycast={() => {}} />)}
      </group>
    </>
  )
}
/** how much warm light a lit toilet's rooms are given after dark (added, item 126) */
const WC_ROOM_WARM = new THREE.Color('#3a2a16')
/** a wall of the toilet's rooms, facing into them: charred cedar to the waist with a rail along it, cream plaster over; `len` along it, its
 * middle at `at`, turned `yaw` (unturned, it faces +z); the cedar's boards their own width whatever its length. `cut`: the wall that's cut
 * away for the view from outside (seen from behind, its faces aren't drawn), its rail a strip on its face, not a bar left floating */
export function WcWall({ len, at, yaw, top, cut = false }: { len: number; at: [number, number, number]; yaw: number; top: number; cut?: boolean }) {
  const geo = useMemo(() => {
    const lower = new THREE.PlaneGeometry(len, 0.9)
    const uv = lower.attributes.uv as THREE.BufferAttribute
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (len / 0.3), uv.getY(i) * (0.9 / 0.5))
    return { lower, upper: new THREE.PlaneGeometry(len, top - 0.9), rail: cut ? new THREE.PlaneGeometry(len, 0.035) : new THREE.BoxGeometry(len, 0.035, 0.03) }
  }, [len, top, cut])
  useEffect(() => () => { geo.lower.dispose(); geo.upper.dispose(); geo.rail.dispose() }, [geo])
  return (
    <group position={at} rotation-y={yaw}>
      {/* (lifted a touch by its own grain: from above, in the corners behind the toilet, the charred cedar went a dead black) */}
      <mesh geometry={geo.lower} position-y={0.45}><meshToonMaterial color="#ffffff" map={WC_CEDAR} emissive="#ffffff" emissiveMap={WC_CEDAR} emissiveIntensity={0.22} /></mesh>
      <mesh geometry={geo.upper} position-y={0.9 + (top - 0.9) / 2}><meshToonMaterial color="#ece0c6" /></mesh>
      <mesh geometry={geo.rail} position={[0, 0.9, cut ? 0.003 : 0.012]}><meshToonMaterial color="#6a4428" /></mesh>
    </group>
  )
}
/** how thick the rooms' walls are drawn behind their faces (the owner's: the partitions between the men's and the women's, and between each
 * washroom and its toilet, were bare planes, paper-thin seen from above): the men's and the women's rooms 0.12 apart, half each */
export const WC_T = 0.06
/** an unseen sheet over a wall's face that takes the pointer and stops it there: what's behind the wall isn't pointed at through it */
const stopHere = (e: { stopPropagation: () => void }) => e.stopPropagation()
const WC_BLOCK_MAT = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
function WcBlock({ len, at, yaw, top }: { len: number; at: [number, number, number]; yaw: number; top: number }) {
  return (
    <mesh position={[at[0], top / 2, at[2]]} rotation-y={yaw} material={WC_BLOCK_MAT} onPointerOver={stopHere} onPointerMove={stopHere} onClick={stopHere}>
      <planeGeometry args={[len, top]} />
    </mesh>
  )
}
/** how far behind the shop's wall face (the rooms' x = 0) their walls' bodies begin: never in its face */
const WC_IN = 0.02
/** a stretch of solid wall in the rooms' frame, from x0 to x1, y0 to y1, z0 to z1 (either way round): its top and its cut end seen from
 * outside, in a plaster a touch deeper than the walls' faces */
export function WcMass({ x, y, z, cap = true }: { x: [number, number]; y: [number, number]; z: [number, number]; cap?: boolean }) {
  const [x0, x1] = [Math.min(...x), Math.max(...x)], [z0, z1] = [Math.min(...z), Math.max(...z)]
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, lx = x1 - x0, lz = z1 - z0
  // (outside, as the shop's own walls are (the owner's: a wing of the house, not a white box stuck on): dark cedar boards to the waist, plaster
  // over; along its top a dark wooden cap a little wider than the wall, so it's no paper-thin edge seen from above)
  const split = Math.min(Math.max(WC_WAIST, y[0]), y[1])
  return (
    <>
      {split > y[0] && <mesh position={[cx, (y[0] + split) / 2, cz]}><boxGeometry args={[lx, split - y[0], lz]} /><meshToonMaterial color="#3e2716" /></mesh>}
      {y[1] > split && <mesh position={[cx, (split + y[1]) / 2, cz]}><boxGeometry args={[lx, y[1] - split, lz]} /><meshToonMaterial color="#e2d4b6" /></mesh>}
      {cap && <mesh position={[cx, y[1] + WC_CAP / 2, cz]}><boxGeometry args={[lx + 0.02, WC_CAP, lz + 0.024]} /><meshToonMaterial color="#2e1c10" /></mesh>}
    </>
  )
}
/** the height of the rooms' dark cedar outside (their wainscot's), and of the dark wooden cap along their walls' tops */
const WC_WAIST = 0.9
const WC_CAP = 0.03
/** the slatted ceiling over a room (the owner's: from above, the toilet not looked straight down into, the lamps' light showing between
 * the slats): cedar slats across it from the shop's wall to the back, laid on the walls' caps, a gap between each two; `z` across it */
function WcSlats({ x, z, y }: { x: [number, number]; z: [number, number]; y: number }) {
  const [z0, z1] = [Math.min(...z), Math.max(...z)]
  const n = Math.max(2, Math.round((z1 - z0) / 0.1))
  const lx = x[1] - x[0]
  return (
    <>
      {Array.from({ length: n }, (_, k) => (
        <mesh key={k} position={[(x[0] + x[1]) / 2, y, z0 + ((k + 0.5) * (z1 - z0)) / n]}>
          <boxGeometry args={[lx, 0.022, 0.04]} /><meshToonMaterial color="#4a2e1a" />
        </mesh>
      ))}
      {/* (two bearers under them along each end, as they're laid on) */}
      {[x[0] + 0.03, x[1] - 0.03].map((bx) => (
        <mesh key={bx} position={[bx, y - 0.022, (z0 + z1) / 2]}><boxGeometry args={[0.04, 0.022, z1 - z0]} /><meshToonMaterial color="#2e1c10" /></mesh>
      ))}
    </>
  )
}
/** the washrooms' finer things (blender/wcdecor.py; the owner's, 2026-11-11: the plants finer, the lamp less plain and brighter): the hanging
 * wall lantern, the moss ball on its dish, the camellia in its bamboo vase; in the room's toon light, the leaves and petals seen from both sides,
 * inked and folded together by material, made once each and copied (sharing their shapes) */
const WCDECOR_URL = import.meta.env.BASE_URL + 'models/wcdecor.glb'
useGLTF.preload(WCDECOR_URL)
const WCDECOR_MADE = new Map<string, THREE.Object3D>()
const THIN = /Leaf|Petal|Fern|LanternPaper/
function useWcDecor(name: 'WcLantern' | 'Kokedama' | 'Camellia') {
  const gltf = useGLTF(WCDECOR_URL) as unknown as { scene: THREE.Group }
  return useMemo(() => {
    let base = WCDECOR_MADE.get(name)
    if (!base) {
      const r = gltf.scene.getObjectByName(name)!.clone(true)
      r.position.set(0, 0, 0)
      const mats = new Map<THREE.Material, THREE.Material>()
      r.traverse((o) => {
        const m = o as THREE.Mesh
        if (!m.isMesh) return
        const src = m.material as THREE.MeshStandardMaterial
        let t = mats.get(src)
        if (!t) {
          t = src.name === 'WcdBronze' ? new THREE.MeshStandardMaterial({ color: src.color.clone(), metalness: 0.7, roughness: 0.35 })
            : new THREE.MeshToonMaterial({ color: src.color.clone(), map: src.map ?? null, side: THIN.test(src.name) ? THREE.DoubleSide : THREE.FrontSide })
          t.name = src.name
          mats.set(src, t)
        }
        m.material = t
        m.receiveShadow = true
      })
      inkModel(r, (m) => THIN.test(((m as THREE.Mesh).material as THREE.Material | undefined)?.name ?? '') || /Paper/.test(m.name), { width: 0.0012, weld: true })
      // (the lantern's paper left on its own: the game lights it)
      if (name !== 'WcLantern') { plainColours(r); base = mergeByMaterial(r) } else base = r
      WCDECOR_MADE.set(name, base)
    }
    return base.clone(true)
  }, [gltf, name])
}
/** a washroom's plant on its counter (blender/wcdecor.py) */
function WcPlant({ name }: { name: 'Kokedama' | 'Camellia' }) {
  const obj = useWcDecor(name)
  return <primitive object={obj} />
}
/** the soft glow round a lit lamp on a wall (no light of its own: the owner's rule, no lights added or switched), brighter round the one by
 * the washroom's door; it fades with the switch */
const WC_HALO = (() => {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas'); c.width = c.height = 128
  const g = c.getContext('2d')!
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64)
  gr.addColorStop(0, 'rgba(255,226,170,0.85)'); gr.addColorStop(0.35, 'rgba(255,214,150,0.35)'); gr.addColorStop(1, 'rgba(255,214,150,0)')
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  return t
})()
const WC_HALO_GEO = new THREE.PlaneGeometry(1, 1)
function WcHalo({ who, size, strength }: { who: 'm' | 'f'; size: number; strength: number }) {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ map: WC_HALO, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, toneMapped: false }), [])
  useEffect(() => () => mat.dispose(), [mat])
  useFrame(() => { mat.opacity += ((getLights().wc[who] ? strength : 0) - mat.opacity) * 0.08 })
  return <mesh geometry={WC_HALO_GEO} material={mat} scale={size} renderOrder={5} raycast={() => null} />
}
/** a hanging wall lantern (掛け行灯, blender/wcdecor.py) on a wall: its backboard on the wall at `at`, the wall facing `yaw` (unturned, +z); its
 * washi lit on the switch by the door (WcLamp's way), a soft glow round it on the wall; `bright`, the one by the washroom's door, its glow
 * the stronger and wider */
function WcSconce({ who, at, yaw, bright = false }: { who: 'm' | 'f'; at: [number, number, number]; yaw: number; bright?: boolean }) {
  // (the hanging wall lantern again, the better one (item 127, the owner's, 2026-11-15: "not the one it went back to: the upgraded one you
  // made"): blender/wcdecor.py's WcLantern, a round washi shade hung off a bent arm from a backboard on the wall, its paper lit on the
  // switch; it had been put back to a small box of a lantern on 2026-11-12)
  const obj = useWcDecor('WcLantern')
  const paper = useRef<THREE.MeshBasicMaterial | null>(null)
  const k = useRef(0.4)
  useMemo(() => {
    const m = new THREE.MeshBasicMaterial({ color: '#fff1cc', toneMapped: false })
    obj.traverse((o) => { if ((o as THREE.Mesh).isMesh && /Paper/.test(o.name)) (o as THREE.Mesh).material = m })
    paper.current = m
  }, [obj])
  useEffect(() => () => paper.current?.dispose(), [])
  useFrame(() => {
    k.current += ((getLights().wc[who] ? 1 : 0.12) - k.current) * 0.08
    paper.current?.color.set('#fff1cc').multiplyScalar(k.current)
  })
  return (
    <group position={[at[0], at[1] - 0.08, at[2]]} rotation-y={yaw}>
      <primitive object={obj} />
      <group position={[0, 0, 0.004]}><WcHalo who={who} size={bright ? 0.75 : 0.5} strength={bright ? 0.9 : 0.6} /></group>
    </group>
  )
}
/** a floor of hinoki boards, `wx` by `wz`, its middle at `at` (the boards their own width whatever its size) */
export function WcFloor({ wx, wz, at }: { wx: number; wz: number; at: [number, number, number] }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(wx, wz)
    const uv = g.attributes.uv as THREE.BufferAttribute
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (wx / 0.4), uv.getY(i) * (wz / 0.4))
    return g
  }, [wx, wz])
  useEffect(() => () => geo.dispose(), [geo])
  // (a shade dimmer than its hinoki (the owner's: the rooms dim and private, the light on the washstand and the noren by the lamps))
  return <mesh geometry={geo} position={at} rotation-x={-Math.PI / 2}><meshToonMaterial color="#9c9286" map={WC_FLOOR} /></mesh>
}
/**
 * The rooms behind a toilet's door, in the Japanese way (the owner's: the door slid open shows the washstand and its mirror; the toilet's
 * round the corner). Straight in, the washroom: the washstand against its back wall facing the door (blender/wc.py: a hinoki counter on a
 * dark cedar cabinet with lattice doors, a Shigaraki bowl, a brass tap whose water runs at a click, a round mirror over it), a bamboo vase
 * of camellia on its counter, an indigo hand towel on a bamboo rod on the wall beside it, the お手洗い plaque, a slatted duckboard (簀の子)
 * before the washstand and the slippers by the door. Off its side, away from the other toilet, through an opening hung with a long noren,
 * the toilet's own little room: the toilet at its far end with its cistern to the wall (a small basin on its top), a shoji window over it,
 * the paper on its holder and the washlet's remote on one wall, the brush in the corner; in the women's the Otohime, the sanitary bin and a
 * basket of sanitary pads (the men's has no Otohime: the owner's). Floorboards of pale hinoki, charred-cedar planks to the waist and cream
 * plaster above, the walls between the rooms solid (WC_T behind each face), open above (no ceiling or beams: seen from above, cut open, the
 * owner had the dark beams taken away), a paper lamp on a wall of each room, lit on the switch by the door. Its frame: x from the door's wall back
 * (WC_ROOM.D deep), z across the door from its middle; the toilet's room is on the side `s`.
 */
/** a pair of slippers set side by side, toes out: rounded soles, a cloth band over the toes, in `sole` and `band` */
function SlipperPair({ sole, band }: { sole: string; band: string }) {
  return (
    <>
      {[-1, 1].map((sd) => (
        <group key={sd} position={[0.15, 0.03, sd * 0.055]} rotation-y={sd * 0.06}>
          <mesh position-y={0.008} scale={[0.13, 0.016, 0.046]}><cylinderGeometry args={[1, 1, 1, 18]} /><meshToonMaterial color={sole} /></mesh>
          <mesh position-y={0.017} scale={[0.125, 0.004, 0.042]}><cylinderGeometry args={[1, 1, 1, 18]} /><meshToonMaterial color={band} /></mesh>
          <mesh position={[-0.055, 0.024, 0]} rotation-x={Math.PI / 2} scale={[1, 1, 0.8]}><torusGeometry args={[0.04, 0.016, 6, 16, Math.PI]} /><meshToonMaterial color={band} /></mesh>
        </group>
      ))}
    </>
  )
}
/**
 * The slippers at a toilet's door (item 244, of item 203's review: the toilet slippers stood there whoever was in): its own pair, in the
 * toilet's colour, by the door while nobody's in; someone in, theirs are on their feet and the shop's house slippers they stepped out of are
 * left there instead, toes out, a plainer brown pair (the figures have no feet to show it on: the floor by the door does). Back out, the
 * other way round. Both made at the start (two little batches), only which shows changed.
 */
function WcSlippers({ who }: { who: 'm' | 'f' }) {
  const own = useRef<THREE.Group>(null), house = useRef<THREE.Group>(null)
  useFrame(() => {
    const inside = TOILETS[who].inside > 0
    if (own.current && own.current.visible === inside) own.current.visible = !inside
    if (house.current && house.current.visible !== inside) house.current.visible = inside
  })
  return (
    <>
      <group ref={own}><StaticBatch plain><SlipperPair sole="#e8dcc4" band={who === 'm' ? '#2c3e66' : '#9a2a2a'} /></StaticBatch></group>
      <group ref={house} visible={false}><StaticBatch plain><SlipperPair sole="#d9c6a2" band="#6b4a2e" /></StaticBatch></group>
    </>
  )
}
function WcRoom({ w, h, who }: { w: number; h: number; who: 'm' | 'f' }) {
  const { D, E, X0 } = WC_ROOM
  const s = who === 'm' ? -1 : 1
  const top = h + 0.3
  const name = who === 'm' ? '男廁' : '女廁'
  // (the toilet's room: from X0 back to the back wall, from the washroom's side E on along the wall)
  const SW = D - X0, SX = (X0 + D) / 2, SZ = s * (w / 2 + E / 2)
  // (the long noren across the way into it: two panels, each its half of the one picture, a slit between)
  const OP = WC_STALL_W, NL = WC_STALL_L
  const noren = useMemo(() => [-1, 1].map((sd) => {
    const pw = (OP - 0.02) / 2
    // (hung in soft folds (the owner's: it read as a flat board): the cloth waved across, three folds a panel, the waves easing out to
    // nothing at the rod where it's gathered, deepest at the hem; its normals from the waves, so its light runs down the folds)
    const g = new THREE.PlaneGeometry(pw, NL, 18, 6)
    const pos = g.attributes.position as THREE.BufferAttribute
    for (let k = 0; k < pos.count; k++) {
      const x = pos.getX(k), y = pos.getY(k)
      const down = (NL / 2 - y) / NL
      pos.setZ(k, Math.sin((x / pw + 0.5) * Math.PI * 6 + sd) * 0.012 * (0.35 + 0.65 * down))
    }
    g.computeVertexNormals()
    const uv = g.attributes.uv as THREE.BufferAttribute
    const u0 = sd < 0 ? 0 : (pw + 0.02) / OP, u1 = u0 + pw / OP
    for (let k = 0; k < uv.count; k++) uv.setX(k, u0 + uv.getX(k) * (u1 - u0))
    return { sd, g, x: SX + sd * (pw + 0.02) / 2 }
  }), [OP, NL, SX])
  useEffect(() => () => noren.forEach((n) => n.g.dispose()), [noren])
  const W2 = SW / 2
  // (the noren's rod: just under the lintel, in the middle of the wall's depth)
  const ROD_Y = h - 0.035, ROD_Z = w / 2 + WC_T / 2
  return (
    <group>
      {/* (dark in it while its switch by the door is off) */}
      <WcDark who={who} rooms={[[D, top - 0.03, w, D / 2, 0], [SW, top - 0.03, E, SX, SZ]]} />
      <StaticBatch plain>
      <WcFloor wx={D} wz={w} at={[D / 2, 0.004, 0]} />
      <WcFloor wx={SW} wz={E} at={[SX, 0.004, SZ]} />
      {/* the back wall, behind the washstand and on along the toilet's room; the washroom's other side; the short stretch by the door on the
          toilet's side, and the plaster over the way through; the toilet's room's near wall and its end */}
      <WcWall len={w + E} at={[D, 0, s * E / 2]} yaw={-Math.PI / 2} top={top} cut />
      <WcWall len={D} at={[D / 2, 0, -s * w / 2]} yaw={s > 0 ? 0 : Math.PI} top={top} />
      <WcWall len={X0} at={[X0 / 2, 0, s * w / 2]} yaw={s > 0 ? Math.PI : 0} top={top} />
      <WcWall len={E} at={[X0, 0, SZ]} yaw={Math.PI / 2} top={top} />
      <WcWall len={SW} at={[SX, 0, s * (w / 2 + E)]} yaw={s > 0 ? Math.PI : 0} top={top} />
      {/* the walls' bodies behind their faces, solid to the top (cut open at the back wall, seen from outside): the wall toward the other
          toilet's rooms (theirs the other half of it); by the door, the short wall and the depth of the shop's wall before the toilet's room,
          one block; over the way through, the plaster's lintel; the toilet's room's end. Each from a little behind the shop's wall (WC_IN):
          from it, their fronts were in its face and fought it, flickering, the wainscot beside the doors showing plaster (the owner saw
          both) */}
      <WcMass x={[WC_IN, D]} y={[0, top]} z={[-s * (w / 2 + 0.002), -s * (w / 2 + WC_T)]} />
      <WcMass x={[WC_IN, X0 - 0.002]} y={[0, top]} z={[s * (w / 2 + 0.002), s * (w / 2 + E)]} />
      <WcMass x={[X0, D]} y={[h, top]} z={[s * w / 2, s * (w / 2 + WC_T)]} />
      {/* (the toilet's room's end, one block from the shop's wall to the back (item 425, the owner's 「接縫修掉，要無縫接軌」): it began at the
          toilet's room (X0), the short wall's block beside it taken out to its outer face too and stopping 2 mm short, and through the gap
          between them a line ran down the end wall's face, seen from outside) */}
      <WcMass x={[WC_IN, D]} y={[0, top]} z={[s * (w / 2 + E + 0.002), s * (w / 2 + E + WC_T)]} />
      {/* (the doorway's jambs lined inside in dark cedar, a board each side a hand deep into the room up to the lintel: the wall beside the
          post began bare, its plaster seen nearly edge on as a pale sliver and its wainscot as a dark slot down past the noren (the owner's)) */}
      {[-1, 1].map((k) => (
        <mesh key={k} position={[0.045, h / 2, k * (w / 2 - 0.006)]}><boxGeometry args={[0.09, h, 0.012]} /><meshToonMaterial color="#3d2414" /></mesh>
      ))}
      {/* (the back wall's top capped too, along the washroom and the toilet's room) */}
      {/* (its outer end flush with the end wall's cap (item 425): it ran 3 cm on past it, a lump over the corner) */}
      <mesh position={[D + 0.012, top + WC_CAP / 2, s * (E + WC_T / 2) / 2]}><boxGeometry args={[0.05, WC_CAP, w + E + 1.5 * WC_T + 0.024]} /><meshToonMaterial color="#2e1c10" /></mesh>
      {/* (the slatted ceilings, over the washroom and the toilet's room, on the caps) */}
      <WcSlats x={[WC_IN, D]} z={[-s * (w / 2 + 0.01), s * (w / 2 + 0.01)]} y={top + WC_CAP + 0.011} />
      <WcSlats x={[X0, D]} z={[s * (w / 2 + WC_T - 0.01), s * (w / 2 + E + 0.01)]} y={top + WC_CAP + 0.011} />
      {/* (dark posts at the outer corners: the toilet's room's far corner, and, once for both, the corner between the two toilets) */}
      {/* (the far corner's: 2 mm proud of the end wall (item 425: centred on its face, it stood 3.5 cm out, past the shop's base under it
          once the base was taken in flush)) */}
      <mesh position={[D + 0.012, (top + WC_CAP) / 2, s * (w / 2 + E + WC_T - 0.0165)]}><boxGeometry args={[0.07, top + WC_CAP, 0.037]} /><meshToonMaterial color="#2e1c10" /></mesh>
      {s < 0 && <mesh position={[D + 0.012, (top + WC_CAP) / 2, -s * (w / 2 + WC_T)]}><boxGeometry args={[0.07, top + WC_CAP, 0.07]} /><meshToonMaterial color="#2e1c10" /></mesh>}
      {/* (the way through: a cedar post at the short wall's end, as deep as the wall; the noren's rod across it just under the lintel, in the
          wall's depth, from the post's face to the back wall's, each end in a little wooden socket (竿受け) fixed there: it hung on two
          brackets under the lintel that were fixed to nothing, the owner's) */}
      <mesh position={[X0 + 0.02, h / 2, s * (w / 2 + WC_T / 2 - 0.005)]}><boxGeometry args={[0.04, h, WC_T + 0.01]} /><meshToonMaterial color="#5a3a22" /></mesh>
      <mesh position={[(X0 + 0.04 + D) / 2, ROD_Y, s * ROD_Z]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.008, 0.008, D - X0 - 0.04, 8]} /><meshToonMaterial color="#3a2416" /></mesh>
      {[X0 + 0.04 + 0.011, D - 0.011].map((x) => <mesh key={x} position={[x, ROD_Y, s * ROD_Z]}><boxGeometry args={[0.022, 0.034, 0.034]} /><meshToonMaterial color="#5a3a22" /></mesh>)}
      </StaticBatch>
      {/* (the walls stop the pointer (the owner's: over the washroom's wall, it found the drinks fridge behind and offered to open it): an
          unseen sheet over each wall's face but the cut one, taking the pointer and passing it on to nothing) */}
      <WcBlock len={D} at={[D / 2, 0, -s * w / 2]} yaw={s > 0 ? 0 : Math.PI} top={top} />
      <WcBlock len={X0} at={[X0 / 2, 0, s * w / 2]} yaw={s > 0 ? Math.PI : 0} top={top} />
      <WcBlock len={E} at={[X0, 0, SZ]} yaw={Math.PI / 2} top={top} />
      <WcBlock len={SW} at={[SX, 0, s * (w / 2 + E)]} yaw={s > 0 ? Math.PI : 0} top={top} />
      {/* the long noren across the way to the toilet, its two panels hanging from the rod (the noren and the rod stand still: batched apart,
          their picture each its own) */}
      <Movable id={`wc2-${who}-noren`} label={`隔間暖簾（${name}）`}><StaticBatch plain>
        {noren.map(({ sd, g, x }) => (
          <mesh key={sd} geometry={g} position={[x, ROD_Y - NL / 2, s * ROD_Z]}>
            <meshToonMaterial color="#ffffff" map={WC_STALL_NOREN[who]} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </StaticBatch></Movable>
      {/* ---- the washroom: the washstand facing the door, its tap live (Restroom) */}
      <Movable id={`wc2-${who}-basin`} label={`洗手台與鏡子（${name}）`}>
        <group position={[D, 0, 0]}><WashstandLive who={who} /></group>
      </Movable>
      {/* (the men's: a moss ball (苔玉) on a dark, near-black stoneware dish and a stub of bamboo by it (the owner's: the men's and women's
          set apart); the women's its bamboo vase of camellia) */}
      {who === 'm' && (
        <Movable id="wc2-m-moss" label="苔玉（男廁）">
          <group position={[D - 0.14, 0.764, 0.19]}><WcPlant name="Kokedama" /></group>
        </Movable>
      )}
      {/* (a bamboo vase of camellia on the washstand's counter, beside the bowl, clear of the counter's back rail; in the women's on the bowl's
          left, its soap on the right; the men's the other way round, its moss ball on the right (the owner's, 2026-11-06)) */}
      {who === 'f' && <Movable id={`wc2-${who}-vase`} label={`竹花瓶（${name}）`}>
        <group position={[D - 0.14, 0.764, -0.19]}><WcPlant name="Camellia" /></group>
      </Movable>}
      {/* (no towel on a rod: a paper towel dispenser by the washstand and a hand dryer past it toward the door (the owner's: swapped), on the wall beside it,
          where hands are held out after washing (GuestBar3D steps them over to it, its marker wc-dryer-<who>)) */}
      {/* (the dryer on the wall, blowing down (the owner's, 2026-11-10: a light one, not the Jet Towel's upright body), over the wainscot's
          rail, its nozzle at 1.02 so the hands it dried in the Jet Towel's slot (0.88: the owner's, 0.85 to 0.95) are held some 14 cm under
          it; the towel box beside it, clear over the rail (it sat on it)) */}
      <Movable id={`wc2-${who}-dryer`} label={`烘手機（${name}）`}>
        <group position={[D - 0.59, 1.3, -s * (w / 2 - 0.004)]} rotation-y={s > 0 ? 0 : Math.PI}>
          <WcDryer who={who} />
          <group name={`wc-dryer-${who}`} position={[0, -1.3, 0.4]} />
        </group>
      </Movable>
      <Movable id={`wc2-${who}-towelbox`} label={`擦手紙盒（${name}）`}>
        <group position={[D - 0.26, 1.25, -s * (w / 2 - 0.004)]} rotation-y={s > 0 ? 0 : Math.PI}><WcTowelBox who={who} /></group>
      </Movable>
      {/* (no お手洗い plaque on the wall: the owner's, the wall kept clean) */}
      <Movable id={`wc2-${who}-duck`} label={`簀之子踏板（${name}）`}><StaticBatch plain>
      {/* the slatted duckboard (簀の子) before the washstand, where hands are washed */}
      <group position={[D - 0.56, 0, 0]}>
        {Array.from({ length: 9 }, (_, k) => (
          <mesh key={k} position={[0, 0.02, (k - 4) * 0.052]}><boxGeometry args={[0.2, 0.02, 0.04]} /><meshToonMaterial color="#d8c08a" /></mesh>
        ))}
        {[-1, 1].map((sd) => <mesh key={sd} position={[0, 0.008, sd * 0.2]}><boxGeometry args={[0.2, 0.016, 0.03]} /><meshToonMaterial color="#6a4a28" /></mesh>)}
      </group>
      </StaticBatch></Movable>
      {/* (the toilet slippers by the door, and the house slippers left there in their place while someone's in (item 244)) */}
      <Movable id={`wc-${who}-slippers`} label={`室內拖鞋（${name}）`}><WcSlippers who={who} /></Movable>
      <Movable id={`wc2-${who}-lamp`} label={`紙燈（${name}）`}>
      {/* a paper lamp on the wall toward the other toilet, on its arm: on a motion sensor, bright while someone's in or the door's open, dim
          otherwise */}
      <WcSconce who={who} at={[D * 0.62, h - 0.02, -s * w / 2]} yaw={s > 0 ? 0 : Math.PI} bright />
      </Movable>
      {/* ---- the toilet's room, in its own frame: x from the way in (0) to its far end (E), z across it */}
      <group position={[SX, 0, s * w / 2]} rotation-y={-s * Math.PI / 2}>
        <Movable id={`wc2-${who}-toilet`} label={`馬桶（${name}）`}>
        {/* the toilet with its washlet, facing the way in, its cistern to the far wall (blender/wc.py; Restroom: its lid, flush, scrubbing) */}
        {/* (as modelled: its washlet's panel on the sitter's left (+z), the wall remote's side; the paper on the right, to the right hand
            (the owner's: the panel and the paper were both on the right, crowding the one hand)) */}
        <ToiletLive who={who} at={[E - 0.4, 0, 0]} />
        {/* (where a customer sits on it, and the way they face sat there (GuestBar3D: they walk in round the corner, sit, and get up again)) */}
        <group name={`wc-seat-${who}`} position={[E - 0.5, 0, 0]} userData={{ marker: true }} />
        <group name={`wc-seatface-${who}`} position={[E - 1.0, 0, 0]} userData={{ marker: true }} />
        </Movable>
        {/* (marks on the floor before it as it gets dirty) */}
        <WcMarks who={who} at={[0.03, 0.006, 0]} size={[0.3, 0.5]} />
        <StaticBatch plain>
        {/* (the shoji window by the toilet: washi in a dark lattice, lit from outside; on the back wall, the shop's outside, for both toilets
            alike (the owner's: on each one's end wall, they faced opposite ways)) */}
        <group position={[E - 0.42, 1.38, -s * (W2 - 0.006)]} rotation-y={s > 0 ? 0 : Math.PI}>
          {/* (daylight through the washi, soft and white (the owner's: it read grey, a model shut in the dark): drawn after the room's dark
              so its switch doesn't dim the sky outside) */}
          <mesh position-z={0.0015} renderOrder={5}><planeGeometry args={[0.46, 0.34]} /><meshBasicMaterial color="#fff8ea" toneMapped={false} transparent depthWrite={false} /></mesh>
          {[-1, 0, 1].map((k) => <mesh key={`v${k}`} position={[k * 0.115, 0, 0.003]}><planeGeometry args={[0.012, 0.34]} /><meshToonMaterial color="#3a2416" /></mesh>)}
          {[-0.5, 0.5].map((k) => <mesh key={`h${k}`} position={[0, k * 0.11, 0.003]}><planeGeometry args={[0.46, 0.012]} /><meshToonMaterial color="#3a2416" /></mesh>)}
          {[[0, 0.18, 0.5, 0.03], [0, -0.18, 0.5, 0.03], [-0.24, 0, 0.03, 0.4], [0.24, 0, 0.03, 0.4]].map(([x, y, sw, sh]) => (
            <mesh key={`${x}${y}`} position={[x, y, 0.004]}><planeGeometry args={[sw, sh]} /><meshToonMaterial color="#2e1d12" /></mesh>
          ))}
        </group>
        </StaticBatch>
        {/* (its light falling in: a faint fan of it on the floor below the window, barred by its lattice) */}
        <mesh position={[E - 0.42, 0.012, -s * (W2 - 0.3)]} rotation-x={-Math.PI / 2} renderOrder={5} raycast={() => {}}>
          <planeGeometry args={[0.5, 0.5]} />
          <meshBasicMaterial map={WC_WINDOW_FALL ?? undefined} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} opacity={0.5} />
        </mesh>
        {/* (the remote over the wainscot's rail (it sat on it, the rail through it), along toward the toilet, clear of the doorway's post (it
            was half behind it), its flush unit on the toilet's side of it; on the wall the camera sees (the men's room's turned the other
            way: on its left-hand wall, the cut-away one, it was seen from behind; the owner's)) */}
        <Movable id={`wc2-${who}-remote3`} label={`免治馬桶遙控器（${name}）`}>
          <group position={[E - 0.55, 1.06, who === 'f' ? W2 : -W2]} rotation-y={who === 'f' ? Math.PI : 0}><WcRemote who={who} flushAt={who === 'f' ? -0.15 : 0.15} /></group>
        </Movable>
        {/* (the Otohime in the women's only: the owner's) */}
        {who === 'f' && (
          <Movable id="wc2-f-oto" label="音姬（女廁）">
            <group position={[E, 1.0, W2 - 0.12]} rotation-y={-Math.PI / 2}><WcOtohime who={who} /></group>
          </Movable>
        )}
        <Movable id={`wc2-${who}-brush`} label={`馬桶刷（${name}）`}>
          {/* (in the corner by the cistern on the side the camera sees: the men's room's turned the other way, its brush was behind the
              toilet (the owner's: "the men's has none")) */}
          <WcBrush who={who} at={[E - 0.08, 0, who === 'f' ? -W2 + 0.08 : W2 - 0.08]} bowl={[E - 0.43, 0.31, 0]} />
        </Movable>
        <Movable id={`wc2-${who}-paper`} label={`衛生紙架（${name}）`}>
          {/* the paper, on its walnut holder on the wall by the toilet (Restroom: thinning with use, a new roll at a click) */}
          {/* (just forward of the seat, clear of the lid as it lifts, on the wall the camera sees in each (the owner's, 2026-11-12: the
              women's on the same side as the men's; it was on the far wall in theirs, the room being turned the other way)) */}
          <group position={[E - 0.62, 0.62, who === 'f' ? W2 : -W2]} rotation-y={who === 'f' ? Math.PI : 0}><WcPaper who={who} /></group>
        </Movable>
        {who === 'f' && (
          <Movable id="wc2-f-bin" label="生理用品垃圾桶（女廁）">
            <group position={[E - 0.1, 0, W2 - 0.1]} rotation-y={Math.PI}><WcBin /></group>
          </Movable>
        )}
        {who === 'f' && (
          <Movable id="wc2-f-pads" label="衛生棉（女廁）">
            {/* (the sanitary pads, free to take, on their shelf on the wall across from the paper) */}
            {/* (along toward the cistern, clear of the remote (the owner's)) */}
            <group position={[E - 0.22, 0.98, W2]} rotation-y={Math.PI}><WcPads /></group>
          </Movable>
        )}
        <Movable id={`wc2-${who}-lamp2`} label={`隔間紙燈（${name}）`}>
          {/* (the toilet's own lamp on its end wall, over the window) */}
          <WcSconce who={who} at={[E, h - 0.02, 0]} yaw={-Math.PI / 2} />
        </Movable>
      </group>
    </group>
  )
}
const WCDOOR_URL = import.meta.env.BASE_URL + 'models/wcdoor.glb'
/** the toilets' doors (blender/wcdoor.py): the sliding panel, a waist-high board shoji in cedar, and the doorway's frame, in the room's toon
 * light; a fresh copy of either at each call (each door slides on its own) */
export function useWcDoor() {
  const gltf = useGLTF(WCDOOR_URL) as unknown as { scene: THREE.Group }
  return useMemo(() => {
    const toon = new Map<THREE.Material, THREE.Material>()
    const conv = (root: THREE.Object3D) => {
      root.traverse((o) => {
        const m = o as THREE.Mesh
        if (!m.isMesh) return
        const src = m.material as THREE.MeshStandardMaterial
        let t = toon.get(src)
        // (the paper seen from both sides: from in the toilet too)
        if (!t) { t = new THREE.MeshToonMaterial({ name: src.name, color: src.color.clone(), map: src.map, side: src.name === 'WcDoorPaper' ? THREE.DoubleSide : THREE.FrontSide }); toon.set(src, t) }
        m.material = t
      })
      return root
    }
    // (each its parts folded together by material: a panel slides as one, a frame never moves; a panel was fourteen draws, the frame four)
    return { panel: () => mergeByMaterial(conv(gltf.scene.getObjectByName('WcDoorPanel')!.clone(true))), frame: () => mergeByMaterial(conv(gltf.scene.getObjectByName('WcDoorFrame')!.clone(true))) }
  }, [gltf])
}
useGLTF.preload(WCDOOR_URL)
/**
 * A toilet's door itself: one whole sliding panel (blender/wcdoor.py), figured cedar below, washi on close-set kumiko above, the lock's little
 * brass plate and a sunk pull by its free edge. It slides aside into the wall when someone goes in or comes out, or when it's clicked (and
 * back again with another click).
 */
function LockWindow({ who }: { who: 'm' | 'f' }) {
  const m = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(() => {
    const want = TOILETS[who].inside > 0 ? LOCK_TEX.in : LOCK_TEX.free
    if (m.current && m.current.map !== want) { m.current.map = want; m.current.needsUpdate = true }
  })
  return (
    <mesh position={[-0.0135, 0.02, WC_W / 2 - 0.09]} rotation-y={-Math.PI / 2}>
      <planeGeometry args={[0.07, 0.035]} />
      <meshBasicMaterial ref={m} map={LOCK_TEX.free} />
    </mesh>
  )
}
const doorAt = new THREE.Vector3()
/** the warm of a toilet's light through its door's washi, and on the floor before it */
const WC_PAPER_GLOW = new THREE.Color('#ffe4a0')
export function ToiletPanel({ who }: { who: 'm' | 'f' }) {
  const H = WC_H
  const g = useRef<THREE.Group>(null)
  const door = useWcDoor()
  // (the men's slides off one way, the women's the other, away from each other)
  const away = who === 'm' ? -1 : 1
  // (its own board of planks, like the staff's door (the owner's): the model's one great flat-sawn figure over the whole of it, before)
  // (its washi its own (the owner's): lit from inside while that toilet's light is on, a warm glow through the paper, the kumiko staying dark
  // against it; by night much more than by day; off, barely anything)
  const paper = useMemo(() => new THREE.MeshToonMaterial({ name: 'WcDoorPaper', color: '#ffffff', emissive: WC_PAPER_GLOW, emissiveIntensity: 0, side: THREE.DoubleSide }), [])
  useEffect(() => () => paper.dispose(), [paper])
  const panel = useMemo(() => {
    const p = door.panel()
    p.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const name = (m.material as THREE.Material).name
      if (name === 'WcDoorBoard') m.material = new THREE.MeshToonMaterial({ name: 'WcDoorBoard', color: '#ffffff', map: WC_BOARD[who] })
      else if (name === 'WcDoorPaper') { const src = m.material as THREE.MeshToonMaterial; paper.map = src.map; paper.emissiveMap = src.map; m.material = paper }
    })
    return p
  }, [door, who, paper])
  const k = useRef(0)
  const was = useRef(0)
  // (latched behind someone once it's shut: its little brass bolt heard)
  const latched = useRef(false)
  const spill = useRef<THREE.MeshBasicMaterial>(null)
  useFrame((_, dt) => {
    const d = TOILETS[who]
    // (how dark it is outside, and whether this toilet's light is on: the paper's glow and the faint warm spill on the floor before it)
    const sky = skyNow(), dark = sky === 'night' ? 1 : sky === 'dusk' ? 0.6 : sky === 'dawn' ? 0.5 : 0.3
    const on = getLights().wc[who]
    const ease = Math.min(1, dt * 6)
    // (the paper glows only shut over the lit room: slid open, it stands before the solid wall with nothing behind it, plain paper in the
    // room's light (the owner's); the light then pours out of the open doorway instead, the floor before it brighter the wider it's open)
    const shut = 1 - k.current
    // (the light off, no glow at all: plain paper in the room's light (the owner's: it still showed a little))
    paper.emissiveIntensity += ((on ? 0.5 * dark * shut : 0) - paper.emissiveIntensity) * ease
    // (less of it brightening as the door opens than before: the room's own warm light within now shows through it (item 126))
    if (spill.current) spill.current.opacity += ((on ? 0.32 * dark * (1 + 0.4 * k.current) : 0) - spill.current.opacity) * ease
    const want = d.passing > 0 || d.open ? 1 : 0
    // (heard as it starts to move, opening or shutting, as loud as it's near (the owner's))
    if (want !== was.current) {
      was.current = want
      if (g.current) slideDoorSound(want === 1, heard(g.current.getWorldPosition(doorAt)).near)
    }
    k.current += Math.sign(want - k.current) * Math.min(Math.abs(want - k.current), Math.min(dt, 0.1) * 1.8)
    if (k.current > 0.1) latched.current = false
    else if (k.current === 0 && d.inside > 0 && !latched.current && g.current) { latched.current = true; latchSound(g.current.getWorldPosition(doorAt)) }
    // (first out of the doorway onto its track in front of the wall, clear of the frame's posts and the plaster, then along it, open (seen
    // open: run into the wall it was gone, and the owner wanted it there); shutting, the other way about)
    const ss = (a: number, b: number) => { const t = Math.min(1, Math.max(0, (k.current - a) / (b - a))); return t * t * (3 - 2 * t) }
    if (g.current) {
      g.current.position.x = -0.065 * ss(0, 0.25)
      g.current.position.z = away * ss(0.2, 1) * WC_SLIDE
    }
  })
  return (
    <>
      <group ref={g} onClick={(ev) => { ev.stopPropagation(); if (getEdit().on) return; doorClick(who, Math.max(0, 1 - ev.distance / 8)) }}
        {...tipOver('廁所門', '點一下開關（有人時會敲門）')}>
        <group position={[-0.03, H / 2, 0]}>
          <primitive object={panel} position-y={-H / 2} />
          {/* the lock's little window on its brass plate, over the pull: 使用中 in red while someone's in, 空き in blue */}
          <LockWindow who={who} />
        </group>
      </group>
      {/* (the light through the paper, a faint warm fan on the floor before the door: laid on, no light or shadow of its own) */}
      <mesh position={[-0.42, 0.01, 0]} rotation={[-Math.PI / 2, 0, -Math.PI / 2]} renderOrder={2} raycast={() => {}}>
        <planeGeometry args={[WC_W * 1.3, 0.8]} />
        <meshBasicMaterial ref={spill} map={SILL_TEX} color={WC_PAPER_GLOW} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
    </>
  )
}
/** the toilets' doors' boards: the same planks, each door its own (the men's a shade cooler, the women's warmer) */
const WC_BOARD = { m: plankBoard(29, ['#9a6a46', '#8a5c3c', '#a27450', '#93663f', '#9c6c48']), f: plankBoard(47, ['#a87450', '#94643f', '#ad7c54', '#9b6a44']) }
/**
 * The whole doorway, noren and plaque too, as one easy thing to point at: an unseen plane just in front of it (clicking it works the door, pointing
 * lights up the sliding panel and names it). Not merged, so it can be pointed at.
 */
/** a raycast that never finds anything: what's set on something not to be pointed at for now */
const NO_RAYCAST = () => {}
export function ToiletHit({ who }: { who: 'm' | 'f' }) {
  const W = WC_W, H = WC_H
  // (not there for the pointer while the door's open: what's inside is clicked through the doorway (the tap, the toilet), not the door (the
  // owner clicked the tap and got the door); the door's shut again by clicking its panel, slid aside)
  const hit = useRef<THREE.Mesh>(null)
  useFrame(() => {
    const m = hit.current, d = TOILETS[who]
    if (m) m.raycast = d.open || d.passing > 0 ? NO_RAYCAST : THREE.Mesh.prototype.raycast
  })
  return (
      <mesh ref={hit} position={[-0.16, (H + 0.3) / 2, 0]} rotation-y={-Math.PI / 2}
        onClick={(ev) => { ev.stopPropagation(); if (getEdit().on) return; doorClick(who, Math.max(0, 1 - ev.distance / 8)) }}
        onPointerOver={(ev) => {
          ev.stopPropagation()
          // (the sliding panel lights up, not the plane)
          let top: THREE.Object3D | null = ev.eventObject
          while (top && !top.getObjectByName(`look-wc-${who}`)) top = top.parent
          glowOnly(top?.getObjectByName(`look-wc-${who}`))
          setTip({ title: '廁所門', hint: TOILETS[who].inside > 0 ? '使用中：點一下敲門' : '點一下開關' })
          POINTER_HINT.hand++
          const el = ev.nativeEvent.target as HTMLElement | null
          if (el?.style) el.style.cursor = 'pointer'
        }}
        onPointerOut={(ev) => {
          let top: THREE.Object3D | null = ev.eventObject
          while (top && !top.getObjectByName(`look-wc-${who}`)) top = top.parent
          glowLeave(top?.getObjectByName(`look-wc-${who}`)); setTip(null)
          POINTER_HINT.hand = Math.max(0, POINTER_HINT.hand - 1)
          const el = ev.nativeEvent.target as HTMLElement | null
          if (el?.style && !POINTER_HINT.hand) el.style.cursor = ''
        }}>
        <planeGeometry args={[W + 0.1, H + 0.3]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
  )
}
/** the door noren's place: its cloth's plane (in front of the panel slid out onto its track, its face at -0.109), its top (up over the
 * head, WC_H to WC_H + 0.07), its rod's height (in front of the head's middle) and the slit between its panels */
const NOREN_X = -0.138, NOREN_TOP = WC_H + 0.08, NOREN_SLIT = 0.008
export function ToiletDoor({ who }: { who: 'm' | 'f' }) {
  const W = WC_W, H = WC_H
  const door = useWcDoor()
  const frame = useMemo(() => door.frame(), [door])
  // (the noren's two panels, each showing its half of the one picture: the slit between them cuts the crest in half)
  const noren = useMemo(() => [-1, 1].map((sd) => {
    const w = (WC_NOREN_W - NOREN_SLIT) / 2
    const geo = new THREE.PlaneGeometry(w, WC_NOREN_L)
    const u0 = sd < 0 ? 0 : 1 - w / WC_NOREN_W, u1 = u0 + w / WC_NOREN_W
    const uv = geo.attributes.uv as THREE.BufferAttribute
    for (let k = 0; k < uv.count; k++) uv.setX(k, u0 + uv.getX(k) * (u1 - u0))
    return { sd, geo, z: sd * (NOREN_SLIT + w) / 2 }
  }), [])
  useEffect(() => () => noren.forEach((n) => n.geo.dispose()), [noren])
  return (
    <group>
      {/* the frame round the opening: dark cedar posts, the head over them and the sill (blender/wcdoor.py) */}
      <primitive object={frame} />
      {/* (the sliding panel: ToiletPanel, not merged) and the little room behind it */}
      <WcRoom w={W} h={H} who={who} />
      {/* the noren, hung from its rod in front of the head: the rod on two little brackets off the head's face, just above the panel's
          way out onto its track (the panel slides out under it, and behind the cloth); the cloth just in front of the rod, its top band over
          it, up over the head (from the room seen from above, nothing of the shoji shows over it: the owner's) */}
      {/* (its pole (暖簾棒, the owner's: it seemed to hang from nothing): a round of pale wood through the cloth's top sleeve, showing in front
          of it and past its two ends, held off the head on three small dark L brackets, at its ends and in its middle) */}
      {/* (each door's own pole, a little past its cloth and no more: the two doors' poles had run on to meet over the post between them,
          one rod across both (the owner's, 2026-11-10); now a gap of some 5 cm there) */}
      <mesh position={[NOREN_X - 0.006, NOREN_TOP - 0.022, 0]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.011, 0.011, WC_NOREN_W + 0.04, 10]} />
        <meshToonMaterial color="#d9b884" />
      </mesh>
      {[-1, 0, 1].map((k) => (
        <group key={k} position={[0, NOREN_TOP - 0.022, k * (WC_NOREN_W / 2 + 0.008)]}>
          <mesh position={[(NOREN_X - 0.006 - 0.07) / 2, -0.016, 0]}><boxGeometry args={[-(NOREN_X - 0.006) - 0.07 + 0.012, 0.01, 0.016]} /><meshToonMaterial color="#3a2416" /></mesh>
          <mesh position={[NOREN_X - 0.024, -0.004, 0]}><boxGeometry args={[0.008, 0.032, 0.016]} /><meshToonMaterial color="#3a2416" /></mesh>
        </group>
      ))}
      {noren.map(({ sd, geo, z }) => (
        <mesh key={sd} geometry={geo} position={[NOREN_X, NOREN_TOP - WC_NOREN_L / 2, z]} rotation-y={-Math.PI / 2}>
          <meshToonMaterial color="#ffffff" map={WC_NOREN[who]} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* the plaque over it, up on the wall clear of the noren's top: a board with its thickness, its back on the wall's face (the frieze, at
          -0.004; the flat picture had stood 7 cm out in front of it, where a board would be seen floating from the side) */}
      <mesh geometry={WC_PLAQUE_GEO} position={[-0.006, NOREN_TOP + 0.13, 0]} rotation-y={-Math.PI / 2}>
        <meshToonMaterial color="#ffffff" map={wcSign(who)} emissive={WC_ICON[who]} emissiveMap={wcSign(who, true)} emissiveIntensity={0.2} />
      </mesh>
    </group>
  )
}
