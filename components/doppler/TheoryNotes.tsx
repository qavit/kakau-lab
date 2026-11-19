"use client";

import type { Locale } from "@/lib/i18n";
import { MathErrorBoundary, MathProvider, Tex, TexBlock, useMathStatus } from "@/components/math/MathJax";
import { DOPPLER_MODEL_VERSION } from "@/lib/science/doppler";

const Inline = Tex;
const Formula = TexBlock;

function Warning({ locale }: { locale: Locale }) {
  const status = useMathStatus();
  if (status !== "error") return null;
  return <p className="theory-math-warning">{locale === "en" ? "The math renderer failed to load; formulas are shown as plain LaTeX. Reload to try again." : "數學排版元件載入失敗，以下公式暫以原始 LaTeX 呈現；重新整理頁面可再試一次。"}</p>;
}

function Chinese() {
  return (
    <div className="theory-body">
      <div className="eyebrow">Kakau Lab · Model 11</div>
      <h1>聲音都普勒效應的理論與計算</h1>
      <p>
        這個模型的核心主張是：<strong>頻率由「接收間隔」決定，而接收間隔同時受波前的空間間距和 O 的運動影響</strong>。
        所以「相對速率相同」並不代表「頻移相同」——要看是空氣中的哪一方在動。
      </p>

      <h2>模型與假設</h2>
      <ul>
        <li>靜止、均勻、無色散的空氣，聲速 <Inline>{"c"}</Inline> 固定。</li>
        <li>波源 S 與觀察者 O 在同一直線上等速運動，速率各自低於 <Inline>{"c"}</Inline>（這裡限制 <Inline>{"|u|\\le 0.5c"}</Inline>）。</li>
        <li>所有速度 <Inline>{"u_s,\\ u_o"}</Inline> 以空氣為參考系，向右為正。<Inline>{"s=+1"}</Inline> 表示波前向右傳播（O 在 S 右側）；<Inline>{"s=-1"}</Inline> 表示向左。</li>
        <li>正規化單位 <Inline>{"c=1,\\ f_0=1"}</Inline>：長度以 <Inline>{"\\lambda_0=cT_0"}</Inline>、時間以 <Inline>{"T_0=1/f_0"}</Inline> 為單位。</li>
      </ul>

      <h2>怎麼讀這兩張圖</h2>
      <p>
        <strong>波前圖</strong>在空氣的參考系裡畫出每個圓：波前 <Inline>{"n"}</Inline> 在 <Inline>{"t_n=nT_0"}</Inline> 從 S 當時的位置發出，
        之後圓心不動，半徑 <Inline>{"c(t-t_n)"}</Inline>。兩個相鄰波前在 O 那一側的距離就是<strong>波前間距</strong>。
      </p>
      <p>
        <strong>時間帶</strong>把同一批波前變成事件：上軌是發射時刻 <Inline>{"t_n"}</Inline>，下軌是 O 遇到它的接收時刻 <Inline>{"t_{r,n}"}</Inline>。同一個編號就是同一個波前。
        接收時刻由 <Inline>{"|x_o(t_{r,n})-x_s(t_n)|=c\\,(t_{r,n}-t_n)"}</Inline> 解出最早的合法交會，不是動畫畫面逐格偵測得來。
        接收頻率則是 <Inline>{"f_\\mathrm{obs}=1/(t_{r,n+1}-t_{r,n})"}</Inline>。
      </p>

      <h2>公式</h2>
      <Formula>{"\\lambda_s=(c-s\\,u_s)\\,T_0"}</Formula>
      <Formula>{"\\Delta t_r=T_0\\,\\frac{c-s\\,u_s}{c-s\\,u_o}\\qquad f_\\mathrm{obs}=f_0\\,\\frac{c-s\\,u_o}{c-s\\,u_s}"}</Formula>
      <p>
        波源移動時，每個波前的圓心不同，所以<strong>間距改變</strong>；觀察者移動時，間距不變，但 O 迎向或離開波前，所以<strong>接收間隔改變</strong>。
        在共線單分支的情況，這兩個公式是核對值；畫面上的讀值則來自事件本身，兩者互相檢驗。
      </p>
      <table>
        <thead><tr><th>情況（O 在 S 右側）</th><th><Inline>{"\\lambda/\\lambda_0"}</Inline></th><th><Inline>{"f_\\mathrm{obs}/f_0"}</Inline></th></tr></thead>
        <tbody>
          <tr><td>都靜止</td><td>1</td><td>1</td></tr>
          <tr><td>波源向右 0.2c（靠近）</td><td>0.80</td><td>1.25</td></tr>
          <tr><td>觀察者向左 0.2c（靠近）</td><td>1.00</td><td>1.20</td></tr>
          <tr><td>波源向左 0.2c（遠離）</td><td>1.20</td><td>1/1.2 ≈ 0.83</td></tr>
          <tr><td>觀察者向右 0.2c（遠離）</td><td>1.00</td><td>0.80</td></tr>
          <tr><td>兩者同向同速</td><td><Inline>{"1-u/c"}</Inline></td><td>1</td></tr>
        </tbody>
      </table>
      <p>接近速率同為 0.2c，波源靠近得 1.25 f₀、觀察者靠近得 1.20 f₀：前者把間距壓到 0.8 λ₀，後者間距仍是 λ₀，只是 O 以 1.2c 迎向波前。</p>

      <h2>音調與音量</h2>
      <p>頻率決定音調：接收頻率越高，聽起來音調越高。振幅決定音量：都普勒效應改變的是頻率而不是振幅，這個模型也沒有計算音量。</p>

      <h2>數值方法與結束條件</h2>
      <p>
        沒有時間步進，也沒有碰撞偵測。每個接收時刻都是封閉形式的交會解，所以單步、暫停、回退與比較都從同一份事件資料重建，與播放倍率或畫面更新率無關。
        每次修改物理初始條件就重新生成實驗。實驗在 S 與 O 相距 1 λ₀ 之前結束（避免重合與穿越），否則在 16 T₀ 結束。
      </p>

      <h2>適用範圍與限制</h2>
      <p>
        不含：音訊、實際路旁掠過、Mach 錐與超音速、光譜紅移、音量與衰減、風與介質運動。模型版本：<code>{DOPPLER_MODEL_VERSION}</code>。
        參考：OpenStax University Physics Vol. 1 §17.7「The Doppler Effect」。
      </p>
    </div>
  );
}

function English() {
  return (
    <div className="theory-body">
      <div className="eyebrow">Kakau Lab · Model 11</div>
      <h1>Theory and calculation: the Doppler effect of sound</h1>
      <p>
        The central claim: <strong>the received frequency is set by the reception interval, and the reception interval depends both on the spatial spacing of the wavefronts and on how O moves</strong>.
        So the same closing speed does not mean the same shift — it matters which of the two is moving through the air.
      </p>

      <h2>Model and assumptions</h2>
      <ul>
        <li>Still, uniform, non-dispersive air with a fixed speed of sound <Inline>{"c"}</Inline>.</li>
        <li>The source S and the observer O move on one line at constant velocity, each below <Inline>{"c"}</Inline> (limited here to <Inline>{"|u|\\le 0.5c"}</Inline>).</li>
        <li>All velocities <Inline>{"u_s,\\ u_o"}</Inline> are measured in the air&apos;s frame, positive to the right. <Inline>{"s=+1"}</Inline> means the front travels to the right (O is right of S); <Inline>{"s=-1"}</Inline> to the left.</li>
        <li>Normalised units <Inline>{"c=1,\\ f_0=1"}</Inline>: lengths in <Inline>{"\\lambda_0=cT_0"}</Inline>, times in <Inline>{"T_0=1/f_0"}</Inline>.</li>
      </ul>

      <h2>Reading the two figures</h2>
      <p>
        The <strong>wavefront diagram</strong> draws every circle in the air&apos;s frame: front <Inline>{"n"}</Inline> is emitted at <Inline>{"t_n=nT_0"}</Inline> from where S is at that moment,
        after which its centre stays fixed and its radius is <Inline>{"c(t-t_n)"}</Inline>. The distance between two adjacent fronts on O&apos;s side is the <strong>front spacing</strong>.
      </p>
      <p>
        The <strong>time band</strong> turns the same fronts into events: the upper track holds emission times <Inline>{"t_n"}</Inline>, the lower track the reception times <Inline>{"t_{r,n}"}</Inline> at which O meets them. The same number is the same front.
        A reception time is the earliest legal solution of <Inline>{"|x_o(t_{r,n})-x_s(t_n)|=c\\,(t_{r,n}-t_n)"}</Inline>, not something detected frame by frame in the animation.
        The received frequency is <Inline>{"f_\\mathrm{obs}=1/(t_{r,n+1}-t_{r,n})"}</Inline>.
      </p>

      <h2>Formulas</h2>
      <Formula>{"\\lambda_s=(c-s\\,u_s)\\,T_0"}</Formula>
      <Formula>{"\\Delta t_r=T_0\\,\\frac{c-s\\,u_s}{c-s\\,u_o}\\qquad f_\\mathrm{obs}=f_0\\,\\frac{c-s\\,u_o}{c-s\\,u_s}"}</Formula>
      <p>
        A moving source emits each front from a different centre, so the <strong>spacing changes</strong>; a moving observer leaves the spacing alone but runs into or away from the fronts, so the <strong>reception interval changes</strong>.
        For the collinear single-branch case these formulas are check values; the readings on screen come from the events themselves, so each checks the other.
      </p>
      <table>
        <thead><tr><th>Case (O to the right of S)</th><th><Inline>{"\\lambda/\\lambda_0"}</Inline></th><th><Inline>{"f_\\mathrm{obs}/f_0"}</Inline></th></tr></thead>
        <tbody>
          <tr><td>Both at rest</td><td>1</td><td>1</td></tr>
          <tr><td>Source right at 0.2c (approaching)</td><td>0.80</td><td>1.25</td></tr>
          <tr><td>Observer left at 0.2c (approaching)</td><td>1.00</td><td>1.20</td></tr>
          <tr><td>Source left at 0.2c (receding)</td><td>1.20</td><td>1/1.2 ≈ 0.83</td></tr>
          <tr><td>Observer right at 0.2c (receding)</td><td>1.00</td><td>0.80</td></tr>
          <tr><td>Both moving the same way at the same speed</td><td><Inline>{"1-u/c"}</Inline></td><td>1</td></tr>
        </tbody>
      </table>
      <p>With the same 0.2c closing speed the source gives 1.25 f₀ and the observer 1.20 f₀: the former compresses the spacing to 0.8 λ₀, the latter leaves it at λ₀ and has O meet the fronts at 1.2c.</p>

      <h2>Pitch and loudness</h2>
      <p>Frequency sets pitch: a higher received frequency sounds higher. Amplitude sets loudness: the Doppler shift changes frequency, not amplitude, and this model computes no loudness.</p>

      <h2>Numerical method and end of run</h2>
      <p>
        There is no time stepping and no collision test. Every reception time is a closed-form intersection, so stepping, pausing, rewinding and comparing all rebuild from one list of events and do not depend on playback rate or frame rate.
        Changing any initial condition regenerates the experiment. The run ends before S and O come within 1 λ₀ (so they never coincide or cross), otherwise at 16 T₀.
      </p>

      <h2>Scope and limits</h2>
      <p>
        Not included: audio, real road pass-by, Mach cone and supersonic motion, spectral redshift, loudness and attenuation, wind or a moving medium. Model version: <code>{DOPPLER_MODEL_VERSION}</code>.
        Reference: OpenStax University Physics Vol. 1, §17.7 “The Doppler Effect”.
      </p>
    </div>
  );
}

/** The theory text, once, for the in-lab dialog (and a future standalone notes route). */
export default function TheoryNotes({ locale }: { locale: Locale }) {
  return (
    <MathProvider>
      <MathErrorBoundary fallback={<p className="theory-math-warning">{locale === "en" ? "The theory content failed to render." : "理論內容無法顯示。"}</p>}>
        <Warning locale={locale} />
        {locale === "en" ? <English /> : <Chinese />}
      </MathErrorBoundary>
    </MathProvider>
  );
}
