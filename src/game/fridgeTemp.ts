// The drink fridges' thermostats (item 615, the owner's, 2026-11-23: 「然後冰箱也有溫度可以調整，門開太久溫度會上升」), as the ingredient
// freezer's is (game/freezer): each its setting, a degree at a time within a drinks cooler's range, the inside drifting toward it; while a
// door's open (its front, its back's, a customer's hand in it) it warms toward the room's air instead, the longer the warmer; too warm, and a
// drink taken out isn't cold (the customer minds: game/reputation's 'warm'). Pure rules; DiningRoom's fridges keep each one's state.

/** the setting's range and where it starts (a convenience store's cooler) */
export const DRINK_MIN = 1
export const DRINK_MAX = 8
export const DRINK_DEFAULT = 4
/** the room's air by the fridges, which an open door lets in */
export const ROOM_AIR = 24
/** over this, a drink taken out isn't cold */
export const WARM_AT = 10

/** the setting after a press colder (-1) or warmer (+1), kept in range */
export const stepDrinkTemp = (set: number, dir: 1 | -1) => Math.min(DRINK_MAX, Math.max(DRINK_MIN, Math.round(set) + dir))

/** the inside's temperature after dt seconds: a door open, on toward the room's air (a degree every few seconds at first, slower as it
 * nears it); shut, the compressor brings it back to the setting (most of the way in half a minute) */
export function driftDrinkTemp(t: number, set: number, open: boolean, dt: number) {
  if (open) return t + (ROOM_AIR - t) * (1 - Math.exp(-dt / 60))
  return t + (set - t) * (1 - Math.exp(-dt / 20))
}

/** whether a drink taken out now isn't cold */
export const servedWarm = (t: number) => t > WARM_AT
