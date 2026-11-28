"""The little cabinet by the staff's door that the samurai helmet sits on (kabutostand.glb; the owner's, 2026-11-12: "a small wooden stand
beside the staff-only door, and the helmet on it"; item 292, 2026-11-17: 「台座的模型太複雜了」「武士頭盔底下的台座有拉門」): a low cabinet of
dark keyaki, its top a paler board overhanging it a little, two sliding doors across its front in their own tracks (引き戸), each its frame
round a low board (腰板) and over it a kumiko lattice standing off washi paper, a round bronze pull let into its outer stile; inside a
shelf, and the helmet's own lacquered box on its floor (where it's put away out of season). Clean boxes, about 150 triangles in all: the
grain, the lattice and the pulls in its picture (colour, and their relief in a normal map), nothing carved in the mesh.
Item 826 (the owner's, 2026-11-28: 「櫃門調亮一些，且門是左右開拉，品質提升些」): the doors' lattice was over a near black ground, the
door's tall face drawn from 256 rows and every grain running one way; now the paper behind the lattice (warm white), the picture 1024
square with the door's face on 256 by 1024 (the same pixels each way), each part's grain along its length, the lattice's edges smooth.

The game's frame: y up from the floor, x along the wall, z out from it; its foot's middle at the origin; in the wall's own units (DiningRoom's
wall frame: the wainscot 0.85 high), drawn as it is. As before: 0.30 along the wall, 0.20 out, its top at 0.70 (the helmet's place and the
way past it unchanged, item 48).

- "KabutoStandBody": everything that doesn't move: the plinth, the sides, the back, the floor, the top, the rail over the doors and the
  track under them, the shelf, the box.
- "KabutoStandDoorL", "KabutoStandDoorR": the two doors, the left in the back track, the right in the front one; each slides across behind
  or before the other to open its half (the game's).

Run:
    blender -b --factory-startup --python blender/kabutostand.py -- <project path> [preview.png]
"""
import math
import os
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import export_dish, image, pbr  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
PROJECT = argv[0] if argv else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PREVIEW = argv[1] if len(argv) > 1 else None
bpy.ops.wm.read_factory_settings(use_empty=True)

H, W, D, TOP_T = 0.70, 0.30, 0.20, 0.032
SIDE_T, BACK_T, PL_H = 0.018, 0.012, 0.05
X_IN = W / 2 - SIDE_T               # the inside's half width
FRONT = D / 2                        # the sides' front faces
OPEN_Y = (0.082, 0.638)              # the doors' opening, between the track and the rail
DOOR_T = 0.011
DOOR_W = X_IN + 0.006                # each door a little more than half, overlapping in the middle
TRACK_Z = {"L": (0.077, 0.077 + DOOR_T), "R": (0.0885, 0.0885 + DOOR_T)}


def P(x, y, z):
    return Vector((x, -z, y))


def lin(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return np.array([x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c], np.float32)


# =====================================================================
# Its picture, 1024 square (u, v from the picture's bottom left; rows go up from its foot: row r is v r/N), each part's grain along its
# length:
#   the door's face, 256 by 1024 (its 0.14 by 0.55, the same pixels each way) (0..0.25, 0..1);
#   the carcass's keyaki, its grain up it (the sides, the back, the doors' edges) (0.25..0.5, 0..1);
#   the top's paler board, its grain along it (0.5..1, 0..0.25); the carcass's keyaki along (the plinth, the track, the rail) (0.5..1,
#   0.25..0.5); the inside's plain pale wood (0.5..0.75, 0.5..1); the helmet's box, black lacquer, a gold line round its lid's foot
#   (0.75..1, 0.5..1);
# and the door's relief (its frame proud, the low board a little back, the lattice standing off the paper, the pull let in), a height
# turned to a normal map
# =====================================================================
N = 1024


def wood(h, w, tone, lines=30, seed=0, vertical=True, figure=0.8):
    """a wood's face, h rows by w columns, as a colour (linear): its grain lines along its length (up the picture if `vertical`, else along
    it), a little wavy, the late wood darker, a streak or two, a fine noise"""
    r = np.random.default_rng(seed)
    a = np.linspace(0, 1, w)[None, :] if vertical else np.linspace(0, 1, h)[:, None]
    b = np.linspace(0, 1, h)[:, None] if vertical else np.linspace(0, 1, w)[None, :]
    g = 0.5 + 0.5 * np.sin((a * lines + np.sin(b * 5 + a * 3) * figure + np.sin(b * 31) * 0.05) * math.pi * 2)
    k = 0.8 + 0.16 * g ** 1.7 - 0.07 * (r.random((1, w)) if vertical else r.random((h, 1))) + r.normal(0, 0.016, (h, w))
    return np.clip(k, 0, 1.2)[..., None] * lin(tone)[None, None, :]


def blur(a, r):
    """a box blur r pixels round, down the rows then along them (wrapping)"""
    k = 2 * r + 1
    c = np.cumsum(np.pad(a, ((r + 1, r), (0, 0)), mode="wrap"), 0)
    a = (c[k:] - c[:-k]) / k
    c = np.cumsum(np.pad(a, ((0, 0), (r + 1, r)), mode="wrap"), 1)
    return (c[:, k:] - c[:, :-k]) / k


KEYAKI, TOP, FRAME, KUMIKO, KOSHI, PAPER, INSIDE_T = "#7a4a2a", "#a8743f", "#8a5a32", "#bb8d5a", "#7f4d2b", "#efe4cb", "#b89468"


def washi(h, w, seed=9):
    """the paper behind a door's lattice: warm white, a soft mottle, short pale strands and a few darker ones (its fibres)"""
    r = np.random.default_rng(seed)
    m = blur(r.normal(0, 1, (h, w)), 9)
    k = 1.0 + 0.035 * m / (np.abs(m).max() + 1e-6) + r.normal(0, 0.01, (h, w))
    img = np.clip(k, 0, 1.2)[..., None] * lin(PAPER)[None, None, :]
    for _ in range(h * w // 900):
        y, x, ang, n = r.integers(0, h), r.integers(0, w), r.uniform(0, math.pi), r.integers(6, 18)
        tone = 1.05 if r.random() < 0.7 else 0.93
        for t in range(n):
            img[int(y + math.sin(ang) * t) % h, int(x + math.cos(ang) * t) % w] *= tone
    return img


def soft(d):
    """a shape's cover of a pixel from its signed distance (pixels, inside negative): a pixel's width of edge, no stair steps"""
    return np.clip(0.5 - d, 0, 1)


rgb = np.zeros((N, N, 3), np.float32)
height = np.ones((N, N), np.float32)

# ---- the door's face (u across it, v up it): stiles and rails of keyaki, a low board at its foot, over it the kumiko lattice standing
# off washi paper (its warm white what lights the door), a round pull let into the outer stile (the left door's left; the right door's
# picture mirrored, its pull on its right)
DH, DW = N, N // 4
yy, xx = np.mgrid[0:DH, 0:DW].astype(np.float32)
xc, yc = xx + 0.5, yy + 0.5
ST = 33                                            # each stile's width, pixels
BOT, KOSHI_TOP, MID, TOPR = 46, 169, 205, 968      # up the door: the bottom rail's top, the low board's top, the mid rail's top, the top rail's foot
stile = (xc < ST) | (xc > DW - ST)
lat_area = ~stile & (yc > MID) & (yc < TOPR)
koshi = ~stile & (yc > BOT) & (yc < KOSHI_TOP)
rails = ~stile & ~lat_area & ~koshi
door = wood(DH, DW, FRAME, lines=7, seed=3, vertical=True)
door[rails] = wood(DH, DW, FRAME, lines=36, seed=4, vertical=False)[rails]
door[koshi] = wood(DH, DW, KOSHI, lines=22, seed=7, vertical=False)[koshi]
door[lat_area] = washi(DH, DW)[lat_area]
dh = np.ones((DH, DW), np.float32)
dh[koshi] = 0.85
dh[lat_area] = 0.0
# (the kumiko: square cells, three across and twelve up, a bar 7 px wide round each; a diagonal cross in every other cell, its bars thinner)
COLS, ROWS = 3, 12
cw, ch = (DW - 2 * ST) / COLS, (TOPR - MID) / ROWS
fx, fy = (xc - ST) % cw, (yc - MID) % ch
gx, gy = np.floor((xc - ST) / cw), np.floor((yc - MID) / ch)
bars = np.maximum(soft(np.minimum(fx, cw - fx) - 3.5), soft(np.minimum(fy, ch - fy) - 3.5))
sx, sy = fx / cw, fy / ch
diag = np.maximum(soft(np.abs(sx - sy) * cw / math.sqrt(2) - 2.2), soft(np.abs(sx + sy - 1) * cw / math.sqrt(2) - 2.2))
kc = np.where(lat_area, np.maximum(bars, np.where(((gx + gy) % 2) == 0, diag, 0)), 0)
door = door * (1 - kc[..., None]) + wood(DH, DW, KUMIKO, lines=50, seed=8, vertical=True) * kc[..., None]
dh = dh * (1 - kc) + 0.55 * kc
# (the pull (引手): a round bronze rim let into the outer stile half way up, its dish dark, the light along its rim's upper side)
pd = np.hypot(xc - ST / 2, yc - DH / 2)
rim, dish = soft(pd - 12), soft(pd - 8)
bronze = lin("#7a5a2e")[None, None, :] * (1 + 0.45 * np.cos(np.arctan2(yc - DH / 2, xc - ST / 2) - math.pi * 0.75))[..., None]
door = door * (1 - rim[..., None]) + bronze * rim[..., None]
door = door * (1 - dish[..., None]) + lin("#22170d")[None, None, :] * dish[..., None]
dh = dh * (1 - rim) + 0.8 * rim
dh = dh * (1 - dish) + 0.25 * dish
rgb[0:N, 0:N // 4] = door
height[0:N, 0:N // 4] = dh
# ---- the carcass (up it, and along it), the top, the inside, the box (black lacquer, a fine gold line round its lid's foot)
rgb[0:N, N // 4:N // 2] = wood(N, N // 4, KEYAKI, lines=9, seed=1, vertical=True)
rgb[0:N // 4, N // 2:N] = wood(N // 4, N // 2, TOP, lines=14, seed=2, vertical=False)
rgb[N // 4:N // 2, N // 2:N] = wood(N // 4, N // 2, KEYAKI, lines=10, seed=5, vertical=False)
rgb[N // 2:N, N // 2:3 * N // 4] = wood(N // 2, N // 4, INSIDE_T, lines=8, seed=6, vertical=True)
box_q = np.zeros((N // 2, N // 4, 3), np.float32) + lin("#141010") * 1.6
box_q[120:128, :] = lin("#c9a050")
rgb[N // 2:N, 3 * N // 4:N] = box_q


def normal_map(hf, strength=6.0):
    gy_, gx_ = np.gradient(hf)
    nx, ny, nz = -gx_ * strength, -gy_ * strength, np.ones_like(hf)
    L = np.sqrt(nx * nx + ny * ny + nz * nz)
    return np.stack([nx / L * 0.5 + 0.5, ny / L * 0.5 + 0.5, nz / L * 0.5 + 0.5], -1).astype(np.float32)


M = {
    "wood": pbr("KabutoStandWood", (1, 1, 1), tex=image("kabutostand_wood", rgb), nrm=image("kabutostand_nrm", normal_map(height), data=True),
                nrm_strength=0.8, rough=0.6),
}

# its parts' places in the picture, as (u0, v0, u1, v1)
DOORQ, CARCASS, TOPQ, CARCASS_H, INSIDE, BOXQ = (0, 0, 0.25, 1), (0.25, 0, 0.5, 1), (0.5, 0, 1, 0.25), (0.5, 0.25, 1, 0.5), (0.5, 0.5, 0.75, 1), (0.75, 0.5, 1, 1)
# (each place's edges kept a texel and a half in, so its neighbour's colour never bleeds onto a face)
EDGE = 1.5 / N
parts = []


def slab(bm, uvl, x0, x1, y0, y1, z0, z1, quad, front=None, flip_u=False):
    """a box; each face's picture its quarter (`quad`), the front face (+z) its own (`front`) if given, read the right way round from the
    front (or mirrored, `flip_u`)"""
    faces = {
        "+z": ((x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)),
        "-z": ((x1, y0, z0), (x0, y0, z0), (x0, y1, z0), (x1, y1, z0)),
        "+x": ((x1, y0, z1), (x1, y0, z0), (x1, y1, z0), (x1, y1, z1)),
        "-x": ((x0, y0, z0), (x0, y0, z1), (x0, y1, z1), (x0, y1, z0)),
        "+y": ((x0, y1, z1), (x1, y1, z1), (x1, y1, z0), (x0, y1, z0)),
        "-y": ((x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)),
    }
    for k, pts in faces.items():
        q = front if (k == "+z" and front) else quad
        f = bm.faces.new([bm.verts.new(P(*p)) for p in pts])
        u0, v0, u1, v1 = q[0] + EDGE, q[1] + EDGE, q[2] - EDGE, q[3] - EDGE
        # (the whole quarter on the front, read right; a strip of it on the rest, along its longer side)
        if k == "+z" and front:
            corners = ((0, 0), (1, 0), (1, 1), (0, 1))
            if flip_u:
                corners = ((1, 0), (0, 0), (0, 1), (1, 1))
        else:
            corners = ((0, 0), (1, 0), (1, 1), (0, 1))
        for lp, (a, b) in zip(f.loops, corners):
            lp[uvl].uv = (u0 + (u1 - u0) * a, v0 + (v1 - v0) * b)


def mesh(name, boxes):
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new()
    for b in boxes:
        slab(bm, uvl, *b)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(M["wood"])
    parts.append(o)
    return o


body = mesh("KabutoStandBody", [
    # (the plinth, set back a little at the front)
    (-W / 2 + 0.008, W / 2 - 0.008, 0.0, PL_H, -D / 2 + 0.006, FRONT - 0.014, CARCASS_H),
    # (the sides, the back, the floor)
    (-W / 2, -X_IN, PL_H, H - TOP_T + 0.002, -D / 2, FRONT, CARCASS),
    (X_IN, W / 2, PL_H, H - TOP_T + 0.002, -D / 2, FRONT, CARCASS),
    (-X_IN + 0.0005, X_IN - 0.0005, PL_H, H - TOP_T + 0.001, -D / 2, -D / 2 + BACK_T, CARCASS),
    (-X_IN + 0.0005, X_IN - 0.0005, PL_H, OPEN_Y[0] - 0.012, -D / 2 + BACK_T, FRONT - 0.002, INSIDE),
    # (the track under the doors and the rail over them)
    (-X_IN + 0.0005, X_IN - 0.0005, OPEN_Y[0] - 0.012, OPEN_Y[0], TRACK_Z["L"][0] - 0.004, FRONT - 0.002, CARCASS_H),
    (-X_IN + 0.0005, X_IN - 0.0005, OPEN_Y[1], H - TOP_T + 0.001, TRACK_Z["L"][0] - 0.004, FRONT - 0.002, CARCASS_H),
    # (the top: a paler board, overhanging a centimetre all round but the back)
    (-W / 2 - 0.01, W / 2 + 0.01, H - TOP_T, H, -D / 2, FRONT + 0.01, TOPQ),
    # (inside: a shelf half way up, and the helmet's box on the floor)
    (-X_IN + 0.001, X_IN - 0.001, 0.36, 0.375, -D / 2 + BACK_T + 0.001, TRACK_Z["L"][0] - 0.012, INSIDE),
    (-0.09, 0.09, OPEN_Y[0] - 0.011, 0.22, -0.075, 0.035, BOXQ),
])
door_y = (OPEN_Y[0] + 0.001, OPEN_Y[1] - 0.001)
doorL = mesh("KabutoStandDoorL", [(-X_IN, -X_IN + DOOR_W, door_y[0], door_y[1], TRACK_Z["L"][0], TRACK_Z["L"][1], CARCASS, DOORQ, False)])
doorR = mesh("KabutoStandDoorR", [(X_IN - DOOR_W, X_IN, door_y[0], door_y[1], TRACK_Z["R"][0], TRACK_Z["R"][1], CARCASS, DOORQ, True)])

root = bpy.data.objects.new("KabutoStand", None)
bpy.context.collection.objects.link(root)
for o in parts:
    o.parent = root
print("STAND_TRIS", sum(len(p.vertices) - 2 for o in parts for p in o.data.polygons))
if PREVIEW:
    target = P(0, 0.35, 0)
    cam = bpy.data.objects.new("PreviewCam", bpy.data.cameras.new("PreviewCam"))
    bpy.context.collection.objects.link(cam)
    cam.location = P(0.55, 0.75, 1.1)
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
export_dish(root, parts + [root], os.path.join(PROJECT, "public", "models", "kabutostand.glb"), os.path.join(PROJECT, "blender", "kabutostand.blend"), PREVIEW)
print("STAND_DONE")
