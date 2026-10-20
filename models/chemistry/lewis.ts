/** Local-first CO2 Lewis drawing POC. This is not a general chemistry solver. */
export type Element = "C" | "O";
export type LewisAtom = Readonly<{ id: string; element: Element; lonePairs: number }>;
export type LewisBond = Readonly<{ a: string; b: string; order: number }>;
export type LewisDiagram = Readonly<{
  speciesId: "co2"; charge: 0;
  atoms: readonly LewisAtom[]; bonds: readonly LewisBond[];
}>;
export type LewisCode =
  | "invalid-structure" | "missing-bond" | "electron-excess" | "electron-deficit"
  | "octet" | "formal-charge" | "pass";
export type LewisEvaluation = Readonly<{
  code: LewisCode; pass: boolean;
  usedElectrons: number; expectedElectrons: number;
  shells: Readonly<Record<string, number>>;
  formalCharges: Readonly<Record<string, number>>;
}>;
const VALENCE: Readonly<Record<Element, number>> = { C: 4, O: 6 };

export function initialCo2(): LewisDiagram {
  return {
    speciesId: "co2", charge: 0,
    atoms: [
      { id: "o-left", element: "O", lonePairs: 0 },
      { id: "c", element: "C", lonePairs: 0 },
      { id: "o-right", element: "O", lonePairs: 0 },
    ],
    bonds: [
      { a: "o-left", b: "c", order: 0 },
      { a: "c", b: "o-right", order: 0 },
    ],
  };
}

export function setBondOrder(diagram: LewisDiagram, a: string, b: string, order: number): LewisDiagram {
  if (!Number.isInteger(order) || order < 0 || order > 3) return diagram;
  if (!diagram.bonds.some((bond) => (bond.a === a && bond.b === b) || (bond.a === b && bond.b === a))) return diagram;
  return {
    ...diagram,
    bonds: diagram.bonds.map((bond) =>
      (bond.a === a && bond.b === b) || (bond.a === b && bond.b === a)
        ? { ...bond, order } : bond),
  };
}

export function setLonePairs(diagram: LewisDiagram, id: string, count: number): LewisDiagram {
  if (!Number.isInteger(count) || count < 0 || count > 4) return diagram;
  if (!diagram.atoms.some((atom) => atom.id === id)) return diagram;
  return { ...diagram, atoms: diagram.atoms.map((atom) =>
    atom.id === id ? { ...atom, lonePairs: count } : atom) };
}

/** Evaluate a learner-authored graph using chemistry invariants, not drawing coordinates. */
export function evaluateCo2(diagram: LewisDiagram): LewisEvaluation {
  const atoms = diagram.atoms;
  const atomById = new Map(atoms.map((atom) => [atom.id, atom]));
  const shells: Record<string, number> = {};
  const formalCharges: Record<string, number> = {};
  const expectedElectrons = 16;
  const usedElectrons =
    atoms.reduce((sum, atom) => sum + atom.lonePairs * 2, 0)
    + diagram.bonds.reduce((sum, bond) => sum + bond.order * 2, 0);
  const result = (code: LewisCode): LewisEvaluation => ({
    code, pass: code === "pass", usedElectrons, expectedElectrons,
    shells: { ...shells }, formalCharges: { ...formalCharges },
  });

  if (diagram.speciesId !== "co2" || diagram.charge !== 0 ||
    atoms.length !== 3 || atomById.size !== 3 ||
    atoms.filter((atom) => atom.element === "C").length !== 1 ||
    atoms.filter((atom) => atom.element === "O").length !== 2 ||
    atoms.some((atom) => !Number.isInteger(atom.lonePairs) || atom.lonePairs < 0 || atom.lonePairs > 4) ||
    diagram.bonds.length !== 2 ||
    diagram.bonds.some((bond) =>
      !Number.isInteger(bond.order) || bond.order < 0 || bond.order > 3 ||
      bond.a === bond.b || !atomById.has(bond.a) || !atomById.has(bond.b)) ||
    new Set(diagram.bonds.map((bond) => [bond.a, bond.b].sort().join(":"))).size !== 2
  ) return result("invalid-structure");

  const carbon = atoms.find((atom) => atom.element === "C")!;
  if (diagram.bonds.some((bond) =>
    bond.a !== carbon.id && bond.b !== carbon.id)) return result("invalid-structure");
  if (diagram.bonds.some((bond) => bond.order === 0)) return result("missing-bond");

  for (const atom of atoms) {
    const incidentOrder = diagram.bonds
      .filter((bond) => bond.a === atom.id || bond.b === atom.id)
      .reduce((sum, bond) => sum + bond.order, 0);
    shells[atom.id] = 2 * atom.lonePairs + 2 * incidentOrder;
    formalCharges[atom.id] = VALENCE[atom.element] - 2 * atom.lonePairs - incidentOrder;
  }
  if (usedElectrons > expectedElectrons) return result("electron-excess");
  if (usedElectrons < expectedElectrons) return result("electron-deficit");
  if (atoms.some((atom) => shells[atom.id] !== 8)) return result("octet");
  // Minor formal-charge resonance contributors are not accepted as the dominant structure.
  if (atoms.some((atom) => formalCharges[atom.id] !== 0)) return result("formal-charge");
  return result("pass");
}
