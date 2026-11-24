import * as THREE from 'three'
import { rimmedTray } from '@/scene/trayGeometry'
import { SERVE_TOP, newStationPose } from '@/shops/grill/SakeStation'
import { RICE_BEATS, SOUP_BEATS, beatsLength } from '@/game/kitchen/sides'

/** the customers (and their stools) at life size beside the bar, which is drawn to match them */
export const PEOPLE_SCALE = 1.3
/** the staff (the servers) drawn the boss's height, a head shorter than the customers: the boss (Roasting's BOSS_SCALE) is 0.95 tall at 1.68,
 * a figure here 0.97 tall at this and the shop's own scale of 2 */
export const STAFF_SCALE = (1.05 * 0.8 * 2 * 0.95) / (0.97 * 2)
/** the rice ball in the third cook's hands (item 129): a squashed icosphere (no pole), and a band of nori round its foot */
export const BALL_GEO = new THREE.IcosahedronGeometry(0.03, 1).scale(1, 0.95, 0.68)
export const BALL_NORI_GEO = new THREE.BoxGeometry(0.034, 0.022, 0.044)
/** the owner's figure out serving, inside a server's frame (STAFF_SCALE): his own height (Roasting's BOSS_SCALE in the shop's frame) */
export const OWNER_IN_STAFF = (1.05 * 0.8) / STAFF_SCALE
export const OWNER_HAND = new THREE.Vector3()
/** the sake station's pour as it's drawn this frame (item 177): the bottle and the tokkuri's poses, and the pourer's hands in the world (on
 * while the pour's on); where the tokkuri's server holds their tray, and the way they face */
export const STATION_POSE = newStationPose()
export const SAKE_HANDS = { left: new THREE.Vector3(), right: new THREE.Vector3() }
export const SAKE_HANDS_ON = { v: false }
/** the hands of the one filling a bowl of rice or of soup (items 205, 206: SideBowls' poses), in the world, and whether one's filling now */
export const BOWL_HANDS = { left: new THREE.Vector3(), right: new THREE.Vector3() }
export const BOWL_HANDS_ON = { v: false }
/** (item 387) the plater's hands stirring the soup (the world's): the right on the dipper over the pot's near half, the left on its rim */
export const STIR_HANDS = { left: new THREE.Vector3(), right: new THREE.Vector3() }
export const STIR_HANDS_ON = { v: false }
/** (items 461, 469) the third cook's hands at the stove or the fryer, in the world: on the pan's handle and by the pan */
export const COOK_HANDS = { left: new THREE.Vector3(), right: new THREE.Vector3() }
export const COOK_HANDS_ON = { v: false }
/** (item 509) the plater's jobs at the work counter, whose top comes up to his chin: the soup stirred, the rice balls shaped, the daikon
 * grated, a dish at its station, the rice and the soup ladled into their bowls */
export const AT_WORK_COUNTER = new Set(['stir', 'shape', 'grate', 'cookStation', 'riceBowl', 'soupBowl'])
/** how far he's drawn back off the counter at those but the stations (whose own place, Stove's STAND_ALONG, is set back), the bar's units */
export const PLATER_BACK = 0.03
export const BACK_DIR = new THREE.Vector3()
/** (item 392) the plater's hands grating daikon at the rice-ball counter's grater (the world's): the right on the daikon, up and down the
 * grater, the left holding the grater's near end */
export const GRATE_HANDS = { left: new THREE.Vector3(), right: new THREE.Vector3() }
export const GRATE_ON = { v: false }
/** a customer's bowls left at the serving counter for a server (the counter's own frame: its left end, clear of the takeaways in its middle
 * and the sake at its right), and where the one setting them down or taking them up stands */
// (0.04 further left since the counter's 0.1 longer (items 254, 286))
// (item 660, the Tester window's: the soup bowl stood over the cloth's left edge (the cloth x -0.235 to 0.185 on the top, -0.5 to 0.5), its
// foot half on the cloth, a 3.5 mm step under it: both bowls (each about 0.1 across) now on the bare slats to the cloth's left, the soup 1.5 cm
// clear of it, the rice 1.8 cm left of the soup and 1.6 cm in from the top's end; the one taking them up stood between them)
export const BOWL_PASS = { rice: new THREE.Vector3(-0.42, SERVE_TOP, -0.035), soup: new THREE.Vector3(-0.30, SERVE_TOP, -0.035), front: new THREE.Vector3(-0.36, 0, 0.47) }
export const RICE_LEN = beatsLength(RICE_BEATS), SOUP_LEN = beatsLength(SOUP_BEATS)
/** seconds: the bowls set down at the counter; taken up onto a tray; set down at a place */
export const BOWL_PUT_S = 0.5, BOWL_UP_S = 0.45, BOWL_SET_S = 0.6
/** (item 207) how many customers' bowls wait at the counter at most (in rows at its left end: the counter's frame, z of each), and how many
 * sets a server takes out on one tray (the second to a seat along the same counter after the first): one at a time, the plater waited for
 * each customer's to be carried out before he could fill the next, and in a rush those who'd asked for rice and soup sat on half an hour
 * after their fish, waiting for them */
export const PASS_MAX = 2
/** (item 207) how long (the shop's minutes) customers' bowls wait at the counter before they're taken ahead of food ready at the plating place */
export const BOWLS_LATE = 6
export const PASS_Z = [-0.07, 0.08]
export const TRAY_SETS = 2
export const SAKE_TRAY = new THREE.Vector3()
export const SAKE_TRAY_YAW = { v: 0 }
export const OWNER_BONE = new THREE.Vector3()
/** the owner's tray: a server's rimmed lacquered one (scene/trayGeometry, item 249: a flat black disc, it read as "a black plate") */
export const OWNER_TRAY_GEO = rimmedTray(0.15, 0.024, 0.008)
