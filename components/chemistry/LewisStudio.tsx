"use client";
import Link from "next/link";
import { useState } from "react";
import { advanceBond, type DrawTool } from "../../models/chemistry/lewis-editor";
import KakauLabMark from "../KakauLabMark";
import ThemeToggle from "../ThemeToggle";
import { initialCo2, evaluateCo2, type LewisDiagram } from "../../models/chemistry/lewis";
import styles from "./LewisStudio.module.css";
import { initialPairPlacement, changePairCount, octetInspection, applyPairPlacement, availableSites, type PairPlacement, type PairSite } from "../../models/chemistry/lewis-placement";

const feedback = {
  "invalid-structure":["結構資料錯誤，請重設。","Invalid structure: please reset."],
  "missing-bond":["請先把兩個氧原子連接到碳原子。","Connect both oxygens to carbon first."],
  "electron-excess":["超過 16 個價電子，檢查鍵結與孤對電子。","More than 16 electrons are used."],
  "electron-deficit":["還有價電子沒有分配，檢查孤對電子與鍵結。","Some valence electrons remain unallocated."],
  octet:["電子總數正確，但至少一個原子尚未符合八隅體。","The electron total is correct but an atom lacks an octet."],
  "formal-charge":["電子數與八隅體符合，但本題要求零形式電荷的主要結構。","Find the dominant structure with zero formal charges."],
  pass:["完成！總共 16 個價電子，所有原子符合八隅體，形式電荷均為零。","Correct: 16 electrons, complete octets and zero formal charges."],
} as const;
const xPos: Record<string, number> = { "o-left": 65, c: 190, "o-right": 315 };
function Diagram({ data, tool, locked, placement, representation, inspectId, onAtom, onBond, onInspect }: {
  data: LewisDiagram; tool: DrawTool; locked: boolean; placement: PairPlacement; representation: "line"|"dots"; inspectId: string|null;
  onAtom: (id: string) => void; onInspect: (id: string) => void; onBond: (a: string, b: string) => void;
}) {
  const action = (label: string, callback: () => void) => ({
    role: "button" as const,
    tabIndex: locked ? -1 : 0,
    "aria-label": label,
    onClick: () => { if (!locked) callback(); },
    onKeyDown: (event: React.KeyboardEvent<SVGGElement>) => {
      if (!locked && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault(); callback();
      }
    },
  });
  return <svg className={styles.drawing} viewBox="0 0 380 220" role="group" aria-label="CO₂ structure construction workspace">
    {data.bonds.map((bond) => {
      const left = Math.min(xPos[bond.a], xPos[bond.b]) + 28;
      const right = Math.max(xPos[bond.a], xPos[bond.b]) - 28;
      const cx = (left + right) / 2;
      return <g key={bond.a + bond.b} className={styles.hitTarget}
        {...action(bond.a + "–" + bond.b + ", bond order " + bond.order, () => onBond(bond.a, bond.b))}>
        <rect x={left - 10} y={83} width={right - left + 20} height={55} rx={10} fill="transparent" />
        {Array.from({length:bond.order},(_,i) => representation==="line" ? <line key={i}
          x1={left} x2={right} y1={110+(i-(bond.order-1)/2)*12}
          y2={110+(i-(bond.order-1)/2)*12} stroke="var(--strong)"
          strokeWidth="3.5" strokeLinecap="round" pointerEvents="none"/> : <g key={i} fill="#008c94" pointerEvents="none"><circle cx={(left+right)/2-6} cy={110+(i-(bond.order-1)/2)*12} r="3.5"/><circle cx={(left+right)/2+6} cy={110+(i-(bond.order-1)/2)*12} r="3.5"/></g>)}
        {bond.order === 0 && <path d={"M"+left+" 110H"+right} stroke="var(--muted)"
          strokeDasharray="4 6" strokeWidth="1.5" pointerEvents="none"/>}
        <text x={cx} y={153} textAnchor="middle" fill="var(--muted)" fontSize="10" pointerEvents="none">
          {bond.order === 0 ? "+" : ""}
        </text>
        <title>{bond.a + " to " + bond.b + ", order " + bond.order}</title>
      </g>;
    })}
    {data.atoms.map((atom) => {
      const x = xPos[atom.id];
      const sites = availableSites(atom.id);
      const coord = (site: PairSite): [number,number] => {
        if(site==="top") return [x,53];
        if(site==="bottom") return [x,168];
        if(site==="outer") return [atom.id==="o-left"?x-55:x+55,110];
        return [x,110];
      };
      return <g key={atom.id}>
        <circle cx={x} cy="110" r="43" className={inspectId===atom.id?styles.inspectRing:styles.hiddenRing} pointerEvents="none"/>
        <g className={styles.hitTarget} {...action(atom.id+" atom",()=>tool==="bond" ? onInspect(atom.id) : onAtom(atom.id))}>
          <circle cx={x} cy="110" r="33" fill="transparent"/>
        </g>
        <circle cx={x} cy="110" r="27" fill="var(--surface-solid)"
          stroke="var(--line-strong)" strokeWidth="1.5" pointerEvents="none"/>
        <text x={x} y="120" fontSize="28" textAnchor="middle"
          fill="var(--ink)" fontWeight="600" pointerEvents="none">{atom.element}</text>
        {sites.map(site=>{
          const [px,py]=coord(site);
          const filled=(placement[atom.id]??[]).includes(site);
          return <g key={site} className={styles.hitTarget}
            {...action(atom.id+" "+site+" lone-pair position "+(filled?"occupied":"empty"),()=>onAtom(atom.id))}>
            <circle cx={px} cy={py} r="19" fill="transparent" stroke="none"/>
            {filled?<g fill="#008c94" pointerEvents="none"><circle cx={site==="outer"?px: px-5} cy={site==="outer"?py-5:py} r="3.6"/><circle cx={site==="outer"?px: px+5} cy={site==="outer"?py+5:py} r="3.6"/></g>:
            false?<circle cx={px} cy={py} r="12" fill="none"
              stroke="var(--line-strong)" strokeDasharray="3 4" pointerEvents="none"/>:null}
            <title>{atom.element+" "+site+" electron-pair position"}</title>
          </g>;
        })}
      </g>;
    })}
  </svg>;
}
export default function LewisStudio() {
  const [diagram,setDiagram]=useState(initialCo2);
  const [placement,setPlacement]=useState(initialPairPlacement);
  const [tool,setTool]=useState<DrawTool>("bond");
  const [undo,setUndo]=useState<{ diagram: LewisDiagram; placement: PairPlacement }[]>([]);
  const [redo,setRedo]=useState<{ diagram: LewisDiagram; placement: PairPlacement }[]>([]);
  const [language,setLanguage]=useState<"zh"|"dual"|"en">("zh");
  const [submission,setSubmission]=useState<ReturnType<typeof evaluateCo2>|null>(null);
  const [attempts,setAttempts]=useState(0);
  const [first,setFirst]=useState<string|null>(null);
  const [hint,setHint]=useState(0);
  const [representation,setRepresentation]=useState<"line"|"dots">("line");
  const [inspect,setInspect]=useState<string|null>(null);
  const pass=submission?.pass===true;
  const evaluated=evaluateCo2(diagram);
  const t=(zh:string,en:string)=>language==="en"?en:language==="dual"?zh+" / "+en:zh;
  const edit=(fn:(d:LewisDiagram)=>LewisDiagram)=>{if(pass)return;const next=fn(diagram);if(next===diagram)return;setUndo(h=>[...h,{diagram,placement}]);setRedo([]);setDiagram(next);setSubmission(null);};
  const useUndo=()=>{if(pass||!undo.length)return;setRedo(h=>[{diagram,placement},...h]);setDiagram(undo[undo.length-1].diagram);setPlacement(undo[undo.length-1].placement);setUndo(h=>h.slice(0,-1));setSubmission(null);};
  const useRedo=()=>{if(pass||!redo.length)return;setUndo(h=>[...h,diagram]);setDiagram(redo[0].diagram);setPlacement(redo[0].placement);setRedo(h=>h.slice(1));setSubmission(null);};
  const onAtom=(id:string)=>{if(pass||tool==="bond")return;
    const next=changePairCount(placement,id,tool==="pair"?1:-1);
    if(next===placement)return;
    setUndo(h=>[...h,{diagram,placement}]);setRedo([]);setPlacement(next);
    setDiagram(applyPairPlacement(diagram,next));setSubmission(null);
  };
  const onBond=(a:string,b:string)=>{if(tool==="bond"||tool==="erase")edit(d=>advanceBond(d,a,b,tool));};
  const reset=()=>{setDiagram(initialCo2());setPlacement(initialPairPlacement());setSubmission(null);setAttempts(0);setFirst(null);setHint(0);setUndo([]);setRedo([]);setTool("bond");setInspect(null);};
  const commit=()=>{const result=evaluateCo2(diagram);setSubmission(result);setAttempts(attempts+1);if(first===null)setFirst(result.code);};
  return <main className={"lab-shell "+styles.shell}>
    <header className="topbar"><div><Link href="/" className="lab-brand" aria-label="Kakau Lab"><KakauLabMark/></Link><div className="eyebrow">Chemistry · Lewis Studio POC</div><h1>{t("自己畫出 CO₂ 的路易斯結構","Construct the Lewis structure of CO₂")}</h1></div><div className="header-actions"><ThemeToggle/><button onClick={reset}>{t("重設","Reset")}</button></div></header>
    <div className={styles.intro}><p>{t("固定 O—C—O 骨架。請自己分配鍵級與孤對電子，再提交你的模型。","The O–C–O backbone is fixed. Choose bond orders and lone pairs, then submit.")}</p><label>{t("語言","Language")} <select value={language} onChange={e=>setLanguage(e.target.value as typeof language)}><option value="zh">繁體中文</option><option value="dual">中英雙語</option><option value="en">English</option></select></label></div>
    <div className={styles.grid}>
      <section className={styles.card}><h2>{t("你的電子點式","Your Lewis structure")}</h2>
      <div className={styles.tools} role="group" aria-label={t("編輯工具","Drawing tools")}>
        {([["bond","建立鍵","Bond"],["pair","孤對電子","Lone pair"],["erase","橡皮擦","Erase"]] as const).map(([value,zh,en])=><button key={value} type="button"
          className={tool===value?styles.selected:""} aria-pressed={tool===value}
          disabled={pass} onClick={()=>setTool(value)}>{t(zh,en)}</button>)}
      </div>
      <div className={styles.tools}><button aria-pressed={representation==="line"} className={representation==="line"?styles.selected:""} onClick={()=>setRepresentation("line")}>鍵線模式</button><button aria-pressed={representation==="dots"} className={representation==="dots"?styles.selected:""} onClick={()=>setRepresentation("dots")}>電子點模式</button><button aria-pressed={inspect!==null} onClick={()=>setInspect(inspect===null?"c":null)}>檢查八隅體</button></div>
      <Diagram data={diagram} tool={tool} locked={pass} placement={placement} representation={representation} inspectId={inspect} onAtom={onAtom} onInspect={setInspect} onBond={onBond}/>
      {inspect && <p className={styles.hint} aria-live="polite">{inspect}：鍵結電子 {octetInspection(diagram,inspect)?.bondingElectrons} ＋ 非鍵結電子 {octetInspection(diagram,inspect)?.nonbondingElectrons} ＝ {octetInspection(diagram,inspect)?.total} / 8</p>}
      <p className={styles.note}>{tool==="bond"?t("點擊兩原子之間，依序建立單鍵、雙鍵、參鍵。","Click between atoms to add single, double or triple bonds."):tool==="pair"?t("點擊原子本身，系統自動安排下一對孤對電子。","Click an atom to auto-place the next lone pair."):t("點擊原子移除最近放置的電子對；點擊鍵降低鍵級。","Click an atom to erase the last lone pair or a bond to decrease order.")}</p>
      <div className={styles.history}><button disabled={pass||undo.length===0} onClick={useUndo}>{t("復原","Undo")}</button><button disabled={pass||redo.length===0} onClick={useRedo}>{t("重做","Redo")}</button></div><div className={styles.budget}><strong>{t("已使用價電子","Used valence electrons")}：{evaluated.usedElectrons} / {evaluated.expectedElectrons}</strong><span>{t("氧各 6 個、碳 4 個","O: 6 each; C: 4")}</span></div><p className={styles.note}>{t("鍵線表示共享電子對；青色兩點代表孤對電子。圖形位置不代表實際鍵角。","Bond lines represent bonding pairs; teal dots represent lone pairs. Positions do not represent bond angles.")}</p></section>
      <section className={styles.card}><h2>{t("提交與診斷","Commit & feedback")}</h2>
      <p className={styles.note}>{t("使用左側工具直接操作原子與鍵。鍵盤使用者可 Tab 選取，按 Enter 或空白鍵操作。","Use the tools on the left. Keyboard: Tab to select, Enter or Space to edit.")}</p>
      <div className={styles.actions}>{pass?<button className="primary-action" onClick={reset}>{t("從空白再畫一次","Draw again from memory")}</button>:<><button className="primary-action" onClick={commit}>{t("提交我的結構","Commit my drawing")}</button><button onClick={()=>setHint(Math.min(3,hint+1))}>{t("提示","Hint")} {hint?hint+"/3":""}</button></>}</div>
      {hint>0&&!pass&&<p className={styles.hint}>{[t("先算出 CO₂ 總共有幾個價電子。","Start with the total valence-electron count."),t("檢查每個原子周圍的鍵結電子與非鍵結電子。","Count bonding and nonbonding electrons around each atom."),t("碳未滿八隅體時，思考怎樣調整鍵級。","If carbon lacks an octet, reconsider the C–O bond orders.")][hint-1]}</p>}
      {submission&&<div className={submission.pass?styles.success:styles.diagnostic} role="status" aria-live="polite"><strong>{submission.pass?t("通過","Passed"):t("請修正","Revise")}</strong><p>{feedback[submission.code][language==="en"?1:0]}</p>{pass&&<small>{t("現在可以從空白再畫一次。","Now try drawing again from memory.")}</small>}</div>}
      <p className={styles.note}>{t("提交","Submissions")}: {attempts} · {t("提示","Hints")}: {hint} · {t("首次","First")}: {first??"—"}</p>
      </section>
    </div><footer className={styles.footer}>Kakau Lab · Chemistry POC · {t("尚未發布，待教師驗收","Not released; awaiting teacher review")}</footer>
  </main>;
}
