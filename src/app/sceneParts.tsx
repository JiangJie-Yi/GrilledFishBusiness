import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { setEar } from '@/scene/interact/sfx'
import { Html } from '@/scene/interact/Html'
import * as THREE from 'three'
import { tl, type Lang } from '@/data/i18n'
import { Movable } from '@/shops/grill/editor/Movable'
import { ROOM_TURN } from '@/game/system/editGroups'
import { noteDrawn } from '@/scene/render/Later'
import { DORM_LAYER, FLOOR, lightsBoth } from '@/scene/props/floors'
import { VIEW_SPOTS, viewKey, viewName, type ViewId } from '@/data/views'
import { NO_POINTER, zr } from '@/scene/interact/htmlProps'
import { OVERVIEW_TARGET } from '@/app/camera'
import { centreIndoors, insideIndoors, setIndoorBox } from '@/scene/render/indoorSun'
import { DORM_AT } from '@/shops/grill/rooms/DormRoom'
import { VIEWCAM_TURN } from '@/app/camera'

/** the shop's insides where the sun doesn't shine (item 721, scene/render/indoorSun), in the room floor's frame (bar units: x across the
 * room, + to the round window's wall; y up from the boards; z along it, + to the door), measured (tests/e2e/_indoor721.mjs): the room with
 * the toilets' strip behind it, between the plinth's faces round it (out of doors, the street's side seen from the street) and the walls
 * within them (the round window's at 1.65, the plinth's face 1 cm past it at 1.66), up past anything in it, to the facade's back; the
 * facade's own depth, under its eaves (the roof over it and the door's outer face out of doors); the stock room's deeper strip; each from
 * 30 cm under the boards (the ground round the building, at -0.46, out of doors) */
const SHOP_INDOORS: { min: THREE.Vector3Tuple; max: THREE.Vector3Tuple }[] = [
  { min: [-4.465, -0.3, -5.435], max: [1.655, 9, 3.44] },
  { min: [-4.465, -0.3, 3.4], max: [1.655, 2.3, 3.62] },
  { min: [-4.465, -0.3, -5.675], max: [-1.84, 9, -5.4] },
  // (and the boards along the front past the facade's line, left of the genkan, to 4 mm short of their edge (item 758, the owner's 「注意陰影
  // 不切到室內」: the floor runs on 10 cm past the facade's box, its last strip out of doors, and the eave's shadow lay along it inside the
  // room by the till at any hour); low, so the base's face under that edge and the facade stay out of doors)
  { min: [-4.465, -0.1, 3.4], max: [0.4, 0.25, 3.712] },
]
/** how far in (bar units) the sun's gone entirely: its edge eased over 4 mm (the wall within it 5 mm in, the plinth 5 mm out), no stair of
 * light and dark across what stands at the door's line */
const INDOOR_SOFT = 0.004
/** the dorm upstairs, a room off on its own (DormRoom's DORM_AT): all of it, nothing else out there */
const DORM_INDOORS = { min: [DORM_AT.x - 15, DORM_AT.y - 12, DORM_AT.z - 15] as THREE.Vector3Tuple, max: [DORM_AT.x + 15, DORM_AT.y + 12, DORM_AT.z + 15] as THREE.Vector3Tuple }
const WORLD_FRAME = new THREE.Matrix4()
/** sets them, once the room's floor is there (its frame the shop's); taken away as it's gone */
export const IndoorSun = memo(function IndoorSun() {
  const scene = useThree((s) => s.scene)
  const done = useRef(false)
  useFrame(() => {
    if (done.current) return
    const f = scene.getObjectByName('room-floor')
    if (!f) return
    f.updateWorldMatrix(true, false)
    SHOP_INDOORS.forEach((b, i) => setIndoorBox(i, { frame: f.matrixWorld, ...b, soft: INDOOR_SOFT }))
    setIndoorBox(SHOP_INDOORS.length, { frame: WORLD_FRAME, ...DORM_INDOORS, soft: 0.1 })
    done.current = true
  })
  useEffect(() => () => { for (let i = 0; i <= SHOP_INDOORS.length; i++) setIndoorBox(i, null) }, [])
  return null
})

/** tells the loading veil how many draws each frame took (scene/Later's noteDrawn): it waits for the shop to be drawn, not only loaded */
// (item 374: drawn again only as its own props change: it does its work in its frames and effects, and was drawn again with every redraw
// of the page or the scene, about three times a second, for nothing)
export const DrawnProbe = memo(function DrawnProbe() {
  useFrame(({ gl }) => noteDrawn(gl.info.render.calls))
  return null
})
/** the camera the sound effects are heard from (scene/sfx: how near each is, and which side) */
// (item 374: drawn again only as its own props change: it does its work in its frames and effects, and was drawn again with every redraw
// of the page or the scene, about three times a second, for nothing)
export const SfxEar = memo(function SfxEar() {
  const camera = useThree((s) => s.camera)
  useEffect(() => { setEar(camera) }, [camera])
  return null
})

/** how big (its bounding sphere's radius, in the world) a piece must be to cast a shadow: the plates, bottles, cups and little things on
 * the tables cast none (too small to show in a map spanning the shop), so the shadow maps draw a fraction of the meshes (three's shadow pass
 * tests layers against the view's camera, not the light's, so this is done by castShadow) */
const CASTER_R = 0.3
/** how far (world units) a caster's sphere must be clear of an indoor box's every side for the sun's map to leave it out: the walls, floor
 * and roof round the boxes kept in it (they cast the building's shadow out of doors) */
const SUN_IN_MARGIN = 0.15
/** (item 724, the owner's 「泥土地有奇怪的陰影」) and a piece smaller than this (its sphere's radius, world units) whose middle's indoors, left
 * out of the sun's map as well: the room's furniture, all of it. By the room's open side their spheres reached out past the box, and with
 * the sun low they cast long shadows out over the earth (the drink fridges, the plate cabinets, the freezer, the sink, the bins); the walls,
 * the floor's base and the whole room's batches are bigger (3.1 to 6.6), and kept */
const SUN_PIECE_R = 3
/** (how far out of a box's side such a piece's middle may stand: the plate cabinets' backs stand 3.5 cm of the room's units (7 cm of the
 * world's) out past the floor's open edge) */
const SUN_EDGE = 0.1
const SUN_AT = new THREE.Vector3()
/** (item 730) the view's frustum in a light's own frame, for a spot light that says where it can light (`userData.litBox`, a box in its own
 * frame: the stock room's bulb): its map left as it was while none of that's in the view, drawn again the frame some of it comes back into
 * it. The test made in the light's frame (the view's matrix times the light's world matrix), not on the box carried out to the world: the
 * room stands turned in the world, and the box turned out there and boxed again was half as wide again (module-level, nothing new a frame) */
const LIT_VIEW = new THREE.Frustum(), LIT_VP = new THREE.Matrix4(), LIT_M = new THREE.Matrix4()
/** the casters left out of the sun's map this frame, back on */
function castersBack(o: THREE.Mesh[]) { for (let i = 0; i < o.length; i++) o[i].castShadow = true; o.length = 0 }

// (item 374: drawn again only as its own props change: it does its work in its frames and effects, and was drawn again with every redraw
// of the page or the scene, about three times a second, for nothing)
export const ShadowPacer = memo(function ShadowPacer() {
  const gl = useThree((st) => st.gl)
  const scene = useThree((st) => st.scene)
  const n = useRef(0)
  const seen = useRef(-1)
  // (the sun's map and the other lights' drawn on frames of their own: the sun's without what's indoors (its shadow's unseen in there since
  // item 721, scene/render/indoorSun), those casters' castShadow off for that one draw and back on after it; the spot's over the room with
  // them all, a frame later. Each list kept and filled again in place, no garbage)
  const sun = useRef<THREE.DirectionalLight | null>(null)
  const others = useRef<THREE.SpotLight[]>([])
  const casters = useRef<THREE.Mesh[]>([])
  const off = useRef<THREE.Mesh[]>([])
  /** the view's own camera (a mirror's is another) */
  const view = useRef<THREE.Camera | null>(null)
  useEffect(() => {
    gl.shadowMap.autoUpdate = false; gl.shadowMap.needsUpdate = true
    const back = () => castersBack(off.current)
    // (item 730) a light with a lit box, put out or its box out of this render's view: its map not drawn (asked for on its frame or not),
    // and marked stale; lit and its box in the view again, a stale map drawn in this very render, whatever frame of the three it is. Here,
    // not in the frame's callbacks: three has this frame's matrices by now (a callback after this one's may still move the camera), so a
    // box coming into the view has its map drawn the frame it's seen, not a frame late. Only for the view's own camera: in a mirror's draw (the
    // restrooms' round mirrors) the maps stay as they were, so a lit box seen only in a mirror keeps its last shadow (the stock keeper's
    // standing still there while he walks); upstairs the shop's maps aren't drawn at all (below)
    const litInView = (camera: THREE.Camera) => {
      if (FLOOR.up || camera !== view.current) return
      let ready = false, fresh = false
      for (const l of others.current) {
        const box = l.userData.litBox as THREE.Box3 | undefined
        if (!box || !l.castShadow) continue
        if (!ready) { LIT_VP.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); ready = true }
        if (!(l.intensity > 0) || !LIT_VIEW.setFromProjectionMatrix(LIT_M.multiplyMatrices(LIT_VP, l.matrixWorld)).intersectsBox(box)) {
          l.shadow.needsUpdate = false; l.userData.mapStale = true
          continue
        }
        if (l.userData.mapStale) { l.userData.mapStale = false; l.shadow.needsUpdate = true; fresh = true }
      }
      if (fresh) gl.shadowMap.needsUpdate = true
    }
    const was = scene.onAfterRender, wasBefore = scene.onBeforeRender
    scene.onAfterRender = function (...a) { back(); was.apply(this, a) }
    scene.onBeforeRender = function (...a) { litInView(a[2]); wasBefore.apply(this, a) }
    return () => {
      back(); scene.onAfterRender = was; scene.onBeforeRender = wasBefore; gl.shadowMap.autoUpdate = true
      for (const l of [sun.current, ...others.current]) if (l?.shadow) l.shadow.autoUpdate = true
    }
  }, [gl, scene])
  const onePass = (mat: THREE.Material | undefined) => { if (mat && mat.transparent && mat.side === THREE.DoubleSide && !mat.forceSinglePass) mat.forceSinglePass = true }
  useFrame(({ clock, camera }) => {
    view.current = camera
    // (left out last frame and not put back, the frame not drawn)
    if (off.current.length) castersBack(off.current)
    // (once a second and a half)
    if (clock.elapsedTime - seen.current > 1.5) {
      seen.current = clock.elapsedTime
      const v = new THREE.Vector3()
      sun.current = null; others.current.length = 0; casters.current.length = 0
      scene.traverse((o) => {
        // (every light lit on both floors' layers (item 457, scene/floors): the same lights seen up or down, no program made afresh)
        if ((o as THREE.Light).isLight) {
          if (!o.layers.isEnabled(DORM_LAYER)) o.layers.enable(DORM_LAYER)
          const l = o as THREE.DirectionalLight
          if (l.shadow) {
            l.shadow.autoUpdate = false
            if (l.isDirectionalLight && l.castShadow && !sun.current) sun.current = l
            else others.current.push(l as unknown as THREE.SpotLight)
          }
          return
        }
        const m = o as THREE.Mesh
        if (!m.isMesh) return
        // (and anything see-through and two-sided drawn in one pass: three otherwise draws it twice a frame, back faces then front, flagging
        // its material changed before each (its program's parameters worked out afresh twice a frame, for every banner, glow and glass);
        // they're all flat cloths, glows and panes here, which look the same either way)
        // (one material or a list, each as it is: a list made of every mesh's one, every second and a half, was 9 MB of garbage the half
        // minute (item 374))
        const mats = m.material
        if (Array.isArray(mats)) mats.forEach(onePass)
        else onePass(mats)
        if (m.userData.sunSeen !== m.geometry) {
          m.userData.sunSeen = m.geometry
          const g = m.geometry
          if (!g.boundingSphere) g.computeBoundingSphere()
          m.getWorldScale(v)
          const r = (g.boundingSphere?.radius ?? 0) * Math.max(v.x, v.y, v.z)
          if (r < CASTER_R) m.castShadow = false
        }
        // (the sun's map may leave it out while it's indoors: not an instanced or batched one, whose sphere isn't its geometry's)
        if (m.castShadow && !(m as THREE.InstancedMesh).isInstancedMesh && !(m as unknown as THREE.BatchedMesh).isBatchedMesh && m.geometry.boundingSphere) casters.current.push(m)
      })
    }
    // (upstairs the shop isn't drawn, nor its shadows (item 457): its maps kept as they were, drawn again once it's come back down to)
    const k = ++n.current % 3
    if (FLOOR.up || k === 2) return
    if (k === 0) {
      const s = sun.current
      if (!s) return
      s.shadow.needsUpdate = true
      // (what's in an indoor box, its sphere clear of the box's sides by SUN_IN_MARGIN, or a piece (under SUN_PIECE_R) whose middle's in one,
      // left out of this draw of the sun's map; and what casts for a lamp's sake only (`userData.sunless`: the stock room's unseen slabs that
      // keep its bulb's light in it, item 754))
      const list = casters.current, o = off.current
      for (let i = 0; i < list.length; i++) {
        const m = list[i]
        if (!m.castShadow || !m.parent) continue
        const b = m.geometry.boundingSphere
        if (!b) continue
        SUN_AT.copy(b.center).applyMatrix4(m.matrixWorld)
        const r = b.radius * m.matrixWorld.getMaxScaleOnAxis()
        if (!m.userData.sunless && !insideIndoors(SUN_AT.x, SUN_AT.y, SUN_AT.z, r, SUN_IN_MARGIN) && !(r < SUN_PIECE_R && centreIndoors(SUN_AT.x, SUN_AT.y, SUN_AT.z, SUN_EDGE))) continue
        m.castShadow = false
        o.push(m)
      }
    } else {
      // (a light put out (its strength 0: the stock room's bulb pulled off, item 729) its map left as it was: drawn again the first frame
      // after it's lit; one with a lit box, whose box is out of the view, left as it was too, item 730, scene.onBeforeRender above)
      for (const l of others.current) if (l.intensity > 0) l.shadow.needsUpdate = true
    }
    gl.shadowMap.needsUpdate = true
  })
  return null
})
/** which floor's drawn (item 457, scene/floors): the camera and the pointer's ray on the room upstairs' layer while the view's up there, else
 * the shop's; the shop's labels and bubbles (drei's, beside the canvas) hidden meanwhile (`data-floor` on the page) */
export const FloorLayers = memo(function FloorLayers({ up }: { up: boolean }) {
  const camera = useThree((st) => st.camera)
  const raycaster = useThree((st) => st.raycaster)
  const scene = useThree((st) => st.scene)
  useLayoutEffect(() => {
    lightsBoth(scene)
    FLOOR.up = up
    camera.layers.set(up ? DORM_LAYER : 0)
    raycaster.layers.set(up ? DORM_LAYER : 0)
    document.documentElement.dataset.floor = up ? 'up' : 'down'
  }, [up, camera, raycaster, scene])
  return null
})
/**
 * The world axes in a corner of the screen while editing, as a modelling program has them: the room's own X (along the bar, red), Y (up, green) and
 * Z (across it, blue), turned with the camera, so a piece's X, Y, Z fields can be read against the view. It writes into the SVG that App draws.
 */
export function AxisWidget() {
  const { camera } = useThree()
  useFrame(() => {
    const root = document.getElementById('axis-widget')
    if (!root) return
    const inv = camera.matrixWorldInverse
    // (the room's axes, as the developer panel's world space goes by (editGroups' ROOM_TURN): X along the bar; the world's own stood 36°
    // across every wall)
    const ra = (ROOM_TURN * Math.PI) / 180
    const axes = [[Math.cos(ra), 0, -Math.sin(ra)], [0, 1, 0], [Math.sin(ra), 0, Math.cos(ra)]]
    axes.forEach((v, i) => {
      const d = new THREE.Vector3(...v).transformDirection(inv)
      const line = root.querySelector<SVGLineElement>(`.aw-line-${i}`), dot = root.querySelector<SVGGElement>(`.aw-dot-${i}`), neg = root.querySelector<SVGCircleElement>(`.aw-neg-${i}`)
      if (!line || !dot || !neg) return
      const x = 36 + d.x * 24, y = 36 - d.y * 24
      line.setAttribute('x2', String(x)); line.setAttribute('y2', String(y))
      dot.setAttribute('transform', `translate(${x} ${y})`)
      neg.setAttribute('cx', String(72 - x)); neg.setAttribute('cy', String(72 - y))
      // (the end pointing away from the viewer is drawn behind: fainter)
      dot.setAttribute('opacity', d.z > 0.2 ? '0.55' : '1')
      line.setAttribute('opacity', d.z > 0.2 ? '0.5' : '1')
    })
  })
  return null
}

/**
 * The views, marked in the room while editing, numbered as in the eye button's menu: a round tag where each looks (on its named group), its
 * name and what's there when pointed at; clicked, the camera goes there (drawn over the canvas, as Sketchfab's annotations are).
 */
export function ViewMarkers({ lang, onPick }: { lang: Lang; onPick: (v: ViewId) => void }) {
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const [, tick] = useState(0)
  // (the grill's spot off to the right of the fire as it's seen, over the stones, not on the fire itself)
  const grillAt = new THREE.Vector3(0, 0.75, 0).add(new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).setY(0).normalize().multiplyScalar(0.62))
  // (the named groups are looked for again a moment after editing starts: the room's pieces may still be loading)
  useEffect(() => { const t = window.setTimeout(() => tick((n) => n + 1), 500); return () => window.clearTimeout(t) }, [])
  return (
    <>
      {VIEW_SPOTS.map((v, i) => {
        const at = v.id === 'grill' ? grillAt : v.id === 'free' ? null
          : (() => { const o = v.anchor ? scene.getObjectByName(v.anchor) : null; if (!o) return null; const p = o.getWorldPosition(new THREE.Vector3()); if (p.y < OVERVIEW_TARGET.y - 1.2) p.y += 0.9; return p })()
        if (!at) return null
        return (
          <Html key={v.id} position={at} center zIndexRange={zr(40, 0)}>
            <button type="button" className="view-pin" onClick={(e) => { e.stopPropagation(); onPick(v.id) }}>
              <i>{i + 1}</i>
              <span><b>{viewName(v, lang)}</b>{v.about[lang]}</span>
            </button>
          </Html>
        )
      })}
    </>
  )
}

/** where the fire is on the screen (as parts of the window), for the grill's shallow focus (.grill-focus) to centre on, every few frames */
// (item 374: drawn again only as its own props change: it does its work in its frames and effects, and was drawn again with every redraw
// of the page or the scene, about three times a second, for nothing)
export const FocusTracker = memo(function FocusTracker() {
  const n = useRef(0)
  const v = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera, gl }) => {
    if (++n.current % 6) return
    const r = gl.domElement.getBoundingClientRect()
    v.set(0, 0.25, 0).project(camera)
    const x = (r.left + ((v.x + 1) / 2) * r.width) / window.innerWidth, y = (r.top + ((1 - v.y) / 2) * r.height) / window.innerHeight
    const st = document.documentElement.style
    st.setProperty('--focus-x', `${(x * 100).toFixed(1)}%`)
    st.setProperty('--focus-y', `${(y * 100).toFixed(1)}%`)
  })
  return null
})

/** a film camera's shape, pointing down its -z: the body, the lens, two reels on top */
function CamIcon({ editing, n, name }: { editing: boolean; n: number | string; name: string }) {
  const g = useRef<THREE.Group>(null)
  // (only seen, and only to be pointed at, in edit mode: otherwise on a layer the camera doesn't draw and the pointer doesn't reach)
  useEffect(() => { g.current?.traverse((o) => o.layers.set(editing ? 0 : 5)) }, [editing])
  return (
    <group ref={g}>
      <mesh><boxGeometry args={[0.12, 0.14, 0.2]} /><meshBasicMaterial color="#2b2d33" /></mesh>
      <mesh position-z={-0.13} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.045, 0.035, 0.07, 16]} /><meshBasicMaterial color="#f2a33a" /></mesh>
      {[-0.05, 0.06].map((z) => (
        <mesh key={z} position={[0, 0.12, z]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.055, 0.055, 0.03, 18]} /><meshBasicMaterial color="#4a4d55" /></mesh>
      ))}
      {editing && (
        <Html position={[0, 0.24, 0]} center zIndexRange={zr(40, 0)} style={NO_POINTER}>
          <span className="view-cam-tag"><i>{n}</i>{name}</span>
        </Html>
      )}
    </group>
  )
}

/**
 * Each view's camera, standing where the view looks from and pointing the way it looks: always there (it's what a view placed by hand is read
 * from), seen only in edit mode, where it's a piece like any other (位置・旋轉 in the panel, or dragged): the view then looks from it.
 */
// (drawn again only when edit mode or the language changes, or by its own ticks while the views' targets are still loading: the poses are
// read through a ref to the latest, so the app's many redraws a second (a new function each) don't redraw its ten pieces)
export const ViewCams = memo(ViewCamsImpl, (a, b) => a.editing === b.editing && a.lang === b.lang)
function ViewCamsImpl({ editing, lang, pose }: { editing: boolean; lang: Lang; pose: (id: ViewId) => { pos: THREE.Vector3; target: THREE.Vector3 } | null }) {
  const [, tick] = useState(0)
  const poseNow = useRef(pose)
  poseNow.current = pose
  // (the parts of the room they look at may still be loading (the drinks' fridges come late): looked for again until every one is found)
  useEffect(() => {
    let n = 0
    const t = window.setInterval(() => { tick((k) => k + 1); if (++n > 60 || VIEW_SPOTS.every((v) => poseNow.current(v.id))) window.clearInterval(t) }, 800)
    return () => window.clearInterval(t)
  }, [])
  return (
    <>
      {VIEW_SPOTS.map((v, i) => {
        const p = poseNow.current(v.id)
        if (!p) return null
        const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(p.pos, p.target, new THREE.Vector3(0, 1, 0)))
        return (
          <Movable key={v.id} id={`viewcam-${v.id}`} label={`視角 ${viewKey(i)}・${v.zh}`} baseTurn={VIEWCAM_TURN[v.id]}>
            <group name={`viewcam-${v.id}`} position={p.pos} quaternion={q}><CamIcon editing={editing} n={viewKey(i)} name={viewName(v, lang)} /></group>
          </Movable>
        )
      })}
    </>
  )
}
/** says so once what's beside it in its Suspense is in and has been drawn twice (its pictures up, its programs made): the room upstairs
 * (item 350) */
export function Drawn({ onDrawn }: { onDrawn?: () => void }) {
  const said = useRef(false)
  const frames = useRef(0)
  const gl = useThree((st) => st.gl)
  const scene = useThree((st) => st.scene)
  const camera = useThree((st) => st.camera)
  useFrame(() => {
    if (said.current) return
    // (item 457: the room's on a layer of its own, not drawn till the camera's up there: its programs made and its pictures sent up now,
    // behind the cover, with the lights both floors share, so its first frame up there makes nothing)
    if (++frames.current === 1) {
      const room = scene.getObjectByName('look-dorm')?.parent
      if (room) {
        lightsBoth(scene)
        gl.compile(room, camera, scene)
        const sent = new Set<THREE.Texture>()
        room.traverse((o) => {
          for (const mat of ([] as THREE.Material[]).concat((o as THREE.Mesh).material ?? [])) {
            for (const v of Object.values(mat)) if ((v as THREE.Texture | null)?.isTexture && !sent.has(v as THREE.Texture)) { sent.add(v as THREE.Texture); gl.initTexture(v as THREE.Texture) }
          }
        })
      }
    }
    if (frames.current < 3) return
    said.current = true
    onDrawn?.()
  })
  return null
}
/** the cover over the move between the shop and the room upstairs (item 350): a dark veil, where they're going, a bar filling (to half as
 * the room's made, to the end as the camera gets there), gone once it's done */
// (item 374: drawn again only as its own props change; it was with every redraw of the page, 3.3 a second)
export const FloorCover = memo(function FloorCover({ go, lang }: { go: { dir: 'up' | 'down'; stage: number } | null; lang: Lang }) {
  const [shown, setShown] = useState(go)
  useEffect(() => {
    if (go) { setShown(go); return }
    const t = window.setTimeout(() => setShown(null), 380)
    return () => window.clearTimeout(t)
  }, [go])
  // (shown from the first render it's asked for: the effect's copy only keeps it a moment as it fades)
  const on = go ?? shown
  if (!on) return null
  const up = on.dir === 'up'
  return (
    <div className={`floor-cover${go ? '' : ' is-done'}`} role="status" aria-live="polite">
      <div className="floor-cover-card">
        <span className="floor-cover-word">{up ? tl(lang, '上二樓', '二階へ', 'Going upstairs') : tl(lang, '下樓回店裡', '店に下りる', 'Back down to the shop')}</span>
        <span className="floor-cover-bar"><i style={{ width: `${go ? [12, 55, 100][go.stage] : 100}%` }} /></span>
      </div>
    </div>
  )
})
