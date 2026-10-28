import {
  fieldAtPoint, instantaneousDisplacement, phaseConditionLevels, sampleSelectedPoint,
  sourcePositions, textbookLineCounts, wavefrontRadii,
} from "../../lib/science/interference.ts";
import type { InterferenceParameters, PhaseConditionLevel, Point } from "../../lib/science/interference.ts";
import { geometryForCondition, svgPathForPoints } from "../../models/interference-geometry.ts";
import { checkLineCountAnswer, centralConditionKind, constructiveOrderShape } from "../../models/interference-activities.ts";
import { snapToCondition } from "../../models/interference-snap.ts";

export interface InterferenceController { dispose(): void }
export interface InterferenceRuntime {
  requestAnimationFrame(callback: FrameRequestCallback): number;
  cancelAnimationFrame(id: number): void;
  createResizeObserver(callback: ResizeObserverCallback): Pick<ResizeObserver, "observe" | "disconnect">;
}
const browserRuntime: InterferenceRuntime = {
  requestAnimationFrame: (cb) => window.requestAnimationFrame(cb),
  cancelAnimationFrame: (id) => window.cancelAnimationFrame(id),
  createResizeObserver: (cb) => new ResizeObserver(cb),
};
type View = "displacement" | "intensity" | "amplitude" | "phase";
const NS = "http://www.w3.org/2000/svg";
const BOUNDS = { xMin: -4, xMax: 4, yMin: -4, yMax: 4 };
const project = (p: Point) => ({ x: ((p.x + 4) / 8) * 600, y: ((4 - p.y) / 8) * 600 });
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const lerpColor = (a: [number, number, number], b: [number, number, number], t: number) => a.map((v, i) => v + (b[i] - v) * t) as [number, number, number];

/** Imperative renderer and interaction owner. Every callback/listener is scoped to one mount. */
export function mountInterference(container: HTMLElement, runtime: InterferenceRuntime = browserRuntime): InterferenceController {
  const doc = container.ownerDocument;
  const canvas = container.querySelector<HTMLCanvasElement>("canvas[data-interference-canvas]");
  const svg = container.querySelector<SVGSVGElement>("svg[data-interference-overlay]");
  const plot = container.querySelector<HTMLElement>("[data-interference-plot]");
  if (!canvas || !svg || !plot) throw new Error("Interference host markup is incomplete");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is unavailable");
  const runtimeElement = doc.createElement("span");
  runtimeElement.dataset.interferenceRuntime = "";
  runtimeElement.hidden = true;
  container.append(runtimeElement);

  let disposed = false;
  let playing = false;
  let frameId: number | null = null;
  let lastTime: number | null = null;
  let timeCycle = 0;
  let selectedPoint: Point | null = null;
  let dragging = false;
  const capturedPointers = new Set<number>();
  let view: View = "displacement";
  const params: InterferenceParameters = { wavelength: 1, separation: 2, amplitude1: 1, amplitude2: 1, phase1: 0, phase2: 0, attenuation: false };
  let waveSpeed = 1;
  let frequency = 1;
  let fieldCacheKey = "";
  let fieldCache = new Float32Array();
  let activeActivity = "measure";
  let dialogOpener: HTMLElement | null = null;
  const activityState: { measureConstructive: boolean; measureDestructive: boolean; measureDone: boolean; measureStep: string; measureValues: { constructive: string; destructive: string }; countStep: string; countAttempts: number; countPrediction: { antinodes: string; nodes: string }; antiphaseDone: boolean; timeStep: string; timePrediction: string } = { measureConstructive: false, measureDestructive: false, measureDone: false, measureStep: "place", measureValues: { constructive: "", destructive: "" }, countStep: "predict", countAttempts: 0, countPrediction: { antinodes: "", nodes: "" }, antiphaseDone: false, timeStep: "predict", timePrediction: "" };
  const cleanups: Array<() => void> = [];
  const listen = (target: EventTarget, type: string, handler: EventListener) => {
    target.addEventListener(type, handler);
    cleanups.push(() => target.removeEventListener(type, handler));
  };
  const query = <T extends HTMLElement>(s: string) => container.querySelector<T>(s);
  const layer = (name: string) => svg.querySelector<SVGGElement>(`[data-layer="${name}"]`)!;
  const text = (selector: string, value: string) => { const node = query(selector); if (node && node.textContent !== value) node.textContent = value; };
  const attr = (el: Element, name: string, value: string) => el.setAttribute(name, value);
  const svgNode = (name: string, attributes: Record<string, string>) => {
    const node = doc.createElementNS(NS, name);
    Object.entries(attributes).forEach(([key, value]) => attr(node, key, value));
    return node;
  };
  const format = (v: number, digits = 2) => Number.isFinite(v) ? v.toFixed(digits) : "—";
  const syncFrequency = () => {
    frequency = waveSpeed / params.wavelength;
    text('[data-output="frequency"]', format(frequency));
    const input = query<HTMLInputElement>('[data-control="frequency"]');
    if (input) input.value = String(frequency);
  };

  const renderSvg = () => {
    const conditions = layer("conditions"); conditions.replaceChildren();
    for (const kind of ["constructive", "destructive"] as const) {
      const checkbox = query<HTMLInputElement>(`[data-control="${kind}"]`);
      if (checkbox && !checkbox.checked) continue;
      for (const level of phaseConditionLevels(params, kind)) {
        const geometry = geometryForCondition(level, params.separation, BOUNDS);
        const d = svgPathForPoints(geometry.points, project);
        if (!d) continue;
        conditions.append(svgNode("path", { d, fill: "none", stroke: kind === "constructive" ? "#e69a16" : "#087d90", "stroke-width": level.central ? "3" : "2.6", "stroke-dasharray": kind === "destructive" ? "7 6" : "none", style: "vector-effect:non-scaling-stroke", "data-condition": `${kind}-${level.m}` }));
      }
    }
    const sources = layer("sources"); sources.replaceChildren();
    for (const [index, point] of [sourcePositions(params.separation).source1, sourcePositions(params.separation).source2].entries()) {
      const p = project(point);
      sources.append(svgNode("circle", { cx: String(p.x), cy: String(p.y), r: "7", fill: "#101b2f", stroke: "white", "stroke-width": "3" }));
      const label = svgNode("text", { x: String(p.x), y: String(p.y + 30), "text-anchor": "middle", class: "interference-svg-label" });
      label.textContent = index === 0 ? "S₁" : "S₂";
      sources.append(label);
    }
    const waves = layer("wavefronts"); waves.replaceChildren();
    if (query<HTMLInputElement>('[data-control="wavefronts"]')?.checked) {
      const pair = sourcePositions(params.separation);
      for (const [index, point] of [pair.source1, pair.source2].entries()) {
        const center = project(point);
        for (const trough of [false, true]) for (const radius of wavefrontRadii(params.wavelength, index ? params.phase2 : params.phase1, 5, trough, timeCycle * Math.PI * 2)) {
          waves.append(svgNode("circle", { cx: String(center.x), cy: String(center.y), r: String(radius * 75), fill: "none", stroke: trough ? "rgba(16,27,47,.45)" : "rgba(255,255,255,.75)", "stroke-width": "1.2", "stroke-dasharray": trough ? "3 4" : "none", style: "pointer-events:none" }));
        }
      }
    }
    renderPoint();
  };
  const slot = (name: string, value: string) => { for (const node of container.querySelectorAll<HTMLElement>(`[data-slot="${name}"]`)) if (node.textContent !== value) node.textContent = value; };
  const formatSigned = (v: number) => format(v).replace("-", "−");
  const isTextbook = () => params.phase1 === params.phase2 && params.amplitude1 === params.amplitude2 && !params.attenuation;
  const terms = () => isTextbook() ? { constructive: "波腹線", destructive: "波節線" } : { constructive: "相長條件線", destructive: "相消條件線" };
  const countsMasked = () => activeActivity === "count" && query<HTMLElement>('[data-activity="count"] [data-activity-step="done"]')?.hidden !== false;
  const conditionNotation = (level: PhaseConditionLevel) => {
    if (level.central) return "0";
    const ratio = level.absolutePathDifference / params.wavelength; const doubled = Math.round(ratio * 2);
    if (Math.abs(ratio * 2 - doubled) < 1e-8) return doubled === 1 ? "λ/2" : doubled === 2 ? "λ" : doubled % 2 === 0 ? `${doubled / 2}λ` : `${doubled}λ/2`;
    return `${format(ratio)}λ`;
  };
  const lineDescription = (level: PhaseConditionLevel) => `${level.central ? "中央" : level.signedPathDifference > 0 ? "左側" : "右側"}${terms()[level.kind]}（${level.degenerate ? "半直線" : level.central ? "直線" : "雙曲線"}）：|Δr| = ${conditionNotation(level)}`;
  const VIEW_KEYS: Record<View, { low: string; high: string; gradient: string }> = {
    displacement: { low: "波谷（−）", high: "波峰（+）", gradient: "linear-gradient(90deg,rgb(58,72,160),rgb(247,246,241),rgb(214,122,8))" },
    intensity: { low: "強度 0", high: "最強", gradient: "linear-gradient(90deg,rgb(244,247,249),rgb(40,72,106))" },
    amplitude: { low: "振幅 0", high: "最大", gradient: "linear-gradient(90deg,rgb(247,242,228),rgb(176,92,10))" },
    phase: { low: "Φ = −π", high: "+π", gradient: "linear-gradient(90deg,#e8a9a9,#e8e8a0,#a9e8b4,#a9e0e8,#a9a9e8,#e8a9e8,#e8a9a9)" },
  };
  /** Geometry rail, mode badge, view key and kinematics: only text slots change, so animation frames never relayout. */
  const renderReadouts = () => {
    const ratio = params.separation / params.wavelength, textbook = isTextbook(), masked = countsMasked();
    const counts = textbookLineCounts(params.separation, params.wavelength);
    const constructiveCount = phaseConditionLevels(params, "constructive").length, destructiveCount = phaseConditionLevels(params, "destructive").length;
    const hide = (n: number) => masked ? "?" : String(n);
    for (const name of ["ratio", "ratioA", "ratioB"]) slot(name, format(ratio));
    slot("antinodes", hide(counts.antinodes)); slot("nodes", hide(counts.nodes));
    text('[data-readout="constructive-count"]', hide(constructiveCount)); text('[data-readout="destructive-count"]', hide(destructiveCount));
    const show = (selector: string, visible: boolean) => { const node = query<HTMLElement>(selector); if (node && node.hidden === visible) node.hidden = !visible; };
    show("[data-counts-textbook]", textbook); show("[data-counts-advanced]", !textbook); show("[data-counts-masked]", masked);
    const t = terms();
    text("[data-geometry-sr]", masked ? `d/λ = ${format(ratio)}，線數暫時遮住。` : `d/λ = ${format(ratio)}，${t.constructive} ${textbook ? counts.antinodes : constructiveCount} 條，${t.destructive} ${textbook ? counts.nodes : destructiveCount} 條。`);
    text('[data-term="constructive"]', t.constructive); text('[data-term="destructive"]', t.destructive);
    show("[data-advanced-warning]", !textbook);
    const mode = query<HTMLElement>("[data-mode-status]");
    if (mode) { text("[data-mode-status]", textbook ? "課本模式" : "進階模式"); mode.classList.toggle("is-advanced", !textbook); mode.title = textbook ? "等振幅、同相、不考慮衰減" : "線條代表相位條件"; }
    const key = VIEW_KEYS[view], keyBar = query<HTMLElement>("[data-view-key]");
    if (keyBar && keyBar.dataset.mode !== view) { keyBar.dataset.mode = view; keyBar.style.background = key.gradient; }
    text("[data-view-key-low]", key.low); text("[data-view-key-high]", key.high);
    show("[data-time-static-hint]", view !== "displacement"); show("[data-phase-note]", view === "phase");
    slot("kinV", format(waveSpeed)); slot("kinF", format(frequency)); slot("kinLambda", format(params.wavelength)); slot("kinT", format(1 / frequency));
    text("[data-kinematics-sr]", `v = ${format(waveSpeed)}，f = ${format(frequency)}，λ = ${format(params.wavelength)}，T = ${format(1 / frequency)} s。`);
  };
  const classificationFor = (sample: ReturnType<typeof sampleSelectedPoint>, snapped: PhaseConditionLevel | undefined, textbook: boolean) => {
    const ratio = format(Math.abs(sample.pathDifferenceRatio));
    if (!textbook) return snapped
      ? { tone: snapped.kind, title: `在${terms()[snapped.kind]}上`, detail: `Δφ = ${snapped.kind === "constructive" ? "0°" : "180°"}（mod 360°）。振幅不等或有衰減時，相消處未必是零；合成振幅 |C| = ${format(sample.amplitude)}。` }
      : { tone: "neither", title: "進階模式", detail: "線條代表相位條件：請用 Δφ 與合成振幅 |C| 一起判讀。" };
    if (sample.classification === "constructive") return { tone: "constructive", title: snapped ? "在波腹線上" : "接近波腹線", detail: `|Δr|/λ ${snapped ? "=" : "≈"} ${ratio} 是整數：兩列波同相抵達，相長（波腹）。` };
    if (sample.classification === "destructive") return { tone: "destructive", title: snapped ? "在波節線上" : "接近波節線", detail: `|Δr|/λ ${snapped ? "=" : "≈"} ${ratio} 是半整數：兩列波反相抵達，相消（波節）。` };
    return { tone: "neither", title: "不在波腹線或波節線上", detail: `|Δr|/λ = ${ratio}，既不是整數也不是半整數。拖曳 P 靠近線條試試。` };
  };
  const renderPoint = () => {
    const measurement = layer("measurement"); measurement.replaceChildren();
    const values = query<HTMLElement>("[data-point-values]");
    const empty = query<HTMLElement>("[data-point-empty]");
    const clear = query<HTMLButtonElement>('[data-action="clear-point"]');
    const status = query<HTMLElement>("[data-line-readout]");
    if (!selectedPoint) { const hadPoint = query<HTMLElement>("[data-point-position]")?.textContent?.startsWith("P ("); if (values) values.hidden = true; if (empty) empty.hidden = false; if (clear) clear.hidden = true; if (status) status.hidden = true; text("[data-point-position]", "尚未放置 P"); if (hadPoint) text("[data-point-announcement]", "觀測點 P 已清除。"); return; }
    if (values) values.hidden = false; if (empty) empty.hidden = true; if (clear) clear.hidden = false;
    const p = project(selectedPoint);
    const { source1, source2 } = sourcePositions(params.separation);
    const sources = [project(source1), project(source2)];
    sources.forEach((s, index) => {
      const other = sources[1 - index], length = Math.hypot(p.x - s.x, p.y - s.y);
      measurement.append(svgNode("line", { x1: String(s.x), y1: String(s.y), x2: String(p.x), y2: String(p.y), stroke: "rgba(16,27,47,.85)", "stroke-width": "1.8", "stroke-dasharray": index ? "6 4" : "none", style: "vector-effect:non-scaling-stroke" }));
      if (length < 36) return;
      const mid = { x: (s.x + p.x) / 2, y: (s.y + p.y) / 2 };
      let normal = { x: -(p.y - s.y) / length, y: (p.x - s.x) / length };
      if ((mid.x - other.x) * normal.x + (mid.y - other.y) * normal.y < 0) normal = { x: -normal.x, y: -normal.y };
      const label = svgNode("text", { x: String(mid.x + normal.x * 16), y: String(mid.y + normal.y * 16 + 5), "text-anchor": "middle", class: "interference-svg-label interference-svg-label--name" });
      label.textContent = index ? "r₂" : "r₁"; measurement.append(label);
    });
    const textbook = isTextbook();
    const textbookNotice=query<HTMLElement>("[data-textbook-required]");if(textbookNotice)textbookNotice.hidden=textbook;
    const sample = sampleSelectedPoint(selectedPoint, params, textbook);
    const levels = [...phaseConditionLevels(params, "constructive"), ...phaseConditionLevels(params, "destructive")];
    const snapped = snapToCondition(selectedPoint, params.separation, levels, .12).level ?? undefined;
    const pointAttrs: Record<string, string> = { cx: String(p.x), cy: String(p.y), r: "8", fill: "#fff", stroke: snapped ? (snapped.kind === "constructive" ? "#e69a16" : "#087d90") : "#101b2f", "stroke-width": snapped ? "4" : "3", "data-selected-point": "" };
    measurement.append(svgNode("circle", pointAttrs));
    const pLabel = svgNode("text", { x: String(p.x + 13), y: String(p.y - 12), class: "interference-svg-label" }); pLabel.textContent = "P"; measurement.append(pLabel);
    if (status) { status.textContent = snapped ? `P 吸附在${lineDescription(snapped)}` : ""; status.hidden = !snapped; }
    if (activeActivity === "measure" && activityState.measureStep === "place") { activityState.measureStep = "explore"; const place=query<HTMLElement>('[data-activity="measure"] [data-activity-step="place"]');const explore=query<HTMLElement>('[data-activity="measure"] [data-activity-step="explore"]');place?.classList.add("is-done");if(explore)explore.hidden=false; }
    if (activeActivity === "measure" && textbook && snapped) {
      if (snapped.kind === "constructive") { activityState.measureConstructive = true; activityState.measureValues.constructive = format(sample.absolutePathDifference / params.wavelength); }
      if (snapped.kind === "destructive") { activityState.measureDestructive = true; activityState.measureValues.destructive = format(sample.absolutePathDifference / params.wavelength); }
      if (activityState.measureStep === "explore" && activityState.measureConstructive && activityState.measureDestructive) { activityState.measureStep = "conclude"; query<HTMLElement>('[data-activity="measure"] [data-activity-step="explore"]')!.hidden = true; query<HTMLElement>('[data-activity="measure"] [data-activity-step="conclude"]')!.hidden = false; }
      text("[data-measure-progress]", `已觀察：波腹 ${activityState.measureConstructive ? 1 : 0}/1，波節 ${activityState.measureDestructive ? 1 : 0}/1`);
      text('[data-observed="constructive"]', activityState.measureValues.constructive || "未觀察");
      text('[data-observed="destructive"]', activityState.measureValues.destructive || "未觀察");
      for (const kind of ["constructive", "destructive"] as const) query<HTMLElement>(`[data-check="${kind}"]`)?.classList.toggle("is-done", kind === "constructive" ? activityState.measureConstructive : activityState.measureDestructive);
    }
    slot("r1", format(sample.r1)); slot("r2", format(sample.r2)); slot("path", formatSigned(sample.pathDifference)); slot("pathRatio", format(sample.absolutePathDifference / params.wavelength));
    text("[data-measure-sr]", `r₁ = ${format(sample.r1)}，r₂ = ${format(sample.r2)}，Δr = ${formatSigned(sample.pathDifference)}，|Δr|/λ = ${format(Math.abs(sample.pathDifferenceRatio))}。`);
    text('[data-readout="phase-difference"]', `${format(((sample.phaseDifference * 180 / Math.PI) % 360 + 360) % 360, 1)}°`);
    text('[data-readout="amplitude"]', format(sample.amplitude));
    text('[data-readout="displacement"]', format(instantaneousDisplacement(sample, timeCycle * Math.PI * 2)));
    const classification = classificationFor(sample, snapped, textbook);
    const box = query<HTMLElement>("[data-readout='classification']");
    if (box) box.dataset.tone = classification.tone;
    text("[data-classification-title]", classification.title); text("[data-classification-detail]", classification.detail);
    text("[data-point-announcement]", `觀測點 P：路徑差 ${format(sample.pathDifference)}，${classification.title}。`);
    const curve = container.querySelector<SVGPathElement>("[data-waveform-curve]");
    if (curve) {
      const maxAmplitude = Math.max(params.amplitude1 + params.amplitude2, .01);
      const points = Array.from({ length: 121 }, (_, i) => {
        const phase = i / 120 * Math.PI * 2;
        const psi = instantaneousDisplacement(sample, phase);
        return `${i ? "L" : "M"}${(i * 2).toFixed(2)},${(45 - psi * 40 / maxAmplitude).toFixed(2)}`;
      });
      curve.setAttribute("d", points.join(" "));
      const marker = container.querySelector<SVGCircleElement>("[data-waveform-marker]");
      if (marker) { attr(marker, "cx", String(timeCycle * 240)); attr(marker, "cy", String(45 - instantaneousDisplacement(sample, timeCycle * Math.PI * 2) * 40 / maxAmplitude)); }
    }
    text("[data-point-position]", `P (${format(selectedPoint.x)}, ${format(selectedPoint.y)})`);
  };

  const renderField = () => {
    if (disposed) return;
    const viewName = { displacement: "瞬時位移", intensity: "強度", amplitude: "合成振幅", phase: "合成相位" }[view];
    text("[data-field-summary]", `目前顯示${viewName}。橘色實線是相長條件，青色虛線是相消條件；兩個波源位於中央線左右。可用 P 取得路徑差和分類讀值。`);
    const rect = plot.getBoundingClientRect();
    const cssSize = Math.max(80, Math.min(rect.width || 480, rect.height || rect.width || 480));
    const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    const resolution = clamp(Math.round(cssSize * dpr * .62), 300, 560);
    canvas.width = Math.round(cssSize * dpr); canvas.height = Math.round(cssSize * dpr);
    canvas.style.width = `${cssSize}px`; canvas.style.height = `${cssSize}px`;
    const image = ctx.createImageData(resolution, resolution);
    const maxAmp = Math.max(params.amplitude1 + params.amplitude2, .001);
    const key = [resolution, params.wavelength, params.separation, params.amplitude1, params.amplitude2, params.phase1, params.phase2, params.attenuation].join(":");
    if (fieldCacheKey !== key) {
      fieldCacheKey = key;
      fieldCache = new Float32Array(resolution * resolution * 4);
      for (let y = 0; y < resolution; y += 1) for (let x = 0; x < resolution; x += 1) {
        const point = { x: -4 + (8 * x) / (resolution - 1), y: 4 - (8 * y) / (resolution - 1) };
        const sample = fieldAtPoint(point, params); const index = (y * resolution + x) * 4;
        fieldCache[index] = sample.real; fieldCache[index + 1] = sample.imaginary; fieldCache[index + 2] = sample.amplitude; fieldCache[index + 3] = sample.phase;
      }
    }
    for (let y = 0; y < resolution; y += 1) for (let x = 0; x < resolution; x += 1) {
      const index = (y * resolution + x) * 4;
      const field = { real: fieldCache[index], imaginary: fieldCache[index + 1], amplitude: fieldCache[index + 2], intensity: fieldCache[index + 2] ** 2, phase: fieldCache[index + 3] };
      let color: [number, number, number];
      if (view === "phase" && field.amplitude < maxAmp * .025) color = [226, 226, 226];
      else if (view === "phase") {
        const hue = ((field.phase / (2 * Math.PI) * 360) % 360 + 360) % 360;
        const c = .62 * 255, sec = c * (1 - Math.abs((hue / 60 % 2) - 1)); let r = 0, g = 0, b = 0;
        if (hue < 60) [r,g]=[c,sec]; else if (hue < 120) [r,g]=[sec,c]; else if (hue < 180) [g,b]=[c,sec]; else if (hue < 240) [g,b]=[sec,c]; else if (hue < 300) [r,b]=[sec,c]; else [r,b]=[c,sec];
        const lift = 232 - c/2; color = [r+lift,g+lift,b+lift];
      } else {
        let t: number;
        let low: [number, number, number], high: [number, number, number];
        if (view === "displacement") { t = clamp((instantaneousDisplacement(field, timeCycle * Math.PI * 2) / maxAmp + 1) / 2, 0, 1); low=[58,72,160]; high=[214,122,8]; color = t < .5 ? lerpColor(low,[247,246,241],t*2) : lerpColor([247,246,241],high,(t-.5)*2); }
        else { t = clamp((view === "intensity" ? field.intensity/(maxAmp*maxAmp) : field.amplitude/maxAmp),0,1); low = view === "intensity" ? [244,247,249] : [247,242,228]; high = view === "intensity" ? [40,72,106] : [176,92,10]; color=lerpColor(low,high,t); }
      }
      image.data[index]=color[0]; image.data[index+1]=color[1]; image.data[index+2]=color[2]; image.data[index+3]=255;
    }
    const scratch = doc.createElement("canvas"); scratch.width=resolution; scratch.height=resolution;
    scratch.getContext("2d")?.putImageData(image,0,0);
    ctx.setTransform(canvas.width/resolution,0,0,canvas.height/resolution,0,0); ctx.clearRect(0,0,resolution,resolution); ctx.drawImage(scratch,0,0);
    runtimeElement.dataset.interferenceFrame = String(Number(runtimeElement.dataset.interferenceFrame || 0) + 1);
    renderSvg();
    renderReadouts();
  };
  const schedule = () => { if (frameId === null && playing && !disposed) frameId = runtime.requestAnimationFrame(tick); };
  const tick: FrameRequestCallback = (now) => {
    frameId = null;
    if (disposed || !playing) return;
    if (lastTime !== null) timeCycle = (timeCycle + (now-lastTime)/(2800*params.wavelength/waveSpeed)) % 1;
    lastTime = now;
    const input = query<HTMLInputElement>('[data-control="time-cycle"]'); if (input) input.value=String(timeCycle);
    text('[data-output="time-cycle"]',format(timeCycle));
    renderField(); schedule();
  };
  const pointFromEvent = (event: PointerEvent) => {
    const rect = svg.getBoundingClientRect();
    return { x: clamp(((event.clientX-rect.left)/rect.width)*8-4,-4,4), y: clamp(4-((event.clientY-rect.top)/rect.height)*8,-4,4) };
  };
  const onPointerDown = (event: PointerEvent) => {
    if (disposed) return;
    if (typeof (event.target as Element | null)?.closest === "function" && (event.target as Element).closest("[data-plot-hint]")) return;
    const rect = svg.getBoundingClientRect(); const p = pointFromEvent(event);
    const px = ((p.x+4)/8)*rect.width, py=((4-p.y)/8)*rect.height;
    const existing = selectedPoint ? { x: ((selectedPoint.x+4)/8)*rect.width, y: ((4-selectedPoint.y)/8)*rect.height } : null;
    if (!existing || Math.hypot(px-existing.x,py-existing.y)>18) selectedPoint=p;
    if (!selectedPoint) return;
    const levels = [...phaseConditionLevels(params, "constructive"), ...phaseConditionLevels(params, "destructive")];
    selectedPoint = snapToCondition(selectedPoint, params.separation, levels, .16).point;
    dragging=true;
    plot.focus?.({ preventScroll: true });
    try { plot.setPointerCapture(event.pointerId); capturedPointers.add(event.pointerId); } catch { /* pointer may have been cancelled */ }
    renderPoint();
  };
  const onPointerMove = (event: PointerEvent) => { if (!dragging || disposed) return; const p=pointFromEvent(event); const levels=[...phaseConditionLevels(params,"constructive"),...phaseConditionLevels(params,"destructive")]; selectedPoint=snapToCondition(p,params.separation,levels,.16).point; renderPoint(); };
  const endDrag = (event: PointerEvent) => { dragging=false; capturedPointers.delete(event.pointerId); try { if (plot.hasPointerCapture(event.pointerId)) plot.releasePointerCapture(event.pointerId); } catch { /* already released */ } };

  try {
    listen(plot,"pointerdown",onPointerDown as EventListener); listen(plot,"pointermove",onPointerMove as EventListener);
    listen(plot,"pointerup",endDrag as EventListener); listen(plot,"pointercancel",endDrag as EventListener);
    listen(plot,"dblclick",()=>{selectedPoint=null;renderPoint();});
    listen(plot,"keydown",((event:KeyboardEvent)=>{
      if (event.target !== plot) return;
      if (!selectedPoint && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); selectedPoint={x:0,y:0}; renderPoint(); return; }
      if (!selectedPoint) return;
      if (event.key === "Escape" || event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); selectedPoint=null; renderPoint(); return; }
      const step=event.shiftKey ? .25 : .05; const p={...selectedPoint};
      if(event.key==="ArrowLeft")p.x-=step;else if(event.key==="ArrowRight")p.x+=step;else if(event.key==="ArrowUp")p.y+=step;else if(event.key==="ArrowDown")p.y-=step;else return;
      event.preventDefault();selectedPoint={x:clamp(p.x,-4,4),y:clamp(p.y,-4,4)};renderPoint();
    }) as EventListener);
    const resizeObserver=runtime.createResizeObserver(()=>{ if (!disposed) renderField(); }); resizeObserver.observe(plot); cleanups.push(()=>resizeObserver.disconnect());
    const bindRange=(name:string, fn:(value:number)=>void)=>{ const input=query<HTMLInputElement>(`[data-control="${name}"]`); if (!input) return; listen(input,"input",()=>fn(Number(input.value))); };
    const updateParam=(name:keyof InterferenceParameters, value:number|boolean)=>{ (params as unknown as Record<string,number|boolean>)[name]=value; text(`[data-output="${name}"]`,typeof value==="boolean"?"":name.startsWith("phase")?`${format(Number(value)*180/Math.PI,0)}°`:format(Number(value))); renderField(); };
    bindRange("wavelength",v=>{ params.wavelength=clamp(v,.5,1.5); frequency=waveSpeed/params.wavelength; text('[data-output="wavelength"]',format(params.wavelength)); text('[data-output="frequency"]',format(frequency)); const f=query<HTMLInputElement>('[data-control="frequency"]');if(f)f.value=String(frequency); renderField(); });
    bindRange("separation",v=>{params.separation=v;text('[data-output="separation"]',format(v));renderField();});
    for (const name of ["amplitude1","amplitude2"] as const) bindRange(name,v=>updateParam(name,v));
    for (const name of ["phase1","phase2"] as const) bindRange(name,v=>updateParam(name,v*Math.PI/180));
    bindRange("waveSpeed",v=>{waveSpeed=v;frequency=v/params.wavelength;text('[data-output="waveSpeed"]',format(v));text('[data-output="frequency"]',format(frequency));const f=query<HTMLInputElement>('[data-control="frequency"]');if(f)f.value=String(frequency);});
    bindRange("frequency",v=>{params.wavelength=clamp(waveSpeed/v,.5,1.5);syncFrequency();text('[data-output="wavelength"]',format(params.wavelength));const w=query<HTMLInputElement>('[data-control="wavelength"]');if(w)w.value=String(params.wavelength);renderField();});
    for (const name of ["constructive","destructive","wavefronts"] as const) { const input=query<HTMLInputElement>(`[data-control="${name}"]`);if(input)listen(input,"change",renderSvg as EventListener); }
    const attenuation=query<HTMLInputElement>('[data-control="attenuation"]');if(attenuation)listen(attenuation,"change",()=>updateParam("attenuation",attenuation.checked));
    for (const input of container.querySelectorAll<HTMLInputElement>('input[name="interference-view"]')) listen(input,"change",()=>{if(input.checked){view=input.value as View;renderField();}});
    bindRange("time-cycle",v=>{timeCycle=v;text('[data-output="time-cycle"]',format(timeCycle));renderField();});
    const play=query<HTMLButtonElement>('[data-action="play-pause"]'); if(play)listen(play,"click",()=>{playing=!playing;lastTime=null;play.textContent=playing?"❚❚ 暫停":"▶ 播放";play.setAttribute("aria-pressed",String(playing));if(playing)schedule();else if(frameId!==null){runtime.cancelAnimationFrame(frameId);frameId=null;}});
    const reset=query<HTMLButtonElement>('[data-action="reset-time"]');if(reset)listen(reset,"click",()=>{timeCycle=0;lastTime=null;const t=query<HTMLInputElement>('[data-control="time-cycle"]');if(t)t.value="0";text('[data-output="time-cycle"]',"0.00");renderField();});
    const clear=query<HTMLButtonElement>('[data-action="clear-point"]');if(clear)listen(clear,"click",()=>{selectedPoint=null;renderPoint();});
    const resetParams=query<HTMLButtonElement>('[data-action="reset-parameters"]');if(resetParams)listen(resetParams,"click",()=>{
      for(const [name,value] of Object.entries({wavelength:1,separation:2,amplitude1:1,amplitude2:1,phase1:0,phase2:0,waveSpeed:1,frequency:1})){
        const input=query<HTMLInputElement>(`[data-control="${name}"]`);if(input){input.value=String(value);input.dispatchEvent(new Event("input",{bubbles:true}));}
      }
      for(const [name,checked] of Object.entries({constructive:true,destructive:true,attenuation:false,wavefronts:false})){
        const input=query<HTMLInputElement>(`[data-control="${name}"]`);if(input){input.checked=checked;input.dispatchEvent(new Event("change",{bubbles:true}));}
      }
      playing=false;lastTime=null;if(frameId!==null){runtime.cancelAnimationFrame(frameId);frameId=null;}
      const playButton=query<HTMLButtonElement>('[data-action="play-pause"]');if(playButton){playButton.textContent="▶ 播放";playButton.setAttribute("aria-pressed","false");}
      timeCycle=0;const timeInput=query<HTMLInputElement>('[data-control="time-cycle"]');if(timeInput)timeInput.value="0";text('[data-output="time-cycle"]',"0.00");
      selectedPoint=null;renderPoint();
      const displacement=query<HTMLInputElement>('input[name="interference-view"][value="displacement"]');if(displacement)displacement.checked=true;view="displacement";
      renderField();
    });
    const activity = (event: Event) => {
      const target=event.target as HTMLElement; const action=target.closest<HTMLElement>("[data-activity-action]")?.dataset.activityAction;
      const setStep=(id:string,step:string)=>{const article=query<HTMLElement>(`[data-activity="${id}"]`);article?.querySelectorAll<HTMLElement>("[data-activity-step]").forEach(el=>{el.hidden=el.dataset.activityStep!==step;});};
      const feedback=(id:string,value:string)=>text(`[data-feedback="${id}"]`,value);
      if(target.matches("[data-activity-tab]")){const id=(target as HTMLElement).dataset.activityTab!;activeActivity=id;container.querySelectorAll<HTMLElement>("[data-activity]").forEach(el=>{el.hidden=el.dataset.activity!==id;});container.querySelectorAll<HTMLElement>("[data-activity-tab]").forEach(el=>el.setAttribute("aria-current",el.dataset.activityTab===id?"step":"false"));text("[data-activity-progress]",id==="edge"?"進階探索":`${["measure","count","antiphase","time"].indexOf(id)+1} / 4`);text("[data-activity-summary]",query<HTMLElement>(`[data-activity="${id}"]`)?.dataset.summary??"");query<HTMLElement>(`[data-activity="${id}"] h3`)?.focus();return;}
      if(target.matches("[data-activity-go]")){const id=(target as HTMLElement).dataset.activityGo!;query<HTMLElement>(`[data-activity-tab="${id}"]`)?.click();return;}
      if(target.matches("[data-activity-nav]")){const ids=["measure","count","antiphase","time"];const idx=ids.indexOf(activeActivity);const next=ids[(idx+((target as HTMLElement).dataset.activityNav==="next"?1:ids.length-1))%ids.length];query<HTMLElement>(`[data-activity-tab="${next}"]`)?.click();return;}
      if(target.matches("[data-open-dialog]")){const dialog=query<HTMLDialogElement>(`[data-dialog="${(target as HTMLElement).dataset.openDialog}"]`);if(dialog){dialogOpener=target;dialog.showModal();dialog.querySelector<HTMLElement>("button")?.focus();}return;}
      if(target.matches("[data-close-dialog]")){(target.closest("dialog") as HTMLDialogElement|null)?.close();dialogOpener?.focus();dialogOpener=null;return;}
      if(action==="setup-textbook"){params.amplitude1=1;params.amplitude2=1;params.phase1=0;params.phase2=0;params.attenuation=false;for(const [name,value] of Object.entries({amplitude1:1,amplitude2:1,phase1:0,phase2:0})){const input=query<HTMLInputElement>(`[data-control="${name}"]`);if(input)input.value=String(value);}const attenuation=query<HTMLInputElement>('[data-control="attenuation"]');if(attenuation)attenuation.checked=false;text('[data-output="amplitude1"]',"1.00");text('[data-output="amplitude2"]',"1.00");text('[data-output="phase1"]',"0°");text('[data-output="phase2"]',"0°");renderField();return;}
      if(action==="measure-check"){const a=query<HTMLSelectElement>('[data-answer="measure-constructive"]')?.value;const b=query<HTMLSelectElement>('[data-answer="measure-destructive"]')?.value;const correct=a==="integer"&&b==="half"&&activityState.measureConstructive&&activityState.measureDestructive;feedback("measure",correct?"正確：波腹對應整數倍波長，波節對應半整數倍。":"先在圖上分別觀察波腹與波節條件線，再選擇路徑差規律。");if(correct){activityState.measureDone=true;setStep("measure","done");}return;}
      if(action==="count-lock"){const a=query<HTMLInputElement>('[data-answer="count-predict-antinodes"]')?.value;const n=query<HTMLInputElement>('[data-answer="count-predict-nodes"]')?.value;if(!a||!n)return;activityState.countPrediction={antinodes:a,nodes:n};text('[data-prediction="antinodes"]',a);text('[data-prediction="nodes"]',n);const observedA=query<HTMLInputElement>('[data-answer="count-antinodes"]');const observedN=query<HTMLInputElement>('[data-answer="count-nodes"]');if(observedA)observedA.value=a;if(observedN)observedN.value=n;params.wavelength=1;params.separation=3;params.amplitude1=1;params.amplitude2=1;params.phase1=0;params.phase2=0;params.attenuation=false;syncFrequency();for(const name of ["wavelength","separation","amplitude1","amplitude2","phase1","phase2"]){const input=query<HTMLInputElement>(`[data-control="${name}"]`);if(input)input.value=name==="separation"?"3":name.startsWith("phase")?"0":"1";}const attenuation=query<HTMLInputElement>('[data-control="attenuation"]');if(attenuation)attenuation.checked=false;text('[data-output="separation"]',"3.00");text('[data-output="wavelength"]',"1.00");activityState.countStep="observe";setStep("count","observe");renderField();return;}
      if(action==="count-check"||action==="count-reveal"){const answer={antinodes:Number(query<HTMLInputElement>('[data-answer="count-antinodes"]')?.value),nodes:Number(query<HTMLInputElement>('[data-answer="count-nodes"]')?.value)};activityState.countAttempts++;const result=checkLineCountAnswer(answer,params.separation,params.wavelength,activityState.countAttempts);const reveal=query<HTMLButtonElement>('[data-activity-action="count-reveal"]');if(reveal)reveal.hidden=activityState.countAttempts<1;if(action==="count-reveal"||result.correct||result.hint==="reveal"){text("[data-count-result]",`答案：${result.expected.antinodes} 條波腹線、${result.expected.nodes} 條波節線。${result.correct?"你的觀察正確。":"請留意中央線與邊界退化半直線。"}`);setStep("count","done");}else feedback("count",result.hint==="central"?"提示：波腹線包含中央 Δr=0。":result.hint==="nodes-no-central"?"提示：波節線沒有中央線。": "提示：最外側等號條件仍有兩條退化半直線。");return;}
      if(action==="count-retry"){activityState.countStep="predict";activityState.countAttempts=0;for(const input of container.querySelectorAll<HTMLInputElement>('[data-answer^="count-"]'))input.value="";const reveal=query<HTMLButtonElement>('[data-activity-action="count-reveal"]');if(reveal)reveal.hidden=true;feedback("count","");setStep("count","predict");return;}
      if(action==="antiphase-apply"){const choice=query<HTMLInputElement>('input[name="antiphase-choice"]:checked')?.value;if(!choice)return;params.amplitude1=1;params.amplitude2=1;params.phase1=0;params.phase2=Math.PI;params.attenuation=false;for(const name of ["amplitude1","amplitude2","phase1","phase2"]){const input=query<HTMLInputElement>(`[data-control="${name}"]`);if(input)input.value=name==="phase2"?"180":name.startsWith("amplitude")?"1":"0";}const attenuation=query<HTMLInputElement>('[data-control="attenuation"]');if(attenuation)attenuation.checked=false;activityState.antiphaseDone=true;const kind=centralConditionKind(params);const explanation=kind!=="destructive"?"中央線類型沒有改變。":choice==="node"?"猜對了：中央線變成相消條件線。":choice==="antinode"?"中央線其實變成相消條件線。":"觀察結果：中央線變成相消條件線。";text('[data-feedback="antiphase"]',`${explanation} 合成振幅 ${format(fieldAtPoint({x:0,y:0},params).amplitude)}。`);text('[data-output="phase2"]',"180°");renderField();setStep("antiphase","done");return;}
      if(action==="antiphase-toggle"){params.phase2=params.phase2===0?Math.PI:0;const input=query<HTMLInputElement>('[data-control="phase2"]');if(input)input.value=String(params.phase2*180/Math.PI);text('[data-output="phase2"]',`${params.phase2*180/Math.PI}°`);renderField();return;}
      if(action==="time-start"){const choice=query<HTMLInputElement>('input[name="time-choice"]:checked')?.value;if(!choice)return;activityState.timePrediction=choice;view="displacement";const radio=query<HTMLInputElement>('input[name="interference-view"][value="displacement"]');if(radio)radio.checked=true;const waves=query<HTMLInputElement>('[data-control="wavefronts"]');if(waves)waves.checked=true;timeCycle=0;lastTime=null;const ti=query<HTMLInputElement>('[data-control="time-cycle"]');if(ti)ti.value="0";text('[data-output="time-cycle"]',"0.00");const button=query<HTMLButtonElement>('[data-action="play-pause"]');if(button&&playing)button.click();if(button&&!playing)button.click();activityState.timeStep="observe";setStep("time","observe");renderField();return;}
      if(action==="time-check"){const fronts=query<HTMLInputElement>('input[name="time-fronts"]:checked')?.value;const lines=query<HTMLInputElement>('input[name="time-lines"]:checked')?.value;if(!fronts||!lines)return;if(fronts==="moves"&&lines==="static"){feedback("time",activityState.timePrediction==="static"?"你一開始就猜對了：波峰、波谷一直向外跑，條件線固定。":"波峰、波谷向外跑，條件線固定，和常見直覺相反。");setStep("time","done");}else feedback("time",!fronts.includes("moves")?"再看圓圈：波峰與波谷會隨播放移動。":"再比較橘色與藍綠色條件線：播放時它們的位置不變。");return;}
      if(action==="edge-set"){const ratio=Number((target as HTMLElement).dataset.value);params.wavelength=1;params.separation=ratio;params.amplitude1=1;params.amplitude2=1;params.phase1=0;params.phase2=0;params.attenuation=false;syncFrequency();for(const name of ["wavelength","separation","amplitude1","amplitude2","phase1","phase2"]){const input=query<HTMLInputElement>(`[data-control="${name}"]`);if(input)input.value=name==="separation"?String(ratio):name.startsWith("phase")?"0":"1";}const attenuation=query<HTMLInputElement>('[data-control="attenuation"]');if(attenuation)attenuation.checked=false;text('[data-output="wavelength"]',"1.00");text('[data-output="separation"]',format(ratio));const shape=constructiveOrderShape(params,3);text("[data-edge-shape]",shape==="absent"?"不存在":shape==="degenerate"?"兩條退化半直線":"雙曲線");renderField();return;}
    };
    listen(container,"click",((event:Event)=>{activity(event);renderReadouts();}) as EventListener);
    for(const dialog of container.querySelectorAll<HTMLDialogElement>("dialog[data-dialog]"))listen(dialog,"close",()=>{const opener=dialogOpener;dialogOpener=null;opener?.focus();});
    listen(container,"input",((event:Event)=>{const target=event.target as HTMLInputElement;const id=target.dataset.answer;if(id?.startsWith("count-predict")){const ready=!!query<HTMLInputElement>('[data-answer="count-predict-antinodes"]')?.value&&!!query<HTMLInputElement>('[data-answer="count-predict-nodes"]')?.value;const button=query<HTMLButtonElement>('[data-activity-action="count-lock"]');if(button)button.disabled=!ready;}if(id==="count-antinodes"||id==="count-nodes"){const ready=!!query<HTMLInputElement>('[data-answer="count-antinodes"]')?.value&&!!query<HTMLInputElement>('[data-answer="count-nodes"]')?.value;const button=query<HTMLButtonElement>('[data-activity-action="count-check"]');if(button)button.disabled=!ready;}}) as EventListener);
    listen(container,"change",((event:Event)=>{const target=event.target as HTMLInputElement;if(target.name==="antiphase-choice"){const b=query<HTMLButtonElement>('[data-activity-action="antiphase-apply"]');if(b)b.disabled=false;}if(target.name==="time-choice"){const b=query<HTMLButtonElement>('[data-activity-action="time-start"]');if(b)b.disabled=false;}if(target.name==="time-fronts"||target.name==="time-lines"){const b=query<HTMLButtonElement>('[data-activity-action="time-check"]');if(b)b.disabled=!(query<HTMLInputElement>('input[name="time-fronts"]:checked')&&query<HTMLInputElement>('input[name="time-lines"]:checked'));}if(target.dataset.answer?.startsWith("measure-")){if(target.dataset.answer==="measure-constructive")activityState.measureConstructive=target.value==="integer";if(target.dataset.answer==="measure-destructive")activityState.measureDestructive=target.value==="half";}}) as EventListener);
    renderField();
  } catch (error) {
    disposed=true; cleanups.splice(0).forEach(cleanup=>cleanup());runtimeElement.remove();throw error;
  }
  return { dispose() { if(disposed)return;disposed=true;playing=false;if(frameId!==null){runtime.cancelAnimationFrame(frameId);frameId=null;}for(const cleanup of cleanups.splice(0).reverse())cleanup();for(const id of capturedPointers){try{if(plot.hasPointerCapture(id))plot.releasePointerCapture(id);}catch{/* browser may release during unmount */}}capturedPointers.clear();runtimeElement.remove(); } };
}
