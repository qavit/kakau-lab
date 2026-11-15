"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, Atom, Pause, Play, RotateCcw, Zap } from "lucide-react";
import { seriesLimitWavelength, seriesLines } from "@/lib/science/hydrogen";
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
  type HydrogenState,
} from "@/models/hydrogen";
import {
  COMPARE_UPPERS,
  TARGET_LOWER,
  balmerLineName,
  beginPredicting,
  chooseGuess,
  chooseLarger,
  compareGuess,
  evidencePolicy,
  evidenceTransition,
  guidedPhysicsState,
  initialBalmerCompare,
  initialLearning,
  retryCompare,
  retryGuess,
  hasLearningProgress,
  revealHint,
  showEvidence,
  submitCompare,
  submitGuess,
} from "@/models/hydrogen-learning";
import { type SpectrumRangeMode } from "@/components/hydrogen/spectrum";
import GuidedCard from "@/components/hydrogen/GuidedCard";
import { ViewCard, type HydrogenView } from "@/components/hydrogen/ViewCard";
import { useExpandedView } from "@/components/workspace/useExpandedView";
import BalmerCompareCard from "@/components/hydrogen/BalmerCompareCard";
import {
  EnergyView,
  OrbitView,
  REGION_ZH,
  SpectrumStrip,
  formatFrequency,
  formatWavelength,
  photonColor,
  seriesLabel,
  type OrbitScale,
} from "@/components/hydrogen/views";
import KakauLabMark from "@/components/KakauLabMark";
import ThemeToggle from "@/components/ThemeToggle";

type LabMode = "intent" | "free" | "guided";

/** The two transitions called out on the energy diagram once the Hα/Hβ comparison is submitted. */
const COMPARE_MARKS = COMPARE_UPPERS.map((upper) => ({ upper, lower: TARGET_LOWER, label: `${balmerLineName(upper)} ${upper}→${TARGET_LOWER}` }));

/** The guided spectrum: Balmer lines up to n=6, independent of the physical state so it cannot reveal the selection. */
const GUIDED_SPECTRUM = { series: seriesLines(TARGET_LOWER, 6), seriesLimit: seriesLimitWavelength(TARGET_LOWER) };

export default function HydrogenLab() {
  const [labMode, setLabMode] = useState<LabMode>("intent");
  const [state, setState] = useState<HydrogenState>(initialHydrogenState);
  const [learning, setLearning] = useState(initialLearning);
  const [balmer, setBalmer] = useState(initialBalmerCompare);
  const [orbitScale, setOrbitScale] = useState<OrbitScale>("true");
  const [spectrumRange, setSpectrumRange] = useState<SpectrumRangeMode>("auto");
  const readout = useMemo(() => deriveHydrogenModel(state), [state]);
  const guided = labMode === "guided";
  const policy = evidencePolicy(guided ? learning : null);
  const evidenceRef = useRef<HTMLDivElement>(null);
  /* Narrow screens show one of the two diagrams at a time; the spectrum stays underneath as the
     linked observable. Wide screens ignore this and show both. */
  const [mainView, setMainView] = useState<"energy" | "orbit">("energy");
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const expander = useExpandedView<HydrogenView>();
  const controlsRef = useRef<HTMLElement>(null);

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

  // When the evidence appears below the fold (phones), bring it into view.
  useEffect(() => {
    if (!guided || learning.phase !== "evidence") return;
    const el = evidenceRef.current;
    if (el && el.getBoundingClientRect().top > window.innerHeight * 0.6) el.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [guided, learning.phase]);

  /** Every mode change starts the destination from its own initial state, so neither a guess nor the electron's level carries over. */
  const enterFree = () => {
    setState(initialHydrogenState());
    setLearning(initialLearning());
    setBalmer(initialBalmerCompare());
    setLabMode("free");
    setLeaveConfirm(false);
  };
  /* Switching still resets both sides. A task with a guess in it asks first, in words on the page,
     because a tooltip is invisible on a touch screen. */
  const requestFree = () => (hasLearningProgress(learning) ? setLeaveConfirm(true) : enterFree());
  const enterGuided = () => {
    setState(guidedPhysicsState());
    setLearning(initialLearning());
    setBalmer(initialBalmerCompare());
    setLabMode("guided");
  };
  const reset = () => (guided ? enterGuided() : enterFree());

  const place = useCallback((n: number) => setState((s) => placeElectron(s, n)), []);
  const pick = useCallback((upper: number, lower: number) => setState((s) => selectTransition(s, upper, lower)), []);

  const { selected, electron } = readout;
  const modeLabel = state.mode === "emission" ? "發射" : "吸收";
  const verb = state.mode === "emission" ? "放出光子" : "吸收光子";
  /* The linked selection, carried into an enlarged view. Null whenever the policy hides the transition. */
  const linkedCaption = policy.transitionReadout
    ? <>{selected.upper} {state.mode === "emission" ? "→" : "←"} {selected.lower}　<i className="hydrogen-swatch" data-visible={selected.region === "visible"} style={{ background: photonColor(selected) }} aria-hidden="true" />{formatWavelength(selected.wavelength)}　{selected.photonEnergy.toFixed(3)} eV　{REGION_ZH[selected.region]}</>
    : null;
  const predicted = policy.predictionMarker && learning.compared !== null ? compareGuess(learning.compared) : null;

  return (
    <main className="lab-shell hydrogen-lab hydrogen-c2 lab-c2" data-mode={labMode}>
      <div className="topbar">
        <div className="hydrogen-brandline">
          <Link href="/" className="lab-brand" aria-label="Kakau Lab 模型目錄"><KakauLabMark /></Link>
          <div className="hydrogen-title">
            <div className="eyebrow">Model 10</div>
            <h1><span className="live-dot" />氫原子能階與光譜</h1>
          </div>
        </div>
        <div className="header-actions">
          <ThemeToggle />
          <Link className="model-index-link" href="/">模型目錄</Link>
          {labMode !== "intent" ? (
            <>
              <button onClick={guided ? requestFree : enterGuided} title="切換會重設畫面" data-testid="mode-toggle"><ArrowLeftRight size={14} /> {guided ? "自由探索" : "帶著問題探索"}</button>
              <button onClick={reset}><RotateCcw size={14} /> 重設</button>
            </>
          ) : null}
        </div>
      </div>

      {leaveConfirm && guided ? (
        <div className="hydrogen-leave-confirm" role="alertdialog" aria-label="離開探索任務" aria-describedby="hydrogen-leave-text" data-testid="leave-confirm" onKeyDown={(event) => { if (event.key === "Escape") setLeaveConfirm(false); }}>
          <p id="hydrogen-leave-text">切換到自由探索會重設畫面，這次的猜測與進度不會保留。</p>
          <button autoFocus onClick={() => setLeaveConfirm(false)} data-testid="leave-stay">繼續任務</button>
          <button onClick={enterFree} data-testid="leave-go">切換並重設</button>
        </div>
      ) : null}

      {labMode === "intent" ? (
        <section className="hydrogen-intent" data-testid="intent-choice" aria-labelledby="hydrogen-intent-title">
          <p className="eyebrow">從哪裡開始？</p>
          <h2 id="hydrogen-intent-title">你想帶著問題探索，還是自己試？</h2>
          <p>兩種方式使用同一個玻耳模型，隨時都能切換；切換會重設畫面。</p>
          <div className="hydrogen-intent-grid">
            <button className="hydrogen-intent-choice" onClick={enterGuided} data-testid="choose-guided">
              <strong>帶著問題探索</strong>
              <span>從氫原子的光譜出發，先提出猜測，再利用能階模型檢查自己的想法。</span>
              <em>約 3–5 分鐘</em>
            </button>
            <button className="hydrogen-intent-choice" onClick={enterFree} data-testid="choose-free">
              <strong>自由探索</strong>
              <span>自由改變能階、觸發電子躍遷，觀察軌道、能量與光譜的關係。</span>
            </button>
          </div>
        </section>
      ) : null}

      {guided ? (
        <div className="hydrogen-guided" data-phase={learning.phase}>
          <ViewCard view="spectrum" number={1} title="巴耳末系發射光譜" subtitle={<>終態 n = {TARGET_LOWER}；亮線落在暗背景上</>} className="hydrogen-spectrum-card hydrogen-guided-spectrum" expander={expander} caption={linkedCaption}>
            <div className="hydrogen-strip">
              <SpectrumStrip
                readout={GUIDED_SPECTRUM}
                mode="emission"
                range="auto"
                selectedUpper={null}
                emphasisNm={evidenceTransition().wavelength}
                levelTags={policy.levelLabels}
                marker={predicted ? { nm: predicted.wavelength, label: `你的預測 ${predicted.wavelength.toFixed(0)} nm` } : undefined}
              />
            </div>
          </ViewCard>

          <GuidedCard
            learning={learning}
            policy={policy}
            handlers={{
              onBegin: () => setLearning(beginPredicting),
              onChoose: (n) => setLearning((l) => chooseGuess(l, n)),
              onHint: () => setLearning(revealHint),
              onSubmit: () => setLearning(submitGuess),
              onRetry: () => setLearning(retryGuess),
              onEvidence: () => setLearning(showEvidence),
              onRestart: enterGuided,
            }}
            evidence={policy.transitionReadout ? { state, readout, onFire: () => setState((s) => fireTransition(s)), onResetElectron: () => place(readout.startLevel) } : null}
          />

          {policy.energyView || policy.orbitView ? (
            <div className="hydrogen-guided-evidence" ref={evidenceRef} data-testid="guided-evidence">
              {policy.energyView ? (
                <ViewCard view="energy" number={2} title="能階圖" subtitle="Eₙ = −13.6 eV / n²；箭頭是這條譜線的躍遷" className="hydrogen-card" expander={expander} caption={linkedCaption}>
                  <div className="canvas-host hydrogen-canvas"><EnergyView state={state} readout={readout} marks={balmer.submitted ? COMPARE_MARKS : undefined} /></div>
                </ViewCard>
              ) : null}
              {policy.orbitView ? (
                <ViewCard view="orbit" number={3} title="玻耳軌道" subtitle="半徑依 rₙ = n²a₀ 等比例繪製" className="hydrogen-card" expander={expander} caption={linkedCaption}>
                  <div className="canvas-host hydrogen-canvas"><OrbitView state={state} readout={readout} scale="true" /></div>
                </ViewCard>
              ) : null}
            </div>
          ) : null}

          {policy.transitionReadout ? (
            <BalmerCompareCard
              compare={balmer}
              handlers={{ onChoose: (n) => setBalmer((b) => chooseLarger(b, n)), onSubmit: () => setBalmer(submitCompare), onRetry: () => setBalmer(retryCompare) }}
            />
          ) : null}

          <p className="hydrogen-note">
            一個氫原子一次只做一次躍遷；整條光譜是大量原子各自躍遷的總和，線的粗細與亮度只是示意，並未計算各能階的原子數或躍遷機率。本任務使用無限重原子核的玻耳模型，數值與實測有約 0.05 % 的差（模型 {evidenceTransition().wavelength.toFixed(1)} nm 對實測約 486.27 nm 的真空波長）。它描述單一氫原子的躍遷；真實電子沒有固定軌跡，只有機率分布。
          </p>
        </div>
      ) : null}

      {labMode === "free" ? (
        <>
        <div className="hydrogen-free-layout">
        <div className="hydrogen-free-stage">
        <div className="hydrogen-view-switch" role="group" aria-label="主要科學視圖">
          <button className={mainView === "energy" ? "active" : ""} aria-pressed={mainView === "energy"} onClick={() => setMainView("energy")} data-testid="main-energy">能階圖</button>
          <button className={mainView === "orbit" ? "active" : ""} aria-pressed={mainView === "orbit"} onClick={() => setMainView("orbit")} data-testid="main-orbit">玻耳軌道</button>
        </div>
        <div className="hydrogen-stage-grid" data-main={mainView}>
          <ViewCard view="orbit" number={1} title="玻耳軌道" subtitle={<>{orbitScale === "true" ? "半徑依 rₙ = n²a₀ 等比例繪製" : "示意比例（rₙ ∝ n），非真實比例"}；點軌道可移動電子</>} className="hydrogen-card" expander={expander} caption={linkedCaption}>
            <div className="canvas-host hydrogen-canvas"><OrbitView state={state} readout={readout} scale={orbitScale} onPlace={place} /></div>
          </ViewCard>
          <ViewCard view="energy" number={2} title="能階圖" subtitle="Eₙ = −13.6 eV / n²；點能階放電子，點箭頭選躍遷" className="hydrogen-card" expander={expander} caption={linkedCaption}>
            <div className="canvas-host hydrogen-canvas"><EnergyView state={state} readout={readout} onPlace={place} onPick={pick} /></div>
          </ViewCard>
        </div>

        <ViewCard view="spectrum" number={3} title={`${seriesLabel(readout.seriesName)}的${state.mode === "emission" ? "發射" : "吸收"}譜線`} subtitle={<>終態 n = {state.lower}；{state.mode === "emission" ? "亮線落在暗背景上" : "暗線缺在連續光譜中"}；虛線為系限（n→∞）</>} className="hydrogen-spectrum-card" expander={expander} caption={linkedCaption}>
          <div className="hydrogen-range" role="group" aria-label="光譜波長範圍">
            <button className={spectrumRange === "auto" ? "active" : ""} aria-pressed={spectrumRange === "auto"} onClick={() => setSpectrumRange("auto")}>自動範圍</button>
            <button className={spectrumRange === "visible" ? "active" : ""} aria-pressed={spectrumRange === "visible"} onClick={() => setSpectrumRange("visible")}>可見光 380–750</button>
          </div>
          <div className="hydrogen-strip"><SpectrumStrip readout={readout} mode={state.mode} range={spectrumRange} selectedUpper={readout.selected.upper} onPick={(t) => pick(t.upper, t.lower)} /></div>
          <p className="hydrogen-strip-note">一個氫原子一次只做一次躍遷；整條光譜是大量原子各自躍遷的總和。「可見」只表示肉眼看得到，紫外線與紅外線的光子同樣存在。</p>
        </ViewCard>
        </div>

        <aside className="hydrogen-free-side" aria-label="數值與控制">
        <div className="hydrogen-metrics">
          <div><span>躍遷</span><strong>{selected.upper} {state.mode === "emission" ? "→" : "←"} {selected.lower}</strong></div>
          <div><span>光子能量</span><strong>{selected.photonEnergy.toFixed(3)} eV</strong></div>
          <div><span>波長</span><strong><i className="hydrogen-swatch" data-visible={selected.region === "visible"} style={{ background: photonColor(selected) }} aria-hidden="true" />{formatWavelength(selected.wavelength)}</strong></div>
          <div><span>頻率 · 區域</span><strong>{formatFrequency(selected.frequency)} · {REGION_ZH[selected.region]}</strong></div>
          <div><span>電子現況</span><strong>n={electron.n} · {electron.energy.toFixed(2)} eV · {(electron.radius / 100).toFixed(2)} Å</strong></div>
        </div>

        <section className="control-panel hydrogen-controls" ref={controlsRef}>
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
        </aside>
        </div>

        <div className="hydrogen-quickbar" data-testid="quickbar">
          <button className="primary-action" onClick={() => setState((s) => fireTransition(s))} disabled={readout.blocked !== null} data-testid="quick-fire"><Zap size={16} /> {verb}</button>
          <button onClick={() => controlsRef.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })} data-testid="quick-controls"><Atom size={16} /> 控制台</button>
        </div>

        <p className="hydrogen-note">
          這張圖描述單一氫原子：電子一次只在一個能階。發射需要電子先在高能階，吸收需要電子先在低能階，而且吸收的光子能量必須恰等於能階差；把電子激發到高能階的來源（如碰撞或先前吸收）不在模型之內。
          {" "}玻耳模型假設電子沿固定圓軌道運行、能量量子化，並忽略氫核質量的有限修正（造成約 0.05 % 的波長差）。電子公轉速度為示意，實際約 10¹⁶ 圈／秒；真實電子沒有軌跡，只有機率分布。
          {selected.region !== "visible" ? " 此譜線在可見光之外，肉眼看不到，所以圖中用中性灰標示，不代表任何顏色。" : ""}
        </p>

        </>
      ) : null}

      <div className="lab-footer">
        <span>HYDROGEN ATOM · 1/λ = R(1/n₁² − 1/n₂²)</span>
        <span>Kakau Lab</span>
      </div>
    </main>
  );
}
