"""A tall clump of green bamboo out by the shop's door (item 703, the owner's 「這邊加上一株綠竹，要高的。」, circled: right of the way in, under
the eave, where the fish lantern hangs):

- bamboo.glb, node "DoorBamboo": four culms of one clump (2.45, 2.2, 2.0 and 1.55 from the soil), a fresh green with the waxy bloom
  under each node, a step and a pale ring at every node, leaning a little away from the door; a side branch off each upper node, a twig of
  narrow drooping leaves on it (cards: the potted bamboo's leaf, blender/barfurnish.py), a tuft at each culm's top; planted in a box of
  charred cedar (yakisugi, black with its silver grain) with a rim of oiled cedar, its soil strewn with pale pebbles.

Its own frame is the doorway's (look-door's: x along the front, + away from the door toward the north; y up; z out to the street), moved
to the box's foot's middle (AT, where the game puts it): what's round it there was measured in the game (tests/e2e/_bamboo703b.mjs) and
its branches and leaves are kept out of it: the fish lantern hung beside it (and its bracket back to the eave), the eave's rafters over it.

Item 737 (the owner's 「根部種植的位置應該要center一點，且枝葉往外垂，然後陰影要算出來」, circling the culms' feet in the box's back
corner, an arrow from the leaves out and down): the culms' feet in toward the box's middle (they stood 7.5 cm to the building's side of it on
average, 2.5 now), leaning a touch the door's way as they rise to stay clear of the fish lantern over the box's other half; their branches
out away from the door and the building, to the street (OUT), near level, the twigs and the leaves on them hanging (a culm's top tuft too);
its shadow the game's (BarFurnish's DoorBambooModel casts).

Run:
    blender -b --factory-startup --python blender/bamboo.py -- <project path> [preview.png]
"""
import math
import os
import random
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


def P(x, y, z):
    return (x, -z, y)


def lin(hexs):
    c = [int(hexs[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def fin(o, name, mat, parts, smooth=True):
    o.name = name
    o.data.materials.clear()
    o.data.materials.append(mat)
    for p in o.data.polygons:
        p.use_smooth = smooth
    parts.append(o)
    return o


# where the game stands it (the doorway's frame; src/shops/grill/guestbar/entrance.tsx's DOOR_BAMBOO_AT): on the street's ground (y -0.46)
# right of the way in, under the eave; up against the building's side there (item 707, the owner's 「幫我貼齊」: it stood 0.39 out on its own):
# its rim's left face 2 mm off the facade's dark side panel (x 0.525, measured: tests/e2e/_wall707.mjs); and out to the street 0.30 (item
# 728, the owner's 「竹往前，不被門吃掉」: its culms stood behind the door's frame, whose front is at z 0.49, and from the street on the door's
# left only their leaves showed past its post): its culms' feet now 2.6 cm and more in front of it, the box's back still in beside the
# frame's side (to z 0.457), 2.2 cm off the stone steps' right end (x 0.505, tests/e2e/_bamboo728.mjs)
AT = (0.692, -0.46, 0.622)


def near(x0, x1, y0, y1, z0, z1, m):
    """a box measured in the doorway's frame, in this one, grown by m"""
    return ((x0 - AT[0] - m, x1 - AT[0] + m), (y0 - AT[1] - m, y1 - AT[1] + m), (z0 - AT[2] - m, z1 - AT[2] + m))


# (the fish lantern's whole box with its bracket back to the eave's beam, 4.5 cm clear (it sways 5 mm); the building's side behind the
# planter now (the facade's panel and the wall over it, x under 0.525 back from z 0.49), 2 cm clear; the way in before the door (x under
# its post's 0.47, out to the street), 2 cm clear: its leaves hung over the door's half, in the customers' way; the eave's rafters'
# underside at 2.35 over all of it, 2 cm clear)
# (item 824, the owner's 「竹子不要碰到燈籠魚」: 4.5 cm clear of the lantern's box its leaves were, its culms 5 cm, and from in front, the
# street's side, the clump and the fish read as one, the culms and the leaves through it: 10 cm clear now, the culms in at the box's side
# by the building)
KEEP_OUT = [near(0.73, 0.99, 0.94, 2.19, 0.21, 0.81, 0.10), near(-1.0, 0.525, -0.46, 2.4, -1.0, 0.49, 0.02),
            near(-1.5, 0.47, -0.46, 2.4, 0.45, 1.6, 0.02)]
CEILING = 2.33 - AT[1]


def clear(p):
    """a point (this frame) none of it may reach"""
    if p[1] > CEILING:
        return False
    for xr, yr, zr in KEEP_OUT:
        if xr[0] < p[0] < xr[1] and yr[0] < p[1] < yr[1] and zr[0] < p[2] < zr[1]:
            return False
    return True


# Pictures
# =====================================================================
def bamboo_leaf(N=256):
    """a bamboo leaf (as the potted bamboo's, blender/barfurnish.py), along u from its stalk to its tip: narrow and long, widest a third of
    the way, drawn out to a fine point; a fresh green, paler along its midrib, fine veins along it, a dark line round its edge; clear outside"""
    u, v = grid01(N)
    ac = np.abs(v - 0.5) * 2
    prof = np.where(u < 0.12, u / 0.12 * 0.6, np.clip(np.sin(np.pi * np.clip((u - 0.04) / 0.96, 0, 1) ** 0.65), 0, 1)) * 0.95
    prof = prof * np.clip((1.0 - u) / 0.35, 0, 1) ** 0.6
    inn = prof - ac
    col = mix((0.16, 0.42, 0.1), (0.3, 0.58, 0.16), np.clip(u * 0.4 + fbm(N, 6, 6, 3) * 0.4 + smooth(0.6, 1.0, ac) * 0.3, 0, 1))
    rib = smooth(0.05, 0.0, ac)
    veins = smooth(0.8, 1.0, np.cos(ac * np.pi * 9) * 0.5 + 0.5) * (1 - rib) * 0.25
    col = mix(col, (0.62, 0.8, 0.38), np.clip(rib * 0.8 + veins, 0, 1))
    col = mix(col, (0.06, 0.2, 0.04), smooth(0.08, 0.0, inn) * 0.85)
    return col, smooth(-0.01, 0.015, inn)


def culm_picture(N=256):
    """a length of culm between two nodes (u round it, v up it): a fresh green, finely streaked along, a little mottled; the waxy white bloom
    in a band just under the node above (v 0.84 to 0.96), the node's own line darker olive at the very top, a shade darker just over the
    node below"""
    u, v = grid01(N)
    base = mix((0.24, 0.46, 0.1), (0.36, 0.58, 0.16), np.clip(fbm(N, 3, 10, 4) * 1.1 - 0.05, 0, 1))
    streak = np.clip(np.sin(u * math.pi * 2 * 23 + fbm(N, 4, 2, 2) * 6) * 0.5 + 0.5, 0, 1) ** 6 * 0.12
    base = mix(base, (0.5, 0.68, 0.26), streak)
    base = mix(base, (0.16, 0.32, 0.07), smooth(0.08, 0.0, v) * 0.45)
    bloom = smooth(0.82, 0.88, v) * smooth(0.975, 0.93, v) * (0.55 + 0.45 * fbm(N, 16, 2, 3))
    base = mix(base, (0.66, 0.74, 0.58), bloom * 0.55)
    base = mix(base, (0.36, 0.38, 0.12), smooth(0.965, 0.99, v) * 0.85)
    return image("doorBambooCulm", base)


def yakisugi_picture(N=256):
    """charred cedar boards (焼杉) up the box's side, four to a side (u across, v up): black with a brown cast board to board, the char's
    crackle in small scales, the grain's silver catching the light in long wavering lines, a dark seam between boards"""
    u, v = grid01(N)
    board = np.floor(u * 4)
    tone = (np.sin(board * 12.9898) * 43758.5453) % 1.0
    col = mix((0.035, 0.03, 0.03), (0.075, 0.06, 0.05), tone * 0.8 + fbm(N, 6, 3, 3) * 0.3)
    cells = fbm(N, 28, 18, 2)
    crack = smooth(0.08, 0.0, np.abs(cells - 0.5)) * 0.6
    col = mix(col, (0.008, 0.008, 0.008), crack)
    grain = np.sin((u * 4 % 1) * math.pi * 2 * 5 + fbm(N, 2, 5, 3) * 9 + board * 2.3)
    silver = smooth(0.86, 0.98, grain) * (0.45 + 0.55 * fbm(N, 3, 9, 3))
    col = mix(col, (0.42, 0.42, 0.44), silver * 0.55)
    seam = smooth(0.012, 0.0, np.minimum(u * 4 % 1, 1 - u * 4 % 1))
    col = mix(col, (0.0, 0.0, 0.0), seam * 0.9)
    return image("yakisugi", col)


def cedar_picture(N=256):
    """oiled cedar (the rim): a warm reddish brown, its grain in fine lines along it, a darker latewood every so often"""
    u, v = grid01(N)
    g = np.sin(v * math.pi * 2 * 9 + fbm(N, 3, 2, 3) * 5) * 0.5 + 0.5
    col = mix((0.38, 0.2, 0.1), (0.52, 0.31, 0.16), fbm(N, 8, 2, 3))
    col = mix(col, (0.24, 0.11, 0.05), smooth(0.75, 0.95, g) * 0.6)
    return image("cedarRim", col)


def soil_picture(N=256):
    """the box's soil: dark and crumbly, strewn thick with pale pebbles a centimetre or so across, each with its shadow on the soil"""
    rnd = np.random.default_rng(7)
    u, v = grid01(N)
    col = mix((0.09, 0.06, 0.04), (0.17, 0.12, 0.08), fbm(N, 20, 20, 3))
    for _ in range(90):
        cx, cy, r = rnd.random(), rnd.random(), 0.02 + rnd.random() * 0.025
        a = rnd.random() * math.pi
        dx, dy = (u - cx + 0.5) % 1 - 0.5, (v - cy + 0.5) % 1 - 0.5
        rx, ry = dx * math.cos(a) + dy * math.sin(a), -dx * math.sin(a) + dy * math.cos(a)
        d = np.sqrt((rx / r) ** 2 + (ry / (r * 0.7)) ** 2)
        sh = np.sqrt(((rx - r * 0.25) / r) ** 2 + ((ry + r * 0.25) / (r * 0.7)) ** 2)
        col = mix(col, (0.03, 0.02, 0.015), smooth(1.15, 0.9, sh) * 0.6)
        tone = 0.72 + rnd.random() * 0.2
        peb = mix(np.broadcast_to(np.float32((tone, tone * 0.97, tone * 0.9)), d.shape + (3,)), (0.95, 0.94, 0.9), smooth(0.7, 0.0, d) * 0.4)
        col = np.where((d < 1)[..., None], peb, col)
    return image("planterSoil", col)


# Shapes
# =====================================================================
def tube(name, pts, radii, sides, uv_v, cap_bottom=True, cap_top=False):
    """a tube along `pts` (this frame), each ring its radius, `sides` round; UVs round it (u) and along it (`uv_v` each ring's v); its ends
    closed flat if asked (laddered on export, never fanned)"""
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new()
    rings = []
    for i, (p, r) in enumerate(zip(pts, radii)):
        d = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        a = d.cross(Vector((0, 0, 1)))
        if a.length < 1e-4:
            a = d.cross(Vector((1, 0, 0)))
        a.normalize()
        b = d.cross(a).normalized()
        rings.append([bm.verts.new(Vector(P(*(p + (a * math.cos(2 * math.pi * j / sides) + b * math.sin(2 * math.pi * j / sides)) * r)))) for j in range(sides)])
    for i in range(len(rings) - 1):
        for j in range(sides):
            j2 = (j + 1) % sides
            f = bm.faces.new((rings[i][j], rings[i][j2], rings[i + 1][j2], rings[i + 1][j]))
            for lp, (u, v) in zip(f.loops, ((j / sides, uv_v[i]), ((j + 1) / sides, uv_v[i]), ((j + 1) / sides, uv_v[i + 1]), (j / sides, uv_v[i + 1]))):
                lp[uvl].uv = (u, v)
    if cap_bottom:
        f = bm.faces.new(list(reversed(rings[0])))
        for lp in f.loops:
            lp[uvl].uv = (0.5, 0.02)
    if cap_top:
        f = bm.faces.new(rings[-1])
        for lp in f.loops:
            lp[uvl].uv = (0.5, 0.5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    return o


def door_bamboo():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    seed(31)
    rng = random.Random(9)
    # (item 705, the Optimization window's: the leaf's two tints side by side on one cut-out picture, the plain one left and the paler one
    # right (the pale's tint, lin #d8f0b8, multiplied in as the material's colour did, in linear light): the leaves one material, one draw)
    leaf_col, leaf_a = bamboo_leaf()
    s2l = lambda c: np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    l2s = lambda c: np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(np.clip(c, 0, None), 1 / 2.4) - 0.055)
    pale = l2s(s2l(leaf_col) * np.asarray(lin("#d8f0b8"), np.float32))
    leaf_img = image("doorBambooLeaves", np.concatenate([leaf_col, pale], axis=1), alpha=np.concatenate([leaf_a, leaf_a], axis=1))
    M = {"culm": pbr("BambooCulm", (1, 1, 1), tex=culm_picture(), rough=0.35, coat=0.3),
         "node": pbr("BambooNode", lin("#7d8f3e"), rough=0.5),
         "leaf": pbr("BambooLeafCutout", (1, 1, 1), tex=leaf_img, rough=0.45, blend=True),
         "yaki": pbr("PlanterYakisugi", (1, 1, 1), tex=yakisugi_picture(), rough=0.85),
         "rim": pbr("PlanterCedar", (1, 1, 1), tex=cedar_picture(), rough=0.55),
         "soil": pbr("PlanterSoil", (1, 1, 1), tex=soil_picture(), rough=0.95),
         "pebble": pbr("PlanterPebble", lin("#e4ded0"), rough=0.5)}
    parts = []
    # ---- the box: charred cedar, 0.30 square, its soil 0.27 up; a rim of oiled cedar round its top, a little proud of it
    W, H, SOIL = 0.15, 0.27, 0.27
    box = chunky_box("PlanterBox", -W, W, -W, W, 0.0, H, 0.01, 1, M["soil"], M["yaki"], uv_scale=0.3)
    parts.append(box)
    RO, RI, R0, R1 = 0.165, 0.138, 0.252, 0.31
    for i, (x0, x1, y0, y1) in enumerate([(-RO, RO, -RO, -RI), (-RO, RO, RI, RO), (-RO, -RI, -RI + 0.001, RI - 0.001), (RI, RO, -RI + 0.001, RI - 0.001)]):
        parts.append(chunky_box(f"PlanterRim{i}", x0, x1, y0, y1, R0, R1, 0.006, 1, M["rim"], M["rim"], uv_scale=0.3))
    # ---- the culms: each its base on the soil, its height, its lean, its girth; nodes closer at the foot, longer up it. (Item 707: a tight
    # clump on the planter's side by the building, between its wall (x 0.525 back from z 0.49) and the fish lantern's box (from x 0.73 up
    # from y 0.94, 4.5 cm clear): standing all but straight across, leaning out to the street (+z); their branches find their own way out)
    # (item 737: in toward the box's middle, the feet 2.5 cm to the building's side of it on average (7.5 cm before), leaning the door's way
    # a little as they rise, to pass the fish lantern's box (from 1.36 up over the box's other half) and out to the street)
    # (item 824: their feet 7 cm further to the building's side, against the box's inner wall there, so they rise 10 cm clear of the
    # fish lantern's box (they were 5 cm))
    culms = [((-0.1, -0.04), 2.35, (-0.07, 0.12), 0.022), ((-0.07, 0.035), 2.15, (-0.1, 0.22), 0.02),
             ((-0.115, 0.075), 1.95, (-0.04, 0.28), 0.018), ((-0.09, -0.085), 1.55, (-0.03, -0.04), 0.016)]
    # (which way is out (item 737): away from the door and the building's side, to the street)
    OUT = math.atan2(1.0, 0.6)
    # (each culm's middle kept clear of the lantern's box and the building's side, its girth with it: said, not made, if not)
    for (bx, bz), h, (lx, lz), r0 in culms:
        for t in [i / 20 for i in range(21)]:
            p = Vector((bx + lx * t * t, SOIL + h * t, bz + lz * t * t))
            for dx, dz in ((r0, 0), (-r0, 0), (0, r0), (0, -r0)):
                assert clear(p + Vector((dx, 0, dz))), ('culm in the way', bx, bz, t, tuple(p))
    leaf_bm = bmesh.new()
    leaf_uv = leaf_bm.loops.layers.uv.new()
    n_leaves = [0]

    def leaf_at(at, d0, L, twist, k):
        """a leaf card from `at` along `d0` (this frame), L long, drooping toward its tip; False (and nothing made) if any of it isn't clear"""
        side = d0.cross(Vector((0, 1, 0)))
        if side.length < 1e-4:
            side = Vector((1, 0, 0))
        side.normalize()
        side = (side * math.cos(twist) + d0.cross(side) * math.sin(twist)).normalized()
        Wd = L * 0.24
        pts = []
        for r_ in range(3):
            t_ = r_ / 2
            c_ = at + d0 * (L * t_) + Vector((0, -0.035 * t_ * t_, 0))
            pts.append((c_ - side * Wd / 2, c_ + side * Wd / 2))
        if not all(clear(q) for pr in pts for q in pr):
            return False
        rows = [(leaf_bm.verts.new(Vector(P(*a))), leaf_bm.verts.new(Vector(P(*b)))) for a, b in pts]
        for r_ in range(2):
            f = leaf_bm.faces.new((rows[r_][0], rows[r_ + 1][0], rows[r_ + 1][1], rows[r_][1]))
            for lp, uv in zip(f.loops, ((r_ / 2, 0), ((r_ + 1) / 2, 0), ((r_ + 1) / 2, 1), (r_ / 2, 1))):
                lp[leaf_uv].uv = uv
            f.material_index = k % 2
        n_leaves[0] += 1
        return True

    for k, ((bx, bz), h, (lx, lz), r0) in enumerate(culms):
        def pt(t, bx=bx, bz=bz, h=h, lx=lx, lz=lz):
            return Vector((bx + lx * t * t, SOIL + h * t, bz + lz * t * t))

        nodes, t = [0.0], 0.0
        while True:
            t += (0.17 + 0.1 * min(1.0, t * 1.6)) / h
            if t >= 0.97:
                break
            nodes.append(t)
        nodes.append(1.0)
        # (each length between two nodes its own tube: its foot full, its top a hair narrower, so the next one's foot stands out round it as
        # the node's step; its foot closed (the step's ledge), its top hidden in the next; the last drawn to a narrow, closed top)
        for i in range(len(nodes) - 1):
            ta, tb = nodes[i], nodes[i + 1]
            ra, rb = r0 * (1 - 0.5 * ta), r0 * (1 - 0.5 * tb)
            last = i == len(nodes) - 2
            o = tube(f"BambooCulm{k}_{i}", [pt(ta), pt(tb)], [ra, rb * (0.45 if last else 0.95)], 6, [0.0, 1.0], cap_bottom=True, cap_top=last)
            fin(o, f"BambooCulm{k}_{i}", M["culm"], parts)
        # (two branches off each node in its upper part, about opposite, round the culm by turns, rising out; a twig on from each one's tip
        # with its leaves along it, left and right by turns, one at its end, and a short side twig of three off its middle; a branch that
        # can't keep its leaves clear tried the next way round, or left off)
        for i, tn in enumerate([n for n in nodes[1:-1] for _ in (0, 1)], start=2):
            if tn < 0.36:
                continue
            base = pt(tn)
            for attempt in range(5):
                # (out, item 737: within some 75 degrees of OUT either side by turns, each try a little further round; near level, rising
                # only a little off the node, where they rose at 30 degrees all round)
                spread = (0.25 + 0.95 * ((i * 0.618 + k * 0.37) % 1.0)) * (1 if (i + k) % 2 else -1)
                ang = OUT + spread + (attempt * 0.35 if spread > 0 else -attempt * 0.35)
                dirv = Vector((math.cos(ang), 0.18, math.sin(ang))).normalized()
                blen = 0.13 + 0.08 * rng.random()
                tip = base + dirv * blen
                # (the twig on from it bending down, hanging (it rose a little before))
                tw_dir = (dirv + Vector((0, -0.85, 0))).normalized()
                tw_len = 0.09 + 0.05 * rng.random()
                tw_tip = tip + tw_dir * tw_len
                if not (clear(tip) and clear(tw_tip) and clear((base + tip) / 2)):
                    continue
                flat = Vector((tw_dir.x, 0, tw_dir.z)).normalized()
                n_leaf = 5 + (i + k) % 3
                plan = []
                for j in range(n_leaf):
                    s_at = 0.15 + 0.85 * j / (n_leaf - 1)
                    at = tip + tw_dir * (tw_len * s_at)
                    side_sign = 1 if j % 2 else -1
                    la = math.atan2(flat.z, flat.x) + (0.0 if j == n_leaf - 1 else side_sign * (0.7 + 0.4 * rng.random()))
                    L = 0.13 + rng.random() * 0.05
                    d0 = Vector((math.cos(la), -0.6 - 0.35 * rng.random(), math.sin(la))).normalized()
                    plan.append((at, d0, L, rng.uniform(-0.5, 0.5)))
                made = sum(leaf_at(at, d0, L, tw_, i + k + j) for j, (at, d0, L, tw_) in enumerate(plan))
                if not made:
                    continue
                fin(tube(f"BambooBranch{k}_{i}", [base, tip], [0.0045, 0.003], 3, [0.0, 1.0], cap_bottom=False), f"BambooBranch{k}_{i}", M["node"], parts)
                fin(tube(f"BambooBranchTwig{k}_{i}", [tip, tw_tip], [0.0028, 0.0018], 3, [0.0, 1.0], cap_bottom=False), f"BambooBranchTwig{k}_{i}", M["node"], parts)
                # (the side twig off the branch's middle, the other way round, three leaves on it)
                mid = (base + tip) / 2
                sd = (dirv + Vector((-dirv.z, -0.2, dirv.x)) * 0.9).normalized()
                st_tip = mid + sd * 0.07
                if clear(st_tip):
                    sflat = Vector((sd.x, 0, sd.z)).normalized()
                    got = 0
                    for j in range(3):
                        la = math.atan2(sflat.z, sflat.x) + (j - 1) * 0.8
                        d0 = Vector((math.cos(la), -0.6 - 0.3 * rng.random(), math.sin(la))).normalized()
                        got += leaf_at(mid + sd * (0.03 + 0.02 * j), d0, 0.12 + rng.random() * 0.04, rng.uniform(-0.5, 0.5), i + k + j + 1)
                    if got:
                        fin(tube(f"BambooBranchSide{k}_{i}", [mid, st_tip], [0.0022, 0.0015], 3, [0.0, 1.0], cap_bottom=False), f"BambooBranchSide{k}_{i}", M["node"], parts)
                break
        # (and a tuft at its top: six leaves fanned out and drooping off its tip, as a culm's top is)
        top = pt(1.0)
        for j in range(6):
            la = j * 1.05 + k * 0.6
            d0 = Vector((math.cos(la), -0.05 - 0.4 * rng.random(), math.sin(la))).normalized()
            leaf_at(top + Vector((0, -0.02, 0)), d0, 0.15 + rng.random() * 0.04, rng.uniform(-0.4, 0.4), j + k)
    me = bpy.data.meshes.new("BambooLeaves")
    leaf_bm.to_mesh(me)
    leaf_bm.free()
    lo = bpy.data.objects.new("BambooLeaves", me)
    bpy.context.collection.objects.link(lo)
    lo.data.materials.append(M["leaf"])
    uvd = lo.data.uv_layers.active.data
    for p_ in lo.data.polygons:
        p_.use_smooth = True
        half = 0.5 * p_.material_index
        for li in p_.loop_indices:
            uvd[li].uv = (half + uvd[li].uv[0] * 0.5, uvd[li].uv[1])
        p_.material_index = 0
    parts.append(lo)
    # ---- a few pebbles on the soil, clear of the culms' feet
    feet = [Vector((bx, SOIL, bz)) for (bx, bz), *_ in culms]
    placed = 0
    while placed < 4:
        a, r = rng.random() * 6.28, 0.03 + rng.random() * 0.09
        c = Vector((math.cos(a) * r, SOIL + 0.004, math.sin(a) * r))
        if any((c - f).length < 0.04 for f in feet):
            continue
        bpy.ops.mesh.primitive_ico_sphere_add(radius=0.012 + rng.random() * 0.006, subdivisions=0, location=P(*c))
        m = bpy.context.view_layer.objects.active
        m.scale = (1.3, 1, 0.55)
        bpy.ops.object.transform_apply(scale=True)
        fin(m, f"PlanterPebble{placed}", M["pebble"], parts)
        placed += 1
    # (item 705: the culms' length, the charred cedar, the oiled rim, the soil, and the plain colours (the branches, the pebbles) packed on one
    # page (common.py's slot_atlas, as the shrine's area is (docs/BAKING.md stage B)): the opaque parts one material, one draw)
    pages, cut = slot_atlas("DoorBambooAtlas", parts, 1024, 1024, skip=lambda m: "Cutout" in m.name, cell=272, pad=8, rough=0.6)
    print("ATLAS pages", len(pages) if isinstance(pages, (list, tuple)) else 1, "faces cut", cut)
    root = bpy.data.objects.new("DoorBamboo", None)
    bpy.context.collection.objects.link(root)
    for o in parts:
        o.parent = root
    if PREVIEW:
        # (a camera from the street, a little right and up, and a sun, for the preview only: not exported (only the clump is selected))
        cam = bpy.data.objects.new("PreviewCam", bpy.data.cameras.new("PreviewCam"))
        bpy.context.collection.objects.link(cam)
        cam.location = Vector(P(2.2, 1.6, 4.8))
        cam.rotation_euler = (Vector(P(0.08, 1.35, 0.0)) - cam.location).to_track_quat("-Z", "Y").to_euler()
        bpy.context.scene.camera = cam
        sun = bpy.data.objects.new("PreviewSun", bpy.data.lights.new("PreviewSun", "SUN"))
        sun.data.energy = 3.5
        sun.rotation_euler = (0.9, 0.3, 0.7)
        bpy.context.collection.objects.link(sun)
        world = bpy.data.worlds.new("PreviewWorld")
        world.color = (0.35, 0.37, 0.4)
        bpy.context.scene.world = world
    export_dish(root, parts + [root], os.path.join(PROJECT, "public", "models", "bamboo.glb"), os.path.join(PROJECT, "blender", "bamboo.blend"), PREVIEW)
    tris = 0
    for o in parts:
        o.data.calc_loop_triangles()
        tris += len(o.data.loop_triangles)
    print("BAMBOO_DONE parts", len(parts), "leaves", n_leaves[0], "triangles", tris)


door_bamboo()
