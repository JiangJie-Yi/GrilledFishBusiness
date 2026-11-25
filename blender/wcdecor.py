"""The washrooms' finer things (wcdecor.glb; the owner's, 2026-11-11: the plants finer, the lamp by the door less plain and brighter):

- node "WcLantern": a hanging wall lantern (掛け行灯): a dark cedar backboard against the wall, a bent arm out from its top, from it a round
  washi shade hung between a turned top and foot of dark wood, four thin ribs down it, a small bronze cap over its top; "WcLanternPaper",
  the shade's paper, the game lights it (its own glow, no light). The toilet's own lamp, over the toilet.
- node "WcAndon" (item 702, the washstand's lamp): a small wall andon (掛け行灯), a box of four square walnut posts on a backboard, a base board
  under it and a little hipped roof over it with a knob on its top; "WcAndonPaper", the washi on its three open sides, a shoji's kumiko and
  the light's fall-off painted in its picture, the game lights it as the lantern's.
- node "Kokedama" (the men's): a moss ball, its moss flecked darker and paler, a few sprigs of fern out of its top, on a shallow near-black
  stoneware dish with a pale glaze run at its rim.
- node "Camellia" (the women's): a sprig of red camellia in a bamboo vase: the vase's nodes, a dark twig, five glossy dark leaves along it,
  one full flower (five cupped petals round a crown of yellow stamens) and a bud.

The game's frame (y up), each on its own origin: the lamps' backboards' backs on the wall (z = 0), out toward +z, their middles at y = 0;
the plants' feet on their origins.

Run:
    blender -b --factory-startup --python blender/wcdecor.py -- <project path> [preview.png]
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


def P(x, y, z):
    return Vector((x, -z, y))


def lin(hexs):
    c = [int(hexs[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


N = 256
u, v = grid01(N)
moss = mix((0.16, 0.28, 0.08), (0.36, 0.5, 0.16), fbm(N, 10, 10, 4))
moss = mix(moss, (0.08, 0.14, 0.04), smooth(0.6, 0.8, fbm(N, 30, 30, 2)) * 0.6)
moss = mix(moss, (0.55, 0.62, 0.25), smooth(0.7, 0.85, vnoise(N, 60, 60)) * 0.5)
bamboo = mix((0.72, 0.62, 0.32), (0.6, 0.5, 0.24), smooth(0.4, 0.9, np.sin(u * 60 * math.pi) * 0.5 + 0.5) * 0.4)
cedar = mix((0.2, 0.12, 0.07), (0.28, 0.17, 0.1), smooth(0.5, 1.0, np.sin((v * 30 + fbm(N, 2, 4, 3)) * 2 * math.pi) * 0.5 + 0.5) * 0.6)
glaze = mix((0.07, 0.065, 0.06), (0.12, 0.11, 0.1), fbm(N, 6, 6, 3))
glaze = mix(glaze, (0.62, 0.6, 0.52), smooth(0.86, 0.95, v) * 0.7)
M = {
    "cedar": pbr("WcdCedar", (1, 1, 1), tex=image("wcd_cedar", np.clip(cedar, 0, 1).astype(np.float32)), rough=0.6),
    "bronze": pbr("WcdBronze", lin("#7a5a2a"), rough=0.35, metal=0.8),
    "paper": pbr("WcLanternPaper", lin("#fff1cc"), rough=0.9),
    "moss": pbr("WcdMoss", (1, 1, 1), tex=image("wcd_moss", np.clip(moss, 0, 1).astype(np.float32)), rough=0.95),
    "fern": pbr("WcdFern", lin("#5e8f3a"), rough=0.6),
    "dish": pbr("WcdDish", (1, 1, 1), tex=image("wcd_glaze", np.clip(glaze, 0, 1).astype(np.float32)), rough=0.25),
    "bamboo": pbr("WcdBamboo", (1, 1, 1), tex=image("wcd_bamboo", np.clip(bamboo, 0, 1).astype(np.float32)), rough=0.45),
    "node": pbr("WcdNode", lin("#8a7a3a"), rough=0.5),
    "twig": pbr("WcdTwig", lin("#3a2a1a"), rough=0.7),
    "leaf": pbr("WcdLeaf", lin("#2f6a34"), rough=0.25),
    "petal": pbr("WcdPetal", lin("#c41f38"), rough=0.4),
    "stamen": pbr("WcdStamen", lin("#f2c230"), rough=0.6),
    "bud": pbr("WcdBud", lin("#8a1a2a"), rough=0.4),
}
parts = []


def finish_obj(name, bm, mat, smooth_=True):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = smooth_
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(M[mat])
    parts.append(o)
    return o


def lathe(name, prof, seg, mat, at=(0, 0, 0), cap_top=False, cap_foot=False, uv_v=None):
    """turned round y from (radius, y) points (no point on the axis: a cap is a ladder across the end ring)"""
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new()
    rings = [[bm.verts.new(P(at[0] + r * math.cos(2 * math.pi * k / seg), at[1] + y, at[2] + r * math.sin(2 * math.pi * k / seg))) for k in range(seg)] for r, y in prof]
    for i in range(len(rings) - 1):
        for k in range(seg):
            k2 = (k + 1) % seg
            f = bm.faces.new((rings[i][k], rings[i][k2], rings[i + 1][k2], rings[i + 1][k]))
            for lp, (kk, ii) in zip(f.loops, ((k, i), (k + 1, i), (k + 1, i + 1), (k, i + 1))):
                lp[uvl].uv = (kk / seg, (uv_v[ii] if uv_v else ii / max(1, len(prof) - 1)))
    if cap_top:
        ladder_fill(bm, rings[-1])
    if cap_foot:
        ladder_fill(bm, rings[0])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return finish_obj(name, bm, mat)


def box(name, x0, x1, y0, y1, z0, z1, mat):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    for vt in bm.verts:
        vt.co = P(x0 + (vt.co.x + 0.5) * (x1 - x0), y0 + (vt.co.z + 0.5) * (y1 - y0), z0 + (-vt.co.y + 0.5) * (z1 - z0))
    uvl = bm.loops.layers.uv.new()
    for f in bm.faces:
        for lp in f.loops:
            c = lp.vert.co
            lp[uvl].uv = (c.x * 4 + c.y * 4, c.z * 4)
    return finish_obj(name, bm, mat, smooth_=False)


def tube(name, pts, r, mat, sides=5):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = r
    cu.bevel_resolution = 0
    cu.resolution_u = 3
    sp = cu.splines.new("BEZIER")
    sp.bezier_points.add(len(pts) - 1)
    for bp, p in zip(sp.bezier_points, pts):
        bp.co = P(*p)
        bp.handle_left_type = bp.handle_right_type = "AUTO"
    o = bpy.data.objects.new(name, cu)
    bpy.context.collection.objects.link(o)
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.convert(target="MESH")
    o = bpy.context.view_layer.objects.active
    o.data.materials.append(M[mat])
    parts.append(o)
    return o


def join(objs, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    o.name = name
    for o_ in objs[1:]:
        if o_ in parts:
            parts.remove(o_)
    return o


def leaf(name, at, along, up, length, width, mat, cup=0.25):
    """a leaf: an ellipse two quads across and four long, folded a little along its midrib, cupped up at its edges; from `at`, pointing
    `along`, its face toward `up`"""
    along, up = Vector(along).normalized(), Vector(up).normalized()
    side = along.cross(up).normalized()
    up = side.cross(along).normalized()
    bm = bmesh.new()
    rows = []
    for i in range(5):
        t = i / 4
        w = width * math.sin(math.pi * min(1.0, max(0.0, t * 0.92 + 0.04))) * (1.0 if t < 0.95 else 0.4)
        c = Vector(at) + along * (length * t)
        row = []
        for j, sj in enumerate((-1, 0, 1)):
            p = c + side * (sj * w / 2) + up * (abs(sj) * cup * w * 0.5 - (0.12 * w if sj == 0 else 0)) + up * (0.15 * length * math.sin(math.pi * t))
            row.append(bm.verts.new(P(p.x, p.y, p.z)))
        rows.append(row)
    for i in range(4):
        for j in range(2):
            bm.faces.new((rows[i][j], rows[i][j + 1], rows[i + 1][j + 1], rows[i + 1][j]))
    return finish_obj(name, bm, mat)


# ---------------------------------------------------------------------------------------------------- the lantern
LH, LR, OUT = 0.17, 0.055, 0.1
lan = [box("back", -0.045, 0.045, -0.15, 0.15, 0.0, 0.012, "cedar"),
       box("arm", -0.008, 0.008, 0.115, 0.13, 0.012, OUT + 0.01, "cedar"),
       box("drop", -0.006, 0.006, LH / 2 + 0.012, 0.13, OUT - 0.006, OUT + 0.006, "bronze")]
lan.append(lathe("top", [(LR + 0.006, LH / 2), (LR + 0.008, LH / 2 + 0.008), (LR * 0.7, LH / 2 + 0.014)], 12, "cedar", at=(0, 0, OUT), cap_top=True))
lan.append(lathe("cap", [(LR * 0.66, LH / 2 + 0.014), (LR * 0.35, LH / 2 + 0.03), (LR * 0.2, LH / 2 + 0.034)], 12, "bronze", at=(0, 0, OUT), cap_top=True))
lan.append(lathe("foot", [(LR * 0.6, -LH / 2 - 0.016), (LR + 0.008, -LH / 2 - 0.008), (LR + 0.006, -LH / 2)], 12, "cedar", at=(0, 0, OUT), cap_foot=True))
for k in range(4):
    a = math.pi / 4 + k * math.pi / 2
    x, z = (LR + 0.003) * math.cos(a), OUT + (LR + 0.003) * math.sin(a)
    lan.append(box(f"rib{k}", x - 0.003, x + 0.003, -LH / 2, LH / 2, z - 0.003, z + 0.003, "cedar"))
lantern = join(lan, "WcLantern")
paper = lathe("WcLanternPaper", [(LR, -LH / 2), (LR * 1.04, -LH / 4), (LR * 1.05, 0), (LR * 1.04, LH / 4), (LR, LH / 2)], 12, "paper", at=(0, 0, OUT))
paper.parent = lantern

# ---------------------------------------------------------------------------------------------------- the washstand's andon (item 702)
# (the owner's, 2026-11-25: 「這兩個燈改日式一點，記得別改廁所馬桶上面那一顆燈」: the lamp by each washstand, the round shade above, a plain
# white tube; now a small wall andon (掛け行灯): a box of four square walnut posts on a backboard, a base board under it and a
# little hipped roof over it with a knob on its top, washi on its three open sides behind a shoji's kumiko of one upright and two cross bars
# (painted in the paper's picture, not modelled bar by bar), the paper lit from within: brightest a little over its middle, its fibres
# showing against the light. The toilet's own lamp over the toilet stays the lantern above.)
# Its frame as the lantern's: the backboard's back on the wall (z = 0, 1.5 mm off it), out toward +z, its middle at y = 0.
NA = 512
ua, va = grid01(NA)
# (the light inside: brightest a little over the middle, falling off to the posts and more to the ends, under the roof and over the base)
lit = np.clip(1 - 0.5 * ((ua - 0.5) / 0.5) ** 2 - 0.75 * ((va - 0.56) / 0.5) ** 2, 0, 1)
washi = mix((0.9, 0.66, 0.38), (1.0, 0.95, 0.84), lit ** 0.85)
# (the paper's own thicker and thinner patches, and its kozo fibres, darker where they lie thick against the light)
washi = washi * (0.93 + 0.07 * fbm(NA, 6, 6, 4))[..., None]
fib = np.zeros((NA, NA), np.float32)
r702 = np.random.default_rng(702)
for _ in range(240):
    fx, fy = r702.uniform(0, NA, 2)
    fa, fl, fbend = r702.uniform(0, math.pi), r702.uniform(12, 52), r702.uniform(-0.04, 0.04)
    for t in range(int(fl)):
        fa += fbend
        fib[int(fy + math.sin(fa) * t) % NA, int(fx + math.cos(fa) * t) % NA] += 1
fib = (fib + np.roll(fib, 1, 0) + np.roll(fib, -1, 0) + np.roll(fib, 1, 1) + np.roll(fib, -1, 1)) / 5
washi = mix(washi, (0.72, 0.52, 0.3), np.clip(fib * 0.55, 0, 0.32))
# (the kumiko: the frame's rails painted along the top and bottom (the posts, modelled, cover the sides: MA behind each), one upright in
# the middle and two cross bars, three rows; a soft shade on the paper along each, the frame's, as the light behind falls off at it)
MA, RA = 0.072, 0.05


def bar(d, half):
    return 1 - smooth(half - 0.0025, half + 0.0025, d)


rows = [RA + (1 - 2 * RA) * k / 3 for k in (1, 2)]
bars = [(np.abs(ua - 0.5), 0.02)] + [(np.abs(va - r), 0.017) for r in rows]
kumi = np.maximum.reduce([bar(d, hw) for d, hw in bars]
                         + [1 - smooth(RA - 0.003, RA + 0.002, va), smooth(1 - RA - 0.002, 1 - RA + 0.003, va),
                            1 - smooth(MA - 0.003, MA + 0.002, ua), smooth(1 - MA - 0.002, 1 - MA + 0.003, ua)])
near = np.maximum.reduce([bar(d, hw + 0.033) for d, hw in bars]
                         + [1 - smooth(RA, RA + 0.05, va), smooth(1 - RA - 0.05, 1 - RA, va), 1 - smooth(MA, MA + 0.05, ua), smooth(1 - MA - 0.05, 1 - MA, ua)])
washi = washi * (1 - 0.12 * near)[..., None]
walnut = mix((0.15, 0.085, 0.045), (0.21, 0.125, 0.065), fbm(NA, 3, 30, 3))
# (and the bars' sides catching the light behind them, a thin warm edge each side of each, as a backlit lattice shows)
rim = np.maximum.reduce([bar(d, hw) * smooth(hw - 0.007, hw - 0.0015, d) for d, hw in bars])
walnut = mix(walnut, (0.46, 0.28, 0.13), rim * 0.5)
andon_paper = mix(washi, walnut, kumi)
NW = 256
uw, vw = grid01(NW)
# (the andon's walnut: a warm dark brown, its grain along u, a little lighter than the lantern's cedar so its posts read as wood in the
# room's dim light)
grain = smooth(0.45, 1.0, np.sin((vw * 18 + fbm(NW, 3, 6, 3) * 1.6) * 2 * math.pi) * 0.5 + 0.5)
andon_wood = mix((0.27, 0.16, 0.09), (0.35, 0.215, 0.125), grain * 0.55)
andon_wood = mix(andon_wood, (0.2, 0.115, 0.065), smooth(0.6, 0.9, fbm(NW, 4, 24, 3)) * 0.25)
M["andon_wood"] = pbr("WcdAndonWood", (1, 1, 1), tex=image("wcd_andon_wood", np.clip(andon_wood, 0, 1).astype(np.float32)), rough=0.55)
M["andon_paper"] = pbr("WcAndonPaper", (1, 1, 1), tex=image("wcd_andon_paper", np.clip(andon_paper, 0, 1).astype(np.float32)), rough=0.9)

# (each face of a slab, its corners (0 or 1 along x, y, z) round it counter-clockwise seen from outside)
SLAB = {"-x": [(0, 0, 0), (0, 0, 1), (0, 1, 1), (0, 1, 0)], "+x": [(1, 0, 1), (1, 0, 0), (1, 1, 0), (1, 1, 1)],
        "-y": [(0, 0, 0), (1, 0, 0), (1, 0, 1), (0, 0, 1)], "+y": [(0, 1, 1), (1, 1, 1), (1, 1, 0), (0, 1, 0)],
        "-z": [(1, 0, 0), (0, 0, 0), (0, 1, 0), (1, 1, 0)], "+z": [(0, 0, 1), (1, 0, 1), (1, 1, 1), (0, 1, 1)]}


def wood_uv(f, uvl, along, s=8.0):
    """a face's wood: its grain (the picture's u) along `along` (0, 1, 2: x, y, z) where that lies in the face, across it the face's other
    way; on an end, the two ways across"""
    n = [abs(f.normal.x), abs(f.normal.z), abs(f.normal.y)]   # (the game's x, y, z of its normal: P's axes back)
    ax = [k for k in range(3) if k != n.index(max(n))]
    a = along if along in ax else ax[0]
    b = [k for k in ax if k != a][0]
    for lp in f.loops:
        g = (lp.vert.co.x, lp.vert.co.z, -lp.vert.co.y)
        lp[uvl].uv = (g[a] * s, g[b] * s)


def slab(name, x0, x1, y0, y1, z0, z1, mat, skip=(), along=1):
    """a box from its bounds in the game's frame, without the faces in `skip` ("-x" … "+z": those against something, never seen), its
    grain along `along`"""
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new()
    X, Y, Z = (x0, x1), (y0, y1), (z0, z1)
    v = {(i, j, k): bm.verts.new(P(X[i], Y[j], Z[k])) for i in (0, 1) for j in (0, 1) for k in (0, 1)}
    for key, q in SLAB.items():
        if key not in skip:
            bm.faces.new([v[c] for c in q])
    bm.normal_update()
    for f in bm.faces:
        wood_uv(f, uvl, along)
    for vt in [vt for vt in bm.verts if not vt.link_faces]:
        bm.verts.remove(vt)
    return finish_obj(name, bm, mat, smooth_=False)


# (the box: posts PT square at its corners, BW along the wall, BD out from the backboard, BH from the base board to the roof; the washi IN
# inside the posts' faces, so they stand proud of it)
BW, BD, BH, PT, IN = 0.11, 0.1, 0.144, 0.012, 0.004
GAP, BT = 0.0015, 0.01
Z0 = GAP + BT
Z1 = Z0 + BD
an = [slab("andonBoard", -0.064, 0.064, -0.106, 0.118, GAP, Z0, "andon_wood", skip=("-z",))]
for sx in (-1, 1):
    xo, xi = sx * BW / 2, sx * (BW / 2 - PT)
    an.append(slab(f"andonPostF{sx}", min(xo, xi), max(xo, xi), -BH / 2 - 0.0005, BH / 2 + 0.0005, Z1 - PT, Z1, "andon_wood", skip=("-y", "+y")))
    an.append(slab(f"andonPostB{sx}", min(xo, xi), max(xo, xi), -BH / 2 - 0.0005, BH / 2 + 0.0005, Z0, Z0 + PT, "andon_wood", skip=("-y", "+y", "-z")))
# (the base board under it, a little proud of the posts, its back into the backboard 1 mm)
an.append(slab("andonBase", -BW / 2 - 0.005, BW / 2 + 0.005, -BH / 2 - 0.012, -BH / 2, Z0 - 0.001, Z1 + 0.005, "andon_wood", skip=("-z",), along=0))
# (the roof: its eaves 8 mm thick, out 13 mm past the posts at the front and sides, its back into the backboard 1 mm, hipped up to a little
# flat top with a knob on it)
RX, RZ0, RZ1, RY0, RY1, RYT = BW / 2 + 0.013, Z0 - 0.001, Z1 + 0.013, BH / 2, BH / 2 + 0.008, BH / 2 + 0.036
TX, TZ = 0.016, 0.011
TC = (RZ0 + RZ1) / 2
bm = bmesh.new()
uvl = bm.loops.layers.uv.new()
rv = {}


def rvert(x, y, z):
    if (x, y, z) not in rv:
        rv[(x, y, z)] = bm.verts.new(P(x, y, z))
    return rv[(x, y, z)]


roof_faces = [
    [(-RX, RY0, RZ0), (RX, RY0, RZ0), (RX, RY0, RZ1), (-RX, RY0, RZ1)],                       # its underside
    [(-RX, RY0, RZ1), (RX, RY0, RZ1), (RX, RY1, RZ1), (-RX, RY1, RZ1)],                       # the eaves' front
    [(RX, RY0, RZ1), (RX, RY0, RZ0), (RX, RY1, RZ0), (RX, RY1, RZ1)],                         # and sides
    [(-RX, RY0, RZ0), (-RX, RY0, RZ1), (-RX, RY1, RZ1), (-RX, RY1, RZ0)],
    [(-RX, RY1, RZ1), (RX, RY1, RZ1), (TX, RYT, TC + TZ), (-TX, RYT, TC + TZ)],               # the four slopes
    [(RX, RY1, RZ0), (-RX, RY1, RZ0), (-TX, RYT, TC - TZ), (TX, RYT, TC - TZ)],
    [(RX, RY1, RZ1), (RX, RY1, RZ0), (TX, RYT, TC - TZ), (TX, RYT, TC + TZ)],
    [(-RX, RY1, RZ0), (-RX, RY1, RZ1), (-TX, RYT, TC + TZ), (-TX, RYT, TC - TZ)],
    [(-TX, RYT, TC + TZ), (TX, RYT, TC + TZ), (TX, RYT, TC - TZ), (-TX, RYT, TC - TZ)],       # its flat top
]
for q in roof_faces:
    bm.faces.new([rvert(*c) for c in q])
bm.normal_update()
for f in bm.faces:
    wood_uv(f, uvl, 0)
an.append(finish_obj("andonRoof", bm, "andon_wood", smooth_=False))
an.append(slab("andonKnob", -0.007, 0.007, RYT - 0.001, RYT + 0.01, TC - 0.007, TC + 0.007, "andon_wood", skip=("-y",)))
andon = join(an, "WcAndon")
# (the washi on its three open sides, each its own picture across it, seen from outside)
bm = bmesh.new()
uvl = bm.loops.layers.uv.new()
XP, ZF, ZB = BW / 2 - IN, Z1 - IN, Z0 + IN
for q in ([(-XP, ZF), (XP, ZF)], [(XP, ZF), (XP, ZB)], [(-XP, ZB), (-XP, ZF)]):
    (xa, za), (xb, zb) = q
    vs = [bm.verts.new(P(xa, -BH / 2, za)), bm.verts.new(P(xb, -BH / 2, zb)), bm.verts.new(P(xb, BH / 2, zb)), bm.verts.new(P(xa, BH / 2, za))]
    f = bm.faces.new(vs)
    for lp, uv in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))):
        lp[uvl].uv = uv
andon_paper_obj = finish_obj("WcAndonPaper", bm, "andon_paper", smooth_=False)
andon_paper_obj.parent = andon

# ---------------------------------------------------------------------------------------------------- the moss ball on its dish
dish = lathe("KokedamaDish", [(0.05, 0.0), (0.062, 0.006), (0.068, 0.016), (0.064, 0.02), (0.052, 0.012)], 16, "dish", cap_foot=True, cap_top=True,
             uv_v=[0.0, 0.3, 0.92, 1.0, 0.7])
bm = bmesh.new()
bmesh.ops.create_icosphere(bm, subdivisions=2, radius=0.045)
rng = np.random.default_rng(3)
for vt in bm.verts:
    d = vt.co.normalized()
    k = 1 + 0.06 * math.sin(5 * d.x + 2) * math.cos(4 * d.y) + rng.uniform(-0.03, 0.03)
    vt.co = P(d.x * 0.045 * k, 0.012 + 0.04 + d.z * 0.04 * k, -d.y * 0.045 * k)
uvl = bm.loops.layers.uv.new()
for f in bm.faces:
    for lp in f.loops:
        c = lp.vert.co
        lp[uvl].uv = (math.atan2(c.y, c.x) / (2 * math.pi) + 0.5, c.z * 8)
ball = finish_obj("KokedamaBall", bm, "moss")
ferns = []
for k, (a, tilt, ln) in enumerate(((0.3, 0.55, 0.1), (1.6, 0.3, 0.12), (2.9, 0.6, 0.09), (4.2, 0.4, 0.11), (5.3, 0.7, 0.08))):
    base = Vector((0.01 * math.cos(a), 0.09, 0.01 * math.sin(a)))
    along = Vector((math.cos(a) * math.sin(tilt), math.cos(tilt), math.sin(a) * math.sin(tilt)))
    ferns.append(leaf(f"fern{k}", base, along, Vector((math.cos(a), 0.0, math.sin(a))).cross(Vector((0, 1, 0))) if False else Vector((-math.sin(a), 0.0, math.cos(a))).cross(along),
                      ln, 0.018, "fern", cup=0.1))
kokedama = join([dish, ball] + ferns, "Kokedama")

# ---------------------------------------------------------------------------------------------------- the camellia in its bamboo vase
vase = lathe("CamelliaVase", [(0.028, 0.0), (0.029, 0.03), (0.03, 0.07), (0.031, 0.1)], 12, "bamboo", cap_foot=True)
nodes = [lathe(f"node{k}", [(0.031 + 0.001 * k, y - 0.003), (0.034 + 0.001 * k, y), (0.031 + 0.001 * k, y + 0.003)], 12, "node") for k, y in enumerate((0.025, 0.065))]
inside = lathe("CamelliaWater", [(0.027, 0.085), (0.0275, 0.0855)], 12, "node", cap_top=True)
twig = tube("CamelliaTwig", [(0.0, 0.06, 0.0), (0.008, 0.14, 0.004), (0.02, 0.21, 0.006), (0.026, 0.25, 0.006)], 0.0028, "twig")
leaves = []
for k, (t, a, ln) in enumerate(((0.12, 0.6, 0.06), (0.15, 2.6, 0.065), (0.18, 4.2, 0.055), (0.2, 1.4, 0.05), (0.22, 3.6, 0.05))):
    base = Vector((0.006 + 0.08 * (t - 0.12), t, 0.004))
    along = Vector((math.cos(a) * 0.8, 0.45, math.sin(a) * 0.8))
    leaves.append(leaf(f"leaf{k}", base, along, Vector((0, 1, 0)), ln, 0.03, "leaf", cup=0.2))
# (the flower: five cupped petals round, opening outward and up, the stamens' crown in the middle)
fc = Vector((0.028, 0.255, 0.006))
petals = []
for k in range(5):
    a = 2 * math.pi * k / 5 + 0.3
    along = Vector((math.cos(a) * 0.7, 0.75, math.sin(a) * 0.7))
    petals.append(leaf(f"petal{k}", fc, along, Vector((0, 1, 0)), 0.042, 0.04, "petal", cup=0.6))
# (and three smaller inside them, more upright, round the stamens)
for k in range(3):
    a = 2 * math.pi * k / 3 + 1.0
    along = Vector((math.cos(a) * 0.35, 0.95, math.sin(a) * 0.35))
    petals.append(leaf(f"petalIn{k}", fc, along, Vector((math.cos(a), 0, math.sin(a))), 0.03, 0.03, "petal", cup=0.6))
stamen = lathe("stamen", [(0.008, -0.002), (0.009, 0.012), (0.006, 0.016)], 8, "stamen", at=tuple(fc), cap_top=True)
bm = bmesh.new()
bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.011)
for vt in bm.verts:
    vt.co = P(-0.012 + vt.co.x, 0.19 + vt.co.z * 1.4, 0.01 - vt.co.y)
bud = finish_obj("bud", bm, "bud")
camellia = join([vase] + nodes + [inside, twig] + leaves + petals + [stamen, bud], "Camellia")

kokedama.location = P(0.3, 0, 0)
camellia.location = P(0.5, 0, 0)
andon.location = P(-0.25, 0, 0)
root = bpy.data.objects.new("WcDecor", None)
bpy.context.collection.objects.link(root)
for o in (lantern, andon, kokedama, camellia):
    o.parent = root
print("WCDECOR_TRIS", {o.name: sum(len(p.vertices) - 2 for p in o.data.polygons) for o in (lantern, paper, andon, andon_paper_obj, kokedama, camellia)})
if PREVIEW:
    target = P(0.4, 0.14, 0)
    cam = bpy.data.objects.new("PreviewCam", bpy.data.cameras.new("PreviewCam"))
    bpy.context.collection.objects.link(cam)
    cam.location = P(0.42, 0.42, 0.6)
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
export_dish(root, parts + [root], os.path.join(PROJECT, "public", "models", "wcdecor.glb"), os.path.join(PROJECT, "blender", "wcdecor.blend"), PREVIEW)
print("WCDECOR_DONE")
