"""The waiting bench in the genkan (bench.glb; the owner's, 2026-11-09: somewhere for those who come in with every stool taken to sit and wait
their turn). Made over in bamboo (item 439, the owner's, 2026-11-21: 「候位長凳才是坐墊位置為竹蓆，也就是老闆後面那個小櫃原本的風格，骨架則是
竹子」: a hinoki bench as a joiner makes one before): its seat a mat of split bamboo woven 網代 (the serving counter's own weave of items 254
and 286), set in a frame of culms; four culm legs, culm stretchers low between them at the ends and along the back, a binding of rattan
round each leg's head where it meets the frame. Its size as before (the sitters sit where they did). Braced as a long bench must be (item
449, the owner's, 2026-11-21: 「你的等候椅底下太空了，會不會垮?」: four thin legs at its ends and the long middle bare under it): six
legs, a pair at its middle as at its ends, the front three set in from the seat's front edge (clear of the sitters' calves), three
bearers under the mat on them; under the frame a second rail along the front and the back from leg to leg, low down long stretchers (貫)
front and back and three across lower still (as a joiner offsets them), thicker culms; about 800 triangles.

The game's frame: y up from the floor, x along the bench, z across it; its middle at the origin; SEAT_H the seat's top, LENGTH long, DEPTH
deep (the people's units: the game draws it at the people's scale, the same every way).

Run:
    blender -b --factory-startup --python blender/bench.py -- <project path> [preview.png]
"""
import math
import os
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import active, export_dish, fbm, grid01, image, mix, pbr, seed, smooth, vnoise  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
PROJECT = argv[0] if argv else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PREVIEW = argv[1] if len(argv) > 1 else None
bpy.ops.wm.read_factory_settings(use_empty=True)

# (its size as the owner set it (items 214, 379): 0.86 long, 0.24 deep against the wall at BACK, its seat's top 0.29)
LENGTH, DEPTH, SEAT_H = 0.86, 0.24, 0.29
BACK = -0.14
MID = BACK + DEPTH / 2
FR = 0.014                # the seat frame's culms' radius
LR = 0.018                # the legs'
SR = 0.011                # the stretchers' and the mat's bearers'
CULM_TILE = 0.3           # the culm's picture along a culm (two nodes to it)
MAT_TILE = 0.24           # the mat's weave: twenty strips across the picture


def P(x, y, z):
    return Vector((x, -z, y))


def lin(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


N = 512
seed(439)
u, v = grid01(N)
# ---- the culm's skin (the serving counter's, items 254 and 286: aged, yellow-brown, flaking here and there): round it (u), along it (v)
base = np.array((0.80, 0.64, 0.38), np.float32)
culm = base[None, None, :] * ((0.86 + 0.18 * fbm(N, 3, 10, 4)) * (0.95 + 0.05 * np.sin((u * 26 + (fbm(N, 4, 2, 3) - 0.5) * 1.2) * 2 * math.pi)))[..., None]
culm = mix(culm, (0.42, 0.3, 0.17), smooth(0.9, 0.96, vnoise(N, 180, 180)) * smooth(0.55, 0.8, fbm(N, 8, 8, 3)) * 0.8)
flake = fbm(N, 5, 14, 4)
culm = mix(culm, (0.88, 0.8, 0.62), smooth(0.76, 0.79, flake) * 0.85)
culm = mix(culm, (0.5, 0.37, 0.21), np.clip(smooth(0.73, 0.76, flake) - smooth(0.76, 0.79, flake), 0, 1) * 0.55)
for c0 in (0.25, 0.75):
    d = v - c0
    culm = mix(culm, (0.94, 0.86, 0.66), np.exp(-((d - 0.014) / 0.008) ** 2) * 0.55)
    culm = mix(culm, (0.55, 0.42, 0.25), np.exp(-((d + 0.02) / 0.016) ** 2) * 0.35)
    culm = mix(culm, (0.32, 0.22, 0.12), np.exp(-(d / 0.006) ** 2) * 0.9)
# ---- the mat (網代): split strips woven two over two under, each row a step on, so the weave runs in diagonals; each strip its own tone,
# rounded across (lit down its middle), fibres along it, the one on top over the crossing a shade lighter, a thin dark gap between strips
S_ = 20
fx, fy = u * S_, v * S_
ix, iy = np.floor(fx).astype(int), np.floor(fy).astype(int)
ax, ay = fx - ix, fy - iy
up = ((ix - iy) % 4) < 2                       # (the strip running up it on top here, else the one across)
rs = np.random.default_rng(439)
tone_c, tone_r = 0.84 + 0.22 * rs.random(S_ + 1), 0.84 + 0.22 * rs.random(S_ + 1)
t_ = np.where(up, tone_c[ix % S_], tone_r[iy % S_])
across = np.where(up, ax, ay)                 # (across the strip on top)
along = np.where(up, fy, fx)                  # (along it)
round_ = 0.72 + 0.28 * np.sin(np.pi * np.clip(across, 0, 1)) ** 0.7
gap = smooth(0.0, 0.08, across) * smooth(0.0, 0.08, 1 - across)
fib = 0.95 + 0.05 * np.sin((along * 6 + across * 0.5) * 2 * math.pi)
# (where the strip on top dives under the next crossing, a shade darker: the weave's relief)
dive = np.where(up, ay, ax)
shade = 0.86 + 0.14 * np.sin(np.pi * np.clip(dive, 0, 1))
mat_rgb = base[None, None, :] * (t_ * round_ * fib * shade * (0.35 + 0.65 * gap))[..., None]
mat_rgb = mix(mat_rgb, (0.88, 0.8, 0.62), smooth(0.8, 0.84, fbm(N, 6, 18, 4)) * 0.4 * gap)
# ---- (item 791, the owner's 「關節處都要有綁的痕跡，用貼圖表現即可」) the culms' skin an atlas, not the one tile repeated: each culm its own
# strip (SW columns round it, AH rows down STRIP_LEN of it), its skin the tile above shrunk round to SW columns (averaged: its fine stripes
# round it would only shimmer at 32), and wherever another culm meets it (a leg and a rail, a stretcher, an end, a bearer) a binding of
# rattan painted round it there, wound in a helix, each turn rounded and a dark seam between, darker at its two edges: drawn where each
# joint is on that culm, so no new faces and no other material (painted once all the culms are made: paint_atlas)
NSTRIP, SW, AH = 32, 32, 1024
STRIP_LEN = 0.9
culm_small = culm.reshape(N, SW, N // SW, 3).mean(axis=2)
strips = []
culm_img = image("bench_culm", np.zeros((AH, NSTRIP * SW, 3), np.float32))
M = {
    "culm": pbr("BenchCulm", (1, 1, 1), tex=culm_img, rough=0.55),
    "mat": pbr("BenchMat", (1, 1, 1), tex=image("bench_mat", np.clip(mat_rgb, 0, 1).astype(np.float32)), rough=0.6),
    "rattan": pbr("BenchRattan", lin("#9a6a3c"), rough=0.6),
}
parts = []


def culm_part(name, a, b, r, segs=8, turn=0.0, mat="culm", bands=()):
    """a round culm from a to b (the game's frame), capped; its picture round it and along it, turned round its length by `turn`; a culm's
    its own strip of the atlas (round it across the strip, along it down it from a), `bands` where it's bound (metres from a, (from, to))"""
    a, b = Vector(a), Vector(b)
    length = (b - a).length
    w = (b - a).normalized()
    t = Vector((0, 1, 0)) if abs(w.y) < 0.9 else Vector((1, 0, 0))
    e1 = w.cross(t).normalized()
    e2 = w.cross(e1).normalized()
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new("UVMap")
    rings = [[bm.verts.new(P(*(end + (e1 * math.cos(2 * math.pi * k / segs + turn) + e2 * math.sin(2 * math.pi * k / segs + turn)) * r)))
              for k in range(segs)] for end in (a, b)]
    off = (turn * 0.37) % 1.0
    if mat == "culm":
        i = len(strips)
        assert i < NSTRIP and length < STRIP_LEN, (name, i, length)
        strips.append((i, length, tuple(bands), off))
        U = lambda f_: (i + f_) / NSTRIP  # noqa: E731
        v0, v1, uc = 0.0, length / STRIP_LEN, U(0.5)
    else:
        U = lambda f_: f_  # noqa: E731
        v0, v1, uc = off, off + length / CULM_TILE, 0.5
    for k in range(segs):
        k2 = (k + 1) % segs
        f = bm.faces.new((rings[0][k], rings[0][k2], rings[1][k2], rings[1][k]))
        u0, u1 = U(k / segs), U((k + 1) / segs)
        for loop, (uu, vv) in zip(f.loops, ((u0, v0), (u1, v0), (u1, v1), (u0, v1))):
            loop[uvl].uv = (uu, vv)
    for ring, flip, vv in ((rings[0], True, v0), (rings[1], False, v1)):
        f = bm.faces.new(list(reversed(ring)) if flip else ring)
        for loop in f.loops:
            loop[uvl].uv = (uc, vv)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(M[mat])
    for p_ in o.data.polygons:
        p_.use_smooth = len(p_.vertices) == 4
    parts.append(o)
    return o


def slab(name, x0, x1, y0, y1, z0, z1, mat, tile):
    """a flat box, its top's picture at its true size"""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for vv in bm.verts:
        vv.co = P((x0 + x1) / 2 + vv.co.x * (x1 - x0), (y0 + y1) / 2 + vv.co.z * (y1 - y0), (z0 + z1) / 2 - vv.co.y * (z1 - z0))
    uvl = bm.loops.layers.uv.new("UVMap")
    for f in bm.faces:
        for loop in f.loops:
            c = loop.vert.co
            loop[uvl].uv = (c.x / tile, c.y / tile)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(M[mat])
    parts.append(o)
    return o


# ---- the seat: its frame of culms (along its front and back, across its ends between them), the woven mat set in it a little below
# their tops, on two bearers across under it
ZB, ZF = BACK + FR, BACK + DEPTH - FR
XE = LENGTH / 2 - FR
YF = SEAT_H - FR
# (where its parts are, and so where they meet (item 791: a binding painted round each culm at each): the legs (and the bearers over the front
# three) along it; the front three's line, the back three's (as near the wall as their bindings let them: none into it); the bearers'
# middle, under the mat; the second rail's height, the long stretchers', the cross stretchers' a little lower)
LX = LENGTH / 2 - 0.07
JX = (-LX, 0.0, LX)
ZFL = ZF - 0.03
ZBL = BACK + LR + 0.0026
YBR = SEAT_H - 0.017 - SR
YA = SEAT_H - 0.075
SY = 0.085


# (the rails: unbound (item 788, the owner's 「上面不用」, red rings round the six over its corners and its middle legs: item 791 had them bound
# where each end culm meets them and over each leg and bearer))
for k, zz in enumerate((ZB, ZF)):
    culm_part(f"BenchRail{k}", (-LENGTH / 2, YF, zz), (LENGTH / 2, YF, zz), FR, turn=0.4 + k)
END_L = (ZF - FR - 0.001) - (ZB + FR + 0.001)
for k, sx in enumerate((-1, 1)):
    culm_part(f"BenchEnd{k}", (sx * XE, YF, ZB + FR + 0.001), (sx * XE, YF, ZF - FR - 0.001), FR, turn=1.3 + k)
slab("BenchSeat", -XE + FR + 0.001, XE - FR - 0.001, SEAT_H - 0.017, SEAT_H - 0.007, ZB + FR + 0.001, ZF - FR - 0.001, "mat", MAT_TILE)
# ---- the legs: three pairs, at its ends a little in and at its middle; the back three under the back rail, up to it; the front three
# set in 3 cm from the seat's front edge (the sitters' calves hang there), up to the bearers
BEAR_L = (ZF - FR) - (ZB + FR)
for k, lx in enumerate(JX):
    culm_part(f"BenchBearer{k}", (lx, YBR, ZB + FR), (lx, YBR, ZF - FR), SR, segs=6, turn=2.2 + k)
legs_at = [(lx, ZBL, YF - FR * 0.5) for lx in JX] + [(lx, ZFL, YBR - SR * 0.5) for lx in JX]
for k, (lx, lz, top) in enumerate(legs_at):
    # (bound where the second rail crosses it, and once round both the low stretchers)
    culm_part(f"BenchLeg{k}", (lx, 0.0, lz), (lx, top, lz), LR, turn=0.7 * k + 0.3)
    # (its head's ring of rattan under the frame gone with the frame's bindings (item 788))
# ---- (item 789, the owner's 「下面綁的要有交叉的感覺」 and then 「還是有點怪怪」: painted on the culms the X was a dark smudge, and on the
# stretchers' thin ends a zigzag) each joint below the seat lashed with strips of rattan crossed over it: on the leg's two faces square to
# the culm that meets it, two strips across the joint, one from above it on the one side to below it on the other and one the other way,
# hugging the leg's round (2.5 mm off it, the second over the first where they cross), past the culm's top and its foot; the painted
# turns straight round under them. One mesh, its own material, a lighter rattan than the turns; drawn without the ink line (too thin for
# one: WaitingBench leaves it out)
LASH_W, LASH_SPAN = 0.0055, math.radians(52)
# (items 846, 847, the owner's 「XX的部份可以留，幫我再細緻化，避免錯位」 with his close-up of one, the strip stood off the leg here and sunk
# in there: it went round a circle 2.5 mm out from the leg's corners, and the leg's an octagon (culm_part's 8 sides), its faces' middles
# 1.4 mm further in, the octagon turned its own way on each leg; and the painted turns it lay on, gone now (「原本候位椅的褐色部份拿掉」).
# Each strip now laid on the leg's own faces, LASH_GAP off them all the way, folding at each corner it crosses (a point there, its offset
# mitred), straight across each face as a strap wound on round a prism goes; the one on top lifted LASH_LIFT where it crosses the other,
# down on the face again a strip's width either side)
LASH_GAP, LASH_LIFT = 0.0006, 0.0009
OCT = 8
R_IN = LR * math.cos(math.pi / OCT)
lash = bmesh.new()


def oct_at(lx, lz, turn, a):
    """where a ray from the leg's axis at the angle `a` round it (sin, cos: its x, z) meets the octagon culm_part made of it (turned `turn`:
    its corners at turn + pi + 2 pi k / 8, the game's frame), and the angle of that face's normal"""
    step = 2 * math.pi / OCT
    rel = (a - (turn + math.pi)) % (2 * math.pi)
    k = int(rel // step)
    af = turn + math.pi + (k + 0.5) * step
    rho = R_IN / math.cos(a - af)
    return Vector((lx + rho * math.sin(a), 0.0, lz + rho * math.cos(a))), af


def lash_x(lx, lz, turn, yc, cx, cz, cr, sides=(1, -1)):
    """the X over a joint: the leg at (lx, lz) turned `turn`, the culm meeting it at height yc running along (cx, cz) (a unit vector in the
    floor's plane), cr its radius; on the leg's faces square to it (`sides`: 1 the one whose normal is (-cz, cx)), its arms 5 mm past the
    culm's top and its foot"""
    hy = cr + 0.005
    step = 2 * math.pi / OCT
    for side in sides:
        nx, nz = -cz * side, cx * side
        ac = math.atan2(nx, nz)
        a0, a1 = ac - LASH_SPAN, ac + LASH_SPAN
        # (a point at each end, at each corner between, and at the crossing and a strip's width either side of it, for the lift)
        dl = LASH_W * 0.95 / R_IN
        rel0 = (a0 - (turn + math.pi)) % (2 * math.pi)
        first = a0 - rel0 + (math.floor(rel0 / step) + 1) * step
        corners = []
        c_ = first
        while c_ < a1 - 1e-6:
            corners.append(c_)
            c_ += step
        for k, sgn in enumerate((1, -1)):
            angs = sorted(set([a0, a1] + corners + ([ac - dl, ac, ac + dl] if k else [ac])))
            pts = []
            for a in angs:
                at_corner = any(abs(a - c__) < 1e-9 for c__ in corners)
                b, af = oct_at(lx, lz, turn, a)
                # (off the face along its normal; at a corner, off both faces' planes: along the corner, mitred)
                nrm = Vector((math.sin(a), 0.0, math.cos(a))) / math.cos(math.pi / OCT) if at_corner else Vector((math.sin(af), 0.0, math.cos(af)))
                pts.append([a, b, nrm])
            # (how far along the leg's faces each point is, unrolled: the strip straight on each face)
            run = [0.0]
            for q in range(1, len(pts)):
                run.append(run[-1] + (pts[q][1] - pts[q - 1][1]).length)
            total = run[-1]
            sc = run[angs.index(ac)]
            span_lift = run[angs.index(ac + dl)] - sc if k else 1.0
            rows = []
            spots = []
            for q, (a, b, nrm) in enumerate(pts):
                y = yc + sgn * (-hy + 2 * hy * run[q] / total)
                lift = LASH_LIFT * max(0.0, 1.0 - abs(run[q] - sc) / span_lift) if k else 0.0
                spots.append((Vector((b.x, y, b.z)) + nrm * (LASH_GAP + lift), nrm.normalized()))
            for q, (pt, nrm) in enumerate(spots):
                d = (spots[min(q + 1, len(spots) - 1)][0] - spots[max(q - 1, 0)][0]).normalized()
                w = d.cross(nrm).normalized() * (LASH_W / 2)
                rows.append([lash.verts.new(P(*(pt + w))), lash.verts.new(P(*(pt - w)))])
            for q in range(len(rows) - 1):
                f = lash.faces.new((rows[q][0], rows[q + 1][0], rows[q + 1][1], rows[q][1]))
                # (turned out, away from the leg)
                mid = (spots[q][0] + spots[q + 1][0]) / 2
                f.normal_update()
                out_ = P(*(mid + (spots[q][1] + spots[q + 1][1]) / 2)) - P(*mid)
                if f.normal.dot(out_) < 0:
                    f.normal_flip()
                # (smooth: in flat facets each piece of it took its own shade, a strip round a culm read as a zigzag)
                f.smooth = True


# (item 1003, the owner's 「XX 有點怪，請考究一下綁法」, circling two joints: the stretchers ran through the legs' middles (貫), the X drawn on the
# leg's face over nothing it bound, a stretcher's end coming out through it beside. Bamboo furniture lashed as it's made: each stretcher
# laid against the leg's face where it crosses it, and a cross lashing over the crossing, its strips from above the stretcher on the one
# side diagonally down over its front to below it on the other, round the leg behind, the second the other way: the X's middle on the
# stretcher, its arms on the leg above and below. The long ones along the front against the front legs' faces to the room, along the back
# against the back legs' faces in under the seat (behind them is the wall); across the ends outside the end legs, across the middle beside
# the middle legs; past the last leg OVER, as such a frame's are)
OVER = 0.02
OFF = LR + SR
CROSS_SIDE = [-1 if lx < 0 else 1 for lx in JX]
# ---- a second rail under the frame, along the front and the back from end leg to end leg past the middle one
for k, lz in enumerate((ZBL, ZFL)):
    culm_part(f"BenchApron{k}", (-LX - LR - OVER, YA, lz + OFF), (LX + LR + OVER, YA, lz + OFF), SR, segs=6, turn=5.0 + k)
# ---- the stretchers, low: along the front and the back (貫), and across each end and the middle a little lower (offset, as a joiner
# makes them, so no two meet at one point)
for k, lz in enumerate((ZBL, ZFL)):
    culm_part(f"BenchStretchLong{k}", (-LX - LR - OVER, SY, lz + OFF), (LX + LR + OVER, SY, lz + OFF), SR, segs=6, turn=4.0 + k)
for k, lx in enumerate(JX):
    xs = lx + CROSS_SIDE[k] * OFF
    culm_part(f"BenchStretch{k}", (xs, SY - 0.025, ZBL - LR + 0.003), (xs, SY - 0.025, ZFL + LR + OVER), SR, segs=6, turn=3.1 + k)
LASH_N = 18


def lash_over(lx, lz, turn, yc, nx, nz, sr):
    """(item 1003) a cross lashing where a stretcher of radius `sr` crosses the leg at (lx, lz), against its face toward (nx, nz) (the game's
    frame), its axis at height yc: two strips, each from above the stretcher on the one side diagonally down to below it on the other, round
    the leg's sides; on the leg's faces LASH_GAP off them, over the stretcher's front as far off it, drawn taut between the two (not into the
    corner where they meet); the second over the first where they cross"""
    ac = math.atan2(nx, nz)
    n2 = Vector((nx, 0.0, nz))
    hy = sr + 0.007
    so = LR + sr
    for k, sgn in enumerate((1, -1)):
        pts = []
        for i in range(LASH_N + 1):
            t = i / LASH_N
            a = ac - LASH_SPAN + 2 * LASH_SPAN * t
            b, af = oct_at(lx, lz, turn, a)
            nrm = Vector((math.sin(af), 0.0, math.cos(af)))
            y = yc + sgn * (hy - 2 * hy * t)
            p = Vector((b.x, y, b.z)) + nrm * LASH_GAP
            # (how far out along the stretcher's side of the leg, from the leg's axis)
            on = (p.x - lx) * n2.x + (p.z - lz) * n2.z
            # (over the stretcher where it's at its height: its round front that far out, the strip on it)
            dy = y - yc
            want = so + math.sqrt(max(0.0, (sr + LASH_GAP) ** 2 - dy * dy)) if abs(dy) < sr + LASH_GAP else -1.0
            pts.append([p, on, max(on, want), nrm, dy])
        # (drawn taut: no point in a hollow between its neighbours, where the strip would dip into the corner between the leg and the stretcher)
        outs = [q[2] for q in pts]
        for _ in range(60):
            for i in range(1, len(outs) - 1):
                outs[i] = max(outs[i], (outs[i - 1] + outs[i + 1]) / 2)
        spots = []
        for i, (p, on, _w, nrm, dy) in enumerate(pts):
            lift = outs[i] - on
            q = p + n2 * lift
            # (its normal: the leg's face's on the leg; over the stretcher, out from its axis; between, the two leaned together)
            on_stretch = min(1.0, lift / max(1e-6, sr))
            sn = (n2 * max(0.0, outs[i] - so) + Vector((0.0, dy, 0.0))).normalized() if (outs[i] - so) > -1e-6 or abs(dy) > 1e-6 else n2
            nn = (nrm * (1 - on_stretch) + sn * on_stretch).normalized()
            # (the one on top lifted where it crosses the other, a strip's width either side)
            t = i / LASH_N
            if k:
                q = q + nn * (LASH_LIFT * max(0.0, 1.0 - abs(t - 0.5) / 0.12))
            spots.append((q, nn))
        rows = []
        for i, (pt, nn) in enumerate(spots):
            d = (spots[min(i + 1, len(spots) - 1)][0] - spots[max(i - 1, 0)][0]).normalized()
            w = d.cross(nn).normalized() * (LASH_W / 2)
            rows.append([lash.verts.new(P(*(pt + w))), lash.verts.new(P(*(pt - w)))])
        for i in range(len(rows) - 1):
            f = lash.faces.new((rows[i][0], rows[i + 1][0], rows[i + 1][1], rows[i][1]))
            mid = (spots[i][0] + spots[i + 1][0]) / 2
            f.normal_update()
            out_ = P(*(mid + (spots[i][1] + spots[i + 1][1]) / 2)) - P(*mid)
            if f.normal.dot(out_) < 0:
                f.normal_flip()
            f.smooth = True


# (each leg's three crossings: the rail's and the long stretcher's against its face to the room (the back legs': in under the seat), the
# cross stretcher's against its side, outside for the end legs)
for k, (lx, lz, top) in enumerate(legs_at):
    turn_k = 0.7 * k + 0.3
    lash_over(lx, lz, turn_k, YA, 0.0, 1.0, SR)
    lash_over(lx, lz, turn_k, SY, 0.0, 1.0, SR)
    lash_over(lx, lz, turn_k, SY - 0.025, CROSS_SIDE[k % 3], 0.0, SR)
lash_me = bpy.data.meshes.new("BenchLash")
lash.to_mesh(lash_me)
lash.free()
lash_o = bpy.data.objects.new("BenchLash", lash_me)
bpy.context.collection.objects.link(lash_o)
lash_o.data.materials.append(M["rattan"])
parts.append(lash_o)


AO_LEAST, AO_DIST, AO_SAMPLES = 0.6, 0.035, 128


def bake_culm_ao():
    """(item 846, the owner's 「然後再進行烘焙」; docs/BAKING.md stage A) how shut in each spot of every culm's skin is by what's round it (a
    leg by the stretchers through it, under its crossed strips, the frame under the seat, the floor it stands on and the wall behind it),
    baked by Cycles into the culms' atlas (each culm its own strip of it, so none shares a texel with another): 0 shut in .. 1 open. Only
    the shut-in (ambient occlusion), not the light: the room's lights go on and off (docs/BAKING.md, the project's way)"""
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = AO_SAMPLES
    world = bpy.data.worlds.new("BenchAOWorld")
    sc.world = world
    world.light_settings.distance = AO_DIST
    # (the floor under it and the wall behind it, there for the bake only)
    tmp = []
    bpy.ops.mesh.primitive_plane_add(size=3.0, location=P(0, -0.0005, MID))
    tmp.append(active())
    bpy.ops.mesh.primitive_plane_add(size=3.0, location=P(0, 0.5, BACK - 0.002), rotation=(math.pi / 2, 0, 0))
    tmp.append(active())
    ao_img = bpy.data.images.new("BenchAO", NSTRIP * SW, AH, float_buffer=True)
    nt = M["culm"].node_tree
    node = nt.nodes.new("ShaderNodeTexImage")
    node.image = ao_img
    nt.nodes.active = node
    culms = [o for o in parts if o.type == "MESH" and o.data.materials and o.data.materials[0] == M["culm"]]
    bpy.ops.object.select_all(action="DESELECT")
    for o in culms:
        o.select_set(True)
    bpy.context.view_layer.objects.active = culms[0]
    bpy.ops.object.bake(type="AO", margin=4, use_clear=True)
    px = np.array(ao_img.pixels[:], np.float32).reshape(AH, NSTRIP * SW, 4)[..., 0]
    nt.nodes.remove(node)
    for o in tmp:
        bpy.data.objects.remove(o, do_unlink=True)
    bpy.data.images.remove(ao_img)
    # (what it came to over the culms' own texels only: each strip's rows down its own length)
    used = np.concatenate([px[:int(length / STRIP_LEN * AH), i * SW:(i + 1) * SW].ravel() for (i, length, _, _) in strips])
    print("BENCH_AO", len(culms), "culms, least", round(float(used.min()), 3), "5%", round(float(np.percentile(used, 5)), 3),
          "median", round(float(np.median(used)), 3))
    if os.environ.get("AO_PNG"):
        out_ = bpy.data.images.new("BenchAOOut", NSTRIP * SW, AH)
        out_.pixels.foreach_set(np.repeat(px[..., None], 4, -1).clip(0, 1).astype(np.float32).ravel())
        out_.filepath_raw = os.environ["AO_PNG"]
        out_.file_format = "PNG"
        out_.save()
    return px


def paint_atlas(ao=None):
    """each culm's strip: its skin (the tile, at its own place along it), darkened where it's shut in (`ao`, baked: down to AO_LEAST)"""
    s_px = ((np.arange(AH) + 0.5) / AH * STRIP_LEN)[:, None]
    out = np.zeros((AH, NSTRIP * SW, 3), np.float32)
    for (i, length, bands, off) in strips:
        rows = (((s_px[:, 0] / CULM_TILE + off) * N).astype(int)) % N
        strip = culm_small[rows].copy()
        # (item 847: the painted turns of rattan round each joint gone, the owner's 「原本候位椅的褐色部份拿掉」: the crossed strips bind them)
        if ao is not None:
            strip = strip * (AO_LEAST + (1 - AO_LEAST) * np.clip(ao[:, i * SW:(i + 1) * SW], 0, 1))[..., None]
        out[:, i * SW:(i + 1) * SW] = strip
    rgba = np.concatenate([np.clip(out, 0, 1), np.ones((AH, NSTRIP * SW, 1), np.float32)], -1).astype(np.float32)
    culm_img.pixels.foreach_set(rgba.ravel())
    culm_img.pack()
    print("BENCH_STRIPS", len(strips))


paint_atlas(bake_culm_ao())

# (two nodes, as the game had them: the seat and the rest)
bpy.ops.object.select_all(action="DESELECT")
seat_parts = [o for o in parts if o.name == "BenchSeat"]
rest = [o for o in parts if o.name != "BenchSeat"]
for o in rest:
    o.select_set(True)
bpy.context.view_layer.objects.active = rest[0]
bpy.ops.object.join()
bench_legs = active()
bench_legs.name = "BenchLegs"
bench_seat = seat_parts[0]
parts = [bench_seat, bench_legs]
root = bpy.data.objects.new("Bench", None)
bpy.context.collection.objects.link(root)
for o in parts:
    o.parent = root
print("BENCH_TRIS", sum(len(p.vertices) - 2 for o in parts for p in o.data.polygons))
if PREVIEW:
    target = P(0, 0.15, 0)
    cam = bpy.data.objects.new("PreviewCam", bpy.data.cameras.new("PreviewCam"))
    bpy.context.collection.objects.link(cam)
    cam.location = P(0.6, 0.55, 0.8)
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = cam
    lt = bpy.data.objects.new("Key", bpy.data.lights.new("Key", "SUN"))
    lt.data.energy = 4
    bpy.context.collection.objects.link(lt)
    lt.location = P(1, 3, 2)
    lt.rotation_euler = (target - lt.location).to_track_quat("-Z", "Y").to_euler()
    world = bpy.data.worlds.new("PreviewWorld")
    world.color = (0.45, 0.43, 0.4)
    bpy.context.scene.world = world
export_dish(root, parts + [root], os.path.join(PROJECT, "public", "models", "bench.glb"), os.path.join(PROJECT, "blender", "bench.blend"), PREVIEW)
print("BENCH_DONE")
