# 聲音的都普勒效應｜本機 prototype 證據矩陣（2026-11-19）

狀態：**本機 prototype，未公開**。registry 為 `prototype` × `unlisted`、頁面 `noindex`、不在 sitemap。沒有推送、沒有 PR、沒有部署。
這是新模組候選，不是 Hydrogen STOP 之後的替代 Pilot；11/30 範圍仍待 Owner 11/20 REPLAN。

證據分級依契約：**程式存在**（找得到實作）、**測試通過**（指定環境與範圍的結果）、**產品通過**（Owner 驗收）。本文件只宣稱前兩級，且逐項標出沒驗的部分。

## 1. 基準

| 項目 | 內容 |
| --- | --- |
| 基準 main | `58f244d`（feat(projectile): Gate A layered scientific workspace） |
| 工作區 | 獨立 worktree `../lab-doppler`，分支 `feat/doppler-prototype`；原 main 工作樹未動 |
| 實作 commit | `f353717`（科學核心）→ `df01b00`（模型層）→ `da262c6`（介面、路由、測試）；本文件與截圖是其後的 docs commit |
| PR #52 | **Draft、OPEN**，head `qa/projectile-baseline-20261118`，`MERGEABLE`，CI `check` SUCCESS，未合併。依指示以已合併 main 為基礎，只把它當 QA 參考 |
| Notion 契約 v1.0-d1 | 已讀（R01–R12、七週順序、分享與狀態相容性） |
| Notion 11/30 里程碑 | 已讀；狀態「等待」。2026-11-16 Hydrogen STOP：Owner Product UX Gate **FAIL**、Student Learning Gate **NOT CHECKED**、Release **NOT APPROVED**；11/18 Scope Reset 為「建議但未核定」。本 prototype 不改這些狀態 |
| Owner Gate（本模組） | **尚無**：Product UX、Student Learning、Release 全部未檢查 |

## 2. 重用與缺口

**直接重用（未複製）**：`app/lab-c2.css` 的 `--lc-*` token 與 44px range、`LabInfoDialog`（理論／模型資訊；新增選用 `closeLabel`，預設值不變，Projectile 行為不變）、`components/math/MathJax`（自架 MathJax）、`ThemeToggle`、`KakauLabMark`、`lib/i18n`（`Locale`、`localizedPath`）與 `proxy.ts` 的 URL 語系、`lib/site-metadata`、`globals.css` 內的 `.viewport-card`、`.theory-*`、`.guided-*`、registry、Playwright 設定與 `tests/e2e/evidence.ts`。

**沿用慣例但各自實作（缺口，非平台抽象）**：工具選單、放大視圖／Fullscreen 回退、元素量測尺寸 hook、傳輸控制（播放、單步、倍率）、引導任務狀態機與揭露政策、分享 codec 的驗證邊界。這些在 Projectile 與本模組各有一份，**現在已有第二個 consumer**；是否抽取、抽成什麼，留給既有 Gate。本輪刻意不新增通用工作區、時鐘或物理引擎。

**平台上沒有、本輪也沒補的**：共用的模式列、共用傳輸／時鐘、`/doppler/notes` 獨立理論頁（理論只做成 dialog）、catalog 卡片美術。

## 3. 實際修改與入口

- 入口：`/doppler`（繁中）、`/en/doppler`（英文）。本機：`npm run dev` 後開 `http://localhost:3000/doppler`。
- 新增：`lib/science/doppler.ts`、`models/doppler{,-learning,-serialization,-export}.ts`、`components/DopplerLab.tsx`、`components/doppler/*`、`app/doppler{,-c2.css}`、`app/en/doppler`；registry 第 11 號。
- 修改既有：`lib/labs/registry.ts`（新增項目）、`tests/registry.test.mjs`（11→12 項、矩陣）、`components/overlays/LabInfoDialog.tsx`（選用 `closeLabel`）、`docs/architecture.md`、`CHANGELOG.md`。

### 我自己定的、需要 Owner 知道的選擇

1. **S、O 初距 6 λ₀、實驗上限 16 T₀。** 初距 8 λ₀、上限 14 T₀ 時，O 以 0.5c 遠離根本收不到兩次波前；6／16 讓所有 |u|≤0.5c 的單一運動情況都至少有兩對可讀，同時 x 軸（−12…12 λ₀）能固定不變。
2. **改任何速度即重新生成實驗並回到 t = 0、暫停。** 沒有嘗試「保留目前時間」，因為事件資料整份改變。
3. **預設波前對為 #2、#3。** 步進器會把所選對限制在「兩個接收都在實驗內」的範圍。
4. **分享不含參考結果、時間、任務作答。** 語言切換連結只帶起始設定，因此切換語言會保留實驗，但不保留時間、參考與任務。
5. **速度滑桿用有號單一軸（−0.5c…+0.5c）加「反向」鈕**，而不是方向＋大小兩個控制，鍵盤與觸控都只需一個控制項。
6. 同向同速預設（兩者 0.2c 向右）：f/f₀ = 1 但 λ/λ₀ = 0.8，作為「間距會變、頻率不變」的對照。

## 4. 驗證結果（指令與數字）

| 項目 | 指令 | 結果 |
| --- | --- | --- |
| Lint | `npm run lint` | 0 error；2 個 `StandardAtmosphereLab.tsx` 既有 warning（與本改動無關） |
| Unit + build | `npm test`（= `npm run build` + `node --test tests/*.test.mjs`） | build 成功；**485 / 485 pass** |
| 型別 | `npx tsc --noEmit` | 本改動無錯；`db/index.ts`、`worker/index.ts` 的 cloudflare 型別錯誤在 main 上即存在 |
| Doppler E2E | `BASE_URL=http://localhost:3100 npx playwright test tests/e2e/doppler.spec.ts --project=desktop-chromium` | **31 / 31 pass**（dev server、Chromium） |
| 既有 Projectile E2E | `projectile-layered`、`projectile-export` | pass（一併跑的 32 個通過；theme-menu 見下） |
| theme-menu E2E | `tests/e2e/theme-menu.spec.ts` | 本分支 12 / 36 失敗；**同一份 spec 在 main（dev server，同機）10 / 36 失敗**，失敗集合不同、症狀同為「選單 list 未出現」，判為 dev server 水合時序的既有不穩，**未診斷、未修**；Doppler 未影響這些頁面 |
| 效能（非門檻） | `DOPPLER_PERF=1 npx playwright test tests/e2e/doppler-perf.spec.ts` | dev server／headless Chromium／未降速：首次可操作 322 ms；2× 播放 frame 平均 16.6 ms、p95 18.4 ms；放大視圖切換 22.7 ms。**這不是代表裝置的 baseline** |

### 科學單元測試（獨立解析值，`tests/doppler-science.test.mjs`）

| 情況（O 在 S 右側） | λ/λ₀ | f_obs/f₀ | 結果 |
| --- | --- | --- | --- |
| 都靜止 | 1 | 1 | pass |
| 波源向右 0.2c（靠近） | 0.8 | 1.25 | pass |
| 觀察者向左 0.2c（靠近） | 1 | 1.20 | pass |
| 波源向左 0.2c（遠離） | 1.2 | 1/1.2 | pass |
| 觀察者向右 0.2c（遠離） | 1 | 0.80 | pass |
| 同向同速 u = 0.2、−0.3、0.5 | 1−u | 1 | pass |

另有：左右鏡像（O 在左，時間相同、位置反號）、第一／第二次接收（一次接收不構成間隔）、任意時間路徑下狀態相同（步長不變性）、事件步進逐一走訪且不重複、重合前停止（0.5c 對 −0.5c 在相距 1 λ₀ 結束，S 從未到 O）、八種非法參數（NaN、Infinity、|u|>0.5c、距離過近／過遠、位置過大）、層級（science 不 import、models 只 import `lib/science`、`lib/render` 不認得 Doppler）。

## 5. R01–R12 證據矩陣

「E」＝已有的證據；「缺」＝這輪沒做或沒驗。瀏覽器證據都是 **Chromium（Playwright，視窗大小模擬）**；沒有真機、沒有 Safari／Firefox、沒有螢幕閱讀器。

| 編號 | 狀態 | E：證據 | 缺：缺口 |
| --- | --- | --- | --- |
| R01 共同資訊架構 | 部分 | 自由探索／探索任務／理論與計算三入口皆實質有內容，無空分頁；參數與讀值在工作區側欄，分享、匯出、語言、外觀、模型資訊在標頭（`doppler.spec`：Activity 1/2、free 系列） | 沒有「圖層」抽屜（只有 2 個 checkbox：連線、編號）；工具選單是本模組自有 |
| R02 桌機與手機工作區 | 部分 | 1366×768、1280×720、390×844、360×800、320×640 皆無橫向捲動、兩圖與時鐘在視窗寬內、主要入口 ≥44 px、tab 順序每一站有 ≥2 px 焦點環且在視窗內；1280×720 核心圖、傳輸、側欄操作在同一畫面（截圖 `free-1280x720.png`）；手機依「圖→時鐘→預設→參數→讀值」堆疊，兩圖在高度≥700 時釘住 | 200% 文字、400% zoom、旋轉**未測**；1280×720 頁面本身不捲動（量得 dock 底 705 px、`scrollHeight` 720），預設與兩個速度滑桿在首屏，但所選對讀值卡在側欄內要捲動才看全 |
| R03 沉浸與重設 | 部分 | 兩個科學視圖各自放大／退出（Esc、焦點回到該視圖的觸發鈕），放大前後參數、時間、所選對皆保留；Fullscreen API 失敗時視窗內放大仍可用（程式存在）；重設實驗與重新開始任務分開 | Fullscreen API 成功與失敗路徑**未在瀏覽器驗**；波前圖沒有平移／縮放，所以沒有「視角復位」 |
| R04 可重現分享 | 通過（測試範圍內） | 分享＝起始設定；含模型版本 `doppler-wavefront-1`、格式 v1、初始位置、速度、預設、所選對、呈現旗標；乾淨 browser context 開啟後暫停在 t=0 且參數、預設、所選對一致，再播放得 1.20；無效 JSON、格式 v2、模型版本不符、速度越界皆回到預設並說明原因（`doppler.spec` share 測試＋`doppler-state.test.mjs`＋伺服端渲染測試）。不含時間、作答、學生資訊 | 沒有舊格式可遷移（本模組只有 v1）；URL 長度上限 2000 之外的行為只靠單元測試 |
| R05 可用成果匯出 | 通過（測試範圍內） | SVG 教學圖＋JSON 事件資料；SVG 含波前圖、接收時間帶、比較表（目前／參考／公式核對）、條件、單位、模型版本、結果／分享格式、假設、全部事件於 `<metadata>`；實際以檔案開啟並看過（`export-observer-approach.png`），逐一檢查文字都在畫面內、無裁切，並修掉第一版的標籤重疊（A 標題與說明列、標籤壓在圓上） | 只匯出目前游標時刻的波前圖（時間帶與比較表是整個實驗）；匯出固定白底；PNG 匯出未做 |
| R06 完整雙語與 ruby | 部分 | 繁中預設、`/en/doppler`；介面、導學、錯誤、理論、匯出、對話框關閉鈕皆雙語；320 與 390 px 英文長標籤無橫向捲動、按鈕文字無裁切；語言切換保留起始設定 | **台文 ruby specimen 未驗**；英文實驗文案未經人工審稿；螢幕閱讀器的語言切換未驗 |
| R07 完整探索活動 | 通過（測試範圍內） | 任務一「波源怎麼發聲？」（預測→量→解釋→完成）；任務二「誰在動？」（預測→波源動→觀察者動→比較→解釋→遠離驗證→完成）。每步的揭露、保留結果、重新開始、離開確認、切換任務、返回自由探索還原先前設定與參考的規則皆有測試 | 沒有學生使用觀察；提示文案未經學生驗證 |
| R08 多重表徵與比較 | 通過（測試範圍內） | 同一波前在波前圖、時間帶、讀值卡以編號與粗線連動；時間帶標記、步進器皆可選對（`doppler.spec` 選取連動測試）；保留一次參考後改條件，在同一尺度（固定 x 軸、固定時間軸）下比較 1.25 與 1.20 | 波前圖上直接點圓只有程式、測試用的是時間帶與步進器 |
| R09 科學透明度 | 部分 | 理論 dialog：名稱、`doppler-wavefront-1`、方程、符號與 s 的定義、假設、數值方法（封閉解、無時間步進）、結束條件、適用範圍與限制、OpenStax §17.7 來源；模型資訊說明「圓、接收時刻、讀值＝模型；箭頭長度、標記大小、標籤位置＝示意」；匯出再列一次 | 沒有獨立 `/doppler/notes` 頁 |
| R10 操作與可及性 | 部分 | 預設、速度、時鐘、步進器、放大都可只用鍵盤完成（`doppler.spec` 鍵盤測試）；有可辨焦點；S＝菱形、O＝方塊、所選對＝粗線，不靠顏色；本模組沒有拖曳操作，所選對有「上一對／下一對」替代；結構化讀值（`dl`／`table`）；axe：自由探索、接收後、導學預測、導學量測、理論 dialog、暗色自由／比較／理論皆無 serious／critical | 未做螢幕閱讀器實測；axe 不等於 WCAG 2.2 AA 全項；SVG 標記的點擊區約 22 px（<44，已有按鈕替代） |
| R11 效能與恢復 | 部分 | 上表的非門檻數字；非法／過期分享、匯出失敗、Fullscreen 失敗皆有可理解的訊息與回復 | 沒有代表裝置的 baseline、沒有低階手機量測、沒有拖曳延遲（無拖曳） |
| R12 可維護與可追溯 | 部分 | science／models／components 分層由 `doppler-state.test.mjs` 斷言；科學、互動、教學、視覺（截圖）、分享／匯出、雙語各有獨立測試；三種版本名稱分開（模型、分享、結果）；registry 與 CHANGELOG 已更新；`lint` + `test` 本機通過 | 沒跑遠端 CI、沒部署、沒有正式 smoke；PR 未開 |

## 6. 截圖與檔案

均在 `docs/audits/doppler-prototype-20261119/`：

- 自由探索：`free-1366x768.png`、`free-1280x720.png`、`free-390x844.png`、`free-360x800.png`、`free-320x640.png`；暗色 `free-dark-1280x720.png`
- 導學：`guided-predict-320x640.png`、`guided-b-predict-390x844.png`、`guided-b-measure-390x844.png`、暗色比較 `guided-b-compare-dark-1280x720.png`
- 英文：`en-free-{320,390}x700.png`、`en-guided-predict-{320,390}x700.png`
- 理論（暗色）：`theory-dark-1280x720.png`
- 成果：`export-observer-approach.svg`／`.json`（實際下載的檔案）、`.png`（以 `<img>` 載入該 SVG 的畫面）

## 7. 待 Owner 審查：UX 與學生可用性

**UX（Owner Product UX Gate，未檢查）**

1. 兩張圖上下堆疊、讀值卡放右側——是否符合「同一波前、兩種表徵」的第一眼？時間帶的連線是否太多？
2. 波前通過 O 的瞬間，「#2／#3」標籤、間距括號與 O 標記會擠在一起（截圖可見）；是否接受，或要改成只標在圖外？
3. 1280×720 能同屏看到兩圖、傳輸、預設與滑桿，但右側「所選對讀值」要在側欄內捲動；我把滑桿排在讀值前（連續操作優先），是否要反過來？時間帶上的括號與底部即時 f/f₀ 已重複顯示關鍵數字。
4. 導學任務二用的是「保留結果」按鈕串起兩組實驗，是否比並排雙圖更容易理解？
5. 有號單一滑桿＋「反向」是否比「方向＋大小」更直覺？
6. 配色（S 橘、O 藍、所選對青）與暗面資料畫布，屬待實畫選型的 Science 配色，**未經選型 Gate**。

**學生可用性（Student Learning Gate，未檢查；沒有任何學生看過）**

- 驗收題：**學生能從兩張圖說明為什麼 1.25 f₀ 和 1.20 f₀ 不同。** 介面把答案所需的三個量放在同一張比較卡：波源靠近 λ = 0.80 λ₀、Δt = 0.80 T₀（O 靜止，波前以 c 通過）；觀察者靠近 λ = 1.00 λ₀、Δt = 0.83 T₀（間距不變，O 以 1.2c 迎向）。能否由學生自己說出來，需要觀察，這裡沒有證據。
- 要觀察的點：預測選項（「只看相對速率」）是否抓得到迷思；「間距」與「接收間隔」兩個詞學生是否分得開；提示三層是否夠用；任務一是否太簡單。

## 8. 試用後的修正（Owner 回饋）

分享、匯出的通知改成浮動 toast（圖示、關閉鈕、Esc，不再推動版面）；實驗結束改成時間帶內固定繪製的結束線與標示，不再在 dock 多出一行；播放倍率收成一個選單並加入 4×；全螢幕與退出放大改為圖示鈕；標籤、讀值、公式核對、模型資訊與導學比較卡的公式改用 MathJax。對應 3 個新 E2E（版面不位移、toast、倍率選單／圖示／排版）。導學選項按鈕內的 `λ₀`、`T₀` 仍是純文字（它們是被引用的整句選項，也是測試的選取依據）。

### 第二輪回饋

分享 toast 加複製鈕（實測會寫入剪貼簿、短暫顯示勾號）；匯出選單項目加圖示；代表「波源」「觀察者」的下標一律改為正體大寫（$u_\\mathrm{S}$、$u_\\mathrm{O}$、$x_\\mathrm{S}$、$\\lambda_\\mathrm{S}$、$t_{\\mathrm{R},n}$、$\\Delta t_\\mathrm{R}$；匯出 SVG 以降低的 tspan 呈現），`f_\\mathrm{obs}` 與表示傳播方向的 $s$ 維持原樣，並以原始碼掃描測試防止小寫下標回來；理論對話框在公式旁新增符號表（符號、名稱、SI 單位，另附本模型的正規化單位，共 15 列，中英文各一份，窄螢幕在表內橫向捲動）。

## 9. 未做與後續

- 音訊、路旁掠過、Mach 錐、光譜紅移、音量模型：依任務範圍列為後續。
- 若 Owner 要把 Projectile 與本模組共有的模式列、傳輸、放大視圖、揭露政策抽成平台元件，需先走既有 Gate；本輪沒有動。
- 台文 ruby、200%／400% 縮放、旋轉、Safari／Firefox、螢幕閱讀器、代表裝置效能：全部未驗。
