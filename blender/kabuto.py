"""A samurai helmet (兜) on its red lacquer stand, set out on the shoe cupboard (the owner's: after the Sketchfab "Samurai Helm / Kabuto
(Low-poly)", looked at only): a ribbed bowl of black lacquered iron, gold rivets down its ribs; a gold plate down its brow and a gold band
round it, a gold peak (眉庇) over the face; a pair of flat gold horns (鍬形) sweeping up and out, a gold crescent (前立) between them; the
turned-back wings (吹返) at its sides, gold, studded in rows; the neck guard (錣) of four lames flaring out round the back, laced; a dark
lacquered mask (面頬) under the peak, made again (item 900): cheekbones, a hooked nose of its own, a mouth open on its teeth, a black
moustache, gilt posts on its cheeks, a laced guard (垂) hanging from its jaw, red lacquer inside; an orange cord from inside the helmet round
the posts, tied in a bow under the chin; on a stand of red lacquer, a post on a cross.

Every part a sheet of even quads (the owner's: 佈線均勻), about as wide as they're tall, given a little thickness; the ribs, rivets, studs,
lacing and the gold's engraving painted on, not modelled. About 2,000 triangles in all.

Writes public/models/kabuto.glb and blender/kabuto.blend. Its root is the node "Kabuto", the stand's foot at y = 0, facing -z (three's frame).

Run:
    blender -b --factory-startup --python blender/kabuto.py -- <project path> [preview.png]
"""
import math
import os
import sys

import bmesh
import bpy
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *  # noqa: E402,F403

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
PROJECT = argv[0] if argv else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PREVIEW = argv[1] if len(argv) > 1 else None
bpy.ops.wm.read_factory_settings(use_empty=True)
seed(5)


def P(x, y, z):
    return (x, -z, y)


def lin(hexs):
    c = [int(hexs[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


# =====================================================================
# Pictures
# =====================================================================
def dots(u, v, nu, rows, r, jitter=0.0):
    """round studs: `nu` across, at the given v rows, radius r (in v units); 1 inside"""
    m = np.zeros_like(u)
    for vr in rows:
        du = (u * nu) % 1.0 - 0.5
        d = np.sqrt((du / nu) ** 2 + (v - vr) ** 2)
        m = np.maximum(m, smooth(r, r * 0.6, d))
    return m


# (the bowl: black lacquer, thirty-two ribs round it (a lit ridge, a dark groove), a gold rivet on each rib in four rows)
S = 512
u, v = grid01(S)
rib = np.abs(((u * 32) % 1.0) - 0.5) * 2
bowl = mix((0.035, 0.037, 0.05), (0.09, 0.095, 0.12), smooth(0.35, 0.0, rib))
bowl = mix(bowl, (0.012, 0.012, 0.018), smooth(0.8, 1.0, rib) * 0.8)
riv = np.zeros_like(u)
for vr in (0.18, 0.38, 0.58, 0.78):
    du = ((u * 32) % 1.0 - 0.5) / 32 * 2.6
    riv = np.maximum(riv, smooth(0.016, 0.009, np.sqrt(du ** 2 + (v - vr) ** 2 * 0.25)))
bowl = mix(bowl, (0.75, 0.55, 0.2), riv)
bowl *= (0.92 + 0.08 * fbm(S, 8, 8))[..., None]

# (the gold: worn bright where it stands proud, darker in the engraving: scrolls of tendrils over it, a beaded border at its edges)
G = 512
gu, gv = grid01(G)
# (fine engraved lines: tendrils curling over it, thin and low in contrast, the gold itself catching the light in soft patches)
scroll = np.abs(np.sin(gu * 2 * np.pi * 4 + np.sin(gv * 2 * np.pi * 4 + np.sin(gu * 2 * np.pi * 2) * 2) * 1.8))
gold = mix((0.62, 0.44, 0.13), (0.92, 0.74, 0.32), fbm(G, 4, 4))
gold = mix(gold, (0.32, 0.2, 0.06), smooth(0.07, 0.0, scroll) * 0.45)
edge = np.minimum(np.minimum(gu, 1 - gu), np.minimum(gv, 1 - gv))
gold *= (0.9 + 0.1 * fbm(G, 6, 6))[..., None]

# (the wings: gold plates with three columns of round studs down them and a dark rim)
wing = mix((0.62, 0.44, 0.12), (0.9, 0.7, 0.3), fbm(G, 5, 5))
for col in (0.3, 0.5, 0.7):
    for row in np.linspace(0.12, 0.88, 9):
        d = np.sqrt((gu - col) ** 2 + (gv - row) ** 2 * 0.6)
        wing = mix(wing, (0.35, 0.22, 0.06), smooth(0.05, 0.04, d))
        wing = mix(wing, (1.0, 0.85, 0.45), smooth(0.038, 0.02, d) * (gv > row - 0.03))
        wing = mix(wing, (0.8, 0.6, 0.22), smooth(0.038, 0.02, d) * (gv <= row - 0.03))
wing = mix(wing, (0.08, 0.06, 0.04), smooth(0.05, 0.03, edge))

# (the neck guard's lames: black lacquer laced in navy cords, columns of them down; along each lame's foot a row of small gold scales)
L = 512
lu, lv = grid01(L)
lace_col = np.abs(((lu * 28) % 1.0) - 0.5) * 2
lace = mix((0.03, 0.03, 0.04), (0.04, 0.07, 0.2), smooth(0.45, 0.2, lace_col))
lace = mix(lace, (0.07, 0.11, 0.26), smooth(0.25, 0.0, lace_col) * (0.6 + 0.4 * np.sin(lv * 2 * np.pi * 5)))
lace = mix(lace, (0.85, 0.64, 0.25), dots(lu, lv, 56, (0.12,), 0.06))
lace = mix(lace, (0.6, 0.45, 0.16), smooth(0.05, 0.0, lv) * 0.8)

# (the mask, 面頬 (item 900, the owner's 「面具質感不對，且模型樣子有點生硬」: a dark half-cylinder, toon-shaded black under the peak, its
# mouth one painted line): one picture for all of it, 512 x 256: its face on the left (s across from its right cheek to its left, t down
# from its top edge), and down the right its nose, the teeth behind its mouth and its inside's red lacquer. Lacquered iron the colour of
# bengara (弁柄), rubbed lighter over the cheekbones, the nose and the chin; a moustache and a tuft under the lip of black lacquer laid on in
# relief, its hairs combed; the folds from the nose to the mouth's corners and three wrinkles round each corner (an angry old man's, as
# a menpo's are); its lips round the opening; a rolled black rim round its edge. The relief its normal map.
MW, MH = 512, 256
FACE_U = 0.78
NOSE_U, NOSE_V = (0.80, 1.0), (0.0, 0.48)
TEETH_V = (0.52, 0.74)
RED_V = (0.78, 1.0)
mu = np.tile((np.arange(MW) + 0.5) / MW, (MH, 1)).astype(np.float32)
mv = np.tile(((np.arange(MH) + 0.5) / MH)[:, None], (1, MW)).astype(np.float32)
fs, ft = mu / FACE_U, mv
# (distances on the face in its own proportion: across it about twice as far as down it)
FY = 0.5


def Gs(x, w):
    return np.exp(-(x / w) ** 2)


def poly_d(px, py, pts):
    """distance from each (px, py) to the polyline through pts (face s, t; t scaled by FY), and how far along it (0..1)"""
    best = np.full(px.shape, 1e9, np.float32)
    along = np.zeros(px.shape, np.float32)
    total = sum(math.hypot(pts[k + 1][0] - pts[k][0], (pts[k + 1][1] - pts[k][1]) * FY) for k in range(len(pts) - 1))
    run = 0.0
    for k in range(len(pts) - 1):
        ax, ay = pts[k][0], pts[k][1] * FY
        bx, by = pts[k + 1][0], pts[k + 1][1] * FY
        dx, dy = bx - ax, by - ay
        L2 = dx * dx + dy * dy
        tt = np.clip(((px - ax) * dx + (py * FY - ay) * dy) / L2, 0, 1)
        d = np.hypot(px - ax - tt * dx, py * FY - ay - tt * dy)
        sel = d < best
        best = np.where(sel, d, best)
        along = np.where(sel, (run + tt * math.sqrt(L2)) / total, along)
        run += math.sqrt(L2)
    return best, along


lac_lo, lac_hi = np.array((0.30, 0.11, 0.07), np.float32), np.array((0.52, 0.23, 0.14), np.float32)
black = np.array((0.045, 0.035, 0.03), np.float32)
grain = fbm(512, 6, 6)[:MH, :MW]
fine = fbm(512, 24, 24)[:MH, :MW]
# ---- the face
rub = (0.55 * Gs(np.abs(fs - 0.5) - 0.23, 0.09) * Gs(ft - 0.17, 0.13) + 0.6 * Gs(fs - 0.5, 0.07) * Gs(ft - 0.9, 0.07)
       + 0.35 * Gs(fs - 0.5, 0.13) * Gs(ft - 0.42, 0.08))
shade = 0.35 * (1 - Gs(fs - 0.5, 0.42))
face = mix(lac_lo, lac_hi, np.clip(0.35 + 0.65 * rub - shade + (grain - 0.5) * 0.18, 0, 1))
h = (fine - 0.5) * 0.12
# (the folds from the nose's wings to the mouth's corners, and the wrinkles round each corner: dark in their hollow, a lit ridge outside)
for sd in (-1, 1):
    d, _ = poly_d(fs, ft, [(0.5 + sd * 0.07, 0.30), (0.5 + sd * 0.12, 0.38), (0.5 + sd * 0.155, 0.47), (0.5 + sd * 0.165, 0.53)])
    face = mix(face, lac_lo * 0.55, Gs(d, 0.006) * 0.85)
    h -= Gs(d, 0.007) * 0.9
    h += Gs(d - 0.011, 0.006) * 0.35
    for k, r in enumerate((0.055, 0.075, 0.095)):
        cs, ct = 0.5 + sd * 0.16, 0.56
        rr = np.hypot(fs - cs, (ft - ct) * FY)
        ang = np.arctan2((ft - ct) * FY, (fs - cs) * sd)
        arc = (ang > -1.1) & (ang < 1.15)
        w = Gs(rr - r, 0.0045) * arc * Gs(ang - 0.05, 0.9)
        face = mix(face, lac_lo * 0.6, w * 0.8)
        h -= w * 0.7
        h += Gs(rr - r - 0.008, 0.004) * arc * Gs(ang - 0.05, 0.9) * 0.3
# (the moustache: from under the nose out over the upper lip and down past the mouth's corners, thick at the middle, its hairs combed out)
for sd in (-1, 1):
    d, a = poly_d(fs, ft, [(0.5 + sd * 0.012, 0.425), (0.5 + sd * 0.07, 0.44), (0.5 + sd * 0.13, 0.48), (0.5 + sd * 0.175, 0.56),
                           (0.5 + sd * 0.19, 0.64)])
    wid = 0.024 * (1 - a) ** 0.6 + 0.004
    m = smooth(wid, wid * 0.55, d)
    hair = 0.5 + 0.5 * np.sin((a * 26 + d * 160) * 2 * math.pi)
    face = mix(face, mix(black, black * 2.6, hair * 0.6), m)
    h = np.maximum(h, m * (0.75 + 0.2 * hair))
# (the tuft under the lower lip)
d, a = poly_d(fs, ft, [(0.5, 0.665), (0.5, 0.74), (0.5, 0.86)])
wid = 0.03 * np.sin(np.clip(a, 0, 1) * math.pi) ** 0.7 + 0.002
m = smooth(wid, wid * 0.5, d)
hair = 0.5 + 0.5 * np.sin((a * 18 + (fs - 0.5) * 90) * 2 * math.pi)
face = mix(face, mix(black, black * 2.4, hair * 0.5), m)
h = np.maximum(h, m * (0.6 + 0.2 * hair))
# (the lips round the opening (its corners pulled in, its middle open: the mesh's own), a darker red, a little raised)
lip_t = np.where(np.abs(fs - 0.5) < 0.0833, 0.48 + 0.065 * ((fs - 0.5) / 0.0833) ** 2, 1)
lip_b = np.where(np.abs(fs - 0.5) < 0.0833, 0.64 - 0.045 * ((fs - 0.5) / 0.0833) ** 2, 0)
near_lip = np.minimum(np.abs(ft - lip_t), np.abs(ft - lip_b)) * FY
lips = Gs(near_lip, 0.012) * Gs(np.maximum(np.abs(fs - 0.5) - 0.07, 0), 0.02)
face = mix(face, lac_lo * 0.75, lips * 0.7)
h += lips * 0.45
# (the rolled rim round its edge: black, raised)
edge = np.minimum(np.minimum(fs, 1 - fs), np.minimum(ft, 1 - ft) * FY)
rim = smooth(0.022, 0.012, edge)
face = mix(face, black * 1.4, rim)
h += Gs(edge - 0.008, 0.008) * 0.8
# (the sweat hole under the chin)
hole = Gs(np.hypot(fs - 0.5, (ft - 0.955) * FY), 0.007)
face = mix(face, black * 0.5, np.clip(hole * 1.6, 0, 1))
h -= hole * 0.8
pic = np.where((mu < FACE_U)[..., None], face, 0).astype(np.float32)
hm = np.where(mu < FACE_U, h, 0).astype(np.float32)
# ---- the nose (s' across, t' down from its bridge): the lacquer, lit along its ridge; its nostrils
ns, nt = (mu - NOSE_U[0]) / (NOSE_U[1] - NOSE_U[0]), (mv - NOSE_V[0]) / (NOSE_V[1] - NOSE_V[0])
in_nose = (mu >= NOSE_U[0]) & (mv < NOSE_V[1])
nose = mix(lac_lo, lac_hi, np.clip(0.45 + 0.5 * Gs(ns - 0.5, 0.13) * (0.4 + 0.6 * nt) + (grain - 0.5) * 0.15, 0, 1))
nostril = np.zeros_like(ns)
for sd in (-1, 1):
    nostril = np.maximum(nostril, Gs(np.hypot((ns - 0.5 - sd * 0.22) / 0.10, (nt - 0.9) / 0.07), 1.0))
    crease = Gs(np.hypot((ns - 0.5 - sd * 0.24) / 0.2, (nt - 0.8) / 0.16) - 1, 0.12) * (nt > 0.55)
    nose = mix(nose, lac_lo * 0.6, crease * 0.7)
nose = mix(nose, black * 0.4, np.clip(nostril * 1.5, 0, 1))
pic = np.where(in_nose[..., None], nose, pic)
hm = np.where(in_nose, Gs(ns - 0.5, 0.15) * 0.3 - nostril * 0.9, hm)
# ---- the teeth behind the mouth (s'' across, t'' up its strip): an upper and a lower row, ivory, dark between, black between the rows
ts, tt = (mu - NOSE_U[0]) / (NOSE_U[1] - NOSE_U[0]), (mv - TEETH_V[0]) / (TEETH_V[1] - TEETH_V[0])
in_teeth = (mu >= NOSE_U[0]) & (mv >= TEETH_V[0]) & (mv < TEETH_V[1])
gap = np.abs(((ts * 8) % 1.0) - 0.5) * 2
tooth = smooth(0.92, 0.75, gap)
up_row = smooth(0.58, 0.64, tt) * smooth(0.97, 0.9, tt)
lo_row = smooth(0.03, 0.1, tt) * smooth(0.42, 0.36, tt)
teeth = mix(np.broadcast_to(black * 0.3, ns.shape + (3,)), (0.86, 0.82, 0.7), np.clip((up_row + lo_row * 0.92) * tooth, 0, 1))
pic = np.where(in_teeth[..., None], teeth, pic)
hm = np.where(in_teeth, (up_row + lo_row) * tooth * 0.6, hm)
# ---- its inside: red lacquer (朱), worn a little
in_red = (mu >= NOSE_U[0]) & (mv >= RED_V[0])
pic = np.where(in_red[..., None], mix((0.5, 0.08, 0.05), (0.66, 0.13, 0.08), grain), pic)
mask_pic = np.clip(pic, 0, 1).astype(np.float32)
mask_nrm = to_normal(hm, 5.0).astype(np.float32)


# (the cord: orange, twisted: diagonal strands)
cord = mix((0.75, 0.36, 0.08), (0.98, 0.62, 0.22), smooth(-0.2, 0.9, np.sin((gu * 3 + gv * 24) * 2 * np.pi)))

M = {
    "lacquer": pbr("KabutoLacquer", (1, 1, 1), tex=image("kabuto_bowl", np.clip(bowl, 0, 1)), rough=0.3, coat=0.5),
    "gold": pbr("KabutoGold", (1, 1, 1), tex=image("kabuto_gold", np.clip(gold, 0, 1)), rough=0.28, metal=1.0),
    "wing": pbr("KabutoWing", (1, 1, 1), tex=image("kabuto_wing", np.clip(wing, 0, 1)), rough=0.3, metal=1.0),
    "lace": pbr("KabutoLace", (1, 1, 1), tex=image("kabuto_lace", np.clip(lace, 0, 1)), rough=0.6),
    "mask": pbr("KabutoMask", (1, 1, 1), tex=image("kabuto_mask", mask_pic), nrm=image("kabuto_mask_n", mask_nrm, data=True), rough=0.32,
                coat=0.5),
    "cord": pbr("KabutoCord", (1, 1, 1), tex=image("kabuto_cord", np.clip(cord, 0, 1)), rough=0.8),
    "stand": pbr("KabutoStand", lin("#9a1e14"), rough=0.35, coat=0.4),
    "dark": pbr("KabutoInside", lin("#0a0a0c"), rough=0.6),
}
parts = []


def sheet(name, nu, nv, fn, mat, closed=False, thick=0.003, uv_scale=(1.0, 1.0)):
    """a sheet of nu x nv even quads through fn(s, t) (s, t in 0..1, three's frame), its UVs the same s, t; given `thick`"""
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new()
    cols = nu if closed else nu + 1
    rows = [[bm.verts.new(P(*fn(i / nu, j / nv))) for i in range(cols)] for j in range(nv + 1)]
    for j in range(nv):
        for i in range(nu):
            i2 = (i + 1) % cols
            f = bm.faces.new((rows[j][i], rows[j][i2], rows[j + 1][i2], rows[j + 1][i]))
            for lp, (a, b) in zip(f.loops, ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))):
                lp[uvl].uv = (a / nu * uv_scale[0], b / nv * uv_scale[1])
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    if thick:
        so = o.modifiers.new("t", "SOLIDIFY")
        so.thickness = thick
        so.offset = 0
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_apply(modifier="t")
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(o.data)
    bm.free()
    o.data.materials.append(mat)
    for p in o.data.polygons:
        p.use_smooth = True
    parts.append(o)
    return o


def box(name, w, h, d, at, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=P(*at))
    o = bpy.context.view_layer.objects.active
    o.scale = (w, d, h)
    bpy.ops.object.transform_apply(scale=True)
    bv = o.modifiers.new("b", "BEVEL"); bv.width = 0.004; bv.segments = 1
    bpy.ops.object.modifier_apply(modifier="b")
    o.name = name
    o.data.materials.append(mat)
    parts.append(o)
    return o


# =====================================================================
# The helmet
# =====================================================================
B0 = 0.2          # (the bowl's rim, above the stand's foot)
R = 0.11          # (the bowl's radius at its rim; a tenth longer front to back)
DEEP = 1.1
HD = 0.095        # (the dome's height)
FRONT = -math.pi / 2   # (the face is toward -z: the angle round from +x)


def dome(t, a, out=0.0):
    """a point on the bowl: t 0 (the rim) .. 1 (the crown), a the angle round"""
    th = t * math.pi / 2
    r = (R + out) * math.cos(th)
    return (r * math.cos(a), B0 + (HD + out) * math.sin(th), r * math.sin(a) * DEEP)


# (the bowl: 24 round, six rings up to the crown's opening, which the gold tehen ring covers)
sheet("KabutoBowl", 24, 6, lambda s, t: dome(t * 0.9, s * 2 * math.pi), M["lacquer"], closed=True, thick=0.004)
# (inside it, seen under the peak: dark)
sheet("KabutoInside", 24, 2, lambda s, t: dome(t * 0.5, s * 2 * math.pi, -0.006), M["dark"], closed=True, thick=0)
# (the tehen: a gold ring at the crown, its top closed)
sheet("KabutoTehen", 12, 1, lambda s, t: ((0.024 - 0.006 * t) * math.cos(s * 2 * math.pi), B0 + HD - 0.004 + 0.01 * t, (0.024 - 0.006 * t) * math.sin(s * 2 * math.pi) * DEEP),
      M["gold"], closed=True, thick=0.003, uv_scale=(2, 0.3))
# (a gold band round the bowl's foot over the face, and a gold plate up its front from it)
sheet("KabutoBand", 14, 2, lambda s, t: dome(t * 0.18, FRONT + (s - 0.5) * 3.4, 0.003), M["gold"], thick=0.002, uv_scale=(6, 0.5))
sheet("KabutoPlate", 3, 6, lambda s, t: dome(0.15 + t * 0.72, FRONT + (s - 0.5) * 0.5 * (1 - 0.4 * t), 0.004), M["gold"], thick=0.002, uv_scale=(1, 2))
# (the peak over the face: sloping down and out from the band, gold)
sheet("KabutoPeak", 12, 1, lambda s, t: ((R + 0.004 + 0.026 * t) * math.cos(FRONT + (s - 0.5) * 2.7), B0 + 0.004 - 0.016 * t,
                                          (R + 0.004 + 0.026 * t) * math.sin(FRONT + (s - 0.5) * 2.7) * DEEP), M["gold"], thick=0.004, uv_scale=(5, 0.5))

# (the horns: flat gold blades from the band's front, out and up, then hooked out at their tips; each a strip of quads along its middle)
def horn(sd):
    pts = [(0.028, B0 + 0.02, -0.122), (0.05, B0 + 0.055, -0.128), (0.068, B0 + 0.095, -0.126), (0.08, B0 + 0.135, -0.12), (0.092, B0 + 0.165, -0.112),
           (0.112, B0 + 0.185, -0.104), (0.135, B0 + 0.192, -0.098)]
    wid = [0.016, 0.02, 0.022, 0.022, 0.02, 0.016, 0.008]

    def at(s, t):
        f = s * (len(pts) - 1)
        i = min(len(pts) - 2, int(f))
        k = f - i
        p = [pts[i][c] * (1 - k) + pts[i + 1][c] * k for c in range(3)]
        w = wid[i] * (1 - k) + wid[i + 1] * k
        # (across the blade: in its own plane, at right angles to its run in x-y)
        dx, dy = pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]
        ln = math.hypot(dx, dy) or 1
        nx, ny = -dy / ln, dx / ln
        # (kept lower than drawn: from the shoe cupboard they reached the light switches on the wall over it)
        return (sd * (p[0] + nx * w * (t - 0.5)), B0 + (p[1] + ny * w * (t - 0.5) - B0) * 0.78, p[2])
    sheet(f"KabutoHorn{sd}", 10, 1, at, M["gold"], thick=0.003, uv_scale=(3.5, 0.4))


for sd in (-1, 1):
    horn(sd)
# (the crescent on the brow between them: a thin new moon, its horns up, on a short stem)
sheet("KabutoCrest", 12, 1, lambda s, t: ((0.032 - (0.002 + 0.009 * math.sin(s * math.pi)) * t) * math.cos(math.pi * (1.1 - 1.2 * s)),
                                           B0 + 0.06 - (0.032 - (0.002 + 0.009 * math.sin(s * math.pi)) * t) * math.sin(math.pi * (1.1 - 1.2 * s)),
                                           -R * DEEP - 0.012), M["gold"], thick=0.003, uv_scale=(2, 0.3))

# (the wings turned back at the peak's ends: gold plates standing out sideways, curling back, studded in rows)
def wingp(sd):
    def at(s, t):
        a = FRONT + sd * (1.7 + 0.25 * s)
        r = R + 0.01 + 0.06 * s
        y = B0 - 0.005 - 0.085 * t + 0.012 * s
        return (r * math.cos(a), y, r * math.sin(a) * DEEP - 0.012 * s * s)
    sheet(f"KabutoWing{sd}", 4, 4, at, M["wing"], thick=0.004)


for sd in (-1, 1):
    wingp(sd)

# (the neck guard: four lames, round from one cheek past the back to the other, each flaring out a little more and stepping down)
OPEN = 3.9   # (the angle the face is left open across: the lames end behind the wings)
for k in range(4):
    y0 = B0 - 0.006 - k * 0.022
    r0 = R + 0.004 + k * 0.024

    def lame(s, t, y0=y0, r0=r0):
        a = FRONT + OPEN / 2 + s * (2 * math.pi - OPEN)
        r = r0 + 0.03 * t
        return (r * math.cos(a), y0 - 0.026 * t, r * math.sin(a) * DEEP)
    sheet(f"KabutoShikoro{k}", 20, 1, lame, M["lace"], thick=0.004)

# =====================================================================
# The mask (面頬, item 900): a face of lacquered iron under the peak, from under the eyes down over the chin and round the cheeks toward
# the ears: its cheekbones, the muzzle over the mouth and the chin standing out, the cheeks hollow under the bones; the mouth an opening, its
# corners drawn in, the teeth set behind it; the nose a piece of its own over it, hooked; a gilt post (折釘) on each cheek for the cord; a
# guard of two laced lames (垂) hanging from its jaw over the throat; 3 mm of iron, red lacquer inside. Behind the eyes' gap, the dark of
# the helmet's inside (its stand's post and arm hidden). The cord from inside the helmet's sides round the posts and under the chin, tied in
# a bow in front of the guard, its ends hanging.
# =====================================================================
from mathutils import Vector  # noqa: E402
ZC = -0.005                    # (the head's middle, front to back)
M_NU, M_NV = 12, 8             # (the face's quads across and down)
MOUTH = (4, (5, 6))            # (the row and the two columns left open for the mouth)


def _phi_table(A, B, Phi, n=96):
    """the angles round an ellipse (half-axes A across, B front to back) from -Phi to Phi at even steps of length along it"""
    ph = np.linspace(-Phi, Phi, n + 1)
    pts = np.stack([A * np.sin(ph), -B * np.cos(ph)], -1)
    seg = np.hypot(*(pts[1:] - pts[:-1]).T)
    run = np.concatenate([[0.0], np.cumsum(seg)])
    return ph, run / run[-1]


def face_shape(t):
    """the face's cross-section at t (0 its top edge .. 1 its jaw): half-width, depth to its front, the angle round it reaches"""
    return 0.080 - 0.018 * t * t, 0.100 + 0.012 * t - 0.015 * t * t, 1.42 - 0.22 * t


def face_relief(u, t):
    """how far out from the plain shape the face stands (u -1 .. 1 across): the cheekbones, the muzzle, the chin, the hollow cheeks"""
    g = lambda x, w: math.exp(-(x / w) ** 2)
    return (0.007 * g(abs(u) - 0.47, 0.2) * g(t - 0.15, 0.17) + 0.010 * g(u, 0.30) * g(t - 0.48, 0.22)
            + 0.011 * g(u, 0.22) * g(t - 0.9, 0.13) - 0.004 * g(abs(u) - 0.55, 0.14) * g(t - 0.55, 0.15))


def face_pt(s, t, off=0.0):
    """a point on the face (s 0 .. 1 across, t 0 .. 1 down), `off` out from it along its outward normal; three's frame"""
    u = 2 * s - 1
    y_top = 0.157 + 0.017 * math.exp(-(u / 0.17) ** 2) + 0.006 * u * u
    y_bot = 0.074 + 0.040 * abs(u) ** 1.6
    y = y_top + (y_bot - y_top) * t
    A, B, Phi = face_shape(t)
    ph, frac = _phi_table(A, B, Phi)
    phi = float(np.interp(s, frac, ph))
    nx, nz = math.sin(phi) / A, -math.cos(phi) / B
    L = math.hypot(nx, nz)
    nx, nz = nx / L, nz / L
    d = face_relief(u, t) + off
    return (A * math.sin(phi) + nx * d, y, ZC - B * math.cos(phi) + nz * d), (nx, 0.0, nz)


def mouth_dt(i, j):
    """the mouth's corners drawn in and down, its middle open (the rows round the opening moved)"""
    if i not in (5, 6, 7) or j not in (4, 5):
        return 0.0
    mid = i == 6
    return {(True, 4): -0.02, (False, 4): 0.045, (True, 5): 0.015, (False, 5): -0.03}[(mid, j)]


def mesh_obj(name, bm, mat, smooth_shade=True):
    me_ = bpy.data.meshes.new(name)
    bm.to_mesh(me_)
    bm.free()
    o = bpy.data.objects.new(name, me_)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(mat)
    for p_ in o.data.polygons:
        p_.use_smooth = smooth_shade
    parts.append(o)
    return o


def mask_plate():
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new()
    st = [[(i / M_NU, j / M_NV + mouth_dt(i, j)) for i in range(M_NU + 1)] for j in range(M_NV + 1)]
    vs = [[bm.verts.new(P(*face_pt(*st[j][i])[0])) for i in range(M_NU + 1)] for j in range(M_NV + 1)]
    for j in range(M_NV):
        for i in range(M_NU):
            if j == MOUTH[0] and i in MOUTH[1]:
                continue
            f = bm.faces.new((vs[j][i], vs[j][i + 1], vs[j + 1][i + 1], vs[j + 1][i]))
            for lp, (a, b) in zip(f.loops, ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))):
                lp[uvl].uv = (st[b][a][0] * FACE_U, st[b][a][1])
    o = mesh_obj("KabutoMask", bm, M["mask"])
    # (3 mm of iron, its inside and its edge given their own parts of the picture: the red lacquer, the black rim)
    so = o.modifiers.new("t", "SOLIDIFY")
    so.thickness = 0.003
    so.offset = -1
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier="t")
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    uvl = bm.loops.layers.uv.active
    for f in bm.faces:
        c = f.calc_center_median()
        # (Blender's frame: three's z is -y; outward is away from the head's middle across x and three's z)
        out = Vector((c.x, c.y + ZC, 0.0))
        out = out.normalized() if out.length > 1e-6 else Vector((0, -1, 0))
        k = f.normal.dot(out)
        if k < -0.4:
            for lp in f.loops:
                lp[uvl].uv = ((NOSE_U[0] + NOSE_U[1]) / 2, (RED_V[0] + RED_V[1]) / 2)
        elif k < 0.4:
            for lp in f.loops:
                lp[uvl].uv = (0.004 * FACE_U, 0.5)
    bm.to_mesh(o.data)
    bm.free()
    return o


def mask_nose():
    """the nose: a shell over the face's middle, hooked, its wings flared, its foot curled in under it to the lip; open behind (on the face)"""
    NS, NT = 4, 6
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new()
    y_bridge, y_tip, y_foot = 0.170, 0.137, 0.127
    rows = []
    for j in range(NT + 1):
        tq = j / NT
        y = y_bridge + (y_tip - y_bridge) * min(1.0, tq / 0.8) if tq <= 0.8 else y_tip + (y_foot - y_tip) * (tq - 0.8) / 0.2
        # (how far the face is at this height, along its middle: the face's t there)
        t_face = (0.174 - y) / (0.174 - 0.074)
        fz = face_pt(0.5, t_face)[0][2]
        H = 0.004 + 0.021 * min(1.0, tq / 0.8) ** 1.4 if tq <= 0.8 else 0.025 * (1 - (tq - 0.8) / 0.2) + 0.004 * (tq - 0.8) / 0.2
        w = 0.007 + 0.013 * tq ** 1.5
        ring = []
        for i in range(NS + 1):
            uq = 2 * i / NS - 1
            ring.append(bm.verts.new(P(w * uq, y - 0.002 * abs(uq) * tq, fz - (H * (1 - abs(uq) ** 1.6) - 0.0015 - 0.0035 * abs(uq) ** 2))))
        rows.append(ring)
    for j in range(NT):
        for i in range(NS):
            f = bm.faces.new((rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]))
            for lp, (a, b) in zip(f.loops, ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))):
                lp[uvl].uv = (NOSE_U[0] + (NOSE_U[1] - NOSE_U[0]) * a / NS, NOSE_V[0] + (NOSE_V[1] - NOSE_V[0]) * b / NT)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    # (its outside toward the room: the face's front is -z, Blender's +y)
    if sum(f.normal.y for f in bm.faces) < 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces)
    return mesh_obj("KabutoNose", bm, M["mask"])


def mask_teeth():
    """the teeth: a strip 6 mm behind the face across the mouth's opening, curved as the face is; seen through it"""
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new()
    NS = 4
    s0, s1, t0, t1 = 0.37, 0.63, 0.45, 0.67
    rows = [[bm.verts.new(P(*face_pt(s0 + (s1 - s0) * i / NS, t, -0.0065)[0])) for i in range(NS + 1)] for t in (t0, t1)]
    for i in range(NS):
        f = bm.faces.new((rows[0][i], rows[0][i + 1], rows[1][i + 1], rows[1][i]))
        for lp, (a, b) in zip(f.loops, ((i, 0), (i + 1, 0), (i + 1, 1), (i, 1))):
            lp[uvl].uv = (NOSE_U[0] + (NOSE_U[1] - NOSE_U[0]) * a / NS, TEETH_V[1] - (TEETH_V[1] - TEETH_V[0]) * b)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if sum(f.normal.y for f in bm.faces) < 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces)
    return mesh_obj("KabutoTeeth", bm, M["mask"])


def tube(name, pts, r, sides, mat, closed=False, v_per=0.12, caps=True):
    """a tube along the points (three's frame), `sides` round; its UVs round it and along it (one picture's height each v_per of length)"""
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new()
    P_ = [Vector(P(*p)) for p in pts]
    n = len(P_)
    rings, runs = [], [0.0]
    for k in range(1, n):
        runs.append(runs[-1] + (P_[k] - P_[k - 1]).length)
    prev_side = None
    for k in range(n):
        a = P_[(k - 1) % n] if (closed or k > 0) else P_[k]
        b = P_[(k + 1) % n] if (closed or k < n - 1) else P_[k]
        tdir = (b - a).normalized()
        side = tdir.cross(Vector((0, 0, 1)))
        if side.length < 1e-4:
            side = tdir.cross(Vector((1, 0, 0)))
        side.normalize()
        if prev_side is not None and side.dot(prev_side) < 0:
            side = -side
        prev_side = side
        up = side.cross(tdir).normalized()
        rings.append([bm.verts.new(P_[k] + (side * math.cos(2 * math.pi * q / sides) + up * math.sin(2 * math.pi * q / sides)) * r)
                      for q in range(sides)])
    segs = n if closed else n - 1
    for k in range(segs):
        k2 = (k + 1) % n
        for q in range(sides):
            q2 = (q + 1) % sides
            f = bm.faces.new((rings[k][q], rings[k][q2], rings[k2][q2], rings[k2][q]))
            vk, vk2 = runs[k] / v_per, (runs[k2] if k2 > k else runs[-1] + (P_[0] - P_[-1]).length) / v_per
            for lp, (uu, vv) in zip(f.loops, ((q / sides, vk), ((q + 1) / sides, vk), ((q + 1) / sides, vk2), (q / sides, vk2))):
                lp[uvl].uv = (uu, vv)
    if caps and not closed:
        for ring in (rings[0], rings[-1]):
            for f in ladder_fill(bm, ring):
                for lp in f.loops:
                    lp[uvl].uv = (0.5, 0.5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return mesh_obj(name, bm, mat)


def catmull(pts, per=4):
    """a smooth run through the points, `per` steps between each two"""
    out = []
    ext = [pts[0]] + list(pts) + [pts[-1]]
    for k in range(1, len(ext) - 2):
        p0, p1, p2, p3 = (np.array(ext[k + q]) for q in (-1, 0, 1, 2))
        for q in range(per):
            t = q / per
            out.append(tuple(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3)))
    out.append(tuple(pts[-1]))
    return out


mask_plate()
mask_nose()
mask_teeth()
# (the cord's posts (折釘) on the cheeks: out from the face and turned down, gilt; the cord hooked over them)
POST_ST = (0.11, 0.6)
for sd in (-1, 1):
    s_ = 0.5 + sd * (0.5 - POST_ST[0])
    base, nrm = face_pt(s_, POST_ST[1])
    a = base
    b = tuple(base[q] + nrm[q] * 0.011 for q in range(3))
    c = (b[0] + nrm[0] * 0.002, b[1] - 0.008, b[2] + nrm[2] * 0.002)
    tube(f"KabutoOrikugi{sd}", [tuple(a[q] - nrm[q] * 0.002 for q in range(3)), b, c], 0.0028, 6, M["gold"], v_per=0.05)
# (the guard (垂) from the jaw over the throat: two lames of the neck guard's laced black, each stepping out and down from behind the one
# over it; the jaw's edge their top, hidden behind it)
G_N = 10
for k, (drop, flare, tuck) in enumerate(((0.022, 0.004, -0.0045), (0.022, 0.005, -0.003))):
    def lame(s, t, k=k, drop=drop, flare=flare, tuck=tuck):
        ss = 0.5 + (s - 0.5) * 0.82
        top, nrm = face_pt(ss, 1.0, tuck)
        y0 = top[1] + 0.004 - k * 0.019
        return (top[0] + nrm[0] * flare * t, y0 - drop * t, top[2] + nrm[2] * flare * t)
    sheet(f"KabutoYodare{k}", G_N, 1, lame, M["lace"], thick=0.003, uv_scale=(0.45, 1.0))
# (the dark of the helmet's inside behind the eyes' gap: its stand's red post and arm not seen through it)
def inside_shade():
    bm = bmesh.new()
    rows = [[bm.verts.new(P(0.066 * math.sin((i / 8 - 0.5) * 2.6), y, ZC - 0.070 * math.cos((i / 8 - 0.5) * 2.6))) for i in range(9)]
            for y in (0.134, 0.206)]
    for i in range(8):
        bm.faces.new((rows[0][i], rows[0][i + 1], rows[1][i + 1], rows[1][i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if sum(f.normal.y for f in bm.faces) < 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces)
    return mesh_obj("KabutoInsideShade", bm, M["dark"])


inside_shade()
# (the cord: from inside the helmet's side behind the cheek, down over the post (round it and on), along under the jaw to the front; tied
# there in a bow in front of the guard, two loops out and two ends hanging)
s_post = POST_ST[0]
knot = face_pt(0.5, 1.0, 0.012)[0]
knot = (0.0, knot[1] - 0.004, knot[2] - 0.004)
for sd in (-1, 1):
    side_s = lambda s: 0.5 + sd * (0.5 - s)
    p_cheek = face_pt(side_s(0.03), 0.28, 0.004)[0]
    p_hook0 = face_pt(side_s(s_post - 0.005), POST_ST[1] - 0.06, 0.012)[0]
    p_hook1 = face_pt(side_s(s_post + 0.01), POST_ST[1] + 0.07, 0.01)[0]
    p_jaw = face_pt(side_s(0.3), 1.0, 0.012)[0]
    p_jaw = (p_jaw[0], p_jaw[1] - 0.004, p_jaw[2])
    path = [(sd * 0.088, 0.174, 0.004), p_cheek, p_hook0, p_hook1, p_jaw, (sd * 0.012, knot[1], knot[2])]
    # (four round: 6 mm across, five showed no rounder from where it's seen, 1.8 m and more)
    tube(f"KabutoCord{sd}", catmull(path, 3), 0.003, 4, M["cord"])
    # (its loop of the bow, out to this side and back, and its end hanging)
    loop = [(sd * 0.006, knot[1], knot[2]), (sd * 0.02, knot[1] + 0.009, knot[2] - 0.005), (sd * 0.031, knot[1] + 0.002, knot[2] - 0.007),
            (sd * 0.022, knot[1] - 0.006, knot[2] - 0.005)]
    tube(f"KabutoCordLoop{sd}", catmull(loop + [loop[0]], 2)[:-1], 0.0026, 4, M["cord"], closed=True)
    tail = [(sd * 0.005, knot[1] - 0.003, knot[2] - 0.002), (sd * 0.011, knot[1] - 0.018, knot[2] - 0.004), (sd * 0.015, knot[1] - 0.032, knot[2] - 0.003)]
    tube(f"KabutoCordEnd{sd}", catmull(tail, 2), 0.0026, 4, M["cord"])
# (the knot itself: a short wrap across, its ends open where the loops run into it)
tube("KabutoKnot", [(-0.009, knot[1], knot[2] - 0.001), (0.0, knot[1] + 0.0008, knot[2] - 0.0035), (0.009, knot[1], knot[2] - 0.001)], 0.0056, 6,
     M["cord"], v_per=0.04)

# =====================================================================
# The stand: red lacquer, a post up into the bowl on two boards crossed
# =====================================================================
box("KabutoStandBoard0", 0.22, 0.03, 0.05, (0, 0.015, 0), M["stand"])
box("KabutoStandBoard1", 0.05, 0.03, 0.2, (0, 0.016, 0), M["stand"])
box("KabutoStandPost", 0.045, B0 + 0.02, 0.03, (0, (B0 + 0.02) / 2 + 0.03, 0), M["stand"])
# (its arm across under the mask's mouth, behind the face, 11 cm (item 900): at the eyes' height its red ends showed either side of the dark
# there, and 14 cm across they showed past the cheeks)
box("KabutoStandArm", 0.11, 0.025, 0.03, (0, B0 - 0.085, 0), M["stand"])

root = bpy.data.objects.new("Kabuto", None)
bpy.context.collection.objects.link(root)
for o in parts:
    o.parent = root
if PREVIEW:
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    bpy.context.collection.objects.link(cam)
    from mathutils import Vector
    cam.location = (0.3, 0.75, 0.4)
    cam.rotation_euler = (Vector((0, 0, 0.2)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    cam.data.lens = 50
    bpy.context.scene.camera = cam
    for loc, e in (((0.6, 1, 1.2), 200), ((-1, 0.4, 0.5), 80)):
        Lt = bpy.data.objects.new("L", bpy.data.lights.new("L", "AREA"))
        Lt.data.energy = e; Lt.data.size = 1
        Lt.location = loc
        Lt.rotation_euler = (Vector((0, 0, 0.2)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
        bpy.context.collection.objects.link(Lt)
    w = bpy.data.worlds.new("w"); w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.4, 0.4, 0.42, 1)
    bpy.context.scene.world = w
os.makedirs(os.path.join(PROJECT, "public", "models"), exist_ok=True)
export_dish(root, parts + [root], os.path.join(PROJECT, "public", "models", "kabuto.glb"), os.path.join(PROJECT, "blender", "kabuto.blend"), PREVIEW)
print("KABUTO_DONE", len(parts), "parts", sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in parts), "tris")
