import { slideDoorSound } from '@/shops/grill/restroomSound'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeByMaterial } from '@/scene/render/StaticBatch'
import { glowLeave, glowOnly } from '@/scene/interact/hoverGlow'
import { inkModel, inkTogether } from '@/scene/render/inkHull'
import { paintOuting } from '@/shops/grill/wallPhotos'
import { useGLTF } from '@react-three/drei'
import { brushText, signTexture } from '@/scene/props/signFont'
import { STAFF_DOOR_HOLD, tipOver, WC_W, nameOver } from '@/shops/grill/bar'
import { getEdit } from '@/shops/grill/edit'
import { askView } from '@/shops/grill/DormRoom'
import { setTip } from '@/scene/interact/hoverTip'
import { glyphCursor } from '@/ui/art/glyphs'
import { skyNow } from './ambient'
import { canvasTex, WC_H, plankBoard } from './base'
import { useWcDoor } from './wc'

/** the staff's door, its width along the wall (the toilets' own: the owner found it too narrow at 0.66) */
export const STAFF_W = 0.82
/** the pointer over the stair up (item 428, the owner's 「cursor 需克制化，一個人走樓梯的樣子」): one going up a stair, drawn (ui/glyphs' climb) */
const STAIR_CURSOR = glyphCursor('climb', [3, 2])
/**
 * Behind the staff's door, inside its frame: the stair up to the floor above (the owner's: as the round window's view is, a picture in depth
 * on one flat pane, costing nothing; a stair painted flat on it once was only right from straight in front). The pane's two triangles find,
 * for each point, where the eye's line through it meets the stairwell behind: its side walls (cedar wainscot under plaster), the entry's
 * floor, the steps (treads and risers) climbing away to a landing, the ceiling sloping up over them, the far wall; and shade it there: warm
 * light from a paper lamp up on the landing (a shoji glowing on the far wall, and the way on round the corner to the left lit), the room's
 * own light coming in a little way at the door, the corners and the stair's creases darker, and the edges where the frame meets it darkest.
 * Units are the pane's (its middle at 0, the opening STAFF_W across and WC_H + 0.03 high; depth back into the wall).
 */
const STAFF_EYE = new THREE.Vector3(), STAFF_EYE2 = new THREE.Vector3()
const STAFF_STAIRS = (() => {
  const H = WC_H + 0.03, hw = STAFF_W / 2, yf = -H / 2
  const N = 11, rise = 0.19, run = 0.25, s0 = 0.55, D = s0 + N * run + 0.95
  const top = yf + N * rise, yc = yf + 2.15, sc = s0 + 0.55, k = rise / run, ycap = top + 2.1
  const f = (v: number) => v.toFixed(4)
  return new THREE.ShaderMaterial({
    uniforms: { uCam: { value: new THREE.Vector3(0, 0, 3) }, uHover: { value: 0 } },
    vertexShader: `varying vec3 vLocal;
void main() { vLocal = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 uCam;
uniform float uHover;
varying vec3 vLocal;
const float HW = ${f(hw)}, YF = ${f(yf)}, RISE = ${f(rise)}, RUN = ${f(run)}, S0 = ${f(s0)}, D = ${f(D)}, TOP = ${f(top)};
const float YC = ${f(yc)}, SC = ${f(sc)}, K = ${f(k)}, YCAP = ${f(ycap)};
const int N = ${N};
// (each tread's board: how thick, and how far its front (the nosing) stands out over the riser below it)
const float NT = 0.028, OV = 0.026;
float stairY(float s) { return s < S0 ? YF : YF + min(float(N), floor((s - S0) / RUN) + 1.0) * RISE; }
// (the stair's line along the walls, straight up its slope, not stepped (the owner's: the wainscot's top went up in a saw, plaster in its
// notches): from the floor a step before the first riser, up through the steps' nosings, level again over the landing)
float lineY(float s) { return YF + clamp(s - S0 + RUN, 0.0, float(N) * RUN) * K; }
// (a board's straight grain running along it, its lines across it (the owner's: the treads' grain had gone into waves): fine lines
// that waver only a little, a slower drift of colour along it)
vec3 grain(float along, float across, vec3 a, vec3 b) {
  float ph = across * 45.0 + sin(along * 1.7) * 0.4;
  // (soft, and faded as it's seen from further off, finer than the pixels: else the far treads' lines beat into a zigzag)
  float g = 0.5 + 0.3 * sin(ph) * (1.0 - smoothstep(0.25, 0.8, fwidth(ph)));
  float drift = 0.5 + 0.5 * sin(along * 1.3 + across * 3.7);
  return mix(a, b, g * 0.45 + drift * 0.25);
}
void main() {
  vec3 dir = normalize(vLocal - uCam);
  // (x along the opening, y up, z here is depth back into the wall)
  vec3 o = vec3(vLocal.x, vLocal.y, 0.0);
  vec3 d = vec3(dir.x, dir.y, max(-dir.z, 0.001));
  float best = 1e9; int kind = 0; float t;
  vec3 p;
  // side walls (kind 1 left, 2 right)
  if (d.x > 0.0) { t = (HW - o.x) / d.x; if (t < best) { best = t; kind = 2; } }
  if (d.x < 0.0) { t = (-HW - o.x) / d.x; if (t < best) { best = t; kind = 1; } }
  // the entry's floor (3), the far wall (4)
  if (d.y < 0.0) { t = (YF - o.y) / d.y; if (t > 0.0 && t < best) { best = t; kind = 3; } }
  t = (D - o.z) / d.z; if (t < best) { best = t; kind = 4; }
  // the ceiling: flat over the entry, sloping up over the stair, flat again over the landing (5)
  if (d.y > 0.0) {
    t = (YC - o.y) / d.y; p = o + d * t; if (t < best && p.z < SC) { best = t; kind = 5; }
    t = (YCAP - o.y) / d.y; p = o + d * t; if (t < best && YC + (p.z - SC) * K >= YCAP) { best = t; kind = 5; }
  }
  float den = d.y - d.z * K;
  if (abs(den) > 1e-5) { t = (YC + (o.z - SC) * K - o.y) / den; p = o + d * t; if (t > 0.0 && t < best && p.z >= SC && p.y <= YCAP) { best = t; kind = 5; } }
  // the steps (the owner's: two-tone, the tread's nosing standing out over the riser): each one's riser (6), dark, up to its tread's
  // underside; the tread a board NT thick, its front (8) OV out over the riser, its top (7) from there back, the nosing's underside (9)
  for (int i = 0; i < N; i++) {
    float si = S0 + float(i) * RUN, y0 = YF + float(i) * RISE, y1 = y0 + RISE;
    t = (si - o.z) / d.z; p = o + d * t;
    if (t > 0.0 && t < best && p.y >= y0 && p.y <= y1 - NT) { best = t; kind = 6; }
    t = (si - OV - o.z) / d.z; p = o + d * t;
    if (t > 0.0 && t < best && p.y >= y1 - NT && p.y <= y1) { best = t; kind = 8; }
    if (d.y < 0.0) {
      t = (y1 - o.y) / d.y; p = o + d * t;
      float s1 = i == N - 1 ? D : si + RUN - OV;
      if (t > 0.0 && t < best && p.z >= si - OV && p.z <= s1) { best = t; kind = 7; }
    } else {
      t = (y1 - NT - o.y) / d.y; p = o + d * t;
      if (t > 0.0 && t < best && p.z >= si - OV && p.z <= si) { best = t; kind = 9; }
    }
  }
  p = o + d * best;
  vec3 n = kind == 1 ? vec3(1, 0, 0) : kind == 2 ? vec3(-1, 0, 0) : (kind == 3 || kind == 7) ? vec3(0, 1, 0) : (kind == 5 || kind == 9) ? vec3(0, -1, 0) : vec3(0, 0, -1);
  // its own colour (linear)
  vec3 c;
  float glow = 0.0;
  if (kind == 1 || kind == 2) {
    float lift = p.y - lineY(p.z);
    // (the wainscot's top straight along the slope, carried on down past the stair's foot (the owner's: it bent up there, plaster in the bend))
    float slope = YF + (p.z - S0 + RUN) * K;
    float wt = min(slope, lineY(p.z)) + 0.95;
    c = p.y < wt ? grain(p.y + floor(p.z * 6.0) * 1.9, p.z + float(kind) * 0.37, vec3(0.12, 0.065, 0.032), vec3(0.18, 0.1, 0.05)) * (0.92 + 0.08 * step(0.5, fract(p.z * 6.0)))
      : vec3(0.42, 0.37, 0.29) * (0.96 + 0.04 * sin(p.z * 40.0 + p.y * 23.0));
    // (the skirting along the stair: a dark board its whole length, its top edge catching a little light)
    if (lift < 0.11) c = vec3(0.07, 0.04, 0.02) * (lift > 0.095 ? 1.8 : 1.0);
    // (no handrail: the left wall plain (the owner's))
    // (round the corner at the top, the way on (the owner's: the stair turns at the landing into the floor above, not a dead end): an
    // opening on the left, a corridor going off into the dim, warm light from deep in it, and a shoji slid half open across its near half)
    if (kind == 1 && p.z > D - 0.85 && p.z < D - 0.1 && p.y > TOP && p.y < TOP + 1.85) {
      float u = (p.z - (D - 0.85)) / 0.75, v = (p.y - TOP) / 1.85;
      vec3 deep = mix(vec3(0.05, 0.03, 0.02), vec3(0.95, 0.62, 0.3), smoothstep(0.15, 0.95, u) * smoothstep(1.0, 0.25, v) * 0.85);
      c = deep; glow = 0.85;
      if (u < 0.42) {
        vec2 q = vec2(u / 0.42, v);
        float bar = max(step(0.9, fract(q.x * 2.0)), step(0.93, fract(q.y * 6.0)));
        c = mix(vec3(0.85, 0.62, 0.36), vec3(0.12, 0.07, 0.035), bar);
        glow = 0.75 - bar * 0.6;
      }
      // (the frame of the opening, dark wood)
      if (u < 0.03 || u > 0.97 || v > 0.97) { c = vec3(0.08, 0.045, 0.02); glow = 0.0; }
    }
  } else if (kind == 3) {
    // (the entry's floor: boards laid across, parallel to the sill (the owner's: as the room's run), a dark seam between each two)
    float bd = floor(p.z / 0.115);
    c = grain(p.x + bd * 1.7, p.z, vec3(0.13, 0.072, 0.035), vec3(0.2, 0.11, 0.052)) * (0.93 + 0.07 * fract(sin(bd * 12.9) * 43.7));
    c *= 1.0 - 0.55 * step(0.95, fract(p.z / 0.115));
  } else if (kind == 7) {
    // (the treads a warm honey wood (the owner's: two-tone, light treads over dark risers), two boards to each, a seam between them, the
    // nosing's edge rounded and catching the light)
    float f = fract((p.z - S0 + OV) / RUN);
    c = grain(p.x + floor((p.z - S0 + OV) / RUN * 2.0) * 1.3, p.z, vec3(0.36, 0.21, 0.1), vec3(0.5, 0.32, 0.16));
    c *= 1.0 - 0.45 * smoothstep(0.03, 0.0, abs(f - 0.5)) * step(p.z, S0 + float(N) * RUN);
    c *= 1.0 + 0.3 * smoothstep(0.06, 0.0, f) * step(p.z, S0 + float(N) * RUN);
  }
  else if (kind == 8) {
    // (the nosing's front: the tread's edge, rounded over at its top, lit there)
    float e = (p.y - (YF + (floor((p.z - S0 + OV) / RUN + 0.5) + 1.0) * RISE - NT)) / NT;
    c = grain(p.x + floor((p.z - S0) / RUN + 0.5) * 1.3, p.y, vec3(0.33, 0.19, 0.09), vec3(0.46, 0.29, 0.14)) * (0.8 + 0.45 * smoothstep(0.4, 1.0, e));
  }
  else if (kind == 9) { c = vec3(0.04, 0.025, 0.012); }
  else if (kind == 6) { c = grain(p.x + floor((p.z - S0) / RUN + 0.5) * 2.1, p.y, vec3(0.035, 0.03, 0.026), vec3(0.06, 0.052, 0.045)); }
  else if (kind == 5) { c = vec3(0.12, 0.08, 0.05) * (0.9 + 0.1 * step(0.5, fract(p.z * 3.0))); }
  else {
    // (the landing's far wall plain plaster (the owner's: a shoji straight ahead there looked a dead end); the way on is round to the left)
    c = vec3(0.42, 0.37, 0.29);
  }
  // the lamp up on the landing: warm, falling off with distance; a little of the room's light at the door; a dim warmth over all
  vec3 L = vec3(-HW - 0.25, TOP + 1.0, D - 0.4);
  vec3 toL = L - p;
  float dl = length(toL);
  float lamp = (5.0 + 2.5 * uHover) / (1.0 + dl * dl * 1.3) * (0.35 + 0.65 * max(dot(n, toL / dl), 0.0));
  float door = 0.5 * exp(-p.z * 2.2);
  // (and its light spilling down the stair: the steps further up and in the warmer, the treads most, what's seen of it through the door
  // lit from above)
  // (dim and quiet below, the owner's: only up toward the landing does the lamp's warmth come down)
  float spill = smoothstep(S0 + 4.0 * RUN, S0 + 10.0 * RUN, p.z) * (kind == 7 ? 1.2 : 0.7);
  vec3 light = vec3(0.075, 0.062, 0.05) + vec3(1.0, 0.58, 0.25) * (lamp * smoothstep(S0 + 2.0 * RUN, D, p.z) + spill) + vec3(0.85, 0.8, 0.72) * door;
  // the creases darker: the steps' inner corners, along the walls' feet, the walls' corners
  float ao = 1.0;
  if (kind == 7 || kind == 3) {
    float back = kind == 7 ? (S0 + (floor((p.z - S0 + OV) / RUN) + 1.0) * RUN - OV - p.z) : (S0 - OV - p.z);
    ao *= mix(0.45, 1.0, smoothstep(0.0, 0.07, back));
    ao *= mix(0.5, 1.0, smoothstep(0.0, 0.09, HW - abs(p.x)));
  }
  if (kind == 6) {
    float ri = floor((p.z - S0) / RUN + 0.5);
    ao *= mix(0.55, 1.0, smoothstep(0.0, 0.06, p.y - (YF + ri * RISE)));
    // (the nosing's shadow along the riser's top)
    ao *= mix(0.3, 1.0, smoothstep(0.0, 0.05, YF + (ri + 1.0) * RISE - NT - p.y));
  }
  if (kind == 1 || kind == 2) ao *= mix(0.55, 1.0, smoothstep(0.0, 0.12, p.y - lineY(p.z)));
  if (kind == 4) ao *= mix(0.5, 1.0, smoothstep(0.0, 0.1, HW - abs(p.x)));
  vec3 col = mix(c * light * ao, c, glow);
  // (the treads' and the floor's varnish: a soft sheen where they turn the lamp's light toward the eye)
  if (kind == 7 || kind == 3) {
    float sh = pow(max(dot(reflect(-toL / dl, n), -normalize(d)), 0.0), 18.0);
    col += vec3(1.0, 0.7, 0.4) * sh * (lamp + spill) * 0.12 * ao;
  }
  // the frame's edge: darker where the opening meets the posts, the sill and the head
  float edge = min(min(HW - abs(vLocal.x), vLocal.y - YF), ${f(H / 2)} - vLocal.y);
  col *= mix(0.25, 1.0, smoothstep(0.0, 0.07, edge));
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`,
  })
})()
const STAFF_BOARD = plankBoard(13, ['#a2704a', '#8f6040', '#a87a52', '#966846'])
/** 員工專用 on the staff's door, across its board below the waist (the owner's: on the door itself, on black; it was a plaque over it, half
 * behind the banner hung there), STAFF ONLY small under it: cream on a black plate with a fine cream rule round it, worn a little */
const STAFF_SIGN = canvasTex(512, 256, (g) => {
  g.save()
  g.fillStyle = '#141112'
  g.beginPath(); g.roundRect(6, 6, 500, 244, 14); g.fill()
  g.strokeStyle = 'rgba(243,231,204,0.75)'; g.lineWidth = 3
  g.beginPath(); g.roundRect(18, 18, 476, 220, 9); g.stroke()
  g.restore()
  brushText(g, '員工專用', 256, 104, 104, { fill: '#f3e7cc', shadow: 'rgba(0,0,0,0.5)', spacing: 10 })
  g.save()
  g.fillStyle = '#efe0c0'; g.font = '700 30px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
  ;(g as unknown as { letterSpacing: string }).letterSpacing = '9px'
  g.fillText('STAFF ONLY', 260, 196)
  g.restore()
  // (the paint worn: specks and short scuffs along the grain taken out of it; the canvas's state put back after, as it's painted again on
  // the same canvas once the sign font is in, and would rub everything out)
  let seed = 7
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  g.save()
  g.globalCompositeOperation = 'destination-out'
  for (let k = 0; k < 900; k++) {
    g.globalAlpha = 0.25 + rnd() * 0.55
    g.fillRect(rnd() * 512, rnd() * 256, 1 + rnd() * 2.5, 1 + rnd() * 1.2)
  }
  for (let k = 0; k < 70; k++) {
    g.globalAlpha = 0.18 + rnd() * 0.3
    g.fillRect(rnd() * 512, rnd() * 256, 8 + rnd() * 26, 0.8 + rnd() * 0.8)
  }
  g.restore()
})
/**
 * The staff's door (the owner's: in the side wall by the corner, where the koi print hung; a sliding door like the toilets'): the toilets'
 * door, its dark cedar frame on the plaster, the dark of the passage inside it, 員工專用 on black on its board; clicked it slides away from
 * the corner along the wall all the way open and back again, with the runners' sound (the owner's: it slid toward the corner, behind the
 * bamboo's pot, then only part way; run into the wall it was gone, and they wanted it seen), the panel turned about so its pull is at the
 * edge it's pulled by.
 */
/** the staff door's washi, its own (the toilets' doors keep theirs): a faint warm glow by night (the owner's: the stair's lamp behind it) */
const STAFF_PAPER = new THREE.MeshToonMaterial({ name: 'StaffDoorPaper', color: '#ffffff', emissive: '#b08654', emissiveIntensity: 0, side: THREE.DoubleSide })
/** and that light spilling round the door on the wall and its frame: a soft warm patch, laid on additively, by night only */
const STAFF_SPILL = (() => {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas'); c.width = c.height = 128
  const g = c.getContext('2d')!
  const gr = g.createRadialGradient(64, 54, 6, 64, 64, 64)
  gr.addColorStop(0, 'rgba(255,200,130,0.55)'); gr.addColorStop(0.55, 'rgba(255,190,120,0.18)'); gr.addColorStop(1, 'rgba(255,190,120,0)')
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  return t
})()
const STAFF_SPILL_MAT = new THREE.MeshBasicMaterial({ map: STAFF_SPILL ?? undefined, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })
/**
 * The little wooden stand just past the staff's door, the samurai helmet on it (the owner's, 2026-11-12: off the cats' stand, onto a small
 * wooden stand beside this door): blender/kabutostand.py, in the wall's own units, its foot's middle at its origin. It stands off the wall
 * (KSTAND_OFF, its middle) clear of the door's panel, which slides open along the wall behind it, and along from the door's middle past its
 * frame (KSTAND_ALONG); its top KSTAND_H up. Nothing else: the scroll beyond it hangs higher than the helmet's crest.
 * A low cabinet now (item 292, the owner's, 2026-11-17: 「台座的模型太複雜了」「武士頭盔底下的台座有拉門」): clean boxes, its kumiko lattice
 * and pulls in its picture; its two sliding doors each slid open by a click (the left in the back track to the right, the right in the
 * front one to the left), the helmet's lacquered box and a shelf inside
 */
const KSTAND_URL = import.meta.env.BASE_URL + 'models/kabutostand.glb'
useGLTF.preload(KSTAND_URL)
// (its back 6 mm clear of the panel slid open (out 0.065, its face 0.109 off the wall), its front 0.315 out: 0.28 deep and 0.28 out, its
// front was 0.42 out, and all who went along the wall into the side counter's aisle (the servers to their gate, the stock keeper, the staff
// coming in) brushed it, their middles 2 cm off it (item 48, tests/e2e/_nearpiece.mjs))
export const KSTAND_H = 0.7, KSTAND_OFF = 0.215, KSTAND_ALONG = 0.68
/**
 * The photograph of the owner and the staff out together (item 296, the owner's, 2026-11-17: 「員工專用與美人圖這邊加一張老闆與員工出遊的
 * 合照」), in the middle of the plaster between the staff's door's frame and the beauty scroll: a thin board, its face the photograph in its
 * frame and mat (wallPhotos' paintOuting: the shop's people as they're drawn, by a lake under Fuji), its edges the frame's wood, hung a
 * little off the wall (clear of the light that spills from the stair by it, behind where the door's panel slides open past it)
 */
export const OUTING_W = 0.46, OUTING_H = 0.36, OUTING_T = 0.02
/** its middle along the wall from the staff door's (the door's frame ends 0.47 along, the scroll starts 1.33 along: the middle of between) */
export const OUTING_ALONG = 0.9
let OUTING_ZH = true
const OUTING_TEX = signTexture(640, 500, (g, w, h) => paintOuting(g, w, h, OUTING_ZH))
const OUTING_FACE = new THREE.MeshToonMaterial({ color: '#ffffff', map: OUTING_TEX })
const OUTING_EDGE = new THREE.MeshToonMaterial({ color: '#3a2416' })
export function OutingPhoto() {
  const obj = useMemo(() => {
    const g = new THREE.Group()
    // (its face to the room (-x): the box's -x side the photograph, the rest the frame's wood)
    const m = new THREE.Mesh(new THREE.BoxGeometry(OUTING_T, OUTING_H, OUTING_W), [OUTING_EDGE, OUTING_FACE, OUTING_EDGE, OUTING_EDGE, OUTING_EDGE, OUTING_EDGE])
    m.name = 'outing-photo'
    g.add(m)
    const ink = inkTogether([m], { width: 0.0012, weld: true })
    if (ink) g.add(ink)
    return g
  }, [])
  useEffect(() => () => { obj.traverse((o) => (o as THREE.Mesh).geometry?.dispose()) }, [obj])
  // (its sign in the page's language, painted again as that changes; once more as the brush hand's letters are in)
  const lang = useRef('')
  useFrame(() => {
    const l = document.documentElement.lang
    if (l === lang.current || !OUTING_TEX) return
    lang.current = l
    OUTING_ZH = l !== 'ja' && l !== 'en'
    const c = OUTING_TEX.image as HTMLCanvasElement
    const repaint = () => { paintOuting(c.getContext('2d')!, c.width, c.height, OUTING_ZH); OUTING_TEX.needsUpdate = true }
    repaint()
    void document.fonts?.load('700 40px "LXGW WenKai TC"', '員工旅遊社員旅行').then(repaint).catch(() => {})
  })
  return <primitive object={obj} {...nameOver('【照片】員工旅遊合照', '老闆與店裡的大家一起出遊，在湖邊與富士山合影')} />
}
/** how far each sliding door goes to open (the inside's half, less where they overlap) */
const KSTAND_SLIDE = 0.126
export function KabutoStandModel() {
  const gltf = useGLTF(KSTAND_URL) as unknown as { scene: THREE.Group }
  const model = useMemo(() => {
    const r = (gltf.scene.getObjectByName('KabutoStand') ?? gltf.scene).clone(true)
    r.position.set(0, 0, 0)
    const made = new Map<THREE.Material, THREE.Material>()
    r.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const src = m.material as THREE.MeshStandardMaterial
      let t = made.get(src)
      if (!t) {
        // (its lattice's and pulls' relief kept: the normal map its picture came with)
        t = new THREE.MeshToonMaterial({ color: src.map ? '#ffffff' : src.color.clone(), map: src.map ?? null, normalMap: src.normalMap ?? null,
          normalScale: src.normalMap ? src.normalScale.clone() : undefined })
        t.name = src.name
        made.set(src, t)
      }
      m.material = t
      m.castShadow = true
      m.receiveShadow = true
    })
    inkModel(r, () => false, { width: 0.0016, weld: true })
    // (the doors left as they are, to slide; the rest drawn by material)
    const isDoor = (o: THREE.Object3D) => /^KabutoStandDoor[LR]$/.test(o.name)
    mergeByMaterial(r, isDoor)
    const doors = (['L', 'R'] as const).map((k) => r.getObjectByName(`KabutoStandDoor${k}`) ?? null)
    return { r, doors, home: doors.map((d) => d?.position.x ?? 0) }
  }, [gltf])
  /** each door: whether it's to be open, and how far it is */
  const st = useRef({ open: [false, false], k: [0, 0] })
  useFrame((_, dt) => {
    const s = st.current
    model.doors.forEach((d, i) => {
      if (!d) return
      const want = s.open[i] ? 1 : 0
      if (s.k[i] === want) return
      s.k[i] += Math.sign(want - s.k[i]) * Math.min(Math.abs(want - s.k[i]), Math.min(dt, 0.1) * 3.2)
      const e = s.k[i] * s.k[i] * (3 - 2 * s.k[i])
      // (the left door along to the right, behind the right one; the right along to the left, in front of it)
      d.position.x = model.home[i] + (i === 0 ? 1 : -1) * KSTAND_SLIDE * e
    })
  })
  const which = (o: THREE.Object3D | null) => { for (let q = o; q; q = q.parent) { if (q === model.doors[0]) return 0; if (q === model.doors[1]) return 1 } return -1 }
  const says = (i: number) => (st.current.open[i] ? '點一下關上' : '點一下拉開・裡面是頭盔的收納盒')
  return (
    <primitive object={model.r}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        const i = which(e.object)
        if (i < 0 || getEdit().on) return
        e.stopPropagation()
        st.current.open[i] = !st.current.open[i]
        // (the two in their tracks only pass each other: one opened, the other's slid back shut, so its half's the one that's open)
        if (st.current.open[i]) st.current.open[1 - i] = false
        slideDoorSound(st.current.open[i], 0.35, 0.32)
        setTip({ title: '頭盔木櫃的拉門', hint: says(i) })
      }}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        const i = which(e.object)
        if (i < 0 || getEdit().on) return
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
        glowOnly(model.doors[i]!)
        setTip({ title: '頭盔木櫃的拉門', hint: says(i) })
      }}
      onPointerOut={() => { for (const d of model.doors) if (d) glowLeave(d); document.body.style.cursor = ''; setTip(null) }} />
  )
}
/**
 * Whether what the pointer's on is the first thing it meets (item 106, the owner's, 2026-11-14: the staff's door named itself over the grill:
 * the pointer's ray goes on through the wall, which takes no pointer, and found the door on the far side of it): the nearest of everything
 * the ray meets inside the one handling it
 */
function inFront(ev: { intersections: { object: THREE.Object3D }[]; eventObject: THREE.Object3D }) {
  const first = ev.intersections[0]?.object
  for (let o: THREE.Object3D | null = first ?? null; o; o = o.parent) if (o === ev.eventObject) return true
  return false
}
export function StaffDoor() {
  const door = useWcDoor()
  const frame = useMemo(() => door.frame(), [door])
  const { panel, sign } = useMemo(() => {
    const panel = door.panel()
    // (its own lower board, a natural grain of planks, and its pull a dark brown lacquer (the owner's), not the toilets' doors' black)
    panel.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const name = (m.material as THREE.Material).name
      if (name === 'WcDoorBoard') m.material = new THREE.MeshToonMaterial({ name, color: '#ffffff', map: STAFF_BOARD })
      else if (name === 'WcDoorLacquer') m.material = new THREE.MeshToonMaterial({ name, color: '#3a2215' })
      // (its own washi: by night it glows faintly warm, the stair's lamp behind it (StaffDoor's frame eases it in))
      else if (name === 'WcDoorPaper') { const src = m.material as THREE.MeshStandardMaterial; m.material = STAFF_PAPER; STAFF_PAPER.map = src.map ?? null; STAFF_PAPER.emissiveMap = src.map ?? null }
    })
    // (the sign rides on the panel)
    const sign = new THREE.Group()
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.24),
      new THREE.MeshToonMaterial({ color: '#ffffff', map: STAFF_SIGN, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }))
    // (high on the board, just under the waist rail: the owner's; it sat in the board's middle)
    plate.position.set(-0.0372, 0.84, 0)
    plate.rotation.y = -Math.PI / 2
    sign.add(plate)
    return { panel, sign }
  }, [door])
  useEffect(() => () => { for (const o of sign.children) (o as THREE.Mesh).geometry.dispose() }, [sign])
  const g = useRef<THREE.Group>(null)
  const stairs = useRef<THREE.Mesh>(null)
  const stairsHot = useRef(false)
  const st = useRef({ open: false, k: 0 })
  const heldWas = useRef(false)
  const narrow = STAFF_W / WC_W
  useFrame(({ camera }, dt) => {
    // (by night (dusk a little), the washi glows faintly with the stair's lamp, and its light spills round the door)
    // (only while it's shut over the stair: slid open it's off the lamp, just paper in the room's light (the owner's))
    const sky = skyNow(), nightK = sky === 'night' ? 1 : sky === 'dusk' ? 0.4 : 0
    const shut = Math.max(0, 1 - st.current.k * 4)
    STAFF_PAPER.emissiveIntensity += (0.35 * nightK * shut - STAFF_PAPER.emissiveIntensity) * Math.min(1, dt * 6)
    STAFF_SPILL_MAT.opacity += (0.5 * nightK - STAFF_SPILL_MAT.opacity) * Math.min(1, dt * 2)
    // (pointed at: the landing's lamp eased a little brighter)
    const hv = STAFF_STAIRS.uniforms.uHover
    hv.value += ((stairsHot.current ? 1 : 0) - hv.value) * Math.min(1, dt * 8)
    // (the eye, in the stair's pane's own frame: where its lines through the pane run on into the stairwell)
    if (stairs.current) STAFF_STAIRS.uniforms.uCam.value.copy(stairs.current.worldToLocal(STAFF_EYE.copy(camera.position)))
    const s = st.current
    // (open as one of the staff goes up or comes down the stair, shut again after, its runners heard either way)
    const held = performance.now() < STAFF_DOOR_HOLD.until
    if (held !== heldWas.current) { heldWas.current = held; if (!s.open) slideDoorSound(held, Math.max(0, 1 - (g.current ? g.current.getWorldPosition(STAFF_EYE2).distanceTo(camera.position) : 8) / 8)) }
    const want = s.open || held ? 1 : 0
    s.k += Math.sign(want - s.k) * Math.min(Math.abs(want - s.k), Math.min(dt, 0.1) * 1.8)
    const ss = (a: number, b: number) => { const t = Math.min(1, Math.max(0, (s.k - a) / (b - a))); return t * t * (3 - 2 * t) }
    if (g.current) {
      // (out onto its track in front of the wall, then along it all the way open: clear of the doorway, the scroll beside it hung further
      // along for it (nudgeArt))
      g.current.position.x = -0.065 * ss(0, 0.25)
      g.current.position.z = ss(0.2, 1) * (STAFF_W - 0.02)
    }
  })
  const says = () => (st.current.open ? '點一下關上（員工休息室）' : '點一下打開（員工休息室）')
  return (
    <group name="staff-door">
      <group scale={[1, 1, narrow]}><primitive object={frame} /></group>
      {/* (the dark of the passage: right across the opening and on behind the posts, the head and the sill, so no plaster shows round its
          edges (the owner saw a pale strip down the side; it stopped 2.5 cm short of each post)) */}
      {/* (pointed at, through the open door (the shut door's in front and takes the pointer first): what's up there, and its light a little up) */}
      <mesh position={[-0.012, WC_H * 0.62, 0]} rotation-y={-Math.PI / 2} material={STAFF_SPILL_MAT} renderOrder={3} raycast={() => {}}>
        <planeGeometry args={[STAFF_W * 2.4, WC_H * 1.4]} />
      </mesh>
      <mesh ref={stairs} position={[-0.004, (WC_H + 0.03) / 2, 0]} rotation-y={-Math.PI / 2} material={STAFF_STAIRS}
        onPointerOver={(ev) => { ev.stopPropagation(); if (getEdit().on) return; stairsHot.current = true; document.body.style.cursor = STAIR_CURSOR; setTip({ title: '2F 員工休息室／倉庫', hint: '閒人勿進・禁止進入', warn: true }) }}
        onPointerOut={() => { stairsHot.current = false; document.body.style.cursor = ''; setTip(null) }}
        onClick={(ev) => { ev.stopPropagation(); if (getEdit().on) return; setTip(null); askView('upstairs') }}>
        <planeGeometry args={[STAFF_W + 0.06, WC_H + 0.03]} />
      </mesh>
      <group ref={g} onClick={(ev) => {
        ev.stopPropagation()
        if (getEdit().on || !inFront(ev)) return
        st.current.open = !st.current.open
        slideDoorSound(st.current.open, Math.max(0, 1 - ev.distance / 8))
        setTip({ title: '員工專用門', hint: says() })
      }}
        onPointerOver={(ev) => { if (getEdit().on || !inFront(ev)) return; tipOver('員工專用門', says()).onPointerOver(ev) }}
        onPointerOut={(ev) => { tipOver('員工專用門', '').onPointerOut(ev) }}>
        <group position={[-0.03, 0, 0]} scale={[1, 1, -narrow]}><primitive object={panel} /></group>
        {/* (on the board's face, a little above its middle, just clear of it) */}
        <primitive object={sign} />
      </group>
    </group>
  )
}
