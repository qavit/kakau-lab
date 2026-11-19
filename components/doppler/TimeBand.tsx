"use client";

import { MAX_DURATION, type DopplerExperiment } from "@/lib/science/doppler";
import type { DopplerCopy } from "./copy";
import { DOPPLER_COLORS as C } from "./palette";

/**
 * The same fronts, as events in time: an emission track (S) and a reception track (O) sharing one
 * time axis drawn to scale, so the gap between two receptions is as long on screen as it is in the
 * experiment. A front's emission and reception carry the same number and are joined by a line.
 */
export default function TimeBand({
  experiment, time, pair, guides, numeric, labels, connectors, width, height, copy, summary, onSelectPair, onUnavailable,
}: {
  experiment: DopplerExperiment;
  time: number;
  pair: number;
  guides: boolean;
  numeric: boolean;
  labels: boolean;
  connectors: boolean;
  width: number;
  height: number;
  copy: DopplerCopy;
  summary: string;
  onSelectPair: (n: number) => void;
  /** A front that O never receives inside the run was clicked. */
  onUnavailable: (n: number) => void;
}) {
  const w = Math.max(280, width || 900);
  const h = Math.max(172, height || 176);
  const compact = w < 560;
  const left = compact ? 62 : 104;
  const right = 16;
  const tx = (t: number) => left + (t / MAX_DURATION) * (w - left - right);
  const perUnit = (w - left - right) / MAX_DURATION;
  // Fixed offsets from the top and bottom so the labels of both tracks, the two brackets and the axis can never meet:
  // top bracket text (18) · emission track (44, numbers to 64) · reception numbers (rY − 12) · reception track · bracket · axis.
  const eY = 44;
  const rY = Math.max(eY + 56, h - 76);
  const axisY = h - 28;
  const font = compact ? 11 : 12;
  const showAll = labels && perUnit * 0.66 >= 20;
  const lastPair = Math.max(0, experiment.receptions.length - 2);
  const emitted = experiment.emissions.filter((e) => e.t <= time + 1e-9);
  const received = experiment.receptions.filter((r) => r.t <= time + 1e-9);
  const isSel = (n: number) => guides && (n === pair || n === pair + 1);

  const e0 = emitted.find((e) => e.n === pair);
  const e1 = emitted.find((e) => e.n === pair + 1);
  const r0 = received.find((r) => r.n === pair);
  const r1 = received.find((r) => r.n === pair + 1);
  // The reason a run ends early is written in the grey area after the end, between the two tracks where nothing else is drawn;
  // a run that simply reaches 16 T₀ needs no words (the line and the axis say it).
  const endLines = experiment.endReason === "before-coincidence" ? [copy.figure.endMarker, copy.figure.endCoincide] : [];
  const lineWidth = (line: string) => line.length * font * (/[^\u0000-\u024f]/.test(line) ? 1 : 0.58);
  const endRoom = w - right - tx(experiment.duration);
  // Numbers on the last events stick out up to ~22 px past the end line, so the words start a little further on.
  const endGap = 26;
  const endOnLeft = endLines.length > 0 && endRoom < Math.max(...endLines.map(lineWidth)) + endGap + 6;
  const endY = (eY + rY) / 2 - 2;
  /** Front numbers: only the selected pair, plus all of them when there is room. Two selected numbers that would touch merge into "n–m". */
  const numberLabels = (items: readonly { n: number; t: number }[], y: number, kind: string) => {
    if (!labels) return null;
    const chosen = items.filter((item) => isSel(item.n));
    const merged = chosen.length === 2 && Math.abs(tx(chosen[1].t) - tx(chosen[0].t)) < 24;
    const out = items
      .filter((item) => (isSel(item.n) ? !merged : showAll))
      .map((item) => (
        <text key={`${kind}${item.n}`} x={tx(item.t)} y={y} textAnchor="middle" fill={isSel(item.n) ? C.pair : C.label} fontSize={isSel(item.n) ? font + 1 : font - 1} fontWeight={isSel(item.n) ? 700 : 400}>{item.n}</text>
      ));
    if (merged) out.push(<text key={`${kind}m`} x={(tx(chosen[0].t) + tx(chosen[1].t)) / 2} y={y} textAnchor="middle" fill={C.pair} fontSize={font + 1} fontWeight={700}>{`${chosen[0].n}–${chosen[1].n}`}</text>);
    return out;
  };
  const ticks = Array.from({ length: MAX_DURATION / 2 + 1 }, (_, i) => i * 2).filter((v) => !compact || v % 4 === 0);

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      role="img"
      aria-label={summary}
      data-testid="time-band"
      data-emitted={emitted.length}
      data-received={received.length}
      style={{ display: "block", touchAction: "manipulation" }}
    >
      {/* The end of the run is always drawn, so it never appears from nowhere and shifts nothing around it. */}
      <g data-testid="band-end" data-reason={experiment.endReason}>
        <title>{copy.status.ended(experiment.endReason)}</title>
        {experiment.duration < MAX_DURATION - 1e-9 && (
          <rect x={tx(experiment.duration)} y={6} width={tx(MAX_DURATION) - tx(experiment.duration)} height={axisY - 6} fill={C.ended} />
        )}
        <path d={`M${tx(experiment.duration)} 6V${axisY}`} stroke={C.label} strokeWidth={1.2} strokeDasharray="2 3" opacity={0.7} />
        {endLines.map((line, index) => (
          <text key={line} x={endOnLeft ? tx(experiment.duration) - 6 : tx(experiment.duration) + endGap} y={endY + index * 16} textAnchor={endOnLeft ? "end" : "start"} fill={C.label} fontSize={font} fontWeight={index === 0 ? 700 : 400}>{line}</text>
        ))}
      </g>
      <text x={8} y={eY + 4} fill={C.source} fontSize={font} fontWeight={700}>{compact ? copy.figure.emissionShort.split(" ")[0] : copy.figure.emissionShort}</text>
      <text x={8} y={rY + 4} fill={C.observer} fontSize={font} fontWeight={700}>{compact ? copy.figure.receptionShort.split(" ")[0] : copy.figure.receptionShort}</text>
      <path d={`M${left} ${eY}H${tx(experiment.duration)}M${left} ${rY}H${tx(experiment.duration)}`} stroke={C.axis} strokeWidth={1.2} />
      <path d={`M${left} ${axisY}H${w - right}`} stroke={C.axis} strokeWidth={1.2} />
      {ticks.map((tick) => (
        <g key={tick}>
          <path d={`M${tx(tick)} ${axisY}v5`} stroke={C.axis} />
          <text x={tx(tick)} y={axisY + 18} textAnchor="middle" fill={C.label} fontSize={compact ? 11 : 12}>{tick}</text>
        </g>
      ))}
      <text x={left - 8} y={axisY + 4} textAnchor="end" fill={C.label} fontSize={compact ? 11 : 12}>{copy.figure.axisT}</text>

      {connectors && received.map((r) => (
        <path key={`c${r.n}`} d={`M${tx(experiment.emissions[r.n].t)} ${eY}L${tx(r.t)} ${rY}`} stroke={isSel(r.n) ? C.pair : C.axis} strokeWidth={isSel(r.n) ? 2.2 : 1} opacity={isSel(r.n) ? 1 : 0.7} />
      ))}

      {guides && e0 && e1 && (
        <g stroke={C.pair} strokeWidth={2} fill="none" data-testid="emission-bracket">
          <path d={`M${tx(e0.t)} ${eY - 20}H${tx(e1.t)}M${tx(e0.t)} ${eY - 25}v10M${tx(e1.t)} ${eY - 25}v10`} />
          {numeric && <text x={(tx(e0.t) + tx(e1.t)) / 2} y={eY - 28} textAnchor="middle" fill={C.pair} stroke="none" fontSize={font} fontWeight={700}>{copy.figure.emissionInterval((e1.t - e0.t).toFixed(2))}</text>}
        </g>
      )}
      {guides && r0 && r1 && (
        <g stroke={C.pair} strokeWidth={2} fill="none" data-testid="reception-bracket">
          <path d={`M${tx(r0.t)} ${rY + 20}H${tx(r1.t)}M${tx(r0.t)} ${rY + 15}v10M${tx(r1.t)} ${rY + 15}v10`} />
          {numeric && <text x={Math.min(w - 70, Math.max(left + 48, (tx(r0.t) + tx(r1.t)) / 2))} y={rY + 37} textAnchor="middle" fill={C.pair} stroke="none" fontSize={font} fontWeight={700}>{copy.figure.receptionInterval((r1.t - r0.t).toFixed(2))}</text>}
        </g>
      )}

      {emitted.map((e) => {
        const x = tx(e.t);
        return (
          <g key={`e${e.n}`} data-event="emission" data-n={e.n}>
            <path d={`M${x} ${eY - 8}L${x + 8} ${eY}L${x} ${eY + 8}L${x - 8} ${eY}Z`} fill={C.source} stroke={isSel(e.n) ? C.pair : C.ended} strokeWidth={isSel(e.n) ? 2.6 : 1.2} />
            {e.n < experiment.receptions.length
              ? <circle cx={x} cy={eY} r={11} fill="transparent" style={{ cursor: "pointer" }} onClick={() => onSelectPair(Math.min(e.n, lastPair))}><title>{copy.figure.selectEmission(Math.min(e.n, lastPair))}</title></circle>
              : <circle cx={x} cy={eY} r={11} fill="transparent" data-unavailable="true" style={{ cursor: "not-allowed" }} onClick={() => onUnavailable(e.n)}><title>{copy.figure.notReceivable(e.n)}</title></circle>}
          </g>
        );
      })}
      {received.map((r) => {
        const x = tx(r.t);
        return (
          <g key={`r${r.n}`} data-event="reception" data-n={r.n}>
            <rect x={x - 7} y={rY - 7} width={14} height={14} fill={C.observer} stroke={isSel(r.n) ? C.pair : C.ended} strokeWidth={isSel(r.n) ? 2.6 : 1.2} />
            <circle cx={x} cy={rY} r={11} fill="transparent" style={{ cursor: "pointer" }} onClick={() => onSelectPair(Math.min(r.n, lastPair))}><title>{copy.figure.selectReception(Math.min(r.n, lastPair))}</title></circle>
          </g>
        );
      })}

      <g data-testid="band-numbers">{numberLabels(emitted, eY + 22, "e")}{numberLabels(received, rY - 13, "r")}</g>

      <g data-testid="time-cursor">
        <path d={`M${tx(time)} 6V${axisY}`} stroke={C.ink} strokeWidth={1.4} strokeDasharray="4 4" />
        <path d={`M${tx(time) - 5} 2h10l-5 7z`} fill={C.ink} />
      </g>
    </svg>
  );
}
