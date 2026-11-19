"use client";

import type { Locale } from "@/lib/i18n";
import { MathErrorBoundary, MathProvider, Tex, TexBlock, useMathStatus } from "@/components/math/MathJax";
import { DOPPLER_MODEL_VERSION } from "@/lib/science/doppler";
import Rich from "./Rich";

const Inline = Tex;
const Formula = TexBlock;

function Warning({ locale }: { locale: Locale }) {
  const status = useMathStatus();
  if (status !== "error") return null;
  return <p className="theory-math-warning">{locale === "en" ? "The math renderer failed to load; formulas are shown as plain LaTeX. Reload to try again." : "數學排版元件載入失敗，以下公式暫以原始 LaTeX 呈現；重新整理頁面可再試一次。"}</p>;
}

type Row = readonly [symbol: string, name: string, si: string, model: string];

/** Every symbol used in the formulas, with its SI unit and the unit it takes in this model's normalised scale. */
function SymbolTable({ rows, head }: { rows: readonly Row[]; head: readonly [string, string, string, string]; }) {
  return (
    <div className="theory-table-scroll">
      <table className="theory-symbols">
        <thead><tr>{head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
        <tbody>
          {rows.map(([symbol, name, si, model]) => (
            <tr key={symbol}>
              <th scope="row"><Inline>{symbol}</Inline></th>
              <td><Rich>{name}</Rich></td>
              <td><Rich>{si}</Rich></td>
              <td><Rich>{model}</Rich></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const ZH_ROWS: readonly Row[] = [
  ["c", "聲速（空氣中的波速）", "m/s", "$c=1$"],
  ["f_0", "波源的發射頻率", "Hz（$\\mathrm{s}^{-1}$）", "$f_0=1$"],
  ["T_0=1/f_0", "發射週期（相鄰兩個波前的發射間隔）", "s", "$T_0$（時間單位）"],
  ["\\lambda_0=cT_0", "靜止時的波長", "m", "$\\lambda_0$（長度單位）"],
  ["u_\\mathrm{S}", "波源 S 的速度（空氣參考系，向右為正）", "m/s", "$u_\\mathrm{S}/c$，$|u|\\le 0.5c$"],
  ["u_\\mathrm{O}", "觀察者 O 的速度（空氣參考系，向右為正）", "m/s", "$u_\\mathrm{O}/c$，$|u|\\le 0.5c$"],
  ["s", "波前到 O 的傳播方向：向右 $+1$、向左 $-1$（O 在 S 右側時 $s=+1$）", "無因次", "—"],
  ["n", "波前編號", "無因次", "—"],
  ["t_n=nT_0", "波前 $n$ 的發射時刻", "s", "$T_0$"],
  ["x_n", "波前 $n$ 的圓心（發射當時 S 的位置，之後不動）", "m", "$\\lambda_0$"],
  ["x_\\mathrm{S}(t),\\ x_\\mathrm{O}(t)", "S、O 在時刻 $t$ 的位置", "m", "$\\lambda_0$"],
  ["t_{\\mathrm{R},n}", "波前 $n$ 被 O 接收的時刻", "s", "$T_0$"],
  ["\\lambda_\\mathrm{S}", "O 一側相鄰兩個波前的間距（波前間距）", "m", "$\\lambda/\\lambda_0$"],
  ["\\Delta t_\\mathrm{R}", "O 接收相鄰兩個波前的時間間隔（接收間隔）", "s", "$\\Delta t/T_0$"],
  ["f_\\mathrm{obs}", "O 接收到的頻率，$1/\\Delta t_\\mathrm{R}$", "Hz（$\\mathrm{s}^{-1}$）", "$f/f_0$"],
];
const EN_ROWS: readonly Row[] = [
  ["c", "Speed of sound (wave speed in air)", "m/s", "$c=1$"],
  ["f_0", "Emission frequency of the source", "Hz ($\\mathrm{s}^{-1}$)", "$f_0=1$"],
  ["T_0=1/f_0", "Emission period (time between two adjacent emissions)", "s", "$T_0$ (unit of time)"],
  ["\\lambda_0=cT_0", "Wavelength at rest", "m", "$\\lambda_0$ (unit of length)"],
  ["u_\\mathrm{S}", "Velocity of the source S (air frame, positive to the right)", "m/s", "$u_\\mathrm{S}/c$, $|u|\\le 0.5c$"],
  ["u_\\mathrm{O}", "Velocity of the observer O (air frame, positive to the right)", "m/s", "$u_\\mathrm{O}/c$, $|u|\\le 0.5c$"],
  ["s", "Direction the front travels to reach O: right $+1$, left $-1$ ($s=+1$ when O is right of S)", "dimensionless", "—"],
  ["n", "Wavefront number", "dimensionless", "—"],
  ["t_n=nT_0", "Emission time of front $n$", "s", "$T_0$"],
  ["x_n", "Centre of front $n$ (where S was when it was emitted; fixed afterwards)", "m", "$\\lambda_0$"],
  ["x_\\mathrm{S}(t),\\ x_\\mathrm{O}(t)", "Positions of S and O at time $t$", "m", "$\\lambda_0$"],
  ["t_{\\mathrm{R},n}", "Time at which O receives front $n$", "s", "$T_0$"],
  ["\\lambda_\\mathrm{S}", "Spacing of two adjacent fronts on O's side (front spacing)", "m", "$\\lambda/\\lambda_0$"],
  ["\\Delta t_\\mathrm{R}", "Time between O receiving two adjacent fronts (reception interval)", "s", "$\\Delta t/T_0$"],
  ["f_\\mathrm{obs}", "Frequency received by O, $1/\\Delta t_\\mathrm{R}$", "Hz ($\\mathrm{s}^{-1}$)", "$f/f_0$"],
];

function Chinese() {
  return (
    <div className="theory-body">
      <div className="eyebrow">Kakau Lab · Model 11</div>
      <h1>聲音都普勒效應的理論與模型</h1>
      <p>
        這個模型的核心主張是：<strong>頻率由「接收間隔」決定，而接收間隔同時受波前的空間間距和 O 的運動影響</strong>。
        所以「相對速率相同」並不代表「頻移相同」——要看是空氣中的哪一方在動。
      </p>

      <h2>模型與假設</h2>
      <ul>
        <li>靜止、均勻、無色散的空氣，聲速 <Inline>{"c"}</Inline> 固定。</li>
        <li>波源 S 與觀察者 O 在同一直線上等速運動，速率各自低於 <Inline>{"c"}</Inline>（這裡限制 <Inline>{"|u|\\le 0.5c"}</Inline>）。</li>
        <li>所有速度 <Inline>{"u_\\mathrm{S},\\ u_\\mathrm{O}"}</Inline> 以空氣為參考系，向右為正。<Inline>{"s=+1"}</Inline> 表示波前向右傳播（O 在 S 右側）；<Inline>{"s=-1"}</Inline> 表示向左。</li>
        <li>正規化單位 <Inline>{"c=1,\\ f_0=1"}</Inline>：長度以 <Inline>{"\\lambda_0=cT_0"}</Inline>、時間以 <Inline>{"T_0=1/f_0"}</Inline> 為單位。</li>
      </ul>

      <h2>怎麼讀這兩張圖</h2>
      <p>
        <strong>波前圖</strong>在空氣的參考系裡畫出每個圓：波前 <Inline>{"n"}</Inline> 在 <Inline>{"t_n=nT_0"}</Inline> 從 S 當時的位置發出，
        之後圓心不動，半徑 <Inline>{"c(t-t_n)"}</Inline>。兩個相鄰波前在 O 那一側的距離就是<strong>波前間距</strong>。
      </p>
      <p>
        <strong>時間帶</strong>把同一批波前變成事件：上軌是發射時刻 <Inline>{"t_n"}</Inline>，下軌是 O 遇到它的接收時刻 <Inline>{"t_{\\mathrm{R},n}"}</Inline>。同一個編號就是同一個波前。
        接收時刻由 <Inline>{"|x_\\mathrm{O}(t_{\\mathrm{R},n})-x_\\mathrm{S}(t_n)|=c\\,(t_{\\mathrm{R},n}-t_n)"}</Inline> 解出最早的合法交會，不是動畫畫面逐格偵測得來。
        接收頻率則是 <Inline>{"f_\\mathrm{obs}=1/(t_{\\mathrm{R},n+1}-t_{\\mathrm{R},n})"}</Inline>。
      </p>

      <h2>公式</h2>
      <Formula>{"\\lambda_\\mathrm{S}=(c-s\\,u_\\mathrm{S})\\,T_0"}</Formula>
      <Formula>{"\\Delta t_\\mathrm{R}=T_0\\,\\frac{c-s\\,u_\\mathrm{S}}{c-s\\,u_\\mathrm{O}}\\qquad f_\\mathrm{obs}=f_0\\,\\frac{c-s\\,u_\\mathrm{O}}{c-s\\,u_\\mathrm{S}}"}</Formula>
      <h3>符號、名稱與單位</h3>
      <SymbolTable head={["符號", "名稱", "SI 單位", "本模型的正規化單位"]} rows={ZH_ROWS} />
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
        畫面上的圓、接收時刻與讀值來自模型計算；速度箭頭的長度、標記大小與標籤位置只是示意。<br />
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
      <h1>Theory and model: the Doppler effect of sound</h1>
      <p>
        The central claim: <strong>the received frequency is set by the reception interval, and the reception interval depends both on the spatial spacing of the wavefronts and on how O moves</strong>.
        So the same closing speed does not mean the same shift — it matters which of the two is moving through the air.
      </p>

      <h2>Model and assumptions</h2>
      <ul>
        <li>Still, uniform, non-dispersive air with a fixed speed of sound <Inline>{"c"}</Inline>.</li>
        <li>The source S and the observer O move on one line at constant velocity, each below <Inline>{"c"}</Inline> (limited here to <Inline>{"|u|\\le 0.5c"}</Inline>).</li>
        <li>All velocities <Inline>{"u_\\mathrm{S},\\ u_\\mathrm{O}"}</Inline> are measured in the air&apos;s frame, positive to the right. <Inline>{"s=+1"}</Inline> means the front travels to the right (O is right of S); <Inline>{"s=-1"}</Inline> to the left.</li>
        <li>Normalised units <Inline>{"c=1,\\ f_0=1"}</Inline>: lengths in <Inline>{"\\lambda_0=cT_0"}</Inline>, times in <Inline>{"T_0=1/f_0"}</Inline>.</li>
      </ul>

      <h2>Reading the two figures</h2>
      <p>
        The <strong>wavefront diagram</strong> draws every circle in the air&apos;s frame: front <Inline>{"n"}</Inline> is emitted at <Inline>{"t_n=nT_0"}</Inline> from where S is at that moment,
        after which its centre stays fixed and its radius is <Inline>{"c(t-t_n)"}</Inline>. The distance between two adjacent fronts on O&apos;s side is the <strong>front spacing</strong>.
      </p>
      <p>
        The <strong>time band</strong> turns the same fronts into events: the upper track holds emission times <Inline>{"t_n"}</Inline>, the lower track the reception times <Inline>{"t_{\\mathrm{R},n}"}</Inline> at which O meets them. The same number is the same front.
        A reception time is the earliest legal solution of <Inline>{"|x_\\mathrm{O}(t_{\\mathrm{R},n})-x_\\mathrm{S}(t_n)|=c\\,(t_{\\mathrm{R},n}-t_n)"}</Inline>, not something detected frame by frame in the animation.
        The received frequency is <Inline>{"f_\\mathrm{obs}=1/(t_{\\mathrm{R},n+1}-t_{\\mathrm{R},n})"}</Inline>.
      </p>

      <h2>Formulas</h2>
      <Formula>{"\\lambda_\\mathrm{S}=(c-s\\,u_\\mathrm{S})\\,T_0"}</Formula>
      <Formula>{"\\Delta t_\\mathrm{R}=T_0\\,\\frac{c-s\\,u_\\mathrm{S}}{c-s\\,u_\\mathrm{O}}\\qquad f_\\mathrm{obs}=f_0\\,\\frac{c-s\\,u_\\mathrm{O}}{c-s\\,u_\\mathrm{S}}"}</Formula>
      <h3>Symbols, names and units</h3>
      <SymbolTable head={["Symbol", "Name", "SI unit", "Unit in this model (normalised)"]} rows={EN_ROWS} />
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
        The circles, reception times and readings come from the model; the length of the velocity arrows, the marker sizes and the label positions are schematic.<br />
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
