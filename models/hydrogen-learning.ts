import { HC_EV_NM, seriesLimitWavelength, transition } from "../lib/science/hydrogen.ts";
import { MAX_SHOWN_LEVELS, initialHydrogenState, type HydrogenState } from "./hydrogen.ts";

/**
 * Hydrogen guided exploration (v0.2). One activity, hydrogen-specific: "where does the 486 nm
 * line come from?". This module holds only learning state and decides which evidence may be
 * visible; every number comes from `lib/science/hydrogen.ts`. None of these functions receive or
 * return a `HydrogenState`, so choosing or submitting a guess can never move the electron or fire
 * a transition. Learning state is local to the session and never enters a URL or storage.
 */

/** The Balmer series: its final level is given to the student, its upper level is the question. */
export const TARGET_LOWER = 2;
/** The answer key. Never read by anything that renders before the evidence phase. */
const ANSWER_UPPER = 4;
/** The wavelength the student is told about, as an observed round number (the model gives 486.0 nm). */
export const OBSERVED_NM = 486;
/** A prediction within this many nm of the observed line counts as the same line. */
export const MATCH_TOLERANCE_NM = 1;
/** Candidate upper levels offered to the student. */
export const GUESS_OPTIONS: readonly number[] = [3, 4, 5, 6];

export type GuidedPhase = "observe" | "predict" | "compared" | "evidence";
export type HintLevel = 0 | 1 | 2;

export type HydrogenLearning = {
  readonly phase: GuidedPhase;
  /** The option currently selected, not yet submitted. */
  readonly guess: number | null;
  /** The guess that was last compared with the model; the comparison card describes this one. */
  readonly compared: number | null;
  readonly hint: HintLevel;
  /** How many times a guess has been compared. */
  readonly attempts: number;
};

export function initialLearning(): HydrogenLearning {
  return { phase: "observe", guess: null, compared: null, hint: 0, attempts: 0 };
}

/** The atom the guided mode starts from: the true transition is staged but never rendered before the evidence phase. */
export function guidedPhysicsState(): HydrogenState {
  return { ...initialHydrogenState(), maxN: MAX_SHOWN_LEVELS - 1, upper: ANSWER_UPPER, lower: TARGET_LOWER, mode: "emission", electronLevel: ANSWER_UPPER };
}

export function beginPredicting(state: HydrogenLearning): HydrogenLearning {
  return state.phase === "observe" ? { ...state, phase: "predict" } : state;
}

/** Select an option. Only meaningful while predicting; any other value is ignored. */
export function chooseGuess(state: HydrogenLearning, upper: number): HydrogenLearning {
  if (state.phase !== "predict" || !GUESS_OPTIONS.includes(upper)) return state;
  return { ...state, guess: upper };
}

/** Reveal the next hint layer, at most two. Hints never name the answer. */
export function revealHint(state: HydrogenLearning): HydrogenLearning {
  if (state.phase === "evidence" || state.hint >= 2) return state;
  return { ...state, hint: (state.hint + 1) as HintLevel };
}

/** Compare the selected guess with the model. Needs a selection; does nothing otherwise. */
export function submitGuess(state: HydrogenLearning): HydrogenLearning {
  if (state.phase !== "predict" || state.guess === null) return state;
  return { ...state, phase: "compared", compared: state.guess, attempts: state.attempts + 1 };
}

/** Back to guessing after a comparison. The previous guess is cleared so the next one is a fresh choice. */
export function retryGuess(state: HydrogenLearning): HydrogenLearning {
  return state.phase === "compared" ? { ...state, phase: "predict", guess: null, compared: null } : state;
}

/** Student-chosen: show the energy-level evidence. Available after a comparison, or while predicting once at least one guess was compared. */
export function canShowEvidence(state: HydrogenLearning): boolean {
  return state.phase === "compared" || (state.phase === "predict" && state.attempts > 0);
}

export function showEvidence(state: HydrogenLearning): HydrogenLearning {
  return canShowEvidence(state) ? { ...state, phase: "evidence" } : state;
}

// ---- Model comparison -------------------------------------------------------------------

export type Comparison = {
  readonly upper: number;
  readonly lower: number;
  /** Energy difference of the guessed transition in eV. */
  readonly deltaE: number;
  /** Model wavelength of the guessed transition in nm. */
  readonly wavelength: number;
  readonly observed: number;
  /** Model minus observed, in nm. */
  readonly differenceNm: number;
  readonly correct: boolean;
  readonly verdict: "match" | "too-long" | "too-short";
};

/** What the model says about a guessed upper level, from the science layer. */
export function compareGuess(upper: number): Comparison {
  const t = transition(upper, TARGET_LOWER);
  const differenceNm = t.wavelength - OBSERVED_NM;
  const correct = Math.abs(differenceNm) <= MATCH_TOLERANCE_NM;
  return {
    upper,
    lower: TARGET_LOWER,
    deltaE: t.photonEnergy,
    wavelength: t.wavelength,
    observed: OBSERVED_NM,
    differenceNm,
    correct,
    verdict: correct ? "match" : differenceNm > 0 ? "too-long" : "too-short",
  };
}

/** The photon energy the observed line carries, E = hc/λ. */
export function observedPhotonEnergy(): number {
  return HC_EV_NM / OBSERVED_NM;
}

/** Concrete physical feedback for a comparison, written in terms of the student's own choice. */
export function comparisonFeedback(c: Comparison): string {
  const model = `${c.wavelength.toFixed(1)} nm`;
  if (c.verdict === "match") {
    return `n=${c.upper} → n=${c.lower} 的能量差 ΔE = ${c.deltaE.toFixed(2)} eV，模型波長 ${model}，與觀察的約 ${c.observed} nm 吻合。`;
  }
  if (c.verdict === "too-long") {
    return `你選擇的能階差所對應的波長是 ${model}，比觀察的約 ${c.observed} nm 長 ${c.differenceNm.toFixed(0)} nm，表示 ΔE = ${c.deltaE.toFixed(2)} eV 太小。可以試著找出能量差更大的躍遷。`;
  }
  return `你選擇的能階差所對應的波長是 ${model}，比觀察的約 ${c.observed} nm 短 ${(-c.differenceNm).toFixed(0)} nm，表示 ΔE = ${c.deltaE.toFixed(2)} eV 太大。可以試著找出能量差較小的躍遷。`;
}

/** The true transition, for the evidence phase only. */
export function evidenceTransition() {
  return transition(ANSWER_UPPER, TARGET_LOWER);
}

/** Where the Balmer lines pile up as the upper level grows (n → ∞), for the extension question. */
export function balmerLimitNm(): number {
  return seriesLimitWavelength(TARGET_LOWER);
}

// ---- Evidence visibility policy ----------------------------------------------------------

/**
 * What the guided view may show. Visibility only, never values. `null` learning state means free
 * exploration, where everything is visible. A `false` means the element is not rendered at all, so
 * it cannot leak through the accessibility tree, a tooltip or keyboard focus.
 */
export type EvidencePolicy = {
  /** Spectrum lines can be picked, which would also select a transition. */
  readonly spectrumSelectable: boolean;
  /** Line labels and accessible names may name upper and lower levels and the Hα/Hβ names. */
  readonly levelLabels: boolean;
  /** The ~486 nm line is emphasised. */
  readonly targetEmphasis: boolean;
  /** The student's own predicted wavelength is marked on the spectrum. */
  readonly predictionMarker: boolean;
  readonly comparisonCard: boolean;
  readonly energyView: boolean;
  readonly orbitView: boolean;
  /** Transition readout (ΔE, E = hc/λ) and the fire control. */
  readonly transitionReadout: boolean;
};

export const FREE_POLICY: EvidencePolicy = {
  spectrumSelectable: true, levelLabels: true, targetEmphasis: false, predictionMarker: false,
  comparisonCard: false, energyView: true, orbitView: true, transitionReadout: true,
};

const GUIDED_HIDDEN: EvidencePolicy = {
  spectrumSelectable: false, levelLabels: false, targetEmphasis: true, predictionMarker: false,
  comparisonCard: false, energyView: false, orbitView: false, transitionReadout: false,
};

export function evidencePolicy(state: HydrogenLearning | null): EvidencePolicy {
  if (state === null) return FREE_POLICY;
  switch (state.phase) {
    case "compared":
      return { ...GUIDED_HIDDEN, predictionMarker: true, comparisonCard: true };
    case "evidence":
      return { ...GUIDED_HIDDEN, levelLabels: true, predictionMarker: state.compared !== null, comparisonCard: state.compared !== null, energyView: true, orbitView: true, transitionReadout: true };
    default:
      return GUIDED_HIDDEN;
  }
}

/** The Balmer line names, α for n=3, β for n=4 … Only shown where the policy allows level labels. */
export function balmerLineName(upper: number): string | null {
  const greek = ["α", "β", "γ", "δ", "ε", "ζ"][upper - 3];
  return greek ? `H${greek}` : null;
}
