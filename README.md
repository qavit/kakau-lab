# Kakau Lab

互動式科學模型平台。Interactive science models for classroom exploration — built around synchronized views, explicit assumptions and verifiable calculations.

- 正式網站 / Live site: <https://lab.kakau.tw>
- 本 repo 原名 `qavit/AstroLab`。

> **公開原始碼，保留所有權利（Public source, all rights reserved）。** 原始碼公開供閱讀與檢視；目前**沒有**授予一般性的再利用、修改、散布或商業使用授權。詳見 [授權與著作權](#授權與著作權) 與 [`COPYRIGHT.md`](COPYRIGHT.md)。

## 這是什麼

Kakau Lab 把較重的互動科學模型（React 狀態應用、Three.js、多視圖同步視覺化）放在同一個平台上。首個模組「太陽、天球與竿影」把地心天球、觀察者天空、季節日行跡與竿影放在同一份同步狀態中。

### Kakau Lab 與 Kakau Web 的邊界

- **Kakau Web**（<https://kakau.tw>）：品牌、內容、資源與輕量原生 lab（例如雙點波源干涉 <https://kakau.tw/lab/interference>），扮演 SEO／導客的角色。
- **Kakau Lab**（本 repo，<https://lab.kakau.tw>）：較重的互動科學模型。

兩者是刻意分開的 runtime：「整合產品」不代表「整合 framework」，不合併 runtime、不搬移模型，`kakau.tw/lab/interference` 的網址維持不變。詳見 [`docs/architecture.md`](docs/architecture.md)。

## 模型概覽

唯一的資料來源是 [`lib/labs/registry.ts`](lib/labs/registry.ts)；下表為 2026-10-23 對照 registry 人工核對的快照，**若與 registry 不一致，以 registry 為準**。

| # | 模型 | 路徑 | 成熟度 | 可見度 |
|---|---|---|---|---|
| 01 | 太陽、天球與竿影 | `/solar` | beta | public |
| 02 | 多導線磁場疊加 | `/magnetism` | prototype | unlisted |
| 03 | 全球行星風系 | `/atmosphere` | prototype | unlisted |
| 04 | 岩層位態 × 河谷地形 | `/geology` | prototype | unlisted |
| 05 | 大氣垂直結構 | `/atmosphere-profile` | beta | public |
| 06 | 科氏力效應 | `/coriolis` | prototype | unlisted |
| 07 | 拋體運動 | `/projectile` | stable | public |
| 08 | 雙點波源干涉 | <https://kakau.tw/lab/interference>（Kakau Web） | beta | public |
| 09 | 靜電學 | `/electrostatics` | stable | public |
| — | 自由體圖（FBD） | `/fbd` | prototype（paused） | unlisted |

另有 Lewis Studio（`/chemistry/lewis`）：開發中的化學 Lewis 結構練習。原始碼已設定 `noindex`、未列入 registry，頁尾標示「待教師驗收」；截至 2026-10-23 **尚未部署**（線上該路徑回 404）。部署後 `noindex` 只是請搜尋引擎不要索引，並不限制存取。

狀態用語（見 [`VERSIONING.md`](VERSIONING.md)、[`docs/architecture.md`](docs/architecture.md)）：

- **maturity**：`prototype` → `beta` → `stable`，表示模型作為產品的成熟度。
- **visibility**：`public` 可被搜尋引擎索引並列於 catalog；`unlisted` 不列在一般 catalog，**但沒有任何存取限制，知道網址的人都能開啟，也可能被搜尋引擎或他人連結找到**；`private` 不對外提供。
- **paused**：暫停開發（目前只有 FBD）。`status` 欄位已棄用，過渡期間保留。

## 本機開發

需求：Node.js ≥ 22.13。

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint
npm test         # 包含 build 與單元測試
npm run test:e2e # Playwright
```

CI 會在每個 PR 與 push 到 `main` 時執行 lint 與 `npm test`。部署只能手動觸發，見 [`docs/deployment.md`](docs/deployment.md)。

## 專案結構

- `lib/science/`：純科學計算與座標轉換，不依賴 DOM 或渲染。
- `lib/render/`：與模型無關的 Three.js 基礎層。
- `lib/labs/registry.ts`：模型 registry，純資料。
- `models/`：各模型的狀態、預設值、時間演化與衍生量。
- `components/`、`app/`：互動視圖、控制介面與路由。
- `tests/`：單元測試與 Playwright e2e。

相依方向為單向：`lib/science`、`lib/render` 不依賴上層；`models` 只能 import `lib/science`；`components` 是唯一組合各層的地方。

## 科學模型的假設、近似與驗證

每個模型都是教學用的理想化，不是精密工具。例如太陽模型的赤緯採課堂用的平滑近似式（全年誤差在 2° 以內），需要真實星曆時走 `lib/science/ephemeris.ts`（全平台唯一接觸 `astronomy-engine` 的檔案，由測試強制維持）。

- 各模型的假設與適用範圍見應用內的說明頁（例如 `/about`、各模型的 Theory Notes）。
- `LabManifest` 預留 `assumptions`／`approximations`／`validity`／`verification` 欄位，**尚未替既有模型補齊**。
- 數值驗證以 `tests/` 內的回歸測試與參考資料為依據；測試通過代表程式未退化，**不等於**科學內容與教學設計已經過審查。

## 文件導覽

| 文件 | 內容 |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | 平台分層、相依方向、各模型的設計取捨、Kakau Lab／Web 邊界 |
| [`docs/deployment.md`](docs/deployment.md) | Cloudflare Worker 部署、CI/CD、失敗處理、Rollback |
| [`docs/ci-cd-v1-closeout.md`](docs/ci-cd-v1-closeout.md) | CI/CD v1 結案紀錄 |
| [`docs/i18n-foundation.md`](docs/i18n-foundation.md) | 多語系基礎 |
| [`VERSIONING.md`](VERSIONING.md) / [`CHANGELOG.md`](CHANGELOG.md) | 版本定義與對外變更紀錄 |
| [`AGENTS.md`](AGENTS.md) | 貢獻與工作慣例 |
| `docs/*.md`（其餘） | 各模型的開發紀錄與設計筆記，屬於**當時的工程紀錄**，不是產品路線圖 |

## 授權與著作權

**聲明：** 本 repo 的原始碼公開供閱讀與檢視，保留所有權利（All rights reserved）。目前未授予一般性的再利用、修改、散布或商業使用授權，也未採用 MIT、Apache-2.0 等開源授權。不限制 GitHub 服務條款本身允許的操作（例如在 GitHub 上檢視與 fork）。

- 第三方依賴與素材仍遵守各自的授權。
- Kakau 的名稱、Logo 與品牌素材不自動納入程式碼的任何授權。
- 想以本 repo 內容做其他用途，請先取得書面同意。

著作權署名為 `Copyright © 2026 Sin-iu Ho. All rights reserved.`（Owner 已確認，原始碼著作財產權由 Owner 個人持有）。第三方授權與素材來源見 [`COPYRIGHT.md`](COPYRIGHT.md)；其中 Logo、OG 圖、預覽圖等素材的權利**尚未確認**，仍如實標示，該文件也未經法律審閱。
