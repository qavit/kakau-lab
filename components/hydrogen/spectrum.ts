/** Wavelength-axis geometry for the hydrogen spectrum strip. No React: the axis maths is tested on its own. */

export const VISIBLE_MIN_NM = 380;
export const VISIBLE_MAX_NM = 750;

export type SpectrumRangeMode = "auto" | "visible";
export type SpectrumWindow = { min: number; max: number };

/**
 * The wavelength span the strip should show. `visible` is the fixed 380–750 nm band. `auto` fits
 * the series' lines and its limit with a little margin, so Lyman (ultraviolet) and Paschen
 * (infrared) are visible as lines instead of vanishing off a visible-only axis.
 */
export function spectrumWindow(mode: SpectrumRangeMode, wavelengths: readonly number[]): SpectrumWindow {
  const finite = wavelengths.filter((w) => Number.isFinite(w) && w > 0);
  if (mode === "visible" || finite.length === 0) return { min: VISIBLE_MIN_NM, max: VISIBLE_MAX_NM };
  const lo = Math.min(...finite);
  const hi = Math.max(...finite);
  const pad = Math.max((hi - lo) * 0.08, hi * 0.02);
  return { min: Math.max(0, lo - pad), max: hi + pad };
}

/** Round tick positions inside [min, max], at a 1/2/5 × 10ᵏ step giving roughly `target` ticks. */
export function niceTicks(min: number, max: number, target = 5): number[] {
  if (!(max > min)) return [];
  const rough = (max - min) / target;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? 10 * magnitude;
  const ticks: number[] = [];
  for (let t = Math.ceil(min / step) * step; t <= max + step * 1e-9; t += step) ticks.push(Math.round(t / step) * step);
  return ticks;
}

/** The part of the visible band inside the window, as wavelengths, or null when they do not overlap. */
export function visibleOverlap(window: SpectrumWindow): SpectrumWindow | null {
  const min = Math.max(window.min, VISIBLE_MIN_NM);
  const max = Math.min(window.max, VISIBLE_MAX_NM);
  return max > min ? { min, max } : null;
}

/**
 * Which lines get a printed value: left to right, a label is kept only if it sits at least
 * `minGap` axis units from the last kept one. Dropping a label is preferred to overlapping two.
 */
export function labelledLines(positions: readonly number[], minGap: number): boolean[] {
  const order = positions.map((x, i) => ({ x, i })).sort((a, b) => a.x - b.x);
  const keep = new Array<boolean>(positions.length).fill(false);
  let last = -Infinity;
  for (const { x, i } of order) {
    if (x - last >= minGap) {
      keep[i] = true;
      last = x;
    }
  }
  return keep;
}
