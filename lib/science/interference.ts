export const TWO_PI = 2 * Math.PI;
export const PHYSICS_TOLERANCE = 1e-9;

export interface Point {
  x: number;
  y: number;
}

export interface SourcePair {
  source1: Point;
  source2: Point;
}

export interface InterferenceParameters {
  wavelength: number;
  separation: number;
  amplitude1: number;
  amplitude2: number;
  phase1: number;
  phase2: number;
  attenuation: boolean;
}

export interface FieldSample {
  real: number;
  imaginary: number;
  amplitude: number;
  intensity: number;
  phase: number;
}

export interface SelectedPointSample extends FieldSample {
  point: Point;
  r1: number;
  r2: number;
  pathDifference: number;
  absolutePathDifference: number;
  pathDifferenceRatio: number;
  phaseDifference: number;
  classification: "constructive" | "destructive" | "neither";
}

export type ConditionKind = "constructive" | "destructive";

export interface PhaseConditionLevel {
  id: string;
  kind: ConditionKind;
  m: number;
  signedPathDifference: number;
  absolutePathDifference: number;
  order: number;
  degenerate: boolean;
  central: boolean;
}

const assertPositive = (value: number, name: string) => {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${name} must be positive`);
};

export const sourcePositions = (separation: number): SourcePair => {
  assertPositive(separation, "separation");
  return {
    source1: { x: -separation / 2, y: 0 },
    source2: { x: separation / 2, y: 0 },
  };
};

export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export const distancesToSources = (point: Point, separation: number) => {
  const { source1, source2 } = sourcePositions(separation);
  return { r1: distance(point, source1), r2: distance(point, source2) };
};

/** Signed convention used everywhere in the lab: Δr = r₂ - r₁. */
export const pathDifferenceAtPoint = (point: Point, separation: number) => {
  const { r1, r2 } = distancesToSources(point, separation);
  return r2 - r1;
};

export const phaseDifferenceAtPoint = (
  point: Point,
  parameters: Pick<InterferenceParameters, "wavelength" | "separation" | "phase1" | "phase2">,
) => {
  assertPositive(parameters.wavelength, "wavelength");
  return (
    (TWO_PI / parameters.wavelength) * pathDifferenceAtPoint(point, parameters.separation)
    + parameters.phase2
    - parameters.phase1
  );
};

export const sourceEnvelope = (
  radius: number,
  amplitude: number,
  wavelength: number,
  attenuation: boolean,
) => {
  if (!attenuation) return amplitude;
  const coreRadius = Math.max(0.08 * wavelength, 0.02);
  return amplitude / Math.sqrt(Math.max(radius, coreRadius));
};

export const fieldAtPoint = (point: Point, parameters: InterferenceParameters): FieldSample => {
  assertPositive(parameters.wavelength, "wavelength");
  const { r1, r2 } = distancesToSources(point, parameters.separation);
  const waveNumber = TWO_PI / parameters.wavelength;
  const a1 = sourceEnvelope(r1, parameters.amplitude1, parameters.wavelength, parameters.attenuation);
  const a2 = sourceEnvelope(r2, parameters.amplitude2, parameters.wavelength, parameters.attenuation);
  const theta1 = waveNumber * r1 + parameters.phase1;
  const theta2 = waveNumber * r2 + parameters.phase2;
  const real = a1 * Math.cos(theta1) + a2 * Math.cos(theta2);
  const imaginary = a1 * Math.sin(theta1) + a2 * Math.sin(theta2);
  const amplitude = Math.hypot(real, imaginary);
  return {
    real,
    imaginary,
    amplitude,
    intensity: amplitude * amplitude,
    phase: Math.atan2(imaginary, real),
  };
};

/**
 * ψ(t) = Re[C·e^(-iτ)] where C = real + i·imaginary and τ is the normalized
 * time phase (τ = ωt). The spatial phasor C is time-independent; only this
 * projection changes with τ.
 */
export const instantaneousDisplacement = (
  field: Pick<FieldSample, "real" | "imaginary">,
  timePhase: number,
) => field.real * Math.cos(timePhase) + field.imaginary * Math.sin(timePhase);

const nearInteger = (value: number, tolerance: number) =>
  Math.abs(value - Math.round(value)) <= tolerance;

const nearHalfInteger = (value: number, tolerance: number) =>
  Math.abs(value - (Math.floor(value) + 0.5)) <= tolerance;

export const classifyTextbookPoint = (
  absolutePathDifference: number,
  wavelength: number,
  tolerance = 0.025,
): SelectedPointSample["classification"] => {
  assertPositive(wavelength, "wavelength");
  const ratio = absolutePathDifference / wavelength;
  if (nearInteger(ratio, tolerance)) return "constructive";
  if (nearHalfInteger(ratio, tolerance)) return "destructive";
  return "neither";
};

export const sampleSelectedPoint = (
  point: Point,
  parameters: InterferenceParameters,
  textbookMode: boolean,
): SelectedPointSample => {
  const { r1, r2 } = distancesToSources(point, parameters.separation);
  const pathDifference = r2 - r1;
  const absolutePathDifference = Math.abs(pathDifference);
  const field = fieldAtPoint(point, parameters);
  return {
    ...field,
    point,
    r1,
    r2,
    pathDifference,
    absolutePathDifference,
    pathDifferenceRatio: pathDifference / parameters.wavelength,
    phaseDifference: phaseDifferenceAtPoint(point, parameters),
    classification: textbookMode
      ? classifyTextbookPoint(absolutePathDifference, parameters.wavelength)
      : "neither",
  };
};

export const phaseConditionPathDifference = (
  m: number,
  wavelength: number,
  sourcePhaseDifference: number,
  kind: ConditionKind,
) => {
  const offset = kind === "destructive" ? 0.5 : 0;
  return (m + offset - sourcePhaseDifference / TWO_PI) * wavelength;
};

export const isDegenerateLevel = (
  signedPathDifference: number,
  separation: number,
  tolerance = PHYSICS_TOLERANCE,
) => Math.abs(Math.abs(signedPathDifference) - separation) <= tolerance;

export const phaseConditionLevels = (
  parameters: Pick<InterferenceParameters, "wavelength" | "separation" | "phase1" | "phase2">,
  kind: ConditionKind,
): PhaseConditionLevel[] => {
  const offset = kind === "destructive" ? 0.5 : 0;
  const shift = (parameters.phase2 - parameters.phase1) / TWO_PI;
  const minM = Math.ceil(-parameters.separation / parameters.wavelength - offset + shift - PHYSICS_TOLERANCE);
  const maxM = Math.floor(parameters.separation / parameters.wavelength - offset + shift + PHYSICS_TOLERANCE);
  const levels: PhaseConditionLevel[] = [];
  for (let m = minM; m <= maxM; m += 1) {
    const signedPathDifference = phaseConditionPathDifference(
      m,
      parameters.wavelength,
      parameters.phase2 - parameters.phase1,
      kind,
    );
    levels.push({
      id: `${kind}-${m}`,
      kind,
      m,
      signedPathDifference,
      absolutePathDifference: Math.abs(signedPathDifference),
      order: Math.abs(signedPathDifference) / parameters.wavelength,
      degenerate: isDegenerateLevel(signedPathDifference, parameters.separation),
      central: Math.abs(signedPathDifference) <= PHYSICS_TOLERANCE,
    });
  }
  return levels;
};

const floorWithTolerance = (value: number) => Math.floor(value + PHYSICS_TOLERANCE);

export const textbookLineCounts = (separation: number, wavelength: number) => {
  assertPositive(separation, "separation");
  assertPositive(wavelength, "wavelength");
  const ratio = separation / wavelength;
  return {
    antinodes: 2 * floorWithTolerance(ratio) + 1,
    nodes: 2 * floorWithTolerance(ratio + 0.5),
  };
};

/**
 * Crest/trough radii for a single source at normalized time phase τ.
 * Convention: cos(kr + φ - τ) is a crest at kr+φ-τ = 2πn, so
 * r_crest = (n + τ/2π - φ/2π)λ. Passing timePhase = 0 reproduces the
 * static Stage 2 wavefront.
 */
export const wavefrontRadii = (
  wavelength: number,
  phase: number,
  maximumRadius: number,
  trough = false,
  timePhase = 0,
) => {
  assertPositive(wavelength, "wavelength");
  const offset = trough ? 0.5 : 0;
  const phaseShift = (phase - timePhase) / TWO_PI;
  const minN = Math.ceil(phaseShift - offset);
  const maxN = Math.floor(maximumRadius / wavelength + phaseShift - offset);
  const radii: number[] = [];
  for (let n = minN; n <= maxN; n += 1) {
    const radius = (n + offset - phaseShift) * wavelength;
    if (radius > PHYSICS_TOLERANCE) radii.push(radius);
  }
  return radii;
};
