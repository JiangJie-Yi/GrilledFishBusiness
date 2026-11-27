/**
 * The game's guide (item 388, the owner's, 2026-11-20: 「左下加入一個小Icon 是有關魚遊戲說明，引導、教學、玩法，及員工、客人各種狀態說明。」): what
 * the little fish at the bottom left opens (ui/GameGuide), a booklet in six tabs: how to start (the first day's four steps, and the first day's
 * guide to see again), how a day of business runs, grilling yourself, the staff (who does what, what shows over their heads and what to do
 * about it), the customers (what shows of them, and why), and the controls; and the developer mode's (item 768, the owner's 「開發者操作也需要
 * 寫入到遊戲說明那」: its keys as edit.ts has them, the shop's editor and the back office). Each page a few short lines, a head and a sentence or two, as
 * the game is now (the numbers from where they're kept: game/hours, data/recipes' MENU_MIN and MENU_MAX, game/affinity, game/crewMood).
 * In the three languages; the pictures by each line drawn by the guide (the staff's own stickers over their heads, the game's glyphs).
 */
export type Tri = { zh: string; ja: string; en: string }
/** what's drawn by a line: one of the staff's emotes (scene/crewEmote's stickers), the customers' anger and steam, or a glyph of the game's */
export type GuideIcon =
  | 'alarm' | 'anger' | 'shy' | 'sparkle' | 'gloom' | 'sweat' | 'note'
  | 'steam' | 'cross' | 'hop'
  | 'box' | 'person' | 'notes' | 'calendar' | 'refresh' | 'coin' | 'heart' | 'fast' | 'eye' | 'gamepad' | 'thumb' | 'receipt' | 'drop' | 'bolt' | 'people' | 'list' | 'search' | 'globe' | 'tools' | 'ban' | 'undo'
export type GuideLine = { icon: GuideIcon; head: Tri; text: Tri }
export type GuidePage = { id: 'start' | 'shop' | 'grill' | 'staff' | 'guests' | 'keys' | 'dev'; tab: Tri; title: Tri; lines: GuideLine[] }

const t = (zh: string, ja: string, en: string): Tri => ({ zh, ja, en })

export const GAME_GUIDE: GuidePage[] = [
  {
    id: 'start', tab: t('開始', 'はじめに', 'Start'), title: t('第一天：四步就能開店', '初日：四つで開店', 'Day one: four steps to open'),
    lines: [
      { icon: 'box', head: t('進貨', '仕入れ', 'Stock up'),
        text: t('點冰箱，按「補滿」。食材不夠，菜單上的菜就賣不出去。', '冷蔵庫を押して「満タン」。食材がないと、その料理は出せない。', 'Click the fridge, then "Fill up". A dish with nothing in stock can\'t be sold.') },
      { icon: 'person', head: t('徵人', '採用', 'Hire'),
        text: t('點右上的錢（經營）→ 人事 →「一鍵徵人」。二廚、三廚、外場、收銀、倉儲各有各的工作。', '右上のお金（経営）→ 人事 →「おまかせ採用」。二番手、三番手、ホール、レジ、倉庫、それぞれに持ち場がある。', 'Click your money (Office), then Staff, then "Hire all". Cooks, servers, cashier and stock keeper each have their job.') },
      { icon: 'notes', head: t('菜單', '献立', 'Menu'),
        text: t('經營 → 廚房 → 料理研製，請二廚做一份 20 道的菜單，或自己研發。菜單至少 20 道（白飯、味噌湯不算）、最多 40 道，烤魚、串燒・海鮮、烤蔬菜、飯物・小菜四類各至少 5 道。', '経営 → 厨房 → 料理研究で、二番手に20品の献立を頼むか、自分で考える。20品から40品まで（ご飯・味噌汁は数えない）、焼き魚・串焼き・焼き野菜・ご飯と一品の四種類を各5品以上。', 'Office, then Kitchen, then Recipes: have your cook make a 20-dish menu, or work out your own. 20 at least (rice and miso soup not counted), 40 at most, 5 or more of each kind: fish, skewers, vegetables, rice & sides.') },
      { icon: 'calendar', head: t('開店', '開店', 'Open'),
        text: t('營業時間 16:30～04:30。時間到，按右上的「閉」開店（變成「營」）。還早的話可以直接跳到 16:30。', '営業は 16:30～04:30。時間になったら右上の「閉」で開店（「営」になる）。早ければ 16:30 まで飛ばせる。', 'Open 16:30 to 04:30. When it\'s time, click "Off" top right to open (it turns "On"). Early? Skip to 16:30.') },
      { icon: 'refresh', head: t('自動營運', '自動運営', 'Auto-run'),
        text: t('右上的「自」：自己徵人、補貨、做菜單、開店，員工累了就讓他休息。想專心看店時打開。', '右上の「自」：採用・仕入れ・献立・開店まで自動、疲れたスタッフは休ませる。眺めていたい時に。', '"A" top right: it hires, stocks, makes the menu and opens by itself, and rests whoever\'s worn out.') },
    ],
  },
  {
    id: 'shop', tab: t('營業', '営業', 'The shop'), title: t('一晚的營業', '一晩の営業', 'A night\'s business'),
    lines: [
      { icon: 'list', head: t('從點菜到上菜', '注文から配膳まで', 'Order to table'),
        text: t('客人入座點菜 → 二廚取料、穿串 → 老闆（大廚）上火烤 → 三廚擺盤、煮飯、盛湯 → 外場端到客人面前。', '着席して注文 → 二番手が仕込んで串打ち → 店主（大将）が焼く → 三番手が盛り付け・ご飯・汁 → ホールが運ぶ。', 'They sit and order; the second cook fetches and skewers; you, the head chef, grill; the third cook plates; a server carries it out.') },
      { icon: 'receipt', head: t('結帳與外帶', '会計と持ち帰り', 'Paying, takeaway'),
        text: t('吃完到櫃檯付錢，收銀員結帳。外帶客和外送員在玄關等，外場把袋子送出去。', '食べ終えたらレジで会計。持ち帰りの客や配達員は玄関で待ち、ホールが袋を渡す。', 'Done, they pay at the till. Takeaway customers and riders wait in the entrance for a server to bring the bag.') },
      { icon: 'heart', head: t('評價', '評判', 'Reviews'),
        text: t('等太久、菜不好吃會扣分；評價越好，上門的客人越多。', '待たせすぎや味が悪いと評価が下がる。評判が良いほど客が増える。', 'Long waits and poor dishes cost you; the better your reviews, the more customers come.') },
      { icon: 'coin', head: t('成本與定價', '原価と値段', 'Cost and price'),
        text: t('每道菜有食材成本，售價自己定。賣得越多、評價越好，就越賺。', '料理ごとに原価があり、値段は自分で決める。', 'Each dish costs its ingredients; you set the price.') },
      { icon: 'calendar', head: t('深夜與收店', '深夜と閉店', 'Late and closing'),
        text: t('過了午夜是深夜。04:00 最後點餐，客人走光、員工下班後，結算這一天。', '零時を過ぎたら深夜。04:00 ラストオーダー、客が帰りスタッフが上がると一日の締め。', 'Past midnight it\'s late night. Last orders at 04:00; once everyone\'s gone home, the day is totted up.') },
      { icon: 'fast', head: t('加速', '早送り', 'Faster'),
        text: t('右上的快轉鍵是兩倍速；閉店時「前往下一個營業日」可以跳過等待。', '右上の早送りで2倍速。閉店中は「次の営業日へ」で待ち時間を飛ばせる。', 'Fast-forward top right doubles the speed; while shut, "Next business day" skips the wait.') },
    ],
  },
  {
    id: 'grill', tab: t('烤魚', '焼き場', 'Grilling'), title: t('自己站爐', '自分で焼く', 'At the fire yourself'),
    lines: [
      { icon: 'search', head: t('研製', '試作', 'Try it out'),
        text: t('閉店時按 2 到灶台：自己夾魚上架、穿串、翻面、調味，看火候和熟度，烤出好吃的組合。', '閉店中に 2 で炉端へ。魚を取って串打ち、返して味付け、火加減と焼き加減を見る。', 'While shut, press 2 for the hearth: take the fish, skewer it, turn it, season it, and watch the heat and how done it is.') },
      { icon: 'bolt', head: t('炭火', '炭火', 'The coals'),
        text: t('火太弱烤不熟、太強會焦；營業中三廚會添炭、顧火。', '弱いと生焼け、強いと焦げる。営業中は三番手が炭を足して火を見る。', 'Too low and it won\'t cook, too high and it burns; while open, the third cook feeds and tends the fire.') },
      { icon: 'notes', head: t('研發新菜', '新しい料理', 'New dishes'),
        text: t('試出好吃的搭配，就能加進菜單。', 'うまい組み合わせが見つかれば献立に加えられる。', 'Find a pairing that works and it can go on the menu.') },
      { icon: 'eye', head: t('營業中', '営業中', 'While open'),
        text: t('廚房自己烤，你看著、稱讚或催促員工就好。', '厨房が自分で焼く。見守って、褒めたり急かしたり。', 'The kitchen grills on its own: watch, and praise or hurry your staff.') },
    ],
  },
  {
    id: 'staff', tab: t('員工', 'スタッフ', 'Staff'), title: t('員工頭上的符號', 'スタッフの頭上のしるし', 'Over the staff\'s heads'),
    lines: [
      { icon: 'alarm', head: t('驚嘆號', 'びっくり', 'Startled'),
        text: t('客人剛抱怨等太久，或被嚇了一跳。快把菜送出去。', '客が待ちくたびれて文句を言った、または驚いた。早く料理を出そう。', 'A customer just complained of the wait, or they were startled. Get the food out.') },
      { icon: 'anger', head: t('怒氣', '怒り', 'Cross'),
        text: t('被減薪、跟同事吵架，或跟你不合又很忙。稱讚、員工餐、加薪都能拉回好感。', '減給、同僚とのけんか、店主と合わずに忙しい時。褒める、まかない、昇給で持ち直す。', 'A pay cut, a row with a colleague, or cold with you and pressed. Praise, a staff meal or a raise win them back.') },
      { icon: 'shy', head: t('臉紅', '照れ', 'Shy'),
        text: t('被你稱讚了。', '褒められた。', 'You\'ve just praised them.') },
      { icon: 'sparkle', head: t('閃亮', 'キラキラ', 'Glad'),
        text: t('加薪、吃了員工餐，或跟朋友聊得開心，走路都輕快起來。', '昇給、まかない、仲間との楽しい会話。足取りも軽い。', 'A raise, the staff meal, a good chat with a friend: a spring in their step.') },
      { icon: 'gloom', head: t('烏雲', 'どんより', 'Worn out'),
        text: t('累壞了，肩膀垂下、動作變慢。讓他休息，排班別超過 10 小時。', '疲れ切って肩が落ち、動きが遅い。休ませて、10時間を超えないシフトに。', 'Worn out: shoulders down, slower. Let them rest; keep shifts under 10 hours.') },
      { icon: 'sweat', head: t('汗滴', '汗', 'Pressed'),
        text: t('店裡很忙，或剛被催促：身體往前傾、動作變快。', '店が忙しい、または急かされた。前のめりで手早くなる。', 'The shop\'s busy, or you just hurried them: leaning in, quicker.') },
      { icon: 'note', head: t('音符', '鼻歌', 'Humming'),
        text: t('跟大家處得好又不忙，偶爾哼起歌來。', '仲が良くて忙しくない時、時々鼻歌。', 'Getting on well and not pressed: humming now and then.') },
      { icon: 'thumb', head: t('稱讚與催促', '褒める・急かす', 'Praise, hurry'),
        text: t('點員工：稱讚（上班滿 4 小時、一天一次，好感 +3）；催促（一陣子變快，好感略降，隔一陣子才能再催）。', 'スタッフを押す：褒める（4時間以上勤務で1日1回、好感+3）。急かす（しばらく速くなるが好感は少し下がる）。', 'Click one of them: Praise (after 4 hours on, once a day, +3) or Hurry (quicker a while, a little less fond).') },
    ],
  },
  {
    id: 'guests', tab: t('客人', 'お客さん', 'Customers'), title: t('客人的樣子', 'お客さんの様子', 'How customers show it'),
    lines: [
      { icon: 'anger', head: t('怒氣符號', '怒りマーク', 'Anger mark'),
        text: t('等第一道菜等到耐心過半，頭旁冒出怒氣符號，一跳一跳。', '最初の一品を待って我慢が半分を過ぎると、頭の横に怒りマーク。', 'Past half their patience waiting for their first dish, an anger mark by their head, throbbing.') },
      { icon: 'cross', head: t('生氣的臉', '怒った顔', 'Cross face'),
        text: t('耐心過七成，臉也變了。', '我慢が七割を超えると顔つきが変わる。', 'Past seven tenths, their face shows it.') },
      { icon: 'steam', head: t('頭冒煙', '湯気', 'Steaming'),
        text: t('過八成頭頂冒煙；再等下去會抱怨、評價變差，甚至生氣走人。', '八割を超えると頭から湯気。さらに待たせると文句、悪い評価、怒って帰ることも。', 'Past eight tenths, steam off the top; any longer and they complain, review you badly, or walk out.') },
      { icon: 'hop', head: t('開心', '大喜び', 'Delighted'),
        text: t('菜一來，開心得跳一下。', '料理が来ると、うれしくて小さく跳ねる。', 'Their food comes: a little hop of delight.') },
      { icon: 'people', head: t('長凳等位', '長椅子で待つ', 'The bench'),
        text: t('客滿時在玄關的長凳等，有空位會被叫去坐；等太久就走了。', '満席なら玄関の長椅子で待ち、空けば呼ばれる。待ちすぎると帰る。', 'Full, they wait on the entrance bench and are called to a free stool; too long, and they leave.') },
      { icon: 'drop', head: t('飲料與廁所', '飲み物とトイレ', 'Drinks, toilets'),
        text: t('會自己去冰箱拿飲料、去廁所、從抽屜拿衛生紙；記得補貨、補衛生紙。', '自分で冷蔵庫から飲み物、トイレへ、引き出しのティッシュも。補充を忘れずに。', 'They fetch drinks from the fridge, go to the toilet, take tissues from the drawer: keep them stocked.') },
    ],
  },
  {
    id: 'keys', tab: t('操作', '操作', 'Controls'), title: t('怎麼操作', '操作のしかた', 'How to play it'),
    lines: [
      { icon: 'eye', head: t('切換視角', '視点', 'Views'),
        text: t('數字鍵 1～9、0 切換視角，左邊的 ` 鍵是俯視；也可以點左下的眼睛選。', '数字キー 1～9・0 で視点、` キーで真上。左下の目からも選べる。', 'Number keys 1-9 and 0 change the view, the ` key looks straight down; or pick one from the eye at the bottom left.') },
      { icon: 'gamepad', head: t('轉動與縮放', '回転と拡大', 'Turn and zoom'),
        text: t('自由視角時，拖曳轉動，滾輪縮放。', '自由視点ではドラッグで回し、ホイールで拡大。', 'In the overview, drag to turn and use the wheel to zoom.') },
      { icon: 'search', head: t('點東西', 'クリック', 'Click things'),
        text: t('點員工（稱讚、催促）、冰箱（補貨）、牆上的菜單、收銀機下的說明書、電燈開關……很多東西都能點。', 'スタッフ、冷蔵庫、壁のお品書き、レジ下の説明書、照明スイッチ……いろいろ押せる。', 'Click the staff, the fridge, the menu on the wall, the booklet under the till, the light switches: much of the shop answers.') },
      { icon: 'globe', head: t('語言', '言語', 'Language'),
        text: t('右上可以切換中文、日文、英文。', '右上で中国語・日本語・英語を切り替え。', 'Switch between Chinese, Japanese and English top right.') },
      { icon: 'person', head: t('老闆視角', '店主の目線', 'Through the owner’s eyes'),
        text: t('按 0 從老闆的眼睛看出去：W／S 前進後退、A／D 轉身、空白鍵跳；放開一陣子他會自己走回爐前。', '0 で店主の目線に。W／S で前後に歩き、A／D で向きを変え、スペースでジャンプ。しばらく放すと持ち場に戻る。', 'Press 0 to see through the owner’s eyes: W/S walk, A/D turn, Space jumps; let go a while and he walks back to his fire.') },
      { icon: 'tools', head: t('店面編輯', '店の編集', 'Arrange the shop'),
        text: t('按 G 進出編輯模式，可以移動擺設；所有開發者操作在「開發者」這一頁。', 'G で編集モード、置き物を動かせる。開発者の操作は「開発者」のページに。', 'Press G to go in and out of edit mode and move things about; every developer key is on the Developer page.') },
    ],
  },
  {
    id: 'dev', tab: t('開發者', '開発者', 'Developer'), title: t('開發者模式：店面編輯', '開発者モード：店の編集', 'Developer mode: arranging the shop'),
    lines: [
      { icon: 'tools', head: t('進出', '出入り', 'In and out'),
        text: t('G：在遊戲畫面原地進出開發者模式（營業中不能開）。Shift+G：在新分頁開獨立的店面編輯器，一打開就在編輯，上方選單、左邊階層、右邊屬性。', 'G：その場で開発者モードの出入り（営業中は不可）。Shift+G：別タブで店のエディタを開く。開いた時から編集中、上にメニュー、左に階層、右に属性。', 'G: in and out of developer mode right in the game (not while open). Shift+G: the shop’s editor in a tab of its own, always editing, menus on top, the tree on the left, properties on the right.') },
      { icon: 'search', head: t('選取與工具', '選択とツール', 'Pick and tools'),
        text: t('點擺設（或左邊階層）選取。Q 選取、W 移動、E 旋轉、R 縮放；同一個鍵再按一次，在世界座標與自身座標之間切換。', '置き物（または左の階層）を押して選択。Q 選択、W 移動、E 回転、R 拡縮。同じキーをもう一度で、ワールドとローカルの座標を切り替え。', 'Click a piece (or its row in the tree) to pick it. Q picks, W moves, E turns, R scales; the same key again switches between the world’s axes and its own.') },
      { icon: 'eye', head: t('看與對準', '見る・合わせる', 'Look and frame'),
        text: t('F 對準選取的擺設、A 看整間店、Esc 取消選取（沒選東西時離開開發者模式）。1～5 換顯示方式（4 是線框）。', 'F で選んだ物に合わせ、A で店全体、Esc で選択解除（何も選んでいなければ終了）。1～5 で表示を切り替え（4 はワイヤー）。', 'F frames what’s picked, A the whole shop, Esc lets go (with nothing picked, leaves developer mode). 1 to 5 change how it’s drawn (4 is the wireframe).') },
      { icon: 'gamepad', head: t('縮放與軸心', '拡縮と軸', 'Scale and pivot'),
        text: t('X、Y、Z 選要縮放的軸（再按一次三軸一起），+、− 調操作軸的大小；D 切換軸心模式，可以移動擺設的軸心。', 'X・Y・Z で拡縮の軸（もう一度で三軸）、＋・− で操作ハンドルの大きさ。D で軸の位置を動かすモード。', 'X, Y, Z pick the axis to scale along (again: all three); + and - size the handles; D switches to moving a piece’s pivot.') },
      { icon: 'ban', head: t('藏起與刪除', '隠す・消す', 'Hide and delete'),
        text: t('H 藏起選取的擺設、Alt+H 全部顯示；動線圖上的禁區與路點，選取後按 Delete 刪除。', 'H で選んだ物を隠し、Alt+H で全部表示。動線図の立入禁止と経由点は、選んで Delete で削除。', 'H hides what’s picked, Alt+H shows all that’s hidden; on the paths’ map, pick a keep-clear patch or a waypoint and press Delete.') },
      { icon: 'undo', head: t('復原與儲存', '元に戻す・保存', 'Undo and save'),
        text: t('Ctrl+Z 復原，Ctrl+Y（或 Ctrl+Shift+Z）重做。獨立編輯器裡 Ctrl+S 儲存；檔案選單可以捨棄未儲存的修改，或「試玩」先存再開遊戲。', 'Ctrl+Z で元に戻す、Ctrl+Y（Ctrl+Shift+Z）でやり直し。エディタでは Ctrl+S で保存。ファイルメニューで未保存の変更を破棄、「試遊」で保存してゲームを開く。', 'Ctrl+Z undoes, Ctrl+Y (or Ctrl+Shift+Z) redoes. In the editor Ctrl+S saves; the File menu throws away what’s unsaved, or Play saves and opens the game.') },
      { icon: 'list', head: t('後台', 'バックオフィス', 'Back office'),
        text: t('編輯器的「視窗 → 後台」：連著正在跑的遊戲分頁，看營運、帳本、評價、客人、員工與日誌，可以調速度、跳時間。', 'エディタの「ウィンドウ → バックオフィス」：動いているゲームのタブにつながり、営業・帳簿・評判・客・スタッフ・日誌を見て、速さや時間を変えられる。', 'The editor’s Window, then Back office: hooked to the game running in another tab, its business, books, reviews, customers, staff and log, its speed and its clock.') },
      { icon: 'bolt', head: t('效能條', '性能バー', 'Performance bar'),
        text: t('F：顯示或藏起右上角的效能條（每秒畫面數、繪製次數、三角面……）；在開發者模式裡 F 是對準選取的擺設。', 'F：右上の性能バーを表示／非表示（FPS・描画回数・ポリゴン数…）。開発者モードでは F は選んだ物に合わせる。', 'F shows or hides the performance bar top right (frames a second, draw calls, triangles...); in developer mode F frames what’s picked instead.') },
    ],
  },
]
