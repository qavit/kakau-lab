import type { MetadataRoute } from "next";
import { catalogLabs } from "@/lib/labs/registry";

/** Non-Lab supporting pages. Lab routes are derived from the registry, never listed here. */
const staticPublishedPaths = [
  "/",
  "/about",
  "/electrostatics/notes",
  "/en/atmosphere-profile",
  "/projectile/notes",
] as const;

/** Only catalog-eligible labs hosted by this app; external labs (kakau-web) live on another host. */
const catalogLocalLabPaths = (): string[] =>
  catalogLabs().flatMap((lab) => (lab.implementation.app === "kakau-lab" ? [lab.implementation.route] : []));

/** Index only published routes. A locale peer appears here only after its reviewed content exists. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [...staticPublishedPaths, ...catalogLocalLabPaths()].map((path) => ({
    url: new URL(path, "https://lab.kakau.tw").href,
  }));
}
