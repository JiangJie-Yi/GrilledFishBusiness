import { memo, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useSaid } from '@/ui/speechStore'
import { CALM, calmLeft, canCalm, type CalmKind } from '@/game/calm'
import { useFrame } from '@react-three/fiber'
import { Html } from '@/scene/Html'
import * as THREE from 'three'
import { MoodFace } from '@/ui/MoodFace'
import { Glyph, StarIcon } from '@/ui/GameIcons'
import { joySound, usePanelSound } from '@/ui/uiSound'
import { FolkFigure, folkSpec } from '@/scene/FolkFigure'
import { moodOf } from '@/scene/people'
import type { Lang } from '@/data/i18n'
import { DrinkBottle } from '@/shops/grill/dining/bottles'
import { DrinkCup } from '@/shops/grill/dining/cups'
import { cupped } from '@/shops/grill/dining/drinkKinds'
import { CALM_ASK, FUMING, EAT_PHASE, type DrinkId } from '@/shops/grill/bar'
import { tl } from '@/data/i18n'
import { PEOPLE_SCALE, STAFF_SCALE } from './staffPoses'
import { FOLK_FIT } from './decorTex'
import { type Shown } from './seats'
import { SIP_S, SOUP_SIP_S } from './service'

/** the whole line at once (the owner's: said a piece at a time, each piece ended in …, and looked cut short), wrapping inside the bubble */
// (faded out over its last 0.3 s: `ms`, how long it's up)
function Say({ text, who, heart, ms }: { text: string; who: string; heart?: boolean; ms: number }) {
  return <span className="g3-bubble g3-say" style={{ '--out': `${Math.max(0, ms - 300)}ms` } as CSSProperties}><b className="say-who">{heart && <i className="say-heart"><Glyph id="heart" size="0.9em" /></i>}{who}</b>{text}</span>
}

export const LABEL_STYLE = { pointerEvents: 'none' } as const
export const LABEL_Z = [20, 10]
/** a customer's rating at or over which they loved it (MoodFace's 超滿意), and what bursts out of their face then (item 209) */
const LOVED_AT = 80
const JOY_BITS = ['heart', 'star', 'heart', 'star', 'heart', 'star'] as const
/** one customer's label over their head (what they're saying, or the dots while they wait; their face once they've eaten; their number): drawn
 * again only when one of those changes. Each is a page of its own (drei's Html renders its children into a root of their own), so drawn again
 * with every redraw of the bar, several times a second, every label was laid out again each time */
export const GuestLabel = memo(function GuestLabel({ id, y, dots, rating, angry, partner, name, onEl, lang }: { id: number; y: number
  dots: boolean; rating: number | null; angry: boolean; partner: boolean; name: string
  onEl: (id: number, el: HTMLElement | null) => void; lang: Lang }) {
  // (what they're saying, read here from ui/speechStore: only this label drawn again as it changes, not the bar, nor the page)
  const say = useSaid(id)
  const at = useMemo(() => [0, y, 0] as [number, number, number], [y])
  // (loved it (item 209): a burst of hearts and stars out of their face as it shows, and a little bell's ding heard)
  const loved = rating !== null && rating >= LOVED_AT && !angry
  useEffect(() => { if (loved) joySound() }, [loved])
  return (
    <Html position={at} center zIndexRange={LABEL_Z} style={LABEL_STYLE}>
      <div className="g3-label" ref={(el) => onEl(id, el)}>
        {/* (a bubble only while there's something to say (the owner's): a line, or the dots of waiting to order; their kind over it in
            yellow, no number; nothing at all over someone just sitting there, not even their name) */}
        {say ? <Say key={say.key} text={say.text} who={name} heart={partner} ms={say.ms} />
          : dots && <span className="g3-bubble"><b className="say-who">{partner && <i className="say-heart"><Glyph id="heart" size="0.9em" /></i>}{name}</b>…</span>}
        {rating !== null && <MoodFace guest={{ rating, state: angry ? 'angry' : 'done' }} />}
        {rating === null && !angry && <CalmButton id={id} lang={lang} />}
        {loved && (
          <span className="boss-joy guest-joy" aria-hidden="true">
            {JOY_BITS.map((c, i) => <i key={i} className={`is-${c}`} style={{ '--i': i } as CSSProperties}>{c === 'star' ? <StarIcon size={17} /> : <Glyph id="heart" size={17} />}</i>)}
          </span>
        )}
      </div>
    </Html>
  )
})

/**
 * (item 348) a customer kept waiting, getting cross (game/calm's canCalm: a third and more of their patience gone): a button by their label
 * to see to them, opening its ways (a word, an apology, a dish on the house), each once; asked of the kitchen (bar's CALM_ASK), done there.
 * Its own little clock (FUMING, what they've been given), so only it is drawn again as those change
 */
// (item 374: drawn again only as its own props or state change: it was with every redraw of the label it's in)
const CalmButton = memo(function CalmButton({ id, lang }: { id: number; lang: Lang }) {
  const [st, setSt] = useState<{ f: number; used: CalmKind[] }>({ f: 0, used: [] })
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const t = window.setInterval(() => {
      const f = FUMING.get(id) ?? 0, used = CALM_ASK.used.get(id) ?? []
      setSt((s) => (Math.abs(s.f - f) < 0.02 && s.used.length === used.length ? s : { f, used }))
    }, 300)
    return () => window.clearInterval(t)
  }, [id])
  const shown = canCalm(st.f, st.used)
  usePanelSound(open && shown)
  if (!shown) return null
  const t3 = (zh: string, ja: string, en: string) => tl(lang, zh, ja, en)
  const pct = (k: CalmKind) => Math.round(CALM[k].back * 100)
  const label: Record<CalmKind, string> = { greet: t3('招呼', '声かけ', 'A word'), sorry: t3('道歉', 'お詫び', 'Apologise'),
    side: t3(`送小菜 NT$${CALM.side.cost}`, `お通し NT$${CALM.side.cost}`, `A dish NT$${CALM.side.cost}`) }
  const tip: Record<CalmKind, string> = {
    greet: t3(`跟他說馬上就好：可以多等 ${pct('greet')}%`, `すぐですと声をかける：${pct('greet')}% 長く待てる`, `Tell them it's nearly done: ${pct('greet')}% more patience`),
    sorry: t3(`跟他道歉：可以多等 ${pct('sorry')}%`, `お詫びする：${pct('sorry')}% 長く待てる`, `Apologise: ${pct('sorry')}% more patience`),
    side: t3(`招待一盤毛豆（NT$${CALM.side.cost}）：可以多等 ${pct('side')}%`, `枝豆をサービス（NT$${CALM.side.cost}）：${pct('side')}% 長く待てる`,
      `Edamame on the house (NT$${CALM.side.cost}): ${pct('side')}% more patience`),
  }
  return (
    <span className="calm">
      <button type="button" className="calm-btn" aria-expanded={open} onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
        title={t3('客人等太久了：安撫他', 'お待たせしすぎ：なだめる', 'Kept waiting too long: calm them')}>{t3('安撫', 'なだめる', 'Calm')}</button>
      {open && calmLeft(st.used).map((k) => (
        <button key={k} type="button" className="calm-opt" title={tip[k]} onClick={(e) => { e.stopPropagation(); CALM_ASK.q.push({ id, kind: k }); setOpen(false) }}>
          {label[k]}</button>
      ))}
    </span>
  )
})

/** a sake's cup beside its bottle: this much nearer the customer (lay) and along to their right */
export const CUP_AHEAD = 0.07
export const CUP_SIDE = -0.03
/**
 * A seated customer's drink on the bar (its sake cup by it): as much left in it as they've not drunk; the one they sip from (the cup, or the
 * bottle) off the bar while it's up in their hand (FolkFigure's sip)
 */
export const SeatDrink = memo(function SeatDrink({ s, id, at, cupAt, clock, level }: { s: Shown; id: DrinkId; at: [number, number, number]
  cupAt: [number, number, number] | null; clock: { current: number }; level: number }) {
  const bottle = useRef<THREE.Group>(null)
  const cup = useRef<THREE.Group>(null)
  useFrame(() => {
    const k = s.sipAt === undefined ? -1 : (clock.current - s.sipAt) / SIP_S
    const up = k >= 0.2 && k < 0.86
    const sipped = cupAt ? cup.current : bottle.current
    if (sipped && sipped.visible === up) sipped.visible = !up
  })
  return (
    <>
      <group ref={bottle} position={at}><DrinkBottle id={id} wet level={level} /></group>
      {cupAt && <group ref={cup} position={cupAt}><DrinkCup id={id} level={level > 0.01 ? 0.8 : 0} /></group>}
    </>
  )
}, (a, b) => a.s === b.s && a.id === b.id && a.level === b.level && a.at.every((v, i) => v === b.at[i]) && (a.cupAt === null) === (b.cupAt === null))

/** one customer's figure, moved by the bar's clock each frame (read from the ref: nothing re-renders for it) */
// (drawn again only when what's shown of them changes (their phase, eating or not, the drink in hand, who they turn to, how they're
// getting on), not each time the bar above them redraws, several times a second; `phase` and `drink` are passed only so it notices them)
export const PersonClock = memo(PersonClockImpl)
function PersonClockImpl({ s, eating, clock, talk, mood, plateOf, drinkOf, soupOf }: { s: Shown; phase: string; drink?: string; eating: boolean; clock: { current: number }
  talk: number; mood: ReturnType<typeof moodOf>; plateOf: (seat: number) => THREE.Vector3 | null; drinkOf: (seat: number, cup: boolean) => THREE.Vector3 | null
  soupOf?: (seat: number) => THREE.Vector3 | null
  drunk?: number }) {
  // (a drink in hand: carried back from the fridge, or up off the bar for a sip (a sake's cup for it, not its bottle); at the size it stands on
  // the bar (the hand's frame is the figure's, smaller), held round its middle)
  const cup = !!s.drink && cupped(s.drink)
  const sipK = () => (s.sipAt === undefined ? -1 : (clock.current - s.sipAt) / SIP_S)
  const sat = s.phase === 'sit'
  // (and the empty taken along to the fridge for the next one (item 210))
  const refill = s.phase === 'wcGo' && s.wc?.who === 'drink'
  const inHand = s.drink && (s.phase === 'wcBack' || sat || refill) ? (
    <group scale={1 / (1.1 * STAFF_SCALE * folkSpec(s.id).size)}>
      <group position-y={cup && sat ? (s.drink === 'beer' ? -0.04 : -0.012) : -0.07}>{cup && sat ? <DrinkCup id={s.drink!} level={0.8} /> : <DrinkBottle id={s.drink as DrinkId} wet level={1 - (s.drunk ?? 0)} />}</group>
    </group>
  ) : undefined
  const atFridge = s.phase === 'wcIn' && s.wc?.who === 'drink'
  // (their own boundary: a customer still loading shows nothing a moment, never blanks the shop round them)
  return <Suspense fallback={null}><FolkFigure id={s.id} eating={eating} walking={s.phase !== 'sit' && !s.wcSit} still={() => !!s.still} clock={clock} talk={talk} mood={mood}
    gear={() => s.gearAt ?? null} gearScale={1 / (FOLK_FIT * folkSpec(s.id).size * PEOPLE_SCALE)}
    fade={() => s.fade ?? 1} slippers={() => s.slippers ?? true} pose={atFridge ? 'Fetch' : s.phase === 'wcWash' ? 'Wash' : s.phase === 'sit' && s.wipeAt ? 'Wipe' : undefined} fit={FOLK_FIT}
    held={inHand} heldShown={() => s.phase === 'wcBack' || (s.phase === 'wcGo' && s.wc?.who === 'drink') || (sipK() >= 0.2 && sipK() < 0.86)} cup={cup}
    sip={() => (s.phase === 'sit' && s.drink ? sipK() : -1)} drinkAt={() => (s.drink ? drinkOf(s.seat, cup) : null)} bite={() => EAT_PHASE.get(s.id)}
    soup={() => (s.phase === 'sit' && s.soupSipAt !== undefined ? (clock.current - s.soupSipAt) / SOUP_SIP_S : -1)} soupAt={() => soupOf?.(s.seat) ?? null}
    soupKey={s.phase === 'sit' ? `soup:${s.seat}` : undefined} fume={() => FUMING.get(s.id) ?? 0}
    plate={() => (s.phase === 'sit' ? plateOf(s.seat) : null)} /></Suspense>
}
