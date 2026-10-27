"use client";

import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { Atom, Pause, Play, RotateCcw, Zap } from "lucide-react";
import { BOHR_RADIUS_PM, visibleRgb, type Direction, type Region, type Transition } from "@/lib/science/hydrogen";
import {
  HYDROGEN_PRESETS,
  MAX_SHOWN_LEVELS,
  MIN_SHOWN_LEVELS,
  advanceHydrogen,
  deriveHydrogenModel,
  fireTransition,
  initialHydrogenState,
  placeElectron,
  selectTransition,
  setMaxLevel,
  type HydrogenReadout,
  type HydrogenState,
} from "@/models/hydrogen";
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

/** Orbit radii are drawn to true n² scale: the largest shown orbit fills the frame, the rest follow. */
function OrbitView({ state, readout, onPlace }: { state: HydrogenState; readout: HydrogenReadout; onPlace: (n: number) => void }) {
  const pxPerPm = ORBIT_EDGE / (state.maxN * state.maxN * BOHR_RADIUS_PM);
  const radiusPx = (pm: number) => pm * pxPerPm;
  const electronRadius = radiusPx(readout.electron.radius);
  const ex = CENTER + electronRadius * Math.cos(state.orbitAngle);
  const ey = CENTER - electronRadius * Math.sin(state.orbitAngle);

  const photonAngle = -Math.PI / 4;
  const lowerRadius = radiusPx(readout.levels[state.lower - 1].radius);
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
      {readout.levels.map(({ n, radius }) => {
        const r = radiusPx(radius);
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
      <circle cx={CENTER} cy={CENTER} r={5} fill="#e0795f" />
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

const BAND_MIN = 380;
const BAND_MAX = 750;
const STRIP_W = 1000;

function SpectrumStrip({ readout, mode, onPick }: { readout: HydrogenReadout; mode: Direction; onPick: (t: Transition) => void }) {
  const x = (nm: number) => ((nm - BAND_MIN) / (BAND_MAX - BAND_MIN)) * STRIP_W;
  const stops = Array.from({ length: 38 }, (_, i) => BAND_MIN + (i * (BAND_MAX - BAND_MIN)) / 37);
  const visibleLines = readout.series.filter((line) => line.region === "visible");
  const absorption = mode === "absorption";
  return (
    <svg viewBox={`0 0 ${STRIP_W} 92`} width="100%" role="img" aria-label={absorption ? "吸收光譜：連續光譜中的暗線" : "發射光譜：暗背景上的亮線"}>
      <defs>
        <linearGradient id="hydrogen-continuum" x1="0" x2="1" y1="0" y2="0">
          {stops.map((nm) => (
            <stop key={nm} offset={`${((nm - BAND_MIN) / (BAND_MAX - BAND_MIN)) * 100}%`} stopColor={rgb(visibleRgb(nm) ?? [0, 0, 0])} />
          ))}
        </linearGradient>
      </defs>
      <rect x={0} y={8} width={STRIP_W} height={50} rx={3} fill={absorption ? "url(#hydrogen-continuum)" : "#050d14"} />
      {visibleLines.map((line) => {
        const lx = x(line.wavelength);
        const selected = line.upper === readout.selected.upper;
        return (
          <g key={line.upper} style={{ cursor: "pointer" }} onClick={() => onPick(line)}>
            <rect x={lx - 8} y={8} width={16} height={50} fill="transparent" />
            <rect x={lx - (selected ? 2.5 : 1.5)} y={8} width={selected ? 5 : 3} height={50} fill={absorption ? "#050d14" : photonColor(line)} />
          </g>
        );
      })}
      {[400, 500, 600, 700].map((nm) => (
        <g key={nm}>
          <line x1={x(nm)} y1={58} x2={x(nm)} y2={64} stroke="#8fa6b3" />
          <text x={x(nm)} y={78} textAnchor="middle" fill="#9fc2d3" fontSize={15}>{nm} nm</text>
        </g>
      ))}
      {visibleLines.length === 0 ? (
        <text x={STRIP_W / 2} y={38} textAnchor="middle" fill="#8fa6b3" fontSize={15}>
          此系列沒有落在可見光（380–750 nm）的譜線
        </text>
      ) : null}
    </svg>
  );
}

export default function HydrogenLab() {
  const [state, setState] = useState<HydrogenState>(initialHydrogenState);
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
            <div><strong>玻耳軌道</strong><small>半徑依 rₙ = n²a₀ 等比例繪製；點軌道可移動電子</small></div>
          </div>
          <div className="canvas-host hydrogen-canvas"><OrbitView state={state} readout={readout} onPlace={place} /></div>
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
          <div><strong>{seriesLabel(readout.seriesName)}的{state.mode === "emission" ? "發射" : "吸收"}譜線</strong><small>終態 n = {state.lower}；{state.mode === "emission" ? "亮線落在暗背景上" : "暗線缺在連續光譜中"}</small></div>
        </div>
        <div className="hydrogen-strip"><SpectrumStrip readout={readout} mode={state.mode} onPick={(t) => pick(t.upper, t.lower)} /></div>
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
          <button className="primary-action" onClick={() => setState((s) => fireTransition(s))}>
            <Zap size={14} /> {readout.inFlight ? "重新" : ""}{verb}
          </button>
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
                <button key={n} className={state.maxN === n ? "active" : ""} onClick={() => setState((s) => setMaxLevel(s, n))}>{n}</button>
              ))}
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
        {readout.ready ? `電子在 n=${state.electronLevel}，可進行${modeLabel}躍遷。` : `電子目前在 n=${state.electronLevel}，不是此躍遷的起始能階（n=${state.mode === "emission" ? state.upper : state.lower}）；按下「${verb}」會從起始能階重新開始。`}
        {" "}玻耳模型假設電子沿固定圓軌道運行、能量量子化，並忽略氫核質量的有限修正（造成約 0.05 % 的波長差）。電子公轉速度為示意，實際約 10¹⁶ 圈／秒；真實電子沒有軌跡，只有機率分布。
        {selected.region !== "visible" ? " 此譜線在可見光之外，肉眼看不到，圖中顏色只表示它在可見光的紫外線側或紅外線側。" : ""}
      </p>

      <div className="lab-footer">
        <span>HYDROGEN ATOM · 1/λ = R(1/n₁² − 1/n₂²)</span>
        <span>Kakau Lab</span>
      </div>
    </main>
  );
}
