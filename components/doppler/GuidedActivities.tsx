"use client";

import type { ReactNode } from "react";
import { ArrowRight, Lightbulb, Play, RotateCcw, X } from "lucide-react";
import type { Ratios } from "@/lib/science/doppler";
import type { PairReadout } from "@/models/doppler";
import {
  DOPPLER_ACTIVITIES,
  activityById,
  dopplerEvidencePolicy,
  revealNextHint,
  verificationDone,
  type GuidedSession,
  type GuidedVariant,
  type DopplerActivityId,
} from "@/models/doppler-learning";
import type { DopplerCopy } from "./copy";
import Rich from "./Rich";

const n2 = (value: number | null | undefined) => (value === null || value === undefined || !Number.isFinite(value) ? "—" : value.toFixed(2));

type Column = { key: GuidedVariant; label: string; values: Ratios | null; partial?: { wavelength: number | null; period: number | null } };

/** Spacing, reception interval and (once allowed) frequency, side by side. A number appears only if it was measured. */
function ComparisonCard({ copy, columns, showFrequency, highlight }: { copy: DopplerCopy; columns: Column[]; showFrequency: boolean; highlight?: GuidedVariant | null }) {
  const t = copy.guided.whoMoves.table;
  return (
    <div className="guided-table-wrap">
      <table className="guided-table doppler-compare" aria-label={t.group}>
        <caption className="doppler-sr-only">{t.group}</caption>
        <thead>
          <tr><th scope="col">{copy.readout.current}</th>{columns.map((c) => <th scope="col" key={c.key}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          <tr><th scope="row"><Rich>{t.spacing}</Rich></th>{columns.map((c) => <td key={c.key}>{n2(c.values?.wavelength ?? c.partial?.wavelength)}</td>)}</tr>
          <tr><th scope="row"><Rich>{t.period}</Rich></th>{columns.map((c) => <td key={c.key}>{n2(c.values?.period ?? c.partial?.period)}</td>)}</tr>
          {showFrequency && (
            <tr>
              <th scope="row"><Rich>{t.frequency}</Rich></th>
              {columns.map((c) => (
                <td key={c.key} className={highlight === c.key ? "doppler-higher" : undefined}>
                  {n2(c.values?.frequency)}{highlight === c.key ? ` · ${t.higher}` : ""}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Hints({ session, hints, copy, onChange }: { session: GuidedSession; hints: readonly string[]; copy: DopplerCopy; onChange: (next: GuidedSession) => void }) {
  return (
    <div className="guided-hints">
      {hints.slice(0, session.hintLevel).map((hint, index) => <p key={hint}><b>{copy.guided.hint(index + 1)}</b>{hint}</p>)}
      {session.hintLevel < hints.length && (
        <button onClick={() => onChange(revealNextHint(session, hints.length))}><Lightbulb size={14} /> {copy.guided.showHint(session.hintLevel + 1)}</button>
      )}
    </div>
  );
}

export default function GuidedActivities({
  copy, session, readout, canManipulate, onClose, onRestart, onSelectActivity, onPrediction, onSessionChange,
  onPlayToReception, onKeepAndAdvance, onChooseExplanation, onSwitchVerify, onKeepVerify, onFinishVerify,
}: {
  copy: DopplerCopy;
  session: GuidedSession;
  /** The selected pair's reading at the current time, already limited to what has happened. */
  readout: PairReadout;
  canManipulate: boolean;
  onClose: () => void;
  onRestart: () => void;
  onSelectActivity: (id: DopplerActivityId) => void;
  onPrediction: (choiceId: string) => void;
  onSessionChange: (session: GuidedSession) => void;
  onPlayToReception: () => void;
  /** Keeps the current reading and moves to the next step; the lab turns the reading into a result. */
  onKeepAndAdvance: () => void;
  onChooseExplanation: (id: string) => void;
  onSwitchVerify: (variant: "sourceRecede" | "observerRecede") => void;
  onKeepVerify: () => void;
  onFinishVerify: () => void;
}) {
  const activity = activityById(session.activityId);
  const g = copy.guided;
  const policy = dopplerEvidencePolicy(session);
  const isBaseline = session.activityId === "baseline";
  const text = isBaseline ? g.baseline : g.whoMoves;
  const choiceLabels = text.choices;
  const predictionLabel = session.prediction ? choiceLabels[session.prediction] : null;
  const live: Column["partial"] = { wavelength: readout.wavelength, period: readout.period };
  const sourceSaved = session.saved.source?.reference.ratios ?? null;
  const observerSaved = session.saved.observer?.reference.ratios ?? null;
  const higher: GuidedVariant | null = sourceSaved && observerSaved ? (sourceSaved.frequency > observerSaved.frequency ? "source" : "observer") : null;
  const liveRatios: Ratios | null = readout.complete && readout.wavelength !== null && readout.period !== null && readout.frequency !== null
    ? { wavelength: readout.wavelength, period: readout.period, frequency: readout.frequency }
    : null;

  const measureBlock = (instruction: ReactNode, keepLabel: string, onKeep: () => void) => (
    <div className="guided-block">
      <p className="guided-question">{instruction}</p>
      <button onClick={onPlayToReception} disabled={!canManipulate || readout.complete}><Play size={14} /> {g.playToReception}</button>
      {isBaseline ? (
        <dl className="guided-measures" aria-label={g.baseline.observe}>
          <div><dt>{g.baseline.measures.emission}</dt><dd>{readout.emissionInterval === null ? "—" : `${n2(readout.emissionInterval)} T₀`}</dd></div>
          <div><dt>{g.baseline.measures.spacing}</dt><dd>{readout.wavelength === null ? "—" : `${n2(readout.wavelength)} λ₀`}</dd></div>
          <div><dt>{g.baseline.measures.reception}</dt><dd>{readout.period === null ? copy.readout.waitingReal : `${n2(readout.period)} T₀`}</dd></div>
        </dl>
      ) : null}
      {!readout.complete && <p className="guided-live" role="status">{g.needPair}</p>}
      <button className="primary" disabled={!readout.complete} onClick={onKeep}>{keepLabel} <ArrowRight size={14} /></button>
    </div>
  );

  return (
    <aside className="doppler-side doppler-guided" aria-labelledby="doppler-guided-title" data-testid="guided-panel" data-phase={session.phase}>
      <div className="guided-inner">
        <div className="guided-head">
          <div><span>{g.of(activity.number, DOPPLER_ACTIVITIES.length)}</span><h2 id="doppler-guided-title">{g.activityTitle[session.activityId]}</h2></div>
          <button onClick={onClose} aria-label={g.leave}><X size={16} /></button>
        </div>

        <ol className="guided-progress" aria-label={g.progress}>
          {DOPPLER_ACTIVITIES.map((item) => (
            <li key={item.id}>
              <button className={item.id === session.activityId ? "active" : ""} onClick={() => onSelectActivity(item.id)} aria-current={item.id === session.activityId ? "step" : undefined}>
                <span>{item.number}</span>{g.activityTitle[item.id]}
              </button>
            </li>
          ))}
        </ol>

        <div className="guided-phase" aria-live="polite">
          <span>{g.phases[session.phase]}</span>

          {session.phase === "predict" && (
            <div className="guided-block">
              <p className="guided-question">{text.question}</p>
              <div className="guided-choices" role="group" aria-label={g.yourPredictionGroup}>
                {activity.predictionChoices.map((id) => <button key={id} onClick={() => onPrediction(id)}>{choiceLabels[id]}</button>)}
              </div>
              <p className="guided-mask">{g.predictMask}</p>
            </div>
          )}

          {session.phase !== "predict" && predictionLabel && <p className="guided-prediction"><b>{g.yourPrediction}</b>{predictionLabel}</p>}

          {isBaseline && session.phase === "measure" && (
            <>
              {measureBlock(g.baseline.measure, g.seen, onKeepAndAdvance)}
              <Hints session={session} copy={copy} onChange={onSessionChange} hints={g.baseline.hints} />
            </>
          )}

          {!isBaseline && session.phase === "measure" && (
            <>
              {measureBlock(g.whoMoves.measureSource, g.whoMoves.keepSource, onKeepAndAdvance)}
              <ComparisonCard copy={copy} showFrequency={false} columns={[{ key: "source", label: g.whoMoves.table.source, values: null, partial: live }]} />
              <Hints session={session} copy={copy} onChange={onSessionChange} hints={g.whoMoves.hints} />
            </>
          )}

          {!isBaseline && session.phase === "observer" && (
            <>
              {measureBlock(g.whoMoves.measureObserver, g.whoMoves.keepObserver, onKeepAndAdvance)}
              <ComparisonCard copy={copy} showFrequency={false} columns={[
                { key: "source", label: g.whoMoves.table.source, values: sourceSaved },
                { key: "observer", label: g.whoMoves.table.observer, values: null, partial: live },
              ]} />
            </>
          )}

          {!isBaseline && session.phase === "compare" && (
            <div className="guided-block">
              <p className="guided-question">{g.whoMoves.compareTitle}</p>
              <ComparisonCard copy={copy} showFrequency highlight={higher} columns={[
                { key: "source", label: g.whoMoves.table.source, values: sourceSaved },
                { key: "observer", label: g.whoMoves.table.observer, values: observerSaved },
              ]} />
              <p>{g.whoMoves.compareAsk}</p>
              <button className="primary" onClick={onKeepAndAdvance}>{g.whoMoves.toExplain} <ArrowRight size={14} /></button>
            </div>
          )}

          {session.phase === "explain" && (
            <div className="guided-block">
              {!isBaseline && (
                <ComparisonCard copy={copy} showFrequency highlight={higher} columns={[
                  { key: "source", label: g.whoMoves.table.source, values: sourceSaved },
                  { key: "observer", label: g.whoMoves.table.observer, values: observerSaved },
                ]} />
              )}
              <p className="guided-question">{text.explainQuestion}</p>
              <div className="guided-choices" role="group" aria-label={g.explanationGroup}>
                {Object.entries(text.explanations).map(([id, label]) => <button key={id} onClick={() => onChooseExplanation(id)}>{label}</button>)}
              </div>
            </div>
          )}

          {!isBaseline && session.phase === "verify" && (
            <div className="guided-block">
              <p className="guided-question">{g.whoMoves.verifyTitle}</p>
              <p>{g.whoMoves.verifyText}</p>
              <div className="guided-choices" role="group" aria-label={g.whoMoves.verifyTitle}>
                {(["sourceRecede", "observerRecede"] as const).map((variant) => (
                  <button key={variant} aria-pressed={session.variant === variant} className={session.variant === variant ? "active" : ""} onClick={() => onSwitchVerify(variant)}>
                    {variant === "sourceRecede" ? g.whoMoves.sourceRecede : g.whoMoves.observerRecede}
                    {session.saved[variant] ? ` · ${g.whoMoves.kept}` : ""}
                  </button>
                ))}
              </div>
              <button onClick={onPlayToReception} disabled={!canManipulate || readout.complete}><Play size={14} /> {g.playToReception}</button>
              <ComparisonCard copy={copy} showFrequency columns={[
                { key: session.variant, label: g.variantLabel[session.variant], values: liveRatios, partial: live },
              ]} />
              <button disabled={!readout.complete} onClick={onKeepVerify}>{g.whoMoves.keepRecede}</button>
              <ComparisonCard copy={copy} showFrequency columns={([
                ["sourceRecede", session.saved.sourceRecede],
                ["observerRecede", session.saved.observerRecede],
              ] as const).map(([key, saved]) => ({ key, label: key === "sourceRecede" ? g.whoMoves.table.sourceRecede : g.whoMoves.table.observerRecede, values: saved?.reference.ratios ?? null }))} />
              <button className="primary" disabled={!verificationDone(session)} onClick={onFinishVerify}>{g.whoMoves.finish} <ArrowRight size={14} /></button>
            </div>
          )}

          {session.phase === "complete" && (
            <div className="guided-block guided-complete">
              <p className="guided-prediction"><b>{g.yourExplanation}</b>{session.explanation ? text.explanations[session.explanation] : null}</p>
              <div className="guided-conclusion"><b>{g.modelShows}</b><p><Rich>{text.conclusion}</Rich></p></div>
              {!isBaseline && (
                <>
                  <ComparisonCard copy={copy} showFrequency highlight={higher} columns={[
                    { key: "source", label: g.whoMoves.table.source, values: sourceSaved },
                    { key: "observer", label: g.whoMoves.table.observer, values: observerSaved },
                    { key: "sourceRecede", label: g.whoMoves.table.sourceRecede, values: session.saved.sourceRecede?.reference.ratios ?? null },
                    { key: "observerRecede", label: g.whoMoves.table.observerRecede, values: session.saved.observerRecede?.reference.ratios ?? null },
                  ]} />
                  <div className="guided-free"><b>★ {g.pickTheory}</b><p>{g.whoMoves.free}</p></div>
                </>
              )}
              <button
                className="primary"
                onClick={() => {
                  if (activity.number < DOPPLER_ACTIVITIES.length) onSelectActivity(DOPPLER_ACTIVITIES[activity.number].id);
                  else onClose();
                }}
              >
                {activity.number < DOPPLER_ACTIVITIES.length ? g.next : g.backToFree} <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>

        {policy.numeric && (
          <div className="guided-assumptions" aria-label={g.assumptions}>
            <b>{g.assumptions}</b>
            <span>{g.assumptionsText}</span>
          </div>
        )}
        <div className="guided-footer">
          <button onClick={onRestart}><RotateCcw size={14} /> {g.restart}</button>
          <span>{g.localOnly}</span>
        </div>
      </div>
    </aside>
  );
}
