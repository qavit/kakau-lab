import type { ReactNode } from "react";

/**
 * Presentation adapter for the live rail formulas. The structure is static JSX (no HTML injection, no
 * typesetting at animation rate); mountInterference only swaps the text of each `data-slot` element.
 * Each formula is aria-hidden and has a screen-reader sentence next to it.
 */
const Slot = ({ name, initial, readout }: { name: string; initial: string; readout?: string }) => <b className="if-slot" data-slot={name} data-readout={readout}>{initial}</b>;
const Frac = ({ top, bottom }: { top: ReactNode; bottom: ReactNode }) => <span className="if-frac"><span>{top}</span><span>{bottom}</span></span>;
const Floor = ({ children }: { children: ReactNode }) => <span className="if-floor"><span aria-hidden>⌊</span>{children}<span aria-hidden>⌋</span></span>;
const Var = ({ children }: { children: ReactNode }) => <i className="if-var">{children}</i>;

export const RatioFormula = () => <div className="if-row" aria-hidden="true"><Frac top={<Var>d</Var>} bottom={<Var>λ</Var>} /> <span>=</span> <Slot name="ratio" initial="2.00" /></div>;

export const AntinodeCountFormula = () => <div className="if-block" aria-hidden="true">
  <div className="if-row"><Var>N</Var><sub>腹</sub> <span>=</span> <span>2</span><Floor><Frac top={<Var>d</Var>} bottom={<Var>λ</Var>} /></Floor><span>+ 1</span></div>
  <div className="if-row if-row--sub"><span>=</span> <span>2</span><Floor><Slot name="ratioA" initial="2.00" /></Floor><span>+ 1 =</span> <Slot name="antinodes" initial="5" /></div>
</div>;

export const NodeCountFormula = () => <div className="if-block" aria-hidden="true">
  <div className="if-row"><Var>N</Var><sub>節</sub> <span>=</span> <span>2</span><Floor><Frac top={<Var>d</Var>} bottom={<Var>λ</Var>} /><span>+</span><Frac top="1" bottom="2" /></Floor></div>
  <div className="if-row if-row--sub"><span>=</span> <span>2</span><Floor><Slot name="ratioB" initial="2.00" /><span>+</span><Frac top="1" bottom="2" /></Floor><span>=</span> <Slot name="nodes" initial="4" /></div>
</div>;

export const MeasureFormulas = () => <div className="measure-formulas" aria-hidden="true">
  <div className="measure-formula"><i className="if-swatch if-swatch--r1" /><span><Var>r</Var><sub>1</sub> = |<Var>PS</Var><sub>1</sub>| = <Slot name="r1" initial="0.00" readout="r1" /></span></div>
  <div className="measure-formula"><i className="if-swatch if-swatch--r2" /><span><Var>r</Var><sub>2</sub> = |<Var>PS</Var><sub>2</sub>| = <Slot name="r2" initial="0.00" readout="r2" /></span></div>
  <div className="measure-formula measure-formula--plain"><span>Δ<Var>r</Var> = <Var>r</Var><sub>2</sub> − <Var>r</Var><sub>1</sub> = <Slot name="path" initial="0.00" readout="path" /></span></div>
  <div className="measure-formula measure-formula--key"><span className="if-row"><Frac top={<span>|Δ<Var>r</Var>|</span>} bottom={<Var>λ</Var>} /> <span>=</span> <Slot name="pathRatio" initial="0.00" readout="pathRatio" /></span></div>
</div>;

export const KinematicsFormula = () => <div className="if-row if-row--kin" aria-hidden="true"><Var>v</Var> = <Var>f</Var><Var>λ</Var>: <Slot name="kinV" initial="1.00" /> = <Slot name="kinF" initial="1.00" /> × <Slot name="kinLambda" initial="1.00" />, <span> <Var>T</Var> = <Frac top="1" bottom={<Var>f</Var>} /> = <Slot name="kinT" initial="1.00" /> s</span></div>;
