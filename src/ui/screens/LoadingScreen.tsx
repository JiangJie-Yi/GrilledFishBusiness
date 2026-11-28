import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'
import { GrillingFish } from '@/ui/art/GrillingFish'
import { EMBER_SHEETS, NOREN_CREST } from '@/ui/art/loadingLook'
import { laterPending, laterSeen, sceneDrawn } from '@/scene/render/Later'
import { veilLifting } from '@/scene/render/worldMerge'
import { LOADING_LINES, lineStep } from '@/data/loadingLines'
import { loadingPct, loadingStep } from '@/game/system/loadingCreep'

/** how long the loading may sit without any file coming in before it's called stuck (ms) */
const STALL_MS = 20000
/** the staged parts the veil waits for (scene/Later's stages 1 to 3), and how much of the shown progress the shop's own first files are */
const STAGES = 3
const STAGE_FROM = 0.45
/** how long the veil takes to lift once the shop's all in (ms; loading.css .is-leaving's 0.6 s, and a frame or two) */
const LIFT_MS = 650

// (the veil's still parts (item 798): the same as the page's first placeholder's (ui/art/loadingLook, written into index.html's #boot),
// the embers going up from the grill and the shop's own noren hung across the top, its crest on the middle panel)
const Embers = memo(function Embers() {
  return <div className="loading-embers" aria-hidden="true">{Array.from({ length: EMBER_SHEETS }, (_, i) => <i key={i} />)}</div>
})
const Noren = memo(function Noren() {
  return <div className="loading-noren" aria-hidden="true"><span /><span dangerouslySetInnerHTML={{ __html: NOREN_CREST }} /><span /></div>
})

/**
 * The loading veil over the 3D shop: how far the models and pictures have come in (never more than 100%, never "Infinity", which drei's own
 * shows when its counts go wrong), and, when nothing has come in for a while or a file failed (a model being rewritten while it's read, the
 * dev server restarting), a word saying so and a button to load the page again.
 */
// (item 374: drawn again only as its own props change; it was with every redraw of the page, 3.3 a second)
export const LoadingScreen = memo(function LoadingScreen({ scene = true }: { scene?: boolean }) {
  // (read a few times a second, not on every file: dozens of textures finishing at once fired an update apiece, and that storm of renders
  // tripped React's guard against runaway updates)
  const [prog, setProg] = useState(() => useProgress.getState())
  // (how far it's come, as shown: only ever forward (item 175). The loaders' count starts over as each staged part's models are asked for
  // (scene/Later's three stages: the decor, the fixtures, the customers), and the bar fell from 100% to half and to nought and back, the
  // getting-ready lines with it; the shop's own first files are the first STAGE_FROM of it, the staged parts and their files the rest)
  const [shown, setShown] = useState(0)
  // (and while it's not ahead (item 592: the first files in, the shop's models being read and made ready, it sat at 45% for 8.6 s and looked
  // stuck), going on by itself toward a little past it, slower the nearer it gets (game/loadingCreep): how far, as a fraction, the most the
  // estimate's been, and when it was last stepped on; not before anything's been counted)
  const creep = useRef({ shown: 0, real: 0, at: -1 })
  // (the getting-ready line shown (its place in data/loadingLines), and since when: each up a moment at the least, item 592)
  const [line, setLine] = useState(0)
  const lineAt = useRef({ i: 0, at: -1 })
  // (its time counted from when it's on the screen, not from when it was asked for (the Tester's: a line asked for just before the page
  // was held up came on only after it, and the next one, its time long past, was let through in the same frame: 0.01 to 0.03 s up, 7
  // loads in 18); an effect's after the commit)
  useEffect(() => { lineAt.current.at = performance.now() }, [line])
  useEffect(() => {
    const t = window.setInterval(() => {
      const st = useProgress.getState()
      setProg((p) => (p.active === st.active && p.loaded === st.loaded && p.total === st.total && p.errors.length === st.errors.length ? p : st))
      const files = st.total > 0 ? Math.min(1, st.loaded / st.total) : 0
      const staged = laterSeen() ? Math.min(1, Math.max(0, 1 - laterPending() / STAGES)) : 0
      const est = laterSeen() ? STAGE_FROM + (1 - STAGE_FROM) * (0.65 * staged + 0.35 * files) : STAGE_FROM * files
      // (from the most the estimate's been: the count's own share falls back as more files are asked for, and with it how far it went on)
      const now = performance.now(), c = creep.current
      c.real = Math.max(c.real, est)
      c.shown = loadingStep(c.shown, c.real, c.at < 0 || st.total === 0 ? 0 : (now - c.at) / 1000)
      c.at = now
      setShown((v) => Math.max(v, loadingPct(c.shown)))
      const ln = lineAt.current
      if (ln.at < 0) ln.at = now
      const next = lineStep(ln.i, st.total > 0 ? loadingPct(c.shown) : null, (now - ln.at) / 1000)
      // (and not counted at all till it's up: its effect starts it)
      if (next !== ln.i) { ln.i = next; ln.at = Infinity; setLine(next) }
    }, 250)
    return () => window.clearInterval(t)
  }, [])
  const { active, loaded, total, errors, progress } = prog
  // (its endless motions (the noren swaying, the embers, the fire, the glint) counted from the page's start, as the placeholder's are
  // (index.html): put in its place, it takes each up where it was, not from its beginning, and the change can't be seen)
  const veil = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    try { for (const a of veil.current?.getAnimations({ subtree: true }) ?? []) a.startTime = 0 } catch { /* (an older browser: from their beginnings) */ }
  }, [])
  const [stuck, setStuck] = useState(false)
  // (only the first load is covered: once the shop has come in, a model or picture fetched later (a guest, a light) loads behind the scenes,
  // never bringing the veil back over the game; and a count that never started (nothing went through the loaders' tally) isn't waited on)
  // (the shop has come in when nothing's loading and every staged part (scene/Later: the decor, the fixtures, the customers) is in, and has
  // stayed so a moment: it lifted once the first files were in, and the stools, the fridges and the crates came in seconds after it)
  const [done, setDone] = useState(false)
  // (`scene`: a 3D shop is coming, whose staged parts are waited for once they've begun; without one (a phone's 2D grill) only the files)
  // (and, with a 3D shop, drawn: not lifted on an empty room while the shop's tree is still suspended (files in, a model still parsing))
  const allIn = () => !useProgress.getState().active && laterPending() === 0 && (!scene || (laterSeen() && sceneDrawn()))
  // (looked at a few times a second: it's all in once that's held a moment (0.6 s); a page with no 3D shop and nothing to load, after a while)
  useEffect(() => {
    if (done) return
    let held = 0, idle = 0
    const t = window.setInterval(() => {
      const total = useProgress.getState().total
      held = total > 0 && allIn() ? held + 250 : 0
      idle = total === 0 && laterPending() === 0 && !scene ? idle + 250 : 0
      // (and the room's merge made now, under the veil as it starts to lift (scene/render/WorldBatch, item 767))
      if (held >= 600 || idle >= 3000) { veilLifting(); setDone(true) }
    }, 250)
    return () => window.clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, scene])
  const last = useRef({ loaded: -1, at: performance.now() })
  useEffect(() => {
    if (loaded !== last.current.loaded) { last.current = { loaded, at: performance.now() }; setStuck(false) }
    if (!active) return
    const t = window.setInterval(() => { if (performance.now() - last.current.at > STALL_MS) setStuck(true) }, 1000)
    return () => window.clearInterval(t)
  }, [active, loaded])
  // (some files are only looked for (the HDRIs are tried by several names): a miss isn't a failure unless the loading has stopped too)
  const failed = errors.length > 0 && stuck
  // (once it's all in, lifted (item 798: it was cut away in a frame): the noren drawn up and the veil faded off the shop (loading.css
  // .is-leaving), nothing under it held up meanwhile, then gone)
  const [gone, setGone] = useState(false)
  useEffect(() => {
    if (!done) return
    const t = window.setTimeout(() => setGone(true), LIFT_MS)
    return () => window.clearTimeout(t)
  }, [done])
  // (shown until the shop's all in: between one stage's files and the next's nothing's loading, and it went away in that gap)
  if (gone) return null
  const pct = total > 0 && Number.isFinite(progress) ? shown : null
  return (
    <div ref={veil} className={done ? 'loading-screen is-leaving' : 'loading-screen'} role="status" aria-live="polite">
      <Embers />
      <Noren />
      <div className="loading-stage">
        <GrillingFish done={(pct ?? 0) / 100} />
        <div className="loading-board">
          <h1>聞野</h1>
          <small>日式烤魚</small>
          <div className="loading-bar"><i style={{ width: `${pct ?? 0}%`, '--done': (pct ?? 0) / 100 } as React.CSSProperties} /></div>
          {/* (what the shop's doing to get ready, by how far it's come (data/loadingLines, item 175): a wait with something happening in it) */}
          <p><span>{pct === null ? `${LOADING_LINES[line][1]}…` : LOADING_LINES[line][1]}</span>{pct !== null && <b>{pct.toFixed(0)}%</b>}</p>
        </div>
        {stuck && (
          <div className="loading-stuck">
            <p>{failed ? `有 ${errors.length} 個檔案沒有載入成功` : '載入好像卡住了'}（可能是模型正在更新，或開發伺服器在重啟）</p>
            <button type="button" onClick={() => window.location.replace(window.location.pathname + '?v=' + Date.now())}>重新載入</button>
          </div>
        )}
      </div>
    </div>
  )
})
