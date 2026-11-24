import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { setEar } from '@/scene/sfx'
import { Html } from '@/scene/Html'
import * as THREE from 'three'
import { tl, type Lang } from '@/data/i18n'
import { Movable } from '@/shops/grill/Movable'
import { ROOM_TURN } from '@/game/editGroups'
import { noteDrawn } from '@/scene/Later'
import { DORM_LAYER, FLOOR, lightsBoth } from '@/scene/floors'
import { VIEW_SPOTS, viewKey, viewName, type ViewId } from '@/data/views'
import { NO_POINTER, zr } from '@/scene/htmlProps'
import { OVERVIEW_TARGET } from '@/app/camera'
import { VIEWCAM_TURN } from '@/app/camera'

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

// (item 374: drawn again only as its own props change: it does its work in its frames and effects, and was drawn again with every redraw
// of the page or the scene, about three times a second, for nothing)
export const ShadowPacer = memo(function ShadowPacer() {
  const gl = useThree((st) => st.gl)
  const scene = useThree((st) => st.scene)
  const n = useRef(0)
  const seen = useRef(-1)
  useEffect(() => { gl.shadowMap.autoUpdate = false; gl.shadowMap.needsUpdate = true; return () => { gl.shadowMap.autoUpdate = true } }, [gl])
  const onePass = (mat: THREE.Material | undefined) => { if (mat && mat.transparent && mat.side === THREE.DoubleSide && !mat.forceSinglePass) mat.forceSinglePass = true }
  useFrame(({ clock }) => {
    // (once a second and a half)
    if (clock.elapsedTime - seen.current > 1.5) {
      seen.current = clock.elapsedTime
      const v = new THREE.Vector3()
      scene.traverse((o) => {
        // (every light lit on both floors' layers (item 457, scene/floors): the same lights seen up or down, no program made afresh)
        if ((o as THREE.Light).isLight) { if (!o.layers.isEnabled(DORM_LAYER)) o.layers.enable(DORM_LAYER); return }
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
        if (m.userData.sunSeen === m.geometry) return
        m.userData.sunSeen = m.geometry
        const g = m.geometry
        if (!g.boundingSphere) g.computeBoundingSphere()
        m.getWorldScale(v)
        const r = (g.boundingSphere?.radius ?? 0) * Math.max(v.x, v.y, v.z)
        if (r < CASTER_R) m.castShadow = false
      })
    }
    // (upstairs the shop isn't drawn, nor its shadows (item 457): its map kept as it was, drawn again once it's come back down to)
    if (++n.current % 3 === 0 && !FLOOR.up) gl.shadowMap.needsUpdate = true
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
