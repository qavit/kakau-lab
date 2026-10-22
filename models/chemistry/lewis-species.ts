/** Species catalogue for Lewis Studio Practice Mode: elements, reviewed skeletons and task text. */
export type Element = "H" | "C" | "N" | "O";
export type SpeciesId = "h2o" | "ch4" | "nh3" | "h2" | "hcn" | "co2";
export const VALENCE_ELECTRONS: Readonly<Record<Element, number>> = { H: 1, C: 4, N: 5, O: 6 };
/** Hydrogen completes a duet; the main-group atoms in scope complete an octet. */
export const shellTarget = (element: Element): number => (element === "H" ? 2 : 8);

export type SkeletonAtom = Readonly<{ id: string; element: Element }>;
export type SpeciesDefinition = Readonly<{
  id: SpeciesId;
  formula: string;
  nameZh: string;
  nameEn: string;
  charge: 0;
  /** Guided Practice: the connectivity is supplied by the task, not chosen by the learner. */
  atoms: readonly SkeletonAtom[];
  bonds: readonly (readonly [string, string])[];
}>;

const atom = (id: string, element: Element): SkeletonAtom => ({ id, element });

export const SPECIES: Readonly<Record<SpeciesId, SpeciesDefinition>> = {
  h2o: { id: "h2o", formula: "H₂O", nameZh: "水", nameEn: "water", charge: 0,
    atoms: [atom("h1", "H"), atom("o", "O"), atom("h2", "H")],
    bonds: [["h1", "o"], ["o", "h2"]] },
  ch4: { id: "ch4", formula: "CH₄", nameZh: "甲烷", nameEn: "methane", charge: 0,
    atoms: [atom("c", "C"), atom("h1", "H"), atom("h2", "H"), atom("h3", "H"), atom("h4", "H")],
    bonds: [["c", "h1"], ["c", "h2"], ["c", "h3"], ["c", "h4"]] },
  nh3: { id: "nh3", formula: "NH₃", nameZh: "氨", nameEn: "ammonia", charge: 0,
    atoms: [atom("n", "N"), atom("h1", "H"), atom("h2", "H"), atom("h3", "H")],
    bonds: [["n", "h1"], ["n", "h2"], ["n", "h3"]] },
  h2: { id: "h2", formula: "H₂", nameZh: "氫氣", nameEn: "hydrogen", charge: 0,
    atoms: [atom("h1", "H"), atom("h2", "H")],
    bonds: [["h1", "h2"]] },
  hcn: { id: "hcn", formula: "HCN", nameZh: "氰化氫", nameEn: "hydrogen cyanide", charge: 0,
    atoms: [atom("h", "H"), atom("c", "C"), atom("n", "N")],
    bonds: [["h", "c"], ["c", "n"]] },
  co2: { id: "co2", formula: "CO₂", nameZh: "二氧化碳", nameEn: "carbon dioxide", charge: 0,
    atoms: [atom("o-left", "O"), atom("c", "C"), atom("o-right", "O")],
    bonds: [["o-left", "c"], ["c", "o-right"]] },
};
/** Teaching order: the tasks that exercise the most new ideas first. */
export const SPECIES_ORDER: readonly SpeciesId[] = ["h2o", "ch4", "nh3", "h2", "hcn", "co2"];

export const valenceTotal = (species: SpeciesDefinition): number =>
  species.atoms.reduce((sum, a) => sum + VALENCE_ELECTRONS[a.element], 0) - species.charge;

/** "O" when unique in the species, "H₁"/"H₂" when an element repeats. */
export function atomLabel(species: SpeciesDefinition, id: string): string {
  const target = species.atoms.find((a) => a.id === id);
  if (!target) return id;
  const same = species.atoms.filter((a) => a.element === target.element);
  if (same.length === 1) return target.element;
  return target.element + "₁₂₃₄₅₆₇₈₉"[same.indexOf(target)];
}
