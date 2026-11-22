// Something to try today (item 175, game/dailyTip): from the second day, while the shop's shut, the first day's guide's card at the foot of
// the screen with one thing in the shop worth finding, and a button that takes them there (the view moved to it, or its panel opened): the
// next day the next one; put off (Later), the same one again the next day.
import { tl, type Lang } from '@/data/i18n'
import type { TipId } from '@/game/dailyTip'
import { Glyph } from './GameIcons'
import { FitLine } from './FitLine'
import { usePanelSound } from './uiSound'

export function DayTip({ lang, tip, onGo, onLater }: { lang: Lang; tip: TipId
  /** taken up: take them to it (App: the view, or the panel; the staff's praise, only noted), and it's seen */
  onGo: (tip: TipId) => void
  /** put away for today, the same one back next time */
  onLater: () => void }) {
  usePanelSound(true)
  const t = (zh: string, ja: string, en: string) => tl(lang, zh, ja, en)
  const line: Record<TipId, [string, string, string]> = {
    grill: [t('自己烤一條魚', '自分で魚を焼く', 'Grill a fish yourself'),
      t('打烊時到火烤灶台：夾魚上火、翻面、撒鹽，烤到金黃', '閉店中に炉端へ：魚を炭火に、返して塩を', 'At the grill while shut: fish on the coals, turn it, salt it'),
      t('去灶台', '炉端へ', 'To the grill')],
    altar: [t('供一杯御神酒', '御神酒を供える', 'Offer sake at the shrine'),
      t('神棚的供桌上點御神酒，供一杯，客人會多一些', '神棚の御神酒を押して一杯、客が少し増える', 'Click the sacred sake on the shrine: a few more customers'),
      t('去神棚', '神棚へ', 'To the shrine')],
    rating: [t('看看客人怎麼說', 'お客さんの声', 'What customers say'),
      t('點左上角的招牌，看星數與客人的留言', '左上の看板を押すと星と口コミ', 'Click the sign top left: stars and reviews'),
      t('打開評價', '評価を開く', 'Open reviews')],
    recipe: [t('做一道自己的菜', '自分の料理を作る', 'Make a dish of your own'),
      t('廚房裡點「料理研製」：自己調味、試做，做出更受歡迎的菜', '厨房の「料理研究」で味付けと試作、人気の一品を', 'In the kitchen, Recipes: season and try out a dish'),
      t('打開研製', '研究を開く', 'Open recipes')],
    praise: [t('稱讚一下員工', 'スタッフを褒める', 'Praise your staff'),
      t('營業中點員工，上班幾小時後可以稱讚，好感會上升', '営業中にスタッフを押す、数時間働いたら褒められる', 'Click staff while open: after a few hours, praise them'),
      t('知道了', 'わかった', 'Got it')],
    window: [t('看看牆上的圓窗', '丸窓を眺める', 'Look at the round window'),
      t('白天有竹影，入夜換成月光與飄浮的塵埃', '昼は竹の影、夜は月明かりと舞う塵', 'Bamboo shadows by day, moonlight and drifting dust by night'),
      t('去圓窗', '丸窓へ', 'To the window')],
  }
  const [title, hint, go] = line[tip]
  return (
    <div className="guide-card is-tip" role="status" aria-live="polite">
      <div className="guide-kicker">{t('今天可以試試', '今日のおすすめ', 'Something to try today')}</div>
      <FitLine className="guide-title">{title}</FitLine>
      <FitLine className="guide-hint">{hint}</FitLine>
      <div className="guide-acts">
        {/* (the staff's praise is found while open, by clicking them: nowhere to take them now, only noted) */}
        <button type="button" className="guide-go" onClick={() => onGo(tip)}>{go}{tip !== 'praise' && <Glyph id="arrowR" size="0.9em" />}</button>
        {tip !== 'praise' && <button type="button" className="guide-skip" onClick={onLater}>{t('下次再說', 'またあとで', 'Later')}</button>}
      </div>
    </div>
  )
}
