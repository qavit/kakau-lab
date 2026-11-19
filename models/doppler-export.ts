import {
  DOPPLER_MODEL_VERSION,
  MAX_DURATION,
  SOUND_SPEED,
  createDopplerExperiment,
  dopplerAnalytic,
  measurePair,
  observerPosition,
  observerSide,
  pairRatios,
  sourcePosition,
  wavefrontsAt,
  type DopplerSetup,
} from "../lib/science/doppler.ts";
import { DOPPLER_SHARE_FORMAT, decodeDopplerShare, encodeDopplerShare } from "./doppler-serialization.ts";
import { X_DOMAIN, clampPair, type DopplerPresetId, type DopplerReference, type DopplerView } from "./doppler.ts";
import type { GuidedSession } from "./doppler-learning.ts";

/** Bump when the exported result's shape changes, independently of the share format and the model. */
export const DOPPLER_RESULT_SCHEMA = "doppler-result-1";

const round = (value: number) => Number(value.toFixed(9));

/**
 * One immutable snapshot of a setup, a cursor time and (optionally) a kept reference. Complete for the
 * whole experiment: every emission, every reception, and the selected pair's readings, whatever the
 * cursor shows. Never contains learner answers, so a guided activity cannot be exported.
 */
export function dopplerResult(
  setup: DopplerSetup,
  view: DopplerView,
  time: number,
  reference: DopplerReference | null,
  session: GuidedSession | null,
  preset: DopplerPresetId | null = null,
) {
  if (session !== null) throw new Error("請先離開探索任務再匯出。 Leave the guided activity before exporting.");
  // The share codec is the single validation boundary for a setup; it also strips anything runtime.
  const shared = decodeDopplerShare(encodeDopplerShare(setup, view, preset));
  const experiment = createDopplerExperiment(shared.setup);
  if (!Number.isFinite(time) || time < 0 || time > experiment.duration + 1e-9) throw new RangeError("無效時間。 Invalid time cursor.");
  const pair = clampPair(experiment, shared.view.pair);
  const measurement = measurePair(experiment, pair);
  const ratios = measurement ? pairRatios(measurement) : null;
  const direction = measurement?.direction ?? observerSide(shared.setup);
  return {
    schema: DOPPLER_RESULT_SCHEMA,
    modelVersion: DOPPLER_MODEL_VERSION,
    shareFormat: DOPPLER_SHARE_FORMAT,
    units: { t: "T₀ (=1/f₀)", x: "λ₀ (=c·T₀)", velocity: "c", frequency: "f₀", ratios: "dimensionless" },
    normalization: { c: SOUND_SPEED, f0: 1, T0: 1, lambda0: 1 },
    assumptions: [
      "靜止、均勻、無色散的空氣；波源與觀察者共線等速，各自低於聲速。 Still, uniform, non-dispersive air; S and O collinear at constant velocity, each below the speed of sound.",
      "速度以空氣為參考系、向右為正；|u| ≤ 0.5c。 Velocities in the air frame, positive to the right; |u| ≤ 0.5c.",
      "波前 n 在 t = nT₀ 自波源當時位置發出，之後圓心固定、半徑 c(t − tₙ)；接收時刻為解析交會。 Front n is emitted at t = nT₀ from the source's position then; its centre stays fixed, radius c(t − tₙ); receptions are exact intersections.",
      "實驗在 S、O 相距 1 λ₀ 前或 16 T₀ 結束。 The run ends before S and O come within 1 λ₀, or at 16 T₀.",
      "分享 v1 只重建起始設定並暫停；結果另存游標時刻。 Share v1 restores a paused starting setup; the result stores the cursor separately.",
    ],
    setup: { sourceStart: shared.setup.sourceStart, observerStart: shared.setup.observerStart, sourceVelocity: shared.setup.sourceVelocity, observerVelocity: shared.setup.observerVelocity },
    preset: shared.preset,
    view: { ...shared.view, pair },
    cursorTime: time,
    duration: experiment.duration,
    endReason: experiment.endReason,
    emissions: experiment.emissions.map((e) => ({ n: e.n, t: round(e.t), x: round(e.x) })),
    receptions: experiment.receptions.map((r) => ({ n: r.n, t: round(r.t), x: round(r.x), direction: r.direction })),
    pair: measurement
      ? {
          n: pair,
          direction: measurement.direction,
          emissionInterval: round(measurement.emissionInterval),
          spacing: round(measurement.spacing),
          receptionInterval: measurement.reception ? round(measurement.reception.interval) : null,
        }
      : null,
    ratios: ratios && { wavelength: round(ratios.wavelength), period: round(ratios.period), frequency: round(ratios.frequency) },
    analytic: (() => {
      const a = dopplerAnalytic(shared.setup.sourceVelocity, shared.setup.observerVelocity, direction);
      return { wavelength: round(a.wavelength), period: round(a.period), frequency: round(a.frequency) };
    })(),
    reference: reference && {
      sourceVelocity: reference.sourceVelocity,
      observerVelocity: reference.observerVelocity,
      pair: reference.pair,
      ratios: reference.ratios,
    },
  };
}

export type DopplerResult = ReturnType<typeof dopplerResult>;

const escapeXml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);
const fmt = (value: number | null | undefined, digits = 2) => (value === null || value === undefined || !Number.isFinite(value) ? "—" : value.toFixed(digits));
const signed = (value: number) => `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toFixed(2)}`;

const INK = "#17232e";
const MUTED = "#4d5a66";
const FRONT = "#7d93a8";
const PAIR = "#125b82";
const SOURCE = "#a64b00";
const OBSERVER = "#0b6b5e";

/** Standalone bilingual figure: wavefront diagram, reception time band and comparison table, with embedded JSON. */
export function dopplerResultSvg(result: DopplerResult): string {
  const { setup, view, cursorTime: t, duration } = result;
  const experiment = createDopplerExperiment(setup);
  const side = observerSide(setup);
  /** A light outline behind a label keeps it legible where it crosses a wavefront or the cursor. */
  const halo = (bg: string) => `paint-order="stroke" stroke="${bg}" stroke-width="4" stroke-linejoin="round"`;
  /** Labels name the source (S) and observer (O): those subscripts are upright capitals, set as a lowered tspan. */
  const sub = (value: string) => value.replace(/([uxλ])_([SO])/g, '$1<tspan baseline-shift="sub" font-size="75%">$2</tspan>');
  const text = (value: string, x: number, y: number, size = 14, extra = "") => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${size}" ${extra}>${sub(escapeXml(value))}</text>`;

  /* ---- Panel A: the wavefronts in the air frame, at the cursor time ---- */
  const A = { x: 40, y: 116, w: 920, h: 232 };
  const unit = A.w / (X_DOMAIN.max - X_DOMAIN.min);
  const axisY = A.y + 124;
  const sx = (v: number) => A.x + (v - X_DOMAIN.min) * unit;
  const fronts = wavefrontsAt(experiment, t);
  const pairN = result.view.pair;
  const circles = fronts
    .map((f) => {
      const selected = f.n === pairN || f.n === pairN + 1;
      return `<circle data-front="${f.n}" cx="${sx(f.centreX).toFixed(2)}" cy="${axisY}" r="${(f.radius * unit).toFixed(2)}" fill="none" stroke="${selected ? PAIR : FRONT}" stroke-width="${selected ? 3 : 1.2}" ${selected ? "" : 'stroke-dasharray="none" opacity="0.8"'}/>`;
    })
    .join("");
  const centres = fronts.map((f) => `<circle cx="${sx(f.centreX).toFixed(2)}" cy="${axisY}" r="2.4" fill="#fff" stroke="${FRONT}"/>`).join("");
  const a = fronts.find((f) => f.n === pairN);
  const b = fronts.find((f) => f.n === pairN + 1);
  let bracket = "";
  if (a && b && result.pair) {
    const xa = sx(a.centreX + side * a.radius);
    const xb = sx(b.centreX + side * b.radius);
    const y = axisY + 40;
    const mid = Math.min(A.x + A.w - 70, Math.max(A.x + 70, (xa + xb) / 2));
    bracket =
      `<path d="M${xa.toFixed(1)} ${y - 6}V${y + 6}M${xb.toFixed(1)} ${y - 6}V${y + 6}M${xa.toFixed(1)} ${y}H${xb.toFixed(1)}" stroke="${PAIR}" stroke-width="2" fill="none"/>` +
      text(`λ = ${fmt(result.pair.spacing)} λ₀`, mid, y + 24, 14, `text-anchor="middle" fill="${PAIR}" font-weight="700" ${halo("#f4f7fa")}`) +
      text(`#${pairN}`, xa, axisY - 12, 13, `text-anchor="middle" fill="${PAIR}" font-weight="700" ${halo("#f4f7fa")}`) +
      text(`#${pairN + 1}`, xb, axisY + 24, 13, `text-anchor="middle" fill="${PAIR}" font-weight="700" ${halo("#f4f7fa")}`);
  }
  const xs = sx(sourcePosition(setup, t));
  const xo = sx(observerPosition(setup, t));
  const arrow = (x: number, u: number, color: string) => {
    if (u === 0) return "";
    const len = (Math.abs(u) / 0.5) * 56;
    const dir = u > 0 ? 1 : -1;
    const end = x + dir * len;
    return `<path d="M${x.toFixed(1)} ${axisY - 28}H${end.toFixed(1)}M${(end - dir * 8).toFixed(1)} ${axisY - 33}L${end.toFixed(1)} ${axisY - 28}L${(end - dir * 8).toFixed(1)} ${axisY - 23}" stroke="${color}" stroke-width="2.5" fill="none"/>`;
  };
  const rest = (u: number) => (u === 0 ? "（靜止 / at rest）" : "");
  const sourceAnchor = side > 0 ? "end" : "start";
  const observerAnchor = side > 0 ? "start" : "end";
  const markers =
    `<path d="M${xs} ${axisY - 9}L${xs + 9} ${axisY}L${xs} ${axisY + 9}L${xs - 9} ${axisY}Z" fill="${SOURCE}" stroke="#fff" stroke-width="1.5"/>` +
    `<rect x="${xo - 8}" y="${axisY - 8}" width="16" height="16" fill="${OBSERVER}" stroke="#fff" stroke-width="1.5"/>` +
    arrow(xs, setup.sourceVelocity, SOURCE) + arrow(xo, setup.observerVelocity, OBSERVER) +
    text(`S  u_S = ${signed(setup.sourceVelocity)}c ${rest(setup.sourceVelocity)}`, xs + (side > 0 ? 8 : -8), axisY - 44, 13, `text-anchor="${sourceAnchor}" fill="${SOURCE}" font-weight="700" ${halo("#f4f7fa")}`) +
    text(`O  u_O = ${signed(setup.observerVelocity)}c ${rest(setup.observerVelocity)}`, xo + (side > 0 ? -8 : 8), axisY - 44, 13, `text-anchor="${observerAnchor}" fill="${OBSERVER}" font-weight="700" ${halo("#f4f7fa")}`);
  const xTicks = Array.from({ length: 7 }, (_, i) => X_DOMAIN.min + i * 4)
    .map((v) => `<path d="M${sx(v)} ${A.y + A.h - 14}v5" stroke="${MUTED}"/>` + text(String(v), sx(v), A.y + A.h - 1, 12, `text-anchor="middle" fill="${MUTED}"`))
    .join("");

  /* ---- Panel B: emission and reception tracks sharing one time axis ---- */
  const B = { x0: 160, x1: 960, top: 384 };
  const tScale = (B.x1 - B.x0) / MAX_DURATION;
  const tx = (v: number) => B.x0 + v * tScale;
  const eY = B.top + 58;
  const rY = B.top + 128;
  const axisB = B.top + 188;
  const nLabelGap = tScale * 0.75 >= 17;
  const connectors = view.connectors
    ? experiment.receptions.map((r) => `<path d="M${tx(experiment.emissions[r.n].t).toFixed(1)} ${eY}L${tx(r.t).toFixed(1)} ${rY}" stroke="${r.n === pairN || r.n === pairN + 1 ? PAIR : "#c4ced8"}" stroke-width="${r.n === pairN || r.n === pairN + 1 ? 2 : 1}"/>`).join("")
    : "";
  const emissionMarks = experiment.emissions
    .map((e) => {
      const sel = e.n === pairN || e.n === pairN + 1;
      const x = tx(e.t);
      return `<g data-event="emission" data-n="${e.n}"><title>emission #${e.n}: t=${fmt(e.t, 3)} T₀, x=${fmt(e.x, 3)} λ₀</title><path d="M${x.toFixed(1)} ${eY - 8}L${(x + 8).toFixed(1)} ${eY}L${x.toFixed(1)} ${eY + 8}L${(x - 8).toFixed(1)} ${eY}Z" fill="${SOURCE}" ${sel ? `stroke="${PAIR}" stroke-width="2.5"` : ""}/></g>` +
        (view.labels && (sel || nLabelGap) ? text(String(e.n), x, eY - 14, sel ? 13 : 11, `text-anchor="middle" fill="${sel ? PAIR : MUTED}" ${sel ? 'font-weight="700"' : ""}`) : "");
    })
    .join("");
  const receptionMarks = experiment.receptions
    .map((r) => {
      const sel = r.n === pairN || r.n === pairN + 1;
      const x = tx(r.t);
      return `<g data-event="reception" data-n="${r.n}"><title>reception #${r.n}: t=${fmt(r.t, 3)} T₀, x=${fmt(r.x, 3)} λ₀</title><rect x="${(x - 7).toFixed(1)}" y="${rY - 7}" width="14" height="14" fill="${OBSERVER}" ${sel ? `stroke="${PAIR}" stroke-width="2.5"` : ""}/></g>` +
        (view.labels && (sel || nLabelGap) ? text(String(r.n), x, rY + 24, sel ? 13 : 11, `text-anchor="middle" fill="${sel ? PAIR : MUTED}" ${sel ? 'font-weight="700"' : ""}`) : "");
    })
    .join("");
  const pairE = experiment.emissions[pairN];
  const pairE2 = experiment.emissions[pairN + 1];
  const pairR = experiment.receptions[pairN];
  const pairR2 = experiment.receptions[pairN + 1];
  const emitBracket = pairE && pairE2 ? `<path d="M${tx(pairE.t)} ${eY - 30}H${tx(pairE2.t)}M${tx(pairE.t)} ${eY - 35}v10M${tx(pairE2.t)} ${eY - 35}v10" stroke="${PAIR}" stroke-width="2" fill="none"/>` +
    text(`ΔT = ${fmt(result.pair?.emissionInterval)} T₀`, (tx(pairE.t) + tx(pairE2.t)) / 2, eY - 40, 13, `text-anchor="middle" fill="${PAIR}" font-weight="700" ${halo("#ffffff")}`) : "";
  const recvBracket = pairR && pairR2 ? `<path d="M${tx(pairR.t)} ${rY + 36}H${tx(pairR2.t)}M${tx(pairR.t)} ${rY + 31}v10M${tx(pairR2.t)} ${rY + 31}v10" stroke="${PAIR}" stroke-width="2" fill="none"/>` +
    text(`Δt = ${fmt(result.pair?.receptionInterval)} T₀  →  f = ${fmt(result.ratios?.frequency)} f₀`, Math.min(B.x1 - 110, Math.max(B.x0 + 110, (tx(pairR.t) + tx(pairR2.t)) / 2)), rY + 58, 13, `text-anchor="middle" fill="${PAIR}" font-weight="700" ${halo("#ffffff")}`) : "";
  const timeTicks = Array.from({ length: 9 }, (_, i) => i * 2)
    .map((v) => `<path d="M${tx(v)} ${axisB}v6" stroke="${MUTED}"/>` + text(String(v), tx(v), axisB + 20, 12, `text-anchor="middle" fill="${MUTED}"`))
    .join("");
  const endNote = duration < MAX_DURATION - 1e-9
    ? `<rect x="${tx(duration)}" y="${B.top + 20}" width="${tx(MAX_DURATION) - tx(duration)}" height="${axisB - B.top - 20}" fill="#e9edf1" opacity="0.8"/>` +
      text("實驗結束：S、O 將重合 / Ended before S and O coincide", tx(duration) + 6, B.top + 36, 12, `fill="${MUTED}"`)
    : "";

  /* ---- Panel C: comparison table ---- */
  const C = { x: 40, y: B.top + 232 };
  const cols = [40, 330, 520, 710, 860];
  const rows: [string, string, string, string, string][] = [
    ["量 / Quantity", "目前 / Current", "參考 / Reference", "公式核對 / Formula", ""],
    ["ΔT / T₀ 發射間隔 emission interval", fmt(result.pair?.emissionInterval), "—", "1", ""],
    ["λ / λ₀ 波前間距 spacing", fmt(result.ratios?.wavelength), fmt(result.reference?.ratios.wavelength), fmt(result.analytic.wavelength), "(c − s·u_S)/c"],
    ["Δt / T₀ 接收間隔 reception interval", fmt(result.ratios?.period), fmt(result.reference?.ratios.period), fmt(result.analytic.period), "(c − s·u_S)/(c − s·u_O)"],
    ["f / f₀ 接收頻率 received frequency", fmt(result.ratios?.frequency), fmt(result.reference?.ratios.frequency), fmt(result.analytic.frequency), "(c − s·u_O)/(c − s·u_S)"],
  ];
  const table = rows.map((row, i) => row.map((cell, j) => (cell ? text(cell, cols[j], C.y + 22 + i * 26, i === 0 ? 12 : j === 4 ? 12 : 14, `${i === 0 ? `fill="${MUTED}" ` : j === 4 ? `fill="${MUTED}" ` : ""}${i === 4 && j === 1 ? 'font-weight="700"' : ""}`) : "")).join("")).join("");
  const referenceNote = result.reference
    ? `參考：u_S = ${signed(result.reference.sourceVelocity)}c, u_O = ${signed(result.reference.observerVelocity)}c, 波前對 #${result.reference.pair}  / Reference setup`
    : "尚未保留參考結果 / No reference kept";
  const footY = C.y + 22 + 5 * 26 + 18;
  // Each assumption is "中文。 English." — set the two languages on their own lines so nothing is clipped.
  const assumptionLines = result.assumptions.flatMap((s) => {
    const cut = s.search(/。\s/);
    return cut < 0 ? [s] : [s.slice(0, cut + 1), s.slice(cut + 1).trim()];
  });
  const height = footY + 52 + assumptionLines.length * 16 + 44;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="${height}" viewBox="0 0 1000 ${height}" role="img" aria-labelledby="title desc">
<title id="title">聲音的都普勒效應 / Doppler effect of sound</title><desc id="desc">Wavefront diagram in the air frame, emission and reception time band and comparison table. 空氣參考系波前圖、發射與接收時間帶及比較表。</desc>
<metadata>${escapeXml(JSON.stringify(result))}</metadata><rect width="1000" height="${height}" fill="white"/>
<g fill="${INK}" font-family="Arial, 'Noto Sans TC', sans-serif">
${text("聲音的都普勒效應 / Doppler effect of sound", 40, 38, 24, 'font-weight="700"')}
${text(`u_S = ${signed(setup.sourceVelocity)}c · u_O = ${signed(setup.observerVelocity)}c · c = 1, f₀ = 1（λ₀ = cT₀ = 1）· S 起點 x = ${fmt(setup.sourceStart, 1)} λ₀, O 起點 x = ${fmt(setup.observerStart, 1)} λ₀`, 40, 64, 14)}
${text("速度以空氣為參考系、向右為正 / Velocities in the air frame, positive to the right.", 40, 84, 12, `fill="${MUTED}"`)}
<clipPath id="clipA"><rect x="${A.x}" y="${A.y}" width="${A.w}" height="${A.h}"/></clipPath>
<rect x="${A.x}" y="${A.y}" width="${A.w}" height="${A.h}" fill="#f4f7fa" stroke="#c4ced8"/>
${text(`A  空氣參考系波前圖 / Wavefronts in the air frame · t = ${fmt(t)} T₀`, A.x, A.y - 6, 13, 'font-weight="700"')}
<g clip-path="url(#clipA)"><path d="M${A.x} ${axisY}H${A.x + A.w}" stroke="${MUTED}" stroke-width="1"/>${circles}${centres}${bracket}${markers}</g>
${xTicks}${text("x / λ₀", A.x + A.w - 4, A.y + A.h - 18, 12, `text-anchor="end" fill="${MUTED}"`)}
${text(`B  發射與接收時間帶 / Emission and reception time band · 時間軸等比例 / to scale  (編號 n = 同一波前 / same front)`, 40, B.top, 13, 'font-weight="700"')}
${endNote}
${text("發射 Emission (S)", 40, eY + 4, 13, `fill="${SOURCE}" font-weight="700"`)}${text("接收 Reception (O)", 40, rY + 4, 13, `fill="${OBSERVER}" font-weight="700"`)}
<path d="M${B.x0} ${eY}H${tx(duration)}M${B.x0} ${rY}H${tx(duration)}M${B.x0} ${axisB}H${B.x1}" stroke="${MUTED}" stroke-width="1"/>
${connectors}${emissionMarks}${receptionMarks}${emitBracket}${recvBracket}
<path d="M${tx(t)} ${B.top + 12}V${axisB}" stroke="${INK}" stroke-dasharray="4 4"/>${text(`t = ${fmt(t)}`, tx(t) + 4, B.top + 30, 11, `fill="${INK}" ${halo("#ffffff")}`)}
${timeTicks}${text("t / T₀", B.x1, axisB + 38, 12, `text-anchor="end" fill="${MUTED}"`)}
${text(`C  比較 / Comparison · 所選波前對 / selected pair #${pairN}, #${pairN + 1}`, 40, C.y, 13, 'font-weight="700"')}
${table}
${text(referenceNote, 40, footY, 12, `fill="${MUTED}"`)}
${text(`模型 / Model: ${result.modelVersion} · 結果格式 result: ${result.schema} · 分享格式 share: v${result.shareFormat} · 單位 units: t in T₀, x in λ₀, u in c`, 40, footY + 26, 12, `fill="${MUTED}"`)}
${assumptionLines.map((line, i) => text(line, 40, footY + 52 + i * 16, 11, `fill="${MUTED}"`)).join("")}
${text("重現設定與全部事件內嵌於 SVG metadata；亦可另存 JSON。 Setup and every event are embedded in the metadata; JSON is also available.", 40, footY + 52 + assumptionLines.length * 16 + 12, 11, `fill="${MUTED}"`)}
</g></svg>`;
}
