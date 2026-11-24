import * as THREE from 'three'
import { getLights, onLights } from '@/scene/lightsStore'
import { lampGlow } from '@/game/roomLights'
import type { Sky } from '@/game/clock'
import { replaces } from '@/scene/hot'

/**
 * The lamps' painted light (their halos and the pools they throw) by the time of day: faint by day, when the room's lit anyway; full and
 * wider by night, a glow blooming round each (data-theme on the page, followed as it changes).
 */
/** (a lamp's: out with the wall switch; the daylight through the windows isn't) */
const NIGHT_GLOWS: { m: THREE.Material; day: number; night: number; lamp: boolean }[] = []
const isNight = () => typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark'
/** the part of the day outside (the page's data-sky: dawn, day, dusk, night; the round window's paper, view and light follow it) */
export function skyNow(): Sky {
  const s = typeof document === 'undefined' ? undefined : document.documentElement.dataset.sky
  return s === 'dawn' || s === 'day' || s === 'dusk' || s === 'night' ? s : isNight() ? 'night' : 'day'
}
/** what this module sets going by itself (observers, subscriptions), undone when it's swapped for a new copy of itself (a hot update while
 * it's being worked on): left behind, each kept redrawing the old copy's pictures at every turn of the day, a few more with every edit */
const UNDO: (() => void)[] = []
replaces(import.meta.hot, () => { for (const f of UNDO.splice(0)) f() })
/** pictures with words in them redrawn when the page's language is changed (the fridges' name cards, item 91) */
export const ON_LANG = new Set<() => void>()
if (typeof document !== 'undefined') {
  const o = new MutationObserver(() => { for (const f of ON_LANG) f() })
  o.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] })
  UNDO.push(() => o.disconnect())
}
/** watch the page for the part of the day turning (either of its two marks) */
export const onSky = (f: () => void) => {
  const o = new MutationObserver(f)
  o.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-sky'] })
  UNDO.push(() => o.disconnect())
}
export function nightGlow<M extends THREE.Material>(m: M, day: number, night: number, lamp = true): M {
  NIGHT_GLOWS.push({ m, day, night, lamp })
  m.opacity = (isNight() ? night : day) * (lamp ? lampGlow(getLights().on) : 1)
  return m
}
function lightsNow() {
  const n = isNight(), on = getLights().on
  for (const g of NIGHT_GLOWS) g.m.opacity = (n ? g.night : g.day) * (g.lamp ? lampGlow(on) : 1)
}
if (typeof document !== 'undefined') {
  const o = new MutationObserver(lightsNow)
  o.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  UNDO.push(() => o.disconnect(), onLights(lightsNow))
}
