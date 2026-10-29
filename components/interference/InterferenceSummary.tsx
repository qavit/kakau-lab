import { interferenceSeo } from "@/lib/labs/interference-seo";
import type { ReactNode } from "react";
import { Tex, TexBlock } from "@/components/math/MathJax";

/**
 * Concept summary below the simulator. The card titles and prose are server-rendered, indexable text;
 * the formulas use the shared MathJax setup (`MathProvider` is supplied by the page) so they match the simulator.
 * Before MathJax is ready the formulas fall back to their TeX source, which keeps the layout stable.
 */
const T = String.raw;
const cards: { title: string; label: string; lead?: ReactNode; formulas: string[]; body: ReactNode }[] = [
  {
    title: "條件線是固定路徑差的雙曲線",
    label: "波腹線 |Δr| 等於 mλ；波節線 |Δr| 等於 (m + 1/2)λ",
    lead: <>本頁一律用 <Tex>{T`\Delta r=r_2-r_1`}</Tex>。同相波源的波腹線與波節線分別是</>,
    formulas: [T`|\Delta r|=m\lambda`, T`|\Delta r|=\left(m+\tfrac12\right)\lambda`],
    body: <>到兩焦點距離差固定，正是雙曲線的定義；中央 <Tex>{T`\Delta r=0`}</Tex> 是直線。</>,
  },
  {
    title: "線數只由 d/λ 決定",
    label: "波腹線數 2 乘以 d/λ 的下取整再加 1；波節線數 2 乘以 d/λ 加 1/2 的下取整",
    formulas: [T`N_{\text{腹}}=2\left\lfloor \dfrac{d}{\lambda}\right\rfloor+1`, T`N_{\text{節}}=2\left\lfloor \dfrac{d}{\lambda}+\tfrac12\right\rfloor`],
    body: <>因為 <Tex>{T`|\Delta r|\le d`}</Tex>。等號成立時雙曲線退化成兩條半直線，仍要算進去：<Tex>{T`d=3\lambda`}</Tex> 時是 7 條與 6 條。</>,
  },
  {
    title: "同調不等於同相",
    label: "相位差等於 2π/λ 乘以 Δr，加上 φ2 減 φ1",
    formulas: [T`\Delta\phi=\dfrac{2\pi}{\lambda}\,\Delta r+(\phi_2-\phi_1)`],
    body: <>相位差固定為 <Tex>{T`\pi`}</Tex> 時兩波源仍然同調，圖樣穩定，只是波腹線和波節線整組互換。</>,
  },
  {
    title: "波在動，圖樣不動",
    label: "合成位移 ψ 等於 |C| cos(Φ 減 ωt)；相位差 Δθ 等於 kΔr 加 φ2 減 φ1",
    formulas: [T`\psi=|C|\cos(\Phi-\omega t)`, T`\Delta\theta=k\,\Delta r+(\phi_2-\phi_1)`],
    body: <>兩列波共同的 <Tex>{T`-\omega t`}</Tex> 在相位差裡消掉，所以條件線靜止。介質微元只在平衡位置附近振動；向外傳播的是波形與能量。</>,
  },
];

const styles = `
.if-summary{width:min(1100px,calc(100% - 32px));margin:2.5rem auto 3rem;color:var(--body)}
.if-summary h2{margin:0 0 1rem;font-size:1.5rem;color:var(--ink)}
.if-summary__grid{display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,24rem),1fr))}
.if-summary__card{border:1px solid var(--line);border-radius:8px;background:var(--surface-solid);padding:1.1rem 1.25rem}
.if-summary__card h3{margin:0 0 .5rem;font-size:1.05rem;color:var(--ink)}
.if-summary__card p{margin:.4rem 0 0;line-height:1.75;font-size:.95rem}
.if-summary__formulas{margin:.5rem 0 0;padding:.25rem .75rem;border-radius:6px;background:var(--formula-bg);color:var(--strong);max-width:100%}
.if-summary__formulas .formula{margin:0;padding:.4rem 0;background:none;border:0;max-width:100%;overflow:visible;font-size:.95em}
.if-summary__formulas mjx-container{max-width:100%}
.if-summary__formulas mjx-container[display="true"]{margin:0!important}
.if-summary__formulas .formula-plain{font-family:ui-monospace,monospace;font-size:.85rem;white-space:pre-wrap;overflow-wrap:anywhere}
.if-summary__card p code.formula-plain{overflow-wrap:anywhere}
.if-summary__note{margin:1.5rem 0 0;line-height:1.75;font-size:.95rem}
.if-summary__note a{color:var(--link)}
`;

export default function InterferenceSummary() {
  return <section className="if-summary" aria-labelledby="if-summary-heading">
    <style>{styles}</style>
    <h2 id="if-summary-heading">概念摘要：這個實驗在說的四件事</h2>
    <div className="if-summary__grid">
      {cards.map((card) => <article className="if-summary__card" key={card.title}>
        <h3>{card.title}</h3>
        {card.lead ? <p>{card.lead}</p> : null}
        <div className="if-summary__formulas" role="group" aria-label={card.label}>
          {card.formulas.map((f) => <TexBlock key={f}>{f}</TexBlock>)}
        </div>
        <p>{card.body}</p>
      </article>)}
    </div>
    <p className="if-summary__note"><strong>上課投影時</strong>：收合右側「引導活動」，圖面會變成乾淨的展示工具；在圖上點一下放觀測點 P，按 Esc 清除。</p>
    <p className="if-summary__note">如果這台裝置在舊瀏覽器上無法執行，仍可使用原始版本：<a href={interferenceSeo.streamlitUrl} target="_blank" rel="noreferrer">開啟 Streamlit 備援模擬器 ↗</a></p>
  </section>;
}
