import { resolve } from "node:path";

/**
 * Where specs write screenshots and JSON evidence. Defaults to the git-ignored `test-results/evidence/`
 * so a normal run never touches the committed audit evidence under `docs/audits/`. Set `EVIDENCE_DIR`
 * (relative to the repo root or absolute) to choose another root; relative paths below it are unchanged.
 * Note: Playwright empties `test-results/` at the start of every run.
 */
export const evidenceRoot = () => resolve(process.env.EVIDENCE_DIR || "test-results/evidence");

/** Absolute path below the evidence root, e.g. `evidencePath("interference-gate-b3", "x.png")`. */
export const evidencePath = (...parts: string[]) => resolve(evidenceRoot(), ...parts);
