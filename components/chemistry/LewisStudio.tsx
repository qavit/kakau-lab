"use client";
import Link from "next/link";
import { useState } from "react";
import { advanceBond, editLonePairs } from "../../models/chemistry/lewis-editor";
import KakauLabMark from "../KakauLabMark";
import ThemeToggle from "../ThemeToggle";
import { initialDiagram, evaluateLewis, type LewisCode, type LewisDiagram, type SpeciesId } from "../../models/chemistry/lewis";
import { SPECIES, SPECIES_ORDER, atomLabel } from "../../models/chemistry/lewis-species";
import { ATOM_CLEARANCE, LAYOUTS, PAIR_RADIUS, bondPairDots, viewBoxOf, directionDegrees, lonePairAngles, tangentPair } from "../../models/chemistry/lewis-layout";
import { commit, createHistory, redo, undo } from "../../models/chemistry/lewis-history";
import { budgetNote, diagnose, hints } from "../../models/chemistry/lewis-feedback";
import { octetInspection } from "../../models/chemistry/lewis-placement";
import styles from "./LewisStudio.module.css";

type Language = "zh" | "dual" | "en";
const pick = (language: Language, [zh, en]: readonly [string, string]) =>
  language === "en" ? en : language === "dual" ? zh + " / " + en : zh;

function Diagram({ data, locked, representation, inspectId, onAtom, onBond, onInspect, onRemoveAtom, onRemoveBond }: {
  data: LewisDiagram; locked: boolean; representation: "line" | "dots"; inspectId: string | null;
  onAtom: (id: string) => void; onInspect: (id: string) => void; onBond: (a: string, b: string) => void;
  onRemoveAtom: (id: string) => void; onRemoveBond: (a: string, b: string) => void;
}) {
  const species = SPECIES[data.speciesId];
  const layout = LAYOUTS[data.speciesId];
  const box = viewBoxOf(layout);
  const at = (id: string) => layout.positions[id];
  const editable = !locked && inspectId === null;
  const action = (label: string, callback: () => void, remove: () => void) => ({
    role: "button" as const,
    tabIndex: locked && inspectId === null ? -1 : 0,
    "aria-label": label,
    onClick: () => { if (!locked || inspectId !== null) callback(); },
    onContextMenu: (event: React.MouseEvent<SVGGElement>) => { event.preventDefault(); if (editable) remove(); },
    onKeyDown: (event: React.KeyboardEvent<SVGGElement>) => {
      if ((inspectId !== null || !locked) && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); callback(); }
      if (editable && (event.key === "Backspace" || event.key === "Delete")) { event.preventDefault(); remove(); }
    },
  });
  return <svg className={styles.drawing} viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`} role="group" aria-label={species.formula + " structure construction workspace"}>
    {data.bonds.map((bond) => {
      const a = at(bond.a), b = at(bond.b);
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const ux = (b.x - a.x) / dist, uy = (b.y - a.y) / dist, nx = -uy, ny = ux;
      const start = { x: a.x + ux * ATOM_CLEARANCE, y: a.y + uy * ATOM_CLEARANCE };
      const end = { x: b.x - ux * ATOM_CLEARANCE, y: b.y - uy * ATOM_CLEARANCE };
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const hitLength = dist - 2 * ATOM_CLEARANCE + 20;
      const label = atomLabel(species, bond.a) + "–" + atomLabel(species, bond.b);
      return <g key={bond.a + bond.b} className={styles.hitTarget}
        {...action(label + ", bond order " + bond.order, () => onBond(bond.a, bond.b), () => onRemoveBond(bond.a, bond.b))}>
        <rect x={mid.x - hitLength / 2} y={mid.y - 27} width={hitLength} height={54} rx={10} fill="transparent"
          transform={`rotate(${directionDegrees(a, b)} ${mid.x} ${mid.y})`} />
        {representation === "line" && Array.from({ length: bond.order }, (_, i) => {
          const off = (i - (bond.order - 1) / 2) * 12;
          return <line key={i} x1={start.x + nx * off} y1={start.y + ny * off} x2={end.x + nx * off} y2={end.y + ny * off}
            stroke="var(--strong)" strokeWidth="3.5" strokeLinecap="round" pointerEvents="none" />;
        })}
        {representation === "dots" && bondPairDots(a, b, bond.order).map((pair, i) =>
          <g key={i} fill="#008c94" pointerEvents="none">{pair.map((dot, j) => <circle key={j} cx={dot.x} cy={dot.y} r="3.5" />)}</g>)}
        {bond.order === 0 && <path d={`M${start.x} ${start.y}L${end.x} ${end.y}`} stroke="var(--muted)"
          strokeDasharray="4 6" strokeWidth="1.5" pointerEvents="none" />}
        <title>{label + ", order " + bond.order}</title>
      </g>;
    })}
    {data.atoms.map((atom) => {
      const p = at(atom.id);
      const bondAngles = data.bonds.filter((bond) => bond.a === atom.id || bond.b === atom.id)
        .map((bond) => directionDegrees(p, at(bond.a === atom.id ? bond.b : bond.a)));
      const label = atomLabel(species, atom.id);
      return <g key={atom.id}>
        <circle cx={p.x} cy={p.y} r="77" className={inspectId === atom.id ? styles.inspectRing : styles.hiddenRing} pointerEvents="none" />
        <g className={styles.hitTarget} {...action(label + " atom, " + atom.lonePairs + " lone pairs", () => inspectId !== null ? onInspect(atom.id) : onAtom(atom.id), () => onRemoveAtom(atom.id))}>
          <circle cx={p.x} cy={p.y} r="33" fill="transparent" />
        </g>
        <circle cx={p.x} cy={p.y} r="27" fill="var(--surface-solid)" stroke="var(--line-strong)" strokeWidth="1.5" pointerEvents="none" />
        <text x={p.x} y={p.y + 10} fontSize="28" textAnchor="middle" fill="var(--ink)" fontWeight="600" pointerEvents="none">{atom.element}</text>
        <g fill="#008c94" pointerEvents="none">
          {lonePairAngles(bondAngles, atom.lonePairs).map((angle, i) =>
            tangentPair(p.x, p.y, PAIR_RADIUS, angle).map((dot, j) => <circle key={i + "-" + j} cx={dot.x} cy={dot.y} r="3.6" />))}
        </g>
      </g>;
    })}
  </svg>;
}

export default function LewisStudio() {
  const [speciesId, setSpeciesId] = useState<SpeciesId>(SPECIES_ORDER[0]);
  const [history, setHistory] = useState(() => createHistory(initialDiagram(SPECIES_ORDER[0])));
  const [eraseMode, setEraseMode] = useState(false);
  const [language, setLanguage] = useState<Language>("zh");
  const [submission, setSubmission] = useState<{ code: LewisCode; pass: boolean; message: readonly [string, string] } | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [first, setFirst] = useState<LewisCode | null>(null);
  const [hint, setHint] = useState(0);
  const [representation, setRepresentation] = useState<"line" | "dots">("line");
  const [inspect, setInspect] = useState<string | null>(null);
  const diagram = history.present;
  const species = SPECIES[speciesId];
  const pass = submission?.pass === true;
  const evaluated = evaluateLewis(diagram);
  const t = (zh: string, en: string) => pick(language, [zh, en]);
  const hintList = hints(diagram);

  const start = (id: SpeciesId) => {
    setSpeciesId(id); setHistory(createHistory(initialDiagram(id))); setSubmission(null); setAttempts(0);
    setFirst(null); setHint(0); setEraseMode(false); setInspect(null);
  };
  const edit = (fn: (d: LewisDiagram) => LewisDiagram) => {
    if (pass || inspect !== null) return;
    const next = fn(diagram);
    if (next === diagram) return;
    setHistory(commit(history, next)); setSubmission(null);
  };
  const stepHistory = (fn: typeof undo) => { if (!pass) { setHistory(fn(history)); setSubmission(null); } };
  const onAtom = (id: string) => edit((d) => editLonePairs(d, id, eraseMode ? "erase" : "pair"));
  const onRemoveAtom = (id: string) => edit((d) => editLonePairs(d, id, "erase"));
  const onBond = (a: string, b: string) => edit((d) => advanceBond(d, a, b, eraseMode ? "erase" : "bond"));
  const onRemoveBond = (a: string, b: string) => edit((d) => advanceBond(d, a, b, "erase"));
  const commitDrawing = () => {
    const result = evaluateLewis(diagram);
    setSubmission({ code: result.code, pass: result.pass, message: diagnose(diagram, result) });
    setAttempts(attempts + 1);
    if (first === null) setFirst(result.code);
  };
  const centreAtom = species.atoms.reduce((best, a) =>
    species.bonds.filter(([x, y]) => x === a.id || y === a.id).length > species.bonds.filter(([x, y]) => x === best.id || y === best.id).length ? a : best).id;
  const nextSpecies = SPECIES_ORDER[(SPECIES_ORDER.indexOf(speciesId) + 1) % SPECIES_ORDER.length];
  const inspected = inspect ? octetInspection(diagram, inspect) : null;

  return <main className={"lab-shell " + styles.shell}>
    <header className="topbar"><div><Link href="/" className="lab-brand" aria-label="Kakau Lab"><KakauLabMark /></Link><div className="eyebrow">Chemistry · Lewis Studio · Practice Mode</div><h1>{t(`自己畫出 ${species.formula} 的路易斯結構`, `Construct the Lewis structure of ${species.formula}`)}</h1></div><div className="header-actions"><ThemeToggle /><button onClick={() => start(speciesId)}>{t("重設", "Reset")}</button></div></header>
    <div className={styles.intro}><p><strong>Guided Practice</strong>　{t(`原子的連接（虛線）由題目提供，你要決定每條連線共享幾對電子，以及各原子的孤對電子。${species.nameZh}共有 ${evaluated.expectedElectrons} 個價電子。`, `The atom connections (dashed lines) are given. Choose how many pairs each connection shares and the lone pairs on each atom. ${species.nameEn} has ${evaluated.expectedElectrons} valence electrons.`)}</p><label>{t("語言", "Language")} <select value={language} onChange={(e) => setLanguage(e.target.value as Language)}><option value="zh">繁體中文</option><option value="dual">中英雙語</option><option value="en">English</option></select></label></div>
    <div className={styles.tools} role="group" aria-label={t("選擇分子", "Choose a molecule")}>{SPECIES_ORDER.map((id) => <button key={id} type="button" aria-pressed={id === speciesId} className={id === speciesId ? styles.selected : ""} onClick={() => start(id)}>{SPECIES[id].formula}</button>)}</div>
    <div className={styles.grid}>
      <section className={styles.card}><h2>{t("你的電子點式", "Your Lewis structure")}</h2>
        <p className={styles.note}>{t("左鍵點原子增加孤對電子、點鍵增加鍵級；右鍵移除。觸控或鍵盤可使用刪除模式。", "Click an atom to add a lone pair, a bond to increase order; right-click to remove. Use Erase mode for touch or keyboard.")}</p>
        <div className={styles.tools}><button type="button" className={eraseMode ? styles.selected : ""} aria-pressed={eraseMode} disabled={pass} onClick={() => setEraseMode((v) => !v)}>{t("刪除模式", "Erase mode")}</button></div>
        <div className={styles.tools}><button aria-pressed={representation === "line"} className={representation === "line" ? styles.selected : ""} onClick={() => setRepresentation("line")}>{t("鍵線模式", "Bond lines")}</button><button aria-pressed={representation === "dots"} className={representation === "dots" ? styles.selected : ""} onClick={() => setRepresentation("dots")}>{t("電子點模式", "Electron dots")}</button><button aria-pressed={inspect !== null} onClick={() => setInspect(inspect === null ? centreAtom : null)}>{t("檢查八隅體", "Check shells")}</button></div>
        <Diagram data={diagram} locked={pass} representation={representation} inspectId={inspect} onAtom={onAtom} onRemoveAtom={onRemoveAtom} onInspect={setInspect} onBond={onBond} onRemoveBond={onRemoveBond} />
        {inspect && inspected && <p className={styles.hint} aria-live="polite">{atomLabel(species, inspect)}：{t("鍵結電子", "bonding")} {inspected.bondingElectrons} ＋ {t("非鍵結電子", "nonbonding")} {inspected.nonbondingElectrons} ＝ {inspected.total} / {inspected.target}</p>}
        <div className={styles.history}><button disabled={pass || history.past.length === 0} onClick={() => stepHistory(undo)}>{t("復原", "Undo")}</button><button disabled={pass || history.future.length === 0} onClick={() => stepHistory(redo)}>{t("重做", "Redo")}</button></div>
        <div className={styles.budget}><strong>{t("已使用價電子", "Used valence electrons")}：{evaluated.usedElectrons} / {evaluated.expectedElectrons}</strong><span>{pick(language, budgetNote(diagram))}</span></div>
        <p className={styles.note}>{t("鍵線表示共享電子對；青色兩點代表孤對電子。圖形位置只是 Lewis 記法，不代表實際鍵角。", "Bond lines represent bonding pairs; teal dots represent lone pairs. Positions are Lewis notation, not bond angles.")}</p></section>
      <section className={styles.card}><h2>{t("提交與診斷", "Commit & feedback")}</h2>
        <p className={styles.note}>{t("使用左側工具直接操作原子與鍵。鍵盤使用者可 Tab 選取，按 Enter 或空白鍵操作。", "Use the tools on the left. Keyboard: Tab to select, Enter or Space to edit.")}</p>
        <div className={styles.actions}>{pass ? <><button className="primary-action" onClick={() => start(nextSpecies)}>{t("下一題：", "Next: ")}{SPECIES[nextSpecies].formula}</button><button onClick={() => start(speciesId)}>{t("從空白再畫一次", "Draw again from memory")}</button></> : <><button className="primary-action" onClick={commitDrawing}>{t("提交我的結構", "Commit my drawing")}</button><button onClick={() => setHint(Math.min(3, hint + 1))}>{t("提示", "Hint")} {hint ? hint + "/3" : ""}</button></>}</div>
        {hint > 0 && !pass && <p className={styles.hint}>{pick(language, hintList[hint - 1])}</p>}
        {submission && <div className={submission.pass ? styles.success : styles.diagnostic} role="status" aria-live="polite"><strong>{submission.pass ? t("通過", "Passed") : t("請修正", "Revise")}</strong><p>{pick(language, submission.message)}</p>{pass && <small>{t("可以進入下一題，或不看提示從空白再畫一次。", "Go to the next molecule, or redraw this one from memory.")}</small>}</div>}
        <p className={styles.note}>{t("提交", "Submissions")}: {attempts} · {t("提示", "Hints")}: {hint} · {t("首次", "First")}: {first ?? "—"}</p>
      </section>
    </div><footer className={styles.footer}>Kakau Lab · Chemistry · Practice Mode MVP · {t("尚未發布，待教師驗收", "Not released; awaiting teacher review")}</footer>
  </main>;
}
