import { DOPPLER_MODEL_VERSION, validateDopplerSetup, type DopplerSetup } from "../lib/science/doppler.ts";
import { DEFAULT_VIEW, DOPPLER_PRESETS, initialSetup, type DopplerPresetId, type DopplerView } from "./doppler.ts";

/**
 * Share format v1: a *starting setup*, not a running state. It carries the model and format version,
 * the initial positions and velocities and the presentation settings needed to redraw the same figure;
 * it never carries playback time, guided-activity answers or anything about the learner. A link always
 * opens paused at t = 0.
 */
export const DOPPLER_SHARE_FORMAT = 1;
export type DopplerShareInput = string | readonly string[] | undefined;
export type DopplerShareError = "unreadable" | "format-version" | "model-version";

export interface DopplerShare {
  setup: DopplerSetup;
  view: DopplerView;
  preset: DopplerPresetId | null;
  error: DopplerShareError | null;
}

const MAX_LENGTH = 2000;
const MAX_PAIR = 60;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const isPreset = (value: unknown): value is DopplerPresetId => typeof value === "string" && Object.hasOwn(DOPPLER_PRESETS, value);

export function defaultShare(error: DopplerShareError | null = null): DopplerShare {
  return { setup: initialSetup(), view: { ...DEFAULT_VIEW }, preset: "rest", error };
}

export function decodeDopplerShare(encoded: DopplerShareInput): DopplerShare {
  if (encoded === undefined) return defaultShare();
  if (typeof encoded !== "string" || encoded.length > MAX_LENGTH) return defaultShare("unreadable");
  let data: unknown;
  try {
    data = JSON.parse(encoded);
  } catch {
    return defaultShare("unreadable");
  }
  if (!isRecord(data) || typeof data.v !== "number") return defaultShare("unreadable");
  if (data.v !== DOPPLER_SHARE_FORMAT) return defaultShare("format-version");
  if (data.model !== DOPPLER_MODEL_VERSION) return defaultShare("model-version");
  if (data.mode !== "free" || !isRecord(data.setup) || !isRecord(data.view)) return defaultShare("unreadable");
  const { xs, xo, us, uo } = data.setup;
  const setup: DopplerSetup = { sourceStart: xs as number, observerStart: xo as number, sourceVelocity: us as number, observerVelocity: uo as number };
  if (validateDopplerSetup(setup)) return defaultShare("unreadable");
  const { pair, connectors, labels } = data.view;
  if (typeof pair !== "number" || !Number.isInteger(pair) || pair < 0 || pair > MAX_PAIR) return defaultShare("unreadable");
  if (typeof connectors !== "boolean" || typeof labels !== "boolean") return defaultShare("unreadable");
  return { setup, view: { pair, connectors, labels }, preset: isPreset(data.preset) ? data.preset : null, error: null };
}

export function encodeDopplerShare(setup: DopplerSetup, view: DopplerView, preset: DopplerPresetId | null = null): string {
  const encoded = JSON.stringify({
    v: DOPPLER_SHARE_FORMAT,
    model: DOPPLER_MODEL_VERSION,
    mode: "free",
    preset,
    setup: { xs: setup.sourceStart, xo: setup.observerStart, us: setup.sourceVelocity, uo: setup.observerVelocity },
    view: { pair: view.pair, connectors: view.connectors, labels: view.labels },
  });
  if (decodeDopplerShare(encoded).error) throw new Error("This setup cannot be shared.");
  return encoded;
}
