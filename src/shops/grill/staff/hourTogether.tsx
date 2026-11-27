import { memo, useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { inkModel } from '@/scene/render/inkHull'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { signTexture } from '@/scene/props/signFont'

/**
 * The owner's hour together after hours (item 770, the owner's 「如果有住宿，下班就有機會跟員工培養感情」, its second half: shown, not only
 * counted): what's on the bar between them while one of those living upstairs sits on the stool by his fire with him (CompanionAtBar), by
 * what they're doing (game/staff/afterWork): two cans of beer; the shogi board between them and a cup each; the radio and a cup each; two
 * bowls of noodles from the stall with their chopsticks; her photographs from home, open, and a cup each; a cup of tea each. Each thing low
 * (one lathe and a ladder across its top, rule 2: no fan; a box), its look in its picture; toon (the shop's own programs). Laid in the bar's
 * frame from where the cup before the stool goes: x along the bar, z toward the stool; theirs before them, his a hand further in, across.
 */
const GLOW = '#2a1f14'
const toon = (o: THREE.MeshToonMaterialParameters) => new THREE.MeshToonMaterial({ emissive: GLOW, emissiveIntensity: 1, ...o })
/** a regular n-gon's face at height y, radius r, closed by a ladder of quads across it (not a fan), facing up; its picture laid flat over it */
function ladderDisc(r: number, y: number, n: number) {
  const pts: [number, number][] = []
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; pts.push([Math.cos(a) * r, Math.sin(a) * r]) }
  const pos: number[] = [], nor: number[] = [], uv: number[] = []
  const put = (...ix: number[]) => { for (const i of ix) { pos.push(pts[i][0], y, pts[i][1]); nor.push(0, 1, 0); uv.push(pts[i][0] / (2 * r) + 0.5, pts[i][1] / (2 * r) + 0.5) } }
  put(0, n - 1, 1)
  for (let k = 1; k < n / 2 - 1; k++) { put(k, n - k, n - k - 1); put(k, n - k - 1, k + 1) }
  put(n / 2 - 1, n / 2 + 1, n / 2)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  return g
}
/** a lathe of `profile` ([r, y] up its side) `segs` round, and its top's face at `cap` ([r, y]): one geometry, its side and its top two
 * groups (two materials) */
function vessel(profile: [number, number][], segs: number, cap: [number, number]) {
  const side = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segs).toNonIndexed()
  const top = ladderDisc(cap[0], cap[1], segs)
  const g = mergeGeometries([side, top], true)!
  side.dispose(); top.dispose()
  return g
}
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0)

// ---- the pictures (made once)
/** a beer can's: silver at its ends, its middle gold with a red ring and 生 on it, twice round */
const CAN_TEX = signTexture(128, 64, (g) => {
  g.fillStyle = '#c9ccd0'; g.fillRect(0, 0, 128, 64)
  g.fillStyle = '#d6aa4a'; g.fillRect(0, 21, 128, 22)
  g.fillStyle = '#9b2b25'; g.fillRect(0, 21, 128, 2); g.fillRect(0, 41, 128, 2)
  for (const x of [32, 96]) {
    g.fillStyle = '#b8322a'; g.beginPath(); g.arc(x, 32, 8, 0, Math.PI * 2); g.fill()
    g.fillStyle = '#fff6e0'; g.font = 'bold 11px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('生', x, 33)
  }
})
const CAN_TOP_TEX = signTexture(32, 32, (g) => {
  g.fillStyle = '#b9bcc0'; g.fillRect(0, 0, 32, 32)
  g.strokeStyle = '#8d9094'; g.lineWidth = 2; g.beginPath(); g.arc(16, 16, 13, 0, Math.PI * 2); g.stroke()
  g.fillStyle = '#7e8184'; g.beginPath(); g.ellipse(16, 10, 5, 3, 0, 0, Math.PI * 2); g.fill()
})
/** a bowl of noodles from the stall: the broth, the noodles in it, a slice of pork, a slice of naruto, spring onion */
const SOUP_TEX = signTexture(128, 128, (g) => {
  g.fillStyle = '#b8742e'; g.fillRect(0, 0, 128, 128)
  g.strokeStyle = '#f0dc9a'; g.lineWidth = 3
  for (let i = 0; i < 9; i++) {
    g.beginPath()
    for (let x = 14; x <= 114; x += 4) { const y = 30 + i * 8 + Math.sin(x / 9 + i) * 4; if (x === 14) g.moveTo(x, y); else g.lineTo(x, y) }
    g.stroke()
  }
  g.fillStyle = '#8a4a2a'; g.beginPath(); g.ellipse(44, 52, 18, 13, 0.4, 0, Math.PI * 2); g.fill()
  g.fillStyle = '#f6efe6'; g.beginPath(); g.arc(82, 72, 12, 0, Math.PI * 2); g.fill()
  g.strokeStyle = '#e07a9a'; g.lineWidth = 2.5; g.beginPath()
  for (let a = 0; a < Math.PI * 5; a += 0.2) { const r = 1 + a * 0.6; g.lineTo(82 + Math.cos(a) * r, 72 + Math.sin(a) * r) }
  g.stroke()
  g.fillStyle = '#5f9a3a'
  for (let i = 0; i < 26; i++) { const a = i * 2.4, r = 10 + (i * 7) % 40; g.fillRect(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 4, 3) }
})
/** a cup of tea's face */
const TEA_TEX = signTexture(32, 32, (g) => { g.fillStyle = '#9a8a3a'; g.fillRect(0, 0, 32, 32); g.fillStyle = 'rgba(255,250,220,0.35)'; g.fillRect(6, 8, 10, 3) })
/** the radio's front: a speaker's grille, a dial with its needle, two knobs */
const RADIO_TEX = signTexture(128, 80, (g) => {
  g.fillStyle = '#e8dcc4'; g.fillRect(0, 0, 128, 80)
  g.fillStyle = '#3a3430'
  for (let y = 12; y < 70; y += 6) for (let x = 10; x < 62; x += 6) { g.beginPath(); g.arc(x, y, 1.6, 0, Math.PI * 2); g.fill() }
  g.fillStyle = '#2a2622'; g.fillRect(70, 12, 50, 24)
  g.strokeStyle = '#d8cfa8'; g.lineWidth = 1
  for (let x = 74; x < 118; x += 5) { g.beginPath(); g.moveTo(x, 30); g.lineTo(x, x % 10 ? 33 : 26); g.stroke() }
  g.strokeStyle = '#d0402e'; g.lineWidth = 2; g.beginPath(); g.moveTo(96, 14); g.lineTo(96, 34); g.stroke()
  for (const x of [80, 108]) { g.fillStyle = '#4a3e34'; g.beginPath(); g.arc(x, 56, 9, 0, Math.PI * 2); g.fill(); g.fillStyle = '#8a7a66'; g.fillRect(x - 1, 47, 2, 6) }
})
/** the shogi board's face: the grid, its four star points, the pieces part way into a game */
const SHOGI_TEX = signTexture(144, 160, (g) => {
  g.fillStyle = '#e2b766'; g.fillRect(0, 0, 144, 160)
  const x0 = 9, y0 = 10, cw = 14, ch = 15.5
  g.strokeStyle = '#3a2a16'; g.lineWidth = 1
  for (let i = 0; i <= 9; i++) {
    g.beginPath(); g.moveTo(x0 + i * cw, y0); g.lineTo(x0 + i * cw, y0 + 9 * ch); g.stroke()
    g.beginPath(); g.moveTo(x0, y0 + i * ch); g.lineTo(x0 + 9 * cw, y0 + i * ch); g.stroke()
  }
  g.fillStyle = '#3a2a16'
  for (const [i, j] of [[3, 3], [6, 3], [3, 6], [6, 6]]) { g.beginPath(); g.arc(x0 + i * cw, y0 + j * ch, 1.6, 0, Math.PI * 2); g.fill() }
  // (a piece: a pentagon pointing at the other side, pale wood with a dark edge and a stroke for its name)
  const piece = (i: number, j: number, theirs: boolean) => {
    const cx = x0 + (i + 0.5) * cw, cy = y0 + (j + 0.5) * ch, s = theirs ? -1 : 1
    g.fillStyle = '#f2d9a2'; g.strokeStyle = '#5a4020'; g.lineWidth = 0.8
    g.beginPath(); g.moveTo(cx, cy - 6.5 * s); g.lineTo(cx + 5, cy - 3.5 * s); g.lineTo(cx + 5.5, cy + 6 * s); g.lineTo(cx - 5.5, cy + 6 * s); g.lineTo(cx - 5, cy - 3.5 * s)
    g.closePath(); g.fill(); g.stroke()
    g.fillStyle = '#2a1a0a'; g.fillRect(cx - 2.5, cy - 0.5, 5, 1.2)
  }
  const mine = [[0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [6, 8], [7, 8], [8, 8], [1, 7], [7, 7], [0, 6], [1, 6], [2, 5], [3, 6], [4, 6], [5, 5], [6, 6], [7, 6], [8, 6]]
  for (const [i, j] of mine) { piece(i, j, false); piece(8 - i, 8 - j - (j === 5 ? 1 : 0), true) }
})
/** her photographs from home, the album open: rice terraces under the sky and the sea with a boat (left page); the hills and a shrine's
 * gate, and her family by a house (right) */
const ALBUM_TEX = [signTexture(96, 128, (g) => {
  g.fillStyle = '#f3ecdc'; g.fillRect(0, 0, 96, 128)
  const photo = (y: number, paint: () => void) => { g.save(); g.fillStyle = '#ffffff'; g.fillRect(10, y, 76, 52); g.beginPath(); g.rect(13, y + 3, 70, 46); g.clip(); paint(); g.restore() }
  photo(8, () => {
    g.fillStyle = '#9cc8e8'; g.fillRect(13, 11, 70, 20)
    for (let k = 0; k < 4; k++) { g.fillStyle = k % 2 ? '#7fb04a' : '#9cc45a'; g.beginPath(); g.ellipse(48, 32 + k * 6, 46 - k * 3, 6, 0, 0, Math.PI * 2); g.fill() }
  })
  photo(66, () => {
    g.fillStyle = '#a8d4ee'; g.fillRect(13, 69, 70, 22); g.fillStyle = '#3c7cb0'; g.fillRect(13, 91, 70, 24)
    g.fillStyle = '#f4f0e6'; g.beginPath(); g.moveTo(40, 96); g.lineTo(58, 96); g.lineTo(54, 101); g.lineTo(43, 101); g.fill()
    g.fillRect(48, 86, 2, 10)
  })
}), signTexture(96, 128, (g) => {
  g.fillStyle = '#f3ecdc'; g.fillRect(0, 0, 96, 128)
  const photo = (y: number, paint: () => void) => { g.save(); g.fillStyle = '#ffffff'; g.fillRect(10, y, 76, 52); g.beginPath(); g.rect(13, y + 3, 70, 46); g.clip(); paint(); g.restore() }
  photo(8, () => {
    g.fillStyle = '#b8d8ee'; g.fillRect(13, 11, 70, 46)
    g.fillStyle = '#5e8a4a'; g.beginPath(); g.moveTo(13, 57); g.lineTo(40, 22); g.lineTo(62, 40); g.lineTo(83, 28); g.lineTo(83, 57); g.fill()
    g.fillStyle = '#c8322a'; g.fillRect(36, 38, 22, 3); g.fillRect(39, 41, 3, 14); g.fillRect(52, 41, 3, 14); g.fillRect(37, 44, 20, 2)
  })
  photo(66, () => {
    g.fillStyle = '#d8e8c8'; g.fillRect(13, 69, 70, 46)
    g.fillStyle = '#8a6a4a'; g.fillRect(52, 78, 26, 26); g.fillStyle = '#5a4a3a'; g.beginPath(); g.moveTo(48, 80); g.lineTo(65, 70); g.lineTo(82, 80); g.fill()
    for (const [x, h, c] of [[22, 22, '#3a5a8a'], [32, 18, '#c84a5a'], [41, 13, '#e0a040']] as const) {
      g.fillStyle = c; g.fillRect(x - 3, 112 - h, 7, h - 6); g.fillStyle = '#f0c8a0'; g.beginPath(); g.arc(x + 0.5, 109 - h, 3.5, 0, Math.PI * 2); g.fill()
    }
  })
})]

// ---- the things (made once, shared)
const PLAIN = {
  can: toon({ map: CAN_TEX }), canTop: toon({ map: CAN_TOP_TEX }),
  cup: toon({ color: '#efe8da' }), tea: toon({ map: TEA_TEX }),
  bowl: toon({ color: '#9a3b2e' }), soup: toon({ map: SOUP_TEX }), sticks: toon({ color: '#d8b27a' }),
  radio: toon({ color: '#8a5a3a' }), radioFront: toon({ map: RADIO_TEX }), metal: toon({ color: '#b8bcc0' }),
  board: toon({ color: '#c9974a' }), boardTop: toon({ map: SHOGI_TEX }),
  cover: toon({ color: '#7a2a2a' }), pageL: toon({ map: ALBUM_TEX[0] }), pageR: toon({ map: ALBUM_TEX[1] }),
}
/** a can (12 round, 82 faces), a teacup (10 round), a bowl (14 round): each its side and its top */
const CAN_GEO = vessel([[0.026, 0], [0.03, 0.008], [0.03, 0.1], [0.025, 0.112]], 12, [0.025, 0.112])
const CUP_GEO = vessel([[0.02, 0], [0.027, 0.006], [0.029, 0.062], [0.025, 0.064], [0.024, 0.05]], 10, [0.024, 0.05])
const BOWL_GEO = vessel([[0.038, 0], [0.072, 0.05], [0.085, 0.077], [0.078, 0.068]], 14, [0.077, 0.066])
const STICK_GEO = box(0.0045, 0.0045, 0.2)
const RADIO_GEO = box(0.15, 0.09, 0.05)
const AERIAL_GEO = box(0.004, 0.2, 0.004)
const BOARD_GEO = box(0.27, 0.014, 0.3)
const COVER_GEO = box(0.27, 0.008, 0.18)
const PAGE_GEO = box(0.125, 0.005, 0.165)

/** their things and his on the bar (x along it, z toward the stool), and what's between them, by what they're at */
const LAYOUT: Record<string, { mine: [number, number]; his: [number, number]; mid?: [number, number, number]; kind: 'can' | 'cup' | 'bowl' }> = {
  beer: { mine: [0, 0], his: [0.07, -0.21], kind: 'can' },
  tea: { mine: [0, 0], his: [0.06, -0.21], kind: 'cup' },
  latebite: { mine: [0, 0.01], his: [0.05, -0.23], kind: 'bowl' },
  shogi: { mine: [0.2, 0.02], his: [-0.2, -0.2], mid: [0, -0.1, 0.3], kind: 'cup' },
  radio: { mine: [0, 0], his: [0.05, -0.21], mid: [0.24, -0.09, 0], kind: 'cup' },
  hometown: { mine: [0.21, 0.03], his: [-0.19, -0.21], mid: [0, -0.09, 0], kind: 'cup' },
}
function Own({ kind, at }: { kind: 'can' | 'cup' | 'bowl'; at: [number, number] }) {
  const [x, z] = at
  if (kind === 'can') return <mesh geometry={CAN_GEO} material={[PLAIN.can, PLAIN.canTop]} position={[x, 0, z]} raycast={() => {}} />
  if (kind === 'bowl') return (
    <group position={[x, 0, z]}>
      <mesh geometry={BOWL_GEO} material={[PLAIN.bowl, PLAIN.soup]} raycast={() => {}} />
      {/* (the chopsticks across its rim, a little apart) */}
      <mesh geometry={STICK_GEO} material={PLAIN.sticks} position={[0.012, 0.079, 0]} rotation-y={0.25} raycast={() => {}} />
      <mesh geometry={STICK_GEO} material={PLAIN.sticks} position={[-0.004, 0.079, 0.004]} rotation-y={0.32} raycast={() => {}} />
    </group>
  )
  return <mesh geometry={CUP_GEO} material={[PLAIN.cup, PLAIN.tea]} position={[x, 0, z]} raycast={() => {}} />
}
/** what's between them: the radio (its front to them, its aerial up), the shogi board, the album open to them */
function Between({ act, at }: { act: string; at: [number, number, number] }) {
  const [x, z, turn] = at
  if (act === 'radio') return (
    <group position={[x, 0, z]} rotation-y={turn}>
      <mesh geometry={RADIO_GEO} material={[PLAIN.radio, PLAIN.radio, PLAIN.radio, PLAIN.radio, PLAIN.radioFront, PLAIN.radio]} raycast={() => {}} />
      <mesh geometry={AERIAL_GEO} material={PLAIN.metal} position={[0.06, 0.088, -0.01]} rotation-z={-0.5} raycast={() => {}} />
    </group>
  )
  if (act === 'shogi') return <mesh geometry={BOARD_GEO} material={[PLAIN.board, PLAIN.board, PLAIN.boardTop, PLAIN.board, PLAIN.board, PLAIN.board]} position={[x, 0, z]} rotation-y={turn} raycast={() => {}} />
  if (act === 'hometown') return (
    <group position={[x, 0, z]} rotation-y={turn}>
      <mesh geometry={COVER_GEO} material={PLAIN.cover} raycast={() => {}} />
      <mesh geometry={PAGE_GEO} material={[PLAIN.cover, PLAIN.cover, PLAIN.pageL, PLAIN.cover, PLAIN.cover, PLAIN.cover]} position={[-0.067, 0.008, 0]} rotation-z={0.06} raycast={() => {}} />
      <mesh geometry={PAGE_GEO} material={[PLAIN.cover, PLAIN.cover, PLAIN.pageR, PLAIN.cover, PLAIN.cover, PLAIN.cover]} position={[0.067, 0.008, 0]} rotation-z={-0.06} raycast={() => {}} />
    </group>
  )
  return null
}
/** the hour's things on the bar for what they're at (none: nothing) */
export const HourOnBar = memo(function HourOnBar({ act }: { act: string | null }) {
  const l = act ? LAYOUT[act] : undefined
  // (their line round each, as everything on the bar has (the bench's width, welded so it doesn't split at the lathe's seams); the lines'
  // own shapes let go with them)
  const root = useRef<THREE.Group>(null)
  useLayoutEffect(() => {
    const g = root.current
    if (!g) return
    const had = new Set<THREE.Object3D>()
    g.traverse((o) => had.add(o))
    inkModel(g, () => false, { width: 0.0016, weld: true })
    const lines: THREE.BufferGeometry[] = []
    g.traverse((o) => { const m = o as THREE.Mesh; if (!had.has(o) && m.isMesh) lines.push(m.geometry) })
    return () => { for (const x of lines) x.dispose() }
  }, [act])
  if (!act || !l) return null
  return (
    <group ref={root}>
      <Own kind={l.kind} at={l.mine} />
      <Own kind={l.kind} at={l.his} />
      {l.mid && <Between act={act} at={l.mid} />}
    </group>
  )
})
/** every thing the hour puts on the bar, hidden, kept in the shop from the start: their pictures sent up and programs made as it loads, not
 * the moment one's first put down */
export const HourWarm = memo(function HourWarm() {
  return (
    <group visible={false}>
      {Object.keys(LAYOUT).map((a) => <HourOnBar key={a} act={a} />)}
    </group>
  )
})
