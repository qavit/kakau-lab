"use client";

import { useEffect, useRef, type MouseEvent } from "react";
import { mountInterference } from "@/components/interference/mountInterference";
import { MathProvider, TexBlock } from "@/components/math/MathJax";
import InterferenceDialogs from "@/components/interference/InterferenceDialogs";

interface InterferenceSimulationProps { enabled?: boolean }

export default function InterferenceSimulation({ enabled = true }: InterferenceSimulationProps) {
  const containerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const container = containerRef.current;
    if (!enabled || !container) return;
    const controller = mountInterference(container);
    const aside = container.querySelector<HTMLElement>(".interference-activities");
    const toggle = container.querySelector<HTMLButtonElement>('[data-action="toggle-activities"]');
    const hint = container.querySelector<HTMLElement>("[data-plot-hint]");
    try {
      const stored = localStorage.getItem("kakau-lab-interference-sidebar");
      const open = stored === "open" || (stored !== "closed" && matchMedia("(min-width: 1024px)").matches);
      if (aside) aside.dataset.collapsed = String(!open);
      if (toggle) { toggle.setAttribute("aria-expanded", String(open)); toggle.textContent = open ? "收合活動側欄" : "展開活動側欄"; }
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
  };
  const toggleActivities = (event: MouseEvent<HTMLButtonElement>) => {
    const aside = containerRef.current?.querySelector<HTMLElement>(".interference-activities");
    if (!aside) return;
    const collapsed = aside.dataset.collapsed !== "true";
    aside.dataset.collapsed = String(collapsed);
    event.currentTarget.setAttribute("aria-expanded", String(!collapsed));
    event.currentTarget.textContent = collapsed ? "展開活動側欄" : "收合活動側欄";
    try { localStorage.setItem("kakau-lab-interference-sidebar", collapsed ? "closed" : "open"); } catch { /* storage may be unavailable */ }
  };
  const dismissPlotHint = () => {
    const root = containerRef.current;
    const hint = root?.querySelector<HTMLElement>("[data-plot-hint]");
    if (hint) hint.hidden = true;
    try { localStorage.setItem("kakau-lab-interference-plot-hint", "dismissed"); } catch { /* storage may be unavailable */ }
    root?.querySelector<HTMLElement>("[data-interference-plot]")?.focus();
  };

  return <MathProvider><section ref={containerRef} className="interference-lab" aria-label="雙點波源干涉模擬器" data-testid="interference-host">
    <style>{`
      .interference-lab{font:14px/1.45 system-ui,sans-serif;color:#243244;background:#f5f6f4;padding:clamp(12px,3vw,28px);border-radius:14px}
      .interference-lab h1{font-size:1.5rem;margin:0 0 6px}.interference-lab p{margin:4px 0}
      .interference-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(190px,260px) minmax(280px,340px);gap:18px;align-items:start}
      .interference-controls,.interference-readout{display:grid;gap:10px;background:white;padding:14px;border:1px solid #d9dfe4;border-radius:10px}
      .interference-control{display:grid;grid-template-columns:1fr auto;gap:4px 8px;align-items:center}.interference-control input{grid-column:1/-1;width:100%;accent-color:#526d82}
      .interference-plot{position:relative;width:min(100%,560px);aspect-ratio:1;margin:auto;background:#f7f6f1;border:1px solid #cbd3d9;touch-action:none;overflow:hidden}
      .interference-plot canvas,.interference-plot svg{position:absolute;inset:0;width:100%;height:100%}.interference-plot svg{pointer-events:auto;touch-action:none}
      .interference-plot [data-layer="measurement"]{pointer-events:none}.interference-controls button{padding:7px 10px;border:1px solid #7b8994;border-radius:6px;background:#fff;color:inherit;cursor:pointer}
      .interference-time{display:grid;grid-template-columns:auto auto 1fr;gap:10px;align-items:center;margin-top:14px}.interference-time input{width:100%}
      .interference-readout dl{display:grid;grid-template-columns:1fr auto;gap:5px;margin:0}.interference-readout dt,.interference-readout dd{margin:0}
      .interference-controls button[data-action="clear-point"]{justify-self:start}
      .interference-activities{background:white;border:1px solid #d9dfe4;border-radius:10px;padding:14px;min-width:0}.interference-activities[data-collapsed="true"]>nav,.interference-activities[data-collapsed="true"]>article,.interference-activities[data-collapsed="true"]>.interference-activity-actions{display:none}
      .interference-projection{position:fixed;inset:0;z-index:1000;overflow:auto;border-radius:0;background:#f5f6f4}.interference-projection .interference-plot{width:min(72vh,70vw,760px)}
      .interference-tabs,.interference-activity-actions{display:flex;gap:6px;flex-wrap:wrap}.interference-tabs button[aria-current="step"]{background:#29394c;color:#fff}
      .interference-activity[hidden],[data-activity-step][hidden]{display:none}.interference-activity{padding-top:10px}.interference-activity label{display:block;margin:7px 0}.interference-activity input[type=number]{width:5em;margin-left:8px}
      .interference-feedback{min-height:1.5em}.interference-waveform{width:100%;max-width:260px;height:96px;border:1px solid #d9dfe4}.interference-waveform path{fill:none;stroke:#376f9d;stroke-width:2}.interference-waveform circle{fill:#c7770b}
      .interference-dialog{max-width:min(640px,calc(100vw - 24px));max-height:85vh;overflow:auto;border:1px solid #cbd3d9;border-radius:12px;padding:20px}
      .interference-dialog h3{margin:1em 0 .25em}.interference-dialog p{margin:.6em 0;line-height:1.7}.interference-dialog button{margin-top:1em}
      .interference-plot-hint{position:absolute;bottom:8px;left:8px;right:8px;z-index:2;background:#fffef0;color:#243244;padding:5px 8px;border-radius:6px;pointer-events:none}.interference-plot-hint button{pointer-events:auto;margin-left:8px}
      .interference-lab :is(button,input,select,summary,[data-interference-plot]):focus-visible{outline:3px solid #174c70;outline-offset:3px}
      .interference-field-summary{margin-top:8px!important;line-height:1.6}
      @media(prefers-reduced-motion:reduce){.interference-lab *, .interference-lab *::before, .interference-lab *::after{scroll-behavior:auto!important;animation-duration:.01ms!important;transition-duration:.01ms!important}}
      @media(max-width:1000px){.interference-layout{grid-template-columns:minmax(0,1fr) minmax(190px,260px)}.interference-activities{grid-column:1/-1}}
      @media(max-width:700px){.interference-activities{min-width:0}.interference-tabs button{flex:1}.interference-plot{width:100%}.interference-layout{grid-template-columns:1fr}.interference-controls{grid-template-columns:1fr 1fr}.interference-controls h2,.interference-controls fieldset{grid-column:1/-1}.interference-time{grid-template-columns:auto auto}.interference-time label{grid-column:1/-1}.interference-projection .interference-plot{width:100%;max-width:85vh}}
    `}</style>
    <header><h1>雙點波源干涉</h1><p>選擇波場表徵、調整參數；點擊圖面或按 Enter 放置觀測點 P。</p><button type="button" data-action="reset-parameters">重設參數</button><button type="button" data-action="projection" aria-pressed="false" onClick={toggleProjection}>投影模式</button></header>
    <div className="interference-layout">
      <div>
        <div data-interference-host>
          <div className="interference-plot" data-interference-plot tabIndex={0} role="application" aria-label="波場與觀測點。按 Enter 或空白鍵在中央建立 P，方向鍵移動，Shift 加大步距，Delete 清除。" aria-describedby="interference-field-summary">
            <canvas data-interference-canvas aria-hidden="true" />
            <svg data-interference-overlay viewBox="0 0 600 600" aria-hidden="true"><g data-layer="wavefronts"/><g data-layer="conditions"/><g data-layer="measurement"/><g data-layer="sources"/></svg>
            <p className="interference-plot-hint" data-plot-hint><span>點一下放 P，按住可拖曳，點兩下移除</span><button type="button" aria-label="關閉操作說明" onClick={dismissPlotHint}>×</button></p>
          </div>
          <p data-point-position aria-live="polite">尚未放置 P</p>
          <p data-point-announcement aria-live="polite" />
          <p id="interference-field-summary" className="interference-field-summary" data-field-summary>目前顯示瞬時位移。橘色實線是相長條件，青色虛線是相消條件；兩個波源位於中央線左右。可用 P 取得路徑差和分類讀值。</p>
        </div>
        <div className="interference-time">
          <button type="button" data-action="play-pause" aria-pressed="false">▶ 播放</button>
          <button type="button" data-action="reset-time">重設時間</button>
          <label>t / T <output data-output="time-cycle">0.00</output><input aria-label="模擬時間 t / T" data-control="time-cycle" type="range" min="0" max="1" step="0.001" defaultValue="0"/></label>
        </div>
      </div>
      <div className="interference-controls">
        <h2>基本控制</h2>
        <label className="interference-control">波長 λ <output data-output="wavelength">1.00</output><input aria-label="波長 λ" data-control="wavelength" type="range" min="0.5" max="1.5" step="0.01" defaultValue="1"/></label>
        <label className="interference-control">波源間距 d <output data-output="separation">2.00</output><input aria-label="波源間距 d" data-control="separation" type="range" min="0.75" max="4" step="0.01" defaultValue="2"/></label>
        <details><summary>波源與介質參數</summary>
          <label className="interference-control">振幅 A₁ <output data-output="amplitude1">1.00</output><input aria-label="波源一振幅 A₁" data-control="amplitude1" type="range" min="0.2" max="1.5" step="0.05" defaultValue="1"/></label>
          <label className="interference-control">振幅 A₂ <output data-output="amplitude2">1.00</output><input aria-label="波源二振幅 A₂" data-control="amplitude2" type="range" min="0.2" max="1.5" step="0.05" defaultValue="1"/></label>
          <label className="interference-control">初相位 φ₁ <output data-output="phase1">0°</output><input aria-label="波源一初相位 φ₁" data-control="phase1" type="range" min="0" max="360" step="5" defaultValue="0"/></label>
          <label className="interference-control">初相位 φ₂ <output data-output="phase2">0°</output><input aria-label="波源二初相位 φ₂" data-control="phase2" type="range" min="0" max="360" step="5" defaultValue="0"/></label>
          <label className="interference-control">波速 v <output data-output="waveSpeed">1.00</output><input aria-label="波速 v" data-control="waveSpeed" type="range" min="0.5" max="2" step="0.05" defaultValue="1"/></label>
          <label className="interference-control">頻率 f <output data-output="frequency">1.00</output><input aria-label="頻率 f" data-control="frequency" type="range" min="0.5" max="2" step="0.05" defaultValue="1"/></label>
          <p>v = fλ。調整時間只改變瞬時位移，條件線與穩定場圖樣保持固定。</p>
          <label><input data-control="attenuation" type="checkbox"/> 1/√r 距離衰減</label>
          <label><input data-control="wavefronts" type="checkbox"/> 波峰／波谷圓</label>
        </details>
        <fieldset><legend>波場表徵</legend>{([ ["displacement","瞬時位移 ψ"],["intensity","強度 |C|²"],["amplitude","合成振幅 |C|"],["phase","合成相位 Φ"] ] as const).map(([value,label],index)=><label key={value} style={{display:"block"}}><input type="radio" name="interference-view" value={value} defaultChecked={index===0}/>{label}</label>)}</fieldset>
        <label><input data-control="constructive" type="checkbox" defaultChecked/> 波腹條件線</label>
        <label><input data-control="destructive" type="checkbox" defaultChecked/> 波節條件線</label>
        <button type="button" data-action="clear-point" hidden>清除 P</button>
        <section className="interference-readout" data-testid="selected-point-panel"><h2>觀測點 P</h2><p data-point-empty>點擊波場或在圖面按 Enter 建立 P；可拖曳或用方向鍵移動。</p><div data-point-values hidden>
          <dl><dt>r₁</dt><dd data-readout="r1">—</dd><dt>r₂</dt><dd data-readout="r2">—</dd><dt>Δr = r₂ − r₁</dt><dd data-readout="path">—</dd><dt>|Δr| / λ</dt><dd data-readout="pathRatio">—</dd><dt>Δφ</dt><dd data-readout="phase-difference">—</dd><dt>合成振幅 |C|</dt><dd data-readout="amplitude">—</dd><dt>瞬時位移 ψ(P,t)</dt><dd data-readout="displacement">—</dd><dt>分類</dt><dd data-readout="classification">—</dd></dl>
          <svg className="interference-waveform" viewBox="0 0 240 90" role="img" aria-label="觀測點 P 一週期位移波形" data-waveform><path data-waveform-curve d=""/><circle data-waveform-marker cx="0" cy="45" r="4"/></svg>
        </div></section>
      </div>
      <aside className="interference-activities" aria-label="引導活動" data-collapsed="false">
      <h2>引導活動 <span data-activity-progress>1 / 4</span></h2><button type="button" data-action="toggle-activities" aria-expanded="true" onClick={toggleActivities}>收合活動側欄</button>
      <nav className="interference-tabs" aria-label="選擇活動">{([["measure","1｜路徑差"],["count","2｜線數預測"],["antiphase","3｜反相波源"],["time","4｜波在動嗎？"],["edge","★ 進階探索"]] as const).map(([id,label],i)=><button type="button" data-activity-tab={id} aria-current={i===0?"step":undefined} key={id}>{label}</button>)}</nav>
      <article className="interference-activity" data-activity="measure" aria-labelledby="activity-measure-title">
        <h3 id="activity-measure-title" tabIndex={-1}>這個點為什麼相長或相消？</h3>
        <p>等振幅、同相、無衰減的課本模式中，波腹線上的點振動最強，波節線上的點幾乎不動。它們的位置有什麼共同點？</p>
        <p data-textbook-required hidden>此活動使用課本條件（等振幅、同相、無衰減）判讀。<button type="button" data-activity-action="setup-textbook">切回課本模式</button></p>
        <div data-activity-step="place"><p><b>1｜放置觀測點</b>　在圖上點一下或聚焦圖面後按 Enter 建立 P；圖上會標出 r₁、r₂，讀值區會計算路徑差 Δr。</p></div>
        <div data-activity-step="explore" hidden><p><b>2｜移動並吸附</b>　拖曳 P 到波腹線和波節線，記錄兩種線上的 |Δr|/λ。</p><p data-measure-progress aria-live="polite">已觀察：波腹 0/1，波節 0/1</p><ul><li>波腹線：<span data-observed="constructive">未觀察</span></li><li>波節線：<span data-observed="destructive">未觀察</span></li></ul></div>
        <div data-activity-step="conclude" hidden><p><b>3｜整理規律</b>　你發現波腹線與波節線的 |Δr|/λ 有什麼不同？</p><label>波腹線上的 |Δr|/λ 都是 <select data-answer="measure-constructive"><option value="">選擇…</option><option value="integer">整數</option><option value="half">半整數</option><option value="none">沒有規律</option></select></label><label>波節線上的 |Δr|/λ 都是 <select data-answer="measure-destructive"><option value="">選擇…</option><option value="integer">整數</option><option value="half">半整數</option><option value="none">沒有規律</option></select></label><button type="button" data-activity-action="measure-check">核對</button><p className="interference-feedback" data-feedback="measure" aria-live="polite"></p></div>
        <div data-activity-step="done" hidden><TexBlock>{String.raw`|\Delta r|=m\lambda,\quad |\Delta r|=(m+\tfrac12)\lambda`}</TexBlock><p>路徑差每多一個 λ，相位差就多 2π；兩列波因此再次同相或反相抵達。</p><button type="button" data-open-dialog="hyperbola">為什麼距離差固定會是雙曲線？</button></div>
      </article>
      <article className="interference-activity" data-activity="count" aria-labelledby="activity-count-title" hidden><h3 id="activity-count-title" tabIndex={-1}>d = 3λ 時，有幾條線？</h3><div data-activity-step="predict"><p>先預測，再揭開圖樣：</p><label>波腹線<input data-answer="count-predict-antinodes" type="number" min="0" max="40"/></label><label>波節線<input data-answer="count-predict-nodes" type="number" min="0" max="40"/></label><button type="button" data-activity-action="count-lock" disabled>鎖定預測，套用 d = 3λ</button></div><div data-activity-step="observe" hidden><p>預測：波腹 <b data-prediction="antinodes"></b> 條、波節 <b data-prediction="nodes"></b> 條。現在觀察線條並計數。</p><label>波腹線<input data-answer="count-antinodes" type="number" min="0" max="40"/></label><label>波節線<input data-answer="count-nodes" type="number" min="0" max="40"/></label><button type="button" data-activity-action="count-check" disabled>核對</button><button type="button" data-activity-action="count-reveal" hidden>直接看答案</button><p className="interference-feedback" data-feedback="count" aria-live="polite"></p></div><div data-activity-step="done" hidden><p data-count-result aria-live="polite"></p><p>等號也計入：d = 3λ 時有 7 條波腹線、6 條波節線，最外側是退化半直線。</p><button type="button" data-activity-action="count-retry">再做一次</button><button type="button" data-open-dialog="counts">線數公式怎麼來？</button><button type="button" data-activity-go="edge">進階探索</button></div></article>
      <article className="interference-activity" data-activity="antiphase" aria-labelledby="activity-antiphase-title" hidden><h3 id="activity-antiphase-title" tabIndex={-1}>S₂ 晚半個週期，中央會怎樣？</h3><p>兩個波源同相時，中央線 Δr=0 是波腹線。先預測 φ₂ 改成 180° 後中央線的變化。</p><fieldset><legend>先預測中央線</legend><label><input type="radio" name="antiphase-choice" value="antinode"/>仍是波腹</label><label><input type="radio" name="antiphase-choice" value="node"/>變成波節</label><label><input type="radio" name="antiphase-choice" value="unsure"/>不確定</label></fieldset><button type="button" data-activity-action="antiphase-apply" disabled>套用 φ₂ = 180°</button><div data-activity-step="done" hidden><p data-feedback="antiphase" aria-live="polite"></p><p>原本的波腹線和波節線整組互換。相消條件不一定代表零振幅：振幅不等或有距離衰減時，中央可能仍有非零合成振幅。</p><TexBlock>{String.raw`\Delta\phi=\frac{2\pi}{\lambda}\Delta r+(\phi_2-\phi_1),\quad \Delta r=0\Rightarrow\Delta\phi=\pi`}</TexBlock><button type="button" data-activity-action="antiphase-toggle">切換 φ₂：0° ⇄ 180°</button><button type="button" data-open-dialog="antiphase">相位差如何改變條件線？</button></div></article>
      <article className="interference-activity" data-activity="time" aria-labelledby="activity-time-title" hidden><h3 id="activity-time-title" tabIndex={-1}>波在動，波節線會跟著跑嗎？</h3><p>兩列波持續向外傳播。播放前先預測，然後觀察波峰、波谷圓和相長／相消條件線。</p><fieldset><legend>播放之前先預測</legend><label><input type="radio" name="time-choice" value="moves"/>跟著波跑</label><label><input type="radio" name="time-choice" value="static"/>留在原地</label><label><input type="radio" name="time-choice" value="unsure"/>不確定</label></fieldset><button type="button" data-activity-action="time-start" disabled>觀察波的傳播</button><div data-activity-step="observe" hidden><p>觀察白色波峰圓、虛線波谷圓與固定條件線。</p><label><input type="radio" name="time-fronts" value="moves"/>波峰／波谷在動</label><label><input type="radio" name="time-fronts" value="static"/>波峰／波谷不動</label><label><input type="radio" name="time-lines" value="moves"/>條件線在動</label><label><input type="radio" name="time-lines" value="static"/>條件線不動</label><button type="button" data-activity-action="time-check" disabled>核對</button><p className="interference-feedback" data-feedback="time" aria-live="polite"></p></div><div data-activity-step="done" hidden><p>共同時間相位相消，因此穩態條件線固定；波峰、波谷仍向外傳播。介質微元在平衡位置附近振動，向外傳播的是波形與能量。</p><TexBlock>{String.raw`\Delta\theta=(kr_2+\phi_2-\omega t)-(kr_1+\phi_1-\omega t)=k\Delta r+(\phi_2-\phi_1)`}</TexBlock><button type="button" data-open-dialog="time">為什麼線不動？</button></div></article>
      <article className="interference-activity" data-activity="edge" aria-labelledby="activity-edge-title" hidden><h3 id="activity-edge-title" tabIndex={-1}>最外側的線跑去哪裡了？</h3><p>改變 d/λ 穿越 3，觀察第 3 階波腹條件線的形狀。</p><div className="interference-activity-actions"><button type="button" data-activity-action="edge-set" data-value="2.9">d = 2.9λ</button><button type="button" data-activity-action="edge-set" data-value="3">d = 3λ</button><button type="button" data-activity-action="edge-set" data-value="3.1">d = 3.1λ</button></div><p data-edge-shape aria-live="polite">—</p><p>不存在、兩條退化半直線、雙曲線。路徑差上限是 d。</p><button type="button" data-open-dialog="hyperbola">雙曲線的幾何</button></article>
      <div className="interference-activity-actions"><button type="button" data-activity-nav="prev">← 上一個</button><button type="button" data-activity-nav="next">下一個 →</button></div>
      </aside>
    </div>
    <InterferenceDialogs />
  </section></MathProvider>;
}
