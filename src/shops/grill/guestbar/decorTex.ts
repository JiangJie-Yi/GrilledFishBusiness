import * as THREE from 'three'
import { brushText, followSign, signTexture } from '@/scene/signFont'
import { WC_W } from '@/shops/grill/bar'
import { PEOPLE_SCALE, STAFF_SCALE } from './staffPoses'

/** the staff's door, along the first counter's wall: where the koi print hung, a little along from the bamboo in the corner (the owner's) */
export const STAFF_DOOR_AT = -3.55
/** the koi print, moved (the owner's): on the toilets' wall past the drinks fridges, on the plain plaster there; once only, the same array
 * each time (the wall's memo compares it) */
const koiHangs = new Map<string, { z: number; print: 'koi' | 'fuji' }[]>()
// (by the men's toilet now, on the wall between the drinks fridges and its doorway, over the supplies' stack (the owner's, 2026-11-11): it hung on
// the fridges' other side)
// (and Mount Fuji (富士山) by the women's toilet, in the middle of the wall between its doorway and the corner (item 430, the owner's
// 「原本的畫不見了，幫我搬到女廁旁」: it hung in the bay past the drinks fridges, on their left from the room (measured on the code before
// item 425: koi on their right, Fuji on their left, nothing else on that wall), and item 425's move of the toilets and the fridges by 2.6 cm
// put that bay's place inside the 30 cm kept clear of them, and it was gone; the bay is the storeroom's way in now. Item 430 hung the rain
// on the bridge (雨中橋) there by mistake: item 468, the owner's 「原本的畫怎變了? 是在冷藏櫃左手邊的，不是長這樣」))
export function koiHang(clear: [number, number][], from: number, door?: number, to?: number) {
  const g0 = door === undefined ? undefined : door - WC_W - 0.12
  const below = g0 === undefined ? [] : clear.filter((r) => r[1] <= g0)
  const lo = clear.length ? Math.min(...clear.map((r) => r[0])) : from + 1
  const z = g0 !== undefined && below.length ? (Math.max(...below.map((r) => r[1])) + g0) / 2 : Math.max(from + 0.4, lo - 0.55)
  const rain = door !== undefined && to !== undefined && to - (door + WC_W + 0.12) > 0.75 ? (door + WC_W + 0.12 + to) / 2 : null
  const key = `${z.toFixed(3)}|${rain?.toFixed(3) ?? ''}`
  let v = koiHangs.get(key)
  if (!v) { v = [{ z, print: 'koi' as const }, ...(rain === null ? [] : [{ z: rain, print: 'fuji' as const }])]; koiHangs.set(key, v) }
  return v
}
/** a customer in the boss's style, drawn in the customers' frame (PEOPLE_SCALE): the staff's size */
export const FOLK_FIT = STAFF_SCALE / PEOPLE_SCALE

/**
 * The way in's noren, in the manner of a modern shop's: unbleached cotton, plain, the shop's crest large in dark brown across the middle
 * (a rounded diamond, a fine one inside it, and in it the shop's first character in a rounded square), and its name in small spaced
 * capitals under it.
 */
export const crestNorenTexture = (mark: string) => signTexture(384 * 3, 256 * 3, (g) => {
  // (drawn mirrored: the cloth's face is the side toward the room, so the crest and the name read right from inside)
  g.setTransform(-3, 0, 0, 3, 384 * 3, 0)
  const BROWN = '#3e2a1c'
  // (the cloth: warm off-white, a little darker toward the hem, a fine weave, the dye-free cotton's slubs)
  const grad = g.createLinearGradient(0, 0, 0, 256)
  grad.addColorStop(0, '#efe8d8'); grad.addColorStop(1, '#ddd3bd')
  g.fillStyle = grad; g.fillRect(0, 0, 384, 256)
  g.strokeStyle = 'rgba(120,100,70,0.06)'
  for (let y = 0; y < 256; y += 2.5) { g.beginPath(); g.moveTo(0, y); g.lineTo(384, y); g.stroke() }
  for (let x = 0; x < 384; x += 3) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke() }
  let seed = 11
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  g.fillStyle = 'rgba(150,125,90,0.12)'
  for (let k = 0; k < 220; k++) g.fillRect(rnd() * 384, rnd() * 256, 3 + rnd() * 6, 0.8)
  // (the crest: a rounded diamond in a heavy line with a fine one inside it)
  const CX = 192, CY = 104
  const diamond = (r: number, round: number) => {
    g.beginPath()
    const pts: [number, number][] = [[CX, CY - r], [CX + r, CY], [CX, CY + r], [CX - r, CY]]
    g.moveTo((pts[0][0] + pts[3][0]) / 2, (pts[0][1] + pts[3][1]) / 2)
    for (let i = 0; i < 4; i++) g.arcTo(pts[i][0], pts[i][1], pts[(i + 1) % 4][0], pts[(i + 1) % 4][1], round)
    g.closePath()
  }
  g.strokeStyle = BROWN
  g.lineWidth = 6; diamond(68, 14); g.stroke()
  g.lineWidth = 1.6; diamond(58, 11); g.stroke()
  // (in it, a rounded square with the character)
  g.lineWidth = 3.2
  g.beginPath(); g.roundRect(CX - 27, CY - 27, 54, 54, 9); g.stroke()
  brushText(g, [...mark][0] ?? '', CX, CY + 2, 40, { fill: BROWN })
  // (the name under it, small and spaced, in the brown)
  g.fillStyle = BROWN
  g.font = '700 12px Georgia, serif'
  g.textAlign = 'center'; g.textBaseline = 'middle'
  const name = 'K I K U N O   ·   Y A K I Z A K A N A'
  g.fillText(name, CX, CY + 92)
})

/** one panel's third of the noren cloth (a clone of the texture, offset) */
export const panelTex = (tex: THREE.Texture | null, i: number) => {
  if (!tex) return null
  const key = `p${i}`
  const cache = (tex.userData.panels ??= {}) as Record<string, THREE.Texture>
  if (!cache[key]) {
    const t = tex.clone()
    t.repeat.set(1 / 3, 1)
    t.offset.set(i / 3, 0)
    t.needsUpdate = true
    followSign(tex, t)
    cache[key] = t
  }
  return cache[key]
}
