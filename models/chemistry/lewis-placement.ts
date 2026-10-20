import { setLonePairs, type LewisDiagram } from "./lewis.ts";
/** Drawing-side convention, not a spatial electron-orbital claim. */
export type PairSite = "top" | "bottom" | "outer" | "inner";
export type PairPlacement = Readonly<Record<string, readonly PairSite[]>>;
export const initialPairPlacement = (): PairPlacement => ({ "o-left": [], c: [], "o-right": [] });
export const availableSites = (id: string): readonly PairSite[] =>
  id === "c" ? ["top", "bottom"] : id === "o-left" || id === "o-right" ? ["top", "bottom", "outer"] : [];
export function togglePairSite(placements: PairPlacement, id: string, site: PairSite): PairPlacement {
  if (!availableSites(id).includes(site) || !placements[id]) return placements;
  const previous = placements[id];
  return { ...placements, [id]: previous.includes(site) ? previous.filter(x => x !== site) : [...previous, site] };
}
export function applyPairPlacement(diagram: LewisDiagram, placements: PairPlacement): LewisDiagram {
  return diagram.atoms.reduce((state, atom) => setLonePairs(state,atom.id,placements[atom.id]?.length ?? 0),diagram);
}
