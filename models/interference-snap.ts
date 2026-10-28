import { sourcePositions, type PhaseConditionLevel, type Point } from "../lib/science/interference.ts";

/** Projects a point onto its nearest analytic phase-condition line within a world-space radius. */
export const snapToCondition = (point: Point, separation: number, levels: readonly PhaseConditionLevel[], tolerance: number) => {
  const { source1, source2 } = sourcePositions(separation);
  let best: { point: Point; level: PhaseConditionLevel | null; distance: number } = { point, level: null, distance: Infinity };
  const accept = (candidate: Point, level: PhaseConditionLevel, distance: number) => { if (distance <= tolerance && distance < best.distance) best = { point: candidate, level, distance }; };
  for (const level of levels) {
    if (level.degenerate) {
      const left = level.signedPathDifference > 0; const endpoint = left ? source1 : source2;
      const onRay = left ? point.x <= endpoint.x : point.x >= endpoint.x;
      const candidate = onRay ? { x: point.x, y: 0 } : endpoint;
      accept(candidate, level, Math.hypot(point.x-candidate.x,point.y-candidate.y)); continue;
    }
    let current={...point};let converged=false;
    for(let i=0;i<8;i++){
      const r1=Math.hypot(current.x-source1.x,current.y-source1.y),r2=Math.hypot(current.x-source2.x,current.y-source2.y);if(r1<1e-9||r2<1e-9)break;
      const gx=(current.x-source2.x)/r2-(current.x-source1.x)/r1,gy=(current.y-source2.y)/r2-(current.y-source1.y)/r1,g2=gx*gx+gy*gy;if(g2<1e-12)break;
      const residual=r2-r1-level.signedPathDifference;if(i===0&&Math.abs(residual)/Math.sqrt(g2)>tolerance*1.5)break;if(Math.abs(residual)<1e-10){converged=true;break;}
      current={x:current.x-residual*gx/g2,y:current.y-residual*gy/g2};
    }
    if(converged)accept(current,level,Math.hypot(current.x-point.x,current.y-point.y));
  }
  return { point: best.point, level: best.level };
};
