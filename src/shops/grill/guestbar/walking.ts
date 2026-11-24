import * as THREE from 'three'

/** where a sound's heard from, worked out in place */
export const SOUND_AT = new THREE.Vector3()

/*
 * The customers, in 3D, at the bar behind the cooking (only while the shop is open). A long counter of pale hinoki
 * on a dark panelled front, stools along the far side; a customer walks in from the end of the bar, sits on a free
 * stool facing the cook, waits ("…"), eats (leaning in, chopsticks going), and when they're done gets up and walks
 * off — their face says how it was. They're dressed as what they are (guests.ts).
 *
 * The plates are handled for real: a stack of clean ones at the left end of the bar; as a customer sits down one is
 * lifted off the top and set in front of them; when they get up it's cleared onto the dirty stack at the right
 * end, which, once it's grown, is taken back to be washed and comes back to the clean stack plate by plate.
 */

export const LAY = new THREE.Vector3(0.59, 0, 0.81)       // toward the camera (the cook's side)
export const ALONG = new THREE.Vector3(0.81, 0, -0.59)    // along the first counter
export const SPEED = 1.32                                  // how fast they walk in and out (per second: unhurried, the owner's)
/** how long the third cook rakes the fire over with the irons (item 108) */
export const RAKE_S = 1.6
export const SERVER_SPEED = 2.1                            // and the servers, carrying (brisk)
/** how far along a server's way they've got `t` seconds in (item 183): up to their pace over the first fifth of a second (a start from a
 * standstill), then at it; never past its end `len` */
const SERVER_RAMP = 0.2
export const rampedAlong = (t: number, len: number) => Math.min(len, t < SERVER_RAMP ? (SERVER_SPEED * t * t) / (2 * SERVER_RAMP) : SERVER_SPEED * (t - SERVER_RAMP / 2))
// (stepping aside for each other (the owner's item 45): how far ahead they see someone coming (seconds), how quick a step aside is (per
// second: about a walk), the fastest anyone walks (a quicker move between two frames is a leap, a phase begun elsewhere, not a walk))
export const AHEAD_S = 0.6, ASIDE_V = 1.5, WALK_MOST = 3.2
export const STOCKER_KEY = -99
/** (item 659) the owner among those stepping aside for each other (he keeps to his way), and his place this frame, the bar's frame */
export const BOSS_KEY = -98
export const BOSS_AT = new THREE.Vector3()
/** those waiting on the genkan's bench, among those stepping aside for each other: keyed apart from the customers (SITTER_KEY less their id) */
export const SITTER_KEY = -1000
