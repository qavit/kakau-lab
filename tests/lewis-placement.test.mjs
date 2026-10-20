import test from "node:test";
import assert from "node:assert/strict";
import { initialCo2, evaluateCo2, setBondOrder } from "../models/chemistry/lewis.ts";
import { initialPairPlacement, togglePairSite, applyPairPlacement } from "../models/chemistry/lewis-placement.ts";
test("adding and removing explicit pair sites updates graph counts",()=>{
 let p=initialPairPlacement();
 p=togglePairSite(p,"o-left","top");
 p=togglePairSite(p,"o-left","bottom");
 assert.equal(applyPairPlacement(initialCo2(),p).atoms[0].lonePairs,2);
 p=togglePairSite(p,"o-left","top");
 assert.equal(applyPairPlacement(initialCo2(),p).atoms[0].lonePairs,1);
});
test("inner sites near bonds are unavailable for oxygens",()=>{
 const p=initialPairPlacement();
 assert.equal(togglePairSite(p,"o-left","inner"),p);
 assert.equal(togglePairSite(p,"missing","top"),p);
});
test("explicit placements can assemble the accepted CO2 structure",()=>{
 let p=initialPairPlacement(),d=initialCo2();
 for(const id of ["o-left","o-right"]){p=togglePairSite(p,id,"top");p=togglePairSite(p,id,"bottom");}
 d=applyPairPlacement(d,p);
 d=setBondOrder(d,"o-left","c",2);
 d=setBondOrder(d,"c","o-right",2);
 assert.equal(evaluateCo2(d).pass,true);
});
test("placed electron positions do not alter chemical meaning",()=>{
 let p=initialPairPlacement();
 p=togglePairSite(p,"o-left","top");
 const p2=togglePairSite(initialPairPlacement(),"o-left","outer");
 assert.deepEqual(applyPairPlacement(initialCo2(),p).atoms,applyPairPlacement(initialCo2(),p2).atoms);
});
