# Copyright and usage notice

> **Status: provisional, pending Owner confirmation.** This records the Owner's interim policy (Public source / All rights reserved). The copyright line below is a **candidate**, not a confirmed or final legal statement, and has not been reviewed by counsel. This repository deliberately contains no open-source `LICENSE` file.

## Interim policy

- Source code is public so it can be read and inspected.
- No general permission is granted to reuse, modify, distribute or commercially use it unless the copyright holder says so in writing.
- Nothing here limits what GitHub's Terms of Service themselves allow (for example viewing and forking on GitHub).
- Third-party dependencies and assets remain under their own licenses.
- The Kakau name, logo and brand assets are not licensed together with the code.

Candidate notice (**not final; the formal English name and the allocation of rights are still to be confirmed by the Owner**):

> Copyright © 2026 Sin-iu Ho. All rights reserved.

## Third-party software

Dependencies keep their own licenses, declared in each package and summarized from `package-lock.json`: mostly MIT, plus Apache-2.0, ISC, BlueOak-1.0.0, BSD-3-Clause, 0BSD, CC-BY-4.0 (`caniuse-lite`) and LGPL-3.0-or-later (`@img/sharp-libvips-*`, native image-tooling binaries). The `@kakau-tw/*` packages are MIT and published from the maintainer's own repository.

**MathJax** (`mathjax-full`, Apache-2.0) is copied into `public/mathjax/` by `scripts/copy-mathjax.mjs` at build time and served with the site. That script also copies MathJax's `LICENSE` and writes a short `NOTICE.txt` beside the bundle so the deployed output carries the license text. The upstream package publishes no NOTICE file.

## Assets in `public/`

| Path | Status |
|---|---|
| `brand/*`, `favicon.svg` (Kakau logo and wordmark) | Believed to be Kakau-authored; **ownership not yet confirmed**. Brand assets are not covered by any code license. |
| `brand/og-lab.*`, `*-preview.png` (share image, app screenshots) | Believed to be produced from this project; **ownership, and absence of third-party material in them, not yet confirmed**. |
| `file.svg`, `globe.svg`, `window.svg` | Appear to be generic starter-template icons; **origin and license not verified**. |

No claim is made that every asset is Kakau-owned; items marked unconfirmed remain under whatever rights their original authors hold.

## Open items for the Owner

1. Confirm the formal English name and the allocation of rights (individual or entity) behind the candidate notice.
2. Confirm ownership of the logo, share image and screenshots, and decide what to do with the unverified starter icons.
3. Decide whether the all-rights-reserved position stays as is, and set a contribution policy before accepting outside contributions.

Questions about reuse: open an issue on this repository.
