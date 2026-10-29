import { interferenceSeo } from "@/lib/labs/interference-seo";

/**
 * Server-rendered concept summary below the simulator. It is the indexable text the page keeps from the
 * original kakau.tw version; formulas are plain Unicode so the section needs no MathJax and no hydration.
 */
const cards = [
  {
    title: "條件線是固定路徑差的雙曲線",
    lead: "本頁一律用 Δr = r₂ − r₁。同相波源的波腹線與波節線分別是",
    formula: "|Δr| = mλ，　|Δr| = (m + ½)λ",
    body: "到兩焦點距離差固定，正是雙曲線的定義；中央 Δr = 0 是直線。",
  },
  {
    title: "線數只由 d/λ 決定",
    formula: "N腹 = 2⌊d/λ⌋ + 1，　N節 = 2⌊d/λ + ½⌋",
    body: "因為 |Δr| ≤ d。等號成立時雙曲線退化成兩條半直線，仍要算進去：d = 3λ 時是 7 條與 6 條。",
  },
  {
    title: "同調不等於同相",
    formula: "Δφ = (2π/λ)Δr + (φ₂ − φ₁)",
    body: "相位差固定為 π 時兩波源仍然同調，圖樣穩定，只是波腹線和波節線整組互換。",
  },
  {
    title: "波在動，圖樣不動",
    formula: "ψ = |C| cos(Φ − ωt)，　Δθ = kΔr + (φ₂ − φ₁)",
    body: "兩列波共同的 −ωt 在相位差裡消掉，所以條件線靜止。介質微元只在平衡位置附近振動；向外傳播的是波形與能量。",
  },
] as const;

const styles = `
.if-summary{width:min(1100px,calc(100% - 32px));margin:2.5rem auto 3rem;color:var(--body)}
.if-summary h2{margin:0 0 1rem;font-size:1.5rem;color:var(--ink)}
.if-summary__grid{display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr))}
.if-summary__card{border:1px solid var(--line);border-radius:8px;background:var(--surface-solid);padding:1.1rem 1.25rem}
.if-summary__card h3{margin:0 0 .5rem;font-size:1.05rem;color:var(--ink)}
.if-summary__card p{margin:.4rem 0 0;line-height:1.75;font-size:.95rem}
.if-summary__formula{overflow-x:auto;padding:.5rem .75rem;border-radius:6px;background:var(--formula-bg);color:var(--strong);font-family:inherit}
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
        {"lead" in card ? <p>{card.lead}</p> : null}
        <p className="if-summary__formula">{card.formula}</p>
        <p>{card.body}</p>
      </article>)}
    </div>
    <p className="if-summary__note"><strong>上課投影時</strong>：收合右側「引導活動」，圖面會變成乾淨的展示工具；在圖上點一下放觀測點 P，按 Esc 清除。</p>
    <p className="if-summary__note">如果這台裝置在舊瀏覽器上無法執行，仍可使用原始版本：<a href={interferenceSeo.streamlitUrl} target="_blank" rel="noreferrer">開啟 Streamlit 備援模擬器 ↗</a></p>
  </section>;
}
