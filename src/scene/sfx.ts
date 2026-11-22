// Every sound effect through one switch (the owner's: a master volume, the effects muted on their own from the top right; the music has its
// speaker on the wall). The game's sounds are made on the spot in a dozen modules, all in the one AudioContext made here (`sharedAudio`, item
// 576), each connecting straight to its speakers; here that one connection is turned, for every context, through a gain of its own (made the
// first time it's asked for), so all of them are muted or let sound together. The music (ui/Bgm) is an <audio> element, not in any of them.
// Also: `gate` (one sound not started twice within 0.3 s: a walker caught on a door's edge used to set it clattering) and `panOf` (left or
// right by where it is on screen).
import * as THREE from 'three'
import { useSyncExternalStore } from 'react'
import { replaces } from './hot'

const KEY = 'jgs-sfx-muted-1'
let muted = false
try { muted = localStorage.getItem(KEY) === '1' } catch { /* (no storage: sound on) */ }
const masters = new Map<BaseAudioContext, GainNode>()
// (where there's no WebAudio (the tests, run without a page) nothing here is used, but this module is still loaded: the sounds' modules take
// their context from it)
const plainConnect = (typeof AudioNode !== 'undefined' ? AudioNode.prototype.connect : undefined) as AudioNode['connect']
function masterOf(ctx: BaseAudioContext) {
  let g = masters.get(ctx)
  if (!g) {
    g = ctx.createGain()
    g.gain.value = muted ? 0 : 1
    ;(plainConnect as (d: AudioNode) => AudioNode).call(g, ctx.destination)
    masters.set(ctx, g)
  }
  return g
}
if (typeof AudioNode !== 'undefined') {
  const turned = function (this: AudioNode, dest: AudioNode | AudioParam, ...rest: number[]) {
    if (typeof AudioDestinationNode !== 'undefined' && dest instanceof AudioDestinationNode && this !== masters.get(this.context)) {
      return (plainConnect as (d: AudioNode, ...r: number[]) => AudioNode).call(this, masterOf(this.context), ...rest)
    }
    return (plainConnect as (d: AudioNode | AudioParam, ...r: number[]) => AudioNode | void).call(this, dest, ...rest)
  } as typeof AudioNode.prototype.connect
  AudioNode.prototype.connect = turned
}

/**
 * The one AudioContext every sound in the game is made in (item 576, the Tester's, 2026-11-22: the first click stalled a frame, the shrine's
 * doors' first opening another, 32 ms of it the sound's). The sounds were made in fourteen modules, each in an AudioContext of its own made
 * the first time it sounded or the first time the player clicked: five of them at that first click, the rest each the first time it was
 * heard. Made as the page loads (one made before the player's first click or key waits, suspended, as the browser has it, and costs nothing
 * then), woken by that first click or key; made again if a hot update closed it. Throws where there's no WebAudio, as `new AudioContext` did.
 */
let shared: AudioContext | null = null
/** whether the player has done something yet (a click, a key): until then the browser won't let sound start, and says so in the console each
 * time it's asked to (the Tester's: 7 warnings became 24 once the one context was made as the page loads and every sound asked it to wake) */
const mayWake = () => typeof navigator === 'undefined' || !('userActivation' in navigator) || (navigator as Navigator & { userActivation: { hasBeenActive: boolean } }).userActivation.hasBeenActive
export function sharedAudio(): AudioContext {
  if (!shared || shared.state === 'closed') shared = new AudioContext({ latencyHint: 'interactive' })
  if (shared.state === 'suspended' && mayWake()) shared.resume().catch(() => { /* (not allowed yet: the first click or key wakes it) */ })
  return shared
}
let undoWake = () => {}
if (typeof window !== 'undefined' && typeof AudioContext !== 'undefined') {
  try { sharedAudio() } catch { /* (no sound to be had) */ }
  const wake = () => { if (shared?.state === 'suspended') shared.resume().catch(() => { /* (still not allowed) */ }) }
  // (a finger's press lets sound start only as it's lifted (pointerup), a mouse's as it's pressed, a key's as it's struck)
  const on = ['pointerdown', 'pointerup', 'keydown'] as const
  for (const e of on) window.addEventListener(e, wake, true)
  undoWake = () => { for (const e of on) window.removeEventListener(e, wake, true); void shared?.close(); shared = null }
}
// (put back when a hot update runs a fresh copy of this module: it turns `connect` again, and makes its own context)
replaces(import.meta.hot, () => { if (typeof AudioNode !== 'undefined') AudioNode.prototype.connect = plainConnect; undoWake() })

const listeners = new Set<() => void>()
export const sfxMuted = () => muted
/** mute or let sound every effect (remembered) */
export function setSfxMuted(m: boolean) {
  muted = m
  try { localStorage.setItem(KEY, m ? '1' : '0') } catch { /* (not remembered) */ }
  for (const [ctx, g] of masters) {
    // (closed contexts (an old copy's, after a hot update) let go)
    if ((ctx as AudioContext).state === 'closed') { masters.delete(ctx); continue }
    // (set outright: a context with nothing sounding doesn't move a ramp along)
    g.gain.cancelScheduledValues(ctx.currentTime)
    g.gain.value = m ? 0 : 1
  }
  for (const f of listeners) f()
}
export function useSfxMuted() {
  return useSyncExternalStore((f) => { listeners.add(f); return () => listeners.delete(f) }, sfxMuted)
}

const last = new Map<string, number>()
/** whether a sound under this name may start now: not if it did within `ms` (0.3 s) */
export function gate(key: string, ms = 300) {
  const now = performance.now()
  if (now - (last.get(key) ?? -1e9) < ms) return false
  last.set(key, now)
  if (import.meta.env?.DEV) { const k = key.replace(/[-\d.]+$/, ''); played[k] = (played[k] ?? 0) + 1 }
  return true
}
// (in development, `__sfx`: how many times each sound has played, the contexts and whether they're muted)
const played: Record<string, number> = {}
if (import.meta.env?.DEV && typeof window !== 'undefined') Object.assign(window, { __sfx: { played, masters, muted: () => muted } })

const at = new THREE.Vector3()
/** how far left (−1) or right (1) a point is on screen, a little less than all the way (a sound off to one side, not in one ear) */
export function panOf(p: THREE.Vector3, camera: THREE.Camera) {
  at.copy(p).project(camera)
  return Math.max(-1, Math.min(1, at.x)) * 0.6
}

/** the camera heard from (App's SfxEar sets it): how near a sound is, and which side */
let ear: THREE.Camera | null = null
export const setEar = (c: THREE.Camera) => { ear = c }
const earAt = new THREE.Vector3()
/** how loud (0..1, nothing past `reach`) and how far left or right a sound at `p` (world) is heard from the view (`reach` 34: the
 * overview's camera, drawn back for its longer lens, is 23 from the fire, 22 from the till, 24 from the door and 30 from the toilets; at
 * 22 none of them was heard from it, the grill's sizzle and seasonings silent in the view the game opens on) */
export const EAR_REACH = 34
export function heard(p: THREE.Vector3, reach = EAR_REACH) {
  if (!ear) return { near: 0.6, pan: 0 }
  ear.getWorldPosition(earAt)
  return { near: Math.max(0, 1 - p.distanceTo(earAt) / reach), pan: panOf(p, ear) }
}
