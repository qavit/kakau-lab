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
  experiment, time, pair, guides, numeric, labels, connectors, width, height, copy, summary, onSelectPair,
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
}) {
  const w = Math.max(280, width || 900);
  const h = Math.max(160, height || 184);
  const compact = w < 560;
  const left = compact ? 62 : 104;
  const right = 16;
  const tx = (t: number) => left + (t / MAX_DURATION) * (w - left - right);
  const perUnit = (w - left - right) / MAX_DURATION;
  const eY = Math.round(h * 0.32);
  const rY = Math.round(h * 0.6);
  const axisY = h - 26;
  const font = compact ? 11 : 12;
  const showAll = labels && perUnit * 0.75 >= 17;
  const lastPair = Math.max(0, experiment.receptions.length - 2);
  const emitted = experiment.emissions.filter((e) => e.t <= time + 1e-9);
  const received = experiment.receptions.filter((r) => r.t <= time + 1e-9);
  const isSel = (n: number) => guides && (n === pair || n === pair + 1);

  const e0 = emitted.find((e) => e.n === pair);
  const e1 = emitted.find((e) => e.n === pair + 1);
  const r0 = received.find((r) => r.n === pair);
  const r1 = received.find((r) => r.n === pair + 1);
  const endLabel = experiment.endReason === "before-coincidence" ? copy.figure.endCoincide : copy.figure.endMarker;
  // Put the label on whichever side of the end line has room for it.
  const endLabelOnLeft = (w - right - tx(experiment.duration)) < endLabel.length * font * 0.95;
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
        <text
          x={endLabelOnLeft ? tx(experiment.duration) - 6 : tx(experiment.duration) + 6}
          y={20}
          textAnchor={endLabelOnLeft ? "end" : "start"}
          fill={C.label}
          fontSize={font}
        >{endLabel}</text>
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
      <text x={w - right} y={axisY - 6} textAnchor="end" fill={C.label} fontSize={compact ? 11 : 12}>{copy.figure.axisT}</text>

      {connectors && received.map((r) => (
        <path key={`c${r.n}`} d={`M${tx(experiment.emissions[r.n].t)} ${eY}L${tx(r.t)} ${rY}`} stroke={isSel(r.n) ? C.pair : C.axis} strokeWidth={isSel(r.n) ? 2.2 : 1} opacity={isSel(r.n) ? 1 : 0.7} />
      ))}

      {guides && e0 && e1 && (
        <g stroke={C.pair} strokeWidth={2} fill="none" data-testid="emission-bracket">
          <path d={`M${tx(e0.t)} ${eY - 22}H${tx(e1.t)}M${tx(e0.t)} ${eY - 27}v10M${tx(e1.t)} ${eY - 27}v10`} />
          {numeric && <text x={(tx(e0.t) + tx(e1.t)) / 2} y={eY - 31} textAnchor="middle" fill={C.pair} stroke="none" fontSize={font} fontWeight={700}>{copy.figure.emissionInterval((e1.t - e0.t).toFixed(2))}</text>}
        </g>
      )}
      {guides && r0 && r1 && (
        <g stroke={C.pair} strokeWidth={2} fill="none" data-testid="reception-bracket">
          <path d={`M${tx(r0.t)} ${rY + 22}H${tx(r1.t)}M${tx(r0.t)} ${rY + 17}v10M${tx(r1.t)} ${rY + 17}v10`} />
          {numeric && <text x={Math.min(w - 70, Math.max(left + 48, (tx(r0.t) + tx(r1.t)) / 2))} y={rY + 40} textAnchor="middle" fill={C.pair} stroke="none" fontSize={font} fontWeight={700}>{copy.figure.receptionInterval((r1.t - r0.t).toFixed(2))}</text>}
        </g>
      )}

      {emitted.map((e) => {
        const x = tx(e.t);
        return (
          <g key={`e${e.n}`} data-event="emission" data-n={e.n}>
            <path d={`M${x} ${eY - 8}L${x + 8} ${eY}L${x} ${eY + 8}L${x - 8} ${eY}Z`} fill={C.source} stroke={isSel(e.n) ? C.pair : C.ended} strokeWidth={isSel(e.n) ? 2.6 : 1.2} />
            {labels && (isSel(e.n) || showAll) && <text x={x} y={eY + 22} textAnchor="middle" fill={isSel(e.n) ? C.pair : C.label} fontSize={isSel(e.n) ? font + 1 : font - 1} fontWeight={isSel(e.n) ? 700 : 400}>{e.n}</text>}
            <circle cx={x} cy={eY} r={11} fill="transparent" style={{ cursor: "pointer" }} onClick={() => onSelectPair(Math.min(e.n, lastPair))}><title>{copy.figure.selectEmission(Math.min(e.n, lastPair))}</title></circle>
          </g>
        );
      })}
      {received.map((r) => {
        const x = tx(r.t);
        return (
          <g key={`r${r.n}`} data-event="reception" data-n={r.n}>
            <rect x={x - 7} y={rY - 7} width={14} height={14} fill={C.observer} stroke={isSel(r.n) ? C.pair : C.ended} strokeWidth={isSel(r.n) ? 2.6 : 1.2} />
            {labels && (isSel(r.n) || showAll) && <text x={x} y={rY - 13} textAnchor="middle" fill={isSel(r.n) ? C.pair : C.label} fontSize={isSel(r.n) ? font + 1 : font - 1} fontWeight={isSel(r.n) ? 700 : 400}>{r.n}</text>}
            <circle cx={x} cy={rY} r={11} fill="transparent" style={{ cursor: "pointer" }} onClick={() => onSelectPair(Math.min(r.n, lastPair))}><title>{copy.figure.selectReception(Math.min(r.n, lastPair))}</title></circle>
          </g>
        );
      })}

      <g data-testid="time-cursor">
        <path d={`M${tx(time)} 6V${axisY}`} stroke={C.ink} strokeWidth={1.4} strokeDasharray="4 4" />
        <path d={`M${tx(time) - 5} 2h10l-5 7z`} fill={C.ink} />
      </g>
    </svg>
  );
}
