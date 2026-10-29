import type { Metadata } from "next";
import { socialMetadata } from "@/lib/site-metadata";
import HydrogenLab from "@/components/HydrogenLab";

export const metadata: Metadata = {
  title: "氫原子能階與光譜｜Kakau Lab",
  description: "用玻耳模型的軌道圖、能階圖與譜線，連結電子躍遷、光子能量與氫原子光譜。",
  alternates: { canonical: "/hydrogen" },
  robots: { index: false, follow: true },
  ...socialMetadata({ title: "氫原子能階與光譜｜Kakau Lab", description: "電子在能階間躍遷，放出或吸收的光子就是氫原子光譜的譜線" }),
};

export default function HydrogenPage() {
  return <HydrogenLab />;
}
