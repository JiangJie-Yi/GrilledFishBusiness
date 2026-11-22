// The models' pictures turned into KTX2 (Basis Universal), so the graphics card holds them compressed (item 571, the owner's go-ahead to
// download the encoder): a 1024 picture is 5.3 MB on the card as RGBA with its mipmaps and 1.3 MB compressed (BC7 on a PC, ASTC or ETC2 on
// a phone or a Mac: the transcoder in public/basis picks), and on medium and low a quarter of that again (scene/textureCap leaves out its top
// levels). Every picture ETC1S, the normal maps in its normal-map mode at the top quality (UASTC kept their bumps a hair finer but made the
// file five times the WebP: the stone steps 874 KB to 2.3 MB; ETC1S 866 KB, and the same close up in the game).
//
//   node scripts/ktx2-models.mjs --dist                       the build's step (package.json's build): the models in KTX2_MODELS, in dist/
//   node scripts/ktx2-models.mjs <model.glb…> [--out <dir>]   any model, copies to --out (public/models-ktx2 by default), to look at first
//
// public/models (the Blender scripts' output) is never written: the build converts its copies in dist/. Only the models listed: a model
// whose pictures the game reads back (scene/atlasMerge for the figures and a dish's pots, the cats' coats, faces, the ware's glazes, the
// rice sacks' print…) can't have them compressed. Before adding one, search the code for where it's loaded and whether anything there
// draws its pictures (drawImage, getImageData, .image), and look at it close up in the game (tests/e2e/_ktx2shot.mjs, outside git).
import { writeFile, mkdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { NodeIO, VertexLayout } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { ktx2 } from 'ktx2-encoder/gltf-transform'
import sharp from 'sharp'

/** the models whose pictures go to KTX2 in the build, and why each is safe; `only` / `skip`: the pictures (by name) taken or left */
export const KTX2_MODELS = [
  // (the way in's stone steps: GuestBar3D's pavingOf only takes its map and normal map into its own material)
  { file: 'stonesteps.glb' },
  // (the shrine: its two atlas pages (item 574, stage B) and Ebisu's baked pictures, none read back; the Origin window's word)
  { file: 'kamidana.glb' },
  // (the fish and the grill's large pictures only: the fire pit's ground is read back (Roasting's scorchEarth) and the seasoning ledge's
  // pots' small ones packed into an atlas (ledgeCopy: 512 and under))
  { file: 'grilledfish.glb', only: /^T_(Fish_N|\w+_Salted|GrillNet|Robuchi|RobuchiBurnt|LedgeCedar)$/ },
  // (all but the sacks' cloth, which KitchenStores dyes and prints on (dyeBurlap, printSack))
  { file: 'produce.glb', skip: /^(ProduceSack|CharcoalSack)/ },
  // (the genkan's floor and rug (GuestBar3D), the sink (Sink.tsx), the room upstairs (DormRoom.tsx), the straw-wrapped sake barrels
  // (DiningRoom's, beside the rice sacks: those are read, ricesacks.glb, not on this list): none read back)
  { file: 'genkanfloor.glb' },
  { file: 'sink.glb' },
  { file: 'dorm.glb' },
  { file: 'komodaru.glb' },
]

const args = process.argv.slice(2)
const value = (name, d) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : d }
const DIST = args.includes('--dist')
const QUALITY = +value('--quality', '128')
const taken = new Set(['--out', '--quality'].flatMap((n) => { const i = args.indexOf(n); return i >= 0 ? [i, i + 1] : [] }))
let files = args.filter((a, i) => !a.startsWith('--') && !taken.has(i))
const OUT = DIST ? null : resolve(value('--out', 'public/models-ktx2'))
if (DIST) {
  // (the build's base: vite.config's, GrilledFishBusiness/ under dist when it's given one)
  const dir = ['dist/models', 'dist/GrilledFishBusiness/models'].find((d) => existsSync(d))
  if (!dir) { console.error('ktx2-models: no dist/models: run after vite build'); process.exit(1) }
  files = KTX2_MODELS.map((m) => join(dir, m.file)).filter((f) => existsSync(f))
}
if (!files.length) { console.error('ktx2-models: no models given'); process.exit(1) }

// (each attribute in its own buffer view, as Blender writes them: written interleaved (glTF-Transform's default), three makes them
// InterleavedBufferAttributes, which the game's own merging and ink outlines can't write into: the shop never came up, item 367, and again
// here on the first try)
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).setVertexLayout(VertexLayout.SEPARATE)
const imageDecoder = async (buf) => {
  const { data, info } = await sharp(Buffer.from(buf)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return { width: info.width, height: info.height, data: new Uint8Array(data.buffer, data.byteOffset, data.byteLength) }
}
// (the encoder's own progress lines on stdout, every slice of every picture: kept off the build's log)
const write = process.stdout.write.bind(process.stdout)
const quiet = (fn) => async (...a) => { process.stdout.write = () => true; try { return await fn(...a) } finally { process.stdout.write = write } }

if (OUT) await mkdir(OUT, { recursive: true })
const kb = (n) => `${(n / 1024).toFixed(0)} KB`
for (const file of files) {
  const t0 = Date.now()
  const size0 = (await stat(file)).size
  const doc = await io.read(file)
  // (the pictures left as they are given a type the encoder passes over while it runs, and their own back after)
  const rule = KTX2_MODELS.find((m) => m.file === basename(file)) ?? {}
  const kept = doc.getRoot().listTextures().filter((t) => (rule.only && !rule.only.test(t.getName())) || (rule.skip && rule.skip.test(t.getName())))
  const mimes = new Map(kept.map((t) => [t, t.getMimeType()]))
  for (const t of kept) t.setMimeType('image/x-kept')
  await quiet(() => doc.transform(
    ktx2({ slots: /normalTexture/, isUASTC: false, isNormalMap: true, qualityLevel: 255, generateMipmap: true, imageDecoder }),
    ktx2({ isUASTC: false, qualityLevel: QUALITY, generateMipmap: true, isSetKTX2SRGBTransferFunc: true, imageDecoder }),
  ))()
  for (const [t, m] of mimes) t.setMimeType(m)
  const out = OUT ? join(OUT, basename(file)) : file
  await writeFile(out, await io.writeBinary(doc))
  const left = doc.getRoot().listTextures().filter((t) => t.getMimeType() !== 'image/ktx2').length
  console.log(`ktx2-models: ${basename(file)} ${kb(size0)} → ${kb((await stat(out)).size)}, ${doc.getRoot().listTextures().length - left} pictures to KTX2${left ? `, ${left} left as they were` : ''} (${((Date.now() - t0) / 1000).toFixed(1)} s)`)
}
