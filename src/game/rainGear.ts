// The customers' things against the rain (item 623, part three; the owner's 「進來的客人會穿雨衣或帶雨傘」): who comes in with an umbrella,
// who in a raincoat, in what colour; the umbrella stand's places; and the beats of their moments with them, at the sliding door (an
// umbrella closed and put in the stand coming in, taken out and opened going) and at the genkan's step (a raincoat off and folded coming
// in, put on going), each a pose at a time into it. Pure rules: the shop (GuestBar3D) times them, the figure (FolkFigure) takes the pose.

import { unit2 } from './commute'
import { rainGear } from './weather'

/** the umbrellas' colours: navy, wine, black, khaki, and the clear vinyl one (ビニール傘) nearly everyone in Japan has one of */
export const UMB_COLOURS = [
  { name: 'navy', hex: '#2f4168' }, { name: 'wine', hex: '#7c2a36' }, { name: 'black', hex: '#2a2a30' },
  { name: 'khaki', hex: '#b39f78' }, { name: 'vinyl', hex: '#e4edf2' },
] as const
/** which is the clear one (drawn see-through while it's open) */
export const VINYL = UMB_COLOURS.findIndex((c) => c.name === 'vinyl')
/** the raincoats' colours: navy, olive, a children's yellow, a pale grey poncho */
export const COAT_COLOURS = [
  { name: 'navy', hex: '#2c4a7c' }, { name: 'olive', hex: '#66703f' }, { name: 'yellow', hex: '#e8b62c' }, { name: 'grey', hex: '#aeb9c0' },
] as const

/** what a customer coming in now has against the rain: as the weather has it (an umbrella, a raincoat, nothing), but one carrying a
 * briefcase brings an umbrella rather than a raincoat (their left hand's the briefcase's, where a folded raincoat would go) */
export function gearOf(id: number, rain: number, briefcase: boolean): 'umbrella' | 'coat' | null {
  const g = rainGear(id, rain)
  return g === 'coat' && briefcase ? 'umbrella' : g
}

/** their umbrella's colour (its index in UMB_COLOURS): about a third the clear vinyl kind, the rest the others alike */
export function umbrellaOf(id: number): number {
  const r = unit2(id, 12)
  return r < 0.32 ? VINYL : Math.floor(((r - 0.32) / 0.68) * 4) % 4
}

/** their raincoat's colour (its index in COAT_COLOURS): a child's always yellow; a grown-up's navy, olive or grey, never yellow */
export function coatOf(id: number, kid: boolean): number {
  if (kid) return 2
  const r = unit2(id, 13)
  return r < 0.45 ? 0 : r < 0.75 ? 1 : 3
}

/** the stand's places: five round its inside and one in the middle, then three leant against its outside, by the door */
export const STAND_SLOTS = 9
/** the first free place in the stand (`used`: each place, taken or not), -1 if there's none */
export const freeSlot = (used: readonly boolean[]) => used.findIndex((u) => !u)

const ss = (x: number, a: number, b: number) => (x <= a ? 0 : x >= b ? 1 : ((x - a) / (b - a)) ** 2 * (3 - 2 * ((x - a) / (b - a))))

/** an umbrella's pose at a moment of a beat: how open (1) or furled (0); how far turned over, tip down (1); a jolt down as it's shaken
 * (0..1); how far the hand's out to the stand (0..1) and raised over it (1: its tip clear of the rim); how far they're turned to the stand
 * (0..1); whether it's stood in the stand (out of the hand) */
export type UmbPose = { open: number; flip: number; shake: number; reach: number; lift: number; turn: number; inStand: boolean }
export const newUmbPose = (): UmbPose => ({ open: 1, flip: 0, shake: 0, reach: 0, lift: 0, turn: 0, inStand: false })

/** coming in, how long after they show at the door they start closing it (the door's sliding open for them meanwhile) */
export const UMB_CLOSE_AT = 0.6
/** coming in, how long their moment at the door takes from when they show (s): closed, turned over, shaken, put in the stand, turned back */
export const UMB_IN_S = UMB_CLOSE_AT + 2.3
/**
 * Coming in with an umbrella (`t` s since they showed out on the step, under it): a moment under it as the door slides open; closed (0.5 s);
 * turned over, tip down (0.35); shaken twice; turned to the stand, the hand out to it high, the tip over the rim; lowered in (0.3) and let
 * go; turned back to the door. Writes into `p`.
 */
export function umbInBeat(t: number, p: UmbPose): UmbPose {
  const a = t - UMB_CLOSE_AT
  p.open = 1 - ss(a, 0, 0.5)
  p.flip = ss(a, 0.5, 0.85)
  const sh = (a - 0.85) / 0.35
  p.shake = sh > 0 && sh < 1 ? Math.sin(Math.PI * ((sh * 2) % 1)) ** 2 : 0
  const back = ss(a, 2.0, 2.3)
  p.turn = ss(a, 1.2, 1.45) * (1 - back)
  p.reach = ss(a, 1.3, 1.7) * (1 - back)
  p.lift = a < 1.7 ? 1 : 1 - ss(a, 1.7, 2.0)
  p.inStand = a >= 2.0
  return p
}

/** going out, how long their moment at the stand takes (s): longer when it's raining (opened) */
export const umbOutS = (raining: boolean) => (raining ? 1.95 : 1.1)
/**
 * Going out with an umbrella in the stand (`t` s since they came out to the step): turned to the stand, the hand to its handle, taken and
 * pulled up out of it, the hand back; raining, turned over (tip up) and opened over them; dry, held furled, tip down. Writes into `p`.
 */
export function umbOutBeat(t: number, raining: boolean, p: UmbPose): UmbPose {
  const back = ss(t, 0.8, 1.1)
  p.turn = ss(t, 0, 0.3) * (1 - back)
  p.reach = ss(t, 0.15, 0.45) * (1 - back)
  p.inStand = t < 0.45
  p.lift = t < 0.45 ? 0 : ss(t, 0.45, 0.8)
  p.shake = 0
  p.flip = raining ? 1 - ss(t, 1.1, 1.45) : 1
  p.open = raining ? ss(t, 1.45, 1.95) : 0
  return p
}

/** a raincoat's moment: whether it's on them; their hands at its collar, spread out and back as it's shrugged off (or on), folding it in
 * front (0..1 each); the folded coat: 0 none, 1 between their hands, 2 in their left hand */
export type CoatPose = { worn: boolean; collar: number; spread: number; fold: number; bundle: 0 | 1 | 2 }
export const newCoatPose = (): CoatPose => ({ worn: true, collar: 0, spread: 0, fold: 0, bundle: 0 })

/** how long taking a raincoat off at the step takes, and putting it on (s), on top of the shoes */
export const COAT_OFF_S = 1.0, COAT_ON_S = 1.0
/** taking it off (`t` s into it): the hands to the collar, shrugged off (it's off as they spread), folded in front, into the left hand */
export function coatOffBeat(t: number, p: CoatPose): CoatPose {
  p.collar = ss(t, 0, 0.25) * (1 - ss(t, 0.3, 0.45))
  p.spread = ss(t, 0.3, 0.45) * (1 - ss(t, 0.5, 0.65))
  p.worn = t < 0.42
  p.fold = ss(t, 0.55, 0.7) * (1 - ss(t, 0.85, 1.0))
  p.bundle = t < 0.6 ? 0 : t < 0.88 ? 1 : 2
  return p
}
/** putting it on (`t` s into it): the folded coat out of the left hand, shaken open, arms in (it's on as they spread), the collar set */
export function coatOnBeat(t: number, p: CoatPose): CoatPose {
  p.bundle = t < 0.15 ? 2 : t < 0.3 ? 1 : 0
  p.fold = ss(t, 0, 0.15) * (1 - ss(t, 0.25, 0.4))
  p.spread = ss(t, 0.3, 0.45) * (1 - ss(t, 0.5, 0.65))
  p.worn = t >= 0.45
  p.collar = ss(t, 0.55, 0.7) * (1 - ss(t, 0.85, 1.0))
  return p
}
