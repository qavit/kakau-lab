# Interference Gate D（D0–D1）— 發布準備、跨站切換與驗收

日期：2026-10-29　範圍：發布前稽核與準備。**未 merge、未 deploy、未轉址。Production cutover：HOLD。**
**Gate D0/D1 Verdict：PARTIAL**（Lab 準備就緒；Front 轉址的 Vercel preview 實測因 Deployment Protection 為 NOT VERIFIED）。

## 1. Preflight & Commit Verification

| 項目 | 結果 |
|---|---|
| Lab 本地 HEAD（開始時） | `16cb61f`，分支 `feat/interference-gate-b1`，領先 origin 1 commit；遠端仍為 `6b24317`。`16cb61f` 存在，與 `6b24317` 差 10 檔（`mountInterference.ts` +12/-2、C4 報告、`interference-c4.spec.ts` +39、截圖）。 |
| 發布候選 | 新分支 `feat/interference-gate-d`（自 `16cb61f` 切出），commit `b585831` + 本報告 commit；已推送。**包含 `16cb61f`。** 相對 `main`（`ae9b3a9`）共 20+ commits：Gate B–C4 整個移植**尚未進過 main，也沒有既有 PR**。 |
| Lab working tree | 僅未追蹤 `test-results-c2*/`；跑 E2E 時測試會覆寫已提交的 `docs/audits/**` 截圖（見 §11），該些修改未提交。 |
| Front | 主 checkout 為 detached HEAD `6837772`（A-Flow gate1 候選，非 main）— 未動。另有 3 個既有 worktree（aflow-gate1、inquiry-closed、intake）— 未動。新 worktree `~/Documents/Kakau-worktrees/front-interference-redirect`，分支 `feat/interference-lab-redirect`，自 `origin/main`（`9f5678b`）切出，commit `7ec0048`，已推送。 |
| 衝突的其他工作 | Front open PR #73、#74、#75 皆 Draft，未觸及 `lab/interference`、`vercel.json`、`routes.ts` 的該行；合併時 `routes.ts` 可能有一般性文字衝突，未測。Lab 另有 `codex/lewis-studio-poc` 分支（獨立）。 |
| 規範 | Lab `AGENTS.md`：Conventional Commits、本地 identity `qavit`（已驗 author／committer）、發布前 `npm run lint`、`npm test`。Front `docs/ROUTE_GOVERNANCE.md`：redirect 屬 Owner 決策；registry `index` 必須與頁面 noindex 一致。 |

## 2. Owner Sign-off Status

- **C4 Owner 簽核：不存在。** Notion 任務卡明載「Owner 最後操作腳本未回報完成」；Gate C 整體未 PASS。
- 殘餘風險（VoiceOver、真實 400% zoom、真機、MathJax 失敗 fallback、F22 完整 WCAG）：**未經 Owner 明確接受**。
- 授權範圍：僅 D 準備。merge、production deploy、Registry 公開切換、Front 轉址皆未授權。

## 3. Deployment Architecture

**Lab**：Next 16 + vinext → 單一 Cloudflare Worker `kakau-lab`（`wrangler.jsonc` 為唯一設定，assets 來自 `dist/client`）。CI（`ci.yml`）只跑 lint/test/build，不部署。CD（`deploy.yml`）**僅 `workflow_dispatch`、僅 `main`**：lint+test → 確認 main 未前進 → `npm run deploy`（predeploy 複製 MathJax）→ smoke → job summary 記 SHA。**沒有 PR preview 部署**；production 與預覽的區分只有「是否手動部署 main」。`lab.kakau.tw` 目前 `/interference` 回 404（實測）。
- 本次補強：smoke 加入 `/interference`（原本只測 `/`、`/projectile`、`/electrostatics`）。
- indexability：根 layout 無 robots；未列公開的模型各頁自帶 `noindex`。本次新增 `proxy.ts`：非 `lab.kakau.tw` 主機（workers.dev、localhost）一律回 `X-Robots-Tag: noindex, nofollow`，避免任何預覽網域與正式頁競爭。
- 其他公開頁的慣例：`alternates.canonical` 相對路徑 + `metadataBase`、`socialMetadata()`；**其他模型頁均無 JSON-LD**，本頁是 Lab 第一個。Organization 以 `@id: https://kakau.tw/#organization` 引用（Front 的跨站身分契約）。
- assets：`/mathjax/tex-svg.js`、`/og/*.png` 由 Workers Assets 提供，build 產物內確認存在；本機 production 回 200、`Cache-Control: public, max-age=3600`。

**Front**：Astro 5、`output: "server"`、`@astrojs/vercel`、Vercel 專案 `kakau`（`prj_tpCjfa9ZGmlNVzVvM668Hyj0Lk7K`）。原先**沒有 `vercel.json`**；`middleware.ts` 對預渲染頁直接 `next()`、只管 `/student`。舊頁 `prerender = true`。Production 實測：`/lab/interference` 與 `/lab/interference/` **皆 200**（靜態檔，`server: Vercel`）。`astro build` 產生的 `.vercel/output/config.json` 第一條路由為 `{"handle":"filesystem"}` → **證實：Astro `redirects` 設定（輸出為 filesystem 之後的路由）無法覆蓋已預渲染的 `lab/interference/index.html`**，故改用 `vercel.json`（平台層，應在 filesystem 之前）。Sitemap：`src/pages/sitemap.xml.ts` 由 `src/data/routes.ts` 的 `sitemap` 旗標生成。canonical 來自 `BaseLayout` 的 pathname。

## 4. Content & SEO Migration Matrix

| 原 Front 內容 | 處置 | 位置 |
|---|---|---|
| 互動模擬器、五項引導活動、P 量測 | 已由 Lab 模擬器涵蓋 | `InterferenceSimulation` |
| 四個教學 dialog（雙曲線、線數、反相、時間） | 已涵蓋 | `InterferenceDialogs` |
| 四段「概念摘要」（條件線、線數、同調≠同相、波動圖樣不動） | **保留為可索引文字** | 新 `InterferenceSummary.tsx`（server render，Unicode 公式，不需 MathJax／hydration） |
| 「上課投影時」使用說明 | 保留 | 同上 |
| Streamlit 備援入口 | 保留為連結 | 同上（`rel=noreferrer`） |
| `LearningResource` JSON-LD | 保留並**改寫**：`@id` = `https://lab.kakau.tw/interference#interactive-lab`、`url` 同、`inLanguage zh-Hant`、`educationalLevel 高中`、`provider` = Organization `@id` 引用 | `lib/labs/interference-seo.ts` |
| 專屬 OG 圖（1200×630） | 複製到 Lab `public/og/`；og:image 為 `https://lab.kakau.tw/og/…`（正式網域可存取需上線後驗） | 同上 |
| title／description | title「雙點波源干涉模擬｜Kakau Lab」；description 沿用原文；canonical `https://lab.kakau.tw/interference` | `page.tsx` |
| Front 全站 header/footer、KaTeX 預渲染版式 | 刻意淘汰（品牌版型與 KaTeX，Lab 使用共用 MathJax） | — |

JSON-LD 不含任何 `kakau.tw/lab/` 字樣（有測試）。已知差異：Front 的 `@id` 與 canonical 帶結尾斜線，Lab 不帶（沿用 Lab 全站慣例，`/interference/` 於 Lab 會 308 → `/interference`）。

## 5. Lab Changes（`b585831` + 後續）

`app/interference/page.tsx`（metadata、canonical、JSON-LD、摘要）、`components/interference/InterferenceSummary.tsx`、`lib/labs/interference-seo.ts`、`lib/labs/registry.ts`、`proxy.ts`、`public/og/kakau-interference-lab.png`、`tests/registry.test.mjs`、`tests/rendered-html.test.mjs`、`tests/e2e/interference-c3-visual.spec.ts`、README／architecture／deployment 文件、`deploy.yml` smoke。

**需 Owner 知悉的測試意圖調整**：C3 桌面測試原本斷言「整頁不捲動」。加入摘要後頁面變長，改為斷言「模擬器本體 `bottom ≤ viewport+40`」。首屏仍是完整的無捲動模擬器，摘要在其下方（與 Front 原版相同的配置）。

## 6. Front Redirect Changes（`7ec0048`）

- `vercel.json`：兩條 `permanent: true`（308）規則，`/lab/interference` 與 `/lab/interference/` → `https://lab.kakau.tw/interference`；無萬用字元，不影響其他 `/lab/*`、`/resources` 等；單一跳轉，目的地主機為 `lab.kakau.tw`（Lab 不會轉回 kakau.tw，無 loop）。
- `routes.ts`：舊路由改 `legacy`、`index:false`、`sitemap:false`；舊頁加 `noindex`。→ Front sitemap 不再輸出舊頁。
- 內部連結改為新網址：apply、environment、faq、terms、tutoring、PortfolioWeb、PhysicsPortfolio（共 7 處）。這些**隨 Front 部署（Step 6）一起上線**，因此不會在 Lab 就緒前指向 404。
- 原實作（頁面、元件、`lib/labs/interference/*`、測試、e2e）**全部保留**。
- 新增 `tests/interference-redirect.test.mjs`（4 項）。
- Query string：Vercel `redirects` 預期會保留原 query（**未實測**，見 §8）。

## 7. Registry / Sitemap / Metadata Verification（本機 production build，非 Cloudflare）

- Model 08：`implementation: { app: "kakau-lab", route: "/interference" }`；id、編號 08、title、topics、concepts、representations、maturity `beta`、visibility `public` 皆不變（測試斷言）。其他模組未動。
- 目錄頁 08 卡片 `href="/interference"`，不含 `kakau.tw/lab/interference`（測試）。
- Sitemap 由 `catalogLabs()` 自動含 `/interference`；不含舊網址；既有「每個 sitemap 路由自帶 self canonical 與專屬 og:title」測試自動涵蓋新頁。
- 頁面：title、description、canonical、og:*、twitter:card、JSON-LD 可 `JSON.parse` 且欄位一致；無 `noindex`（正式主機）；h1 唯一。
- `/interference/` → 308 `/interference`；`/interference?utm=x` → 200。

## 8. Preview Verification

| 項目 | 狀態 |
|---|---|
| Lab 預覽 | **無 PR preview 機制。** 以本機 production build（`vinext start`）驗證；`wrangler deploy --dry-run` 打包成功（81 個 assets，3867 KiB）。**Cloudflare 實際環境：NOT VERIFIED。** |
| Lab 本機 production：`/interference` 200、MathJax 88 個 SVG 容器、點擊放置 P 後量測板正確、摘要可見、五個活動分頁 | PASS（瀏覽器實測） |
| Front Vercel preview 已建置（PR #76 → `kakau-git-feat-interference-lab-redirect-qavits-projects.vercel.app`，Preview 環境，不影響正式網域） | 部署成功 |
| Front 轉址、尾斜線、query、其他 `/lab/*`、sitemap 的 Vercel 實測 | **NOT VERIFIED**：preview 啟用 Vercel Deployment Protection，所有路徑回 302 到 `vercel.com/sso-api`，需 Owner 登入或提供 bypass。我未嘗試繞過。本機 build 不能代替 Vercel 實測。 |

**2026-10-29 補充（`vercel curl` 嘗試，仍 NOT VERIFIED）：** Vercel CLI 54.14.0 支援 `vercel curl`，已登入為 `qavit`，PR #76 的 Preview 為 `dpl_kzkFHxz6Ggv1FxBeLBy8de5kEtYg`（Ready，target preview，`kakau-ehr9nkei0-qavits-projects.vercel.app`）。worktree 原未連結專案，`vercel curl --yes` 會嘗試新建專案（403，已中止，未建立任何東西），改以本機 `.vercel/project.json`（gitignored，指向既有專案 `kakau`）連結。之後 `vercel curl` 需要自動建立 Protection Bypass 密鑰，失敗（權限不足）。依指示未修改 Deployment Protection，也未嘗試其他繞過。解法：Owner 在專案設定自行產生「Protection Bypass for Automation」密鑰，於自己的終端機以 `VERCEL_AUTOMATION_BYPASS_SECRET` 環境變數執行 `vercel curl <path> --deployment dpl_kzkFHxz6Ggv1FxBeLBy8de5kEtYg -- -s -o /dev/null -D -`（不加 `-L`）並回貼輸出，或授權我使用。

Owner 取得存取後執行（將 `$P` 換成 preview 網域，bypass 以 `x-vercel-protection-bypass` header 提供）：
```bash
P=https://kakau-git-feat-interference-lab-redirect-qavits-projects.vercel.app
for u in /lab/interference /lab/interference/ "/lab/interference?utm_source=x&s=1" "/lab/interference/?a=1" /lab /resources; do
  echo "== $u"; curl -s -o /dev/null -D - "$P$u" | grep -iE '^(HTTP|location)'; done
curl -s $P/sitemap.xml | grep -c lab/interference   # 期望 0
```
期望：前四項 `308` 與 `location: https://lab.kakau.tw/interference`（query 是否附帶需確認；若 Vercel 不自動保留，須在規則中以 `:path`／query 方式處理，再回報）；`/lab`、`/resources` 不是 308；計數 0。**若第一項仍回 200（vercel.json 沒蓋過靜態檔），Step 6 不得進行**，改方案（例如把舊頁 `prerender=false` 並由 middleware 轉址，或移除舊頁檔）需另行決策。

## 9. Production Cutover Runbook（本輪不得執行）

1. 確認 Owner C4 簽核與殘餘風險接受紀錄（書面）。
2. 確認 Lab PR #29、Front PR #76 的 CI 綠、Front preview 轉址實測通過（§8 腳本）。記錄兩邊 base SHA。
3. 取得 Owner 明確 Production Go。
4. Lab：合併 PR #29 → `main`（記 SHA；此時尚無部署）；GitHub → Actions → Deploy → `main`。Workflow 會 lint/test/build/smoke（含 `/interference`），記錄 job summary 的 SHA 與時間。
5. 驗證 `https://lab.kakau.tw/interference`：HTTP 200；canonical、title、og:image 可直接開啟（`/og/kakau-interference-lab.png` 200 image/png）、JSON-LD 可解析；`/mathjax/tex-svg.js` 200；P 放置、五項活動、進階參數、MathJax；手機 viewport；首頁 Model 08 入口為 `/interference`；`/sitemap.xml` 含新頁；回應**無** `X-Robots-Tag: noindex`。**任一失敗 → 不得進入步驟 6。**
6. 確認新頁穩定（建議至少一個觀察窗口）後，合併 Front PR #76 → Vercel 自動部署 production（Front 無手動閘門，故合併即上線）。記錄 SHA 與時間。
7. 驗證：`curl -sI https://kakau.tw/lab/interference` 與帶斜線、帶 query 皆為單次 308 → 新頁 200；無 loop；`https://kakau.tw/sitemap.xml` 不含舊頁；`/lab/other`、`/resources`、`/tutoring` 正常；Front 站內連結指向新頁。
8. 上線後（D3）：Search Console 保留遷移前基準（`kakau.tw/lab/interference` 的點擊／曝光／索引）、為 `lab.kakau.tw` 提交 sitemap、對新頁要求索引；觀察至少四週的索引、404、redirect 錯誤。這只是單一頁面跨子網域搬移：**不做整站 Change of Address**，也不承諾排名無波動。

## 10. Rollback Plan

| 情況 | 觸發 | 決策者 | 動作 | 驗證 |
|---|---|---|---|---|
| A. Lab 未發布 | 任何 Gate 未過 | Owner | 不合併、不部署；Front 舊頁維持服務（目前即此狀態） | `kakau.tw/lab/interference` 200 |
| B. Lab 已發布、Front 未轉址 | 步驟 5 失敗或事後 P1 | Owner | 先修復新路由；或 `npx wrangler rollback <version-id>`（`npx wrangler deployments list` 取前一版）；Front 舊頁不受影響。Registry 指回舊站需另開 revert commit 並再部署（因 Registry 隨 Lab 部署） | 目錄頁 08 連結、`/interference` 狀態 |
| C. Front 已轉址 | 新頁 P1 且無法快速修 | Owner | 順序：①優先修復／rollback Lab，維持新網址可用；②必要時 revert Front PR #76 merge commit（還原舊頁索引、sitemap、站內連結，移除 `vercel.json` 規則）並部署；③Lab Registry 如需指回舊站，另行 revert。 | 舊 URL 200 且 canonical 為舊址 |

回退 SHA：Lab 為部署前線上版本（`wrangler deployments list` 的前一 version，並記錄 main 前一個 SHA）；Front 為 PR #76 合併前的 `main` SHA。**無法立即恢復的行為**：308 為永久轉址，瀏覽器與代理可能長時間快取，移除規則後部分使用者仍會被帶到新網址；搜尋引擎重新處理需時。因此 C 情境首要是讓新網址持續可用。不建立長期並行的第二套模擬器服務。

## 11. Remaining Risks

1. **C4 Owner 簽核與殘餘風險接受缺失**（硬性阻擋 cutover）。
2. **Front vercel.json 的 Vercel 實測缺失**（preview 受保護）。靜態檔優先權為關鍵未知數。
3. Lab 沒有預覽環境：Cloudflare 上的實際行為（headers、assets、308）只能在正式部署後驗證；步驟 5 即是閘門。
4. Lab 這次合併會一次帶入整個 Gate B–C4 移植（20+ commits，153 檔）——PR #29 的 diff 很大，建議審查者以 `16cb61f..HEAD` 看 Gate D 增量。
5. 內容：公式在摘要中為 Unicode（非 MathJax）；Lab 全站頁無 JSON-LD 先例；`@id` 無結尾斜線與 Front 舊值不同（外部系統若用舊 `@id` 合併實體，需靠 301 與 Search Console 處理）。
6. 既存問題（非本次 regression）：全 repo `tsc` 3 個 Cloudflare ambient 型別錯誤；`StandardAtmosphereLab.tsx` 2 個 lint warning；Front 的 attribution 單元測試有 3 項在本 worktree 失敗（`application-handler`／`attribution`，與干涉無關，主 checkout 亦有 1 項失敗，未查根因）；dev server 在 3000 埠被其他程序占用時 Playwright 預設 webServer 會逾時（改用 `BASE_URL`）。
7. 工作樹污染：Interference E2E 會覆寫已提交的 `docs/audits/**` 截圖與 `tab-sequence.json`（約 40 個檔）。我無權限還原（被擋），保留為未提交修改，**未納入任何 commit**；請 Owner 以 `git checkout -- docs/audits` 還原。
8. 未驗證：VoiceOver、400% zoom、真機、MathJax fallback、Firefox/WebKit（本輪未重跑，C4 回報 24/24）。
9. Front 站內連結的 UTM／跨站歸因（`ATTRIBUTION_CROSS_SITE.md`）未檢查是否需要對 `lab.kakau.tw` 傳遞。

## 12. Go / No-Go Recommendation

**D0/D1：PARTIAL。Production cutover：NO-GO（HOLD）。**
解除條件：(1) Owner C4 簽核與殘餘風險接受；(2) Front preview 轉址實測通過（需 Owner 提供 Vercel 存取）；(3) Owner 對 Lab 先、Front 後的順序給出獨立 Production Go。

## 測試證據

| 項目 | 結果 |
|---|---|
| Lab unit | 441/441（439 + 新增 2：Interference 頁 SEO、非正式主機 noindex） |
| Lab Interference E2E（dev server，desktop+mobile 專案） | 44/44（C3 版面斷言已調整，見 §5） |
| Lab production server 上的 E2E | 32 通過／12 失敗，**全部**因 `/interference-lifecycle` 開發 harness 在 production 為 404（設計如此）；非 regression |
| Firefox+WebKit C4 子集 | NOT RE-RUN（沿用 C4 回報 24/24） |
| Lab lint | 0 errors、2 既有 warnings |
| Lab tsc | 3 個既有 Cloudflare 型別錯誤，無新增 |
| Lab build／`wrangler deploy --dry-run` | PASS |
| Front `astro check` | 0 errors |
| Front unit | 新增 4 項通過；全套 149/152，3 項 attribution 失敗為既有／環境相關 |
| Front Vercel preview 轉址 | **NOT VERIFIED** |
| Cloudflare 實際環境 | **NOT VERIFIED** |
