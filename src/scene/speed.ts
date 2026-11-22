import { frameStep } from '@/game/framePace'

/**
 * How fast the game runs (1, or 2 with the ×2 button; 0 while it's paused: developer mode during business, the owner's): the 3D scene's
 * clock (FramePacer) and the shop's own timers all go this many times faster, or stand still.
 */
export const GAME_SPEED = { value: 1 }
if (import.meta.env?.DEV && typeof window !== 'undefined') Object.assign(window, { __gameSpeed: GAME_SPEED })
/** whether the game's standing still just now */
export const paused = () => GAME_SPEED.value === 0
/** a frame's step of the game's time as figures and timers take it (game/framePace frameStep, at the game's speed) */
export const tick = (dt: number) => frameStep(dt, GAME_SPEED.value)
