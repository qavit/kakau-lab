"use client";
import Link from "next/link";
import { useState } from "react";
import KakauLabMark from "../KakauLabMark";
import ThemeToggle from "../ThemeToggle";
import { initialCo2, evaluateCo2, setBondOrder, setLonePairs, type LewisDiagram } from "../../models/chemistry/lewis";
import styles from "./LewisStudio.module.css";

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
function Diagram({ data }: { data: LewisDiagram }) {
  return <svg className={styles.drawing} viewBox="0 0 380 220" role="img" aria-label="O–C–O Lewis structure with editable bond orders and lone pairs">
    {data.bonds.map((bond) => {
      const low = Math.min(xPos[bond.a],xPos[bond.b])+28;
      const high = Math.max(xPos[bond.a],xPos[bond.b])-28;
      return <g key={bond.a+bond.b} stroke="var(--strong)" strokeWidth="3.5" strokeLinecap="round">{Array.from({length:bond.order},(_,i)=><line key={i} x1={low} y1={110+(i-(bond.order-1)/2)*12} x2={high} y2={110+(i-(bond.order-1)/2)*12}/>)}</g>;
    })}
    {data.atoms.map((atom)=>{
      const x=xPos[atom.id];
      const spots = [[x,60],[x,158],[atom.id==="o-right"?x+46:x-46,110],[atom.id==="o-right"?x-46:x+46,55]];
      return <g key={atom.id}>
        <circle cx={x} cy="110" r="27" fill="var(--surface-solid)" stroke="var(--line-strong)" strokeWidth="1.5"/>
        <text x={x} y="120" fontSize="28" textAnchor="middle" fill="var(--ink)" fontWeight="600">{atom.element}</text>
        {spots.slice(0,atom.lonePairs).map(([px,py],i)=><g key={i} fill="#008c94"><circle cx={px-5} cy={py} r="3.6"/><circle cx={px+5} cy={py} r="3.6"/></g>)}
      </g>;
    })}
  </svg>;
}
export default function LewisStudio() {
  const [diagram,setDiagram]=useState(initialCo2);
  const [language,setLanguage]=useState<"zh"|"dual"|"en">("zh");
  const [submission,setSubmission]=useState<ReturnType<typeof evaluateCo2>|null>(null);
  const [attempts,setAttempts]=useState(0);
  const [first,setFirst]=useState<string|null>(null);
  const [hint,setHint]=useState(0);
  const pass=submission?.pass===true;
  const evaluated=evaluateCo2(diagram);
  const t=(zh:string,en:string)=>language==="en"?en:language==="dual"?zh+" / "+en:zh;
  const edit=(fn:(d:LewisDiagram)=>LewisDiagram)=>{if(!pass){setDiagram(fn(diagram));setSubmission(null);}};
  const reset=()=>{setDiagram(initialCo2());setSubmission(null);setAttempts(0);setFirst(null);setHint(0);};
  const commit=()=>{const result=evaluateCo2(diagram);setSubmission(result);setAttempts(attempts+1);if(first===null)setFirst(result.code);};
  return <main className={"lab-shell "+styles.shell}>
    <header className="topbar"><div><Link href="/" className="lab-brand" aria-label="Kakau Lab"><KakauLabMark/></Link><div className="eyebrow">Chemistry · Lewis Studio POC</div><h1>{t("自己畫出 CO₂ 的路易斯結構","Construct the Lewis structure of CO₂")}</h1></div><div className="header-actions"><ThemeToggle/><button onClick={reset}>{t("重設","Reset")}</button></div></header>
    <div className={styles.intro}><p>{t("固定 O—C—O 骨架。請自己分配鍵級與孤對電子，再提交你的模型。","The O–C–O backbone is fixed. Choose bond orders and lone pairs, then submit.")}</p><label>{t("語言","Language")} <select value={language} onChange={e=>setLanguage(e.target.value as typeof language)}><option value="zh">繁體中文</option><option value="dual">中英雙語</option><option value="en">English</option></select></label></div>
    <div className={styles.grid}>
      <section className={styles.card}><h2>{t("你的電子點式","Your Lewis structure")}</h2><Diagram data={diagram}/><div className={styles.budget}><strong>{t("已使用價電子","Used valence electrons")}：{evaluated.usedElectrons} / {evaluated.expectedElectrons}</strong><span>{t("氧各 6 個、碳 4 個","O: 6 each; C: 4")}</span></div><p className={styles.note}>{t("鍵線表示共享電子對；青色兩點代表孤對電子。圖形位置不代表實際鍵角。","Bond lines represent bonding pairs; teal dots represent lone pairs. Positions do not represent bond angles.")}</p></section>
      <section className={styles.card}><h2>{t("調整模型","Edit the model")}</h2><div className={styles.controls}>
        {diagram.bonds.map((bond,i)=><div key={bond.a+bond.b} className={styles.control}><span>{i===0?"左 O—C":"右 C—O"} · {t("鍵級","Bond order")}</span><div className={styles.stepper}><button disabled={pass||bond.order===0} aria-label={"bond "+i+" decrement"} onClick={()=>edit(d=>setBondOrder(d,bond.a,bond.b,bond.order-1))}>−</button><output>{bond.order}</output><button disabled={pass||bond.order===3} aria-label={"bond "+i+" increment"} onClick={()=>edit(d=>setBondOrder(d,bond.a,bond.b,bond.order+1))}>+</button></div></div>)}
        {diagram.atoms.map((atom,i)=><div key={atom.id} className={styles.control}><span>{i===0?"左 O":i===1?"中央 C":"右 O"} · {t("孤對電子","Lone pairs")}</span><div className={styles.stepper}><button disabled={pass||atom.lonePairs===0} aria-label={atom.id+" pairs decrement"} onClick={()=>edit(d=>setLonePairs(d,atom.id,atom.lonePairs-1))}>−</button><output>{atom.lonePairs}</output><button disabled={pass||atom.lonePairs===4} aria-label={atom.id+" pairs increment"} onClick={()=>edit(d=>setLonePairs(d,atom.id,atom.lonePairs+1))}>+</button></div></div>)}
      </div>
      <div className={styles.actions}>{pass?<button className="primary-action" onClick={reset}>{t("從空白再畫一次","Draw again from memory")}</button>:<><button className="primary-action" onClick={commit}>{t("提交我的結構","Commit my drawing")}</button><button onClick={()=>setHint(Math.min(3,hint+1))}>{t("提示","Hint")} {hint?hint+"/3":""}</button></>}</div>
      {hint>0&&!pass&&<p className={styles.hint}>{[t("先算出 CO₂ 總共有幾個價電子。","Start with the total valence-electron count."),t("檢查每個原子周圍的鍵結電子與非鍵結電子。","Count bonding and nonbonding electrons around each atom."),t("碳未滿八隅體時，思考怎樣調整鍵級。","If carbon lacks an octet, reconsider the C–O bond orders.")][hint-1]}</p>}
      {submission&&<div className={submission.pass?styles.success:styles.diagnostic} role="status" aria-live="polite"><strong>{submission.pass?t("通過","Passed"):t("請修正","Revise")}</strong><p>{feedback[submission.code][language==="en"?1:0]}</p>{pass&&<small>{t("現在可以從空白再畫一次。","Now try drawing again from memory.")}</small>}</div>}
      <p className={styles.note}>{t("提交","Submissions")}: {attempts} · {t("提示","Hints")}: {hint} · {t("首次","First")}: {first??"—"}</p>
      </section>
    </div><footer className={styles.footer}>Kakau Lab · Chemistry POC · {t("尚未發布，待教師驗收","Not released; awaiting teacher review")}</footer>
  </main>;
}
