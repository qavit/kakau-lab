# 雙點波源干涉遷移 Gate C 驗收

日期：2026-10-29（Asia/Taipei）｜來源 Front `8cd5a1234e72ab4d3de8e800e4020e4d2d563c1e`｜Lab 起始 `3deb6eedfad68faca2f92366b9a195868bbf218a`

## 1. Executive Summary

**Gate C：PARTIAL。** 科學純函數與主要活動流程有重新執行的測試證據；F21 四個教學 dialog 與兩項儲存偏好已補齊。F22 尚缺螢幕閱讀器、鍵盤完整巡檢、對比與 200%/400% reflow 的人工證據，長時間效能與其他瀏覽器也未測。這些差異未經 Owner 接受，不能視為 Gate D 發布許可。

本報告的 PASS 指本輪已實際檢查的範圍；程式存在但未操作的部分列為未驗證。未執行真實學生學習成效研究。

## 2. Verification Environment / Git SHA

- Lab：`feat/interference-gate-b1`；開始前 HEAD `3deb6eedfad68faca2f92366b9a195868bbf218a`，工作樹 clean，與 B3 一致。Front：`feat/digital-stage-b-entitlement`，HEAD 與 Gate A baseline 同為 `8cd5a1234e72ab4d3de8e800e4020e4d2d563c1e`，工作樹 clean。
- 依據：Gate A 本地稽核、B1/B2 Notion 記錄、B3 報告與原任務卡 Gate B Owner PASS。Front 原始碼的模型與 Lab 模型 `diff -u` 無差異；這只能證明同源，正確性仍靠解析解與不變量測試。
- `npm test`（最終修復後重新執行）：build PASS、439/439 unit PASS、0 skip。新增 G08 邊界斷言的 targeted unit 11/11 PASS。最終全量日誌在證據目錄。
- `npm run lint`：0 error、2 個既有 `StandardAtmosphereLab.tsx:248` warnings。全 repo `tsc --noEmit` 失敗，只有 `db/index.ts:1 cloudflare:workers`、`worker/index.ts:6 Fetcher`、`:7 D1Database` 三項，無 Interference 檔案錯誤；未宣稱全 repo 型別通過。
- Chromium desktop 1440×1000、Pixel 5 mobile viewport；本地 dev。初次 runner 的 `127.0.0.1` 無法連到只在 `localhost` 監聽的伺服器，因此改用 `BASE_URL=http://localhost:3000`。詳細結果在同名證據目錄。
- 最終 Playwright 8/8 PASS；F21 內容／偏好補強後 focused 2/2 PASS。最初兩輪的失敗分別是測試伺服器位址及 C-03 真實互動缺陷，均已重現並處理。
- Production build 後本機 `PORT=3100 npm run start`：`GET /interference` 200（30129 bytes），`GET /interference-lifecycle` 404。production HTML 尚使用全站預設 title，沒有本頁 canonical；SEO 待 Gate D。

## 3. F01–F23 Functional Parity Matrix

證據代號：`S` = `tests/interference-science.test.mjs`；`R` = `tests/e2e/interference-renderer.spec.ts`；`A` = `tests/e2e/interference-b3.spec.ts`；`L` = `tests/e2e/interference-lifecycle.spec.ts`；`C` = `tests/e2e/interference-gate-c.spec.ts`；`M` = 本輪閱讀 Front 與 Lab 原始碼。這些測試的本輪執行日誌保存在 `docs/audits/interference-gate-c-20261029/`。前輪 Gate A/B 截圖只作視覺基準，不冒充本輪操作。

| ID | Front 行為 | Lab 行為 | 驗證方法 | Evidence | Verdict |
|---|---|---|---|---|---|
| F01 | 瞬時位移場 | Canvas ψ 場 | 時間切換與畫素 | R,S | PASS |
| F02 | 強度場 | Canvas \|C\|² | 時間不變性 | R,S | PASS |
| F03 | 合成振幅場 | Canvas \|C\| | 四視圖操作 | R,S | PASS |
| F04 | 合成相位場 | Canvas Φ | 四視圖操作、低振幅遮罩碼審 | R,M | PASS |
| F05 | 相長／相消線 | SVG 幾何條件線 | 線數／邊界數值與畫面 | S,R,A | PASS |
| F06 | 波峰／波谷圓 | SVG 動態圓 | 播放時觀察 | A | PASS |
| F07 | λ、d sliders | 同範圍控制 | 端點與連動 | R,S | PASS |
| F08 | A、φ sliders | 進階控制 | 反相與不等振幅 | A,S | PASS |
| F09 | v=fλ | 同聯動與夾限 | 控制 E2E | R | PASS |
| F10 | 距離衰減 | 1/√r；條件線仍為幾何 | 非零殘餘振幅 | S,R | PASS |
| F11 | 播放／暫停／歸零 | rAF 控制 | 操作及卸載 | R,L | PASS |
| F12 | t/T scrub | 同控制 | 靜態場／動態場分離 | R,S | PASS |
| F13 | P 點選／拖曳／吸附／雙擊 | 同操作 | 桌面與 touch | A,R | PASS |
| F14 | P 鍵盤移動／清除 | 箭頭與刪除鍵 | 焦點後操作 | A | PASS |
| F15 | P 距離／相位／振幅／波形 | 同讀值 | 圖像與數值 | A,S | PASS |
| F16 | 活動一：觀測點規律 | place→explore→conclude | 完成流程、錯答回饋碼審 | A,M | PASS |
| F17 | 活動二：線數預測 | 遮蔽、鎖定、核對、重試 | 7/6 與重試 | A,S | PASS |
| F18 | 活動三：反相中央線 | 預測後切換 | 中央相消 | A,S | PASS |
| F19 | 活動四：波動／線靜止 | 預測、觀察、核對 | 波峰與條件線 | A,S | PASS |
| F20 | 進階：2.9/3/3.1λ | 缺席／半直線／雙曲線 | 三個 preset | A,S | PASS |
| F21 | 4 長文 dialog、側欄與提示偏好 | 已補內容與兩項 localStorage | 來源比對、reload、焦點 | C,M | PASS |
| F22 | 響應式與輔助操作 | 基本名稱、鍵盤、live region | axe／touch 部分；人工未完 | A,C,M | NOT VERIFIED |
| F23 | 模擬重設但保留活動進度 | 同語意 | 重設後活動仍完成 | A,R | PASS |

F21 的 Front 偏好鍵為 `kakau-lab-interference-sidebar`（`open`/`closed`）與 `kakau-lab-interference-plot-hint`（`dismissed`）；沒有版本鍵或清除偏好的 UI。Lab 沿用鍵名與值，storage 不可用時退回預設。desktop 預設側欄開、mobile 預設關；重設模擬器不清除偏好或活動進度。Dialog 數學以靜態 MathJax 表示，動態讀值仍用 `textContent`，未加入 HTML 注入路徑。來源反相解說的 `|A₁−A₂|` 已限定為無衰減情境，避免衰減時誤述。

## 4. G01–G10 Scientific Verification

| Case | 本輪證據 | Verdict |
|---|---|---|
| G01 同相 | 中央 \|C\|=2、I=4；解析相量疊加；S | PASS |
| G02 d=3λ | 7/6、±3 退化線；S/A | PASS |
| G03 中央線 | r₁=r₂、Δr=0；S | PASS |
| G04 反相 | 中央 \|C\|≈0、相消 level；S/A | PASS |
| G05 不等振幅 | \|C\|=0.5、I=0.25；S | PASS |
| G06 距離衰減 | Δr=.5、Δφ=π、\|C\|≈.13849824498 非零；S | PASS |
| G07 時間 | ψ=-2/0/+2、\|C\|固定；播放／暫停／scrub 與條件線；S/R/A | PASS |
| G08 邊界 | 2.5、3 及 ±2e−9 的線數和 level 一致；targeted S 11/11 | PASS |
| G09 合法極值 | 24 組 field finite、端點 Canvas 操作；S/R | PASS |
| G10 Reset | λ=1、d=2、A=1、φ=0、無衰減、暫停、清 P，活動進度保留；R/A | PASS |

同源模型不是獨立的物理正確性證明；上述解析值、有限性與時間不變量提供獨立檢查。未發現共通科學缺陷。

## 5. Guided Activities QA

桌面 Chromium 依序完成觀測點、線數、反相、時間與進階邊界探索；已有錯誤選項與核對回饋、重試及 reset 保留進度的測試／碼審。活動二答案在鎖定前遮蔽，計數後才揭露 7/6。學習者是否真正理解，**NOT VERIFIED**；需要教師／學生可用性實測。來源長文已放回 dialog，沒有移到 Notes。

## 6. Accessibility Audit

- 自動化：Chromium axe 無 serious/critical violations；slider、活動入口有名稱；dialog Escape 與焦點回到開啟鈕；手機 touch 可開側欄。這不構成 WCAG 2.2 AA 全面通過。
- 碼審：P 有方向鍵、Shift 步進與刪除；`aria-live` 讀值與回饋；Canvas 外有 P 數值文字。`prefers-reduced-motion` 停用 CSS 動畫／轉場，模擬播放仍由使用者控制且初始暫停。
- **NOT VERIFIED**：實際螢幕閱讀器語音順序與數學朗讀、完整 Tab/focus order、所有色彩對比、200%/400% zoom 與 reflow、Canvas 圖樣的等價文字敘述、長時間 reduced-motion 使用、全 WCAG 2.2 AA 人工判斷。這是 F22 及 Gate C PARTIAL 的主要原因。

## 7. Browser / Lifecycle / Performance Results

- Chromium desktop/mobile：本輪 E2E 8/8 PASS，F21 focused 再跑 2/2 PASS。未跑 Firefox/WebKit；未跑 browser back/forward 的完整狀態恢復流程。
- 真瀏覽器 StrictMode replay、播放與拖曳中卸載、late ResizeObserver callback、重新掛載由 L 涵蓋；R 檢查暫停後 frame 停止。沒有觀察到未清理 loop 或 disposal 後 frame 增長。
- 本輪未做有量測環境的 FPS、記憶體 soak 或 React render count；因此長時間資源洩漏、背景頁面節流及高 DPR 長時間表現 **NOT VERIFIED**。沒有虛構 benchmark。

## 8. Visual and Math Rendering Differences

Front Gate A 7 張基準圖、Lab B2/B3 圖與本輪 dialog／手機圖可比。Lab 使用不同站點版面、顏色及控制排布，屬 cosmetic；操作相關的側欄預設與提示已補回。四種場、條件線、活動順序和關鍵數值沒有在已測畫面中出現科學或教學退化。尚未完成逐一人工視覺巡檢與 400% zoom；這些差異沒有標成 Owner accepted。

公式採靜態 MathJax 節點，動態數值用文字更新；沒有動態 `innerHTML`。本輪未以螢幕閱讀器驗證數學替代語音，也未量測 layout shift。

## 9. Defects Found and Fixes Applied

| ID | 重現／來源預期 | 修復 | 回歸證據 |
|---|---|---|---|
| C-01 | Front 四段 dialog 長文與公式；Lab 原只留摘要 | `InterferenceDialogs.tsx` 移植教學推導與標題 | C、M |
| C-02 | Front 兩項 localStorage 偏好在 reload 後恢復；Lab 缺少 | 沿用鍵名和值、桌面／手機預設與提示關閉 | C |
| C-03 | 新增提示區關閉鈕被 plot pointer capture 接走 | pointerdown 忽略提示區 | C |
| C-04 | B3 只有 dev harness，production `/interference` 不存在 | 加入本地 branch 的正式 route shell | production 200／harness 404 |

## 10. Remaining Gaps / Accepted Differences

Owner **尚未接受**任何本輪新差異。F22 人工驗收、其他瀏覽器、完整視覺巡檢、長時間性能與學習成效仍待驗。Production `/interference` 的頁面 metadata、canonical、OG 與 JSON-LD 尚未按新路由配置；這些屬 Gate D 待辦，不在本輪修改。

## 11. Gate C Verdict

**PARTIAL**：F01–F23：22 PASS、1 NOT VERIFIED、0 FAIL；G01–G10：10 PASS、0 NOT VERIFIED、0 FAIL。這些數字以本報告列出的實測範圍為限。F22 的完整人工證據缺口使 PASS 條件未成立；不得把 PARTIAL 當作發布許可。

## 12. Gate D Readiness and Handoff

本地 route 可 smoke，harness 在 production 404；Registry 仍指 Front。Gate D **未 Ready**：先補 F22 人工驗收與必要修復、確認 production metadata／canonical／OG／JSON-LD、Front redirect（含尾斜線和 query string）、sitemap、搜尋／外鏈基線、rollback。Owner 需審核未驗證事項並另行核准 Gate D。Front 正式頁、Registry、redirect、canonical、sitemap 均未修改；未 push、PR、merge 或 deploy。沒有可靠本輪實際工時紀錄，不填工時。
