/**
 * After work (items 770 and 796, the owner's 「如果有住宿，下班就有機會跟員工培養感情」「下班後的選項得改變，且男女不同」, a shot of the waitress
 * clicked after work and offered only 稱讚 and 催促): one of the staff off duty isn't praised for the day's work or hurried on (the shop's done
 * with them) but spent a little time with. Anyone, a word of thanks for the day, once a day. Those who live upstairs, an hour together of a
 * night, once a night, as each would take it: his a beer, a game of shogi, the ball game on the radio; hers tea and a chat, a late bite out,
 * her home town (that one only once she's fond of the owner). And now and then a night when one of them comes to the owner of their own
 * accord (nightBond: the fonder, the more often), a little less than when he asks.
 */
export type AfterId = 'thanks' | 'beer' | 'shogi' | 'radio' | 'tea' | 'latebite' | 'hometown'
export type AfterAct = {
  id: AfterId
  /** the button's few words, and what it is in full (its hint) */
  label: [string, string, string]; hint: [string, string, string]
  /** their bond with the owner up by this; only once it's this or more; only for those living upstairs; whose it is; what it costs (NT$) */
  bond: number; minBond: number; dorm: boolean; who: 'any' | 'f' | 'm'; cost: number
}
export const AFTER_ACTS: readonly AfterAct[] = [
  { id: 'thanks', label: ['辛苦了', 'お疲れさま', 'Thanks'], hint: ['道聲「今天辛苦了」', '「今日もお疲れさま」と声をかける', 'Thank them for the day'],
    bond: 1, minBond: 0, dorm: false, who: 'any', cost: 0 },
  { id: 'beer', label: ['喝一杯', '一杯やる', 'A beer'], hint: ['從冷藏櫃拿兩罐啤酒，一起喝一杯', '冷蔵庫から缶ビールを二本、一緒に一杯', 'Two cans from the fridge, a beer together'],
    bond: 4, minBond: 0, dorm: true, who: 'm', cost: 120 },
  { id: 'shogi', label: ['下將棋', '将棋', 'Shogi'], hint: ['擺出棋盤，下一盤將棋', '盤を出して将棋を一局', 'Out with the board, a game of shogi'],
    bond: 3, minBond: 0, dorm: true, who: 'm', cost: 0 },
  { id: 'radio', label: ['聽棒球', '野球中継', 'Ball game'], hint: ['開收音機，一起聽棒球轉播', 'ラジオで野球中継を一緒に聴く', 'The ball game on the radio together'],
    bond: 3, minBond: 30, dorm: true, who: 'm', cost: 0 },
  { id: 'tea', label: ['喝杯茶', 'お茶', 'Tea'], hint: ['泡一壺熱茶，陪她聊聊天', 'お茶を淹れて、少し話す', 'A pot of tea and a chat'],
    bond: 3, minBond: 0, dorm: true, who: 'f', cost: 0 },
  { id: 'latebite', label: ['請吃宵夜', '夜食', 'Late bite'], hint: ['帶她去巷口的攤子吃碗熱湯麵', '路地の屋台で温かいそばをご馳走する', 'A bowl of hot noodles at the stall up the lane, on the owner'],
    bond: 4, minBond: 0, dorm: true, who: 'f', cost: 300 },
  { id: 'hometown', label: ['聊家鄉', '故郷の話', 'Home town'], hint: ['聽她說說家鄉的事', '故郷の話を聞く', 'Hear about where she grew up'],
    bond: 5, minBond: 55, dorm: true, who: 'f', cost: 0 },
]

export type AfterOne = { female: boolean; lives: boolean; bond: number }
export type AfterDone = { afterDay?: number; thankDay?: number }
/** why one can't be done now: done already today (the thanks) or tonight (the hour together), or not fond enough yet */
export type AfterWhy = 'done' | 'bond' | null

/** what can be done with this one after work today (`day`, the business day): theirs, each with why not, if not */
export function afterActs(p: AfterOne, done: AfterDone, day: number): { act: AfterAct; why: AfterWhy }[] {
  return AFTER_ACTS
    .filter((a) => (a.who === 'any' || (a.who === 'f') === p.female) && (!a.dorm || p.lives))
    .map((a) => {
      const did = a.dorm ? done.afterDay === day : done.thankDay === day
      return { act: a, why: did ? 'done' : p.bond < a.minBond ? 'bond' : null }
    })
}
/** the same day's done marks, after `id` was done */
export function afterDone(done: AfterDone, id: AfterId, day: number): AfterDone {
  const a = AFTER_ACTS.find((x) => x.id === id)
  if (!a) return done
  return a.dorm ? { ...done, afterDay: day } : { ...done, thankDay: day }
}

/** a number 0..1 from a name and a day, the same each time */
function chance(id: string, day: number) {
  let h = 2166136261 ^ day
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619)
  h = Math.imul(h ^ (h >>> 15), 2246822507)
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296
}
/** how often one living upstairs comes to the owner of their own accord of a night: a little at the start, more as they're fonder */
export const nightOdds = (bond: number) => 0.1 + Math.max(0, Math.min(100, bond)) / 500
/** what they come to share with him (half what it is when he asks), on the night of `day`: one of theirs they're fond enough for, or nothing
 * (not every night; not one living out; not one he's already spent the hour with) */
export function nightBond(p: AfterOne & { id: string }, day: number, done: AfterDone = {}): { act: AfterAct; bond: number } | null {
  if (!p.lives || done.afterDay === day || chance(p.id, day) >= nightOdds(p.bond)) return null
  const ok = AFTER_ACTS.filter((a) => a.dorm && a.cost === 0 && (a.who === 'f') === p.female && p.bond >= a.minBond)
  if (!ok.length) return null
  const act = ok[Math.floor(chance(p.id, day + 7919) * ok.length)]
  return { act, bond: Math.max(1, Math.round(act.bond / 2)) }
}
