import type { Metadata } from "next";
import InterferenceSimulation from "@/components/interference/InterferenceSimulation";
import InterferenceSummary from "@/components/interference/InterferenceSummary";
import { MathProvider } from "@/components/math/MathJax";
import { interferenceLearningResource, interferenceSeo, serializeJsonLd } from "@/lib/labs/interference-seo";
import { socialMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = {
  title: interferenceSeo.title,
  description: interferenceSeo.description,
  ...socialMetadata({ title: interferenceSeo.title, description: interferenceSeo.shareDescription, image: interferenceSeo.image }),
  alternates: { canonical: interferenceSeo.path },
};

export default function InterferencePage() {
  return <main>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(interferenceLearningResource()) }} />
    <MathProvider>
      <InterferenceSimulation />
      <InterferenceSummary />
    </MathProvider>
  </main>;
}
