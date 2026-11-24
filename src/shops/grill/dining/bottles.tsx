import { memo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { DRINKS, type DrinkId } from '@/shops/grill/bar'
import { DRINK_SCALE, formOf, shapeOf, liteBodyColour, soju, KIND_OF, glassAlpha } from './drinkKinds'
import { shelfTall, shelfSize } from './shelves'
import { BOTTLE_SHAPE, BOTTLE_DRINK, LITE_PTS, LITE_FAR, farLabel, LITE_GEO, BOTTLE_GEO, LABEL_W, LABEL_H, CELL_W, CELL_H, ATLAS_COLS, cellOf, LABEL_ATLAS, labelGeo, tinted, LABEL_MAT, GLASS, CAN, FILL, PARTS, SHELF_PARTS, SHELF_LABEL, SHELF_GLASS, SHELF_METAL, shaded, shadedGlass, liteDrink, CAN_LID, LITE_CAN_LID, LITE_CAN_LID_FAR, SMALL_FAR, SMALL_LID, SMALL_LID_FAR, CAN_TAB, PACK, shadedLabel, MARBLE, DEW } from './bottleGeometry'

/** (`lit`: standing in a fridge, in its cove lights' wash: lifted by a soft glow of its own, which can't leak out through the cabinet as a lamp's light would) */
/** (`wet`: out of the fridge, misted over with beads of condensation, a few run down) */
export const DrinkBottle = memo(DrinkBottleImpl)
/**
 * The pictures of the drinks for the ranks deep in the fridges (DrinkBottleLite's `deep`): each drink's side as it stands (its outline from
 * the shelf bottle's own profile, its glass, its label's band and its cap; a can's print; a pack's paper), one slot each of one picture, and
 * for each drink two cards crossed upright, its width and height, mapped to its slot; one material, so a fridge's are one draw.
 * (the owner's, 2026-11-13: "good, but a bit dark; adjust it, and more real": at night they stood grey-brown blocks behind the bright front
 * ones. Their labels now the front ones' own print (LABEL_ATLAS: a pack's front panel, a can's or a bottle's front half), where they were two
 * bands of its colours; the shading at their edges lighter; and lit from within a touch as the front ones' labels are (BACK_CARD's emissive),
 * the fridge's own light in them)
 */
const BACK_SLOT_W = 64, BACK_SLOT_H = 256
/** under the sides, each drink's top as seen from above, a square BACK_SLOT_W across (items 65, 65b): a cap's top with its ribbed edge, a
 * can's lid and its pull, a pack's top with its seam and its straw hole's foil; laid on every rank as one flat card each, as big as the cap
 * or the lid it is (item 90: a bottle's was as wide as the bottle, a disc floating over its neck from the side) */
const BACK_TOP = BACK_SLOT_W, BACK_TALL = BACK_SLOT_H + BACK_TOP
const FRONT_TOP_Y = BACK_SLOT_H
/** how much the deep ranks' pictures glow (the front labels' 0.3; a touch under it, being further in) */
const BACK_GLOW = 0.26
const BACK_IDS = DRINKS.map((x) => x.id as DrinkId)
const BACK_ATLAS = typeof document === 'undefined' ? null : (() => {
  const c = document.createElement('canvas')
  c.width = BACK_SLOT_W * BACK_IDS.length; c.height = BACK_TALL
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return { c, t, drawn: false }
})()
function backDims(id: DrinkId) {
  const sc = DRINK_SCALE[id]
  return { w: shelfSize(id)[0] / sc, h: shelfTall(id) / sc }
}
function drawBackAtlas() {
  if (!BACK_ATLAS || BACK_ATLAS.drawn) return
  BACK_ATLAS.drawn = true
  const g = BACK_ATLAS.c.getContext('2d')!
  g.clearRect(0, 0, BACK_ATLAS.c.width, BACK_TALL)
  // (the front ones' labels, every one drawn round its bottle in a cell of LABEL_ATLAS: `u0`..`u1` of its way round, its front, put into the
  // rectangle given; none there (no page), its two colours as bands)
  const labels = (LABEL_ATLAS as THREE.CanvasTexture | null)?.image as HTMLCanvasElement | undefined
  const print = (id: DrinkId, u0: number, u1: number, dx: number, dy: number, dw: number, dh: number) => {
    if (!labels) return false
    const { c, r } = cellOf(id)
    const k = labels.width / (CELL_W * ATLAS_COLS)
    g.drawImage(labels, (c * CELL_W + 8 + u0 * LABEL_W) * k, (r * CELL_H + 8) * k, (u1 - u0) * LABEL_W * k, LABEL_H * k, dx, dy, dw, dh)
    return true
  }
  BACK_IDS.forEach((id, i) => {
    const d = DRINKS.find((x) => x.id === id)!
    const kind = KIND_OF[id], shaped = shapeOf(id), { w, h } = backDims(id)
    const x0 = i * BACK_SLOT_W, X = (x: number) => x0 + (x / w + 0.5) * BACK_SLOT_W, Y = (y: number) => BACK_SLOT_H * (1 - y / h)
    const [l0, l1] = d.label as [string, string, string]
    g.save()
    if (shaped) {
      // (the bottle's outline from its profile, its glass's colour shaded across it, the label's band, the cap)
      const pts = LITE_PTS[shaped]
      g.beginPath()
      pts.forEach(([r, y], k) => (k ? g.lineTo(X(r), Y(y)) : g.moveTo(X(r), Y(y))))
      for (let k = pts.length - 1; k >= 0; k--) g.lineTo(X(-pts[k][0]), Y(pts[k][1]))
      g.closePath()
      const gr = g.createLinearGradient(X(-w / 2), 0, X(w / 2), 0)
      const body = liteBodyColour(id)
      gr.addColorStop(0, '#5a5a5a'); gr.addColorStop(0.3, body); gr.addColorStop(0.55, '#ffffff'); gr.addColorStop(0.62, body); gr.addColorStop(1, '#606060')
      g.fillStyle = body; g.fill(); g.globalAlpha = 0.3; g.fillStyle = gr; g.fill(); g.globalAlpha = 1
      g.clip()
      const lg = LITE_GEO[shaped], lh = (lg.label as THREE.CylinderGeometry).parameters.height
      const ly0 = Y(lg.labelY + lh / 2), ly1 = Y(lg.labelY - lh / 2)
      // (its label's front half round it, across the bottle's width)
      if (!print(id, 0, 0.5, x0, ly0, BACK_SLOT_W, ly1 - ly0)) {
        g.fillStyle = l0; g.fillRect(x0, ly0, BACK_SLOT_W, ly1 - ly0)
        g.fillStyle = l1; g.fillRect(x0, Y(lg.labelY + lh * 0.12), BACK_SLOT_W, Y(lg.labelY - lh * 0.12) - Y(lg.labelY + lh * 0.12))
      }
      g.restore(); g.save()
      g.fillStyle = d.cap; g.fillRect(X(-0.013 * lg.capR), Y(lg.capY + 0.005 * lg.capR), X(0.013 * lg.capR) - X(-0.013 * lg.capR), Y(lg.capY - 0.005 * lg.capR) - Y(lg.capY + 0.005 * lg.capR))
    } else {
      // (a can: its print all round, a silver lid; a pack: its paper, a band; a little bottle: its shape, its foil lid)
      const r = w / 2
      // (its print up its body: a pack's front panel (a seventh past a quarter of the way round either side of its middle, the wide face) under
      // its sealed top; a can's or a little bottle's front half under its lid)
      const top = kind === 'can' ? h * 0.95 : kind === 'pack' ? Math.min(h, PACK.h) : kind === 'small' ? h * 0.93 : h
      g.fillStyle = l0; g.fillRect(X(-r), Y(h), X(r) - X(-r), Y(0) - Y(h))
      if (!print(id, kind === 'pack' ? 0.107 : 0, kind === 'pack' ? 0.393 : 0.5, X(-r), Y(top), X(r) - X(-r), Y(0) - Y(top))) {
        g.fillStyle = l1; g.fillRect(X(-r), Y(h * 0.62), X(r) - X(-r), Y(h * 0.42) - Y(h * 0.62))
      }
      if (kind === 'can') { g.fillStyle = '#c8ccd2'; g.fillRect(X(-r * 0.9), Y(h), X(r * 0.9) - X(-r * 0.9), Y(h * 0.95) - Y(h)) }
      if (kind === 'small') { g.fillStyle = d.cap; g.fillRect(X(-r * 0.9), Y(h), X(r * 0.9) - X(-r * 0.9), Y(h * 0.93) - Y(h)) }
      const gr = g.createLinearGradient(X(-r), 0, X(r), 0)
      gr.addColorStop(0, 'rgba(0,0,0,0.16)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, 'rgba(0,0,0,0.16)')
      g.fillStyle = gr; g.fillRect(X(-r), Y(h), X(r) - X(-r), Y(0) - Y(h))
    }
    g.restore()
    // (its top, in the square under its side: the card is laid over just the cap, the can's lid inside its rim, the
    // pack's whole top (its picture stretched 3 : 4 across it, so the hole drawn as an ellipse here is round there))
    const fx = x0 + BACK_TOP / 2, fy = FRONT_TOP_Y + BACK_TOP / 2, R = BACK_TOP / 2 - 1
    g.save()
    const fdisc = (rr: number, fill: string | CanvasGradient) => { g.beginPath(); g.arc(fx, fy, rr, 0, Math.PI * 2); g.fillStyle = fill; g.fill() }
    const fsheen = (rr: number) => { const s_ = g.createRadialGradient(fx - rr * 0.35, fy - rr * 0.35, rr * 0.05, fx, fy, rr); s_.addColorStop(0, 'rgba(255,255,255,0.4)'); s_.addColorStop(0.7, 'rgba(255,255,255,0)'); s_.addColorStop(1, 'rgba(0,0,0,0.22)'); return s_ }
    if (kind === 'pack') {
      g.fillStyle = l0; g.fillRect(x0, FRONT_TOP_Y, BACK_TOP, BACK_TOP)
      // (the light falling on one slope of the gable, the seam's shadow down the middle, its fin's top a thin light line)
      g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(x0, FRONT_TOP_Y, BACK_TOP / 2 - 3, BACK_TOP)
      g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(fx - 3, FRONT_TOP_Y, 6, BACK_TOP)
      g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(fx - 0.5, FRONT_TOP_Y, 1, BACK_TOP)
      // (the straw hole near a corner, where the pack's had it (PACK.holeAt: a quarter across each way): silver foil, its scored ring, a dent)
      const hx = x0 + BACK_TOP * 0.75, hy = FRONT_TOP_Y + BACK_TOP * 0.75, rx = BACK_TOP * 0.0034 / 0.03, ry = BACK_TOP * 0.0034 / 0.04
      const foil = g.createRadialGradient(hx - rx * 0.3, hy - ry * 0.3, 0.5, hx, hy, rx)
      foil.addColorStop(0, '#f4f6f8'); foil.addColorStop(1, '#a9afb6')
      g.fillStyle = foil; g.beginPath(); g.ellipse(hx, hy, rx, ry, 0, 0, Math.PI * 2); g.fill()
      g.strokeStyle = 'rgba(60,64,70,0.7)'; g.lineWidth = 1; g.beginPath(); g.ellipse(hx, hy, rx * 0.62, ry * 0.62, 0, 0, Math.PI * 2); g.stroke()
    } else if (kind === 'can') {
      // (the rim's roll, the lid sunk inside it, its scored ring, the pull lying on it, its finger hole and rivet)
      fdisc(R, '#c3c8cf'); fdisc(R * 0.9, '#8f959d'); fdisc(R * 0.86, '#d2d6dc')
      g.strokeStyle = 'rgba(80,85,92,0.55)'; g.lineWidth = 1; g.beginPath(); g.arc(fx, fy, R * 0.72, 0, Math.PI * 2); g.stroke()
      // (no dark spots on it: the pull's hole and the opening only a shade off the lid, or from above it reads as a face)
      g.strokeStyle = 'rgba(90,96,104,0.6)'; g.beginPath(); g.ellipse(fx, fy - R * 0.4, R * 0.24, R * 0.13, 0, 0, Math.PI * 2); g.stroke()
      g.fillStyle = '#e2e5e9'; g.beginPath(); g.ellipse(fx, fy + R * 0.16, R * 0.17, R * 0.34, 0, 0, Math.PI * 2); g.fill()
      g.strokeStyle = 'rgba(90,96,104,0.55)'; g.stroke()
      g.fillStyle = '#a7adb5'; g.beginPath(); g.ellipse(fx, fy + R * 0.3, R * 0.08, R * 0.11, 0, 0, Math.PI * 2); g.fill()
      fdisc(R, fsheen(R))
    } else {
      // (a cap: its colour, the fine ribs round its edge, the ring pressed into its top, the light on it)
      fdisc(R, d.cap)
      g.strokeStyle = 'rgba(0,0,0,0.28)'; g.lineWidth = 1
      for (let k = 0; k < 40; k++) {
        const a = (k / 40) * Math.PI * 2
        g.beginPath(); g.moveTo(fx + Math.cos(a) * R * 0.86, fy + Math.sin(a) * R * 0.86); g.lineTo(fx + Math.cos(a) * R, fy + Math.sin(a) * R); g.stroke()
      }
      g.strokeStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.arc(fx, fy, R * 0.66, 0, Math.PI * 2); g.stroke()
      g.strokeStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); g.arc(fx, fy, R * 0.62, 0, Math.PI * 2); g.stroke()
      fdisc(R, fsheen(R))
    }
    g.restore()
  })
  BACK_ATLAS.t.needsUpdate = true
}
const BACK_CARD = new THREE.MeshStandardMaterial({ color: '#ffffff', map: BACK_ATLAS?.t ?? null, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.45,
  // (lit from within a touch, as the front ones' labels are (LABEL_LIT): the fridge's light in them, not grey in the dark at night)
  emissive: '#ffffff', emissiveMap: BACK_ATLAS?.t ?? null, emissiveIntensity: BACK_GLOW })
const BACK_CARDS = new Map<DrinkId, THREE.BufferGeometry>()
/** a front rank's top (item 65b, the owner's: "the caps, the cans' rims, the packs' straw holes one flat piece, the detail in the picture"):
 * one card `sx` by `sz` lying flat at `y`, its picture the drink's square in the strip under the back ones', in the same material as theirs
 * (merged with them in the shelf's batch: no draw more, no program more) */
const FRONT_TOPS = new Map<string, THREE.BufferGeometry>()
function frontTop(id: DrinkId, sx: number, sz: number, y: number) {
  const key = `${id}|${sx}|${sz}|${y}`
  const hit = FRONT_TOPS.get(key)
  if (hit) return hit
  drawBackAtlas()
  const i = BACK_IDS.indexOf(id), u0 = i / BACK_IDS.length, u1 = (i + 1) / BACK_IDS.length, topV = BACK_TOP / BACK_TALL
  const g = new THREE.PlaneGeometry(sx, sz).rotateX(-Math.PI / 2).translate(0, y, 0)
  const uv = g.attributes.uv
  for (let k = 0; k < uv.count; k++) { uv.setX(k, u0 + uv.getX(k) * (u1 - u0)); uv.setY(k, uv.getY(k) * topV) }
  FRONT_TOPS.set(key, g)
  return g
}
function backCard(id: DrinkId) {
  const hit = BACK_CARDS.get(id)
  if (hit) return hit
  drawBackAtlas()
  const { w, h } = backDims(id), i = BACK_IDS.indexOf(id)
  const u0 = i / BACK_IDS.length, u1 = (i + 1) / BACK_IDS.length
  // (the picture's sides above, its tops in the strip under them: v from the canvas's top (three's flipY))
  const sideV = BACK_TOP / BACK_TALL, topV = sideV
  const card = (turn: number) => {
    const p = new THREE.PlaneGeometry(w, h).translate(0, h / 2, 0).rotateY(turn)
    const uv = p.attributes.uv
    for (let k = 0; k < uv.count; k++) { uv.setX(k, u0 + uv.getX(k) * (u1 - u0)); uv.setY(k, sideV + uv.getY(k) * (1 - sideV)) }
    return p
  }
  // (and its top: a card laid flat at its height, its top's picture on it (item 65, the owner's: "one piece on top of the drinks,
  // the picture pressed on it"): from above they read as caps and lids, not as the X of the two cards; as big as the front ones' (item 90):
  // a bottle's only its cap, a can's its lid, a pack's its whole top)
  const shaped = shapeOf(id), kind = KIND_OF[id]
  const lw = shaped ? 0.026 * LITE_GEO[shaped].capR : kind === 'small' ? 0.031 : kind === 'can' ? 0.0366 : w
  // (a hair over the crossed cards' tops, not under them: under, their edges showed through it as an X)
  const lid = new THREE.PlaneGeometry(lw, lw).rotateX(-Math.PI / 2).translate(0, h * 1.004, 0)
  const luv = lid.attributes.uv
  for (let k = 0; k < luv.count; k++) { luv.setX(k, u0 + luv.getX(k) * (u1 - u0)); luv.setY(k, luv.getY(k) * topV) }
  const g = mergeGeometries([card(0), card(Math.PI / 2), lid])!
  BACK_CARDS.set(id, g)
  return g
}
export const DrinkBottleLite = memo(function DrinkBottleLite({ id, back = false, deep = false }: { id: DrinkId; back?: boolean; deep?: boolean }) {
  const d = DRINKS.find((x) => x.id === id)!
  const kind = KIND_OF[id]
  const f = formOf(id)
  const shaped = shapeOf(id)
  const body = liteBodyColour(id)
  // (the third back and those behind it (`deep`): a picture of the drink on two cards crossed, four faces where the bottle was sixty to a
  // hundred (the owner's, 2026-11-12: the fridges' back ranks as pictures); hidden by the two before it, it slides up and is drawn whole
  // once it's the second, so the change from picture to bottle is never in sight)
  if (deep) return <group scale={DRINK_SCALE[id]}><mesh geometry={backCard(id)} material={BACK_CARD} /></group>
  return (
    <group scale={DRINK_SCALE[id]}>
      <group rotation-y={-Math.PI / 2}>
        {kind === 'pack' ? <>
          {/* (a paper pack: its printed body, the seam sealed across its top, the silver of its straw hole) */}
          <mesh geometry={shadedLabel(PACK.body, id, true)} material={SHELF_LABEL} />
          <mesh geometry={shaded(PACK.seam, d.label[0], true)} position-y={PACK.h} material={SHELF_PARTS} />
          <mesh geometry={frontTop(id, PACK.d - 0.001, PACK.w - 0.001, PACK.h + 0.0004)} material={BACK_CARD} />
        </> : kind === 'can' && id !== 'cola' && id !== 'greenTea' ? <>
          <mesh geometry={shadedLabel(back ? farLabel(LITE_GEO.canLabel) : LITE_GEO.canLabel, id)} position-y={0.045} material={SHELF_LABEL} />
          <mesh geometry={back ? LITE_CAN_LID_FAR : LITE_CAN_LID} material={SHELF_METAL} />
          <mesh geometry={frontTop(id, 0.0366, 0.0366, 0.0929)} material={BACK_CARD} />
        </> : kind === 'small' ? <>
          <mesh geometry={shadedLabel(back ? SMALL_FAR : BOTTLE_GEO.small, id)} position-y={0.036} material={SHELF_LABEL} />
          <mesh geometry={shaded(back ? SMALL_LID_FAR : SMALL_LID, d.cap)} position-y={0.074} material={SHELF_PARTS} />
          <mesh geometry={frontTop(id, 0.031, 0.031, 0.0759)} material={BACK_CARD} />
        </> : shaped && <>
          {/* (the drink in it seen through its glass (the owner's: they were solid plastic colours), the neck above it only glass: the drink
              first, so the glass is laid over it; the ramune's marble in its neck) */}
          {/* (one behind another (`back`): its glass tinted the drink's colour, the drink in it not drawn, nor the ramune's marble or a collar) */}
          {!back && !(shaped === 'ramune' || shaped === 'sake' || soju(id) || id === 'sports') && <mesh geometry={liteDrink(shaped, id)} material={SHELF_GLASS} />}
          <mesh geometry={shadedGlass(back ? LITE_FAR[shaped] : LITE_GEO[shaped].body, body, back ? Math.min(1, glassAlpha(id) + 0.25) : glassAlpha(id))} material={SHELF_GLASS} />
          {!back && shaped === 'ramune' && <mesh geometry={shadedGlass(LITE_GEO.marble, '#d8f2f8', 0.6)} position-y={0.1402} material={SHELF_GLASS} />}
          <mesh geometry={shadedLabel(back ? farLabel(LITE_GEO[shaped].label) : LITE_GEO[shaped].label, id)} position-y={LITE_GEO[shaped].labelY} material={SHELF_LABEL} />
          <mesh geometry={shaded(back ? LITE_GEO.capFar : LITE_GEO.cap, d.cap)} position-y={LITE_GEO[shaped].capY} scale={LITE_GEO[shaped].capR} material={SHELF_PARTS} />
          <mesh geometry={frontTop(id, 0.026, 0.026, 0.0049)} position-y={LITE_GEO[shaped].capY} scale={LITE_GEO[shaped].capR} material={BACK_CARD} />
          {/* (the beer's gold foil round its neck, the sake's paper collar under its cap (the plum wine's red), as the full bottles have them) */}
          {!back && LITE_GEO[shaped].collar && !soju(id) && (
            <mesh geometry={shaded(LITE_GEO[shaped].collar!.geo, f === 'beer' ? '#d4b04a' : id === 'umeshu' ? '#b8261c' : '#f4efe2')}
              position-y={LITE_GEO[shaped].collar!.y} material={SHELF_PARTS} />
          )}
        </>}
      </group>
    </group>
  )
})
/** (`level`: how much is left in it, 1 full: drunk down sip by sip at the customer's place, and left there empty, or nearly, when they've
 * gone (the owner's, 2026-11-10: it vanished at the last moment and a glass from nowhere stood there); what's inside shown that high) */
function DrinkBottleImpl({ id, wet = false, level = 1 }: { id: DrinkId; wet?: boolean; level?: number }) {
  return <group scale={DRINK_SCALE[id]}><DrinkBottleRaw id={id} wet={wet} level={level} /></group>
}
function DrinkBottleRaw({ id, wet = false, level = 1 }: { id: DrinkId; wet?: boolean; level?: number }) {
  const d = DRINKS.find((x) => x.id === id)!
  const kind = KIND_OF[id]
  const label = LABEL_MAT
  const glassMat = kind === 'can' ? CAN : GLASS
  // (the glass itself: the beer's brown, the ramune's pale aqua, the rest clear; the PET clear and thinner; its tint and clearness in its vertices)
  const glass = (g: THREE.BufferGeometry) => kind === 'can' ? g
    : tinted(g, formOf(id) === 'beer' ? (id === 'darkBeer' ? '#2a1808' : '#5a3010') : id === 'ramune' ? '#a8dcea' : soju(id) ? '#3f8a4a' : kind === 'pet' ? '#f2f6f8' : '#eef4f2',
      formOf(id) === 'beer' ? 0.88 : soju(id) ? 0.7 : kind === 'pet' ? 0.22 : 0.28)
  // (the drink in it: its own colour, a little see-through (the milk not at all))
  const fill = (g: THREE.BufferGeometry) => tinted(g, id === 'ramune' ? '#dff4fa' : id === 'sake' ? '#f6f2de' : d.color,
    id === 'milk' ? 1 : id === 'ramune' || id === 'sake' || soju(id) || id === 'sports' ? 0.22 : 0.85)
  // (turned so its label's name faces +z)
  if (d.shape === 'can' && id !== 'cola' && id !== 'greenTea') return (
    // a can: printed all over, its silver top and rim
    <group rotation-y={-Math.PI / 2}>
      <mesh geometry={BOTTLE_GEO.can} material={glassMat} />
      <mesh geometry={labelGeo(BOTTLE_GEO.canLabel, id)} position-y={0.046} material={label} />
      {wet && <mesh geometry={BOTTLE_GEO.canLabel} position-y={0.046} material={DEW} scale={[1.012, 1, 1.012]} />}
      {/* (its top: the lid pressed down inside its rolled rim, the ring pull lying on it, all aluminium) */}
      <mesh geometry={CAN_LID} material={glassMat} />
      <mesh geometry={CAN_TAB} position={[0, 0.0915, 0.0035]} material={glassMat} />
    </group>
  )
  if (kind === 'pack') return (
    // a paper pack: its printed body, its seam, its straw hole's silver foil; on its back, a straw in its clear wrapper stuck on aslant
    <group rotation-y={-Math.PI / 2}>
      <mesh geometry={labelGeo(PACK.body, id)} material={label} />
      <mesh geometry={tinted(PACK.seam, d.label[0])} position-y={PACK.h} material={PARTS} />
      <mesh geometry={PACK.hole} position={PACK.holeAt} material={CAN} />
      <group position={PACK.strawAt} rotation-x={PACK.strawTilt}>
        <mesh geometry={tinted(PACK.straw, '#f4f1ea')} material={PARTS} />
        <mesh geometry={tinted(PACK.wrap, '#ffffff', 0.32)} material={GLASS} />
      </group>
      {wet && <mesh geometry={PACK.body} material={DEW} scale={[1.02, 1, 1.02]} />}
    </group>
  )
  if (d.shape === 'small') return (
    // the little cultured milk bottle: waisted, a red foil top
    <group rotation-y={-Math.PI / 2}>
      <mesh geometry={labelGeo(BOTTLE_GEO.small, id)} position-y={0.036} material={label} />
      {wet && <mesh geometry={BOTTLE_GEO.small} position-y={0.036} material={DEW} scale={[1.02, 1, 1.02]} />}
      <mesh geometry={tinted(BOTTLE_GEO.smallTop, d.cap)} position-y={0.074} material={PARTS} />
    </group>
  )
  // the bottles proper, each shaped as it is in a shop: the beer's long neck, the sake's slim shoulder, the big tea bottle
  const f = formOf(id)
  const shaped = f === 'beer' ? BOTTLE_SHAPE.beer : f === 'sake' ? BOTTLE_SHAPE.sake : id === 'oolong' ? BOTTLE_SHAPE.pet
    : id === 'cola' || id === 'greenTea' || id === 'sports' ? BOTTLE_SHAPE.pet500 : id === 'milk' ? BOTTLE_SHAPE.milk : null
  const drinkKey = f === 'beer' ? 'beer' : f === 'sake' ? 'sake' : id === 'oolong' ? 'pet' : id === 'milk' ? 'milk' : 'pet500'
  if (shaped) return (
    <group rotation-y={-Math.PI / 2}>
      {/* (the drink inside, seen through the glass or plastic: made before the bottle, so at the same depth it is drawn first and the bottle over it) */}
      {level > 0.03 && <mesh geometry={fill(BOTTLE_DRINK[drinkKey])} material={FILL} scale-y={Math.min(1, level)} />}
      <mesh geometry={glass(shaped.body)} material={glassMat} />
      {wet && <mesh geometry={shaped.body} material={DEW} scale={[1.006, 1, 1.006]} />}
      <mesh geometry={labelGeo(shaped.label, id)} position-y={shaped.labelY} material={label} />
      <mesh geometry={tinted(shaped.cap, d.cap)} position-y={shaped.capY} material={PARTS} />
      {/* (the foil round the beer's neck, the sake's paper collar) */}
      {shaped.foil && <mesh geometry={tinted(shaped.foil, f === 'beer' ? '#d4b04a' : id === 'umeshu' ? '#b8261c' : '#f4efe2')} position-y={shaped.foilY} material={PARTS} />}
    </group>
  )
  // the ramune: its pale aqua glass, the fizzy drink in it, the glass marble held up in the neck's pinch, the blue plastic cap, a paper band
  return (
    <group rotation-y={-Math.PI / 2}>
      {level > 0.03 && <mesh geometry={fill(BOTTLE_GEO.ramuneDrink)} material={FILL} scale-y={Math.min(1, level)} />}
      <mesh geometry={BOTTLE_GEO.marble} position-y={0.1402} material={MARBLE} />
      <mesh geometry={glass(BOTTLE_GEO.ramune)} material={glassMat} />
      {wet && <mesh geometry={BOTTLE_GEO.ramune} material={DEW} scale={[1.006, 1, 1.006]} />}
      <mesh geometry={labelGeo(BOTTLE_GEO.ramuneLabel, id)} position-y={0.055} material={label} />
      <mesh geometry={tinted(BOTTLE_GEO.ramuneCap, d.cap)} position-y={0.182} material={PARTS} />
    </group>
  )
}
