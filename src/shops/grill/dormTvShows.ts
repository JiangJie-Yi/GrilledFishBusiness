// What's on the television upstairs (items 612, 613): five channels drawn on the spot into the set's own small canvas (no pictures loaded,
// nobody's programme or mark copied: a newsroom, the weather map, a ball game from behind the pitcher, a cooking show grilling a fish, the
// sea's bottom), the picture coming on out of a line and going off into one, a moment's static as the channel's changed, its number in the
// corner a while. Plain canvas drawing (no React, no three): DormRoom puts it on the screen.

type G = CanvasRenderingContext2D
/** the canvas's size (the screen's 0.63 by 0.35 of the room's metres: 16 by 9 near enough) */
export const TV_W = 288
export const TV_H = 160
const W = TV_W, H = TV_H

/** each channel's name (the set's tag says it) and the colour its picture throws about it (the glow round the set) */
export const TV_SHOWS = [
  { zh: '新聞', glow: '#7fa6e8' },
  { zh: '天氣預報', glow: '#6fb3f0' },
  { zh: '棒球轉播', glow: '#8fd884' },
  { zh: '料理節目', glow: '#ffd29a' },
  { zh: '海洋紀錄片', glow: '#4aa6e8' },
] as const

/** how long the picture takes to come on out of a line, to go off into one, and how long a change of channel is static (s) */
export const TV_ON_S = 0.28
export const TV_OFF_S = 0.3
export const TV_STATIC_S = 0.32
/** how long the channel's number stays up in the corner (s) */
const OSD_S = 1.8

const dot = (g: G, x: number, y: number, r: number) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill() }
const oval = (g: G, x: number, y: number, rx: number, ry: number, rot = 0) => { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); g.fill() }
const wave = (t: number, f: number, seed = 0) => Math.sin(t * f + seed)

/** someone from the chest up, at `x` with the shoulders' line at `y`, `s` their head's measure: a coat, a collar, the face (its mouth open by
 * `talk`, 0 to 1; its eyes shut a moment by `blink`), the hair; `smile` a smile's curve for a mouth */
function bust(g: G, x: number, y: number, s: number, o: { coat: string; skin?: string; hair?: string; collar?: string; tie?: string; talk?: number; blink?: boolean; smile?: boolean }) {
  const skin = o.skin ?? '#f0c8a2'
  g.fillStyle = o.coat
  g.beginPath()
  g.moveTo(x - s * 1.05, y + s * 1.2)
  g.quadraticCurveTo(x - s * 1.0, y + s * 0.12, x - s * 0.38, y)
  g.lineTo(x + s * 0.38, y)
  g.quadraticCurveTo(x + s * 1.0, y + s * 0.12, x + s * 1.05, y + s * 1.2)
  g.closePath()
  g.fill()
  if (o.collar) {
    g.fillStyle = o.collar
    g.beginPath(); g.moveTo(x - s * 0.24, y); g.lineTo(x, y + s * 0.46); g.lineTo(x + s * 0.24, y); g.closePath(); g.fill()
  }
  if (o.tie) {
    g.fillStyle = o.tie
    g.beginPath(); g.moveTo(x, y + s * 0.06); g.lineTo(x + s * 0.07, y + s * 0.2); g.lineTo(x, y + s * 0.5); g.lineTo(x - s * 0.07, y + s * 0.2); g.closePath(); g.fill()
  }
  g.fillStyle = skin
  g.fillRect(x - s * 0.13, y - s * 0.2, s * 0.26, s * 0.24)
  dot(g, x, y - s * 0.55, s * 0.42)
  g.fillStyle = o.hair ?? '#2b2420'
  g.beginPath(); g.arc(x, y - s * 0.6, s * 0.45, Math.PI * 1.02, Math.PI * 1.98); g.closePath(); g.fill()
  g.fillStyle = '#2a2320'
  if (o.blink) { g.fillRect(x - s * 0.2, y - s * 0.53, s * 0.12, s * 0.025); g.fillRect(x + s * 0.08, y - s * 0.53, s * 0.12, s * 0.025) }
  else { dot(g, x - s * 0.15, y - s * 0.52, s * 0.05); dot(g, x + s * 0.15, y - s * 0.52, s * 0.05) }
  if (o.smile) {
    g.strokeStyle = '#7a3b34'; g.lineWidth = Math.max(1, s * 0.05)
    g.beginPath(); g.arc(x, y - s * 0.4, s * 0.12, Math.PI * 0.15, Math.PI * 0.85); g.stroke()
  } else {
    g.fillStyle = '#7a3b34'
    oval(g, x, y - s * 0.33, s * 0.09, s * (0.018 + 0.06 * (o.talk ?? 0)))
  }
}
/** a mouth's opening as someone talks: syllables, now and then a pause */
const talking = (t: number, seed = 0) => (wave(t, 1.3, seed) > -0.35 ? Math.max(0, wave(t, 11, seed)) : 0)
const blinking = (t: number, seed = 0) => (t + seed) % 3.4 < 0.12

// ---------------------------------------------------------------------------------------------------- the channels
/** 1 the news: the studio's blue, the anchor at the desk talking, a picture of the city beside, the strip under them, the ticker */
function news(g: G, t: number) {
  const bg = g.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#14264a'); bg.addColorStop(1, '#2d5189')
  g.fillStyle = bg; g.fillRect(0, 0, W, H)
  g.fillStyle = 'rgba(255,255,255,0.05)'
  for (let i = 0; i < 6; i++) g.fillRect(10 + i * 48, 0, 20, 122)
  // (the city at dusk in its box, panning slowly)
  const px = 166, py = 16, pw = 108, ph = 66
  const sky = g.createLinearGradient(0, py, 0, py + ph)
  sky.addColorStop(0, '#f3a861'); sky.addColorStop(1, '#6a5a8e')
  g.fillStyle = sky; g.fillRect(px, py, pw, ph)
  g.save()
  g.beginPath(); g.rect(px, py, pw, ph); g.clip()
  const pan = (t * 5) % 22
  for (let i = -1; i < 7; i++) {
    const bx = px + i * 22 - pan, bh = 16 + (((i * 7) % 5) + 5) % 5 * 8
    g.fillStyle = '#2a2d48'; g.fillRect(bx, py + ph - bh, 18, bh)
    g.fillStyle = 'rgba(255,214,140,0.8)'
    for (let wy = py + ph - bh + 4; wy < py + ph - 4; wy += 6) for (let wx = bx + 3; wx < bx + 15; wx += 5) if (((wx * 13 + wy * 7) | 0) % 3) g.fillRect(wx, wy, 2, 2)
  }
  g.restore()
  g.strokeStyle = '#d6e2f4'; g.lineWidth = 2; g.strokeRect(px, py, pw, ph)
  bust(g, 88, 92, 26, { coat: '#22314f', collar: '#f1f1f1', tie: '#c4373d', talk: talking(t), blink: blinking(t) })
  // (the desk)
  g.fillStyle = '#c5d3e7'; g.fillRect(18, 100, 150, 22)
  g.fillStyle = '#9fb2cf'; g.fillRect(18, 100, 150, 3)
  // (the strip under them: a red tab, lines of what's being said; the ticker running under it)
  g.fillStyle = '#f4f6fa'; g.fillRect(0, 122, W, 21)
  g.fillStyle = '#c8303a'; g.fillRect(0, 122, 42, 21)
  g.fillStyle = '#ffffff'; g.fillRect(9, 129, 24, 7)
  g.fillStyle = '#97a4b8'; g.fillRect(52, 127, 150, 5); g.fillRect(52, 135, 96, 4)
  g.fillStyle = '#0c1a33'; g.fillRect(0, 143, W, 17)
  g.fillStyle = '#e6eef9'
  const run = (t * 38) % 64
  for (let x = -run; x < W; x += 64) g.fillRect(x, 149, 40, 4)
  if (Math.floor(t * 1.4) % 2 === 0) { g.fillStyle = '#ff3d3d'; dot(g, 13, 11, 4) }
}

/** a sun, its rays turning */
function sun(g: G, x: number, y: number, r: number, t: number) {
  g.strokeStyle = '#ffd34d'; g.lineWidth = Math.max(1.5, r * 0.22)
  for (let i = 0; i < 8; i++) {
    const a = t * 0.8 + (i * Math.PI) / 4
    g.beginPath(); g.moveTo(x + Math.cos(a) * r * 1.25, y + Math.sin(a) * r * 1.25); g.lineTo(x + Math.cos(a) * r * 1.65, y + Math.sin(a) * r * 1.65); g.stroke()
  }
  g.fillStyle = '#ffcf3a'; dot(g, x, y, r)
}
/** a cloud, white or grey */
function cloud(g: G, x: number, y: number, r: number, c = '#ffffff') {
  g.fillStyle = c
  dot(g, x - r * 0.7, y + r * 0.15, r * 0.6); dot(g, x, y - r * 0.15, r * 0.8); dot(g, x + r * 0.75, y + r * 0.2, r * 0.55)
  g.fillRect(x - r * 0.7, y + r * 0.1, r * 1.45, r * 0.65)
}
/** a number in the picture, white edged dark */
function figure(g: G, s: string, x: number, y: number, px: number) {
  g.font = `bold ${px}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.lineWidth = 3; g.strokeStyle = 'rgba(10,30,60,0.85)'; g.strokeText(s, x, y)
  g.fillStyle = '#ffffff'; g.fillText(s, x, y)
}
/** 2 the weather: the sea's blue, the islands green, a sun, a cloud drifting, a rain cloud with its drops, the day's highs over each; the
 * forecaster at the side pointing; the week's along the bottom */
function weather(g: G, t: number) {
  const bg = g.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#4a8fd2'); bg.addColorStop(1, '#2a5f9f')
  g.fillStyle = bg; g.fillRect(0, 0, W, H)
  g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 1
  for (let x = 90; x < W; x += 36) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 132); g.stroke() }
  for (let y = 18; y < 132; y += 30) { g.beginPath(); g.moveTo(80, y); g.lineTo(W, y); g.stroke() }
  for (const [x, y, rx, ry, rot] of [[196, 66, 72, 20, -0.55], [128, 108, 34, 13, -0.3], [248, 30, 22, 11, -0.65]] as const) {
    g.fillStyle = '#d4eaa8'; oval(g, x, y, rx + 3, ry + 3, rot)
    g.fillStyle = '#76b866'; oval(g, x, y, rx, ry, rot)
  }
  sun(g, 172, 62, 10, t)
  figure(g, '24', 172, 86, 15)
  const drift = Math.sin(t * 0.5) * 6
  cloud(g, 226 + drift, 38, 12)
  figure(g, '19', 226 + drift, 60, 15)
  cloud(g, 118, 92, 11, '#c5ccd6')
  g.fillStyle = '#8fd0ff'
  for (let i = 0; i < 5; i++) { const fy = (t * 40 + i * 9) % 22; g.fillRect(108 + i * 5, 100 + fy, 2, 5) }
  figure(g, '16', 140, 120, 15)
  // (the forecaster, at the side, an arm out to the map)
  const reach = 0.35 + 0.2 * Math.sin(t * 0.7)
  g.strokeStyle = '#e8eef6'; g.lineWidth = 7; g.lineCap = 'round'
  g.beginPath(); g.moveTo(52, 104); g.lineTo(52 + Math.cos(-reach) * 34, 104 + Math.sin(-reach) * 34); g.stroke()
  g.lineCap = 'butt'
  bust(g, 40, 104, 22, { coat: '#e8eef6', collar: '#8aa6c8', hair: '#4a3022', talk: talking(t, 2), blink: blinking(t, 1.3) })
  g.fillStyle = 'rgba(8,24,52,0.72)'; g.fillRect(0, 134, W, 26)
  for (let i = 0; i < 5; i++) {
    const x = 34 + i * 56, kind = (i * 2 + 1) % 3
    if (kind === 0) sun(g, x, 147, 5, t)
    else cloud(g, x, 146, 6, kind === 1 ? '#ffffff' : '#c5ccd6')
  }
}

/** a player seen small: the body, the cap or helmet; `bat` the bat's angle (none: no bat) */
function player(g: G, x: number, y: number, s: number, body: string, cap: string, bat?: number) {
  g.fillStyle = body; g.fillRect(x - s * 0.35, y - s, s * 0.7, s)
  g.fillStyle = '#e9c39c'; dot(g, x, y - s * 1.2, s * 0.25)
  g.fillStyle = cap; g.beginPath(); g.arc(x, y - s * 1.24, s * 0.27, Math.PI, 0); g.fill()
  if (bat !== undefined) {
    g.strokeStyle = '#d9b47a'; g.lineWidth = Math.max(1.5, s * 0.14)
    g.beginPath(); g.moveTo(x + s * 0.2, y - s * 0.7); g.lineTo(x + s * 0.2 + Math.cos(bat) * s * 1.1, y - s * 0.7 + Math.sin(bat) * s * 1.1); g.stroke()
  }
}
/** 3 the ball game, from behind the pitcher: the grass in its stripes, the dirt about the plate, the batter, the catcher and the umpire; the
 * pitcher's wind-up and throw, the batter's swing, a hit flown out now and then; the score in the corner */
function baseball(g: G, t: number) {
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#56a64b' : '#4c9843'; g.fillRect(0, i * 20, W, 20) }
  g.fillStyle = '#b98a55'; oval(g, 144, 52, 74, 24)
  g.strokeStyle = '#ffffff'; g.lineWidth = 1.5
  g.strokeRect(118, 44, 16, 14); g.strokeRect(154, 44, 16, 14)
  g.fillStyle = '#ffffff'; g.fillRect(139, 54, 10, 4)
  g.fillStyle = '#1f2d4a'; player(g, 144, 40, 13, '#1f2d4a', '#111a2c')
  g.fillStyle = '#3b3b3b'; oval(g, 144, 48, 9, 6)
  const cycle = 4.4, k = t % cycle, round = Math.floor(t / cycle)
  const swing = k < 1.78 ? -2.3 : k < 1.98 ? -2.3 + ((k - 1.78) / 0.2) * 3.0 : 0.7
  player(g, 126, 56, 14, '#f2f2f2', '#c23434', swing)
  g.fillStyle = '#b98a55'; oval(g, 144, 150, 54, 14)
  // (the pitcher, his back to us: the arm wound up and over)
  const wind = k < 1.2 ? k / 1.2 : k < 1.5 ? 1 : Math.max(0, 1 - (k - 1.5) / 0.3)
  g.fillStyle = '#f4f4f4'; g.fillRect(126, 98, 36, 46)
  g.fillStyle = '#2a3a66'; g.font = 'bold 15px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('18', 144, 118)
  // (the back of his head: the cap over it, his hair under its edge, a bit of his neck)
  g.fillStyle = '#e9c39c'; g.fillRect(140, 94, 8, 5)
  g.fillStyle = '#2a2320'; dot(g, 144, 90, 10)
  g.fillStyle = '#1c2b52'; g.beginPath(); g.arc(144, 88, 11, Math.PI * 0.95, Math.PI * 0.05 + Math.PI * 2); g.fill()
  g.fillRect(133, 86, 22, 3)
  const a = -0.6 - wind * 2.2
  g.strokeStyle = '#f4f4f4'; g.lineWidth = 8; g.lineCap = 'round'
  g.beginPath(); g.moveTo(158, 104); g.lineTo(158 + Math.cos(a) * 24, 104 + Math.sin(a) * 24); g.stroke()
  g.lineCap = 'butt'
  // (the ball: thrown in to the plate, shrinking as it goes; one throw in three hit high out to the right)
  g.fillStyle = '#ffffff'
  if (k > 1.5 && k < 1.86) { const u = (k - 1.5) / 0.36; dot(g, 152 - u * 10, 96 - u * 46, 3.2 - u * 1.6) }
  else if (k >= 1.86 && round % 3 === 0 && k < 3.2) { const u = (k - 1.86) / 1.34; dot(g, 142 + u * 120, 50 - u * 60 + u * u * 20, 1.6 + u * 1.2) }
  // (the score: two sides, the inning, the count)
  g.fillStyle = 'rgba(8,16,28,0.78)'; g.fillRect(8, 8, 86, 34)
  g.fillStyle = '#d23c3c'; g.fillRect(13, 13, 9, 9)
  g.fillStyle = '#3c6fd2'; g.fillRect(13, 28, 9, 9)
  g.font = 'bold 12px sans-serif'; g.textAlign = 'left'; g.fillStyle = '#ffffff'
  g.fillText(String(2 + (round > 6 ? 1 : 0)), 28, 18); g.fillText('1', 28, 33)
  g.fillText('7', 52, 18)
  g.fillStyle = '#ffd24a'; g.beginPath(); g.moveTo(64, 21); g.lineTo(68, 14); g.lineTo(72, 21); g.closePath(); g.fill()
  for (let i = 0; i < 3; i++) { g.fillStyle = i < 1 + (round % 3) ? '#5fe06a' : 'rgba(255,255,255,0.25)'; dot(g, 54 + i * 8, 33, 2.5) }
  for (let i = 0; i < 2; i++) { g.fillStyle = i < (round % 2) + 1 ? '#ffd24a' : 'rgba(255,255,255,0.25)'; dot(g, 80 + i * 8, 33, 2.5) }
}

/** 4 the cooking show: the studio's kitchen, the cook in white behind the counter turning the fish over the coals, smoke going up from it;
 * a plate made up at the side */
function cooking(g: G, t: number) {
  g.fillStyle = '#f3e4c6'; g.fillRect(0, 0, W, H)
  g.strokeStyle = 'rgba(120,90,50,0.12)'; g.lineWidth = 1
  for (let x = 0; x < W; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 104); g.stroke() }
  for (let y = 8; y < 104; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke() }
  g.fillStyle = '#a57446'; g.fillRect(178, 34, 100, 5)
  for (const [x, c, h] of [[186, '#c94f3d', 14], [204, '#e8c35a', 18], [222, '#6c9a4a', 12], [240, '#8a5a3a', 16], [258, '#d97f3a', 13]] as const) {
    g.fillStyle = c; g.fillRect(x, 34 - h, 11, h)
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x + 2, 34 - h + 2, 2, h - 4)
  }
  // (the cook: white coat, a tall white hat, smiling, an arm going to the fish with the tongs)
  const turn = Math.sin(t * 1.6)
  g.strokeStyle = '#f7f7f7'; g.lineWidth = 9; g.lineCap = 'round'
  g.beginPath(); g.moveTo(114, 82); g.lineTo(150 + turn * 8, 100 - Math.abs(turn) * 6); g.stroke()
  g.strokeStyle = '#8f9499'; g.lineWidth = 2
  g.beginPath(); g.moveTo(150 + turn * 8, 100 - Math.abs(turn) * 6); g.lineTo(176 + turn * 10, 104); g.stroke()
  g.lineCap = 'butt'
  bust(g, 92, 80, 24, { coat: '#fafafa', collar: '#d9d9d9', hair: '#3a2a20', smile: true, blink: blinking(t, 0.7) })
  g.fillStyle = '#ffffff'
  g.fillRect(80, 34, 24, 18)
  dot(g, 84, 32, 8); dot(g, 92, 28, 9); dot(g, 100, 32, 8)
  // (the counter, and on it the coals' grill and the fish turning on it)
  g.fillStyle = '#b07a46'; g.fillRect(0, 104, W, 56)
  g.fillStyle = '#d39a5e'; g.fillRect(0, 104, W, 6)
  g.fillStyle = '#2b2b2e'; g.fillRect(150, 104, 104, 12)
  g.fillStyle = '#ff7a2e'
  for (let i = 0; i < 6; i++) g.fillRect(156 + i * 16, 112, 10, 3 + 2 * Math.max(0, wave(t, 6, i)))
  g.fillStyle = '#d89a52'; oval(g, 202, 100, 32, 9, -0.05)
  g.beginPath(); g.moveTo(232, 99); g.lineTo(246, 90); g.lineTo(246, 109); g.closePath(); g.fill()
  g.strokeStyle = '#6b3e1e'; g.lineWidth = 2
  for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(182 + i * 12, 94); g.lineTo(188 + i * 12, 106); g.stroke() }
  g.fillStyle = '#ffffff'; dot(g, 178, 98, 2.4)
  g.fillStyle = '#1a1a1a'; dot(g, 178, 98, 1.2)
  for (let i = 0; i < 7; i++) {
    const u = ((t * 0.5 + i / 7) % 1)
    g.fillStyle = `rgba(255,255,255,${(0.42 * (1 - u)).toFixed(3)})`
    dot(g, 196 + Math.sin(u * 6 + i) * 10 + i * 2, 92 - u * 70, 5 + u * 9)
  }
  // (a plate made up at the side: the fish's bed of leaves, a wedge of lemon)
  g.fillStyle = '#f4f4f0'; oval(g, 62, 138, 34, 10)
  g.fillStyle = '#5f9a48'; oval(g, 56, 136, 18, 5, 0.1)
  g.fillStyle = '#f2d43c'; g.beginPath(); g.moveTo(74, 134); g.arc(74, 134, 7, Math.PI * 0.1, Math.PI * 0.9); g.closePath(); g.fill()
}

/** 5 the sea's bottom: the deep blue, the light coming down in shafts, the weed swaying, a shoal going by, a big fish crossing slowly the
 * other way, bubbles going up */
function ocean(g: G, t: number) {
  const bg = g.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#2b90c4'); bg.addColorStop(1, '#06284c')
  g.fillStyle = bg; g.fillRect(0, 0, W, H)
  g.fillStyle = 'rgba(255,255,255,0.06)'
  for (let i = 0; i < 4; i++) {
    const x = 30 + i * 70 + Math.sin(t * 0.4 + i) * 10
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 22, 0); g.lineTo(x + 52, H); g.lineTo(x + 14, H); g.closePath(); g.fill()
  }
  // (the big fish, far off, slow, the other way)
  const bx = W + 70 - ((t * 11) % (W + 160))
  g.fillStyle = '#3e6f93'; oval(g, bx, 44, 34, 11)
  g.beginPath(); g.moveTo(bx + 30, 44); g.lineTo(bx + 50, 32); g.lineTo(bx + 48, 56); g.closePath(); g.fill()
  g.fillStyle = '#9fc4dc'; dot(g, bx - 22, 41, 2)
  // (the shoal, close, going by)
  for (let i = 0; i < 9; i++) {
    const x = ((t * 34 + i * 27) % (W + 60)) - 30, y = 76 + Math.sin(t * 2 + i) * 6 + (i % 3) * 11
    g.fillStyle = i % 2 ? '#f2c94c' : '#f29b4c'
    oval(g, x, y, 7, 3.4)
    g.beginPath(); g.moveTo(x - 6, y); g.lineTo(x - 12, y - 4); g.lineTo(x - 12, y + 4); g.closePath(); g.fill()
    g.fillStyle = '#1a1a1a'; dot(g, x + 4, y - 0.8, 0.9)
  }
  g.fillStyle = '#c4aa7a'
  g.beginPath(); g.moveTo(0, H)
  for (let x = 0; x <= W; x += 16) g.lineTo(x, 148 + Math.sin(x * 0.05) * 3)
  g.lineTo(W, H); g.closePath(); g.fill()
  g.strokeStyle = '#2f8f5b'; g.lineWidth = 4; g.lineCap = 'round'
  for (let i = 0; i < 7; i++) {
    const x0 = 16 + i * 42
    g.beginPath(); g.moveTo(x0, 152)
    for (let s = 1; s <= 5; s++) g.lineTo(x0 + Math.sin(t * 1.3 + i + s * 0.6) * s * 2.2, 152 - s * 11)
    g.stroke()
  }
  g.lineCap = 'butt'
  g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1
  for (let i = 0; i < 8; i++) {
    const u = (t * 0.35 + i * 0.13) % 1
    g.beginPath(); g.arc(40 + i * 31 + Math.sin(u * 9 + i) * 3, H - u * H, 1.5 + u * 2, 0, Math.PI * 2); g.stroke()
  }
}

const SHOWS = [news, weather, baseball, cooking, ocean]

// ---------------------------------------------------------------------------------------------------- the set's own: off, static, the number
/** the screen off: near black, a faint sheen across it */
function dark(g: G) {
  g.fillStyle = '#0b0f17'; g.fillRect(0, 0, W, H)
  const s = g.createLinearGradient(0, 0, W, H)
  s.addColorStop(0, 'rgba(255,255,255,0)'); s.addColorStop(0.3, 'rgba(255,255,255,0.07)'); s.addColorStop(0.44, 'rgba(255,255,255,0)')
  g.fillStyle = s; g.fillRect(0, 0, W, H)
}
/** three frames of snow, made the first time it's wanted */
let snow: HTMLCanvasElement[] | null = null
function snowFrames() {
  if (snow) return snow
  snow = [0, 1, 2].map(() => {
    const c = document.createElement('canvas')
    c.width = 96; c.height = 54
    const x = c.getContext('2d')!, img = x.createImageData(96, 54)
    for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255 }
    x.putImageData(img, 0, 0)
    return c
  })
  return snow
}
function staticSnow(g: G, t: number) {
  const f = snowFrames()
  g.imageSmoothingEnabled = false
  g.drawImage(f[Math.floor(t * 30) % f.length], 0, 0, W, H)
  g.imageSmoothingEnabled = true
  g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(0, (t * 320) % H, W, 14)
}
/** the channel's number in the corner, green, edged dark */
function number(g: G, ch: number) {
  g.font = 'bold 30px monospace'; g.textAlign = 'right'; g.textBaseline = 'top'
  g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,0.8)'; g.strokeText(String(ch + 1), W - 12, 9)
  g.fillStyle = '#7dff8a'; g.fillText(String(ch + 1), W - 12, 9)
}
/** a channel's picture squeezed toward the middle's line (`k` 1: whole, toward 0: a line), white over it by `flash` */
function squeezed(g: G, ch: number, t: number, k: number, flash: number) {
  g.fillStyle = '#000000'; g.fillRect(0, 0, W, H)
  g.save()
  g.translate(0, H / 2); g.scale(1, Math.max(0.012, k)); g.translate(0, -H / 2)
  SHOWS[ch](g, t)
  if (flash > 0) { g.fillStyle = `rgba(255,255,255,${flash.toFixed(3)})`; g.fillRect(0, 0, W, H) }
  g.restore()
}

/** the set as it is: on or off, its channel, when it was last switched on or off and when its channel was last changed (s, the same clock
 * as `t`) */
export type TvPicture = { on: boolean; ch: number; onAt: number; offAt: number; chAt: number }
/** whether the picture's moving fast just now (coming on, going off, static): drawn every frame then, else a dozen times a second */
export const tvBusy = (tv: TvPicture, t: number) => (tv.on ? t - tv.onAt < TV_ON_S || t - tv.chAt < TV_STATIC_S : t - tv.offAt < TV_OFF_S)
/** the screen drawn as it is at `t` */
export function drawTv(g: G, tv: TvPicture, t: number) {
  const ch = ((tv.ch % SHOWS.length) + SHOWS.length) % SHOWS.length
  if (!tv.on) {
    const k = (t - tv.offAt) / TV_OFF_S
    if (k >= 1 || k < 0) { dark(g); return }
    // (going off: the picture squeezed into a bright line across, then the line drawn in to a point and gone)
    if (k < 0.6) { squeezed(g, ch, t, 1 - k / 0.6, (k / 0.6) * 0.8); return }
    g.fillStyle = '#000000'; g.fillRect(0, 0, W, H)
    const u = (k - 0.6) / 0.4, len = W * (1 - u) * 0.9 + 3
    g.fillStyle = `rgba(255,255,255,${(1 - u * 0.7).toFixed(3)})`
    g.fillRect(W / 2 - len / 2, H / 2 - 1.5, len, 3)
    return
  }
  const on = (t - tv.onAt) / TV_ON_S
  // (coming on: out of a bright line across to the whole picture, its white going off it)
  if (on < 1) { const e = 1 - (1 - on) ** 3; squeezed(g, ch, t, e, (1 - e) * 0.75); return }
  if (t - tv.chAt < TV_STATIC_S) staticSnow(g, t)
  else SHOWS[ch](g, t)
  if (Math.min(t - tv.chAt, t - tv.onAt) < OSD_S) number(g, ch)
}
