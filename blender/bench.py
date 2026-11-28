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
    "rattan": pbr("BenchRattan", lin("#5a3a1e"), rough=0.7),
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


def around(c, hw):
    """a binding `hw` either side of `c` along a culm"""
    return (c - hw, c + hw)


def ends(length, w):
    """a binding at each end of a culm, `w` long"""
    return [(0.0, w), (length - w, length)]


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
    culm_part(f"BenchLeg{k}", (lx, 0.0, lz), (lx, top, lz), LR, turn=0.7 * k + 0.3, bands=[around(YA, 0.016), (SY - 0.025 - 0.016, SY + 0.016)])
    # (its head's ring of rattan under the frame gone with the frame's bindings (item 788))
# ---- a second rail under the frame, along the front and the back from end leg to end leg through the middle one (bound over each leg)
for k, lz in enumerate((ZBL, ZFL)):
    culm_part(f"BenchApron{k}", (-LX - LR, YA, lz), (LX + LR, YA, lz), SR, segs=6, turn=5.0 + k, bands=[around(x + LX + LR, 0.034) for x in JX])
# ---- the stretchers, low: along the front and the back (貫), and across each end and the middle a little lower (offset, as a joiner
# makes them, so no two meet at one point); the long ones bound over each leg, the cross ones at their ends
for k, lz in enumerate((ZBL, ZFL)):
    culm_part(f"BenchStretchLong{k}", (-LX - LR, SY, lz), (LX + LR, SY, lz), SR, segs=6, turn=4.0 + k, bands=[around(x + LX + LR, 0.034) for x in JX])
CROSS_L = (ZFL - LR - 0.001) - (ZBL + LR + 0.001)
for k, lx in enumerate(JX):
    culm_part(f"BenchStretch{k}", (lx, SY - 0.025, ZBL + LR + 0.001), (lx, SY - 0.025, ZFL - LR - 0.001), SR, segs=6, turn=3.1 + k, bands=ends(CROSS_L, 0.022))


def paint_atlas():
    """each culm's strip: its skin (the tile, at its own place along it), and its bindings over it"""
    s_px = ((np.arange(AH) + 0.5) / AH * STRIP_LEN)[:, None]
    a_px = ((np.arange(SW) + 0.5) / SW)[None, :]
    out = np.zeros((AH, NSTRIP * SW, 3), np.float32)
    wrap_tone = np.array((0.47, 0.3, 0.16), np.float32)
    nz = fbm(AH, 6, 40, 3)
    # (the rattan wound round in a helix, a turn each 4.2 mm: each turn rounded, lit down its middle, a dark seam between)
    phase = s_px / 0.0042 + a_px
    fr = phase - np.floor(phase)
    turn_ = (0.78 + 0.22 * np.sin(np.pi * fr)) * (0.4 + 0.6 * smooth(0.0, 0.14, fr) * smooth(0.0, 0.14, 1 - fr))

    def crossed(s0, s1, wrap, var):
        """(item 789, the owner's 「下面綁的要有交叉的感覺」: item 791's binding a band of turns straight round) a joint's lashing as a
        joiner ties one: a few turns straight round at its two edges, and between them the rattan crossed over the joint, an X on each side
        (at a quarter and three quarters round), each arm a pair of strips, the one arm over the other where they cross, the turns under them
        dark in their shadow"""
        L = s1 - s0
        e = min(0.007, L * 0.22)
        core = smooth(s0 + e - 0.0008, s0 + e + 0.0008, s_px) * (1 - smooth(s1 - e - 0.0008, s1 - e + 0.0008, s_px))
        yy = (s_px - (s0 + s1) / 2) / max(1e-4, L / 2 - e)
        over = np.zeros((AH, SW), np.float32)
        under = np.zeros((AH, SW), np.float32)
        for ac in (0.25, 0.75):
            xx = (((a_px - ac + 0.5) % 1.0) - 0.5) / 0.2
            for sgn in (1, -1):
                d = xx - sgn * yy
                arm = np.zeros((AH, SW), np.float32)
                for k in (-0.24, 0.24):
                    q = np.abs(d - k)
                    arm = np.maximum(arm, smooth(0.21, 0.09, q) * (0.8 + 0.2 * np.cos(np.clip(q / 0.21, 0, 1) * np.pi / 2)))
                arm = arm * (np.abs(yy) <= 1.04) * (np.abs(xx) <= 1.3)
                if sgn > 0:
                    over = np.maximum(over, arm)
                else:
                    under = np.maximum(under, arm)
        under = under * (1 - smooth(0.05, 0.35, over))
        strands = np.maximum(over, under * 0.85)
        lit = wrap_tone[None, None, :] * (var * (0.62 + 0.38 * strands))[..., None]
        x_col = mix(wrap * 0.55, lit, strands)
        return mix(wrap, x_col, np.broadcast_to(core, (AH, SW)))
    for (i, length, bands, off) in strips:
        rows = (((s_px[:, 0] / CULM_TILE + off) * N).astype(int)) % N
        strip = culm_small[rows].copy()
        var = 0.9 + 0.2 * nz[:, i * SW:(i + 1) * SW]
        for (s0, s1) in bands:
            s0, s1 = max(0.0, s0), min(length, s1)
            if s1 <= s0:
                continue
            inb = smooth(s0 - 0.001, s0 + 0.001, s_px) * (1 - smooth(s1 - 0.001, s1 + 0.001, s_px))
            # (darker at its two edges, where it goes in under the next turn)
            edge = 0.7 + 0.3 * smooth(0.0, 0.0035, s_px - s0) * smooth(0.0, 0.0035, s1 - s_px)
            wrap = wrap_tone[None, None, :] * (turn_ * var * edge)[..., None]
            strip = mix(strip, crossed(s0, s1, wrap, var), np.broadcast_to(inb, (AH, SW)))
        out[:, i * SW:(i + 1) * SW] = strip
    rgba = np.concatenate([np.clip(out, 0, 1), np.ones((AH, NSTRIP * SW, 1), np.float32)], -1).astype(np.float32)
    culm_img.pixels.foreach_set(rgba.ravel())
    culm_img.pack()
    print("BENCH_STRIPS", len(strips), "BANDS", sum(len(b) for _, _, b, _ in strips))


paint_atlas()

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
