// Today's target for the takings (item 175, the owner's: those who don't care for games should want to play a little longer; game/dayGoal):
// while the shop's open, a pill left of the clock (the menu board's title is under the clock then): the takings so far against the target,
// a thin bar filling under them; passed, it goes gold, says so, and gives a little hop and a chime, once a day.
import { memo, useEffect, useRef } from 'react'
import { tl, type Lang } from '@/data/i18n'
import { GOAL_BONUS_MAX, GOAL_BONUS_STEP, goalBonus, goalProgress } from '@/game/money/dayGoal'
import { Glyph } from '@/ui/art/GameIcons'
import { goalSound } from '@/ui/kit/uiSound'

const nt = (n: number) => `NT$${Math.round(n).toLocaleString('en-US')}`

function DayGoalImpl({ lang, goal, takings, day, streak = 0, bonus = 0, onReached }: { lang: Lang; goal: number; takings: number; day: number
  /** (item 650) the days running the target was met before today, and the word of it today (customers that much more often) */
  streak?: number; bonus?: number
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
  // (item 650, the owner's 「達標會有甚麼好處」: what it brings, said on it: met, tomorrow's word (more the more days running); not yet, today's
  // word from the days before, if any; and the rule over it, held over it)
  const pct = (x: number) => `+${Math.round(x * 100)}%`
  const step = Math.round(GOAL_BONUS_STEP * 100), most = Math.round(GOAL_BONUS_MAX * 100)
  const why = t(`達標的好處：隔天口碑傳開，客人多 ${step}%；連續達標每多一天再多 ${step}%，最多 ${most}%`,
    `達成すると：翌日は評判で客が ${step}% 増える。連続で達成するごとに ${step}% ずつ、最大 ${most}%`,
    `Meet it: word goes round and ${step}% more customers come the next day; ${step}% more for each day running, up to ${most}%`)
  const perk = reached ? t(`明天客人 ${pct(goalBonus(streak + 1))}`, `明日の客 ${pct(goalBonus(streak + 1))}`, `Tomorrow ${pct(goalBonus(streak + 1))}`)
    : bonus > 0 ? t(`口碑 ${pct(bonus)}`, `評判 ${pct(bonus)}`, `Word ${pct(bonus)}`) : null
  return (
    <div ref={box} className={`day-goal${reached ? ' is-reached' : ''}`} role="status" title={why}
      aria-label={reached ? t(`今日目標 ${nt(goal)} 達成`, `今日の目標 ${nt(goal)} 達成`, `Today's target ${nt(goal)} reached`)
        : t(`今日目標 ${nt(goal)}，已賺 ${nt(takings)}`, `今日の目標 ${nt(goal)}、売上 ${nt(takings)}`, `Today's target ${nt(goal)}, taken ${nt(takings)}`)}>
      <Glyph id={reached ? 'check' : 'coin'} size="13px" className="day-goal-icon" />
      <span className="day-goal-label">{reached ? t('目標達成', '目標達成', 'Target met') : t('今日目標', '今日の目標', "Today's target")}</span>
      <span className="day-goal-sum">{reached ? nt(takings) : `${nt(takings)} / ${nt(goal)}`}</span>
      {perk && <span className="day-goal-perk">{perk}</span>}
      <i className="day-goal-bar" aria-hidden="true"><b style={{ transform: `scaleX(${share})` }} /></i>
    </div>
  )
}
export const DayGoal = memo(DayGoalImpl)
