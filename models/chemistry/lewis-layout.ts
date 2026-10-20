/** Lewis notation layout. Dot pairs are tangent to the atom-pair radius. */
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
