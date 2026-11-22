// A phone draws the shop flat, in 2D (game/device; the owner's: the web is 3D, a phone 2D): nothing of the 3D shop is fetched on one. Every
// model and picture the 3D shop preloads as its modules load (useGLTF.preload, useLoader.preload) is let go by when the page opens on a phone
// (they were all fetched, 54 models, for a page that never drew them); should the window grow to a computer's size later, the 3D loads as it's
// drawn. Imported first of all (main.tsx), before any module that preloads.
import * as THREE from 'three'
import { useLoader } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { phoneDevice, showsFlat } from '@/game/device'

/** whether the browser says it's a phone: its own word where it gives one, else what it calls itself */
export const MOBILE = typeof navigator !== 'undefined'
  && phoneDevice(navigator.userAgent, (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData?.mobile)

/** a phone when the page opened: by its size or by its word */
export const FLAT_AT_START = typeof window !== 'undefined' && showsFlat({ width: window.innerWidth, height: window.innerHeight, mobile: MOBILE })

if (FLAT_AT_START) {
  useGLTF.preload = (() => {}) as typeof useGLTF.preload
  useLoader.preload = (() => {}) as typeof useLoader.preload
}

/** what waits for the 3D to be drawn (on a phone at the start: nothing else does), and whether it has been */
const waiting: (() => void)[] = []
let drawn = !FLAT_AT_START
/** the 3D view's been made (App's Canvas, as it's created): what was waiting for it goes now */
export function markDrawn() {
  if (drawn) return
  drawn = true
  for (const fn of waiting.splice(0)) fn()
}
/** `fn` now, or on a phone at the start once the 3D is drawn: what the 3D shop fetches or paints as its modules load (its pictures, its
 * signs' lettering) */
export function whenDrawn(fn: () => void) {
  if (drawn) fn(); else waiting.push(fn)
}
/**
 * A picture from public/textures made as a module loads (the cook table's woods, the walls' plaster and boards): loaded at once, as
 * TextureLoader does, or on a phone at the start only once the 3D is drawn (item 516: six of them, 1.5 MB, were fetched for the phone's card
 * all the same). Its settings are set on it as they'd be on TextureLoader's.
 */
export function shopPicture(file: string) {
  const t = new THREE.Texture()
  whenDrawn(() => new THREE.ImageLoader().load(import.meta.env.BASE_URL + 'textures/' + file, (img) => {
    t.image = img
    t.needsUpdate = true
  }))
  return t
}
