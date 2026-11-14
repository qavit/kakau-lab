import { deriveCursor, deriveProjectileModel, type ProjectileState } from "./projectile.ts";
import { encodeProjectileShare, decodeProjectileShare, type ProjectileVisibility } from "./projectile-serialization.ts";
import type { GuidedSession } from "./projectile-learning.ts";

// Bump when the exported scientific model changes, independently of share JSON v1.
export const PROJECTILE_EXPORT_MODEL = "projectile-vacuum-rk4-1";

/** Export a computed result from one immutable setup/cursor snapshot, never learner responses. */
export function projectileResult(state: ProjectileState, layers: ProjectileVisibility, cursorFraction: number, session: GuidedSession | null) {
  if (session !== null) throw new Error("請先離開探索任務再匯出。 Leave the guided activity before exporting.");
  if (!Number.isFinite(cursorFraction) || cursorFraction < 0 || cursorFraction > 1) throw new Error("無效時間。 Invalid time cursor.");
  // The existing codec is the setup validation boundary; strips runtime/unknown fields.
  const setup = encodeProjectileShare(state, layers);
  const snapshot = decodeProjectileShare(setup).state;
  const model = deriveProjectileModel(snapshot);
  const trajectories = [
    { id: "vacuum", label: "真空 / Vacuum", samples: model.trajectory },
    ...(model.complementary ? [{ id: "complementary", label: "互補角 / Complementary", samples: model.complementary.samples }] : []),
    ...(model.dragSamples.length ? [{ id: "drag", label: "二次阻力 / Quadratic drag", samples: model.dragSamples }] : []),
  ];
  return {
    schema: "projectile-result-1", modelVersion: PROJECTILE_EXPORT_MODEL,
    scope: "Complete trajectories, independent of display-layer visibility / 完整軌跡，不受顯示圖層限制",
    units: { t: "s", position: "m", velocity: "m/s", gravity: "m/s²", angle: "deg", dragFactor: "m⁻¹" },
    assumptions: [
      "質點、均勻重力、平面運動；忽略風與自轉。 Point mass, uniform gravity, 2D; no wind or rotation.",
      "主軌跡為真空解析解；阻力僅作比較。 Main trajectory: analytic vacuum solution; drag is a comparison.",
      "阻力 a = -b|v|v - gŷ；RK4 dt=0.002 s，最多120 s，末端線性內插。 Drag: RK4, 120 s cap, interpolated landing.",
      "階梯以頂端為 y=0，向上為正；忽略 height 設定。 Stairs: origin at top, y up; height setting ignored.",
      "分享 v1 重建起始設定並暫停；結果另存游標時刻。 Share v1 restores paused launch setup; result stores cursor separately.",
      "匯出不含包絡線軌跡束或視窗縮放。 Envelope fan and viewport zoom are not part of this result.",
    ],
    setup: JSON.parse(setup), cursorFraction,
    cursor: deriveCursor(model, snapshot.gravity, cursorFraction),
    effectiveHeight: model.height, duration: model.duration, clockDuration: model.clockDuration,
    trajectories: trajectories.map(t => ({ ...t,
      termination: t.id === "drag" && (t.samples.at(-1)?.point.y ?? 0) > 0 ? "time-cap" : "landing",
    })),
  };
}

export type ProjectileResult = ReturnType<typeof projectileResult>;
const escapeXml = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);

/** Standalone bilingual teaching figure; equal x/y scale, explicit units and embedded JSON. */
export function projectileResultSvg(result: ProjectileResult): string {
  const points = result.trajectories.flatMap(t => t.samples.map(s => s.point));
  const xmin = Math.min(0, ...points.map(p => p.x)), xmax = Math.max(1, ...points.map(p => p.x));
  const ymin = Math.min(0, ...points.map(p => p.y)), ymax = Math.max(1, ...points.map(p => p.y));
  const scale = Math.min(820 / (xmax - xmin), 360 / (ymax - ymin));
  const x = (v: number) => 80 + (v - xmin) * scale;
  const y = (v: number) => 440 - (v - ymin) * scale;
  const colors = ["#125b82", "#8a4600", "#6e3696"];
  const text = (value: string, px: number, py: number, size = 14) => `<text x="${px}" y="${py}" font-size="${size}">${escapeXml(value)}</text>`;
  const paths = result.trajectories.map((t, i) => `<polyline fill="none" stroke="${colors[i]}" stroke-width="2.5" stroke-dasharray="${i === 0 ? "none" : i === 1 ? "8 4" : "2 4"}" points="${t.samples.map(s => `${x(s.point.x)},${y(s.point.y)}`).join(" ")}"/>${text(t.label + (t.termination === "time-cap" ? " (120 s 截止 / capped)" : ""), 80 + i * 280, 490)}`).join("");
  const launch = result.setup.launch;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="790" viewBox="0 0 1000 790" role="img" aria-labelledby="title desc">
<title id="title">拋體軌跡 / Projectile trajectories</title><desc id="desc">Equal axis scales; conditions, units and model assumptions below. 等比例座標；條件、單位及假設如下。</desc>
<metadata>${escapeXml(JSON.stringify(result))}</metadata><rect width="1000" height="790" fill="white"/>
<g fill="#17232e" font-family="Arial, sans-serif">${text("拋體軌跡 / Projectile trajectories", 40, 35, 24)}
${text(`v₀=${launch.speed} m/s  θ=${launch.angle}°  h=${result.effectiveHeight} m  g=${launch.gravity} m/s²  b=${launch.dragFactor} m⁻¹`, 40, 62)}
<path d="M80 80V440H920" fill="none" stroke="#66717b"/>
${text(`y (m): ${ymin.toFixed(2)} … ${ymax.toFixed(2)}`, 80, 78)}${text(`x (m): ${xmin.toFixed(2)} … ${xmax.toFixed(2)} | 等比例 / equal scale`, 80, 465)}
${paths}<circle cx="${x(result.cursor.point.x)}" cy="${y(result.cursor.point.y)}" r="5" fill="#17232e"/>
${text(`● 主軌跡游標 / Vacuum cursor: t=${result.cursor.t.toFixed(3)} s, x=${result.cursor.point.x.toFixed(3)} m, y=${result.cursor.point.y.toFixed(3)} m`, 40, 525)}
${text(`模型 / Model: ${result.modelVersion}; result-1; share v1`, 40, 555)}
${result.assumptions.map((a, i) => text(a, 40, 585 + i * 27, 12)).join("")}
${text("重現設定與精確數值內嵌於 SVG metadata；亦可另存 JSON。 Setup and exact values embedded in metadata; JSON available.", 40, 765, 12)}</g></svg>`;
}
