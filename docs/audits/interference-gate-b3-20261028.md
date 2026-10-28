# 雙點波源干涉 Gate B3 驗收

日期：2026-10-28
Lab branch：`feat/interference-gate-b1`
B2 起始 HEAD：`5fee6bcbeffe75dec48bbb3e15e543b0cf779c53`
Front baseline：`8cd5a1234e72ab4d3de8e800e4020e4d2d563c1e`

## Verdict

**Gate B3：PASS（本輪要求的教學與量測切片）。** 四個 Guided Activities 與 Edge/進階探索均有實際流程及 Playwright 覆蓋；測試沒有發現 StrictMode、基本鍵盤、桌面／手機流程阻塞。F21 的四個來源 modal 內容只保留了本輪必要的精簡公式/說明，F22 僅完成基本自動化可及性與操作檢查，故功能矩陣仍標示部分。這不是 F01–F23 全功能視覺／行為等價聲明，也不是 Gate C。

## Preflight：432 vs 434

差異不是 runner 統計或 skip。B2 刪除了 `tests/interference-lifecycle.test.mjs` 的 3 項測試，另新增 renderer 幾何測試 1 項，故 434 − 3 + 1 = 432。這是 lifecycle 測試覆蓋退步。本輪恢復成三個實際 renderer 資源清理案例（mount/dispose/remount、pending rAF/ResizeObserver callback、listener/pointer capture teardown），再增加 4 個活動純函數案例。當前 `npm test` 收集 **439/439**，0 skipped；相對 B2 增加 7 項，原三項 lifecycle 缺口已補回。

## 實作與決策

- 保留 B2 `mountInterference()` imperative Canvas/SVG adapter 與 `lib/science/interference.ts`；活動讀值仍透過既有科學函數，不另造計算模型。
- P 加入鍵盤步進/刪除、近條件線吸附、雙擊清除、路徑與相位、合成振幅、瞬時位移、分類及時間波形。條件線明確標成幾何相位條件；在非等振幅、距離衰減等情形不承諾零振幅。
- 四項活動保留各自的 predict/observe/check/retry 或階段流程。活動與模擬器參數、時間、P 分開存放；參數重設不清除活動完成進度。活動使用原模型條件，非課本設定下有明確限制說明。
- 增加課本線數提示/邊界形狀 helper 與 Front 對應的解析近線吸附；靜態公式透過現有 MathJax 元件呈現，動態數值用文字/輸出更新，不在每幀 typeset。
- 增加活動側欄收合、投影模式、dialog 焦點進入與關閉後回復、slider 名稱、適度 live feedback。未建立全站教學框架或改寫 renderer。

## F01–F23 矩陣更新

| ID | B3 狀態 | 證據/差異 |
|---|---|---|
| F01 | 完整 | Canvas 瞬時位移；見 B2 renderer E2E |
| F02 | 完整 | 強度視圖；沿用 B2 四視圖切換 |
| F03 | 完整 | 合成振幅視圖 |
| F04 | 完整 | 合成相位視圖 |
| F05 | 完整 | SVG 幾何條件線與邊界情形 |
| F06 | 完整 | SVG 波峰/波谷及時間更新 |
| F07 | 完整 | λ、d 控制即時更新 |
| F08 | 完整 | A₁/A₂、φ₁/φ₂ 控制與分類邊界提示 |
| F09 | 完整 | v=fλ 聯動；頻率改動時波長按範圍夾限 |
| F10 | 完整 | 距離衰減沿用科學模型；幾何線不誤稱零振幅 |
| F11 | 完整 | 播放、暫停、時間重設；dispose 清除動畫 |
| F12 | 完整 | t/T scrub，靜態條件線不隨時間位移 |
| F13 | 完整 | 點選、拖曳、吸附、雙擊移除、讀值同步 |
| F14 | 完整 | P 方向鍵/Shift 步進及 Delete/Backspace/Escape 清除；不攔其他快捷鍵 |
| F15 | 完整 | 距離/差值/相位/振幅/瞬時位移/分類/波形 |
| F16 | 完整 | 活動一 place→explore→conclude→done，中心相長/相消觀察與規律核對 |
| F17 | 完整 | 先預測、答案遮蔽、課本條件鎖定、7/6、提示/核對/重試 |
| F18 | 完整 | 先預測再切換反相並觀察中央條件，解釋非零振幅例外 |
| F19 | 完整 | 先預測再播放波峰，對比隨時間外移的波峰與固定條件線 |
| F20 | 完整 | d/λ=2.9、3、3.1 缺席/退化/雙曲線探索 |
| F21 | 部分 | 側欄、投影、dialog 及焦點進出有實作；來源四個 modal 的完整長篇內容與 localStorage 偏好保存未移植 |
| F22 | 部分 | 名稱、dialog 焦點、鍵盤、axe 嚴重違規、手機無溢位已測；無螢幕閱讀器人工測試、reduced-motion 與完整 WCAG 驗收 |
| F23 | 完整 | 模擬器重設清參數/P/time，但保留活動進度，與 Front 既有行為一致 |

完整功能定義見 Gate A 原矩陣；本表說明 B3 後 Lab 現況。

## 科學與互動驗收

- Gate A G01–G10 科學 golden cases 保留並由既有科學 unit tests 覆蓋；活動測試特別檢查中心相長/反相條件、線數 7/6 與 3λ 的邊界形狀、P 觀察讀值、距離衰減的非零振幅語意、時間波形及靜態線分離。沒有複製 science 計算式。
- Unit：`npm test` 成功，production build 成功，**439/439 pass、0 fail、0 skip**。
- Lint：成功，0 errors；僅原有 `components/StandardAtmosphereLab.tsx:248` 兩項 hook dependency warnings。
- Playwright：B3+B2 renderer+lifecycle **6/6 pass**，包含桌面活動端到端、axe、StrictMode replay/unmount/remount、renderer 與手機互動/無溢位。
- TypeScript：`npx tsc --noEmit --pretty false` 仍被既有 Cloudflare ambient types 缺失阻擋：`cloudflare:workers`、`Fetcher`、`D1Database`。沒有干涉模組新增錯誤。
- Build 有既有大型 chunk 提示，build 本身成功。
- 用 production `vinext start` 本機驗證 `/interference-lifecycle` 回 404，開發測試入口未公開。
- Lifecycle unit 測試重新涵蓋 mount/dispose/remount、卸載後延遲 observer callback 與動畫/listener/pointer 清理；Playwright 覆蓋真實 React StrictMode 與再次掛載。沒有測試在拖曳或 dialog 開啟中發生卸載的真瀏覽器競態，該情境留為殘餘驗收風險。

## 證據檔案

- `tests/interference-lifecycle.test.mjs`
- `tests/interference-activities.test.mjs`
- `tests/e2e/interference-b3.spec.ts`
- `models/interference-activities.ts`
- `models/interference-snap.ts`
- `docs/audits/interference-gate-b3/activity-count-desktop.png`
- `docs/audits/interference-gate-b3/activity-time-desktop.png`
- `docs/audits/interference-gate-b3/activity-count-mobile.png`

## Front 差異、風險與下一步

Lab 以既有 Lab 版面容納模擬器，沒有複製 Front 的整套品牌導覽、側欄精緻互動與所有 dialog 長文。教學次序、答案遮蔽/回饋、數值語意及核心模擬行為已移植。F21/F22 的缺口與缺少螢幕閱讀器人工檢查是主要差異；尚未宣稱完整功能等價。

建議 Gate C 最小切片：以 Front baseline 逐項核對 F01–F23（先補 F21 modal/偏好與 F22 reduced-motion/screen-reader），針對 G01–G10 做 Lab 實際讀值比對，完成拖曳/dialog 中卸載競態、production 開發入口隔離與桌面/手機對照；Owner 再決定公開路由/preview 驗收。Gate C 尚未開始。

工時：未追蹤，沒有可靠實際時數。

Git branch/HEAD/工作樹及 commit：以本文件建立時的最終 Git 狀態為準，詳見本輪交付回報；尚未 push、PR、merge 或 deploy。
