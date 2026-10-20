/** Learner-facing diagnostics derived from an evaluation; chemistry decisions stay in lewis.ts. */
import { SPECIES, VALENCE_ELECTRONS, atomLabel, valenceTotal } from "./lewis-species.ts";
import type { LewisEvaluation, LewisDiagram } from "./lewis.ts";
export type Bilingual = readonly [zh: string, en: string];

export function diagnose(diagram: LewisDiagram, evaluation: LewisEvaluation): Bilingual {
  const species = SPECIES[diagram.speciesId];
  const total = evaluation.expectedElectrons;
  const list = (describe: (id: string) => string) => evaluation.problemAtoms.map((id) => describe(id));
  const shellLine = (id: string): Bilingual => {
    const label = atomLabel(species, id);
    return [`${label} 周圍 ${evaluation.shells[id]} 個（應為 ${evaluation.targets[id]}）`, `${label} has ${evaluation.shells[id]} (needs ${evaluation.targets[id]})`];
  };
  switch (evaluation.code) {
    case "invalid-structure": return ["結構資料錯誤，請重設。", "Invalid structure: please reset."];
    case "missing-bond": return ["還有連線沒有共享電子。點虛線增加鍵級，每條連線至少一對。", "Some connections share no electrons yet. Click a dashed line to add a bonding pair."];
    case "electron-excess": return [`${species.formula} 只有 ${total} 個價電子，你用了 ${evaluation.usedElectrons} 個，請移除多餘的鍵結或孤對電子。`, `${species.formula} has ${total} valence electrons; you used ${evaluation.usedElectrons}.`];
    case "electron-deficit": return [`${species.formula} 共有 ${total} 個價電子，目前只分配 ${evaluation.usedElectrons} 個；還有 ${total - evaluation.usedElectrons} 個尚未放入。`, `${total - evaluation.usedElectrons} of ${total} valence electrons are still unallocated.`];
    case "duet": return [`電子總數正確，但氫只能容納 2 個電子：${list((id) => shellLine(id)[0]).join("；")}。`, `Total is right, but hydrogen holds only 2: ${list((id) => shellLine(id)[1]).join("; ")}.`];
    case "octet": return [`電子總數正確，但有原子未完成：${list((id) => shellLine(id)[0]).join("；")}。`, `Total is right, but shells are off: ${list((id) => shellLine(id)[1]).join("; ")}.`];
    case "formal-charge": return ["電子數與八隅體／雙電子都符合，但本題要求形式電荷全為零的主要結構，試著重新分配共享電子與孤對電子。", "Shells are full, but this task asks for the dominant structure with every formal charge zero."];
    case "pass": return [`完成！共 ${total} 個價電子，每個原子都符合雙電子或八隅體，形式電荷均為零。`, `Correct: ${total} electrons, every atom has a full duet/octet, all formal charges are zero.`];
  }
}

export function budgetNote(diagram: LewisDiagram): Bilingual {
  const species = SPECIES[diagram.speciesId];
  const parts = [...new Set(species.atoms.map((a) => a.element))].map((e) => {
    const n = species.atoms.filter((a) => a.element === e).length;
    return `${e} ${VALENCE_ELECTRONS[e]}${n > 1 ? `（×${n}）` : ""}`;
  });
  return [`各原子價電子：${parts.join("、")}`, `Valence electrons: ${parts.join(", ")}`];
}

export function hints(diagram: LewisDiagram): readonly Bilingual[] {
  const species = SPECIES[diagram.speciesId];
  const sum = species.atoms.map((a) => VALENCE_ELECTRONS[a.element]).join(" + ");
  return [
    [`先算 ${species.formula} 的價電子總數：${sum} = ${valenceTotal(species)}。`, `Count the valence electrons of ${species.formula}: ${sum} = ${valenceTotal(species)}.`],
    ["每條連線的共享電子要同時算在兩端的原子；氫要 2 個，其他原子要 8 個。", "Shared electrons count for both atoms; hydrogen needs 2, the others 8."],
    ["用「檢查八隅體」逐一查看原子；不足的原子可以增加鍵級或孤對電子，再回頭核對總數。", "Inspect each atom, then adjust bond orders or lone pairs and recheck the total."],
  ];
}
