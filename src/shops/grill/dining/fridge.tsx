import { coolerDoorSound, lightSwitchSound } from '@/shops/grill/sounds/restroomSound'
import { memo, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { warmLater } from '@/scene/render/Prewarm'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { homeCopy, plainColours, mergeByMaterial } from '@/scene/render/StaticBatch'
import { inkModel } from '@/scene/render/inkHull'
import { reflectStudio } from '@/scene/render/studio'
import { heard } from '@/scene/interact/sfx'
import { tick } from '@/scene/kit/speed'
import { DRINK_MAX, DRINK_MIN, driftDrinkTemp, servedWarm } from '@/game/stock/fridgeTemp'
import { ColdMist } from '@/scene/effects/ColdMist'
import { useGLTF } from '@react-three/drei'
import { SIGN_FONT } from '@/scene/props/signFont'
import { DRINK_FRIDGE_TEMP, pressDrinkTemp, DRINKS, FRIDGE, FRIDGE_AT, FRIDGE_STATE, FRIDGE_UNITS, tipOver, handOver } from '@/shops/grill/bar'
import { getEdit } from '@/shops/grill/edit'
import { setTip } from '@/scene/interact/hoverTip'
import { ON_LANG } from './ambient'
import { canvasTex, grain } from './base'
import { drinkName } from './drinkKinds'
import { shelfSize, shelfLayout } from './shelves'
import { DrinkBottle } from './bottles'
import { SakeCup } from './cups'

const FRIDGE_URL = import.meta.env.BASE_URL + 'models/drinkfridge.glb'
/**
 * The drink fridges' cabinet (blender/drinkfridge.py: made in place of the downloaded one, the owner's: its parts and outlines were some 8,500
 * triangles and nine draws a fridge): a commercial cooler in matte black lacquered metal, a pair of black-framed glass doors with a mullion
 * where they meet and a long silver handle on each, louvres and a little silver maker's plate at its foot; over the doors its light box, an
 * izakaya's andon (a dark wood frame, a kumiko lattice round warm lit washi: 厳選 銘酒各種 by a sugidama on the sake's, 冷やし 飲み物 by a
 * maple leaf on the drinks'), a white liner washed with the LEDs' cool white, four wire shelves with a steel strip along each one's lip and a
 * little black plaque on it naming what the shelf keeps
 */
const FRIDGE_WORDS = ['冷やし飲み物', '銘酒各種']
/**
 * The light box's picture, an andon's (the owner's, 2026-11-10: the 聞 seal crammed in its corner gone, the lettering spaced so no stroke
 * touches the next, the dense double lattice round it (noisy, a moire from across the room) gone for a plain dark wood frame with one fine
 * gold line inside it, and all of it drawn at 2048 x 540 so the leaf and the brush lettering are sharp): warm washi lit from behind, its
 * fibres; on the drinks' a Japanese maple leaf over the rings of a ripple and 冷やし飲み物; on the sake's a sugidama on its cord, 厳選 small
 * and upright, 銘酒各種. Each character set on its own, 0.15 em apart. Painted the way up the glTF quad holds it (flipY off)
 */
const fridgeSignTex = (n: number) => {
  const W = 2048, H = 540
  const t = canvasTex(W, H, (g) => {
    let seed = 7 + n * 31
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    // (the washi, warm in its middle and amber toward its edges, a little cloudy, its fibres)
    const bg = g.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, W * 0.56)
    bg.addColorStop(0, '#fff7e1'); bg.addColorStop(0.62, '#fbe8bc'); bg.addColorStop(1, '#f0d496')
    g.fillStyle = bg; g.fillRect(0, 0, W, H)
    for (let k = 0; k < 60; k++) {
      const x = rnd() * W, y = rnd() * H, r = 40 + rnd() * 120
      const c = g.createRadialGradient(x, y, 0, x, y, r)
      c.addColorStop(0, k % 2 ? 'rgba(255,250,236,0.18)' : 'rgba(214,170,96,0.08)'); c.addColorStop(1, 'rgba(0,0,0,0)')
      g.fillStyle = c; g.fillRect(x - r, y - r, r * 2, r * 2)
    }
    g.lineCap = 'round'
    for (let k = 0; k < 700; k++) {
      const x = rnd() * W, y = rnd() * H, a = rnd() * Math.PI, l = 14 + rnd() * 46
      g.strokeStyle = rnd() < 0.7 ? 'rgba(190,140,60,0.13)' : 'rgba(255,252,240,0.35)'; g.lineWidth = 1 + rnd() * 1.4
      g.beginPath(); g.moveTo(x, y)
      g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (rnd() - 0.5) * 10, y + Math.sin(a) * l * 0.5 + (rnd() - 0.5) * 10, x + Math.cos(a) * l, y + Math.sin(a) * l)
      g.stroke()
    }
    // (the frame: dark walnut, mitred at its corners, each side's grain along it, a shade toward its outer edge and a lit inner lip)
    const F = 44
    const sides: [number, number][][] = [
      [[0, 0], [W, 0], [W - F, F], [F, F]], [[W, H], [0, H], [F, H - F], [W - F, H - F]],
      [[0, H], [0, 0], [F, F], [F, H - F]], [[W, 0], [W, H], [W - F, H - F], [W - F, F]],
    ]
    sides.forEach((q, i) => {
      g.save()
      g.beginPath(); q.forEach(([x, y], j) => (j ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.clip()
      const across = i < 2
      // (across the moulding: darker outside, warmer toward its inner lip)
      const [ox, oy] = q[0], [ix, iy] = [(q[2][0] + q[3][0]) / 2, (q[2][1] + q[3][1]) / 2]
      const sh = g.createLinearGradient(across ? 0 : ox, across ? oy : 0, across ? 0 : ix, across ? iy : 0)
      sh.addColorStop(0, '#1b100a'); sh.addColorStop(0.55, '#33200f'); sh.addColorStop(1, '#3e2716')
      g.fillStyle = sh; g.fillRect(0, 0, W, H)
      // (its grain: fine lines along the side, a few darker, wavering)
      for (let k = 0; k < 26; k++) {
        const o = rnd() * F, dark = rnd() < 0.5
        g.strokeStyle = dark ? 'rgba(10,5,2,0.45)' : 'rgba(120,80,48,0.22)'; g.lineWidth = 0.8 + rnd() * 1.2
        g.beginPath()
        if (across) {
          const y0 = i === 0 ? o : H - o
          g.moveTo(0, y0); for (let x = 0; x <= W; x += 128) g.lineTo(x, y0 + Math.sin(x / 210 + k) * 1.4)
        } else {
          const x0 = i === 2 ? o : W - o
          g.moveTo(x0, 0); for (let y = 0; y <= H; y += 90) g.lineTo(x0 + Math.sin(y / 150 + k) * 1.2, y)
        }
        g.stroke()
      }
      g.restore()
    })
    // (the mitres: a fine dark line at each corner)
    g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 1.5
    for (const [[x0, y0], [x1, y1]] of [[[0, 0], [F, F]], [[W, 0], [W - F, F]], [[0, H], [F, H - F]], [[W, H], [W - F, H - F]]]) {
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke()
    }
    // (its inner lip catching the light, and the washi just inside it in its shadow)
    g.strokeStyle = 'rgba(206,160,104,0.55)'; g.lineWidth = 2.5; g.strokeRect(F - 1.25, F - 1.25, W - 2 * F + 2.5, H - 2 * F + 2.5)
    // (each a band 16 px wide fading in from the frame: the gradient's ends, then the band)
    for (const [gx0, gy0, gx1, gy1, x, y, w, h] of [[0, F, 0, F + 16, F, F, W - 2 * F, 16], [0, H - F, 0, H - F - 16, F, H - F - 16, W - 2 * F, 16],
      [F, 0, F + 16, 0, F, F, 16, H - 2 * F], [W - F, 0, W - F - 16, 0, W - F - 16, F, 16, H - 2 * F]]) {
      const sd = g.createLinearGradient(gx0, gy0, gx1, gy1)
      sd.addColorStop(0, 'rgba(110,70,26,0.22)'); sd.addColorStop(1, 'rgba(110,70,26,0)')
      g.fillStyle = sd; g.fillRect(x, y, w, h)
    }
    // (one fine gold line, 18 px in from the frame)
    const gl = F + 18
    g.strokeStyle = '#b8903a'; g.lineWidth = 3.2; g.strokeRect(gl, gl, W - 2 * gl, H - 2 * gl)
    g.strokeStyle = 'rgba(250,224,150,0.7)'; g.lineWidth = 1; g.strokeRect(gl - 0.8, gl - 0.8, W - 2 * gl + 1.6, H - 2 * gl + 1.6)
    // (the lettering: each character on its own, 0.15 em between them, the whole fitted to the room left for it; a faint warm shadow under)
    const words = (text: string, x0: number, x1: number, cy: number, most: number) => {
      const chars = [...text]
      g.save()
      g.textAlign = 'left'; g.textBaseline = 'middle'
      let size = most
      // (bold: the brush's full weight (the owner's: strong black lettering); the gap measured with it)
      const widthAt = (s: number) => {
        g.font = `bold ${s}px ${SIGN_FONT}`
        return chars.reduce((t, c) => t + g.measureText(c).width, 0) + 0.15 * s * (chars.length - 1)
      }
      const fits = widthAt(size)
      if (fits > x1 - x0) size *= (x1 - x0) / fits
      const total = widthAt(size)
      let x = (x0 + x1) / 2 - total / 2
      for (const c of chars) {
        const w = g.measureText(c).width
        g.fillStyle = 'rgba(110,64,18,0.2)'; g.fillText(c, x + size * 0.03, cy + size * 0.04)
        g.fillStyle = '#1a1210'; g.fillText(c, x, cy)
        x += w + 0.15 * size
      }
      g.restore()
    }
    const cx = 340, cy = H / 2
    if (n === 1) {
      // (a sugidama on its cord from the frame: a ball of cedar sprigs, its needles drawn in short strokes, darker under; a little wooden tag)
      const R = 122, by = cy + 12
      g.strokeStyle = '#2b1810'; g.lineWidth = 6; g.lineCap = 'round'
      g.beginPath(); g.moveTo(cx, gl); g.lineTo(cx, by - R + 10); g.stroke()
      const ball = g.createRadialGradient(cx - 36, by - 40, 14, cx, by, R)
      ball.addColorStop(0, '#6c8a3a'); ball.addColorStop(0.7, '#41602a'); ball.addColorStop(1, '#253a16')
      g.fillStyle = ball; g.beginPath(); g.arc(cx, by, R, 0, Math.PI * 2); g.fill()
      for (let k = 0; k < 2400; k++) {
        const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * R * 1.02, x = cx + Math.cos(a) * r, y = by + Math.sin(a) * r
        const l = 9 + rnd() * 12, d = a + (rnd() - 0.5) * 1.3
        const lit = y < by - R * 0.2 && x < cx + R * 0.3
        g.strokeStyle = rnd() < (lit ? 0.62 : 0.3) ? 'rgba(146,176,82,0.75)' : 'rgba(22,36,12,0.62)'; g.lineWidth = 2.2
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(d) * l, y + Math.sin(d) * l); g.stroke()
      }
      g.fillStyle = '#c99a5c'; g.fillRect(cx - 22, by + R - 6, 44, 60)
      g.strokeStyle = '#2b1810'; g.lineWidth = 3; g.strokeRect(cx - 22, by + R - 6, 44, 60)
      g.fillStyle = '#2b1810'; g.font = `400 36px ${SIGN_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('酒', cx, by + R + 24)
      // (厳選 small and upright, then 銘酒各種)
      words('厳', 560, 660, cy - 52, 92)
      words('選', 560, 660, cy + 52, 92)
      words(FRIDGE_WORDS[1], 720, W - gl - 60, cy, 210)
    } else {
      // (a Japanese maple leaf, seven lobes each pointed and finely toothed, its veins, its stalk; under it the rings of a ripple)
      const R = 140, ly = cy - 18
      g.strokeStyle = 'rgba(64,132,152,0.5)'; g.lineWidth = 4
      for (const [rx, ry] of [[100, 18], [146, 27], [192, 36]]) { g.beginPath(); g.ellipse(cx, ly + 150, rx, ry, 0, Math.PI * 0.04, Math.PI * 0.96); g.stroke() }
      const lobes = [[-90, 1], [-128, 0.94], [-52, 0.94], [-166, 0.76], [-14, 0.76], [-205, 0.46], [25, 0.46]] as const
      const order = [5, 3, 1, 0, 2, 4, 6]
      const sinus = R * 0.3
      const pt = (deg: number, r: number) => [cx + Math.cos(deg * Math.PI / 180) * r, ly + Math.sin(deg * Math.PI / 180) * r] as const
      // (an edge from a to b, bowed out of the lobe a little (lance-shaped) and finely toothed: the outline's drawn clockwise, so its outside
      // is to the left of the way it runs)
      const toothed = (ax: number, ay: number, bx: number, by: number) => {
        const l = Math.hypot(bx - ax, by - ay), ox = (by - ay) / l, oy = -(bx - ax) / l
        for (let q = 1; q <= 8; q++) {
          const u = q / 8, out = Math.sin(Math.PI * u) * 0.08 * R + (q < 8 && q % 2 ? 0.022 * R : 0)
          g.lineTo(ax + (bx - ax) * u + ox * out, ay + (by - ay) * u + oy * out)
        }
      }
      g.beginPath()
      order.forEach((k, i) => {
        const [deg, len] = lobes[k]
        const half = k === 5 || k === 6 ? 13 : 17
        const [sx0, sy0] = pt(deg - half, sinus), [tx, ty] = pt(deg, R * len), [sx1, sy1] = pt(deg + half, sinus)
        if (i === 0) g.moveTo(sx0, sy0); else g.lineTo(sx0, sy0)
        toothed(sx0, sy0, tx, ty)
        toothed(tx, ty, sx1, sy1)
      })
      g.closePath()
      const leaf = g.createRadialGradient(cx - 20, ly - 30, 10, cx, ly, R)
      leaf.addColorStop(0, '#6cb653'); leaf.addColorStop(0.65, '#3f8f3a'); leaf.addColorStop(1, '#2c6d2c')
      g.fillStyle = leaf; g.fill()
      g.strokeStyle = 'rgba(28,70,26,0.55)'; g.lineWidth = 2; g.stroke()
      // (its veins: from the stalk's foot out along each lobe, tapering)
      for (const [deg, len] of lobes) {
        const [tx, ty] = pt(deg, R * len * 0.88)
        g.strokeStyle = 'rgba(196,232,160,0.75)'; g.lineWidth = 3.2
        g.beginPath(); g.moveTo(cx, ly); g.lineTo((cx + tx) / 2, (ly + ty) / 2); g.stroke()
        g.lineWidth = 1.6; g.beginPath(); g.moveTo((cx + tx) / 2, (ly + ty) / 2); g.lineTo(tx, ty); g.stroke()
      }
      g.strokeStyle = '#3f6a2a'; g.lineWidth = 7; g.lineCap = 'round'
      g.beginPath(); g.moveTo(cx, ly); g.quadraticCurveTo(cx + 12, ly + 62, cx - 14, ly + 96); g.stroke()
      words(FRIDGE_WORDS[0], 580, W - gl - 60, cy, 200)
    }
  })
  if (t) { t.flipY = false; t.anisotropy = 8; t.userData.capScale = 2 }
  return t
}
/** the glass: a cool clear tint, two broad and a few thin white glare streaks at 45°, its edges a faint cold blue (the alpha the glass's own) */
const FRIDGE_GLASS_TEX = (() => {
  const t = canvasTex(256, 512, (g) => {
    g.clearRect(0, 0, 256, 512)
    g.fillStyle = 'rgba(214,232,240,0.26)'; g.fillRect(0, 0, 256, 512)
    const edge = (x0: number, y0: number, x1: number, y1: number) => {
      const e = g.createLinearGradient(x0, y0, x1, y1)
      e.addColorStop(0, 'rgba(150,200,235,0.45)'); e.addColorStop(1, 'rgba(150,200,235,0)')
      return e
    }
    // (the glare kept to the pane's upper and middle part, and fainter (the owner's: piled at the foot of the door it read as grey dirt))
    g.save()
    g.beginPath(); g.rect(0, 0, 256, 370); g.clip()
    g.translate(128, 256); g.rotate(-Math.PI / 4)
    for (const [x, w, a] of [[-150, 46, 0.3], [-92, 12, 0.38], [40, 70, 0.18], [118, 8, 0.36], [150, 20, 0.2]] as const) {
      const st = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0)
      st.addColorStop(0, 'rgba(255,255,255,0)'); st.addColorStop(0.5, `rgba(255,255,255,${a})`); st.addColorStop(1, 'rgba(255,255,255,0)')
      g.fillStyle = st; g.fillRect(x - w / 2, -400, w, 800)
    }
    g.restore()
    // (faded out toward the clip's edge, not cut off; the pane's own tint put back under)
    g.save(); g.globalCompositeOperation = 'destination-out'
    const fade = g.createLinearGradient(0, 250, 0, 370)
    fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,1)')
    g.fillStyle = fade; g.fillRect(0, 250, 256, 262); g.restore()
    g.fillStyle = 'rgba(214,232,240,0.26)'; g.fillRect(0, 250, 256, 262)
    // (a faint cold edge along its top and foot only: up its sides it read as two bare light tubes beside the frame (the owner's, 2026-11-10))
    g.fillStyle = edge(0, 0, 0, 22); g.fillRect(0, 0, 256, 22)
    g.fillStyle = edge(0, 512, 0, 500); g.fillRect(0, 500, 256, 12)
  })
  if (t) t.flipY = false
  return t
})()
/** the liner's back, washed by the LED strips: cool white, brightest just under the ceiling and under each shelf, softer below each (the
 * shelves, up from the liner's foot over its height: blender/drinkfridge.py's SHELVES, PLINTH, HEAD) */
const FRIDGE_LED = (() => {
  const t = canvasTex(64, 512, (g) => {
    g.fillStyle = '#d6e2ea'; g.fillRect(0, 0, 64, 512)
    const top = 2.17 - 0.27, foot = 0.14
    const rowOf = (y: number) => ((top - y) / (top - foot)) * 512
    for (const y of [top, 0.27, 0.72, 1.19, 1.63]) {
      const r = rowOf(y)
      const w = g.createLinearGradient(0, r, 0, r + 150)
      w.addColorStop(0, 'rgba(250,253,255,1)'); w.addColorStop(0.25, 'rgba(232,244,252,0.85)'); w.addColorStop(1, 'rgba(232,244,252,0)')
      g.fillStyle = w; g.fillRect(0, r, 64, 150)
    }
    // (the back panel of a commercial cooler (the owner's: its inside finer): rows of small air holes in the band under each shelf, where the
    // cold comes out, and a fine seam down its middle)
    g.fillStyle = 'rgba(70,90,105,0.32)'
    for (const y of [0.27, 0.72, 1.19, 1.63]) {
      const r = rowOf(y) - 16
      for (let row = 0; row < 3; row++) for (let x = 5 + (row % 2) * 3; x < 64; x += 6) { g.beginPath(); g.arc(x, r + row * 5, 1.1, 0, Math.PI * 2); g.fill() }
    }
    g.fillStyle = 'rgba(90,110,125,0.25)'; g.fillRect(31.5, 0, 1, 512)
    // (its sides a touch darker: the light's from the middle)
    const sd = g.createLinearGradient(0, 0, 64, 0)
    sd.addColorStop(0, 'rgba(120,140,155,0.25)'); sd.addColorStop(0.2, 'rgba(120,140,155,0)'); sd.addColorStop(0.8, 'rgba(120,140,155,0)'); sd.addColorStop(1, 'rgba(120,140,155,0.25)')
    g.fillStyle = sd; g.fillRect(0, 0, 64, 512)
  })
  if (t) t.flipY = false
  return t
})()
/** each shelf's lip: brushed steel, and under each drink a small card with its name and its price, in the page's language, redrawn when it's
 * changed (the owner's, 2026-11-14, item 91: "the fridge's names with their prices, the names following the language") (a quarter of the
 * picture to a shelf, the lowest at the top) */
const fridgeTagTex = (n: number) => {
  const draw = (g: CanvasRenderingContext2D) => {
    for (let k = 0; k < 4; k++) {
      const y0 = k * 64
      const st = g.createLinearGradient(0, y0, 0, y0 + 64)
      st.addColorStop(0, '#eef0f2'); st.addColorStop(0.45, '#c9cdd2'); st.addColorStop(0.55, '#b9bec4'); st.addColorStop(1, '#9ea4ab')
      g.fillStyle = st; g.fillRect(0, y0, 1024, 64)
      g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 1
      for (let y = y0 + 3; y < y0 + 62; y += 3) { g.beginPath(); g.moveTo(0, y); g.lineTo(1024, y + 0.5); g.stroke() }
      // (under each place, the name of what's kept there on a small white card, as clear as can be read through the glass (the owner's,
      // 2026-11-11: the names marked clearly), its price under it (item 91), a strip of the drink's own colour along its top; the shelf's
      // name on a plaque in the middle before it is gone: the cards say it all). The strip's picture runs the lip's length, 0.742 (blender/
      // drinkfridge.py: inside the baffles), its middle the shelf's
      const shelf = FRIDGE_UNITS[n]?.shelves[k]
      if (!shelf) continue
      const lay = shelfLayout(n, k)
      // (one card under each run of the same drink side by side, across the run and in its middle (the owner's, 2026-11-13, item 64: "the
      // same name twice, put the label in the middle"): 牛奶 牛奶 was two cards)
      const runs: { id: (typeof shelf.ids)[number]; j0: number; j1: number }[] = []
      shelf.ids.forEach((id, j) => { const r = runs[runs.length - 1]; if (r && r.id === id) r.j1 = j; else runs.push({ id, j0: j, j1: j }) })
      runs.forEach(({ id, j0, j1 }) => {
        const d = DRINKS.find((x) => x.id === id)
        const half = (shelfSize(id)[0] + lay.gap * 0.7) / 2
        const left = lay.xs[j0] - half, right = lay.xs[j1] + half
        const cx = ((left + right) / 2 / 0.742 + 0.5) * 1024, w = Math.max(30, (right - left) / 0.742 * 1024 - 4)
        g.fillStyle = '#fbf8f0'; g.fillRect(cx - w / 2, y0 + 8, w, 48)
        g.fillStyle = d?.label[0] ?? '#888'; g.fillRect(cx - w / 2, y0 + 8, w, 7)
        g.strokeStyle = '#3a3530'; g.lineWidth = 1.2; g.strokeRect(cx - w / 2 + 0.5, y0 + 8.5, w - 1, 47)
        const name = drinkName(id), price = `NT$${d?.price ?? 0}`
        const FONT = '"Noto Sans TC", "Noto Sans JP", "Microsoft JhengHei", sans-serif'
        // (the name on one line, shrunk to the card's width; the price under it in red, smaller)
        g.font = `700 22px ${FONT}`
        const size = Math.max(10, Math.min(22, (22 * (w - 8)) / Math.max(1, g.measureText(name).width)))
        g.font = `700 ${size}px ${FONT}`
        g.fillStyle = '#1d1a16'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, cx, y0 + 29)
        g.font = `700 15px ${FONT}`
        const ps = Math.max(9, Math.min(15, (15 * (w - 8)) / Math.max(1, g.measureText(price).width)))
        g.font = `700 ${ps}px ${FONT}`
        g.fillStyle = '#b8261c'; g.fillText(price, cx, y0 + 47)
      })
    }
  }
  const t = canvasTex(1024, 256, draw)
  if (t) {
    t.flipY = false
    t.anisotropy = 4
    // (drawn again in the new language when it's changed; let go with the picture)
    const again = () => { const c = t.image as HTMLCanvasElement; draw(c.getContext('2d')!); t.needsUpdate = true }
    ON_LANG.add(again)
    t.addEventListener('dispose', () => ON_LANG.delete(again))
  }
  return t
}
const freezers = new Map<number, { body: THREE.Group; doorRoot: THREE.Group; doors: THREE.Group[]; home: ReturnType<typeof homeCopy>
  rearRoot: THREE.Group; rears: THREE.Group[]; rearHome: ReturnType<typeof homeCopy> }>()
/** the glass (cool, clear, its glare streaks; the studio's room in it), made once */
const FRIDGE_GLASS = new THREE.MeshStandardMaterial({ color: '#ffffff', map: FRIDGE_GLASS_TEX, transparent: true, roughness: 0.05, metalness: 0.1,
  side: THREE.DoubleSide, depthWrite: false })
/** the cabinet and the doors' frames: deep matte black lacquered metal; the handles, the strip and the plate: bright silver (the studio's
 * room in both: metal shows as metal by what it reflects) */
const FRIDGE_SHELL = new THREE.MeshStandardMaterial({ color: '#181a1d', roughness: 0.35, metalness: 0.6 })
const FRIDGE_METAL = new THREE.MeshStandardMaterial({ color: '#d8dee9', roughness: 0.2, metalness: 0.85 })
reflectStudio(FRIDGE_GLASS, FRIDGE_SHELL, FRIDGE_METAL)
/** lit from inside: as bright by night as by day */
const fridgeSign = (n: number) => new THREE.MeshBasicMaterial({ map: fridgeSignTex(n), toneMapped: false })
const FRIDGE_BACK = new THREE.MeshBasicMaterial({ map: FRIDGE_LED })
/** the liner's sides: a cool grey, the cove lights' wash only along their front edge (behind the baffles), and two ladders of shelf-clip slots
 * up each (u 0 the front: blender/drinkfridge.py) (the owner's: plain white, seen edge on through the doors they read as two bare light tubes
 * by the frame) */
const FRIDGE_SIDE_TEX = (() => {
  const t = canvasTex(128, 512, (g) => {
    const w = g.createLinearGradient(0, 0, 128, 0)
    w.addColorStop(0, '#e6eef2'); w.addColorStop(0.04, '#dbe4ea'); w.addColorStop(0.22, '#c4cdd3'); w.addColorStop(0.6, '#b6c0c7'); w.addColorStop(1, '#adb7be')
    g.fillStyle = w; g.fillRect(0, 0, 128, 512)
    // (the ladders: a narrow channel each, a slot every 7 px up it)
    for (const u of [18, 112]) {
      g.fillStyle = 'rgba(120,132,140,0.45)'; g.fillRect(u - 3, 0, 6, 512)
      g.fillStyle = 'rgba(40,48,54,0.7)'
      for (let y = 2; y < 512; y += 7) g.fillRect(u - 1, y, 2, 3)
    }
  })
  if (t) t.flipY = false
  return t
})()
const FRIDGE_SIDE = new THREE.MeshBasicMaterial({ map: FRIDGE_SIDE_TEX })
/** the coves' strips of milky acrylic, lit (seen only from an angle, behind their baffles) */
const FRIDGE_COVE = new THREE.MeshStandardMaterial({ color: '#f0fdf4', emissive: '#f0fdf4', emissiveIntensity: 0.7, roughness: 0.5, metalness: 0 })
function useFreezer(n: number) {
  const gltf = useGLTF(FRIDGE_URL) as unknown as { scene: THREE.Group }
  return useMemo(() => {
    const hit = freezers.get(n)
    if (hit) return hit
    const root = (gltf.scene.getObjectByName('DrinkFridge') ?? gltf.scene).clone(true)
    root.position.set(0, 0, 0)
    const sign = fridgeSign(n)
    const tags = new THREE.MeshBasicMaterial({ map: fridgeTagTex(n) })
    const mats = new Map<THREE.Material, THREE.Material>()
    const conv = (m: THREE.Material) => {
      let t = mats.get(m)
      if (!t) {
        const src = m as THREE.MeshStandardMaterial
        if (src.name === 'FridgeSign') t = sign
        else if (src.name === 'FridgeGlass') t = FRIDGE_GLASS
        else if (src.name === 'FridgeShell') t = FRIDGE_SHELL
        else if (src.name === 'FridgeMetal') t = FRIDGE_METAL
        else if (src.name === 'FridgeBackLight') t = FRIDGE_BACK
        else if (src.name === 'FridgeSideLight') t = FRIDGE_SIDE
        else if (src.name === 'FridgeCove') t = FRIDGE_COVE
        else if (src.name === 'FridgeTag') t = tags
        // (the wire grid: its gaps cut away)
        else if (src.name === 'FridgeWire') t = new THREE.MeshToonMaterial({ color: '#eceeee', map: src.map, alphaTest: 0.5, side: THREE.DoubleSide })
        else t = new THREE.MeshToonMaterial({ color: src.color.clone() })
        if (!t.name) t.name = src.name
        mats.set(m, t)
      }
      return t
    }
    root.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.material = Array.isArray(m.material) ? m.material.map(conv) : conv(m.material)
      // (the glass neither casts a shadow nor takes one: swung open, its pane threw a solid one across the floor; nor the wire)
      // (nor anything inside (the owner's: the shelves', the doors' and the header's shadows fell across the liner's floor in grey slants,
      // like a broken picture): only the cabinet's outside throws its shadow, on the floor, and nothing of it takes one)
      m.castShadow = (Array.isArray(m.material) ? m.material : [m.material]).some((x) => x.name === 'FridgeShell')
      m.receiveShadow = false
    })
    // (an outline round the cabinet and the doors, not the sign, the lit back, the tags, the shelves' wire or the glass)
    inkModel(root, (m) => { const x = m.material as THREE.Material; return x.transparent || x.alphaTest > 0 || x === sign || x === tags || x === FRIDGE_BACK || x === FRIDGE_SIDE || x === FRIDGE_COVE })
    root.updateMatrixWorld(true)
    const body = new THREE.Group()
    body.add(root)
    body.updateMatrixWorld(true)
    // (each door swings on its outer edge: a pivot there, the door moved onto it without moving)
    const doors: THREE.Group[] = []
    for (const side of ['L', 'R'] as const) {
      const door = root.getObjectByName(`FridgeDoor${side}`)
      const pivot = new THREE.Group()
      pivot.name = `fridge-door-${side}`
      if (door) {
        const box = new THREE.Box3().setFromObject(door)
        pivot.position.set(side === 'L' ? box.min.x : box.max.x, 0, box.max.z)
        pivot.updateMatrixWorld(true)
        pivot.attach(door)
      }
      doors.push(pivot)
    }
    // (and the doors in its back (item 554, the owner's 「冰箱後面的高度應該開到跟實際能補貨的範圍。」「且補貨的門是左右開」: a pair over an
    // opening from under the lowest shelf to under its top that slide across it (引き違い), the outer (the left) over the inner; item 535's
    // was one hatch over the middle shelves, slid up): each in a group of its own at its outer edge, its place as it rests kept)
    const rears: THREE.Group[] = []
    const cab = root.getObjectByName('FridgeBody')
    const backZ = cab ? new THREE.Box3().setFromObject(cab).min.z : -FRIDGE.D / 2
    for (const side of ['L', 'R'] as const) {
      const leaf = root.getObjectByName(`FridgeHatch${side}`)
      const pivot = new THREE.Group()
      pivot.name = `fridge-hatch-${side}`
      if (leaf) {
        const box = new THREE.Box3().setFromObject(leaf)
        pivot.position.set(side === 'L' ? box.min.x : box.max.x, 0, backZ)
        pivot.updateMatrixWorld(true)
        pivot.attach(leaf)
        pivot.userData.rest = pivot.position.clone()
      }
      rears.push(pivot)
    }
    // (the cabinet never moves and each door swings as one: each folded together by material)
    plainColours(root)
    mergeByMaterial(root)
    for (const d of doors) mergeByMaterial(d)
    for (const d of rears) mergeByMaterial(d)
    const doorRoot = new THREE.Group()
    for (const d of doors) doorRoot.add(d)
    // (both shut, drawn as one: a draw a material, not four a door)
    const home = homeCopy(doorRoot, doors)
    const rearRoot = new THREE.Group()
    for (const d of rears) rearRoot.add(d)
    const rearHome = homeCopy(rearRoot, rears)
    const out = { body, doorRoot, doors, home, rearRoot, rears, rearHome }
    freezers.set(n, out)
    return out
  }, [gltf, n])
}
useGLTF.preload(FRIDGE_URL)
// (the fridge, its door and its stock each drawn again only when its own props change: with eighty-odd bottles apiece they were redrawn every
// time the room above them was, several times a second while the shop's open)
export const DrinkFridge = memo(DrinkFridgeImpl)
/**
 * The flyers taped up on the fridges' outer sides (the owner's, 2026-11-10: the black sides were bare): the shop's own promotions and what's
 * new in, as a small izakaya pins them up, a little askew, tape across their corners. All six drawn in one picture (a cell each), each fridge
 * side's three made into one shape (one draw a side). `side`: the fridge's x side it's on (+1 its right as you face it, -1 its left); `z` along
 * its depth from its middle, `y` up its side, `w` across, `tilt` turned in its own plane
 */
const FLYER_CELL = { w: 340, h: 480, cols: 3 }
const FLYERS: { n: 0 | 1; side: 1 | -1; z: number; y: number; w: number; tilt: number; draw: (g: CanvasRenderingContext2D, W: number, H: number) => void }[] = [
  // (the liquor fridge's left side: half-price first draught, Korean soju new in, all-you-can-drink)
  { n: 1, side: -1, z: 0.13, y: 1.42, w: 0.24, tilt: 0.04, draw: (g, W, H) => {
    g.fillStyle = '#f7d23c'; g.fillRect(0, 0, W, H)
    g.fillStyle = '#c4161c'; g.fillRect(0, 0, W, H * 0.24)
    flyerText(g, 'HAPPY HOUR', W / 2, H * 0.08, 34, '#fff3c8', SANS_BOLD)
    flyerText(g, '16:30–18:00', W / 2, H * 0.18, 28, '#fff3c8', SANS_BOLD)
    beerMug(g, W / 2, H * 0.47, 70)
    flyerText(g, '生ビール', W / 2, H * 0.7, 54, '#1a1a1a', SANS_BOLD)
    flyerText(g, '一杯目 半額', W / 2, H * 0.84, 50, '#c4161c', SANS_BOLD)
  } },
  { n: 1, side: -1, z: -0.17, y: 1.18, w: 0.21, tilt: -0.06, draw: (g, W, H) => {
    g.fillStyle = '#eef6ea'; g.fillRect(0, 0, W, H)
    g.fillStyle = '#1f7a3a'; g.fillRect(0, H * 0.82, W, H * 0.18)
    flyerText(g, '新入荷！', W / 2, H * 0.1, 46, '#c62a2a', SANS_BOLD)
    sojuBottle(g, W * 0.3, H * 0.5, 1)
    sojuBottle(g, W * 0.52, H * 0.52, 0.92, true)
    flyerText(g, '소주', W * 0.78, H * 0.36, 52, '#1f7a3a', HANGUL_BOLD)
    flyerText(g, '韓国', W * 0.78, H * 0.5, 34, '#1a1a1a', SANS_BOLD)
    flyerText(g, '焼酎', W * 0.78, H * 0.6, 34, '#1a1a1a', SANS_BOLD)
    flyerText(g, '青ぶどうも', W / 2, H * 0.74, 30, '#3a7a2a', SANS_BOLD)
    flyerText(g, '一本 ¥120〜', W / 2, H * 0.91, 36, '#ffffff', SANS_BOLD)
  } },
  { n: 1, side: -1, z: 0.12, y: 0.95, w: 0.2, tilt: -0.02, draw: (g, W, H) => {
    g.fillStyle = '#fbf6ea'; g.fillRect(0, 0, W, H)
    g.strokeStyle = '#1c2a4a'; g.lineWidth = 8; g.strokeRect(14, 14, W - 28, H - 28)
    flyerText(g, '飲み放題', W / 2, H * 0.24, 62, '#1c2a4a', SANS_BOLD)
    flyerText(g, '90分', W / 2, H * 0.46, 56, '#c4161c', SANS_BOLD)
    flyerText(g, '¥1,500', W / 2, H * 0.64, 66, '#1a1a1a', SANS_BOLD)
    flyerText(g, 'ビール・ハイボール', W / 2, H * 0.8, 24, '#4a4a4a', SANS_BOLD)
    flyerText(g, 'サワー・ソフトドリンク', W / 2, H * 0.87, 22, '#4a4a4a', SANS_BOLD)
  } },
  // (the drinks fridge's right side: ramune for summer, two cultured milks for less, a second highball off)
  { n: 0, side: 1, z: -0.12, y: 1.4, w: 0.22, tilt: -0.05, draw: (g, W, H) => {
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#9fdcf6'); sky.addColorStop(1, '#e8f8ff')
    g.fillStyle = sky; g.fillRect(0, 0, W, H)
    ramuneBottle(g, W / 2, H * 0.48, 1)
    flyerText(g, '夏季限定', W / 2, H * 0.1, 44, '#c62a2a', SANS_BOLD)
    flyerText(g, 'ラムネ', W / 2, H * 0.8, 64, '#1f5ab0', SANS_BOLD)
    flyerText(g, 'よく冷えてます', W / 2, H * 0.92, 28, '#1f5ab0', SANS_BOLD)
  } },
  { n: 0, side: 1, z: 0.17, y: 1.2, w: 0.2, tilt: 0.05, draw: (g, W, H) => {
    g.fillStyle = '#fff6f8'; g.fillRect(0, 0, W, H)
    g.fillStyle = '#e8708f'; for (let k = 0; k < 9; k++) { g.beginPath(); g.arc(30 + k * 36, 30, 10, 0, Math.PI * 2); g.fill() }
    flyerText(g, '乳酸菌', W / 2, H * 0.24, 50, '#b8305a', SANS_BOLD)
    flyerText(g, 'ドリンク', W / 2, H * 0.36, 44, '#b8305a', SANS_BOLD)
    smallBottle(g, W * 0.38, H * 0.55); smallBottle(g, W * 0.62, H * 0.55)
    flyerText(g, '2本で', W / 2, H * 0.74, 40, '#1a1a1a', SANS_BOLD)
    flyerText(g, '¥30 引き', W / 2, H * 0.87, 52, '#c4161c', SANS_BOLD)
  } },
  { n: 0, side: 1, z: -0.14, y: 0.98, w: 0.21, tilt: 0.03, draw: (g, W, H) => {
    g.fillStyle = '#1c2a4a'; g.fillRect(0, 0, W, H)
    g.fillStyle = '#e8c45a'; g.fillRect(20, H * 0.62, W - 40, 4)
    flyerText(g, 'ハイボール', W / 2, H * 0.16, 50, '#e8c45a', SANS_BOLD)
    highballGlass(g, W / 2, H * 0.4)
    flyerText(g, '2杯目から', W / 2, H * 0.72, 40, '#f4efe2', SANS_BOLD)
    flyerText(g, '¥100 OFF', W / 2, H * 0.86, 56, '#e8c45a', SANS_BOLD)
  } },
]
const SANS_BOLD = '900 {s}px "Yu Gothic", "Hiragino Kaku Gothic ProN", "Meiryo", "Noto Sans JP", sans-serif'
const HANGUL_BOLD = '800 {s}px "Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif'
function flyerText(g: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, fill: string, font: string) {
  g.font = font.replace('{s}', String(size))
  g.textAlign = 'center'; g.textBaseline = 'middle'
  // (squeezed in if it's wider than the flyer)
  const w = g.measureText(text).width, room = FLYER_CELL.w - 36
  g.save(); g.translate(x, y); if (w > room) g.scale(room / w, 1)
  g.fillStyle = fill; g.fillText(text, 0, 0)
  g.restore()
}
function beerMug(g: CanvasRenderingContext2D, x: number, y: number, s: number) {
  g.fillStyle = '#e8a82a'; g.fillRect(x - s * 0.5, y - s * 0.4, s, s * 0.9)
  g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(x, y - s * 0.42, s * 0.56, s * 0.2, 0, 0, Math.PI * 2); g.fill()
  for (const k of [-0.3, 0, 0.3]) { g.beginPath(); g.arc(x + k * s, y - s * 0.52, s * 0.16, 0, Math.PI * 2); g.fill() }
  g.strokeStyle = '#8a5a14'; g.lineWidth = 6; g.strokeRect(x - s * 0.5, y - s * 0.4, s, s * 0.9)
  g.beginPath(); g.arc(x + s * 0.55, y + s * 0.05, s * 0.22, -Math.PI / 2, Math.PI / 2); g.stroke()
  g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(x - s * 0.36, y - s * 0.3, s * 0.08, s * 0.7)
}
function sojuBottle(g: CanvasRenderingContext2D, x: number, y: number, k: number, grape = false) {
  g.save(); g.translate(x, y); g.scale(k, k)
  g.fillStyle = grape ? '#6aa84a' : '#3f8a4a'
  g.beginPath(); g.moveTo(-12, -110); g.lineTo(12, -110); g.lineTo(12, -70); g.quadraticCurveTo(34, -55, 34, -20); g.lineTo(34, 90); g.lineTo(-34, 90); g.lineTo(-34, -20); g.quadraticCurveTo(-34, -55, -12, -70); g.closePath(); g.fill()
  g.fillStyle = '#2e7d3a'; g.fillRect(-13, -122, 26, 14)
  g.fillStyle = '#f7f8f3'; g.fillRect(-30, -5, 60, 60)
  g.fillStyle = grape ? '#3a7a2a' : '#1f7a3a'; g.font = '800 20px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.fillText(grape ? '청포도' : '소주', 0, 25)
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(-26, -40, 8, 120)
  g.restore()
}
function ramuneBottle(g: CanvasRenderingContext2D, x: number, y: number, k: number) {
  g.save(); g.translate(x, y); g.scale(k, k)
  g.fillStyle = 'rgba(120,200,230,0.85)'
  g.beginPath(); g.moveTo(-14, -120); g.lineTo(14, -120); g.lineTo(14, -90); g.quadraticCurveTo(10, -60, 30, -40); g.lineTo(30, 80); g.lineTo(-30, 80); g.lineTo(-30, -40); g.quadraticCurveTo(-10, -60, -14, -90); g.closePath(); g.fill()
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(0, -70, 11, 0, Math.PI * 2); g.fill()
  g.fillStyle = '#1f5ab0'; g.fillRect(-15, -134, 30, 16)
  g.fillStyle = '#1f5ab0'; g.fillRect(-30, -10, 60, 34)
  g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(-22, -36, 7, 110)
  g.restore()
}
function smallBottle(g: CanvasRenderingContext2D, x: number, y: number) {
  g.fillStyle = '#fbf3ea'; g.beginPath(); g.moveTo(x - 20, y + 40); g.lineTo(x - 20, y); g.quadraticCurveTo(x - 10, y - 12, x - 18, y - 30); g.lineTo(x + 18, y - 30); g.quadraticCurveTo(x + 10, y - 12, x + 20, y); g.lineTo(x + 20, y + 40); g.closePath(); g.fill()
  g.strokeStyle = '#c45a7a'; g.lineWidth = 3; g.stroke()
  g.fillStyle = '#d42a24'; g.fillRect(x - 18, y - 38, 36, 9)
  g.fillStyle = '#d42a24'; g.fillRect(x - 20, y + 4, 40, 18)
}
function highballGlass(g: CanvasRenderingContext2D, x: number, y: number) {
  g.fillStyle = 'rgba(232,180,80,0.9)'; g.fillRect(x - 34, y - 50, 68, 110)
  g.fillStyle = 'rgba(255,255,255,0.75)'; for (const [dx, dy] of [[-14, -30], [10, -6], [-6, 22], [16, 38]]) { g.beginPath(); g.arc(x + dx, y + dy, 6, 0, Math.PI * 2); g.fill() }
  g.fillStyle = 'rgba(220,240,250,0.9)'; g.fillRect(x - 24, y - 46, 26, 22); g.fillRect(x + 2, y - 36, 22, 20)
  g.strokeStyle = '#f4efe2'; g.lineWidth = 5; g.strokeRect(x - 34, y - 70, 68, 132)
}
/** the six flyers' picture: each its cell, paper's grain over it, a strip of tape across its two top corners */
const FLYER_TEX = canvasTex(FLYER_CELL.w * FLYER_CELL.cols, FLYER_CELL.h * 2, (g) => {
  const { w: W, h: H, cols } = FLYER_CELL
  FLYERS.forEach((f, i) => {
    const x0 = (i % cols) * W, y0 = Math.floor(i / cols) * H
    g.save(); g.beginPath(); g.rect(x0, y0, W, H); g.clip(); g.translate(x0, y0)
    f.draw(g, W, H)
    // (the paper's grain, faintly; its edge a touch darker)
    g.globalCompositeOperation = 'multiply'
    g.fillStyle = g.createPattern(grain(), 'repeat')!; g.fillRect(0, 0, W, H)
    g.globalCompositeOperation = 'source-over'
    g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 4; g.strokeRect(2, 2, W - 4, H - 4)
    // (tape across each top corner, see-through)
    for (const sd of [-1, 1]) {
      g.save(); g.translate(sd < 0 ? 26 : W - 26, 22); g.rotate(sd * 0.75)
      g.fillStyle = 'rgba(246,240,214,0.72)'; g.fillRect(-34, -11, 68, 22)
      g.restore()
    }
    g.restore()
  })
})
/** each fridge's flyers as one shape: their planes, turned to face out from its side, at their places, each its cell of the picture */
function flyerGeo(n: 0 | 1) {
  const { W } = FRIDGE
  const { w: CW, h: CH, cols } = FLYER_CELL
  const parts: THREE.BufferGeometry[] = []
  FLYERS.forEach((f, i) => {
    if (f.n !== n) return
    const h = f.w * (CH / CW)
    const q = new THREE.PlaneGeometry(f.w, h)
    const u0 = (i % cols) / cols, v1 = 1 - Math.floor(i / cols) / 2, uv = q.attributes.uv as THREE.BufferAttribute
    for (let k = 0; k < uv.count; k++) uv.setXY(k, u0 + uv.getX(k) / cols, v1 - 0.5 + uv.getY(k) / 2)
    q.rotateZ(f.tilt)
    q.rotateY(f.side * Math.PI / 2)
    q.translate(f.side * (W / 2 + 0.004), f.y, f.z)
    parts.push(q)
  })
  const g = mergeGeometries(parts)!
  for (const q of parts) q.dispose()
  return g
}
const FLYER_MAT = new THREE.MeshToonMaterial({ color: '#ffffff', map: FLYER_TEX })
function DrinkFridgeImpl({ n = 0 }: { n?: number }) {
  const { body } = useFreezer(n)
  const flyers = useMemo(() => flyerGeo(n as 0 | 1), [n])
  useEffect(() => () => flyers.dispose(), [flyers])
  return (
    <group>
      <primitive object={body} />
      {/* (the flyers on its outer side) */}
      <mesh geometry={flyers} material={FLYER_MAT} castShadow={false} />
      {/* (its cove lights are the model's own: a black baffle up each side behind the gasket, the acrylic behind it and the light washed on
          the wall (blender/drinkfridge.py). The old ones drawn here (the owner's, 2026-11-10): a dark post 3 cm square up each side 7 cm in
          from the wall, the shelves' lips and wire running through it, and in it a bare white bar of light) */}
    </group>
  )
}
/**
 * The fridge's door: a glass door in a dark frame, hinged on the fridge's left with a long handle on its right, swinging
 * open (out into the room) when someone's at the fridge or when it's clicked, and shutting after; while it's open the cold
 * pours out of it in a low white mist.
 */
export const FridgeDoor = memo(FridgeDoorImpl)
/** how far a fridge's back's outer door slides across, over the inner (item 554): its left edge past the inner's, the left half open, its
 * right end 2 mm short of the steel trim's outer edge */
const REAR_SLIDE = 0.33
const FRIDGE_DOOR_AT = new THREE.Vector3()
/**
 * (item 615) a drink fridge's thermostat display, in the header's strip over its doors at the right (blender/drinkfridge.py: the doors'
 * opening to 1.90, the sign from 1.935): the inside's temperature in green on dark glass, red once it's too warm for a cold drink (game/
 * fridgeTemp's WARM_AT), the setting with SET beside it just after a press; a left click colder, a right warmer, as the freezer's knob
 */
const TEMP_PANEL = { x: 0.3, y: 1.9175, w: 0.09, h: 0.03 }
function drawDrinkTemp(g: CanvasRenderingContext2D, t: number, setting: boolean, warm: boolean) {
  g.fillStyle = '#0e1612'; g.fillRect(0, 0, 256, 86)
  g.fillStyle = warm && !setting ? '#ff6a5a' : '#5affb0'; g.textBaseline = 'middle'
  g.font = 'bold 64px monospace'; g.textAlign = 'right'
  g.fillText(`${t}`, setting ? 170 : 184, 47)
  g.font = 'bold 30px monospace'; g.textAlign = 'left'
  g.fillText('℃', setting ? 172 : 186, 36)
  if (setting) { g.font = 'bold 22px monospace'; g.fillText('SET', 174, 70) }
}
function FridgeDoorImpl({ n = 0 }: { n?: number }) {
  const { W, D } = FRIDGE
  const { doors, doorRoot, home, rears, rearRoot, rearHome } = useFreezer(n)
  const door = doors[0]
  const open = useRef(0)
  const mist = useRef(0)
  // (its back's doors (item 554; item 535's hatch slid up, item 431's pair was the whole back): the outer slid across while the stocker
  // fills it from the stock room)
  const rear = useRef({ k: 0, sounded: false })
  // (item 615) its thermostat's display: its own canvas, drawn again only when what it shows changes
  const temp = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 256; c.height = 86
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    return { g: c.getContext('2d')!, tex, last: '' }
  }, [])
  useEffect(() => () => temp.tex.dispose(), [temp])
  const tempTip = () => {
    const u = DRINK_FRIDGE_TEMP.units[n]
    return { title: '飲料櫃溫度', hint: `現在 ${Math.round(u.now)}℃（設定 ${u.set}℃）${servedWarm(u.now) ? '｜太溫，拿出來的飲料不冰' : ''}｜左鍵調冷、右鍵調暖，${DRINK_MIN}～${DRINK_MAX}℃`, warn: servedWarm(u.now) }
  }
  const pressTemp = (dir: 1 | -1) => { pressDrinkTemp(n, dir); lightSwitchSound(dir < 0); setTip(tempTip()) }
  // (the door's state lives outside React: leave it shut when the shop's let go, so it doesn't come back open)
  useEffect(() => () => { FRIDGE_STATE[n].open = false; FRIDGE_STATE[n].passing = 0; FRIDGE_STATE[n].rearOpen = false }, [n])
  // (heard: its seal let go as it starts to swing open, a muffled knock as it swings shut (the owner's), as loud as it's near)
  const sounded = useRef(0)
  useFrame((_, dt) => {
    const want = FRIDGE_STATE[n].passing > 0 || FRIDGE_STATE[n].open ? 1 : 0
    door.getWorldPosition(FRIDGE_AT[n])
    const near = () => heard(door.getWorldPosition(FRIDGE_DOOR_AT)).near
    if (want && !sounded.current) { sounded.current = 1; coolerDoorSound(true, near()) }
    else if (!want && sounded.current && open.current < 0.04) { sounded.current = 0; coolerDoorSound(false, near()) }
    open.current += Math.sign(want - open.current) * Math.min(Math.abs(want - open.current), Math.min(dt, 0.1) * 2.2)
    const e = open.current * open.current * (3 - 2 * open.current)
    // (the pair swing out from the middle: the left on its left edge, the right on its right)
    doors[0].rotation.y = -e * (Math.PI / 2)
    doors[1].rotation.y = e * (Math.PI / 2)
    home.home(e === 0)
    mist.current = e
    // (the back's doors (item 554): the outer pulled across over the inner, quick to start and running on to its stop, a little rebound off
    // it; let go, slid home, a knock as it shuts; heard from there. How far open, kept for the stocker (he steps in once it's open, and away
    // only once it's home))
    const r = rear.current, wantR = FRIDGE_STATE[n].stocker || FRIDGE_STATE[n].rearOpen ? 1 : 0
    if (wantR && !r.sounded) { r.sounded = true; coolerDoorSound(true, near() * 0.6) }
    else if (!wantR && r.sounded && r.k < 0.04) { r.sounded = false; coolerDoorSound(false, near() * 0.6) }
    r.k += Math.sign(wantR - r.k) * Math.min(Math.abs(wantR - r.k), Math.min(dt, 0.1) * 2.2)
    FRIDGE_STATE[n].rear = r.k
    // (item 615) the inside drifting: toward the room's air while a door's open (its front, its back's, a hand in it), back to its setting
    // shut; the display showing it (or the setting, a moment after a press)
    {
      const u = DRINK_FRIDGE_TEMP.units[n]
      if (u) {
        u.now = driftDrinkTemp(u.now, u.set, want > 0 || r.k > 0.02, tick(dt))
        const setting = performance.now() - u.shownAt < 2000, warm = servedWarm(u.now)
        const shows = setting ? u.set : Math.round(u.now)
        const key = `${shows}${setting}${warm}`
        if (key !== temp.last) { temp.last = key; drawDrinkTemp(temp.g, shows, setting, warm); temp.tex.needsUpdate = true }
      }
    }
    {
      const q = r.k, h = rears[0], rest = h.userData.rest as THREE.Vector3 | undefined
      // (opening: eased out to its stop by four fifths of the way, then a rebound of a centimetre off it; shutting: eased in and out)
      const e = !wantR ? q * q * (3 - 2 * q) : q < 0.8 ? 1 - (1 - q / 0.8) ** 2 : 1 - 0.035 * Math.sin(((q - 0.8) / 0.2) * Math.PI)
      if (rest) h.position.x = rest.x + e * REAR_SLIDE
    }
    rearHome.home(r.k === 0)
  })
  return (
    <group>
      {/* the model's own door, hung on its pivot (the glass and its frame), swung with the rest of the model's scale */}
      <group onClick={(ev) => { ev.stopPropagation(); if (getEdit().on) return; FRIDGE_STATE[n].open = !FRIDGE_STATE[n].open }} {...tipOver('飲料櫃', '點一下開關門')}><primitive object={doorRoot} /></group>
      {/* (its thermostat's display over its doors (item 615): left click colder, right warmer) */}
      <mesh position={[TEMP_PANEL.x, TEMP_PANEL.y, D / 2 + 0.004]}
        onClick={(ev) => { ev.stopPropagation(); if (getEdit().on) return; pressTemp(-1) }}
        onContextMenu={(ev) => { ev.stopPropagation(); ev.nativeEvent.preventDefault(); if (getEdit().on) return; pressTemp(1) }}
        onPointerOver={(ev) => { ev.stopPropagation(); if (getEdit().on) return; handOver.onPointerOver(ev); setTip(tempTip()) }}
        onPointerOut={(ev) => { handOver.onPointerOut(ev); setTip(null) }}>
        <planeGeometry args={[TEMP_PANEL.w, TEMP_PANEL.h]} />
        <meshBasicMaterial map={temp.tex} toneMapped={false} />
      </mesh>
      {/* (its back's doors, in the stock room: slid open by a click, shut by another (item 614, the owner's 「是用拉門式的，這邊可以互動」); the
          stocker's own opening of them goes on as ever) */}
      <group onClick={(ev) => { ev.stopPropagation(); if (getEdit().on) return; FRIDGE_STATE[n].rearOpen = !FRIDGE_STATE[n].rearOpen }}
        {...tipOver('飲料櫃後門', '點一下拉開／關上（從倉庫補貨的拉門）')}><primitive object={rearRoot} /></group>
      {/* the cold, pouring out over the open door's foot and rolling out over the floor (it was drawn as rising steam: the owner saw it
          was wrong) */}
      <group position={[0, 0, D / 2 + 0.02]}>
        <ColdMist width={W * 0.85} drop={0.4} reach={0.9} level={mist} />
      </group>
    </group>
  )
}
/**
 * Every drink as it is in a hand or on a table (DrinkBottle, wet; one lifted on its shelf is the shelf's own, DrinkBottleLite): none of them stand in the scene as it loads
 * now that the shelves' are the plain ones (DrinkBottleLite), so their programs were made the first time a customer took one (a 317 ms
 * frame); made here unseen, once, and handed to the prewarm (warmLater) instead
 */
export const DrinkWarm = memo(function DrinkWarm() {
  const g = useRef<THREE.Group>(null)
  useEffect(() => { if (g.current) warmLater(g.current) }, [])
  return (
    <group ref={g} visible={false}>
      {DRINKS.map((d) => <group key={d.id}><DrinkBottle id={d.id} wet /></group>)}
      {/* (and the sake cup, its sake in it) */}
      <SakeCup />
    </group>
  )
})
