import { useState } from 'react'
import { personName } from '@/data/people'
import type { Lang } from '@/data/i18n'
import { tl } from '@/data/i18n'
import type { Worker } from '@/data/staff'
import { BOND_STAGES, BOND_START, bondOf, moodWord, pairKey, stageOf } from '@/game/staff/affinity'
import { canGiftToday, GIFTS, giftOk, type GiftId, type Taste } from '@/game/staff/gifts'
import { hasRoom } from '@/game/staff/lodging'
import type { BondNote, Rota } from '@/game/staff/shifts'
import { onShift } from '@/game/staff/shifts'
import { Avatar } from '@/ui/art/Avatar'

/**
 * The relations chart beside 人事 (item 323, the owner's, 2026-11-18: 「人事旁放一個關係圖，是老闆與員工，員工與員工之間，以及誰留宿」): the
 * owner in the middle, the staff round them; a line from the owner to each, as thick and as warm a colour as their bond (red cold, grey as
 * it stands, green warm), and between each two of them a finer one the same way; a little house by those who live upstairs (and the
 * owner); a heart by his companion, a speech bubble by one asking him something; those not on today faded. Over it the shop's atmosphere
 * (工作氣氛), what they all feel together.
 *
 * And under it (item 696, the owner's, 2026-11-25: 「這邊做細緻一些，且可以送禮，好感度達到一定的女員工會詢問可否住下來…」) the one picked on
 * the chart (a click on a face) in full: who they are; their bond on its bar, the bands marked, what it does and how far to the next; her
 * asking to stay, to answer, or his companion's standing; the gifts (one a day, paid from the cash; what they made of those given them
 * known); the last few things that moved their bond; who of the others they're closest to, and furthest from.
 */
const SIZE = 300, MID = SIZE / 2, RING = 112, FACE = 40
const warmth = (b: number) => (b >= 65 ? '#3f9a5a' : b >= 40 ? '#9a8f80' : '#c0503a')
const width = (b: number) => 1 + (bondOf(b) / 100) * 4
/** whether two on these shifts are ever on the same day */
const together = (a: string | undefined, b: string | undefined) => (a ?? 'A') === 'both' || (b ?? 'A') === 'both' || (a ?? 'A') === (b ?? 'A')
/** what moved a bond, in a few words each (a gift's name its own) */
const NOTE_WORDS: Record<string, [string, string, string]> = {
  praise: ['稱讚', '褒めた', 'Praised'], meal: ['員工餐', 'まかない', 'Staff meal'], raise: ['加薪', '昇給', 'A raise'], cut: ['減薪', '減給', 'A pay cut'],
  lodgeNo: ['住宿沒答應', '住み込みを断られた', 'Lodging turned down'], stayYes: ['答應她住下來', '住むのを承諾', 'Said yes to staying'],
  stayNo: ['沒答應她住下來', '申し出を断った', 'Said no to staying'], stayEnd: ['說好只當同事', '同僚に戻った', 'Back to colleagues'],
  night: ['跟老闆共度', '店主と過ごした', 'A night together'], day: ['一天下來', '一日を終えて', 'The day itself'],
  // (items 770, 796: after work)
  thanks: ['道聲辛苦了', 'お疲れさま', 'Thanked'], beer: ['一起喝一杯', '一杯やった', 'A beer together'], shogi: ['下了一盤將棋', '将棋を指した', 'Played shogi'],
  radio: ['一起聽棒球', '野球中継を聴いた', 'The ball game'], tea: ['一起喝茶', 'お茶を飲んだ', 'Tea together'], latebite: ['請吃宵夜', '夜食をご馳走', 'A late bite'],
  hometown: ['聊了家鄉', '故郷の話', 'Talked of home'],
}
const TASTE_WORDS: Record<Taste, [string, string, string]> = {
  love: ['很喜歡', '大好き', 'Loves it'], like: ['喜歡', '好き', 'Likes it'], meh: ['普通', 'ふつう', 'So-so'], dislike: ['不喜歡', '苦手', 'Not keen'],
}
const house = (x: number, y: number) => (
  <g transform={`translate(${x} ${y})`} className="rel-dorm">
    <path d="M-7 1 L0 -6 L7 1 L5 1 L5 7 L-5 7 L-5 1 Z" />
    <rect x="-1.6" y="2.5" width="3.2" height="4.5" />
  </g>
)
const heart = (x: number, y: number) => (
  <path className="rel-heart" transform={`translate(${x} ${y})`} d="M0 6 C-7 1 -7 -5 -3 -5.5 C-1.2 -5.7 -0.3 -4.6 0 -3.6 C0.3 -4.6 1.2 -5.7 3 -5.5 C7 -5 7 1 0 6 Z" />
)
const bubble = (x: number, y: number) => (
  <g className="rel-ask-mark" transform={`translate(${x} ${y})`}>
    <path d="M-8 -6 H8 A2 2 0 0 1 10 -4 V3 A2 2 0 0 1 8 5 H-1 L-5 9 L-4 5 H-8 A2 2 0 0 1 -10 3 V-4 A2 2 0 0 1 -8 -6 Z" />
    <circle cx="-4" cy="-0.5" r="1.3" /><circle cx="0" cy="-0.5" r="1.3" /><circle cx="4" cy="-0.5" r="1.3" />
  </g>
)

export function Relations({ people, hired, pairs, atmos, today, lang, cash = 0, lodgers = 0, roleName = (r) => r, onGift, onStay }: {
  people: Worker[]; hired: Record<string, Rota>; pairs: Record<string, number>; atmos: number; today: number; lang: Lang
  /** (item 696) the cash in hand (a gift's paid from it), how many live upstairs, each job's name; a gift given, her asking answered */
  cash?: number; lodgers?: number; roleName?: (role: string) => string
  onGift?: (w: Worker, g: GiftId) => void
  onStay?: (w: Worker, act: 'yes' | 'no' | 'end') => void
}) {
  const t3 = (zh: string, ja: string, en: string) => tl(lang, zh, ja, en)
  const staff = people.filter((w) => hired[w.id])
  // (the one shown in full: one asking him something first, else the first of them; kept while the tab's up)
  const [pick, setPick] = useState<string | null>(null)
  const asking = staff.find((w) => (hired[w.id].compAsk ?? -1) >= 0)
  const sel = staff.find((w) => w.id === pick) ?? asking ?? staff[0]
  const at = (k: number) => {
    const a = -Math.PI / 2 + (2 * Math.PI * k) / Math.max(1, staff.length)
    return { x: MID + Math.cos(a) * RING, y: MID + Math.sin(a) * RING }
  }
  const spots = staff.map((w, k) => ({ w, ...at(k), on: onShift(hired[w.id].shift, today), bond: bondOf(hired[w.id].bond) }))
  const words = [t3('冷淡', 'ぎすぎす', 'Cold'), t3('生硬', 'ぎこちない', 'Stiff'), t3('普通', 'ふつう', 'As usual'), t3('融洽', 'なごやか', 'Good'), t3('熱絡', 'にぎやか', 'Warm')]
  const nm = (x: { zh: string; ja: string; en: string }) => t3(x.zh, x.ja, x.en)
  const colon = lang === 'en' ? ': ' : '：'
  return (
    <div className="rel">
      <div className="rel-mood">
        <b>{t3('工作氣氛', '職場の空気', 'Atmosphere')}</b>
        <i><span style={{ width: `${Math.round(atmos)}%`, background: warmth(atmos) }} /></i>
        <em>{Math.round(atmos)}・{words[moodWord(atmos)]}</em>
      </div>
      {staff.length === 0 ? <p className="rel-none">{t3('還沒有員工', 'スタッフがいません', 'No staff yet')}</p> : (
        <div className="rel-chart" style={{ width: SIZE, height: SIZE }}>
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
            {/* (between each two of them, fine; only those who can be on the same day: a pair on different shifts never works together) */}
            {spots.flatMap((a, i) => spots.slice(i + 1).filter((b) => together(hired[a.w.id].shift, hired[b.w.id].shift)).map((b) => {
              const v = pairs[pairKey(a.w.id, b.w.id)] ?? BOND_START
              return <line key={`${a.w.id}-${b.w.id}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={warmth(v)} strokeWidth={width(v) * 0.45}
                strokeDasharray="3 3" opacity={a.on && b.on ? 0.75 : 0.25} />
            }))}
            {/* (the owner to each) */}
            {spots.map((s) => <line key={s.w.id} x1={MID} y1={MID} x2={s.x} y2={s.y} stroke={warmth(s.bond)} strokeWidth={width(s.bond)} opacity={s.on ? 0.95 : 0.35} />)}
            {/* (a little house by the owner and by each who lives upstairs (item 361: each their own matter); a heart by his companion, and a
                bubble by one asking to stay (item 696)) */}
            {house(MID + FACE * 0.62, MID - FACE * 0.62)}
            {spots.filter((s) => hired[s.w.id].lives).map((s) => <g key={s.w.id}>{house(s.x + FACE * 0.62, s.y - FACE * 0.62)}</g>)}
            {spots.filter((s) => hired[s.w.id].companion).map((s) => <g key={s.w.id}>{heart(s.x - FACE * 0.62, s.y - FACE * 0.58)}</g>)}
            {spots.filter((s) => (hired[s.w.id].compAsk ?? -1) >= 0).map((s) => <g key={s.w.id}>{bubble(s.x - FACE * 0.7, s.y - FACE * 0.72)}</g>)}
          </svg>
          <span className="rel-face is-owner" style={{ left: MID - FACE / 2, top: MID - FACE / 2 }} title={t3('老闆（你）', '店主（あなた）', 'Owner (you)')}>
            <Avatar id="owner" look={{ female: false, age: 'middle' }} role="owner" size={FACE} />
          </span>
          {spots.map((s) => (
            <button type="button" key={s.w.id} data-id={s.w.id} className={`rel-face${s.on ? '' : ' is-off'}${sel?.id === s.w.id ? ' is-sel' : ''}`}
              style={{ left: s.x - FACE / 2, top: s.y - FACE / 2 }} onClick={() => setPick(s.w.id)}
              title={`${personName(s.w, lang)}${colon}${t3('好感', '好感度', 'bond')} ${Math.round(s.bond)}`}>
              <Avatar id={s.w.id} look={s.w.look} role={s.w.role} size={FACE} />
              <small style={{ color: warmth(s.bond) }}>{Math.round(s.bond)}</small>
            </button>
          ))}
        </div>
      )}
      {sel && (() => {
        const r = hired[sel.id], b = Math.round(bondOf(r.bond)), st = stageOf(b), name = personName(sel, lang)
        const asks = (r.compAsk ?? -1) >= 0, given = !canGiftToday(r, today)
        const who = { id: sel.id, female: sel.look.female, years: sel.years, role: sel.role }
        const others = staff.filter((o) => o.id !== sel.id).map((o) => ({ o, v: Math.round(pairs[pairKey(sel.id, o.id)] ?? BOND_START) })).sort((a, c) => c.v - a.v)
        const noteWhat = (n: BondNote) => (n.k === 'gift' ? t3(`收到${GIFTS.find((g) => g.id === n.g)?.zh ?? ''}`, `${GIFTS.find((g) => g.id === n.g)?.ja ?? ''}をもらった`,
          `Given the ${GIFTS.find((g) => g.id === n.g)?.en ?? 'gift'}`) : (NOTE_WORDS[n.k] ? t3(...NOTE_WORDS[n.k]) : n.k))
        return (
          <section className="rel-card" aria-label={name}>
            <header className="rel-who">
              <Avatar id={sel.id} look={sel.look} role={sel.role} size={52} />
              <span className="rel-who-id">
                <b>{name}</b>
                <small>{roleName(sel.role)}・{sel.look.female ? t3('女', '女性', 'F') : t3('男', '男性', 'M')}・{sel.years}{t3('歲', '歳', ' yrs')}</small>
              </span>
              <span className="rel-chips">
                <em className={onShift(r.shift, today) ? 'is-on' : ''}>{onShift(r.shift, today) ? t3('今天上班', '今日は出勤', 'On today') : t3('今天休息', '今日は休み', 'Off today')}</em>
                {r.lives && <em className="is-dorm">{t3('住二樓', '二階住まい', 'Lives in')}</em>}
                {r.companion && <em className="is-mate">{t3('陪伴', '付き添い', 'Companion')}</em>}
              </span>
            </header>
            <div className="rel-bond">
              <span>{t3('好感', '好感度', 'Bond')}</span>
              <i>
                <span style={{ width: `${b}%`, background: warmth(b) }} />
                {BOND_STAGES.slice(1).map((x) => <s key={x.at} style={{ left: `${x.at}%` }} />)}
              </i>
              <em style={{ color: warmth(b) }}>{b}・{nm(st.stage)}</em>
            </div>
            <p className="rel-next">{nm(st.stage.does)}{st.next ? t3(`｜再 ${st.toNext} 到「${st.next.zh}」`, `｜あと ${st.toNext} で「${st.next.ja}」`, ` | ${st.toNext} more to ${st.next.en}`) : ''}</p>
            {asks && (
              <div className="rel-ask">
                <p>{name}{colon}{t3('「老闆……我可以住下來嗎？想離你近一點。」', '「店長……ここに住んでもいいですか？もっと近くにいたいんです。」', '"Boss... could I stay here? I\'d like to be closer to you."')}</p>
                <span>
                  <button type="button" disabled={!r.lives && !hasRoom(lodgers)} onClick={() => onStay?.(sel, 'yes')}
                    title={!r.lives && !hasRoom(lodgers) ? t3('二樓已經住滿了', '二階は満室', 'No room upstairs') : t3('答應：她住進二樓，閉店時在一樓陪你，睡覺時一起上樓', '承諾：二階に住み、閉店中は一階で付き添い、寝る時は一緒に二階へ', 'Yes: she lives upstairs, keeps you company downstairs while shut, and goes up with you at night')}>
                    {t3('答應', '承諾する', 'Yes')}</button>
                  <button type="button" onClick={() => onStay?.(sel, 'no')} title={t3('她會有點受傷，一星期內不會再提', '少し傷つき、1週間は言わない', 'A little hurt; she won\'t ask again for a week')}>
                    {t3('再想想', '考えさせて', 'Not now')}</button>
                </span>
              </div>
            )}
            {r.companion && (
              <div className="rel-mate">
                <p>{t3('閉店時她在一樓陪你，睡覺時一起上樓。', '閉店中は一階で付き添い、寝る時は一緒に二階へ。', 'While the shop\'s shut she keeps you company downstairs; at night you go up together.')}</p>
                <button type="button" onClick={() => onStay?.(sel, 'end')} title={t3('她會難過（好感 -6），仍住二樓', '悲しむ（好感度 -6）。二階には住み続ける', 'She\'ll be hurt (bond -6); she still lives upstairs')}>
                  {t3('只當同事', '同僚に戻る', 'Just colleagues')}</button>
              </div>
            )}
            <div className="rel-gifts">
              <p><b>{t3('送禮', '贈り物', 'Gifts')}</b><small>{given ? t3('今天已經送過了', '今日はもう贈った', 'Given one today') : t3('一天一次，從現金付', '1日1回、現金から', 'One a day, from the cash')}</small></p>
              <span className="rel-gift-row">
                {GIFTS.map((g) => {
                  const known = r.gifts?.[g.id] as Taste | undefined, ok = giftOk(who, g.id), short = cash < g.price
                  const why = !ok ? t3('未成年，不送酒', '未成年にお酒は贈らない', 'Under age: no sake') : given ? t3('今天已經送過了', '今日はもう贈った', 'Given one today')
                    : short ? t3('現金不夠', '現金が足りない', 'Not enough cash') : known ? `${t3('上次', '前回', 'Last time')}${colon}${t3(...TASTE_WORDS[known])}`
                      : t3('還不知道喜不喜歡', '好みはまだわからない', 'Not yet known')
                  return (
                    <button type="button" key={g.id} className={`rel-gift${known ? ` is-${known}` : ''}`} disabled={!ok || given || short}
                      onClick={() => onGift?.(sel, g.id)} title={`${nm(g)} NT$${g.price.toLocaleString('en-US')}${colon}${why}`}>
                      <span>{nm(g)}</span>
                      <small>NT${g.price.toLocaleString('en-US')}</small>
                      <em>{known ? t3(...TASTE_WORDS[known]) : t3('未知', '未知', 'Unknown')}</em>
                    </button>
                  )
                })}
              </span>
            </div>
            <div className="rel-log">
              <b>{t3('最近', '最近', 'Lately')}</b>
              {r.bondLog?.length ? (
                <ul>
                  {r.bondLog.map((n, k) => (
                    <li key={k}><small>{t3(`第 ${n.d} 天`, `${n.d} 日目`, `Day ${n.d}`)}</small><span>{noteWhat(n)}</span>
                      <em className={n.v > 0 ? 'is-up' : 'is-down'}>{n.v > 0 ? '+' : '−'}{Math.abs(Math.round(n.v))}</em></li>
                  ))}
                </ul>
              ) : <small>{t3('還沒有記錄', 'まだ記録なし', 'Nothing yet')}</small>}
            </div>
            {others.length > 0 && (
              <p className="rel-pals">
                <b>{t3('同事', '同僚', 'Colleagues')}</b>
                <span>{t3('最要好', '一番仲良し', 'Closest')}{colon}{personName(others[0].o, lang)} <em style={{ color: warmth(others[0].v) }}>{others[0].v}</em></span>
                {others.length > 1 && <span>{t3('最不合', '一番合わない', 'Furthest')}{colon}{personName(others[others.length - 1].o, lang)} <em style={{ color: warmth(others[others.length - 1].v) }}>{others[others.length - 1].v}</em></span>}
              </p>
            )}
          </section>
        )
      })()}
      <p className="rel-key">
        <span><i style={{ background: '#3f9a5a' }} />{t3('好', '良い', 'Warm')}</span>
        <span><i style={{ background: '#9a8f80' }} />{t3('普通', 'ふつう', 'As usual')}</span>
        <span><i style={{ background: '#c0503a' }} />{t3('差', '悪い', 'Cold')}</span>
        <span><svg width="14" height="14" viewBox="-8 -7 16 15" className="rel-dorm-key"><path d="M-7 1 L0 -6 L7 1 L5 1 L5 7 L-5 7 L-5 1 Z" /></svg>{t3('住宿', '住み込み', 'Lives in')}</span>
        <span><svg width="14" height="14" viewBox="-8 -7 16 15"><path className="rel-heart" d="M0 6 C-7 1 -7 -5 -3 -5.5 C-1.2 -5.7 -0.3 -4.6 0 -3.6 C0.3 -4.6 1.2 -5.7 3 -5.5 C7 -5 7 1 0 6 Z" /></svg>{t3('陪伴', '付き添い', 'Companion')}</span>
        <span>{t3('實線老闆、虛線同事；點頭像看詳細', '実線は店主、点線は同僚。顔を押すと詳しく', 'Solid: you · dashed: each other; click a face for more')}</span>
      </p>
      {/* (what the numbers mean (item 359, the owner's 「關係系統有點看不懂」): the bond's four bands, and what the atmosphere is) */}
      <p className="rel-key rel-bands">
        {BOND_STAGES.map((st, k) => (
          <span key={st.zh} title={t3(st.does.zh, st.does.ja, st.does.en)}>
            <b>{t3(st.zh, st.ja, st.en)}</b>{st.at}{k < BOND_STAGES.length - 1 ? `–${BOND_STAGES[k + 1].at - 1}` : '–100'}
          </span>
        ))}
        <span>{t3('頭像下的數字是對老闆的好感，線越粗越好', '顔の下の数字は店主への好感度、線が太いほど良い', 'The number under each face is their bond with you; the thicker the line, the warmer')}</span>
      </p>
      <p className="rel-key rel-bands">
        <span>{t3('工作氣氛：今天上班的人對老闆和彼此的好感平均，越高做事越快', '職場の空気：今日の出勤者の店主と互いへの好感度の平均。高いほど作業が速い',
          'Atmosphere: how today\'s crew feel for you and each other, together; the warmer, the quicker the work')}</span>
      </p>
    </div>
  )
}
