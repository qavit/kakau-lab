import test from "node:test";
import assert from "node:assert/strict";
import { initialCo2, evaluateCo2 } from "../models/chemistry/lewis.ts";
import { advanceBond, editLonePairs } from "../models/chemistry/lewis-editor.ts";
test("direct tools create and erase C-O bonds",()=>{
 let d=initialCo2();
 d=advanceBond(d,"o-left","c","bond");
 assert.equal(d.bonds[0].order,1);
 d=advanceBond(d,"o-left","c","bond");
 assert.equal(d.bonds[0].order,2);
 d=advanceBond(d,"o-left","c","erase");
 assert.equal(d.bonds[0].order,1);
});
test("lone-pair tool updates atom graph and erases",()=>{
 let d=initialCo2();
 d=editLonePairs(d,"o-left","pair");
 assert.equal(d.atoms[0].lonePairs,1);
 d=editLonePairs(d,"o-left","erase");
 assert.equal(d.atoms[0].lonePairs,0);
});
test("wrong tool and unknown target do not mutate",()=>{
 const d=initialCo2();
 assert.equal(advanceBond(d,"o-left","c","pair"),d);
 assert.equal(editLonePairs(d,"c","bond"),d);
 assert.equal(editLonePairs(d,"missing","pair"),d);
});
test("direct manipulations can construct valid CO2 and then revise",()=>{
 let d=initialCo2();
 for(let i=0;i<2;i++){d=advanceBond(d,"o-left","c","bond");d=advanceBond(d,"c","o-right","bond");}
 for(let i=0;i<2;i++){d=editLonePairs(d,"o-left","pair");d=editLonePairs(d,"o-right","pair");}
 assert.equal(evaluateCo2(d).pass,true);
 const wrong=advanceBond(d,"o-left","c","erase");
 assert.equal(evaluateCo2(wrong).pass,false);
 assert.equal(evaluateCo2(d).pass,true);
});
