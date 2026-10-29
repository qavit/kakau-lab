# 雙點波源干涉 Gate C2｜F22 無障礙補驗與發布前品質收斂

日期：2026-10-29（Asia/Taipei）｜分支 `feat/interference-gate-b1`｜基準 HEAD `a046774e61eab572f3b0fff3fd1c83c923b827b1`

## 1. Executive Summary

**Gate C2：PARTIAL。** 核心功能、鍵盤操作、跨瀏覽器與 10 分鐘穩定性有可重現的自動化證據，且補修了兩個實際的鍵盤／讀值缺陷。但 **真實 VoiceOver 驗收未執行**、**400% 真實瀏覽器縮放無證據**、行動橫向未測，這些不能由自動化取代，因此 F22 維持 NOT VERIFIED，Gate C 不得升級為 PASS。Owner 腳本：`interference-gate-c2-20261029-owner-script.md`。

本輪無 push／PR／merge／deploy，未動 Registry、Front、SEO。修改尚未 commit。

## 2. Baseline / Environment

- macOS（Darwin 25.6.0），Playwright 1.63.0（Chromium、Firefox、WebKit 官方套件）。
- 開始時 HEAD 即 a046774；工作樹已有前一輪（中斷）留下的 3 個修改檔與 C2 測試／證據，本輪沿用，未 reset。
- 本輪執行 `npm run build` 後，以 `vinext start --port 3100` 在 production 建置上驗證；dev 伺服器（`localhost:3000`）供需要 dev harness 的測試使用。
- 注意：Playwright 需用 `localhost`（非 `127.0.0.1`）連 dev 伺服器。
- 測試跑出的舊稽核截圖（B2／B3／C 的 PNG）曾被覆寫，已用 `git checkout` 還原；工作樹僅剩本任務的修改。

## 3. F22 Accessibility Matrix

| 項目 | 方法 | 結果 |
|---|---|---|
| 鍵盤到達全部重要控制 | Playwright Tab 序列（34 步，`tab-sequence.json`） | PASS |
| 焦點順序合乎視覺邏輯 | 同上：標題區→圖面→播放→slider→參數→側欄→活動→上下一個 | PASS（序列檢查，非人工朗讀） |
| Focus indicator | 3px `#174c70` 外框，對白 9.11:1、對底色 8.41:1 | PASS |
| 無 keyboard trap | Tab 序列走完回到 body；dialog 以 Escape 關閉 | PASS |
| Slider 鍵盤調整 | ArrowRight 變更波長值 | PASS |
| P 以鍵盤建立／移動／清除 | **修復前無法鍵盤建立 P**；現 Enter／Space 建立、方向鍵移動、Delete 清除 | PASS（已修） |
| 引導活動純鍵盤完成 | 活動 2 以鍵盤輸入並核對 7/6 | PASS |
| 收合側欄後不 Tab 進隱藏控制 | 收合後 Tab 離開活動區 | PASS |
| Dialog 焦點進入／返回／名稱 | 進入「關閉」鈕、Escape 返回開啟鈕、accessible name 含「距離差固定」 | PASS |
| axe（模組範圍） | 0 violations（`axe.json`） | PASS（自動化，非 SR 驗收） |
| Canvas 文字替代 | canvas 設 `aria-hidden`；新增 `data-field-summary` 說明目前視圖與條件線線型，並以 `aria-describedby` 連到圖面 | PASS（機制）；可理解度待人工 |
| Live region | 清除 P 後不留舊讀值，另公告「觀測點 P 已清除」 | PASS（DOM）；實際朗讀待 VoiceOver |
| Screen reader 真實操作 | 未執行 | **NOT VERIFIED** |
| 400% 縮放、行動橫向 | 未取得真實證據 | **NOT VERIFIED** |

## 4. Keyboard / Focus Verification

證據：`tests/e2e/interference-c2.spec.ts`（`@c2`）、`docs/audits/interference-gate-c2-20261029/tab-sequence.json`。

- 發現並修復：圖面只能移動既有 P、無法鍵盤建立；清除 P 時座標讀值留舊值。
- 序列 JSON 中有三個 `name: ""` 的 input，是我的取名腳本只讀 `aria-label`／textContent 所致（這些為包在 `<label>` 內的核取方塊），axe 未報告 name 缺失；未以 SR 確認。
- 序列最後落在 `body`（回到瀏覽器介面前），屬正常。
- 未測：對 sticky 元素遮蔽焦點（本頁無 sticky 控制，僅由截圖目視，未做斷言）。

## 5. Screen Reader Findings

**NOT VERIFIED。** 本環境沒有可驅動的 VoiceOver 操作，故沒有任何實際語音輸出記錄；也不虛構。Accessibility tree 與 axe 結果不能取代。Owner 需依腳本逐項執行十個情境（標題、視圖、slider、P 說明、P 讀值、活動 1、活動切換、dialog、播放、側欄），並判斷公式朗讀與條件線文字替代是否足夠。

## 6. Contrast / Zoom / Reflow

對比（`contrast.json`，WCAG 相對亮度計算）：

| 配對 | 色值 | 比值 | 門檻 |
|---|---|---|---|
| 內文／面板 | #243244 / #fff | 13.01 | 4.5 PASS |
| 內文／頁底 | #243244 / #f5f6f4 | 12.00 | 4.5 PASS |
| 選取 tab | #fff / #29394c | 11.77 | PASS |
| 波腹線（橘）／圖面底 | #c7770b / #f7f6f1 | 3.20 | 3.0 PASS（餘裕小） |
| 波節線（青）／圖面底 | #168b8a / #f7f6f1 | 3.81 | 3.0 PASS |
| 按鈕邊框／面板 | #7b8994 / #fff | 3.59 | 3.0 PASS（原 #c5cdd3 僅 1.61，已改） |

- 兩種條件線以**實線／虛線＋文字說明＋P 的分類讀值**區分，並非只靠顏色。
- 連續色階的波場本身不逐像素要求文字對比；色階圖例對比、disabled／selected 狀態、dialog 與活動回饋的完整比值**未逐一計算**，列為人工審查。
- 模組 CSS 為固定淺色配色，程式中未見深色主題實作（未另行驗證）。

Reflow：

- CSS viewport 1280／640／390／320 寬（`reflow-viewport.json`）：整頁水平溢出皆 0，圖面長寬比 1。320 CSS px 等效於 1280 的 400%，但這是**視窗縮小，不是真實瀏覽器 zoom**。
- Safari 真實 200% 縮放截圖：`safari-zoom-200.png`，圖面與主要控制可讀可操作（目視）。
- **400% 真實縮放：無證據**；前一輪嘗試的 Chrome 流程未留下結果。NOT VERIFIED。
- Mobile portrait：既有 `@mobile` Pixel 5 測試通過。Mobile landscape：未測。

## 7. Reduced Motion

- 分類：裝飾性（CSS transition／animation）→ 已由 `prefers-reduced-motion` 規則壓到 0.01ms；科學波動（rAF 播放）→ 保留，且**預設不自動播放**，使用者按「播放」才動，可隨時暫停。
- 測試：`reducedMotion: reduce` 下載入為暫停，120ms 內幀計數不變；播放後暫停，幀計數停止。物理計算與該設定無關。
- 差異：reduced motion 下使用者主動播放時不另行降速；符合任務原則，不視為缺陷。

## 8. Firefox / WebKit Results

`tests/e2e/interference-c2-browser.spec.ts`（`PLAYWRIGHT_CROSS_BROWSER=1`，在 dev harness 上）：Chromium、Firefox、WebKit **各 1/1 PASS**。涵蓋：載入、canvas／SVG、slider、P 點擊與鍵盤、活動切換、dialog、播放／暫停、reload、resize。這是 Playwright 的 WebKit，**不等同 Safari 真機**；P 拖曳、localStorage 偏好在 Firefox／WebKit 未逐項斷言。

## 9. Lifecycle / Soak Test

- 10 分鐘連續播放（production build，headless Chromium，`soak.json`）：601 秒共 36,073 幀，約 60 fps，線性單調成長；其間多次切換視圖；暫停後幀數不再增加；無 page error。
- 前一輪中斷時的 soak.json 曾顯示幀數歸零且暫停後仍增加；該次是在 dev 伺服器上、同時編輯原始碼，推測為 HMR 重新掛載所致（推測，未獨立重現）。本輪於 production 建置、無其他負載下重跑，結果乾淨，已覆蓋該檔。
- 重複 mount／play／dispose／remount 測試通過（`interference-c2.spec.ts`），既有 lifecycle 單元測試通過。
- 未做：記憶體曲線、真實 FPS 分佈、拖曳 P 時卸載的專門測試（既有 renderer 測試涵蓋部分）。無 leak 結論，只代表未觀察到異常。

## 10. Fixes and Regression Tests

| 缺陷 | 修復 | 檔案 |
|---|---|---|
| 無法以鍵盤建立 P | Enter／Space 於中央建立；僅圖面本身接收 | `mountInterference.ts` |
| 清除 P 後座標讀值殘留 | 重設為「尚未放置 P」並公告已清除 | `mountInterference.ts` |
| Canvas 無文字替代、descriptor 未連結 | 新增場摘要文字 + aria-describedby，canvas aria-hidden | `InterferenceSimulation.tsx` |
| 按鈕邊框對比 1.61:1 | 改 #7b8994（3.59:1） | `InterferenceSimulation.tsx` |
| Focus 外框不明顯 | `:focus-visible` 3px 外框 | `InterferenceSimulation.tsx` |
| Playwright 設定 | 可選 cross-browser 專案與 outputDir | `playwright.config.ts` |

新增測試：`interference-c2.spec.ts`、`interference-c2-browser.spec.ts`、`interference-c2-soak.spec.ts`。未改科學模型。

## 11. Remaining Risks / Owner Decisions

1. VoiceOver 實測（十情境）— 必要。
2. 400% 真實縮放與行動橫向。
3. 條件線橘色對比 3.20:1 僅略過門檻；是否加深由 Owner 決定（涉及視覺取捨，未動）。
4. 色階圖例、dialog、回饋文字的完整對比盤點。
5. Production 頁面仍使用全站預設 title，無本頁 canonical（Gate C 已記錄，屬發布前項目，本輪未動）。
6. 其他模組既有失敗：`electrostatic-gate4b`、`electrostatic-gate5`、`fbd-support-removal`、`solar-layers`（及 electrostatic soak）E2E 失敗。我在乾淨的 HEAD worktree 上重跑，上述模組同樣失敗，與本次修改無關，未處理。
7. 全 repo `tsc`：僅 `db/index.ts`、`worker/index.ts` 的 Cloudflare ambient type 3 個既有錯誤，與 interference 無關。

## 12. Gate C2 Verdict

**PARTIAL。** 無 BLOCKED 條件（未發現核心不可用、重大障礙、資源洩漏或跨瀏覽器 regression）；但真實 SR 與 400% 縮放未驗，不得自行升級。

## 13. Gate C Overall Verdict Recommendation

維持 **PARTIAL**。F22 待 Owner 完成 VoiceOver 與縮放人工項目、並接受上述殘餘風險後，才可由 Owner 決定升級。

## 14. Gate D Readiness

**Not Ready。** 先完成 Owner 腳本；Gate D 另需 Owner 獨立核准。

## 附錄：實際結果

- Unit：439/439 PASS。Lint：0 errors、2 既有 warnings。Production build：PASS。
- `npm run test:e2e`（dev，`BASE_URL=http://localhost:3000`）：125 passed、7 failed、1 skipped；失敗全為上述無關模組，**interference 全數通過**。
- Production（port 3100）：`/interference` 200，`/interference-lifecycle` 404。
- Front 正式網址（唯讀，curl）：`https://kakau.tw/lab/interference` HTTP 200，無 redirect；canonical `https://kakau.tw/lab/interference/`，title「雙點波源干涉模擬｜Kakau Lab」，仍為原版。Lab registry 項目仍指向該網址；Front repo 本輪未修改。
- Notion 任務卡：**尚未更新**。草稿：Result＝Gate C2 PARTIAL；Evidence＝本報告與 `docs/audits/interference-gate-c2-20261029/`；Decision＝待 Owner 執行 VoiceOver／400% 後決定 Gate C 升級；Next Gate＝Gate D 未啟動。
- 工時：無紀錄，不估算。
