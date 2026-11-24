import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { inkModel } from '@/scene/inkHull'
import { reflectStudio } from '@/scene/studio'
import { useGLTF } from '@react-three/drei'
import { canvasTex } from './base'

const EXIT_URL = import.meta.env.BASE_URL + 'models/exitsign.glb'
/** the language on screen (App sets the page's lang), followed as it's switched */
function useDocLang() {
  const read = () => (typeof document === 'undefined' ? 'zh-Hant' : document.documentElement.lang || 'zh-Hant')
  const [lang, setLang] = useState(read)
  useEffect(() => {
    const mo = new MutationObserver(() => setLang(read()))
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] })
    return () => mo.disconnect()
  }, [])
  return lang
}
/** the exit sign's pane (blender/exitsign.py's PW, PH): a little shorter than it was (the owner's: 0.42) */
const EXIT_PANE = { w: 0.38, h: 0.155 }
/** the exit sign's face, as Taiwan's edge-lit ones: green, lit; in the very middle a white doorway with the running figure leaving by it, its
 * step a line under it as wide either side (the owner's: the sign balanced about the doorway; its step ran out to the right only, and the
 * doorway sat wherever EXIT and the words left it); EXIT spaced out in the middle of the half to its left, the words in the language on
 * screen in the middle of the half to its right, set smaller if they don't fit; each centred on the pane's middle by its own letters' height */
const exitFace = (lang: string) => {
  const words = lang === 'ja' ? '非常口' : lang === 'en' ? 'WAY OUT' : '緊急出口'
  const H = 378, W = Math.round((H * EXIT_PANE.w) / EXIT_PANE.h)
  return canvasTex(W, H, (g) => {
    const MID = H / 2
    // (the ground: a bright green, a little brighter toward the top edge where the light comes in)
    const grad = g.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, '#36dc7c'); grad.addColorStop(1, '#1cb75f')
    g.fillStyle = grad; g.fillRect(0, 0, W, H)
    const edge = g.createLinearGradient(0, 0, 0, 70)
    edge.addColorStop(0, 'rgba(255,255,255,0.32)'); edge.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = edge; g.fillRect(0, 0, W, 70)
    g.fillStyle = '#ffffff'; g.strokeStyle = '#ffffff'; g.lineCap = 'round'; g.lineJoin = 'round'
    g.textBaseline = 'alphabetic'; g.textAlign = 'left'
    // (the doorway in the middle, its step overhanging it as much either side; each half beside it what's left, less a margin and a gap)
    const DOOR = 150, LIP = 20, wIcon = DOOR + 2 * LIP
    const MARGIN = 40, GAP = 36
    const half = (W - wIcon) / 2 - MARGIN - GAP
    // (EXIT's letters with a space between each, closer if they don't fit their half)
    const EXIT_FONT = '600 92px "Arial", "Helvetica", sans-serif'
    g.font = EXIT_FONT
    const letters = 'EXIT'.split('').map((ch) => ({ ch, w: g.measureText(ch).width }))
    const inked = letters.reduce((a, l) => a + l.w, 0)
    const TRACK = Math.max(6, Math.min(22, (half - inked) / (letters.length - 1)))
    const wExit = inked + TRACK * (letters.length - 1)
    const exitM = g.measureText('EXIT')
    let size = lang === 'en' ? 76 : 96
    const wordFont = (px: number) => (lang === 'en' ? `700 ${px}px "Arial", "Helvetica", sans-serif` : `700 ${px}px "Noto Sans TC", "Noto Sans JP", "Microsoft JhengHei", sans-serif`)
    g.font = wordFont(size)
    let wWords = g.measureText(words).width
    if (wWords > half) { size = Math.floor((size * half) / wWords); g.font = wordFont(size); wWords = g.measureText(words).width }
    // (each line of letters set so the middle of its own glyphs is the pane's middle)
    const centred = (m: TextMetrics) => MID + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2
    g.font = EXIT_FONT
    let x = MARGIN + (half - wExit) / 2
    const yExit = centred(exitM)
    for (const l of letters) { g.fillText(l.ch, x, yExit); x += l.w + TRACK }
    // (the doorway: a white frame, open, the green showing through it, the figure running out through it to the right, its step under it)
    const x0 = W / 2 - DOOR / 2, top = MID - 118, foot = MID + 118
    g.fillRect(x0, top, DOOR, foot - top)
    g.fillStyle = grad; g.fillRect(x0 + 18, top + 18, DOOR - 36, foot - top - 18)
    g.fillStyle = '#ffffff'
    const fx = (dx: number) => x0 + dx, fy = (dy: number) => top + dy
    g.beginPath(); g.arc(fx(96), fy(42), 21, 0, Math.PI * 2); g.fill()
    g.lineWidth = 30
    g.beginPath(); g.moveTo(fx(80), fy(76)); g.lineTo(fx(60), fy(136)); g.stroke()
    g.lineWidth = 20
    g.beginPath(); g.moveTo(fx(78), fy(82)); g.lineTo(fx(114), fy(106)); g.lineTo(fx(148), fy(92)); g.stroke()
    g.beginPath(); g.moveTo(fx(78), fy(82)); g.lineTo(fx(48), fy(90)); g.lineTo(fx(30), fy(120)); g.stroke()
    g.beginPath(); g.moveTo(fx(60), fy(136)); g.lineTo(fx(94), fy(168)); g.lineTo(fx(88), fy(212)); g.stroke()
    g.beginPath(); g.moveTo(fx(60), fy(136)); g.lineTo(fx(32), fy(168)); g.lineTo(fx(-2), fy(174)); g.stroke()
    g.fillRect(x0 - LIP, foot - 10, wIcon, 12)
    // (the words, in the middle of the half to the right)
    g.font = wordFont(size)
    g.fillText(words, W / 2 + wIcon / 2 + GAP + (half - wWords) / 2, centred(g.measureText(words)))
  })
}
/** a soft glow the shape of a lit panel: a rectangle (iw x ih) on a w x h sheet, blurred `blur` px all round (the blur of a shadow cast from
 * off the sheet: canvas filters aren't in every browser) */
function softRect(w: number, h: number, iw: number, ih: number, blur: number) {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const g = c.getContext('2d')!
  g.shadowColor = '#ffffff'; g.shadowBlur = blur; g.shadowOffsetX = w * 2
  g.fillStyle = '#ffffff'
  g.fillRect((w - iw) / 2 - w * 2, (h - ih) / 2, iw, ih)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}
/** the exit sign's light round its pane (EXIT_PANE in its frame, on a sheet 0.2 wider and 0.35 high: 516 px a unit), and the wider light it
 * throws on the wall behind */
const EXIT_HALO = softRect(Math.round((EXIT_PANE.w + 0.2) * 516), 180, Math.round(EXIT_PANE.w * 516), 80, 26)
const EXIT_SPILL = softRect(256, 160, 110, 50, 40)
/**
 * The emergency exit sign on the wall by the way out (blender/exitsign.py): an aluminium housing along the top, an acrylic pane hanging from
 * it lit from its edge, its face (both sides) lit whatever the room's lights, the words in the language on screen
 */
/** where the exit sign's little spot is aimed: down from it and out from the wall: its pool on the floor in front, not a streak down the wall */
const EXIT_SPOT_AIM = (() => { const o = new THREE.Object3D(); o.position.set(0, -1.5, 0.75); return o })()
export function ExitSign() {
  const lang = useDocLang()
  const gltf = useGLTF(EXIT_URL) as unknown as { scene: THREE.Group }
  const face = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false, side: THREE.FrontSide }), [])
  useEffect(() => {
    const t = exitFace(lang)
    if (!t) return
    t.flipY = false
    face.map = t
    face.needsUpdate = true
    return () => t.dispose()
  }, [lang, face])
  const model = useMemo(() => {
    const root = gltf.scene.clone(true)
    const alu = new THREE.MeshStandardMaterial({ color: '#c9cdd2', metalness: 1, roughness: 0.34 })
    reflectStudio(alu)
    const edge = new THREE.MeshBasicMaterial({ color: '#dcffe9', toneMapped: false, transparent: true, opacity: 0.95 })
    root.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const src = m.material as THREE.MeshStandardMaterial
      m.material = src.name === 'ExitFaceLit' ? face : src.name === 'ExitPaneEdge' ? edge : alu
    })
    inkModel(root, (m) => !/ExitBox/.test(m.name), { width: 0.0012, weld: true })
    return root
  }, [gltf, face])
  return (
    <group>
      <primitive object={model} />
      {/* (its light: a green edge all round the pane, from a glow its own shape just behind it, and the light it throws on the wave frieze
          behind (its face 0.038 in front of it), wider and fainter; it was a round glow, orange-tinted, its bright middle hidden by the pane) */}
      <mesh position={[0, 0, -0.012]}>
        <planeGeometry args={[EXIT_PANE.w + 0.2, 0.35]} />
        <meshBasicMaterial map={EXIT_HALO} color="#6dffad" transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.02, -0.036]}>
        <planeGeometry args={[1.2, 0.75]} />
        <meshBasicMaterial map={EXIT_SPILL} color="#3ee58a" transparent opacity={0.45} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      {/* (a faint green light of its own, on its own battery (the owner's): the same whatever the room's switches, never raised. A narrow,
          soft-edged spot pointed down from just in front of the pane, so only a small pool under the sign takes its green: as a point light
          it lit a big round patch on the wall, hard-edged where its reach ended, that stood out once the room went dark. There from the start
          (a light added later recompiles every material)) */}
      <spotLight position={[0, -0.1, 0.14]} color="#40ff90" intensity={0.7} distance={1.8} decay={2} angle={0.35} penumbra={0.8}
        target={EXIT_SPOT_AIM} />
      <primitive object={EXIT_SPOT_AIM} />
    </group>
  )
}
useGLTF.preload(EXIT_URL)
