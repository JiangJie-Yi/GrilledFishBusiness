import type * as THREE from 'three'
import { GLTFLoader } from 'three-stdlib'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'
import { compressedFormats } from './quality'

/**
 * Models whose pictures are KTX2 (Basis Universal, item 571: scripts/ktx2-models.mjs, in the build) read with a KTX2 loader: one for every
 * GLTFLoader drei makes (useGLTF has no way to give one for all; each model's own call would need it), handed to it as it parses. The
 * transcoder (public/basis, three's own) is fetched only when the first such picture is. Which compressed format the card takes comes from
 * scene/quality's one look at it (models are preloaded before the renderer's made); a card that takes none (software GL) gets the pictures
 * as plain RGBA, never a model that won't load.
 */
/**
 * A compressed picture's levels let go of in JS once they're on the graphics card (the Tester window's soak, item 571: the KTX2 pictures,
 * 48 MB on the card, were as much again in the page's array buffers, 260 → 274 MB against 204 → 215, held by three's `mipmaps` for an upload
 * that never comes: a lost 3D view brings the whole page back (App's webglcontextrestored), it doesn't upload anew). Let go of, the picture
 * takes no further upload: a later `needsUpdate` (a setting changed after it's up) leaves the card's copy as it is, never an empty one.
 */
// (the picture three hands over as it's uploaded, not the one the handler was set on: GLTFLoader copies a picture for each sampler it's
// used with, and the copies carry the handler; set on the first, it let go of the first's levels as a copy went up, and 12 of the 85 never
// reached the card)
function letGo(t: THREE.Texture) {
  const c = t as THREE.CompressedTexture
  c.onUpdate = null
  c.mipmaps = (c.mipmaps as { data: ArrayBufferView; width: number; height: number }[]).map((m) => ({ ...m, data: new Uint8Array(0) })) as typeof c.mipmaps
  Object.defineProperty(c, 'needsUpdate', { configurable: true, set() { /* (its levels are gone: the card's copy stands) */ } })
}
function freeAfterUpload(t: THREE.CompressedTexture) {
  t.onUpdate = letGo
}

let shared: KTX2Loader | null = null
function ktx2(): KTX2Loader {
  if (shared) return shared
  const fs = compressedFormats()
  const loader = new KTX2Loader().setTranscoderPath(import.meta.env.BASE_URL + 'basis/')
  // (ASTC's profiles asked only for HDR pictures: none here)
  loader.detectSupport({ extensions: { has: (n: string) => fs.has(n), get: () => ({ getSupportedProfiles: () => [] }) } } as unknown as Parameters<KTX2Loader['detectSupport']>[0])
  // (each picture made: its levels let go of once it's up)
  const load = loader.load.bind(loader)
  loader.load = (url, onLoad, ...rest) => load(url, (t) => { if ((t as THREE.CompressedTexture).isCompressedTexture) freeAfterUpload(t as THREE.CompressedTexture); onLoad?.(t) }, ...rest)
  shared = loader
  return loader
}

const proto = GLTFLoader.prototype as unknown as { parse: (...a: unknown[]) => unknown; ktx2Loader: unknown; setKTX2Loader: (l: unknown) => unknown }
const parse = proto.parse
proto.parse = function (this: typeof proto, ...a: unknown[]) {
  if (!this.ktx2Loader && typeof document !== 'undefined') this.setKTX2Loader(ktx2())
  return parse.apply(this, a)
}
