/** Learner-edited Lewis graph and its validator. Correctness depends on the graph, never on coordinates. */
import { SPECIES, VALENCE_ELECTRONS, shellTarget, valenceTotal, type Element, type SpeciesDefinition, type SpeciesId } from "./lewis-species.ts";
export type { Element, SpeciesId } from "./lewis-species.ts";
export type LewisAtom = Readonly<{ id: string; element: Element; lonePairs: number }>;
export type LewisBond = Readonly<{ a: string; b: string; order: number }>;
export type LewisDiagram = Readonly<{
  speciesId: SpeciesId; charge: 0;
  atoms: readonly LewisAtom[]; bonds: readonly LewisBond[];
}>;
export type LewisCode =
  | "invalid-structure" | "missing-bond" | "electron-excess" | "electron-deficit"
  | "duet" | "octet" | "formal-charge" | "pass";
export type LewisEvaluation = Readonly<{
  code: LewisCode; pass: boolean;
  usedElectrons: number; expectedElectrons: number;
  shells: Readonly<Record<string, number>>;
  targets: Readonly<Record<string, number>>;
  formalCharges: Readonly<Record<string, number>>;
  /** Atoms behind a duet / octet / formal-charge diagnosis, in diagram order. */
  problemAtoms: readonly string[];
}>;
const MAX_ORDER = 3;
const MAX_LONE_PAIRS = 4;

export function initialDiagram(speciesId: SpeciesId): LewisDiagram {
  const species = SPECIES[speciesId];
  return {
    speciesId, charge: 0,
    atoms: species.atoms.map((a) => ({ id: a.id, element: a.element, lonePairs: 0 })),
    bonds: species.bonds.map(([a, b]) => ({ a, b, order: 0 })),
  };
}
export const initialCo2 = (): LewisDiagram => initialDiagram("co2");

const sameBond = (bond: LewisBond, a: string, b: string) =>
  (bond.a === a && bond.b === b) || (bond.a === b && bond.b === a);

export function setBondOrder(diagram: LewisDiagram, a: string, b: string, order: number): LewisDiagram {
  if (!Number.isInteger(order) || order < 0 || order > MAX_ORDER) return diagram;
  if (!diagram.bonds.some((bond) => sameBond(bond, a, b))) return diagram;
  return { ...diagram, bonds: diagram.bonds.map((bond) => sameBond(bond, a, b) ? { ...bond, order } : bond) };
}

export function setLonePairs(diagram: LewisDiagram, id: string, count: number): LewisDiagram {
  if (!Number.isInteger(count) || count < 0 || count > MAX_LONE_PAIRS) return diagram;
  if (!diagram.atoms.some((atom) => atom.id === id)) return diagram;
  return { ...diagram, atoms: diagram.atoms.map((atom) => atom.id === id ? { ...atom, lonePairs: count } : atom) };
}

/** True when some relabelling of the diagram's atoms reproduces the species skeleton (elements + connectivity). */
function matchesSkeleton(diagram: LewisDiagram, species: SpeciesDefinition): boolean {
  const n = species.atoms.length;
  const skeletonEdges = new Set(species.bonds.map(([a, b]) =>
    [species.atoms.findIndex((x) => x.id === a), species.atoms.findIndex((x) => x.id === b)].sort().join(":")));
  const index = new Map(diagram.atoms.map((atom, i) => [atom.id, i]));
  const edges = diagram.bonds.map((bond) => [index.get(bond.a)!, index.get(bond.b)!]);
  const used = new Array<boolean>(n).fill(false);
  const map: number[] = [];
  const place = (i: number): boolean => {
    if (i === n) return edges.every(([a, b]) => skeletonEdges.has([map[a], map[b]].sort().join(":")));
    for (let target = 0; target < n; target++) {
      if (used[target] || species.atoms[target].element !== diagram.atoms[i].element) continue;
      used[target] = true; map[i] = target;
      if (place(i + 1)) return true;
      used[target] = false;
    }
    return false;
  };
  return place(0);
}

/** Evaluate a learner-authored graph using chemistry invariants, not drawing coordinates. */
export function evaluateLewis(diagram: LewisDiagram): LewisEvaluation {
  const species: SpeciesDefinition | undefined = SPECIES[diagram.speciesId];
  const atoms = diagram.atoms;
  const shells: Record<string, number> = {};
  const targets: Record<string, number> = {};
  const formalCharges: Record<string, number> = {};
  const expectedElectrons = species ? valenceTotal(species) : 0;
  const usedElectrons =
    atoms.reduce((sum, atom) => sum + atom.lonePairs * 2, 0)
    + diagram.bonds.reduce((sum, bond) => sum + bond.order * 2, 0);
  const result = (code: LewisCode, problemAtoms: readonly string[] = []): LewisEvaluation => ({
    code, pass: code === "pass", usedElectrons, expectedElectrons,
    shells: { ...shells }, targets: { ...targets }, formalCharges: { ...formalCharges }, problemAtoms,
  });
  const ids = new Set(atoms.map((atom) => atom.id));
  if (!species || diagram.charge !== species.charge ||
    atoms.length !== species.atoms.length || ids.size !== atoms.length ||
    atoms.some((atom) => !Number.isInteger(atom.lonePairs) || atom.lonePairs < 0 || atom.lonePairs > MAX_LONE_PAIRS) ||
    diagram.bonds.length !== species.bonds.length ||
    diagram.bonds.some((bond) =>
      !Number.isInteger(bond.order) || bond.order < 0 || bond.order > MAX_ORDER ||
      bond.a === bond.b || !ids.has(bond.a) || !ids.has(bond.b)) ||
    new Set(diagram.bonds.map((bond) => [bond.a, bond.b].sort().join(":"))).size !== diagram.bonds.length ||
    !matchesSkeleton(diagram, species)
  ) return result("invalid-structure");
  if (diagram.bonds.some((bond) => bond.order === 0)) return result("missing-bond");

  for (const atom of atoms) {
    const incidentOrder = diagram.bonds
      .filter((bond) => bond.a === atom.id || bond.b === atom.id)
      .reduce((sum, bond) => sum + bond.order, 0);
    shells[atom.id] = 2 * atom.lonePairs + 2 * incidentOrder;
    targets[atom.id] = shellTarget(atom.element);
    formalCharges[atom.id] = VALENCE_ELECTRONS[atom.element] - 2 * atom.lonePairs - incidentOrder;
  }
  if (usedElectrons > expectedElectrons) return result("electron-excess");
  if (usedElectrons < expectedElectrons) return result("electron-deficit");
  const shellProblems = atoms.filter((atom) => shells[atom.id] !== targets[atom.id]);
  if (shellProblems.length) {
    return result(shellProblems.some((atom) => atom.element !== "H") ? "octet" : "duet", shellProblems.map((atom) => atom.id));
  }
  // The accepted structure is the dominant, all-zero formal-charge one; charged contributors are diagnosed.
  const charged = atoms.filter((atom) => formalCharges[atom.id] !== 0);
  if (charged.length) return result("formal-charge", charged.map((atom) => atom.id));
  return result("pass");
}
export const evaluateCo2 = evaluateLewis;
