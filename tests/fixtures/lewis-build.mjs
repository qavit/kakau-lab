import { initialDiagram, setBondOrder, setLonePairs } from "../../models/chemistry/lewis.ts";
import { SPECIES } from "../../models/chemistry/lewis-species.ts";

/** Build a learner graph: bonds {"a-b": order} (atom ids may contain "-"), pairs {atomId: lonePairs}. */
export function build(speciesId, bonds = {}, pairs = {}) {
  const ids = SPECIES[speciesId].atoms.map((a) => a.id);
  let d = initialDiagram(speciesId);
  for (const [key, order] of Object.entries(bonds)) {
    const a = ids.find((id) => key.startsWith(id + "-") && ids.includes(key.slice(id.length + 1)));
    d = setBondOrder(d, a, key.slice(a.length + 1), order);
  }
  for (const [atom, n] of Object.entries(pairs)) d = setLonePairs(d, atom, n);
  return d;
}
