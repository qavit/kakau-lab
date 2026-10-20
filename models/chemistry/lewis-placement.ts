import { setLonePairs, type LewisDiagram } from "./lewis.ts";
/** A Lewis-dot layout convention; sites are not literal electron coordinates or VSEPR predictions. */
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
/** Students select atoms; layout is deterministic and deliberately non-spatial. */
export function changePairCount(placements: PairPlacement, id: string, delta: -1 | 1): PairPlacement {
  const sites=availableSites(id);const current=placements[id];
  if (!current) return placements;
  const next=delta===1 ? sites.find(s=>!current.includes(s)) : current[current.length-1];
  return next ? togglePairSite(placements,id,next) : placements;
}
export function applyPairPlacement(diagram: LewisDiagram, placements: PairPlacement): LewisDiagram {
  return diagram.atoms.reduce((state, atom) => setLonePairs(state,atom.id,placements[atom.id]?.length ?? 0),diagram);
}
/** A bond line counts as a shared pair around EACH bonded atom (not twice in the molecule budget). */
export function octetInspection(diagram: LewisDiagram,id: string) {
  const atom=diagram.atoms.find(a=>a.id===id);
  if (!atom) return null;
  const bondingPairs=diagram.bonds.filter(b=>b.a===id||b.b===id).reduce((n,b)=>n+b.order,0);
  const nonbondingElectrons=atom.lonePairs*2;
  return {bondingElectrons:bondingPairs*2,nonbondingElectrons,total:bondingPairs*2+nonbondingElectrons,target:8};
}
