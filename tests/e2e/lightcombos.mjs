// The light switches kept in the browser, every way they may be (item 773, the owner's 「畫面全黑?」「還是一樣?」「壞了」: the stock room's bulb
// pulled off and kept so, and the whole shop came up black at every load, the console full of 「GL_INVALID_OPERATION: Mismatch between
// texture format and sampler type」; a clean browser, its switches as they start, never showed it). For each way in COMBOS: a fresh browser,
// the switches written into it before the page loads (jgs-lights-1), the shop loaded; then the overview's brightness, whether every light
// that casts shadows has its map, and every WebGL error the console printed. Any error, a light that casts without a map, or a picture far
// darker than the switches allow: exit code 1.
//   node tests/e2e/lightcombos.mjs [url]      (ONLY=<name> one of them; DARK=<brightness> the least taken as lit, default 60)
import { boot } from './shop.mjs'
import sharp from 'sharp'
import fs from 'node:fs'

const ON = { on: true, door: true, wc: { m: true, f: true }, store: true }
const COMBOS = {
  allOn: ON,
  allOff: { on: false, door: false, wc: { m: false, f: false }, store: false },
  roomOff: { ...ON, on: false },
  storeOff: { ...ON, store: false },
  doorOff: { ...ON, door: false },
  toiletsOff: { ...ON, wc: { m: false, f: false } },
}
const DARK = +(process.env.DARK ?? 60)
const url = process.argv[2]
fs.mkdirSync('shots', { recursive: true })
let bad = 0
for (const [name, lights] of Object.entries(COMBOS)) {
  if (process.env.ONLY && process.env.ONLY !== name) continue
  const errs = []
  const { browser, page } = await boot({ width: 1600, height: 900, ...(url ? { url } : {}), before: async (p) => {
    // (written once, before the app's first look at it: a reload of the page keeps what the game itself then sets)
    await p.addInitScript((v) => { try { if (!sessionStorage.getItem('lights-seeded')) { localStorage.setItem('jgs-lights-1', v); sessionStorage.setItem('lights-seeded', '1') } } catch { /* (none) */ } }, JSON.stringify(lights))
    p.on('console', (m) => { const t = m.text(); if (/GL_INVALID|Mismatch between|too many errors/i.test(t)) errs.push(t.slice(0, 160)) })
  } })
  await page.waitForFunction(() => !!window.__scene, null, { timeout: 120000 })
  await page.waitForFunction(() => !document.querySelector('.loading-screen'), null, { timeout: 120000 })
  await page.waitForTimeout(5000)
  const seen = await page.evaluate(() => {
    const out = { kept: localStorage.getItem('jgs-lights-1'), noMap: [] }
    window.__scene.traverse((o) => { if (o.isLight && o.castShadow && !o.shadow.map) out.noMap.push(`${o.type} ${o.intensity.toFixed(2)}`) })
    return out
  })
  const shot = `shots/lightcombos-${name}.png`
  await page.screenshot({ path: shot })
  const { data, info } = await sharp(shot).extract({ left: 400, top: 200, width: 800, height: 500 }).raw().toBuffer({ resolveWithObject: true })
  let sum = 0
  for (let j = 0; j < data.length; j += info.channels) sum += (data[j] + data[j + 1] + data[j + 2]) / 3
  const lit = sum / (data.length / info.channels)
  const ok = errs.length === 0 && seen.noMap.length === 0 && lit >= DARK
  if (!ok) bad++
  console.log(`${ok ? '✓' : '✗'} ${name.padEnd(10)} brightness ${lit.toFixed(1).padStart(5)}  GL errors ${String(errs.length).padStart(3)}  lights without a map ${seen.noMap.length}${seen.noMap.length ? ` (${seen.noMap.join(', ')})` : ''}${errs.length ? `\n    ${errs[0]}` : ''}`)
  await browser.close()
}
console.log(bad ? `${bad} failed` : 'all passed')
process.exit(bad ? 1 : 0)
