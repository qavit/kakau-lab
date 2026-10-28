"use client";

import { useEffect, useRef } from "react";
import { mountInterference } from "@/components/interference/mountInterference";

interface InterferenceSimulationProps { enabled?: boolean }

export default function InterferenceSimulation({ enabled = true }: InterferenceSimulationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = containerRef.current;
    if (!enabled || !container) return;
    const controller = mountInterference(container);
    return () => controller.dispose();
  }, [enabled]);

  return <section ref={containerRef} className="interference-lab" aria-label="雙點波源干涉模擬器" data-testid="interference-host">
    <style>{`
      .interference-lab{font:14px/1.45 system-ui,sans-serif;color:#243244;background:#f5f6f4;padding:clamp(12px,3vw,28px);border-radius:14px}
      .interference-lab h1{font-size:1.5rem;margin:0 0 6px}.interference-lab p{margin:4px 0}
      .interference-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(190px,260px);gap:18px;align-items:start}
      .interference-controls,.interference-readout{display:grid;gap:10px;background:white;padding:14px;border:1px solid #d9dfe4;border-radius:10px}
      .interference-control{display:grid;grid-template-columns:1fr auto;gap:4px 8px;align-items:center}.interference-control input{grid-column:1/-1;width:100%;accent-color:#526d82}
      .interference-plot{position:relative;width:min(100%,560px);aspect-ratio:1;margin:auto;background:#f7f6f1;border:1px solid #cbd3d9;touch-action:none;overflow:hidden}
      .interference-plot canvas,.interference-plot svg{position:absolute;inset:0;width:100%;height:100%}.interference-plot svg{pointer-events:auto;touch-action:none}
      .interference-plot [data-layer="measurement"]{pointer-events:none}.interference-controls button{padding:7px 10px;border:1px solid #c5cdd3;border-radius:6px;background:#fff;color:inherit;cursor:pointer}
      .interference-time{display:grid;grid-template-columns:auto auto 1fr;gap:10px;align-items:center;margin-top:14px}.interference-time input{width:100%}
      .interference-readout dl{display:grid;grid-template-columns:1fr auto;gap:5px;margin:0}.interference-readout dt,.interference-readout dd{margin:0}
      .interference-controls button[data-action="clear-point"]{justify-self:start}
      @media(max-width:700px){.interference-layout{grid-template-columns:1fr}.interference-controls{grid-template-columns:1fr 1fr}.interference-controls h2,.interference-controls fieldset{grid-column:1/-1}.interference-time{grid-template-columns:auto auto}.interference-time label{grid-column:1/-1}}
    `}</style>
    <header><h1>雙點波源干涉</h1><p>選擇波場表徵、調整參數，點擊圖面放置觀測點 P。</p><button type="button" data-action="reset-parameters">重設參數</button></header>
    <div className="interference-layout">
      <div>
        <div data-interference-host>
          <div className="interference-plot" data-interference-plot>
            <canvas data-interference-canvas aria-label="雙點波源瞬時場 Canvas" />
            <svg data-interference-overlay viewBox="0 0 600 600" aria-hidden="true"><g data-layer="wavefronts"/><g data-layer="conditions"/><g data-layer="measurement"/><g data-layer="sources"/></svg>
          </div>
          <p data-point-position aria-live="polite">尚未放置 P</p>
        </div>
        <div className="interference-time">
          <button type="button" data-action="play-pause" aria-pressed="false">▶ 播放</button>
          <button type="button" data-action="reset-time">重設時間</button>
          <label>t / T <output data-output="time-cycle">0.00</output><input data-control="time-cycle" type="range" min="0" max="1" step="0.001" defaultValue="0"/></label>
        </div>
      </div>
      <div className="interference-controls">
        <h2>基本控制</h2>
        <label className="interference-control">波長 λ <output data-output="wavelength">1.00</output><input data-control="wavelength" type="range" min="0.5" max="1.5" step="0.01" defaultValue="1"/></label>
        <label className="interference-control">波源間距 d <output data-output="separation">2.00</output><input data-control="separation" type="range" min="0.75" max="4" step="0.01" defaultValue="2"/></label>
        <details><summary>波源與介質參數</summary>
          <label className="interference-control">振幅 A₁ <output data-output="amplitude1">1.00</output><input data-control="amplitude1" type="range" min="0.2" max="1.5" step="0.05" defaultValue="1"/></label>
          <label className="interference-control">振幅 A₂ <output data-output="amplitude2">1.00</output><input data-control="amplitude2" type="range" min="0.2" max="1.5" step="0.05" defaultValue="1"/></label>
          <label className="interference-control">初相位 φ₁ <output data-output="phase1">0°</output><input data-control="phase1" type="range" min="0" max="360" step="5" defaultValue="0"/></label>
          <label className="interference-control">初相位 φ₂ <output data-output="phase2">0°</output><input data-control="phase2" type="range" min="0" max="360" step="5" defaultValue="0"/></label>
          <label className="interference-control">波速 v <output data-output="waveSpeed">1.00</output><input data-control="waveSpeed" type="range" min="0.5" max="2" step="0.05" defaultValue="1"/></label>
          <label className="interference-control">頻率 f <output data-output="frequency">1.00</output><input data-control="frequency" type="range" min="0.5" max="2" step="0.05" defaultValue="1"/></label>
          <p>v = fλ。調整時間只改變瞬時位移，條件線與穩定場圖樣保持固定。</p>
          <label><input data-control="attenuation" type="checkbox"/> 1/√r 距離衰減</label>
          <label><input data-control="wavefronts" type="checkbox"/> 波峰／波谷圓</label>
        </details>
        <fieldset><legend>波場表徵</legend>{([ ["displacement","瞬時位移 ψ"],["intensity","強度 |C|²"],["amplitude","合成振幅 |C|"],["phase","合成相位 Φ"] ] as const).map(([value,label],index)=><label key={value} style={{display:"block"}}><input type="radio" name="interference-view" value={value} defaultChecked={index===0}/>{label}</label>)}</fieldset>
        <label><input data-control="constructive" type="checkbox" defaultChecked/> 波腹條件線</label>
        <label><input data-control="destructive" type="checkbox" defaultChecked/> 波節條件線</label>
        <button type="button" data-action="clear-point" hidden>清除 P</button>
        <section className="interference-readout" data-testid="selected-point-panel"><h2>觀測點 P</h2><p data-point-empty>點擊波場建立 P，可拖曳移動。</p><div data-point-values hidden>
          <dl><dt>r₁</dt><dd data-readout="r1">—</dd><dt>r₂</dt><dd data-readout="r2">—</dd><dt>Δr = r₂ − r₁</dt><dd data-readout="path">—</dd><dt>Δr / λ</dt><dd data-readout="pathRatio">—</dd><dt>Δφ</dt><dd data-readout="phase-difference">—</dd><dt>振幅 |C|</dt><dd data-readout="amplitude">—</dd><dt>瞬時位移</dt><dd data-readout="displacement">—</dd></dl>
        </div></section>
      </div>
    </div>
  </section>;
}
