"use client";

import VerdictMark from "@/components/hydrogen/VerdictMark";
import {
  TARGET_LOWER,
  balmerCompareFeedback,
  balmerLineName,
  compareBalmerLines,
  type BalmerCompare,
} from "@/models/hydrogen-learning";

export type BalmerCompareHandlers = {
  onChoose: (upper: number) => void;
  onSubmit: () => void;
  onRetry: () => void;
};

/** Hα vs Hβ: predict which has the larger energy difference, then see both model results. Pure display; it never touches the atom. */
export default function BalmerCompareCard({ compare, handlers }: { compare: BalmerCompare; handlers: BalmerCompareHandlers }) {
  const { alpha, beta, largerUpper } = compareBalmerLines();
  const lines = [alpha, beta];
  return (
    <section className="hydrogen-task-card hydrogen-compare-card" aria-label="比較 Hα 與 Hβ" data-testid="balmer-compare" data-submitted={compare.submitted}>
      <h2>比較兩條巴耳末線</h2>
      <p>兩條線的終態都是 n={TARGET_LOWER}，只有初態不同。你覺得哪一個躍遷的能量差 ΔE 比較大？</p>
      <div className="hydrogen-guess-row hydrogen-guess-row--pair" role="group" aria-label="選擇能量差較大的躍遷">
        {lines.map((t) => (
          <button
            key={t.upper}
            className={compare.guess === t.upper ? "active" : ""}
            aria-pressed={compare.guess === t.upper}
            disabled={compare.submitted}
            onClick={() => handlers.onChoose(t.upper)}
            data-testid={`compare-${t.upper}`}
          >
            n={t.upper} → n={t.lower}
            <small>{balmerLineName(t.upper)}・{t.wavelength.toFixed(1)} nm</small>
          </button>
        ))}
      </div>
      {compare.submitted && compare.guess !== null ? (
        <>
          <div className={`hydrogen-verdict ${compare.guess === largerUpper ? "ok" : "off"}`}>
            <VerdictMark match={compare.guess === largerUpper} label={compare.guess === largerUpper ? "吻合" : "與模型不同"} />
          </div>
          <p className={`hydrogen-feedback ${compare.guess === largerUpper ? "ok" : "off"}`} role="status" data-testid="compare-feedback">{balmerCompareFeedback(compare.guess)}</p>
          <dl className="hydrogen-compare" data-testid="compare-results">
            {lines.map((t) => (
              <div key={t.upper}>
                <dt>n={t.upper} → n={t.lower}（{balmerLineName(t.upper)}）</dt>
                <dd>ΔE {t.photonEnergy.toFixed(2)} eV · λ {t.wavelength.toFixed(1)} nm</dd>
              </div>
            ))}
          </dl>
          <p className="hydrogen-task-status">能階圖上已標出這兩個躍遷。這是模型計算，沒有放出光子，電子也沒有移動。</p>
          <div className="hydrogen-task-actions">
            <button onClick={handlers.onRetry} data-testid="compare-retry">重新比較</button>
          </div>
        </>
      ) : (
        <>
          <p className="hydrogen-task-status" role="status">{compare.guess === null ? "先選一個，再比對模型。" : `已選 n=${compare.guess} → n=${TARGET_LOWER}，按「比對模型」檢查。`}</p>
          <div className="hydrogen-task-actions">
            <button className="primary-action" onClick={handlers.onSubmit} disabled={compare.guess === null} data-testid="compare-submit">比對模型</button>
          </div>
        </>
      )}
    </section>
  );
}
