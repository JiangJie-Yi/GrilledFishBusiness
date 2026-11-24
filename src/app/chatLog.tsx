import { memo, type RefObject, type UIEvent } from 'react'
import { UI, tl, type Lang } from '@/data/i18n'

/** the most lines the log keeps (a day's worth, the oldest written over past it) */
export const LOG_MAX = 300
type LogLine = { id: number; who: 'chef' | 'guest' | 'stock' | 'order' | 'staff' | 'owner'; text: string }
/** the day's log, as an online game's chat window: drawn again only when a line's added or the language changes (item 374). In the page
 * itself it was drawn again each time the page was, a few times a second while the shop's open, every line of it, up to LOG_MAX by the
 * night's end: the longer the night, the more of it each time */
export const ChatLog = memo(function ChatLog({ chat, lang, listRef, onScroll }: { chat: LogLine[]; lang: Lang; listRef: RefObject<HTMLUListElement | null>
  onScroll: (e: UIEvent<HTMLUListElement>) => void }) {
  return (
    <ul ref={listRef} className="ai-chat" aria-live="polite" onScroll={onScroll}>
      {chat.map((m) => (
        <li key={m.id} className={`ai-line ai-${m.who}`}>
          <span className="ai-who">{m.who === 'chef' ? UI[lang].chef : m.who === 'stock' ? UI[lang].stock : m.who === 'order' ? (tl(lang, '點單', '注文', 'Orders'))
            : m.who === 'staff' ? tl(lang, '員工', 'スタッフ', 'Staff') : m.who === 'owner' ? tl(lang, '老闆', '店主', 'Owner') : UI[lang].guest}</span>{m.text}
        </li>
      ))}
    </ul>
  )
})
