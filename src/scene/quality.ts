// How much the device can take, decided once at start-up, and what each level turns on.
//
// Every level loads the full models (the owner's: the web is 3D in full, a phone is drawn flat in 2D (game/device); the light models are
// gone); they differ in how sharp the canvas is, the shadows, and how big the painted textures are:
//   high   — a desktop or a strong tablet: sharp, full shadows
//   medium — most tablets: a lighter canvas, softer shadows
//   low    — old or weak devices: no shadows, no antialiasing, the lightest canvas
// Every level loads only the dish on screen (the next is loaded when switched to), except high, which keeps all
// three ready. `?q=low|medium|high` forces a level; a dropped WebGL context remembers to start one level lower.

import { gpuTier } from '@/game/gpuTier'

export type Tier = 'low' | 'medium' | 'high'

export type Quality = {
  tier: Tier
  /** max device-pixel ratio for the canvas */
  dpr: number
  shadows: boolean
  shadowSize: number
  antialias: boolean
  /** the largest painted (canvas) texture */
  canvasMax: number
  /** keep every dish loaded, not just the one on screen */
  allDishes: boolean
}

const KEY = 'canteen-quality'
/** how long a step down after a lost 3D view holds */
const KEEP_STEP_MS = 3 * 24 * 3600e3
const ORDER: Tier[] = ['low', 'medium', 'high']

function gpuName(): string {
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl2') as WebGL2RenderingContext | null
    if (!gl) return ''
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    const name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER))
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return name
  } catch {
    return ''
  }
}

/** the graphics chip's name, read once (also for the "can't open 3D" notice and the developer's console) */
let GPU = ''

function choose(): Tier {
  if (typeof window === 'undefined') return 'high'
  const forced = new URLSearchParams(window.location.search).get('q')
  if (forced === 'low' || forced === 'medium' || forced === 'high') return forced
  // (every device judged by its graphics chip now, a desktop or laptop too (item 568, game/gpuTier): a laptop's built-in graphics start a
  // level lower; a Mac one level less as before. Any of them that lost its 3D view is stepped down for next time (it used to be skipped on a
  // desktop: it crashed the same way again))
  const nav = navigator as Navigator & { deviceMemory?: number }
  const mac = /Mac/i.test(navigator.platform) || /Macintosh/i.test(navigator.userAgent)
  const touch = window.matchMedia('(hover: none)').matches
  GPU = gpuName()
  let tier: Tier = gpuTier({ gpu: GPU, touch, mac, mem: nav.deviceMemory, cores: nav.hardwareConcurrency })
  try {
    // a level that lost its context before is stepped down from (for three days; the old bare-word record only on a touch device, as it was)
    const raw = localStorage.getItem(KEY)
    let capped: Tier | null = null
    if (raw?.startsWith('{')) {
      const r = JSON.parse(raw) as { tier: Tier; at: number }
      if (Date.now() - r.at < KEEP_STEP_MS) capped = r.tier
    } else if (touch) capped = raw as Tier | null
    if (capped && ORDER.includes(capped) && ORDER.indexOf(capped) < ORDER.indexOf(tier)) tier = capped
  } catch {
    // storage blocked
  }
  return tier
}

const TIER = choose()
if (import.meta.env.DEV && typeof window !== 'undefined') console.info(`[quality] ${TIER}${GPU ? ` (${GPU})` : ''}`)

export const QUALITY: Quality = {
  // (the full model at once, on every level: a light one first and the full one swapped in after built the whole shop twice over at the
  // start, and the loading veil could lift in the gap between, on an empty room (the owner saw it); the light ones are gone now)
  high: { tier: 'high', dpr: 2, shadows: true, shadowSize: 2048, antialias: true, canvasMax: 1024, allDishes: true },
  medium: { tier: 'medium', dpr: 1.5, shadows: true, shadowSize: 1024, antialias: true, canvasMax: 512, allDishes: false },
  low: { tier: 'low', dpr: 1, shadows: false, shadowSize: 512, antialias: false, canvasMax: 512, allDishes: false },
}[TIER] as Quality

/** the GPU gave up: start a level lower next time */
export function stepDown() {
  const i = ORDER.indexOf(QUALITY.tier)
  try {
    localStorage.setItem(KEY, JSON.stringify({ tier: ORDER[Math.max(0, i - 1)], at: Date.now() }))
  } catch {
    // storage blocked
  }
}


/** what this browser offers, for the "can't open 3D" notice: so a screenshot of it says what's wrong */
export function webglReport() {
  const probe = (type: string, opts?: WebGLContextAttributes) => {
    try {
      const c = document.createElement('canvas')
      const gl = c.getContext(type, opts) as WebGLRenderingContext | null
      if (!gl) return { ok: false, gpu: '' }
      const ext = gl.getExtension('WEBGL_debug_renderer_info')
      const gpu = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER))
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      return { ok: true, gpu }
    } catch {
      return { ok: false, gpu: '' }
    }
  }
  const w2 = probe('webgl2')
  const w2low = probe('webgl2', { powerPreference: 'low-power', failIfMajorPerformanceCaveat: false })
  const w1 = probe('webgl')
  return `WebGL2: ${w2.ok ? 'OK' : 'NG'} · WebGL2 省電: ${w2low.ok ? 'OK' : 'NG'} · WebGL1: ${w1.ok ? 'OK' : 'NG'}` +
    ` · GPU: ${w2.gpu || w2low.gpu || w1.gpu || '—'} · 等級: ${QUALITY.tier}`
}