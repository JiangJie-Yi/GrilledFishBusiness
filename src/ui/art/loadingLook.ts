// The loading veil's look (item 798), one and the same before the app's code has come and after: vite.config.ts (bootLook) writes the page's
// first placeholder (index.html's #boot) from these, with src/styles/loading.css put in its head, and ui/screens/LoadingScreen draws them
// again once the app's here, so the one takes the other's place unseen. Plain strings and numbers (no React, no DOM): Node reads them too.
import { FISH_EMBLEM } from './fishEmblem.ts'

/**
 * The noren's middle panel: the way in's own (shops/grill/guestbar/decorTex's crestNorenTexture), in its dark brown (the panel's
 * `color`): the crest, a rounded diamond in a heavy line with a fine one inside it and the shop's first character in a rounded square in
 * that; under it the name in small spaced capitals, the dot between them drawn (not a typed sign), each word stretched to its place
 * (textLength) whatever serif the machine has.
 */
export const NOREN_CREST = '<svg class="loading-crest" viewBox="0 0 120 108" aria-hidden="true">'
  + '<g fill="none" stroke="currentColor">'
  + '<rect x="35.96" y="21.96" width="48.08" height="48.08" rx="6.5" transform="rotate(45 60 46)" stroke-width="3.2"/>'
  + '<rect x="39.5" y="25.5" width="41" height="41" rx="5" transform="rotate(45 60 46)" stroke-width="0.9"/>'
  + '<rect x="46.5" y="32.5" width="27" height="27" rx="4.5" stroke-width="1.7"/>'
  + '</g>'
  + '<text class="loading-crest-mark" x="60" y="46.5">聞</text>'
  + '<text class="loading-crest-name" x="17.6" y="94" textLength="28" lengthAdjust="spacing">KIKUNO</text>'
  + '<circle cx="51" cy="92" r="0.95" fill="currentColor"/>'
  + '<text class="loading-crest-name" x="56.4" y="94" textLength="46" lengthAdjust="spacing">YAKIZAKANA</text>'
  + '</svg>'

/** the embers going up from the grill below: three sheets of them, each its own speed (loading.css .loading-embers) */
export const EMBER_SHEETS = 3

/**
 * The page's first placeholder (index.html's #boot, inside #root till the app's drawn there): the veil as it stands before anything's
 * counted, the embers, the noren and the fish on the coals as the app has them, the bar's glow going to and fro (it can't know how far), and
 * a word and a button that come up when nothing's come for a while (index.html's own script).
 */
export function bootMarkup(): string {
  return '<div class="loading-embers" aria-hidden="true">' + '<i></i>'.repeat(EMBER_SHEETS) + '</div>'
    + '<div class="loading-noren" aria-hidden="true"><span></span><span>' + NOREN_CREST + '</span><span></span></div>'
    + '<div class="loading-stage">'
    + '<div class="fish-emblem-wrap">' + FISH_EMBLEM + '</div>'
    + '<div class="loading-board"><h1>聞野</h1><small>日式烤魚</small><div class="loading-bar"><i></i></div><p><span>開店準備中…</span></p></div>'
    + '<div class="loading-stuck"><p>載入好像卡住了</p>'
    + '<button type="button" onclick="location.replace(location.pathname + \'?v=\' + Date.now())">重新載入</button></div>'
    + '</div>'
}
