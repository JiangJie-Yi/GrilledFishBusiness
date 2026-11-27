"""The beckoning cats' stand by the way in (招き猫の台): catstand.glb, node "CatStand", three steps of dark wood, each with a red felt
(緋毛氈) laid over its top and down its front, the next step standing on the felt. In metres, z up; the stand's back (against the wall) at
x 0.10, its front toward -x, its middle along the wall at y 0 (the game's frame: x out from the wall, y up, z along it; z here is the game's
y, -y the game's z).

The owner's (2026-11-27, item 736: 「招財貓台的模型有點怪」, with a wireframe of it): it was three rounded boxes in code, one unit box with
a 12 % round scaled to each step, so the rounds were stretched (5 by 4 by 10 cm on the lower step) and their light ran in bands down the
faces, the long faces two thin triangles each; the felt a flat sheet the steps' full size, its corners standing out past the rounded tops.
Now each step a plain box with its edges chamfered a little, all alike (6 mm, two steps, its normals hardened: flat faces shade flat), the
steps stacked as a stepped stand's are (each on the felt of the one under it, 2 mm into it); each felt one closed sheet, 12 mm thick, over
its step's whole top and rounded over its front edge, hanging 7.5 cm down the front, 4 mm past each end, its faces against the step 2 mm
inside it (no two faces in one plane), its edges eased. The steps' sizes, heights and places as they were (the cats, the koban and the
waving cat stand where they stood: genkan.tsx's DOOR_CATS, CAT_TOP, FELT_TOP).

Run:
    blender -b --factory-startup --python blender/catstand.py -- <project path> [preview.png]
"""
import math
import os
import sys

import bmesh
import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *  # noqa: E402,F403

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
PROJECT = argv[0] if argv else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PREVIEW = argv[1] if len(argv) > 1 else None
bpy.ops.wm.read_factory_settings(use_empty=True)

# (the steps: x from its front to its back, its half length along the wall, its foot and its top; their woods a shade apart, as they were)
BACK = 0.10
STEPS = [
    (-0.34, 0.42, 0.0, 0.32, "#5a3a24"),
    (-0.14, 0.35, None, 0.60, "#4a2e1c"),
    (-0.10, 0.13, None, 0.74, "#3e2616"),
]
FELT_T, FELT_DROP, FELT_OVER = 0.012, 0.075, 0.004
# (the felt's round over the front edge, outside and in, and the steps' chamfer)
R_OUT, R_IN, CHAMFER = 0.016, 0.004, 0.006


def colour(hexstr):
    h = hexstr.lstrip("#")
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def plain(name, hexstr, rough=0.75):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    c = colour(hexstr)
    # (the colour's sRGB, as the game reads a material's colour)
    lin = tuple(((v + 0.055) / 1.055) ** 2.4 if v > 0.04045 else v / 12.92 for v in c)
    bsdf.inputs["Base Color"].default_value = (*lin, 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    m.diffuse_color = (*lin, 1.0)
    return m


def felt(name, x_front, half, top, mat):
    """one felt: its section (x, z) as pairs (outside, inside) from its back edge over the front's round to its hem, swept along y"""
    xb = BACK + FELT_OVER
    zt, zi = top + FELT_T, top - 0.002
    xf, xi = x_front - FELT_T, x_front + 0.002
    zb = top - FELT_DROP
    co, ci = (xf + R_OUT, zt - R_OUT), (xi + R_IN, zi - R_IN)
    pairs = [((xb, zt), (xb, zi))]
    for k in range(4):
        a = math.pi / 2 + (math.pi / 2) * k / 3
        pairs.append(((co[0] + R_OUT * math.cos(a), co[1] + R_OUT * math.sin(a)), (ci[0] + R_IN * math.cos(a), ci[1] + R_IN * math.sin(a))))
    pairs.append(((xf, zb), (xi, zb)))
    y0, y1 = -(half + FELT_OVER), half + FELT_OVER
    bm = bmesh.new()
    rings = []
    for y in (y0, y1):
        rings.append([(bm.verts.new((o[0], y, o[1])), bm.verts.new((i[0], y, i[1]))) for o, i in pairs])
    a, b = rings
    n = len(pairs)
    for k in range(n - 1):
        # (outside, inside, and the two ends: a quad each)
        bm.faces.new((a[k][0], a[k + 1][0], b[k + 1][0], b[k][0]))
        bm.faces.new((a[k][1], b[k][1], b[k + 1][1], a[k + 1][1]))
        bm.faces.new((a[k][0], a[k][1], a[k + 1][1], a[k + 1][0]))
        bm.faces.new((b[k][0], b[k + 1][0], b[k + 1][1], b[k][1]))
    # (its back edge and its hem)
    bm.faces.new((a[0][0], b[0][0], b[0][1], a[0][1]))
    bm.faces.new((a[n - 1][0], a[n - 1][1], b[n - 1][1], b[n - 1][0]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(mat)
    for pg in me.polygons:
        pg.use_smooth = False
    # (its edges eased a little: a cut cloth's, not a board's)
    mod = o.modifiers.new("Bevel", "BEVEL")
    mod.width = 0.002
    mod.segments = 1
    mod.limit_method = "ANGLE"
    mod.harden_normals = True
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.shade_smooth()
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return o


root = bpy.data.objects.new("CatStand", None)
bpy.context.collection.objects.link(root)
red = plain("CatStandFelt", "#b3241b", 0.95)
parts = []
foot = 0.0
for i, (x_front, half, z0, top, wood) in enumerate(STEPS):
    m = plain(f"CatStandWood{i + 1}", wood, 0.6)
    z_from = 0.0 if z0 is not None else foot
    step = chunky_box(f"CatStep{i + 1}", x_front, BACK, -half, half, z_from, top, CHAMFER, 2, m, m, bottom=False, uv_scale=0.2)
    f = felt(f"CatFelt{i + 1}", x_front, half, top, red)
    for o in (step, f):
        o.parent = root
        parts.append(o)
    # (the next step stands on this one's felt, 2 mm into it)
    foot = top + FELT_T - 0.002

tris = 0
for o in parts:
    o.data.calc_loop_triangles()
    tris += len(o.data.loop_triangles)
    print(f"PART {o.name}: {len(o.data.loop_triangles)} tris")
print("TOTAL_TRIS", tris)
out = os.path.join(PROJECT, "public", "models", "catstand.glb")
export_dish(root, parts, out, os.path.join(PROJECT, "blender", "catstand.blend"), preview=PREVIEW)
print("WROTE", out)
