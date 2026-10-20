/**
 * Consumer adapter between Lab's FBD model and Graphite.
 *
 * Lab owns all physics semantics. Graphite only ever sees plain geometry:
 *   FbdLabState --fbdToDiagramSpec--> DiagramSpec --renderToSVG--> SVG
 *   Graphite DiagramEditIntent --applyGraphiteIntentToFbd--> updateFbdForce(direction)
 * SVG is never parsed back into FBD state.
 */
import { applyDiagramEditIntent, type DiagramEditIntent, type DiagramSpec, type Point } from "@kakau-tw/diagram-spec";
import { normalize } from "../../lib/science/fbd.ts";
import { updateFbdForce, type FbdLabState } from "../../models/fbd.ts";

/** Particle anchor in diagram coordinates. All force tails share it. */
export const FBD_ANCHOR: Point = { x: 180, y: 140 };
export const FBD_DEFAULT_LENGTH = 65;
const ALL_MODES = ["teacher", "student", "minimal"] as const;

export type FbdDisplayLengths = Readonly<Record<string, number>>;

function tipOf(direction: { x: number; y: number }, length: number): Point {
  // Physics y is up; SVG y is down.
  return { x: FBD_ANCHOR.x + direction.x * length, y: FBD_ANCHOR.y - direction.y * length };
}

export function fbdToDiagramSpec(state: FbdLabState, lengths: FbdDisplayLengths = {}): DiagramSpec {
  const visibility = [...ALL_MODES];
  const elements: DiagramSpec["elements"] = [];
  for (const force of state.diagram.forces) {
    const length = lengths[force.id] ?? FBD_DEFAULT_LENGTH;
    const end = tipOf(force.direction, length);
    elements.push({
      id: force.id,
      type: "force-vector",
      visibility,
      start: { ...FBD_ANCHOR },
      end,
      forceName: force.label,
      showMagnitude: false,
      // Graphite arrowheads scale with stroke width (markerUnits=strokeWidth), so keep it modest.
      style: { strokeWidth: 2 },
    });
    elements.push({
      id: `${force.id}-label`,
      type: "label",
      visibility,
      // Keep a downward force name beside its arrowhead instead of on the shaft.
      position: force.direction.y < -0.5 ? { x: end.x + 12, y: end.y + 4 } : { x: end.x + 8, y: end.y - 10 },
      text: force.label,
      fontSize: 12,
    });
  }
  elements.push({ id: "particle", type: "circle", visibility, center: { ...FBD_ANCHOR }, radius: 7, style: { fill: "currentColor", strokeWidth: 0 } });
  elements.push({ id: "particle-label", type: "label", visibility, position: { x: FBD_ANCHOR.x - 14, y: FBD_ANCHOR.y - 12 }, text: state.diagram.system.label, fontSize: 14, anchor: "end" });
  return {
    metadata: { version: "0.1", title: "FBD", locale: "zh-TW", createdAt: "", updatedAt: "" },
    canvas: { width: 360, height: 280, viewBox: [0, 0, 360, 280] },
    view: { mode: "teacher", theme: "exam-bw" },
    elements,
  };
}

/**
 * Tip drag changes direction only. The anchor, the display length, magnitudeN, the force id and
 * the interaction link are untouched. A degenerate drag (tip on the anchor, or non-finite) is a no-op.
 */
export function applyGraphiteIntentToFbd(
  state: FbdLabState,
  intent: DiagramEditIntent,
  lengths: FbdDisplayLengths = {},
): FbdLabState {
  if (!state.diagram.forces.some((force) => force.id === intent.elementId)) return state;
  const base = fbdToDiagramSpec(state, lengths);
  const edited = applyDiagramEditIntent(base, intent);
  if (edited === base) return state; // Graphite rejected the intent (e.g. non-finite point)
  const element = edited.elements.find((el) => el.id === intent.elementId);
  if (!element || element.type !== "force-vector") return state;
  const direction = normalize({ x: element.end.x - FBD_ANCHOR.x, y: FBD_ANCHOR.y - element.end.y });
  if (!direction) return state;
  return updateFbdForce(state, intent.elementId, { direction });
}
