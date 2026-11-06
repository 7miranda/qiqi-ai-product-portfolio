import test from 'node:test';
import assert from 'node:assert/strict';
import {stageScene,revealScene} from '../public/previews/crossbound/v3/world/motion.js';
globalThis.matchMedia=()=>({matches:false});

function layer(){
  const animations=[];
  return {dataset:{},style:{},animations,animate(frames,options){
    let finish;const finished=new Promise(r=>finish=r);
    const a={frames,options,finished,finish,cancel(){finish();this.cancelled=true;}};
    animations.push(a);return a;
  }};
}
test('scene handover never exposes the campus below, and enables the new room only after animation',async t=>{
  t.mock.method(globalThis,'matchMedia',()=>({matches:false}));
  const old=layer(),next=layer(),scene={element:next};stageScene(scene);
  const run=revealScene(scene,{element:old},new AbortController().signal);
  assert.equal(next.inert,true);assert.equal(next.style.opacity,'0');
  assert.ok(old.animations[0].frames.every(f=>f.opacity===1));
  old.animations[0].finish();next.animations[0].finish();await run;
  assert.equal(next.dataset.sceneLayer,'active');assert.equal(next.inert,false);assert.equal(next.style.opacity,'1');
  assert.ok([...old.animations,...next.animations].every(a=>a.cancelled));
});
test('cancelled scene animation never unlocks or reveals the abandoned room',async t=>{
  t.mock.method(globalThis,'matchMedia',()=>({matches:false}));
  const old=layer(),next=layer(),scene={element:next},abort=new AbortController();stageScene(scene);
  const run=revealScene(scene,{element:old},abort.signal);abort.abort();await run;
  assert.equal(next.inert,true);assert.equal(next.style.opacity,'0');assert.equal(next.dataset.sceneLayer,'incoming');
  assert.ok([...old.animations,...next.animations].every(a=>a.cancelled));
});
test('reduced motion replaces zoom and blur with a brief fade',async t=>{
  t.mock.method(globalThis,'matchMedia',()=>({matches:true}));
  const old=layer(),next=layer(),scene={element:next};stageScene(scene);
  const run=revealScene(scene,{element:old},new AbortController().signal);
  assert.equal(old.animations.length,0);assert.equal(next.animations[0].options.duration,100);
  assert.ok(next.animations[0].frames.every(f=>!f.transform&&!f.filter));
  next.animations[0].finish();await run;assert.equal(next.inert,false);
});
