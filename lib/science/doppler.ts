/**
 * Doppler effect of sound — wavefront event model.
 *
 * Medium: still, uniform, non-dispersive air. Source S and observer O move on one straight line at
 * constant velocity, both below the speed of sound. Every velocity is signed, measured in the air's
 * frame, positive to the right.
 *
 * Normalised units: c = 1, f₀ = 1 (so T₀ = 1 and λ₀ = c·T₀ = 1). Lengths are in λ₀, times in T₀.
 *
 * Everything here is *event based*, not frame based. Wavefront n is emitted at t_n = n·T₀ from wherever
 * the source is at that instant, and from then on is a circle about that fixed centre with radius
 * c·(t − t_n). The instant O meets it is the root of |x_O(t) − x_n| = c·(t − t_n), solved in closed
 * form. No animation step, collision test or time stepping is involved, so scrubbing, stepping back and
 * comparing all rebuild their state from the same list of events.
 *
 * No DOM, React or Three.js: this file depends on nothing.
 */

/** Bump when the physics, the normalisation or the experiment's termination rule changes. */
export const DOPPLER_MODEL_VERSION = "doppler-wavefront-1";

/** Speed of sound c, in normalised units. */
export const SOUND_SPEED = 1;
/** Emission period T₀ = 1/f₀. */
export const SOURCE_PERIOD = 1;
/** Largest |u|/c a setup may use; keeps 1/(c − u) tame and the two cases comparable. */
export const MAX_SPEED = 0.5;
/** Longest experiment, in T₀. */
export const MAX_DURATION = 16;
/** The experiment ends before S and O come closer than this, in λ₀. */
export const MIN_SEPARATION = 1;
export const MAX_SEPARATION = 20;
const MAX_POSITION = 50;
const EPS = 1e-9;

export type Direction = 1 | -1;
export type EndReason = "time-limit" | "before-coincidence";

export interface DopplerSetup {
  /** x of the source at t = 0, in λ₀. */
  sourceStart: number;
  /** x of the observer at t = 0, in λ₀. */
  observerStart: number;
  /** Signed u_S / c. */
  sourceVelocity: number;
  /** Signed u_O / c. */
  observerVelocity: number;
}

export type SetupErrorCode = "not-finite" | "speed-range" | "separation-range" | "position-range";

export interface SetupError {
  code: SetupErrorCode;
}

export interface Emission {
  n: number;
  t: number;
  /** Where the wavefront's centre stays for ever. */
  x: number;
}

export interface Reception {
  n: number;
  t: number;
  /** Where O is at the moment it meets the front. */
  x: number;
  /** +1: the front arrives travelling right (O is right of its centre); −1: travelling left. */
  direction: Direction;
}

export interface DopplerExperiment {
  setup: DopplerSetup;
  /** Model time at which the experiment ends. */
  duration: number;
  endReason: EndReason;
  /** Emissions n = 0 … N, every one with t_n ≤ duration. */
  emissions: readonly Emission[];
  /** Receptions of emissions 0 … K that arrive within the experiment (a prefix; receptions[n] is front n). */
  receptions: readonly Reception[];
}

export function validateDopplerSetup(setup: DopplerSetup): SetupError | null {
  const values = [setup.sourceStart, setup.observerStart, setup.sourceVelocity, setup.observerVelocity];
  if (!values.every((v) => typeof v === "number" && Number.isFinite(v))) return { code: "not-finite" };
  if (Math.abs(setup.sourceVelocity) > MAX_SPEED + EPS || Math.abs(setup.observerVelocity) > MAX_SPEED + EPS) {
    return { code: "speed-range" };
  }
  if (Math.abs(setup.sourceStart) > MAX_POSITION || Math.abs(setup.observerStart) > MAX_POSITION) {
    return { code: "position-range" };
  }
  const separation = Math.abs(setup.observerStart - setup.sourceStart);
  if (separation < 2 * MIN_SEPARATION - EPS || separation > MAX_SEPARATION + EPS) return { code: "separation-range" };
  return null;
}

export const sourcePosition = (setup: DopplerSetup, t: number) => setup.sourceStart + setup.sourceVelocity * t;
export const observerPosition = (setup: DopplerSetup, t: number) => setup.observerStart + setup.observerVelocity * t;

/** Which side O is on, from S: +1 right, −1 left. Constant for the whole experiment. */
export function observerSide(setup: DopplerSetup): Direction {
  return setup.observerStart >= setup.sourceStart ? 1 : -1;
}

/** Earliest legal meeting of O with the front born at `emission`: the unique root of |x_O(t) − x_n| = c(t − t_n). */
function solveReception(setup: DopplerSetup, emission: Emission): Reception {
  const c = SOUND_SPEED;
  const { observerStart: xo, observerVelocity: uo } = setup;
  // Front travelling right:  x_O(t) − x_n = +c (t − t_n)   →   t (c − u_O) = x_O0 − x_n + c t_n
  const tRight = (xo - emission.x + c * emission.t) / (c - uo);
  // Front travelling left:   x_n − x_O(t) = +c (t − t_n)   →   t (c + u_O) = x_n − x_O0 + c t_n
  const tLeft = (emission.x - xo + c * emission.t) / (c + uo);
  const rightLegal = tRight >= emission.t - EPS && xo + uo * tRight - emission.x >= -EPS;
  const leftLegal = tLeft >= emission.t - EPS && emission.x - (xo + uo * tLeft) >= -EPS;
  if (!rightLegal && !leftLegal) throw new Error("No legal reception for wavefront " + emission.n);
  const useRight = rightLegal && (!leftLegal || tRight <= tLeft);
  const t = Math.max(useRight ? tRight : tLeft, emission.t);
  return { n: emission.n, t, x: observerPosition(setup, t), direction: useRight ? 1 : -1 };
}

/** Builds the one list of events everything else is read from. Throws RangeError on an illegal setup. */
export function createDopplerExperiment(setup: DopplerSetup): DopplerExperiment {
  const error = validateDopplerSetup(setup);
  if (error) throw new RangeError(`Invalid Doppler setup: ${error.code}`);

  const side = observerSide(setup);
  const separation0 = Math.abs(setup.observerStart - setup.sourceStart);
  // Rate at which the gap closes, in λ₀/T₀. Positive means S and O are approaching one another.
  const closing = -side * (setup.observerVelocity - setup.sourceVelocity);
  let duration = MAX_DURATION;
  let endReason: EndReason = "time-limit";
  if (closing > EPS) {
    const tGap = (separation0 - MIN_SEPARATION) / closing;
    if (tGap < MAX_DURATION) {
      duration = tGap;
      endReason = "before-coincidence";
    }
  }

  const emissions: Emission[] = [];
  for (let n = 0; n * SOURCE_PERIOD <= duration + EPS; n += 1) {
    const t = n * SOURCE_PERIOD;
    emissions.push({ n, t, x: sourcePosition(setup, t) });
  }
  const receptions: Reception[] = [];
  for (const emission of emissions) {
    const reception = solveReception(setup, emission);
    if (reception.t > duration + EPS) break;
    receptions.push(reception);
  }
  return { setup: { ...setup }, duration, endReason, emissions, receptions };
}

/* ---------------------------------------------------------------------------------------------
 * Reading the experiment at an instant — pure functions of (experiment, t)
 * ------------------------------------------------------------------------------------------ */

export interface Wavefront {
  n: number;
  centreX: number;
  radius: number;
  emittedAt: number;
}

/** Fronts that exist at time t, each a fixed centre and a radius c(t − t_n). */
export function wavefrontsAt(experiment: DopplerExperiment, t: number): Wavefront[] {
  return experiment.emissions
    .filter((emission) => emission.t <= t + EPS)
    .map((emission) => ({
      n: emission.n,
      centreX: emission.x,
      radius: Math.max(0, SOUND_SPEED * (t - emission.t)),
      emittedAt: emission.t,
    }));
}

export const emissionsUpTo = (experiment: DopplerExperiment, t: number) =>
  experiment.emissions.filter((emission) => emission.t <= t + EPS);

export const receptionsUpTo = (experiment: DopplerExperiment, t: number) =>
  experiment.receptions.filter((reception) => reception.t <= t + EPS);

/** Every instant at which something happens, ascending: emissions, receptions, and the end. */
export function eventTimes(experiment: DopplerExperiment): number[] {
  const times = new Set<number>([0, experiment.duration]);
  for (const emission of experiment.emissions) times.add(emission.t);
  for (const reception of experiment.receptions) times.add(reception.t);
  return [...times].sort((a, b) => a - b);
}

/** The first event strictly after t (the end of the experiment if there is none). */
export function nextEventTime(experiment: DopplerExperiment, t: number): number {
  return eventTimes(experiment).find((time) => time > t + 1e-7) ?? experiment.duration;
}

/** The last event strictly before t (the start if there is none). */
export function previousEventTime(experiment: DopplerExperiment, t: number): number {
  const earlier = eventTimes(experiment).filter((time) => time < t - 1e-7);
  return earlier.length > 0 ? earlier[earlier.length - 1] : 0;
}

export interface LiveFrequency {
  /** The later front of the two most recent receptions. */
  n: number;
  interval: number;
  frequency: number;
}

/** 1/(t_{R,n+1} − t_{R,n}) from the two latest receptions so far; null until two valid receptions exist. */
export function latestReceptionFrequency(experiment: DopplerExperiment, t: number): LiveFrequency | null {
  const received = receptionsUpTo(experiment, t);
  if (received.length < 2) return null;
  const [previous, latest] = received.slice(-2);
  const interval = latest.t - previous.t;
  return { n: latest.n, interval, frequency: 1 / interval };
}

/** Highest n for which fronts n and n+1 are both received inside the experiment; null if no pair is. */
export function lastReceivedPair(experiment: DopplerExperiment): number | null {
  return experiment.receptions.length >= 2 ? experiment.receptions.length - 2 : null;
}

export interface PairMeasurement {
  /** The pair is fronts n and n + 1. */
  n: number;
  /** t_{n+1} − t_n. */
  emissionInterval: number;
  /** Side of S on which O sits: the spacing is measured along that half of the line. */
  direction: Direction;
  /** Distance between the two fronts along the line, on O's side of the source, in λ₀. Exists from t_{n+1}. */
  spacing: number;
  /** Time the second front is born: the spacing can be read from here on. */
  spacingFrom: number;
  /** Present only when both fronts reach O inside the experiment. */
  reception: {
    firstAt: number;
    secondAt: number;
    interval: number;
    frequency: number;
    /** Both fronts have been received: the reading is available from here on. */
    availableFrom: number;
  } | null;
}

/** Measures a pair of adjacent fronts from the event list alone. Null if front n + 1 was never emitted. */
export function measurePair(experiment: DopplerExperiment, n: number): PairMeasurement | null {
  const first = experiment.emissions[n];
  const second = experiment.emissions[n + 1];
  if (!first || !second) return null;
  const direction = experiment.receptions[n + 1]?.direction ?? observerSide(experiment.setup);
  // Along O's half of the line, front n sits at x_n + s·c·(t − t_n) and front n+1 at x_{n+1} + s·c·(t − t_{n+1}).
  // Read at t = t_{n+1} so no later instant is involved.
  const frontFirst = first.x + direction * SOUND_SPEED * (second.t - first.t);
  const spacing = direction * (frontFirst - second.x);
  const r1 = experiment.receptions[n];
  const r2 = experiment.receptions[n + 1];
  const interval = r1 && r2 ? r2.t - r1.t : null;
  return {
    n,
    emissionInterval: second.t - first.t,
    direction,
    spacing,
    spacingFrom: second.t,
    reception: r1 && r2 && interval !== null
      ? { firstAt: r1.t, secondAt: r2.t, interval, frequency: 1 / interval, availableFrom: r2.t }
      : null,
  };
}

export interface Ratios {
  /** λ/λ₀ — spacing of the fronts on O's side. */
  wavelength: number;
  /** Δt/T₀ — interval between receptions. */
  period: number;
  /** f_obs/f₀. */
  frequency: number;
}

/** Normalised ratios of a measured pair. */
export function pairRatios(pair: PairMeasurement): Ratios | null {
  if (!pair.reception) return null;
  return {
    wavelength: pair.spacing / (SOUND_SPEED * SOURCE_PERIOD),
    period: pair.reception.interval / SOURCE_PERIOD,
    frequency: pair.reception.frequency * SOURCE_PERIOD,
  };
}

/**
 * Closed-form answer for the collinear single-branch case, kept deliberately separate from the event
 * model so one can check the other:  λ_S = (c − s·u_S)·T₀,  f_obs = f₀ (c − s·u_O)/(c − s·u_S).
 */
export function dopplerAnalytic(sourceVelocity: number, observerVelocity: number, direction: Direction): Ratios {
  const c = SOUND_SPEED;
  const wavelength = (c - direction * sourceVelocity) / c;
  const frequency = (c - direction * observerVelocity) / (c - direction * sourceVelocity);
  return { wavelength, period: 1 / frequency, frequency };
}
