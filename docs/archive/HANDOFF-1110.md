# 交接封存（2026-11-10 以前）

從 `HANDOFF.md` 搬來（第 1000 項，2026-11-28），內容原封不動：第 2 節 11-10 以前的各階段、第 5 節 11-10 當時的待辦。

## 2. 已完成項目（11-10 以前）

### 2-1　2026-11-10 下午：水桶、洗手盆、門口燈籠與魚燈、飲料櫃

| 項目 | 改了哪些檔案 | commit |
|---|---|---|
| **洗手盆蓄水、放水**：排水口上一個黃銅按壓塞，點缽或排水口切換塞住（蓄水）、彈起（放水）；塞住開水約 3.5 秒蓄滿，到缽緣下 3 公分就停；關水水位不變；拔塞約 2.4 秒放完（漩渦、咕嚕聲）；開著水拔塞，盆底只留一層薄水；水面照缽的輪廓縮放，半透明藍綠、反射、會流動的波紋；水柱只畫到水面，落點三圈漣漪 | `game/service/basin.ts`、`bdd/basin.test.ts`、`grill/Restroom.tsx`、`grill/bar.ts`（`TOILETS[who].basin`）、`grill/restroomSound.ts`（`plugSound`、`drainGurgle`、`basinPour`）、`data/tipText.ts` | `1ecbec8` |
| **門口燈籠跟著店開關**：開店自動點亮、開始收店（最後點餐）自動熄，約 0.4 秒淡入淡出，開關照樣能手動切；開發模式下燈籠紙怎麼切都全亮的錯誤修好（材質記在 `useMemo` 的 ref 裡，React 嚴格模式跑兩次，記到沒用上的那份）；夜裡熄了的紙 0.12 | `game/world/roomLights.ts`（`lanternsLit`）、`bdd/room-lights.test.ts`、`App.tsx`、`scene/render/lightsStore.ts`（`setLightSwitch`）、`grill/GuestBar3D.tsx`（`Chochin`、`FishLantern`） | `3d3ea76` |
| **魚燈**：底下那片淡藍光暈以前沒接開關、一直亮，現在跟門口燈籠同一條線路 | 同上（`grill/GuestBar3D.tsx` 的 `FishLantern`） | `3d3ea76` |
| **飲料櫃每層平均排開**：照每瓶實際的寬度，瓶與瓶、兩端的間隙一樣，鋪滿層架；後排直直往後排；滑鼠指到的那瓶不浮起、不放大，只在原地發亮；每層放什麼沒變，瀏覽器存的飲料不受影響 | `grill/DiningRoom.tsx`（`shelfLayout`、`shelfSize`、`HoverLit`）、`grill/bar.ts`（`FRIDGE_UNITS` 拿掉 `pitch`） | `0689e3f` |
| **水桶放回灶台桌上**：火爐右邊、三廚凹槽左前角；三廚在凹槽裡跨一步舀水，退回原位灑 | `grill/Roasting.tsx`（`TABLE_BIN`）、`grill/GuestBar3D.tsx`（`dipFrom`）、`grill/bar.ts` | `2069df3` |
| **鋁箔包飲料**：蘋果汁、麥茶、蔬果汁，放第三層（12 格）；摔不破、倒下不滾 | `grill/DiningRoom.tsx`（`PACK`、`drawLabel`）、`grill/bar.ts`、`game/stock/drinkStock.ts`、`game/service/spills.ts`、`grill/DrinkStockPanel.tsx`、`grill/restroomSound.ts`（`boxThud`）、`bdd/spills.test.ts` | `ea9000f` |
| **飲料櫃的瓶罐看得到玻璃與裡面的飲料**，罐裝有鋁蓋與拉環；**玻璃瓶摔破**（0.4 公尺以上），外場拿掃把來掃 | `grill/DiningRoom.tsx`、`grill/Spills.tsx`、`game/service/spills.ts`、`bdd/spills.test.ts`、`blender/broom.py` → `models/broom.glb`、`scene/people/people/StaffFigure.tsx`、`grill/GuestBar3D.tsx`、`grill/bar.ts`、`grill/restroomSound.ts`、`data/lines.ts`、`App.tsx` | `3b1ec47` |
| **滑鼠指到的發亮改回原本那版**（材質複本加暖光）；中間試過輪廓光暈，店主不要 | `scene/interact/hoverGlow.ts`、`grill/DiningRoom.tsx` | `698b4be`（還原 `156e512`） |
| **開發者模式只選看得到的實體**（吊燈光暈、桌上光圈不再擋住後面的東西）；同一處再點選後面一層；H 隱藏、Alt+H 全部顯示 | `scene/interact/pickable.ts`、`grill/Movable.tsx`、`grill/edit.ts`、`App.tsx`、`scene/render/StaticBatch.tsx`、`scene/render/OccluderFade.tsx`、`data/editText.ts` 等 | `f77c0c5` |
| **流理台檯面一整塊磨石子**；**洗碗機**可以自己開門、放盤、洗（藍燈倒數、綠勾、蒸氣） | `blender/sink.py` → `models/sink.glb`、`grill/Sink.tsx`、`game/service/plates.ts`、`bdd/plates.test.ts`、`grill/GuestBar3D.tsx`、`grill/Decor.tsx`、`grill/bar.ts`、`grill/restroomSound.ts`、`data/editText.ts` | `84e9987` |
| **每樣食材最多 100 份** | `game/money/economy.ts`（`STOCK_CAP`、`roomFor`）、`bdd/stock-cap.test.ts`、`grill/StockPanel.tsx`、`App.tsx`、`src/index.css` | `ed0ebd7` |
| **烘手機改成直立式 Jet Towel** | `blender/wc.py` → `models/toilet.glb`、`models/wcbits.glb`、`grill/Restroom.tsx`、`grill/BarFurnish.tsx`、`grill/DiningRoom.tsx` | `5f3b8cf` |
| **飲料櫃燈箱重畫**（2048×540、每個字分開排、胡桃木框、拿掉「聞」印） | `grill/DiningRoom.tsx`、`blender/drinkfridge.py` → `models/drinkfridge.glb`、`scene/render/textureCap.ts` | `858991a` |
| **飲料紙箱照日本飲料箱印刷**（每一面照比例的展開圖、條碼、天地無用、回收標章） | `grill/drinkCartons.ts`、`blender/drinkcartons.py` → `models/drinkcartons.glb`、`grill/DiningRoom.tsx` | `3ac4679` |

### 2-2　2026-11-10 凌晨到中午

| 項目 | 改了哪些檔案 | commit |
|---|---|---|
| 灶台固定位置：火邊最多 8 串、砧板 4 串、裝盤處 3 格，鐵串落盤就拔 | `game/kitchen/fireSlots.ts`、`bdd/fire-slots.test.ts`、`game/kitchen/chefFlow.ts`、`grill/Roasting.tsx`、`grill/bar.ts`、`grill/Grill2D.tsx`、`App.tsx` | `80ec9f0` |
| 飲料數量只算自己格子裡的（放到別格的另外標 +n） | `game/stock/drinkStock.ts`、`bdd/drink-stock.test.ts`、`grill/DrinkStockPanel.tsx`、`src/index.css` | `aa36652` |
| 關於頁精簡、故事照店主改寫 | `data/story.ts`、`ui/panels/Reputation.tsx`、`src/index.css` | `7c33051` |
| 衛生紙垂下的那張貼著紙捲 | `grill/Restroom.tsx` | `9652b3c` |
| 三廚的凹槽（灶台桌尾挖一塊），兩個凹處的內壁在桌面下變暗 | `grill/Roasting.tsx`、`grill/GuestBar3D.tsx`、`grill/Decor.tsx`、`grill/bar.ts`、`App.tsx`、`blender/notchstep.py` → `models/notchstep.glb` | `c67c06a`、`11af9f5` |
| 老闆一律實心；兩塊木台階改成 5 公分的簀の子；老闆、台階、水桶、廚餘桶回到廚房地板（以前浮在桌面的高度） | `grill/Roasting.tsx`、`grill/Boss.tsx`、`grill/bar.ts`、`blender/notchstep.py` → `models/notchstep.glb`、`data/editText.ts` | `246e9b6`、`188bb48` |
| 全部擺設的操作軸移到腳底中心（114 件），吊掛的在中心；灶台與圍爐裏是禁區 | `grill/Movable.tsx`、`grill/edit.ts`、`game/kitchen/hearthGuard.ts`、`bdd/hearth-guard.test.ts`、`grill/Boss.tsx`、`grill/Roasting.tsx`、`grill/GuestBar3D.tsx`、`grill/bar.ts` | `9b2d96e` |
| 麻袋改成開口、裝滿的麻袋 | `blender/produce.py` → `models/produce.glb`、`grill/KitchenStores.tsx` | `9777b14`、`4a89ada` |
| 小學生的日式硬殼書包，肩帶順著身體 | `blender/folk.py` → `models/folk.glb`、`scene/people/people/people/FolkFigure.tsx` | `71e0495`、`13fad35` |
| 三味線美人的持琴姿勢 | `grill/DiningRoom.tsx` | `b7c82f0` |
| 青海波飾帶放大（不再密到閃爍） | `grill/DiningRoom.tsx` | `3211d1a` |
| 客人上下高腳椅、走道交會、轉角轉身、外帶與長凳的人轉身都不再一格跳過去 | `scene/people/people/people/FolkFigure.tsx`、`grill/GuestBar3D.tsx` | `4be0f9a`、`a9c17ce`、`02a0c74`、`b0af9f3` |
| 吧台餐具各自是一件擺設（筷子與筷架、醬油碟、醬油壺與山葵） | `grill/Roasting.tsx`、`grill/GuestBar3D.tsx`、`grill/bar.ts`、`data/editText.ts` | `1f15ebd` |
| 吧台底座往後退，讓出座位抽屜盒 | `grill/Roasting.tsx`、`grill/bar.ts` | `22ee14c` |
| 外場擦桌不再把頭壓進桌面 | `scene/people/people/StaffFigure.tsx`、`grill/GuestBar3D.tsx` | `39802e6` |
| 神龕花瓶直立貼桌、各自的轉向與大小 | `grill/DiningRoom.tsx` | `c06cf40` |
| 鞋櫃深度減半、壓胡桃木紋 | `blender/shoecab.py` → `models/shoecab.glb`、`grill/GuestBar3D.tsx` | `ace686e` |
| 客人一口一口喝飲料、離開時留下自己的瓶罐；地上的垃圾桶換成廚餘桶 | `scene/people/people/people/FolkFigure.tsx`、`grill/GuestBar3D.tsx`、`grill/DiningRoom.tsx`、`grill/Roasting.tsx`、`grill/bar.ts`、`blender/foodwaste.py` → `models/foodwaste.glb`、`game/stock/drinkStock.ts`、`game/world/hours.ts`、`ui/screens/DaySummary.tsx`、`bdd/hours.test.ts` | `d40e22c` |
| 廁所門牌是厚胡桃木板，兩扇門的暖簾桿分開 | `grill/DiningRoom.tsx`、`data/tipText.ts` 等 | `e87cd83` |
| 左下日誌像線上遊戲的聊天視窗（留一整天、可往上翻、不擋滑鼠） | `App.tsx`、`src/index.css` | `8b8a9f4` |
| 灶台正面兩個鐵串筒（乾淨、回收） | `grill/SkewerStore.tsx`、`grill/Roasting.tsx`、`grill/Decor.tsx`、`grill/GuestBar3D.tsx` 等 | `9d39392` |
| 員工疲勞照忙、待命、偷閒算，只有倉儲會偷閒 | `data/staff.ts`、`game/world/shopState.ts`、`bdd/staff.test.ts`、`grill/GuestBar3D.tsx`、`grill/Roasting.tsx`、`ui/panels/Office.tsx`、`App.tsx` | `f63aafe` |
| 關於頁的版本在本機寫「開發版」 | `data/credits.ts`、`ui/panels/Reputation.tsx`、`bdd/version.test.ts` | `d6476ee` |

### 2-3　2026-11-09（113 個提交，重點）

| 項目 | 改了哪些檔案 | commit |
|---|---|---|
| 飲料櫃燈箱改成居酒屋行燈、層架名牌、櫃頂清空、離牆；背板通風孔 | `grill/DiningRoom.tsx`、`grill/bar.ts`、`scene/props/signFont.ts`、`index.html` | `3178960`、`8b63a17` |
| 飲料多 6 種（黑咖啡、拿鐵、柚子蘇打、黑啤酒、燒酎、梅酒） | `grill/DiningRoom.tsx`、`grill/bar.ts`、`game/stock/drinkStock.ts` | `8ef7f06` |
| 打烊時不再有浮在半空的盤子（手上的放好才下班） | `grill/GuestBar3D.tsx`、`grill/Roasting.tsx`、`grill/DiningRoom.tsx` | `dc007d8` |
| 客人面前有菜才拿筷子、各吃各的；吃完擦嘴、留一團紙巾 | `grill/GuestBar3D.tsx`、`grill/Roasting.tsx`、`grill/bar.ts`、`scene/people/people/people/FolkFigure.tsx` | `15f5f9f`、`e08facc` |
| 擺盤照盤子大小、一份在正中 | `grill/Roasting.tsx` | `95277bb`、`bfb5dc4` |
| 外帶盒在桌面內、跟著托盤 | `grill/Roasting.tsx`、`grill/bar.ts`、`grill/GuestBar3D.tsx` | `5ee37f1`、`da16a04` |
| 候位長凳 | `blender/bench.py` → `models/bench.glb`、`grill/GuestBar3D.tsx`、`grill/Roasting.tsx`、`grill/bar.ts`、`data/lines.ts` | `6be40a5`、`ef396fa`、`1d75611` |
| 保溫餐檯（飯桶、味噌湯、羽釜、電鍋一字排開），後來移到後場水槽旁 | `blender/warmer.py` → `models/warmer.glb`、`grill/Decor.tsx`、`grill/GuestBar3D.tsx`、`grill/Roasting.tsx`、`grill/bar.ts`、`grill/edit.ts`（`RELAID`） | `3a2d3ef`、`9e812f6`、`b403dca`、`3abdd65` |
| 腳後跟小煙（後來只有員工與小學生、跑的時候才冒） | `scene/effects/DustPuffs.tsx`、`scene/people/people/people/FolkFigure.tsx`、`scene/people/people/StaffFigure.tsx`、`grill/Boss.tsx`、`App.tsx` | `c9c141b`、`1d917ff` |
| Overcooked 風格的簡約五官 | `scene/people/people/people/faceSheet.ts` | `aa8df69` |
| 對話氣泡跟著人藏、最後 0.3 秒淡出、同時最多 6 句 | `grill/StaffWords.tsx`、`grill/GuestBar3D.tsx`、`grill/Boss.tsx`、`App.tsx`、`src/index.css` | `daa2c36`、`3194002` |
| 人事頁重排；滿員時「替換」（先選要換誰、對照能力） | `ui/panels/Office.tsx`、`game/staff/hiring.ts`、`bdd/staff.test.ts`、`src/index.css` | `b82ad8a`、`845e104`、`5bbdbec` |
| 倉儲頭上狀態牌；補飲料時櫃門會開 | `grill/GuestBar3D.tsx`、`grill/DiningRoom.tsx`、`grill/bar.ts`、`src/index.css` | `4396113`、`d055701` |
| 大廚替火上的食物調味時有手部動作 | `grill/Boss.tsx`、`grill/Roasting.tsx`、`grill/bar.ts` | `73250b6` |
| 托盤、三廚手上的東西在手的高度 | `grill/GuestBar3D.tsx` | `838e67d`、`3c6c470` |
| 偶爾才動的東西歸位時合成一份畫（座位抽屜、鞋櫃、神龕、飲料櫃門、收銀台座抽屜、調味架） | `scene/render/StaticBatch.tsx`（`homeCopy`）、`grill/Roasting.tsx`（`ledgeCopy`）、`grill/GuestBar3D.tsx`、`grill/DiningRoom.tsx`、`grill/TillDesk.tsx`、`scene/render/atlasMerge.ts`、`scene/render/materialNormalize.ts` | `f5e513f`、`0e8b3c5`、`9044bba`、`8431531`、`8231503`、`d4121c1` |
| 客人台詞每種情境 3～4 句 | `data/lines.ts` | `eff1693` |
| 三種語言補齊；員工名字在英文拼出來 | `data/tipText.ts`、`data/i18n.ts`、`data/recipes.ts`、`data/people.ts`（`personName`）、`ui/panels/Office.tsx`、`grill/Roasting.tsx`、`App.tsx`、`bdd/dish-names.test.ts`、`bdd/person-names.test.ts` 等 | `21ec62a`～`9a4909e`、`29686ac` |
| 人物轉身不再一格轉過去 | `grill/commuteWalk.ts`（`turnToward`）、`grill/GuestBar3D.tsx`、`grill/Roasting.tsx` | `4ae4291`、`19d853a` |
| 總覽視角聽得到店裡的聲音（可聽距離 34 公尺） | `scene/interact/sfx.ts` | `8e9affc` |
| 每支鐵串同一個規格 | `grill/Roasting.tsx` | `c68dd93` |
| 打烊照遊戲時鐘（05:00 催、05:30 強制關店）；結算收起後跳到 16:00 | `App.tsx`、`game/world/shopState.ts`、`grill/Roasting.tsx`、`grill/restroomSound.ts` | `e52af34`、`46d695c` |
| 開店時沒開燈，進門的員工去開 | `grill/commuteWalk.ts`、`data/commuteLines.ts`、`game/world/shopState.ts`、`grill/DiningRoom.tsx` | `62041d9` |
| 廁所門牌的人形圖示；鞋櫃低矮長型 2×4；店家評價照三項權重；客人拉椅子入座；柳樹盆景 | `grill/DiningRoom.tsx`、`blender/shoecab.py` → `models/shoecab.glb`、`game/guests/reputation.ts`、`ui/panels/Reputation.tsx`、`bdd/reputation.test.ts`、`blender/willow.py` → `models/willow.glb`、`grill/GuestBar3D.tsx`、`grill/bar.ts` | `e81260c`、`a4c8bfd`、`1bdf8bd`、`88115b7` |
| 人物不套開發者模式的渲染設定（老闆黑臉的一個成因） | `grill/renderPrefs.ts` | `13c63f4` |

### 2-4　2026-11-07～08

| 項目 | 改了哪些檔案 | commit |
|---|---|---|
| Mac 開得了 3D：著色程式大幅減少、貼圖尺寸上限、Mac 起始中畫質、2D 畫布留在一般記憶體 | `scene/render/materialNormalize.ts`、`scene/render/textureCap.ts`、`scene/render/quality.ts`、`scene/render/canvasKeep.ts`、`scene/render/studio.ts`、`scene/render/Later.tsx`、`App.tsx`、`main.tsx` | `01f4820`、`4423a54`、`64df6d9`、`a965d1c` |
| 開發者模式不用中鍵（Mac 觸控板） | `game/system/navInput.ts`、`bdd/nav-input.test.ts`、`grill/edit.ts`、`App.tsx`、`data/editText.ts` | `f68410a` |
| 庫存分批、先進先出 | `game/stock/lots.ts`、`game/stock/freshness.ts`、`bdd/fresh-lots.test.ts`、`grill/StockPanel.tsx`、`grill/Roasting.tsx`、`grill/bar.ts`、`App.tsx` | `e656fd8` |
| 五道新菜（洋蔥、蔥、紅蘿蔔、牛蒡、白蘿蔔）與根莖蔬菜區 | `blender/grilledfish.py` → `models/grilledfish.glb`、`data/menu.ts`、`data/storage.ts`、`game/money/economy.ts`、`game/kitchen/taste.ts`、`ui/art/FoodArt.tsx`、`blender/produce.py`、`blender/cubbystock.py` 等 | `e652520`、`4a191d9` |
| 五十支鐵串循環 | `game/kitchen/skewers.ts`、`bdd/skewers.test.ts`、`grill/SkewerStore.tsx`、`grill/Roasting.tsx`、`grill/GuestBar3D.tsx`、`grill/bar.ts`、`grill/skewerSound.ts`、`data/lines.ts` | `be283c8`、`bb48d94` |
| 營業時食物不丟（沒人要的放進試吃碗保溫） | `grill/Roasting.tsx`、`grill/GuestBar3D.tsx`、`data/lines.ts` | `9affd60` |
| 飲料櫃自己做（332 面）並 1:1 精修 | `blender/drinkfridge.py` → `models/drinkfridge.glb`、`grill/DiningRoom.tsx`、`data/credits.ts`、`scene/props/signFont.ts`、`index.html` | `e1a7467`、`234764a` |
| 營業時的內場分工（老闆是大廚、二廚取料、三廚擺盤顧火） | `game/kitchen/kitchenCrew.ts`、`bdd/kitchen-crew.test.ts`、`grill/Boss.tsx`、`grill/Roasting.tsx`、`grill/GuestBar3D.tsx`、`grill/bar.ts`、`data/staff.ts`、`App.tsx` | `20f7215`、`99dee21` |
| 三廚顧火（加炭、灑水、攪湯） | `game/kitchen/fireTend.ts`、`bdd/fire-tend.test.ts`、`grill/GuestBar3D.tsx`、`grill/Roasting.tsx`、`grill/Decor.tsx`、`grill/bar.ts` | `4c5a29c`、`a0b18b5` |
| 音效總開關（時鐘上的小喇叭）、補齊動作音效 | `scene/interact/sfx.ts`、`main.tsx`、`ui/hud/GameClock.tsx`、`grill/restroomSound.ts` 等 | `798f9f4` |
| 營業時間 16:30–04:30、深夜模式、疲勞與特殊技能 | `game/world/hours.ts`、`bdd/hours.test.ts`、`data/staff.ts`、`data/guests.ts`、`game/staff/hiring.ts`、`game/world/shopState.ts`、`ui/panels/Office.tsx` 等 | `a792bce` |
| 打烊結算（暫停時間、10 秒自動關、記進帳簿） | `game/money/daySummary.ts`、`bdd/day-summary.test.ts`、`ui/screens/DaySummary.tsx`、`App.tsx` | `1310548`、`66b3092` |
| 排班 A／B；應徵者價碼照數值、每天刷新 | `game/staff/shifts.ts`、`bdd/shifts.test.ts`、`game/staff/hiring.ts`、`ui/panels/Office.tsx`、`App.tsx` | `bfae45b`、`da1c120` |
| 最後半小時只收外帶；外帶客人與外送員 | `game/guests/takeout.ts`、`bdd/takeout.test.ts`、`game/world/hours.ts`、`grill/GuestBar3D.tsx`、`grill/Roasting.tsx`、`grill/bar.ts`、`data/guests.ts` | `2cd8cd4`、`f23bc7f` |
| 表情符號與特殊符號全換成自己畫的圖示 | `ui/art/glyphs.ts`、`ui/art/GameIcons.tsx` 與各面板 | `09582b8`、`638b2df` |
| 換時段時整個遊戲停 5 秒多 → 圓窗的圖整層模糊一次 | `grill/DiningRoom.tsx`、`scene/render/IndoorHDRI.tsx`、`grill/GuestBar3D.tsx` | `b22f73c` |

### 2-5　2026-11-05～06

| 項目 | 改了哪些檔案 | commit |
|---|---|---|
| 主廚親手上火、取下（食材不再自己飛） | `grill/Roasting.tsx`、`scene/people/people/StaffFigure.tsx` | `65f181a` |
| 炊飯：開口的米袋、電鍋、飯桶；收盤留魚骨與空杯、擦桌 | `game/kitchen/rice.ts`、`bdd/rice.test.ts`、`blender/denkinabe.py` → `models/denkinabe.glb`、`blender/ricesacks.py`、`blender/hagama.py`、`grill/Decor.tsx`、`grill/GuestBar3D.tsx`、`grill/Roasting.tsx`、`grill/bar.ts` | `d79d5da`、`3d48d50` |
| 玄關脫鞋放進鞋櫃 | `grill/GuestBar3D.tsx`、`grill/bar.ts`、`data/lines.ts` | `30f4715` |
| 結帳排隊、收銀員報價、+NT$ 浮字 | `grill/GuestBar3D.tsx`、`grill/StaffWords.tsx`、`data/lines.ts`、`src/index.css` | `37187ec` |
| 員工上下班與寒暄 | `game/staff/commute.ts`、`bdd/commute.test.ts`、`grill/commuteWalk.ts`、`data/commuteLines.ts`、`grill/StaffWords.tsx`、`grill/GuestBar3D.tsx`、`grill/Roasting.tsx`、`grill/DiningRoom.tsx`、`App.tsx` | `4825247` |
| 兩間洗手台方向一致、櫃子打得開；擦手紙盒與烘手機 | `blender/wc.py` → `models/washstand.glb`、`grill/Restroom.tsx`、`grill/DiningRoom.tsx`、`game/guests/restroom.ts`、`bdd/restroom.test.ts` | `ecaf277`、`1d7793b` |
| 廁所燈關著時門紙完全不透光 | `grill/DiningRoom.tsx` | `c977a49` |
| 窄視窗不再換成手機版的舊排版 | `src/index.css` | `dda1cc7` |
| 拖著的飲料一直在游標下、發亮 | `grill/DiningRoom.tsx` | `3779106` |
| 飲料後場減面（19,672 → 2,624 面） | `blender/bottlecrate.py`、`blender/drinkcartons.py`、`models/bottlecrate.glb`、`models/drinkcartons.glb`、`grill/DiningRoom.tsx` | `90ff2cf` |
| 滑鼠移到人身上顯示名字，只有客人能拖 | `scene/people/people/people/FigureHit.tsx`、`scene/interact/hoverTip.ts`、`ui/hud/HoverTip.tsx`、`grill/GuestBar3D.tsx` 等 | `832c17c` |
| 人物 1,000 面以下、Overcooked 表情（臉是頭的正面） | `blender/boss.py` → `models/boss.glb`、`models/crew_*.glb`、`scene/people/people/people/faceSheet.ts`、`scene/people/people/rigidSkin.ts`、`scene/render/atlasMerge.ts`、`scene/people/people/StaffFigure.tsx`、`scene/people/people/people/FolkFigure.tsx` | `d3017fb` |

### 2-6　2026-11-03～04

| 項目 | 改了哪些檔案 | commit |
|---|---|---|
| 主廚照點單先後去冷凍櫃、冷藏櫃、飯桶、麻袋取料 | `game/kitchen/chefFlow.ts`、`bdd/chef-flow.test.ts`、`grill/Roasting.tsx`、`grill/bar.ts`、`scene/people/people/StaffFigure.tsx` | `8629959` |
| 每個視角自己的焦段 | `data/views.ts`、`App.tsx`、`grill/Boss.tsx` | `aac39cd` |
| 角色預覽面板與取景 | `grill/CharacterViewer.tsx`、`grill/StockPanel.tsx`、`src/index.css` | `90cab08`、`bac537d` |
| 著色程式在載入時編好、190 → 128 | `scene/render/Prewarm.tsx`、`scene/render/OccluderFade.tsx`、`scene/render/AnchoredLight.tsx`、`grill/Decor.tsx` 等 | `c5a8bdf`、`e0c8ea2`、`22e536c` |
| 每個人物 2 次繪製（剛性蒙皮） | `scene/people/people/rigidSkin.ts`、`scene/people/people/people/FolkFigure.tsx`、`scene/people/people/StaffFigure.tsx`、`grill/Boss.tsx` | `68d6b5c` |
| 地板退回優化前 | `scene/props/FloorPiece.tsx`、`scene/props/floorBoards.ts` | `bdd5f2b` |
| 收銀抽屜的棒金，可以拿 | `blender/register.py` → `models/register.glb`、`grill/Cash.tsx`、`grill/cashRegister.tsx`、`game/money/till.ts`、`bdd/till.test.ts` | `61ac6d1`、`c6898ad` |
| 員工專用門後的樓梯間、圓窗精緻化 | `grill/DiningRoom.tsx` | `bbb83f8`、`8583f3a` |

### 2-7　2026-11-02 以前（跟這次待處理有關的）

| 項目 | 改了哪些檔案 | commit |
|---|---|---|
| **門口的魚燈** | `blender/fishlantern.py` → `models/fishlantern.glb`、`grill/GuestBar3D.tsx`、`grill/edit.ts`、`data/editText.ts` | `dcd2a82`（之後轉向、放大 `4e29206`） |
| **玄關兩個開關各管一條線路**（店內電燈、門口燈籠） | `game/world/roomLights.ts`、`bdd/room-lights.test.ts`、`scene/render/lightsStore.ts`、`grill/DiningRoom.tsx`、`App.tsx`、`game/money/utilities.ts` | `06aa41e`、`409906b` |
| **門口兩盞長提灯並排** | `grill/GuestBar3D.tsx`、`grill/edit.ts` | `dcc350f`、`4e29206` |
| **廁所改格局**（開門先看到洗手台與鏡子，轉彎才是馬桶） | `blender/wc.py` → `models/washstand.glb`、`models/wcbits.glb`、`grill/Restroom.tsx`、`grill/DiningRoom.tsx` 等 | `f0f2f87` |
| 店家評價、衛生紙、水電 | `game/guests/reputation.ts`、`game/stock/tissues.ts`、`game/money/utilities.ts`、`ui/panels/Reputation.tsx` 等 | `0340d90` |
| 發票紙是耗材 | `game/money/receipts.ts`、`bdd/receipts.test.ts`、`grill/cashRegister.tsx` 等 | `1a5104b` |

## 5. 待處理的問題（2026-11-10 當時）

### 5-0　店主已同意的計畫與順序（2026-11-10）

一個視窗依序做（兩個視窗的分工暫緩）；每件做完：`npx tsc -b` → `npm test` → 動到流程的跑 `npm run e2e` → 提交、推上 main → 傳截圖給店主；全部做完再一份總報告。

1. **洗手盆三項**（細節見 5-1）：
   - 塞子拆成「濾環＋蓋子」，壓下 0.12 秒落進濾環看不到縫，彈起照彈簧曲線升 8 公釐、過衝約 1.5 公釐再回來、露出一圈縫，兩種聲音（清脆喀噠、金屬回彈）。
   - 水不用 transmission：淺處幾乎透明、越深越藍綠、斜看反光較強、兩層方向不同的細波紋（0.02、0.015）、水邊一圈淡白細邊。
   - 溢水孔：Blender 在缽內壁水龍頭那側、缽緣下 2.5 公分挖長圓孔，黃銅框、裡面暗；水位停在孔的下緣，孔口小漣漪與細的溢流聲。
2. **飲料外箱**：條碼縮到 1/3～1/4（不超過箱高 15%）、每箱位置不同；生啤酒、綠茶、可樂、沙瓦／Highball 四種版面；拿掉兩罐小圖。只動 `grill/drinkCartons.ts`。
3. **洗手間設備**：烘手機改壁掛下吹式（24×28×16 公分、底部出風狹縫與感應點、往下的氣流、熱風聲、客人站在它下面烘）；擦手紙盒改霧面暖白塑料、頂面鎖孔、弧形出紙口、茶色餘量窗（半透明材質，不用 transmission）。音效照舊即時合成。
4. **店家評價**（照 Google 地圖）：大數字、星星、則數與 5～1 星長條分布；排序（最相關、最新、最高分、最低分）；每則有頭貼、名字、「在地嚮導・n 則評論」、星星、幾天前、內容。評論者約七成五日本人。新開局從 0 顆星、0 則開始（現在重新整理後還留著）。花錢買評價：三種方案，預設 5 則 NT$2,500、10 則 NT$4,500、30 則 NT$12,000，買到 4～5 星、記在帳本的宣傳費、預設不會被抓（店主沒有另外指定價錢，用預設）。
5. **廁所**：男廁苔玉、女廁山茶花重做得精緻；皂液可按壓、有用量（客人洗手也用）；擦手紙上限 150 張、倉儲用備品補；耗材頁「民生」加上捲筒衛生紙、擦手紙、洗手乳補充包（有數量、能訂購）；兩間的燈調亮，洗手間門邊那盞壁燈（`DiningRoom.tsx` 的 `WcSconce`）換造型、比小間那盞亮（不加新的即時光源）。

### 5-0b　2026-11-10 晚上店主追加的待辦（依序做，每項做完提交、推上、傳截圖）

**2026-11-11 凌晨的進度**：1 鐵串尺寸（`4e2b55a`：沒能重現，照店主說的機制擋下：鐵串不會比標準大）、2 鐵串流程（`6e3dbcd`）、4 外帶檯與牛皮紙袋（`af7f31e`）、5 保溫餐檯／飯糰料理台／電鍋（`4fc5e06`）、6 玄關（`b8c07b9`）、7 啤酒箱（`4e77a18`）、8 冷藏櫃塞滿（`0632010`）、9 麻袋（`95d1acd`）、10 白米袋（`7f02cd7`）、11 洗手間（`57d087e`）都已完成並推上；12 等店主回覆（洗碗流程改了以後，灶台旁的矮碗盤架與備長炭袋移位是否還需要）。另修：桌上的東西被推開後可能被推回火爐上（店主看到行燈站在火裡），`settle` 最後再離火爐一次、行燈不再被別的東西推動。

**2026-11-11 上午店主追加（都已推上）**：
- **鐵串一下大一下小（卡了一週）的真正原因**（`ca41bbe`）：同一道菜第二份以後的整尾魚，節點是從第一份複製的，連第一份合併好的描線（`oneInk`，ShaderMaterial）也被複製，`bindMaterials` 的「全是 toon 材質」檢查永遠不過，這些魚從沒綁定：鐵串沒換成標準鐵串、上盤不抽、跟著魚放大到 2 公尺。綁定時略過 `oneInk`；鐵串改用世界座標的大小壓回標準。忙碌營業 5 分鐘量測最長 1.399（標準 1.40，原本 2.05）。
- 裝盤處三格間距 0.47、盤子堆移到第三格旁（`4c87a3c`）；盤子總數 200（`06ae437`）。
- 外帶盒：每張單各自一盒、第二盒疊在第一盒蓋上，蓋上後食物不穿出；盒蓋加白色掛紙、紅印、免洗筷（`cac4b35`）。
- 招財貓組補回金幣與頭盔（舊存檔）（`007a0f1`）；爐框黃銅角片末端平切（`5d93c27`）；凹槽側牆陰影加深、腳踏墊改成真正的すのこ並加厚到 9 公分（`048b070`）。
- 吧台椅空位時收進桌下 0.3、坐墊花紋改對比色（`5319f88`）；候位長椅照比例重做（`3d74d4b`）。
- 分區群組：保溫與飯糰料理台、流理台組、碗盤架組、米袋與舊飯桶、男廁組、女廁組（`0c4ddf2`）。
- 飲料櫃：層架前低後高、拿走一瓶後面滑下補位（0.45 秒）、每格下方品名牌、後排簡化（`4520865`）。
- 麻袋與木箱高品質重做、袋上印產地品名（`b3ae428`）。
- 庫存面板的食材圖改用遊戲模型渲染（`blender/foodicons.py` → `public/food/*.webp`，25 種；切好烤好的與不在模型裡的保留 SVG）（`352e9bf`）。
- 效能：今晚改動前（`007a0f1`）與現在的正式版輪流量 `npm run bench`：平均 FPS 53.2／52.8 對 53.1，沒有變慢（`ffb4a0d` 另精簡兩處每格計算）。
**2026-11-11 下午店主追加（都已推上）**：
- 候位長椅落地（`BENCH_PLACE.y` 0.169 → 0，座面回到 0.29）（`e9e9c5f`）。
- 料理台：保溫台裁半保留左端、與飯糰台併成一整張（一個櫃身、一片檯面、六扇門，都在 `warmer.glb`；`prepcounter.glb` 只剩檯上擺設），拿掉擋水條、櫃身黑色、統稱「料理台」，整張往吧台移 0.937 貼齊吧台上緣，保溫座在保溫段正中、電鍋緊鄰湯鍋（`f55a2f4`、`94dd598`、`6ba85a2`）。
- 味噌湯與白飯：開店時湯鍋、電鍋都是空的，三廚先煮湯（`game/kitchen/soup`）再煮飯；客人約三成加點一碗湯（菜單板上沒有：板上只有研發出來的燒烤品項），含湯的套餐也點得到了；鍋熱了才盛，一鍋 12 碗，盛完三廚再煮；碗擺在客人位子上（`SOUP_SEATS`）（`f55a2f4`、`3b49db4`）。
- 神棚花瓶：三種花共用同一個花瓶與位置，縮放只套在花束（`fa55c26`）。
- 麻袋底部兩個縫線尖角（`4bb17b3`）。
- 凹槽槽燈：老闆凹槽、三廚凹槽的側牆上緣各一條暖光燈條，往下打暖光；凹槽的漸層貼圖透明度在這裡一直沒有作用，改用頂點色（側牆相加、背牆相乘）（`a29c475`）。
- 第 12 項：灶台尾端、三廚凹槽旁的矮碗盤架（`blender/lowrack.py`，20 個盤子，裝盤處先從這裡補，少於 15 個三廚去碗盤架搬 5 個；`game/service/plates` 的 `LOW_*`，BDD `lowrack`）；備長炭麻袋移到炭箱下方靠吧台的角落（`0dbb055`）。

**2026-11-11 晚上～11-12 店主追加（已推上；`c299959` 之前）**：
- 瀝水籃：可放 30 盤（`DRAIN_CAP` 12 → 30）；網代編竹紋、圓角、雙層籃緣；兩條有凹槽的竹齒條，一盤一格、盤間有間隔（籃內的盤子畫成 0.3 倍深，不然 30 盤會疊在一起）；拿掉底部竹條與碗（`85a18ef`、`076016f`）。
- 流理台：塞子可蓄水（`game/service/sinkWater`，BDD `sink-water`），排水口真的挖孔（黃銅杯＋十字條＋法蘭），溢水口在後牆；台上每樣都能 hover（`6d11a3f`）。
- 碗盤櫃：下層放飯碗 12、湯碗 12（各 3 疊×4），抽屜放筷子 30 雙、湯匙 12 支；門會滑、抽屜會拉（`game/service/tableware`，BDD `tableware`；兩櫃合計 24/24/24/60 雙）（`e3e8d07`）。
- 喇叭單獨放大 1.25 倍、U 形支架兩臂加長（`2622549`），位置照店主調的往本身寬度方向 5 公分（`ec444a8`，relaid-13）。
- 白天關燈廁所只暗一點（`wcDarkness`，BDD `wc-dark`）（`ee6185a`）。
- 清酒台位置寫成預設（relaid-12）；三方與供品落在桌上、不再浮空（三方原本陷進桌面 6 公分）（`4241681`）。
- 保溫桶裡放打包好的外帶（`keptWarm`，BDD `warm-tub`）（`da1acf7`）。
- 魚塊（鮭、鰤、銀鱈）加長加大（`19fc59d`）；鐵籤抽出改成沿籤身滑出的動畫（`0554052`）。
- 夏季蔬菜：番茄、小黃瓜、茄子、青椒、甜椒上菜單（價格、成本、烤時、菜名、調味搭配；BDD `summer-veg`），木籃階梯架放在原本胡蘿蔔木箱的位置，胡蘿蔔改冷藏；原本叫「青椒」的ししとう改名「獅子唐」（`12b3b1d`）。
- 閉店時大碗公裡剩的（客人先走、已退款的份）當員工餐清掉（`cccc641`）。錢的部分：點餐時付、沒吃到的離開時按比例退（`App.tsx` 的 `refund`）。
- 外送員背的保溫箱改成背包（肩帶、反光條）（`267aef5`）；女廁衛生紙架改到跟男廁同一面（`a6bf14b`）；廁所壁燈換回原本的和風燈（`724f571`）。
- 客人上廁所看得到：走進隔間、坐馬桶、沖水、走到洗手台洗手烘手；燈沒開會自己開，最後一個出來的關燈（`8530dfa`）。
- 減面：碗盤架疊盤中間只畫盤緣（每座 46,512 → 26,800 面）（`3b9be60`）；飲料櫃後排瓶子 6 段、罐蓋簡化、瓶蓋不再是放射扇形（每台約 48,000 → 30,000 面）（`b28df4f`）。
- 庫存與菜單的食材圖全部改成可愛卡通風（`ui/art/CuteFood.tsx`，`tests/visual/foodsheet.tsx` 可看總表）（`3babf4d`）。
- 評論沒有上限，每頁 10 則、Google 式頁碼（BDD `review-pages`）（`a33f835`）。
- 招財貓台多一階、最上階放小判金幣（relaid-14）（`2871e8b`）。
- 吧台上的小垃圾桶可以移動（`68fa55d`）。
- 開發者模式的視角分區依現在位置重新規劃一次（`2cc1238`）。
- **待店主決定**：#10 第二張三人長凳要放哪（玄關那面牆放不下兩張）；#11 頭盔展示台的「紅框」位置；#12「原本的桶子」是哪一個（收銀台旁？流理台旁的白色水桶？）；#14 錦鯉畫移到男廁旁（之前那次修改被取消，要再確認）。

**2026-11-12 早上（店主出門，主視窗接續做；提交在本機 `main`，尚未推）**：PC 更新自動關機打斷過一次，重開後接續。

- **飲料櫃減面（晚上補做，`dfe8340`、`1e0db68`）**：拍照法：dev 的 `__stock` 直接填滿（`units[i][r][k]=id`、`counts=4`、`ver++`），再用 `__freeCam`（`tests/e2e/_fridgefull.mjs`，不進 git）。前排瓶身、標籤、頸圈 8 邊降 7 邊；清澈的飲料（彈珠汽水、清酒、燒酎、運動飲料）不再畫瓶內液體層。同鏡頭前後沒看出差別，全場 668,611 → 666,973（碗盤架之後是 669,821）。填滿的一個櫃子仍約 2.8～3 萬面，大頭是 4 個合併網格（玻璃 9.2k、物理材質 9.0k、標準材質 6.6k 與 5.6k），邊數不是主因；要再減得拆這幾個網格。老闆掃地的手位仍未親眼看到（`tests/e2e/_sweepforce.mjs` 抓到的是爐邊不動的老闆模型，不是掃地的 OwnerWalker）。
- **店主的規矩（2026-11-12）**：不要反問，有疑問就選預設，做了再說，不要停下來等。
- 招財貓組沿牆再往圓窗方向移 1.0 公尺（`CATS_SHIFT_3`、新 key `jgs-edit-groupshift-3`，舊存檔補移一次；`edit.ts`、`bdd/edit-group`）（`c326ef3`、`322c8bb`）。用 `_catfit.mjs` 量過：貓組最高 0.54、小神龕組 1.17 以上，沒有重疊；`clips.mjs` 沒有任何牽涉貓台的穿模。第二張長凳位置仍待店主決定。
- 庫存食物圖全部拿掉臉與眼睛（含魚的大眼睛），`ui/art/CuteFood.tsx`（`c326ef3`）。
- 調味料九種各自一張圖（鹽罐、醬油瓶、煉乳管、黃豆粉袋、味噌桶、山葵管、七味罐、柚子胡椒罐加柚子、檸檬加檸檬片），`ui/art/SeasoningArt.tsx`，庫存面板的 `SeasonIcon` 改用它；`npx vite-node tests/visual/seasonsheet.tsx` 可看總表（`50eea21`）。
- 老闆掃碎玻璃：手握在掃把上的位置改到他托盤的高度與前後（`SWEEP_LEAN.owner`），掃把柄比較直（`StaffFigure.tsx`、`GuestBar3D.tsx`）（`3474565`）。**還沒在畫面上看到**：腳本抓不到掃地中的近拍（鏡頭被遊戲拉回），要店主看一眼；不對的話調 `SWEEP_LEAN.owner`（0.3）。
- 料理台桌面：三小碟配料（梅、鮭、昆布）、飯勺與勺架、醃蘿蔔碟、芝麻罐、毛巾、保鮮膜盒、右端竹盤放三個包好的飯糰（`blender/warmer.py` → `models/prepcounter.glb`，+2,082 面，mesh-audit 乾淨）（`9b1274b`）。
- **面數**（店主說暴增）：dev 總覽 682,909 面（含描線 79,627）、1,371 次繪製；11-08 是 56.3 萬。沒有單一元兇，前幾名：`home-copy` 43,344、飲料櫃各約 3 萬、`till-counter` 26,994、碗盤架各 21,184（已先減過）、小神龕組 19,767、清酒 18,922、`produce` 描線 13,588、`till-tree` 13,198。店主 11-12 說「先減飲料櫃與碗盤架」：
  - 碗盤架：盤子 16 邊 → 12 邊、疊盤的盤緣 14 邊 → 10 邊，兩座的車削面 53,600 → 31,000，總覽 682,909 → 669,821；同一鏡頭（`tests/e2e/_rackfridge.mjs`，北側）前後對照沒看出差別（`perf:` 提交）。
  - 飲料櫃：**還沒減**。三個物體的瓶身已經是 8 邊、後排 6 邊（11-12 凌晨減過）；剩下 3 萬多面分在 4 個合併網格（`ShelfGlass` 9,604、9,084、6,584、5,640）。我試了好幾個鏡頭，拍不到有瓶子的那幾層（新局的櫃子是空的，開店補貨後從東側看也只看到空層），沒有前後對照就不動。要減請先把櫃子補滿飲料、給我能看到瓶子的視角（或照 `bottleBody`／`liteBody` 的邊數再降一階，店主看過再決定）。
  - 量法：`tests/e2e/_tritop.mjs`，`__triTop(n,'mesh')`。
- 老闆掃把之後，店主還有待辦：沒有；上面三個待決定項不變。

已完成並推上：飲料櫃每格多瓶與拿取（a53fa34）、洗手間耗材（5385686）、倉儲 Switch 與板夾（45a4280）、洗碗機優先＋手洗瀝水籃＋碗盤數量（732d680）。

1. **鐵籤又長又粗、尺寸不一**（截圖：營業第 12 天 04:46，砧板上的串比標準長約兩倍）。`tests/e2e/_rodsize.mjs`（git 外）營業 4 分鐘量到的都是 1.4，沒重現；懷疑是回收再用的那份（`revive`）或晚上久營業後才出現。`Roasting.tsx` 的 `standardStick` 照 `home.s` 算，`m.scale.setScalar(grow)`。
2. **鐵籤流程**：一律由大廚從食物上摘下、食物放進碗盤；摘下的鐵籤放進空（回收）筒；**兩個鐵籤筒都改成木桶**；回收筒到一定數量，由**閒置的外場**拿去洗（現在是三廚／二廚洗）。
3. **瀝水籃加寬，最少放 12 個盤子**（`DRAIN_CAP` 6 → 12，`blender/sink.py` 的籃子 bx0..bx1 加長、碗移開，重出 sink.glb）。
4. **外帶專用檯＋牛皮紙袋**（店主選的）：檯子在收銀員椅子正後方（吧台座標約 (1.72, −2.14)，正面朝收銀椅；收銀椅 (1.25, −2.79) 面向 (−0.59, −0.81)）；外帶食物裝好改成牛皮紙袋；外場把袋子放到外帶檯，**收銀員轉身從檯子拿起、隔著收銀台交給客人**（沒雇收銀時外場照舊直接拿到玄關交）。模型用 Blender（`blender/takeout.py`：檯子＋紙袋）。量位置的工具 `tests/e2e/_tillmap.mjs`（git 外）。
5. **保溫餐檯**：移到灶台右側與收銀台之間那條地板（店主截圖紅框往上）；高度與樣式改成跟流理台一樣；**飯桶與羽釜爐灶棄用**（移出、裡面不要有白飯），白飯直接從**電鍋**取，電鍋做大一點；餐檯上只有湯需要加熱；**原本餐檯空出的位置改成料理台**（包飯糰之類）。
6. **玄關區調整**（最新截圖）：神龕組、招財貓台往左移（紅箭頭），門口那組往右；**候位長凳加長，最少坐 4 人**（`BENCH_SEATS` 2 → 4，`blender/bench.py`）。
7. 啤酒箱四個角的接縫、提手孔處隔板穿出（`blender/bottlecrate.py`）。
8. 冷藏櫃飲料依體積塞滿到後牆、間距一致（`PLACE_DEPTH` 改照櫃深算；注意效能與存檔相容）。
9. 馬鈴薯／地瓜／洋蔥麻袋：更像舊麻袋、不要那麼白（參考 Sketchfab Old Burlap Bag photo scan，只看預覽）。
10. 白米袋（尤其開封那袋）參考 Sketchfab「Burlap Bags」。
11. 洗手間：兩間的燈調亮、門邊壁燈換造型且比小間亮（不加即時光源）、苔玉與山茶花做精緻。
12. （待店主確認）灶台旁放矮碗盤架、備長炭麻袋移到炭箱下方角落——店主後來改提洗碗流程，可能不需要，先問。

### 5-1　洗手盆三項（店主 2026-11-10 的截圖與規格）

1. **塞子按下去要有回饋。**
   - 現在：`grill/Restroom.tsx` 第 800–806 行的 `STOPPER_GEO`、`STOPPER_MAT`，一個程式做的黃銅小蓋（直徑 4.2 公分）。
   - `useFrame` 第 950–956 行：壓下時在排水口上 −0.5 公釐，彈起時 +7 公釐，平滑緩動、沒有過衝；聲音是 `grill/restroomSound.ts` 第 261 行的 `plugSound`。
   - 店主看到的是「完全沒有位移」：7.5 公釐在那個距離幾乎看不出來。
   - 規格：蓋子跟濾環分開；壓下沉 6 公釐、嵌進排水圈；彈起 8 公釐、有彈性、露出一圈縫；各有一聲機械音；滑過原地亮暖橘色。
2. **水的材質感覺有點不真實。**
   - 現在：同檔第 807–819 行的 `basinLooks`：`MeshStandardMaterial` `#2f6f7c`、透明度 0.16＋0.22×水位、粗糙度 0.04、反射 1.3。
   - 法線圖 `RIPPLE`（第 770–793 行）：128×128 程式畫的波紋、重複 2.5 次、強度 0.5、每秒位移 0.035／0.02（第 920 行）。
   - 店主看到的是一片綠色磨砂塑膠，波紋像散落的白色短線。
   - 規格：清澈、看得到盆底的釉與濾孔、邊緣的菲涅爾反光、雙向流動的細波紋、水與盆壁交界一圈很細的淡白邊。**不用 transmission**（固定規則）。
3. **要挖孔洞，高水位時才會排掉。**
   - 現在：`WATER_TOP` 0.066（第 737 行，缽緣內側下 3 公分）加上 `game/service/basin.ts` 第 20 行塞住時到 1 就停；盆壁沒有孔（`blender/wc.py` 第 526 行 `lathe_uv("WashBowl", …)` 是一整圈車削）。
   - 規格：水龍頭那一側的盆壁、缽緣下約 2.5 公分，一個圓形或長圓形、金屬框、往裡凹的暗孔；塞住開水時水位停在孔的下緣，多的水從孔流走、孔口有小漣漪，不溢出檯面。

### 5-2　分工：組 A、組 B 兩個視窗同時做

> **暫緩（店主 2026-11-10）**：兩個視窗太燒 token，先不開；洗手盆三項由主視窗依序做，紀錄照樣寫在 5-3、5-4。下面的分工留著，之後要平行做時照用。

- **組 A**：第 1 項（塞子回饋）＋第 3 項（溢水孔與高水位排水）。
- **組 B**：第 2 項（水的材質）。

**兩組會動到的檔案**

| 檔案 | 組 A | 組 B |
|---|---|---|
| `grill/Restroom.tsx` | 塞子（第 800–806 行、`useFrame` 第 950–956 行、JSX 第 1001–1006 行）；滿水高度 `WATER_TOP`（第 737 行）；新加的溢水孔效果 | 水的材質 `basinLooks`（第 807–819 行）、`RIPPLE`（第 770–793 行）；`useFrame` 裡水的透明度與波紋位移（第 916–920 行）；水面的 JSX（第 995–996 行）與新加的細白邊 |
| `game/service/basin.ts`、`bdd/basin.test.ts` | 改（滿水位＝溢水孔下緣、溢流） | 不碰 |
| `grill/restroomSound.ts` | 改（`plugSound` 分成按下、彈起兩種；溢流的細水聲） | 不碰 |
| `blender/wc.py`（`washstand()`，第 502 行起）→ `models/washstand.glb` | 改（盆壁的孔、濾環與蓋子分開；只用 `WC_ONLY=washstand` 重出） | 不碰 |
| `grill/bar.ts`（`TOILETS[who].basin`） | 可能加欄位 | 不碰 |
| `data/tipText.ts` | 新提示文字的日文、英文 | 不碰 |
| 新檔 `grill/basinWater.ts` | 不碰 | 建議（要店主同意）：新的水材質寫在這裡，`Restroom.tsx` 只改引用的幾行 |
| `HANDOFF.md` | 只寫 5-3 | 只寫 5-4 |
| `CLAUDE.md`、`docs/DETAILS.md` | 不碰 | 不碰 |

**重疊的地方**

1. `grill/Restroom.tsx` 的 `WashstandLive`（第 829–1009 行）：兩組都改同一個 `useFrame`。組 A 在第 910–911 行（水位、高度）與第 950–956 行（塞子），組 B 在第 916–920 行（透明度、波紋），只隔幾行，git 合併時很可能衝突。
2. 組 B 的細白邊要放在水面高度、照盆的半徑（`waterY`、`bowlR`，第 736–746 行），而組 A 會改滿水的高度與盆的模型。
3. `docs/DETAILS.md` 裡洗手盆那一段是一整行很長的文字（搜尋「**洗手盆會蓄水、放水**」），兩組各自改一定衝突。
4. `HANDOFF.md` 兩組都要寫進度。
5. 看起來不重疊、但要注意：`models/washstand.glb` 只有組 A 重出，組 B 在自己的分支上看到的是沒有孔的舊盆，合併後要重拍確認；`tests/e2e/_basin.mjs` 在 git 外，各自一份，不會衝突。

**建議的做法**

1. **兩組都用 git worktree**，各自一個資料夾、一個分支。主資料夾 `C:\Users\augus\Projects\JapaneseGrillSimulator` 不動（店主的 `npm run dev:sync` 在 5173 跑著，會自動同步 `main`）。
2. **worktree 放在專案資料夾外面**（例如 `C:\Users\augus\Projects\JGS-basin-a`、`JGS-basin-b`）。專案沒有 vitest 設定檔，`npm test` 會掃整個資料夾，worktree 放在裡面（例如 `.claude/worktrees/`）的話，主資料夾跑測試會連那一份一起跑。
3. **先合併組 A，再合併組 B。** 組 A 改的是結構（模型、滿水高度、邏輯），組 B 是材質。組 B 合併前先在自己的資料夾 `git rebase main`（這時 `main` 已經有組 A），在新的滿水高度與有孔的盆上重新驗收。
4. 組 B 的新程式盡量寫在新檔，`Restroom.tsx` 只改幾行，衝突最少。
5. **兩組都不改 `CLAUDE.md`、`docs/DETAILS.md`**，進度與跟規格不同的地方只寫在本檔自己那一節（5-3、5-4）。兩組都合併後，由主視窗統一更新 `docs/DETAILS.md` 洗手盆那一段。
6. **兩組都不推 `main`、不合併**，只提交到自己的分支；合併與推送由店主決定。
7. **5-5 排在後面的單**裡，「烘手機與擦手紙盒」「廁所植物、皂液、擦手紙、燈」兩張也會動 `grill/Restroom.tsx`、`blender/wc.py`、`models/washstand.glb`、`models/wcbits.glb`、`grill/restroomSound.ts`，等組 A、組 B 合併後才做；「飲料外箱」「店家評價」跟洗手盆不重疊。

**建立 worktree 的指令**（在主資料夾的 PowerShell）

```powershell
# 新的 HANDOFF.md、CLAUDE.md、docs/DETAILS.md 已經提交（2026-11-10），worktree 會帶著它們
git worktree add ..\JGS-basin-a -b basin-a
git worktree add ..\JGS-basin-b -b basin-b
# 每個 worktree 裡：
#   npm ci
#   copy ..\JapaneseGrillSimulator\tests\e2e\_open.mjs tests\e2e\
#   copy ..\JapaneseGrillSimulator\tests\e2e\_basin.mjs tests\e2e\
#   把這份 _open.mjs 預設網址的 5173 改成自己的埠（組 A 5176、組 B 5177）
```

埠號：5173 是店主的 `dev:sync`；5174、5175 目前被之前做前後對照的舊版開發伺服器佔著；4173 是 `vite preview`。所以組 A 用 5176、組 B 用 5177（`npx vite --port 5176 --strictPort`）。

合併（店主同意後，在主資料夾）：

```powershell
git merge --ff-only basin-a          # 先 A
# 到 JGS-basin-b：git rebase main，重新驗收
git merge --ff-only basin-b          # 再 B
git worktree remove ..\JGS-basin-a
git worktree remove ..\JGS-basin-b
```

### 5-3　組 A 工作紀錄（組 A 只寫這一節）

（尚未開始）

以上是組 A 的區塊，下面是組 B 的。兩組各寫各的，中間這幾行不要動，合併時才不會衝突。

### 5-4　組 B 工作紀錄（組 B 只寫這一節）

（尚未開始）

### 5-5　排在後面的單（等店主說「開始」；不在組 A、組 B 範圍內）

依店主給的順序：

1. **飲料外箱印刷多樣化**：條碼縮到原本的 1/3～1/4（不超過箱高 15%）、位置錯落；生啤酒、綠茶、可樂、沙瓦四種完全不同的版面；拿掉每箱都有的兩罐小圖。主要檔案：`grill/drinkCartons.ts`（可能還有 `blender/drinkcartons.py`）。
2. **洗手間設備**：烘手機改成壁掛下吹式（約 24×28×16 公分、底部出風狹縫與感應點、往下吹的氣流）；擦手紙盒改成霧面暖白的 ABS 塑料（茶色半透明餘量窗、頂部鎖孔、弧形出紙口）。主要檔案：`blender/wc.py`、`models/wcbits.glb`／`toilet.glb`、`grill/Restroom.tsx`、`grill/restroomSound.ts`。
3. **店家評價**：改成跟 Google 地圖評論一樣；店在大阪，評論者以日本人為主（`data/reviewers.ts`）；新開局一定從 0 顆星開始；旁邊加一個花錢買評價的功能。主要檔案：`ui/panels/Reputation.tsx`、`game/guests/reputation.ts`、`data/reviewers.ts`、`App.tsx`、`src/index.css`。
4. **廁所**：植物質感高級一些；皂液可以按壓、有用量；擦手紙上限 150；物資數量都加進庫存「耗材」頁的「民生」；廁所燈再亮一些，靠近門的那盞換造型、要比較亮。主要檔案：`blender/wc.py`、`grill/Restroom.tsx`、`grill/DiningRoom.tsx`（壁燈 `WcSconce`）、`grill/StockPanel.tsx`、`game/stock/supplies.ts`。

### 5-6　以前留下的待辦

| 優先 | 項目 | 目前狀態 | 下一步 |
|---|---|---|---|
| 中 | 開發版分頁的 heap 2.2～2.3 GB（第 55 天） | 已修一部分（`80440ed`：浮字與評價列表不再一直建新的）；正式版 20 分鐘後持平 | 剩下的是 React 開發版自己的除錯資訊與熱更新殘留；開發版分頁開久了請重新整理 |
| 中 | 進開發者模式變線框、老闆全黑、角色預覽 0 面 | 老闆黑臉的一個成因已修（`13c63f4`）；其他在新開的頁面上重現不出來 | 需要店主能重現的步驟；數字鍵的問題第 191 項已定案（編輯模式 1～5 是五種渲染模式，4 照舊是線框；開發者模式已拆成獨立的編輯器，遊戲裡按 G 不會再原地切換） |
| 中 | 主廚醬烤刷醬的時機 | 照評分規則在 85% 左右刷 | 待店主決定要不要連評分規則一起改 |
| 中 | 調味架回到爐框 | 已修，待店主在自己的存檔確認 | — |
| 低 | 開店後第一位客人進來時仍會編 1 個著色程式 | 由背景編譯，沒有讓任何一格變慢 | 用 `tests/e2e/_newprogs.mjs` 找出是哪個材質 |
| 低 | 繪製次數約 1,250、著色程式 53～56 | 目標 200 次、40 個需要跨擺設合併 | 要店主決定方向 |
| 低 | 老闆頭部 300～500 面 | 1,071 面 | 要拿掉眼鏡、鬍子等辨識特徵才做得到，待店主決定 |
| 待截圖 | 3D 預覽模型變小、洗手槽走道地板反白 | 重現不出來 | 請店主截圖 |
