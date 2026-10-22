import test from "node:test";
import assert from "node:assert/strict";
import {horizontalBondDots,co2PairDots} from "../models/chemistry/lewis-layout.ts";
test("horizontal single bond is a vertical colon, not horizontal dots",()=>{
 const [pair]=horizontalBondDots(100,100,1);
 assert.equal(pair[0].x,pair[1].x);
 assert.notEqual(pair[0].y,pair[1].y);
});
test("double bonds comprise two side-by-side vertical pairs (four dots)",()=>{
 const pairs=horizontalBondDots(100,100,2);
 assert.equal(pairs.length,2);
 assert.equal(pairs.flat().length,4);
 assert.equal(pairs[0][0].x,pairs[0][1].x);
 assert.equal(pairs[1][0].x,pairs[1][1].x);
 assert.notEqual(pairs[0][0].x,pairs[1][0].x);
});
test("oxygen top/bottom pairs are tangent to their radial placement",()=>{
 for(const id of ["o-left","o-right"]) {
  for(const site of ["top","bottom"]) {
   const x=id==="o-left"?65:315;
   const [a,b]=co2PairDots(id,site,x);
   const mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
   const radial=[mx-x,my-110],delta=[b.x-a.x,b.y-a.y];
   assert.ok(Math.abs(radial[0]*delta[0]+radial[1]*delta[1])<1e-8);
   assert.ok(Math.abs(a.y-b.y)>1);
  }
 }
});
test("every placed lone pair has exactly two distinct dots",()=>{
 for(const id of ["o-left","o-right","c"])for(const site of ["top","bottom"]) {
  const dots=co2PairDots(id,site,190);
  assert.equal(dots.length,2);
  assert.notDeepEqual(dots[0],dots[1]);
 }
});
