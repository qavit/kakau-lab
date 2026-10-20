import { setBondOrder, setLonePairs, type LewisDiagram } from "./lewis.ts";
export type DrawTool = "bond" | "pair" | "erase";
export function advanceBond(diagram: LewisDiagram,a:string,b:string,tool:DrawTool):LewisDiagram {
  if(tool==="pair")return diagram;
  const bond=diagram.bonds.find(x=>(x.a===a&&x.b===b)||(x.a===b&&x.b===a));
  if(!bond)return diagram;
  return setBondOrder(diagram,a,b,tool==="erase"?Math.max(0,bond.order-1):(bond.order+1)%4);
}
export function editLonePairs(diagram: LewisDiagram,id:string,tool:DrawTool):LewisDiagram {
  if(tool==="bond")return diagram;
  const atom=diagram.atoms.find(x=>x.id===id);
  if(!atom)return diagram;
  const next=atom.lonePairs+(tool==="erase"?-1:1);
  return next<0||next>4?diagram:setLonePairs(diagram,id,next);
}
