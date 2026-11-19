/**
 * Data colours for the two Doppler views. They sit on the dark science surface in both UI themes, and
 * colour is never the only code: S is a diamond, O a square, the selected pair is the thick line.
 */
export const DOPPLER_COLORS = {
  front: "#8db4cc",
  pair: "#5ed8c3",
  source: "#f2a65a",
  observer: "#7fd1ff",
  label: "#b9d3df",
  axis: "#4f7894",
  grid: "#1f4560",
  ink: "#eaf4f8",
  ended: "#0a1f30",
} as const;
