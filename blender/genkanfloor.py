"""The genkan's floor and its step (genkanfloor.glb; item 185, the owner's, 2026-11-15: "the genkan's doorway, its stone step and floor, too
plain": one flat picture of stones on a plane, a regular grid of grey slabs in thick pale joints, and the step up a thin dark board).

- node "GenkanStones": the floor, natural stones laid crazy-paving (乱張り): each its own outline (a Voronoi cell of the genkan's rect), its
  own tint (in its points' colour: pale granite, warm grey, cool grey, a dark slate now and then), its top domed (the owner's, 2026-11-17:
  "a little bulging out, more shape and style"): a few rings of points to each, the edge rounded off like a worn stone's, the top swelling
  up to a centimetre toward its middle and a hair tilted, shaded smooth; laid in the joints' pebble-wash. One mesh.
- node "GenkanMortar": the pebble-wash (洗い出し) between them: small black, grey and white pebbles packed in dark cement, seen in the joints.
- node "GenkanRug": ONE large rug (the owner's, 2026-11-17, in place of the little lettered doormat and the shoe-off stone, both gone):
  a 0.946 x 0.72 slab 1.8 cm thick laid on the stones from the step's beam to the shoe cupboard's doors: a hooked cotton rug dyed with
  Mt Fuji (item 563: the sun, mist bands, seigaiha waves, an indigo border with plum crests in its corners; item 701: clouds with curls
  of three kinds, plovers, the sea half as high in big and small waves). Four rim quads and a top (26 triangles); everything else is in
  its picture and normal map.
- node "GenkanSill": the door's threshold (敷居石): a long slab of dark granite across the doorway, a little proud of the floor.
- node "GenkanKamachi": the step's edge (上框): a polished keyaki beam along both of the genkan's open sides, its top a hair proud of the
  room's boards, its front the step's face down to the stones, its top front edge rounded; mitred at the corner.

The game's frame is RoomFloor's (GuestBar3D): x = minus the first counter's lay, z = its along from its middle, y up from the room's floor;
in the bar's units. The genkan's rect there (measured in the game, item 185): x 0.42..1.6569, z 2.4..3.7155, its stone 0.1 down.
The shoe cupboard stands against the wall side from x 1.297; the way in runs at x 1.16.
(The shoe-off stone, GenkanKutsunugi, that stood at x 0.80..1.27, z 2.445..2.72 is gone: the owner crossed it out, 2026-11-17.)

Run:
    blender -b --factory-startup --python blender/genkanfloor.py -- <project path> [preview.png]
"""
import math
import os
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *  # noqa: E402,F403

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
PROJECT = argv[0] if argv else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PREVIEW = argv[1] if len(argv) > 1 else None
bpy.ops.wm.read_factory_settings(use_empty=True)
seed(185)

# ------------------------------------------------------------------------------------------------ the genkan's rect and the parts' sizes
X0, X1, Z0, Z1, D = 0.42, 1.6569, 2.4, 3.7155, 0.1
FLOOR = -D                 # the genkan's stone, where people stand
MORTAR_Y = -D - 0.010      # the pebble-wash in the joints, a centimetre under the stones' tops
JOINT = 0.009              # half a joint's width
CHAMFER = 0.0045           # each stone's top edge, its chamfer in and down
# (the step's beam: its profile across the edge (u: from under the room's boards, + into the genkan), its top and how far down it goes)
K_BACK, K_FRONT, K_TOP, K_ROUND = -0.035, 0.024, 0.006, 0.012
K_FOOT = MORTAR_Y
# (each stone's top: its middle's height over the base (the dome), how far its edge is rounded off, and the rings of points it takes: how far
# in from its outline each lies (the last one is where the flat-ish top starts, closed with a ladder on export))
DOME, ROUND, RINGS = 0.006, 0.011, (0.0, 0.003, 0.006, 0.011, 0.035)
# (the rug: clear of the shoe cupboard's doors (x 1.297) and the step's stones where shoes are put (z up to about 2.8), on the way in (x 1.16),
# its far end 7 cm short of the threshold; its top a hair over the stones' crowns (the highest: FLOOR + 0.004 + 0.006 + a tilt's 1 mm))
# (and pushed up against the step's beam (item 294, the owner's, 2026-11-17: 「貼緊」, an arrow from it to the step): its near end a millimetre
# off the beam's face (Z0 + K_FRONT), as long as it was)
# (and filled out side to side (item 312, the owner's, 2026-11-18: 「玄關地毯可以左右補滿」): from the step's beam on the left (X0 + K_FRONT) to
# 6 mm short of the shoe cupboard's front on the right (at x 1.3866 as it stands now, measured; its doors swing over it, clear of its 1.4 cm))
# (and on to the shoe cupboard (item 563, the owner's, 2026-11-22: 「補滿貼整齊」, a red box round the stones and joint seen between it and
# the cupboard): a millimetre short of its doors' faces (x 1.392, measured in the game: tests/e2e/_rugside563.mjs); they swing 7.7 cm over it)
RUG = {"x": (X0 + K_FRONT + 0.001, 1.391), "z": (Z0 + K_FRONT + 0.001, Z0 + K_FRONT + 0.001 + 0.72), "top": FLOOR + 0.014, "foot": FLOOR - 0.004, "rim": 0.0055, "round": 0.012}
# (the threshold across the doorway, against the door's end)
SILL = {"x": (X0 + K_FRONT + 0.004, X1), "z": (Z1 - 0.075, Z1), "top": FLOOR + 0.004}


def P(x, y, z):
    """the game's (three's) frame into Blender's: y up there, z up here"""
    return Vector((x, -z, y))


# ------------------------------------------------------------------------------------------------ pictures
N = 1024
u, v = grid01(N)
# (granite: a pale grey-beige ground, cloudy, packed with grains: black mica, white quartz, a pink-brown feldspar; a few darker veins)
ground = mix((0.60, 0.58, 0.55), (0.47, 0.455, 0.43), fbm(N, 5, 5, 5))
gran = ground.copy()
for cells, thr, col, k in ((420, 0.80, (0.08, 0.08, 0.09), 0.9), (300, 0.84, (0.80, 0.79, 0.76), 0.7), (240, 0.86, (0.52, 0.40, 0.35), 0.6),
                           (520, 0.78, (0.24, 0.24, 0.25), 0.55)):
    chip = smooth(thr, thr + 0.04, vnoise(N, cells, cells))
    gran = mix(gran, col, chip * k)
vein = np.abs(fbm(N, 3, 7, 5) - 0.5)
gran = mix(gran, (0.36, 0.355, 0.35), smooth(0.03, 0.0, vein) * 0.35)
# (worn: a little lighter where it's walked on, a little dirtier in its low places)
gran = gran * (0.93 + 0.1 * fbm(N, 8, 8, 4))[..., None]
gh = fbm(N, 64, 64, 3) * 0.6 + fbm(N, 6, 6, 4) * 0.4
gh = gh - smooth(0.8, 0.86, vnoise(N, 420, 420)) * 0.25        # the mica's pits
STONE_TEX = image("genkan_granite", np.clip(gran, 0, 1).astype(np.float32))
STONE_NRM = image("genkan_granite_nrm", to_normal(gh, 3.0).astype(np.float32), data=True)

# (pebble-wash: dark cement, packed with small round pebbles, black (那智黒), grey, a few white)
M2 = 512
yy, xx = np.mgrid[0:M2, 0:M2].astype(np.float32)
peb = np.zeros((M2, M2, 3), np.float32) + np.array([0.20, 0.19, 0.18], np.float32)
peb = peb * (0.85 + 0.3 * fbm(M2, 8, 8, 4))[..., None]
ph = np.zeros((M2, M2), np.float32)
for _ in range(1700):
    r = rng.uniform(3.0, 7.5)
    cx, cy = rng.uniform(0, M2, 2)
    tone = rng.random()
    col = np.array((0.06, 0.06, 0.065) if tone < 0.55 else (0.42, 0.41, 0.40) if tone < 0.88 else (0.86, 0.85, 0.82), np.float32)
    col = col * rng.uniform(0.85, 1.15)
    for ox in (-M2, 0, M2):
        for oy in (-M2, 0, M2):
            px, py = cx + ox, cy + oy
            x0, x1 = int(max(0, px - r - 2)), int(min(M2, px + r + 2))
            y0, y1 = int(max(0, py - r - 2)), int(min(M2, py + r + 2))
            if x0 >= x1 or y0 >= y1:
                continue
            d = np.sqrt((xx[y0:y1, x0:x1] - px) ** 2 + (yy[y0:y1, x0:x1] - py) ** 2)
            m = np.clip((r - d) / 1.2, 0, 1)
            dome = np.clip(1 - (d / r) ** 2, 0, 1)
            shade = (0.75 + 0.35 * dome)[..., None]
            peb[y0:y1, x0:x1] = peb[y0:y1, x0:x1] * (1 - m[..., None]) + (col * shade) * m[..., None]
            ph[y0:y1, x0:x1] = np.maximum(ph[y0:y1, x0:x1], dome * m)
PEB_TEX = image("genkan_pebbles", np.clip(peb, 0, 1).astype(np.float32))
PEB_NRM = image("genkan_pebbles_nrm", to_normal(ph, 2.5).astype(np.float32), data=True)

# (keyaki, polished: a deep red-brown, its grain running the beam's length, a band of lighter figure here and there, a waxed sheen)
M3 = 512
u3, v3 = grid01(M3)
grain = np.sin((v3 * 46 + (fbm(M3, 3, 8, 4) - 0.5) * 2.2 + (fbm(M3, 9, 2, 3) - 0.5) * 0.4) * 2 * math.pi) * 0.5 + 0.5
wood = mix((0.30, 0.14, 0.07), (0.17, 0.075, 0.035), smooth(0.45, 1.0, grain) * 0.8)
wood = mix(wood, (0.38, 0.19, 0.09), smooth(0.7, 0.95, fbm(M3, 2, 6, 4)) * 0.35)
wood = wood * (0.92 + 0.1 * fbm(M3, 4, 24, 3))[..., None]
WOOD_TEX = image("genkan_keyaki", np.clip(wood, 0, 1).astype(np.float32))
WOOD_NRM = image("genkan_keyaki_nrm", to_normal(grain * 0.6 + fbm(M3, 6, 30, 3) * 0.4, 1.2).astype(np.float32), data=True)

# (the rug (item 563, the owner's, 2026-11-22: 「門口的地毯要補滿貼整齊，可以參考這些花紋來Design，用富士山做為基底」, with a sheet of Japanese
# motifs beside it: plum, crane, tomoe, seigaiha, pine, bamboo, chrysanthemum, Fuji, waves, asanoha): a hooked cotton rug dyed in the shop's
# indigo, cream and vermilion, Mt Fuji its ground: an indigo mountain, its right flank lit, its snowcap running down in fingers with dark
# gullies, a vermilion sun over it with a wisp of cloud across it, bands of mist (kasumi) across its slopes, seigaiha waves at its foot; a
# thin vermilion frame round the field; an indigo border with a cream line in it and a plum crest in each corner. (Item 701, the owner's,
# 2026-11-25, the clouds circled: 「雲可以再生動些，下面的海減少一半，然後有不一樣的規律感，有大有小；可以再多點樣式。」: the clouds
# drawn as the old patterns draw them, curled, each its own kind; the sea half as high, big swells in a three-beat rhythm behind small
# waves; plovers over it.) Its loops 3 px across,
# a groove where one colour's loops meet another's. Upright as one coming in at the door sees it, standing on it to step up into the shop
# (the owner's, 2026-11-22, item 581: 「富士山可保留記得要翻轉90度」; it had been laid upright for the shop's own cameras, the shoe cupboard
# its top, and from the door the mountain lay on its side): the design's up toward the step (-z, v up to it), its right toward the shoe
# cupboard (+x, u). A landscape now, as the rug is seen so: 1024 x 768 over 0.946 x 0.72 m, about a pixel a millimetre.)
TW, TH = 1024, 768
RW, RL = RUG["x"][1] - RUG["x"][0], RUG["z"][1] - RUG["z"][0]
_U, _V = np.meshgrid((np.arange(TW) + 0.5) / TW, (np.arange(TH) + 0.5) / TH)
DW, DH = RW, RL                           # the design's width and height
DX, DY = _U * DW, _V * DH                 # its frame: x from the till's beam across to the shoe cupboard, y from the door up to the step
PXM = DW / TW                             # a pixel, in metres
AA = PXM * 0.7                            # an edge softened over about a pixel
rrng = np.random.default_rng(563)         # (its own: nothing else drawn from it)


def inside(sd):
    """a shape's mask from its signed distance (negative inside)"""
    return smooth(AA, -AA, sd)


def line_at(sd, w):
    """a line `w` wide along a shape's edge (its signed distance's zero)"""
    return inside(np.abs(sd) - w / 2)


def stadium(x0, x1, yc, r):
    """a band with round ends (a mist band), its signed distance"""
    px = np.clip(DX, x0, x1)
    return np.hypot(DX - px, DY - yc) - r


INDIGO = (0.100, 0.145, 0.290)
INDIGO_LIT = (0.170, 0.230, 0.400)
CREAM = (0.900, 0.860, 0.745)
SNOW = (0.965, 0.955, 0.915)
SHU = (0.800, 0.235, 0.145)
B = 0.048                                 # the border
edge = np.minimum(np.minimum(DX, DW - DX), np.minimum(DY, DH - DY))
rug = np.zeros((TH, TW, 3), np.float32) + np.array(CREAM, np.float32)
FAR = 9.0                                 # (a distance from anything drawn)
LINE, FINE = 0.0024, 0.0016               # an outline's width, a finer line's in it (item 701)


def box(x0, y0, x1, y1):
    """the picture's rows and columns over a box of the design, a few pixels round it: what's drawn there worked out there only"""
    j0, j1 = max(0, int(x0 / PXM) - 3), min(TW, int(math.ceil(x1 / PXM)) + 3)
    i0, i1 = max(0, int(y0 / (DH / TH)) - 3), min(TH, int(math.ceil(y1 / (DH / TH))) + 3)
    return np.s_[i0:i1, j0:j1]


def disc(cx, cy, r):
    """a disc, its signed distance"""
    return np.hypot(DX - cx, DY - cy) - r


def curve(*p, n=16):
    """points along a Bezier through `p` (three points a quadratic, four a cubic)"""
    out = []
    for i in range(n + 1):
        t = i / n
        w = [(1 - t) ** 2, 2 * (1 - t) * t, t * t] if len(p) == 3 else [(1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t * t, t ** 3]
        out.append((sum(k * q[0] for k, q in zip(w, p)), sum(k * q[1] for k, q in zip(w, p))))
    return out


def stroke(pts, r0, r1):
    """a brushed stroke along `pts`, `r0` round at its start tapering to `r1` at its end: each step a tapered capsule (its two end discs
    and the lines tangent to both), their union; its signed distance"""
    m = max(r0, r1)
    sub = box(min(p[0] for p in pts) - m, min(p[1] for p in pts) - m, max(p[0] for p in pts) + m, max(p[1] for p in pts) + m)
    X, Y = DX[sub], DY[sub]
    d = np.full(X.shape, FAR, np.float32)
    n = len(pts) - 1
    for i in range(n):
        (ax, ay), (bx, by) = pts[i], pts[i + 1]
        ra, rb = r0 + (r1 - r0) * i / n, r0 + (r1 - r0) * (i + 1) / n
        h = math.hypot(bx - ax, by - ay)
        if h < 1e-7:
            continue
        ux, uy = (bx - ax) / h, (by - ay) / h
        lx, ly = np.abs((Y - ay) * ux - (X - ax) * uy), (X - ax) * ux + (Y - ay) * uy
        b = (ra - rb) / h
        a = math.sqrt(max(0.0, 1 - b * b))
        k = ly * a - lx * b
        d = np.minimum(d, np.where(k < 0, np.hypot(lx, ly) - ra, np.where(k > a * h, np.hypot(lx, ly - h) - rb, lx * a + ly * b - ra)))
    out = np.full(DX.shape, FAR, np.float32)
    out[sub] = d
    return out


def spiral(cx, cy, r0, r1, turns, a0, cw=True):
    """a curl: the distance to a spiral winding in from `r0` at the angle `a0` (radians, the picture's y up) to `r1`, `turns` times round,
    clockwise as the picture's seen (or not), taken along each ray from its eye (near enough a distance for a line a few pixels wide);
    and where it ends, for a dot there"""
    sub = box(cx - r0, cy - r0, cx + r0, cy + r0)
    x, y = DX[sub] - cx, DY[sub] - cy
    rho = np.hypot(x, y)
    s = -1 if cw else 1
    t0 = np.mod(s * (np.arctan2(y, x) - a0), 2 * math.pi)
    tot = turns * 2 * math.pi
    d = np.full(x.shape, FAR, np.float32)
    for k in range(int(math.ceil(turns)) + 1):
        th = t0 + k * 2 * math.pi
        d = np.where(th <= tot, np.minimum(d, np.abs(rho - (r0 + (r1 - r0) * th / tot))), d)
    out = np.full(DX.shape, FAR, np.float32)
    out[sub] = d
    ae = a0 + s * tot
    return out, (cx + r1 * math.cos(ae), cy + r1 * math.sin(ae))


def paint(shape, lines=(), dots=(), col=CREAM, ink_col=INDIGO):
    """a shape over what's there, dyed as the rest: `shape` (its signed distance) in `col`, a line of `ink_col` round it just inside its
    edge; `lines` ((distance, width), ...) and `dots` ((x, y, r), ...) in it, kept inside it"""
    global rug
    fill = inside(shape)
    ink = line_at(shape + LINE * 0.7, LINE)
    for d, w in lines:
        ink = np.maximum(ink, line_at(d, w) * fill)
    for x, y, r in dots:
        ink = np.maximum(ink, inside(disc(x, y, r)) * fill)
    rug = mix(rug, col, fill)
    rug = mix(rug, ink_col, ink)

# (the sun: upper right, the light on the mountain's right flank)
SUN = (0.735, 0.556, 0.072)
sun = inside(np.hypot(DX - SUN[0], DY - SUN[1]) - SUN[2])
rug = mix(rug, SHU, sun)

# (the mountain: concave flanks out past the field's sides, a flat top with its crater's three low peaks)
# (as wide as the field, its slopes the gentler for it, Fuji's own: the old upright one's 0.38 high over 0.77 had been steep)
# (its foot down where the sea ends now, the sea half as high as it was (item 701), the mountain as it was over it, a hair taller)
XM, YB, YP, HW, SW = DW / 2, 0.125, 0.455, 0.40, 0.034
ddx = np.abs(DX - XM)
t = np.clip((ddx - SW) / (HW - SW), 0, 1)
prof = YB + (YP - YB) * (1 - t) ** 1.6
prof = prof + np.where(ddx < SW, 0.004 * (0.5 + 0.5 * np.cos(2.5 * math.pi * (DX - XM) / SW)), 0.0)
slope = (YP - YB) * 1.6 * (1 - t) ** 0.6 / (HW - SW)
mtn = inside((DY - prof) / np.sqrt(1 + slope ** 2))
# (its lit side: right of a ridge running down from the summit, a little out to the right as it comes down)
ridge = XM + 0.012 + 0.05 * np.clip((YP - DY) / (YP - YB), 0, 1)
lit = smooth(-0.003, 0.003, DX - ridge)
rug = mix(rug, mix(np.broadcast_to(np.array(INDIGO, np.float32), lit.shape + (3,)), INDIGO_LIT, lit), mtn)
# (the snowcap: down from the summit, its edge in fingers of its own lengths, longer toward the middle)
k = (DX - XM) / 0.031
fid = np.floor(k).astype(int)
lens = rrng.uniform(0.35, 1.0, 64).astype(np.float32)
fing = (1 - np.abs(2 * (k - fid) - 1)) ** 1.4
reach = 0.026 + 0.048 * lens[(fid + 32) % 64] * np.clip(1 - np.abs(DX - XM) / 0.2, 0.25, 1)
snowline = YP - 0.082 - reach * fing
snow = inside(snowline - DY) * mtn
# (its gullies: dark lines down from under the summit, fanning out, stopping short of the snow's edge)
gul = np.zeros_like(snow)
for off in (-0.052, -0.020, 0.016, 0.048):
    xl = XM + off * (1 + 1.4 * np.clip((YP - 0.012 - DY) / 0.12, 0, 1))
    seg = inside(np.abs(DX - xl) - 0.0011) * smooth(YP - 0.010, YP - 0.020, DY) * smooth(0.0, 0.012, DY - snowline)
    gul = np.maximum(gul, seg)
rug = mix(rug, SNOW, snow * (1 - gul))

# (the sea at its foot (item 701, the owner's 「下面的海減少一半，然後有不一樣的規律感，有大有小」: it was one size of seigaiha in even rows
# up to 0.29 of the design): half as high, and not one size all over: a row of swells behind in a three-beat rhythm, one big, two
# middling, the big ones with more rings and bolder; in front, row on row down under the border, small seigaiha, half the old waves'
# size, two rings each. Each a fan of rings about a filled heart, the lower rows in front, as before)
WAVES = {                                 # (its size; its rings, as parts of it; its heart's; the rings' width)
    "s": (0.025, (0.92, 0.60), 0.27, 0.0027),
    "m": (0.040, (0.93, 0.69, 0.45), 0.20, 0.0032),
    "b": (0.064, (0.95, 0.79, 0.63, 0.47, 0.31), 0.14, 0.0040),
}
SEA_BACK, SEA_FRONT = 0.108, 0.098        # the swells' hearts; the small waves' top row's
dist = np.full(DX.shape, FAR, np.float32)  # (to the heart of the wave in front there, its size, and which size that is)
size = np.zeros(DX.shape, np.float32)
kind = np.full(DX.shape, -1, np.int8)
KINDS = list(WAVES)


def wave_at(xc, yc, k):
    """a wave's fan where nothing in front of it is yet"""
    R = WAVES[k][0]
    sub = box(xc - R, yc - R, xc + R, yc + R)
    d = np.hypot(DX[sub] - xc, DY[sub] - yc)
    take = (d < R + PXM) & (dist[sub] >= FAR)
    dist[sub] = np.where(take, d, dist[sub])
    size[sub] = np.where(take, R, size[sub])
    kind[sub] = np.where(take, KINDS.index(k), kind[sub])


# (in front: the small ones, the lowest row first)
Rs = WAVES["s"][0]
for kk in range(int((SEA_FRONT + Rs) / (Rs / 2)), -1, -1):
    for xc in np.arange(-Rs + (kk % 2) * Rs, DW + 2 * Rs, 2 * Rs):
        wave_at(float(xc), SEA_FRONT - kk * Rs / 2, "s")
# (behind: the swells, big, middling, middling, big…, each a little over the next, the middling in front of the big; the run centred on
# the design, so its two ends go under the border alike)
SWELLS = "mbmmbmmbmmbm"
swells, x = [], 0.0
for i, k in enumerate(SWELLS):
    if i:
        x += 0.80 * (WAVES[SWELLS[i - 1]][0] + WAVES[k][0])
    swells.append((x, k))
shift = DW / 2 - (swells[0][0] + swells[-1][0]) / 2
swells = [(xc + shift, k) for xc, k in swells]
for k in "mb":
    for xc, kk in swells:
        if kk == k:
            wave_at(xc, SEA_BACK, k)
sea = inside(dist - size) * (kind >= 0)
wl = np.zeros_like(sea)
for i, (R, rings, heart, w) in enumerate(WAVES.values()):
    mk = inside(dist - heart * R)
    for f in rings:
        mk = np.maximum(mk, line_at(dist - f * R, w))
    wl = np.where(kind == i, mk, wl)
rug = mix(rug, CREAM, sea)
rug = mix(rug, INDIGO, wl * sea)

# (the clouds (item 701, the owner's 「雲可以再生動些…可以再多點樣式」: three flat round-ended bars of mist, the broad two stepped, were
# circled): each its own kind, in the manner of the old patterns: a long band of mist (すやり霞) across the mountain's left flank in three
# tiers, its broad one rolled up at its end into a scroll and its top one at its other; an auspicious cloud (瑞雲) over the right flank,
# its billows heaped on a long foot, curls in the big ones, a tail streaming off under the sun; a small one high up on the left, its tail
# the other way; a wisp across the sun trailing off thin from a curl. Cream, an indigo line round each, their curls' lines finer)
def kasumi(tiers, inner=()):
    """a band of mist in tiers, one shape: each tier (x0, x1, y, r, curl, head) round at its ends, or rolled up at one (`curl` 'l' or 'r')
    into a scroll: a round head, `head` its radius, sat on the band's foot and standing up over it, its line winding in; `inner`
    ((x0, x1, y, r), ...) finer bands' lines inside it"""
    shape, lines, dots = np.full(DX.shape, FAR, np.float32), [], []
    for x0, x1, y, r, curl, head in tiers:
        sd = stadium(x0, x1, y, r)
        if curl:
            hx, hy = (x1 + r - head if curl == "r" else x0 - r + head), y - r + head
            sd = np.minimum(sd, disc(hx, hy, head))
            d, eye = spiral(hx, hy, head - LINE * 1.5, head * 0.2, 1.35, math.radians(160 if curl == "r" else 20), cw=curl == "r")
            lines.append((d, FINE))
            dots.append((eye[0], eye[1], FINE * 1.1))
        shape = np.minimum(shape, sd)
    for x0, x1, y, r in inner:
        lines.append((stadium(x0, x1, y, r), FINE))
    paint(shape, lines, dots)


def zuiun(foot, billows, tail=None):
    """an auspicious cloud: round billows (x, y, r, curl) heaped on a long low foot (x0, x1, y, r), each with `curl` ('cw' or 'ccw') a
    spiral in it peeling off its outline at its top and winding in, over the foot; `tail` (points, r0, r1) a stroke streaming off it"""
    fx0, fx1, fy, fr = foot
    shape, lines, dots = stadium(fx0, fx1, fy, fr), [], []
    for bx, by, br, c in billows:
        shape = np.minimum(shape, disc(bx, by, br))
        if c:
            d, eye = spiral(bx, by + 0.25 * br, 0.75 * br - LINE * 0.7, br * 0.18, 1.2, math.pi / 2, cw=c == "cw")
            lines.append((d, FINE))
            dots.append((eye[0], eye[1], FINE * 1.1))
    if tail:
        shape = np.minimum(shape, stroke(*tail))
    lines.append((stadium(fx0 + 0.012, fx1 - 0.004, fy - 0.0015, fr - 0.0072), FINE))
    paint(shape, lines, dots)


kasumi([(0.066, 0.470, 0.272, 0.016, "r", 0.024), (0.118, 0.330, 0.298, 0.011, "l", 0.0145), (0.215, 0.405, 0.250, 0.0095, None, 0)],
       inner=[(0.082, 0.425, 0.272, 0.0076)])
zuiun((0.565, 0.790, 0.372, 0.011), [(0.598, 0.392, 0.024, "ccw"), (0.642, 0.398, 0.032, "cw"), (0.693, 0.394, 0.025, "cw"),
                                     (0.733, 0.382, 0.017, None)],
      (curve((0.782, 0.372), (0.815, 0.362), (0.840, 0.372), (0.858, 0.364), n=14), 0.011, 0.0035))
zuiun((0.115, 0.235, 0.575, 0.008), [(0.140, 0.590, 0.016, "ccw"), (0.175, 0.594, 0.021, "cw"), (0.211, 0.589, 0.015, "cw")],
      (curve((0.122, 0.575), (0.100, 0.566), (0.083, 0.575), (0.072, 0.568), n=12), 0.008, 0.0028))
# (the wisp across the sun: from a curl on its left, thinning out to its right)
wisp = stroke(curve((0.652, 0.521), (0.740, 0.536), (0.820, 0.512), (0.872, 0.525), n=20), 0.0072, 0.0020)
d, eye = spiral(0.6465, 0.5243, 0.0105 - LINE * 1.5, 0.0021, 1.3, math.radians(20), cw=False)
paint(np.minimum(wisp, disc(0.6465, 0.5243, 0.0105)), [(d, FINE)], [(eye[0], eye[1], FINE * 1.1)])


# (plovers (千鳥, item 701: more kinds of thing in it, 波に千鳥 as the old patterns have them): three on the wing over the waves in the open
# sky at the right, under the auspicious cloud, flying in toward the mountain; indigo: a round head with a short beak, a plump body
# tapering to its tail, both wings raised)
def plover(x, y, s, a=0.0, left=False):
    """a plover flying right (or left), `s` its size, `a` its tilt (radians, up the way it flies): its signed distance"""
    ca, sa, f = math.cos(a), math.sin(a), -1 if left else 1

    def at(u, v):
        return (x + f * (u * ca - v * sa) * s, y + (u * sa + v * ca) * s)
    parts = [stroke([at(-0.50, 0.02), at(0.28, 0.06)], 0.24 * s, 0.37 * s),          # (its body, plump in front)
             stroke([at(-0.45, 0.04), at(-0.98, 0.18)], 0.13 * s, 0.03 * s),         # (its tail)
             disc(*at(0.56, 0.34), 0.26 * s),                                         # (its head)
             stroke([at(0.78, 0.37), at(1.00, 0.31)], 0.07 * s, 0.02 * s),           # (its beak)
             stroke(curve(at(-0.06, 0.28), at(-0.10, 0.86), at(-0.56, 1.10), n=8), 0.25 * s, 0.07 * s),   # (the near wing, up and back)
             stroke(curve(at(0.20, 0.32), at(0.34, 0.80), at(0.10, 1.06), n=8), 0.17 * s, 0.05 * s)]      # (the far one)
    return np.minimum.reduce(parts)


for px, py, ps, pa in ((0.842, 0.208, 0.020, 0.12), (0.786, 0.238, 0.017, 0.22), (0.822, 0.268, 0.014, 0.05)):
    paint(plover(px, py, ps, pa, left=True), col=INDIGO)

# (the vermilion frame round the field, a hair in from the border)
frame = inside(np.abs(edge - (B + 0.007)) - 0.0011)
rug = mix(rug, SHU, frame)
# (the border: indigo, a cream line near its edge and one along its inside, a cream plum crest with a vermilion heart in each corner)
bord = inside(edge - B)
cl = np.maximum(inside(np.abs(edge - 0.0095) - 0.0011), inside(np.abs(edge - (B - 0.0045)) - 0.0008))
rug = mix(rug, INDIGO, bord)
rug = mix(rug, CREAM, cl * bord)
plum = np.zeros_like(bord)
heart = np.zeros_like(bord)
for cx, cy in ((B / 2, B / 2), (DW - B / 2, B / 2), (B / 2, DH - B / 2), (DW - B / 2, DH - B / 2)):
    for i in range(5):
        a = math.pi / 2 + i * 2 * math.pi / 5
        plum = np.maximum(plum, inside(np.hypot(DX - cx - 0.0088 * math.cos(a), DY - cy - 0.0088 * math.sin(a)) - 0.0071))
    heart = np.maximum(heart, inside(np.hypot(DX - cx, DY - cy) - 0.0034))
rug = mix(rug, CREAM, plum * bord)
rug = mix(rug, SHU, heart * bord)

# (hooked: a groove where one colour's pile meets another's; the dye a little uneven, the indigo more; the pile itself soft and a little
# uneven, its loops (3 mm) too fine to see from where the shop's looked at, and left out: drawn, they made its pictures three times the size)
# (the grooves from the picture itself: where its colour changes, so nothing under the border shows through as a groove)
groove = np.sum(np.abs(rug - np.roll(rug, 1, 0)) + np.abs(rug - np.roll(rug, 1, 1)), axis=-1)
groove = np.clip(groove * 2.5, 0, 1)
groove = np.clip((groove + np.roll(groove, 1, 0) + np.roll(groove, -1, 0) + np.roll(groove, 1, 1) + np.roll(groove, -1, 1)) / 2.2, 0, 1)
mott = fbm(TW, 6, 6, 3)[:TH, :TW]
dark = 1.0 - 0.6 * (np.mean(rug, axis=-1) < 0.35)
rug = rug * (0.955 + 0.075 * mott * (2 - dark))[..., None]
rug = rug * (1 - 0.16 * groove)[..., None]
RUG_TEX = image("genkan_rug", np.clip(rug, 0, 1).astype(np.float32))
pile = fbm(TW, 24, 24, 3)[:TH, :TW]
rh = 0.5 + 0.10 * pile - 0.45 * groove + 0.10 * bord
RUG_NRM = image("genkan_rug_nrm", to_normal(rh, 2.0).astype(np.float32), data=True)

M = {
    "rug": pbr("GenkanRug", (1, 1, 1), tex=RUG_TEX, nrm=RUG_NRM, nrm_strength=0.8, rough=0.95),
    "stone": pbr("GenkanStone", (1, 1, 1), tex=STONE_TEX, nrm=STONE_NRM, nrm_strength=0.6, rough=0.7),
    "pebble": pbr("GenkanPebble", (1, 1, 1), tex=PEB_TEX, nrm=PEB_NRM, nrm_strength=0.8, rough=0.85),
    "wood": pbr("GenkanKeyaki", (1, 1, 1), tex=WOOD_TEX, nrm=WOOD_NRM, nrm_strength=0.4, rough=0.3),
}

parts = []


def new_obj(name, bm, mat, smooth_shade=False):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(M[mat])
    for poly in o.data.polygons:
        poly.use_smooth = smooth_shade
    parts.append(o)
    return o


# ------------------------------------------------------------------------------------------------ geometry helpers (convex polygons in x, z)
def clip(poly, a, b, c):
    """the part of a convex polygon (x, z points) where a*x + b*z <= c"""
    out = []
    n = len(poly)
    for i in range(n):
        p, q = poly[i], poly[(i + 1) % n]
        fp, fq = a * p[0] + b * p[1] - c, a * q[0] + b * q[1] - c
        if fp <= 0:
            out.append(p)
        if (fp < 0 < fq) or (fq < 0 < fp):
            t = fp / (fp - fq)
            out.append((p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t))
    return out


def inset(poly, d):
    """a convex polygon (counter-clockwise in x, z) with each edge moved in by d"""
    out = []
    n = len(poly)
    lines = []
    for i in range(n):
        p, q = poly[i], poly[(i + 1) % n]
        ex, ez = q[0] - p[0], q[1] - p[1]
        L = math.hypot(ex, ez) or 1e-9
        nx, nz = -ez / L, ex / L          # inward for counter-clockwise
        lines.append((p[0] + nx * d, p[1] + nz * d, ex, ez))
    for i in range(n):
        x1, z1, dx1, dz1 = lines[i - 1]
        x2, z2, dx2, dz2 = lines[i]
        den = dx1 * dz2 - dz1 * dx2
        if abs(den) < 1e-12:
            out.append((x2, z2))
            continue
        t = ((x2 - x1) * dz2 - (z2 - z1) * dx2) / den
        out.append((x1 + dx1 * t, z1 + dz1 * t))
    return out


def ccw(poly):
    a = sum(poly[i][0] * poly[(i + 1) % len(poly)][1] - poly[(i + 1) % len(poly)][0] * poly[i][1] for i in range(len(poly)))
    return poly if a > 0 else poly[::-1]


def slab(bm, outline, top, foot, chamfer, uvl, col, tile, uv_off, dome=0.0, tilt=(0.0, 0.0)):
    """a stone: its outline (convex, x, z), its top at `top` (a little domed toward its middle, a little tilted), a chamfer of `chamfer` in and
    down round its top, its sides straight down to `foot`; its picture laid from above (`tile`, moved by `uv_off`), its tint `col`"""
    outline = ccw(outline)
    inner = inset(outline, chamfer)
    cx = sum(p[0] for p in outline) / len(outline)
    cz = sum(p[1] for p in outline) / len(outline)
    rad = max(math.hypot(p[0] - cx, p[1] - cz) for p in outline) or 1

    def h(x, z, base):
        d = math.hypot(x - cx, z - cz) / rad
        return base + dome * (1 - d * d) + tilt[0] * (x - cx) + tilt[1] * (z - cz)

    top_v = [bm.verts.new(P(x, h(x, z, top), z)) for x, z in inner]
    rim_v = [bm.verts.new(P(x, h(x, z, top) - chamfer * 0.7, z)) for x, z in outline]
    foot_v = [bm.verts.new(P(x, foot, z)) for x, z in outline]
    faces = []
    faces.append(bm.faces.new(top_v))
    n = len(outline)
    for i in range(n):
        j = (i + 1) % n
        faces.append(bm.faces.new((rim_v[i], rim_v[j], top_v[j], top_v[i])))
        faces.append(bm.faces.new((foot_v[i], foot_v[j], rim_v[j], rim_v[i])))
    for f in faces:
        f.normal_update()
        if f.normal.z < -0.5:
            f.normal_flip()
        for loop in f.loops:
            co = loop.vert.co
            # (game x = blender x, game z = -blender y, game y = blender z)
            gx, gz, gy = co.x, -co.y, co.z
            if abs(f.normal.z) > 0.6:
                loop[uvl["uv"]].uv = (gx / tile + uv_off[0], gz / tile + uv_off[1])
            else:
                # (the sides: along the edge and down)
                loop[uvl["uv"]].uv = ((gx + gz) / tile + uv_off[0], gy / tile * 3 + uv_off[1])
            loop[uvl["col"]] = (*col, 1.0)
    return faces


def drop_at(e):
    """how far down a stone's top lies at `e` in from its edge: a quarter circle of radius ROUND, steep at the edge, level from ROUND in"""
    if e >= ROUND:
        return 0.0
    t = 1.0 - e / ROUND
    return ROUND * (1.0 - math.sqrt(max(0.0, 1.0 - t * t)))


def pillow(bm, outline, top, foot, uvl, col, tile, uv_off, dome, tilt):
    """a stone worn round: its outline (convex, x, z) down to `foot` straight, then its top in a few rings in from the edge (RINGS), each
    ring's points at the height of the stone's dome there less the edge's rounding (drop_at), the last ring closed flat (a ladder on export);
    shaded smooth; its picture laid from above (`tile`, moved by `uv_off`), its tint `col`"""
    outline = ccw(outline)
    cx = sum(p[0] for p in outline) / len(outline)
    cz = sum(p[1] for p in outline) / len(outline)
    rad = max(math.hypot(p[0] - cx, p[1] - cz) for p in outline) or 1
    n = len(outline)
    rings = [outline]
    for e in RINGS[1:]:
        r = inset(outline, e)
        # (a ring that has run past a short edge: no longer the same way round as the outline: leave it and the ones in from it)
        ok = len(r) == n and all((r[(i + 1) % n][0] - r[i][0]) * (outline[(i + 1) % n][0] - outline[i][0])
                                 + (r[(i + 1) % n][1] - r[i][1]) * (outline[(i + 1) % n][1] - outline[i][1]) > 1e-9 for i in range(n))
        if not ok:
            break
        rings.append(r)
    ring_v = []
    for k, r in enumerate(rings):
        e = RINGS[k]
        ring_v.append([bm.verts.new(P(x, top + dome * (1 - (math.hypot(x - cx, z - cz) / rad) ** 2) + tilt[0] * (x - cx) + tilt[1] * (z - cz)
                                      - drop_at(e), z)) for x, z in r])
    foot_v = [bm.verts.new(P(x, foot, z)) for x, z in outline]
    sides, tops = [], []
    for i in range(n):
        j = (i + 1) % n
        sides.append(bm.faces.new((foot_v[i], foot_v[j], ring_v[0][j], ring_v[0][i])))
        for k in range(len(rings) - 1):
            tops.append(bm.faces.new((ring_v[k][i], ring_v[k][j], ring_v[k + 1][j], ring_v[k + 1][i])))
    cap = bm.faces.new(ring_v[-1])
    tops.append(cap)
    cen = Vector(P(cx, 0, cz))
    for f in sides + tops:
        f.normal_update()
        if f in sides:
            c = f.calc_center_median() - cen
            want = f.normal.x * c.x + f.normal.y * c.y > 0
        else:
            want = f.normal.z > 0
        if not want:
            f.normal_flip()
        for loop in f.loops:
            co = loop.vert.co
            gx, gz, gy = co.x, -co.y, co.z
            if f in tops:
                loop[uvl["uv"]].uv = (gx / tile + uv_off[0], gz / tile + uv_off[1])
            else:
                loop[uvl["uv"]].uv = ((gx + gz) / tile + uv_off[0], gy / tile * 3 + uv_off[1])
            loop[uvl["col"]] = (*col, 1.0)
    return sides + tops


def layers(bm):
    return {"uv": bm.loops.layers.uv.verify(), "col": bm.loops.layers.color.new("Col")}


# ------------------------------------------------------------------------------------------------ the stones: crazy paving
SX0, SX1 = X0 + K_FRONT + 0.004, X1
SZ0, SZ1 = Z0 + K_FRONT + 0.004, SILL["z"][0] - 0.004
# (seeds: a jittered spread, none too near another, so the stones come out a hand or two across, none a sliver)
seeds = []
tries = 0
while len(seeds) < 15 and tries < 6000:
    tries += 1
    p = (rng.uniform(SX0, SX1), rng.uniform(SZ0, SZ1))
    if all(math.hypot(p[0] - q[0], p[1] - q[1]) > 0.27 for q in seeds):
        seeds.append(p)
rect = [(SX0, SZ0), (SX1, SZ0), (SX1, SZ1), (SX0, SZ1)]
TINTS = [(1.0, 1.0, 1.0), (1.02, 0.94, 0.84), (0.84, 0.88, 0.94), (0.9, 0.88, 0.86), (0.66, 0.65, 0.66), (0.5, 0.5, 0.53)]
bm = bmesh.new()
L = layers(bm)
n_st = 0
for i, s in enumerate(seeds):
    cell = rect
    for j, q in enumerate(seeds):
        if i == j:
            continue
        # (nearer s than q, less half a joint: the perpendicular bisector moved toward s)
        a, b = q[0] - s[0], q[1] - s[1]
        L2 = math.hypot(a, b)
        c = (q[0] ** 2 + q[1] ** 2 - s[0] ** 2 - s[1] ** 2) / 2 - JOINT * L2
        cell = clip(cell, a, b, c)
        if len(cell) < 3:
            break
    if len(cell) < 3:
        continue
    # (half a joint in from the rect's edges too, where the stones meet the beam, the walls and the threshold)
    cell = clip(cell, -1, 0, -(SX0 + JOINT))
    cell = clip(cell, 1, 0, SX1 - JOINT)
    cell = clip(cell, 0, -1, -(SZ0 + JOINT))
    cell = clip(cell, 0, 1, SZ1 - JOINT)
    # (no corner sharper than the eye takes for a cut stone: points closer than 1.5 cm merged)
    merged = []
    for p in cell:
        if not merged or math.hypot(p[0] - merged[-1][0], p[1] - merged[-1][1]) > 0.015:
            merged.append(p)
    if len(merged) > 3 and math.hypot(merged[0][0] - merged[-1][0], merged[0][1] - merged[-1][1]) < 0.015:
        merged.pop()
    if len(merged) < 3:
        continue
    tint = TINTS[int(rng.integers(0, len(TINTS) - 1))] if rng.random() > 0.2 else TINTS[-1]
    # (item 563: drawn untinted, as the owner has seen them since 11-18: the export put each stone's tint where the game doesn't read it
    # (item 443 fixed that), so made again they'd all change colour; the draws above kept, so the stones lie where they did)
    tint = (1.0, 1.0, 1.0)
    pillow(bm, merged, FLOOR + 0.004 + rng.uniform(-0.001, 0.001), MORTAR_Y, L, tint, 0.65, (rng.random(), rng.random()),
           dome=DOME, tilt=(rng.uniform(-0.004, 0.004), rng.uniform(-0.004, 0.004)))
    n_st += 1
stones = new_obj("GenkanStones", bm, "stone", smooth_shade=True)
print("GENKAN_STONES", n_st)

# ------------------------------------------------------------------------------------------------ the pebble-wash under them
bm = bmesh.new()
L = layers(bm)
quad = [bm.verts.new(P(x, MORTAR_Y, z)) for x, z in ((SX0 - 0.002, SZ0 - 0.002), (SX1, SZ0 - 0.002), (SX1, Z1), (SX0 - 0.002, Z1))]
f = bm.faces.new(quad)
f.normal_update()
if f.normal.z < 0:
    f.normal_flip()
for loop in f.loops:
    loop[L["uv"]].uv = (loop.vert.co.x / 0.28, -loop.vert.co.y / 0.28)
    loop[L["col"]] = (1, 1, 1, 1)
mortar = new_obj("GenkanMortar", bm, "pebble")

# ------------------------------------------------------------------------------------------------ the shoe-off stone and the threshold
def rug_slab(bm, rect, top, foot, rim, round_, uvl):
    """the rug: a rectangle, its edge taken off in two steps (`rim` down at its edge, half of `round_` in, then the flat top), straight sides
    down to `foot`; its picture laid across the whole top (edges clamped into it), white points"""
    (x0, x1), (z0, z1) = rect
    rings = [(0.0, top - rim), (round_ * 0.45, top - rim * 0.28), (round_, top)]
    ring_v = [[bm.verts.new(P(x, h, z)) for x, z in ((x0 + e, z0 + e), (x1 - e, z0 + e), (x1 - e, z1 - e), (x0 + e, z1 - e))] for e, h in rings]
    foot_v = [bm.verts.new(P(x, foot, z)) for x, z in ((x0, z0), (x1, z0), (x1, z1), (x0, z1))]
    faces = []
    for i in range(4):
        j = (i + 1) % 4
        faces.append(("side", bm.faces.new((foot_v[i], foot_v[j], ring_v[0][j], ring_v[0][i]))))
        for k in range(len(rings) - 1):
            faces.append(("top", bm.faces.new((ring_v[k][i], ring_v[k][j], ring_v[k + 1][j], ring_v[k + 1][i]))))
    faces.append(("top", bm.faces.new(ring_v[-1])))
    cen = Vector(P((x0 + x1) / 2, 0, (z0 + z1) / 2))
    for kind, f in faces:
        f.normal_update()
        if kind == "side":
            c = f.calc_center_median() - cen
            want = f.normal.x * c.x + f.normal.y * c.y > 0
        else:
            want = f.normal.z > 0
        if not want:
            f.normal_flip()
        for loop in f.loops:
            co = loop.vert.co
            gx, gz = co.x, -co.y
            uu = min(max((gx - x0) / (x1 - x0), 0.003), 0.997)
            vv = min(max(1.0 - (gz - z0) / (z1 - z0), 0.003), 0.997)
            loop[uvl["uv"]].uv = (uu, vv)
            loop[uvl["col"]] = (1.0, 1.0, 1.0, 1.0)


bm = bmesh.new()
L = layers(bm)
rug_slab(bm, (RUG["x"], RUG["z"]), RUG["top"], RUG["foot"], RUG["rim"], RUG["round"], L)
rug = new_obj("GenkanRug", bm, "rug", smooth_shade=False)
bm = bmesh.new()
L = layers(bm)
slab(bm, [(SILL["x"][0], SILL["z"][0]), (SILL["x"][1], SILL["z"][0]), (SILL["x"][1], SILL["z"][1]), (SILL["x"][0], SILL["z"][1])], SILL["top"],
     MORTAR_Y, 0.005, L, (1.0, 1.0, 1.0), 0.65, (0.12, 0.4))      # (untinted, as the stones: item 563)
sill = new_obj("GenkanSill", bm, "stone")

# ------------------------------------------------------------------------------------------------ the step's beam (上框)
# (its profile across the edge: from under the room's boards out to its rounded top front edge and down its face to the stones)
prof = [(K_BACK, K_FOOT), (K_BACK, K_TOP)]
for k in range(4):
    a = math.pi / 2 * k / 3
    prof.append((K_FRONT - K_ROUND + math.sin(a) * K_ROUND, K_TOP - K_ROUND + math.cos(a) * K_ROUND))
prof.append((K_FRONT, K_FOOT))
bm = bmesh.new()
L = layers(bm)


def run(points_at):
    """one run of the beam: `points_at(u, y)` gives (start, end) in x, z for each profile point; a strip between each two of them"""
    ring_a = [bm.verts.new(P(*points_at(pu, py)[0], )) for pu, py in prof]
    ring_b = [bm.verts.new(P(*points_at(pu, py)[1], )) for pu, py in prof]
    faces = []
    for i in range(len(prof) - 1):
        faces.append(bm.faces.new((ring_a[i], ring_b[i], ring_b[i + 1], ring_a[i + 1])))
    return faces, ring_a, ring_b


# (along the room side, z = Z0, from the corner (mitred: its end on the diagonal x - X0 = z - Z0) to the side wall)
fa, ra, rb = run(lambda pu, py: ((X0 + pu, py, Z0 + pu), (X1, py, Z0 + pu)))
# (along the till side, x = X0, from the corner to the door's end)
fb, sa, sb = run(lambda pu, py: ((X0 + pu, py, Z0 + pu), (X0 + pu, py, Z1)))
for f in fa + fb:
    f.normal_update()
# (each face outward: away from the beam's middle line)
for f, mid in [(f, Vector(P(X0 + (K_BACK + K_FRONT) / 2, (K_TOP + K_FOOT) / 2, 0))) for f in fa] + [(f, None) for f in fb]:
    c = f.calc_center_median()
    if mid is not None:
        out = Vector((0, c.y - P(0, 0, Z0 + (K_BACK + K_FRONT) / 2).y, c.z - (K_TOP + K_FOOT) / 2))
    else:
        out = Vector((c.x - (X0 + (K_BACK + K_FRONT) / 2), 0, c.z - (K_TOP + K_FOOT) / 2))
    if f.normal.dot(out) < 0:
        f.normal_flip()
for f in fa + fb:
    for loop in f.loops:
        co = loop.vert.co
        gx, gz, gy = co.x, -co.y, co.z
        along = gx if f in fa else gz
        across = gy if abs(f.normal.z) < 0.6 else (gz if f in fa else gx)
        loop[L["uv"]].uv = (along / 0.5, across / 0.12)
        loop[L["col"]] = (1, 1, 1, 1)
kamachi = new_obj("GenkanKamachi", bm, "wood")

# ------------------------------------------------------------------------------------------------ out
root = bpy.data.objects.new("GenkanRoot", None)
bpy.context.collection.objects.link(root)
for o in parts:
    o.parent = root
tris = {o.name: sum(len(p.vertices) - 2 for p in o.data.polygons) for o in parts}
print("GENKAN_TRIS", tris, sum(tris.values()))
if PREVIEW:
    cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam"))
    bpy.context.collection.objects.link(cam)
    cam.location = P(0.2, 0.9, 4.3)
    look = P(1.05, -0.1, 3.0)
    cam.rotation_euler = (look - cam.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = cam
    sun = bpy.data.objects.new("Sun", bpy.data.lights.new("Sun", "SUN"))
    sun.data.energy = 3.0
    sun.rotation_euler = (0.6, 0.2, 0.8)
    bpy.context.collection.objects.link(sun)
export_dish(root, [root] + parts, os.path.join(PROJECT, "public", "models", "genkanfloor.glb"), os.path.join(PROJECT, "blender", "genkanfloor.blend"), PREVIEW)
print("GENKAN_DONE")
