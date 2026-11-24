import { useEffect, useLayoutEffect, useState } from 'react'
import { showsFlat } from '@/game/system/device'
import { MOBILE } from '@/scene/render/flatGate'
import { skyAt, themeOf, type Sky } from '@/game/world/clock'
import { getClock } from '@/ui/kit/clockStore'

export function usePrefersReducedMotion() {
  const query = '(prefers-reduced-motion: reduce)'
  const [reduced, setReduced] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}
/**
 * A phone, by its size or by its word (game/device's showsFlat; the owner's): no 3D at all, none of its models downloaded (scene/flatGate), a
 * card saying the game isn't open on phones yet (PhoneClosed; the flat 2D version for phones was taken out, item 188); anything else, a
 * computer or a tablet, is the web page in full 3D, its full models only.
 */
export function usePhone() {
  const read = () => showsFlat({ width: window.innerWidth, height: window.innerHeight, mobile: MOBILE })
  const [phone, setPhone] = useState(read)
  useEffect(() => {
    const onResize = () => setPhone(read())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return phone
}
export function useSky(): [Sky, (s: Sky) => void] {
  // (the part of the day on the game's clock (the owner's: day and night come round with the time, dawn and dusk between them): a new game's
  // ten in the morning, a page brought back after its 3D view was lost the time it was); on the page as its look (data-theme: dark by night
  // only) and as the light outside (data-sky: the round window's view and paper, its shaft of light, follow it)
  const [sky, setSky] = useState<Sky>(() => skyAt(getClock().minute))
  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.theme = themeOf(sky)
    root.dataset.sky = sky
  }, [sky])
  return [sky, setSky]
}
