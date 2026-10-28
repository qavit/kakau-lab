import assert from "node:assert/strict";
import test from "node:test";

import { mountInterference } from "../components/interference/mountInterference.ts";

class FakeElement {
  constructor(ownerDocument, tagName = "div") {
    this.ownerDocument = ownerDocument;
    this.tagName = tagName;
    this.dataset = {};
    this.attributes = new Map();
    this.children = [];
    this.listeners = new Map();
    this.capturedPointers = new Set();
    this.parentElement = null;
  }

  get isConnected() {
    return this.parentElement !== null;
  }

  setAttribute(name, value) { this.attributes.set(name, value); }
  append(child) { child.parentElement = this; this.children.push(child); }
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
    for (const listener of this.listeners.get(type) ?? []) listener({ type, ...event });
  }
  setPointerCapture(pointerId) { this.capturedPointers.add(pointerId); }
  hasPointerCapture(pointerId) { return this.capturedPointers.has(pointerId); }
  releasePointerCapture(pointerId) { this.capturedPointers.delete(pointerId); }
}

function createRuntime() {
  const document = { createElement: (tagName) => new FakeElement(document, tagName) };
  const container = new FakeElement(document);
  const frames = new Map();
  const cancelledFrames = [];
  const observers = [];
  let nextFrameId = 1;

  const runtime = {
    requestAnimationFrame(callback) {
      const id = nextFrameId++;
      frames.set(id, callback);
      return id;
    },
    cancelAnimationFrame(id) {
      cancelledFrames.push(id);
      frames.delete(id);
    },
    createResizeObserver(callback) {
      const observer = {
        callback,
        observed: [],
        disconnectCalls: 0,
        observe(target) { this.observed.push(target); },
        disconnect() { this.disconnectCalls += 1; },
        trigger() { this.callback([], this); },
      };
      observers.push(observer);
      return observer;
    },
  };

  return { container, runtime, frames, cancelledFrames, observers };
}

const listenerCount = (element) => [...element.listeners.values()].reduce((sum, listeners) => sum + listeners.size, 0);

test("mount owns its placeholder, listeners, observer, frame, and pointer capture", () => {
  const { container, runtime, frames, observers } = createRuntime();
  const controller = mountInterference(container, runtime);

  assert.equal(container.children.length, 1);
  assert.equal(container.children[0].attributes.get("aria-hidden"), "true");
  assert.equal(listenerCount(container), 3);
  assert.equal(frames.size, 1);
  assert.deepEqual(observers[0].observed, [container]);

  container.dispatch("pointerdown", { pointerId: 17 });
  assert.equal(container.hasPointerCapture(17), true);

  observers[0].trigger();
  assert.equal(container.children[0].dataset.interferenceResizeObserved, "true");

  const [frameId, callback] = frames.entries().next().value;
  frames.delete(frameId);
  callback(16);
  assert.equal(container.children[0].dataset.interferenceFrame, "1");
  assert.equal(frames.size, 1, "the active frame schedules exactly one successor");

  controller.dispose();
});

test("dispose cancels pending work, releases resources, removes listeners, and is idempotent", () => {
  const { container, runtime, frames, cancelledFrames, observers } = createRuntime();
  const controller = mountInterference(container, runtime);
  const [pendingFrameId, pendingCallback] = frames.entries().next().value;
  const runtimeElement = container.children[0];
  container.dispatch("pointerdown", { pointerId: 4 });

  controller.dispose();
  controller.dispose();

  assert.deepEqual(cancelledFrames, [pendingFrameId]);
  assert.equal(frames.size, 0);
  assert.equal(observers[0].disconnectCalls, 1);
  assert.equal(listenerCount(container), 0);
  assert.equal(container.children.length, 0);
  assert.equal(container.hasPointerCapture(4), false);

  const frameBeforeLateCallback = runtimeElement.dataset.interferenceFrame;
  pendingCallback(32);
  observers[0].trigger();
  assert.equal(runtimeElement.dataset.interferenceFrame, frameBeforeLateCallback);
  assert.equal(runtimeElement.dataset.interferenceResizeObserved, undefined);
  assert.equal(frames.size, 0, "a callback queued before disposal cannot schedule another frame");
});

test("mount-dispose-remount models StrictMode effect replay without accumulating resources", () => {
  const { container, runtime, frames, observers } = createRuntime();
  const first = mountInterference(container, runtime);
  first.dispose();
  const second = mountInterference(container, runtime);

  assert.equal(container.children.length, 1);
  assert.equal(listenerCount(container), 3);
  assert.equal(frames.size, 1);
  assert.equal(observers.length, 2);
  assert.equal(observers[0].disconnectCalls, 1);
  assert.deepEqual(observers[1].observed, [container]);

  second.dispose();
  assert.equal(container.children.length, 0);
  assert.equal(listenerCount(container), 0);
  assert.equal(frames.size, 0);
  assert.equal(observers[1].disconnectCalls, 1);
});
