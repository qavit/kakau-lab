# Copyright and usage notice

> **Status: provisional draft, pending Owner confirmation.** This file records the Owner's interim decision (2026-10-23) and what has been verified from this repository. It is not a finalized legal statement and has not been reviewed by counsel. This repository does **not** contain an open-source `LICENSE` file, on purpose.

## 1. Interim position (Public source / All rights reserved)

- The source code in this repository is published so that it can be read and inspected.
- Unless the copyright holder says otherwise in writing, no general permission is granted to reuse, modify, distribute or commercially use it.
- Nothing here restricts what GitHub's Terms of Service themselves allow (for example viewing and forking on GitHub).
- Third-party dependencies and assets remain under their own licenses (section 3).
- The Kakau name, logo and brand assets are not covered by any license to the code (section 4).

Copyright holder: **to be confirmed by the Owner** (see section 5). The git history lists commits by two author identities of the same maintainer; that does not by itself settle who holds copyright.

## 2. Verified facts about this repository

- GitHub reports no license for `qavit/kakau-lab`; there is no `LICENSE` file; `package.json` has `"private": true` and no `license` field.
- All commits are by the maintainer's own identities (checked on 2026-10-23); no third-party contributor commits were found. Whether any AI-assisted material affects authorship or ownership has not been assessed.

## 3. Third-party software (production dependency tree, from `package-lock.json`)

Licenses are as declared by the packages, summarized by SPDX identifier on 2026-10-23. This is not a full notice file.

| License | Notable packages | Notes |
|---|---|---|
| MIT | `three`, `astronomy-engine`, `next`, `react`, `react-dom`, `better-react-mathjax`, `@kakau-tw/diagram-spec`, `@kakau-tw/render-svg` | Copyright notice must accompany redistributed copies. |
| Apache-2.0 | `mathjax-full` 3.2.2, `@mathjax/mathjax-newcm-font`, `@dimforge/rapier3d-compat`, `sharp` | See MathJax note below. |
| ISC | `lucide-react` | |
| LGPL-3.0-or-later | `@img/sharp-libvips-*` (native binaries of `sharp`) | Build-time image tooling; not shipped in the Worker bundle as far as checked — **not confirmed**. |
| CC-BY-4.0 | `caniuse-lite` | Data used by build tooling. |
| BlueOak-1.0.0, BSD-3-Clause, 0BSD | assorted build-time utilities | |

**MathJax.** `scripts/copy-mathjax.mjs` copies `mathjax-full`'s `tex-svg.js` into `public/mathjax/` at build time (the file is gitignored, so it is not in the repository, but it **is** served from the deployed site). Apache-2.0 asks redistributors to keep the license and notice. The deployed site does not currently ship a MathJax LICENSE/NOTICE file; whether the bundled file's own header is sufficient has not been decided.

`@kakau-tw/*` packages (published from the Owner's `qavit/Graphite` repository, MIT) are first-party.

## 4. Assets in `public/`

| Path | What it appears to be | Origin evidence | Status |
|---|---|---|---|
| `public/brand/*.svg`, `public/favicon.svg` | Kakau logo / wordmark | Commits "apply logo system MVP" by the maintainer | Appears first-party; **Owner to confirm**. Brand assets are not licensed with the code. |
| `public/brand/og-lab.png`, `og-lab.svg` | Social share image | Commit "add Kakau Lab OG image" | Appears first-party; **Owner to confirm**. |
| `public/home-preview.png`, `atmosphere-preview.png`, `geology-preview.png`, `solar-sphere-preview.png` | Screenshots of this app | Added 2026-08-02 by the maintainer | Derived from the app's own UI; **Owner to confirm** no third-party imagery appears in them. |
| `public/file.svg`, `globe.svg`, `window.svg` | Generic icons | Match the default assets of the Next.js starter template | Origin and license **not verified**. Not referenced by any app source file found; candidates for removal (out of scope for this change). |

Fonts: the CSS uses system font stacks only (no bundled font files found).

## 5. Open items requiring Owner decision

1. Who holds copyright (individual, Kakau as an entity, or other), and the exact notice line, e.g. `Copyright (c) 2026 <holder>`.
2. Confirm the logo, OG image and preview screenshots are Kakau-owned and contain no third-party material.
3. Decide whether to keep or remove the unreferenced starter icons (`file.svg`, `globe.svg`, `window.svg`).
4. Decide how to satisfy MathJax (Apache-2.0) notice requirements on the deployed site.
5. Decide whether the interim "all rights reserved" position should later become an explicit source-available or open-source license. That is a policy decision and is not made here.
6. Contributions: no contribution policy exists. Until one does, external pull requests are accepted only at the Owner's discretion, and no assignment or license terms have been defined.

## 6. Contact

Questions about reuse: open an issue on this repository.
