// The owner walked by the player through his own eyes (item 748, the owner's 「當老闆視角切成第一人稱時，可WASD移動，空白跳躍。」): W and S
// along the way he faces, A and D to turn him (the view's his eyes, turning as he turns: no mouse to look round with there), Space a jump.
// Pure: the 3D (staff/Boss) reads the keys, asks where he may stand (the shop's walk map, his round's line) and moves him.

/** his pace walked forward, stepping back (units a second, his frame's), turning (radians a second), and a jump's spring (world units a
 * second up, as his gravity's world 9 a second a second: a hop of about 0.3 up) */
export const DRIVE = { walk: 1.1, back: 0.55, turn: 2.4, jump: 2.4 }
/** the keys held: forward, turn left, back, turn right */
export type DriveKeys = { w: boolean; a: boolean; s: boolean; d: boolean }
export const noKeys = (k: DriveKeys) => !k.w && !k.a && !k.s && !k.d

/** a frame of it: his new facing (A left, D right: yaw up turns him from +z toward +x), and the step along it (W forward, S back) */
export function driveStep(k: DriveKeys, yaw: number, dt: number): { yaw: number; dx: number; dz: number } {
  const y = yaw + ((k.a ? 1 : 0) - (k.d ? 1 : 0)) * DRIVE.turn * dt
  const along = ((k.w ? DRIVE.walk : 0) - (k.s ? DRIVE.back : 0)) * dt
  return { yaw: y, dx: Math.sin(y) * along, dz: Math.cos(y) * along }
}

/** from (x, z) by (dx, dz), where `ok` says he may stand: the whole step, else along x or along z alone (sliding along what's in his way,
 * as one walking into a wall at a slant does), else not at all */
export function slide(x: number, z: number, dx: number, dz: number, ok: (x: number, z: number) => boolean): [number, number] {
  if (ok(x + dx, z + dz)) return [x + dx, z + dz]
  if (dx && ok(x + dx, z)) return [x + dx, z]
  if (dz && ok(x, z + dz)) return [x, z + dz]
  return [x, z]
}

/** on his feet (on the floor, not already up in a jump or coming down from one): may jump */
export const canJump = (y: number, ground: number, vy: number) => Math.abs(y - ground) < 0.005 && Math.abs(vy) < 1e-3
