"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { BookOpen, Check, ChevronDown, ChevronLeft, ChevronRight, CircleCheck, Copy, Expand, FileBraces, FileImage, Info, Lock, Maximize2, Minimize2, Pause, Play, RotateCcw, Share2, SkipBack, SkipForward, StepBack, StepForward, TriangleAlert, X } from "lucide-react";
import KakauLabMark from "@/components/KakauLabMark";
import ThemeToggle from "@/components/ThemeToggle";
import LabInfoDialog from "@/components/overlays/LabInfoDialog";
import GuidedActivities from "@/components/doppler/GuidedActivities";
import Rich from "@/components/doppler/Rich";
import TheoryNotes from "@/components/doppler/TheoryNotes";
import { MathProvider } from "@/components/math/MathJax";
import TimeBand from "@/components/doppler/TimeBand";
import WavefrontView from "@/components/doppler/WavefrontView";
import { dopplerCopy } from "@/components/doppler/copy";
import { DOPPLER_COLORS as C } from "@/components/doppler/palette";
import { useElementSize } from "@/components/doppler/useElementSize";
import { localizedPath, type Locale } from "@/lib/i18n";
import {
  createDopplerExperiment,
  dopplerAnalytic,
  latestReceptionFrequency,
  measurePair,
  nextEventTime,
  observerSide,
  previousEventTime,
  receptionsUpTo,
  emissionsUpTo,
  type DopplerExperiment,
  type DopplerSetup,
} from "@/lib/science/doppler";
import {
  DEFAULT_VIEW,
  DOPPLER_PRESET_ORDER,
  MAX_SPEED,
  SPEED_STEP,
  clampPair,
  makeReference,
  matchingPreset,
  pairReadoutAt,
  presetSetup,
  snapVelocity,
  type DopplerPresetId,
  type DopplerReference,
  type DopplerView,
} from "@/models/doppler";
import { decodeDopplerShare, encodeDopplerShare, type DopplerShareInput } from "@/models/doppler-serialization";
import { dopplerResult, dopplerResultSvg } from "@/models/doppler-export";
import {
  advance,
  canManipulateTime,
  canUseFreeControls,
  chooseExplanation,
  dopplerEvidencePolicy,
  finishVerification,
  hasGuidedProgress,
  keepResult,
  newGuidedSession,
  sessionSetup,
  switchVerifyVariant,
  submitPrediction,
  type DopplerActivityId,
  type GuidedSession,
} from "@/models/doppler-learning";

type Expanded = "wave" | "band" | null;
type Snapshot = { setup: DopplerSetup; view: DopplerView; preset: DopplerPresetId | null; time: number; reference: DopplerReference | null };

const RATES = [0.25, 0.5, 1, 2, 4] as const;
const f2 = (v: number | null | undefined) => (v === null || v === undefined || !Number.isFinite(v) ? "—" : v.toFixed(2));
const signedC = (u: number) => (u === 0 ? "0" : `${u > 0 ? "+" : "−"}${Math.abs(u).toFixed(2)}c`);

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

/** A header button that opens a short list of choices. */
function Menu({ label, ariaLabel, up = false, children }: { label: string; ariaLabel?: string; up?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  return (
    <div className="doppler-menu" ref={ref}>
      <button ref={trigger} className={open ? "active" : ""} onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="true" aria-label={ariaLabel}>
        {label} <ChevronDown size={13} />
      </button>
      {open && <div className="doppler-menu-list" data-up={up} role="group" aria-label={ariaLabel ?? label} onClick={() => { setOpen(false); trigger.current?.focus(); }}>{children}</div>}
    </div>
  );
}

function download(contents: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function DopplerLab({ share, locale = "zh-TW" }: { share?: DopplerShareInput; locale?: Locale }) {
  const copy = dopplerCopy[locale];
  const other: Locale = locale === "en" ? "zh-TW" : "en";
  const initial = useMemo(() => decodeDopplerShare(share), [share]);
  const [setup, setSetup] = useState<DopplerSetup>(initial.setup);
  const [view, setView] = useState<DopplerView>(initial.view);
  const [preset, setPreset] = useState<DopplerPresetId | null>(initial.preset);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState<number>(1);
  const [reference, setReference] = useState<DopplerReference | null>(null);
  const [guided, setGuided] = useState<GuidedSession | null>(null);
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const [expanded, setExpanded] = useState<Expanded>(null);
  const [expandNotice, setExpandNotice] = useState<string | null>(null);
  const [theoryOpen, setTheoryOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [noticeState, setNoticeState] = useState<{ text: string; tone: "ok" | "warn" } | null>(initial.error ? { text: copy.status.shareErrors[initial.error], tone: "warn" } : null);
  const notice = noticeState?.text ?? null;
  const setNotice = useCallback((text: string | null, tone: "ok" | "warn" = "ok") => setNoticeState(text === null ? null : { text, tone }), []);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const shareInput = useRef<HTMLInputElement>(null);
  const snapshot = useRef<Snapshot | null>(null);
  const shellRef = useRef<HTMLElement>(null);
  const waveHost = useRef<HTMLDivElement>(null);
  const bandHost = useRef<HTMLDivElement>(null);
  const expandedRef = useRef<Expanded>(null);
  const exitRef = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();
  const waveSize = useElementSize(waveHost);
  const bandSize = useElementSize(bandHost);

  useEffect(() => { shellRef.current?.setAttribute("data-interactive", "true"); }, []);

  const experiment: DopplerExperiment = useMemo(() => createDopplerExperiment(setup), [setup]);
  const pair = clampPair(experiment, view.pair);
  const evidence = dopplerEvidencePolicy(guided);
  const timeAllowed = canManipulateTime(guided);
  const freeControls = canUseFreeControls(guided);
  const readout = useMemo(() => pairReadoutAt(experiment, pair, time), [experiment, pair, time]);
  const live = useMemo(() => latestReceptionFrequency(experiment, time), [experiment, time]);
  const emittedCount = emissionsUpTo(experiment, time).length;
  const receivedCount = receptionsUpTo(experiment, time).length;
  const atEnd = time >= experiment.duration - 1e-9;
  const measurement = useMemo(() => measurePair(experiment, pair), [experiment, pair]);
  const reception = measurement?.reception ?? null;

  /* ---- playback: one clock, outside the model, so the physics never depends on frame rate ---- */
  const timeRef = useRef(0);
  useEffect(() => { timeRef.current = time; }, [time]);
  useEffect(() => {
    if (!playing) return;
    const finish = (next: number) => { timeRef.current = next; setTime(next); if (next >= experiment.duration - 1e-9) setPlaying(false); };
    if (reduced) {
      const id = window.setInterval(() => finish(nextEventTime(experiment, timeRef.current)), 700 / rate);
      return () => window.clearInterval(id);
    }
    let frame = 0;
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const next = Math.min(experiment.duration, timeRef.current + dt * rate);
      finish(next);
      if (next < experiment.duration - 1e-9) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, rate, reduced, experiment]);

  const goTo = useCallback((t: number) => {
    if (!timeAllowed) return;
    setPlaying(false);
    setTime(Math.min(experiment.duration, Math.max(0, t)));
  }, [experiment.duration, timeAllowed]);

  const togglePlay = () => {
    if (!timeAllowed) return;
    if (!playing && atEnd) setTime(0);
    setPlaying((p) => !p);
  };

  const playToReception = useCallback(() => {
    if (!timeAllowed || !reception) return;
    setPlaying(false);
    setTime(Math.max(time, reception.availableFrom));
  }, [reception, time, timeAllowed]);

  /** Any change to the physical starting setup regenerates the experiment from t = 0, paused. */
  const applySetup = useCallback((next: DopplerSetup) => {
    setSetup(next);
    setPreset(matchingPreset(next));
    setTime(0);
    setPlaying(false);
  }, []);

  const setSpeeds = (patch: Partial<Pick<DopplerSetup, "sourceVelocity" | "observerVelocity">>) => {
    if (!freeControls) return;
    applySetup({ ...setup, ...patch });
  };

  const selectPair = useCallback((n: number) => setView((v) => ({ ...v, pair: Math.max(0, n) })), []);

  /* ---- guided ---- */
  const startGuided = useCallback((activityId: DopplerActivityId) => {
    if (!snapshot.current) snapshot.current = { setup, view, preset, time, reference };
    const session = newGuidedSession(activityId);
    setGuided(session);
    setSetup(sessionSetup(session));
    setPreset(null);
    setView({ ...DEFAULT_VIEW });
    setTime(0);
    setPlaying(false);
    setExpanded(null);
    setNotice(null);
    setShareUrl(null);
    setLeaveConfirm(false);
  }, [setup, view, preset, time, reference, setNotice]);

  const closeGuided = useCallback(() => {
    const saved = snapshot.current;
    if (saved) {
      setSetup(saved.setup); setView(saved.view); setPreset(saved.preset); setTime(saved.time); setReference(saved.reference);
      snapshot.current = null;
    }
    setPlaying(false);
    setGuided(null);
    setLeaveConfirm(false);
  }, []);

  const requestLeaveGuided = useCallback(() => {
    if (guided && hasGuidedProgress(guided)) setLeaveConfirm(true);
    else closeGuided();
  }, [closeGuided, guided]);

  /** Moves a session to a (possibly new) setup: a new step always starts at t = 0, paused. */
  const enterSession = useCallback((next: GuidedSession) => {
    const nextSetup = sessionSetup(next);
    setGuided(next);
    if (nextSetup.sourceVelocity !== setup.sourceVelocity || nextSetup.observerVelocity !== setup.observerVelocity) {
      setSetup(nextSetup);
      setTime(0);
      setPlaying(false);
    }
  }, [setup.sourceVelocity, setup.observerVelocity]);

  const currentReference = () => makeReference(setup, readout);

  /* ---- tools ---- */
  const exportResult = (format: "svg" | "json") => {
    try {
      const result = dopplerResult(setup, { ...view, pair }, Math.min(time, experiment.duration), reference, guided, preset);
      if (format === "svg") download(dopplerResultSvg(result), "kakau-doppler.svg", "image/svg+xml;charset=utf-8");
      else download(JSON.stringify(result, null, 2), "kakau-doppler.json", "application/json;charset=utf-8");
      setNotice(copy.status.exported);
    } catch {
      setNotice(copy.status.exportFailed, "warn");
    }
  };

  const shareHref = (target: Locale) => {
    try { return `${localizedPath(target, "/doppler")}?s=${encodeURIComponent(encodeDopplerShare(setup, { ...view, pair }, preset))}`; }
    catch { return localizedPath(target, "/doppler"); }
  };

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      shareInput.current?.focus();
      shareInput.current?.select();
    }
  };

  const shareSetup = async () => {
    setCopied(false);
    try {
      const url = new URL(localizedPath(locale, "/doppler"), window.location.origin);
      url.searchParams.set("s", encodeDopplerShare(setup, { ...view, pair }, preset));
      if (url.href.length > 2000) throw new Error("too long");
      setShareUrl(url.href);
      try { await navigator.clipboard.writeText(url.href); setNotice(copy.status.shared); }
      catch { setNotice(copy.status.shareManual); }
    } catch {
      setNotice(copy.status.shareTooLong, "warn");
    }
  };

  useEffect(() => {
    if (!notice) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && !document.querySelector('[role="dialog"][aria-modal="true"]')) { setNoticeState(null); setShareUrl(null); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [notice]);

  /* ---- immersion: one science view at a time, with the clock still in reach ---- */
  useEffect(() => { expandedRef.current = expanded; }, [expanded]);
  /* The trigger is replaced by the exit button while expanded, so focus goes back to whichever trigger remounts. */
  const collapse = useCallback(() => {
    const kind = expandedRef.current;
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    setExpanded(null);
    setExpandNotice(null);
    requestAnimationFrame(() => requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-expand="${kind}"]`)?.focus()));
  }, []);
  useEffect(() => {
    if (!expanded) return;
    exitRef.current?.focus();
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") collapse(); };
    document.addEventListener("keydown", onKey);
    return () => { root.style.overflow = previous; document.removeEventListener("keydown", onKey); };
  }, [expanded, collapse]);

  /* ---- accessible summaries: nothing numeric until the prediction is in ---- */
  const waveSummary = evidence.numeric
    ? copy.figure.summary(signedC(setup.sourceVelocity), signedC(setup.observerVelocity), time.toFixed(2))
    : copy.figure.summaryMasked(signedC(setup.sourceVelocity), signedC(setup.observerVelocity));
  const bandSummary = evidence.numeric ? copy.figure.bandSummary(emittedCount, receivedCount) : copy.figure.bandSummaryMasked;

  const analytic = dopplerAnalytic(setup.sourceVelocity, setup.observerVelocity, measurement?.direction ?? observerSide(setup));
  const checkOk = readout.complete && readout.frequency !== null && readout.wavelength !== null
    && Math.abs(readout.frequency - analytic.frequency) < 1e-6 && Math.abs(readout.wavelength - analytic.wavelength) < 1e-6;

  const cardTitle = (kind: "wave" | "band") => (kind === "wave" ? copy.figure.wavefrontTitle : copy.figure.bandTitle);

  const expandButton = (kind: "wave" | "band") => (
    expanded === kind ? (
      <div className="doppler-expand-actions">
        <button
          aria-label={copy.actions.fullscreen}
          title={copy.actions.fullscreen}
          onClick={async () => {
            try { await document.documentElement.requestFullscreen(); setExpandNotice(null); }
            catch { setExpandNotice(copy.actions.fullscreenUnavailable); }
          }}
        ><Expand size={18} /></button>
        <button ref={exitRef} className="doppler-expand-exit" aria-label={copy.actions.exitExpand} title={copy.actions.exitExpand} onClick={collapse}><Minimize2 size={18} /></button>
      </div>
    ) : (
      <button
        className="doppler-expand"
        aria-label={`${copy.actions.expand}：${cardTitle(kind)}`}
        title={copy.actions.expand}
        data-expand={kind}
        onClick={() => { setPlaying(false); setExpanded(kind); }}
      ><Maximize2 size={16} /></button>
    )
  );

  const sliderRow = (which: "source" | "observer") => {
    const value = which === "source" ? setup.sourceVelocity : setup.observerVelocity;
    const label = which === "source" ? copy.controls.sourceSpeed : copy.controls.observerSpeed;
    const key = which === "source" ? "sourceVelocity" : "observerVelocity";
    return (
      <div className="doppler-speed" key={which}>
        <label htmlFor={`doppler-${which}-speed`}>
          <span>{which === "source" ? copy.controls.sourceLabel : copy.controls.observerLabel} · {label} <b>{copy.controls.speedValue(value)}</b></span>
        </label>
        <div className="doppler-speed-row">
          <input
            id={`doppler-${which}-speed`}
            type="range"
            min={-MAX_SPEED}
            max={MAX_SPEED}
            step={SPEED_STEP}
            value={value}
            aria-valuetext={copy.controls.speedValue(value)}
            onChange={(event) => setSpeeds({ [key]: snapVelocity(Number(event.target.value)) })}
          />
          <button onClick={() => setSpeeds({ [key]: value === 0 ? 0 : -value })} aria-label={which === "source" ? copy.controls.flipSource : copy.controls.flipObserver} disabled={value === 0}>
            {copy.controls.flip}
          </button>
        </div>
      </div>
    );
  };

  const readoutRows: readonly (readonly [string, string])[] = [
    [copy.readout.emissionInterval, readout.emissionInterval === null ? copy.readout.notBorn : f2(readout.emissionInterval)],
    [copy.readout.spacing, readout.wavelength === null ? copy.readout.notBorn : f2(readout.wavelength)],
    [copy.readout.period, readout.period === null ? copy.readout.waitingReal : f2(readout.period)],
    ...(evidence.frequency ? [[copy.readout.frequency, readout.frequency === null ? copy.readout.waitingReal : f2(readout.frequency)] as const] : []),
  ];

  const stageExpanded = expanded !== null;

  return (
    <MathProvider>
    <main ref={shellRef} className="lab-shell doppler-lab doppler-c2 lab-c2" lang={locale === "en" ? "en" : "zh-Hant"}>
      <div className="topbar doppler-topbar" inert={stageExpanded}>
        <div className="doppler-identity">
          <Link href={localizedPath(locale, "/")} className="lab-brand" aria-label={copy.catalog}><KakauLabMark /></Link>
          <div><div className="eyebrow">{copy.eyebrow}</div><h1><span className="live-dot" />{copy.title}</h1></div>
        </div>
        <nav className="doppler-modebar" aria-label={copy.modes.nav}>
          <button className={!guided ? "active" : ""} aria-pressed={!guided} onClick={() => { if (guided) requestLeaveGuided(); }}>{copy.modes.free}</button>
          <button className={guided ? "active" : ""} aria-pressed={Boolean(guided)} onClick={() => { if (!guided) startGuided("baseline"); }}>{copy.modes.tasks}</button>
          <button className="doppler-theory-entry" disabled={!evidence.theory} aria-haspopup="dialog" aria-describedby={!evidence.theory ? "doppler-lock-note" : undefined} onClick={() => setTheoryOpen(true)} title={!evidence.theory ? copy.modes.theoryLocked : undefined}>
            {evidence.theory ? <BookOpen size={14} /> : <Lock size={14} />} {copy.modes.theory}
          </button>
          {!evidence.theory && <span id="doppler-lock-note" className="doppler-sr-only">{copy.modes.theoryLocked}</span>}
        </nav>
        <div className="header-actions">
          <Menu label={copy.actions.tools}>
            {evidence.share && <button onClick={shareSetup}><Share2 size={14} /> {copy.actions.share}</button>}
            {evidence.export && <>
              <button onClick={() => exportResult("svg")}><FileImage size={14} /> {copy.actions.exportSvg}</button>
              <button onClick={() => exportResult("json")}>
                <FileBraces size={14} /> {copy.actions.exportJson}
              </button>
            </>}
            {!evidence.share && !evidence.export && <p className="doppler-menu-note">{copy.actions.guidedNoTools}</p>}
          </Menu>
          <button className="doppler-icon-button" disabled={!evidence.modelInfo} onClick={() => setInfoOpen(true)} aria-haspopup="dialog" aria-label={copy.actions.modelInfo} title={copy.actions.modelInfo}><Info size={16} /></button>
          <Link className="doppler-lang" href={shareHref(other)} hrefLang={other === "en" ? "en" : "zh-Hant"} lang={other === "en" ? "en" : "zh-Hant"} aria-label={`${copy.language}：${copy.languages[other]}`}>{copy.languages[other]}</Link>
          <ThemeToggle locale={locale} />
        </div>
      </div>

      {leaveConfirm && guided && (
        <div className="doppler-leave-confirm" role="alertdialog" aria-label={copy.guided.leaveTitle} aria-describedby="doppler-leave-text" onKeyDown={(event) => { if (event.key === "Escape") setLeaveConfirm(false); }}>
          <p id="doppler-leave-text">{copy.guided.leaveText}</p>
          <button autoFocus onClick={() => setLeaveConfirm(false)}>{copy.guided.keepGoing}</button>
          <button className="danger" onClick={closeGuided}>{copy.guided.leaveNow}</button>
        </div>
      )}
      {notice && !guided && (
        <div className="doppler-toast" role="status" data-testid="notice" data-tone={noticeState?.tone}>
          {noticeState?.tone === "warn" ? <TriangleAlert size={20} className="doppler-toast-icon" aria-hidden="true" /> : <CircleCheck size={20} className="doppler-toast-icon" aria-hidden="true" />}
          <div className="doppler-toast-body">
            <p>{notice}</p>
            {shareUrl && (
              <div className="doppler-toast-link">
                <label>{copy.status.shareLink}<input ref={shareInput} readOnly value={shareUrl} onFocus={(event) => event.target.select()} /></label>
                <button onClick={copyShareUrl} aria-label={copied ? copy.status.copied : copy.status.copyLink} title={copied ? copy.status.copied : copy.status.copyLink} data-copied={copied}>
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
            )}
          </div>
          <button className="doppler-toast-close" aria-label={copy.status.dismiss} title={copy.status.dismiss} onClick={() => { setNoticeState(null); setShareUrl(null); }}><X size={18} /></button>
        </div>
      )}
      <div className="doppler-stage" data-expanded={expanded ?? "none"} data-guided={Boolean(guided)}>
        <div className="doppler-figures">
          <section className="viewport-card doppler-card" data-card="wave" aria-label={copy.figure.wavefrontTitle}>
            <div className="doppler-card-head">
              <div><strong>{copy.figure.wavefrontTitle}</strong><small>{copy.figure.wavefrontNote}</small></div>
              {expandButton("wave")}
            </div>
            {expanded === "wave" && expandNotice && <p className="doppler-expand-notice" role="status">{expandNotice}</p>}
            <div className="doppler-host doppler-wave-host" ref={waveHost}>
              <WavefrontView
                experiment={experiment} time={time} pair={pair} guides={evidence.guides} numeric={evidence.numeric} labels={view.labels}
                width={waveSize.width} height={waveSize.height} copy={copy} summary={waveSummary} onSelectPair={selectPair}
              />
            </div>
            <div className="doppler-legend">
              <span><svg width="16" height="12" aria-hidden="true"><path d="M8 1L14 6L8 11L2 6Z" fill={C.source} /></svg>{copy.figure.legendSource}</span>
              <span><svg width="14" height="12" aria-hidden="true"><rect x="2" y="1" width="10" height="10" fill={C.observer} /></svg>{copy.figure.legendObserver}</span>
              <span><i style={{ background: C.pair, height: 3 }} />{copy.figure.legendPair}</span>
              <span><i style={{ background: C.front }} />{copy.figure.legendFront}</span>
            </div>
          </section>

          <section className="viewport-card doppler-card" data-card="band" aria-label={copy.figure.bandTitle}>
            <div className="doppler-card-head">
              <div><strong>{copy.figure.bandTitle}</strong><small>{copy.figure.bandNote}</small></div>
              {expandButton("band")}
            </div>
            {expanded === "band" && expandNotice && <p className="doppler-expand-notice" role="status">{expandNotice}</p>}
            <div className="doppler-host doppler-band-host" ref={bandHost}>
              <TimeBand
                experiment={experiment} time={time} pair={pair} guides={evidence.guides} numeric={evidence.numeric} labels={view.labels} connectors={view.connectors}
                width={bandSize.width} height={bandSize.height} copy={copy} summary={bandSummary} onSelectPair={selectPair}
              />
            </div>
          </section>
        </div>

        <div className="doppler-dock">
          <div className="doppler-transport" role="group" aria-label={copy.transport.group}>
            <div className="doppler-transport-buttons">
              <button disabled={!timeAllowed} onClick={() => goTo(0)} aria-label={copy.transport.start} title={copy.transport.start}><SkipBack size={15} /></button>
              <button disabled={!timeAllowed || time <= 0} onClick={() => goTo(previousEventTime(experiment, time))} aria-label={copy.transport.prevEvent} title={copy.transport.prevEvent}><StepBack size={15} /></button>
              <button disabled={!timeAllowed} className={playing ? "active" : ""} aria-pressed={playing} onClick={togglePlay} aria-label={playing ? copy.transport.pause : copy.transport.play}>
                {playing ? <Pause size={15} /> : <Play size={15} />}<span>{playing ? copy.transport.pause : copy.transport.play}</span>
              </button>
              <button disabled={!timeAllowed || atEnd} onClick={() => goTo(nextEventTime(experiment, time))} aria-label={copy.transport.nextEvent} title={copy.transport.nextEvent}><StepForward size={15} /></button>
              <button disabled={!timeAllowed} onClick={() => goTo(experiment.duration)} aria-label={copy.transport.end} title={copy.transport.end}><SkipForward size={15} /></button>
            </div>
            <input
              className="doppler-scrub"
              type="range"
              min={0}
              max={experiment.duration}
              step={0.01}
              value={Math.min(time, experiment.duration)}
              disabled={!timeAllowed}
              aria-label={copy.transport.time}
              aria-valuetext={evidence.numeric ? `t = ${time.toFixed(2)} T₀` : undefined}
              onChange={(event) => goTo(Number(event.target.value))}
            />
            <output className="doppler-clock" data-testid="clock">{evidence.numeric ? copy.transport.clock(time.toFixed(2), experiment.duration.toFixed(2)) : copy.transport.clockMasked}</output>
            <Menu label={`${rate}×`} ariaLabel={`${copy.transport.speed}：${rate}×`} up>
              {RATES.map((r) => <button key={r} disabled={!timeAllowed} className={rate === r ? "active" : ""} aria-pressed={rate === r} onClick={() => setRate(r)}>{r}×</button>)}
            </Menu>
          </div>
          <div className="doppler-live" aria-label={copy.readout.liveFrequency} data-testid="live-readout">
            {evidence.numeric ? (
              <>
                <span><i>t</i>{time.toFixed(2)} T₀</span>
                <span><i>{copy.figure.emission}/{copy.figure.reception}</i>{emittedCount} / {receivedCount}</span>
                {evidence.frequency
                  ? <span className="doppler-live-f"><i><Rich>{copy.readout.live}</Rich></i>{live ? live.frequency.toFixed(2) : copy.readout.liveWaiting}</span>
                  : null}
              </>
            ) : <span className="doppler-masked">{copy.readout.masked}</span>}
          </div>
          {reduced && <p className="doppler-note">{copy.transport.reducedMotion}</p>}
        </div>

        {guided ? (
          <GuidedActivities
            copy={copy}
            session={guided}
            readout={readout}
            canManipulate={timeAllowed}
            onClose={requestLeaveGuided}
            onRestart={() => startGuided(guided.activityId)}
            onSelectActivity={startGuided}
            onPrediction={(choice) => setGuided(submitPrediction(guided, choice))}
            onSessionChange={setGuided}
            onPlayToReception={playToReception}
            onKeepAndAdvance={() => enterSession(advance(guided, currentReference()))}
            onChooseExplanation={(id) => enterSession(chooseExplanation(guided, id))}
            onSwitchVerify={(variant) => enterSession(switchVerifyVariant(guided, variant))}
            onKeepVerify={() => setGuided(keepResult(guided, currentReference()))}
            onFinishVerify={() => setGuided(finishVerification(guided))}
          />
        ) : (
          <aside className="doppler-side" aria-label={copy.controls.group}>
            <div className="doppler-side-inner">
              <div className="doppler-group">
                <p className="doppler-group-label">{copy.presets.label}</p>
                <div className="doppler-presets" role="group" aria-label={copy.presets.label}>
                  {DOPPLER_PRESET_ORDER.map((id) => (
                    <button key={id} className={preset === id ? "active" : ""} aria-pressed={preset === id} onClick={() => applySetup(presetSetup(id))}>{copy.presets.names[id]}</button>
                  ))}
                </div>
              </div>

              <div className="doppler-group">
                <p className="doppler-group-label">{copy.controls.group}</p>
                {sliderRow("source")}
                {sliderRow("observer")}
                <details className="doppler-check">
                  <summary>{copy.controls.more}</summary>
                  <p className="doppler-note"><Rich>{copy.controls.fixed}</Rich> <Rich>{copy.status.modelHint}</Rich></p>
                  <div className="doppler-layer-toggles" role="group" aria-label={copy.layers.connectors}>
                    <label><input type="checkbox" checked={view.connectors} onChange={() => setView((v) => ({ ...v, connectors: !v.connectors }))} /> {copy.layers.connectors}</label>
                    <label><input type="checkbox" checked={view.labels} onChange={() => setView((v) => ({ ...v, labels: !v.labels }))} /> {copy.layers.labels}</label>
                  </div>
                  <div className="doppler-reference-actions">
                    <button onClick={() => { applySetup(presetSetup("rest")); setView({ ...DEFAULT_VIEW }); setReference(null); }}><RotateCcw size={14} /> {copy.actions.resetExperiment}</button>
                  </div>
                </details>
              </div>
              <div className="doppler-group" data-testid="pair-readout">
                <div className="doppler-pair-head">
                  <p className="doppler-group-label">{copy.readout.group}</p>
                  <div className="doppler-pair-stepper" role="group" aria-label={copy.readout.pairLabel}>
                    <button onClick={() => selectPair(pair - 1)} disabled={pair <= 0} aria-label={copy.readout.prev}><ChevronLeft size={16} /></button>
                    <output aria-live="polite" aria-label={copy.readout.selected}>{copy.readout.pair(pair)}</output>
                    <button onClick={() => selectPair(pair + 1)} disabled={pair >= Math.max(0, experiment.receptions.length - 2)} aria-label={copy.readout.next}><ChevronRight size={16} /></button>
                  </div>
                </div>
                {experiment.receptions.length < 2 ? <p className="doppler-note">{copy.readout.noPair}</p> : (
                  <dl className="doppler-readout-list">
                    {readoutRows.map(([name, value]) => <div key={name}><dt><Rich>{name}</Rich></dt><dd data-waiting={value === copy.readout.waitingReal}>{value}</dd></div>)}
                  </dl>
                )}
                <div className="doppler-reference-actions">
                  <button onClick={playToReception} disabled={!reception || readout.complete}>{readout.complete ? copy.transport.jumpDone : copy.transport.jump}</button>
                  <button onClick={() => setReference(currentReference())} disabled={!readout.complete} title={readout.complete ? undefined : copy.readout.keepNeed}>{reference ? copy.readout.kept : copy.readout.keep}</button>
                </div>
                <details className="doppler-check" open={Boolean(reference)}>
                  <summary>{copy.readout.compareTitle}</summary>
                  <table className="doppler-compare doppler-reference-table" aria-label={copy.readout.compareTitle}>
                    <thead><tr><th scope="col"><span className="doppler-sr-only">{copy.readout.compareTitle}</span></th><th scope="col">{copy.readout.current}</th><th scope="col">{copy.readout.reference}</th></tr></thead>
                    <tbody>
                      <tr><th scope="row"><Rich>{copy.readout.spacing}</Rich></th><td>{f2(readout.wavelength)}</td><td>{reference ? f2(reference.ratios.wavelength) : "—"}</td></tr>
                      <tr><th scope="row"><Rich>{copy.readout.period}</Rich></th><td>{f2(readout.period)}</td><td>{reference ? f2(reference.ratios.period) : "—"}</td></tr>
                      <tr><th scope="row"><Rich>{copy.readout.frequency}</Rich></th><td>{f2(readout.frequency)}</td><td>{reference ? f2(reference.ratios.frequency) : "—"}</td></tr>
                    </tbody>
                  </table>
                  {reference
                    ? <p className="doppler-note">{copy.readout.reference}：<Rich>{copy.readout.referenceSetup(signedC(reference.sourceVelocity), signedC(reference.observerVelocity))}</Rich>，{copy.readout.pair(reference.pair)}</p>
                    : <p className="doppler-note">{copy.readout.noReference}</p>}
                  {reference && <div className="doppler-reference-actions"><button onClick={() => setReference(null)}>{copy.readout.clearReference}</button></div>}
                </details>
                <details className="doppler-check">
                  <summary>{copy.readout.check}</summary>
                  <p><Rich>{copy.readout.formulaLine}</Rich></p>
                  <p data-testid="formula-check">{readout.complete ? <Rich dynamic>{copy.readout.checkText(analytic.wavelength.toFixed(2), analytic.frequency.toFixed(2), checkOk)}</Rich> : copy.readout.waitingReal}</p>
                </details>
              </div>
            </div>
          </aside>
        )}
      </div>

      {infoOpen && (
        <LabInfoDialog title={copy.theory.modelInfoTitle} closeLabel={copy.theory.close} onClose={() => setInfoOpen(false)}>
          <article className="theory-body">
            <h2>{copy.theory.modelInfoTitle}</h2>
            {copy.modelInfo.paragraphs.map((p) => <p key={p}><Rich>{p}</Rich></p>)}
          </article>
        </LabInfoDialog>
      )}
      {theoryOpen && <LabInfoDialog title={copy.theory.title} closeLabel={copy.theory.close} onClose={() => setTheoryOpen(false)}><TheoryNotes locale={locale} /></LabInfoDialog>}
    </main>
    </MathProvider>
  );
}

