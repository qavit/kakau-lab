"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { mountInterference } from "@/components/interference/mountInterference";
import { MathProvider, TexBlock } from "@/components/math/MathJax";
import InterferenceDialogs from "@/components/interference/InterferenceDialogs";
import { AntinodeCountFormula, KinematicsFormula, MeasureFormulas, NodeCountFormula, RatioFormula } from "@/components/interference/InterferenceFormulas";
import { interferenceStyles } from "@/components/interference/interferenceStyles";

const Num = ({ answer, label }: { answer: string; label: string }) => <label>{label}<input data-answer={answer} type="number" min="0" max="40" inputMode="numeric" /></label>;
const Slider = ({ name, label, min, max, step, init, out, aria }: { name: string; label: string; min: number; max: number; step: number; init: number; out: string; aria: string }) =>
  <label className="if-control if-control--slider"><span>{label} <output data-output={name}>{out}</output></span><input aria-label={aria} data-control={name} type="range" min={min} max={max} step={step} defaultValue={init} /></label>;


/** Single owner of the sidebar state: the aside, the body grid and the toggle button all follow it. */
function applySidebar(root: HTMLElement, open: boolean) {
  const aside = root.querySelector<HTMLElement>(".interference-activities");
  const toggle = root.querySelector<HTMLButtonElement>('[data-action="toggle-activities"]');
  root.dataset.sidebar = open ? "open" : "closed";
  if (aside) aside.dataset.collapsed = String(!open);
  if (toggle) {
    toggle.setAttribute("aria-expanded", String(open));
    const label = toggle.querySelector("[data-sidebar-toggle-text]");
    if (label) label.textContent = open ? "收合" : "展開";
    toggle.setAttribute("aria-label", open ? "收合活動側欄" : "展開活動側欄");
  }
}

interface InterferenceSimulationProps { enabled?: boolean }

export default function InterferenceSimulation({ enabled = true }: InterferenceSimulationProps) {
  const containerRef = useRef<HTMLElement>(null);
  const [moreViews, setMoreViews] = useState(false);
  useEffect(() => {
    const container = containerRef.current;
    if (!enabled || !container) return;
    const controller = mountInterference(container);
    const hint = container.querySelector<HTMLElement>("[data-plot-hint]");
    try {
      const stored = localStorage.getItem("kakau-lab-interference-sidebar");
      applySidebar(container, stored === "open" || (stored !== "closed" && matchMedia("(min-width: 1024px)").matches));
      if (hint) hint.hidden = localStorage.getItem("kakau-lab-interference-plot-hint") === "dismissed";
    } catch { /* storage may be unavailable */ }
    return () => controller.dispose();
  }, [enabled]);
  const toggleProjection = (event: MouseEvent<HTMLButtonElement>) => {
    const root = containerRef.current;
    if (!root) return;
    const projection = root.classList.toggle("interference-projection");
    event.currentTarget.setAttribute("aria-pressed", String(projection));
    event.currentTarget.textContent = projection ? "離開投影模式" : "投影模式";
    event.currentTarget.setAttribute("aria-label", projection ? "離開投影模式" : "投影模式");
    root.scrollTo?.({ top: 0 });
  };
  const toggleActivities = () => {
    const root = containerRef.current;
    const aside = root?.querySelector<HTMLElement>(".interference-activities");
    if (!root || !aside) return;
    const open = aside.dataset.collapsed === "true";
    applySidebar(root, open);
    try { localStorage.setItem("kakau-lab-interference-sidebar", open ? "open" : "closed"); } catch { /* storage may be unavailable */ }
  };
  const dismissPlotHint = () => {
    const root = containerRef.current;
    const hint = root?.querySelector<HTMLElement>("[data-plot-hint]");
    if (hint) hint.hidden = true;
    try { localStorage.setItem("kakau-lab-interference-plot-hint", "dismissed"); } catch { /* storage may be unavailable */ }
    root?.querySelector<HTMLElement>("[data-interference-plot]")?.focus();
  };

  const VIEWS = [["displacement", "瞬時位移 ψ"], ["intensity", "強度 |C|²"], ["amplitude", "合成振幅 |C|"], ["phase", "合成相位 Φ"]] as const;
  return <MathProvider><section ref={containerRef} className="interference-lab" aria-label="雙點波源干涉模擬器" data-testid="interference-host" data-sidebar="open">
    <style>{interferenceStyles}</style>
    <header className="if-header">
      <div className="if-heading"><h1>雙點波源干涉</h1><p>兩圈一圈的波，為什麼會長出雙曲線？</p></div>
      <p className="if-mode" data-mode-status>課本模式</p>
      <button type="button" className="btn btn--ghost" data-action="projection" aria-pressed="false" onClick={toggleProjection}>投影模式</button>
      <button type="button" className="btn btn--ghost" data-action="reset-parameters">重設參數</button>
    </header>
    <div className="if-body">
      <div className="if-stage">
        <div className="interference-controls" aria-label="實驗控制">
          <fieldset className="if-control if-control--views"><legend>波場</legend>
            <div className="if-segmented">
              {VIEWS.slice(0, 2).map(([value, label], index) => <label key={value}><input type="radio" name="interference-view" value={value} defaultChecked={index === 0} /><span>{label}</span></label>)}
              <button type="button" className="if-segmented__more" aria-expanded={moreViews} aria-controls="interference-more-views" onClick={() => setMoreViews(open => !open)}>更多</button>
              <span id="interference-more-views" className="if-segmented__extra" hidden={!moreViews}>
                {VIEWS.slice(2).map(([value, label]) => <label key={value} title={value === "phase" ? "顯示 ψ = A cos(Φ − ωt) 中不隨時間變的 Φ(x,y)" : undefined}><input type="radio" name="interference-view" value={value} /><span>{label}</span></label>)}
              </span>
            </div>
          </fieldset>
          <Slider name="wavelength" label="波長 λ" aria="波長 λ" min={0.5} max={1.5} step={0.01} init={1} out="1.00" />
          <Slider name="separation" label="波源間距 d" aria="波源間距 d" min={0.75} max={4} step={0.01} init={2} out="2.00" />
          <fieldset className="if-control if-layers"><legend>線條</legend>
            <label><input data-control="constructive" type="checkbox" defaultChecked /><i className="if-swatch" /><span data-term="constructive">波腹線</span></label>
            <label><input data-control="destructive" type="checkbox" defaultChecked /><i className="if-swatch if-swatch--destructive" /><span data-term="destructive">波節線</span></label>
            <label><input data-control="wavefronts" type="checkbox" />波峰／波谷</label>
          </fieldset>
          <details className="if-advanced"><summary>進階</summary>
            <div className="if-advanced-panel">
              <div className="if-advanced-grid">
                <Slider name="amplitude1" label="A₁" aria="波源一振幅 A₁" min={0.2} max={1.5} step={0.05} init={1} out="1.00" />
                <Slider name="amplitude2" label="A₂" aria="波源二振幅 A₂" min={0.2} max={1.5} step={0.05} init={1} out="1.00" />
                <Slider name="phase1" label="φ₁" aria="波源一初相位 φ₁" min={0} max={360} step={5} init={0} out="0°" />
                <Slider name="phase2" label="φ₂" aria="波源二初相位 φ₂" min={0} max={360} step={5} init={0} out="0°" />
                <Slider name="waveSpeed" label="波速 v" aria="波速 v" min={0.5} max={2} step={0.05} init={1} out="1.00" />
                <Slider name="frequency" label="頻率 f" aria="頻率 f" min={0.5} max={2} step={0.05} init={1} out="1.00" />
                <div className="if-kinematics">
                  <KinematicsFormula />
                  <p className="sr-only" data-kinematics-sr>v = 1.00，f = 1.00，λ = 1.00，T = 1.00 s。</p>
                  <p>同一介質 v 固定：拖主畫面的 λ 會改變 f。干涉條件線只由 λ 決定；v 與 f 改變的是 λ 和波動的快慢。</p>
                </div>
                <label className="if-attenuation"><input data-control="attenuation" type="checkbox" /> 1/√r 距離衰減</label>
              </div>
              <p className="if-advanced-warning" data-advanced-warning hidden>目前不是課本條件：線條標示的是相位條件；兩列波抵達時振幅不同，相消條件上也未必是零振幅。</p>
            </div>
          </details>
        </div>

        <div className="if-main">
          <div className="if-plot-column" data-interference-host>
            <div className="interference-plot" data-interference-plot tabIndex={0} role="application" aria-label="波場與觀測點。按 Enter 或空白鍵在中央建立 P，方向鍵移動，Shift 加大步距，Delete 清除。" aria-describedby="interference-field-summary">
              <canvas data-interference-canvas aria-hidden="true" />
              <svg data-interference-overlay viewBox="0 0 600 600" aria-hidden="true"><g data-layer="wavefronts"/><g data-layer="conditions"/><g data-layer="measurement"/><g data-layer="sources"/></svg>
              <p className="if-plot-note" data-phase-note hidden>顯示 ψ = |C| cos(Φ − ωt) 裡的 Φ(x,y)。瞬時相位 Φ − ωt 只會讓整張圖同步轉色，空間結構不變，所以這裡畫 Φ。灰色是振幅近零、相位無定義處。</p>
              <div className="if-plot-overlay">
                <p className="if-plot-status" data-line-readout hidden />
                <p className="interference-plot-hint" data-plot-hint><span>點一下放 P，按住可拖曳，點兩下移除</span><button type="button" aria-label="關閉操作說明" onClick={dismissPlotHint}>×</button></p>
              </div>
            </div>
            <div className="if-view-key"><span data-view-key-low>波谷（−）</span><i data-view-key data-mode="displacement" /><span data-view-key-high>波峰（+）</span></div>
            <p className="if-point-line" data-point-position aria-live="polite">尚未放置 P</p>
            <p className="sr-only" data-point-announcement aria-live="polite" />
            <p id="interference-field-summary" className="sr-only" data-field-summary>目前顯示瞬時位移。橘色實線是相長條件，青色虛線是相消條件；兩個波源位於中央線左右。可用 P 取得路徑差和分類讀值。</p>
          </div>

          <div className="if-rail">
            <section className="rail-card" aria-labelledby="rail-geometry-title">
              <h2 id="rail-geometry-title" className="rail-card__eyebrow">幾何</h2>
              <div className="rail-ratio"><RatioFormula /></div>
              <div className="rail-counts" data-counts-textbook>
                <div className="rail-count"><AntinodeCountFormula /></div>
                <div className="rail-count rail-count--destructive"><NodeCountFormula /></div>
              </div>
              <dl className="rail-counts rail-counts--advanced" data-counts-advanced hidden>
                <div><dt><i className="if-swatch" />相長條件線</dt><dd data-readout="constructive-count">5</dd></div>
                <div><dt><i className="if-swatch if-swatch--destructive" />相消條件線</dt><dd data-readout="destructive-count">4</dd></div>
                <p>非課本模式時線數由相位條件逐條計算，上面的線數公式不適用。</p>
              </dl>
              <p className="rail-card__note" data-counts-masked hidden>活動 2 進行中：線數暫時遮住。</p>
              <p className="sr-only" data-geometry-sr>d/λ = 2.00，波腹線 5 條，波節線 4 條。</p>
            </section>
            <section className="rail-card interference-readout" data-testid="selected-point-panel" aria-labelledby="rail-measure-title">
              <div className="rail-card__head"><h2 id="rail-measure-title" className="rail-card__eyebrow">量測 P</h2><button type="button" className="btn btn--small" data-action="clear-point" hidden>清除 P</button></div>
              <p className="rail-card__empty" data-point-empty>在圖上點一下放 P，按住可以拖曳，點兩下移除。靠近線條時 P 會自動吸附上去。</p>
              <div data-point-values hidden>
                <MeasureFormulas />
                <p className="sr-only" data-measure-sr />
                <div className="classification" data-readout="classification" data-tone="neither"><strong data-classification-title /><span data-classification-detail /></div>
                <dl className="measure-extra">
                  <div><dt>Δφ（mod 360°）</dt><dd data-readout="phase-difference">—</dd></div>
                  <div><dt>合成振幅 |C|</dt><dd data-readout="amplitude">—</dd></div>
                  <div><dt>瞬時位移 ψ(P,t)</dt><dd data-readout="displacement">—</dd></div>
                </dl>
                <figure className="if-waveform"><figcaption>ψ(P, t)：一個週期</figcaption>
                  <svg className="interference-waveform" viewBox="0 0 240 90" role="img" aria-label="觀測點 P 一週期位移波形；圓點是目前的 t/T" data-waveform><line x1="0" y1="45" x2="240" y2="45" className="waveform-axis"/><path data-waveform-curve d=""/><circle data-waveform-marker cx="0" cy="45" r="4"/></svg>
                </figure>
              </div>
            </section>
          </div>
        </div>

        <div className="interference-time" aria-label="時間控制">
          <button type="button" className="btn" data-action="play-pause" aria-pressed="false">▶ 播放</button>
          <button type="button" className="btn btn--ghost" data-action="reset-time">t/T = 0</button>
          <label className="if-time-slider"><span>t / T <output data-output="time-cycle">0.00</output></span><input aria-label="模擬時間 t / T" data-control="time-cycle" type="range" min="0" max="1" step="0.001" defaultValue="0"/></label>
          <p className="if-time-hint" data-time-static-hint hidden>只有「瞬時位移」會隨時間改變。</p>
        </div>
      </div>

      <aside className="interference-activities" aria-label="引導活動" data-collapsed="false">
        <button type="button" className="if-act-toggle" data-action="toggle-activities" aria-expanded="true" aria-label="收合活動側欄" onClick={toggleActivities}>
          <span className="if-act-kicker">引導活動</span><span className="if-act-current" data-activity-summary>1｜這個點為什麼相長或相消？</span><span className="if-act-toggle-text" data-sidebar-toggle-text>收合</span>
        </button>
        <div className="if-act-panel">
        <nav className="interference-tabs" aria-label="選擇活動">{([["measure","活動 1｜路徑差：這個點為什麼相長或相消？","1"],["count","活動 2｜線數預測：d = 3λ 時有幾條線？","2"],["antiphase","活動 3｜反相波源：S₂ 晚半個週期，中央會怎樣？","3"],["time","活動 4｜波在動嗎？：波節線會跟著跑嗎？","4"],["edge","★ 進階探索：最外側的線跑去哪裡了？","★"]] as const).map(([id,label,short],i)=><button type="button" data-activity-tab={id} aria-label={label} aria-current={i===0?"step":undefined} key={id}>{short}</button>)}</nav>
        <p className="sr-only" data-activity-progress>1 / 4</p>
        <div className="if-act-scroll">
      <article className="interference-activity" data-activity="measure" data-summary="1｜這個點為什麼相長或相消？" aria-labelledby="activity-measure-title">
        <p className="activity__eyebrow">活動 1</p>
        <h3 id="activity-measure-title" className="activity__title" tabIndex={-1}>這個點為什麼相長或相消？</h3>
        <p className="activity__lead">波腹線上的點振動最強、波節線上的點幾乎不動。它們的位置有什麼共同點？</p>
        <p className="activity__notice" data-textbook-required hidden>這個活動用課本模式最清楚（等振幅、同相、無衰減）。<button type="button" className="btn btn--small" data-activity-action="setup-textbook">切回課本模式</button></p>
        <div className="step" data-activity-step="place"><p className="step__title"><span className="step__index">1</span>在圖上點一下，放一個觀測點 P</p><p className="step__body">圖上會標出 r₁ = |PS₁|（實線）和 r₂ = |PS₂|（虛線），右邊會算出兩者的差 Δr。聚焦圖面後按 Enter 也能放置。</p></div>
        <div className="step" data-activity-step="explore" hidden><p className="step__title"><span className="step__index">2</span>拖曳 P，讓它吸附到線上</p><p className="step__body">P 靠近線條時會自動吸附。兩種線各試一次，看看 |Δr|/λ 是多少：</p><p className="sr-only" data-measure-progress aria-live="polite">已觀察：波腹 0/1，波節 0/1</p>
          <ul className="checklist"><li data-check="constructive"><span className="checklist__box" aria-hidden="true"/><span>吸附到一條<b className="term term--constructive">波腹線</b>（橘色實線）</span><span className="checklist__value" data-observed="constructive">未觀察</span></li><li data-check="destructive"><span className="checklist__box" aria-hidden="true"/><span>吸附到一條<b className="term term--destructive">波節線</b>（藍綠色虛線）</span><span className="checklist__value" data-observed="destructive">未觀察</span></li></ul></div>
        <div className="step" data-activity-step="conclude" hidden><p className="step__title"><span className="step__index">3</span>你發現了什麼？</p><label className="select-row">波腹線上的 |Δr|/λ 都是 <select data-answer="measure-constructive"><option value="">選擇…</option><option value="integer">整數</option><option value="half">半整數</option><option value="none">沒有規律</option></select></label><label className="select-row">波節線上的 |Δr|/λ 都是 <select data-answer="measure-destructive"><option value="">選擇…</option><option value="integer">整數</option><option value="half">半整數</option><option value="none">沒有規律</option></select></label><div className="button-row"><button type="button" className="btn btn--primary" data-activity-action="measure-check">核對</button></div><p className="interference-feedback" data-feedback="measure" aria-live="polite"></p></div>
        <div className="activity__explain" data-activity-step="done" hidden><div className="formula-pair"><div><span className="term term--constructive">波腹</span><TexBlock>{String.raw`|\Delta r|=m\lambda`}</TexBlock></div><div><span className="term term--destructive">波節</span><TexBlock>{String.raw`|\Delta r|=\left(m+\tfrac12\right)\lambda`}</TexBlock></div></div><p className="activity__small">m = 0, 1, 2, …。路徑差每多一個 λ，相位差就多 2π；兩列波因此再次同相或反相抵達。</p><div className="button-row"><button type="button" className="btn btn--link" data-open-dialog="hyperbola">為什麼「距離差固定」會是雙曲線？</button></div></div>
      </article>
      <article className="interference-activity" data-activity="count" data-summary="2｜d = 3λ 時有幾條線？" aria-labelledby="activity-count-title" hidden>
        <p className="activity__eyebrow">活動 2</p>
        <h3 id="activity-count-title" className="activity__title" tabIndex={-1}>d = 3λ 時，有幾條線？</h3><p className="activity__lead">兩個同相波源相距三個波長。</p>
        <div className="step" data-activity-step="predict"><p className="step__title"><span className="step__index">1</span>先不要看圖，預測看看</p><div className="number-row"><Num answer="count-predict-antinodes" label="波腹線" /><Num answer="count-predict-nodes" label="波節線" /></div><div className="button-row"><button type="button" className="btn btn--primary" data-activity-action="count-lock" disabled>鎖定預測，套用 d = 3λ</button></div><p className="activity__small">「幾何」的線數會先遮住，等你數完再揭曉。</p></div>
        <div className="step" data-activity-step="observe" hidden><p className="prediction-echo">你的預測：波腹 <b data-prediction="antinodes"></b> 條、波節 <b data-prediction="nodes"></b> 條。</p><p className="step__title"><span className="step__index">2</span>現在數數圖上的線</p><p className="step__body">橘色實線是波腹線、藍綠色虛線是波節線。畫面邊緣、兩波源的連線上也要找找看。</p><div className="number-row"><Num answer="count-antinodes" label="波腹線" /><Num answer="count-nodes" label="波節線" /></div><div className="button-row"><button type="button" className="btn btn--primary" data-activity-action="count-check" disabled>核對</button><button type="button" className="btn btn--link" data-activity-action="count-reveal" hidden>直接看答案</button></div><p className="interference-feedback" data-feedback="count" aria-live="polite"></p></div>
        <div className="step" data-activity-step="done" hidden><p className="feedback--good" data-count-result aria-live="polite"></p><div className="activity__explain"><p className="activity__small">線數只由 d/λ 決定。「幾何」已把目前的數值代進公式——改變 d 或 λ，看它怎麼跟著變。</p><p className="activity__small">等號也計入：d = 3λ 時有 7 條波腹線、6 條波節線，最外側是退化半直線。</p><div className="button-row"><button type="button" className="btn btn--link" data-open-dialog="counts">線數公式怎麼來？</button><button type="button" className="btn btn--link" data-activity-go="edge">★ 進階探索</button><button type="button" className="btn btn--link" data-activity-action="count-retry">再做一次</button></div></div></div>
      </article>
      <article className="interference-activity" data-activity="antiphase" data-summary="3｜S₂ 晚半個週期，中央會怎樣？" aria-labelledby="activity-antiphase-title" hidden>
        <p className="activity__eyebrow">活動 3</p>
        <h3 id="activity-antiphase-title" className="activity__title" tabIndex={-1}>S₂ 晚半個週期，中央會怎樣？</h3><p className="activity__lead">兩個波源同相時，中央直線（Δr = 0）是波腹線。</p>
        <div className="step"><p className="step__title"><span className="step__index">1</span>如果 S₂ 比 S₁ 晚半個週期（φ₂ = 180°），中央線會</p><fieldset className="choices"><legend className="sr-only">先預測中央線</legend><label><input type="radio" name="antiphase-choice" value="antinode"/>仍是波腹</label><label><input type="radio" name="antiphase-choice" value="node"/>變成波節</label><label><input type="radio" name="antiphase-choice" value="unsure"/>不確定</label></fieldset><div className="button-row"><button type="button" className="btn btn--primary" data-activity-action="antiphase-apply" disabled>套用 φ₂ = 180°</button></div></div>
        <div className="step" data-activity-step="done" hidden><p className="interference-feedback" data-feedback="antiphase" aria-live="polite"></p><p className="step__body">原本的波腹線和波節線<b>整組互換位置</b>。相消條件不一定代表零振幅：振幅不等或有距離衰減時，中央可能仍有非零合成振幅。</p><div className="activity__formula"><TexBlock>{String.raw`\Delta\phi=\frac{2\pi}{\lambda}\Delta r+(\phi_2-\phi_1),\quad \Delta r=0\Rightarrow\Delta\phi=\pi`}</TexBlock></div><p className="callout"><b>同調 ≠ 同相。</b>相位差固定是 π，兩波源仍然同調，所以圖樣一樣穩定，只是位置換了。</p><div className="button-row"><button type="button" className="btn" data-activity-action="antiphase-toggle">切換 φ₂：0° ⇄ 180°</button><button type="button" className="btn btn--link" data-open-dialog="antiphase">相位差如何改變條件線？</button></div></div>
      </article>
      <article className="interference-activity" data-activity="time" data-summary="4｜波在動，波節線會跟著跑嗎？" aria-labelledby="activity-time-title" hidden>
        <p className="activity__eyebrow">活動 4</p>
        <h3 id="activity-time-title" className="activity__title" tabIndex={-1}>波在動，波節線會跟著跑嗎？</h3><p className="activity__lead">兩個波源不停送出向外傳播的波。</p>
        <div className="step"><p className="step__title"><span className="step__index">1</span>按播放之前先猜：波節線會</p><fieldset className="choices"><legend className="sr-only">播放之前先預測</legend><label><input type="radio" name="time-choice" value="moves"/>跟著波一起向外跑</label><label><input type="radio" name="time-choice" value="static"/>留在原地不動</label><label><input type="radio" name="time-choice" value="unsure"/>不確定</label></fieldset><div className="button-row"><button type="button" className="btn btn--primary" data-activity-action="time-start" disabled>觀察波的傳播</button></div><p className="activity__small">會切到「瞬時位移」並顯示波峰、波谷。</p></div>
        <div className="step" data-activity-step="observe" hidden><p className="step__title"><span className="step__index">2</span>盯著兩種線看</p><ul className="key-list"><li><i className="if-swatch if-swatch--crest"/>白色圓圈＝波峰，<i className="if-swatch if-swatch--trough"/>深色虛線圓圈＝波谷</li><li><i className="if-swatch"/>橘色實線、<i className="if-swatch if-swatch--destructive"/>藍綠色虛線＝波腹線、波節線</li></ul><p className="step__title" style={{marginTop:".7rem"}}><span className="step__index">3</span>你看到的是</p><fieldset className="choices choices--inline"><legend>波峰／波谷圓圈</legend><label><input type="radio" name="time-fronts" value="moves"/>在動</label><label><input type="radio" name="time-fronts" value="static"/>不動</label></fieldset><fieldset className="choices choices--inline"><legend>波腹線、波節線</legend><label><input type="radio" name="time-lines" value="moves"/>在動</label><label><input type="radio" name="time-lines" value="static"/>不動</label></fieldset><div className="button-row"><button type="button" className="btn btn--primary" data-activity-action="time-check" disabled>核對</button></div><p className="interference-feedback" data-feedback="time" aria-live="polite"></p></div>
        <div className="step" data-activity-step="done" hidden><p className="step__body">共同時間相位相消，因此穩態條件線固定；波峰、波谷仍向外傳播。介質微元在平衡位置附近振動，向外傳播的是波形與能量。</p><div className="activity__formula"><TexBlock>{String.raw`\Delta\theta=(kr_2+\phi_2-\omega t)-(kr_1+\phi_1-\omega t)=k\Delta r+(\phi_2-\phi_1)`}</TexBlock></div><p className="callout">再試：把 P 拖到一條波節線上，看右邊的 ψ(P, t) 是不是整個週期都是 0。</p><div className="button-row"><button type="button" className="btn btn--link" data-open-dialog="time">為什麼線不動？</button></div></div>
      </article>
      <article className="interference-activity" data-activity="edge" data-summary="★｜最外側的線跑去哪裡了？" aria-labelledby="activity-edge-title" hidden>
        <p className="activity__eyebrow">進階探索 ★</p>
        <h3 id="activity-edge-title" className="activity__title" tabIndex={-1}>最外側的線跑去哪裡了？</h3><p className="activity__lead">路徑差有上限：任何一點到兩波源的距離差，都不會超過兩波源的距離。</p>
        <div className="activity__formula"><TexBlock>{String.raw`|r_2-r_1|\le|S_1S_2|=d`}</TexBlock></div>
        <p className="step__title">讓 d 跨過 3λ，盯著兩波源外側的連線：</p>
        <div className="interference-activity-actions"><button type="button" className="btn" data-activity-action="edge-set" data-value="2.9">d = 2.9λ</button><button type="button" className="btn" data-activity-action="edge-set" data-value="3">d = 3λ</button><button type="button" className="btn" data-activity-action="edge-set" data-value="3.1">d = 3.1λ</button></div>
        <div className="edge-status" aria-live="polite"><span>第 3 階波腹線（|Δr| = 3λ）</span><strong data-edge-shape>—</strong></div>
        <ul className="edge-cases"><li><b>d &lt; 3λ</b>：3λ 超過上限，這條線不存在。</li><li><b>d = 3λ</b>：只有兩波源外側的連線能達到，雙曲線被壓成兩條半直線。</li><li><b>d &gt; 3λ</b>：它張開成真正的雙曲線。</li></ul>
        <div className="button-row"><button type="button" className="btn btn--link" data-open-dialog="hyperbola">雙曲線怎麼退化成半直線？</button></div>
      </article>
        </div>
        <div className="if-act-nav"><button type="button" className="btn btn--ghost" data-activity-nav="prev">← 上一個</button><button type="button" className="btn btn--ghost" data-activity-nav="next">下一個 →</button></div>
        </div>
      </aside>
    </div>
    <InterferenceDialogs />
  </section></MathProvider>;
}
