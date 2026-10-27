"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { visibleRgb, type Direction, type Region, type Transition } from "@/lib/science/hydrogen";
import type { HydrogenReadout, HydrogenState } from "@/models/hydrogen";
import { balmerLineName } from "@/models/hydrogen-learning";
import { VISIBLE_MIN_NM, labelledLines, niceTicks, spectrumWindow, visibleOverlap, type SpectrumRangeMode } from "@/components/hydrogen/spectrum";

/** Shared SVG views for the hydrogen lab. Presentation only: all numbers arrive through props. */

export const SERIES_ZH: Record<string, string> = {
  Lyman: "萊曼系",
  Balmer: "巴耳末系",
  Paschen: "帕申系",
  Brackett: "布拉克系",
  Pfund: "蒲芬德系",
  Humphreys: "漢弗萊系",
};
export const REGION_ZH: Record<Region, string> = { ultraviolet: "紫外線", visible: "可見光", infrared: "紅外線" };
/** Photons outside the visible band have no colour; these stand-ins only mark which side of it they are on. */
const REGION_FALLBACK: Record<Region, string> = { ultraviolet: "#b79cff", visible: "#f4f1e8", infrared: "#ff8a78" };

export const rgb = ([r, g, b]: [number, number, number]) => `rgb(${r} ${g} ${b})`;

export function photonColor(t: Pick<Transition, "wavelength" | "region">): string {
  const color = visibleRgb(t.wavelength);
  return color ? rgb(color) : REGION_FALLBACK[t.region];
}

export function seriesLabel(name: string | undefined) {
  return name ? `${SERIES_ZH[name] ?? name}（${name}）` : "高階系列";
}

export function formatWavelength(nm: number) {
  return nm >= 1000 ? `${(nm / 1000).toFixed(3)} μm` : `${nm.toFixed(nm < 200 ? 2 : 1)} nm`;
}

export function formatFrequency(hz: number) {
  return `${(hz / 1e12).toFixed(0)} THz`;
}

const SIZE = 480;
const CENTER = SIZE / 2;
const ORBIT_EDGE = 228;


function onActivate(action: () => void) {
  return (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      action();
    }
  };
}

/** Props that make an SVG group a keyboard-operable toggle button. */
function pressable(action: () => void, label: string, pressed: boolean) {
  return {
    role: "button",
    tabIndex: 0,
    "aria-label": label,
    "aria-pressed": pressed,
    style: { cursor: "pointer", outline: "none" },
    onClick: action,
    onKeyDown: onActivate(action),
  } as const;
}

export type OrbitScale = "true" | "schematic";

/**
 * True scale draws rₙ ∝ n², so the largest shown orbit fills the frame and the inner ones shrink
 * with it. Schematic scale draws rₙ ∝ n so every orbit stays legible; it says so on the diagram.
 */
export function OrbitView({ state, readout, scale, onPlace }: { state: HydrogenState; readout: HydrogenReadout; scale: OrbitScale; onPlace?: (n: number) => void }) {
  const radiusPx = (n: number) => (scale === "true" ? (n * n * ORBIT_EDGE) / (state.maxN * state.maxN) : (n * ORBIT_EDGE) / state.maxN);
  const nucleusRadius = Math.max(2, Math.min(5, radiusPx(1) * 0.5));
  const electronRadius = radiusPx(readout.electron.n);
  const ex = CENTER + electronRadius * Math.cos(state.orbitAngle);
  const ey = CENTER - electronRadius * Math.sin(state.orbitAngle);

  const photonAngle = -Math.PI / 4;
  const lowerRadius = radiusPx(state.lower);
  let photonX = 0;
  let photonY = 0;
  if (state.photonProgress !== null) {
    const travel = state.mode === "emission" ? state.photonProgress : 1 - state.photonProgress;
    const r = lowerRadius + travel * (SIZE / 2 - 6 - lowerRadius);
    photonX = CENTER + r * Math.cos(photonAngle);
    photonY = CENTER + r * Math.sin(photonAngle);
  }

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" height="100%" role="img" aria-label={`玻耳氫原子軌道圖，電子在 n = ${state.electronLevel} 軌道`}>
      {readout.levels.map(({ n }) => {
        const r = radiusPx(n);
        const active = n === state.electronLevel;
        const inTransition = n === state.upper || n === state.lower;
        const label = n === state.maxN || r > 20;
        return (
          <g key={n}>
            <circle
              cx={CENTER}
              cy={CENTER}
              r={r}
              fill="none"
              stroke={active ? "#5ed8c3" : inTransition ? "#7fa7be" : "#3d6482"}
              strokeWidth={active ? 1.8 : 1.1}
              strokeDasharray={active ? undefined : "3 4"}
            />
            {/* Wide invisible stroke so a thin orbit is easy to click. */}
            <circle cx={CENTER} cy={CENTER} r={r} fill="none" stroke="transparent" strokeWidth={14} style={{ cursor: onPlace ? "pointer" : "default" }} onClick={onPlace ? () => onPlace(n) : undefined} />
            {label ? (
              <text x={CENTER + r * 0.7071 + 4} y={CENTER + r * 0.7071 + 12} fill={active ? "#5ed8c3" : "#9fc2d3"} fontSize={15} fontWeight={700}>
                n={n}
              </text>
            ) : null}
          </g>
        );
      })}
      <circle cx={CENTER} cy={CENTER} r={nucleusRadius} fill="#e0795f" />
      <text x={CENTER + 9} y={CENTER - 8} fill="#e0a08f" fontSize={13}>p⁺</text>

      {state.photonProgress !== null ? (
        <g aria-label="光子">
          <circle cx={photonX} cy={photonY} r={9} fill={photonColor(readout.selected)} opacity={0.28} />
          <circle
            cx={photonX}
            cy={photonY}
            r={5}
            fill={photonColor(readout.selected)}
            stroke={readout.selected.region === "visible" ? "none" : "#f4f1e8"}
            strokeDasharray={readout.selected.region === "visible" ? undefined : "2 2"}
          />
          <text x={photonX - 8} y={photonY - 14} textAnchor="end" fill="#d4e0e5" fontSize={14}>
            {formatWavelength(readout.selected.wavelength)}
          </text>
        </g>
      ) : null}

      {scale === "schematic" ? (
        <text x={10} y={SIZE - 10} fill="#f2c66d" fontSize={14}>示意比例：半徑 ∝ n（非 n²）</text>
      ) : null}

      <circle cx={ex} cy={ey} r={7} fill="#f2c66d" stroke="#fff3cf" strokeWidth={1.5} />
      <text x={ex} y={ey + 3.5} textAnchor="middle" fill="#3a2a05" fontSize={11} fontWeight={700}>e⁻</text>
    </svg>
  );
}

const ENERGY_TOP = 60;
const ENERGY_SPAN = 360;
const LABEL_GAP = 14;

export function EnergyView({
  state,
  readout,
  onPlace,
  onPick,
}: {
  state: HydrogenState;
  readout: HydrogenReadout;
  /** Omit both handlers for a read-only diagram: nothing is focusable or clickable. */
  onPlace?: (n: number) => void;
  onPick?: (upper: number, lower: number) => void;
}) {
  const yOf = (energy: number) => ENERGY_TOP + (-energy / Math.abs(readout.levels[0].energy)) * ENERGY_SPAN;
  const levelY = readout.levels.map((level) => yOf(level.energy));

  // Crowded levels near the ionisation limit: spread their labels downward from the top, joined by leader lines.
  const labelY: number[] = [];
  for (let i = levelY.length - 1; i >= 0; i -= 1) {
    const below = i === levelY.length - 1 ? -Infinity : labelY[i + 1] + LABEL_GAP;
    labelY[i] = Math.max(levelY[i], below);
  }

  const x0 = 150;
  const x1 = 392;
  const lines = readout.series;
  const arrowX = (index: number) => (lines.length <= 1 ? (x0 + x1) / 2 : x0 + 30 + (index * (x1 - x0 - 60)) / (lines.length - 1));

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" height="100%" role="group" aria-label="氫原子能階圖">
      <line x1={x0 - 20} y1={ENERGY_TOP} x2={x1 + 20} y2={ENERGY_TOP} stroke="#f2c66d" strokeWidth={1.4} strokeDasharray="6 4" />
      <text x={x1 + 20} y={ENERGY_TOP - 8} textAnchor="end" fill="#f2c66d" fontSize={14}>E = 0（游離）</text>
      <line x1={64} y1={ENERGY_TOP - 20} x2={64} y2={ENERGY_TOP + ENERGY_SPAN + 20} stroke="#4a7692" strokeWidth={1} />
      <text x={64} y={ENERGY_TOP - 28} textAnchor="middle" fill="#9fc2d3" fontSize={14}>E（eV）</text>

      {lines.map((line, index) => {
        const x = arrowX(index);
        const yTop = levelY[line.upper - 1];
        const yBottom = levelY[line.lower - 1];
        const selected = line.upper === state.upper && line.lower === state.lower;
        const color = photonColor(line);
        const [fromY, toY] = state.mode === "emission" ? [yTop, yBottom] : [yBottom, yTop];
        const head = toY > fromY ? -9 : 9;
        return (
          <g
            key={`${line.upper}-${line.lower}`}
            {...(onPick ? pressable(() => onPick(line.upper, line.lower), `選擇躍遷 ${line.upper} 到 ${line.lower}，${formatWavelength(line.wavelength)}`, selected) : {})}
          >
            <line x1={x} y1={fromY} x2={x} y2={toY + head * 0.2} stroke="transparent" strokeWidth={16} />
            <line x1={x} y1={fromY} x2={x} y2={toY + head * 0.2} stroke={color} strokeWidth={selected ? 3.2 : 1.6} opacity={selected ? 1 : 0.55} />
            <path d={`M ${x - 5} ${toY + head} L ${x} ${toY} L ${x + 5} ${toY + head}`} fill="none" stroke={color} strokeWidth={selected ? 3.2 : 1.6} opacity={selected ? 1 : 0.55} />
          </g>
        );
      })}

      {readout.levels.map(({ n, energy }, i) => {
        const active = n === state.electronLevel;
        const y = levelY[i];
        return (
          <g
            key={n}
            {...(onPlace ? pressable(() => onPlace(n), `把電子放到 n = ${n}，能量 ${energy.toFixed(2)} eV`, active) : {})}
          >
            <line x1={x0 - 20} y1={y} x2={x1 + 20} y2={y} stroke="transparent" strokeWidth={10} />
            <line x1={x0 - 20} y1={y} x2={x1 + 20} y2={y} stroke={active ? "#5ed8c3" : "#7fa7be"} strokeWidth={active ? 3 : 1.8} />
            {Math.abs(labelY[i] - y) > 1 ? <polyline points={`${x0 - 20},${y} ${x0 - 30},${y} ${x0 - 36},${labelY[i]} ${x0 - 42},${labelY[i]}`} fill="none" stroke="#4a7692" strokeWidth={0.8} /> : null}
            <text x={x0 - 46} y={labelY[i] + 4} textAnchor="end" fill={active ? "#5ed8c3" : "#c9dae2"} fontSize={16} fontWeight={active ? 700 : 400}>
              n={n}　{energy.toFixed(2)}
            </text>
            {active ? <circle cx={x1 + 4} cy={y - 9} r={6} fill="#f2c66d" stroke="#fff3cf" /> : null}
          </g>
        );
      })}
    </svg>
  );
}

/** Width of an element in CSS px, so SVG text can be drawn at its real size instead of scaled down with a fixed viewBox. */
function useElementWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, Math.round(entry.contentRect.width))));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

const STRIP_TOP = 44;
const STRIP_H = 56;
/** Dim stand-ins for the part of a continuum the eye cannot see. */
const CONTINUUM_UV = "#2a2050";
const CONTINUUM_IR = "#40201c";

export type StripMarker = { nm: number; label: string };

export function SpectrumStrip({
  readout,
  mode,
  range,
  selectedUpper,
  onPick,
  emphasisNm,
  levelTags = false,
  marker,
}: {
  readout: Pick<HydrogenReadout, "series" | "seriesLimit">;
  mode: Direction;
  range: SpectrumRangeMode;
  /** The upper level of the highlighted line, or null for none. */
  selectedUpper: number | null;
  /** Omit for a read-only strip: lines are plain graphics with no level names in their accessible text. */
  onPick?: (t: Transition) => void;
  /** Wavelength of a line to emphasise (the guided target), matched by value. */
  emphasisNm?: number;
  /** Print level names (n→2, Hβ) on lines. Off while the answer is still hidden. */
  levelTags?: boolean;
  marker?: StripMarker;
}) {
  const [hostRef, width] = useElementWidth<HTMLDivElement>(720);
  const absorption = mode === "absorption";
  const win = spectrumWindow(range, [...readout.series.map((line) => line.wavelength), readout.seriesLimit, ...(marker ? [marker.nm] : [])]);
  const x = (nm: number) => ((nm - win.min) / (win.max - win.min)) * width;
  const inWindow = (nm: number) => nm >= win.min && nm <= win.max;
  const shown = readout.series.filter((line) => inWindow(line.wavelength));
  const hidden = readout.series.length - shown.length;
  const overlap = visibleOverlap(win);
  const ticks = niceTicks(win.min, win.max, Math.max(3, Math.round(width / 110)));
  const isEmphasis = (nm: number) => emphasisNm !== undefined && Math.abs(nm - emphasisNm) < 1e-6;
  const keepLabel = labelledLines(
    shown.map((line) => x(line.wavelength)),
    40,
    shown.flatMap((line, i) => (isEmphasis(line.wavelength) || line.upper === selectedUpper ? [i] : [])),
  );
  const sample = (nm: number) => {
    const color = visibleRgb(nm);
    return color ? rgb(color) : nm < VISIBLE_MIN_NM ? CONTINUUM_UV : CONTINUUM_IR;
  };
  const stops = Array.from({ length: 48 }, (_, i) => win.min + (i * (win.max - win.min)) / 47);
  const bottom = STRIP_TOP + STRIP_H;
  const height = bottom + (marker ? 104 : 76);
  const tickY = marker ? bottom + 78 : bottom + 50;

  return (
    <div ref={hostRef} className="hydrogen-strip-host">
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="group" aria-label={absorption ? "吸收光譜：連續光譜中的暗線" : "發射光譜：暗背景上的亮線"}>
        <defs>
          <linearGradient id="hydrogen-continuum" x1="0" x2="1" y1="0" y2="0">
            {stops.map((nm) => (
              <stop key={nm} offset={`${((nm - win.min) / (win.max - win.min)) * 100}%`} stopColor={sample(nm)} />
            ))}
          </linearGradient>
        </defs>
        <rect x={0} y={STRIP_TOP} width={width} height={STRIP_H} rx={3} fill={absorption ? "url(#hydrogen-continuum)" : "#050d14"} />

        {inWindow(readout.seriesLimit) ? (
          <line x1={x(readout.seriesLimit)} y1={STRIP_TOP} x2={x(readout.seriesLimit)} y2={bottom} stroke="#f2c66d" strokeWidth={1.5} strokeDasharray="4 4" />
        ) : null}

        {shown.map((line, i) => {
          const lx = x(line.wavelength);
          const selected = line.upper === selectedUpper;
          const emphasised = selected || isEmphasis(line.wavelength);
          const lineColor = absorption ? "#050d14" : photonColor(line);
          const wavelengthText = line.wavelength.toFixed(line.wavelength < 200 ? 1 : 0);
          const clampX = Math.min(width - 22, Math.max(22, lx));
          const body = (
            <>
              <rect x={lx - 11} y={STRIP_TOP - 4} width={22} height={STRIP_H + 8} fill="transparent" />
              {emphasised ? <rect x={lx - 6} y={STRIP_TOP} width={12} height={STRIP_H} fill="none" stroke="#f2c66d" strokeWidth={1.4} /> : null}
              <rect x={lx - (emphasised ? 2.5 : 1.5)} y={STRIP_TOP} width={emphasised ? 5 : 3} height={STRIP_H} fill={lineColor} />
              {keepLabel[i] ? (
                <text x={clampX} y={STRIP_TOP - 8} textAnchor="middle" fill={emphasised ? "#f2c66d" : "#c9dae2"} fontSize={14} fontWeight={emphasised ? 700 : 400}>
                  {wavelengthText}
                </text>
              ) : null}
              {levelTags && keepLabel[i] ? (
                <text x={clampX} y={STRIP_TOP - 24} textAnchor="middle" fill="#9fc2d3" fontSize={12}>
                  {balmerTag(line)}
                </text>
              ) : null}
            </>
          );
          if (!onPick) {
            const name = levelTags ? `${balmerTag(line)}，${formatWavelength(line.wavelength)}` : `譜線 ${formatWavelength(line.wavelength)}${isEmphasis(line.wavelength) ? "（要解釋的那一條）" : ""}`;
            return (
              <g key={line.upper} role="img" aria-label={name}>
                {body}
              </g>
            );
          }
          return (
            <g key={line.upper} {...pressable(() => onPick(line), `選擇躍遷 ${line.upper} 到 ${line.lower}，${formatWavelength(line.wavelength)}，${REGION_ZH[line.region]}`, selected)}>
              {body}
            </g>
          );
        })}

        {marker && inWindow(marker.nm) ? (
          <g aria-label={marker.label}>
            <line x1={x(marker.nm)} y1={STRIP_TOP} x2={x(marker.nm)} y2={bottom + 12} stroke="#5ed8c3" strokeWidth={2} strokeDasharray="5 3" />
            <path d={`M ${x(marker.nm) - 6} ${bottom + 20} L ${x(marker.nm)} ${bottom + 11} L ${x(marker.nm) + 6} ${bottom + 20} Z`} fill="#5ed8c3" />
            <text x={Math.min(width - 4, Math.max(4, x(marker.nm)))} y={bottom + 38} textAnchor={x(marker.nm) > width - 90 ? "end" : x(marker.nm) < 90 ? "start" : "middle"} fill="#5ed8c3" fontSize={14} fontWeight={700}>
              {marker.label}
            </text>
          </g>
        ) : null}

        {overlap ? (
          <g aria-label="可見光波段">
            <defs>
              <linearGradient id="hydrogen-band" x1={x(overlap.min)} x2={x(overlap.max)} y1="0" y2="0" gradientUnits="userSpaceOnUse">
                {Array.from({ length: 24 }, (_, i) => overlap.min + (i * (overlap.max - overlap.min)) / 23).map((nm) => (
                  <stop key={nm} offset={`${((nm - overlap.min) / (overlap.max - overlap.min)) * 100}%`} stopColor={sample(nm)} />
                ))}
              </linearGradient>
            </defs>
            <rect x={x(overlap.min)} y={bottom + (marker ? 44 : 4)} width={x(overlap.max) - x(overlap.min)} height={5} fill="url(#hydrogen-band)" />
            {x(overlap.max) - x(overlap.min) > 150 && !marker ? (
              <text x={(x(overlap.min) + x(overlap.max)) / 2} y={bottom + 24} textAnchor="middle" fill="#9fc2d3" fontSize={13}>可見光 380–750 nm</text>
            ) : null}
          </g>
        ) : null}

        {ticks.map((nm) => (
          <g key={nm}>
            <line x1={x(nm)} y1={bottom} x2={x(nm)} y2={bottom + 3} stroke="#8fa6b3" />
            <text x={Math.min(width - 16, Math.max(16, x(nm)))} y={tickY} textAnchor="middle" fill="#9fc2d3" fontSize={13}>{nm}</text>
          </g>
        ))}
        <text x={width} y={tickY + 20} textAnchor="end" fill="#8fa6b3" fontSize={13}>波長（nm）</text>

        {hidden > 0 ? (
          <text x={width - 8} y={STRIP_TOP + STRIP_H / 2 + 5} textAnchor="end" fill="#f2c66d" fontSize={14}>另有 {hidden} 條譜線在此範圍之外</text>
        ) : null}
        {shown.length === 0 && hidden === 0 ? (
          <text x={width / 2} y={STRIP_TOP + STRIP_H / 2 + 5} textAnchor="middle" fill="#8fa6b3" fontSize={15}>此系列在目前顯示的能階中沒有譜線</text>
        ) : null}
      </svg>
    </div>
  );
}

/** "Hβ 4→2" for the Balmer series, "n→1" style otherwise. Only called where level names may be shown. */
function balmerTag(line: Transition) {
  const name = line.lower === 2 ? balmerLineName(line.upper) : null;
  return `${name ? `${name} ` : ""}${line.upper}→${line.lower}`;
}
