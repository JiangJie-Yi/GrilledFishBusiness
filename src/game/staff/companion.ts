// Staying, to be near him (item 696, the owner's, 2026-11-25: 「好感度達到一定的女員工會詢問可否住下來，且必（閉）店時也會待在1樓陪老闆，睡覺時會上
// 樓一起睡。」): a woman of the staff, of age, this fond of the owner, asks whether she may stay: not for the commute (game/lodging's asking),
// to be near him. Said yes, she lives upstairs and is his companion: while the shop's shut by day she's downstairs with him, sat at the bar
// by the fire with a cup of tea; at the night's end the two of them go up the stair, and sleep side by side (game/nightTogether: every
// night, not by chance). Said no, a little hurt, she asks again in a week. One at a time. Fallen out of fondness (under COMPANION_KEEP) she's
// his companion no longer (living in as she was). Pure rules; App keeps it on her rota and asks them as each day ends, the office's
// relations card has the yes and no.
import { ADULT } from './nightTogether'

/** how fond she must be to ask */
export const COMPANION_AT = 75
/** under this, it's over */
export const COMPANION_KEEP = 55
/** days before asking again after a no */
export const COMPANION_ASK_AGAIN = 7
/** a no: a little hurt */
export const COMPANION_NO_BOND = -4
/** a yes: glad */
export const COMPANION_YES_BOND = 5
/** a day as his companion: a little fonder */
export const COMPANION_DAY_BOND = 1

/** one of the staff, as these rules need them */
export type Mate = { id: string; female: boolean; years: number; bond: number; lives?: boolean; companion?: boolean; compAsk?: number; compNo?: number }

/** whether she could ask: a woman of age, this fond */
export const mayAskToStay = (m: Mate) => m.female && m.years >= ADULT && m.bond >= COMPANION_AT

/**
 * Whether she asks today (`today`: the business day about to begin): she could, isn't his companion already, hasn't an ask still waiting,
 * wasn't turned down in the last week; no one else is (`taken`); and there's a place for her upstairs (`room`) unless she lives there already
 */
export function asksToStay(m: Mate, today: number, taken: boolean, room: boolean) {
  if (!mayAskToStay(m) || m.companion || taken) return false
  if (m.compAsk !== undefined && m.compAsk >= 0) return false
  if (m.compNo !== undefined && today - m.compNo < COMPANION_ASK_AGAIN) return false
  return !!m.lives || room
}

/** her answer taken: yes, she lives upstairs as his companion, gladder; no, a little hurt, and she'll wait a week */
export function answerStay(m: Mate, yes: boolean, today: number): Mate {
  const bond = Math.max(0, Math.min(100, m.bond + (yes ? COMPANION_YES_BOND : COMPANION_NO_BOND)))
  return yes ? { ...m, bond, lives: true, companion: true, compAsk: undefined } : { ...m, bond, compAsk: undefined, compNo: today }
}

/** whether she's still his companion: living upstairs, fond enough */
export const staysCompanion = (m: Mate) => !!m.companion && !!m.lives && m.bond >= COMPANION_KEEP

/** a day as his companion: a little fonder */
export const companionDayBond = (m: Mate) => (staysCompanion(m) ? COMPANION_DAY_BOND : 0)

/**
 * Whether she's downstairs with him now (`minute`: the clock's minute of the day; `open`: the shop open for business; `asleep`: the night's
 * sleeping hours): by day while the shop's shut and she's up and about; not while it's open (at work, or upstairs on her day off), not asleep
 */
export const keepsHimCompany = (m: Mate, open: boolean, asleep: boolean) => staysCompanion(m) && !open && !asleep
