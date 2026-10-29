import assert from "node:assert/strict";
import test from "node:test";

import { mountInterference } from "../components/interference/mountInterference.ts";

class FakeElement {
  constructor(ownerDocument, tagName = "div") {
    this.ownerDocument = ownerDocument;
    this.tagName = tagName;
    this.dataset = {};
    this.style = {};
    this.attributes = new Map();
    this.children = [];
    this.listeners = new Map();
    this.capturedPointers = new Set();
    this.parentElement = null;
    this.queryMap = new Map();
    this.checked = false;
    this.value = "0";
    this.hidden = false;
    this.textContent = "";
    this.width = 0;
    this.height = 0;
  }

  get isConnected() { return this.parentElement !== null; }
  setAttribute(name, value) { this.attributes.set(name, value); }
  append(child) { child.parentElement = this; this.children.push(child); }
  replaceChildren(...nodes) { for (const child of this.children) child.parentElement = null; this.children = []; nodes.forEach((child) => this.append(child)); }
  remove() {
    if (!this.parentElement) return;
    this.parentElement.children = this.parentElement.children.filter((child) => child !== this);
    this.parentElement = null;
  }
  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  dispatch(type, event = {}) {
    for (const listener of this.listeners.get(type) ?? []) listener({ type, target: this, currentTarget: this, ...event });
  }
  dispatchEvent(event) { this.dispatch(event.type, event); return true; }
  querySelector(selector) { return this.queryMap.get(selector) ?? null; }
  querySelectorAll() { return []; }
  getBoundingClientRect() { return { width: 480, height: 480, left: 0, top: 0, right: 480, bottom: 480, x: 0, y: 0, toJSON() {} }; }
  getContext() {
    return {
      createImageData: (width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) }),
      putImageData() {}, setTransform() {}, clearRect() {}, drawImage() {},
    };
  }
  setPointerCapture(pointerId) { this.capturedPointers.add(pointerId); }
  hasPointerCapture(pointerId) { return this.capturedPointers.has(pointerId); }
  releasePointerCapture(pointerId) { this.capturedPointers.delete(pointerId); }
}

function createRuntime() {
  globalThis.window = { devicePixelRatio: 1 };
  const document = {
    createElement(tagName) { return new FakeElement(document, tagName); },
    createElementNS(_namespace, tagName) { return new FakeElement(document, tagName); },
  };
  const container = new FakeElement(document);
  const canvas = new FakeElement(document, "canvas");
  const svg = new FakeElement(document, "svg");
  const plot = new FakeElement(document);
  const runtimeElementNodes = {};
  const add = (selector, tagName = "input") => {
    const element = new FakeElement(document, tagName);
    container.queryMap.set(selector, element);
    return element;
  };
  container.queryMap.set("canvas[data-interference-canvas]", canvas);
  container.queryMap.set("svg[data-interference-overlay]", svg);
  container.queryMap.set("[data-interference-plot]", plot);
  for (const name of ["wavefronts", "conditions", "measurement", "sources"]) {
    const layer = new FakeElement(document, "g");
    svg.queryMap.set(`[data-layer="${name}"]`, layer);
  }
  for (const name of ["constructive", "destructive", "wavefronts"]) add(`[data-control="${name}"]`).checked = name !== "wavefronts";
  add('[data-control="time-cycle"]');
  add('[data-action="play-pause"]', "button");
  add('[data-action="clear-point"]', "button");
  add("[data-point-values]", "div");
  add("[data-point-empty]", "p");
  add("[data-point-position]", "p");
  const frames = new Map();
  const cancelledFrames = [];
  const observers = [];
  let nextFrameId = 1;
  const runtime = {
    requestAnimationFrame(callback) { const id = nextFrameId++; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { cancelledFrames.push(id); frames.delete(id); },
    createResizeObserver(callback) {
      const observer = {
        callback, observed: [], disconnectCalls: 0,
        observe(target) { this.observed.push(target); },
        disconnect() { this.disconnectCalls += 1; },
        trigger() { this.callback([], this); },
      };
      observers.push(observer);
      return observer;
    },
  };
  return { container, canvas, plot, runtime, frames, cancelledFrames, observers, runtimeElementNodes };
}

const listenerCount = (element) => [...element.listeners.values()].reduce((sum, listeners) => sum + listeners.size, 0);

test("mount owns its renderer DOM, listeners, observer, frame, and pointer capture", () => {
  const { container, plot, runtime, frames, observers } = createRuntime();
  const controller = mountInterference(container, runtime);
  const runtimeElement = container.children[0];

  assert.equal(container.children.length, 1);
  assert.equal(runtimeElement.dataset.interferenceRuntime, "");
  assert.equal(runtimeElement.hidden, true);
  assert.equal(listenerCount(plot), 6, "pointer lifecycle, double-click removal, and keyboard movement are each bound once");
  assert.equal(frames.size, 0, "paused mounts do not schedule animation frames");
  assert.deepEqual(observers[0].observed, [plot]);

  plot.dispatch("pointerdown", { pointerId: 17, clientX: 240, clientY: 240 });
  assert.equal(plot.hasPointerCapture(17), true);

  const frameBeforeResize = runtimeElement.dataset.interferenceFrame;
  observers[0].trigger();
  assert.ok(Number(runtimeElement.dataset.interferenceFrame) > Number(frameBeforeResize));

  container.queryMap.get('[data-action="play-pause"]').dispatch("click");
  assert.equal(frames.size, 1);
  const [frameId, callback] = frames.entries().next().value;
  frames.delete(frameId);
  callback(16);
  assert.ok(Number(runtimeElement.dataset.interferenceFrame) > Number(frameBeforeResize));
  assert.equal(frames.size, 1, "playing schedules exactly one successor frame");

  controller.dispose();
});

test("dispose cancels pending work, releases resources, removes listeners, and is idempotent", () => {
  const { container, plot, runtime, frames, cancelledFrames, observers } = createRuntime();
  const controller = mountInterference(container, runtime);
  const play = container.queryMap.get('[data-action="play-pause"]');
  play.dispatch("click");
  const [pendingFrameId, pendingCallback] = frames.entries().next().value;
  const runtimeElement = container.children[0];
  plot.dispatch("pointerdown", { pointerId: 4, clientX: 240, clientY: 240 });

  controller.dispose();
  controller.dispose();

  assert.deepEqual(cancelledFrames, [pendingFrameId]);
  assert.equal(frames.size, 0);
  assert.equal(observers[0].disconnectCalls, 1);
  assert.equal(listenerCount(plot), 0);
  assert.equal(container.children.length, 0);
  assert.equal(plot.hasPointerCapture(4), false);

  const frameBeforeLateCallback = runtimeElement.dataset.interferenceFrame;
  pendingCallback(32);
  observers[0].trigger();
  assert.equal(runtimeElement.dataset.interferenceFrame, frameBeforeLateCallback);
  assert.equal(frames.size, 0, "a callback queued before disposal cannot schedule another frame");
});

test("mount-dispose-remount models StrictMode effect replay without accumulating resources", () => {
  const { container, plot, runtime, frames, observers } = createRuntime();
  const first = mountInterference(container, runtime);
  first.dispose();
  const second = mountInterference(container, runtime);

  assert.equal(container.children.length, 1);
  assert.equal(listenerCount(plot), 6);
  assert.equal(frames.size, 0, "the remounted host remains paused");
  assert.equal(observers.length, 2);
  assert.equal(observers[0].disconnectCalls, 1);
  assert.deepEqual(observers[1].observed, [plot]);

  second.dispose();
  assert.equal(container.children.length, 0);
  assert.equal(listenerCount(plot), 0);
  assert.equal(frames.size, 0);
  assert.equal(observers[1].disconnectCalls, 1);
});
