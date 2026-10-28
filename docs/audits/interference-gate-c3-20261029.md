# Interference Gate C3：介面視覺與布局等價修復

日期：2026-10-29　範圍：`kakau-lab` `/interference`（本地）對照 `kakau-front` `/lab/interference`（本地）。
結論：**PASS**（Agent 工程判定；C4 與整體 Gate C 由 Owner 決定）。

## 1. Executive Summary

Gate C2 之前的 Lab 版本功能齊全，但布局是「表單式」：三欄卡片等權重、參數放在側欄、時間控制在波場下方、幾何公式與線數完全缺席、P 量測只是一張讀值表。C3 把 Front 的資訊架構整套恢復：

- 頂部緊湊工具列（波場／λ／d／線條／進階）。
- 波場 Canvas 為視覺重心，右側 rail 分「幾何」與「量測 P」。
- 幾何 rail 有 d/λ、N腹、N節公式並代入即時數值；進階模式改顯示逐條計算的線數。
- 量測 rail 有 r₁、r₂、Δr、|Δr|/λ 公式列、分類框、Δφ／|C|／ψ(P,t)、P 點一週期波形。
- 圖面標出 S₁／S₂、P、r₁／r₂ 與吸附線說明；波場下方有色階圖例。
- 可收合活動側欄（桌機右欄、平板／手機為頁首手風琴）、獨立底部時間列。
- 投影模式改為「主圖優先」：隱藏工具列與活動，保留量測 rail 與時間列。
- 全程使用 Lab 既有主題 token；亮／暗主題皆通過 axe。

未修改 `lib/science/interference.ts`、`models/*`、五個活動的教學內容與 localStorage 鍵名。

## 2. Source / Target SHA

| | 值 |
|---|---|
| Target | `qavit/kakau-lab`，branch `feat/interference-gate-b1` |
| Gate C2 提交 | `ba5777b`（本次 Preflight 建立；僅含 C2 的 3 個修改檔、3 個 spec、2 份報告、證據資料夾） |
| C3 起點 | `ba5777b2df213e94a1cdf153ed325d05cf9b22ce` |
| Source（參照） | `qavit/kakau-front`，baseline 擷取時 HEAD `9f5678b2df0c30b720d7334e9f76dbc71aa32a4d`；撰寫報告時 HEAD 已前進至 `278474f`，但 `InterferenceLab.astro`、`pages/lab/interference.astro`、`lib/labs/interference` 在兩者之間**無差異** |

Front 與 Lab 都用本地 dev server 取得畫面（Front `astro dev`，Lab `vinext dev`）。Lab 線上站點尚未部署新版，未使用。

## 3. Baseline Screenshot Comparison

擷取腳本：`scripts/c3-capture.mjs`（同 viewport、DPR 1、reduced-motion、light）。

| 情境 | Front 參照 | Lab 修復前 | Lab 修復後 |
|---|---|---|---|
| Desktop 1440 預設／活動展開／收合／P 已放置 | `baseline/front/desktop-1440-*.png` | `baseline/lab-before/desktop-1440-*.png` | `baseline/lab-after/desktop-1440-*.png` |
| Desktop 1280 同上 | `baseline/front/desktop-1280-*.png` | `baseline/lab-before/…` | `baseline/lab-after/…` |
| Tablet 768 | `baseline/front/tablet-768-*.png` | `baseline/lab-before/…` | `baseline/lab-after/…` |
| Mobile 390／Narrow 320 | `baseline/front/mobile-390-*`、`narrow-320-*` | `baseline/lab-before/…` | `baseline/lab-after/…` |

測試順帶存下的功能狀態畫面在 `lab-after/`：進階模式、活動 2 完成、教學 dialog、投影模式、亮／暗主題、手機引導活動、320 dialog。
（全部路徑相對於 `docs/audits/interference-gate-c3-20261029/`。）

## 4. V01–V15 Parity Matrix

| ID | 項目 | Front reference | Lab 修復前 | 修復 | 狀態 |
|---|---|---|---|---|---|
| V01 | 整體 layout | 標題／工具列／波場＋rail＋活動／時間列 | 波場、控制、活動三欄卡片；時間列在波場下 | 以 `if-body`/`if-stage`/`if-main` grid 重建 | PASS |
| V02 | 模組標題 | 標題＋副標＋模式徽章＋重設 | 標題＋說明文字＋兩顆無樣式按鈕 | 標題列含副標、課本／進階徽章、投影、重設 | PASS |
| V03 | 參數工具列 | 水平緊湊、數值右對齊 | 直式表單 | 水平 flex 工具列；波場分段按鈕、「更多」收納 amplitude／phase | PASS |
| V04 | 波場主畫面 | 置中、方形、佔主要面積 | 560px 上限、旁邊留白 | container-query 方形；1440×900 約 630px，投影約 680px | PASS |
| V05 | 條件線與波源標籤 | S₁/S₂、圖例色塊、線寬 2.6 | 無標籤、線細 | S₁/S₂、P、r₁/r₂ 標籤；色與線寬同 Front；線條圖例色塊；色階條 | PASS |
| V06 | 幾何 rail | d/λ、N腹、N節代入即時值 | 無 | `InterferenceFormulas` 即時 slot；活動 2 作答前遮成「?」；進階模式改逐條線數並提示公式不適用 | PASS |
| V07 | 量測 rail | 公式列、分類框、Δφ/|C|/ψ、波形 | 純讀值表 | 同 Front 結構；空狀態提示；分類含 tone 底色 | PASS |
| V08 | 活動側欄 | 收合＋圓形步驟 tabs＋步驟狀態 | 按鈕牆、文字切換 | 收合成直條；tab 圓形；步驟 1 完成打 ✓、清單項勾選 | PASS |
| V09 | 時間工具列 | 播放／t/T=0／拖桿／提示 | 在波場下方、無區隔 | 獨立底列；非位移視圖顯示「只有瞬時位移會隨時間改變」 | PASS |
| V10 | 進階參數 | popover、含 v=fλ 代入式 | `<details>` 內嵌表單 | 浮動面板、2 欄、kinematics 即時式、非課本警示 | PASS |
| V11 | Dialog／推導 | 標題列固定、可讀行寬 | 簡樸 | 固定標題列、44rem、公式 `mjx-container` 局部捲動 | PASS |
| V12 | 視覺階層 | 主圖→rail→活動 | 等權重 | 工具列／rail／活動使用邊線分區而非卡片 | PASS |
| V13 | 響應式 | ≥1024 三區；以下單欄、活動手風琴 | 手機三卡片堆疊 | 同 Front 斷點；手機 λ/d 兩欄並排以減少首屏高度 | PASS |
| V14 | 主題相容 | （Front 僅亮色） | 部分寫死色 | 全部取 Lab token；暗色另設兩條線的對比色；axe 亮／暗皆無 serious | PASS |
| V15 | 投影模式 | （Front 無；Lab 既有功能） | 縮不小的卡片 | 全螢幕、隱藏工具列與活動、保留 P rail 與時間列、再按還原 | PASS |

V01–V15：**15 PASS、0 PARTIAL、0 FAIL、0 NOT VERIFIED**（V14 的 Front 一側不適用，只驗 Lab）。

## 5. Layout Restoration

- 桌機（≥1024）：整個學習迴路一屏內，頁面不捲動；1440×900 plot ≈ 630px、1280×800 ≈ 530px。活動收合後列寬 < 60px，plot 變大。
- 平板／手機：活動手風琴置頂；順序為工具列 → 波場 → 時間列 → 幾何／量測 rail；rail 在 ≥641px 兩欄、以下單欄。
- 檔案：`components/interference/InterferenceSimulation.tsx`（結構）、`interferenceStyles.ts`（CSS，原本內嵌於 TSX）、`InterferenceFormulas.tsx`（公式 adapter）。

## 6. Formula / Measurement Restoration

- **Presentation adapter**：`InterferenceFormulas.tsx` 以靜態 JSX＋CSS 分數／floor 括號呈現公式，數值為 `data-slot` 元素；`mountInterference` 只替換文字（先比對 `textContent`，無變化不寫 DOM）。不引入 KaTeX、不重新排版、不使用 `dangerouslySetInnerHTML`，動畫影格不會 reflow。每個公式 `aria-hidden`，並配 `sr-only` 敘述句（`data-geometry-sr`、`data-measure-sr`、`data-kinematics-sr`）。活動中的靜態公式與 dialog 仍使用既有 MathJax。
- 課本模式顯示 `N腹 = 2⌊d/λ⌋+1`、`N節 = 2⌊d/λ+½⌋`；進階模式隱藏這兩式，改顯示 `phaseConditionLevels` 逐條計數。
- 量測：r₁、r₂（實／虛線圖例）、Δr（帶號）、|Δr|/λ、分類框（課本模式依整數／半整數；進階模式依 Δφ 與 |C|，並警告相消未必零振幅）、Δφ、|C|、ψ(P,t)、一週期波形＋t/T 游標。未放 P 時只顯示操作提示。
- 測試保證：拖動 d 時 rail 的 bbox 不變（無 layout shift）；放 P 不移動波場。

## 7. Guided Activities / Projection Mode

- 活動內容、狀態機、`data-activity-*` 與 `data-answer-*` 掛鉤全部保留；僅調整標題層級與樣式。tab 的 accessible name 保留「路徑差／線數預測／反相波源」等關鍵字。
- 活動 2 在作答完成前遮住幾何 rail 線數，完成後揭曉（有測試）。
- 切換 tab、收合側欄、離開投影模式不重設答案或進度（沿用原狀態物件）。
- 投影模式：`fixed` 全螢幕、`100svh`、grid 重排為「主圖＋量測 rail／時間列」；測試確認 plot 變大、P 與讀值保留、退出後 plot 尺寸還原、P 不遺失。

## 8. Desktop / Mobile Comparison

| Viewport | 結果 |
|---|---|
| 1440×900 | 與 Front 區域關係一致；活動展開／收合皆正常 |
| 1280×800 | 同上；rail 內容略高於可視高度，rail 自身可捲（Front 同樣） |
| 768×1024 | 單欄；活動預設收合（與 Front 相同的手風琴行為） |
| 390×844 | 單欄；λ／d 兩欄並排；波形圖在 rail 內 |
| 320×720 | 無橫向溢出；dialog 在 viewport 內 |

## 9. Remaining Visual Differences（交 Owner 於 C4 審閱）

1. **線條 hover 狀態行**：Front 滑鼠移到條件線上會在圖左下顯示該線說明並加粗；Lab 只在 P 吸附時顯示。屬 P2，需為每條線加 hit path。
2. **活動 1 步驟累進顯示**：Front 完成前面步驟後仍顯示所有步驟；Lab 只保留步驟 1（已打 ✓）與目前步驟，步驟 2→3 時舊步驟隱藏（為相容既有 `hidden` 測試語意）。
3. **公式字形**：Front 為 KaTeX 預渲染；Lab 為 STIX/serif＋CSS 版型，分數與括號略有字距差異。
4. **1280×800 的 rail 需捲動才能看到波形**：已緊縮密度，但該高度仍放不下全部。
5. **頁首／全站導覽**：依規範不複製 Front navbar；Lab 頁面目前只有模組區塊，品牌入口由 Lab 站設計決定。
6. 投影模式為 Lab 專有功能，無 Front 對照。

## 10. Functional / Scientific / Accessibility Regression

- 科學核心 `lib/science/interference.ts`、`models/*` 未改；439 個 unit（含 golden cases）全過。
- UI 與核心對照由 C3 spec 驗證：d=3λ → 7/6 條；移相 180° → 進階模式與詞彙換成「相長／相消條件線」。
- 可及性：既有 b3 axe、c2 語意／焦點／dialog 測試通過；新增亮／暗兩主題 axe（critical/serious 為 0）。這次發現並修正 `--muted` 對比不足（3.9:1 → 改用 `--body`）。
- 收合側欄後 nav 為 hidden（不可聚焦）；dialog 焦點返回開啟者；兩個 localStorage 鍵（側欄、操作提示）行為不變。
- **未驗證**：VoiceOver、400% 真實縮放、真機觸控（承襲 C2 的 NOT VERIFIED，C3 未擴大也未宣稱完成）。

## 11. Tests and Build Results

| 項目 | 結果 |
|---|---|
| Unit（`node --test tests/*.test.mjs`） | **439/439 PASS** |
| C3 新增 `tests/e2e/interference-c3-visual.spec.ts` | **13/13 PASS**（桌機 1440／1280 空間關係、即時公式、量測 rail、活動 2 遮罩、投影、dialog、亮／暗 axe、768/390/320 響應式、320 dialog） |
| 既有 interference e2e（dev server，serial） | 25–26/27 PASS；每次有 1–2 項不同的失敗，單獨重跑皆 PASS。原因：測試會把截圖寫進專案目錄，觸發 Vite HMR 重新載入，造成 "Execution context destroyed"／計時競爭。修正了一處真正的計時競爭（renderer mobile 測試在 mount 前量 canvas；改為等 `data-interference-frame`） |
| 全部 interference e2e（production build，27 項） | **17 PASS（含 C3 的 13 項與 c2 的 4 項）、10 項不可執行**：這 10 項都 `goto("/interference-lifecycle")`，該內部測試路由在 prod build 為 404（與 C2 相同的既有限制）。這 10 項改在 dev server 驗證：每一項在單獨重跑時皆 PASS |
| `npm run lint` | 0 error；2 個既有 warning（`StandardAtmosphereLab.tsx`，非本次引入） |
| `tsc --noEmit` | 3 個既有 error（非 interference；Cloudflare ambient types 既知問題），interference 檔案 0 error。**不宣稱 repo 全綠** |
| Production build (`npm run build`) | PASS |
| Visual regression | 以幾何斷言＋證據截圖進行，**非像素基準比對**（畫面含動畫 canvas 與跨機字型差異，不宜作像素基準） |
| Cross-browser | C3 只跑 Chromium；Firefox／WebKit 未重跑（C2 的抽查結果不延伸到 C3 版面） |

測試修改：`interference-renderer.spec.ts`（因 amplitude／phase 檢視收進「更多」，先展開；加入等 frame 的同步點）。

## 12. Gate C3 Verdict

**PASS**。

依據：主要桌機資訊架構與 Front 實質等價；公式、量測、圖例、分類資訊完整且即時；活動與投影模式無操作退化；手機布局可用；無新增科學／功能／可及性 regression；差異皆有同條件畫面；剩餘差異皆非重大並已列出。
限制：Firefox／WebKit、VoiceOver、400% 縮放、真機未驗；既有 e2e 在 dev server 有 HMR 造成的間歇失敗。

## 13. Gate C4 Handoff

C4 請 Owner 實際操作：

1. 桌機完整走活動 1→4→★，確認步驟顯示、核對回饋與 rail 遮罩／揭曉時機。
2. 放置、拖曳、鍵盤移動 P，並比對 rail 讀值與波場。
3. 切進階模式（改 φ₂、A₂、衰減），確認線數與警示文字是否符合教學意圖。
4. 投影模式：確認是否需要「隱藏後仍想調 λ／d」，目前需退出才能調。
5. 手機真機：觸控拖曳 P、活動手風琴、dialog。

需 Owner 決定：
- 是否補「條件線 hover 狀態行」（剩餘差異 1）。
- 活動步驟是否改為累進顯示（剩餘差異 2）。
- 公式字形是否接受 CSS 版型，或改回 KaTeX 預渲染（需 build-time 轉換）。
- 投影模式是否保留 rail 與時間列的預設內容。

Gate D 前提：Lab 正式部署與 Front redirect／registry／SEO 切換（本次未動）、Firefox／WebKit 重驗、VoiceOver 與 400% 縮放、`/interference-lifecycle` 以外的 prod 路徑 e2e 覆蓋、C4 驗收通過。
