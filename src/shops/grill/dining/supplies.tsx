import { TISSUE } from '@/game/stock/tissues'
import { ROLL } from '@/game/guests/washroom'
import { HOUSEHOLD } from '@/game/stock/household'
import { cornerStack } from '@/game/stock/cornerStock'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { plainColours, mergeByMaterial } from '@/scene/render/StaticBatch'
import { inkModel } from '@/scene/render/inkHull'
import { reflectStudio } from '@/scene/render/studio'
import { useGLTF } from '@react-three/drei'
import { brushText, SIGN_FONT } from '@/scene/props/signFont'
import { askPantry, SUPPLIES, tipOver } from '@/shops/grill/bar'
import { getEdit } from '@/shops/grill/edit'
import { canvasTex } from './base'

const SUPPLIES_URL = import.meta.env.BASE_URL + 'models/supplies.glb'
useGLTF.preload(SUPPLIES_URL)
/** the cartons' print (blender/supplies.py's SupplyCartonPrint): two cells, one for each carton; in each a long side's print (衛生紙, 200抽 ×
 * 5盒, a box of tissues drawn), an end's (衛生紙, this way up), and the plain board of the top along the cell's foot */
/** the corner's cartons as blender/supplies.py lays them out on their print (1536 x 512, 750 px to the metre): each one's piece from x along
 * it, its front (and back) W x H at the top, an end D x H beside it, its top W x D under the front */
const CARTON_PIECES: { x: number; W: number; D: number; H: number; kind: 'tissue' | 'clean' }[] = [
  { x: 4, W: 330, D: 232.5, H: 202.5, kind: 'tissue' },
  { x: 576.5, W: 300, D: 217.5, H: 180, kind: 'tissue' },
  { x: 1104, W: 195, D: 150, H: 165, kind: 'clean' },
]
/**
 * The corner's cartons' print (the owner's: some design to them, and nothing printed running off a face: each face is drawn at its own
 * shape now, every word measured and made smaller till it fits): kraft board, its fluting showing, each face printed in one ink and a red:
 * the tissues' in navy, a band along the top (TISSUE PAPER), 衛生紙 big in brush lettering, ティッシュペーパー under it, a red tag (200抽 ×
 * 5盒) and a little box of tissues drawn at the side inside a fine double rule; their ends 衛生紙 again with this-way-up arrows and 天地無用;
 * their tops a round stamp. The cleaning things' the same in green: 清潔劑, 業務用洗剤, a spray bottle, 6本入.
 */
const CARTON_PRINT = canvasTex(1536, 512, (g) => {
  g.save()
  // (the board: kraft brown, its fluting showing faintly, a little mottled)
  g.fillStyle = '#c49c68'; g.fillRect(0, 0, 1536, 512)
  g.globalAlpha = 0.09
  g.fillStyle = '#5a3a1a'
  for (let k = 0; k < 1536; k += 4) g.fillRect(k, 0, 1, 512)
  g.globalAlpha = 1
  let seed = 3
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  for (let k = 0; k < 160; k++) {
    const x = rnd() * 1536, y = rnd() * 512, r = 10 + rnd() * 40
    const gr = g.createRadialGradient(x, y, 0, x, y, r)
    gr.addColorStop(0, k % 2 ? 'rgba(255,240,210,0.08)' : 'rgba(80,50,20,0.07)'); gr.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2)
  }
  g.restore()
  /** words fitted to a box: as big as `size` but never wider than `w` (measured in their own face), centred at x, y */
  const fit = (text: string, x: number, y: number, w: number, size: number, ink: string, face = 'sans-serif', weight = 'bold', spacing = 0) => {
    g.save()
    g.font = `${weight} ${size}px ${face}`
    const width = g.measureText(text).width + spacing * Math.max(0, [...text].length - 1)
    const k = Math.min(1, w / Math.max(1, width))
    g.font = `${weight} ${size * k}px ${face}`
    ;(g as unknown as { letterSpacing: string }).letterSpacing = `${spacing * k}px`
    g.fillStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle'
    g.fillText(text, x + (spacing * k) / 2, y)
    g.restore()
  }
  /** brush lettering fitted the same way */
  const brush = (text: string, x: number, y: number, w: number, size: number, ink: string) => {
    g.save()
    g.font = `bold ${size}px ${SIGN_FONT}`
    const k = Math.min(1, w / Math.max(1, g.measureText(text).width))
    g.restore()
    brushText(g, text, x, y, size * k, { fill: ink, shadow: 'rgba(60,40,20,0.15)' })
  }
  const round = (x: number, y: number, w: number, h: number, r: number) => {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath()
  }
  for (const c of CARTON_PIECES) {
    const tissue = c.kind === 'tissue'
    const ink = tissue ? '#1e3a6a' : '#22603c', red = '#c0392b'
    // ---- its front (and back): W x H
    {
      g.save()
      const x0 = c.x, y0 = 0, W = c.W, H = c.H, m = Math.min(W, H) * 0.06
      g.beginPath(); g.rect(x0, y0, W, H); g.clip()
      // (a fine double rule round it)
      g.strokeStyle = ink; g.lineWidth = 2.5; g.strokeRect(x0 + m, y0 + m, W - 2 * m, H - 2 * m)
      g.lineWidth = 1; g.strokeRect(x0 + m + 4, y0 + m + 4, W - 2 * m - 8, H - 2 * m - 8)
      // (a band along its top, the English in it white)
      const bandH = H * 0.16
      g.fillStyle = ink; g.fillRect(x0 + m + 4, y0 + m + 4, W - 2 * m - 8, bandH)
      fit(tissue ? 'TISSUE PAPER' : 'CLEANING SUPPLIES', x0 + W / 2, y0 + m + 4 + bandH / 2, W - 2 * m - 24, bandH * 0.55, '#f4ead6', 'sans-serif', 'bold', bandH * 0.12)
      // (the name, big, brushed, on the left two thirds; the Japanese under it)
      const left = x0 + m + 10, colW = (W - 2 * m) * 0.6
      const body = y0 + m + 4 + bandH, bodyH = H - 2 * m - 8 - bandH
      brush(tissue ? '衛生紙' : '清潔劑', left + colW / 2, body + bodyH * 0.36, colW - 8, bodyH * 0.42, ink)
      fit(tissue ? 'ティッシュペーパー' : '業務用洗剤', left + colW / 2, body + bodyH * 0.68, colW - 8, bodyH * 0.13, ink, 'sans-serif', 'bold', 1)
      // (what's in it, white on a red tag at the foot of the left column)
      const tagW = colW * 0.72, tagH = bodyH * 0.17, tagX = left + (colW - tagW) / 2, tagY = body + bodyH * 0.8
      g.fillStyle = red; round(tagX, tagY, tagW, tagH, tagH * 0.35); g.fill()
      fit(tissue ? '200抽 × 5盒' : '2L × 6本入', tagX + tagW / 2, tagY + tagH / 2, tagW - 10, tagH * 0.7, '#fff6ea')
      // (a picture on the right: a box of tissues with one standing up out of it, or a spray bottle)
      const px = left + colW + (W - 2 * m - colW - 10) / 2, py = body + bodyH * 0.55, s2 = Math.min((W - 2 * m - colW) * 0.75, bodyH * 0.62)
      g.lineWidth = 2; g.strokeStyle = ink; g.lineJoin = 'round'
      if (tissue) {
        g.fillStyle = '#ffffff'
        g.fillRect(px - s2 * 0.45, py - s2 * 0.05, s2 * 0.9, s2 * 0.42); g.strokeRect(px - s2 * 0.45, py - s2 * 0.05, s2 * 0.9, s2 * 0.42)
        g.fillStyle = ink; g.fillRect(px - s2 * 0.45, py + s2 * 0.24, s2 * 0.9, s2 * 0.06)
        g.fillStyle = '#ffffff'
        g.beginPath(); g.moveTo(px - s2 * 0.16, py - s2 * 0.05); g.quadraticCurveTo(px - s2 * 0.1, py - s2 * 0.42, px + s2 * 0.02, py - s2 * 0.3)
        g.quadraticCurveTo(px + s2 * 0.12, py - s2 * 0.46, px + s2 * 0.18, py - s2 * 0.05); g.closePath(); g.fill(); g.stroke()
      } else {
        g.fillStyle = '#ffffff'
        round(px - s2 * 0.18, py - s2 * 0.12, s2 * 0.36, s2 * 0.55, s2 * 0.06); g.fill(); g.stroke()
        g.fillStyle = ink
        g.fillRect(px - s2 * 0.07, py - s2 * 0.24, s2 * 0.14, s2 * 0.12)
        g.beginPath(); g.moveTo(px - s2 * 0.07, py - s2 * 0.24); g.lineTo(px - s2 * 0.3, py - s2 * 0.22); g.lineTo(px - s2 * 0.3, py - s2 * 0.3); g.lineTo(px + s2 * 0.07, py - s2 * 0.32); g.closePath(); g.fill()
        g.fillStyle = '#8fd0a8'; g.fillRect(px - s2 * 0.18, py + s2 * 0.05, s2 * 0.36, s2 * 0.14)
      }
      g.restore()
    }
    // ---- its ends: D x H
    {
      g.save()
      const x0 = c.x + c.W, W = c.D, H = c.H, m = Math.min(W, H) * 0.07
      g.beginPath(); g.rect(x0, 0, W, H); g.clip()
      g.strokeStyle = ink; g.lineWidth = 2; g.strokeRect(x0 + m, m, W - 2 * m, H - 2 * m)
      brush(tissue ? '衛生紙' : '清潔劑', x0 + W / 2, H * 0.32, W - 2 * m - 16, H * 0.24, ink)
      // (this way up: two arrows over a bar, and 天地無用)
      g.fillStyle = ink
      const ay = H * 0.6, as = Math.min(W, H) * 0.09
      for (const ax of [x0 + W / 2 - as * 1.4, x0 + W / 2 + as * 1.4]) {
        g.beginPath(); g.moveTo(ax, ay - as); g.lineTo(ax - as * 0.8, ay); g.lineTo(ax + as * 0.8, ay); g.closePath(); g.fill()
        g.fillRect(ax - as * 0.28, ay, as * 0.56, as * 0.8)
      }
      g.fillRect(x0 + W / 2 - as * 2.6, ay + as * 1.05, as * 5.2, as * 0.22)
      fit('天地無用', x0 + W / 2, H * 0.84, W - 2 * m - 16, H * 0.09, ink, 'sans-serif', 'bold', 2)
      g.restore()
    }
    // ---- its top: W x D (its front edge at the foot)
    {
      g.save()
      const x0 = c.x, y0 = c.H, W = c.W, D = c.D
      g.beginPath(); g.rect(x0, y0, W, D); g.clip()
      // (a round stamp off to one side, clear of the tape down the middle)
      const r = Math.min(W * 0.17, D * 0.3), sx = x0 + W * 0.22, sy = y0 + D * 0.5
      g.strokeStyle = red; g.lineWidth = 2.5; g.beginPath(); g.arc(sx, sy, r, 0, Math.PI * 2); g.stroke()
      g.lineWidth = 1; g.beginPath(); g.arc(sx, sy, r * 0.82, 0, Math.PI * 2); g.stroke()
      brush(tissue ? '衛' : '潔', sx, sy - r * 0.12, r * 1.1, r * 0.95, red)
      fit(tissue ? '5盒入' : '6本入', sx, sy + r * 0.52, r * 1.3, r * 0.3, red)
      fit(tissue ? 'TISSUE · 衛生紙' : 'CLEANING · 清潔劑', x0 + W * 0.74, y0 + D * 0.5, W * 0.36, D * 0.1, ink, 'sans-serif', 'bold', 1)
      g.restore()
    }
  }
})
/** packing tape as it is: clear, a little yellow, glossy (the studio in it), the board's print through it (the owner's: it was an opaque
 * brown strip); made once, shared by every carton's */
let tapeMat: THREE.MeshStandardMaterial | null = null
export function clearTape() {
  if (!tapeMat) {
    tapeMat = new THREE.MeshStandardMaterial({ color: '#fbf3df', transparent: true, opacity: 0.32, roughness: 0.12, metalness: 0, depthWrite: false })
    reflectStudio(tapeMat)
  }
  return tapeMat
}
/**
 * The supplies in the corner by the drinks fridge (the owner's: tissue cartons and cleaning things, for the toilets and about the shop;
 * blender/supplies.py): the cartons of spare tissue boxes (the stock's), a pack of toilet rolls on them, a bucket and a carton of cleaning
 * things (the mop and the broom gone, the detergents boxed: the owner's); their tape clear, glossy and see-through. Pointed at, the cartons say how many spare boxes there are; clicked, the stock opens on its supplies.
 * As much of it there as there is in stock (item 199, game/cornerStock): the tissue cartons by the spare boxes, the cleaning things' carton
 * while there's a spare bottle, the pack of rolls a layer at a time; what's left dropped onto what's under it.
 */
/** the stack's layers, by their parts' names in the model */
const CORNER_LAYERS = ['t0', 't1', 'clean', 'rollsLo', 'rollsHi'] as const
const cornerLayerOf = (name: string): (typeof CORNER_LAYERS)[number] | null =>
  /^SupplyCarton0/.test(name) ? 't0' : /^SupplyCarton1/.test(name) ? 't1' : /^Supply(Carton2|Spray|Trigger)/.test(name) ? 'clean'
    : /^SupplyRoll(Core)?\d\d0$/.test(name) ? 'rollsLo' : /^SupplyRoll(Core)?\d\d1$|^SupplyWrapBand/.test(name) ? 'rollsHi' : null
export function CornerSupplies() {
  const gltf = useGLTF(SUPPLIES_URL) as unknown as { scene: THREE.Group }
  const obj = useMemo(() => {
    const r = gltf.scene.getObjectByName('CornerSupplies')!.clone(true)
    r.position.set(0, 0, 0)
    const mats = new Map<THREE.Material, THREE.Material>()
    r.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const src = m.material as THREE.MeshStandardMaterial
      let t = mats.get(src)
      if (!t) {
        if (src.name === 'SupplyTape') t = clearTape()
        else {
          t = new THREE.MeshToonMaterial({ color: src.name === 'SupplyCartonPrint' ? '#ffffff' : src.color.clone(), map: src.name === 'SupplyCartonPrint' ? CARTON_PRINT : null })
          if (src.name === 'SupplyCartonPrint' && CARTON_PRINT) CARTON_PRINT.flipY = false
        }
        mats.set(src, t)
      }
      m.material = t
      m.castShadow = true
      m.receiveShadow = true
    })
    inkModel(r, (m) => /Strand|Core|Bail|Label|Tape/.test(m.name), { width: 0.002, weld: true })
    plainColours(r)
    // (each layer of the stack a group of its own, to be hidden and dropped by the stock (item 199); each folded together by material within
    // it, and the rest together: seventy small parts and their ink lines were each a draw of their own)
    const layers = Object.fromEntries(CORNER_LAYERS.map((k) => { const g = new THREE.Group(); g.name = `corner-${k}`; r.add(g); return [k, g] })) as Record<(typeof CORNER_LAYERS)[number], THREE.Group>
    const moves: [THREE.Object3D, THREE.Group][] = []
    r.traverse((o) => { const k = cornerLayerOf(o.name); if (k && !(o.parent && cornerLayerOf(o.parent.name))) moves.push([o, layers[k]]) })
    for (const [o, g] of moves) g.attach(o)
    const groups = new Set<THREE.Object3D>(Object.values(layers))
    mergeByMaterial(r, (o) => groups.has(o))
    for (const g of groups) mergeByMaterial(g)
    return { r, layers }
  }, [gltf])
  // (looked at twice a second: the stock's counts, the stack laid out by them; the layers reached through a ref of their own, the model's
  // made once)
  const seen = useRef({ at: -1, key: '' })
  const layersRef = useRef<typeof obj.layers | null>(null)
  useLayoutEffect(() => { layersRef.current = obj.layers; seen.current.key = '' }, [obj])
  useFrame(() => {
    const now = performance.now()
    if (now - seen.current.at < 500) return
    seen.current.at = now
    const has = (id: string) => SUPPLIES.has(id)
    const cleanN = HOUSEHOLD.some((id) => has(id) < 0) ? -1 : HOUSEHOLD.reduce((n, id) => n + has(id), 0)
    const st = cornerStack({ tissue: has(TISSUE), clean: cleanN, rolls: has(ROLL) })
    const key = JSON.stringify(st)
    const L = layersRef.current
    if (!L || key === seen.current.key) return
    seen.current.key = key
    L.t0.visible = st.tissue[0]
    L.t1.visible = st.tissue[1]
    L.clean.visible = st.clean
    L.clean.position.y = -st.dropClean
    L.rollsLo.visible = st.rolls[0]
    L.rollsHi.visible = st.rolls[1]
    L.rollsLo.position.y = L.rollsHi.position.y = -st.dropRolls
  })
  const says = () => { const n = SUPPLIES.has(TISSUE); return n < 0 ? '衛生紙與清潔用品・點一下看耗材' : `衛生紙備品 ${n} 盒・點一下看耗材` }
  return (
    <group onPointerOver={(e) => { if (getEdit().on) return; tipOver('衛生紙與清潔用品', says()).onPointerOver(e) }}
      onPointerOut={(e) => { tipOver('衛生紙與清潔用品', '').onPointerOut(e) }}
      onClick={(e) => { e.stopPropagation(); if (getEdit().on) return; askPantry('supplies', 'sack') }}>
      <primitive object={obj.r} />
    </group>
  )
}
