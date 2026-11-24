import { type Sky } from '@/game/clock'

export type Theme = 'light' | 'dark'

export const LIGHTING: Record<Sky, { sun: string; sunIntensity: number; sky: string; ground: string; hemi: number;
  spot: number; fire: number; shadow: string; shadowOpacity: number
  /** how much of the sky's light the room's environment gives (the soft fill from all round) */
  env: number }> = {
  // golden-hour sun and a cool sky fill
  // (the even fill from all round a little under the sun (item 306): at 1 it lit every side alike, nothing in shade by day; item 378, the
  // owner's 「白天的陰影感要明確」: the fill down further, the sun up, so what's in shade by day reads as shade)
  day: { sun: '#ffe7c2', sunIntensity: 2.4, sky: '#cfe0ff', ground: '#7a6450', hemi: 0.68, spot: 18, fire: 2,
    shadow: '#000000', shadowOpacity: 0.28, env: 0.8 },
  // the early sun, rosy and not yet strong, low from the room's far side; the rest of the room still in the cool of the night going
  // (the owner's: dawn and dusk between day and night)
  dawn: { sun: '#ffbfa6', sunIntensity: 1.15, sky: '#a9b4e6', ground: '#54464c', hemi: 0.85, spot: 22, fire: 2.5,
    shadow: '#000000', shadowOpacity: 0.32, env: 0.72 },
  // the evening sun, a warm amber-gold, low in through the round window; a dusky violet sky over warm ground (the owner: deep orange was
  // too red)
  dusk: { sun: '#ffb46e', sunIntensity: 1.5, sky: '#b6b2d6', ground: '#6e5848', hemi: 0.95, spot: 24, fire: 3,
    shadow: '#000000', shadowOpacity: 0.36, env: 0.88 },
  // moonlight; the warm spot, fire and burners carry the scene. The even fill from all round (hemi, env) turned well down (item 194, the
  // owner's, 2026-11-16: "the shop's light by night isn't enough, and isn't real"): it lit every corner alike, brighter than by day; the
  // pendants' own lights (DiningRoom's PendantLight) carry the room now, a pool under each, the corners darker
  night: { sun: '#b8c4ff', sunIntensity: 0.9, sky: '#6a6274', ground: '#3a2c20', hemi: 0.75, spot: 30, fire: 4,
    shadow: '#000000', shadowOpacity: 0.45, env: 0.6 },
}

// a warm lamp hanging above and in front of the dish, like over a stall counter
export const SPOT_POSITION: [number, number, number] = [1.2, 4.2, 2.2]
export const SPOT_SOFTNESS = 6
