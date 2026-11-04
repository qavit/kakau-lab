/**
 * Lab W45 — C2 Neutral Scientific Workbench slice for the interference lab (fifth consumer).
 *
 * Rendered after `interferenceStyles` and scoped to `.interference-lab.lab-c2`, so every rule here out-ranks the
 * base rule it adjusts without !important. It only re-skins the interface: tokens come from `app/lab-c2.css`
 * (`--lc-*`), the legacy `--teal` / `--primary` are pointed at the C2 accent for UI state only.
 *
 * Not touched, on purpose: the canvas, the SVG overlay (`.interference-plot`, `.interference-svg-label`), the
 * condition-line hues (`--if-constructive`, `--if-destructive`, `--if-term-*`), the view key gradient and the
 * waveform figure. Those are scientific data colours and stay independent of the interface accent.
 */
export const interferenceC2Styles = `
.interference-lab.lab-c2{--teal:var(--lc-accent);--primary:var(--lc-accent);--if-on-accent:var(--lc-on-accent);--if-on-good:#fff;--if-ring:var(--lc-focus);--if-ring-on-light:#216e84;
  --if-panel:var(--lc-raised);--if-stage:var(--lc-sunken);--if-ctl:10px;
  border-color:var(--lc-border);border-radius:14px;background:var(--lc-raised);box-shadow:var(--lc-card-shadow);font-size:14px}
html[data-mode="dark"] .interference-lab.lab-c2{--if-on-good:#0b1a1d}
@media(prefers-color-scheme:dark){html:not([data-mode]) .interference-lab.lab-c2{--if-on-good:#0b1a1d}}
/* focus: one 2px ring; the hint close sits on a light card over the canvas, so it keeps the light-surface ring */
.interference-lab.lab-c2 :is(button,input,select,summary,[data-interference-plot]):focus-visible,.interference-lab.lab-c2 .if-segmented input:focus-visible+span{outline:2px solid var(--if-ring);outline-offset:2px}
.interference-lab.lab-c2 .interference-plot-hint button:focus-visible{outline-color:var(--if-ring-on-light)}
/* buttons: 44px, bordered controls, accent for the selected / primary state */
.interference-lab.lab-c2 .btn{min-height:44px;padding:.5rem 1rem;border-radius:var(--if-ctl);font-size:14px;font-weight:650;border-color:var(--lc-border-control)}
.interference-lab.lab-c2 .btn:hover:not(:disabled){border-color:var(--lc-accent);background:var(--lc-sunken)}
.interference-lab.lab-c2 .btn--primary{border-color:var(--lc-accent);background:var(--lc-accent);color:var(--if-on-accent)}
.interference-lab.lab-c2 .btn--primary:hover:not(:disabled){background:var(--lc-accent);filter:brightness(.94)}
.interference-lab.lab-c2 .btn--ghost{border-color:var(--lc-border-control);background:transparent}
.interference-lab.lab-c2 .btn--small{min-height:44px;padding:.4rem .85rem;font-size:13px}
.interference-lab.lab-c2 .btn--link{min-height:44px;padding:.4rem 0;border:0;background:none;color:var(--lc-accent);font-size:14px;font-weight:600}
.interference-lab.lab-c2 .btn--link:hover:not(:disabled){background:none;text-decoration-thickness:2px}
.interference-lab.lab-c2 .btn:disabled{opacity:.5}
/* header */
.interference-lab.lab-c2 .if-header{gap:.5rem 1rem;padding:.6rem 1rem;border-bottom-color:var(--lc-border)}
.interference-lab.lab-c2 .if-heading h1{font-size:1.25rem;font-weight:650;line-height:1.3;letter-spacing:0}
.interference-lab.lab-c2 .if-heading p{font-size:14px;color:var(--lc-body)}
.interference-lab.lab-c2 .if-mode{min-height:28px;display:inline-flex;align-items:center;padding:.2rem .7rem;background:var(--lc-accent-subtle);color:var(--lc-accent);font-size:12px}
.interference-lab.lab-c2 .if-mode.is-advanced{background:var(--warm-bg);color:var(--warm-ink)}
/* toolbar */
.interference-lab.lab-c2 .interference-controls{align-items:flex-end;gap:.3rem 1rem;padding:.35rem 1rem .4rem;border-bottom-color:var(--lc-border)}
.interference-lab.lab-c2 .if-control legend,.interference-lab.lab-c2 .if-control--slider>span:first-child{margin-bottom:0;font-size:12px;line-height:1.1;letter-spacing:.04em;color:var(--lc-muted)}
.interference-lab.lab-c2 .if-control--slider{width:8.75rem}
.interference-lab.lab-c2 .if-control--slider output{color:var(--lc-accent);font-weight:700}
.interference-lab.lab-c2 .if-segmented{gap:.35rem}
.interference-lab.lab-c2 .if-segmented label span{display:inline-flex;align-items:center;min-height:44px;padding:.4rem .9rem;border-color:var(--lc-border-control);border-radius:var(--if-ctl);background:var(--lc-raised);font-size:14px;font-weight:650}
.interference-lab.lab-c2 .if-segmented label:hover input:not(:checked)+span{background:var(--lc-sunken);border-color:var(--lc-accent)}
.interference-lab.lab-c2 .if-segmented input:checked+span{border-color:var(--lc-accent);background:var(--lc-accent);color:var(--if-on-accent)}
.interference-lab.lab-c2 .if-segmented__more{min-height:44px;padding:.4rem .85rem;border-color:var(--lc-border-control);border-radius:var(--if-ctl);font-size:14px;color:var(--lc-body)}
.interference-lab.lab-c2 .if-layers{gap:0 .1rem}
.interference-lab.lab-c2 .if-layers label,.interference-lab.lab-c2 .if-attenuation{min-height:44px;gap:.45rem;padding:0 .35rem;font-size:14px}
.interference-lab.lab-c2 input[type=checkbox],.interference-lab.lab-c2 input[type=radio]{width:18px;height:18px;margin:0;accent-color:var(--lc-accent)}
.interference-lab.lab-c2 .if-segmented input{width:auto;height:auto}
.interference-lab.lab-c2 .if-advanced summary{display:inline-flex;align-items:center;min-height:44px;padding:.4rem .95rem;border-color:var(--lc-border-control);border-radius:var(--if-ctl);background:var(--lc-raised);font-size:14px}
.interference-lab.lab-c2 .if-advanced[open] summary,.interference-lab.lab-c2 .if-advanced summary:hover{border-color:var(--lc-accent)}
.interference-lab.lab-c2 .if-advanced-panel{border-color:var(--lc-border-control);border-radius:var(--if-ctl);background:var(--lc-raised);box-shadow:var(--lc-card-shadow)}
.interference-lab.lab-c2 .if-kinematics p:not(.sr-only){font-size:12px;color:var(--lc-body)}
.interference-lab.lab-c2 .if-advanced-warning{font-size:13px;border-top-color:var(--lc-border)}
/* plot surround: text only; the plot, canvas and overlay keep their own colours */
.interference-lab.lab-c2 .if-plot-column{background:var(--lc-sunken)}
.interference-lab.lab-c2 .interference-plot{border-color:var(--lc-border-control)}
.interference-lab.lab-c2 .if-view-key{font-size:12px;color:var(--lc-body)}
.interference-lab.lab-c2 .if-point-line{font-size:13px;color:var(--lc-body)}
.interference-lab.lab-c2 .if-plot-status,.interference-lab.lab-c2 .interference-plot-hint{font-size:13px}
.interference-lab.lab-c2 .interference-plot-hint{padding:0 0 0 .6rem}
.interference-lab.lab-c2 .interference-plot-hint button{width:44px;height:44px;font-size:1.15rem;color:#3d4a5c}
.interference-lab.lab-c2 .if-plot-note{font-size:12px}
/* rail */
.interference-lab.lab-c2 .if-rail{border-left-color:var(--lc-border)}
.interference-lab.lab-c2 .rail-card{padding-block:.45rem;border-bottom-color:var(--lc-border)}
.interference-lab.lab-c2 .interference-readout{padding-block:.5rem}
.interference-lab.lab-c2 .rail-card__head .btn--small{min-height:44px;margin-block:-.45rem}
.interference-lab.lab-c2 .rail-card__eyebrow,.interference-lab.lab-c2 .activity__eyebrow,.interference-lab.lab-c2 .if-act-kicker{font-size:12px;letter-spacing:.1em;color:var(--lc-accent)}
.interference-lab.lab-c2 .rail-card__note,.interference-lab.lab-c2 .rail-card__empty{font-size:13px}
.interference-lab.lab-c2 .rail-counts--advanced div{font-size:13px}.interference-lab.lab-c2 .rail-counts--advanced p{font-size:12px}
.interference-lab.lab-c2 .classification{font-size:13px;border-left-color:var(--lc-border-control)}
.interference-lab.lab-c2 .classification strong{font-size:14px}
.interference-lab.lab-c2 .measure-extra dt{font-size:12px}.interference-lab.lab-c2 .measure-extra dd{font-size:13px}
.interference-lab.lab-c2 .if-waveform figcaption{font-size:12px}
/* time bar */
.interference-lab.lab-c2 .interference-time{gap:.4rem .8rem;padding-block:.25rem;border-top-color:var(--lc-border)}
.interference-lab.lab-c2 .if-time-slider{font-size:12px;color:var(--lc-muted)}
.interference-lab.lab-c2 .if-time-slider output{color:var(--lc-accent);font-weight:700}
.interference-lab.lab-c2 .if-time-hint{font-size:12px;color:var(--lc-body)}
/* activities */
.interference-lab.lab-c2 .interference-activities{border-left-color:var(--lc-border);background:var(--lc-page)}
.interference-lab.lab-c2 .if-act-toggle{min-height:44px;border-bottom-color:var(--lc-border);background:var(--lc-accent-subtle)}
.interference-lab.lab-c2 .if-act-current{font-size:14px}
.interference-lab.lab-c2 .if-act-toggle-text{font-size:13px;color:var(--lc-body)}
.interference-lab[data-sidebar="closed"].lab-c2 .if-body{grid-template-columns:minmax(0,1fr) 45px}
.interference-lab.lab-c2 .interference-tabs{border-bottom-color:var(--lc-border)}
.interference-lab.lab-c2 .interference-tabs button{width:44px;height:44px;min-height:44px;padding:0;font-size:14px}
.interference-lab.lab-c2 .interference-tabs button[aria-current="step"]{border-color:var(--lc-accent);background:var(--lc-accent);color:var(--if-on-accent)}
.interference-lab.lab-c2 .if-act-nav{border-top-color:var(--lc-border)}
.interference-lab.lab-c2 .activity__lead,.interference-lab.lab-c2 .activity__small,.interference-lab.lab-c2 .step__body{font-size:14px}
.interference-lab.lab-c2 .activity__notice{font-size:13px}
.interference-lab.lab-c2 .step__title{font-size:14px}
.interference-lab.lab-c2 .step__index{background:var(--lc-accent);color:var(--if-on-accent);font-size:12px}
.interference-lab.lab-c2 .step.is-done .step__index{background:var(--if-good);color:var(--if-on-good)}
.interference-lab.lab-c2 .checklist li{border-color:var(--lc-border);font-size:14px}
.interference-lab.lab-c2 .checklist__value{font-size:12px}
.interference-lab.lab-c2 .select-row{font-size:14px}
.interference-lab.lab-c2 .select-row select,.interference-lab.lab-c2 .number-row input{min-height:44px;border-color:var(--lc-border-control);border-radius:var(--if-ctl);background:var(--lc-raised);padding:.4rem .6rem;font-size:14px}
.interference-lab.lab-c2 .number-row label{font-size:14px}.interference-lab.lab-c2 .number-row input{width:5rem}
.interference-lab.lab-c2 .choices legend{font-size:13px}
.interference-lab.lab-c2 .choices label{min-height:44px;border-color:var(--lc-border);border-radius:var(--if-ctl);font-size:14px}
.interference-lab.lab-c2 .choices label:has(input:checked){border-color:var(--lc-accent);background:var(--lc-accent-subtle);box-shadow:inset 3px 0 0 var(--lc-accent)}
.interference-lab.lab-c2 .prediction-echo,.interference-lab.lab-c2 .interference-feedback,.interference-lab.lab-c2 .feedback--good,.interference-lab.lab-c2 .callout,.interference-lab.lab-c2 .edge-status,.interference-lab.lab-c2 .edge-cases,.interference-lab.lab-c2 .key-list{font-size:14px}
.interference-lab.lab-c2 .callout{border-left-color:var(--lc-accent);background:var(--lc-accent-subtle)}
.interference-lab.lab-c2 .interference-dialog{border-radius:14px}
.interference-lab.lab-c2 .interference-dialog p,.interference-lab.lab-c2 .interference-dialog li{font-size:15px}
/* projection: the exit button must stay reachable even when the focused plot scrolled the fixed shell */
.interference-lab.lab-c2.interference-projection .if-header{position:sticky;top:0;z-index:30;background:var(--lc-raised)}
/* 1100–1439px: the toolbar wraps to two rows here, so labels sit beside their 44px controls instead of above them (each row 44px, not 57px); this returns the height to the plot */
@media(min-width:1100px) and (max-width:1439px){
  .interference-lab.lab-c2 .interference-controls{align-items:center}
  .interference-lab.lab-c2 .if-control--views,.interference-lab.lab-c2 .if-layers{display:flex;flex-wrap:nowrap;align-items:center;gap:0 .5rem}
  .interference-lab.lab-c2 .if-control--views legend,.interference-lab.lab-c2 .if-layers legend{float:left;width:auto;margin:0 .5rem 0 0;line-height:44px}
  .interference-lab.lab-c2 .if-layers{gap:0 .1rem}
  .interference-lab.lab-c2 .if-control--slider{display:flex;align-items:center;gap:.5rem;width:14.5rem}
  .interference-lab.lab-c2 .if-control--slider>span:first-child{flex:none;min-width:5.6rem;white-space:nowrap;line-height:1.2}
  .interference-lab.lab-c2 .if-control--slider output{float:none;margin-left:.3rem}
  .interference-lab.lab-c2 .if-control--slider input[type=range]{flex:1;min-width:4rem}
  .interference-lab.lab-c2 .if-advanced-grid .if-control--slider{width:auto}
}
@media(min-width:1100px) and (max-width:1279px){.interference-lab.lab-c2 .if-control--slider{width:11rem}}
@media(min-width:1024px) and (max-width:1099px){.interference-lab.lab-c2 .if-control--slider{width:7.5rem}}
@media(max-width:640px){.interference-lab.lab-c2 .if-control--slider{width:calc(50% - .5rem)}}
@media(max-width:640px){
  .interference-lab.lab-c2 .if-header{padding:.5rem .75rem}
  .interference-lab.lab-c2 .interference-controls{padding:.5rem .75rem}
  .interference-lab.lab-c2 .if-segmented label span{padding:.4rem .85rem}
  .interference-lab.lab-c2 .interference-tabs button{width:44px;height:44px}
}
`;
