"use client";

import { useEffect, type RefObject } from "react";

/** Publishes the header's bottom edge, in viewport pixels, as `--lab-appbar-bottom` on the page shell so a
 *  fixed side drawer can start below the header and leave its controls (the appearance menu included) usable.
 *  Same idea Projectile already uses; written to the style directly so scrolling never re-renders the lab. */
export function useAppBarClearance(shell: RefObject<HTMLElement | null>, bar: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = shell.current;
    const header = bar.current;
    if (!root || !header) return;
    const update = () => root.style.setProperty("--lab-appbar-bottom", `${Math.max(0, Math.round(header.getBoundingClientRect().bottom))}px`);
    const observer = new ResizeObserver(update);
    observer.observe(header);
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
    };
  }, [shell, bar]);
}
