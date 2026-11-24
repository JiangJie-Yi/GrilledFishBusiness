import * as THREE from 'three'
import { type ViewId } from '@/data/views'
import { positionOf, rotationOf, type V3 } from '@/shops/grill/edit'

// the one camera pose every dish is framed from (blender/open_live.py matches Blender's camera to it)
export const CAMERA_POSITION: [number, number, number] = [2.9, 2.2, 4.0]
/** the second view the eye button gives (at the grill): from high up at 45 degrees, the whole shop in it */
export const OVERVIEW_TARGET = new THREE.Vector3(0.0, 0.3, -1.2)
/** the top-down view (item 181): the point it looks straight down on (the shop's middle as it's seen from above: from its back wall to the
 * genkan's door, the street outside it left out, 3.4 back along the bar from the world's origin), how high over it the camera is (with its
 * 32° lens all of it in a 16:9 frame, the shrine on the back wall in too), and the way to the room's open side (LAY), the hair the camera stands
 * off toward it so the bar's length lies across the screen */
export const TOP_AT = new THREE.Vector3(-2.9, -0.5, 1.85)
// (the controls' furthest: further, and it's held at 24 anyway)
export const TOP_UP = 24
export const TOP_OPEN = new THREE.Vector3(0.59, 0, 0.81).normalize()
export const OVERVIEW_POSITION = new THREE.Vector3(21.7, 15.5, 2.2)
export const CAMERA_FOV = 40
/** the lens of the view through the owner's eyes: wide, as a first-person view is */
export const WIDE_FOV = 85
/** how long the camera takes flying from one view to another (s), eased in and out */
export const FLY_S = 0.9
/** how far round the room upstairs may be turned either way from straight on at its open front (rad, item 426): to 70 degrees, its side
 * walls still between the camera and the outside */
export const UP_TURN = 1.22
/** which way along his own z the owner faces (+1 or -1): his view's looked out along it */
export const OWNER_FACING = 1

/**
 * How far to pull the camera back for this viewport. The dishes are framed for a landscape stage;
 * on portrait or narrow stages the horizontal field of view shrinks, so back off until they fit again.
 */
export const cameraDistanceScale = (aspect: number) =>
  // (a portrait phone stage needs to stand well back, so the things laid out either side of the fire fit too)
  aspect >= 1.3 ? 1 : Math.min(3.4, (1.3 / aspect) * (aspect < 1 ? 1.4 : 1))

/** the turn (X, Y, Z degrees) a view's camera starts with, set by the owner in edit mode (its place is in edit.ts's BASES) */
export const VIEWCAM_TURN: Partial<Record<ViewId, V3>> = { free: [0, 15, 5] }
/** whether a view's camera has been placed (moved or turned in edit mode, or set so to begin with) */
export const viewCamPlaced = (id: ViewId) => [...positionOf(`viewcam-${id}`), ...rotationOf(`viewcam-${id}`), ...(VIEWCAM_TURN[id] ?? [])].some((x) => Math.abs(x) > 1e-6)

/** the view switched to the free one with the camera left where it is (entering edit mode: the owner's), not glided to the free view's own
 * place: set just before the switch, taken by the camera's homing */
export const HOLD_POSE = { next: false }
