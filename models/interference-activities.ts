import { phaseConditionLevels, textbookLineCounts, type InterferenceParameters } from "../lib/science/interference.ts";

export type LineCountHint = "none" | "central" | "nodes-no-central" | "outer-rays" | "reveal";
export const checkLineCountAnswer = (answer: { antinodes: number; nodes: number }, separation: number, wavelength: number, attempt: number) => {
  const expected = textbookLineCounts(separation, wavelength);
  const antinodesCorrect = answer.antinodes === expected.antinodes;
  const nodesCorrect = answer.nodes === expected.nodes;
  const correct = antinodesCorrect && nodesCorrect;
  const hint: LineCountHint = correct ? "none" : attempt >= 3 ? "reveal" : attempt === 2 ? "outer-rays" : !antinodesCorrect ? "central" : "nodes-no-central";
  return { correct, antinodesCorrect, nodesCorrect, hint, expected };
};
export type OuterOrderShape = "absent" | "degenerate" | "hyperbola";
export const constructiveOrderShape = (parameters: Pick<InterferenceParameters, "wavelength" | "separation" | "phase1" | "phase2">, order: number): OuterOrderShape => {
  const level = phaseConditionLevels(parameters, "constructive").find((candidate) => candidate.m === order);
  return !level ? "absent" : level.degenerate ? "degenerate" : "hyperbola";
};
export const centralConditionKind = (parameters: Pick<InterferenceParameters, "wavelength" | "separation" | "phase1" | "phase2">) => {
  if (phaseConditionLevels(parameters, "constructive").some((level) => level.central)) return "constructive";
  if (phaseConditionLevels(parameters, "destructive").some((level) => level.central)) return "destructive";
  return "neither";
};
