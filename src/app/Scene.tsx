import { pieceOf, solidHit } from '@/scene/interact/pickable'
import { wheelIntent } from '@/game/system/navInput'
import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { IndoorHDRI } from '@/scene/render/IndoorHDRI'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { nameIn, type Lang } from '@/data/i18n'
import { Dish } from '@/scene/props/Dish'
import { Fire } from '@/shops/grill/kitchen/Fire'
import { bestOf } from '@/ui/panels/Notebook'
import { type Entry } from '@/data/recipes'
import { OpeningSpot } from '@/scene/props/OpeningSpot'
import { OccluderFade } from '@/scene/render/OccluderFade'
import { BlobShadows } from '@/scene/effects/BlobShadow'
import { RenderPrefsApply } from '@/shops/grill/editor/renderPrefs'
import { SceneTally } from '@/shops/grill/editor/SceneTally'
import { useLights } from '@/scene/render/lightsStore'
import { keyLightFrom, keyUnderRain, lampGlow, roomDim, shadowDepth, shadowSoft, studioLight } from '@/game/world/roomLights'
import { RAIN_NOW } from '@/shops/grill/guestbar/shopFront'
import { setStudioLight } from '@/scene/render/studio'
import { FIRE_SHIFT, GRILL_COUNTERS, GRILL_OFFSET, GRILL_SCALE, type DrinkId } from '@/shops/grill/bar'
import { deselectAll, offsetOf, rotationOf, setViewCams, useEditSel } from '@/shops/grill/edit'
import { EditBlock, GroupGizmo, SelectionDim, ShadeView, WireView } from '@/shops/grill/editor/Movable'
import { type ViewCam } from '@/game/system/editGroups'
import { cameraOneOf } from '@/scene/interact/camera1'
import { holdsCameraOne, modeOf } from '@/game/kitchen/mode'
import { Roasting } from '@/shops/grill/Roasting'
import { BAR_AT, BAR_TOP } from '@/shops/grill/roasting/barPlaces'
import { HOUSE_CHEF, type CrewMember } from '@/shops/grill/roasting/kitchen'
import { PIT_LIFT } from '@/shops/grill/roasting/hearth'
import type { GuestView, Notes, Step } from '@/game/types'
import { GuestBar3D } from '@/shops/grill/GuestBar3D'
import { type Visit } from '@/game/guests/reputation'
import { ContactShades } from '@/shops/grill/decor/ContactShades'
import { type Chef } from '@/data/chefs'
import { QUALITY } from '@/scene/render/quality'
import { helperOf, platerOf } from '@/game/kitchen/kitchenCrew'
import { Steam } from '@/scene/effects/Steam'
import { DISHES, type Dish as DishInfo } from '@/data/menu'
import { VIEW_SPOTS, type ViewId } from '@/data/views'
import { DormRoom } from '@/shops/grill/rooms/DormRoom'
import { type Sky } from '@/game/world/clock'
import { SPACING, ITEM_IDS, slot, servings, onTable, orderedBase, type Frame } from '@/app/dishes'
import { IS_TOUCH } from '@/app/renderer'
import { CAMERA_POSITION, OVERVIEW_TARGET, TOP_AT, TOP_UP, TOP_OPEN, OVERVIEW_POSITION, CAMERA_FOV, WIDE_FOV, FLY_S, UP_TURN, OWNER_FACING, cameraDistanceScale } from '@/app/camera'
import { type Theme, LIGHTING, SPOT_POSITION, SPOT_SOFTNESS } from '@/app/lighting'
import { ShadowPacer, FloorLayers, AxisWidget, ViewMarkers, FocusTracker, ViewCams, Drawn, IndoorSun } from '@/app/sceneParts'
import { HOLD_POSE, viewCamPlaced } from '@/app/camera'

type SceneProps = {
  /** the room upstairs in the scene (item 350, the owner's 「2F 可以跑進度條讀取，你這樣的方法不好」: it stood in the scene all the time, off in
   * the sky beside the shop, seen from the overview): only while going up, there, and coming down; and its word once it's in and drawn */
  dorm?: boolean
  onDormDrawn?: () => void
  /** a customer took a drink from the grill's fridge */
  onDrink?: (guest: number, drink: DrinkId) => void
  /** the omiki (御神酒) at the shrine by the door: when it was offered (performance.now), and offering it again */
  omiki: { pouredAt: number | null; onPour: () => void }
  /** the omiki's been offered: customers order more */
  blessed?: boolean
  active: number
  orders: Record<string, Record<string, number>>
  theme: Theme
  /** the part of the day (the room's light: its key light, its sky's colours) */
  sky: Sky
  reducedMotion: boolean
  /** 0..1 the charcoal on the grill's bed (what's put on, burning down) */
  fire: RefObject<number>
  /** 0..1 the fire's heat, rising to the bed as fresh charcoal catches: what the food's cooked by */
  heat: RefObject<number>
  /** the stage's box inside the full-window canvas: the dish is framed in it */
  frame: Frame
  onOffFire: (count: number, loose: number) => void
  /** a piece of food has been eaten (for the fullness meter) */
  onEat: (id: string, taste: number, how?: { doneness?: number; dabs?: Record<string, number>; steps?: Step[]; dip?: string[] }) => void
  notes: Notes
  /** AI simulation on, and what it does through the app */
  ai: boolean
  /** the shop's shut and being worked by hand (研製料理) */
  research: boolean
  onOrder: (id: string, guest?: number, reuse?: boolean) => boolean
  onAddCharcoal: (sticks?: number, byHand?: boolean, fromCrate?: boolean) => boolean
  onSay: (who: 'chef' | 'guest', text: string, guest?: number) => void
  /** bumped by the 視角 button: glide back to the home view */
  resetView: number
  /** the view menu's open: its numbered spots shown in the room */
  pins?: boolean
  /** which view the eye button's menu has chosen: the grill's own, the whole shop from above, or one of the shop's parts (data/views) */
  view: ViewId
  /** a view chosen from its numbered marker in edit mode */
  onView: (v: ViewId) => void
  onNotice: (what: 'notCooked' | 'burnt' | 'waste' | 'fireFull' | 'offTable' | 'heapFull' | 'needSkewer' | 'binBurnt') => void
  lang: Lang
  chefOf: (dishId: string) => Chef
  crowdOf: (dishId: string) => number
  crewOf: (dishId: string) => CrewMember[]
  /** everyone hired who lives upstairs, on today's shift or not (item 339: the room upstairs drew today's crew, and as the shop shut and the
   * shift turned over to tomorrow's the one who'd just come up the stair was swapped for another, there in bed already) */
  livingOf?: (dishId: string) => CrewMember[]
  onWalkOut: (ids: string[], dish: DishInfo, guest?: number, why?: string) => void
  /** a customer's visit scored as they go (game/reputation): for the shop's rating */
  onVisit: (v: Visit) => void
  /** (shop open) what's on each shop's menu, and a customer ordering one of them */
  entriesOf: (dishId: string) => Entry[]
  onOrderEntry: (key: string, guest: number, reuse?: Record<string, number>, atTill?: boolean, warm?: Record<string, number>) => boolean
  onGuests: (dishId: string, g: GuestView[]) => void
  spotOn: boolean
  guestsBy: Record<string, GuestView[]>
  /** shops with food out on either table (tasting or open): they stay loaded, so nothing on them is lost */
  inUse: string[]
  /** on a phone the customers are drawn in 2D on the guest board, not at the bar in 3D */
  phone: boolean
}

/** the shop's own waiter, there when no one's been hired for the floor: the cooked food is always carried to the customers, never tossed over the bar */
const HOUSE_SERVER: CrewMember = { id: 'house-server', role: 'server', look: { female: false, age: 'middle' } }
/** the owner's eyes in his first-person view (item 771): how high (his frame's units) and how far in front of his middle (at his eyes, inside
 * his head: it's folded away for this view's own draw, staff/Boss), and how far down it looks over 1.6 on (0.55 was 19 degrees; 0.8, 27) */
const BOSS_EYE = { up: 0.84, out: 0.28, down: 0.8 }
export function Scene({ omiki, active, orders, theme, sky, reducedMotion, fire, heat, frame, onOffFire, onEat, onNotice, resetView, pins = false, view, onView, ai, research, lang, spotOn, chefOf, crowdOf, crewOf, livingOf, guestsBy, onWalkOut, onVisit, onGuests, notes, inUse, phone, entriesOf, onOrderEntry,
  onOrder, onAddCharcoal, onSay, blessed = false, onDrink, dorm = false, onDormDrawn }: SceneProps) {
  const groups = useRef<(THREE.Group | null)[]>([])
  const controls = useRef<OrbitControlsImpl>(null)
  // (what the walls fade for: the view's target, asked each time; the same function from one redraw to the next (item 374))
  const occluderTarget = useCallback(() => controls.current?.target, [])
  // (in development, the view can be set from the console: __ctl.target, __cam.position)
  useEffect(() => { if (import.meta.env.DEV) Object.assign(window, { __ctl: controls.current }) })
  const camera = useThree((s) => s.camera)
  // while the kitchen's being tried out (the shop's closed) the view is held at camera 1; edit mode, and the shop being open, leave it free
  const editing = useEditSel((s) => s.on)
  const lockView = holdsCameraOne(modeOf(ai, research), editing) && !!DISHES[active].roast && !(import.meta.env.DEV && (window as unknown as { __freeCam?: boolean }).__freeCam)
  const lockRef = useRef(lockView)
  lockRef.current = lockView
  // (every view but the free one is fixed where it's set: no turning, sliding or zooming it; the developer mode leaves them all free)
  // (but upstairs (item 426, the owner's 「2F也可以轉視角」): turned round it within its open front's side, kept by the controls' bounds below)
  const spotLock = !editing && !lockView && view !== 'free' && view !== 'upstairs' && !(import.meta.env.DEV && (window as unknown as { __freeCam?: boolean }).__freeCam)
  const spotRef = useRef(spotLock)
  spotRef.current = spotLock
  const editRef = useRef(editing)
  editRef.current = editing
  const getThree = useThree((s) => s.get)
  const wasLocked = useRef(false)
  // (each view its own lens (the owner's: a cinematographer's choice for each, VIEW_SPOTS' fov), eased to as the camera flies there; through
  // the owner's eyes a wide one; edit mode the usual)
  const spotNow = VIEW_SPOTS.find((v) => v.id === view)
  const fovGoal = useRef(CAMERA_FOV)
  fovGoal.current = editing ? CAMERA_FOV : spotNow?.follow ? WIDE_FOV : spotNow?.fov ?? CAMERA_FOV
  const scene = useThree((s) => s.scene)
  const size = useThree((s) => s.size)
  // frame the dish on the stage rather than the whole canvas: shift the projection so the stage's centre is
  // the view's centre, and size the shot to the stage's shape
  const aspect = frame.w > 0 && frame.h > 0 ? frame.w / frame.h : size.width / size.height
  // (entering developer mode folds the menu away, which widens the stage: the framing is held as it was then, so the view doesn't slide; a
  // change of the window's own size still reframes it)
  // (and leaving it, the menu unfolding again doesn't jolt it back either: the framing held from going in stays, until the window's own size
  // changes)
  const framedFor = useRef({ w: 0, h: 0, held: false })
  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera) || frame.w <= 0) return
    const same = framedFor.current.w === size.width && framedFor.current.h === size.height
    if (editing) framedFor.current.held = true
    if (same && framedFor.current.held) return
    framedFor.current = { w: size.width, h: size.height, held: false }
    const offX = size.width / 2 - frame.cx
    const offY = size.height / 2 - frame.cy
    camera.setViewOffset(size.width, size.height, offX, offY, size.width, size.height)
    camera.updateProjectionMatrix()
  }, [camera, size, frame, editing])
  const look = LIGHTING[sky]
  // (the wall switch by the door: with the lights out, the warm lamp over the fire is out and the room's own light falls to the daylight by day,
  // to little by night (the night's key light, standing for the moon, with it: the fire then carries the room); the day's sun is as it was)
  const lights = useLights()
  const dim = roomDim(lights.on, theme === 'dark')
  // (the polished metal's reflections as bright as the room: no gold or brass shining in the dark)
  useEffect(() => setStudioLight(studioLight(lights.on, theme === 'dark')), [lights.on, theme])
  // (the key light: by day the sun high out past the round window, its shadows thrown a little across the floor (item 378); by night the moon,
  // in through the round window, its shadows falling away from it: game/roomLights' keyLightFrom)
  const keyLight = useRef<THREE.DirectionalLight>(null)
  const scene3 = useThree((s) => s.scene)
  const glKey = useThree((s) => s.gl)
  const moonAt = useRef(0)
  const keyNow = useRef({ on: lights.on, night: theme === 'dark', sky })
  keyNow.current = { on: lights.on, night: theme === 'dark', sky }
  /** the key light set as the lights and the time of day are now: its shadows' depth and softness, where it shines from */
  const placeKey = () => {
    const k = keyLight.current
    if (!k) return
    // (how dark its shadows fall and how soft: light and soft by day, faint by night with the lamps on, plain under the moon with them off)
    const { on, night, sky: now } = keyNow.current
    // (item 834: under rain fainter and softer, as an overcast day's; RAIN_NOW eased as the rain comes and goes)
    k.shadow.intensity = shadowDepth(on, night, RAIN_NOW.k)
    k.shadow.radius = shadowSoft(night, RAIN_NOW.k)
    // (by day the sun high out past the round window (item 378); by night the moon, high out past it too (the window's room is toward its
    // -x); at dusk the evening sun low in through it, at dawn the early sun from the room's other side)
    const w = scene3.getObjectByName('RoundWindow')
    let out: [number, number] | null = null
    if (w) {
      w.updateWorldMatrix(true, false)
      const o = new THREE.Vector3(1, 0, 0).transformDirection(w.matrixWorld)
      out = [o.x, o.z]
    }
    const [x, y, z] = keyLightFrom(now, out)
    k.position.set(x * 19, y * 19, z * 19)
  }
  // (the lights switched, or day turned to night: the shadows changed with the room's light on the very next frame, the shadow map drawn
  // again for it (it's otherwise drawn every third frame: ShadowPacer); they waited for the half-second look before, and lagged behind the
  // light (the owner saw it))
  useLayoutEffect(() => {
    placeKey()
    if (keyLight.current) keyLight.current.shadow.needsUpdate = true
    glKey.shadowMap.needsUpdate = true
  }, [lights.on, theme, sky, glKey])
  // (and every half second, the round window's moon following the window, should it be moved; and its shadows as the rain is)
  // (item 834: its own light thinned under rain every frame, from what it's set to as the lights and the time of day are (keyBase))
  const keyBase = useRef(0)
  keyBase.current = look.sunIntensity * (theme === 'dark' ? dim : 1)
  useFrame((st) => {
    const k = keyLight.current
    if (k) k.intensity = keyBase.current * keyUnderRain(RAIN_NOW.k)
    if (st.clock.elapsedTime - moonAt.current < 0.5) return
    moonAt.current = st.clock.elapsedTime
    placeKey()
  })

  // smoke off the grill: only once food on it is cooking through (Roasting sets it)
  const grillSmoke = useRef(0)
  const grillBlackSmoke = useRef(0)
  if (import.meta.env.DEV) Object.assign(window, { __smoke: grillSmoke })
  const dishLight = DISHES[active].light ?? {}


  // warm spot: per-dish position, strength and shadow softness, eased so switching dishes doesn't pop
  const spot = useRef<THREE.SpotLight>(null)
  const floor = useRef<THREE.ShadowMaterial>(null)
  useEffect(() => {
    const light = spot.current
    if (!light) return
    scene.add(light.target)
    return () => {
      scene.remove(light.target)
    }
  }, [scene])
  const spotGoal = useRef(new THREE.Vector3())

  // on every dish change (and when the viewport reshapes), glide the camera back to the home pose
  // so framing never drifts
  const homing = useRef(true)
  /** the flight under way to a view: from where, and how far through it (0..1) */
  const fly = useRef<{ pos: THREE.Vector3; target: THREE.Vector3; t: number } | null>(null)
  const home = useRef(new THREE.Vector3())
  const homeTarget = useMemo(() => new THREE.Vector3(), [])
  // (what the camera was last homed for: a change in the canvas's own shape alone (the menu folding or opening, edit mode folding it) isn't a reason to
  // glide it back: it stays as it is, and only a new dish, the reset button, the overview or a resized window homes it)
  const homedFor = useRef<{ active: number; resetView: number; view: ViewId; w: number; h: number; camTry: number } | null>(null)
  /** a view's placed camera not yet laid out when it was wanted (just loaded: turned about a middle not yet measured): looked for again */
  const [camTry, setCamTry] = useState(0)
  // (where the camera glides to and looks at: the grill's home view, the whole shop, or a part of it; `home` itself stays the grill's, camera 1's base)
  const aimPos = useRef(new THREE.Vector3())
  const aimTarget = useMemo(() => new THREE.Vector3(), [])
  /** where a view looks from and at, as worked out (before any hand placing): the grill's own home, the whole shop, or a part of it seen from
   * the room's middle side, a little above, at about table height */
  const poseOf = (id: ViewId): { pos: THREE.Vector3; target: THREE.Vector3 } | null => {
    if (id === 'grill') return { pos: home.current.clone(), target: homeTarget.clone() }
    // (straight down from right above the shop's middle (item 181): a hair off toward the room's open side, so the bar's length lies across
    // the screen and the street side is at its foot, as in the overview)
    if (id === 'top') return { pos: TOP_AT.clone().add(new THREE.Vector3(0, TOP_UP, 0)).addScaledVector(TOP_OPEN, 0.01), target: TOP_AT.clone() }
    if (id === 'free') return DISHES[active].roast ? { pos: OVERVIEW_POSITION.clone(), target: OVERVIEW_TARGET.clone() } : null
    const spot = VIEW_SPOTS.find((v) => v.id === id)
    const anchor = spot?.anchor ? scene.getObjectByName(spot.anchor) : null
    if (!spot || !anchor) return null
    const at = anchor.getWorldPosition(new THREE.Vector3())
    const floor = OVERVIEW_TARGET.y - 1.5
    if (at.y < floor + 0.3) at.y += 0.9
    if (spot.shift) at.add(new THREE.Vector3(spot.shift[0], 0, spot.shift[1]))
    // (one that follows: through his eyes (the owner's, 2026-11-10: first person; it was a portrait of him), carried along wherever he goes and
    // turning as he turns: from just in front of his face (so none of him's in the way), at his eyes' height, looking the way he faces and a
    // little down, at what's before him)
    // (just in front of his face now, at his nose's tip, and looking a little further down (item 771, the owner's 「第一人稱看的到手」): 0.42
    // out in front of him, his hands at the fire were behind the camera, never seen; from here what his hands do before him is in the
    // view's lower part, as one's own are)
    if (spot.follow) {
      const frame = anchor.parent ?? anchor
      frame.updateWorldMatrix(true, false)
      anchor.updateWorldMatrix(true, false)
      const p = anchor.position
      const fwd = new THREE.Vector3(0, 0, OWNER_FACING).transformDirection(anchor.matrixWorld).setY(0).normalize()
      const unit = frame.getWorldScale(new THREE.Vector3()).x
      const eye = anchor.getWorldPosition(new THREE.Vector3()).setY(frame.localToWorld(new THREE.Vector3(p.x, p.y + BOSS_EYE.up, p.z)).y).addScaledVector(fwd, BOSS_EYE.out * unit)
      return { pos: eye, target: eye.clone().addScaledVector(fwd, 1.6 * unit).add(new THREE.Vector3(0, -BOSS_EYE.down * unit, 0)) }
    }
    // (seen from the way the whole shop's overview looks in: from the open side of the room, so the walls are always behind what's seen,
    // never the empty outside; from the room's middle a part by the open side looked out into nothing)
    const fromOpen = spot.from ? new THREE.Vector3(spot.from[0], 0, spot.from[1]).normalize() : spot.faceOn
      ? new THREE.Vector3(0, 0, 1).transformDirection(anchor.matrixWorld).setY(0).normalize()
      : OVERVIEW_POSITION.clone().sub(OVERVIEW_TARGET).setY(0).normalize()
    return { pos: at.clone().addScaledVector(fromOpen, spot.back ?? 2).add(new THREE.Vector3(0, spot.up ?? 1.4, 0)), target: at }
  }
  // (where each view's camera stands and what it looks at, for edit mode to make what it has in sight its area: from the camera placed by hand,
  // if it has been, as the view itself goes; none while any view's part of the room is still loading)
  const poseNow = useRef(poseOf)
  poseNow.current = poseOf
  useEffect(() => {
    setViewCams(() => {
      const cams: ViewCam[] = []
      for (const v of VIEW_SPOTS) {
        if (v.id === 'free' || v.id === 'top' || v.follow) continue
        const def = poseNow.current(v.id)
        if (!def) return null
        const eye = def.pos.clone(), target = def.target.clone()
        const cam = scene.getObjectByName(`viewcam-${v.id}`)
        // (what it's a view of: the part of the room it's named for (its frame may be moved off it, into the room); a camera placed by hand,
        // what it now looks at)
        const anchor = v.anchor ? scene.getObjectByName(v.anchor) : null
        let subject = anchor ? anchor.getWorldPosition(new THREE.Vector3()) : target.clone()
        if (cam && viewCamPlaced(v.id)) {
          cam.updateWorldMatrix(true, false)
          cam.getWorldPosition(eye)
          target.copy(eye).addScaledVector(new THREE.Vector3(0, 0, -1).applyQuaternion(cam.getWorldQuaternion(new THREE.Quaternion())), def.pos.distanceTo(def.target))
          subject = target.clone()
        }
        // (a 16:9 frame, whatever the window's shape: the areas are the shop's, not the window's)
        cams.push({ id: v.id, eye: eye.toArray(), target: target.toArray(), subject: subject.toArray(), fov: (camera as THREE.PerspectiveCamera).fov ?? 40, aspect: 16 / 9 })
      }
      return cams
    })
    return () => setViewCams(null)
  }, [scene, camera])
  useEffect(() => {
    const was = homedFor.current
    homedFor.current = { active, resetView, view, w: size.width, h: size.height, camTry }
    if (was && was.active === active && was.resetView === resetView && was.view === view && was.w === size.width && was.h === size.height && was.camTry === camTry
      && frame.w > 0 && frame.h > 0) return
    // (gone over to the free view where the camera stands (entering edit mode): not homed)
    if (HOLD_POSE.next && view === 'free') { HOLD_POSE.next = false; return }
    const focus = new THREE.Vector3(0, DISHES[active].focusY, 0)
    // (a phone's stage sits above the menu inside a full-height canvas: what fits it is the stage's width against
    // the canvas height, and it mustn't back off just because the menu was folded away)
    const phoneStage = frame.h > 0 && frame.h < size.height * 0.95 || (frame.w < 700 && size.height > size.width)
    const scale = phoneStage ? Math.min(3.4, (1.3 / (frame.w / size.height)) * 0.92) : cameraDistanceScale(aspect)
    home.current.set(...CAMERA_POSITION).sub(focus).multiplyScalar(scale).add(focus)
    homeTarget.copy(focus)
    aimPos.current.copy(home.current)
    aimTarget.copy(homeTarget)
    const def = view === 'free' && phoneStage ? null : poseOf(view)
    if (def) { aimPos.current.copy(def.pos); aimTarget.copy(def.target) }
    // (a view whose camera was placed by hand in edit mode (its camera marker moved or turned): from there, looking the way it points)
    const cam = scene.getObjectByName(`viewcam-${view}`)
    // (its marker still being laid out, as when the shop's just loaded (the free view first of all): the view waits for it, so the first
    // look is the same as choosing the view again)
    const laidOut = (o: THREE.Object3D | null | undefined) => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return !!o }
    if (def && viewCamPlaced(view) && !laidOut(cam) && camTry < 60) {
      const t = window.setTimeout(() => setCamTry((n) => n + 1), 100)
      return () => window.clearTimeout(t)
    }
    if (def && cam && viewCamPlaced(view)) {
      cam.updateWorldMatrix(true, false)
      cam.getWorldPosition(aimPos.current)
      const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.getWorldQuaternion(new THREE.Quaternion()))
      aimTarget.copy(aimPos.current).addScaledVector(dir, def.pos.distanceTo(def.target))
    }
    // (a longer or shorter lens than the usual, the camera dollied back or in to keep the same framing, as a cameraman would: a narrower lens
    // from where the wider one stood cropped the overview's walls)
    const lens = VIEW_SPOTS.find((v) => v.id === view)?.fov
    // (from as far as it was ever seen from: the overview's stood further than the controls let it, and was held at their limit, 20)
    if (def && lens && !editing) {
      const arm = aimPos.current.clone().sub(aimTarget)
      arm.setLength(Math.min(arm.length(), 20) * Math.tan((CAMERA_FOV * Math.PI) / 360) / Math.tan((lens * Math.PI) / 360))
      aimPos.current.copy(aimTarget).add(arm)
    }
    homing.current = true
    homeGap.current = Infinity
    fly.current = null
    zoomGoal.current = null
  }, [active, aspect, resetView, view, frame.w, frame.h, size.width, size.height, camTry])

  // smooth wheel zoom: each notch nudges a target distance and the camera eases toward it
  const gl = useThree((s) => s.gl)
  const zoomGoal = useRef<number | null>(null)
  /** whether upstairs' bounds are on the controls now (item 426) */
  const upBounds = useRef(false)
  /** how near the grill's held view is drawn (1: camera 1 as it is; smaller nearer), by the wheel */
  const lockZoom = useRef(1)
  const lockZoomNow = useRef(1)
  /** and how far it's turned round its target there (yaw, pitch in radians), by a right-button drag: only a little either way */
  const lockTurn = useRef({ yaw: 0, pitch: 0 })
  const lockTurnNow = useRef({ yaw: 0, pitch: 0 })
  useEffect(() => {
    const el = gl.domElement
    const onWheel = (e: WheelEvent) => {
      const c = controls.current
      if (!c) return
      e.preventDefault()
      // (held at the grill: the wheel only brings the camera a little nearer, along its line, never further out than camera 1)
      if (lockRef.current) { lockZoom.current = THREE.MathUtils.clamp(lockZoom.current * Math.exp(e.deltaY * 0.0011), 0.75, 1); return }
      if (spotRef.current) return
      homing.current = false
      // (developer mode: two fingers on a trackpad slide the view across, a pinch zooms; a mouse's wheel zooms as ever)
      const how = editRef.current ? wheelIntent(e as WheelEvent & { wheelDeltaY?: number }) : 'zoom'
      if (how === 'pan') {
        const d = camera.position.distanceTo(c.target) * 0.0012
        const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0)
        const upward = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1)
        const move = right.multiplyScalar(e.deltaX * d).add(upward.multiplyScalar(-e.deltaY * d))
        camera.position.add(move)
        c.target.add(move)
        zoomGoal.current = null
        c.update()
        return
      }
      const now = zoomGoal.current ?? camera.position.distanceTo(c.target)
      // (within the controls' own bounds: upstairs' nearer and further (item 426))
      zoomGoal.current = THREE.MathUtils.clamp(now * Math.exp(e.deltaY * (how === 'pinch' ? 0.01 : 0.0011)), Math.max(1.8, c.minDistance), Math.min(20, c.maxDistance))
    }
    // (held at the grill: a right-button drag turns the view a little round what it looks at; the left button stays for the food)
    let drag: { x: number; y: number } | null = null
    const onDown = (e: PointerEvent) => { if (lockRef.current && e.button === 2) drag = { x: e.clientX, y: e.clientY } }
    const onMove = (e: PointerEvent) => {
      if (!drag || !lockRef.current) return
      const t = lockTurn.current
      t.yaw = THREE.MathUtils.clamp(t.yaw - (e.clientX - drag.x) * 0.0025, -0.2, 0.2)
      t.pitch = THREE.MathUtils.clamp(t.pitch + (e.clientY - drag.y) * 0.0025, -0.1, 0.1)
      drag = { x: e.clientX, y: e.clientY }
    }
    const onUp = () => { drag = null }
    const onMenu = (e: MouseEvent) => { if (lockRef.current) e.preventDefault() }
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    el.addEventListener('contextmenu', onMenu)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      el.removeEventListener('contextmenu', onMenu)
    }
  }, [gl, camera])
  const zoomDir = useRef(new THREE.Vector3())
  // (developer mode navigates without a middle button or Alt, for a Mac's trackpad and two-button mouse (the owner's): the left button on
  // empty space turns the view (on a piece or a handle it's theirs: what's under the pointer is r3f's hovered), Shift with it or the right
  // button pans, the wheel or a pinch dollies, two fingers on a trackpad pan (onWheel); Maya's Alt ways as before. A frames the whole shop)
  useEffect(() => {
    const c = controls.current
    if (!c) return
    if (!editing) { c.enableRotate = true; c.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.PAN }; return }
    c.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.DOLLY }
    const alt = (e: KeyboardEvent | PointerEvent) => { c.enabled = e.altKey }
    // (a press with the left button on no piece and no handle (the empty space round the room, or a wall, the floor, the bar: the room itself),
    // where and when; let go again without having moved, a click: nothing chosen any more (item 213, the owner's 「當我點選空白處時，要取消選取」;
    // r3f's own click and missed click never come in edit mode: the 3D view's clicks are swallowed, below))
    let blank: { x: number; y: number } | null = null
    const down = (e: PointerEvent) => {
      c.mouseButtons.RIGHT = e.altKey ? THREE.MOUSE.DOLLY : THREE.MOUSE.PAN
      // (only something solid, or a handle: a lamp's glow over the wall isn't something)
      const hits = [...getThree().internal.hovered.values()].filter((h) => h.object.userData.gizmo || solidHit(h.object))
      const onSomething = hits.length > 0
      c.enabled = e.altKey || e.button === 1 || e.button === 2 || (e.button === 0 && !onSomething)
      // (what's nearest under the pointer, solid: a piece or a handle, or the room)
      const first = hits.sort((a, b) => a.distance - b.distance)[0]
      const onPiece = !!first && (first.object.userData.gizmo || first.object.userData.editHandle || pieceOf(first.object) !== null)
      blank = e.button === 0 && !e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey && !onPiece ? { x: e.clientX, y: e.clientY } : null
    }
    const up = (e: PointerEvent) => {
      c.enabled = false
      if (blank && Math.hypot(e.clientX - blank.x, e.clientY - blank.y) < 4) deselectAll()
      blank = null
    }
    const keyUp = (e: KeyboardEvent) => { if (e.key === 'Alt') c.enabled = false }
    c.enabled = false
    window.addEventListener('keydown', alt)
    window.addEventListener('keyup', keyUp)
    gl.domElement.addEventListener('pointerdown', down, true)
    window.addEventListener('pointerup', up)
    const all = () => { onView('free') }
    window.addEventListener('edit-frame-all', all)
    return () => {
      window.removeEventListener('keydown', alt)
      window.removeEventListener('keyup', keyUp)
      gl.domElement.removeEventListener('pointerdown', down, true)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('edit-frame-all', all)
      c.enabled = true
    }
  }, [editing, gl])
  /** how far the gliding camera was from where it's going, last frame */
  const homeGap = useRef(Infinity)

  useFrame((_, delta) => {
    const k = reducedMotion ? 1 : Math.min(1, delta * 6)
    // (the lens eased to the view's own)
    const pc = camera as THREE.PerspectiveCamera
    if (Math.abs(pc.fov - fovGoal.current) > 0.01) { pc.fov += (fovGoal.current - pc.fov) * (reducedMotion ? 1 : Math.min(1, delta * 4)); pc.updateProjectionMatrix() }
    // slide dishes along X; a dish that wraps from one side to the other jumps instead of crossing the stage
    groups.current.forEach((g, i) => {
      if (!g) return
      const target = slot(i, active, DISHES.length) * SPACING
      if (Math.abs(target - g.position.x) > SPACING * 1.5) g.position.x = target
      else g.position.x += (target - g.position.x) * k
      g.visible = Math.abs(g.position.x) < SPACING * 0.98
    })

    const focusY = DISHES[active].focusY
    const s = spot.current
    if (s) {
      s.target.position.set(0, focusY, 0)
      s.position.lerp(spotGoal.current.set(...(dishLight.spotPosition ?? SPOT_POSITION)), k)
      s.intensity += (look.spot * (dishLight.spotIntensity ?? 1) - s.intensity) * k
      s.shadow.radius = dishLight.shadowSoftness ?? SPOT_SOFTNESS
    }
    if (floor.current) {
      const goal = dishLight.shadowOpacity ?? look.shadowOpacity
      floor.current.opacity += (goal - floor.current.opacity) * k
    }

    const c = controls.current
    // (upstairs, the view turned by hand within the room's open front (item 426, the owner's 「2F也可以轉視角」): round it up to UP_TURN
    // either side of straight on, never under its floor nor straight down on it, nearer and further within reason, not slid off it; the
    // shop's own bounds back as it's left)
    if (c) {
      const up = view === 'upstairs' && !editing
      if (up && !upBounds.current) {
        const a = scene.getObjectByName('look-dorm')
        if (a) {
          a.updateWorldMatrix(true, false)
          const f = new THREE.Vector3(0, 0, 1).transformDirection(a.matrixWorld)
          const th = Math.atan2(f.x, f.z)
          c.minAzimuthAngle = th - UP_TURN
          c.maxAzimuthAngle = th + UP_TURN
          c.minPolarAngle = 0.3
          c.maxPolarAngle = 1.25
          c.minDistance = 5
          c.maxDistance = 19
          c.enablePan = false
          upBounds.current = true
        }
      } else if (!up && upBounds.current) {
        c.minAzimuthAngle = -Infinity
        c.maxAzimuthAngle = Infinity
        c.minPolarAngle = 0
        c.maxPolarAngle = Math.PI * 0.45
        c.minDistance = 1.8
        c.maxDistance = 24
        c.enablePan = true
        upBounds.current = false
      }
    }
    // (a view that follows what it looks at (the owner, about his grill): its aim moved on with him every frame, the camera gliding after)
    const follow = VIEW_SPOTS.find((v) => v.id === view)?.follow && spotLock ? poseOf(view) : null
    // (first person: held to his eyes at once)
    if (c && follow) {
      // (first person: held to his eyes every frame, no gliding after)
      camera.position.copy(follow.pos)
      c.target.copy(follow.target)
      c.update()
      homing.current = false
    }
    if (c && lockView) {
      // (held at camera 1: it glides there, and the controls are off so nothing drags it away)
      const pose = cameraOneOf(home.current, homeTarget, offsetOf('camera1'), rotationOf('camera1'))
      c.enabled = false
      homing.current = false
      zoomGoal.current = null
      // (nearer or further along its line, eased)
      lockZoomNow.current += (lockZoom.current - lockZoomNow.current) * Math.min(1, k * 1.5)
      // (and turned a little round its target, eased: yaw round the up axis, pitch over it)
      const tn = lockTurnNow.current, tg = lockTurn.current, e = Math.min(1, k * 1.5)
      tn.yaw += (tg.yaw - tn.yaw) * e
      tn.pitch += (tg.pitch - tn.pitch) * e
      const arm = pose.position.sub(pose.target).multiplyScalar(lockZoomNow.current)
      const sph = new THREE.Spherical().setFromVector3(arm)
      sph.theta += tn.yaw
      sph.phi = THREE.MathUtils.clamp(sph.phi + tn.pitch, 0.05, Math.PI / 2 - 0.02)
      pose.position.setFromSpherical(sph).add(pose.target)
      camera.position.lerp(pose.position, k)
      c.target.lerp(pose.target, k)
      c.update()
      wasLocked.current = true
    } else if (c && wasLocked.current) {
      // (let go: the view is where it was, free to be turned and moved again)
      c.enabled = !spotLock
      wasLocked.current = false
    } else if (c && homing.current) {
      c.enabled = !spotLock
      // (flown there over FLY_S, eased in and out (the owner's: 0.8 to 1 s, smooth), not slowing on and on as it nears; any panning undone too)
      if (!fly.current) fly.current = { pos: camera.position.clone(), target: c.target.clone(), t: 0 }
      const f = fly.current
      f.t = reducedMotion ? 1 : Math.min(1, f.t + delta / FLY_S)
      const e = f.t < 0.5 ? 4 * f.t ** 3 : 1 - (-2 * f.t + 2) ** 3 / 2
      camera.position.lerpVectors(f.pos, aimPos.current, e)
      c.target.lerpVectors(f.target, aimTarget, e)
      c.update()
      if (f.t >= 1) { homing.current = false; fly.current = null }
      // (there, or as near as it can come: the controls' limits (distance, how low it looks) can keep it off the aim, and then it would be held
      // there for good, every frame, the view never let go)
      const gap = camera.position.distanceTo(aimPos.current) + c.target.distanceTo(aimTarget)
      if (gap < 0.004 || Math.abs(gap - homeGap.current) < 1e-5) homing.current = false
      homeGap.current = gap
    } else if (c && c.enabled === spotLock) {
      // (a fixed view: the controls off; the free view and the developer mode: on)
      c.enabled = !spotLock
    } else if (c && zoomGoal.current !== null) {
      const dir = zoomDir.current.copy(camera.position).sub(c.target)
      const dist = dir.length()
      const next = dist + (zoomGoal.current - dist) * (reducedMotion ? 1 : Math.min(1, delta * 7))
      camera.position.copy(c.target).addScaledVector(dir.normalize(), next)
      if (Math.abs(next - zoomGoal.current) < 0.002) zoomGoal.current = null
    }
  })

  return (
    <>
      {/* (the sun casts the room's shadows, the figures' and the furniture's on the floor: from high over the open side, its shadow camera
          spanning the whole shop; redrawn every third frame (ShadowPacer), the shadows moving a little behind what casts them) */}
      <directionalLight ref={keyLight} position={[9, 16, 7]} intensity={look.sunIntensity * (theme === 'dark' ? dim : 1)} color={look.sun} castShadow={QUALITY.shadows}
        shadow-mapSize={[QUALITY.shadowSize, QUALITY.shadowSize]} shadow-bias={-0.0008} shadow-normalBias={0.04} shadow-radius={shadowSoft(theme === 'dark')}
        shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={14} shadow-camera-bottom={-14} shadow-camera-near={1} shadow-camera-far={48} />
      <ShadowPacer />
      {/* (the sun only out of doors (item 721): where the shop's insides are) */}
      <IndoorSun />
      <FloorLayers up={view === 'upstairs'} />
      {/* (the staff room upstairs, a scene of its own off to the side (item 325)); those living in it up there while the shop's shut (item 339) */}
      {dorm && (
        <Suspense fallback={null}>
          <DormRoom crew={(livingOf ?? crewOf)(DISHES[active]?.id ?? DISHES[0].id)} open={ai} fallback={HOUSE_CHEF}
            working={crewOf(DISHES[active]?.id ?? DISHES[0].id).map((m) => m.id)} />
          <Drawn onDrawn={onDormDrawn} />
        </Suspense>
      )}
      {/* (where things meet what they stand on, darker: their contact shades, one mesh (item 306)) */}
      <ContactShades />
      <hemisphereLight args={[look.sky, look.ground, look.hemi * dim]} />
      <IndoorHDRI night={theme === 'dark'} intensity={(theme === 'dark' ? 0.3 + look.hemi * 0.4 : 0.5 + look.hemi * 0.5) * look.env * dim} />
      <spotLight
        ref={spot}
        position={SPOT_POSITION}
        color="#ffbf7a"
        intensity={look.spot * lampGlow(lights.on)}
        angle={0.5}
        penumbra={0.9}
        distance={14}
        decay={1.6}
        castShadow
        shadow-mapSize={[QUALITY.shadowSize, QUALITY.shadowSize]}
        // (biased enough that a surface doesn't shadow itself in stripes (acne) across the bar and the floor, the shadow camera's range held
        // to the room so its depth is spent where it's needed)
        shadow-bias={-0.0015}
        shadow-normalBias={0.05}
        shadow-camera-near={0.5}
        shadow-camera-far={14}
      />

      <OpeningSpot on={spotOn} focusY={DISHES[active].focusY} />

      {/* invisible floor that only shows the spot's shadow, so there's still no background (not for a shop with its own room: it stood at
          the cook's table's height across the whole scene, and the night's light from the window threw the room's shadow onto it, out past
          the shop in mid-air) */}
      {!DISHES[active].roast && (
        <mesh rotation-x={-Math.PI / 2} position-y={0.001} receiveShadow>
          <planeGeometry args={[30, 30]} />
          <shadowMaterial ref={floor} color={look.shadow} transparent opacity={look.shadowOpacity} />
        </mesh>
      )}

      {DISHES.map((dish, i) => {
        const base = orderedBase(dish, orders[dish.id])
        // (a set can leave some of the model's things out)
        const hidden = base?.hide
        // everything drawn from the dish's model (the full one, or its light version)
        const models = (url: string) => (
          <group position={dish.roast ? FIRE_SHIFT : undefined}>
              {/* (looked at by edit mode's pointer: the hearth's frame and stones in it stand in its way (item 162), nothing else of it) */}
              <EditBlock whole={false}>
              <Dish url={url} itemIds={ITEM_IDS[dish.id]} quantities={onTable(dish, orders[dish.id], ai)}
                hidden={hidden} layout={dish.layout}
                instant={reducedMotion} />
              </EditBlock>
              {/* after <Dish>, so its transforms win over the pop-in each frame */}
              {dish.roast && (
                <Roasting url={url} roast={dish.roast} itemIds={ITEM_IDS[dish.id]} quantities={servings(dish, orders[dish.id])}
                  active={i === active} instant={reducedMotion} fire={fire} heat={heat} onOffFire={onOffFire} onEat={onEat}
                  onNotice={onNotice} smoke={grillSmoke} blackSmoke={grillBlackSmoke}
                  ai={ai} research={research} onOrder={onOrder} onAddCharcoal={onAddCharcoal} onSay={onSay} chef={chefOf(dish.id)} onGuests={(g) => onGuests(dish.id, g)} crowd={crowdOf(dish.id)} blessed={blessed} onDrink={onDrink}
                  crew={crewOf(dish.id)} bar={!phone}
                  onWalkOut={(ids, g, why) => onWalkOut(ids, dish, g, why)} onVisit={onVisit} lang={lang}
                  entries={ai ? entriesOf(dish.id) : undefined} onOrderEntry={onOrderEntry}
                  names={Object.fromEntries(dish.items.map((x) => [x.id, nameIn(lang, x)]))}
                  space={ai ? 'open' : 'closed'} locked={editing}
                  notes={Object.fromEntries(Object.entries(notes).map(([k, n]) => [k, bestOf(n)]))} />
              )}
              {(ai || !!dish.roast) && i === active && !phone && (
                // the customers, in 3D (a phone has them in 2D on the guest board, and no 3D bar at all), at the bar behind (the grill's bar is drawn by Roasting, which serves onto it);
                // the grill's room is there before it opens too, empty
                <group position={dish.roast ? FIRE_SHIFT.clone().negate() : undefined}><GuestBar3D open={ai} guests={ai ? guestsBy[dish.id] ?? [] : []} lang={lang} drawCounter={!dish.roast}
                  servers={dish.roast && ai ? (() => { const hired = crewOf(dish.id).filter((w) => w.role === 'server'); return hired.length ? hired : [HOUSE_SERVER] })() : []}
                  plater={dish.roast && ai ? (() => {
                    // (who plates at the pass, fetching its plates from the racks, and keeps the fire: the third cook; with none, the second (hired,
                    // or the shop's own), between his rounds of the orders: the owner's at the fire, taking things on and off it)
                    const m = platerOf(crewOf(dish.id), HOUSE_CHEF)
                    return { id: m.id, role: m.role as 'chef' | 'sous', look: m.look }
                  })() : null}
                  stocker={dish.roast && ai ? crewOf(dish.id).find((w) => w.role === 'stock') ?? null : null}
                  helper={dish.roast && ai ? (() => {
                    // (item 845: with a third cook at the plating, the second (hired, or the shop's own) lends the floor a hand between his rounds)
                    const m = helperOf(crewOf(dish.id), HOUSE_CHEF)
                    return m ? { id: m.id, look: m.look } : null
                  })() : null}
                  mark={dish.roast ? '聞野' : '食堂'}
                  top={dish.roast ? BAR_TOP : 0.465} counters={dish.roast ? GRILL_COUNTERS : undefined} scale={dish.roast ? GRILL_SCALE : 1} offset={dish.roast ? GRILL_OFFSET : undefined}
                  at={dish.roast ? BAR_AT : new THREE.Vector3(-0.59, 0, -0.81).multiplyScalar(1.95)}
                  omiki={dish.roast ? omiki : undefined} onDrink={onDrink} onSay={onSay} /></group>
              )}
          </group>
        )
        return (
          <group key={dish.id} ref={(g) => { groups.current[i] = g }}
            position-x={slot(i, active, DISHES.length) * SPACING}>
            {/* (only the dish on screen is loaded, unless the device can hold all three; a shop with food out stays
                loaded though, or switching away and back would throw away everything on it and start it over) */}
            {(QUALITY.allDishes || i === active || inUse.includes(dish.id)) && <Suspense fallback={null}>
              {/* (its full model, on every device that draws in 3D (the owner's: there's no light one now)) */}
              {models(dish.model)}
              {/* toon ramps blow out easily, so the firelight stays modest */}
              {/* (the flames from the salt bed's surface up through the charcoal stood round them, licking out over its top) */}
              {dish.heat === 'fire' && <group position={dish.roast ? [FIRE_SHIFT.x, PIT_LIFT + 0.19, FIRE_SHIFT.z] : undefined}><Fire width={0.5} height={0.75} baseIntensity={look.fire} level={fire} /></group>}
              <group position={dish.roast ? [FIRE_SHIFT.x, PIT_LIFT, FIRE_SHIFT.z] : undefined}>
              {dish.smoke && (
                // same white puffs as the soup steam, just taller and slower
                // (more, fainter sheets crossed at more angles, so from above it's a soft haze and not a few bright blades)
                <Steam position={[0, dish.smoke.y, 0]} width={dish.smoke.width} height={dish.smoke.height} layers={7}
                  opacity={theme === 'dark' ? 0.3 : 0.4} speed={0.05}
                  level={dish.heat === 'fire' ? grillSmoke : undefined} face />
              )}
              {dish.smoke && dish.heat === 'fire' && (
                // burning food: thick dark smoke that boils up faster and rolls about more than the pale smoke
                <Steam position={[0, dish.smoke.y, 0]} width={dish.smoke.width * 1.25} height={dish.smoke.height * 1.2}
                  layers={5} opacity={0.75} speed={0.11} color="#3a3430" shade="#1c1916" level={grillBlackSmoke} face />
              )}
              </group>
            </Suspense>}
          </group>
        )
      })}

      {/* (the hangings that come between the camera and what it's looking at fade out of the way) */}
      <OccluderFade target={occluderTarget} />
      {/* (every round shadow under someone, drawn at once (item 804)) */}
      <BlobShadows />
      {/* (how each piece is drawn, as set piece by piece in developer mode's Render section) */}
      <RenderPrefsApply />
      <SceneTally />
      {/* (edit mode: the views marked where they look, numbered, as Sketchfab's annotations; camera 1 itself isn't placed by hand any more) */}
      {/* (the views: their numbered spots in the room while the view menu's open; in edit mode each view's camera, to be placed by hand) */}
      {pins && !editing && <ViewMarkers lang={lang} onPick={onView} />}
      <ViewCams editing={editing} lang={lang} pose={poseOf} />
      {/* (a group picked in developer mode: its own handles, to move, turn and size it as one) */}
      <GroupGizmo />
      {/* (developer mode's wireframe, 4 / 5) */}
      <WireView />
      <ShadeView />
      <FocusTracker />
      {editing && <AxisWidget />}
      {/* (what's chosen in developer mode the only thing at full light, the rest darkened (item 213)) */}
      {editing && <SelectionDim />}
      <OrbitControls
        ref={controls}
        // shared as the scene's controls so dragging a seasoning onto food can hold the camera still
        makeDefault
        target={[0, DISHES[0].focusY, 0]}
        // the middle button (or the right) drags the view sideways; the left one turns it
        enablePan
        screenSpacePanning
        mouseButtons={{ LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.PAN }}
        // on a touch screen one finger swipes between dishes (App), so turning the view takes two fingers,
        // which also pinch to zoom
        touches={IS_TOUCH ? { ONE: -1 as unknown as THREE.TOUCH, TWO: THREE.TOUCH.DOLLY_ROTATE } : undefined}
        minDistance={1.8}
        maxDistance={24}
        maxPolarAngle={Math.PI * 0.45}
        // the wheel is handled below for a smooth glide; rotation eases to a stop, quickly (the owner's: at 0.08 the view went on drifting
        // a good while after it was let go, and seemed to move by itself); never turning on its own
        enableZoom={IS_TOUCH}
        enableDamping
        dampingFactor={0.25}
        autoRotate={false}
        onStart={() => { homing.current = false }}
      />
    </>
  )
}
