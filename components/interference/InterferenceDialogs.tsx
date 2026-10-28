import { TexBlock } from "@/components/math/MathJax";

export default function InterferenceDialogs() {
  return <>
    <dialog className="interference-dialog" data-dialog="hyperbola" aria-labelledby="interference-hyperbola-title">
      <h2 id="interference-hyperbola-title">為什麼「距離差固定」會是雙曲線？</h2>
      <p>雙曲線的定義：平面上到兩個焦點的距離差（取絕對值）為定值的所有點。</p>
      <p>把 S₁、S₂ 當作焦點，兩焦點距離 2c = d。一條條件線要求 |r₂ − r₁| = |D| 固定，也就是 2a = |D|。以兩波源中點為原點：</p>
      <TexBlock>{String.raw`\frac{x^2}{a^2}-\frac{y^2}{b^2}=1,\qquad a=\frac{|D|}{2},\qquad b^2=\left(\frac d2\right)^2-a^2`}</TexBlock>
      <p>本實驗採用帶正負號的 Δr = r₂ − r₁：Δr &gt; 0 表示 P 離 S₁ 較近，落在左支；Δr &lt; 0 落在右支。</p>
      <h3>兩個特例</h3>
      <p><b>D = 0</b>：到兩波源等距的點是中垂線，所以中央線是直線。</p>
      <p><b>|D| = d</b>：三角不等式 |r₂ − r₁| ≤ d 取等號，只在 P 位於兩波源連線上、且在兩波源外側時成立。此時 b = 0，雙曲線壓扁成兩條從波源向外的半直線。|D| &gt; d 則根本沒有點滿足，線就不存在。</p>
      <button type="button" data-close-dialog>關閉</button>
    </dialog>
    <dialog className="interference-dialog" data-dialog="counts" aria-labelledby="interference-counts-title">
      <h2 id="interference-counts-title">線數公式怎麼來？</h2>
      <p>關鍵只有一個上限：|Δr| ≤ d。</p>
      <h3>波腹線（同相波源）</h3>
      <p>條件 |Δr| = mλ，而 mλ ≤ d，所以 m = 0, 1, …, ⌊d/λ⌋。m = 0 只有中央一條；每個 m ≥ 1 左右各一支：</p>
      <TexBlock>{String.raw`N_{\text{腹}}=2\left\lfloor\frac d\lambda\right\rfloor+1`}</TexBlock>
      <h3>波節線</h3>
      <p>條件 |Δr| = (m + ½)λ ≤ d，所以 m = 0, 1, …, ⌊d/λ − ½⌋，共 ⌊d/λ + ½⌋ 個值；沒有中央那條，每個值左右各一支：</p>
      <TexBlock>{String.raw`N_{\text{節}}=2\left\lfloor\frac d\lambda+\frac12\right\rfloor`}</TexBlock>
      <h3>等號也要算</h3>
      <p>當 mλ 剛好等於 d（例如 d = 3λ 的 m = 3），那一階是兩條退化半直線，仍然算兩條。所以 d = 3λ 時是 7 條波腹線、6 條波節線。</p>
      <button type="button" data-close-dialog>關閉</button>
    </dialog>
    <dialog className="interference-dialog" data-dialog="antiphase" aria-labelledby="interference-antiphase-title">
      <h2 id="interference-antiphase-title">為什麼 180° 會讓線整組互換？</h2>
      <p>P 點收到的兩列波，相位差來自兩個部分：多走的路，加上波源本身的初相位差。</p>
      <TexBlock>{String.raw`\Delta\phi=\frac{2\pi}{\lambda}(r_2-r_1)+(\phi_2-\phi_1)`}</TexBlock>
      <p>相長要 Δφ = 2πm，相消要 Δφ = 2π(m + ½)。把相長條件解出路徑差：</p>
      <TexBlock>{String.raw`\Delta r=\left(m-\frac{\phi_2-\phi_1}{2\pi}\right)\lambda`}</TexBlock>
      <p>當 φ₂ − φ₁ = π，相長位置變成 Δr = (m − ½)λ，正是原本波節的位置；相消位置同理移到原本波腹的位置。整組線只是平移了半個波長的路徑差。</p>
      <h3>同調不等於同相</h3>
      <p>穩定干涉圖樣需要兩波源<b>同調</b>：頻率相同、相位差固定不隨時間變。180° 的相位差固定不變，所以仍然同調，圖樣照樣穩定。</p>
      <h3>用字要小心</h3>
      <p>振幅不等或考慮距離衰減時，兩列波反相抵達，合成振幅是兩列波到達 P 時振幅之差的絕對值，未必是零；無衰減時為 |A₁ − A₂|。所以離開課本條件後，本實驗把線改稱「相長／相消條件線」。</p>
      <button type="button" data-close-dialog>關閉</button>
    </dialog>
    <dialog className="interference-dialog" data-dialog="time" aria-labelledby="interference-time-title">
      <h2 id="interference-time-title">為什麼波在動、干涉線不動？</h2>
      <p>單一波源在距離 r 處的瞬時相位是</p>
      <TexBlock>{String.raw`\theta=kr+\phi-\omega t,\qquad k=\frac{2\pi}{\lambda}`}</TexBlock>
      <p>兩列波的相位差</p>
      <TexBlock>{String.raw`\Delta\theta=\theta_2-\theta_1=k(r_2-r_1)+(\phi_2-\phi_1)`}</TexBlock>
      <p>完全不含 t。只要兩波源頻率相同、相位差固定，每一點的相位差永遠是同一個值；條件線描述的正是這個值，所以不會移動。</p>
      <h3>模擬器畫的是什麼</h3>
      <p>把兩列波合成一個不含時間的相量 C(x,y) = |C|eⁱΦ，瞬時位移是它隨時間的投影：</p>
      <TexBlock>{String.raw`\psi(x,y,t)=\operatorname{Re}\!\left[C e^{-i\omega t}\right]=|C|\cos(\Phi-\omega t)`}</TexBlock>
      <ul><li><b>瞬時位移 ψ</b>：隨時間在 ±|C| 之間振動。</li><li><b>合成振幅 |C|、強度 |C|²</b>：振動的上限，不隨時間變。波節上 |C| = 0，所以每一瞬間 ψ 都是 0。</li><li><b>合成相位 Φ</b>：也不隨時間變。瞬時相位 Φ − ωt 會變，但整張圖每一點同步轉同樣的角度，空間結構不變。</li></ul>
      <p>介質微元只在平衡位置附近振動；向外傳播的是波形（相位結構）與能量。</p>
      <button type="button" data-close-dialog>關閉</button>
    </dialog>
  </>;
}
