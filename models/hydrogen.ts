import {
  MAX_LEVEL,
  MIN_LEVEL,
  angularMomentum,
  levelEnergy,
  orbitRadius,
  orbitSpeed,
  relativeAngularVelocity,
  seriesLimitWavelength,
  seriesLines,
  seriesName,
  transition,
  type Direction,
  type Transition,
} from "../lib/science/hydrogen.ts";

/** Seconds a photon takes to cross the diagram. Not physical: real transitions are instantaneous on this scale. */
export const PHOTON_FLIGHT_SECONDS = 1.4;
/** Visual orbital period of the ground state in seconds; the n-th orbit is slower by n³ (ω ∝ 1/n³). */
export const GROUND_STATE_VISUAL_PERIOD = 2.4;
/** Fewest and most levels the diagrams can show. */
export const MIN_SHOWN_LEVELS = 3;
export const MAX_SHOWN_LEVELS = MAX_LEVEL;

export type HydrogenState = {
  /** Highest level drawn in both diagrams. */
  maxN: number;
  /** The selected transition; `upper` > `lower` always. */
  upper: number;
  lower: number;
  mode: Direction;
  /** The level the electron occupies right now. */
  electronLevel: number;
  /** Photon in flight, 0 → 1, or null when none is. */
  photonProgress: number | null;
  /** Orbital angle of the electron in radians; purely visual. */
  orbitAngle: number;
  playing: boolean;
};

export const HYDROGEN_PRESETS: Record<string, { label: string; upper: number; lower: number }> = {
  lymanAlpha: { label: "Lyman α（2→1）", upper: 2, lower: 1 },
  halpha: { label: "Balmer Hα（3→2）", upper: 3, lower: 2 },
  hbeta: { label: "Balmer Hβ（4→2）", upper: 4, lower: 2 },
  paschenAlpha: { label: "Paschen α（4→3）", upper: 4, lower: 3 },
};

/** The level the electron must occupy before the selected transition can fire. */
export function startLevel(upper: number, lower: number, mode: Direction): number {
  return mode === "emission" ? upper : lower;
}

export function initialHydrogenState(): HydrogenState {
  return {
    maxN: 5,
    upper: 3,
    lower: 2,
    mode: "emission",
    electronLevel: 3,
    photonProgress: null,
    orbitAngle: 0,
    playing: true,
  };
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/**
 * Choose which transition to look at. This is a *view* operation: it never moves the electron, so
 * a student can inspect any pair of levels without the model inventing the energy to get there.
 * Input is repaired, never thrown. A preset above the shown range widens the diagrams to fit it
 * rather than being quietly turned into a different transition. A photon already in flight belonged
 * to the previous selection and is dropped.
 */
export function selectTransition(state: HydrogenState, upper: number, lower: number, mode: Direction = state.mode): HydrogenState {
  const nextUpper = clampInt(upper, MIN_LEVEL + 1, MAX_SHOWN_LEVELS);
  const nextLower = clampInt(lower, MIN_LEVEL, nextUpper - 1);
  return {
    ...state,
    upper: nextUpper,
    lower: nextLower,
    mode,
    maxN: Math.max(state.maxN, nextUpper),
    photonProgress: null,
  };
}

/** The fewest levels the diagrams may show without hiding the selected transition or the electron. */
export function minimumShownLevels(state: Pick<HydrogenState, "upper" | "electronLevel">): number {
  return Math.max(MIN_SHOWN_LEVELS, state.upper, state.electronLevel);
}

/** Change how many levels are shown. It cannot go below what the selection and electron occupy; it is raised to that floor instead of moving either. */
export function setMaxLevel(state: HydrogenState, maxN: number): HydrogenState {
  return { ...state, maxN: clampInt(maxN, minimumShownLevels(state), MAX_SHOWN_LEVELS) };
}

/** Put the electron on a shown level — setting the atom's initial condition, as a student would by dragging it up the ladder. */
export function placeElectron(state: HydrogenState, level: number): HydrogenState {
  return { ...state, electronLevel: clampInt(level, MIN_LEVEL, state.maxN), photonProgress: null };
}

export type FireBlock =
  | { reason: "in-flight" }
  | { reason: "electron-not-at-start"; requiredLevel: number };

/**
 * Why the selected transition cannot happen right now, or null if it can. Emission needs the
 * electron already on the upper level; absorption needs it on the lower level. The model does not
 * say where the missing energy came from — it only refuses to emit from a level the electron is not on.
 */
export function fireBlock(state: HydrogenState): FireBlock | null {
  if (state.photonProgress !== null) return { reason: "in-flight" };
  const requiredLevel = startLevel(state.upper, state.lower, state.mode);
  return state.electronLevel === requiredLevel ? null : { reason: "electron-not-at-start", requiredLevel };
}

/**
 * Fire the selected transition. An emitting electron drops immediately and the photon leaves; an
 * absorbing electron stays put until the photon arrives (see `advanceHydrogen`). When `fireBlock`
 * reports a reason, the state is returned unchanged.
 */
export function fireTransition(state: HydrogenState): HydrogenState {
  if (fireBlock(state)) return state;
  if (state.mode === "emission") return { ...state, electronLevel: state.lower, photonProgress: 0 };
  return { ...state, photonProgress: 0 };
}

/**
 * Advance time by `dt` seconds. The electron's angle moves at ω ∝ 1/n³ while playing; a photon in
 * flight advances regardless of `playing` only if playing, so pausing freezes the whole scene.
 * An absorbed photon lifts the electron to the upper level at the instant it arrives.
 */
export function advanceHydrogen(state: HydrogenState, dt: number): HydrogenState {
  if (!state.playing || !Number.isFinite(dt) || dt <= 0) return state;
  const spin = (2 * Math.PI * dt * relativeAngularVelocity(state.electronLevel)) / GROUND_STATE_VISUAL_PERIOD;
  const orbitAngle = (state.orbitAngle + spin) % (2 * Math.PI);
  if (state.photonProgress === null) return { ...state, orbitAngle };

  const progress = state.photonProgress + dt / PHOTON_FLIGHT_SECONDS;
  if (progress < 1) return { ...state, orbitAngle, photonProgress: progress };
  const arrived = state.mode === "absorption" ? state.upper : state.electronLevel;
  return { ...state, orbitAngle, photonProgress: null, electronLevel: arrived };
}

export type HydrogenReadout = ReturnType<typeof deriveHydrogenModel>;

export function deriveHydrogenModel(state: HydrogenState) {
  const levels = Array.from({ length: state.maxN }, (_, i) => {
    const n = i + 1;
    return { n, energy: levelEnergy(n), radius: orbitRadius(n) };
  });
  const selected: Transition = transition(state.upper, state.lower);
  const electron = {
    n: state.electronLevel,
    energy: levelEnergy(state.electronLevel),
    radius: orbitRadius(state.electronLevel),
    speed: orbitSpeed(state.electronLevel),
    angularMomentum: angularMomentum(state.electronLevel),
  };
  const series = seriesLines(state.lower, state.maxN);
  return {
    levels,
    selected,
    electron,
    series,
    seriesName: seriesName(state.lower),
    seriesLimit: seriesLimitWavelength(state.lower),
    /** Whether the electron is at the level the selected transition starts from. */
    ready: state.electronLevel === startLevel(state.upper, state.lower, state.mode),
    /** Why the transition cannot fire now, or null. */
    blocked: fireBlock(state),
    startLevel: startLevel(state.upper, state.lower, state.mode),
    inFlight: state.photonProgress !== null,
  };
}
