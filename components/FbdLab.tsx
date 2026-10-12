"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import KakauLabMark from "./KakauLabMark";
import ThemeToggle from "./ThemeToggle";
import { directionFromDegrees } from "../lib/science/fbd.ts";
import { addFbdForce, addFbdInteraction, createFbdForce, removeFbdForce, selectFbdForce, updateFbdForce, type FbdForceKind, type FbdLabState } from "../models/fbd.ts";
import { TABLE_AGENTS, commitTable, compareTable, compareTableSubmission, initialTableLearning, recordTablePrediction, releasedTableEvidence, removeTableSupport, reviseTable, type NormalAssumption, type TablePhase, type TablePrediction } from "../models/fbd-table.ts";
import styles from "./fbd/FbdLab.module.css";
import GraphiteFbdCanvas from "./fbd/GraphiteFbdCanvas.tsx";
import { applyGraphiteIntentToFbd } from "./fbd/graphiteAdapter.ts";

const BASELINE_FORCE_CHOICES: readonly [FbdForceKind, string][] = [["weight", "重力"], ["normal", "正向力"], ["other", "額外的平衡力（我的假設）"], ["friction", "摩擦力（我的假設）"]];
const RELEASED_FORCE_CHOICES: readonly [FbdForceKind, string][] = [["weight", "重力"], ["normal", "正向力"], ["other", "向下運動／加速度（我的假設）"], ["friction", "摩擦力（我的假設）"]];
const PHASE_LABELS: Record<TablePhase, string> = {
  scene: "觀察基線情境", system: "選擇系統", interactions: "辨識交互作用", forces: "建立基線力圖",
  committed: "提交", compared: "比較", change: "桌面撤除", predict: "先做預測", rebuild: "修訂受力模型",
};
const PREDICTION_LABELS = ["哪個交互作用會消失？", "哪個交互作用仍存在？", "物塊接下來的運動？"] as const;
const LOST_PREDICTION_TEXT = { earth: "地球與木塊", table: "桌面與木塊", none: "都不會消失" } as const;
const REMAINING_PREDICTION_TEXT = { earth: "地球與木塊", table: "桌面與木塊", none: "都沒有" } as const;
const MOTION_PREDICTION_TEXT = { stay: "保持靜止", down: "向下加速", up: "向上加速" } as const;
const FIXED_LENGTHS = {};
type PredictionDraft = Readonly<{ lostInteraction: string; remainingInteraction: string; motion: string; reason: string }>;
const EMPTY_PREDICTION: PredictionDraft = { lostInteraction: "", remainingInteraction: "", motion: "", reason: "" };

export default function FbdLab() {
  const shellRef = useRef<HTMLElement>(null);
  useEffect(() => { shellRef.current?.setAttribute("data-interactive", "true"); }, []);
  const [learning, setLearning] = useState(initialTableLearning);
  const [predictionDraft, setPredictionDraft] = useState<PredictionDraft>(EMPTY_PREDICTION);
  const nextId = useRef(1);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { learner, phase } = learning;
  const { diagram, selectedForceId } = learner;
  const selected = diagram.forces.find((force) => force.id === selectedForceId);
  const editable = phase === "interactions" || phase === "forces" || phase === "rebuild";
  const showDiagram = phase === "forces" || phase === "rebuild" || phase === "committed" || phase === "compared";
  const result = compareTableSubmission(learning);
  const forceChoices = learning.supportPresent ? BASELINE_FORCE_CHOICES : RELEASED_FORCE_CHOICES;
  const edit = (change: (current: FbdLabState) => FbdLabState) => setLearning((current) => ({ ...current, learner: change(current.learner) }));
  const move = (next: TablePhase) => { headingRef.current?.focus(); setLearning((current) => ({ ...current, phase: next })); };
  const toggleInteraction = (agent: typeof TABLE_AGENTS[number]) => edit((current) => {
    const id = `${agent.id}-block`;
    if (!current.diagram.interactions.some((interaction) => interaction.id === id)) return addFbdInteraction(current, { id, kind: agent.kind, sourceAgentId: agent.id, targetSystemId: current.diagram.system.id, label: `${agent.label} ↔ 木塊` });
    const forces = current.diagram.forces.filter((force) => force.interactionId !== id);
    return { ...current, selectedForceId: forces.some((force) => force.id === current.selectedForceId) ? current.selectedForceId : null, diagram: { ...current.diagram, forces, interactions: current.diagram.interactions.filter((interaction) => interaction.id !== id) } };
  });
  const addForce = (interactionId: string) => {
    const force = createFbdForce({ id: `force-${nextId.current++}`, interactionId, kind: "other", label: "尚未命名的力", direction: directionFromDegrees(0) });
    edit((current) => addFbdForce(current, force));
  };
  const degrees = selected ? (Math.round(Math.atan2(selected.direction.y, selected.direction.x) * 180 / Math.PI) + 360) % 360 : 0;

  return <main ref={shellRef} className={`lab-shell ${styles.shell}`}>
    <header className="topbar">
      <div><Link href="/" className="lab-brand" aria-label="Kakau Lab 模型目錄"><KakauLabMark /></Link><div className="eyebrow">Mechanics · FBD v0.1</div><h1>自由體圖：先找交互作用</h1></div>
      <div className="header-actions"><ThemeToggle /><button onClick={() => { setLearning(initialTableLearning()); setPredictionDraft(EMPTY_PREDICTION); nextId.current = 1; }}>重新開始</button></div>
    </header>
    <ol className={styles.steps} aria-label="學習流程">{["基線建模", "基線檢查", "撤除桌面", "先做預測", "修訂模型", "證據與回顧"].map((label, index) => {
      const current = phase === "scene" || phase === "system" || phase === "interactions" || phase === "forces" ? 0
        : learning.supportPresent ? 1 : phase === "change" ? 2 : phase === "predict" ? 3 : phase === "rebuild" ? 4 : phase === "compared" ? 5 : 4;
      return <li key={label} aria-current={index === current ? "step" : undefined}>{index + 1}. {label}</li>;
    })}</ol>
    <div className={styles.grid}>
      <section className={styles.card} aria-label="物理情境">
        <h2>{learning.supportPresent ? "情境：靜止在水平桌面上的木塊" : "情境：桌面剛從木塊下方撤走"}</h2>
        <p>{learning.supportPresent ? "木塊靜止在水平桌面上；除了桌面，沒有其他物體接觸它。忽略空氣阻力。請依情境判斷哪些物體對木塊施力。" : "只看木塊剛失去接觸的瞬間；原先靜止，尚未碰撞其他物體。忽略空氣阻力。先預測，再修改模型。"}</p>
        <svg className={styles.scene} viewBox="0 0 440 240" role="img" aria-label={learning.supportPresent ? "靜止的木塊放在水平桌面上；情境圖沒有力箭頭" : "木塊下方的桌面已撤走，木塊尚未碰撞其他物體；情境圖沒有力箭頭"}>
          {learning.supportPresent && <><rect x="45" y="128" width="345" height="16" rx="4" fill="var(--muted)" /><path d="M75 144v44M365 144v44" stroke="var(--muted)" strokeWidth="10" /></>}
          <rect x="150" y="66" width="100" height="62" rx="5" fill="#cba575" /><text x="200" y="101" textAnchor="middle" fill="#172a3b">木塊</text>
          {learning.supportPresent ? <text x="90" y="166" fill="currentColor">桌面</text> : <text x="220" y="177" textAnchor="middle" fill="currentColor">桌面已撤走</text>}
        </svg>
        <small>這是物理情境，沒有力箭頭。右側的 FBD 只畫作用在木塊上的力。</small>
      </section>
      <section className={styles.card} aria-label="學習工作區">
        <h2 ref={headingRef} tabIndex={-1}>{PHASE_LABELS[phase]}</h2>
        {phase === "scene" && <><p>先找出物體、接觸面與外部施力者，再決定研究哪個系統。</p><button onClick={() => move("system")}>開始選擇系統</button></>}
        {phase === "system" && <><p>本次只研究單一木塊。先選定研究系統，再判斷系統外有哪些施力者。</p><button onClick={() => move("interactions")}>選擇木塊為系統</button></>}
        {(phase !== "scene" && phase !== "system") && <>
          <p><strong>研究系統：{diagram.system.label}</strong> · 質點模型，沒有轉矩或作用點。</p>
          {editable && <fieldset className={styles.interactions}><legend>哪些外部施力者與木塊交互作用？</legend>{TABLE_AGENTS.map((agent) => <label key={agent.id}><input type="checkbox" checked={diagram.interactions.some((interaction) => interaction.sourceAgentId === agent.id)} onChange={() => toggleInteraction(agent)} />{agent.label} ↔ 木塊{!learning.supportPresent && agent.id === "table" ? "（桌面已撤走）" : ""}</label>)}<small>取消交互作用也會移除其力；力不能失去來源。</small></fieldset>}
          {phase === "interactions" && <button onClick={() => move("forces")}>用交互作用建立力圖</button>}
          {phase === "change" && <><p>桌面撤走了。先記錄你的預測，接著再檢查舊模型哪些部分仍適用。</p><button onClick={() => move("predict")}>先做預測</button></>}
          {phase === "predict" && <fieldset className={styles.editor}><legend>答案揭露前的預測</legend>
            <label>{PREDICTION_LABELS[0]}<select value={predictionDraft.lostInteraction} onChange={(event) => setPredictionDraft((current) => ({ ...current, lostInteraction: event.target.value }))}><option value="">請選擇</option><option value="table">桌面與木塊</option><option value="earth">地球與木塊</option><option value="none">都不會</option></select></label>
            <label>{PREDICTION_LABELS[1]}<select value={predictionDraft.remainingInteraction} onChange={(event) => setPredictionDraft((current) => ({ ...current, remainingInteraction: event.target.value }))}><option value="">請選擇</option><option value="earth">地球與木塊</option><option value="table">桌面與木塊</option><option value="none">都沒有</option></select></label>
            <label>{PREDICTION_LABELS[2]}<select value={predictionDraft.motion} onChange={(event) => setPredictionDraft((current) => ({ ...current, motion: event.target.value }))}><option value="">請選擇</option><option value="stay">保持靜止</option><option value="down">向下加速</option><option value="up">向上加速</option></select></label>
            <label>為什麼這樣預測？<textarea value={predictionDraft.reason} onChange={(event) => setPredictionDraft((current) => ({ ...current, reason: event.target.value }))} rows={3} maxLength={300} /></label>
            <button disabled={!predictionDraft.lostInteraction || !predictionDraft.remainingInteraction || !predictionDraft.motion || !predictionDraft.reason.trim()} onClick={() => { headingRef.current?.focus(); setLearning((current) => recordTablePrediction(current, predictionDraft as TablePrediction)); }}>保存預測並修訂模型</button>
          </fieldset>}
          {phase === "rebuild" && <p>下方保留你原先提交的模型作為草稿；請重新確認來源、力與方向，再提交。系統不會替你刪除舊力。</p>}
          {showDiagram && <>
            <div className={styles.diagram}>
              <GraphiteFbdCanvas diagram={diagram} lengths={FIXED_LENGTHS} selectedForceId={selectedForceId} editable={editable} ariaLabel={`木塊自由體圖，有 ${diagram.forces.length} 個由學習者建立的力；固定箭長只表示定性草圖。可拖曳選取力的箭頭方向。`} onSelectForce={(id) => edit((current) => selectFbdForce(current, id))} onIntent={(intent) => edit((current) => applyGraphiteIntentToFbd(current, intent))} /><small>箭尾共用質點，不代表實際接觸位置；固定箭長不表示力的大小。方向：右 0°、上 90°、左 180°、下 270°。</small>
            </div>
            {editable && <>
              <div className={styles.stack}>{diagram.interactions.map((interaction) => <button key={interaction.id} onClick={() => addForce(interaction.id)}>從 {interaction.label} 補一個力</button>)}{diagram.interactions.length === 0 && <p>先選交互作用，才能補力。</p>}</div>
              <div className={styles.forceList} aria-label="選擇力">{diagram.forces.map((force) => <button key={force.id} aria-pressed={force.id === selectedForceId} onClick={() => edit((current) => selectFbdForce(current, force.id))}>{force.label} · {diagram.interactions.find((interaction) => interaction.id === force.interactionId)?.label}</button>)}</div>
              {selected && <fieldset className={styles.editor}><legend>編輯選取的力</legend>
                <label>力的種類<select value={selected.kind} onChange={(event) => { const kind = event.target.value as FbdForceKind; edit((current) => updateFbdForce(current, selected.id, { kind, label: forceChoices.find((choice) => choice[0] === kind)![1] })); }}>{forceChoices.map(([kind, label]) => <option key={kind} value={kind}>{label}</option>)}</select></label>
                <label>交互作用來源<select value={selected.interactionId} onChange={(event) => edit((current) => updateFbdForce(current, selected.id, { interactionId: event.target.value }))}>{diagram.interactions.map((interaction) => <option key={interaction.id} value={interaction.id}>{interaction.label}</option>)}</select></label>
                <label>方向（度）<input type="range" min="0" max="359" step="1" value={degrees} onChange={(event) => edit((current) => updateFbdForce(current, selected.id, { direction: directionFromDegrees(Number(event.target.value)) }))} /><output>{degrees}°</output></label>
                <div className={styles.directions}>{[[0, "向右"], [90, "向上"], [180, "向左"], [270, "向下"]].map(([angle, label]) => <button key={angle} onClick={() => edit((current) => updateFbdForce(current, selected.id, { direction: directionFromDegrees(Number(angle)) }))}>{label}</button>)}</div>
                <p>力大小：未知。箭長固定，不表示牛頓值；拖曳箭頭只會改方向。</p><button onClick={() => edit((current) => removeFbdForce(current, selected.id))}>刪除選取的力</button>
              </fieldset>}
              {learning.supportPresent && <label className={styles.assumption}>你對正向力的假設<select value={learning.assumption} onChange={(event) => setLearning((current) => ({ ...current, assumption: event.target.value as NormalAssumption }))}><option value="unknown">先不判斷大小</option><option value="always-mg">任何情況都有 N = mg</option><option value="vertical-balance">只有垂直平衡、無其他垂直力時才有 N = mg</option></select></label>}
              <button className={styles.primary} onClick={() => { headingRef.current?.focus(); setLearning(commitTable); }}>提交我的力圖</button>
            </>}
            {phase === "committed" && <><p>已保存你的提交。比較只讀取這次提交，不會自動補上答案。</p><button onClick={() => setLearning(compareTable)}>比較交互作用與力</button><button onClick={() => setLearning(reviseTable)}>返回修正</button></>}
            {result && <div aria-live="polite" className={styles.feedback}><h3>{result.pass ? "PASS：交互作用、力的身分與方向一致" : "還有需要修正的模型假設"}</h3><ul>{result.diagnostics.map((diagnostic, index) => <li key={index} data-code={diagnostic.code}><strong>{diagnostic.severity === "issue" ? "待修正" : "大小未定"}</strong>：{diagnostic.message}</li>)}</ul>
              {!learning.supportPresent && result.pass && <section aria-label="物理證據" className={styles.evidence}><h4>物理證據｜剛撤走桌面後</h4><p>以向上為 +y。原先靜止，撤走瞬間速度仍為 0；接著由剩下的作用力決定加速度。</p><p>ΣF<sub>y</sub> = {releasedTableEvidence().netForceY}，a<sub>y</sub> = {releasedTableEvidence().accelerationY} ≈ {releasedTableEvidence().accelerationMps2Y} m/s²，方向向下。</p><p>合力與加速度是模型的結果，不能再畫成一支作用力。</p><h4>回看你的預測</h4>{learning.prediction && <><p>你預測消失：{LOST_PREDICTION_TEXT[learning.prediction.lostInteraction]}；仍存在：{REMAINING_PREDICTION_TEXT[learning.prediction.remainingInteraction]}；運動：{MOTION_PREDICTION_TEXT[learning.prediction.motion]}。</p><p>{learning.prediction.reason}</p></>}<small>這段自述由你填寫；系統沒有判讀文字是否正確。請比較預測、受力來源與證據。</small></section>}
              {learning.supportPresent && result.pass && <button onClick={() => { headingRef.current?.focus(); setLearning(removeTableSupport); }}>撤走桌面，開始下一段</button>}
              <button onClick={() => { headingRef.current?.focus(); setLearning(reviseTable); }}>修正我的力圖</button></div>}
          </>}
        </>}
      </section>
    </div>
  </main>;
}
