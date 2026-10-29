import type { PhaseConditionLevel, Point } from "../lib/science/interference.ts";
import { PHYSICS_TOLERANCE } from "../lib/science/interference.ts";

export interface PlotBounds { xMin: number; xMax: number; yMin: number; yMax: number }
export type ConditionGeometry = { type: "central" | "ray"; points: [Point, Point] } | { type: "hyperbola"; points: Point[] };

/** Analytic condition-line geometry from the Front model; no pixel contour extraction. */
export const geometryForCondition = (level: PhaseConditionLevel, separation: number, bounds: PlotBounds, sampleCount = 180): ConditionGeometry => {
  const difference = level.signedPathDifference;
  if (Math.abs(difference) <= PHYSICS_TOLERANCE) return { type: "central", points: [{ x: 0, y: bounds.yMin }, { x: 0, y: bounds.yMax }] };
  if (level.degenerate) return difference > 0
    ? { type: "ray", points: [{ x: bounds.xMin, y: 0 }, { x: -separation / 2, y: 0 }] }
    : { type: "ray", points: [{ x: separation / 2, y: 0 }, { x: bounds.xMax, y: 0 }] };
  const a = Math.abs(difference) / 2;
  const bSquared = (separation / 2) ** 2 - a ** 2;
  if (bSquared <= 0) throw new RangeError("condition lies outside the physical path-difference bound");
  const b = Math.sqrt(bSquared);
  const branch = difference > 0 ? -1 : 1;
  const points: Point[] = [];
  for (let i = 0; i <= sampleCount; i += 1) {
    const y = bounds.yMin + ((bounds.yMax - bounds.yMin) * i) / sampleCount;
    const x = branch * a * Math.sqrt(1 + (y * y) / (b * b));
    if (x >= bounds.xMin && x <= bounds.xMax) points.push({ x, y });
  }
  return { type: "hyperbola", points };
};

export const svgPathForPoints = (points: Point[], project: (point: Point) => Point) => points.map((point, index) => {
  const p = project(point);
  return `${index === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`;
}).join(" ");
