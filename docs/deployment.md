# Deployment（Cloudflare Worker）

Kakau Lab 部署為一個自管的 Cloudflare Worker，名稱 `kakau-lab`。`wrangler.jsonc` 是唯一的部署設定來源：`vite.config.ts` 以 `configPath` 指向它，所以 dev 跑的 runtime 與 `wrangler deploy` 上線的設定是同一份。

## 首次設定（每台機器一次）

```bash
npx wrangler login     # 開瀏覽器登入 Cloudflare，不需要把 token 放進指令或檔案
npx wrangler whoami    # 確認帳號；若有多個帳號，設定 CLOUDFLARE_ACCOUNT_ID
```

## 部署

```bash
npm run deploy
```

**必須用 `npm run deploy`，不要直接跑 `npx vinext deploy`。** `vinext deploy` 會直接呼叫 Vite builder，不會經過 `npm run build`，因此 `prebuild` 的 MathJax 複製步驟不會執行；`npm run deploy` 的 `predeploy` hook 補上這一步。少了它，Model 07 的理論筆記在正式環境不會顯示任何數學式（`public/mathjax/` 是 gitignored 的建置產物，乾淨 clone 上並不存在）。`tests/deploy-config.test.mjs` 會擋住這個回歸。

不上傳、只驗證設定與打包產物：

```bash
npm run deploy:dry                  # 只生成/檢查設定檔
npx wrangler deploy --dry-run       # 完整打包但不上傳（不需要 Cloudflare 認證）
```

## CI/CD（GitHub Actions）

**CI**（`.github/workflows/ci.yml`）：每個 PR 與 push 到 `main` 都會跑 `npm ci`、`npm run lint`、`npm test`（`npm test` 已包含 `npm run build`，不另跑）。CI 只驗證程式，**不會部署**。

**CD**（`.github/workflows/deploy.yml`）：只能手動觸發（`workflow_dispatch`），合併或 push 到 `main` 都不會自動部署。流程：確認選的是 `main` → checkout `main` 並記錄 commit SHA → lint 與 test（含 build）→ 確認 `main` 沒有在檢查期間前進（否則失敗，請重跑，避免舊版覆蓋新版）→ `npm run deploy`（保留 MathJax predeploy）→ 對 `https://lab.kakau.tw` 的 `/`、`/projectile`、`/electrostatics` 做 HTTP smoke test → 在 job summary 記錄部署的 SHA。部署用的 concurrency group 不取消進行中的部署。

**SHA 防護的範圍：** 每次執行都 checkout 當下最新的 `main`，並在部署前再比對一次 `origin/main`；兩者不同就失敗。它防的是「檢查期間 `main` 前進」，不是完整的版本鎖：比對與上傳之間仍有極短的空窗，且不會驗證線上目前是哪一版。

**Smoke test 的範圍：** 只確認 `/`、`/projectile`、`/electrostatics` 回 HTTP 200，不檢查頁面內容、數學式算繪或其他路由（包含 `/chemistry/lewis`）；它也無法分辨回應來自新版或舊版，SHA 只記在 job summary 裡。通過不代表功能或科學內容正確。

**發布前須由 Owner 決定。** 測試通過只代表程式沒壞，不代表科學正確性與教學內容已驗收。未審查的頁面（例如標註 awaiting review 的 Lewis Studio）可以先合併進 `main`，但只有 Owner 判斷可以發布時才手動觸發部署。

**發布步驟：** GitHub → Actions → Deploy → Run workflow（分支選 `main`）。

**失敗處理：**
- lint／test 失敗：不會部署，修好後重跑。
- 「main moved」：有新 commit 進來，重跑即可。
- 部署步驟失敗：不要假設線上版本沒變。先用 `npx wrangler deployments status` 或 Cloudflare 儀表板確認目前線上是哪一版，並檢查網站實際狀態，再決定重跑或 rollback。
- smoke test 失敗：部署可能已完成但頁面異常，先看 Cloudflare 線上狀態，必要時用上方 Rollback 指令回到前一版。

**首次設定（一次）：** 在 Cloudflare 建立 API token（My Profile → API Tokens → Create Token → 用 “Edit Cloudflare Workers” 範本，限定到此帳號；只需 Workers Scripts 的 Edit 權限）。在 GitHub repo 的 Settings → Secrets and variables → Actions 新增 `CLOUDFLARE_API_TOKEN` 與 `CLOUDFLARE_ACCOUNT_ID`（Account ID 在 Cloudflare 儀表板 Workers & Pages 頁面右側）。不要把這兩個值寫進原始碼、文件或日誌。

## 驗證

部署後 Cloudflare 會回一個 `https://kakau-lab.<subdomain>.workers.dev` 網址。最小驗收：catalog 回 200 且顯示 9 個模型、01–07 各自載入、Model 08 連到 `https://kakau.tw/lab/interference`、Model 09 的 `/electrostatics` 正常載入、Model 07 的 `/projectile/notes` 數學式有算繪。

## Rollback

```bash
npx wrangler deployments status         # 目前線上是哪一版
npx wrangler deployments list           # 最近 10 次部署與其 version ID
npx wrangler rollback <version-id>      # 回到該版本；省略 ID 則回到前一版
```

Cloudflare 保留既有版本，rollback 不需要重新建置。另一條路是 checkout 上一個已知良好的 commit 再跑一次 `npm run deploy`。

## 備註

- `compatibility_date` 釘選在 `2026-05-15`，對應安裝的 `workerd 1.20260515.1`，也就是所有 dev/build 實際跑過的 runtime。升級時應同步調整並重測。
- 目前沒有宣告 D1／R2／KV 等 binding，因為這個應用不需要持久化狀態。
- 沒有宣告 Cloudflare Images binding：`next/image` 僅用於匯出預覽且帶 `unoptimized`，不會走影像最佳化端點；要啟用時需先在帳號開通 Cloudflare Images，再於 `wrangler.jsonc` 加上 `images` binding。
- `.openai/hosting.json` 是早期 OpenAI Site Creator 部署留下的歷史檔案，**已不參與任何生產設定**，保留僅為記錄。

---

本文件由根目錄 README 的 Deployment 章節原樣搬移而來；部署機制本身未變更。回到 [README](../README.md)。
