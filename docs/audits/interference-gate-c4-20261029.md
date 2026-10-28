# Interference Gate C4 — 整體使用體驗與 Owner 驗收（工程報告）

日期：2026-10-29　Branch：`feat/interference-gate-b1`　Preflight SHA：`0459842d1dcfbca0156e1c083ae60b92ca9de66f`（與 origin 相同，working tree 只有未追蹤的 `test-results-c2*`）

**Gate C4 Engineering Verdict：PASS（Engineering PASS，不是 Owner PASS）**
Owner 尚未實際操作，C4 不得視為關閉。操作清單見 [owner-script](interference-gate-c4-20261029-owner-script.md)。

## 1. 本輪修復（皆為本地 commit，未 push）

| Commit | 內容 |
|---|---|
| `f3c3c6d` | A1：`.step__title` 由 flex 改為正常文字流；A2：波速滑桿補發 readout |
| `95f7d41` | C4 回歸測試（標題幾何、波速同步、不重複 typeset） |
| `7d784cd` | 公式幻影捲軸、dialog 行內公式基線、長推導式捲動提示 |
| `f0ad01e` | 活動 1 步驟累進顯示、`select-row` 句子改為文字流 |
| `2b103fe` | 測試標記 `@cross-browser` |

### A1 活動 3 題幹斷行
- 原因（已重現）：`.step__title` 是 `display:flex`，文字節點、`<mjx-container>`、後續文字各自成為 flex item，因此被拆成欄。測試在舊 CSS 上以「still flex」失敗。
- 修復：`.step__title` 改為區塊文字流，編號圓點用 hanging indent（`padding-inline-start` + 負 `text-indent`）留在第一行左側；沒有絕對定位、沒有硬塞空白，也不是圖片。無編號標題另有還原規則。
- 同類缺陷：`.select-row`（活動 1 結論的 `|Δr|/λ` 句子）同為 flex，一併改為文字流。
- 驗證：活動 1–4 與 ★ 全部含公式的標題，在 1440、390、320 與 390＋200% 文字下檢查「非 flex、圓點在行首、公式在標題範圍內、公式與前一個字同列不重疊、無整頁橫向溢出」。截圖：`interference-gate-c4-20261029/activity3-title-*.png`。

### A2 波速與公式同步
- 重現：進階展開、暫停，只拖波速 v 到 1.5 → 畫面 v、f 輸出會變，但 `v = fλ`／`T = 1/f` 的 MathJax 與 sr-only 仍是 v=1.00、f=1.00（測試在舊碼上失敗，實測讀值 `v = 1.00，f = 1.00，λ = 1.00，T = 1.00 s`）。
- 原因：`bindRange("waveSpeed")` 更新了內部值與輸出，沒呼叫 `renderReadouts()`。
- 最小修復：該 handler 結尾加 `renderReadouts()`（只發 readout 事件，不重算波場；readout 本身會去重，只有數字改變才發出）。
- 驗證：暫停時 v=1.5 → f=1.50、T=0.67；連續快速五次調整最後收斂到 v=0.50、f=0.50、T=2.00；λ 維持 1.00；播放 1.2 秒後 kinematics 區的 SVG 數與 DOM 大小不變（沒有每格重新 typeset）。

## 2. 排版收斂（C4-B）
- 短公式 r₁、r₂ 的局部水平捲軸：原因是 MathJax 的 `mjx-assistive-mml`（絕對定位、與文字同寬）撐大捲動範圍，造成 6px 幻影捲軸。於 `.interference-lab` 範圍內限制其寬度；三個 viewport 下所有 `.if-math` 均無局部捲動（有測試）。不動共享 MathJax 元件，也沒動全站 typography token。
- dialog 內行內公式為 `overflow:auto` 容器，造成中文與公式基線錯位；改為只有 display 公式可捲動，行內公式 `overflow:visible`。
- 長推導式（雙曲線標準式等，320 寬需橫向捲動）加上兩側「有更多內容」陰影（僅在內容被截斷處顯示），並有測試。
- 動態分類句與 P 吸附提示仍用 Unicode（依指示可接受）。

## 3. 使用路徑驗收
以實際操作（自動化腳本逐步印出狀態）加上 E2E 驗證：

| 路徑 | 結果 |
|---|---|
| 自由探索：λ、d、視圖、課本／進階 | PASS：公式、線數、圖例同步；進階開啟顯示警告與「相位條件」計數 |
| P 點：放置、拖曳、吸附、七項讀值、清除重放、鍵盤 | PASS（C2 鍵盤測試、C3 公式測試、renderer 測試皆通過） |
| 活動 1 路徑差 | PASS，見 §5 的步驟累進修復 |
| 活動 2 線數預測 d=3λ | PASS：鎖定前先預測、幾何線數遮為「線數暫時遮住」、錯誤預測給提示（「波腹線包含中央 Δr=0」）、答對揭曉 7／6 |
| 活動 3 反相 | PASS：預測前不洩漏；回饋「中央線其實變成相消條件線。合成振幅 0.00」 |
| 活動 4 波在動嗎 | PASS：錯誤回答得到「波峰與波谷會隨播放移動」提示 |
| ★ 退化半直線 | PASS：d=2.9λ→5 條波腹、3λ→7、3.1λ→7，說明一致 |
| 進階 | PASS：A₂≠A₁、φ₂=180°、衰減皆切為進階模式並顯示「相消條件上也未必是零振幅」；重設參數回課本模式 |
| 投影 | PASS：往返後 λ、d、P 位置、目前活動分頁與預測選項皆保留 |

## 4. 活動 1 步驟累進（Owner 要求先比較再建議）
- Front：活動 1 的三個步驟以 `data-show-on="place explore conclude done"` 等規則累進，前面步驟保留並打勾；活動 2–4 是單步切換（Front 與 Lab 一致）。
- C3 的 Lab：步驟 1 保留打勾，但步驟 2（拖曳吸附、兩種線的 |Δr|/λ 實測值）在進入步驟 3 時被隱藏。
- 教學價值：步驟 3 要學生歸納「波腹線上 |Δr|/λ 都是…」，而證據（0.00、0.50 等實測值）正是步驟 2 的內容；隱藏它等於要求學生憑記憶作答，屬明顯教學退化，且修復成本極低（不動狀態機，只是不隱藏、改標 `is-done`）。
- 擁擠度：實測側欄 1440 寬下三個步驟同時顯示無截斷、無頁面溢出（`activity1-cumulative-steps.png`）。
- 處置：已修復（commit `f0ad01e`），含測試。屬低風險；若 Owner 偏好舊行為可單行回復。

## 5. 差異決策

**Must Fix before Gate D**：無（P1 兩項已修復）。

**Acceptable Difference**
- 字體字形與間距與 Front 的 KaTeX 略有差異（MathJax SVG）。
- 1280×800 時右欄需捲動才看到波形圖（C3 已記錄，內部捲動）。
- 動態分類句、P 吸附提示使用 Unicode 而非 TeX。

**Deferred Improvement（建議列 P2，待 Owner 同意）**
- 投影模式中不能調 λ、d，必須先退出：對教師是一次額外點擊，非阻斷；若課堂需要，建議日後新增「投影中的精簡 λ／d」而非完整教師控制。
- 條件線 hover 狀態（C3 已列）。

**Unverified Residual Risk**
- VoiceOver／NVDA 等人工輔助科技、真實 400% 縮放、真機手機。
- MathJax 載入失敗時的 fallback 未以注入失敗測試。
- 本輪未對 Safari/Firefox 做視覺逐項比對，僅跑功能與幾何測試。
- 不宣稱符合完整 WCAG 2.2 AA。

## 6. 測試結果
| 項目 | 結果 |
|---|---|
| Unit | 439/439 |
| C4 新增 E2E | 13（desktop-chromium）全過 |
| Firefox + WebKit（C4 子集 20 項，使用 C3 之後的 MathJax 版本） | 20/20 |
| 全部 interference E2E（desktop + mobile-chromium，dev server） | 42/42 |
| axe（C3 spec 亮／暗；C2 dialog） | 無 serious／critical |
| Lint | 0 error（2 個既有 warning 在 `StandardAtmosphereLab.tsx`） |
| TypeScript | 3 個既有 Cloudflare ambient types 錯誤，interference 無新增 |
| Production build | 完成 |
- 測試在執行時會重寫各 gate 的證據 PNG；已用 `git checkout -- <dir>` 還原既有 gate 資料夾，只保留 C4 資料夾的新證據。
- `/interference-lifecycle` 僅 dev 路由，prod build 下不可測（既有限制）。
- 手機為 Chromium 模擬（Pixel 5 與 390／320 viewport），不是真機。

## 7. Gate C 整體結案建議
科學（C）、工程無障礙（C2，PARTIAL 風險已保留）、布局與數學（C3）、整體體驗（C4 工程）皆達標。建議：**Owner 完成操作清單且無 FAIL 後，Gate C 整體 PASS**，並把 §5 的 Unverified Residual Risk 以書面風險接受。

## 8. Gate D 發布前提
- Owner 簽核 C4（操作清單）。
- Owner 決定 §5 的 Deferred 項目是否接受。
- 之後才進 Gate D：Registry、Front redirect、canonical／sitemap、SEO；目前皆未動，Front 未修改。

## 9. Git 與工時
Branch 在本機領先 origin 6 個 commit（含本報告），**尚未 push**；無 PR、merge、deploy。工時未追蹤。
