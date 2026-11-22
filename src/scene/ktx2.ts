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
let shared: KTX2Loader | null = null
function ktx2(): KTX2Loader {
  if (shared) return shared
  const fs = compressedFormats()
  const loader = new KTX2Loader().setTranscoderPath(import.meta.env.BASE_URL + 'basis/')
  // (ASTC's profiles asked only for HDR pictures: none here)
  loader.detectSupport({ extensions: { has: (n: string) => fs.has(n), get: () => ({ getSupportedProfiles: () => [] }) } } as unknown as Parameters<KTX2Loader['detectSupport']>[0])
  shared = loader
  return loader
}

const proto = GLTFLoader.prototype as unknown as { parse: (...a: unknown[]) => unknown; ktx2Loader: unknown; setKTX2Loader: (l: unknown) => unknown }
const parse = proto.parse
proto.parse = function (this: typeof proto, ...a: unknown[]) {
  if (!this.ktx2Loader && typeof document !== 'undefined') this.setKTX2Loader(ktx2())
  return parse.apply(this, a)
}
