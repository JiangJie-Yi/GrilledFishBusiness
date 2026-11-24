import { getClock } from '@/ui/kit/clockStore'

/** closing up, by the game's minutes past closing time: those still in hurried out (half an hour), the shop shut whoever's left (an hour) */
export const CLOSE_HURRY = 30
export const CLOSE_HARD = 60
/** where the clock's put when the day's sheet is put away: the next day's getting ready, half an hour before opening (16:30) */
export const PREP_AT = 16 * 60
export const gameMinutes = () => getClock().day * 1440 + getClock().minute
/** the charcoal burns down from full to out in 90 minutes (the fire level is stepped every 200ms) */
export const FIRE_BURN_PER_TICK = 1 / (90 * 60 * 5)
