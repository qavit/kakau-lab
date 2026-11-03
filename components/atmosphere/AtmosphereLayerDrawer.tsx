"use client";

import { useEffect, useRef, type RefObject } from "react";
import { Layers3, X } from "lucide-react";
import { QUANTITY_META, type AxisScale, type StandardAtmosphereState } from "@/models/standardAtmosphere";
import type { PhysicalQuantity } from "@/lib/science/standardAtmosphere";
import type { AtmosphereProfileCopy } from "@/lib/i18n";

type Props = {
  open: boolean;
  state: StandardAtmosphereState;
  onClose: () => void;
  onPatch: (patch: Partial<StandardAtmosphereState>) => void;
  copy: AtmosphereProfileCopy;
  /** The header trigger; focus returns here when the drawer closes. */
  returnFocusRef?: RefObject<HTMLElement | null>;
};

const QUANTITIES: PhysicalQuantity[] = ["temperature", "pressure", "density"];

export default function AtmosphereLayerDrawer({ open, state, onClose, onPatch, copy, returnFocusRef }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);
  // Same contract as the shared LabLayerDrawer: focus moves in on open and back to the trigger on close.
  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      closeRef.current?.focus();
      return;
    }
    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      returnFocusRef?.current?.focus();
    }
  }, [open, returnFocusRef]);

  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [open, onClose]);

  const check = (key: "showLayerLabels" | "showBoundaries" | "showOzoneLayer" | "showTooltip", label: string) => (
    <label><input type="checkbox" checked={state[key]} onChange={() => onPatch({ [key]: !state[key] })} />{label}</label>
  );
  const setScale = (quantity: PhysicalQuantity, scale: AxisScale) => {
    onPatch({ scaleByQuantity: { ...state.scaleByQuantity, [quantity]: scale } });
  };

  return (
    <aside id="atmosphere-layer-drawer" className={`layer-drawer ${open ? "open" : ""}`} aria-hidden={!open} aria-label={copy.drawer.title} role="dialog" inert={!open}>
      <header>
        <div><Layers3 size={18} /><strong>{copy.drawer.title}</strong></div>
        <button ref={closeRef} type="button" onClick={onClose} aria-label={copy.drawer.close}><X size={17} /></button>
      </header>
      <div className="drawer-scroll">
        <details open><summary>{copy.drawer.layers}</summary><div className="layer-list">
          {check("showLayerLabels", copy.drawer.layerLabels)}
          {check("showBoundaries", copy.drawer.boundaries)}
          {check("showOzoneLayer", copy.drawer.ozone)}
        </div></details>

        <details open><summary>{copy.drawer.cursor}</summary><div className="layer-list">
          {check("showTooltip", copy.drawer.tooltip)}
        </div></details>

        <details open><summary>{copy.drawer.axes}</summary><div className="layer-list quantity-scale-list">
          {QUANTITIES.map((quantity) => (
            <div className="coordinate-row" key={quantity}>
              <strong style={{ borderLeftColor: QUANTITY_META[quantity].color }}>{copy.quantities[quantity]}</strong>
              <label className={state.scaleByQuantity[quantity] === "linear" ? "selected-inline" : ""}>
                <input
                  type="radio"
                  name={`scale-${quantity}`}
                  checked={state.scaleByQuantity[quantity] === "linear"}
                  onChange={() => setScale(quantity, "linear")}
                />
                {copy.drawer.linear}
              </label>
              <label className={state.scaleByQuantity[quantity] === "log" ? "selected-inline" : ""}>
                <input
                  type="radio"
                  name={`scale-${quantity}`}
                  checked={state.scaleByQuantity[quantity] === "log"}
                  onChange={() => setScale(quantity, "log")}
                />
                {copy.drawer.logarithmic}
              </label>
            </div>
          ))}
        </div></details>
      </div>
    </aside>
  );
}
