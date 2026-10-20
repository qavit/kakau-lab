"use client";

import { useEffect, useMemo, useRef } from "react";
import { renderToSVG } from "@kakau-tw/render-svg";
import type { DiagramEditIntent } from "@kakau-tw/diagram-spec";
import type { FbdDiagram } from "../../models/fbd.ts";
import { fbdToDiagramSpec, type FbdDisplayLengths } from "./graphiteAdapter.ts";
import styles from "./FbdLab.module.css";

type Props = Readonly<{
  diagram: FbdDiagram;
  lengths: FbdDisplayLengths;
  selectedForceId: string | null;
  editable: boolean;
  ariaLabel: string;
  onSelectForce: (forceId: string) => void;
  onIntent: (intent: DiagramEditIntent) => void;
}>;

const NS = "http://www.w3.org/2000/svg";

/** Renders FBD through Graphite and turns pointer gestures into neutral edit intents. */
export default function GraphiteFbdCanvas({ diagram, lengths, selectedForceId, editable, ariaLabel, onSelectForce, onIntent }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const spec = useMemo(() => fbdToDiagramSpec({ diagram, selectedForceId }, lengths), [diagram, selectedForceId, lengths]);
  const markup = useMemo(() => renderToSVG(spec), [spec]);
  const forceIds = useMemo(() => new Set(diagram.forces.map((force) => force.id)), [diagram.forces]);

  // Presentation-only decoration of the live DOM: hit lines, selection class, tip handle.
  useEffect(() => {
    const root = rootRef.current;
    const svg = root?.querySelector("svg");
    if (!root || !svg) return;
    root.querySelectorAll(".fbd-hit, .fbd-handle").forEach((node) => node.remove());
    root.querySelectorAll(".fbd-selected").forEach((node) => node.classList.remove("fbd-selected"));
    root.querySelectorAll("line[data-element-type='force-vector']").forEach((line) => {
      const id = line.getAttribute("data-element-id");
      if (id === selectedForceId) line.classList.add("fbd-selected");
      if (!editable) return;
      const hit = line.cloneNode(false) as SVGLineElement;
      hit.removeAttribute("id");
      hit.removeAttribute("marker-end");
      hit.setAttribute("class", "fbd-hit");
      hit.setAttribute("stroke", "transparent");
      hit.setAttribute("stroke-width", "16");
      hit.setAttribute("stroke-dasharray", "");
      hit.setAttribute("pointer-events", "stroke");
      line.after(hit);
    });
    const selected = spec.elements.find((el) => el.id === selectedForceId);
    if (editable && selected?.type === "force-vector") {
      const handle = document.createElementNS(NS, "circle");
      handle.setAttribute("class", "fbd-handle");
      handle.setAttribute("data-fbd-handle", "tip");
      handle.setAttribute("data-element-id", selected.id);
      handle.setAttribute("cx", String(selected.end.x));
      handle.setAttribute("cy", String(selected.end.y));
      handle.setAttribute("r", "8");
      handle.setAttribute("role", "button");
      handle.setAttribute("aria-label", `拖曳箭頭方向：${selected.forceName}`);
      svg.appendChild(handle);
    }
  }, [markup, spec, selectedForceId, editable]);

  const toSpecPoint = (clientX: number, clientY: number) => {
    const svg = rootRef.current?.querySelector("svg");
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const local = point.matrixTransform(ctm.inverse());
    return Number.isFinite(local.x) && Number.isFinite(local.y) ? { x: local.x, y: local.y } : null;
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!editable || event.button !== 0) return;
    const target = (event.target as Element).closest?.("[data-element-id]");
    const id = target?.getAttribute("data-element-id");
    if (!id || !forceIds.has(id)) return;
    if (target?.hasAttribute("data-fbd-handle") && id === selectedForceId) {
      event.preventDefault();
      const move = (ev: PointerEvent) => {
        const point = toSpecPoint(ev.clientX, ev.clientY);
        if (point) onIntent({ type: "element/endpoint", elementId: id, endpoint: "end", point });
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
      return;
    }
    onSelectForce(id);
  };

  return <div ref={rootRef} role="group" aria-label={ariaLabel} className={styles.graphiteFbd} onPointerDown={onPointerDown} dangerouslySetInnerHTML={{ __html: markup }} />;
}
