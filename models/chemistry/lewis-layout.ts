/** Lewis notation layout. Dot pairs are tangent to the atom-pair radius. Notation only: no VSEPR or bond-angle claim. */
import type { SpeciesId } from "./lewis-species.ts";
export type Dot = Readonly<{x:number;y:number}>;
export type DotPair = readonly [Dot,Dot];
export function tangentPair(cx:number,cy:number,r:number,degrees:number,halfGap=5):DotPair {
 const a=degrees*Math.PI/180, x=cx+r*Math.cos(a),y=cy+r*Math.sin(a);
 const tx=-Math.sin(a),ty=Math.cos(a);
 return [{x:x-halfGap*tx,y:y-halfGap*ty},{x:x+halfGap*tx,y:y+halfGap*ty}];
}
export function co2PairDots(id:string,site:"top"|"bottom"|"outer",x:number,cy=110):DotPair {
 if(id==="o-left"||id==="o-right") {
   const left=id==="o-left";
   // Aesthetic, not a quantum mechanical claim: pairs at +/-60 deg from the outward axis.
   return tangentPair(x,cy,57,site==="top"?(left?240:300):site==="bottom"?(left?120:60):(left?180:0));
 }
 return tangentPair(x,cy,57,site==="bottom"?90:270);
}
/** A horizontal bond's bonding pairs are vertical colons; multiple bonds place colons side by side. */
export function horizontalBondDots(midX:number,midY:number,order:number,halfGap=5,separation=11):DotPair[] {
 if(!Number.isInteger(order)||order<0||order>3) return [];
 return Array.from({length:order},(_,i)=>{
  const x=midX+(i-(order-1)/2)*separation;
  return [{x,y:midY-halfGap},{x,y:midY+halfGap}];
 });
}

export type Point = Readonly<{x:number;y:number}>;
export type SpeciesLayout = Readonly<{width:number;height:number;positions:Readonly<Record<string,Point>>}>;
/** Two-dimensional notation placement per task skeleton; chosen for readability, not as molecular geometry. */
export const LAYOUTS: Readonly<Record<SpeciesId,SpeciesLayout>> = {
 h2o:{width:380,height:250,positions:{h1:{x:110,y:165},o:{x:190,y:85},h2:{x:270,y:165}}},
 ch4:{width:380,height:250,positions:{c:{x:190,y:125},h1:{x:190,y:35},h2:{x:190,y:215},h3:{x:100,y:125},h4:{x:280,y:125}}},
 nh3:{width:380,height:250,positions:{n:{x:190,y:100},h1:{x:95,y:100},h2:{x:285,y:100},h3:{x:190,y:195}}},
 h2:{width:380,height:220,positions:{h1:{x:120,y:110},h2:{x:260,y:110}}},
 hcn:{width:380,height:220,positions:{h:{x:50,y:110},c:{x:160,y:110},n:{x:290,y:110}}},
 co2:{width:380,height:220,positions:{"o-left":{x:65,y:110},c:{x:190,y:110},"o-right":{x:315,y:110}}},
};
/** Distance from an atom centre at which a bond line starts and electron pairs are drawn. */
export const ATOM_CLEARANCE = 28;
export const PAIR_RADIUS = 57;
const norm = (deg:number) => ((deg%360)+360)%360;
const angularDistance = (a:number,b:number) => { const d = Math.abs(norm(a)-norm(b)); return Math.min(d,360-d); };
export const directionDegrees = (from:Point,to:Point) => norm(Math.atan2(to.y-from.y,to.x-from.x)*180/Math.PI);

/**
 * A bond's shared pairs lie across the bond: each pair is two dots along the bond normal, so a
 * horizontal bond gives a vertical colon and a vertical bond gives a horizontal "..". Multiple
 * pairs sit side by side along the bond. Dot count always equals 2 x order.
 */
export function bondPairDots(a:Point,b:Point,order:number,halfGap=5,separation=11):DotPair[] {
 if(!Number.isInteger(order)||order<0||order>3) return [];
 const len=Math.hypot(b.x-a.x,b.y-a.y)||1;
 const ux=(b.x-a.x)/len,uy=(b.y-a.y)/len,nx=-uy,ny=ux;
 const mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
 return Array.from({length:order},(_,i)=>{
  const o=(i-(order-1)/2)*separation,cx=mx+ux*o,cy=my+uy*o;
  return [{x:cx-nx*halfGap,y:cy-ny*halfGap},{x:cx+nx*halfGap,y:cy+ny*halfGap}];
 });
}
/**
 * Directions (degrees, SVG y-down) for `count` lone pairs: centred in the widest free arc between
 * the atom's bonds (ties prefer the top), spread symmetrically, kept clear of the bonds.
 * Deterministic and driven only by the pair count, so it can never add or drop an electron.
 */
export function lonePairAngles(bondAngles:readonly number[],count:number,keepOut=50,maxStep=120,minStep=22):number[] {
 if(count<=0) return [];
 const sorted=[...bondAngles].map(norm).sort((p,q)=>p-q);
 let centre=270,width=360,keep=0;
 if(sorted.length){
  keep=keepOut;
  const gaps=sorted.map((start,i)=>{
   const end=i+1<sorted.length?sorted[i+1]:sorted[0]+360;
   const w=sorted.length===1?360:end-start;
   return {w,c:norm(start+w/2)};
  });
  const best=gaps.reduce((m,g)=>g.w>m.w+1e-9||(Math.abs(g.w-m.w)<=1e-9&&angularDistance(g.c,270)<angularDistance(m.c,270))?g:m);
  centre=best.c;width=best.w;
 }
 const usable=Math.max(width-2*keep,20);
 const step=count===1?0:Math.min(maxStep,Math.max(minStep,usable/count));
 return Array.from({length:count},(_,i)=>norm(centre+(i-(count-1)/2)*step));
}
