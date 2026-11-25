// A customer's shoes (item 712, the owner's 「鞋子太過簡單，有點造型、多樣點」): which of the five kinds they wear, by who they are (the
// salaryman and the schoolchildren in leather (the school's loafers), the office lady in pumps, the students and the tourists in sneakers,
// the biker, the builder and the fish market's in boots, the old and the lady in yukata in zori), and its colour of that kind's own (each
// customer the same every time); written as a cubby keeps them ('kind|#rrggbb') and read back. Pure: the genkan draws them.
import { kindOf, type GuestKind } from '@/data/guests'

export type ShoeKind = 'sneaker' | 'leather' | 'pump' | 'boot' | 'zori'
export const SHOE_KINDS: readonly ShoeKind[] = ['sneaker', 'leather', 'pump', 'boot', 'zori']

/** who wears what (anyone not here, sneakers) */
const BY_GUEST: Partial<Record<GuestKind, ShoeKind>> = {
  salaryman: 'leather', civilServant: 'leather', uncle: 'leather', taxiDriver: 'leather', schoolboy: 'leather', schoolgirl: 'leather',
  officeLady: 'pump', maidCoser: 'pump', housewife: 'pump',
  gyaru: 'boot', bosozoku: 'boot', constructionWorker: 'boot', marketWorker: 'boot', bandman: 'boot',
  grandpa: 'zori', grandma: 'zori', yukataLady: 'zori',
}
/** each kind's colours, as such shoes come: the sneakers' white, navy, red, grey and cream; the leather's black and browns; the pumps'
 * black, wine, beige and navy; the boots' browns, black and olive; the zori's red, navy, straw and black */
export const SHOE_PALETTE: Record<ShoeKind, readonly string[]> = {
  sneaker: ['#f2f2ee', '#2b3a55', '#c23b32', '#7c8a96', '#e8d9b8'],
  leather: ['#2a1f1a', '#5a3a24', '#1c1c1e', '#7a4e2c'],
  pump: ['#1c1c1e', '#9b2335', '#d8c3a5', '#2b3a55'],
  boot: ['#4a3020', '#2a2522', '#8a6a48', '#4a5232'],
  zori: ['#b83a3a', '#2b3a55', '#c9a46e', '#1e1e1e'],
}

/** a customer's shoes: their kind by who they are, their colour of that kind's by the customer */
export function shoeOf(id: number): { kind: ShoeKind; colour: string } {
  const kind = BY_GUEST[kindOf(id).kind] ?? 'sneaker'
  const pal = SHOE_PALETTE[kind]
  return { kind, colour: pal[Math.abs(Math.imul(id, 2654435761) >>> 7) % pal.length] }
}
/** as a cubby keeps them */
export const shoeKey = (id: number) => { const s = shoeOf(id); return `${s.kind}|${s.colour}` }
/** a cubby's back to the shoes (an old plain colour, before the kinds: sneakers of it) */
export function readShoeKey(key: string): { kind: ShoeKind; colour: string } {
  const [k, c] = key.split('|')
  return (SHOE_KINDS as readonly string[]).includes(k) && c ? { kind: k as ShoeKind, colour: c } : { kind: 'sneaker', colour: key }
}
