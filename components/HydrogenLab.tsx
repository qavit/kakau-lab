"use client";

import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { Atom, Pause, Play, RotateCcw, Zap } from "lucide-react";
import { visibleRgb, type Direction, type Region, type Transition } from "@/lib/science/hydrogen";
import {
  HYDROGEN_PRESETS,
  MAX_SHOWN_LEVELS,
  MIN_SHOWN_LEVELS,
  advanceHydrogen,
  deriveHydrogenModel,
  fireTransition,
  initialHydrogenState,
  minimumShownLevels,
  placeElectron,
  selectTransition,
  setMaxLevel,
  type HydrogenReadout,
  type HydrogenState,
} from "@/models/hydrogen";
import {
  VISIBLE_MIN_NM,
  labelledLines,
  niceTicks,
  spectrumWindow,
  visibleOverlap,
  type SpectrumRangeMode,
} from "@/components/hydrogen/spectrum";
import KakauLabMark from "@/components/KakauLabMark";
import ThemeToggle from "@/components/ThemeToggle";

const SERIES_ZH: Record<string, string> = {
  Lyman: "萊曼系",
  Balmer: "巴耳末系",
  Paschen: "帕申系",
  Brackett: "布拉克系",
  Pfund: "蒲芬德系",
  Humphreys: "漢弗萊系",
};
const REGION_ZH: Record<Region, string> = { ultraviolet: "紫外線", visible: "可見光", infrared: "紅外線" };
/** Photons outside the visible band have no colour; these stand-ins only mark which side of it they are on. */
const REGION_FALLBACK: Record<Region, string> = { ultraviolet: "#b79cff", visible: "#f4f1e8", infrared: "#ff8a78" };

const rgb = ([r, g, b]: [number, number, number]) => `rgb(${r} ${g} ${b})`;

function photonColor(t: Pick<Transition, "wavelength" | "region">): string {
  const color = visibleRgb(t.wavelength);
  return color ? rgb(color) : REGION_FALLBACK[t.region];
}

function seriesLabel(name: string | undefined) {
  return name ? `${SERIES_ZH[name] ?? name}（${name}）` : "高階系列";
}

function formatWavelength(nm: number) {
  return nm >= 1000 ? `${(nm / 1000).toFixed(3)} μm` : `${nm.toFixed(nm < 200 ? 2 : 1)} nm`;
}

function formatFrequency(hz: number) {
  return `${(hz / 1e12).toFixed(0)} THz`;
}

const SIZE = 480;
const CENTER = SIZE / 2;
const ORBIT_EDGE = 228;

type OrbitScale = "true" | "schematic";

/**
 * True scale draws rₙ ∝ n², so the largest shown orbit fills the frame and the inner ones shrink
 * with it. Schematic scale draws rₙ ∝ n so every orbit stays legible; it says so on the diagram.
 */
function OrbitView({ state, readout, scale, onPlace }: { state: HydrogenState; readout: HydrogenReadout; scale: OrbitScale; onPlace: (n: number) => void }) {
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
            <circle cx={CENTER} cy={CENTER} r={r} fill="none" stroke="transparent" strokeWidth={14} style={{ cursor: "pointer" }} onClick={() => onPlace(n)} />
            {label ? (
              <text x={CENTER + r * 0.7071 + 4} y={CENTER + r * 0.7071 + 12} fill={active ? "#5ed8c3" : "#9fc2d3"} fontSize={12} fontWeight={700}>
                n={n}
              </text>
            ) : null}
          </g>
        );
      })}
      <circle cx={CENTER} cy={CENTER} r={nucleusRadius} fill="#e0795f" />
      <text x={CENTER + 9} y={CENTER - 8} fill="#e0a08f" fontSize={11}>p⁺</text>

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
          <text x={photonX - 8} y={photonY - 14} textAnchor="end" fill="#d4e0e5" fontSize={12}>
            {formatWavelength(readout.selected.wavelength)}
          </text>
        </g>
      ) : null}

      {scale === "schematic" ? (
        <text x={10} y={SIZE - 10} fill="#f2c66d" fontSize={12}>示意比例：半徑 ∝ n（非 n²）</text>
      ) : null}

      <circle cx={ex} cy={ey} r={7} fill="#f2c66d" stroke="#fff3cf" strokeWidth={1.5} />
      <text x={ex} y={ey + 3.5} textAnchor="middle" fill="#3a2a05" fontSize={10} fontWeight={700}>e⁻</text>
    </svg>
  );
}

const ENERGY_TOP = 60;
const ENERGY_SPAN = 360;
const LABEL_GAP = 14;

function EnergyView({
  state,
  readout,
  onPlace,
  onPick,
}: {
  state: HydrogenState;
  readout: HydrogenReadout;
  onPlace: (n: number) => void;
  onPick: (upper: number, lower: number) => void;
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
      <text x={x1 + 20} y={ENERGY_TOP - 8} textAnchor="end" fill="#f2c66d" fontSize={12}>E = 0（游離）</text>
      <line x1={64} y1={ENERGY_TOP - 20} x2={64} y2={ENERGY_TOP + ENERGY_SPAN + 20} stroke="#4a7692" strokeWidth={1} />
      <text x={64} y={ENERGY_TOP - 28} textAnchor="middle" fill="#9fc2d3" fontSize={12}>E（eV）</text>

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
            role="button"
            tabIndex={0}
            aria-label={`選擇躍遷 ${line.upper} 到 ${line.lower}，${formatWavelength(line.wavelength)}`}
            aria-pressed={selected}
            style={{ cursor: "pointer", outline: "none" }}
            onClick={() => onPick(line.upper, line.lower)}
            onKeyDown={(event: KeyboardEvent) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onPick(line.upper, line.lower);
              }
            }}
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
            role="button"
            tabIndex={0}
            aria-label={`把電子放到 n = ${n}，能量 ${energy.toFixed(2)} eV`}
            aria-pressed={active}
            style={{ cursor: "pointer", outline: "none" }}
            onClick={() => onPlace(n)}
            onKeyDown={(event: KeyboardEvent) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onPlace(n);
              }
            }}
          >
            <line x1={x0 - 20} y1={y} x2={x1 + 20} y2={y} stroke="transparent" strokeWidth={10} />
            <line x1={x0 - 20} y1={y} x2={x1 + 20} y2={y} stroke={active ? "#5ed8c3" : "#7fa7be"} strokeWidth={active ? 3 : 1.8} />
            {Math.abs(labelY[i] - y) > 1 ? <polyline points={`${x0 - 20},${y} ${x0 - 30},${y} ${x0 - 36},${labelY[i]} ${x0 - 42},${labelY[i]}`} fill="none" stroke="#4a7692" strokeWidth={0.8} /> : null}
            <text x={x0 - 46} y={labelY[i] + 4} textAnchor="end" fill={active ? "#5ed8c3" : "#c9dae2"} fontSize={12} fontWeight={active ? 700 : 400}>
              n={n}　{energy.toFixed(2)}
            </text>
            {active ? <circle cx={x1 + 4} cy={y - 9} r={6} fill="#f2c66d" stroke="#fff3cf" /> : null}
          </g>
        );
      })}
    </svg>
  );
}

const STRIP_W = 1000;
const STRIP_TOP = 28;
const STRIP_H = 50;
/** Dim stand-ins for the part of a continuum the eye cannot see. */
const CONTINUUM_UV = "#2a2050";
const CONTINUUM_IR = "#40201c";

function onActivate(action: () => void) {
  return (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      action();
    }
  };
}

function SpectrumStrip({
  readout,
  mode,
  range,
  onPick,
}: {
  readout: HydrogenReadout;
  mode: Direction;
  range: SpectrumRangeMode;
  onPick: (t: Transition) => void;
}) {
  const absorption = mode === "absorption";
  const win = spectrumWindow(range, [...readout.series.map((line) => line.wavelength), readout.seriesLimit]);
  const x = (nm: number) => ((nm - win.min) / (win.max - win.min)) * STRIP_W;
  const inWindow = (nm: number) => nm >= win.min && nm <= win.max;
  const shown = readout.series.filter((line) => inWindow(line.wavelength));
  const hidden = readout.series.length - shown.length;
  const overlap = visibleOverlap(win);
  const ticks = niceTicks(win.min, win.max);
  const keepLabel = labelledLines(shown.map((line) => x(line.wavelength)), 62);
  const sample = (nm: number) => {
    const color = visibleRgb(nm);
    return color ? rgb(color) : nm < VISIBLE_MIN_NM ? CONTINUUM_UV : CONTINUUM_IR;
  };
  const stops = Array.from({ length: 48 }, (_, i) => win.min + (i * (win.max - win.min)) / 47);

  return (
    <svg viewBox={`0 0 ${STRIP_W} 124`} width="100%" role="group" aria-label={absorption ? "吸收光譜：連續光譜中的暗線" : "發射光譜：暗背景上的亮線"}>
      <defs>
        <linearGradient id="hydrogen-continuum" x1="0" x2="1" y1="0" y2="0">
          {stops.map((nm) => (
            <stop key={nm} offset={`${((nm - win.min) / (win.max - win.min)) * 100}%`} stopColor={sample(nm)} />
          ))}
        </linearGradient>
      </defs>
      <rect x={0} y={STRIP_TOP} width={STRIP_W} height={STRIP_H} rx={3} fill={absorption ? "url(#hydrogen-continuum)" : "#050d14"} />

      {inWindow(readout.seriesLimit) ? (
        <line x1={x(readout.seriesLimit)} y1={STRIP_TOP} x2={x(readout.seriesLimit)} y2={STRIP_TOP + STRIP_H} stroke="#f2c66d" strokeWidth={1.5} strokeDasharray="4 4" />
      ) : null}

      {shown.map((line, i) => {
        const lx = x(line.wavelength);
        const selected = line.upper === readout.selected.upper;
        const lineColor = absorption ? "#050d14" : photonColor(line);
        return (
          <g
            key={line.upper}
            role="button"
            tabIndex={0}
            aria-label={`選擇躍遷 ${line.upper} 到 ${line.lower}，${formatWavelength(line.wavelength)}，${REGION_ZH[line.region]}`}
            aria-pressed={selected}
            style={{ cursor: "pointer", outline: "none" }}
            onClick={() => onPick(line)}
            onKeyDown={onActivate(() => onPick(line))}
          >
            <rect x={lx - 9} y={STRIP_TOP - 4} width={18} height={STRIP_H + 8} fill="transparent" />
            {selected ? <rect x={lx - 5} y={STRIP_TOP} width={10} height={STRIP_H} fill="none" stroke="#f2c66d" strokeWidth={1.2} /> : null}
            <rect x={lx - (selected ? 2.5 : 1.5)} y={STRIP_TOP} width={selected ? 5 : 3} height={STRIP_H} fill={lineColor} />
            {keepLabel[i] ? (
              <text x={Math.min(STRIP_W - 30, Math.max(30, lx))} y={STRIP_TOP - 8} textAnchor="middle" fill={selected ? "#f2c66d" : "#c9dae2"} fontSize={14} fontWeight={selected ? 700 : 400}>
                {line.wavelength.toFixed(line.wavelength < 200 ? 1 : 0)}
              </text>
            ) : null}
          </g>
        );
      })}

      {overlap ? (
        <g aria-label="可見光波段">
          <defs>
            <linearGradient id="hydrogen-band" x1={x(overlap.min)} x2={x(overlap.max)} y1="0" y2="0" gradientUnits="userSpaceOnUse">
              {Array.from({ length: 24 }, (_, i) => overlap.min + (i * (overlap.max - overlap.min)) / 23).map((nm) => (
                <stop key={nm} offset={`${((nm - overlap.min) / (overlap.max - overlap.min)) * 100}%`} stopColor={sample(nm)} />
              ))}
            </linearGradient>
          </defs>
          <rect x={x(overlap.min)} y={STRIP_TOP + STRIP_H + 4} width={x(overlap.max) - x(overlap.min)} height={5} fill="url(#hydrogen-band)" />
          {x(overlap.max) - x(overlap.min) > 90 ? (
            <text x={(x(overlap.min) + x(overlap.max)) / 2} y={STRIP_TOP + STRIP_H + 24} textAnchor="middle" fill="#9fc2d3" fontSize={13}>可見光 380–750 nm</text>
          ) : null}
        </g>
      ) : null}

      {ticks.map((nm) => (
        <g key={nm}>
          <line x1={x(nm)} y1={STRIP_TOP + STRIP_H} x2={x(nm)} y2={STRIP_TOP + STRIP_H + 3} stroke="#8fa6b3" />
          <text x={Math.min(STRIP_W - 24, Math.max(24, x(nm)))} y={118} textAnchor="middle" fill="#9fc2d3" fontSize={14}>{nm}</text>
        </g>
      ))}
      <text x={STRIP_W} y={104} textAnchor="end" fill="#8fa6b3" fontSize={13}>波長（nm）</text>

      {hidden > 0 ? (
        <text x={STRIP_W - 8} y={STRIP_TOP + STRIP_H / 2 + 5} textAnchor="end" fill="#f2c66d" fontSize={14}>另有 {hidden} 條譜線在此範圍之外</text>
      ) : null}
      {shown.length === 0 && hidden === 0 ? (
        <text x={STRIP_W / 2} y={STRIP_TOP + STRIP_H / 2 + 5} textAnchor="middle" fill="#8fa6b3" fontSize={15}>此系列在目前顯示的能階中沒有譜線</text>
      ) : null}
    </svg>
  );
}

export default function HydrogenLab() {
  const [state, setState] = useState<HydrogenState>(initialHydrogenState);
  const [orbitScale, setOrbitScale] = useState<OrbitScale>("true");
  const [spectrumRange, setSpectrumRange] = useState<SpectrumRangeMode>("auto");
  const readout = useMemo(() => deriveHydrogenModel(state), [state]);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    let firstFrame = true;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (firstFrame) {
        firstFrame = false;
        // Respect reduced-motion: start paused, and let the student press play.
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setState((s) => ({ ...s, playing: false }));
      }
      setState((current) => advanceHydrogen(current, dt));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const place = useCallback((n: number) => setState((s) => placeElectron(s, n)), []);
  const pick = useCallback((upper: number, lower: number) => setState((s) => selectTransition(s, upper, lower)), []);

  const { selected, electron } = readout;
  const modeLabel = state.mode === "emission" ? "發射" : "吸收";
  const verb = state.mode === "emission" ? "放出光子" : "吸收光子";

  return (
    <main className="lab-shell hydrogen-lab">
      <div className="topbar">
        <div>
          <Link href="/" className="lab-brand" aria-label="Kakau Lab 模型目錄"><KakauLabMark /></Link>
          <div className="eyebrow">Model 10</div>
          <h1><span className="live-dot" />氫原子能階與光譜</h1>
        </div>
        <div className="header-actions">
          <ThemeToggle />
          <Link className="model-index-link" href="/">模型目錄</Link>
          <button onClick={() => setState(initialHydrogenState())}><RotateCcw size={14} /> 重設</button>
        </div>
      </div>

      <div className="hydrogen-stage-grid">
        <section className="viewport-card hydrogen-card">
          <div className="card-label">
            <span>1</span>
            <div><strong>玻耳軌道</strong><small>{orbitScale === "true" ? "半徑依 rₙ = n²a₀ 等比例繪製" : "示意比例（rₙ ∝ n），非真實比例"}；點軌道可移動電子</small></div>
          </div>
          <div className="canvas-host hydrogen-canvas"><OrbitView state={state} readout={readout} scale={orbitScale} onPlace={place} /></div>
        </section>
        <section className="viewport-card hydrogen-card">
          <div className="card-label">
            <span>2</span>
            <div><strong>能階圖</strong><small>Eₙ = −13.6 eV / n²；點能階放電子，點箭頭選躍遷</small></div>
          </div>
          <div className="canvas-host hydrogen-canvas"><EnergyView state={state} readout={readout} onPlace={place} onPick={pick} /></div>
        </section>
      </div>

      <section className="viewport-card hydrogen-spectrum-card">
        <div className="card-label">
          <span>3</span>
          <div><strong>{seriesLabel(readout.seriesName)}的{state.mode === "emission" ? "發射" : "吸收"}譜線</strong><small>終態 n = {state.lower}；{state.mode === "emission" ? "亮線落在暗背景上" : "暗線缺在連續光譜中"}；虛線為系限（n→∞）</small></div>
        </div>
        <div className="hydrogen-range" role="group" aria-label="光譜波長範圍">
          <button className={spectrumRange === "auto" ? "active" : ""} aria-pressed={spectrumRange === "auto"} onClick={() => setSpectrumRange("auto")}>自動範圍</button>
          <button className={spectrumRange === "visible" ? "active" : ""} aria-pressed={spectrumRange === "visible"} onClick={() => setSpectrumRange("visible")}>可見光 380–750</button>
        </div>
        <div className="hydrogen-strip"><SpectrumStrip readout={readout} mode={state.mode} range={spectrumRange} onPick={(t) => pick(t.upper, t.lower)} /></div>
        <p className="hydrogen-strip-note">一個氫原子一次只做一次躍遷；整條光譜是大量原子各自躍遷的總和。「可見」只表示肉眼看得到，紫外線與紅外線的光子同樣存在。</p>
      </section>

      <div className="hydrogen-metrics">
        <div><span>躍遷</span><strong>{selected.upper} {state.mode === "emission" ? "→" : "←"} {selected.lower}</strong></div>
        <div><span>光子能量</span><strong>{selected.photonEnergy.toFixed(3)} eV</strong></div>
        <div><span>波長</span><strong style={{ color: photonColor(selected) }}>{formatWavelength(selected.wavelength)}</strong></div>
        <div><span>頻率 · 區域</span><strong>{formatFrequency(selected.frequency)} · {REGION_ZH[selected.region]}</strong></div>
        <div><span>電子現況</span><strong>n={electron.n} · {electron.energy.toFixed(2)} eV · {(electron.radius / 100).toFixed(2)} Å</strong></div>
      </div>

      <section className="control-panel hydrogen-controls">
        <div className="control-panel-heading">
          <div><Atom size={14} /> 同步控制台</div>
          <button className={state.playing ? "active" : ""} onClick={() => setState((s) => ({ ...s, playing: !s.playing }))} aria-label={state.playing ? "暫停動畫" : "播放動畫"}>
            {state.playing ? <Pause size={14} /> : <Play size={14} />} {state.playing ? "暫停" : "播放"}
          </button>
        </div>

        <div className="hydrogen-row">
          <button className={state.mode === "emission" ? "active" : ""} onClick={() => setState((s) => selectTransition(s, s.upper, s.lower, "emission"))}>發射（高→低）</button>
          <button className={state.mode === "absorption" ? "active" : ""} onClick={() => setState((s) => selectTransition(s, s.upper, s.lower, "absorption"))}>吸收（低→高）</button>
          <button className="primary-action" onClick={() => setState((s) => fireTransition(s))} disabled={readout.blocked !== null} aria-describedby="hydrogen-fire-status">
            <Zap size={14} /> {verb}
          </button>
        </div>
        <div className="hydrogen-status" id="hydrogen-fire-status" role="status">
          {readout.blocked?.reason === "electron-not-at-start" ? (
            <>
              <span>電子在 n={state.electronLevel}；{modeLabel}此躍遷需要電子先在 n={readout.blocked.requiredLevel}。</span>
              <button onClick={() => place(readout.startLevel)}>設定電子在 n={readout.startLevel}</button>
            </>
          ) : readout.blocked?.reason === "in-flight" ? (
            <span>光子飛行中……</span>
          ) : (
            <span>電子在 n={state.electronLevel}，可以{verb}。</span>
          )}
        </div>

        <div className="hydrogen-control-grid">
          <div className="hydrogen-control-block">
            <label><span>高能階 n <b>{state.upper}</b></span><input type="range" min={2} max={state.maxN} step={1} value={state.upper} onChange={(e) => pick(Number(e.target.value), state.lower)} /></label>
          </div>
          <div className="hydrogen-control-block">
            <label><span>低能階 n <b>{state.lower}</b></span><input type="range" min={1} max={state.upper - 1} step={1} value={state.lower} disabled={state.upper === 2} onChange={(e) => pick(state.upper, Number(e.target.value))} /></label>
            <small>低能階決定譜系：1 萊曼、2 巴耳末、3 帕申。</small>
          </div>
          <div className="hydrogen-control-block">
            <span className="hydrogen-field-label">顯示能階數</span>
            <div className="hydrogen-row hydrogen-row--tight">
              {Array.from({ length: MAX_SHOWN_LEVELS - MIN_SHOWN_LEVELS + 1 }, (_, i) => MIN_SHOWN_LEVELS + i).map((n) => (
                <button key={n} className={state.maxN === n ? "active" : ""} disabled={n < minimumShownLevels(state)} title={n < minimumShownLevels(state) ? `需顯示到 n=${minimumShownLevels(state)} 才能容納目前的躍遷與電子` : undefined} onClick={() => setState((s) => setMaxLevel(s, n))}>{n}</button>
              ))}
            </div>
          </div>
          <div className="hydrogen-control-block">
            <span className="hydrogen-field-label">軌道比例</span>
            <div className="hydrogen-row hydrogen-row--tight">
              <button className={orbitScale === "true" ? "active" : ""} aria-pressed={orbitScale === "true"} onClick={() => setOrbitScale("true")}>等比例 n²</button>
              <button className={orbitScale === "schematic" ? "active" : ""} aria-pressed={orbitScale === "schematic"} onClick={() => setOrbitScale("schematic")}>示意 n</button>
            </div>
          </div>
        </div>

        <div className="hydrogen-row">
          {Object.entries(HYDROGEN_PRESETS).map(([key, preset]) => (
            <button key={key} onClick={() => pick(preset.upper, preset.lower)}>{preset.label}</button>
          ))}
        </div>
      </section>

      <p className="hydrogen-note">
        這張圖描述單一氫原子：電子一次只在一個能階。發射需要電子先在高能階，吸收需要電子先在低能階，而且吸收的光子能量必須恰等於能階差；把電子激發到高能階的來源（如碰撞或先前吸收）不在模型之內。
        {" "}玻耳模型假設電子沿固定圓軌道運行、能量量子化，並忽略氫核質量的有限修正（造成約 0.05 % 的波長差）。電子公轉速度為示意，實際約 10¹⁶ 圈／秒；真實電子沒有軌跡，只有機率分布。
        {selected.region !== "visible" ? " 此譜線在可見光之外，肉眼看不到；圖中顏色只表示它在可見光的紫外線側或紅外線側。" : ""}
      </p>

      <div className="lab-footer">
        <span>HYDROGEN ATOM · 1/λ = R(1/n₁² − 1/n₂²)</span>
        <span>Kakau Lab</span>
      </div>
    </main>
  );
}
