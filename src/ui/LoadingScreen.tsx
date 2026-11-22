import { memo, useEffect, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'
import { GrillingFish } from './GrillingFish'
import { laterPending, laterSeen, sceneDrawn } from '@/scene/Later'
import { loadingLine } from '@/data/loadingLines'

/** how long the loading may sit without any file coming in before it's called stuck (ms) */
const STALL_MS = 20000
/** the staged parts the veil waits for (scene/Later's stages 1 to 3), and how much of the shown progress the shop's own first files are */
const STAGES = 3
const STAGE_FROM = 0.45

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
  useEffect(() => {
    const t = window.setInterval(() => {
      const st = useProgress.getState()
      setProg((p) => (p.active === st.active && p.loaded === st.loaded && p.total === st.total && p.errors.length === st.errors.length ? p : st))
      const files = st.total > 0 ? Math.min(1, st.loaded / st.total) : 0
      const staged = laterSeen() ? Math.min(1, Math.max(0, 1 - laterPending() / STAGES)) : 0
      const est = laterSeen() ? STAGE_FROM + (1 - STAGE_FROM) * (0.65 * staged + 0.35 * files) : STAGE_FROM * files
      setShown((v) => Math.max(v, Math.min(99, Math.round(est * 100))))
    }, 250)
    return () => window.clearInterval(t)
  }, [])
  const { active, loaded, total, errors, progress } = prog
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
      if (held >= 600 || idle >= 3000) setDone(true)
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
  // (shown until the shop's all in: between one stage's files and the next's nothing's loading, and it went away in that gap)
  if (done) return null
  const pct = total > 0 && Number.isFinite(progress) ? shown : null
  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <GrillingFish done={(pct ?? 0) / 100} />
      <div className="loading-board">
        <h1>聞野</h1>
        <small>日式烤魚</small>
        <div className="loading-bar"><i style={{ width: `${pct ?? 0}%`, '--done': (pct ?? 0) / 100 } as React.CSSProperties} /></div>
        {/* (what the shop's doing to get ready, by how far it's come (data/loadingLines, item 175): a wait with something happening in it) */}
        <p>{pct === null ? `${loadingLine(null)}…` : `${loadingLine(pct)} ${pct.toFixed(0)}%`}</p>
      </div>
      {stuck && (
        <div className="loading-stuck">
          <p>{failed ? `有 ${errors.length} 個檔案沒有載入成功` : '載入好像卡住了'}（可能是模型正在更新，或開發伺服器在重啟）</p>
          <button type="button" onClick={() => window.location.replace(window.location.pathname + '?v=' + Date.now())}>重新載入</button>
        </div>
      )}
    </div>
  )
})
