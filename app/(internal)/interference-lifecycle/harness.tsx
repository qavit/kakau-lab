"use client";

import { useState } from "react";
import InterferenceSimulation from "@/components/interference/InterferenceSimulation";
import "../../lab-c2.css";

/** Development-only controls used to exercise real React StrictMode effect replay. */
export default function InterferenceLifecycleHarness() {
  const [enabled, setEnabled] = useState(true);

  return (
    <main>
      <button type="button" onClick={() => setEnabled((value) => !value)} data-testid="toggle-interference">
        {enabled ? "Unmount controller" : "Mount controller"}
      </button>
      {enabled ? <InterferenceSimulation /> : null}
    </main>
  );
}
