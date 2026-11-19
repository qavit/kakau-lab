"use client";

import { useEffect, useState, type RefObject } from "react";

/** Rendered size of an element, so an SVG can be drawn at exactly the pixels it occupies (type stays legible). */
export function useElementSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: Math.round(entry.contentRect.width), height: Math.round(entry.contentRect.height) });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}
