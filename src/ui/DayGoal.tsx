// Today's target for the takings (item 175, the owner's: those who don't care for games should want to play a little longer; game/dayGoal):
// while the shop's open, a pill left of the clock (the menu board's title is under the clock then): the takings so far against the target,
// a thin bar filling under them; passed, it goes gold, says so, and gives a little hop and a chime, once a day.
import { memo, useEffect, useRef } from 'react'
import { tl, type Lang } from '@/data/i18n'
import { goalProgress } from '@/game/dayGoal'
import { Glyph } from './GameIcons'
import { goalSound } from './uiSound'

const nt = (n: number) => `NT$${Math.round(n).toLocaleString('en-US')}`

function DayGoalImpl({ lang, goal, takings, day, onReached }: { lang: Lang; goal: number; takings: number; day: number
  /** the moment it's passed (once a day): App puts a line in the log */
  onReached: () => void }) {
  const { share, reached } = goalProgress(goal, takings)
  const box = useRef<HTMLDivElement>(null)
  // (cheered once a day, as it's passed while it's up: not again on a redraw, nor for one already passed as it came up)
  const cheered = useRef<number | null>(null)
  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      if (reached) cheered.current = day
      return
    }
    if (!reached || cheered.current === day) return
    cheered.current = day
    goalSound()
    onReached()
    // (the hop: its class put on afresh, so it plays now)
    const el = box.current
    if (el) { el.classList.remove('is-hop'); void el.offsetWidth; el.classList.add('is-hop') }
  }, [reached, day, onReached])
  const t = (zh: string, ja: string, en: string) => tl(lang, zh, ja, en)
  return (
    <div ref={box} className={`day-goal${reached ? ' is-reached' : ''}`} role="status"
      aria-label={reached ? t(`今日目標 ${nt(goal)} 達成`, `今日の目標 ${nt(goal)} 達成`, `Today's target ${nt(goal)} reached`)
        : t(`今日目標 ${nt(goal)}，已賺 ${nt(takings)}`, `今日の目標 ${nt(goal)}、売上 ${nt(takings)}`, `Today's target ${nt(goal)}, taken ${nt(takings)}`)}>
      <Glyph id={reached ? 'check' : 'coin'} size="13px" className="day-goal-icon" />
      <span className="day-goal-label">{reached ? t('目標達成', '目標達成', 'Target met') : t('今日目標', '今日の目標', "Today's target")}</span>
      <span className="day-goal-sum">{reached ? nt(takings) : `${nt(takings)} / ${nt(goal)}`}</span>
      <i className="day-goal-bar" aria-hidden="true"><b style={{ transform: `scaleX(${share})` }} /></i>
    </div>
  )
}
export const DayGoal = memo(DayGoalImpl)
