"""The shop's two upright drink fridges (drinkfridge.glb), made here in place of the downloaded one (the owner's: it was the heaviest thing in
the room, its parts and its outlines some 8,500 triangles and nine draws a fridge, and someone else's model): a commercial one-door cooler in
plain boxes and planes, about 400 triangles.

- "FridgeBody": the black cabinet (sides, back, top, plinth with its louvre slats), its white liner inside, the stainless strip under the door,
  the dark gasket round the opening (FridgeShell, FridgeLiner, FridgeLouver, FridgeMetal, FridgeGasket).
- "FridgeSign": the light box over the door, one quad (its picture, the washi sign, painted by the game: FridgeSign).
- "FridgeShelves": the four wire shelves, each a quad whose picture is the wire grid (its gaps see-through: FridgeWire), a white front
  lip (FridgeLiner) and on it a strip of price tags (FridgeTag: the shelf's own quarter of the picture, painted by the game).
- The back of the liner is its own face (FridgeBackLight: the game paints the LED's cool white wash on it, brightest under each shelf), and
  so are its sides (FridgeSideLight: the cove light's wash, brightest at the front): each side's light is a cove (the owner's, 2026-11-10:
  the sides were two glaring white bars by the frame): a black baffle standing in from the wall just behind the gasket, and behind it a
  narrow strip of milky acrylic (FridgeCove, lit) slanting back to the wall, seen only from an angle, its light on the wall behind.
- Nothing lies in another's plane (the owner saw black stripes torn across the white at the foot: the plinth's top and front shared the
  floor's): the plinth under the floor, the liner's faces 4 mm off the walls, the shelves' tags 3 mm off their lips.
- "FridgeDoorL", "FridgeDoorR": the pair of glass doors (the owner's: two black-framed doors a fridge, a black mullion where they meet): each
  its frame, its pane (FridgeGlass, see-through) and a long silver handle by the middle; the game swings each on its outer edge.
- "FridgeBack", "FridgeHatchL", "FridgeHatchR": its back, filled from behind (item 431, the owner's, 2026-11-21: 「飲料可以從冷飲櫃後面直接
  補」: their backs to the stock room, filled from there as a convenience store's are): one fixed piece, the cabinet's black outside and the lit
  liner inside, and in it an opening from under the lowest shelf to under its top (item 554, the owner's, 2026-11-22: 「冰箱後面的高度應該開
  到跟實際能補貨的範圍」「且補貨的門是左右開」; item 535's hatch was over the two middle shelves and slid up), trimmed round in steel outside,
  shut by a pair of sliding doors (引き違い) on two tracks, each a little over half its width with its own piece of the lit face and a
  finger pull let into it by its outer edge; the game slides the outer one across over the inner one while the stocker fills it.
- The foot: six louvre slats and a small silver maker's plate (FridgeMetal).

The game's frame, in the room's units: y up, the door's face toward +z, the middle of its foot at the origin; as big as bar.ts's FRIDGE
(0.86 across, 2.17 up, 0.75 deep), the shelves where FRIDGE_UNITS puts the drinks (0.27, 0.72, 1.19, 1.63 up).

Run:
    blender -b --factory-startup --python blender/drinkfridge.py -- <project path> [preview.png]
"""
import math
import os
import sys

import bpy
import numpy as np
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import active, export_dish, image, pbr  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
PROJECT = argv[0] if argv else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PREVIEW = argv[1] if len(argv) > 1 else None
bpy.ops.wm.read_factory_settings(use_empty=True)

W, H, D = 0.86, 2.17, 0.75
T = 0.035                     # the walls' thickness
PLINTH = 0.14                 # the louvred foot
HEAD = 0.27                   # the header over the door, the sign in it
SHELVES = (0.27, 0.72, 1.19, 1.63)
SLOPE = 0.035                 # how much higher each shelf's wire is at the back than at the front


def P(x, y, z):
    """the game's (three's) frame into Blender's: y up there, z up here"""
    return Vector((x, -z, y))


def lin(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


# (the wire grid: a frame round its edge, wires running front to back every 2.4 cm, two cross wires; the rest see-through)
S = 256
u = (np.arange(S) + 0.5) / S
U, V = np.meshgrid(u, u)
wires = (np.abs(((U * 30) % 1) - 0.5) > 0.38) | (np.minimum(U, 1 - U) < 0.02) | (np.minimum(V, 1 - V) < 0.03) | (np.abs(V - 0.5) < 0.012)
wire_rgb = np.ones((S, S, 3), np.float32) * 0.92
M = {
    "shell": pbr("FridgeShell", lin("#1d1e21"), rough=0.5),
    "liner": pbr("FridgeLiner", lin("#eef0ef"), rough=0.6),
    "louver": pbr("FridgeLouver", lin("#2b2d31"), rough=0.6),
    "metal": pbr("FridgeMetal", lin("#c6c9cd"), rough=0.3, metal=0.8),
    "gasket": pbr("FridgeGasket", lin("#101113"), rough=0.8),
    "sign": pbr("FridgeSign", (1, 1, 1), rough=0.6),
    "wire": pbr("FridgeWire", (1, 1, 1), tex=image("fridge_wire", wire_rgb, alpha=wires.astype(np.float32)), rough=0.4, blend=False),
    "glass": pbr("FridgeGlass", lin("#cfe2ea"), rough=0.05, blend=True),
    "backlight": pbr("FridgeBackLight", (1, 1, 1), rough=0.6),
    "sideglow": pbr("FridgeSideLight", (1, 1, 1), rough=0.6),
    "cove": pbr("FridgeCove", lin("#f0fdf4"), rough=0.5),
    "tag": pbr("FridgeTag", (1, 1, 1), rough=0.6),
}
parts = []


def box(name, x0, x1, y0, y1, z0, z1, mat):
    """a box between those bounds, in the game's frame"""
    bpy.ops.mesh.primitive_cube_add(size=1, location=P((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2))
    o = active()
    o.scale = (x1 - x0, z1 - z0, y1 - y0)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.name = name
    o.data.materials.append(M[mat])
    parts.append(o)
    return o


def rounded_loop(x0, x1, y0, y1, r, seg, corners=(True, True, True, True)):
    """a rectangle's outline in the game's x-y, counter-clockwise from its lower left, the chosen corners (lower left, lower right, upper
    right, upper left) rounded r in seg steps"""
    pts = []
    cs = [((x0, y0), (x0 + r, y0 + r), math.pi), ((x1, y0), (x1 - r, y0 + r), 1.5 * math.pi), ((x1, y1), (x1 - r, y1 - r), 0.0),
          ((x0, y1), (x0 + r, y1 - r), 0.5 * math.pi)]
    for on, (corner, c, a0) in zip(corners, cs):
        if on and r > 1e-6:
            for i in range(seg + 1):
                a = a0 + 0.5 * math.pi * i / seg
                pts.append((c[0] + r * math.cos(a), c[1] + r * math.sin(a)))
        else:
            pts.append(corner)
    return pts


def slab(name, loops, z0, z1, mat, bev, segs=2):
    """(item 379, docs/MODELING.md's 造型感) a flat shape stood up in the game's x-y, its outline `loops` (the first its outside, any more
    holes through it), from z0 to z1 (the game's z, out toward the door), its edges round its faces front and back rounded `bev` in `segs`
    steps, its normals hardened (the faces flat, the rounds smooth); the round's corners as the outline's own (its steps under 30 degrees
    are left as they are). Through a filled curve (holes and all), made a mesh"""
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "2D"
    cu.fill_mode = "BOTH"
    cu.extrude = (z1 - z0) / 2
    for loop in loops:
        sp = cu.splines.new("POLY")
        sp.points.add(len(loop) - 1)
        for pt, (x, y) in zip(sp.points, loop):
            pt.co = (x, y, 0.0, 1.0)
        sp.use_cyclic_u = True
    o = bpy.data.objects.new(name, cu)
    bpy.context.collection.objects.link(o)
    # (its own x-y the game's x-y, its own z the game's z: P's turn, a quarter about x)
    o.location = P(0, 0, (z0 + z1) / 2)
    o.rotation_euler = (math.pi / 2, 0, 0)
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.convert(target="MESH")
    o = active()
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for pg in o.data.polygons:
        pg.use_smooth = True
    m = o.modifiers.new("b", "BEVEL")
    # (50 degrees: a corner rounded in two steps (45 each, item 422) not rounded over again)
    m.width, m.segments, m.limit_method, m.angle_limit, m.harden_normals = bev, segs, "ANGLE", math.radians(50), True
    bpy.ops.object.modifier_apply(modifier=m.name)
    o.name = name
    o.data.materials.clear()
    o.data.materials.append(M[mat])
    parts.append(o)
    return o


def rod(name, a, b, r, mat, segs=12, round_ends=True):
    """a round bar from a to b (the game's frame), `segs` round, its ends rounded over (a third of its radius), its normals hardened"""
    a, b = P(*a), P(*b)
    d = b - a
    bpy.ops.mesh.primitive_cylinder_add(vertices=segs, radius=r, depth=d.length, location=(a + b) / 2)
    o = active()
    o.rotation_euler = d.to_track_quat("Z", "Y").to_euler()
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    for pg in o.data.polygons:
        pg.use_smooth = True
    if round_ends:
        m = o.modifiers.new("b", "BEVEL")
        m.width, m.segments, m.limit_method, m.angle_limit, m.harden_normals = r * 0.45, 2, "ANGLE", math.radians(60), True
        bpy.ops.object.modifier_apply(modifier=m.name)
    o.name = name
    o.data.materials.append(M[mat])
    parts.append(o)
    return o


def quad(name, corners, mat, uv=((0, 0), (1, 0), (1, 1), (0, 1))):
    """one four-cornered face, corners in the game's frame, counter-clockwise seen from its front"""
    me = bpy.data.meshes.new(name)
    me.from_pydata([P(*c) for c in corners], [], [(0, 1, 2, 3)])
    me.uv_layers.new()
    for lp, (a, b) in zip(me.uv_layers.active.data, uv):
        lp.uv = (a, b)
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(M[mat])
    parts.append(o)
    return o


def join(objs, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = active()
    o.name = name
    for o_ in objs[1:]:
        if o_ in parts:
            parts.remove(o_)
    return o


# ---- the cabinet
x0, x1 = -W / 2, W / 2
zb, zf = -D / 2, D / 2
open_y0, open_y1 = PLINTH, H - HEAD
# (item 379, docs/MODELING.md's 造型感: the sides and the top one piece, an upside-down U from the front, its top corners rounded off (SHELL_R)
# and every edge of it front and back rounded over (SHELL_ROUND), as a cartoon's fridge is; it was three boxes, every edge sharp. The back
# under its top now, inside the round)
# (item 422, the owner's 「冰箱的導角做得太明顯了，不用犧牲掉太多面數了，導角些微即可。」: 7 cm in six steps and 1.4 cm in two before, a
# cartoon's fridge; a slight bevel now, as a shop's cooler's metal is folded: 1.2 cm in two steps at the top, 4 mm in one round the edges)
SHELL_R, SHELL_ROUND = 0.012, 0.004
shell_out = rounded_loop(x0, x1, 0.0, H, SHELL_R, 2, (False, False, True, True))
# (the outline from its outer foot on the left in along the foot, up the inside, across under the top, down the inside, out along the right
# foot, up round the top and back down: counter-clockwise)
shell_in = [(x0 + T, 0.0), (x0 + T, H - T), (x1 - T, H - T), (x1 - T, 0.0)]
body = [
    slab("shell", [[shell_out[0]] + shell_in + shell_out[1:]], zb, zf, "shell", SHELL_ROUND, 1),
    box("head", x0 + T, x1 - T, open_y1, H - T, zf - 0.06, zf, "shell"),
    # (under the floor, not up into it: its top and its front lay in the floor's planes and fought them)
    box("plinth", x0 + T, x1 - T, 0.0, PLINTH - 0.02, zf - 0.08, zf - 0.02, "louver"),
    box("floor", x0 + T, x1 - T, PLINTH - 0.02, PLINTH, zb + T, zf - 0.02, "liner"),
    box("strip", x0 + T, x1 - T, PLINTH - 0.025, PLINTH, zf - 0.02, zf, "metal"),
]
# (the louvre: six slats across the foot, standing proud of it, and a little silver maker's plate in their middle)
for k in range(6):
    # (all under the steel strip over them (its foot 0.115 up): the top one ran a millimetre into it)
    y = 0.01 + k * 0.0185
    body.append(box(f"slat{k}", x0 + T + 0.03, x1 - T - 0.03, y, y + 0.009, zf - 0.02, zf - 0.006, "gasket"))
body.append(box("badge", -0.055, 0.055, 0.056, 0.082, zf - 0.006, zf - 0.002, "metal"))
# (the liner: the back and sides inside, white; the ceiling under the header)
ix0, ix1, iz0, iz1 = x0 + T, x1 - T, zb + T, zf - 0.06
# (4 mm off the cabinet's walls, not 1: at 1 they flickered with them from across the room)
LO = 0.004
# (the sides' pictures from the front (u 0) to the back (u 1), up their height)
body.append(quad("liner-l", [(ix0 + LO, open_y0, iz1), (ix0 + LO, open_y0, iz0), (ix0 + LO, open_y1, iz0), (ix0 + LO, open_y1, iz1)], "sideglow",
                 uv=((0, 0), (1, 0), (1, 1), (0, 1))))
body.append(quad("liner-r", [(ix1 - LO, open_y0, iz0), (ix1 - LO, open_y0, iz1), (ix1 - LO, open_y1, iz1), (ix1 - LO, open_y1, iz0)], "sideglow",
                 uv=((1, 0), (0, 0), (0, 1), (1, 1))))
body.append(quad("liner-top", [(ix0, open_y1 - LO, iz1), (ix1, open_y1 - LO, iz1), (ix1, open_y1 - LO, iz0), (ix0, open_y1 - LO, iz0)], "liner"))
# (the cove lights: either side a black baffle standing 2 cm in from the wall just behind the gasket, the full height of the opening, and
# behind it, against the wall, a narrow strip of milky acrylic, lit; from the front only the baffle shows and the light washed on the wall
# behind it. Clear of the shelves' wire (which starts 1 cm behind the liner's front edge))
BW = 0.02
for sd, xw in ((-1, ix0), (1, ix1)):
    inner = xw - sd * BW
    xa, xb = (xw, inner) if sd < 0 else (inner, xw)
    # (matte black, as the gasket: in the cabinet's glossy black it caught the studio and stood out as a pale bar)
    body.append(box(f"baffle{'lr'[sd > 0]}", xa, xb, open_y0, open_y1, iz1 + 0.003, iz1 + 0.025, "gasket"))
    # (tucked close to the wall, deep in the baffle's shadow: at its full width (to the baffle's inner edge) it showed from the front at any
    # slant, a bare bright line up the side; now only from well round to the side, the light itself seen as the wash on the wall)
    near, wall = xw - sd * 0.012, xw - sd * 0.004
    a, b = (near, iz1 + 0.002), (wall, iz1 - 0.004)
    # (counter-clockwise seen from inside the cabinet: its face toward the middle)
    pts = [(a[0], open_y0, a[1]), (b[0], open_y0, b[1]), (b[0], open_y1, b[1]), (a[0], open_y1, a[1])]
    body.append(quad(f"cove{'lr'[sd > 0]}", pts if sd < 0 else pts[::-1], "cove"))
# (the gasket: a dark frame round the opening, just inside the door)
g = 0.012
body += [box("gasket-t", ix0, ix1, open_y1 - g, open_y1, zf - 0.03, zf - 0.02, "gasket"),
         box("gasket-l", ix0, ix0 + g, open_y0, open_y1, zf - 0.03, zf - 0.02, "gasket"),
         box("gasket-r", ix1 - g, ix1, open_y0, open_y1, zf - 0.03, zf - 0.02, "gasket")]
fridge_body = join(body, "FridgeBody")

# ---- the sign in the header: a quad just proud of its face, the washi light box's picture on it
sy0, sy1, sx = open_y1 + 0.035, H - 0.045, W / 2 - 0.07
sign = quad("FridgeSign", [(-sx, sy0, zf + 0.002), (sx, sy0, zf + 0.002), (sx, sy1, zf + 0.002), (-sx, sy1, zf + 0.002)], "sign")

# ---- the shelves: a wire grid on each, a white lip along its front
shelves = []
for k, y in enumerate(SHELVES):
    sy = y - 0.004
    # (sloping down to the front, as a convenience store's shelves do, 3.5 cm higher at the back: what's taken from the front, those behind
    # slide down into its place (the owner's, 2026-11-11; DiningRoom's SHELF_K))
    shelves.append(quad(f"shelf{k}", [(ix0 + 0.01, sy, iz1 - 0.01), (ix1 - 0.01, sy, iz1 - 0.01), (ix1 - 0.01, sy + SLOPE, iz0 + 0.02), (ix0 + 0.01, sy + SLOPE, iz0 + 0.02)], "wire"))
    # (its lip, and the strip naming the shelf on it, inside the baffles either side, their ends 2.2 cm in from the walls (the owner's: they
    # ran out to the walls and showed past the doors' stiles, white stubs through the posts))
    LI = BW + 0.002
    shelves.append(box(f"lip{k}", ix0 + LI, ix1 - LI, sy - 0.025, sy + 0.012, iz1 - 0.022, iz1 - 0.01, "liner"))
    # (the tags along the lip's face, 3 mm proud of it: this shelf's quarter of the picture)
    v0, v1 = 1 - (k + 1) / len(SHELVES), 1 - k / len(SHELVES)
    shelves.append(quad(f"tags{k}", [(ix0 + LI + 0.002, sy - 0.023, iz1 - 0.007), (ix1 - LI - 0.002, sy - 0.023, iz1 - 0.007), (ix1 - LI - 0.002, sy + 0.01, iz1 - 0.007),
                                     (ix0 + LI + 0.002, sy + 0.01, iz1 - 0.007)], "tag", uv=((0, v0), (1, v0), (1, v1), (0, v1))))
fridge_shelves = join(shelves, "FridgeShelves")

# ---- the doors: a pair, each its frame, its pane, its handle by the middle (where the two frames meet, a black mullion)
dz0, dz1 = zf - 0.005, zf + 0.025
fx0, fx1, fy0, fy1 = x0 + 0.008, x1 - 0.008, open_y0 - 0.01, open_y1 + 0.006
fw = 0.04
# (item 422: 3.5 cm in four steps and 8 mm in two before; 8 mm in two and 3 mm in one now, the pane's opening 5 mm in one)
DOOR_R, DOOR_ROUND = 0.008, 0.003
doors = []
for side, (ax, bx) in (("L", (fx0, -0.002)), ("R", (0.002, fx1))):
    inner = bx if side == "L" else ax
    # (the handle on the inner stile's face: a bar on two posts; the stile by the middle a little wider, the mullion)
    hx0, hx1 = (inner - fw * 0.75, inner - fw * 0.35) if side == "L" else (inner + fw * 0.35, inner + fw * 0.75)
    # (item 379: each door's frame one piece round its pane, its corners rounded (DOOR_R, the pane's opening a little), its edges front and
    # back rounded over; the handle a round bar on two round posts, its ends rounded. They were four boxes and a square bar, every edge sharp)
    hx = (hx0 + hx1) / 2
    parts_ = [
        slab(f"dframe{side}", [rounded_loop(ax, bx, fy0, fy1, DOOR_R, 2),
                               rounded_loop(ax + fw, bx - fw, fy0 + fw * 1.4, fy1 - fw, 0.005, 1)], dz0, dz1, "shell", DOOR_ROUND, 1),
        quad(f"pane{side}", [(ax + fw, fy0 + fw * 1.4, (dz0 + dz1) / 2), (bx - fw, fy0 + fw * 1.4, (dz0 + dz1) / 2),
                             (bx - fw, fy1 - fw, (dz0 + dz1) / 2), (ax + fw, fy1 - fw, (dz0 + dz1) / 2)], "glass"),
        rod(f"handle{side}", (hx, 0.75, dz1 + 0.038), (hx, 1.55, dz1 + 0.038), 0.011, "metal"),
        rod(f"post-t{side}", (hx, 1.515, dz1 - 0.004), (hx, 1.515, dz1 + 0.036), 0.0065, "metal", segs=8, round_ends=False),
        rod(f"post-b{side}", (hx, 0.785, dz1 - 0.004), (hx, 0.785, dz1 + 0.036), 0.0065, "metal", segs=8, round_ends=False),
    ]
    doors.append(join(parts_, f"FridgeDoor{side}"))

# ---- the back: one piece, its lit liner fixed in it, and an opening in it for restocking, shut by a pair of doors. Item 535 (the owner's,
# 2026-11-22: 「冷飲櫃後門不能整扇開，會破模型」: it was a pair of doors the whole back (item 431), each half with half the lit liner on it, swung
# wide into the stock room: the fridge stood open from back to front, the lit halves hanging out like boards) made it a hatch over the two
# middle shelves that slid up; item 554 (the owner's 「冰箱後面的高度應該開到跟實際能補貨的範圍。」「且補貨的門是左右開」): the opening from
# under the lowest shelf to under the cabinet's top, every shelf in reach, the back's frame still round it (its sides 5.5 cm, its foot over
# the plinth, its head), shut by a pair of doors that slide across it (引き違い, as a shop's coolers' sliding doors), each a little over half
# its width, the outer one on a track 2 cm proud of the back (over the steel trim round the opening), the inner one in the back's own
# thickness: the outer slides over the inner, and the half it leaves is open. Doors swinging out either side were tried (item 554): the stock
# room is 0.77 deep from the fridges' backs to the cartons along its back wall, the stocker as deep with the case in his arms, and any door
# swinging out of the back swept through him or he backed into the cartons. Each with its piece of the liner on its inside face, a finger
# pull let into it by its outer edge (flat: the outer slides over the inner's)
HX0, HX1 = -0.34, 0.34      # the opening across the back (its middle; his two hands and what's in them in it with room either side)
HY0, HY1 = 0.19, 1.875      # ...and up it: from under the lowest shelf (0.27) to under the cabinet's top inside (1.90), the top shelf's tallest
                            # bottles (to 1.87) in its reach
HG = 0.003                  # the seam round each door in its opening
HO = 0.02                   # how far each runs past the middle, behind or over the other
lz = iz0 + LO


def liner_back(name, xa, xb, ya, yb):
    """a piece of the lit back's face, its picture's own part of the whole back's (u across, v up the opening)"""
    ua, ub = (xa - ix0) / (ix1 - ix0), (xb - ix0) / (ix1 - ix0)
    va, vb = (ya - open_y0) / (open_y1 - open_y0), (yb - open_y0) / (open_y1 - open_y0)
    return quad(name, [(xa, ya, lz), (xb, ya, lz), (xb, yb, lz), (xa, yb, lz)], "backlight", uv=((ua, va), (ub, va), (ub, vb), (ua, vb)))


bx0, bx1, by0, by1 = x0 + T, x1 - T, 0.003, H - T
TR = 0.012                  # the steel trim's width round the opening, 2 mm proud of the back
back = [box("back-b", bx0, bx1, by0, HY0, zb, zb + T, "shell"), box("back-t", bx0, bx1, HY1, by1, zb, zb + T, "shell"),
        box("back-l", bx0, HX0, HY0, HY1, zb, zb + T, "shell"), box("back-r", HX1, bx1, HY0, HY1, zb, zb + T, "shell"),
        # (the lit face round the opening: the sides' pieces a millimetre into those over and under it (no hairline where they meet; the same
        # picture there both ways))
        liner_back("liner-back-b", ix0, ix1, open_y0, HY0), liner_back("liner-back-t", ix0, ix1, HY1, open_y1),
        liner_back("liner-back-l", ix0, HX0, HY0 - 0.001, HY1 + 0.001), liner_back("liner-back-r", HX1, ix1, HY0 - 0.001, HY1 + 0.001),
        box("trim-b", HX0 - TR, HX1 + TR, HY0 - TR, HY0, zb - 0.002, zb, "metal"), box("trim-t", HX0 - TR, HX1 + TR, HY1, HY1 + TR, zb - 0.002, zb, "metal"),
        box("trim-l", HX0 - TR, HX0, HY0, HY1, zb - 0.002, zb, "metal"), box("trim-r", HX1, HX1 + TR, HY0, HY1, zb - 0.002, zb, "metal")]
fridge_back = join(back, "FridgeBack")
# (the doors: the left on the outer track (2.1 to 0.3 cm out from the back, clear of the trim's 2 mm), the right on the inner (0.3 to 2.1
# cm in it), 6 mm between them; each its black panel from the opening's side to HO past the middle, its piece of the lit face a millimetre
# in from its inside face, and a finger pull by its outer edge: a dark steel plate a millimetre proud, 16 by 2.4 cm, at the stocker's chest)
hatches = []
for side, (xa, xb), (za, zc) in (("L", (HX0 + HG, HO), (zb - 0.021, zb - 0.003)), ("R", (-HO, HX1 - HG), (zb + 0.003, zb + 0.021))):
    px = xa + 0.035 if side == "L" else xb - 0.035
    py0, py1 = 1.04, 1.20
    lin_ = liner_back(f"hatch-liner{side}", xa, xb, HY0 + HG, HY1 - HG)
    # (its piece of the lit face moved onto its own inside face)
    for vt in lin_.data.vertices:
        vt.co.y = -(zc + 0.001)
    hatches.append(join([box(f"hatch{side}", xa, xb, HY0 + HG, HY1 - HG, za, zc, "shell"), lin_,
                         box(f"hatch-pull{side}", px - 0.012, px + 0.012, py0, py1, za - 0.001, za, "gasket")],
                        f"FridgeHatch{side}"))
rears = [fridge_back, *hatches]

root = bpy.data.objects.new("DrinkFridge", None)
bpy.context.collection.objects.link(root)
for o in (fridge_body, sign, fridge_shelves, *doors, *rears):
    o.parent = root
print("FRIDGE_TRIS", sum(len(p.vertices) - 2 for o in (fridge_body, sign, fridge_shelves, *doors, *rears) for p in o.data.polygons))
if PREVIEW:
    target = P(0, 1.1, 0)
    cam = bpy.data.objects.new("PreviewCam", bpy.data.cameras.new("PreviewCam"))
    bpy.context.collection.objects.link(cam)
    cam.location = P(1.3, 1.6, 2.6)
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
export_dish(root, parts + [root], os.path.join(PROJECT, "public", "models", "drinkfridge.glb"), os.path.join(PROJECT, "blender", "drinkfridge.blend"), PREVIEW)
print("FRIDGE_DONE")
