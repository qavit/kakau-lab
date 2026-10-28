"use client";

import { useState } from "react";
import InterferenceSimulation from "@/components/interference/InterferenceSimulation";

/** Development-only controls used to exercise real React StrictMode effect replay. */
export default function InterferenceLifecycleHarness() {
  const [enabled, setEnabled] = useState(true);

  return (
    <main>
      <button type="button" onClick={() => setEnabled((value) => !value)} data-testid="toggle-interference">
        {enabled ? "Unmount controller" : "Mount controller"}
      </button>
      <InterferenceSimulation enabled={enabled} />
    </main>
  );
}
