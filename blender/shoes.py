"""The customers' shoes (item 712, the owner's 「鞋子太過簡單，有點造型、多樣點」: they were one rounded block a shoe), shoes.glb, five kinds,
each one shoe (the game sets two side by side), in the game's units (the bar's): its toe toward +z, its sole's foot on y 0, its middle over
the origin; about 0.17 long, as the blocks were. Their parts' shades in their points' colour (COLOR_0, grey: the sole, the opening dark),
the game's tint over each (each customer's colour of that kind: game/guests/shoes):

  ShoeSneaker  a sneaker: a deep sole a shade lighter than its upper, a rounded toe, its collar open at the back
  ShoeLeather  a leather shoe (the salaryman's, the school's loafers): slim, a thin dark sole and a heel block, the toe drawn to a round point
  ShoePump     a pump: its heel up on a slim heel, the arch running down to the ball of the foot, the vamp low, the opening long
  ShoeBoot     an ankle boot: its shaft up over the ankle, a dark sole
  ShoeZori     a zori: a flat sole of the tint, its edge a shade darker, the thong's two straps from between the toes out to its sides

Low-poly: each a loft of six sections of eight round (the zori's of four), its ends closed in ladders (common.py's ladder_fill: no fans
into a point), 92 triangles (the pump 100); where the foot goes in, its sections open into a U (their top pressed down to the insole between the
collar's two sides), so the opening's a hollow seen from above, not a dark patch painted on a lump; the heel's section closed (its back);
the pump's heel a post of four sides; the zori's straps tubes of three sides.

Run:
    blender -b --factory-startup --python blender/shoes.py -- <project path> [preview.png]
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


def P(x, y, z):
    """the game's (three's) frame into Blender's: y up there, z up here"""
    return Vector((x, -z, y))


bpy.ops.wm.read_factory_settings(use_empty=True)
MAT = pbr("ShoeMat", (1, 1, 1), rough=0.6)
parts = []

# (the six sections' places along it, heel to toe)
ZS = [-0.085, -0.06, -0.03, 0.012, 0.058, 0.085]


def finish(name, bm):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = False
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(MAT)
    parts.append(o)
    return o


def paint(bm, col, of):
    """each face its own grey (`of(centre, normal)`, both in the game's frame): its corners all of it, the bands crisp"""
    for f in bm.faces:
        c = f.calc_center_median()
        n = f.normal
        g = of(Vector((c.x, c.z, -c.y)), Vector((n.x, n.z, -n.y)))
        for lp in f.loops:
            lp[col] = (g, g, g, 1.0)


def loft(bm, sections):
    """a shoe's body: each section (z, half width, top, sole's top, foot, open) eight points round it, the sole's foot flat, its sides up
    to the shoulder, a flat top strip; an open one a U: its sides up to the collar's edge (the top), its strip pressed down to the insole
    between them; joined section to section, its two ends (closed) in ladders"""
    rings = []
    for z, w, h, s, b, op in sections:
        sh = s + 0.5 * (h - s)
        if op:
            ins = s + 0.006
            pts = [(-w, b), (w, b), (w, s), (w * 0.94, h), (w * 0.62, ins), (-w * 0.62, ins), (-w * 0.94, h), (-w, s)]
        else:
            pts = [(-w, b), (w, b), (w, s), (w * 0.94, sh), (w * 0.5, h), (-w * 0.5, h), (-w * 0.94, sh), (-w, s)]
        rings.append([bm.verts.new(P(x, y, z)) for x, y in pts])
    for a, b2 in zip(rings, rings[1:]):
        n = len(a)
        for j in range(n):
            j2 = (j + 1) % n
            bm.faces.new((a[j], a[j2], b2[j2], b2[j]))
    ladder_fill(bm, rings[0])
    ladder_fill(bm, list(reversed(rings[-1])))
    return rings


def lerp_at(z, values):
    """a section's value at z, between the stations"""
    for i in range(len(ZS) - 1):
        if z <= ZS[i + 1] or i == len(ZS) - 2:
            t = max(0.0, min(1.0, (z - ZS[i]) / (ZS[i + 1] - ZS[i])))
            return values[i] + (values[i + 1] - values[i]) * t
    return values[-1]


def shoe(name, w, h, s, b, opens, sole=0.22, upper=1.0, inside=0.3):
    """a shoe of a kind: its sections' half widths, tops (an open one's, the collar's edge), soles' tops and feet (each seven, heel to toe);
    which are open (the foot's way in); the sole's, the upper's and the inside's greys"""
    bm = bmesh.new()
    col = bm.loops.layers.float_color.new("Col")
    loft(bm, list(zip(ZS, w, h, s, b, opens)))
    last_open = max(z for z, o in zip(ZS, opens) if o)

    def of(c, n):
        st = lerp_at(c.z, s)
        if c.y < st + 0.0015 or n.y < -0.5:
            return sole
        # (in the hollow: its insole and its inner walls, as far as the collar's edge round it)
        if c.z < last_open + 0.004 and abs(c.x) < lerp_at(c.z, w) * 0.8 and c.y < lerp_at(c.z, h) - 0.004:
            return inside
        return upper
    paint(bm, col, of)
    return bm, col


# ---- the sneaker: a deep sole, lighter than the upper; the collar open over the heel and back half
O = [False, True, True, False, False, False]
bm, col = shoe("ShoeSneaker", w=[0.026, 0.031, 0.032, 0.034, 0.029, 0.016], h=[0.05, 0.054, 0.05, 0.038, 0.029, 0.02],
               s=[0.014] * 6, b=[0.0] * 6, opens=O, sole=1.0, upper=0.78, inside=0.35)
finish("ShoeSneaker", bm)
# ---- the leather shoe: slim, a thin sole, a heel block (its sole deeper over the heel), the toe drawn to a round point
bm, col = shoe("ShoeLeather", w=[0.024, 0.029, 0.03, 0.031, 0.025, 0.009], h=[0.046, 0.048, 0.045, 0.032, 0.023, 0.013],
               s=[0.017, 0.017, 0.007, 0.007, 0.007, 0.006], b=[0.0] * 6, opens=O, sole=0.2, upper=1.0, inside=0.3)
finish("ShoeLeather", bm)
# ---- the pump: its heel lifted on a slim heel, down to the ball of the foot, the vamp low and the opening long
pb = [0.05, 0.046, 0.034, 0.01, 0.0, 0.0]
bm, col = shoe("ShoePump", w=[0.019, 0.023, 0.025, 0.029, 0.024, 0.009], h=[b + d for b, d in zip(pb, [0.03, 0.026, 0.02, 0.018, 0.02, 0.011])],
               s=[b + 0.005 for b in pb], b=pb, opens=[False, True, True, True, False, False], sole=0.25, upper=1.0, inside=0.4)
# (its heel: a post of four sides from the ground up under the heel's back, narrowing to its tip)
hz0, hz1 = -0.083, -0.066
ring_lo = [bm.verts.new(P(x, 0.0, z)) for x, z in [(-0.005, hz0 + 0.002), (0.005, hz0 + 0.002), (0.005, hz1 - 0.003), (-0.005, hz1 - 0.003)]]
ring_hi = [bm.verts.new(P(x, 0.047, z)) for x, z in [(-0.008, hz0), (0.008, hz0), (0.008, hz1), (-0.008, hz1)]]
for j in range(4):
    j2 = (j + 1) % 4
    bm.faces.new((ring_lo[j], ring_lo[j2], ring_hi[j2], ring_hi[j]))
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
for f in bm.faces[-4:]:
    for lp in f.loops:
        lp[col] = (0.25, 0.25, 0.25, 1.0)
finish("ShoePump", bm)
# ---- the ankle boot: its shaft over the ankle, its opening just its top
bm, col = shoe("ShoeBoot", w=[0.026, 0.03, 0.031, 0.032, 0.027, 0.012], h=[0.11, 0.112, 0.1, 0.04, 0.028, 0.016],
               s=[0.014, 0.014, 0.012, 0.009, 0.009, 0.008], b=[0.0] * 6, opens=O, sole=0.22, upper=1.0, inside=0.42)
finish("ShoeBoot", bm)

# ---- the zori: a flat sole (sections of four), its edge darker, the thong's two straps
bm = bmesh.new()
col = bm.loops.layers.float_color.new("Col")
ZW = [0.024, 0.03, 0.033, 0.034, 0.029, 0.019]
ZT = 0.012
rings = []
for z, w in zip(ZS, ZW):
    rings.append([bm.verts.new(P(x, y, z)) for x, y in [(-w, 0.0), (w, 0.0), (w, ZT), (-w, ZT)]])
for a, b2 in zip(rings, rings[1:]):
    for j in range(4):
        j2 = (j + 1) % 4
        bm.faces.new((a[j], a[j2], b2[j2], b2[j]))
ladder_fill(bm, rings[0])
ladder_fill(bm, list(reversed(rings[-1])))
sole_faces = list(bm.faces)


def strap(a, mid, b2, r=0.0035):
    """a strap: a tube of three sides through three points (a, its rise, b), its ends open (in the sole and at the post)"""
    path = [a, mid, b2]
    rings_ = []
    for i, p in enumerate(path):
        d = (path[min(i + 1, 2)] - path[max(i - 1, 0)]).normalized()
        u = d.cross(Vector((0, 1, 0)))
        if u.length < 1e-4:
            u = Vector((1, 0, 0))
        u.normalize()
        v = u.cross(d).normalized()
        rings_.append([bm.verts.new(P(*(p + (u * math.cos(t) + v * math.sin(t)) * r))) for t in (0.0, 2.094, 4.189)])
    for ra, rb in zip(rings_, rings_[1:]):
        for j in range(3):
            j2 = (j + 1) % 3
            bm.faces.new((ra[j], ra[j2], rb[j2], rb[j]))


post = Vector((0.0, ZT + 0.004, 0.05))
for sd in (-1, 1):
    strap(post, Vector((sd * 0.018, ZT + 0.026, 0.02)), Vector((sd * 0.029, ZT + 0.002, -0.022)))
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
for f in bm.faces:
    c = f.calc_center_median()
    gc = Vector((c.x, c.z, -c.y))
    n = Vector((f.normal.x, f.normal.z, -f.normal.y))
    g = (1.0 if n.y > 0.6 else 0.7) if f in sole_faces else 0.22
    for lp in f.loops:
        lp[col] = (g, g, g, 1.0)
finish("ShoeZori", bm)

root = bpy.data.objects.new("Shoes", None)
bpy.context.collection.objects.link(root)
for i, o in enumerate(parts):
    o.parent = root
    print("TRIS", o.name, sum(len(p.vertices) - 2 for p in o.data.polygons))
if PREVIEW:
    for i, o in enumerate(parts):
        o.location.x += (i - 2) * 0.12
    cam = bpy.data.objects.new("PreviewCam", bpy.data.cameras.new("PreviewCam"))
    bpy.context.collection.objects.link(cam)
    cam.location = Vector(P(0.05, 0.42, 0.42))
    cam.rotation_euler = (Vector(P(0.0, 0.02, 0.0)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = cam
    sun = bpy.data.objects.new("PreviewSun", bpy.data.lights.new("PreviewSun", "SUN"))
    sun.data.energy = 3.5
    sun.rotation_euler = (0.7, 0.2, 0.6)
    bpy.context.collection.objects.link(sun)
    world = bpy.data.worlds.new("PreviewWorld")
    world.color = (0.35, 0.37, 0.4)
    bpy.context.scene.world = world
export_dish(root, parts + [root], os.path.join(PROJECT, "public", "models", "shoes.glb"), os.path.join(PROJECT, "blender", "shoes.blend"), PREVIEW)
if PREVIEW:
    for i, o in enumerate(parts):
        o.location.x -= (i - 2) * 0.12
print("SHOES_DONE")
