import type { Ratios } from "../lib/science/doppler.ts";
import { setupWithVelocities, type DopplerReference } from "./doppler.ts";

/**
 * Guided activities for the Doppler lab. Locale-free: this file holds ids, states and rules; the words
 * live with the components, keyed by these ids.
 *
 *  1. "baseline"  — How does the source sound?   predict → measure → explain → complete
 *  2. "whoMoves"  — Who is moving?               predict → measure (S moves) → observer (O moves) →
 *                                                compare → explain → verify (recede) → complete
 */
export type DopplerActivityId = "baseline" | "whoMoves";
export type GuidedPhase = "predict" | "measure" | "observer" | "compare" | "explain" | "verify" | "complete";
/** The physical setup a step runs: the same signed speed 0.2c every time, only *who moves* changes. */
export type GuidedVariant = "rest" | "source" | "observer" | "sourceRecede" | "observerRecede";

export const APPROACH_SPEED = 0.2;

export const VARIANT_VELOCITIES: Record<GuidedVariant, { sourceVelocity: number; observerVelocity: number }> = {
  rest: { sourceVelocity: 0, observerVelocity: 0 },
  source: { sourceVelocity: APPROACH_SPEED, observerVelocity: 0 },
  observer: { sourceVelocity: 0, observerVelocity: -APPROACH_SPEED },
  sourceRecede: { sourceVelocity: -APPROACH_SPEED, observerVelocity: 0 },
  observerRecede: { sourceVelocity: 0, observerVelocity: APPROACH_SPEED },
};

export const variantSetup = (variant: GuidedVariant) =>
  setupWithVelocities(VARIANT_VELOCITIES[variant].sourceVelocity, VARIANT_VELOCITIES[variant].observerVelocity);

export interface DopplerActivity {
  id: DopplerActivityId;
  number: 1 | 2;
  /** Ids of the prediction choices; the wording is localised in the component copy. */
  predictionChoices: readonly string[];
  explanationChoices: readonly string[];
  startVariant: GuidedVariant;
}

export const DOPPLER_ACTIVITIES: readonly DopplerActivity[] = [
  {
    id: "baseline",
    number: 1,
    predictionChoices: ["unchanged", "longerInterval", "denser", "unsure"],
    explanationChoices: ["sameSpeed", "travelTime", "distance"],
    startVariant: "rest",
  },
  {
    id: "whoMoves",
    number: 2,
    predictionChoices: ["sourceHigher", "observerHigher", "same", "unsure"],
    explanationChoices: ["compressedVsClosing", "relativeOnly", "soundSpeed"],
    startVariant: "source",
  },
];

/** A kept pair reading; the numbers come from the event model, never typed in. */
export interface SavedResult {
  variant: GuidedVariant;
  reference: DopplerReference;
}

export interface GuidedSession {
  activityId: DopplerActivityId;
  phase: GuidedPhase;
  variant: GuidedVariant;
  prediction: string | null;
  explanation: string | null;
  hintLevel: number;
  /** Results kept for the comparison card, by the variant that produced them. */
  saved: Partial<Record<GuidedVariant, SavedResult>>;
}

export const activityById = (id: DopplerActivityId) => DOPPLER_ACTIVITIES.find((activity) => activity.id === id) ?? DOPPLER_ACTIVITIES[0];

export function newGuidedSession(activityId: DopplerActivityId): GuidedSession {
  return {
    activityId,
    phase: "predict",
    variant: activityById(activityId).startVariant,
    prediction: null,
    explanation: null,
    hintLevel: 0,
    saved: {},
  };
}

export function submitPrediction(session: GuidedSession, prediction: string): GuidedSession {
  return session.phase === "predict" ? { ...session, prediction, phase: "measure" } : session;
}

/** Keeps the reading of the step's current setup. Refuses an incomplete one. */
export function keepResult(session: GuidedSession, reference: DopplerReference | null): GuidedSession {
  if (!reference) return session;
  return { ...session, saved: { ...session.saved, [session.variant]: { variant: session.variant, reference } } };
}

function nextVariant(session: GuidedSession): GuidedVariant {
  if (session.activityId === "whoMoves" && session.phase === "measure") return "observer";
  return session.variant;
}

/**
 * Moves on from a measuring step. Each step needs its own kept result first: that is what makes the
 * comparison card honest, since a number can only get there by having been observed.
 */
export function advance(session: GuidedSession, reference: DopplerReference | null): GuidedSession {
  const kept = keepResult(session, reference);
  const has = kept.saved[kept.variant] !== undefined;
  if (session.activityId === "baseline") {
    if (session.phase === "measure" && has) return { ...kept, phase: "explain" };
    return session;
  }
  if (session.phase === "measure" && has) return { ...kept, phase: "observer", variant: nextVariant(kept) };
  if (session.phase === "observer" && has) return { ...kept, phase: "compare" };
  if (session.phase === "compare") return { ...session, phase: "explain" };
  return session;
}

export function chooseExplanation(session: GuidedSession, explanation: string): GuidedSession {
  if (session.phase !== "explain") return session;
  return session.activityId === "baseline"
    ? { ...session, explanation, phase: "complete" }
    : { ...session, explanation, phase: "verify", variant: "sourceRecede" };
}

export function switchVerifyVariant(session: GuidedSession, variant: "sourceRecede" | "observerRecede"): GuidedSession {
  return session.phase === "verify" ? { ...session, variant } : session;
}

/** Both receding runs have been kept. */
export const verificationDone = (session: GuidedSession) =>
  session.saved.sourceRecede !== undefined && session.saved.observerRecede !== undefined;

export function finishVerification(session: GuidedSession): GuidedSession {
  return session.phase === "verify" && verificationDone(session) ? { ...session, phase: "complete" } : session;
}

export function revealNextHint(session: GuidedSession, maximum = 3): GuidedSession {
  return { ...session, hintLevel: Math.min(maximum, session.hintLevel + 1) };
}

/** True when this step is waiting for the learner to keep what they just measured. */
export function isMeasuringPhase(session: GuidedSession): boolean {
  if (session.activityId === "baseline") return session.phase === "measure";
  return session.phase === "measure" || session.phase === "observer" || session.phase === "verify";
}

/** The physical setup a session should be running right now. */
export function sessionSetup(session: GuidedSession) {
  return variantSetup(session.variant);
}

/**
 * What the screen may reveal, by learning phase — independent of where a control is drawn. While the
 * prediction is open, nothing numeric, no theory and no model-info text is available, so the answer
 * cannot be read off the page by sighted or assistive-technology users alike.
 */
export function dopplerEvidencePolicy(session: GuidedSession | null) {
  const predicting = session?.phase === "predict";
  const comparing = session !== null && session.activityId === "whoMoves" && ["compare", "explain", "verify", "complete"].includes(session.phase);
  return {
    /** Theory and model notes are one entry: the assumptions, the formulas and what is schematic. */
    theory: !predicting,
    /** Numbers of any kind: pair readout, live frequency, brackets with values. */
    numeric: !predicting,
    /** Highlight of the selected pair and the spacing / interval brackets. */
    guides: !predicting,
    /** The f_obs/f₀ row. Free exploration shows it; the "who moves" task holds it back until the comparison. */
    frequency: session === null || (session.activityId === "whoMoves" && comparing),
    /** Free-exploration reference comparison; guided uses its own comparison card. */
    reference: session === null,
    share: session === null,
    export: session === null,
  };
}

/** A committed prediction that has not reached the summary is progress the learner would lose by leaving. */
export function hasGuidedProgress(session: GuidedSession): boolean {
  return session.prediction !== null && session.phase !== "complete";
}

/** Setup controls belong to free exploration; a guided step owns a known setup. */
export function canUseFreeControls(session: GuidedSession | null): boolean {
  return session === null;
}

/** Prediction is a real gate on the clock, not a visual phase label. */
export function canManipulateTime(session: GuidedSession | null): boolean {
  return session === null || session.phase !== "predict";
}

export type { Ratios };
