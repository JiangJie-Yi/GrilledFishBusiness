import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { inkTogether } from '@/scene/render/inkHull'
import { toChineseNumber } from '@/data/menu'
import { sectionName, sectionOf, type Section } from '@/data/kitchenDishes'
import { tapSound } from '@/scene/interact/tapSound'
import { signTexture } from '@/scene/props/signFont'
import { tipOver, SHOP_MENU } from '@/shops/grill/bar'
import { getEdit } from '@/shops/grill/edit'

/**
 * The menu's wooden tags (品書き木札; item 293, the owner's, 2026-11-17: 「菜單的木條可以貼在這，會隨著菜單數量做變更」, the plaster between the
 * round window and the shrine's shelf over the wainscot): a tag of pale hinoki for each dish on the menu as it stands (bar's SHOP_MENU, as
 * the shop front's boards read it; each name once), its name brushed down it and its price in kanji under it, as the menu board writes it,
 * hung in a row from a dark rail and read right to left from the room; a second row on its own rail under it once there are more than a
 * row holds. Written out again as the menu or the language changes: as many tags as dishes, laid out afresh. Each a thin board (its front
 * its picture on the one canvas, its edges plain wood), all one mesh and one ink line.
 */
const TAG_W = 0.075, TAG_H = 0.34, TAG_T = 0.012, TAG_GAP = 0.012
/** each row's top (the wall's height), and how many a row holds; each tag's picture's size on the canvas (two rows of them) */
const TAG_ROWS = [1.64, 1.24], TAG_COLS = 17
const TAG_PX: [number, number] = [56, 256]
const TAG_FONT = '"LXGW WenKai TC", "Noto Serif TC", serif'
/** a tag: a dish, or (`head`) the plaque before a section's dishes */
type TagRow = { name: string; price: number; head?: boolean }
function paintTags(g: CanvasRenderingContext2D, rows: TagRow[]) {
  const [w, h] = TAG_PX
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.clearRect(0, 0, w * TAG_COLS, h * 2)
  rows.forEach((r, k) => {
    const x0 = (k % TAG_COLS) * w, y0 = Math.floor(k / TAG_COLS) * h
    if (r.head) {
      // (a section's plaque (item 471, as the menu board's, item 470): indigo, darker at its edges, the section's name down it in washi
      // white, as big as fits, a thin rule over and under it; no price)
      // (a lighter indigo than the board's: the shop's warm light and the toon's shade take it near black)
      g.fillStyle = '#41629a'
      g.fillRect(x0, y0, w, h)
      g.fillStyle = '#2f4a78'
      g.fillRect(x0, y0, 5, h); g.fillRect(x0 + w - 5, y0, 5, h)
      g.fillStyle = '#3a2a1c'
      g.beginPath(); g.arc(x0 + w / 2, y0 + 9, 2.6, 0, Math.PI * 2); g.fill()
      const chars = [...r.name].filter((ch) => ch !== '・')
      const size = Math.min(34, Math.floor(190 / Math.max(1, chars.length)))
      g.fillStyle = 'rgba(244,234,214,0.55)'
      g.fillRect(x0 + 12, y0 + 22, w - 24, 2); g.fillRect(x0 + 12, y0 + h - 24, w - 24, 2)
      g.fillStyle = '#f4ead6'
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.font = `700 ${size}px ${TAG_FONT}`
      const top = y0 + h / 2 - (size * chars.length) / 2
      chars.forEach((ch, i) => g.fillText(ch, x0 + w / 2, top + size * (i + 0.5)))
      return
    }
    // (pale hinoki, its grain running down it, each its own shade)
    const tone = 0.94 + 0.06 * Math.sin(k * 2.7)
    g.fillStyle = `rgb(${Math.round(222 * tone)},${Math.round(200 * tone)},${Math.round(156 * tone)})`
    g.fillRect(x0, y0, w, h)
    for (let i = 0; i < 9; i++) {
      const x = x0 + 4 + ((i * 37 + k * 11) % (w - 8))
      g.fillStyle = `rgba(150,110,60,${0.08 + 0.05 * (i % 3)})`
      g.fillRect(x, y0, 1, h)
    }
    // (the nail it hangs from, near its top)
    g.fillStyle = '#3a2a1c'
    g.beginPath(); g.arc(x0 + w / 2, y0 + 9, 2.6, 0, Math.PI * 2); g.fill()
    // (the dish down it, as big as fits, a long one in two columns read right then left, split where its seasoning starts (佐…, …焼き);
    // its price in kanji under it, smaller)
    const chars = [...r.name], price = [...toChineseNumber(r.price)]
    const at = chars.length <= 6 ? chars.length : r.name.indexOf('佐') > 1 ? [...r.name.slice(0, r.name.indexOf('佐'))].length
      : r.name.indexOf('焼き') > 1 ? [...r.name.slice(0, r.name.indexOf('焼き'))].length : Math.ceil(chars.length / 2)
    const cols = at >= chars.length ? [chars] : [chars.slice(0, at), chars.slice(at)]
    const most = Math.max(...cols.map((c) => c.length))
    const size = Math.min(cols.length > 1 ? 24 : 40, Math.floor(150 / Math.max(1, most)))
    const ps = Math.min(22, Math.floor(70 / Math.max(1, price.length)))
    g.fillStyle = '#1b120a'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.font = `700 ${size}px ${TAG_FONT}`
    cols.forEach((col, j) => {
      const cx = x0 + (cols.length > 1 ? (j === 0 ? 0.69 : 0.31) : 0.5) * w
      const top = y0 + 24 + (j === 0 ? 0 : size * 0.5)
      col.forEach((ch, i) => g.fillText(ch, cx, top + size * (i + 0.5)))
    })
    g.font = `700 ${ps}px ${TAG_FONT}`
    const py = y0 + h - 12 - ps * price.length
    price.forEach((ch, i) => g.fillText(ch, x0 + w / 2, py + ps * (i + 0.5)))
  })
}
let TAG_ROWS_NOW: TagRow[] = []
const TAG_TEX = signTexture(TAG_PX[0] * TAG_COLS, TAG_PX[1] * 2, (g) => paintTags(g, TAG_ROWS_NOW))
/** the tags' own canvas (the texture's may be a smaller copy: scene/textureCap) */
const TAG_CANVAS = TAG_TEX?.image as HTMLCanvasElement | undefined
const TAG_MAT = new THREE.MeshToonMaterial({ color: '#ffffff', map: TAG_TEX })
const TAG_RAIL_MAT = new THREE.MeshToonMaterial({ color: '#3b2618' })
/** the tags for `n` dishes along the wall from z0 to z1 (read from z1, the room's right), each a thin board out from the wall */
function tagsGeometry(n: number, z0: number, z1: number) {
  const pos: number[] = [], uv: number[] = [], idx: number[] = []
  const W = TAG_PX[0] * TAG_COLS, H = TAG_PX[1] * 2
  const face = (pts: number[][], uvs: number[][]) => {
    const b = pos.length / 3
    for (const p of pts) pos.push(...p)
    for (const q of uvs) uv.push(...q)
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3)
  }
  const per = TAG_W + TAG_GAP
  for (let k = 0; k < n; k++) {
    const row = Math.floor(k / TAG_COLS), col = k % TAG_COLS
    const inRow = Math.min(TAG_COLS, n - row * TAG_COLS)
    // (each row centred on the stretch, from its right)
    const mid = (z0 + z1) / 2, start = mid + ((inRow - 1) * per) / 2
    const zc = start - col * per
    const ya = TAG_ROWS[row] - TAG_H, yb = TAG_ROWS[row]
    const za = zc - TAG_W / 2, zb = zc + TAG_W / 2, xf = -0.004 - TAG_T, xb = -0.004
    // (its picture: the canvas's column and row, v up from the canvas's foot)
    const u0 = (col * TAG_PX[0]) / W, u1 = ((col + 1) * TAG_PX[0]) / W
    const v1 = 1 - (row * TAG_PX[1]) / H, v0 = v1 - TAG_PX[1] / H
    // (the front, facing the room (-x): read with the room's right to +z)
    face([[xf, ya, za], [xf, ya, zb], [xf, yb, zb], [xf, yb, za]], [[u0, v0], [u1, v0], [u1, v1], [u0, v1]])
    // (its edges: a strip of its own plain wood, by its border)
    const e = [[u0 + 0.0005, v1 - 0.02], [u0 + 0.002, v1 - 0.02], [u0 + 0.002, v1 - 0.01], [u0 + 0.0005, v1 - 0.01]]
    face([[xb, ya, za], [xf, ya, za], [xf, yb, za], [xb, yb, za]], e)
    face([[xf, ya, zb], [xb, ya, zb], [xb, yb, zb], [xf, yb, zb]], e)
    face([[xf, yb, za], [xf, yb, zb], [xb, yb, zb], [xb, yb, za]], e)
    face([[xb, ya, za], [xb, ya, zb], [xf, ya, zb], [xf, ya, za]], e)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}
/** what the tags say: the menu's dishes in its order, each name once, in the page's language (the shop's Japanese in English); before each
 * section's, where there's more than one, its plaque (item 471: 烤物, 炸物… as the menu board has them, item 470) */
function tagRows(lang: string): TagRow[] {
  const ja = lang === 'ja' || lang === 'en'
  const rows: TagRow[] = []
  const heads = new Set(SHOP_MENU.dishes.map((d) => sectionOf(d.id ?? ''))).size > 1
  let last: Section | null = null
  for (const d of SHOP_MENU.dishes) {
    const name = ja ? d.ja || d.name : d.name
    if (rows.some((r) => !r.head && r.name === name)) continue
    const s = sectionOf(d.id ?? '')
    if (heads && s !== last) rows.push({ name: sectionName(s, ja ? 'ja' : 'zh'), price: 0, head: true })
    last = s
    rows.push({ name, price: d.price })
  }
  // (a section's plaque never left last on the wall without a dish after it)
  const kept = rows.slice(0, TAG_COLS * 2)
  return kept.length && kept[kept.length - 1].head ? kept.slice(0, -1) : kept
}
/** the tags hung when the menu's set (item 471, the owner's 「菜單定好了這邊就要長出來」): each new one let down from the rail after the one
 * before it, `TAG_HANG_GAP` apart, over `TAG_HANG_S`, swinging out a little and settling, a tap of wood as it lands; begun once the wall's
 * in view (hung where no one sees it, it'd be up already when they look) */
const TAG_HANG_GAP = 0.11, TAG_HANG_S = 0.55
const TAG_FRUSTUM = new THREE.Frustum(), TAG_PROJ = new THREE.Matrix4(), TAG_SPHERE = new THREE.Sphere()
export function MenuTags({ z0, z1 }: { z0: number; z1: number }) {
  const parts = useMemo(() => {
    const g = new THREE.Group()
    g.name = 'menu-tags'
    const tags = new THREE.Mesh(new THREE.BufferGeometry(), TAG_MAT)
    tags.castShadow = false
    tags.receiveShadow = true
    g.add(tags)
    // (a rail for each row: a dark strip along the wall just over its tags)
    const rails = TAG_ROWS.map((top) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.022, 1), TAG_RAIL_MAT)
      m.position.set(-0.01, top + 0.011, (z0 + z1) / 2)
      m.visible = false
      g.add(m)
      return m
    })
    return { g, tags, rails, ink: null as THREE.Mesh | null }
  }, [z0, z1])
  useEffect(() => () => { parts.tags.geometry.dispose(); parts.ink?.geometry.dispose(); for (const r of parts.rails) r.geometry.dispose() }, [parts])
  const said = useRef({ v: -1, lang: '' })
  // (the tags being hung (item 471): which, by their place along the rows, in the order they go up; when it began (waiting till the wall's
  // in view); the geometry's resting places; how many have landed)
  const hang = useRef({ fresh: [] as number[], at: 0, base: null as Float32Array | null, baseUv: null as Float32Array | null, pending: false, landed: 0 })
  const inked = () => {
    if (parts.ink || !TAG_ROWS_NOW.length) return
    parts.ink = inkTogether([parts.tags], { width: 0.0012, weld: true })
    if (parts.ink) parts.g.add(parts.ink)
  }
  // (dev: where the tags may go along the wall, and every one of them hung again, to see it)
  const replay = useRef(false)
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const w = window as unknown as { __menuTags?: object }
    w.__menuTags = { z0, z1, replay: () => { replay.current = true } }
    return () => { delete w.__menuTags }
  }, [z0, z1])
  useFrame((state) => {
    const lang = document.documentElement.lang
    if (replay.current) { replay.current = false; hangNew(lang, true) }
    else if (said.current.v !== SHOP_MENU.v || said.current.lang !== lang) hangNew(lang)
    const h = hang.current
    if (!h.fresh.length || !h.base) return
    if (h.pending) {
      // (not till the wall's on the screen, nor while the office's window (where the menu's made) is over it)
      if (document.querySelector('.office')) return
      const cam = state.camera
      TAG_PROJ.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse)
      TAG_FRUSTUM.setFromProjectionMatrix(TAG_PROJ)
      const geo = parts.tags.geometry
      if (!geo.boundingSphere) geo.computeBoundingSphere()
      TAG_SPHERE.copy(geo.boundingSphere!).applyMatrix4(parts.tags.matrixWorld)
      if (!TAG_FRUSTUM.intersectsSphere(TAG_SPHERE)) return
      h.pending = false
      h.at = performance.now() / 1000
    }
    const t = performance.now() / 1000 - h.at
    const done = t > (h.fresh.length - 1) * TAG_HANG_GAP + TAG_HANG_S
    hangPose(h.fresh, h.base, h.baseUv!, done ? Infinity : t)
    // (a tap of wood as each first meets the wall again)
    const landed = h.fresh.filter((_, i) => t - i * TAG_HANG_GAP > TAG_HANG_S * 0.42).length
    if (landed > h.landed) { h.landed = landed; tapSound('thing') }
    if (done) { h.fresh = []; h.base = null; h.baseUv = null; inked() }
  })
  /** the tags' vertices for where each new one is in its hanging at `t` (Infinity: all hung): let down from its rail, its length growing
   * as it's unrolled, swung out from the wall about its top and back, less each time (never into the wall) */
  const hangPose = (fresh: number[], base: Float32Array, baseUv: Float32Array, t: number) => {
    const pos = parts.tags.geometry.attributes.position as THREE.BufferAttribute, uv = parts.tags.geometry.attributes.uv as THREE.BufferAttribute
    const a = pos.array as Float32Array, w = uv.array as Float32Array
    fresh.forEach((k, i) => {
      const u = t === Infinity ? 1 : THREE.MathUtils.clamp((t - i * TAG_HANG_GAP) / TAG_HANG_S, 0, 1)
      const top = TAG_ROWS[Math.floor(k / TAG_COLS)]
      const long = 1 - (1 - Math.min(1, u / 0.45)) ** 3
      const swing = -0.32 * Math.abs(Math.sin(u * Math.PI * 2.2)) * (1 - u) ** 2
      const c = Math.cos(swing), s = Math.sin(swing)
      for (let v = k * 20; v < k * 20 + 20; v++) {
        const x = base[v * 3] + 0.004, d = (top - base[v * 3 + 1]) * long
        a[v * 3] = -0.004 + x * c + d * s
        a[v * 3 + 1] = top + x * s - d * c
        a[v * 3 + 2] = base[v * 3 + 2]
      }
      // (its face shown from the top down as it's unrolled, not squeezed: its two lower corners' picture drawn up to as far as it's down)
      const vTop = baseUv[(k * 20 + 2) * 2 + 1]
      for (const v of [k * 20, k * 20 + 1]) w[v * 2 + 1] = vTop + (baseUv[v * 2 + 1] - vTop) * long
    })
    pos.needsUpdate = true
    uv.needsUpdate = true
  }
  function hangNew(lang: string, again = false) {
    // (the menu as it is: the new ones hung one by one (not on loading, when they're up already, nor in another language, the same tags
    // written again), the rest as they were; `again`: every one of them hung anew)
    const first = !again && said.current.v < 0, sameMenu = !again && said.current.v === SHOP_MENU.v
    said.current = { v: SHOP_MENU.v, lang }
    const before = again ? [] : TAG_ROWS_NOW
    const rows = tagRows(lang)
    TAG_ROWS_NOW = rows
    // (laid out again for so many: the tags, their line, the rails over them as wide as the rows they hang)
    parts.tags.geometry.dispose()
    parts.tags.geometry = tagsGeometry(rows.length, z0, z1)
    if (parts.ink) { parts.ink.removeFromParent(); parts.ink.geometry.dispose(); parts.ink = null }
    const fresh = first || sameMenu ? [] : rows.map((r, k) => (before.some((b) => b.name === r.name && !!b.head === !!r.head) ? -1 : k)).filter((k) => k >= 0)
    const h = hang.current
    h.fresh = fresh
    h.landed = 0
    h.pending = fresh.length > 0
    h.base = fresh.length ? (parts.tags.geometry.attributes.position.array as Float32Array).slice() : null
    h.baseUv = fresh.length ? (parts.tags.geometry.attributes.uv.array as Float32Array).slice() : null
    // (the new ones rolled up on the rail till they're hung; the line round them all drawn once they are)
    if (h.base && h.baseUv) hangPose(fresh, h.base, h.baseUv, 0)
    else inked()
    parts.rails.forEach((r, i) => {
      const inRow = Math.max(0, Math.min(TAG_COLS, rows.length - i * TAG_COLS))
      r.visible = inRow > 0
      r.scale.z = Math.max(0.01, inRow * (TAG_W + TAG_GAP) + 0.04)
    })
    const c = TAG_CANVAS
    if (!TAG_TEX || !c) return
    const g = c.getContext('2d')!
    paintTags(g, rows)
    TAG_TEX.needsUpdate = true
    const text = rows.map((r) => r.name + toChineseNumber(r.price)).join('')
    void document.fonts?.load(`700 40px "LXGW WenKai TC"`, text).then(() => {
      if (TAG_ROWS_NOW !== rows) return
      paintTags(g, rows)
      TAG_TEX.needsUpdate = true
    }).catch(() => {})
  }
  // (pointed at, it lights and says it's the menu; clicked, the menu's opened (item 364, the owner's 「可以按會開菜單」): App's, as it
  // stands (the board open, the book shut))
  return (
    <primitive object={parts.g} {...tipOver('菜單', '點一下打開菜單')}
      onClick={(ev: { stopPropagation: () => void }) => { ev.stopPropagation(); if (getEdit().on) return; window.dispatchEvent(new CustomEvent('jgs-menu')) }} />
  )
}
