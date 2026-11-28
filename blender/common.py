"""Shared helpers for the GrilledFishBusiness dish scripts: procedural textures, materials and mesh utilities.

Import from a dish script run with `blender -b --python blender/<dish>.py`:
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from common import *
"""
import math
import random

import bmesh
import bpy
import numpy as np

rng = np.random.default_rng(11)


def seed(n):
    global rng
    random.seed(n)
    rng = np.random.default_rng(n)


# =====================================================================
# Procedural textures (numpy -> packed images, exported into the .glb)
# =====================================================================

def vnoise(size, cx, cy):
    """Tileable value noise with cx x cy cells."""
    g = rng.random((cy, cx)).astype(np.float32)
    ux = np.arange(size) * cx / size
    uy = np.arange(size) * cy / size
    ix0, iy0 = ux.astype(int), uy.astype(int)
    fx, fy = ux - ix0, uy - iy0
    ix1, iy1 = (ix0 + 1) % cx, (iy0 + 1) % cy
    fx = (fx * fx * (3 - 2 * fx))[None, :]
    fy = (fy * fy * (3 - 2 * fy))[:, None]
    a, b = g[np.ix_(iy0, ix0)], g[np.ix_(iy0, ix1)]
    c, d = g[np.ix_(iy1, ix0)], g[np.ix_(iy1, ix1)]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def fbm(size, cx=4, cy=4, octaves=5):
    out = np.zeros((size, size), np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        mx, my = cx * 2 ** o, cy * 2 ** o
        if mx > size or my > size:
            break
        out += amp * vnoise(size, mx, my)
        tot += amp
        amp *= 0.5
    out /= tot
    return (out - out.min()) / (out.max() - out.min() + 1e-6)


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def mix(c1, c2, m):
    c1 = np.broadcast_to(np.asarray(c1, np.float32), m.shape + (3,)) if np.ndim(c1) == 1 else c1
    c2 = np.broadcast_to(np.asarray(c2, np.float32), m.shape + (3,)) if np.ndim(c2) == 1 else c2
    return c1 * (1 - m[..., None]) + c2 * m[..., None]


def to_normal(h, strength):
    gx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * strength
    gy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * strength
    n = np.stack([-gx, -gy, np.ones_like(h)], -1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    return n * 0.5 + 0.5


def image(name, rgb, data=False, alpha=None):
    """Packed image from an (h, w, 3) array; pass an (h, w) `alpha` for a transparent texture."""
    h, w = rgb.shape[:2]
    a = np.ones((h, w, 1), np.float32) if alpha is None else np.clip(alpha, 0, 1)[..., None]
    rgba = np.concatenate([np.clip(rgb, 0, 1), a], -1).astype(np.float32)
    img = bpy.data.images.new(name, w, h, alpha=alpha is not None)
    if data:
        img.colorspace_settings.name = "Non-Color"
    img.pixels.foreach_set(rgba.ravel())
    img.file_format = "PNG"
    img.pack()
    return img


def grid01(size):
    u = np.tile((np.arange(size) + 0.5) / size, (size, 1))
    return u, u.T.copy()   # u along columns, v along rows (row 0 = bottom)


# ---- the five Edo patterns (item 793, the owner's 「這些花紋可以加入到員工或是客人的衣服上」 with a sheet of them, "Patterns of Edo"; the
# game's own, drawn on a canvas for the mats, are src/scene/props/edoPatterns.ts): 七宝 shippou, the striped blocks, 麻の葉 asanoha, 梅 ume,
# 青海波 seigaiha, painted into a picture
def _line_aa(d, hw):
    """how much of a line a pixel `d` from its middle is, the line `hw` either side of it: soft over a pixel"""
    return np.clip(hw + 0.5 - d, 0.0, 1.0)


def _seg_dist(px, py, ax, ay, bx, by):
    """each pixel's distance to the segment from a to b"""
    vx, vy = bx - ax, by - ay
    t = np.clip(((px - ax) * vx + (py - ay) * vy) / np.maximum(vx * vx + vy * vy, 1e-9), 0, 1)
    return np.hypot(px - (ax + t * vx), py - (ay + t * vy))


def edo_pattern(kind, w, h, unit, bg, line, flower=None, lw=None, aspect=1.0, rings=4, stripes=4):
    """one of the five on a (h, w) picture (row 0 at its foot, as image() takes it): `unit` a repeat's width (px), fitted so a whole number
    go across w (and down h, where it repeats down too), `aspect` how many pixels down make one across (a picture stretched where it's laid:
    a folk's outfit 1.19), `bg` the ground, `line` the lines' colour, `lw` their half width (px), `flower` the flowers' (shippou's four petals,
    ume's plum); the colours as painted (sRGB 0..1), or factors over 1 to lay over another picture. Returns (h, w, 3) float32."""
    X = np.tile(np.arange(w, dtype=np.float32) + 0.5, (h, 1))
    Y = np.tile((np.arange(h, dtype=np.float32) + 0.5)[:, None], (1, w)) / aspect
    H = h / aspect
    bg, line = np.asarray(bg, np.float32), np.asarray(line, np.float32)
    flower = line if flower is None else np.asarray(flower, np.float32)
    lw = max(0.6, unit / 40) if lw is None else lw
    out = np.broadcast_to(bg, (h, w, 3)).copy()

    def paint(mask, col):
        m = np.clip(mask, 0, 1)[..., None]
        out[:] = out * (1 - m) + col * m

    if kind == "shippou":
        # (rings on a square grid, each over its four neighbours by a quarter of its round; a four-petalled flower in each, a dot where four meet)
        a = w / max(1, round(w / unit))
        b = H / max(1, round(H / unit))
        r = math.hypot(a, b) / 2
        ix, iy = np.floor(X / a), np.floor(Y / b)
        d = np.full(X.shape, 1e9, np.float32)
        for ox in (0, 1):
            for oy in (0, 1):
                d = np.minimum(d, np.abs(np.hypot(X - (ix + ox) * a, Y - (iy + oy) * b) - r))
        paint(_line_aa(d, lw), line)
        px, py = X - np.round(X / a) * a, Y - np.round(Y / b) * b
        bloom = np.zeros_like(X)
        for k in range(4):
            t = math.pi / 4 + k * math.pi / 2
            qx, qy = px - math.cos(t) * 0.17 * r, py - math.sin(t) * 0.17 * r
            along, across = qx * math.cos(t) + qy * math.sin(t), -qx * math.sin(t) + qy * math.cos(t)
            bloom = np.maximum(bloom, np.clip((1 - np.hypot(along / (0.15 * r), across / (0.123 * r))) * 0.15 * r + 0.5, 0, 1))
        bloom = np.maximum(bloom, np.clip(0.07 * r + 0.5 - np.hypot(X - (ix + 0.5) * a, Y - (iy + 0.5) * b), 0, 1))
        paint(bloom, flower)
    elif kind == "seigaiha":
        # (rows of fans of rings, each half a fan over from the last and a quarter of a fan down, the lower in front)
        u = w / max(1, round(w / unit))
        R = u / 2
        rows = 2 * max(1, round(H / R))
        rh = H / rows
        dist = np.full(X.shape, np.inf, np.float32)
        j0 = np.floor(Y / rh)
        for dj in range(-2, 4):
            j = j0 + dj
            off = np.mod(j, 2) * R
            cx = np.round((X - off) / u) * u + off
            dd = np.hypot(X - cx, Y - j * rh)
            dist = np.where(np.isinf(dist) & (dd < R), dd, dist)
        for k in range(rings):
            rr = R * (1 - k / rings) - lw
            if rr > lw:
                paint(_line_aa(np.abs(dist - rr), lw), line)
    elif kind == "asanoha":
        # (a grid of equal triangles, their sides and each one's corners to its middle: the hemp leaf's stars round every point of it)
        s = w / max(1, round(w / unit))
        rows = 2 * max(1, round(H / (s * math.sqrt(3))))
        hh = H / rows
        b = Y / hh
        a = X / s - b / 2
        ia, ib = np.floor(a), np.floor(b)
        up = (a - ia) + (b - ib) < 1

        def at(A, B):
            return (A + B / 2) * s, B * hh
        p0 = at(np.where(up, ia, ia + 1), ib)
        p1 = at(ia + 1, np.where(up, ib, ib + 1))
        p2 = at(ia, ib + 1)
        gx, gy = (p0[0] + p1[0] + p2[0]) / 3, (p0[1] + p1[1] + p2[1]) / 3
        d = np.minimum.reduce([_seg_dist(X, Y, *p0, *p1), _seg_dist(X, Y, *p1, *p2), _seg_dist(X, Y, *p2, *p0),
                               _seg_dist(X, Y, *p0, gx, gy), _seg_dist(X, Y, *p1, gx, gy), _seg_dist(X, Y, *p2, gx, gy)])
        paint(_line_aa(d, lw), line)
    elif kind == "ume":
        # (five-petalled plum blossoms in columns, each column half a step down from the next, dotted lines between the columns)
        a = w / max(1, round(w / unit))
        b = H / max(1, round(H / unit))
        lx = np.mod(X, a / 2)
        lx = np.minimum(lx, a / 2 - lx)
        ly = (np.mod(Y / (b / 12), 1.0) - 0.5) * (b / 12)
        paint(np.clip(lw * 0.7 + 0.5 - np.hypot(lx, ly), 0, 1), line)
        pr, pd = 0.085 * a, 0.088 * a
        for (f0, g0) in ((0.25, 0.25), (0.75, 0.75)):
            px = X - (np.floor(X / a - f0 + 0.5) + f0) * a
            py = Y - (np.floor(Y / b - g0 + 0.5) + g0) * b
            pet = np.zeros_like(X)
            for k in range(5):
                t = math.pi / 2 + k * 2 * math.pi / 5
                pet = np.maximum(pet, np.clip(pr + 0.5 - np.hypot(px - math.cos(t) * pd, py - math.sin(t) * pd), 0, 1))
            paint(pet, flower)
            heart = np.clip(0.028 * a + 0.5 - np.hypot(px, py), 0, 1)
            for k in range(5):
                t = math.pi / 2 + math.pi / 5 + k * 2 * math.pi / 5
                heart = np.maximum(heart, np.clip(0.009 * a + 0.5 - np.hypot(px - math.cos(t) * 0.05 * a, py - math.sin(t) * 0.05 * a), 0, 1))
            paint(heart, bg)
    elif kind == "blocks":
        # (a honeycomb of upright hexagons, each three rhombi round its middle (a block seen from a corner), each filled with lines along one
        # of its sides, the three each their own way round)
        sx = w / max(1, round(w / unit))
        rows = 2 * max(1, round(H / (sx / math.sqrt(3) * 1.5)))
        sy = H / rows
        hy = sy / 1.5
        best = np.full(X.shape, np.inf, np.float32)
        cxs, cys = np.zeros_like(X), np.zeros_like(X)
        j0 = np.round(Y / sy)
        for dj in (-1, 0, 1):
            j = j0 + dj
            off = np.mod(j, 2) * sx / 2
            cx = np.round((X - off) / sx) * sx + off
            cy = j * sy
            dd = np.hypot(X - cx, Y - cy)
            take = dd < best
            best, cxs, cys = np.where(take, dd, best), np.where(take, cx, cxs), np.where(take, cy, cys)
        px, py = X - cxs, Y - cys
        UL, UR, BT = (-sx / 2, hy / 2), (sx / 2, hy / 2), (0.0, -hy)
        d = np.full(X.shape, np.inf, np.float32)
        for (U_, V_, along) in ((UL, UR, "u"), (UL, BT, "v"), (UR, BT, "u")):
            det = U_[0] * V_[1] - U_[1] * V_[0]
            al = (px * V_[1] - py * V_[0]) / det
            be = (U_[0] * py - U_[1] * px) / det
            inside = (al >= -1e-4) & (al <= 1 + 1e-4) & (be >= -1e-4) & (be <= 1 + 1e-4)
            t, e = (be, al) if along == "u" else (al, be)
            tn = t * stripes - 0.5
            k = np.round(tn)
            dl = np.abs(tn - k) / stripes * abs(det) / math.hypot(*(U_ if along == "u" else V_))
            ok = inside & (e > 0.08) & (e < 0.92) & (k >= 0) & (k <= stripes - 1)
            d = np.where(ok, np.minimum(d, dl), d)
        paint(_line_aa(d, lw), line)
    else:
        raise ValueError(kind)
    return out.astype(np.float32)


def oil_broth(size, base_dark, base_light, oil_color, droplets=170):
    """Broth surface with floating oil droplets; returns (color, height)."""
    base = mix(base_dark, base_light, fbm(size, 3, 3))
    oil = np.zeros((size, size), np.float32)
    height = np.zeros((size, size), np.float32)
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32)
    for _ in range(droplets):
        r = rng.uniform(2.5, 12)
        cx, cy = rng.uniform(0, size, 2)
        x0, x1 = int(max(0, cx - r - 2)), int(min(size, cx + r + 2))
        y0, y1 = int(max(0, cy - r - 2)), int(min(size, cy + r + 2))
        d = np.sqrt((xx[y0:y1, x0:x1] - cx) ** 2 + (yy[y0:y1, x0:x1] - cy) ** 2)
        m = np.clip((r - d) / 1.3, 0, 1)
        oil[y0:y1, x0:x1] = np.maximum(oil[y0:y1, x0:x1], m)
        height[y0:y1, x0:x1] = np.maximum(height[y0:y1, x0:x1], np.clip(1 - (d / r) ** 2, 0, 1) * min(1, r / 6))
    return mix(base, oil_color, oil * 0.85), height


# =====================================================================
# Materials
# =====================================================================

def pbr(name, color=(1, 1, 1), tex=None, nrm=None, nrm_strength=1.0, rough=0.5, metal=0.0,
        coat=0.0, coat_rough=0.05, emit=None, emit_strength=0.0, emit_tex=None, blend=False):
    m = bpy.data.materials.new(name)
    try:
        m.use_nodes = True
    except AttributeError:
        pass
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]

    def setin(key, val):
        if key in bsdf.inputs:
            bsdf.inputs[key].default_value = val

    setin("Base Color", (*color, 1))
    setin("Roughness", rough)
    setin("Metallic", metal)
    setin("Coat Weight", coat)
    setin("Coat Roughness", coat_rough)
    if emit:
        setin("Emission Color", (*emit, 1))
    if emit or emit_tex:
        setin("Emission Strength", emit_strength)
    if emit_tex:
        n = nt.nodes.new("ShaderNodeTexImage")
        n.image = emit_tex
        nt.links.new(n.outputs["Color"], bsdf.inputs["Emission Color"])
    if tex:
        n = nt.nodes.new("ShaderNodeTexImage")
        n.image = tex
        nt.links.new(n.outputs["Color"], bsdf.inputs["Base Color"])
        if blend:
            # texture alpha drives transparency (exported as glTF alphaMode BLEND)
            nt.links.new(n.outputs["Alpha"], bsdf.inputs["Alpha"])
            for attr, value in (("surface_render_method", "BLENDED"), ("blend_method", "BLEND")):
                try:
                    setattr(m, attr, value)
                except (AttributeError, TypeError):
                    pass
    if nrm:
        n = nt.nodes.new("ShaderNodeTexImage")
        n.image = nrm
        nm = nt.nodes.new("ShaderNodeNormalMap")
        nm.inputs["Strength"].default_value = nrm_strength
        nt.links.new(n.outputs["Color"], nm.inputs["Color"])
        nt.links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
    m.diffuse_color = (*color, 1)
    return m


# =====================================================================
# Mesh helpers
# =====================================================================

def active():
    return bpy.context.view_layer.objects.active


def finish(obj, name, mat, smooth_shade=True):
    obj.name = name
    obj.data.materials.append(mat)
    for p in obj.data.polygons:
        p.use_smooth = smooth_shade
    return obj


def bevel(obj, width, segments=3, angle=True):
    b = obj.modifiers.new("Bevel", "BEVEL")
    b.width = width
    b.segments = segments
    if angle:
        b.limit_method = "ANGLE"
    return b


def chunky_box(name, x0, x1, y0, y1, z0, z1, bw, segs, top_mat, side_mat, bottom=False, uv_scale=0.16):
    """(docs/MODELING.md's 造型感, item 379) a box with its edges well rounded (`bw` wide, `segs` steps; its bottom's left square unless
    `bottom`) and its normals hardened: the flat faces shade flat, the rounds smooth, as a chunky made thing reads. Its top in `top_mat`, its
    sides and rounds in `side_mat`; pictures laid on each face by which way it faces (`uv_scale` metres a picture: u along the side, v up
    it; the top along x and y). Returns the object (linked, the bevel applied); the caller keeps it with its parts."""
    import bmesh
    from mathutils import Matrix
    bm_ = bmesh.new()
    bmesh.ops.create_cube(bm_, size=1.0)
    bmesh.ops.transform(bm_, matrix=Matrix.Translation(((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)) @ Matrix.Diagonal((x1 - x0, y1 - y0, z1 - z0, 1)),
                        verts=bm_.verts)
    for f in bm_.faces:
        f.material_index = 0 if f.normal.z > 0.5 else 1
    wl = bm_.edges.layers.float.get("bevel_weight_edge") or bm_.edges.layers.float.new("bevel_weight_edge")
    for e in bm_.edges:
        e[wl] = 0.0 if (not bottom and all(v.co.z < z0 + 1e-6 for v in e.verts)) else 1.0
    me = bpy.data.meshes.new(name)
    bm_.to_mesh(me)
    bm_.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(top_mat)
    o.data.materials.append(side_mat)
    for pg in o.data.polygons:
        pg.use_smooth = True
    mod = o.modifiers.new("Bevel", "BEVEL")
    mod.width = bw
    mod.segments = segs
    mod.limit_method = "WEIGHT"
    mod.harden_normals = True
    mod.material = 1
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier=mod.name)
    me = o.data
    uvl_ = me.uv_layers.new(name="UVMap") if not me.uv_layers else me.uv_layers[0]
    for pg in me.polygons:
        n = pg.normal
        for li in pg.loop_indices:
            c = me.vertices[me.loops[li].vertex_index].co
            if abs(n.z) > 0.7:
                uvl_.data[li].uv = (c.x / uv_scale, c.y / uv_scale)
            elif abs(n.y) >= abs(n.x):
                uvl_.data[li].uv = ((c.x if n.y < 0 else -c.x) / uv_scale, c.z / uv_scale)
            else:
                uvl_.data[li].uv = ((-c.y if n.x < 0 else c.y) / uv_scale, c.z / uv_scale)
    return o


def apply_scale(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)


def cyl_uv(obj):
    """Cylindrical UVs around local Z (u = angle, v = height)."""
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    uv = bm.loops.layers.uv.verify()
    zs = [v.co.z for v in bm.verts]
    z0, z1 = min(zs), max(zs)
    for f in bm.faces:
        us = [(math.atan2(l.vert.co.y, l.vert.co.x) / (2 * math.pi)) % 1 for l in f.loops]
        if max(us) - min(us) > 0.5:
            us = [x + 1 if x < 0.5 else x for x in us]
        for l, x in zip(f.loops, us):
            l[uv].uv = (x, (l.vert.co.z - z0) / (z1 - z0 + 1e-6))
    bm.to_mesh(obj.data)
    bm.free()


def join(objs, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = active()
    o.name = name
    return o


def leaf(x, y, z, rot, length, width, mat, name, cup=0.05, thickness=0.006):
    """Tapered, ruffled leaf on a grid; u runs stem -> tip."""
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=18, y_subdivisions=10, size=1, location=(x, y, z),
                                    rotation=(0, 0, rot))
    o = active()
    bm = bmesh.new()
    bm.from_mesh(o.data)
    for vtx in bm.verts:
        t = vtx.co.x + 0.5
        w = 0.35 + 0.65 * math.sin(math.pi * min(1.0, t * 0.95 + 0.05))
        vtx.co.y *= w
        vtx.co.z = 0.012 * math.sin(t * 14) * math.sin(vtx.co.y * 20) * t - cup * (2 * vtx.co.y) ** 2 + 0.01
        vtx.co.x *= length
        vtx.co.y *= width
    bm.to_mesh(o.data)
    bm.free()
    s = o.modifiers.new("Solidify", "SOLIDIFY")
    s.thickness = thickness
    return finish(o, name, mat)


def ladder_fill(bm, ring):
    """close a ring of verts (in order round it, convex) with a ladder of quads straight across it (each vert joined to the one opposite),
    a triangle at either end: never a fan of triangles into one point (the owner's: those shade in dark blotches, and a cap's N-gon is cut
    into one on export)"""
    n = len(ring)
    faces = [bm.faces.new((ring[0], ring[1], ring[n - 1]))]
    lo, hi = 1, n - 1
    while hi - lo > 2:
        faces.append(bm.faces.new((ring[lo], ring[lo + 1], ring[hi - 1], ring[hi])))
        lo += 1
        hi -= 1
    if hi - lo == 2:
        faces.append(bm.faces.new((ring[lo], ring[lo + 1], ring[hi])))
    return faces


def ladder_ngons(obj):
    """every convex face of more than four sides (a cylinder's cap, a lathe's end) cut into a ladder (ladder_fill), its material, shading
    and UVs kept; a face that isn't convex (a letter's outline) is left as it is. And first, what has no size let go of (item 843: a
    bevel clamped against itself, a frame's corners met in one point, left faces of no area, 16 to a rounded panel, 73 in the till desk:
    scripts/topo-audit.mjs's dead)"""
    if obj.type != "MESH":
        return 0
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.dissolve_degenerate(bm, dist=1e-7, edges=bm.edges[:])
    uv = bm.loops.layers.uv.active
    done = 0
    for f in [f for f in bm.faces if len(f.verts) > 4]:
        vs = [v.co for v in f.verts]
        k = len(vs)
        if any((vs[(i + 1) % k] - vs[i]).cross(vs[(i + 2) % k] - vs[(i + 1) % k]).dot(f.normal) < -1e-12 for i in range(k)):
            continue
        ring = [lp.vert for lp in f.loops]
        uvs = {lp.vert: lp[uv].uv.copy() for lp in f.loops} if uv else None
        mat, smooth = f.material_index, f.smooth
        bm.faces.remove(f)
        for nf in ladder_fill(bm, ring):
            nf.material_index = mat
            nf.smooth = smooth
            if uv:
                for lp in nf.loops:
                    lp[uv].uv = uvs[lp.vert]
        done += 1
    bm.to_mesh(obj.data)
    bm.free()
    return done


def _to_srgb(c):
    """a linear colour (a material's) as the picture's sRGB value"""
    return tuple(1.055 * max(0.0, x) ** (1 / 2.4) - 0.055 if x > 0.0031308 else 12.92 * max(0.0, x) for x in c)


class DecalAtlas:
    """Printing that was letters of mesh (hundreds of triangles a word: the low-poly rule's worst) drawn into one picture instead. Each text
    (or flat mark) object's triangles are filled into its own corner of the atlas in its material's colour, the object let go, and a quad of
    two triangles laid in its place, a hair proud of its plane, showing it. add() each (it hands back the quad, named as the object was, to be
    moved and parented as it would have been); finish() once, after them all, packs the corners into the picture, paints them and gives every
    quad the atlas's material (`name`, its alpha the letters'). `size` is the picture's side, or its (width, height)."""

    def __init__(self, name, ppm=3000, size=1024, rough=0.8):
        self.name, self.ppm, self.size, self.rough = name, ppm, size, rough
        self.items = []

    def add(self, obj, pad=0.0015, lift=0.0002):
        bpy.context.view_layer.update()
        mats = obj.data.materials
        rgb = _to_srgb(mats[0].diffuse_color[:3]) if len(mats) and mats[0] else (0.0, 0.0, 0.0)
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        bmesh.ops.triangulate(bm, faces=bm.faces[:])
        # (in the object's own frame: its letters lie in its x-y plane)
        tris = [[(lp.vert.co.x, lp.vert.co.y) for lp in f.loops] for f in bm.faces]
        bm.free()
        ss = [p[0] for t in tris for p in t]
        ts = [p[1] for t in tris for p in t]
        s0, s1, t0, t1 = min(ss) - pad, max(ss) + pad, min(ts) - pad, max(ts) + pad
        name, mw = obj.name, obj.matrix_world.copy()
        me_old = obj.data
        bpy.data.objects.remove(obj)
        if me_old.users == 0:
            bpy.data.meshes.remove(me_old)
        me = bpy.data.meshes.new(name)
        me.from_pydata([(s0, t0, lift), (s1, t0, lift), (s1, t1, lift), (s0, t1, lift)], [], [(0, 1, 2, 3)])
        me.update()
        quad = bpy.data.objects.new(name, me)
        bpy.context.collection.objects.link(quad)
        quad.matrix_world = mw
        self.items.append({"quad": quad, "rgb": rgb, "tris": tris, "box": (s0, t0, s1, t1)})
        return quad

    @staticmethod
    def _pack(rects, nw, nh, gap):
        order = sorted(range(len(rects)), key=lambda i: -rects[i][1])
        pos, x, y, row = [None] * len(rects), 0, 0, 0
        for i in order:
            w, h = rects[i]
            if w + 2 * gap > nw:
                return None
            if x + w + 2 * gap > nw:
                x, y, row = 0, y + row, 0
            if y + h + 2 * gap > nh:
                return None
            pos[i] = (x + gap, y + gap)
            x += w + 2 * gap
            row = max(row, h + 2 * gap)
        return pos

    def finish(self):
        NW, NH = self.size if isinstance(self.size, tuple) else (self.size, self.size)
        G, SS = 3, 4
        ppm = self.ppm
        while True:
            rects = [(max(2, math.ceil((it["box"][2] - it["box"][0]) * ppm)), max(2, math.ceil((it["box"][3] - it["box"][1]) * ppm)))
                     for it in self.items]
            pos = self._pack(rects, NW, NH, G)
            if pos:
                break
            ppm *= 0.92
        print("DECAL_ATLAS", self.name, len(self.items), "items at", round(ppm), "px a metre")
        A = np.zeros((NH, NW), np.float32)
        C = np.zeros((NH, NW, 3), np.float32)
        for it, (x, y), (w, h) in zip(self.items, pos, rects):
            s0, t0 = it["box"][0], it["box"][1]
            m = np.zeros((h * SS, w * SS), np.float32)
            yy, xx = np.mgrid[0:h * SS, 0:w * SS].astype(np.float32) + 0.5
            k = ppm * SS
            for tri in it["tris"]:
                q = [((s - s0) * k, (t - t0) * k) for s, t in tri]
                x0, x1 = int(max(0, min(p[0] for p in q) - 1)), int(min(w * SS, max(p[0] for p in q) + 2))
                y0, y1 = int(max(0, min(p[1] for p in q) - 1)), int(min(h * SS, max(p[1] for p in q) + 2))
                if x1 <= x0 or y1 <= y0:
                    continue
                X, Y = xx[y0:y1, x0:x1], yy[y0:y1, x0:x1]
                (ax, ay), (bx, by), (cx, cy) = q
                d1 = (bx - ax) * (Y - ay) - (by - ay) * (X - ax)
                d2 = (cx - bx) * (Y - by) - (cy - by) * (X - bx)
                d3 = (ax - cx) * (Y - cy) - (ay - cy) * (X - cx)
                inside = ((d1 >= 0) & (d2 >= 0) & (d3 >= 0)) | ((d1 <= 0) & (d2 <= 0) & (d3 <= 0))
                m[y0:y1, x0:x1] = np.maximum(m[y0:y1, x0:x1], inside.astype(np.float32))
            A[y:y + h, x:x + w] = m.reshape(h, SS, w, SS).mean(axis=(1, 3))
            # (its colour over its whole corner and the gutter round it, so filtering at the letters' rims never pulls in another's)
            C[max(0, y - G):y + h + G, max(0, x - G):x + w + G] = it["rgb"]
        mat = pbr(self.name, (1, 1, 1), tex=image(self.name, C, alpha=A), rough=self.rough, blend=True)
        for it, (x, y), (w, h) in zip(self.items, pos, rects):
            s0, t0, s1, t1 = it["box"]
            u0, v0 = x / NW, y / NH
            u1, v1 = (x + (s1 - s0) * ppm) / NW, (y + (t1 - t0) * ppm) / NH
            me = it["quad"].data
            uvl = me.uv_layers.new()
            for li, uv in zip(me.polygons[0].loop_indices, ((u0, v0), (u1, v0), (u1, v1), (u0, v1))):
                uvl.data[li].uv = uv
            me.materials.append(mat)
        return mat


def export_dish(root, parts, glb_path, blend_path, preview=None, ladder=True):
    """Optionally render a preview, export the dish (root + parts) to GLB and save the .blend. Every part's convex N-gons (caps) are cut
    into ladders first (`ladder`: ladder_ngons), so none comes out a fan."""
    if ladder:
        n = sum(ladder_ngons(o) for o in parts if getattr(o, "type", None) == "MESH")
        if n:
            print("LADDERED_NGONS", n)
    # (a part's own colours in its points (a bmesh's "Col" layer) made its mesh's active and default colour, so they go out as COLOR_0, the
    # set the game reads: left as they were, the exporter wrote a white COLOR_0 of its own and the colours as COLOR_1, which nothing reads
    # (item 443: the stone steps' tints and moss, the liquor's glass, all white))
    for o in parts:
        me = getattr(o, "data", None) if getattr(o, "type", None) == "MESH" else None
        if me is None or not len(me.color_attributes):
            continue
        name = "Col" if "Col" in me.color_attributes else me.color_attributes[0].name
        try:
            me.color_attributes.active_color = me.color_attributes[name]
            me.color_attributes.render_color_index = list(me.color_attributes).index(me.color_attributes[name])
        except (AttributeError, TypeError):
            pass
        try:
            me.attributes.active_color_name = name
            me.attributes.default_color_name = name
        except (AttributeError, TypeError):
            pass
    scene = bpy.context.scene
    if preview:
        for engine in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT"):
            try:
                scene.render.engine = engine
                break
            except TypeError:
                continue
        try:
            scene.view_settings.view_transform = "AgX"
            for look in ("AgX - Punchy", "Punchy"):
                try:
                    scene.view_settings.look = look
                    break
                except TypeError:
                    continue
        except TypeError:
            pass
        scene.render.resolution_x = 1280
        scene.render.resolution_y = 900
        scene.render.filepath = preview
        bpy.ops.render.render(write_still=True)

    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    for o in parts:
        o.select_set(True)
    try:
        bpy.ops.export_scene.gltf(filepath=glb_path, export_format="GLB", use_selection=True, export_apply=True,
                                  export_image_format="WEBP", export_vertex_color="ACTIVE")
    except TypeError:
        bpy.ops.export_scene.gltf(filepath=glb_path, export_format="GLB", use_selection=True, export_apply=True)
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)


# =====================================================================
# One picture an area (docs/BAKING.md, stage B; item 574): the pictures themselves packed, not baked
# =====================================================================

def _mat_picture(m):
    """a material's picture (the image node feeding its base colour) or, without one, its colour (linear)"""
    if m.use_nodes:
        for n in m.node_tree.nodes:
            if n.type == "TEX_IMAGE" and n.image is not None and any(l.to_socket.name == "Base Color" for l in n.outputs["Color"].links):
                return n.image, None
        b = m.node_tree.nodes.get("Principled BSDF")
        if b is not None:
            return None, tuple(b.inputs["Base Color"].default_value[:3])
    return None, tuple(m.diffuse_color[:3])


def _mat_normal(m):
    """a material's normal map (the image node feeding its Normal Map node's colour), or None"""
    if m.use_nodes:
        for n in m.node_tree.nodes:
            if n.type == "NORMAL_MAP":
                for l in n.inputs["Color"].links:
                    if l.from_node.type == "TEX_IMAGE" and l.from_node.image is not None:
                        return l.from_node.image
    return None


def _lanczos_axis(px, n_out, axis, wrap, a=3):
    """one axis of a picture drawn again at n_out samples, through a Lanczos filter (a lobes; widened as it shrinks, so nothing finer than
    the new size aliases); `wrap`: the picture repeats, its far edge running into its near one"""
    n_in = px.shape[axis]
    scale = n_in / n_out
    s = max(1.0, scale)
    xs = (np.arange(n_out) + 0.5) * scale - 0.5
    r = int(math.ceil(a * s))
    idx = np.floor(xs).astype(int)[:, None] + np.arange(-r + 1, r + 1)[None, :]
    t = (idx - xs[:, None]) / s
    w = np.sinc(t) * np.sinc(t / a) * (np.abs(t) < a)
    w = (w / w.sum(1, keepdims=True)).astype(np.float32)
    idx = idx % n_in if wrap else np.clip(idx, 0, n_in - 1)
    g = np.moveaxis(px, axis, 0)[idx]
    return np.moveaxis((g * w.reshape(w.shape + (1,) * (g.ndim - 2))).sum(1), 0, axis)


def _resample(px, w, h, wrap):
    """a picture (h, w, 4) drawn again at w by h, through a Lanczos filter (item 574: a bilinear one, shrinking the brocade's weave by 3 %,
    took four tenths of its fine detail away, and the book's cover was seen blurred; this keeps eight); as it is when it's that size already"""
    if px.shape[0] == h and px.shape[1] == w:
        return px.astype(np.float32)
    return np.clip(_lanczos_axis(_lanczos_axis(px, h, 0, wrap), w, 1, wrap), 0, 1).astype(np.float32)


_REP_EPS = 1e-5   # (how near a whole number a UV counts as on it: UVs are kept in single precision)


def _crosses(vals):
    """whether these UVs (along u, or v) run over a whole number, from one repeat of a picture into the next"""
    return math.floor(min(vals) + _REP_EPS) != math.floor(max(vals) - _REP_EPS)


def _split_at_repeats(bm, uvl, faces):
    """the faces cut where their pictures repeat (u or v crossing a whole number), so each lies within one repeat: cut along that line
    across the face, again till none crosses one. The edges the line crosses are split where it meets them (their corners' UVs drawn between);
    a corner already on the line (a face as wide as the whole roof, its middle on 0) is used as it is. A face the line meets more than twice
    (its outline hollow in the picture) is cut in triangles first, each then cut as any other"""
    made = 0
    work = [f for f in faces if f.is_valid]
    while work:
        f = work.pop()
        if not f.is_valid:
            continue
        for axis in (0, 1):
            vals = [lp[uvl].uv[axis] for lp in f.loops]
            if _crosses(vals):
                k = math.floor(min(vals) + _REP_EPS) + 1
                break
        else:
            continue
        for e, v0, t in [(lp.edge, lp.vert, a / (a - b_)) for lp in f.loops
                         for a, b_ in [(lp[uvl].uv[axis] - k, lp.link_loop_next[uvl].uv[axis] - k)]
                         if (a < -_REP_EPS and b_ > _REP_EPS) or (a > _REP_EPS and b_ < -_REP_EPS)]:
            bmesh.utils.edge_split(e, v0, t)
        on = [lp for lp in f.loops if abs(lp[uvl].uv[axis] - k) <= _REP_EPS]
        res = None
        if len(on) == 2 and on[0].link_loop_next is not on[1] and on[1].link_loop_next is not on[0]:
            try:
                res = bmesh.utils.face_split(f, on[0].vert, on[1].vert)
            except ValueError:
                res = None
        if res is not None:
            made += 1
            work += [f, res[0]]
        elif len(f.verts) > 3:
            made += 1
            work += bmesh.ops.triangulate(bm, faces=[f], quad_method="BEAUTY", ngon_method="BEAUTY")["faces"]
        # (a triangle that can't be cut is left, and named as one out of its cell)
    return made


def slot_atlas(name, objects, width, height, skip=lambda m: False, cell=512, pad=8, rough=0.6, normals=None):
    """(docs/BAKING.md, stage B) the pieces of an area that never move given a few pictures, each a material of its own (pages: `name`,
    `name`2, ...; the game merges what shares a material, so a page is a draw), the materials' own pictures packed whole into them: a picture
    bigger than a cell's inside (`cell` less `pad` each side) shrunk into a cell of its own (or a row of them) through a Lanczos filter; a
    smaller one kept as it is, a few to a cell on shelves, with the plain colours' swatches; each inside a border of `pad` pixels drawn on
    from its far edges if it repeats, from its own edges if not, so neither the bilinear filter nor the first mipmaps reach the next. A page
    is at most `width` by `height`, cut down to the smallest power of two that holds what's on it. Each face's UVs moved by whole repeats
    (nothing changes on it) into its picture's place, after each piece's faces of a repeating picture are moved together (so its grain runs
    on across them) to where the fewest of them cross a repeat, and those that still do cut there (a picture drawn once, not repeating, is
    never moved). Every face is checked to lie within its place, and the build stops if one doesn't. Not baked: as sharp as the pictures were
    (the shrunk ones nearly), a few faces more (only the ones longer than a repeat). Materials for which `skip` is true are left as they are.
    `normals` (item 774: the stone steps' granite and pebble-wash have theirs), if given, a page of normals beside each of colours, laid out
    the same: each picture's material's normal map in its place (a flat normal where it has none), its strength there `normals[material's
    name]` (default 1: the game's, drawn in; the page's own is 1). Returns the pages' materials, and how many faces were cut"""
    objs, seen = [], set()
    for o in objects:
        if o.type == "MESH" and len(o.data.polygons):
            # (a mesh two pieces share is worked on once: its UVs moved twice would be moved wrong)
            if o.data.users > 1 and o.data in seen:
                o.data = o.data.copy()
            seen.add(o.data)
            objs.append(o)
    # ---- what's to be packed: each material's picture, or its colour
    mats = []
    for o in objs:
        for m in o.data.materials:
            if m is not None and not skip(m) and m not in mats:
                mats.append(m)
    pictures, colours = {}, {}
    for m in mats:
        img, col = _mat_picture(m)
        if img is not None:
            pictures.setdefault(img, []).append(m)
        else:
            colours[m] = col
    # ---- which pictures repeat: any face wearing one runs past its edge (the woods, the bark); the others (the silk's stripes) are drawn
    # once, and are never moved
    tiled = {img: False for img in pictures}
    for o in objs:
        me = o.data
        if not me.uv_layers:
            me.uv_layers.new()
        uv = me.uv_layers.active.data
        for pl in me.polygons:
            img = _mat_picture(me.materials[pl.material_index])[0] if me.materials[pl.material_index] in mats else None
            if img is not None and not tiled[img]:
                tiled[img] = any(not (-1e-4 <= uv[li].uv[0] <= 1 + 1e-4 and -1e-4 <= uv[li].uv[1] <= 1 + 1e-4) for li in pl.loop_indices)
    # ---- each piece's faces of each repeating picture moved together (the grain runs on across them as it did) to where the fewest of them
    # cross a repeat
    cut = 0
    for o in objs:
        me = o.data
        uv = me.uv_layers.active.data
        by_img = {}
        for pl in me.polygons:
            m = me.materials[pl.material_index]
            img = _mat_picture(m)[0] if m in mats else None
            if img is not None and tiled[img]:
                by_img.setdefault(img, []).append(pl)
        for img, polys in by_img.items():
            spans = [([uv[li].uv[0] for li in pl.loop_indices], [uv[li].uv[1] for li in pl.loop_indices]) for pl in polys]
            spans = [(min(us), max(us), min(vs), max(vs)) for us, vs in spans]
            best, at = None, (0.0, 0.0)
            for du in [i / 16 for i in range(16)]:
                for dv in [i / 16 for i in range(16)]:
                    n = sum(1 for u0, u1, v0, v1 in spans
                            if math.floor(u0 + du + _REP_EPS) != math.floor(u1 + du - _REP_EPS) or math.floor(v0 + dv + _REP_EPS) != math.floor(v1 + dv - _REP_EPS))
                    if best is None or n < best:
                        best, at = n, (du, dv)
                    if best == 0:
                        break
                if best == 0:
                    break
            for pl in polys:
                for li in pl.loop_indices:
                    uv[li].uv = (uv[li].uv[0] + at[0], uv[li].uv[1] + at[1])
        # ---- and those still crossing one cut where they do
        bm = bmesh.new()
        bm.from_mesh(me)
        uvl = bm.loops.layers.uv.active
        crossing = []
        for f in bm.faces:
            m = me.materials[f.material_index]
            img = _mat_picture(m)[0] if m in mats else None
            if img is not None and tiled[img] and (_crosses([lp[uvl].uv[0] for lp in f.loops]) or _crosses([lp[uvl].uv[1] for lp in f.loops])):
                crossing.append(f)
        if crossing:
            cut += _split_at_repeats(bm, uvl, crossing)
            bm.to_mesh(me)
        bm.free()
    # ---- where each goes: pages of cells; the small pictures and the swatches first, on shelves in cells of their own, then the big pictures
    # a cell (or a row of cells) each, the largest first
    cols_n, rows_n = width // cell, height // cell
    inner = cell - 2 * pad
    pages = []

    def take(nc):
        """nc cells side by side, on the first page with room: (page, x, y)"""
        for pi in range(len(pages) + 1):
            if pi == len(pages):
                pages.append(set())
            for r in range(rows_n):
                for c in range(cols_n - nc + 1):
                    if all((c + j, r) not in pages[pi] for j in range(nc)):
                        pages[pi].update((c + j, r) for j in range(nc))
                        return pi, c * cell, r * cell
        raise RuntimeError(f"slot_atlas {name}: no room")

    shelf = [None]

    def shelve(fw, fh):
        """a place fw by fh on the shelves, rounded up to 8 px (the first mipmaps' blocks kept within it): (page, x, y)"""
        fw, fh = -(-fw // 8) * 8, -(-fh // 8) * 8
        s = shelf[0]
        if s is not None:
            pi, cx, cy, ux, uy, rh = s
            if ux + fw > cx + cell:
                ux, uy, rh = cx, uy + rh, 0
            if uy + fh <= cy + cell:
                shelf[0] = (pi, cx, cy, ux + fw, uy, max(rh, fh))
                return pi, ux, uy
        pi, cx, cy = take(1)
        shelf[0] = (pi, cx, cy, cx + fw, cy, fh)
        return pi, cx, cy

    place = {}   # (picture: page, x, y, w, h of the picture itself, its border round it)
    big = sorted((i for i in pictures if i.size[0] > inner or i.size[1] > inner), key=lambda i: (-(i.size[0] * i.size[1]), i.name))
    small = sorted((i for i in pictures if i not in big), key=lambda i: (-i.size[1], -i.size[0], i.name))
    for img in small:
        pi, x, y = shelve(img.size[0] + 2 * pad, img.size[1] + 2 * pad)
        place[img] = (pi, x + pad, y + pad, img.size[0], img.size[1])
    SW = 16
    swatch = {}
    for m in colours:
        swatch[m] = shelve(SW, SW)
    for img in big:
        nc = max(1, round(img.size[0] / cell))
        if nc > cols_n or img.size[1] > cell * 1.5:
            raise RuntimeError(f"slot_atlas {name}: {img.name} ({img.size[0]}x{img.size[1]}) is bigger than its cells")
        pi, x, y = take(nc)
        place[img] = (pi, x + pad, y + pad, nc * cell - 2 * pad, inner)
    sizes = [(1 << ((max(c for c, _ in used) + 1) * cell - 1).bit_length(), 1 << ((max(r for _, r in used) + 1) * cell - 1).bit_length())
             for used in pages]
    # ---- the pages' pictures
    pix = []
    for pw, ph in sizes:
        a = np.zeros((ph, pw, 4), np.float32)
        a[..., 3] = 1.0
        pix.append(a)
    for img, (pi, x0, y0, w_, h_) in place.items():
        rep = tiled[img]
        pic = _resample(np.array(img.pixels[:], np.float32).reshape(img.size[1], img.size[0], 4), w_, h_, rep)
        ys = np.arange(-pad, h_ + pad)
        xs = np.arange(-pad, w_ + pad)
        ys = ys % h_ if rep else np.clip(ys, 0, h_ - 1)
        xs = xs % w_ if rep else np.clip(xs, 0, w_ - 1)
        pix[pi][y0 - pad:y0 + h_ + pad, x0 - pad:x0 + w_ + pad] = pic[ys][:, xs]
    for m, (pi, x0, y0) in swatch.items():
        # (the materials' colours are linear, the pictures sRGB, as the pictures packed into them are: the roof's edge, written as it was,
        # came out near black)
        c = np.clip(np.asarray(colours[m], np.float32), 0, 1)
        pix[pi][y0:y0 + SW, x0:x0 + SW, :3] = np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055)
    # ---- (item 774) and their normals, the same places: each drawn at its slot's size as its colour was, its tilt times its strength,
    # made a unit again; flat where there's none
    npix = None
    if normals is not None:
        npix = []
        for pw, ph in sizes:
            a = np.zeros((ph, pw, 4), np.float32)
            a[...] = (0.5, 0.5, 1.0, 1.0)
            npix.append(a)
        for img, (pi, x0, y0, w_, h_) in place.items():
            m0 = pictures[img][0]
            nimg = _mat_normal(m0)
            if nimg is None:
                continue
            rep = tiled[img]
            pic = _resample(np.array(nimg.pixels[:], np.float32).reshape(nimg.size[1], nimg.size[0], 4), w_, h_, rep)
            n = pic[..., :3] * 2 - 1
            k = normals.get(m0.name, 1.0)
            n[..., :2] *= k
            n /= np.maximum(1e-6, np.linalg.norm(n, axis=-1, keepdims=True))
            pic[..., :3] = n * 0.5 + 0.5
            ys = np.arange(-pad, h_ + pad)
            xs = np.arange(-pad, w_ + pad)
            ys = ys % h_ if rep else np.clip(ys, 0, h_ - 1)
            xs = xs % w_ if rep else np.clip(xs, 0, w_ - 1)
            npix[pi][y0 - pad:y0 + h_ + pad, x0 - pad:x0 + w_ + pad] = pic[ys][:, xs]
    out = []
    for pi, (pw, ph) in enumerate(sizes):
        nm = name if pi == 0 else f"{name}{pi + 1}"
        im = bpy.data.images.new(nm + "Color", pw, ph)
        im.pixels.foreach_set(pix[pi].ravel())
        im.pack()
        if npix is None:
            out.append(pbr(nm, (1, 1, 1), tex=im, rough=rough))
            continue
        nim = bpy.data.images.new(nm + "Normal", pw, ph)
        nim.colorspace_settings.name = "Non-Color"
        nim.pixels.foreach_set(npix[pi].ravel())
        nim.pack()
        out.append(pbr(nm, (1, 1, 1), tex=im, nrm=nim, nrm_strength=1.0, rough=rough))
    # ---- each face's UVs into its place, and its page's material
    spill = []
    for o in objs:
        me = o.data
        uv = me.uv_layers.active.data
        page_of = {}
        for pl in me.polygons:
            m = me.materials[pl.material_index]
            if m not in mats:
                continue
            if m in swatch:
                pi, sx, sy = swatch[m]
                pw, ph = sizes[pi]
                for li in pl.loop_indices:
                    uv[li].uv = ((sx + SW / 2) / pw, (sy + SW / 2) / ph)
                page_of[pl.index] = pi
                continue
            img = _mat_picture(m)[0]
            pi, x0, y0, w_, h_ = place[img]
            pw, ph = sizes[pi]
            us = [uv[li].uv[0] for li in pl.loop_indices]
            vs = [uv[li].uv[1] for li in pl.loop_indices]
            ku = math.floor(min(us) + _REP_EPS) if tiled[img] else 0
            kv = math.floor(min(vs) + _REP_EPS) if tiled[img] else 0
            if max(us) - ku > 1 + 1e-3 or max(vs) - kv > 1 + 1e-3 or min(us) - ku < -1e-3 or min(vs) - kv < -1e-3:
                spill.append((o.name, m.name, len(us), round(min(us), 3), round(max(us), 3), round(min(vs), 3), round(max(vs), 3)))
            for li in pl.loop_indices:
                uv[li].uv = ((x0 + (uv[li].uv[0] - ku) * w_) / pw, (y0 + (uv[li].uv[1] - kv) * h_) / ph)
            page_of[pl.index] = pi
        # (each merged as it would have been by its own material: the file's merges kept small, under optimize_glb.py's 1,500 triangles;
        # the game merges them all again, by page, as it loads)
        if not o.get("atlasFrom"):
            o["atlasFrom"] = "|".join(m.name for m in me.materials if m is not None)
        if not page_of:
            continue
        old = list(me.materials)
        slots = [m for m in old if m not in mats]
        used = sorted(set(page_of.values()))
        slot_of_page = {p: len(slots) + k for k, p in enumerate(used)}
        idx = [0] * len(me.polygons)
        me.polygons.foreach_get("material_index", idx)
        idx = [slot_of_page[page_of[i]] if i in page_of else slots.index(old[k]) for i, k in enumerate(idx)]
        me.materials.clear()
        for m in slots + [out[p] for p in used]:
            me.materials.append(m)
        me.polygons.foreach_set("material_index", idx)
    for pi, (pw, ph) in enumerate(sizes):
        print("SLOT_PAGE", out[pi].name, f"{pw}x{ph}", len(pages[pi]), "cells")
    for img, (pi, x0, y0, w_, h_) in place.items():
        print("SLOT_CELL", out[pi].name, img.name, f"{img.size[0]}x{img.size[1]}", "at", x0, y0, "drawn", f"{w_}x{h_}",
              "tiled" if tiled[img] else "clamped", [m.name for m in pictures[img]])
    for m, (pi, x0, y0) in swatch.items():
        print("SLOT_SWATCH", out[pi].name, m.name, x0, y0, [round(c, 3) for c in colours[m]])
    for s in spill[:40]:
        print("SLOT_SPILL", name, *s)
    print("SLOT_ATLAS", name, len(objs), "pieces", len(pictures), "pictures", len(colours), "colours", len(out), "pages", cut, "faces cut",
          len(spill), "faces out of their places")
    if spill:
        raise RuntimeError(f"slot_atlas {name}: {len(spill)} faces out of their places (SLOT_SPILL above): they'd show the next one's picture")
    return out, cut
