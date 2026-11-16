"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),summary,[tabindex]:not([tabindex="-1"])';

/**
 * In-window expansion for one scientific view at a time.
 *
 * The view is enlarged with CSS on the element that is already mounted, so its selection, zoom
 * and time carry over by construction — nothing is re-created. Native fullscreen is an optional
 * extra on top: if the browser refuses it, the in-window expansion is still there and the reason
 * is reported instead of being swallowed.
 *
 * Presentation only. Which views exist, and what they show, stays with each lab.
 */
export function useExpandedView<View extends string>() {
  const [expanded, setExpanded] = useState<View | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const expand = useCallback((view: View, trigger?: HTMLElement | null) => {
    triggerRef.current = trigger ?? (document.activeElement as HTMLElement | null);
    setNotice(null);
    setExpanded(view);
  }, []);

  const collapse = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    setExpanded(null);
    setNotice(null);
    // The trigger may be re-rendered by the collapse; wait a frame before handing focus back.
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  const requestFullscreen = useCallback(async () => {
    const target = containerRef.current;
    try {
      if (!target?.requestFullscreen) throw new Error("unsupported");
      await target.requestFullscreen();
      setNotice(null);
    } catch {
      setNotice("這個瀏覽器目前無法進入全螢幕；視窗內放大仍可使用。");
    }
  }, []);

  useEffect(() => {
    if (expanded === null) return;
    const container = containerRef.current;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    container?.querySelector<HTMLElement>("[data-expanded-exit]")?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); collapse(); return; }
      if (event.key !== "Tab" || !container) return;
      const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.getClientRects().length > 0);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (!active || !container.contains(active)) { event.preventDefault(); first.focus(); }
      else if (event.shiftKey && active === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      root.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [expanded, collapse]);

  /** Attach to the element of the view that is currently expanded. */
  const bind = useCallback((view: View) => (element: HTMLElement | null) => {
    if (expanded === view) containerRef.current = element;
  }, [expanded]);

  return { expanded, notice, expand, collapse, requestFullscreen, bind };
}
