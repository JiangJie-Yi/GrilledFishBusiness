"""The kitchen's serving counter (配膳台, servecounter.glb; item 167, the owner's, 2026-11-15: the takeaways' boxes stood in a plate at the cook
table's plating place, "if it's the orders that do it, a serving counter, there in the red box": the floor between the cook table and the
freezer). Wood and bamboo (item 403, the owner's, 2026-11-20: 「這要用木竹」: since items 254 and 286 it was all bamboo, its top, its back, its
ends and its doors woven 網代 over all of them, a flat picture of weaving): a board of pale hinoki for its top, its edges eased round; a frame
of darker wood, its square legs and its rails; under the top a cupboard of two sliding doors, each a wooden frame round a panel of split
bamboo (割竹) set upright, a short round culm for its pull; its ends the same split bamboo in their frames, its back a plain board. The aged
bamboo of items 254 and 286 kept (the fence's kind, yellow-brown, flaking): each split strip its own tone, its nodes at heights of its own.
Its top level with the cook table's, the takeaways' boxes packed and waiting on it.

- node "ServeCounter": the table. Low-poly: boxes and a few 8-sided culms; its top's, its doors' and its ends' split bamboo strips as
  they are (item 621: each strip three faces, a V between it and the next), their nodes, fibres and the shade of their hollows in their
  pictures; an indigo cloth over the whole of its top (items 622, 679), round its edges' culms and hanging past them on all four sides,
  its corners hanging lower; 七宝 (shippo) on it inside a pale double line.
- node "ServeCounterTop": an empty at the middle of its top (what's set on it stands there).
- node "ServeCounterFront": an empty on the floor before its front (+z) middle, where one stands to take from it.

The game's frame, in the bar's units (GuestBar3D's): y up from the floor it stands on, x along it, its front toward +z; its foot's middle at the
origin; H high (the cook table's top, standing on the kitchen's dais), D deep, L long.

Run:
    blender -b --factory-startup --python blender/servecounter.py -- <project path> [preview.png]
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
    """the game's (three's) frame into Blender's: y up there, z up here"""
    return Vector((x, -z, y))


# (all bamboo again, item 438 (item 403 had made its top and frame wood); the culm's skin of items 254 and 286 (the fence's kind,
# 「已經放一段時間的那種竹」, 「然後會有點撥離感」) for its culms, the split strips for its top, back, ends and doors)
L, D, H = 1.0, 0.36, 0.496
TT = 0.03             # the top's thickness
LEG_W = 0.036         # the legs: square
LEG_IN = 0.034        # the legs' middles in from the top's edges
FLOOR_Y, FLOOR_T = 0.05, 0.012   # the cupboard's floor
CULM_TILE = 0.36      # the culm's picture: its length along a culm (two nodes to it)
SPLIT_TILE = 0.24     # the split bamboo's picture: 16 strips across it, as tall
WOOD_TILE = 0.5       # the boards' pictures

N = 512
seed(254)
u, v = grid01(N)
# ---- the culm's skin: around it (u), along it (v)
base = np.array((0.80, 0.64, 0.38), np.float32)
mott = 0.86 + 0.18 * fbm(N, 3, 10, 4)
streak = 0.95 + 0.05 * np.sin((u * 26 + (fbm(N, 4, 2, 3) - 0.5) * 1.2) * 2 * math.pi)
culm = base[None, None, :] * (mott * streak)[..., None]
# (a few dark specks, as old bamboo has)
speck = smooth(0.9, 0.96, vnoise(N, 180, 180)) * smooth(0.55, 0.8, fbm(N, 8, 8, 3))
culm = mix(culm, (0.42, 0.3, 0.17), speck * 0.8)
# (its waxy skin flaked off in places: paler, duller, a thin dark edge round each patch)
flake = fbm(N, 5, 14, 4)
patch = smooth(0.76, 0.79, flake)
edge = smooth(0.73, 0.76, flake) - patch
culm = mix(culm, (0.88, 0.8, 0.62), patch * 0.85)
culm = mix(culm, (0.5, 0.37, 0.21), np.clip(edge, 0, 1) * 0.55)
# (its nodes: two to the picture's length, a dark line with a pale ridge over it and a shade under it)
for c0 in (0.25, 0.75):
    d = v - c0
    line = np.exp(-(d / 0.006) ** 2)
    ridge = np.exp(-((d - 0.014) / 0.008) ** 2)
    shade = np.exp(-((d + 0.02) / 0.016) ** 2)
    culm = mix(culm, (0.94, 0.86, 0.66), ridge * 0.55)
    culm = mix(culm, (0.55, 0.42, 0.25), shade * 0.35)
    culm = mix(culm, (0.32, 0.22, 0.12), line * 0.9)
# ---- the split bamboo (割竹): culms split and set side by side, each strip its own tone, its nodes at two heights of its own (staggered, as a
# screen's are), fibres up it. (Item 621, the owner's 「有沒有辦法讓這個配膳檯的竹子看起來更有立體感」: item 499 had painted each strip's
# round and the gap between into a flat board's picture, and with the room's toon light (two steps: a lit face all one step) and the strips
# a few pixels wide on the screen it read as a printed board. The strips are faces now (split_strips() below: up its edge, across its
# crown, down its other edge, a V where it meets the next): the toon light's step falls across them, their line drawn round them. Each
# strip's picture is one of this tile's sixteen across it; what's baked into it, from a tile of the strips as they stand (the high model: a
# height in pixels, its crown 4.6 up over its edges, its nodes a ridge with a groove at each, fibres up it): how much of the sky each point
# of it sees (16 ways round, out to a strip and a half), the V and under each node darker, never under six tenths (docs/BAKING.md); a thin
# dark line where two strips meet (the slit seen into); a waxy sheen along each crown. No light baked. Its normal map only the nodes and the
# fibres (the strip's round is in its faces))
STRIPS = 16
si = np.floor(u * STRIPS).astype(int)
fu = u * STRIPS - si
rs = np.random.default_rng(403)
tone = (0.84 + 0.22 * rs.random(STRIPS))[si]
hue = rs.random(STRIPS)[si]
nodes_at = rs.random(STRIPS)[si]
arch = np.sin(np.pi * np.clip(fu, 0, 1)) ** 0.6


def sky_seen(h, ways=16, reach=(1, 2, 3, 4, 6, 8, 11, 15, 20, 26, 34, 44)):
    """how much of the sky each point of a tiling height field (its heights in its own pixels) sees: round `ways` directions, how high
    the ground rises toward the horizon within `reach` pixels; 1 open, less shut in"""
    seen = np.zeros_like(h)
    for k in range(ways):
        a = 2 * math.pi * k / ways
        dx, dy = math.cos(a), math.sin(a)
        best = np.zeros_like(h)
        for s in reach:
            sh = np.roll(np.roll(h, -int(round(dy * s)), axis=0), -int(round(dx * s)), axis=1)
            best = np.maximum(best, (sh - h) / s)
        seen += 1 - best / np.sqrt(1 + best * best)
    return seen / ways


node_h = np.zeros_like(u)
for k0 in (0.0, 0.5):
    dd = ((v - (nodes_at + k0) % 1.0 + 0.5) % 1.0) - 0.5
    node_h = node_h + 1.4 * np.exp(-((dd - 0.012) / 0.009) ** 2) * arch ** 0.5 - 1.1 * np.exp(-(dd / 0.005) ** 2)
hs = 4.6 * arch + node_h
shade = 0.6 + 0.4 * np.clip((sky_seen(hs) - 0.55) / 0.42, 0, 1)
split = base[None, None, :] * tone[..., None]
split = mix(split, (0.88, 0.71, 0.4), (hue > 0.72).astype(np.float32) * 0.32)
split = mix(split, (0.56, 0.38, 0.21), (hue < 0.22).astype(np.float32) * 0.36)
split = split * (0.95 + 0.05 * np.sin((v * 70 + fu * 2) * 2 * math.pi))[..., None]
for k0 in (0.0, 0.5):
    dd = ((v - (nodes_at + k0) % 1.0 + 0.5) % 1.0) - 0.5
    split = mix(split, (0.95, 0.87, 0.67), np.exp(-((dd - 0.012) / 0.009) ** 2) * 0.5 * arch)
    split = mix(split, (0.3, 0.2, 0.11), np.exp(-(dd / 0.006) ** 2) * 0.9)
    split = mix(split, (0.5, 0.36, 0.2), np.exp(-((dd + 0.016) / 0.012) ** 2) * 0.3)
# (and a few strips' skin flaked, paler, as the culms' is: in long narrow patches up a strip, not blots across several)
split = mix(split, (0.88, 0.8, 0.62), smooth(0.74, 0.78, fbm(N, 24, 3, 4)) * 0.6 * arch)
split = mix(split, (1.0, 0.94, 0.76), arch ** 6 * 0.22)
split = split * shade[..., None]
split = mix(split, (0.25, 0.16, 0.08), np.exp(-(np.minimum(fu, 1 - fu) / 0.035) ** 2) * 0.75)
# (the normal map: the nodes, the fibres up it)
h_split = node_h / 6.0 + 0.04 * fbm(N, 64, 2, 3)
# (the culm's: its nodes a ring standing proud of the skin with its groove, its fibres along it)
h_culm = 0.03 * fbm(N, 48, 2, 3)
for c0 in (0.25, 0.75):
    d = v - c0
    h_culm = h_culm + 0.8 * np.exp(-((d - 0.012) / 0.012) ** 2) - 0.4 * np.exp(-(d / 0.005) ** 2)


def wood_picture(base_, dark, rings, seed_):
    """a board's wood: its grain's lines along it (u), wandering, a few streaks; `rings` lines across the picture"""
    seed(seed_)
    # (hinoki's grain fine and straight, wandering only a little: at 2.4 and 0.45 it read as marble)
    wob = fbm(N, 2, 6, 4)
    lines = smooth(0.7, 1.0, np.sin((v * rings + wob * 1.0) * 2 * math.pi))
    col = mix(np.array(base_, np.float32)[None, None, :] * np.ones((N, N, 1), np.float32), dark, lines * 0.28)
    return col * (0.93 + 0.07 * fbm(N, 2, 24, 4))[..., None]


top_wood = wood_picture((0.86, 0.72, 0.52), (0.68, 0.52, 0.34), 16, 4031)
# (the cloth's picture is made with it, below: its size is the cloth's)
# (a mid brown: darker it went black in the kitchen's shade)
frame_wood = wood_picture((0.54, 0.35, 0.2), (0.38, 0.24, 0.13), 12, 4032)
M = {
    "culm": pbr("ServeCulm", (1, 1, 1), tex=image("servecounter_culm", np.clip(culm, 0, 1).astype(np.float32)),
                nrm=image("servecounter_culm_nrm", to_normal(h_culm, 8.0).astype(np.float32), data=True), nrm_strength=1.0, rough=0.55),
    "split": pbr("ServeSplit", (1, 1, 1), tex=image("servecounter_split", np.clip(split, 0, 1).astype(np.float32)),
                 nrm=image("servecounter_split_nrm", to_normal(h_split, 12.0).astype(np.float32), data=True), nrm_strength=1.0, rough=0.55),
    "top": pbr("ServeTopWood", (1, 1, 1), tex=image("servecounter_top", np.clip(top_wood, 0, 1).astype(np.float32)), rough=0.5),
    "frame": pbr("ServeFrameWood", (1, 1, 1), tex=image("servecounter_frame", np.clip(frame_wood, 0, 1).astype(np.float32)), rough=0.55),
}
parts = []


def box_uv(o, tile):
    """every face's picture laid flat on it at its true size, from whichever side it faces"""
    bm = bmesh.new()
    bm.from_mesh(o.data)
    # (its layer named as the culms' and the eased boxes' are: verify() names a new one "Float2", and joined into one mesh with "UVMap"
    # first, every box's picture was lost, all of it at one corner (item 403: the split bamboo a dark gap's colour, black))
    uvl = bm.loops.layers.uv.get("UVMap") or bm.loops.layers.uv.new("UVMap")
    for f in bm.faces:
        nn = f.normal
        for loop in f.loops:
            c = o.matrix_world @ loop.vert.co
            if abs(nn.z) >= max(abs(nn.x), abs(nn.y)):
                loop[uvl].uv = (c.x / tile, c.y / tile)
            elif abs(nn.x) >= abs(nn.y):
                loop[uvl].uv = (c.y / tile, c.z / tile)
            else:
                loop[uvl].uv = (c.x / tile, c.z / tile)
    bm.to_mesh(o.data)
    bm.free()


def block(name, lo, hi, mat, tile):
    """a box from `lo` to `hi` (the game's frame), its picture at its true size"""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    c = (Vector(lo) + Vector(hi)) / 2
    s = Vector(hi) - Vector(lo)
    for vv in bm.verts:
        vv.co = P(c.x + vv.co.x * s.x, c.y + vv.co.y * s.y, c.z + vv.co.z * s.z)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(M[mat])
    box_uv(o, tile)
    parts.append(o)
    return o


def culm(name, a, b, r, segs=8, turn=0.0):
    """a round culm from `a` to `b` (the game's frame), `segs` round, capped; its picture round it and along it (nodes every half
    CULM_TILE), turned round its length by `turn` (each its own way, so their nodes and patches don't line up)"""
    a, b = Vector(a), Vector(b)
    ax = (b - a)
    length = ax.length
    w = ax.normalized()
    t = Vector((0, 1, 0)) if abs(w.y) < 0.9 else Vector((1, 0, 0))
    e1 = w.cross(t).normalized()
    e2 = w.cross(e1).normalized()
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new("UVMap")
    rings = []
    for end in (a, b):
        ring = []
        for kk in range(segs):
            ang = 2 * math.pi * kk / segs + turn
            p = end + (e1 * math.cos(ang) + e2 * math.sin(ang)) * r
            ring.append(bm.verts.new(P(p.x, p.y, p.z)))
        rings.append(ring)
    off = (turn * 0.37) % 1.0
    for kk in range(segs):
        k2 = (kk + 1) % segs
        f = bm.faces.new((rings[0][kk], rings[0][k2], rings[1][k2], rings[1][kk]))
        u0, u1 = kk / segs, (kk + 1) / segs
        for loop, (uu, vv) in zip(f.loops, ((u0, off), (u1, off), (u1, off + length / CULM_TILE), (u0, off + length / CULM_TILE))):
            loop[uvl].uv = (uu, vv)
    for ring, flip in ((rings[0], True), (rings[1], False)):
        f = bm.faces.new(list(reversed(ring)) if flip else ring)
        for loop in f.loops:
            loop[uvl].uv = (0.5, off)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(M["culm"])
    for p_ in o.data.polygons:
        p_.use_smooth = len(p_.vertices) == 4
    parts.append(o)
    return o


def eased(name, lo, hi, mat, bw, segs=2, bottom=True):
    """a box from `lo` to `hi` (the game's frame) with its edges eased round (common.chunky_box: its normals hardened), its picture at its
    true size"""
    o = chunky_box(name, lo[0], hi[0], -hi[2], -lo[2], lo[1], hi[1], bw, segs, M[mat], M[mat], bottom=bottom, uv_scale=WOOD_TILE)
    parts.append(o)
    return o


# (all bamboo (item 438, the owner's, 2026-11-21: 「這個我要全竹子的，拉門可拉」: item 403 had made it a hinoki top on a frame of darker wood,
# the split bamboo only in its doors and ends): its legs, the rails under its top and the stretchers near the floor round culms, nodes and
# all; its top split bamboo laid along it, its edges finished with culms; its back and ends upright split bamboo; its two sliding doors
# each framed in thin culms round a panel of split bamboo, each its own node (the game slides them); inside, the takeaways' spare boxes and
# a bundle of disposable chopsticks, seen with a door open)
def lin(hexs):
    """a #rrggbb colour into linear light, for pbr's base colour"""
    c = [int(hexs[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple((x / 12.92) if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


M["kraft"] = pbr("ServeKraft", lin("#b8915e"), rough=0.8)
M["kraftlid"] = pbr("ServeKraftLid", lin("#cfae7c"), rough=0.8)
M["chop"] = pbr("ServeChop", lin("#e6d3a8"), rough=0.6)
M["band"] = pbr("ServeBand", lin("#b8261c"), rough=0.6)


def block_along(name, lo, hi, mat, tile):
    """a box as block() is, its top's and foot's picture turned a quarter round (split bamboo laid along it, its strips along x)"""
    o = block(name, lo, hi, mat, tile)
    bm = bmesh.new()
    bm.from_mesh(o.data)
    uvl = bm.loops.layers.uv.get("UVMap")
    for f in bm.faces:
        if abs(f.normal.z) >= max(abs(f.normal.x), abs(f.normal.y)):
            for loop in f.loops:
                c = o.matrix_world @ loop.vert.co
                loop[uvl].uv = (c.y / tile, c.x / tile)
    bm.to_mesh(o.data)
    bm.free()
    return o


STRIP_W = 0.02         # a split strip's width (item 621)
STRIP_UP = 0.004        # how far its crown stands over its edges
STRIP_PROF = ((0.0, 0.0), (1 / 3, 0.85), (2 / 3, 0.85), (1.0, 0.0))   # across it, up (of STRIP_UP): up its edge, its crown, down


def split_strips(name, at, across, along, out, width, length, v0=0.0):
    """split bamboo as it is (item 621): strips side by side over `width` (along the unit vector `across` from the point `at`, the game's
    frame), each `length` long (along `along`), standing out along `out`: each strip three faces (up its edge, across its crown, down its
    other edge), a V where it meets the next; its picture one of the tile's strips across each (the tile's sixteen in turn), along it at
    its true size from `v0`; flat-faced, the toon light's step falling across them"""
    at, across, along, out = Vector(at), Vector(across), Vector(along), Vector(out)
    n = max(1, round(width / STRIP_W))
    w = width / n
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new("UVMap")
    for k in range(n):
        col = k % STRIPS
        for (t0, h0), (t1, h1) in zip(STRIP_PROF, STRIP_PROF[1:]):
            pts = []
            for t, h, s in ((t0, h0, 0.0), (t1, h1, 0.0), (t1, h1, length), (t0, h0, length)):
                q = at + across * ((k + t) * w) + out * (h * STRIP_UP) + along * s
                pts.append((P(q.x, q.y, q.z), ((col + t) / STRIPS, v0 + s / SPLIT_TILE)))
            f = bm.faces.new([bm.verts.new(c) for c, _ in pts])
            for loop, (_, uv) in zip(f.loops, pts):
                loop[uvl].uv = uv
            # (its face out along `out`)
            f.normal_update()
            if f.normal.dot(P(out.x, out.y, out.z)) < 0:
                f.normal_flip()
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(M["split"])
    for p_ in o.data.polygons:
        p_.use_smooth = False
    parts.append(o)
    return o


LR = 0.018               # the legs' culms' radius (their 3.6 cm, the square legs' size)
RR = 0.011               # the rails' and stretchers'
LX, LZ = L / 2 - LEG_IN, D / 2 - LEG_IN
# ---- the top: split bamboo laid along it, a culm along each edge. (Item 621: the strips as they are, on a board a millimetre under their
# edges, from the end culms' middles to the edges' culms' middles: their crowns as high as the culms' tops (the takeaway's box, the bowls and
# the sake set on it at SERVE_TOP, 4 mm over); its board's own top was the strips' picture)
ER = 0.013
block_along("ServeTop", (-L / 2 + 0.012, H - TT, -D / 2 + 0.012), (L / 2 - 0.012, H - 0.004 - STRIP_UP - 0.001, D / 2 - 0.012), "split", SPLIT_TILE)
split_strips("ServeTopStrips", (-L / 2 + ER, H - 0.004 - STRIP_UP * 0.85, -D / 2 + ER), (0, 0, 1), (1, 0, 0), (0, 1, 0), D - 2 * ER, L - 2 * ER)
for sz in (-1, 1):
    culm(f"ServeEdge{sz}", (-L / 2, H - TT / 2 - 0.002, sz * (D / 2 - ER)), (L / 2, H - TT / 2 - 0.002, sz * (D / 2 - ER)), ER, segs=8, turn=0.4 + sz)
for sx in (-1, 1):
    culm(f"ServeEdgeEnd{sx}", (sx * (L / 2 - ER), H - TT / 2 - 0.002, -D / 2 + 2 * ER + 0.001), (sx * (L / 2 - ER), H - TT / 2 - 0.002, D / 2 - 2 * ER - 0.001),
         ER, segs=8, turn=1.3 + sx)
# ---- the legs: culms, up to the top's foot
for sx in (-1, 1):
    for sz in (-1, 1):
        culm(f"ServeLeg{sx}{sz}", (sx * LX, 0.0, sz * LZ), (sx * LX, H - TT - 0.001, sz * LZ), LR, segs=8, turn=0.7 * (sx + 2 * sz))
# ---- under the top all round, and near the floor at the back and the ends: rails of culm between the legs, a hair clear of them
ix = LX - LR - 0.002     # the cupboard's ends, inside the legs
zb = -LZ + LR - 0.004    # its back's front face
zf = LZ + LR - 0.004     # its front: the doors' outer track's front face
top_y = H - TT - 0.026   # the rail under the top's middle: the doors' tops just under it
for sz in (-1, 1):
    culm(f"ServeRail{sz}", (-LX + LR + 0.001, top_y, sz * LZ), (LX - LR - 0.001, top_y, sz * LZ), RR, segs=8, turn=2.1 + sz)
for sx in (-1, 1):
    culm(f"ServeRailEnd{sx}", (sx * LX, top_y, -LZ + LR + 0.001), (sx * LX, top_y, LZ - LR - 0.001), RR, segs=8, turn=2.9 + sx)
    culm(f"ServeStretch{sx}", (sx * LX, FLOOR_Y + 0.004, -LZ + LR + 0.001), (sx * LX, FLOOR_Y + 0.004, LZ - LR - 0.001), RR, segs=8, turn=3.7 + sx)
culm("ServeStretchBack", (-LX + LR + 0.001, FLOOR_Y + 0.004, -LZ), (LX - LR - 0.001, FLOOR_Y + 0.004, -LZ), RR, segs=8, turn=4.4)
# ---- the cupboard: its floor split bamboo along it on the stretchers; its back and its ends upright split bamboo, between the legs and the rails
block_along("ServeFloor", (-ix, FLOOR_Y + RR, zb - 0.008), (ix, FLOOR_Y + RR + FLOOR_T, zf - 0.03), "split", SPLIT_TILE)
block("ServeBack", (-ix, FLOOR_Y + RR + FLOOR_T + 0.001, zb - 0.01), (ix, top_y - RR - 0.001, zb), "split", SPLIT_TILE)
for sx in (-1, 1):
    xs0, xs1 = sorted((sx * (ix - 0.006), sx * (ix - 0.0015)))
    ey0, ey1, ez = FLOOR_Y + RR + 0.004, top_y - RR - 0.001, LZ - LR - 0.001
    block(f"ServeEnd{sx}", (xs0, ey0, -ez), (xs1, ey1, ez), "split", SPLIT_TILE)
    # (item 621: its strips upright on its outer face, their crowns 2.4 mm out past where its face was, inside the rails and the legs)
    split_strips(f"ServeEndStrips{sx}", (sx * (ix - 0.001), ey0, -ez), (0, 0, 1), (0, 1, 0), (sx, 0, 0), 2 * ez, ey1 - ey0, v0=0.31 + 0.27 * sx)
# (the doors' bottom track: a culm along the front on the floor's edge)
culm("ServeTrack", (-LX + LR + 0.001, FLOOR_Y + RR, zf - 0.02), (LX - LR - 0.001, FLOOR_Y + RR, zf - 0.02), 0.007, segs=6, turn=5.2)
# ---- what's kept in it: the takeaways' spare boxes in two stacks of kraft, a bundle of wari-bashi in its paper band
fy = FLOOR_Y + RR + FLOOR_T
for k, cx in enumerate((-0.27, -0.06)):
    for j in range(3):
        y0 = fy + 0.001 + j * 0.043
        block(f"ServeBox{k}{j}", (cx - 0.09, y0, zb + 0.02), (cx + 0.09, y0 + 0.036, zb + 0.15), "kraft", 0.3)
        block(f"ServeBoxLid{k}{j}", (cx - 0.092, y0 + 0.036, zb + 0.018), (cx + 0.092, y0 + 0.042, zb + 0.152), "kraftlid", 0.3)
block("ServeChops", (0.12, fy + 0.001, zb + 0.03), (0.33, fy + 0.046, zb + 0.09), "chop", 0.3)
block("ServeChopsBand", (0.205, fy + 0.0005, zb + 0.0295), (0.245, fy + 0.0465, zb + 0.0905), "band", 0.3)
# ---- the two doors: each a little over half the opening, one in the outer track, one in the inner, overlapping in the middle; each a frame
# of thin culms round its split bamboo panel, a short upright culm for its pull by its outer edge; each its own node, its origin its middle
DW = ix + 0.02
door_lo, door_hi = FLOOR_Y + RR + FLOOR_T + 0.002, top_y - RR - 0.002
FR = 0.007               # the frame's culms' radius
doors = []
for d_, (x0, x1, zz) in enumerate(((-ix, -ix + DW, zf - 0.012), (ix - DW, ix, zf - 0.03))):
    nm = f"ServeDoor{d_}"
    first = len(parts)
    culm(nm + "Top", (x0, door_hi - FR, zz), (x1, door_hi - FR, zz), FR, segs=6, turn=0.3 + d_)
    culm(nm + "Bot", (x0, door_lo + FR, zz), (x1, door_lo + FR, zz), FR, segs=6, turn=0.9 + d_)
    culm(nm + "L", (x0 + FR, door_lo + 2 * FR + 0.001, zz), (x0 + FR, door_hi - 2 * FR - 0.001, zz), FR, segs=6, turn=1.6 + d_)
    culm(nm + "R", (x1 - FR, door_lo + 2 * FR + 0.001, zz), (x1 - FR, door_hi - 2 * FR - 0.001, zz), FR, segs=6, turn=2.2 + d_)
    block(nm + "Panel", (x0 + FR, door_lo + FR, zz - 0.003), (x1 - FR, door_hi - FR, zz + 0.0005), "split", SPLIT_TILE)
    # (item 621: its strips upright on its front, from the frame's culms' middles in, their crowns 2.6 mm short of the culms' fronts)
    split_strips(nm + "Strips", (x0 + FR, door_lo + FR, zz + 0.001), (1, 0, 0), (0, 1, 0), (0, 0, 1), x1 - x0 - 2 * FR, door_hi - door_lo - 2 * FR,
                 v0=0.13 + 0.41 * d_)
    px = x0 + 2 * FR + 0.012 if d_ == 0 else x1 - 2 * FR - 0.012
    my = (door_lo + door_hi) / 2
    culm(nm + "Pull", (px, my - 0.03, zz + 0.008), (px, my + 0.03, zz + 0.008), 0.005, segs=6, turn=0.6 * (d_ + 1))
    mine = parts[first:]
    del parts[first:]
    bpy.ops.object.select_all(action="DESELECT")
    for o in mine:
        o.select_set(True)
    bpy.context.view_layer.objects.active = mine[0]
    bpy.ops.object.join()
    door = bpy.context.view_layer.objects.active
    door.name = nm
    bpy.context.scene.cursor.location = P((x0 + x1) / 2, (door_lo + door_hi) / 2, zz)
    bpy.ops.object.select_all(action="DESELECT"); door.select_set(True); bpy.context.view_layer.objects.active = door
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
    doors.append(door)
    print("SERVE_DOOR", nm, "slides", round(DW - 0.04, 4))


# ---- the cloth (item 622, the owner's 「然後上面鋪一層藍色的方巾」; item 679, the owner's 「膳檯的方巾要蓋住整面，然後有些花紋」): indigo
# cotton over the whole of the top, 3 mm thick: over the strips' crowns and the culms' tops half a millimetre clear, round the edges' culms
# at its front and back, and at its ends round a little out from the end culms (the front and back culms run on past them, their cut ends
# square: a round on the end culms' line went through those ends' corners), hanging a little way down past them on all four sides, a hair
# out from them and a touch further at its hems. At each corner the cloth left over hangs lower: its hems come down to a point a little out
# from the corner, over the last few centimetres (as a cloth bigger than a table hangs there). Its top 0.5 mm under SERVE_TOP: everything
# set on the counter (the bowls, the takeaway's box, the sake) stands on it, none half on it (item 622's cloth was 0.42 wide in the middle).
# Low-poly: one grid over all of it, each way a hem, the culm's side and its round in two to where it lies flat, a line in from each corner
# (the dip comes down over it), the flat between; its underside only under its hang (the rest lies on the top and the culms, unseen); its
# hems thin to nothing (no strip round them). Its picture once over all of it at its true size, about a millimetre a pixel (cloth_picture)
CLOTH_T = 0.003
XE, ZE = L / 2 - ER + 0.0045, D / 2 - ER           # where it lies flat to: x the end culms' middles and 4.5 mm out; z the edges' culms' middles
cy, cr = H - 0.004 + 0.0005, ER + 0.0005           # its foot over the crowns (H - 0.004); its round over the culms
cy_c = H - TT / 2 - 0.002                          # the culms' middles' height
DROP = 0.022                                       # its hems below the culms' middles (as item 622's: 2.2 cm)
DIP, DIP_OUT, DIP_LEN = 0.012, 0.003, 0.06         # a corner's point that much lower and out; its hems come down to it over that length
IN = 0.04                                          # the line in from each corner of where it lies flat
# (its profile over an edge from its hem in: out from the edge's middle line, height; and its outward way there (out, up))
prof = [(cr + 0.0015, cy_c - DROP), (cr, cy_c), (cr * 0.7071, cy_c + cr * 0.7071), (0.0, cy)]
outw = [(1.0, 0.0), (1.0, 0.0), (0.7071, 0.7071), (0.0, 1.0)]
arc = [0.0]
for (o0, y0), (o1, y1) in zip(prof, prof[1:]):
    arc.append(arc[-1] + math.hypot(o1 - o0, y1 - y0))
S = arc[-1]                                        # how much of it goes over each edge, hem to flat
WC, DC = 2 * S + 2 * XE, 2 * S + 2 * ZE            # its size laid out flat


def cloth_marks(E):
    """its lines across one way, from one hem to the other: (side -1/0/1, profile index or None where it lies flat, the place that way if
    flat, its place on the cloth from that way's first hem)"""
    out = [(-1, k, None, arc[k]) for k in range(4)]
    out += [(0, None, -(E - IN), S + IN), (0, None, E - IN, S + 2 * E - IN)]
    out += [(1, k, None, 2 * S + 2 * E - arc[k]) for k in (3, 2, 1, 0)]
    return out


def cloth_picture(W=1024):
    """its picture at its true size (WC by DC, about a millimetre a pixel). (Item 757, the owner's 「桌墊要有白邊，花紋改成這樣」, a picture of a
    slate-blue cloth strewn with white chrysanthemums, and the cloth as it was, indigo in 七宝 rings: ) slate blue, the dye a little uneven
    (paler in soft patches), its weave; strewn with white chrysanthemums cut as 菊割り, each its own size (1.6 to 5 cm across the half), a
    count of thin petals (16, 20 or 24) from a small heart out to rounded tips, a hair of the blue between each two; none on another; and
    round it a white border, a fine slate line along its inner edge: (item 777, the owner's 「白邊太多」: down its hang, over the culm's round
    and 2.2 cm in onto its top, 6.5 cm of it from the hem; 3 cm, its hang and the round's foot, still a wide white band face on) the
    lower part of its hang, 1.8 cm from its hem (a hem band, as a cloth's is), the blue over the culm's round and the top of its hang"""
    HP = int(round(W * DC / WC / 4)) * 4
    col = np.arange(W, dtype=np.float32)[None, :].repeat(HP, 0)
    row = np.arange(HP, dtype=np.float32)[:, None].repeat(W, 1)
    X, Y = (col + 0.5) / W * WC, (row + 0.5) / HP * DC
    seed(622)
    pic = np.ones((HP, W, 3), np.float32) * np.array((0.27, 0.36, 0.45), np.float32)[None, None, :]
    pic = mix(pic, (0.35, 0.44, 0.53), smooth(0.55, 0.85, fbm(W, 15, 6, 4)[np.arange(HP) * W // HP]) * 0.35)
    edge = np.minimum(np.minimum(X, WC - X), np.minimum(Y, DC - Y))
    BORDER = 0.018
    field = smooth(BORDER, BORDER + 0.0015, edge)
    # (the flowers: placed one by one, each clear of the others by a little; within the field, a few running under its border)
    rf = np.random.default_rng(757)
    flowers = []
    for _ in range(6000):
        if len(flowers) >= 30:
            break
        r = 0.016 + rf.random() ** 1.7 * 0.034
        x = BORDER - r * 0.35 + rf.random() * (WC - 2 * BORDER + r * 0.7)
        y = BORDER - r * 0.35 + rf.random() * (DC - 2 * BORDER + r * 0.7)
        if any(math.hypot(x - fx, y - fy) < (r + fr) * 1.06 for fx, fy, fr, _, _ in flowers):
            continue
        flowers.append((x, y, r, int(rf.choice([16, 20, 24])), rf.random() * 2 * math.pi))
    white = np.zeros(X.shape, np.float32)
    px = W / WC
    for fx, fy, fr, n, rot in flowers:
        c0, c1 = max(0, int((fx - fr) * px) - 2), min(W, int((fx + fr) * px) + 3)
        r0, r1 = max(0, int((fy - fr) * px) - 2), min(HP, int((fy + fr) * px) + 3)
        if c0 >= c1 or r0 >= r1:
            continue
        dx, dy = X[r0:r1, c0:c1] - fx, Y[r0:r1, c0:c1] - fy
        rho = np.hypot(dx, dy)
        per = 2 * math.pi / n
        th = np.mod(np.arctan2(dy, dx) - rot, per) - per / 2
        aw = np.abs(th) / (per / 2)
        # (a petal: most of its share of the round, the gap between a hair of the blue that widens a little toward the tip; its tip rounded;
        # from a little way out of the heart)
        tip = fr * (1 - 0.14 * aw ** 2)
        gap = 0.8 - 0.1 * np.clip(rho / fr, 0, 1)
        petal = smooth(gap + 0.06, gap - 0.02, aw) * smooth(tip + 0.0007, tip - 0.0007, rho) * smooth(fr * 0.15, fr * 0.19, rho)
        heart = 1 - smooth(fr * 0.085, fr * 0.1, rho)
        white[r0:r1, c0:c1] = np.maximum(white[r0:r1, c0:c1], np.maximum(petal, heart))
    pic = mix(pic, (0.95, 0.95, 0.93), white * field)
    weave = 0.93 + 0.07 * (0.5 + 0.5 * np.sin((col + 0.5) * math.pi * 0.5)) * (0.5 + 0.5 * np.sin((row + 0.5) * math.pi * 0.5))
    pic = pic * weave[..., None]
    # (the white border, and its fine slate line)
    pic = mix(pic, (0.94, 0.94, 0.91), 1 - field)
    pic = mix(pic, (0.33, 0.41, 0.5), np.exp(-((edge - (BORDER - 0.003)) / 0.0007) ** 2) * 0.8)
    return np.clip(pic, 0, 1).astype(np.float32)


cloth_pic = cloth_picture()
M["cloth"] = pbr("ServeCloth", (1, 1, 1), tex=image("servecounter_cloth", cloth_pic), rough=0.9)
CX, CZ = cloth_marks(XE), cloth_marks(ZE)


def cloth_point(mx, mz):
    """a point of it at the lines `mx` (across x) and `mz` (across z): its foot, its outward way, whether it's on a hem. Where both are over
    an edge (a corner), as low as the lower of the two; its hems near a corner come down to the corner's point and out"""
    def one(m, E):
        sgn, k, flat, _ = m
        if k is None:
            return flat, cy, (0.0, 1.0), False
        off, y = prof[k]
        return sgn * (E + off), y, outw[k], k == 0
    x, yx, nx, hx = one(mx, XE)
    z, yz, nz, hz = one(mz, ZE)
    sx, sz = mx[0], mz[0]
    y = min(yx, yz)
    if yx < yz - 1e-6:
        n = Vector((sx * nx[0], nx[1], 0.0))
    elif yz < yx - 1e-6:
        n = Vector((0.0, nz[1], sz * nz[0]))
    else:
        n = Vector((sx * nx[0], (nx[1] + nz[1]) / 2, sz * nz[0]))
    n.normalize()
    if hx or hz:
        # (how far along its hem from the corner: an end's hem runs along z, the front's and back's along x)
        s = 0.0 if (hx and hz) else (ZE + prof[0][0] - abs(z)) if hx else (XE + prof[0][0] - abs(x))
        k = max(0.0, 1 - s / DIP_LEN) ** 2
        y -= DIP * k
        if hx:
            x += sx * DIP_OUT * k
        if hz:
            z += sz * DIP_OUT * k
    return Vector((x, y, z)), n, (hx or hz)


bm = bmesh.new()
uvl = bm.loops.layers.uv.new("UVMap")
lo, hi, nrm = {}, {}, {}
for i, mx in enumerate(CX):
    for j, mz in enumerate(CZ):
        f, n, hem = cloth_point(mx, mz)
        t = f + n * CLOTH_T
        hi[i, j] = bm.verts.new(P(t.x, t.y, t.z))
        # (its hems thin to nothing: the underside meets the top there)
        lo[i, j] = hi[i, j] if hem else bm.verts.new(P(f.x, f.y, f.z))
        nrm[i, j] = n
UVS = {(i, j): (CX[i][3] / WC, CZ[j][3] / DC) for i in range(len(CX)) for j in range(len(CZ))}


def cloth_face(keys, verts, way):
    """a face of it through `verts` (at the grid's `keys`), turned to face `way` (the game's frame)"""
    f = bm.faces.new(verts)
    for loop, key in zip(f.loops, keys):
        loop[uvl].uv = UVS[key]
    f.normal_update()
    if f.normal.dot(P(way.x, way.y, way.z)) < 0:
        f.normal_flip()
    return f


last, lastz = len(CX) - 1, len(CZ) - 1
for i in range(len(CX) - 1):
    for j in range(len(CZ) - 1):
        keys = [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)]
        way = sum((nrm[k] for k in keys), Vector())
        cloth_face(keys, [hi[k] for k in keys], way)
        # (the underside: under its hang only, the band from the culms' sides to the hems all round)
        if i in (0, last - 1) or j in (0, lastz - 1):
            cloth_face(keys, [lo[k] for k in keys], -way)
me = bpy.data.meshes.new("ServeCloth")
bm.to_mesh(me)
bm.free()
cloth_o = bpy.data.objects.new("ServeCloth", me)
bpy.context.collection.objects.link(cloth_o)
cloth_o.data.materials.append(M["cloth"])
for p_ in cloth_o.data.polygons:
    p_.use_smooth = False
parts.append(cloth_o)
print("SERVE_CLOTH_FACES", len(me.polygons), "tris", sum(len(p.vertices) - 2 for p in me.polygons), "top", round(cy + CLOTH_T, 4),
      "flat", round(WC, 4), round(DC, 4), "picture", cloth_pic.shape[1], cloth_pic.shape[0], "drop", DROP)

# (one node of it all, its own name; the marks)
bpy.ops.object.select_all(action="DESELECT")
for o in parts:
    o.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join()
counter = bpy.context.view_layer.objects.active
counter.name = "ServeCounter"
root = bpy.data.objects.new("ServeCounterRoot", None)
bpy.context.collection.objects.link(root)
counter.parent = root
for d_o in doors:
    d_o.parent = root
top = bpy.data.objects.new("ServeCounterTop", None)
top.location = P(0, H, 0)
front = bpy.data.objects.new("ServeCounterFront", None)
front.location = P(0, 0, D / 2 + 0.18)
for o in (top, front):
    bpy.context.collection.objects.link(o)
    o.parent = root
print("SERVE_TRIS", sum(len(p.vertices) - 2 for o in [counter] + doors for p in o.data.polygons))
export_dish(root, [counter, top, front, root] + doors, os.path.join(PROJECT, "public", "models", "servecounter.glb"),
            os.path.join(PROJECT, "blender", "servecounter.blend"), PREVIEW)
print("SERVE_DONE")
