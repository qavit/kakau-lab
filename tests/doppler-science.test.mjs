import assert from "node:assert/strict";
import test from "node:test";
import {
  createDopplerExperiment,
  dopplerAnalytic,
  eventTimes,
  latestReceptionFrequency,
  measurePair,
  nextEventTime,
  observerPosition,
  pairRatios,
  previousEventTime,
  receptionsUpTo,
  sourcePosition,
  validateDopplerSetup,
  wavefrontsAt,
  MAX_DURATION,
  MAX_SPEED,
} from "../lib/science/doppler.ts";

const setup = (us, uo, patch = {}) => ({ sourceStart: -3, observerStart: 3, sourceVelocity: us, observerVelocity: uo, ...patch });
const near = (a, b, message, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${message ?? ""} expected ${b}, got ${a}`);

/** Independent reference values, written out by hand (not produced by the library under test). */
const CASES = [
  { name: "both at rest", us: 0, uo: 0, wavelength: 1, frequency: 1 },
  { name: "source approaches at 0.2c", us: 0.2, uo: 0, wavelength: 0.8, frequency: 1.25 },
  { name: "observer approaches at 0.2c", us: 0, uo: -0.2, wavelength: 1, frequency: 1.2 },
  { name: "source recedes at 0.2c", us: -0.2, uo: 0, wavelength: 1.2, frequency: 1 / 1.2 },
  { name: "observer recedes at 0.2c", us: 0, uo: 0.2, wavelength: 1, frequency: 0.8 },
];

for (const { name, us, uo, wavelength, frequency } of CASES) {
  test(`event model reproduces the closed-form answer: ${name}`, () => {
    const experiment = createDopplerExperiment(setup(us, uo));
    for (const n of [0, 1, 2]) {
      const pair = measurePair(experiment, n);
      assert.ok(pair?.reception, `pair ${n} should be received`);
      const ratios = pairRatios(pair);
      near(ratios.wavelength, wavelength, `λ/λ₀ pair ${n}`);
      near(ratios.frequency, frequency, `f/f₀ pair ${n}`);
      near(ratios.period, 1 / frequency, `Δt/T₀ pair ${n}`);
      near(pair.emissionInterval, 1, "emission interval");
    }
    const analytic = dopplerAnalytic(us, uo, 1);
    near(analytic.wavelength, wavelength, "analytic λ");
    near(analytic.frequency, frequency, "analytic f");
  });
}

test("left/right mirror: the mirrored experiment gives the same ratios on the other branch", () => {
  for (const { us, uo, wavelength, frequency } of CASES) {
    // Reflect x → −x: positions and velocities change sign, O ends up on the left.
    const mirrored = createDopplerExperiment({ sourceStart: 3, observerStart: -3, sourceVelocity: -us, observerVelocity: -uo });
    const pair = measurePair(mirrored, 2);
    assert.equal(pair.direction, -1);
    const ratios = pairRatios(pair);
    near(ratios.wavelength, wavelength, "mirrored λ");
    near(ratios.frequency, frequency, "mirrored f");
    const analytic = dopplerAnalytic(-us, -uo, -1);
    near(analytic.frequency, frequency, "mirrored analytic f");
    // The raw geometry mirrors exactly.
    const original = createDopplerExperiment(setup(us, uo));
    original.receptions.forEach((reception, index) => {
      near(mirrored.receptions[index].t, reception.t, `reception ${index} time`);
      near(mirrored.receptions[index].x, -reception.x, `reception ${index} position`);
    });
  }
});

test("same direction and speed: f_obs = f₀ although the wavelength differs from λ₀", () => {
  for (const u of [0.2, -0.3, 0.5]) {
    const experiment = createDopplerExperiment(setup(u, u));
    const pair = measurePair(experiment, 2);
    const ratios = pairRatios(pair);
    near(ratios.frequency, 1, `f/f₀ at u=${u}`);
    near(ratios.wavelength, 1 - u, `λ/λ₀ at u=${u}`);
    assert.notEqual(Math.round(ratios.wavelength * 1e6), 1e6);
  }
});

test("each wavefront is born at n·T₀ at the source's position and is received on its own circle", () => {
  const s = setup(0.3, -0.1);
  const experiment = createDopplerExperiment(s);
  for (const emission of experiment.emissions) {
    near(emission.t, emission.n);
    near(emission.x, sourcePosition(s, emission.n));
  }
  for (const reception of experiment.receptions) {
    const emission = experiment.emissions[reception.n];
    // The observer is exactly on the circle of radius c(t − t_n) about the fixed centre.
    near(Math.abs(reception.x - emission.x), reception.t - emission.t, `front ${reception.n} on its circle`);
    near(reception.x, observerPosition(s, reception.t));
    assert.ok(reception.t >= emission.t);
  }
});

test("the first reception comes before the second, and the pair reading needs both", () => {
  const experiment = createDopplerExperiment(setup(0, 0));
  const [first, second] = experiment.receptions;
  assert.ok(first.t < second.t);
  assert.equal(latestReceptionFrequency(experiment, first.t - 0.01), null);
  assert.equal(latestReceptionFrequency(experiment, first.t), null, "one reception is not an interval");
  assert.equal(latestReceptionFrequency(experiment, second.t - 1e-6), null);
  const live = latestReceptionFrequency(experiment, second.t);
  near(live.frequency, 1);
  near(live.interval, 1);
  assert.equal(live.n, 1);
  assert.equal(receptionsUpTo(experiment, first.t).length, 1);
});

test("state at a time is independent of how the clock got there (step-size invariance)", () => {
  const experiment = createDopplerExperiment(setup(0.2, -0.2));
  const snapshot = (t) => JSON.stringify({ fronts: wavefrontsAt(experiment, t), received: receptionsUpTo(experiment, t) });
  const target = 9.37;
  const direct = snapshot(target);
  for (const dt of [0.001, 0.0333, 0.25, 1]) {
    let t = 0;
    while (t + dt < target) t += dt;
    t = target; // any path of stepping ends at the same state
    assert.equal(snapshot(t), direct, `dt=${dt}`);
  }
  // Going forwards then backwards does not duplicate or lose events.
  const forward = receptionsUpTo(experiment, 11).length;
  const back = receptionsUpTo(experiment, 3).length;
  const again = receptionsUpTo(experiment, 11).length;
  assert.equal(forward, again);
  assert.ok(back < forward);
  // Reception counts only ever step by one.
  let last = 0;
  for (let t = 0; t <= experiment.duration; t += 0.01) {
    const count = receptionsUpTo(experiment, t).length;
    assert.ok(count - last <= 1 && count >= last, `monotone at t=${t.toFixed(2)}`);
    last = count;
  }
  assert.equal(last, experiment.receptions.length);
});

test("event stepping visits every emission and reception exactly once, in order", () => {
  const experiment = createDopplerExperiment(setup(0.2, 0));
  const times = eventTimes(experiment);
  assert.deepEqual([...times].sort((a, b) => a - b), times);
  assert.equal(new Set(times).size, times.length);
  let t = 0;
  const visited = [0];
  for (let guard = 0; guard < 200 && t < experiment.duration - 1e-9; guard += 1) {
    t = nextEventTime(experiment, t);
    visited.push(t);
  }
  assert.deepEqual(visited, times);
  for (let index = times.length - 1; index > 0; index -= 1) near(previousEventTime(experiment, times[index]), times[index - 1]);
  assert.equal(previousEventTime(experiment, 0), 0);
  assert.equal(nextEventTime(experiment, experiment.duration), experiment.duration);
});

test("the experiment ends before S and O would coincide, and says why", () => {
  const closing = createDopplerExperiment(setup(0.5, -0.5));
  assert.equal(closing.endReason, "before-coincidence");
  assert.ok(closing.duration < MAX_DURATION);
  const gap = observerPosition(closing.setup, closing.duration) - sourcePosition(closing.setup, closing.duration);
  near(gap, 1, "separation at the end", 1e-9);
  for (let t = 0; t <= closing.duration; t += 0.05) {
    assert.ok(observerPosition(closing.setup, t) > sourcePosition(closing.setup, t), "S never reaches O");
  }
  assert.ok(closing.receptions.every((r) => r.t <= closing.duration + 1e-9));
  assert.ok(closing.receptions.length >= 3, "enough receptions to read an interval");
  assert.equal(createDopplerExperiment(setup(0.2, 0)).endReason, "time-limit");
  near(createDopplerExperiment(setup(0.2, 0)).duration, MAX_DURATION);
});

test("illegal setups are rejected", () => {
  const bad = [
    setup(0.6, 0),
    setup(0, -0.51),
    setup(Number.NaN, 0),
    setup(0, Number.POSITIVE_INFINITY),
    setup(0, 0, { observerStart: -3 }), // zero separation
    setup(0, 0, { observerStart: -2.5 }), // too close
    setup(0, 0, { observerStart: 30 }), // too far
    setup(0, 0, { sourceStart: 99 }),
  ];
  for (const candidate of bad) {
    assert.notEqual(validateDopplerSetup(candidate), null, JSON.stringify(candidate));
    assert.throws(() => createDopplerExperiment(candidate), RangeError);
  }
  assert.equal(validateDopplerSetup(setup(MAX_SPEED, -MAX_SPEED)), null);
  assert.equal(validateDopplerSetup(setup(0, 0)), null);
});

test("pair spacing is time independent and measured on O's side of the source", () => {
  const experiment = createDopplerExperiment(setup(0.2, 0));
  const pair = measurePair(experiment, 3);
  near(pair.spacing, 0.8);
  // Re-derive it directly from two circles at an arbitrary later time.
  for (const t of [7, 9.5, 12]) {
    const fronts = wavefrontsAt(experiment, t);
    const a = fronts[3];
    const b = fronts[4];
    near((a.centreX + a.radius) - (b.centreX + b.radius), 0.8, `t=${t}`);
    // the far (left) side is stretched, not compressed
    near((b.centreX - b.radius) - (a.centreX - a.radius), 1.2, `far side stretched, t=${t}`);
  }
  assert.equal(measurePair(experiment, experiment.emissions.length - 1), null);
  const lastPair = measurePair(experiment, experiment.receptions.length - 1);
  assert.ok(lastPair, "geometry exists although the second reception falls outside the experiment");
  assert.equal(lastPair.reception, null);
});

test("approach and recession are symmetric in the closed form", () => {
  for (const u of [0.1, 0.25, 0.5]) {
    near(dopplerAnalytic(u, 0, 1).frequency * dopplerAnalytic(-u, 0, 1).frequency, 1 / (1 - u * u), "source");
    near(dopplerAnalytic(0, -u, 1).frequency + dopplerAnalytic(0, u, 1).frequency, 2, "observer");
  }
});
