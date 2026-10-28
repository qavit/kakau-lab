"use client";

import { useEffect, useState, type RefObject } from "react";
import { Tex } from "@/components/math/MathJax";
import { READOUT_EVENT, type InterferenceReadout } from "@/components/interference/mountInterference";

/**
 * Typeset rail formulas. Static symbols are shared MathJax `Tex`; numbers that change with parameters or P are
 * passed through `Tex dynamic`, which retypesets only when the string changes. mountInterference emits
 * READOUT_EVENT only when one of those numbers changes, so animation frames never retypeset. ψ(P,t), which does
 * change every frame, stays a plain readout next to a typeset label.
 */
const INITIAL: InterferenceReadout = { ratio: "2.00", antinodes: "5", nodes: "4", constructiveCount: "5", destructiveCount: "4", textbook: true, masked: false, kin: { v: "1.00", f: "1.00", lambda: "1.00", T: "1.00" }, point: null };

export function useInterferenceReadout(host: RefObject<HTMLElement | null>) {
  const [readout, setReadout] = useState<InterferenceReadout>(INITIAL);
  useEffect(() => {
    const node = host.current;
    if (!node) return;
    const onReadout = (event: Event) => setReadout((event as CustomEvent<InterferenceReadout>).detail);
    node.addEventListener(READOUT_EVENT, onReadout);
    return () => node.removeEventListener(READOUT_EVENT, onReadout);
  }, [host]);
  return readout;
}

const num = (value: string) => value === "?" ? String.raw`\text{?}` : value;
/** Wrapper keeps a stable box so swapping the SVG never shifts the rail. `inert` keeps MathJax's focusable containers out of the tab order; the sr-only sentence carries the meaning. */
const Formula = ({ tex, className = "" }: { tex: string; className?: string }) => <div className={`if-math ${className}`} aria-hidden="true" inert><Tex dynamic>{tex}</Tex></div>;

export function GeometryFormulas({ readout }: { readout: InterferenceReadout }) {
  const { ratio, antinodes, nodes, textbook, masked } = readout;
  const sr = masked ? `d/λ = ${ratio}，線數暫時遮住。` : textbook
    ? `d/λ = ${ratio}，波腹線 ${antinodes} 條，波節線 ${nodes} 條。`
    : `d/λ = ${ratio}，相長條件線 ${readout.constructiveCount} 條，相消條件線 ${readout.destructiveCount} 條。`;
  return <>
    <Formula className="rail-ratio" tex={String.raw`\dfrac{d}{\lambda}=${ratio}`} />
    {textbook ? <div className="rail-counts" data-counts-textbook>
      <Formula className="rail-count" tex={String.raw`\begin{aligned}N_{\text{腹}}&=2\left\lfloor\tfrac{d}{\lambda}\right\rfloor+1\\&=2\left\lfloor ${ratio}\right\rfloor+1=${num(antinodes)}\end{aligned}`} />
      <Formula className="rail-count rail-count--destructive" tex={String.raw`\begin{aligned}N_{\text{節}}&=2\left\lfloor\tfrac{d}{\lambda}+\tfrac12\right\rfloor\\&=2\left\lfloor ${ratio}+\tfrac12\right\rfloor=${num(nodes)}\end{aligned}`} />
    </div> : <div className="rail-counts rail-counts--advanced" data-counts-advanced>
      <Formula className="rail-count" tex={String.raw`N_{\text{相長}}=${num(readout.constructiveCount)}`} />
      <Formula className="rail-count rail-count--destructive" tex={String.raw`N_{\text{相消}}=${num(readout.destructiveCount)}`} />
      <p>非課本模式時線數由相位條件逐條計算，課本的 <Tex>{String.raw`\lfloor d/\lambda\rfloor`}</Tex> 線數公式不適用。</p>
    </div>}
    {masked && <p className="rail-card__note" data-counts-masked>活動 2 進行中：線數暫時遮住。</p>}
    <p className="sr-only" data-geometry-sr>{sr}</p>
  </>;
}

export function MeasureFormulas({ readout }: { readout: InterferenceReadout }) {
  const p = readout.point;
  if (!p) return null;
  return <div className="measure-formulas">
    <div className="measure-formula"><i className="if-swatch if-swatch--r1" /><Formula tex={String.raw`r_1=|PS_1|=${p.r1}`} /></div>
    <div className="measure-formula"><i className="if-swatch if-swatch--r2" /><Formula tex={String.raw`r_2=|PS_2|=${p.r2}`} /></div>
    <div className="measure-formula measure-formula--plain"><Formula tex={String.raw`\Delta r=r_2-r_1=${p.path}`} /></div>
    <div className="measure-formula measure-formula--key"><Formula tex={String.raw`\dfrac{|\Delta r|}{\lambda}=${p.pathRatio}`} /></div>
    <p className="sr-only" data-measure-sr>{`r₁ = ${p.r1}，r₂ = ${p.r2}，Δr = ${p.path}，|Δr|/λ = ${p.pathRatio}。`}</p>
  </div>;
}

export function KinematicsFormula({ readout }: { readout: InterferenceReadout }) {
  const { v, f, lambda, T } = readout.kin;
  return <>
    <Formula tex={String.raw`v=f\lambda:\;${v}=${f}\times${lambda},\qquad T=\tfrac1f=${T}\,\text{s}`} />
    <p className="sr-only" data-kinematics-sr>{`v = ${v}，f = ${f}，λ = ${lambda}，T = ${T} s。`}</p>
  </>;
}
