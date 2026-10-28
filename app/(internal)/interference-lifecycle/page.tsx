import { notFound } from "next/navigation";
import { StrictMode } from "react";
import InterferenceLifecycleHarness from "./harness";

/** The route exists for development E2E only and returns 404 in production builds. */
export default function InterferenceLifecyclePage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <StrictMode>
      <InterferenceLifecycleHarness />
    </StrictMode>
  );
}
