import type { Metadata } from "next";
import LewisStudio from "@/components/chemistry/LewisStudio";
export const metadata: Metadata = {
  title: "Lewis Studio｜Kakau Lab",
  description: "從價電子、鍵級與孤對電子自己建立 CO₂ 的路易斯結構，提交、診斷並修正。",
  robots: { index: false, follow: false },
};
export default function LewisStudioPage() { return <LewisStudio />; }
