"use client";

import { useId } from "react";
import { observerPosition, observerSide, sourcePosition, wavefrontsAt, type DopplerExperiment } from "@/lib/science/doppler";
import { X_DOMAIN } from "@/models/doppler";
import type { DopplerCopy } from "./copy";
import { DOPPLER_COLORS as C } from "./palette";

const signed = (value: number) => (value === 0 ? "0" : `${value > 0 ? "+" : "−"}${Math.abs(value).toFixed(2)}`);

/** An arrow on the axis, length ∝ |u|; the speed range is ±0.5c so 0.5c is the longest. */
function Arrow({ x, y, u, color, max }: { x: number; y: number; u: number; color: string; max: number }) {
  if (u === 0) return null;
  const dir = u > 0 ? 1 : -1;
  const end = x + dir * Math.max(14, (Math.abs(u) / 0.5) * max);
  return (
    <g stroke={color} strokeWidth={2.4} fill="none">
      <path d={`M${x} ${y}H${end}`} />
      <path d={`M${end - dir * 7} ${y - 5}L${end} ${y}L${end - dir * 7} ${y + 5}`} />
    </g>
  );
}

/**
 * Wavefronts in the air's frame, at one instant. Every circle is a fixed centre (where its front was
 * emitted) and a radius c(t − tₙ); the same x scale applies to every setup, so two experiments can
 * be compared by eye. S and O are drawn with different shapes, labels and velocity arrows.
 */
export default function WavefrontView({
  experiment, time, pair, guides, numeric, labels, width, height, copy, summary, onSelectPair, onUnavailable,
}: {
  experiment: DopplerExperiment;
  time: number;
  pair: number;
  /** Highlight the selected pair and draw its measurement marks. Off while a prediction is open. */
  guides: boolean;
  /** Show values in the marks. */
  numeric: boolean;
  labels: boolean;
  width: number;
  height: number;
  copy: DopplerCopy;
  summary: string;
  onSelectPair: (n: number) => void;
  onUnavailable: (n: number) => void;
}) {
  const clipId = useId().replace(/:/g, "");
  const w = Math.max(280, width || 900);
  const h = Math.max(180, height || 300);
  const compact = w < 560;
  const pad = { left: 12, right: 12, top: 8, bottom: 28 };
  const unit = (w - pad.left - pad.right) / (X_DOMAIN.max - X_DOMAIN.min);
  const sx = (x: number) => pad.left + (x - X_DOMAIN.min) * unit;
  const axisY = pad.top + (h - pad.top - pad.bottom) * 0.55;
  const font = compact ? 11 : 13;

  const { setup } = experiment;
  const side = observerSide(setup);
  const fronts = wavefrontsAt(experiment, time);
  const frontA = fronts.find((f) => f.n === pair);
  const frontB = fronts.find((f) => f.n === pair + 1);
  const sPos = sx(sourcePosition(setup, time));
  const oPos = sx(observerPosition(setup, time));
  const lastPair = Math.max(0, experiment.receptions.length - 2);
  const ticks = [-12, -8, -4, 0, 4, 8, 12];

  let bracket: React.ReactNode = null;
  if (guides && frontA && frontB) {
    const xa = sx(frontA.centreX + side * frontA.radius);
    const xb = sx(frontB.centreX + side * frontB.radius);
    const y = axisY + 42;
    const mid = Math.min(w - 78, Math.max(78, (xa + xb) / 2));
    const spacing = side * ((frontA.centreX + side * frontA.radius) - (frontB.centreX + side * frontB.radius));
    bracket = (
      <g data-testid="spacing-bracket" stroke={C.pair} strokeWidth={2} fill="none">
        <path d={`M${xa} ${y - 6}V${y + 6}M${xb} ${y - 6}V${y + 6}M${xa} ${y}H${xb}`} />
        {numeric && (
          <text x={mid} y={y + 19} textAnchor="middle" fill={C.pair} stroke="none" fontSize={font} fontWeight={700}>
            {copy.figure.spacingShort(spacing.toFixed(2))}
          </text>
        )}
        {labels && (
          <g fill={C.pair} stroke="none" fontSize={font} fontWeight={700} textAnchor="middle">
            <text x={xa} y={axisY - 16}>{`#${pair}`}</text>
            <text x={xb} y={axisY + 28}>{`#${pair + 1}`}</text>
          </g>
        )}
      </g>
    );
  }

  const speed = (u: number) => (u === 0 ? copy.figure.atRest : `${signed(u)}c`);
  const labelGap = 8;
  const sAnchor = side > 0 ? "end" : "start";
  const oAnchor = side > 0 ? "start" : "end";
  const sLabelX = sPos + (side > 0 ? -labelGap : labelGap);
  const oLabelX = oPos + (side > 0 ? labelGap : -labelGap);

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      role="img"
      aria-label={summary}
      data-testid="wavefront-view"
      data-front-count={fronts.length}
      style={{ display: "block", touchAction: "manipulation" }}
    >
      <defs>
        <clipPath id={clipId}><rect x={pad.left} y={pad.top} width={w - pad.left - pad.right} height={h - pad.top - pad.bottom + 6} /></clipPath>
      </defs>
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={sx(tick)} y1={pad.top} x2={sx(tick)} y2={h - pad.bottom} stroke={C.grid} strokeWidth={1} />
          <text x={sx(tick)} y={h - 9} textAnchor="middle" fill={C.label} fontSize={compact ? 11 : 12}>{tick}</text>
        </g>
      ))}
      <text x={w - pad.right - 2} y={pad.top + 12} textAnchor="end" fill={C.label} fontSize={compact ? 11 : 12}>{copy.figure.axisX}</text>
      <line x1={pad.left} y1={axisY} x2={w - pad.right} y2={axisY} stroke={C.axis} strokeWidth={1.2} />

      <g clipPath={`url(#${clipId})`}>
        {fronts.map((f) => {
          const selected = guides && (f.n === pair || f.n === pair + 1);
          return (
            <g key={f.n}>
              <circle cx={sx(f.centreX)} cy={axisY} r={Math.max(0, f.radius * unit)} fill="none" stroke={selected ? C.pair : C.front} strokeWidth={selected ? 3.2 : 1.3} opacity={selected ? 1 : 0.7} data-front={f.n} />
              {/* A wide invisible stroke makes the thin ring easy to hit with a pointer or a finger. */}
              <circle
                cx={sx(f.centreX)} cy={axisY} r={Math.max(0, f.radius * unit)} fill="none" stroke="transparent" strokeWidth={14}
                style={{ cursor: f.n < experiment.receptions.length ? "pointer" : "not-allowed", pointerEvents: "stroke" }}
                onClick={() => (f.n < experiment.receptions.length ? onSelectPair(Math.min(f.n, lastPair)) : onUnavailable(f.n))}
              />
              <circle cx={sx(f.centreX)} cy={axisY} r={2.6} fill={C.ended} stroke={C.front} strokeWidth={1} />
            </g>
          );
        })}
        {bracket}
        <Arrow x={sPos} y={axisY - 30} u={setup.sourceVelocity} color={C.source} max={compact ? 36 : 56} />
        <Arrow x={oPos} y={axisY - 30} u={setup.observerVelocity} color={C.observer} max={compact ? 36 : 56} />
        <path d={`M${sPos} ${axisY - 10}L${sPos + 10} ${axisY}L${sPos} ${axisY + 10}L${sPos - 10} ${axisY}Z`} fill={C.source} stroke={C.ended} strokeWidth={1.6} data-testid="source-marker" />
        <rect x={oPos - 8.5} y={axisY - 8.5} width={17} height={17} fill={C.observer} stroke={C.ended} strokeWidth={1.6} data-testid="observer-marker" />
        <text x={sLabelX} y={axisY - 44} textAnchor={sAnchor} fill={C.source} fontSize={font} fontWeight={700}>{`S ${speed(setup.sourceVelocity)}`}</text>
        <text x={oLabelX} y={axisY - 44} textAnchor={oAnchor} fill={C.observer} fontSize={font} fontWeight={700}>{`O ${speed(setup.observerVelocity)}`}</text>
      </g>
    </svg>
  );
}
