/**
 * Bohr model of the hydrogen atom, in closed form.
 *
 * The nucleus is treated as infinitely heavy, so every number uses the Rydberg constant R∞ and
 * the Bohr radius a₀. Hydrogen's finite proton mass would shrink the Rydberg constant by a factor
 * 1 / (1 + mₑ/mₚ) ≈ 0.99946, moving the Hα line from 656.11 nm to 656.47 nm (vacuum); that
 * correction is deliberately left out so the numbers match the textbook derivation.
 *
 * Energies are in eV, lengths of orbits in picometres, wavelengths in nanometres.
 */

/** Rydberg energy h·c·R∞, the ground-state binding energy, in eV. */
export const RYDBERG_ENERGY_EV = 13.605693122994;
/** Bohr radius a₀ in pm. */
export const BOHR_RADIUS_PM = 52.9177210903;
/** h·c in eV·nm, so that λ(nm) = HC_EV_NM / E(eV). */
export const HC_EV_NM = 1239.84198433;
/** Planck constant in eV·s, for converting photon energy to frequency. */
export const PLANCK_EV_S = 4.135667696e-15;
/** Fine-structure constant α; the Bohr speed of the n-th orbit is α·c / n. */
export const FINE_STRUCTURE = 7.2973525693e-3;
/** Speed of light in m/s. */
export const SPEED_OF_LIGHT = 299792458;

/** Smallest and largest principal quantum number the model offers. */
export const MIN_LEVEL = 1;
export const MAX_LEVEL = 7;

export type Region = "ultraviolet" | "visible" | "infrared";
export type Direction = "emission" | "absorption";

export function isLevel(n: number): boolean {
  return Number.isInteger(n) && n >= MIN_LEVEL && n <= MAX_LEVEL;
}

function assertLevel(n: number): void {
  if (!isLevel(n)) throw new RangeError(`principal quantum number must be an integer in [${MIN_LEVEL}, ${MAX_LEVEL}], got ${n}`);
}

/** Energy of level n in eV: Eₙ = −13.6 eV / n². Zero at n → ∞ (the ionisation threshold). */
export function levelEnergy(n: number): number {
  assertLevel(n);
  return -RYDBERG_ENERGY_EV / (n * n);
}

/** Radius of the n-th Bohr orbit in pm: rₙ = n² a₀. */
export function orbitRadius(n: number): number {
  assertLevel(n);
  return n * n * BOHR_RADIUS_PM;
}

/** Orbital speed in m/s: vₙ = α c / n. */
export function orbitSpeed(n: number): number {
  assertLevel(n);
  return (FINE_STRUCTURE * SPEED_OF_LIGHT) / n;
}

/** Angular velocity relative to the ground state, ωₙ / ω₁ = 1 / n³ (vₙ / rₙ). */
export function relativeAngularVelocity(n: number): number {
  assertLevel(n);
  return 1 / (n * n * n);
}

/** Orbital angular momentum in units of ħ: L = n ħ. */
export function angularMomentum(n: number): number {
  assertLevel(n);
  return n;
}

export function regionOf(wavelengthNm: number): Region {
  if (wavelengthNm < 380) return "ultraviolet";
  if (wavelengthNm <= 750) return "visible";
  return "infrared";
}

export type Transition = {
  upper: number;
  lower: number;
  /** Photon energy, always positive, in eV: E_upper − E_lower. */
  photonEnergy: number;
  /** Vacuum wavelength in nm. */
  wavelength: number;
  /** Photon frequency in Hz. */
  frequency: number;
  region: Region;
  /** Series named after the lower level, e.g. 2 → "Balmer". Undefined beyond Humphreys (6). */
  series: string | undefined;
};

const SERIES_NAMES: Record<number, string> = {
  1: "Lyman",
  2: "Balmer",
  3: "Paschen",
  4: "Brackett",
  5: "Pfund",
  6: "Humphreys",
};

export function seriesName(lower: number): string | undefined {
  return SERIES_NAMES[lower];
}

/** The photon exchanged when the electron moves between `upper` and `lower`; `upper` must be the higher level. */
export function transition(upper: number, lower: number): Transition {
  assertLevel(upper);
  assertLevel(lower);
  if (upper <= lower) throw new RangeError(`upper level (${upper}) must be greater than lower level (${lower})`);
  const photonEnergy = levelEnergy(upper) - levelEnergy(lower);
  const wavelength = HC_EV_NM / photonEnergy;
  return {
    upper,
    lower,
    photonEnergy,
    wavelength,
    frequency: photonEnergy / PLANCK_EV_S,
    region: regionOf(wavelength),
    series: seriesName(lower),
  };
}

/** Every line of the series ending on `lower`, from lower+1 up to `maxN`. */
export function seriesLines(lower: number, maxN: number): Transition[] {
  assertLevel(lower);
  assertLevel(maxN);
  const lines: Transition[] = [];
  for (let upper = lower + 1; upper <= maxN; upper += 1) lines.push(transition(upper, lower));
  return lines;
}

/** The series limit (n → ∞) wavelength in nm: the shortest line of the series, and the ionisation threshold from `lower`. */
export function seriesLimitWavelength(lower: number): number {
  assertLevel(lower);
  return HC_EV_NM / (RYDBERG_ENERGY_EV / (lower * lower));
}

/** Rydberg formula 1/λ = R∞ (1/lower² − 1/upper²), in m⁻¹ — an independent route to the same wavelength. */
export const RYDBERG_CONSTANT_PER_M = 1.0973731568160e7;
export function rydbergWavelength(upper: number, lower: number): number {
  assertLevel(upper);
  assertLevel(lower);
  if (upper <= lower) throw new RangeError(`upper level (${upper}) must be greater than lower level (${lower})`);
  const inverse = RYDBERG_CONSTANT_PER_M * (1 / (lower * lower) - 1 / (upper * upper));
  return (1 / inverse) * 1e9;
}

/**
 * Approximate display colour for a visible wavelength (380–750 nm), as 0–255 RGB. Returns
 * undefined outside the visible band, where there is no colour to show. This is a rendering
 * aid, not colorimetry.
 */
export function visibleRgb(wavelengthNm: number): [number, number, number] | undefined {
  const w = wavelengthNm;
  if (!Number.isFinite(w) || w < 380 || w > 750) return undefined;
  let r = 0;
  let g = 0;
  let b = 0;
  if (w < 440) {
    r = (440 - w) / 60;
    b = 1;
  } else if (w < 490) {
    g = (w - 440) / 50;
    b = 1;
  } else if (w < 510) {
    g = 1;
    b = (510 - w) / 20;
  } else if (w < 580) {
    r = (w - 510) / 70;
    g = 1;
  } else if (w < 645) {
    r = 1;
    g = (645 - w) / 65;
  } else {
    r = 1;
  }
  // Intensity rolls off toward both ends of the visible band.
  const fade = w < 420 ? 0.3 + (0.7 * (w - 380)) / 40 : w > 700 ? 0.3 + (0.7 * (750 - w)) / 50 : 1;
  const channel = (v: number) => Math.round(255 * Math.pow(v * fade, 0.8));
  return [channel(r), channel(g), channel(b)];
}
