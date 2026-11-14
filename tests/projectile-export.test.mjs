import test from 'node:test';
import assert from 'node:assert/strict';
import { initialProjectileState, PROJECTILE_PRESETS, deriveProjectileModel, deriveCursor } from '../models/projectile.ts';
import { projectileResult, projectileResultSvg } from '../models/projectile-export.ts';
import { decodeProjectileShare } from '../models/projectile-serialization.ts';
import { newGuidedSession } from '../models/projectile-learning.ts';
const layers = { trajectory: true, velocity: true, components: true, guides: true, grid: true, labels: true, markers: true };
test('every preset exports the same trajectory and cursor as the model, without mutation', () => {
  for (const preset of Object.values(PROJECTILE_PRESETS)) {
    const state = { ...initialProjectileState(), ...preset };
    const before = JSON.stringify(state);
    const result = projectileResult(state, layers, 0.42, null);
    const model = deriveProjectileModel(state);
    assert.deepEqual(result.trajectories[0].samples, model.trajectory);
    assert.deepEqual(result.cursor, deriveCursor(model, state.gravity, 0.42));
    assert.equal(JSON.stringify(state), before);
    const restored = decodeProjectileShare(JSON.stringify(result.setup));
    assert.equal(restored.error, null);
    assert.equal(restored.state.playing, false);
    assert.deepEqual(deriveProjectileModel(restored.state).trajectory, model.trajectory);
    assert.equal(result.units.position, 'm');
    assert.equal(result.units.velocity, 'm/s');
    assert.deepEqual(projectileResult(state, layers, 0.42, null), result);
  }
});
test('analytic endpoint, staircase origin and drag comparison retain their physical meanings', () => {
  const state = initialProjectileState();
  const result = projectileResult(state, layers, 1, null);
  assert.ok(Math.abs(result.cursor.point.x - state.speed ** 2 / state.gravity) < 1e-8);
  assert.ok(Math.abs(result.cursor.point.y) < 1e-8);
  const stairs = projectileResult({ ...state, ...PROJECTILE_PRESETS.staircase, height: 25 }, layers, 1, null);
  assert.equal(stairs.effectiveHeight, 0);
  assert.ok(stairs.cursor.point.y < 0);
  const drag = projectileResult({ ...state, ...PROJECTILE_PRESETS.drag }, layers, 0, null);
  assert.equal(drag.trajectories.length, 2);
  assert.equal(drag.trajectories[0].id, 'vacuum');
  assert.equal(drag.trajectories[1].id, 'drag');
  assert.ok(drag.trajectories[1].samples.at(-1).point.x < drag.trajectories[0].samples.at(-1).point.x);
});
test('guided phases, invalid setup and invalid cursor fail closed', () => {
  for (const phase of ['predict', 'manipulate', 'observe', 'explain', 'complete']) {
    assert.throws(() => projectileResult(initialProjectileState(), layers, 0, { ...newGuidedSession('apex'), phase }));
  }
  for (const cursor of [NaN, Infinity, -0.1, 1.1]) assert.throws(() => projectileResult(initialProjectileState(), layers, cursor, null));
  for (const gravity of [NaN, Infinity, 0, -1]) assert.throws(() => projectileResult({ ...initialProjectileState(), gravity }, layers, 0, null));
});
test('standalone SVG contains bilingual conditions, labels and escaped reproducibility metadata', () => {
  const result = projectileResult(initialProjectileState(), layers, 0, null);
  const svg = projectileResultSvg(result);
  assert.match(svg, /拋體軌跡 \/ Projectile trajectories/);
  assert.match(svg, /m\/s²/);
  assert.match(svg, /RK4/);
  assert.match(svg, /<metadata>/);
  assert.doesNotMatch(svg, /NaN|Infinity|<script|prediction|explanation/);
  const raw = svg.match(/<metadata>(.*?)<\/metadata>/s)[1].replaceAll('&quot;', '"').replaceAll('&apos;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
  assert.deepEqual(JSON.parse(raw), result);
});
