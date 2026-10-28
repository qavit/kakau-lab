/**
 * Layout and presentation for the interference lab. Colours come from the Lab theme tokens in globals.css
 * (so light/dark follow the site); only the two condition-line hues are model-specific.
 */
export const interferenceStyles = `
.interference-lab{--if-constructive:#e69a16;--if-destructive:#087d90;--if-term-c:#9a6200;--if-term-d:#0b6673;--if-good:#2f7d4f;--if-ink:var(--ink);--if-line:var(--line);--if-panel:var(--surface-solid);--if-stage:var(--tint);
  display:flex;flex-direction:column;margin:clamp(8px,1.5vw,16px) auto;width:min(1760px,calc(100% - clamp(16px,3vw,32px)));border:1px solid var(--line-strong);border-radius:8px;background:var(--if-panel);color:var(--ink);font:14px/1.45 "Avenir Next","PingFang TC","Noto Sans TC",system-ui,sans-serif;box-shadow:0 18px 45px rgba(16,44,66,.1);overflow:clip}
html[data-mode="dark"] .interference-lab{--if-term-c:#f0b84a;--if-term-d:#5fd0e0;--if-destructive:#2fb4c6;--if-good:#6ccf94}
@media(prefers-color-scheme:dark){html:not([data-mode]) .interference-lab{--if-term-c:#f0b84a;--if-term-d:#5fd0e0;--if-destructive:#2fb4c6;--if-good:#6ccf94}}
.interference-lab [hidden]{display:none!important}
.interference-lab h1,.interference-lab h2,.interference-lab h3{font-family:inherit}
.interference-lab .sr-only{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
/* buttons */
.interference-lab .btn{display:inline-flex;align-items:center;justify-content:center;gap:.35rem;min-height:2.25rem;border:1px solid var(--line-strong);border-radius:999px;background:var(--btn-bg);padding:.4rem .85rem;color:var(--ink);font-size:.8rem;font-weight:700;line-height:1.2;cursor:pointer;white-space:nowrap;transform:none}
.interference-lab .btn:hover:not(:disabled){border-color:var(--teal);transform:none}
.interference-lab .btn:disabled{cursor:not-allowed;opacity:.45}
.interference-lab .btn--primary{border-color:var(--primary);background:var(--primary);color:#fff}
.interference-lab .btn--ghost{border-color:transparent;background:transparent}
.interference-lab .btn--small{min-height:1.9rem;padding:.25rem .65rem;font-size:.72rem}
.interference-lab .btn--link{min-height:0;border:0;padding:.2rem 0;background:none;color:var(--link);text-decoration:underline;text-underline-offset:3px;white-space:normal;text-align:left;border-radius:0}
.interference-lab :is(button,input,select,summary,[data-interference-plot]):focus-visible{outline:3px solid var(--teal);outline-offset:2px}
/* header */
.interference-lab .if-header{display:flex;align-items:center;flex-wrap:wrap;gap:.45rem 1rem;padding:.55rem 1rem;border-bottom:1px solid var(--line)}
.if-heading{display:flex;flex-wrap:wrap;align-items:baseline;gap:.15rem .85rem;min-width:0;margin-right:auto}
.if-heading h1{margin:0;font-size:1.2rem;font-weight:750;letter-spacing:.01em}.if-heading p{margin:0;font-size:.82rem;color:var(--body)}
.if-mode{margin:0;padding:.2rem .6rem;border-radius:999px;background:var(--tint);font-size:.72rem;font-weight:700;color:var(--if-term-d);white-space:nowrap}
.if-mode.is-advanced{background:var(--warm-bg);color:var(--warm-ink)}
/* body grid: stage | activities */
.if-body{display:grid;grid-template-columns:minmax(0,1fr) 23rem;flex:1;min-height:0}
.interference-lab[data-sidebar="closed"] .if-body{grid-template-columns:minmax(0,1fr) 2.6rem}
.if-stage{display:grid;grid-template-rows:auto minmax(0,1fr) auto;min-width:0;min-height:0}
.if-main{display:grid;grid-template-columns:minmax(0,1fr) 17rem;min-height:0}
/* toolbar */
.interference-controls{position:relative;z-index:5;display:flex;flex-wrap:wrap;align-items:flex-end;gap:.55rem 1.25rem;padding:.55rem 1rem .65rem;border-bottom:1px solid var(--line);background:transparent;border-radius:0;border-left:0;border-right:0;border-top:0;grid-template-columns:none}
.if-control{min-width:0;border:0;margin:0;padding:0}
.if-control legend,.if-control--slider>span:first-child{display:block;margin-bottom:.3rem;padding:0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.68rem;font-weight:700;letter-spacing:.06em;color:var(--body)}
.if-control--slider{display:block;width:10.5rem}.if-control--slider output{float:right;color:var(--teal)}
.interference-lab input[type=range]{width:100%;margin:0;accent-color:var(--teal)}.interference-lab input[type=checkbox],.interference-lab input[type=radio]{accent-color:var(--teal)}
.if-segmented{display:flex;flex-wrap:wrap;align-items:center;gap:.3rem}.if-segmented__extra{display:contents}
.if-segmented label{position:relative;display:inline-flex;cursor:pointer}
.if-segmented input{position:absolute;opacity:0;inset:0;margin:0;cursor:pointer}
.if-segmented label span{padding:.32rem .7rem;border:1px solid var(--line-strong);border-radius:999px;font-size:.78rem;font-weight:650;white-space:nowrap}
.if-segmented input:checked+span{border-color:var(--primary);background:var(--primary);color:#fff}
.if-segmented input:focus-visible+span{outline:3px solid var(--teal);outline-offset:2px}
.if-segmented__more{border:1px dashed var(--line-strong);border-radius:999px;background:none;padding:.32rem .65rem;font-size:.75rem;font-weight:650;color:var(--body)}
.if-segmented__more::after{content:" ▾"}.if-segmented__more[aria-expanded="true"]::after{content:" ▴"}
.if-layers{display:flex;flex-wrap:wrap;gap:.3rem .8rem}.if-layers legend{width:100%}
.if-layers label{display:inline-flex;align-items:center;gap:.3rem;font-size:.78rem;font-weight:650;white-space:nowrap}
.if-swatch{display:inline-block;width:1.2rem;height:0;border-top:2.5px solid var(--if-constructive);vertical-align:middle}
.if-swatch--destructive{border-top:2.5px dashed var(--if-destructive)}.if-swatch--r1{border-top:2px solid var(--ink)}.if-swatch--r2{border-top:2px dashed var(--ink)}
.if-swatch--crest{width:.8rem;height:.8rem;border:1.5px solid #fff;border-radius:50%;box-shadow:0 0 0 1px rgba(16,27,47,.45)}.if-swatch--trough{width:.8rem;height:.8rem;border:1.5px dashed var(--body);border-radius:50%}
.if-advanced{position:relative;margin-left:auto}
.if-advanced summary{list-style:none;padding:.32rem .75rem;border:1px solid var(--line-strong);border-radius:999px;font-size:.78rem;font-weight:700;cursor:pointer}
.if-advanced summary::-webkit-details-marker{display:none}.if-advanced summary::after{content:" ▾"}.if-advanced[open] summary{border-color:var(--primary)}
.if-advanced-panel{position:absolute;right:0;top:calc(100% + .45rem);z-index:20;width:min(30rem,calc(100vw - 2rem));border:1px solid var(--line-strong);background:var(--if-panel);box-shadow:0 16px 40px rgba(16,44,66,.22)}
.if-advanced-grid{display:grid;grid-template-columns:1fr 1fr;gap:.9rem 1.2rem;padding:1rem}.if-advanced-grid .if-control--slider{width:auto}
.if-kinematics{grid-column:1/-1;padding-top:.2rem;border-top:1px dotted var(--line-strong)}
.if-kinematics>div{overflow-x:auto;overflow-y:hidden;padding:.35rem 0;font-size:.95rem}.if-kinematics p:not(.sr-only){margin:0;font-size:.72rem;line-height:1.55;color:var(--body)}
.if-attenuation{display:flex;align-items:center;gap:.45rem;font-size:.8rem;font-weight:700}
.if-advanced-warning{margin:0;padding:.7rem 1rem;border-top:1px solid var(--line);background:var(--warm-bg);font-size:.75rem;line-height:1.6;color:var(--warm-ink)}
/* plot */
.if-plot-column{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.4rem;min-width:0;min-height:0;padding:.75rem;background:var(--if-stage);container-type:size}
.interference-plot{position:relative;flex:none;width:min(100cqw,100cqh - 2rem);aspect-ratio:1;margin:0;overflow:hidden;border:1px solid var(--line-strong);background:#dae2e7;touch-action:none;cursor:crosshair}
.interference-plot canvas,.interference-plot svg{position:absolute;inset:0;display:block;width:100%;height:100%}.interference-plot svg{pointer-events:auto;touch-action:none}
.interference-plot [data-layer="measurement"],.interference-plot [data-layer="wavefronts"],.interference-plot [data-layer="sources"]{pointer-events:none}
.interference-svg-label{fill:#101b2f;paint-order:stroke;stroke:rgba(255,255,255,.95);stroke-width:4;font:700 16px ui-monospace,SFMono-Regular,Menlo,monospace;pointer-events:none}.interference-svg-label--name{font-size:17px;font-style:italic}
.if-plot-overlay{position:absolute;left:.6rem;bottom:.6rem;z-index:2;display:flex;flex-direction:column;align-items:flex-start;gap:.3rem;max-width:calc(100% - 1.2rem);pointer-events:none}
.if-plot-status,.interference-plot-hint{margin:0;padding:.3rem .55rem;background:rgba(255,255,255,.92);font-size:.74rem;font-weight:600;color:#1f2d44}
.interference-plot-hint{position:static;display:flex;align-items:center;gap:.4rem;padding-right:.2rem;border-radius:0}
.interference-plot-hint button{display:grid;place-items:center;width:1.7rem;height:1.7rem;border:0;border-radius:50%;background:transparent;padding:0;font-size:1rem;line-height:1;color:#526072;pointer-events:auto}
.if-plot-note{position:absolute;top:.6rem;left:.6rem;right:.6rem;z-index:2;margin:0;padding:.35rem .55rem;background:rgba(255,255,255,.92);font-size:.7rem;line-height:1.55;color:#334155;pointer-events:none}
.if-view-key{display:grid;grid-template-columns:auto minmax(6rem,14rem) auto;align-items:center;gap:.5rem;width:min(100cqw,100cqh - 2rem);justify-content:end;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.66rem;color:var(--body)}
.if-view-key i{display:block;height:.5rem;border:1px solid var(--line-strong);background:linear-gradient(90deg,rgb(58,72,160),rgb(247,246,241),rgb(214,122,8))}
.if-point-line{margin:0;font-size:.74rem;color:var(--body)}
/* rail */
.if-rail{min-height:0;overflow-y:auto;border-left:1px solid var(--line)}
.rail-card{padding:.6rem 1rem;border-bottom:1px solid var(--line);background:transparent;border-radius:0;display:block}
.rail-card__head{display:flex;align-items:center;justify-content:space-between;gap:.5rem}
.rail-card__eyebrow{margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.66rem;font-weight:800;letter-spacing:.16em;color:var(--teal)}
.rail-card__note,.rail-card__empty{margin:.55rem 0 0;font-size:.76rem;line-height:1.6;color:var(--body)}
.rail-card__note{padding:.35rem .5rem;background:var(--warm-bg);color:var(--warm-ink)}
.rail-ratio{margin:.3rem 0 .2rem;padding:.25rem .6rem;border-left:3px solid var(--ink);background:var(--formula-bg);font-size:1.15rem}
.rail-count{margin-top:.3rem;padding:.1rem 0 .1rem .55rem;border-left:3px solid var(--if-constructive);overflow-x:auto;overflow-y:hidden}
.rail-count--destructive{border-left-color:var(--if-destructive);border-left-style:dashed}
.rail-counts{margin:.45rem 0 0}.rail-counts--advanced div{display:flex;justify-content:space-between;gap:.5rem;padding:.3rem 0;border-bottom:1px dotted var(--line-strong);font-size:.8rem}
.rail-counts--advanced dt{display:flex;align-items:center;gap:.4rem;margin:0}.rail-counts--advanced dd{margin:0;font-family:ui-monospace,monospace;font-weight:700}.rail-counts--advanced p{margin:.4rem 0 0;font-size:.72rem;line-height:1.5;color:var(--body)}
.if-math{font-size:.9rem;line-height:1.2;overflow-x:auto;overflow-y:hidden}.if-math mjx-container{margin:0!important;min-width:0}.if-math mjx-container svg{max-width:none}
/* MathJax's visually hidden MathML is absolutely positioned and as wide as the text; it would add a phantom scrollbar to short formulas. */
.interference-lab mjx-assistive-mml{width:1px!important;max-width:1px;overflow:hidden}
.rail-ratio{min-height:2.7rem}.rail-counts:not(.rail-counts--advanced) .rail-count{min-height:3.5rem}.measure-formula>.if-math{min-height:1.7rem}.measure-formula--key>.if-math{min-height:2.5rem}
.measure-formulas{display:grid;gap:.15rem;margin-top:.45rem}
.measure-formula{display:flex;align-items:center;gap:.45rem;min-height:1.45rem;white-space:nowrap}
.measure-formula--plain{padding-left:1.65rem}.measure-formula--key{margin-top:.2rem;padding:.2rem .5rem;background:var(--formula-bg)}
.classification{display:grid;gap:.1rem;margin:.45rem 0 0;padding:.4rem .6rem;border-left:3px solid var(--line-strong);background:var(--tint-soft);font-size:.76rem;line-height:1.5;color:var(--body)}
.classification strong{font-size:.82rem;color:var(--ink)}
.classification[data-tone="constructive"]{border-left-color:var(--if-constructive);background:var(--warm-bg)}
.classification[data-tone="destructive"]{border-left-color:var(--if-destructive);background:var(--tint-alpha)}
.interference-readout{padding:.85rem 1rem}
.measure-extra{margin:.55rem 0 0}.measure-extra div{display:flex;justify-content:space-between;gap:.75rem;padding:.18rem 0;border-bottom:1px dotted var(--line-strong)}
.measure-extra dt{font-size:.72rem;color:var(--body)}.measure-extra dd{margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.74rem;font-weight:700}
.interference-waveform{display:block;width:100%;max-width:none;height:auto;border:1px solid var(--line);background:#f7f6f1}
.interference-waveform path{fill:none;stroke:#167d8d;stroke-width:2;vector-effect:non-scaling-stroke}.interference-waveform circle{fill:#d8951d;stroke:#fff;stroke-width:1.5}.interference-waveform .waveform-axis{stroke:rgba(16,27,47,.25);stroke-width:1}
.if-waveform{margin:.4rem 0 0}.if-waveform figcaption{margin:0 0 .3rem;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.64rem;font-weight:700;color:var(--body)}
/* time */
.interference-time{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem .8rem;margin:0;padding:.5rem 1rem;border-top:1px solid var(--line)}
.if-time-slider{display:flex;align-items:center;gap:.6rem;flex:1 1 14rem;min-width:10rem;max-width:28rem;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.7rem;font-weight:700;color:var(--body)}
.if-time-slider>span{white-space:nowrap}.if-time-slider output{display:inline-block;min-width:2.2rem;color:var(--teal)}
.if-time-hint{margin:0;font-size:.72rem;color:var(--body)}
/* activities */
.interference-activities{display:flex;flex-direction:column;min-width:0;min-height:0;border-left:1px solid var(--line);background:var(--tint-soft);padding:0;border-radius:0;border-top:0;border-right:0;border-bottom:0}
.if-act-toggle{display:flex;align-items:center;gap:.5rem;width:100%;min-height:2.6rem;border:0;border-bottom:1px solid var(--line);border-radius:0;background:var(--tint);padding:.45rem .9rem;color:var(--ink);text-align:left;justify-content:flex-start}
.if-act-kicker{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.68rem;font-weight:800;letter-spacing:.14em;color:var(--teal)}
.if-act-current{display:none;min-width:0;font-size:.82rem;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.if-act-toggle-text{margin-left:auto;font-size:.74rem;font-weight:700;color:var(--body)}.if-act-toggle-text::after{content:" ›"}
.if-act-panel{display:flex;flex-direction:column;flex:1;min-height:0}
.interference-activities[data-collapsed="true"] .if-act-panel{display:none}
.interference-activities[data-collapsed="true"] .if-act-toggle{flex-direction:row;justify-content:flex-start;height:100%;padding:.9rem 0;border-bottom:0;writing-mode:vertical-rl}
.interference-activities[data-collapsed="true"] .if-act-toggle-text{display:none}.interference-activities[data-collapsed="true"] .if-act-kicker::before{content:"‹ "}
.interference-tabs{display:flex;gap:.35rem;padding:.6rem .9rem;border-bottom:1px solid var(--line)}
.interference-tabs button{width:2.4rem;height:2.4rem;padding:0;border-radius:50%;font-size:.8rem;font-weight:750}
.interference-tabs button[aria-current="step"]{border-color:var(--primary);background:var(--primary);color:#fff}
.if-act-scroll{flex:1;min-height:0;overflow-y:auto;padding:.9rem 1.05rem 1.2rem}
.if-act-nav{display:flex;justify-content:space-between;padding:.35rem .6rem;border-top:1px solid var(--line)}
.interference-activity{padding:0;max-width:34rem}.interference-activity[hidden],[data-activity-step][hidden]{display:none}
.activity__eyebrow{margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.68rem;font-weight:800;letter-spacing:.14em;color:var(--teal)}
.activity__title{margin:.25rem 0 .4rem;font-size:1.1rem;font-weight:750;line-height:1.4}.activity__title:focus{outline:none}
.activity__lead{margin:0 0 .8rem;font-size:.86rem;line-height:1.7;color:var(--body)}
.activity__notice{margin:0 0 .8rem;padding:.55rem .65rem;background:var(--warm-bg);font-size:.78rem;line-height:1.6;color:var(--warm-ink)}
.activity__small{margin:.5rem 0 0;font-size:.78rem;line-height:1.7;color:var(--body)}
.activity__explain{margin-top:.8rem;padding-top:.7rem;border-top:1px solid var(--line)}
.step{position:relative;margin:0 0 .9rem}
.step__title{margin:0 0 .35rem;padding-inline-start:1.75rem;text-indent:-1.75rem;font-size:.88rem;font-weight:750;line-height:1.5;overflow-wrap:anywhere}
.step__title *{text-indent:0}
.step__title:not(:has(.step__index)){padding-inline-start:0;text-indent:0}
.step__index{display:inline-grid;vertical-align:baseline;place-items:center;width:1.3rem;height:1.3rem;margin-inline-end:.45rem;border-radius:50%;background:var(--primary);font-size:.68rem;color:#fff}
.step.is-done .step__index{font-size:0;background:var(--if-good)}.step.is-done .step__index::after{content:"✓";font-size:.7rem}
.step__body{margin:0 0 .4rem;font-size:.82rem;line-height:1.75;color:var(--body)}
.checklist{display:grid;gap:.4rem;margin:.45rem 0 0;padding:0;list-style:none}
.checklist li{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:.1rem .5rem;padding:.45rem .55rem;border:1px solid var(--line);background:var(--if-panel);font-size:.8rem;line-height:1.5}
.checklist__box{width:1rem;height:1rem;border:1.5px solid var(--line-strong);border-radius:.2rem}
.checklist li.is-done{border-color:var(--if-good);background:var(--ok-bg)}.checklist li.is-done .checklist__box{border-color:var(--if-good);background:var(--if-good);box-shadow:inset 0 0 0 2px var(--if-panel)}
.checklist__value{grid-column:2;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.74rem;font-weight:700;color:var(--if-good)}
.term{font-weight:750}.term--constructive{color:var(--if-term-c)}.term--destructive{color:var(--if-term-d)}
.select-row{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.3rem .6rem;margin:.35rem 0;font-size:.8rem}
.select-row select,.number-row input{border:1px solid var(--line-strong);border-radius:.3rem;background:var(--field-bg);padding:.35rem .45rem;font-size:.85rem;color:var(--ink)}
.number-row{display:flex;flex-wrap:wrap;gap:.6rem 1rem;margin:.4rem 0}.number-row label{display:inline-flex;align-items:center;gap:.45rem;font-size:.82rem;font-weight:650}.number-row input{width:4.6rem;margin-left:0}
.choices{display:grid;gap:.35rem;margin:.4rem 0;border:0;padding:0}.choices legend{margin-bottom:.25rem;padding:0;font-size:.78rem;font-weight:700;color:var(--body)}
.choices label{display:flex;align-items:center;gap:.5rem;margin:0;padding:.45rem .6rem;border:1px solid var(--line);background:var(--if-panel);font-size:.82rem;cursor:pointer}
.choices label:has(input:checked){border-color:var(--primary);box-shadow:inset 3px 0 0 var(--primary)}
.choices--inline{grid-template-columns:1fr 1fr}.choices--inline legend{grid-column:1/-1}
.button-row,.interference-activity-actions{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem .8rem;margin-top:.55rem}
.prediction-echo{margin:0 0 .6rem;padding:.4rem .6rem;background:var(--tint);font-size:.8rem}
.interference-feedback{min-height:0;margin:.6rem 0 0;padding:0;font-size:.8rem;line-height:1.65}.interference-feedback:not(:empty){padding:.55rem .7rem;border-left:3px solid var(--line-strong);background:var(--tint-soft)}
.feedback--good{margin:.6rem 0 0;padding:.55rem .7rem;border-left:3px solid var(--if-good);background:var(--ok-bg);color:var(--ok-ink);font-size:.8rem;line-height:1.65}
.callout{margin:.6rem 0 0;padding:.55rem .7rem;border-left:3px solid var(--teal);background:var(--tint);font-size:.8rem;line-height:1.65}
.formula-pair{display:grid;gap:.35rem}.formula-pair .term{min-width:2.2rem;font-size:.8rem}
.activity__formula{overflow-x:auto;overflow-y:hidden;font-size:.92rem}
.key-list{display:grid;gap:.3rem;margin:.2rem 0 0;padding:0;list-style:none;font-size:.8rem;line-height:1.6}.key-list .if-swatch{margin:0 .3rem}
.edge-status{display:grid;gap:.15rem;margin:.7rem 0 .5rem;padding:.55rem .7rem;border-left:3px solid var(--line-strong);background:var(--if-panel);font-size:.78rem}.edge-status strong{font-size:.92rem}
.edge-cases{margin:0;padding-left:1.1rem;font-size:.78rem;line-height:1.75;color:var(--body)}
/* dialogs */
.interference-dialog{width:min(44rem,calc(100vw - 2rem));max-width:none;max-height:min(85vh,52rem);overflow:auto;border:0;border-radius:6px;padding:0;background:var(--if-panel);color:var(--ink);box-shadow:0 30px 80px rgba(7,17,31,.35)}
.interference-dialog::backdrop{background:rgba(7,17,31,.55)}
.interference-dialog>h2{position:sticky;top:0;z-index:1;margin:0;padding:.9rem 1.25rem;border-bottom:1px solid var(--line);background:var(--if-panel);font-size:1.08rem;font-weight:750}
.interference-dialog>:not(h2){margin-left:1.25rem;margin-right:1.25rem;max-width:calc(100% - 2.5rem);overflow-wrap:anywhere}
.interference-dialog p,.interference-dialog li{font-size:.9rem;line-height:1.85;color:var(--body)}.interference-dialog h3{margin:1.1rem 1.25rem .2rem;font-size:.95rem;font-weight:750}
.interference-dialog mjx-container[display="true"]{max-width:100%;overflow-x:auto;overflow-y:hidden}
/* Inline math must not be a scroll container: overflow other than visible moves its baseline to the bottom edge. */
.interference-dialog mjx-container:not([display="true"]){overflow:visible}
/* Long derivations scroll sideways; edge shadows (drawn only where content is cut off) show that there is more. */
.interference-dialog mjx-container[display="true"]{background:linear-gradient(to right,var(--if-panel),var(--if-panel)) left center/1.2rem 100% no-repeat local,linear-gradient(to left,var(--if-panel),var(--if-panel)) right center/1.2rem 100% no-repeat local,radial-gradient(farthest-side at 0 50%,rgba(0,0,0,.22),transparent) left center/.6rem 100% no-repeat scroll,radial-gradient(farthest-side at 100% 50%,rgba(0,0,0,.22),transparent) right center/.6rem 100% no-repeat scroll}
.interference-dialog button[data-close-dialog]{margin-top:1rem;margin-bottom:1.25rem}
.interference-lab mjx-container[display="true"]{max-width:100%;overflow-x:auto;overflow-y:hidden}
/* projection: field first; toolbar and activities step aside, measurement rail and time bar stay */
.interference-projection{position:fixed;inset:0;z-index:1000;width:auto;margin:0;border:0;border-radius:0;overflow:auto}
.interference-projection .if-body{grid-template-columns:minmax(0,1fr)}.interference-projection .interference-controls,.interference-projection .interference-activities{display:none}
.interference-projection .if-main{grid-template-columns:minmax(0,1fr) 16rem}.interference-projection .if-stage{grid-template-rows:minmax(0,1fr) auto}
@media(min-width:1024px){.interference-lab{height:max(40rem,calc(100svh - clamp(16px,3vw,32px)))}.interference-lab.interference-projection{height:100svh}}
@media(min-width:1024px) and (max-width:1279px){.if-body{grid-template-columns:minmax(0,1fr) 20rem}.if-main{grid-template-columns:minmax(0,1fr) 15rem}.if-control--slider{width:8.5rem}}
@media(max-width:1023px){
  .if-body,.interference-lab[data-sidebar="closed"] .if-body{display:flex;flex-direction:column}
  .interference-activities{order:-1;border-left:0;border-bottom:1px solid var(--line)}
  .if-act-current{display:block}.if-act-toggle-text::after{content:" ▴"}
  .interference-activities[data-collapsed="true"] .if-act-toggle{height:auto;padding:.45rem .9rem;writing-mode:horizontal-tb}
  .interference-activities[data-collapsed="true"] .if-act-toggle-text{display:inline;margin:0 0 0 auto}.interference-activities[data-collapsed="true"] .if-act-kicker::before{content:""}.interference-activities[data-collapsed="true"] .if-act-toggle-text::after{content:" ▾"}
  .if-act-scroll{max-height:none;overflow:visible}
  .if-stage{display:flex;flex-direction:column}.if-main{display:contents}
  .interference-controls{order:0}.if-plot-column{order:1;container-type:inline-size;padding:.6rem}.interference-time{order:2;border-top:0;border-bottom:1px solid var(--line)}.if-rail{order:3;display:grid;grid-template-columns:1fr 1fr;border-left:0;border-top:1px solid var(--line)}
  .interference-plot,.if-view-key{width:100%}.rail-card{border-bottom:0}.rail-card+.rail-card{border-left:1px solid var(--line)}
  .if-advanced{margin-left:0}
  .interference-projection .if-main{display:contents}.interference-projection .if-stage{display:flex}
}
@media(max-width:640px){
  .if-control--views,.if-layers{width:100%}.if-control--slider{width:calc(50% - .3rem)}.interference-controls{gap:.6rem}.if-advanced{width:100%}
  .if-advanced-panel{position:static;width:auto;margin-top:.45rem;box-shadow:none}.if-advanced-grid{grid-template-columns:1fr}
  .if-rail{grid-template-columns:1fr}.rail-card+.rail-card{border-left:0;border-top:1px solid var(--line)}
  .interference-time .btn{flex:1 1 auto}.if-time-slider{flex-basis:100%;max-width:none}.if-view-key{grid-template-columns:auto 1fr auto}
  .choices--inline{grid-template-columns:1fr}.if-segmented label span{padding:.5rem .8rem}.interference-tabs button{width:2.75rem;height:2.75rem}
}
@media(prefers-reduced-motion:reduce){.interference-lab *,.interference-lab *::before,.interference-lab *::after{scroll-behavior:auto!important;animation-duration:.01ms!important;transition-duration:.01ms!important}}
`;
