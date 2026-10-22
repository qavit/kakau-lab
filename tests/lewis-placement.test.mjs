import test from "node:test";
import assert from "node:assert/strict";
import { initialCo2, evaluateCo2, setBondOrder } from "../models/chemistry/lewis.ts";
import { initialPairPlacement, togglePairSite, changePairCount, applyPairPlacement, octetInspection } from "../models/chemistry/lewis-placement.ts";
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

test("atom-click auto placement and reverse erase preserve count",()=>{
 let p=initialPairPlacement();
 p=changePairCount(p,"o-left",1);p=changePairCount(p,"o-left",1);
 assert.deepEqual(p["o-left"],["top","bottom"]);
 const noChange=changePairCount(p,"missing",1);
 assert.equal(noChange,p);
 p=changePairCount(p,"o-left",-1);
 assert.deepEqual(p["o-left"],["top"]);
});
test("octet inspection counts shared electrons around both atoms",()=>{
 let d=initialCo2();
 d=setBondOrder(d,"o-left","c",2);d=setBondOrder(d,"c","o-right",2);
 let p=initialPairPlacement();
 for(const id of ["o-left","o-right"]) {p=changePairCount(p,id,1);p=changePairCount(p,id,1);}
 d=applyPairPlacement(d,p);
 assert.deepEqual(octetInspection(d,"o-left"),{bondingElectrons:4,nonbondingElectrons:4,total:8,target:8});
 assert.deepEqual(octetInspection(d,"c"),{bondingElectrons:8,nonbondingElectrons:0,total:8,target:8});
 assert.equal(octetInspection(d,"missing"),null);
});
