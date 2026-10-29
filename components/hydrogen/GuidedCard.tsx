"use client";

import { useEffect, useRef } from "react";
import { Zap } from "lucide-react";
import { HC_EV_NM } from "@/lib/science/hydrogen";
import {
  GUESS_OPTIONS,
  OBSERVED_NM,
  TARGET_LOWER,
  balmerLimitNm,
  canShowEvidence,
  compareGuess,
  comparisonFeedback,
  observedPhotonEnergy,
  type EvidencePolicy,
  type GuidedPhase,
  type HydrogenLearning,
} from "@/models/hydrogen-learning";
import type { HydrogenReadout, HydrogenState } from "@/models/hydrogen";

const STEPS: { phase: GuidedPhase[]; label: string }[] = [
  { phase: ["observe"], label: "觀察" },
  { phase: ["predict"], label: "預測" },
  { phase: ["compared"], label: "比對" },
  { phase: ["evidence"], label: "理解" },
];

/** What the evidence phase needs from the physical model. Passed only when the policy allows it. */
export type GuidedEvidence = {
  state: HydrogenState;
  readout: HydrogenReadout;
  onFire: () => void;
  onResetElectron: () => void;
};

export type GuidedHandlers = {
  onBegin: () => void;
  onChoose: (upper: number) => void;
  onHint: () => void;
  onSubmit: () => void;
  onRetry: () => void;
  onEvidence: () => void;
  onRestart: () => void;
};

const HINTS = [
  "波長越短，光子能量越高。",
  `光子能量等於兩個能階的能量差：E = hc/λ，而 Eₙ = −13.6 eV / n²。約 ${OBSERVED_NM} nm 的光子能量是 ${(HC_EV_NM / OBSERVED_NM).toFixed(2)} eV；試試哪一個 n 到 n=${TARGET_LOWER} 的能量差最接近。`,
];

export default function GuidedCard({
  learning,
  policy,
  handlers,
  evidence,
}: {
  learning: HydrogenLearning;
  policy: EvidencePolicy;
  handlers: GuidedHandlers;
  evidence: GuidedEvidence | null;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const { phase } = learning;

  // After a step changes, move focus to the new step's heading so keyboard and screen-reader users land on it.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    // On a phone the card sits below the spectrum: scroll just far enough that this step's buttons are on screen.
    if (phase === "evidence") return;
    const actions = cardRef.current?.querySelector(".hydrogen-task-actions");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    actions?.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
  }, [phase]);

  const comparison = policy.comparisonCard && learning.compared !== null ? compareGuess(learning.compared) : null;

  return (
    <section ref={cardRef} className="hydrogen-task-card" aria-label="探索任務" data-testid="guided-card" data-phase={phase}>
      <ol className="hydrogen-steps" aria-label="探索步驟">
        {STEPS.map((step, i) => (
          <li key={step.label} aria-current={step.phase.includes(phase) ? "step" : undefined} className={step.phase.includes(phase) ? "current" : ""}>
            <span>{i + 1}</span>{step.label}
          </li>
        ))}
      </ol>

      {phase === "observe" ? (
        <>
          <h2 ref={headingRef} tabIndex={-1}>光譜中的 {OBSERVED_NM} nm 從哪裡來？</h2>
          <p>氫原子只發出特定波長的光。上方是巴耳末系（終態 n={TARGET_LOWER}）的發射光譜，金色框起來的是約 {OBSERVED_NM} nm 的那一條。</p>
          <p className="hydrogen-task-question">這條光是電子從哪個能階躍遷到 n={TARGET_LOWER} 時放出的？</p>
          <div className="hydrogen-task-actions">
            <button className="primary-action" onClick={handlers.onBegin} data-testid="begin-predict">開始預測</button>
          </div>
        </>
      ) : null}

      {phase === "predict" ? (
        <>
          <h2 ref={headingRef} tabIndex={-1}>電子原本在哪個能階？</h2>
          <p>約 {OBSERVED_NM} nm 的光子，是電子從 n=？ 躍遷到 n={TARGET_LOWER} 時放出的。選一個上能階：</p>
          <div className="hydrogen-guess-row" role="group" aria-label="選擇上能階">
            {GUESS_OPTIONS.map((n) => (
              <button key={n} className={learning.guess === n ? "active" : ""} aria-pressed={learning.guess === n} onClick={() => handlers.onChoose(n)} data-testid={`guess-${n}`}>
                n={n}
              </button>
            ))}
          </div>
          <div className="hydrogen-hints">
            {HINTS.slice(0, learning.hint).map((hint) => (
              <p key={hint} className="hydrogen-hint" role="note">{hint}</p>
            ))}
            {learning.hint < 2 ? (
              <button className="hydrogen-link-button" onClick={handlers.onHint} data-testid="hint">{learning.hint === 0 ? "需要線索？" : "再給一個線索"}</button>
            ) : null}
          </div>
          <p className="hydrogen-task-status" role="status">{learning.guess === null ? "先選一個能階，再比對模型。" : `已選 n=${learning.guess}，按「比對模型」檢查。`}</p>
          <div className="hydrogen-task-actions">
            <button className="primary-action" onClick={handlers.onSubmit} disabled={learning.guess === null} data-testid="submit-guess">比對模型</button>
            {canShowEvidence(learning) ? <button onClick={handlers.onEvidence} data-testid="show-evidence">查看能階證據</button> : null}
          </div>
        </>
      ) : null}

      {phase === "compared" && comparison ? (
        <>
          <h2 ref={headingRef} tabIndex={-1}>n={comparison.upper} → n={comparison.lower}：{comparison.correct ? "與觀察吻合" : "與觀察不一致"}</h2>
          <p className={`hydrogen-feedback ${comparison.correct ? "ok" : "off"}`} role="status" data-testid="comparison-feedback">{comparisonFeedback(comparison)}</p>
          <ComparisonTable c={comparison} />
          <div className="hydrogen-task-actions">
            {comparison.correct ? (
              <button className="primary-action" onClick={handlers.onEvidence} data-testid="show-evidence">查看能階證據</button>
            ) : (
              <>
                <button className="primary-action" onClick={handlers.onRetry} data-testid="retry">重新預測</button>
                <button onClick={handlers.onEvidence} data-testid="show-evidence">查看能階證據</button>
              </>
            )}
          </div>
        </>
      ) : null}

      {phase === "evidence" && evidence ? <EvidenceBody comparison={comparison} evidence={evidence} handlers={handlers} headingRef={headingRef} /> : null}
    </section>
  );
}

function ComparisonTable({ c }: { c: ReturnType<typeof compareGuess> }) {
  return (
    <dl className="hydrogen-compare" data-testid="comparison">
      <div><dt>能量差 ΔE</dt><dd>{c.deltaE.toFixed(2)} eV</dd></div>
      <div><dt>模型波長</dt><dd>{c.wavelength.toFixed(1)} nm</dd></div>
      <div><dt>觀察波長</dt><dd>約 {c.observed} nm</dd></div>
      <div><dt>差異</dt><dd>{c.differenceNm >= 0 ? "+" : "−"}{Math.abs(c.differenceNm).toFixed(1)} nm</dd></div>
    </dl>
  );
}

function EvidenceBody({
  comparison,
  evidence,
  handlers,
  headingRef,
}: {
  comparison: ReturnType<typeof compareGuess> | null;
  evidence: GuidedEvidence;
  handlers: GuidedHandlers;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  const { readout, state } = evidence;
  const { selected } = readout;
  const upperEnergy = readout.levels[selected.upper - 1].energy;
  const lowerEnergy = readout.levels[selected.lower - 1].energy;
  const blocked = readout.blocked;
  return (
    <>
      <h2 ref={headingRef} tabIndex={-1}>能階圖上的證據：n={selected.upper} → n={selected.lower}</h2>
      {comparison && !comparison.correct ? <p className="hydrogen-task-status">你先前選的是 n={comparison.upper}，真正的躍遷是 n={selected.upper}。</p> : null}
      <div className="hydrogen-equation" data-testid="evidence-equation">
        <div>ΔE = E<sub>{selected.upper}</sub> − E<sub>{selected.lower}</sub> = ({upperEnergy.toFixed(2)}) − ({lowerEnergy.toFixed(2)}) = <b>{selected.photonEnergy.toFixed(2)} eV</b></div>
        <div>λ = hc / ΔE = {HC_EV_NM.toFixed(1)} eV·nm / {selected.photonEnergy.toFixed(2)} eV = <b>{selected.wavelength.toFixed(1)} nm</b></div>
        <small>觀察約 {OBSERVED_NM} nm（光子能量 {observedPhotonEnergy().toFixed(2)} eV）；玻耳模型忽略原子核質量的修正，與實測有約 0.05 % 的差。</small>
      </div>
      <p>光譜上的每條線都是離散的，表示光子能量只能是特定的值，也就是能階之間的能量差只有特定的值。這就是能量量子化的證據。</p>
      <div className="hydrogen-task-actions">
        <button className="primary-action" onClick={evidence.onFire} disabled={blocked !== null} aria-describedby="hydrogen-guided-fire-status" data-testid="guided-fire">
          <Zap size={14} /> 放出光子
        </button>
        {blocked?.reason === "electron-not-at-start" ? <button onClick={evidence.onResetElectron}>電子回到 n={blocked.requiredLevel}</button> : null}
      </div>
      <p className="hydrogen-task-status" id="hydrogen-guided-fire-status" role="status">
        {blocked?.reason === "in-flight" ? "光子飛行中……" : blocked?.reason === "electron-not-at-start" ? `電子在 n=${state.electronLevel}，要再放一次光需要先回到 n=${blocked.requiredLevel}。` : `電子在 n=${state.electronLevel}，可以放出一個 ${selected.wavelength.toFixed(0)} nm 的光子。`}
      </p>
      <details className="hydrogen-extension">
        <summary>延伸：電子從更高的能階回到 n={TARGET_LOWER}，光子的波長會變長還是變短？</summary>
        <p>想想看再展開。n 越大，Eₙ 越接近 0，能量差 ΔE 越大，但有上限 {(-readout.levels[TARGET_LOWER - 1].energy).toFixed(2)} eV。ΔE 越大，波長越短，並逐漸逼近系限 {balmerLimitNm().toFixed(1)} nm；譜線越來越密。</p>
      </details>
      <div className="hydrogen-task-actions">
        <button onClick={handlers.onRestart} data-testid="restart">重新開始這個任務</button>
      </div>
    </>
  );
}
