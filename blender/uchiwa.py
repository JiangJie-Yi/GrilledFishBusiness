"""The cook's fan (團扇, uchiwa.glb; item 511, the owner's, 2026-11-21: 「扇子模型要改版一下，不要有聞字，圖花可以有很多雲海或是魚的標誌」):
it was put together in the game out of a disc, two rings and a stick (a disc of forty triangles all from its middle, a ring of nearly six
hundred for its edge), round as a plate. Now a fan of its own make: an uchiwa's outline (wider than it's tall, its top a full curve, its foot
flatter, gathering to the handle), washi on both its faces (their pictures painted in the game, Decor's FAN_PAPER and FAN_BACK: no more 聞, a
sea of clouds and fish), a dark binding round its edge (its line), a bamboo handle with a node.

Nodes (each its own, for the game to dress):
- "FanFace": the paper's front (its normal +y), its UVs the outline's square laid flat (u across, v from its top to its foot).
- "FanBack": the paper's back (its normal -y), its picture the right way round seen from there.
- "FanRim": the binding round its edge: a narrow band on both faces and over the edge.
- "FanHandle": the bamboo handle out of its foot, eight-sided, tapering, a node part way down.

The frame: metres; the fan lying flat in x, z (y its thickness), its top toward -z, its handle out along +z (as the game's old one: Decor's
Fan); its middle at the origin. Low-poly (docs/MODELING.md): the outline 24 points, its faces laddered (no fan from its middle).

Run:
    blender -b --factory-startup --python blender/uchiwa.py -- <project path> [preview.png]
"""
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *  # noqa: E402,F403

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
PROJECT = argv[0] if argv else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PREVIEW = argv[1] if len(argv) > 1 else None
bpy.ops.wm.read_factory_settings(use_empty=True)


def P(x, y, z):
    """the game's frame (y up, z toward the handle) to Blender's (z up)"""
    return Vector((x, -z, y))


def lin(hexs):
    c = [int(hexs[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


M = {
    "paper": pbr("FanPaper", (1, 1, 1), rough=0.9),
    "back": pbr("FanPaperBack", (1, 1, 1), rough=0.9),
    "rim": pbr("FanBinding", lin("#4a2f20"), rough=0.7),
    "bamboo": pbr("FanBamboo", lin("#b08a55"), rough=0.6),
    "node": pbr("FanBambooNode", lin("#8a6a3e"), rough=0.6),
}
HW, TOP, FOOT = 0.15, 0.14, 0.122       # half its width; how far its top and its foot are from its middle
T = 0.0006                              # half the paper's thickness
RIM, RIM_T = 0.007, 0.0012              # the binding's width in from the edge, and how proud it stands of the paper
N = 24


def outline():
    """the uchiwa's edge, 24 points round from its right, over its top, to its foot: its top a full half-ellipse, its foot flatter (a
    superellipse's lower half), its two shoulders where they meet a little drawn in"""
    pts = []
    for k in range(N):
        a = 2 * math.pi * k / N
        c, s = math.cos(a), math.sin(a)
        x = HW * c
        if s >= 0:
            z = -TOP * s
        else:
            z = FOOT * (abs(s) ** 0.55)
            x *= 0.96 + 0.04 * (1 - abs(s))
        pts.append((x, z))
    return pts


def inset(pts, d):
    """each point moved in toward the middle by d (along its own direction from the middle: the outline's near convex)"""
    out = []
    for x, z in pts:
        r = math.hypot(x, z)
        out.append((x * (r - d) / r, z * (r - d) / r))
    return out


def uv_of(x, z):
    return ((x + HW) / (2 * HW), 1 - (z + TOP) / (TOP + FOOT))


def face(name, y, up, mat):
    """the paper's face: the outline laddered, at height y, facing up (+y) or down; its UVs the outline's square (seen from below, mirrored
    across, so its picture reads the right way round from that side)"""
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new("UVMap")
    ring = [bm.verts.new(P(x, y, z)) for x, z in outline()]
    faces = ladder_fill(bm, ring)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        f.normal_update()
        if (f.normal.z > 0) != up:
            f.normal_flip()
        for lp in f.loops:
            x, z = lp.vert.co.x, -lp.vert.co.y
            u, v = uv_of(x, z)
            lp[uvl].uv = (u if up else 1 - u, v)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(M[mat])
    for p in o.data.polygons:
        p.use_smooth = False
    return o, len(faces)


front, nf = face("FanFace", T, True, "paper")
back, nb = face("FanBack", -T, False, "back")

# ---- the binding: a band round the edge on each face, a hair proud of the paper, and over the edge between them
bm = bmesh.new()
out_, in_ = outline(), inset(outline(), RIM)
rows = []
for y in (T + RIM_T, -T - RIM_T):
    rows.append(([bm.verts.new(P(x, y, z)) for x, z in out_], [bm.verts.new(P(x, y, z)) for x, z in in_]))
for (o_, i_), up in zip(rows, (True, False)):
    for k in range(N):
        j = (k + 1) % N
        f = bm.faces.new((o_[k], o_[j], i_[j], i_[k]))
        f.normal_update()
        if (f.normal.z > 0) != up:
            f.normal_flip()
(o_top, _), (o_bot, _) = rows
for k in range(N):
    j = (k + 1) % N
    f = bm.faces.new((o_top[k], o_bot[k], o_bot[j], o_top[j]))
    f.normal_update()
    mid = (o_top[k].co + o_top[j].co) / 2
    if f.normal.dot(Vector((mid.x, mid.y, 0))) < 0:
        f.normal_flip()
rim = bpy.data.meshes.new("FanRim")
bm.to_mesh(rim)
bm.free()
RIM_O = bpy.data.objects.new("FanRim", rim)
bpy.context.collection.objects.link(RIM_O)
RIM_O.data.materials.append(M["rim"])

# ---- the handle: eight-sided, from its foot's edge out along +z, tapering a little, a node part way down (a ring a hair proud)
bm = bmesh.new()
z0 = FOOT - 0.004
prof = [(z0, 0.0105), (z0 + 0.075, 0.0115), (z0 + 0.079, 0.0128), (z0 + 0.085, 0.0118), (z0 + 0.178, 0.0128), (z0 + 0.182, 0.0118)]
rings = [[bm.verts.new(P(r * math.cos(2 * math.pi * i / 8 + math.pi / 8), r * math.sin(2 * math.pi * i / 8 + math.pi / 8), z)) for i in range(8)] for z, r in prof]
for a in range(len(rings) - 1):
    for i in range(8):
        f = bm.faces.new((rings[a][i], rings[a][(i + 1) % 8], rings[a + 1][(i + 1) % 8], rings[a + 1][i]))
        f.material_index = 1 if a in (1, 2) else 0
for f in ladder_fill(bm, rings[0][::-1]) + ladder_fill(bm, rings[-1]):
    f.material_index = 0
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
hm = bpy.data.meshes.new("FanHandle")
bm.to_mesh(hm)
bm.free()
HANDLE = bpy.data.objects.new("FanHandle", hm)
bpy.context.collection.objects.link(HANDLE)
HANDLE.data.materials.append(M["bamboo"])
HANDLE.data.materials.append(M["node"])

root = bpy.data.objects.new("UchiwaRoot", None)
bpy.context.collection.objects.link(root)
parts = [front, back, RIM_O, HANDLE]
for o in parts:
    o.parent = root
    print(o.name, sum(len(p.vertices) - 2 for p in o.data.polygons))
if PREVIEW:
    # (a camera and a sun for the preview only: not selected, so not exported)
    cam = bpy.data.objects.new("PreviewCam", bpy.data.cameras.new("PreviewCam"))
    bpy.context.collection.objects.link(cam)
    cam.location = Vector((0.36, -0.62, 0.5))
    cam.rotation_euler = (Vector((0, -0.04, 0)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = cam
    sun = bpy.data.objects.new("PreviewSun", bpy.data.lights.new("PreviewSun", "SUN"))
    bpy.context.collection.objects.link(sun)
    sun.rotation_euler = (0.7, 0.25, 0.5)
    sun.data.energy = 3.5
export_dish(root, parts + [root], os.path.join(PROJECT, "public", "models", "uchiwa.glb"), os.path.join(PROJECT, "blender", "uchiwa.blend"), PREVIEW)
print("UCHIWA_DONE")
