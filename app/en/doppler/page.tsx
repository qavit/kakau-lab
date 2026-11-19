import type { Metadata } from "next";
import { socialMetadata } from "@/lib/site-metadata";
import DopplerLab from "@/components/DopplerLab";
import "../../lab-c2.css";
import "../../doppler-c2.css";

export const metadata: Metadata = {
  title: "Doppler Effect of Sound | Kakau Lab",
  description: "Read the spacing of one train of wavefronts together with the intervals at which they are received, and see why a moving source and a moving observer give different frequency shifts.",
  robots: { index: false, follow: true },
  alternates: {
    canonical: "/en/doppler",
    languages: { "zh-TW": "/doppler", en: "/en/doppler", "x-default": "/doppler" },
  },
  ...socialMetadata({ title: "Doppler Effect of Sound | Kakau Lab", description: "Why a moving source and a moving observer give different frequency shifts", locale: "en_US" }),
};

export default async function EnglishDopplerPage({ searchParams }: { searchParams: Promise<{ s?: string | string[] }> }) {
  const params = await searchParams;
  return <DopplerLab share={params.s} locale="en" />;
}
