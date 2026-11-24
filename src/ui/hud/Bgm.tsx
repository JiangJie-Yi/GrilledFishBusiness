import { memo, useEffect, useRef } from 'react'
import { getBgmOff, useBgmOff } from '@/ui/kit/bgmStore'
import { sfxMuted, useSfxMuted } from '@/scene/sfx'

/**
 * The shop's background music, looped quietly, from public/music/ (LateNightTavern.mp3, the owner's; it was IzakayaNight.mp3; failing that,
 * the other names it might have been saved as, in turn); with none there, there's no music. It starts off; the speaker on the wall switches it on and off (bgmStore).
 */
const NAMES = ['LateNightTavern.mp3', 'IzakayaNight.mp3', 'izakaya-night.mp3', '居酒屋の夜.mp3', 'izakaya-night.m4a', 'izakaya-night.ogg', 'izakaya-night.wav', 'bgm.mp3']
/** how loud it plays */
const VOLUME = 0.35
const SRCS = NAMES.map((n) => import.meta.env.BASE_URL + 'music/' + encodeURIComponent(n))

// (item 374: drawn again only as its own props change; it was with every redraw of the page, 3.3 a second)
export const Bgm = memo(function Bgm() {
  const audio = useRef<HTMLAudioElement | null>(null)
  const start = useRef<(() => void) | null>(null)
  // (the clock's mute silences the music too (the owner's): the speaker's own switch left as it was, it plays again unmuted)
  const bgmOff = useBgmOff(), muted = useSfxMuted()
  const off = bgmOff || muted
  useEffect(() => {
    const a = new Audio()
    a.loop = true
    a.volume = VOLUME
    let i = 0
    // (a file that isn't there (or can't be played) hands over to the next name on the list)
    const next = () => {
      if (i >= SRCS.length) return
      a.src = SRCS[i++]
      a.load()
      if (!getBgmOff() && !sfxMuted()) a.play().catch(() => {})
    }
    a.addEventListener('error', next)
    // (the file fetched only once it's first switched on: it begins off, and fetched at once it was 4.8 MB of every page's first load, a
    // phone's card page too, for music most never turned on)
    start.current = () => { if (i === 0) next() }
    audio.current = a
    return () => { a.removeEventListener('error', next); a.pause(); audio.current = null; start.current = null }
  }, [])
  // (switched on by a click on the speaker, which is the touch the browser wants before it lets sound start)
  useEffect(() => {
    const a = audio.current
    if (!a) return
    if (off) { a.pause(); return }
    if (!a.src) { start.current?.(); return }
    a.play().catch(() => {})
  }, [off])
  return null
})
