// The owner tasting: the crunch of each bite and the soft munching between, made on the spot with WebAudio (no recordings), each a little
// different from the last so a run of them doesn't drone.

import { replaces } from '@/scene/kit/hot'
import { sharedAudio } from '@/scene/interact/sfx'

let ac: AudioContext | null = null
function ctx() {
  if (ac) return ac.state === 'running' ? ac : null
  // (the game's one context (item 576))
  try { ac = sharedAudio() } catch { ac = null }
  if (ac?.state === 'suspended') void ac.resume()
  return ac?.state === 'running' ? ac : null
}
if (typeof window !== 'undefined') {
  const go = () => { const a = ac ?? ctx(); if (a?.state === 'suspended') void a.resume() }
  window.addEventListener('pointerdown', go)
  // (let go of when a hot update swaps this module for a new copy: not the context, every sound's)
  replaces(import.meta.hot, () => { window.removeEventListener('pointerdown', go) })
}

function noise(a: AudioContext, seconds: number, shape: (t: number) => number, smooth: number) {
  const n = Math.max(1, Math.floor(a.sampleRate * seconds))
  const b = a.createBuffer(1, n, a.sampleRate)
  const d = b.getChannelData(0)
  let last = 0
  for (let i = 0; i < n; i++) { last = last * smooth + (Math.random() * 2 - 1) * (1 - smooth); d[i] = last * shape(i / n) }
  const s = a.createBufferSource()
  s.buffer = b
  return s
}

/** a bite: a short crackle (the crust giving) over a soft low knock (the jaw closing) */
export function biteSound() {
  const a = ctx()
  if (!a) return
  const t = a.currentTime
  // (the crackle: a burst of grains, uneven, bright)
  const n = noise(a, 0.12, (x) => (Math.random() < 0.35 ? 1 : 0.25) * Math.pow(1 - x, 1.6), 0.1)
  const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2200 + Math.random() * 900; f.Q.value = 0.9
  const g = a.createGain(); g.gain.value = 0.12
  n.connect(f).connect(g).connect(a.destination)
  n.start(t)
  // (the knock)
  const o = a.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(150 + Math.random() * 30, t)
  o.frequency.exponentialRampToValueAtTime(70, t + 0.08)
  const k = a.createGain()
  k.gain.setValueAtTime(0, t); k.gain.linearRampToValueAtTime(0.09, t + 0.005); k.gain.exponentialRampToValueAtTime(0.0001, t + 0.1)
  o.connect(k).connect(a.destination)
  o.start(t); o.stop(t + 0.12)
}

/** a munch between bites: soft, wet, muffled */
export function chewSound() {
  const a = ctx()
  if (!a) return
  const t = a.currentTime
  const n = noise(a, 0.09, (x) => Math.sin(Math.PI * x) ** 1.5, 0.75)
  const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900 + Math.random() * 400
  const g = a.createGain(); g.gain.value = 0.07
  n.connect(f).connect(g).connect(a.destination)
  n.start(t)
}

/** a gulp, the boss drinking (the owner's: 咕嚕): a low glug falling in pitch, and a little burst of the drink's bubble over it */
export function gulpSound() {
  const a = ctx()
  if (!a) return
  const t = a.currentTime
  const o = a.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(240 + Math.random() * 40, t)
  o.frequency.exponentialRampToValueAtTime(95, t + 0.13)
  const k = a.createGain()
  k.gain.setValueAtTime(0, t); k.gain.linearRampToValueAtTime(0.13, t + 0.012); k.gain.exponentialRampToValueAtTime(0.0001, t + 0.16)
  o.connect(k).connect(a.destination)
  o.start(t); o.stop(t + 0.18)
  const n = noise(a, 0.06, (x) => Math.sin(Math.PI * x), 0.55)
  const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 650 + Math.random() * 200; f.Q.value = 2.2
  const g = a.createGain(); g.gain.value = 0.06
  n.connect(f).connect(g).connect(a.destination)
  n.start(t + 0.05)
}

/** (items 461, 469) a sizzle: egg going into a hot pan, or what's let down into the fryer's oil: a hiss of high noise with crackle in it,
 * fading over `seconds`; `loud` 0..1 */
/** a sizzle's crackle, `seconds` long, rising in and dying away */
const sizzleShape = (x: number) => (x < 0.06 ? x / 0.06 : 1) * Math.pow(1 - x, 1.6) * (0.7 + 0.3 * Math.random())
/**
 * (item 804) each length of sizzle's noise made SIZZLE_TAKES times over and played again, a take picked at random (and its filter's pitch as
 * ever, each time its own): made afresh for every sizzle, its 50 to 77 thousand samples (a random number and a power each) took 1.3 to 1.9 ms
 * of a frame, every second or two while the stove or the fryer was on. The first take of a length made as it's first asked for, the rest in
 * the browser's idle time after it
 */
const SIZZLE_TAKES = 3
const SIZZLES = new Map<number, AudioBuffer[]>()
function sizzleNoise(a: AudioContext, seconds: number) {
  const key = Math.round(seconds * 100)
  let takes = SIZZLES.get(key)
  if (!takes) {
    SIZZLES.set(key, (takes = []))
    const more = (left: number) => {
      if (left <= 0) return
      const idle = (globalThis as { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number }).requestIdleCallback
      const make = () => { takes!.push(noise(a, seconds, sizzleShape, 0.25).buffer!); more(left - 1) }
      if (idle) idle(make, { timeout: 4000 }); else setTimeout(make, 500)
    }
    more(SIZZLE_TAKES - 1)
  }
  if (!takes.length) {
    const s = noise(a, seconds, sizzleShape, 0.25)
    takes.push(s.buffer!)
    return s
  }
  const s = a.createBufferSource()
  s.buffer = takes[Math.floor(Math.random() * takes.length)]
  return s
}
export function sizzleSound(seconds = 1.1, loud = 1) {
  const a = ctx()
  if (!a) return
  const t = a.currentTime
  const n = sizzleNoise(a, seconds)
  const f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2200 + Math.random() * 600
  const g = a.createGain(); g.gain.value = 0.05 * loud
  n.connect(f).connect(g).connect(a.destination)
  n.start(t)
}
