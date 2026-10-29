import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import * as h from "../lib/science/hydrogen.ts";
import { fireBlock, fireTransition, placeElectron } from "../models/hydrogen.ts";
import {
  FREE_POLICY,
  GUESS_OPTIONS,
  OBSERVED_NM,
  balmerLineName,
  beginPredicting,
  canShowEvidence,
  chooseGuess,
  compareGuess,
  comparisonFeedback,
  evidencePolicy,
  evidenceTransition,
  guidedPhysicsState,
  initialLearning,
  retryGuess,
  revealHint,
  showEvidence,
  submitGuess,
} from "../models/hydrogen-learning.ts";

const predicting = () => beginPredicting(initialLearning());

test("a guided session starts at observe with nothing chosen", () => {
  const s = initialLearning();
  assert.equal(s.phase, "observe");
  assert.equal(s.guess, null);
  assert.equal(s.compared, null);
  assert.equal(s.hint, 0);
  assert.equal(chooseGuess(s, 4).guess, null, "no choosing before the predict step");
  assert.equal(submitGuess(s), s);
  assert.equal(showEvidence(s), s, "evidence cannot be skipped to from observe");
  assert.equal(beginPredicting(s).phase, "predict");
});

test("only the four offered levels can be chosen, and a submit needs a choice", () => {
  assert.deepEqual([...GUESS_OPTIONS], [3, 4, 5, 6]);
  const s = predicting();
  assert.equal(chooseGuess(s, 2), s);
  assert.equal(chooseGuess(s, 7), s);
  assert.equal(chooseGuess(s, 4.5), s);
  assert.equal(submitGuess(s), s, "no submit without a selection");
  assert.equal(chooseGuess(chooseGuess(s, 3), 5).guess, 5, "the choice can be changed before submitting");
});

test("guessing n=4 gives the Hβ wavelength from the science layer", () => {
  const c = compareGuess(4);
  assert.equal(c.wavelength, h.transition(4, 2).wavelength);
  assert.ok(Math.abs(c.wavelength - 486.0) < 0.1);
  assert.equal(c.correct, true);
  assert.equal(c.verdict, "match");
  assert.ok(Math.abs(c.deltaE - 2.5511) < 0.001);
  assert.equal(c.observed, OBSERVED_NM);
  assert.match(comparisonFeedback(c), /吻合/);
  assert.equal(evidenceTransition().upper, 4);
});

test("a wrong guess is compared by its own model wavelength with a physical hint", () => {
  for (const [guess, verdict, wording] of [[3, "too-long", /太小.*能量差更大/], [5, "too-short", /太大.*能量差較小/], [6, "too-short", /太大.*能量差較小/]]) {
    const c = compareGuess(guess);
    assert.equal(c.upper, guess);
    assert.equal(c.lower, 2);
    assert.equal(c.wavelength, h.transition(guess, 2).wavelength, `n=${guess}: wavelength from the science layer`);
    assert.equal(c.deltaE, h.transition(guess, 2).photonEnergy);
    assert.equal(c.correct, false);
    assert.equal(c.verdict, verdict);
    assert.ok(Math.abs(c.differenceNm - (c.wavelength - OBSERVED_NM)) < 1e-9);
    const text = comparisonFeedback(c);
    assert.ok(text.includes(`${c.wavelength.toFixed(1)} nm`), `n=${guess}: feedback names the student's own model wavelength`);
    assert.ok(text.includes(`${OBSERVED_NM} nm`));
    assert.match(text, wording);
    assert.doesNotMatch(text, /n=4|正確答案|答錯/, "feedback never names the answer");
  }
  assert.ok(Math.abs(compareGuess(3).wavelength - 656.1) < 0.2);
  assert.ok(Math.abs(compareGuess(5).wavelength - 433.9) < 0.2);
  assert.ok(Math.abs(compareGuess(6).wavelength - 410.1) < 0.2);
});

test("submit, retry, hints and evidence move the learning state as designed", () => {
  let s = predicting();
  assert.equal(canShowEvidence(s), false, "no evidence shortcut before any comparison");
  assert.equal(showEvidence(s), s);

  s = revealHint(revealHint(revealHint(s)));
  assert.equal(s.hint, 2, "hints stop at two layers");

  s = submitGuess(chooseGuess(s, 3));
  assert.equal(s.phase, "compared");
  assert.equal(s.compared, 3);
  assert.equal(s.attempts, 1);
  assert.equal(s.hint, 2);

  const retried = retryGuess(s);
  assert.equal(retried.phase, "predict");
  assert.equal(retried.guess, null, "re-predicting starts from a fresh choice");
  assert.equal(retried.compared, null);
  assert.equal(retried.hint, 2, "revealed hints stay revealed");
  assert.equal(retried.attempts, 1);
  assert.equal(canShowEvidence(retried), true, "evidence is the student's choice once one guess was compared");

  s = showEvidence(s);
  assert.equal(s.phase, "evidence");
  assert.equal(s.compared, 3, "the earlier guess is kept for the comparison note");
  assert.equal(retryGuess(s), s);
  assert.equal(chooseGuess(s, 4), s);
  assert.equal(submitGuess(s), s);
});

test("hints never name the answer or give the evidence away", async () => {
  const card = await readFile(new URL("../components/hydrogen/GuidedCard.tsx", import.meta.url), "utf8");
  const hints = card.slice(card.indexOf("const HINTS"), card.indexOf("export default function"));
  assert.match(hints, /波長越短，光子能量越高/);
  assert.match(hints, /E = hc\/λ/);
  assert.doesNotMatch(hints, /n=4|n = 4|Hβ|第四/);
});

test("learning actions never touch the physical state: no electron move, no fired transition", () => {
  const physics = guidedPhysicsState();
  const snapshot = structuredClone(physics);
  assert.equal(physics.electronLevel, 4);
  assert.equal(physics.photonProgress, null);

  let s = predicting();
  for (const guess of [3, 5, 6, 4]) {
    s = submitGuess(chooseGuess(s, guess));
    s = guess === 4 ? s : retryGuess(s);
  }
  s = showEvidence(s);
  assert.equal(s.phase, "evidence");
  assert.deepEqual(physics, snapshot, "no learning action received or changed the physical state");
});

test("the guided atom fires only through fireBlock", () => {
  let physics = guidedPhysicsState();
  assert.equal(fireBlock(physics), null, "electron starts on n=4, so the Hβ photon can be emitted");
  physics = fireTransition(physics);
  assert.equal(physics.electronLevel, 2);
  assert.equal(physics.photonProgress, 0);
  assert.deepEqual(fireBlock(physics), { reason: "in-flight" });
  assert.equal(fireTransition(physics), physics, "a blocked fire returns the state unchanged");
  const landed = { ...physics, photonProgress: null };
  assert.deepEqual(fireBlock(landed), { reason: "electron-not-at-start", requiredLevel: 4 });
  assert.equal(fireTransition(landed), landed);
  assert.equal(fireBlock(placeElectron(landed, 4)), null, "restaging the electron re-enables the transition");
});

test("evidence policy hides orbit, energy diagram, readout and level names until the student asks", () => {
  const hiddenPhases = [initialLearning(), predicting(), submitGuess(chooseGuess(predicting(), 3))];
  for (const phase of hiddenPhases) {
    const p = evidencePolicy(phase);
    assert.equal(p.orbitView, false, phase.phase);
    assert.equal(p.energyView, false, phase.phase);
    assert.equal(p.transitionReadout, false, phase.phase);
    assert.equal(p.levelLabels, false, phase.phase);
    assert.equal(p.spectrumSelectable, false, phase.phase);
    assert.equal(p.targetEmphasis, true, phase.phase);
  }
  assert.equal(evidencePolicy(initialLearning()).predictionMarker, false);
  assert.equal(evidencePolicy(initialLearning()).comparisonCard, false);
  const compared = evidencePolicy(submitGuess(chooseGuess(predicting(), 3)));
  assert.equal(compared.predictionMarker, true);
  assert.equal(compared.comparisonCard, true);

  const evidence = evidencePolicy(showEvidence(submitGuess(chooseGuess(predicting(), 3))));
  assert.equal(evidence.orbitView, true);
  assert.equal(evidence.energyView, true);
  assert.equal(evidence.transitionReadout, true);
  assert.equal(evidence.levelLabels, true);
  assert.equal(evidence.spectrumSelectable, false, "guided lines stay unselectable so the evidence cannot be re-pointed");

  assert.deepEqual(evidencePolicy(null), FREE_POLICY);
  assert.ok(Object.entries(FREE_POLICY).filter(([key]) => key !== "targetEmphasis" && key !== "predictionMarker" && key !== "comparisonCard").every(([, value]) => value === true), "free exploration is unrestricted");
});

test("Balmer line names are only a lookup for levels the policy allows", () => {
  assert.equal(balmerLineName(3), "Hα");
  assert.equal(balmerLineName(4), "Hβ");
  assert.equal(balmerLineName(9), null);
});

test("layering: the learning module has no React, Three or components, and the card gets the readout only from its parent", async () => {
  const [learning, card] = await Promise.all([
    readFile(new URL("../models/hydrogen-learning.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/hydrogen/GuidedCard.tsx", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(learning, /from "(react|three)|components\/|lib\/render/);
  assert.match(learning, /from "\.\.\/lib\/science\/hydrogen\.ts"/);
  assert.doesNotMatch(card, /deriveHydrogenModel|initialHydrogenState|guidedPhysicsState/, "the card cannot build physical state itself");
});

test("labelledLines keeps forced labels first and drops neighbours instead of overlapping", async () => {
  const { labelledLines } = await import("../components/hydrogen/spectrum.ts");
  // Three lines 24 px apart; with a 40 px gap greedy-from-the-left would drop the middle (forced) one.
  assert.deepEqual(labelledLines([65, 89, 141], 40), [true, false, true]);
  assert.deepEqual(labelledLines([65, 89, 141], 40, [1]), [false, true, true], "the forced line wins its neighbourhood");
  const lone = labelledLines([10, 200, 400], 40, [2]);
  assert.deepEqual(lone, [true, true, true]);
});
