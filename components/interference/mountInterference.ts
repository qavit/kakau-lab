/**
 * The small imperative boundary used by the interference React host.
 * Rendering work can be added here in later slices; every browser resource is
 * owned by one mount and released by its returned controller.
 */

export interface InterferenceController {
  dispose(): void;
}

export interface InterferenceRuntime {
  requestAnimationFrame(callback: FrameRequestCallback): number;
  cancelAnimationFrame(id: number): void;
  createResizeObserver(callback: ResizeObserverCallback): Pick<ResizeObserver, "observe" | "disconnect">;
}

const browserRuntime: InterferenceRuntime = {
  requestAnimationFrame: (callback) => window.requestAnimationFrame(callback),
  cancelAnimationFrame: (id) => window.cancelAnimationFrame(id),
  createResizeObserver: (callback) => new ResizeObserver(callback),
};

/**
 * Mounts a hidden placeholder and a frame loop into `container`.
 * The placeholder intentionally has no user-facing simulation UI in Gate B1.
 */
export function mountInterference(
  container: HTMLElement,
  runtime: InterferenceRuntime = browserRuntime,
): InterferenceController {
  const document = container.ownerDocument;
  const runtimeElement = document.createElement("div");
  runtimeElement.dataset.interferenceRuntime = "";
  runtimeElement.setAttribute("aria-hidden", "true");
  container.append(runtimeElement);

  let disposed = false;
  let frameId: number | null = null;
  let frameCount = 0;
  const capturedPointers = new Set<number>();

  const onPointerDown = (event: PointerEvent) => {
    if (disposed || !container.setPointerCapture) return;
    try {
      container.setPointerCapture(event.pointerId);
      capturedPointers.add(event.pointerId);
    } catch {
      // Pointer capture can fail when the pointer was already cancelled.
    }
  };
  const onPointerEnd = (event: PointerEvent) => {
    capturedPointers.delete(event.pointerId);
  };

  container.addEventListener("pointerdown", onPointerDown);
  container.addEventListener("pointerup", onPointerEnd);
  container.addEventListener("pointercancel", onPointerEnd);

  const resizeObserver = runtime.createResizeObserver(() => {
    // Resize callbacks may already be queued when disconnect() runs.
    if (!disposed) runtimeElement.dataset.interferenceResizeObserved = "true";
  });
  resizeObserver.observe(container);

  const frame = () => {
    frameId = null;
    if (disposed || !runtimeElement.isConnected) return;
    frameCount += 1;
    runtimeElement.dataset.interferenceFrame = String(frameCount);
    frameId = runtime.requestAnimationFrame(frame);
  };
  frameId = runtime.requestAnimationFrame(frame);

  return {
    dispose() {
      if (disposed) return;
      disposed = true;

      if (frameId !== null) {
        runtime.cancelAnimationFrame(frameId);
        frameId = null;
      }
      resizeObserver.disconnect();
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointerup", onPointerEnd);
      container.removeEventListener("pointercancel", onPointerEnd);

      for (const pointerId of capturedPointers) {
        try {
          if (container.hasPointerCapture?.(pointerId)) container.releasePointerCapture(pointerId);
        } catch {
          // Disposal is safe even if the browser released capture first.
        }
      }
      capturedPointers.clear();
      runtimeElement.remove();
    },
  };
}
