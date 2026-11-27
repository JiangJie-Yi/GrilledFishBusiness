import type { Lang } from './i18n'

/**
 * After work's words (items 770, 796; game/staff/afterWork): what the owner says as he asks, and what they say back (over their heads, and in
 * the log), each of the after-work things; and, the nights one living upstairs comes to him of their own accord, what happens ({n} their
 * name), for the log
 */
type Pool = Record<Lang, readonly string[]>
type Id = 'thanks' | 'beer' | 'shogi' | 'radio' | 'tea' | 'latebite' | 'hometown'
export const AFTER_OWNER: Record<Id, Pool> = {
  thanks: { zh: ['今天辛苦了。', '辛苦啦，早點休息。', '今天也謝謝你。'], ja: ['今日もお疲れさま。', 'お疲れ、早めに休めよ。', '今日もありがとな。'], en: ['Thanks for today.', 'Good work today. Get some rest.', 'Thank you for today.'] },
  beer: { zh: ['來，喝一杯吧。', '冰的啤酒，一人一罐。'], ja: ['よし、一杯やろう。', '冷えたのが二本あるぞ。'], en: ['Come on, have a beer.', 'Two cold ones. One each.'] },
  shogi: { zh: ['來下一盤？', '棋盤擺好了，坐吧。'], ja: ['一局どうだ？', '盤を出したぞ、座れ。'], en: ['A game?', 'Board is out. Sit down.'] },
  radio: { zh: ['今天有比賽，一起聽吧。', '收音機開了，第七局了。'], ja: ['今日は試合だ、一緒に聴こう。', 'ラジオつけたぞ、七回だ。'], en: ['There is a game on. Listen with me.', 'Radio is on. Seventh inning.'] },
  tea: { zh: ['泡了茶，一起喝吧。', '熱茶，暖暖身子。'], ja: ['お茶淹れたよ、一緒にどう？', '温かいお茶でもどうだ。'], en: ['I made tea. Have some with me.', 'Hot tea. Warm yourself up.'] },
  latebite: { zh: ['餓了吧？巷口的攤子還開著。', '走，請你吃碗熱湯麵。'], ja: ['腹減ったろ？路地の屋台まだやってるぞ。', '行こう、温かいそばをご馳走する。'], en: ['Hungry? The stall up the lane is still open.', 'Come on, hot noodles on me.'] },
  hometown: { zh: ['說說你家鄉吧。', '你家鄉是什麼樣的地方？'], ja: ['故郷の話を聞かせてくれ。', 'どんなところで育ったんだ？'], en: ['Tell me about home.', 'What is it like, where you grew up?'] },
}
export const AFTER_REPLY: Record<Id, Pool> = {
  thanks: { zh: ['老闆也辛苦了！', '謝謝老闆，明天見。', '嗯，明天也加油！'], ja: ['店長もお疲れさまです！', 'ありがとうございます、また明日。', 'はい、明日も頑張ります！'], en: ['You too, boss!', 'Thanks, boss. See you tomorrow.', 'Right. Tomorrow too!'] },
  beer: { zh: ['那我就不客氣了！乾杯！', '老闆請的最好喝。'], ja: ['じゃ、遠慮なく！乾杯！', '店長のおごりは格別ですね。'], en: ['Don’t mind if I do! Cheers!', 'Tastes better when you’re buying.'] },
  shogi: { zh: ['這次我可不會輸！', '老闆手下留情啊。'], ja: ['今度は負けませんよ！', 'お手柔らかに頼みます。'], en: ['I won’t lose this time!', 'Go easy on me, boss.'] },
  radio: { zh: ['我也正想聽！今天一定贏！', '打出去了！啊，界外。'], ja: ['ちょうど聴きたかった！今日は勝つ！', '打った！あ、ファウルか。'], en: ['Just what I wanted! We’ll win today!', 'That’s gone! Ah, foul.'] },
  tea: { zh: ['謝謝老闆……好暖和。', '老闆泡的茶，比我泡的好喝。'], ja: ['ありがとうございます……温まります。', '店長のお茶、私のより美味しいです。'], en: ['Thank you... it’s so warm.', 'Your tea is better than mine.'] },
  latebite: { zh: ['好啊！我想吃熱湯麵！', '老闆請客？那我要加蛋！'], ja: ['やった！温かいおそば！', 'おごりですか？じゃあ卵も！'], en: ['Yes! Hot noodles!', 'Your treat? Then I’m having an egg on it!'] },
  hometown: { zh: ['我家鄉的海很漂亮，下次帶老闆去看。', '每到這個季節，家裡的柿子就熟了。'], ja: ['海がきれいなところです。今度ご案内しますね。', 'この時期になると、実家の柿が熟すんです。'], en: ['The sea there is beautiful. I’ll take you some day.', 'This time of year, the persimmons at home are ripe.'] },
}
/** the nights they come of their own accord (game/staff/afterWork's nightBond: the ones that cost nothing) */
export const AFTER_NIGHT: Partial<Record<Id, Pool>> = {
  tea: { zh: ['{n}泡了一壺熱茶端到老闆面前：「今天辛苦了，喝杯茶吧。」兩人聊了一會兒。'], ja: ['{n}がお茶を淹れて持ってきた。「今日もお疲れさまです、どうぞ。」二人でしばらく話した。'], en: ['{n} brings the boss a pot of hot tea: "Long day. Have some tea." They talk a while.'] },
  hometown: { zh: ['{n}坐到老闆旁邊，聊起了家鄉的事，說著說著笑了起來。'], ja: ['{n}が店長の隣に座って、故郷の話を始めた。話しているうちに笑顔になった。'], en: ['{n} sits down by the boss and talks about home, laughing as she goes on.'] },
  shogi: { zh: ['{n}拿出將棋盤：「老闆，來一盤？」兩人下到很晚。'], ja: ['{n}が将棋盤を出してきた。「店長、一局どうです？」遅くまで指した。'], en: ['{n} brings out the shogi board: "One game, boss?" They play late into the night.'] },
  radio: { zh: ['{n}開了收音機：「老闆，比賽還沒結束！」兩人一起聽到最後一局。'], ja: ['{n}がラジオをつけた。「店長、まだ試合やってますよ！」二人で最終回まで聴いた。'], en: ['{n} turns on the radio: "Boss, the game’s still on!" They listen to the last inning together.'] },
}
