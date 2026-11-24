import { nameOver } from '@/shops/grill/bar'
import { canvasTex, handFinger, artTex, seal } from './base'

/** the pictures on the wall, each drawn here (no outside pictures): prints in frames and hanging scrolls */
const ART = {
  // Fuji under a red sun, bands of cloud across it
  fuji: artTex('print', 256, 180, (g) => {
    const sky = g.createLinearGradient(0, 0, 0, 180)
    sky.addColorStop(0, '#e8c99a')
    sky.addColorStop(1, '#f3e6c8')
    g.fillStyle = sky
    g.fillRect(0, 0, 256, 180)
    g.fillStyle = '#c8402c'
    g.beginPath(); g.arc(196, 46, 22, 0, Math.PI * 2); g.fill()
    g.fillStyle = '#34507a'
    g.beginPath(); g.moveTo(10, 180); g.lineTo(112, 52); g.lineTo(144, 52); g.lineTo(246, 180); g.fill()
    g.fillStyle = '#f6f2ea'
    g.beginPath(); g.moveTo(112, 52); g.lineTo(144, 52); g.lineTo(166, 80)
    for (let k = 0; k < 6; k++) g.lineTo(160 - k * 11, k % 2 ? 92 : 80)
    g.lineTo(90, 80); g.fill()
    g.fillStyle = 'rgba(255,250,240,0.85)'
    for (const [x, y, w] of [[20, 120, 90], [150, 136, 80], [60, 150, 120]]) g.fillRect(x, y, w, 7)
    seal(g, 14, 14, 16)
  }),
  // a great wave curling over, its crest breaking into claws of foam
  wave: artTex('print', 256, 180, (g) => {
    g.fillStyle = '#efe2c4'
    g.fillRect(0, 0, 256, 180)
    g.fillStyle = '#25406a'
    g.beginPath(); g.moveTo(0, 180); g.bezierCurveTo(30, 60, 150, 10, 200, 60); g.bezierCurveTo(170, 50, 140, 70, 150, 100)
    g.bezierCurveTo(170, 130, 230, 150, 256, 140); g.lineTo(256, 180); g.fill()
    g.strokeStyle = '#f6f2ea'
    g.lineWidth = 3
    for (let k = 0; k < 7; k++) {
      g.beginPath(); g.arc(70 + k * 20, 48 + Math.abs(k - 3) * 8, 7, Math.PI, Math.PI * 1.9); g.stroke()
    }
    for (let k = 0; k < 5; k++) {
      g.beginPath(); g.moveTo(10 + k * 30, 170); g.bezierCurveTo(30 + k * 30, 120, 70 + k * 25, 100, 90 + k * 25, 110); g.stroke()
    }
    g.fillStyle = '#34507a'
    g.beginPath(); g.moveTo(170, 140); g.lineTo(186, 116); g.lineTo(202, 140); g.fill()
    seal(g, 226, 14, 16)
  }),
  // two koi, red and white, in dark water, rings spreading
  // (the koi, painted richer (the owner: the pictures' quality raised): deep water lit from above, two kohaku and a yamabuki gold one
  // gliding round each other, each with its fins, its scales catching the light and its own patches; lotus pads floating, rings spreading)
  koi: artTex('print', 256, 180, (g) => {
    const wat = g.createRadialGradient(150, 70, 10, 128, 90, 190)
    wat.addColorStop(0, '#2c5a66'); wat.addColorStop(0.55, '#173a46'); wat.addColorStop(1, '#0b1f28')
    g.fillStyle = wat
    g.fillRect(0, 0, 256, 180)
    // (light through the water: soft wavering bands)
    g.globalAlpha = 0.12
    g.strokeStyle = '#bfe6ee'
    g.lineWidth = 1.2
    for (let k = 0; k < 14; k++) {
      g.beginPath()
      for (let x = 0; x <= 256; x += 8) g.lineTo(x, 12 + k * 12 + Math.sin(x * 0.06 + k) * 3)
      g.stroke()
    }
    g.globalAlpha = 1
    // (rings spreading where something touched the surface)
    g.strokeStyle = 'rgba(205,235,242,0.32)'
    g.lineWidth = 0.9
    for (const [x, y] of [[62, 46], [204, 140]]) for (let r = 6; r < 40; r += 8) { g.beginPath(); g.ellipse(x, y, r, r * 0.8, 0, 0, Math.PI * 2); g.stroke() }
    const fish = (x: number, y: number, a: number, body: string, patch: string | null, len = 40) => {
      g.save(); g.translate(x, y); g.rotate(a)
      const w = len * 0.3
      // (its shadow on the water below)
      g.fillStyle = 'rgba(0,0,0,0.25)'
      g.beginPath(); g.ellipse(4, 6, len * 0.55, w * 0.6, 0, 0, Math.PI * 2); g.fill()
      // (the fins: a pair either side behind the head, the tail fanned)
      g.fillStyle = 'rgba(250,244,230,0.75)'
      for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(len * 0.22, sd * w * 0.5); g.quadraticCurveTo(len * 0.12, sd * w * 1.5, len * 0.02, sd * w * 1.2); g.lineTo(len * 0.14, sd * w * 0.4); g.fill() }
      g.beginPath(); g.moveTo(-len * 0.42, 0); g.quadraticCurveTo(-len * 0.62, -w * 1.2, -len * 0.75, -w * 1.1); g.quadraticCurveTo(-len * 0.66, 0, -len * 0.75, w * 1.1)
      g.quadraticCurveTo(-len * 0.62, w * 1.2, -len * 0.42, 0); g.fill()
      // (the body: full at the shoulders, narrowing to the tail)
      g.fillStyle = body
      g.beginPath(); g.moveTo(len * 0.5, 0)
      g.bezierCurveTo(len * 0.45, -w, len * 0.05, -w * 1.05, -len * 0.45, -w * 0.25)
      g.lineTo(-len * 0.45, w * 0.25)
      g.bezierCurveTo(len * 0.05, w * 1.05, len * 0.45, w, len * 0.5, 0)
      g.fill()
      g.save(); g.clip()
      if (patch) {
        g.fillStyle = patch
        g.beginPath(); g.ellipse(len * 0.22, -w * 0.2, len * 0.18, w * 0.75, 0.2, 0, Math.PI * 2); g.fill()
        g.beginPath(); g.ellipse(-len * 0.12, w * 0.25, len * 0.15, w * 0.6, -0.2, 0, Math.PI * 2); g.fill()
      }
      // (scales: rows of little arcs catching the light)
      g.strokeStyle = 'rgba(255,255,255,0.28)'
      g.lineWidth = 0.6
      for (let sx = -len * 0.35; sx < len * 0.35; sx += 3.2) for (let sy = -w; sy < w; sy += 3) { g.beginPath(); g.arc(sx + ((sy / 3) % 2) * 1.6, sy, 1.6, -1.1, 1.1); g.stroke() }
      // (the back's sheen)
      const sh = g.createLinearGradient(0, -w, 0, w)
      sh.addColorStop(0, 'rgba(255,255,255,0.35)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.15)')
      g.fillStyle = sh; g.fillRect(-len, -w, len * 2, w * 2)
      g.restore()
      // (its eye)
      g.fillStyle = '#1a1210'
      g.beginPath(); g.arc(len * 0.36, -w * 0.32, 1.1, 0, Math.PI * 2); g.fill()
      g.restore()
    }
    fish(112, 74, 0.45, '#f6f0e4', '#d43a22', 44)
    fish(160, 118, -2.5, '#f2ebdd', '#e2542a', 40)
    fish(70, 120, -0.9, '#e8b83a', null, 34)
    // (lotus pads afloat, one in bud)
    const pad = (x: number, y: number, r: number, a: number) => {
      g.save(); g.translate(x, y); g.rotate(a)
      g.fillStyle = '#3f7a3a'
      g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, r, 0.25, Math.PI * 2 - 0.05); g.closePath(); g.fill()
      g.strokeStyle = 'rgba(160,210,120,0.6)'; g.lineWidth = 0.7
      for (let k = 0; k < 7; k++) { const t = 0.3 + k * 0.85; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(t) * r * 0.9, Math.sin(t) * r * 0.9); g.stroke() }
      g.restore()
    }
    pad(214, 40, 16, 0.3)
    pad(30, 158, 13, 2.1)
    pad(232, 70, 9, 4)
    g.fillStyle = '#f0a8b8'
    g.beginPath(); g.ellipse(206, 52, 3.6, 5.5, 0.2, 0, Math.PI * 2); g.fill()
    seal(g, 14, 150, 16)
  }),
  // calligraphy: 一期一會 brushed down the paper
  calligraphy: artTex('scroll', 96, 256, (g) => {
    g.fillStyle = '#f4ead4'
    g.fillRect(0, 0, 96, 256)
    g.fillStyle = '#1a120c'
    g.font = 'bold 46px "Zen Antique", "Noto Serif TC", serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    ;['一', '期', '一', '會'].forEach((ch, i) => g.fillText(ch, 48, 34 + i * 50))
    seal(g, 56, 226, 18)
  }),
  // a branch of plum in blossom, in ink with pink flowers
  plum: artTex('scroll', 96, 256, (g) => {
    g.fillStyle = '#f4ead4'
    g.fillRect(0, 0, 96, 256)
    g.strokeStyle = '#2a1d16'
    g.lineCap = 'round'
    g.lineWidth = 5
    g.beginPath(); g.moveTo(10, 250); g.bezierCurveTo(40, 190, 20, 140, 60, 90); g.stroke()
    g.lineWidth = 3
    g.beginPath(); g.moveTo(32, 170); g.bezierCurveTo(60, 160, 70, 140, 84, 128); g.stroke()
    g.beginPath(); g.moveTo(60, 90); g.lineTo(76, 40); g.stroke()
    g.fillStyle = '#e48a9a'
    for (const [x, y] of [[60, 90], [76, 40], [84, 128], [50, 120], [66, 150], [40, 196], [70, 66]]) {
      for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x + Math.cos(k * 1.26) * 4, y + Math.sin(k * 1.26) * 4, 3.4, 0, Math.PI * 2); g.fill() }
    }
    seal(g, 8, 12, 14)
  }),
  // ---- ukiyo-e, as a woodblock print has them: flat colours, a bokashi graded across the sky, a black key line, a title cartouche, the seal
  // a red Fuji in the clear south wind: the cone in rust red streaked with snow, dark forest at its foot, a blue sky with rows of mackerel cloud
  akaFuji: artTex('print', 512, 360, (g) => {
    const sky = g.createLinearGradient(0, 0, 0, 360)
    sky.addColorStop(0, '#1c3c78'); sky.addColorStop(0.45, '#5a86b8'); sky.addColorStop(0.7, '#d8e2e0'); sky.addColorStop(1, '#efe4c8')
    g.fillStyle = sky; g.fillRect(0, 0, 512, 360)
    g.fillStyle = 'rgba(250,248,240,0.9)'
    for (let row = 0; row < 4; row++) for (let k = 0; k < 18; k++) { g.beginPath(); g.ellipse(30 + k * 28 + (row % 2) * 14, 40 + row * 16 + Math.sin(k) * 3, 9, 3.5, 0, 0, Math.PI * 2); g.fill() }
    const red = g.createLinearGradient(0, 100, 0, 330)
    red.addColorStop(0, '#6a1a0e'); red.addColorStop(0.5, '#b0361e'); red.addColorStop(1, '#d4603a')
    g.fillStyle = red
    g.beginPath(); g.moveTo(40, 330); g.bezierCurveTo(150, 250, 210, 140, 236, 110); g.lineTo(276, 108); g.bezierCurveTo(300, 140, 370, 250, 480, 330); g.closePath(); g.fill()
    g.fillStyle = '#f4f0e6'
    g.beginPath(); g.moveTo(236, 110); g.lineTo(276, 108); g.lineTo(286, 124)
    for (let k = 0; k < 7; k++) g.lineTo(282 - k * 7, 132 + (k % 2) * 26)
    g.lineTo(228, 128); g.closePath(); g.fill()
    g.strokeStyle = 'rgba(244,240,230,0.85)'; g.lineWidth = 2
    for (const [x, y, l] of [[250, 140, 40], [262, 150, 52], [238, 150, 34], [274, 160, 30]]) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + (x - 256) * 0.3, y + l); g.stroke() }
    g.fillStyle = '#1e3a24'
    g.beginPath(); g.moveTo(0, 360); g.lineTo(0, 318)
    for (let x = 0; x <= 512; x += 10) g.lineTo(x, 318 + Math.sin(x / 9) * 6 - (x > 120 && x < 400 ? 8 : 0))
    g.lineTo(512, 360); g.closePath(); g.fill()
    g.strokeStyle = '#1a1210'; g.lineWidth = 2.2
    g.beginPath(); g.moveTo(40, 330); g.bezierCurveTo(150, 250, 210, 140, 236, 110); g.lineTo(276, 108); g.bezierCurveTo(300, 140, 370, 250, 480, 330); g.stroke()
    g.fillStyle = '#efe6cc'; g.fillRect(420, 14, 30, 92); g.strokeStyle = '#1a1210'; g.lineWidth = 1.2; g.strokeRect(420, 14, 30, 92)
    g.fillStyle = '#1a1210'; g.font = '700 20px "Zen Antique", serif'; g.textAlign = 'center'
    ;['凱', '風', '快', '晴'].forEach((c, k) => g.fillText(c, 435, 36 + k * 21))
    seal(g, 464, 24, 24)
  }),
  // rain on a great bridge: driving lines of rain over all, a dark sky graded down, people under umbrellas hurrying across, the far bank in grey
  rainBridge: artTex('print', 512, 360, (g) => {
    const sky = g.createLinearGradient(0, 0, 0, 360)
    sky.addColorStop(0, '#1a1c20'); sky.addColorStop(0.3, '#5a6066'); sky.addColorStop(0.6, '#c8cabe'); sky.addColorStop(1, '#6a8a9a')
    g.fillStyle = sky; g.fillRect(0, 0, 512, 360)
    g.fillStyle = 'rgba(70,80,84,0.7)'
    g.beginPath(); g.moveTo(0, 200); for (let x = 0; x <= 512; x += 16) g.lineTo(x, 196 - Math.sin(x / 40) * 6 - (x > 300 ? 10 : 0)); g.lineTo(512, 220); g.lineTo(0, 220); g.fill()
    g.fillStyle = '#4a7a8a'; g.fillRect(0, 220, 512, 140)
    g.fillStyle = '#8a6a44'
    g.beginPath(); g.moveTo(-10, 300); g.quadraticCurveTo(260, 200, 530, 250); g.lineTo(530, 270); g.quadraticCurveTo(260, 222, -10, 322); g.closePath(); g.fill()
    g.strokeStyle = '#3a2814'; g.lineWidth = 3
    for (let x = 20; x < 512; x += 46) { const y = 300 - (x / 512) * 60; g.beginPath(); g.moveTo(x, y + 6); g.lineTo(x + 4, 360); g.stroke() }
    g.lineWidth = 1.6; g.beginPath(); g.moveTo(-10, 300); g.quadraticCurveTo(260, 200, 530, 250); g.stroke()
    for (const [x, c] of [[150, '#2a3a5a'], [210, '#6a2a1a'], [300, '#2a4a3a'], [340, '#3a3020']] as [number, string][]) {
      const y = 300 - (x / 512) * 60 - 22
      g.fillStyle = c; g.beginPath(); g.moveTo(x - 6, y + 22); g.lineTo(x, y + 4); g.lineTo(x + 6, y + 22); g.fill()
      g.fillStyle = '#d8c89a'; g.beginPath(); g.moveTo(x - 16, y + 4); g.quadraticCurveTo(x, y - 12, x + 16, y + 4); g.closePath(); g.fill()
      g.strokeStyle = '#1a1210'; g.lineWidth = 1; g.stroke()
    }
    g.strokeStyle = 'rgba(30,30,34,0.55)'; g.lineWidth = 0.9
    for (let k = 0; k < 220; k++) { const x = (k * 53) % 560 - 20, y = (k * 97) % 380 - 20; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 9, y + 40); g.stroke() }
    g.fillStyle = '#efe6cc'; g.fillRect(452, 14, 28, 96); g.strokeStyle = '#1a1210'; g.strokeRect(452, 14, 28, 96)
    g.fillStyle = '#1a1210'; g.font = '700 19px "Zen Antique", serif'; g.textAlign = 'center'
    ;['大', '橋', '夕', '立'].forEach((c, k) => g.fillText(c, 466, 36 + k * 22))
    seal(g, 418, 20, 24)
  }),
  // a kabuki actor's head and shoulders (yakusha-e): a white face with red kumadori lines, the brows drawn up, eyes crossed in a glare, a black
  // topknot wig, a robe of bold checks, on a dark mica ground
  kabuki: artTex('scroll', 200, 476, (g) => {
    const bg = g.createLinearGradient(0, 0, 0, 476)
    bg.addColorStop(0, '#3a3438'); bg.addColorStop(1, '#5a5254')
    g.fillStyle = bg; g.fillRect(0, 0, 200, 476)
    g.fillStyle = 'rgba(220,210,200,0.08)'; for (let k = 0; k < 300; k++) g.fillRect((k * 37) % 200, (k * 71) % 476, 2, 2)
    g.fillStyle = '#2a1e18'; g.beginPath(); g.ellipse(100, 150, 62, 70, 0, Math.PI, 0); g.fill()
    g.beginPath(); g.ellipse(100, 80, 26, 18, 0, 0, Math.PI * 2); g.fill()
    g.fillStyle = '#f4eee2'; g.beginPath(); g.ellipse(100, 186, 50, 64, 0, 0, Math.PI * 2); g.fill()
    g.strokeStyle = '#c4201a'; g.lineWidth = 4; g.lineCap = 'round'
    for (const sd of [-1, 1]) {
      g.beginPath(); g.moveTo(100 + sd * 10, 170); g.quadraticCurveTo(100 + sd * 34, 150, 100 + sd * 48, 132); g.stroke()
      g.beginPath(); g.moveTo(100 + sd * 22, 200); g.quadraticCurveTo(100 + sd * 40, 210, 100 + sd * 46, 236); g.stroke()
    }
    g.strokeStyle = '#1a1210'; g.lineWidth = 4
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(100 + sd * 8, 160); g.lineTo(100 + sd * 36, 146); g.stroke() }
    g.fillStyle = '#fff'; g.lineWidth = 1.5
    for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(100 + sd * 22, 176, 11, 6, sd * -0.2, 0, Math.PI * 2); g.fill(); g.stroke() }
    g.fillStyle = '#1a1210'; for (const sd of [-1, 1]) { g.beginPath(); g.arc(100 + sd * 22 - sd * 5, 176, 3.4, 0, Math.PI * 2); g.fill() }
    g.beginPath(); g.moveTo(100, 184); g.lineTo(94, 206); g.lineTo(102, 208); g.stroke()
    g.strokeStyle = '#8a1a14'; g.lineWidth = 3; g.beginPath(); g.moveTo(84, 226); g.quadraticCurveTo(100, 218, 116, 226); g.stroke()
    for (let row = 0; row < 8; row++) for (let col = 0; col < 6; col++) { g.fillStyle = (row + col) % 2 ? '#1c2a52' : '#d8b04a'; g.fillRect(16 + col * 28, 262 + row * 26, 28, 26) }
    g.fillStyle = '#f4eee2'; g.beginPath(); g.moveTo(70, 250); g.lineTo(100, 300); g.lineTo(130, 250); g.closePath(); g.fill()
    g.strokeStyle = '#1a1210'; g.lineWidth = 2; g.strokeRect(16, 262, 168, 208)
    g.fillStyle = '#d8c89a'; g.fillRect(150, 12, 36, 120); g.strokeStyle = '#1a1210'; g.lineWidth = 1; g.strokeRect(150, 12, 36, 120)
    g.fillStyle = '#1a1210'; g.font = '700 20px "Zen Antique", serif'; g.textAlign = 'center'
    ;['市', '川', '團', '十', '郎'].forEach((c, k) => g.fillText(c, 168, 34 + k * 22))
    seal(g, 14, 14, 26)
  }),
  // a beauty with a round fan (bijin-ga), drawn as an ukiyo-e print draws one (the owner's: a little finer; it was a few flat shapes): her
  // hair dressed in a shimada, its side locks puffed out fine, a tortoiseshell comb and gold pins with dangles, a red band at the knot's
  // root; a long pale face, high thin brows, slit eyes, a small red mouth; collars crossed red, white and navy; a navy kimono of flowing
  // water and plum blossoms over a red one dotted with tie-dye, a gold obi with its bow behind; a round fan with a goldfish on it in her
  // hand; mist bands across a pale mica ground; the title in its cartouche and a seal
  bijin: artTex('scroll', 200, 476, (g) => {
    const INK = '#1a1210'
    g.lineJoin = 'round'; g.lineCap = 'round'
    // ---- the ground, and pink mist bands (kasumi) across its top and foot
    const bg = g.createLinearGradient(0, 0, 0, 476)
    bg.addColorStop(0, '#f4ebd8'); bg.addColorStop(1, '#eadcc0')
    g.fillStyle = bg; g.fillRect(0, 0, 200, 476)
    const line = (w = 1.1, c = INK) => { g.lineWidth = w; g.strokeStyle = c }
    // (the mist, すやり霞 (the owner's, 2026-11-10: finer than the flat bars it was): long bands in three tiers stepping back from their open
    // end, each rounded at its ends, a pale rose deepening down it, a fine darker line round it all, flecks of gold leaf (砂子) in it)
    let seed = 23
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
    const kasumi = (x0: number, x1: number, y: number, h: number, open: 'l' | 'r') => {
      const len = x1 - x0, band = new Path2D()
      for (const [inset, dy] of [[0, 0], [len * 0.16, -h * 0.62], [len * 0.3, h * 0.6]]) {
        const l = len - inset
        band.roundRect(open === 'r' ? x0 : x0 + inset, y + dy - h / 2, l, h, h / 2)
      }
      g.save()
      line(1.5, 'rgba(172,110,96,0.6)'); g.stroke(band)
      const fill = g.createLinearGradient(0, y - h * 1.2, 0, y + h * 1.2)
      fill.addColorStop(0, '#f4ded2'); fill.addColorStop(1, '#e6bfb0')
      g.fillStyle = fill; g.fill(band)
      g.clip(band)
      for (let k = 0; k < len * 0.7; k++) {
        const s = 0.3 + rnd() * 0.9
        g.fillStyle = rnd() < 0.5 ? `rgba(206,166,82,${0.5 + rnd() * 0.4})` : `rgba(236,206,128,${0.5 + rnd() * 0.4})`
        g.fillRect(x0 + rnd() * len, y - h * 1.2 + rnd() * h * 2.4, s, s * (0.5 + rnd()))
      }
      g.restore()
    }
    kasumi(-20, 112, 20, 8, 'r')
    kasumi(42, 222, 40, 7.5, 'l')
    kasumi(-20, 92, 440, 8, 'r')
    kasumi(66, 222, 458, 7.5, 'l')
    // ---- her kimono: an S of a robe, swaying in at her waist and flaring to a hem trailing off to her right
    const robe = new Path2D()
    robe.moveTo(80, 176)
    robe.bezierCurveTo(62, 182, 54, 200, 52, 224)
    robe.bezierCurveTo(45, 270, 41, 322, 52, 380)
    robe.bezierCurveTo(50, 420, 38, 452, 26, 476)
    robe.lineTo(182, 476)
    robe.bezierCurveTo(168, 440, 152, 402, 148, 352)
    robe.bezierCurveTo(146, 300, 152, 240, 148, 208)
    robe.bezierCurveTo(144, 190, 132, 180, 120, 176)
    robe.closePath()
    // (her right arm's sleeve, on our left (she faces us; the owner's, 2026-11-10: the plectrum was in her left hand, the shamisen's body on
    // her left, her right arm nowhere): the upper arm out to the elbow, the forearm bent back in over the shamisen's body at her right hip, the
    // hand out of the sleeve's mouth with the plectrum; the long sleeve hanging from the forearm, its lining red at its foot)
    const sleeve = new Path2D()
    sleeve.moveTo(80, 188)
    sleeve.bezierCurveTo(58, 192, 38, 214, 28, 244)
    sleeve.bezierCurveTo(20, 274, 14, 312, 16, 342)
    sleeve.bezierCurveTo(18, 370, 28, 386, 46, 386)
    sleeve.bezierCurveTo(54, 386, 60, 380, 59, 368)
    sleeve.bezierCurveTo(58, 342, 54, 312, 48, 296)
    sleeve.lineTo(36.4, 288.8)
    sleeve.lineTo(51.6, 279.2)
    sleeve.bezierCurveTo(56, 262, 66, 236, 78, 214)
    sleeve.closePath()
    // (her left arm's, on our right, raised to the shamisen's neck: the upper arm out to the elbow, the forearm back up across her to the hand
    // round the neck, the sleeve hanging from it)
    const rsleeve = new Path2D()
    rsleeve.moveTo(120, 188)
    rsleeve.bezierCurveTo(142, 192, 162, 214, 170, 246)
    rsleeve.bezierCurveTo(178, 282, 184, 320, 182, 346)
    rsleeve.bezierCurveTo(180, 372, 166, 384, 150, 382)
    rsleeve.bezierCurveTo(138, 380, 132, 370, 132, 354)
    rsleeve.bezierCurveTo(132, 316, 131, 276, 131.4, 247.7)
    rsleeve.lineTo(140.6, 232.3)
    rsleeve.bezierCurveTo(146, 231, 150, 229, 152, 226)
    rsleeve.bezierCurveTo(144, 218, 132, 212, 124, 210)
    rsleeve.closePath()
    // (the folds where each arm bends: from the crook of the elbow down into the hanging sleeve, and one round the elbow's outside)
    const folds = (lines: number[][]) => {
      line(0.9, 'rgba(8,16,40,0.7)')
      for (const [a, b, c, d, e, f, h, k] of lines) { g.beginPath(); g.moveTo(a, b); g.bezierCurveTo(c, d, e, f, h, k); g.stroke() }
      line(0.6, 'rgba(176,206,236,0.35)')
      for (const [a, b, c, d, e, f, h, k] of lines) { g.beginPath(); g.moveTo(a + 1, b + 0.6); g.bezierCurveTo(c + 1, d + 0.6, e + 1, f + 0.6, h + 1, k + 0.6); g.stroke() }
    }
    const NAVY = '#203a6c'
    const kimono = (path: Path2D) => {
      g.fillStyle = NAVY; g.fill(path)
      g.save(); g.clip(path)
      // (flowing water, 観世水: long lines curling as they go, pale blue on the navy)
      line(1.3, 'rgba(176,206,236,0.6)')
      for (let y = 196, r = 0; y < 476; y += 17, r++) {
        g.beginPath()
        for (let x = 0; x <= 200; x += 4) {
          const yy = y + Math.sin(x / 14 + r * 1.7) * 4 + Math.sin(x / 37 + r) * 3
          if (x === 0) g.moveTo(x, yy); else g.lineTo(x, yy)
        }
        g.stroke()
      }
      g.restore()
    }
    // (the red under-kimono at the hem, dotted with tie-dye (kanoko), and the sleeves' red linings at their feet)
    const kanoko = (x0: number, y0: number, x1: number, y1: number) => {
      g.fillStyle = '#b8261c'; g.fillRect(x0, y0, x1 - x0, y1 - y0)
      g.fillStyle = 'rgba(250,236,220,0.85)'
      for (let y = y0 + 3, r = 0; y < y1; y += 5, r++) for (let x = x0 + (r % 2) * 2.5; x < x1; x += 5) { g.beginPath(); g.arc(x, y, 0.9, 0, Math.PI * 2); g.fill() }
    }
    kimono(robe)
    g.save(); g.clip(robe)
    kanoko(0, 452, 200, 476)
    // (plum blossoms scattered over it: five round petals, white, a pink heart)
    for (const [x, y, r] of [[70, 214, 5], [118, 230, 4.5], [86, 330, 5.5], [130, 360, 5], [66, 402, 6], [112, 420, 5], [96, 252, 4], [138, 312, 4.5]]) {
      g.fillStyle = '#fbf3ec'
      for (let q = 0; q < 5; q++) { const a = (q / 5) * Math.PI * 2 - Math.PI / 2; g.beginPath(); g.arc(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.48, 0, Math.PI * 2); g.fill() }
      g.fillStyle = '#e07a8a'; g.beginPath(); g.arc(x, y, r * 0.24, 0, Math.PI * 2); g.fill()
    }
    // (the obi: wide, gold, a lattice of hexagons (kikkō) in it, a red cord across)
    g.fillStyle = '#d9ac48'; g.fillRect(40, 262, 120, 42)
    line(0.8, 'rgba(120,70,20,0.55)')
    for (let y = 262, r = 0; y < 306; y += 9, r++) for (let x = 40 + (r % 2) * 7; x < 162; x += 14) {
      g.beginPath()
      for (let q = 0; q < 6; q++) { const a = (q / 6) * Math.PI * 2; const px = x + Math.cos(a) * 5.4, py = y + Math.sin(a) * 4.4; if (q === 0) g.moveTo(px, py); else g.lineTo(px, py) }
      g.closePath(); g.stroke()
    }
    g.fillStyle = '#c4201a'; g.fillRect(40, 281, 120, 3)
    line(1, INK); g.beginPath(); g.moveTo(40, 262); g.lineTo(160, 262); g.moveTo(40, 304); g.lineTo(160, 304); g.stroke()
    g.restore()
    line(); g.stroke(robe)
    // (the obi's bow behind her, its loops out past her right side)
    const bow = new Path2D()
    bow.moveTo(140, 266); bow.bezierCurveTo(152, 250, 166, 254, 164, 274); bow.bezierCurveTo(162, 292, 152, 298, 140, 294); bow.closePath()
    g.fillStyle = '#d9ac48'; g.fill(bow); line(); g.stroke(bow)
    line(0.8, 'rgba(120,70,20,0.6)'); g.beginPath(); g.moveTo(146, 272); g.quadraticCurveTo(156, 266, 160, 278); g.stroke()
    // ---- her left sleeve over the robe, its red lining at its foot
    kimono(rsleeve)
    g.save(); g.clip(rsleeve); kanoko(100, 354, 200, 390); g.restore()
    line(); g.stroke(rsleeve)
    g.save(); g.clip(rsleeve)
    folds([[154, 232, 160, 250, 162, 270, 158, 290], [148, 236, 150, 248, 148, 260, 145, 272], [170, 250, 174, 262, 176, 274, 176, 288]])
    g.restore()
    // ---- her neck, the collars crossed over it (left over right): red, white, then the robe's own navy
    g.fillStyle = '#faf4ea'
    g.beginPath(); g.moveTo(90, 148); g.lineTo(114, 148); g.lineTo(118, 196); g.lineTo(86, 196); g.closePath(); g.fill()
    for (const [w, c] of [[15, '#b8261c'], [10, '#f6efe4'], [5, '#16223f']] as [number, string][]) {
      line(w, c); g.lineCap = 'butt'
      g.beginPath(); g.moveTo(84, 172); g.quadraticCurveTo(92, 196, 102, 222); g.stroke()
      g.beginPath(); g.moveTo(120, 172); g.quadraticCurveTo(112, 196, 102, 222); g.stroke()
    }
    g.lineCap = 'round'
    // ---- her face: long and pale, a blush on her cheeks, the features fine
    const face = new Path2D()
    face.ellipse(103, 127, 21, 28, -0.08, 0, Math.PI * 2)
    g.fillStyle = '#faf5ec'; g.fill(face)
    const blush = g.createRadialGradient(94, 136, 0, 94, 136, 12)
    blush.addColorStop(0, 'rgba(236,150,150,0.28)'); blush.addColorStop(1, 'rgba(236,150,150,0)')
    g.fillStyle = blush; g.fillRect(80, 122, 28, 28)
    line(0.9); g.stroke(face)
    line(0.8)
    g.beginPath(); g.moveTo(88, 115); g.quadraticCurveTo(93, 112, 99, 114); g.moveTo(107, 114); g.quadraticCurveTo(113, 112, 118, 115); g.stroke()
    line(1.1)
    g.beginPath(); g.moveTo(89, 123); g.quadraticCurveTo(94, 121, 99, 123); g.moveTo(107, 123); g.quadraticCurveTo(112, 121, 117, 123); g.stroke()
    g.fillStyle = INK; g.beginPath(); g.ellipse(95, 123, 1.4, 0.9, 0, 0, Math.PI * 2); g.ellipse(111, 123, 1.4, 0.9, 0, 0, Math.PI * 2); g.fill()
    line(0.8); g.beginPath(); g.moveTo(103, 119); g.quadraticCurveTo(100, 132, 101, 137); g.quadraticCurveTo(103, 138.5, 105, 137); g.stroke()
    g.fillStyle = '#d0302a'; g.beginPath(); g.ellipse(103, 145, 3.6, 1.6, 0, 0, Math.PI * 2); g.fill()
    g.fillStyle = '#a01818'; g.beginPath(); g.ellipse(103, 146.2, 2.6, 0.9, 0, 0, Math.PI * 2); g.fill()
    // ---- her hair: the side locks puffed out, fine at their edges; the cap over her head to a hairline with a peak; the knot on top; the
    // nape's bun behind her neck on the right
    g.fillStyle = 'rgba(20,15,13,0.94)'
    g.beginPath(); g.ellipse(129, 136, 11, 8, 0.5, 0, Math.PI * 2); g.fill()
    for (const sd of [-1, 1]) {
      const bin = new Path2D()
      bin.moveTo(103 + sd * 18, 96)
      bin.bezierCurveTo(103 + sd * 46, 98, 103 + sd * 46, 132, 103 + sd * 24, 140)
      bin.bezierCurveTo(103 + sd * 22, 128, 103 + sd * 20, 114, 103 + sd * 16, 106)
      bin.closePath()
      g.fillStyle = 'rgba(22,17,15,0.82)'; g.fill(bin)
      g.save(); g.clip(bin)
      line(0.5, 'rgba(110,100,96,0.55)')
      for (let q = 0; q < 9; q++) { g.beginPath(); g.moveTo(103 + sd * 18, 98 + q * 2); g.bezierCurveTo(103 + sd * (34 + q), 100 + q * 2, 103 + sd * (38 + q * 0.5), 124, 103 + sd * 24, 138); g.stroke() }
      g.restore()
    }
    const cap = new Path2D()
    cap.moveTo(81, 122)
    cap.bezierCurveTo(76, 96, 90, 80, 104, 80)
    cap.bezierCurveTo(120, 80, 132, 94, 126, 120)
    cap.bezierCurveTo(120, 110, 112, 106, 104, 111)
    cap.bezierCurveTo(96, 106, 88, 110, 81, 122)
    cap.closePath()
    g.fillStyle = '#15100e'; g.fill(cap)
    g.save(); g.clip(cap)
    line(0.5, 'rgba(120,110,104,0.5)')
    for (let q = 0; q < 12; q++) { const x = 84 + q * 3.6; g.beginPath(); g.moveTo(x, 118); g.quadraticCurveTo(x + (x - 104) * 0.2, 96, 104, 82); g.stroke() }
    g.restore()
    // (the knot on top, folded over, a red band at its root dotted white)
    g.fillStyle = '#15100e'
    g.beginPath(); g.ellipse(106, 66, 21, 12, -0.06, 0, Math.PI * 2); g.fill()
    g.beginPath(); g.ellipse(106, 76, 14, 7, 0, 0, Math.PI * 2); g.fill()
    line(0.6, 'rgba(120,110,104,0.55)')
    g.beginPath(); g.ellipse(106, 66, 15, 7, -0.06, Math.PI * 1.05, Math.PI * 1.95); g.stroke()
    g.fillStyle = '#c8202a'; g.beginPath(); g.roundRect(92, 76, 28, 6, 2); g.fill()
    g.fillStyle = '#fbe6dc'; for (let q = 0; q < 6; q++) { g.beginPath(); g.arc(95 + q * 4.4, 79, 0.8, 0, Math.PI * 2); g.fill() }
    // (a tortoiseshell comb across the front, its teeth into the hair)
    const comb = new Path2D()
    comb.ellipse(104, 92, 21, 8, 0, Math.PI, Math.PI * 2)
    comb.closePath()
    g.fillStyle = '#9c5a22'; g.fill(comb)
    g.save(); g.clip(comb)
    g.fillStyle = 'rgba(40,20,8,0.55)'; for (const [x, y, r] of [[92, 88, 3], [101, 86, 2.5], [112, 89, 3.2], [118, 90, 2]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill() }
    g.restore()
    line(0.9); g.stroke(comb)
    // (gold pins: one fanning out up to the left with a red flower at its end, one to the right hung with little dangles)
    line(2.2, '#c99a34')
    g.beginPath(); g.moveTo(96, 74); g.lineTo(60, 48); g.moveTo(116, 72); g.lineTo(152, 50); g.moveTo(80, 70); g.lineTo(134, 62); g.stroke()
    g.fillStyle = '#c4201a'
    for (let q = 0; q < 5; q++) { const a = (q / 5) * Math.PI * 2; g.beginPath(); g.arc(60 + Math.cos(a) * 3.4, 48 + Math.sin(a) * 3.4, 2.6, 0, Math.PI * 2); g.fill() }
    g.fillStyle = '#f2d36a'; g.beginPath(); g.arc(60, 48, 1.8, 0, Math.PI * 2); g.fill()
    line(0.7, '#c99a34')
    for (let q = 0; q < 4; q++) {
      const x = 146 + q * 2.4, y = 54 - q * 1.4
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + 1, y + 14 + q * 3); g.stroke()
      g.fillStyle = '#e8c45a'; g.beginPath(); g.ellipse(x + 1, y + 16 + q * 3, 1.4, 2.2, 0, 0, Math.PI * 2); g.fill()
    }
    // ---- the shamisen across her (the owner's, 2026-11-10: finer, it was a few flat shapes): its body (胴) at her waist turned to the neck's
    // slope, a wooden frame a little round at its sides about a cream skin with a soft shade at its edge, the plectrum's guard (撥皮) a crescent
    // of mottled tortoiseshell across the skin's top, the ivory bridge (駒) low on it, the tail cord (根緒) a loop of purple silk from its foot;
    // its slender neck (棹) lacquered near black, a warm gleam down one edge, tapering up past her sleeve to the ivory top nut and the pegbox
    // (天神) curling back, three ivory pegs (糸巻) through it, two to one side, one to the other; the three strings from the cord over the
    // bridge and guard up to the pegs
    // ---- her right sleeve hanging over the robe's side, the forearm in it bent over to the shamisen; its red lining at its foot
    kimono(sleeve)
    g.save(); g.clip(sleeve); kanoko(0, 352, 100, 390); g.restore()
    line(); g.stroke(sleeve)
    g.save(); g.clip(sleeve)
    folds([[52, 266, 46, 284, 40, 304, 36, 330], [46, 262, 40, 270, 34, 280, 30, 296], [28, 250, 23, 264, 21, 280, 21, 298]])
    g.restore()
    // (its body against her right hip, on our left; its neck up across her to over her left shoulder, the pegbox a little higher than it)
    const DX = 72, DY = 318
    const ang = Math.atan2(152 - DY, 153.4 - DX), NECK = 120
    g.save(); g.translate(DX, DY); g.rotate(ang + Math.PI / 2)
    // (in here: up the neck is -y, across the body x)
    line(1.6, '#7a3462'); g.beginPath(); g.moveTo(-4, 21); g.bezierCurveTo(-7.5, 33, 5.5, 35, 3, 22); g.stroke()
    line(0.5, 'rgba(255,214,236,0.6)'); g.beginPath(); g.moveTo(-3.8, 22.4); g.bezierCurveTo(-6.6, 32, 4.6, 33.4, 2.8, 23); g.stroke()
    const dou = new Path2D()
    dou.moveTo(-15, -22.5); dou.quadraticCurveTo(0, -24.5, 15, -22.5); dou.quadraticCurveTo(21.5, -22, 21.5, -16)
    dou.quadraticCurveTo(23, 0, 21.5, 16); dou.quadraticCurveTo(21.5, 22, 15, 22.5); dou.quadraticCurveTo(0, 24.5, -15, 22.5)
    dou.quadraticCurveTo(-21.5, 22, -21.5, 16); dou.quadraticCurveTo(-23, 0, -21.5, -16); dou.quadraticCurveTo(-21.5, -22, -15, -22.5); dou.closePath()
    const wood = g.createLinearGradient(-22, 0, 22, 0)
    wood.addColorStop(0, '#7e4624'); wood.addColorStop(0.5, '#5a2e14'); wood.addColorStop(1, '#3a1c0b')
    g.fillStyle = wood; g.fill(dou)
    line(0.9); g.stroke(dou)
    const skin = new Path2D(); skin.roundRect(-18, -19, 36, 38, 5)
    const hide = g.createRadialGradient(-3, -2, 2, 0, 0, 27)
    hide.addColorStop(0, '#fbf6ea'); hide.addColorStop(0.72, '#efe5d0'); hide.addColorStop(1, '#d6c4a2')
    g.fillStyle = hide; g.fill(skin)
    line(0.6, 'rgba(70,40,20,0.7)'); g.stroke(skin)
    const guard = new Path2D()
    guard.moveTo(-15, -19); guard.lineTo(15, -19); guard.quadraticCurveTo(15, -5, 0, -4); guard.quadraticCurveTo(-15, -5, -15, -19); guard.closePath()
    g.fillStyle = '#6e3e18'; g.fill(guard)
    g.save(); g.clip(guard)
    g.fillStyle = 'rgba(30,14,6,0.55)'
    for (const [x, y, r] of [[-9, -15, 2.6], [-2, -11, 2], [6, -16, 2.4], [10, -10, 1.8], [-6, -8, 1.5], [2, -6.5, 1.2]]) { g.beginPath(); g.ellipse(x, y, r * 1.3, r, 0.3, 0, Math.PI * 2); g.fill() }
    g.fillStyle = 'rgba(236,176,96,0.35)'
    for (const [x, y, r] of [[-12, -17, 1.4], [3, -13, 1.6], [12, -14, 1.1]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill() }
    g.restore()
    line(0.5, 'rgba(40,20,8,0.8)'); g.stroke(guard)
    g.fillStyle = 'rgba(60,40,20,0.25)'; g.fillRect(-6.5, 12.6, 13, 1.2)
    g.fillStyle = '#f2e6c4'; g.beginPath(); g.moveTo(-7, 12.4); g.lineTo(7, 12.4); g.lineTo(5.5, 10); g.lineTo(-5.5, 10); g.closePath(); g.fill()
    line(0.4, 'rgba(90,70,40,0.9)'); g.stroke()
    const neck = new Path2D()
    neck.moveTo(-2.7, -22); neck.lineTo(-2.1, -22 - NECK); neck.lineTo(2.1, -22 - NECK); neck.lineTo(2.7, -22); neck.closePath()
    g.fillStyle = '#22140c'; g.fill(neck)
    line(0.7, 'rgba(214,160,104,0.55)'); g.beginPath(); g.moveTo(1.9, -24); g.lineTo(1.5, -20 - NECK); g.stroke()
    line(0.5); g.stroke(neck)
    // (the pegbox, curling back to the side away from the picture's edge)
    const head = new Path2D()
    head.moveTo(2.2, -22 - NECK); head.bezierCurveTo(2.6, -34 - NECK, -1, -41 - NECK, -7, -43 - NECK)
    head.bezierCurveTo(-10.5, -43.6 - NECK, -11.5, -40.5 - NECK, -8.6, -39.6 - NECK)
    head.bezierCurveTo(-4.4, -38.6 - NECK, -2.6, -33 - NECK, -2.2, -22 - NECK); head.closePath()
    g.fillStyle = '#1c100a'; g.fill(head)
    line(0.6, 'rgba(214,160,104,0.5)'); g.beginPath(); g.moveTo(1.6, -24 - NECK); g.bezierCurveTo(1.8, -33 - NECK, -1.4, -39.5 - NECK, -6.6, -41.6 - NECK); g.stroke()
    line(0.5); g.stroke(head)
    g.fillStyle = '#efe3c4'; g.fillRect(-2.3, -21 - NECK, 4.6, 1.4)
    for (const [y, sd] of [[-26, -1], [-30.5, 1], [-35, -1]] as [number, number][]) {
      g.save(); g.translate(sd * 2.2, y - NECK); g.scale(sd, 1)
      const peg = new Path2D()
      peg.moveTo(0, -0.9); peg.lineTo(5.6, -1.3); peg.quadraticCurveTo(8.6, -2, 8.6, 0); peg.quadraticCurveTo(8.6, 2, 5.6, 1.3); peg.lineTo(0, 0.9); peg.closePath()
      g.fillStyle = '#f1e5c6'; g.fill(peg); line(0.4, 'rgba(90,70,40,0.9)'); g.stroke(peg)
      line(0.5, 'rgba(120,90,50,0.7)'); g.beginPath(); g.moveTo(5.3, -1.3); g.lineTo(5.3, 1.3); g.stroke()
      g.restore()
    }
    line(0.4, 'rgba(252,246,230,0.95)')
    for (const o of [-1.2, 0, 1.2]) { g.beginPath(); g.moveTo(o * 1.3, 20); g.lineTo(o, 10); g.lineTo(o * 0.75, -22); g.lineTo(o * 0.55, -20 - NECK); g.stroke() }
    g.restore()
    // (her left hand round the neck, two thirds of the way up it, out of her left sleeve's mouth: the back of the hand to us, the thumb behind,
    // unseen; four slim fingers over the neck's face to the strings, the first a little apart, pressing one. Drawn as an ukiyo-e hand is: the
    // wrist running on into the back of the hand in one line, no seam at the joint; the fingers tapering, each laid under the hand so its
    // root is hidden in it; the knuckles' ridge a fainter line than the outline; a soft crease at each finger's middle joint (the owner's,
    // 2026-11-12: the joints looked stiff, a glove's: a block of a wrist, a seam across it, the fingers sausages))
    {
      const nx = Math.cos(ang), ny = Math.sin(ang)
      const at = 22 + NECK * 0.62, hx = DX + nx * at, hy = DY + ny * at
      // (across the neck, toward the hand's side: square to it)
      const sx = ny < 0 ? -ny : ny, sy = ny < 0 ? nx : -nx
      g.save(); g.translate(hx, hy); g.rotate(Math.atan2(sy, sx)); g.scale(1.2, 1.2)
      // (in here: +x out from the neck's middle toward her wrist, +y down the neck)
      const SKIN = '#faf3e8'
      // (the fingers, first: from the knuckles on the neck's near side over its face to their tips on the strings by its far edge)
      // (to the neck's far edge and no further, their tips down on the strings there; the first apart from the rest, pressing one)
      for (const [by, tx, ty, w0, w1] of [[-3.5, -2.2, -4.6, 2.3, 1.55], [-1.15, -2.7, -0.75, 2.4, 1.6], [1.15, -2.6, 1.55, 2.3, 1.55], [3.3, -2.0, 3.7, 2.0, 1.4]]) {
        handFinger(g, 2.4, by, tx, ty, w0, w1, -0.5, SKIN)
      }
      // (the back of the hand and the wrist, one shape: the wrist slender out of the sleeve, widening to the hand)
      const hand = new Path2D()
      hand.moveTo(17, -2.9)
      hand.bezierCurveTo(13, -3.1, 10.6, -3.4, 8.6, -4.3)
      hand.bezierCurveTo(6.4, -5.3, 3.8, -5.6, 2.2, -4.6)
      hand.bezierCurveTo(1.0, -3.6, 0.9, 3.4, 2.0, 4.6)
      hand.bezierCurveTo(3.6, 5.6, 6.6, 5.2, 8.6, 4.0)
      hand.bezierCurveTo(10.6, 3.2, 13, 3.0, 17, 3.1)
      hand.closePath()
      g.fillStyle = SKIN; g.fill(hand)
      // (its outline along the wrist and the hand's two sides; the knuckles' ridge over the finger roots fainter, as the brush lifts)
      line(0.42)
      g.beginPath(); g.moveTo(17, -2.9); g.bezierCurveTo(13, -3.1, 10.6, -3.4, 8.6, -4.3); g.bezierCurveTo(6.4, -5.3, 3.8, -5.6, 2.2, -4.6); g.stroke()
      g.beginPath(); g.moveTo(2.0, 4.6); g.bezierCurveTo(3.6, 5.6, 6.6, 5.2, 8.6, 4.0); g.bezierCurveTo(10.6, 3.2, 13, 3.0, 17, 3.1); g.stroke()
      line(0.3, 'rgba(26,18,16,0.55)')
      g.beginPath(); g.moveTo(2.2, -4.6); g.bezierCurveTo(1.0, -3.6, 0.9, 3.4, 2.0, 4.6); g.stroke()
      // (a breath of shade where the hand turns down to the fingers, and the tendon's faint line up the back of the wrist)
      line(0.25, 'rgba(176,128,108,0.45)')
      g.beginPath(); g.moveTo(4.2, -3.6); g.quadraticCurveTo(3.4, 0, 4.0, 3.6); g.stroke()
      g.beginPath(); g.moveTo(13.5, -1.2); g.quadraticCurveTo(10, -1.6, 7.2, -2.2); g.stroke()
      // (her sleeve's mouth at the wrist, its red lining)
      const cuff = new Path2D(); cuff.moveTo(15.5, -7); cuff.quadraticCurveTo(13.2, 0, 15.5, 7.4); cuff.lineTo(24, 8.2); cuff.lineTo(24, -7.6); cuff.closePath()
      g.fillStyle = NAVY; g.fill(cuff)
      line(1.3, '#b8261c'); g.beginPath(); g.moveTo(16.1, -6.4); g.quadraticCurveTo(13.8, 0, 16.1, 6.8); g.stroke()
      line(0.55); g.stroke(cuff)
      g.restore()
    }
    // (her right hand out of her right sleeve, the forearm laid over the shamisen's body, with the plectrum (撥): its ivory handle in her fist,
    // its blade fanning out and down onto the strings over the guard, about to strike: standing off the skin on its edge, its shadow cast on
    // the skin under it, the light along its thin edge; the back of her hand to us and a little up, four slim fingers curled round under the
    // handle, her thumb along its top toward the blade; at her wrist the sleeve's mouth, its red lining showing)
    {
      const HX = 57, HY = 295, TX = 78, TY = 306.5
      g.save(); g.translate(HX, HY); g.rotate(Math.atan2(TY - HY, TX - HX)); g.scale(1.5, 1.5)
      // (in here: +x down the plectrum toward its blade, +y to the side her fingers curl round)
      // (its handle low in her fist, under the knuckles, where her curled fingers close round it in front of it (item 62: it lay hidden behind
      // the back of her hand, the fingers hanging under it like pegs, holding nothing))
      const GY = 4.2
      const bachi = new Path2D()
      bachi.moveTo(-10, GY - 1.25); bachi.lineTo(4, GY - 1.5)
      bachi.bezierCurveTo(8, GY - 1.8, 10.5, GY - 4.8, 13.2, GY - 7.6)
      bachi.lineTo(14.6, GY + 6.4)
      bachi.bezierCurveTo(11, GY + 4.2, 8, GY + 1.8, 4, GY + 1.5)
      bachi.lineTo(-10, GY + 1.25); bachi.closePath()
      g.save(); g.translate(1.8, 2.6); g.fillStyle = 'rgba(80,46,18,0.3)'; g.fill(bachi); g.restore()
      const ivory = g.createLinearGradient(0, GY - 7.6, 0, GY + 6.4)
      ivory.addColorStop(0, '#fbf5e4'); ivory.addColorStop(0.5, '#ede1c0'); ivory.addColorStop(1, '#c9b385')
      g.fillStyle = ivory; g.fill(bachi); line(0.45, 'rgba(110,84,48,0.95)'); g.stroke(bachi)
      line(0.55, 'rgba(255,255,255,0.9)'); g.beginPath(); g.moveTo(13.3, GY - 7); g.lineTo(14.5, GY + 5.8); g.stroke()
      line(0.5, 'rgba(150,118,70,0.75)'); g.beginPath(); g.moveTo(4.4, GY + 1.4); g.bezierCurveTo(8.2, GY + 1.9, 11.2, GY + 4, 14.3, GY + 6.1); g.stroke()
      const SKIN = '#faf3e8'
      // (four slim fingers curled round under the handle, first: each down out of the knuckles' line and curling back under, its tip tucked
      // in, only the middle joint's turn showing; their roots hidden under the back of the hand, no seam)
      // (drawn over the handle: they close round it, their tips tucked back under it)
      for (let k = 0; k < 4; k++) {
        const x = -7.9 + k * 2.45, len = 3.4 - Math.abs(k - 1.4) * 0.3
        handFinger(g, x, 2.4, x + 1.3, 2.4 + len, 2.5 - k * 0.08, 2.3 - k * 0.08, 0.5, SKIN, true)
      }
      // (the back of the hand and the wrist, one shape: the wrist slender out of the sleeve, widening to the hand, round its first knuckle onto
      // the handle, along the knuckles' line to the heel of the hand)
      const hand = new Path2D()
      hand.moveTo(-17, -3.0)
      hand.bezierCurveTo(-13.5, -3.3, -11.5, -3.9, -9.5, -4.6)
      hand.bezierCurveTo(-6.5, -5.6, -2.0, -5.4, 0.6, -3.8)
      hand.bezierCurveTo(2.4, -2.6, 2.8, 0.6, 1.8, 2.4)
      hand.bezierCurveTo(0.4, 3.6, -3.0, 3.9, -6.5, 3.9)
      hand.bezierCurveTo(-9.5, 3.8, -12.5, 3.2, -17, 3.2)
      hand.closePath()
      g.fillStyle = SKIN; g.fill(hand)
      line(0.42)
      g.beginPath(); g.moveTo(-17, -3.0); g.bezierCurveTo(-13.5, -3.3, -11.5, -3.9, -9.5, -4.6); g.bezierCurveTo(-6.5, -5.6, -2.0, -5.4, 0.6, -3.8)
      g.bezierCurveTo(2.4, -2.6, 2.8, 0.6, 1.8, 2.4); g.stroke()
      g.beginPath(); g.moveTo(-9.6, 3.85); g.bezierCurveTo(-12.5, 3.2, -14.5, 3.2, -17, 3.2); g.stroke()
      // (the knuckles' line over the curled fingers fainter, a little wave along it at each knuckle)
      line(0.3, 'rgba(26,18,16,0.55)')
      g.beginPath(); g.moveTo(1.8, 2.4)
      for (let k = 3; k >= 0; k--) { const x = -7.9 + k * 2.45; g.quadraticCurveTo(x + 1.2, 3.1, x - 0.1, 3.75) }
      g.stroke()
      // (her thumb along the handle's top toward the blade, tapering, its nail at the tip, a soft fold where it leaves the hand)
      // (her thumb short along the handle's top, its tip on it at the fist's front, not out over the blade (it read as pointing at it))
      handFinger(g, -2.2, 1.0, 2.6, 2.1, 2.3, 1.6, -0.25, SKIN, false, true)
      line(0.25, 'rgba(176,128,108,0.5)')
      g.beginPath(); g.moveTo(-3.2, 0.9); g.quadraticCurveTo(-4.8, 0.2, -5.8, -0.8); g.stroke()
      g.beginPath(); g.moveTo(-14, -0.6); g.quadraticCurveTo(-11, -1.2, -8.2, -2.0); g.stroke()
      const cuff = new Path2D(); cuff.moveTo(-15.5, -7); cuff.quadraticCurveTo(-13, 0, -15.5, 7.4); cuff.lineTo(-25, 8.4); cuff.lineTo(-25, -7.6); cuff.closePath()
      g.fillStyle = NAVY; g.fill(cuff)
      line(1.3, '#b8261c'); g.beginPath(); g.moveTo(-16.1, -6.4); g.quadraticCurveTo(-13.7, 0, -16.1, 6.8); g.stroke()
      line(0.55); g.stroke(cuff)
      g.restore()
    }
    // ---- the title in its cartouche, top right, and a seal at the foot
    g.fillStyle = '#efe2c2'; g.fillRect(162, 12, 28, 96)
    line(1); g.strokeRect(162, 12, 28, 96); g.strokeRect(164.5, 14.5, 23, 91)
    g.fillStyle = INK; g.font = '700 17px "Zen Antique", serif'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'
    ;['三', '味', '線'].forEach((c, q) => g.fillText(c, 176, 38 + q * 26))
    seal(g, 14, 420, 24)
  }),
}
export type ArtKey = keyof typeof ART
/** each picture's name, for edit mode's list (item 156, the owner's, 2026-11-15: they were named by where they hang, 畫（-2, 0.9）) */
export const ART_ZH: Record<ArtKey, string> = { fuji: '富士山', wave: '浪花', koi: '錦鯉', calligraphy: '書法', plum: '梅花', akaFuji: '赤富士', rainBridge: '雨中橋',
  kabuki: '歌舞伎', bijin: '三味線美人圖' }
/** a scroll's mounting: the dark silk of its top and foot (a fine weave, a soft sheen down it), and the brocade band round its picture (gold
 * flowers in a lattice of diamonds, 花菱, on olive) */
const SCROLL_SILK = canvasTex(128, 384, (g) => {
  const gr = g.createLinearGradient(0, 0, 128, 0)
  gr.addColorStop(0, '#2c2420'); gr.addColorStop(0.5, '#3c312a'); gr.addColorStop(1, '#2a221e')
  g.fillStyle = gr; g.fillRect(0, 0, 128, 384)
  g.globalAlpha = 0.18
  for (let y = 0; y < 384; y += 2) { g.fillStyle = y % 4 ? '#000' : '#6a5a4a'; g.fillRect(0, y, 128, 1) }
  g.globalAlpha = 1
})
const SCROLL_BROCADE = canvasTex(256, 512, (g) => {
  g.fillStyle = '#5e5530'; g.fillRect(0, 0, 256, 512)
  g.strokeStyle = 'rgba(214,178,92,0.55)'; g.lineWidth = 1.2
  for (let k = -512; k < 512; k += 24) {
    g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 512, 512); g.stroke()
    g.beginPath(); g.moveTo(k + 512, 0); g.lineTo(k, 512); g.stroke()
  }
  g.fillStyle = 'rgba(232,196,110,0.85)'
  for (let y = 12; y < 512; y += 24) for (let x = (y / 24) % 2 ? 12 : 0; x < 256; x += 24) {
    for (let p = 0; p < 4; p++) {
      const a = (p * Math.PI) / 2
      g.beginPath(); g.ellipse(x + Math.cos(a) * 3.2, y + Math.sin(a) * 3.2, 2.6, 1.5, a, 0, Math.PI * 2); g.fill()
    }
  }
})
// (the woodblock prints in turn with the others along the walls)
export const PRINTS: ArtKey[] = ['akaFuji', 'fuji', 'rainBridge', 'wave', 'koi']
export const SCROLLS: ArtKey[] = ['calligraphy', 'kabuki', 'plum', 'bijin']

/** a print behind glass in a thin dark frame */
export function Framed({ art }: { art: ArtKey }) {
  const W = 0.5, H = 0.36, M = 0.045, F = 0.032
  const OW = W + 2 * M, OH = H + 2 * M
  return (
    <group>
      {/* (the backing board) */}
      <mesh position-x={-0.008}>
        <boxGeometry args={[0.012, OH + 2 * F, OW + 2 * F]} />
        <meshToonMaterial color="#24160d" />
      </mesh>
      {/* (the frame's four sides: a dark moulding with a lighter bead along its inner edge) */}
      {([[0, OH / 2 + F / 2, OW + 2 * F, F], [0, -OH / 2 - F / 2, OW + 2 * F, F], [OW / 2 + F / 2, 0, F, OH], [-OW / 2 - F / 2, 0, F, OH]] as const).map(([z, y, w, h], i) => (
        <group key={i}>
          <mesh position={[-0.026, y, z]}>
            <boxGeometry args={[0.024, h, w]} />
            <meshToonMaterial color="#3a2416" />
          </mesh>
          <mesh position={[-0.039, y, z]} scale={[1, h > w ? 1 : 0.3, h > w ? 0.3 : 1]}>
            <boxGeometry args={[0.004, h, w]} />
            <meshToonMaterial color="#7a5434" />
          </mesh>
        </group>
      ))}
      {/* (the cream mat round the print, and the gold lip at its edge) */}
      <mesh position-x={-0.0155} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[OW, OH]} />
        <meshToonMaterial color="#efe5cf" />
      </mesh>
      <mesh position-x={-0.0165} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[W + 0.012, H + 0.012]} />
        <meshToonMaterial color="#c9a24a" />
      </mesh>
      <mesh position-x={-0.0172} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[W, H]} />
        <meshToonMaterial color="#ffffff" map={ART[art]} />
      </mesh>
    </group>
  )
}

/** a hanging scroll: the painting on paper mounted in brocade, its cord over a nail, a weighted rod at the foot */
/** what the pieces only to look at say when they're pointed at (the owner's): a tag, no glow, the cursor left an arrow, no click */
export const KOI_SAYS = nameOver('【版畫】錦鯉', '紅白與山吹色的錦鯉在深水中悠游，象徵好運與興旺')
export const BIJIN_SAYS = nameOver('【掛軸】三味線美人圖', '江戶浮世繪藝伎，洋溢典雅古韻')
export const BAMBOO_SAYS = nameOver('【觀賞盆栽】青竹', '象徵節節高升，增添店內沉靜綠意')
export function Scroll({ art }: { art: ArtKey }) {
  const W = 0.26, H = 0.62
  return (
    <group>
      {/* (the dark silk above and below the picture, the whole length) */}
      <mesh position-x={-0.005} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[W + 0.08, H + 0.3]} />
        <meshToonMaterial color="#ffffff" map={SCROLL_SILK} />
      </mesh>
      {/* (the brocade band round the picture) */}
      <mesh position-x={-0.006} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[W + 0.05, H + 0.1]} />
        <meshToonMaterial color="#ffffff" map={SCROLL_BROCADE} />
      </mesh>
      {/* (the gold strips over and under the picture) */}
      {[1, -1].map((s) => (
        <mesh key={s} position={[-0.007, s * (H / 2 + 0.012), 0]} rotation-y={-Math.PI / 2}>
          <planeGeometry args={[W, 0.022]} />
          <meshToonMaterial color="#c9a24a" />
        </mesh>
      ))}
      <mesh position-x={-0.008} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[W, H]} />
        <meshToonMaterial color="#ffffff" map={ART[art]} />
      </mesh>
      {/* (the roller's knob ends, pale, lacquered) */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[-0.014, -H / 2 - 0.14, s * (W / 2 + 0.07)]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.015, 0.013, 0.03, 10]} />
          <meshToonMaterial color="#e8dcc4" />
        </mesh>
      ))}
      {/* the rod at the foot with its knobs, and the thin one at the top */}
      <mesh position={[-0.014, -H / 2 - 0.14, 0]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.011, 0.011, W + 0.12, 8]} />
        <meshToonMaterial color="#2a1a10" />
      </mesh>
      <mesh position={[-0.01, H / 2 + 0.13, 0]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.007, 0.007, W + 0.07, 6]} />
        <meshToonMaterial color="#2a1a10" />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[-0.006, H / 2 + 0.2, s * 0.06]} rotation-x={s * 0.9}>
          <cylinderGeometry args={[0.002, 0.002, 0.16, 4]} />
          <meshBasicMaterial color="#5a2a1a" />
        </mesh>
      ))}
    </group>
  )
}
