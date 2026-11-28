// The toilets' sounds, and the room's fittings' (the taps, the light switch), made on the spot with WebAudio (no recordings), each as loud as
// the room is near the view (`near` 0..1): the flush (a rush of water that swells and drains away with a gurgle, then the cistern refilling),
// the brush scrubbing, a knock at a locked door, the paper holder's new roll, the Otohime (音姫): a babbling stream with birdsong, played for
// a while to cover what's done; a tap's handle turned, the light switch's tick, the cold cabinets' doors.

import * as THREE from 'three'
import { replaces } from '@/scene/kit/hot'
import { gate, heard, sharedAudio } from '@/scene/interact/sfx'

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

/**
 * A burst of noise shaped by `shape` (0 to 1 through it). `pool`: the sounds heard over and over while the shop's busy (a sizzle as the chef
 * seasons, a plate scrubbed, a stool) made a few ways the first times and then one of those picked each time (item 374: a new buffer worked out
 * on the page's own thread every time, the sizzle's 34,000 samples four times a second, was most of what the shop's sounds made to be thrown
 * away); their pitch, loudness and side still each time's own
 */
const POOLS = new Map<string, AudioBuffer[]>()
function noise(a: AudioContext, seconds: number, shape: (t: number) => number, smooth = 0.4, pool?: { key: string; ways: number }) {
  const kept = pool ? POOLS.get(pool.key) ?? [] : null
  if (pool && kept && !POOLS.has(pool.key)) POOLS.set(pool.key, kept)
  let b: AudioBuffer
  if (kept && kept.length >= (pool?.ways ?? 0) && kept[0].sampleRate === a.sampleRate) b = kept[Math.floor(Math.random() * kept.length)]
  else {
    const n = Math.max(1, Math.floor(a.sampleRate * seconds))
    b = a.createBuffer(1, n, a.sampleRate)
    const d = b.getChannelData(0)
    let last = 0
    for (let i = 0; i < n; i++) { last = last * smooth + (Math.random() * 2 - 1) * (1 - smooth); d[i] = last * shape(i / n) }
    if (kept) { if (kept.length && kept[0].sampleRate !== a.sampleRate) kept.length = 0; kept.push(b) }
  }
  const s = a.createBufferSource()
  s.buffer = b
  return s
}
function out(a: AudioContext, gain: number, pan = 0) {
  const g = a.createGain()
  g.gain.value = gain
  if (pan) { const p = a.createStereoPanner(); p.pan.value = pan; g.connect(p).connect(a.destination) } else g.connect(a.destination)
  return g
}
/** a short ring at a pitch, dying away (glass, a can, a plate, a latch) */
function ping(a: AudioContext, t: number, freq: number, gain: number, decay: number, to: AudioNode, type: OscillatorType = 'sine') {
  const o = a.createOscillator(), g = a.createGain()
  o.type = type; o.frequency.value = freq
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + decay)
  o.connect(g).connect(to)
  o.start(t); o.stop(t + decay + 0.02)
}

/** the flush: a rush that swells and drains, its pitch falling as the bowl empties, a gurgle at the end, the tank refilling after */
export function flushSound(near: number) {
  const a = ctx()
  if (!a || near < 0.02) return
  const t = a.currentTime
  // (item 804: the long noises of a flush made three ways the first times, then one of those picked (noise's pool): made afresh at every
  // flush, the rush and the refill were some 370 thousand samples worked out in the frame a customer pulled the chain)
  const rush = noise(a, 3.2, (x) => Math.min(1, x * 12) * Math.pow(1 - x, 1.6), 0.4, { key: 'flush-rush', ways: 3 })
  const f = a.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 3
  f.frequency.setValueAtTime(2600, t)
  f.frequency.exponentialRampToValueAtTime(380, t + 3)
  rush.connect(f).connect(out(a, 0.55 * near))
  rush.start(t)
  // (the gurgle as it drains: a few low bubbles)
  for (let k = 0; k < 6; k++) {
    const o = a.createOscillator()
    const g = a.createGain()
    const at = t + 2.1 + k * 0.13 + Math.random() * 0.05
    o.frequency.setValueAtTime(140 + Math.random() * 90, at)
    o.frequency.exponentialRampToValueAtTime(320 + Math.random() * 120, at + 0.08)
    g.gain.setValueAtTime(0, at)
    g.gain.linearRampToValueAtTime(0.12 * near, at + 0.015)
    g.gain.exponentialRampToValueAtTime(0.0005, at + 0.1)
    o.connect(g).connect(a.destination)
    o.start(at)
    o.stop(at + 0.12)
  }
  // (and the cistern refilling: a thin hiss, running into the basin on its lid)
  const fill = noise(a, 4.5, (x) => Math.min(1, x * 6) * (1 - x), 0.2, { key: 'flush-fill', ways: 3 })
  const ff = a.createBiquadFilter(); ff.type = 'bandpass'; ff.frequency.value = 3200; ff.Q.value = 1.2
  fill.connect(ff).connect(out(a, 0.12 * near))
  fill.start(t + 2.6)
}

/** the brush, scrubbing: quick bristly strokes back and forth */
export function scrubSound(near: number) {
  const a = ctx()
  if (!a || near < 0.02) return
  const t = a.currentTime
  for (let k = 0; k < 8; k++) {
    const s = noise(a, 0.14, (x) => Math.sin(Math.PI * x), 0.1, { key: 'scrub', ways: 6 })
    const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 4200 + (k % 2) * 1400; f.Q.value = 0.8
    s.connect(f).connect(out(a, 0.25 * near))
    s.start(t + k * 0.16)
  }
}

/** the hand dryer: its fan spinning up, a soft breathy whir for `seconds` (air through its nozzle, a low hum of its motor under it), and
 * winding down: quiet (the owner's: a faint blow) */
export function dryerSound(near: number, seconds = 1.5) {
  const a = ctx()
  if (!a || near < 0.02) return
  const t = a.currentTime
  const air = noise(a, seconds + 0.3, (x) => Math.min(1, x * (seconds + 0.3) / 0.18) * Math.min(1, (1 - x) * (seconds + 0.3) / 0.3), 0.55, { key: `dryer-${seconds.toFixed(1)}`, ways: 3 })
  // (a warm wind blown down (the owner's, 2026-11-10: a dryer on the wall that blows down): broad and soft, its body low, a little hiss on top)
  const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 640; f.Q.value = 0.45
  const soft = a.createBiquadFilter(); soft.type = 'lowpass'; soft.frequency.value = 2400
  air.connect(f).connect(soft).connect(out(a, 0.26 * near))
  air.start(t)
  const hum = a.createOscillator(); hum.type = 'triangle'
  hum.frequency.setValueAtTime(70, t); hum.frequency.linearRampToValueAtTime(118, t + 0.2); hum.frequency.setValueAtTime(118, t + seconds); hum.frequency.linearRampToValueAtTime(60, t + seconds + 0.3)
  const hg = out(a, 0)
  hg.gain.setValueAtTime(0, t); hg.gain.linearRampToValueAtTime(0.04 * near, t + 0.2); hg.gain.setValueAtTime(0.04 * near, t + seconds); hg.gain.linearRampToValueAtTime(0, t + seconds + 0.3)
  hum.connect(hg)
  hum.start(t); hum.stop(t + seconds + 0.35)
}

/** a knock at a locked door (コンコン), and nobody coming out */
export function knockSound(near: number) {
  const a = ctx()
  if (!a || near < 0.02) return
  const t = a.currentTime
  for (const at of [0, 0.17]) {
    const o = a.createOscillator()
    const g = a.createGain()
    o.type = 'triangle'
    o.frequency.setValueAtTime(190, t + at)
    o.frequency.exponentialRampToValueAtTime(110, t + at + 0.08)
    g.gain.setValueAtTime(0.5 * near, t + at)
    g.gain.exponentialRampToValueAtTime(0.0005, t + at + 0.12)
    o.connect(g).connect(a.destination)
    o.start(t + at)
    o.stop(t + at + 0.14)
    const s = noise(a, 0.03, (x) => 1 - x, 0.3)
    const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 1.5
    s.connect(f).connect(out(a, 0.35 * near))
    s.start(t + at)
  }
}

/**
 * A wooden sliding door (引き戸) run along its track (the owner's: every sliding door heard as it's opened and shut): the low rumble of its
 * runners, rising as it gets going and falling as it slows, a faint woody chatter over it, and at the end a soft knock as it meets its
 * post (a duller one shutting, a lighter tap opening). `seconds` how long it runs, `near` how loud (0..1) for how near the view is.
 */
export function slideDoorSound(opening: boolean, near = 1, seconds = 0.55) {
  const a = ctx()
  // (not twice within 0.3 s for one door: one caught on a walker going to and fro clattered)
  if (!a || near < 0.02 || !gate(`slide${opening}${near.toFixed(2)}`)) return
  const t = a.currentTime
  // (the runners: low noise through a low band, swelling and fading with the door's pace)
  // (both noises made four ways for each length the first times, then one of those picked (noise's pool): the genkan's door runs as each
  // customer comes and goes, and each time two new buffers were worked out on the page's thread, the most garbage the shop made (item 374))
  const run = noise(a, seconds, (x) => Math.sin(Math.PI * Math.min(1, x * 1.15)) ** 0.8, 0.86, { key: `slide-run-${seconds}`, ways: 4 })
  const lo = a.createBiquadFilter(); lo.type = 'bandpass'; lo.frequency.value = 230; lo.Q.value = 0.9
  run.connect(lo).connect(out(a, 0.55 * near))
  run.start(t)
  // (the wood on wood over it, a little higher and rough)
  const chat = noise(a, seconds, (x) => 0.5 * Math.sin(Math.PI * x) * (0.6 + 0.4 * Math.sin(x * 60)), 0.5, { key: `slide-chat-${seconds}`, ways: 4 })
  const hi = a.createBiquadFilter(); hi.type = 'bandpass'; hi.frequency.value = 1300; hi.Q.value = 1.2
  chat.connect(hi).connect(out(a, 0.12 * near))
  chat.start(t)
  // (and the knock as it comes to its post)
  const at = t + seconds * 0.95
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = 'triangle'
  o.frequency.setValueAtTime(opening ? 210 : 150, at)
  o.frequency.exponentialRampToValueAtTime(opening ? 140 : 90, at + 0.09)
  g.gain.setValueAtTime((opening ? 0.22 : 0.4) * near, at)
  g.gain.exponentialRampToValueAtTime(0.0005, at + 0.14)
  o.connect(g).connect(a.destination)
  o.start(at)
  o.stop(at + 0.16)
}

/** a bamboo blind let down or rolled up (item 338): its slats ticking past each other as it goes, the cord's low rustle under them, and its
 * foot coming to rest, a light hollow knock */
export function blindSound(down: boolean, near = 1, seconds = 0.8) {
  const a = ctx()
  if (!a || near < 0.02 || !gate(`blind${down}`)) return
  const t = a.currentTime
  const tick = noise(a, seconds, (x) => Math.sin(Math.PI * Math.min(1, x * 1.1)) ** 0.7 * (0.45 + 0.55 * Math.max(0, Math.sin(x * (down ? 95 : 75)))), 0.25)
  const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = down ? 1750 : 1500; bp.Q.value = 1.4
  tick.connect(bp).connect(out(a, 0.2 * near))
  tick.start(t)
  const rus = noise(a, seconds, (x) => 0.6 * Math.sin(Math.PI * x), 0.7)
  const lo = a.createBiquadFilter(); lo.type = 'bandpass'; lo.frequency.value = 420; lo.Q.value = 0.8
  rus.connect(lo).connect(out(a, 0.12 * near))
  rus.start(t)
  ping(a, t + seconds * 0.96, down ? 260 : 340, 0.16 * near, 0.08, a.destination, 'triangle')
}

/** a new roll on the holder: a papery rustle and the bar's click */
export function rollSound(near: number) {
  const a = ctx()
  if (!a || near < 0.02) return
  const t = a.currentTime
  const s = noise(a, 0.45, (x) => Math.sin(Math.PI * x) * (0.6 + 0.4 * Math.random()), 0.05)
  const f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2500
  s.connect(f).connect(out(a, 0.22 * near))
  s.start(t)
  const o = a.createOscillator()
  const g = a.createGain()
  o.frequency.value = 1800
  g.gain.setValueAtTime(0.15 * near, t + 0.42)
  g.gain.exponentialRampToValueAtTime(0.0005, t + 0.47)
  o.connect(g).connect(a.destination)
  o.start(t + 0.42)
  o.stop(t + 0.5)
}

/** the hand soap's pump pressed (the owner's, 2026-11-10: it can be pressed, and it's used up): its head's plastic click as it goes down and
 * a soft wet squelch of soap coming out; pressed empty, only the click and a little puff of air */
export function pumpSound(near: number, empty = false) {
  const a = ctx()
  if (!a || near < 0.02) return
  const t = a.currentTime
  // (the click: a short bright tick, the spring's little ring after it)
  const c = noise(a, 0.03, (x) => (1 - x) * (1 - x), 0.02)
  const hp = a.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3200
  c.connect(hp).connect(out(a, 0.2 * near))
  c.start(t)
  ping(a, t + 0.004, 2600, 0.025 * near, 0.04, a.destination, 'triangle')
  const s2 = noise(a, empty ? 0.12 : 0.16, (x) => Math.sin(Math.PI * Math.min(1, x * 1.6)) * (1 - x), 0.25)
  const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = empty ? 0.6 : 2.2
  // (the soap's squelch low and wet, sliding down as it's pushed out; an empty one's breath of air higher and thin)
  bp.frequency.setValueAtTime(empty ? 2400 : 1100, t + 0.03)
  bp.frequency.exponentialRampToValueAtTime(empty ? 1600 : 420, t + 0.18)
  s2.connect(bp).connect(out(a, (empty ? 0.06 : 0.16) * near))
  s2.start(t + 0.03)
}

/** a drop of soap landing (item 289): a soft little plip */
export function plipSound(near: number, wet = false) {
  const a = ctx()
  if (!a || near < 0.02) return
  const t = a.currentTime
  const o = a.createOscillator(), g = a.createGain()
  o.type = 'sine'
  o.frequency.setValueAtTime(wet ? 900 : 620, t)
  o.frequency.exponentialRampToValueAtTime(wet ? 1500 : 380, t + 0.06)
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07 * near, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09)
  o.connect(g).connect(a.destination)
  o.start(t); o.stop(t + 0.1)
}

/** taps left running or washing (the sink's, the toilets' washstands'): one splashing loop for them all, as loud as the nearest running one;
 * each tap says how near it's running each frame (0: shut) */
const taps = new Map<string, number>()
let run: { gain: GainNode } | null = null
export function tapRunning(id: string, level: number) {
  const prev = taps.get(id) ?? 0
  if (Math.abs(prev - level) < 0.02 && !(level === 0 && prev !== 0)) return
  taps.set(id, level)
  const a = ctx()
  if (!a) return
  const l = Math.max(0, ...taps.values())
  if (!run) {
    if (l <= 0) return
    // (water splashing into a basin: rough noise, a slow wobble in its band, looped)
    const n = Math.floor(a.sampleRate * 2)
    const b = a.createBuffer(1, n, a.sampleRate)
    const d = b.getChannelData(0)
    let last = 0
    for (let i = 0; i < n; i++) { last = last * 0.25 + (Math.random() * 2 - 1) * 0.75; d[i] = last * (0.8 + 0.2 * Math.sin((i / n) * Math.PI * 2 * 23)) }
    const src = a.createBufferSource()
    src.buffer = b
    src.loop = true
    const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1700; f.Q.value = 0.6
    const lfo = a.createOscillator(); lfo.frequency.value = 3.3
    const depth = a.createGain(); depth.gain.value = 300
    lfo.connect(depth).connect(f.frequency)
    const gain = a.createGain()
    gain.gain.value = 0
    src.connect(f).connect(gain).connect(a.destination)
    src.start()
    lfo.start()
    run = { gain }
  }
  run.gain.gain.setTargetAtTime(0.16 * l, a.currentTime, 0.12)
}

/** water pouring into the washroom's bowl as it stands in it (its stopper down, filling): a deeper plunge under the tap's splash, its ring
 * rising in pitch as the bowl fills (the air over the water shorter, as a jug filling), one loop for both rooms as loud as the nearer.
 * Each bowl says each frame how near it's heard (0: nothing pouring into standing water) and how full it is */
const pours = new Map<string, { level: number; full: number }>()
let pour: { gain: GainNode; band: BiquadFilterNode } | null = null
export function basinPour(id: string, level: number, full: number) {
  const prev = pours.get(id)
  if (prev && Math.abs(prev.level - level) < 0.02 && Math.abs(prev.full - full) < 0.02 && !(level === 0 && prev.level !== 0)) return
  pours.set(id, { level, full })
  const a = ctx()
  if (!a) return
  let top = { level: 0, full: 0 }
  for (const v of pours.values()) if (v.level > top.level) top = v
  if (!pour) {
    if (top.level <= 0) return
    // (a stream into a pool: rough noise, bubbling in and out, through a band that rings)
    const n = Math.floor(a.sampleRate * 3)
    const b = a.createBuffer(1, n, a.sampleRate)
    const d = b.getChannelData(0)
    let last = 0
    for (let i = 0; i < n; i++) { last = last * 0.55 + (Math.random() * 2 - 1) * 0.45; d[i] = last * (0.7 + 0.3 * Math.sin((i / n) * Math.PI * 2 * 41) * Math.sin((i / n) * Math.PI * 2 * 7)) }
    const src = a.createBufferSource()
    src.buffer = b
    src.loop = true
    const band = a.createBiquadFilter(); band.type = 'bandpass'; band.Q.value = 3.2; band.frequency.value = 420
    const gain = a.createGain()
    gain.gain.value = 0
    src.connect(band).connect(gain).connect(a.destination)
    src.start()
    pour = { gain, band }
  }
  pour.band.frequency.setTargetAtTime(380 + 640 * top.full, a.currentTime, 0.2)
  pour.gain.gain.setTargetAtTime(0.22 * top.level, a.currentTime, 0.15)
}

/** the bowl's pop-up stopper (the owner's: a crisp mechanical feel). Pressed home (`down`): the cap's rim meeting its ring, then the spring
 * latch catching a hair later, sharp and dry, and the brass seated with a small tink. Let go (popped up): the latch freeing with a softer
 * click, and the cap thrown up on its spring, a bright metallic twang falling a little in pitch as it settles, a lighter ring over it */
export function plugSound(down: boolean, near = 1) {
  const a = ctx()
  if (!a || near < 0.02) return
  const t = a.currentTime
  const click = (at: number, ms: number, hp: number, gain: number) => {
    const ck = noise(a, ms / 1000, (x) => (1 - x) ** 2, 0.15)
    const f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp
    ck.connect(f).connect(out(a, gain * near))
    ck.start(at)
  }
  if (down) {
    click(t, 9, 2800, 0.09)
    click(t + 0.045, 6, 4600, 0.14)
    ping(a, t + 0.047, 3200, 0.018 * near, 0.06, out(a, 1))
    ping(a, t + 0.05, 1650, 0.03 * near, 0.14, out(a, 1))
    return
  }
  click(t, 7, 3400, 0.08)
  // (the spring's twang: a bright tone dropping as it rings down, wobbling with the cap)
  const o = a.createOscillator(), g = a.createGain(), wob = a.createOscillator(), wd = a.createGain()
  o.type = 'triangle'
  o.frequency.setValueAtTime(2550, t + 0.05)
  o.frequency.exponentialRampToValueAtTime(1900, t + 0.34)
  wob.frequency.value = 26; wd.gain.value = 60
  wob.connect(wd).connect(o.frequency)
  g.gain.setValueAtTime(0.0001, t + 0.05)
  g.gain.exponentialRampToValueAtTime(0.03 * near, t + 0.056)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.36)
  o.connect(g).connect(out(a, 1))
  o.start(t + 0.05); wob.start(t + 0.05)
  o.stop(t + 0.4); wob.stop(t + 0.4)
  ping(a, t + 0.052, 4100, 0.012 * near, 0.09, out(a, 1))
}

/** water running away into the bowl's overflow as it stands full (the owner's): a thin, bubbling trickle, one loop for both rooms as loud as
 * the nearer; each bowl says each frame how near it's heard (0: nothing running into its overflow) */
const overs = new Map<string, number>()
let overRun: { gain: GainNode } | null = null
export function overflowTrickle(id: string, level: number) {
  const prev = overs.get(id) ?? 0
  if (Math.abs(prev - level) < 0.02 && !(level === 0 && prev !== 0)) return
  overs.set(id, level)
  const a = ctx()
  if (!a) return
  const l = Math.max(0, ...overs.values())
  if (!overRun) {
    if (l <= 0) return
    // (a trickle into a narrow opening: smoother noise in quick little bursts, through a band high and narrow, wobbling)
    const n = Math.floor(a.sampleRate * 2)
    const b = a.createBuffer(1, n, a.sampleRate)
    const d = b.getChannelData(0)
    let last = 0
    for (let i = 0; i < n; i++) {
      last = last * 0.5 + (Math.random() * 2 - 1) * 0.5
      const x = i / n
      d[i] = last * (0.55 + 0.45 * Math.abs(Math.sin(x * Math.PI * 2 * 37) * Math.sin(x * Math.PI * 2 * 11)))
    }
    const src = a.createBufferSource()
    src.buffer = b
    src.loop = true
    const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2300; f.Q.value = 1.4
    const lfo = a.createOscillator(); lfo.frequency.value = 6.5
    const depth = a.createGain(); depth.gain.value = 450
    lfo.connect(depth).connect(f.frequency)
    const gain = a.createGain()
    gain.gain.value = 0
    src.connect(f).connect(gain).connect(a.destination)
    src.start()
    lfo.start()
    overRun = { gain }
  }
  overRun.gain.gain.setTargetAtTime(0.07 * l, a.currentTime, 0.2)
}

/** the bowl let go (its stopper up with water in it): glugs as the water goes down the drain, coming quicker and lower as the bowl empties,
 * and a last slurp of air as it's gone (`seconds`: how long it'll take, as full as it was) */
export function drainGurgle(near: number, seconds: number) {
  const a = ctx()
  if (!a || near < 0.02 || seconds < 0.2) return
  const t0 = a.currentTime
  const to = out(a, 1)
  let k = t0 + 0.12
  while (k < t0 + seconds) {
    const x = (k - t0) / seconds
    const glug = noise(a, 0.07, (y) => Math.sin(Math.PI * y) ** 2, 0.35)
    const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 6
    const f = 520 - 220 * x + Math.random() * 90
    bp.frequency.setValueAtTime(f * 1.3, k); bp.frequency.exponentialRampToValueAtTime(f * 0.75, k + 0.07)
    const g = a.createGain(); g.gain.value = (0.16 + 0.1 * x) * near
    glug.connect(bp).connect(g).connect(to)
    glug.start(k)
    k += 0.16 - 0.07 * x + Math.random() * 0.08
  }
  // (the last of it sucked down: a falling hiss)
  const end = t0 + seconds
  const sl = noise(a, 0.35, (y) => Math.sin(Math.PI * Math.min(1, y * 1.6)) * (1 - y), 0.3)
  const lp = a.createBiquadFilter(); lp.type = 'bandpass'; lp.Q.value = 2
  lp.frequency.setValueAtTime(900, end); lp.frequency.exponentialRampToValueAtTime(240, end + 0.35)
  const sg = a.createGain(); sg.gain.value = 0.2 * near
  sl.connect(lp).connect(sg).connect(to)
  sl.start(end)
}

/** a tap's cross handle given its quarter turn (the owner's: turning it should be heard; light, not heavy or watery): the stem turning in its
 * packing, a short faint stick-slip squeak rising as it opens (falling as it shuts), a little ring of brass on brass at the end of the turn,
 * and, shutting, the washer seating with a small dull knock */
export function tapTurnSound(open: boolean, near = 1) {
  const a = ctx()
  if (!a || near < 0.02) return
  const t = a.currentTime
  const dur = 0.2
  const o = a.createOscillator()
  o.type = 'sawtooth'
  o.frequency.setValueAtTime(open ? 520 : 680, t)
  o.frequency.linearRampToValueAtTime(open ? 780 : 440, t + dur)
  const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 1.3
  // (the squeak in grains, the stem sticking and slipping some thirty times a second, loudest midway)
  const g = a.createGain()
  g.gain.setValueAtTime(0.0001, t)
  for (let k = t; k < t + dur; ) {
    const step = 1 / 32 + Math.random() * 0.01
    const peak = 0.04 * near * Math.sin((Math.PI * (k - t)) / dur) + 0.0001
    g.gain.linearRampToValueAtTime(peak, k + step * 0.3)
    g.gain.linearRampToValueAtTime(0.0001, k + step)
    k += step
  }
  o.connect(bp).connect(g).connect(a.destination)
  o.start(t)
  o.stop(t + dur + 0.03)
  // (brass on brass as the cross comes to its stop: two thin partials, dying away)
  const end = t + dur
  for (const [f, v] of [[2650, 0.028], [4180, 0.016]] as const) {
    const r = a.createOscillator(), rg = a.createGain()
    r.frequency.value = f
    rg.gain.setValueAtTime(v * near, end)
    rg.gain.exponentialRampToValueAtTime(0.0001, end + 0.22)
    r.connect(rg).connect(a.destination)
    r.start(end)
    r.stop(end + 0.24)
  }
  if (!open) {
    const th = noise(a, 0.035, (x) => (1 - x) ** 3, 0.55)
    const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.4
    th.connect(lp).connect(out(a, 0.12 * near))
    th.start(end)
  }
}

/** the light switch (a wide rocker) pressed: two dry little ticks a hair apart, the rocker giving and then landing, bright and short with
 * nothing ringing after (the owner's: light; the first try was heavy and watery, a falling tone under a ringing band), a touch higher
 * switching on */
export function lightSwitchSound(on: boolean) {
  const a = ctx()
  if (!a) return
  const t = a.currentTime
  const tick = (at: number, gain: number, cut: number, ms: number) => {
    const s = noise(a, ms / 1000, (x) => (1 - x) ** 3, 0)
    const f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = cut; f.Q.value = 0.5
    s.connect(f).connect(out(a, gain))
    s.start(at)
  }
  tick(t, 0.07, 4500, 3)
  tick(t + 0.012, on ? 0.2 : 0.17, on ? 2800 : 2400, 5)
}

/** a cold cabinet's door (the drinks fridges' glass doors, the ingredients freezer's lid: `chest`), as light as the switch: opening, its seal
 * let go, a short soft breath of air; shut, it meets the cabinet, a muffled knock with the seal's little tick on it */
export function coolerDoorSound(opening: boolean, near = 1, chest = false) {
  const a = ctx()
  if (!a || near < 0.02 || !gate(`cooler${opening}${chest}${near.toFixed(1)}`)) return
  const t = a.currentTime
  if (opening) {
    const s = noise(a, 0.09, (x) => Math.min(1, x * 8) * (1 - x) ** 2, 0.3)
    const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = chest ? 900 : 1300; bp.Q.value = 0.5
    s.connect(bp).connect(out(a, 0.15 * near))
    s.start(t)
    return
  }
  const s = noise(a, 0.05, (x) => (1 - x) ** 3, 0.6)
  const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = chest ? 420 : 600; lp.Q.value = 0.4
  s.connect(lp).connect(out(a, 0.28 * near))
  s.start(t)
  const k = noise(a, 0.004, (x) => 1 - x, 0)
  const hp = a.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000
  k.connect(hp).connect(out(a, 0.07 * near))
  k.start(t + 0.008)
}

/** the Otohime: a stream babbling over stones and a bird or two, for `seconds` (its volume follows the view each frame: see otohimeNear) */
let oto: { gain: GainNode; until: number } | null = null
export function otohimeSound(seconds: number) {
  const a = ctx()
  if (!a) return
  const t = a.currentTime
  if (oto && oto.until > t) return
  const gain = a.createGain()
  gain.gain.value = 0
  gain.connect(a.destination)
  // (the water: noise through a moving band, a slow swell under quick babble)
  const w = noise(a, seconds, (x) => Math.min(1, x * 20, (1 - x) * 10) * (0.7 + 0.3 * Math.sin(x * seconds * 9) * Math.sin(x * seconds * 2.3)), 0.25)
  const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 0.7
  const lfo = a.createOscillator(); lfo.frequency.value = 5.5
  const depth = a.createGain(); depth.gain.value = 500
  lfo.connect(depth).connect(f.frequency)
  w.connect(f).connect(gain)
  w.start(t)
  lfo.start(t)
  lfo.stop(t + seconds)
  // (a bird now and then: a quick rising chirp)
  for (let at = 1 + Math.random() * 2; at < seconds - 1; at += 2.5 + Math.random() * 3) {
    for (let k = 0; k < 3; k++) {
      const o = a.createOscillator()
      const g = a.createGain()
      const s = t + at + k * 0.11
      o.frequency.setValueAtTime(2600 + Math.random() * 400, s)
      o.frequency.exponentialRampToValueAtTime(4200 + Math.random() * 600, s + 0.07)
      g.gain.setValueAtTime(0, s)
      g.gain.linearRampToValueAtTime(0.08, s + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0005, s + 0.08)
      o.connect(g).connect(gain)
      o.start(s)
      o.stop(s + 0.09)
    }
  }
  oto = { gain, until: t + seconds }
}
/** how near the Otohime's room is to the view just now */
export function otohimeNear(near: number) {
  if (!ac || !oto) return
  oto.gain.gain.setTargetAtTime(0.5 * near, ac.currentTime, 0.2)
  if (oto.until < ac.currentTime) oto = null
}

/**
 * A drink taken out of (or put back in) a fridge, heard at `at` (world): a glass bottle's bright clink against its neighbour (two quick high
 * pings and a tick), a can's hollow aluminium tonk (two lower knocks, a little out of tune with each other)
 */
export function bottleClink(can: boolean, at: THREE.Vector3) {
  const a = ctx()
  const { near, pan } = heard(at)
  if (!a || near < 0.02 || !gate('clink', 120)) return
  const t = a.currentTime, o = out(a, 0.22 * near, pan)
  if (can) {
    ping(a, t, 880 + Math.random() * 60, 0.5, 0.09, o, 'triangle')
    ping(a, t + 0.004, 1330 + Math.random() * 80, 0.3, 0.06, o, 'triangle')
    ping(a, t + 0.09, 960, 0.22, 0.06, o, 'triangle')
  } else {
    ping(a, t, 2650 + Math.random() * 200, 0.5, 0.16, o)
    ping(a, t + 0.002, 3420 + Math.random() * 200, 0.3, 0.1, o)
    ping(a, t + 0.075, 2900, 0.25, 0.12, o)
  }
  const k = noise(a, 0.006, (x) => 1 - x, 0)
  const hp = a.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 4000
  k.connect(hp).connect(o); k.start(t)
}

/**
 * A glass bottle broken on the floor (game/spills), heard at `at`: the hard crack of it hitting the boards, a bright scatter of shards ringing
 * and tinkling as they skitter and settle (a dozen little pings, high, each its own pitch, over half a second), and the drink's splash under it
 */
export function glassShatter(at: THREE.Vector3) {
  const a = ctx()
  const { near, pan } = heard(at)
  if (!a || near < 0.02 || !gate('shatter', 150)) return
  const t = a.currentTime, o = out(a, 0.34 * near, pan)
  // (the crack: a burst of noise, bright, gone in a few hundredths)
  const crack = noise(a, 0.09, (x) => (1 - x) ** 3, 0)
  const hp = a.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800
  crack.connect(hp).connect(o); crack.start(t)
  const thud = noise(a, 0.07, (x) => (1 - x) ** 2, 0.6)
  const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420
  const tg = a.createGain(); tg.gain.value = 0.8
  thud.connect(lp).connect(tg).connect(o); thud.start(t)
  // (the shards: high pings, each a little later and quieter, skittering)
  for (let k = 0; k < 14; k++) {
    const dt = 0.01 + Math.random() ** 1.6 * 0.55, f = 2600 + Math.random() * 4200
    ping(a, t + dt, f, 0.32 * (1 - dt * 1.2), 0.05 + Math.random() * 0.09, o)
    if (k % 3 === 0) ping(a, t + dt + 0.002, f * 1.48, 0.14 * (1 - dt), 0.04, o)
  }
  // (and the drink out of it: a short wet splash)
  const wet = noise(a, 0.3, (x) => Math.min(1, x * 25) * (1 - x) ** 2.2, 0.2)
  const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.8
  const wg = a.createGain(); wg.gain.value = 0.55
  wet.connect(bp).connect(wg).connect(o); wet.start(t + 0.012)
}

/**
 * A can knocked to the floor (game/spills), heard at `at`: its hollow clank on the boards (a can's ring, two or three partials), a second
 * smaller one as it bounces, then the rattle of it rolling away, slowing
 */
export function canClatter(at: THREE.Vector3) {
  const a = ctx()
  const { near, pan } = heard(at)
  if (!a || near < 0.02 || !gate('clatter', 150)) return
  const t = a.currentTime, o = out(a, 0.26 * near, pan)
  for (const [dt, g] of [[0, 1], [0.16, 0.45]] as const) {
    ping(a, t + dt, 640 + Math.random() * 40, 0.55 * g, 0.16, o, 'triangle')
    ping(a, t + dt + 0.003, 1490 + Math.random() * 60, 0.32 * g, 0.11, o, 'triangle')
    ping(a, t + dt + 0.005, 2730 + Math.random() * 90, 0.16 * g, 0.07, o)
    const k = noise(a, 0.02, (x) => 1 - x, 0)
    const hp = a.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500
    const kg = a.createGain(); kg.gain.value = g
    k.connect(hp).connect(kg).connect(o); k.start(t + dt)
  }
  // (rolling: a low rumble ticking over the boards' joins, slowing and fading over a second)
  const roll = noise(a, 1.1, (x) => (x < 0.04 ? x / 0.04 : 1) * (1 - x) ** 1.5 * (0.6 + 0.4 * Math.max(0, Math.sin(x * 70 * (1 - x * 0.6)))), 0.5)
  const rb = a.createBiquadFilter(); rb.type = 'bandpass'; rb.frequency.value = 1300; rb.Q.value = 1.4
  const rg = a.createGain(); rg.gain.value = 0.5
  roll.connect(rb).connect(rg).connect(o); roll.start(t + 0.22)
}

/**
 * A drink thrown hard (item 248), heard at `at` as it leaves the hand: the air past it, a breathy rush falling in pitch as it goes (noise
 * through a band sweeping down), as loud as it's thrown (`k` 0..1)
 */
export function throwWhoosh(at: THREE.Vector3, k: number) {
  const a = ctx()
  const { near, pan } = heard(at)
  if (!a || near < 0.02 || !gate('whoosh', 200)) return
  const t = a.currentTime, o = out(a, 0.3 * near * Math.min(1, Math.max(0.3, k)), pan)
  const n = noise(a, 0.34, (x) => Math.min(1, x * 7) * (1 - x) ** 1.6, 0.3)
  const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.1
  bp.frequency.setValueAtTime(1600, t); bp.frequency.exponentialRampToValueAtTime(380, t + 0.32)
  n.connect(bp).connect(o); n.start(t)
}

/**
 * A paper pack dropped on the floor (game/spills), heard at `at`: a dull thud of board and the drink in it, no ring (`k` how hard: a small
 * drop half as loud), and, a hard one, a second softer as it settles on its side
 */
export function boxThud(at: THREE.Vector3, k = 1) {
  const a = ctx()
  const { near, pan } = heard(at)
  if (!a || near < 0.02 || !gate('thud', 120)) return
  const t = a.currentTime, o = out(a, 0.3 * near * k, pan)
  for (const [dt, gk] of (k >= 1 ? [[0, 1], [0.13, 0.4]] : [[0, 1]]) as [number, number][]) {
    const n = noise(a, 0.09, (x) => (1 - x) ** 3, 0.55)
    const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 0.9
    const ng = a.createGain(); ng.gain.value = gk
    n.connect(lp).connect(ng).connect(o); n.start(t + dt)
    ping(a, t + dt, 150 + Math.random() * 20, 0.5 * gk, 0.08, o)
  }
  // (the drink in it, a little slosh)
  const s = noise(a, 0.16, (x) => Math.min(1, x * 20) * (1 - x) ** 2, 0.3)
  const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 1.2
  const sg = a.createGain(); sg.gain.value = 0.25 * k
  s.connect(bp).connect(sg).connect(o); s.start(t + 0.02)
}

/** a toilet's door latched behind someone, heard at `at`: a little brass bolt slid home, a click and its small ring, a softer click after */
export function latchSound(at: THREE.Vector3) {
  const a = ctx()
  const { near, pan } = heard(at)
  if (!a || near < 0.02 || !gate(`latch${at.x.toFixed(1)}`)) return
  const t = a.currentTime, o = out(a, 0.2 * near, pan)
  for (const [dt, g] of [[0, 1], [0.045, 0.5]] as const) {
    const k = noise(a, 0.007, (x) => 1 - x, 0.1)
    const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = 2
    const kg = a.createGain(); kg.gain.value = g
    k.connect(bp).connect(kg).connect(o); k.start(t + dt)
  }
  ping(a, t, 1900, 0.18, 0.07, o)
}

/** a glaze brushed or salt thrown on what's over the coals: a burst of sizzle (white noise, high, crackling), swelling and dying away */
export function sizzleBurst(at: THREE.Vector3, level = 1) {
  const a = ctx()
  const { near, pan } = heard(at)
  if (!a || near < 0.02 || !gate('sizzle', 250)) return
  const t = a.currentTime, o = out(a, 0.16 * near * level, pan)
  const s = noise(a, 0.7, (x) => Math.min(1, x * 12) * (1 - x) ** 1.6 * (0.55 + 0.45 * Math.random() ** 6), 0.05, { key: 'sizzle', ways: 6 })
  const hp = a.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2600
  s.connect(hp).connect(o); s.start(t)
}

/** a plate scrubbed in the sink: a splash and a scrub of the brush in soapy water, a bubble or two */
export function washSplash(at: THREE.Vector3) {
  const a = ctx()
  const { near, pan } = heard(at)
  if (!a || near < 0.02 || !gate('wash', 280)) return
  const t = a.currentTime, o = out(a, 0.17 * near, pan)
  const s = noise(a, 0.38, (x) => Math.min(1, x * 6) * (1 - x) * (0.6 + 0.4 * Math.sin(x * 60)), 0.5, { key: 'wash', ways: 6 })
  const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.7
  s.connect(bp).connect(o); s.start(t)
  for (let k = 0; k < 2; k++) {
    const b = a.createOscillator(), g = a.createGain(), at0 = t + 0.08 + k * 0.11 + Math.random() * 0.05
    b.frequency.setValueAtTime(520 + Math.random() * 200, at0); b.frequency.exponentialRampToValueAtTime(1300, at0 + 0.05)
    g.gain.setValueAtTime(0.0001, at0); g.gain.exponentialRampToValueAtTime(0.12, at0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, at0 + 0.06)
    b.connect(g).connect(o); b.start(at0); b.stop(at0 + 0.08)
  }
}

/** a plate set down on another: a short ceramic clink */
export function plateClink(at: THREE.Vector3) {
  const a = ctx()
  const { near, pan } = heard(at)
  if (!a || near < 0.02 || !gate('plate', 90)) return
  const t = a.currentTime, o = out(a, 0.16 * near, pan)
  ping(a, t, 2080 + Math.random() * 120, 0.45, 0.09, o)
  ping(a, t + 0.002, 3350 + Math.random() * 160, 0.25, 0.06, o)
  const k = noise(a, 0.01, (x) => 1 - x, 0.2)
  const hp = a.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500
  k.connect(hp).connect(o); k.start(t)
}

/** the bar's swing door: pushed open, a short dry creak of its hinges and a soft knock of the hand on the wood (`push`); swung back shut
 * past its frame, a light wooden tap (`tap`) */
export function gateSound(at: THREE.Vector3, kind: 'push' | 'tap') {
  const a = ctx()
  const { near, pan } = heard(at)
  if (!a || near < 0.02 || !gate(`swing${kind}${at.x.toFixed(1)}`)) return
  const t = a.currentTime, o = out(a, (kind === 'push' ? 0.16 : 0.12) * near, pan)
  if (kind === 'push') {
    // (the hinge: a little rasp drawn up in pitch as it turns)
    const r = noise(a, 0.16, (x) => Math.sin(Math.PI * x) * (0.6 + 0.4 * Math.sin(x * 60)), 0.2)
    const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 6
    bp.frequency.setValueAtTime(620, t); bp.frequency.linearRampToValueAtTime(980, t + 0.16)
    const rg = a.createGain(); rg.gain.value = 0.7
    r.connect(bp).connect(rg).connect(o); r.start(t)
  }
  // (the knock: wood, hollow and low)
  const k = noise(a, 0.03, (x) => (1 - x) ** 2, 0.15)
  const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = kind === 'push' ? 900 : 1300
  k.connect(lp).connect(o); k.start(t)
  ping(a, t, kind === 'push' ? 180 : 240, 0.25, 0.08, o)
}

/** a plate set down before its customer (item 320, the owner's: 端菜上桌 heard): porcelain on the counter's wood, a short knock and the
 * plate's own small ring over a low tap */
export function plateDownSound(at: THREE.Vector3) {
  const a = ctx()
  const { near, pan } = heard(at)
  if (!a || near < 0.02 || !gate(`plate${at.x.toFixed(1)}${at.z.toFixed(1)}`, 250)) return
  const t = a.currentTime, o = out(a, 0.16 * near, pan)
  const k = noise(a, 0.03, (x) => (1 - x) ** 3, 0.1)
  const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 1.6
  k.connect(bp).connect(o); k.start(t)
  ping(a, t, 2650, 0.22, 0.09, o)
  ping(a, t, 4100, 0.08, 0.05, o)
  ping(a, t, 210, 0.3, 0.06, o)
}
/** a bar stool pulled out over the boards: a short wooden scrape, low, its feet's rub dying away */
export function stoolSound(at: THREE.Vector3) {
  const a = ctx()
  const { near, pan } = heard(at)
  if (!a || near < 0.02 || !gate(`stool${at.x.toFixed(1)}${at.z.toFixed(1)}`)) return
  const t = a.currentTime, o = out(a, 0.14 * near, pan)
  const r = noise(a, 0.22, (x) => Math.sin(Math.PI * Math.min(1, x * 1.6)) * (1 - x) * (0.7 + 0.3 * Math.sin(x * 90)), 0.25)
  const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2.5
  bp.frequency.setValueAtTime(420, t); bp.frequency.linearRampToValueAtTime(300, t + 0.22)
  r.connect(bp).connect(o); r.start(t)
  ping(a, t + 0.2, 140, 0.15, 0.06, o)
}

/** the dish washer done (the owner's: a clear chime as it finishes): two soft bell tones, the second a fourth up, each with a quiet octave over */
export function washerChime(at: THREE.Vector3) {
  const a = ctx()
  const { near, pan } = heard(at)
  if (!a || near < 0.02 || !gate('washer-chime', 600)) return
  const t = a.currentTime, o = out(a, 0.2 * near, pan)
  for (const [k, f] of [[0, 1046.5], [1, 1396.9]] as const) {
    ping(a, t + k * 0.22, f, 0.4, 0.9, o)
    ping(a, t + k * 0.22, f * 2, 0.08, 0.5, o)
  }
}
/** its door tried while it's washing: a short low double beep, it won't open */
export function washerBeep(at: THREE.Vector3) {
  const a = ctx()
  const { near, pan } = heard(at)
  if (!a || near < 0.02 || !gate('washer-beep', 300)) return
  const t = a.currentTime, o = out(a, 0.12 * near, pan)
  ping(a, t, 520, 0.35, 0.09, o, 'square')
  ping(a, t + 0.13, 520, 0.35, 0.09, o, 'square')
}

/** a looping sound's samples (the television's hiss, the rain's), made once for a rate of the context's and kept (the Optimization window's:
 * not made again each time the sound is) */
const LOOPS = new Map<string, AudioBuffer>()
function loopBuffer(a: BaseAudioContext, key: string, seconds: number, fill: (d: Float32Array) => void) {
  const k = `${key}:${a.sampleRate}`
  let b = LOOPS.get(k)
  if (!b) {
    b = a.createBuffer(1, Math.floor(a.sampleRate * seconds), a.sampleRate)
    fill(b.getChannelData(0))
    LOOPS.set(k, b)
  }
  return b
}
/** the television upstairs (items 612, 613) switched: the switch's click, and coming on, the picture's little crackle as it comes up; going
 * off, a softer one as it drops */
export function tvSwitchSound(on: boolean) {
  const a = ctx()
  if (!a) return
  lightSwitchSound(on)
  const s = noise(a, on ? 0.18 : 0.1, (x) => (1 - x) ** 2, 0)
  const f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = on ? 3200 : 1800; f.Q.value = 0.6
  s.connect(f).connect(out(a, on ? 0.05 : 0.03))
  s.start(a.currentTime + 0.02)
}
/** its channel changed: a small click and the hiss of static between the one and the next */
export function tvChannelSound() {
  const a = ctx()
  if (!a) return
  const t = a.currentTime
  lightSwitchSound(true)
  const s = noise(a, 0.3, (x) => Math.min(1, x / 0.08) * (1 - x) ** 1.5, 0)
  const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = 0.5
  s.connect(f).connect(out(a, 0.06))
  s.start(t + 0.01)
}
/**
 * What each channel sounds like across the room (item 677, the owner's 「二樓電視聲也很怪」: it was a hiss through one filter, swung louder and
 * softer by two steady tones, a wobble at four and a half a second that was no voice anyone talks in): a voice (a buzz at its pitch, a breath
 * over it, through two vowel bands moved syllable by syllable among the vowels) speaking in syllables, words and phrases of uneven length,
 * each phrase falling in pitch, with pauses; under it what the show has: the weather's soft chord, the ball game's crowd and its cheers, the
 * cooking's sizzle and its spits, the sea's wash and a low drone under the documentary's narrator. `f0` the voice's pitch, the syllables'
 * lengths (seconds), words' syllables, phrases' words, the gaps between words and phrases; the bed's kind and how loud; how loud in all
 */
type TvShow = { f0: number; syl: [number, number]; word: [number, number]; phrase: [number, number]; gap: [number, number]; pause: [number, number]
  voice: number; bed: 'none' | 'crowd' | 'sizzle' | 'sea'; bedGain: number; pad: number[]; padGain: number; gain: number }
const TV_SOUND: readonly TvShow[] = [
  // (the news: a man's even reading, nothing under it)
  { f0: 122, syl: [0.1, 0.17], word: [1, 3], phrase: [5, 10], gap: [0.04, 0.09], pause: [0.35, 0.7], voice: 1, bed: 'none', bedGain: 0, pad: [], padGain: 0, gain: 0.615 },
  // (the weather: a woman's brighter voice over a soft chord)
  { f0: 205, syl: [0.09, 0.15], word: [1, 3], phrase: [4, 8], gap: [0.04, 0.08], pause: [0.4, 0.8], voice: 1, bed: 'none', bedGain: 0, pad: [262, 330, 392], padGain: 0.05, gain: 0.352 },
  // (the ball game: the announcer quick and rising over the crowd's swell, a cheer now and then)
  { f0: 138, syl: [0.08, 0.13], word: [1, 3], phrase: [6, 12], gap: [0.03, 0.07], pause: [0.3, 0.9], voice: 0.8, bed: 'crowd', bedGain: 0.32, pad: [], padGain: 0, gain: 0.334 },
  // (the cooking: the cook talking over what's sizzling, a spit now and then)
  { f0: 176, syl: [0.1, 0.16], word: [1, 3], phrase: [4, 9], gap: [0.04, 0.1], pause: [0.5, 1.1], voice: 0.85, bed: 'sizzle', bedGain: 0.14, pad: [], padGain: 0, gain: 0.58 },
  // (the sea: the narrator slow and low, long pauses, the waves' wash and a drone under him)
  { f0: 104, syl: [0.14, 0.24], word: [1, 3], phrase: [3, 7], gap: [0.06, 0.12], pause: [0.8, 1.6], voice: 0.8, bed: 'sea', bedGain: 0.36, pad: [110, 165], padGain: 0.04, gain: 0.355 },
]
/** the vowels' two bands (Hz): a, i, u, e, o */
const VOWELS: readonly [number, number][] = [[730, 1090], [300, 2200], [330, 900], [530, 1800], [560, 860]]
const rnd = (a: number, b: number) => a + Math.random() * (b - a)
const rndInt = (a: number, b: number) => Math.floor(rnd(a, b + 1))
/**
 * While the television's on, what's on it heard low across the room (TV_SOUND): made the first time it's tuned on, its syllables written onto
 * the context's clock a little ahead as it plays (all at once in a context of a probe's own, `at`, offline, to measure how loud it comes out,
 * over `seconds`), its loudness eased to each channel's (or to nothing, off), all let go by `stop` (the room gone down from).
 */
export function tvMurmur(at?: BaseAudioContext, seconds = 0) {
  type Made = { a: BaseAudioContext; osc: OscillatorNode; f1: BiquadFilterNode; f2: BiquadFilterNode; env: GainNode; breath: GainNode; bed: BiquadFilterNode
    bedGain: GainNode; swell: OscillatorNode; pads: OscillatorNode[]; padGain: GainNode; vol: GainNode; srcs: AudioScheduledSourceNode[]
    all: AudioNode[]; next: number; phraseLeft: number; wordLeft: number; base: number; timer: number }
  let made: Made | null = null
  /** the channel it's sounding (null: quiet, or not made: no context running yet, or let go) */
  let cur: number | null = null
  const show = () => TV_SOUND[(((cur ?? 0) % TV_SOUND.length) + TV_SOUND.length) % TV_SOUND.length]
  /** the voice's and the bed's beats written onto the clock up to `until` (the context's seconds) */
  const plan = (m: Made, until: number) => {
    const p = show()
    while (m.next < until) {
      const t = m.next
      if (m.phraseLeft <= 0) {
        // (a phrase: its words, its pitch starting a little high; after its last word, a pause)
        m.phraseLeft = rndInt(p.phrase[0], p.phrase[1])
        m.base = p.f0 * rnd(1.04, 1.12)
      }
      if (m.wordLeft <= 0) m.wordLeft = rndInt(p.word[0], p.word[1])
      const dur = rnd(p.syl[0], p.syl[1]), v = VOWELS[rndInt(0, VOWELS.length - 1)]
      // (the pitch falling through the phrase, a little up or down each syllable)
      const f0 = m.base * rnd(0.95, 1.05)
      m.base *= rnd(0.975, 0.995)
      m.osc.frequency.setTargetAtTime(f0, t, 0.02)
      m.f1.frequency.setTargetAtTime(v[0], t, 0.018)
      m.f2.frequency.setTargetAtTime(v[1], t, 0.018)
      // (the syllable: up quickly, held, down; a consonant's breath at its start, some of the time)
      m.env.gain.setTargetAtTime(p.voice * rnd(0.75, 1), t, 0.012)
      m.env.gain.setTargetAtTime(0, t + dur * 0.72, 0.022)
      if (Math.random() < 0.55) { m.breath.gain.setTargetAtTime(0.5, t, 0.004); m.breath.gain.setTargetAtTime(0.04, t + 0.035, 0.01) }
      m.wordLeft -= 1
      let after = dur
      if (m.wordLeft <= 0) { m.phraseLeft -= 1; after += m.phraseLeft <= 0 ? rnd(p.pause[0], p.pause[1]) : rnd(p.gap[0], p.gap[1]) }
      // (the crowd's cheer, the sizzle's spit, now and then)
      if (p.bed === 'crowd' && Math.random() < 0.035) { m.bedGain.gain.setTargetAtTime(p.bedGain * 2.4, t, 0.25); m.bedGain.gain.setTargetAtTime(p.bedGain, t + rnd(1.2, 2.4), 0.6) }
      if (p.bed === 'sizzle' && Math.random() < 0.3) { m.bedGain.gain.setTargetAtTime(p.bedGain * 3, t + dur * 0.5, 0.003); m.bedGain.gain.setTargetAtTime(p.bedGain, t + dur * 0.5 + 0.03, 0.02) }
      m.next = t + after
    }
  }
  const make = (): Made | null => {
    const a = at ?? ctx()
    if (!a) return null
    const hiss = loopBuffer(a, 'tvHiss', 2, (d) => { for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1 })
    // (the voice: a buzz at its pitch and a breath, through the two vowel bands, the syllables' envelope over them)
    const osc = a.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 130
    const buzz = a.createGain(); buzz.gain.value = 0.55
    const air = a.createBufferSource(); air.buffer = hiss; air.loop = true
    const airBand = a.createBiquadFilter(); airBand.type = 'bandpass'; airBand.frequency.value = 2500; airBand.Q.value = 1.1
    const breath = a.createGain(); breath.gain.value = 0.04
    const f1 = a.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 600; f1.Q.value = 5
    const f2 = a.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1400; f2.Q.value = 7
    const f2Gain = a.createGain(); f2Gain.gain.value = 0.7
    const env = a.createGain(); env.gain.value = 0
    // (heard across the room: the highs dulled)
    const room = a.createBiquadFilter(); room.type = 'lowpass'; room.frequency.value = 2600; room.Q.value = 0.5
    const vol = a.createGain(); vol.gain.value = 0
    osc.connect(buzz); air.connect(airBand).connect(breath)
    buzz.connect(f1); buzz.connect(f2); breath.connect(f1); breath.connect(f2)
    f1.connect(env); f2.connect(f2Gain).connect(env)
    env.connect(room)
    // (the bed: a hiss through its own filter, swelling slowly)
    const bedSrc = a.createBufferSource(); bedSrc.buffer = hiss; bedSrc.loop = true
    const bed = a.createBiquadFilter()
    const bedSwell = a.createGain(); bedSwell.gain.value = 0.75
    const swell = a.createOscillator(); swell.frequency.value = 0.1
    const swellAmt = a.createGain(); swellAmt.gain.value = 0.25
    swell.connect(swellAmt).connect(bedSwell.gain)
    const bedGain = a.createGain(); bedGain.gain.value = 0
    bedSrc.connect(bed).connect(bedSwell).connect(bedGain).connect(room)
    // (the music under it: a soft chord or a drone)
    const padGain = a.createGain(); padGain.gain.value = 0
    const pads = [0, 1, 2].map(() => { const o = a.createOscillator(); o.type = 'triangle'; o.frequency.value = 220; o.connect(padGain); return o })
    padGain.connect(room)
    room.connect(vol).connect(a.destination)
    const srcs: AudioScheduledSourceNode[] = [osc, air, bedSrc, swell, ...pads]
    for (const n of srcs) n.start()
    return { a, osc, f1, f2, env, breath, bed, bedGain, swell, pads, padGain, vol, srcs, next: a.currentTime + 0.05, phraseLeft: 0, wordLeft: 0, base: 130, timer: 0,
      all: [osc, buzz, air, airBand, breath, f1, f2, f2Gain, env, room, vol, bedSrc, bed, bedSwell, swell, swellAmt, bedGain, padGain, ...pads] }
  }
  /** the show's bed and music set for the channel just tuned to, and its voice begun afresh */
  const dress = (m: Made) => {
    const p = show(), t = m.a.currentTime
    if (p.bed === 'crowd') { m.bed.type = 'bandpass'; m.bed.frequency.setValueAtTime(700, t); m.bed.Q.setValueAtTime(0.6, t); m.swell.frequency.setValueAtTime(0.13, t) }
    else if (p.bed === 'sizzle') { m.bed.type = 'highpass'; m.bed.frequency.setValueAtTime(3600, t); m.bed.Q.setValueAtTime(0.7, t); m.swell.frequency.setValueAtTime(0.4, t) }
    else { m.bed.type = 'lowpass'; m.bed.frequency.setValueAtTime(380, t); m.bed.Q.setValueAtTime(0.6, t); m.swell.frequency.setValueAtTime(0.08, t) }
    m.bedGain.gain.setTargetAtTime(p.bed === 'none' ? 0 : p.bedGain, t, 0.2)
    m.pads.forEach((o, i) => o.frequency.setValueAtTime(p.pad[i] ?? p.pad[0] ?? 220, t))
    m.padGain.gain.setTargetAtTime(p.pad.length ? p.padGain : 0, t, 0.3)
    m.phraseLeft = 0; m.wordLeft = 0; m.next = Math.max(m.next, t + 0.25)
  }
  return {
    /** the channel it's sounding just now (null: quiet, not made, or let go): its owner tunes it again whenever this isn't what it wants
     * (a context not running yet, or it let go by a remount's cleanup, are made good the next frame, not missed) */
    get channel() { return made ? cur : null },
    /** to a channel (its number), or off (null) */
    tune(ch: number | null) {
      if (ch === null) {
        if (made) made.vol.gain.setTargetAtTime(0, made.a.currentTime, 0.06)
        cur = null
        return
      }
      made ??= make()
      if (!made) return
      const m = made
      cur = ch
      dress(m)
      m.vol.gain.setTargetAtTime(show().gain, m.a.currentTime, 0.15)
      // (its beats written ahead as it plays; offline, all of them at once)
      if (at && seconds > 0) plan(m, seconds)
      else {
        if (!m.timer) m.timer = window.setInterval(() => { if (made === m && cur !== null) plan(m, m.a.currentTime + 0.6) }, 120)
        plan(m, m.a.currentTime + 0.6)
      }
    },
    stop() {
      if (!made) return
      const m = made
      made = null
      cur = null
      if (m.timer) window.clearInterval(m.timer)
      const t = m.a.currentTime
      m.vol.gain.setTargetAtTime(0, t, 0.05)
      // (once it's quiet and stopped, every node of it let go of the others: nothing of it left in the context)
      m.osc.onended = () => { for (const n of m.all) n.disconnect() }
      for (const n of m.srcs) n.stop(t + 0.3)
    },
  }
}

/** something put into a container in the storeroom as a delivery's put away (item 607): a potato, an onion, a tomato into its sack or crate,
 * a soft dull knock with the burlap's rustle over it, each its own pitch; a stick of binchotan into its sack, a dry woody clack (charcoal
 * rings a little); a few a second at most from one place */
export function putInSound(at: THREE.Vector3, kind: 'veg' | 'coal' = 'veg') {
  const a = ctx()
  const { near, pan } = heard(at)
  if (!a || near < 0.02 || !gate(`putin${at.x.toFixed(1)}${at.z.toFixed(1)}`, 70)) return
  const t = a.currentTime, coal = kind === 'coal', o = out(a, (coal ? 0.1 : 0.13) * near, pan)
  const k = noise(a, 0.05, (x) => (1 - x) ** 2.5, 0.3, { key: 'putin', ways: 4 })
  const f = a.createBiquadFilter()
  f.type = coal ? 'bandpass' : 'lowpass'
  f.frequency.value = coal ? 2200 : 700 + Math.random() * 300
  f.Q.value = coal ? 2 : 0.7
  k.connect(f).connect(o)
  k.start(t)
  ping(a, t, coal ? 900 + Math.random() * 250 : 120 + Math.random() * 50, coal ? 0.18 : 0.35, coal ? 0.05 : 0.07, o)
}

/**
 * An umbrella at the shop's door (item 623, part three): closed (a sweep of cloth falling, the runner's click as it goes), opened (a sweep up
 * and the canopy snapped taut, the runner's click), shaken (two wet flaps and a scatter of drops), put in the stand (its ferrule's knock on
 * the jar's floor, hollow, a rattle against the rim), taken out (a scrape up the rim and a softer knock). Where it's done, as heard there.
 */
export function umbrellaSound(at: THREE.Vector3, kind: 'close' | 'open' | 'shake' | 'in' | 'out') {
  const a = ctx()
  const { near, pan } = heard(at)
  if (!a || near < 0.02 || !gate(`umb${kind}${at.x.toFixed(1)}${at.z.toFixed(1)}`, 150)) return
  const t = a.currentTime
  if (kind === 'close' || kind === 'open') {
    const o = out(a, 0.1 * near, pan), up = kind === 'open'
    const k = noise(a, 0.3, (x) => (up ? Math.min(1, x * 3) * (1 - x) ** 0.5 : (1 - x) ** 1.6), 0.55, { key: up ? 'umbOpen' : 'umbClose', ways: 3 })
    const f = a.createBiquadFilter()
    f.type = 'bandpass'; f.Q.value = 0.8
    f.frequency.setValueAtTime(up ? 500 : 1700, t); f.frequency.linearRampToValueAtTime(up ? 1900 : 450, t + 0.3)
    k.connect(f).connect(o)
    k.start(t)
    ping(a, up ? t + 0.27 : t + 0.01, 2500 + Math.random() * 300, 0.22, 0.03, o, 'triangle')
    // (opened: the cloth snapped taut, a low thump of it)
    if (up) ping(a, t + 0.26, 150 + Math.random() * 30, 0.45, 0.11, o)
  } else if (kind === 'shake') {
    const o = out(a, 0.08 * near, pan)
    for (const dt of [0, 0.17]) {
      const k = noise(a, 0.08, (x) => (1 - x) ** 2, 0.35, { key: 'umbFlap', ways: 3 })
      const f = a.createBiquadFilter()
      f.type = 'lowpass'; f.frequency.value = 1300
      k.connect(f).connect(o)
      k.start(t + dt)
    }
    // (the drops thrown off it: little ticks, high, here and there over half a second)
    for (let i = 0; i < 7; i++) ping(a, t + 0.05 + Math.random() * 0.45, 3000 + Math.random() * 2500, 0.05 + Math.random() * 0.05, 0.015, o)
  } else if (kind === 'in') {
    const o = out(a, 0.14 * near, pan)
    // (the ferrule down on the jar's floor: hollow, the jar ringing a moment; then the shaft against the rim)
    ping(a, t, 380 + Math.random() * 40, 0.5, 0.16, o)
    ping(a, t, 960 + Math.random() * 80, 0.18, 0.09, o)
    ping(a, t + 0.09, 1500 + Math.random() * 200, 0.12, 0.05, o, 'triangle')
    const k = noise(a, 0.06, (x) => (1 - x) ** 2, 0.2, { key: 'umbRattle', ways: 3 })
    const f = a.createBiquadFilter()
    f.type = 'highpass'; f.frequency.value = 1800
    k.connect(f).connect(o)
    k.start(t + 0.08)
  } else {
    const o = out(a, 0.1 * near, pan)
    const k = noise(a, 0.2, (x) => Math.sin(Math.PI * x), 0.3, { key: 'umbScrape', ways: 3 })
    const f = a.createBiquadFilter()
    f.type = 'bandpass'; f.Q.value = 2
    f.frequency.setValueAtTime(900, t); f.frequency.linearRampToValueAtTime(1700, t + 0.2)
    k.connect(f).connect(o)
    k.start(t)
    ping(a, t + 0.2, 520 + Math.random() * 60, 0.2, 0.08, o)
  }
}

/** a raincoat taken off or put on (item 623, part three): its nylon rustling, crumpled about, a few seconds' worth in under a second */
export function coatSound(at: THREE.Vector3) {
  const a = ctx()
  const { near, pan } = heard(at)
  if (!a || near < 0.02 || !gate(`coat${at.x.toFixed(1)}${at.z.toFixed(1)}`, 300)) return
  const t = a.currentTime, o = out(a, 0.07 * near, pan)
  const k = noise(a, 0.6, (x) => (0.4 + 0.6 * Math.abs(Math.sin(x * 23))) * Math.sin(Math.PI * x) ** 0.5, 0.15, { key: 'coatRustle', ways: 3 })
  const f = a.createBiquadFilter()
  f.type = 'bandpass'; f.frequency.value = 2800; f.Q.value = 0.7
  k.connect(f).connect(o)
  k.start(t)
}

/**
 * The rain heard from inside while it rains (item 623, game/weather): on the roof and the windows, a soft hiss (a loop of noise, low-passed:
 * muffled through the walls) and now and then a drop ticking over it (a loop of sparse clicks, high-passed); fuller and brighter with the
 * way in's door open, a little more up under the roof. `set(k, open, up)` each frame (k how hard it's raining, 0..1; only a change worth
 * hearing is sent on), `stop()` to let it go. `at` a context of its own to make it in (a probe's offline one), else the game's.
 */
export function rainAmbience(at?: BaseAudioContext) {
  let made: { a: BaseAudioContext; vol: GainNode; lp: BiquadFilterNode; tick: GainNode; srcs: AudioBufferSourceNode[]; all: AudioNode[] } | null = null
  let sent = { k: -1, open: -1, up: -1 }
  const make = () => {
    const a = at ?? ctx()
    if (!a) return null
    // (the hiss: noise a little smoothed (softer than white), its loop's ends faded into each other)
    const hissB = loopBuffer(a, 'rainHiss', 3, (h) => {
      const n = h.length
      let last = 0
      for (let i = 0; i < n; i++) { last = last * 0.55 + (Math.random() * 2 - 1) * 0.45; h[i] = last }
      for (let i = 0; i < 2000; i++) { const w = i / 2000; h[i] = h[i] * w + h[n - 2000 + i] * (1 - w) }
    })
    // (the drops: seventy short clicks over four seconds, each its own loudness)
    const tickB = loopBuffer(a, 'rainTicks', 4, (d) => {
      const m = d.length
      for (let k = 0; k < 70; k++) {
        const s = Math.floor(Math.random() * (m - 200)), g = 0.3 + 0.7 * Math.random()
        for (let i = 0; i < 160; i++) d[s + i] += (Math.random() * 2 - 1) * g * Math.exp(-i / 22)
      }
    })
    const hiss = a.createBufferSource(), ticks = a.createBufferSource()
    hiss.buffer = hissB; hiss.loop = true
    ticks.buffer = tickB; ticks.loop = true
    const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.5
    const hp = a.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2200
    const tick = a.createGain(); tick.gain.value = 0.5
    const vol = a.createGain(); vol.gain.value = 0
    hiss.connect(lp).connect(vol)
    ticks.connect(hp).connect(tick).connect(vol)
    vol.connect(a.destination)
    hiss.start(); ticks.start()
    return { a, vol, lp, tick, srcs: [hiss, ticks], all: [hiss, ticks, lp, hp, tick, vol] as AudioNode[] }
  }
  return {
    /** (dev, probes) whether it's made */
    get live() { return made !== null },
    set(k: number, open = 0, up = 0) {
      if (Math.abs(k - sent.k) < 0.02 && Math.abs(open - sent.open) < 0.05 && Math.abs(up - sent.up) < 0.05) return
      if (k < 0.01 && !made) return
      made ??= make()
      if (!made) return
      sent = { k, open, up }
      const t = made.a.currentTime
      made.vol.gain.setTargetAtTime(0.12 * k * (1 + 0.4 * open + 0.4 * up), t, 0.4)
      made.lp.frequency.setTargetAtTime(900 + 1400 * open, t, 0.2)
      made.tick.gain.setTargetAtTime(0.35 + 0.5 * open, t, 0.2)
    },
    stop() {
      if (!made) return
      const m = made
      made = null
      sent = { k: -1, open: -1, up: -1 }
      m.vol.gain.setTargetAtTime(0, m.a.currentTime, 0.1)
      m.srcs[0].onended = () => { for (const x of m.all) x.disconnect() }
      for (const s of m.srcs) s.stop(m.a.currentTime + 0.6)
    },
  }
}
