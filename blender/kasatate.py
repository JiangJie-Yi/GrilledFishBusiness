"""The rain's things (item 623, the owner's 「進來的客人會穿雨衣或帶雨傘」), kasatate.glb, in the game's units (the bar's): three pieces the game
puts together, each its own node, its colours in its points (COLOR_0) so one material can tint the lot:

  KasaStand   the umbrella stand (傘立て) in the genkan by the shoe cupboard: an eight-sided Shigaraki jar (八角, item 720, the owner's
              「傘架面數過高，造型太簡單，不需要黑線」: it was a round jar of 16, 174 triangles, inked), its flat faces swelling to its belly,
              narrowing to its neck, its thick lip turned out; glazed namako blue (海鼠釉), running pale over the shoulder and down some of its
              faces further than others, the glaze thinning out toward its foot to the bare clay, its inside dark. Its foot at y 0, its
              middle over the origin, a face (not an edge) toward +z. Five umbrellas stand in it (the game's), tips down on its floor
              (KASA_FLOOR) leaning out a little.
  KasaCanopy  an umbrella's canopy, open: eight panels between eight ribs hung from its tip (the origin) down and out, a dome (each rib
              three straight runs, steeper toward the rim), the rim scalloped between the ribs; white (the game's colour tints it), the ribs
              a shade darker so the panels read. Furled, the game scales it about its tip: across by FURL_ACROSS, down by FURL_DOWN.
  KasaRod     the rest of the umbrella: the steel shaft from the grip (the origin, the middle of the handle's straight) up to the canopy's tip
              (ROD_TIP: the canopy hangs there), the ferrule (石突) over it, and the wooden crook handle (a J) under the grip, its hook toward +z.
  KasaBundle  a raincoat folded up small to carry (a customer's, taken off in the genkan): a soft rounded block, white (the game tints it),
              its middle at the origin, a crease across its top.

Low-poly: the jar 8 round, its faces flat (86 triangles), the canopy 16 round (rib and mid-panel), the shaft and handle 6 round; no fans
into a point (ends in ladders).

Run:
    blender -b --factory-startup --python blender/kasatate.py -- <project path> [preview.png]
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
seed(62)


def P(x, y, z):
    """the game's (three's) frame into Blender's: y up there, z up here"""
    return Vector((x, -z, y))


def lin(hexs):
    c = [int(hexs[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def mix(a, b, t):
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


bpy.ops.wm.read_factory_settings(use_empty=True)

M = {
    "glaze": pbr("KasaGlaze", (1, 1, 1), rough=0.3),
    "cloth": pbr("KasaCloth", (1, 1, 1), rough=0.6),
    "rod": pbr("KasaRodMat", (1, 1, 1), rough=0.45),
    "coat": pbr("KasaCoat", (1, 1, 1), rough=0.5),
}
parts = []


def finish(name, bm, mat, smooth_=True):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
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


def paint(bm, col, of):
    """every corner of every face its point's colour (`of(v)`: the point, in the game's frame, to a linear colour)"""
    for f in bm.faces:
        for lp in f.loops:
            c = of(Vector((lp.vert.co.x, lp.vert.co.z, -lp.vert.co.y)))
            lp[col] = (*c, 1.0)


# ---------------------------------------------------------------- the stand
SEG = 8
# (its profile up the outside, over the lip and down the inside to its floor: (radius, height); the floor's ring closed in a ladder)
# (six rings (item 720): the foot, its belly low (the bare clay only its foot's 5 cm), the neck, the lip's outside and its inner edge (its top turned in a little, 5 mm of wall at the
# neck), and the floor inside: 5 bands of 8 and the floor, 86 triangles; the inside as wide as the round jar's was, the umbrellas in it as
# they stood)
STAND_OUT = [(0.062, 0.0), (0.074, 0.05), (0.068, 0.212), (0.077, 0.242), (0.064, 0.25)]
STAND_IN = [(0.058, 0.03)]
KASA_FLOOR = 0.03
GLAZE = lin("#2c4566")       # (namako's deep blue)
RUN = lin("#8fb0c4")         # (its pale run over the shoulder)
CLAY = lin("#a07c5c")        # (the foot, bare)
INSIDE = lin("#1b2430")


def stand():
    bm = bmesh.new()
    col = bm.loops.layers.float_color.new("Col")
    prof = STAND_OUT + STAND_IN
    # (half a face round, so a face looks out at +z, not an edge)
    rings = [[bm.verts.new(P(r * math.sin(2 * math.pi * (j + 0.5) / SEG), y, r * math.cos(2 * math.pi * (j + 0.5) / SEG))) for j in range(SEG)] for (r, y) in prof]
    for i in range(len(rings) - 1):
        a, b = rings[i], rings[i + 1]
        for j in range(SEG):
            j2 = (j + 1) % SEG
            bm.faces.new((a[j], b[j], b[j2], a[j2]))
    ladder_fill(bm, rings[-1])          # (its floor inside; its foot sits on the stone, never seen)
    # (the glaze's runs: over the shoulder pale, a tongue of it down each of five places round, longer and shorter)
    tongues = [(0.3, 0.16), (1.5, 0.1), (2.6, 0.19), (3.9, 0.12), (5.1, 0.17)]

    def of(p):
        r, y = math.hypot(p.x, p.z), p.y
        inside = r < 0.0655 and 0.02 < y < 0.2515
        if inside:
            # (the inside darker toward its floor)
            return mix(INSIDE, GLAZE, min(1.0, max(0.0, (y - 0.03) / 0.22)) * 0.5)
        # (the foot bare clay, the glaze thinning out to it up the lower body)
        if y < 0.004:
            return CLAY
        a = math.atan2(p.x, p.z) % (2 * math.pi)
        reach = 0.0
        for at, ln in tongues:
            d = abs((a - at + math.pi) % (2 * math.pi) - math.pi)
            reach = max(reach, ln * max(0.0, 1 - d / 0.45))
        run = 1.0 if y > 0.2 else max(0.0, 1 - (0.2 - y) / max(0.01, reach))
        base = mix(GLAZE, RUN, 0.85 * run)
        return base
    paint(bm, col, of)
    # (its faces flat: an eight-sided jar, not a round one shaded smooth)
    return finish("KasaStand", bm, "glaze", smooth_=False)


# ---------------------------------------------------------------- the canopy
# (each rib from the tip: a short first run to the ring round the tip's hole, then three equal runs, each steeper toward the rim)
RIB_RUNS = [(0.015, 80), (0.113, 76), (0.113, 66), (0.113, 56)]
RIBS = 8


def canopy():
    bm = bmesh.new()
    col = bm.loops.layers.float_color.new("Col")
    pts, r, y = [], 0.0, 0.0
    for ln, ang in RIB_RUNS:
        r += ln * math.sin(math.radians(ang))
        y -= ln * math.cos(math.radians(ang))
        pts.append((r, y))
    n = RIBS * 2
    rings = []
    for i, (r, y) in enumerate(pts):
        ring = []
        for j in range(n):
            a = 2 * math.pi * j / n
            mid = j % 2 == 1
            # (between two ribs the cloth's drawn straight across: its point the chord's middle; at the rim a little higher, the scallop)
            rr = r * (math.cos(math.pi / n) if mid else 1.0)
            yy = y + (0.008 if mid and i == len(pts) - 1 else 0.0)
            ring.append(bm.verts.new(P(rr * math.sin(a), yy, rr * math.cos(a))))
        rings.append(ring)
    for i in range(len(rings) - 1):
        a, b = rings[i], rings[i + 1]
        for j in range(n):
            j2 = (j + 1) % n
            bm.faces.new((a[j], b[j], b[j2], a[j2]))
    # (the ribs a shade darker than the panels' middles)
    paint(bm, col, lambda p: (0.82, 0.82, 0.84) if abs(round(math.atan2(p.x, p.z) / (math.pi / RIBS)) % 2) == 0 else (1.0, 1.0, 1.0))
    print("CANOPY_OPEN radius %.4f drop %.4f" % (pts[-1][0], -pts[-1][1]))
    return finish("KasaCanopy", bm, "cloth")


# ---------------------------------------------------------------- the rod: shaft, ferrule, crook
ROD_TIP = 0.43
STEEL = lin("#9aa1aa")
TIPC = lin("#c9cdd3")
WOOD = lin("#6e4527")


def tube(bm, col, path, radius, colour, sides=6, cap_end=False):
    """a tube of `sides` along the points `path` (each a Vector in the game's frame), its rings square to the way it runs; its far end
    closed in a ladder if asked"""
    rings = []
    for i, p in enumerate(path):
        d = (path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]).normalized()
        side = Vector((1, 0, 0)) if abs(d.x) < 0.9 else Vector((0, 0, 1))
        u = d.cross(side).normalized()
        v = d.cross(u).normalized()
        ring = []
        for j in range(sides):
            a = 2 * math.pi * j / sides
            q = p + (u * math.cos(a) + v * math.sin(a)) * radius
            ring.append(bm.verts.new(P(q.x, q.y, q.z)))
        rings.append(ring)
    made = []
    for i in range(len(rings) - 1):
        a, b = rings[i], rings[i + 1]
        for j in range(sides):
            j2 = (j + 1) % sides
            made.append(bm.faces.new((a[j], b[j], b[j2], a[j2])))
    if cap_end:
        made += ladder_fill(bm, rings[-1])
    for f in made:
        for lp in f.loops:
            lp[col] = (*colour, 1.0)
    return rings


def rod():
    bm = bmesh.new()
    col = bm.loops.layers.float_color.new("Col")
    # (the shaft: from inside the handle up into the ferrule)
    tube(bm, col, [Vector((0, 0.015, 0)), Vector((0, ROD_TIP + 0.01, 0))], 0.0045, STEEL)
    # (the ferrule over the canopy's tip: a little steel cap, its top closed)
    tube(bm, col, [Vector((0, ROD_TIP - 0.004, 0)), Vector((0, ROD_TIP + 0.025, 0))], 0.0062, TIPC, cap_end=True)
    # (the crook: the handle's straight from a little over the grip down, then round a half-circle toward +z, its end up, closed)
    HR, HOOK = 0.0085, 0.024
    path = [Vector((0, 0.028, 0)), Vector((0, -0.022, 0))]
    for k in range(1, 6):
        ph = math.pi * k / 5
        path.append(Vector((0, -0.022 - HOOK * math.sin(ph), HOOK - HOOK * math.cos(ph))))
    rings = tube(bm, col, path, HR, WOOD, cap_end=True)
    # (the handle's top end, where the shaft goes in: closed too)
    top = ladder_fill(bm, list(reversed(rings[0])))
    for f in top:
        for lp in f.loops:
            lp[col] = (*WOOD, 1.0)
    return finish("KasaRod", bm, "rod")


# ---------------------------------------------------------------- the raincoat folded up
def bundle():
    bm = bmesh.new()
    col = bm.loops.layers.float_color.new("Col")
    W, H, D, R = 0.12, 0.045, 0.09, 0.014
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * W, v.co.y * D, v.co.z * H))
    bmesh.ops.bevel(bm, geom=list(bm.edges), offset=R, segments=1, affect="EDGES")
    # (a crease across its top, where it's folded over: the top's middle points pressed down a little)
    for v in bm.verts:
        if v.co.z > H / 2 - 0.001 and abs(v.co.x) < W / 2 - R - 0.001:
            v.co.z -= 0.004 * (1 - abs(v.co.x) / (W / 2))
    paint(bm, col, lambda p: (1.0, 1.0, 1.0) if p.y > -0.01 else (0.8, 0.8, 0.82))
    return finish("KasaBundle", bm, "coat", smooth_=False)


stand()
canopy()
rod()
bundle()
roots = []
for o in parts:
    print("TRIS", o.name, sum(len(p.vertices) - 2 for p in o.data.polygons))
# (each its own node at the origin: the game puts them where they go)
root = bpy.data.objects.new("Kasa", None)
bpy.context.collection.objects.link(root)
for o in parts:
    o.parent = root
export_dish(root, parts + [root], os.path.join(PROJECT, "public", "models", "kasatate.glb"), os.path.join(PROJECT, "blender", "kasatate.blend"), None)
print("KASA_DONE")
if PREVIEW:
    # (a picture only, after the export: the canopy over the rod, a copy of it furled beside it (scaled as the game furls it), the stand
    # and the bundle, spread out)
    parts[1].location = P(-0.35, 0.25 + ROD_TIP, 0.0)
    parts[2].location = P(-0.35, 0.25, 0.0)
    c2 = parts[1].copy()
    bpy.context.collection.objects.link(c2)
    c2.location = P(-0.6, 0.25 + ROD_TIP, 0.0)
    c2.scale = (0.0622, 0.0622, 2.516)
    r2 = parts[2].copy()
    bpy.context.collection.objects.link(r2)
    r2.location = P(-0.6, 0.25, 0.0)
    parts[3].location = P(0.25, 0.0225, 0.0)
    target = P(-0.2, 0.3, 0)
    cam = bpy.data.objects.new("PreviewCam", bpy.data.cameras.new("PreviewCam"))
    bpy.context.collection.objects.link(cam)
    cam.location = P(0.2, 0.8, 1.6)
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = cam
    lt = bpy.data.objects.new("Key", bpy.data.lights.new("Key", "SUN"))
    lt.data.energy = 4
    bpy.context.collection.objects.link(lt)
    lt.rotation_euler = (0.6, 0.2, 0.5)
    world = bpy.data.worlds.new("PreviewWorld")
    world.color = (0.45, 0.43, 0.4)
    bpy.context.scene.world = world
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items] else "BLENDER_EEVEE"
    sc.render.resolution_x, sc.render.resolution_y = 1100, 800
    sc.render.filepath = PREVIEW
    bpy.ops.render.render(write_still=True)
