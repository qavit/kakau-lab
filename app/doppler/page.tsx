import type { Metadata } from "next";
import { socialMetadata } from "@/lib/site-metadata";
import DopplerLab from "@/components/DopplerLab";
import "../lab-c2.css";
import "../doppler-c2.css";

export const metadata: Metadata = {
  title: "聲音的都普勒效應｜Kakau Lab",
  description: "把同一列波前的空間間距和接收間隔放在一起看，理解波源移動與觀察者移動為什麼得到不同的頻移。",
  // Prototype: reachable by direct URL only, never indexed.
  robots: { index: false, follow: true },
  alternates: {
    canonical: "/doppler",
    languages: { "zh-TW": "/doppler", en: "/en/doppler", "x-default": "/doppler" },
  },
  ...socialMetadata({ title: "聲音的都普勒效應｜Kakau Lab", description: "波源移動與觀察者移動，為什麼頻移不同", locale: "zh_TW" }),
};

export default async function DopplerPage({ searchParams }: { searchParams: Promise<{ s?: string | string[] }> }) {
  const params = await searchParams;
  return <DopplerLab share={params.s} locale="zh-TW" />;
}
