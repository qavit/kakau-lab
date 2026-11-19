import {
  MAX_SPEED,
  createDopplerExperiment,
  lastReceivedPair,
  measurePair,
  pairRatios,
  type DopplerExperiment,
  type DopplerSetup,
  type PairMeasurement,
  type Ratios,
} from "../lib/science/doppler.ts";

/** Imports `lib/science` only: state, presets and what a reading is allowed to say at a given time. */

/** S and O start symmetrically about x = 0, 6 λ₀ apart, O on the right. */
export const DEFAULT_POSITIONS = { sourceStart: -3, observerStart: 3 } as const;
/** x extent every experiment is drawn in, so two setups always share one scale. */
export const X_DOMAIN = { min: -12, max: 12 } as const;
export const SPEED_STEP = 0.05;
export { MAX_SPEED };

export type DopplerPresetId =
  | "rest"
  | "sourceApproach"
  | "observerApproach"
  | "sourceRecede"
  | "observerRecede"
  | "sameDirection";

export const DOPPLER_PRESET_ORDER: readonly DopplerPresetId[] = [
  "rest",
  "sourceApproach",
  "observerApproach",
  "sourceRecede",
  "observerRecede",
  "sameDirection",
];

/** u/c, signed, positive to the right; O sits to the right of S, so "approach" = S rightwards or O leftwards. */
export const DOPPLER_PRESETS: Record<DopplerPresetId, { sourceVelocity: number; observerVelocity: number }> = {
  rest: { sourceVelocity: 0, observerVelocity: 0 },
  sourceApproach: { sourceVelocity: 0.2, observerVelocity: 0 },
  observerApproach: { sourceVelocity: 0, observerVelocity: -0.2 },
  sourceRecede: { sourceVelocity: -0.2, observerVelocity: 0 },
  observerRecede: { sourceVelocity: 0, observerVelocity: 0.2 },
  sameDirection: { sourceVelocity: 0.2, observerVelocity: 0.2 },
};

export function setupWithVelocities(sourceVelocity: number, observerVelocity: number): DopplerSetup {
  return { ...DEFAULT_POSITIONS, sourceVelocity, observerVelocity };
}

export const presetSetup = (id: DopplerPresetId): DopplerSetup =>
  setupWithVelocities(DOPPLER_PRESETS[id].sourceVelocity, DOPPLER_PRESETS[id].observerVelocity);

/** The preset a setup matches exactly, or null once the learner has moved a slider off every one. */
export function matchingPreset(setup: DopplerSetup): DopplerPresetId | null {
  if (setup.sourceStart !== DEFAULT_POSITIONS.sourceStart || setup.observerStart !== DEFAULT_POSITIONS.observerStart) return null;
  return (
    DOPPLER_PRESET_ORDER.find(
      (id) =>
        Math.abs(DOPPLER_PRESETS[id].sourceVelocity - setup.sourceVelocity) < 1e-9 &&
        Math.abs(DOPPLER_PRESETS[id].observerVelocity - setup.observerVelocity) < 1e-9,
    ) ?? null
  );
}

/** Presentation settings that are part of reproducing a figure, kept apart from the physics. */
export interface DopplerView {
  /** The selected pair is fronts `pair` and `pair + 1`. */
  pair: number;
  /** Lines joining each front's emission to its reception on the time band. */
  connectors: boolean;
  /** Numbers on fronts and events. */
  labels: boolean;
}

export const DEFAULT_VIEW: DopplerView = { pair: 2, connectors: true, labels: true };

export function initialSetup(): DopplerSetup {
  return presetSetup("rest");
}

/** Snaps a requested speed onto the slider grid and the legal range. */
export function snapVelocity(value: number): number {
  const clamped = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, value));
  const snapped = Math.round(clamped / SPEED_STEP) * SPEED_STEP;
  return Math.abs(snapped) < 1e-9 ? 0 : Number(snapped.toFixed(2));
}

/** The pair must keep both of its receptions inside the experiment, or it could never be read. */
export function clampPair(experiment: DopplerExperiment, pair: number): number {
  const last = lastReceivedPair(experiment);
  return Math.max(0, Math.min(Number.isInteger(pair) ? pair : DEFAULT_VIEW.pair, last ?? 0));
}

export function deriveDoppler(setup: DopplerSetup) {
  return createDopplerExperiment(setup);
}

/**
 * What a pair reading may show at model time t. Each number appears only once the events it is made
 * from have happened: the emission interval and the spacing need the second front to exist, and the
 * reception interval needs both fronts to have reached O. Nothing here peeks at the future.
 */
export interface PairReadout {
  n: number;
  /** ΔT/T₀ between the two emissions. */
  emissionInterval: number | null;
  /** λ/λ₀ along O's side of the source. */
  wavelength: number | null;
  /** Δt/T₀ between the two receptions; null while waiting for the adjacent receptions. */
  period: number | null;
  /** f_obs/f₀. */
  frequency: number | null;
  /** True once both receptions are in. */
  complete: boolean;
}

export function pairReadoutAt(experiment: DopplerExperiment, n: number, t: number, measurement?: PairMeasurement | null): PairReadout {
  const pair = measurement === undefined ? measurePair(experiment, n) : measurement;
  const eps = 1e-9;
  if (!pair) return { n, emissionInterval: null, wavelength: null, period: null, frequency: null, complete: false };
  const born = t + eps >= pair.spacingFrom;
  const received = pair.reception !== null && t + eps >= pair.reception.availableFrom;
  const ratios = received ? pairRatios(pair) : null;
  return {
    n,
    emissionInterval: born ? pair.emissionInterval : null,
    wavelength: born ? pair.spacing : null,
    period: ratios ? ratios.period : null,
    frequency: ratios ? ratios.frequency : null,
    complete: received,
  };
}

/** One kept result, so a later setup can be read against it on the same scale. */
export interface DopplerReference {
  sourceVelocity: number;
  observerVelocity: number;
  pair: number;
  ratios: Ratios;
}

/** Keeps a reading only once it is complete; a half-observed pair is not a result. */
export function makeReference(setup: DopplerSetup, readout: PairReadout): DopplerReference | null {
  if (!readout.complete || readout.wavelength === null || readout.period === null || readout.frequency === null) return null;
  return {
    sourceVelocity: setup.sourceVelocity,
    observerVelocity: setup.observerVelocity,
    pair: readout.n,
    ratios: { wavelength: readout.wavelength, period: readout.period, frequency: readout.frequency },
  };
}

export const MODEL_ASSUMPTIONS = [
  "still, uniform, non-dispersive air",
  "S and O on one line, constant velocity, each below the speed of sound (|u| ≤ 0.5c here)",
  "normalised units c = 1, f₀ = 1",
] as const;
