import { sharedAudio } from '@/scene/interact/sfx'

/**
 * A stick of charcoal dropped on the heap: a dull, dry clatter, not a ring. A woody knock (noise through a mid band, gone in a few hundredths of
 * a second), a little rattle of smaller knocks after it as it settles against the others, a soft low thump under them. Several thrown at once
 * don't all sound: one in each little while.
 */
let coalAudio: AudioContext | null = null
let coalLast = 0
export function coalClink(strength: number) {
  try {
    const now = performance.now()
    if (now - coalLast < 45) return
    coalLast = now
    coalAudio ??= sharedAudio()
    const ac = coalAudio
    const t0 = ac.currentTime
    const out = ac.createGain()
    out.gain.value = 0.5 * strength
    out.connect(ac.destination)
    const knock = (t: number, gain: number, freq: number, len: number) => {
      const n = Math.max(1, Math.floor(ac.sampleRate * len))
      const buf = ac.createBuffer(1, n, ac.sampleRate)
      const ch = buf.getChannelData(0)
      for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * Math.exp(-i / (n * 0.18))
      const src = ac.createBufferSource()
      src.buffer = buf
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = freq
      bp.Q.value = 1.6
      const g = ac.createGain()
      g.gain.value = gain
      src.connect(bp).connect(g).connect(out)
      src.start(t)
    }
    // (the strike, then two or three smaller ones as it tips and settles)
    knock(t0, 1, 1100 + Math.random() * 500, 0.035)
    const rattles = 1 + Math.floor(Math.random() * 3 * strength)
    let t = t0
    for (let i = 0; i < rattles; i++) {
      t += 0.025 + Math.random() * 0.05
      knock(t, 0.35 + Math.random() * 0.3, 1400 + Math.random() * 900, 0.02)
    }
    // (the soft thump of its weight)
    const o = ac.createOscillator()
    const og = ac.createGain()
    o.frequency.setValueAtTime(170, t0)
    o.frequency.exponentialRampToValueAtTime(80, t0 + 0.05)
    og.gain.setValueAtTime(0.25, t0)
    og.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.06)
    o.connect(og).connect(out)
    o.start(t0)
    o.stop(t0 + 0.08)
  } catch { /* (no sound to be had) */ }
}
