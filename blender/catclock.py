"""The cat wall clock (catclock.glb; item 477, the owner's, 2026-11-21: 「這邊增加一個喵咪掛鐘」; black since item 483: 「貓咪時鐘要黑貓」): our
own, a black cat sitting up, its round belly the clock's case with the dial on it, its face over it, a red collar and a gold bell at its
neck, its two front paws at the dial's foot, its tail hanging under it for the pendulum. Hung on the back wall right of the round window.

Item 827 (the owner's, 2026-11-28: 「眼睛不OK，整體很像幾何形去拼湊出」): it was flat slabs stood one on another, each an outline pushed
straight out (a disc for the belly, an oval for the head, prisms for the ears, a bar for the collar), flat-shaded, square at every edge.
Now each part a pillow: its outline a smooth curve through a few points (the head a cat's, broad at its cheeks; the belly a pear,
narrowing to the neck under the head; the ears rounded; the paws mittens, three toes along their foot), its side up from the wall, then
round over into its front (a quarter round), smooth-shaded; the head proud of the belly, the ears grown from behind it, the collar laid
round the neck on the belly's own surface (cast onto it), its ends going back round it, the paws over the dial's rim, a gold bezel round
the dial, the tail a tapering tube in two pieces (its tip swung after it).

Nodes:
- "CatClockBody": all that stands still: the case, the dial, the bezel, the head, the ears (black, pink inside), the collar, the bell,
  the paws, the cap over the hands' pivot. The head's front and the dial's are one material, "CatClockPrint": the game paints them in one
  picture (the face on its left half, PRINT_HEAD across its head; the dial on its right: its ticks and numbers).
- "CatClockHour", "CatClockMinute": the hands, each its pivot at its origin (the dial's middle), pointing up (+y) at twelve.
- "CatClockTail": the tail's upper part, its pivot at its root (its origin), hanging down: swung as the pendulum; "CatClockTailTip" under
  it, its pivot where it joins (its origin, in the tail's frame), swung after it.

The frame: metres; y up; x across; z out of the wall, the clock's back on the wall at z = 0; the dial's middle at the origin of x and y.
Low-poly (docs/MODELING.md): every round at most 24 sides, every cap a ladder (none fanned into a point), about 1,000 triangles all told.

Run:
    blender -b --factory-startup --python blender/catclock.py -- <project path> [preview.png]
"""
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *  # noqa: E402,F403

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
PROJECT = argv[0] if argv else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PREVIEW = argv[1] if len(argv) > 1 else None
bpy.ops.wm.read_factory_settings(use_empty=True)


def P(x, y, z):
    """the game's frame (y up, z out of the wall) to Blender's (z up)"""
    return Vector((x, -z, y))


def lin(hexs):
    c = [int(hexs[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


M = {
    # (a black cat (item 483, the owner's 「貓咪時鐘要黑貓」): its fur near black, a little warm; pink inside its ears)
    "white": pbr("CatClockFur", lin("#2b2727"), rough=0.6),
    "print": pbr("CatClockPrint", (1, 1, 1), rough=0.6),
    "black": pbr("CatClockBlack", lin("#2e2826"), rough=0.6),
    "pink": pbr("CatClockPink", lin("#e9969a"), rough=0.6),
    "red": pbr("CatClockRed", lin("#c8342c"), rough=0.5),
    "gold": pbr("CatClockGold", lin("#e2b34a"), rough=0.35, metal=0.6),
    "hand": pbr("CatClockHand", lin("#2b2420"), rough=0.5),
}

# ---- the measures
DIAL_R, DIAL_Z = 0.07, 0.049           # (the dial's picture's radius, its face's depth)
BODY_Z, BODY_BEVEL = 0.044, 0.022      # (the belly's flat front, how round its edge)
HEAD_C, HEAD_Z, HEAD_BEVEL = 0.169, (0.012, 0.068), 0.03   # (the head's middle (up from the dial's), back and front, its round)
PRINT_HEAD = 0.2                       # (the square of the picture's left half laid over the head's front, its side)
PRINT_DIAL = 2 * DIAL_R                # (and its right half over the dial's)


def spline(pts, n, closed=True):
    """a Catmull-Rom curve through `pts` ((x, y)), `n` points along it evenly by length from pts[0] (round, if `closed`)"""
    m = len(pts)
    dense = []
    for i in range(m if closed else m - 1):
        p0, p1 = pts[(i - 1) % m] if closed or i > 0 else pts[0], pts[i]
        p2 = pts[(i + 1) % m]
        p3 = pts[(i + 2) % m] if closed or i + 2 < m else pts[-1]
        for k in range(32):
            t = k / 32
            dense.append(tuple(0.5 * (2 * p1[j] + (p2[j] - p0[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t * t
                                      + (3 * p1[j] - p0[j] - 3 * p2[j] + p3[j]) * t * t * t) for j in range(len(p1))))
    if not closed:
        dense.append(tuple(pts[-1]))
    seg = len(dense) if closed else len(dense) - 1
    acc = [0.0]
    for i in range(seg):
        a, b = dense[i], dense[(i + 1) % len(dense)]
        acc.append(acc[-1] + math.dist(a, b))
    out, j = [], 0
    for k in range(n if closed else n + 1):
        s = acc[-1] * k / n
        while j < seg - 1 and acc[j + 1] < s:
            j += 1
        a, b = dense[j], dense[(j + 1) % len(dense)]
        f = (s - acc[j]) / (acc[j + 1] - acc[j]) if acc[j + 1] > acc[j] else 0.0
        out.append(tuple(a[i] + (b[i] - a[i]) * f for i in range(len(a))))
    return out


def mirrored(half):
    """a whole outline round from a half's points (x >= 0) from its foot (x = 0) up its right side to its top (x = 0): the left side back
    down the other way"""
    return half + [(-x, y) for x, y in half[-2:0:-1]]


def pillow(bm, outline, z0, z1, bevel, steps=2, uv=None, uvl=None):
    """a pillow on an outline (x, y) round it: its side straight up off z0 to z1 - bevel, then a quarter round in `steps` over into its
    front, flat at z1, the outline drawn in `bevel` toward its middle; shut front and back by ladders (never a fan); faces turned out,
    smooth; `uv(x, y)` for every point when given"""
    n = len(outline)
    cx, cy = sum(p[0] for p in outline) / n, sum(p[1] for p in outline) / n

    def inset(p, d):
        dx, dy = cx - p[0], cy - p[1]
        dl = math.hypot(dx, dy)
        f = min(d / dl, 0.9) if dl > 1e-9 else 0.0
        return (p[0] + dx * f, p[1] + dy * f)

    bevel = min(bevel, z1 - z0)
    rings = [[(x, y, z0) for x, y in outline]]
    for k in range(steps + 1):
        th = (math.pi / 2) * k / steps
        rings.append([(*inset(p, bevel * (1 - math.cos(th))), z1 - bevel + bevel * math.sin(th)) for p in outline])
    if bevel >= z1 - z0 - 1e-6:
        rings.pop(0)
    vs = [[bm.verts.new(P(*q)) for q in ring] for ring in rings]
    faces = []
    for a, b in zip(vs, vs[1:]):
        for k in range(n):
            faces.append(bm.faces.new((a[k], a[(k + 1) % n], b[(k + 1) % n], b[k])))
    faces += ladder_fill(bm, vs[-1])
    faces += ladder_fill(bm, vs[0])
    turn_out(faces, P(cx, cy, (z0 + z1) / 2))
    if uv and uvl is not None:
        for f in faces:
            for lp in f.loops:
                lp[uvl].uv = uv(lp.vert.co.x, lp.vert.co.z)
    return faces


def turn_out(faces, mid):
    """each face turned to look away from `mid` (Blender's frame)"""
    for f in faces:
        f.normal_update()
        if f.normal.dot(f.calc_center_median() - mid) < 0:
            f.normal_flip()
        f.smooth = True


def part(name, build, mat):
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new()
    build(bm, uvl)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(mat)
    return o


def surface(o):
    """a part's shape to cast onto (the game's frame in, its depth out at a point (x, y), from the front)"""
    bm = bmesh.new()
    bm.from_mesh(o.data)
    tree = BVHTree.FromBMesh(bm)

    def at(x, y):
        hit = tree.ray_cast(P(x, y, 1.0), P(0, 0, -1) - P(0, 0, 0))
        return -hit[0].y if hit[0] is not None else None
    return at


# ---- the outlines (each from its foot round up its right side and over)
BODY_LINE = spline(mirrored([(0.0, -0.128), (0.06, -0.122), (0.1, -0.092), (0.116, -0.045), (0.115, 0.005), (0.103, 0.05), (0.084, 0.088),
                             (0.058, 0.114), (0.03, 0.127), (0.0, 0.131)]), 24)
HEAD_LINE = spline(mirrored([(0.0, 0.098), (0.042, 0.103), (0.075, 0.12), (0.094, 0.145), (0.095, 0.172), (0.086, 0.2), (0.068, 0.224),
                             (0.038, 0.236), (0.0, 0.24)]), 24)
# (an ear: the left one; the right the same turned over. Its foot well in under the head, its tip leaning out)
EAR_LINE = [(-0.06, 0.198), (-0.036, 0.222), (-0.05, 0.25), (-0.07, 0.27), (-0.084, 0.273), (-0.092, 0.258), (-0.095, 0.228), (-0.088, 0.198)]
EAR_IN = [(-0.054, 0.226), (-0.06, 0.247), (-0.073, 0.262), (-0.082, 0.262), (-0.087, 0.248), (-0.088, 0.226), (-0.074, 0.216)]
# (a paw: the left; a mitten, rounder over, three toes along its foot)
PAW_LINE = [(-0.03, 0.002), (-0.027, 0.017), (-0.013, 0.025), (0.006, 0.026), (0.022, 0.02), (0.03, 0.006), (0.029, -0.011), (0.02, -0.022),
            (0.011, -0.018), (0.002, -0.024), (-0.008, -0.019), (-0.017, -0.023), (-0.026, -0.014)]
# (up over the bezel's foot, so their outline shows against its gold: below it, black on the black belly, they were lost)
PAW_AT = (0.045, -0.077)

body = []
# (the belly: the case, its back on the wall, its front flat where the dial stands)
case = part("cc_case", lambda bm, uvl: pillow(bm, BODY_LINE, 0.0, BODY_Z, BODY_BEVEL), M["white"])
body.append(case)
on_case = surface(case)


def dial(bm, uvl):
    """the dial: a flat disc, its edge under the bezel's inner side; its face the picture's right half"""
    ring = [bm.verts.new(P(0.0685 * math.sin(2 * math.pi * k / 24), -0.0685 * math.cos(2 * math.pi * k / 24), DIAL_Z)) for k in range(24)]
    faces = ladder_fill(bm, ring)
    turn_out(faces, P(0, 0, 0))
    for f in faces:
        f.smooth = False
        for lp in f.loops:
            x, y = lp.vert.co.x, lp.vert.co.z
            lp[uvl].uv = (0.5 + 0.5 * (x + DIAL_R) / PRINT_DIAL, (y + DIAL_R) / PRINT_DIAL)


body.append(part("cc_dial", dial, M["print"]))


def bezel(bm, uvl):
    """the bezel: a ring of brass round the dial, rounded over (its inside down to the dial, its outside down into the belly)"""
    prof = [(0.0675, DIAL_Z - 0.0015), (0.0702, 0.0552), (0.0738, 0.0548), (0.0768, BODY_Z - 0.001)]
    rings = [[bm.verts.new(P(r * math.sin(2 * math.pi * k / 24), -r * math.cos(2 * math.pi * k / 24), z)) for k in range(24)] for r, z in prof]
    faces = []
    for a, b in zip(rings, rings[1:]):
        for k in range(24):
            faces.append(bm.faces.new((a[k], a[(k + 1) % 24], b[(k + 1) % 24], b[k])))
    for f in faces:
        f.normal_update()
        if f.normal.dot(P(0, 0, 1) - P(0, 0, 0)) < 0:
            f.normal_flip()
        f.smooth = True


body.append(part("cc_bezel", bezel, M["gold"]))


def head_uv(x, y):
    return (0.5 * (x + PRINT_HEAD / 2) / PRINT_HEAD, (y - HEAD_C + PRINT_HEAD / 2) / PRINT_HEAD)


# (the head: a cat's face, broad at its cheeks, well proud of the belly and rounded over all round; its front the picture's left half)
body.append(part("cc_head", lambda bm, uvl: pillow(bm, HEAD_LINE, HEAD_Z[0], HEAD_Z[1], HEAD_BEVEL, steps=3, uv=head_uv, uvl=uvl), M["print"]))
# (the ears: grown from behind the head, rounded, a pink lining a little proud of each)
for sd in (-1, 1):
    line = spline([(-sd * x, y) for x, y in EAR_LINE] if sd > 0 else EAR_LINE, 10)
    inner = spline([(-sd * x, y) for x, y in EAR_IN] if sd > 0 else EAR_IN, 8)
    body.append(part(f"cc_ear{sd}", lambda bm, uvl, ln=line: pillow(bm, ln, 0.016, 0.04, 0.012), M["white"]))
    body.append(part(f"cc_eari{sd}", lambda bm, uvl, ln=inner: pillow(bm, ln, 0.034, 0.0425, 0.003, steps=1), M["pink"]))


def collar(bm, uvl):
    """the collar: a band round the neck under the chin, sagging a little at its front (the bell's weight), laid on the belly's surface (cast
    onto it) 5 mm out, its ends going back round the neck's sides into the belly"""
    S, xe, h, t = 12, 0.07, 0.014, 0.005
    rows, mids = [], []
    for i in range(S + 1):
        x = -xe + 2 * xe * i / S
        yc = 0.0885 + 0.012 * (abs(x) / xe) ** 2
        zs = on_case(x, yc) or 0.01
        zb = max(zs - 0.006, 0.004)
        # (its profile: top back, top front, its front (bowed out), bottom front, bottom back)
        prof = [(yc + h / 2, zb), (yc + h / 2, zs + t * 0.7), (yc, zs + t), (yc - h / 2, zs + t * 0.7), (yc - h / 2, zb)]
        rows.append([bm.verts.new(P(x, y, z)) for y, z in prof])
        mids.append(P(x, yc, (zb + zs + t) / 2))
    # (each face turned out from the band's own middle line there)
    for i, (a, b) in enumerate(zip(rows, rows[1:])):
        for k in range(4):
            f = bm.faces.new((a[k], a[k + 1], b[k + 1], b[k]))
            turn_out([f], (mids[i] + mids[i + 1]) / 2)
    for row, mid, other in ((rows[0], mids[0], mids[1]), (rows[-1], mids[-1], mids[-2])):
        f = bm.faces.new(row)
        f.normal_update()
        if f.normal.dot(mid - other) < 0:
            f.normal_flip()
        f.smooth = True


body.append(part("cc_collar", collar, M["red"]))
BELL_C, BELL_R = (0.0, 0.0795, 0.0585), 0.0115


def bell(bm, uvl):
    """a round bell hung from the collar's front (8 round, four rings, its top and foot laddered)"""
    cx, cy, cz = BELL_C
    rings = []
    for i in range(1, 5):
        a = math.pi * i / 5
        rings.append([bm.verts.new(P(cx + BELL_R * math.sin(a) * math.cos(2 * math.pi * k / 8 + 0.2), cy + BELL_R * math.cos(a),
                                     cz + BELL_R * math.sin(a) * math.sin(2 * math.pi * k / 8 + 0.2))) for k in range(8)])
    faces = []
    for k in range(3):
        for j in range(8):
            faces.append(bm.faces.new((rings[k][j], rings[k][(j + 1) % 8], rings[k + 1][(j + 1) % 8], rings[k + 1][j])))
    faces += ladder_fill(bm, rings[0])
    faces += ladder_fill(bm, rings[-1])
    turn_out(faces, P(*BELL_C))


body.append(part("cc_bell", bell, M["gold"]))
# (its mouth: a dark slit across its lower front, on its round)
body.append(part("cc_bellslit", lambda bm, uvl: pillow(bm, [(-0.0072, 0.0748), (0.0072, 0.0748), (0.0072, 0.0766), (-0.0072, 0.0766)],
                                                       0.0662, 0.0706, 0.0008, steps=1), M["black"]))
# (the front paws at the dial's foot, over its bezel)
for sd in (-1, 1):
    line = spline([(PAW_AT[0] * sd + (-x if sd > 0 else x), PAW_AT[1] + y) for x, y in PAW_LINE], 14)
    body.append(part(f"cc_paw{sd}", lambda bm, uvl, ln=line: pillow(bm, ln, 0.024, 0.066, 0.016), M["white"]))
# (the cap over the hands' pivot)
body.append(part("cc_cap", lambda bm, uvl: pillow(bm, spline([(0.0065 * math.sin(2 * math.pi * k / 8), -0.0065 * math.cos(2 * math.pi * k / 8))
                                                              for k in range(8)], 8), 0.0548, 0.0578, 0.0018, steps=1), M["gold"]))
bpy.ops.object.select_all(action="DESELECT")
for o in body:
    o.select_set(True)
bpy.context.view_layer.objects.active = body[0]
bpy.ops.object.join()
BODY = bpy.context.view_layer.objects.active
BODY.name = "CatClockBody"


def hand(name, w, back, length, z):
    o = part(name, lambda bm, uvl: pillow(bm, [(0, -back), (w, -back + w), (w * 0.8, length - 2 * w), (0, length), (-w * 0.8, length - 2 * w),
                                               (-w, -back + w)], 0.0, 0.0018, 0.0006, steps=1), M["hand"])
    o.location = P(0, 0, z)
    return o


HOUR = hand("CatClockHour", 0.0045, 0.012, 0.04, 0.0506)
MINUTE = hand("CatClockMinute", 0.0032, 0.015, 0.06, 0.0528)


# ---- the tail: a round tube from its root down in an S, its tip curling up; its pivot at its root. In two: the tip from JOIN on
TAIL_PATH = spline([(0.0, 0.0, 0.0), (0.007, -0.042, 0.004), (-0.005, -0.086, 0.008), (0.002, -0.126, 0.01), (0.018, -0.16, 0.012),
                    (0.038, -0.177, 0.012), (0.052, -0.168, 0.012)], 9, closed=False)
JOIN = 4


def tube(bm, pts, r0, r1, cap_top, cap_end, at):
    """a tube along pts (the game's frame, less `at`), its radius r0 → r1 along it, 8 round; its ends shut by ladders where asked"""
    sides, rings = 8, []
    pts = [Vector(p) - Vector(at) for p in pts]
    for i, p in enumerate(pts):
        d = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        side = Vector((0, 0, 1)).cross(d).normalized()
        up = d.cross(side).normalized()
        rr = r0 + (r1 - r0) * i / (len(pts) - 1)
        rings.append([bm.verts.new(P(*(p + side * rr * math.cos(2 * math.pi * k / sides) + up * rr * math.sin(2 * math.pi * k / sides))))
                      for k in range(sides)])
    faces = []
    for i in range(len(rings) - 1):
        for k in range(sides):
            faces.append(bm.faces.new((rings[i][k], rings[i][(k + 1) % sides], rings[i + 1][(k + 1) % sides], rings[i + 1][k])))
    # (turned out from the path's own line, each face from its nearest point of it)
    for f in faces:
        f.normal_update()
        c = f.calc_center_median()
        near = min((P(*p) for p in pts), key=lambda q: (q - c).length)
        if f.normal.dot(c - near) < 0:
            f.normal_flip()
        f.smooth = True
    # (its ends shut, each looking on out along the path)
    for want, ring, out_ in ((cap_top, rings[0], P(*pts[0]) - P(*pts[1])), (cap_end, rings[-1], P(*pts[-1]) - P(*pts[-2]))):
        if not want:
            continue
        for f in ladder_fill(bm, ring):
            f.normal_update()
            if f.normal.dot(out_) < 0:
                f.normal_flip()
            f.smooth = True
            faces.append(f)
    return faces


R_ROOT, R_TIP = 0.0115, 0.0068
r_join = R_ROOT + (R_TIP - R_ROOT) * JOIN / (len(TAIL_PATH) - 1)
TAIL = part("CatClockTail", lambda bm, uvl: tube(bm, TAIL_PATH[:JOIN + 1], R_ROOT, r_join, True, False, (0, 0, 0)), M["white"])
TAIL.location = P(0.0, -0.108, 0.016)
TIP = part("CatClockTailTip", lambda bm, uvl: tube(bm, TAIL_PATH[JOIN:], r_join, R_TIP, False, True, TAIL_PATH[JOIN]), M["white"])
TIP.parent = TAIL
TIP.location = P(*TAIL_PATH[JOIN])

root = bpy.data.objects.new("CatClock", None)
bpy.context.collection.objects.link(root)
for o in (BODY, HOUR, MINUTE, TAIL):
    o.parent = root
for o in (BODY, HOUR, MINUTE, TAIL, TIP):
    print("CATCLOCK_PART", o.name, sum(len(p_.vertices) - 2 for p_ in o.data.polygons))
print("CATCLOCK_TRIS", sum(len(p_.vertices) - 2 for o in (BODY, HOUR, MINUTE, TAIL, TIP) for p_ in o.data.polygons))

export_dish(root, [BODY, HOUR, MINUTE, TAIL, TIP, root], os.path.join(PROJECT, "public", "models", "catclock.glb"),
            os.path.join(PROJECT, "blender", "catclock.blend"), PREVIEW)
print("CATCLOCK_DONE")
