import {
  fieldAtPoint, instantaneousDisplacement, phaseConditionLevels, sampleSelectedPoint,
  sourcePositions, wavefrontRadii,
} from "../../lib/science/interference.ts";
import type { InterferenceParameters, Point } from "../../lib/science/interference.ts";
import { geometryForCondition, svgPathForPoints } from "../../models/interference-geometry.ts";

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
  const cleanups: Array<() => void> = [];
  const listen = (target: EventTarget, type: string, handler: EventListener) => {
    target.addEventListener(type, handler);
    cleanups.push(() => target.removeEventListener(type, handler));
  };
  const query = <T extends HTMLElement>(s: string) => container.querySelector<T>(s);
  const layer = (name: string) => svg.querySelector<SVGGElement>(`[data-layer="${name}"]`)!;
  const text = (selector: string, value: string) => { const node = query(selector); if (node) node.textContent = value; };
  const attr = (el: Element, name: string, value: string) => el.setAttribute(name, value);
  const svgNode = (name: string, attributes: Record<string, string>) => {
    const node = doc.createElementNS(NS, name);
    Object.entries(attributes).forEach(([key, value]) => attr(node, key, value));
    return node;
  };
  const format = (v: number, digits = 2) => Number.isFinite(v) ? v.toFixed(digits) : "—";

  const renderSvg = () => {
    const conditions = layer("conditions"); conditions.replaceChildren();
    for (const kind of ["constructive", "destructive"] as const) {
      const checkbox = query<HTMLInputElement>(`[data-control="${kind}"]`);
      if (checkbox && !checkbox.checked) continue;
      for (const level of phaseConditionLevels(params, kind)) {
        const geometry = geometryForCondition(level, params.separation, BOUNDS);
        const d = svgPathForPoints(geometry.points, project);
        if (!d) continue;
        conditions.append(svgNode("path", { d, fill: "none", stroke: kind === "constructive" ? "#c7770b" : "#168b8a", "stroke-width": level.central ? "2.5" : "1.5", "stroke-dasharray": kind === "destructive" ? "5 4" : "none", opacity: ".9", "data-condition": `${kind}-${level.m}` }));
      }
    }
    const sources = layer("sources"); sources.replaceChildren();
    for (const point of Object.values(sourcePositions(params.separation))) {
      const p = project(point);
      sources.append(svgNode("circle", { cx: String(p.x), cy: String(p.y), r: "6", fill: "#29394c", stroke: "white", "stroke-width": "2" }));
    }
    const waves = layer("wavefronts"); waves.replaceChildren();
    if (query<HTMLInputElement>('[data-control="wavefronts"]')?.checked) {
      const pair = sourcePositions(params.separation);
      for (const [index, point] of [pair.source1, pair.source2].entries()) {
        const center = project(point);
        for (const trough of [false, true]) for (const radius of wavefrontRadii(params.wavelength, index ? params.phase2 : params.phase1, 5, trough, timeCycle * Math.PI * 2)) {
          waves.append(svgNode("circle", { cx: String(center.x), cy: String(center.y), r: String(radius * 75), fill: "none", stroke: "#516277", "stroke-width": "1", "stroke-dasharray": trough ? "3 3" : "none", opacity: ".5" }));
        }
      }
    }
    renderPoint();
  };
  const renderPoint = () => {
    const measurement = layer("measurement"); measurement.replaceChildren();
    const values = query<HTMLElement>("[data-point-values]");
    const empty = query<HTMLElement>("[data-point-empty]");
    const clear = query<HTMLButtonElement>('[data-action="clear-point"]');
    if (!selectedPoint) { if (values) values.hidden = true; if (empty) empty.hidden = false; if (clear) clear.hidden = true; return; }
    if (values) values.hidden = false; if (empty) empty.hidden = true; if (clear) clear.hidden = false;
    const p = project(selectedPoint);
    const { source1, source2 } = sourcePositions(params.separation);
    const s1 = project(source1), s2 = project(source2);
    for (const [source, color] of [[s1, "#b15c25"], [s2, "#376f9d"]] as const) measurement.append(svgNode("line", { x1: String(source.x), y1: String(source.y), x2: String(p.x), y2: String(p.y), stroke: color, "stroke-width": "1.5", "stroke-dasharray": "4 4", opacity: ".75" }));
    measurement.append(svgNode("circle", { cx: String(p.x), cy: String(p.y), r: "8", fill: "#f4c542", stroke: "#29394c", "stroke-width": "2", "data-selected-point": "" }));
    const sample = sampleSelectedPoint(selectedPoint, params, true);
    text('[data-readout="r1"]', format(sample.r1)); text('[data-readout="r2"]', format(sample.r2));
    text('[data-readout="path"]', format(sample.pathDifference)); text('[data-readout="pathRatio"]', format(sample.pathDifferenceRatio));
    text('[data-readout="phase-difference"]', `${format(((sample.phaseDifference * 180 / Math.PI) % 360 + 360) % 360, 1)}°`);
    text('[data-readout="amplitude"]', format(sample.amplitude));
    text('[data-readout="displacement"]', format(instantaneousDisplacement(sample, timeCycle * Math.PI * 2)));
    text("[data-point-position]", `P (${format(selectedPoint.x)}, ${format(selectedPoint.y)})`);
  };

  const renderField = () => {
    if (disposed) return;
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
    const rect = svg.getBoundingClientRect(); const p = pointFromEvent(event);
    const px = ((p.x+4)/8)*rect.width, py=((4-p.y)/8)*rect.height;
    const existing = selectedPoint ? { x: ((selectedPoint.x+4)/8)*rect.width, y: ((4-selectedPoint.y)/8)*rect.height } : null;
    if (!existing || Math.hypot(px-existing.x,py-existing.y)>18) selectedPoint=p;
    dragging=true;
    try { plot.setPointerCapture(event.pointerId); capturedPointers.add(event.pointerId); } catch { /* pointer may have been cancelled */ }
    renderPoint();
  };
  const onPointerMove = (event: PointerEvent) => { if (!dragging || disposed) return; selectedPoint=pointFromEvent(event); renderPoint(); };
  const endDrag = (event: PointerEvent) => { dragging=false; capturedPointers.delete(event.pointerId); try { if (plot.hasPointerCapture(event.pointerId)) plot.releasePointerCapture(event.pointerId); } catch { /* already released */ } };

  try {
    listen(plot,"pointerdown",onPointerDown as EventListener); listen(plot,"pointermove",onPointerMove as EventListener);
    listen(plot,"pointerup",endDrag as EventListener); listen(plot,"pointercancel",endDrag as EventListener);
    const resizeObserver=runtime.createResizeObserver(()=>{ if (!disposed) renderField(); }); resizeObserver.observe(plot); cleanups.push(()=>resizeObserver.disconnect());
    const bindRange=(name:string, fn:(value:number)=>void)=>{ const input=query<HTMLInputElement>(`[data-control="${name}"]`); if (!input) return; listen(input,"input",()=>fn(Number(input.value))); };
    const updateParam=(name:keyof InterferenceParameters, value:number|boolean)=>{ (params as unknown as Record<string,number|boolean>)[name]=value; text(`[data-output="${name}"]`,typeof value==="boolean"?"":name.startsWith("phase")?`${format(Number(value)*180/Math.PI,0)}°`:format(Number(value))); renderField(); };
    bindRange("wavelength",v=>{ params.wavelength=clamp(v,.5,1.5); frequency=waveSpeed/params.wavelength; text('[data-output="wavelength"]',format(params.wavelength)); text('[data-output="frequency"]',format(frequency)); const f=query<HTMLInputElement>('[data-control="frequency"]');if(f)f.value=String(frequency); renderField(); });
    bindRange("separation",v=>{params.separation=v;text('[data-output="separation"]',format(v));renderField();});
    for (const name of ["amplitude1","amplitude2"] as const) bindRange(name,v=>updateParam(name,v));
    for (const name of ["phase1","phase2"] as const) bindRange(name,v=>updateParam(name,v*Math.PI/180));
    bindRange("waveSpeed",v=>{waveSpeed=v;frequency=v/params.wavelength;text('[data-output="waveSpeed"]',format(v));text('[data-output="frequency"]',format(frequency));const f=query<HTMLInputElement>('[data-control="frequency"]');if(f)f.value=String(frequency);});
    bindRange("frequency",v=>{frequency=v;params.wavelength=clamp(waveSpeed/v,.5,1.5);text('[data-output="frequency"]',format(v));text('[data-output="wavelength"]',format(params.wavelength));const w=query<HTMLInputElement>('[data-control="wavelength"]');if(w)w.value=String(params.wavelength);renderField();});
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
    renderField();
  } catch (error) {
    disposed=true; cleanups.splice(0).forEach(cleanup=>cleanup());runtimeElement.remove();throw error;
  }
  return { dispose() { if(disposed)return;disposed=true;playing=false;if(frameId!==null){runtime.cancelAnimationFrame(frameId);frameId=null;}for(const cleanup of cleanups.splice(0).reverse())cleanup();for(const id of capturedPointers){try{if(plot.hasPointerCapture(id))plot.releasePointerCapture(id);}catch{/* browser may release during unmount */}}capturedPointers.clear();runtimeElement.remove(); } };
}
