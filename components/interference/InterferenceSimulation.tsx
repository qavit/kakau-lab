"use client";

import { useEffect, useRef } from "react";
import { mountInterference } from "@/components/interference/mountInterference";

interface InterferenceSimulationProps {
  enabled?: boolean;
}

/** Minimal client host. Gate B1 owns lifecycle only; later slices supply the UI and renderer. */
export default function InterferenceSimulation({ enabled = true }: InterferenceSimulationProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!enabled || !container) return;

    const controller = mountInterference(container);
    return () => controller.dispose();
  }, [enabled]);

  return <div ref={containerRef} data-testid="interference-host" />;
}
